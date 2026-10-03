import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OPTIONAL_PROVIDER_MAX_RESPONSE_BYTES,
  OPTIONAL_PROVIDER_TIMEOUT_MS,
  executeOptionalProvider,
  type OptionalProviderDiagnostic,
  type OptionalProviderTransportResponse,
  type ProviderFailureCode,
} from "./optional-provider-boundary.js";

function jsonResponse(body: unknown): OptionalProviderTransportResponse {
  return {
    status: 200,
    contentType: "application/json; charset=utf-8",
    bodyText: JSON.stringify(body),
    redirected: false,
  };
}

function validateRecord(value: unknown): Readonly<{ recordId: string }> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Invalid provider record");
  }
  const record = value as Record<string, unknown>;
  const recordId = record.recordId;
  if (
    Object.keys(value).length !== 2 ||
    record.schemaVersion !== "agency-v1" ||
    typeof recordId !== "string"
  ) {
    throw new TypeError("Invalid provider record");
  }
  return Object.freeze({ recordId });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("optional provider boundary", () => {
  it("accepts only a bounded JSON transport response that passes runtime validation", async () => {
    const diagnostics: OptionalProviderDiagnostic[] = [];
    const result = await executeOptionalProvider({
      providerName: "approved-agency",
      providerMode: "live",
      attempt: async () =>
        jsonResponse({ schemaVersion: "agency-v1", recordId: "agency.123" }),
      validate: validateRecord,
      applyStalePolicy: (code) => ({ fallback: code }),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    expect(result).toEqual({
      kind: "provider_value",
      value: { recordId: "agency.123" },
      diagnostic: {
        providerName: "approved-agency",
        providerMode: "live",
        safeErrorCode: null,
      },
    });
    expect(diagnostics).toEqual([result.diagnostic]);
  });

  it.each([
    [
      "unsupported content type",
      {
        status: 200,
        contentType: "text/html",
        bodyText: '{"sentinel-provider-body":true}',
        redirected: false,
      },
    ],
    [
      "malformed JSON",
      {
        status: 200,
        contentType: "application/json",
        bodyText: '{"schemaVersion":',
        redirected: false,
      },
    ],
    [
      "redirect",
      {
        status: 200,
        contentType: "application/json",
        bodyText: "{}",
        redirected: true,
      },
    ],
    [
      "oversized body",
      {
        status: 200,
        contentType: "application/json",
        bodyText: "x".repeat(OPTIONAL_PROVIDER_MAX_RESPONSE_BYTES + 1),
        redirected: false,
      },
    ],
    [
      "missing required field",
      jsonResponse({ schemaVersion: "agency-v1" }),
    ],
    [
      "disallowed schema version",
      jsonResponse({ schemaVersion: "unknown-v9", recordId: "agency.123" }),
    ],
  ])("routes %s through stale policy without exposing the body", async (_name, response) => {
    const diagnostics: OptionalProviderDiagnostic[] = [];
    const fallbackCodes: ProviderFailureCode[] = [];
    const result = await executeOptionalProvider({
      providerName: "approved-agency",
      providerMode: "live",
      attempt: async () => response,
      validate: validateRecord,
      applyStalePolicy: (code) => {
        fallbackCodes.push(code);
        return { mode: "bundled-demo" as const };
      },
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    expect(result.kind).toBe("stale_policy_fallback");
    expect(fallbackCodes).toEqual(["PROVIDER_INVALID_RESPONSE"]);
    expect(diagnostics).toEqual([
      {
        providerName: "approved-agency",
        providerMode: "live",
        safeErrorCode: "PROVIDER_INVALID_RESPONSE",
      },
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain("sentinel-provider-body");
  });

  it("maps provider exceptions to a safe network failure and invokes stale policy", async () => {
    const result = await executeOptionalProvider({
      providerName: "approved-model",
      providerMode: "live",
      attempt: async () => {
        throw new Error(
          "Authorization Bearer sentinel-secret C:\\internal\\provider.ts",
        );
      },
      validate: validateRecord,
      applyStalePolicy: (code) => ({ safeCode: code }),
    });

    expect(result).toEqual({
      kind: "stale_policy_fallback",
      value: { safeCode: "SOURCE_UNAVAILABLE" },
      diagnostic: {
        providerName: "approved-model",
        providerMode: "live",
        safeErrorCode: "SOURCE_UNAVAILABLE",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /sentinel-secret|Authorization|internal|provider\.ts/,
    );
  });

  it("aborts at 3,000 ms and invokes stale policy with only the timeout code", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const diagnostics: OptionalProviderDiagnostic[] = [];
    const resultPromise = executeOptionalProvider({
      providerName: "approved-agency",
      providerMode: "live",
      attempt: async (attemptSignal) => {
        signal = attemptSignal;
        return new Promise<OptionalProviderTransportResponse>(() => undefined);
      },
      validate: validateRecord,
      applyStalePolicy: (code) => ({ safeCode: code }),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    await vi.advanceTimersByTimeAsync(OPTIONAL_PROVIDER_TIMEOUT_MS - 1);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const result = await resultPromise;

    expect(signal?.aborted).toBe(true);
    expect(result).toEqual({
      kind: "stale_policy_fallback",
      value: { safeCode: "PROVIDER_TIMEOUT" },
      diagnostic: {
        providerName: "approved-agency",
        providerMode: "live",
        safeErrorCode: "PROVIDER_TIMEOUT",
      },
    });
    expect(diagnostics).toEqual([result.diagnostic]);
  });
});
