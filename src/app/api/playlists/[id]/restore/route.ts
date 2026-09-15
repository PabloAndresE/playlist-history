import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { replacePlaylistTracks, NormalizedTrack, LIKED_SONGS_ID } from "@/lib/spotify";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { snapshotId } = await req.json();

  if (!snapshotId) {
    return NextResponse.json(
      { error: "snapshotId required" },
      { status: 400 }
    );
  }

  const tracked = await prisma.trackedPlaylist.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!tracked) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (tracked.spotifyPlaylistId === LIKED_SONGS_ID) {
    return NextResponse.json({ error: "Cannot restore Liked Songs — Spotify doesn't allow replacing saved tracks in bulk" }, { status: 400 });
  }

  const snapshot = await prisma.playlistSnapshot.findFirst({
    where: { id: snapshotId, trackedPlaylistId: id },
  });

  if (!snapshot) {
    return NextResponse.json(
      { error: "Snapshot not found" },
      { status: 404 }
    );
  }

  const tracks = snapshot.tracks as unknown as NormalizedTrack[];
  const trackUris = tracks.map((t) => `spotify:track:${t.spotifyId}`);

  await replacePlaylistTracks(
    session.user.id,
    tracked.spotifyPlaylistId,
    trackUris
  );

  return NextResponse.json({
    success: true,
    tracksRestored: tracks.length,
    restoredTo: snapshot.takenAt,
  });
}
