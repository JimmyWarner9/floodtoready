import "@testing-library/jest-dom/vitest";

import { type ReactNode } from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LiveRegionContext, type LiveRegionApi } from "../liveRegion";
import { LanguageProvider } from "../localization/LanguageProvider";
import { ChecklistDeltaAnnouncer } from "./ChecklistDeltaAnnouncer";

function renderAnnouncer(
  children: ReactNode,
  liveRegion: LiveRegionApi,
): ReturnType<typeof render> {
  return render(
    <LanguageProvider initialLanguage="en">
      <LiveRegionContext.Provider value={liveRegion}>
        {children}
      </LiveRegionContext.Provider>
    </LanguageProvider>,
  );
}

describe("ChecklistDeltaAnnouncer", () => {
  it("announces added, retained, and removed counts through only the polite region", async () => {
    const announcePolite = vi.fn();
    const announceAssertive = vi.fn();

    renderAnnouncer(
      <ChecklistDeltaAnnouncer
        delta={{
          added: ["checklist-item.pet-supplies"],
          retained: [
            "checklist-item.drinking-water",
            "checklist-item.shelf-stable-food",
          ],
          removed: ["checklist-item.children-supplies"],
        }}
      />,
      { announcePolite, announceAssertive },
    );

    await waitFor(() => {
      expect(announcePolite).toHaveBeenCalledWith(
        "Checklist updated: 1 added, 2 retained, 1 removed.",
      );
    });
    expect(announceAssertive).not.toHaveBeenCalled();
  });

  it("does not repeat an unchanged delta but announces different IDs even when counts match", async () => {
    const announcePolite = vi.fn();
    const liveRegion = {
      announcePolite,
      announceAssertive: vi.fn(),
    };
    const initialDelta = {
      added: ["checklist-item.pet-supplies"],
      retained: ["checklist-item.drinking-water"],
      removed: ["checklist-item.children-supplies"],
    };
    const { rerender } = renderAnnouncer(
      <ChecklistDeltaAnnouncer delta={initialDelta} />,
      liveRegion,
    );

    await waitFor(() => {
      expect(announcePolite).toHaveBeenCalledOnce();
    });

    rerender(
      <LanguageProvider initialLanguage="en">
        <LiveRegionContext.Provider value={liveRegion}>
          <ChecklistDeltaAnnouncer delta={{ ...initialDelta }} />
        </LiveRegionContext.Provider>
      </LanguageProvider>,
    );
    expect(announcePolite).toHaveBeenCalledOnce();

    rerender(
      <LanguageProvider initialLanguage="en">
        <LiveRegionContext.Provider value={liveRegion}>
          <ChecklistDeltaAnnouncer
            delta={{
              ...initialDelta,
              added: ["checklist-item.elderly-supplies"],
            }}
          />
        </LiveRegionContext.Provider>
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(announcePolite).toHaveBeenCalledTimes(2);
    });
  });
});
