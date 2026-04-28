import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { loopnetMapping } from "./mapping";
import { fmtCurrency, fmtListingType, fmtNumber, fmtText, fullAddress } from "../_shared";

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  for (const f of loopnetMapping.fields) {
    const raw = (l as Record<string, unknown>)[f.listing];
    const value =
      "transform" in f && typeof f.transform === "function"
        ? (f.transform as (v: unknown) => unknown)(raw as never)
        : raw;
    payload[f.target] = value;
  }
  return payload;
}

export const loopnetAdapter: DestinationAdapter = {
  key: "loopnet",
  displayName: "LoopNet",

  buildPayload,

  async push(listing) {
    const payload = await buildPayload(listing);
    logger.info(
      { destination: "loopnet", listingId: listing.id, payload },
      "STUB Playwright push to LoopNet agent portal",
    );
    // TODO: implement Playwright session against the LoopNet agent portal.
    return {
      status: "success" as const,
      payload,
      result: { stubbed: true, target: "loopnet.com (agent portal)" },
    } satisfies PushResult;
  },

  async preview(listing) {
    return {
      summary: `Playwright push to LoopNet agent portal (${loopnetMapping.fields.length} fields mapped, subtype mapping TODO)`,
      sections: [
        {
          heading: "Listing",
          rows: [
            { label: "Listing Title", value: fmtText(listing.title) },
            { label: "Property Type", value: listing.subtype },
            { label: "For", value: fmtListingType(listing.listingType) },
          ],
        },
        {
          heading: "Pricing",
          rows: [
            { label: "Asking Price", value: fmtCurrency(listing.salePrice) },
            { label: "Asking Rent", value: fmtCurrency(listing.leaseRate) },
          ],
        },
        {
          heading: "Address",
          rows: [{ label: "Address", value: fullAddress(listing) }],
        },
        {
          heading: "Building",
          rows: [
            { label: "Building Size", value: fmtNumber(listing.buildingSqft) },
            { label: "Land Area (acres)", value: fmtNumber(listing.lotSizeAcres) },
            { label: "Year Built", value: fmtNumber(listing.yearBuilt) },
          ],
        },
      ],
      consumedFields: loopnetMapping.fields.map((f) => f.listing),
    } satisfies DestinationPreview;
  },
};
