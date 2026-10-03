import { chatRequestSchema, chatResponseSchema, type ChatResponse } from '@banjir-ready/contracts';
import { approvedKnowledgeCorpus } from './corpus.js';
import { fixtureSources } from './sources.js';
import { FIXTURE_VERSION } from './versions.js';

/** Conservative demo guard; escalation precedes retrieval on client and server. */
export function isEmergencyQuestion(question: string): boolean {
  return /\b(trapped|stranded|drowning|rescue|help me|cannot escape|can't escape|water entering|terperangkap|lemas|selamatkan|tolong saya|air masuk|tak boleh keluar|kecemasan)\b/i.test(question);
}

export function composeDemoChat(input: unknown): ChatResponse {
  const request = chatRequestSchema.parse(input);
  if (isEmergencyQuestion(request.question)) {
    return chatResponseSchema.parse({
      kind: 'emergency', allowClarification: false,
      escalation: {
        headingKey: 'chat.emergencyHeading',
        waterSafetyInstructionMs: 'Jangan meredah air banjir. Ikut arahan petugas kecemasan.',
        waterSafetyInstructionEn: 'Do not cross floodwater. Follow instructions from emergency personnel.',
        noDispatchMessageKey: 'limitations.noRescueDispatch',
        noSafetyGuaranteeMessageKey: 'limitations.noSafetyGuarantee',
        contact: {
          displayNumber: '999', telephoneUri: 'tel:999', validationStatus: 'requires_validation',
          source: fixtureSources.malaysiaDisasterGuidance,
          provenance: { providerName: 'bundled-emergency-contact', providerMode: 'demo',
            dataClass: 'Demo_Data', sourceTimestamp: '2025-01-15T00:00:00.000Z',
            retrievalTimestamp: '2025-01-15T00:00:00.000Z', freshness: 'stale', fixtureVersion: FIXTURE_VERSION },
        },
      },
    });
  }
  const question = request.question.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const unsupported = /\b(safe|selamat|predict|ramal|route|laluan|capacity|kapasiti|open shelter|pps dibuka|live|semasa|ignore|abaikan|will flood|akan banjir)\b/i.test(question);
  const fallback = (): ChatResponse => chatResponseSchema.parse({ kind: 'safety_fallback', reason: 'insufficient_evidence', messageKey: 'chat.unsupported', citations: [] });
  if (unsupported || request.corpusVersion !== approvedKnowledgeCorpus.corpusVersion) return fallback();
  const hits = approvedKnowledgeCorpus.records.filter(record => record.language === request.language)
    .map(record => ({ record, score: record.normalizedTerms.reduce((score, term) => score + (question.includes(term.toLowerCase()) || term.toLowerCase().split(' ').some(token => token.length >= 4 && question.split(' ').includes(token)) ? 4 : 0), 0) }))
    .filter(hit => hit.score >= 4).sort((a, b) => b.score - a.score || a.record.recordId.localeCompare(b.record.recordId)).slice(0, 3);
  if (!hits.length) return fallback();
  return chatResponseSchema.parse({
    kind: 'answer', answerMode: 'deterministic', limitations: ['limitations.noSafetyGuarantee'],
    claims: hits.map(({ record }, index) => ({ claimId: `claim.${index}`, text: record.text, actionable: true,
      citationIds: [`citation.${index}`], labels: ['stale', 'demo_data', 'demo_guidance'] })),
    citations: hits.map(({ record }, index) => ({ citationId: `citation.${index}`, corpusRecordId: record.recordId,
      corpusVersion: record.corpusVersion, language: record.language, source: record.source, excerpt: record.text,
      guidanceStatus: record.status, freshness: 'stale', dataClass: 'Demo_Data' })),
  });
}
