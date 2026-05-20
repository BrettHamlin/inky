import { useState, useMemo, useCallback, useRef } from "react";
import { NotesProvider, useNotes } from "@/store/notes-context";
import { ThemeProvider } from "@/store/theme-context";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NoteList } from "@/components/NoteList";
import { NoteEditor } from "@/components/NoteEditor";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { filterNotes } from "@/lib/filter-notes";
import { tagColorStyle } from "@/lib/tag-colors";
import type { ActiveView, MobileSidebarMode, NoteFormData } from "@/types";
import { format } from "date-fns";
import { Search, X } from "lucide-react";

const isMobileLayout = () =>
  typeof window !== "undefined" &&
  !window.matchMedia("(min-width: 1280px)").matches;

function NotesApp() {
  const {
    notes,
    tags,
    tagColors,
    createNote,
    updateNote,
    deleteNote,
    toggleArchive,
    createTag,
    deleteTag,
  } = useNotes();

  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSidebarMode, setMobileSidebarMode] =
    useState<MobileSidebarMode>("tags");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const filteredNotes = useMemo(() => {
    return filterNotes(notes, { activeView, selectedTag, searchQuery });
  }, [notes, activeView, selectedTag, searchQuery]);

  const activeViewLabel =
    activeView === "archived" ? "Archived Notes" : "All Notes";
  const emptyNotesMessage =
    activeView === "archived"
      ? "No archived notes."
      : "No notes yet. Create your first note!";

  const notesById = useMemo(
    () => new Map(notes.map((note) => [note.id, note])),
    [notes],
  );

  const desktopSelectedNoteId = selectedNoteId ?? filteredNotes[0]?.id ?? null;

  const selectedNote = useMemo(() => {
    if (isCreating) return null;
    if (!selectedNoteId) return null;
    return notesById.get(selectedNoteId) ?? null;
  }, [notesById, selectedNoteId, isCreating]);

  const handleCreateNew = useCallback(() => {
    setSelectedNoteId(null);
    setIsCreating(true);
  }, []);

  const handleSelectNote = useCallback((id: string) => {
    setIsCreating(false);
    setSelectedNoteId(id);
  }, []);

  const handleSaveNew = useCallback(
    (data: NoteFormData) => {
      const note = createNote(data);
      setIsCreating(false);
      setSelectedNoteId(isMobileLayout() ? null : note.id);
    },
    [createNote],
  );

  const handleUpdate = useCallback(
    (data: NoteFormData) => {
      if (selectedNoteId) {
        updateNote(selectedNoteId, data);
        if (isMobileLayout()) {
          setSelectedNoteId(null);
        }
      }
    },
    [selectedNoteId, updateNote],
  );

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setSelectedNoteId(null);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote(id);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setIsCreating(false);
      }
    },
    [deleteNote, selectedNoteId],
  );

  const handleDeleteTag = useCallback(
    (tag: string) => {
      deleteTag(tag);
      if (selectedTag === tag) setSelectedTag(null);
    },
    [deleteTag, selectedTag],
  );

  const handleClearMobileSearch = useCallback(() => {
    setSearchQuery("");
    mobileSearchInputRef.current?.focus();
  }, []);

  const handleClearDesktopSearch = useCallback(() => {
    setSearchQuery("");
    desktopSearchInputRef.current?.focus();
  }, []);

  const showEditor = isCreating || selectedNoteId !== null;
  const desktopEditorNote =
    selectedNote ??
    (isCreating
      ? null
      : desktopSelectedNoteId
        ? notesById.get(desktopSelectedNoteId) ?? null
        : null);

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={{
        fontFamily: "var(--font-family, 'Inter', system-ui, sans-serif)",
      }}
    >
      <div className="hidden xl:block">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          tags={tags}
          tagColors={tagColors}
          onCreateTag={createTag}
          onDeleteTag={handleDeleteTag}
        />
      </div>

      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
        tags={tags}
        tagColors={tagColors}
        onCreateTag={createTag}
        onDeleteTag={handleDeleteTag}
        mode={mobileSidebarMode}
      />

      <div
        className={`xl:hidden flex-col flex-1 min-w-0 ${
          showEditor ? "hidden" : "flex"
        }`}
      >
        <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-border bg-background">
          <h1 className="min-w-0 flex-1 text-sm font-semibold text-foreground">
            {activeViewLabel}
          </h1>
        </div>

        {mobileSearchOpen && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={mobileSearchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="h-8 border-border !bg-transparent pl-8 text-sm shadow-none hover:!bg-transparent focus-visible:!bg-transparent focus-visible:ring-0"
                aria-label="Search mobile notes by title, tag, or content"
                data-testid="mobile-search-input"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={handleClearMobileSearch}
                  aria-label="Clear mobile search"
                  data-testid="mobile-clear-search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-12 md:pb-14">
          {filteredNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              {searchQuery
                ? "No notes match your search."
                : emptyNotesMessage}
            </p>
          ) : (
            <div role="list" aria-label="Notes list">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  role="listitem"
                  className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 border-b border-border/50 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => handleSelectNote(note.id)}
                >
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {note.title || "Untitled"}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex h-5 shrink-0 items-center rounded border px-2 py-0.5 text-[10px] font-medium"
                        style={tagColorStyle(tagColors[tag])}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {format(new Date(note.updatedAt), "dd MMM yyyy")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col min-w-0 ${
          !showEditor ? "hidden xl:flex" : "flex"
        }`}
      >
        <div className="hidden h-20 items-center gap-6 border-b border-border bg-background px-8 xl:flex">
          <div className="min-w-[220px]">
            <h1 className="text-2xl font-bold text-foreground">
              {searchQuery
                ? `Search: "${searchQuery}"`
                : activeViewLabel}
            </h1>
            {searchQuery && (
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                Searching in{" "}
                {activeViewLabel}
              </p>
            )}
          </div>
          <div className="flex-1" />
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={desktopSearchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, content, or tags..."
              className="h-11 rounded-md border-border !bg-transparent pl-10 text-sm shadow-none hover:!bg-transparent focus-visible:!bg-transparent focus-visible:ring-0"
              aria-label="Search desktop notes by title, tag, or content"
              data-testid="desktop-search-input"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={handleClearDesktopSearch}
                aria-label="Clear desktop search"
                data-testid="desktop-clear-search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden pb-12 md:pb-14 xl:pb-0">
          <div className="hidden xl:block">
            <NoteList
              notes={filteredNotes}
              selectedNoteId={desktopSelectedNoteId}
              onSelectNote={handleSelectNote}
              onCreateNew={handleCreateNew}
              searchQuery={searchQuery}
              tagColors={tagColors}
              emptyMessage={
                emptyNotesMessage
              }
            />
          </div>
          {showEditor ? (
            <NoteEditor
              key={
                isCreating
                  ? "new"
                  : `${selectedNoteId}-${selectedNote?.updatedAt ?? ""}`
              }
              note={selectedNote}
              onSave={isCreating ? handleSaveNew : handleUpdate}
              onDelete={handleDelete}
              onArchive={toggleArchive}
              onCancel={handleCancel}
              availableTags={tags}
              tagColors={tagColors}
              onBack={() => {
                setSelectedNoteId(null);
                setIsCreating(false);
              }}
            />
          ) : desktopEditorNote ? (
            <NoteEditor
              key={`${desktopSelectedNoteId}-${desktopEditorNote.updatedAt}`}
              note={desktopEditorNote}
              onSave={(data) => updateNote(desktopEditorNote.id, data)}
              onDelete={handleDelete}
              onArchive={toggleArchive}
              onCancel={() => setSelectedNoteId(null)}
              availableTags={tags}
              tagColors={tagColors}
            />
          ) : (
            <div className="hidden h-full flex-1 items-center justify-center text-muted-foreground xl:flex">
              <div className="text-center">
                <p className="text-lg font-medium">
                  Select a note or create a new one
                </p>
                <p className="text-sm mt-1">
                  Use the sidebar to browse your notes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setSelectedTag(null);
          setSelectedNoteId(null);
          setIsCreating(false);
        }}
        onOpenSearch={() => setMobileSearchOpen((open) => !open)}
        onCreateNote={handleCreateNew}
        onOpenTags={() => {
          setMobileSidebarMode("tags");
          setMobileSidebarOpen(true);
        }}
        onOpenSettings={() => {
          setMobileSidebarMode("settings");
          setMobileSidebarOpen(true);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NotesProvider>
        <NotesApp />
      </NotesProvider>
    </ThemeProvider>
  );
}

export default App;
