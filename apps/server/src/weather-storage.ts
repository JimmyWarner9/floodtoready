import { createHash } from 'node:crypto';
export async function storeWeatherSnapshot(body: { forecasts: { available: boolean; records: unknown[]; fetchedAt: string | null }; warnings: { available: boolean; records: unknown[] }; source: string; sourceUrl: string; license: string }, upstream: typeof fetch = fetch): Promise<'saved' | 'disabled' | 'unavailable'> {
 const url = process.env.SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY;
 if (!url || !secret) return 'disabled';
 if (!body.forecasts.available || !body.forecasts.records.length || !body.forecasts.fetchedAt) return 'unavailable';
 try {
  const base = new URL(url);
  if (base.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(base.hostname) || base.username || base.password) return 'unavailable';
  const forecastDate = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kuala_Lumpur', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(body.forecasts.fetchedAt));
  // Same forecast payload on the same retrieval day is inserted only once.
  const hash = createHash('sha256').update(JSON.stringify(body.forecasts.records)).digest('hex');
  const response = await upstream(new URL('/rest/v1/met_weather_snapshots?on_conflict=snapshot_key', base), {
   method:'POST', redirect:'error', signal:AbortSignal.timeout(2500),
   headers:{apikey:secret,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},
   body:JSON.stringify({snapshot_key:forecastDate+'-'+hash,retrieved_at:body.forecasts.fetchedAt,source:body.source,source_url:body.sourceUrl,license:body.license,record_type:'official_forecast_not_observation',forecast_records:body.forecasts.records,warning_records:body.warnings.available?body.warnings.records:[],warnings_available:body.warnings.available}),
  });
  return response.ok?'saved':'unavailable';
 } catch { return 'unavailable'; }
}
