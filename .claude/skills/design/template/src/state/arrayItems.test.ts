import { describe, it, expect } from "vitest";
import { editorReducer, type EditorState } from "./editorState";

const withList = (): EditorState => ({
  slides: [{ type: "list", title: "L", items: ["a", "b", "c"] }],
  defaults: { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" },
});

describe("array item actions", () => {
  it("setArrayItem replaces one item", () => {
    const s = editorReducer(withList(), { type: "setArrayItem", index: 0, field: "items", itemIndex: 1, value: "B!" });
    expect(s.slides[0].items).toEqual(["a", "B!", "c"]);
  });
  it("addArrayItem appends", () => {
    const s = editorReducer(withList(), { type: "addArrayItem", index: 0, field: "items", value: "d" });
    expect(s.slides[0].items).toEqual(["a", "b", "c", "d"]);
  });
  it("removeArrayItem removes", () => {
    const s = editorReducer(withList(), { type: "removeArrayItem", index: 0, field: "items", itemIndex: 0 });
    expect(s.slides[0].items).toEqual(["b", "c"]);
  });
  it("does not mutate the input array", () => {
    const st = withList();
    editorReducer(st, { type: "setArrayItem", index: 0, field: "items", itemIndex: 0, value: "z" });
    expect(st.slides[0].items).toEqual(["a", "b", "c"]);
  });
  it("addArrayItem on an undefined field starts a new array", () => {
    const s = editorReducer(withList(), { type: "addArrayItem", index: 0, field: "stats", value: { value: "1", label: "x" } });
    expect(s.slides[0].stats).toEqual([{ value: "1", label: "x" }]);
  });
});
