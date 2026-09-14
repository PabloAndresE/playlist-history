import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NormalizedTrack } from "@/lib/spotify";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tracked = await prisma.trackedPlaylist.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!tracked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get latest snapshot
    const snapshot = await prisma.playlistSnapshot.findFirst({
      where: { trackedPlaylistId: id },
      orderBy: { takenAt: "desc" },
    });

    if (!snapshot) {
      return NextResponse.json({
        tracks: [],
        topArtists: [],
        totalTracks: 0,
        uniqueArtists: 0,
        lastSnapshot: null,
      });
    }

    const tracks = snapshot.tracks as unknown as NormalizedTrack[];

    // Top artists by track count
    const artistCounts = new Map<string, { name: string; count: number; imageUrl: string | null }>();
    for (const t of tracks) {
      const existing = artistCounts.get(t.artistName);
      if (existing) {
        existing.count++;
      } else {
        artistCounts.set(t.artistName, {
          name: t.artistName,
          count: 1,
          imageUrl: t.albumImageUrl,
        });
      }
    }
    const topArtists = [...artistCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Recent tracks (last 10 added by date)
    const recentTracks = [...tracks]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 10)
      .map((t) => ({
        name: t.name,
        artist: t.artistName,
        album: t.albumName,
        imageUrl: t.albumImageUrl,
        spotifyId: t.spotifyId,
        addedAt: t.addedAt,
      }));

    return NextResponse.json({
      totalTracks: tracks.length,
      uniqueArtists: artistCounts.size,
      topArtists,
      recentTracks,
      lastSnapshot: snapshot.takenAt,
      snapshotSource: snapshot.source,
    });
  } catch (error) {
    console.error("GET /api/playlists/[id]/overview error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
