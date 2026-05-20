import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { Input } from "./components/ui/input";
import type { ColorTheme, Note } from "./types";

const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(testFilePath), "..");

const notes: Note[] = [
  {
    id: "active-dev",
    title: "Dev planning",
    content: "Roadmap for keyboard-friendly search.",
    tags: ["Dev"],
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "active-react",
    title: "React patterns",
    content: "Component testing notes.",
    tags: ["React"],
    archived: false,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "active-personal",
    title: "Personal packing",
    content: "Weekend checklist.",
    tags: ["Personal"],
    archived: false,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "archived-dev",
    title: "Archived taxes",
    content: "Old receipt and filing notes.",
    tags: ["Dev"],
    archived: true,
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
];

const tagColors: Record<string, ColorTheme> = {
  Dev: "blue",
  General: "green",
  Personal: "purple",
  React: "rose",
};

function seedStoredNotes() {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
  localStorage.setItem(
    "inky-tags",
    JSON.stringify(["Dev", "General", "Personal", "React"]),
  );
  localStorage.setItem("inky-tag-colors", JSON.stringify(tagColors));
}

function desktopSearchInput() {
  return screen.getByTestId("desktop-search-input") as HTMLInputElement;
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Search" })[0]);
  return screen.getByTestId("mobile-search-input") as HTMLInputElement;
}

async function selectDesktopTag(
  user: ReturnType<typeof userEvent.setup>,
  tag: string,
) {
  await user.click(screen.getAllByRole("button", { name: tag })[0]);
}

async function openArchivedView(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Archived Notes" }));
}

describe("clear search controls", () => {
  beforeEach(() => {
    localStorage.clear();
    seedStoredNotes();
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("does not render the desktop clear button until the query has text", async () => {
    //harness:criterion=c-desktop-clear-btn-hidden-when-empty,c-desktop-clear-btn-visible-when-nonempty
    const user = userEvent.setup();
    render(<App />);

    expect(desktopSearchInput()).toHaveValue("");
    expect(screen.queryByTestId("desktop-clear-search")).not.toBeInTheDocument();

    await user.type(desktopSearchInput(), "hello");

    expect(screen.getByTestId("desktop-clear-search")).toBeVisible();
  });

  it("does not render the mobile clear button until the query has text", async () => {
    //harness:criterion=c-mobile-clear-btn-hidden-when-empty,c-mobile-clear-btn-visible-when-nonempty
    const user = userEvent.setup();
    render(<App />);

    const input = await openMobileSearch(user);

    expect(input).toHaveValue("");
    expect(screen.queryByTestId("mobile-clear-search")).not.toBeInTheDocument();

    await user.type(input, "hello");

    expect(screen.getByTestId("mobile-clear-search")).toBeVisible();
  });

  it("clears only the desktop query and returns focus to the desktop input", async () => {
    //harness:criterion=c-desktop-clear-resets-query,c-desktop-clear-restores-focus,c-desktop-clear-btn-disappears-after-clear,c-desktop-input-ref-attached
    const user = userEvent.setup();
    render(<App />);

    const input = desktopSearchInput();
    await user.type(input, "hello");
    expect(screen.getByTestId("desktop-clear-search")).toBeInTheDocument();

    await user.click(screen.getByTestId("desktop-clear-search"));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByTestId("desktop-clear-search")).not.toBeInTheDocument();
  });

  it("clears only the mobile query and returns focus to the mobile input", async () => {
    //harness:criterion=c-mobile-clear-resets-query,c-mobile-clear-restores-focus,c-mobile-clear-btn-disappears-after-clear,c-mobile-input-ref-attached
    const user = userEvent.setup();
    render(<App />);

    const input = await openMobileSearch(user);
    await user.type(input, "hello");
    expect(screen.getByTestId("mobile-clear-search")).toBeInTheDocument();

    await user.click(screen.getByTestId("mobile-clear-search"));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByTestId("mobile-clear-search")).not.toBeInTheDocument();
  });

  it("keeps the selected tag active after clearing desktop search", async () => {
    //harness:criterion=c-desktop-clear-preserves-selected-tag
    const user = userEvent.setup();
    render(<App />);

    await selectDesktopTag(user, "Dev");
    await user.type(desktopSearchInput(), "hello");
    await user.click(screen.getByTestId("desktop-clear-search"));

    expect(screen.getAllByText("Dev planning").length).toBeGreaterThan(0);
    expect(screen.queryByText("React patterns")).not.toBeInTheDocument();
  });

  it("keeps the selected tag active after clearing mobile search", async () => {
    //harness:criterion=c-mobile-clear-preserves-selected-tag
    const user = userEvent.setup();
    render(<App />);

    await selectDesktopTag(user, "Dev");
    const input = await openMobileSearch(user);
    await user.type(input, "hello");
    await user.click(screen.getByTestId("mobile-clear-search"));

    expect(screen.getAllByText("Dev planning").length).toBeGreaterThan(0);
    expect(screen.queryByText("React patterns")).not.toBeInTheDocument();
  });

  it("keeps the archived view active after clearing desktop search", async () => {
    //harness:criterion=c-desktop-clear-preserves-active-view,c-clear-does-not-affect-archive-filter
    const user = userEvent.setup();
    render(<App />);

    await openArchivedView(user);
    await user.type(desktopSearchInput(), "hello");
    await user.click(screen.getByTestId("desktop-clear-search"));

    expect(screen.getAllByText("Archived taxes").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dev planning")).not.toBeInTheDocument();
  });

  it("keeps the archived view active after clearing mobile search", async () => {
    //harness:criterion=c-mobile-clear-preserves-active-view
    const user = userEvent.setup();
    render(<App />);

    await openArchivedView(user);
    const input = await openMobileSearch(user);
    await user.type(input, "hello");
    await user.click(screen.getByTestId("mobile-clear-search"));

    expect(screen.getAllByText("Archived taxes").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dev planning")).not.toBeInTheDocument();
  });
});

describe("test environment and configuration contracts", () => {
  it("runs with DOM APIs available to Vitest", () => {
    //harness:criterion=c-vitest-dom-environment-configured
    render(<input aria-label="DOM smoke test" />);

    expect(document.activeElement).toBe(document.body);
    expect(screen.getByLabelText("DOM smoke test")).toBeInstanceOf(
      HTMLInputElement,
    );
  });

  it("forwards Input refs to the underlying input element", () => {
    //harness:criterion=c-input-forwards-ref
    const ref = createRef<HTMLInputElement>();

    render(<Input ref={ref} aria-label="Ref target" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("lists the required Testing Library and DOM environment dev dependencies", () => {
    //harness:criterion=c-testing-deps-installed
    const packageJson = JSON.parse(
      readFileSync(resolve(repoRoot, "package.json"), "utf8"),
    ) as { devDependencies?: Record<string, string> };
    const devDependencies = packageJson.devDependencies ?? {};

    expect(devDependencies["@testing-library/react"]).toBeDefined();
    expect(devDependencies["@testing-library/user-event"]).toBeDefined();
    expect(devDependencies["@testing-library/jest-dom"]).toBeDefined();
    expect(devDependencies.jsdom ?? devDependencies["happy-dom"]).toBeDefined();
  });

  it("keeps TSX test files out of the app TypeScript build", () => {
    //harness:criterion=c-app-build-excludes-test-tsx
    const tsconfig = JSON.parse(
      readFileSync(resolve(repoRoot, "tsconfig.app.json"), "utf8"),
    ) as { exclude?: string[] };

    expect(tsconfig.exclude).toContain("src/**/*.test.tsx");
  });

  it("exists as a non-empty App component test file", () => {
    //harness:criterion=c-app-test-file-exists
    expect(readFileSync(testFilePath, "utf8").trim().length).toBeGreaterThan(0);
  });
});
