---
inclusion: always
---

# Privacy, security, and logging

Use data minimization and fail-closed validation at every browser, storage, HTTP, fixture, corpus, provider, and model boundary.

## Local data and privacy

- Provide every baseline capability without an account or identity.
- Persist only one namespaced, versioned local envelope containing: language preference; the six checklist fields (household size, children, elderly members, mobility assistance, pets, transport); checklist rule version; stable checklist item IDs and completion states; and acknowledged notices.
- Never persist chatbot text, names/identity, diagnoses, exact addresses, medication profiles, credentials, authorization values, provider response bodies, print snapshots, or fields added “for convenience.” Checklist profile data stays client-side.
- Show the shared-browser-profile privacy notice before the first personal-data save. If storage is denied, malformed, unavailable, or full, continue in memory and show the localized persistence-unavailable notice.
- Confirm before clear-data; then remove every BanjirReady-prefixed key, leave unrelated keys untouched, and restore unsaved defaults.
- Discard chatbot message text when the response or abort processing ends. Do not add accounts, identity cookies, analytics, advertising, session replay, geolocation, or background location collection.
- Privacy information must enumerate the storage allowlist, retention behavior, clear procedure, and currently enabled external integrations from the same schemas/registry used by the application.

## Boundary and rendering security

- Treat browser input, local storage, fixtures, corpus text, URLs, provider payloads, and model output as untrusted. Runtime-validate them before use.
- Render guidance, directory, citations, errors, and chat as text. Rich HTML requires a separately approved allowlist sanitizer and dedicated tests.
- Validate route, method, content type, body shape, unknown fields, field types, lengths, values, and UTF-8 byte limits before processing. Reject invalid input without partial work.
- Keep secrets server-side and out of browser assets and source maps. Return localized safe error codes, never stack traces, secrets, authorization values, internal paths, raw provider bodies, or personal data.
- Use same-origin API calls, validated HTTPS outbound links with safe link attributes, restrictive security headers, and encrypted transport for personal-data requests outside localhost.

## Allowlist logging

- Logs may contain only the documented operational allowlist: request ID, route template (not raw URL/query), response status, duration, safe error code, and provider name/mode.
- Never log request/response bodies, chatbot text, checklist/profile values or fingerprints, local-storage values, precise location, credentials/fragments, authorization headers, external-provider payloads, source excerpts containing user data, stack traces exposed to users, or internal file paths.
- Redact at the logging boundary before serialization; do not rely on callers to omit sensitive fields. Provider/model exceptions must map to safe codes.
- Do not persist bodies for debugging. Test log sinks with sentinel secrets and personal data and assert absence from normal, validation-error, timeout, abort, and exception paths.

Requirements: 9.5–9.6, 13.2–13.8, 18.2–18.6. Security controls also implement the design’s HTTP and trust-boundary safeguards.
