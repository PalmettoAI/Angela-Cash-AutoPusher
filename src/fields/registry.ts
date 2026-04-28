import type { FieldDef, Subtype } from "./types";

// Single source of truth for all listing fields. Top-level form fields map
// 1:1 to Drizzle columns; subtype-specific fields land in `subtype_fields`
// jsonb. To add a new field: append a row here, then either add a Drizzle
// column (top-level) or set `jsonField: true` (subtype-specific).
export const FIELD_REGISTRY: FieldDef[] = [
  // identity
  { key: "title", label: "Listing title", kind: "text", required: true, section: "identity" },
  { key: "publicRemarks", label: "Public remarks", kind: "textarea", section: "identity",
    helpText: "Long description shown on portals" },
  { key: "agentRemarks", label: "Agent-only remarks", kind: "textarea", section: "identity",
    helpText: "Private MLS notes, not shown publicly" },
  { key: "listingType", label: "Listing type", kind: "enum_listing_type", required: true, section: "identity" },

  // address
  { key: "street", label: "Street", kind: "text", required: true, section: "address" },
  { key: "city", label: "City", kind: "text", required: true, section: "address" },
  { key: "state", label: "State", kind: "text", required: true, section: "address" },
  { key: "zip", label: "Zip", kind: "text", required: true, section: "address" },
  { key: "county", label: "County", kind: "text", section: "address" },

  // pricing
  { key: "salePrice", label: "Sale price (USD)", kind: "currency", section: "pricing",
    helpText: "Required if for sale" },
  { key: "leaseRate", label: "Lease rate ($/sqft/yr)", kind: "currency", section: "pricing",
    helpText: "Required if for lease" },
  { key: "leaseType", label: "Lease type", kind: "enum_lease_type", section: "pricing" },

  // physical
  { key: "yearBuilt", label: "Year built", kind: "number", section: "physical" },
  { key: "buildingSqft", label: "Building sqft", kind: "number", section: "physical" },
  { key: "lotSizeAcres", label: "Lot size (acres)", kind: "number", section: "physical" },
  { key: "zoning", label: "Zoning", kind: "text", section: "physical" },
  { key: "parkingSpaces", label: "Parking spaces", kind: "number", section: "physical" },
  { key: "parkingRatio", label: "Parking ratio (per 1000 sqft)", kind: "number", section: "physical" },

  // agent
  { key: "agentName", label: "Agent name", kind: "text", required: true, section: "agent" },
  { key: "agentEmail", label: "Agent email", kind: "text", required: true, section: "agent" },
  { key: "agentPhone", label: "Agent phone", kind: "text", section: "agent" },

  // ──────────────────────────────────────────────────────────────────────
  // Subtype-specific fields. Stored in listings.subtype_fields jsonb.
  // TODO: inventory Crexi/LoopNet forms and fill in real fields per subtype.
  // The structural slot exists below so the UI can render them as soon as
  // the registry is populated.
  // ──────────────────────────────────────────────────────────────────────

  // office — TODO: class (A/B/C), tenancy, typical floor plate, ceiling height
  // retail — TODO: anchor tenant, traffic count, GLA, frontage
  // industrial — TODO: clear height, dock doors, drive-ins, power, rail
  // land — TODO: acreage, topography, utilities at site, frontage, entitlements
  // multifamily — TODO: unit count, unit mix, NOI, cap rate, occupancy
  // mixed_use — TODO: component breakdown (retail sqft, residential units, etc.)
];

export function fieldsForSubtype(subtype: Subtype): FieldDef[] {
  return FIELD_REGISTRY.filter(
    (f) => !f.appliesToSubtypes || f.appliesToSubtypes.includes(subtype),
  );
}

export function fieldsBySection(subtype: Subtype) {
  const fields = fieldsForSubtype(subtype);
  return {
    identity: fields.filter((f) => f.section === "identity"),
    address: fields.filter((f) => f.section === "address"),
    pricing: fields.filter((f) => f.section === "pricing"),
    physical: fields.filter((f) => f.section === "physical"),
    agent: fields.filter((f) => f.section === "agent"),
    subtype: fields.filter((f) => f.section === "subtype"),
  };
}
