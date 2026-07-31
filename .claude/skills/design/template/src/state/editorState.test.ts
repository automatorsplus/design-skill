import { describe, it, expect } from "vitest";
import { editorReducer, type EditorState } from "./editorState";

const base: EditorState = {
  slides: [
    { type: "hook", text: "one" },
    { type: "body", title: "T", text: "two" },
  ],
  defaults: { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" },
};

describe("editorReducer", () => {
  it("patchSlide updates only the target slide", () => {
    const next = editorReducer(base, { type: "patchSlide", index: 1, patch: { text: "changed" } });
    expect(next.slides[1].text).toBe("changed");
    expect(next.slides[0].text).toBe("one");
  });

  it("patchSlide does not mutate the input", () => {
    editorReducer(base, { type: "patchSlide", index: 0, patch: { text: "x" } });
    expect(base.slides[0].text).toBe("one");
  });

  it("patchSlide out of range is a no-op", () => {
    const next = editorReducer(base, { type: "patchSlide", index: 9, patch: { text: "x" } });
    expect(next).toEqual(base);
  });

  it("setDefaults merges", () => {
    const next = editorReducer(base, { type: "setDefaults", patch: { accent: "teal" } });
    expect(next.defaults.accent).toBe("teal");
    expect(next.defaults.surface).toBe("white");
  });

  it("replaceState returns the provided state", () => {
    const replacement: EditorState = {
      slides: [{ type: "quote", text: "brand new" }],
      defaults: { font: "mono", surface: "dark", accent: "teal", purpose: "presentation", bg: "none", format: "instagram-square" },
    };
    const next = editorReducer(base, { type: "replaceState", state: replacement });
    expect(next).toBe(replacement);
  });
});
