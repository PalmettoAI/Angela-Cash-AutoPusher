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
  // photo & document URL lists, comma-separated for v1
  photoUrls: z.string().optional(),
  documentUrls: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function Field({
  def,
  register,
  errors,
}: {
  def: FieldDef;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
}) {
  const id = def.key;
  const err = (errors as Record<string, { message?: string } | undefined>)[def.key];

  if (def.kind === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>
          {def.label} {def.required && <span className="text-destructive">*</span>}
        </Label>
        <Textarea id={id} rows={4} {...register(def.key as keyof FormValues)} />
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
          {...register(def.key as keyof FormValues)}
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
          {...register(def.key as keyof FormValues)}
        >
          <option value="">—</option>
          <option value="nnn">NNN</option>
          <option value="gross">Gross</option>
          <option value="modified_gross">Modified Gross</option>
        </select>
      </div>
    );
  }

  const inputType = def.kind === "number" || def.kind === "currency" ? "number" : "text";
  const step = def.kind === "currency" ? "0.01" : def.kind === "number" ? "any" : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {def.label} {def.required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={id} type={inputType} step={step} {...register(def.key as keyof FormValues)} />
      {def.helpText && <p className="text-xs text-muted-foreground">{def.helpText}</p>}
      {err?.message && <p className="text-xs text-destructive">{err.message}</p>}
    </div>
  );
}

export function ListingForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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

      {(["identity", "address", "pricing", "physical", "agent"] as const).map((sectionKey) => (
        <Card key={sectionKey}>
          <CardHeader>
            <CardTitle className="capitalize">{sectionKey}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {sections[sectionKey].map((def) => (
              <Field key={def.key} def={def} register={register} errors={errors} />
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Photos & documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="photoUrls">Photo URLs (comma-separated)</Label>
            <Textarea id="photoUrls" rows={3} {...register("photoUrls")} />
            <p className="text-xs text-muted-foreground">
              v1 stores URL references only — upload pipeline TBD.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="documentUrls">Document URLs (comma-separated)</Label>
            <Textarea id="documentUrls" rows={3} {...register("documentUrls")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subtype-specific details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <strong className="capitalize">{subtype}</strong> — TODO: fields will appear here once
            the registry is populated for this subtype. The structural slot exists in{" "}
            <code>src/fields/registry.ts</code> and storage in{" "}
            <code>listings.subtype_fields</code> jsonb.
          </p>
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
