export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  archived: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActiveView = "all" | "archived";
export type MobileSidebarMode = "tags" | "settings";
export type NoteFormData = Pick<Note, "title" | "content" | "tags">;
export type NoteUpdateData = Partial<NoteFormData>;

export type ColorTheme =
  | "blue"
  | "green"
  | "purple"
  | "rose"
  | "amber"
  | "slate";
export type FontTheme = "sans" | "serif" | "mono";

export const DEFAULT_TAGS = [
  "General",
  "Personal",
  "Dev",
  "React",
  "AI",
  "Ideas",
] as const;

export type TagType = (typeof DEFAULT_TAGS)[number];

export const TAG_COLOR_VALUES: Record<ColorTheme, string> = {
  blue: "#2563eb",
  green: "#16a34a",
  purple: "#7c3aed",
  rose: "#e11d48",
  amber: "#d97706",
  slate: "#475569",
};

export const TAG_COLOR_OPTIONS = [
  "blue",
  "green",
  "purple",
  "rose",
  "amber",
  "slate",
] as const satisfies ColorTheme[];

export const COLOR_THEME_OPTIONS: {
  value: ColorTheme;
  label: string;
  color: string;
}[] = [
  { value: "blue", label: "Blue", color: TAG_COLOR_VALUES.blue },
  { value: "green", label: "Green", color: TAG_COLOR_VALUES.green },
  { value: "purple", label: "Purple", color: TAG_COLOR_VALUES.purple },
  { value: "rose", label: "Rose", color: TAG_COLOR_VALUES.rose },
  { value: "amber", label: "Amber", color: TAG_COLOR_VALUES.amber },
  { value: "slate", label: "Slate", color: TAG_COLOR_VALUES.slate },
];

export const FONT_THEME_OPTIONS: {
  value: FontTheme;
  label: string;
}[] = [
  { value: "sans", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Monospace" },
];
