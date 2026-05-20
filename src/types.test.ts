import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Note } from "./types.ts";

const timestamp = "2026-05-19T10:00:00.000Z";

function runTypeScriptCheck(source: string) {
  const dir = mkdtempSync(join(process.cwd(), ".tmp-typecheck-"));
  try {
    const sourcePath = join(dir, "contract-test.tsx");
    const tsconfigPath = join(dir, "tsconfig.json");

    writeFileSync(sourcePath, source);
    writeFileSync(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: {
          target: "ES2023",
          lib: ["ES2023", "DOM"],
          module: "esnext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          verbatimModuleSyntax: true,
          jsx: "react-jsx",
          ignoreDeprecations: "6.0",
          baseUrl: process.cwd(),
          paths: {
            "@/*": ["src/*"],
          },
          noEmit: true,
        },
        files: [sourcePath],
      }),
    );

    execFileSync(join(process.cwd(), "node_modules/.bin/tsc"), [
      "--project",
      tsconfigPath,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("note type contracts", () => {
  //harness:criterion=c-note-type-has-pinned-field
  it("accepts and exposes a boolean pinned field on Note", () => {
    const typedNote: Note = {
      id: "1",
      title: "Typed",
      content: "",
      tags: [],
      archived: false,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    expect(typedNote.pinned).toBe(false);
  });

  //harness:criterion=c-note-form-data-no-pinned-field,c-note-update-data-no-pinned-field,c-notes-context-exposes-toggle-pin,c-note-editor-props-has-on-toggle-pin
  it("keeps pin state out of save data while exposing explicit pin APIs", () => {
    expect(() =>
      runTypeScriptCheck(`
        import type { Note, NoteFormData, NoteUpdateData } from "@/types";
        import { NoteEditor } from "@/components/NoteEditor";
        import type { NotesContextValue } from "@/store/notes-context";

        const note: Note = {
          id: "note-1",
          title: "Typed",
          content: "",
          tags: [],
          archived: false,
          pinned: false,
          createdAt: "${timestamp}",
          updatedAt: "${timestamp}",
        };

        // @ts-expect-error pinned is controlled separately from normal note creation data.
        const formData: NoteFormData = { title: "Typed", content: "", tags: [], pinned: false };

        // @ts-expect-error pinned is controlled separately from normal note update data.
        const updateData: NoteUpdateData = { pinned: true };

        const context = {} as NotesContextValue;
        const togglePin: (id: string) => void = context.togglePin;
        togglePin("note-1");

        const editor = (
          <NoteEditor
            note={note}
            onSave={() => {}}
            onDelete={() => {}}
            onArchive={() => {}}
            onTogglePin={() => {}}
            onCancel={() => {}}
            availableTags={[]}
            tagColors={{}}
          />
        );

        void formData;
        void updateData;
        void editor;
      `),
    ).not.toThrow();
  });
});
