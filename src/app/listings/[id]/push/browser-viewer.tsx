"use client";

// The live browser viewer. Polls JPEG screenshots of the Steel browser and
// forwards Angela's clicks / keystrokes back into it — so she can do her own
// portal logins right here. Built on the AutoPusher's own CDP connection, so
// it doesn't depend on Steel's (flaky) built-in session player.

import { useCallback, useEffect, useRef, useState } from "react";

// Non-printable keys we forward by name (Playwright understands these).
const SPECIAL_KEYS = new Set([
  "Enter",
  "Backspace",
  "Tab",
  "Delete",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

export function BrowserViewer({
  runId,
  interactive,
}: {
  runId: string;
  interactive: boolean;
}) {
  const [frame, setFrame] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Poll screenshots and swap frames cleanly via object URLs.
  useEffect(() => {
    let active = true;
    let lastUrl: string | null = null;
    async function tick() {
      if (!active) return;
      try {
        const res = await fetch(`/api/push/${runId}/screen?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (active && res.status === 200) {
          const url = URL.createObjectURL(await res.blob());
          setFrame(url);
          if (lastUrl) URL.revokeObjectURL(lastUrl);
          lastUrl = url;
        }
      } catch {
        /* keep the last frame */
      }
      if (active) setTimeout(tick, 850);
    }
    tick();
    return () => {
      active = false;
      if (lastUrl) URL.revokeObjectURL(lastUrl);
    };
  }, [runId]);

  const send = useCallback(
    async (event: Record<string, unknown>) => {
      try {
        await fetch(`/api/push/${runId}/input`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
        });
      } catch {
        /* a dropped input is harmless — she can click again */
      }
    },
    [runId],
  );

  function fractions(e: React.MouseEvent<HTMLImageElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      xFrac: (e.clientX - r.left) / r.width,
      yFrac: (e.clientY - r.top) / r.height,
    };
  }

  return (
    <div>
      <div
        ref={wrapRef}
        tabIndex={0}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key.length === 1) {
            e.preventDefault();
            void send({ kind: "text", text: e.key });
          } else if (SPECIAL_KEYS.has(e.key)) {
            e.preventDefault();
            void send({ kind: "key", key: e.key });
          }
        }}
        className={`overflow-hidden rounded-lg border bg-muted outline-none ${
          focused && interactive ? "ring-2 ring-primary" : ""
        }`}
      >
        {frame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame}
            alt="Live browser"
            draggable={false}
            onClick={(e) => {
              wrapRef.current?.focus();
              if (interactive) void send({ kind: "click", ...fractions(e) });
            }}
            onWheel={(e) => {
              if (interactive) void send({ kind: "scroll", dy: e.deltaY });
            }}
            className="block w-full select-none"
            style={{
              aspectRatio: "1280 / 800",
              cursor: interactive ? "crosshair" : "default",
            }}
          />
        ) : (
          <div className="flex h-[460px] items-center justify-center text-sm text-muted-foreground">
            Loading the browser…
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {interactive
          ? "This is the live browser — click it, then type. Your logins go straight in and nothing is stored."
          : "The bot is filling in your listing — sit tight."}
      </p>
    </div>
  );
}
