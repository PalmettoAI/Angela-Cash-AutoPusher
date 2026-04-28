// LoopNet (CoStar Marketing Center) mapping. Field NAMES from LoopNet help
// docs and public listing pages (April 2026). The agent-side editor is
// login-gated and likely has additional fields not surfaced here — treat as
// a starting point and extend once we record an editor session. Real push
// will use Playwright against the LoopNet agent portal.

import type { Subtype } from "@/fields/types";

interface FieldMap {
  listing: string;
  target: string;
  required?: boolean;
  transform?: (v: unknown) => unknown;
  defaultValue?: unknown;
  notes?: string;
}

export const loopnetCommonMapping: FieldMap[] = [
  { listing: "title", target: "Listing Title", required: true },
  { listing: "subtype", target: "Property Type", required: true,
    transform: (v) =>
      ({
        office: "Office",
        retail: "Retail",
        industrial: "Industrial",
        land: "Land",
        multifamily: "Multifamily",
        mixed_use: "Specialty",
      }[v as string] ?? v) },
  { listing: "listingType", target: "For", required: true,
    transform: (v) =>
      ({ for_sale: "Sale", for_lease: "Lease", both: "Sale or Lease" }[v as string] ?? v) },
  { listing: "marketingRemarks", target: "Property Description", required: true,
    notes: "LoopNet allows agent branding — use marketingRemarks." },
  { listing: "salePrice", target: "Price" },
  { listing: "leaseRate", target: "Asking Rent (PSF/Yr)" },
  { listing: "street", target: "Address Line 1", required: true },
  { listing: "city", target: "City", required: true },
  { listing: "state", target: "State", required: true },
  { listing: "zip", target: "Postal Code", required: true },
  { listing: "buildingSqft", target: "Total Building Size" },
  { listing: "lotSizeAcres", target: "Total Land Area (acres)" },
  { listing: "yearBuilt", target: "Year Built" },
  { listing: "numStories", target: "No. Stories" },
  { listing: "tenancy", target: "Tenancy" },
  { listing: "zoning", target: "Zoning Designation" },
  { listing: "parkingSpaces", target: "Total Parking Spaces" },
  { listing: "parkingRatio", target: "Parking Ratio" },
  { listing: "apn", target: "APN / Parcel ID" },
  { listing: "agentName", target: "Broker", defaultValue: "Angela Cash" },
  { listing: "agentEmail", target: "Broker Email", defaultValue: "angela@angelacash.com" },
  { listing: "agentPhone", target: "Broker Phone" },
];

export const loopnetSubtypeMappings: Record<Subtype, FieldMap[]> = {
  office: [
    { listing: "officeSubtypeDetail", target: "Office Type (Office/Medical/Coworking/Lab)" },
    { listing: "buildingClass", target: "Class" },
  ],
  retail: [
    { listing: "retailSubtypeDetail", target: "Retail Type (Retail/Restaurant/Shopping Center)" },
    { listing: "investmentType", target: "Sale Type",
      notes: "LoopNet sale type enum: Owner/User, Investment, Investment NNN, Investment or Owner User" },
    { listing: "capRate", target: "Cap Rate" },
    { listing: "noi", target: "NOI" },
    { listing: "anchorTenant", target: "Anchor Tenant" },
  ],
  industrial: [
    { listing: "industrialSubtypeDetail", target: "Industrial Type (Industrial/Flex)" },
    { listing: "clearCeilingHeight", target: "Clear Ceiling Height" },
    { listing: "dockHighDoors", target: "No. Dock-High Doors/Loading" },
    { listing: "driveInDoors", target: "No. Drive In / Grade-Level Doors" },
    { listing: "industrialUtilities", target: "Utilities" },
  ],
  land: [
    { listing: "landSubtypeDetail", target: "Land Type" },
    { listing: "investmentType", target: "Sale Type" },
  ],
  multifamily: [
    { listing: "numUnits", target: "Units",
      notes: "Not consistently exposed publicly — verify when wiring real Playwright" },
    { listing: "capRate", target: "Cap Rate" },
    { listing: "noi", target: "NOI" },
    { listing: "occupancyPct", target: "Occupancy" },
  ],
  mixed_use: [
    { listing: "componentTypes", target: "Primary Property Type",
      notes: "Pick primary type; use alsoMarketAs for additional types (max 3)" },
    { listing: "alsoMarketAs", target: "Also Market As (up to 3)" },
    { listing: "componentBreakdown", target: "Description (component breakdown)" },
  ],
};

export const loopnetMapping = {
  common: loopnetCommonMapping,
  subtype: loopnetSubtypeMappings,
} as const;
