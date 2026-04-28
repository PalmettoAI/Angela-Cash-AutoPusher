import { logger } from "@/lib/logger";
import type { DestinationAdapter, ListingWithRelations, PushResult, DestinationPreview } from "../types";
import { mlsSafePhotos } from "../types";
import { paragonPasteSections } from "./mapping";
import { fmtCurrency, fmtLeaseType, fmtListingType, fmtNumber, fmtText } from "../_shared";
import type { Subtype } from "@/fields/types";

function valueFromListing(l: ListingWithRelations, key: string): unknown {
  if (key in l) return (l as Record<string, unknown>)[key];
  const sub = (l.subtypeFields ?? {}) as Record<string, unknown>;
  return sub[key];
}

function valueFor(listing: ListingWithRelations, key: string, transform?: (v: unknown) => unknown): string {
  const raw = transform ? transform(valueFromListing(listing, key)) : valueFromListing(listing, key);
  switch (key) {
    case "salePrice":
    case "leaseRate":
    case "pricePerAcre":
    case "pricePerSqftLand":
    case "noi":
    case "grossIncome":
    case "expenses":
    case "pricePerUnit":
      return fmtCurrency(raw as string | number | null);
    case "buildingSqft":
    case "lotSizeAcres":
    case "yearBuilt":
    case "parkingSpaces":
    case "parkingRatio":
    case "numStories":
    case "numUnits":
    case "numRestrooms":
    case "ceilingHeight":
    case "clearCeilingHeight":
    case "loadingDocks":
    case "dockHighDoors":
    case "driveInDoors":
    case "truckDoors":
    case "amps":
    case "phase":
    case "volts":
    case "fencedSqft":
    case "streetFrontage":
    case "occupancyPct":
    case "minSfAvailable":
    case "maxContiguousSf":
    case "netRentableSqft":
    case "carsPerDay":
    case "capRate":
    case "proFormaCapRate":
    case "proFormaNoi":
      return fmtNumber(raw as number | null);
    case "listingType":
      return fmtListingType(raw as ListingWithRelations["listingType"]);
    case "leaseType":
      return fmtLeaseType(raw as ListingWithRelations["leaseType"]);
    default:
      if (raw === null || raw === undefined || raw === "") return "—";
      if (typeof raw === "boolean") return raw ? "Yes" : "No";
      if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";
      return String(raw);
  }
}

function applicableSections(subtype: Subtype) {
  return paragonPasteSections.filter((s) => !s.subtypes || s.subtypes.includes(subtype));
}

async function buildPayload(l: ListingWithRelations): Promise<Record<string, unknown>> {
  const subtype = l.subtype as Subtype;
  const out: Record<string, unknown> = {};
  for (const section of applicableSections(subtype)) {
    out[section.heading] = section.rows.map((r) => ({
      paragonField: r.paragonField,
      value: valueFor(l, r.listing, r.transform),
      verified: r.verified ?? false,
    }));
  }
  out["__mlsSafePhotos"] = mlsSafePhotos(l.photos).map((p) => ({ url: p.url, isPrimary: p.isPrimary }));
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
    const subtype = listing.subtype as Subtype;
    const sections = applicableSections(subtype);
    const consumed = new Set<string>();
    const previewSections = sections.map((s) => ({
      heading: s.heading,
      rows: s.rows.map((r) => {
        consumed.add(r.listing);
        return { label: r.paragonField, value: valueFor(listing, r.listing, r.transform) };
      }),
    }));
    const safePhotos = mlsSafePhotos(listing.photos);
    return {
      summary: `Manual entry (no automated push). Uses publicRemarks (MLS-safe) + ${safePhotos.length} MLS-safe photo(s). ⚠️ All Paragon field labels are UNVERIFIED — confirm against agent screenshots.`,
      sections: previewSections,
      consumedFields: [...consumed],
    } satisfies DestinationPreview;
  },
};
