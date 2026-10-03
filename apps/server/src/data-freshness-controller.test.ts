import { describe, expect, it } from "vitest";

import {
  DataFreshnessController,
  DEFAULT_FRESHNESS_POLICIES,
  type FreshnessClock,
} from "./data-freshness-controller.js";

const NOW = "2025-01-01T00:00:00.000Z";
const fixedClock: FreshnessClock = {
  now: () => new Date(NOW),
};

function timestampAtAge(ageMs: number): string {
  return new Date(Date.parse(NOW) - ageMs).toISOString();
}

function policiesWith(
  category: "alert_like" | "agency" | "guidance",
  behavior: "warn_and_use" | "switch_to_demo" | "mark_unavailable",
  maxAgeMs = DEFAULT_FRESHNESS_POLICIES[category].maxAgeMs,
) {
  return Object.values(DEFAULT_FRESHNESS_POLICIES).map((policy) =>
    policy.category === category
      ? { ...policy, behavior, maxAgeMs }
      : { ...policy },
  );
}

describe("DataFreshnessController", () => {
  it.each([
    ["alert_like", 30 * 60 * 1_000],
    ["agency", 30 * 24 * 60 * 60 * 1_000],
    ["guidance", 180 * 24 * 60 * 60 * 1_000],
  ] as const)(
    "uses the default %s maximum and includes both zero and exact maximum age",
    (category, maximumAge) => {
      const controller = new DataFreshnessController({ clock: fixedClock });

      expect(controller.getPolicy(category)).toMatchObject({
        category,
        maxAgeMs: maximumAge,
        behavior: "warn_and_use",
      });
      expect(controller.classify(category, NOW)).toMatchObject({
        freshness: "current",
        ageMs: 0,
      });
      expect(
        controller.classify(category, timestampAtAge(maximumAge)),
      ).toMatchObject({ freshness: "current", ageMs: maximumAge });
      expect(
        controller.classify(category, timestampAtAge(maximumAge + 1)),
      ).toMatchObject({
        freshness: "stale",
        ageMs: maximumAge + 1,
        reason: "maximum_age_exceeded",
      });
    },
  );

  it("classifies absent, malformed, impossible, non-UTC, and future timestamps as stale", () => {
    const controller = new DataFreshnessController({ clock: fixedClock });

    expect(controller.classify("alert_like", null)).toMatchObject({
      freshness: "stale",
      sourceTimestamp: null,
      ageMs: null,
      reason: "missing_source_timestamp",
    });
    expect(controller.classify("alert_like", undefined)).toMatchObject({
      reason: "missing_source_timestamp",
    });

    for (const invalid of [
      "not-a-date",
      "2025-02-30T00:00:00.000Z",
      "2025-01-01T00:00:00.000+00:00",
      1_735_689_600_000,
    ]) {
      expect(controller.classify("alert_like", invalid)).toMatchObject({
        freshness: "stale",
        sourceTimestamp: null,
        ageMs: null,
        reason: "invalid_source_timestamp",
      });
    }

    expect(
      controller.classify("alert_like", "2025-01-01T00:00:00.001Z"),
    ).toMatchObject({
      freshness: "stale",
      sourceTimestamp: "2025-01-01T00:00:00.001Z",
      ageMs: -1,
      reason: "future_source_timestamp",
    });
  });

  it("accepts one complete custom policy per category and rejects ambiguous configuration", () => {
    const policies = policiesWith("agency", "mark_unavailable", 42);
    const controller = new DataFreshnessController({
      clock: fixedClock,
      policies,
    });

    expect(controller.getPolicy("agency")).toEqual({
      category: "agency",
      maxAgeMs: 42,
      behavior: "mark_unavailable",
    });
    expect(
      controller.classify("agency", timestampAtAge(43)),
    ).toMatchObject({ freshness: "stale", ageMs: 43 });

    expect(
      () =>
        new DataFreshnessController({
          clock: fixedClock,
          policies: policies.slice(0, 2),
        }),
    ).toThrow("each supported category exactly once");
    expect(
      () =>
        new DataFreshnessController({
          clock: fixedClock,
          policies: [policies[0], policies[0], policies[2]],
        }),
    ).toThrow("each supported category exactly once");
    expect(
      () =>
        new DataFreshnessController({
          clock: fixedClock,
          policies: policiesWith("agency", "warn_and_use", -1),
        }),
    ).toThrow();
  });

  it("returns a current record without applying its configured stale behavior", () => {
    const record = { recordId: "live.1", value: 7 };
    const controller = new DataFreshnessController({
      clock: fixedClock,
      policies: policiesWith("alert_like", "mark_unavailable"),
    });

    expect(
      controller.applyPolicy({
        category: "alert_like",
        sourceTimestamp: NOW,
        record,
      }),
    ).toEqual({
      action: "use_record",
      freshness: "current",
      category: "alert_like",
      ageMs: 0,
      sourceTimestamp: NOW,
      retrievalTimestamp: NOW,
      record,
    });
  });

  it("warn_and_use preserves the stale record and exposes safe warning timestamps", () => {
    const record = { recordId: "agency.live", phone: "03-0000 0000" };
    const sourceTimestamp = timestampAtAge(31 * 24 * 60 * 60 * 1_000);
    const controller = new DataFreshnessController({ clock: fixedClock });

    expect(
      controller.applyPolicy({
        category: "agency",
        sourceTimestamp,
        record,
      }),
    ).toEqual({
      action: "warn_and_use",
      freshness: "stale",
      category: "agency",
      ageMs: 31 * 24 * 60 * 60 * 1_000,
      sourceTimestamp,
      retrievalTimestamp: NOW,
      staleReason: "maximum_age_exceeded",
      staleWarningMessageKey: "freshness.staleWarning",
      record,
    });
  });

  it("switch_to_demo replaces stale data with explicitly demo-classified data and preserves kind", () => {
    const liveRecord = {
      kind: "rainfall_observation" as const,
      recordId: "rain.live",
      amountMm: 24,
    };
    const demoRecord = {
      kind: "rainfall_observation" as const,
      recordId: "rain.demo",
      amountMm: 10,
    };
    const controller = new DataFreshnessController({
      clock: fixedClock,
      policies: policiesWith("alert_like", "switch_to_demo"),
    });

    expect(
      controller.applyPolicy({
        category: "alert_like",
        sourceTimestamp: null,
        record: liveRecord,
        demoFallback: { record: demoRecord, dataClass: "Demo_Data" },
      }),
    ).toEqual({
      action: "switch_to_demo",
      freshness: "stale",
      category: "alert_like",
      ageMs: null,
      sourceTimestamp: null,
      retrievalTimestamp: NOW,
      staleReason: "missing_source_timestamp",
      replacementReasonMessageKey: "freshness.replacementReason",
      dataClass: "Demo_Data",
      record: demoRecord,
    });
  });

  it("fails closed when switch_to_demo lacks a demo fallback or changes record kind", () => {
    const controller = new DataFreshnessController({
      clock: fixedClock,
      policies: policiesWith("alert_like", "switch_to_demo"),
    });
    const liveRecord = { kind: "river_reading" as const, recordId: "river.live" };

    expect(() =>
      controller.applyPolicy({
        category: "alert_like",
        sourceTimestamp: null,
        record: liveRecord,
      }),
    ).toThrow("Demo_Data-classified fallback");

    expect(() =>
      controller.applyPolicy({
        category: "alert_like",
        sourceTimestamp: null,
        record: liveRecord,
        demoFallback: {
          record: {
            kind: "official_warning",
            recordId: "warning.demo",
          } as unknown as typeof liveRecord,
          dataClass: "Demo_Data",
        },
      }),
    ).toThrow("preserve the source record kind");
  });

  it("mark_unavailable suppresses the operational record and returns localized guidance", () => {
    const controller = new DataFreshnessController({
      clock: fixedClock,
      policies: policiesWith("guidance", "mark_unavailable"),
    });

    expect(
      controller.applyPolicy({
        category: "guidance",
        sourceTimestamp: "invalid-sensitive-provider-value",
        record: { recordId: "guidance.live", body: "operational value" },
      }),
    ).toEqual({
      action: "mark_unavailable",
      freshness: "unavailable",
      category: "guidance",
      ageMs: null,
      sourceTimestamp: null,
      retrievalTimestamp: NOW,
      staleReason: "invalid_source_timestamp",
      unavailableMessageKey: "freshness.unavailable",
      record: null,
    });
  });

  it("rejects an invalid injected clock instead of classifying data with it", () => {
    const controller = new DataFreshnessController({
      clock: { now: () => new Date(Number.NaN) },
    });

    expect(() => controller.classify("alert_like", NOW)).toThrow(
      "clock must return a valid Date",
    );
  });
});
