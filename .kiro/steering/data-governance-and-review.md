---
inclusion: always
---

# Data governance, versioning, and review labels

Apply these rules when adding or transforming guidance, corpus, checklist, directory, provider, situation, source, translation, or fixture data.

## Identity, provenance, and versions

- Use stable opaque record IDs, explicit fixture/content/corpus/rule/schema versions, ISO-8601 UTC timestamps at system boundaries, and discriminated unions for record kinds.
- Preserve record ID, content version, source metadata, `Guidance_Status`, data classification, provider identity, source timestamp, retrieval timestamp, and language linkage through search, checklist inclusion, retrieval, language switching, normalization, and fallback. Pass metadata with records; never reconstruct it from display text.
- Version bundled fixtures and deterministic templates. Identical input, version, configuration, and fixed clock must produce identical IDs, values, timestamps, ordering, and classifications.
- Treat an ordinary source URL as provenance only. A URL does not prove API permission, review, currentness, government endorsement, or live status.

## Review status

- Every guidance-record version has exactly one status: `Reviewed_Guidance` or `Demo_Guidance`.
- Permit `Reviewed_Guidance` only when all fields are present and non-empty: reviewer name, reviewer organization or qualification, review date, content version, and at least one source reference. Never infer review from an official-looking or `.gov.my` URL.
- If any review field is missing or invalid, normalize to `Demo_Guidance`; do not partially display the record as reviewed.
- Display reviewed metadata and sources in the same content container as reviewed guidance. Display `Demo Guidance / Panduan Demo` in the same container immediately before or after demo guidance, with no intervening actionable content.
- State that neither status represents government endorsement.

## Demo, live, and stale data

- Demo providers classify every provider record as `Demo_Data`. Never relabel fixtures as live because their timestamps are recent.
- Keep `Demo Data / Data Demo`, stale warnings, source timestamp, retrieval timestamp, freshness, provider mode/availability, and `Guidance_Status` in the same content container as operational-looking or actionable information.
- Labels must survive sorting, filtering, fallback, localization, chatbot citation, printing, and responsive layouts. CSS, truncation, dialogs, or separate tabs must not detach or hide them.
- For warnings, water levels, evacuation orders, shelter status, or rescue status represented by demo data, also render `Not current operational information / Bukan maklumat operasi semasa` immediately adjacent.
- Apply configured freshness policy mechanically. Missing, invalid, or future source timestamps are stale. Never refresh a source timestamp merely by retrieving or copying a record.
- Missing fields remain missing. Show a localized unavailable state and source; do not synthesize contacts, timestamps, review metadata, translations, or operational values.

## Change discipline

Any data change must update the relevant version, preserve BM/English conceptual linkage, pass runtime schema and resource-parity validation, and include tests for metadata propagation and adjacent labels. Record external review/approval as an external-validation dependency until complete evidence exists.

Requirements: 4.4–4.7, 7.4–7.6, 12.4–12.7, 18.1, 18.5–18.7.
