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
import type { ColorTheme, Note, NoteFormData, NoteUpdateData } from "@/types";

const timestamp = "2026-05-19T10:00:00.000Z";
const laterTimestamp = "2026-05-19T11:00:00.000Z";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "1",
    title: "Original",
    content: "Body",
    tags: ["General"],
    pinned: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe("note state helpers", () => {
  it("allows notes to carry an accessible boolean pinned field", () => {
    // harness:criterion=c-note-type-has-pinned-field
    const pinnedNote: Note = note({ pinned: true });
    const unpinnedNote: Note = note({ id: "2", pinned: false });

    expect(pinnedNote.pinned).toBe(true);
    expect(unpinnedNote.pinned).toBe(false);
  });

  it("keeps note form and update data scoped to editable note fields", () => {
    // harness:criterion=c-note-form-data-unchanged
    const formData: NoteFormData = {
      title: "Editable title",
      content: "<p>Editable content</p>",
      tags: ["General"],
    };
    const updateData: NoteUpdateData = { title: "Updated title" };
    // @ts-expect-error pinned is intentionally not part of form data.
    const invalidFormData: NoteFormData = { ...formData, pinned: true };
    // @ts-expect-error pinned is intentionally not part of update data.
    const invalidUpdateData: NoteUpdateData = { pinned: true };

    expect("pinned" in formData).toBe(false);
    expect("pinned" in updateData).toBe(false);
    expect("pinned" in invalidFormData).toBe(true);
    expect("pinned" in invalidUpdateData).toBe(true);
  });

  it("creates a new active note with matching created and updated timestamps", () => {
    // harness:criterion=c-create-note-pinned-defaults-false
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
      pinned: false,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  it("pins an unpinned note by id", () => {
    // harness:criterion=c-toggle-pin-by-id-pins-unpinned-note
    const notes = [note({ pinned: false })];

    const result = togglePinById(notes, "1");

    expect(result.find((item) => item.id === "1")?.pinned).toBe(true);
  });

  it("unpins a pinned note by id", () => {
    // harness:criterion=c-toggle-pin-by-id-unpins-pinned-note
    const notes = [note({ pinned: true })];

    const result = togglePinById(notes, "1");

    expect(result.find((item) => item.id === "1")?.pinned).toBe(false);
  });

  it("returns a new array without mutating the source array or note object", () => {
    // harness:criterion=c-toggle-pin-by-id-does-not-mutate-input
    const originalNote = Object.freeze(note({ pinned: false }));
    const untouchedNote = Object.freeze(note({ id: "2", pinned: true }));
    const notes = Object.freeze([originalNote, untouchedNote]);

    const result = togglePinById(notes, "1");

    expect(result).not.toBe(notes);
    expect(originalNote.pinned).toBe(false);
    expect(result[0]).not.toBe(originalNote);
    expect(result[0].pinned).toBe(true);
    expect(untouchedNote.pinned).toBe(true);
    expect(result[1]).toBe(untouchedNote);
  });

  it("does not refresh updatedAt when toggling a pin", () => {
    // harness:criterion=c-toggle-pin-by-id-does-not-refresh-updated-at
    const notes = [
      note({ id: "1", pinned: false, updatedAt: timestamp }),
      note({ id: "2", pinned: true, updatedAt: laterTimestamp }),
    ];

    const result = togglePinById(notes, "1");

    expect(result.map((item) => item.updatedAt)).toEqual([
      timestamp,
      laterTimestamp,
    ]);
  });

  it("leaves notes unchanged when toggling an unknown id", () => {
    // harness:criterion=c-toggle-pin-by-id-ignores-unknown-id
    const notes = [
      note({ id: "1", pinned: false }),
      note({ id: "2", pinned: true }),
    ];

    const result = togglePinById(notes, "missing");

    expect(result).toEqual(notes);
    expect(result).toHaveLength(notes.length);
    expect(result.map((item) => item.pinned)).toEqual(
      notes.map((item) => item.pinned),
    );
  });

  it("does not change archive status when toggling a pin", () => {
    // harness:criterion=c-pin-does-not-affect-archive-status
    const notes = [
      note({ id: "active", pinned: false, archived: false }),
      note({ id: "archived", pinned: false, archived: true }),
    ];

    expect(togglePinById(notes, "active").find((item) => item.id === "active"))
      .toMatchObject({ pinned: true, archived: false });
    expect(
      togglePinById(notes, "archived").find((item) => item.id === "archived"),
    ).toMatchObject({ pinned: true, archived: true });
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
