import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NormalizedTrack, getArtistGenres } from "@/lib/spotify";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function getAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (user.tokenExpiresAt > fiveMinutesFromNow) return user.accessToken;

  const response = await fetch("https://accounts.spotify.com/api/token", {
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

  if (!response.ok) throw new Error("Token refresh failed");
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const tracked = await prisma.trackedPlaylist.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!tracked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const snapshot = await prisma.playlistSnapshot.findFirst({
      where: { trackedPlaylistId: id },
      orderBy: { takenAt: "desc" },
    });
    if (!snapshot) {
      return NextResponse.json({ error: "No snapshot" }, { status: 404 });
    }

    const tracks = snapshot.tracks as unknown as NormalizedTrack[];
    const trackIds = tracks.map((t) => t.spotifyId).filter(Boolean);

    const token = await getAccessToken(session.user.id);

    // Fetch full track details (for popularity) in batches of 50
    const trackDetails: { id: string; name: string; popularity: number; artists: { name: string }[] }[] = [];
    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      const res = await fetch(
        `${SPOTIFY_API_BASE}/tracks?ids=${batch.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        console.error(`tracks ${res.status}:`, await res.text());
        continue;
      }
      const data = await res.json();
      for (const t of data.tracks) {
        if (t) trackDetails.push({ id: t.id, name: t.name, popularity: t.popularity, artists: t.artists });
      }
    }

    // Fetch audio features in batches of 100
    const audioFeatures: Record<string, number>[] = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const res = await fetch(
        `${SPOTIFY_API_BASE}/audio-features?ids=${batch.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const f of data.audio_features) {
        if (f) audioFeatures.push(f);
      }
    }

    // --- POPULARITY ---
    const popularities = trackDetails.map((t) => t.popularity);
    const avgPopularity = popularities.length
      ? Math.round(popularities.reduce((a, b) => a + b, 0) / popularities.length)
      : 0;

    const popularityBuckets = [
      { label: "Underground (0-20)", count: 0 },
      { label: "Niche (21-40)", count: 0 },
      { label: "Rising (41-60)", count: 0 },
      { label: "Popular (61-80)", count: 0 },
      { label: "Mainstream (81-100)", count: 0 },
    ];
    for (const p of popularities) {
      if (p <= 20) popularityBuckets[0].count++;
      else if (p <= 40) popularityBuckets[1].count++;
      else if (p <= 60) popularityBuckets[2].count++;
      else if (p <= 80) popularityBuckets[3].count++;
      else popularityBuckets[4].count++;
    }

    // --- HIDDEN GEMS ---
    const sortedByPop = [...trackDetails].sort((a, b) => a.popularity - b.popularity);
    const hiddenGems = sortedByPop.slice(0, 5).map((t) => {
      const snap = tracks.find((s) => s.spotifyId === t.id);
      return {
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        popularity: t.popularity,
        imageUrl: snap?.albumImageUrl ?? null,
        spotifyId: t.id,
      };
    });
    const biggestHits = [...trackDetails]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5)
      .map((t) => {
        const snap = tracks.find((s) => s.spotifyId === t.id);
        return {
          name: t.name,
          artist: t.artists.map((a) => a.name).join(", "),
          popularity: t.popularity,
          imageUrl: snap?.albumImageUrl ?? null,
          spotifyId: t.id,
        };
      });

    // --- RADAR (audio features avg) ---
    let radar = null;
    if (audioFeatures.length > 0) {
      const avg = (key: string) =>
        Math.round(
          (audioFeatures.reduce((s, f) => s + (f[key] ?? 0), 0) / audioFeatures.length) * 100
        );
      radar = {
        energy: avg("energy"),
        danceability: avg("danceability"),
        happiness: avg("valence"),
        acousticness: avg("acousticness"),
        instrumentalness: avg("instrumentalness"),
        liveness: avg("liveness"),
      };
    }

    // --- GENRES ---
    const artistIds = [...new Set(tracks.map((t) => t.artistId).filter(Boolean))];
    let genreDistribution: { genre: string; count: number }[] = [];
    if (artistIds.length > 0) {
      const genreMap = await getArtistGenres(session.user.id, artistIds);
      const genreCounts = new Map<string, number>();
      for (const track of tracks) {
        const genres = genreMap.get(track.artistId) ?? [];
        for (const genre of genres) {
          genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
        }
      }
      genreDistribution = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([genre, count]) => ({ genre, count }));
    }

    // --- ARTIST DIVERSITY ---
    const artistCounts = new Map<string, number>();
    for (const t of tracks) {
      artistCounts.set(t.artistName, (artistCounts.get(t.artistName) ?? 0) + 1);
    }
    const totalArtists = artistCounts.size;
    const topArtistShare = totalArtists > 0
      ? Math.round(
          ([...artistCounts.values()].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) /
            tracks.length) *
            100
        )
      : 0;

    // Diversity score: 0 = one artist dominates, 100 = perfectly spread
    const diversityScore = totalArtists > 0
      ? Math.round((1 - topArtistShare / 100) * (Math.min(totalArtists, tracks.length) / tracks.length) * 100)
      : 0;

    const artistDistribution = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / tracks.length) * 100),
      }));

    return NextResponse.json({
      popularity: {
        average: avgPopularity,
        buckets: popularityBuckets,
        hipsterScore: 100 - avgPopularity,
      },
      hiddenGems,
      biggestHits,
      radar,
      genreDistribution,
      artistDiversity: {
        totalArtists,
        topArtistShare,
        diversityScore,
        distribution: artistDistribution,
      },
      totalTracks: tracks.length,
    });
  } catch (error) {
    console.error("GET /api/playlists/[id]/insights error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
