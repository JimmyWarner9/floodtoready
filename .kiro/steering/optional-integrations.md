---
inclusion: always
---

# Optional integration approval and fallback

All agency, warning-feed, external-model, embedding, and reranking integrations are optional server-side adapters. The credential-free implementation is the baseline, not a temporary error path.

## Approval gate

- Default every optional adapter to disabled and `unverified`/`unavailable`.
- Do not enable an agency adapter unless endpoint approval, API usage permission, schema/version, credential provisioning, record-identity behavior, retention/terms, timeout behavior, and fallback policy are explicitly documented and verified.
- Do not enable an external model or remote retrieval adapter unless its endpoint and credential are verified and its data retention, privacy, safety suitability, response contract, and fallback behavior are documented.
- The existence of a URL, portal, environment variable, or successful ad hoc request is not approval. Human-facing portals are outbound links, not APIs, and must not be scraped or treated as machine interfaces without explicit authorization.
- Credentials and authorization values remain in server environment configuration. Never expose them, fragments of them, provider bodies, stack traces, or internal paths to browser code, browser responses, logs, fixtures, tests, or documentation.

## Adapter boundary

- Put live adapters behind explicit capability flags and a registry/selector. Validate request/response content type, bounded size, schema, fields, values, source identity, and timestamps before normalization.
- Expose only provider name, provider mode, availability, verification, freshness, fallback provider, and allowlisted non-secret error codes to the browser.
- Preserve provider identity, stable record identity, source/retrieval timestamps, and live/demo classification. Normalize each situation channel directly; observations must never normalize into or derive an `official_warning`.
- Apply the same emergency, grounding, citation, privacy, refusal, demo/stale-label, conflict, and fallback validator to deterministic and external-model candidates.

## Failure behavior

- Terminate optional provider attempts at the configured 3,000 ms timeout. Reject network errors, unsupported content types, malformed bodies, missing required fields, invalid types, unknown/disallowed values, and unsafe redirects.
- Route every unavailable, timed-out, or invalid adapter through the configured stale-data policy and documented credential-free fallback. Invalid live payloads never reach the client.
- **An optional adapter must never block startup, emergency guidance, guidance browsing, checklist behavior, agency-directory fallback, grounded chatbot fallback, tests, builds, or any baseline demo journey.** Missing credentials are an unavailable-integration state, not a baseline failure.
- Preserve already-loaded emergency content and present localized provider status, limitations, and one safe retry where applicable. Prefer unavailable/safe fallback over guessed or partially normalized values.

## Verification

Test adapters with credentials absent, disabled, timed out, malformed, stale, and unavailable. Block non-localhost traffic in credential-free acceptance runs and assert all baseline journeys complete without an outbound request.

Requirements: 7.5–7.6, 9.2–9.8, 12.1–12.7, 18.1–18.7.
