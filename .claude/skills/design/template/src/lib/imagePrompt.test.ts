import { describe, it, expect } from "vitest";
import { buildPrompt } from "./imagePrompt";

describe("buildPrompt", () => {
  it("keeps the user's description as the subject", () => {
    expect(buildPrompt("a robot holding a paintbrush", "hero")).toMatch(/^a robot holding a paintbrush\./);
  });

  it("appends framing that differs per mode", () => {
    const hero = buildPrompt("a robot", "hero");
    const background = buildPrompt("a robot", "background");
    const cutout = buildPrompt("a robot", "cutout");
    expect(hero).not.toEqual(background);
    expect(background).not.toEqual(cutout);
    expect(background).toMatch(/low-contrast/);
    expect(cutout).toMatch(/isolated subject/);
  });

  it("collapses whitespace and trims", () => {
    expect(buildPrompt("  a   robot \n holding a brush  ", "hero")).toMatch(/^a robot holding a brush\./);
  });

  it("tells the model to avoid lettering in every mode", () => {
    for (const mode of ["hero", "background", "cutout"] as const) {
      expect(buildPrompt("x", mode)).toMatch(/No text or lettering/);
    }
  });
});
