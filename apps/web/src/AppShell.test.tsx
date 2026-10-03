import "@testing-library/jest-dom/vitest";

import { useState, type ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import type {
  PrimaryFeatureId,
  PrimaryFeatures,
} from "./AppShell.types";
import { useLiveRegion } from "./liveRegion";
import { LanguageProvider } from "./localization/LanguageProvider";
import shellStyles from "./styles.css?inline";

function createFeatures(
  overrides: Partial<Record<PrimaryFeatureId, ReactNode>> = {},
): PrimaryFeatures {
  return {
    guidance: {
      label: "Guidance / Panduan",
      heading: "Guidance heading",
      content: overrides.guidance ?? <p>Guidance content</p>,
    },
    checklist: {
      label: "Checklist / Senarai semak",
      heading: "Checklist heading",
      content: overrides.checklist ?? <p>Checklist content</p>,
    },
    directory: {
      label: "Agencies / Agensi",
      heading: "Directory heading",
      content: overrides.directory ?? <p>Directory content</p>,
    },
    chat: {
      label: "Chat / Sembang",
      heading: "Chat heading",
      content: overrides.chat ?? <p>Chat content</p>,
    },
  };
}

const ORIGINAL_INNER_WIDTH = window.innerWidth;

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: ORIGINAL_INNER_WIDTH,
    writable: true,
  });
});

describe("AppShell", () => {
  it("renders semantic landmarks, direct feature navigation, demo status, and early emergency access", () => {
    render(<AppShell features={createFeatures()} />);

    expect(
      screen.getByRole("link", {
        name: "Skip to main content / Langkau ke kandungan utama",
      }),
    ).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: "Primary features / Ciri utama",
      }),
    ).toBeInTheDocument();

    const emergencyAction = screen.getByRole("link", {
      name: "Call 999 / Hubungi 999",
    });
    const primaryNavigation = screen.getByRole("navigation", {
      name: "Primary features / Ciri utama",
    });

    expect(emergencyAction).toHaveAttribute("href", "tel:999");
    expect(
      emergencyAction.compareDocumentPosition(primaryNavigation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Demo Mode / Mod Demo")).toBeVisible();
    expect(screen.getByText(/Demo Data \/ Data Demo/)).toBeVisible();

    const navigation = within(primaryNavigation);
    expect(navigation.getAllByRole("button")).toHaveLength(4);
    expect(
      navigation.getByRole("button", { name: "Guidance / Panduan" }),
    ).toHaveAttribute("aria-current", "page");

    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(document.querySelector('[aria-live="assertive"]')).not.toBeNull();
  });

  it("supports keyboard-only navigation and defines visible focus indicators", async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider initialLanguage="en">
        <AppShell features={createFeatures()} />
      </LanguageProvider>,
    );

    await user.tab();
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Call 999" })).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Guidance / Panduan" }),
    ).toHaveFocus();

    await user.tab();
    const checklistAction = screen.getByRole("button", {
      name: "Checklist / Senarai semak",
    });
    expect(checklistAction).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Checklist heading" }),
      ).toHaveFocus();
    });
    expect(checklistAction).toHaveAttribute("aria-current", "page");

    expect(shellStyles).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*3px solid #075985;[^}]*outline-offset:\s*3px;/s,
    );
    expect(shellStyles).toMatch(
      /\.emergency-action:focus-visible\s*\{[^}]*outline-color:\s*#facc15;/s,
    );
  });

  it("keeps every primary feature one activation away at 320px with language and demo controls persistent", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
      writable: true,
    });
    window.dispatchEvent(new Event("resize"));
    const user = userEvent.setup();

    render(
      <LanguageProvider initialLanguage="en">
        <AppShell
          features={createFeatures()}
          initialActiveFeature="chat"
        />
      </LanguageProvider>,
    );

    const primaryNavigation = screen.getByRole("navigation", {
      name: "Primary features / Ciri utama",
    });
    const demoMode = screen.getByText("Demo Mode / Mod Demo");
    const languageSelector = screen.getByRole("combobox", {
      name: "Language",
    });
    const destinations = [
      ["Guidance / Panduan", "Guidance heading"],
      ["Checklist / Senarai semak", "Checklist heading"],
      ["Agencies / Agensi", "Directory heading"],
      ["Chat / Sembang", "Chat heading"],
    ] as const;

    expect(window.innerWidth).toBe(320);
    expect(within(primaryNavigation).getAllByRole("button")).toHaveLength(4);

    for (const [actionName, headingName] of destinations) {
      await user.click(
        within(primaryNavigation).getByRole("button", { name: actionName }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: headingName }),
        ).toHaveFocus();
      });
      expect(demoMode).toBeVisible();
      expect(languageSelector).toBeVisible();
    }

    expect(shellStyles).toMatch(
      /\.app-shell\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;/s,
    );
    expect(shellStyles).toMatch(
      /\.primary-nav\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s,
    );
  });

  it("opens every primary feature in one activation and preserves mounted state across orientation events", async () => {
    const user = userEvent.setup();

    function StatefulChat(): ReactNode {
      const [draft, setDraft] = useState("");

      return (
        <label>
          Draft
          <input
            onChange={(event) => {
              setDraft(event.currentTarget.value);
            }}
            value={draft}
          />
        </label>
      );
    }

    render(
      <AppShell
        features={createFeatures({
          chat: <StatefulChat />,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Chat / Sembang" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Chat heading" })).toHaveFocus();
    });

    const draft = screen.getByRole("textbox", { name: "Draft" });
    await user.type(draft, "unsent draft");

    window.dispatchEvent(new Event("orientationchange"));
    window.dispatchEvent(new Event("resize"));

    expect(draft).toHaveValue("unsent draft");
    expect(
      screen.getByRole("button", { name: "Chat / Sembang" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps the bundled emergency action operable while content is loading", () => {
    render(<AppShell features={createFeatures()} isLoading />);

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading / Sedang dimuatkan")).toHaveAttribute(
      "role",
      "status",
    );
    expect(
      screen.getByRole("link", { name: "Call 999 / Hubungi 999" }),
    ).toHaveAttribute("href", "tel:999");
  });

  it("contains feature render failures and offers a safe return without exposing the raw error", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    function BrokenFeature(): ReactNode {
      throw new Error("sentinel-private-render-details");
    }

    render(
      <AppShell
        features={createFeatures({
          chat: <BrokenFeature />,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Chat / Sembang" }));

    expect(
      screen.getByRole("heading", {
        name: "This feature is unavailable / Ciri ini tidak tersedia",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("sentinel-private-render-details"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Call 999 / Hubungi 999" }),
    ).toHaveAttribute("href", "tel:999");

    const safeReturn = screen.getByRole("button", {
      name: "Return to guidance / Kembali ke panduan",
    });
    expect(safeReturn).toHaveAttribute("data-recovery-kind", "safe-return");
    await user.click(safeReturn);
    expect(
      screen.getByRole("button", { name: "Guidance / Panduan" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps loaded feature content and emergency access available during an operation failure", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { container } = render(
      <AppShell
        features={createFeatures()}
        operationState={{
          status: "failed",
          heading: "Local service unavailable",
          message: "Previously loaded emergency guidance remains available.",
          recovery: {
            kind: "retry",
            label: "Retry once",
            onActivate: retry,
          },
        }}
      />,
    );

    expect(screen.getByText("Guidance content")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Call 999 / Hubungi 999" }),
    ).toHaveAttribute("href", "tel:999");

    const failure = screen
      .getByRole("heading", { name: "Local service unavailable" })
      .closest(".client-operation-error");
    expect(failure).not.toBeNull();
    expect(within(failure as HTMLElement).getAllByRole("button")).toHaveLength(1);
    expect(
      container.querySelector('[aria-live="assertive"]'),
    ).toHaveTextContent(
      "Local service unavailable Previously loaded emergency guidance remains available.",
    );

    const retryAction = within(failure as HTMLElement).getByRole("button", {
      name: "Retry once",
    });
    expect(retryAction).toHaveAttribute("data-recovery-kind", "retry");
    await user.click(retryAction);
    expect(retry).toHaveBeenCalledOnce();
  });

  it("provides shared polite and assertive announcement seams to feature components", async () => {
    const user = userEvent.setup();

    function AnnouncementControls(): ReactNode {
      const { announceAssertive, announcePolite } = useLiveRegion();

      return (
        <>
          <button
            onClick={() => {
              announcePolite("Checklist updated");
            }}
            type="button"
          >
            Announce update
          </button>
          <button
            onClick={() => {
              announceAssertive("Validation failed");
            }}
            type="button"
          >
            Announce error
          </button>
        </>
      );
    }

    const { container } = render(
      <AppShell
        features={createFeatures({
          guidance: <AnnouncementControls />,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Announce update" }));
    expect(
      container.querySelector('[aria-live="polite"]'),
    ).toHaveTextContent("Checklist updated");

    await user.click(screen.getByRole("button", { name: "Announce error" }));
    expect(
      container.querySelector('[aria-live="assertive"]'),
    ).toHaveTextContent("Validation failed");
  });
});
