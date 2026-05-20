// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { Input } from "@/components/ui/input";
import { filterNotes } from "@/lib/filter-notes";
import type { Note } from "@/types";

const seedNotes: Note[] = [
  {
    id: "1",
    title: "React Release Checklist",
    content: "Query match for hooks and search behavior.",
    tags: ["Dev", "React"],
    archived: false,
    createdAt: "2025-01-01T10:00:00.000Z",
    updatedAt: "2025-01-01T10:00:00.000Z",
  },
  {
    id: "2",
    title: "Dev Pairing Notes",
    content: "Architecture review and follow up.",
    tags: ["Dev"],
    archived: false,
    createdAt: "2025-01-02T10:00:00.000Z",
    updatedAt: "2025-01-02T10:00:00.000Z",
  },
  {
    id: "3",
    title: "Personal Travel Plan",
    content: "React appears here but this note is not tagged Dev.",
    tags: ["Personal"],
    archived: false,
    createdAt: "2025-01-03T10:00:00.000Z",
    updatedAt: "2025-01-03T10:00:00.000Z",
  },
  {
    id: "4",
    title: "Archived React Migration",
    content: "Legacy migration details.",
    tags: ["Dev"],
    archived: true,
    createdAt: "2025-01-04T10:00:00.000Z",
    updatedAt: "2025-01-04T10:00:00.000Z",
  },
  {
    id: "5",
    title: "Archived Ideas Backlog",
    content: "Old product ideas.",
    tags: ["Ideas"],
    archived: true,
    createdAt: "2025-01-05T10:00:00.000Z",
    updatedAt: "2025-01-05T10:00:00.000Z",
  },
];

function seedLocalStorage(notes = seedNotes) {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
  localStorage.setItem(
    "inky-tags",
    JSON.stringify(["Dev", "Ideas", "Personal", "React"]),
  );
  localStorage.setItem(
    "inky-tag-colors",
    JSON.stringify({
      Dev: "blue",
      Ideas: "amber",
      Personal: "green",
      React: "purple",
    }),
  );
}

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: vi.fn(() => {
      store = {};
    }),
    getItem: vi.fn((key: string) => store[key] ?? null),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
  };
}

function renderApp() {
  seedLocalStorage();
  return render(<App />);
}

function getDesktopSearchInput() {
  return screen.getByTestId("desktop-search-input") as HTMLInputElement;
}

function desktopNoteTitles() {
  const noteLists = screen.getAllByRole("list", { name: "Notes list" });
  const desktopList = noteLists[noteLists.length - 1];

  return within(desktopList)
    .queryAllByRole("listitem")
    .map((item) => within(item).getByRole("heading", { level: 3 }).textContent);
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
  return screen.getByTestId("mobile-search-input") as HTMLInputElement;
}

beforeEach(() => {
  const storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("search clear behavior", () => {
  //harness:criterion=c-input-forwards-ref
  it("forwards Input refs to the underlying input element", () => {
    const ref = React.createRef<HTMLInputElement>();

    render(<Input ref={ref} aria-label="Forwarded ref input" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    ref.current?.focus();
    expect(document.activeElement).toBe(ref.current);
  });

  //harness:criterion=c-clear-button-hidden-when-query-empty,c-empty-query-behavior-unchanged
  it("hides clear buttons for an empty query and leaves focus and notes unchanged when clear is attempted", async () => {
    const user = userEvent.setup();
    renderApp();
    await openMobileSearch(user);

    expect(screen.queryByTestId("clear-search-button-mobile")).toBeNull();
    expect(screen.queryByTestId("clear-search-button-desktop")).toBeNull();

    const noteLists = screen.getAllByRole("list", { name: "Notes list" });
    const desktopList = noteLists[noteLists.length - 1];
    const focusedNote = within(desktopList).getAllByRole("listitem")[0];
    focusedNote.focus();
    const activeBefore = document.activeElement;
    const titlesBefore = desktopNoteTitles();

    let thrown: unknown;
    try {
      const hiddenClearButton = screen.queryByTestId(
        "clear-search-button-desktop",
      );
      if (hiddenClearButton) {
        await user.click(hiddenClearButton);
      }
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeUndefined();
    expect(document.activeElement).toBe(activeBefore);
    expect(desktopNoteTitles()).toEqual(titlesBefore);
  });

  //harness:criterion=c-clear-button-visible-when-query-nonempty
  it("shows both clear buttons when the shared search query is nonempty", async () => {
    const user = userEvent.setup();
    renderApp();

    const mobileSearchInput = await openMobileSearch(user);
    await user.type(mobileSearchInput, "r");

    expect(screen.getByTestId("clear-search-button-mobile")).toBeVisible();
    expect(screen.getByTestId("clear-search-button-desktop")).toBeVisible();
  });

  //harness:criterion=c-app-holds-mobile-search-ref,c-click-clear-sets-query-empty-mobile,c-click-clear-restores-focus-mobile
  it("clears the mobile search input and restores focus to it", async () => {
    const user = userEvent.setup();
    renderApp();

    const mobileSearchInput = await openMobileSearch(user);
    const desktopSearchInput = getDesktopSearchInput();
    await user.type(mobileSearchInput, "react");
    await user.click(screen.getByTestId("clear-search-button-mobile"));

    expect(mobileSearchInput).toBeInstanceOf(HTMLInputElement);
    expect(mobileSearchInput).toHaveValue("");
    expect(desktopSearchInput).toHaveValue("");
    expect(document.activeElement).toBe(mobileSearchInput);
  });

  //harness:criterion=c-app-holds-desktop-search-ref,c-click-clear-sets-query-empty-desktop,c-click-clear-restores-focus-desktop
  it("clears the desktop search input and restores focus to it", async () => {
    const user = userEvent.setup();
    renderApp();

    const desktopSearchInput = getDesktopSearchInput();
    await user.type(desktopSearchInput, "react");
    await user.click(screen.getByTestId("clear-search-button-desktop"));

    expect(desktopSearchInput).toBeInstanceOf(HTMLInputElement);
    expect(desktopSearchInput).toHaveValue("");
    expect(document.activeElement).toBe(desktopSearchInput);
  });

  //harness:criterion=c-tag-filter-preserved-after-clear,c-note-list-reflects-remaining-filters-after-clear
  it("preserves the selected tag and renders notes for that tag after clearing", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /^Dev$/ }));
    const desktopSearchInput = getDesktopSearchInput();
    await user.type(desktopSearchInput, "react");
    await user.click(screen.getByTestId("clear-search-button-desktop"));

    const expectedTitles = filterNotes(seedNotes, {
      activeView: "all",
      selectedTag: "Dev",
      searchQuery: "",
    }).map((note) => note.title);
    expect(desktopNoteTitles()).toEqual(expectedTitles);
    expect(desktopNoteTitles()).not.toContain("Personal Travel Plan");
  });

  //harness:criterion=c-archived-filter-preserved-after-clear
  it("preserves the archived view after clearing search", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /^Archived Notes$/ }));
    const desktopSearchInput = getDesktopSearchInput();
    await user.type(desktopSearchInput, "react");
    await user.click(screen.getByTestId("clear-search-button-desktop"));

    const expectedTitles = filterNotes(seedNotes, {
      activeView: "archived",
      selectedTag: null,
      searchQuery: "",
    }).map((note) => note.title);
    expect(desktopNoteTitles()).toEqual(expectedTitles);
  });

  //harness:criterion=c-filter-notes-logic-unchanged
  it("keeps filterNotes output stable for representative combinations", () => {
    expect(
      filterNotes(seedNotes, {
        activeView: "all",
        selectedTag: null,
        searchQuery: "react",
      }).map((note) => note.id),
    ).toEqual(["1", "3"]);
    expect(
      filterNotes(seedNotes, {
        activeView: "all",
        selectedTag: "Dev",
        searchQuery: "",
      }).map((note) => note.id),
    ).toEqual(["1", "2"]);
    expect(
      filterNotes(seedNotes, {
        activeView: "archived",
        selectedTag: null,
        searchQuery: "",
      }).map((note) => note.id),
    ).toEqual(["4", "5"]);
  });

  //harness:criterion=c-dev-dependencies-added
  it("has the jsdom DOM test dependencies available to Vitest", () => {
    expect(document).toBeInstanceOf(Document);

    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { devDependencies?: Record<string, string> };

    expect(packageJson.devDependencies).toEqual(
      expect.objectContaining({
        "@testing-library/jest-dom": expect.any(String),
        "@testing-library/react": expect.any(String),
        "@testing-library/user-event": expect.any(String),
        jsdom: expect.any(String),
      }),
    );

    expect(readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8"))
      .toMatch(/environment:\s*["']jsdom["']/);
  });
});
