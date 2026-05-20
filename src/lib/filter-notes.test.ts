import { describe, expect, it } from "vitest";
import { filterNotes } from "./filter-notes.ts";
import { togglePinById } from "./note-state.ts";
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

function testNote(overrides: Partial<Note>): Note {
  return {
    id: "note",
    title: "Note",
    content: "Body",
    tags: [],
    archived: false,
    pinned: false,
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

  //harness:criterion=c-filter-notes-pinned-before-unpinned-all-notes
  it("returns pinned active notes before unpinned active notes", () => {
    const result = filterNotes(
      [
        testNote({ id: "unpinned-a" }),
        testNote({ id: "pinned-a", pinned: true }),
        testNote({ id: "unpinned-b" }),
        testNote({ id: "pinned-b", pinned: true }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual(["pinned-a", "pinned-b", "unpinned-a", "unpinned-b"]);
  });

  //harness:criterion=c-filter-notes-pinned-before-unpinned-archived
  it("returns pinned archived notes before unpinned archived notes", () => {
    const result = filterNotes(
      [
        testNote({ id: "active-pinned", pinned: true }),
        testNote({ id: "archived-unpinned", archived: true }),
        testNote({ id: "archived-pinned", archived: true, pinned: true }),
      ],
      { activeView: "archived", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual(["archived-pinned", "archived-unpinned"]);
  });

  //harness:criterion=c-filter-notes-pinned-before-unpinned-tag-filter
  it("returns pinned tag matches before unpinned tag matches", () => {
    const result = filterNotes(
      [
        testNote({ id: "work-unpinned", tags: ["work"] }),
        testNote({ id: "personal-pinned", tags: ["personal"], pinned: true }),
        testNote({ id: "work-pinned", tags: ["work"], pinned: true }),
      ],
      { activeView: "all", selectedTag: "work", searchQuery: "" },
    );

    expect(ids(result)).toEqual(["work-pinned", "work-unpinned"]);
  });

  //harness:criterion=c-filter-notes-pinned-before-unpinned-search
  it("returns pinned search matches before unpinned search matches", () => {
    const result = filterNotes(
      [
        testNote({ id: "hello-unpinned", title: "hello world" }),
        testNote({ id: "other-pinned", title: "different", pinned: true }),
        testNote({ id: "hello-pinned", title: "hello team", pinned: true }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "hello" },
    );

    expect(ids(result)).toEqual(["hello-pinned", "hello-unpinned"]);
  });

  //harness:criterion=c-filter-notes-preserves-relative-order-within-pinned-group
  it("preserves relative order inside pinned and unpinned groups", () => {
    const result = filterNotes(
      [
        testNote({ id: "pinned-a", pinned: true }),
        testNote({ id: "unpinned-b" }),
        testNote({ id: "pinned-c", pinned: true }),
        testNote({ id: "unpinned-d" }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual(["pinned-a", "pinned-c", "unpinned-b", "unpinned-d"]);
  });

  //harness:criterion=c-filter-notes-partition-applied-after-existing-filters,c-pin-does-not-affect-tag-filter-exclusion
  it("does not include pinned notes excluded by the active tag filter", () => {
    const result = filterNotes(
      [
        testNote({ id: "personal-pinned", tags: ["personal"], pinned: true }),
        testNote({ id: "work-unpinned", tags: ["work"] }),
      ],
      { activeView: "all", selectedTag: "work", searchQuery: "" },
    );

    expect(ids(result)).toEqual(["work-unpinned"]);
  });

  //harness:criterion=c-filter-notes-partition-applied-after-existing-filters,c-pin-does-not-affect-archive-filter,c-pin-does-not-affect-tag-filter-exclusion,c-pin-does-not-affect-search-filter-exclusion
  it("applies archive, tag, and search filters before pin ordering", () => {
    const result = filterNotes(
      [
        testNote({
          id: "active-pinned-match",
          archived: false,
          pinned: true,
          tags: ["work"],
          title: "hello active",
        }),
        testNote({
          id: "archived-pinned-wrong-tag",
          archived: true,
          pinned: true,
          tags: ["personal"],
          title: "hello archived",
        }),
        testNote({
          id: "archived-pinned-wrong-search",
          archived: true,
          pinned: true,
          tags: ["work"],
          title: "different archived",
        }),
        testNote({
          id: "archived-unpinned-match",
          archived: true,
          tags: ["work"],
          title: "hello archived",
        }),
        testNote({
          id: "archived-pinned-match",
          archived: true,
          pinned: true,
          tags: ["work"],
          title: "hello archived",
        }),
      ],
      { activeView: "archived", selectedTag: "work", searchQuery: "hello" },
    );

    expect(ids(result)).toEqual([
      "archived-pinned-match",
      "archived-unpinned-match",
    ]);
  });

  //harness:criterion=c-pin-does-not-affect-archive-filter
  it("does not include pinned active notes in the archived view", () => {
    const result = filterNotes(
      [
        testNote({ id: "active-pinned", pinned: true }),
        testNote({ id: "archived", archived: true }),
      ],
      { activeView: "archived", selectedTag: null, searchQuery: "" },
    );

    expect(ids(result)).toEqual(["archived"]);
  });

  //harness:criterion=c-pin-does-not-affect-search-filter-exclusion
  it("does not include pinned notes excluded by the active search query", () => {
    const result = filterNotes(
      [
        testNote({ id: "other-pinned", title: "different", content: "unrelated", pinned: true }),
        testNote({ id: "hello-unpinned", title: "hello", content: "" }),
      ],
      { activeView: "all", selectedTag: null, searchQuery: "hello" },
    );

    expect(ids(result)).toEqual(["hello-unpinned"]);
  });

  //harness:criterion=c-unpin-moves-note-to-unpinned-group
  it("moves an unpinned note behind remaining pinned notes without a reload", () => {
    const toggled = togglePinById(
      [
        testNote({ id: "was-pinned", pinned: true }),
        testNote({ id: "still-pinned", pinned: true }),
        testNote({ id: "already-unpinned" }),
      ],
      "was-pinned",
      "2099-01-01T00:00:00.000Z",
    );

    expect(
      ids(
        filterNotes(toggled, {
          activeView: "all",
          selectedTag: null,
          searchQuery: "",
        }),
      ),
    ).toEqual(["still-pinned", "was-pinned", "already-unpinned"]);
  });
});
