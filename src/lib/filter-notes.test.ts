import { describe, expect, it } from "vitest";
import { filterNotes } from "./filter-notes.ts";
import type { Note } from "../types.ts";

const notes: Note[] = [
  {
    id: "1",
    title: "React Performance Optimization",
    content: "Memoization, code splitting, and virtual lists.",
    tags: ["Dev", "React"],
    archived: false,
    pinned: false,
    createdAt: "2024-10-29T10:00:00.000Z",
    updatedAt: "2024-10-29T10:00:00.000Z",
  },
  {
    id: "2",
    title: "Japan Travel Planning",
    content: "<p>Book <strong>hotels</strong> near train stations.</p>",
    tags: ["Travel", "Personal"],
    archived: false,
    pinned: false,
    createdAt: "2024-10-28T10:00:00.000Z",
    updatedAt: "2024-10-28T10:00:00.000Z",
  },
  {
    id: "3",
    title: "Old Cooking Notes",
    content: "Archived sauce experiments.",
    tags: ["Cooking", "Recipes"],
    archived: true,
    pinned: false,
    createdAt: "2024-10-27T10:00:00.000Z",
    updatedAt: "2024-10-27T10:00:00.000Z",
  },
];

function ids(result: Note[]) {
  return result.map((note) => note.id);
}

function assertPinnedBeforeUnpinned(result: Note[]) {
  const firstUnpinnedIndex = result.findIndex((note) => !note.pinned);
  if (firstUnpinnedIndex === -1) return;

  expect(result.slice(firstUnpinnedIndex).every((note) => !note.pinned)).toBe(
    true,
  );
}

describe("filterNotes", () => {
  //harness:criterion=c-filter-notes-fixture-includes-pinned-field
  it("uses explicit pinned values on the shared fixture notes", () => {
    expect(notes.every((note) => typeof note.pinned === "boolean")).toBe(true);
  });

  it("searches active notes by title", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "react",
        }),
      ),
    ).toEqual(["1"]);
  });

  it("searches active notes by content", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "train",
        }),
      ),
    ).toEqual(["2"]);
  });

  it("searches formatted HTML note content as readable text", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "hotels",
        }),
      ),
    ).toEqual(["2"]);
  });

  it("searches active notes by tag", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "personal",
        }),
      ),
    ).toEqual(["2"]);
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "  PERFORMANCE  ",
        }),
      ),
    ).toEqual(["1"]);
  });

  it("only searches archived notes in the archived view", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "archived",
          selectedTag: null,
          searchQuery: "cooking",
        }),
      ),
    ).toEqual(["3"]);
  });

  it("combines selected tag and search query", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: "Dev",
          searchQuery: "react",
        }),
      ),
    ).toEqual(["1"]);

    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: "Travel",
          searchQuery: "react",
        }),
      ),
    ).toEqual([]);
  });

  it("returns all notes in the current view for a blank query", () => {
    expect(
      ids(
        filterNotes(notes, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "   ",
        }),
      ),
    ).toEqual(["1", "2"]);
  });

  //harness:criterion=c-filter-notes-pinned-first-no-filter
  it("returns pinned notes before unpinned notes with no tag or search filter", () => {
    const mixedNotes = [
      { ...notes[0], id: "u1", pinned: false },
      { ...notes[1], id: "p1", pinned: true },
      { ...notes[0], id: "u2", pinned: false },
      { ...notes[1], id: "p2", pinned: true },
    ];

    const result = filterNotes(mixedNotes, {
      activeView: "all",
      selectedTag: null,
      searchQuery: "",
    });

    expect(ids(result)).toEqual(["p1", "p2", "u1", "u2"]);
    assertPinnedBeforeUnpinned(result);
  });

  //harness:criterion=c-filter-notes-pinned-first-with-tag-filter
  it("returns only matching tagged notes with pinned notes first", () => {
    const taggedNotes = [
      { ...notes[0], id: "u-work", tags: ["work"], pinned: false },
      { ...notes[1], id: "p-home", tags: ["home"], pinned: true },
      { ...notes[0], id: "p-work", tags: ["work"], pinned: true },
      { ...notes[1], id: "u-work-2", tags: ["work"], pinned: false },
    ];

    const result = filterNotes(taggedNotes, {
      activeView: "all",
      selectedTag: "work",
      searchQuery: "",
    });

    expect(result.every((note) => note.tags.includes("work"))).toBe(true);
    expect(ids(result)).toEqual(["p-work", "u-work", "u-work-2"]);
    assertPinnedBeforeUnpinned(result);
  });

  //harness:criterion=c-filter-notes-pinned-first-with-search-filter
  it("returns only search-matching notes with pinned notes first", () => {
    const searchableNotes = [
      { ...notes[0], id: "u-hello", title: "hello unpinned", pinned: false },
      { ...notes[1], id: "p-other", title: "other pinned", pinned: true },
      { ...notes[0], id: "p-hello", title: "hello pinned", pinned: true },
      { ...notes[1], id: "u-hello-2", content: "hello body", pinned: false },
    ];

    const result = filterNotes(searchableNotes, {
      activeView: "all",
      selectedTag: null,
      searchQuery: "hello",
    });

    expect(
      result.every((note) =>
        `${note.title} ${note.content} ${note.tags.join(" ")}`
          .toLowerCase()
          .includes("hello"),
      ),
    ).toBe(true);
    expect(ids(result)).toEqual(["p-hello", "u-hello", "u-hello-2"]);
    assertPinnedBeforeUnpinned(result);
  });

  //harness:criterion=c-filter-notes-stable-sort-within-groups
  it("preserves relative order within pinned and unpinned groups", () => {
    const interleavedNotes = [
      { ...notes[0], id: "p1", pinned: true },
      { ...notes[1], id: "u1", pinned: false },
      { ...notes[0], id: "p2", pinned: true },
      { ...notes[1], id: "u2", pinned: false },
      { ...notes[0], id: "p3", pinned: true },
      { ...notes[1], id: "u3", pinned: false },
    ];

    const result = filterNotes(interleavedNotes, {
      activeView: "all",
      selectedTag: null,
      searchQuery: "",
    });

    expect(ids(result.filter((note) => note.pinned))).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(ids(result.filter((note) => !note.pinned))).toEqual([
      "u1",
      "u2",
      "u3",
    ]);
    expect(ids(result)).toEqual(["p1", "p2", "p3", "u1", "u2", "u3"]);
  });
});
