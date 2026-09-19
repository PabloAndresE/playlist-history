"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";
import { SkeletonList, SkeletonBlock } from "@/components/ui/Skeleton";
import Link from "next/link";

interface ContributorStats {
  spotifyId: string;
  trackCount: number;
  topArtists: { name: string; count: number; imageUrl: string | null }[];
  topGenres: string[];
  recentAdds: { trackName: string; artistName: string; albumImageUrl: string | null; addedAt: string }[];
  playlists: string[];
  superfanArtists: number;
  explorerArtists: number;
  mostRepeatedArtist: { name: string; count: number } | null;
  decades: { decade: string; count: number }[];
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
  influenceAtoB: { artist: string; imageUrl: string | null }[];
  influenceBtoA: { artist: string; imageUrl: string | null }[];
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

function dn(spotifyId: string, currentUserId?: string, names?: Record<string, string>) {
  if (spotifyId === currentUserId) return "You";
  return names?.[spotifyId] ?? spotifyId;
}

function personality(c: ContributorStats): string {
  if (c.mostRepeatedArtist && c.mostRepeatedArtist.count >= 5)
    return `Superfan of ${c.mostRepeatedArtist.name}`;
  if (c.explorerArtists > c.superfanArtists)
    return `${c.explorerArtists} different artists — explorer`;
  if (c.decades?.[0])
    return `Mostly ${c.decades[0].decade} music`;
  return `${c.trackCount} tracks contributed`;
}

function compatLabel(score: number): string {
  if (score >= 70) return "Soulmates";
  if (score >= 50) return "Great match";
  if (score >= 30) return "Some overlap";
  return "Different vibes";
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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <SkeletonBlock className="h-8 w-32 mb-2" />
        <SkeletonBlock className="h-4 w-64 mb-10" />
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-1">Social</h1>
        <p className="text-sm text-text-secondary mb-10">Your collaborative playlists, together</p>
        <div className="py-20 text-center">
          <p className="text-text-secondary font-medium">No collaborative playlists tracked yet</p>
          <p className="text-sm text-text-muted mt-1 mb-6 max-w-xs mx-auto">
            Track a collaborative playlist from your dashboard to see who's contributing what.
          </p>
          <Link href="/dashboard" className="text-sm text-accent font-semibold hover:text-accent-hover transition-colors">
            Go to Dashboard &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const names = data.displayNames;
  const totalTracks = data.contributors.reduce((s, c) => s + c.trackCount, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-1">Social</h1>
      <p className="text-sm text-text-secondary mb-10">Your collaborative playlists, together</p>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mb-8">
        <button
          onClick={() => setActiveTab("overview")}
          className={`text-sm font-medium pb-2.5 transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "text-text-primary border-b-2 border-text-primary -mb-px"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`text-sm font-medium pb-2.5 transition-colors cursor-pointer ${
            activeTab === "activity"
              ? "text-text-primary border-b-2 border-text-primary -mb-px"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Activity
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-12">
          {/* Contributors — side by side */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.contributors.map((contributor, i) => {
                const isYou = contributor.spotifyId === data.currentUserSpotifyId;
                const pct = totalTracks > 0 ? Math.round((contributor.trackCount / totalTracks) * 100) : 0;
                const isExpanded = expandedContributor === contributor.spotifyId;

                return (
                  <div key={contributor.spotifyId}>
                    {/* Card header — always visible */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-text-primary">
                          {dn(contributor.spotifyId, data.currentUserSpotifyId, names)}
                        </h3>
                        <span className="text-sm text-text-muted">{contributor.trackCount} tracks &middot; {pct}%</span>
                      </div>
                      <p className="text-xs text-text-secondary">{personality(contributor)}</p>
                    </div>

                    {/* Top 3 artists */}
                    {contributor.topArtists.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {contributor.topArtists.slice(0, 3).map((artist) => (
                          <div key={artist.name} className="flex items-center gap-2.5">
                            {artist.imageUrl ? (
                              <img src={artist.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-surface-2" />
                            )}
                            <span className="text-sm text-text-primary truncate flex-1">{artist.name}</span>
                            <span className="text-xs text-text-muted">{artist.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Genres as inline text */}
                    {contributor.topGenres?.length > 0 && (
                      <p className="text-xs text-text-muted mb-3">
                        {contributor.topGenres.join(" · ")}
                      </p>
                    )}

                    {/* Expand for more */}
                    <button
                      onClick={() => setExpandedContributor(isExpanded ? null : contributor.spotifyId)}
                      className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      {isExpanded ? "Less" : "More details"}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-4 animate-in">
                        {/* Remaining artists */}
                        {contributor.topArtists.length > 3 && (
                          <div className="space-y-1">
                            {contributor.topArtists.slice(3).map((artist) => (
                              <div key={artist.name} className="flex items-center gap-2.5">
                                {artist.imageUrl ? (
                                  <img src={artist.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-surface-2" />
                                )}
                                <span className="text-sm text-text-primary truncate flex-1">{artist.name}</span>
                                <span className="text-xs text-text-muted">{artist.count}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Decades */}
                        {contributor.decades?.length > 0 && (
                          <div className="flex gap-3">
                            {contributor.decades.slice(0, 4).map((d) => (
                              <div key={d.decade} className="text-center">
                                <p className="text-sm font-semibold text-text-primary">{d.count}</p>
                                <p className="text-xs text-text-muted">{d.decade}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Recent adds */}
                        {contributor.recentAdds.length > 0 && (
                          <div>
                            <p className="text-xs text-text-muted mb-2">Recently added</p>
                            <div className="space-y-1.5">
                              {contributor.recentAdds.map((add, j) => (
                                <div key={j} className="flex items-center gap-2">
                                  {add.albumImageUrl ? (
                                    <img src={add.albumImageUrl} alt="" className="w-7 h-7 rounded" />
                                  ) : (
                                    <div className="w-7 h-7 rounded bg-surface-2" />
                                  )}
                                  <span className="text-xs text-text-primary truncate flex-1">{add.trackName}</span>
                                  <span className="text-xs text-text-muted truncate">{add.artistName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Compatibility */}
          {data.tasteOverlaps.map((overlap, i) => {
            const nameA = dn(overlap.userA, data.currentUserSpotifyId, names);
            const nameB = dn(overlap.userB, data.currentUserSpotifyId, names);
            return (
              <section key={i} className="border-t border-border pt-10">
                {/* Score — simple inline */}
                <div className="flex items-baseline gap-3 mb-1">
                  <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-text-primary">
                    {nameA} & {nameB}
                  </h2>
                  <span className="text-sm text-accent font-semibold">{overlap.compatibilityScore}/100</span>
                </div>
                <p className="text-sm text-text-secondary mb-8">{compatLabel(overlap.compatibilityScore)}</p>

                {/* Shared artists — the hero */}
                {overlap.sharedArtists.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs text-text-muted mb-3">Artists both contributed</p>
                    <div className="flex gap-4">
                      {overlap.sharedArtists.map((artist) => (
                        <div key={artist.name} className="text-center w-16 shrink-0">
                          {artist.imageUrl ? (
                            <img src={artist.imageUrl} alt="" className="w-14 h-14 rounded-full object-cover mx-auto mb-1.5" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-surface-2 mx-auto mb-1.5" />
                          )}
                          <p className="text-xs text-text-primary leading-tight truncate">{artist.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared genres — inline text */}
                {overlap.sharedGenres.length > 0 && (
                  <p className="text-xs text-text-muted mb-8">
                    Genres in common: {overlap.sharedGenres.join(", ")}
                  </p>
                )}

                {/* Influence — simple sentences */}
                {(overlap.influenceAtoB.length > 0 || overlap.influenceBtoA.length > 0) && (
                  <div className="space-y-4 mb-4">
                    {overlap.influenceAtoB.length > 0 && (
                      <div>
                        <p className="text-xs text-text-muted mb-2">
                          {nameA} introduced &rarr; {nameB} followed
                        </p>
                        <div className="flex gap-3">
                          {overlap.influenceAtoB.map((a) => (
                            <div key={a.artist} className="text-center w-14 shrink-0">
                              {a.imageUrl ? (
                                <img src={a.imageUrl} alt="" className="w-11 h-11 rounded-full object-cover mx-auto mb-1" />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-surface-2 mx-auto mb-1" />
                              )}
                              <p className="text-[11px] text-text-primary truncate">{a.artist}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {overlap.influenceBtoA.length > 0 && (
                      <div>
                        <p className="text-xs text-text-muted mb-2">
                          {nameB} introduced &rarr; {nameA} followed
                        </p>
                        <div className="flex gap-3">
                          {overlap.influenceBtoA.map((a) => (
                            <div key={a.artist} className="text-center w-14 shrink-0">
                              {a.imageUrl ? (
                                <img src={a.imageUrl} alt="" className="w-11 h-11 rounded-full object-cover mx-auto mb-1" />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-surface-2 mx-auto mb-1" />
                              )}
                              <p className="text-[11px] text-text-primary truncate">{a.artist}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Activity tab */}
      {activeTab === "activity" && (
        <div>
          {data.activityTimeline.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-text-secondary">No changes detected yet</p>
              <p className="text-sm text-text-muted mt-1">Sync your playlists to start tracking activity.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.activityTimeline.map((change, i) => (
                <div
                  key={change.id}
                  className="flex items-center gap-3 py-3 animate-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {change.albumImageUrl ? (
                    <img src={change.albumImageUrl} alt="" className="w-9 h-9 rounded" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-surface-2" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">
                        {dn(change.changedBySpotifyId ?? "Unknown", data.currentUserSpotifyId, names)}
                      </span>{" "}
                      {change.changeType === "ADDED" ? "added" : "removed"}{" "}
                      <span className="font-medium">{change.trackName}</span>
                      <span className="text-text-muted"> by {change.artistName}</span>
                    </p>
                    <p className="text-xs text-text-muted">
                      <button
                        className="hover:text-text-secondary transition-colors cursor-pointer"
                        onClick={() => router.push(`/playlist/${change.playlistId}`)}
                      >
                        {change.playlistName}
                      </button>
                      {" · "}
                      {format(new Date(change.detectedAt), "MMM d")}
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
