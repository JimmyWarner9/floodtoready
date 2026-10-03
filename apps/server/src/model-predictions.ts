import type { RequestHandler } from 'express';
// Seasonal ridge baseline: no invented flood or storm event labels.
const point = { latitude: 3.0738, longitude: 101.5183 }; // Shah Alam, not all Selangor
function features(day: string) {
  const t = Date.parse(day + 'T00:00:00Z') / 86400000;
  return [1, ...[1, 2, 3].flatMap(k => [Math.sin(2*Math.PI*k*t/365.25), Math.cos(2*Math.PI*k*t/365.25)])];
}
function fit(days: string[], values: number[]) {
  const x = days.map(features); const n = 7;
  const a = Array.from({length:n},(_,i)=>Array.from({length:n+1},(_,j)=>j === n ? x.reduce((s,r,k)=>s+r[i]!*values[k]!,0) : x.reduce((s,r)=>s+r[i]!*r[j]!,0)+(i===j && i>0 ? 1 : 0)));
  for(let k=0;k<n;k++) {
    const pivot = a[k]![k]!; if(Math.abs(pivot)<1e-10) throw new Error('fit');
    a[k] = a[k]!.map(v=>v/pivot);
    for(let i=0;i<n;i++) if(i!==k) { const f=a[i]![k]!; a[i]=a[i]!.map((v,j)=>v-f*a[k]![j]!); }
  }
  return a.map(r=>r[n]!);
}
export function createModelPredictionsHandler(upstream: typeof fetch = fetch): RequestHandler {
  let cached: { expires: number; body: unknown } | undefined;
  return async (_req, res) => {
    if(cached && cached.expires>Date.now()) { res.json(cached.body); return; }
    try {
      const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      const end = new Date(Date.parse(today+'T00:00:00Z')-10*86400000).toISOString().slice(0,10);
      const start = new Date(Date.parse(end+'T00:00:00Z')-1095*86400000).toISOString().slice(0,10);
      const url = new URL('https://archive-api.open-meteo.com/v1/archive');
      url.search = new URLSearchParams({...Object.fromEntries(Object.entries(point).map(([k,v])=>[k,String(v)])),start_date:start,end_date:end,daily:'temperature_2m_mean,precipitation_sum',timezone:'Asia/Kuala_Lumpur',models:'era5'}).toString();
      const response = await upstream(url,{signal:AbortSignal.timeout(8000),redirect:'error'});
      if(!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('upstream');
      const raw = await response.text(); if(raw.length>500000) throw new Error('size');
      const data = JSON.parse(raw).daily as {time:string[];temperature_2m_mean:number[];precipitation_sum:number[]};
      if(!data || !Array.isArray(data.time) || data.time.length<1000 || data.time.length>1100) throw new Error('data');
      for(const key of ['temperature_2m_mean','precipitation_sum'] as const) {
        if(!Array.isArray(data[key]) || data[key].length!==data.time.length || data[key].some(v=>typeof v!=='number'||!Number.isFinite(v))) throw new Error('values');
      }
      if(data.time.some((d,i)=>!/^\d{4}-\d{2}-\d{2}$/.test(d)|| (i>0 && Date.parse(d)-Date.parse(data.time[i-1]!)!==86400000))) throw new Error('dates');
      if(data.precipitation_sum.some(v=>v<0)||data.temperature_2m_mean.some(v=>v < -50 || v>60)) throw new Error('range');
      const next = new Date(Date.parse(today+'T00:00:00Z')+86400000).toISOString().slice(0,10);
      const targets: Record<string,unknown> = {storm_observed:{available:false,reason:'No verified storm event observations'},flood_observed:{available:false,reason:'River levels and flood event observations required'}};
      const split=Math.floor(data.time.length*.8);
      for(const [target,column] of [['temperature_c','temperature_2m_mean'],['rainfall_mm','precipitation_sum']] as const) {
        const values=data[column], trainDays=data.time.slice(0,split), trainValues=values.slice(0,split);
        const weights=fit(trainDays,trainValues);
        const predict=(d:string,w:number[])=>{const v=features(d).reduce((s,x,i)=>s+x*w[i]!,0);return target==='rainfall_mm'?Math.max(0,v):v;};
        const monthly = Array.from({length:12},(_,month)=>trainValues.filter((_,i)=>Number(trainDays[i]!.slice(5,7))===month+1));
        const means=monthly.map(v=>v.reduce((s,x)=>s+x,0)/v.length);
        let error=0,baseline=0;
        for(let i=split;i<values.length;i++){error+=Math.abs(predict(data.time[i]!,weights)-values[i]!);baseline+=Math.abs(means[Number(data.time[i]!.slice(5,7))-1]!-values[i]!);}
        error/=values.length-split;baseline/=values.length-split;
        targets[target]={available:error<baseline,model_error:error,baseline_error:baseline,next_day_prediction:error<baseline?predict(next,fit(data.time,values)):null,reason:error<baseline?'Seasonal experimental estimate':'Did not beat monthly seasonal baseline'};
      }
      const body={experimental:true,location:'Shah Alam · seasonal model / model bermusim',prediction_date:next,source:'Open-Meteo / ERA5 reanalysis',sourceUrl:'https://open-meteo.com/en/docs/historical-weather-api',license:'CC BY 4.0',fetchedAt:new Date().toISOString(),history_start:start,history_end:end,method:'Seasonal ridge regression; chronological 80/20 holdout; monthly baseline',targets};
      cached={expires:Date.now()+3600000,body};res.setHeader('Cache-Control','public, s-maxage=3600');res.json(body);
    } catch {res.status(503).json({available:false,code:'MODEL_DATA_UNAVAILABLE'});}
  };
}
