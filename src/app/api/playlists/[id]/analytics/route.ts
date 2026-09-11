import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArtistGenres, NormalizedTrack } from "@/lib/spotify";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Get all snapshots ordered by time
  const snapshots = await prisma.playlistSnapshot.findMany({
    where: { trackedPlaylistId: id },
    orderBy: { takenAt: "asc" },
  });

  // Get all changes
  const changes = await prisma.playlistChange.findMany({
    where: { trackedPlaylistId: id },
    orderBy: { detectedAt: "asc" },
  });

  // Growth over time
  const growthData = snapshots.map((s) => ({
    date: s.takenAt.toISOString(),
    trackCount: s.trackCount,
  }));

  // Artist rotation: most added and removed artists
  const artistAdded = new Map<string, number>();
  const artistRemoved = new Map<string, number>();

  for (const change of changes) {
    const map = change.changeType === "ADDED" ? artistAdded : artistRemoved;
    map.set(change.artistName, (map.get(change.artistName) ?? 0) + 1);
  }

  const topArtistsAdded = [...artistAdded.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topArtistsRemoved = [...artistRemoved.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Genre evolution (from latest snapshot)
  let genreDistribution: { genre: string; count: number }[] = [];

  if (snapshots.length > 0) {
    const latestTracks = snapshots[snapshots.length - 1]
      .tracks as unknown as NormalizedTrack[];
    const artistIds = [
      ...new Set(latestTracks.map((t) => t.artistId).filter(Boolean)),
    ];

    if (artistIds.length > 0) {
      const genreMap = await getArtistGenres(session.user.id, artistIds);
      const genreCounts = new Map<string, number>();

      for (const track of latestTracks) {
        const genres = genreMap.get(track.artistId) ?? [];
        for (const genre of genres) {
          genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
        }
      }

      genreDistribution = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([genre, count]) => ({ genre, count }));
    }
  }

  // Collaborative activity
  const collaboratorActivity = new Map<string, number>();
  for (const change of changes) {
    if (change.changedBySpotifyId) {
      collaboratorActivity.set(
        change.changedBySpotifyId,
        (collaboratorActivity.get(change.changedBySpotifyId) ?? 0) + 1
      );
    }
  }

  return NextResponse.json({
    growthData,
    topArtistsAdded,
    topArtistsRemoved,
    genreDistribution,
    collaboratorActivity: [...collaboratorActivity.entries()].map(
      ([spotifyId, count]) => ({ spotifyId, count })
    ),
    totalChanges: changes.length,
    totalSnapshots: snapshots.length,
  });
}
