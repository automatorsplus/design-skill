import { describe, it, expect } from "vitest";
import { applyBrandKit } from "./applyBrandKit";
import { BRAND_KITS, type BrandKit } from "../lib/brandKits";
import type { EditorState } from "./editorState";

const state: EditorState = {
  slides: [{ type: "hook", text: "x" }, { type: "cta", text: "follow", handle: "@old" }],
  defaults: { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" },
};

// A kit the user might define. The skill ships none, so tests supply their own.
const kit: BrandKit = {
  id: "test", name: "Test Brand", surface: "dark", accent: "teal", font: "condensed", handle: "@testbrand",
};

describe("applyBrandKit", () => {
  it("applies surface/accent/font to defaults", () => {
    const s = applyBrandKit(state, kit);
    expect(s.defaults.surface).toBe("dark");
    expect(s.defaults.accent).toBe("teal");
    expect(s.defaults.font).toBe("condensed");
  });

  it("updates cta handles, leaves non-cta slides alone", () => {
    const s = applyBrandKit(state, kit);
    expect(s.slides[1].handle).toBe("@testbrand");
    expect(s.slides[0]).toEqual(state.slides[0]);
  });

  it("does not mutate input", () => {
    applyBrandKit(state, kit);
    expect(state.slides[1].handle).toBe("@old");
  });

  it("ships with no brand kits, so the studio arrives unbranded", () => {
    expect(BRAND_KITS).toEqual([]);
  });
});
