import { useId, useMemo, useState, type ReactNode } from "react";

import {
  parseAgencyRecord,
  type AgencyRecord,
  type ReviewMetadata,
  type SourceRef,
} from "@banjir-ready/contracts";

import { searchAgencyRecords } from "./agencySearch";
import { useLanguage } from "./localization/LanguageProvider";
import type { MessageKey } from "./localization/resources";

const MAX_SEARCH_LENGTH = 256;

export interface AgencyDirectoryProps {
  /** Fixture and provider records remain untrusted until parsed here. */
  readonly records: readonly unknown[];
}

function normalizeDirectory(
  records: readonly unknown[],
): readonly AgencyRecord[] | null {
  try {
    const normalized = records.map((record) => parseAgencyRecord(record));
    const identities = new Set<string>();
    const fixtureVersions = new Set<string>();

    for (const record of normalized) {
      const identity = `${record.language}:${record.recordId}`;
      if (identities.has(identity)) {
        return null;
      }

      identities.add(identity);
      fixtureVersions.add(record.fixtureVersion);
    }

    return fixtureVersions.size <= 1 ? normalized : null;
  } catch {
    return null;
  }
}

function SourceReference({
  describedBy,
  source,
}: {
  readonly describedBy: string;
  readonly source: SourceRef;
}): ReactNode {
  return (
    <p className="agency-source-reference">
      <a
        aria-describedby={describedBy}
        href={source.url}
        rel="noopener noreferrer"
        target="_blank"
      >
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

function ReviewDetails({ review }: { readonly review: ReviewMetadata }): ReactNode {
  const { text } = useLanguage();

  return (
    <section className="agency-review">
      <h4>{text("guidance.reviewedStatus")}</h4>
      <p>{review.reviewerName}</p>
      <p>{review.reviewerOrganizationOrQualification}</p>
      <p>
        <time dateTime={review.reviewDate}>{review.reviewDate}</time>
        {" · "}
        <span>{review.contentVersion}</span>
      </p>
      <ul>
        {review.sources.map((source) => (
          <li key={source.sourceId}>
            <a href={source.url} rel="noopener noreferrer" target="_blank">
              {source.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function freshnessKey(record: AgencyRecord): MessageKey {
  switch (record.provenance.freshness) {
    case "current":
      return "freshness.current";
    case "stale":
      return "freshness.stale";
    case "unavailable":
      return "freshness.unavailable";
  }
}

function AgencyCard({ record }: { readonly record: AgencyRecord }): ReactNode {
  const { text } = useLanguage();
  const sourceNoticeId = `agency-source-notice-${record.language}-${record.recordId}`;
  const isDemoGuidance = record.status === "Demo_Guidance";
  const isDemoData = record.provenance.dataClass === "Demo_Data";
  const telephoneUri = record.phone === null ? null : `tel:${record.phone}`;

  return (
    <article
      className="agency-card"
      data-agency-record-id={record.recordId}
      data-fixture-version={record.fixtureVersion}
      data-guidance-status={record.status}
      data-provider-mode={record.provenance.providerMode}
    >
      <header className="agency-card-header">
        <h3>{record.agencyName}</h3>
        <p className="agency-guidance-status">
          {text(
            record.status === "Reviewed_Guidance"
              ? "guidance.reviewedStatus"
              : "guidance.demoStatus",
          )}
        </p>
      </header>

      <dl className="agency-details">
        <div>
          <dt>{text("directory.role")}</dt>
          <dd>{record.role}</dd>
        </div>
        {record.state === null ? null : (
          <div>
            <dt>{text("directory.state")}</dt>
            <dd>{record.state}</dd>
          </div>
        )}
        {record.district === null ? null : (
          <div>
            <dt>{text("directory.district")}</dt>
            <dd>{record.district}</dd>
          </div>
        )}
      </dl>

      <div className="agency-contact-content">
        {record.phone === null || telephoneUri === null ? (
          <p className="agency-contact-unavailable" role="status">
            {text("directory.contactUnavailable")}
          </p>
        ) : (
          <>
            <p className="agency-phone">
              <strong>{text("directory.phone")}:</strong>{" "}
              <span>{record.phone}</span>
            </p>
            <a
              aria-label={`${text("directory.callAction")}: ${record.agencyName} (${record.phone})`}
              className="agency-call-action"
              href={telephoneUri}
            >
              {text("directory.callAction")}: {record.phone}
            </a>
          </>
        )}
      </div>

      {isDemoGuidance || isDemoData ? (
        <div className="agency-demo-labels">
          {isDemoGuidance ? <p>{text("demoLabels.demoGuidance")}</p> : null}
          {isDemoData ? <p>{text("demoLabels.demoData")}</p> : null}
          {isDemoData && record.phone !== null ? (
            <p>{text("demoLabels.notCurrentOperational")}</p>
          ) : null}
        </div>
      ) : null}

      <section className="agency-provenance">
        <h4>{text("directory.source")}</h4>
        <SourceReference
          describedBy={sourceNoticeId}
          source={record.source}
        />
        {record.portalUrl === null || record.portalUrl === record.source.url ? null : (
          <p>
            <a
              aria-describedby={sourceNoticeId}
              href={record.portalUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {text("directory.portal")}
            </a>
          </p>
        )}
        <p className="agency-external-notice" id={sourceNoticeId}>
          {text("directory.externalLinkNotice")}
        </p>

        <dl>
          <div>
            <dt>{text("directory.lastUpdated")}</dt>
            <dd>
              <time dateTime={record.lastUpdated}>{record.lastUpdated}</time>
            </dd>
          </div>
          <div>
            <dt>{text("directory.provider")}</dt>
            <dd>{record.provenance.providerName}</dd>
          </div>
          <div>
            <dt>{text("demoLabels.providerMode")}</dt>
            <dd>{record.provenance.providerMode}</dd>
          </div>
          <div>
            <dt>{text("demoLabels.providerFreshness")}</dt>
            <dd>{text(freshnessKey(record))}</dd>
          </div>
          <div>
            <dt>{text("freshness.sourceTimestamp")}</dt>
            <dd>
              {record.provenance.sourceTimestamp === null ? (
                text("freshness.unavailable")
              ) : (
                <time dateTime={record.provenance.sourceTimestamp}>
                  {record.provenance.sourceTimestamp}
                </time>
              )}
            </dd>
          </div>
          <div>
            <dt>{text("freshness.retrievalTimestamp")}</dt>
            <dd>
              <time dateTime={record.provenance.retrievalTimestamp}>
                {record.provenance.retrievalTimestamp}
              </time>
            </dd>
          </div>
          <div>
            <dt>{text("directory.fixtureVersion")}</dt>
            <dd>{record.fixtureVersion}</dd>
          </div>
        </dl>

        {record.provenance.freshness === "stale" ? (
          <p className="agency-stale-notice">
            {text("freshness.staleWarning")}
          </p>
        ) : null}
      </section>

      {record.status === "Reviewed_Guidance" ? (
        <ReviewDetails review={record.review} />
      ) : null}

      <p className="agency-non-endorsement">
        {text("guidance.nonEndorsement")}
      </p>
    </article>
  );
}

/**
 * Searches and renders validated, selected-language agency records. Invalid or
 * mixed fixture batches are suppressed rather than partially rendered.
 */
export function AgencyDirectory({ records }: AgencyDirectoryProps): ReactNode {
  const { language, text } = useLanguage();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const normalizedRecords = useMemo(() => normalizeDirectory(records), [records]);
  const results = useMemo(
    () =>
      normalizedRecords === null
        ? []
        : searchAgencyRecords(normalizedRecords, language, query),
    [language, normalizedRecords, query],
  );

  if (normalizedRecords === null || normalizedRecords.length === 0) {
    return <p role="status">{text("errors.sourceUnavailable")}</p>;
  }

  if (!normalizedRecords.some((record) => record.language === language)) {
    return <p role="status">{text("errors.missingContent")}</p>;
  }

  const resultMessage =
    results.length === 0
      ? text("directory.noResults")
      : text("directory.results", { count: results.length });

  return (
    <div className="agency-directory">
      <label className="agency-search" htmlFor={searchId}>
        <span>{text("directory.searchLabel")}</span>
        <input
          id={searchId}
          maxLength={MAX_SEARCH_LENGTH}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
          }}
          placeholder={text("directory.searchPlaceholder")}
          type="search"
          value={query}
        />
      </label>

      <p aria-atomic="true" aria-live="polite" className="agency-results-status">
        {resultMessage}
      </p>

      {results.length === 0 ? null : (
        <div className="agency-results">
          {results.map((record) => (
            <AgencyCard
              key={`${record.language}:${record.recordId}:${record.fixtureVersion}`}
              record={record}
            />
          ))}
        </div>
      )}
    </div>
  );
}
