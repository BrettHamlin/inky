import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Note } from "./types";

const savedNotes: Note[] = [
  {
    id: "active-work",
    title: "Active Work Note",
    content: "daily planning",
    tags: ["work"],
    archived: false,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  },
  {
    id: "archived-work",
    title: "Archived Work Note",
    content: "needle archive details",
    tags: ["work"],
    archived: true,
    createdAt: "2026-05-18T11:00:00.000Z",
    updatedAt: "2026-05-18T11:00:00.000Z",
  },
  {
    id: "archived-personal",
    title: "Archived Personal Note",
    content: "personal archive details",
    tags: ["personal"],
    archived: true,
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
  },
];

function seedSavedNotes() {
  localStorage.setItem("inky-notes", JSON.stringify(savedNotes));
  localStorage.setItem("inky-tags", JSON.stringify(["personal", "work"]));
  localStorage.setItem(
    "inky-tag-colors",
    JSON.stringify({ personal: "rose", work: "blue" }),
  );
}

function expectSavedFiltersPreserved() {
  expect(screen.getAllByText("Archived Work Note").length).toBeGreaterThan(0);
  expect(screen.queryAllByText("Active Work Note")).toHaveLength(0);
  expect(screen.queryAllByText("Archived Personal Note")).toHaveLength(0);
}

async function selectDesktopWorkTagInArchive(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole("navigation", { name: "Main navigation" }))
      .getByRole("button", { name: /archived notes/i }),
  );
  await user.click(screen.getAllByRole("button", { name: /work/i })[0]);
  expectSavedFiltersPreserved();
}

async function selectMobileWorkTagInArchive(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Archived" })[0]);
  await user.click(screen.getAllByRole("button", { name: "Tags" })[0]);
  await user.click(screen.getAllByRole("button", { name: /^work$/i }).at(-1)!);
  expectSavedFiltersPreserved();
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
  return screen.getByTestId("mobile-search-input") as HTMLInputElement;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("NotesApp search clear buttons", () => {
  it("renders App tests in jsdom with seeded storage and matchMedia available", () => {
    // harness:criterion=c-jsdom-env-configured,c-localstorage-seeded-in-setup,c-matchmedia-mocked-in-setup,c-app-test-file-exists
    expect(document.createElement("div")).toBeInstanceOf(HTMLDivElement);
    expect(localStorage.getItem("inky-notes")).toBe("[]");
    expect(localStorage.getItem("inky-tags")).toBe("[]");
    expect(localStorage.getItem("inky-tag-colors")).toBe("{}");
    expect(window.matchMedia("(min-width: 1280px)").matches).toBe(false);

    render(<App />);

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
  });

  it("has the Testing Library packages required for component tests", () => {
    // harness:criterion=c-testing-library-deps-added
    expect(render).toBeTypeOf("function");
    expect(userEvent.setup).toBeTypeOf("function");
    expect(window.navigator.userAgent).toContain("jsdom");
  });

  it("does not render the desktop clear button while the desktop query is empty", () => {
    // harness:criterion=c-desktop-clear-hidden-when-empty
    render(<App />);

    expect(screen.queryByTestId("desktop-clear-button")).toBeNull();
  });

  it("renders the desktop clear button when the desktop query is non-empty", async () => {
    // harness:criterion=c-desktop-clear-visible-when-nonempty
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByTestId("desktop-search-input"), "hello");

    expect(screen.getByTestId("desktop-clear-button")).not.toBeNull();
    expect(screen.getByTestId("desktop-clear-button").hasAttribute("hidden"))
      .toBe(false);
  });

  it("clears the desktop query, hides the clear button, and restores desktop input focus", async () => {
    // harness:criterion=c-desktop-clear-resets-query,c-desktop-clear-hides-after-click,c-desktop-clear-restores-focus
    const user = userEvent.setup();
    render(<App />);
    const desktopInput = screen.getByTestId(
      "desktop-search-input",
    ) as HTMLInputElement;

    await user.type(desktopInput, "hello");
    await user.click(screen.getByTestId("desktop-clear-button"));

    expect(desktopInput.value).toBe("");
    expect(screen.queryByTestId("desktop-clear-button")).toBeNull();
    expect(document.activeElement).toBe(desktopInput);
  });

  it("preserves the selected tag and archive view when the desktop query is cleared", async () => {
    // harness:criterion=c-desktop-clear-preserves-tag,c-desktop-clear-preserves-active-view,c-clear-does-not-call-tag-reset
    const user = userEvent.setup();
    seedSavedNotes();
    render(<App />);
    await selectDesktopWorkTagInArchive(user);

    await user.type(screen.getByTestId("desktop-search-input"), "needle");
    expect(screen.getAllByText("Archived Work Note").length).toBeGreaterThan(0);
    await user.click(screen.getByTestId("desktop-clear-button"));

    expectSavedFiltersPreserved();
  });

  it("does not render the mobile clear button while the mobile query is empty", async () => {
    // harness:criterion=c-mobile-clear-hidden-when-empty
    const user = userEvent.setup();
    render(<App />);

    await openMobileSearch(user);

    expect(screen.queryByTestId("mobile-clear-button")).toBeNull();
  });

  it("renders the mobile clear button when the mobile query is non-empty", async () => {
    // harness:criterion=c-mobile-clear-visible-when-nonempty
    const user = userEvent.setup();
    render(<App />);

    const mobileInput = await openMobileSearch(user);
    await user.type(mobileInput, "hello");

    expect(screen.getByTestId("mobile-clear-button")).not.toBeNull();
    expect(screen.getByTestId("mobile-clear-button").hasAttribute("hidden"))
      .toBe(false);
  });

  it("clears the mobile query, hides the clear button, and restores mobile input focus", async () => {
    // harness:criterion=c-mobile-clear-resets-query,c-mobile-clear-hides-after-click,c-mobile-clear-restores-focus
    const user = userEvent.setup();
    render(<App />);
    const mobileInput = await openMobileSearch(user);

    await user.type(mobileInput, "hello");
    await user.click(screen.getByTestId("mobile-clear-button"));

    expect(mobileInput.value).toBe("");
    expect(screen.queryByTestId("mobile-clear-button")).toBeNull();
    expect(document.activeElement).toBe(mobileInput);
  });

  it("preserves the selected tag and archive view when the mobile query is cleared", async () => {
    // harness:criterion=c-mobile-clear-preserves-tag,c-mobile-clear-preserves-active-view,c-clear-does-not-call-tag-reset
    const user = userEvent.setup();
    seedSavedNotes();
    render(<App />);
    await selectMobileWorkTagInArchive(user);

    const mobileInput = await openMobileSearch(user);
    await user.type(mobileInput, "needle");
    expect(screen.getAllByText("Archived Work Note").length).toBeGreaterThan(0);
    await user.click(screen.getByTestId("mobile-clear-button"));

    expectSavedFiltersPreserved();
  });
});
