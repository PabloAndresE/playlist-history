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
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="text-text-secondary">No snapshots yet</p>
        <p className="text-sm text-text-muted mt-1">Snapshots are created when you sync your playlist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {snapshots.map((snapshot, index) => (
        <div
          key={snapshot.id}
          className="flex items-center justify-between p-4 bg-surface-1 rounded-xl border border-border-subtle"
        >
          <div>
            <p className="text-sm font-medium text-text-primary">
              {format(new Date(snapshot.takenAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {snapshot.trackCount} tracks
              {snapshot.source === "CRON" ? " (auto)" : " (manual)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {index === 0 && (
              <span className="text-xs text-text-muted bg-surface-2 px-2.5 py-1 rounded">
                Current
              </span>
            )}
            {index > 0 && onRestore && (
              <>
                {confirmId === snapshot.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger">Are you sure?</span>
                    <button
                      onClick={() => {
                        onRestore(snapshot.id);
                        setConfirmId(null);
                      }}
                      disabled={isRestoring}
                      className="text-xs bg-danger text-white px-3 py-1.5 rounded-lg hover:bg-danger/90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isRestoring ? "Restoring..." : "Yes, restore"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs text-text-muted hover:text-text-secondary px-2 py-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(snapshot.id)}
                    className="text-xs text-accent hover:text-accent-hover font-medium cursor-pointer transition-colors"
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
