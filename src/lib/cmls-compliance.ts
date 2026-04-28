import type { ListingWithRelations } from "@/destinations/types";

export type WarningSeverity = "warn" | "info";

export interface ComplianceWarning {
  field: string; // logical area: "publicRemarks" | "photos" | etc.
  severity: WarningSeverity;
  message: string;
}

// CMLS rules forbid contact info, URLs, phone, lockbox codes, occupancy
// mentions, and compensation offers in Public Remarks. These regexes are
// non-blocking warnings — Angela can publish anyway, but should be alerted.

const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const EMAIL_RE = /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const CALL_TEXT_RE = /\b(call|text|email|contact|reach out|dm|message)\s+(?:me|us|angela|coldwell|broker|agent)/i;
const LOCKBOX_RE = /\b(lock\s*box|lockbox|combo|combination|sentrilock|supra|key\s*pad)\b/i;
const OCCUPANCY_RE = /\b(occupied|vacant|tenant\s+occupied|owner\s+occupied|currently\s+leased|tenants\s+in\s+place)\b/i;
const COMPENSATION_RE = /\b(commission|co-?broke|coop\s+fee|broker\s+compensation|buyer\s*broker\s*compensation|bbc|2\.?5%|3%)\b/i;

export function checkPublicRemarks(text: string | null | undefined): ComplianceWarning[] {
  if (!text || text.trim() === "") return [];
  const warnings: ComplianceWarning[] = [];
  if (PHONE_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks appears to contain a phone number — CMLS forbids contact info." });
  if (EMAIL_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks appears to contain an email address." });
  if (URL_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks appears to contain a URL or web reference." });
  if (CALL_TEXT_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks contains 'call/text/contact me' phrasing — CMLS forbids contact solicitations." });
  if (LOCKBOX_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks mentions a lockbox / access code." });
  if (OCCUPANCY_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks mentions occupancy status — CMLS forbids this in Public Remarks." });
  if (COMPENSATION_RE.test(text))
    warnings.push({ field: "publicRemarks", severity: "warn",
      message: "Public Remarks may reference broker compensation — banned in MLS fields since Aug 2024." });
  return warnings;
}

export function checkPhotos(listing: ListingWithRelations): ComplianceWarning[] {
  const photos = listing.photos ?? [];
  const warnings: ComplianceWarning[] = [];
  if (photos.length === 0) {
    warnings.push({ field: "photos", severity: "info",
      message: "No photos uploaded yet." });
    return warnings;
  }
  const missingMlsSafe = photos.filter((p) => p.hasBranding && !p.mlsSafeUrl);
  if (missingMlsSafe.length > 0) {
    warnings.push({ field: "photos", severity: "warn",
      message: `${missingMlsSafe.length} branded photo(s) have no MLS-safe variant — CMLS forbids branded photos. Upload clean versions or they'll be excluded from MLS.` });
  }
  const safeCount = photos.filter((p) => !p.hasBranding || p.mlsSafeUrl).length;
  if (safeCount === 0) {
    warnings.push({ field: "photos", severity: "warn",
      message: "Zero MLS-safe photos available. Paragon listing will go up without imagery." });
  }
  return warnings;
}

export function checkListing(listing: ListingWithRelations): ComplianceWarning[] {
  return [...checkPublicRemarks(listing.publicRemarks), ...checkPhotos(listing)];
}
