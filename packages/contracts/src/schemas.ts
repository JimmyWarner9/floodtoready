import { z } from "zod";

const MAX_SHORT_TEXT = 256;
const MAX_LONG_TEXT = 8_192;
const MAX_ARRAY_ITEMS = 256;

const boundedText = (max = MAX_SHORT_TEXT) =>
  z.string().trim().min(1).max(max);

const stableIdSchema = boundedText(128).regex(
  /^[a-z0-9][a-z0-9._:-]*$/i,
  "Expected a stable opaque identifier",
);
export const versionSchema = boundedText(128).regex(
  /^[a-z0-9][a-z0-9._+-]*$/i,
  "Expected a version identifier",
);
export type VersionIdentifier = z.infer<typeof versionSchema>;

export const deterministicVersionsSchema = z
  .object({
    fixtureVersion: versionSchema,
    corpusVersion: versionSchema,
    checklistRuleVersion: versionSchema,
  })
  .strict();
export type DeterministicVersions = z.infer<
  typeof deterministicVersionsSchema
>;
const isoUtcSchema = z.string().datetime({ offset: false });
const httpsUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => value.startsWith("https://"), "Expected an HTTPS URL");
const messageKeySchema = boundedText(160).regex(
  /^[a-z][a-z0-9._-]*$/i,
  "Expected a message key",
);

function addUniqueIssue(
  values: readonly string[],
  context: z.RefinementCtx,
  path: (string | number)[],
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Values must be unique",
      path,
    });
  }
}

export const languageSchema = z.enum(["ms", "en"]);
export type Language = z.infer<typeof languageSchema>;

export const guidanceStatusSchema = z.enum([
  "Reviewed_Guidance",
  "Demo_Guidance",
]);
export type GuidanceStatus = z.infer<typeof guidanceStatusSchema>;

export const dataClassSchema = z.enum(["Demo_Data", "Live_Data"]);
export type DataClass = z.infer<typeof dataClassSchema>;

export const freshnessStateSchema = z.enum([
  "current",
  "stale",
  "unavailable",
]);
export type FreshnessState = z.infer<typeof freshnessStateSchema>;

export const staleBehaviorSchema = z.enum([
  "warn_and_use",
  "switch_to_demo",
  "mark_unavailable",
]);
export type StaleBehavior = z.infer<typeof staleBehaviorSchema>;

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_CONTENT_TYPE",
  "VALIDATION_BODY",
  "VALIDATION_SIZE",
  "NOT_FOUND",
  "PROVIDER_TIMEOUT",
  "PROVIDER_INVALID_RESPONSE",
  "SOURCE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const sourceRefSchema = z
  .object({
    sourceId: stableIdSchema,
    title: boundedText(512),
    organization: boundedText(256),
    url: httpsUrlSchema,
    sourceDate: isoUtcSchema.nullable(),
  })
  .strict();
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const reviewMetadataSchema = z
  .object({
    reviewerName: boundedText(256),
    reviewerOrganizationOrQualification: boundedText(512),
    reviewDate: isoUtcSchema,
    contentVersion: versionSchema,
    sources: z.array(sourceRefSchema).min(1).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((review, context) => {
    addUniqueIssue(
      review.sources.map((source) => source.sourceId),
      context,
      ["sources"],
    );
  });
export type ReviewMetadata = z.infer<typeof reviewMetadataSchema>;

const provenanceFields = {
  providerName: boundedText(128),
  sourceTimestamp: isoUtcSchema.nullable(),
  retrievalTimestamp: isoUtcSchema,
  freshness: freshnessStateSchema,
  fixtureVersion: versionSchema.optional(),
};

const demoProvenanceSchema = z
  .object({
    ...provenanceFields,
    providerMode: z.literal("demo"),
    dataClass: z.literal("Demo_Data"),
  })
  .strict();

const liveProvenanceSchema = z
  .object({
    ...provenanceFields,
    providerMode: z.literal("live"),
    dataClass: z.literal("Live_Data"),
  })
  .strict();

export const provenanceSchema = z
  .discriminatedUnion("providerMode", [
    demoProvenanceSchema,
    liveProvenanceSchema,
  ])
  .superRefine((provenance, context) => {
    if (provenance.freshness === "current" && provenance.sourceTimestamp === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current provenance requires a source timestamp",
        path: ["sourceTimestamp"],
      });
    }
  });
export type Provenance = z.infer<typeof provenanceSchema>;

const guidanceFields = {
  recordId: stableIdSchema,
  language: languageSchema,
  contentVersion: versionSchema,
  titleKey: messageKeySchema,
  body: boundedText(MAX_LONG_TEXT),
  tags: z.array(boundedText(80)).max(64),
  sources: z.array(sourceRefSchema).max(MAX_ARRAY_ITEMS),
  updatedAt: isoUtcSchema,
};

const guidanceNormalizationInputSchema = z
  .object({
    ...guidanceFields,
    status: guidanceStatusSchema.optional(),
    review: z.unknown().nullable().optional(),
  })
  .strict()
  .superRefine((record, context) => {
    addUniqueIssue(record.tags, context, ["tags"]);
    addUniqueIssue(
      record.sources.map((source) => source.sourceId),
      context,
      ["sources"],
    );
  });

const reviewedGuidanceRecordSchema = z
  .object({
    ...guidanceFields,
    status: z.literal("Reviewed_Guidance"),
    review: reviewMetadataSchema,
  })
  .strict();

const demoGuidanceRecordSchema = z
  .object({
    ...guidanceFields,
    status: z.literal("Demo_Guidance"),
    review: z.null(),
  })
  .strict();

export const guidanceRecordSchema = z
  .discriminatedUnion("status", [
    reviewedGuidanceRecordSchema,
    demoGuidanceRecordSchema,
  ])
  .superRefine((record, context) => {
    addUniqueIssue(record.tags, context, ["tags"]);
    addUniqueIssue(
      record.sources.map((source) => source.sourceId),
      context,
      ["sources"],
    );

    if (
      record.status === "Reviewed_Guidance" &&
      record.review.contentVersion !== record.contentVersion
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Review and guidance content versions must match",
        path: ["review", "contentVersion"],
      });
    }
  });
export type GuidanceRecord = z.infer<typeof guidanceRecordSchema>;

const normalizedCorpusTermSchema = boundedText(128).refine(
  (value) =>
    value === value.normalize("NFKC").toLocaleLowerCase("en") &&
    !/[\p{Cc}\p{Cf}]/u.test(value),
  "Expected a normalized lower-case corpus term without control characters",
);

export const corpusRecordSchema = z
  .object({
    recordId: stableIdSchema,
    equivalentRecordId: stableIdSchema,
    corpusVersion: versionSchema,
    language: languageSchema,
    guidanceRecordId: stableIdSchema,
    guidanceContentVersion: versionSchema,
    title: boundedText(512),
    text: boundedText(2_048),
    normalizedTerms: z.array(normalizedCorpusTermSchema).min(1).max(64),
    source: sourceRefSchema,
    status: guidanceStatusSchema,
    updatedAt: isoUtcSchema,
  })
  .strict()
  .superRefine((record, context) => {
    addUniqueIssue(record.normalizedTerms, context, ["normalizedTerms"]);

    if (record.recordId === record.equivalentRecordId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Localized and conceptual corpus identifiers must differ",
        path: ["equivalentRecordId"],
      });
    }
  });
export type CorpusRecord = z.infer<typeof corpusRecordSchema>;

export const approvedKnowledgeCorpusSchema = z
  .object({
    corpusVersion: versionSchema,
    records: z.array(corpusRecordSchema).min(2).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((corpus, context) => {
    addUniqueIssue(
      corpus.records.map(({ recordId }) => recordId),
      context,
      ["records"],
    );

    const recordsByConcept = new Map<string, CorpusRecord[]>();
    corpus.records.forEach((record, index) => {
      if (record.corpusVersion !== corpus.corpusVersion) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Record and corpus versions must match",
          path: ["records", index, "corpusVersion"],
        });
      }

      const linkedRecords = recordsByConcept.get(record.equivalentRecordId) ?? [];
      linkedRecords.push(record);
      recordsByConcept.set(record.equivalentRecordId, linkedRecords);
    });

    for (const [conceptualId, linkedRecords] of recordsByConcept) {
      const first = linkedRecords[0];
      const languages = linkedRecords.map(({ language }) => language).sort();
      if (linkedRecords.length !== 2 || languages.join(",") !== "en,ms") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each conceptual corpus identity requires exactly one BM and one English record",
          path: ["records", conceptualId],
        });
        continue;
      }

      if (
        first === undefined ||
        linkedRecords.some(
          (record) =>
            record.guidanceRecordId !== first.guidanceRecordId ||
            record.guidanceContentVersion !== first.guidanceContentVersion ||
            record.status !== first.status ||
            record.updatedAt !== first.updatedAt ||
            record.source.sourceId !== first.source.sourceId,
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Equivalent corpus records must preserve guidance identity, version, status, date, and source identity",
          path: ["records", conceptualId],
        });
      }
    }
  });
export type ApprovedKnowledgeCorpus = z.infer<
  typeof approvedKnowledgeCorpusSchema
>;

export const parseApprovedKnowledgeCorpus = (
  input: unknown,
): ApprovedKnowledgeCorpus => approvedKnowledgeCorpusSchema.parse(input);

/**
 * Validates that corpus metadata and excerpts are preserved from an admitted
 * guidance version. This prevents retrieval fixtures from upgrading review
 * status or silently reconstructing provenance.
 */
export function validateCorpusGuidanceReferences(
  corpusInput: unknown,
  guidanceInput: readonly unknown[],
): ApprovedKnowledgeCorpus {
  const corpus = parseApprovedKnowledgeCorpus(corpusInput);
  const guidanceRecords = guidanceInput.map((record) =>
    guidanceRecordSchema.parse(record),
  );

  for (const record of corpus.records) {
    const matches = guidanceRecords.filter(
      (guidance) =>
        guidance.recordId === record.guidanceRecordId &&
        guidance.language === record.language &&
        guidance.contentVersion === record.guidanceContentVersion,
    );

    if (matches.length !== 1) {
      throw new TypeError(
        `Corpus record ${record.recordId} must resolve to exactly one guidance version`,
      );
    }

    const guidance = matches[0];
    if (
      guidance === undefined ||
      guidance.status !== record.status ||
      guidance.updatedAt !== record.updatedAt ||
      !guidance.body.includes(record.text) ||
      !guidance.sources.some(
        (source) =>
          source.sourceId === record.source.sourceId &&
          source.title === record.source.title &&
          source.organization === record.source.organization &&
          source.url === record.source.url &&
          source.sourceDate === record.source.sourceDate,
      )
    ) {
      throw new TypeError(
        `Corpus record ${record.recordId} does not preserve its guidance excerpt, status, date, or source metadata`,
      );
    }
  }

  return corpus;
}

export const freshnessPolicySchema = z
  .object({
    category: z.enum(["alert_like", "agency", "guidance"]),
    maxAgeMs: z.number().int().nonnegative().finite(),
    behavior: staleBehaviorSchema,
  })
  .strict();
export type FreshnessPolicy = z.infer<typeof freshnessPolicySchema>;

const providerDescriptorSharedFields = {
  providerName: boundedText(128),
  fallbackProvider: boundedText(128),
};

const demoProviderDescriptorSchema = z
  .object({
    ...providerDescriptorSharedFields,
    providerMode: z.literal("demo"),
    availability: z.enum(["available", "unavailable"]),
    verification: z.literal("unverified"),
    schemaVersion: versionSchema,
  })
  .strict();

const availableLiveProviderDescriptorSchema = z
  .object({
    ...providerDescriptorSharedFields,
    providerMode: z.literal("live"),
    availability: z.literal("available"),
    verification: z.literal("verified"),
    schemaVersion: versionSchema,
  })
  .strict();

const unavailableLiveProviderDescriptorSchema = z
  .object({
    ...providerDescriptorSharedFields,
    providerMode: z.literal("live"),
    availability: z.literal("unavailable"),
    verification: z.enum(["verified", "unverified"]),
    schemaVersion: versionSchema.nullable(),
  })
  .strict();

export const providerDescriptorSchema = z.union([
  demoProviderDescriptorSchema,
  availableLiveProviderDescriptorSchema,
  unavailableLiveProviderDescriptorSchema,
]);
export type ProviderDescriptor = z.infer<typeof providerDescriptorSchema>;

const publicProviderStatusSharedFields = {
  providerName: boundedText(128),
  fallbackProvider: boundedText(128),
  freshness: freshnessStateSchema,
  nonSecretErrorCode: apiErrorCodeSchema.nullable(),
};

const demoProviderStatusSchema = z
  .object({
    ...publicProviderStatusSharedFields,
    providerMode: z.literal("demo"),
    availability: z.enum(["available", "unavailable"]),
    verification: z.literal("unverified"),
  })
  .strict();

const availableLiveProviderStatusSchema = z
  .object({
    ...publicProviderStatusSharedFields,
    providerMode: z.literal("live"),
    availability: z.literal("available"),
    verification: z.literal("verified"),
  })
  .strict();

const unavailableLiveProviderStatusSchema = z
  .object({
    ...publicProviderStatusSharedFields,
    providerMode: z.literal("live"),
    availability: z.literal("unavailable"),
    verification: z.enum(["verified", "unverified"]),
  })
  .strict();

/**
 * Browser-safe provider status. Internal schema versions and adapter details
 * deliberately do not belong to this exact allowlist.
 */
export const providerStatusSchema = z.union([
  demoProviderStatusSchema,
  availableLiveProviderStatusSchema,
  unavailableLiveProviderStatusSchema,
]);
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export const providerStatusResponseSchema = z
  .object({
    ok: z.literal(true),
    requestId: stableIdSchema,
    providers: z.array(providerStatusSchema).min(1).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((response, context) => {
    addUniqueIssue(
      response.providers.map((provider) => provider.providerName),
      context,
      ["providers"],
    );
  });
export type ProviderStatusResponse = z.infer<
  typeof providerStatusResponseSchema
>;

export const providerConfigurationSchema = z
  .object({
    credentialFreeMode: z.boolean(),
    providerAttemptTimeoutMs: z.number().int().positive().finite(),
    freshnessPolicies: z
      .array(freshnessPolicySchema)
      .length(3),
    providers: z.array(providerDescriptorSchema).min(1).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((configuration, context) => {
    const expectedCategories = new Set(["alert_like", "agency", "guidance"]);
    const actualCategories = configuration.freshnessPolicies.map(
      (policy) => policy.category,
    );

    addUniqueIssue(actualCategories, context, ["freshnessPolicies"]);
    if (
      actualCategories.length !== expectedCategories.size ||
      actualCategories.some((category) => !expectedCategories.has(category))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Freshness configuration requires each supported category exactly once",
        path: ["freshnessPolicies"],
      });
    }

    addUniqueIssue(
      configuration.providers.map((provider) => provider.providerName),
      context,
      ["providers"],
    );
  });
export type ProviderConfiguration = z.infer<
  typeof providerConfigurationSchema
>;

export const startupConfigurationSchema = z
  .object({
    versions: deterministicVersionsSchema,
    providerConfiguration: providerConfigurationSchema,
  })
  .strict();
export type StartupConfiguration = z.infer<
  typeof startupConfigurationSchema
>;

export const rainfallObservationSchema = z
  .object({
    kind: z.literal("rainfall_observation"),
    recordId: stableIdSchema,
    stationId: stableIdSchema,
    stationName: boundedText(256),
    amountMm: z.number().nonnegative().finite(),
    intervalMinutes: z.number().int().positive().finite(),
    observedAt: isoUtcSchema,
    source: sourceRefSchema,
    provenance: provenanceSchema,
  })
  .strict();
export type RainfallObservation = z.infer<typeof rainfallObservationSchema>;

export const riverReadingSchema = z
  .object({
    kind: z.literal("river_reading"),
    recordId: stableIdSchema,
    stationId: stableIdSchema,
    stationName: boundedText(256),
    levelMetres: z.number().nonnegative().finite(),
    authorityReportedCategory: boundedText(128).nullable(),
    observedAt: isoUtcSchema,
    source: sourceRefSchema,
    provenance: provenanceSchema,
  })
  .strict();
export type RiverReading = z.infer<typeof riverReadingSchema>;

export const officialWarningSchema = z
  .object({
    kind: z.literal("official_warning"),
    recordId: stableIdSchema,
    issuer: boundedText(256),
    areaLabels: z.array(boundedText(256)).min(1).max(MAX_ARRAY_ITEMS),
    severityLabel: boundedText(128),
    warningText: boundedText(MAX_LONG_TEXT),
    issuedAt: isoUtcSchema,
    expiresAt: isoUtcSchema.nullable(),
    source: sourceRefSchema,
    provenance: provenanceSchema,
  })
  .strict()
  .superRefine((warning, context) => {
    addUniqueIssue(warning.areaLabels, context, ["areaLabels"]);
    if (
      warning.expiresAt !== null &&
      Date.parse(warning.expiresAt) < Date.parse(warning.issuedAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Warning expiry must not precede issue time",
        path: ["expiresAt"],
      });
    }
  });
export type OfficialWarning = z.infer<typeof officialWarningSchema>;

export const situationRecordSchema = z.union([
  rainfallObservationSchema,
  riverReadingSchema,
  officialWarningSchema,
]);
export type SituationRecord = z.infer<typeof situationRecordSchema>;

export const checklistProfileSchema = z
  .object({
    householdSize: z.number().int().positive().max(100).nullable(),
    hasChildren: z.boolean().nullable(),
    hasElderlyMembers: z.boolean().nullable(),
    needsMobilityAssistance: z.boolean().nullable(),
    hasPets: z.boolean().nullable(),
    hasTransport: z.boolean().nullable(),
  })
  .strict();
export type ChecklistProfile = z.infer<typeof checklistProfileSchema>;

export const checklistBooleanFieldSchema = z.enum([
  "hasChildren",
  "hasElderlyMembers",
  "needsMobilityAssistance",
  "hasPets",
  "hasTransport",
]);
export type ChecklistBooleanField = z.infer<
  typeof checklistBooleanFieldSchema
>;

export const profilePredicateConditionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("household_size"),
      operator: z.enum(["equals", "at_least", "at_most"]),
      value: z.number().int().positive().max(100),
    })
    .strict(),
  z
    .object({
      kind: z.literal("boolean"),
      field: checklistBooleanFieldSchema,
      value: z.boolean(),
    })
    .strict(),
]);
export type ProfilePredicateCondition = z.infer<
  typeof profilePredicateConditionSchema
>;

export const normalizedProfilePredicateSchema = z
  .object({
    match: z.enum(["all", "any"]),
    conditions: z.array(profilePredicateConditionSchema).min(1).max(16),
  })
  .strict();
export type NormalizedProfilePredicate = z.infer<
  typeof normalizedProfilePredicateSchema
>;

export const checklistItemDefinitionSchema = z
  .object({
    itemId: stableIdSchema,
    wordingKey: messageKeySchema,
    sourceRefs: z.array(sourceRefSchema).max(MAX_ARRAY_ITEMS),
    guidanceStatus: guidanceStatusSchema,
  })
  .strict()
  .superRefine((item, context) => {
    addUniqueIssue(
      item.sourceRefs.map((source) => source.sourceId),
      context,
      ["sourceRefs"],
    );
    if (
      item.guidanceStatus === "Reviewed_Guidance" &&
      item.sourceRefs.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reviewed checklist items require at least one source",
        path: ["sourceRefs"],
      });
    }
  });
export type ChecklistItemDefinition = z.infer<
  typeof checklistItemDefinitionSchema
>;

export const checklistRuleSchema = z
  .object({
    ruleId: stableIdSchema,
    predicate: normalizedProfilePredicateSchema,
    itemIds: z.array(stableIdSchema).min(1).max(MAX_ARRAY_ITEMS),
    priority: z.number().int().nonnegative().finite(),
  })
  .strict()
  .superRefine((rule, context) => {
    addUniqueIssue(rule.itemIds, context, ["itemIds"]);
  });
export type ChecklistRule = z.infer<typeof checklistRuleSchema>;

export const checklistRuleSetSchema = z
  .object({
    version: versionSchema,
    baselineItemIds: z.array(stableIdSchema).max(MAX_ARRAY_ITEMS),
    rules: z.array(checklistRuleSchema).max(MAX_ARRAY_ITEMS),
    items: z.record(stableIdSchema, checklistItemDefinitionSchema),
  })
  .strict()
  .superRefine((ruleSet, context) => {
    addUniqueIssue(ruleSet.baselineItemIds, context, ["baselineItemIds"]);
    addUniqueIssue(
      ruleSet.rules.map((rule) => rule.ruleId),
      context,
      ["rules"],
    );

    for (const [key, item] of Object.entries(ruleSet.items)) {
      if (key !== item.itemId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Checklist item map key must equal itemId",
          path: ["items", key, "itemId"],
        });
      }
    }

    const knownItemIds = new Set(Object.keys(ruleSet.items));
    const references = [
      ...ruleSet.baselineItemIds.map((itemId) => ({ itemId, path: ["baselineItemIds"] })),
      ...ruleSet.rules.flatMap((rule, ruleIndex) =>
        rule.itemIds.map((itemId) => ({
          itemId,
          path: ["rules", ruleIndex, "itemIds"],
        })),
      ),
    ];

    for (const reference of references) {
      if (!knownItemIds.has(reference.itemId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown checklist item: ${reference.itemId}`,
          path: reference.path,
        });
      }
    }
  });
export type ChecklistRuleSet = z.infer<typeof checklistRuleSetSchema>;

export const checklistResultSchema = z
  .object({
    ruleVersion: versionSchema,
    profileFingerprint: boundedText(512),
    items: z.array(checklistItemDefinitionSchema).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((result, context) => {
    addUniqueIssue(
      result.items.map((item) => item.itemId),
      context,
      ["items"],
    );
  });
export type ChecklistResult = z.infer<typeof checklistResultSchema>;

export const checklistDeltaSchema = z
  .object({
    added: z.array(stableIdSchema).max(MAX_ARRAY_ITEMS),
    retained: z.array(stableIdSchema).max(MAX_ARRAY_ITEMS),
    removed: z.array(stableIdSchema).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((delta, context) => {
    const all = [...delta.added, ...delta.retained, ...delta.removed];
    addUniqueIssue(all, context, []);
  });
export type ChecklistDelta = z.infer<typeof checklistDeltaSchema>;

const agencyFields = {
  recordId: stableIdSchema,
  fixtureVersion: versionSchema,
  language: languageSchema,
  agencyName: boundedText(256),
  role: boundedText(512),
  state: boundedText(128).nullable(),
  district: boundedText(128).nullable(),
  phone: boundedText(64).nullable(),
  portalUrl: httpsUrlSchema.nullable(),
  source: sourceRefSchema,
  lastUpdated: isoUtcSchema,
  provenance: provenanceSchema,
};

const reviewedAgencyRecordSchema = z
  .object({
    ...agencyFields,
    status: z.literal("Reviewed_Guidance"),
    review: reviewMetadataSchema,
  })
  .strict();

const demoAgencyRecordSchema = z
  .object({
    ...agencyFields,
    status: z.literal("Demo_Guidance"),
    review: z.null(),
  })
  .strict();

export const agencyRecordSchema = z.discriminatedUnion("status", [
  reviewedAgencyRecordSchema,
  demoAgencyRecordSchema,
]);
export type AgencyRecord = z.infer<typeof agencyRecordSchema>;

export const citationSchema = z
  .object({
    citationId: stableIdSchema,
    corpusRecordId: stableIdSchema,
    corpusVersion: versionSchema,
    language: languageSchema,
    source: sourceRefSchema,
    excerpt: boundedText(2_048),
    guidanceStatus: guidanceStatusSchema,
    freshness: freshnessStateSchema,
    dataClass: dataClassSchema,
  })
  .strict();
export type Citation = z.infer<typeof citationSchema>;

export const citationDetailSchema = citationSchema
  .omit({ citationId: true, freshness: true, dataClass: true })
  .strict();
export type CitationDetail = z.infer<typeof citationDetailSchema>;

export const answerClaimLabelSchema = z.enum([
  "stale",
  "demo_data",
  "demo_guidance",
]);
export type AnswerClaimLabel = z.infer<typeof answerClaimLabelSchema>;

export const answerClaimSchema = z
  .object({
    claimId: stableIdSchema,
    text: boundedText(MAX_LONG_TEXT),
    actionable: z.boolean(),
    citationIds: z.array(stableIdSchema).max(MAX_ARRAY_ITEMS),
    labels: z.array(answerClaimLabelSchema).max(3),
  })
  .strict()
  .superRefine((claim, context) => {
    addUniqueIssue(claim.citationIds, context, ["citationIds"]);
    addUniqueIssue(claim.labels, context, ["labels"]);
    if (claim.actionable && claim.citationIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Actionable claims require at least one citation",
        path: ["citationIds"],
      });
    }
  });
export type AnswerClaim = z.infer<typeof answerClaimSchema>;

export const answerModeSchema = z.union([
  z.literal("deterministic"),
  z.string().regex(/^external:[a-z0-9][a-z0-9._-]{0,127}$/i),
]);
export type AnswerMode = z.infer<typeof answerModeSchema>;

export const emergencyContactSchema = z
  .object({
    displayNumber: boundedText(64),
    telephoneUri: z.string().regex(/^tel:\+?[0-9][0-9 -]{0,62}[0-9]$/),
    validationStatus: z.enum(["validated", "requires_validation"]),
    source: sourceRefSchema,
    provenance: provenanceSchema,
  })
  .strict()
  .superRefine((contact, context) => {
    const normalizedDisplay = contact.displayNumber.replace(/[^0-9+]/g, "");
    const normalizedTarget = contact.telephoneUri.slice(4).replace(/[^0-9+]/g, "");
    if (normalizedDisplay !== normalizedTarget) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Displayed and callable telephone numbers must match",
        path: ["telephoneUri"],
      });
    }
    if (
      contact.validationStatus === "requires_validation" &&
      contact.provenance.dataClass !== "Demo_Data"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unvalidated emergency contacts must remain demo data",
        path: ["provenance", "dataClass"],
      });
    }
  });
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

export const emergencyEscalationModelSchema = z
  .object({
    headingKey: messageKeySchema,
    waterSafetyInstructionMs: boundedText(2_048),
    waterSafetyInstructionEn: boundedText(2_048),
    contact: emergencyContactSchema,
    noDispatchMessageKey: messageKeySchema,
    noSafetyGuaranteeMessageKey: messageKeySchema,
  })
  .strict();
export type EmergencyEscalationModel = z.infer<
  typeof emergencyEscalationModelSchema
>;

const answerChatResponseSchema = z
  .object({
    kind: z.literal("answer"),
    answerMode: answerModeSchema,
    claims: z.array(answerClaimSchema).min(1).max(MAX_ARRAY_ITEMS),
    citations: z.array(citationSchema).max(MAX_ARRAY_ITEMS),
    limitations: z.array(messageKeySchema).max(32),
  })
  .strict();

const safetyFallbackChatResponseSchema = z
  .object({
    kind: z.literal("safety_fallback"),
    reason: z.enum([
      "insufficient_evidence",
      "unsafe_claim",
      "citation_failure",
      "source_conflict",
    ]),
    messageKey: messageKeySchema,
    citations: z.array(citationSchema).max(MAX_ARRAY_ITEMS),
  })
  .strict();

const emergencyChatResponseSchema = z
  .object({
    kind: z.literal("emergency"),
    escalation: emergencyEscalationModelSchema,
    allowClarification: z.literal(false),
  })
  .strict();

const ambiguousEmergencyChatResponseSchema = z
  .object({
    kind: z.literal("ambiguous_emergency"),
    escalation: emergencyEscalationModelSchema,
    allowClarification: z.literal(true),
  })
  .strict();

export const chatResponseSchema = z
  .discriminatedUnion("kind", [
    answerChatResponseSchema,
    safetyFallbackChatResponseSchema,
    emergencyChatResponseSchema,
    ambiguousEmergencyChatResponseSchema,
  ])
  .superRefine((response, context) => {
    if (response.kind !== "answer") {
      return;
    }

    addUniqueIssue(
      response.claims.map((claim) => claim.claimId),
      context,
      ["claims"],
    );
    addUniqueIssue(
      response.citations.map((citation) => citation.citationId),
      context,
      ["citations"],
    );

    const citations = new Map(
      response.citations.map((citation) => [citation.citationId, citation]),
    );

    response.claims.forEach((claim, claimIndex) => {
      const resolved = claim.citationIds.flatMap((citationId) => {
        const citation = citations.get(citationId);
        if (citation === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown citation: ${citationId}`,
            path: ["claims", claimIndex, "citationIds"],
          });
          return [];
        }
        return [citation];
      });

      if (!claim.actionable) {
        return;
      }

      const expectedLabels = new Set<AnswerClaimLabel>();
      for (const citation of resolved) {
        if (citation.freshness === "stale") expectedLabels.add("stale");
        if (citation.dataClass === "Demo_Data") expectedLabels.add("demo_data");
        if (citation.guidanceStatus === "Demo_Guidance") {
          expectedLabels.add("demo_guidance");
        }
      }
      const actualLabels = new Set(claim.labels);
      if (
        actualLabels.size !== expectedLabels.size ||
        [...expectedLabels].some((label) => !actualLabels.has(label))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Actionable claim labels must exactly match citation risk labels",
          path: ["claims", claimIndex, "labels"],
        });
      }
    });
  });
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const chatRequestSchema = z
  .object({
    language: languageSchema,
    question: boundedText(4_096),
    corpusVersion: versionSchema,
  })
  .strict();
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const apiErrorSchema = z
  .object({
    ok: z.literal(false),
    requestId: stableIdSchema,
    code: apiErrorCodeSchema,
    messageKey: messageKeySchema,
    retryable: z.boolean(),
  })
  .strict();
export type ApiError = z.infer<typeof apiErrorSchema>;

export const localStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    language: languageSchema,
    checklistProfile: checklistProfileSchema,
    checklistRuleVersion: versionSchema,
    checklistCompletion: z.record(stableIdSchema, z.boolean()),
    acknowledgedNotices: z.array(stableIdSchema).max(MAX_ARRAY_ITEMS),
  })
  .strict()
  .superRefine((state, context) => {
    addUniqueIssue(state.acknowledgedNotices, context, ["acknowledgedNotices"]);
  });
export type LocalState = z.infer<typeof localStateSchema>;

export const parseLanguage = (input: unknown): Language =>
  languageSchema.parse(input);
export const parseVersionIdentifier = (input: unknown): VersionIdentifier =>
  versionSchema.parse(input);
export const parseDeterministicVersions = (
  input: unknown,
): DeterministicVersions => deterministicVersionsSchema.parse(input);
export const parseStartupConfiguration = (
  input: unknown,
): StartupConfiguration => startupConfigurationSchema.parse(input);
export const parseProviderConfiguration = (
  input: unknown,
): ProviderConfiguration => providerConfigurationSchema.parse(input);
export const parseGuidanceRecord = (input: unknown): GuidanceRecord =>
  guidanceRecordSchema.parse(input);

/**
 * Assigns guidance status from validated review evidence. Invalid, incomplete,
 * or version-mismatched review metadata is discarded and fails closed to demo
 * guidance; malformed guidance content still fails the boundary validation.
 */
export const normalizeGuidanceRecord = (input: unknown): GuidanceRecord => {
  const candidate = guidanceNormalizationInputSchema.parse(input);
  const reviewResult = reviewMetadataSchema.safeParse(candidate.review);
  const hasCompleteMatchingReview =
    reviewResult.success &&
    reviewResult.data.contentVersion === candidate.contentVersion;
  const commonFields = {
    recordId: candidate.recordId,
    language: candidate.language,
    contentVersion: candidate.contentVersion,
    titleKey: candidate.titleKey,
    body: candidate.body,
    tags: candidate.tags,
    sources: candidate.sources,
    updatedAt: candidate.updatedAt,
  };

  return parseGuidanceRecord(
    hasCompleteMatchingReview
      ? {
          ...commonFields,
          status: "Reviewed_Guidance",
          review: reviewResult.data,
        }
      : {
          ...commonFields,
          status: "Demo_Guidance",
          review: null,
        },
  );
};
export const parseCorpusRecord = (input: unknown): CorpusRecord =>
  corpusRecordSchema.parse(input);
export const parseProvenance = (input: unknown): Provenance =>
  provenanceSchema.parse(input);
export const parseProviderDescriptor = (input: unknown): ProviderDescriptor =>
  providerDescriptorSchema.parse(input);
export const parseProviderStatus = (input: unknown): ProviderStatus =>
  providerStatusSchema.parse(input);
export const parseProviderStatusResponse = (
  input: unknown,
): ProviderStatusResponse => providerStatusResponseSchema.parse(input);
export const parseFreshnessPolicy = (input: unknown): FreshnessPolicy =>
  freshnessPolicySchema.parse(input);
export const parseSituationRecord = (input: unknown): SituationRecord =>
  situationRecordSchema.parse(input);
export const parseChecklistProfile = (input: unknown): ChecklistProfile =>
  checklistProfileSchema.parse(input);
export const parseChecklistRuleSet = (input: unknown): ChecklistRuleSet =>
  checklistRuleSetSchema.parse(input);
export const parseChecklistResult = (input: unknown): ChecklistResult =>
  checklistResultSchema.parse(input);
export const parseChecklistDelta = (input: unknown): ChecklistDelta =>
  checklistDeltaSchema.parse(input);
export const parseAgencyRecord = (input: unknown): AgencyRecord =>
  agencyRecordSchema.parse(input);
export const parseCitation = (input: unknown): Citation =>
  citationSchema.parse(input);
export const parseCitationDetail = (input: unknown): CitationDetail =>
  citationDetailSchema.parse(input);
export const parseChatRequest = (input: unknown): ChatRequest =>
  chatRequestSchema.parse(input);
export const parseChatResponse = (input: unknown): ChatResponse =>
  chatResponseSchema.parse(input);
export const parseApiError = (input: unknown): ApiError =>
  apiErrorSchema.parse(input);
export const parseLocalState = (input: unknown): LocalState =>
  localStateSchema.parse(input);
