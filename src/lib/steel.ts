// Client for the self-hosted Steel browser service (a separate Railway
// service in this project). Steel runs the real Chrome that Angela sees and
// that Playwright drives — see project memory + Steel's repo for context.
//
// Two URLs matter and they are NOT the same:
//   - the CDP websocket   — reached over Railway's private network (server-side
//     Playwright connects to it). Never exposed publicly.
//   - the session viewer  — a public https URL embedded in an <iframe> so
//     Angela can watch the browser and type her own logins.
//
// Steel returns URLs hard-coded to 0.0.0.0:3000; we rewrite the host.

import { logger } from "@/lib/logger";

// Private network address — server-to-server only.
const STEEL_INTERNAL =
  process.env.STEEL_BASE_URL ?? "http://steel.railway.internal:3000";
// Public address — handed to the browser for the viewer iframe.
const STEEL_PUBLIC =
  process.env.STEEL_PUBLIC_URL ?? "https://steel-production.up.railway.app";

export interface SteelSession {
  id: string;
  /** ws:// CDP endpoint for Playwright.connectOverCDP — private network. */
  cdpUrl: string;
  /** https:// interactive viewer URL for the iframe Angela watches. */
  viewerUrl: string;
}

/** Swap the host/protocol of a URL Steel returned (it hard-codes 0.0.0.0:3000). */
function rebase(rawUrl: string, base: string): string {
  try {
    const u = new URL(rawUrl);
    const b = new URL(base);
    u.protocol = b.protocol;
    u.host = b.host;
    return u.toString();
  } catch {
    return base;
  }
}

function toSession(raw: Record<string, unknown>): SteelSession {
  const id = String(raw.id ?? "");
  const wsBase = STEEL_INTERNAL.replace(/^http/, "ws");

  // CDP endpoint — prefer what Steel returns, fall back to the base ws URL.
  const cdpUrl =
    typeof raw.websocketUrl === "string" && raw.websocketUrl
      ? rebase(raw.websocketUrl, wsBase)
      : wsBase;

  // Viewer — public host, interactive so Angela can click/type in it.
  const viewerRaw =
    typeof raw.sessionViewerUrl === "string" && raw.sessionViewerUrl
      ? rebase(raw.sessionViewerUrl, STEEL_PUBLIC)
      : `${STEEL_PUBLIC}/sessions/${id}`;
  const viewer = new URL(viewerRaw);
  viewer.searchParams.set("interactive", "true");
  viewer.searchParams.set("showControls", "true");

  return { id, cdpUrl, viewerUrl: viewer.toString() };
}

/** Create a fresh Steel browser session. */
export async function createSteelSession(): Promise<SteelSession> {
  let res: Response;
  try {
    res = await fetch(`${STEEL_INTERNAL}/v1/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Defaults are fine; dimensions come from the patched Steel image.
      body: JSON.stringify({}),
    });
  } catch (e) {
    throw new Error(
      `Could not reach the browser service. ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Browser service rejected the session (${res.status}): ${await res.text()}`,
    );
  }
  const session = toSession((await res.json()) as Record<string, unknown>);
  logger.info({ sessionId: session.id }, "Steel session created");
  return session;
}

/** Release a Steel session so its browser context is freed. Best-effort. */
export async function releaseSteelSession(id: string): Promise<void> {
  if (!id) return;
  try {
    await fetch(`${STEEL_INTERNAL}/v1/sessions/${id}/release`, {
      method: "POST",
    });
    logger.info({ sessionId: id }, "Steel session released");
  } catch (e) {
    // Non-fatal — Steel reaps idle sessions on its own.
    logger.warn(
      { sessionId: id, err: e instanceof Error ? e.message : String(e) },
      "Steel session release failed (ignored)",
    );
  }
}
