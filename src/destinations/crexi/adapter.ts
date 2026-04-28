import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { brandedPhotos } from "../types";
import { crexiMapping } from "./mapping";
import { fmtCurrency, fmtListingType, fmtLeaseType, fmtNumber, fmtText, fullAddress } from "../_shared";
import type { Subtype } from "@/fields/types";

function valueFromListing(l: ListingWithRelations, key: string): unknown {
  if (key in l) return (l as Record<string, unknown>)[key];
  const sub = (l.subtypeFields ?? {}) as Record<string, unknown>;
  return sub[key];
}

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  const subtype = l.subtype as Subtype;
  const allMaps = [...crexiMapping.common, ...(crexiMapping.subtype[subtype] ?? [])];
  for (const f of allMaps) {
    const raw = valueFromListing(l, f.listing);
    const value = f.transform ? f.transform(raw) : (raw ?? f.defaultValue ?? null);
    payload[f.target] = value;
  }
  payload["__photos"] = brandedPhotos(l.photos).map((p) => ({ url: p.url, isPrimary: p.isPrimary }));
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
    const subtype = listing.subtype as Subtype;
    const subtypeMap = crexiMapping.subtype[subtype] ?? [];
    const fieldCount = crexiMapping.common.length + subtypeMap.length;
    const photos = brandedPhotos(listing.photos);

    return {
      summary: `Playwright push to Crexi agent portal — uses marketingRemarks + branded photos. ${fieldCount} fields mapped (${subtypeMap.length} subtype-specific for ${subtype}).`,
      sections: [
        {
          heading: "Listing",
          rows: [
            { label: "Property Name", value: fmtText(listing.title) },
            { label: "Property Type", value: subtype },
            { label: "Listing Type", value: fmtListingType(listing.listingType) },
            { label: "Description", value: fmtText(listing.marketingRemarks) },
          ],
        },
        {
          heading: "Pricing",
          rows: [
            { label: "Asking Price", value: fmtCurrency(listing.salePrice) },
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
        ...crexiMapping.common.map((f) => f.listing),
        ...subtypeMap.map((f) => f.listing),
        "marketingRemarks",
      ],
    } satisfies DestinationPreview;
  },
};
