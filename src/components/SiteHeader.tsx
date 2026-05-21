"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // The login screen stands on its own — no nav chrome.
  if (pathname === "/login") return null;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold">
          Angela&apos;s Listing Pusher
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/listings/new" className="hover:underline">
            New listing
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
