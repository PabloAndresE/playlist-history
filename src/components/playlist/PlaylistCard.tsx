"use client";

import Link from "next/link";

interface Props {
  id: string;
  name: string;
  coverImageUrl: string | null;
  ownerDisplayName: string;
  trackCount: number;
  isCollaborative: boolean;
  recentChanges?: number;
  onUntrack?: () => void;
}

export default function PlaylistCard({
  id,
  name,
  coverImageUrl,
  ownerDisplayName,
  trackCount,
  isCollaborative,
  recentChanges,
  onUntrack,
}: Props) {
  return (
    <div className="group relative bg-surface-1 rounded-xl border border-border-subtle hover:border-border transition-all">
      <Link
        href={`/playlist/${id}`}
        className="flex items-center gap-4 p-4"
      >
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={`${name} cover`}
            className="w-14 h-14 rounded-lg object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-surface-2 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
            {name}
          </h3>
          <p className="text-sm text-text-secondary mt-0.5">
            {ownerDisplayName}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-text-muted">
              {trackCount} tracks
            </span>
            {isCollaborative && (
              <span className="text-xs text-purple bg-purple-muted px-2 py-0.5 rounded">
                Collaborative
              </span>
            )}
            {recentChanges !== undefined && recentChanges > 0 && (
              <span className="text-xs text-accent bg-accent-muted px-2 py-0.5 rounded">
                {recentChanges} changes
              </span>
            )}
          </div>
        </div>
        <svg
          className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      {onUntrack && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUntrack();
          }}
          className="absolute top-3 right-3 text-xs text-text-muted hover:text-danger bg-surface-2 hover:bg-danger-muted px-2.5 py-1 rounded-lg border border-border-subtle hover:border-danger/30 transition-all md:opacity-0 md:group-hover:opacity-100"
          aria-label={`Stop tracking ${name}`}
        >
          Untrack
        </button>
      )}
    </div>
  );
}
