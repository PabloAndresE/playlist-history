import { prisma } from "./prisma";
import { getPlaylistTracks, getLikedTracks, NormalizedTrack, LIKED_SONGS_ID } from "./spotify";
import { SnapshotSource } from "@prisma/client";

export interface SyncResult {
  playlistId: string;
  added: number;
  removed: number;
  snapshotCreated: boolean;
}

export async function syncPlaylist(
  trackedPlaylistId: string,
  source: SnapshotSource
): Promise<SyncResult> {
  const tracked = await prisma.trackedPlaylist.findUnique({
    where: { id: trackedPlaylistId },
    include: { user: true },
  });

  if (!tracked) throw new Error("Tracked playlist not found");

  const currentTracks = tracked.spotifyPlaylistId === LIKED_SONGS_ID
    ? await getLikedTracks(tracked.userId)
    : await getPlaylistTracks(tracked.userId, tracked.spotifyPlaylistId);

  const lastSnapshot = await prisma.playlistSnapshot.findFirst({
    where: { trackedPlaylistId },
    orderBy: { takenAt: "desc" },
  });

  // First snapshot: save everything, no diffs
  if (!lastSnapshot) {
    await prisma.playlistSnapshot.create({
      data: {
        trackedPlaylistId,
        trackCount: currentTracks.length,
        source,
        tracks: JSON.parse(JSON.stringify(currentTracks)),
      },
    });

    await prisma.trackedPlaylist.update({
      where: { id: trackedPlaylistId },
      data: { trackCount: currentTracks.length },
    });

    return {
      playlistId: trackedPlaylistId,
      added: 0,
      removed: 0,
      snapshotCreated: true,
    };
  }

  // Compare with previous snapshot
  const previousTracks = lastSnapshot.tracks as unknown as NormalizedTrack[];
  const previousIds = new Set(previousTracks.map((t) => t.spotifyId));
  const currentIds = new Set(currentTracks.map((t) => t.spotifyId));

  const added = currentTracks.filter((t) => !previousIds.has(t.spotifyId));
  const removed = previousTracks.filter((t) => !currentIds.has(t.spotifyId));

  // No changes: skip snapshot
  if (added.length === 0 && removed.length === 0) {
    return {
      playlistId: trackedPlaylistId,
      added: 0,
      removed: 0,
      snapshotCreated: false,
    };
  }

  // Create new snapshot and change records
  const snapshot = await prisma.playlistSnapshot.create({
    data: {
      trackedPlaylistId,
      trackCount: currentTracks.length,
      source,
      tracks: JSON.parse(JSON.stringify(currentTracks)),
    },
  });

  const changeRecords = [
    ...added.map((t) => ({
      trackedPlaylistId,
      snapshotId: snapshot.id,
      trackSpotifyId: t.spotifyId,
      trackName: t.name,
      artistName: t.artistName,
      albumName: t.albumName,
      albumImageUrl: t.albumImageUrl,
      changeType: "ADDED" as const,
      changedBySpotifyId: t.addedBy,
    })),
    ...removed.map((t) => ({
      trackedPlaylistId,
      snapshotId: snapshot.id,
      trackSpotifyId: t.spotifyId,
      trackName: t.name,
      artistName: t.artistName,
      albumName: t.albumName,
      albumImageUrl: t.albumImageUrl,
      changeType: "REMOVED" as const,
      changedBySpotifyId: null,
    })),
  ];

  await prisma.playlistChange.createMany({ data: changeRecords });

  await prisma.trackedPlaylist.update({
    where: { id: trackedPlaylistId },
    data: { trackCount: currentTracks.length },
  });

  return {
    playlistId: trackedPlaylistId,
    added: added.length,
    removed: removed.length,
    snapshotCreated: true,
  };
}

export async function syncAllPlaylists(): Promise<SyncResult[]> {
  const playlists = await prisma.trackedPlaylist.findMany({
    include: { user: true },
  });

  const results: SyncResult[] = [];

  for (const playlist of playlists) {
    try {
      const result = await syncPlaylist(playlist.id, "CRON");
      results.push(result);
    } catch (error) {
      console.error(`Failed to sync playlist ${playlist.id}:`, error);
      results.push({
        playlistId: playlist.id,
        added: 0,
        removed: 0,
        snapshotCreated: false,
      });
    }
  }

  return results;
}
