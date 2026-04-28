import type { ListingWithRelations } from "./types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function fmtCurrency(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return usd.format(n);
}

export function fmtNumber(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

export function fmtText(v: string | null | undefined): string {
  return v && v.trim() !== "" ? v : "—";
}

export function fmtListingType(v: ListingWithRelations["listingType"]): string {
  switch (v) {
    case "for_sale":
      return "For Sale";
    case "for_lease":
      return "For Lease";
    case "both":
      return "For Sale / For Lease";
    default:
      return "—";
  }
}

export function fmtLeaseType(v: ListingWithRelations["leaseType"] | null): string {
  switch (v) {
    case "nnn":
      return "NNN";
    case "gross":
      return "Gross";
    case "modified_gross":
      return "Modified Gross";
    default:
      return "—";
  }
}

export function fullAddress(l: ListingWithRelations): string {
  return `${l.street}, ${l.city}, ${l.state} ${l.zip}`;
}
