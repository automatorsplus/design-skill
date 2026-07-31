---
name: design
user_invocable: true
description: >
  Render text into finished social images using a local code template. Slides are drawn in code locally so a deck is cohesive by construction and text slides cost nothing; optional artwork generation runs through the Higgsfield CLI with no API keys. Two modes from one engine — ask for a carousel and it builds a multi-slide deck, ask for a single image and it renders one.
  12 slide types (plus a points variant of body), 6 format presets (incl. 1920x1080 wide for decks), composable font x surface x accent x purpose style system, optional full-bleed photo backgrounds with text overlay.
  Code-rendered images for your own brand. You write the copy, this skill turns it into images.
  Triggers: design, make an image, make a carousel, create a post image, render carousel, carousel, slide images, carousel png, carousel pdf, presentation deck, single image, image post, quote card, branded image png.
---

# Design

Renders text into finished social images for Instagram, Threads, LinkedIn, TikTok, Stories, or a wide presentation deck. The images are drawn in code from one locked template, so everything is cohesive by construction. Free and instant; optional artwork generation goes through the Higgsfield CLI.

> A local code-render studio with a custom dashboard UI.

## Two modes, one engine

The only difference is how many slides you put in `SLIDES`:

- **Carousel mode** — multiple slides (a deck). Use when the user asks for a carousel, a deck, a thread, a multi-slide post, or a presentation.
- **Single-image mode** — exactly one slide. Use when the user asks for a single image, an image post, a quote card, a hero stat, or one graphic. The progress dots auto-hide when there is one slide, so the export is clean.

If it's ambiguous, infer from the ask and the content: one tight idea or a pulled quote → single image; a sequence/list/story that needs steps → carousel. When genuinely unclear, ask one short question.

## Invocation

```
/design <post text>
/design path/to/post.md
```

One-time install: `bun install` in `template/`. The engine is local and code-only, it makes no network calls of its own (fonts load from Google at build).

## First run — set up the user's brand

This skill ships **unbranded**. `template/src/lib/brandKits.ts` exports an empty array, so the Brand section of the control rail stays hidden and no handle appears on any CTA slide. That is deliberate: the brand is the user's, not the author's.

**On the first `/design` run in a project** (detect it: `BRAND_KITS` is `[]`), ask these four short questions in one message, then carry on. Do not block on them — if the user says "just make it", skip the kit and omit `handle` entirely.

1. **What handle should go on the last slide?** (e.g. `@yourhandle`. Or "none" — the CTA works fine without one.)
2. **What should the brand be called?** (a short label for the one-click preset, e.g. "Main")
3. **Light or dark?** → maps to a `surface`: `white` / `light` / `paper` (light) or `dark` / `neon` / `ember` (dark)
4. **What's the accent colour?** → nearest of the 11 `accent` ids. If they give a hex, pick the closest and say which one you picked.

Then write their answers into `template/src/lib/brandKits.ts`:

```ts
export const BRAND_KITS: BrandKit[] = [
  { id: "main", name: "Main", surface: "white", accent: "violet", font: "clean", handle: "@yourhandle" },
];
```

Adding at least one kit makes the **Brand** section appear in the left rail; clicking it reskins the whole deck and stamps the handle onto every CTA slide. Multiple brands (personal, company, client) = multiple entries.

Store the answers so later runs don't re-ask. If the project has a `CLAUDE.md`, note the handle and kit there.

**Never invent a handle, and never carry one over from another project.** If you don't know it, omit the `handle` key.

## Style defaults

Defaults live in `slides.ts`. Keep them unless the user's brand kit or the post calls for something different:

- **Surface:** `white` (clean, lots of white space) or `dark` for photo-background posts
- **Accent:** `violet` (or whichever accent matches the brand)
- **Font:** `clean` (Inter)
- **Format:** carousel → `threads-4x5` (1080x1350); single image → `instagram-square` (1080x1080); Stories → `story-9x16`
- **Background:** carousel → `glow`; single image → `none`

## Copy Rules (your brand voice — always apply)

> If the shared writing-style skill is installed (`.claude/skills/writing-style/SKILL.md`), run its blocking anti-slop check over all copy before rendering. The list below is the fallback when it is not installed.

When generating image copy from a post or prompt:

1. **Condense aggressively.** Max 12–15 words per slide title or hook. Cut filler ruthlessly.
2. **Short lines.** One idea per slide. No paragraphs — punchy lines or short bullets.
3. **Preserve the original idea.** Don't change the message, just compress it.
4. **Voice:** direct, specific, first-person when appropriate. No corporate tone, no AI hype.
5. **Forbidden words:** unlock, elevate, transform, game-changing, cutting-edge, seamless, robust, tailored, empower, leverage, revolutionize, supercharge, streamline, boost, maximize, scalable, next-gen, digital transformation.
6. **No fake inspiration.** No "the future belongs to...", no motivational sign-offs.
7. **Hook:** punchy enough to stop the scroll. Use contrast, a specific outcome, or a counterintuitive claim.
8. **CTA (carousels):** one action, one line. The handle is the user's own — ask for it, or omit `handle` entirely. Never invent one or carry over a handle from another project.

## Personal Photos (imageFill)

Personal photos live in `template/public/images/yours/`. To use a photo as a slide background:

```ts
{ type: "image", imageFill: true, imageSrc: "/images/yours/photo.jpg", title: "Your title here" }
```

`imageFill: true` renders the photo full-bleed with a `rgba(0,0,0,0.55)` dark overlay so white text stays readable. Background decoration is disabled automatically for these slides.

When the user says "add my photo" or "use a background photo", copy the file to `template/public/images/yours/` and use `imageFill: true`.

### Fetching a free stock photo

When the user wants a photo background but has no file ("grab a travel photo", "find a relevant image"), the skill can fetch a free stock image from the web and save it locally — no API key, and because it lands as a same-origin file the export pipeline handles it cleanly (external URLs get blanked by `html-to-image`, local files don't).

1. Find a freely-usable image for the topic. Keyless option: Openverse search API —
   `curl -s "https://api.openverse.org/v1/images/?q=<topic>&license_type=commercial&page_size=5"` and read the `results[].url`. Or use the assistant's own web search/fetch to locate a free-to-use image (Unsplash, Pexels, Openverse).
2. Download it into `template/public/images/yours/` with a safe lowercase name:
   `curl -sL "<image-url>" -o template/public/images/yours/<topic>.jpg`
3. Verify it actually downloaded (non-zero size, real image) and reference it: `imageFill: true, imageSrc: "/images/yours/<topic>.jpg"`.
4. Note the source/attribution in your message to the user so they can credit it if the platform needs it.

Keep this to the agent (generate-step) path. The in-studio "Search Unsplash" button is future work — it needs an Unsplash API key and a local download route.

### Reference style: "headline on top of photo"

When the user says "add my image with a headline on top" or similar, use this exact pattern:

- Full-bleed photo background (`imageFill: true`) with dark overlay
- Headline text in the **upper-center** of the slide (not vertically centered — upper third)
- Two-line structure: a regular-weight setup line, then the key phrase in **bold italic** below it
- White text only, no accent color on image slides — the photo provides the visual interest
- Subject/person in the photo sits in the **lower half**, text floats above them
- Keep the headline short: max 15 words across both lines

```ts
{
  type: "image",
  imageFill: true,
  imageSrc: "/images/yours/photo.jpg",
  title: "If I were to start creating content from scratch with zero camera and zero experience,",
  text: "this is what I'd tell myself..."
}
```

## Format presets (choose target platform)

| Preset | Size | Platforms |
|---|---|---|
| `threads-4x5` | 1080×1350 | Threads, Instagram feed (portrait) |
| `instagram-square` | 1080×1080 | Instagram, Facebook, LinkedIn feed |
| `linkedin-square` | 1080×1080 | LinkedIn document post (PDF) |
| `tiktok-9x16` | 1080×1920 | TikTok Photo Mode, Reels, Shorts |
| `story-9x16` | 1080×1920 | Instagram Stories, Threads Stories |
| `wide-16x9` | 1920×1080 | Presentations, YouTube, desktop decks |

## Slide types (12, plus a points variant of body)

| Type | Purpose | Required fields |
|---|---|---|
| `hook` | The catchiest line | `text` |
| `body` | Title + paragraph | `title`, `text` |
| `body` (points) | Pros/cons list with ✓/✗ SVG icons | `title`, `points[]` (instead of `text`) |
| `list` | Numbered items (ordered list) | `title`, `items[]` |
| `stats` | Big numbers with labels | `title`, `stats[]` |
| `quote` | Large pulled quote | `text`, `author` |
| `checklist` | Checkmark bullets | `title`, `items[]` |
| `process` | Numbered steps with connector line | `title`, `steps[]` |
| `comparison` | Two-column VS / before-after | `leftLabel`, `leftItems[]`, `rightLabel`, `rightItems[]` |
| `cta` | Final call to action | `text`, `handle` |
| `image` | Title + screenshot/photo + optional caption | `imageSrc`, optional `title`, `imageCaption` |
| `emoji` | Giant emoji illustration + title + text | `emoji`, optional `title`, `text` |
| `number` | Huge hero number/string + title + text | `bigNumber`, optional `title`, `text` |

For a single image, reach for `hook`, `quote`, `number`, `body`, or `image`. Carousels use the full mix.

`points` shape: `Array<{ type: "plus" | "minus"; text: string }>` — green ✓ for plus, muted ✗ for minus. Adaptive sizing (44–62px) based on item count and longest line.

All types also support optional:
- `badge` — small outlined tag above title (e.g. `"01"`, `"TIP"`)
- `highlight` — a word or phrase within `text`/`title` colored in the preset's accent color (`violet` by default)
- `highlightStyle: "italic-box"` — renders the highlighted word in Playfair italic on a colored rectangle (instead of plain color)

### Images in slides

`image` slides expect `imageSrc` as a path served by Next.js under `/public/`. Workflow when a user gives you a local file:

1. User drops a file path like `/Users/me/Desktop/screenshot.png` (or passes a file via the chat).
2. Copy it into `template/public/images/` with a safe, lowercase filename — e.g. `cp "$USER_PATH" template/public/images/screenshot.png`.
3. In `slides.ts` reference it as `imageSrc: "/images/screenshot.png"` (absolute from `/public/`).

Same-origin serving avoids CORS errors in the PNG export pipeline. Do not use external URLs — `html-to-image` will often blank them out.

## Background decorations (8 types)

Switchable via toolbar in preview. Default: `glow` for carousels, `none` for single images.

| Type | What it is |
|---|---|
| `none` | Solid background |
| `blobs` | Organic colored shapes |
| `grid` | Dotted grid pattern |
| `lines` | Diagonal line pattern |
| `paper` | Ruled notebook lines + left margin (use with `paper`/`light`/`white` for a literary feel) |
| `noise` | SVG grain overlay (overlay blend) |
| `bignumber` | Giant number as watermark (01, 02…) |
| `glow` | Soft radial gradient in alternating corners |

## Style system (4 independent axes)

The final style is composed at runtime from four axes via `composePreset(font, surface, accent, purpose)`:

**Font axis** (`DEFAULT_FONT`), 5 typefaces:

| Id | Font | Feel |
|---|---|---|
| `minimal` | Unbounded (body + hook) | Geometric display, bold, distinctive |
| `editorial` | Playfair Display | Classic serif, literary |
| `clean` *(default)* | Inter | Neutral sans-serif, most standard |
| `mono` | JetBrains Mono | Monospace, tech/dev feel |
| `condensed` | Oswald | Narrow + tall, editorial poster |

**Surface axis** (`DEFAULT_SURFACE`) — bg + text neutrals, 8 options:

| Id | Bg | Text | Feel |
|---|---|---|---|
| `dark` | `#0A0A0A` | white | bold dark |
| `white` *(default)* | pure `#FFFFFF` | near-black | sharp clinical, Apple-style |
| `light` | cool zinc `#F4F4F5` | near-black | neutral cool grey, Vercel-style |
| `paper` | cream `#ECE2C8` | warm brown | notebook / literary warm |
| `gradient` | purple→pink→amber | white | bright gradient |
| `pastel` | lilac `#EDE9FE` | indigo | soft |
| `neon` | dark gradient | light cyan | tech dark |
| `ember` | black→red radial | near-white | dramatic |

**Accent axis** (`DEFAULT_ACCENT`) — pop color for highlighted words, 11 options:

| Id | Hex | Matches surfaces |
|---|---|---|
| `yellow` | `#FACC15` | dark, ember |
| `red` | `#DC2626` | white, light, paper |
| `teal` | `#14B8A6` | dark, white, light, paper |
| `coral` | `#FB7185` | paper, light, white |
| `orange` | `#F97316` | paper, light, dark |
| `violet` *(default)* | `#A78BFA` | white, dark, neon, ember |
| `lime` | `#D9F056` | ember, dark |
| `blue` | `#3B82F6` | white, light, paper, dark |
| `fuchsia` | `#C026D3` | pastel, white, dark |
| `pink` | `#EC4899` | pastel, dark, light |
| `amber` | `#F59E0B` | gradient, dark, paper |

Total combinations: 5 fonts × 8 surfaces × 11 accents × 2 purposes = **880 valid styles**. Pick surface for neutral base, accent for pop color, independently.

**Reference combos:**
- `dark + teal` — noir / minimalist tech
- `paper + orange` — literary warm
- `ember + lime` — dramatic announcement
- `white + violet` — clean and neutral
- `light + teal` — calm informational

**Purpose axis** (`DEFAULT_PURPOSE`):

| Id | Title | Body | Divider |
|---|---|---|---|
| `carousel` *(default)* | 44px, weight 800, UPPERCASE | weight 600, `textColor`, line-height 1.2 | visible (96×4px accent) |
| `presentation` | 72px, weight 700, sentence case | weight 400, `textSecondary`, line-height 1.45 | hidden |

Pick `purpose: "presentation"` + `format: "wide-16x9"` for a desktop / YouTube presentation deck.

---

## Workflow

### Step 1 — Get the text

- If passed inline — use it.
- If a file path (`.md`, `.txt`) — read it.
- If text is long (>500 chars) — confirm it's complete before planning.

### Step 2 — Decide the mode and parameters

First decide **carousel** vs **single image** (see "Two modes" above). Then ask once (combined), or assume defaults if the user says "your call":

**Both modes:**
- **Format** (default `threads-4x5` for carousels, `instagram-square` for single images; `wide-16x9` for a deck; `story-9x16` for Stories)
- **Surface** (8 options, default `white`) and **Accent** (11 options, default `violet`)
- **Font** (`minimal` / `editorial` / `clean` / `mono` / `condensed`, default `clean`)

**Carousel only:**
- **Number of slides** (3–10, default 6)
- **Purpose** (`carousel` or `presentation`, default `carousel`)
- **Handle** for the CTA slide — the user's own (e.g. `@username`). Ask if you don't already have it from the first-run setup; omit the key rather than guessing.

**Single image only:**
- **Image type** (`hook` / `quote` / `number` / `body` / `image`, default `hook`)

Shortcut: if user says "presentation" / "slide deck" → carousel mode, `purpose: presentation`, `format: wide-16x9`, `font: clean`, `surface: white`.

### Step 3 — Plan (carousel mode only)

Show the user a preview list before generation:

```
Slide 1 (hook): "Headline..."  [highlight: "word"]
Slide 2 (body): badge 01 — "Title" / "Text..."
Slide 3 (list): badge 02 — "Stack" / 3 items
Slide 4 (stats): badge 03 — "Growth" / 3 stats
Slide 5 (quote): "Quote..." — Author
Slide 6 (cta): "Final message" @username
```

Rules for splitting text into slides:

1. **Hook** = single most intriguing line from the post. 1–3 short lines. Works as a standalone thumbnail.
2. **Body slides** = one idea each. Max 40 words. Max 5 lines. Never join two ideas with "and".
3. **Mix slide types** for visual variety: `list` for enumerations, `stats` for numbers, `quote` for direct speech, `comparison` for VS/before-after. Don't make every slide a `body`.
4. **CTA** = conclusion + follow handle. Centered, short.

For single-image mode, there's nothing to plan — one slide, one idea.

### Step 4 — Generate

#### Prepare working copy

```bash
WORK_DIR="/tmp/design-$(date +%s)"
rsync -a --exclude=node_modules ~/.claude/skills/design/template/ "$WORK_DIR/"
ln -s ~/.claude/skills/design/template/node_modules "$WORK_DIR/node_modules"
cd "$WORK_DIR"
```

Symlinking `node_modules` avoids the 350MB copy per run.

#### Inject content into `src/slides.ts`

All content + defaults live in `src/slides.ts` — never touch the engine (`src/app/CarouselApp.tsx`, `src/lib/*`). Edit the `SLIDES` array and the 6 default constants. The style axes are split into separate `DEFAULT_SURFACE` and `DEFAULT_ACCENT` constants (there is no single "color" constant).

**Carousel injection example** (multiple slides):

```ts
import type { SlideData, BgType, FormatId, FontId, SurfaceId, AccentId, PurposeId } from "./lib/types";

export const SLIDES: SlideData[] = [
  { type: "hook", text: "Line one\nline two", highlight: "two" },
  { type: "body", badge: "01", title: "Title", text: "Body text...", highlight: "key" },
  { type: "list", badge: "02", title: "Steps", items: ["First", "Second", "Third"] },
  { type: "stats", title: "Numbers", stats: [
    { value: "10×", label: "Faster" },
    { value: "50%", label: "Smaller" },
  ]},
  { type: "quote", text: "Big idea\nin few words", author: "Someone", role: "2026" },
  { type: "cta", text: "Last word", handle: "@username" },
];

export const DEFAULT_FONT: FontId = "clean";
export const DEFAULT_SURFACE: SurfaceId = "white";
export const DEFAULT_ACCENT: AccentId = "violet";
export const DEFAULT_PURPOSE: PurposeId = "carousel";
export const DEFAULT_BG: BgType = "glow";
export const DEFAULT_FORMAT: FormatId = "threads-4x5";
```

**Single-image injection example** (exactly one slide, `bg: none`, square format):

```ts
import type { SlideData, BgType, FormatId, FontId, SurfaceId, AccentId, PurposeId } from "./lib/types";

export const SLIDES: SlideData[] = [
  { type: "quote", text: "The build that earns\nis the one you can show.", author: "Your Name" },
];

export const DEFAULT_FONT: FontId = "clean";
export const DEFAULT_SURFACE: SurfaceId = "white";
export const DEFAULT_ACCENT: AccentId = "violet";
export const DEFAULT_PURPOSE: PurposeId = "carousel";
export const DEFAULT_BG: BgType = "none";
export const DEFAULT_FORMAT: FormatId = "instagram-square";
```

#### Launch preview and export

Claude writes the first-draft content into `src/slides.ts` and launches the studio:

```bash
bun dev
```

The dev server is pinned to port 3333. It opens as a **studio dashboard**: a left control rail (format, one-click style presets, surface, accent, font, background, mode, background-image upload), a large live canvas, and a bottom thumbnail strip. Three switchable skins (Glass / Deck / Editorial) via the compact toggle in the top bar — the choice is remembered between runs. A floating **Tweaks** button on the canvas fine-tunes the selected slide (text scale, padding, highlight box) without changing the defaults. Skins restyle the studio only, never the exported image.

The studio autosaves the working deck to browser `localStorage`, so a plain reload restores the user's edits. That also means a **new run can open on a stale deck** from a previous session in the same browser. When the point of the run is to show the copy you just wrote, hand over `http://localhost:3333?fresh=1` instead — that discards the autosave and rebuilds from `src/slides.ts`. The **New** button in the top bar does the same thing from inside the studio.

Tell the user to open `http://localhost:3333`. They can now:
- Edit any slide text directly on the canvas (click to edit, detailed below)
- Switch **Format / Mode / Font / Surface / Accent / Background** live via the rail
- Style text and other slide properties via the left rail
- Click **Export PDF** to download all slides in one file (`slides.pdf`, JPEG-compressed, ~5–8 MB for 10 slides)
- Click **Export All** to download every slide as `01-hook.png`, `02-body.png`, … (a single PNG in single-image mode)
- Click an individual slide thumbnail to export just that one as PNG

After export, stop the dev server.

#### Artwork generation via the Higgsfield CLI (optional)

The Tweaks panel has a **Generate image** section that puts artwork on a slide without leaving the studio. It runs through the official Higgsfield CLI, so **there are no API keys anywhere in this skill** — the CLI holds its own login.

**Setup, once per machine:**

```bash
npm install -g @higgsfield/cli
higgsfield auth login          # browser OAuth, stores the token itself
```

If the global install hits a permissions error, the npm prefix is root-owned; point npm at a user-writable prefix (`npm config set prefix ~/.npm-global` and put `~/.npm-global/bin` on PATH) rather than reaching for sudo.

**How it works:** you type a plain-English description, pick a mode, and press Generate. The studio appends the mode's framing locally (no model call, no key), shells out to `higgsfield generate create <model> --prompt … --wait --json`, then downloads the result into `public/images/generated/` so it is same-origin and the PNG/PDF export handles it cleanly. A failed generation is retried once.

Three modes:

| Mode | What you get | Where it lands |
|---|---|---|
| `hero` | Illustration or 3D render with a strong focal subject | Turns the slide into an `image` slide |
| `background` | Low-contrast scene with empty space, so overlaid text stays readable | Sets `imageFill` on the current slide |
| `cutout` | One isolated subject on flat white, reads like a sticker | Turns the slide into an `image` slide |

**Model, ratio and size.** Defaults to `nano_banana_flash` — that is the job type for **Nano Banana 2**, despite the slug. Override with `HIGGSFIELD_MODEL`; run `higgsfield model list --image` for what the account can use and `higgsfield model get <job_type>` for its params.

The studio reads the chosen model's params at runtime, so it adapts rather than hardcoding one model's shape:

- **Aspect ratio** snaps to the nearest value the model allows. Nano Banana 2 covers every studio format including 4:5, so this is a pass-through; on Soul 2.0, which has no 4:5, a portrait slide lands on 3:4 instead of failing.
- **Resolution** is requested rather than left on the model default. Nano Banana 2 defaults to `1k`, which is soft against a 1080x1350 slide exported at 2x, so the studio asks for `2k`. Set `HIGGSFIELD_RESOLUTION=4k` for maximum size at higher credit cost. Models topping out lower step down instead of erroring.

**The gate.** `/api/genstatus` shells out to `higgsfield auth token`, which exits non-zero when there is no login. The panel is disabled until that succeeds and shows exactly which step is missing: install the CLI, or sign in. Everything else in the studio works regardless.

**Cost.** Generation spends Higgsfield credits, and only when the button is pressed. The text slides are always free. Quote the cost and get explicit approval before generating on the user's behalf.

Prefer the agent-side stock-photo path (above) when the user wants a real photograph rather than generated art.

#### In-browser editing

The studio supports click-to-edit text directly on the canvas — both scalar fields and array-backed fields (list items, stats, steps, etc.).

**Editable scalar fields** (click any to edit):
- Hook slide: `text`
- Body slide: `title`, `text` (CTA slides share the same renderer but only `text`/`handle` are editable — a CTA's `title` is intentionally not, since CTA slides normally carry no title)
- Quote slide: `text`, `author`, `role`
- CTA slide: `text`, `handle`
- Number slide: `bigNumber`, `title`, `text`
- Emoji slide: `title`, `text`
- Image slide: `title`, `imageCaption`
- Badge: (on any slide type that supports it)

**Editable array fields** (click any item to edit in place):
- List items (`list` and `checklist` slides: `items[]`)
- Stats values and labels (`stats` slide: `stats[]`)
- Process steps — title and text (`process` slide: `steps[]`)
- Comparison columns (`comparison` slide: `leftItems[]`, `rightItems[]`)
- Pros/cons points (`body` slide with points: `points[]`)

**How it works:**
1. Click any editable text field or array item on the canvas to activate inline editing.
2. Make your changes — the canvas and thumbnails update live.
3. Click elsewhere or tab out to commit the edit (blur action). Editing is single-line for now — a line break added mid-edit is not preserved on commit. For multi-line copy, set it in the `src/slides.ts` seed (use `\n`); multi-line in-canvas editing is a later phase.
4. Changes persist in the browser session; export works unchanged — the export path never gets an editable context, so non-editable output is always byte-identical to before any editing feature shipped.
5. Style editing for text runs through the control rail and per-slide inspector (below), not inline formatting.

#### Slide management

The bottom thumbnail strip is a full slide manager, not just a picker:

- **Add** — the `＋` button at the end of the strip opens a slide-type picker; the new slide is inserted immediately after the currently selected slide.
- **Duplicate** — the `⧉` button on a thumbnail copies that slide (with all its content and per-slide style overrides) directly after itself.
- **Delete** — the `✕` button on a thumbnail removes it. Hidden on the last remaining slide — a deck can't go to zero slides.
- **Reorder** — drag a thumbnail to a new position in the strip to reorder the deck.

#### Per-slide inspector (Tweaks panel)

The floating **✦ Tweaks** button on the canvas opens an inspector scoped to the currently selected slide, on top of the global rail controls:

- **Type switcher** — change the selected slide's type without rebuilding it (content is preserved where fields overlap).
- **Badge** and **Highlight word** — set directly on the slide.
- **Per-slide surface / accent / background overrides** — each defaults to "Auto" (inherits the deck-wide default) but can be pinned independently per slide, so a single deck can mix e.g. a dark hook slide with white body slides.
- Fine-tune controls (text scale, padding, alignment, highlight box, progress dots) and the per-slide photo-background upload also live here.

### Step 5 — Auto-challenge (mandatory, always run before delivering)

After writing `src/slides.ts`, before handing over the preview URL, run a self-critique pass. Do NOT skip this. Do NOT ask the user to trigger it.

**Carousel mode:**
- **Narrative flow.** Each slide leads into the next; the arc is complete (problem → cost → solution → proof → CTA). No redundancy. Hook strong enough to stop a scroll.
- **Copy quality.** Every title ≤12 words, every body ≤40 words, one idea per slide. No forbidden words, no corporate tone, no fake inspiration.
- **Type variety.** Not all body slides. Numbers/stats get their own `stats`/`number` type.
- **Highlight discipline.** 1–2 words max, only where it's earned. Not every slide.
- **CTA.** Last slide is a `cta`, one action, short. Carries the user's own `handle` if they gave one, otherwise no `handle` key at all.

**Single-image mode:**
- **Stops the scroll?** Would someone unfamiliar pause on this one image?
- **One idea.** A single point, no second thought crammed in.
- **Copy + legibility.** ≤12–15 words, punchy. Text contrasts the surface or photo overlay. Nothing clipped at the edges.

Score each slide 1–5. Anything ≤3 gets rewritten before delivering — apply fixes directly to `src/slides.ts`. Max 2 rework passes. Then hand over the preview URL and note any remaining weak point.

---

## Design system

Default look (`font: clean`, `surface: white`, `accent: violet`, `purpose: carousel`):

- **Typeface per font axis:** Unbounded (minimal) / Playfair (editorial) / Inter (clean) / JetBrains Mono (mono) / Oswald (condensed). Hooks use `hookFontFamily` when the font axis provides one.
- **Palette (white default):** `#FFFFFF` bg, `#0B0B0B` text, `#A78BFA` highlight. (Dark surface: `#0A0A0A` bg, `#FFFFFF` text.)
- **Layout:** 80px padding, left-aligned, slide counter bottom-center (hidden on single image).
- **Title discipline:** carousel purpose — title → a 96×4px accent divider → body, with ≥64px breathing room above body. Presentation purpose — no divider, sentence case, 72px.
- **Hook size:** 88–170px, adaptive by character/line count.
- **Body text size:** 48–88px, adaptive.
- **Text balance:** `textWrap: "balance"` on hook + title (no orphan words).

### Typography table (carousel purpose)

The `presentation` purpose overrides titles to 72px / 700 / sentence case and body to 400 / `textSecondary` / line-height 1.45.

| Element | Size | Weight | Font source |
|---|---|---|---|
| Hook | 88–170px | 800 | `hookFontFamily` ?? `fontFamily` |
| Title | 44px | 800 uppercase | `fontFamily` |
| Body | 48–88px | 600 | `fontFamily` |
| Points (pros/cons) | 44–62px | 600 | `fontFamily` |
| Badge | 26px | 800 uppercase | `fontFamily` |
| Stats value | 140–170px | 900 | `fontFamily` |
| Stats label | 32px | 500 uppercase | `fontFamily` |
| Quote | 62px | 600 | `fontFamily` |
| List item | 46px | 600 | `fontFamily` (numbers 48px) |
| Big number | 320–560px (auto) | 900 | `hookFontFamily` ?? `fontFamily` |
| Handle | 36px | 500 | `fontFamily` |

## Common mistakes

| Mistake | Fix |
|---|---|
| Too much text on a slide | Max 40 words, max 5 lines |
| Two ideas on one slide | Split into two slides (carousel) or cut to one (single image) |
| All slides are `body` type | Mix in `list`, `stats`, `quote`, `checklist` for variety |
| No hook on first slide | Slide 1 must be the catchiest line |
| No CTA on last slide (carousel) | Last slide must end with a handle or call to action |
| Highlight word too long | Keep highlight to 1–2 words, not a whole phrase |
| Badge has too many characters | Max 2–4 characters (`01`, `TIP`, `NEW`) |

## Future work / TODOs

- **Satori server-side export** — replace browser-based `html-to-image` with Satori + Resvg for CLI export. Enables headless runs.
- **Multi-line in-canvas editing** — click-to-edit (scalar and array fields) is single-line only; line breaks require editing `src/slides.ts` directly.
