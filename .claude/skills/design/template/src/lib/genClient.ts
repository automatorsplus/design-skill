// ============================================================
// Browser-side client for the in-studio image generation API.
// checkGen() gates the UI; generateImage() drives a single request.
// ============================================================

export interface GenStatus {
  ready: boolean;
  installed: boolean;
  /** User-facing reason the panel is disabled. Empty when ready. */
  reason: string;
}

const OFFLINE: GenStatus = {
  ready: false,
  installed: false,
  reason: "Higgsfield CLI not found. Run: npm install -g @higgsfield/cli",
};

/** Whether the Higgsfield CLI is installed and signed in. */
export async function checkGen(): Promise<GenStatus> {
  try {
    const r = await fetch("/api/genstatus");
    const j = await r.json();
    return {
      ready: !!j.ready,
      installed: !!j.installed,
      reason: typeof j.reason === "string" ? j.reason : "",
    };
  } catch {
    return OFFLINE;
  }
}

export async function generateImage(opts: { description: string; mode: "hero" | "background" | "cutout"; aspectRatio: string }): Promise<{ src: string }> {
  const r = await fetch("/api/genimage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(opts),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || "Generation failed.");
  return { src: j.src };
}
