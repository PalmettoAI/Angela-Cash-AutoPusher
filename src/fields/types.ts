export type Subtype =
  | "office"
  | "retail"
  | "industrial"
  | "land"
  | "multifamily"
  | "mixed_use";

export const ALL_SUBTYPES: Subtype[] = [
  "office",
  "retail",
  "industrial",
  "land",
  "multifamily",
  "mixed_use",
];

export const SUBTYPE_LABELS: Record<Subtype, string> = {
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  land: "Land",
  multifamily: "Multifamily",
  mixed_use: "Mixed-use",
};

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percent"
  | "boolean"
  | "date"
  | "select"
  | "multi_select"
  | "enum_listing_type"
  | "enum_lease_type";

export interface FieldDef {
  // The field key — matches a Drizzle column on `listings` for top-level
  // fields, or a key inside `subtype_fields` JSON for subtype-specific ones.
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  // Empty array == applies to all subtypes.
  appliesToSubtypes?: Subtype[];
  // For enum_listing_type / enum_lease_type the options are implicit.
  // For "select", supply options here.
  options?: { value: string; label: string }[];
  helpText?: string;
  // True for fields stored in `subtype_fields` jsonb rather than top-level cols.
  jsonField?: boolean;
  // UI section grouping.
  section: "identity" | "address" | "pricing" | "physical" | "agent" | "subtype";
}
