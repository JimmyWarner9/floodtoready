import { useEffect, useState } from 'react';
import { useLanguage } from './localization/LanguageProvider';
export function RainfallScenario({ rainfall, location, date }: { rainfall: number; location: string; date: string }) {
 const { language } = useLanguage(); const ms = language === 'ms';
 const [rain, setRain] = useState(rainfall); const [hours, setHours] = useState(24); const [drain, setDrain] = useState(0);
 useEffect(() => { setRain(rainfall); setHours(24); setDrain(0); }, [rainfall, location, date]);
 const retained = Math.max(0, rain - drain * hours);
 const changed = rain !== rainfall;
 return <section className="rain-scenario" aria-labelledby="scenario-heading">
  <div className="section-eyebrow">{ms ? 'SENARIO 3D · SIMULASI' : '3D SCENARIO · SIMULATION'}</div>
  <h4 id="scenario-heading">{ms ? 'Bagaimana hujan dan saliran berinteraksi' : 'How rainfall and drainage interact'}</h4>
  <p>{location} · {date} · {ms ? 'Jumlah hujan ramalan' : 'Forecast precipitation total'}: <strong>{rainfall.toFixed(1)} mm</strong></p>
  <div className="scenario-layout"><div>
   <div className="scenario-scene" aria-hidden="true">
    <div className="scenario-cloud">☁</div>
    <div className={`scenario-rain ${rain > 0 ? 'is-raining' : ''}`}>{Array.from({length:12},(_,i)=><i key={i} style={{left: `${8+i*7}%`, animationDelay: `${i*.13}s`}} />)}</div>
    <div className="scenario-ground"><div className="scenario-road" /><div className="scenario-house house-one" /><div className="scenario-house house-two" /><div className="scenario-house house-three" /><div className="scenario-water" style={{opacity:retained>0?.6:0,transform:`translateZ(${Math.min(retained,150)*.25}px)`}} /></div>
   </div>
   <small>{ms ? 'Kawasan rata rekaan. Saiz rumah dan air dibesarkan untuk ilustrasi; bukan peta atau kedalaman banjir sebenar.' : 'Illustrative flat terrain. Houses and water are exaggerated; this is not a map or actual flood depth.'}</small>
  </div><div className="scenario-controls">
   <label>{ms ? 'Jumlah hujan senario' : 'Scenario rainfall total'} <strong>{rain.toFixed(1)} mm</strong><input type="range" min="0" max={Math.max(300,Math.ceil(rainfall))} step="0.1" value={rain} onChange={e=>setRain(Number(e.target.value))}/></label>
   <label>{ms ? 'Tempoh senario' : 'Scenario duration'} <strong>{hours} {ms?'jam':'hours'}</strong><input type="range" min="1" max="24" value={hours} onChange={e=>setHours(Number(e.target.value))}/></label>
   <label>{ms ? 'Saliran andaian' : 'Assumed drainage'} <strong>{drain.toFixed(1)} mm/h</strong><input type="range" min="0" max="20" step="0.1" value={drain} onChange={e=>setDrain(Number(e.target.value))}/></label>
   <p className="scenario-result" role="status">{ms ? 'Baki air dalam simulasi' : 'Water retained in simulation'}: <strong>{retained.toFixed(1)} mm</strong><br/>{changed ? (ms?'Jumlah hujan diubah oleh anda.':'Rainfall total changed by you.') : (ms?'Jumlah hujan menggunakan ramalan semasa.':'Rainfall total uses the current forecast.')}</p>
   <button type="button" onClick={()=>{setRain(rainfall);setHours(24);setDrain(0);}}>{ms?'Tetapkan semula':'Reset scenario'}</button>
  </div></div>
  <details><summary>{ms?'Andaian & had simulasi':'Simulation assumptions & limits'}</summary><p>{ms?'Baki = maksimum(0, jumlah hujan − saliran × tempoh). Hujan dianggap sekata, tanpa air sungai, aliran dari hulu, tanah, resapan atau pasang surut. Tempoh ialah andaian, bukan masa hujan yang diramal. Saliran bukan bacaan sebenar.':'Retained water = max(0, rainfall total − drainage × duration). Rainfall is uniform, with no rivers, upstream inflow, soil, infiltration or tides. Duration is an assumption, not forecast rain timing. Drainage is not a measured value.'}</p></details>
  <p className="scenario-limit">{ms?'Ini bukan ramalan banjir, amaran atau pengesahan keselamatan. Data sungai dan model rupa bumi setempat diperlukan untuk meramal banjir sebenar. Semak amaran METMalaysia dan JPS.':'This is not a flood forecast, warning or safety assessment. River data and local terrain modelling are required for actual flood prediction. Check METMalaysia and JPS warnings.'} <a href="https://publicinfobanjir.water.gov.my/" target="_blank" rel="noreferrer">JPS ↗</a></p>
 </section>;
}
