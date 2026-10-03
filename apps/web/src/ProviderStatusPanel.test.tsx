import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProviderStatusResponse } from "@banjir-ready/contracts";

import { AppShell } from "./AppShell";
import type { PrimaryFeatures } from "./AppShell.types";
import {
  ProviderStatusClientError,
  ProviderStatusPanel,
  createProviderStatusClient,
  type ProviderStatusClient,
} from "./ProviderStatusPanel";
import { LanguageProvider } from "./localization/LanguageProvider";

const unavailableAgency = {
  providerName: "live-agency",
  providerMode: "live",
  availability: "unavailable",
  verification: "unverified",
  freshness: "unavailable",
  fallbackProvider: "bundled-demo",
  nonSecretErrorCode: null,
} as const;

const availableAgency = {
  providerName: "approved-agency",
  providerMode: "live",
  availability: "available",
  verification: "verified",
  freshness: "current",
  fallbackProvider: "bundled-demo",
  nonSecretErrorCode: null,
} as const;

function response(
  providers: ProviderStatusResponse["providers"],
): ProviderStatusResponse {
  return { ok: true, requestId: "request.provider-panel", providers };
}

function features(content: React.ReactNode): PrimaryFeatures {
  return {
    guidance: {
      label: "Guidance",
      heading: "Guidance",
      content,
    },
    checklist: {
      label: "Checklist",
      heading: "Checklist",
      content: <p>Saved checklist</p>,
    },
    directory: {
      label: "Directory",
      heading: "Directory",
      content: <p>Directory</p>,
    },
    chat: {
      label: "Chat",
      heading: "Chat",
      content: <p>Chat</p>,
    },
  };
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("provider status client", () => {
  it("uses only the same-origin status route and runtime-validates the response", async () => {
    const fetchImplementation = vi.fn(async () =>
      new Response(JSON.stringify(response([availableAgency])), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    ) as unknown as typeof fetch;
    const client = createProviderStatusClient(fetchImplementation);

    await expect(client.load()).resolves.toEqual(
      response([availableAgency]),
    );
    expect(fetchImplementation).toHaveBeenCalledWith(
      "/api/v1/status",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
      }),
    );
  });

  it("fails closed on fields outside the public allowlist", async () => {
    const unsafePayload = {
      ...response([availableAgency]),
      providers: [
        {
          ...availableAgency,
          schemaVersion: "internal-v1",
          authorization: "sentinel-authorization",
        },
      ],
    };
    const fetchImplementation = vi.fn(async () =>
      new Response(JSON.stringify(unsafePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(
      createProviderStatusClient(fetchImplementation).load(),
    ).rejects.toMatchObject({
      safeCode: "PROVIDER_INVALID_RESPONSE",
    });
  });
});

describe("ProviderStatusPanel resilient fallback", () => {
  it("retains loaded fallback status, emergency access, and durable state through failure and retry", async () => {
    const user = userEvent.setup();
    localStorage.setItem("banjir-ready:state", "durable-sentinel");
    const load = vi
      .fn<ProviderStatusClient["load"]>()
      .mockRejectedValueOnce(new ProviderStatusClientError("SOURCE_UNAVAILABLE"))
      .mockResolvedValueOnce(response([availableAgency]));
    const client: ProviderStatusClient = { load };

    render(
      <LanguageProvider initialLanguage="en">
        <AppShell
          features={features(
            <ProviderStatusPanel
              client={client}
              initialStatuses={[unavailableAgency]}
            />,
          )}
        />
      </LanguageProvider>,
    );

    const failureHeading = await screen.findByRole("heading", {
      name: "Provider status service unavailable",
    });
    const statusCard = screen
      .getByRole("heading", { name: "live-agency" })
      .closest(".provider-status-card");

    expect(statusCard).not.toBeNull();
    expect(within(statusCard as HTMLElement).getByText("Provider unavailable")).toBeVisible();
    expect(
      within(statusCard as HTMLElement).getByText(
        "Credential-free fallback active: bundled-demo",
      ),
    ).toBeVisible();
    expect(within(statusCard as HTMLElement).getByText("Source unavailable")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Call 999" }),
    ).toHaveAttribute("href", "tel:999");
    expect(localStorage.getItem("banjir-ready:state")).toBe("durable-sentinel");

    const failure = failureHeading.closest(".client-operation-error");
    expect(failure).not.toBeNull();
    expect(within(failure as HTMLElement).getAllByRole("button")).toHaveLength(1);
    await user.click(
      within(failure as HTMLElement).getByRole("button", {
        name: "Retry once",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "approved-agency" }),
      ).toBeVisible();
    });
    expect(screen.getByText("Provider available")).toBeVisible();
    expect(screen.getByText("Current under the configured freshness policy")).toBeVisible();
    expect(screen.queryByText("live-agency")).not.toBeInTheDocument();
    expect(localStorage.getItem("banjir-ready:state")).toBe("durable-sentinel");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
