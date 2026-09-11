import { NextRequest, NextResponse } from "next/server";
import { syncAllPlaylists } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllPlaylists();

  const summary = {
    total: results.length,
    synced: results.filter((r) => r.snapshotCreated).length,
    unchanged: results.filter((r) => !r.snapshotCreated).length,
    totalAdded: results.reduce((sum, r) => sum + r.added, 0),
    totalRemoved: results.reduce((sum, r) => sum + r.removed, 0),
  };

  return NextResponse.json(summary);
}
