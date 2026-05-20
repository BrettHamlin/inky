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
  //harness:criterion=c-note-fixture-includes-pinned-false
  it("creates fixture notes with pinned defaulted to false", () => {
    expect(note().pinned).toBe(false);
  });

  //harness:criterion=c-create-note-pinned-defaults-false
  it("defaults new notes to unpinned", () => {
    expect(
      createNoteRecord(
        { title: "Test", content: "", tags: [] },
        "note-1",
        timestamp,
      ).pinned,
    ).toBe(false);
  });

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

  //harness:criterion=c-toggle-pin-by-id-pins-unpinned-note
  it("pins an unpinned note and refreshes its updated timestamp", () => {
    const notes = [note(), note({ id: "2", title: "Other" })];

    const result = togglePinById(notes, "1", "ts-123");

    expect(result.find((item) => item.id === "1")).toMatchObject({
      pinned: true,
      updatedAt: "ts-123",
    });
    expect(result.find((item) => item.id === "2")).toEqual(notes[1]);
  });

  //harness:criterion=c-toggle-pin-by-id-unpins-pinned-note
  it("unpins a pinned note and refreshes its updated timestamp", () => {
    const notes = [note({ pinned: true })];

    expect(togglePinById(notes, "1", "ts-456")[0]).toMatchObject({
      pinned: false,
      updatedAt: "ts-456",
    });
  });

  //harness:criterion=c-toggle-pin-by-id-does-not-mutate-input
  it("does not mutate the input array or note objects when toggling pinned state", () => {
    const notes = [
      note(),
      note({ id: "2", title: "Second", pinned: true }),
      note({ id: "3", title: "Third" }),
    ];
    const snapshots = structuredClone(notes);

    const result = togglePinById(notes, "2", laterTimestamp);

    expect(result).not.toBe(notes);
    expect(notes).toEqual(snapshots);
  });

  //harness:criterion=c-toggle-pin-by-id-unaffected-notes-unchanged
  it("leaves non-target notes unchanged by value when toggling pinned state", () => {
    const notes = [
      note({ id: "1", title: "First" }),
      note({ id: "2", title: "Second" }),
      note({ id: "3", title: "Third", pinned: true }),
    ];

    const result = togglePinById(notes, "2", laterTimestamp);

    expect(result[0]).toEqual(notes[0]);
    expect(result[2]).toEqual(notes[2]);
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
