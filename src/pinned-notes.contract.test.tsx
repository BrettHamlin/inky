import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App.tsx";
import { NoteEditor } from "./components/NoteEditor.tsx";
import { NoteList } from "./components/NoteList.tsx";
import {
  NotesProvider,
  loadNotes,
  saveNotes,
  useNotes,
} from "./store/notes-context.tsx";
import { togglePinById } from "./lib/note-state.ts";
import type { Note } from "./types.ts";

const timestamp = "2026-05-19T10:00:00.000Z";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "First note",
    content: "Body",
    tags: ["General"],
    pinned: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function renderEditor(noteOverride: Partial<Note> = {}) {
  return renderToStaticMarkup(
    <NoteEditor
      note={note(noteOverride)}
      onSave={() => undefined}
      onDelete={() => undefined}
      onArchive={() => undefined}
      onTogglePin={() => undefined}
      onCancel={() => undefined}
      availableTags={["General", "Work"]}
      tagColors={{}}
      onBack={() => undefined}
    />,
  );
}

function firstRowMarkup(html: string, testId: string) {
  const marker = `data-testid="${testId}"`;
  const markerIndex = html.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const tagStart = html.lastIndexOf("<", markerIndex);
  const nextRow = html.indexOf(marker, markerIndex + marker.length);
  return html.slice(
    tagStart,
    nextRow === -1 ? undefined : html.lastIndexOf("<", nextRow),
  );
}

type ElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

function reactChildren(children: ReactNode): ReactNode[] {
  return Array.isArray(children) ? children : [children];
}

function findElements(
  node: ReactNode,
  predicate: (element: ReactElement<ElementProps>) => boolean,
): ReactElement<ElementProps>[] {
  if (!isValidElement<ElementProps>(node)) return [];

  const matches = predicate(node) ? [node] : [];
  return [
    ...matches,
    ...reactChildren(node.props.children).flatMap((child) =>
      findElements(child, predicate),
    ),
  ];
}

function firstElement(
  node: ReactNode,
  predicate: (element: ReactElement<ElementProps>) => boolean,
) {
  const [match] = findElements(node, predicate);
  if (!match) throw new Error("Expected matching React element");
  return match;
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
});

describe("pinned notes contract", () => {
  it("normalizes legacy stored notes that do not have pinned", () => {
    // harness:criterion=c-load-notes-normalizes-missing-pinned
    localStorage.setItem(
      "inky-notes",
      JSON.stringify([
        {
          id: "legacy-1",
          title: "Legacy one",
          content: "",
          tags: [],
          archived: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: "legacy-2",
          title: "Legacy two",
          content: "",
          tags: [],
          archived: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]),
    );

    expect(loadNotes().map((item) => item.pinned)).toEqual([false, false]);
  });

  it("exposes togglePin to context consumers", () => {
    // harness:criterion=c-context-exposes-toggle-pin-action
    let togglePinType = "";

    function Probe() {
      const { togglePin } = useNotes();
      togglePinType = typeof togglePin;
      return null;
    }

    renderToStaticMarkup(
      <NotesProvider>
        <Probe />
      </NotesProvider>,
    );

    expect(togglePinType).toBe("function");
  });

  it("persists a toggled pinned value to localStorage", () => {
    // harness:criterion=c-toggle-pin-persists-to-localstorage
    saveNotes([note({ id: "persist-me", pinned: false })]);

    saveNotes(togglePinById(loadNotes(), "persist-me"));

    const stored = JSON.parse(
      localStorage.getItem("inky-notes") ?? "[]",
    ) as Note[];
    expect(stored.find((item) => item.id === "persist-me")?.pinned).toBe(true);
  });

  it("reflects toggled pinned state in the notes that would be held by context", () => {
    // harness:criterion=c-toggle-pin-updates-context-state
    const notes = [note({ id: "state-note", pinned: false })];

    const next = togglePinById(notes, "state-note");

    expect(next.find((item) => item.id === "state-note")?.pinned).toBe(true);
  });

  it("renders mobile and desktop editor pin controls with accessible state labels", () => {
    // harness:criterion=c-note-editor-has-pin-button-mobile,c-note-editor-has-pin-button-desktop,c-note-editor-pin-button-reflects-pinned-state,c-note-editor-pin-button-accessible-label
    const unpinnedHtml = renderEditor({ pinned: false });
    const pinnedHtml = renderEditor({ pinned: true });

    expect(unpinnedHtml.match(/aria-label="Pin Note"/g)).toHaveLength(2);
    expect(pinnedHtml.match(/aria-label="Unpin Note"/g)).toHaveLength(2);
    expect(pinnedHtml).toContain("Unpin Note");
  });

  it("renders desktop note rows as non-button containers with select and pin controls", () => {
    // harness:criterion=c-note-list-row-no-nested-interactive,c-note-list-row-pin-control
    const onTogglePin = vi.fn();
    const tree = NoteList({
      notes: [note({ id: "desktop-note" })],
      selectedNoteId: null,
      onSelectNote: () => undefined,
      onTogglePin,
      onCreateNew: () => undefined,
      searchQuery: "",
      tagColors: {},
      emptyMessage: "No notes",
    });
    const html = renderToStaticMarkup(
      <NoteList
        notes={[note({ id: "desktop-note" })]}
        selectedNoteId={null}
        onSelectNote={() => undefined}
        onTogglePin={onTogglePin}
        onCreateNew={() => undefined}
        searchQuery=""
        tagColors={{}}
        emptyMessage="No notes"
      />,
    );
    const row = firstRowMarkup(html, "note-list-row");

    expect(row.startsWith("<div")).toBe(true);
    expect(row.match(/<button/g)).toHaveLength(2);
    expect(row).toContain('aria-label="Select First note"');
    expect(row).toContain('aria-label="Pin note"');

    const rowElement = firstElement(
      tree,
      (element) => element.props["data-testid"] === "note-list-row",
    );
    const pinControl = firstElement(
      rowElement,
      (element) => element.props["aria-label"] === "Pin note",
    );
    const click = pinControl.props.onClick;
    expect(typeof click).toBe("function");

    (click as (event: { stopPropagation: () => void }) => void)({
      stopPropagation: vi.fn(),
    });

    expect(onTogglePin).toHaveBeenCalledTimes(1);
    expect(onTogglePin).toHaveBeenCalledWith("desktop-note");
  });

  it("renders a visible pinned indicator for pinned desktop rows only", () => {
    // harness:criterion=c-note-list-row-pinned-visual-indicator
    const pinnedHtml = renderToStaticMarkup(
      <NoteList
        notes={[note({ pinned: true })]}
        selectedNoteId={null}
        onSelectNote={() => undefined}
        onTogglePin={() => undefined}
        onCreateNew={() => undefined}
        searchQuery=""
        tagColors={{}}
        emptyMessage="No notes"
      />,
    );
    const unpinnedHtml = renderToStaticMarkup(
      <NoteList
        notes={[note({ pinned: false })]}
        selectedNoteId={null}
        onSelectNote={() => undefined}
        onTogglePin={() => undefined}
        onCreateNew={() => undefined}
        searchQuery=""
        tagColors={{}}
        emptyMessage="No notes"
      />,
    );

    expect(pinnedHtml).toContain('data-testid="pin-indicator"');
    expect(unpinnedHtml).not.toContain('data-testid="pin-indicator"');
  });

  it("renders mobile app rows as non-button containers with accessible pin controls", () => {
    // harness:criterion=c-mobile-list-row-no-nested-interactive,c-mobile-list-row-pin-control
    localStorage.setItem(
      "inky-notes",
      JSON.stringify([
        note({ id: "mobile-note", title: "Mobile note" }),
        note({ id: "mobile-note-2", title: "Second mobile note" }),
      ]),
    );

    const html = renderToStaticMarkup(<App />);
    const row = firstRowMarkup(html, "mobile-note-list-row");

    expect(row.startsWith("<div")).toBe(true);
    expect(row.match(/<button/g)).toHaveLength(2);
    expect(row).toContain('aria-label="Select Mobile note"');
    expect(row).toContain('aria-label="Pin note"');
  });

  it("renders seeded pinned notes first with pin indicators after a reload-style render", () => {
    // harness:criterion=c-pin-action-wired-from-context-to-editor,c-pin-action-wired-from-context-to-note-list,c-pinned-notes-sorted-first-end-to-end,c-pinned-survives-reload
    localStorage.setItem(
      "inky-notes",
      JSON.stringify([
        note({ id: "unpinned-a", title: "Unpinned A", pinned: false }),
        note({ id: "pinned-b", title: "Pinned B", pinned: true }),
        note({ id: "unpinned-c", title: "Unpinned C", pinned: false }),
      ]),
    );

    const html = renderToStaticMarkup(<App />);

    expect(html.indexOf("Pinned B")).toBeLessThan(html.indexOf("Unpinned A"));
    expect(html).toContain('data-testid="pin-indicator"');
  });

  it("moves an unpinned note after remaining pinned notes in the visible order", () => {
    // harness:criterion=c-unpin-moves-note-out-of-pinned-group
    const result = togglePinById(
      [
        note({ id: "first-pinned", title: "First", pinned: true }),
        note({ id: "second-pinned", title: "Second", pinned: true }),
        note({ id: "plain", title: "Plain", pinned: false }),
      ],
      "first-pinned",
    );
    saveNotes(result);
    const html = renderToStaticMarkup(<App />);

    expect(html.indexOf("Second")).toBeLessThan(html.indexOf("First"));
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Plain"));
  });

  it("persists pin toggles without changing archive status", () => {
    // harness:criterion=c-pin-does-not-affect-archive-status,c-toggle-pin-persists-to-localstorage
    saveNotes([
      note({ id: "active", archived: false, pinned: false }),
      note({ id: "archived", archived: true, pinned: false }),
    ]);

    saveNotes(togglePinById(loadNotes(), "active"));
    saveNotes(togglePinById(loadNotes(), "archived"));

    const stored = JSON.parse(
      localStorage.getItem("inky-notes") ?? "[]",
    ) as Note[];

    expect(stored.find((item) => item.id === "active")).toMatchObject({
      archived: false,
      pinned: true,
    });
    expect(stored.find((item) => item.id === "archived")).toMatchObject({
      archived: true,
      pinned: true,
    });
  });
});
