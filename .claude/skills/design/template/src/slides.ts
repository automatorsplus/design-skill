// ============================================================
// ✏️  EDIT THIS FILE TO CHANGE YOUR CAROUSEL CONTENT
// ============================================================
//
// The design skill writes your slide copy into this file in a
// temporary working copy of the template, then launches the preview.
// You normally never edit this by hand — the skill does it for you.
//
// - SLIDES: the slide content (see src/lib/types.ts for all slide types)
// - DEFAULT_FONT / SURFACE / ACCENT / PURPOSE / BG / FORMAT: the locked look,
//   so every slide is cohesive.
//
// Render modes (set by the skill):
//   text      → clean cards, no imagery (cheapest, fastest)
//   photo     → each slide is a full-bleed image background + text overlay
//               (set type:"image", imageFill:true, imageSrc:"/images/yours/<file>")
//               the image can be a real photo OR a generated one
// ============================================================

import type { SlideData, BgType, FormatId, FontId, SurfaceId, AccentId, PurposeId } from "./lib/types";

export const SLIDES: SlideData[] = [
  { type: "hook", text: "Most people overcomplicate\ncontent. You just need\none idea that lands.", highlight: "one idea that lands" },
  { type: "body", badge: "01", title: "Start with the hook", text: "If the first line doesn't stop the scroll, the rest never gets read.", highlight: "stop the scroll" },
  { type: "list", badge: "02", title: "The repeatable loop", items: ["Pick one idea", "Write the hook", "Render and ship"] },
  { type: "stats", badge: "03", title: "Why code-render", stats: [
    { value: "0", label: "API cost" },
    { value: "100%", label: "On brand" },
  ]},
  { type: "cta", text: "That's the whole system.\nNow go make one." },
];

export const DEFAULT_FONT: FontId = "clean";
export const DEFAULT_SURFACE: SurfaceId = "white";
export const DEFAULT_ACCENT: AccentId = "violet";
export const DEFAULT_PURPOSE: PurposeId = "carousel";
export const DEFAULT_BG: BgType = "glow";
export const DEFAULT_FORMAT: FormatId = "threads-4x5";
