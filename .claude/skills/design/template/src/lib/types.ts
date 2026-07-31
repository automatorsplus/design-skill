// ============================================================
// Shared type definitions for carousel slides and presets.
// Imported by both page.tsx (browser preview) and any future
// server-side renderer (e.g. Satori export script).
// ============================================================

export type SlideType =
  | "hook"
  | "body"
  | "cta"
  | "quote"
  | "stats"
  | "list"
  | "checklist"
  | "process"
  | "comparison"
  | "image"
  | "emoji"
  | "number";

export type BgType =
  | "none"
  | "blobs"
  | "grid"
  | "lines"
  | "noise"
  | "bignumber"
  | "glow"
  | "paper";

export type FormatId =
  | "threads-4x5"
  | "instagram-square"
  | "linkedin-square"
  | "tiktok-9x16"
  | "story-9x16"
  | "wide-16x9";

// ---- Four independent style axes (font, surface, accent, purpose) ----

/** Font / typeface selection */
export type FontId = "minimal" | "editorial" | "clean" | "mono" | "condensed";

/** Surface — bg + text neutrals (no pop color). */
export type SurfaceId =
  | "dark"
  | "white"
  | "light"
  | "paper"
  | "gradient"
  | "pastel"
  | "neon"
  | "ember";

/** Accent — the pop color used for highlighted words. */
export type AccentId =
  | "yellow"
  | "red"
  | "teal"
  | "coral"
  | "orange"
  | "violet"
  | "lime"
  | "blue"
  | "fuchsia"
  | "pink"
  | "amber";

/** Layout purpose — drives typography scale */
export type PurposeId = "carousel" | "presentation";

export interface FontStyle {
  id: FontId;
  name: string;
  fontFamily: string;
  hookFontFamily?: string;
}

export interface Surface {
  id: SurfaceId;
  name: string;
  bg: string;
  bgGradient?: string;
  textColor: string;
  textSecondary: string;
  /** Color used for titles, dividers, badges. For most surfaces equals textColor. */
  accentColor: string;
}

export interface Accent {
  id: AccentId;
  name: string;
  /** Color used for highlighted words. */
  color: string;
}

// ---- Slide data ----

export interface SlideData {
  type: SlideType;
  text?: string;
  title?: string;
  badge?: string;
  highlight?: string;
  handle?: string;
  // quote
  author?: string;
  role?: string;
  // stats
  stats?: { value: string; label: string }[];
  // list / checklist
  items?: string[];
  // process
  steps?: { title: string; text?: string }[];
  // comparison
  leftLabel?: string;
  leftItems?: string[];
  rightLabel?: string;
  rightItems?: string[];
  // icon points (plus/minus list with SVG icons)
  points?: Array<{ type: "plus" | "minus"; text: string }>;
  // image slide — put file into /public/images/ and reference as "/images/file.png"
  imageSrc?: string;
  imageCaption?: string;
  // imageFill: true renders the image as full-bleed background with dark overlay (for personal/landscape photos)
  imageFill?: boolean;
  // emoji slide — single grapheme rendered large
  emoji?: string;
  // number slide — big hero number/string like "17", "5K+", "№1"
  bigNumber?: string;
  // highlight variant — "italic-box" renders highlighted word in Playfair italic on colored box
  highlightStyle?: "default" | "italic-box";
  // per-slide style override
  slideStyle?: { surface?: SurfaceId; accent?: AccentId; bg?: BgType; font?: FontId };
}

// ---- Internal composed type used by all slide components ----
// Built by composePreset(font, surface, accent, purpose) in presets.ts.

export interface StylePreset {
  id: string;
  name: string;
  bg: string;
  bgGradient?: string;
  textColor: string;
  textSecondary: string;
  accentColor: string;
  highlightColor: string;
  fontFamily: string;
  hookFontFamily?: string;
  // Title overrides — defaults: 44px, 800, uppercase, accentColor, divider visible
  titleFontSize?: number;
  titleFontWeight?: number;
  titleUppercase?: boolean;
  titleDivider?: boolean;
  titleColor?: string;
  // Body text overrides — defaults: 600, textColor, lineHeight 1.2
  bodyFontWeight?: number;
  bodyColor?: string;
  bodyLineHeight?: number;
  // Studio "Tweaks" overrides (default off → identical output). Set at runtime by the dashboard.
  padTweak?: number;    // slide padding in px (default 80)
  scaleTweak?: number;  // content scale multiplier (default 1)
  hideCounter?: boolean; // hide the progress dots
  align?: "left" | "center"; // text alignment for hook/body slides (default left)
}

export interface FormatPreset {
  id: FormatId;
  name: string;
  w: number;
  h: number;
  platform: string;
}
