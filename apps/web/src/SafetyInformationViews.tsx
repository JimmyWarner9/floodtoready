import { useEffect, useId, useRef, type ReactNode } from "react";

import type { Language } from "./localization/resources";
import {
  classifyScopeRequest,
  SCOPE_LIMITATION_COPY,
  type ScopeLimitationCategory,
} from "./scopeLimitation";
import {
  ENABLED_EXTERNAL_INTEGRATIONS,
  localize,
  OPTIONAL_INTEGRATION_REGISTRY,
  OUT_OF_SCOPE_CAPABILITIES,
  STATUS_DEFINITIONS,
  STORAGE_FIELD_DISCLOSURES,
} from "./safetyInformationRegistry";
import "./SafetyInformationViews.css";

interface LanguageProps {
  readonly language: Language;
}

const VIEW_COPY = {
  en: {
    privacyHeading: "Privacy and local data",
    privacyIntroduction:
      "Every baseline feature works without an account or identity. Checklist profile data stays in this browser.",
    storedFieldsHeading: "The complete local-storage allowlist",
    envelope:
      "One namespaced, versioned BanjirReady envelope stores only these fields:",
    excludedStorage:
      "Chat text, names or identity, diagnoses, exact addresses, medication profiles, credentials, authorization values, provider response bodies, and print snapshots are never stored.",
    retentionHeading: "Retention",
    retention:
      "Allowed data remains in this browser profile until you clear it or browser storage is removed. Chat text is discarded when response or abort processing ends.",
    clearHeading: "Clear data",
    clear:
      "The clear-data control asks for confirmation, removes every BanjirReady-prefixed key, leaves unrelated browser keys untouched, and restores unsaved defaults.",
    failureHeading: "If storage is unavailable",
    failure:
      "Features continue in memory for the current session and show a persistence-unavailable notice.",
    integrationsHeading: "Enabled external integrations",
    noIntegrations:
      "None. Baseline operation uses no analytics, advertising, session replay, geolocation, background location collection, agency API, or external model.",
    limitationsHeading: "Limitations",
    limitationsIntroduction:
      "BanjirReady provides preparedness information only. Unavailable capabilities are listed explicitly below.",
    liveHeading: "Unavailable live integrations",
    unavailable: "Unavailable",
    unverified: "Unverified",
    fallback: "Credential-free fallback",
    credentials:
      "No agency or model endpoint, permission, schema, retention terms, or credential has been verified or provisioned. A portal URL does not make an approved API.",
    statusHeading: "Guidance status definitions",
    privacyBehaviorHeading: "Privacy behavior",
    privacyBehavior:
      "No account is needed; the narrow checklist allowlist remains client-side; chat text is not persisted; and tracking technologies are not enabled.",
    emergencyHeading: "Emergency limitations",
    emergency:
      "BanjirReady cannot receive, dispatch, track, or monitor rescue requests and cannot guarantee current safety. It is not an emergency service. Use the persistent emergency action when immediate help may be needed.",
    scopeHeading: "Explicitly unavailable capabilities",
    openPrivacy: "Open privacy information",
    openLimitations: "Open limitations",
    invalidRequest: "The request was not accepted.",
  },
  ms: {
    privacyHeading: "Privasi dan data tempatan",
    privacyIntroduction:
      "Setiap ciri asas berfungsi tanpa akaun atau identiti. Data profil senarai semak kekal dalam pelayar ini.",
    storedFieldsHeading: "Senarai lengkap data storan tempatan yang dibenarkan",
    envelope:
      "Satu sampul BanjirReady bernama dan berversi hanya menyimpan medan berikut:",
    excludedStorage:
      "Teks sembang, nama atau identiti, diagnosis, alamat tepat, profil ubat, kelayakan akses, nilai kebenaran, badan respons penyedia dan petikan cetakan tidak pernah disimpan.",
    retentionHeading: "Tempoh penyimpanan",
    retention:
      "Data yang dibenarkan kekal dalam profil pelayar ini sehingga anda mengosongkannya atau storan pelayar dipadamkan. Teks sembang dibuang apabila pemprosesan respons atau pembatalan tamat.",
    clearHeading: "Kosongkan data",
    clear:
      "Kawalan kosongkan data meminta pengesahan, membuang setiap kunci berawalan BanjirReady, membiarkan kunci pelayar lain tidak berubah dan memulihkan nilai lalai yang belum disimpan.",
    failureHeading: "Jika storan tidak tersedia",
    failure:
      "Ciri terus berfungsi dalam ingatan untuk sesi semasa dan memaparkan notis penyimpanan tidak tersedia.",
    integrationsHeading: "Integrasi luaran yang didayakan",
    noIntegrations:
      "Tiada. Operasi asas tidak menggunakan analitik, pengiklanan, rakaman semula sesi, geolokasi, pengumpulan lokasi latar belakang, API agensi atau model luaran.",
    limitationsHeading: "Batasan",
    limitationsIntroduction:
      "BanjirReady hanya menyediakan maklumat kesiapsiagaan. Keupayaan yang tidak tersedia disenaraikan dengan jelas di bawah.",
    liveHeading: "Integrasi langsung yang tidak tersedia",
    unavailable: "Tidak tersedia",
    unverified: "Belum disahkan",
    fallback: "Sandaran tanpa kelayakan akses",
    credentials:
      "Tiada titik akhir, kebenaran, skema, terma penyimpanan atau kelayakan akses agensi atau model telah disahkan atau disediakan. URL portal tidak menjadikannya API yang diluluskan.",
    statusHeading: "Takrif status panduan",
    privacyBehaviorHeading: "Tingkah laku privasi",
    privacyBehavior:
      "Tiada akaun diperlukan; senarai semak terhad kekal pada bahagian klien; teks sembang tidak disimpan; dan teknologi penjejakan tidak didayakan.",
    emergencyHeading: "Batasan kecemasan",
    emergency:
      "BanjirReady tidak boleh menerima, menghantar, menjejak atau memantau permintaan menyelamat dan tidak boleh menjamin keselamatan semasa. Ia bukan perkhidmatan kecemasan. Gunakan tindakan kecemasan kekal apabila bantuan segera mungkin diperlukan.",
    scopeHeading: "Keupayaan yang tidak tersedia secara jelas",
    openPrivacy: "Buka maklumat privasi",
    openLimitations: "Buka batasan",
    invalidRequest: "Permintaan tidak diterima.",
  },
} as const;

export function PrivacyView({ language }: LanguageProps): ReactNode {
  const copy = VIEW_COPY[language];
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="information-view">
      <h2 id={headingId}>{copy.privacyHeading}</h2>
      <p>{copy.privacyIntroduction}</p>

      <section>
        <h3>{copy.storedFieldsHeading}</h3>
        <p>{copy.envelope}</p>
        <ul>
          {STORAGE_FIELD_DISCLOSURES.map((field) => (
            <li key={field.id}>{localize(field.label, language)}</li>
          ))}
        </ul>
        <p className="information-note">{copy.excludedStorage}</p>
      </section>

      <section>
        <h3>{copy.retentionHeading}</h3>
        <p>{copy.retention}</p>
      </section>

      <section>
        <h3>{copy.clearHeading}</h3>
        <p>{copy.clear}</p>
      </section>

      <section>
        <h3>{copy.failureHeading}</h3>
        <p>{copy.failure}</p>
      </section>

      <section>
        <h3>{copy.integrationsHeading}</h3>
        {ENABLED_EXTERNAL_INTEGRATIONS.length === 0 ? (
          <p>{copy.noIntegrations}</p>
        ) : (
          <ul>
            {ENABLED_EXTERNAL_INTEGRATIONS.map((integration) => (
              <li key={integration.id}>{localize(integration.name, language)}</li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export function LimitationsView({ language }: LanguageProps): ReactNode {
  const copy = VIEW_COPY[language];
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="information-view">
      <h2 id={headingId}>{copy.limitationsHeading}</h2>
      <p>{copy.limitationsIntroduction}</p>

      <section>
        <h3>{copy.liveHeading}</h3>
        <p>{copy.credentials}</p>
        <ul className="integration-list">
          {OPTIONAL_INTEGRATION_REGISTRY.map((integration) => (
            <li key={integration.id}>
              <strong>{localize(integration.name, language)}</strong>
              <dl>
                <div>
                  <dt>{copy.unavailable}</dt>
                  <dd>{copy.unavailable}</dd>
                </div>
                <div>
                  <dt>{copy.unverified}</dt>
                  <dd>{copy.unverified}</dd>
                </div>
                <div>
                  <dt>{copy.fallback}</dt>
                  <dd>{localize(integration.fallback, language)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>{copy.statusHeading}</h3>
        <dl className="definition-list">
          {STATUS_DEFINITIONS.map((status) => (
            <div key={status.id}>
              <dt>{localize(status.title, language)}</dt>
              <dd>{localize(status.detail, language)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3>{copy.privacyBehaviorHeading}</h3>
        <p>{copy.privacyBehavior}</p>
      </section>

      <section className="emergency-limitation">
        <h3>{copy.emergencyHeading}</h3>
        <p>{copy.emergency}</p>
      </section>

      <section>
        <h3>{copy.scopeHeading}</h3>
        <ul className="scope-list">
          {OUT_OF_SCOPE_CAPABILITIES.map((capability) => (
            <li key={capability.id}>
              <strong>{localize(capability.title, language)}</strong>
              <span>{localize(capability.detail, language)}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export function SafetyInformationViews({ language }: LanguageProps): ReactNode {
  const copy = VIEW_COPY[language];

  return (
    <div className="safety-information-views">
      <details>
        <summary>{copy.openPrivacy}</summary>
        <PrivacyView language={language} />
      </details>
      <details>
        <summary>{copy.openLimitations}</summary>
        <LimitationsView language={language} />
      </details>
    </div>
  );
}

interface ScopeLimitationNoticeProps extends LanguageProps {
  readonly category: ScopeLimitationCategory;
}

export function ScopeLimitationNotice({
  category,
  language,
}: ScopeLimitationNoticeProps): ReactNode {
  const headingId = useId();
  const emergencyHeadingRef = useRef<HTMLHeadingElement>(null);
  const limitation = SCOPE_LIMITATION_COPY[category];
  const isRescueRequest = category === "rescue_dispatch";

  useEffect(() => {
    if (isRescueRequest) {
      emergencyHeadingRef.current?.focus();
    }
  }, [isRescueRequest]);

  return (
    <section
      aria-labelledby={headingId}
      className="scope-limitation-notice"
      data-capability-available="false"
      role={isRescueRequest ? "alert" : "status"}
    >
      {isRescueRequest ? (
        <div className="scope-emergency-escalation">
          <h2 ref={emergencyHeadingRef} tabIndex={-1}>
            Get emergency help now / Dapatkan bantuan kecemasan sekarang
          </h2>
          <div className="scope-emergency-contact">
            <a href="tel:999">Call 999 / Hubungi 999</a>
            <span>
              Demo Data / Data Demo — contact validation is required before public
              deployment / pengesahan nombor diperlukan sebelum penggunaan awam
            </span>
          </div>
          <p>
            Do not walk, swim, or drive through moving or unknown-depth floodwater.
            Follow emergency-personnel directions. / Jangan berjalan, berenang atau
            memandu melalui air banjir yang bergerak atau tidak diketahui
            kedalamannya. Ikut arahan anggota kecemasan.
          </p>
        </div>
      ) : null}
      <h2 id={headingId}>{localize(limitation.title, language)}</h2>
      <p>{localize(limitation.detail, language)}</p>
    </section>
  );
}

interface ClassifiedScopeLimitationProps extends LanguageProps {
  readonly request: unknown;
}

export function ClassifiedScopeLimitation({
  language,
  request,
}: ClassifiedScopeLimitationProps): ReactNode {
  const classification = classifyScopeRequest(request);

  if (classification.kind === "not_scope_request") {
    return null;
  }

  if (classification.kind === "invalid_request") {
    return <p role="alert">{VIEW_COPY[language].invalidRequest}</p>;
  }

  return (
    <ScopeLimitationNotice
      category={classification.category}
      language={language}
    />
  );
}
