import type { SurfaceId, AccentId, FontId } from "./types";

export interface BrandKit {
  id: string;
  name: string;
  surface: SurfaceId;
  accent: AccentId;
  font: FontId;
  handle: string;
}

// ============================================================
// YOUR BRAND KITS
// ============================================================
//
// A brand kit is a one-click reskin: it sets the deck's surface, accent and
// font, and stamps your handle onto the CTA slide.
//
// This ships empty on purpose, so the studio arrives unbranded. The Brand
// section in the control rail stays hidden until you add at least one kit.
//
// Add your own, for example:
//
//   export const BRAND_KITS: BrandKit[] = [
//     { id: "main",   name: "My Brand", surface: "white", accent: "violet", font: "clean",     handle: "@yourhandle" },
//     { id: "studio", name: "Studio",   surface: "dark",  accent: "teal",   font: "condensed", handle: "@yourstudio" },
//   ];
//
// Valid values are the ids in src/lib/types.ts:
//   surface — dark, white, light, paper, gradient, pastel, neon, ember
//   accent  — yellow, red, teal, coral, orange, violet, lime, blue, fuchsia, pink, amber
//   font    — minimal, editorial, clean, mono, condensed
// ============================================================

export const BRAND_KITS: BrandKit[] = [];
