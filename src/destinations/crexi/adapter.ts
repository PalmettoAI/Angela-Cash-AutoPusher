import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { crexiMapping } from "./mapping";
import { fmtCurrency, fmtListingType, fmtLeaseType, fmtNumber, fmtText, fullAddress } from "../_shared";

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  for (const f of crexiMapping.fields) {
    const raw = (l as Record<string, unknown>)[f.listing];
    const value =
      "transform" in f && typeof f.transform === "function"
        ? (f.transform as (v: unknown) => unknown)(raw as never)
        : raw;
    payload[f.target] = value;
  }
  return payload;
}

export const crexiAdapter: DestinationAdapter = {
  key: "crexi",
  displayName: "Crexi",

  buildPayload,

  async push(listing) {
    const payload = await buildPayload(listing);
    logger.info(
      { destination: "crexi", listingId: listing.id, payload },
      "STUB Playwright push to Crexi agent portal",
    );
    // TODO: implement Playwright session against the Crexi agent portal.
    // Persisted session file must live in /sessions (gitignored).
    return {
      status: "success" as const,
      payload,
      result: { stubbed: true, target: "crexi.com (agent portal)" },
    } satisfies PushResult;
  },

  async preview(listing) {
    return {
      summary: `Playwright push to Crexi agent portal (${crexiMapping.fields.length} fields mapped, subtype mapping TODO)`,
      sections: [
        {
          heading: "Listing",
          rows: [
            { label: "Listing Name", value: fmtText(listing.title) },
            { label: "Property Subtype", value: listing.subtype },
            { label: "Listing Status", value: fmtListingType(listing.listingType) },
            { label: "Description", value: fmtText(listing.publicRemarks) },
          ],
        },
        {
          heading: "Pricing",
          rows: [
            { label: "Sale Price", value: fmtCurrency(listing.salePrice) },
            { label: "Lease Rate", value: fmtCurrency(listing.leaseRate) },
            { label: "Lease Type", value: fmtLeaseType(listing.leaseType) },
          ],
        },
        {
          heading: "Address",
          rows: [{ label: "Address", value: fullAddress(listing) }],
        },
        {
          heading: "Building",
          rows: [
            { label: "Building SF", value: fmtNumber(listing.buildingSqft) },
            { label: "Lot Acres", value: fmtNumber(listing.lotSizeAcres) },
            { label: "Year Built", value: fmtNumber(listing.yearBuilt) },
            { label: "Zoning", value: fmtText(listing.zoning) },
          ],
        },
      ],
      consumedFields: crexiMapping.fields.map((f) => f.listing),
    } satisfies DestinationPreview;
  },
};
