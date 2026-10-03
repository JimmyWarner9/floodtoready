import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createSeededPropertyTestControls } from "@banjir-ready/test-support";

import {
  MESSAGE_KEYS,
  RESOURCE_CATALOGS,
  SUPPORTED_LANGUAGES,
  resolveMessage,
  type Language,
  type MessageCatalogLookup,
  type MessageKey,
} from "./resources";

const PROPERTY_TEST_CONTROLS = createSeededPropertyTestControls({
  seed: 20_250_304,
  numRuns: 100,
});

const otherLanguage = (language: Language): Language =>
  language === "en" ? "ms" : "en";

const withoutMessage = (
  language: Language,
  absentKey: MessageKey,
): MessageCatalogLookup => {
  const selectedMessages = Object.fromEntries(
    Object.entries(RESOURCE_CATALOGS[language].messages).filter(
      ([key]) => key !== absentKey,
    ),
  );

  return {
    en: {
      messages:
        language === "en"
          ? selectedMessages
          : RESOURCE_CATALOGS.en.messages,
    },
    ms: {
      messages:
        language === "ms"
          ? selectedMessages
          : RESOURCE_CATALOGS.ms.messages,
    },
  };
};

describe("missing translation property", () => {
  // Feature: banjir-ready-mvp, Property 4: Missing translations never cross-fallback
  // **Validates: Requirements 3.5**
  it("returns the selected-language missing notice for every absent generated key", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_LANGUAGES),
        fc.constantFrom(...MESSAGE_KEYS),
        (language, absentKey) => {
          const catalogs = withoutMessage(language, absentKey);
          const fallbackLanguage = otherLanguage(language);
          const fallbackContent =
            RESOURCE_CATALOGS[fallbackLanguage].messages[absentKey];
          const selectedLanguageNotice =
            RESOURCE_CATALOGS[language].messages["errors.missingContent"];

          expect(catalogs[language].messages).not.toHaveProperty(absentKey);
          expect(catalogs[fallbackLanguage].messages).toHaveProperty(
            absentKey,
            fallbackContent,
          );
          expect(resolveMessage(language, absentKey, catalogs)).toBe(
            selectedLanguageNotice,
          );
          expect(resolveMessage(language, absentKey, catalogs)).not.toBe(
            fallbackContent,
          );
        },
      ),
      PROPERTY_TEST_CONTROLS,
    );
  });
});
