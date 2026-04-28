"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value === "—" ? "" : value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Button size="sm" variant="ghost" type="button" onClick={copy} className="h-7 px-2">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
