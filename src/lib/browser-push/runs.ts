// In-memory store for active push runs.
//
// A "run" = one listing being pushed through the portals in one sitting. It
// holds the live Playwright Browser/Page, so it must persist between HTTP
// requests — hence a module-level Map. Sound here because the AutoPusher is
// single-user on a single Railway instance. If the instance restarts
// mid-push the run is lost; Angela just starts again (Steel reaps the
// orphaned session). Do NOT move to multi-instance without a shared store.
//
// The Playwright connection is held OPEN for the whole run: Steel ends a
// session when its CDP client disconnects, so one persistent connection is
// required — reconnecting per step would tear down Angela's logins.

import type { Browser, Page } from "playwright-core";

export type PushPhase =
  | "awaiting_login" // Angela logs in + opens the portal's new-listing form
  | "filling" //        the engine is filling the form right now
  | "awaiting_review" // filled (or assisted) — Angela reviews + submits herself
  | "done" //           every portal handled
  | "failed"; //        unrecoverable error

export type PortalStatus = "pending" | "active" | "done" | "failed";

export interface PortalProgress {
  key: string;
  displayName: string;
  kind: "automated" | "assisted";
  status: PortalStatus;
  note?: string;
}

export interface PushRun {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSubtype: string;
  steelSessionId: string;
  cdpUrl: string; // private — never sent to the client
  portals: PortalProgress[];
  currentIndex: number;
  phase: PushPhase;
  message: string;
  error: string | null;
  createdAt: number;
  busy: boolean; // guards against overlapping advance() calls
  // live Playwright handles — held open for the whole run, never serialized
  browser?: Browser;
  page?: Page;
}

/** Client-safe projection of a run (no CDP URL, no Playwright handles). */
export interface PushRunView {
  id: string;
  listingTitle: string;
  portals: PortalProgress[];
  currentIndex: number;
  phase: PushPhase;
  message: string;
  error: string | null;
}

const RUNS = new Map<string, PushRun>();

export function getRun(id: string): PushRun | undefined {
  return RUNS.get(id);
}

export function saveRun(run: PushRun): void {
  RUNS.set(run.id, run);
}

export function removeRun(id: string): void {
  RUNS.delete(id);
}

/**
 * Clear every run and return them. The AutoPusher is single-user, so starting
 * a new push supersedes any earlier one — this is called at run start so the
 * caller can close the old browser connections and release their sessions.
 */
export function takeAllRuns(): PushRun[] {
  const all = [...RUNS.values()];
  RUNS.clear();
  return all;
}

export function toView(run: PushRun): PushRunView {
  return {
    id: run.id,
    listingTitle: run.listingTitle,
    portals: run.portals,
    currentIndex: run.currentIndex,
    phase: run.phase,
    message: run.message,
    error: run.error,
  };
}
