import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types";

const { capturedButtons, capturedEditors, capturedLists, state } = vi.hoisted(
  () => ({
    capturedButtons: [] as Array<Record<string, unknown>>,
    capturedEditors: [] as Array<Record<string, unknown>>,
    capturedLists: [] as Array<Record<string, unknown>>,
    state: {
      notes: [] as Note[],
      togglePin: vi.fn(),
      createNote: vi.fn(),
      initialSelectedNoteId: null as string | null,
      useStateIndex: 0,
    },
  }),
);

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useState: (initialValue: unknown) => {
      const index = state.useStateIndex++;
      let value =
        typeof initialValue === "function"
          ? (initialValue as () => unknown)()
          : initialValue;

      if (index === 1) {
        value = state.initialSelectedNoteId;
      }

      return [
        value,
        (nextValue: unknown) => {
          value =
            typeof nextValue === "function"
              ? (nextValue as (current: unknown) => unknown)(value)
              : nextValue;

          if (index === 1) {
            state.initialSelectedNoteId = value as string | null;
          }
        },
      ];
    },
  };
});

vi.mock("@/store/theme-context", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/store/notes-context", () => ({
  NotesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useNotes: () => ({
    notes: state.notes,
    tags: ["work", "personal"],
    tagColors: {},
    createNote: state.createNote,
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    toggleArchive: vi.fn(),
    togglePin: state.togglePin,
    createTag: vi.fn(),
    deleteTag: vi.fn(),
  }),
}));

vi.mock("@/components/Sidebar", () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}));

vi.mock("@/components/MobileSidebar", () => ({
  MobileSidebar: () => <aside data-testid="mobile-sidebar" />,
}));

vi.mock("@/components/MobileBottomNav", () => ({
  MobileBottomNav: () => <nav data-testid="mobile-bottom-nav" />,
}));

vi.mock("@/components/ThemeSelector", () => ({
  ThemeSelector: () => <div data-testid="theme-selector" />,
}));

vi.mock("@/components/NoteList", () => ({
  NoteList: (props: Record<string, unknown>) => {
    capturedLists.push(props);
    return <div data-testid="desktop-note-list" />;
  },
}));

vi.mock("@/components/NoteEditor", () => ({
  NoteEditor: (props: Record<string, unknown>) => {
    capturedEditors.push(props);
    return <div data-testid="note-editor" />;
  },
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

vi.mock("lucide-react", () => {
  const icon = (name: string) => ({ className }: { className?: string }) => (
    <svg data-icon={name} className={className} />
  );

  return {
    Pin: icon("Pin"),
    PinOff: icon("PinOff"),
    Search: icon("Search"),
    X: icon("X"),
  };
});

import App from "./App.tsx";

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

function renderApp(notes: Note[]) {
  state.notes = notes;
  state.useStateIndex = 0;
  capturedButtons.length = 0;
  capturedEditors.length = 0;
  capturedLists.length = 0;

  return renderToStaticMarkup(<App />);
}

beforeEach(() => {
  state.notes = [];
  state.togglePin = vi.fn();
  state.createNote = vi.fn();
  state.initialSelectedNoteId = null;
  state.useStateIndex = 0;
  capturedButtons.length = 0;
  capturedEditors.length = 0;
  capturedLists.length = 0;
});

describe("App pinned note wiring", () => {
  //harness:criterion=c-app-passes-on-toggle-pin-to-note-list
  it("passes the context togglePin action to the desktop note list", () => {
    renderApp([note()]);

    expect(capturedLists[0]).toEqual(
      expect.objectContaining({ onTogglePin: state.togglePin }),
    );
  });

  //harness:criterion=c-app-passes-on-toggle-pin-to-note-editor
  it("passes the context togglePin action to the rendered note editor", () => {
    renderApp([note()]);

    expect(capturedEditors[0]).toEqual(
      expect.objectContaining({ onTogglePin: state.togglePin }),
    );
  });

  //harness:criterion=c-app-passes-on-toggle-pin-to-note-editor
  it("passes the context togglePin action to the selected-note editor path", () => {
    state.initialSelectedNoteId = "selected-note";

    renderApp([note({ id: "selected-note", title: "Selected" })]);

    expect(capturedEditors[0]).toEqual(
      expect.objectContaining({
        note: expect.objectContaining({ id: "selected-note" }),
        onTogglePin: state.togglePin,
      }),
    );
  });

  //harness:criterion=c-filtered-notes-memo-reflects-pin-order
  it("recomputes filtered note order after a pin action changes note state", () => {
    state.togglePin = vi.fn((id: string) => {
      state.notes = state.notes.map((item) =>
        item.id === id ? { ...item, pinned: !item.pinned } : item,
      );
    });

    renderApp([
      note({ id: "first", title: "First" }),
      note({ id: "second", title: "Second" }),
    ]);
    const secondPinButton = capturedButtons.filter(
      (button) => button["aria-label"] === "Pin note",
    )[1];

    (secondPinButton.onClick as () => void)();
    renderApp(state.notes);

    expect((capturedLists[0].notes as Note[]).map((item) => item.id)).toEqual([
      "second",
      "first",
    ]);
  });

  //harness:criterion=c-existing-notes-unaffected-on-load
  it("places legacy notes without pinned after explicitly pinned notes", () => {
    const legacyNote = {
      ...note({ id: "legacy", title: "Legacy" }),
    } as Partial<Note>;
    delete legacyNote.pinned;

    renderApp([
      legacyNote as Note,
      note({ id: "pinned", title: "Pinned", pinned: true }),
    ]);

    expect((capturedLists[0].notes as Note[]).map((item) => item.id)).toEqual([
      "pinned",
      "legacy",
    ]);
  });

  //harness:criterion=c-mobile-list-row-no-nested-button
  it("renders mobile inline note rows without nested button markup", () => {
    const html = renderApp([note()]);

    expect(hasNestedButton(html)).toBe(false);
    expect(html).toContain('aria-label="Notes list"');
  });

  //harness:criterion=c-mobile-list-row-has-pin-control
  it("wires the mobile inline row pin control to togglePin", () => {
    renderApp([note({ id: "mobile-note" })]);
    const pinButton = capturedButtons.find(
      (button) => button["aria-label"] === "Pin note",
    );

    (pinButton?.onClick as () => void)();

    expect(state.togglePin).toHaveBeenCalledOnce();
    expect(state.togglePin).toHaveBeenCalledWith("mobile-note");
  });
});
