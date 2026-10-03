import "@testing-library/jest-dom/vitest";

import { useState, type ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ClientOperationStateView,
  IDLE_CLIENT_OPERATION_STATE,
  type ClientOperationState,
} from "./ClientOperationState";
import { LiveRegionContext, type LiveRegionApi } from "./liveRegion";

afterEach(() => {
  localStorage.clear();
});

function renderWithLiveRegions(
  children: ReactNode,
  liveRegion: LiveRegionApi,
): ReturnType<typeof render> {
  return render(
    <LiveRegionContext.Provider value={liveRegion}>
      {children}
    </LiveRegionContext.Provider>,
  );
}

describe("ClientOperationStateView", () => {
  it("keeps loaded and persisted values unchanged through failure and exposes one retry", async () => {
    const user = userEvent.setup();
    const announceAssertive = vi.fn();
    const announcePolite = vi.fn();
    const retry = vi.fn();
    localStorage.setItem("banjir-ready:test-state", "persisted-value");

    function Harness(): ReactNode {
      const [value, setValue] = useState("loaded value");
      const [state, setState] = useState<ClientOperationState>(
        IDLE_CLIENT_OPERATION_STATE,
      );

      return (
        <ClientOperationStateView state={state}>
          <label>
            Loaded field
            <input
              onChange={(event) => {
                setValue(event.currentTarget.value);
              }}
              value={value}
            />
          </label>
          <button
            onClick={() => {
              setState({
                status: "failed",
                heading: "Service unavailable",
                message: "Loaded information remains available.",
                recovery: {
                  kind: "retry",
                  label: "Retry once",
                  onActivate: () => {
                    retry();
                    setState({
                      status: "ready",
                      message: "Loaded information retained",
                    });
                  },
                },
              });
            }}
            type="button"
          >
            Simulate failure
          </button>
        </ClientOperationStateView>
      );
    }

    renderWithLiveRegions(<Harness />, {
      announceAssertive,
      announcePolite,
    });

    const input = screen.getByRole("textbox", { name: "Loaded field" });
    await user.clear(input);
    await user.type(input, "unchanged user value");
    await user.click(screen.getByRole("button", { name: "Simulate failure" }));

    expect(input).toHaveValue("unchanged user value");
    expect(localStorage.getItem("banjir-ready:test-state")).toBe(
      "persisted-value",
    );
    expect(announceAssertive).toHaveBeenCalledOnce();
    expect(announceAssertive).toHaveBeenCalledWith(
      "Service unavailable Loaded information remains available.",
    );

    const failure = screen
      .getByRole("heading", { name: "Service unavailable" })
      .closest(".client-operation-error");
    expect(failure).not.toBeNull();
    expect(within(failure as HTMLElement).getAllByRole("button")).toHaveLength(1);

    await user.click(
      within(failure as HTMLElement).getByRole("button", {
        name: "Retry once",
      }),
    );

    expect(retry).toHaveBeenCalledOnce();
    expect(input).toHaveValue("unchanged user value");
    expect(screen.queryByText("Service unavailable")).not.toBeInTheDocument();
    expect(announcePolite).toHaveBeenCalledWith("Loaded information retained");
  });

  it("announces loading politely and exposes its busy state without hiding content", async () => {
    const user = userEvent.setup();
    const announceAssertive = vi.fn();
    const announcePolite = vi.fn();

    function Harness(): ReactNode {
      const [state, setState] = useState<ClientOperationState>(
        IDLE_CLIENT_OPERATION_STATE,
      );

      return (
        <ClientOperationStateView state={state}>
          <p>Already loaded guidance</p>
          <button
            onClick={() => {
              setState({ status: "loading", message: "Refreshing guidance" });
            }}
            type="button"
          >
            Refresh
          </button>
        </ClientOperationStateView>
      );
    }

    const { container } = renderWithLiveRegions(<Harness />, {
      announceAssertive,
      announcePolite,
    });

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(screen.getByText("Already loaded guidance")).toBeVisible();
    expect(screen.getByText("Refreshing guidance")).toBeVisible();
    expect(
      container.querySelector('[data-operation-state="loading"]'),
    ).toHaveAttribute("aria-busy", "true");
    expect(announcePolite).toHaveBeenCalledOnce();
    expect(announcePolite).toHaveBeenCalledWith("Refreshing guidance");
    expect(announceAssertive).not.toHaveBeenCalled();
  });
});
