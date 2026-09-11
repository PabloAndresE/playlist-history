"use client";

interface Props {
  added: { name: string; count: number }[];
  removed: { name: string; count: number }[];
}

export default function ArtistRotation({ added, removed }: Props) {
  if (added.length === 0 && removed.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No artist rotation data yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Most added artists
        </h4>
        <div className="space-y-2">
          {added.map((artist) => (
            <div
              key={artist.name}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-700 truncate">
                {artist.name}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 rounded-full bg-green-400"
                  style={{
                    width: `${Math.max(
                      20,
                      (artist.count / (added[0]?.count || 1)) * 80
                    )}px`,
                  }}
                />
                <span className="text-xs text-gray-400 w-6 text-right">
                  {artist.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Most removed artists
        </h4>
        <div className="space-y-2">
          {removed.map((artist) => (
            <div
              key={artist.name}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-700 truncate">
                {artist.name}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 rounded-full bg-red-400"
                  style={{
                    width: `${Math.max(
                      20,
                      (artist.count / (removed[0]?.count || 1)) * 80
                    )}px`,
                  }}
                />
                <span className="text-xs text-gray-400 w-6 text-right">
                  {artist.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
