import type { SlideData, SlideType } from "../lib/types";

export function blankSlide(type: SlideType): SlideData {
  switch (type) {
    case "hook": return { type, text: "Your hook goes here" };
    case "body": return { type, title: "Title", text: "Body text" };
    case "quote": return { type, text: "A short quote", author: "Author" };
    case "cta": return { type, text: "Final message", handle: "@yourhandle" };
    case "stats": return { type, title: "Numbers", stats: [{ value: "10x", label: "Faster" }, { value: "50%", label: "Smaller" }] };
    case "list": return { type, title: "Steps", items: ["First", "Second", "Third"] };
    case "checklist": return { type, title: "Checklist", items: ["First", "Second"] };
    case "process": return { type, title: "Process", steps: [{ title: "Step one" }, { title: "Step two" }] };
    case "comparison": return { type, leftLabel: "Before", leftItems: ["Old"], rightLabel: "After", rightItems: ["New"] };
    case "image": return { type, title: "Caption", imageSrc: "" };
    case "emoji": return { type, emoji: "✨", title: "Title", text: "Text" };
    case "number": return { type, bigNumber: "1", title: "Title", text: "Text" };
    default: return { type, text: "" };
  }
}
