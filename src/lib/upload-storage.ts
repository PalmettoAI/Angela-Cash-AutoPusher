import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

// Where uploaded files live. In production (Railway) this is the mount path
// of the persistent volume; locally it falls back to ./uploads.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? "/app/uploads";

const SAFE_NAME_RE = /[^A-Za-z0-9._-]+/g;

export interface StoredFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}

function safeFilename(original: string): string {
  const base = original.replace(SAFE_NAME_RE, "_").slice(0, 120);
  return base || `file${extname(original) || ""}`;
}

export async function saveUpload(file: File): Promise<StoredFile> {
  const id = randomUUID();
  const filename = safeFilename(file.name);
  const dir = join(UPLOAD_ROOT, id);
  await mkdir(dir, { recursive: true });
  const dest = join(dir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, bytes);
  return {
    id,
    filename,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    url: `/api/uploads/${id}/${encodeURIComponent(filename)}`,
  };
}

export async function readUpload(id: string, filename: string): Promise<{ bytes: Buffer; size: number } | null> {
  // Defense against path traversal: id must be uuid-shaped, filename must
  // not contain slashes.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (filename.includes("/") || filename.includes("..")) return null;
  const path = join(UPLOAD_ROOT, id, filename);
  try {
    const s = await stat(path);
    const bytes = await readFile(path);
    return { bytes, size: s.size };
  } catch {
    return null;
  }
}
