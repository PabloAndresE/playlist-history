"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";
import { SkeletonList, SkeletonStats, SkeletonBlock } from "@/components/ui/Skeleton";
import Link from "next/link";

interface ContributorStats {
  spotifyId: string;
  trackCount: number;
  topArtists: { name: string; count: number }[];
  recentAdds: { trackName: string; artistName: string; albumImageUrl: string | null; addedAt: string }[];
  playlists: string[];
}

interface TasteOverlap {
  userA: string;
  userB: string;
  sharedArtists: string[];
  overlapPercent: number;
}

interface ActivityItem {
  id: string;
  trackName: string;
  artistName: string;
  albumImageUrl: string | null;
  changeType: "ADDED" | "REMOVED";
  detectedAt: string;
  changedBySpotifyId: string | null;
  playlistName: string;
  playlistId: string;
}

interface DashboardData {
  hasData: boolean;
  currentUserSpotifyId?: string;
  playlists: { id: string; name: string; spotifyPlaylistId: string; coverImageUrl: string | null }[];
  contributors: ContributorStats[];
  tasteOverlaps: TasteOverlap[];
  activityTimeline: ActivityItem[];
  stats: { totalCollaborators: number; totalTracksFromOthers: number; playlistCount: number };
}

const COLORS = [
  "bg-purple", "bg-accent", "bg-amber-500", "bg-emerald-500",
  "bg-rose-500", "bg-sky-500", "bg-orange-500", "bg-indigo-500",
];

function getColor(index: number) {
  return COLORS[index % COLORS.length];
}

function displayName(spotifyId: string, currentUserId?: string) {
  return spotifyId === currentUserId ? "You" : spotifyId;
}

export default function SocialPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");
  const [expandedContributor, setExpandedContributor] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/social/dashboard")
        .then((res) => res.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="space-y-2 mb-8">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonStats />
        <div className="mt-6">
          <SkeletonList rows={4} />
        </div>
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-2">
          Social
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          See who's shaping your collaborative playlists
        </p>
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <svg className="w-12 h-12 mx-auto mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg text-text-secondary font-medium">No collaborative playlists tracked</p>
          <p className="text-sm text-text-muted mt-1 mb-6 max-w-sm mx-auto">
            Track a collaborative playlist from your dashboard to see contributor stats and taste comparisons.
          </p>
          <Link href="/dashboard" className="inline-block bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalTracks = data.contributors.reduce((s, c) => s + c.trackCount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-2">
        Social
      </h1>
      <p className="text-sm text-text-secondary mb-8">
        See who's shaping your collaborative playlists
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{data.stats.playlistCount}</p>
          <p className="text-xs text-text-muted mt-1">Collab playlists</p>
        </div>
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-purple">{data.stats.totalCollaborators}</p>
          <p className="text-xs text-text-muted mt-1">Collaborators</p>
        </div>
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{data.stats.totalTracksFromOthers}</p>
          <p className="text-xs text-text-muted mt-1">Tracks from others</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-1 border border-border-subtle rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors cursor-pointer ${
            activeTab === "overview" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors cursor-pointer ${
            activeTab === "activity" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Activity ({data.activityTimeline.length})
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Contributors — who added what */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Contributors</h3>
            <div className="space-y-2">
              {data.contributors.map((contributor, i) => {
                const isYou = contributor.spotifyId === data.currentUserSpotifyId;
                const pct = totalTracks > 0 ? Math.round((contributor.trackCount / totalTracks) * 100) : 0;
                const isExpanded = expandedContributor === contributor.spotifyId;

                return (
                  <div key={contributor.spotifyId} className="bg-surface-1 rounded-xl border border-border-subtle">
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${getColor(i)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                          {isYou ? "Y" : contributor.spotifyId.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {displayName(contributor.spotifyId, data.currentUserSpotifyId)}
                            </p>
                            {isYou && (
                              <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">you</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            {contributor.trackCount} tracks &middot; {pct}% of total &middot; {contributor.playlists.length} playlist{contributor.playlists.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="mt-3 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getColor(i)} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      {/* Top 5 artists — always visible */}
                      {contributor.topArtists.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-text-secondary mb-1.5">Top artists</p>
                          <div className="flex flex-wrap gap-1.5">
                            {contributor.topArtists.map((artist, rank) => (
                              <span key={artist.name} className="inline-flex items-center gap-1 text-xs bg-surface-2 text-text-primary px-2 py-1 rounded-lg">
                                <span className="text-text-muted font-medium">{rank + 1}.</span> {artist.name} <span className="text-text-muted">({artist.count})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Expandable recent adds */}
                    {contributor.recentAdds.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpandedContributor(isExpanded ? null : contributor.spotifyId)}
                          className="w-full flex items-center justify-center gap-1 py-2 border-t border-border-subtle text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                        >
                          {isExpanded ? "Hide" : "Show"} recent adds
                          <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-1.5 animate-in">
                            {contributor.recentAdds.map((add, j) => (
                              <div key={j} className="flex items-center gap-2">
                                {add.albumImageUrl ? (
                                  <img src={add.albumImageUrl} alt="" className="w-7 h-7 rounded" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-surface-2" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-text-primary truncate">{add.trackName}</p>
                                  <p className="text-xs text-text-muted truncate">{add.artistName}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Taste Comparison */}
          {data.tasteOverlaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Taste comparison</h3>
              <div className="space-y-3">
                {data.tasteOverlaps.map((overlap, i) => (
                  <div key={i} className="bg-surface-1 rounded-xl border border-border-subtle p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-purple">
                          {displayName(overlap.userA, data.currentUserSpotifyId)}
                        </span>
                        <span className="text-text-muted">&</span>
                        <span className="font-medium text-accent">
                          {displayName(overlap.userB, data.currentUserSpotifyId)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-text-primary">{overlap.overlapPercent}% overlap</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple to-accent transition-all"
                        style={{ width: `${overlap.overlapPercent}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {overlap.sharedArtists.map((artist) => (
                        <span key={artist} className="text-xs bg-surface-2 text-text-secondary px-2 py-0.5 rounded-md">
                          {artist}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlists tracked */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Collaborative playlists</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => router.push(`/playlist/${pl.id}`)}
                  className="flex items-center gap-3 p-3 bg-surface-1 rounded-xl border border-border-subtle hover:bg-surface-2 transition-colors text-left cursor-pointer"
                >
                  {pl.coverImageUrl ? (
                    <img src={pl.coverImageUrl} alt="" className="w-10 h-10 rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-2" />
                  )}
                  <p className="text-sm font-medium text-text-primary truncate">{pl.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === "activity" && (
        <div>
          {data.activityTimeline.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-text-secondary">No changes detected yet</p>
              <p className="text-sm text-text-muted mt-1">Sync your collaborative playlists to start tracking activity.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.activityTimeline.map((change, i) => (
                <div
                  key={change.id}
                  className="flex items-center gap-3 p-4 bg-surface-1 rounded-xl border border-border-subtle animate-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {change.albumImageUrl ? (
                    <img src={change.albumImageUrl} alt="" className="w-10 h-10 rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-surface-2" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium text-purple">
                        {displayName(change.changedBySpotifyId ?? "Unknown", data.currentUserSpotifyId)}
                      </span>{" "}
                      {change.changeType === "ADDED" ? "added" : "removed"}{" "}
                      <span className="font-medium">{change.trackName}</span>
                      {" by "}
                      {change.artistName}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      in{" "}
                      <button
                        className="hover:text-text-secondary transition-colors underline underline-offset-2 cursor-pointer"
                        onClick={() => router.push(`/playlist/${change.playlistId}`)}
                      >
                        {change.playlistName}
                      </button>{" "}
                      &middot;{" "}
                      {format(new Date(change.detectedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <ChangeBadge type={change.changeType} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
