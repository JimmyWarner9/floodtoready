import "@testing-library/jest-dom/vitest";

import { useState, type ReactNode } from "react";
import { fireEvent, render } from "@testing-library/react";
import {
  assert,
  boolean,
  constantFrom,
  integer,
  option,
  property,
  record,
  string,
  tuple,
  uniqueArray,
} from "fast-check";
import { describe, expect, it } from "vitest";

import type { ChecklistProfile } from "@banjir-ready/contracts";
import { BUNDLED_CHECKLIST_RULE_SET } from "@banjir-ready/fixtures";
import { createSeededPropertyTestControls } from "@banjir-ready/test-support";

import { AppShell } from "./AppShell";
import {
  PRIMARY_FEATURE_IDS,
  type PrimaryFeatureId,
  type PrimaryFeatures,
} from "./AppShell.types";
import { ChecklistProfileForm } from "./checklist/ChecklistProfileForm";
import {
  LanguageProvider,
  useLanguage,
} from "./localization/LanguageProvider";
import type { Language } from "./localization/resources";

interface GeneratedClientState {
  readonly language: Language;
  readonly activeFeature: PrimaryFeatureId;
  readonly profile: ChecklistProfile;
  readonly completion: Readonly<Record<string, boolean>>;
  readonly draft: string;
}

type Orientation = "portrait" | "landscape";
type TransitionOrder = "orientation-first" | "language-first";

interface PreservedStateSnapshot {
  readonly activeFeature: PrimaryFeatureId;
  readonly profileDraft: Readonly<Record<keyof ChecklistProfile, string>>;
  readonly completion: Readonly<Record<string, boolean>>;
  readonly draft: string;
}

const PROPERTY_TEST_CONTROLS = createSeededPropertyTestControls();
const CHECKLIST_ITEM_IDS = Object.keys(BUNDLED_CHECKLIST_RULE_SET.items).sort();
const [firstChecklistItemId, ...remainingChecklistItemIds] = CHECKLIST_ITEM_IDS;

if (firstChecklistItemId === undefined) {
  throw new Error("The bundled checklist must contain stable item IDs");
}

const nullableBoolean = option(boolean(), { nil: null });
const profileArbitrary = record({
  householdSize: option(integer({ min: 1, max: 100 }), { nil: null }),
  hasChildren: nullableBoolean,
  hasElderlyMembers: nullableBoolean,
  needsMobilityAssistance: nullableBoolean,
  hasPets: nullableBoolean,
  hasTransport: nullableBoolean,
});
const completionArbitrary = uniqueArray(
  tuple(
    constantFrom(firstChecklistItemId, ...remainingChecklistItemIds),
    boolean(),
  ),
  {
    maxLength: CHECKLIST_ITEM_IDS.length,
    selector: ([itemId]) => itemId,
  },
).map((entries) => Object.fromEntries(entries));
const clientStateArbitrary = record({
  language: constantFrom<Language>("ms", "en"),
  activeFeature: constantFrom<PrimaryFeatureId>(...PRIMARY_FEATURE_IDS),
  profile: profileArbitrary,
  completion: completionArbitrary,
  draft: string({ maxLength: 128 }),
});

function ChecklistStateProbe({
  completion: initialCompletion,
  profile,
}: Pick<GeneratedClientState, "completion" | "profile">): ReactNode {
  const [completion] = useState(() => ({ ...initialCompletion }));

  return (
    <>
      <ChecklistProfileForm initialProfile={profile} />
      <fieldset>
        <legend>Checklist completion</legend>
        {Object.entries(completion).map(([itemId, completed]) => (
          <label key={itemId}>
            {itemId}
            <input
              checked={completed}
              data-completion-item-id={itemId}
              readOnly
              type="checkbox"
            />
          </label>
        ))}
      </fieldset>
    </>
  );
}

function ChatDraftProbe({ draft: initialDraft }: Pick<GeneratedClientState, "draft">): ReactNode {
  const { text } = useLanguage();
  const [draft, setDraft] = useState(initialDraft);

  return (
    <label>
      {text("chat.inputLabel")}
      <input
        data-chat-draft
        onChange={(event) => {
          setDraft(event.currentTarget.value);
        }}
        value={draft}
      />
    </label>
  );
}

function createFeatures(state: GeneratedClientState): PrimaryFeatures {
  return {
    guidance: {
      label: "Guidance fallback",
      labelKey: "navigation.guidance",
      heading: "Guidance heading fallback",
      headingKey: "guidance.heading",
      content: <p>Guidance state</p>,
    },
    checklist: {
      label: "Checklist fallback",
      labelKey: "navigation.checklist",
      heading: "Checklist heading fallback",
      headingKey: "checklist.heading",
      content: (
        <ChecklistStateProbe
          completion={state.completion}
          profile={state.profile}
        />
      ),
    },
    directory: {
      label: "Directory fallback",
      labelKey: "navigation.directory",
      heading: "Directory heading fallback",
      headingKey: "directory.heading",
      content: <p>Directory state</p>,
    },
    chat: {
      label: "Chat fallback",
      labelKey: "navigation.chat",
      heading: "Chat heading fallback",
      headingKey: "chat.heading",
      content: <ChatDraftProbe draft={state.draft} />,
    },
  };
}

function ClientStateHarness({ state }: { readonly state: GeneratedClientState }): ReactNode {
  return (
    <LanguageProvider initialLanguage={state.language}>
      <AppShell
        features={createFeatures(state)}
        initialActiveFeature={state.activeFeature}
      />
    </LanguageProvider>
  );
}

function navigationButtons(container: HTMLElement): readonly HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(".primary-nav-action"),
  );
}

function mountStatefulFeatures(
  container: HTMLElement,
  activeFeature: PrimaryFeatureId,
): void {
  const buttons = navigationButtons(container);
  for (const feature of ['checklist', 'chat', activeFeature] as const) {
    const button = buttons[PRIMARY_FEATURE_IDS.indexOf(feature)];
    if (!button) throw new Error('Missing feature button');
    fireEvent.click(button);
  }
}

function captureState(container: HTMLElement): PreservedStateSnapshot {
  const buttons = navigationButtons(container);
  const activeIndex = buttons.findIndex(
    (button) => button.getAttribute("aria-current") === "page",
  );
  const activeFeature = PRIMARY_FEATURE_IDS[activeIndex];

  if (activeFeature === undefined) {
    throw new Error("An active primary feature must be present");
  }

  const profileDraft = Object.fromEntries(
    [
      "householdSize",
      "hasChildren",
      "hasElderlyMembers",
      "needsMobilityAssistance",
      "hasPets",
      "hasTransport",
    ].map((field) => {
      const control = container.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${field}"]`,
      );
      if (control === null) {
        throw new Error(`Missing generated profile field: ${field}`);
      }
      return [field, control.value];
    }),
  ) as unknown as Readonly<Record<keyof ChecklistProfile, string>>;

  const completion = Object.fromEntries(
    Array.from(
      container.querySelectorAll<HTMLInputElement>(
        "input[data-completion-item-id]",
      ),
      (control) => [control.dataset.completionItemId ?? '', control.checked],
    ),
  );
  const draftControl = container.querySelector<HTMLInputElement>(
    "input[data-chat-draft]",
  );

  if (draftControl === null) {
    throw new Error("The generated chatbot draft must be mounted");
  }

  return {
    activeFeature,
    profileDraft,
    completion,
    draft: draftControl.value,
  };
}

function changeOrientation(orientation: Orientation): void {
  const [width, height] =
    orientation === "portrait" ? [390, 844] : [844, 390];
  Object.defineProperties(window, {
    innerWidth: { configurable: true, value: width },
    innerHeight: { configurable: true, value: height },
  });
  fireEvent(window, new Event("orientationchange"));
  fireEvent(window, new Event("resize"));
}

function changeLanguage(container: HTMLElement, language: Language): void {
  const selector = container.querySelector<HTMLSelectElement>(
    ".language-selector select",
  );
  if (selector === null) {
    throw new Error("The language selector must remain available");
  }
  fireEvent.change(selector, { target: { value: language } });
}

describe("presentational state preservation", () => {
  // Feature: banjir-ready-mvp, Property 2: Presentational transitions preserve user state
  // **Validates: Requirements 2.3, 3.2**
  it("preserves every generated user-state field across orientation and language transitions", () => {
    assert(
      property(
        clientStateArbitrary,
        constantFrom<Orientation>("portrait", "landscape"),
        constantFrom<TransitionOrder>("orientation-first", "language-first"),
        (state, orientation, transitionOrder) => {
          const originalWidth = window.innerWidth;
          const originalHeight = window.innerHeight;
          const targetLanguage: Language =
            state.language === "ms" ? "en" : "ms";
          const { container, unmount } = render(
            <ClientStateHarness state={state} />,
          );

          try {
            mountStatefulFeatures(container, state.activeFeature);
            const before = captureState(container);
            const activeLabelBefore = navigationButtons(container)[
              PRIMARY_FEATURE_IDS.indexOf(state.activeFeature)
            ]?.textContent;

            if (transitionOrder === "orientation-first") {
              changeOrientation(orientation);
              changeLanguage(container, targetLanguage);
            } else {
              changeLanguage(container, targetLanguage);
              changeOrientation(orientation);
            }

            const after = captureState(container);
            const activeLabelAfter = navigationButtons(container)[
              PRIMARY_FEATURE_IDS.indexOf(state.activeFeature)
            ]?.textContent;

            expect(before).toEqual({
              activeFeature: state.activeFeature,
              profileDraft: {
                householdSize:
                  state.profile.householdSize === null
                    ? ""
                    : String(state.profile.householdSize),
                hasChildren:
                  state.profile.hasChildren === null
                    ? ""
                    : String(state.profile.hasChildren),
                hasElderlyMembers:
                  state.profile.hasElderlyMembers === null
                    ? ""
                    : String(state.profile.hasElderlyMembers),
                needsMobilityAssistance:
                  state.profile.needsMobilityAssistance === null
                    ? ""
                    : String(state.profile.needsMobilityAssistance),
                hasPets:
                  state.profile.hasPets === null
                    ? ""
                    : String(state.profile.hasPets),
                hasTransport:
                  state.profile.hasTransport === null
                    ? ""
                    : String(state.profile.hasTransport),
              },
              completion: state.completion,
              draft: state.draft,
            });
            expect(after).toEqual(before);
            expect(document.documentElement.lang).toBe(targetLanguage);
            expect(activeLabelAfter).not.toBe(activeLabelBefore);
          } finally {
            unmount();
            Object.defineProperties(window, {
              innerWidth: { configurable: true, value: originalWidth },
              innerHeight: { configurable: true, value: originalHeight },
            });
          }
        },
      ),
      {
        seed: PROPERTY_TEST_CONTROLS.seed,
        numRuns: PROPERTY_TEST_CONTROLS.numRuns,
        verbose: true,
      },
    );
  });
});
