import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, sessionMaxAge } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = body?.remember !== false; // default on

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Login isn't set up yet. (APP_PASSWORD is missing.)" },
      { status: 500 },
    );
  }
  if (password !== expected) {
    return NextResponse.json(
      { error: "That password didn't work. Please try again." },
      { status: 401 },
    );
  }

  const maxAge = sessionMaxAge(remember);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(maxAge), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge,
  });
  return res;
}
