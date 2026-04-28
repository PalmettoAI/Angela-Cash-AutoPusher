"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface UploadedItem {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  // Photos only — branded photos may need a clean MLS-safe variant.
  hasBranding?: boolean;
  mlsSafeUrl?: string | null;
}

interface FileDropZoneProps {
  label: string;
  helpText?: string;
  accept?: string;
  // Multiple file selection allowed.
  multiple?: boolean;
  // Show the per-photo "branded" toggle.
  variant: "photo" | "document";
  value: UploadedItem[];
  onChange: (items: UploadedItem[]) => void;
}

async function uploadFiles(files: File[]): Promise<UploadedItem[]> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.files as UploadedItem[];
}

export function FileDropZone({
  label,
  helpText,
  accept,
  multiple = true,
  variant,
  value,
  onChange,
}: FileDropZoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;
      setBusy(true);
      setErr(null);
      try {
        const uploaded = await uploadFiles(arr);
        onChange([...value, ...uploaded]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-input bg-background",
          busy && "opacity-60 pointer-events-none",
        )}
      >
        <p className="text-sm font-medium">
          {busy ? "Uploading..." : "Drop files here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {accept ?? (variant === "photo" ? "JPG, PNG, WEBP" : "PDF, DOCX, etc.")} · 50 MB max each
        </p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept ?? (variant === "photo" ? "image/*" : undefined)}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((item, i) => (
            <li
              key={item.url}
              className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                {variant === "photo" && item.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-secondary text-xs">
                    FILE
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm">{item.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {(item.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {variant === "photo" && (
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={!!item.hasBranding}
                      onChange={(e) => {
                        const next = [...value];
                        next[i] = { ...item, hasBranding: e.target.checked };
                        onChange(next);
                      }}
                    />
                    Branded
                  </label>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = [...value];
                    next.splice(i, 1);
                    onChange(next);
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
