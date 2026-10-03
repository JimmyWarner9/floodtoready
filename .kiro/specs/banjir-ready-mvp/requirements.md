# Requirements Document

## Introduction

BanjirReady MVP is a mobile-first Malaysian flood-preparedness web application for a hackathon demonstration. The MVP gives residents bilingual Bahasa Melayu (BM) and English preparedness guidance, deterministic personalized checklists, an agency directory, and a grounded retrieval-augmented generation (RAG) chatbot. The complete baseline demo operates without external credentials or network access by using bundled guidance, deterministic demo providers, and local browser storage.

The MVP provides preparedness information and official contact references. The MVP does not provide emergency rescue dispatch, real-time operational guarantees, professional advice, or official government endorsement.

## Scope and Priorities

### In Scope

1. Mobile-first flood-preparedness experience for Malaysia.
2. BM and English interface and content parity.
3. Deterministic checklist personalization based on optional household profile inputs.
4. Searchable Malaysian agency directory with provenance and freshness labels.
5. Grounded chatbot answers derived only from an approved local knowledge corpus.
6. Strict emergency escalation, misinformation controls, and visible limitations.
7. Credential-free hackathon demo using deterministic bundled data.
8. Optional live agency and external model adapters that cannot reduce baseline demo capability.
9. Browser-local profile and checklist persistence through `localStorage`.
10. Testable accessibility, privacy, security, and safety behavior.

### Explicitly Out of Scope

1. User accounts, authentication, and cross-device profile synchronization.
2. Payments, donations, subscriptions, and financial transactions.
3. Rescue requests, rescue dispatch, incident command, and emergency service case tracking.
4. User-submitted reports, crowdsourcing, social feeds, and community moderation.
5. Evacuation route calculation, navigation, traffic-aware routing, and safe-route guarantees.
6. Flood forecasting, water-level prediction, and claims that a location is safe.
7. Background location tracking, precise-location storage, and push notifications.
8. Clinical, legal, engineering, or emergency-professional advice.

## Assumptions

1. No Malaysian agency API access has been verified, approved, or provisioned for the MVP.
2. No external language-model or embedding-model credentials have been verified or provisioned for the MVP.
3. The initial release uses bundled deterministic data for every judged demo path.
4. Initial guidance is classified as `Demo_Guidance` until a named reviewer with a documented role and organization or qualification supplies complete review metadata; inclusion of an official source link alone does not constitute review.
5. The project team will validate agency names, phone numbers, URLs, the Malaysian emergency number, and BM translations before any public deployment. The MVP may use clearly labelled demo fixtures before that validation.
6. The initial configurable stale-data defaults are 30 minutes for live alert-like data, 30 days for agency directory data, and 180 days for preparedness guidance.
7. Browser `localStorage` is acceptable for optional non-account demo preferences after the user receives a shared-device privacy warning.
8. Hackathon evaluators can run current stable versions of Node.js and a modern browser on a local machine.
9. The supplied feature request is the complete source of product scope for this initial requirements phase; no additional operational agency workflow is assumed.
10. Formal government endorsement, agency content review, production hosting approval, and production threat assessment remain unavailable unless separately documented.

## External Dependency and Fallback Register

| Capability | External dependency | Verification status | Credential-free baseline | Required user-visible state |
|---|---|---|---|---|
| Live agency alerts, advisories, or operational status | Approved Malaysian agency API, documented schema, usage permission, and network access | Unverified | Deterministic timestamped demo records | `Demo Data`, source name, and freshness state |
| Live agency directory synchronization | Approved Malaysian agency API or authorized directory feed | Unverified | Bundled reviewed-or-demo directory fixture | `Reviewed` or `Demo Guidance`, source, and last-updated time |
| Model-generated conversational synthesis | External model endpoint and valid model credentials | Unverified | Deterministic retrieval plus template-based grounded answer composition | Answer mode and citations |
| Remote semantic embeddings or reranking | External model endpoint and valid model credentials | Unverified | Deterministic local retrieval | Answer mode and citations |

No baseline capability depends on an unverified agency API, external model, remote embedding service, account provider, payment provider, dispatch system, crowdsourcing service, or route-planning service. Any future capability that introduces such a dependency requires an update to this register before implementation.

## Glossary

- **Accessibility_Interface**: User-interface behavior that supports perceivable, operable, understandable, and robust interaction.
- **Actionable_Claim**: A chatbot statement that recommends an action, reports an emergency contact, or describes current flood-related conditions.
- **Agency_Directory**: The BanjirReady component that presents Malaysian emergency and flood-preparedness agency contact records.
- **Agency_Record**: A directory entry containing an agency name, role, contact method, source, guidance status, and update timestamp.
- **Approved_Knowledge_Corpus**: Versioned BM and English flood-preparedness content admitted by the project team for chatbot retrieval.
- **BanjirReady_MVP**: The complete mobile-first flood-preparedness web application defined by this document.
- **BM**: Bahasa Melayu.
- **Chatbot**: The conversational BanjirReady component that answers flood-preparedness questions from the Approved_Knowledge_Corpus.
- **Checklist_Engine**: The component that creates and updates personalized preparedness checklists.
- **Checklist_Profile**: Optional non-account inputs consisting only of household size, presence of children, presence of elderly members, mobility assistance, presence of pets, and transport availability.
- **Citation**: A visible reference linking an answer claim to a specific Approved_Knowledge_Corpus record and source metadata.
- **Credential_Free_Mode**: Operation without agency credentials, external model credentials, or remote service credentials.
- **Data_Freshness_Controller**: The component that calculates freshness from source timestamps and applies the configured Stale_Data_Policy.
- **Demo_Acceptance_Suite**: The repeatable checks and scripted user journeys used to establish hackathon-demo readiness.
- **Demo_Data**: Bundled deterministic fixture data that does not represent a current official operational condition.
- **Demo_Environment**: A local Node.js and modern-browser environment with outbound network access disabled and external credential variables unset.
- **Demo_Guidance**: Content that has not received documented review by a named reviewer with a documented role and organization or qualification.
- **Demo_Provider**: A deterministic local source for guidance, directory, and alert-like fixture records.
- **Emergency_Query**: A BM or English message that indicates immediate danger, a life-threatening situation, trapped persons, rising water around persons, or a request for rescue.
- **Emergency_Safety_Guard**: The deterministic component that detects Emergency_Query patterns and presents emergency escalation before conversational output.
- **English**: The English language.
- **External_Model_Adapter**: An optional integration that calls an external language or embedding model.
- **Feature_Set**: The collection of user-visible capabilities included in the MVP.
- **Guidance_Catalog**: The component that stores and displays preparedness guidance.
- **Guidance_Record**: A versioned guidance item containing BM content, English content, source metadata, update timestamp, and Guidance_Status.
- **Guidance_Status**: Either `Reviewed_Guidance` or `Demo_Guidance`.
- **Integration_Adapter**: An optional boundary for an approved external agency or model service.
- **Language_Interface**: The component that selects and presents BM or English content.
- **Local_Data_Store**: Browser `localStorage` used for BanjirReady preferences, Checklist_Profile values, and checklist completion state.
- **Misinformation_Safety_Guard**: The component that blocks unsupported claims, fabricated citations, unsafe certainty, and policy-override attempts.
- **Model_Credential**: A secret required to access an external language model, embedding model, or reranking service.
- **Personal_Data**: Checklist_Profile values, language preference, checklist completion state, and chatbot message text.
- **Provider_Record**: A data record containing provider identity, source type, source timestamp, retrieval timestamp, and demo-or-live classification.
- **RAG**: Retrieval-augmented generation in which retrieved records constrain chatbot answers and supply citations.
- **Reviewed_Guidance**: Guidance with a named reviewer, reviewer organization or qualification, review date, content version, and source references.
- **Retrieval_Engine**: The deterministic component that selects relevant records from the Approved_Knowledge_Corpus.
- **Safety_Fallback_Response**: A constrained response that states the evidence limitation, avoids an unsupported answer, and directs the user to relevant official contacts or emergency escalation.
- **Stale_Data_Policy**: Per-source configuration containing a maximum age and one behavior: `warn_and_use`, `switch_to_demo`, or `mark_unavailable`.
- **Test_Suite**: Automated unit, property, integration, accessibility, and end-to-end checks for the MVP.
- **Web_Client**: The React and TypeScript browser application built with Vite and styled with Tailwind CSS.
- **Application_Server**: The Node.js and Express service that exposes local application endpoints and optional integration boundaries.
- **WCAG_2_2_AA**: Web Content Accessibility Guidelines version 2.2 conformance level AA.

## Requirements

### Requirement 1: MVP Technology and Scope Boundary

**User Story:** As a hackathon evaluator, I want a coherent implementation boundary, so that the MVP can be demonstrated and assessed consistently.

#### Acceptance Criteria

1. THE Web_Client SHALL use React, TypeScript, Vite, and Tailwind CSS.
2. THE Application_Server SHALL use Node.js and Express.
3. THE Local_Data_Store SHALL use browser `localStorage`.
4. THE Feature_Set SHALL provide preparedness guidance, personalized checklists, an agency directory, and a grounded chatbot.
5. THE BanjirReady_MVP SHALL identify every explicitly out-of-scope capability in project documentation as unavailable in the MVP.
6. WHEN a user requests rescue dispatch, crowdsourced reports, payments, account access, route planning, flood forecasting, or a current-safety guarantee, THE BanjirReady_MVP SHALL display the applicable scope limitation without presenting the requested capability as available.

### Requirement 2: Mobile-First Experience

**User Story:** As a Malaysian resident using a phone, I want essential preparedness functions to fit a small screen, so that I can use the MVP under constrained conditions.

#### Acceptance Criteria

1. THE Web_Client SHALL support viewport widths from 320 through 1440 CSS pixels without horizontal page scrolling at 100 percent browser zoom.
2. WHEN the viewport width is from 320 through 767 CSS pixels, THE Web_Client SHALL place emergency guidance, checklist, agency directory, and chatbot access within one activation from the primary navigation.
3. WHEN the viewport orientation changes, THE Web_Client SHALL preserve the selected language, active feature, entered Checklist_Profile values, and unsubmitted chatbot draft.
4. WHILE the Web_Client displays a loading state, THE Web_Client SHALL keep the emergency contact action operable.
5. IF a user-facing operation fails, THEN THE Web_Client SHALL retain saved Local_Data_Store values and display one retry or safe-return action.

### Requirement 3: BM and English Language Parity

**User Story:** As a BM or English speaker, I want equivalent content in either language, so that I can understand preparedness guidance and safety limitations.

#### Acceptance Criteria

1. THE Language_Interface SHALL provide BM and English selection on every primary feature screen.
2. WHEN a user changes the selected language, THE Language_Interface SHALL update visible navigation, labels, guidance, checklist items, directory descriptions, chatbot safety text, and error messages without resetting current user state.
3. WHEN BM is selected, THE Language_Interface SHALL set the document language metadata to `ms`.
4. WHEN English is selected, THE Language_Interface SHALL set the document language metadata to `en`.
5. IF a translation key is absent, THEN THE Language_Interface SHALL display a localized missing-content notice in the selected language instead of content from the other language.
6. THE Test_Suite SHALL verify identical application-text keys and safety-message categories for BM and English resources.

### Requirement 4: Guidance Provenance and Review Status

**User Story:** As a resident, I want to distinguish reviewed guidance from demo content, so that I can judge the authority of displayed information.

#### Acceptance Criteria

1. THE Guidance_Catalog SHALL assign exactly one Guidance_Status to every Guidance_Record version.
2. WHEN a Guidance_Record includes a named reviewer, reviewer organization or qualification, review date, content version, and source references, THE Guidance_Catalog SHALL permit the `Reviewed_Guidance` status.
3. IF any required Reviewed_Guidance metadata field is absent, THEN THE Guidance_Catalog SHALL assign the `Demo_Guidance` status.
4. WHEN a Guidance_Record has `Demo_Guidance` status, THE Web_Client SHALL display `Demo Guidance / Panduan Demo` in the same content container immediately before or after the Guidance_Record with no intervening actionable content.
5. WHEN a Guidance_Record has `Reviewed_Guidance` status, THE Web_Client SHALL display the reviewer, reviewer organization or qualification, review date, content version, and source references in the same content container.
6. WHEN a Guidance_Record moves through search, checklist inclusion, chatbot retrieval, or language switching, THE Guidance_Catalog SHALL preserve the record identifier, content version, source metadata, and Guidance_Status.
7. THE Web_Client SHALL state that neither Guidance_Status represents government endorsement.

### Requirement 5: Deterministic Personalized Checklists

**User Story:** As a resident, I want a checklist tailored to household circumstances, so that I can prepare relevant supplies and actions.

#### Acceptance Criteria

1. THE Checklist_Engine SHALL accept only household size, children presence, elderly-member presence, mobility-assistance need, pet presence, and transport availability as Checklist_Profile fields.
2. WHEN every Checklist_Profile field is unselected, THE Checklist_Engine SHALL produce the versioned baseline checklist.
3. WHEN a user submits a Checklist_Profile, THE Checklist_Engine SHALL produce a checklist from one identified deterministic rule version.
4. WHEN identical Checklist_Profile values and rule version are submitted, THE Checklist_Engine SHALL produce items with identical stable identifiers, order, wording keys, source references, and Guidance_Status values.
5. WHEN equivalent Checklist_Profile fields are submitted in a different field order, THE Checklist_Engine SHALL produce the same checklist result.
6. WHEN a Checklist_Profile changes, THE Checklist_Engine SHALL classify the union of previous and regenerated item identifiers as added, retained, or removed and order added and retained items by regenerated checklist order and removed items by previous checklist order.
7. WHEN a user marks a checklist item complete, THE Local_Data_Store SHALL persist the stable item identifier, completion state, and checklist rule version.
8. IF saved checklist data contains an unsupported rule version or unknown item identifier, THEN THE Checklist_Engine SHALL regenerate the checklist from the current rule version and display a version-change notice.
9. THE Checklist_Engine SHALL omit identity, diagnosis, exact-address, and medication-profile inputs from the Checklist_Profile.

### Requirement 6: Malaysian Agency Directory

**User Story:** As a resident, I want verified-or-clearly-labelled agency contacts, so that I can find the correct documented channel.

#### Acceptance Criteria

1. THE Agency_Directory SHALL provide BM and English Agency_Record entries with stable record identifiers.
2. THE Agency_Directory SHALL include agency role, contact method, source reference, Guidance_Status, and last-updated timestamp in every Agency_Record.
3. WHEN a user searches by agency name, agency role, Malaysian state, or Malaysian district, THE Agency_Directory SHALL order matches by exact match, prefix match, remaining match, agency name, and stable record identifier.
4. WHEN a telephone contact is present, THE Web_Client SHALL display the complete number as text and provide a keyboard-accessible telephone action with the same number.
5. IF an Agency_Record lacks complete review metadata, THEN THE Agency_Directory SHALL display `Demo Guidance / Panduan Demo` in the same record container immediately before or after the contact content with no intervening actionable content.
6. IF an Agency_Record contact field is absent, THEN THE Agency_Directory SHALL display the source reference and a localized contact-unavailable state without generating a replacement value.
7. WHEN Credential_Free_Mode is active, THE Agency_Directory SHALL use one identified version of bundled deterministic Agency_Record fixtures.

### Requirement 7: Deterministic Demo Providers

**User Story:** As a hackathon evaluator, I want stable local data, so that the full demonstration remains repeatable without third-party services.

#### Acceptance Criteria

1. WHEN Credential_Free_Mode is active, THE Demo_Provider SHALL supply every record required by the primary demo journeys from one identified fixture version.
2. WHEN the Demo_Provider receives identical input, fixture version, and fixed clock value, THE Demo_Provider SHALL return records with identical identifiers, values, timestamps, and order.
3. THE Demo_Provider SHALL classify every Provider_Record as Demo_Data.
4. WHEN Demo_Data is displayed, THE Web_Client SHALL display `Demo Data / Data Demo` in the same content container immediately before or after each operational-looking value with no intervening actionable content.
5. WHILE Credential_Free_Mode is active, THE Demo_Provider SHALL complete every baseline request without an outbound network request.
6. IF an optional Integration_Adapter fails, times out, or returns an invalid response, THEN THE BanjirReady_MVP SHALL apply the configured Stale_Data_Policy while preserving credential-free access.

### Requirement 8: Configurable Freshness and Stale-Data Behavior

**User Story:** As a product owner, I want explicit stale-data rules, so that old information receives predictable treatment.

#### Acceptance Criteria

1. THE Data_Freshness_Controller SHALL accept one maximum age and one Stale_Data_Policy behavior for each data-source category.
2. WHEN a Provider_Record age is greater than or equal to zero and less than or equal to the configured maximum age, THE Data_Freshness_Controller SHALL classify the Provider_Record as current.
3. WHEN a Provider_Record age is greater than the configured maximum age, THE Data_Freshness_Controller SHALL classify the Provider_Record as stale.
4. IF a Provider_Record has an absent, invalid, or future source timestamp, THEN THE Data_Freshness_Controller SHALL classify the Provider_Record as stale.
5. WHERE `warn_and_use` is configured, THE Data_Freshness_Controller SHALL display a stale Provider_Record with a stale warning, source timestamp, and retrieval timestamp.
6. WHERE `switch_to_demo` is configured, THE Data_Freshness_Controller SHALL replace a stale Provider_Record with Demo_Data and display the stale-source replacement reason.
7. WHERE `mark_unavailable` is configured, THE Data_Freshness_Controller SHALL suppress operational values and display localized source-unavailable guidance.
8. THE Data_Freshness_Controller SHALL use maximum ages of 30 minutes for alert-like data, 30 days for Agency_Record data, and 180 days for Guidance_Record data until configuration supplies a replacement value.

### Requirement 9: Optional and Unverified Integrations

**User Story:** As a developer, I want external dependencies isolated and optional, so that unavailable credentials cannot break the baseline demo.

#### Acceptance Criteria

1. THE Integration_Adapter SHALL expose provider name, provider mode, availability status, verification status, freshness state, and fallback provider for each external integration.
2. IF an agency API credential, endpoint approval, schema, or usage permission is unverified, THEN THE Integration_Adapter SHALL classify the agency integration as unavailable.
3. IF a Model_Credential or external model endpoint is unverified, THEN THE External_Model_Adapter SHALL classify external synthesis and remote semantic retrieval as unavailable.
4. WHEN an Integration_Adapter is unavailable, THE BanjirReady_MVP SHALL activate the documented credential-free fallback for the affected capability.
5. THE Web_Client SHALL receive only provider name, provider mode, availability status, verification status, freshness state, and non-secret error codes from the Integration_Adapter.
6. THE Integration_Adapter SHALL exclude credentials, credential fragments, request authorization values, stack traces, and internal file paths from browser responses and application logs.
7. WHERE a verified agency integration is enabled, THE Integration_Adapter SHALL preserve provider identity, stable record identity, source timestamp, retrieval timestamp, and live-or-demo classification.
8. WHERE a verified External_Model_Adapter is enabled, THE Misinformation_Safety_Guard SHALL apply the citation, grounding, emergency, refusal, and fallback constraints used in Credential_Free_Mode.

### Requirement 10: Grounded RAG Chatbot

**User Story:** As a resident, I want answers grounded in approved preparedness content, so that I can inspect the basis of each answer.

#### Acceptance Criteria

1. WHEN a user submits a non-emergency flood-preparedness question, THE Retrieval_Engine SHALL search only the selected-language records in the identified Approved_Knowledge_Corpus version.
2. WHEN relevant records exist, THE Retrieval_Engine SHALL return from one through five records ordered by relevance score, source date, and stable record identifier.
3. WHEN the Retrieval_Engine receives identical corpus version, selected language, question text, configuration, and fixed clock value, THE Retrieval_Engine SHALL return identical record identifiers and order.
4. WHEN the Chatbot presents an Actionable_Claim, THE Chatbot SHALL display at least one Citation resolving to the supporting corpus record identifier, corpus version, selected language, and source metadata.
5. WHEN the Chatbot presents an answer, THE Chatbot SHALL identify deterministic composition or the named External_Model_Adapter as the answer mode.
6. IF the Approved_Knowledge_Corpus lacks evidence for a requested claim, THEN THE Chatbot SHALL suppress the requested claim and present a Safety_Fallback_Response.
7. WHEN a Citation is activated, THE Web_Client SHALL display source title, source organization, source date, Guidance_Status, corpus record identifier, and the supporting excerpt.
8. WHILE Credential_Free_Mode is active, THE Chatbot SHALL compose answers only from retrieved records and versioned deterministic templates.
9. WHEN the selected language changes, THE Chatbot SHALL use the selected language while preserving cited record identity across equivalent BM and English corpus records.
10. THE Chatbot SHALL state that BanjirReady provides preparedness information rather than rescue dispatch or a guarantee of current safety.

### Requirement 11: Emergency Safety Constraints

**User Story:** As a person facing immediate danger, I want direct emergency escalation, so that chatbot conversation does not delay contact with emergency services.

#### Acceptance Criteria

1. WHEN the Emergency_Safety_Guard detects an Emergency_Query, THE Web_Client SHALL render the emergency escalation block before any conversational answer in document order.
2. WHEN the emergency escalation block appears, THE Accessibility_Interface SHALL move keyboard focus to the block heading or validated emergency contact action.
3. WHEN the Emergency_Safety_Guard detects an Emergency_Query, THE Web_Client SHALL present the validated Malaysian emergency contact action before an optional chatbot follow-up control.
4. WHEN the Emergency_Safety_Guard detects an Emergency_Query, THE Web_Client SHALL present BM and English instructions to avoid moving or unknown-depth floodwater and to follow emergency-personnel directions.
5. WHEN the Emergency_Safety_Guard detects an Emergency_Query, THE Chatbot SHALL state that BanjirReady cannot dispatch rescue services or monitor rescue requests.
6. IF the Malaysian emergency contact fixture lacks documented validation, THEN THE Web_Client SHALL label the contact as `Demo Data / Data Demo` adjacent to the contact value and state that public deployment requires validation.
7. THE Emergency_Safety_Guard SHALL classify every item in the versioned BM and English emergency phrase test corpus according to the corpus expected result.
8. IF emergency intent is ambiguous, THEN THE Emergency_Safety_Guard SHALL present emergency escalation before a brief clarification control.

### Requirement 12: Misinformation and Unsafe-Certainty Constraints

**User Story:** As a resident, I want unsupported claims blocked, so that the MVP does not create false confidence during a flood.

#### Acceptance Criteria

1. THE Misinformation_Safety_Guard SHALL require at least one resolvable Citation for every Actionable_Claim produced by the Chatbot.
2. IF a proposed answer claims that a location is safe, predicts flood behavior, invents an agency contact, or lacks required Citation support, THEN THE Misinformation_Safety_Guard SHALL suppress the unsupported claim and present a Safety_Fallback_Response.
3. IF retrieved content or user input requests bypass of emergency, grounding, citation, privacy, or misinformation constraints, THEN THE Misinformation_Safety_Guard SHALL preserve the constraints and exclude the bypass instruction from the answer.
4. WHEN a source is stale, THE Chatbot SHALL display the stale state and source timestamp adjacent to every Actionable_Claim derived from the source.
5. WHEN a source contains Demo_Data or Demo_Guidance, THE Chatbot SHALL display the corresponding bilingual demo label adjacent to every Actionable_Claim derived from the source.
6. IF retrieved sources conflict, THEN THE Chatbot SHALL identify the conflict, cite each conflicting source, and suppress any unsupported resolution.
7. IF a Citation fails to resolve to the identified Approved_Knowledge_Corpus version, THEN THE Misinformation_Safety_Guard SHALL remove the dependent claim and present a Safety_Fallback_Response.

### Requirement 13: Privacy and Local Data Control

**User Story:** As a privacy-conscious resident, I want optional data to remain under local control, so that I can use preparedness features without creating an account.

#### Acceptance Criteria

1. THE BanjirReady_MVP SHALL provide every baseline capability without an account or user identity.
2. THE Local_Data_Store SHALL contain only language preference, the six Checklist_Profile fields, checklist rule version, stable checklist item identifiers, checklist completion states, and acknowledged notices.
3. THE Local_Data_Store SHALL exclude chatbot text, identity, diagnosis, exact address, medication profile, credentials, and external-provider response bodies.
4. WHEN a user first saves Personal_Data, THE Web_Client SHALL display a shared-browser-profile privacy notice before completing the save.
5. WHEN a user confirms the clear-data control, THE Local_Data_Store SHALL remove every BanjirReady key and restore unsaved defaults.
6. WHEN a user submits a chatbot message, THE Application_Server SHALL discard the message text after returning or terminating the response.
7. THE Application_Server SHALL exclude Personal_Data, chatbot text, credentials, authorization values, and external-provider response bodies from application logs.
8. THE BanjirReady_MVP SHALL operate without analytics, advertising trackers, third-party session replay, or background location collection.
9. IF Local_Data_Store access is unavailable or a write fails, THEN THE Web_Client SHALL continue with in-memory state and display a persistence-unavailable notice.
10. WHEN a user opens privacy information, THE Web_Client SHALL list every locally stored field, retention behavior, clear-data procedure, and enabled external integration.

### Requirement 14: Application Security

**User Story:** As a resident, I want defensive handling of content and secrets, so that the demo avoids common web security failures.

#### Acceptance Criteria

1. THE Web_Client SHALL render Guidance_Record, Agency_Record, Citation, and chatbot content as text unless an approved sanitizer policy accepts the content.
2. WHEN the Application_Server receives a request, THE Application_Server SHALL validate the endpoint, HTTP method, content type, body shape, field types, field lengths, and allowed values before application processing.
3. IF a request has an unsupported content type, malformed body, unknown field, invalid field type, or disallowed value, THEN THE Application_Server SHALL reject the request with a localized validation error and no application processing.
4. IF a chatbot request exceeds 4,096 UTF-8 bytes, THEN THE Application_Server SHALL reject the request with a localized size error.
5. THE Application_Server SHALL keep enabled external credentials only in server-side environment configuration.
6. THE Web_Client SHALL exclude agency credentials, Model_Credential values, private keys, authorization values, and server secrets from browser assets and Local_Data_Store.
7. WHEN the Application_Server returns an error, THE Application_Server SHALL omit stack traces, credential values, authorization values, internal file paths, and provider response bodies from the user-facing response.
8. WHEN the BanjirReady_MVP operates outside a localhost Demo_Environment, THE Application_Server SHALL require encrypted transport for Personal_Data requests.
9. THE Application_Server SHALL send `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` response headers.

### Requirement 15: Accessibility

**User Story:** As a user with access needs, I want core preparedness functions to be accessible, so that I can operate the MVP with assistive technology.

#### Acceptance Criteria

1. THE Accessibility_Interface SHALL meet WCAG_2_2_AA for guidance, checklist, agency directory, and chatbot journeys.
2. THE Accessibility_Interface SHALL make every interactive control operable by keyboard with a visible focus indicator.
3. WHEN non-emergency content updates without page navigation, THE Accessibility_Interface SHALL announce the update through a polite live region.
4. WHEN an emergency alert or validation error appears without page navigation, THE Accessibility_Interface SHALL announce the alert through an assertive live region.
5. THE Accessibility_Interface SHALL provide programmatic names, roles, states, instructions, and error associations for form controls.
6. THE Accessibility_Interface SHALL maintain contrast ratios of at least 4.5:1 for normal text and 3:1 for large text and essential interface graphics.
7. THE Accessibility_Interface SHALL provide touch targets of at least 44 by 44 CSS pixels for primary mobile actions.
8. WHEN browser zoom is 200 percent at a 320 CSS-pixel viewport, THE Web_Client SHALL reflow every primary journey into one-dimensional scrolling without loss of content or function.
9. WHERE reduced-motion preference is enabled, THE Accessibility_Interface SHALL remove non-essential animation and preserve state changes without motion dependence.
10. THE Accessibility_Interface SHALL pair every Guidance_Status, freshness, error, completion, and emergency color indicator with visible text or an icon that has an accessible name.

### Requirement 16: Credential-Free Demo Acceptance

**User Story:** As a hackathon evaluator, I want a complete repeatable demo, so that I can assess the product without procuring credentials.

#### Acceptance Criteria

1. WHEN the BanjirReady_MVP starts in the Demo_Environment, THE BanjirReady_MVP SHALL expose no required external credential prompt.
2. WHEN outbound network access is disabled, THE Demo_Acceptance_Suite SHALL complete BM and English guidance browsing with visible source, content version, Guidance_Status, and demo labels.
3. WHEN outbound network access is disabled, THE Demo_Acceptance_Suite SHALL produce identical checklist identifiers, order, wording keys, and Guidance_Status values from two submissions of the same Checklist_Profile and rule version.
4. WHEN outbound network access is disabled, THE Demo_Acceptance_Suite SHALL search the agency directory and open one complete Demo_Data Agency_Record with provenance and freshness state.
5. WHEN outbound network access is disabled, THE Demo_Acceptance_Suite SHALL answer one supported chatbot question with resolvable Citations from the identified Approved_Knowledge_Corpus version.
6. WHEN outbound network access is disabled, THE Demo_Acceptance_Suite SHALL answer one unsupported chatbot question with suppression of the unsupported claim and a Safety_Fallback_Response.
7. WHEN outbound network access is disabled, THE Demo_Acceptance_Suite SHALL place emergency escalation before conversational output for one BM Emergency_Query and one English Emergency_Query.
8. WHEN the demo browser reloads, THE Demo_Acceptance_Suite SHALL verify persistence of language preference, the six Checklist_Profile fields, and checklist completion state.
9. WHEN the clear-data control is confirmed, THE Demo_Acceptance_Suite SHALL verify removal of every BanjirReady Local_Data_Store key.
10. IF agency or model credential variables are absent, THEN THE Demo_Acceptance_Suite SHALL report the corresponding integration as unavailable with an active fallback rather than as a baseline failure.

### Requirement 17: Testability and Traceability

**User Story:** As a developer, I want observable and deterministic acceptance checks, so that safety-critical behavior can be verified before demonstration.

#### Acceptance Criteria

1. THE Test_Suite SHALL map every acceptance-criterion identifier to one automated test, documented manual check, or documented external-validation dependency.
2. THE Test_Suite SHALL record the test identifier, requirement identifier, execution type, and latest result for each acceptance-criterion mapping.
3. THE Test_Suite SHALL provide fixed clock, fixture version, corpus version, checklist rule version, and provider configuration inputs for deterministic tests.
4. WHEN valid Checklist_Profile values are generated, THE Test_Suite SHALL verify checklist equivalence for identical profile values and rule versions.
5. WHEN chatbot answers are generated at the answer-composition boundary, THE Test_Suite SHALL verify that every Actionable_Claim resolves to at least one Citation in the identified Approved_Knowledge_Corpus version.
6. WHEN provider timestamps are generated at, below, and above a configured maximum age, THE Test_Suite SHALL verify the specified current and stale boundary classifications.
7. WHEN BM and English resources are compared, THE Test_Suite SHALL verify matching keys and matching safety-message categories.
8. WHILE agency credentials, Model_Credential values, and outbound network access are absent, THE Test_Suite SHALL run all baseline automated checks.
9. THE Test_Suite SHALL include automated type-safety, build, request-validation, accessibility-rule, and primary-journey checks.
10. IF an acceptance criterion depends on agency approval, content review, production hosting, or external credentials, THEN THE Test_Suite SHALL report the criterion as an external-validation dependency rather than a verified result.

### Requirement 18: Failure Transparency and Operational Limitations

**User Story:** As a resident, I want visible system limitations, so that degraded or demo behavior cannot be mistaken for live official operation.

#### Acceptance Criteria

1. THE Web_Client SHALL display provider mode, availability status, freshness state, and Guidance_Status in each content container containing operational-looking or actionable information.
2. IF the Application_Server is unavailable, THEN THE Web_Client SHALL retain already loaded emergency guidance and display a server-unavailable notice with one retry action.
3. IF an optional external provider exceeds the configured timeout of 3,000 milliseconds, THEN THE Integration_Adapter SHALL terminate the provider attempt and invoke the configured Stale_Data_Policy.
4. IF an optional external provider returns a network error, unsupported content type, malformed body, missing required field, invalid field type, or disallowed value, THEN THE Integration_Adapter SHALL reject the response and invoke the configured Stale_Data_Policy.
5. WHEN Credential_Free_Mode is active, THE Web_Client SHALL display a persistent `Demo Mode / Mod Demo` indicator on every primary feature screen.
6. WHEN a user opens the limitations view, THE Web_Client SHALL list unavailable live integrations, unverified credentials, out-of-scope capabilities, privacy behavior, Guidance_Status definitions, and emergency limitations.
7. WHEN Demo_Data describes a warning, water level, evacuation order, shelter status, or rescue status, THE Web_Client SHALL display `Demo Data / Data Demo` and `Not current operational information / Bukan maklumat operasi semasa` in the same content container immediately before or after the value with no intervening actionable content.
