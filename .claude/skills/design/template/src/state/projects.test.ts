import { describe, it, expect, beforeEach } from "vitest";
import { listProjects, saveProject, loadProject, deleteProject, saveAutosave, loadAutosave } from "./projects";
import type { EditorState } from "./editorState";

const st = (t: string): EditorState => ({
  slides: [{ type: "hook", text: t }],
  defaults: { font: "clean", surface: "white", accent: "violet", purpose: "carousel", bg: "glow", format: "threads-4x5" },
});

beforeEach(() => localStorage.clear());

describe("projects", () => {
  it("saves and loads a named project", () => {
    saveProject("mine", st("x"));
    expect(loadProject("mine")).toEqual(st("x"));
  });
  it("lists saved project names sorted", () => {
    saveProject("b", st("1")); saveProject("a", st("2"));
    expect(listProjects()).toEqual(["a", "b"]);
  });
  it("deletes a project and drops it from the index", () => {
    saveProject("gone", st("x")); deleteProject("gone");
    expect(loadProject("gone")).toBeNull();
    expect(listProjects()).toEqual([]);
  });
  it("loadProject returns null for missing", () => {
    expect(loadProject("nope")).toBeNull();
  });
  it("autosave round-trips", () => {
    saveAutosave(st("auto"));
    expect(loadAutosave()).toEqual(st("auto"));
  });
  it("loadAutosave returns null when empty", () => {
    expect(loadAutosave()).toBeNull();
  });
});
