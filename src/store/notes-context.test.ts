import { afterEach, describe, expect, it, vi } from "vitest";
import { filterNotes } from "@/lib/filter-notes";
import { loadNotes } from "./notes-context.tsx";
import type { Note } from "@/types";

const timestamp = "2026-05-19T10:00:00.000Z";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "1",
    title: "Stored",
    content: "",
    tags: [],
    archived: false,
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function stubLocalStorage(initial: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initial));

  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  });

  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notes context storage", () => {
  //harness:criterion=c-load-notes-normalizes-missing-pinned
  it("normalizes legacy stored notes without a pinned field", () => {
    const legacyNote = {
      id: "legacy",
      title: "Legacy",
      content: "",
      tags: [],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    stubLocalStorage({ "inky-notes": JSON.stringify([legacyNote]) });

    expect(loadNotes()).toEqual([note({ id: "legacy", title: "Legacy" })]);
  });

  //harness:criterion=c-load-notes-normalizes-missing-pinned,c-existing-notes-unaffected-on-load
  it("keeps legacy loaded notes as unpinned behind explicitly pinned notes", () => {
    const legacyNote = {
      id: "legacy",
      title: "Legacy",
      content: "",
      tags: [],
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    stubLocalStorage({
      "inky-notes": JSON.stringify([
        legacyNote,
        note({ id: "pinned", title: "Pinned", pinned: true }),
      ]),
    });

    const loaded = loadNotes();
    const result = filterNotes(loaded, {
      activeView: "all",
      selectedTag: null,
      searchQuery: "",
    });

    expect(loaded.find((item) => item.id === "legacy")?.pinned).toBe(false);
    expect(result.map((item) => item.id)).toEqual(["pinned", "legacy"]);
  });

  //harness:criterion=c-pin-state-survives-page-reload
  it("loads persisted pinned state and keeps pinned notes first after reload", () => {
    stubLocalStorage({
      "inky-notes": JSON.stringify([
        note({ id: "unpinned", title: "Unpinned", pinned: false }),
        note({ id: "pinned", title: "Pinned", pinned: true }),
      ]),
    });

    const loaded = loadNotes();
    const result = filterNotes(loaded, {
      activeView: "all",
      selectedTag: null,
      searchQuery: "",
    });

    expect(loaded.find((item) => item.id === "pinned")?.pinned).toBe(true);
    expect(result.map((item) => item.id)).toEqual(["pinned", "unpinned"]);
  });
});
