import { describe, it, expect } from "vitest";
import { blankSlide } from "./blankSlide";

describe("blankSlide", () => {
  it("returns a slide of the requested type", () => {
    expect(blankSlide("hook").type).toBe("hook");
    expect(blankSlide("stats").type).toBe("stats");
  });
  it("hook has placeholder text", () => {
    expect(typeof blankSlide("hook").text).toBe("string");
    expect(blankSlide("hook").text!.length).toBeGreaterThan(0);
  });
  it("stats seeds a non-empty stats array", () => {
    expect(Array.isArray(blankSlide("stats").stats)).toBe(true);
    expect(blankSlide("stats").stats!.length).toBeGreaterThan(0);
  });
  it("list seeds a non-empty items array", () => {
    expect(blankSlide("list").items!.length).toBeGreaterThan(0);
  });
});
