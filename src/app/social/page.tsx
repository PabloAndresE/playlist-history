"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";

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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Social</h1>
      <p className="text-sm text-gray-500 mb-8">
        Activity from collaborative playlists — see who added or removed tracks
      </p>

      {changes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No collaborative activity yet</p>
          <p className="text-sm mt-1">
            Track collaborative playlists to see who&apos;s making changes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-100"
            >
              {change.albumImageUrl ? (
                <img
                  src={change.albumImageUrl}
                  alt=""
                  className="w-10 h-10 rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium text-purple-600">
                    {change.changedBySpotifyId ?? "Unknown"}
                  </span>{" "}
                  {change.changeType === "ADDED" ? "added" : "removed"}{" "}
                  <span className="font-medium">{change.trackName}</span>
                  {" by "}
                  {change.artistName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  in{" "}
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => router.push(`/playlist/${change.playlistId}`)}
                  >
                    {change.playlistName}
                  </span>{" "}
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
