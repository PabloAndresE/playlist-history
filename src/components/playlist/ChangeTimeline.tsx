"use client";

import { format } from "date-fns";
import ChangeBadge from "@/components/ui/Changebadge";

interface Change {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumImageUrl: string | null;
  changeType: "ADDED" | "REMOVED";
  detectedAt: string;
  trackSpotifyId: string;
  changedBySpotifyId: string | null;
}

interface Props {
  changes: Change[];
}

export default function ChangeTimeline({ changes }: Props) {
  const grouped = changes.reduce(
    (acc, change) => {
      const date = format(new Date(change.detectedAt), "yyyy-MM-dd");
      if (!acc[date]) acc[date] = [];
      acc[date].push(change);
      return acc;
    },
    {} as Record<string, Change[]>
  );

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (changes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="text-lg text-text-secondary">No changes detected yet</p>
        <p className="text-sm text-text-muted mt-1">
          Changes will appear here after the next sync
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-text-muted mb-3">
            {format(new Date(date), "MMMM d, yyyy")}
          </h3>
          <div className="space-y-2">
            {grouped[date].map((change) => (
              <div
                key={change.id}
                className="flex items-center gap-3 p-3 bg-surface-1 rounded-xl border border-border-subtle hover:border-border transition-colors"
              >
                {change.albumImageUrl ? (
                  <img src={change.albumImageUrl} alt="" className="w-10 h-10 rounded" />
                ) : (
                  <div className="w-10 h-10 rounded bg-surface-2 flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://open.spotify.com/track/${change.trackSpotifyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-text-primary hover:text-accent truncate block transition-colors"
                  >
                    {change.trackName}
                  </a>
                  <p className="text-xs text-text-secondary truncate">
                    {change.artistName} — {change.albumName}
                  </p>
                </div>
                <ChangeBadge type={change.changeType} />
                {change.changedBySpotifyId && (
                  <span className="text-xs text-text-muted">
                    by {change.changedBySpotifyId}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
