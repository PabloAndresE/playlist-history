"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";
import { SkeletonList } from "@/components/ui/Skeleton";
import Link from "next/link";

interface ExplorePlaylist {
  id: string;
  name: string;
  coverImageUrl: string | null;
  ownerDisplayName: string;
  trackCount: number;
  recentChanges: {
    id: string;
    trackName: string;
    artistName: string;
    albumImageUrl: string | null;
    changeType: "ADDED" | "REMOVED";
    detectedAt: string;
  }[];
}

export default function ExplorePage() {
  const [playlists, setPlaylists] = useState<ExplorePlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explore")
      .then((res) => res.json())
      .then(setPlaylists)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="space-y-2 mb-8">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-80" />
        </div>
        <SkeletonList rows={3} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-2">
        Explore Playlists
      </h1>
      <p className="text-sm text-text-secondary mb-8">
        Public playlists being tracked by the community. See how they evolve
        over time.
      </p>

      {playlists.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg text-text-secondary font-medium">No public playlists yet</p>
          <p className="text-sm text-text-muted mt-1 mb-6 max-w-xs mx-auto">
            When users track public playlists, they'll appear here with their change history.
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-block bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
          >
            Be the first to track one
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map((p, i) => (
            <div
              key={p.id}
              className="bg-surface-1 rounded-xl border border-border-subtle overflow-hidden animate-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-4 p-4">
                {p.coverImageUrl ? (
                  <img
                    src={p.coverImageUrl}
                    alt={`${p.name} cover`}
                    className="w-14 h-14 rounded-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-surface-2" />
                )}
                <div>
                  <h3 className="font-semibold text-text-primary">{p.name}</h3>
                  <p className="text-xs text-text-secondary">
                    by {p.ownerDisplayName} &middot; {p.trackCount} tracks
                  </p>
                </div>
              </div>
              {p.recentChanges.length > 0 && (
                <div className="border-t border-border-subtle px-4 py-2">
                  <p className="text-xs text-text-muted mb-2">Recent changes</p>
                  {p.recentChanges.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 py-1.5"
                    >
                      {c.albumImageUrl ? (
                        <img src={c.albumImageUrl} alt="" className="w-6 h-6 rounded" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-surface-2" />
                      )}
                      <span className="text-sm text-text-primary flex-1 truncate">
                        {c.trackName}{" "}
                        <span className="text-text-muted">
                          by {c.artistName}
                        </span>
                      </span>
                      <ChangeBadge type={c.changeType} />
                      <span className="text-xs text-text-muted">
                        {format(new Date(c.detectedAt), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
