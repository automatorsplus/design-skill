import type { EditorState } from "./editorState";

export const SCHEMA_VERSION = 1;

export function serialize(state: EditorState): string {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, slides: state.slides, defaults: state.defaults });
}

export function deserialize(json: string): EditorState | null {
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.slides)) return null;
  if (!o.defaults || typeof o.defaults !== "object") return null;
  const d = o.defaults as Record<string, unknown>;
  const req = ["font", "surface", "accent", "purpose", "bg", "format"];
  if (!req.every((k) => typeof d[k] === "string")) return null;
  return { slides: o.slides as EditorState["slides"], defaults: o.defaults as EditorState["defaults"] };
}
