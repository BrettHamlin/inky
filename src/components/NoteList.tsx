import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tagColorStyle } from "@/lib/tag-colors";
import type { ColorTheme, Note } from "@/types";
import { format } from "date-fns";
import { Pin } from "lucide-react";

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onCreateNew: () => void;
  searchQuery: string;
  tagColors: Record<string, ColorTheme>;
  emptyMessage: string;
}

export function NoteList({
  notes,
  selectedNoteId,
  onSelectNote,
  onTogglePin,
  onCreateNew,
  searchQuery,
  tagColors,
  emptyMessage,
}: NoteListProps) {
  return (
    <div className="flex h-full w-[290px] shrink-0 flex-col border-r border-border bg-background">
      <div className="px-6 py-5">
        <Button className="h-9 w-full text-sm" onClick={onCreateNew}>
          + Create New Note
        </Button>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        role="list"
        aria-label="Notes list"
      >
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">
            {searchQuery ? "No notes match your search." : emptyMessage}
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              role="listitem"
              aria-current={selectedNoteId === note.id ? "true" : undefined}
              data-testid="note-list-row"
              onClick={() => onSelectNote(note.id)}
              className={`mx-6 flex w-[calc(100%-3rem)] cursor-pointer items-stretch border-b border-border transition-colors ${
                selectedNoteId === note.id
                  ? "rounded bg-primary/10"
                  : "hover:bg-muted/50"
              }`}
            >
              <button
                className="min-w-0 flex-1 px-2 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNote(note.id);
                }}
                aria-label={`Select ${note.title || "Untitled"}${note.pinned ? ", pinned" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  {note.pinned && (
                    <Pin
                      className="size-3.5 shrink-0 fill-current text-primary"
                      data-testid="pin-indicator"
                      aria-label="Pinned"
                    />
                  )}
                  <h3 className="min-w-0 truncate text-base font-bold leading-5 text-foreground">
                    {note.title || "Untitled"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {note.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="h-5 rounded px-1.5 py-0 text-xs font-normal"
                      style={tagColorStyle(tagColors[tag])}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-foreground/80">
                  {format(new Date(note.updatedAt), "dd MMM yyyy")}
                </p>
              </button>
              <div className="flex shrink-0 items-start px-1 py-2">
                <Button
                  variant={note.pinned ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePin(note.id);
                  }}
                  aria-label={note.pinned ? "Unpin note" : "Pin note"}
                  aria-labelledby={`note-list-pin-label-${note.id}`}
                  title={note.pinned ? "Unpin Note" : "Pin Note"}
                >
                  <span id={`note-list-pin-label-${note.id}`} className="sr-only">
                    {note.pinned ? "Unpin" : "Pin"} {note.title || "Untitled"}
                  </span>
                  <Pin
                    className={`size-4 ${note.pinned ? "fill-current text-primary" : ""}`}
                  />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
