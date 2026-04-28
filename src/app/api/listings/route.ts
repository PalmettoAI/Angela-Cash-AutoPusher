import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { listings, listingPhotos, listingDocuments } from "@/db/schema";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  subtype: z.enum(["office", "retail", "industrial", "land", "multifamily", "mixed_use"]),
  listingType: z.enum(["for_sale", "for_lease", "both"]),
  title: z.string().min(1),
  publicRemarks: z.string().optional(),
  marketingRemarks: z.string().optional(),
  agentRemarks: z.string().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  county: z.string().optional(),
  salePrice: z.number().optional(),
  leaseRate: z.number().optional(),
  leaseType: z.enum(["nnn", "gross", "modified_gross"]).optional().or(z.literal("")),
  yearBuilt: z.number().int().optional(),
  buildingSqft: z.number().int().optional(),
  lotSizeAcres: z.number().optional(),
  zoning: z.string().optional(),
  parkingSpaces: z.number().int().optional(),
  parkingRatio: z.number().optional(),
  agentName: z.string().min(1),
  agentEmail: z.string().min(1),
  agentPhone: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    hasBranding: z.boolean().optional(),
    mlsSafeUrl: z.string().nullable().optional(),
    caption: z.string().optional(),
  })).optional(),
  documents: z.array(z.object({
    url: z.string(),
    label: z.string().optional(),
    kind: z.string().optional(),
  })).optional(),
  // Free-form bag for jsonField + subtype-specific values from the form.
  // Server doesn't validate the contents — registry validation is form-side
  // for v1; tighten when the form schema is generated from the registry.
  subtypeFields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data;

  const [row] = await db
    .insert(listings)
    .values({
      subtype: v.subtype,
      listingType: v.listingType,
      title: v.title,
      publicRemarks: v.publicRemarks ?? null,
      marketingRemarks: v.marketingRemarks ?? null,
      agentRemarks: v.agentRemarks ?? null,
      street: v.street,
      city: v.city,
      state: v.state,
      zip: v.zip,
      county: v.county ?? null,
      salePrice: v.salePrice !== undefined ? String(v.salePrice) : null,
      leaseRate: v.leaseRate !== undefined ? String(v.leaseRate) : null,
      leaseType: v.leaseType ? (v.leaseType as "nnn" | "gross" | "modified_gross") : null,
      yearBuilt: v.yearBuilt ?? null,
      buildingSqft: v.buildingSqft ?? null,
      lotSizeAcres: v.lotSizeAcres !== undefined ? String(v.lotSizeAcres) : null,
      zoning: v.zoning ?? null,
      parkingSpaces: v.parkingSpaces ?? null,
      parkingRatio: v.parkingRatio !== undefined ? String(v.parkingRatio) : null,
      agentName: v.agentName,
      agentEmail: v.agentEmail,
      agentPhone: v.agentPhone ?? null,
      subtypeFields: v.subtypeFields ?? {},
    })
    .returning();

  const photoRows = (v.photos ?? []).map((p, i) => ({
    listingId: row.id,
    url: p.url,
    hasBranding: p.hasBranding ?? false,
    mlsSafeUrl: p.mlsSafeUrl ?? null,
    caption: p.caption ?? null,
    ordering: i,
    isPrimary: i === 0,
  }));
  if (photoRows.length) await db.insert(listingPhotos).values(photoRows);

  const docRows = (v.documents ?? []).map((d) => ({
    listingId: row.id,
    url: d.url,
    label: d.label ?? null,
    kind: d.kind ?? null,
  }));
  if (docRows.length) await db.insert(listingDocuments).values(docRows);

  logger.info({ listingId: row.id }, "Listing created");
  return NextResponse.json({ id: row.id });
}
