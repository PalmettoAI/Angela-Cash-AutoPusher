import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const subtypeEnum = pgEnum("listing_subtype", [
  "office",
  "retail",
  "industrial",
  "land",
  "multifamily",
  "mixed_use",
]);

export const listingTypeEnum = pgEnum("listing_type", [
  "for_sale",
  "for_lease",
  "both",
]);

export const leaseTypeEnum = pgEnum("lease_type", [
  "nnn",
  "gross",
  "modified_gross",
]);

export const pushStatusEnum = pgEnum("push_status", [
  "pending",
  "success",
  "failed",
]);

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  subtype: subtypeEnum("subtype").notNull(),
  listingType: listingTypeEnum("listing_type").notNull(),

  title: text("title").notNull(),
  // MLS-safe remarks: no contact info, URLs, phone numbers, lockbox codes,
  // occupancy mentions, or compensation offers (CMLS rules). Used by paragon-paste.
  publicRemarks: text("public_remarks"),
  // Marketing copy with branding/contact info allowed. Used by Crexi/LoopNet/site.
  marketingRemarks: text("marketing_remarks"),
  agentRemarks: text("agent_remarks"),

  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  county: text("county"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),

  salePrice: numeric("sale_price", { precision: 14, scale: 2 }),
  leaseRate: numeric("lease_rate", { precision: 14, scale: 2 }),
  leaseType: leaseTypeEnum("lease_type"),

  yearBuilt: integer("year_built"),
  buildingSqft: integer("building_sqft"),
  lotSizeAcres: numeric("lot_size_acres", { precision: 10, scale: 4 }),
  zoning: text("zoning"),
  parkingSpaces: integer("parking_spaces"),
  parkingRatio: numeric("parking_ratio", { precision: 6, scale: 2 }),

  agentName: text("agent_name").notNull().default("Angela Cash"),
  agentEmail: text("agent_email").notNull().default("angela@angelacash.com"),
  agentPhone: text("agent_phone"),

  // Subtype-specific fields land here as JSON until we inventory the real
  // fields each portal expects. See src/fields/registry.ts for current shape.
  subtypeFields: jsonb("subtype_fields").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const listingPhotos = pgTable("listing_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  // Primary upload. May or may not have agent branding/watermarks.
  url: text("url").notNull(),
  // True if `url` contains agent branding (logos, watermarks, contact info).
  // CMLS forbids branded photos on MLS, so paragon-paste must filter or use
  // mlsSafeUrl instead.
  hasBranding: boolean("has_branding").notNull().default(false),
  // Optional clean-version pointer. When `hasBranding` is true and this is
  // null, the photo is unavailable for MLS — surfaced as a compliance warning.
  mlsSafeUrl: text("mls_safe_url"),
  caption: text("caption"),
  ordering: integer("ordering").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listingDocuments = pgTable("listing_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  kind: text("kind"), // flyer, om, financials, lease, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  displayName: text("display_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushAttempts = pgTable("push_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  destinationKey: text("destination_key").notNull(),
  status: pushStatusEnum("status").notNull().default("pending"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  result: jsonb("result").$type<Record<string, unknown>>(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type ListingDocument = typeof listingDocuments.$inferSelect;
export type DestinationRow = typeof destinations.$inferSelect;
export type PushAttempt = typeof pushAttempts.$inferSelect;
