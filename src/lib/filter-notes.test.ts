import { describe, expect, it } from "vitest";
import { filterNotes } from "./filter-notes.ts";
import type { Note } from "../types.ts";

const notes: Note[] = [
  {
    id: "1",
    title: "React Performance Optimization",
    content: "Memoization, code splitting, and virtual lists.",
    tags: ["Dev", "React"],
    pinned: false,
    archived: false,
    createdAt: "2024-10-29T10:00:00.000Z",
    updatedAt: "2024-10-29T10:00:00.000Z",
  },
  {
    id: "2",
    title: "Japan Travel Planning",
    content: "<p>Book <strong>hotels</strong> near train stations.</p>",
    tags: ["Travel", "Personal"],
    pinned: false,
    archived: false,
    createdAt: "2024-10-28T10:00:00.000Z",
    updatedAt: "2024-10-28T10:00:00.000Z",
  },
  {
    id: "3",
    title: "Old Cooking Notes",
    content: "Archived sauce experiments.",
    tags: ["Cooking", "Recipes"],
    pinned: false,
    archived: true,
    createdAt: "2024-10-27T10:00:00.000Z",
    updatedAt: "2024-10-27T10:00:00.000Z",
  },
];

function ids(result: Note[]) {
  return result.map((note) => note.id);
}

function note(overrides: Partial<Note>): Note {
  return {
    id: "base",
    title: "Base note",
    content: "Base content",
    tags: ["General"],
    pinned: false,
    archived: false,
    createdAt: "2024-10-29T10:00:00.000Z",
    updatedAt: "2024-10-29T10:00:00.000Z",
    ...overrides,
  };
}

describe("filterNotes", () => {
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

  it("returns pinned notes before unpinned notes in all notes", () => {
    // harness:criterion=c-filter-notes-pinned-first-all-notes
    const result = filterNotes(
      [
        note({ id: "unpinned-a", pinned: false }),
        note({ id: "pinned-a", pinned: true }),
        note({ id: "unpinned-b", pinned: false }),
        note({ id: "pinned-b", pinned: true }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual([
      "pinned-a",
      "pinned-b",
      "unpinned-a",
      "unpinned-b",
    ]);
  });

  it("returns pinned archived notes before unpinned archived notes", () => {
    // harness:criterion=c-filter-notes-pinned-first-archived
    const result = filterNotes(
      [
        note({ id: "active-pinned", pinned: true, archived: false }),
        note({ id: "archived-unpinned", pinned: false, archived: true }),
        note({ id: "archived-pinned", pinned: true, archived: true }),
      ],
      { activeView: "archived", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual(["archived-pinned", "archived-unpinned"]);
  });

  it("returns only matching tag notes with pinned matches first", () => {
    // harness:criterion=c-filter-notes-pinned-first-tag-filtered,c-pinned-notes-respect-tag-filter
    const result = filterNotes(
      [
        note({ id: "work-unpinned", pinned: false, tags: ["work"] }),
        note({ id: "personal-pinned", pinned: true, tags: ["personal"] }),
        note({ id: "work-pinned", pinned: true, tags: ["work"] }),
      ],
      { activeView: "all", selectedTag: "work", searchQuery: "" },
    );

    expect(ids(result)).toEqual(["work-pinned", "work-unpinned"]);
    expect(result.every((item) => item.tags.includes("work"))).toBe(true);
  });

  it("returns only matching search notes with pinned matches first", () => {
    // harness:criterion=c-filter-notes-pinned-first-search-filtered,c-pinned-notes-respect-search-filter
    const result = filterNotes(
      [
        note({ id: "query-unpinned", title: "Query draft", pinned: false }),
        note({ id: "other-pinned", title: "Different title", pinned: true }),
        note({ id: "query-pinned", title: "Query plan", pinned: true }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "query" },
    );

    expect(ids(result)).toEqual(["query-pinned", "query-unpinned"]);
    expect(result.every((item) => item.title.toLowerCase().includes("query")))
      .toBe(true);
  });

  it("preserves relative order within pinned and unpinned groups", () => {
    // harness:criterion=c-filter-notes-stable-order-within-group
    const result = filterNotes(
      [
        note({ id: "unpinned-a", pinned: false }),
        note({ id: "pinned-b", pinned: true }),
        note({ id: "unpinned-c", pinned: false }),
        note({ id: "pinned-d", pinned: true }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual([
      "pinned-b",
      "pinned-d",
      "unpinned-a",
      "unpinned-c",
    ]);
  });
});
