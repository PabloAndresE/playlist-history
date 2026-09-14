import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NormalizedTrack, getArtistGenres } from "@/lib/spotify";

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

    const snapshot = await prisma.playlistSnapshot.findFirst({
      where: { trackedPlaylistId: id },
      orderBy: { takenAt: "desc" },
    });
    if (!snapshot) {
      return NextResponse.json({ error: "No snapshot" }, { status: 404 });
    }

    const tracks = snapshot.tracks as unknown as NormalizedTrack[];

    // --- DURATION STATS ---
    const durations = tracks.map((t) => t.durationMs ?? 0).filter((d) => d > 0);
    const totalDurationMs = durations.reduce((a, b) => a + b, 0);
    const avgDurationMs = durations.length > 0 ? Math.round(totalDurationMs / durations.length) : 0;
    const shortestTrack = durations.length > 0
      ? tracks.reduce((min, t) => ((t.durationMs ?? Infinity) < (min.durationMs ?? Infinity) ? t : min))
      : null;
    const longestTrack = durations.length > 0
      ? tracks.reduce((max, t) => ((t.durationMs ?? 0) > (max.durationMs ?? 0) ? t : max))
      : null;

    const formatDuration = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m ${seconds}s`;
    };

    const duration = {
      total: formatDuration(totalDurationMs),
      totalMs: totalDurationMs,
      average: formatDuration(avgDurationMs),
      shortest: shortestTrack
        ? { name: shortestTrack.name, artist: shortestTrack.artistName, duration: formatDuration(shortestTrack.durationMs ?? 0), imageUrl: shortestTrack.albumImageUrl }
        : null,
      longest: longestTrack
        ? { name: longestTrack.name, artist: longestTrack.artistName, duration: formatDuration(longestTrack.durationMs ?? 0), imageUrl: longestTrack.albumImageUrl }
        : null,
    };

    // --- DECADES ---
    const decadeCounts = new Map<string, number>();
    for (const t of tracks) {
      if (t.releaseDate) {
        const year = parseInt(t.releaseDate.substring(0, 4));
        if (!isNaN(year)) {
          const decade = `${Math.floor(year / 10) * 10}s`;
          decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
        }
      }
    }
    const decades = [...decadeCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([decade, count]) => ({ decade, count }));

    // --- EXPLICIT ---
    const explicitCount = tracks.filter((t) => t.explicit).length;
    const explicitPercentage = tracks.length > 0 ? Math.round((explicitCount / tracks.length) * 100) : 0;

    // --- GENRES ---
    const artistIds = [...new Set(tracks.map((t) => t.artistId).filter(Boolean))];
    let genreDistribution: { genre: string; count: number }[] = [];
    try {
      if (artistIds.length > 0) {
        const genreMap = await getArtistGenres(session.user.id, artistIds);
        const genreCounts = new Map<string, number>();
        for (const track of tracks) {
          const genres = genreMap.get(track.artistId) ?? [];
          for (const genre of genres) {
            genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
          }
        }
        genreDistribution = [...genreCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([genre, count]) => ({ genre, count }));
      }
    } catch (e) {
      console.error("Genres fetch failed:", e);
    }

    // --- ARTIST DIVERSITY ---
    const artistCounts = new Map<string, number>();
    for (const t of tracks) {
      artistCounts.set(t.artistName, (artistCounts.get(t.artistName) ?? 0) + 1);
    }
    const totalArtists = artistCounts.size;
    const topThreeCount = [...artistCounts.values()]
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((a, b) => a + b, 0);
    const topArtistShare = tracks.length > 0 ? Math.round((topThreeCount / tracks.length) * 100) : 0;
    const diversityScore = totalArtists > 0
      ? Math.round((1 - topArtistShare / 100) * (Math.min(totalArtists, tracks.length) / tracks.length) * 100)
      : 0;
    const artistDistribution = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / tracks.length) * 100),
      }));

    // --- ALBUM DIVERSITY ---
    const albumSet = new Set(tracks.map((t) => t.albumId).filter(Boolean));

    // --- "FRESHNESS" - how recently were songs released ---
    const now = new Date();
    const releaseDates = tracks
      .map((t) => t.releaseDate ? new Date(t.releaseDate) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
    const avgAge = releaseDates.length > 0
      ? Math.round(
          releaseDates.reduce((sum, d) => sum + (now.getTime() - d.getTime()), 0) /
            releaseDates.length /
            (1000 * 60 * 60 * 24 * 365)
        )
      : null;

    return NextResponse.json({
      duration,
      decades,
      explicit: { count: explicitCount, percentage: explicitPercentage },
      genreDistribution,
      artistDiversity: {
        totalArtists,
        totalAlbums: albumSet.size,
        topArtistShare,
        diversityScore,
        distribution: artistDistribution,
      },
      freshness: {
        avgAgeYears: avgAge,
        newestYear: releaseDates.length > 0 ? Math.max(...releaseDates.map((d) => d.getFullYear())) : null,
        oldestYear: releaseDates.length > 0 ? Math.min(...releaseDates.map((d) => d.getFullYear())) : null,
      },
      totalTracks: tracks.length,
    });
  } catch (error) {
    console.error("GET /api/playlists/[id]/insights error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
