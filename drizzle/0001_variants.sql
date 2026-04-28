ALTER TABLE "listing_photos" ADD COLUMN "has_branding" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD COLUMN "mls_safe_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "marketing_remarks" text;