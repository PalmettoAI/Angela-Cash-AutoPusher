import type { Listing } from "@/db/schema";

export type ListingWithRelations = Listing & {
  photos?: { url: string; caption: string | null; ordering: number; isPrimary: boolean }[];
  documents?: { url: string; label: string | null; kind: string | null }[];
};

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
