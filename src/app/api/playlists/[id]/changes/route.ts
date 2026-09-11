import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const changes = await prisma.playlistChange.findMany({
    where: { trackedPlaylistId: id },
    orderBy: { detectedAt: "desc" },
    take: 200,
  });

  return NextResponse.json(changes);
}
