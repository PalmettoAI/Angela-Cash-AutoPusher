// Mapping config: which Listing fields → angelacash.com fields, transformations,
// required/optional, defaults. Real push impl is TODO (internal API call to the
// angelacash.com Next.js app once the listings page exists there).
export const angelaSiteMapping = {
  fields: [
    { listing: "title", target: "title", required: true },
    { listing: "publicRemarks", target: "description", required: true },
    { listing: "subtype", target: "category", required: true,
      transform: (v: string) => v.replace("_", "-") },
    { listing: "listingType", target: "status", required: true,
      transform: (v: string) => ({
        for_sale: "For Sale",
        for_lease: "For Lease",
        both: "Available",
      }[v] ?? v) },
    { listing: "salePrice", target: "salePrice" },
    { listing: "leaseRate", target: "leaseRate" },
    { listing: "leaseType", target: "leaseType" },
    { listing: "street", target: "address.street", required: true },
    { listing: "city", target: "address.city", required: true },
    { listing: "state", target: "address.state", required: true },
    { listing: "zip", target: "address.zip", required: true },
    { listing: "buildingSqft", target: "size.buildingSqft" },
    { listing: "lotSizeAcres", target: "size.lotAcres" },
    { listing: "yearBuilt", target: "yearBuilt" },
    { listing: "zoning", target: "zoning" },
    { listing: "agentName", target: "agent.name", required: true,
      defaultValue: "Angela Cash" },
    { listing: "agentEmail", target: "agent.email", required: true,
      defaultValue: "angela@angelacash.com" },
    { listing: "agentPhone", target: "agent.phone" },
  ],
  // Subtype-specific mappings — TODO: fill in once subtype field schemas land.
  subtypeMappings: {
    office: [],
    retail: [],
    industrial: [],
    land: [],
    multifamily: [],
    mixed_use: [],
  },
} as const;
