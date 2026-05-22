// Per-portal configuration for the guided push.
//
// Flow model (deliberately simple for a non-technical user): we open the
// portal's site in the Steel browser; Angela logs in AND navigates to that
// portal's "new listing" form herself — exactly what she does today — then
// the engine fills whatever form is on screen. This avoids guessing each
// portal's (login-gated, changeable) add-listing URL.
//
//   - "automated" portals (Crexi, LoopNet): the engine fills the form.
//   - "assisted" portals (Paragon / the MLS): no auto-fill — the MLS forbids
//     it — so Angela pastes from the copy-paste sheet. We just open the site.

import { crexiMapping } from "@/destinations/crexi/mapping";
import { loopnetMapping } from "@/destinations/loopnet/mapping";
import type { PushField } from "./engine";

export type PortalKind = "automated" | "assisted";

export interface PortalConfig {
  key: string;
  displayName: string;
  kind: PortalKind;
  /** Portal site we open in the Steel browser; Angela logs in from here. */
  startUrl: string;
  loginInstruction: string;
  reviewInstruction: string;
  /** Returns the fields to fill for a listing subtype. Automated portals only. */
  getFields?: (subtype: string) => PushField[];
}

export const PORTALS: PortalConfig[] = [
  {
    key: "crexi",
    displayName: "Crexi",
    kind: "automated",
    startUrl: "https://www.crexi.com/",
    loginInstruction:
      "Log in to Crexi and open its blank 'Add Listing' form. When the empty form is on screen, click “Fill it in” below.",
    reviewInstruction:
      "Check everything the bot filled on Crexi, fix anything that needs a human eye, then click Submit on Crexi yourself. Done? Click Next.",
    getFields: (subtype: string): PushField[] => {
      const sub =
        crexiMapping.subtype[subtype as keyof typeof crexiMapping.subtype] ?? [];
      return [...crexiMapping.common, ...sub];
    },
  },
  {
    key: "loopnet",
    displayName: "LoopNet",
    kind: "automated",
    startUrl: "https://www.loopnet.com/",
    loginInstruction:
      "Log in to LoopNet and open its blank new-listing form. When the empty form is on screen, click “Fill it in” below.",
    reviewInstruction:
      "Check everything the bot filled on LoopNet, fix anything that needs a human eye, then click Submit on LoopNet yourself. Done? Click Next.",
    getFields: (subtype: string): PushField[] => {
      const sub =
        loopnetMapping.subtype[subtype as keyof typeof loopnetMapping.subtype] ??
        [];
      return [...loopnetMapping.common, ...sub];
    },
  },
  {
    // key matches the seeded destination row so the dashboard status lines up
    key: "paragon-paste",
    displayName: "Paragon (CMLS)",
    kind: "assisted",
    startUrl: "https://cmls.paragonrels.com/",
    loginInstruction:
      "Log in to Paragon and start a new commercial listing. The MLS doesn't allow auto-fill, so use the copy-paste sheet (button below) to fill each field by hand.",
    reviewInstruction:
      "Once the Paragon listing is saved, click Next to finish.",
  },
];

export function getPortal(key: string): PortalConfig | undefined {
  return PORTALS.find((p) => p.key === key);
}
