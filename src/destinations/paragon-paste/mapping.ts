// Paragon (CMLS) doesn't support API push, so this destination's "push" is a
// no-op. The value is a copy-paste helper view rendered at /paragon. Sections
// here mirror the order Angela encounters in the actual Paragon listing-entry
// form; refine the section order once we sit with her at the screen.
export const paragonPasteMapping = {
  sections: [
    {
      heading: "General",
      rows: [
        { listing: "title", paragonField: "Listing Title" },
        { listing: "listingType", paragonField: "Status",
          transform: (v: string) =>
            ({ for_sale: "Active - For Sale", for_lease: "Active - For Lease", both: "Active" }[v] ?? v) },
        { listing: "subtype", paragonField: "Property Subtype" },
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
        { listing: "leaseType", paragonField: "Lease Type" },
      ],
    },
    {
      heading: "Building & Site",
      rows: [
        { listing: "buildingSqft", paragonField: "Building SqFt" },
        { listing: "lotSizeAcres", paragonField: "Lot Size (Acres)" },
        { listing: "yearBuilt", paragonField: "Year Built" },
        { listing: "zoning", paragonField: "Zoning" },
        { listing: "parkingSpaces", paragonField: "Parking Spaces" },
        { listing: "parkingRatio", paragonField: "Parking Ratio" },
      ],
    },
    {
      heading: "Remarks",
      rows: [
        { listing: "publicRemarks", paragonField: "Public Remarks" },
        { listing: "agentRemarks", paragonField: "Agent Remarks" },
      ],
    },
    {
      heading: "Agent",
      rows: [
        { listing: "agentName", paragonField: "Listing Agent" },
        { listing: "agentEmail", paragonField: "Agent Email" },
        { listing: "agentPhone", paragonField: "Agent Phone" },
      ],
    },
  ],
} as const;

export type ParagonPasteSection = (typeof paragonPasteMapping.sections)[number];
