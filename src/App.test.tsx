import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { Input } from "./components/ui/input";
import type { Note } from "./types";

const timestamp = "2026-05-20T12:00:00.000Z";

const makeNote = (overrides: Partial<Note>): Note => ({
  id: "note-id",
  title: "Untitled",
  content: "",
  tags: [],
  archived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const defaultNotes = [
  makeNote({
    id: "dev-active",
    title: "Dev Roadmap",
    content: "shared search phrase",
    tags: ["Dev"],
  }),
  makeNote({
    id: "personal-active",
    title: "Personal Roadmap",
    content: "shared search phrase",
    tags: ["Personal"],
  }),
  makeNote({
    id: "archived-note",
    title: "Archived Roadmap",
    content: "shared search phrase",
    tags: ["Dev"],
    archived: true,
  }),
];

function renderApp(notes = defaultNotes) {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
  localStorage.setItem("inky-tags", JSON.stringify(["Dev", "Personal"]));
  localStorage.setItem(
    "inky-tag-colors",
    JSON.stringify({ Dev: "blue", Personal: "green" }),
  );

  return render(<App />);
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
  return screen.getByTestId("mobile-search-input") as HTMLInputElement;
}

async function selectDevTag(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getDesktopDevTagButton());
}

function getDesktopDevTagButton() {
  return screen.getByRole("button", { name: "Dev" });
}

async function switchToArchivedView(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Archived Notes" }));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App search clear controls", () => {
  //harness:criterion=c-testing-library-deps-installed,c-vitest-dom-environment-configured
  it("runs with Testing Library matchers in a DOM environment", () => {
    expect(typeof document).toBe("object");
    render(<button type="button">Ready</button>);

    expect(screen.getByRole("button", { name: "Ready" })).toBeInTheDocument();
  });

  //harness:criterion=c-test-files-excluded-from-prod-build
  it("keeps TSX test files excluded from the production TypeScript config", () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.resolve("tsconfig.app.json"), "utf8"),
    ) as { exclude?: string[] };

    expect(tsconfig.exclude).toContain("src/**/*.test.tsx");
  });

  //harness:criterion=c-input-forwards-ref
  it("forwards Input refs to the underlying HTML input element", () => {
    const ref = React.createRef<HTMLInputElement>();

    render(<Input ref={ref} aria-label="Forwarded input" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  //harness:criterion=c-clear-btn-hidden-when-query-empty
  it("does not render desktop or mobile clear buttons when the query is empty", async () => {
    const user = userEvent.setup();
    renderApp();

    await openMobileSearch(user);

    expect(screen.queryByTestId("desktop-clear-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-clear-btn")).not.toBeInTheDocument();
  });

  //harness:criterion=c-clear-btn-visible-when-query-nonempty
  it("renders desktop and mobile clear buttons when the query is non-empty", async () => {
    const user = userEvent.setup();
    renderApp();
    await openMobileSearch(user);

    await user.type(screen.getByTestId("desktop-search-input"), "hello");
    expect(screen.getByTestId("desktop-clear-btn")).toBeVisible();

    await user.clear(screen.getByTestId("desktop-search-input"));
    await user.type(screen.getByTestId("mobile-search-input"), "hello");

    expect(screen.getByTestId("mobile-clear-btn")).toBeVisible();
    expect(screen.getByTestId("desktop-clear-btn")).toBeVisible();
  });

  //harness:criterion=c-clear-btn-desktop-resets-query,c-clear-btn-desktop-restores-focus,c-desktop-input-ref-attached,c-clear-btn-hidden-after-clear
  it("clears the desktop search input, hides the button, and restores desktop focus", async () => {
    const user = userEvent.setup();
    renderApp();
    const desktopInput = screen.getByTestId(
      "desktop-search-input",
    ) as HTMLInputElement;

    await user.type(desktopInput, "hello");
    expect(screen.getByTestId("desktop-clear-btn")).toBeInTheDocument();
    await user.click(screen.getByTestId("desktop-clear-btn"));

    expect(desktopInput).toHaveValue("");
    expect(screen.queryByTestId("desktop-clear-btn")).not.toBeInTheDocument();
    expect(desktopInput).toHaveFocus();
  });

  //harness:criterion=c-clear-btn-mobile-resets-query,c-clear-btn-mobile-restores-focus,c-mobile-input-ref-attached,c-clear-btn-hidden-after-clear
  it("clears the mobile search input, hides the button, and restores mobile focus", async () => {
    const user = userEvent.setup();
    renderApp();
    const mobileInput = await openMobileSearch(user);

    await user.type(mobileInput, "hello");
    expect(screen.getByTestId("mobile-clear-btn")).toBeInTheDocument();
    await user.click(screen.getByTestId("mobile-clear-btn"));

    expect(mobileInput).toHaveValue("");
    expect(screen.queryByTestId("mobile-clear-btn")).not.toBeInTheDocument();
    expect(mobileInput).toHaveFocus();
  });

  //harness:criterion=c-clear-btn-preserves-selected-tag,c-clear-btn-does-not-reset-tag-to-default
  it("preserves a non-default selected tag after desktop clear", async () => {
    const user = userEvent.setup();
    renderApp();

    await selectDevTag(user);
    const selectedClassName = getDesktopDevTagButton().className;
    await user.type(screen.getByTestId("desktop-search-input"), "roadmap");
    await user.click(screen.getByTestId("desktop-clear-btn"));

    expect(getDesktopDevTagButton()).toHaveClass("bg-primary/15");
    expect(getDesktopDevTagButton().className).toBe(selectedClassName);
    expect(screen.getAllByText("Dev Roadmap").length).toBeGreaterThan(0);
    expect(screen.queryByText("Personal Roadmap")).not.toBeInTheDocument();
  });

  //harness:criterion=c-clear-btn-preserves-selected-tag,c-clear-btn-does-not-reset-tag-to-default
  it("preserves a non-default selected tag after mobile clear", async () => {
    const user = userEvent.setup();
    renderApp();
    const mobileInput = await openMobileSearch(user);

    await selectDevTag(user);
    const selectedClassName = getDesktopDevTagButton().className;
    await user.type(mobileInput, "roadmap");
    await user.click(screen.getByTestId("mobile-clear-btn"));

    expect(getDesktopDevTagButton()).toHaveClass("bg-primary/15");
    expect(getDesktopDevTagButton().className).toBe(selectedClassName);
    expect(screen.getAllByText("Dev Roadmap").length).toBeGreaterThan(0);
    expect(screen.queryByText("Personal Roadmap")).not.toBeInTheDocument();
  });

  //harness:criterion=c-clear-btn-preserves-active-view
  it("preserves the archived view after desktop clear", async () => {
    const user = userEvent.setup();
    renderApp();

    await switchToArchivedView(user);
    await user.type(screen.getByTestId("desktop-search-input"), "roadmap");
    await user.click(screen.getByTestId("desktop-clear-btn"));

    expect(screen.getAllByText("Archived Roadmap").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dev Roadmap")).not.toBeInTheDocument();
  });

  //harness:criterion=c-clear-btn-preserves-active-view
  it("preserves the archived view after mobile clear", async () => {
    const user = userEvent.setup();
    renderApp();
    const mobileInput = await openMobileSearch(user);

    await switchToArchivedView(user);
    await user.type(mobileInput, "roadmap");
    await user.click(screen.getByTestId("mobile-clear-btn"));

    expect(screen.getAllByText("Archived Roadmap").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dev Roadmap")).not.toBeInTheDocument();
  });
});
