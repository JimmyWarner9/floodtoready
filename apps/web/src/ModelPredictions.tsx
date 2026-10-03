import { useEffect, useState } from 'react';
import { useLanguage } from './localization/LanguageProvider';

const keys = ['temperature_c', 'rainfall_mm', 'storm_observed', 'flood_observed'] as const;
type Result = { available: boolean; next_day_prediction?: number | null; model_error?: number; baseline_error?: number };
type Report = { experimental: true; location: string; prediction_date: string; targets: Record<string, Result> };
function validate(value: unknown): Report {
  const r = value as Report;
  if (!r || r.experimental !== true || typeof r.location !== 'string' || r.location.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(r.prediction_date) || !r.targets) throw new Error('invalid');
  for (const key of keys) {
    const t = r.targets[key];
    if (!t || typeof t.available !== 'boolean') throw new Error('invalid');
    if (t.available && (typeof t.next_day_prediction !== 'number' || !Number.isFinite(t.next_day_prediction) || typeof t.model_error !== 'number' || !Number.isFinite(t.model_error) || t.model_error < 0 || typeof t.baseline_error !== 'number' || !Number.isFinite(t.baseline_error) || t.baseline_error <= t.model_error)) throw new Error('invalid');
    if (t.available && key.endsWith('observed') && (t.next_day_prediction! < 0 || t.next_day_prediction! > 1)) throw new Error('invalid');
    if (t.available && key === 'rainfall_mm' && t.next_day_prediction! < 0) throw new Error('invalid');
  }
  return r;
}
function ModelIcon({ index }: { index: number }) {
 const paths = [
 <><path d="M10 5a3 3 0 0 1 6 0v11a5 5 0 1 1-6 0Z" /><path d="M13 9v12" /></>,
 <><path d="M7 16a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4 4 0 0 1 0 9" /><path d="m8 21-1 3m8-3-1 3m8-3-1 3" /></>,
 <><path d="M7 16a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4 4 0 0 1 0 9" /><path d="m15 13-5 8h5l-3 7 9-11h-6l3-4" /></>,
 <><path d="m4 12 10-8 10 8M7 11v8m14-8v8M11 17v-5h6v5" /><path d="M3 23q3-4 6 0t6 0 6 0M3 28q3-4 6 0t6 0 6 0" /></>
 ];
 return <svg viewBox="0 0 30 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[index]}</svg>;
}
export function ModelPredictions() {
  const { language } = useLanguage(); const ms = language === 'ms';
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [automatic, setAutomatic] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/predictions', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('unavailable');
      const body = validate(await response.json());
      if (!abort.signal.aborted) { setReport(body); setAutomatic(true); }
    }).catch(() => {}).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, []);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const expired = !!report && report.prediction_date < today;
  const labels = ms ? ['Suhu', 'Hujan', 'Ribut petir', 'Kejadian banjir'] : ['Temperature', 'Rainfall', 'Thunderstorms', 'Flood events'];
  return <section className="model-section" aria-labelledby="model-heading">
    <div className="section-eyebrow">{ms ? 'PEMBELAJARAN MESIN · EKSPERIMEN' : 'MACHINE LEARNING · EXPERIMENTAL'}</div>
    <h3 id="model-heading">{ms ? 'Corak hari ini, pandangan esok' : 'Today’s patterns, tomorrow’s outlook'}</h3>
    <p>{ms ? 'Anggaran penyelidikan daripada data sejarah. Bukan ramalan atau amaran rasmi. Skor rendah tidak bermaksud sesuatu tempat selamat.' : 'Research estimates from historical data. These are not official forecasts or warnings. A low score does not mean a place is safe.'}</p>
    <p className="model-status" role="status">{report ? `${report.location} · ${report.prediction_date}${expired ? (ms ? ' · Laporan tamat tempoh' : ' · Expired report') : ''}` : (ms ? 'Data model automatik tidak tersedia. Anda boleh memuatkan laporan yang telah diuji.' : 'Automatic model data unavailable. You can load a tested report.')}</p>
    {loading && <p role="status">{ms ? 'Membaca sejarah cuaca dan menguji model…' : 'Reading weather history and testing models…'}</p>}
    {automatic && <p className="model-source">{ms ? 'Model bermusim untuk Shah Alam sahaja. Data ERA5 ialah anggaran analisis semula, bukan bacaan stesen. Tidak mengesan ribut atau banjir esok.' : 'Seasonal model for Shah Alam only. ERA5 data is reanalysis estimates, not station readings. This does not detect tomorrow’s storms or floods.'} <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">Open-Meteo / ERA5 · CC BY 4.0 ↗</a></p>}
    <div className="model-grid">{keys.map((key, i) => {
      const t = report?.targets[key]; const usable = t?.available && !expired;
      return <article className="model-card" key={key}><div className="model-card-top"><span className="model-icon"><ModelIcon index={i} /></span><span className="model-index">0{i + 1}</span></div><h4>{labels[i]}</h4><strong>{usable ? (key.endsWith('observed') ? `${t.next_day_prediction!.toFixed(2)} / 1` : `${t.next_day_prediction!.toFixed(1)} ${i === 0 ? '°C' : 'mm'}`) : '—'}</strong><p>{usable ? (key.endsWith('observed') ? (ms ? 'Skor eksperimen, bukan kebarangkalian' : 'Experimental score, not a probability') : (ms ? 'Anggaran hari berikutnya' : 'Next-day estimate')) : (ms ? 'Anggaran tidak tersedia' : 'Estimate unavailable')}</p>{usable && <small>{key.endsWith('observed') ? 'Brier' : 'MAE'}: {t.model_error!.toFixed(3)} · {ms ? 'Asas' : 'Baseline'}: {t.baseline_error!.toFixed(3)}</small>}</article>;
    })}</div>
    <div className="model-upload-panel"><div><h4>{ms ? 'Mulakan dengan laporan anda' : 'Start with your report'}</h4><p>{ms ? 'Muatkan laporan yang telah dilatih dan diuji untuk mengisi kad di atas.' : 'Load a trained and tested report to populate the cards above.'}</p></div><label className="model-upload">{ms ? 'Muatkan forecast-report.json' : 'Load forecast-report.json'}<input type="file" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      setError(false); setReport(null); setAutomatic(false);
      try { if (file.size > 100000) throw new Error('large'); setReport(validate(JSON.parse(await file.text()))); } catch { setError(true); }
    }} /></label></div>
    {error && <p role="alert">{ms ? 'Laporan tidak sah. Gunakan fail daripada skrip latihan.' : 'Invalid report. Use the file produced by the training script.'}</p>}
    <small>{ms ? 'Fail dibaca dalam pelayar sahaja dan tidak disimpan. Muatkan semula selepas menyegarkan halaman.' : 'The file is read only in your browser and is not saved. Reload it after refreshing the page.'}</small>
  </section>;
}

