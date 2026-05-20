import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteEditor } from "./NoteEditor";
import type { Note } from "@/types";

const capturedButtons = vi.hoisted(() => [] as any[]);

vi.mock("@/components/ui/button", async () => {
  const React = await import("react");

  return {
    Button: ({ children, ...props }: any) => {
      capturedButtons.push(props);
      return React.createElement("button", props, children);
    },
  };
});

vi.mock("@/components/RichTextEditor", async () => {
  const React = await import("react");

  return {
    RichTextEditor: (props: any) => React.createElement("div", props),
  };
});

vi.mock("@/components/ui/popover", async () => {
  const React = await import("react");
  const Passthrough = ({ children, ...props }: any) =>
    React.createElement("div", props, children);

  return {
    Popover: Passthrough,
    PopoverContent: Passthrough,
    PopoverTrigger: Passthrough,
  };
});

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");
  const Passthrough = ({ children, ...props }: any) =>
    React.createElement("div", props, children);

  return {
    Dialog: Passthrough,
    DialogContent: Passthrough,
    DialogHeader: Passthrough,
    DialogTitle: Passthrough,
    DialogDescription: Passthrough,
    DialogFooter: Passthrough,
  };
});

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "Pinned workflow",
    content: "",
    tags: ["General"],
    archived: false,
    pinned: false,
    createdAt: "2026-05-19T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

function renderEditor(activeNote: Note, onPin = vi.fn()) {
  const html = renderToStaticMarkup(
    React.createElement(NoteEditor, {
      note: activeNote,
      onSave: vi.fn(),
      onDelete: vi.fn(),
      onArchive: vi.fn(),
      onPin,
      onCancel: vi.fn(),
      availableTags: ["General"],
      tagColors: {},
    }),
  );

  return { html, onPin };
}

function pinButtons() {
  return capturedButtons.filter(
    (props) => /^pin note:/i.test(props["aria-label"] ?? "") ||
      /^unpin note:/i.test(props["aria-label"] ?? ""),
  );
}

describe("NoteEditor pin action", () => {
  beforeEach(() => {
    capturedButtons.length = 0;
  });

  //harness:criterion=c-note-editor-renders-pin-button
  it("renders pin-related action buttons when a note is open", () => {
    renderEditor(note());

    expect(pinButtons().length).toBeGreaterThan(0);
  });

  //harness:criterion=c-note-editor-pin-button-calls-on-pin
  it("calls onPin when a pin action button is activated", () => {
    const { onPin } = renderEditor(note());

    pinButtons()[0].onClick();

    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledWith("note-1");
  });

  //harness:criterion=c-note-editor-pin-button-shows-pin-icon-when-unpinned
  it("shows the Pin icon state for an unpinned note", () => {
    const { html } = renderEditor(note({ pinned: false }));

    expect(
      pinButtons().every(
        (props) => props["aria-label"] === "Pin note: Pinned workflow",
      ),
    ).toBe(true);
    expect(html).toContain('data-testid="pin-icon"');
    expect(html).not.toContain('data-testid="pinoff-icon"');
  });

  //harness:criterion=c-note-editor-pin-button-shows-pinoff-icon-when-pinned
  it("shows the PinOff icon state for a pinned note", () => {
    const { html } = renderEditor(note({ pinned: true }));

    expect(
      pinButtons().every(
        (props) => props["aria-label"] === "Unpin note: Pinned workflow",
      ),
    ).toBe(true);
    expect(html).toContain('data-testid="pinoff-icon"');
    expect(html).not.toContain('data-testid="pin-icon"');
  });
});
