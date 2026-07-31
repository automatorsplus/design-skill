import type { EditorState } from "./editorState";
import type { BrandKit } from "../lib/brandKits";

export function applyBrandKit(state: EditorState, kit: BrandKit): EditorState {
  const slides = state.slides.map((s) => (s.type === "cta" ? { ...s, handle: kit.handle } : s));
  return {
    slides,
    defaults: { ...state.defaults, surface: kit.surface, accent: kit.accent, font: kit.font },
  };
}
