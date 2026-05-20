import "@testing-library/jest-dom/vitest";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { Input } from "./components/ui/input";
import type { Note } from "./types";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const notes: Note[] = [
  {
    id: "active-dev",
    title: "React Architecture",
    content: "Searchable active development note.",
    tags: ["Dev"],
    archived: false,
    createdAt: "2024-10-29T10:00:00.000Z",
    updatedAt: "2024-10-29T10:00:00.000Z",
  },
  {
    id: "active-personal",
    title: "Grocery Plan",
    content: "Searchable personal note.",
    tags: ["Personal"],
    archived: false,
    createdAt: "2024-10-28T10:00:00.000Z",
    updatedAt: "2024-10-28T10:00:00.000Z",
  },
  {
    id: "archived-dev",
    title: "Archived Design",
    content: "Archive keyword.",
    tags: ["Dev"],
    archived: true,
    createdAt: "2024-10-27T10:00:00.000Z",
    updatedAt: "2024-10-27T10:00:00.000Z",
  },
];

function seedNotes() {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
  localStorage.setItem("inky-tags", JSON.stringify(["Dev", "Personal"]));
}

function renderApp() {
  seedNotes();
  return render(<App />);
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
  return screen.getByTestId("mobile-search-input");
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App search clear controls", () => {
  //harness:criterion=c-mobile-clear-btn-hidden-when-empty
  it("hides the mobile clear button while the mobile search query is empty", async () => {
    const user = userEvent.setup();
    renderApp();

    const mobileSearchInput = await openMobileSearch(user);

    expect(mobileSearchInput).toHaveValue("");
    expect(screen.queryByTestId("mobile-clear-search-btn")).not.toBeInTheDocument();
  });

  //harness:criterion=c-mobile-clear-btn-visible-when-nonempty
  it("shows the mobile clear button while the mobile search query is non-empty", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await openMobileSearch(user), "hello");

    expect(screen.getByTestId("mobile-clear-search-btn")).toBeVisible();
  });

  //harness:criterion=c-desktop-clear-btn-hidden-when-empty
  it("hides the desktop clear button while the desktop search query is empty", () => {
    renderApp();

    expect(screen.getByTestId("desktop-search-input")).toHaveValue("");
    expect(screen.queryByTestId("desktop-clear-search-btn")).not.toBeInTheDocument();
  });

  //harness:criterion=c-desktop-clear-btn-visible-when-nonempty
  it("shows the desktop clear button while the desktop search query is non-empty", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByTestId("desktop-search-input"), "hello");

    expect(screen.getByTestId("desktop-clear-search-btn")).toBeVisible();
  });

  //harness:criterion=c-mobile-clear-resets-search-query
  it("clears the mobile search query when the mobile clear button is clicked", async () => {
    const user = userEvent.setup();
    renderApp();
    const mobileSearchInput = await openMobileSearch(user);

    await user.type(mobileSearchInput, "hello");
    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(mobileSearchInput).toHaveValue("");
    expect(screen.queryByTestId("mobile-clear-search-btn")).not.toBeInTheDocument();
  });

  //harness:criterion=c-desktop-clear-resets-search-query
  it("clears the desktop search query when the desktop clear button is clicked", async () => {
    const user = userEvent.setup();
    renderApp();
    const desktopSearchInput = screen.getByTestId("desktop-search-input");

    await user.type(desktopSearchInput, "hello");
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(desktopSearchInput).toHaveValue("");
    expect(screen.queryByTestId("desktop-clear-search-btn")).not.toBeInTheDocument();
  });

  //harness:criterion=c-mobile-clear-preserves-selected-tag
  it("keeps the selected tag after the mobile clear button is clicked", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Dev" }));
    await user.type(await openMobileSearch(user), "React");
    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(screen.getAllByText("React Architecture").length).toBeGreaterThan(0);
    expect(screen.queryByText("Grocery Plan")).not.toBeInTheDocument();
  });

  //harness:criterion=c-desktop-clear-preserves-selected-tag
  it("keeps the selected tag after the desktop clear button is clicked", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Dev" }));
    await user.type(screen.getByTestId("desktop-search-input"), "React");
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(screen.getAllByText("React Architecture").length).toBeGreaterThan(0);
    expect(screen.queryByText("Grocery Plan")).not.toBeInTheDocument();
  });

  //harness:criterion=c-mobile-clear-preserves-active-view
  it("keeps the active archived view after the mobile clear button is clicked", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Archived Notes" }));
    await user.type(await openMobileSearch(user), "Archived");
    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(screen.getAllByText("Archived Design").length).toBeGreaterThan(0);
    expect(screen.queryByText("React Architecture")).not.toBeInTheDocument();
    expect(screen.queryByText("Grocery Plan")).not.toBeInTheDocument();
  });

  //harness:criterion=c-desktop-clear-preserves-active-view
  it("keeps the active archived view after the desktop clear button is clicked", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Archived Notes" }));
    await user.type(screen.getByTestId("desktop-search-input"), "Archived");
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(screen.getAllByText("Archived Design").length).toBeGreaterThan(0);
    expect(screen.queryByText("React Architecture")).not.toBeInTheDocument();
    expect(screen.queryByText("Grocery Plan")).not.toBeInTheDocument();
  });

  //harness:criterion=c-mobile-clear-restores-focus,c-mobile-input-ref-attached
  it("returns focus to the mobile input DOM node after mobile search is cleared", async () => {
    const user = userEvent.setup();
    renderApp();
    const mobileSearchInput = await openMobileSearch(user);

    expect(mobileSearchInput).toBeInstanceOf(HTMLInputElement);

    await user.type(mobileSearchInput, "hello");
    mobileSearchInput.blur();
    expect(mobileSearchInput).not.toHaveFocus();
    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(mobileSearchInput).toHaveFocus();
    expect(document.activeElement).toBe(mobileSearchInput);
  });

  //harness:criterion=c-desktop-clear-restores-focus,c-desktop-input-ref-attached
  it("returns focus to the desktop input DOM node after desktop search is cleared", async () => {
    const user = userEvent.setup();
    renderApp();
    const desktopSearchInput = screen.getByTestId("desktop-search-input");

    expect(desktopSearchInput).toBeInstanceOf(HTMLInputElement);

    await user.type(desktopSearchInput, "hello");
    desktopSearchInput.blur();
    expect(desktopSearchInput).not.toHaveFocus();
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(desktopSearchInput).toHaveFocus();
    expect(document.activeElement).toBe(desktopSearchInput);
  });

  //harness:criterion=c-jsdom-env-configured
  it("runs with DOM APIs available from the configured Vitest environment", () => {
    const viteConfig = fs.readFileSync(path.join(repoRoot, "vite.config.ts"), "utf8");

    expect(viteConfig).toContain("jsdom");
    expect(document.createElement("input")).toBeInstanceOf(HTMLInputElement);
  });

  //harness:criterion=c-testing-library-deps-present
  it("lists the Testing Library and jsdom packages as development dependencies", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as { devDependencies?: Record<string, string> };

    expect(packageJson.devDependencies?.["@testing-library/react"]).toBeTruthy();
    expect(packageJson.devDependencies?.["@testing-library/user-event"]).toBeTruthy();
    expect(packageJson.devDependencies?.["@testing-library/jest-dom"]).toBeTruthy();
    expect(packageJson.devDependencies?.jsdom).toBeTruthy();
  });
});

describe("Input", () => {
  //harness:criterion=c-input-component-forwards-ref
  it("forwards refs to the underlying input element", () => {
    const inputRef = createRef<HTMLInputElement>();

    render(<Input data-testid="test-input" ref={inputRef} />);

    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    expect(inputRef.current).toBe(screen.getByTestId("test-input"));
  });
});
