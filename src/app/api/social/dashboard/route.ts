import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NormalizedTrack } from "@/lib/spotify";
import { getGenresForArtists } from "@/lib/lastfm";

interface ContributorStats {
  spotifyId: string;
  trackCount: number;
  topArtists: { name: string; count: number; imageUrl: string | null }[];
  topGenres: string[];
  recentAdds: { trackName: string; artistName: string; albumImageUrl: string | null; addedAt: string }[];
  playlists: string[];
}

interface TasteOverlap {
  userA: string;
  userB: string;
  sharedArtists: { name: string; imageUrl: string | null }[];
  sharedGenres: string[];
  onlyGenresA: string[];
  onlyGenresB: string[];
  radarGenres: { genre: string; userA: number; userB: number }[];
  compatibilityScore: number;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { spotifyId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get all tracked playlists with their latest snapshot
  const allPlaylists = await prisma.trackedPlaylist.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, spotifyPlaylistId: true, coverImageUrl: true, isCollaborative: true },
  });

  if (allPlaylists.length === 0) {
    return NextResponse.json({
      hasData: false,
      playlists: [],
      contributors: [],
      tasteOverlaps: [],
      activityTimeline: [],
      stats: { totalCollaborators: 0, totalTracksFromOthers: 0, playlistCount: 0 },
    });
  }

  const allPlaylistIds = allPlaylists.map((p) => p.id);
  const snapshots = await prisma.playlistSnapshot.findMany({
    where: { trackedPlaylistId: { in: allPlaylistIds } },
    orderBy: { takenAt: "desc" },
    distinct: ["trackedPlaylistId"],
  });

  // Build contributor map and detect which playlists have multiple contributors
  const contributorMap = new Map<string, ContributorStats>();
  const playlistNameMap = new Map<string, string>();
  const playlistContributors = new Map<string, Set<string>>();
  for (const p of allPlaylists) {
    playlistNameMap.set(p.id, p.name);
  }

  for (const snapshot of snapshots) {
    const tracks = snapshot.tracks as unknown as NormalizedTrack[];
    const playlistName = playlistNameMap.get(snapshot.trackedPlaylistId) ?? "Unknown";
    const contributors = new Set<string>();

    for (const track of tracks) {
      const contributorId = track.addedBy ?? "unknown";
      if (contributorId !== "unknown") contributors.add(contributorId);

      let contributor = contributorMap.get(contributorId);
      if (!contributor) {
        contributor = {
          spotifyId: contributorId,
          trackCount: 0,
          topArtists: [],
          topGenres: [],
          recentAdds: [],
          playlists: [],
        };
        contributorMap.set(contributorId, contributor);
      }
      contributor.trackCount++;
      if (!contributor.playlists.includes(playlistName)) {
        contributor.playlists.push(playlistName);
      }
      contributor.recentAdds.push({
        trackName: track.name,
        artistName: track.artistName,
        albumImageUrl: track.albumImageUrl,
        addedAt: track.addedAt,
      });
    }

    playlistContributors.set(snapshot.trackedPlaylistId, contributors);
  }

  // A playlist is "social" if it's marked collaborative OR has multiple contributors
  const collabPlaylists = allPlaylists.filter((p) => {
    const contribs = playlistContributors.get(p.id);
    return p.isCollaborative || (contribs && contribs.size > 1);
  });

  if (collabPlaylists.length === 0) {
    return NextResponse.json({
      hasData: false,
      playlists: [],
      contributors: [],
      tasteOverlaps: [],
      activityTimeline: [],
      stats: { totalCollaborators: 0, totalTracksFromOthers: 0, playlistCount: 0 },
    });
  }

  // Filter contributor data to only include social playlists
  const socialPlaylistNames = new Set(collabPlaylists.map((p) => p.name));
  const filteredContributorMap = new Map<string, ContributorStats>();
  for (const [id, contributor] of contributorMap) {
    const socialPlaylists = contributor.playlists.filter((p) => socialPlaylistNames.has(p));
    if (socialPlaylists.length === 0) continue;
    filteredContributorMap.set(id, { ...contributor, playlists: socialPlaylists });
  }

  const playlistIds = collabPlaylists.map((p) => p.id);

  // Compute top artists per contributor (with images) and artist sets for taste overlap
  const contributorArtistSets = new Map<string, Set<string>>();
  const allArtistNames = new Set<string>();
  const globalArtistImages = new Map<string, string | null>();

  for (const [id, contributor] of filteredContributorMap) {
    // Count artists and track best image per artist
    const artistCounts = new Map<string, { count: number; imageUrl: string | null }>();
    for (const add of contributor.recentAdds) {
      const existing = artistCounts.get(add.artistName);
      if (existing) {
        existing.count++;
        if (!existing.imageUrl && add.albumImageUrl) existing.imageUrl = add.albumImageUrl;
      } else {
        artistCounts.set(add.artistName, { count: 1, imageUrl: add.albumImageUrl });
      }
    }
    contributor.topArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, { count, imageUrl }]) => ({ name, count, imageUrl }));

    const artistSet = new Set(artistCounts.keys());
    contributorArtistSets.set(id, artistSet);
    for (const [name, { imageUrl }] of artistCounts) {
      allArtistNames.add(name);
      if (imageUrl && !globalArtistImages.has(name)) globalArtistImages.set(name, imageUrl);
    }

    // Keep only 5 most recent adds
    contributor.recentAdds = contributor.recentAdds
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 5);
  }

  // Fetch genres from Last.fm for all artists (batched, uses cache)
  const genreMap = await getGenresForArtists([...allArtistNames]);

  // Assign top genres per contributor (keep raw counts for radar)
  const contributorGenreSets = new Map<string, Set<string>>();
  const contributorGenreCounts = new Map<string, Map<string, number>>();
  for (const [id, contributor] of filteredContributorMap) {
    const genreCounts = new Map<string, number>();
    const artistSet = contributorArtistSets.get(id)!;
    for (const artistName of artistSet) {
      const genres = genreMap.get(artistName) ?? [];
      for (const g of genres) {
        genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
      }
    }
    contributor.topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    contributorGenreSets.set(id, new Set(genreCounts.keys()));
    contributorGenreCounts.set(id, genreCounts);
  }

  // Compute compatibility between pairs (artists 60% + genres 40%)
  const contributorIds = [...filteredContributorMap.keys()].filter((id) => id !== "unknown");
  const tasteOverlaps: TasteOverlap[] = [];
  for (let i = 0; i < contributorIds.length; i++) {
    for (let j = i + 1; j < contributorIds.length; j++) {
      const artistsA = contributorArtistSets.get(contributorIds[i])!;
      const artistsB = contributorArtistSets.get(contributorIds[j])!;
      const sharedArtists = [...artistsA].filter((a) => artistsB.has(a));
      const artistUnion = new Set([...artistsA, ...artistsB]);
      const artistOverlap = artistUnion.size > 0 ? sharedArtists.length / artistUnion.size : 0;

      const genresA = contributorGenreSets.get(contributorIds[i]) ?? new Set();
      const genresB = contributorGenreSets.get(contributorIds[j]) ?? new Set();
      const sharedGenres = [...genresA].filter((g) => genresB.has(g));
      const genreUnion = new Set([...genresA, ...genresB]);
      const genreOverlap = genreUnion.size > 0 ? sharedGenres.length / genreUnion.size : 0;

      const score = Math.round(artistOverlap * 60 + genreOverlap * 40);

      if (sharedArtists.length > 0 || sharedGenres.length > 0) {
        const onlyGenresA = [...genresA].filter((g) => !genresB.has(g)).slice(0, 6);
        const onlyGenresB = [...genresB].filter((g) => !genresA.has(g)).slice(0, 6);

        // Shared artists with images
        const sharedArtistsWithImages = sharedArtists.slice(0, 5).map((name) => ({
          name,
          imageUrl: globalArtistImages.get(name) ?? null,
        }));

        // Radar chart data: top genres from both users (union of top 8)
        const countsA = contributorGenreCounts.get(contributorIds[i])!;
        const countsB = contributorGenreCounts.get(contributorIds[j])!;
        const allGenresSorted = [...new Set([...genresA, ...genresB])]
          .map((g) => ({ genre: g, total: (countsA.get(g) ?? 0) + (countsB.get(g) ?? 0) }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 8);
        const maxCount = Math.max(...allGenresSorted.map((g) => Math.max(countsA.get(g.genre) ?? 0, countsB.get(g.genre) ?? 0)), 1);
        const radarGenres = allGenresSorted.map(({ genre }) => ({
          genre,
          userA: Math.round(((countsA.get(genre) ?? 0) / maxCount) * 100),
          userB: Math.round(((countsB.get(genre) ?? 0) / maxCount) * 100),
        }));

        tasteOverlaps.push({
          userA: contributorIds[i],
          userB: contributorIds[j],
          sharedArtists: sharedArtistsWithImages,
          sharedGenres: sharedGenres.slice(0, 6),
          onlyGenresA,
          onlyGenresB,
          radarGenres,
          compatibilityScore: score,
        });
      }
    }
  }
  tasteOverlaps.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Recent changes as activity timeline
  const recentChanges = await prisma.playlistChange.findMany({
    where: {
      trackedPlaylistId: { in: playlistIds },
    },
    include: {
      trackedPlaylist: { select: { name: true, spotifyPlaylistId: true } },
    },
    orderBy: { detectedAt: "desc" },
    take: 30,
  });

  const activityTimeline = recentChanges.map((c) => ({
    id: c.id,
    trackName: c.trackName,
    artistName: c.artistName,
    albumImageUrl: c.albumImageUrl,
    changeType: c.changeType,
    detectedAt: c.detectedAt.toISOString(),
    changedBySpotifyId: c.changedBySpotifyId,
    playlistName: c.trackedPlaylist.name,
    playlistId: c.trackedPlaylist.spotifyPlaylistId,
  }));

  // Resolve display names for all contributors from the User table
  const allSpotifyIds = [...filteredContributorMap.keys()].filter((id) => id !== "unknown");
  const knownUsers = await prisma.user.findMany({
    where: { spotifyId: { in: allSpotifyIds } },
    select: { spotifyId: true, displayName: true },
  });
  const displayNames: Record<string, string> = {};
  for (const u of knownUsers) {
    displayNames[u.spotifyId] = u.displayName;
  }

  // Sort contributors by track count, current user first
  const contributors = [...filteredContributorMap.values()]
    .filter((c) => c.spotifyId !== "unknown")
    .sort((a, b) => {
      if (a.spotifyId === user.spotifyId) return -1;
      if (b.spotifyId === user.spotifyId) return 1;
      return b.trackCount - a.trackCount;
    });

  const totalTracksFromOthers = contributors
    .filter((c) => c.spotifyId !== user.spotifyId)
    .reduce((sum, c) => sum + c.trackCount, 0);

  return NextResponse.json({
    hasData: true,
    currentUserSpotifyId: user.spotifyId,
    displayNames,
    playlists: collabPlaylists,
    contributors,
    tasteOverlaps,
    activityTimeline,
    stats: {
      totalCollaborators: contributors.filter((c) => c.spotifyId !== user.spotifyId).length,
      totalTracksFromOthers,
      playlistCount: collabPlaylists.length,
    },
  });
}
