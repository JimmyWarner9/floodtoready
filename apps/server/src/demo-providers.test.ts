import { FIXTURE_VERSION } from "@banjir-ready/fixtures";
import { describe, expect, it, vi } from "vitest";

import {
  demoProviders,
  guidanceDemoProvider,
  officialWarningDemoProvider,
  rainfallObservationDemoProvider,
  riverReadingDemoProvider,
  type ProviderContext,
} from "./demo-providers.js";

const FIXED_INSTANT = "2025-01-15T08:05:00.000Z";

function fixedContext(
  instant = FIXED_INSTANT,
  fixtureVersion = FIXTURE_VERSION,
): ProviderContext {
  return {
    fixtureVersion,
    clock: {
      now: (): Date => new Date(instant),
    },
  };
}

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;

  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

describe("deterministic bundled demo providers", () => {
  it("returns selected-language guidance with stable identity, order, and fixed-clock metadata", async () => {
    const first = await guidanceDemoProvider.fetch(
      { language: "en" },
      fixedContext(),
    );
    const second = await guidanceDemoProvider.fetch(
      { language: "en" },
      fixedContext(),
    );

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      capability: "guidance",
      dataClass: "Demo_Data",
      fixtureVersion: FIXTURE_VERSION,
      retrievalTimestamp: FIXED_INSTANT,
      descriptor: {
        providerName: "bundled-demo",
        providerMode: "demo",
        availability: "available",
        verification: "unverified",
      },
    });
    expect(first.records.map(({ recordId }) => recordId)).toEqual([
      "guidance.prepare-supplies",
      "guidance.avoid-floodwater",
    ]);
    expect(first.records.every(({ language }) => language === "en")).toBe(
      true,
    );
  });

  it("keeps rainfall, river, and official-warning fixtures in separate stable channels", async () => {
    const context = fixedContext();
    const rainfall = await rainfallObservationDemoProvider.fetch({}, context);
    const river = await riverReadingDemoProvider.fetch({}, context);
    const warning = await officialWarningDemoProvider.fetch({}, context);

    expect(rainfall.records.map(({ kind }) => kind)).toEqual([
      "rainfall_observation",
    ]);
    expect(river.records.map(({ kind }) => kind)).toEqual(["river_reading"]);
    expect(warning.records.map(({ kind }) => kind)).toEqual([
      "official_warning",
    ]);
    expect([
      rainfall.records[0]?.recordId,
      river.records[0]?.recordId,
      warning.records[0]?.recordId,
    ]).toEqual([
      "rainfall.demo-station-001.20250115t0800z",
      "river.demo-station-001.20250115t0800z",
      "warning.demo-district-001.20250115t0730z",
    ]);
  });

  it("classifies every provider batch and situation record as immutable demo data", async () => {
    const context = fixedContext();
    const batches = [
      await guidanceDemoProvider.fetch({ language: "ms" }, context),
      await rainfallObservationDemoProvider.fetch({}, context),
      await riverReadingDemoProvider.fetch({}, context),
      await officialWarningDemoProvider.fetch({}, context),
    ];

    for (const batch of batches) {
      expect(batch.dataClass).toBe("Demo_Data");
      expect(batch.fixtureVersion).toBe(FIXTURE_VERSION);
      expect(batch.descriptor.providerMode).toBe("demo");
      expect(batch.descriptor.verification).toBe("unverified");
      expectDeeplyFrozen(batch);
    }

    for (const batch of batches.slice(1)) {
      for (const record of batch.records) {
        if (!("provenance" in record)) {
          throw new TypeError("Situation provider omitted provenance");
        }
        expect(record.provenance).toMatchObject({
          providerName: "bundled-demo",
          providerMode: "demo",
          dataClass: "Demo_Data",
          fixtureVersion: FIXTURE_VERSION,
          retrievalTimestamp: FIXED_INSTANT,
        });
      }
    }

    expect(() => {
      (batches[0]?.records as unknown[]).reverse();
    }).toThrow(TypeError);
  });

  it("never calls an outbound network primitive for baseline provider requests", async () => {
    const outboundFetch = vi.fn();
    vi.stubGlobal("fetch", outboundFetch);

    try {
      await Promise.all([
        demoProviders.guidance.fetch({ language: "en" }, fixedContext()),
        demoProviders.rainfallObservation.fetch({}, fixedContext()),
        demoProviders.riverReading.fetch({}, fixedContext()),
        demoProviders.officialWarning.fetch({}, fixedContext()),
      ]);

      expect(outboundFetch).not.toHaveBeenCalled();
      expect(
        Object.values(demoProviders).every(
          ({ permitsOutboundNetwork, transport }) =>
            !permitsOutboundNetwork && transport === "bundled_fixture",
        ),
      ).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("fails closed for unsupported versions, malformed clocks, and unknown inputs", async () => {
    await expect(
      guidanceDemoProvider.fetch(
        { language: "en" },
        fixedContext(FIXED_INSTANT, "unknown-fixture-v1"),
      ),
    ).rejects.toThrow("Unsupported bundled fixture version");

    await expect(
      rainfallObservationDemoProvider.fetch(
        {},
        {
          fixtureVersion: FIXTURE_VERSION,
          clock: { now: () => new Date(Number.NaN) },
        },
      ),
    ).rejects.toThrow("must return a valid Date");

    await expect(
      guidanceDemoProvider.fetch(
        { language: "en", query: "ignored" } as never,
        fixedContext(),
      ),
    ).rejects.toThrow("exactly the supported fields");

    await expect(
      officialWarningDemoProvider.fetch(
        { language: "en" } as never,
        fixedContext(),
      ),
    ).rejects.toThrow("must be an empty object");
  });
});
