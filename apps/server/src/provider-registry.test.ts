import { parseProviderDescriptor } from "@banjir-ready/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_OPTIONAL_PROVIDER_REGISTRATIONS,
  DETERMINISTIC_FALLBACK_ADAPTERS,
  DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS,
  createProviderRegistry,
  evaluateOptionalIntegrationGate,
  type AgencyIntegrationApproval,
  type ExternalModelIntegrationApproval,
  type OptionalProviderCapability,
  type ProviderAdapterReference,
  type ProviderRegistryRegistration,
} from "./provider-registry.js";

interface ExecutableAdapter extends ProviderAdapterReference {
  readonly run: () => Promise<string>;
}

const AGENCY_SCHEMA_VERSION = "agency-provider-schema-v1";
const MODEL_SCHEMA_VERSION = "external-model-schema-v1";

function availableAgencyApproval(): AgencyIntegrationApproval {
  return {
    kind: "agency",
    featureEnabled: true,
    endpointApproved: true,
    usagePermissionVerified: true,
    schemaVersion: AGENCY_SCHEMA_VERSION,
    serverSecret: "server-only-agency-secret",
    availability: "available",
    fallbackPolicyVerified: true,
    retentionTermsVerified: true,
    timeoutPolicyVerified: true,
    recordIdentityVerified: true,
  };
}

function availableModelApproval(): ExternalModelIntegrationApproval {
  return {
    kind: "external_model",
    featureEnabled: true,
    endpointApproved: true,
    usagePermissionVerified: true,
    schemaVersion: MODEL_SCHEMA_VERSION,
    serverSecret: "server-only-model-secret",
    availability: "available",
    fallbackPolicyVerified: true,
    retentionTermsVerified: true,
    timeoutPolicyVerified: true,
    privacyReviewed: true,
    safetySuitabilityReviewed: true,
    responseContractVerified: true,
  };
}

function executableAdapter(
  providerName: string,
  providerMode: "demo" | "live",
  schemaVersion: string,
  fallbackProvider: string,
  run: () => Promise<string>,
): ExecutableAdapter {
  return {
    descriptor: parseProviderDescriptor({
      providerName,
      providerMode,
      availability: "available",
      verification: providerMode === "live" ? "verified" : "unverified",
      schemaVersion,
      fallbackProvider,
    }),
    permitsOutboundNetwork: providerMode === "live",
    run,
  };
}

function registration(
  capability: OptionalProviderCapability,
  providerName: string,
  approval: unknown,
  supportedSchemaVersion: string,
  liveAdapter: ProviderAdapterReference | null,
  fallbackAdapter: ProviderAdapterReference,
): ProviderRegistryRegistration {
  return {
    capability,
    providerName,
    approval,
    supportedSchemaVersions: [supportedSchemaVersion],
    liveAdapter,
    fallbackAdapter,
  };
}

describe("ProviderRegistry", () => {
  it("publishes disabled agency/model descriptors and selects every deterministic default fallback", () => {
    const registry = createProviderRegistry();

    expect(DEFAULT_OPTIONAL_PROVIDER_REGISTRATIONS).toHaveLength(3);
    expect(registry.listOptionalDescriptors()).toEqual([
      DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.agency,
      DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.externalModel,
      DISABLED_OPTIONAL_PROVIDER_DESCRIPTORS.remoteRetrieval,
    ]);

    expect(registry.select("agency_data")).toMatchObject({
      selectedMode: "fallback",
      selectedDescriptor: { providerName: "bundled-demo" },
      optionalDescriptor: {
        providerName: "live-agency",
        providerMode: "live",
        availability: "unavailable",
        verification: "unverified",
      },
    });
    expect(registry.select("external_model_synthesis")).toMatchObject({
      selectedMode: "fallback",
      selectedDescriptor: { providerName: "deterministic-template" },
    });
    expect(registry.select("remote_semantic_retrieval")).toMatchObject({
      selectedMode: "fallback",
      selectedDescriptor: { providerName: "deterministic-local-retrieval" },
    });

    for (const capability of [
      "agency_data",
      "external_model_synthesis",
      "remote_semantic_retrieval",
    ] as const) {
      const selection = registry.select(capability);
      expect(selection.adapter.permitsOutboundNetwork).toBe(false);
      expect(selection.failures).toContain("adapter_unavailable");
    }
  });

  it.each([
    ["feature enablement", { featureEnabled: false }, "feature_disabled"],
    ["endpoint approval", { endpointApproved: false }, "endpoint_unapproved"],
    [
      "usage permission",
      { usagePermissionVerified: false },
      "permission_unverified",
    ],
    ["known schema", { schemaVersion: null }, "schema_unverified"],
    ["server secret", { serverSecret: undefined }, "server_secret_missing"],
    [
      "provider availability",
      { availability: "unavailable" },
      "provider_unavailable",
    ],
  ] as const)(
    "fails closed to the agency fallback without %s",
    async (_name, change, expectedFailure) => {
      const liveRun = vi.fn(async () => "live");
      const fallbackRun = vi.fn(async () => "fallback");
      const fallback = executableAdapter(
        "bundled-demo",
        "demo",
        "provider-schema-v1",
        "bundled-demo",
        fallbackRun,
      );
      const live = executableAdapter(
        "approved-agency",
        "live",
        AGENCY_SCHEMA_VERSION,
        "bundled-demo",
        liveRun,
      );
      const approval = { ...availableAgencyApproval(), ...change };
      const registry = createProviderRegistry([
        registration(
          "agency_data",
          "approved-agency",
          approval,
          AGENCY_SCHEMA_VERSION,
          live,
          fallback,
        ),
      ]);

      const resolution = await registry.resolve("agency_data", (adapter) =>
        (adapter as ExecutableAdapter).run(),
      );

      expect(resolution.result).toBe("fallback");
      expect(resolution.selection.failures).toContain(expectedFailure);
      expect(liveRun).not.toHaveBeenCalled();
      expect(fallbackRun).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["record identity", { recordIdentityVerified: false }, "record_identity_unverified"],
    ["fallback policy", { fallbackPolicyVerified: false }, "fallback_policy_unverified"],
    ["retention terms", { retentionTermsVerified: false }, "retention_terms_unverified"],
    ["timeout policy", { timeoutPolicyVerified: false }, "timeout_policy_unverified"],
  ] as const)(
    "requires verified agency %s evidence",
    (_name, change, expectedFailure) => {
      const decision = evaluateOptionalIntegrationGate(
        "agency",
        { ...availableAgencyApproval(), ...change },
        [AGENCY_SCHEMA_VERSION],
      );

      expect(decision).toMatchObject({
        selectable: false,
        verification: "unverified",
      });
      expect(decision.failures).toContain(expectedFailure);
    },
  );

  it.each([
    ["privacy", { privacyReviewed: false }, "privacy_review_unverified"],
    [
      "safety suitability",
      { safetySuitabilityReviewed: false },
      "safety_review_unverified",
    ],
    [
      "response contract",
      { responseContractVerified: false },
      "response_contract_unverified",
    ],
  ] as const)(
    "requires verified external-model %s evidence",
    (_name, change, expectedFailure) => {
      const decision = evaluateOptionalIntegrationGate(
        "external_model",
        { ...availableModelApproval(), ...change },
        [MODEL_SCHEMA_VERSION],
      );

      expect(decision).toMatchObject({
        selectable: false,
        verification: "unverified",
      });
      expect(decision.failures).toContain(expectedFailure);
    },
  );

  it("selects a live agency adapter only when every gate and descriptor agrees", async () => {
    const liveRun = vi.fn(async () => "live-agency-result");
    const fallbackRun = vi.fn(async () => "fallback-result");
    const fallback = executableAdapter(
      "bundled-demo",
      "demo",
      "provider-schema-v1",
      "bundled-demo",
      fallbackRun,
    );
    const live = executableAdapter(
      "approved-agency",
      "live",
      AGENCY_SCHEMA_VERSION,
      "bundled-demo",
      liveRun,
    );
    const registry = createProviderRegistry([
      registration(
        "agency_data",
        "approved-agency",
        availableAgencyApproval(),
        AGENCY_SCHEMA_VERSION,
        live,
        fallback,
      ),
    ]);

    const resolution = await registry.resolve("agency_data", (adapter) =>
      (adapter as ExecutableAdapter).run(),
    );

    expect(resolution.result).toBe("live-agency-result");
    expect(resolution.selection).toMatchObject({
      selectedMode: "live",
      failures: [],
      optionalDescriptor: {
        providerName: "approved-agency",
        providerMode: "live",
        availability: "available",
        verification: "verified",
        schemaVersion: AGENCY_SCHEMA_VERSION,
        fallbackProvider: "bundled-demo",
      },
    });
    expect(resolution.selection.adapter).toBe(live);
    expect(liveRun).toHaveBeenCalledOnce();
    expect(fallbackRun).not.toHaveBeenCalled();
  });

  it("selects an external model only after retention, privacy, safety, and response-contract approval", () => {
    const fallback = DETERMINISTIC_FALLBACK_ADAPTERS.externalModel;
    const live = executableAdapter(
      "approved-external-model",
      "live",
      MODEL_SCHEMA_VERSION,
      fallback.descriptor.providerName,
      vi.fn(async () => "external"),
    );
    const registry = createProviderRegistry([
      registration(
        "external_model_synthesis",
        "approved-external-model",
        availableModelApproval(),
        MODEL_SCHEMA_VERSION,
        live,
        fallback,
      ),
    ]);

    expect(registry.select("external_model_synthesis")).toMatchObject({
      selectedMode: "live",
      failures: [],
      selectedDescriptor: {
        providerName: "approved-external-model",
        fallbackProvider: "deterministic-template",
      },
    });
  });

  it("rejects mismatched live descriptors and malformed optional configuration without blocking fallback", () => {
    const mismatchedLive = executableAdapter(
      "different-provider",
      "live",
      AGENCY_SCHEMA_VERSION,
      "bundled-demo",
      vi.fn(async () => "must-not-run"),
    );
    const malformedApproval = {
      ...availableAgencyApproval(),
      authorization: "must-not-be-accepted",
    };
    const registry = createProviderRegistry([
      registration(
        "agency_data",
        "approved-agency",
        malformedApproval,
        AGENCY_SCHEMA_VERSION,
        mismatchedLive,
        DETERMINISTIC_FALLBACK_ADAPTERS.agency,
      ),
    ]);

    expect(registry.select("agency_data")).toMatchObject({
      selectedMode: "fallback",
      failures: ["invalid_configuration", "adapter_descriptor_invalid"],
      optionalDescriptor: {
        availability: "unavailable",
        verification: "unverified",
      },
    });
  });

  it("does not retain or project server secret material in gate decisions or selections", () => {
    const sentinel = "sentinel-private-server-secret";
    const approval = { ...availableModelApproval(), serverSecret: sentinel };
    const decision = evaluateOptionalIntegrationGate(
      "external_model",
      approval,
      [MODEL_SCHEMA_VERSION],
    );
    const registry = createProviderRegistry([
      registration(
        "external_model_synthesis",
        "external-model",
        approval,
        MODEL_SCHEMA_VERSION,
        null,
        DETERMINISTIC_FALLBACK_ADAPTERS.externalModel,
      ),
    ]);

    expect(JSON.stringify(decision)).not.toContain(sentinel);
    expect(JSON.stringify(registry.select("external_model_synthesis"))).not.toContain(
      sentinel,
    );
    expect(JSON.stringify(registry)).not.toContain(sentinel);
  });
});
