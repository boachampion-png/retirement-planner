'use client';
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ══════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ══════════════════════════════════════════════════════════════
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

// ══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════
const $M  = n => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${Math.round(n)}`;
const $F  = n => `$${Math.round(n).toLocaleString()}`;
const pct = n => `${(n*100).toFixed(1)}%`;

function Inp({ value, onChange, prefix, suffix, step=100, min=0 }) {
  return (
    <div style={{ position:"relative" }}>
      {prefix && <span style={{ position:"absolute", left:7, top:"50%", transform:"translateY(-50%)", color:"#6e7681", fontSize:11, pointerEvents:"none", zIndex:1 }}>{prefix}</span>}
      <input type="number" value={value} step={step} min={min} onChange={e => onChange(Number(e.target.value))}
        style={{ width:"100%", background:"#080c10", border:"1px solid #21262d", borderRadius:3,
                 color:"#e6b84a", fontFamily:"'DM Mono',monospace", fontSize:14,
                 padding: prefix ? "8px 6px 8px 18px" : suffix ? "8px 22px 8px 6px" : "8px 6px", outline:"none",
                 WebkitAppearance:"none", touchAction:"manipulation" }} />
      {suffix && <span style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", color:"#6e7681", fontSize:11, pointerEvents:"none" }}>{suffix}</span>}
    </div>
  );
}

function Field({ label, value, onChange, prefix="$", step=1000, min=0, hint, disabled=false }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:9, color: disabled ? "#3d444d" : "#6e7681", letterSpacing:".1em" }}>{label}</label>
      <div style={{ position:"relative" }}>
        {prefix && <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#6e7681", fontSize:12, pointerEvents:"none", zIndex:1 }}>{prefix}</span>}
        <input type="number" value={value} step={step} min={min} disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width:"100%", background: disabled ? "#060809" : "#0a0e12", border:"1px solid #30363d", borderRadius:4,
                   color: disabled ? "#4d5563" : "#e6b84a", fontFamily:"'DM Mono',monospace", fontSize:14,
                   padding: prefix ? "10px 8px 10px 20px" : "10px 8px", outline:"none",
                   WebkitAppearance:"none", touchAction:"manipulation" }} />
      </div>
      {hint && <div style={{ fontSize:9, color:"#3d444d", marginTop:1 }}>{hint}</div>}
    </div>
  );
}

const ChartTip = ({ active, payload, label, showTotal=true }) => {
  if (!active || !payload?.length) return null;
  const tot = payload.reduce((a, b) => a + b.value, 0);
  return (
    <div style={{ background:"#0d1117", border:"1px solid #30363d", borderRadius:5, padding:"10px 14px", fontSize:11, fontFamily:"DM Mono,monospace" }}>
      <div style={{ color:"#e6b84a", marginBottom:7 }}>Age {label}</div>
      {[...payload].reverse().map(p => <div key={p.name} style={{ color:p.color||p.stroke, marginBottom:2 }}>{p.name}: {$M(p.value)}</div>)}
      {showTotal && <div style={{ borderTop:"1px solid #30363d", marginTop:6, paddingTop:6, color:"#f0f6fc", fontWeight:500 }}>Total: {$M(tot)}</div>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PHASE 1 — ACCUMULATION ENGINE
// ══════════════════════════════════════════════════════════════
const BUCKET_DEFS = [
  { id:"cash",   label:"Cash",      icon:"◈", color:"#94a3b8" },
  { id:"k401",   label:"401(k)",    icon:"◆", color:"#e6b84a" },
  { id:"roth",   label:"Roth IRA",  icon:"◆", color:"#4a9fe6" },
  { id:"brok",   label:"Brokerage", icon:"◆", color:"#4ae6a0" },
  { id:"crypto", label:"Crypto",    icon:"◈", color:"#e64a6e" },
  { id:"s529a",  label:"529 Kid 1", icon:"◈", color:"#f97316" },
  { id:"s529b",  label:"529 Kid 2", icon:"◈", color:"#fb923c" },
];

const mkC = (wA=0,wS=43,wE=55, mA=0,mS=43,mE=55, aA=0,aS=43,aE=55) => ({
  weekly:   {amt:wA, startAge:wS, endAge:wE},
  monthly:  {amt:mA, startAge:mS, endAge:mE},
  annually: {amt:aA, startAge:aS, endAge:aE},
});

const DEFAULT_BUCKETS = {
  cash:   { balance:0,         growthRate:2, basisPct:100, contrib: mkC() },
  k401:   { balance:1_100_000, growthRate:7, basisPct:0,   contrib: mkC(0,43,55, 0,43,55, 55000,43,55) },
  roth:   { balance:44_000,    growthRate:7, basisPct:100, contrib: mkC(0,43,55, 1250,43,55, 0,43,55) },
  brok:   { balance:300_000,   growthRate:7, basisPct:63,  contrib: mkC(1400,43,55, 1800,46,55, 50000,51,55) },
  crypto: { balance:23_000,    growthRate:7, basisPct:50,  contrib: mkC(0,43,55, 0,43,55, 0,43,55) },
  s529a:  { balance:0,         growthRate:6, basisPct:100, contrib: mkC(0,43,55, 0,43,55, 0,43,55) },
  s529b:  { balance:0,         growthRate:6, basisPct:100, contrib: mkC(0,43,55, 0,43,55, 0,43,55) },
};

function accumSimulate(buckets, currentAge, retireAge, lumpSums={}) {
  const ids  = BUCKET_DEFS.map(b => b.id);
  let bals   = Object.fromEntries(ids.map(id => [id, buckets[id].balance]));
  let bases  = Object.fromEntries(ids.map(id => [id, buckets[id].balance * (buckets[id].basisPct/100)]));
  const rows = [];

  for (let y = 0; y < Math.max(1, retireAge - currentAge); y++) {
    const age      = currentAge + y;
    const nextBals = {}, nextBases = {};
    const lump     = lumpSums[age] || 0;

    for (const id of ids) {
      const bk = buckets[id];
      const r  = bk.growthRate / 100;
      const c  = bk.contrib;
      let contrib = 0;
      if (age >= c.weekly.startAge   && age <= (c.weekly.endAge  ??99) && c.weekly.amt   > 0) contrib += c.weekly.amt   * 52;
      if (age >= c.monthly.startAge  && age <= (c.monthly.endAge ??99) && c.monthly.amt  > 0) contrib += c.monthly.amt  * 12;
      if (age >= c.annually.startAge && age <= (c.annually.endAge??99) && c.annually.amt > 0) contrib += c.annually.amt;
      if (id === 'brok') contrib += lump;
      nextBals[id]  = bals[id]  * (1+r) + contrib * (1+r/2);
      nextBases[id] = bases[id] + contrib; // contributions are 100% basis
    }
    bals  = nextBals;
    bases = nextBases;

    const total       = ids.reduce((s,id) => s + bals[id], 0);
    const total529ex  = ids.filter(id=>!['s529a','s529b'].includes(id)).reduce((s,id)=>s+bals[id],0);
    rows.push({
      age: age+1,
      ...Object.fromEntries(ids.map(id=>[id, Math.round(bals[id])])),
      ...Object.fromEntries(ids.map(id=>[`${id}Basis`, Math.round(bases[id])])),
      total: Math.round(total),
      total529ex: Math.round(total529ex),
    });
  }
  return rows;
}

function BucketCard({ def, data, onChange, showAll, isMobile=false }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { setOpen(showAll); }, [showAll]);
  const set = (path, val) => {
    const next = JSON.parse(JSON.stringify(data));
    const parts = path.split(".");
    let obj = next;
    for (let i = 0; i < parts.length-1; i++) obj = obj[parts[i]];
    obj[parts[parts.length-1]] = val;
    onChange(next);
  };
  return (
    <div style={{ background:"#0d1117", border:"1px solid #21262d", borderTop:`2px solid ${def.color}`, borderRadius:6, overflow:"hidden" }}>
      <button onClick={() => setOpen(v=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 13px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:def.color }}>{def.icon}</span>
          <span style={{ color:"#f0f6fc", fontSize:12, fontWeight:500 }}>{def.label}</span>
          <span style={{ color:"#6e7681", fontSize:10 }}>{$M(data.balance)}</span>
        </div>
        <span style={{ color:"#6e7681", fontSize:10 }}>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ padding:"0 13px 13px", borderTop:"1px solid #161b22" }}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap:8, marginTop:10, marginBottom:10 }}>
            <div><div style={{ fontSize:8, color:"#6e7681", marginBottom:3 }}>BALANCE</div><Inp value={data.balance} onChange={v=>set("balance",v)} prefix="$" step={1000}/></div>
            <div><div style={{ fontSize:8, color:"#6e7681", marginBottom:3 }}>GROWTH %</div><Inp value={data.growthRate} onChange={v=>set("growthRate",v)} suffix="%" step={0.5}/></div>
            <div><div style={{ fontSize:8, color:"#6e7681", marginBottom:3 }}>BASIS %</div><Inp value={data.basisPct} onChange={v=>set("basisPct",v)} suffix="%" step={1}/></div>
          </div>
          <div style={{ fontSize:8, color:"#6e7681", marginBottom:5, letterSpacing:".08em" }}>CONTRIBUTIONS</div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "50px 1fr 1fr 1fr" : "55px 1fr 1fr 1fr", gap: isMobile ? "6px 5px" : "3px 6px", alignItems:"center" }}>
            <div style={{ fontSize:8, color:"#3d444d" }}></div>
            {["AMOUNT","START","END"].map(h=><div key={h} style={{ fontSize:8, color:"#3d444d", textAlign:"center" }}>{h}</div>)}
            {[{key:"weekly",lbl:"Weekly"},{key:"monthly",lbl:"Monthly"},{key:"annually",lbl:"Annual"}].map(({key,lbl})=>(
              <React.Fragment key={key}>
                <div style={{ fontSize:9, color:"#8b949e" }}>{lbl}</div>
                <Inp value={data.contrib[key].amt}      onChange={v=>set(`contrib.${key}.amt`,v)}      prefix="$" step={key==="annually"?1000:50}/>
                <Inp value={data.contrib[key].startAge} onChange={v=>set(`contrib.${key}.startAge`,v)} step={1} min={0}/>
                <Inp value={data.contrib[key].endAge??55} onChange={v=>set(`contrib.${key}.endAge`,v)} step={1} min={0}/>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE 2 — TAX STRATEGY ENGINE
// ══════════════════════════════════════════════════════════════
const STD_DED = 30000;
function ordTax(t) {
  const bands=[[23200,.10],[71100,.12],[106750,.22],[182850,.24],[Infinity,.32]];
  let tax=0,rem=Math.max(0,t);
  for(const[w,r] of bands){if(rem<=0)break;const a=Math.min(rem,w);tax+=a*r;rem-=a;}
  return tax;
}
function ltcgTax(g,ot) {
  if(g<=0)return 0;
  const at0=Math.min(g,Math.max(0,96700-ot)),at15=Math.min(g-at0,487050);
  return at15*.15+Math.max(0,g-at0-at15)*.20;
}
function taxCalc(ord,gains) {
  const ot=Math.max(0,ord-STD_DED);
  return {ordTaxable:ot,total:ordTax(ot)+ltcgTax(gains,ot)};
}
const RMD_DIV={73:26.5,74:25.5,75:24.6,76:23.7,77:22.9,78:22.0,79:21.1,80:20.2,81:19.4,82:18.5,83:17.7,84:16.8,85:16.0,86:15.2,87:14.4,88:13.7,89:12.9,90:12.2};
function randNorm(m,s){const u=1-Math.random(),v=Math.random();return m+s*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

function simPath(strat, cfg, overrides=null) {
  const {k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,retireAge=55} = cfg;
  let k401=k401Init,roth=rothInit,brok=brokInit,bBasis=brok*(brokBasisPct/100),crypto=cryptoInit;
  const rows=[];
  const dynCeiling=g=>Math.min(94300,Math.max(0,96700-g));

  for(let y=0;y<36;y++){
    const age=retireAge+y;
    const gr=overrides?overrides[y]:(growth/100);
    const ss=age>=ssStartAge?ssAmount:0;
    const ssTx=ss*.85;
    const grossSpend=withdrawal*(1+inflation/100)**y;
    const need=Math.max(0,grossSpend-ss);
    const gR=brok>0?Math.max(0,(brok-bBasis)/brok):0;
    const rmdRequired=age>=73&&RMD_DIV[age]?k401/RMD_DIV[age]:0;
    let w401=0,wRoth=0,wBrok=0,conv=0;

    if(strat==='brokFirst'){
      wBrok=Math.min(need,brok);wRoth=Math.min(need-wBrok,roth);w401=Math.min(need-wBrok-wRoth,k401);
      const g0=wBrok*gR;const{ordTaxable}=taxCalc(w401+ssTx,g0);
      conv=Math.min(Math.max(0,dynCeiling(g0)-ordTaxable),k401-w401);
    } else if(strat==='rule55'){
      w401=Math.min(need,k401);wBrok=Math.min(need-w401,brok);wRoth=Math.min(need-w401-wBrok,roth);
    } else if(strat==='aggressive'){
      wBrok=Math.min(need,brok);wRoth=Math.min(need-wBrok,roth);w401=Math.min(need-wBrok-wRoth,k401);
      const g0=wBrok*gR;const{ordTaxable:ot0}=taxCalc(w401+ssTx,g0);
      conv=Math.min(Math.max(0,383900-ot0),k401-w401);
      const tW=taxCalc(w401+conv+ssTx,g0).total,tWo=taxCalc(w401+ssTx,g0).total;
      const cte=Math.max(0,tW-tWo),ab=Math.min(cte,brok-wBrok);
      wBrok+=ab;if(ab<cte&&cte>0)conv=conv*(ab/cte);
    } else {
      const mb=gR>0?Math.min(96700/gR,brok,need):Math.min(brok,need);
      wBrok=mb;wRoth=Math.min(need-wBrok,roth);w401=Math.min(need-wBrok-wRoth,k401);
      const g0=wBrok*gR;const{ordTaxable}=taxCalc(w401+ssTx,g0);
      conv=Math.min(Math.max(0,dynCeiling(g0)-ordTaxable),k401-w401);
    }

    const rmdShortfall=Math.max(0,rmdRequired-w401-conv);
    const rmdExTax=rmdShortfall>0?taxCalc(w401+conv+rmdShortfall+ssTx,0).total-taxCalc(w401+conv+ssTx,0).total:0;
    const rmdNet=Math.max(0,rmdShortfall-rmdExTax);
    w401=Math.min(w401+rmdShortfall,k401-conv);

    const gains=wBrok*gR,basisWdr=wBrok*(1-gR);
    const tFull=taxCalc(w401+conv+ssTx,gains),tLiving=taxCalc(w401+ssTx,gains);
    const convTax=tFull.total-tLiving.total;
    const isRmd=rmdRequired>100;

    k401   = Math.max(0,k401-w401-conv-convTax)*(1+gr);
    roth   = (Math.max(0,roth-wRoth)+conv)*(1+gr);
    bBasis = Math.max(0,bBasis-basisWdr)+rmdNet*(brokBasisPct/100);
    brok   = (Math.max(0,brok-wBrok)+rmdNet)*(1+gr);
    crypto *= (1+gr);
    const total=k401+roth+brok+crypto;

    rows.push({age,ss,grossSpend:Math.round(grossSpend),need:Math.round(need),
      w401:Math.round(w401),wRoth:Math.round(wRoth),wBrok:Math.round(wBrok),
      gains:Math.round(gains),conv:Math.round(conv),convTax:Math.round(convTax),
      rmd:Math.round(rmdRequired),livingTax:Math.round(tLiving.total),
      effRate:grossSpend>0?tLiving.total/grossSpend:0,
      netIncome:Math.round(grossSpend-tLiving.total),
      k401:Math.round(k401),roth:Math.round(roth),
      brokerage:Math.round(brok),brokBasis:Math.round(bBasis),crypto:Math.round(crypto),
      total:Math.round(total),isRmd});
    if(total<need/2&&age>70)break;
  }
  return rows;
}

function runMC(strat,cfg,nSims=600){
  const meanR=cfg.growth/100,sd=cfg.mcStdDev/100;
  const retAge=cfg.retireAge||55;
  const ages=Array.from({length:36},(_,i)=>retAge+i);
  const byAge=Object.fromEntries(ages.map(a=>[a,[]]));
  for(let s=0;s<nSims;s++){
    const ov=Array.from({length:36},()=>randNorm(meanR,sd));
    for(const r of simPath(strat,cfg,ov)) if(byAge[r.age]) byAge[r.age].push(r.total);
  }
  const pp=(arr,p)=>{if(!arr.length)return 0;const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(p/100*(s.length-1))];};
  const surv90=1-(byAge[retAge+35]?.filter(v=>v<50000).length||0)/nSims;
  return{fan:ages.map(a=>({age:a,p10:pp(byAge[a]||[],10),p25:pp(byAge[a]||[],25),p50:pp(byAge[a]||[],50),p75:pp(byAge[a]||[],75),p90:pp(byAge[a]||[],90)})),surv90,nSims};
}

const TAX_STRATS=[
  {id:'brokFirst', label:'Brokerage First', sub:'+ Roth conversion ladder',    accent:'#4ae6a0'},
  {id:'rule55',    label:'Rule of 55',      sub:'401k first, no conversions',  accent:'#e6b84a'},
  {id:'optimized', label:'Bracket Blend',   sub:'0% LTCG cap + Roth ladder',   accent:'#4a9fe6'},
  {id:'aggressive',label:'Aggressive Roth', sub:'Fill 24% bracket · brok tax', accent:'#f97316'},
];
const ACCT_C={k401:'#e6b84a',roth:'#4a9fe6',brokerage:'#4ae6a0',crypto:'#e64a6e'};

// ══════════════════════════════════════════════════════════════
// PHASE 1 COMPONENT
// ══════════════════════════════════════════════════════════════
function AccumulationPhase({ initialState, onStateChange }) {
  const isMobile = useIsMobile();
  // Own state locally — remounting (via clearKey) starts fresh from initialState
  const [localState, setLocalState] = useState(() => JSON.parse(JSON.stringify(initialState)));
  const { currentAge, retireAge, buckets, lumpSums, showAll, lumpOpen } = localState;
  const [fillAmt, setFillAmt] = useState(0);

  // Sync up to parent whenever local state changes
  useEffect(() => { onStateChange(localState); }, [localState]);

  const set = (k, v) => setLocalState(s => ({ ...s, [k]: v }));
  const updateBucket = (id, data) => setLocalState(s => ({ ...s, buckets: { ...s.buckets, [id]: data } }));
  const setLump = (age, val) => setLocalState(s => ({ ...s, lumpSums: { ...s.lumpSums, [age]: val||0 } }));
  const applyFill = () => setLocalState(s => ({...s, lumpSums: Object.fromEntries(Array.from({length:retireAge-currentAge},(_,i)=>currentAge+i).map(a=>[a,fillAmt]))}));
  const clearLumps = () => setLocalState(s => ({ ...s, lumpSums: {} }));

  const handleCurrentAge = newAge => setLocalState(s => {
    const next = JSON.parse(JSON.stringify(s));
    next.currentAge = newAge;
    for (const id of Object.keys(next.buckets))
      for (const t of ['weekly','monthly','annually'])
        if (next.buckets[id].contrib[t].startAge === s.currentAge) next.buckets[id].contrib[t].startAge = newAge;
    return next;
  });
  const handleRetireAge = newAge => setLocalState(s => {
    const next = JSON.parse(JSON.stringify(s));
    next.retireAge = newAge;
    for (const id of Object.keys(next.buckets))
      for (const t of ['weekly','monthly','annually'])
        if (next.buckets[id].contrib[t].endAge === s.retireAge) next.buckets[id].contrib[t].endAge = newAge;
    return next;
  });
  const toggleAll = () => { const n=!showAll; set('showAll',n); set('lumpOpen',n); };

  const rows = useMemo(() => accumSimulate(buckets, currentAge, retireAge, lumpSums),
    [buckets, currentAge, retireAge, lumpSums]);

  const retireRow   = rows[rows.length-1] || {};
  const totalNow    = BUCKET_DEFS.reduce((s,b)=>s+buckets[b.id].balance, 0);
  const totalRetire = retireRow.total || 0;
  const totalLumps  = Object.values(lumpSums).reduce((s,v)=>s+(v||0),0);
  const annualC     = BUCKET_DEFS.reduce((s,b)=>{
    const c=buckets[b.id].contrib; let a=0;
    if(currentAge>=c.weekly.startAge   &&currentAge<=(c.weekly.endAge??99))   a+=c.weekly.amt*52;
    if(currentAge>=c.monthly.startAge  &&currentAge<=(c.monthly.endAge??99))  a+=c.monthly.amt*12;
    if(currentAge>=c.annually.startAge &&currentAge<=(c.annually.endAge??99)) a+=c.annually.amt;
    return s+a;
  },0);

  const chartData = rows.map(r => { const d={age:r.age}; BUCKET_DEFS.forEach(b=>{d[b.label]=r[b.id];}); return d; });
  const [tab, setTab] = useState('chart');

  return (
    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "310px 1fr", gap:16 }}>
      {/* Left */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ background:"#0d1117", border:"1px solid #21262d", borderRadius:6, padding:"13px 14px" }}>
          <div style={{ fontSize:9, color:"#6e7681", letterSpacing:".1em", marginBottom:10 }}>TIMELINE</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{l:"CURRENT AGE",v:currentAge,f:handleCurrentAge,m:18},{l:"RETIRE AGE",v:retireAge,f:handleRetireAge,m:currentAge+1}].map(({l,v,f,m})=>(
              <div key={l}><div style={{ fontSize:8, color:"#6e7681", marginBottom:3 }}>{l}</div><Inp value={v} onChange={f} step={1} min={m}/></div>
            ))}
          </div>
          <div style={{ marginTop:8, display:"flex", gap:14, fontSize:10, color:"#6e7681" }}>
            <span>Horizon: <span style={{color:"#e6b84a"}}>{retireAge-currentAge} yrs</span></span>
            <span>Annual: <span style={{color:"#4ae6a0"}}>{$M(annualC)}</span></span>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:9, color:"#6e7681", letterSpacing:".08em" }}>BUCKETS</div>
          <button onClick={toggleAll} style={{ cursor:"pointer", background:"transparent", border:"1px solid #21262d", borderRadius:3, color:"#6e7681", fontFamily:"'DM Mono',monospace", fontSize:9, padding:"2px 9px" }}>
            {showAll?"Collapse all":"Expand all"}
          </button>
        </div>

        {BUCKET_DEFS.map(def => (
          <BucketCard key={def.id} def={def} data={buckets[def.id]} onChange={d=>updateBucket(def.id,d)} showAll={showAll} isMobile={isMobile}/>
        ))}

        {/* Lump sums */}
        <div style={{ background:"#0d1117", border:"1px solid #21262d", borderTop:"2px solid #a78bfa", borderRadius:6, overflow:"hidden" }}>
          <button onClick={()=>set('lumpOpen',!lumpOpen)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 13px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{color:"#a78bfa"}}>◈</span>
              <span style={{color:"#f0f6fc",fontSize:12,fontWeight:500}}>Lump Sums</span>
              <span style={{color:"#6e7681",fontSize:10}}>{totalLumps>0?$M(totalLumps)+" total":"one-time inflows"}</span>
            </div>
            <span style={{color:"#6e7681",fontSize:10}}>{lumpOpen?"▲":"▼"}</span>
          </button>
          {lumpOpen && (
            <div style={{ padding:"0 13px 13px", borderTop:"1px solid #161b22" }}>
              <div style={{ fontSize:8, color:"#6e7681", margin:"9px 0 7px", letterSpacing:".08em" }}>ONE-TIME INFLOWS → Brokerage</div>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:9, padding:"7px 9px", background:"#080c10", borderRadius:3, border:"1px solid #21262d" }}>
                <div style={{fontSize:9,color:"#6e7681",whiteSpace:"nowrap"}}>FILL ALL</div>
                <Inp value={fillAmt} onChange={setFillAmt} prefix="$" step={1000}/>
                <button onClick={applyFill} style={{cursor:"pointer",background:"#a78bfa22",border:"1px solid #a78bfa66",borderRadius:3,color:"#a78bfa",fontFamily:"'DM Mono',monospace",fontSize:10,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0}}>Apply</button>
                <button onClick={clearLumps} style={{cursor:"pointer",background:"transparent",border:"1px solid #30363d",borderRadius:3,color:"#6e7681",fontFamily:"'DM Mono',monospace",fontSize:10,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0}}>Clear</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 8px", alignItems:"center" }}>
                <div style={{fontSize:8,color:"#3d444d"}}>AGE</div>
                <div style={{fontSize:8,color:"#3d444d"}}>AMOUNT</div>
                {Array.from({length:retireAge-currentAge},(_,i)=>currentAge+i).map(age=>(
                  <React.Fragment key={age}>
                    <div style={{fontSize:11,color:(lumpSums[age]||0)>0?"#a78bfa":"#6e7681",fontWeight:(lumpSums[age]||0)>0?500:400}}>{age}</div>
                    <Inp value={lumpSums[age]||0} onChange={v=>setLump(age,v)} prefix="$" step={1000}/>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap:8 }}>
          {[
            {l:"TODAY",           v:$M(totalNow),                                              sub:"starting portfolio",       c:"#e6b84a"},
            {l:`AT ${retireAge}`, v:$M(totalRetire),                                           sub:"projected total",          c:"#4ae6a0"},
            {l:`EX-529 AT ${retireAge}`,v:$M(retireRow.total529ex||0),                        sub:"excl. 529s",               c:"#4a9fe6"},
            {l:"GROWTH",          v:$M(totalRetire-totalNow-(annualC*(retireAge-currentAge))-totalLumps), sub:"investment return", c:"#a78bfa"},
            {l:"TOTAL CONTRIB",   v:$M(annualC*(retireAge-currentAge)+totalLumps),             sub:`periodic + ${$M(totalLumps)} lump`, c:"#f97316"},
          ].map((k,i)=>(
            <div key={i} style={{background:"#0d1117",border:"1px solid #21262d",borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
              <div style={{fontSize:9,color:"#6e7681",letterSpacing:".08em",marginBottom:5}}>{k.l}</div>
              <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
              <div style={{fontSize:9,color:"#6e7681",marginTop:2}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Bucket balances at retire */}
        <div style={{background:"#0d1117",border:"1px solid #21262d",borderRadius:6,padding:"12px 14px"}}>
          <div style={{fontSize:9,color:"#6e7681",letterSpacing:".09em",marginBottom:10}}>BALANCES AT RETIREMENT (AGE {retireAge})</div>
          <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(4,1fr)" : "repeat(7,1fr)",gap:6}}>
            {BUCKET_DEFS.map(b=>(
              <div key={b.id} style={{textAlign:"center"}}>
                <div style={{fontSize:8,color:b.color,marginBottom:3}}>{b.label.toUpperCase()}</div>
                <div style={{fontSize:13,color:"#f0f6fc",fontWeight:500}}>{$M(retireRow[b.id]||0)}</div>
                <div style={{fontSize:8,color:"#3d444d",marginTop:1}}>{totalRetire>0?((retireRow[b.id]||0)/totalRetire*100).toFixed(0):0}%</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",gap:7}}>
          {[["chart","Growth Chart"],["table","Year-by-Year"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{cursor:"pointer",borderRadius:4,fontFamily:"'DM Mono',monospace",padding:"4px 12px",fontSize:11,border:"1px solid #30363d",background:tab===id?"#e6b84a11":"transparent",color:tab===id?"#e6b84a":"#8b949e",borderColor:tab===id?"#e6b84a55":"#30363d"}}>
              {lbl}
            </button>
          ))}
        </div>

        {tab==="chart" && (
          <div style={{background:"#0d1117",border:"1px solid #21262d",borderRadius:6,padding:"16px 8px 12px"}}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>{BUCKET_DEFS.map(b=>(
                  <linearGradient key={b.id} id={`ag${b.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={b.color} stopOpacity={0.4}/><stop offset="95%" stopColor={b.color} stopOpacity={0.04}/>
                  </linearGradient>
                ))}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#161b22"/>
                <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:10,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
                <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:10,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <ReferenceLine x={retireAge} stroke="#e6b84a44" strokeDasharray="4 2" label={{value:`Retire ${retireAge}`,fill:"#e6b84a",fontSize:9,position:"insideTopRight"}}/>
                {BUCKET_DEFS.map(b=>(
                  <Area key={b.id} type="monotone" dataKey={b.label} stackId="1" stroke={b.color} strokeWidth={1.5} fill={`url(#ag${b.id})`}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab==="table" && (
          <div style={{background:"#0d1117",border:"1px solid #21262d",borderRadius:6,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead><tr style={{borderBottom:"1px solid #21262d"}}>
                {["Age",...BUCKET_DEFS.map(b=>b.label),"Total","Ex-529"].map((h,i)=>(
                  <th key={h} style={{padding:"8px 9px",textAlign:"right",fontWeight:400,whiteSpace:"nowrap",fontSize:9,letterSpacing:".05em",color:i===0?"#6e7681":i<=BUCKET_DEFS.length?BUCKET_DEFS[i-1]?.color:i===BUCKET_DEFS.length+1?"#f0f6fc":"#4a9fe6"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #0d1117",background:r.age===retireAge?"#e6b84a08":i%2===0?"transparent":"#0a0e12"}}>
                    <td style={{padding:"6px 9px",textAlign:"right",color:r.age===retireAge?"#e6b84a":"#8b949e",fontWeight:r.age===retireAge?500:400}}>{r.age}{r.age===retireAge?" ★":""}</td>
                    {BUCKET_DEFS.map(b=>(
                      <td key={b.id} style={{padding:"6px 9px",textAlign:"right",color:r[b.id]>0?b.color:"#2d333b"}}>{r[b.id]>0?$M(r[b.id]):"—"}</td>
                    ))}
                    <td style={{padding:"6px 9px",textAlign:"right",color:"#f0f6fc",fontWeight:500}}>{$M(r.total)}</td>
                    <td style={{padding:"6px 9px",textAlign:"right",color:"#4a9fe6"}}>{$M(r.total529ex||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE 2 COMPONENT
// ══════════════════════════════════════════════════════════════
function RetirementPhase({ linkedBalances, retireAge, initWithdrawal=200_000 }) {
  const isMobile = useIsMobile();
  const [strat,   setStrat]   = useState('brokFirst');
  const [tabV,    setTabV]    = useState('chart');
  const [showCfg, setShowCfg] = useState(true);
  const [mcRes,   setMcRes]   = useState(null);
  const [mcRun,   setMcRun]   = useState(false);
  const [linked,  setLinked]  = useState(true);

  const [k401Init,     setK401]       = useState(linkedBalances.k401);
  const [rothInit,     setRoth]       = useState(linkedBalances.roth);
  const [brokInit,     setBrok]       = useState(linkedBalances.brok);
  const [cryptoInit,   setCrypto]     = useState(linkedBalances.crypto);
  const [brokBasisPct, setBrokBasis]  = useState(linkedBalances.brokBasisPct);
  const [withdrawal,   setWithdrawal] = useState(initWithdrawal);
  const [inflation,    setInflation]  = useState(3);
  const [growth,       setGrowth]     = useState(7);
  const [ssAmount,     setSsAmount]   = useState(0);
  const [ssStartAge,   setSsStartAge] = useState(67);
  const [mcStdDev,     setMcStdDev]   = useState(12);
  const [k401Disc,     setK401Disc]   = useState(25);
  const [ltcgDisc,     setLtcgDisc]   = useState(15);

  // Sync from linked balances when linked is toggled on
  useEffect(() => {
    if (!linked) return;
    setK401(linkedBalances.k401);
    setRoth(linkedBalances.roth);
    setBrok(linkedBalances.brok);
    setCrypto(linkedBalances.crypto);
    setBrokBasis(linkedBalances.brokBasisPct);
  }, [linked, linkedBalances.k401, linkedBalances.roth, linkedBalances.brok, linkedBalances.crypto, linkedBalances.brokBasisPct]);

  const cfg = {k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,mcStdDev,retireAge};
  const allData = useMemo(()=>{const r={};for(const s of TAX_STRATS)r[s.id]=simPath(s.id,cfg);return r;},
    [k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,retireAge]);

  const afterTax = r => {
    const bU=Math.max(0,r.brokerage-(r.brokBasis||0)),bB=Math.min(r.brokerage,r.brokBasis||0);
    return Math.round(r.k401*(1-k401Disc/100)+r.roth+bB+bU*(1-ltcgDisc/100)+r.crypto*(1-ltcgDisc/100));
  };

  const rows    = allData[strat];
  const accent  = TAX_STRATS.find(s=>s.id===strat).accent;
  const yr1     = rows[0]||{};
  const at85    = rows.find(r=>r.age===retireAge+30)||rows[rows.length-1]||{};
  const lifeTax = rows.reduce((a,r)=>a+r.livingTax,0);
  const avgEff  = rows.length?rows.reduce((a,r)=>a+r.effRate,0)/rows.length:0;
  const totalStart = k401Init+rothInit+brokInit+cryptoInit;

  const comparisons = TAX_STRATS.map(s=>{
    const d=allData[s.id],r85=d.find(r=>r.age===retireAge+30)||d[d.length-1]||{};
    return{...s,at85:r85.total||0,at85AT:afterTax(r85),
      k401_85:r85.k401||0,roth85:r85.roth||0,brok85:r85.brokerage||0,crypto85:r85.crypto||0,
      ltax:d.reduce((a,r)=>a+r.livingTax,0),ctax:d.reduce((a,r)=>a+r.convTax,0),
      avgEff:d.length?d.reduce((a,r)=>a+r.effRate,0)/d.length:0};
  });

  const chartData = rows.map(r=>({age:r.age,'401k':r.k401,'Roth IRA':r.roth,'Brokerage':r.brokerage,'Crypto':r.crypto}));

  const doMC = useCallback(()=>{
    setMcRun(true);setTabV('mc');
    setTimeout(()=>{setMcRes(runMC(strat,cfg,600));setMcRun(false);},50);
  },[strat,k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,retireAge,mcStdDev]);

  const tBtnStyle = id => ({cursor:"pointer",borderRadius:4,fontFamily:"'DM Mono',monospace",padding:"4px 12px",fontSize:11,border:"1px solid #30363d",background:tabV===id?"#e6b84a11":"transparent",color:tabV===id?"#e6b84a":"#8b949e",borderColor:tabV===id?"#e6b84a55":"#30363d"});

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Link banner */}
      <div style={{background: linked?"#4ae6a010":"#0d1117", border:`1px solid ${linked?"#4ae6a044":"#30363d"}`, borderRadius:6, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10}}>
        <div style={{fontSize:11, color: linked?"#4ae6a0":"#6e7681"}}>
          {linked
            ? `⇠ Balances auto-linked from Phase 1 retirement (age ${retireAge}): 401k ${$M(linkedBalances.k401)} · Roth ${$M(linkedBalances.roth)} · Brokerage ${$M(linkedBalances.brok)} · Crypto ${$M(linkedBalances.crypto)}`
            : "Manual override — balances not linked to Phase 1"}
        </div>
        <button onClick={()=>setLinked(v=>!v)} style={{cursor:"pointer",background:linked?"#4ae6a011":"transparent",border:`1px solid ${linked?"#4ae6a066":"#30363d"}`,borderRadius:4,color:linked?"#4ae6a0":"#8b949e",fontFamily:"'DM Mono',monospace",fontSize:10,padding:"4px 12px"}}>
          {linked?"Unlink (manual)":"Re-link from Phase 1"}
        </button>
      </div>

      {/* Settings */}
      {showCfg && (
        <div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:6,padding:"16px 18px"}}>
          <div style={{fontSize:9,color:"#6e7681",letterSpacing:".11em",marginBottom:10}}>STARTING BALANCES AT RETIREMENT {linked&&<span style={{color:"#4ae6a066"}}>(linked)</span>}</div>
          <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10,marginBottom:16}}>
            <Field label="401(k)"    value={k401Init}   onChange={setK401}    step={10000} disabled={linked} hint={$M(k401Init)}/>
            <Field label="ROTH IRA"  value={rothInit}   onChange={setRoth}    step={5000}  disabled={linked} hint={$M(rothInit)}/>
            <Field label="BROKERAGE" value={brokInit}   onChange={setBrok}    step={10000} disabled={linked} hint={$M(brokInit)}/>
            <Field label="CRYPTO"    value={cryptoInit} onChange={setCrypto}  step={1000}  disabled={linked} hint={$M(cryptoInit)}/>
          </div>
          <div style={{borderTop:"1px solid #1c2128",paddingTop:14,marginBottom:0}}>
            <div style={{fontSize:9,color:"#6e7681",letterSpacing:".11em",marginBottom:10}}>WITHDRAWAL & GROWTH</div>
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10}}>
              <Field label="ANNUAL WITHDRAWAL"  value={withdrawal}   onChange={setWithdrawal} step={5000}  hint="Gross yr 1 target"/>
              <Field label="BROKERAGE BASIS %"  value={brokBasisPct} onChange={setBrokBasis}  prefix="%" step={1} disabled={linked} hint={`${brokBasisPct.toFixed(0)}% is cost basis`}/>
              <Field label="PORTFOLIO GROWTH %" value={growth}       onChange={setGrowth}     prefix="%" step={0.5} hint="Nominal annual return"/>
              <Field label="INFLATION %"        value={inflation}    onChange={setInflation}  prefix="%" step={0.25} hint="Withdrawal adj."/>
            </div>
          </div>
          <div style={{borderTop:"1px solid #1c2128",paddingTop:14,marginTop:14}}>
            <div style={{fontSize:9,color:"#6e7681",letterSpacing:".11em",marginBottom:10}}>SS · MONTE CARLO · AFTER-TAX DISCOUNTS</div>
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10}}>
              <Field label="COMBINED SS / YR"   value={ssAmount}   onChange={setSsAmount}   step={1000}/>
              <Field label="SS START AGE"       value={ssStartAge} onChange={setSsStartAge} prefix="" step={1} min={62} hint="62–70 · 85% taxable"/>
              <Field label="MC STD DEV %"       value={mcStdDev}   onChange={setMcStdDev}   prefix="%" step={1} hint="Annualized vol"/>
              <div style={{display:"flex",alignItems:"flex-end"}}>
                <button onClick={doMC} disabled={mcRun} style={{cursor:"pointer",width:"100%",padding:"6px",background:"transparent",border:"1px solid #a78bfa",borderRadius:4,color:"#a78bfa",fontFamily:"'DM Mono',monospace",fontSize:11,opacity:mcRun?.6:1}}>
                  {mcRun?"Running…":"▶ Monte Carlo"}
                </button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10,marginTop:10}}>
              <Field label="401k FUTURE TAX %"  value={k401Disc}  onChange={setK401Disc} prefix="%" step={1} hint="After-tax 401k discount"/>
              <Field label="LTCG RATE %"        value={ltcgDisc}  onChange={setLtcgDisc} prefix="%" step={1} hint="Brok/crypto gain discount"/>
            </div>
          </div>
        </div>
      )}

      {/* Strategy cards */}
      <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:9}}>
        {TAX_STRATS.map(s=>(
          <button key={s.id} onClick={()=>setStrat(s.id)} style={{cursor:"pointer",borderRadius:5,fontFamily:"'DM Mono',monospace",padding:"11px 13px",textAlign:"left",background:strat===s.id?`${s.accent}14`:"#0d1117",border:`1px solid ${strat===s.id?s.accent:"#30363d"}`,borderTop:`2px solid ${strat===s.id?s.accent:"#30363d"}`}}>
            <div style={{color:strat===s.id?s.accent:"#8b949e",fontWeight:500,marginBottom:2,fontSize:11}}>{s.label}</div>
            <div style={{color:"#6e7681",fontSize:9}}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:9}}>
        {[
          {l:`GROSS AT ${retireAge+30}`, v:$M(at85.total||0),    sub:`from ${$M(totalStart)}`,   c:accent},
          {l:`AFTER-TAX AT ${retireAge+30}`,v:$M(afterTax(at85)),sub:`401k @${k401Disc}% · LTCG @${ltcgDisc}%`, c:"#4ae6a0",hi:true},
          {l:"YR 1 NET INCOME",         v:$F(yr1.netIncome||0),  sub:`gross ${$M(withdrawal)}`,  c:"#f0f6fc"},
          {l:"LIFETIME LIVING TAX",     v:$M(lifeTax),           sub:`avg ${pct(avgEff)} eff.`,  c:"#e64a6e"},
        ].map((k,i)=>(
          <div key={i} style={{background:"#0d1117",border:`1px solid ${k.hi?"#4ae6a060":"#1c2128"}`,borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
            <div style={{fontSize:9,color:k.hi?"#4ae6a0":"#6e7681",letterSpacing:".09em",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
            <div style={{fontSize:9,color:"#6e7681",marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Comparison strip */}
      <div style={{background:"#0d1117",border:"1px solid #1c2128",borderRadius:6,padding:"13px 16px"}}>
        <div style={{fontSize:9,color:"#6e7681",letterSpacing:".09em",marginBottom:10}}>STRATEGY COMPARISON AT AGE {retireAge+30}</div>
        <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap: isMobile ? 12 : 0,overflowX: isMobile ? "auto" : "visible"}}>
          {comparisons.map((s,i)=>(
            <div key={s.id} style={{borderLeft: isMobile ? "none" : i>0?"1px solid #1c2128":"none",paddingLeft:i>0?16:0,paddingRight:16}}>
              <div style={{fontSize:10,color:s.accent,marginBottom:7,fontWeight:500}}>{s.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 10px",fontSize:11}}>
                {[
                  ["GROSS",     $M(s.at85),     "#f0f6fc"],
                  ["AFTER-TAX", $M(s.at85AT),   "#4ae6a0"],
                  ["401k",      $M(s.k401_85),  "#e6b84a"],
                  ["ROTH",      $M(s.roth85),   "#4a9fe6"],
                  ["BROKERAGE", $M(s.brok85),   "#4ae6a0"],
                  ["LIFETIME TAX",$M(s.ltax),   "#e64a6e"],
                  ["CONV. TAX", s.ctax>0?$M(s.ctax):"—","#f97316"],
                  ["AVG EFF.",  pct(s.avgEff),  s.avgEff<.05?"#4ae6a0":s.avgEff<.12?"#e6b84a":"#e64a6e"],
                ].map(([lbl,val,col],j)=>(
                  <React.Fragment key={j}>
                    <div style={{color:"#6e7681",fontSize:9}}>{lbl}</div>
                    <div style={{color:col,textAlign:"right"}}>{val}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:7}}>
        {[["chart","Portfolio Growth"],["table","Annual Detail"],["mc","Monte Carlo"]].map(([id,lbl])=>(
          <button key={id} style={tBtnStyle(id)} onClick={()=>setTabV(id)}>{lbl}</button>
        ))}
        <button onClick={()=>setShowCfg(v=>!v)} style={{...tBtnStyle('__'),marginLeft:"auto",color:"#6e7681",borderColor:"#30363d",background:"transparent"}}>
          {showCfg?"▲ Hide Settings":"▼ Show Settings"}
        </button>
      </div>

      {/* Chart */}
      {tabV==="chart" && (
        <div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:6,padding:"16px 8px 12px"}}>
          <div style={{fontSize:9,color:"#6e7681",letterSpacing:".07em",marginBottom:12,paddingLeft:8}}>{TAX_STRATS.find(s=>s.id===strat).label.toUpperCase()} · BALANCES {retireAge}–{retireAge+35}</div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>{Object.entries(ACCT_C).map(([k,c])=>(
                <linearGradient key={k} id={`rt${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.4}/><stop offset="95%" stopColor={c} stopOpacity={0.04}/>
                </linearGradient>
              ))}</defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#161b22"/>
              <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:10,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
              <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:10,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              {Object.entries(ACCT_C).map(([key,color])=>(
                <Area key={key} type="monotone" dataKey={{k401:"401k",roth:"Roth IRA",brokerage:"Brokerage",crypto:"Crypto"}[key]} stackId="1" stroke={color} strokeWidth={1.5} fill={`url(#rt${key})`}/>
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {tabV==="table" && (
        <div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:6,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid #30363d"}}>
              {["Age","Target","SS","RMD","← 401k","← Roth","← Brok.","Conv.","Living Tax","Eff %","Net Income","Gross Total","After-Tax"].map(h=>(
                <th key={h} style={{padding:"8px 9px",textAlign:"right",color:h==="After-Tax"?"#4ae6a0":"#6e7681",fontSize:9,fontWeight:400,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #0d1117",background:r.isRmd?"#0c0a15":i%2===0?"transparent":"#0a0e12"}}>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.isRmd?"#a78bfa":"#e6b84a"}}>{r.age}{r.isRmd?" ⚑":""}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"#8b949e"}}>{$M(r.grossSpend)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.ss>0?"#4ae6a0":"#2d333b"}}>{r.ss>0?$M(r.ss):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.isRmd?"#a78bfa":"#2d333b"}}>{r.isRmd?$M(r.rmd):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.w401>0?"#e6b84a":"#2d333b"}}>{r.w401>0?$M(r.w401):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.wRoth>0?"#4a9fe6":"#2d333b"}}>{r.wRoth>0?$M(r.wRoth):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.wBrok>0?"#4ae6a0":"#2d333b"}}>{r.wBrok>0?$M(r.wBrok):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.conv>0?"#a78bfa":"#2d333b"}}>{r.conv>0?$M(r.conv):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.livingTax===0?"#4ae6a0":"#e64a6e"}}>{$F(r.livingTax)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.effRate<.05?"#4ae6a0":r.effRate<.15?"#e6b84a":"#e64a6e"}}>{pct(r.effRate)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"#f0f6fc"}}>{$F(r.netIncome)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"#f0f6fc",fontWeight:500}}>{$M(r.total)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"#4ae6a0",fontWeight:500}}>{$M(afterTax(r))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:"6px 12px",fontSize:9,color:"#3d444d",borderTop:"1px solid #161b22"}}>⚑ RMD year (age 73+ · IRS Uniform Lifetime Table)</div>
        </div>
      )}

      {/* Monte Carlo */}
      {tabV==="mc" && (
        <div>
          {!mcRes && !mcRun && (
            <div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:6,padding:"40px",textAlign:"center"}}>
              <div style={{fontSize:12,color:"#6e7681",marginBottom:16}}>600 simulations · mean {growth}% · std dev {mcStdDev}%</div>
              <button onClick={doMC} style={{cursor:"pointer",background:"transparent",border:"1px solid #a78bfa",borderRadius:4,color:"#a78bfa",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"8px 24px"}}>▶ Run Monte Carlo</button>
            </div>
          )}
          {mcRun && <div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:6,padding:"40px",textAlign:"center",color:"#a78bfa"}}>Running 600 simulations…</div>}
          {mcRes && !mcRun && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:9}}>
                {[
                  {l:"SURVIVAL TO END",v:pct(mcRes.surv90),c:mcRes.surv90>.9?"#4ae6a0":mcRes.surv90>.7?"#e6b84a":"#e64a6e"},
                  {l:`MEDIAN AT ${retireAge+30} (P50)`,v:$M(mcRes.fan.find(r=>r.age===retireAge+30)?.p50||0),c:"#a78bfa"},
                  {l:`BEAR AT ${retireAge+30} (P10)`,  v:$M(mcRes.fan.find(r=>r.age===retireAge+30)?.p10||0),c:"#e64a6e"},
                  {l:`BULL AT ${retireAge+30} (P90)`,  v:$M(mcRes.fan.find(r=>r.age===retireAge+30)?.p90||0),c:"#4ae6a0"},
                ].map((k,i)=>(
                  <div key={i} style={{background:"#0d1117",border:"1px solid #1c2128",borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
                    <div style={{fontSize:9,color:"#6e7681",marginBottom:5}}>{k.l}</div>
                    <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:6,padding:"16px 8px 12px"}}>
                <div style={{fontSize:9,color:"#6e7681",letterSpacing:".07em",marginBottom:12,paddingLeft:8}}>FAN CHART · P10 / P25 / P50 / P75 / P90</div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mcRes.fan}>
                    <defs>
                      <linearGradient id="mc90" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.15}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02}/></linearGradient>
                      <linearGradient id="mc75" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0.04}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#161b22"/>
                    <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:10,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
                    <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:10,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
                    <Tooltip content={({active,payload,label})=>{
                      if(!active||!payload?.length)return null;
                      const d=mcRes.fan.find(r=>r.age===label)||{};
                      return(<div style={{background:"#0d1117",border:"1px solid #30363d",borderRadius:5,padding:"10px 14px",fontSize:11,fontFamily:"DM Mono"}}>
                        <div style={{color:"#e6b84a",marginBottom:6}}>Age {label}</div>
                        {[["P90","#4ae6a0",d.p90],["P75","#a78bfa",d.p75],["P50","#f0f6fc",d.p50],["P25","#e6b84a",d.p25],["P10","#e64a6e",d.p10]].map(([n,c,v])=>(
                          <div key={n} style={{color:c,marginBottom:2}}>{n}: {$M(v||0)}</div>
                        ))}
                      </div>);
                    }}/>
                    <Area type="monotone" dataKey="p90" stroke="#4ae6a0" strokeWidth={1} strokeDasharray="4 2" fill="url(#mc90)"/>
                    <Area type="monotone" dataKey="p75" stroke="#a78bfa" strokeWidth={1} fill="url(#mc75)"/>
                    <Area type="monotone" dataKey="p50" stroke="#f0f6fc" strokeWidth={2} fill="none"/>
                    <Area type="monotone" dataKey="p25" stroke="#e6b84a" strokeWidth={1} fill="none"/>
                    <Area type="monotone" dataKey="p10" stroke="#e64a6e" strokeWidth={1} strokeDasharray="4 2" fill="none"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
const BLANK_BUCKETS = Object.fromEntries(
  BUCKET_DEFS.map(b => [b.id, { balance:0, growthRate: b.id==='cash'?2:b.id.startsWith('s529')?6:7, basisPct:100, contrib: mkC() }])
);

const INIT_STATE = {
  currentAge: 43, retireAge: 55,
  buckets: DEFAULT_BUCKETS,
  lumpSums: {}, showAll: true, lumpOpen: true,
};

const BLANK_STATE = {
  currentAge: 43, retireAge: 55,
  buckets: BLANK_BUCKETS,
  lumpSums: {}, showAll: true, lumpOpen: true,
};

export default function App() {
  const isMobile = useIsMobile();
  const [phase,     setPhase]    = useState(1);
  const [accumState, setAccumState] = useState(INIT_STATE);
  const [loaded,    setLoaded]   = useState(false);
  const [saveStatus,setSaveStatus]= useState("");
  const [clearKey,  setClearKey]  = useState(0);

  // Load
  useEffect(()=>{
    (async()=>{
      try{const raw=localStorage.getItem('rp_state');if(raw){const s=JSON.parse(raw);if(s.accumState)setAccumState(s.accumState);if(s.phase)setPhase(s.phase);}}
      catch(_){}
      setLoaded(true);
    })();
  },[]);

  // Save
  useEffect(()=>{
    if(!loaded)return;
    (async()=>{
      try{localStorage.setItem('rp_state',JSON.stringify({accumState,phase}));setSaveStatus("saved");setTimeout(()=>setSaveStatus(""),1500);}
      catch(_){}
    })();
  },[accumState,phase,loaded]);

  const handleClear = async () => {
    setAccumState(JSON.parse(JSON.stringify(BLANK_STATE)));setPhase(1);setClearKey(k=>k+1);
    try{localStorage.removeItem('rp_state');}catch(_){}
    setSaveStatus("cleared");setTimeout(()=>setSaveStatus(""),2000);
  };

  // Compute linked balances from accumulation output
  const accumRows  = useMemo(()=>accumSimulate(accumState.buckets,accumState.currentAge,accumState.retireAge,accumState.lumpSums),[accumState]);
  const retireRow  = accumRows[accumRows.length-1] || {};
  const brokBasisPct = retireRow.brok > 0 ? Math.min(100, Math.round((retireRow.brokBasis||0) / retireRow.brok * 100)) : 63;
  const linkedBalances = {
    k401:   retireRow.k401   || 0,
    roth:   retireRow.roth   || 0,
    brok:   retireRow.brok   || 0,
    crypto: retireRow.crypto || 0,
    brokBasisPct,
  };

  return (
    <div style={{minHeight:"100vh",background:"#080c10",color:"#c9d1d9",fontFamily:"'DM Mono','Courier New',monospace",padding: isMobile ? "16px 12px" : "24px 18px"}}>
      <style>{`
        * { box-sizing:border-box; }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        input:focus{border-color:#e6b84a88!important;box-shadow:0 0 0 2px #e6b84a22;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#0d1117;}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px;}
        button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
        input{touch-action:manipulation;}
        @media(max-width:768px){
          table{font-size:10px !important;}
          th,td{padding:5px 6px !important;}
        }
      `}</style>

      <div style={{maxWidth:1200,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#f0f6fc",margin:0,letterSpacing:"-.02em"}}>Retirement Planner</h1>
            <p style={{color:"#6e7681",fontSize:10,margin:"4px 0 0",letterSpacing:".07em"}}>
              MFJ · TEXAS · 2025 BRACKETS · AGE {accumState.currentAge} → {accumState.retireAge} → 90
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
            {saveStatus==="saved"   && <span style={{fontSize:10,color:"#4ae6a0"}}>✓ Saved</span>}
            {saveStatus==="cleared" && <span style={{fontSize:10,color:"#e64a6e"}}>✓ Reset</span>}
            <button onClick={handleClear} style={{cursor:"pointer",background:"transparent",border:"1px solid #e64a6e55",borderRadius:4,color:"#e64a6e",fontFamily:"'DM Mono',monospace",fontSize:11,padding:"5px 13px"}}>✕ Clear</button>
          </div>
        </div>

        {/* Phase tabs */}
        <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid #21262d"}}>
          {[
            [1,"Phase 1","Accumulation","Age "+accumState.currentAge+" → "+accumState.retireAge,"#4ae6a0"],
            [2,"Phase 2","Retirement Tax Strategy","Age "+accumState.retireAge+" → 90","#e6b84a"],
          ].map(([p,badge,label,sub,c])=>(
            <button key={p} onClick={()=>setPhase(p)} style={{cursor:"pointer",background:"transparent",border:"none",borderBottom:`2px solid ${phase===p?c:"transparent"}`,padding:"10px 24px 12px",fontFamily:"'DM Mono',monospace",textAlign:"left",marginBottom:-1}}>
              <div style={{fontSize:9,color:phase===p?c:"#3d444d",letterSpacing:".1em",marginBottom:3}}>{badge}</div>
              <div style={{fontSize:13,color:phase===p?"#f0f6fc":"#6e7681",fontWeight:phase===p?500:400}}>{label}</div>
              <div style={{fontSize:9,color:"#3d444d",marginTop:2}}>{sub}</div>
            </button>
          ))}
          {/* Handoff indicator */}
          {retireRow.total > 0 && (
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,paddingRight:4}}>
              {!isMobile && (
                <>
                  <div style={{fontSize:9,color:"#3d444d"}}>HANDOFF AT {accumState.retireAge}</div>
                  <div style={{display:"flex",gap:6}}>
                    {[["401k",linkedBalances.k401,"#e6b84a"],["Roth",linkedBalances.roth,"#4a9fe6"],["Brok",linkedBalances.brok,"#4ae6a0"],["Crypto",linkedBalances.crypto,"#e64a6e"]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center",background:"#0d1117",border:`1px solid ${c}33`,borderRadius:4,padding:"4px 8px"}}>
                        <div style={{fontSize:8,color:c}}>{l}</div>
                        <div style={{fontSize:10,color:"#f0f6fc"}}>{$M(v)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <button onClick={()=>setPhase(2)} style={{cursor:"pointer",background:"#e6b84a11",border:"1px solid #e6b84a55",borderRadius:4,color:"#e6b84a",fontFamily:"'DM Mono',monospace",fontSize:10,padding:"5px 12px",whiteSpace:"nowrap"}}>
                {isMobile ? "Phase 2 →" : "Use in Phase 2 →"}
              </button>
            </div>
          )}
        </div>

        {phase===1 && <AccumulationPhase key={clearKey} initialState={accumState} onStateChange={setAccumState}/>}
        {phase===2 && <RetirementPhase key={clearKey} linkedBalances={linkedBalances} retireAge={accumState.retireAge} initWithdrawal={clearKey===0?200_000:0}/>}
      </div>
    </div>
  );
}
