"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PushControls({
  listingId,
  destinationKey,
  variant = "outline",
  label = "Retry",
}: {
  listingId: string;
  destinationKey: string;
  variant?: "default" | "outline" | "ghost";
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function trigger() {
    setBusy(true);
    try {
      await fetch(`/api/listings/${listingId}/push/${destinationKey}`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={variant} disabled={busy} onClick={trigger}>
      {busy ? "..." : label}
    </Button>
  );
}
