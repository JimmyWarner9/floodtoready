import type { ApiErrorCode } from "@banjir-ready/contracts";

export const OPTIONAL_PROVIDER_TIMEOUT_MS = 3_000;
export const OPTIONAL_PROVIDER_MAX_RESPONSE_BYTES = 256 * 1_024;

export type OptionalProviderMode = "demo" | "live";
export type ProviderFailureCode = Extract<
  ApiErrorCode,
  "PROVIDER_TIMEOUT" | "PROVIDER_INVALID_RESPONSE" | "SOURCE_UNAVAILABLE"
>;

export interface OptionalProviderIdentity {
  readonly providerName: string;
  readonly providerMode: OptionalProviderMode;
}

export interface OptionalProviderTransportResponse {
  readonly status: number;
  readonly contentType: string;
  readonly bodyText: string;
  readonly redirected: boolean;
}

export interface OptionalProviderDiagnostic extends OptionalProviderIdentity {
  readonly safeErrorCode: ProviderFailureCode | null;
}

export interface OptionalProviderBoundaryOptions<TValue, TFallback>
  extends OptionalProviderIdentity {
  readonly attempt: (
    signal: AbortSignal,
  ) => Promise<OptionalProviderTransportResponse>;
  readonly validate: (untrustedBody: unknown) => TValue;
  readonly applyStalePolicy: (
    safeErrorCode: ProviderFailureCode,
  ) => TFallback | Promise<TFallback>;
  readonly onDiagnostic?: (diagnostic: OptionalProviderDiagnostic) => void;
}

export type OptionalProviderBoundaryResult<TValue, TFallback> =
  | Readonly<{
      kind: "provider_value";
      value: TValue;
      diagnostic: OptionalProviderDiagnostic;
    }>
  | Readonly<{
      kind: "stale_policy_fallback";
      value: TFallback;
      diagnostic: OptionalProviderDiagnostic;
    }>;

const SAFE_PROVIDER_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset=utf-8)?$/i;

function assertProviderIdentity(
  providerName: string,
  providerMode: OptionalProviderMode,
): void {
  if (!SAFE_PROVIDER_NAME.test(providerName)) {
    throw new TypeError("Provider name must be a safe identifier");
  }
  if (providerMode !== "demo" && providerMode !== "live") {
    throw new TypeError("Provider mode is invalid");
  }
}

function freezeDiagnostic(
  identity: OptionalProviderIdentity,
  safeErrorCode: ProviderFailureCode | null,
): OptionalProviderDiagnostic {
  return Object.freeze({
    providerName: identity.providerName,
    providerMode: identity.providerMode,
    safeErrorCode,
  });
}

function publishDiagnostic(
  diagnostic: OptionalProviderDiagnostic,
  listener: OptionalProviderBoundaryOptions<unknown, unknown>["onDiagnostic"],
): void {
  if (listener === undefined) return;
  try {
    listener(diagnostic);
  } catch {
    // Diagnostics must never affect provider fallback behavior.
  }
}

function parseTransportResponse(response: unknown): unknown {
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    throw new TypeError("Provider response envelope is invalid");
  }

  const value = response as Record<string, unknown>;
  const expectedKeys = ["status", "contentType", "bodyText", "redirected"];
  const actualKeys = Object.keys(value);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key))
  ) {
    throw new TypeError("Provider response envelope is invalid");
  }

  if (
    typeof value.status !== "number" ||
    !Number.isInteger(value.status) ||
    value.status < 200 ||
    value.status > 299 ||
    typeof value.contentType !== "string" ||
    !JSON_CONTENT_TYPE.test(value.contentType) ||
    typeof value.bodyText !== "string" ||
    typeof value.redirected !== "boolean" ||
    value.redirected
  ) {
    throw new TypeError("Provider response metadata is invalid");
  }

  if (
    Buffer.byteLength(value.bodyText, "utf8") >
    OPTIONAL_PROVIDER_MAX_RESPONSE_BYTES
  ) {
    throw new RangeError("Provider response exceeds the size limit");
  }

  return JSON.parse(value.bodyText) as unknown;
}

async function applyFallback<TFallback>(
  options: OptionalProviderBoundaryOptions<unknown, TFallback>,
  safeErrorCode: ProviderFailureCode,
): Promise<OptionalProviderBoundaryResult<never, TFallback>> {
  const diagnostic = freezeDiagnostic(options, safeErrorCode);
  publishDiagnostic(diagnostic, options.onDiagnostic);
  const value = await options.applyStalePolicy(safeErrorCode);
  return Object.freeze({
    kind: "stale_policy_fallback",
    value,
    diagnostic,
  });
}

export async function executeOptionalProvider<TValue, TFallback>(
  options: OptionalProviderBoundaryOptions<TValue, TFallback>,
): Promise<OptionalProviderBoundaryResult<TValue, TFallback>> {
  assertProviderIdentity(options.providerName, options.providerMode);

  const abortController = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      abortController.abort();
      reject(new Error("PROVIDER_TIMEOUT"));
    }, OPTIONAL_PROVIDER_TIMEOUT_MS);
    timeoutHandle.unref?.();
  });

  let response: OptionalProviderTransportResponse;
  try {
    response = await Promise.race([
      options.attempt(abortController.signal),
      timeout,
    ]);
  } catch {
    return applyFallback(
      options,
      timedOut ? "PROVIDER_TIMEOUT" : "SOURCE_UNAVAILABLE",
    );
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }

  try {
    const untrustedBody = parseTransportResponse(response);
    const value = options.validate(untrustedBody);
    const diagnostic = freezeDiagnostic(options, null);
    publishDiagnostic(diagnostic, options.onDiagnostic);
    return Object.freeze({ kind: "provider_value", value, diagnostic });
  } catch {
    return applyFallback(options, "PROVIDER_INVALID_RESPONSE");
  }
}
