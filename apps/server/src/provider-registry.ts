import {
  parseProviderDescriptor,
  parseVersionIdentifier,
  type ProviderDescriptor,
  type VersionIdentifier,
} from "@banjir-ready/contracts";

export type OptionalProviderCapability =
  | "agency_data"
  | "external_model_synthesis"
  | "remote_semantic_retrieval";

export type OptionalIntegrationKind = "agency" | "external_model";

export type ProviderGateFailure =
  | "invalid_configuration"
  | "feature_disabled"
  | "endpoint_unapproved"
  | "permission_unverified"
  | "schema_unverified"
  | "server_secret_missing"
  | "provider_unavailable"
  | "fallback_policy_unverified"
  | "retention_terms_unverified"
  | "timeout_policy_unverified"
  | "record_identity_unverified"
  | "privacy_review_unverified"
  | "safety_review_unverified"
  | "response_contract_unverified"
  | "adapter_unavailable"
  | "adapter_descriptor_invalid";

interface CommonOptionalIntegrationApproval {
  readonly featureEnabled: boolean;
  readonly endpointApproved: boolean;
  readonly usagePermissionVerified: boolean;
  readonly schemaVersion: VersionIdentifier | null;
  readonly serverSecret: string | undefined;
  readonly availability: "available" | "unavailable";
  readonly fallbackPolicyVerified: boolean;
  readonly retentionTermsVerified: boolean;
  readonly timeoutPolicyVerified: boolean;
}

export interface AgencyIntegrationApproval
  extends CommonOptionalIntegrationApproval {
  readonly kind: "agency";
  readonly recordIdentityVerified: boolean;
}

export interface ExternalModelIntegrationApproval
  extends CommonOptionalIntegrationApproval {
  readonly kind: "external_model";
  readonly privacyReviewed: boolean;
  readonly safetySuitabilityReviewed: boolean;
  readonly responseContractVerified: boolean;
}

export type OptionalIntegrationApproval =
  | AgencyIntegrationApproval
  | ExternalModelIntegrationApproval;

export interface ProviderAdapterReference {
  readonly descriptor: Readonly<ProviderDescriptor>;
  readonly permitsOutboundNetwork: boolean;
}

export interface ProviderRegistryRegistration {
  readonly capability: OptionalProviderCapability;
  readonly providerName: string;
  readonly approval: unknown;
  readonly supportedSchemaVersions: readonly VersionIdentifier[];
  readonly liveAdapter: ProviderAdapterReference | null;
  readonly fallbackAdapter: ProviderAdapterReference;
}

export interface ProviderGateDecision {
  readonly selectable: boolean;
  readonly verification: "verified" | "unverified";
  readonly schemaVersion: VersionIdentifier | null;
  readonly failures: readonly ProviderGateFailure[];
}

export interface ProviderSelection {
  readonly capability: OptionalProviderCapability;
  readonly selectedMode: "live" | "fallback";
  readonly adapter: ProviderAdapterReference;
  readonly selectedDescriptor: Readonly<ProviderDescriptor>;
  readonly optionalDescriptor: Readonly<ProviderDescriptor>;
  readonly failures: readonly ProviderGateFailure[];
}

export interface ProviderResolution<TResult> {
  readonly selection: ProviderSelection;
  readonly result: TResult;
}

const CAPABILITY_KINDS: Readonly<
  Record<OptionalProviderCapability, OptionalIntegrationKind>
> = Object.freeze({
  agency_data: "agency",
  external_model_synthesis: "external_model",
  remote_semantic_retrieval: "external_model",
});

const COMMON_APPROVAL_KEYS = [
  "kind",
  "featureEnabled",
  "endpointApproved",
  "usagePermissionVerified",
  "schemaVersion",
  "serverSecret",
  "availability",
  "fallbackPolicyVerified",
  "retentionTermsVerified",
  "timeoutPolicyVerified",
] as const;

const KIND_APPROVAL_KEYS: Readonly<
  Record<OptionalIntegrationKind, readonly string[]>
> = Object.freeze({
  agency: [...COMMON_APPROVAL_KEYS, "recordIdentityVerified"],
  external_model: [
    ...COMMON_APPROVAL_KEYS,
    "privacyReviewed",
    "safetySuitabilityReviewed",
    "responseContractVerified",
  ],
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  const expected = new Set(expectedKeys);
  return (
    actualKeys.length === expected.size &&
    actualKeys.every((key) => expected.has(key))
  );
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readSchemaVersion(value: unknown): VersionIdentifier | null | undefined {
  if (value === null) return null;
  try {
    return parseVersionIdentifier(value);
  } catch {
    return undefined;
  }
}

function hasBoundedServerSecret(value: unknown): boolean {
  return (
    typeof value === "string" &&
    Buffer.byteLength(value, "utf8") > 0 &&
    Buffer.byteLength(value, "utf8") <= 4_096
  );
}

function hasKnownSchemaVersion(
  schemaVersion: VersionIdentifier | null,
  supportedSchemaVersions: readonly VersionIdentifier[],
): boolean {
  return (
    schemaVersion !== null && supportedSchemaVersions.includes(schemaVersion)
  );
}

function freezeDescriptor(input: unknown): Readonly<ProviderDescriptor> {
  return Object.freeze(parseProviderDescriptor(input));
}

function readApproval(
  expectedKind: OptionalIntegrationKind,
  input: unknown,
): {
  readonly valid: boolean;
  readonly values: Record<string, unknown>;
  readonly schemaVersion: VersionIdentifier | null;
  readonly serverSecretPresent: boolean;
} {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, KIND_APPROVAL_KEYS[expectedKind]) ||
    input.kind !== expectedKind
  ) {
    return {
      valid: false,
      values: Object.freeze({}),
      schemaVersion: null,
      serverSecretPresent: false,
    };
  }

  const schemaVersion = readSchemaVersion(input.schemaVersion);
  const commonValuesAreValid =
    isBoolean(input.featureEnabled) &&
    isBoolean(input.endpointApproved) &&
    isBoolean(input.usagePermissionVerified) &&
    schemaVersion !== undefined &&
    (input.serverSecret === undefined || typeof input.serverSecret === "string") &&
    (input.availability === "available" || input.availability === "unavailable") &&
    isBoolean(input.fallbackPolicyVerified) &&
    isBoolean(input.retentionTermsVerified) &&
    isBoolean(input.timeoutPolicyVerified);

  const kindValuesAreValid =
    expectedKind === "agency"
      ? isBoolean(input.recordIdentityVerified)
      : isBoolean(input.privacyReviewed) &&
        isBoolean(input.safetySuitabilityReviewed) &&
        isBoolean(input.responseContractVerified);

  return {
    valid: commonValuesAreValid && kindValuesAreValid,
    values: input,
    schemaVersion: schemaVersion ?? null,
    serverSecretPresent: hasBoundedServerSecret(input.serverSecret),
  };
}

export function evaluateOptionalIntegrationGate(
  expectedKind: OptionalIntegrationKind,
  approval: unknown,
  supportedSchemaVersions: readonly VersionIdentifier[],
): ProviderGateDecision {
  const parsedVersions: VersionIdentifier[] = [];
  try {
    for (const version of supportedSchemaVersions) {
      const parsed = parseVersionIdentifier(version);
      if (!parsedVersions.includes(parsed)) parsedVersions.push(parsed);
    }
  } catch {
    return Object.freeze({
      selectable: false,
      verification: "unverified" as const,
      schemaVersion: null,
      failures: Object.freeze(["invalid_configuration"] as const),
    });
  }

  const parsed = readApproval(expectedKind, approval);
  if (!parsed.valid) {
    return Object.freeze({
      selectable: false,
      verification: "unverified" as const,
      schemaVersion: null,
      failures: Object.freeze(["invalid_configuration"] as const),
    });
  }

  const values = parsed.values;
  const failures: ProviderGateFailure[] = [];
  if (!values.featureEnabled) failures.push("feature_disabled");
  if (!values.endpointApproved) failures.push("endpoint_unapproved");
  if (!values.usagePermissionVerified) failures.push("permission_unverified");
  if (!hasKnownSchemaVersion(parsed.schemaVersion, parsedVersions)) {
    failures.push("schema_unverified");
  }
  if (!parsed.serverSecretPresent) failures.push("server_secret_missing");
  if (values.availability !== "available") failures.push("provider_unavailable");
  if (!values.fallbackPolicyVerified) {
    failures.push("fallback_policy_unverified");
  }
  if (!values.retentionTermsVerified) {
    failures.push("retention_terms_unverified");
  }
  if (!values.timeoutPolicyVerified) {
    failures.push("timeout_policy_unverified");
  }

  if (expectedKind === "agency" && !values.recordIdentityVerified) {
    failures.push("record_identity_unverified");
  }
  if (expectedKind === "external_model") {
    if (!values.privacyReviewed) failures.push("privacy_review_unverified");
    if (!values.safetySuitabilityReviewed) {
      failures.push("safety_review_unverified");
    }
    if (!values.responseContractVerified) {
      failures.push("response_contract_unverified");
    }
  }

  const verificationFailures = new Set<ProviderGateFailure>([
    "endpoint_unapproved",
    "permission_unverified",
    "schema_unverified",
    "fallback_policy_unverified",
    "retention_terms_unverified",
    "timeout_policy_unverified",
    "record_identity_unverified",
    "privacy_review_unverified",
    "safety_review_unverified",
    "response_contract_unverified",
  ]);
  const verification = failures.some((failure) => verificationFailures.has(failure))
    ? "unverified"
    : "verified";

  return Object.freeze({
    selectable: failures.length === 0,
    verification,
    schemaVersion: parsed.schemaVersion,
    failures: Object.freeze([...failures]),
  });
}

function createFallbackAdapter(
  providerName: string,
): ProviderAdapterReference {
  return Object.freeze({
    descriptor: freezeDescriptor({
      providerName,
      providerMode: "demo",
      availability: "available",
      verification: "unverified",
      schemaVersion: "provider-schema-v1",
      fallbackProvider: providerName,
    }),
    permitsOutboundNetwork: false,
  });
}

export const DETERMINISTIC_FALLBACK_ADAPTERS = Object.freeze({
  agency: createFallbackAdapter("bundled-demo"),
  externalModel: createFallbackAdapter("deterministic-template"),
  remoteRetrieval: createFallbackAdapter("deterministic-local-retrieval"),
});

export const DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS = Object.freeze({
  agency: freezeDescriptor({
    providerName: "live-agency",
    providerMode: "live",
    availability: "unavailable",
    verification: "unverified",
    schemaVersion: null,
    fallbackProvider:
      DETERMINISTIC_FALLBACK_ADAPTERS.agency.descriptor.providerName,
  }),
  externalModel: freezeDescriptor({
    providerName: "external-model",
    providerMode: "live",
    availability: "unavailable",
    verification: "unverified",
    schemaVersion: null,
    fallbackProvider:
      DETERMINISTIC_FALLBACK_ADAPTERS.externalModel.descriptor.providerName,
  }),
  remoteRetrieval: freezeDescriptor({
    providerName: "remote-semantic-retrieval",
    providerMode: "live",
    availability: "unavailable",
    verification: "unverified",
    schemaVersion: null,
    fallbackProvider:
      DETERMINISTIC_FALLBACK_ADAPTERS.remoteRetrieval.descriptor.providerName,
  }),
});

function disabledApproval(
  kind: OptionalIntegrationKind,
): OptionalIntegrationApproval {
  const common = {
    featureEnabled: false,
    endpointApproved: false,
    usagePermissionVerified: false,
    schemaVersion: null,
    serverSecret: undefined,
    availability: "unavailable" as const,
    fallbackPolicyVerified: true,
    retentionTermsVerified: false,
    timeoutPolicyVerified: true,
  };

  return kind === "agency"
    ? Object.freeze({
        ...common,
        kind,
        recordIdentityVerified: false,
      })
    : Object.freeze({
        ...common,
        kind,
        privacyReviewed: false,
        safetySuitabilityReviewed: false,
        responseContractVerified: false,
      });
}

export const DEFAULT_OPTIONAL_PROVIDER_REGISTRATIONS: readonly ProviderRegistryRegistration[] =
  Object.freeze([
    Object.freeze({
      capability: "agency_data" as const,
      providerName: DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.agency.providerName,
      approval: disabledApproval("agency"),
      supportedSchemaVersions: Object.freeze([]),
      liveAdapter: null,
      fallbackAdapter: DETERMINISTIC_FALLBACK_ADAPTERS.agency,
    }),
    Object.freeze({
      capability: "external_model_synthesis" as const,
      providerName:
        DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.externalModel.providerName,
      approval: disabledApproval("external_model"),
      supportedSchemaVersions: Object.freeze([]),
      liveAdapter: null,
      fallbackAdapter: DETERMINISTIC_FALLBACK_ADAPTERS.externalModel,
    }),
    Object.freeze({
      capability: "remote_semantic_retrieval" as const,
      providerName:
        DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.remoteRetrieval.providerName,
      approval: disabledApproval("external_model"),
      supportedSchemaVersions: Object.freeze([]),
      liveAdapter: null,
      fallbackAdapter: DETERMINISTIC_FALLBACK_ADAPTERS.remoteRetrieval,
    }),
  ]);

function evaluateRegistration(
  registration: ProviderRegistryRegistration,
): ProviderSelection {
  const fallbackDescriptor = freezeDescriptor(registration.fallbackAdapter.descriptor);
  if (
    fallbackDescriptor.providerMode !== "demo" ||
    fallbackDescriptor.availability !== "available" ||
    registration.fallbackAdapter.permitsOutboundNetwork
  ) {
    throw new TypeError(
      "Provider registry fallback must be an available credential-free demo adapter",
    );
  }

  const gate = evaluateOptionalIntegrationGate(
    CAPABILITY_KINDS[registration.capability],
    registration.approval,
    registration.supportedSchemaVersions,
  );
  const failures = [...gate.failures];
  let validLiveDescriptor: Readonly<ProviderDescriptor> | null = null;

  if (registration.liveAdapter === null) {
    failures.push("adapter_unavailable");
  } else {
    try {
      const descriptor = freezeDescriptor(registration.liveAdapter.descriptor);
      const descriptorMatches =
        descriptor.providerName === registration.providerName &&
        descriptor.providerMode === "live" &&
        descriptor.availability === "available" &&
        descriptor.verification === "verified" &&
        descriptor.schemaVersion === gate.schemaVersion &&
        descriptor.fallbackProvider === fallbackDescriptor.providerName;
      if (descriptorMatches) validLiveDescriptor = descriptor;
      else failures.push("adapter_descriptor_invalid");
    } catch {
      failures.push("adapter_descriptor_invalid");
    }
  }

  if (
    gate.selectable &&
    validLiveDescriptor !== null &&
    registration.liveAdapter !== null
  ) {
    return Object.freeze({
      capability: registration.capability,
      selectedMode: "live" as const,
      adapter: registration.liveAdapter,
      selectedDescriptor: validLiveDescriptor,
      optionalDescriptor: validLiveDescriptor,
      failures: Object.freeze(failures),
    });
  }

  const optionalDescriptor = freezeDescriptor({
    providerName: registration.providerName,
    providerMode: "live",
    availability: "unavailable",
    verification: gate.verification,
    schemaVersion: gate.schemaVersion,
    fallbackProvider: fallbackDescriptor.providerName,
  });

  return Object.freeze({
    capability: registration.capability,
    selectedMode: "fallback" as const,
    adapter: registration.fallbackAdapter,
    selectedDescriptor: fallbackDescriptor,
    optionalDescriptor,
    failures: Object.freeze(failures),
  });
}

export class ProviderRegistry {
  readonly #selections: ReadonlyMap<OptionalProviderCapability, ProviderSelection>;

  constructor(
    registrations: readonly ProviderRegistryRegistration[] =
      DEFAULT_OPTIONAL_PROVIDER_REGISTRATIONS,
  ) {
    const selections = new Map<OptionalProviderCapability, ProviderSelection>();
    for (const registration of registrations) {
      if (selections.has(registration.capability)) {
        throw new TypeError("Provider registry capabilities must be unique");
      }
      selections.set(registration.capability, evaluateRegistration(registration));
    }
    this.#selections = selections;
    Object.freeze(this);
  }

  select(capability: OptionalProviderCapability): ProviderSelection {
    const selection = this.#selections.get(capability);
    if (selection === undefined) {
      throw new RangeError("Provider capability is not registered");
    }
    return selection;
  }

  listSelections(): readonly ProviderSelection[] {
    return Object.freeze([...this.#selections.values()]);
  }

  listOptionalDescriptors(): readonly Readonly<ProviderDescriptor>[] {
    return Object.freeze(
      [...this.#selections.values()].map(
        ({ optionalDescriptor }) => optionalDescriptor,
      ),
    );
  }

  async resolve<TResult>(
    capability: OptionalProviderCapability,
    invoke: (adapter: ProviderAdapterReference) => Promise<TResult> | TResult,
  ): Promise<ProviderResolution<TResult>> {
    const selection = this.select(capability);
    const result = await invoke(selection.adapter);
    return Object.freeze({ selection, result });
  }
}

export function createProviderRegistry(
  registrations: readonly ProviderRegistryRegistration[] =
    DEFAULT_OPTIONAL_PROVIDER_REGISTRATIONS,
): ProviderRegistry {
  return new ProviderRegistry(registrations);
}
