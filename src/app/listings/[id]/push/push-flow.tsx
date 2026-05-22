"use client";

// The guided push screen. Angela watches the real browser in the embedded
// Steel viewer, does her own logins in it, and the bot fills the forms.
// Designed to be obvious for a non-technical user: one big instruction,
// one big button, a 3-step checklist.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PushRunView } from "@/lib/browser-push/runs";

export function PushFlow({
  listingId,
  listingTitle,
  paragonHref,
}: {
  listingId: string;
  listingTitle: string;
  paragonHref: string;
}) {
  const router = useRouter();
  const [run, setRun] = useState<PushRunView | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const startedRef = useRef(false);
  // Mirrors `working` for the poll loop — lets the poll skip while an action
  // is in flight, so a stale poll can't overwrite the fresh action result.
  const workingRef = useRef(false);

  const start = useCallback(async () => {
    setStartError(null);
    setRun(null);
    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStartError(data?.error || "Couldn't start the push. Please try again.");
        return;
      }
      setRun(data as PushRunView);
    } catch {
      setStartError(
        "Couldn't reach the server. Check your internet and try again.",
      );
    }
  }, [listingId]);

  // Start one run on mount (ref guards against React StrictMode double-run).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, [start]);

  // Poll run state while a push is in progress.
  useEffect(() => {
    const runId = run?.id;
    if (!runId || run?.phase === "done" || run?.phase === "failed") return;
    const timer = setInterval(async () => {
      if (workingRef.current) return; // an action is mid-flight — don't clobber it
      try {
        const res = await fetch(`/api/push/${runId}`);
        if (res.ok && !workingRef.current) {
          setRun((await res.json()) as PushRunView);
        }
      } catch {
        /* transient — keep polling */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [run?.id, run?.phase]);

  const act = useCallback(
    async (action: "advance" | "skip") => {
      if (!run || working) return;
      workingRef.current = true;
      setWorking(true);
      try {
        const res = await fetch(`/api/push/${run.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) setRun((await res.json()) as PushRunView);
      } catch {
        /* leave state; the poll will recover it */
      } finally {
        workingRef.current = false;
        setWorking(false);
      }
    },
    [run, working],
  );

  const end = useCallback(async () => {
    if (run) {
      try {
        await fetch(`/api/push/${run.id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
    }
    router.push("/");
  }, [run, router]);

  // ── start / error states ────────────────────────────────────────────────
  if (startError) {
    return (
      <Shell title={listingTitle}>
        <div className="rounded-lg border bg-card p-6">
          <p className="font-medium text-destructive">Couldn&apos;t get started</p>
          <p className="mt-1 text-sm text-muted-foreground">{startError}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void start()}>Try again</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!run) {
    return (
      <Shell title={listingTitle}>
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Opening the browser…
        </div>
      </Shell>
    );
  }

  const current = run.portals[run.currentIndex];
  const isLast = run.currentIndex >= run.portals.length - 1;

  return (
    <Shell title={listingTitle} onEnd={end}>
      {/* checklist */}
      <ol className="flex flex-wrap items-center gap-2">
        {run.portals.map((p, i) => (
          <li
            key={p.key}
            className={
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm " +
              (i === run.currentIndex
                ? "border-primary bg-primary/5 font-medium"
                : "text-muted-foreground")
            }
          >
            <StepMark status={p.status} index={i} />
            {p.displayName}
          </li>
        ))}
      </ol>

      {/* instruction banner */}
      <div className="rounded-lg border bg-card p-5">
        {run.phase === "done" ? (
          <p className="text-lg font-medium text-green-700">✓ {run.message}</p>
        ) : run.phase === "failed" ? (
          <p className="font-medium text-destructive">{run.message}</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {current ? `Step ${run.currentIndex + 1} of ${run.portals.length} · ${current.displayName}` : "Working"}
            </p>
            <p className="mt-1 text-base">{run.message}</p>
            {current?.note && (
              <p className="mt-2 text-sm text-muted-foreground">{current.note}</p>
            )}
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {run.phase === "awaiting_login" && current && (
            <>
              {current.kind === "assisted" && (
                <Button variant="outline" asChild>
                  <a href={paragonHref} target="_blank" rel="noopener noreferrer">
                    Open the copy-paste sheet
                  </a>
                </Button>
              )}
              <Button onClick={() => void act("advance")} disabled={working}>
                {working
                  ? current.kind === "automated"
                    ? "Filling in your listing…"
                    : "One moment…"
                  : current.kind === "automated"
                    ? "Fill it in for me"
                    : "I've started it — continue"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => void act("skip")}
                disabled={working}
              >
                Skip this site
              </Button>
            </>
          )}

          {run.phase === "filling" && (
            <Button disabled>Filling in your listing…</Button>
          )}

          {run.phase === "awaiting_review" && (
            <Button onClick={() => void act("advance")} disabled={working}>
              {working ? "One moment…" : isLast ? "Finish" : "Next site →"}
            </Button>
          )}

          {(run.phase === "done" || run.phase === "failed") && (
            <>
              <Button onClick={() => router.push("/")}>Back to dashboard</Button>
              {run.phase === "failed" && (
                <Button variant="outline" onClick={() => void start()}>
                  Start over
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* live browser */}
      {run.phase !== "done" && run.phase !== "failed" && (
        <div>
          <iframe
            src={run.viewerUrl}
            title="Live browser"
            className="h-[600px] w-full rounded-lg border bg-muted"
            allow="clipboard-read; clipboard-write"
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            This is the real browser. Type your logins straight into the window
            above — nothing is stored.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({
  title,
  onEnd,
  children,
}: {
  title: string;
  onEnd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Push this listing</h1>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        {onEnd && (
          <Button variant="outline" size="sm" onClick={onEnd}>
            End &amp; close
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function StepMark({
  status,
  index,
}: {
  status: "pending" | "active" | "done" | "failed";
  index: number;
}) {
  const base =
    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ";
  if (status === "done")
    return <span className={base + "bg-green-600 text-white"}>✓</span>;
  if (status === "failed")
    return <span className={base + "bg-destructive text-white"}>✕</span>;
  if (status === "active")
    return <span className={base + "bg-primary text-primary-foreground"}>{index + 1}</span>;
  return <span className={base + "bg-muted text-muted-foreground"}>{index + 1}</span>;
}
