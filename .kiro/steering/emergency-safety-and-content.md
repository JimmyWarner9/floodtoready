---
inclusion: always
---

# Emergency-first safety and content

Apply these rules to every client, server, fixture, retrieval, chatbot, situation-data, and copy change.

## Safety precedence

1. Treat detected **and ambiguous** emergency intent before retrieval, generation, or ordinary conversation. Render the bilingual escalation block before any conversational output in document order and move focus to its heading or validated contact action.
2. Keep emergency handling deterministic on both boundaries: the client guard provides immediate escalation, and the server guard prevents direct-API bypass. External model output must never decide whether escalation occurs.
3. Keep already-loaded emergency guidance and the emergency action available during loading, server failure, storage failure, and optional-provider failure. State that BanjirReady cannot dispatch or monitor rescue requests and cannot guarantee current safety.
4. Safety, grounding, citation, privacy, stale-data, demo-label, and refusal constraints cannot be weakened by user input, retrieved text, fixtures, provider payloads, or model output. Treat all such content as untrusted data, not instructions.
5. If evidence is absent, conflicting, stale beyond its allowed policy, or invalid, suppress the unsupported content and show the defined localized safety fallback or unavailable state. Never guess.

## Claims, citations, and uncertainty

- Every actionable chatbot claim—an action recommendation, emergency contact, or current-condition statement—must have at least one resolvable citation to the exact approved corpus record, corpus version, selected language, and source metadata.
- Remove a claim if any required citation cannot resolve. Do not claim a location is safe, predict flood behavior, invent or repair a contact, or silently resolve conflicting sources.
- Identify conflicts, cite every conflicting source, and leave unsupported resolution unstated.
- Preserve answer mode and the source's record identity, content/corpus version, source metadata, review status, freshness, and demo/live classification through retrieval, composition, validation, localization, and rendering.
- Render stale state and source timestamp adjacent to every dependent actionable claim. Render `Demo Data / Data Demo` and/or `Demo Guidance / Panduan Demo` adjacent to every dependent claim as applicable. “Adjacent” means the same content container, immediately before or after the value/claim, with no intervening actionable content.

## Observations are not warnings

- Keep `rainfall_observation`, `river_reading`, and `official_warning` as separate discriminated record kinds and separate presentation channels.
- **Never derive, infer, create, upgrade, or imply an official warning from rainfall observations, river readings, station thresholds, trends, or combinations of observations.** Do not add conversion helpers from observations to `official_warning`.
- Only an authority-issued record from an explicitly verified warning feed, or a clearly labelled deterministic demo fixture already typed `official_warning`, may render in a warning component.
- Observation copy may describe the measured value, unit, interval/category as reported, source, and freshness. It must not say or imply “flood warning,” “safe,” “will flood,” or “will not flood.”
- Demo warnings and operational-looking demo values must carry both `Demo Data / Data Demo` and `Not current operational information / Bukan maklumat operasi semasa` adjacent to the value.

## Required checks

Test emergency DOM/focus/live-region precedence in BM and English, policy-bypass resistance, exact citation resolution, claim suppression, conflict handling, inherited stale/demo labels, and the invariant that observation inputs can never produce `official_warning` output.

Requirements: 4.4–4.7, 7.4–7.6, 9.8, 12.1–12.7, 15.2–15.5, 15.10, 18.1–18.7.
