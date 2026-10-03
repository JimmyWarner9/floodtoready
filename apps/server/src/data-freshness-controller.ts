import {
  parseFreshnessPolicy,
  type DataClass,
  type FreshnessPolicy,
  type StaleBehavior,
} from "@banjir-ready/contracts";

export type FreshnessCategory = FreshnessPolicy["category"];

export interface FreshnessClock {
  now(): Date;
}

export interface DataFreshnessControllerOptions {
  readonly clock?: FreshnessClock;
  readonly policies?: readonly unknown[];
}

export type StaleReason =
  | "maximum_age_exceeded"
  | "missing_source_timestamp"
  | "invalid_source_timestamp"
  | "future_source_timestamp";

interface FreshnessClassificationBase {
  readonly category: FreshnessCategory;
  readonly maxAgeMs: number;
  readonly sourceTimestamp: string | null;
  readonly retrievalTimestamp: string;
  readonly ageMs: number | null;
}

export interface CurrentFreshnessClassification
  extends FreshnessClassificationBase {
  readonly freshness: "current";
  readonly ageMs: number;
  readonly sourceTimestamp: string;
  readonly reason: null;
}

export interface StaleFreshnessClassification
  extends FreshnessClassificationBase {
  readonly freshness: "stale";
  readonly reason: StaleReason;
}

export type FreshnessClassification =
  | CurrentFreshnessClassification
  | StaleFreshnessClassification;

export interface DemoFallback<T> {
  readonly record: T;
  readonly dataClass: Extract<DataClass, "Demo_Data">;
}

export interface ApplyFreshnessInput<T> {
  readonly category: FreshnessCategory;
  readonly sourceTimestamp: unknown;
  readonly record: T;
  readonly demoFallback?: DemoFallback<T>;
}

interface FreshnessOutcomeBase {
  readonly category: FreshnessCategory;
  readonly sourceTimestamp: string | null;
  readonly retrievalTimestamp: string;
  readonly ageMs: number | null;
}

export interface CurrentFreshnessOutcome<T> extends FreshnessOutcomeBase {
  readonly action: "use_record";
  readonly freshness: "current";
  readonly ageMs: number;
  readonly sourceTimestamp: string;
  readonly record: T;
}

export interface WarnAndUseFreshnessOutcome<T> extends FreshnessOutcomeBase {
  readonly action: "warn_and_use";
  readonly freshness: "stale";
  readonly staleReason: StaleReason;
  readonly staleWarningMessageKey: "freshness.staleWarning";
  readonly record: T;
}

export interface SwitchToDemoFreshnessOutcome<T> extends FreshnessOutcomeBase {
  readonly action: "switch_to_demo";
  readonly freshness: "stale";
  readonly staleReason: StaleReason;
  readonly replacementReasonMessageKey: "freshness.replacementReason";
  readonly dataClass: "Demo_Data";
  readonly record: T;
}

export interface MarkUnavailableFreshnessOutcome
  extends FreshnessOutcomeBase {
  readonly action: "mark_unavailable";
  readonly freshness: "unavailable";
  readonly staleReason: StaleReason;
  readonly unavailableMessageKey: "freshness.unavailable";
  readonly record: null;
}

export type FreshnessOutcome<T> =
  | CurrentFreshnessOutcome<T>
  | WarnAndUseFreshnessOutcome<T>
  | SwitchToDemoFreshnessOutcome<T>
  | MarkUnavailableFreshnessOutcome;

const MINUTE_MS = 60 * 1_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const CATEGORIES = ["alert_like", "agency", "guidance"] as const;

export const DEFAULT_FRESHNESS_POLICIES: Readonly<
  Record<FreshnessCategory, Readonly<FreshnessPolicy>>
> = Object.freeze({
  alert_like: Object.freeze({
    category: "alert_like",
    maxAgeMs: 30 * MINUTE_MS,
    behavior: "warn_and_use",
  }),
  agency: Object.freeze({
    category: "agency",
    maxAgeMs: 30 * DAY_MS,
    behavior: "warn_and_use",
  }),
  guidance: Object.freeze({
    category: "guidance",
    maxAgeMs: 180 * DAY_MS,
    behavior: "warn_and_use",
  }),
});

const ISO_UTC_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

function parseIsoUtcTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;

  const match = ISO_UTC_PATTERN.exec(value);
  if (match === null) return null;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;

  const [, year, month, day, hour, minute, second, fraction = ""] = match;
  const milliseconds = Number(fraction.padEnd(3, "0"));

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day) ||
    parsed.getUTCHours() !== Number(hour) ||
    parsed.getUTCMinutes() !== Number(minute) ||
    parsed.getUTCSeconds() !== Number(second) ||
    parsed.getUTCMilliseconds() !== milliseconds
  ) {
    return null;
  }

  return parsed.getTime();
}

function copyPolicies(
  configuredPolicies: readonly unknown[] | undefined,
): Readonly<Record<FreshnessCategory, Readonly<FreshnessPolicy>>> {
  if (configuredPolicies === undefined) return DEFAULT_FRESHNESS_POLICIES;
  if (configuredPolicies.length !== CATEGORIES.length) {
    throw new TypeError(
      "Freshness configuration requires each supported category exactly once",
    );
  }

  const policies = configuredPolicies.map((policy) =>
    Object.freeze(parseFreshnessPolicy(policy)),
  );
  const byCategory = new Map(
    policies.map((policy) => [policy.category, policy] as const),
  );

  if (
    byCategory.size !== CATEGORIES.length ||
    CATEGORIES.some((category) => !byCategory.has(category))
  ) {
    throw new TypeError(
      "Freshness configuration requires each supported category exactly once",
    );
  }

  const requirePolicy = (
    category: FreshnessCategory,
  ): Readonly<FreshnessPolicy> => {
    const policy = byCategory.get(category);
    if (policy === undefined) {
      throw new TypeError(
        "Freshness configuration requires each supported category exactly once",
      );
    }
    return policy;
  };

  return Object.freeze({
    alert_like: requirePolicy("alert_like"),
    agency: requirePolicy("agency"),
    guidance: requirePolicy("guidance"),
  });
}

function readClock(clock: FreshnessClock): Date {
  const now = clock.now();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("Freshness clock must return a valid Date");
  }
  return new Date(now.getTime());
}

function recordKind(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const kind = (value as Record<string, unknown>).kind;
  return typeof kind === "string" ? kind : null;
}

function assertCompatibleDemoFallback<T>(
  sourceRecord: T,
  fallback: DemoFallback<T> | undefined,
): asserts fallback is DemoFallback<T> {
  if (fallback === undefined || fallback.dataClass !== "Demo_Data") {
    throw new TypeError(
      "switch_to_demo requires an explicitly Demo_Data-classified fallback",
    );
  }

  const sourceKind = recordKind(sourceRecord);
  const fallbackKind = recordKind(fallback.record);
  if (
    (sourceKind !== null || fallbackKind !== null) &&
    sourceKind !== fallbackKind
  ) {
    throw new TypeError("Demo fallback must preserve the source record kind");
  }
}

export class DataFreshnessController {
  readonly #clock: FreshnessClock;
  readonly #policies: Readonly<
    Record<FreshnessCategory, Readonly<FreshnessPolicy>>
  >;

  public constructor(options: DataFreshnessControllerOptions = {}) {
    this.#clock = options.clock ?? { now: () => new Date() };
    if (
      typeof this.#clock !== "object" ||
      this.#clock === null ||
      typeof this.#clock.now !== "function"
    ) {
      throw new TypeError("Freshness clock must provide a now function");
    }
    this.#policies = copyPolicies(options.policies);
  }

  public getPolicy(category: FreshnessCategory): Readonly<FreshnessPolicy> {
    return this.#policies[category];
  }

  public classify(
    category: FreshnessCategory,
    sourceTimestamp: unknown,
  ): FreshnessClassification {
    const policy = this.getPolicy(category);
    const now = readClock(this.#clock);
    const retrievalTimestamp = now.toISOString();

    if (sourceTimestamp === null || sourceTimestamp === undefined) {
      return Object.freeze({
        category,
        freshness: "stale",
        maxAgeMs: policy.maxAgeMs,
        ageMs: null,
        sourceTimestamp: null,
        retrievalTimestamp,
        reason: "missing_source_timestamp",
      });
    }

    const sourceTime = parseIsoUtcTimestamp(sourceTimestamp);
    if (sourceTime === null) {
      return Object.freeze({
        category,
        freshness: "stale",
        maxAgeMs: policy.maxAgeMs,
        ageMs: null,
        sourceTimestamp: null,
        retrievalTimestamp,
        reason: "invalid_source_timestamp",
      });
    }

    const normalizedSourceTimestamp = sourceTimestamp as string;
    const ageMs = now.getTime() - sourceTime;
    if (ageMs < 0) {
      return Object.freeze({
        category,
        freshness: "stale",
        maxAgeMs: policy.maxAgeMs,
        ageMs,
        sourceTimestamp: normalizedSourceTimestamp,
        retrievalTimestamp,
        reason: "future_source_timestamp",
      });
    }

    if (ageMs <= policy.maxAgeMs) {
      return Object.freeze({
        category,
        freshness: "current",
        maxAgeMs: policy.maxAgeMs,
        ageMs,
        sourceTimestamp: normalizedSourceTimestamp,
        retrievalTimestamp,
        reason: null,
      });
    }

    return Object.freeze({
      category,
      freshness: "stale",
      maxAgeMs: policy.maxAgeMs,
      ageMs,
      sourceTimestamp: normalizedSourceTimestamp,
      retrievalTimestamp,
      reason: "maximum_age_exceeded",
    });
  }

  public applyPolicy<T>(input: ApplyFreshnessInput<T>): FreshnessOutcome<T> {
    const classification = this.classify(
      input.category,
      input.sourceTimestamp,
    );

    if (classification.freshness === "current") {
      return Object.freeze({
        action: "use_record",
        freshness: "current",
        category: classification.category,
        ageMs: classification.ageMs,
        sourceTimestamp: classification.sourceTimestamp,
        retrievalTimestamp: classification.retrievalTimestamp,
        record: input.record,
      });
    }

    const common = {
      category: classification.category,
      ageMs: classification.ageMs,
      sourceTimestamp: classification.sourceTimestamp,
      retrievalTimestamp: classification.retrievalTimestamp,
      staleReason: classification.reason,
    } as const;
    const behavior: StaleBehavior = this.getPolicy(input.category).behavior;

    switch (behavior) {
      case "warn_and_use":
        return Object.freeze({
          ...common,
          action: "warn_and_use",
          freshness: "stale",
          staleWarningMessageKey: "freshness.staleWarning" as const,
          record: input.record,
        });
      case "switch_to_demo":
        assertCompatibleDemoFallback(input.record, input.demoFallback);
        return Object.freeze({
          ...common,
          action: "switch_to_demo",
          freshness: "stale",
          replacementReasonMessageKey: "freshness.replacementReason" as const,
          dataClass: input.demoFallback.dataClass,
          record: input.demoFallback.record,
        });
      case "mark_unavailable":
        return Object.freeze({
          ...common,
          action: "mark_unavailable",
          freshness: "unavailable",
          unavailableMessageKey: "freshness.unavailable" as const,
          record: null,
        });
    }
  }
}
