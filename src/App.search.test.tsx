// @vitest-environment jsdom
import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App.tsx";
import { Input } from "./components/ui/input.tsx";
import type { Note } from "./types.ts";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const notes: Note[] = [
  {
    id: "active-dev",
    title: "React Performance Optimization",
    content: "Memoization, code splitting, and virtual lists.",
    tags: ["Dev", "React"],
    archived: false,
    createdAt: "2024-10-29T10:00:00.000Z",
    updatedAt: "2024-10-29T10:00:00.000Z",
  },
  {
    id: "active-personal",
    title: "Japan Travel Planning",
    content: "Book hotels near train stations.",
    tags: ["Personal"],
    archived: false,
    createdAt: "2024-10-28T10:00:00.000Z",
    updatedAt: "2024-10-28T10:00:00.000Z",
  },
  {
    id: "archived-dev",
    title: "Old React Notes",
    content: "Archived experiments.",
    tags: ["Dev"],
    archived: true,
    createdAt: "2024-10-27T10:00:00.000Z",
    updatedAt: "2024-10-27T10:00:00.000Z",
  },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setupDomAPIs() {
  window.matchMedia = (query: string) => ({
    matches: query === "(min-width: 1280px)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  if (!("ResizeObserver" in window)) {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  }
}

function seedStorage() {
  localStorage.setItem("inky-notes", JSON.stringify(notes));
  localStorage.setItem(
    "inky-tags",
    JSON.stringify(["Dev", "General", "Personal", "React"]),
  );
  localStorage.setItem(
    "inky-tag-colors",
    JSON.stringify({
      Dev: "blue",
      General: "green",
      Personal: "rose",
      React: "purple",
    }),
  );
}

function renderApp() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(<App />);
  });
}

function renderElement(element: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  act(() => {
    root?.render(element);
  });
}

function byTestId<T extends HTMLElement>(testId: string) {
  const element = document.querySelector<T>(`[data-testid="${testId}"]`);
  expect(element).not.toBeNull();
  return element as T;
}

function queryByTestId<T extends HTMLElement>(testId: string) {
  return document.querySelector<T>(`[data-testid="${testId}"]`);
}

function visible(element: HTMLElement | null) {
  return Boolean(
    element &&
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.style.display !== "none" &&
      element.style.visibility !== "hidden",
  );
}

function changeInput(input: HTMLInputElement, value: string) {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function openMobileSearch() {
  const searchButton = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Search"]',
  );
  expect(searchButton).not.toBeNull();
  click(searchButton as HTMLButtonElement);
}

beforeEach(() => {
  setupDomAPIs();
  localStorage.clear();
  seedStorage();
  document.body.innerHTML = "";
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
  }
  root = null;
  container?.remove();
  container = null;
  localStorage.clear();
});

describe("App search clearing", () => {
  it("does not render clear buttons for empty search inputs", () => {
    // harness:criterion=c-desktop-clear-button-hidden-when-empty,c-mobile-clear-button-hidden-when-empty,c-dom-test-env-configured
    renderApp();
    expect(queryByTestId("desktop-clear-search")).toBeNull();

    openMobileSearch();
    expect(byTestId<HTMLInputElement>("mobile-search-input").value).toBe("");
    expect(queryByTestId("mobile-clear-search")).toBeNull();
  });

  it("renders the desktop clear button when the desktop search has text", () => {
    // harness:criterion=c-desktop-clear-button-visible-when-nonempty
    renderApp();

    changeInput(byTestId<HTMLInputElement>("desktop-search-input"), "hello");

    expect(visible(queryByTestId("desktop-clear-search"))).toBe(true);
  });

  it("renders the mobile clear button when the mobile search has text", () => {
    // harness:criterion=c-mobile-clear-button-visible-when-nonempty
    renderApp();
    openMobileSearch();

    changeInput(byTestId<HTMLInputElement>("mobile-search-input"), "hello");

    expect(visible(queryByTestId("mobile-clear-search"))).toBe(true);
  });

  it("clears the desktop search value and returns focus to the desktop input", () => {
    // harness:criterion=c-desktop-clear-resets-query,c-desktop-clear-returns-focus,c-desktop-ref-wired
    renderApp();
    const desktopSearch = byTestId<HTMLInputElement>("desktop-search-input");
    changeInput(desktopSearch, "hello");

    click(byTestId("desktop-clear-search"));

    expect(desktopSearch.value).toBe("");
    expect(document.activeElement).toBe(desktopSearch);
  });

  it("clears the mobile search value and returns focus to the mobile input", () => {
    // harness:criterion=c-mobile-clear-resets-query,c-mobile-clear-returns-focus,c-mobile-ref-wired
    renderApp();
    openMobileSearch();
    const mobileSearch = byTestId<HTMLInputElement>("mobile-search-input");
    changeInput(mobileSearch, "hello");

    click(byTestId("mobile-clear-search"));

    expect(mobileSearch.value).toBe("");
    expect(document.activeElement).toBe(mobileSearch);
  });

  it("preserves the active tag filter after clearing search", () => {
    // harness:criterion=c-clear-does-not-change-tag-filter
    renderApp();
    const devTagButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Dev",
    );
    expect(devTagButton).toBeDefined();
    click(devTagButton as HTMLButtonElement);

    const desktopSearch = byTestId<HTMLInputElement>("desktop-search-input");
    changeInput(desktopSearch, "react");
    click(byTestId("desktop-clear-search"));

    expect(document.body.textContent).toContain("React Performance Optimization");
    expect(document.body.textContent).not.toContain("Japan Travel Planning");
  });

  it("preserves the archived view after clearing search", () => {
    // harness:criterion=c-clear-does-not-change-archived-view
    renderApp();
    const archivedViewButton = Array.from(
      document.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Archived Notes"));
    expect(archivedViewButton).toBeDefined();
    click(archivedViewButton as HTMLButtonElement);

    const desktopSearch = byTestId<HTMLInputElement>("desktop-search-input");
    changeInput(desktopSearch, "react");
    click(byTestId("desktop-clear-search"));

    expect(document.body.textContent).toContain("Archived Notes");
    expect(document.body.textContent).toContain("Old React Notes");
    expect(document.body.textContent).not.toContain("Japan Travel Planning");
  });

  it("does not focus desktop or mobile search on initial render", () => {
    // harness:criterion=c-desktop-focus-not-stolen-on-mount,c-mobile-focus-not-stolen-on-mount
    renderApp();

    expect(document.activeElement).not.toBe(
      byTestId<HTMLInputElement>("desktop-search-input"),
    );
    expect(queryByTestId("mobile-search-input")).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("forwards refs from the shared Input to the underlying input element", () => {
    // harness:criterion=c-input-forwards-ref
    const inputRef = createRef<HTMLInputElement>();

    renderElement(<Input ref={inputRef} aria-label="Ref forwarding input" />);

    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
  });
});
