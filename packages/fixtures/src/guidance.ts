import {
  parseGuidanceRecord,
  type GuidanceRecord,
} from "@banjir-ready/contracts";

import { fixtureSources } from "./sources.js";
import { GUIDANCE_CONTENT_VERSION } from "./versions.js";

const guidanceCandidates: readonly unknown[] = [
  {
    recordId: "guidance.prepare-supplies",
    language: "en",
    contentVersion: GUIDANCE_CONTENT_VERSION,
    titleKey: "guidance.heading",
    body: "Prepare drinking water, shelf-stable food, essential documents, lighting, and a battery-powered radio before flooding disrupts access to services.",
    tags: ["before-flood", "supplies", "documents"],
    status: "Demo_Guidance",
    review: null,
    sources: [fixtureSources.malaysiaDisasterGuidance],
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    recordId: "guidance.prepare-supplies",
    language: "ms",
    contentVersion: GUIDANCE_CONTENT_VERSION,
    titleKey: "guidance.heading",
    body: "Sediakan air minuman, makanan tahan lama, dokumen penting, lampu dan radio berkuasa bateri sebelum banjir menjejaskan akses kepada perkhidmatan.",
    tags: ["before-flood", "supplies", "documents"],
    status: "Demo_Guidance",
    review: null,
    sources: [fixtureSources.malaysiaDisasterGuidance],
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    recordId: "guidance.avoid-floodwater",
    language: "en",
    contentVersion: GUIDANCE_CONTENT_VERSION,
    titleKey: "guidance.heading",
    body: "Avoid walking or driving through moving or unknown-depth floodwater. Follow instructions from emergency personnel and use documented official channels for updates.",
    tags: ["during-flood", "water-safety", "official-updates"],
    status: "Demo_Guidance",
    review: null,
    sources: [fixtureSources.malaysiaDisasterGuidance],
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    recordId: "guidance.avoid-floodwater",
    language: "ms",
    contentVersion: GUIDANCE_CONTENT_VERSION,
    titleKey: "guidance.heading",
    body: "Elakkan berjalan atau memandu melalui air banjir yang bergerak atau tidak diketahui kedalamannya. Ikut arahan petugas kecemasan dan gunakan saluran rasmi yang didokumenkan untuk maklumat terkini.",
    tags: ["during-flood", "water-safety", "official-updates"],
    status: "Demo_Guidance",
    review: null,
    sources: [fixtureSources.malaysiaDisasterGuidance],
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
];

export const guidanceFixtures: readonly GuidanceRecord[] = Object.freeze(
  guidanceCandidates.map((candidate) =>
    Object.freeze(parseGuidanceRecord(candidate)),
  ),
);
