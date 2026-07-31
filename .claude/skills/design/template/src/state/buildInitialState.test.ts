import { describe, it, expect } from "vitest";
import { buildInitialState } from "./buildInitialState";
import { SLIDES } from "../slides";

describe("buildInitialState", () => {
  it("copies every seed slide", () => {
    const s = buildInitialState();
    expect(s.slides.length).toBe(SLIDES.length);
  });

  it("returns slide objects that are not the seed objects (no shared references)", () => {
    const s = buildInitialState();
    if (SLIDES.length) expect(s.slides[0]).not.toBe(SLIDES[0]);
  });

  it("populates defaults from the seed constants", () => {
    const s = buildInitialState();
    expect(s.defaults.surface).toBeDefined();
    expect(s.defaults.format).toBeDefined();
  });
});
