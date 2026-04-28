// LoopNet mapping. Real implementation will use Playwright against the
// LoopNet agent portal. Field names are placeholders pending a recorded form
// inventory.
export const loopnetMapping = {
  fields: [
    { listing: "title", target: "Listing Title", required: true },
    { listing: "subtype", target: "Property Type", required: true,
      transform: (v: string) =>
        ({
          office: "Office",
          retail: "Retail",
          industrial: "Industrial",
          land: "Land",
          multifamily: "Multifamily",
          mixed_use: "Specialty",
        }[v] ?? v) },
    { listing: "listingType", target: "For", required: true,
      transform: (v: string) =>
        ({ for_sale: "Sale", for_lease: "Lease", both: "Sale or Lease" }[v] ?? v) },
    { listing: "salePrice", target: "Asking Price" },
    { listing: "leaseRate", target: "Asking Rent (PSF/Yr)" },
    { listing: "publicRemarks", target: "Property Description", required: true },
    { listing: "street", target: "Address Line 1", required: true },
    { listing: "city", target: "City", required: true },
    { listing: "state", target: "State", required: true },
    { listing: "zip", target: "Postal Code", required: true },
    { listing: "yearBuilt", target: "Year Built" },
    { listing: "buildingSqft", target: "Building Size" },
    { listing: "lotSizeAcres", target: "Land Area" },
    { listing: "zoning", target: "Zoning Designation" },
    { listing: "parkingSpaces", target: "Total Parking Spaces" },
    { listing: "parkingRatio", target: "Parking Ratio" },
    { listing: "agentName", target: "Broker" },
    { listing: "agentEmail", target: "Broker Email" },
    { listing: "agentPhone", target: "Broker Phone" },
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
