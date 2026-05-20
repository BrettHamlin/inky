import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichTextEditor } from "@/components/RichTextEditor";
import { tagColorStyle } from "@/lib/tag-colors";
import type { ColorTheme, Note, NoteFormData } from "@/types";
import { Archive, Clock3, Tag, Trash2, X, ArrowLeft, Pin } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface NoteEditorProps {
  note: Note | null;
  onSave: (data: NoteFormData) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onTogglePin: (id: string) => void;
  onCancel: () => void;
  availableTags: string[];
  tagColors: Record<string, ColorTheme>;
  onBack?: () => void;
}

interface FormErrors {
  title?: string;
}

export function NoteEditor({
  note,
  onSave,
  onDelete,
  onArchive,
  onTogglePin,
  onCancel,
  availableTags,
  tagColors,
  onBack,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!note && titleRef.current) {
      titleRef.current.focus();
    }
  }, [note]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!title.trim()) {
      newErrors.title = "A note cannot be added without a title.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ title: title.trim(), content, tags });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showTagMenu) {
        setShowTagMenu(false);
        return;
      }
      onCancel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const selectableTags = availableTags.filter((tag) => !tags.includes(tag));
  const pinActionLabel = note?.pinned ? "Unpin Note" : "Pin Note";

  return (
    <div
      className="flex h-full flex-1 flex-col bg-background xl:flex-row"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2 md:px-5 md:py-3 xl:hidden">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              className="xl:hidden shrink-0 -ml-1"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <h2 className="text-sm font-semibold text-foreground truncate">
            {note ? "Edit Note" : "New Note"}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {note && (
            <>
              <Button
                variant={note.pinned ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => onTogglePin(note.id)}
                title={pinActionLabel}
                aria-label={pinActionLabel}
              >
                <Pin
                  className={`size-4 ${note.pinned ? "fill-current text-primary" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onArchive(note.id)}
                title={note.archived ? "Unarchive" : "Archive"}
                aria-label={note.archived ? "Unarchive note" : "Archive note"}
              >
                <Archive className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete"
                aria-label="Delete note"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-5 xl:px-6 xl:py-6">
        <div className="flex max-w-3xl flex-col gap-3 md:gap-4">
          <div>
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) {
                  setErrors({});
                }
              }}
              placeholder="Title"
              className={`h-11 rounded-md border-border !bg-transparent px-3 text-sm font-normal shadow-none hover:!bg-transparent focus-visible:!bg-transparent focus-visible:ring-0 ${errors.title ? "border-destructive" : ""}`}
              aria-label="Title"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <p
                id="title-error"
                className="text-xs text-destructive mt-1"
                role="alert"
              >
                {errors.title}
              </p>
            )}
          </div>

          <div className="grid max-w-sm grid-cols-[96px_1fr] gap-x-7 gap-y-4 py-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="size-4" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="h-5 gap-1 rounded px-1.5 py-0 text-sm font-normal"
                  style={tagColorStyle(tagColors[tag])}
                >
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 opacity-80 hover:bg-muted-foreground/20 hover:opacity-100"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
              <Popover open={showTagMenu} onOpenChange={setShowTagMenu}>
                <PopoverTrigger
                  render={
                    <Button variant="outline" size="xs" aria-label="Add tag" />
                  }
                >
                  + Add Tag
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={6}
                  className="w-48 rounded-lg p-1.5"
                  aria-label="Available tags"
                >
                  {selectableTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">
                      All tags added
                    </p>
                  ) : (
                    selectableTags.map((tag) => (
                      <Button
                        key={tag}
                        variant="ghost"
                        size="xs"
                        className="w-full justify-start text-xs hover:!bg-primary/15 hover:!text-primary"
                        onClick={() => {
                          toggleTag(tag);
                          setShowTagMenu(false);
                        }}
                      >
                        {tag}
                      </Button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {note && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="size-4" />
                  <span>Last edited</span>
                </div>
                <p className="text-foreground/85">
                  {format(new Date(note.updatedAt), "dd MMM yyyy")}
                </p>
              </>
            )}
          </div>

          <div className="border-t border-border pt-4 xl:mt-1">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing..."
            aria-label="Note content"
          />
          </div>
        </div>
      </div>

      <div className="mx-3 flex items-center gap-4 border-t border-border px-0 py-4 md:mx-5 xl:mx-6">
        <Button className="h-10 px-4" onClick={handleSave}>
          Save Note
        </Button>
        <Button variant="secondary" className="h-10 px-4" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      </div>

      <aside className="hidden w-[260px] shrink-0 border-l border-border px-4 py-5 xl:block">
        {note && (
          <div className="flex flex-col gap-3">
            <Button
              variant={note.pinned ? "secondary" : "outline"}
              className="h-11 justify-start gap-3 rounded-md px-4 text-base font-normal"
              onClick={() => onTogglePin(note.id)}
              aria-label={pinActionLabel}
            >
              <Pin
                className={`size-4 ${note.pinned ? "fill-current text-primary" : ""}`}
              />
              {pinActionLabel}
            </Button>
            <Button
              variant="outline"
              className="h-11 justify-start gap-3 rounded-md px-4 text-base font-normal"
              onClick={() => onArchive(note.id)}
            >
              <Archive className="size-4" />
              {note.archived ? "Unarchive Note" : "Archive Note"}
            </Button>
            <Button
              variant="destructive"
              className="h-11 justify-start gap-3 rounded-md px-4 text-base font-normal"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="size-4" />
              Delete Note
            </Button>
          </div>
        )}
      </aside>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (note) onDelete(note.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
