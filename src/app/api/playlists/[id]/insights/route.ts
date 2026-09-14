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

    // --- POPULARITY (may fail in dev mode) ---
    let popularity = null;
    let hiddenGems: { name: string; artist: string; popularity: number; imageUrl: string | null; spotifyId: string }[] = [];
    let biggestHits: { name: string; artist: string; popularity: number; imageUrl: string | null; spotifyId: string }[] = [];

    try {
      const trackDetails: { id: string; name: string; popularity: number; artists: { name: string }[] }[] = [];
      for (let i = 0; i < trackIds.length; i += 50) {
        const batch = trackIds.slice(i, i + 50);
        const res = await fetch(
          `${SPOTIFY_API_BASE}/tracks?ids=${batch.join(",")}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        for (const t of data.tracks) {
          if (t) trackDetails.push(t);
        }
      }

      if (trackDetails.length > 0) {
        const pops = trackDetails.map((t) => t.popularity);
        const avg = Math.round(pops.reduce((a, b) => a + b, 0) / pops.length);

        const buckets = [
          { label: "Underground (0-20)", count: 0 },
          { label: "Niche (21-40)", count: 0 },
          { label: "Rising (41-60)", count: 0 },
          { label: "Popular (61-80)", count: 0 },
          { label: "Mainstream (81-100)", count: 0 },
        ];
        for (const p of pops) {
          if (p <= 20) buckets[0].count++;
          else if (p <= 40) buckets[1].count++;
          else if (p <= 60) buckets[2].count++;
          else if (p <= 80) buckets[3].count++;
          else buckets[4].count++;
        }

        popularity = { average: avg, buckets, hipsterScore: 100 - avg };

        const sorted = [...trackDetails].sort((a, b) => a.popularity - b.popularity);
        hiddenGems = sorted.slice(0, 5).map((t) => {
          const snap = tracks.find((s) => s.spotifyId === t.id);
          return { name: t.name, artist: t.artists.map((a) => a.name).join(", "), popularity: t.popularity, imageUrl: snap?.albumImageUrl ?? null, spotifyId: t.id };
        });
        biggestHits = [...trackDetails].sort((a, b) => b.popularity - a.popularity).slice(0, 5).map((t) => {
          const snap = tracks.find((s) => s.spotifyId === t.id);
          return { name: t.name, artist: t.artists.map((a) => a.name).join(", "), popularity: t.popularity, imageUrl: snap?.albumImageUrl ?? null, spotifyId: t.id };
        });
      }
    } catch (e) {
      console.error("Popularity fetch failed (dev mode?):", e);
    }

    // --- RADAR (may fail in dev mode) ---
    let radar = null;
    try {
      const audioFeatures: Record<string, number>[] = [];
      for (let i = 0; i < trackIds.length; i += 100) {
        const batch = trackIds.slice(i, i + 100);
        const res = await fetch(
          `${SPOTIFY_API_BASE}/audio-features?ids=${batch.join(",")}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        for (const f of data.audio_features) {
          if (f) audioFeatures.push(f);
        }
      }

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
    } catch (e) {
      console.error("Audio features fetch failed (dev mode?):", e);
    }

    // --- GENRES (uses artist endpoint, should work) ---
    const artistIds = [...new Set(tracks.map((t) => t.artistId).filter(Boolean))];
    let genreDistribution: { genre: string; count: number }[] = [];
    try {
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
    } catch (e) {
      console.error("Genres fetch failed:", e);
    }

    // --- ARTIST DIVERSITY (from snapshot, always works) ---
    const artistCounts = new Map<string, number>();
    for (const t of tracks) {
      artistCounts.set(t.artistName, (artistCounts.get(t.artistName) ?? 0) + 1);
    }
    const totalArtists = artistCounts.size;
    const topArtistShare = totalArtists > 0
      ? Math.round(
          ([...artistCounts.values()].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) /
            tracks.length) * 100
        )
      : 0;
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
      popularity,
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
