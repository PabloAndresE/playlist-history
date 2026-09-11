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
        isCollaborative: true,
      },
      changedBySpotifyId: { not: null },
    },
    include: {
      trackedPlaylist: {
        select: { id: true, name: true },
      },
    },
    orderBy: { detectedAt: "desc" },
    take: 100,
  });

  const result = changes.map((c) => ({
    id: c.id,
    trackName: c.trackName,
    artistName: c.artistName,
    albumImageUrl: c.albumImageUrl,
    changeType: c.changeType,
    detectedAt: c.detectedAt,
    changedBySpotifyId: c.changedBySpotifyId,
    playlistName: c.trackedPlaylist.name,
    playlistId: c.trackedPlaylist.id,
  }));

  return NextResponse.json(result);
}
