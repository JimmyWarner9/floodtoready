import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  normalizeGuidanceRecord,
  parseAgencyRecord,
  parseApiError,
  parseChatResponse,
  parseChecklistRuleSet,
  parseFreshnessPolicy,
  parseGuidanceRecord,
  parseLocalState,
  parseProviderDescriptor,
  parseProviderStatus,
  parseProviderStatusResponse,
  parseSituationRecord,
  type SourceRef,
} from "./schemas.js";

const source: SourceRef = {
  sourceId: "source.public-guidance",
  title: "Public flood guidance",
  organization: "Example authority",
  url: "https://example.test/guidance",
  sourceDate: "2025-01-01T00:00:00.000Z",
};

const demoProvenance = {
  providerName: "bundled-situation",
  providerMode: "demo" as const,
  dataClass: "Demo_Data" as const,
  sourceTimestamp: "2025-01-01T00:00:00.000Z",
  retrievalTimestamp: "2025-01-01T00:05:00.000Z",
  freshness: "stale" as const,
  fixtureVersion: "situation-v1",
};

const demoGuidance = {
  recordId: "guidance.before-flood",
  language: "en" as const,
  contentVersion: "guidance-v1",
  titleKey: "guidance.beforeFlood.title",
  body: "Prepare essential supplies before flooding occurs.",
  tags: ["before-flood"],
  status: "Demo_Guidance" as const,
  review: null,
  sources: [source],
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const completeReview = {
  reviewerName: "Example Reviewer",
  reviewerOrganizationOrQualification: "Flood preparedness specialist",
  reviewDate: "2025-01-02T00:00:00.000Z",
  contentVersion: "guidance-v1",
  sources: [source],
};

const demoCitation = {
  citationId: "citation.1",
  corpusRecordId: "corpus.before-flood",
  corpusVersion: "corpus-v1",
  language: "en" as const,
  source,
  excerpt: "Prepare essential supplies.",
  guidanceStatus: "Demo_Guidance" as const,
  freshness: "stale" as const,
  dataClass: "Demo_Data" as const,
};

describe("shared boundary schemas", () => {
  it("normalizes complete review evidence to reviewed guidance", () => {
    const normalized = normalizeGuidanceRecord({
      ...demoGuidance,
      review: completeReview,
    });

    expect(normalized.status).toBe("Reviewed_Guidance");
    if (normalized.status === "Reviewed_Guidance") {
      expect(normalized.review).toEqual(completeReview);
    }
  });

  it("normalizes missing, incomplete, invalid, or version-mismatched review metadata to demo guidance", () => {
    const incompleteReviews: readonly unknown[] = [
      undefined,
      null,
      { ...completeReview, reviewerName: "" },
      { ...completeReview, reviewerOrganizationOrQualification: undefined },
      { ...completeReview, reviewDate: "not-a-date" },
      { ...completeReview, sources: [] },
      { ...completeReview, contentVersion: "other-version" },
    ];

    for (const review of incompleteReviews) {
      const normalized = normalizeGuidanceRecord({
        ...demoGuidance,
        status: "Reviewed_Guidance",
        review,
      });

      expect(normalized).toMatchObject({
        status: "Demo_Guidance",
        review: null,
      });
    }
  });

  it("rejects malformed guidance fields instead of partially normalizing content", () => {
    expect(() =>
      normalizeGuidanceRecord({
        ...demoGuidance,
        review: null,
        authorization: "must-not-pass",
      }),
    ).toThrow(ZodError);
  });

  it("accepts a reviewed guidance record only with complete matching review metadata", () => {
    const parsed = parseGuidanceRecord({
      ...demoGuidance,
      status: "Reviewed_Guidance",
      review: completeReview,
    });

    expect(parsed.status).toBe("Reviewed_Guidance");
    if (parsed.status === "Reviewed_Guidance") {
      expect(parsed.review.reviewerName).toBe("Example Reviewer");
    }
  });

  it("rejects unknown fields at top-level and nested guidance boundaries", () => {
    expect(() =>
      parseGuidanceRecord({ ...demoGuidance, chatbotText: "must not pass" }),
    ).toThrow(ZodError);

    expect(() =>
      parseGuidanceRecord({
        ...demoGuidance,
        sources: [{ ...source, authorization: "secret" }],
      }),
    ).toThrow(ZodError);
  });

  it("rejects illegal guidance status and review combinations", () => {
    expect(() =>
      parseGuidanceRecord({
        ...demoGuidance,
        status: "Reviewed_Guidance",
        review: null,
      }),
    ).toThrow(ZodError);

    expect(() =>
      parseGuidanceRecord({
        ...demoGuidance,
        status: "Demo_Guidance",
        review: completeReview,
      }),
    ).toThrow(ZodError);

    expect(() =>
      parseGuidanceRecord({
        ...demoGuidance,
        status: "Reviewed_Guidance",
        review: { ...completeReview, contentVersion: "other-version" },
      }),
    ).toThrow(ZodError);
  });

  it("enforces complete, non-negative freshness policies", () => {
    expect(
      parseFreshnessPolicy({
        category: "alert_like",
        maxAgeMs: 1_800_000,
        behavior: "warn_and_use",
      }),
    ).toEqual({
      category: "alert_like",
      maxAgeMs: 1_800_000,
      behavior: "warn_and_use",
    });

    expect(() =>
      parseFreshnessPolicy({
        category: "alert_like",
        maxAgeMs: -1,
        behavior: "warn_and_use",
      }),
    ).toThrow(ZodError);
  });

  it("rejects unverified providers represented as available live providers", () => {
    expect(() =>
      parseProviderDescriptor({
        providerName: "unapproved-live-feed",
        providerMode: "live",
        availability: "available",
        verification: "unverified",
        schemaVersion: "v1",
        fallbackProvider: "bundled-situation",
      }),
    ).toThrow(ZodError);

    expect(
      parseProviderDescriptor({
        providerName: "unapproved-live-feed",
        providerMode: "live",
        availability: "unavailable",
        verification: "unverified",
        schemaVersion: null,
        fallbackProvider: "bundled-situation",
      }).availability,
    ).toBe("unavailable");
  });

  it("keeps situation channels structurally separate", () => {
    const rainfall = parseSituationRecord({
      kind: "rainfall_observation",
      recordId: "rain.station-1.2025-01-01",
      stationId: "station-1",
      stationName: "Example station",
      amountMm: 12.5,
      intervalMinutes: 60,
      observedAt: "2025-01-01T00:00:00.000Z",
      source,
      provenance: demoProvenance,
    });
    expect(rainfall.kind).toBe("rainfall_observation");

    expect(() =>
      parseSituationRecord({
        kind: "official_warning",
        recordId: "rain.station-1.2025-01-01",
        stationId: "station-1",
        stationName: "Example station",
        amountMm: 12.5,
        intervalMinutes: 60,
        observedAt: "2025-01-01T00:00:00.000Z",
        source,
        provenance: demoProvenance,
      }),
    ).toThrow(ZodError);
  });

  it("rejects checklist rules that reference unknown or mismatched item IDs", () => {
    const validRuleSet = {
      version: "checklist-v1",
      baselineItemIds: ["item.water"],
      rules: [
        {
          ruleId: "rule.pets",
          predicate: {
            match: "all",
            conditions: [
              { kind: "boolean", field: "hasPets", value: true },
            ],
          },
          itemIds: ["item.pet-supplies"],
          priority: 10,
        },
      ],
      items: {
        "item.water": {
          itemId: "item.water",
          wordingKey: "checklist.water",
          sourceRefs: [source],
          guidanceStatus: "Demo_Guidance",
        },
        "item.pet-supplies": {
          itemId: "item.pet-supplies",
          wordingKey: "checklist.petSupplies",
          sourceRefs: [source],
          guidanceStatus: "Demo_Guidance",
        },
      },
    };

    expect(parseChecklistRuleSet(validRuleSet).version).toBe("checklist-v1");
    expect(() =>
      parseChecklistRuleSet({
        ...validRuleSet,
        baselineItemIds: ["item.unknown"],
      }),
    ).toThrow(ZodError);
    expect(() =>
      parseChecklistRuleSet({
        ...validRuleSet,
        items: {
          ...validRuleSet.items,
          "item.water": {
            ...validRuleSet.items["item.water"],
            itemId: "item.other",
          },
        },
      }),
    ).toThrow(ZodError);
  });

  it("requires agency status to agree with review metadata", () => {
    const agency = {
      recordId: "agency.example",
      fixtureVersion: "agency-v1",
      language: "en",
      agencyName: "Example Agency",
      role: "Preparedness information",
      state: null,
      district: null,
      phone: null,
      portalUrl: "https://example.test/agency",
      source,
      status: "Demo_Guidance",
      review: null,
      lastUpdated: "2025-01-01T00:00:00.000Z",
      provenance: demoProvenance,
    };

    expect(parseAgencyRecord(agency).status).toBe("Demo_Guidance");
    expect(() =>
      parseAgencyRecord({
        ...agency,
        status: "Reviewed_Guidance",
        review: null,
      }),
    ).toThrow(ZodError);
  });

  it("validates actionable citation resolution and inherited risk labels", () => {
    const response = {
      kind: "answer",
      answerMode: "deterministic",
      claims: [
        {
          claimId: "claim.1",
          text: "Prepare essential supplies.",
          actionable: true,
          citationIds: ["citation.1"],
          labels: ["stale", "demo_data", "demo_guidance"],
        },
      ],
      citations: [demoCitation],
      limitations: ["chat.limitations.preparednessOnly"],
    };

    expect(parseChatResponse(response).kind).toBe("answer");
    expect(() =>
      parseChatResponse({
        ...response,
        claims: [
          {
            ...response.claims[0],
            citationIds: ["citation.missing"],
          },
        ],
      }),
    ).toThrow(ZodError);
    expect(() =>
      parseChatResponse({
        ...response,
        claims: [{ ...response.claims[0], labels: [] }],
      }),
    ).toThrow(ZodError);
  });

  it("enforces emergency clarification flags by response variant", () => {
    const escalation = {
      headingKey: "emergency.heading",
      waterSafetyInstructionMs: "Jangan redah air banjir.",
      waterSafetyInstructionEn: "Do not enter floodwater.",
      contact: {
        displayNumber: "999",
        telephoneUri: "tel:999",
        validationStatus: "requires_validation",
        source,
        provenance: demoProvenance,
      },
      noDispatchMessageKey: "emergency.noDispatch",
      noSafetyGuaranteeMessageKey: "emergency.noSafetyGuarantee",
    };

    expect(
      parseChatResponse({
        kind: "ambiguous_emergency",
        escalation,
        allowClarification: true,
      }).kind,
    ).toBe("ambiguous_emergency");
    expect(() =>
      parseChatResponse({
        kind: "emergency",
        escalation,
        allowClarification: true,
      }),
    ).toThrow(ZodError);
  });

  it("accepts only the exact local persistence allowlist", () => {
    const localState = {
      schemaVersion: 1,
      language: "ms",
      checklistProfile: {
        householdSize: 4,
        hasChildren: true,
        hasElderlyMembers: null,
        needsMobilityAssistance: false,
        hasPets: true,
        hasTransport: null,
      },
      checklistRuleVersion: "checklist-v1",
      checklistCompletion: { "item.water": true },
      acknowledgedNotices: ["notice.shared-browser"],
    };

    expect(parseLocalState(localState)).toEqual(localState);
    expect(() =>
      parseLocalState({ ...localState, chatbotText: "private message" }),
    ).toThrow(ZodError);
    expect(() =>
      parseLocalState({
        ...localState,
        checklistProfile: {
          ...localState.checklistProfile,
          exactAddress: "private address",
        },
      }),
    ).toThrow(ZodError);
  });

  it("accepts only the exact browser provider status projection", () => {
    const status = {
      providerName: "live-agency",
      providerMode: "live",
      availability: "unavailable",
      verification: "unverified",
      freshness: "unavailable",
      fallbackProvider: "bundled-demo",
      nonSecretErrorCode: "SOURCE_UNAVAILABLE",
    } as const;

    expect(parseProviderStatus(status)).toEqual(status);
    expect(
      parseProviderStatusResponse({
        ok: true,
        requestId: "request.provider-status",
        providers: [status],
      }).providers,
    ).toEqual([status]);
    expect(() =>
      parseProviderStatus({ ...status, schemaVersion: "internal-v1" }),
    ).toThrow(ZodError);
    expect(() =>
      parseProviderStatus({ ...status, authorization: "sentinel-secret" }),
    ).toThrow(ZodError);
  });

  it("rejects API errors with unsafe convenience fields", () => {
    const error = {
      ok: false,
      requestId: "request.123",
      code: "VALIDATION_BODY",
      messageKey: "errors.validationBody",
      retryable: false,
    };

    expect(parseApiError(error)).toEqual(error);
    expect(() =>
      parseApiError({ ...error, stack: "internal stack" }),
    ).toThrow(ZodError);
  });
});
