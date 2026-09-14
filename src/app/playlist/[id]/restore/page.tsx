"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import SnapshotList from "@/components/playlist/SnapshotList";
import { SkeletonList } from "@/components/ui/Skeleton";

interface Snapshot {
  id: string;
  takenAt: string;
  trackCount: number;
  source: "CRON" | "ON_DEMAND";
}

export default function RestorePage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    const res = await fetch(`/api/playlists/${id}/snapshots`);
    if (res.ok) setSnapshots(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchSnapshots();
  }, [status, fetchSnapshots]);

  const handleRestore = async (snapshotId: string) => {
    setIsRestoring(true);
    setRestoreResult(null);

    const res = await fetch(`/api/playlists/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotId }),
    });

    if (res.ok) {
      const data = await res.json();
      setRestoreResult(
        `Restored ${data.tracksRestored} tracks successfully!`
      );
    } else {
      setRestoreResult("Failed to restore. Please try again.");
    }

    setIsRestoring(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="skeleton h-5 w-5 rounded" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
        <SkeletonList rows={4} />
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
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary">
            Snapshot & Restore
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Browse previous states and restore your playlist
          </p>
        </div>
      </div>

      {restoreResult && (
        <div
          className={`p-4 rounded-lg mb-6 text-sm ${
            restoreResult.includes("successfully")
              ? "bg-added-muted text-added border border-added/20"
              : "bg-removed-muted text-removed border border-removed/20"
          }`}
          role="alert"
        >
          {restoreResult}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800">
          <strong>Warning:</strong> Restoring a snapshot will replace all
          tracks in your Spotify playlist with the tracks from that snapshot.
          This action cannot be undone through this app (but you can restore to
          another snapshot).
        </p>
      </div>

      <SnapshotList
        snapshots={snapshots}
        playlistId={id}
        onRestore={handleRestore}
        isRestoring={isRestoring}
      />
    </div>
  );
}
