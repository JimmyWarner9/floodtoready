import {
  parseGuidanceRecord,
  parseLanguage,
  parseProviderDescriptor,
  parseSituationRecord,
  parseVersionIdentifier,
  type GuidanceRecord,
  type Language,
  type OfficialWarning,
  type ProviderDescriptor,
  type RainfallObservation,
  type RiverReading,
  type SituationRecord,
  type VersionIdentifier,
} from "@banjir-ready/contracts";
import {
  FIXTURE_VERSION,
  guidanceFixtures,
  officialWarningFixtures,
  rainfallObservationFixtures,
  riverReadingFixtures,
} from "@banjir-ready/fixtures";

export type DemoProviderCapability =
  | "guidance"
  | "rainfall_observation"
  | "river_reading"
  | "official_warning";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T;

export interface ProviderClock {
  now(): Date;
}

export interface ProviderContext {
  readonly fixtureVersion: VersionIdentifier;
  readonly clock: ProviderClock;
}

export interface GuidanceProviderInput {
  readonly language: Language;
}

export type SituationProviderInput = Readonly<Record<string, never>>;

export interface DemoProviderBatch<TRecord> {
  readonly capability: DemoProviderCapability;
  readonly dataClass: "Demo_Data";
  readonly descriptor: DeepReadonly<ProviderDescriptor>;
  readonly fixtureVersion: VersionIdentifier;
  readonly retrievalTimestamp: string;
  readonly records: readonly DeepReadonly<TRecord>[];
}

export interface ProviderAdapter<TInput, TRecord> {
  readonly capability: DemoProviderCapability;
  readonly descriptor: DeepReadonly<ProviderDescriptor>;
  readonly transport: "bundled_fixture";
  readonly permitsOutboundNetwork: false;
  fetch(
    input: TInput,
    context: ProviderContext,
  ): Promise<DemoProviderBatch<TRecord>>;
}

const BUNDLED_DEMO_DESCRIPTOR = immutableClone(
  parseProviderDescriptor({
    providerName: "bundled-demo",
    providerMode: "demo",
    availability: "available",
    verification: "unverified",
    schemaVersion: "provider-schema-v1",
    fallbackProvider: "bundled-demo",
  }),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  context: string,
): void {
  const allowed = new Set(allowedKeys);
  if (
    Object.keys(value).length !== allowed.size ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new TypeError(`${context} must contain exactly the supported fields`);
  }
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => cloneValue(item)) as T;
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    ) as T;
  }
  return value;
}

function freezeDeep<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    for (const item of value) freezeDeep(item);
    return Object.freeze(value) as DeepReadonly<T>;
  }
  if (isRecord(value)) {
    for (const item of Object.values(value)) freezeDeep(item);
    return Object.freeze(value) as DeepReadonly<T>;
  }
  return value as DeepReadonly<T>;
}

function immutableClone<T>(value: T): DeepReadonly<T> {
  return freezeDeep(cloneValue(value));
}

function readRetrievalTimestamp(context: unknown): {
  fixtureVersion: VersionIdentifier;
  retrievalTimestamp: string;
} {
  if (!isRecord(context)) {
    throw new TypeError("Provider context must be an object");
  }
  assertExactKeys(context, ["fixtureVersion", "clock"], "Provider context");

  const fixtureVersion = parseVersionIdentifier(context.fixtureVersion);
  if (fixtureVersion !== FIXTURE_VERSION) {
    throw new RangeError("Unsupported bundled fixture version");
  }

  if (!isRecord(context.clock) || typeof context.clock.now !== "function") {
    throw new TypeError("Provider context clock must provide a now function");
  }

  const instant = context.clock.now();
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new TypeError("Provider context clock must return a valid Date");
  }

  return {
    fixtureVersion,
    retrievalTimestamp: instant.toISOString(),
  };
}

function readGuidanceInput(input: unknown): GuidanceProviderInput {
  if (!isRecord(input)) {
    throw new TypeError("Guidance provider input must be an object");
  }
  assertExactKeys(input, ["language"], "Guidance provider input");
  return Object.freeze({ language: parseLanguage(input.language) });
}

function readSituationInput(input: unknown): void {
  if (!isRecord(input) || Object.keys(input).length !== 0) {
    throw new TypeError("Situation provider input must be an empty object");
  }
}

function normalizeGuidanceRecord(record: GuidanceRecord): GuidanceRecord {
  return parseGuidanceRecord(cloneValue(record));
}

function normalizeSituationRecord<TRecord extends SituationRecord>(
  record: TRecord,
  expectedKind: TRecord["kind"],
  retrievalTimestamp: string,
  fixtureVersion: VersionIdentifier,
): TRecord {
  const normalized = parseSituationRecord({
    ...cloneValue(record),
    provenance: {
      ...cloneValue(record.provenance),
      providerName: BUNDLED_DEMO_DESCRIPTOR.providerName,
      providerMode: "demo",
      dataClass: "Demo_Data",
      retrievalTimestamp,
      fixtureVersion,
    },
  });

  if (normalized.kind !== expectedKind) {
    throw new TypeError("Bundled fixture does not match its provider channel");
  }

  return normalized as TRecord;
}

function createBatch<TRecord>(
  capability: DemoProviderCapability,
  records: readonly TRecord[],
  fixtureVersion: VersionIdentifier,
  retrievalTimestamp: string,
): DemoProviderBatch<TRecord> {
  return freezeDeep({
    capability,
    dataClass: "Demo_Data" as const,
    descriptor: BUNDLED_DEMO_DESCRIPTOR,
    fixtureVersion,
    retrievalTimestamp,
    records,
  });
}

function createGuidanceProvider(): ProviderAdapter<
  GuidanceProviderInput,
  GuidanceRecord
> {
  return Object.freeze({
    capability: "guidance" as const,
    descriptor: BUNDLED_DEMO_DESCRIPTOR,
    transport: "bundled_fixture" as const,
    permitsOutboundNetwork: false as const,
    async fetch(
      input: GuidanceProviderInput,
      context: ProviderContext,
    ): Promise<DemoProviderBatch<GuidanceRecord>> {
      const { language } = readGuidanceInput(input);
      const { fixtureVersion, retrievalTimestamp } =
        readRetrievalTimestamp(context);
      const records = guidanceFixtures
        .filter((record) => record.language === language)
        .map(normalizeGuidanceRecord);

      return createBatch(
        "guidance",
        records,
        fixtureVersion,
        retrievalTimestamp,
      );
    },
  });
}

function createSituationProvider<TRecord extends SituationRecord>(
  capability: TRecord["kind"],
  fixtures: readonly TRecord[],
): ProviderAdapter<SituationProviderInput, TRecord> {
  return Object.freeze({
    capability,
    descriptor: BUNDLED_DEMO_DESCRIPTOR,
    transport: "bundled_fixture" as const,
    permitsOutboundNetwork: false as const,
    async fetch(
      input: SituationProviderInput,
      context: ProviderContext,
    ): Promise<DemoProviderBatch<TRecord>> {
      readSituationInput(input);
      const { fixtureVersion, retrievalTimestamp } =
        readRetrievalTimestamp(context);
      const records = fixtures.map((record) =>
        normalizeSituationRecord(
          record,
          capability,
          retrievalTimestamp,
          fixtureVersion,
        ),
      );

      return createBatch(
        capability,
        records,
        fixtureVersion,
        retrievalTimestamp,
      );
    },
  });
}

export const guidanceDemoProvider = createGuidanceProvider();
export const rainfallObservationDemoProvider = createSituationProvider<
  RainfallObservation
>("rainfall_observation", rainfallObservationFixtures);
export const riverReadingDemoProvider = createSituationProvider<RiverReading>(
  "river_reading",
  riverReadingFixtures,
);
export const officialWarningDemoProvider =
  createSituationProvider<OfficialWarning>(
    "official_warning",
    officialWarningFixtures,
  );

export const demoProviders = Object.freeze({
  guidance: guidanceDemoProvider,
  rainfallObservation: rainfallObservationDemoProvider,
  riverReading: riverReadingDemoProvider,
  officialWarning: officialWarningDemoProvider,
});
