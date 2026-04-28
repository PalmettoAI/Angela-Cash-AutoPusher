import { NextResponse } from "next/server";
import { db } from "@/db";
import { listings, listingPhotos, listingDocuments, pushAttempts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdapter, destinationAdapters } from "@/destinations";
import type { ListingWithRelations } from "@/destinations/types";
import { logger } from "@/lib/logger";

async function loadListing(id: string): Promise<ListingWithRelations | null> {
  const [row] = await db.select().from(listings).where(eq(listings.id, id));
  if (!row) return null;
  const [photos, documents] = await Promise.all([
    db.select().from(listingPhotos).where(eq(listingPhotos.listingId, id)),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, id)),
  ]);
  return { ...row, photos, documents };
}

async function pushOne(listing: ListingWithRelations, key: string) {
  const adapter = getAdapter(key);
  if (!adapter) return { key, error: `unknown destination: ${key}` };

  const [attempt] = await db
    .insert(pushAttempts)
    .values({ listingId: listing.id, destinationKey: key, status: "pending" })
    .returning();

  try {
    const result = await adapter.push(listing);
    await db
      .update(pushAttempts)
      .set({
        status: result.status,
        payload: result.payload,
        result: result.result ?? null,
        errorMessage: result.errorMessage ?? null,
        completedAt: new Date(),
      })
      .where(eq(pushAttempts.id, attempt.id));
    return { key, attemptId: attempt.id, status: result.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(pushAttempts)
      .set({ status: "failed", errorMessage: msg, completedAt: new Date() })
      .where(eq(pushAttempts.id, attempt.id));
    logger.error({ destination: key, error: msg }, "Push attempt failed");
    return { key, attemptId: attempt.id, status: "failed", error: msg };
  }
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string; destinationKey: string } },
) {
  const listing = await loadListing(params.id);
  if (!listing) return NextResponse.json({ error: "listing not found" }, { status: 404 });

  if (params.destinationKey === "all") {
    const results = await Promise.all(
      destinationAdapters.map((a) => pushOne(listing, a.key)),
    );
    return NextResponse.json({ results });
  }

  const result = await pushOne(listing, params.destinationKey);
  return NextResponse.json(result);
}
