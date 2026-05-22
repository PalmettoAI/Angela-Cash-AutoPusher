// Client for the self-hosted Steel browser service (a separate Railway
// service in this project). Steel runs the real Chrome the bot drives over
// CDP. The AutoPusher renders its own viewer (screenshot stream + input
// forwarding) from that CDP connection, so we only need Steel's session API
// and its CDP websocket here — no public viewer URL.

import { logger } from "@/lib/logger";

// Private-network address — server-to-server only.
const STEEL_INTERNAL =
  process.env.STEEL_BASE_URL ?? "http://steel.railway.internal:3000";

export interface SteelSession {
  id: string;
  /** ws:// CDP endpoint for Playwright.connectOverCDP — private network. */
  cdpUrl: string;
}

/** Create a fresh Steel browser session. */
export async function createSteelSession(): Promise<SteelSession> {
  let res: Response;
  try {
    res = await fetch(`${STEEL_INTERNAL}/v1/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dimensions: { width: 1280, height: 800 } }),
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
  const raw = (await res.json()) as Record<string, unknown>;
  const id = String(raw.id ?? "");

  // Steel's websocketUrl is hard-coded to 0.0.0.0:3000; keep its shape but
  // point it at the private-network host. Our Steel fork is patched
  // (ignorePath + changeOrigin) so connecting at the "/" root proxies through
  // to the browser CDP endpoint correctly.
  const cdpUrl = STEEL_INTERNAL.replace(/^http/, "ws");

  logger.info({ sessionId: id }, "Steel session created");
  return { id, cdpUrl };
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
    logger.warn(
      { sessionId: id, err: e instanceof Error ? e.message : String(e) },
      "Steel session release failed (ignored)",
    );
  }
}
