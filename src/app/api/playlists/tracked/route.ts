import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlists = await prisma.trackedPlaylist.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { changes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(playlists);
}
