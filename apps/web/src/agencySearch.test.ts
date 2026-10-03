import {
  parseAgencyRecord,
  type AgencyRecord,
} from "@banjir-ready/contracts";
import { agencyFixtures } from "@banjir-ready/fixtures";
import { describe, expect, it } from "vitest";

import {
  normalizeAgencySearchText,
  searchAgencyRecords,
} from "./agencySearch";

const baseAgency = agencyFixtures.find(({ language }) => language === "en");

if (baseAgency === undefined) {
  throw new Error("Expected an English agency fixture for search tests");
}

function agency(
  overrides: Partial<AgencyRecord> & Pick<AgencyRecord, "recordId" | "agencyName">,
): AgencyRecord {
  return parseAgencyRecord({
    ...baseAgency,
    role: "Preparedness information",
    state: null,
    district: null,
    phone: null,
    ...overrides,
  });
}

describe("normalizeAgencySearchText", () => {
  it("normalizes Unicode width, case, punctuation, and whitespace", () => {
    expect(normalizeAgencySearchText("  ＮＡＤＭＡ—Flood\tHelp! ")).toBe(
      "nadma flood help",
    );
  });
});

describe("searchAgencyRecords", () => {
  it.each([
    ["agency name", { agencyName: "Target Agency" }],
    ["role", { role: "Target Agency" }],
    ["state", { state: "Target Agency" }],
    ["district", { district: "Target Agency" }],
  ] as const)("matches an exact selected-language %s", (_dimension, field) => {
    const target = agency({
      recordId: "agency.dimension-target",
      agencyName: "Dimension Result",
      ...field,
    });
    const unrelated = agency({
      recordId: "agency.dimension-unrelated",
      agencyName: "Unrelated Service",
    });

    expect(searchAgencyRecords([unrelated, target], "en", "target agency")).toEqual([
      target,
    ]);
  });

  it("normalizes both query and fields while excluding other-language records", () => {
    const english = agency({
      recordId: "agency.language-en",
      agencyName: "National Response (NADMA)",
      language: "en",
    });
    const malay = agency({
      recordId: "agency.language-ms",
      agencyName: "Perkhidmatan ＮＡＤＭＡ",
      language: "ms",
    });

    expect(searchAgencyRecords([malay, english], "en", "  nadma!!! ")).toEqual([
      english,
    ]);
    expect(searchAgencyRecords([english, malay], "ms", "ＮＡＤＭＡ")).toEqual([
      malay,
    ]);
  });

  it("supports remaining token matches spanning state and district fields", () => {
    const target = agency({
      recordId: "agency.cross-field",
      agencyName: "Regional Response Office",
      state: "Selangor",
      district: "Petaling",
    });

    expect(
      searchAgencyRecords([target], "en", "petaling selangor"),
    ).toEqual([target]);
  });

  it("orders by exact, prefix, remaining, localized name, and stable ID", () => {
    const exactStableA = agency({
      recordId: "agency.exact-a",
      agencyName: "Alpha Agency",
      role: "Flood",
    });
    const exactStableZ = agency({
      recordId: "agency.exact-z",
      agencyName: "Alpha Agency",
      role: "Flood",
    });
    const exactLaterName = agency({
      recordId: "agency.exact-beta",
      agencyName: "Beta Agency",
      district: "Flood",
    });
    const prefix = agency({
      recordId: "agency.prefix",
      agencyName: "Aardvark Agency",
      role: "Flood coordination",
    });
    const remaining = agency({
      recordId: "agency.remaining",
      agencyName: "Earlier Name Cannot Beat Rank",
      role: "National flood coordination",
    });
    const unrelated = agency({
      recordId: "agency.unrelated",
      agencyName: "Unrelated Office",
      role: "Preparedness information",
    });

    expect(
      searchAgencyRecords(
        [remaining, exactStableZ, unrelated, prefix, exactLaterName, exactStableA],
        "en",
        "flood",
      ).map(({ recordId }) => recordId),
    ).toEqual([
      "agency.exact-a",
      "agency.exact-z",
      "agency.exact-beta",
      "agency.prefix",
      "agency.remaining",
    ]);
  });

  it("returns a deterministic localized-name and stable-ID order for an empty query", () => {
    const sameNameLaterId = agency({
      recordId: "agency.same-z",
      agencyName: "Same Agency",
    });
    const sameNameEarlierId = agency({
      recordId: "agency.same-a",
      agencyName: "Same Agency",
    });
    const firstName = agency({
      recordId: "agency.first",
      agencyName: "Alpha Agency",
    });

    expect(
      searchAgencyRecords(
        [sameNameLaterId, firstName, sameNameEarlierId],
        "en",
        " \t ",
      ).map(({ recordId }) => recordId),
    ).toEqual(["agency.first", "agency.same-a", "agency.same-z"]);
  });
});
