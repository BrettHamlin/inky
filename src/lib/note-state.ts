import type { ColorTheme, Note, NoteFormData, NoteUpdateData } from "@/types";

export function createNoteRecord(
  data: NoteFormData,
  id: string,
  timestamp: string,
): Note {
  return {
    id,
    title: data.title,
    content: data.content,
    tags: data.tags,
    pinned: false,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateNoteById(
  notes: Note[],
  id: string,
  data: NoteUpdateData,
  timestamp: string,
) {
  return notes.map((note) =>
    note.id === id ? { ...note, ...data, updatedAt: timestamp } : note,
  );
}

export function deleteNoteById(notes: Note[], id: string) {
  return notes.filter((note) => note.id !== id);
}

export function toggleArchiveById(
  notes: Note[],
  id: string,
  timestamp: string,
) {
  return notes.map((note) =>
    note.id === id
      ? { ...note, archived: !note.archived, updatedAt: timestamp }
      : note,
  );
}

export function togglePinById(notes: Note[], id: string) {
  return notes.map((note) =>
    note.id === id ? { ...note, pinned: !note.pinned } : note,
  );
}

export function addTag(
  tags: string[],
  tagColors: Record<string, ColorTheme>,
  tag: string,
  color: ColorTheme = "blue",
) {
  const nextTag = tag.trim();
  if (!nextTag) return null;
  if (
    tags.some((existing) => existing.toLowerCase() === nextTag.toLowerCase())
  ) {
    return null;
  }

  return {
    tags: [...tags, nextTag].sort((a, b) => a.localeCompare(b)),
    tagColors: { ...tagColors, [nextTag]: color },
  };
}

export function removeTag(
  notes: Note[],
  tags: string[],
  tagColors: Record<string, ColorTheme>,
  tag: string,
  timestamp: string,
) {
  const nextTagColors = { ...tagColors };
  delete nextTagColors[tag];

  return {
    tags: tags.filter((existing) => existing !== tag),
    tagColors: nextTagColors,
    notes: notes.map((note) =>
      note.tags.includes(tag)
        ? {
            ...note,
            tags: note.tags.filter((existing) => existing !== tag),
            updatedAt: timestamp,
          }
        : note,
    ),
  };
}
