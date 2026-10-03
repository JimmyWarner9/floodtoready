import type { AgencyRecord, Language } from "@banjir-ready/contracts";

const SEARCHABLE_AGENCY_FIELDS = [
  "agencyName",
  "role",
  "state",
  "district",
] as const satisfies readonly (keyof AgencyRecord)[];

type AgencyMatchRank = 0 | 1 | 2;

interface RankedAgency {
  readonly record: Readonly<AgencyRecord>;
  readonly matchRank: AgencyMatchRank;
  readonly normalizedName: string;
}

/**
 * Produces a stable comparison form without retaining punctuation or spacing
 * differences from browser input or validated agency fixture text.
 */
export function normalizeAgencySearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function searchableValues(record: Readonly<AgencyRecord>): readonly string[] {
  return SEARCHABLE_AGENCY_FIELDS.flatMap((field) => {
    const value = record[field];
    return typeof value === "string"
      ? [normalizeAgencySearchText(value)]
      : [];
  }).filter((value) => value.length > 0);
}

function rankMatch(
  normalizedFields: readonly string[],
  normalizedQuery: string,
): AgencyMatchRank | null {
  if (normalizedFields.some((field) => field === normalizedQuery)) {
    return 0;
  }

  if (normalizedFields.some((field) => field.startsWith(normalizedQuery))) {
    return 1;
  }

  if (normalizedFields.some((field) => field.includes(normalizedQuery))) {
    return 2;
  }

  const availableTokens = new Set(
    normalizedFields.flatMap((field) => field.split(" ")),
  );
  const queryTokens = normalizedQuery.split(" ");

  return queryTokens.every((token) => availableTokens.has(token)) ? 2 : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareRankedAgencies(
  left: RankedAgency,
  right: RankedAgency,
): number {
  if (left.matchRank !== right.matchRank) {
    return left.matchRank - right.matchRank;
  }

  const nameOrder = compareText(left.normalizedName, right.normalizedName);
  if (nameOrder !== 0) {
    return nameOrder;
  }

  return compareText(left.record.recordId, right.record.recordId);
}

/**
 * Searches only records in the selected language and returns the original
 * validated records ordered by the complete Requirement 6.3 rank tuple.
 */
export function searchAgencyRecords(
  records: readonly Readonly<AgencyRecord>[],
  language: Language,
  query: string,
): readonly Readonly<AgencyRecord>[] {
  const normalizedQuery = normalizeAgencySearchText(query);
  const selectedRecords = records.filter(
    (record) => record.language === language,
  );

  if (normalizedQuery.length === 0) {
    return [...selectedRecords].sort((left, right) => {
      const nameOrder = compareText(
        normalizeAgencySearchText(left.agencyName),
        normalizeAgencySearchText(right.agencyName),
      );

      return nameOrder !== 0
        ? nameOrder
        : compareText(left.recordId, right.recordId);
    });
  }

  return selectedRecords
    .flatMap((record): readonly RankedAgency[] => {
      const matchRank = rankMatch(searchableValues(record), normalizedQuery);

      return matchRank === null
        ? []
        : [
            {
              record,
              matchRank,
              normalizedName: normalizeAgencySearchText(record.agencyName),
            },
          ];
    })
    .sort(compareRankedAgencies)
    .map(({ record }) => record);
}
