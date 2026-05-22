// In-memory store for active push runs.
//
// A "run" = one listing being pushed through the portals in one sitting. It
// persists between HTTP requests — hence a module-level Map. This is sound
// here because the AutoPusher is a single-user app on a single Railway
// instance. If the instance restarts mid-push the run is lost; Angela simply
// starts again (Steel reaps the orphaned session). Do NOT move to
// multi-instance without a shared store.
//
// Playwright is connected fresh per operation (connect → act → disconnect)
// against the persistent Steel session, so no live browser handle is stored
// here — that avoids holding a CDP socket open while Angela logs in.

export type PushPhase =
  | "awaiting_login" // Angela must log in + open the portal's new-listing form
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
  viewerUrl: string;
  cdpUrl: string; // private — never sent to the client
  portals: PortalProgress[];
  currentIndex: number;
  phase: PushPhase;
  message: string;
  error: string | null;
  createdAt: number;
  busy: boolean; // guards against overlapping advance() calls
}

/** Client-safe projection of a run (no CDP URL, no Playwright handles). */
export interface PushRunView {
  id: string;
  listingTitle: string;
  viewerUrl: string;
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
 * Clear every run and return their Steel session ids. The AutoPusher is
 * single-user, so starting a new push supersedes any earlier one — this is
 * called at run start to free the browser sessions of abandoned runs.
 */
export function takeAllRuns(): string[] {
  const ids: string[] = [];
  for (const run of RUNS.values()) {
    if (run.steelSessionId) ids.push(run.steelSessionId);
  }
  RUNS.clear();
  return ids;
}

export function toView(run: PushRun): PushRunView {
  return {
    id: run.id,
    listingTitle: run.listingTitle,
    viewerUrl: run.viewerUrl,
    portals: run.portals,
    currentIndex: run.currentIndex,
    phase: run.phase,
    message: run.message,
    error: run.error,
  };
}
