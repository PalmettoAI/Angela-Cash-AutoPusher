import { NextResponse } from "next/server";
import { readUpload } from "@/lib/upload-storage";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

function guessMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string; filename: string } },
) {
  const filename = decodeURIComponent(params.filename);
  const file = await readUpload(params.id, filename);
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": guessMime(filename),
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
