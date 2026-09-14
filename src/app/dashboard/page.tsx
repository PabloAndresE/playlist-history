"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import PlaylistCard from "@/components/playlist/PlaylistCard";
import { SkeletonList } from "@/components/ui/Skeleton";

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
  const [pickerLoading, setPickerLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    setPickerLoading(true);
    const res = await fetch("/api/playlists");
    if (res.ok) {
      const data = await res.json();
      setSpotifyPlaylists(data);
    }
    setPickerLoading(false);
  };

  const trackPlaylist = async (spotifyId: string) => {
    setTrackingId(spotifyId);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotifyPlaylistId: spotifyId }),
    });
    if (res.ok) {
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

  const filteredPlaylists = spotifyPlaylists.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="skeleton h-7 w-32" />
            <div className="skeleton h-4 w-48" />
          </div>
          <div className="skeleton h-9 w-36 rounded-lg" />
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {session?.user?.name
              ? `Welcome back, ${session.user.name}`
              : "Your tracked playlists"}
          </p>
        </div>
        <button
          onClick={fetchSpotifyPlaylists}
          className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
        >
          + Track playlist
        </button>
      </div>

      {/* Tracked playlists */}
      {trackedPlaylists.length > 0 ? (
        <div className="space-y-3">
          {trackedPlaylists.map((p, i) => (
            <div key={p.id} className="animate-in" style={{ animationDelay: `${i * 50}ms` }}>
              <PlaylistCard
                id={p.id}
                name={p.name}
                coverImageUrl={p.coverImageUrl}
                ownerDisplayName={p.ownerDisplayName}
                trackCount={p.trackCount}
                isCollaborative={p.isCollaborative}
                recentChanges={p._count.changes}
                onUntrack={() => untrackPlaylist(p.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <p className="text-lg text-text-secondary font-medium">No playlists tracked yet</p>
          <p className="text-sm text-text-muted mt-1 mb-6 max-w-xs mx-auto">
            Start by adding a playlist from your Spotify library. We'll track every change automatically.
          </p>
          <button
            onClick={fetchSpotifyPlaylists}
            className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
          >
            + Track your first playlist
          </button>
        </div>
      )}

      {/* Spotify playlists picker modal */}
      {showSpotify && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSpotify(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Pick a playlist to track"
        >
          <div className="bg-surface-1 border border-border rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col animate-in">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">
                Your Spotify Playlists
              </h2>
              <button
                onClick={() => setShowSpotify(false)}
                className="text-text-muted hover:text-text-secondary p-1 rounded-lg hover:bg-surface-2 transition-colors"
                aria-label="Close picker"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <input
                type="search"
                placeholder="Search playlists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-4 pt-2 space-y-1.5">
              {pickerLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                      <div className="skeleton w-10 h-10 rounded" />
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3.5 w-2/3" />
                        <div className="skeleton h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPlaylists.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  {searchQuery ? "No playlists match your search" : "No playlists found"}
                </div>
              ) : (
                filteredPlaylists.map((p) => (
                  <div
                    key={p.spotifyId}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle hover:border-border transition-colors"
                  >
                    {p.coverImageUrl ? (
                      <img src={p.coverImageUrl} alt="" className="w-10 h-10 rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-surface-2" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {p.trackCount} tracks
                      </p>
                    </div>
                    {p.isTracked ? (
                      <span className="text-xs text-accent font-medium bg-accent-muted px-2.5 py-1 rounded">
                        Tracking
                      </span>
                    ) : (
                      <button
                        onClick={() => trackPlaylist(p.spotifyId)}
                        disabled={trackingId === p.spotifyId}
                        className="text-xs bg-accent text-white font-medium px-3 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
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
