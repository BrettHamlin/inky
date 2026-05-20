import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_TAGS,
  TAG_COLOR_OPTIONS,
  type ColorTheme,
  type Note,
  type NoteFormData,
  type NoteUpdateData,
} from "@/types";
import {
  addTag,
  createNoteRecord,
  deleteNoteById,
  removeTag,
  toggleArchiveById,
  togglePinById,
  updateNoteById,
} from "@/lib/note-state";

export function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem("inky-notes");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((note) => ({
        ...note,
        pinned: note.pinned ?? false,
      }));
    }
  } catch {
    return [];
  }
  return [];
}

function saveNotes(notes: Note[]) {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
}

function loadTags(): string[] {
  try {
    const stored = localStorage.getItem("inky-tags");
    if (stored) {
      return [...JSON.parse(stored)].sort((a, b) => a.localeCompare(b));
    }
  } catch {
    return [...DEFAULT_TAGS].sort((a, b) => a.localeCompare(b));
  }
  return [...DEFAULT_TAGS].sort((a, b) => a.localeCompare(b));
}

function saveTags(tags: string[]) {
  localStorage.setItem("inky-tags", JSON.stringify(tags));
}

function defaultTagColors() {
  return DEFAULT_TAGS.reduce<Record<string, ColorTheme>>((acc, tag, index) => {
    acc[tag] = TAG_COLOR_OPTIONS[index % TAG_COLOR_OPTIONS.length];
    return acc;
  }, {});
}

function loadTagColors(): Record<string, ColorTheme> {
  try {
    const stored = localStorage.getItem("inky-tag-colors");
    if (stored) return { ...defaultTagColors(), ...JSON.parse(stored) };
  } catch {
    return defaultTagColors();
  }
  return defaultTagColors();
}

function saveTagColors(tagColors: Record<string, ColorTheme>) {
  localStorage.setItem("inky-tag-colors", JSON.stringify(tagColors));
}

export interface NotesContextValue {
  notes: Note[];
  tags: string[];
  tagColors: Record<string, ColorTheme>;
  createNote: (data: NoteFormData) => Note;
  updateNote: (id: string, data: NoteUpdateData) => void;
  deleteNote: (id: string) => void;
  toggleArchive: (id: string) => void;
  togglePin: (id: string) => void;
  createTag: (tag: string, color?: ColorTheme) => boolean;
  deleteTag: (tag: string) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

let idCounter = Date.now();

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [tags, setTags] = useState<string[]>(loadTags);
  const [tagColors, setTagColors] =
    useState<Record<string, ColorTheme>>(loadTagColors);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    saveTags(tags);
  }, [tags]);

  useEffect(() => {
    saveTagColors(tagColors);
  }, [tagColors]);

  const createNote = useCallback(
    (data: NoteFormData) => {
      const now = new Date().toISOString();
      const note = createNoteRecord(data, String(++idCounter), now);
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    [],
  );

  const updateNote = useCallback(
    (id: string, data: NoteUpdateData) => {
      setNotes((prev) =>
        updateNoteById(prev, id, data, new Date().toISOString()),
      );
    },
    [],
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => deleteNoteById(prev, id));
  }, []);

  const toggleArchive = useCallback((id: string) => {
    setNotes((prev) =>
      toggleArchiveById(prev, id, new Date().toISOString()),
    );
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) => togglePinById(prev, id, new Date().toISOString()));
  }, []);

  const createTag = useCallback(
    (tag: string, color: ColorTheme = "blue") => {
      const next = addTag(tags, tagColors, tag, color);
      if (!next) return false;

      setTags(next.tags);
      setTagColors(next.tagColors);
      return true;
    },
    [tagColors, tags],
  );

  const deleteTag = useCallback((tag: string) => {
    const timestamp = new Date().toISOString();
    const next = removeTag(notes, tags, tagColors, tag, timestamp);
    setTags(next.tags);
    setTagColors(next.tagColors);
    setNotes(next.notes);
  }, [notes, tagColors, tags]);

  const value = useMemo(
    () => ({
      notes,
      tags,
      tagColors,
      createNote,
      updateNote,
      deleteNote,
      toggleArchive,
      togglePin,
      createTag,
      deleteTag,
    }),
    [
      notes,
      tags,
      tagColors,
      createNote,
      updateNote,
      deleteNote,
      toggleArchive,
      togglePin,
      createTag,
      deleteTag,
    ],
  );

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
