import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncPlaylist } from "@/lib/sync";

export async function POST(
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

    const result = await syncPlaylist(tracked.id, "ON_DEMAND");
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/playlists/[id]/sync error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
