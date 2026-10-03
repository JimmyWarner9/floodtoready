import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GuidanceCatalogue } from "./GuidanceCatalogue";
import { LanguageProvider } from "./localization/LanguageProvider";

const source = {
  sourceId: "source.guidance-test",
  title: "Preparedness source",
  organization: "Example reviewer organization",
  url: "https://example.test/guidance",
  sourceDate: "2025-01-01T00:00:00.000Z",
};

const englishCandidate = {
  recordId: "guidance.test",
  language: "en",
  contentVersion: "guidance-v1",
  titleKey: "guidance.heading",
  body: "Prepare supplies before flooding disrupts access.",
  tags: ["preparation"],
  status: "Reviewed_Guidance",
  review: {
    reviewerName: "Incomplete Reviewer",
  },
  sources: [source],
  updatedAt: "2025-01-02T00:00:00.000Z",
};

function renderCatalogue(
  records: readonly unknown[],
  language: "en" | "ms" = "en",
): ReturnType<typeof render> {
  return render(
    <LanguageProvider initialLanguage={language}>
      <GuidanceCatalogue records={records} />
    </LanguageProvider>,
  );
}

describe("GuidanceCatalogue", () => {
  it("renders normalized demo guidance with its bilingual label immediately adjacent", () => {
    renderCatalogue([englishCandidate]);

    const article = screen.getByRole("article");
    const body = within(article).getByText(
      "Prepare supplies before flooding disrupts access.",
    );

    expect(article).toHaveAttribute("data-guidance-status", "Demo_Guidance");
    expect(body.nextElementSibling).toHaveTextContent(
      "Demo Guidance / Panduan Demo",
    );
    expect(within(article).getByText("Demo guidance")).toBeVisible();
    expect(within(article).getByText("guidance-v1")).toBeVisible();
    expect(within(article).getByRole("link", { name: "Preparedness source" }))
      .toHaveAttribute("href", "https://example.test/guidance");
    expect(
      within(article).getByText(
        "Guidance status does not represent government endorsement.",
      ),
    ).toBeVisible();
    expect(within(article).queryByText("Incomplete Reviewer")).toBeNull();
  });

  it("renders every valid review field and omits the demo label", () => {
    const reviewedCandidate = {
      ...englishCandidate,
      review: {
        reviewerName: "Named Reviewer",
        reviewerOrganizationOrQualification: "Flood preparedness specialist",
        reviewDate: "2025-01-03T00:00:00.000Z",
        contentVersion: "guidance-v1",
        sources: [source],
      },
    };

    renderCatalogue([reviewedCandidate]);

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute(
      "data-guidance-status",
      "Reviewed_Guidance",
    );
    expect(within(article).getAllByText("Reviewed guidance")).toHaveLength(2);
    expect(within(article).getByText("Named Reviewer")).toBeVisible();
    expect(
      within(article).getByText("Flood preparedness specialist"),
    ).toBeVisible();
    expect(
      within(article).getByText("2025-01-03T00:00:00.000Z"),
    ).toBeVisible();
    expect(
      within(article).queryByText("Demo Guidance / Panduan Demo"),
    ).toBeNull();
  });

  it("renders untrusted fixture strings only as text nodes", () => {
    const textOnlyCandidate = {
      ...englishCandidate,
      body: '<img src="x" onerror="alert(1)">Prepare safely',
      sources: [
        {
          ...source,
          title: "<script>alert(1)</script>",
        },
      ],
    };

    const { container } = renderCatalogue([textOnlyCandidate]);

    expect(
      screen.getByText('<img src="x" onerror="alert(1)">Prepare safely'),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "<script>alert(1)</script>" }))
      .toBeVisible();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("fails closed for a malformed batch and for missing selected-language content", () => {
    const malformedCandidate = {
      ...englishCandidate,
      review: null,
      unexpected: "field",
    };

    const { unmount } = renderCatalogue([englishCandidate, malformedCandidate]);
    expect(
      screen.getByText(
        "Guidance is unavailable. Use a listed official source for further information.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("article")).toBeNull();

    unmount();
    renderCatalogue([englishCandidate], "ms");
    expect(
      screen.getByText(
        "Panduan tidak tersedia. Gunakan sumber rasmi yang disenaraikan untuk maklumat lanjut.",
      ),
    ).toBeVisible();
  });
});
