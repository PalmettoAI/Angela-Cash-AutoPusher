// ═══════════════════════════════════════════════════════════════════════════
// CMLS-SPECIFIC FIELDS UNVERIFIED — confirm against agent screenshots before
// relying on this mapping.
//
// Field labels and section ordering below are INFERRED from generic Paragon
// commercial input forms published by a different MLS (CRMLS, 2018 PDFs).
// CMLS (Columbia MLS) uses the Paragon platform but its actual current
// commercial listing-entry screens are login-gated and were not publicly
// available during research. Field names, required/optional flags, and even
// section presence may differ in the real CMLS UI.
//
// What IS verified (use confidently):
//   - The status enum (statusEnumOptions below) — from CMLS's published
//     status cheat sheet.
//   - The CMLS rules around public remarks / photos — see compliance
//     warnings on the review screen and in /lib/cmls-compliance.ts.
//
// Action item: when Angela next sits at the Paragon entry screen, take a
// screenshot of every section + every dropdown's full option list, then
// diff against this file and update.
// ═══════════════════════════════════════════════════════════════════════════

import type { Subtype } from "@/fields/types";

interface PasteRow {
  listing: string;
  paragonField: string;
  // True if confirmed against real CMLS form. All current rows are false.
  verified?: boolean;
  transform?: (v: unknown) => unknown;
  notes?: string;
}

// CMLS listing status enum — VERIFIED from CMLS 2023 status cheat sheet.
export const cmlsStatusOptions = [
  { value: "ACT", label: "Active" },
  { value: "OTB", label: "On the Block" },
  { value: "CSC", label: "Contingent on Sale and Closing" },
  { value: "AOC", label: "Active other Contingency" },
  { value: "PEN", label: "Pending" },
  { value: "PCI", label: "Pending Contingent upon Inspection" },
  { value: "P3P", label: "Pending 3rd Party Approval" },
  { value: "CCL", label: "Contingent on Closing" },
  { value: "SBL", label: "Sold Before Listed" },
  { value: "BRS", label: "Buyer Represented Sale" },
  { value: "CLS", label: "Closed" },
  { value: "X21", label: "Expired/Relist" },
  { value: "EXP", label: "Expired" },
  { value: "WT", label: "Withdrawn Temporarily" },
  { value: "W", label: "Withdrawn" },
];

// Generic Paragon enum samples — UNVERIFIED for CMLS.
export const paragonListingTypeOptions = [
  { value: "exclusive_agency", label: "Exclusive Agency" },
  { value: "exclusive_right", label: "Exclusive Right" },
  { value: "exclusive_right_w_exception", label: "Exclusive Right w/ Exception" },
  { value: "open_listing", label: "Open Listing" },
  { value: "probate", label: "Probate" },
];

export const paragonCommercialPropertyTypeOptions = [
  { value: "industrial_lease", label: "Industrial Lease" },
  { value: "industrial_sale", label: "Industrial Sale" },
  { value: "office_lease", label: "Office Lease" },
  { value: "office_sale", label: "Office Sale" },
  { value: "retail_lease", label: "Retail Lease" },
  { value: "retail_sale", label: "Retail Sale" },
];

interface PasteSection {
  heading: string;
  // Subtypes this section is shown for. Empty = all.
  subtypes?: Subtype[];
  rows: PasteRow[];
}

export const paragonPasteSections: PasteSection[] = [
  {
    heading: "General",
    rows: [
      { listing: "title", paragonField: "Listing Title" },
      { listing: "listingType", paragonField: "Status",
        notes: "CMLS uses ACT/OTB/CSC/AOC/PEN/etc. — see cmlsStatusOptions",
        transform: (v) =>
          ({ for_sale: "ACT — Active (For Sale)", for_lease: "ACT — Active (For Lease)", both: "ACT — Active" }[v as string] ?? v) },
      { listing: "subtype", paragonField: "Commercial Property Type",
        notes: "UNVERIFIED — Paragon generic options at paragonCommercialPropertyTypeOptions" },
      { listing: "apn", paragonField: "Assessors Parcel #" },
    ],
  },
  {
    heading: "Address",
    rows: [
      { listing: "street", paragonField: "Street Address" },
      { listing: "city", paragonField: "City" },
      { listing: "state", paragonField: "State" },
      { listing: "zip", paragonField: "Zip Code" },
      { listing: "county", paragonField: "County" },
    ],
  },
  {
    heading: "Pricing",
    rows: [
      { listing: "salePrice", paragonField: "List Price" },
      { listing: "leaseRate", paragonField: "Lease Rate (PSF)" },
      { listing: "leaseType", paragonField: "Type of Lease",
        notes: "Paragon enum: Gross | Modified Gross | Net | Other/Remarks" },
    ],
  },
  {
    heading: "Building & Site",
    subtypes: ["office", "retail", "industrial", "multifamily", "mixed_use"],
    rows: [
      { listing: "buildingSqft", paragonField: "Square Feet of Improvement" },
      { listing: "netRentableSqft", paragonField: "Max Contiguous Sq.Ft. Avail" },
      { listing: "minSfAvailable", paragonField: "Minimum SF Available" },
      { listing: "lotSizeAcres", paragonField: "Lot Size (Acres)" },
      { listing: "yearBuilt", paragonField: "Year Built" },
      { listing: "numStories", paragonField: "# of Stories" },
      { listing: "numRestrooms", paragonField: "# of Restrooms" },
      { listing: "occupancyPct", paragonField: "Occupancy %" },
      { listing: "zoning", paragonField: "Zoning" },
      { listing: "parkingRatio", paragonField: "Parking Ratio" },
    ],
  },
  {
    heading: "Industrial Specs",
    subtypes: ["industrial"],
    rows: [
      { listing: "ceilingHeight", paragonField: "Ceiling Heights" },
      { listing: "clearCeilingHeight", paragonField: "Minimum Clearance Span" },
      { listing: "dockHighDoors", paragonField: "Dock Heights" },
      { listing: "driveInDoors", paragonField: "Ground Level Doors" },
      { listing: "loadingDocks", paragonField: "Docks" },
      { listing: "truckDoors", paragonField: "Truck Doors" },
      { listing: "amps", paragonField: "AMPS" },
      { listing: "phase", paragonField: "Phase" },
      { listing: "volts", paragonField: "Volts" },
      { listing: "railroad", paragonField: "Railroad" },
      { listing: "fencedSqft", paragonField: "Fenced Sq.Ft." },
      { listing: "floorLoad", paragonField: "Floor Load" },
    ],
  },
  {
    heading: "Land Specs",
    subtypes: ["land"],
    rows: [
      { listing: "landType", paragonField: "Type of Land" },
      { listing: "lotSizeAcres", paragonField: "Approx # of Acres" },
      { listing: "lotDimensions", paragonField: "Lot Dimensions" },
      { listing: "pricePerAcre", paragonField: "Price Per Acre" },
      { listing: "pricePerSqftLand", paragonField: "Price Per SqFt" },
      { listing: "presentUse", paragonField: "Current Use" },
      { listing: "highestBestUse", paragonField: "Highest Best Use" },
      { listing: "possibleNewZoning", paragonField: "Possible New Zoning" },
      { listing: "ingressEgress", paragonField: "Ingress/Egress" },
      { listing: "easements", paragonField: "Easements" },
      { listing: "soilType", paragonField: "Soil Type" },
      { listing: "topography", paragonField: "Topography" },
      { listing: "streetFrontage", paragonField: "Street Frontage" },
      { listing: "fenced", paragonField: "Fenced" },
      { listing: "cleared", paragonField: "Cleared" },
      { listing: "mineralRights", paragonField: "Mineral Rights" },
      { listing: "cityWater", paragonField: "City Water" },
      { listing: "wells", paragonField: "Wells" },
      { listing: "waterDistrict", paragonField: "Water District" },
      { listing: "landUtilities", paragonField: "Utilities Available" },
    ],
  },
  {
    heading: "Multifamily Specs",
    subtypes: ["multifamily"],
    rows: [
      { listing: "numUnits", paragonField: "# of Units" },
      { listing: "unitMix", paragonField: "Unit Mix / Per-Unit Schedule" },
      { listing: "noi", paragonField: "NOI" },
      { listing: "grossIncome", paragonField: "Gross Income" },
      { listing: "expenses", paragonField: "Expenses" },
      { listing: "minLeaseTerms", paragonField: "Minimum Lease Terms" },
    ],
  },
  {
    heading: "Remarks",
    rows: [
      { listing: "publicRemarks", paragonField: "Public Remarks (Internet)",
        notes: "MUST be MLS-safe — no contact info, URLs, phone, lockbox, occupancy. See compliance warnings." },
      { listing: "agentRemarks", paragonField: "Confidential / Agent Remarks" },
    ],
  },
  {
    heading: "Agent / Office",
    rows: [
      { listing: "agentName", paragonField: "Listing Agent" },
      { listing: "agentEmail", paragonField: "Agent Email" },
      { listing: "agentPhone", paragonField: "Agent Phone" },
    ],
  },
];

// Legacy export shape for compatibility with existing adapter code; prefer
// the structured paragonPasteSections export above.
export const paragonPasteMapping = {
  sections: paragonPasteSections.map((s) => ({
    heading: s.heading,
    subtypes: s.subtypes,
    rows: s.rows.map((r) => ({ listing: r.listing, paragonField: r.paragonField })),
  })),
} as const;

export type ParagonPasteSection = (typeof paragonPasteSections)[number];
