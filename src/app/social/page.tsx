"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";
import { SkeletonList } from "@/components/ui/Skeleton";
import Link from "next/link";

interface SocialChange {
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

export default function SocialPage() {
  const { status } = useSession();
  const router = useRouter();
  const [changes, setChanges] = useState<SocialChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/social")
        .then((res) => res.json())
        .then(setChanges)
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="space-y-2 mb-8">
          <div className="skeleton h-7 w-24" />
          <div className="skeleton h-4 w-72" />
        </div>
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-text-primary mb-2">
        Social
      </h1>
      <p className="text-sm text-text-secondary mb-8">
        Activity from collaborative playlists — see who added or removed tracks
      </p>

      {changes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg text-text-secondary font-medium">No collaborative activity yet</p>
          <p className="text-sm text-text-muted mt-1 mb-6 max-w-sm mx-auto">
            Track collaborative playlists to see a live feed of who's adding and removing songs.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {changes.map((change, i) => (
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
                    {change.changedBySpotifyId ?? "Unknown"}
                  </span>{" "}
                  {change.changeType === "ADDED" ? "added" : "removed"}{" "}
                  <span className="font-medium">{change.trackName}</span>
                  {" by "}
                  {change.artistName}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  in{" "}
                  <button
                    className="hover:text-text-secondary transition-colors underline underline-offset-2"
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
  );
}
