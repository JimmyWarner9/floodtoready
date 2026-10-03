import {
  sourceRefSchema,
  type SourceRef,
} from "@banjir-ready/contracts";

function parseSource(input: unknown): Readonly<SourceRef> {
  return Object.freeze(sourceRefSchema.parse(input));
}

export const fixtureSources = Object.freeze({
  malaysiaDisasterGuidance: parseSource({
    sourceId: "source.malaysia-disaster-guidance",
    title: "Disasters and Emergencies",
    organization: "Government of Malaysia",
    url: "https://www.malaysia.gov.my/en/categories/safety-and-community/disasters-and-emergencies",
    sourceDate: null,
  }),
  publicInfoBanjirRainfall: parseSource({
    sourceId: "source.public-info-banjir-rainfall",
    title: "Public InfoBanjir rainfall portal",
    organization: "Department of Irrigation and Drainage Malaysia",
    url: "https://publicinfobanjir.water.gov.my/",
    sourceDate: null,
  }),
  publicInfoBanjirRiver: parseSource({
    sourceId: "source.public-info-banjir-river",
    title: "Public InfoBanjir water-level portal",
    organization: "Department of Irrigation and Drainage Malaysia",
    url: "https://publicinfobanjir.water.gov.my/",
    sourceDate: null,
  }),
  publicInfoBanjirWarning: parseSource({
    sourceId: "source.public-info-banjir-warning",
    title: "Public InfoBanjir warning portal",
    organization: "Department of Irrigation and Drainage Malaysia",
    url: "https://publicinfobanjir.water.gov.my/",
    sourceDate: null,
  }),
  nadmaDisasterPortal: parseSource({
    sourceId: "source.nadma-disaster-portal",
    title: "NADMA Disaster Portal",
    organization: "Government of Malaysia",
    url: "https://portalbencana.nadma.gov.my/en/",
    sourceDate: null,
  }),
});

export const sourceFixtures: readonly Readonly<SourceRef>[] = Object.freeze(
  Object.values(fixtureSources),
);
