import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { paragonPasteMapping } from "./mapping";
import { fmtCurrency, fmtLeaseType, fmtListingType, fmtNumber, fmtText } from "../_shared";

function valueFor(listing: ListingWithRelations, key: string): string {
  const raw = (listing as Record<string, unknown>)[key];
  switch (key) {
    case "salePrice":
    case "leaseRate":
      return fmtCurrency(raw as string | number | null);
    case "buildingSqft":
    case "lotSizeAcres":
    case "yearBuilt":
    case "parkingSpaces":
    case "parkingRatio":
      return fmtNumber(raw as number | null);
    case "listingType":
      return fmtListingType(raw as ListingWithRelations["listingType"]);
    case "leaseType":
      return fmtLeaseType(raw as ListingWithRelations["leaseType"]);
    default:
      return fmtText(raw as string | null | undefined);
  }
}

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const section of paragonPasteMapping.sections) {
    out[section.heading] = section.rows.map((r) => ({
      paragonField: r.paragonField,
      value: valueFor(l, r.listing),
    }));
  }
  return out;
}

export const paragonPasteAdapter: DestinationAdapter = {
  key: "paragon-paste",
  displayName: "Paragon (copy-paste)",

  buildPayload,

  async push(listing) {
    logger.info(
      { destination: "paragon-paste", listingId: listing.id },
      "Paragon paste — no-op push (manual entry)",
    );
    return {
      status: "success" as const,
      payload: { note: "Paragon entry is manual; see /paragon view" },
      result: { stubbed: true, manual: true },
    } satisfies PushResult;
  },

  async preview(listing) {
    const consumed = new Set<string>();
    const sections = paragonPasteMapping.sections.map((s) => ({
      heading: s.heading,
      rows: s.rows.map((r) => {
        consumed.add(r.listing);
        return { label: r.paragonField, value: valueFor(listing, r.listing) };
      }),
    }));
    return {
      summary:
        "No automated push — Paragon (CMLS) is manual entry. Use the dedicated paste view to copy fields one at a time.",
      sections,
      consumedFields: [...consumed],
    } satisfies DestinationPreview;
  },
};
