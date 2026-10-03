import {
  validateCorpusGuidanceReferences,
  type CorpusRecord,
} from "@banjir-ready/contracts";

import { guidanceFixtures } from "./guidance.js";
import { fixtureSources } from "./sources.js";
import {
  APPROVED_KNOWLEDGE_CORPUS_VERSION,
  GUIDANCE_CONTENT_VERSION,
} from "./versions.js";

const corpusCandidates: readonly unknown[] = [
  {
    recordId: "corpus.prepare-supplies.en",
    equivalentRecordId: "concept.prepare-supplies",
    corpusVersion: APPROVED_KNOWLEDGE_CORPUS_VERSION,
    language: "en",
    guidanceRecordId: "guidance.prepare-supplies",
    guidanceContentVersion: GUIDANCE_CONTENT_VERSION,
    title: "Prepare essential supplies",
    text: "Prepare drinking water, shelf-stable food, essential documents, lighting, and a battery-powered radio before flooding disrupts access to services.",
    normalizedTerms: [
      "battery powered radio",
      "before flood",
      "documents",
      "drinking water",
      "emergency supplies",
      "food",
      "lighting",
    ],
    source: fixtureSources.malaysiaDisasterGuidance,
    status: "Demo_Guidance",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    recordId: "corpus.prepare-supplies.ms",
    equivalentRecordId: "concept.prepare-supplies",
    corpusVersion: APPROVED_KNOWLEDGE_CORPUS_VERSION,
    language: "ms",
    guidanceRecordId: "guidance.prepare-supplies",
    guidanceContentVersion: GUIDANCE_CONTENT_VERSION,
    title: "Sediakan bekalan penting",
    text: "Sediakan air minuman, makanan tahan lama, dokumen penting, lampu dan radio berkuasa bateri sebelum banjir menjejaskan akses kepada perkhidmatan.",
    normalizedTerms: [
      "air minuman",
      "banjir",
      "dokumen penting",
      "lampu",
      "makanan tahan lama",
      "radio berkuasa bateri",
      "sediakan bekalan",
    ],
    source: fixtureSources.malaysiaDisasterGuidance,
    status: "Demo_Guidance",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    recordId: "corpus.avoid-floodwater.en",
    equivalentRecordId: "concept.avoid-floodwater",
    corpusVersion: APPROVED_KNOWLEDGE_CORPUS_VERSION,
    language: "en",
    guidanceRecordId: "guidance.avoid-floodwater",
    guidanceContentVersion: GUIDANCE_CONTENT_VERSION,
    title: "Avoid moving or unknown-depth floodwater",
    text: "Avoid walking or driving through moving or unknown-depth floodwater. Follow instructions from emergency personnel and use documented official channels for updates.",
    normalizedTerms: [
      "avoid floodwater",
      "driving",
      "emergency personnel",
      "moving water",
      "official updates",
      "unknown depth",
      "walking",
    ],
    source: fixtureSources.malaysiaDisasterGuidance,
    status: "Demo_Guidance",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    recordId: "corpus.avoid-floodwater.ms",
    equivalentRecordId: "concept.avoid-floodwater",
    corpusVersion: APPROVED_KNOWLEDGE_CORPUS_VERSION,
    language: "ms",
    guidanceRecordId: "guidance.avoid-floodwater",
    guidanceContentVersion: GUIDANCE_CONTENT_VERSION,
    title: "Elakkan air banjir bergerak atau tidak diketahui kedalamannya",
    text: "Elakkan berjalan atau memandu melalui air banjir yang bergerak atau tidak diketahui kedalamannya. Ikut arahan petugas kecemasan dan gunakan saluran rasmi yang didokumenkan untuk maklumat terkini.",
    normalizedTerms: [
      "air banjir",
      "arahan petugas kecemasan",
      "elakkan",
      "kedalaman tidak diketahui",
      "maklumat rasmi",
      "memandu",
      "berjalan",
    ],
    source: fixtureSources.malaysiaDisasterGuidance,
    status: "Demo_Guidance",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
];

const validatedCorpus = validateCorpusGuidanceReferences(
  {
    corpusVersion: APPROVED_KNOWLEDGE_CORPUS_VERSION,
    records: corpusCandidates,
  },
  guidanceFixtures,
);

export const corpusFixtures: readonly Readonly<CorpusRecord>[] = Object.freeze(
  validatedCorpus.records.map((record) => Object.freeze(record)),
);

export const approvedKnowledgeCorpus = Object.freeze({
  corpusVersion: validatedCorpus.corpusVersion,
  records: corpusFixtures,
});
