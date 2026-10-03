import type { RequestHandler } from 'express';
import { storeWeatherSnapshot } from './weather-storage.js';
import { z } from 'zod';

const forecast = z.object({ location: z.object({ location_id: z.string(), location_name: z.string() }), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), morning_forecast: z.string(), afternoon_forecast: z.string(), night_forecast: z.string(), summary_forecast: z.string(), summary_when: z.string(), min_temp: z.number().min(-50).max(60), max_temp: z.number().min(-50).max(60) });
const warning = z.object({ warning_issue: z.object({ issued: z.string(), title_bm: z.string(), title_en: z.string() }), valid_from: z.string().nullable(), valid_to: z.string().nullable(), heading_en: z.string(), text_en: z.string(), instruction_en: z.string().nullable().transform(value => value ?? ''), heading_bm: z.string(), text_bm: z.string(), instruction_bm: z.string().nullable().transform(value => value ?? '') });
export function createWeatherHandler(upstream: typeof fetch = fetch): RequestHandler {
  const cache = new Map<string, { expires: number; body: unknown }>();
  const inFlight = new Map<string, Promise<unknown>>();
  async function read(path: string, schema: z.ZodTypeAny) {
    try {
      const response = await upstream(`https://api.data.gov.my/weather/${path}`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('upstream unavailable');
      const body = await response.text();
      if (body.length > 1000000) throw new Error('response too large');
      return { available: true, records: schema.parse(JSON.parse(body)), fetchedAt: new Date().toISOString() };
    } catch { return { available: false, records: [], fetchedAt: null }; }
  }
  return async (req, res) => {
    const search = req.query.search;
    if (search !== undefined && (typeof search !== 'string' || search.trim().length < 2 || search.length > 80)) {
      res.status(400).json({ code: 'INVALID_LOCATION' }); return;
    }
    const key = typeof search === 'string' ? search.trim() : '';
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) { res.json(cached.body); return; }
    const query = new URLSearchParams({ contains: key ? key+'@location__location_name' : 'St@location__location_id', limit: '200' });
    let pending = inFlight.get(key);
    if (!pending) {
      pending = Promise.all([
        read('forecast?'+query.toString(), z.array(forecast).max(200)),
        read('warning?limit=100&sort=-warning_issue__issued', z.array(warning).max(100)),
      ]).then(async ([forecasts, warnings]) => {
        const body = { forecasts, warnings, source: 'METMalaysia via data.gov.my', sourceUrl: 'https://developer.data.gov.my/realtime-api/weather', license: 'CC BY 4.0', limited: forecasts.records.length === 200 };
        const archive = { status: key ? 'not-applicable' : await storeWeatherSnapshot(body) };
        const storedBody = { ...body, archive };
        if (cache.size > 50) cache.clear();
        cache.set(key, { expires: Date.now() + (forecasts.available && warnings.available ? 60000 : 10000), body: storedBody });
        return storedBody;
      }).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
    }
    res.json(await pending);
  };
}

