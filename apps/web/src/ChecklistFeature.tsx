import { useMemo, useState } from 'react';
import type { LocalState, ChecklistProfile } from '@banjir-ready/contracts';
import { CHECKLIST_RULE_VERSION } from '@banjir-ready/fixtures';
import { ChecklistProfileForm, EMPTY_CHECKLIST_PROFILE, type ChecklistProfileFormLabels } from './checklist/ChecklistProfileForm';
import { generateChecklistWithExplanations, restoreChecklist } from './checklist/ChecklistEngine';
import { PrivacyGatedStorageAdapter } from './storage/StorageAdapter';
import { useLanguage } from './localization/LanguageProvider';

export function ChecklistFeature() {
  const { language, text } = useLanguage();
  const ms = language === 'ms';
  const [storage] = useState(() => new PrivacyGatedStorageAdapter({ initialState: {
    schemaVersion: 1, language, checklistProfile: EMPTY_CHECKLIST_PROFILE,
    checklistRuleVersion: CHECKLIST_RULE_VERSION, checklistCompletion: {}, acknowledgedNotices: [],
  } }));
  const [state, setState] = useState<LocalState>(() => {
    const loaded = storage.load().state;
    return { ...loaded, checklistCompletion: { ...restoreChecklist(loaded, loaded.checklistProfile).completion } };
  });
  const [notice, setNotice] = useState('');
  const [formKey, setFormKey] = useState(0);
  const generated = useMemo(() => generateChecklistWithExplanations(state.checklistProfile, language), [state.checklistProfile, language]);
  const labels: ChecklistProfileFormLabels = {
    heading: ms ? 'Kenali isi rumah anda' : 'Your household',
    instructions: ms ? 'Butiran ini digunakan dalam pelayar sahaja untuk menyesuaikan pelan anda.' : 'These details stay in your browser and personalise your plan.',
    optionalHint: ms ? 'Pilihan' : 'Optional', householdSize: ms ? 'Bilangan ahli isi rumah' : 'Household size',
    householdSizeInstruction: ms ? '1 hingga 100 orang, atau biarkan kosong.' : '1 to 100 people, or leave blank.',
    hasChildren: ms ? 'Ada kanak-kanak?' : 'Children?', hasElderlyMembers: ms ? 'Ada warga emas?' : 'Elderly members?',
    needsMobilityAssistance: ms ? 'Perlu bantuan pergerakan?' : 'Mobility assistance needed?',
    hasPets: ms ? 'Ada haiwan peliharaan?' : 'Pets?', hasTransport: ms ? 'Ada pengangkutan?' : 'Transport available?',
    unselected: ms ? 'Tidak dipilih' : 'Not selected', yes: ms ? 'Ya' : 'Yes', no: ms ? 'Tidak' : 'No',
    submit: ms ? 'Jana pelan saya' : 'Generate my plan', householdSizeError: ms ? 'Masukkan nombor bulat 1–100.' : 'Enter a whole number from 1–100.',
  };
  function save(next: LocalState) {
    setState(next);
    let result = storage.save(next);
    if (result.status === 'privacy_notice_required') {
      if (!window.confirm(text('privacy.sharedDeviceNotice'))) { setNotice(ms ? 'Pelan disimpan dalam ingatan untuk sesi ini sahaja.' : 'Plan kept in memory for this session only.'); return; }
      result = storage.save(next, { sharedBrowserNoticeAcknowledged: true });
    }
    setNotice(result.status === 'saved' ? (ms ? 'Disimpan dalam pelayar ini.' : 'Saved in this browser.') : text('errors.storageUnavailable'));
  }
  function profileChanged(profile: ChecklistProfile) {
    save({ ...state, language, checklistProfile: profile, checklistRuleVersion: CHECKLIST_RULE_VERSION });
  }
  const done = generated.checklist.items.filter(item => state.checklistCompletion[item.itemId]).length;
  return <div className="plan-layout">
    <div className="no-print"><ChecklistProfileForm key={formKey} initialProfile={state.checklistProfile} labels={labels} onSubmitProfile={profileChanged} /></div>
    <section className="plan-card" aria-label={ms ? 'Pelan persediaan' : 'Preparedness plan'}>
      <div className="section-eyebrow">{ms ? 'PELAN ISI RUMAH' : 'HOUSEHOLD PLAN'}</div>
      <h3>{ms ? 'Bersedia, satu langkah pada satu masa.' : 'Ready, one step at a time.'}</h3>
      <p>{done} / {generated.checklist.items.length} {ms ? 'tugasan selesai' : 'tasks completed'}</p>
      <progress max={generated.checklist.items.length} value={done} aria-label={ms ? 'Kemajuan' : 'Progress'} />
      <p className="demo-note">Demo Guidance / Panduan Demo · {ms ? 'Panduan persediaan; bukan arahan pemindahan semasa.' : 'Preparedness guidance; not a current evacuation instruction.'}</p>
      <ul className="task-list">{generated.checklist.items.map(item => <li key={item.itemId}>
        <label className="task-row"><input type="checkbox" checked={state.checklistCompletion[item.itemId] ?? false} onChange={event => save({ ...state, language, checklistCompletion: { ...state.checklistCompletion, [item.itemId]: event.target.checked } })} /><span>{text(item.wordingKey)}</span></label>
        {generated.explanations.find(explanation => explanation.itemId === item.itemId)?.reasons.map(reason => <p className="task-reason" key={reason.ruleId}>{reason.text}</p>)}
        <small>Demo Guidance / Panduan Demo</small>
        <div>{item.sourceRefs.map(source => <a className="source-link" key={source.sourceId} href={source.url} target="_blank" rel="noopener noreferrer">{source.organization}<span className="print-url"> — {source.url}</span></a>)}</div>
      </li>)}</ul>
      <p role="status">{notice}</p>
      <div className="action-row no-print"><button type="button" onClick={() => window.print()}>{ms ? 'Cetak pelan' : 'Print plan'}</button><button type="button" className="secondary" onClick={() => {
        storage.clearAll();
        if (window.confirm(text('privacy.clearConfirm'))) { const result = storage.clearAll({ confirmed: true }); setState(result.state); setFormKey(key => key + 1); setNotice(ms ? 'Data dipadam.' : 'Data cleared.'); }
      }}>{ms ? 'Padam data saya' : 'Clear my data'}</button></div>
      <p className="privacy-note">{ms ? 'Tiada akaun. Profil dan kemajuan kekal pada pelayar ini. Sembang tidak disimpan. Data tiada tarikh luput automatik; padam selepas menggunakan peranti berkongsi.' : 'No account. Profile and progress stay in this browser. Chat is not saved. No automatic expiry; clear your data after using a shared device.'}</p>
    </section>
  </div>;
}
