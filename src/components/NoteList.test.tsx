import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types";

const { capturedButtons } = vi.hoisted(() => ({
  capturedButtons: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    size,
    className,
    ...props
  }: {
    children?: ReactNode;
    variant?: string;
    size?: string;
    className?: string;
    [key: string]: unknown;
  }) => {
    const buttonProps = { ...props, variant, size, className };
    capturedButtons.push(buttonProps);

    return (
      <button
        {...props}
        className={className}
        data-size={size}
        data-variant={variant}
      >
        {children}
      </button>
    );
  },
}));

vi.mock("lucide-react", () => ({
  Pin: ({ className }: { className?: string }) => (
    <svg data-icon="Pin" className={className} />
  ),
  PinOff: ({ className }: { className?: string }) => (
    <svg data-icon="PinOff" className={className} />
  ),
}));

import { NoteList } from "./NoteList.tsx";

const timestamp = "2026-05-19T10:00:00.000Z";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "First note",
    content: "",
    tags: [],
    archived: false,
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function hasNestedButton(html: string) {
  const stack: string[] = [];
  const tokens = html.match(/<\/?button\b[^>]*>/g) ?? [];

  for (const token of tokens) {
    if (token.startsWith("</button")) {
      stack.pop();
      continue;
    }

    if (stack.includes("button")) return true;
    stack.push("button");
  }

  return false;
}

function renderList(onSelectNote = vi.fn(), onTogglePin = vi.fn()) {
  capturedButtons.length = 0;
  const notes = [note()];
  const element = NoteList({
    notes,
    selectedNoteId: null,
    onSelectNote,
    onTogglePin,
    onCreateNew: () => {},
    searchQuery: "",
    tagColors: {},
    emptyMessage: "No notes",
  });

  return { element, html: renderToStaticMarkup(element), notes };
}

function findElementByAriaLabel(node: ReactNode, label: string): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByAriaLabel(child, label);
      if (match) return match;
    }
    return null;
  }

  if (!isValidElement<{ children?: ReactNode; "aria-label"?: string }>(node)) {
    return null;
  }

  if (node.props["aria-label"] === label) return node;

  return findElementByAriaLabel(node.props.children, label);
}

beforeEach(() => {
  capturedButtons.length = 0;
});

describe("NoteList pin controls", () => {
  //harness:criterion=c-note-list-desktop-row-no-nested-button
  it("renders note rows without nested button markup", () => {
    const { html } = renderList();

    expect(hasNestedButton(html)).toBe(false);
    expect(html).toContain('role="listitem"');
  });

  //harness:criterion=c-note-list-desktop-row-has-pin-control
  it("activates the pin control without selecting the row", () => {
    const onSelectNote = vi.fn();
    const onTogglePin = vi.fn();
    renderList(onSelectNote, onTogglePin);
    const pinButton = capturedButtons.find(
      (button) => button["aria-label"] === "Pin note",
    );

    (pinButton?.onClick as () => void)();

    expect(onTogglePin).toHaveBeenCalledOnce();
    expect(onTogglePin).toHaveBeenCalledWith("note-1");
    expect(onSelectNote).not.toHaveBeenCalled();
  });

  //harness:criterion=c-note-list-desktop-row-select-still-works
  it("selects a note from the non-pin row area without toggling pin state", () => {
    const onSelectNote = vi.fn();
    const onTogglePin = vi.fn();
    const { element } = renderList(onSelectNote, onTogglePin);
    const selectButton = findElementByAriaLabel(element, "Select note First note");

    expect(selectButton).not.toBeNull();
    (selectButton?.props.onClick as () => void)();

    expect(onSelectNote).toHaveBeenCalledOnce();
    expect(onSelectNote).toHaveBeenCalledWith("note-1");
    expect(onTogglePin).not.toHaveBeenCalled();
  });
});
