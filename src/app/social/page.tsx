"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";
import { SkeletonList, SkeletonStats, SkeletonBlock } from "@/components/ui/Skeleton";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend,
} from "recharts";

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
  sharedArtists: { name: string; imageUrl: string | null }[];
  sharedGenres: string[];
  onlyGenresA: string[];
  onlyGenresB: string[];
  radarGenres: { genre: string; userA: number; userB: number }[];
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
  displayNames?: Record<string, string>;
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

function displayName(spotifyId: string, currentUserId?: string, names?: Record<string, string>) {
  if (spotifyId === currentUserId) return "You";
  return names?.[spotifyId] ?? spotifyId;
}

function displayInitial(spotifyId: string, currentUserId?: string, names?: Record<string, string>) {
  if (spotifyId === currentUserId) return "Y";
  const name = names?.[spotifyId];
  return name ? name.charAt(0).toUpperCase() : spotifyId.charAt(0).toUpperCase();
}

function compatLabel(score: number): { text: string; emoji: string; gradient: string } {
  if (score >= 70) return { text: "Soulmates", emoji: "fire", gradient: "from-emerald-400 to-cyan-400" };
  if (score >= 50) return { text: "Great match", emoji: "sparkles", gradient: "from-purple to-accent" };
  if (score >= 30) return { text: "Some overlap", emoji: "handshake", gradient: "from-amber-400 to-orange-400" };
  return { text: "Different vibes", emoji: "seedling", gradient: "from-rose-400 to-pink-400" };
}

function GenreRadar({ overlap, currentUserId, names }: { overlap: TasteOverlap; currentUserId?: string; names?: Record<string, string> }) {
  const nameA = displayName(overlap.userA, currentUserId, names);
  const nameB = displayName(overlap.userB, currentUserId, names);
  const data = overlap.radarGenres ?? [];

  if (data.length < 3) return null;

  return (
    <div className="bg-surface-1 border-t border-border-subtle px-4 py-4">
      <p className="text-xs font-semibold text-text-secondary mb-2 text-center">Genre profile</p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--color-border-subtle)" />
          <PolarAngleAxis
            dataKey="genre"
            tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
          />
          <Radar
            name={nameA}
            dataKey="userA"
            stroke="rgb(139, 92, 246)"
            fill="rgb(139, 92, 246)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            name={nameB}
            dataKey="userB"
            stroke="rgb(34, 197, 94)"
            fill="rgb(34, 197, 94)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
          />
        </RadarChart>
      </ResponsiveContainer>
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
                          {displayInitial(contributor.spotifyId, data.currentUserSpotifyId, data.displayNames)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {displayName(contributor.spotifyId, data.currentUserSpotifyId, data.displayNames)}
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

          {/* Compatibility + Venn per pair */}
          {data.tasteOverlaps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Compatibility</h3>
              <div className="space-y-4">
                {data.tasteOverlaps.map((overlap, i) => {
                  const label = compatLabel(overlap.compatibilityScore);
                  const nameA = displayName(overlap.userA, data.currentUserSpotifyId, data.displayNames);
                  const nameB = displayName(overlap.userB, data.currentUserSpotifyId, data.displayNames);
                  return (
                    <div key={i} className="rounded-2xl border border-border-subtle overflow-hidden">
                      {/* Blend-style header */}
                      <div className={`bg-gradient-to-r ${label.gradient} p-5 text-white`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white/70 text-xs font-medium mb-0.5">{nameA} & {nameB}</p>
                            <p className="text-lg font-bold">{label.text}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-[family-name:var(--font-heading)] text-4xl font-black leading-none">{overlap.compatibilityScore}</p>
                            <p className="text-white/60 text-xs mt-0.5">out of 100</p>
                          </div>
                        </div>
                        {/* Score bar */}
                        <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${overlap.compatibilityScore}%` }} />
                        </div>
                      </div>

                      {/* Shared content */}
                      <div className="bg-surface-1 p-4 space-y-4">
                        {/* Shared artists with images */}
                        {overlap.sharedArtists.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-text-secondary mb-3">Artists you both listen to</p>
                            <div className="flex gap-3 overflow-x-auto pb-1">
                              {overlap.sharedArtists.map((artist) => (
                                <div key={artist.name} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                                  {artist.imageUrl ? (
                                    <img src={artist.imageUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-purple/20" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center ring-2 ring-purple/20">
                                      <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  <p className="text-[10px] text-text-primary text-center font-medium leading-tight truncate w-full">{artist.name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Shared genres */}
                        {overlap.sharedGenres.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-text-secondary mb-1.5">Genres you share</p>
                            <div className="flex flex-wrap gap-1.5">
                              {overlap.sharedGenres.map((genre) => (
                                <span key={genre} className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                                  {genre}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Radar chart */}
                      <GenreRadar overlap={overlap} currentUserId={data.currentUserSpotifyId} names={data.displayNames} />
                    </div>
                  );
                })}
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
                        {displayName(change.changedBySpotifyId ?? "Unknown", data.currentUserSpotifyId, data.displayNames)}
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
