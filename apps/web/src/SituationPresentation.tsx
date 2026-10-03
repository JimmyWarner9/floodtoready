import type { ReactNode } from "react";

import {
  officialWarningSchema,
  rainfallObservationSchema,
  riverReadingSchema,
  type OfficialWarning,
  type Provenance,
  type RainfallObservation,
  type RiverReading,
  type SourceRef,
} from "@banjir-ready/contracts";

import { useLanguage } from "./localization/LanguageProvider";
import type { Language } from "./localization/resources";

interface SituationCopy {
  readonly rainfallHeading: string;
  readonly riverHeading: string;
  readonly warningHeading: string;
  readonly rainfallValue: string;
  readonly riverValue: string;
  readonly interval: string;
  readonly observedAt: string;
  readonly reportedCategory: string;
  readonly issuer: string;
  readonly areas: string;
  readonly severity: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly provider: string;
  readonly providerMode: string;
  readonly freshness: string;
  readonly sourceTimestamp: string;
  readonly retrievalTimestamp: string;
  readonly source: string;
  readonly current: string;
  readonly stale: string;
  readonly unavailable: string;
  readonly staleNotice: string;
  readonly demoData: string;
  readonly liveData: string;
  readonly notCurrent: string;
  readonly noRainfall: string;
  readonly noRiver: string;
  readonly noWarnings: string;
  readonly invalidChannel: string;
}

const SITUATION_COPY = {
  en: {
    rainfallHeading: "Rainfall observations",
    riverHeading: "River readings",
    warningHeading: "Authority warning records",
    rainfallValue: "Recorded rainfall",
    riverValue: "Recorded river level",
    interval: "Measurement interval",
    observedAt: "Observed at",
    reportedCategory: "Authority-reported station category",
    issuer: "Issuer",
    areas: "Areas",
    severity: "Reported severity",
    issuedAt: "Issued at",
    expiresAt: "Expires at",
    provider: "Provider",
    providerMode: "Provider mode",
    freshness: "Freshness",
    sourceTimestamp: "Source timestamp",
    retrievalTimestamp: "Retrieval timestamp",
    source: "Source",
    current: "Current under the configured freshness policy",
    stale: "Stale",
    unavailable: "Source unavailable",
    staleNotice: "This information is stale. Check the source timestamp before acting.",
    demoData: "Demo Data / Data Demo",
    liveData: "Live data",
    notCurrent: "Not current operational information / Bukan maklumat operasi semasa",
    noRainfall: "No rainfall observations are available.",
    noRiver: "No river readings are available.",
    noWarnings: "No authority warning records are available.",
    invalidChannel: "Situation information is unavailable because its data did not pass validation.",
  },
  ms: {
    rainfallHeading: "Pemerhatian hujan",
    riverHeading: "Bacaan sungai",
    warningHeading: "Rekod amaran pihak berkuasa",
    rainfallValue: "Hujan yang direkodkan",
    riverValue: "Paras sungai yang direkodkan",
    interval: "Selang pengukuran",
    observedAt: "Diperhatikan pada",
    reportedCategory: "Kategori stesen yang dilaporkan pihak berkuasa",
    issuer: "Pengeluar",
    areas: "Kawasan",
    severity: "Keterukan yang dilaporkan",
    issuedAt: "Dikeluarkan pada",
    expiresAt: "Tamat pada",
    provider: "Penyedia",
    providerMode: "Mod penyedia",
    freshness: "Kesegaran",
    sourceTimestamp: "Cap masa sumber",
    retrievalTimestamp: "Cap masa pengambilan",
    source: "Sumber",
    current: "Semasa mengikut dasar kesegaran yang dikonfigurasikan",
    stale: "Lapuk",
    unavailable: "Sumber tidak tersedia",
    staleNotice: "Maklumat ini lapuk. Semak cap masa sumber sebelum bertindak.",
    demoData: "Demo Data / Data Demo",
    liveData: "Data langsung",
    notCurrent: "Not current operational information / Bukan maklumat operasi semasa",
    noRainfall: "Tiada pemerhatian hujan tersedia.",
    noRiver: "Tiada bacaan sungai tersedia.",
    noWarnings: "Tiada rekod amaran pihak berkuasa tersedia.",
    invalidChannel: "Maklumat situasi tidak tersedia kerana datanya tidak lulus pengesahan.",
  },
} as const satisfies Readonly<Record<Language, SituationCopy>>;

const PROHIBITED_OBSERVATION_LANGUAGE = [
  /\b(?:safe|unsafe|warning|forecast|prediction|predicts?|predicted)\b/iu,
  /\bwill\s+(?:not\s+)?flood\b/iu,
  /\b(?:selamat|amaran|ramalan|meramal)\b/iu,
  /\b(?:tidak\s+)?akan\s+banjir\b/iu,
] as const;

function observationTextIsAllowed(value: string | null): boolean {
  return (
    value === null ||
    PROHIBITED_OBSERVATION_LANGUAGE.every((pattern) => !pattern.test(value))
  );
}

function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "ms" ? "ms-MY" : "en-MY", {
    maximumFractionDigits: 3,
  }).format(value);
}

function SourceReference({
  copy,
  source,
}: {
  readonly copy: SituationCopy;
  readonly source: SourceRef;
}): ReactNode {
  return (
    <p className="situation-source">
      <span>{copy.source}: </span>
      <a href={source.url} rel="noopener noreferrer" target="_blank">
        {source.title}
      </a>{" "}
      <span>— {source.organization}</span>
      {source.sourceDate === null ? null : (
        <>
          {" · "}
          <time dateTime={source.sourceDate}>{source.sourceDate}</time>
        </>
      )}
    </p>
  );
}

function ProvenanceDetails({
  copy,
  provenance,
}: {
  readonly copy: SituationCopy;
  readonly provenance: Provenance;
}): ReactNode {
  const freshnessText =
    provenance.freshness === "current"
      ? copy.current
      : provenance.freshness === "stale"
        ? copy.stale
        : copy.unavailable;

  return (
    <div className="situation-provenance">
      <dl>
        <div>
          <dt>{copy.provider}</dt>
          <dd>{provenance.providerName}</dd>
        </div>
        <div>
          <dt>{copy.providerMode}</dt>
          <dd>{provenance.providerMode}</dd>
        </div>
        <div>
          <dt>{copy.freshness}</dt>
          <dd>{freshnessText}</dd>
        </div>
        <div>
          <dt>{copy.sourceTimestamp}</dt>
          <dd>
            {provenance.sourceTimestamp === null ? (
              copy.unavailable
            ) : (
              <time dateTime={provenance.sourceTimestamp}>
                {provenance.sourceTimestamp}
              </time>
            )}
          </dd>
        </div>
        <div>
          <dt>{copy.retrievalTimestamp}</dt>
          <dd>
            <time dateTime={provenance.retrievalTimestamp}>
              {provenance.retrievalTimestamp}
            </time>
          </dd>
        </div>
      </dl>
      {provenance.freshness === "stale" ? (
        <p className="situation-stale-notice">{copy.staleNotice}</p>
      ) : null}
    </div>
  );
}

function DataClassificationLabels({
  copy,
  provenance,
}: {
  readonly copy: SituationCopy;
  readonly provenance: Provenance;
}): ReactNode {
  if (provenance.dataClass === "Live_Data") {
    return <p className="situation-live-label">{copy.liveData}</p>;
  }

  return (
    <div className="situation-demo-labels">
      <p>{copy.demoData}</p>
      <p>{copy.notCurrent}</p>
    </div>
  );
}

function UnavailableCard({ copy }: { readonly copy: SituationCopy }): ReactNode {
  return (
    <article className="situation-card">
      <p role="status">{copy.invalidChannel}</p>
    </article>
  );
}

export interface RainfallObservationCardProps {
  readonly observation: RainfallObservation;
}

export function RainfallObservationCard({
  observation,
}: RainfallObservationCardProps): ReactNode {
  const { language } = useLanguage();
  const copy = SITUATION_COPY[language];
  const result = rainfallObservationSchema.safeParse(observation);

  if (
    !result.success ||
    !observationTextIsAllowed(result.data.stationName)
  ) {
    return <UnavailableCard copy={copy} />;
  }

  const record = result.data;
  const unavailable = record.provenance.freshness === "unavailable";

  return (
    <article className="situation-card" data-situation-kind={record.kind}>
      <h3>{record.stationName}</h3>
      {unavailable ? (
        <p role="status">{copy.unavailable}</p>
      ) : (
        <div className="situation-operational-value">
          <p>
            <strong>{copy.rainfallValue}:</strong>{" "}
            {formatNumber(record.amountMm, language)} mm
          </p>
          <p>
            <strong>{copy.interval}:</strong> {record.intervalMinutes} min
          </p>
          <p>
            <strong>{copy.observedAt}:</strong>{" "}
            <time dateTime={record.observedAt}>{record.observedAt}</time>
          </p>
          <DataClassificationLabels copy={copy} provenance={record.provenance} />
        </div>
      )}
      <ProvenanceDetails copy={copy} provenance={record.provenance} />
      <SourceReference copy={copy} source={record.source} />
    </article>
  );
}

export interface RiverReadingCardProps {
  readonly reading: RiverReading;
}

export function RiverReadingCard({ reading }: RiverReadingCardProps): ReactNode {
  const { language } = useLanguage();
  const copy = SITUATION_COPY[language];
  const result = riverReadingSchema.safeParse(reading);

  if (
    !result.success ||
    !observationTextIsAllowed(result.data.stationName) ||
    !observationTextIsAllowed(result.data.authorityReportedCategory)
  ) {
    return <UnavailableCard copy={copy} />;
  }

  const record = result.data;
  const unavailable = record.provenance.freshness === "unavailable";

  return (
    <article className="situation-card" data-situation-kind={record.kind}>
      <h3>{record.stationName}</h3>
      {unavailable ? (
        <p role="status">{copy.unavailable}</p>
      ) : (
        <div className="situation-operational-value">
          <p>
            <strong>{copy.riverValue}:</strong>{" "}
            {formatNumber(record.levelMetres, language)} m
          </p>
          {record.authorityReportedCategory === null ? null : (
            <p>
              <strong>{copy.reportedCategory}:</strong>{" "}
              {record.authorityReportedCategory}
            </p>
          )}
          <p>
            <strong>{copy.observedAt}:</strong>{" "}
            <time dateTime={record.observedAt}>{record.observedAt}</time>
          </p>
          <DataClassificationLabels copy={copy} provenance={record.provenance} />
        </div>
      )}
      <ProvenanceDetails copy={copy} provenance={record.provenance} />
      <SourceReference copy={copy} source={record.source} />
    </article>
  );
}

export interface OfficialWarningCardProps {
  readonly warning: OfficialWarning;
}

export function OfficialWarningCard({
  warning,
}: OfficialWarningCardProps): ReactNode {
  const { language } = useLanguage();
  const copy = SITUATION_COPY[language];
  const result = officialWarningSchema.safeParse(warning);

  if (!result.success) {
    return <UnavailableCard copy={copy} />;
  }

  const record = result.data;
  const unavailable = record.provenance.freshness === "unavailable";

  return (
    <article className="situation-card situation-warning-card" data-situation-kind={record.kind}>
      <h3>{record.severityLabel}</h3>
      {unavailable ? (
        <p role="status">{copy.unavailable}</p>
      ) : (
        <div className="situation-operational-value">
          <p className="situation-warning-text">{record.warningText}</p>
          <p>
            <strong>{copy.issuer}:</strong> {record.issuer}
          </p>
          <p>
            <strong>{copy.areas}:</strong> {record.areaLabels.join(", ")}
          </p>
          <p>
            <strong>{copy.issuedAt}:</strong>{" "}
            <time dateTime={record.issuedAt}>{record.issuedAt}</time>
          </p>
          {record.expiresAt === null ? null : (
            <p>
              <strong>{copy.expiresAt}:</strong>{" "}
              <time dateTime={record.expiresAt}>{record.expiresAt}</time>
            </p>
          )}
          <DataClassificationLabels copy={copy} provenance={record.provenance} />
        </div>
      )}
      <ProvenanceDetails copy={copy} provenance={record.provenance} />
      <SourceReference copy={copy} source={record.source} />
    </article>
  );
}

export interface SituationPresentationProps {
  readonly rainfallObservations: readonly RainfallObservation[];
  readonly riverReadings: readonly RiverReading[];
  readonly officialWarnings: readonly OfficialWarning[];
}

function ChannelEmptyState({ children }: { readonly children: string }): ReactNode {
  return <p role="status">{children}</p>;
}

export function SituationPresentation({
  rainfallObservations,
  riverReadings,
  officialWarnings,
}: SituationPresentationProps): ReactNode {
  const { language } = useLanguage();
  const copy = SITUATION_COPY[language];

  return (
    <div className="situation-presentation">
      <section aria-labelledby="rainfall-observations-heading" className="situation-channel">
        <h2 id="rainfall-observations-heading">{copy.rainfallHeading}</h2>
        {rainfallObservations.length === 0 ? (
          <ChannelEmptyState>{copy.noRainfall}</ChannelEmptyState>
        ) : (
          rainfallObservations.map((observation) => (
            <RainfallObservationCard
              key={observation.recordId}
              observation={observation}
            />
          ))
        )}
      </section>

      <section aria-labelledby="river-readings-heading" className="situation-channel">
        <h2 id="river-readings-heading">{copy.riverHeading}</h2>
        {riverReadings.length === 0 ? (
          <ChannelEmptyState>{copy.noRiver}</ChannelEmptyState>
        ) : (
          riverReadings.map((reading) => (
            <RiverReadingCard key={reading.recordId} reading={reading} />
          ))
        )}
      </section>

      <section aria-labelledby="authority-warnings-heading" className="situation-channel situation-warning-channel">
        <h2 id="authority-warnings-heading">{copy.warningHeading}</h2>
        {officialWarnings.length === 0 ? (
          <ChannelEmptyState>{copy.noWarnings}</ChannelEmptyState>
        ) : (
          officialWarnings.map((warning) => (
            <OfficialWarningCard key={warning.recordId} warning={warning} />
          ))
        )}
      </section>
    </div>
  );
}
