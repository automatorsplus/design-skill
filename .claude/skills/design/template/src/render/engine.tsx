"use client";

// Slide render engine. Original implementation.
//
// Architecture note: every slide type shares ONE <SlideFrame> wrapper (the
// fixed-size canvas, background layer, optional content scale, and progress
// counter). Each renderer only describes its inner content. The dispatcher
// `Slide` picks the renderer; `SlidePreview` scales a Slide to fit a box.

import { useRef, useState, useEffect, ReactNode, CSSProperties, FocusEvent } from "react";
import type { SlideData, BgType, StylePreset } from "../lib/types";
import type { ArrayField } from "../state/editorState";
import { useCanvasSize } from "./canvas";
import { SlideBackdrop } from "./backgrounds";
import { hookSize, bodySize, pointsSize } from "./typography";
import { EditableText } from "./EditableText";
import { useEdit } from "./EditContext";

const PLUS = "#22c55e";
const NEG = "#EF4444";
const POS = "#22C55E";
const balance = { textWrap: "balance" } as CSSProperties;

// ---- inline helpers ------------------------------------------------------

/**
 * Readable ink for text sitting on a filled accent swatch. Light accents
 * (lime, yellow, amber) need dark text; dark ones (violet, red) need white.
 */
function inkOn(bg: string): string {
  let r = 0, g = 0, b = 0;
  const hex = bg.trim().match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    r = parseInt(hex[1].slice(0, 2), 16);
    g = parseInt(hex[1].slice(2, 4), 16);
    b = parseInt(hex[1].slice(4, 6), 16);
  } else {
    const rgb = bg.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (!rgb) return "#ffffff";
    [, r, g, b] = rgb.map(Number) as unknown as [number, number, number, number];
  }
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "#0B0B0B" : "#ffffff";
}

/** Wrap occurrences of `word` in `text` with the accent colour (or an italic box). */
function highlight(
  text: string,
  word: string | undefined,
  color: string,
  variant: "default" | "italic-box" = "default"
): ReactNode {
  if (!word) return text;
  const safe = word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return text.split(new RegExp(`(${safe})`, "gi")).map((part, i) => {
    if (part.toLowerCase() !== word.toLowerCase()) return <span key={i}>{part}</span>;
    if (variant === "italic-box") {
      return (
        <span
          key={i}
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: "italic", fontWeight: 700,
            background: color, color: inkOn(color), padding: "0 0.22em", borderRadius: 6,
            textTransform: "none", letterSpacing: "-0.01em", whiteSpace: "nowrap",
            boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={i} style={{ color, position: "relative" }}>{part}</span>;
  });
}

/**
 * Renders a scalar text field that also supports word-highlighting.
 * When not in edit mode this must reproduce `highlight()`'s output exactly
 * (so exported images stay byte-for-byte identical) — only in edit mode does
 * it fall back to `EditableText`'s plain contentEditable span, which loses
 * the highlight styling while the field is being edited.
 */
function EditableHighlight({
  field, text, highlightWord, color, variant, as = "span",
}: {
  field: keyof SlideData; text: string; highlightWord?: string; color: string;
  variant?: "default" | "italic-box"; as?: "span" | "div" | "h1" | "h2" | "p";
}) {
  const { editable, patch } = useEdit();
  const Tag = as;
  const rendered = highlight(text, highlightWord, color, variant);
  if (!editable) return <>{rendered}</>;
  // Keep the highlight/italic-box visible on the live canvas while still being
  // click-to-edit. Committing reads textContent, so the stored copy stays plain.
  return (
    <Tag
      style={{ outline: "none" }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== text) patch({ [field]: next } as Partial<SlideData>);
      }}
    >
      {rendered}
    </Tag>
  );
}

/**
 * Renders one item of an array-backed field (list/checklist/stats/steps/
 * comparison/points) as click-to-edit text on the canvas. When not editable,
 * or when the context has no `setItem` (thumbnails and the offscreen export
 * path), it renders a plain element — identical output to before this field
 * was made editable. `commit` maps the edited text back onto the full item
 * value passed to `setItem`; pass it for object items (stats/steps/points)
 * so sibling keys on the item survive the edit. Omit it for plain string
 * arrays, where the new text IS the new item value.
 */
function EditableItem({
  field, itemIndex, text, commit, style, as = "span",
}: {
  field: ArrayField; itemIndex: number; text: string;
  commit?: (newText: string) => unknown;
  style?: CSSProperties; as?: "span" | "div";
}) {
  const { editable, setItem } = useEdit();
  const Tag = as;

  if (!editable || !setItem) {
    return <Tag style={style}>{text}</Tag>;
  }

  return (
    <Tag
      style={{ ...style, outline: "none" }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.textContent ?? "";
        if (next === text) return;
        setItem(field, itemIndex, commit ? commit(next) : next);
      }}
    >
      {text}
    </Tag>
  );
}

function Badge({ text, preset, align = "start" }: { text: string; preset: StylePreset; align?: "start" | "center" }) {
  return (
    <div
      style={{
        display: "inline-block", fontFamily: preset.fontFamily, fontSize: 26, fontWeight: 800,
        padding: "10px 22px", border: `3px solid ${preset.highlightColor}`, color: preset.highlightColor,
        textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 40, borderRadius: 6,
        alignSelf: align === "center" ? "center" : "flex-start", position: "relative",
      }}
    >
      <EditableText as="span" field="badge" value={text} />
    </div>
  );
}

function Divider({ preset }: { preset: StylePreset }) {
  if (preset.titleDivider === false) return null;
  return <div style={{ width: 96, height: 4, background: preset.highlightColor, opacity: 1, marginBottom: 64, position: "relative" }} />;
}

function Title({ data, preset, editableField = false }: { data: SlideData; preset: StylePreset; editableField?: boolean }) {
  const upper = preset.titleUppercase ?? true;
  return (
    <div
      style={{
        fontFamily: preset.fontFamily, fontSize: preset.titleFontSize ?? 44, fontWeight: preset.titleFontWeight ?? 800,
        color: preset.titleColor ?? preset.accentColor, textTransform: upper ? "uppercase" : "none",
        letterSpacing: upper ? "0.06em" : "-0.02em", lineHeight: 1.1, marginBottom: 28, position: "relative", ...balance,
      }}
    >
      {editableField ? (
        <EditableHighlight field="title" text={data.title || ""} highlightWord={data.highlight} color={preset.highlightColor} variant={data.highlightStyle} as="span" />
      ) : (
        highlight(data.title || "", data.highlight, preset.highlightColor, data.highlightStyle)
      )}
    </div>
  );
}

/** Title + its divider, only when a title exists. */
function TitleBlock({ data, preset, editableField = false }: { data: SlideData; preset: StylePreset; editableField?: boolean }) {
  if (!data.title) return null;
  return (<><Title data={data} preset={preset} editableField={editableField} /><Divider preset={preset} /></>);
}

function Counter({ index, total, color }: { index: number; total: number; color: string }) {
  if (total <= 1) return null;
  return (
    <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: i === index ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: i === index ? 1 : 0.3, transition: "all 0.2s" }} />
      ))}
    </div>
  );
}

function IconCheck({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={Math.max(1.5, size * 0.1)} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 13 9 18 20 7" />
    </svg>
  );
}
function IconCross({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={Math.max(1.5, size * 0.1)} strokeLinecap="round">
      <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

// ---- the shared frame ----------------------------------------------------

function SlideFrame({
  preset, index, total, bgType, fontFamily, children,
}: {
  preset: StylePreset; index: number; total: number; bgType: BgType;
  fontFamily?: string; children: ReactNode;
}) {
  const { w, h } = useCanvasSize();
  const scale = preset.scaleTweak ?? 1;
  const body =
    scale === 1 ? (
      children
    ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, transform: `scale(${scale})`, transformOrigin: "center center" }}>
        {children}
      </div>
    );
  return (
    <div
      style={{
        width: w, height: h, background: preset.bgGradient || preset.bg, position: "relative",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: `${preset.padTweak ?? 80}px`, fontFamily: fontFamily || preset.fontFamily, boxSizing: "border-box",
      }}
    >
      <SlideBackdrop bgType={bgType} slideIndex={index} preset={preset} />
      {body}
      {!preset.hideCounter && <Counter index={index} total={total} color={preset.accentColor} />}
    </div>
  );
}

type RenderProps = { data: SlideData; preset: StylePreset; index: number; total: number; bgType: BgType };

// ---- slide renderers -----------------------------------------------------

function Hook({ data, preset, index, total, bgType }: RenderProps) {
  const centered = preset.align === "center";
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType} fontFamily={preset.hookFontFamily || preset.fontFamily}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: centered ? "center" : undefined }}>
        {data.badge && <Badge text={data.badge} preset={preset} />}
        <div
          style={{
            fontSize: hookSize(data.text || ""), fontWeight: 800, color: preset.textColor,
            lineHeight: data.highlightStyle === "italic-box" ? 1.15 : 1.02, whiteSpace: "pre-line",
            letterSpacing: "-0.03em", position: "relative", textAlign: preset.align ?? "left", ...balance,
          }}
        >
          <EditableHighlight field="text" text={data.text || ""} highlightWord={data.highlight} color={preset.highlightColor} variant={data.highlightStyle} as="span" />
        </div>
      </div>
    </SlideFrame>
  );
}

function PointsList({ data, preset }: { data: SlideData; preset: StylePreset }) {
  const points = data.points || [];
  const size = pointsSize(points);
  const icon = Math.round(size * 0.65);
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
      {points.map((p, i) => {
        const firstMinus = p.type === "minus" && (i === 0 || points[i - 1].type === "plus");
        const marginTop = firstMinus ? Math.round(size * 0.9) : i === 0 ? 0 : Math.round(size * 0.3);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.45), marginTop }}>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", color: p.type === "plus" ? PLUS : preset.textSecondary }}>
              {p.type === "plus" ? <IconCheck size={icon} /> : <IconCross size={icon} />}
            </div>
            <EditableItem
              field="points"
              itemIndex={i}
              text={p.text}
              commit={(next) => ({ ...p, text: next })}
              style={{ fontSize: size, fontWeight: 600, color: p.type === "plus" ? preset.textColor : preset.textSecondary, lineHeight: 1.25, letterSpacing: "-0.01em" }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Body({ data, preset, index, total, bgType }: RenderProps) {
  const centered = preset.align === "center";
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: centered ? "center" : undefined }}>
        {data.badge && <Badge text={data.badge} preset={preset} />}
        <TitleBlock data={data} preset={preset} editableField={data.type === "body"} />
        {data.points ? (
          <PointsList data={data} preset={preset} />
        ) : (
          <div
            style={{
              fontSize: bodySize(data.text || ""), fontWeight: preset.bodyFontWeight ?? 600,
              color: preset.bodyColor ?? preset.textColor, lineHeight: preset.bodyLineHeight ?? 1.2,
              whiteSpace: "pre-line", letterSpacing: "-0.01em", position: "relative", textAlign: preset.align ?? "left", ...balance,
            }}
          >
            <EditableHighlight field="text" text={data.text || ""} highlightWord={data.highlight} color={preset.highlightColor} variant={data.highlightStyle} as="span" />
          </div>
        )}
        {data.handle && (
          <EditableText as="div" field="handle" style={{ fontFamily: preset.fontFamily, fontSize: 36, fontWeight: 600, color: preset.highlightColor, marginTop: 48, letterSpacing: "0.02em", position: "relative" }} value={data.handle} />
        )}
      </div>
    </SlideFrame>
  );
}

function List({ data, preset, index, total, bgType }: RenderProps) {
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <TitleBlock data={data} preset={preset} />
      <div style={{ display: "flex", flexDirection: "column", gap: 32, position: "relative" }}>
        {(data.items || []).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 28 }}>
            <div style={{ fontFamily: preset.fontFamily, fontSize: 48, fontWeight: 800, color: preset.highlightColor, lineHeight: 1, minWidth: 80 }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <EditableItem
              as="div"
              field="items"
              itemIndex={i}
              text={item}
              style={{ fontSize: 46, fontWeight: 600, color: preset.textColor, lineHeight: 1.2, letterSpacing: "-0.01em", flex: 1, ...balance }}
            />
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function Stats({ data, preset, index, total, bgType }: RenderProps) {
  const stats = data.stats || [];
  const stacked = stats.length > 2;
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <TitleBlock data={data} preset={preset} />
      <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", gap: 48, position: "relative" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <EditableItem
              as="div"
              field="stats"
              itemIndex={i}
              text={s.value}
              commit={(next) => ({ ...s, value: next })}
              style={{ fontFamily: preset.fontFamily, fontSize: stacked ? 140 : 170, fontWeight: 900, color: preset.highlightColor, lineHeight: 0.9, letterSpacing: "-0.04em" }}
            />
            <EditableItem
              as="div"
              field="stats"
              itemIndex={i}
              text={s.label}
              commit={(next) => ({ ...s, label: next })}
              style={{ fontSize: 32, fontWeight: 500, color: preset.textSecondary, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}
            />
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function Quote({ data, preset, index, total, bgType }: RenderProps) {
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <div style={{ fontFamily: preset.fontFamily, fontSize: 200, fontWeight: 900, color: preset.highlightColor, lineHeight: 0.7, marginBottom: 24, position: "relative" }}>&ldquo;</div>
      <div style={{ fontSize: 62, fontWeight: 600, color: preset.textColor, lineHeight: 1.2, letterSpacing: "-0.01em", whiteSpace: "pre-line", position: "relative", ...balance }}>
        <EditableHighlight field="text" text={data.text || ""} highlightWord={data.highlight} color={preset.highlightColor} variant={data.highlightStyle} as="span" />
      </div>
      {data.author && (
        <div style={{ marginTop: 48, fontFamily: preset.fontFamily, fontSize: 32, fontWeight: 700, color: preset.accentColor, letterSpacing: "0.04em", position: "relative" }}>
          &mdash; <EditableText as="span" field="author" value={data.author} />
          {data.role && <EditableText as="span" field="role" style={{ color: preset.textSecondary, fontWeight: 400, marginLeft: 12 }} value={data.role} />}
        </div>
      )}
    </SlideFrame>
  );
}

function Checklist({ data, preset, index, total, bgType }: RenderProps) {
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <TitleBlock data={data} preset={preset} />
      <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative" }}>
        {(data.items || []).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: preset.highlightColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: preset.bg, fontSize: 34, fontWeight: 900, fontFamily: preset.fontFamily }}>✓</div>
            <EditableItem
              as="div"
              field="items"
              itemIndex={i}
              text={item}
              style={{ fontSize: 44, fontWeight: 600, color: preset.textColor, lineHeight: 1.2, letterSpacing: "-0.01em", flex: 1 }}
            />
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function Process({ data, preset, index, total, bgType }: RenderProps) {
  const steps = data.steps || [];
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <TitleBlock data={data} preset={preset} />
      <div style={{ display: "flex", flexDirection: "column", gap: 36, position: "relative" }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: preset.highlightColor, display: "flex", alignItems: "center", justifyContent: "center", color: preset.bg, fontFamily: preset.fontFamily, fontWeight: 900, fontSize: 32 }}>{i + 1}</div>
              {i < steps.length - 1 && <div style={{ width: 4, height: 56, background: preset.accentColor, opacity: 0.3, marginTop: 8 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <EditableItem
                as="div"
                field="steps"
                itemIndex={i}
                text={step.title}
                commit={(next) => ({ ...step, title: next })}
                style={{ fontFamily: preset.fontFamily, fontSize: 36, fontWeight: 700, color: preset.accentColor, letterSpacing: "0.02em", marginBottom: 8 }}
              />
              {step.text && (
                <EditableItem
                  as="div"
                  field="steps"
                  itemIndex={i}
                  text={step.text}
                  commit={(next) => ({ ...step, text: next })}
                  style={{ fontSize: 30, fontWeight: 500, color: preset.textSecondary, lineHeight: 1.3 }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function comparisonItemSize(left: string[], right: string[]): number {
  const items = [...left, ...right];
  const rows = Math.max(left.length, right.length);
  const longest = items.reduce((m, i) => Math.max(m, i.length), 0);
  if (rows >= 5 || longest > 48) return 34;
  if (rows >= 4 || longest > 36) return 40;
  if (longest > 26) return 44;
  return 48;
}

function Comparison({ data, preset, index, total, bgType }: RenderProps) {
  const left = data.leftItems || [];
  const right = data.rightItems || [];
  const itemSize = comparisonItemSize(left, right);
  const cols: { label: string; items: string[]; color: string; field: ArrayField }[] = [
    { label: data.leftLabel || "", items: left, color: NEG, field: "leftItems" },
    { label: data.rightLabel || "", items: right, color: POS, field: "rightItems" },
  ];
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <TitleBlock data={data} preset={preset} />
      <div style={{ display: "flex", gap: 32, position: "relative", flex: 1, alignItems: "stretch" }}>
        {cols.map((col, ci) => (
          <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, padding: 36, border: `3px solid ${col.color}`, borderRadius: 16 }}>
            <div style={{ fontFamily: preset.fontFamily, fontSize: 40, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{col.label}</div>
            {col.items.map((item, i) => (
              <div key={i} style={{ fontSize: itemSize, fontWeight: 500, color: preset.textColor, lineHeight: 1.25 }}>
                &middot; <EditableItem field={col.field} itemIndex={i} text={item} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function Picture({ data, preset, index, total, bgType }: RenderProps) {
  if (data.imageFill && data.imageSrc) {
    return (
      <SlideFrame preset={preset} index={index} total={total} bgType="none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.imageSrc} alt={data.imageCaption || data.title || "slide image"} crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, width: "100%" }}>
          {data.badge && <Badge text={data.badge} preset={preset} />}
          <TitleBlock data={data} preset={preset} editableField />
          {data.text && <div style={{ fontFamily: preset.fontFamily, fontSize: 48, fontWeight: 500, color: preset.textColor, lineHeight: 1.3, ...balance }}>{data.text}</div>}
          {data.imageCaption && <EditableText as="div" field="imageCaption" style={{ fontFamily: preset.fontFamily, fontSize: 36, fontWeight: 400, color: "rgba(255,255,255,0.6)", letterSpacing: "0.01em", textAlign: "left", marginTop: "auto" }} value={data.imageCaption} />}
        </div>
      </SlideFrame>
    );
  }
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <TitleBlock data={data} preset={preset} editableField />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 32, position: "relative", minHeight: 0 }}>
        {data.imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.imageSrc} alt={data.imageCaption || data.title || "slide image"} crossOrigin="anonymous" style={{ maxWidth: "100%", maxHeight: data.imageCaption ? "78%" : "88%", objectFit: "contain", borderRadius: 18, boxShadow: "0 18px 60px rgba(0,0,0,0.22)", display: "block" }} />
        )}
        {data.imageCaption && <EditableText as="div" field="imageCaption" style={{ fontFamily: preset.fontFamily, fontSize: 40, fontWeight: 500, color: preset.textSecondary, letterSpacing: "0.01em", textAlign: "center", lineHeight: 1.25, ...balance }} value={data.imageCaption} />}
      </div>
    </SlideFrame>
  );
}

function Emoji({ data, preset, index, total, bgType }: RenderProps) {
  const upper = preset.titleUppercase ?? true;
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", position: "relative" }}>
        {data.badge && <Badge text={data.badge} preset={preset} align="center" />}
        {data.emoji && <div style={{ fontSize: 360, lineHeight: 1, marginBottom: 48 }}>{data.emoji}</div>}
        {data.title && (
          <div style={{ fontFamily: preset.fontFamily, fontSize: preset.titleFontSize ?? 72, fontWeight: preset.titleFontWeight ?? 800, color: preset.titleColor ?? preset.textColor, textTransform: upper ? "uppercase" : "none", letterSpacing: upper ? "0.04em" : "-0.02em", lineHeight: 1.1, marginBottom: data.text ? 20 : 0, ...balance }}>
            <EditableHighlight field="title" text={data.title} highlightWord={data.highlight} color={preset.highlightColor} variant={data.highlightStyle} as="span" />
          </div>
        )}
        {data.text && <EditableText as="div" field="text" style={{ fontFamily: preset.fontFamily, fontSize: 56, fontWeight: 500, color: preset.textSecondary, lineHeight: 1.25, maxWidth: "88%", whiteSpace: "pre-line", ...balance }} value={data.text} />}
      </div>
    </SlideFrame>
  );
}

function BigNumber({ data, preset, index, total, bgType }: RenderProps) {
  const num = data.bigNumber || "";
  const size = num.length <= 2 ? 560 : num.length <= 4 ? 420 : 320;
  return (
    <SlideFrame preset={preset} index={index} total={total} bgType={bgType}>
      {data.badge && <Badge text={data.badge} preset={preset} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", position: "relative" }}>
        <EditableText as="div" field="bigNumber" style={{ fontFamily: preset.hookFontFamily || preset.fontFamily, fontSize: size, fontWeight: 900, color: preset.highlightColor, lineHeight: 0.9, letterSpacing: "-0.05em", marginBottom: 24 }} value={num} />
        {data.title && <div style={{ fontFamily: preset.fontFamily, fontSize: 64, fontWeight: 800, color: preset.textColor, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: data.text ? 16 : 0, ...balance }}><EditableHighlight field="title" text={data.title} highlightWord={data.highlight} color={preset.highlightColor} variant={data.highlightStyle} as="span" /></div>}
        {data.text && <EditableText as="div" field="text" style={{ fontFamily: preset.fontFamily, fontSize: 48, fontWeight: 500, color: preset.textSecondary, lineHeight: 1.25, whiteSpace: "pre-line", ...balance }} value={data.text} />}
      </div>
    </SlideFrame>
  );
}

// ---- dispatcher ----------------------------------------------------------

export function Slide(props: RenderProps) {
  switch (props.data.type) {
    case "hook": return <Hook {...props} />;
    case "list": return <List {...props} />;
    case "stats": return <Stats {...props} />;
    case "quote": return <Quote {...props} />;
    case "checklist": return <Checklist {...props} />;
    case "process": return <Process {...props} />;
    case "comparison": return <Comparison {...props} />;
    case "image": return <Picture {...props} />;
    case "emoji": return <Emoji {...props} />;
    case "number": return <BigNumber {...props} />;
    case "body":
    case "cta":
    default: return <Body {...props} />;
  }
}

// ---- responsive preview wrapper -----------------------------------------

export function SlidePreview(props: RenderProps) {
  const { w, h } = useCanvasSize();
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setScale(e.contentRect.width / w);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div className="slide-preview-wrapper" style={{ width: "100%", aspectRatio: `${w}/${h}`, overflow: "hidden", borderRadius: 12, position: "relative" }}>
      <div ref={ref} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: w, height: h }}>
        <Slide {...props} />
      </div>
    </div>
  );
}
