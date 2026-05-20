import type { Note, NoteFormData, NoteUpdateData } from "./types";

type Assert<T extends true> = T;
type IsBoolean<T> = [T] extends [boolean]
  ? [boolean] extends [T]
    ? true
    : false
  : false;

//harness:criterion=c-note-type-has-pinned-boolean
export type NotePinnedIsBoolean = Assert<IsBoolean<Note["pinned"]>>;

//harness:criterion=c-note-type-has-pinned-boolean
export const notePinnedValueType = (({} as Note).pinned satisfies boolean);

//harness:criterion=c-note-type-has-pinned-boolean
// @ts-expect-error NoteFormData must not accept pinned.
export const noteFormDataPinnedIsRejected = ({} as NoteFormData).pinned;

//harness:criterion=c-note-type-has-pinned-boolean
// @ts-expect-error NoteUpdateData must not accept pinned.
export const noteUpdateDataPinnedIsRejected = ({} as NoteUpdateData).pinned;
