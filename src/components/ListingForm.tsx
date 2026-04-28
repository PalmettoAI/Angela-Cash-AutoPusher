"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_SUBTYPES, SUBTYPE_LABELS, type Subtype } from "@/fields/types";
import { fieldsBySection } from "@/fields/registry";
import type { FieldDef } from "@/fields/types";
import { FileDropZone, type UploadedItem } from "@/components/FileDropZone";

const numericString = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isNaN(n) ? undefined : n;
  });

const formSchema = z.object({
  subtype: z.enum(["office", "retail", "industrial", "land", "multifamily", "mixed_use"]),
  listingType: z.enum(["for_sale", "for_lease", "both"]),
  title: z.string().min(1, "Required"),
  publicRemarks: z.string().optional(),
  marketingRemarks: z.string().optional(),
  agentRemarks: z.string().optional(),
  street: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  zip: z.string().min(1, "Required"),
  county: z.string().optional(),
  salePrice: numericString,
  leaseRate: numericString,
  leaseType: z.enum(["nnn", "gross", "modified_gross"]).optional().or(z.literal("")),
  yearBuilt: numericString,
  buildingSqft: numericString,
  lotSizeAcres: numericString,
  zoning: z.string().optional(),
  parkingSpaces: numericString,
  parkingRatio: numericString,
  agentName: z.string().min(1, "Required"),
  agentEmail: z.string().min(1, "Required"),
  agentPhone: z.string().optional(),
  // All subtype-specific + jsonField universal fields are passed in this map.
  subtypeFields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function inputProps(def: FieldDef) {
  if (def.kind === "number") return { type: "number" as const, step: "any" };
  if (def.kind === "currency") return { type: "number" as const, step: "0.01" };
  if (def.kind === "percent") return { type: "number" as const, step: "0.01" };
  if (def.kind === "date") return { type: "date" as const };
  return { type: "text" as const };
}

function renderEnumOptions(def: FieldDef) {
  return def.options?.map((o) => o.label).join(", ") ?? "";
}

function Field({
  def,
  register,
  errors,
}: {
  def: FieldDef;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
}) {
  // For jsonField fields the form path is subtypeFields.<key>; for top-level
  // it's the bare key.
  const path = def.jsonField ? (`subtypeFields.${def.key}` as const) : (def.key as keyof FormValues);
  const id = def.key;
  const err = (errors as Record<string, { message?: string } | undefined>)[def.key];

  if (def.kind === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {def.label} {def.required && <span className="text-destructive">*</span>}
        </Label>
        <Textarea id={id} rows={4} {...register(path as keyof FormValues)} />
        {def.helpText && <p className="text-xs text-muted-foreground">{def.helpText}</p>}
        {err?.message && <p className="text-xs text-destructive">{err.message}</p>}
      </div>
    );
  }

  if (def.kind === "enum_listing_type") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {def.label} {def.required && <span className="text-destructive">*</span>}
        </Label>
        <select
          id={id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register(path as keyof FormValues)}
        >
          <option value="for_sale">For Sale</option>
          <option value="for_lease">For Lease</option>
          <option value="both">Both</option>
        </select>
      </div>
    );
  }

  if (def.kind === "enum_lease_type") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{def.label}</Label>
        <select
          id={id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register(path as keyof FormValues)}
        >
          <option value="">—</option>
          <option value="nnn">NNN</option>
          <option value="gross">Gross</option>
          <option value="modified_gross">Modified Gross</option>
        </select>
      </div>
    );
  }

  if (def.kind === "select" && def.options) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{def.label}</Label>
        <select
          id={id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register(path as keyof FormValues)}
        >
          <option value="">—</option>
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {def.helpText && <p className="text-xs text-muted-foreground">{def.helpText}</p>}
      </div>
    );
  }

  if (def.kind === "multi_select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{def.label}</Label>
        <Input
          id={id}
          type="text"
          placeholder="comma-separated values"
          {...register(path as keyof FormValues)}
        />
        <p className="text-xs text-muted-foreground">
          Allowed: {renderEnumOptions(def)}
        </p>
      </div>
    );
  }

  if (def.kind === "boolean") {
    return (
      <div className="flex items-center gap-2 pt-2">
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          {...register(path as keyof FormValues)}
        />
        <Label htmlFor={id} className="text-sm font-normal">{def.label}</Label>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {def.label} {def.required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={id} {...inputProps(def)} {...register(path as keyof FormValues)} />
      {def.helpText && <p className="text-xs text-muted-foreground">{def.helpText}</p>}
      {err?.message && <p className="text-xs text-destructive">{err.message}</p>}
    </div>
  );
}

export function ListingForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedItem[]>([]);
  const [documents, setDocuments] = useState<UploadedItem[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subtype: "office",
      listingType: "for_sale",
      agentName: "Angela Cash",
      agentEmail: "angela@angelacash.com",
    },
  });

  const subtype = watch("subtype") as Subtype;
  const sections = useMemo(() => fieldsBySection(subtype), [subtype]);
  // Physical section combines top-level cols + jsonField universals; group separately.
  const physicalTopLevel = sections.physical.filter((f) => !f.jsonField);
  const physicalSubtype = sections.physical.filter((f) => f.jsonField);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          photos: photos.map((p) => ({
            url: p.url,
            hasBranding: !!p.hasBranding,
            mlsSafeUrl: p.mlsSafeUrl ?? null,
          })),
          documents: documents.map((d) => ({ url: d.url, label: d.filename })),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      router.push(`/listings/${data.id}/review`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property type</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="subtype">Subtype</Label>
          <select
            id="subtype"
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("subtype")}
          >
            {ALL_SUBTYPES.map((s) => (
              <option key={s} value={s}>
                {SUBTYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {sections.identity.map((def) => (
            <Field key={def.key} def={def} register={register} errors={errors} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {sections.address.map((def) => (
            <Field key={def.key} def={def} register={register} errors={errors} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {sections.pricing.map((def) => (
            <Field key={def.key} def={def} register={register} errors={errors} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Building & site</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[...physicalTopLevel, ...physicalSubtype].map((def) => (
            <Field key={def.key} def={def} register={register} errors={errors} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            {SUBTYPE_LABELS[subtype]} specifics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {sections.subtype.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subtype-specific fields registered for {subtype} yet.
            </p>
          ) : (
            sections.subtype.map((def) => (
              <Field key={def.key} def={def} register={register} errors={errors} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {sections.agent.map((def) => (
            <Field key={def.key} def={def} register={register} errors={errors} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos & documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropZone
            label="Photos"
            variant="photo"
            value={photos}
            onChange={setPhotos}
            helpText="Drop or click to upload. Tick 'Branded' on any photo with logos / watermarks / contact info — CMLS forbids branded photos on MLS, so paragon-paste will skip them unless you upload a clean variant."
          />
          <FileDropZone
            label="Documents (flyer, OM, financials, etc.)"
            variant="document"
            value={documents}
            onChange={setDocuments}
          />
        </CardContent>
      </Card>

      {submitError && (
        <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save & review"}
        </Button>
      </div>
    </form>
  );
}
