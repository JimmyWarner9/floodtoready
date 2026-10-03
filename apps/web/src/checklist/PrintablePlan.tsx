import { useMemo, type ReactNode } from "react";

import {
  agencyRecordSchema,
  checklistResultSchema,
  type AgencyRecord,
  type ChecklistResult,
  type FreshnessState,
  type GuidanceStatus,
  type Language,
  type Provenance,
  type SourceRef,
} from "@banjir-ready/contracts";

import { useLanguage } from "../localization/LanguageProvider";

import "./PrintablePlan.css";

const COPY = {
  en: {
    title: "Printable flood preparedness plan",
    generatedAt: "Generated at",
    printAction: "Print preparedness plan",
    emergencyHeading: "Emergency guidance",
    callEmergency: "Call emergency services",
    avoidFloodwater:
      "Do not walk, swim, or drive through moving or unknown-depth floodwater.",
    followResponders: "Follow instructions from emergency personnel.",
    cannotDispatch:
      "BanjirReady cannot dispatch or monitor rescue requests and cannot guarantee current safety.",
    validationRequired:
      "This demo contact requires validation before public deployment.",
    checklistHeading: "Preparedness checklist",
    ruleVersion: "Checklist rule version",
    completed: "Completed",
    incomplete: "Not completed",
    sources: "Sources",
    reviewedGuidance: "Reviewed guidance",
    demoGuidance: "Demo Guidance / Panduan Demo",
    contactsHeading: "Selected agency contacts",
    noContacts: "No agency contacts were selected for this plan.",
    role: "Role",
    telephone: "Telephone",
    call: "Call",
    contactUnavailable:
      "Contact information is unavailable. Refer to the listed source.",
    portal: "Information portal",
    externalPortal:
      "External information portal; this is not an application integration.",
    lastUpdated: "Last updated",
    provider: "Provider",
    providerMode: "Provider mode",
    dataClass: "Data classification",
    freshness: "Freshness",
    sourceTimestamp: "Source timestamp",
    retrievalTimestamp: "Retrieval timestamp",
    current: "Current under the configured freshness policy",
    stale: "Stale",
    unavailable: "Source unavailable",
    staleWarning:
      "This information is stale. Check the source timestamp before acting.",
    demoData: "Demo Data / Data Demo",
    limitationsHeading: "Limitations",
    limitations: [
      "BanjirReady provides preparedness information only.",
      "BanjirReady cannot receive, dispatch, track, or monitor rescue requests and cannot guarantee current safety.",
      "Evacuation route calculation, flood forecasting, and claims that a location is safe are unavailable.",
      "Content and review status do not represent government endorsement.",
      "This printout is a local snapshot of the on-screen plan. Check source timestamps and current official instructions before acting.",
    ],
    unavailablePlan:
      "The printable plan is unavailable because its data did not pass validation.",
  },
  ms: {
    title: "Pelan kesiapsiagaan banjir untuk dicetak",
    generatedAt: "Dijana pada",
    printAction: "Cetak pelan kesiapsiagaan",
    emergencyHeading: "Panduan kecemasan",
    callEmergency: "Hubungi perkhidmatan kecemasan",
    avoidFloodwater:
      "Jangan berjalan, berenang atau memandu melalui air banjir yang bergerak atau tidak diketahui kedalamannya.",
    followResponders: "Ikut arahan anggota kecemasan.",
    cannotDispatch:
      "BanjirReady tidak boleh menghantar atau memantau permintaan menyelamat dan tidak boleh menjamin keselamatan semasa.",
    validationRequired:
      "Hubungan demo ini memerlukan pengesahan sebelum penggunaan awam.",
    checklistHeading: "Senarai semak kesiapsiagaan",
    ruleVersion: "Versi peraturan senarai semak",
    completed: "Selesai",
    incomplete: "Belum selesai",
    sources: "Sumber",
    reviewedGuidance: "Panduan disemak",
    demoGuidance: "Demo Guidance / Panduan Demo",
    contactsHeading: "Hubungan agensi yang dipilih",
    noContacts: "Tiada hubungan agensi dipilih untuk pelan ini.",
    role: "Peranan",
    telephone: "Telefon",
    call: "Hubungi",
    contactUnavailable:
      "Maklumat hubungan tidak tersedia. Rujuk sumber yang disenaraikan.",
    portal: "Portal maklumat",
    externalPortal:
      "Portal maklumat luaran; ini bukan integrasi aplikasi.",
    lastUpdated: "Kali terakhir dikemas kini",
    provider: "Penyedia",
    providerMode: "Mod penyedia",
    dataClass: "Klasifikasi data",
    freshness: "Kesegaran",
    sourceTimestamp: "Cap masa sumber",
    retrievalTimestamp: "Cap masa pengambilan",
    current: "Semasa mengikut dasar kesegaran yang dikonfigurasikan",
    stale: "Lapuk",
    unavailable: "Sumber tidak tersedia",
    staleWarning:
      "Maklumat ini lapuk. Semak cap masa sumber sebelum bertindak.",
    demoData: "Demo Data / Data Demo",
    limitationsHeading: "Batasan",
    limitations: [
      "BanjirReady hanya menyediakan maklumat kesiapsiagaan.",
      "BanjirReady tidak boleh menerima, menghantar, menjejak atau memantau permintaan menyelamat dan tidak boleh menjamin keselamatan semasa.",
      "Pengiraan laluan pemindahan, ramalan banjir dan dakwaan bahawa sesuatu lokasi selamat tidak tersedia.",
      "Kandungan dan status semakan tidak mewakili pengendorsan kerajaan.",
      "Cetakan ini ialah gambaran tempatan pelan pada skrin. Semak cap masa sumber dan arahan rasmi semasa sebelum bertindak.",
    ],
    unavailablePlan:
      "Pelan untuk dicetak tidak tersedia kerana datanya tidak lulus pengesahan.",
  },
} as const;

export interface PrintablePlanProps {
  /** The current generated checklist. Untrusted values are runtime-validated. */
  readonly checklist: unknown;
  /** Stable item IDs mapped to their current completion state. */
  readonly completion: unknown;
  /** Bilingual emergency-contact candidates; exactly one must match the selected language. */
  readonly emergencyContacts: readonly unknown[];
  /** The agency records selected by the user for this plan. */
  readonly selectedContacts: readonly unknown[];
  /** Injected ISO-8601 UTC generation time; no implicit clock is used. */
  readonly generatedAt: string;
}

interface PrintablePlanModel {
  readonly checklist: ChecklistResult;
  readonly completion: Readonly<Record<string, boolean>>;
  readonly emergencyContact: AgencyRecord;
  readonly selectedContacts: readonly AgencyRecord[];
  readonly generatedAt: string;
}

function isCanonicalUtcTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function parseCompletion(
  input: unknown,
  checklist: ChecklistResult,
): Readonly<Record<string, boolean>> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  const knownItemIds = new Set(checklist.items.map(({ itemId }) => itemId));
  const entries = Object.entries(input);
  if (
    entries.some(
      ([itemId, completed]) =>
        !knownItemIds.has(itemId) || typeof completed !== "boolean",
    )
  ) {
    return null;
  }

  return Object.freeze(Object.fromEntries(entries));
}

function parseAgencies(input: readonly unknown[]): readonly AgencyRecord[] | null {
  const parsed = input.map((candidate) => agencyRecordSchema.safeParse(candidate));
  if (parsed.some((result) => !result.success)) {
    return null;
  }

  return parsed.flatMap((result) => (result.success ? [result.data] : []));
}

function createPrintablePlanModel(
  props: PrintablePlanProps,
  language: Language,
): PrintablePlanModel | null {
  const checklistResult = checklistResultSchema.safeParse(props.checklist);
  const emergencyContacts = parseAgencies(props.emergencyContacts);
  const selectedContacts = parseAgencies(props.selectedContacts);

  if (
    !checklistResult.success ||
    emergencyContacts === null ||
    selectedContacts === null ||
    !isCanonicalUtcTimestamp(props.generatedAt)
  ) {
    return null;
  }

  const completion = parseCompletion(props.completion, checklistResult.data);
  const matchingEmergencyContacts = emergencyContacts.filter(
    (record) => record.language === language,
  );
  const localizedSelectedContacts = selectedContacts.filter(
    (record) => record.language === language,
  );
  const selectedIds = localizedSelectedContacts.map(({ recordId }) => recordId);

  if (
    completion === null ||
    matchingEmergencyContacts.length !== 1 ||
    new Set(selectedIds).size !== selectedIds.length
  ) {
    return null;
  }

  const emergencyContact = matchingEmergencyContacts[0];
  if (emergencyContact === undefined) {
    return null;
  }

  return Object.freeze({
    checklist: checklistResult.data,
    completion,
    emergencyContact,
    selectedContacts: Object.freeze(localizedSelectedContacts),
    generatedAt: props.generatedAt,
  });
}

function guidanceStatusLabel(
  status: GuidanceStatus,
  copy: (typeof COPY)[Language],
): string {
  return status === "Demo_Guidance"
    ? copy.demoGuidance
    : copy.reviewedGuidance;
}

function freshnessLabel(
  freshness: FreshnessState,
  copy: (typeof COPY)[Language],
): string {
  switch (freshness) {
    case "current":
      return copy.current;
    case "stale":
      return copy.stale;
    case "unavailable":
      return copy.unavailable;
  }
}

function telephoneUri(phone: string | null): string | null {
  if (
    phone === null ||
    !/^(?:\+?[0-9](?:[0-9 -]{0,62}[0-9])?|[0-9])$/.test(phone)
  ) {
    return null;
  }

  return `tel:${phone}`;
}

function SourceReference({
  source,
  copy,
}: {
  readonly source: SourceRef;
  readonly copy: (typeof COPY)[Language];
}): ReactNode {
  return (
    <li className="printable-plan-source">
      <a href={source.url} rel="noopener noreferrer" target="_blank">
        {source.title}
      </a>
      <span> — {source.organization}</span>
      {source.sourceDate === null ? null : (
        <>
          {" · "}
          <time dateTime={source.sourceDate}>{source.sourceDate}</time>
        </>
      )}
      <span className="printable-plan-link-url">
        {" · "}
        {copy.portal}: {source.url}
      </span>
    </li>
  );
}

function RiskLabels({
  status,
  provenance,
  copy,
}: {
  readonly status: GuidanceStatus;
  readonly provenance?: Provenance;
  readonly copy: (typeof COPY)[Language];
}): ReactNode {
  return (
    <div className="printable-plan-risk-labels">
      <p>{guidanceStatusLabel(status, copy)}</p>
      {provenance?.dataClass === "Demo_Data" ? <p>{copy.demoData}</p> : null}
      {provenance?.freshness === "stale" ? <p>{copy.staleWarning}</p> : null}
    </div>
  );
}

function ProvenanceDetails({
  record,
  copy,
}: {
  readonly record: AgencyRecord;
  readonly copy: (typeof COPY)[Language];
}): ReactNode {
  const provenance = record.provenance;
  return (
    <dl className="printable-plan-provenance">
      <div>
        <dt>{copy.provider}</dt>
        <dd>{provenance.providerName}</dd>
      </div>
      <div>
        <dt>{copy.providerMode}</dt>
        <dd>{provenance.providerMode}</dd>
      </div>
      <div>
        <dt>{copy.dataClass}</dt>
        <dd>{provenance.dataClass}</dd>
      </div>
      <div>
        <dt>{copy.freshness}</dt>
        <dd>{freshnessLabel(provenance.freshness, copy)}</dd>
      </div>
      <div>
        <dt>{copy.sourceTimestamp}</dt>
        <dd>
          {provenance.sourceTimestamp === null ? copy.unavailable : (
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
  );
}

function AgencyContact({
  record,
  copy,
  emergency = false,
}: {
  readonly record: AgencyRecord;
  readonly copy: (typeof COPY)[Language];
  readonly emergency?: boolean;
}): ReactNode {
  const phoneUri = telephoneUri(record.phone);
  const isAvailable = record.provenance.freshness !== "unavailable";
  const canCall = isAvailable && phoneUri !== null;

  return (
    <article className="printable-plan-contact" data-record-id={record.recordId}>
      <h4>{record.agencyName}</h4>
      <p>
        <strong>{copy.role}:</strong> {record.role}
      </p>

      <div className="printable-plan-contact-value">
        <RiskLabels
          copy={copy}
          provenance={record.provenance}
          status={record.status}
        />
        {canCall ? (
          <p>
            <strong>{copy.telephone}:</strong> {record.phone}{" "}
            <a href={phoneUri}>
              {copy.call} {record.phone}
            </a>
          </p>
        ) : (
          <p>{copy.contactUnavailable}</p>
        )}
        {emergency && record.provenance.dataClass === "Demo_Data" ? (
          <p className="printable-plan-validation-notice">
            {copy.validationRequired}
          </p>
        ) : null}
      </div>

      {isAvailable && record.portalUrl !== null ? (
        <p className="printable-plan-portal">
          <a href={record.portalUrl} rel="noopener noreferrer" target="_blank">
            {copy.portal}
          </a>{" "}
          <span>({record.portalUrl})</span>
          <br />
          <small>{copy.externalPortal}</small>
        </p>
      ) : null}

      <p>
        <strong>{copy.lastUpdated}:</strong>{" "}
        <time dateTime={record.lastUpdated}>{record.lastUpdated}</time>
      </p>
      <ProvenanceDetails copy={copy} record={record} />

      <section aria-label={copy.sources}>
        <h5>{copy.sources}</h5>
        <ul>
          <SourceReference copy={copy} source={record.source} />
        </ul>
      </section>

      {record.status === "Reviewed_Guidance" ? (
        <section aria-label={copy.reviewedGuidance}>
          <h5>{copy.reviewedGuidance}</h5>
          <p>{record.review.reviewerName}</p>
          <p>{record.review.reviewerOrganizationOrQualification}</p>
          <p>
            <time dateTime={record.review.reviewDate}>
              {record.review.reviewDate}
            </time>{" "}
            · {record.review.contentVersion}
          </p>
          <ul>
            {record.review.sources.map((source) => (
              <SourceReference
                copy={copy}
                key={source.sourceId}
                source={source}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

/**
 * Read-only print projection of current in-memory application data. Printing is
 * delegated directly to the browser; this component has no storage or HTTP path.
 */
export function PrintablePlan(props: PrintablePlanProps): ReactNode {
  const { language, text } = useLanguage();
  const copy = COPY[language];
  const model = useMemo(
    () => createPrintablePlanModel(props, language),
    [language, props],
  );

  if (model === null) {
    return <p role="status">{copy.unavailablePlan}</p>;
  }

  return (
    <div className="printable-plan-container">
      <button
        className="printable-plan-action"
        data-print-exclude="true"
        onClick={() => {
          window.print();
        }}
        type="button"
      >
        {copy.printAction}
      </button>

      <article
        aria-labelledby="printable-plan-title"
        className="printable-plan"
        data-print-surface="true"
      >
        <header className="printable-plan-header">
          <h2 id="printable-plan-title">{copy.title}</h2>
          <p className="printable-plan-demo-mode">
            {text("demoLabels.demoMode")}
          </p>
          <p>
            <strong>{copy.generatedAt}:</strong>{" "}
            <time dateTime={model.generatedAt}>{model.generatedAt}</time>
          </p>
        </header>

        <section
          aria-labelledby="printable-plan-emergency-heading"
          className="printable-plan-section printable-plan-emergency"
        >
          <h3 id="printable-plan-emergency-heading">
            {copy.emergencyHeading}
          </h3>
          <p>{copy.avoidFloodwater}</p>
          <p>{copy.followResponders}</p>
          <p>{copy.cannotDispatch}</p>
          <AgencyContact
            copy={copy}
            emergency
            record={model.emergencyContact}
          />
        </section>

        <section
          aria-labelledby="printable-plan-checklist-heading"
          className="printable-plan-section"
        >
          <h3 id="printable-plan-checklist-heading">
            {copy.checklistHeading}
          </h3>
          <p>
            <strong>{copy.ruleVersion}:</strong> {model.checklist.ruleVersion}
          </p>
          <ol className="printable-plan-checklist">
            {model.checklist.items.map((item) => {
              const completed = model.completion[item.itemId] ?? false;
              return (
                <li
                  className="printable-plan-checklist-item"
                  data-completed={completed ? "true" : "false"}
                  key={item.itemId}
                >
                  <div className="printable-plan-item-state">
                    <span
                      aria-hidden="true"
                      className="printable-plan-checkbox"
                    >
                      {completed ? "✓" : ""}
                    </span>
                    <span>{completed ? copy.completed : copy.incomplete}</span>
                  </div>
                  <p className="printable-plan-item-text">
                    {text(item.wordingKey)}
                  </p>
                  <RiskLabels copy={copy} status={item.guidanceStatus} />
                  <section aria-label={copy.sources}>
                    <h4>{copy.sources}</h4>
                    <ul>
                      {item.sourceRefs.map((source) => (
                        <SourceReference
                          copy={copy}
                          key={source.sourceId}
                          source={source}
                        />
                      ))}
                    </ul>
                  </section>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          aria-labelledby="printable-plan-contacts-heading"
          className="printable-plan-section"
        >
          <h3 id="printable-plan-contacts-heading">
            {copy.contactsHeading}
          </h3>
          {model.selectedContacts.length === 0 ? (
            <p>{copy.noContacts}</p>
          ) : (
            <div className="printable-plan-contacts">
              {model.selectedContacts.map((record) => (
                <AgencyContact
                  copy={copy}
                  key={record.recordId}
                  record={record}
                />
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="printable-plan-limitations-heading"
          className="printable-plan-section printable-plan-limitations"
        >
          <h3 id="printable-plan-limitations-heading">
            {copy.limitationsHeading}
          </h3>
          <ul>
            {copy.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
