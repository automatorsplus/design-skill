import type { SlideData, FontId, SurfaceId, AccentId, PurposeId, BgType, FormatId } from "../lib/types";

export interface EditorDefaults {
  font: FontId;
  surface: SurfaceId;
  accent: AccentId;
  purpose: PurposeId;
  bg: BgType;
  format: FormatId;
}

export interface EditorState {
  slides: SlideData[];
  defaults: EditorDefaults;
}

export type ArrayField = "items" | "stats" | "steps" | "leftItems" | "rightItems" | "points";

export type EditorAction =
  | { type: "patchSlide"; index: number; patch: Partial<SlideData> }
  | { type: "setDefaults"; patch: Partial<EditorDefaults> }
  | { type: "addSlide"; index: number; slide: SlideData }
  | { type: "deleteSlide"; index: number }
  | { type: "duplicateSlide"; index: number }
  | { type: "moveSlide"; from: number; to: number }
  | { type: "setArrayItem"; index: number; field: ArrayField; itemIndex: number; value: unknown }
  | { type: "addArrayItem"; index: number; field: ArrayField; value: unknown }
  | { type: "removeArrayItem"; index: number; field: ArrayField; itemIndex: number }
  | { type: "replaceState"; state: EditorState };

function patchArray(state: EditorState, index: number, field: ArrayField, fn: (arr: unknown[]) => unknown[]): EditorState {
  if (index < 0 || index >= state.slides.length) return state;
  const slide = state.slides[index];
  const current = (slide[field] as unknown[] | undefined) ?? [];
  const nextArr = fn([...current]);
  const slides = state.slides.map((s, i) => (i === index ? { ...s, [field]: nextArr } : s));
  return { ...state, slides };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "patchSlide": {
      if (action.index < 0 || action.index >= state.slides.length) return state;
      const slides = state.slides.map((s, i) => (i === action.index ? { ...s, ...action.patch } : s));
      return { ...state, slides };
    }
    case "setDefaults":
      return { ...state, defaults: { ...state.defaults, ...action.patch } };
    case "addSlide": {
      const at = Math.max(0, Math.min(action.index + 1, state.slides.length));
      const slides = [...state.slides.slice(0, at), { ...action.slide }, ...state.slides.slice(at)];
      return { ...state, slides };
    }
    case "deleteSlide": {
      if (state.slides.length <= 1) return state;
      if (action.index < 0 || action.index >= state.slides.length) return state;
      const slides = state.slides.filter((_, i) => i !== action.index);
      return { ...state, slides };
    }
    case "duplicateSlide": {
      if (action.index < 0 || action.index >= state.slides.length) return state;
      const copy = { ...state.slides[action.index] };
      const slides = [...state.slides.slice(0, action.index + 1), copy, ...state.slides.slice(action.index + 1)];
      return { ...state, slides };
    }
    case "moveSlide": {
      const { from } = action;
      if (from < 0 || from >= state.slides.length) return state;
      const to = Math.max(0, Math.min(action.to, state.slides.length - 1));
      const slides = [...state.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { ...state, slides };
    }
    case "setArrayItem":
      return patchArray(state, action.index, action.field, (arr) => {
        if (action.itemIndex < 0 || action.itemIndex >= arr.length) return arr;
        arr[action.itemIndex] = action.value;
        return arr;
      });
    case "addArrayItem":
      return patchArray(state, action.index, action.field, (arr) => { arr.push(action.value); return arr; });
    case "removeArrayItem":
      return patchArray(state, action.index, action.field, (arr) => arr.filter((_, i) => i !== action.itemIndex));
    case "replaceState":
      return action.state;
    default:
      return state;
  }
}
