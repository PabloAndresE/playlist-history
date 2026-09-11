import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlaylists } from "@/lib/spotify";
import { syncPlaylist } from "@/lib/sync";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const spotifyPlaylists = await getUserPlaylists(user.id);

  const trackedIds = await prisma.trackedPlaylist.findMany({
    where: { userId: user.id },
    select: { spotifyPlaylistId: true },
  });
  const trackedSet = new Set(trackedIds.map((t) => t.spotifyPlaylistId));

  const playlists = spotifyPlaylists.map((p) => ({
    ...p,
    isTracked: trackedSet.has(p.spotifyId),
  }));

  return NextResponse.json(playlists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { spotifyPlaylistId } = body;

  if (!spotifyPlaylistId) {
    return NextResponse.json(
      { error: "spotifyPlaylistId required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get playlist details from Spotify
  const playlists = await getUserPlaylists(user.id);
  const playlist = playlists.find((p) => p.spotifyId === spotifyPlaylistId);

  if (!playlist) {
    return NextResponse.json(
      { error: "Playlist not found" },
      { status: 404 }
    );
  }

  const tracked = await prisma.trackedPlaylist.upsert({
    where: {
      userId_spotifyPlaylistId: {
        userId: user.id,
        spotifyPlaylistId,
      },
    },
    create: {
      userId: user.id,
      spotifyPlaylistId,
      name: playlist.name,
      description: playlist.description,
      coverImageUrl: playlist.coverImageUrl,
      ownerSpotifyId: playlist.ownerSpotifyId,
      ownerDisplayName: playlist.ownerDisplayName,
      isPublic: playlist.isPublic,
      isCollaborative: playlist.isCollaborative,
      trackCount: playlist.trackCount,
    },
    update: {
      name: playlist.name,
      description: playlist.description,
      coverImageUrl: playlist.coverImageUrl,
      trackCount: playlist.trackCount,
    },
  });

  // Take initial snapshot
  await syncPlaylist(tracked.id, "ON_DEMAND");

  return NextResponse.json(tracked, { status: 201 });
}
