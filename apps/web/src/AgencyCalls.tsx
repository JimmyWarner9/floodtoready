import { useLanguage } from './localization/LanguageProvider';

const contacts = [
  { id: 'emergency', name: '999', phone: '999', uri: 'tel:999',
    en: 'Emergency assistance', ms: 'Bantuan kecemasan',
    source: 'https://www.nadma.gov.my/images/nadma/documents/kenyataanmedia/Disember2022/211222_Media_Statement_PKOB.pdf' },
  { id: 'nadma', name: 'NADMA / NDCC', phone: '03-8064 2400', uri: 'tel:+60380642400',
    en: 'Disaster information and coordination — 24 hours', ms: 'Maklumat dan penyelarasan bencana — 24 jam',
    source: 'https://portalbencana.nadma.gov.my/en/' },
  { id: 'met', name: 'METMalaysia', phone: '1-300-22-1638', uri: 'tel:1300221638',
    en: 'Weather information hotline', ms: 'Talian maklumat cuaca', source: 'https://www.met.gov.my/' },
] as const;

export function AgencyCalls() {
  const { language } = useLanguage();
  const ms = language === 'ms';
  return <section className="agency-directory agency-designed">
    <p>{ms ? 'Tekan nombor untuk membuka pendail telefon. Untuk bantuan kecemasan segera, hubungi 999.' : 'Tap a number to open your phone dialler. For immediate emergency assistance, call 999.'}</p>
    <div className="agency-results">{contacts.map(contact => <article className={`agency-card contact-${contact.id}`} key={contact.id}>
      <div className="contact-copy"><span className="contact-symbol" aria-hidden="true">{contact.id === 'emergency' ? '!' : contact.id === 'nadma' ? 'NDCC' : 'MET'}</span>
      <div className="section-eyebrow">{contact.id === 'emergency' ? (ms ? 'BANTUAN KECEMASAN' : 'EMERGENCY ASSISTANCE') : (ms ? 'TALIAN MAKLUMAT' : 'INFORMATION HOTLINE')}</div>
      <h3>{contact.id === 'emergency' ? (ms ? 'Perlukan bantuan segera?' : 'Need immediate help?') : contact.name}</h3><p>{ms ? contact.ms : contact.en}</p></div>
      {contact.id !== 'emergency' && <div className="contact-number">{contact.phone}</div>}
      <a className={contact.id === 'emergency' ? 'emergency-action' : 'agency-call-action'} href={contact.uri} aria-label={`${ms ? 'Hubungi' : 'Call'} ${contact.name}: ${contact.phone}`}>{ms ? 'Hubungi' : 'Call'} {contact.phone}</a>
      <p><a href={contact.source} target="_blank" rel="noopener noreferrer">{ms ? 'Sumber rasmi nombor telefon' : 'Official telephone-number source'}</a></p>
      <small>{ms ? 'Nombor disemak pada 3 Oktober 2026.' : 'Number checked on 3 October 2026.'}</small>
    </article>)}</div>
    <p className="privacy-note">{ms ? 'Panggilan dibuat menggunakan telefon anda. Tiada laporan dihantar melalui aplikasi dan tiada sambungan terus ke sistem penghantaran penyelamat. Pada komputer, aplikasi telefon diperlukan.' : 'Calls use your phone. The app sends no reports and has no connection to rescue dispatch systems. On a computer, a calling application is required.'}</p>
  </section>;
}
