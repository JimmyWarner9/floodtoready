import {
  checklistProfileSchema,
  checklistResultSchema,
  checklistRuleSetSchema,
  type ChecklistItemDefinition,
  type ChecklistProfile,
  type ChecklistResult,
  type ChecklistRule,
  type ChecklistRuleSet,
  type GuidanceStatus,
  type LocalState,
  type SourceRef,
} from "@banjir-ready/contracts";
import {
  BUNDLED_CHECKLIST_RULE_SET,
  CHECKLIST_RULE_EXPLANATION_KEYS,
} from "@banjir-ready/fixtures";

import {
  resolveMessage,
  type Language,
} from "../localization/resources";

const PROFILE_FIELD_ORDER = [
  "householdSize",
  "hasChildren",
  "hasElderlyMembers",
  "needsMobilityAssistance",
  "hasPets",
  "hasTransport",
] as const satisfies readonly (keyof ChecklistProfile)[];

export const CHECKLIST_VERSION_CHANGE_NOTICE_KEY =
  "checklist.versionChanged" as const;

export interface ChecklistExplanationReason {
  readonly ruleId: string;
  readonly explanationKey: string;
  readonly text: string;
}

export interface ChecklistItemExplanation {
  readonly itemId: string;
  readonly ruleVersion: string;
  readonly language: Language;
  readonly guidanceStatus: GuidanceStatus;
  readonly sourceRefs: readonly SourceRef[];
  readonly reasons: readonly ChecklistExplanationReason[];
}

export interface ChecklistGeneration {
  readonly checklist: ChecklistResult;
  readonly explanations: readonly ChecklistItemExplanation[];
}

export type ChecklistRuleExplanationKeys = Readonly<Record<string, string>>;

export type SavedChecklistState = Readonly<
  Pick<LocalState, "checklistRuleVersion" | "checklistCompletion">
>;

export type ChecklistRestoreResult = Readonly<
  | {
      status: "restored";
      checklist: ChecklistResult;
      completion: Readonly<Record<string, boolean>>;
      noticeKey: null;
    }
  | {
      status: "regenerated";
      checklist: ChecklistResult;
      completion: Readonly<Record<string, boolean>>;
      noticeKey: typeof CHECKLIST_VERSION_CHANGE_NOTICE_KEY;
    }
>;

function compareRules(left: ChecklistRule, right: ChecklistRule): number {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  return left.ruleId < right.ruleId ? -1 : left.ruleId > right.ruleId ? 1 : 0;
}

function matchesRule(
  profile: ChecklistProfile,
  rule: ChecklistRule,
): boolean {
  const outcomes = rule.predicate.conditions.map((condition) => {
    if (condition.kind === "boolean") {
      return profile[condition.field] === condition.value;
    }

    const householdSize = profile.householdSize;
    if (householdSize === null) {
      return false;
    }

    switch (condition.operator) {
      case "equals":
        return householdSize === condition.value;
      case "at_least":
        return householdSize >= condition.value;
      case "at_most":
        return householdSize <= condition.value;
    }
  });

  return rule.predicate.match === "all"
    ? outcomes.every(Boolean)
    : outcomes.some(Boolean);
}

function canonicalProfileFingerprint(profile: ChecklistProfile): string {
  return JSON.stringify(
    PROFILE_FIELD_ORDER.map((field) => profile[field]),
  );
}

function evaluateRuleSet(
  profileInput: ChecklistProfile,
  ruleSetInput: ChecklistRuleSet,
): {
  readonly profile: ChecklistProfile;
  readonly ruleSet: ChecklistRuleSet;
  readonly matchedRules: readonly ChecklistRule[];
  readonly items: readonly ChecklistItemDefinition[];
} {
  // Strict runtime parsing is the client boundary: unsupported profile fields
  // and malformed rule metadata fail before any partial checklist is produced.
  const profile = checklistProfileSchema.parse(profileInput);
  const ruleSet = checklistRuleSetSchema.parse(ruleSetInput);
  const matchedRules = ruleSet.rules
    .filter((rule) => matchesRule(profile, rule))
    .sort(compareRules);

  const orderedItemIds = [
    ...ruleSet.baselineItemIds,
    ...matchedRules.flatMap((rule) => rule.itemIds),
  ];
  const seenItemIds = new Set<string>();
  const items: ChecklistItemDefinition[] = [];

  for (const itemId of orderedItemIds) {
    if (seenItemIds.has(itemId)) {
      continue;
    }

    const item = ruleSet.items[itemId];
    if (item === undefined) {
      // Normally unreachable because the rule-set parser validates references.
      throw new TypeError(`Checklist rule references unknown item: ${itemId}`);
    }

    seenItemIds.add(itemId);
    items.push(item);
  }

  return { profile, ruleSet, matchedRules, items };
}

export function generateChecklist(
  profile: ChecklistProfile,
  ruleSet: ChecklistRuleSet = BUNDLED_CHECKLIST_RULE_SET,
): ChecklistResult {
  const evaluated = evaluateRuleSet(profile, ruleSet);

  return checklistResultSchema.parse({
    ruleVersion: evaluated.ruleSet.version,
    profileFingerprint: canonicalProfileFingerprint(evaluated.profile),
    items: evaluated.items,
  });
}

/**
 * Restores completion state only when its rule version and every stable item ID
 * are supported by the current rule set. Incompatible state is discarded as a
 * unit, then the checklist is regenerated deterministically from the validated
 * saved profile and current rules.
 */
export function restoreChecklist(
  saved: SavedChecklistState,
  profile: ChecklistProfile,
  currentRules: ChecklistRuleSet = BUNDLED_CHECKLIST_RULE_SET,
): ChecklistRestoreResult {
  const rules = checklistRuleSetSchema.parse(currentRules);
  const checklist = generateChecklist(profile, rules);
  const completionCandidate = saved.checklistCompletion;
  const isCompletionRecord =
    typeof completionCandidate === "object" &&
    completionCandidate !== null &&
    !Array.isArray(completionCandidate);
  const completionEntries = isCompletionRecord
    ? Object.entries(completionCandidate)
    : [];
  const hasSupportedVersion = saved.checklistRuleVersion === rules.version;
  const hasOnlyKnownItems =
    isCompletionRecord &&
    completionEntries.every(
      ([itemId, completed]) =>
        Object.prototype.hasOwnProperty.call(rules.items, itemId) &&
        typeof completed === "boolean",
    );

  if (!hasSupportedVersion || !hasOnlyKnownItems) {
    return Object.freeze({
      status: "regenerated",
      checklist,
      completion: Object.freeze({}),
      noticeKey: CHECKLIST_VERSION_CHANGE_NOTICE_KEY,
    });
  }

  return Object.freeze({
    status: "restored",
    checklist,
    completion: Object.freeze(Object.fromEntries(completionEntries)),
    noticeKey: null,
  });
}

export function generateChecklistWithExplanations(
  profile: ChecklistProfile,
  language: Language,
  ruleSet: ChecklistRuleSet = BUNDLED_CHECKLIST_RULE_SET,
  explanationKeys: ChecklistRuleExplanationKeys =
    CHECKLIST_RULE_EXPLANATION_KEYS,
): ChecklistGeneration {
  const evaluated = evaluateRuleSet(profile, ruleSet);
  const checklist = checklistResultSchema.parse({
    ruleVersion: evaluated.ruleSet.version,
    profileFingerprint: canonicalProfileFingerprint(evaluated.profile),
    items: evaluated.items,
  });
  const reasonsByItemId = new Map<string, ChecklistExplanationReason[]>();

  for (const rule of evaluated.matchedRules) {
    const explanationKey = explanationKeys[rule.ruleId];
    if (explanationKey === undefined) {
      throw new TypeError(
        `Checklist rule is missing an explanation key: ${rule.ruleId}`,
      );
    }

    const reason = Object.freeze({
      ruleId: rule.ruleId,
      explanationKey,
      text: resolveMessage(language, explanationKey),
    });

    for (const itemId of rule.itemIds) {
      const reasons = reasonsByItemId.get(itemId) ?? [];
      reasons.push(reason);
      reasonsByItemId.set(itemId, reasons);
    }
  }

  const explanations = checklist.items.flatMap((item) => {
    const reasons = reasonsByItemId.get(item.itemId);
    if (reasons === undefined) {
      return [];
    }

    return [
      Object.freeze({
        itemId: item.itemId,
        ruleVersion: checklist.ruleVersion,
        language,
        guidanceStatus: item.guidanceStatus,
        sourceRefs: Object.freeze([...item.sourceRefs]),
        reasons: Object.freeze([...reasons]),
      }),
    ];
  });

  return Object.freeze({
    checklist,
    explanations: Object.freeze(explanations),
  });
}
