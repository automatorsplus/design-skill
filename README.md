# Design Studio Skill for Claude Code

> Part of the **Automators+** skills library -- Claude Code skills shared with the Automators community: https://www.skool.com/automation-forge-7306

Turn plain text into finished, on-brand social images and carousels, right inside a local studio app. Slides are drawn in code on your own machine, so a whole deck stays cohesive by construction and the text slides cost nothing to produce. You write the copy, Claude drafts the slides, then you edit everything live in the browser. Artwork generation is available too, through the Higgsfield CLI, with no API keys to manage.

## What You Get

- A local **studio app** that pops up at `localhost:3333` -- left control rail, live canvas, thumbnail strip, three skins
- **In-browser editing:** click any text on a slide and type. Add, delete, duplicate, and drag-reorder slides. Edit list items, stats, and steps directly on the canvas
- **Per-slide inspector:** change a slide's type, badge, highlight word, and per-slide colours
- **Brand kits:** define your own, then one click reskins the whole deck (surface, accent, font, handle). Ships empty -- the studio arrives unbranded and Claude sets it up from your answers on the first run
- **Save your work:** autosave (reload and it's back), named projects, and JSON import/export
- **12 slide types** (hook, body, list, stats, quote, checklist, process, comparison, cta, image, emoji, number) and **6 format presets** (Instagram, Threads, TikTok, Stories, LinkedIn PDF, wide 16:9)
- **Export** every slide as PNG, or the whole deck as one PDF
- **Optional image generation** via the Higgsfield CLI -- hero art, backgrounds, or cutouts without leaving the studio. No API keys; the studio works fully without it

## Prerequisites

- [Bun](https://bun.sh) installed (or Node 18+ -- swap `bun` for `npm` in the commands below)
- Claude Code
- Optional, only for image generation: the Higgsfield CLI (`npm install -g @higgsfield/cli`) and a Higgsfield account

## Setup

1. **Get the files.**

   ```
   git clone https://github.com/automatorsplus/design-skill
   ```

2. **Copy the skill into your project.** Copy the `.claude/skills/design/` folder from this repo into your own project's `.claude/skills/` folder (or work directly inside this repo).

3. **Install the studio once.**

   ```
   cd .claude/skills/design/template
   bun install
   ```

4. **Make it yours.** The first time you run `/design`, Claude asks four short questions -- your handle, a name for the brand, light or dark, and your accent colour -- and writes them into `.claude/skills/design/template/src/lib/brandKits.ts`. That switches on the **Brand** button in the left rail, which reskins a whole deck in one click.

   Nothing is pre-set. The skill ships with no brand kits and no handle, so your first deck is yours from slide one. You can skip the questions ("just make it") and add a kit later, or edit that file by hand -- it has a worked example in the comments.

That's it. This skill bundles a small local app, so it is a folder-copy install -- a single-file URL install will not work.

## Try It

In Claude Code, once the skill is in place:

- `/design 5 mistakes people make with their first AI automation`
- `/design turn these notes into a carousel:` (then paste your notes)
- `/design a single quote card: "The build that earns is the one you can show"`
- "make me a LinkedIn carousel from this post" (then paste the post)

Claude writes a first draft of the slides, launches the studio, and hands you `http://localhost:3333`. From there you edit everything in the browser and export.

### Starting from a clean deck

The studio autosaves to your browser, so a plain reload brings your edits back. If you want to discard that and start from the draft Claude just wrote, load:

```
http://localhost:3333?fresh=1
```

That clears the autosaved deck and rebuilds from `slides.ts`. Handy when a new `/design` run opens on an older deck left over in the same browser.

## Optional: image generation

The studio can put generated artwork on a slide without you leaving it. This runs through the official **Higgsfield CLI**, so there are **no API keys to manage** -- the CLI keeps its own login.

To turn it on:

1. **Install the CLI.**

   ```
   npm install -g @higgsfield/cli
   ```

2. **Sign in.** This opens a browser once and stores the token itself.

   ```
   higgsfield auth login
   ```

3. **Restart the studio.** The Generate panel (in Tweaks) is now live: Hero, Background, or Cutout.

Type a plain-English description, pick a mode, press Generate. The image is downloaded next to your project so exports stay clean.

**Notes**

- No `.env.local` needed. Nothing about generation touches an API key.
- Generation spends **Higgsfield credits**. Everything else in the studio, including all text slides and every export, is free and stays free.
- Uses **Nano Banana 2** by default (job type `nano_banana_flash`). Set `HIGGSFIELD_MODEL` to use another; `higgsfield model list --image` shows what your account can run.
- Aspect ratio is matched to the slide format automatically, snapping to the nearest ratio the model supports.
- Rendered at `2k`, not the model's soft `1k` default. Set `HIGGSFIELD_RESOLUTION=4k` for maximum size, which costs more credits.
- If the panel stays disabled it tells you which step is missing, either install or sign in.
- If `npm install -g` fails with a permissions error, your npm prefix is root-owned. Point npm somewhere writable instead of using sudo:

  ```
  npm config set prefix ~/.npm-global
  export PATH="$HOME/.npm-global/bin:$PATH"
  ```

## How It Works

See [`.claude/skills/design/SKILL.md`](.claude/skills/design/SKILL.md) for the full skill definition -- slide types, style system, and the studio workflow.

## License

MIT

---

*Shared with the Automators+ community*
