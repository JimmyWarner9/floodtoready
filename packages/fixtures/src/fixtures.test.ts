import {
  agencyRecordSchema,
  guidanceRecordSchema,
  situationRecordSchema,
  sourceRefSchema,
} from "@banjir-ready/contracts";
import { describe, expect, it } from "vitest";

import {
  AGENCY_FIXTURE_VERSION,
  FIXTURE_VERSION,
  GUIDANCE_CONTENT_VERSION,
  agencyFixtures,
  fixtureSources,
  guidanceFixtures,
  officialWarningFixtures,
  rainfallObservationFixtures,
  riverReadingFixtures,
  situationFixtures,
  sourceFixtures,
} from "./index.js";

describe("normalized bundled fixtures", () => {
  it("admits every source, guidance record, and situation record through shared schemas", () => {
    expect(FIXTURE_VERSION).toBe("banjir-ready-fixtures-v1");
    expect(GUIDANCE_CONTENT_VERSION).toBe("guidance-content-v1");

    for (const source of sourceFixtures) {
      expect(sourceRefSchema.parse(source)).toEqual(source);
    }
    for (const guidance of guidanceFixtures) {
      expect(guidanceRecordSchema.parse(guidance)).toEqual(guidance);
    }
    for (const situation of situationFixtures) {
      expect(situationRecordSchema.parse(situation)).toEqual(situation);
    }
  });

  it("provides linked BM and English demo guidance without inferring review from official URLs", () => {
    const recordIds = new Set(
      guidanceFixtures.map((guidance) => guidance.recordId),
    );

    expect(recordIds.size).toBeGreaterThan(0);
    for (const recordId of recordIds) {
      const linkedRecords = guidanceFixtures.filter(
        (guidance) => guidance.recordId === recordId,
      );
      expect(linkedRecords.map(({ language }) => language).sort()).toEqual([
        "en",
        "ms",
      ]);
      expect(
        new Set(linkedRecords.map(({ contentVersion }) => contentVersion)),
      ).toEqual(new Set([GUIDANCE_CONTENT_VERSION]));
      expect(linkedRecords.every(({ status }) => status === "Demo_Guidance")).toBe(
        true,
      );
      expect(linkedRecords.every(({ review }) => review === null)).toBe(true);
      expect(
        linkedRecords.every(({ sources }) =>
          sources.every(({ url }) => url.includes(".gov.my/")),
        ),
      ).toBe(true);
    }

    expect(fixtureSources.malaysiaDisasterGuidance.url).toContain(".gov.my/");
  });

  it("keeps rainfall, river readings, and warnings in independent typed channels", () => {
    expect(rainfallObservationFixtures).toHaveLength(1);
    expect(riverReadingFixtures).toHaveLength(1);
    expect(officialWarningFixtures).toHaveLength(1);

    expect(rainfallObservationFixtures[0]?.kind).toBe("rainfall_observation");
    expect(riverReadingFixtures[0]?.kind).toBe("river_reading");
    expect(officialWarningFixtures[0]?.kind).toBe("official_warning");
    expect(situationFixtures.map(({ kind }) => kind)).toEqual([
      "rainfall_observation",
      "river_reading",
      "official_warning",
    ]);
  });

  it("classifies every operational fixture as versioned demo data with complete timestamps", () => {
    for (const record of situationFixtures) {
      expect(record.provenance).toMatchObject({
        providerMode: "demo",
        dataClass: "Demo_Data",
        fixtureVersion: FIXTURE_VERSION,
      });
      expect(record.provenance.sourceTimestamp).not.toBeNull();
      expect(Number.isNaN(Date.parse(record.provenance.sourceTimestamp ?? ""))).toBe(
        false,
      );
      expect(Number.isNaN(Date.parse(record.provenance.retrievalTimestamp))).toBe(
        false,
      );
    }
  });

  it("makes the demo warning self-identifying as non-operational fixture content", () => {
    const warning = officialWarningFixtures[0];

    expect(warning?.severityLabel).toContain("Exercise only");
    expect(warning?.warningText).toContain("not current operational information");
    expect(warning?.warningText).toContain("bukan maklumat operasi semasa");
  });
});

describe("bilingual agency fixtures", () => {
  it("admits every agency record through the shared runtime schema", () => {
    expect(AGENCY_FIXTURE_VERSION).toBe("agency-fixtures-v1");
    expect(agencyFixtures.length).toBeGreaterThan(0);

    for (const agency of agencyFixtures) {
      expect(agencyRecordSchema.parse(agency)).toEqual(agency);
      expect(agency.fixtureVersion).toBe(AGENCY_FIXTURE_VERSION);
      expect("state" in agency).toBe(true);
      expect("district" in agency).toBe(true);
      expect("phone" in agency).toBe(true);
    }
  });

  it("links exactly one BM and English record to each stable agency identity", () => {
    const recordIds = new Set(agencyFixtures.map(({ recordId }) => recordId));

    expect(recordIds).toEqual(new Set(["agency.mers-999", "agency.nadma", "agency.metmalaysia", "agency.jps", "agency.jkm"]));
    for (const recordId of recordIds) {
      const linkedRecords = agencyFixtures.filter(
        (agency) => agency.recordId === recordId,
      );

      expect(linkedRecords.map(({ language }) => language).sort()).toEqual([
        "en",
        "ms",
      ]);
      expect(new Set(linkedRecords.map(({ fixtureVersion }) => fixtureVersion))).toEqual(
        new Set([AGENCY_FIXTURE_VERSION]),
      );
      expect(new Set(linkedRecords.map(({ lastUpdated }) => lastUpdated)).size).toBe(
        1,
      );
      expect(linkedRecords.every(({ role }) => role.length > 0)).toBe(true);
      expect(linkedRecords.every(({ source }) => source.url.startsWith("https://"))).toBe(
        true,
      );
    }
  });

  it("keeps unverified contact and review data explicitly demo-classified", () => {
    for (const agency of agencyFixtures) {
      expect(agency.status).toBe("Demo_Guidance");
      expect(agency.review).toBeNull();
      expect(agency.provenance).toMatchObject({
        providerName: "bundled-agency-fixtures",
        providerMode: "demo",
        dataClass: "Demo_Data",
        fixtureVersion: AGENCY_FIXTURE_VERSION,
        sourceTimestamp: agency.lastUpdated,
      });
      expect(Number.isNaN(Date.parse(agency.lastUpdated))).toBe(false);
      expect(Number.isNaN(Date.parse(agency.provenance.retrievalTimestamp))).toBe(
        false,
      );
    }
  });

  it("preserves validated phone text and does not synthesize absent contacts", () => {
    const emergencyRecords = agencyFixtures.filter(
      ({ recordId }) => recordId === "agency.mers-999",
    );
    const nadmaRecords = agencyFixtures.filter(
      ({ recordId }) => recordId === "agency.nadma",
    );

    expect(emergencyRecords).toHaveLength(2);
    expect(emergencyRecords.every(({ phone }) => phone === "999")).toBe(true);
    expect(nadmaRecords).toHaveLength(2);
    expect(nadmaRecords.every(({ phone }) => phone === null)).toBe(true);
    expect(
      nadmaRecords.every(
        ({ portalUrl, source }) =>
          portalUrl === fixtureSources.nadmaDisasterPortal.url &&
          source.sourceId === fixtureSources.nadmaDisasterPortal.sourceId,
      ),
    ).toBe(true);
  });

  it("rejects incomplete or convenience fields at the runtime boundary", () => {
    const agency = agencyFixtures[0];

    expect(
      agencyRecordSchema.safeParse({ ...agency, phone: undefined }).success,
    ).toBe(false);
    expect(
      agencyRecordSchema.safeParse({
        ...agency,
        contactNotes: "unvalidated convenience value",
      }).success,
    ).toBe(false);
    expect(
      agencyRecordSchema.safeParse({
        ...agency,
        status: "Reviewed_Guidance",
        review: null,
      }).success,
    ).toBe(false);
  });
});
