import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { brandedPhotos } from "../types";
import { angelaSiteMapping } from "./mapping";
import { fmtCurrency, fmtListingType, fmtLeaseType, fmtText, fullAddress } from "../_shared";

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  return {
    title: l.title,
    // angelacash.com is Angela's own site — branding/contact info is welcome.
    description: l.marketingRemarks ?? l.publicRemarks ?? "",
    category: l.subtype,
    status: l.listingType,
    salePrice: l.salePrice,
    leaseRate: l.leaseRate,
    leaseType: l.leaseType,
    address: { street: l.street, city: l.city, state: l.state, zip: l.zip },
    size: { buildingSqft: l.buildingSqft, lotAcres: l.lotSizeAcres },
    yearBuilt: l.yearBuilt,
    zoning: l.zoning,
    agent: { name: l.agentName, email: l.agentEmail, phone: l.agentPhone },
    photos: brandedPhotos(l.photos).map((p) => ({ url: p.url, primary: p.isPrimary })),
    documents: (l.documents ?? []).map((d) => ({ url: d.url, label: d.label, kind: d.kind })),
  };
}

export const angelaSiteAdapter: DestinationAdapter = {
  key: "angela-site",
  displayName: "angelacash.com",

  buildPayload,

  async push(listing) {
    const payload = await buildPayload(listing);
    logger.info(
      { destination: "angela-site", listingId: listing.id, payload },
      "STUB push to angelacash.com",
    );
    // TODO: call angelacash.com internal listings API.
    return {
      status: "success" as const,
      payload,
      result: { stubbed: true },
    } satisfies PushResult;
  },

  async preview(listing) {
    return {
      summary: `Internal API push to angelacash.com — uses marketingRemarks + branded photos. ${angelaSiteMapping.fields.length} common fields mapped (subtype mapping TODO).`,
      sections: [
        {
          heading: "Identity",
          rows: [
            { label: "Title", value: fmtText(listing.title) },
            { label: "Category", value: listing.subtype },
            { label: "Status", value: fmtListingType(listing.listingType) },
          ],
        },
        {
          heading: "Pricing",
          rows: [
            { label: "Sale price", value: fmtCurrency(listing.salePrice) },
            { label: "Lease rate", value: fmtCurrency(listing.leaseRate) },
            { label: "Lease type", value: fmtLeaseType(listing.leaseType) },
          ],
        },
        {
          heading: "Address",
          rows: [{ label: "Address", value: fullAddress(listing) }],
        },
      ],
      consumedFields: angelaSiteMapping.fields.map((f) => f.listing),
    } satisfies DestinationPreview;
  },
};
