import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotesProvider, useNotes } from "./notes-context";
import type { Note } from "@/types";

let latestNotes: Note[] = [];

const storedNoteWithoutPinned = {
  id: "legacy-note",
  title: "Legacy",
  content: "Saved before pinned existed",
  tags: ["General"],
  archived: false,
  createdAt: "2026-05-19T10:00:00.000Z",
  updatedAt: "2026-05-19T10:00:00.000Z",
};

function stubLocalStorage(values: Record<string, string>) {
  const store = new Map(Object.entries(values));

  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  });
}

function NotesSnapshot() {
  const { notes, togglePin } = useNotes();
  latestNotes = notes;

  return React.createElement(
    "pre",
    { "data-toggle-pin-type": typeof togglePin },
    JSON.stringify(notes),
  );
}

async function loadProviderHarness({ runEffects = false } = {}) {
  const stateSlots: unknown[] = [];
  let hookIndex = 0;

  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");

    return {
      ...actual,
      useState: (initialValue: unknown) => {
        const slot = hookIndex++;
        if (stateSlots.length <= slot) {
          stateSlots[slot] =
            typeof initialValue === "function"
              ? (initialValue as () => unknown)()
              : initialValue;
        }

        const setState = (nextValue: unknown) => {
          const currentValue = stateSlots[slot];
          stateSlots[slot] =
            typeof nextValue === "function"
              ? (nextValue as (value: unknown) => unknown)(currentValue)
              : nextValue;
        };

        return [stateSlots[slot], setState] as const;
      },
      useEffect: (effect: () => void) => {
        if (runEffects) effect();
      },
      useCallback: (callback: unknown) => callback,
      useMemo: (factory: () => unknown) => factory(),
    };
  });

  const { NotesProvider: HarnessedNotesProvider } = await import(
    "./notes-context"
  );

  return {
    stateSlots,
    renderProvider: () => {
      hookIndex = 0;
      return HarnessedNotesProvider({ children: null }) as React.ReactElement;
    },
  };
}

describe("NotesProvider pinned notes behavior", () => {
  afterEach(() => {
    latestNotes = [];
    vi.unstubAllGlobals();
    vi.doUnmock("react");
    vi.resetModules();
  });

  //harness:criterion=c-localstorage-normalize-missing-pinned
  it("normalizes legacy localStorage notes without pinned to pinned false", () => {
    stubLocalStorage({
      "inky-notes": JSON.stringify([storedNoteWithoutPinned]),
    });

    renderToStaticMarkup(
      React.createElement(
        NotesProvider,
        null,
        React.createElement(NotesSnapshot),
      ),
    );

    expect(latestNotes).toHaveLength(1);
    expect(latestNotes[0].pinned).toBe(false);
  });

  //harness:criterion=c-notes-context-exposes-toggle-pin
  it("exposes togglePin from context and flips the matching note", async () => {
    stubLocalStorage({
      "inky-notes": JSON.stringify([{ ...storedNoteWithoutPinned, pinned: false }]),
    });
    const { renderProvider, stateSlots } = await loadProviderHarness();

    const providerElement = renderProvider();
    providerElement.props.value.togglePin("legacy-note");

    expect((stateSlots[0] as Note[])[0]).toMatchObject({
      id: "legacy-note",
      pinned: true,
    });
  });

  //harness:criterion=c-pin-toggle-persists-to-localstorage
  it("persists a toggled pin value to localStorage", async () => {
    const setItem = vi.fn();

    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) =>
        key === "inky-notes"
          ? JSON.stringify([{ ...storedNoteWithoutPinned, pinned: false }])
          : null,
      ),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    const { renderProvider } = await loadProviderHarness({ runEffects: true });

    const providerElement = renderProvider();
    providerElement.props.value.togglePin("legacy-note");
    renderProvider();

    const savedNotesCalls = setItem.mock.calls.filter(
      ([key]) => key === "inky-notes",
    );
    const lastSavedNotes = JSON.parse(savedNotesCalls.at(-1)?.[1] ?? "[]");

    expect(lastSavedNotes.find((note: Note) => note.id === "legacy-note"))
      .toMatchObject({ pinned: true });
  });
});
