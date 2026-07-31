import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditContext } from "./EditContext";
import { Slide } from "./engine";
import type { SlideData, StylePreset } from "../lib/types";

const preset: StylePreset = {
  id: "test",
  name: "Test",
  bg: "#ffffff",
  textColor: "#111111",
  textSecondary: "#666666",
  accentColor: "#7c3aed",
  highlightColor: "#7c3aed",
  fontFamily: "sans-serif",
};

function renderSlide(data: SlideData, ctx?: { editable: boolean; setItem?: ReturnType<typeof vi.fn> }) {
  const value = {
    editable: ctx?.editable ?? false,
    patch: () => {},
    setItem: ctx?.setItem,
  };
  return render(
    <EditContext.Provider value={value}>
      <Slide data={data} preset={preset} index={0} total={1} bgType="none" />
    </EditContext.Provider>
  );
}

describe("array-field click-to-edit — export safety (non-editable / no setItem)", () => {
  it("list items render as plain text, no contentEditable", () => {
    renderSlide({ type: "list", items: ["First", "Second"] });
    const el = screen.getByText("First");
    expect(el).not.toHaveAttribute("contenteditable");
    expect(screen.getByText("Second")).not.toHaveAttribute("contenteditable");
  });

  it("checklist items render as plain text", () => {
    renderSlide({ type: "checklist", items: ["Do the thing"] });
    expect(screen.getByText("Do the thing")).not.toHaveAttribute("contenteditable");
  });

  it("stats value + label render as plain text", () => {
    renderSlide({ type: "stats", stats: [{ value: "42", label: "Answers" }] });
    expect(screen.getByText("42")).not.toHaveAttribute("contenteditable");
    expect(screen.getByText("Answers")).not.toHaveAttribute("contenteditable");
  });

  it("process step title + text render as plain text", () => {
    renderSlide({ type: "process", steps: [{ title: "Step one", text: "Details" }] });
    expect(screen.getByText("Step one")).not.toHaveAttribute("contenteditable");
    expect(screen.getByText("Details")).not.toHaveAttribute("contenteditable");
  });

  it("comparison left/right items render as plain text", () => {
    renderSlide({ type: "comparison", leftItems: ["Con A"], rightItems: ["Pro A"] });
    expect(screen.getByText("Con A")).not.toHaveAttribute("contenteditable");
    expect(screen.getByText("Pro A")).not.toHaveAttribute("contenteditable");
  });

  it("points text renders as plain text", () => {
    renderSlide({ type: "body", points: [{ type: "plus", text: "Good thing" }] });
    expect(screen.getByText("Good thing")).not.toHaveAttribute("contenteditable");
  });

  it("editable=true but setItem undefined (thumbnail/export path) still renders plain", () => {
    renderSlide({ type: "list", items: ["Untouched"] }, { editable: true, setItem: undefined });
    expect(screen.getByText("Untouched")).not.toHaveAttribute("contenteditable");
  });
});

describe("array-field click-to-edit — main-stage editing", () => {
  it("commits a list item edit via setItem(items, index, text)", () => {
    const setItem = vi.fn();
    renderSlide({ type: "list", items: ["a", "b"] }, { editable: true, setItem });
    const el = screen.getByText("a");
    expect(el).toHaveAttribute("contenteditable");
    el.textContent = "a-edited";
    fireEvent.blur(el);
    expect(setItem).toHaveBeenCalledWith("items", 0, "a-edited");
  });

  it("commits a stats value edit preserving the sibling label", () => {
    const setItem = vi.fn();
    renderSlide({ type: "stats", stats: [{ value: "42", label: "Answers" }] }, { editable: true, setItem });
    const el = screen.getByText("42");
    el.textContent = "43";
    fireEvent.blur(el);
    expect(setItem).toHaveBeenCalledWith("stats", 0, { value: "43", label: "Answers" });
  });

  it("commits a stats label edit preserving the sibling value", () => {
    const setItem = vi.fn();
    renderSlide({ type: "stats", stats: [{ value: "42", label: "Answers" }] }, { editable: true, setItem });
    const el = screen.getByText("Answers");
    el.textContent = "Replies";
    fireEvent.blur(el);
    expect(setItem).toHaveBeenCalledWith("stats", 0, { value: "42", label: "Replies" });
  });

  it("commits a process step title edit preserving sibling text", () => {
    const setItem = vi.fn();
    renderSlide({ type: "process", steps: [{ title: "Step one", text: "Details" }] }, { editable: true, setItem });
    const el = screen.getByText("Step one");
    el.textContent = "Step uno";
    fireEvent.blur(el);
    expect(setItem).toHaveBeenCalledWith("steps", 0, { title: "Step uno", text: "Details" });
  });

  it("commits a comparison rightItems edit", () => {
    const setItem = vi.fn();
    renderSlide({ type: "comparison", leftItems: ["Con A"], rightItems: ["Pro A"] }, { editable: true, setItem });
    const el = screen.getByText("Pro A");
    el.textContent = "Pro B";
    fireEvent.blur(el);
    expect(setItem).toHaveBeenCalledWith("rightItems", 0, "Pro B");
  });

  it("commits a points text edit preserving the sibling type", () => {
    const setItem = vi.fn();
    renderSlide({ type: "body", points: [{ type: "minus", text: "Bad thing" }] }, { editable: true, setItem });
    const el = screen.getByText("Bad thing");
    el.textContent = "Worse thing";
    fireEvent.blur(el);
    expect(setItem).toHaveBeenCalledWith("points", 0, { type: "minus", text: "Worse thing" });
  });

  it("does not call setItem when the text is unchanged", () => {
    const setItem = vi.fn();
    renderSlide({ type: "list", items: ["a"] }, { editable: true, setItem });
    fireEvent.blur(screen.getByText("a"));
    expect(setItem).not.toHaveBeenCalled();
  });
});
