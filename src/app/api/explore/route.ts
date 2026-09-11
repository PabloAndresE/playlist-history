import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const playlists = await prisma.trackedPlaylist.findMany({
    where: { isPublic: true },
    distinct: ["spotifyPlaylistId"],
    include: {
      changes: {
        orderBy: { detectedAt: "desc" },
        take: 5,
        select: {
          id: true,
          trackName: true,
          artistName: true,
          albumImageUrl: true,
          changeType: true,
          detectedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const result = playlists.map((p) => ({
    id: p.id,
    name: p.name,
    coverImageUrl: p.coverImageUrl,
    ownerDisplayName: p.ownerDisplayName,
    trackCount: p.trackCount,
    recentChanges: p.changes,
  }));

  return NextResponse.json(result);
}
