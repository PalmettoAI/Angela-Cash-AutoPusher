import type { Listing } from "@/db/schema";

export type ListingPhotoLite = {
  url: string;
  caption: string | null;
  ordering: number;
  isPrimary: boolean;
  hasBranding: boolean;
  mlsSafeUrl: string | null;
};

export type ListingWithRelations = Listing & {
  photos?: ListingPhotoLite[];
  documents?: { url: string; label: string | null; kind: string | null }[];
};

// Branded photos use `url` directly; clean/MLS-safe variants use `mlsSafeUrl`
// when present, else the original `url` if it isn't branded.
export function brandedPhotos(photos: ListingPhotoLite[] | undefined): ListingPhotoLite[] {
  return photos ?? [];
}

export function mlsSafePhotos(photos: ListingPhotoLite[] | undefined): { url: string; isPrimary: boolean; ordering: number }[] {
  if (!photos) return [];
  return photos
    .map((p) => {
      if (!p.hasBranding) return { url: p.url, isPrimary: p.isPrimary, ordering: p.ordering };
      if (p.mlsSafeUrl) return { url: p.mlsSafeUrl, isPrimary: p.isPrimary, ordering: p.ordering };
      return null;
    })
    .filter((x): x is { url: string; isPrimary: boolean; ordering: number } => x !== null);
}

export interface DestinationPreviewSection {
  heading: string;
  rows: { label: string; value: string }[];
}

export interface DestinationPreview {
  // Free-form note shown above the sections (e.g. "uses 12 of 18 fields").
  summary?: string;
  sections: DestinationPreviewSection[];
  // Fields from the Listing this destination consumed.
  consumedFields: string[];
}

export interface PushResult {
  status: "success" | "failed";
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
}

export interface DestinationAdapter {
  key: string;
  displayName: string;
  // Builds the destination-specific payload (what *would* be sent).
  buildPayload(listing: ListingWithRelations): Promise<Record<string, unknown>>;
  // For v1, no-op stubs that log + return success.
  push(listing: ListingWithRelations): Promise<PushResult>;
  // Human-readable preview rendered on the review screen.
  preview(listing: ListingWithRelations): Promise<DestinationPreview>;
}
