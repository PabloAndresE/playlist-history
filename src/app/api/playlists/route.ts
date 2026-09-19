import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlaylists, LIKED_SONGS_ID } from "@/lib/spotify";
import { syncPlaylist } from "@/lib/sync";

export async function GET() {
  try {
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

    // Inject Liked Songs as a virtual playlist at the top
    const likedSongs = {
      spotifyId: LIKED_SONGS_ID,
      name: "Liked Songs",
      description: "Your saved tracks",
      coverImageUrl: null,
      ownerSpotifyId: user.spotifyId ?? "",
      ownerDisplayName: "You",
      isPublic: false,
      isCollaborative: false,
      trackCount: 0,
      isTracked: trackedSet.has(LIKED_SONGS_ID),
    };

    const playlists = [
      likedSongs,
      ...spotifyPlaylists.map((p) => ({
        ...p,
        isTracked: trackedSet.has(p.spotifyId),
      })),
    ];

    return NextResponse.json(playlists);
  } catch (error) {
    console.error("GET /api/playlists error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const isLikedSongs = spotifyPlaylistId === LIKED_SONGS_ID;

    let playlistData: {
      name: string;
      description: string | null;
      coverImageUrl: string | null;
      ownerSpotifyId: string;
      ownerDisplayName: string;
      isPublic: boolean;
      isCollaborative: boolean;
      trackCount: number;
    };

    if (isLikedSongs) {
      playlistData = {
        name: "Liked Songs",
        description: "Your saved tracks",
        coverImageUrl: null,
        ownerSpotifyId: user.spotifyId ?? "",
        ownerDisplayName: "You",
        isPublic: false,
        isCollaborative: false,
        trackCount: 0,
      };
    } else {
      const playlists = await getUserPlaylists(user.id);
      const playlist = playlists.find((p) => p.spotifyId === spotifyPlaylistId);

      if (!playlist) {
        return NextResponse.json(
          { error: "Playlist not found" },
          { status: 404 }
        );
      }
      playlistData = playlist;
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
        name: playlistData.name,
        description: playlistData.description,
        coverImageUrl: playlistData.coverImageUrl,
        ownerSpotifyId: playlistData.ownerSpotifyId,
        ownerDisplayName: playlistData.ownerDisplayName,
        isPublic: playlistData.isPublic,
        isCollaborative: playlistData.isCollaborative,
        trackCount: playlistData.trackCount,
      },
      update: {
        name: playlistData.name,
        description: playlistData.description,
        coverImageUrl: playlistData.coverImageUrl,
        isPublic: playlistData.isPublic,
        isCollaborative: playlistData.isCollaborative,
        trackCount: playlistData.trackCount,
      },
    });

    // Try initial sync but don't fail if it errors
    try {
      await syncPlaylist(tracked.id, "ON_DEMAND");
    } catch (syncError) {
      console.error("Initial sync failed (playlist still tracked):", syncError);
    }

    return NextResponse.json(tracked, { status: 201 });
  } catch (error) {
    console.error("POST /api/playlists error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
