import { useEffect, useRef, useState, type FormEvent } from 'react';
import { chatResponseSchema, type ChatResponse } from '@banjir-ready/contracts';
import { composeDemoChat, isEmergencyQuestion, APPROVED_KNOWLEDGE_CORPUS_VERSION } from '@banjir-ready/fixtures';
import { useLanguage } from './localization/LanguageProvider';

export function ChatFeature() {
  const { language } = useLanguage();
  const ms = language === 'ms';
  const [draft, setDraft] = useState('');
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const emergencyHeading = useRef<HTMLHeadingElement>(null);
  const sequence = useRef(0);
  useEffect(() => { if (response?.kind === 'emergency' || response?.kind === 'ambiguous_emergency') emergencyHeading.current?.focus(); }, [response]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    const request = { language, question: draft.trim(), corpusVersion: APPROVED_KNOWLEDGE_CORPUS_VERSION };
    const id = ++sequence.current;
    setDraft(''); setOffline(false);
    if (isEmergencyQuestion(request.question)) { setResponse(composeDemoChat(request)); return; }
    setBusy(true);
    try {
      const result = await fetch('/api/v1/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(3000) });
      if (!result.ok) throw new Error('unavailable');
      const parsed = chatResponseSchema.parse(await result.json());
      if (sequence.current === id) setResponse(parsed);
    } catch { if (sequence.current === id) { setResponse(composeDemoChat(request)); setOffline(true); } }
    finally { if (sequence.current === id) setBusy(false); }
  }
  const emergency = response?.kind === 'emergency' || response?.kind === 'ambiguous_emergency';
  return <section className="chat-card">
    {emergency && <section className="emergency-chat" role="alert"><h3 ref={emergencyHeading} tabIndex={-1}>{ms ? 'Perlu bantuan kecemasan?' : 'Need emergency help?'}</h3>
      <a className="emergency-action" href="tel:999">{ms ? 'Hubungi 999' : 'Call 999'}</a>
      <p>{response.escalation.waterSafetyInstructionMs}</p><p>{response.escalation.waterSafetyInstructionEn}</p>
      <p>{ms ? 'BanjirReady tidak menghantar atau memantau permintaan menyelamat.' : 'BanjirReady cannot dispatch or monitor rescue requests.'}</p>
      <small>Demo Guidance / Panduan Demo · {response.escalation.contact.source.sourceDate ?? '2025-01-15'} · <a href={response.escalation.contact.source.url} target="_blank" rel="noopener noreferrer">{ms ? 'Sumber' : 'Source'}</a></small>
    </section>}
    <div className="section-eyebrow">TANYA BANJIRREADY</div><h3>{ms ? 'Persediaan yang lebih jelas.' : 'Clearer preparation starts here.'}</h3>
    <p>{ms ? 'Pembantu demo berasaskan carian panduan. Tiada model AI luaran atau maklumat langsung disambungkan.' : 'A demo assistant that retrieves guidance. No external AI model or live information is connected.'}</p>
    <div className="suggestions">{(ms ? ['Apa bekalan perlu disediakan?', 'Bagaimana elakkan air banjir?', 'Tolong saya, saya terperangkap'] : ['What emergency supplies should I prepare?', 'How do I avoid floodwater?', 'Help me, I am trapped']).map(question => <button type="button" className="secondary" key={question} onClick={() => setDraft(question)}>{question}</button>)}</div>
    <form onSubmit={event => { void submit(event); }}><label htmlFor="chat-question">{ms ? 'Soalan anda' : 'Your question'}</label><textarea id="chat-question" rows={3} maxLength={1000} value={draft} onChange={event => setDraft(event.target.value)} placeholder={ms ? 'Tanya tentang persediaan banjir…' : 'Ask about flood preparation…'} /><button type="submit" disabled={busy || !draft.trim()}>{busy ? (ms ? 'Mencari panduan…' : 'Finding guidance…') : (ms ? 'Hantar soalan' : 'Send question')}</button></form>
    <div aria-live="polite">{offline && <p className="demo-note">{ms ? 'Pelayan tidak tersedia. Menggunakan panduan demo dalam pelayar.' : 'Server unavailable. Using bundled demo guidance.'}</p>}
      {response?.kind === 'answer' && <div className="chat-answer"><h4>{ms ? 'Panduan yang ditemui' : 'Retrieved guidance'}</h4>{response.claims.map(claim => <article key={claim.claimId}><p>{claim.text}</p><small>Demo Guidance / Panduan Demo · Demo Data / Data Demo · {ms ? 'Panduan lama; semak sumber rasmi.' : 'Historical guidance; check official sources.'}</small>{claim.citationIds.map(id => { const citation = response.citations.find(item => item.citationId === id); return citation ? <p key={id}><a href={citation.source.url} target="_blank" rel="noopener noreferrer">{citation.source.organization} — {citation.source.title}</a><br /><small>{citation.source.sourceDate ?? '2025-01-15'} · {citation.corpusRecordId} · {citation.corpusVersion}</small></p> : null; })}</article>)}</div>}
      {response?.kind === 'safety_fallback' && <p className="demo-note">{ms ? 'Tiada bukti mencukupi dalam panduan demo ini. Semak portal rasmi untuk amaran, PPS atau keadaan semasa. Kami tidak boleh mengesahkan laluan selamat.' : 'This demo guidance has insufficient evidence. Check official portals for warnings, shelters, or current conditions. We cannot confirm safe routes.'} <a href="https://portalbencana.nadma.gov.my/en/" target="_blank" rel="noopener noreferrer">Portal Bencana NADMA</a></p>}
    </div>
  </section>;
}
