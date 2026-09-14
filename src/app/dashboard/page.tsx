"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PlaylistCard from "@/components/playlist/PlaylistCard";

interface SpotifyPlaylist {
  spotifyId: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  ownerSpotifyId: string;
  ownerDisplayName: string;
  isPublic: boolean;
  isCollaborative: boolean;
  trackCount: number;
  isTracked: boolean;
}

interface TrackedPlaylist {
  id: string;
  name: string;
  coverImageUrl: string | null;
  ownerDisplayName: string;
  trackCount: number;
  isCollaborative: boolean;
  _count: { changes: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [trackedPlaylists, setTrackedPlaylists] = useState<TrackedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [showSpotify, setShowSpotify] = useState(false);

  const fetchTracked = useCallback(async () => {
    const res = await fetch("/api/playlists/tracked");
    if (res.ok) {
      const data = await res.json();
      setTrackedPlaylists(data);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTracked().finally(() => setLoading(false));
    }
  }, [status, fetchTracked]);

  const fetchSpotifyPlaylists = async () => {
    setShowSpotify(true);
    const res = await fetch("/api/playlists");
    if (res.ok) {
      const data = await res.json();
      setSpotifyPlaylists(data);
    }
  };

  const trackPlaylist = async (spotifyId: string) => {
    setTrackingId(spotifyId);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotifyPlaylistId: spotifyId }),
    });
    if (res.ok) {
      // Refresh both lists
      await fetchTracked();
      setSpotifyPlaylists((prev) =>
        prev.map((p) =>
          p.spotifyId === spotifyId ? { ...p, isTracked: true } : p
        )
      );
    }
    setTrackingId(null);
  };

  const untrackPlaylist = async (id: string) => {
    if (!confirm("Stop tracking this playlist?")) return;
    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchTracked();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {session?.user?.name
              ? `Welcome back, ${session.user.name}`
              : "Your tracked playlists"}
          </p>
        </div>
        <button
          onClick={fetchSpotifyPlaylists}
          className="bg-[#1DB954] text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-[#1aa34a] transition-colors"
        >
          + Track playlist
        </button>
      </div>

      {/* Tracked playlists */}
      {trackedPlaylists.length > 0 ? (
        <div className="space-y-3">
          {trackedPlaylists.map((p) => (
            <div key={p.id} className="relative group">
              <PlaylistCard
                id={p.id}
                name={p.name}
                coverImageUrl={p.coverImageUrl}
                ownerDisplayName={p.ownerDisplayName}
                trackCount={p.trackCount}
                isCollaborative={p.isCollaborative}
                recentChanges={p._count.changes}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  untrackPlaylist(p.id);
                }}
                className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-500 hover:text-red-700 bg-white px-2 py-1 rounded border border-red-200"
              >
                Untrack
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <p className="text-lg">No playlists tracked yet</p>
          <p className="text-sm mt-1">
            Click &quot;Track playlist&quot; to start monitoring changes
          </p>
        </div>
      )}

      {/* Spotify playlists picker */}
      {showSpotify && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Your Spotify Playlists
              </h2>
              <button
                onClick={() => setShowSpotify(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {spotifyPlaylists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Loading playlists...
                </div>
              ) : (
                spotifyPlaylists.map((p) => (
                  <div
                    key={p.spotifyId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                  >
                    {p.coverImageUrl ? (
                      <img
                        src={p.coverImageUrl}
                        alt=""
                        className="w-10 h-10 rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.trackCount} tracks
                      </p>
                    </div>
                    {p.isTracked ? (
                      <span className="text-xs text-[#1DB954] font-medium">
                        Tracking
                      </span>
                    ) : (
                      <button
                        onClick={() => trackPlaylist(p.spotifyId)}
                        disabled={trackingId === p.spotifyId}
                        className="text-xs bg-[#1DB954] text-white px-3 py-1.5 rounded-full hover:bg-[#1aa34a] disabled:opacity-50"
                      >
                        {trackingId === p.spotifyId ? "Adding..." : "Track"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
