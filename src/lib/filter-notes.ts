import type { ActiveView, Note } from "../types.ts";

interface FilterNotesOptions {
  activeView: ActiveView;
  selectedTag: string | null;
  searchQuery: string;
}

export function searchableText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterNotes(
  notes: Note[],
  { activeView, selectedTag, searchQuery }: FilterNotesOptions,
) {
  let result = notes;

  if (activeView === "archived") {
    result = result.filter((note) => note.archived);
  } else {
    result = result.filter((note) => !note.archived);
  }

  if (selectedTag) {
    result = result.filter((note) => note.tags.includes(selectedTag));
  }

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        searchableText(note.content).toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  return [
    ...result.filter((note) => note.pinned),
    ...result.filter((note) => !note.pinned),
  ];
}
