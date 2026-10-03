import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  OfficialWarning,
  RainfallObservation,
  RiverReading,
} from "@banjir-ready/contracts";
import {
  officialWarningFixtures,
  rainfallObservationFixtures,
  riverReadingFixtures,
} from "@banjir-ready/fixtures";

import { LanguageProvider } from "./localization/LanguageProvider";
import {
  OfficialWarningCard,
  SituationPresentation,
} from "./SituationPresentation";

function renderSituation(
  overrides: Partial<{
    rainfallObservations: readonly RainfallObservation[];
    riverReadings: readonly RiverReading[];
    officialWarnings: readonly OfficialWarning[];
  }> = {},
  language: "en" | "ms" = "en",
): ReturnType<typeof render> {
  return render(
    <LanguageProvider initialLanguage={language}>
      <SituationPresentation
        rainfallObservations={
          overrides.rainfallObservations ?? rainfallObservationFixtures
        }
        riverReadings={overrides.riverReadings ?? riverReadingFixtures}
        officialWarnings={overrides.officialWarnings ?? officialWarningFixtures}
      />
    </LanguageProvider>,
  );
}

function sectionForHeading(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { name });
  const section = heading.closest("section");
  if (section === null) {
    throw new Error("Expected heading to belong to a semantic section");
  }
  return section;
}

describe("SituationPresentation", () => {
  it("renders each validated situation kind in its own semantic channel", () => {
    renderSituation();

    const rainfallSection = sectionForHeading("Rainfall observations");
    const riverSection = sectionForHeading("River readings");
    const warningSection = sectionForHeading("Authority warning records");

    expect(
      rainfallSection.querySelector('[data-situation-kind="rainfall_observation"]'),
    ).not.toBeNull();
    expect(
      rainfallSection.querySelector('[data-situation-kind="river_reading"]'),
    ).toBeNull();
    expect(
      rainfallSection.querySelector('[data-situation-kind="official_warning"]'),
    ).toBeNull();

    expect(
      riverSection.querySelector('[data-situation-kind="river_reading"]'),
    ).not.toBeNull();
    expect(
      riverSection.querySelector('[data-situation-kind="official_warning"]'),
    ).toBeNull();

    expect(
      warningSection.querySelector('[data-situation-kind="official_warning"]'),
    ).not.toBeNull();
    expect(
      warningSection.querySelector('[data-situation-kind="rainfall_observation"]'),
    ).toBeNull();
  });

  it("keeps provider, freshness, timestamps, source, and adjacent demo labels with every record", () => {
    const { container } = renderSituation();

    for (const article of Array.from(container.querySelectorAll("article"))) {
      expect(
        within(article).getByText("bundled-situation-fixtures"),
      ).toBeVisible();
      expect(within(article).getByText("demo")).toBeVisible();
      expect(
        within(article).getByText("Current under the configured freshness policy"),
      ).toBeVisible();
      expect(within(article).getAllByText("2025-01-15T08:05:00.000Z")).not
        .toHaveLength(0);

      const operationalValue = article.querySelector(
        ".situation-operational-value",
      );
      const labels = article.querySelector(".situation-demo-labels");
      expect(operationalValue).not.toBeNull();
      expect(labels?.parentElement).toBe(operationalValue);
      expect(labels).toHaveTextContent("Demo Data / Data Demo");
      expect(labels).toHaveTextContent(
        "Not current operational information / Bukan maklumat operasi semasa",
      );

      const sourceLink = within(article).getByRole("link");
      expect(sourceLink).toHaveAttribute("target", "_blank");
      expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
      expect(sourceLink.getAttribute("href")).toMatch(/^https:\/\//u);
    }
  });

  it("does not place warning, prediction, or safety claims in observation channels", () => {
    renderSituation();

    const rainfallSection = sectionForHeading("Rainfall observations");
    const riverSection = sectionForHeading("River readings");

    expect(rainfallSection).not.toHaveTextContent(
      /\b(?:safe|unsafe|warning|forecast|predict(?:ion|ed|s)?)\b/iu,
    );
    expect(riverSection).not.toHaveTextContent(
      /\b(?:safe|unsafe|warning|forecast|predict(?:ion|ed|s)?)\b/iu,
    );
    expect(
      within(sectionForHeading("Authority warning records")).getByText(
        officialWarningFixtures[0]?.warningText ?? "missing fixture",
      ),
    ).toBeVisible();
  });

  it("fails closed instead of rendering unsafe authority-category language as an observation", () => {
    const unsafeReading = {
      ...riverReadingFixtures[0],
      authorityReportedCategory: "Safe and will not flood",
    } as RiverReading;

    renderSituation({ riverReadings: [unsafeReading] });

    const riverSection = sectionForHeading("River readings");
    expect(
      within(riverSection).getByText(
        "Situation information is unavailable because its data did not pass validation.",
      ),
    ).toBeVisible();
    expect(riverSection).not.toHaveTextContent("Safe and will not flood");
    expect(
      riverSection.querySelector('[data-situation-kind="official_warning"]'),
    ).toBeNull();
  });

  it("rejects an observation passed through an unsafe cast to the warning renderer", () => {
    render(
      <LanguageProvider initialLanguage="en">
        <OfficialWarningCard
          warning={rainfallObservationFixtures[0] as unknown as OfficialWarning}
        />
      </LanguageProvider>,
    );

    expect(
      screen.getByText(
        "Situation information is unavailable because its data did not pass validation.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Recorded rainfall")).toBeNull();
    expect(document.querySelector('[data-situation-kind="official_warning"]'))
      .toBeNull();
  });

  it("suppresses operational values when freshness is unavailable", () => {
    const unavailableRainfall = {
      ...rainfallObservationFixtures[0],
      provenance: {
        ...rainfallObservationFixtures[0]?.provenance,
        freshness: "unavailable",
      },
    } as RainfallObservation;

    renderSituation({ rainfallObservations: [unavailableRainfall] });

    const rainfallSection = sectionForHeading("Rainfall observations");
    expect(within(rainfallSection).getAllByText("Source unavailable")).not
      .toHaveLength(0);
    expect(within(rainfallSection).queryByText(/18\.4\s*mm/u)).toBeNull();
    expect(rainfallSection.querySelector(".situation-demo-labels")).toBeNull();
  });

  it("renders localized BM channel and metadata labels without changing record identity", () => {
    renderSituation({}, "ms");

    const rainfallSection = sectionForHeading("Pemerhatian hujan");
    expect(
      within(rainfallSection).getByText("Hujan yang direkodkan:", {
        exact: false,
      }),
    ).toBeVisible();
    expect(within(rainfallSection).getByText("Kesegaran")).toBeVisible();
    expect(within(rainfallSection).getByText("Sumber:", { exact: false }))
      .toBeVisible();
    expect(
      rainfallSection.querySelector('[data-situation-kind="rainfall_observation"]'),
    ).not.toBeNull();
  });
});
