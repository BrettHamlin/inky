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
          notes.map((note) => {
            const noteTitle = note.title || "Untitled";
            const pinLabel = note.pinned ? "Unpin note" : "Pin note";
            const pinAccessibleLabel = `${pinLabel} ${noteTitle}`;
            const pinLabelId = `note-list-pin-label-${encodeURIComponent(note.id)}`;
            const PinIcon = note.pinned ? PinOff : Pin;

            return (
              <div
                key={note.id}
                role="listitem"
                aria-current={selectedNoteId === note.id ? "true" : undefined}
                className={`mx-6 flex w-[calc(100%-3rem)] items-stretch border-b border-border ${
                  selectedNoteId === note.id
                    ? "rounded bg-primary/10"
                    : ""
                }`}
              >
                <button
                  type="button"
                  aria-label={`Select note ${noteTitle}`}
                  className="min-w-0 flex-1 appearance-none rounded border-0 bg-transparent px-2 py-3 text-left font-inherit text-current transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => onSelectNote(note.id)}
                >
                  <span className="block text-base font-bold leading-5 text-foreground">
                    {noteTitle}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
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
                  </span>
                  <span className="mt-2 block text-xs text-foreground/80">
                    {format(new Date(note.updatedAt), "dd MMM yyyy")}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="my-3 h-11 w-11 self-center"
                  onClick={() => {
                    onTogglePin(note.id);
                  }}
                  title={pinLabel}
                  aria-label={pinLabel}
                  aria-labelledby={pinLabelId}
                >
                  <PinIcon className="size-4" />
                </Button>
                <span id={pinLabelId} className="sr-only">
                  {pinAccessibleLabel}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
