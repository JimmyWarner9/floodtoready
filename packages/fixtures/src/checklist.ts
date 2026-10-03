import {
  checklistRuleSetSchema,
  type ChecklistRuleSet,
} from "@banjir-ready/contracts";

import { fixtureSources } from "./sources.js";
import { CHECKLIST_RULE_VERSION } from "./versions.js";

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}

const malaysiaDisasterSource = fixtureSources.malaysiaDisasterGuidance;

const checklistRuleCandidate = {
  version: CHECKLIST_RULE_VERSION,
  baselineItemIds: [
    "checklist-item.drinking-water",
    "checklist-item.shelf-stable-food",
    "checklist-item.important-documents",
    "checklist-item.lighting-radio",
    "checklist-item.emergency-plan",
  ],
  // Deliberately stored outside evaluation order. The engine owns ordering.
  rules: [
    {
      ruleId: "checklist-rule.transport-unavailable",
      predicate: {
        match: "all",
        conditions: [
          { kind: "boolean", field: "hasTransport", value: false },
        ],
      },
      itemIds: ["checklist-item.alternate-transport"],
      priority: 60,
    },
    {
      ruleId: "checklist-rule.pets",
      predicate: {
        match: "all",
        conditions: [{ kind: "boolean", field: "hasPets", value: true }],
      },
      itemIds: ["checklist-item.pet-supplies"],
      priority: 30,
    },
    {
      ruleId: "checklist-rule.children",
      predicate: {
        match: "all",
        conditions: [
          { kind: "boolean", field: "hasChildren", value: true },
        ],
      },
      itemIds: [
        "checklist-item.children-supplies",
        "checklist-item.household-support-plan",
      ],
      priority: 10,
    },
    {
      ruleId: "checklist-rule.transport-available",
      predicate: {
        match: "all",
        conditions: [
          { kind: "boolean", field: "hasTransport", value: true },
        ],
      },
      itemIds: ["checklist-item.vehicle-readiness"],
      priority: 50,
    },
    {
      ruleId: "checklist-rule.mobility-assistance",
      predicate: {
        match: "all",
        conditions: [
          {
            kind: "boolean",
            field: "needsMobilityAssistance",
            value: true,
          },
        ],
      },
      itemIds: [
        "checklist-item.mobility-plan",
        "checklist-item.household-support-plan",
      ],
      priority: 30,
    },
    {
      ruleId: "checklist-rule.large-household",
      predicate: {
        match: "all",
        conditions: [
          { kind: "household_size", operator: "at_least", value: 5 },
        ],
      },
      itemIds: ["checklist-item.extra-supplies"],
      priority: 5,
    },
    {
      ruleId: "checklist-rule.elderly-members",
      predicate: {
        match: "all",
        conditions: [
          {
            kind: "boolean",
            field: "hasElderlyMembers",
            value: true,
          },
        ],
      },
      itemIds: [
        "checklist-item.elderly-supplies",
        "checklist-item.household-support-plan",
      ],
      priority: 20,
    },
  ],
  items: {
    "checklist-item.drinking-water": {
      itemId: "checklist-item.drinking-water",
      wordingKey: "checklist.items.drinkingWater",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.shelf-stable-food": {
      itemId: "checklist-item.shelf-stable-food",
      wordingKey: "checklist.items.shelfStableFood",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.important-documents": {
      itemId: "checklist-item.important-documents",
      wordingKey: "checklist.items.importantDocuments",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.lighting-radio": {
      itemId: "checklist-item.lighting-radio",
      wordingKey: "checklist.items.lightingRadio",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.emergency-plan": {
      itemId: "checklist-item.emergency-plan",
      wordingKey: "checklist.items.emergencyPlan",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.extra-supplies": {
      itemId: "checklist-item.extra-supplies",
      wordingKey: "checklist.items.extraSupplies",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.children-supplies": {
      itemId: "checklist-item.children-supplies",
      wordingKey: "checklist.items.childrenSupplies",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.elderly-supplies": {
      itemId: "checklist-item.elderly-supplies",
      wordingKey: "checklist.items.elderlySupplies",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.mobility-plan": {
      itemId: "checklist-item.mobility-plan",
      wordingKey: "checklist.items.mobilityPlan",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.household-support-plan": {
      itemId: "checklist-item.household-support-plan",
      wordingKey: "checklist.items.householdSupportPlan",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.pet-supplies": {
      itemId: "checklist-item.pet-supplies",
      wordingKey: "checklist.items.petSupplies",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.vehicle-readiness": {
      itemId: "checklist-item.vehicle-readiness",
      wordingKey: "checklist.items.vehicleReadiness",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
    "checklist-item.alternate-transport": {
      itemId: "checklist-item.alternate-transport",
      wordingKey: "checklist.items.alternateTransport",
      sourceRefs: [malaysiaDisasterSource],
      guidanceStatus: "Demo_Guidance",
    },
  },
} as const;

export const BUNDLED_CHECKLIST_RULE_SET: ChecklistRuleSet = deepFreeze(
  checklistRuleSetSchema.parse(checklistRuleCandidate),
);

export const CHECKLIST_RULE_EXPLANATION_KEYS = Object.freeze({
  "checklist-rule.large-household": "checklist.explanations.largeHousehold",
  "checklist-rule.children": "checklist.explanations.children",
  "checklist-rule.elderly-members": "checklist.explanations.elderlyMembers",
  "checklist-rule.mobility-assistance":
    "checklist.explanations.mobilityAssistance",
  "checklist-rule.pets": "checklist.explanations.pets",
  "checklist-rule.transport-available":
    "checklist.explanations.transportAvailable",
  "checklist-rule.transport-unavailable":
    "checklist.explanations.transportUnavailable",
} as const);
