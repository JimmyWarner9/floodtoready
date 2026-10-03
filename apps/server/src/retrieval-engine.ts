import {
  parseApprovedKnowledgeCorpus,
  parseLanguage,
  parseVersionIdentifier,
  type ApprovedKnowledgeCorpus,
  type CorpusRecord,
  type Language,
  type VersionIdentifier,
} from "@banjir-ready/contracts";

export interface RetrievalClock {
  now(): Date;
}

export interface RetrievalConfiguration {
  readonly phraseMatchWeight: number;
  readonly normalizedTermTokenWeight: number;
  readonly titleTokenWeight: number;
  readonly bodyTokenWeight: number;
  readonly supportThreshold: number;
  readonly maxResults: number;
}

export interface RetrievalEngineOptions {
  readonly clock: RetrievalClock;
  readonly configuration?: Partial<RetrievalConfiguration>;
}

export interface RetrievalRequest {
  readonly question: string;
  readonly language: Language;
  readonly corpusVersion: VersionIdentifier;
}

export interface RetrievalHit {
  readonly record: Readonly<CorpusRecord>;
  readonly score: number;
  readonly matchedPhrases: readonly string[];
  readonly matchedTokens: readonly string[];
}

export interface RetrievalResult {
  readonly corpusVersion: VersionIdentifier;
  readonly language: Language;
  readonly normalizedQuestion: string;
  readonly retrievalTimestamp: string;
  readonly hits: readonly RetrievalHit[];
}

export const DEFAULT_RETRIEVAL_CONFIGURATION: Readonly<RetrievalConfiguration> =
  Object.freeze({
    phraseMatchWeight: 8,
    normalizedTermTokenWeight: 4,
    titleTokenWeight: 2,
    bodyTokenWeight: 1,
    supportThreshold: 4,
    maxResults: 5,
  });

const MAX_QUESTION_BYTES = 4_096;
const MAX_WEIGHT = 1_000;
const MAX_SUPPORT_THRESHOLD = 1_000_000;
const CONFIGURATION_KEYS = Object.freeze([
  "phraseMatchWeight",
  "normalizedTermTokenWeight",
  "titleTokenWeight",
  "bodyTokenWeight",
  "supportThreshold",
  "maxResults",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  context: string,
): void {
  const allowed = new Set(allowedKeys);
  const keys = Object.keys(value);
  if (
    keys.some((key) => !allowed.has(key)) ||
    requiredKeys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new TypeError(`${context} contains unsupported or missing fields`);
  }
}

function assertWellFormedUnicode(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const current = value.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError("Retrieval question must contain well-formed Unicode");
      }
      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      throw new TypeError("Retrieval question must contain well-formed Unicode");
    }
  }
}

/**
 * Produces the canonical lexical form used for both questions and corpus text.
 * NFKC handles compatibility variants; all non-letter/mark/number runs become
 * token separators so punctuation can never create an implicit token match.
 */
export function normalizeLexicalText(value: string): string {
  assertWellFormedUnicode(value);
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function uniqueTokens(normalizedText: string): readonly string[] {
  if (normalizedText.length === 0) return Object.freeze([]);
  return Object.freeze([...new Set(normalizedText.split(" "))].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function intersection(
  questionTokens: ReadonlySet<string>,
  candidateTokens: readonly string[],
): readonly string[] {
  return Object.freeze(
    [...new Set(candidateTokens.filter((token) => questionTokens.has(token)))].sort(
      compareText,
    ),
  );
}

function containsPhrase(normalizedQuestion: string, phrase: string): boolean {
  return (` ${normalizedQuestion} `).includes(` ${phrase} `);
}

function parseConfiguration(
  input: unknown,
): Readonly<RetrievalConfiguration> {
  if (input === undefined) return DEFAULT_RETRIEVAL_CONFIGURATION;
  if (!isRecord(input)) {
    throw new TypeError("Retrieval configuration must be an object");
  }
  assertExactKeys(input, CONFIGURATION_KEYS, [], "Retrieval configuration");

  const configuration = {
    ...DEFAULT_RETRIEVAL_CONFIGURATION,
    ...input,
  } as RetrievalConfiguration;

  for (const key of [
    "phraseMatchWeight",
    "normalizedTermTokenWeight",
    "titleTokenWeight",
    "bodyTokenWeight",
  ] as const) {
    const value = configuration[key];
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_WEIGHT) {
      throw new RangeError(`${key} must be an integer from 0 through ${MAX_WEIGHT}`);
    }
  }

  if (
    configuration.phraseMatchWeight === 0 &&
    configuration.normalizedTermTokenWeight === 0 &&
    configuration.titleTokenWeight === 0 &&
    configuration.bodyTokenWeight === 0
  ) {
    throw new RangeError("Retrieval configuration requires a positive match weight");
  }
  if (
    !Number.isSafeInteger(configuration.supportThreshold) ||
    configuration.supportThreshold < 1 ||
    configuration.supportThreshold > MAX_SUPPORT_THRESHOLD
  ) {
    throw new RangeError(
      `supportThreshold must be an integer from 1 through ${MAX_SUPPORT_THRESHOLD}`,
    );
  }
  if (
    !Number.isSafeInteger(configuration.maxResults) ||
    configuration.maxResults < 1 ||
    configuration.maxResults > 5
  ) {
    throw new RangeError("maxResults must be an integer from 1 through 5");
  }

  return Object.freeze(configuration);
}

function parseClock(input: unknown): RetrievalClock {
  if (!isRecord(input)) {
    throw new TypeError("Retrieval clock must be an object");
  }
  assertExactKeys(input, ["now"], ["now"], "Retrieval clock");
  if (typeof input.now !== "function") {
    throw new TypeError("Retrieval clock must provide a now function");
  }

  const source = input as unknown as RetrievalClock;
  return Object.freeze({
    now: (): Date => {
      const instant = source.now();
      if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
        throw new TypeError("Retrieval clock must return a valid Date");
      }
      return new Date(instant.getTime());
    },
  });
}

function parseRequest(input: unknown): RetrievalRequest {
  if (!isRecord(input)) {
    throw new TypeError("Retrieval request must be an object");
  }
  assertExactKeys(
    input,
    ["question", "language", "corpusVersion"],
    ["question", "language", "corpusVersion"],
    "Retrieval request",
  );
  if (typeof input.question !== "string" || input.question.trim().length === 0) {
    throw new TypeError("Retrieval question must be a non-empty string");
  }
  assertWellFormedUnicode(input.question);
  if (new TextEncoder().encode(input.question).byteLength > MAX_QUESTION_BYTES) {
    throw new RangeError(`Retrieval question must not exceed ${MAX_QUESTION_BYTES} UTF-8 bytes`);
  }

  return Object.freeze({
    question: input.question,
    language: parseLanguage(input.language),
    corpusVersion: parseVersionIdentifier(input.corpusVersion),
  });
}

function scoreRecord(
  record: CorpusRecord,
  normalizedQuestion: string,
  questionTokens: ReadonlySet<string>,
  configuration: RetrievalConfiguration,
): RetrievalHit | null {
  const normalizedPhrases = [
    ...new Set(
      record.normalizedTerms
        .map((term) => normalizeLexicalText(term))
        .filter((term) => term.length > 0),
    ),
  ].sort(compareText);
  const matchedPhrases = Object.freeze(
    normalizedPhrases.filter((phrase) =>
      containsPhrase(normalizedQuestion, phrase),
    ),
  );
  const termTokens = uniqueTokens(normalizedPhrases.join(" "));
  const titleTokens = uniqueTokens(normalizeLexicalText(record.title));
  const bodyTokens = uniqueTokens(normalizeLexicalText(record.text));
  const matchedTermTokens = intersection(questionTokens, termTokens);
  const matchedTitleTokens = intersection(questionTokens, titleTokens);
  const matchedBodyTokens = intersection(questionTokens, bodyTokens);
  const matchedTokens = Object.freeze(
    [
      ...new Set([
        ...matchedTermTokens,
        ...matchedTitleTokens,
        ...matchedBodyTokens,
      ]),
    ].sort(compareText),
  );

  const score =
    matchedPhrases.length * configuration.phraseMatchWeight +
    matchedTermTokens.length * configuration.normalizedTermTokenWeight +
    matchedTitleTokens.length * configuration.titleTokenWeight +
    matchedBodyTokens.length * configuration.bodyTokenWeight;

  if (score < configuration.supportThreshold) return null;
  return Object.freeze({
    record: freezeDeep(record),
    score,
    matchedPhrases,
    matchedTokens,
  });
}

function sourceDateRank(hit: RetrievalHit): number {
  const sourceDate = hit.record.source.sourceDate;
  return sourceDate === null ? Number.NEGATIVE_INFINITY : Date.parse(sourceDate);
}

function compareHits(left: RetrievalHit, right: RetrievalHit): number {
  if (left.score !== right.score) return right.score - left.score;
  const dateDifference = sourceDateRank(right) - sourceDateRank(left);
  if (dateDifference !== 0) return dateDifference;
  return compareText(left.record.recordId, right.record.recordId);
}

function freezeDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) freezeDeep(item);
    return Object.freeze(value);
  }
  if (isRecord(value)) {
    for (const item of Object.values(value)) freezeDeep(item);
    return Object.freeze(value);
  }
  return value;
}

export class RetrievalEngine {
  readonly #clock: RetrievalClock;
  readonly #configuration: Readonly<RetrievalConfiguration>;

  public constructor(options: RetrievalEngineOptions) {
    if (!isRecord(options)) {
      throw new TypeError("Retrieval engine options must be an object");
    }
    assertExactKeys(
      options as unknown as Record<string, unknown>,
      ["clock", "configuration"],
      ["clock"],
      "Retrieval engine options",
    );
    this.#clock = parseClock(options.clock);
    this.#configuration = parseConfiguration(options.configuration);
  }

  public get configuration(): Readonly<RetrievalConfiguration> {
    return this.#configuration;
  }

  public search(input: RetrievalRequest, corpusInput: ApprovedKnowledgeCorpus): RetrievalResult {
    const request = parseRequest(input);
    const corpus = parseApprovedKnowledgeCorpus(corpusInput);
    const retrievalTimestamp = this.#clock.now().toISOString();
    const normalizedQuestion = normalizeLexicalText(request.question);

    if (corpus.corpusVersion !== request.corpusVersion || normalizedQuestion.length === 0) {
      return freezeDeep({
        corpusVersion: request.corpusVersion,
        language: request.language,
        normalizedQuestion,
        retrievalTimestamp,
        hits: [],
      });
    }

    const questionTokens = new Set(uniqueTokens(normalizedQuestion));
    const hits = corpus.records
      .filter(
        (record) =>
          record.corpusVersion === request.corpusVersion &&
          record.language === request.language,
      )
      .map((record) =>
        scoreRecord(
          record,
          normalizedQuestion,
          questionTokens,
          this.#configuration,
        ),
      )
      .filter((hit): hit is RetrievalHit => hit !== null)
      .sort(compareHits)
      .slice(0, this.#configuration.maxResults);

    return freezeDeep({
      corpusVersion: request.corpusVersion,
      language: request.language,
      normalizedQuestion,
      retrievalTimestamp,
      hits,
    });
  }
}
