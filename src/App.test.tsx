import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import App from "./App.tsx";
import type { Note } from "./types.ts";

const notes: Note[] = [
  {
    id: "active-dev-react",
    title: "React Refactor",
    content: "Memo cleanup",
    tags: ["Dev", "React"],
    archived: false,
    createdAt: "2025-01-01T10:00:00.000Z",
    updatedAt: "2025-01-01T10:00:00.000Z",
  },
  {
    id: "active-dev-api",
    title: "API Notes",
    content: "Endpoint contracts",
    tags: ["Dev"],
    archived: false,
    createdAt: "2025-01-02T10:00:00.000Z",
    updatedAt: "2025-01-02T10:00:00.000Z",
  },
  {
    id: "active-personal",
    title: "Grocery List",
    content: "Apples and rice",
    tags: ["Personal"],
    archived: false,
    createdAt: "2025-01-03T10:00:00.000Z",
    updatedAt: "2025-01-03T10:00:00.000Z",
  },
  {
    id: "archived-dev",
    title: "Archived Roadmap",
    content: "Old Dev plan",
    tags: ["Dev"],
    archived: true,
    createdAt: "2025-01-04T10:00:00.000Z",
    updatedAt: "2025-01-04T10:00:00.000Z",
  },
  {
    id: "archived-personal",
    title: "Archived Receipt",
    content: "Old Personal file",
    tags: ["Personal"],
    archived: true,
    createdAt: "2025-01-05T10:00:00.000Z",
    updatedAt: "2025-01-05T10:00:00.000Z",
  },
];

function seedNotes() {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
  localStorage.setItem(
    "inky-tags",
    JSON.stringify(["Dev", "Personal", "React"]),
  );
  localStorage.setItem(
    "inky-tag-colors",
    JSON.stringify({ Dev: "blue", Personal: "green", React: "purple" }),
  );
}

async function openMobileSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByLabelText("Search")[0]);
  return screen.getByTestId("mobile-search-input");
}

function expectRendered(title: string) {
  expect(screen.getAllByText(title).length).toBeGreaterThan(0);
}

function expectNotRendered(title: string) {
  expect(screen.queryByText(title)).not.toBeInTheDocument();
}

beforeEach(() => {
  localStorage.clear();
  seedNotes();
});

describe("App clear search controls", () => {
  // harness:criterion=c-clear-btn-hidden-when-empty-desktop,c-clear-btn-hidden-when-empty-mobile,c-clear-btn-not-shown-on-null-query
  it("does not render either clear-search button before a query exists", () => {
    render(<App />);

    expect(screen.queryByTestId("desktop-clear-search-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-clear-search-btn")).not.toBeInTheDocument();
  });

  // harness:criterion=c-clear-btn-visible-when-nonempty-desktop,c-desktop-clear-btn-has-unique-testid,c-mobile-clear-btn-has-unique-testid,c-clear-btn-uses-button-component,c-clear-btn-uses-x-icon
  it("renders uniquely identifiable Button-based clear controls with X icons for a desktop query", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openMobileSearch(user);

    await user.type(screen.getByTestId("desktop-search-input"), "react");

    const desktopButton = screen.getByTestId("desktop-clear-search-btn");
    const mobileButton = screen.getByTestId("mobile-clear-search-btn");

    expect(desktopButton).toBeVisible();
    expect(screen.getAllByTestId("desktop-clear-search-btn")).toHaveLength(1);
    expect(screen.getAllByTestId("mobile-clear-search-btn")).toHaveLength(1);
    expect(desktopButton).not.toBe(mobileButton);
    expect(desktopButton).toHaveAttribute("data-slot", "button");
    expect(mobileButton).toHaveAttribute("data-slot", "button");
    expect(desktopButton).toHaveClass("inline-flex");
    expect(mobileButton).toHaveClass("inline-flex");
    expect(desktopButton.querySelector("svg.lucide-x")).not.toBeNull();
    expect(mobileButton.querySelector("svg.lucide-x")).not.toBeNull();
  });

  // harness:criterion=c-clear-btn-visible-when-nonempty-mobile
  it("renders the mobile clear-search button when the mobile input has a query", async () => {
    const user = userEvent.setup();
    render(<App />);
    const mobileInput = await openMobileSearch(user);

    await user.type(mobileInput, "api");

    expect(screen.getByTestId("mobile-clear-search-btn")).toBeVisible();
  });

  // harness:criterion=c-clear-btn-hidden-when-empty-desktop,c-clear-btn-visible-when-nonempty-desktop,c-clear-btn-hidden-when-empty-mobile,c-clear-btn-visible-when-nonempty-mobile
  it("toggles both clear-search buttons as the shared query becomes populated and empty", async () => {
    const user = userEvent.setup();
    render(<App />);
    const mobileInput = await openMobileSearch(user);
    const desktopInput = screen.getByTestId("desktop-search-input");

    expect(screen.queryByTestId("desktop-clear-search-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-clear-search-btn")).not.toBeInTheDocument();

    await user.type(desktopInput, "react");

    expect(screen.getByTestId("desktop-clear-search-btn")).toBeVisible();
    expect(screen.getByTestId("mobile-clear-search-btn")).toBeVisible();

    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(screen.queryByTestId("desktop-clear-search-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-clear-search-btn")).not.toBeInTheDocument();

    await user.type(mobileInput, "api");

    expect(screen.getByTestId("desktop-clear-search-btn")).toBeVisible();
    expect(screen.getByTestId("mobile-clear-search-btn")).toBeVisible();

    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(screen.queryByTestId("desktop-clear-search-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-clear-search-btn")).not.toBeInTheDocument();
  });

  // harness:criterion=c-clear-btn-clears-query-desktop,c-clear-btn-restores-focus-desktop,c-desktop-search-input-has-ref
  it("clears the desktop query and restores focus to the desktop input", async () => {
    const user = userEvent.setup();
    render(<App />);
    const desktopInput = screen.getByTestId("desktop-search-input");

    await user.type(desktopInput, "react");
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(desktopInput).toHaveValue("");
    expect(desktopInput).toHaveFocus();
  });

  // harness:criterion=c-clear-btn-clears-query-mobile,c-clear-btn-restores-focus-mobile,c-mobile-search-input-has-ref
  it("clears the mobile query and restores focus to the mobile input", async () => {
    const user = userEvent.setup();
    render(<App />);
    const mobileInput = await openMobileSearch(user);

    await user.type(mobileInput, "api");
    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(mobileInput).toHaveValue("");
    expect(mobileInput).toHaveFocus();
  });

  // harness:criterion=c-clear-preserves-active-tag-filter,c-empty-search-shows-all-filter-matched-notes,c-filtered-notes-recomputes-after-clear
  it("preserves a selected tag and recomputes notes after clearing search", async () => {
    const user = userEvent.setup();
    render(<App />);
    const devTagButton = screen.getAllByRole("button", { name: /^Dev$/ })[0];

    await user.click(devTagButton);
    await user.type(screen.getByTestId("desktop-search-input"), "react");

    expectRendered("React Refactor");
    expectNotRendered("API Notes");
    expectNotRendered("Grocery List");

    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(devTagButton).toHaveClass("text-primary");
    expectRendered("React Refactor");
    expectRendered("API Notes");
    expectNotRendered("Grocery List");
  });

  // harness:criterion=c-clear-preserves-active-view
  it("preserves archived view after clearing search", async () => {
    const user = userEvent.setup();
    render(<App />);
    const archivedViewButton = screen.getByRole("button", {
      name: /Archived Notes/,
    });

    await user.click(archivedViewButton);
    await user.type(screen.getByTestId("desktop-search-input"), "roadmap");
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    expect(archivedViewButton).toHaveClass("text-primary");
    expectRendered("Archived Roadmap");
    expectRendered("Archived Receipt");
    expectNotRendered("React Refactor");
    expectNotRendered("Grocery List");
  });

  // harness:criterion=c-clear-btn-does-not-submit-form
  it("uses non-submit clear buttons that do not navigate", async () => {
    const user = userEvent.setup();
    render(<App />);
    const startingLocation = window.location.href;
    const submitEvents: Event[] = [];
    document.addEventListener("submit", (event) => submitEvents.push(event));
    await openMobileSearch(user);

    await user.type(screen.getByTestId("desktop-search-input"), "react");
    expect(screen.getByTestId("desktop-clear-search-btn")).toHaveAttribute(
      "type",
      "button",
    );
    await user.click(screen.getByTestId("desktop-clear-search-btn"));

    await user.type(screen.getByTestId("mobile-search-input"), "api");
    expect(screen.getByTestId("mobile-clear-search-btn")).toHaveAttribute(
      "type",
      "button",
    );
    await user.click(screen.getByTestId("mobile-clear-search-btn"));

    expect(submitEvents).toHaveLength(0);
    expect(window.location.href).toBe(startingLocation);
  });

  // harness:criterion=c-dom-test-env-configured,c-testing-library-deps-added
  it("runs in a DOM test environment with the required Testing Library packages declared", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { devDependencies?: Record<string, string> };
    const devDependencies = packageJson.devDependencies ?? {};

    expect(document.createElement("input")).toBeInstanceOf(HTMLInputElement);
    expect(devDependencies["@testing-library/react"]).toMatch(/^\D*\d/);
    expect(devDependencies["@testing-library/user-event"]).toMatch(/^\D*\d/);
    expect(devDependencies.jsdom || devDependencies["happy-dom"]).toMatch(/^\D*\d/);
  });
});
