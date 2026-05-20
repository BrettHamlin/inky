import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tagColorStyle } from "@/lib/tag-colors";
import type { ColorTheme, Note } from "@/types";
import { format } from "date-fns";
import { Pin, PinOff } from "lucide-react";

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  togglePin: (id: string) => void;
  onCreateNew: () => void;
  searchQuery: string;
  tagColors: Record<string, ColorTheme>;
  emptyMessage: string;
}

export function NoteList({
  notes,
  selectedNoteId,
  onSelectNote,
  togglePin,
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
          notes.map((note) => {
            const noteTitle = note.title || "Untitled";
            const pinActionLabel = note.pinned
              ? `Unpin note: ${noteTitle}`
              : `Pin note: ${noteTitle}`;

            return (
              <div
                key={note.id}
                role="listitem"
                data-testid="note-list-item"
                data-pinned={note.pinned ? "true" : "false"}
                aria-current={selectedNoteId === note.id ? "true" : undefined}
                className={`mx-6 flex w-[calc(100%-3rem)] items-start gap-2 border-b border-border px-2 py-3 transition-colors ${
                  selectedNoteId === note.id
                    ? "rounded bg-primary/10"
                    : "hover:bg-muted/50"
                }`}
              >
                <button
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => onSelectNote(note.id)}
                >
                  <h3 className="text-base font-bold leading-5 text-foreground">
                    {noteTitle}
                  </h3>
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mt-0.5"
                  onClick={() => togglePin(note.id)}
                  aria-label={pinActionLabel}
                  title={note.pinned ? "Unpin note" : "Pin note"}
                >
                  {note.pinned ? (
                    <PinOff className="size-4" data-testid="pinoff-icon" />
                  ) : (
                    <Pin className="size-4" data-testid="pin-icon" />
                  )}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
