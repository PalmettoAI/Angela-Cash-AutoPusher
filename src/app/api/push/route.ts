// POST /api/push — start a guided push run for a listing.
//
// Creates a Steel browser session, opens a persistent Playwright connection
// (held for the whole run — Steel ends a session when its CDP client
// disconnects), opens the first portal, and returns a run the UI can poll.

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { createSteelSession, releaseSteelSession } from "@/lib/steel";
import { connectToSteel, gotoPortal, disconnect } from "@/lib/browser-push/engine";
import { PORTALS } from "@/lib/browser-push/portals";
import { saveRun, takeAllRuns, toView, type PushRun } from "@/lib/browser-push/runs";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const listingId = typeof body?.listingId === "string" ? body.listingId : "";
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Single-user app: a new push supersedes any earlier run. Close their
  // browser connections and free their Steel sessions.
  for (const old of takeAllRuns()) {
    await disconnect(old.browser);
    await releaseSteelSession(old.steelSessionId);
  }

  let session;
  try {
    session = await createSteelSession();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "push start: Steel session failed");
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const first = PORTALS[0];
  const run: PushRun = {
    id: randomUUID(),
    listingId: listing.id,
    listingTitle: listing.title,
    listingSubtype: listing.subtype,
    steelSessionId: session.id,
    cdpUrl: session.cdpUrl,
    portals: PORTALS.map((p) => ({
      key: p.key,
      displayName: p.displayName,
      kind: p.kind,
      status: "pending" as const,
    })),
    currentIndex: 0,
    phase: "awaiting_login",
    message: first.loginInstruction,
    error: null,
    createdAt: Date.now(),
    busy: false,
  };
  run.portals[0].status = "active";

  // Open one persistent connection and navigate to the first portal.
  try {
    const { browser, page } = await connectToSteel(session.cdpUrl);
    run.browser = browser;
    run.page = page;
    await gotoPortal(page, first.startUrl);
  } catch (e) {
    await disconnect(run.browser);
    await releaseSteelSession(session.id);
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "push start: could not open first portal");
    return NextResponse.json(
      { error: `Couldn't open the browser: ${msg}` },
      { status: 502 },
    );
  }

  saveRun(run);
  logger.info({ runId: run.id, listingId }, "push run started");
  return NextResponse.json(toView(run));
}
