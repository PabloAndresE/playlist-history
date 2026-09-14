import { prisma } from "./prisma";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

interface SpotifyTrack {
  track: {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: {
      id: string;
      name: string;
      images: { url: string; width: number; height: number }[];
    };
  };
  added_at: string;
  added_by: { id: string };
}

export interface NormalizedTrack {
  spotifyId: string;
  name: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  albumImageUrl: string | null;
  addedAt: string;
  addedBy: string | null;
}

async function refreshAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (user.tokenExpiresAt > fiveMinutesFromNow) {
    return user.accessToken;
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Token refresh failed ${response.status}:`, body);
    throw new Error(`Token refresh failed: ${response.status} - ${body}`);
  }

  const data = await response.json();

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? user.refreshToken,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

async function spotifyFetch(
  userId: string,
  endpoint: string
): Promise<Response> {
  const token = await refreshAccessToken(userId);
  const url = `${SPOTIFY_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
}

export async function getUserPlaylists(userId: string) {
  const playlists = [];
  let next: string | null = "/me/playlists?limit=50";

  while (next) {
    const res = await spotifyFetch(userId, next);
    if (!res.ok) {
      const body = await res.text();
      console.error(`getUserPlaylists ${res.status}:`, body);
      throw new Error(`Spotify ${res.status}: ${body}`);
    }
    const data = await res.json();
    playlists.push(
      ...data.items
        .filter((p: { id: string }) => p && p.id)
        .map(
          (p: {
            id: string;
            name: string;
            description: string;
            images: { url: string }[];
            owner: { id: string; display_name: string };
            public: boolean;
            collaborative: boolean;
            tracks?: { total: number };
          }) => ({
            spotifyId: p.id,
            name: p.name,
            description: p.description,
            coverImageUrl: p.images?.[0]?.url ?? null,
            ownerSpotifyId: p.owner?.id ?? "",
            ownerDisplayName: p.owner?.display_name ?? "Unknown",
            isPublic: p.public ?? false,
            isCollaborative: p.collaborative ?? false,
            trackCount: p.tracks?.total ?? 0,
          })
        )
    );
    next = data.next
      ? data.next.replace(SPOTIFY_API_BASE, "")
      : null;
  }

  return playlists;
}

export async function getPlaylistTracks(
  userId: string,
  spotifyPlaylistId: string
): Promise<NormalizedTrack[]> {
  const tracks: NormalizedTrack[] = [];
  // Use /items endpoint (new API) instead of /tracks (deprecated, returns 403)
  let next: string | null = `/playlists/${spotifyPlaylistId}/items?limit=100`;

  while (next) {
    const res = await spotifyFetch(userId, next);
    if (!res.ok) {
      const body = await res.text();
      console.error(`getPlaylistTracks ${res.status} for ${spotifyPlaylistId}:`, body);
      throw new Error(`Spotify ${res.status}: ${body}`);
    }
    const data = await res.json();

    for (const entry of data.items) {
      // New API uses "item" instead of "track"
      const track = entry.item ?? entry.track;
      if (!track || !track.id) continue;
      tracks.push({
        spotifyId: track.id,
        name: track.name,
        artistId: track.artists?.[0]?.id ?? "",
        artistName: track.artists?.map((a: { name: string }) => a.name).join(", ") ?? "Unknown",
        albumId: track.album?.id ?? "",
        albumName: track.album?.name ?? "",
        albumImageUrl: track.album?.images?.[2]?.url ?? track.album?.images?.[0]?.url ?? null,
        addedAt: entry.added_at,
        addedBy: entry.added_by?.id ?? null,
      });
    }

    next = data.next ? data.next.replace(SPOTIFY_API_BASE, "") : null;
  }

  return tracks;
}

export async function replacePlaylistTracks(
  userId: string,
  spotifyPlaylistId: string,
  trackUris: string[]
): Promise<void> {
  const token = await refreshAccessToken(userId);

  // Spotify allows max 100 URIs per request
  // First call uses PUT to replace, subsequent calls use POST to add
  const chunks = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }

  for (let i = 0; i < chunks.length; i++) {
    const method = i === 0 ? "PUT" : "POST";
    const res = await fetch(
      `${SPOTIFY_API_BASE}/playlists/${spotifyPlaylistId}/tracks`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: chunks[i] }),
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to ${method} tracks: ${res.status}`);
    }
  }
}

export async function getArtistGenres(
  userId: string,
  artistIds: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  // Check cache first
  const cached = await prisma.trackGenreCache.findMany({
    where: {
      artistSpotifyId: { in: artistIds },
      fetchedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 day cache
    },
  });

  for (const c of cached) {
    result.set(c.artistSpotifyId, c.genres as string[]);
  }

  const uncachedIds = artistIds.filter((id) => !result.has(id));

  // Fetch uncached in batches of 50 (Spotify limit)
  for (let i = 0; i < uncachedIds.length; i += 50) {
    const batch = uncachedIds.slice(i, i + 50);
    const res = await spotifyFetch(
      userId,
      `/artists?ids=${batch.join(",")}`
    );
    if (!res.ok) continue;
    const data = await res.json();

    for (const artist of data.artists) {
      if (!artist) continue;
      result.set(artist.id, artist.genres);

      await prisma.trackGenreCache.upsert({
        where: { artistSpotifyId: artist.id },
        create: {
          artistSpotifyId: artist.id,
          genres: artist.genres,
        },
        update: {
          genres: artist.genres,
          fetchedAt: new Date(),
        },
      });
    }
  }

  return result;
}
