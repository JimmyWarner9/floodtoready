import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { DEFAULT_PROPERTY_TEST_CONTROLS } from "@banjir-ready/test-support";

import {
  MESSAGE_KEYS,
  RESOURCE_CATALOG_VERSION,
  RESOURCE_CATALOGS,
  SAFETY_MESSAGES_BY_CATEGORY,
  SUPPORTED_LANGUAGES,
  type Language,
} from "./resources";

const ADMITTED_RESOURCE_VERSIONS = [
  {
    version: RESOURCE_CATALOG_VERSION,
    catalogs: RESOURCE_CATALOGS,
  },
] as const;

const admittedResourceVersionArbitrary = fc.constantFrom(
  ...ADMITTED_RESOURCE_VERSIONS,
);
const comparisonLanguageArbitrary = fc.constantFrom(...SUPPORTED_LANGUAGES);

function otherLanguage(language: Language): Language {
  return language === "ms" ? "en" : "ms";
}

function sortedKeys(value: object): string[] {
  return Object.keys(value).sort();
}

describe("Property 5: Bilingual resource parity", () => {
  it("keeps complete application keys and safety categories equal for every admitted version", () => {
    // Feature: banjir-ready-mvp, Property 5: Bilingual resource parity
    // **Validates: Requirements 3.6, 17.7**
    fc.assert(
      fc.property(
        admittedResourceVersionArbitrary,
        comparisonLanguageArbitrary,
        (admittedVersion, selectedLanguage) => {
          const counterpartLanguage = otherLanguage(selectedLanguage);
          const selectedCatalog =
            admittedVersion.catalogs[selectedLanguage];
          const counterpartCatalog =
            admittedVersion.catalogs[counterpartLanguage];
          const expectedMessageKeys = [...MESSAGE_KEYS].sort();
          const expectedSafetyCategories = sortedKeys(
            SAFETY_MESSAGES_BY_CATEGORY,
          );

          expect(selectedCatalog.version).toBe(admittedVersion.version);
          expect(counterpartCatalog.version).toBe(admittedVersion.version);

          const selectedMessageKeys = sortedKeys(selectedCatalog.messages);
          const counterpartMessageKeys = sortedKeys(
            counterpartCatalog.messages,
          );
          expect(selectedMessageKeys).toEqual(counterpartMessageKeys);
          expect(selectedMessageKeys).toEqual(expectedMessageKeys);

          const selectedSafetyCategories = sortedKeys(
            selectedCatalog.safetyMessages,
          );
          const counterpartSafetyCategories = sortedKeys(
            counterpartCatalog.safetyMessages,
          );
          expect(selectedSafetyCategories).toEqual(
            counterpartSafetyCategories,
          );
          expect(selectedSafetyCategories).toEqual(
            expectedSafetyCategories,
          );
        },
      ),
      DEFAULT_PROPERTY_TEST_CONTROLS,
    );
  });
});
