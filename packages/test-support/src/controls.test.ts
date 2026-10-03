import { sample, integer } from "fast-check";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  CHECKLIST_RULE_VERSION,
  CORPUS_VERSION,
  DEFAULT_PROPERTY_TEST_CONTROLS,
  DEFAULT_PROVIDER_CONFIGURATION,
  DEFAULT_STARTUP_CONFIGURATION,
  DEFAULT_VERSIONS,
  FIXTURE_VERSION,
  createDeterministicTestControls,
  createFixedClock,
  createSeededPropertyTestControls,
  createSystemClock,
} from "./controls.js";

const copyProviderConfiguration = () => ({
  ...DEFAULT_PROVIDER_CONFIGURATION,
  freshnessPolicies: DEFAULT_PROVIDER_CONFIGURATION.freshnessPolicies.map(
    (policy) => ({ ...policy }),
  ),
  providers: DEFAULT_PROVIDER_CONFIGURATION.providers.map((provider) => ({
    ...provider,
  })),
});

describe("deterministic test controls", () => {
  it("publishes validated versions and credential-free provider defaults", () => {
    expect(DEFAULT_VERSIONS).toEqual({
      fixtureVersion: FIXTURE_VERSION,
      corpusVersion: CORPUS_VERSION,
      checklistRuleVersion: CHECKLIST_RULE_VERSION,
    });
    expect(DEFAULT_STARTUP_CONFIGURATION).toEqual({
      versions: DEFAULT_VERSIONS,
      providerConfiguration: DEFAULT_PROVIDER_CONFIGURATION,
    });
    expect(DEFAULT_PROVIDER_CONFIGURATION).toMatchObject({
      credentialFreeMode: true,
      providerAttemptTimeoutMs: 3_000,
    });
    expect(
      DEFAULT_PROVIDER_CONFIGURATION.freshnessPolicies.map(
        ({ category, maxAgeMs }) => [category, maxAgeMs],
      ),
    ).toEqual([
      ["alert_like", 30 * 60 * 1_000],
      ["agency", 30 * 24 * 60 * 60 * 1_000],
      ["guidance", 180 * 24 * 60 * 60 * 1_000],
    ]);
  });

  it("returns a defensive Date copy from a fixed injectable clock", () => {
    const instant = "2025-01-01T00:00:00.000Z";
    const clock = createFixedClock(instant);
    const first = clock.now();

    first.setUTCFullYear(2030);

    expect(clock.now().toISOString()).toBe(instant);
    expect(clock.now()).not.toBe(clock.now());
  });

  it("accepts a custom clock while validating every value it returns", () => {
    const controls = createDeterministicTestControls({
      clock: {
        now: () => new Date("2026-06-01T12:00:00.000Z"),
      },
    });

    expect(controls.clock.now().toISOString()).toBe(
      "2026-06-01T12:00:00.000Z",
    );
    expect(() =>
      createDeterministicTestControls({
        clock: { now: () => new Date(Number.NaN) },
      }).clock.now(),
    ).toThrow(TypeError);
  });

  it("provides a valid system clock without sharing mutable Date objects", () => {
    const clock = createSystemClock();
    const first = clock.now();
    const second = clock.now();

    expect(Number.isFinite(first.getTime())).toBe(true);
    expect(Number.isFinite(second.getTime())).toBe(true);
    expect(first).not.toBe(second);
  });

  it("makes seeded random samples reproducible", () => {
    const controls = createSeededPropertyTestControls({
      seed: 123_456,
      numRuns: 100,
    });
    const first = sample(integer(), controls);
    const second = sample(integer(), controls);

    expect(first).toEqual(second);
    expect(controls).toEqual({ seed: 123_456, numRuns: 100 });
    expect(DEFAULT_PROPERTY_TEST_CONTROLS.numRuns).toBeGreaterThanOrEqual(100);
  });

  it.each([
    { seed: -1 },
    { seed: 1.5 },
    { numRuns: -1 },
    { numRuns: 99 },
    { numRuns: Number.POSITIVE_INFINITY },
    { unknown: true },
  ])("rejects malformed or negative seeded controls: %o", (candidate) => {
    expect(() => createSeededPropertyTestControls(candidate)).toThrow();
  });

  it.each([
    { ...DEFAULT_VERSIONS, fixtureVersion: "bad version" },
    { ...DEFAULT_VERSIONS, corpusVersion: "" },
    { ...DEFAULT_VERSIONS, checklistRuleVersion: "../rules" },
    { ...DEFAULT_VERSIONS, additionalVersion: "not-allowed" },
  ])("fails closed on malformed version configuration: %o", (versions) => {
    expect(() => createDeterministicTestControls({ versions })).toThrow(
      ZodError,
    );
  });

  it("fails closed on negative, incomplete, or ambiguous provider configuration", () => {
    const negativeTimeout = {
      ...copyProviderConfiguration(),
      providerAttemptTimeoutMs: -1,
    };
    const negativeAge = copyProviderConfiguration();
    negativeAge.freshnessPolicies = negativeAge.freshnessPolicies.map(
      (policy, index) =>
        index === 0 ? { ...policy, maxAgeMs: -1 } : policy,
    );
    const repeatedCategory = copyProviderConfiguration();
    repeatedCategory.freshnessPolicies =
      repeatedCategory.freshnessPolicies.map((policy, index) =>
        index === 1
          ? { ...policy, category: "alert_like" as const }
          : policy,
      );

    for (const providerConfiguration of [
      negativeTimeout,
      negativeAge,
      repeatedCategory,
    ]) {
      expect(() =>
        createDeterministicTestControls({ providerConfiguration }),
      ).toThrow(ZodError);
    }
  });

  it("rejects unsupported top-level fields without exposing their values", () => {
    expect(() =>
      createDeterministicTestControls({ authorization: "sentinel-secret" }),
    ).toThrow("Deterministic test controls contains an unsupported field");
  });

  it("returns complete defaults from an empty input", () => {
    const controls = createDeterministicTestControls();

    expect(controls.versions).toEqual(DEFAULT_VERSIONS);
    expect(controls.providerConfiguration).toEqual(
      DEFAULT_PROVIDER_CONFIGURATION,
    );
    expect(controls.propertyTest).toEqual(DEFAULT_PROPERTY_TEST_CONTROLS);
    expect(controls.clock.now().toISOString()).toBe(
      "2025-01-01T00:00:00.000Z",
    );
  });
});
