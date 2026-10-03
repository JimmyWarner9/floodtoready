import {
  parseAgencyRecord,
  type AgencyRecord,
} from "@banjir-ready/contracts";

import { fixtureSources } from "./sources.js";
import { AGENCY_FIXTURE_VERSION } from "./versions.js";

const AGENCY_PROVIDER_NAME = "bundled-agency-fixtures";
const LAST_UPDATED = "2025-01-15T00:00:00.000Z";
const RETRIEVAL_TIMESTAMP = "2025-01-15T08:05:00.000Z";

const demoProvenance = {
  providerName: AGENCY_PROVIDER_NAME,
  providerMode: "demo",
  dataClass: "Demo_Data",
  sourceTimestamp: LAST_UPDATED,
  retrievalTimestamp: RETRIEVAL_TIMESTAMP,
  freshness: "stale",
  fixtureVersion: AGENCY_FIXTURE_VERSION,
} as const;

const agencyCandidates: readonly unknown[] = [
  ...(['en', 'ms'] as const).flatMap(language => [
    { recordId: 'agency.metmalaysia', fixtureVersion: AGENCY_FIXTURE_VERSION, language,
      agencyName: 'METMalaysia', role: language === 'ms' ? 'Ramalan dan amaran cuaca rasmi' : 'Official weather forecasts and warnings',
      state: null, district: null, phone: null, portalUrl: 'https://www.met.gov.my/',
      source: { sourceId: 'source.metmalaysia', title: 'METMalaysia', organization: 'METMalaysia', url: 'https://www.met.gov.my/info/data-terbuka/', sourceDate: null },
      status: 'Demo_Guidance', review: null, lastUpdated: LAST_UPDATED, provenance: demoProvenance },
    { recordId: 'agency.jps', fixtureVersion: AGENCY_FIXTURE_VERSION, language,
      agencyName: 'JPS / Public Infobanjir', role: language === 'ms' ? 'Pemerhatian hujan dan bacaan paras sungai' : 'Rainfall observations and river levels',
      state: null, district: null, phone: null, portalUrl: 'https://publicinfobanjir.water.gov.my/',
      source: fixtureSources.publicInfoBanjirRiver, status: 'Demo_Guidance', review: null, lastUpdated: LAST_UPDATED, provenance: demoProvenance },
    { recordId: 'agency.jkm', fixtureVersion: AGENCY_FIXTURE_VERSION, language,
      agencyName: 'JKM / InfoBencanaJKM', role: language === 'ms' ? 'Maklumat pusat pemindahan melalui pautan InfoBencanaJKM di Portal Bencana' : 'Evacuation-centre information via the InfoBencanaJKM link in Portal Bencana',
      state: null, district: null, phone: null, portalUrl: fixtureSources.nadmaDisasterPortal.url,
      source: fixtureSources.nadmaDisasterPortal, status: 'Demo_Guidance', review: null, lastUpdated: LAST_UPDATED, provenance: demoProvenance },
  ]),
  {
    recordId: "agency.mers-999",
    fixtureVersion: AGENCY_FIXTURE_VERSION,
    language: "en",
    agencyName: "Malaysia Emergency Response Services (MERS) 999",
    role: "National emergency contact channel",
    state: null,
    district: null,
    phone: "999",
    portalUrl: fixtureSources.malaysiaDisasterGuidance.url,
    source: fixtureSources.malaysiaDisasterGuidance,
    status: "Demo_Guidance",
    review: null,
    lastUpdated: LAST_UPDATED,
    provenance: demoProvenance,
  },
  {
    recordId: "agency.mers-999",
    fixtureVersion: AGENCY_FIXTURE_VERSION,
    language: "ms",
    agencyName: "Perkhidmatan Respons Kecemasan Malaysia (MERS) 999",
    role: "Saluran hubungan kecemasan kebangsaan",
    state: null,
    district: null,
    phone: "999",
    portalUrl: fixtureSources.malaysiaDisasterGuidance.url,
    source: fixtureSources.malaysiaDisasterGuidance,
    status: "Demo_Guidance",
    review: null,
    lastUpdated: LAST_UPDATED,
    provenance: demoProvenance,
  },
  {
    recordId: "agency.nadma",
    fixtureVersion: AGENCY_FIXTURE_VERSION,
    language: "en",
    agencyName: "National Disaster Management Agency (NADMA)",
    role: "National disaster management information and coordination",
    state: null,
    district: null,
    phone: null,
    portalUrl: fixtureSources.nadmaDisasterPortal.url,
    source: fixtureSources.nadmaDisasterPortal,
    status: "Demo_Guidance",
    review: null,
    lastUpdated: LAST_UPDATED,
    provenance: demoProvenance,
  },
  {
    recordId: "agency.nadma",
    fixtureVersion: AGENCY_FIXTURE_VERSION,
    language: "ms",
    agencyName: "Agensi Pengurusan Bencana Negara (NADMA)",
    role: "Maklumat dan penyelarasan pengurusan bencana negara",
    state: null,
    district: null,
    phone: null,
    portalUrl: fixtureSources.nadmaDisasterPortal.url,
    source: fixtureSources.nadmaDisasterPortal,
    status: "Demo_Guidance",
    review: null,
    lastUpdated: LAST_UPDATED,
    provenance: demoProvenance,
  },
];

export const agencyFixtures: readonly Readonly<AgencyRecord>[] = Object.freeze(
  agencyCandidates.map((candidate) =>
    Object.freeze(parseAgencyRecord(candidate)),
  ),
);
