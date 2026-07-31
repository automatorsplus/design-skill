import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "./persistence";
import type { EditorState } from "./editorState";

const state: EditorState = {
  slides: [{ type: "hook", text: "hi" }, { type: "list", title: "L", items: ["a", "b"] }],
  defaults: { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" },
};

describe("persistence", () => {
  it("round-trips a state", () => {
    expect(deserialize(serialize(state))).toEqual(state);
  });
  it("returns null on invalid JSON", () => {
    expect(deserialize("not json")).toBeNull();
  });
  it("returns null when shape is wrong (no slides array)", () => {
    expect(deserialize(JSON.stringify({ schemaVersion: 1, defaults: state.defaults }))).toBeNull();
  });
  it("returns null when defaults missing", () => {
    expect(deserialize(JSON.stringify({ schemaVersion: 1, slides: [] }))).toBeNull();
  });
});
