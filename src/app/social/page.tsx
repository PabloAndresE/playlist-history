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
        {/* Mosaic skeleton */}
        <div className="flex gap-1.5 mb-6 h-16">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-full aspect-square rounded" />
          ))}
        </div>
        <SkeletonBlock className="h-8 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-64 mb-12" />
        {/* Two-column contributor skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <SkeletonBlock className="h-6 w-24" />
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-4 w-32" />
              <div className="space-y-2 mt-4">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-2.5">
                    <SkeletonBlock className="w-8 h-8 rounded shrink-0" />
                    <SkeletonBlock className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
  // Build a mosaic of album covers from all contributors' top artists
  const allCovers = data.contributors.flatMap((c) =>
    c.topArtists.filter((a) => a.imageUrl).map((a) => a.imageUrl!)
  ).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero — album art collage */}
      <div className="grid grid-cols-6 gap-1 rounded-xl overflow-hidden mb-8 h-24">
        {allCovers.map((url, i) => (
          <img key={i} src={url} alt="" className="w-full h-full object-cover" />
        ))}
        {Array.from({ length: Math.max(0, 6 - allCovers.length) }).map((_, i) => (
          <div key={`ph-${i}`} className="bg-surface-2" />
        ))}
      </div>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">
            {data.contributors.map((c) => dn(c.spotifyId, data.currentUserSpotifyId, names)).join(" & ")}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {totalTracks} tracks · {data.stats.playlistCount} playlist{data.stats.playlistCount !== 1 ? "s" : ""}
          </p>
        </div>
        {data.tasteOverlaps[0] && (
          <div className="text-right">
            <p className="font-[family-name:var(--font-heading)] text-3xl font-black text-accent leading-none">
              {data.tasteOverlaps[0].compatibilityScore}
            </p>
            <p className="text-xs text-text-muted">{compatLabel(data.tasteOverlaps[0].compatibilityScore)}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-1 border border-border-subtle rounded-lg p-1 mb-8">
        {(["overview", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors cursor-pointer capitalize ${
              activeTab === tab
                ? "bg-surface-2 text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Contributors — side by side in light cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.contributors.map((contributor) => {
              const pct = totalTracks > 0 ? Math.round((contributor.trackCount / totalTracks) * 100) : 0;
              const isExpanded = expandedContributor === contributor.spotifyId;
              const name = dn(contributor.spotifyId, data.currentUserSpotifyId, names);
              const topArtist = contributor.topArtists[0];

              return (
                <div key={contributor.spotifyId} className="bg-surface-1 rounded-xl border border-border-subtle overflow-hidden">
                  {/* Featured artist as visual header */}
                  {topArtist?.imageUrl && (
                    <div className="relative h-28 overflow-hidden">
                      <img src={topArtist.imageUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-1 to-transparent" />
                      <div className="absolute bottom-3 left-4">
                        <p className="text-xs text-text-muted">Top artist</p>
                        <p className="text-sm font-semibold text-text-primary">{topArtist.name} · {topArtist.count} tracks</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Name + stats */}
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-text-primary">{name}</h3>
                      <span className="text-sm text-text-muted">{pct}%</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-4">{contributor.trackCount} tracks · {personality(contributor)}</p>

                    {/* Artists #2-3 */}
                    {contributor.topArtists.length > 1 && (
                      <div className="space-y-1.5 mb-4">
                        {contributor.topArtists.slice(1, 3).map((artist) => (
                          <div key={artist.name} className="flex items-center gap-2.5">
                            {artist.imageUrl ? (
                              <img src={artist.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-surface-2" />
                            )}
                            <span className="text-sm text-text-primary flex-1 truncate">{artist.name}</span>
                            <span className="text-xs text-text-muted">{artist.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Genres inline */}
                    {contributor.topGenres?.length > 0 && (
                      <p className="text-xs text-text-muted mb-3">{contributor.topGenres.join(" · ")}</p>
                    )}

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedContributor(isExpanded ? null : contributor.spotifyId)}
                      className="text-sm text-accent hover:text-accent-hover transition-colors cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? "Less" : "More"}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border-subtle space-y-4 animate-in">
                        {contributor.topArtists.length > 3 && (
                          <div className="space-y-1.5">
                            {contributor.topArtists.slice(3).map((artist) => (
                              <div key={artist.name} className="flex items-center gap-2.5">
                                {artist.imageUrl ? (
                                  <img src={artist.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-surface-2" />
                                )}
                                <span className="text-sm text-text-primary flex-1 truncate">{artist.name}</span>
                                <span className="text-xs text-text-muted">{artist.count}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {contributor.decades?.length > 0 && (
                          <div className="flex gap-4">
                            {contributor.decades.slice(0, 4).map((d) => (
                              <div key={d.decade}>
                                <span className="text-sm font-semibold text-text-primary">{d.count}</span>
                                <span className="text-xs text-text-muted ml-1">{d.decade}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {contributor.recentAdds.length > 0 && (
                          <div>
                            <p className="text-xs text-text-muted mb-2">Latest</p>
                            {contributor.recentAdds.map((add, j) => (
                              <div key={j} className="flex items-center gap-2 py-1">
                                {add.albumImageUrl ? (
                                  <img src={add.albumImageUrl} alt="" className="w-7 h-7 rounded" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-surface-2" />
                                )}
                                <span className="text-sm text-text-primary truncate flex-1">{add.trackName}</span>
                                <span className="text-xs text-text-muted">{add.artistName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shared artists — big visual row */}
          {data.tasteOverlaps[0]?.sharedArtists.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Artists both contributed</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {data.tasteOverlaps[0].sharedArtists.map((artist) => (
                  <div key={artist.name} className="shrink-0 w-24">
                    {artist.imageUrl ? (
                      <img src={artist.imageUrl} alt="" className="w-24 h-24 rounded-xl object-cover mb-2" />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-surface-2 mb-2" />
                    )}
                    <p className="text-sm text-text-primary font-medium leading-tight truncate">{artist.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared genres */}
          {data.tasteOverlaps[0]?.sharedGenres.length > 0 && (
            <p className="text-sm text-text-muted">
              Genres in common: {data.tasteOverlaps[0].sharedGenres.join(", ")}
            </p>
          )}

          {/* Influence */}
          {data.tasteOverlaps.map((overlap, i) => {
            const nameA = dn(overlap.userA, data.currentUserSpotifyId, names);
            const nameB = dn(overlap.userB, data.currentUserSpotifyId, names);
            if (overlap.influenceAtoB.length === 0 && overlap.influenceBtoA.length === 0) return null;
            return (
              <div key={i}>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Who put who on</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overlap.influenceAtoB.length > 0 && (
                    <div className="bg-surface-1 rounded-xl border border-border-subtle p-4">
                      <p className="text-sm text-text-secondary mb-3">
                        <span className="font-semibold text-text-primary">{nameA}</span> introduced
                      </p>
                      <div className="flex gap-2.5">
                        {overlap.influenceAtoB.map((a) => (
                          <div key={a.artist} className="shrink-0 w-14 text-center">
                            {a.imageUrl ? (
                              <img src={a.imageUrl} alt={a.artist} className="w-14 h-14 rounded-lg object-cover mb-1" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-surface-2 mb-1" />
                            )}
                            <p className="text-xs text-text-muted truncate">{a.artist}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-text-muted mt-2">then {nameB} added tracks too</p>
                    </div>
                  )}
                  {overlap.influenceBtoA.length > 0 && (
                    <div className="bg-surface-1 rounded-xl border border-border-subtle p-4">
                      <p className="text-sm text-text-secondary mb-3">
                        <span className="font-semibold text-text-primary">{nameB}</span> introduced
                      </p>
                      <div className="flex gap-2.5">
                        {overlap.influenceBtoA.map((a) => (
                          <div key={a.artist} className="shrink-0 w-14 text-center">
                            {a.imageUrl ? (
                              <img src={a.imageUrl} alt={a.artist} className="w-14 h-14 rounded-lg object-cover mb-1" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-surface-2 mb-1" />
                            )}
                            <p className="text-xs text-text-muted truncate">{a.artist}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-text-muted mt-2">then {nameA} added tracks too</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity tab */}
      {activeTab === "activity" && (
        <div>
          {data.activityTimeline.length === 0 ? (
            <div className="py-20">
              <p className="text-text-secondary">Nothing yet.</p>
              <p className="text-sm text-text-muted mt-1">Sync your playlists to start tracking changes.</p>
            </div>
          ) : (
            <div>
              {data.activityTimeline.map((change, i) => (
                <div
                  key={change.id}
                  className="flex items-start gap-3 py-3.5 border-b border-border-subtle last:border-0 animate-in"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  {change.albumImageUrl ? (
                    <img src={change.albumImageUrl} alt="" className="w-10 h-10 rounded mt-0.5" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-surface-2 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug">
                      <span className="font-semibold">
                        {dn(change.changedBySpotifyId ?? "Unknown", data.currentUserSpotifyId, names)}
                      </span>{" "}
                      {change.changeType === "ADDED" ? "added" : "removed"}{" "}
                      <span className="font-medium">{change.trackName}</span>
                      <span className="text-text-muted font-normal"> by {change.artistName}</span>
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {change.playlistName} · {format(new Date(change.detectedAt), "MMM d")}
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
