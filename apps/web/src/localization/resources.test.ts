import { describe, expect, it } from "vitest";

import {
  ENGLISH_CATALOG,
  MALAY_CATALOG,
  MESSAGE_KEYS,
  MESSAGE_KEYS_BY_SECTION,
  RESOURCE_CATALOG_VERSION,
  RESOURCE_CATALOGS,
  SAFETY_MESSAGES_BY_CATEGORY,
  resolveMessage,
  type MessageCatalogLookup,
} from "./resources";

describe("bilingual resource catalogs", () => {
  it("uses one version and identical application key sets", () => {
    const englishKeys = Object.keys(ENGLISH_CATALOG.messages).sort();
    const malayKeys = Object.keys(MALAY_CATALOG.messages).sort();

    expect(ENGLISH_CATALOG.version).toBe(RESOURCE_CATALOG_VERSION);
    expect(MALAY_CATALOG.version).toBe(RESOURCE_CATALOG_VERSION);
    expect(malayKeys).toEqual(englishKeys);
    expect(englishKeys).toEqual([...MESSAGE_KEYS].sort());
    expect(new Set(MESSAGE_KEYS).size).toBe(MESSAGE_KEYS.length);
    expect(Object.keys(MESSAGE_KEYS_BY_SECTION).sort()).toEqual(
      [
        "chat",
        "checklist",
        "demoLabels",
        "directory",
        "errors",
        "freshness",
        "guidance",
        "limitations",
        "navigation",
        "privacy",
      ].sort(),
    );
  });

  it("uses identical safety categories whose keys resolve in both languages", () => {
    const englishCategories = Object.keys(
      ENGLISH_CATALOG.safetyMessages,
    ).sort();
    const malayCategories = Object.keys(MALAY_CATALOG.safetyMessages).sort();

    expect(malayCategories).toEqual(englishCategories);
    expect(englishCategories).toEqual(
      Object.keys(SAFETY_MESSAGES_BY_CATEGORY).sort(),
    );

    for (const category of englishCategories) {
      const typedCategory = category as keyof typeof SAFETY_MESSAGES_BY_CATEGORY;
      const englishSafetyKeys = ENGLISH_CATALOG.safetyMessages[typedCategory];
      const malaySafetyKeys = MALAY_CATALOG.safetyMessages[typedCategory];

      expect(malaySafetyKeys).toEqual(englishSafetyKeys);
      for (const key of englishSafetyKeys) {
        expect(ENGLISH_CATALOG.messages[key]).toBeTruthy();
        expect(MALAY_CATALOG.messages[key]).toBeTruthy();
      }
    }
  });
});

describe("resolveMessage", () => {
  it("returns content only from the selected language", () => {
    expect(resolveMessage("en", "navigation.guidance")).toBe("Guidance");
    expect(resolveMessage("ms", "navigation.guidance")).toBe("Panduan");
  });

  it("returns the selected-language notice when that catalog lacks a key", () => {
    const malayMessagesWithoutGuidance = Object.fromEntries(
      Object.entries(MALAY_CATALOG.messages).filter(
        ([key]) => key !== "navigation.guidance",
      ),
    );
    const catalogsWithMalayGap = {
      en: { messages: ENGLISH_CATALOG.messages },
      ms: { messages: malayMessagesWithoutGuidance },
    } satisfies MessageCatalogLookup;

    expect(
      resolveMessage(
        "ms",
        "navigation.guidance",
        catalogsWithMalayGap,
      ),
    ).toBe("Kandungan ini tidak tersedia dalam Bahasa Melayu.");
    expect(
      resolveMessage(
        "ms",
        "navigation.guidance",
        catalogsWithMalayGap,
      ),
    ).not.toBe(ENGLISH_CATALOG.messages["navigation.guidance"]);
  });

  it("fails closed for unknown, inherited, empty, and non-string values", () => {
    const invalidCatalogs = {
      en: {
        messages: {
          empty: "   ",
          invalid: 42,
        },
      },
      ms: { messages: MALAY_CATALOG.messages },
    } satisfies MessageCatalogLookup;

    expect(resolveMessage("en", "unknown.key", RESOURCE_CATALOGS)).toBe(
      "This content is unavailable in English.",
    );
    expect(resolveMessage("en", "toString", invalidCatalogs)).toBe(
      "This content is unavailable in English.",
    );
    expect(resolveMessage("en", "empty", invalidCatalogs)).toBe(
      "This content is unavailable in English.",
    );
    expect(resolveMessage("en", "invalid", invalidCatalogs)).toBe(
      "This content is unavailable in English.",
    );
  });
});
