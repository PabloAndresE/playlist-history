import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const changes = await prisma.playlistChange.findMany({
    where: {
      trackedPlaylist: {
        userId: session.user.id,
      },
      changedBySpotifyId: { not: null },
    },
    include: {
      trackedPlaylist: {
        select: { name: true, spotifyPlaylistId: true },
      },
    },
    orderBy: { detectedAt: "desc" },
    take: 50,
  });

  const result = changes.map((c) => ({
    id: c.id,
    trackName: c.trackName,
    artistName: c.artistName,
    albumImageUrl: c.albumImageUrl,
    changeType: c.changeType,
    detectedAt: c.detectedAt.toISOString(),
    changedBySpotifyId: c.changedBySpotifyId,
    playlistName: c.trackedPlaylist.name,
    playlistId: c.trackedPlaylist.spotifyPlaylistId,
  }));

  return NextResponse.json(result);
}
