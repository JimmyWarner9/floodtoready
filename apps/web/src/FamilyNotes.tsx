import { useState } from 'react';
import { useLanguage } from './localization/LanguageProvider';
export function FamilyNotes() {
  const { language } = useLanguage(); const ms = language === 'ms';
  const [contact, setContact] = useState(''); const [note, setNote] = useState(''); const [notice, setNotice] = useState('');
  return <section className="family-notes no-print"><div className="section-eyebrow">{ms ? 'BINCANG BERSAMA' : 'PLAN TOGETHER'}</div><h3>{ms ? 'Catatan keluarga' : 'Family notes'}</h3>
    <p>{ms ? 'Catatan kekal dalam ingatan sesi ini sahaja. Tiada maklumat dihantar atau disimpan pada peranti.' : 'Notes stay in memory for this session only. Nothing is sent or saved to the device.'}</p>
    <form onSubmit={event => { event.preventDefault(); setNotice(ms ? 'Catatan tersedia sepanjang sesi ini.' : 'Notes are available for this session.'); }}>
      <label htmlFor="family-contact">{ms ? 'Orang untuk dihubungi' : 'Contact person'}</label><input id="family-contact" value={contact} onChange={event => { setContact(event.target.value); setNotice(''); }} maxLength={200} placeholder={ms ? 'Nama dan nombor telefon' : 'Name and phone number'} />
      <label htmlFor="family-note">{ms ? 'Catatan persediaan' : 'Preparation notes'}</label><textarea id="family-note" value={note} onChange={event => { setNote(event.target.value); setNotice(''); }} maxLength={1000} rows={3} />
      <button type="submit">{ms ? 'Simpan untuk sesi ini' : 'Keep for this session'}</button>
    </form><p role="status">{notice}</p></section>;
}
