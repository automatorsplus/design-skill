import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditContext } from "./EditContext";
import { EditableText } from "./EditableText";

describe("EditableText", () => {
  it("renders plain text when not editable", () => {
    render(<EditableText field="text" value="hello" />);
    const el = screen.getByText("hello");
    expect(el).not.toHaveAttribute("contenteditable");
  });

  it("commits changed text on blur when editable", () => {
    const patch = vi.fn();
    render(
      <EditContext.Provider value={{ editable: true, patch }}>
        <EditableText field="text" value="hello" />
      </EditContext.Provider>
    );
    const el = screen.getByText("hello");
    el.textContent = "world";
    fireEvent.blur(el);
    expect(patch).toHaveBeenCalledWith({ text: "world" });
  });

  it("does not commit when text is unchanged", () => {
    const patch = vi.fn();
    render(
      <EditContext.Provider value={{ editable: true, patch }}>
        <EditableText field="text" value="hello" />
      </EditContext.Provider>
    );
    fireEvent.blur(screen.getByText("hello"));
    expect(patch).not.toHaveBeenCalled();
  });
});
