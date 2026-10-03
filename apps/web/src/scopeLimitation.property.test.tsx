import "@testing-library/jest-dom/vitest";

import { render, within } from "@testing-library/react";
import {
  assert,
  constantFrom,
  property,
  record,
} from "fast-check";
import { describe, expect, it } from "vitest";

import { createSeededPropertyTestControls } from "@banjir-ready/test-support";

import { ClassifiedScopeLimitation } from "./SafetyInformationViews";
import {
  classifyScopeRequest,
  SCOPE_LIMITATION_COPY,
  type ScopeLimitationCategory,
} from "./scopeLimitation";

interface RecognizedScopeRequest {
  readonly request: string;
  readonly category: ScopeLimitationCategory;
  readonly language: "en" | "ms";
}

const RECOGNIZED_SCOPE_REQUESTS = [
  { request: "send a rescue team", category: "rescue_dispatch", language: "en" },
  { request: "hantar bantuan menyelamat", category: "rescue_dispatch", language: "ms" },
  { request: "submit a flood report", category: "reports", language: "en" },
  { request: "hantar laporan banjir", category: "reports", language: "ms" },
  { request: "make a donation", category: "payments", language: "en" },
  { request: "buat bayaran", category: "payments", language: "ms" },
  { request: "create an account", category: "accounts", language: "en" },
  { request: "log masuk", category: "accounts", language: "ms" },
  { request: "show me a safe route", category: "routes", language: "en" },
  { request: "tunjuk saya laluan pemindahan", category: "routes", language: "ms" },
  { request: "predict the flood", category: "forecasts", language: "en" },
  { request: "ramalkan paras air", category: "forecasts", language: "ms" },
  { request: "is this area safe now", category: "safety_guarantee", language: "en" },
  { request: "adakah kawasan ini selamat", category: "safety_guarantee", language: "ms" },
] as const satisfies readonly RecognizedScopeRequest[];

const scopeRequestArbitrary = record({
  recognized: constantFrom(...RECOGNIZED_SCOPE_REQUESTS),
  casing: constantFrom("original", "lower", "upper"),
  separator: constantFrom(" ", "  ", "\t", " - "),
  leading: constantFrom("", " ", "Please: ", "Sila: "),
  trailing: constantFrom("", ".", "?", "!", " now!", " sekarang!"),
}).map(({ casing, leading, recognized, separator, trailing }) => {
  const separated = recognized.request.replaceAll(" ", separator);
  const request =
    casing === "upper"
      ? separated.toLocaleUpperCase()
      : casing === "lower"
        ? separated.toLocaleLowerCase()
        : separated;

  return {
    ...recognized,
    request: `${leading}${request}${trailing}`,
  };
});

const propertyControls = createSeededPropertyTestControls();

describe("Property 1: Out-of-scope requests fail closed", () => {
  // Feature: banjir-ready-mvp, Property 1: Out-of-scope requests fail closed
  // **Validates: Requirements 1.6**
  it("shows the applicable BM or English limitation without exposing the requested capability", () => {
    assert(
      property(scopeRequestArbitrary, ({ category, language, request }) => {
        expect(classifyScopeRequest(request)).toEqual({
          kind: "scope_limitation",
          category,
          detectedLanguage: language,
        });

        const view = render(
          <ClassifiedScopeLimitation language={language} request={request} />,
        );

        try {
          const limitation = SCOPE_LIMITATION_COPY[category];
          const notice = view.getByRole(
            category === "rescue_dispatch" ? "alert" : "status",
            { name: limitation.title[language] },
          );

          expect(notice).toHaveAttribute("data-capability-available", "false");
          expect(
            within(notice).getByRole("heading", {
              name: limitation.title[language],
            }),
          ).toBeVisible();
          expect(within(notice).getByText(limitation.detail[language])).toBeVisible();
          expect(
            view.container.querySelector('[data-capability-available="true"]'),
          ).not.toBeInTheDocument();
        } finally {
          view.unmount();
        }
      }),
      propertyControls,
    );
  });
});
