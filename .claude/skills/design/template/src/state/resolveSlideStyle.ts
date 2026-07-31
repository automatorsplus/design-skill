import type { SlideData } from "../lib/types";
import type { EditorDefaults } from "./editorState";

export function resolveSlideStyle(defaults: EditorDefaults, slide: SlideData) {
  const o = slide.slideStyle ?? {};
  return {
    font: o.font ?? defaults.font,
    surface: o.surface ?? defaults.surface,
    accent: o.accent ?? defaults.accent,
    bg: o.bg ?? defaults.bg,
  };
}
