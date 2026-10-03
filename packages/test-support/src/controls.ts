import {
  parseDeterministicVersions,
  parseProviderConfiguration,
  parseStartupConfiguration,
  parseVersionIdentifier,
  type DeterministicVersions,
  type ProviderConfiguration,
  type StartupConfiguration,
} from "@banjir-ready/contracts";
import {
  APPROVED_KNOWLEDGE_CORPUS_VERSION as BUNDLED_CORPUS_VERSION,
  CHECKLIST_RULE_VERSION as BUNDLED_CHECKLIST_RULE_VERSION,
  FIXTURE_VERSION as BUNDLED_FIXTURE_VERSION,
} from "@banjir-ready/fixtures";

export interface Clock {
  now(): Date;
}

export interface SeededPropertyTestControls {
  seed: number;
  numRuns: number;
}

export interface DeterministicTestControls extends StartupConfiguration {
  clock: Clock;
  propertyTest: SeededPropertyTestControls;
}

const DEFAULT_FIXED_INSTANT = "2025-01-01T00:00:00.000Z";
const MINIMUM_PROPERTY_RUNS = 100;
const MAXIMUM_PROPERTY_RUNS = 100_000;
const MAXIMUM_PROPERTY_SEED = 0x7fff_ffff;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  context: string,
): void {
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TypeError(`${context} contains an unsupported field`);
  }
}

function cloneValidDate(value: unknown, context: string): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError(`${context} must return a valid Date`);
  }

  return new Date(value.getTime());
}

export function createFixedClock(instant: string | Date): Clock {
  const parsed =
    typeof instant === "string" ? new Date(instant) : cloneValidDate(instant, "Clock");

  if (
    !Number.isFinite(parsed.getTime()) ||
    (typeof instant === "string" && parsed.toISOString() !== instant)
  ) {
    throw new TypeError("Fixed clock instant must be a canonical ISO-8601 UTC timestamp");
  }

  const timestamp = parsed.getTime();
  return Object.freeze({
    now: (): Date => new Date(timestamp),
  });
}

export function createSystemClock(): Clock {
  return Object.freeze({
    now: (): Date => new Date(),
  });
}

function validateClock(clock: unknown): Clock {
  if (!isRecord(clock) || typeof clock.now !== "function") {
    throw new TypeError("Clock must provide a now function");
  }

  const source = clock as unknown as Clock;
  return Object.freeze({
    now: (): Date => cloneValidDate(source.now(), "Clock.now"),
  });
}

export const FIXTURE_VERSION = parseVersionIdentifier(BUNDLED_FIXTURE_VERSION);
export const CORPUS_VERSION = parseVersionIdentifier(BUNDLED_CORPUS_VERSION);
export const CHECKLIST_RULE_VERSION = parseVersionIdentifier(
  BUNDLED_CHECKLIST_RULE_VERSION,
);

export const DEFAULT_VERSIONS: DeterministicVersions =
  parseDeterministicVersions({
    fixtureVersion: FIXTURE_VERSION,
    corpusVersion: CORPUS_VERSION,
    checklistRuleVersion: CHECKLIST_RULE_VERSION,
  });

export const DEFAULT_PROVIDER_CONFIGURATION: ProviderConfiguration =
  parseProviderConfiguration({
    credentialFreeMode: true,
    providerAttemptTimeoutMs: 3_000,
    freshnessPolicies: [
      {
        category: "alert_like",
        maxAgeMs: 30 * 60 * 1_000,
        behavior: "warn_and_use",
      },
      {
        category: "agency",
        maxAgeMs: 30 * 24 * 60 * 60 * 1_000,
        behavior: "warn_and_use",
      },
      {
        category: "guidance",
        maxAgeMs: 180 * 24 * 60 * 60 * 1_000,
        behavior: "warn_and_use",
      },
    ],
    providers: [
      {
        providerName: "bundled-demo",
        providerMode: "demo",
        availability: "available",
        verification: "unverified",
        schemaVersion: "provider-schema-v1",
        fallbackProvider: "bundled-demo",
      },
    ],
  });

export const DEFAULT_STARTUP_CONFIGURATION: StartupConfiguration =
  parseStartupConfiguration({
    versions: DEFAULT_VERSIONS,
    providerConfiguration: DEFAULT_PROVIDER_CONFIGURATION,
  });

export const DEFAULT_PROPERTY_TEST_CONTROLS: SeededPropertyTestControls =
  Object.freeze({
    seed: 20_250_308,
    numRuns: MINIMUM_PROPERTY_RUNS,
  });

export function createSeededPropertyTestControls(
  input: unknown = {},
): SeededPropertyTestControls {
  if (!isRecord(input)) {
    throw new TypeError("Property-test controls must be an object");
  }
  assertExactKeys(input, ["seed", "numRuns"], "Property-test controls");

  const seed = input.seed ?? DEFAULT_PROPERTY_TEST_CONTROLS.seed;
  const numRuns = input.numRuns ?? DEFAULT_PROPERTY_TEST_CONTROLS.numRuns;

  if (
    typeof seed !== "number" ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > MAXIMUM_PROPERTY_SEED
  ) {
    throw new RangeError("Property-test seed must be a non-negative 32-bit integer");
  }
  if (
    typeof numRuns !== "number" ||
    !Number.isSafeInteger(numRuns) ||
    numRuns < MINIMUM_PROPERTY_RUNS ||
    numRuns > MAXIMUM_PROPERTY_RUNS
  ) {
    throw new RangeError(
      `Property-test runs must be an integer from ${MINIMUM_PROPERTY_RUNS} through ${MAXIMUM_PROPERTY_RUNS}`,
    );
  }

  return Object.freeze({ seed, numRuns });
}

export function createDeterministicTestControls(
  input: unknown = {},
): DeterministicTestControls {
  if (!isRecord(input)) {
    throw new TypeError("Deterministic test controls must be an object");
  }
  assertExactKeys(
    input,
    ["clock", "versions", "providerConfiguration", "propertyTest"],
    "Deterministic test controls",
  );

  const startupConfiguration = parseStartupConfiguration({
    versions: input.versions ?? DEFAULT_STARTUP_CONFIGURATION.versions,
    providerConfiguration:
      input.providerConfiguration ??
      DEFAULT_STARTUP_CONFIGURATION.providerConfiguration,
  });

  return Object.freeze({
    ...startupConfiguration,
    clock: validateClock(
      input.clock ?? createFixedClock(DEFAULT_FIXED_INSTANT),
    ),
    propertyTest: createSeededPropertyTestControls(input.propertyTest),
  });
}
