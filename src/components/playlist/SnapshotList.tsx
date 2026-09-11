"use client";

import { format } from "date-fns";
import { useState } from "react";

interface Snapshot {
  id: string;
  takenAt: string;
  trackCount: number;
  source: "CRON" | "ON_DEMAND";
}

interface Props {
  snapshots: Snapshot[];
  playlistId: string;
  onRestore?: (snapshotId: string) => void;
  isRestoring?: boolean;
}

export default function SnapshotList({
  snapshots,
  onRestore,
  isRestoring,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No snapshots yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {snapshots.map((snapshot, index) => (
        <div
          key={snapshot.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">
              {format(new Date(snapshot.takenAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {snapshot.trackCount} tracks
              {snapshot.source === "CRON" ? " (auto)" : " (manual)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {index === 0 && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                Current
              </span>
            )}
            {index > 0 && onRestore && (
              <>
                {confirmId === snapshot.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Are you sure?</span>
                    <button
                      onClick={() => {
                        onRestore(snapshot.id);
                        setConfirmId(null);
                      }}
                      disabled={isRestoring}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {isRestoring ? "Restoring..." : "Yes, restore"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs text-gray-500 px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(snapshot.id)}
                    className="text-xs text-[#1DB954] hover:text-[#1aa34a] font-medium"
                  >
                    Restore
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
