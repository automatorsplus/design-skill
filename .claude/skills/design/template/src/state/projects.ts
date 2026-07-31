import type { EditorState } from "./editorState";
import { serialize, deserialize } from "./persistence";

const P = "design:project:";
const INDEX = "design:projectIndex";
const AUTOSAVE = "design:__autosave__";

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(names: string[]): void {
  localStorage.setItem(INDEX, JSON.stringify([...new Set(names)].sort()));
}

export function listProjects(): string[] {
  return readIndex();
}

export function saveProject(name: string, state: EditorState): void {
  localStorage.setItem(P + name, serialize(state));
  writeIndex([...readIndex(), name]);
}

export function loadProject(name: string): EditorState | null {
  const raw = localStorage.getItem(P + name);
  return raw ? deserialize(raw) : null;
}

export function deleteProject(name: string): void {
  localStorage.removeItem(P + name);
  writeIndex(readIndex().filter((n) => n !== name));
}

export function saveAutosave(state: EditorState): void {
  localStorage.setItem(AUTOSAVE, serialize(state));
}

export function loadAutosave(): EditorState | null {
  const raw = localStorage.getItem(AUTOSAVE);
  return raw ? deserialize(raw) : null;
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE);
}
