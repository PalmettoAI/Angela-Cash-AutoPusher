import type { DestinationAdapter } from "./types";
import { angelaSiteAdapter } from "./angela-site/adapter";
import { crexiAdapter } from "./crexi/adapter";
import { loopnetAdapter } from "./loopnet/adapter";
import { paragonPasteAdapter } from "./paragon-paste/adapter";

export const destinationAdapters: DestinationAdapter[] = [
  angelaSiteAdapter,
  crexiAdapter,
  loopnetAdapter,
  paragonPasteAdapter,
];

export function getAdapter(key: string): DestinationAdapter | undefined {
  return destinationAdapters.find((a) => a.key === key);
}

export type { DestinationAdapter, PushResult, DestinationPreview, ListingWithRelations } from "./types";
