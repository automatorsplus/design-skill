"use client";

// Decorative background layers for slides. Original implementation.
// Each layer is absolutely positioned, non-interactive, and tinted from the
// preset's accent (or text) colour so it reads on any surface.

import { ReactNode } from "react";
import type { BgType, StylePreset } from "../lib/types";
import { useCanvasSize, rgba, rgbChannels } from "./canvas";

const fill = { position: "absolute", inset: 0, pointerEvents: "none" } as const;

// ---- deterministic noise + organic blobs --------------------------------

/** mulberry32 — small deterministic PRNG so a slide's blobs never reflow. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Closed, smoothly-curved blob path around (cx,cy) using Catmull-Rom control points. */
function blobPath(rng: () => number, cx: number, cy: number, radius: number, lobes = 7): string {
  const pts = Array.from({ length: lobes }, (_, i) => {
    const a = (Math.PI * 2 * i) / lobes - Math.PI / 2;
    const r = radius * (0.7 + rng() * 0.6);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  const at = (i: number) => pts[(i + lobes) % lobes];
  let d = `M ${at(0).x} ${at(0).y}`;
  for (let i = 0; i < lobes; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 4, c1y = p1.y + (p2.y - p0.y) / 4;
    const c2x = p2.x - (p3.x - p1.x) / 4, c2y = p2.y - (p3.y - p1.y) / 4;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d + " Z";
}

const CORNERS = [
  { x: 0.1, y: 0.05 }, { x: 0.85, y: 0.05 }, { x: 0.05, y: 0.85 },
  { x: 0.9, y: 0.8 }, { x: 0.85, y: 0.45 }, { x: 0.05, y: 0.4 },
];

function Blobs({ slideIndex, preset }: { slideIndex: number; preset: StylePreset }) {
  const { w, h } = useCanvasSize();
  const rng = prng(slideIndex * 7919 + 42);
  const [r, g, b] = rgbChannels(preset.accentColor);
  const count = 1 + Math.floor(rng() * 2);
  const blobs: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const zone = CORNERS[Math.floor(rng() * CORNERS.length)];
    const cx = zone.x * w + (rng() - 0.5) * 100;
    const cy = zone.y * h + (rng() - 0.5) * 100;
    const radius = 150 + rng() * 200;
    const opacity = 0.06 + rng() * 0.06;
    blobs.push(
      <path
        key={i}
        d={blobPath(rng, cx, cy, radius)}
        transform={`rotate(${rng() * 360} ${cx} ${cy})`}
        fill={`rgba(${r}, ${g}, ${b}, ${opacity})`}
      />
    );
  }
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={fill}>{blobs}</svg>;
}

// ---- pattern + glow layers ----------------------------------------------

function DotGrid({ preset }: { preset: StylePreset }) {
  const { w, h } = useCanvasSize();
  return (
    <svg width={w} height={h} style={fill}>
      <defs>
        <pattern id="bg-dotgrid" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="2.5" fill={rgba(preset.accentColor, 0.14)} />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#bg-dotgrid)" />
    </svg>
  );
}

function DiagonalLines({ preset }: { preset: StylePreset }) {
  const { w, h } = useCanvasSize();
  return (
    <svg width={w} height={h} style={fill}>
      <defs>
        <pattern id="bg-diag" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="64" stroke={rgba(preset.accentColor, 0.08)} strokeWidth="3" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#bg-diag)" />
    </svg>
  );
}

function RuledPaper({ preset }: { preset: StylePreset }) {
  const { w, h } = useCanvasSize();
  return (
    <svg width={w} height={h} style={fill}>
      <defs>
        <pattern id="bg-ruled" width={w} height="64" patternUnits="userSpaceOnUse">
          <line x1="0" y1="64" x2={w} y2="64" stroke={rgba(preset.textColor, 0.12)} strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#bg-ruled)" />
      <line x1="140" y1="0" x2="140" y2={h} stroke={rgba(preset.textColor, 0.22)} strokeWidth="2" />
    </svg>
  );
}

function Noise({ slideIndex }: { slideIndex: number }) {
  const { w, h } = useCanvasSize();
  const id = `bg-noise-${slideIndex}`;
  return (
    <svg width={w} height={h} style={{ ...fill, mixBlendMode: "overlay", opacity: 0.6 }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={slideIndex + 1} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={w} height={h} filter={`url(#${id})`} />
    </svg>
  );
}

function WatermarkNumber({ slideIndex, preset }: { slideIndex: number; preset: StylePreset }) {
  return (
    <div
      style={{
        position: "absolute", right: -60, bottom: -280, fontSize: 960,
        fontFamily: preset.fontFamily, fontWeight: 900, color: rgba(preset.accentColor, 0.055),
        lineHeight: 0.8, letterSpacing: "-0.06em", pointerEvents: "none", userSelect: "none",
      }}
    >
      {String(slideIndex + 1).padStart(2, "0")}
    </div>
  );
}

function CornerGlow({ slideIndex, preset }: { slideIndex: number; preset: StylePreset }) {
  const corners = [
    { top: -200, right: -200 }, { bottom: -200, left: -200 },
    { top: -200, left: -200 }, { bottom: -200, right: -200 },
  ];
  return (
    <div
      style={{
        position: "absolute", ...corners[slideIndex % corners.length], width: 900, height: 900,
        background: `radial-gradient(circle, ${rgba(preset.accentColor, 0.22)}, transparent 65%)`,
        filter: "blur(60px)", pointerEvents: "none",
      }}
    />
  );
}

export function SlideBackdrop({
  bgType,
  slideIndex,
  preset,
}: {
  bgType: BgType;
  slideIndex: number;
  preset: StylePreset;
}) {
  switch (bgType) {
    case "blobs": return <Blobs slideIndex={slideIndex} preset={preset} />;
    case "grid": return <DotGrid preset={preset} />;
    case "lines": return <DiagonalLines preset={preset} />;
    case "paper": return <RuledPaper preset={preset} />;
    case "noise": return <Noise slideIndex={slideIndex} />;
    case "bignumber": return <WatermarkNumber slideIndex={slideIndex} preset={preset} />;
    case "glow": return <CornerGlow slideIndex={slideIndex} preset={preset} />;
    default: return null;
  }
}
