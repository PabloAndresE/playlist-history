"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";

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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Explore Playlists
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Public playlists being tracked by the community. See how they evolve
        over time.
      </p>

      {playlists.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No public playlists yet</p>
          <p className="text-sm mt-1">
            Be the first to track a public playlist!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {playlists.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                {p.coverImageUrl ? (
                  <img
                    src={p.coverImageUrl}
                    alt=""
                    className="w-14 h-14 rounded-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">
                    by {p.ownerDisplayName} &middot; {p.trackCount} tracks
                  </p>
                </div>
              </div>
              {p.recentChanges.length > 0 && (
                <div className="border-t border-gray-50 px-4 py-2">
                  <p className="text-xs text-gray-400 mb-2">Recent changes</p>
                  {p.recentChanges.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 py-1.5"
                    >
                      {c.albumImageUrl ? (
                        <img
                          src={c.albumImageUrl}
                          alt=""
                          className="w-6 h-6 rounded"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-100" />
                      )}
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        {c.trackName}{" "}
                        <span className="text-gray-400">
                          by {c.artistName}
                        </span>
                      </span>
                      <ChangeBadge type={c.changeType} />
                      <span className="text-xs text-gray-300">
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
