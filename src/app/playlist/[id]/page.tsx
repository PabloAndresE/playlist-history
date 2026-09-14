"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import ChangeTimeline from "@/components/playlist/ChangeTimeline";
import { SkeletonBlock, SkeletonStats } from "@/components/ui/Skeleton";

interface PlaylistDetail {
  id: string;
  name: string;
  coverImageUrl: string | null;
  ownerDisplayName: string;
  trackCount: number;
  isCollaborative: boolean;
  spotifyPlaylistId: string;
}

interface Change {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumImageUrl: string | null;
  changeType: "ADDED" | "REMOVED";
  detectedAt: string;
  trackSpotifyId: string;
  changedBySpotifyId: string | null;
}

interface Overview {
  totalTracks: number;
  uniqueArtists: number;
  topArtists: { name: string; count: number; imageUrl: string | null }[];
  recentTracks: {
    name: string;
    artist: string;
    album: string;
    imageUrl: string | null;
    spotifyId: string;
    addedAt: string;
  }[];
  lastSnapshot: string | null;
  snapshotSource: string | null;
}

export default function PlaylistDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mood, setMood] = useState<{
    available: boolean;
    moods?: { mood: string; emoji: string; description: string; color: string }[];
    features?: Record<string, number>;
    tracksAnalyzed?: number;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "changes">("overview");

  const fetchData = useCallback(async () => {
    const [playlistRes, changesRes, overviewRes] = await Promise.all([
      fetch(`/api/playlists/${id}`),
      fetch(`/api/playlists/${id}/changes`),
      fetch(`/api/playlists/${id}/overview`),
    ]);

    if (playlistRes.ok) setPlaylist(await playlistRes.json());
    if (changesRes.ok) setChanges(await changesRes.json());
    if (overviewRes.ok) setOverview(await overviewRes.json());
    setLoading(false);

    fetch(`/api/playlists/${id}/mood`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setMood(data); });
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch(`/api/playlists/${id}/sync`, { method: "POST" });
    await fetchData();
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-start gap-5 mb-8">
          <SkeletonBlock className="w-24 h-24 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="h-4 w-32" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-24 rounded-lg" />
              <SkeletonBlock className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
        <SkeletonStats />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-lg text-text-secondary">Playlist not found</p>
        <Link href="/dashboard" className="text-sm text-accent hover:text-accent-hover mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        {playlist.coverImageUrl ? (
          <img
            src={playlist.coverImageUrl}
            alt={`${playlist.name} cover`}
            className="w-24 h-24 rounded-xl object-cover shadow-lg shadow-black/10"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-surface-2 flex items-center justify-center">
            <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{playlist.name}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {playlist.ownerDisplayName}
            {playlist.isCollaborative && (
              <span className="ml-2 text-purple bg-purple-muted px-2 py-0.5 rounded text-xs">
                Collaborative
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm bg-accent text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            <Link
              href={`/playlist/${id}/analytics`}
              className="text-sm text-text-secondary px-4 py-1.5 rounded-lg border border-border hover:border-text-muted transition-colors"
            >
              Analytics
            </Link>
            <Link
              href={`/playlist/${id}/restore`}
              className="text-sm text-text-secondary px-4 py-1.5 rounded-lg border border-border hover:border-text-muted transition-colors"
            >
              Restore
            </Link>
            <a
              href={`https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
            <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{overview.totalTracks}</p>
            <p className="text-xs text-text-muted mt-1">Tracks</p>
          </div>
          <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
            <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{overview.uniqueArtists}</p>
            <p className="text-xs text-text-muted mt-1">Artists</p>
          </div>
          <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
            <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{changes.length}</p>
            <p className="text-xs text-text-muted mt-1">Changes detected</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-1 border border-border-subtle rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "bg-surface-2 text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("changes")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors cursor-pointer ${
            activeTab === "changes"
              ? "bg-surface-2 text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Changes ({changes.length})
        </button>
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && overview && (
        <div className="space-y-8">
          {/* Mood / Vibe */}
          {mood?.available && mood.moods && mood.features && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Playlist Vibe</h3>
              <div className="bg-surface-1 rounded-xl border border-border-subtle p-5">
                <div className="flex flex-wrap gap-2 mb-5">
                  {mood.moods.map((m) => (
                    <span
                      key={m.mood}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.emoji} {m.mood}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(mood.features).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-muted capitalize">{key}</span>
                        <span className="text-xs font-medium text-text-secondary">
                          {key === "tempo" ? `${value} BPM` : `${value}%`}
                        </span>
                      </div>
                      {key !== "tempo" && (
                        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-4">
                  Based on {mood.tracksAnalyzed} tracks analyzed
                </p>
              </div>
            </div>
          )}

          {/* Top Artists */}
          {overview.topArtists.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Top Artists</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {overview.topArtists.map((artist) => (
                  <div
                    key={artist.name}
                    className="flex items-center gap-3 p-3 bg-surface-1 rounded-xl border border-border-subtle"
                  >
                    {artist.imageUrl ? (
                      <img src={artist.imageUrl} alt="" className="w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-surface-2" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{artist.name}</p>
                      <p className="text-xs text-text-muted">{artist.count} tracks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tracks */}
          {overview.recentTracks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Recently Added</h3>
              <div className="bg-surface-1 rounded-xl border border-border-subtle divide-y divide-border-subtle">
                {overview.recentTracks.map((track) => (
                  <a
                    key={track.spotifyId}
                    href={`https://open.spotify.com/track/${track.spotifyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors"
                  >
                    {track.imageUrl ? (
                      <img src={track.imageUrl} alt="" className="w-10 h-10 rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-surface-2" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{track.name}</p>
                      <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-text-muted">{track.album}</p>
                      <p className="text-xs text-text-muted">
                        {format(new Date(track.addedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {overview.lastSnapshot && (
            <p className="text-xs text-text-muted text-center">
              Last snapshot: {format(new Date(overview.lastSnapshot), "MMM d, yyyy 'at' h:mm a")}
              {overview.snapshotSource === "CRON" ? " (auto)" : " (manual)"}
            </p>
          )}

          {overview.totalTracks === 0 && (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <p className="text-lg text-text-secondary">No snapshot yet</p>
              <p className="text-sm text-text-muted mt-1 mb-4">Take the first snapshot to see your playlist overview.</p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="bg-accent text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
              >
                {syncing ? "Syncing..." : "Sync now"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Changes tab */}
      {activeTab === "changes" && <ChangeTimeline changes={changes} />}
    </div>
  );
}
