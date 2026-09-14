"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { SkeletonChart, SkeletonStats } from "@/components/ui/Skeleton";

interface TrackWithPop {
  name: string;
  artist: string;
  listeners: number;
  imageUrl: string | null;
  spotifyId: string;
}

interface Insights {
  duration: {
    total: string;
    totalMs: number;
    average: string;
    shortest: { name: string; artist: string; duration: string; imageUrl: string | null } | null;
    longest: { name: string; artist: string; duration: string; imageUrl: string | null } | null;
  };
  decades: { decade: string; count: number }[];
  explicit: { count: number; percentage: number };
  genreDistribution: { genre: string; count: number }[];
  popularity: {
    average: number;
    buckets: { label: string; count: number }[];
    hipsterScore: number;
  } | null;
  hiddenGems: TrackWithPop[];
  biggestHits: TrackWithPop[];
  artistDiversity: {
    totalArtists: number;
    totalAlbums: number;
    topArtistShare: number;
    diversityScore: number;
    distribution: { name: string; count: number; percentage: number }[];
  };
  freshness: {
    avgAgeYears: number | null;
    newestYear: number | null;
    oldestYear: number | null;
  };
  totalTracks: number;
}

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function HipsterMeter({ score }: { score: number }) {
  const label =
    score >= 80 ? "Deep underground" :
    score >= 60 ? "Pretty obscure" :
    score >= 40 ? "Balanced mix" :
    score >= 20 ? "Mostly mainstream" :
    "Full mainstream";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">Mainstream</span>
        <span className="text-xs text-text-muted">Underground</span>
      </div>
      <div className="h-3 bg-surface-3 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-purple transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-center text-sm font-medium text-text-secondary mt-2">{label}</p>
    </div>
  );
}

// Colorblind-safe palette (avoids red-green confusion)
const COLORS = [
  "#1DB954", "#818cf8", "#f59e0b", "#06b6d4", "#f472b6",
  "#a78bfa", "#34d399", "#fb923c", "#38bdf8", "#e879f9",
  "#2dd4bf", "#fbbf24",
];

const chartTooltipStyle = {
  borderRadius: "8px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-surface-1)",
  color: "var(--color-text-primary)",
  fontSize: "13px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch(`/api/playlists/${id}/insights`);
      if (res.ok) {
        setInsights(await res.json());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchInsights();
  }, [status, fetchInsights]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="skeleton h-5 w-5 rounded" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-44" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <SkeletonStats />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-lg text-text-secondary">Could not load analytics</p>
        <p className="text-sm text-text-muted mt-1 mb-4">Try syncing the playlist first to generate a snapshot.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setError(false); setLoading(true); fetchInsights(); }}
            className="bg-accent text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
          >
            Retry
          </button>
          <Link href={`/playlist/${id}`} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Back to playlist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/playlist/${id}`} className="text-text-muted hover:text-text-secondary transition-colors" aria-label="Back to playlist">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">Playlist Analytics</h1>
          <p className="text-sm text-text-secondary">{insights.totalTracks} tracks analyzed</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{insights.duration.total}</p>
          <p className="text-xs text-text-muted mt-1">Total duration</p>
        </div>
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{insights.artistDiversity.totalArtists}</p>
          <p className="text-xs text-text-muted mt-1">Artists</p>
        </div>
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">{insights.artistDiversity.totalAlbums}</p>
          <p className="text-xs text-text-muted mt-1">Albums</p>
        </div>
        <div className="bg-surface-1 p-4 rounded-xl border border-border-subtle text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">
            {insights.freshness.avgAgeYears !== null ? `${insights.freshness.avgAgeYears}y` : "--"}
          </p>
          <p className="text-xs text-text-muted mt-1">Avg song age</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Genres */}
        {insights.genreDistribution.length > 0 && (
          <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary mb-1">Genres</h2>
            <p className="text-xs text-text-muted mb-4">What your playlist sounds like</p>
            <div className="flex gap-4">
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.genreDistribution.slice(0, 6)}
                      dataKey="count"
                      nameKey="genre"
                      cx="50%"
                      cy="50%"
                      outerRadius={52}
                      innerRadius={26}
                      strokeWidth={0}
                    >
                      {insights.genreDistribution.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {insights.genreDistribution.slice(0, 8).map((g, i) => (
                  <div key={g.genre} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="text-xs text-text-secondary truncate flex-1">{g.genre}</span>
                    <span className="text-xs text-text-muted tabular-nums">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Artist Diversity */}
        <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary mb-1">Artist Diversity</h2>
          <p className="text-xs text-text-muted mb-4">How varied is your playlist?</p>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-[3px] border-accent">
              <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-text-primary">
                {insights.artistDiversity.diversityScore}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Top 3 artists: {insights.artistDiversity.topArtistShare}% of tracks
            </p>
          </div>
          <div className="space-y-2">
            {insights.artistDiversity.distribution.slice(0, 6).map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <span className="text-xs text-text-secondary truncate flex-1">{a.name}</span>
                <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(a.percentage * 3, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted w-14 text-right tabular-nums">
                  {a.count} ({a.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Decades */}
        {insights.decades.length > 0 && (
          <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary mb-1">Decades</h2>
            <p className="text-xs text-text-muted mb-4">
              {insights.freshness.oldestYear && insights.freshness.newestYear
                ? `Spanning ${insights.freshness.oldestYear} to ${insights.freshness.newestYear}`
                : "When your tracks were released"}
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={insights.decades}>
                <XAxis dataKey="decade" tick={{ fontSize: 11, fill: "#9a9488" }} stroke="#e8e4dd" />
                <YAxis tick={{ fontSize: 11, fill: "#9a9488" }} stroke="#e8e4dd" />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" fill="#1DB954" radius={[4, 4, 0, 0]} name="Tracks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Duration & Stats */}
        <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary mb-1">Duration & Stats</h2>
          <p className="text-xs text-text-muted mb-4">Fun facts about your playlist</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <span className="text-sm text-text-secondary">Average track length</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums">{insights.duration.average}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <span className="text-sm text-text-secondary">Explicit tracks</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums">
                {insights.explicit.count} ({insights.explicit.percentage}%)
              </span>
            </div>
            {insights.duration.shortest && (
              <div className="p-3 bg-surface-2 rounded-lg">
                <p className="text-xs text-text-muted mb-1">Shortest track</p>
                <div className="flex items-center gap-2">
                  {insights.duration.shortest.imageUrl && (
                    <img src={insights.duration.shortest.imageUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{insights.duration.shortest.name}</p>
                    <p className="text-xs text-text-secondary truncate">{insights.duration.shortest.artist}</p>
                  </div>
                  <span className="text-xs text-text-muted tabular-nums">{insights.duration.shortest.duration}</span>
                </div>
              </div>
            )}
            {insights.duration.longest && (
              <div className="p-3 bg-surface-2 rounded-lg">
                <p className="text-xs text-text-muted mb-1">Longest track</p>
                <div className="flex items-center gap-2">
                  {insights.duration.longest.imageUrl && (
                    <img src={insights.duration.longest.imageUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{insights.duration.longest.name}</p>
                    <p className="text-xs text-text-secondary truncate">{insights.duration.longest.artist}</p>
                  </div>
                  <span className="text-xs text-text-muted tabular-nums">{insights.duration.longest.duration}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Popularity */}
        {insights.popularity && (
          <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary mb-1">Popularity</h2>
            <p className="text-xs text-text-muted mb-4">Based on Last.fm listener data</p>
            <div className="text-center mb-4">
              <p className="font-[family-name:var(--font-heading)] text-4xl font-bold text-text-primary">{insights.popularity.average}</p>
              <p className="text-xs text-text-muted mt-1">Relative popularity score</p>
            </div>
            <HipsterMeter score={insights.popularity.hipsterScore} />
            <div className="mt-4 space-y-1.5">
              {insights.popularity.buckets.map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-24 shrink-0">{b.label}</span>
                  <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${insights.totalTracks > 0 ? (b.count / insights.totalTracks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-6 text-right tabular-nums">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden Gems */}
        {insights.hiddenGems.length > 0 && (
          <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary mb-1">Hidden Gems</h2>
            <p className="text-xs text-text-muted mb-4">Your least-known tracks</p>
            <div className="space-y-1.5">
              {insights.hiddenGems.map((t) => (
                <a
                  key={t.spotifyId}
                  href={`https://open.spotify.com/track/${t.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="w-9 h-9 rounded" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-surface-2" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{t.name}</p>
                    <p className="text-xs text-text-secondary truncate">{t.artist}</p>
                  </div>
                  <span className="text-xs text-purple bg-purple-muted px-2 py-0.5 rounded">
                    {formatListeners(t.listeners)} listeners
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Biggest Hits */}
        {insights.biggestHits.length > 0 && (
          <div className="bg-surface-1 p-5 rounded-xl border border-border-subtle">
            <h2 className="text-base font-semibold text-text-primary mb-1">Biggest Hits</h2>
            <p className="text-xs text-text-muted mb-4">Your most popular tracks</p>
            <div className="space-y-1.5">
              {insights.biggestHits.map((t) => (
                <a
                  key={t.spotifyId}
                  href={`https://open.spotify.com/track/${t.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="w-9 h-9 rounded" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-surface-2" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{t.name}</p>
                    <p className="text-xs text-text-secondary truncate">{t.artist}</p>
                  </div>
                  <span className="text-xs text-accent bg-accent-muted px-2 py-0.5 rounded">
                    {formatListeners(t.listeners)} listeners
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
