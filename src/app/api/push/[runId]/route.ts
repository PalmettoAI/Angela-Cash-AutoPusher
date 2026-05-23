// GET    /api/push/[runId]  — current run state (UI polls this)
// POST   /api/push/[runId]  — advance the run ({ action: "advance" | "skip" })
// DELETE /api/push/[runId]  — end the run, close the browser, release Steel

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, listingPhotos, pushAttempts } from "@/db/schema";
import { releaseSteelSession } from "@/lib/steel";
import {
  gotoPortal,
  fillForm,
  uploadPhotos,
  disconnect,
} from "@/lib/browser-push/engine";
import { PORTALS } from "@/lib/browser-push/portals";
import {
  getRun,
  saveRun,
  removeRun,
  toView,
  type PushRun,
} from "@/lib/browser-push/runs";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteCtx = { params: { runId: string } };

export async function GET(_req: Request, { params }: RouteCtx) {
  const run = getRun(params.runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json(toView(run));
}

export async function DELETE(_req: Request, { params }: RouteCtx) {
  const run = getRun(params.runId);
  if (run) {
    await disconnect(run.browser);
    await releaseSteelSession(run.steelSessionId);
    removeRun(run.id);
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: RouteCtx) {
  const run = getRun(params.runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action: "advance" | "skip" = body?.action === "skip" ? "skip" : "advance";

  // Claim the run atomically. No `await` between reading run.busy and setting
  // it, so two overlapping clicks can't both proceed.
  if (run.busy) return NextResponse.json(toView(run));
  if (run.phase === "done" || run.phase === "failed") {
    return NextResponse.json(toView(run));
  }
  run.busy = true;
  saveRun(run);
  try {
    if (run.phase === "awaiting_login") {
      await handleLoginPhase(run, action);
    } else if (run.phase === "awaiting_review") {
      await completePortal(run, "success");
      await goToNextPortal(run);
    }
    run.error = null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ runId: run.id, err: msg }, "push advance failed");
    run.phase = "failed";
    run.error = msg;
    run.message = `Something went wrong: ${msg}`;
    const portal = run.portals[run.currentIndex];
    if (portal) portal.status = "failed";
    await disconnect(run.browser);
    await releaseSteelSession(run.steelSessionId);
  } finally {
    run.busy = false;
    saveRun(run);
  }
  return NextResponse.json(toView(run));
}

// ── phase handlers ─────────────────────────────────────────────────────────

async function handleLoginPhase(run: PushRun, action: "advance" | "skip") {
  const portal = PORTALS[run.currentIndex];

  if (action === "skip") {
    run.portals[run.currentIndex].note = "Skipped";
    await completePortal(run, "pending", "Skipped by Angela");
    await goToNextPortal(run);
    return;
  }

  if (portal.kind === "automated" && portal.getFields) {
    // Auto-fill is best-effort: a failure here is NOT fatal — the browser
    // stays open and Angela can finish the form by hand, then submit.
    run.phase = "filling";
    saveRun(run);
    try {
      if (!run.page) throw new Error("Browser is not connected");
      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, run.listingId));
      if (!listing) throw new Error("Listing not found");
      const photos = await db
        .select()
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, run.listingId));

      const fields = portal.getFields(run.listingSubtype);
      const fillReport = await fillForm(
        run.page,
        { ...listing, photos },
        fields,
      );
      const uploadReport = await uploadPhotos(run.page, photos).catch(
        (e) => ({
          uploaded: 0,
          reason: e instanceof Error ? e.message : String(e),
        }),
      );

      const parts = [
        `Bot filled ${fillReport.filled.length} field${fillReport.filled.length === 1 ? "" : "s"}`,
      ];
      if (uploadReport.uploaded > 0) {
        parts.push(
          `uploaded ${uploadReport.uploaded} photo${uploadReport.uploaded === 1 ? "" : "s"}`,
        );
      } else if (
        uploadReport.reason &&
        uploadReport.reason !== "no photos on listing"
      ) {
        parts.push(`photos: ${uploadReport.reason}`);
      }
      const skipTail =
        fillReport.skipped.length > 0
          ? `; ${fillReport.skipped.length} field${fillReport.skipped.length === 1 ? "" : "s"} need a manual check`
          : "";
      run.portals[run.currentIndex].note = parts.join(", ") + skipTail;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn({ runId: run.id, err: msg }, "auto-fill failed (non-fatal)");
      run.portals[run.currentIndex].note =
        `Auto-fill couldn't run (${msg}) — please fill this one in by hand.`;
    }
  }

  // Automated (filled or fill-failed) and assisted both land here.
  run.phase = "awaiting_review";
  run.message = portal.reviewInstruction;
}

async function goToNextPortal(run: PushRun) {
  run.currentIndex += 1;

  if (run.currentIndex >= PORTALS.length) {
    run.phase = "done";
    run.message =
      "All done — every site has been handled. You can close this window.";
    await disconnect(run.browser);
    await releaseSteelSession(run.steelSessionId);
    return;
  }

  const next = PORTALS[run.currentIndex];
  run.portals[run.currentIndex].status = "active";
  run.phase = "awaiting_login";
  run.message = next.loginInstruction;

  // Open the next portal for her. Non-fatal if it doesn't — she can navigate.
  try {
    if (run.page) await gotoPortal(run.page, next.startUrl);
  } catch (e) {
    logger.warn(
      { runId: run.id, err: e instanceof Error ? e.message : String(e) },
      "could not auto-open next portal",
    );
  }
}

/** Mark the current portal finished and log a push_attempts row. */
async function completePortal(
  run: PushRun,
  status: "success" | "pending" | "failed",
  note?: string,
) {
  const portal = run.portals[run.currentIndex];
  if (!portal) return;
  portal.status = status === "failed" ? "failed" : "done";

  try {
    await db.insert(pushAttempts).values({
      listingId: run.listingId,
      destinationKey: portal.key,
      status,
      result: { note: note ?? portal.note ?? "Handled via guided push" },
      completedAt: new Date(),
    });
  } catch (e) {
    logger.warn(
      { runId: run.id, err: e instanceof Error ? e.message : String(e) },
      "could not record push attempt",
    );
  }
}
