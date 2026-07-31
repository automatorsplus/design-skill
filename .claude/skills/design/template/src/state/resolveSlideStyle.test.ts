import { describe, it, expect } from "vitest";
import { resolveSlideStyle } from "./resolveSlideStyle";
import type { EditorDefaults } from "./editorState";

const d: EditorDefaults = { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" };

describe("resolveSlideStyle", () => {
  it("returns defaults when no override", () => {
    expect(resolveSlideStyle(d, { type: "hook", text: "x" })).toEqual({ font: "clean", surface: "white", accent: "violet", bg: "glow" });
  });
  it("applies override fields only", () => {
    const r = resolveSlideStyle(d, { type: "hook", text: "x", slideStyle: { accent: "teal" } });
    expect(r.accent).toBe("teal");
    expect(r.surface).toBe("white");
  });
});
