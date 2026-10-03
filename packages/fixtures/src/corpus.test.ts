import {
  parseApprovedKnowledgeCorpus,
  validateCorpusGuidanceReferences,
} from "@banjir-ready/contracts";
import { describe, expect, it } from "vitest";

import {
  APPROVED_KNOWLEDGE_CORPUS_VERSION,
  GUIDANCE_CONTENT_VERSION,
  approvedKnowledgeCorpus,
  corpusFixtures,
  guidanceFixtures,
} from "./index.js";

type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key] extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T[Key] extends object
      ? Mutable<T[Key]>
      : T[Key];
};

const cloneCorpus = (): Mutable<typeof approvedKnowledgeCorpus> =>
  structuredClone(approvedKnowledgeCorpus) as Mutable<
    typeof approvedKnowledgeCorpus
  >;

describe("versioned bilingual approved knowledge corpus", () => {
  it("admits every bundled record through collection-level runtime validation", () => {
    const parsed = parseApprovedKnowledgeCorpus(approvedKnowledgeCorpus);

    expect(parsed.corpusVersion).toBe("corpus-v1");
    expect(parsed.corpusVersion).toBe(APPROVED_KNOWLEDGE_CORPUS_VERSION);
    expect(parsed.records).toHaveLength(4);
    expect(parsed.records).toEqual(corpusFixtures);
  });

  it("links exactly one BM and English record under each conceptual identity", () => {
    const conceptualIds = new Set(
      corpusFixtures.map(({ equivalentRecordId }) => equivalentRecordId),
    );

    expect(conceptualIds).toEqual(
      new Set(["concept.prepare-supplies", "concept.avoid-floodwater"]),
    );

    for (const conceptualId of conceptualIds) {
      const linkedRecords = corpusFixtures.filter(
        ({ equivalentRecordId }) => equivalentRecordId === conceptualId,
      );

      expect(linkedRecords.map(({ language }) => language).sort()).toEqual([
        "en",
        "ms",
      ]);
      expect(new Set(linkedRecords.map(({ recordId }) => recordId)).size).toBe(2);
      expect(
        new Set(linkedRecords.map(({ guidanceRecordId }) => guidanceRecordId))
          .size,
      ).toBe(1);
      expect(
        new Set(
          linkedRecords.map(
            ({ guidanceContentVersion }) => guidanceContentVersion,
          ),
        ),
      ).toEqual(new Set([GUIDANCE_CONTENT_VERSION]));
      expect(new Set(linkedRecords.map(({ status }) => status))).toEqual(
        new Set(["Demo_Guidance"]),
      );
      expect(new Set(linkedRecords.map(({ updatedAt }) => updatedAt)).size).toBe(
        1,
      );
      expect(
        new Set(linkedRecords.map(({ source }) => source.sourceId)).size,
      ).toBe(1);
    }
  });

  it("preserves bounded guidance excerpts, dates, source metadata, versions, and demo status", () => {
    const validated = validateCorpusGuidanceReferences(
      approvedKnowledgeCorpus,
      guidanceFixtures,
    );

    for (const record of validated.records) {
      const guidance = guidanceFixtures.find(
        (candidate) =>
          candidate.recordId === record.guidanceRecordId &&
          candidate.language === record.language &&
          candidate.contentVersion === record.guidanceContentVersion,
      );

      expect(guidance).toBeDefined();
      expect(record.text.length).toBeLessThanOrEqual(2_048);
      expect(guidance?.body).toContain(record.text);
      expect(record.updatedAt).toBe(guidance?.updatedAt);
      expect(record.status).toBe(guidance?.status);
      expect(record.status).toBe("Demo_Guidance");
      expect(record.source).toEqual(guidance?.sources[0]);
      expect("sourceDate" in record.source).toBe(true);
      expect(record.normalizedTerms.length).toBeGreaterThan(0);
      expect(
        record.normalizedTerms.every(
          (term) =>
            term === term.normalize("NFKC").toLocaleLowerCase("en"),
        ),
      ).toBe(true);
    }
  });

  it("rejects incomplete bilingual linkage and record-level version drift", () => {
    const missingTranslation = cloneCorpus();
    missingTranslation.records = missingTranslation.records.slice(1);
    expect(() => parseApprovedKnowledgeCorpus(missingTranslation)).toThrow();

    const wrongVersion = cloneCorpus();
    const first = wrongVersion.records[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      first.corpusVersion = "other-corpus-v1";
    }
    expect(() => parseApprovedKnowledgeCorpus(wrongVersion)).toThrow();
  });

  it("rejects unbounded excerpts, non-normalized terms, and unsupported fields", () => {
    const unboundedExcerpt = cloneCorpus();
    const excerptRecord = unboundedExcerpt.records[0];
    expect(excerptRecord).toBeDefined();
    if (excerptRecord !== undefined) {
      excerptRecord.text = "x".repeat(2_049);
    }
    expect(() => parseApprovedKnowledgeCorpus(unboundedExcerpt)).toThrow();

    const nonNormalizedTerm = cloneCorpus();
    const termRecord = nonNormalizedTerm.records[0];
    expect(termRecord).toBeDefined();
    if (termRecord !== undefined) {
      termRecord.normalizedTerms = ["FloodWater"];
    }
    expect(() => parseApprovedKnowledgeCorpus(nonNormalizedTerm)).toThrow();

    const unknownField = cloneCorpus() as {
      records: Record<string, unknown>[];
    };
    const unknownFieldRecord = unknownField.records[0];
    expect(unknownFieldRecord).toBeDefined();
    if (unknownFieldRecord !== undefined) {
      unknownFieldRecord.providerBody = "must-not-pass";
    }
    expect(() => parseApprovedKnowledgeCorpus(unknownField)).toThrow();
  });

  it("fails closed when corpus metadata attempts to upgrade or detach guidance provenance", () => {
    const upgradedStatus = cloneCorpus();
    const statusRecord = upgradedStatus.records[0];
    expect(statusRecord).toBeDefined();
    if (statusRecord !== undefined) {
      statusRecord.status = "Reviewed_Guidance";
    }
    expect(() =>
      validateCorpusGuidanceReferences(upgradedStatus, guidanceFixtures),
    ).toThrow();

    const detachedExcerpt = cloneCorpus();
    const excerptRecord = detachedExcerpt.records[0];
    expect(excerptRecord).toBeDefined();
    if (excerptRecord !== undefined) {
      excerptRecord.text = "Unsupported replacement guidance.";
    }
    expect(() =>
      validateCorpusGuidanceReferences(detachedExcerpt, guidanceFixtures),
    ).toThrow();
  });
});
