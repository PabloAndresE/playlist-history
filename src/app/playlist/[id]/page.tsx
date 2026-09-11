"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

export default function PlaylistDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    const [playlistRes, changesRes] = await Promise.all([
      fetch(`/api/playlists/${id}`),
      fetch(`/api/playlists/${id}/changes`),
    ]);

    if (playlistRes.ok) setPlaylist(await playlistRes.json());
    if (changesRes.ok) setChanges(await changesRes.json());
    setLoading(false);
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
      <div className="flex items-start gap-4 mb-8">
        {playlist.coverImageUrl ? (
          <img
            src={playlist.coverImageUrl}
            alt=""
            className="w-20 h-20 rounded-xl object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-gray-100" />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{playlist.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            by {playlist.ownerDisplayName} &middot; {playlist.trackCount} tracks
            {playlist.isCollaborative && (
              <span className="ml-2 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full text-xs">
                Collaborative
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm bg-[#1DB954] text-white px-4 py-1.5 rounded-full hover:bg-[#1aa34a] disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            <Link
              href={`/playlist/${id}/analytics`}
              className="text-sm text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300"
            >
              Analytics
            </Link>
            <Link
              href={`/playlist/${id}/restore`}
              className="text-sm text-gray-600 px-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300"
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

      {/* Change timeline */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Change History
        </h2>
        <ChangeTimeline changes={changes} />
      </div>
    </div>
  );
}
