"use client";
import type { CSSProperties, FocusEvent } from "react";
import type { SlideData } from "../lib/types";
import { useEdit } from "./EditContext";

export function EditableText({
  field,
  value,
  className,
  style,
  as = "span",
}: {
  field: keyof SlideData;
  value: string;
  className?: string;
  style?: CSSProperties;
  as?: "span" | "div" | "h1" | "h2" | "p";
}) {
  const { editable, patch } = useEdit();
  const Tag = as;

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      style={{ ...style, outline: "none" }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) patch({ [field]: next } as Partial<SlideData>);
      }}
    >
      {value}
    </Tag>
  );
}
