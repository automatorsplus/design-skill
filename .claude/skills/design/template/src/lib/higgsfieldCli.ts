// ============================================================
// Higgsfield CLI adapter.
//
// The studio shells out to the official `@higgsfield/cli` binary rather than
// calling the HTTP API with a key. Auth is a one-time `higgsfield auth login`
// (browser OAuth, stored by the CLI), so the studio needs no secrets of its
// own and nothing lands in .env.local.
// ============================================================

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Binary names the CLI installs, in preference order.
 * The CLI also answers to `hf`, but that name belongs to the Hugging Face CLI
 * on many machines, so it is deliberately not probed.
 */
const BINARIES = ["higgsfield", "higgs"];

/**
 * Default text-to-image job type: Nano Banana 2. Override with HIGGSFIELD_MODEL.
 * Its aspect_ratio list includes 4:5, which the studio's default slide format
 * uses, so portrait slides generate at their true ratio.
 */
const DEFAULT_MODEL = "nano_banana_flash";

/**
 * Preferred output size. Nano Banana 2 defaults to 1k, which is soft next to a
 * 1080x1350 slide exported at 2x, so ask for something larger when the model
 * offers it. Override with HIGGSFIELD_RESOLUTION (e.g. 4k).
 */
const DEFAULT_RESOLUTION = "2k";

/** Param names the CLI might use for aspect ratio, in preference order. */
const RATIO_PARAMS = ["aspect_ratio", "aspectRatio", "ratio", "size"];

/** Param names the CLI might use for output size, in preference order. */
const RESOLUTION_PARAMS = ["resolution", "quality"];

export interface CliStatus {
  installed: boolean;
  authenticated: boolean;
  /** Short, user-facing reason the panel is disabled. Empty when usable. */
  reason: string;
}

let resolvedBinary: string | null = null;

/** First CLI binary that responds, or null when none is installed. */
async function findBinary(): Promise<string | null> {
  if (resolvedBinary) return resolvedBinary;
  for (const bin of BINARIES) {
    try {
      await run(bin, ["--version"], { timeout: 10_000 });
      resolvedBinary = bin;
      return bin;
    } catch {
      // try the next name
    }
  }
  return null;
}

/**
 * Whether the studio can generate right now. `auth token` exits non-zero when
 * there is no stored login, which is the cheapest reliable signal the CLI gives.
 */
export async function cliStatus(): Promise<CliStatus> {
  const bin = await findBinary();
  if (!bin) {
    return {
      installed: false,
      authenticated: false,
      reason: "Higgsfield CLI not found. Run: npm install -g @higgsfield/cli",
    };
  }
  try {
    await run(bin, ["auth", "token"], { timeout: 15_000 });
    return { installed: true, authenticated: true, reason: "" };
  } catch {
    return {
      installed: true,
      authenticated: false,
      reason: "Not signed in to Higgsfield. Run: higgsfield auth login",
    };
  }
}

interface ModelParam {
  name: string;
  enum?: string[];
}

const paramCache = new Map<string, ModelParam[] | null>();

/**
 * Params a job type accepts, from `model get --json`. Used so we only pass an
 * aspect ratio when the model takes one, and only a value it actually allows.
 * Returns null when the shape can't be read, meaning "send prompt only".
 */
async function modelParams(bin: string, model: string): Promise<ModelParam[] | null> {
  if (paramCache.has(model)) return paramCache.get(model) ?? null;
  let result: ModelParam[] | null = null;
  try {
    const { stdout } = await run(bin, ["model", "get", model, "--json"], { timeout: 30_000 });
    const parsed = JSON.parse(stdout) as { params?: unknown };
    if (Array.isArray(parsed.params)) {
      result = parsed.params
        .filter((p): p is ModelParam => !!p && typeof (p as ModelParam).name === "string")
        .map((p) => ({ name: p.name, enum: Array.isArray(p.enum) ? p.enum : undefined }));
    }
  } catch {
    result = null;
  }
  paramCache.set(model, result);
  return result;
}

/** "16:9" -> 1.777…, or null when it isn't a ratio. */
function ratioValue(label: string): number | null {
  const m = label.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return h > 0 ? w / h : null;
}

/**
 * Snap a requested ratio to the nearest one the model allows.
 *
 * Nano Banana 2 covers every format the studio uses, including 4:5, so this is
 * usually a pass-through. It matters on models with a narrower list: Soul 2.0
 * has no 4:5, and passing it straight through fails the job, so a Threads /
 * Instagram portrait slide lands on 3:4 instead of erroring.
 */
/** "1.5k" -> 1500, "4k" -> 4000. null when it isn't a size label. */
function resolutionValue(label: string): number | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*k$/i);
  return m ? Math.round(Number(m[1]) * 1000) : null;
}

/**
 * Pick an output size from what the model offers.
 *
 * Uses the preferred value when it is allowed. Otherwise takes the largest
 * option that does not exceed the preference, so a model without the exact
 * label still gets a sensible size rather than its 1k default. Falls back to
 * the smallest allowed value when everything is above the preference.
 */
export function pickResolution(preferred: string, allowed: string[]): string | null {
  if (!allowed.length) return null;
  if (allowed.includes(preferred)) return preferred;
  const target = resolutionValue(preferred);
  if (target === null) return null;
  const sized = allowed
    .map((label) => ({ label, value: resolutionValue(label) }))
    .filter((o): o is { label: string; value: number } => o.value !== null)
    .sort((a, b) => a.value - b.value);
  if (!sized.length) return null;
  const atOrBelow = sized.filter((o) => o.value <= target);
  return atOrBelow.length ? atOrBelow[atOrBelow.length - 1].label : sized[0].label;
}

export function nearestAllowedRatio(requested: string, allowed: string[]): string {
  if (allowed.includes(requested)) return requested;
  const target = ratioValue(requested);
  if (target === null) return allowed[0] ?? requested;
  let best = allowed[0] ?? requested;
  let bestDiff = Infinity;
  for (const option of allowed) {
    const value = ratioValue(option);
    if (value === null) continue;
    const diff = Math.abs(value - target);
    if (diff < bestDiff) { bestDiff = diff; best = option; }
  }
  return best;
}

/** Pull the first image URL out of whatever shape the CLI prints. */
function findUrl(payload: unknown): string | null {
  let found: string | null = null;
  const walk = (node: unknown): void => {
    if (found) return;
    if (typeof node === "string") {
      if (/^https?:\/\/\S+/i.test(node)) found = node;
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) walk(value);
    }
  };
  walk(payload);
  return found;
}

/**
 * Generate one image and return its remote URL.
 * Throws with the CLI's own stderr when the job fails, so the studio can show
 * the real reason rather than a generic failure.
 */
export async function generateViaCli(prompt: string, aspectRatio: string): Promise<string> {
  const bin = await findBinary();
  if (!bin) throw new Error("Higgsfield CLI not found. Run: npm install -g @higgsfield/cli");

  const model = process.env.HIGGSFIELD_MODEL || DEFAULT_MODEL;
  const args = ["generate", "create", model, "--prompt", prompt, "--wait", "--json"];

  const params = await modelParams(bin, model);
  if (params) {
    const ratioParam = params.find((p) => RATIO_PARAMS.includes(p.name));
    if (ratioParam) {
      const value = ratioParam.enum?.length
        ? nearestAllowedRatio(aspectRatio, ratioParam.enum)
        : aspectRatio;
      args.push(`--${ratioParam.name}`, value);
    }

    const resParam = params.find((p) => RESOLUTION_PARAMS.includes(p.name));
    if (resParam?.enum?.length) {
      const preferred = process.env.HIGGSFIELD_RESOLUTION || DEFAULT_RESOLUTION;
      const value = pickResolution(preferred, resParam.enum);
      if (value) args.push(`--${resParam.name}`, value);
    }
  }

  let stdout: string;
  try {
    ({ stdout } = await run(bin, args, { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 }));
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const detail = (e.stderr || e.stdout || e.message || "").trim().split("\n")[0];
    throw new Error(detail || "Higgsfield CLI generation failed.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // Not JSON — fall back to scanning the raw output for a URL.
    parsed = stdout;
  }
  const url = findUrl(parsed);
  if (!url) throw new Error("Generation finished but no image URL came back.");
  return url;
}
