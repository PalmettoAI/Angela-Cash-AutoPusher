// Crexi mapping. Real implementation will use Playwright against the Crexi
// agent portal (no public API). Field names below are placeholders — the
// Playwright integration will resolve them to actual selectors / form names
// once we record a session.
export const crexiMapping = {
  fields: [
    { listing: "title", target: "Listing Name", required: true },
    { listing: "subtype", target: "Property Subtype", required: true,
      transform: (v: string) =>
        ({
          office: "Office",
          retail: "Retail",
          industrial: "Industrial",
          land: "Land",
          multifamily: "Multifamily",
          mixed_use: "Mixed Use",
        }[v] ?? v) },
    { listing: "listingType", target: "Listing Status", required: true,
      transform: (v: string) =>
        ({ for_sale: "For Sale", for_lease: "For Lease", both: "For Sale & Lease" }[v] ?? v) },
    { listing: "salePrice", target: "Sale Price" },
    { listing: "leaseRate", target: "Lease Rate" },
    { listing: "leaseType", target: "Lease Type",
      transform: (v: string | null) =>
        v ? ({ nnn: "NNN", gross: "Gross", modified_gross: "Modified Gross" }[v] ?? v) : "" },
    { listing: "publicRemarks", target: "Description", required: true },
    { listing: "street", target: "Street Address", required: true },
    { listing: "city", target: "City", required: true },
    { listing: "state", target: "State", required: true },
    { listing: "zip", target: "Zip", required: true },
    { listing: "yearBuilt", target: "Year Built" },
    { listing: "buildingSqft", target: "Building Size (SF)" },
    { listing: "lotSizeAcres", target: "Lot Size (Acres)" },
    { listing: "zoning", target: "Zoning" },
    { listing: "parkingSpaces", target: "Parking Spaces" },
    { listing: "agentName", target: "Listing Agent" },
    { listing: "agentEmail", target: "Agent Email" },
    { listing: "agentPhone", target: "Agent Phone" },
  ],
  subtypeMappings: {
    office: [],
    retail: [],
    industrial: [],
    land: [],
    multifamily: [],
    mixed_use: [],
  },
} as const;
