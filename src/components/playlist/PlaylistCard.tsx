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
}

export default function PlaylistCard({
  id,
  name,
  coverImageUrl,
  ownerDisplayName,
  trackCount,
  isCollaborative,
  recentChanges,
}: Props) {
  return (
    <Link
      href={`/playlist/${id}`}
      className="group block p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt=""
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#1DB954] transition-colors">
            {name}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            by {ownerDisplayName}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">
              {trackCount} tracks
            </span>
            {isCollaborative && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                Collaborative
              </span>
            )}
            {recentChanges !== undefined && recentChanges > 0 && (
              <span className="text-xs text-[#1DB954] bg-green-50 px-2 py-0.5 rounded-full">
                {recentChanges} recent changes
              </span>
            )}
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors mt-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}
