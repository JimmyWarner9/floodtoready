import { describe, expect, it, vi } from "vitest";

import {
  BUNDLED_CHECKLIST_RULE_SET,
  CHECKLIST_RULE_EXPLANATION_KEYS,
  CHECKLIST_RULE_VERSION,
} from "@banjir-ready/fixtures";

import { EMPTY_CHECKLIST_PROFILE } from "./ChecklistProfileForm";
import {
  CHECKLIST_VERSION_CHANGE_NOTICE_KEY,
  generateChecklist,
  generateChecklistWithExplanations,
  restoreChecklist,
} from "./ChecklistEngine";

describe("ChecklistEngine", () => {
  it("produces the exact versioned baseline for the empty profile", () => {
    const generated = generateChecklist(EMPTY_CHECKLIST_PROFILE);

    expect(generated.ruleVersion).toBe(CHECKLIST_RULE_VERSION);
    expect(Object.isFrozen(BUNDLED_CHECKLIST_RULE_SET)).toBe(true);
    expect(Object.isFrozen(BUNDLED_CHECKLIST_RULE_SET.rules)).toBe(true);
    expect(generated.items.map(({ itemId }) => itemId)).toEqual(
      BUNDLED_CHECKLIST_RULE_SET.baselineItemIds,
    );
    expect(generated.items).toEqual(
      BUNDLED_CHECKLIST_RULE_SET.baselineItemIds.map(
        (itemId) => BUNDLED_CHECKLIST_RULE_SET.items[itemId],
      ),
    );
    expect(
      generateChecklistWithExplanations(EMPTY_CHECKLIST_PROFILE, "en")
        .explanations,
    ).toEqual([]);
  });

  it("sorts matched rules by priority and ID, de-duplicates item IDs, and preserves metadata", () => {
    const profile = {
      householdSize: 5,
      hasChildren: true,
      hasElderlyMembers: true,
      needsMobilityAssistance: true,
      hasPets: true,
      hasTransport: false,
    } as const;
    const generated = generateChecklist(profile);

    expect(generated.items.map(({ itemId }) => itemId)).toEqual([
      ...BUNDLED_CHECKLIST_RULE_SET.baselineItemIds,
      "checklist-item.extra-supplies",
      "checklist-item.children-supplies",
      "checklist-item.household-support-plan",
      "checklist-item.elderly-supplies",
      "checklist-item.mobility-plan",
      "checklist-item.pet-supplies",
      "checklist-item.alternate-transport",
    ]);
    expect(
      generated.items.filter(
        ({ itemId }) => itemId === "checklist-item.household-support-plan",
      ),
    ).toHaveLength(1);

    for (const item of generated.items) {
      expect(item).toEqual(BUNDLED_CHECKLIST_RULE_SET.items[item.itemId]);
    }
  });

  it("returns selected-language, source-linked reasons for every conditional item", () => {
    const profile = {
      ...EMPTY_CHECKLIST_PROFILE,
      hasChildren: true,
      hasElderlyMembers: true,
      needsMobilityAssistance: true,
    };
    const english = generateChecklistWithExplanations(profile, "en");
    const malay = generateChecklistWithExplanations(profile, "ms");
    const supportExplanation = english.explanations.find(
      ({ itemId }) => itemId === "checklist-item.household-support-plan",
    );

    expect(supportExplanation).toMatchObject({
      language: "en",
      ruleVersion: CHECKLIST_RULE_VERSION,
      guidanceStatus: "Demo_Guidance",
      reasons: [
        {
          ruleId: "checklist-rule.children",
          explanationKey: CHECKLIST_RULE_EXPLANATION_KEYS[
            "checklist-rule.children"
          ],
        },
        {
          ruleId: "checklist-rule.elderly-members",
          explanationKey: CHECKLIST_RULE_EXPLANATION_KEYS[
            "checklist-rule.elderly-members"
          ],
        },
        {
          ruleId: "checklist-rule.mobility-assistance",
          explanationKey: CHECKLIST_RULE_EXPLANATION_KEYS[
            "checklist-rule.mobility-assistance"
          ],
        },
      ],
    });
    expect(supportExplanation?.sourceRefs).toEqual(
      BUNDLED_CHECKLIST_RULE_SET.items[
        "checklist-item.household-support-plan"
      ]?.sourceRefs,
    );
    expect(
      supportExplanation?.sourceRefs.every(({ url }) =>
        url.startsWith("https://"),
      ),
    ).toBe(true);

    expect(malay.checklist).toEqual(english.checklist);
    expect(malay.explanations.map(({ itemId }) => itemId)).toEqual(
      english.explanations.map(({ itemId }) => itemId),
    );
    expect(malay.explanations[0]?.reasons[0]?.text).not.toBe(
      english.explanations[0]?.reasons[0]?.text,
    );
  });

  it("restores supported stable completion state against the regenerated saved profile", () => {
    const profile = {
      ...EMPTY_CHECKLIST_PROFILE,
      hasPets: true,
    };
    const completion = {
      "checklist-item.drinking-water": true,
      "checklist-item.pet-supplies": false,
    };

    const restored = restoreChecklist(
      {
        checklistRuleVersion: CHECKLIST_RULE_VERSION,
        checklistCompletion: completion,
      },
      profile,
    );

    expect(restored).toMatchObject({
      status: "restored",
      completion,
      noticeKey: null,
      checklist: { ruleVersion: CHECKLIST_RULE_VERSION },
    });
    expect(restored.checklist.items.map(({ itemId }) => itemId)).toContain(
      "checklist-item.pet-supplies",
    );
    expect(restored.completion).not.toBe(completion);
  });

  it.each([
    {
      name: "unsupported rule version",
      saved: {
        checklistRuleVersion: "checklist-rules-unknown",
        checklistCompletion: {
          "checklist-item.drinking-water": true,
        },
      },
    },
    {
      name: "unknown stable item ID",
      saved: {
        checklistRuleVersion: CHECKLIST_RULE_VERSION,
        checklistCompletion: {
          "checklist-item.drinking-water": true,
          "checklist-item.unknown": false,
        },
      },
    },
  ])("regenerates current rules and returns a version notice for $name", ({ saved }) => {
    const profile = {
      ...EMPTY_CHECKLIST_PROFILE,
      hasChildren: true,
    };

    const recovered = restoreChecklist(saved, profile);

    expect(recovered).toEqual({
      status: "regenerated",
      checklist: generateChecklist(profile),
      completion: {},
      noticeKey: CHECKLIST_VERSION_CHANGE_NOTICE_KEY,
    });
    expect(recovered.checklist.ruleVersion).toBe(CHECKLIST_RULE_VERSION);
  });

  it("is invariant to profile field insertion order and performs no network or storage work", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const firstProfile = {
      householdSize: 3,
      hasChildren: true,
      hasElderlyMembers: false,
      needsMobilityAssistance: false,
      hasPets: true,
      hasTransport: true,
    };
    const permutedProfile = {
      hasTransport: true,
      hasPets: true,
      needsMobilityAssistance: false,
      hasElderlyMembers: false,
      hasChildren: true,
      householdSize: 3,
    };

    expect(generateChecklist(permutedProfile)).toEqual(
      generateChecklist(firstProfile),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it("fails closed when a matched rule has no localized explanation mapping", () => {
    expect(() =>
      generateChecklistWithExplanations(
        { ...EMPTY_CHECKLIST_PROFILE, hasPets: true },
        "en",
        BUNDLED_CHECKLIST_RULE_SET,
        {},
      ),
    ).toThrow(/missing an explanation key/i);
  });
});
