import type { RequestHandler } from 'express';
import { z } from 'zod';
const place = z.object({id:z.number().int(),name:z.string().max(150),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),country_code:z.literal('MY'),admin1:z.string().optional()});
const daySchema=z.object({time:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).length(7),temperature_2m_max:z.array(z.number().min(-50).max(60)).length(7),temperature_2m_min:z.array(z.number().min(-50).max(60)).length(7),precipitation_sum:z.array(z.number().min(0).max(2000)).length(7),precipitation_probability_max:z.array(z.number().min(0).max(100).nullable()).length(7),weather_code:z.array(z.number().int()).length(7)});
export function createModelPredictionsHandler(upstream: typeof fetch=fetch): RequestHandler {
 const cache=new Map<string,{expires:number;body:unknown}>();
 async function read(url:URL) {
  const response=await upstream(url,{signal:AbortSignal.timeout(5000),redirect:'error'});
  if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('upstream');
  const text=await response.text();if(text.length>200000)throw Error('size');return JSON.parse(text);
 }
 return async(req,res)=>{
  try {
   const query=req.query.search, id=req.query.id;
   if(query!==undefined && (typeof query!=='string'||query.trim().length<2||query.length>80)){res.status(400).json({code:'INVALID_LOCATION'});return;}
   if(id!==undefined && (typeof id!=='string'||!/^\d{1,10}$/.test(id))){res.status(400).json({code:'INVALID_LOCATION'});return;}
   const key=query!==undefined?'search:'+query:'id:'+(id??'default');
   const saved=cache.get(key);if(saved&&saved.expires>Date.now()){res.json(saved.body);return;}
   let selected={id:0,name:'Shah Alam',latitude:3.0738,longitude:101.5183,country_code:'MY' as const,admin1:'Selangor'};
   if(typeof query==='string'){
    const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:query.trim(),countryCode:'MY',count:'10',language:'en',format:'json'}).toString();
    const raw=await read(url);const locations=z.array(z.unknown()).max(10).parse(raw.results??[]).flatMap(v=>{const parsed=place.safeParse(v);return parsed.success?[parsed.data]:[];});
    const body={locations};if(cache.size>100)cache.clear();cache.set(key,{expires:Date.now()+3600000,body});res.json(body);return;
   }
   if(typeof id==='string'){
    const url=new URL('https://geocoding-api.open-meteo.com/v1/get');url.search=new URLSearchParams({id}).toString();
    const parsed=place.safeParse(await read(url));if(!parsed.success){res.status(404).json({code:'LOCATION_NOT_FOUND'});return;}selected={...parsed.data,admin1:parsed.data.admin1??''};
   }
   const url=new URL('https://api.open-meteo.com/v1/forecast');
   url.search=new URLSearchParams({latitude:String(selected.latitude),longitude:String(selected.longitude),daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code',timezone:'Asia/Kuala_Lumpur',forecast_days:'7'}).toString();
   const raw=await read(url),daily=daySchema.parse(raw.daily);
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   if(daily.time[0]!==today||daily.time.some((v,i)=>i>0&&Date.parse(v)-Date.parse(daily.time[i-1]!)!==86400000))throw Error('stale');
   const body={location:selected,source:'Open-Meteo numerical weather forecast',sourceUrl:'https://open-meteo.com/en/docs',license:'CC BY 4.0',fetchedAt:new Date().toISOString(),days:daily.time.map((date,i)=>({date,min:daily.temperature_2m_min[i],max:daily.temperature_2m_max[i],rainfall:daily.precipitation_sum[i],rainChance:daily.precipitation_probability_max[i],code:daily.weather_code[i]})),floodAvailable:false};
   if(cache.size>100)cache.clear();cache.set(key,{expires:Date.now()+900000,body});res.setHeader('Cache-Control','public, s-maxage=900');res.json(body);
  }catch{res.status(503).json({available:false,code:'FORECAST_UNAVAILABLE'});}
 };
}
