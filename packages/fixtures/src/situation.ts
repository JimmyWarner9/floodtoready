import {
  parseSituationRecord,
  type OfficialWarning,
  type RainfallObservation,
  type RiverReading,
  type SituationRecord,
} from "@banjir-ready/contracts";

import { fixtureSources } from "./sources.js";
import { FIXTURE_VERSION } from "./versions.js";

const DEMO_PROVIDER_NAME = "bundled-situation-fixtures";
const RETRIEVAL_TIMESTAMP = "2025-01-15T08:05:00.000Z";

const rainfallCandidate = {
  kind: "rainfall_observation",
  recordId: "rainfall.demo-station-001.20250115t0800z",
  stationId: "station.demo-rain-001",
  stationName: "Stesen Hujan Demo / Demo Rainfall Station",
  amountMm: 18.4,
  intervalMinutes: 60,
  observedAt: "2025-01-15T08:00:00.000Z",
  source: fixtureSources.publicInfoBanjirRainfall,
  provenance: {
    providerName: DEMO_PROVIDER_NAME,
    providerMode: "demo",
    dataClass: "Demo_Data",
    sourceTimestamp: "2025-01-15T08:00:00.000Z",
    retrievalTimestamp: RETRIEVAL_TIMESTAMP,
    freshness: "current",
    fixtureVersion: FIXTURE_VERSION,
  },
};

const riverCandidate = {
  kind: "river_reading",
  recordId: "river.demo-station-001.20250115t0800z",
  stationId: "station.demo-river-001",
  stationName: "Stesen Sungai Demo / Demo River Station",
  levelMetres: 2.35,
  authorityReportedCategory: null,
  observedAt: "2025-01-15T08:00:00.000Z",
  source: fixtureSources.publicInfoBanjirRiver,
  provenance: {
    providerName: DEMO_PROVIDER_NAME,
    providerMode: "demo",
    dataClass: "Demo_Data",
    sourceTimestamp: "2025-01-15T08:00:00.000Z",
    retrievalTimestamp: RETRIEVAL_TIMESTAMP,
    freshness: "current",
    fixtureVersion: FIXTURE_VERSION,
  },
};

const warningCandidate = {
  kind: "official_warning",
  recordId: "warning.demo-district-001.20250115t0730z",
  issuer: "Penerbit Amaran Demo / Demo Warning Issuer",
  areaLabels: ["Daerah Contoh / Example District"],
  severityLabel: "Latihan sahaja / Exercise only",
  warningText: "Rekod amaran ini ialah data demo untuk menguji paparan dan bukan maklumat operasi semasa. This warning record is demo data for presentation testing and is not current operational information.",
  issuedAt: "2025-01-15T07:30:00.000Z",
  expiresAt: "2025-01-15T10:30:00.000Z",
  source: fixtureSources.publicInfoBanjirWarning,
  provenance: {
    providerName: DEMO_PROVIDER_NAME,
    providerMode: "demo",
    dataClass: "Demo_Data",
    sourceTimestamp: "2025-01-15T07:30:00.000Z",
    retrievalTimestamp: RETRIEVAL_TIMESTAMP,
    freshness: "current",
    fixtureVersion: FIXTURE_VERSION,
  },
};

function expectKind<TKind extends SituationRecord["kind"]>(
  record: SituationRecord,
  kind: TKind,
): Extract<SituationRecord, { kind: TKind }> {
  if (record.kind !== kind) {
    throw new Error("Fixture situation kind does not match its declared channel");
  }

  return record as Extract<SituationRecord, { kind: TKind }>;
}

const rainfall = Object.freeze(
  expectKind(parseSituationRecord(rainfallCandidate), "rainfall_observation"),
);
const river = Object.freeze(
  expectKind(parseSituationRecord(riverCandidate), "river_reading"),
);
const warning = Object.freeze(
  expectKind(parseSituationRecord(warningCandidate), "official_warning"),
);

export const rainfallObservationFixtures: readonly RainfallObservation[] =
  Object.freeze([rainfall]);
export const riverReadingFixtures: readonly RiverReading[] = Object.freeze([
  river,
]);
export const officialWarningFixtures: readonly OfficialWarning[] = Object.freeze([
  warning,
]);

export const situationFixtures: readonly SituationRecord[] = Object.freeze([
  ...rainfallObservationFixtures,
  ...riverReadingFixtures,
  ...officialWarningFixtures,
]);
