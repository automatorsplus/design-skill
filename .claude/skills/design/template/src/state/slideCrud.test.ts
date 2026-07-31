import { describe, it, expect } from "vitest";
import { editorReducer, type EditorState } from "./editorState";

const mk = (n: number): EditorState => ({
  slides: Array.from({ length: n }, (_, i) => ({ type: "body", title: `T${i}`, text: `x${i}` })),
  defaults: { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" },
});

describe("slide CRUD", () => {
  it("addSlide inserts after index", () => {
    const s = editorReducer(mk(2), { type: "addSlide", index: 0, slide: { type: "hook", text: "new" } });
    expect(s.slides.map((x) => x.type)).toEqual(["body", "hook", "body"]);
  });
  it("addSlide index -1 inserts at front", () => {
    const s = editorReducer(mk(1), { type: "addSlide", index: -1, slide: { type: "hook", text: "new" } });
    expect(s.slides[0].type).toBe("hook");
  });
  it("deleteSlide removes target", () => {
    const s = editorReducer(mk(3), { type: "deleteSlide", index: 1 });
    expect(s.slides.map((x) => x.title)).toEqual(["T0", "T2"]);
  });
  it("deleteSlide is a no-op on a single-slide deck", () => {
    const st = mk(1);
    expect(editorReducer(st, { type: "deleteSlide", index: 0 })).toEqual(st);
  });
  it("duplicateSlide inserts a copy after", () => {
    const s = editorReducer(mk(2), { type: "duplicateSlide", index: 0 });
    expect(s.slides.length).toBe(3);
    expect(s.slides[1].title).toBe("T0");
    expect(s.slides[1]).not.toBe(s.slides[0]);
  });
  it("moveSlide reorders", () => {
    const s = editorReducer(mk(3), { type: "moveSlide", from: 0, to: 2 });
    expect(s.slides.map((x) => x.title)).toEqual(["T1", "T2", "T0"]);
  });
  it("does not mutate input", () => {
    const st = mk(2);
    editorReducer(st, { type: "duplicateSlide", index: 0 });
    expect(st.slides.length).toBe(2);
  });
});
