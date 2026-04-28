// Crexi mapping. Field NAMES are sourced from Crexi public listing pages and
// the public build-listing flow (April 2026). Required/optional flags marked
// `// TODO verify` were not visible without a logged-in agent session — verify
// once we have a Crexi agent account. Real push will use Playwright against
// the Crexi agent portal.

import type { Subtype } from "@/fields/types";

interface FieldMap {
  // Source listing field name (top-level column or jsonField key).
  listing: string;
  // Crexi form field label.
  target: string;
  required?: boolean;
  transform?: (v: unknown) => unknown;
  defaultValue?: unknown;
  notes?: string;
}

export const crexiCommonMapping: FieldMap[] = [
  { listing: "title", target: "Property Name", required: true },
  { listing: "subtype", target: "Property Type", required: true,
    transform: (v) =>
      ({
        office: "Office",
        retail: "Retail",
        industrial: "Industrial",
        land: "Land",
        multifamily: "Multifamily",
        mixed_use: "Mixed Use",
      }[v as string] ?? v) },
  { listing: "listingType", target: "Listing Type (Sale/Lease)", required: true,
    transform: (v) =>
      ({ for_sale: "For Sale", for_lease: "For Lease", both: "For Sale & Lease" }[v as string] ?? v) },
  { listing: "marketingRemarks", target: "Description",
    notes: "Crexi allows agent branding/contact info — use marketingRemarks, not publicRemarks." },
  { listing: "salePrice", target: "Asking Price" },
  { listing: "leaseRate", target: "Lease Rate" },
  { listing: "leaseType", target: "Lease Type",
    transform: (v) => v ? ({ nnn: "NNN", gross: "Gross", modified_gross: "Modified Gross" }[v as string] ?? v) : "" },
  { listing: "street", target: "Street Address", required: true },
  { listing: "city", target: "City", required: true },
  { listing: "state", target: "State", required: true },
  { listing: "zip", target: "Zip", required: true },
  { listing: "buildingSqft", target: "Square Footage" },
  { listing: "netRentableSqft", target: "Net Rentable (SqFt)" },
  { listing: "lotSizeAcres", target: "Lot Size (Acres)" },
  { listing: "yearBuilt", target: "Year Built" },
  { listing: "yearRenovated", target: "Year Renovated" },
  { listing: "numStories", target: "Stories" },
  { listing: "numBuildings", target: "Buildings" },
  { listing: "zoning", target: "Zoning" },
  { listing: "parkingSpaces", target: "Parking Spaces" },
  { listing: "parkingRatio", target: "Parking Per SqFt" },
  { listing: "occupancyPct", target: "Occupancy" },
  { listing: "occupancyDate", target: "Occupancy Date" },
  { listing: "apn", target: "APN" },
  { listing: "agentName", target: "Listing Agent",
    defaultValue: "Angela Cash" },
  { listing: "agentEmail", target: "Agent Email",
    defaultValue: "angela@angelacash.com" },
  { listing: "agentPhone", target: "Agent Phone" },
];

export const crexiSubtypeMappings: Record<Subtype, FieldMap[]> = {
  office: [
    { listing: "officeSubtypeDetail", target: "Property Subtype (1–3)", required: true,
      notes: "Crexi multi-select, max 3" },
    { listing: "buildingClass", target: "Class" },
    { listing: "tenancy", target: "Tenancy" },
  ],
  retail: [
    { listing: "retailSubtypeDetail", target: "Property Subtype (1–3)", required: true },
    { listing: "investmentType", target: "Investment Type" },
    { listing: "investmentSubType", target: "Investment Sub Type" },
    { listing: "buildingClass", target: "Class" },
    { listing: "tenancy", target: "Tenancy" },
    { listing: "anchorTenant", target: "Brand/Tenant" },
    { listing: "tenantCredit", target: "Tenant Credit" },
    { listing: "leaseTerm", target: "Lease Term" },
    { listing: "leaseCommencement", target: "Lease Commencement" },
    { listing: "leaseExpiration", target: "Lease Expiration" },
    { listing: "remainingTerm", target: "Remaining Term" },
    { listing: "rentBumps", target: "Rent Bumps" },
    { listing: "leaseOptions", target: "Lease Options" },
    { listing: "groundLease", target: "Ground Lease" },
    { listing: "capRate", target: "Cap Rate" },
    { listing: "noi", target: "NOI" },
  ],
  industrial: [
    { listing: "industrialSubtypeDetail", target: "Property Subtype (1–3)", required: true },
    { listing: "buildingClass", target: "Class" },
    { listing: "tenancy", target: "Tenancy" },
    { listing: "loadingDocks", target: "Loading Docks" },
    { listing: "dockHighDoors", target: "Dock High Doors" },
    { listing: "ceilingHeight", target: "Ceiling Height" },
  ],
  land: [
    { listing: "landSubtypeDetail", target: "Property Subtype (1–3)", required: true },
    { listing: "opportunityZone", target: "Opportunity Zone" },
    { listing: "pricePerAcre", target: "Price/Acre" },
    { listing: "pricePerSqftLand", target: "Price/SqFt" },
  ],
  multifamily: [
    { listing: "multifamilySubtypeDetail", target: "Property Subtype" },
    { listing: "numUnits", target: "Units", required: true },
    { listing: "pricePerUnit", target: "Price/Unit" },
    { listing: "capRate", target: "Cap Rate" },
    { listing: "proFormaCapRate", target: "Pro-Forma Cap Rate" },
    { listing: "noi", target: "NOI" },
    { listing: "proFormaNoi", target: "Pro-Forma NOI" },
  ],
  mixed_use: [
    { listing: "componentTypes", target: "Component Types",
      notes: "Crexi treats mixed-use as primary type + component subtypes" },
    { listing: "componentBreakdown", target: "Description (component breakdown)" },
    { listing: "numUnits", target: "Units (residential portion)" },
  ],
};

export const crexiMapping = {
  common: crexiCommonMapping,
  subtype: crexiSubtypeMappings,
} as const;
