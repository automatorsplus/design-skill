"use client";

// Design studio — dashboard, controls, and export.
// The slide RENDER engine lives in ../render (Slide / SlidePreview); this file
// is the studio chrome and the PNG/PDF export pipeline.

import { useRef, useState, useCallback, useEffect, useMemo, useReducer } from "react";
import { toPng, toJpeg } from "html-to-image";
import type { SlideData, SlideType, BgType, StylePreset, FontId, SurfaceId, AccentId, PurposeId } from "../lib/types";
import { FONT_STYLES, SURFACES, ACCENTS, composePreset, FORMAT_PRESETS } from "../lib/presets";
import { CanvasSizeProvider } from "../render/canvas";
import { Slide, SlidePreview } from "../render/engine";
import { EditContext } from "../render/EditContext";
import { editorReducer } from "../state/editorState";
import { buildInitialState } from "../state/buildInitialState";
import { blankSlide } from "../state/blankSlide";
import { resolveSlideStyle } from "../state/resolveSlideStyle";
import { serialize, deserialize } from "../state/persistence";
import { listProjects, saveProject, loadProject, saveAutosave, loadAutosave, clearAutosave } from "../state/projects";
import { BRAND_KITS } from "../lib/brandKits";
import { applyBrandKit } from "../state/applyBrandKit";
import { checkGen, generateImage } from "../lib/genClient";

// ============================================================
// UI STRINGS
// ============================================================

const T = {
  appTitle: "Design",
  rowFont: "Font",
  rowSurface: "Surface",
  rowAccent: "Accent",
  rowBg: "Background",
  rowMode: "Mode",
  rowFormat: "Format",
  btnPdf: "Export PDF",
  btnAll: "Export All",
  statusDone: "Done!",
  statusExport: (i: number, n: number) => `Exporting ${i}/${n}...`,
  statusPdf: (i: number, n: number) => `PDF ${i}/${n}...`,
  footer: (w: number, h: number, n: number) =>
    `${w}×${h}px — ${n} slides — Click a slide to export individually`,
  modes: { carousel: "Carousel", presentation: "Presentation" } as Record<PurposeId, string>,
  bgs: {
    none: "None", blobs: "Blobs", grid: "Grid", lines: "Lines",
    noise: "Noise", bignumber: "Bignumber", glow: "Glow", paper: "Ruled",
  } as Record<BgType, string>,
  surfaces: {
    dark: "Dark", white: "White", light: "Light", paper: "Paper",
    gradient: "Gradient", pastel: "Pastel", neon: "Neon", ember: "Ember",
  } as Record<SurfaceId, string>,
  accents: {
    yellow: "Yellow", red: "Red", teal: "Teal", coral: "Coral",
    orange: "Orange", violet: "Violet", lime: "Lime", blue: "Blue",
    fuchsia: "Fuchsia", pink: "Pink", amber: "Amber",
  } as Record<AccentId, string>,
} as const;

// ============================================================
// MAIN PAGE
// ============================================================

// Slide types offered by the "＋ Add slide" picker.
const SLIDE_TYPES: { id: SlideType; name: string }[] = [
  { id: "hook", name: "Hook" },
  { id: "body", name: "Body" },
  { id: "list", name: "List" },
  { id: "checklist", name: "Checklist" },
  { id: "stats", name: "Stats" },
  { id: "quote", name: "Quote" },
  { id: "process", name: "Process" },
  { id: "comparison", name: "Comparison" },
  { id: "cta", name: "CTA" },
  { id: "number", name: "Number" },
  { id: "emoji", name: "Emoji" },
  { id: "image", name: "Image" },
];

// Image generation — mode chips offered in the Generate panel.
const GEN_MODES: { id: "hero" | "background" | "cutout"; name: string }[] = [
  { id: "hero", name: "Hero" },
  { id: "background", name: "Background" },
  { id: "cutout", name: "Cutout" },
];

// Nearest of the four supported aspect ratios for a given canvas w/h.
function nearestAspectRatio(w: number, h: number): string {
  const ratios: { id: string; value: number }[] = [
    { id: "1:1", value: 1 },
    { id: "4:5", value: 4 / 5 },
    { id: "9:16", value: 9 / 16 },
    { id: "16:9", value: 16 / 9 },
  ];
  const target = w / h;
  let best = ratios[0];
  let bestDiff = Infinity;
  for (const r of ratios) {
    const diff = Math.abs(r.value - target);
    if (diff < bestDiff) { bestDiff = diff; best = r; }
  }
  return best.id;
}

type Skin = "glass" | "deck" | "editorial";
const SKINS: { id: Skin; name: string }[] = [
  { id: "glass", name: "Glass" },
  { id: "deck", name: "Deck" },
  { id: "editorial", name: "Editorial" },
];

// One-click looks: set surface + accent + font together.
const STYLE_PRESETS: { id: string; name: string; surface: SurfaceId; accent: AccentId; font: FontId }[] = [
  { id: "clean-violet", name: "Clean · Violet", surface: "white", accent: "violet", font: "clean" },
  { id: "dark-mint", name: "Dark · Mint", surface: "dark", accent: "teal", font: "clean" },
  { id: "paper-orange", name: "Paper · Orange", surface: "paper", accent: "orange", font: "editorial" },
  { id: "neon-blue", name: "Neon · Blue", surface: "neon", accent: "blue", font: "mono" },
  { id: "ember-lime", name: "Ember · Lime", surface: "ember", accent: "lime", font: "condensed" },
  { id: "mono-blue", name: "Mono · Blue", surface: "white", accent: "blue", font: "mono" },
];

export default function CarouselPage() {
  const t = T;
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    () => {
      if (typeof window === "undefined") return buildInitialState();
      // ?fresh=1 discards the autosaved deck and starts from the slides.ts seed.
      // Lets a new /design run open on the copy it just wrote instead of
      // whatever was left in this browser from a previous session.
      if (new URLSearchParams(window.location.search).has("fresh")) {
        clearAutosave();
        return buildInitialState();
      }
      return loadAutosave() || buildInitialState();
    }
  );
  const {
    font: fontId,
    surface: surfaceId,
    accent: accentId,
    purpose: purposeId,
    bg: bgType,
    format: formatId,
  } = state.defaults;
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const offscreenRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Studio chrome state (does not affect exported slides)
  const [skin, setSkin] = useState<Skin>("glass");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [pad, setPad] = useState(80);
  const [textScale, setTextScale] = useState(1);
  const [italicBox, setItalicBox] = useState(false);
  const [hideCounter, setHideCounter] = useState(false);
  const [align, setAlign] = useState<"left" | "center">("left");
  const [bgImages, setBgImages] = useState<Record<number, string>>({});
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ---- Image generation: gated on the Higgsfield CLI being installed and signed in ----
  const [aiEnabled, setAiEnabled] = useState(false);
  const [genHint, setGenHint] = useState("Checking for the Higgsfield CLI...");
  const [genDescription, setGenDescription] = useState("");
  const [genMode, setGenMode] = useState<"hero" | "background" | "cutout">("hero");
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    checkGen().then((s) => { setAiEnabled(s.ready); setGenHint(s.reason); });
  }, []);

  // ---- persistence: autosave, named projects, JSON import/export ----
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave — writes the latest state to localStorage ~500ms after it settles.
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveAutosave(state), 500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [state]);

  // Close the project dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".ie-projectsel")) setProjectMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [projectMenuOpen]);

  const openProjectMenu = () => {
    setProjectNames(listProjects());
    setProjectMenuOpen((v) => !v);
  };

  const handleNewProject = () => {
    if (!window.confirm("Start a new project? Unsaved changes will be lost.")) return;
    dispatch({ type: "replaceState", state: buildInitialState() });
    setActiveProjectName(null);
  };

  const handleSaveProject = () => {
    const name = window.prompt("Project name:", activeProjectName ?? "");
    if (!name) return;
    saveProject(name, state);
    setActiveProjectName(name);
    setProjectNames(listProjects());
  };

  const handleOpenProject = (name: string) => {
    const loaded = loadProject(name);
    if (loaded) {
      dispatch({ type: "replaceState", state: loaded });
      setActiveProjectName(name);
    }
    setProjectMenuOpen(false);
  };

  const handleDuplicateProject = () => {
    const base = window.prompt("Duplicate as:", activeProjectName ?? "");
    if (!base) return;
    const name = `${base} copy`;
    saveProject(name, state);
    setActiveProjectName(name);
    setProjectNames(listProjects());
  };

  const handleExportJson = () => {
    const blob = new Blob([serialize(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${activeProjectName || "design"}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = deserialize(text);
    if (parsed) {
      dispatch({ type: "replaceState", state: parsed });
      setActiveProjectName(null);
    }
  };

  // Restore last skin on mount; persist on change.
  useEffect(() => {
    const saved = window.localStorage.getItem("ie-skin") as Skin | null;
    if (saved === "glass" || saved === "deck" || saved === "editorial") setSkin(saved);
  }, []);
  const pickSkin = (s: Skin) => { setSkin(s); window.localStorage.setItem("ie-skin", s); };

  // Close the theme dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!themeMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".ie-themesel")) setThemeMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [themeMenuOpen]);

  // Close the add-slide type picker when clicking anywhere outside it.
  useEffect(() => {
    if (!addPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".ie-addpicker")) setAddPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [addPickerOpen]);

  const canvasW = FORMAT_PRESETS[formatId].w;
  const canvasH = FORMAT_PRESETS[formatId].h;

  // Slides actually rendered/exported: apply the Tweaks + any uploaded backgrounds.
  const slides: SlideData[] = state.slides.map((s, i) => {
    let d: SlideData = s;
    if (italicBox && d.highlight) d = { ...d, highlightStyle: "italic-box" };
    const img = bgImages[i];
    if (img) d = { ...d, type: "image", imageFill: true, imageSrc: img, title: d.title || d.text || "", text: d.title ? d.text : undefined };
    return d;
  });
  const total = slides.length;
  const sel = Math.min(selected, total - 1);
  const rawSel = state.slides[sel];

  // Per-slide effective preset + background pattern: a slide's own `slideStyle`
  // override (if any) merged over the global defaults. A slide with no override
  // resolves to exactly `state.defaults`, so unchanged decks render/export identically
  // to before this feature existed.
  const slideVisuals = useMemo(
    () =>
      state.slides.map((s) => {
        const style = resolveSlideStyle(state.defaults, s);
        const composed = composePreset(FONT_STYLES[style.font], SURFACES[style.surface], ACCENTS[style.accent], state.defaults.purpose);
        const p: StylePreset = { ...composed, padTweak: pad, scaleTweak: textScale, hideCounter, align };
        return { preset: p, bgType: style.bg };
      }),
    [state.slides, state.defaults, pad, textScale, hideCounter, align]
  );

  const patchSlideStyle = (patch: Partial<NonNullable<SlideData["slideStyle"]>>) =>
    dispatch({ type: "patchSlide", index: sel, patch: { slideStyle: { ...(rawSel.slideStyle || {}), ...patch } } });

  // ---- slide manager: add / delete / duplicate / reorder ----
  const handleDuplicateSlide = (i: number) => {
    dispatch({ type: "duplicateSlide", index: i });
    setSelected(i + 1);
  };
  const handleDeleteSlide = (i: number) => {
    if (total <= 1) return; // reducer no-op; nothing to clamp
    dispatch({ type: "deleteSlide", index: i });
    // Deleting a slide before the selected one shifts it left; otherwise clamp to new last.
    setSelected((s) => (i < s ? s - 1 : Math.min(s, total - 2)));
  };
  const handleAddSlide = (type: SlideType) => {
    dispatch({ type: "addSlide", index: sel, slide: blankSlide(type) });
    setSelected(sel + 1);
    setAddPickerOpen(false);
  };
  const handleThumbDragStart = (i: number) => (e: React.DragEvent) => {
    dragIndexRef.current = i;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };
  const handleThumbDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== i) setDragOverIndex(i);
  };
  const handleThumbDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragOverIndex(null);
    if (from === null || from === i) return;
    dispatch({ type: "moveSlide", from, to: i });
    setSelected(i);
  };
  const handleThumbDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const onUploadBg = (file: File) => {
    const url = URL.createObjectURL(file);
    setBgImages((m) => ({ ...m, [sel]: url }));
  };
  const clearBg = () => setBgImages((m) => { const n = { ...m }; delete n[sel]; return n; });

  const handleGenerate = async () => {
    if (!aiEnabled || genBusy || !genDescription.trim()) return;
    setGenBusy(true);
    setGenError("");
    try {
      const aspectRatio = nearestAspectRatio(canvasW, canvasH);
      const { src } = await generateImage({ description: genDescription, mode: genMode, aspectRatio });
      if (genMode === "background") {
        dispatch({ type: "patchSlide", index: sel, patch: { imageFill: true, imageSrc: src } });
      } else {
        dispatch({ type: "patchSlide", index: sel, patch: { type: "image", imageSrc: src } });
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenBusy(false);
    }
  };

  const captureSlide = useCallback(
    async (index: number): Promise<string | null> => {
      const el = offscreenRefs.current[index];
      if (!el) return null;

      el.style.opacity = "1";
      el.style.zIndex = "-1";
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const opts = {
        width: canvasW,
        height: canvasH,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: slideVisuals[index].preset.bg,
      };

      // Double-call: first warms fonts/images, second captures
      await toPng(el, opts);
      await new Promise((r) => setTimeout(r, 120));
      const dataUrl = await toPng(el, opts);

      el.style.opacity = "0";
      el.style.zIndex = "-1";
      return dataUrl;
    },
    [slideVisuals, canvasW, canvasH]
  );

  const exportSlide = useCallback(
    async (index: number) => {
      const dataUrl = await captureSlide(index);
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${String(index + 1).padStart(2, "0")}-${slides[index].type}.png`;
      link.href = dataUrl;
      link.click();
    },
    [captureSlide, slides]
  );

  const exportAll = useCallback(async () => {
    setExporting(true);
    const tl = T;
    for (let i = 0; i < total; i++) {
      setExportStatus(tl.statusExport(i + 1, total));
      await exportSlide(i);
      await new Promise((r) => setTimeout(r, 300));
    }
    setExportStatus(tl.statusDone);
    setExporting(false);
    setTimeout(() => setExportStatus(""), 2000);
  }, [exportSlide, total]);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    const isLandscape = canvasW > canvasH;
    const orientation = isLandscape ? "landscape" : "portrait";
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation, unit: "px", format: [canvasW, canvasH], hotfixes: ["px_scaling"] });

    const tl = T;
    for (let i = 0; i < total; i++) {
      setExportStatus(tl.statusPdf(i + 1, total));
      const el = offscreenRefs.current[i];
      if (!el) continue;

      const jpegOpts = { width: canvasW, height: canvasH, pixelRatio: 2, cacheBust: true, backgroundColor: slideVisuals[i].preset.bg, quality: 0.92 };

      el.style.opacity = "1";
      el.style.zIndex = "-1";
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await toJpeg(el, jpegOpts); // warm up
      await new Promise((r) => setTimeout(r, 120));
      const dataUrl = await toJpeg(el, jpegOpts);
      el.style.opacity = "0";
      el.style.zIndex = "-1";

      if (i > 0) pdf.addPage([canvasW, canvasH], orientation);
      pdf.addImage(dataUrl, "JPEG", 0, 0, canvasW, canvasH);
      await new Promise((r) => setTimeout(r, 200));
    }

    pdf.save("slides.pdf");
    setExportStatus(T.statusDone);
    setExporting(false);
    setTimeout(() => setExportStatus(""), 2000);
  }, [slideVisuals, canvasW, canvasH, total]);

  const landscape = canvasW > canvasH;
  const stageStyle: React.CSSProperties = {
    aspectRatio: `${canvasW}/${canvasH}`,
    maxWidth: "100%",
    maxHeight: "100%",
    width: landscape ? "100%" : "auto",
    height: landscape ? "auto" : "100%",
  };
  const presetActive = (p: typeof STYLE_PRESETS[number]) =>
    surfaceId === p.surface && accentId === p.accent && fontId === p.font;

  return (
    <CanvasSizeProvider w={canvasW} h={canvasH}>
    <div className="ie-app" data-skin={skin} suppressHydrationWarning>
      <div className="ie-shell">

        {/* ---- top bar ---- */}
        <div className="ie-top">
          <div className="ie-wordmark"><span className="ie-dot" /> {t.appTitle}</div>
          <div className="ie-grow" />
          <button className="ie-btn ghost" onClick={handleNewProject}>New</button>
          <button className="ie-btn ghost" onClick={handleSaveProject}>Save</button>
          <div className="ie-projectsel">
            <button className="ie-btn ghost" onClick={openProjectMenu}>
              Open{activeProjectName ? `: ${activeProjectName}` : ""} ▾
            </button>
            {projectMenuOpen && (
              <div className="ie-thememenu">
                {projectNames.length === 0 && <span className="ie-emptymenu">No saved projects</span>}
                {projectNames.map((name) => (
                  <button key={name} className={activeProjectName === name ? "on" : ""} onClick={() => handleOpenProject(name)}>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="ie-btn ghost" onClick={handleDuplicateProject}>Duplicate</button>
          <button className="ie-btn ghost" onClick={handleExportJson}>Export JSON</button>
          <button className="ie-btn ghost" onClick={() => importInputRef.current?.click()}>Import JSON</button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportJsonChange}
          />
          <div className="ie-themesel">
            <button className="ie-btn ghost" onClick={() => setThemeMenuOpen((v) => !v)}>
              Theme: {SKINS.find((s) => s.id === skin)?.name} ▾
            </button>
            {themeMenuOpen && (
              <div className="ie-thememenu">
                {SKINS.map((s) => (
                  <button key={s.id} className={skin === s.id ? "on" : ""} onClick={() => { pickSkin(s.id); setThemeMenuOpen(false); }}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="ie-btn ghost" onClick={exportPdf} disabled={exporting}>
            {exporting ? exportStatus : t.btnPdf}
          </button>
          <button className="ie-btn primary" onClick={exportAll} disabled={exporting}>
            {exporting ? exportStatus : t.btnAll}
          </button>
        </div>

        {/* ---- left rail ---- */}
        <div className="ie-rail">
          <div className="ie-group">
            <h4>Format</h4>
            <div className="ie-row">
              {Object.values(FORMAT_PRESETS).map((f) => (
                <span key={f.id} className={`ie-chip${formatId === f.id ? " on" : ""}`} title={f.platform} onClick={() => dispatch({ type: "setDefaults", patch: { format: f.id } })}>
                  {f.name}
                </span>
              ))}
            </div>
          </div>

          <div className="ie-group">
            <h4>Style presets</h4>
            <div className="ie-cards">
              {STYLE_PRESETS.map((p) => {
                const surf = SURFACES[p.surface];
                const acc = ACCENTS[p.accent];
                return (
                  <div
                    key={p.id}
                    className={`ie-pcard${presetActive(p) ? " on" : ""}`}
                    onClick={() => dispatch({ type: "setDefaults", patch: { surface: p.surface, accent: p.accent, font: p.font } })}
                    style={{ background: surf.bgGradient || surf.bg, color: surf.textColor }}
                  >
                    <span className="aa" style={{ color: acc.color }}>Aa</span>
                    <span>{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ie-group">
            <h4>Surface</h4>
            <div className="ie-row">
              {Object.values(SURFACES).map((s) => (
                <span key={s.id} className={`ie-chip${surfaceId === s.id ? " on" : ""}`} onClick={() => dispatch({ type: "setDefaults", patch: { surface: s.id } })}>
                  {t.surfaces[s.id]}
                </span>
              ))}
            </div>
          </div>

          <div className="ie-group">
            <h4>Accent</h4>
            <div className="ie-dots">
              {Object.values(ACCENTS).map((a) => (
                <span key={a.id} className={`ie-acc${accentId === a.id ? " on" : ""}`} title={t.accents[a.id]} onClick={() => dispatch({ type: "setDefaults", patch: { accent: a.id } })} style={{ background: a.color }} />
              ))}
            </div>
          </div>

          <div className="ie-group">
            <h4>Font</h4>
            <div className="ie-row">
              {Object.values(FONT_STYLES).map((f) => (
                <span key={f.id} className={`ie-chip${fontId === f.id ? " on" : ""}`} onClick={() => dispatch({ type: "setDefaults", patch: { font: f.id } })}>
                  {f.name}
                </span>
              ))}
            </div>
          </div>

          {/* Brand kits are opt-in and ship empty; the section hides until the
              user defines their own in src/lib/brandKits.ts. */}
          {BRAND_KITS.length > 0 && (
            <div className="ie-group">
              <h4>Brand</h4>
              <div className="ie-row">
                {BRAND_KITS.map((kit) => (
                  <span
                    key={kit.id}
                    className="ie-chip"
                    title={kit.handle}
                    onClick={() => dispatch({ type: "replaceState", state: applyBrandKit(state, kit) })}
                  >
                    {kit.name}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ---- canvas stage ---- */}
        <div className="ie-canvas">
          <button className="ie-exportone" onClick={() => !exporting && exportSlide(sel)} disabled={exporting} title="Export the selected slide as PNG">
            ⤓ This slide
          </button>
          <div className="ie-stage" style={stageStyle}>
            <EditContext.Provider
              value={{
                editable: true,
                patch: (p) => dispatch({ type: "patchSlide", index: sel, patch: p }),
                setItem: (field, itemIndex, value) => dispatch({ type: "setArrayItem", index: sel, field, itemIndex, value }),
              }}
            >
              <SlidePreview key={`stage-${sel}`} data={slides[sel]} preset={slideVisuals[sel].preset} index={sel} total={total} bgType={slideVisuals[sel].bgType} />
            </EditContext.Provider>
          </div>
          <span className="ie-dim">{FORMAT_PRESETS[formatId].name} · {canvasW}×{canvasH}</span>
          <span className="ie-zoom">{sel + 1}/{total}</span>

          <button className="ie-fab" onClick={() => setTweaksOpen((v) => !v)}>✦ Tweaks</button>
          {tweaksOpen && (
            <div className="ie-pop">
              <h5>✦ Tweaks</h5>

              <div className="ie-popsec">Slide {sel + 1} type</div>
              <div className="ie-row" style={{ marginBottom: 14 }}>
                {SLIDE_TYPES.map((s) => (
                  <span
                    key={s.id}
                    className={`ie-chip${rawSel.type === s.id ? " on" : ""}`}
                    onClick={() => dispatch({ type: "patchSlide", index: sel, patch: { type: s.id } })}
                  >
                    {s.name}
                  </span>
                ))}
              </div>

              <div className="ie-popsec">Badge</div>
              <input
                className="ie-input"
                type="text"
                placeholder="Optional badge text"
                value={rawSel.badge ?? ""}
                onChange={(e) => dispatch({ type: "patchSlide", index: sel, patch: { badge: e.target.value } })}
                style={{ marginBottom: 14 }}
              />

              <div className="ie-popsec">Highlight word</div>
              <input
                className="ie-input"
                type="text"
                placeholder="Word to highlight"
                value={rawSel.highlight ?? ""}
                onChange={(e) => dispatch({ type: "patchSlide", index: sel, patch: { highlight: e.target.value } })}
                style={{ marginBottom: 14 }}
              />

              <div className="ie-popsec">Surface override</div>
              <div className="ie-row" style={{ marginBottom: 14 }}>
                <span className={`ie-chip${!rawSel.slideStyle?.surface ? " on" : ""}`} onClick={() => patchSlideStyle({ surface: undefined })}>Auto</span>
                {Object.values(SURFACES).map((s) => (
                  <span key={s.id} className={`ie-chip${rawSel.slideStyle?.surface === s.id ? " on" : ""}`} onClick={() => patchSlideStyle({ surface: s.id })}>
                    {t.surfaces[s.id]}
                  </span>
                ))}
              </div>

              <div className="ie-popsec">Accent override</div>
              <div className="ie-dots" style={{ marginBottom: 14 }}>
                <span
                  className={`ie-acc${!rawSel.slideStyle?.accent ? " on" : ""}`}
                  title="Auto (use global)"
                  onClick={() => patchSlideStyle({ accent: undefined })}
                  style={{ background: "var(--ie-chip-bg)", border: "1px dashed var(--ie-chip-border)" }}
                />
                {Object.values(ACCENTS).map((a) => (
                  <span
                    key={a.id}
                    className={`ie-acc${rawSel.slideStyle?.accent === a.id ? " on" : ""}`}
                    title={t.accents[a.id]}
                    onClick={() => patchSlideStyle({ accent: a.id })}
                    style={{ background: a.color }}
                  />
                ))}
              </div>

              <div className="ie-popsec">Background pattern override</div>
              <div className="ie-row" style={{ marginBottom: 14 }}>
                <span className={`ie-chip${!rawSel.slideStyle?.bg ? " on" : ""}`} onClick={() => patchSlideStyle({ bg: undefined })}>Auto</span>
                {(["none", "glow", "grid", "lines", "paper", "blobs", "noise", "bignumber"] as BgType[]).map((bg) => (
                  <span key={bg} className={`ie-chip${rawSel.slideStyle?.bg === bg ? " on" : ""}`} onClick={() => patchSlideStyle({ bg })}>{t.bgs[bg]}</span>
                ))}
              </div>

              <div className="ie-popsec">Background</div>
              <div className="ie-row" style={{ marginBottom: 14 }}>
                {(["none", "glow", "grid", "lines", "paper", "blobs", "noise", "bignumber"] as BgType[]).map((bg) => (
                  <span key={bg} className={`ie-chip${bgType === bg ? " on" : ""}`} onClick={() => dispatch({ type: "setDefaults", patch: { bg } })}>{t.bgs[bg]}</span>
                ))}
              </div>

              <div className="ie-popsec">Mode</div>
              <div className="ie-row" style={{ marginBottom: 14 }}>
                {(["carousel", "presentation"] as PurposeId[]).map((p) => (
                  <span key={p} className={`ie-chip${purposeId === p ? " on" : ""}`} onClick={() => dispatch({ type: "setDefaults", patch: { purpose: p } })}>{t.modes[p]}</span>
                ))}
              </div>

              <div className="ie-popsec">Fine-tune</div>
              <div className="ie-ctl">
                <label>Text scale <span>{textScale.toFixed(2)}×</span></label>
                <input type="range" min={80} max={130} value={Math.round(textScale * 100)} onChange={(e) => setTextScale(Number(e.target.value) / 100)} />
              </div>
              <div className="ie-ctl">
                <label>Padding <span>{pad}px</span></label>
                <input type="range" min={32} max={140} value={pad} onChange={(e) => setPad(Number(e.target.value))} />
              </div>
              <div className="ie-ctl">
                <label>Text align</label>
                <div className="ie-row">
                  {(["left", "center"] as const).map((a) => (
                    <span key={a} className={`ie-chip${align === a ? " on" : ""}`} onClick={() => setAlign(a)} style={{ textTransform: "capitalize" }}>{a}</span>
                  ))}
                </div>
              </div>
              <div className="ie-ctl ie-toggle">
                Highlight box
                <span className={`ie-pill${italicBox ? " on" : ""}`} onClick={() => setItalicBox((v) => !v)} />
              </div>
              <div className="ie-ctl ie-toggle">
                Progress dots
                <span className={`ie-pill${!hideCounter ? " on" : ""}`} onClick={() => setHideCounter((v) => !v)} />
              </div>

              <div className="ie-popsec">Photo background · slide {sel + 1}</div>
              <label className={`ie-upload${bgImages[sel] ? " set" : ""}`}>
                {bgImages[sel] ? "Photo set · replace" : "Upload a photo"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadBg(f); e.target.value = ""; }} />
              </label>
              {bgImages[sel] && <button className="ie-clearimg" onClick={clearBg}>Remove photo</button>}

              <div className="ie-popsec">Generate image</div>
              <div className={`ie-gen${!aiEnabled ? " disabled" : ""}`}>
                <textarea
                  className="ie-input ie-textarea"
                  placeholder="Describe the image to generate"
                  rows={3}
                  value={genDescription}
                  disabled={!aiEnabled || genBusy}
                  onChange={(e) => setGenDescription(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <div className="ie-row" style={{ marginBottom: 10 }}>
                  {GEN_MODES.map((m) => (
                    <span
                      key={m.id}
                      className={`ie-chip${genMode === m.id ? " on" : ""}`}
                      onClick={() => { if (aiEnabled && !genBusy) setGenMode(m.id); }}
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
                <button
                  className="ie-btn primary ie-genbtn"
                  disabled={!aiEnabled || genBusy || !genDescription.trim()}
                  onClick={handleGenerate}
                >
                  {genBusy ? "Generating…" : "Generate"}
                </button>
                {!aiEnabled && (
                  <div className="ie-genhint">{genHint}</div>
                )}
                {aiEnabled && genError && <div className="ie-generror">{genError}</div>}
              </div>

              <button className="ie-resetbtn" onClick={() => { setTextScale(1); setPad(80); setItalicBox(false); setHideCounter(false); setAlign("left"); }}>Reset tweaks</button>
            </div>
          )}
        </div>

        {/* ---- bottom thumbnail strip ---- */}
        <div className="ie-strip">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`ie-thumbwrap${dragOverIndex === i ? " dragover" : ""}`}
              draggable
              onDragStart={handleThumbDragStart(i)}
              onDragOver={handleThumbDragOver(i)}
              onDrop={handleThumbDrop(i)}
              onDragEnd={handleThumbDragEnd}
            >
              <button className={`ie-thumb${i === sel ? " on" : ""}`} onClick={() => setSelected(i)} title={`Slide ${i + 1} — ${slide.type}`}>
                <span className="tnum">{i + 1}</span>
                <SlidePreview key={`thumb-${i}`} data={slide} preset={slideVisuals[i].preset} index={i} total={total} bgType={slideVisuals[i].bgType} />
              </button>
              <div className="ie-thumbctl">
                <button
                  className="ie-thumbbtn"
                  title="Duplicate slide"
                  onClick={(e) => { e.stopPropagation(); handleDuplicateSlide(i); }}
                >
                  ⧉
                </button>
                {total > 1 && (
                  <button
                    className="ie-thumbbtn del"
                    title="Delete slide"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSlide(i); }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="ie-addpicker">
            <button className="ie-thumbadd" onClick={() => setAddPickerOpen((v) => !v)} title="Add slide">
              ＋
            </button>
            {addPickerOpen && (
              <div className="ie-addmenu">
                {SLIDE_TYPES.map((s) => (
                  <span key={s.id} className="ie-chip" onClick={() => handleAddSlide(s.id)}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offscreen slides for export — always rendered at (0,0), invisible via opacity */}
      {slides.map((slide, i) => (
        <div
          key={`export-${i}`}
          ref={(el) => {
            offscreenRefs.current[i] = el;
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: canvasW,
            height: canvasH,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
            fontFamily: slideVisuals[i].preset.fontFamily,
          }}
        >
          <Slide data={slide} preset={slideVisuals[i].preset} index={i} total={total} bgType={slideVisuals[i].bgType} />
        </div>
      ))}
    </div>
    </CanvasSizeProvider>
  );
}
