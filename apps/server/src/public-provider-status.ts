import {
  parseProviderStatus,
  parseProviderStatusResponse,
  type ApiErrorCode,
  type FreshnessState,
  type ProviderDescriptor,
  type ProviderStatus,
  type ProviderStatusResponse,
} from "@banjir-ready/contracts";

import {
  createProviderRegistry,
  type OptionalProviderCapability,
  type ProviderRegistry,
  type ProviderSelection,
} from "./provider-registry.js";
import type { HttpBoundaryHandler } from "./http-boundary.js";

export interface ProviderRuntimeStatus {
  readonly freshness: FreshnessState;
  readonly nonSecretErrorCode: ApiErrorCode | null;
}

export type ProviderRuntimeStatusByCapability = Readonly<
  Partial<Record<OptionalProviderCapability, ProviderRuntimeStatus>>
>;

export interface PublicProviderStatusInput {
  readonly descriptor: Readonly<ProviderDescriptor>;
  readonly freshness: unknown;
  readonly nonSecretErrorCode: unknown;
}

export interface ProviderStatusHandlerOptions {
  readonly registry?: ProviderRegistry;
  readonly getRuntimeStatus?: () => ProviderRuntimeStatusByCapability;
}

/**
 * Copies only the browser-approved provider allowlist. Unknown internal
 * diagnostics on the caller's input cannot enter the serialized result.
 */
export function projectPublicProviderStatus(
  input: PublicProviderStatusInput,
): Readonly<ProviderStatus> {
  const descriptor = input.descriptor;
  return Object.freeze(
    parseProviderStatus({
      providerName: descriptor.providerName,
      providerMode: descriptor.providerMode,
      availability: descriptor.availability,
      verification: descriptor.verification,
      freshness: input.freshness,
      fallbackProvider: descriptor.fallbackProvider,
      nonSecretErrorCode: input.nonSecretErrorCode,
    }),
  );
}

function defaultRuntimeStatus(
  selection: ProviderSelection,
): ProviderRuntimeStatus {
  return Object.freeze({
    freshness:
      selection.selectedMode === "live" ? "current" : "unavailable",
    nonSecretErrorCode: null,
  });
}

export function createPublicProviderStatusResponse(
  registry: ProviderRegistry,
  requestId: string,
  runtimeStatus: ProviderRuntimeStatusByCapability = {},
): Readonly<ProviderStatusResponse> {
  const providers = registry.listSelections().map((selection) => {
    const runtime =
      runtimeStatus[selection.capability] ?? defaultRuntimeStatus(selection);
    return projectPublicProviderStatus({
      descriptor: selection.optionalDescriptor,
      freshness: runtime.freshness,
      nonSecretErrorCode: runtime.nonSecretErrorCode,
    });
  });

  return Object.freeze(
    parseProviderStatusResponse({
      ok: true,
      requestId,
      providers,
    }),
  );
}

/** Creates the strict GET /api/v1/status handler used by HttpBoundary. */
export function createProviderStatusHandler(
  options: ProviderStatusHandlerOptions = {},
): HttpBoundaryHandler {
  const registry = options.registry ?? createProviderRegistry();

  return (_request, response) => {
    const runtimeStatus = options.getRuntimeStatus?.() ?? {};
    const payload = createPublicProviderStatusResponse(
      registry,
      response.locals.requestId,
      runtimeStatus,
    );
    response.status(200).json(payload);
  };
}
