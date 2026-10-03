import "@testing-library/jest-dom/vitest";

import { useState, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppShell } from "../AppShell";
import type { PrimaryFeatures } from "../AppShell.types";
import {
  LanguageProvider,
  selectLinkedLanguageRecord,
  useLanguage,
} from "./LanguageProvider";
import type { MessageCatalogLookup } from "./resources";

function LocalizedStatefulContent(): ReactNode {
  const { text } = useLanguage();
  const [draft, setDraft] = useState("");

  return (
    <>
      <p>{text("checklist.description")}</p>
      <label>
        {text("chat.inputLabel")}
        <input
          onChange={(event) => {
            setDraft(event.currentTarget.value);
          }}
          value={draft}
        />
      </label>
    </>
  );
}

const localizedFeatures: PrimaryFeatures = {
  guidance: {
    label: "Guidance fallback",
    labelKey: "navigation.guidance",
    heading: "Guidance heading fallback",
    headingKey: "guidance.heading",
    content: <LocalizedStatefulContent />,
  },
  checklist: {
    label: "Checklist fallback",
    labelKey: "navigation.checklist",
    heading: "Checklist heading fallback",
    headingKey: "checklist.heading",
    content: <p>Checklist feature state</p>,
  },
  directory: {
    label: "Directory fallback",
    labelKey: "navigation.directory",
    heading: "Directory heading fallback",
    headingKey: "directory.heading",
    content: <p>Directory feature state</p>,
  },
  chat: {
    label: "Chat fallback",
    labelKey: "navigation.chat",
    heading: "Chat heading fallback",
    headingKey: "chat.heading",
    content: <p>Chat feature state</p>,
  },
};

describe("LanguageProvider", () => {
  it("sets document language metadata and returns the selected-language missing notice", async () => {
    const incompleteCatalogs = {
      ms: { messages: { "example.onlyMalay": "Kandungan Melayu" } },
      en: { messages: {} },
    } as const satisfies MessageCatalogLookup;

    function MissingContentProbe(): ReactNode {
      const { text } = useLanguage();
      return <p>{text("example.onlyMalay")}</p>;
    }

    render(
      <LanguageProvider catalogs={incompleteCatalogs} initialLanguage="en">
        <MissingContentProbe />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("lang", "en");
    });
    expect(
      screen.getByText("This content is unavailable in English."),
    ).toBeVisible();
    expect(screen.queryByText("Kandungan Melayu")).not.toBeInTheDocument();
  });

  it("switches all keyed shell content without resetting active feature or feature state", async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider initialLanguage="ms">
        <AppShell features={localizedFeatures} />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("lang", "ms");
    });
    expect(
      screen.getByRole("heading", { name: "Panduan kesiapsiagaan banjir" }),
    ).toBeVisible();

    const draft = screen.getByRole("textbox", {
      name: "Soalan kesiapsiagaan",
    });
    await user.type(draft, "retain this draft");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Bahasa" }),
      "en",
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("lang", "en");
    });
    expect(
      screen.getByRole("heading", { name: "Flood preparedness guidance" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Guidance" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("textbox", { name: "Preparedness question" }),
    ).toHaveValue("retain this draft");
    expect(
      screen.getByText("Create a checklist using optional household details."),
    ).toBeVisible();
  });

  it("keeps language selection available on every primary feature screen", async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider initialLanguage="en">
        <AppShell features={localizedFeatures} />
      </LanguageProvider>,
    );

    for (const featureName of [
      "Guidance",
      "Checklist",
      "Agency directory",
      "Preparedness chat",
    ]) {
      await user.click(screen.getByRole("button", { name: featureName }));
      expect(
        screen.getByRole("combobox", { name: "Language" }),
      ).toBeVisible();
    }
  });
});

describe("linked-language content selection", () => {
  const records = [
    {
      recordId: "corpus-preparation-ms",
      equivalentRecordId: "concept-preparation",
      language: "ms" as const,
      text: "Sediakan kit kecemasan.",
    },
    {
      recordId: "corpus-preparation-en",
      equivalentRecordId: "concept-preparation",
      language: "en" as const,
      text: "Prepare an emergency kit.",
    },
  ];

  it("selects localized content while retaining the conceptual record identity", () => {
    const malay = selectLinkedLanguageRecord(
      records,
      "concept-preparation",
      "ms",
    );
    const english = selectLinkedLanguageRecord(
      records,
      "concept-preparation",
      "en",
    );

    expect(malay).toEqual({
      conceptualRecordId: "concept-preparation",
      record: records[0],
    });
    expect(english).toEqual({
      conceptualRecordId: "concept-preparation",
      record: records[1],
    });
    expect(english?.conceptualRecordId).toBe(malay?.conceptualRecordId);
    expect(records.map((record) => record.recordId)).toEqual([
      "corpus-preparation-ms",
      "corpus-preparation-en",
    ]);
  });

  it("fails closed instead of selecting another language or an ambiguous record", () => {
    expect(
      selectLinkedLanguageRecord(
        records.slice(0, 1),
        "concept-preparation",
        "en",
      ),
    ).toBeNull();

    expect(
      selectLinkedLanguageRecord(
        [
          ...records,
          {
            recordId: "duplicate-en",
            equivalentRecordId: "concept-preparation",
            language: "en" as const,
            text: "Duplicate English content.",
          },
        ],
        "concept-preparation",
        "en",
      ),
    ).toBeNull();
  });
});
