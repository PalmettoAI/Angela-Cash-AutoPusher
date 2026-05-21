import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Angela's Listing Pusher",
  description:
    "Fill in a listing once — push it to Crexi, LoopNet, and Paragon in one go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
