import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { brandedPhotos } from "../types";
import { loopnetMapping } from "./mapping";
import { fmtCurrency, fmtListingType, fmtNumber, fmtText, fullAddress } from "../_shared";
import type { Subtype } from "@/fields/types";

function valueFromListing(l: ListingWithRelations, key: string): unknown {
  if (key in l) return (l as Record<string, unknown>)[key];
  const sub = (l.subtypeFields ?? {}) as Record<string, unknown>;
  return sub[key];
}

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  const subtype = l.subtype as Subtype;
  const allMaps = [...loopnetMapping.common, ...(loopnetMapping.subtype[subtype] ?? [])];
  for (const f of allMaps) {
    const raw = valueFromListing(l, f.listing);
    const value = f.transform ? f.transform(raw) : (raw ?? f.defaultValue ?? null);
    payload[f.target] = value;
  }
  payload["__photos"] = brandedPhotos(l.photos).map((p) => ({ url: p.url, isPrimary: p.isPrimary }));
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
    return {
      status: "success" as const,
      payload,
      result: { stubbed: true, target: "loopnet.com (agent portal)" },
    } satisfies PushResult;
  },

  async preview(listing) {
    const subtype = listing.subtype as Subtype;
    const subtypeMap = loopnetMapping.subtype[subtype] ?? [];
    const fieldCount = loopnetMapping.common.length + subtypeMap.length;
    const photos = brandedPhotos(listing.photos);

    return {
      summary: `Playwright push to LoopNet agent portal — uses marketingRemarks + branded photos. ${fieldCount} fields mapped (${subtypeMap.length} subtype-specific for ${subtype}).`,
      sections: [
        {
          heading: "Listing",
          rows: [
            { label: "Listing Title", value: fmtText(listing.title) },
            { label: "Property Type", value: subtype },
            { label: "For", value: fmtListingType(listing.listingType) },
            { label: "Description", value: fmtText(listing.marketingRemarks) },
          ],
        },
        {
          heading: "Pricing",
          rows: [
            { label: "Price", value: fmtCurrency(listing.salePrice) },
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
            { label: "Total Building Size", value: fmtNumber(listing.buildingSqft) },
            { label: "Total Land Area (acres)", value: fmtNumber(listing.lotSizeAcres) },
            { label: "Year Built", value: fmtNumber(listing.yearBuilt) },
          ],
        },
        ...(subtypeMap.length
          ? [{
              heading: `Subtype-specific (${subtype})`,
              rows: subtypeMap.slice(0, 12).map((m) => {
                const v = valueFromListing(listing, m.listing);
                return {
                  label: m.target,
                  value: v === null || v === undefined || v === "" ? "—" : String(v),
                };
              }),
            }]
          : []),
        {
          heading: "Photos",
          rows: [{ label: "Branded photos available", value: String(photos.length) }],
        },
      ],
      consumedFields: [
        ...loopnetMapping.common.map((f) => f.listing),
        ...subtypeMap.map((f) => f.listing),
        "marketingRemarks",
      ],
    } satisfies DestinationPreview;
  },
};
