"use client";
import { createContext, useContext } from "react";
import type { SlideData } from "../lib/types";
import type { ArrayField } from "../state/editorState";

export interface EditCtx {
  editable: boolean;
  patch: (patch: Partial<SlideData>) => void;
  setItem?: (field: ArrayField, itemIndex: number, value: unknown) => void;
}

export const EditContext = createContext<EditCtx>({
  editable: false,
  patch: () => {},
});

export const useEdit = () => useContext(EditContext);
