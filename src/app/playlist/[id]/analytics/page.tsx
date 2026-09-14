"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Insights {
  popularity: {
    average: number;
    buckets: { label: string; count: number }[];
    hipsterScore: number;
  } | null;
  hiddenGems: {
    name: string;
    artist: string;
    popularity: number;
    imageUrl: string | null;
    spotifyId: string;
  }[];
  biggestHits: {
    name: string;
    artist: string;
    popularity: number;
    imageUrl: string | null;
    spotifyId: string;
  }[];
  radar: Record<string, number> | null;
  genreDistribution: { genre: string; count: number }[];
  artistDiversity: {
    totalArtists: number;
    topArtistShare: number;
    diversityScore: number;
    distribution: { name: string; count: number; percentage: number }[];
  };
  totalTracks: number;
}

const GENRE_COLORS = [
  "#1DB954", "#6366f1", "#f97316", "#06b6d4", "#eab308",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
  "#3b82f6", "#84cc16",
];

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
        <div
          className="absolute top-0 h-full w-1 bg-white border border-gray-300 rounded"
          style={{ left: `${score}%`, transform: "translateX(-50%)" }}
        />
      </div>
      <p className="text-center text-sm font-medium text-gray-700 mt-2">{label}</p>
    </div>
  );
}

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
        Could not load analytics. Make sure the playlist has been synced.
      </div>
    );
  }

  const radarData = insights.radar
    ? Object.entries(insights.radar).map(([key, value]) => ({
        feature: key.charAt(0).toUpperCase() + key.slice(1),
        value,
      }))
    : [];

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popularity / Hipster Score */}
        {insights.popularity ? (
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Popularity</h2>
          <p className="text-xs text-gray-400 mb-5">How mainstream is your taste?</p>
          <div className="text-center mb-5">
            <p className="text-5xl font-bold text-gray-900">{insights.popularity.average}</p>
            <p className="text-xs text-gray-400 mt-1">Average popularity (0-100)</p>
          </div>
          <HipsterMeter score={insights.popularity.hipsterScore} />
          <div className="mt-5 space-y-1.5">
            {insights.popularity.buckets.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-32 shrink-0">{b.label}</span>
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
        ) : null}

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Audio Profile</h2>
            <p className="text-xs text-gray-400 mb-2">What your playlist sounds like</p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="#1DB954"
                  fill="#1DB954"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Genres */}
        {insights.genreDistribution.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Genres</h2>
            <p className="text-xs text-gray-400 mb-4">Top genres in your playlist</p>
            <div className="flex gap-4">
              <div className="w-36 h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.genreDistribution.slice(0, 6)}
                      dataKey="count"
                      nameKey="genre"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={35}
                    >
                      {insights.genreDistribution.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={GENRE_COLORS[i]} />
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
                      style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }}
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
            {insights.artistDiversity.totalArtists} unique artists
          </p>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1DB954]">
              <span className="text-2xl font-bold text-gray-900">
                {insights.artistDiversity.diversityScore}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Diversity score</p>
          </div>
          <p className="text-xs text-gray-500 text-center mb-4">
            Top 3 artists make up {insights.artistDiversity.topArtistShare}% of the playlist
          </p>
          <div className="space-y-2">
            {insights.artistDiversity.distribution.slice(0, 6).map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 truncate flex-1">{a.name}</span>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1DB954]"
                    style={{ width: `${a.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {a.count} ({a.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Gems */}
        {insights.hiddenGems.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Hidden Gems</h2>
          <p className="text-xs text-gray-400 mb-4">Your least-known tracks, the real finds</p>
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
                <div className="text-right">
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {t.popularity}/100
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
        )}

        {/* Biggest Hits */}
        {insights.biggestHits.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Biggest Hits</h2>
          <p className="text-xs text-gray-400 mb-4">Your most popular tracks right now</p>
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
                <div className="text-right">
                  <span className="text-xs text-[#1DB954] bg-green-50 px-2 py-0.5 rounded-full">
                    {t.popularity}/100
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
