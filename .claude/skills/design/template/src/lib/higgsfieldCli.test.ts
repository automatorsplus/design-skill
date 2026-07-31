import { describe, it, expect } from "vitest";
import { nearestAllowedRatio, pickResolution } from "./higgsfieldCli";

// Soul 2.0's real enum. Note it has no 4:5, which is the studio's default format.
const SOUL = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"];
// Nano Banana 2's real enums (the default model).
const NANO = ["1:1", "3:2", "2:3", "4:3", "3:4", "4:5", "5:4", "9:16", "16:9", "21:9"];
const NANO_RES = ["1k", "2k", "4k"];
const SOUL_RES = ["1.5k", "2k"];

describe("nearestAllowedRatio", () => {
  it("passes through a ratio the model already allows", () => {
    expect(nearestAllowedRatio("16:9", SOUL)).toBe("16:9");
    expect(nearestAllowedRatio("1:1", SOUL)).toBe("1:1");
  });

  it("snaps 4:5 to 3:4, the closest portrait the model offers", () => {
    // 4:5 = 0.8; 3:4 = 0.75 (diff 0.05) beats 1:1 = 1.0 (diff 0.2)
    expect(nearestAllowedRatio("4:5", SOUL)).toBe("3:4");
  });

  it("keeps tall and wide requests on the matching orientation", () => {
    expect(nearestAllowedRatio("9:16", SOUL)).toBe("9:16");
    expect(nearestAllowedRatio("21:9", SOUL)).toBe("16:9");
  });

  it("falls back to the first option for unparseable input", () => {
    expect(nearestAllowedRatio("square-ish", SOUL)).toBe("1:1");
  });

  it("returns the request unchanged when there are no options", () => {
    expect(nearestAllowedRatio("4:5", [])).toBe("4:5");
  });

  it("passes every studio format straight through on Nano Banana 2", () => {
    for (const f of ["1:1", "4:5", "9:16", "16:9"]) {
      expect(nearestAllowedRatio(f, NANO)).toBe(f);
    }
  });
});

describe("pickResolution", () => {
  it("uses the preferred size when the model offers it", () => {
    expect(pickResolution("2k", NANO_RES)).toBe("2k");
    expect(pickResolution("4k", NANO_RES)).toBe("4k");
  });

  it("never leaves Nano Banana 2 on its soft 1k default", () => {
    expect(pickResolution("2k", NANO_RES)).not.toBe("1k");
  });

  it("steps down to the largest option under the preference", () => {
    // Soul tops out at 2k, so a 4k preference lands on 2k rather than failing
    expect(pickResolution("4k", SOUL_RES)).toBe("2k");
    expect(pickResolution("1.9k", SOUL_RES)).toBe("1.5k");
  });

  it("falls back to the smallest option when all exceed the preference", () => {
    expect(pickResolution("1k", ["2k", "4k"])).toBe("2k");
  });

  it("returns null when there is nothing usable to pick", () => {
    expect(pickResolution("2k", [])).toBeNull();
    expect(pickResolution("2k", ["standard", "hd"])).toBeNull();
  });
});
