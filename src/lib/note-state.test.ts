import { describe, expect, it } from "vitest";
import {
  addTag,
  createNoteRecord,
  deleteNoteById,
  removeTag,
  toggleArchiveById,
  togglePinById,
  updateNoteById,
} from "./note-state.ts";
import type { ColorTheme, Note } from "@/types";

const timestamp = "2026-05-19T10:00:00.000Z";
const laterTimestamp = "2026-05-19T11:00:00.000Z";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "1",
    title: "Original",
    content: "Body",
    tags: ["General"],
    archived: false,
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe("note state helpers", () => {
  //harness:criterion=c-create-note-record-pinned-default-false,c-newly-created-notes-default-unpinned
  it("creates a new active note with matching created and updated timestamps", () => {
    expect(
      createNoteRecord(
        { title: "New", content: "<p>Hello</p>", tags: ["Dev"] },
        "note-1",
        timestamp,
      ),
    ).toEqual({
      id: "note-1",
      title: "New",
      content: "<p>Hello</p>",
      tags: ["Dev"],
      archived: false,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  //harness:criterion=c-toggle-pin-by-id-pins-unpinned-note
  it("pins only the matching unpinned note", () => {
    const notes = [
      note({ id: "1", title: "Target" }),
      note({ id: "2", title: "Other", tags: ["Keep"], updatedAt: timestamp }),
    ];
    const result = togglePinById(notes, "1", laterTimestamp);

    expect(result).not.toBe(notes);
    expect(result[0].pinned).toBe(true);
    expect(result[1]).toEqual(notes[1]);
  });

  //harness:criterion=c-toggle-pin-by-id-unpins-pinned-note
  it("unpins only the matching pinned note", () => {
    const notes = [
      note({ id: "1", pinned: true }),
      note({ id: "2", title: "Other", tags: ["Keep"], updatedAt: timestamp }),
    ];
    const result = togglePinById(notes, "1", laterTimestamp);

    expect(result[0].pinned).toBe(false);
    expect(result[1]).toEqual(notes[1]);
  });

  //harness:criterion=c-toggle-pin-by-id-updates-timestamp
  it("refreshes the updated timestamp when toggling a pin", () => {
    const result = togglePinById([note({ id: "target" })], "target", laterTimestamp);

    expect(result[0].updatedAt).toBe(laterTimestamp);
  });

  //harness:criterion=c-toggle-pin-by-id-unknown-id-no-op
  it("leaves note content unchanged when toggling an unknown id", () => {
    const notes = [
      note({ id: "1", pinned: false, updatedAt: timestamp }),
      note({ id: "2", pinned: true, updatedAt: laterTimestamp }),
    ];
    const result = togglePinById(notes, "missing", "2099-01-01T00:00:00.000Z");

    expect(result).not.toBe(notes);
    expect(result).toEqual(notes);
    expect(result).toHaveLength(notes.length);
    result.forEach((resultNote, index) => {
      expect(resultNote.pinned).toBe(notes[index].pinned);
      expect(resultNote.updatedAt).toBe(notes[index].updatedAt);
    });
  });

  it("updates only the matching note and refreshes its updated timestamp", () => {
    const notes = [note(), note({ id: "2", title: "Second" })];

    expect(updateNoteById(notes, "1", { title: "Updated" }, laterTimestamp))
      .toEqual([
        note({ title: "Updated", updatedAt: laterTimestamp }),
        note({ id: "2", title: "Second" }),
      ]);
  });

  it("deletes only the requested note", () => {
    const notes = [note(), note({ id: "2" })];

    expect(deleteNoteById(notes, "1")).toEqual([note({ id: "2" })]);
  });

  it("toggles archive state and refreshes the updated timestamp", () => {
    expect(toggleArchiveById([note()], "1", laterTimestamp)).toEqual([
      note({ archived: true, updatedAt: laterTimestamp }),
    ]);

    expect(
      toggleArchiveById(
        [note({ archived: true })],
        "1",
        laterTimestamp,
      ),
    ).toEqual([note({ archived: false, updatedAt: laterTimestamp })]);
  });

  it("adds trimmed tags alphabetically with their selected color", () => {
    const result = addTag(["General", "React"], {}, "  AI  ", "purple");

    expect(result).toEqual({
      tags: ["AI", "General", "React"],
      tagColors: { AI: "purple" },
    });
  });

  it("rejects empty and duplicate tags", () => {
    expect(addTag(["General"], {}, "   ")).toBeNull();
    expect(addTag(["General"], {}, "general")).toBeNull();
  });

  it("removes a tag from the tag list, tag colors, and every note using it", () => {
    const tagColors: Record<string, ColorTheme> = {
      General: "blue",
      React: "rose",
    };
    const notes = [
      note({ tags: ["General", "React"] }),
      note({ id: "2", tags: ["React"] }),
      note({ id: "3", tags: ["Ideas"] }),
    ];

    expect(
      removeTag(notes, ["General", "React"], tagColors, "React", laterTimestamp),
    ).toEqual({
      tags: ["General"],
      tagColors: { General: "blue" },
      notes: [
        note({ tags: ["General"], updatedAt: laterTimestamp }),
        note({ id: "2", tags: [], updatedAt: laterTimestamp }),
        note({ id: "3", tags: ["Ideas"] }),
      ],
    });
  });
});
