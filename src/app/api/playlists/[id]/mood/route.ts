import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NormalizedTrack } from "@/lib/spotify";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function getAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (user.tokenExpiresAt > fiveMinutesFromNow) {
    return user.accessToken;
  }

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

interface AudioFeatures {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
  loudness: number;
}

function classifyMood(avg: AudioFeatures): { mood: string; emoji: string; description: string; color: string }[] {
  const moods: { mood: string; emoji: string; description: string; color: string }[] = [];

  if (avg.energy > 0.7) moods.push({ mood: "Energetic", emoji: "⚡", description: "High energy, intense", color: "#ef4444" });
  if (avg.energy < 0.35) moods.push({ mood: "Chill", emoji: "🌊", description: "Relaxed, low-key", color: "#06b6d4" });
  if (avg.valence > 0.65) moods.push({ mood: "Happy", emoji: "☀️", description: "Positive, uplifting", color: "#eab308" });
  if (avg.valence < 0.35) moods.push({ mood: "Melancholic", emoji: "🌧️", description: "Sad, introspective", color: "#6366f1" });
  if (avg.danceability > 0.7) moods.push({ mood: "Groovy", emoji: "💃", description: "Great for dancing", color: "#f97316" });
  if (avg.acousticness > 0.6) moods.push({ mood: "Acoustic", emoji: "🎸", description: "Unplugged, organic", color: "#84cc16" });
  if (avg.instrumentalness > 0.5) moods.push({ mood: "Instrumental", emoji: "🎹", description: "Mostly without vocals", color: "#8b5cf6" });

  if (moods.length === 0) {
    moods.push({ mood: "Balanced", emoji: "🎵", description: "A well-rounded mix", color: "#1DB954" });
  }

  return moods;
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

    if (trackIds.length === 0) {
      return NextResponse.json({ error: "No tracks" }, { status: 404 });
    }

    const token = await getAccessToken(session.user.id);

    // Fetch audio features in batches of 100
    const allFeatures: AudioFeatures[] = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const res = await fetch(
        `${SPOTIFY_API_BASE}/audio-features?ids=${batch.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const body = await res.text();
        console.error(`Audio features ${res.status}:`, body);
        // If audio-features endpoint is blocked, use fallback
        if (res.status === 403) {
          return NextResponse.json({
            available: false,
            message: "Audio features not available in dev mode",
          });
        }
        continue;
      }

      const data = await res.json();
      for (const f of data.audio_features) {
        if (f) allFeatures.push(f);
      }
    }

    if (allFeatures.length === 0) {
      return NextResponse.json({
        available: false,
        message: "No audio features found",
      });
    }

    // Calculate averages
    const avg: AudioFeatures = {
      energy: allFeatures.reduce((s, f) => s + f.energy, 0) / allFeatures.length,
      danceability: allFeatures.reduce((s, f) => s + f.danceability, 0) / allFeatures.length,
      valence: allFeatures.reduce((s, f) => s + f.valence, 0) / allFeatures.length,
      acousticness: allFeatures.reduce((s, f) => s + f.acousticness, 0) / allFeatures.length,
      instrumentalness: allFeatures.reduce((s, f) => s + f.instrumentalness, 0) / allFeatures.length,
      tempo: allFeatures.reduce((s, f) => s + f.tempo, 0) / allFeatures.length,
      loudness: allFeatures.reduce((s, f) => s + f.loudness, 0) / allFeatures.length,
    };

    const moods = classifyMood(avg);

    return NextResponse.json({
      available: true,
      moods,
      features: {
        energy: Math.round(avg.energy * 100),
        danceability: Math.round(avg.danceability * 100),
        happiness: Math.round(avg.valence * 100),
        acousticness: Math.round(avg.acousticness * 100),
        instrumentalness: Math.round(avg.instrumentalness * 100),
        tempo: Math.round(avg.tempo),
      },
      tracksAnalyzed: allFeatures.length,
    });
  } catch (error) {
    console.error("GET /api/playlists/[id]/mood error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
