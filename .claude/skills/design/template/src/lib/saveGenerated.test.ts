import { describe, it, expect } from "vitest";
import { extensionFor } from "./saveGenerated";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const webp = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP", "ascii")]);
const gif = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.alloc(6)]);

describe("extensionFor", () => {
  it("detects real formats from magic bytes", () => {
    expect(extensionFor(png)).toBe("png");
    expect(extensionFor(jpg)).toBe("jpg");
    expect(extensionFor(webp)).toBe("webp");
    expect(extensionFor(gif)).toBe("gif");
  });

  it("trusts the bytes over a wrong content-type", () => {
    // Higgsfield returned WebP for a .png-looking URL; the bytes win.
    expect(extensionFor(webp, "image/png")).toBe("webp");
  });

  it("falls back to content-type when the bytes are unrecognised", () => {
    const junk = Buffer.alloc(12);
    expect(extensionFor(junk, "image/webp")).toBe("webp");
    expect(extensionFor(junk, "image/jpeg")).toBe("jpg");
  });

  it("defaults to png when nothing identifies the format", () => {
    expect(extensionFor(Buffer.alloc(12))).toBe("png");
    expect(extensionFor(Buffer.alloc(0), null)).toBe("png");
  });
});
