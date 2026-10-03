---
inclusion: always
---

# Credential-free demo operations

The complete judged path must run deterministically on localhost with agency/model credentials unset and outbound network access unavailable. Do not make baseline behavior conditional on optional infrastructure.

## Baseline mode

- Start with versioned bundled guidance, corpus, checklist rules, agency records, situation fixtures, emergency phrases/contact metadata, and deterministic templates. Inject a fixed clock and explicit versions in tests.
- Require no credential prompt, account, remote model, remote embedding/reranking service, agency API, analytics service, database, or network request for any baseline capability.
- Display persistent `Demo Mode / Mod Demo` on every primary feature screen. Every demo provider record remains `Demo_Data` regardless of timestamp.
- Show provider mode, availability, freshness, and guidance status in every content container with actionable or operational-looking information. Keep demo/stale/not-current labels adjacent and visible in responsive and print modes.
- Keep emergency guidance/contact metadata in the initial client bundle so loading and server failure cannot remove emergency access.

## Deterministic and degraded operation

- Identical input, fixture/corpus/rule/template version, provider configuration, and fixed clock must produce identical IDs, values, timestamps, order, retrieval results, and response structure.
- If the server is unavailable, retain loaded emergency guidance, show a localized server-unavailable notice, and provide one retry action.
- If local storage fails, use in-memory state without disabling a capability. If an optional adapter is absent, disabled, invalid, stale, or timed out, use the configured fallback/stale policy without blocking the baseline.
- Do not silently fetch a remote source to fill missing fixture content. Missing or unsafe data becomes an explicit unavailable state or safety fallback.
- The limitations view must list unavailable live integrations, unverified credentials/approvals, out-of-scope capabilities, privacy behavior, review-status definitions, non-endorsement, and rescue/current-safety limitations.

## Acceptance operation

Run the credential-free acceptance suite with credentials removed and all non-localhost traffic blocked. Verify BM and English guidance/provenance, deterministic checklist and reload/clear behavior, agency search, separate observation/warning channels, supported and unsupported chat, resolvable citations, BM and English emergency precedence, accessibility, and server/storage/provider failures.

Treat any non-localhost request, credential prompt, absent fallback, detached risk label, derived warning, unsupported actionable claim, or unavailable emergency action as a baseline failure. Record agency approval, content/contact/translation review, production hosting/TLS, threat assessment, and real external credentials as external-validation dependencies—not as verified demo results.

Requirements: 7.4–7.6, 9.2–9.8, 13.8, 18.1–18.7.
