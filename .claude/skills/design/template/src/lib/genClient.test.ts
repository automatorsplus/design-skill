import { describe, it, expect, vi, afterEach } from "vitest";
import { checkGen, generateImage } from "./genClient";

afterEach(() => vi.restoreAllMocks());

describe("genClient", () => {
  it("checkGen reports ready when the CLI is signed in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ ready: true, installed: true, reason: "" }) })));
    expect(await checkGen()).toEqual({ ready: true, installed: true, reason: "" });
  });

  it("checkGen passes through the reason when not signed in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ready: false, installed: true, reason: "Not signed in to Higgsfield. Run: higgsfield auth login" }),
    })));
    const s = await checkGen();
    expect(s.ready).toBe(false);
    expect(s.installed).toBe(true);
    expect(s.reason).toMatch(/auth login/);
  });

  it("checkGen falls back to not-installed when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const s = await checkGen();
    expect(s.ready).toBe(false);
    expect(s.reason).toMatch(/npm install -g @higgsfield\/cli/);
  });

  it("generateImage returns src on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ src: "/images/generated/x.png" }) })));
    expect(await generateImage({ description: "cat", mode: "hero", aspectRatio: "1:1" })).toEqual({ src: "/images/generated/x.png" });
  });

  it("generateImage throws on error payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Not signed in to Higgsfield. Run: higgsfield auth login" }) })));
    await expect(generateImage({ description: "cat", mode: "hero", aspectRatio: "1:1" })).rejects.toThrow(/auth login/);
  });
});
