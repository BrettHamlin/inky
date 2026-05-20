import type { ReactNode } from "react";
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

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div role="textbox" aria-label="Note content" />,
}));

vi.mock("lucide-react", () => {
  const icon = (name: string) => ({ className }: { className?: string }) => (
    <svg data-icon={name} className={className} />
  );

  return {
    Archive: icon("Archive"),
    ArrowLeft: icon("ArrowLeft"),
    Clock3: icon("Clock3"),
    Pin: icon("Pin"),
    PinOff: icon("PinOff"),
    Tag: icon("Tag"),
    Trash2: icon("Trash2"),
    X: icon("X"),
    XIcon: icon("XIcon"),
  };
});

import { NoteEditor } from "./NoteEditor.tsx";

const timestamp = "2026-05-19T10:00:00.000Z";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-123",
    title: "Pinned workflow",
    content: "",
    tags: [],
    archived: false,
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function renderEditor(overrides: Partial<Note> = {}, onTogglePin = vi.fn()) {
  capturedButtons.length = 0;
  const html = renderToStaticMarkup(
    <NoteEditor
      note={note(overrides)}
      onSave={() => {}}
      onDelete={() => {}}
      onArchive={() => {}}
      onTogglePin={onTogglePin}
      onCancel={() => {}}
      availableTags={[]}
      tagColors={{}}
    />,
  );

  return { html, onTogglePin };
}

function pinButtons(label: string) {
  return capturedButtons.filter((button) => button["aria-label"] === label);
}

beforeEach(() => {
  capturedButtons.length = 0;
});

describe("NoteEditor pin controls", () => {
  //harness:criterion=c-note-editor-desktop-pin-button-present,c-note-editor-mobile-pin-button-present
  it("renders mobile and desktop pin buttons for an unpinned note", () => {
    const { html } = renderEditor({ pinned: false });
    const buttons = pinButtons("Pin note");

    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.variant === "ghost")).toBe(true);
    expect(buttons.every((button) => button.size === "icon-sm")).toBe(true);
    expect(html).toContain('class="flex items-center justify-between');
    expect(html).toContain("xl:hidden");
    expect(html).toContain("<aside");
    expect(html).toContain("xl:block");
    expect(html).toContain('data-icon="Pin"');
  });

  //harness:criterion=c-note-editor-desktop-unpin-button-present,c-note-editor-mobile-unpin-button-present
  it("renders mobile and desktop unpin buttons for a pinned note", () => {
    const { html } = renderEditor({ pinned: true });
    const buttons = pinButtons("Unpin note");

    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.variant === "ghost")).toBe(true);
    expect(buttons.every((button) => button.size === "icon-sm")).toBe(true);
    expect(html).toContain('data-icon="PinOff"');
  });

  //harness:criterion=c-note-editor-pin-button-has-aria-label
  it("sets matching aria-label and title text on pin buttons", () => {
    renderEditor({ pinned: false });

    expect(pinButtons("Pin note")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "aria-label": "Pin note",
          title: "Pin note",
        }),
      ]),
    );
  });

  //harness:criterion=c-note-editor-pin-button-calls-on-toggle-pin
  it("wires the pin button click handler to the current note id", () => {
    const onTogglePin = vi.fn();
    renderEditor({ id: "note-123", pinned: false }, onTogglePin);
    const [pinButton] = pinButtons("Pin note");

    (pinButton.onClick as () => void)();

    expect(onTogglePin).toHaveBeenCalledOnce();
    expect(onTogglePin).toHaveBeenCalledWith("note-123");
  });
});
