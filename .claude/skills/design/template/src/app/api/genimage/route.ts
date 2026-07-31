import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/imagePrompt";
import { cliStatus, generateViaCli } from "@/lib/higgsfieldCli";
import { saveGeneratedImage } from "@/lib/saveGenerated";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { description, mode, aspectRatio } = (await req.json()) as {
      description?: string; mode?: "hero" | "background" | "cutout"; aspectRatio?: string;
    };
    if (!description?.trim()) return NextResponse.json({ error: "Describe the image first." }, { status: 400 });

    // Surface "not installed" / "not signed in" as a clear message rather than
    // letting the CLI fail deep inside the generate call.
    const status = await cliStatus();
    if (!status.authenticated) return NextResponse.json({ error: status.reason }, { status: 400 });

    const prompt = buildPrompt(description, mode ?? "hero");
    const ar = aspectRatio ?? "1:1";

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = await generateViaCli(prompt, ar);
        const src = await saveGeneratedImage(url);
        return NextResponse.json({ src, prompt });
      } catch (e) { lastErr = e; }
    }
    throw lastErr ?? new Error("Generation failed.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
