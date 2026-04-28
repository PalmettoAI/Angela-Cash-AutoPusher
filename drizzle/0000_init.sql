CREATE TYPE "public"."lease_type" AS ENUM('nnn', 'gross', 'modified_gross');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('for_sale', 'for_lease', 'both');--> statement-breakpoint
CREATE TYPE "public"."push_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."listing_subtype" AS ENUM('office', 'retail', 'industrial', 'land', 'multifamily', 'mixed_use');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"ordering" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subtype" "listing_subtype" NOT NULL,
	"listing_type" "listing_type" NOT NULL,
	"title" text NOT NULL,
	"public_remarks" text,
	"agent_remarks" text,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"county" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"sale_price" numeric(14, 2),
	"lease_rate" numeric(14, 2),
	"lease_type" "lease_type",
	"year_built" integer,
	"building_sqft" integer,
	"lot_size_acres" numeric(10, 4),
	"zoning" text,
	"parking_spaces" integer,
	"parking_ratio" numeric(6, 2),
	"agent_name" text DEFAULT 'Angela Cash' NOT NULL,
	"agent_email" text DEFAULT 'angela@angelacash.com' NOT NULL,
	"agent_phone" text,
	"subtype_fields" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"destination_key" text NOT NULL,
	"status" "push_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_documents" ADD CONSTRAINT "listing_documents_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "push_attempts" ADD CONSTRAINT "push_attempts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
