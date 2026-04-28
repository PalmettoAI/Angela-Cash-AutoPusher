import { NextResponse } from "next/server";
import { saveUpload } from "@/lib/upload-storage";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Allow large files; default body size cap is 4mb on App Router.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

export async function POST(req: Request) {
  const formData = await req.formData();
  const files = formData.getAll("files");
  if (!files.length) {
    return NextResponse.json({ error: "no files" }, { status: 400 });
  }

  const stored = [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: `${f.name} exceeds 50MB limit` }, { status: 413 });
    }
    const out = await saveUpload(f);
    stored.push(out);
  }

  logger.info({ count: stored.length }, "Files uploaded");
  return NextResponse.json({ files: stored });
}
