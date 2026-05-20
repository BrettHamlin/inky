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
    createdAt: "2024-10-29T10:00:00.000Z",
    updatedAt: "2024-10-29T10:00:00.000Z",
  },
  {
    id: "2",
    title: "Japan Travel Planning",
    content: "<p>Book <strong>hotels</strong> near train stations.</p>",
    tags: ["Travel", "Personal"],
    archived: false,
    createdAt: "2024-10-28T10:00:00.000Z",
    updatedAt: "2024-10-28T10:00:00.000Z",
  },
  {
    id: "3",
    title: "Old Cooking Notes",
    content: "Archived sauce experiments.",
    tags: ["Cooking", "Recipes"],
    archived: true,
    createdAt: "2024-10-27T10:00:00.000Z",
    updatedAt: "2024-10-27T10:00:00.000Z",
  },
];

function ids(result: Note[]) {
  return result.map((note) => note.id);
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
    // harness:criterion=c-filter-notes-archived-passes
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
    // harness:criterion=c-filter-notes-tag-search-passes
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
    // harness:criterion=c-filter-notes-blank-query-passes
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
});
