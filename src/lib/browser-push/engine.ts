// The Playwright side of the push: connect to a Steel session over CDP, drive
// the page, render screenshots for the viewer, forward Angela's input, and
// fill a portal's create-listing form from the listing.
//
// Field-fill is label-driven and best-effort. Crexi/LoopNet agent forms are
// login-gated, so exact selectors can't be verified without Angela's session;
// `getByLabel` works on well-formed forms, and `fillForm` reports every field
// it could and couldn't place so the gaps are visible (and refinable later).

import { chromium, type Browser, type Page } from "playwright-core";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { ListingWithRelations, ListingPhotoLite } from "@/destinations/types";
import { UPLOAD_ROOT } from "@/lib/upload-storage";
import { logger } from "@/lib/logger";

/** Structural shape of a mapping entry — matches crexi/loopnet FieldMap. */
export interface PushField {
  listing: string;
  target: string;
  transform?: (v: unknown) => unknown;
  defaultValue?: unknown;
}

export interface ConnectedBrowser {
  browser: Browser;
  page: Page;
}

export interface FillReport {
  filled: string[];
  skipped: string[];
}

/** A user input event from the embedded viewer, normalised to 0..1 fractions. */
export type InputEvent =
  | { kind: "click"; xFrac: number; yFrac: number }
  | { kind: "dblclick"; xFrac: number; yFrac: number }
  | { kind: "scroll"; dy: number }
  | { kind: "text"; text: string }
  | { kind: "key"; key: string };

export const VIEWPORT = { width: 1280, height: 800 };

/** Connect Playwright to a running Steel session and grab a usable page. */
export async function connectToSteel(cdpUrl: string): Promise<ConnectedBrowser> {
  const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 30_000 });
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  // Pin a predictable viewport so viewer screenshots and click mapping line up.
  await page.setViewportSize(VIEWPORT).catch(() => {});
  return { browser, page };
}

/** Navigate to a portal URL and wait for the page to settle. */
export async function gotoPortal(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
}

/** JPEG screenshot of the current viewport, for the live viewer. */
export async function captureScreenshot(page: Page): Promise<Buffer> {
  return page.screenshot({ type: "jpeg", quality: 55, timeout: 8_000 });
}

/** Apply one viewer input event to the page. */
export async function forwardInput(page: Page, ev: InputEvent): Promise<void> {
  const vp = page.viewportSize() ?? VIEWPORT;
  const clamp = (f: number) => Math.max(0, Math.min(1, f));
  switch (ev.kind) {
    case "click":
      await page.mouse.click(clamp(ev.xFrac) * vp.width, clamp(ev.yFrac) * vp.height);
      break;
    case "dblclick":
      await page.mouse.dblclick(clamp(ev.xFrac) * vp.width, clamp(ev.yFrac) * vp.height);
      break;
    case "scroll":
      await page.mouse.wheel(0, ev.dy);
      break;
    case "text":
      await page.keyboard.type(ev.text);
      break;
    case "key":
      await page.keyboard.press(ev.key);
      break;
  }
}

/** Resolve a mapping's source field from the listing (column or jsonb key). */
function resolveValue(listing: ListingWithRelations, key: string): unknown {
  if (key in listing) return (listing as Record<string, unknown>)[key];
  const sub = listing.subtypeFields;
  if (sub && typeof sub === "object" && key in sub) {
    return (sub as Record<string, unknown>)[key];
  }
  return undefined;
}

/**
 * Fill a portal form from a mapping. For each field with a value, locate the
 * input by its visible label and type into it. Selects, multi-selects, dates,
 * and file uploads are intentionally left for Angela to confirm in the viewer
 * — they are reported as `skipped`, not silently dropped.
 */
export async function fillForm(
  page: Page,
  listing: ListingWithRelations,
  fields: ReadonlyArray<PushField>,
): Promise<FillReport> {
  const filled: string[] = [];
  const skipped: string[] = [];

  for (const field of fields) {
    let value = resolveValue(listing, field.listing);
    if (
      (value === undefined || value === null || value === "") &&
      field.defaultValue !== undefined
    ) {
      value = field.defaultValue;
    }
    if (value === undefined || value === null || value === "") continue;

    if (field.transform) {
      try {
        value = field.transform(value);
      } catch {
        skipped.push(field.target);
        continue;
      }
    }
    const text = String(value).trim();
    if (!text) continue;

    try {
      const input = page.getByLabel(field.target, { exact: false }).first();
      // Short per-field timeout: a real field appears fast; this only bounds
      // how long a MISS costs, keeping the whole fill snappy on a live form.
      await input.waitFor({ state: "visible", timeout: 1_500 });
      const tag = await input.evaluate((el) => el.tagName.toLowerCase());
      if (tag === "select") {
        await input.selectOption({ label: text }).catch(() => input.selectOption(text));
      } else {
        await input.fill(text, { timeout: 2_000 });
      }
      filled.push(field.target);
    } catch {
      // Field not found by label, or not a simple input — leave for Angela.
      skipped.push(field.target);
    }
  }

  logger.info(
    { filled: filled.length, skipped: skipped.length },
    "Portal form fill complete",
  );
  return { filled, skipped };
}

// ── photo upload ───────────────────────────────────────────────────────────

/** Map an upload URL (`/api/uploads/<id>/<name>`) to the local file path. */
function uploadUrlToLocalPath(url: string): string | null {
  const m = url.match(/^\/api\/uploads\/([0-9a-f-]{36})\/(.+)$/i);
  if (!m) return null;
  const path = join(UPLOAD_ROOT, m[1], decodeURIComponent(m[2]));
  return existsSync(path) ? path : null;
}

export interface UploadReport {
  uploaded: number;
  reason?: string;
}

/**
 * Upload listing photos via any visible file input on the current page.
 * Best-effort: prefers image-accepting inputs, then falls back to any file
 * input. Non-fatal — if nothing matches, returns `{uploaded:0}` with a reason
 * and the bot moves on; Angela can drop them in by hand in the viewer.
 */
export async function uploadPhotos(
  page: Page,
  photos: ListingPhotoLite[] | undefined,
): Promise<UploadReport> {
  if (!photos || photos.length === 0) return { uploaded: 0, reason: "no photos on listing" };
  const paths = photos
    .map((p) => uploadUrlToLocalPath(p.url))
    .filter((p): p is string => !!p);
  if (paths.length === 0) {
    return { uploaded: 0, reason: "photos aren't local uploads (external URLs)" };
  }

  // Best-effort selectors, most specific first.
  const candidates = [
    'input[type="file"][accept*="image"]',
    'input[type="file"][multiple]',
    'input[type="file"]',
  ];
  for (const sel of candidates) {
    try {
      const input = page.locator(sel).first();
      if ((await input.count()) === 0) continue;
      await input.setInputFiles(paths, { timeout: 15_000 });
      logger.info({ count: paths.length, selector: sel }, "Photos uploaded to portal");
      return { uploaded: paths.length };
    } catch (e) {
      logger.warn(
        { selector: sel, err: e instanceof Error ? e.message : String(e) },
        "Photo upload attempt failed, trying next selector",
      );
    }
  }
  return { uploaded: 0, reason: "no file input found on the page" };
}

/** Drop the Playwright connection. Does NOT close Steel's browser itself. */
export async function disconnect(browser: Browser | undefined): Promise<void> {
  if (!browser) return;
  try {
    await browser.close();
  } catch {
    /* connection already gone — ignore */
  }
}
