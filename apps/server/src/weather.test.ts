import express from 'express';
import supertest from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createWeatherHandler } from './weather.js';
const record = {location:{location_id:'St001',location_name:'Perlis'},date:'2026-10-03',morning_forecast:'Tiada Hujan',afternoon_forecast:'Hujan',night_forecast:'Tiada Hujan',summary_forecast:'Hujan',summary_when:'Petang',min_temp:25,max_temp:33};
describe('official weather integration',()=>{
 it('returns validated official data, caches requests, and accepts absent bulletin fields',async()=>{
  const upstream = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify([record]))).mockResolvedValueOnce(new Response(JSON.stringify([{warning_issue:{issued:'2026-10-03T13:00:00',title_bm:'Amaran',title_en:'Warning'},valid_from:null,valid_to:null,heading_en:'Warning',text_en:'Details',instruction_en:null,heading_bm:'Amaran',text_bm:'Butiran',instruction_bm:null}])));
  const app=express();app.get('/api/weather',createWeatherHandler(upstream));
  const result=await supertest(app).get('/api/weather');expect(result.body.forecasts.records[0]).toEqual(record);expect(result.body.warnings.available).toBe(true);expect(result.body.warnings.records[0].instruction_en).toBe('');await supertest(app).get('/api/weather');expect(upstream).toHaveBeenCalledTimes(2);
 });
 it('reports unavailable instead of substituting simulated data when upstream fails',async()=>{
  const upstream=vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));const app=express();app.get('/api/weather',createWeatherHandler(upstream));const result=await supertest(app).get('/api/weather');expect(result.body.forecasts).toEqual({available:false,records:[],fetchedAt:null});expect(result.body.warnings.available).toBe(false);
 });
 it('rejects unexpected upstream schemas',async()=>{const upstream=vi.fn<typeof fetch>().mockResolvedValue(new Response('[{"fake":true}]'));const app=express();app.get('/api/weather',createWeatherHandler(upstream));const result=await supertest(app).get('/api/weather');expect(result.body.forecasts.available).toBe(false);});
});
