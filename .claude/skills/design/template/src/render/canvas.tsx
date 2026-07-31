"use client";

// Canvas size propagation for the render engine.
// The active format's pixel dimensions are provided once at the top of a
// render tree and read by the frame + background layers. Original code.

import { createContext, useContext, ReactNode } from "react";

export interface CanvasSize {
  w: number;
  h: number;
}

const CanvasSizeContext = createContext<CanvasSize>({ w: 1080, h: 1350 });

export function CanvasSizeProvider({
  w,
  h,
  children,
}: {
  w: number;
  h: number;
  children: ReactNode;
}) {
  return (
    <CanvasSizeContext.Provider value={{ w, h }}>
      {children}
    </CanvasSizeContext.Provider>
  );
}

export function useCanvasSize(): CanvasSize {
  return useContext(CanvasSizeContext);
}

// Small colour helper shared by the background layers.
export function rgbChannels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = rgbChannels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
