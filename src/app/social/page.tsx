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
  // Build a mosaic of album covers from all contributors' top artists
  const allCovers = data.contributors.flatMap((c) =>
    c.topArtists.filter((a) => a.imageUrl).map((a) => a.imageUrl!)
  ).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Editorial header with album art mosaic */}
      <div className="mb-12">
        <div className="flex gap-1.5 mb-6 overflow-hidden rounded-lg h-16">
          {allCovers.map((url, i) => (
            <img key={i} src={url} alt="" className="h-full aspect-square object-cover first:rounded-l-lg last:rounded-r-lg" />
          ))}
          {allCovers.length < 6 && <div className="h-full flex-1 bg-surface-2 last:rounded-r-lg" />}
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-text-primary tracking-tight">
          {data.contributors.map((c) => dn(c.spotifyId, data.currentUserSpotifyId, names)).join(" & ")}
        </h1>
        <p className="text-text-secondary mt-1">
          {totalTracks} tracks across {data.stats.playlistCount} playlist{data.stats.playlistCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabs — underline */}
      <div className="flex gap-6 border-b border-border-subtle mb-10">
        {(["overview", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm pb-3 transition-colors cursor-pointer capitalize ${
              activeTab === tab
                ? "text-text-primary font-medium border-b-2 border-accent -mb-px"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div>
          {/* Contributors — asymmetric side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10 mb-16">
            {data.contributors.map((contributor) => {
              const pct = totalTracks > 0 ? Math.round((contributor.trackCount / totalTracks) * 100) : 0;
              const isExpanded = expandedContributor === contributor.spotifyId;
              const name = dn(contributor.spotifyId, data.currentUserSpotifyId, names);

              return (
                <div key={contributor.spotifyId}>
                  {/* Name as editorial heading */}
                  <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-text-primary mb-0.5">{name}</h2>
                  <p className="text-sm text-text-muted mb-1">{contributor.trackCount} tracks · {pct}%</p>
                  <p className="text-sm text-text-secondary italic mb-5">{personality(contributor)}</p>

                  {/* Top artists — stacked album art */}
                  {contributor.topArtists.length > 0 && (
                    <div className="mb-4">
                      {/* #1 artist — featured large */}
                      {contributor.topArtists[0] && (
                        <div className="flex items-center gap-3 mb-3">
                          {contributor.topArtists[0].imageUrl ? (
                            <img src={contributor.topArtists[0].imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-surface-2" />
                          )}
                          <div>
                            <p className="text-base font-semibold text-text-primary">{contributor.topArtists[0].name}</p>
                            <p className="text-xs text-text-muted">{contributor.topArtists[0].count} tracks</p>
                          </div>
                        </div>
                      )}
                      {/* #2-3 artists — compact */}
                      {contributor.topArtists.slice(1, 3).map((artist) => (
                        <div key={artist.name} className="flex items-center gap-2.5 py-1.5">
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

                  {/* Genres — quiet */}
                  {contributor.topGenres?.length > 0 && (
                    <p className="text-xs text-text-muted leading-relaxed mb-4">
                      {contributor.topGenres.join(", ")}
                    </p>
                  )}

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedContributor(isExpanded ? null : contributor.spotifyId)}
                    className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
                  >
                    {isExpanded ? "Show less" : "See all artists & recent adds"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border-subtle space-y-5 animate-in">
                      {contributor.topArtists.length > 3 && (
                        <div>
                          {contributor.topArtists.slice(3).map((artist) => (
                            <div key={artist.name} className="flex items-center gap-2.5 py-1.5">
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
                        <p className="text-xs text-text-muted">
                          Eras: {contributor.decades.slice(0, 4).map((d) => `${d.decade} (${d.count})`).join(", ")}
                        </p>
                      )}

                      {contributor.recentAdds.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-2">Latest additions</p>
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
              );
            })}
          </div>

          {/* Compatibility — editorial section */}
          {data.tasteOverlaps.map((overlap, i) => {
            const nameA = dn(overlap.userA, data.currentUserSpotifyId, names);
            const nameB = dn(overlap.userB, data.currentUserSpotifyId, names);
            return (
              <section key={i} className="pt-10 border-t border-border-subtle">
                {/* Score — editorial treatment */}
                <div className="mb-10">
                  <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Compatibility</p>
                  <div className="flex items-end gap-3">
                    <span className="font-[family-name:var(--font-heading)] text-5xl font-black text-text-primary leading-none">
                      {overlap.compatibilityScore}
                    </span>
                    <span className="text-sm text-text-muted mb-1">/100 — {compatLabel(overlap.compatibilityScore)}</span>
                  </div>
                </div>

                {/* Shared artists — visual hero, larger art */}
                {overlap.sharedArtists.length > 0 && (
                  <div className="mb-10">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-4">Both contributed</p>
                    <div className="flex gap-5 overflow-x-auto pb-2">
                      {overlap.sharedArtists.map((artist) => (
                        <div key={artist.name} className="shrink-0 w-20">
                          {artist.imageUrl ? (
                            <img src={artist.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover mb-2" />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-surface-2 mb-2" />
                          )}
                          <p className="text-sm text-text-primary font-medium leading-tight">{artist.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared genres */}
                {overlap.sharedGenres.length > 0 && (
                  <p className="text-sm text-text-muted mb-10">
                    Common ground: {overlap.sharedGenres.join(", ")}
                  </p>
                )}

                {/* Influence — narrative */}
                {(overlap.influenceAtoB.length > 0 || overlap.influenceBtoA.length > 0) && (
                  <div className="mb-6">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-5">Who influenced who</p>
                    <div className="space-y-6">
                      {overlap.influenceAtoB.length > 0 && (
                        <div>
                          <p className="text-sm text-text-secondary mb-3">
                            <span className="font-semibold text-text-primary">{nameA}</span> put them on first, then <span className="font-semibold text-text-primary">{nameB}</span> added tracks too
                          </p>
                          <div className="flex gap-3">
                            {overlap.influenceAtoB.map((a) => (
                              <div key={a.artist} className="shrink-0">
                                {a.imageUrl ? (
                                  <img src={a.imageUrl} alt={a.artist} title={a.artist} className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-surface-2" title={a.artist} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {overlap.influenceBtoA.length > 0 && (
                        <div>
                          <p className="text-sm text-text-secondary mb-3">
                            <span className="font-semibold text-text-primary">{nameB}</span> put them on first, then <span className="font-semibold text-text-primary">{nameA}</span> added tracks too
                          </p>
                          <div className="flex gap-3">
                            {overlap.influenceBtoA.map((a) => (
                              <div key={a.artist} className="shrink-0">
                                {a.imageUrl ? (
                                  <img src={a.imageUrl} alt={a.artist} title={a.artist} className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-surface-2" title={a.artist} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
