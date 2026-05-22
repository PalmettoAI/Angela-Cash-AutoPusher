import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { PushFlow } from "./push-flow";

export const dynamic = "force-dynamic";

export default async function PushPage({
  params,
}: {
  params: { id: string };
}) {
  const [listing] = await db
    .select({ id: listings.id, title: listings.title })
    .from(listings)
    .where(eq(listings.id, params.id));

  if (!listing) notFound();

  return (
    <PushFlow
      listingId={listing.id}
      listingTitle={listing.title}
      paragonHref={`/listings/${listing.id}/paragon`}
    />
  );
}
