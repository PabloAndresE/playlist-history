"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import ChangeTimeline from "@/components/playlist/ChangeTimeline";

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

    // Fetch mood in background (non-blocking)
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Playlist not found
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
            alt=""
            className="w-24 h-24 rounded-xl object-cover shadow-md"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{playlist.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            by {playlist.ownerDisplayName}
            {playlist.isCollaborative && (
              <span className="ml-2 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full text-xs">
                Collaborative
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm bg-[#1DB954] text-white px-4 py-1.5 rounded-full hover:bg-[#1aa34a] disabled:opacity-50 transition-colors"
            >
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            <Link
              href={`/playlist/${id}/analytics`}
              className="text-sm text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Analytics
            </Link>
            <Link
              href={`/playlist/${id}/restore`}
              className="text-sm text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Restore
            </Link>
            <a
              href={`https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1DB954] hover:underline"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{overview.totalTracks}</p>
            <p className="text-xs text-gray-500 mt-1">Tracks</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{overview.uniqueArtists}</p>
            <p className="text-xs text-gray-500 mt-1">Artists</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{changes.length}</p>
            <p className="text-xs text-gray-500 mt-1">Changes detected</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            activeTab === "overview"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("changes")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            activeTab === "changes"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
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
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Playlist Vibe</h3>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex flex-wrap gap-2 mb-5">
                  {mood.moods.map((m) => (
                    <span
                      key={m.mood}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
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
                        <span className="text-xs text-gray-500 capitalize">{key}</span>
                        <span className="text-xs font-medium text-gray-700">
                          {key === "tempo" ? `${value} BPM` : `${value}%`}
                        </span>
                      </div>
                      {key !== "tempo" && (
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1DB954] transition-all"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Based on {mood.tracksAnalyzed} tracks analyzed
                </p>
              </div>
            </div>
          )}

          {/* Top Artists */}
          {overview.topArtists.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Artists</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {overview.topArtists.map((artist) => (
                  <div
                    key={artist.name}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                  >
                    {artist.imageUrl ? (
                      <img src={artist.imageUrl} alt="" className="w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{artist.name}</p>
                      <p className="text-xs text-gray-400">{artist.count} tracks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tracks */}
          {overview.recentTracks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recently Added</h3>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {overview.recentTracks.map((track) => (
                  <a
                    key={track.spotifyId}
                    href={`https://open.spotify.com/track/${track.spotifyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                  >
                    {track.imageUrl ? (
                      <img src={track.imageUrl} alt="" className="w-10 h-10 rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{track.name}</p>
                      <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-400">{track.album}</p>
                      <p className="text-xs text-gray-300">
                        {format(new Date(track.addedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Last sync info */}
          {overview.lastSnapshot && (
            <p className="text-xs text-gray-400 text-center">
              Last snapshot: {format(new Date(overview.lastSnapshot), "MMM d, yyyy 'at' h:mm a")}
              {overview.snapshotSource === "CRON" ? " (auto)" : " (manual)"}
            </p>
          )}

          {overview.totalTracks === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No snapshot yet</p>
              <p className="text-sm mt-1">Click &quot;Sync now&quot; to take the first snapshot</p>
            </div>
          )}
        </div>
      )}

      {/* Changes tab */}
      {activeTab === "changes" && <ChangeTimeline changes={changes} />}
    </div>
  );
}
