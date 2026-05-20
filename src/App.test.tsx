import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import App from "./App";
import type { ColorTheme, Note } from "./types";

const seedNotes: Note[] = [
  {
    id: "1",
    title: "React Roadmap",
    content: "Hooks and component testing plans.",
    tags: ["Dev", "React"],
    archived: false,
    createdAt: "2025-01-01T10:00:00.000Z",
    updatedAt: "2025-01-01T10:00:00.000Z",
  },
  {
    id: "2",
    title: "TypeScript Notes",
    content: "Generics and build configuration.",
    tags: ["Dev"],
    archived: false,
    createdAt: "2025-01-02T10:00:00.000Z",
    updatedAt: "2025-01-02T10:00:00.000Z",
  },
  {
    id: "3",
    title: "Travel Ideas",
    content: "Book trains and hotels.",
    tags: ["Personal"],
    archived: false,
    createdAt: "2025-01-03T10:00:00.000Z",
    updatedAt: "2025-01-03T10:00:00.000Z",
  },
  {
    id: "4",
    title: "Archived React Migration",
    content: "Legacy budget and migration plan.",
    tags: ["Dev"],
    archived: true,
    createdAt: "2025-01-04T10:00:00.000Z",
    updatedAt: "2025-01-04T10:00:00.000Z",
  },
  {
    id: "5",
    title: "Archived API Notes",
    content: "Old endpoints and service notes.",
    tags: ["Dev"],
    archived: true,
    createdAt: "2025-01-05T10:00:00.000Z",
    updatedAt: "2025-01-05T10:00:00.000Z",
  },
  {
    id: "6",
    title: "Archived Recipe",
    content: "Sauce experiments.",
    tags: ["Personal"],
    archived: true,
    createdAt: "2025-01-06T10:00:00.000Z",
    updatedAt: "2025-01-06T10:00:00.000Z",
  },
];

const tagColors: Record<string, ColorTheme> = {
  Dev: "blue",
  React: "green",
  Personal: "rose",
};

function renderSeededApp() {
  localStorage.setItem("inky-notes", JSON.stringify(seedNotes));
  localStorage.setItem("inky-tags", JSON.stringify(["Dev", "Personal", "React"]));
  localStorage.setItem("inky-tag-colors", JSON.stringify(tagColors));

  return {
    user: userEvent.setup(),
    ...render(<App />),
  };
}

function desktopSearchInput() {
  return screen.getByPlaceholderText(
    "Search by title, content, or tags...",
  ) as HTMLInputElement;
}

function mobileSearchInput() {
  return screen.getByPlaceholderText("Search notes...") as HTMLInputElement;
}

function notesLists() {
  return screen.getAllByRole("list", { name: "Notes list" });
}

function mobileNotesList() {
  return notesLists()[0];
}

function desktopNotesList() {
  return notesLists()[1];
}

function noteCount(list: HTMLElement) {
  return within(list).queryAllByRole("listitem").length;
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
}

async function selectDesktopTag(
  user: ReturnType<typeof userEvent.setup>,
  tag: string,
) {
  await user.click(screen.getByRole("button", { name: tag }));
}

async function openArchivedView(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Archived Notes" }));
}

describe("App search clear controls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("does not render either clear button while the query is empty", () => {
    //harness:criterion=c-clear-btn-hidden-when-query-empty,c-mobile-clear-btn-hidden-when-query-empty
    renderSeededApp();

    expect(
      screen.queryByRole("button", { name: "Clear desktop search" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Clear mobile search" }),
    ).toBeNull();
  });

  it("renders the desktop clear button with the required label when the desktop query is non-empty", async () => {
    //harness:criterion=c-clear-btn-visible-when-query-nonempty,c-desktop-clear-btn-aria-label
    const { user } = renderSeededApp();

    await user.type(desktopSearchInput(), "react");

    const clearButton = screen.getByRole("button", {
      name: "Clear desktop search",
    });
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toHaveAttribute("aria-label", "Clear desktop search");
  });

  it("renders the mobile clear button with the required label when the mobile query is non-empty", async () => {
    //harness:criterion=c-mobile-clear-btn-visible-when-query-nonempty,c-mobile-clear-btn-aria-label
    const { user } = renderSeededApp();

    await openMobileSearch(user);
    await user.type(mobileSearchInput(), "react");

    const clearButton = screen.getByRole("button", {
      name: "Clear mobile search",
    });
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toHaveAttribute("aria-label", "Clear mobile search");
  });

  it("clears the desktop query, restores all active notes, removes the clear button, and focuses the desktop input", async () => {
    //harness:criterion=c-desktop-clear-resets-search-query,c-desktop-clear-restores-focus,c-input-ref-forwarded-desktop,c-clear-btn-not-rendered-after-clear-click
    const { user } = renderSeededApp();

    await user.type(desktopSearchInput(), "roadmap");
    expect(noteCount(desktopNotesList())).toBe(1);

    await user.click(
      screen.getByRole("button", { name: "Clear desktop search" }),
    );

    expect(desktopSearchInput()).toHaveValue("");
    expect(noteCount(desktopNotesList())).toBe(3);
    expect(
      screen.queryByRole("button", { name: "Clear desktop search" }),
    ).toBeNull();
    expect(desktopSearchInput()).toHaveFocus();
  });

  it("clears the mobile query, restores all active notes, removes the clear button, and focuses the mobile input", async () => {
    //harness:criterion=c-mobile-clear-resets-search-query,c-mobile-clear-restores-focus,c-input-ref-forwarded-mobile,c-clear-btn-not-rendered-after-clear-click
    const { user } = renderSeededApp();

    await openMobileSearch(user);
    await user.type(mobileSearchInput(), "roadmap");
    expect(noteCount(mobileNotesList())).toBe(1);

    await user.click(screen.getByRole("button", { name: "Clear mobile search" }));

    expect(mobileSearchInput()).toHaveValue("");
    expect(noteCount(mobileNotesList())).toBe(3);
    expect(
      screen.queryByRole("button", { name: "Clear mobile search" }),
    ).toBeNull();
    expect(mobileSearchInput()).toHaveFocus();
  });

  it("keeps the selected tag filter after the desktop clear button is clicked", async () => {
    //harness:criterion=c-desktop-clear-preserves-selected-tag
    const { user } = renderSeededApp();

    await selectDesktopTag(user, "Dev");
    await user.type(desktopSearchInput(), "roadmap");
    expect(noteCount(desktopNotesList())).toBe(1);

    await user.click(
      screen.getByRole("button", { name: "Clear desktop search" }),
    );

    expect(noteCount(desktopNotesList())).toBe(2);
    expect(within(desktopNotesList()).queryByText("Travel Ideas")).toBeNull();
  });

  it("keeps the selected tag filter after the mobile clear button is clicked", async () => {
    //harness:criterion=c-mobile-clear-preserves-selected-tag
    const { user } = renderSeededApp();

    await selectDesktopTag(user, "Dev");
    await openMobileSearch(user);
    await user.type(mobileSearchInput(), "roadmap");
    expect(noteCount(mobileNotesList())).toBe(1);

    await user.click(screen.getByRole("button", { name: "Clear mobile search" }));

    expect(noteCount(mobileNotesList())).toBe(2);
    expect(within(mobileNotesList()).queryByText("Travel Ideas")).toBeNull();
  });

  it("keeps the archived view after the desktop clear button is clicked", async () => {
    //harness:criterion=c-desktop-clear-preserves-active-view
    const { user } = renderSeededApp();

    await openArchivedView(user);
    await user.type(desktopSearchInput(), "recipe");
    expect(noteCount(desktopNotesList())).toBe(1);

    await user.click(
      screen.getByRole("button", { name: "Clear desktop search" }),
    );

    expect(screen.getAllByText("Archived Notes").length).toBeGreaterThan(0);
    expect(noteCount(desktopNotesList())).toBe(3);
    expect(within(desktopNotesList()).queryByText("React Roadmap")).toBeNull();
  });

  it("keeps the archived view after the mobile clear button is clicked", async () => {
    //harness:criterion=c-mobile-clear-preserves-active-view
    const { user } = renderSeededApp();

    await openArchivedView(user);
    await openMobileSearch(user);
    await user.type(mobileSearchInput(), "recipe");
    expect(noteCount(mobileNotesList())).toBe(1);

    await user.click(screen.getByRole("button", { name: "Clear mobile search" }));

    expect(screen.getAllByText("Archived Notes").length).toBeGreaterThan(0);
    expect(noteCount(mobileNotesList())).toBe(3);
    expect(within(mobileNotesList()).queryByText("React Roadmap")).toBeNull();
  });

  it("does not mutate either the selected tag or archived view when desktop search is cleared", async () => {
    //harness:criterion=c-desktop-clear-does-not-mutate-tag-or-view
    const { user } = renderSeededApp();

    await openArchivedView(user);
    await selectDesktopTag(user, "Dev");
    await user.type(desktopSearchInput(), "migration");
    expect(noteCount(desktopNotesList())).toBe(1);

    await user.click(
      screen.getByRole("button", { name: "Clear desktop search" }),
    );

    expect(screen.getAllByText("Archived Notes").length).toBeGreaterThan(0);
    expect(noteCount(desktopNotesList())).toBe(2);
    expect(within(desktopNotesList()).queryByText("Archived Recipe")).toBeNull();
    expect(within(desktopNotesList()).queryByText("TypeScript Notes")).toBeNull();
  });

  it("does not mutate either the selected tag or archived view when mobile search is cleared", async () => {
    //harness:criterion=c-mobile-clear-does-not-mutate-tag-or-view
    const { user } = renderSeededApp();

    await openArchivedView(user);
    await selectDesktopTag(user, "Dev");
    await openMobileSearch(user);
    await user.type(mobileSearchInput(), "migration");
    expect(noteCount(mobileNotesList())).toBe(1);

    await user.click(screen.getByRole("button", { name: "Clear mobile search" }));

    expect(screen.getAllByText("Archived Notes").length).toBeGreaterThan(0);
    expect(noteCount(mobileNotesList())).toBe(2);
    expect(within(mobileNotesList()).queryByText("Archived Recipe")).toBeNull();
    expect(within(mobileNotesList()).queryByText("TypeScript Notes")).toBeNull();
  });

  it("runs in jsdom with jest-dom matchers available", () => {
    //harness:criterion=c-vitest-jsdom-environment-configured,c-jest-dom-matchers-available
    renderSeededApp();

    expect(window.document).toBeInstanceOf(Document);
    expect(desktopSearchInput()).toBeInTheDocument();
  });

  it("keeps the required React test dependencies in package devDependencies", () => {
    //harness:criterion=c-test-deps-installed
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { devDependencies?: Record<string, string> };

    expect(packageJson.devDependencies).toEqual(
      expect.objectContaining({
        "@testing-library/react": expect.any(String),
        "@testing-library/user-event": expect.any(String),
        "@testing-library/jest-dom": expect.any(String),
        jsdom: expect.any(String),
      }),
    );
  });

  it("excludes colocated React tests from the app TypeScript build", () => {
    //harness:criterion=c-tsconfig-excludes-test-files,c-build-passes-with-test-files-present
    const tsconfig = JSON.parse(
      readFileSync(resolve(process.cwd(), "tsconfig.app.json"), "utf8"),
    ) as { exclude?: string[] };

    expect(existsSync(resolve(process.cwd(), "src/App.test.tsx"))).toBe(true);
    expect(tsconfig.exclude).toEqual(
      expect.arrayContaining(["src/**/*.test.tsx"]),
    );
  });
});
