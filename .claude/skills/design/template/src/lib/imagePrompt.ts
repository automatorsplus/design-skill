// ============================================================
// Local prompt shaping. No model call, no API key.
//
// The description the user types is passed through as-is and the mode's
// framing is appended, so Hero / Background / Cutout still behave differently
// without a round trip to a language model.
// ============================================================

export type GenMode = "hero" | "background" | "cutout";

const MODE_SUFFIX: Record<GenMode, string> = {
  hero:
    "Striking hero illustration or 3D render, clean composition, one strong focal subject, " +
    "generous negative space, suitable as the centrepiece of a social slide. No text or lettering.",
  background:
    "Subtle, low-contrast background texture or scene with large areas of empty space, " +
    "muted tones, nothing competing with foreground text laid over it. No text or lettering.",
  cutout:
    "A single isolated subject centred on a plain flat white background, no scenery, " +
    "even lighting and clean edges so it reads as a cut-out sticker. No text or lettering.",
};

/** Combine the user's description with the mode's framing. */
export function buildPrompt(description: string, mode: GenMode): string {
  const subject = description.trim().replace(/\s+/g, " ");
  return `${subject}. ${MODE_SUFFIX[mode] ?? MODE_SUFFIX.hero}`;
}
