import { useEffect, useState } from 'react';
import { useLanguage } from './localization/LanguageProvider';
type Place={id:number;name:string;admin1?:string};
type Day={date:string;min:number;max:number;rainfall:number;rainChance:number|null;code:number};
type Forecast={location:Place;fetchedAt:string;days:Day[]};function ModelIcon({ index }: { index: number }) {
 const paths = [
 <><path d="M10 5a3 3 0 0 1 6 0v11a5 5 0 1 1-6 0Z" /><path d="M13 9v12" /></>,
 <><path d="M7 16a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4 4 0 0 1 0 9" /><path d="m8 21-1 3m8-3-1 3m8-3-1 3" /></>,
 <><path d="M7 16a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4 4 0 0 1 0 9" /><path d="m15 13-5 8h5l-3 7 9-11h-6l3-4" /></>,
 <><path d="m4 12 10-8 10 8M7 11v8m14-8v8M11 17v-5h6v5" /><path d="M3 23q3-4 6 0t6 0 6 0M3 28q3-4 6 0t6 0 6 0" /></>
 ];
 return <svg viewBox="0 0 30 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[index]}</svg>;
}
export function ModelPredictions(){
 const {language}=useLanguage();const ms=language==='ms';
 const [search,setSearch]=useState(''),[places,setPlaces]=useState<Place[]>([]),[id,setId]=useState<number|null>(null);
 const [forecast,setForecast]=useState<Forecast|null>(null),[loading,setLoading]=useState(true),[searching,setSearching]=useState(false),[error,setError]=useState('');
 const [dateIndex,setDateIndex]=useState(1);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setForecast(null);setError('');
  fetch('/api/predictions'+(id===null?'':'?id='+id),{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const body=await r.json() as Forecast;
   if(!Array.isArray(body.days)||body.days.length!==7||!body.location||typeof body.location.name!=='string'||body.days.some(d=>![d.min,d.max,d.rainfall,d.code].every(Number.isFinite)))throw Error();
   if(!controller.signal.aborted)setForecast(body);
  }).catch(()=>{if(!controller.signal.aborted)setError(ms?'Ramalan tidak tersedia. Cuba pilih tempat semula.':'Forecast unavailable. Try selecting the location again.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[id,ms]);
 const day=forecast?.days[dateIndex];
 const storm=day&&[95,96,99].includes(day.code);
 return <section className="model-section" aria-labelledby="model-heading">
  <div className="section-eyebrow">{ms?'RAMALAN CUACA · LOKASI MALAYSIA':'WEATHER FORECAST · MALAYSIAN LOCATIONS'}</div>
  <h3 id="model-heading">{ms?'Cuaca di tempat anda':'Weather where you are'}</h3>
  <p>{ms?'Ramalan model cuaca semasa untuk tempat yang dipilih. Cari bandar atau pekan di Malaysia. Ramalan ini berasingan daripada amaran rasmi METMalaysia.':'Current weather model forecasts for your selected place. Search Malaysian cities and towns. These forecasts are separate from official METMalaysia warnings.'}</p>
  <label className="forecast-select">{ms ? 'Pilihan wilayah Malaysia' : 'Malaysian region shortcuts'}
   <select defaultValue="" onChange={async e=>{
    const town=e.target.value;if(!town)return;setSearch(town);setSearching(true);setPlaces([]);setError('');
    try{const r=await fetch('/api/predictions?search='+encodeURIComponent(town),{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const body=await r.json() as {locations:Place[]};if(!Array.isArray(body.locations)||!body.locations.length)throw Error();setPlaces(body.locations);setId(body.locations[0]!.id);setDateIndex(1);}
    catch{setError(ms?'Lokasi tidak tersedia. Cuba carian di bawah.':'Location unavailable. Try searching below.');}finally{setSearching(false);}
   }}>
    <option value="">{ms ? 'Pilih negeri / wilayah' : 'Choose a state / territory'}</option>
    <optgroup label={ms ? 'Pantai Timur Semenanjung' : 'East Coast · Peninsular Malaysia'}>
     <option value="Kota Bharu">Kelantan · Kota Bharu</option><option value="Kuala Terengganu">Terengganu · Kuala Terengganu</option><option value="Kuantan">Pahang · Kuantan</option>
    </optgroup>
    <optgroup label={ms ? 'Semenanjung · negeri lain' : 'Peninsular Malaysia · other states'}>
     <option value="Kangar">Perlis · Kangar</option><option value="Alor Setar">Kedah · Alor Setar</option><option value="George Town">Pulau Pinang · George Town</option><option value="Ipoh">Perak · Ipoh</option><option value="Shah Alam">Selangor · Shah Alam</option><option value="Seremban">Negeri Sembilan · Seremban</option><option value="Melaka">Melaka</option><option value="Johor Bahru">Johor · Johor Bahru</option><option value="Kuala Lumpur">W.P. Kuala Lumpur</option><option value="Putrajaya">W.P. Putrajaya</option>
    </optgroup>
    <optgroup label={ms ? 'Malaysia Timur' : 'East Malaysia'}>
     <option value="Kota Kinabalu">Sabah · Kota Kinabalu</option><option value="Kuching">Sarawak · Kuching</option><option value="Labuan">W.P. Labuan</option>
    </optgroup>
   </select>
  </label>
  <small>{ms ? 'Pilihan negeri membuka ramalan bandar yang tertera. Cari bandar lain di bawah untuk lokasi yang lebih dekat.' : 'State shortcuts open forecasts for the named town. Search below for a town closer to you.'}</small>
  <form className="forecast-search" onSubmit={async e=>{
   e.preventDefault();setSearching(true);setPlaces([]);setError('');
   try{const r=await fetch('/api/predictions?search='+encodeURIComponent(search.trim()),{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const body=await r.json() as {locations:Place[]};if(!Array.isArray(body.locations))throw Error();setPlaces(body.locations);if(!body.locations.length)setError(ms?'Tempat tidak ditemui. Cuba bandar berdekatan.':'Place not found. Try a nearby town.');}
   catch{setError(ms?'Carian tidak tersedia. Cuba lagi.':'Search unavailable. Try again.');}finally{setSearching(false);}
  }}>
   <label htmlFor="forecast-place">{ms?'Cari tempat':'Search a place'}</label>
   <div><input id="forecast-place" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kuala Lumpur, Johor Bahru, Kuching…" minLength={2} maxLength={80} required/><button disabled={searching}>{searching?(ms?'Mencari…':'Searching…'):(ms?'Cari':'Search')}</button></div>
  </form>
  {places.length>0&&<label className="forecast-select">{ms?'Pilih padanan lokasi':'Choose a matching location'}<select value={id??''} onChange={e=>{if(e.target.value){setId(Number(e.target.value));setDateIndex(1);}}}><option value="">{ms?'Pilih tempat':'Select a place'}</option>{places.map(p=><option key={p.id} value={p.id}>{p.name}{p.admin1?' · '+p.admin1:''}</option>)}</select></label>}
  {loading&&<p role="status">{ms?'Memuatkan ramalan semasa…':'Loading current forecasts…'}</p>}
  {error&&<p role="alert">{error}</p>}
  {forecast&&<><p className="model-status">{forecast.location.name} · {forecast.location.admin1} · {ms?'Diperoleh':'Retrieved'} {new Date(forecast.fetchedAt).toLocaleString(ms?'ms-MY':'en-MY',{timeZone:'Asia/Kuala_Lumpur'})} MYT</p>
   <label className="forecast-select">{ms?'Tarikh ramalan':'Forecast date'}<select value={dateIndex} onChange={e=>setDateIndex(Number(e.target.value))}>{forecast.days.map((d,i)=><option key={d.date} value={i}>{d.date}{i===0?(ms?' · Hari ini':' · Today'):i===1?(ms?' · Esok':' · Tomorrow'):''}</option>)}</select></label></>}
  <div className="model-grid">{(ms?['Suhu','Hujan','Ribut petir','Kejadian banjir']:['Temperature','Rainfall','Thunderstorms','Flood events']).map((label,i)=><article className="model-card" key={label}>
   <div className="model-card-top"><span className="model-icon"><ModelIcon index={i}/></span><span className="model-index">0{i+1}</span></div><h4>{label}</h4>
   <strong>{!day?'—':i===0?day.min.toFixed(0)+'–'+day.max.toFixed(0)+' °C':i===1?day.rainfall.toFixed(1)+' mm':i===2?(storm?(ms?'Diramal':'Forecast'):(ms?'Tidak ditunjukkan':'Not indicated')):'—'}</strong>
   <p>{i===0?(ms?'Minimum–maksimum harian':'Daily minimum–maximum'):i===1?(ms?'Jumlah hujan harian':'Daily precipitation total'):i===2?(ms?'Berdasarkan kod cuaca model; bukan amaran':'From model weather code; not a warning'):(ms?'Ramalan banjir setempat tidak tersedia.':'Local flood prediction unavailable.')}</p>
   {day&&i===1&&<small>{ms?'Peluang hujan':'Precipitation chance'}: {day.rainChance===null?(ms?'Tidak tersedia':'Unavailable'):day.rainChance+'%'}</small>}
  </article>)}</div>
  <small>{ms?'Sumber: ':'Source: '}<a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo · CC BY 4.0 ↗</a> · {ms?'Ramalan untuk titik lokasi, bukan seluruh negeri. Ketiadaan ribut dalam model tidak menjamin cuaca selamat. Semak amaran rasmi.':'Forecasts cover a location point, not an entire state. Absence of modelled thunderstorms does not guarantee safe weather. Check official warnings.'}</small>
 </section>;
}