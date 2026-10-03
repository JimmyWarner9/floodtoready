# Implementation Plan: BanjirReady MVP

## Overview

Implement BanjirReady as a TypeScript npm-workspace monorepo containing a React/Vite/Tailwind web client, an Express application server, and shared contracts. Build the complete credential-free, offline-capable demo before exposing any optional integration boundary. Each increment must remain wired into a usable product; live agency and external-model implementations stay disabled until their approvals, schemas, credentials, and permissions are independently verified.

## Tasks

- [x] 1. Establish the monorepo, contracts, and deterministic build foundation
  - [x] 1.1 Create the npm-workspace project structure
    - Create `apps/web`, `apps/server`, `packages/contracts`, `packages/fixtures`, and `packages/test-support` with strict TypeScript project references and Node 22 engine constraints.
    - Add root scripts that invoke workspace-specific development, type-check, lint, test, build, and demo-acceptance commands without introducing a required cloud service.
    - _Requirements: 1.1, 1.2, 7.5, 16.1_

  - [x] 1.2 Pin the complete dependency toolchain and lockfile
    - Pin runtime packages exactly: `react@18.3.1`, `react-dom@18.3.1`, `express@4.21.2`, and `zod@3.24.2`.
    - Pin build/test packages exactly: `typescript@5.7.3`, `vite@6.1.0`, `@vitejs/plugin-react@4.3.4`, `tailwindcss@3.4.17`, `postcss@8.5.2`, `autoprefixer@10.4.20`, `tsx@4.19.2`, `concurrently@9.1.2`, `vitest@3.0.5`, `@vitest/coverage-v8@3.0.5`, `fast-check@3.23.2`, `jsdom@26.0.0`, `@testing-library/react@16.2.0`, `@testing-library/user-event@14.6.1`, `@testing-library/jest-dom@6.6.3`, `supertest@7.0.0`, `@types/supertest@6.0.2`, `@playwright/test@1.50.1`, and `@axe-core/playwright@4.10.2`.
    - Pin type/lint packages exactly: `@types/node@22.13.4`, `@types/express@4.17.21`, `@types/react@18.3.18`, `@types/react-dom@18.3.5`, `eslint@9.19.0`, `@eslint/js@9.19.0`, `typescript-eslint@8.22.0`, `eslint-plugin-react-hooks@5.1.0`, and `eslint-plugin-react-refresh@0.4.18`; record `npm@10.9.2` as the package manager and commit the generated lockfile.
    - _Requirements: 1.1, 1.2, 17.9_

  - [x] 1.3 Configure TypeScript, linting, Vite, Tailwind, Vitest, and workspace aliases
    - Enable strict compilation, isolated browser/server environments, deterministic test setup, CSS processing, and shared-package imports.
    - Configure all test commands for one-shot execution rather than watch mode, and keep client assets free of server-only environment imports.
    - _Requirements: 1.1, 1.2, 14.5, 14.6, 17.9_

  - [x] 1.4 Implement shared static contracts and Zod runtime schemas
    - Define the design's language, guidance, provenance, provider, freshness, situation, checklist, agency, citation, chat-response, API-error, and local-state discriminated unions.
    - Add boundary parsers that reject unknown fields and illegal status combinations instead of trusting compile-time types.
    - _Requirements: 4.1–4.3, 6.1–6.2, 8.1, 9.1, 10.4–10.5, 14.2–14.3_

  - [x] 1.5 Implement deterministic version and test-control primitives
    - Add injectable clock, fixture version, corpus version, checklist rule version, provider configuration, and seeded property-test controls in shared test support.
    - Validate version constants and fail startup on malformed or negative configuration.
    - _Requirements: 5.3–5.5, 7.1–7.2, 8.1, 17.3, 17.8_

- [x] 2. Build the bilingual, accessible mobile safety shell
  - [x] 2.1 Create matching BM and English resource catalogs
    - Define identical application keys and safety-message categories for navigation, guidance, checklist, directory, chat, errors, privacy, limitations, freshness, and demo labels.
    - Return a localized missing-content notice rather than cross-falling back when a selected-language key is absent.
    - _Requirements: 3.1–3.6, 17.7_

  - [x] 2.2 Implement `LanguageProvider` and linked-language content selection
    - Set `<html lang>` to `ms` or `en`, switch visible content without mutating feature state, and preserve conceptual record identity across equivalent localized records.
    - Expose language selection on every primary feature screen.
    - _Requirements: 3.1–3.5, 10.9_

  - [x] 2.3 Implement the responsive `AppShell` and primary navigation
    - Create the skip link, landmarks, persistent emergency action, `Demo Mode / Mod Demo` indicator, feature navigation, focus styling, live regions, and route-level error boundaries.
    - Support 320–1440 CSS pixels, one-activation mobile access, orientation-state preservation, 200% zoom reflow, 44px targets, reduced motion, and persistent emergency access during loading.
    - _Requirements: 2.1–2.4, 15.1–15.10, 18.5_

  - [x] 2.4 Implement privacy, limitations, and scope-limitation views
    - List storage fields, retention, clear-data behavior, enabled integrations, unavailable live integrations, status definitions, emergency limitations, and every explicitly excluded feature.
    - Classify BM/English requests for rescue dispatch, reports, payments, accounts, routes, forecasts, or safety guarantees and render the applicable unavailable state.
    - _Requirements: 1.5–1.6, 10.10, 13.10, 18.6_

  - [x] 2.5 Add safe client operation-state and error components
    - Preserve loaded and persisted values on failures, expose one retry or safe-return action, and announce ordinary updates politely and errors assertively.
    - Keep the bundled emergency action outside feature loading and error boundaries.
    - _Requirements: 2.4–2.5, 15.3–15.5, 18.2_

  - [x]* 2.6 Write the property test for out-of-scope request handling
    - **Property 1: Out-of-scope requests fail closed**
    - Generate recognized BM/English scope requests and assert the limitation is shown without exposing the capability.
    - **Validates: Requirements 1.6**

  - [x]* 2.7 Write the property test for presentational state preservation
    - **Property 2: Presentational transitions preserve user state**
    - Generate valid client states and assert orientation/language changes preserve feature, profile, completion, and draft state.
    - **Validates: Requirements 2.3, 3.2**

  - [x]* 2.8 Write the property test for missing-translation behavior
    - **Property 4: Missing translations never cross-fallback**
    - Generate absent keys in either language and assert the selected-language missing notice is returned.
    - **Validates: Requirements 3.5**

  - [x]* 2.9 Write the property test for bilingual resource parity
    - **Property 5: Bilingual resource parity**
    - Generate/admit resource versions and compare complete key and safety-category sets.
    - **Validates: Requirements 3.6, 17.7**

  - [x]* 2.10 Write responsive shell and localization component tests
    - Verify language metadata, screen-level switchers, keyboard navigation, focus indicators, live regions, mobile feature access, demo-mode persistence, and safe failure actions.
    - _Requirements: 2.1–2.5, 3.1–3.4, 15.2–15.5, 18.5_

- [~] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add versioned guidance, situation data, demo providers, and freshness behavior
  - [x] 4.1 Create normalized source, guidance, and situation fixtures
    - Add versioned BM/English guidance plus separately typed rainfall, river-reading, and official-warning demo fixtures with stable IDs, timestamps, sources, status, and complete provenance.
    - Preserve `Demo_Guidance` unless all named-review metadata is complete; label every operational fixture `Demo_Data` and never infer review from an official-domain URL.
    - _Requirements: 4.1–4.3, 4.6, 7.1–7.4, 16.2, 18.7_

  - [x] 4.2 Implement guidance normalization and `GuidanceCatalogue`
    - Normalize incomplete review metadata to `Demo_Guidance`; render status, source, version, non-endorsement text, and review details when valid.
    - Place bilingual demo labels immediately adjacent to guidance with no intervening actionable content and render fixture text as text nodes.
    - _Requirements: 4.1–4.7, 14.1, 16.2_

  - [x] 4.3 Implement provider interfaces and deterministic demo providers
    - Implement immutable, fixed-clock-capable providers for guidance and all three situation channels using an identified fixture version.
    - Guarantee baseline requests use no outbound network path and retain stable record order and identity.
    - _Requirements: 7.1–7.5, 16.2, 17.3, 17.8_

  - [x] 4.4 Implement `DataFreshnessController`
    - Classify zero-through-maximum ages as current and older, absent, invalid, or future timestamps as stale.
    - Apply `warn_and_use`, `switch_to_demo`, and `mark_unavailable` with defaults of 30 minutes, 30 days, and 180 days for alert-like, agency, and guidance data.
    - _Requirements: 8.1–8.8_

  - [x] 4.5 Implement situation presentation without derived warnings
    - Render rainfall observations, river readings, and authority warnings in separate semantic components with provider, freshness, source, and adjacent demo/not-current labels.
    - Make the type and rendering APIs unable to convert observations into official warnings or prediction/safety language.
    - _Requirements: 7.3–7.4, 12.2, 18.1, 18.7_

  - [ ]* 4.6 Write the property test for guidance-status normalization
    - **Property 6: Guidance status is total and exclusive**
    - Generate review-metadata combinations and assert exactly one status with reviewed status only for complete metadata.
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 4.7 Write the property test for guidance provenance transformations
    - **Property 7: Guidance provenance survives transformations**
    - Generate records through search, checklist, retrieval, and language-link operations and compare identity/version/source/status.
    - **Validates: Requirements 4.6**

  - [ ]* 4.8 Write the property test for deterministic demo providers
    - **Property 16: Demo providers are deterministic and always demo-classified**
    - Repeat generated provider calls under fixed input/version/clock and assert deep equality and `Demo_Data` classification.
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 4.9 Write the property test for freshness configuration
    - **Property 18: Freshness configuration is complete and unambiguous**
    - Generate valid and invalid policies and assert one non-negative age and one supported behavior per category.
    - **Validates: Requirements 8.1**

  - [ ]* 4.10 Write the property test for freshness boundaries
    - **Property 19: Freshness classification honors all boundaries**
    - Generate clocks, maximum ages, and timestamps including missing, invalid, future, exact-boundary, and over-boundary values.
    - **Validates: Requirements 8.2, 8.3, 8.4, 17.6**

  - [ ]* 4.11 Write the property test for stale-policy outcomes
    - **Property 20: Stale-data policy is total**
    - Generate stale records and assert each behavior returns exactly its designed record, labels, timestamps, reason, or unavailable state.
    - **Validates: Requirements 8.5, 8.6, 8.7**

  - [ ]* 4.12 Write the property test for situation-channel separation
    - **Property 42: Observations cannot become official warnings**
    - Generate all situation variants and presentation/composition operations and assert observation kinds never become warnings or predictions.
    - **Validates: Requirements 7.3, 12.2**

  - [ ]* 4.13 Write guidance, freshness, and situation integration tests
    - Verify adjacent labels, reviewed metadata, non-endorsement copy, stale displays, unavailable states, and semantic separation of the three situation channels.
    - _Requirements: 4.4–4.7, 7.4, 8.5–8.8, 18.1, 18.7_

- [ ] 5. Implement household profiling, deterministic checklists, persistence, restoration, and print
  - [x] 5.1 Implement the exact six-field `Checklist_Profile` form
    - Accept only household size, children, elderly members, mobility assistance, pets, and transport availability with accessible labels, states, instructions, and errors.
    - Keep draft values client-side, optional, and independent of field insertion order; omit identity, diagnoses, exact address, and medication data.
    - _Requirements: 5.1, 5.9, 13.1–13.3, 15.5_

  - [x] 5.2 Implement versioned deterministic checklist rules and explanations
    - Generate the baseline for an empty profile, evaluate rules in stable priority/ID order, de-duplicate stable item IDs, and preserve wording keys, source references, statuses, and rule version.
    - Add selected-language, source-linked explanations for why conditional items were included without adding profile fields or transmitting the profile.
    - _Requirements: 5.2–5.5, 16.3_

  - [x] 5.3 Implement stable checklist reconciliation
    - Partition the union of previous and regenerated IDs into added, retained, and removed exactly once.
    - Order added/retained by regenerated order and removed by previous order, and announce changes through the polite live region.
    - _Requirements: 5.6, 15.3_

  - [x] 5.4 Implement the privacy-gated `StorageAdapter`
    - Store one versioned, namespaced envelope containing only language, six profile fields, rule version, stable item completions, and acknowledged notices.
    - Show the shared-browser notice before the first save and fall back to in-memory state with a persistence-unavailable notice on access/write failure.
    - _Requirements: 5.7, 13.2–13.4, 13.9_

  - [x] 5.5 Implement restoration, version recovery, and clear-data behavior
    - Restore supported profiles/completions after reload; regenerate on unknown rule versions/item IDs and show a version-change notice.
    - Confirm before removing every BanjirReady-prefixed key, preserve unrelated keys, and restore unsaved defaults.
    - _Requirements: 5.8, 13.5, 16.8–16.9_

  - [-] 5.6 Implement `PrintablePlan` and print styles
    - Project emergency guidance, checklist/completion state, selected contacts, provenance, freshness, demo labels, generation time, and limitations into semantic one-dimensional print output.
    - Hide navigation/forms/chat, retain readable contact/link text and checklist outlines, prevent item splitting, and never save or transmit a print snapshot.
    - _Requirements: 1.4, 4.4–4.7, 6.4–6.6, 13.2–13.3, 15.1, 15.8, 15.10_

  - [ ]* 5.7 Write the property test for the profile schema
    - **Property 8: Checklist profiles have an exact schema**
    - Generate valid/adversarial objects and assert only the six documented fields and values are accepted.
    - **Validates: Requirements 5.1, 5.9**

  - [ ]* 5.8 Write the property test for empty-profile baselines
    - **Property 9: Empty profiles yield the versioned baseline**
    - Generate supported rule sets and compare empty-profile output to each ordered baseline list.
    - **Validates: Requirements 5.2**

  - [ ]* 5.9 Write the property test for checklist determinism
    - **Property 10: Checklist generation is deterministic and order-invariant**
    - Generate profiles/rule versions and field-order permutations and compare full output metadata and ordering.
    - **Validates: Requirements 5.3, 5.4, 5.5, 16.3, 17.4**

  - [ ]* 5.10 Write the property test for checklist reconciliation
    - **Property 11: Checklist reconciliation is a stable partition**
    - Generate previous/next lists and assert exclusive union coverage plus required ordering.
    - **Validates: Requirements 5.6**

  - [ ]* 5.11 Write the property test for checklist persistence
    - **Property 12: Checklist completion round-trips**
    - Generate supported stable IDs, booleans, and rule versions and assert save/load equality.
    - **Validates: Requirements 5.7**

  - [ ]* 5.12 Write the property test for unsupported saved state
    - **Property 13: Unsupported saved checklists recover deterministically**
    - Generate unknown rules/items and assert current-rule regeneration plus the version-change notice.
    - **Validates: Requirements 5.8**

  - [ ]* 5.13 Write the property test for persistence allowlisting
    - **Property 37: Persistence uses the exact allowlist**
    - Seed sensitive/adversarial fields and assert serialization excludes them while retaining every allowed field.
    - **Validates: Requirements 13.2, 13.3**

  - [ ]* 5.14 Write the property test for namespaced clear-data
    - **Property 38: Clear-data is complete and namespaced**
    - Generate prefixed/unrelated browser key maps and assert only every BanjirReady key is removed.
    - **Validates: Requirements 13.5**

  - [ ]* 5.15 Write checklist, storage, reload, and print component tests
    - Cover empty/custom profiles, explanations, delta announcements, privacy gating, storage exceptions, recovery, reload, clear-data, and print projection exclusions.
    - _Requirements: 5.1–5.9, 13.3–13.5, 13.9, 16.3, 16.8–16.9_

- [~] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement the agency directory and hardened server/provider boundary
  - [x] 7.1 Create and validate bilingual agency fixtures
    - Add stable linked BM/English records with role, state/district, optional contact, source, last-updated timestamp, fixture version, status, review metadata, and demo provenance.
    - Keep unverified contacts/review data explicitly demo-labelled; never synthesize missing contact values.
    - _Requirements: 6.1–6.2, 6.5–6.7, 16.4_

  - [x] 7.2 Implement deterministic agency search
    - Normalize selected-language queries across name, role, state, and district.
    - Sort by exact match, prefix match, remaining match, localized agency name, and stable record ID.
    - _Requirements: 6.3_

  - [-] 7.3 Implement the accessible `AgencyDirectory`
    - Render provenance/freshness/status, adjacent demo labels, source links, and localized contact-unavailable states.
    - Derive complete phone text and keyboard-accessible `tel:` target from the same validated field.
    - _Requirements: 6.4–6.7, 14.1, 15.2, 18.1_

  - [ ]* 7.4 Write the property test for normalized agency identity
    - **Property 14: Agency records satisfy bilingual normalized identity**
    - Generate/admit fixtures and assert linked stable identity and all required normalized fields or rejection.
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 7.5 Write the property test for agency ranking
    - **Property 15: Agency search follows the complete rank tuple**
    - Generate records/queries and compare results to the exact five-part ordering tuple.
    - **Validates: Requirements 6.3**

  - [ ]* 7.6 Write agency-directory component and fixture tests
    - Cover phone equality, keyboard action, missing contact, query dimensions, provenance/freshness, and adjacent demo/review labels.
    - _Requirements: 6.1–6.7, 15.2, 16.4_

  - [x] 7.7 Implement the Express `HttpBoundary`
    - Create the explicit `/api/v1` method/path table, strict query/body/content-type validation, safe request IDs, localized error keys, and final error middleware.
    - Enforce the 4,096 UTF-8-byte chatbot limit and prevent application handlers from running after validation failure.
    - _Requirements: 14.2–14.4, 14.7_

  - [x] 7.8 Implement provider registry, fallback selection, and disabled optional adapters
    - Require explicit approval, verified permission, schema version, server secret, availability, and feature enablement before selecting any live agency or external-model adapter.
    - Provide disabled-by-default agency/model adapter descriptors and deterministic fallbacks; do not implement or call unverified external endpoints.
    - _Requirements: 7.6, 9.1–9.4, 9.7–9.8, 16.10_

  - [x] 7.9 Implement server security, transport, timeout, and redacted logging controls
    - Send CSP, `nosniff`, restrictive referrer policy, and frame denial; enforce encrypted transport outside localhost with explicit trusted-proxy configuration.
    - Bound optional providers to 3,000 ms, validate response type/shape, and log only request ID, route, status, duration, safe error code, and provider name/mode.
    - _Requirements: 9.6, 13.6–13.8, 14.5–14.9, 18.3–18.4_

  - [x] 7.10 Implement public provider status and resilient client fallback
    - Project only the approved non-secret provider fields and error code to the client.
    - Retain already-loaded emergency guidance and durable client state when the server/provider fails, with explicit unavailable/fallback/freshness UI and retry.
    - _Requirements: 2.5, 9.1, 9.5, 18.1–18.4_

  - [ ]* 7.11 Write the property test for operation-failure state
    - **Property 3: Failed operations preserve durable state**
    - Generate saved states and operation failures and assert unchanged durable values plus retry/safe return.
    - **Validates: Requirements 2.5**

  - [ ]* 7.12 Write the property test for provider fallback access
    - **Property 17: Optional-provider failure preserves fallback access**
    - Generate adapter failures/policies and assert the documented baseline fallback remains available.
    - **Validates: Requirements 7.6, 9.4**

  - [ ]* 7.13 Write the property test for unverified integration gating
    - **Property 21: Unverified integrations are unavailable**
    - Generate missing approval/schema/credential/permission combinations and assert unavailable status plus fallback.
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [ ]* 7.14 Write the property test for public provider status
    - **Property 22: Browser provider status is an exact projection**
    - Generate internal descriptors and assert every/only allowed public field is present.
    - **Validates: Requirements 9.1, 9.5**

  - [ ]* 7.15 Write the property test for diagnostic redaction
    - **Property 23: Unsafe diagnostic values are never projected**
    - Seed credentials, authorization, chat/personal text, stacks, paths, and provider bodies and assert marker absence in logs/errors.
    - **Validates: Requirements 9.6, 13.7, 14.7**

  - [ ]* 7.16 Write the property test for live normalization provenance
    - **Property 24: Live normalization preserves identity and provenance**
    - Generate valid verified live records through mock adapters and compare required identities/timestamps/classification.
    - **Validates: Requirements 9.7**

  - [ ]* 7.17 Write the property test for shared answer-mode safety
    - **Property 25: Every answer mode has identical safety invariants**
    - Generate deterministic/external candidates through the same validators and compare enforced invariant outcomes.
    - **Validates: Requirements 9.8**

  - [ ]* 7.18 Write the property test for provider timeout and malformed responses
    - **Property 41: Provider timeout and invalid payloads fail closed**
    - Generate timing, network, content-type, body, field, type, and value failures and assert stale-policy routing.
    - **Validates: Requirements 18.3, 18.4**

  - [ ]* 7.19 Write the property test for strict HTTP validation
    - **Property 39: Request validation is strict and byte-correct**
    - Generate method/path/content-type/body/value/Unicode-size combinations and assert only exact requests at most 4,096 bytes reach handlers.
    - **Validates: Requirements 14.2, 14.3, 14.4**

  - [ ]* 7.20 Write HTTP, security-header, transport, timeout, and logging tests
    - Use Supertest/fake timers to verify explicit routes, localized safe errors, header values, TLS modes, body disposal, no sensitive logs, and fallback behavior.
    - _Requirements: 9.5–9.6, 13.6–13.8, 14.2–14.9, 18.2–18.4_

- [ ] 8. Implement the curated corpus and deterministic grounded retrieval
  - [x] 8.1 Create the versioned bilingual approved knowledge corpus
    - Add linked BM/English conceptual record IDs, bounded excerpts, normalized terms, sources, dates, versions, and preserved guidance/demo statuses.
    - Validate every record at build time and keep demo guidance labelled until complete named review metadata exists.
    - _Requirements: 4.6, 10.1, 10.4, 10.7, 10.9_

  - [ ] 8.2 Implement deterministic lexical `RetrievalEngine`
    - Normalize Unicode/case/punctuation/tokens, search only the selected language and corpus version, apply explicit deterministic weights/threshold, and return zero to five hits.
    - Sort by score descending, source date descending, then stable ID ascending under the injected clock/configuration.
    - _Requirements: 10.1–10.3, 17.3_

  - [~] 8.3 Implement deterministic answer composition and citation resolution
    - Compose structured claims only from retrieved records and versioned bilingual templates, identify deterministic mode, and attach resolvable exact-version/language citations.
    - Return insufficient-evidence fallback when retrieval has no support; implement citation detail lookup with required source/status/excerpt fields.
    - _Requirements: 10.4–10.8_

  - [~] 8.4 Implement citation source-detail UI
    - Open an accessible in-app detail panel that displays title, organization, date, status, corpus record ID, excerpt, and safe outbound source link.
    - Keep answer mode, citations, limitations, freshness, and demo labels visible as text rather than color alone.
    - _Requirements: 10.4–10.7, 12.4–12.5, 15.10_

  - [ ]* 8.5 Write the property test for retrieval scope and ordering
    - **Property 26: Retrieval is scoped, bounded, ordered, and deterministic**
    - Generate mixed corpora/questions/configs/clocks and assert language/version scope, zero-to-five bound, sort tuple, and repeatability.
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [ ]* 8.6 Write the property test for answer mode identity
    - **Property 27: Answers identify exactly one composition mode**
    - Generate valid responses and assert exactly deterministic or one named external adapter mode.
    - **Validates: Requirements 10.5**

  - [ ]* 8.7 Write the property test for insufficient evidence
    - **Property 29: Insufficient evidence suppresses requested claims**
    - Generate below-threshold/no-evidence questions and assert no requested actionable claim plus fallback.
    - **Validates: Requirements 10.6**

  - [ ]* 8.8 Write the property test for credential-free derivation
    - **Property 30: Credential-free answers use only retrieved records and templates**
    - Generate retrieval sets/template versions and prove every emitted claim/citation is derivable from them.
    - **Validates: Requirements 10.8**

  - [ ]* 8.9 Write the property test for bilingual citation identity
    - **Property 31: Bilingual equivalents preserve conceptual citation identity**
    - Generate linked record pairs and assert language switching selects localized content while retaining conceptual citation identity.
    - **Validates: Requirements 10.9**

  - [ ]* 8.10 Write corpus, retrieval, composition, and citation UI tests
    - Cover selected-language/version filtering, tie ordering, supported/unsupported questions, answer mode, citation details, safe links, and preserved review labels.
    - _Requirements: 10.1–10.10, 14.1, 16.5–16.6_

- [~] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Complete emergency-first chat safety and wire the credential-free application
  - [~] 10.1 Create the versioned BM/English emergency phrase corpus
    - Add expected emergency, ambiguous, and non-emergency cases with punctuation, case, spacing, contextual, and negation variants.
    - Keep phrase classifications deterministic and validation-testable.
    - _Requirements: 11.7–11.8, 17.3_

  - [~] 10.2 Implement client/server `EmergencySafetyGuard` and escalation UI
    - Run the guard before client chat submission and again on the server; bypass ordinary generation for emergency/ambiguous results.
    - Render/focus escalation before conversation, with bilingual water-safety instructions, validated-or-demo Call 999 `tel:` action, no-dispatch statement, and optional brief clarification only after escalation.
    - _Requirements: 11.1–11.8, 15.4, 16.7_

  - [~] 10.3 Implement `MisinformationSafetyGuard` and response-contract validator
    - Resolve every actionable claim citation against exact corpus version/language; block safety guarantees, forecasts, fabricated contacts, bypass text, unresolved support, and unsupported conflict resolution.
    - Propagate stale/demo labels to dependent claims and produce structured fallback or explicit cited conflict when no safe answer remains.
    - _Requirements: 9.8, 12.1–12.7_

  - [~] 10.4 Implement the complete server chat pipeline
    - Sequence strict validation, emergency recheck, selected-language retrieval, deterministic composition, misinformation validation, and final contract validation.
    - Discard message text after response/abort, never log it, and keep external model synthesis unavailable unless explicitly verified later.
    - _Requirements: 9.3–9.4, 10.1–10.10, 11.1–11.8, 12.1–12.7, 13.6–13.7_

  - [~] 10.5 Implement the accessible `ChatFeature`
    - Keep draft/message state in memory only, preserve unsubmitted draft on orientation/language changes, and render only validated answer/fallback/emergency variants.
    - Present citations, answer mode, labels, limitations, focus changes, and polite/assertive announcements without arbitrary HTML.
    - _Requirements: 2.3, 3.2, 10.4–10.10, 11.1–11.6, 13.3, 14.1, 15.2–15.5_

  - [~] 10.6 Wire all `/api/v1` routes and static production serving
    - Implement bootstrap, agencies, situation, chat, citation-source, and provider-status routes using the same contracts/providers and selected language.
    - Serve built Vite assets from Express in demo mode and retain bundled client emergency/checklist capability when the API is unavailable.
    - _Requirements: 1.4, 6.7, 7.1, 9.5, 10.1, 16.1–16.10, 18.2_

  - [ ]* 10.7 Write the property test for actionable citation integrity
    - **Property 28: Actionable claims have resolvable citation support**
    - Generate answer graphs with valid/dangling/wrong-version/wrong-language citations and assert acceptance or dependent-claim fallback.
    - **Validates: Requirements 10.4, 12.1, 12.7, 17.5**

  - [ ]* 10.8 Write the property test for emergency response contracts
    - **Property 32: Emergency classification drives a constrained response contract**
    - Generate corpus entries/perturbations and assert expected classification plus escalation-before-answer/clarification ordering.
    - **Validates: Requirements 11.7, 11.8**

  - [ ]* 10.9 Write the property test for unsafe-claim suppression
    - **Property 33: Unsafe certainty and fabricated claims are suppressed**
    - Generate safety, forecast, invented-contact, and unsupported candidates and assert removal plus fallback.
    - **Validates: Requirements 12.2**

  - [ ]* 10.10 Write the property test for policy-bypass resistance
    - **Property 34: Policy-bypass text cannot weaken constraints**
    - Generate bypass instructions in user/retrieved text and assert unchanged safety configuration and excluded instruction text.
    - **Validates: Requirements 12.3**

  - [ ]* 10.11 Write the property test for source-risk label propagation
    - **Property 35: Source risk labels propagate to dependent claims**
    - Generate claim/citation graphs and assert complete stale timestamps and demo-data/demo-guidance labels.
    - **Validates: Requirements 12.4, 12.5**

  - [ ]* 10.12 Write the property test for unresolved source conflicts
    - **Property 36: Conflicting sources remain explicit and unresolved**
    - Generate conflicting propositions and assert explicit conflict, all citations, and no invented resolution.
    - **Validates: Requirements 12.6**

  - [ ]* 10.13 Write emergency and chatbot component tests
    - Verify DOM/focus order, Call 999 text/target, bilingual safety copy, fixture validation label, draft privacy, fallback rendering, citation UI, and live-region priority.
    - _Requirements: 10.4–10.10, 11.1–11.8, 12.1–12.7, 15.2–15.5_

  - [ ]* 10.14 Write complete API integration tests
    - Exercise bootstrap/directory/situation/source/status/chat response schemas and verify supported, unsupported, emergency, ambiguous, invalid, stale, and provider-failure paths.
    - Assert external credential absence activates deterministic fallbacks rather than baseline failure.
    - _Requirements: 7.6, 9.4–9.6, 10.1–10.8, 11.1–11.8, 16.5–16.7, 16.10_

  - [ ]* 10.15 Write the offline credential-free integration smoke test
    - Start the in-process app with credentials unset and intercept/block non-localhost requests while navigating all primary capabilities.
    - Assert no credential prompt, no outbound request, persistent demo mode, and retained emergency guidance during injected server failure.
    - _Requirements: 7.5, 13.8, 16.1–16.10, 18.2, 18.5_

- [ ] 11. Add acceptance hardening, traceability, repository guidance, and demo operations
  - [~] 11.1 Implement the acceptance-criteria traceability manifest and validator
    - Map every criterion from 1.1 through 18.7 to test ID, requirement ID, execution type, and latest result.
    - Mark agency approval, contact/content/translation review, external credentials, production hosting/TLS, threat assessment, and endorsement as external-validation dependencies until evidence exists.
    - _Requirements: 17.1–17.3, 17.10_

  - [ ]* 11.2 Write the property test for traceability completeness
    - **Property 40: Acceptance traceability is complete and honest**
    - Generate/parse authoritative criterion IDs and assert exactly mapped metadata plus honest external-dependency classifications.
    - **Validates: Requirements 17.1, 17.2, 17.10**

  - [ ]* 11.3 Add automated accessibility and responsive checks
    - Run component/browser accessibility rules and keyboard checks for guidance, checklist, directory, and chat; verify names/roles/states/errors/live regions and non-color status text.
    - Check 320/767/768/1440 widths, 320 at 200% zoom, orientation, 44px targets, contrast tokens, reduced motion, and one-dimensional print/reflow.
    - _Requirements: 2.1–2.4, 15.1–15.10, 17.9_

  - [ ]* 11.4 Implement the full offline Playwright demo-acceptance suite
    - Automate both-language guidance, deterministic checklist/reload/clear/print, agency search, separate situation channels, supported/unsupported chat, BM/English emergencies, and failure fallbacks.
    - Block non-localhost traffic and assert provenance, freshness, review/demo labels, not-current warnings, exact citations, and no baseline credential dependency.
    - _Requirements: 16.1–16.10, 17.8–17.9, 18.1–18.7_

  - [~] 11.5 Add non-watch quality and production-build gates
    - Wire strict type checks, ESLint, fixture/schema/resource parity validation, all Vitest/Supertest suites, Playwright acceptance, Vite production build, server build, and browser-bundle secret-marker scan.
    - Ensure property tests run at least 100 cases, record seed/counterexample on failure, and use the required `Feature: banjir-ready-mvp, Property N: ...` comment.
    - _Requirements: 3.6, 14.6, 17.3–17.9_

  - [x] 11.6 Create Kiro steering documents for implementation safeguards
    - Add `.kiro/steering` guidance for emergency-first safety/content, data governance/versioning/review labels, optional integration approval, privacy/security/logging, accessibility, and credential-free demo operations.
    - Encode that observations cannot derive warnings, actionable claims need citations, demo/stale labels stay adjacent, and optional adapters cannot block baseline behavior.
    - _Requirements: 4.4–4.7, 7.4–7.6, 9.2–9.8, 12.1–12.7, 13.2–13.8, 15.1–15.10, 18.1–18.7_

  - [~] 11.7 Add repository configuration and operator documentation
    - Create `.gitignore` and `.env.example` with optional server-only placeholders disabled by default and no real secrets; document exact install/build/test/local-demo commands in `README.md`.
    - Add data-source/reviewer/translation validation register, portal-vs-API distinctions, privacy/security behavior, complete limitations/out-of-scope list, and the deterministic hackathon demo script with fixture/corpus/rule versions and external-validation warnings.
    - _Requirements: 1.5–1.6, 4.7, 6.5–6.7, 9.2–9.6, 10.10, 13.8–13.10, 16.1–16.10, 17.10, 18.5–18.7_

  - [ ]* 11.8 Verify the production artifact and complete demo command
    - Run clean install, type-check, lint, unit/property/integration/accessibility tests, production builds, bundle scan, and offline acceptance using one-shot commands.
    - Smoke-test the built SPA served by Express with credentials absent and record failures without claiming external-validation dependencies are verified.
    - _Requirements: 16.1–16.10, 17.1–17.10_

- [~] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each correctness property has its own optional `fast-check` task close to the implementation it validates.
- Optional test tasks grouped in the same dependency wave are independent and may run in parallel, provided each writes to its own test file.
- The baseline is complete only when every non-optional task works with credentials unset and outbound traffic unavailable.
- The disabled agency/model adapter descriptors are baseline safety boundaries, not live integrations. Implementing or enabling a real adapter requires verified permission, schema, credentials, retention terms, identity behavior, and fallback policy in a later spec update.
- `Reviewed_Guidance` must never be inferred from a source URL. Incomplete reviewer metadata remains `Demo_Guidance`; operational fixtures remain `Demo_Data`, with required bilingual labels preserved through every transformation and UI.
- Documentation tasks are included because repository safety steering, source/validation records, and the hackathon demo script are explicit deliverables for this spec.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "11.6"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.3"] },
    { "id": 3, "tasks": ["1.5", "2.2", "2.4", "4.1", "5.1", "7.7"] },
    { "id": 4, "tasks": ["2.5", "4.2", "4.3", "4.4", "5.2", "5.4", "7.1", "7.8", "7.9"] },
    { "id": 5, "tasks": ["2.6", "2.7", "2.8", "2.9", "4.5", "5.3", "5.5", "7.2", "7.10", "8.1"] },
    { "id": 6, "tasks": ["2.10", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11", "4.12", "4.13", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "5.13", "5.14", "7.3", "8.2"] },
    { "id": 7, "tasks": ["5.15", "7.4", "7.5", "7.11", "7.12", "7.13", "7.14", "7.15", "7.16", "7.17", "7.18", "7.19", "8.3"] },
    { "id": 8, "tasks": ["7.6", "7.20", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "10.1", "10.3"] },
    { "id": 9, "tasks": ["8.10", "10.2", "10.4"] },
    { "id": 10, "tasks": ["10.5", "10.6", "10.7", "10.8", "10.9", "10.10", "10.11", "10.12"] },
    { "id": 11, "tasks": ["10.13", "10.14", "10.15"] },
    { "id": 12, "tasks": ["11.1", "11.3", "11.4", "11.7"] },
    { "id": 13, "tasks": ["11.2", "11.5"] },
    { "id": 14, "tasks": ["11.8"] }
  ]
}
```
