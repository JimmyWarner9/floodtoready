import type { RequestHandler } from 'express';
import { z } from 'zod';

const forecast = z.object({ location: z.object({ location_id: z.string(), location_name: z.string() }), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), morning_forecast: z.string(), afternoon_forecast: z.string(), night_forecast: z.string(), summary_forecast: z.string(), summary_when: z.string(), min_temp: z.number(), max_temp: z.number() });
const warning = z.object({ warning_issue: z.object({ issued: z.string(), title_bm: z.string(), title_en: z.string() }), valid_from: z.string().nullable(), valid_to: z.string().nullable(), heading_en: z.string(), text_en: z.string(), instruction_en: z.string().nullable().transform(value => value ?? ''), heading_bm: z.string(), text_bm: z.string(), instruction_bm: z.string().nullable().transform(value => value ?? '') });
export function createWeatherHandler(upstream: typeof fetch = fetch): RequestHandler {
  let cached: { expires: number; body: unknown } | undefined;
  let pending: Promise<unknown> | undefined;
  async function read(path: string, schema: z.ZodTypeAny) {
    try {
      const response = await upstream(`https://api.data.gov.my/weather/${path}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('upstream unavailable');
      const body = await response.text();
      if (body.length > 1000000) throw new Error('response too large');
      return { available: true, records: schema.parse(JSON.parse(body)), fetchedAt: new Date().toISOString() };
    } catch { return { available: false, records: [], fetchedAt: null }; }
  }
  return (_req, res) => {
    if (cached && cached.expires > Date.now()) { res.json(cached.body); return; }
    pending ??= Promise.all([
      read('forecast?contains=St@location__location_id&limit=200', z.array(forecast).max(200)),
      read('warning?limit=100&sort=-warning_issue__issued', z.array(warning).max(100)),
    ]).then(([forecasts, warnings]) => {
      const body = { forecasts, warnings, source: 'METMalaysia via data.gov.my', sourceUrl: 'https://developer.data.gov.my/realtime-api/weather', license: 'CC BY 4.0' };
      cached = { expires: Date.now() + (forecasts.available && warnings.available ? 60000 : 10000), body };
      return body;
    }).finally(() => { pending = undefined; });
    void pending.then(body => res.json(body));
  };
}

