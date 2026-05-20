import { readFileSync } from "node:fs";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.tsx";
import { filterNotes } from "./filter-notes.ts";
import type { Note } from "../types.ts";

const searchLabel = "Search notes by title, tag, or content";
const mobileSearchPlaceholder = "Search notes...";
const desktopSearchPlaceholder = "Search by title, content, or tags...";

const seededNotes: Note[] = [
  {
    id: "work-active",
    title: "Work Alpha",
    content: "shared search term",
    tags: ["Work"],
    archived: false,
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-01-01T10:00:00.000Z",
  },
  {
    id: "personal-active",
    title: "Personal Beta",
    content: "shared search term",
    tags: ["Personal"],
    archived: false,
    createdAt: "2024-01-02T10:00:00.000Z",
    updatedAt: "2024-01-02T10:00:00.000Z",
  },
  {
    id: "work-archived",
    title: "Archived Gamma",
    content: "shared search term",
    tags: ["Work"],
    archived: true,
    createdAt: "2024-01-03T10:00:00.000Z",
    updatedAt: "2024-01-03T10:00:00.000Z",
  },
];

function seedLocalStorage() {
  localStorage.clear();
  localStorage.setItem("inky-notes", JSON.stringify(seededNotes));
  localStorage.setItem("inky-tags", JSON.stringify(["Personal", "Work"]));
  localStorage.setItem(
    "inky-tag-colors",
    JSON.stringify({ Personal: "rose", Work: "blue" }),
  );
}

function renderApp() {
  seedLocalStorage();
  return render(<App />);
}

function getSearchInput(placeholder: string) {
  const input = screen
    .getAllByLabelText(searchLabel)
    .find(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement &&
        element.getAttribute("placeholder") === placeholder,
    );

  if (!input) {
    throw new Error(`Unable to find search input: ${placeholder}`);
  }

  return input;
}

function getSearchContainer(input: HTMLInputElement) {
  const container = input.closest(".relative");
  if (!container) {
    throw new Error("Unable to find search input container");
  }

  return container as HTMLElement;
}

function queryClearButton(input: HTMLInputElement) {
  return within(getSearchContainer(input)).queryByRole("button", {
    name: "Clear search",
  });
}

function getClearButton(input: HTMLInputElement) {
  return within(getSearchContainer(input)).getByRole("button", {
    name: "Clear search",
  });
}

function expectRenderedAndVisible(button: HTMLElement | null) {
  expect(button).toBeInTheDocument();
  expect(button).toBeVisible();
}

function expectAbsentOrHidden(button: HTMLElement | null) {
  if (!button) {
    expect(button).toBeNull();
    return;
  }

  expect(button).not.toBeVisible();
}

async function openMobileSearch() {
  const user = userEvent.setup();
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
  return getSearchInput(mobileSearchPlaceholder);
}

function appSource() {
  return readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
}

function sourceAfterNeedle(source: string, needle: string) {
  const index = source.indexOf(needle);
  if (index === -1) {
    throw new Error(`Unable to find source needle: ${needle}`);
  }

  return source.slice(index, index + 900);
}

beforeEach(() => {
  seedLocalStorage();
});

describe("clear search control", () => {
  //harness:criterion=c-localstorage-seeded-in-tests
  it("seeds notes, tags, and tag colors before App renders", () => {
    for (const key of ["inky-notes", "inky-tags", "inky-tag-colors"]) {
      expect(() => JSON.parse(localStorage.getItem(key) ?? "")).not.toThrow();
    }

    expect(() => render(<App />)).not.toThrow();
  });

  //harness:criterion=c-clear-btn-hidden-when-empty-desktop
  it("does not render a desktop clear button for an empty search field", () => {
    renderApp();

    const input = getSearchInput(desktopSearchPlaceholder);

    expect(input).toHaveValue("");
    expectAbsentOrHidden(queryClearButton(input));
  });

  //harness:criterion=c-clear-btn-visible-when-populated-desktop,c-clear-btn-aria-label-desktop
  it("renders an accessible desktop clear button after search text is entered", async () => {
    const user = userEvent.setup();
    renderApp();

    const input = getSearchInput(desktopSearchPlaceholder);
    await user.type(input, "a");

    expectRenderedAndVisible(getClearButton(input));
  });

  //harness:criterion=c-clear-click-resets-query-desktop,c-clear-click-restores-focus-desktop,c-useref-desktop-input
  it("clears desktop search text and restores focus to the desktop input", async () => {
    const user = userEvent.setup();
    renderApp();

    const input = getSearchInput(desktopSearchPlaceholder);
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");

    await user.click(getClearButton(input));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  //harness:criterion=c-clear-btn-hidden-when-empty-mobile
  it("does not render a mobile clear button for an empty search field", async () => {
    renderApp();

    const input = await openMobileSearch();

    expect(input).toHaveValue("");
    expectAbsentOrHidden(queryClearButton(input));
  });

  //harness:criterion=c-clear-btn-visible-when-populated-mobile,c-clear-btn-aria-label-mobile
  it("renders an accessible mobile clear button after search text is entered", async () => {
    const user = userEvent.setup();
    renderApp();

    const input = await openMobileSearch();
    await user.type(input, "a");

    expectRenderedAndVisible(getClearButton(input));
  });

  //harness:criterion=c-clear-click-resets-query-mobile,c-clear-click-restores-focus-mobile,c-useref-mobile-input
  it("clears mobile search text and restores focus to the mobile input", async () => {
    const user = userEvent.setup();
    renderApp();

    const input = await openMobileSearch();
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");

    await user.click(getClearButton(input));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  //harness:criterion=c-clear-preserves-tag-filter
  it("preserves the active tag filter when clearing a search", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole("button", { name: "Work" })[0]);
    const input = getSearchInput(desktopSearchPlaceholder);
    await user.type(input, "shared");
    await user.click(getClearButton(input));

    expect(input).toHaveValue("");
    expect(screen.queryAllByText("Work Alpha").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Personal Beta")).toHaveLength(0);
    expect(screen.queryAllByText("Archived Gamma")).toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: "Work" })[0]);

    expect(screen.queryAllByText("Work Alpha").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Personal Beta").length).toBeGreaterThan(0);
  });

  //harness:criterion=c-clear-preserves-archived-filter
  it("preserves the archived view filter when clearing a search", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Archived Notes" }));
    const input = getSearchInput(desktopSearchPlaceholder);
    await user.type(input, "shared");
    await user.click(getClearButton(input));

    expect(input).toHaveValue("");
    expect(screen.queryAllByText("Archived Gamma").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Work Alpha")).toHaveLength(0);
    expect(screen.queryAllByText("Personal Beta")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "All Notes" }));

    expect(screen.queryAllByText("Work Alpha").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Personal Beta").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Archived Gamma")).toHaveLength(0);
  });

  //harness:criterion=c-clear-noop-when-empty-mobile
  it("leaves filters unchanged when mobile search is empty and no clear button is available", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole("button", { name: "Work" })[0]);
    const input = await openMobileSearch();
    const maybeClearButton = queryClearButton(input);

    expect(input).toHaveValue("");
    if (maybeClearButton) {
      expect(() => fireEvent.click(maybeClearButton)).not.toThrow();
    }

    expect(screen.queryAllByText("Work Alpha").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Personal Beta")).toHaveLength(0);
    expect(screen.queryAllByText("Archived Gamma")).toHaveLength(0);
  });

  //harness:criterion=c-clear-noop-when-empty-desktop
  it("leaves filters unchanged when desktop search is empty and no clear button is available", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Archived Notes" }));
    const input = getSearchInput(desktopSearchPlaceholder);
    const maybeClearButton = queryClearButton(input);

    expect(input).toHaveValue("");
    if (maybeClearButton) {
      expect(() => fireEvent.click(maybeClearButton)).not.toThrow();
    }

    expect(screen.queryAllByText("Archived Gamma").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Work Alpha")).toHaveLength(0);
    expect(screen.queryAllByText("Personal Beta")).toHaveLength(0);
  });
});

describe("clear search contract wiring", () => {
  //harness:criterion=c-clear-btn-uses-button-component-mobile
  it("uses the shared Button component for the mobile clear search control", () => {
    const mobileSearchBlock = sourceAfterNeedle(
      appSource(),
      `placeholder="${mobileSearchPlaceholder}"`,
    );

    expect(mobileSearchBlock).toMatch(
      /<Button[\s\S]*aria-label="Clear search"/,
    );
    expect(mobileSearchBlock).not.toMatch(
      /<button[\s\S]*aria-label="Clear search"/,
    );
  });

  //harness:criterion=c-clear-btn-uses-button-component-desktop
  it("uses the shared Button component for the desktop clear search control", () => {
    const desktopSearchBlock = sourceAfterNeedle(
      appSource(),
      `placeholder="${desktopSearchPlaceholder}"`,
    );

    expect(desktopSearchBlock).toMatch(
      /<Button[\s\S]*aria-label="Clear search"/,
    );
    expect(desktopSearchBlock).not.toMatch(
      /<button[\s\S]*aria-label="Clear search"/,
    );
  });

  //harness:criterion=c-vitest-jsdom-configured
  it("configures Vitest to run DOM tests in jsdom", () => {
    const config = readFileSync(
      new URL("../../vite.config.ts", import.meta.url),
      "utf8",
    );

    expect(config).toMatch(/environment:\s*["']jsdom["']/);
  });

  //harness:criterion=c-rtl-deps-installed
  it("lists React Testing Library and user-event as dev dependencies", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { devDependencies?: Record<string, string> };

    expect(packageJson.devDependencies?.["@testing-library/react"]).toBeTypeOf(
      "string",
    );
    expect(
      packageJson.devDependencies?.["@testing-library/user-event"],
    ).toBeTypeOf("string");
  });

  //harness:criterion=c-filter-notes-unchanged
  it("keeps blank-query filtering scoped to the current view", () => {
    expect(
      filterNotes(seededNotes, {
        activeView: "all",
        selectedTag: null,
        searchQuery: "   ",
      }).map((note) => note.id),
    ).toEqual(["work-active", "personal-active"]);

    expect(
      filterNotes(seededNotes, {
        activeView: "archived",
        selectedTag: null,
        searchQuery: "",
      }).map((note) => note.id),
    ).toEqual(["work-archived"]);
  });
});
