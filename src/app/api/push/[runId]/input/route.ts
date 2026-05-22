// POST /api/push/[runId]/input — forward one viewer input event (a click,
// scroll, or keystroke) into the live browser. This is how Angela does her
// own logins inside the embedded viewer.

import { NextResponse } from "next/server";
import { getRun } from "@/lib/browser-push/runs";
import { forwardInput, type InputEvent } from "@/lib/browser-push/engine";

export const runtime = "nodejs";

const KINDS = new Set(["click", "dblclick", "scroll", "text", "key"]);

export async function POST(req: Request, { params }: { params: { runId: string } }) {
  const run = getRun(params.runId);
  if (!run || !run.page) {
    return NextResponse.json({ error: "No active browser" }, { status: 404 });
  }
  // While the bot is filling, ignore stray input so it can't fight the bot.
  if (run.phase === "filling") {
    return NextResponse.json({ ok: false, busy: true });
  }

  const ev = (await req.json().catch(() => null)) as InputEvent | null;
  if (!ev || typeof ev !== "object" || !KINDS.has((ev as { kind?: string }).kind ?? "")) {
    return NextResponse.json({ error: "Invalid input event" }, { status: 400 });
  }

  try {
    await forwardInput(run.page, ev);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }
}
