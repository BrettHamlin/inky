import { afterEach, describe, expect, it, vi } from "vitest";
import { filterNotes } from "@/lib/filter-notes";
import type { Note } from "@/types";

const timestamp = "2026-05-19T10:00:00.000Z";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
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
  vi.doUnmock("react");
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("NotesProvider pin actions", () => {
  //harness:criterion=c-toggle-pin-action-persists-to-local-storage
  it("updates context state and persists toggled pin state to localStorage", async () => {
    const storage = stubLocalStorage({
      "inky-notes": JSON.stringify([note({ pinned: false })]),
    });
    const hookState = {
      index: 0,
      values: [] as unknown[],
    };

    vi.doMock("react", () => ({
      createContext: () => ({ Provider: "provider" }),
      useCallback: (callback: unknown) => callback,
      useContext: () => null,
      useEffect: (effect: () => void) => {
        effect();
      },
      useMemo: (factory: () => unknown) => factory(),
      useState: (initialValue: unknown) => {
        const index = hookState.index++;
        if (!(index in hookState.values)) {
          hookState.values[index] =
            typeof initialValue === "function"
              ? (initialValue as () => unknown)()
              : initialValue;
        }

        return [
          hookState.values[index],
          (nextValue: unknown) => {
            hookState.values[index] =
              typeof nextValue === "function"
                ? (nextValue as (current: unknown) => unknown)(
                    hookState.values[index],
                  )
                : nextValue;
          },
        ];
      },
    }));

    const { NotesProvider } = await import("./notes-context.tsx");
    const renderProvider = () => {
      hookState.index = 0;
      return NotesProvider({ children: null }) as {
        props: { value: { notes: Note[]; togglePin: (id: string) => void } };
      };
    };

    let value = renderProvider().props.value;
    value.togglePin("note-1");
    value = renderProvider().props.value;

    expect(value.notes[0].pinned).toBe(true);
    expect(JSON.parse(storage.get("inky-notes") ?? "[]")[0].pinned).toBe(true);
  });

  //harness:criterion=c-unpin-moves-note-to-unpinned-group,c-toggle-pin-action-persists-to-local-storage
  it("unpins through context, persists the change, and immediately filters the note behind pinned notes", async () => {
    const storage = stubLocalStorage({
      "inky-notes": JSON.stringify([
        note({ id: "was-pinned", title: "Was pinned", pinned: true }),
        note({ id: "still-pinned", title: "Still pinned", pinned: true }),
        note({ id: "already-unpinned", title: "Already unpinned" }),
      ]),
    });
    const hookState = {
      index: 0,
      values: [] as unknown[],
    };

    vi.doMock("react", () => ({
      createContext: () => ({ Provider: "provider" }),
      useCallback: (callback: unknown) => callback,
      useContext: () => null,
      useEffect: (effect: () => void) => {
        effect();
      },
      useMemo: (factory: () => unknown) => factory(),
      useState: (initialValue: unknown) => {
        const index = hookState.index++;
        if (!(index in hookState.values)) {
          hookState.values[index] =
            typeof initialValue === "function"
              ? (initialValue as () => unknown)()
              : initialValue;
        }

        return [
          hookState.values[index],
          (nextValue: unknown) => {
            hookState.values[index] =
              typeof nextValue === "function"
                ? (nextValue as (current: unknown) => unknown)(
                    hookState.values[index],
                  )
                : nextValue;
          },
        ];
      },
    }));

    const { NotesProvider } = await import("./notes-context.tsx");
    const renderProvider = () => {
      hookState.index = 0;
      return NotesProvider({ children: null }) as {
        props: { value: { notes: Note[]; togglePin: (id: string) => void } };
      };
    };

    let value = renderProvider().props.value;
    value.togglePin("was-pinned");
    value = renderProvider().props.value;

    const storedNotes = JSON.parse(storage.get("inky-notes") ?? "[]") as Note[];
    expect(value.notes.find((item) => item.id === "was-pinned")?.pinned).toBe(false);
    expect(storedNotes.find((item) => item.id === "was-pinned")?.pinned).toBe(false);
    expect(
      filterNotes(value.notes, {
        activeView: "all",
        selectedTag: null,
        searchQuery: "",
      }).map((item) => item.id),
    ).toEqual(["still-pinned", "was-pinned", "already-unpinned"]);
  });

  //harness:criterion=c-newly-created-notes-default-unpinned
  it("creates notes through context as unpinned and persists them in the unpinned group", async () => {
    const storage = stubLocalStorage({
      "inky-notes": JSON.stringify([
        note({ id: "pinned-existing", title: "Pinned", pinned: true }),
      ]),
    });
    const hookState = {
      index: 0,
      values: [] as unknown[],
    };

    vi.doMock("react", () => ({
      createContext: () => ({ Provider: "provider" }),
      useCallback: (callback: unknown) => callback,
      useContext: () => null,
      useEffect: (effect: () => void) => {
        effect();
      },
      useMemo: (factory: () => unknown) => factory(),
      useState: (initialValue: unknown) => {
        const index = hookState.index++;
        if (!(index in hookState.values)) {
          hookState.values[index] =
            typeof initialValue === "function"
              ? (initialValue as () => unknown)()
              : initialValue;
        }

        return [
          hookState.values[index],
          (nextValue: unknown) => {
            hookState.values[index] =
              typeof nextValue === "function"
                ? (nextValue as (current: unknown) => unknown)(
                    hookState.values[index],
                  )
                : nextValue;
          },
        ];
      },
    }));

    const { NotesProvider } = await import("./notes-context.tsx");
    const renderProvider = () => {
      hookState.index = 0;
      return NotesProvider({ children: null }) as {
        props: {
          value: {
            notes: Note[];
            createNote: (data: {
              title: string;
              content: string;
              tags: string[];
            }) => Note;
          };
        };
      };
    };

    let value = renderProvider().props.value;
    const created = value.createNote({
      title: "Created from context",
      content: "",
      tags: [],
    });
    value = renderProvider().props.value;

    const storedNotes = JSON.parse(storage.get("inky-notes") ?? "[]") as Note[];
    expect(created.pinned).toBe(false);
    expect(storedNotes.find((item) => item.id === created.id)?.pinned).toBe(false);
    expect(
      filterNotes(value.notes, {
        activeView: "all",
        selectedTag: null,
        searchQuery: "",
      }).map((item) => item.id),
    ).toEqual(["pinned-existing", created.id]);
  });

  //harness:criterion=c-pin-state-survives-page-reload
  it("reloads pinned state after a context pin action persists it", async () => {
    const storage = stubLocalStorage({
      "inky-notes": JSON.stringify([
        note({ id: "unpinned", title: "Unpinned" }),
        note({ id: "pin-me", title: "Pin me" }),
      ]),
    });
    const hookState = {
      index: 0,
      values: [] as unknown[],
    };

    vi.doMock("react", () => ({
      createContext: () => ({ Provider: "provider" }),
      useCallback: (callback: unknown) => callback,
      useContext: () => null,
      useEffect: (effect: () => void) => {
        effect();
      },
      useMemo: (factory: () => unknown) => factory(),
      useState: (initialValue: unknown) => {
        const index = hookState.index++;
        if (!(index in hookState.values)) {
          hookState.values[index] =
            typeof initialValue === "function"
              ? (initialValue as () => unknown)()
              : initialValue;
        }

        return [
          hookState.values[index],
          (nextValue: unknown) => {
            hookState.values[index] =
              typeof nextValue === "function"
                ? (nextValue as (current: unknown) => unknown)(
                    hookState.values[index],
                  )
                : nextValue;
          },
        ];
      },
    }));

    const { NotesProvider } = await import("./notes-context.tsx");
    const renderProvider = () => {
      hookState.index = 0;
      return NotesProvider({ children: null }) as {
        props: { value: { notes: Note[]; togglePin: (id: string) => void } };
      };
    };

    let value = renderProvider().props.value;
    value.togglePin("pin-me");
    value = renderProvider().props.value;

    expect(value.notes.find((item) => item.id === "pin-me")?.pinned).toBe(true);

    hookState.values = [];
    value = renderProvider().props.value;

    expect(value.notes.find((item) => item.id === "pin-me")?.pinned).toBe(true);
    expect(
      filterNotes(value.notes, {
        activeView: "all",
        selectedTag: null,
        searchQuery: "",
      }).map((item) => item.id),
    ).toEqual(["pin-me", "unpinned"]);
  });
});
