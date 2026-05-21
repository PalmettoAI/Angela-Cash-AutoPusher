// Single-user session auth. One shared password (APP_PASSWORD); a signed,
// expiring cookie keeps Angela logged in. Uses Web Crypto so the same code
// runs in middleware (Edge runtime) and in route handlers (Node runtime).
//
// Token format:  v1.<expiryMs>.<base64url(HMAC-SHA256(v1.<expiryMs>))>

export const SESSION_COOKIE = "acp_session";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SHORT_MAX_AGE = 60 * 60 * 12; //          12 hours

export function sessionMaxAge(remember: boolean): number {
  return remember ? REMEMBER_MAX_AGE : SHORT_MAX_AGE;
}

function signingSecret(): string {
  // SESSION_SECRET is preferred; fall back to APP_PASSWORD so the app still
  // works if only the password is configured. Dev fallback is intentionally
  // obvious so a missing secret in production is easy to spot.
  return (
    process.env.SESSION_SECRET ||
    process.env.APP_PASSWORD ||
    "dev-insecure-secret-set-SESSION_SECRET"
  );
}

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64url(sig);
}

export async function createSessionToken(maxAgeSeconds: number): Promise<string> {
  const payload = `v1.${Date.now() + maxAgeSeconds * 1000}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiry, signature] = parts;
  if (version !== "v1") return false;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = await hmac(`${version}.${expiry}`);
  if (expected.length !== signature.length) return false;
  // constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
