import { useState } from 'react';
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
export function ModelPredictions() {
  const { language } = useLanguage(); const ms = language === 'ms';
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const expired = !!report && report.prediction_date < today;
  const labels = ms ? ['Suhu', 'Hujan', 'Ribut petir', 'Kejadian banjir'] : ['Temperature', 'Rainfall', 'Thunderstorms', 'Flood events'];
  return <section className="model-section" aria-labelledby="model-heading">
    <div className="section-eyebrow">{ms ? 'PEMBELAJARAN MESIN · EKSPERIMEN' : 'MACHINE LEARNING · EXPERIMENTAL'}</div>
    <h3 id="model-heading">{ms ? 'Corak hari ini, pandangan esok' : 'Today’s patterns, tomorrow’s outlook'}</h3>
    <p>{ms ? 'Anggaran penyelidikan daripada data sejarah. Bukan ramalan atau amaran rasmi. Skor rendah tidak bermaksud sesuatu tempat selamat.' : 'Research estimates from historical data. These are not official forecasts or warnings. A low score does not mean a place is safe.'}</p>
    <p className="model-status" role="status">{report ? `${report.location} · ${report.prediction_date}${expired ? (ms ? ' · Laporan tamat tempoh' : ' · Expired report') : ''}` : (ms ? 'Model belum dilatih. Muatkan laporan model yang telah diuji untuk melihat anggaran.' : 'No trained model loaded. Load a tested model report to view estimates.')}</p>
    <div className="model-grid">{keys.map((key, i) => {
      const t = report?.targets[key]; const usable = t?.available && !expired;
      return <article className="model-card" key={key}><span className="model-index">0{i + 1}</span><h4>{labels[i]}</h4><strong>{usable ? (key.endsWith('observed') ? `${t.next_day_prediction!.toFixed(2)} / 1` : `${t.next_day_prediction!.toFixed(1)} ${i === 0 ? '°C' : 'mm'}`) : '—'}</strong><p>{usable ? (key.endsWith('observed') ? (ms ? 'Skor eksperimen, bukan kebarangkalian' : 'Experimental score, not a probability') : (ms ? 'Anggaran hari berikutnya' : 'Next-day estimate')) : (ms ? 'Anggaran tidak tersedia' : 'Estimate unavailable')}</p>{usable && <small>{key.endsWith('observed') ? 'Brier' : 'MAE'}: {t.model_error!.toFixed(3)} · {ms ? 'Asas' : 'Baseline'}: {t.baseline_error!.toFixed(3)}</small>}</article>;
    })}</div>
    <label className="model-upload">{ms ? 'Muatkan forecast-report.json' : 'Load forecast-report.json'}<input type="file" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      setError(false); setReport(null);
      try { if (file.size > 100000) throw new Error('large'); setReport(validate(JSON.parse(await file.text()))); } catch { setError(true); }
    }} /></label>
    {error && <p role="alert">{ms ? 'Laporan tidak sah. Gunakan fail daripada skrip latihan.' : 'Invalid report. Use the file produced by the training script.'}</p>}
    <small>{ms ? 'Fail dibaca dalam pelayar sahaja dan tidak disimpan. Muatkan semula selepas menyegarkan halaman.' : 'The file is read only in your browser and is not saved. Reload it after refreshing the page.'}</small>
  </section>;
}
