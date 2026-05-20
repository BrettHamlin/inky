import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { NotesContextValue } from "@/store/notes-context";

const capturedButtons = vi.hoisted(() => [] as any[]);
const togglePin = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/button", async () => {
  const React = await import("react");

  return {
    Button: ({ children, ...props }: any) => {
      capturedButtons.push({ ...props, children });
      return React.createElement("button", props, children);
    },
  };
});

vi.mock("@/store/theme-context", async () => {
  const React = await import("react");

  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock("@/store/notes-context", async () => {
  const React = await import("react");

  return {
    NotesProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useNotes: (): NotesContextValue => ({
      notes: [
        {
          id: "unpinned-a",
          title: "Unpinned A",
          content: "",
          tags: ["General"],
          archived: false,
          pinned: false,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z",
        },
        {
          id: "pinned",
          title: "Pinned",
          content: "",
          tags: ["General"],
          archived: false,
          pinned: true,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z",
        },
        {
          id: "unpinned-b",
          title: "Unpinned B",
          content: "",
          tags: ["General"],
          archived: false,
          pinned: false,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z",
        },
        {
          id: "archived-unpinned",
          title: "Archived Unpinned",
          content: "",
          tags: ["General"],
          archived: true,
          pinned: false,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z",
        },
        {
          id: "archived-pinned",
          title: "Archived Pinned",
          content: "",
          tags: ["General"],
          archived: true,
          pinned: true,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z",
        },
      ],
      tags: ["General"],
      tagColors: {},
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      toggleArchive: vi.fn(),
      togglePin,
      createTag: vi.fn(),
      deleteTag: vi.fn(),
    }),
  };
});

vi.mock("@/components/Sidebar", async () => {
  const React = await import("react");
  return { Sidebar: () => React.createElement("aside") };
});

vi.mock("@/components/MobileSidebar", async () => {
  const React = await import("react");
  return { MobileSidebar: () => React.createElement("aside") };
});

vi.mock("@/components/MobileBottomNav", async () => {
  const React = await import("react");
  return { MobileBottomNav: () => React.createElement("nav") };
});

vi.mock("@/components/ThemeSelector", async () => {
  const React = await import("react");
  return { ThemeSelector: () => React.createElement("div") };
});

function renderApp() {
  capturedButtons.length = 0;
  return renderToStaticMarkup(React.createElement(App));
}

async function renderAppWithInitialActiveView(
  activeView: "all" | "archived",
) {
  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let stateIndex = 0;

    return {
      ...actual,
      useState: (initialValue: unknown) => {
        const slot = stateIndex++;
        const value =
          slot === 0
            ? activeView
            : typeof initialValue === "function"
              ? (initialValue as () => unknown)()
              : initialValue;

        return [value, vi.fn()] as const;
      },
    };
  });

  const ReactWithInitialState = await import("react");
  const { renderToStaticMarkup: renderFreshToStaticMarkup } = await import(
    "react-dom/server"
  );
  const { default: FreshApp } = await import("./App");
  const html = renderFreshToStaticMarkup(
    ReactWithInitialState.createElement(FreshApp),
  );

  vi.doUnmock("react");
  vi.resetModules();

  return html;
}

function renderedListTitles(html: string) {
  return [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(
    (match) => match[1],
  );
}

function elementText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(elementText).join("");
  if (!React.isValidElement(node)) return "";

  return elementText((node.props as { children?: React.ReactNode }).children);
}

describe("App pinned notes workflow", () => {
  beforeEach(() => {
    togglePin.mockClear();
    capturedButtons.length = 0;
  });

  //harness:criterion=c-pinned-notes-sorted-first-all-notes-view
  it("renders pinned notes before unpinned notes in the All Notes list", () => {
    const html = renderApp();
    const firstListTitles = renderedListTitles(html).slice(0, 3);

    expect(firstListTitles).toEqual(["Pinned", "Unpinned A", "Unpinned B"]);
  });

  //harness:criterion=c-pinned-notes-sorted-first-archived-notes-view
  it("renders pinned archived notes before unpinned archived notes", async () => {
    const html = await renderAppWithInitialActiveView("archived");

    expect(renderedListTitles(html).slice(0, 2)).toEqual([
      "Archived Pinned",
      "Archived Unpinned",
    ]);
  });

  //harness:criterion=c-app-passes-toggle-pin-to-editor-desktop
  it("wires the desktop editor pin action to togglePin", () => {
    renderApp();
    const editorPinButton = capturedButtons.find(
      (props) =>
        props["aria-label"] === "Unpin note: Pinned" &&
        elementText(props.children).includes("Unpin Note"),
    );

    editorPinButton.onClick();

    expect(togglePin).toHaveBeenCalledTimes(1);
    expect(togglePin).toHaveBeenCalledWith("pinned");
  });

  //harness:criterion=c-app-mobile-list-rows-have-pin-control
  it("wires mobile inline row pin controls to togglePin", () => {
    renderApp();
    const firstUnpinnedControl = capturedButtons.find(
      (props) => props["aria-label"] === "Pin note: Unpinned A",
    );

    firstUnpinnedControl.onClick();

    expect(togglePin).toHaveBeenCalledTimes(1);
    expect(togglePin).toHaveBeenCalledWith("unpinned-a");
  });
});
