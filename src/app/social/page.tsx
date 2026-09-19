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
  topArtists: { name: string; count: number; imageUrl: string | null }[];
  topGenres: string[];
  recentAdds: { trackName: string; artistName: string; albumImageUrl: string | null; addedAt: string }[];
  playlists: string[];
}

interface TasteOverlap {
  userA: string;
  userB: string;
  sharedArtists: string[];
  sharedGenres: string[];
  onlyGenresA: string[];
  onlyGenresB: string[];
  compatibilityScore: number;
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

const GENRE_COLORS = [
  "bg-purple/15 text-purple", "bg-accent/15 text-accent",
  "bg-amber-500/15 text-amber-700", "bg-emerald-500/15 text-emerald-700",
  "bg-rose-500/15 text-rose-700",
];

function getColor(index: number) {
  return COLORS[index % COLORS.length];
}

function getGenreColor(index: number) {
  return GENRE_COLORS[index % GENRE_COLORS.length];
}

function displayName(spotifyId: string, currentUserId?: string) {
  return spotifyId === currentUserId ? "You" : spotifyId;
}

function compatLabel(score: number): { text: string; color: string } {
  if (score >= 70) return { text: "Soulmates", color: "text-emerald-600" };
  if (score >= 50) return { text: "Great match", color: "text-accent" };
  if (score >= 30) return { text: "Some overlap", color: "text-amber-600" };
  return { text: "Different vibes", color: "text-rose-500" };
}

function GenreVenn({ overlap, currentUserId }: { overlap: TasteOverlap; currentUserId?: string }) {
  const nameA = displayName(overlap.userA, currentUserId);
  const nameB = displayName(overlap.userB, currentUserId);
  const onlyA = overlap.onlyGenresA ?? [];
  const onlyB = overlap.onlyGenresB ?? [];
  const shared = overlap.sharedGenres;

  return (
    <div className="bg-surface-1 rounded-xl border border-border-subtle p-5">
      <h4 className="text-xs font-semibold text-text-secondary mb-4 text-center">
        {nameA} vs {nameB} — Genre Venn
      </h4>
      <svg viewBox="0 0 400 220" className="w-full max-w-md mx-auto" aria-label={`Genre overlap between ${nameA} and ${nameB}`}>
        {/* Left circle */}
        <circle cx="150" cy="110" r="95" fill="rgba(139, 92, 246, 0.12)" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5" />
        {/* Right circle */}
        <circle cx="250" cy="110" r="95" fill="rgba(34, 197, 94, 0.12)" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" />

        {/* Left label */}
        <text x="95" y="28" textAnchor="middle" className="fill-purple text-[11px] font-semibold">{nameA}</text>

        {/* Right label */}
        <text x="305" y="28" textAnchor="middle" className="fill-accent text-[11px] font-semibold">{nameB}</text>

        {/* Only A genres */}
        {onlyA.slice(0, 4).map((g, i) => (
          <text key={`a-${g}`} x="100" y={65 + i * 18} textAnchor="middle" className="fill-purple text-[10px]">{g}</text>
        ))}

        {/* Shared genres */}
        {shared.slice(0, 4).map((g, i) => (
          <text key={`s-${g}`} x="200" y={75 + i * 18} textAnchor="middle" className="fill-text-primary text-[10px] font-medium">{g}</text>
        ))}

        {/* Only B genres */}
        {onlyB.slice(0, 4).map((g, i) => (
          <text key={`b-${g}`} x="300" y={65 + i * 18} textAnchor="middle" className="fill-accent text-[10px]">{g}</text>
        ))}

        {/* Center count if many shared */}
        {shared.length > 4 && (
          <text x="200" y={75 + 4 * 18} textAnchor="middle" className="fill-text-muted text-[9px]">+{shared.length - 4} more</text>
        )}
      </svg>
    </div>
  );
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
          {/* Contributors — side by side */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Contributors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.contributors.map((contributor, i) => {
                const isYou = contributor.spotifyId === data.currentUserSpotifyId;
                const pct = totalTracks > 0 ? Math.round((contributor.trackCount / totalTracks) * 100) : 0;
                const isExpanded = expandedContributor === contributor.spotifyId;

                return (
                  <div key={contributor.spotifyId} className="bg-surface-1 rounded-xl border border-border-subtle">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
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
                            {contributor.trackCount} tracks &middot; {pct}% of total
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mb-4">
                        <div className={`h-full rounded-full ${getColor(i)} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      {/* Top 5 artists — visual list with images */}
                      {contributor.topArtists.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-text-secondary mb-2">Top 5 artists</p>
                          <div className="space-y-1.5">
                            {contributor.topArtists.map((artist, rank) => (
                              <div key={artist.name} className="flex items-center gap-2.5">
                                <span className={`w-5 text-center text-xs font-bold ${rank === 0 ? "text-amber-500" : rank === 1 ? "text-text-secondary" : rank === 2 ? "text-amber-700" : "text-text-muted"}`}>
                                  {rank === 0 ? "#1" : rank + 1}
                                </span>
                                {artist.imageUrl ? (
                                  <img src={artist.imageUrl} alt="" className={`${rank === 0 ? "w-10 h-10" : "w-8 h-8"} rounded-lg object-cover`} />
                                ) : (
                                  <div className={`${rank === 0 ? "w-10 h-10" : "w-8 h-8"} rounded-lg bg-surface-2 flex items-center justify-center`}>
                                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`${rank === 0 ? "text-sm font-semibold" : "text-xs font-medium"} text-text-primary truncate`}>{artist.name}</p>
                                </div>
                                <span className={`${rank === 0 ? "text-sm font-bold" : "text-xs"} text-text-muted shrink-0`}>
                                  {artist.count} {artist.count === 1 ? "track" : "tracks"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Genres */}
                      {contributor.topGenres?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-text-secondary mb-1.5">Genres</p>
                          <div className="flex flex-wrap gap-1.5">
                            {contributor.topGenres.map((genre, gi) => (
                              <span key={genre} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getGenreColor(gi)}`}>
                                {genre}
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

          {/* Compatibility */}
          {data.tasteOverlaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Compatibility</h3>
              <div className="space-y-3">
                {data.tasteOverlaps.map((overlap, i) => {
                  const label = compatLabel(overlap.compatibilityScore);
                  return (
                    <div key={i} className="bg-surface-1 rounded-xl border border-border-subtle p-5">
                      {/* Score header */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-purple">
                            {displayName(overlap.userA, data.currentUserSpotifyId)}
                          </span>
                          <span className="text-text-muted">&times;</span>
                          <span className="font-medium text-accent">
                            {displayName(overlap.userB, data.currentUserSpotifyId)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{overlap.compatibilityScore}</span>
                          <span className="text-xs text-text-muted ml-0.5">/100</span>
                        </div>
                      </div>
                      <p className={`text-xs font-semibold ${label.color} mb-3`}>{label.text}</p>
                      {/* Progress */}
                      <div className="h-2.5 bg-surface-3 rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple via-accent to-emerald-500 transition-all"
                          style={{ width: `${overlap.compatibilityScore}%` }}
                        />
                      </div>
                      {/* Shared artists */}
                      {overlap.sharedArtists.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-text-muted mb-1.5">Artists in common</p>
                          <div className="flex flex-wrap gap-1.5">
                            {overlap.sharedArtists.map((artist) => (
                              <span key={artist} className="text-xs bg-purple/10 text-purple px-2 py-0.5 rounded-full font-medium">
                                {artist}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Shared genres */}
                      {overlap.sharedGenres.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-1.5">Genres in common</p>
                          <div className="flex flex-wrap gap-1.5">
                            {overlap.sharedGenres.map((genre) => (
                              <span key={genre} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Genre Venn diagrams */}
          {data.tasteOverlaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Genre overlap</h3>
              <div className="space-y-3">
                {data.tasteOverlaps.map((overlap, i) => (
                  <GenreVenn key={i} overlap={overlap} currentUserId={data.currentUserSpotifyId} />
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
