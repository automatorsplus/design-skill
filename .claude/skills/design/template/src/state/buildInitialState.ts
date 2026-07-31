import type { EditorState } from "./editorState";
import {
  SLIDES,
  DEFAULT_FONT,
  DEFAULT_SURFACE,
  DEFAULT_ACCENT,
  DEFAULT_PURPOSE,
  DEFAULT_BG,
  DEFAULT_FORMAT,
} from "../slides";

export function buildInitialState(): EditorState {
  return {
    slides: SLIDES.map((s) => ({ ...s })),
    defaults: {
      font: DEFAULT_FONT,
      surface: DEFAULT_SURFACE,
      accent: DEFAULT_ACCENT,
      purpose: DEFAULT_PURPOSE,
      bg: DEFAULT_BG,
      format: DEFAULT_FORMAT,
    },
  };
}
