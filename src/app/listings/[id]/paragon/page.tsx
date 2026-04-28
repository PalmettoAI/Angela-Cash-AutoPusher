import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, listingPhotos, listingDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { paragonPasteAdapter } from "@/destinations/paragon-paste/adapter";
import type { ListingWithRelations } from "@/destinations/types";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function ParagonPastePage({ params }: { params: { id: string } }) {
  const [row] = await db.select().from(listings).where(eq(listings.id, params.id));
  if (!row) notFound();

  const [photos, docs] = await Promise.all([
    db.select().from(listingPhotos).where(eq(listingPhotos.listingId, params.id)),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, params.id)),
  ]);

  const listing: ListingWithRelations = { ...row, photos, documents: docs };
  const preview = await paragonPasteAdapter.preview(listing);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Paragon paste helper</h1>
          <p className="text-sm text-muted-foreground">
            {listing.title} — copy each value into Paragon&apos;s entry form. Section order
            roughly mirrors Paragon&apos;s flow; refine once we sit at the screen.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/listings/${listing.id}`}>Back to listing</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {preview.sections.map((s) => (
          <Card key={s.heading}>
            <CardHeader>
              <CardTitle className="text-base">{s.heading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.rows.map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.label}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <span className="break-words text-sm">{r.value}</span>
                    <CopyButton value={r.value} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
