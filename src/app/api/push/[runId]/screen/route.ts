// GET /api/push/[runId]/screen — a JPEG screenshot of the live browser.
// The push UI polls this to render the viewer.

import { NextResponse } from "next/server";
import { getRun } from "@/lib/browser-push/runs";
import { captureScreenshot } from "@/lib/browser-push/engine";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { runId: string } }) {
  const run = getRun(params.runId);
  if (!run || !run.page) {
    // 204 — nothing to show yet; the client keeps the previous frame.
    return new NextResponse(null, { status: 204 });
  }
  try {
    const jpeg = await captureScreenshot(run.page);
    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "no-store",
      },
    });
  } catch {
    // Page busy or navigating — skip this frame.
    return new NextResponse(null, { status: 204 });
  }
}
