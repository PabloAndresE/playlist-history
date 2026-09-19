import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NormalizedTrack } from "@/lib/spotify";

interface ContributorStats {
  spotifyId: string;
  trackCount: number;
  topArtists: { name: string; count: number }[];
  topGenres: string[];
  recentAdds: { trackName: string; artistName: string; albumImageUrl: string | null; addedAt: string }[];
  playlists: string[];
}

interface TasteOverlap {
  userA: string;
  userB: string;
  sharedArtists: string[];
  overlapPercent: number;
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

  // Compute top artists per contributor and artist sets for taste overlap
  const contributorArtistSets = new Map<string, Set<string>>();

  for (const [id, contributor] of filteredContributorMap) {
    // Count artists
    const artistCounts = new Map<string, number>();
    for (const add of contributor.recentAdds) {
      artistCounts.set(add.artistName, (artistCounts.get(add.artistName) ?? 0) + 1);
    }
    contributor.topArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    contributorArtistSets.set(id, new Set(artistCounts.keys()));

    // Keep only 5 most recent adds
    contributor.recentAdds = contributor.recentAdds
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 5);
  }

  // Compute taste overlaps between pairs
  const contributorIds = [...filteredContributorMap.keys()].filter((id) => id !== "unknown");
  const tasteOverlaps: TasteOverlap[] = [];
  for (let i = 0; i < contributorIds.length; i++) {
    for (let j = i + 1; j < contributorIds.length; j++) {
      const setA = contributorArtistSets.get(contributorIds[i])!;
      const setB = contributorArtistSets.get(contributorIds[j])!;
      const shared = [...setA].filter((a) => setB.has(a));
      if (shared.length > 0) {
        const union = new Set([...setA, ...setB]);
        tasteOverlaps.push({
          userA: contributorIds[i],
          userB: contributorIds[j],
          sharedArtists: shared.slice(0, 8),
          overlapPercent: Math.round((shared.length / union.size) * 100),
        });
      }
    }
  }
  tasteOverlaps.sort((a, b) => b.overlapPercent - a.overlapPercent);

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
