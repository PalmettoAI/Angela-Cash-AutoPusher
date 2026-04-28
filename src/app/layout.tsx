import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Angela Cash Listing Push Hub",
  description: "Single-entry listing form that pushes to Crexi, LoopNet, angelacash.com, and Paragon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-semibold">
              Listing Push Hub
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/listings/new" className="hover:underline">
                New listing
              </Link>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
