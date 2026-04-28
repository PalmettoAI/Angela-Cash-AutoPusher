import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, listingPhotos, listingDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { destinationAdapters } from "@/destinations";
import type { ListingWithRelations } from "@/destinations/types";
import { PushControls } from "../push-controls";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const [row] = await db.select().from(listings).where(eq(listings.id, params.id));
  if (!row) notFound();

  const [photos, docs] = await Promise.all([
    db.select().from(listingPhotos).where(eq(listingPhotos.listingId, params.id)),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, params.id)),
  ]);

  const listing: ListingWithRelations = { ...row, photos, documents: docs };

  const previews = await Promise.all(
    destinationAdapters.map(async (a) => ({
      adapter: a,
      preview: await a.preview(listing),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Review & push</h1>
          <p className="text-sm text-muted-foreground">
            {listing.title} — preview each destination, then approve individually or publish to all.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/listings/${listing.id}`}>Back to listing</Link>
          </Button>
          <PushControls
            listingId={listing.id}
            destinationKey="all"
            variant="default"
            label="Publish to all"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {previews.map(({ adapter, preview }) => (
          <Card key={adapter.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{adapter.displayName}</CardTitle>
                  {preview.summary && (
                    <CardDescription className="mt-1">{preview.summary}</CardDescription>
                  )}
                </div>
                <PushControls listingId={listing.id} destinationKey={adapter.key} label="Approve & push" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.sections.map((s) => (
                <div key={s.heading}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.heading}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {s.rows.map((r) => (
                      <div key={r.label} className="contents">
                        <dt className="text-muted-foreground">{r.label}</dt>
                        <dd className="break-words">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {adapter.key === "paragon-paste" && (
                <div>
                  <Button asChild variant="link" className="px-0">
                    <Link href={`/listings/${listing.id}/paragon`}>Open full paste view →</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
