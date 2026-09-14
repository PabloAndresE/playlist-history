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
    score >= 80 ? "Ultra hipster" :
    score >= 60 ? "Pretty obscure" :
    score >= 40 ? "Balanced taste" :
    score >= 20 ? "Mainstream leaning" :
    "Pure mainstream";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Mainstream</span>
        <span className="text-xs text-gray-500">Underground</span>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1DB954] to-[#6366f1] transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-center text-sm font-medium text-gray-700 mt-2">{label}</p>
    </div>
  );
}

const COLORS = [
  "#1DB954", "#6366f1", "#f97316", "#06b6d4", "#eab308",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
  "#3b82f6", "#84cc16",
];

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    const res = await fetch(`/api/playlists/${id}/insights`);
    if (res.ok) setInsights(await res.json());
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Analyzing your playlist...
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Could not load analytics. Try syncing the playlist first.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/playlist/${id}`} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playlist Analytics</h1>
          <p className="text-sm text-gray-500">{insights.totalTracks} tracks analyzed</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">{insights.duration.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total duration</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">{insights.artistDiversity.totalArtists}</p>
          <p className="text-xs text-gray-500 mt-1">Artists</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">{insights.artistDiversity.totalAlbums}</p>
          <p className="text-xs text-gray-500 mt-1">Albums</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {insights.freshness.avgAgeYears !== null ? `${insights.freshness.avgAgeYears}y` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Avg song age</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genres */}
        {insights.genreDistribution.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Genres</h2>
            <p className="text-xs text-gray-400 mb-4">What your playlist sounds like</p>
            <div className="flex gap-4">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.genreDistribution.slice(0, 6)}
                      dataKey="count"
                      nameKey="genre"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                    >
                      {insights.genreDistribution.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {insights.genreDistribution.slice(0, 8).map((g, i) => (
                  <div key={g.genre} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-gray-700 truncate flex-1">{g.genre}</span>
                    <span className="text-xs text-gray-400">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Artist Diversity */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Artist Diversity</h2>
          <p className="text-xs text-gray-400 mb-4">
            How varied is your playlist?
          </p>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1DB954]">
              <span className="text-2xl font-bold text-gray-900">
                {insights.artistDiversity.diversityScore}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Top 3 artists: {insights.artistDiversity.topArtistShare}% of tracks
            </p>
          </div>
          <div className="space-y-2">
            {insights.artistDiversity.distribution.slice(0, 6).map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 truncate flex-1">{a.name}</span>
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1DB954]"
                    style={{ width: `${Math.min(a.percentage * 3, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-14 text-right">
                  {a.count} ({a.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Decades */}
        {insights.decades.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Decades</h2>
            <p className="text-xs text-gray-400 mb-4">
              {insights.freshness.oldestYear && insights.freshness.newestYear
                ? `Spanning ${insights.freshness.oldestYear} to ${insights.freshness.newestYear}`
                : "When your tracks were released"}
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={insights.decades}>
                <XAxis dataKey="decade" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "13px",
                  }}
                />
                <Bar dataKey="count" fill="#1DB954" radius={[4, 4, 0, 0]} name="Tracks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Duration & Fun Facts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Duration & Stats</h2>
          <p className="text-xs text-gray-400 mb-5">Fun facts about your playlist</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Average track length</span>
              <span className="text-sm font-semibold text-gray-900">{insights.duration.average}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Explicit tracks</span>
              <span className="text-sm font-semibold text-gray-900">
                {insights.explicit.count} ({insights.explicit.percentage}%)
              </span>
            </div>

            {insights.duration.shortest && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Shortest track</p>
                <div className="flex items-center gap-2">
                  {insights.duration.shortest.imageUrl && (
                    <img src={insights.duration.shortest.imageUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{insights.duration.shortest.name}</p>
                    <p className="text-xs text-gray-500 truncate">{insights.duration.shortest.artist}</p>
                  </div>
                  <span className="text-xs text-gray-400">{insights.duration.shortest.duration}</span>
                </div>
              </div>
            )}

            {insights.duration.longest && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Longest track</p>
                <div className="flex items-center gap-2">
                  {insights.duration.longest.imageUrl && (
                    <img src={insights.duration.longest.imageUrl} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{insights.duration.longest.name}</p>
                    <p className="text-xs text-gray-500 truncate">{insights.duration.longest.artist}</p>
                  </div>
                  <span className="text-xs text-gray-400">{insights.duration.longest.duration}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Popularity / Hipster Score */}
        {insights.popularity && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Popularity</h2>
            <p className="text-xs text-gray-400 mb-5">Based on Last.fm listener data</p>
            <div className="text-center mb-5">
              <p className="text-4xl font-bold text-gray-900">{insights.popularity.average}</p>
              <p className="text-xs text-gray-400 mt-1">Relative popularity score</p>
            </div>
            <HipsterMeter score={insights.popularity.hipsterScore} />
            <div className="mt-5 space-y-1.5">
              {insights.popularity.buckets.map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{b.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1DB954]"
                      style={{
                        width: `${insights.totalTracks > 0 ? (b.count / insights.totalTracks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden Gems */}
        {insights.hiddenGems.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Hidden Gems</h2>
            <p className="text-xs text-gray-400 mb-4">Your least-known tracks</p>
            <div className="space-y-2">
              {insights.hiddenGems.map((t) => (
                <a
                  key={t.spotifyId}
                  href={`https://open.spotify.com/track/${t.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="w-9 h-9 rounded" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                  </div>
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {formatListeners(t.listeners)} listeners
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Biggest Hits */}
        {insights.biggestHits.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Biggest Hits</h2>
            <p className="text-xs text-gray-400 mb-4">Your most popular tracks</p>
            <div className="space-y-2">
              {insights.biggestHits.map((t) => (
                <a
                  key={t.spotifyId}
                  href={`https://open.spotify.com/track/${t.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="w-9 h-9 rounded" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                  </div>
                  <span className="text-xs text-[#1DB954] bg-green-50 px-2 py-0.5 rounded-full">
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
