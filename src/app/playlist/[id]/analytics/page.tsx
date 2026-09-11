"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import GrowthChart from "@/components/analytics/GrowthChart";
import GenreChart from "@/components/analytics/GenreChart";
import ArtistRotation from "@/components/analytics/ArtistRotation";

interface AnalyticsData {
  growthData: { date: string; trackCount: number }[];
  topArtistsAdded: { name: string; count: number }[];
  topArtistsRemoved: { name: string; count: number }[];
  genreDistribution: { genre: string; count: number }[];
  collaboratorActivity: { spotifyId: string; count: number }[];
  totalChanges: number;
  totalSnapshots: number;
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch(`/api/playlists/${id}/analytics`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchAnalytics();
  }, [status, fetchAnalytics]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Could not load analytics
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/playlist/${id}`}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">
            {data.totalSnapshots}
          </p>
          <p className="text-xs text-gray-500 mt-1">Snapshots</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">
            {data.totalChanges}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total changes</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-green-600">
            {data.topArtistsAdded.reduce((s, a) => s + a.count, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Tracks added</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <p className="text-2xl font-bold text-red-500">
            {data.topArtistsRemoved.reduce((s, a) => s + a.count, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Tracks removed</p>
        </div>
      </div>

      {/* Growth chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Playlist Growth
        </h2>
        <GrowthChart data={data.growthData} />
      </div>

      {/* Genre distribution */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Genre Distribution
        </h2>
        <GenreChart data={data.genreDistribution} />
      </div>

      {/* Artist rotation */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Artist Rotation
        </h2>
        <ArtistRotation
          added={data.topArtistsAdded}
          removed={data.topArtistsRemoved}
        />
      </div>

      {/* Collaborator activity */}
      {data.collaboratorActivity.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Collaborator Activity
          </h2>
          <div className="space-y-2">
            {data.collaboratorActivity.map((c) => (
              <div
                key={c.spotifyId}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">{c.spotifyId}</span>
                <span className="text-sm text-gray-500">
                  {c.count} changes
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
