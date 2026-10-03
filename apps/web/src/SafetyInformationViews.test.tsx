import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  ClassifiedScopeLimitation,
  LimitationsView,
  PrivacyView,
  SafetyInformationViews,
} from "./SafetyInformationViews";
import {
  classifyScopeRequest,
  MAX_SCOPE_REQUEST_BYTES,
  type ScopeLimitationCategory,
} from "./scopeLimitation";
import {
  CHECKLIST_PROFILE_FIELDS,
  ENABLED_EXTERNAL_INTEGRATIONS,
  LOCAL_STATE_TOP_LEVEL_FIELDS,
  OPTIONAL_INTEGRATION_REGISTRY,
  OUT_OF_SCOPE_CAPABILITIES,
  STORAGE_FIELD_DISCLOSURES,
} from "./safetyInformationRegistry";

describe("privacy and limitations registries", () => {
  it("documents the exact persisted envelope and six checklist fields", () => {
    expect(LOCAL_STATE_TOP_LEVEL_FIELDS).toEqual([
      "schemaVersion",
      "language",
      "checklistProfile",
      "checklistRuleVersion",
      "checklistCompletion",
      "acknowledgedNotices",
    ]);
    expect(CHECKLIST_PROFILE_FIELDS).toEqual([
      "householdSize",
      "hasChildren",
      "hasElderlyMembers",
      "needsMobilityAssistance",
      "hasPets",
      "hasTransport",
    ]);
    expect(STORAGE_FIELD_DISCLOSURES.map((field) => field.id)).toEqual([
      "language",
      ...CHECKLIST_PROFILE_FIELDS,
      "checklistRuleVersion",
      "checklistCompletion",
      "acknowledgedNotices",
    ]);
  });

  it("keeps every optional integration disabled, unavailable, and unverified", () => {
    expect(ENABLED_EXTERNAL_INTEGRATIONS).toHaveLength(0);
    expect(OPTIONAL_INTEGRATION_REGISTRY).toHaveLength(5);
    for (const integration of OPTIONAL_INTEGRATION_REGISTRY) {
      expect(integration).toMatchObject({
        enabled: false,
        availability: "unavailable",
        verification: "unverified",
      });
    }
  });

  it("enumerates every explicitly excluded feature group", () => {
    expect(OUT_OF_SCOPE_CAPABILITIES.map((capability) => capability.id)).toEqual([
      "accounts",
      "payments",
      "rescue",
      "reports",
      "routes",
      "forecasts",
      "location",
      "professional-advice",
    ]);
  });
});

describe("classifyScopeRequest", () => {
  const recognizedRequests: readonly [
    request: string,
    category: ScopeLimitationCategory,
    language: "en" | "ms",
  ][] = [
    ["Please send a rescue team", "rescue_dispatch", "en"],
    ["Hantar bantuan menyelamat", "rescue_dispatch", "ms"],
    ["Submit a flood report", "reports", "en"],
    ["Hantar laporan banjir", "reports", "ms"],
    ["Can I make a donation?", "payments", "en"],
    ["Saya mahu buat bayaran", "payments", "ms"],
    ["Help me create an account", "accounts", "en"],
    ["Bagaimana untuk log masuk?", "accounts", "ms"],
    ["Show me a safe route", "routes", "en"],
    ["Tunjuk saya laluan pemindahan", "routes", "ms"],
    ["Will this area flood?", "forecasts", "en"],
    ["Ramalkan paras air", "forecasts", "ms"],
    ["Is this area safe now?", "safety_guarantee", "en"],
    ["Adakah kawasan ini selamat?", "safety_guarantee", "ms"],
  ];

  it.each(recognizedRequests)(
    "classifies %s as %s without exposing the capability",
    (request, category, language) => {
      expect(classifyScopeRequest(request)).toEqual({
        kind: "scope_limitation",
        category,
        detectedLanguage: language,
      });
    },
  );

  it("rejects malformed or over-limit input and leaves ordinary preparedness requests unclassified", () => {
    expect(classifyScopeRequest(null)).toEqual({ kind: "invalid_request" });
    expect(classifyScopeRequest("\u0000send rescue")).toEqual({
      kind: "invalid_request",
    });
    expect(classifyScopeRequest("x".repeat(MAX_SCOPE_REQUEST_BYTES + 1))).toEqual({
      kind: "invalid_request",
    });
    expect(classifyScopeRequest("How much drinking water should I store?")).toEqual({
      kind: "not_scope_request",
    });
  });
});

describe("privacy and limitations views", () => {
  it("renders the English storage, retention, clear-data, and integration disclosures", () => {
    render(<PrivacyView language="en" />);

    expect(
      screen.getByRole("heading", { name: "The complete local-storage allowlist" }),
    ).toBeVisible();
    for (const field of STORAGE_FIELD_DISCLOSURES) {
      expect(screen.getByText(field.label.en)).toBeVisible();
    }
    expect(screen.getByText(/remains in this browser profile until/i)).toBeVisible();
    expect(screen.getByText(/removes every BanjirReady-prefixed key/i)).toBeVisible();
    expect(screen.getByText(/^None\. Baseline operation uses no analytics/i)).toBeVisible();
  });

  it("renders unavailable integrations, statuses, emergency limits, privacy behavior, and all exclusions in BM", () => {
    render(<LimitationsView language="ms" />);

    expect(
      screen.getByRole("heading", { name: "Integrasi langsung yang tidak tersedia" }),
    ).toBeVisible();
    for (const integration of OPTIONAL_INTEGRATION_REGISTRY) {
      expect(screen.getByText(integration.name.ms)).toBeVisible();
      expect(screen.getByText(integration.fallback.ms)).toBeVisible();
    }
    expect(screen.getByText("Panduan Demo")).toBeVisible();
    expect(screen.getByText("Panduan Disemak")).toBeVisible();
    expect(screen.getAllByText(/bukan pengendorsan kerajaan/i)).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Batasan kecemasan" })).toBeVisible();
    expect(screen.getByText(/tidak boleh menerima, menghantar, menjejak/i)).toBeVisible();
    for (const capability of OUT_OF_SCOPE_CAPABILITIES) {
      expect(screen.getByText(capability.title.ms)).toBeVisible();
      expect(screen.getByText(capability.detail.ms)).toBeVisible();
    }
  });

  it("opens each localized information view with native keyboard-operable controls", async () => {
    const user = userEvent.setup();
    render(<SafetyInformationViews language="en" />);

    const privacyControl = screen.getByText("Open privacy information");
    const limitationsControl = screen.getByText("Open limitations");

    await user.click(privacyControl);
    expect(screen.getByRole("heading", { name: "Privacy and local data" })).toBeVisible();

    await user.click(limitationsControl);
    expect(screen.getByRole("heading", { name: "Limitations" })).toBeVisible();
  });
});

describe("scope limitation rendering", () => {
  it("renders a localized unavailable state and never represents route planning as available", () => {
    render(
      <ClassifiedScopeLimitation
        language="ms"
        request="Tunjuk saya laluan pemindahan"
      />,
    );

    const notice = screen.getByRole("status", {
      name: "Perancangan laluan tidak tersedia",
    });
    expect(notice).toHaveAttribute("data-capability-available", "false");
    expect(within(notice).getByText(/tidak boleh mengira laluan pemindahan/i)).toBeVisible();
  });

  it("places and focuses bilingual emergency escalation before a rescue limitation", async () => {
    render(
      <ClassifiedScopeLimitation language="en" request="Please rescue me" />,
    );

    const notice = screen.getByRole("alert", {
      name: "Rescue dispatch is unavailable",
    });
    const emergencyHeading = within(notice).getByRole("heading", {
      name: "Get emergency help now / Dapatkan bantuan kecemasan sekarang",
    });
    const limitationHeading = within(notice).getByRole("heading", {
      name: "Rescue dispatch is unavailable",
    });

    expect(
      emergencyHeading.compareDocumentPosition(limitationHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(notice).getByRole("link", { name: "Call 999 / Hubungi 999" })).toHaveAttribute(
      "href",
      "tel:999",
    );
    expect(within(notice).getByText(/Demo Data \/ Data Demo/)).toBeVisible();
    expect(within(notice).getByText(/cannot receive, dispatch, track, or monitor/i)).toBeVisible();
    await waitFor(() => {
      expect(emergencyHeading).toHaveFocus();
    });
  });

  it("renders safe validation feedback for malformed input and nothing for ordinary requests", () => {
    const { rerender } = render(
      <ClassifiedScopeLimitation language="en" request={null} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The request was not accepted.");

    rerender(
      <ClassifiedScopeLimitation
        language="en"
        request="Show preparedness guidance"
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
