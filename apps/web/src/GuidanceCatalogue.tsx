import { useMemo, type ReactNode } from "react";

import {
  normalizeGuidanceRecord,
  type GuidanceRecord,
  type SourceRef,
} from "@banjir-ready/contracts";

import { useLanguage } from "./localization/LanguageProvider";

export interface GuidanceCatalogueProps {
  /** Untrusted fixture or API records are normalized before any field is used. */
  readonly records: readonly unknown[];
}

function normalizeCatalogue(records: readonly unknown[]): readonly GuidanceRecord[] | null {
  try {
    return records.map((record) => normalizeGuidanceRecord(record));
  } catch {
    return null;
  }
}

function SourceReference({ source }: { readonly source: SourceRef }): ReactNode {
  return (
    <li>
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
    </li>
  );
}

function GuidanceCard({ record }: { readonly record: GuidanceRecord }): ReactNode {
  const { text } = useLanguage();
  const isReviewed = record.status === "Reviewed_Guidance";

  return (
    <article className="guidance-card" data-guidance-status={record.status}>
      <header className="guidance-card-header">
        <h3>{text(record.titleKey)}</h3>
        <p className="guidance-status">
          {text(isReviewed ? "guidance.reviewedStatus" : "guidance.demoStatus")}
        </p>
        <p className="guidance-version">
          <span>{record.contentVersion}</span>
          {" · "}
          <span>{text("guidance.updatedAt")}: </span>
          <time dateTime={record.updatedAt}>{record.updatedAt}</time>
        </p>
      </header>

      <div className="guidance-copy">
        <p className="guidance-body">{record.body}</p>
        {isReviewed ? null : (
          <p className="guidance-demo-label">
            {text("demoLabels.demoGuidance")}
          </p>
        )}
      </div>

      <section aria-label={text("guidance.source")} className="guidance-sources">
        <h4>{text("guidance.source")}</h4>
        <ul>
          {record.sources.map((source) => (
            <SourceReference key={source.sourceId} source={source} />
          ))}
        </ul>
      </section>

      {record.status === "Reviewed_Guidance" ? (
        <section className="guidance-review">
          <h4>{text("guidance.reviewedStatus")}</h4>
          <p>{record.review.reviewerName}</p>
          <p>{record.review.reviewerOrganizationOrQualification}</p>
          <p>
            <time dateTime={record.review.reviewDate}>
              {record.review.reviewDate}
            </time>
            {" · "}
            <span>{record.review.contentVersion}</span>
          </p>
          <ul>
            {record.review.sources.map((source) => (
              <SourceReference key={source.sourceId} source={source} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="guidance-non-endorsement">
        {text("guidance.nonEndorsement")}
      </p>
    </article>
  );
}

/**
 * Renders validated guidance in the selected language. A malformed batch is
 * suppressed as a whole so unvalidated content is never rendered partially.
 */
export function GuidanceCatalogue({ records }: GuidanceCatalogueProps): ReactNode {
  const { language, text } = useLanguage();
  const normalizedRecords = useMemo(() => normalizeCatalogue(records), [records]);

  if (normalizedRecords === null) {
    return <p role="status">{text("guidance.contentUnavailable")}</p>;
  }

  const selectedRecords = normalizedRecords.filter(
    (record) => record.language === language,
  );

  if (selectedRecords.length === 0) {
    return <p role="status">{text("guidance.contentUnavailable")}</p>;
  }

  return (
    <div className="guidance-catalogue">
      {selectedRecords.map((record) => (
        <GuidanceCard
          key={`${record.recordId}:${record.contentVersion}`}
          record={record}
        />
      ))}
    </div>
  );
}
