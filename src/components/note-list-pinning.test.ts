import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NoteList } from "./NoteList";
import type { Note } from "@/types";

vi.mock("@/components/ui/button", async () => {
  const React = await import("react");

  return {
    Button: ({ children, ...props }: any) =>
      React.createElement("button", props, children),
  };
});

const notes: Note[] = [
  {
    id: "first",
    title: "First",
    content: "",
    tags: ["General"],
    archived: false,
    pinned: false,
    createdAt: "2026-05-19T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  },
  {
    id: "second",
    title: "Second",
    content: "",
    tags: ["General"],
    archived: false,
    pinned: true,
    createdAt: "2026-05-19T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  },
  {
    id: "third",
    title: "Third",
    content: "",
    tags: ["General"],
    archived: false,
    pinned: false,
    createdAt: "2026-05-19T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  },
];

function renderNoteList(togglePin = vi.fn()) {
  const props = {
    notes,
    selectedNoteId: null,
    onSelectNote: vi.fn(),
    togglePin,
    onCreateNew: vi.fn(),
    searchQuery: "",
    tagColors: {},
    emptyMessage: "No notes.",
  };
  const element = NoteList(props);

  return { element, html: renderToStaticMarkup(element) };
}

function collectElements(
  node: React.ReactNode,
  predicate: (element: React.ReactElement) => boolean,
  matches: React.ReactElement[] = [],
) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectElements(child, predicate, matches));
    return matches;
  }

  if (!React.isValidElement(node)) return matches;
  if (predicate(node)) matches.push(node);
  collectElements((node.props as { children?: React.ReactNode }).children, predicate, matches);
  return matches;
}

function hasNestedButton(html: string) {
  let depth = 0;

  for (const match of html.matchAll(/<\/?button\b[^>]*>/g)) {
    if (match[0].startsWith("</")) {
      depth -= 1;
    } else {
      if (depth > 0) return true;
      depth += 1;
    }
  }

  return false;
}

describe("NoteList pin controls", () => {
  //harness:criterion=c-note-list-renders-pin-control-per-row
  it("renders one pin control per row with the icon matching each note state", () => {
    const { element, html } = renderNoteList();
    const pinControls = collectElements(
      element,
      (child) =>
        /^pin note:/i.test(child.props?.["aria-label"] ?? "") ||
        /^unpin note:/i.test(child.props?.["aria-label"] ?? ""),
    );

    expect(pinControls.map((control) => control.props["aria-label"])).toEqual([
      "Pin note: First",
      "Unpin note: Second",
      "Pin note: Third",
    ]);
    expect(html.match(/data-testid="pin-icon"/g)).toHaveLength(2);
    expect(html.match(/data-testid="pinoff-icon"/g)).toHaveLength(1);
  });

  //harness:criterion=c-note-list-pin-control-no-nested-buttons
  it("does not render buttons inside other buttons", () => {
    const { html } = renderNoteList();

    expect(hasNestedButton(html)).toBe(false);
  });

  //harness:criterion=c-note-list-pin-control-invokes-toggle-pin
  it("calls togglePin with the corresponding note id from a row pin control", () => {
    const togglePin = vi.fn();
    const { element } = renderNoteList(togglePin);
    const pinControls = collectElements(
      element,
      (child) =>
        /^pin note:/i.test(child.props?.["aria-label"] ?? "") ||
        /^unpin note:/i.test(child.props?.["aria-label"] ?? ""),
    );

    pinControls[1].props.onClick();

    expect(togglePin).toHaveBeenCalledTimes(1);
    expect(togglePin).toHaveBeenCalledWith("second");
  });
});
