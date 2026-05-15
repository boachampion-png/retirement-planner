'use client';
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ══════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ══════════════════════════════════════════════════════════════
function useIsMobile() {
  const getIsMobile = () => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth, h = window.innerHeight;
    return w < 768 || (w < 1024 && h < 500);
  };
  const [isMobile, setIsMobile] = useState(getIsMobile);
  useEffect(() => {
    const update = () => setIsMobile(getIsMobile());

    // resize is reliable on most browsers
    window.addEventListener('resize', update);

    // orientationchange on iOS fires BEFORE dimensions update
    // poll a few times after it fires to catch the final value
    const onOrient = () => {
      update();
      const delays = [100, 250, 500, 800];
      delays.forEach(d => setTimeout(update, d));
    };
    window.addEventListener('orientationchange', onOrient);

    // Also use ResizeObserver on document.body for maximum reliability
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(document.body);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrient);
      if (ro) ro.disconnect();
    };
  }, []);
  return isMobile;
}

const DARK_THEME = {
    '--bg':'#080c10','--bg2':'#0d1117','--bg3':'#0a0e12',
    '--brd':'#21262d','--brd2':'#30363d','--brd3':'#161b22',
    '--tx':'#c9d1d9','--txm':'#6e7681','--txf':'#3d444d','--txd':'#2d333b',
    '--ibg':'#080c10','--ibg2':'#0a0e12','--idis':'#060809',
    '--gold':'#e6b84a','--grn':'#4ae6a0','--blu':'#4a9fe6',
    '--red':'#e64a6e','--pur':'#a78bfa','--orn':'#f97316','--wht':'#f0f6fc',
    '--scrt':'#0d1117','--scth':'#30363d','--rmd':'#0c0a15','--str':'#0a0e12',
  };
const LIGHT_THEME = {
    '--bg':  '#e8f0f8',   // soft blue-grey base
    '--bg2': '#f4f8fc',   // light card surface
    '--bg3': '#dce8f0',   // deeper tint for alternating rows
    '--brd': '#a0bcd4',   // medium blue-grey border
    '--brd2':'#7a9eb8',   // stronger border
    '--brd3':'#c0d4e4',   // subtle divider
    '--tx':  '#07111a',   // near-black navy
    '--txm': '#1a3348',   // very dark slate
    '--txf': '#344e64',   // medium-dark slate
    '--txd': '#5a7a94',   // faint
    '--ibg': '#f4f8fc',   // input background
    '--ibg2':'#eaf2f8',   // input background 2
    '--idis':'#d4e4ee',   // disabled input
    '--gold':'#9e5c00',   // deep amber (darker for contrast)
    '--grn': '#145e38',   // deep forest green
    '--blu': '#0a4e9e',   // deep royal blue
    '--red': '#a01830',   // deep cherry red
    '--pur': '#4a1e9e',   // deep violet
    '--orn': '#9e3a00',   // deep burnt orange
    '--wht': '#0d1f2d',   // text on colored bg
    '--scrt':'#dce8f0',   // scrollbar track
    '--scth':'#7a9eb8',   // scrollbar thumb
    '--rmd': '#e0d8f0',   // rmd highlight
    '--str': '#dce8f0',   // stripe bg
  };

// ══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════
const $M  = n => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${Math.round(n)}`;
const $F  = n => `$${Math.round(n).toLocaleString()}`;
const pct = n => `${(n*100).toFixed(1)}%`;

function Inp({ value, onChange, prefix, suffix, step=100, min=0 }) {
  return (
    <div style={{ position:"relative" }}>
      {prefix && <span style={{ position:"absolute", left:7, top:"50%", transform:"translateY(-50%)", color:"var(--txm)", fontSize:12, pointerEvents:"none", zIndex:1 }}>{prefix}</span>}
      <input type="number" value={value} step={step} min={min} onChange={e => onChange(Number(e.target.value))}
        onFocus={e => e.target.select()}
        style={{ width:"100%", background:"var(--ibg)", border:`1px solid ${"var(--brd)"}`, borderRadius:3,
                 color:"var(--gold)", fontFamily:"'DM Mono',monospace", fontSize:16,
                 padding: prefix ? "8px 6px 8px 18px" : suffix ? "8px 22px 8px 6px" : "8px 6px", outline:"none",
                 WebkitAppearance:"none", touchAction:"manipulation" }} />
      {suffix && <span style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", color:"var(--txm)", fontSize:12, pointerEvents:"none" }}>{suffix}</span>}
    </div>
  );
}

function Field({ label, value, onChange, prefix="$", step=1000, min=0, hint, disabled=false }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:12, color: disabled ? "var(--txf)" : "var(--txm)", letterSpacing:".1em" }}>{label}</label>
      <div style={{ position:"relative" }}>
        {prefix && <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"var(--txm)", fontSize:12, pointerEvents:"none", zIndex:1 }}>{prefix}</span>}
        <input type="number" value={value} step={step} min={min} disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          onFocus={e => e.target.select()}
          style={{ width:"100%", background: disabled ? "var(--idis)" : "var(--ibg2)", border:`1px solid ${"var(--brd2)"}`, borderRadius:4,
                   color: disabled ? "var(--txf)" : "var(--gold)", fontFamily:"'DM Mono',monospace", fontSize:16,
                   padding: prefix ? "10px 8px 10px 20px" : "10px 8px", outline:"none",
                   WebkitAppearance:"none", touchAction:"manipulation" }} />
      </div>
      {hint && <div style={{ fontSize:12, color:"var(--txf)", marginTop:1 }}>{hint}</div>}
    </div>
  );
}

const ChartTip = ({ active, payload, label, showTotal=true }) => {
  if (!active || !payload || !payload.length) return null;
  const tot = payload.reduce((a, b) => a + b.value, 0);
  return (
    <div style={{ background:"var(--bg3)", border:`1px solid ${"var(--brd2)"}`, borderRadius:5, padding:"10px 14px", fontSize:12, fontFamily:"DM Mono,monospace" }}>
      <div style={{ color:"var(--gold)", marginBottom:7 }}>Age {label}</div>
      {[...payload].reverse().map(p => <div key={p.name} style={{ color:p.color||p.stroke, marginBottom:2 }}>{p.name}: {$M(p.value)}</div>)}
      {showTotal && <div style={{ borderTop:`1px solid ${"var(--brd2)"}`, marginTop:6, paddingTop:6, color:"var(--wht)", fontWeight:500 }}>Total: {$M(tot)}</div>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PHASE 1 — ACCUMULATION ENGINE
// ══════════════════════════════════════════════════════════════
const BUCKET_DEFS = [
  { id:"cash",   label:"Cash",      icon:"◈", color:"#94a3b8" },
  { id:"k401",   label:"401(k)",    icon:"◆", color:"var(--gold)" },
  { id:"roth",   label:"Roth IRA",  icon:"◆", color:"var(--blu)" },
  { id:"brok",   label:"Brokerage", icon:"◆", color:"var(--grn)" },
  { id:"crypto", label:"Crypto",    icon:"◈", color:"var(--red)" },
  { id:"s529a",  label:"529 Kid 1", icon:"◈", color:"var(--orn)" },
  { id:"s529b",  label:"529 Kid 2", icon:"◈", color:"var(--orn)" },
];

const mkC = (wA=0,wS=43,wE=55, mA=0,mS=43,mE=55, aA=0,aS=43,aE=55) => ({
  weekly:   {amt:wA, startAge:wS, endAge:wE},
  monthly:  {amt:mA, startAge:mS, endAge:mE},
  annually: {amt:aA, startAge:aS, endAge:aE},
});

const DEFAULT_BUCKETS = {
  cash:   { balance:0, growthRate:2, basisPct:100, contrib: mkC() },
  k401:   { balance:0, growthRate:7, basisPct:0,   contrib: mkC() },
  roth:   { balance:0, growthRate:7, basisPct:100, contrib: mkC() },
  brok:   { balance:0, growthRate:7, basisPct:100, contrib: mkC() },
  crypto: { balance:0, growthRate:7, basisPct:100, contrib: mkC() },
  s529a:  { balance:0, growthRate:6, basisPct:100, contrib: mkC() },
  s529b:  { balance:0, growthRate:6, basisPct:100, contrib: mkC() },
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
      if (age >= c.weekly.startAge   && age <= (c.weekly.endAge  ||99) && c.weekly.amt   > 0) contrib += c.weekly.amt   * 52;
      if (age >= c.monthly.startAge  && age <= (c.monthly.endAge ||99) && c.monthly.amt  > 0) contrib += c.monthly.amt  * 12;
      if (age >= c.annually.startAge && age <= (c.annually.endAge||99) && c.annually.amt > 0) contrib += c.annually.amt;
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
    <div style={{ background:"var(--bg3)", border:`1px solid ${"var(--brd)"}`, borderTop:`2px solid ${def.color}`, borderRadius:6, overflow:"hidden" }}>
      <button onClick={() => setOpen(v=>!v)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 13px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:def.color }}>{def.icon}</span>
          <span style={{ color:"var(--wht)", fontSize:12, fontWeight:500 }}>{def.label}</span>
          <span style={{ color:"var(--txm)", fontSize:11 }}>{$M(data.balance)}</span>
        </div>
        <span style={{ color:"var(--txm)", fontSize:11 }}>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ padding:"0 13px 13px", borderTop:`1px solid ${"var(--brd3)"}` }}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap:8, marginTop:10, marginBottom:10 }}>
            <div><div style={{ fontSize:9, color:"var(--txm)", marginBottom:3 }}>BALANCE</div><Inp value={data.balance} onChange={v=>set("balance",v)} prefix="$" step={1000}/></div>
            <div><div style={{ fontSize:9, color:"var(--txm)", marginBottom:3 }}>GROWTH %</div><Inp value={data.growthRate} onChange={v=>set("growthRate",v)} suffix="%" step={0.5}/></div>
            <div><div style={{ fontSize:9, color:"var(--txm)", marginBottom:3 }}>BASIS %</div><Inp value={data.basisPct} onChange={v=>set("basisPct",v)} suffix="%" step={1}/></div>
          </div>
          <div style={{ fontSize:9, color:"var(--txm)", marginBottom:5, letterSpacing:".08em" }}>CONTRIBUTIONS</div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "50px 1fr 1fr 1fr" : "55px 1fr 1fr 1fr", gap: isMobile ? "6px 5px" : "3px 6px", alignItems:"center" }}>
            <div style={{ fontSize:9, color:"var(--txf)" }}></div>
            {["AMOUNT","START","END"].map(h=><div key={h} style={{ fontSize:9, color:"var(--txf)", textAlign:"center" }}>{h}</div>)}
            {[{key:"weekly",lbl:"Weekly"},{key:"monthly",lbl:"Monthly"},{key:"annually",lbl:"Annual"}].map(({key,lbl})=>(
              <React.Fragment key={key}>
                <div style={{ fontSize:12, color:"var(--txm)" }}>{lbl}</div>
                <Inp value={data.contrib[key].amt}      onChange={v=>set(`contrib.${key}.amt`,v)}      prefix="$" step={key==="annually"?1000:50}/>
                <Inp value={data.contrib[key].startAge} onChange={v=>set(`contrib.${key}.startAge`,v)} step={1} min={0}/>
                <Inp value={data.contrib[key].endAge||55} onChange={v=>set(`contrib.${key}.endAge`,v)} step={1} min={0}/>
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
  const {k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,retireAge=55,convAmt=100000,convEndAge=72} = cfg;
  let k401=k401Init,roth=rothInit,brok=brokInit,bBasis=brok*(brokBasisPct/100),crypto=cryptoInit;
  const rows=[];
  const isMC = overrides !== null;

  // Tax-aware helpers — brackets inflate at 2.5%/yr to reflect real-world adjustments
  // In MC paths we apply this dynamically so bull/bear scenarios have correct bracket positions
  // Always inflate brackets at 2.5%/yr — applies to both deterministic and MC paths
  const bracketInflate = (y) => Math.pow(1.025, y);

  const taxCalcInflated = (ord, gains, y) => {
    const bi = bracketInflate(y);
    const std = STD_DED * bi;
    const ot = Math.max(0, ord - std);
    // Inflated ordinary brackets
    const bands=[[23200,.10],[71100,.12],[106750,.22],[182850,.24],[Infinity,.32]];
    let tax=0,rem=ot;
    for(const[w,r] of bands){if(rem<=0)break;const a=Math.min(rem,w*bi);tax+=a*r;rem-=a;}
    // Inflated LTCG brackets
    let ltcg=0;
    if(gains>0){
      const at0=Math.min(gains,Math.max(0,96700*bi-ot));
      const at15=Math.min(gains-at0,487050*bi);
      ltcg=at15*.15+Math.max(0,gains-at0-at15)*.20;
    }
    const ceiling0 = Math.min(94300*bi, Math.max(0,96700*bi-gains));
    return {ordTaxable:ot, total:tax+ltcg, ceiling0};
  };

  // Dynamic conversion ceiling — how much more ordinary income fits in the 12% bracket.
  // Inflates at 2.5%/yr. SS income + 401k living draws are already in ordTaxable (passed in),
  // so conversion room naturally shrinks once SS starts or withdrawals grow.
  // Also guards against pushing LTCG gains out of the 0% band.
  const dynCeiling=(g,y)=>Math.min(94300*bracketInflate(y), Math.max(0,96700*bracketInflate(y)-g));

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
      const g0=wBrok*gR;const{ordTaxable}=taxCalcInflated(w401+ssTx,g0,y);
      conv=Math.min(Math.max(0,dynCeiling(g0,y)-ordTaxable),k401-w401);
    } else if(strat==='rule55'){
      w401=Math.min(need,k401);wBrok=Math.min(need-w401,brok);wRoth=Math.min(need-w401-wBrok,roth);
    } else if(strat==='aggressive'){
      wBrok=Math.min(need,brok);wRoth=Math.min(need-wBrok,roth);w401=Math.min(need-wBrok-wRoth,k401);
      const g0=wBrok*gR;const{ordTaxable:ot0}=taxCalcInflated(w401+ssTx,g0,y);
      conv=Math.min(Math.max(0,383900*bracketInflate(y)-ot0),k401-w401);
      const tW=taxCalcInflated(w401+conv+ssTx,g0,y).total,tWo=taxCalcInflated(w401+ssTx,g0,y).total;
      const cte=Math.max(0,tW-tWo),ab=Math.min(cte,brok-wBrok);
      wBrok+=ab;if(ab<cte&&cte>0)conv=conv*(ab/cte);
    } else {
      // ── Hybrid Ladder ──────────────────────────────────────────
      // Draw brokerage for living; convert a user-specified fixed amount from
      // 401k → Roth every year in the conversion window (retireAge → convEndAge).
      // Conversion tax is paid from brokerage (same as Aggressive Roth).
      // After convEndAge or when 401k/brokerage runs low, fall back to brokerage draw.
      wBrok = Math.min(need, brok);
      wRoth = Math.min(need - wBrok, roth);
      w401  = Math.min(need - wBrok - wRoth, k401);

      if (age <= cfg.convEndAge && k401 > w401) {
        // Target conversion amount (user-set), capped by available 401k
        const targetConv = Math.min(cfg.convAmt, k401 - w401);
        // Estimate conversion tax and fund it from brokerage
        const tWith  = taxCalcInflated(w401 + targetConv + ssTx, wBrok*gR, y).total;
        const tWithout = taxCalcInflated(w401 + ssTx, wBrok*gR, y).total;
        const convTaxEst = Math.max(0, tWith - tWithout);
        const addlBrok = Math.min(convTaxEst, brok - wBrok);
        wBrok += addlBrok;
        // Scale back conversion proportionally if brokerage can't cover full tax
        conv = addlBrok >= convTaxEst ? targetConv : targetConv * (addlBrok / Math.max(1, convTaxEst));
      }
    }

    const rmdShortfall=Math.max(0,rmdRequired-w401-conv);
    const rmdExTax=rmdShortfall>0
      ?taxCalcInflated(w401+conv+rmdShortfall+ssTx,0,y).total-taxCalcInflated(w401+conv+ssTx,0,y).total
      :0;
    const rmdNet=Math.max(0,rmdShortfall-rmdExTax);
    w401=Math.min(w401+rmdShortfall,k401-conv);

    const gains=wBrok*gR,basisWdr=wBrok*(1-gR);
    const tFull=taxCalcInflated(w401+conv+ssTx,gains,y);
    const tLiving=taxCalcInflated(w401+ssTx,gains,y);
    const convTax=tFull.total-tLiving.total;
    const isRmd=rmdRequired>100;

    // Net income after tax — survival check uses this
    const netIncome = grossSpend - tLiving.total;

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
      netIncome:Math.round(netIncome),
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
    const pathRows=simPath(strat,cfg,ov);
    const lastAge=pathRows.length?pathRows[pathRows.length-1].age:retAge;
    // Record each age that ran
    for(const r of pathRows) if(byAge[r.age]) byAge[r.age].push(r.total);
    // If path ended early (depleted), fill remaining ages with 0
    for(const a of ages){
      if(a>lastAge) byAge[a].push(0);
    }
  }

  const pp=(arr,p)=>{
    if(!arr.length)return 0;
    const s=[...arr].sort((a,b)=>a-b);
    return s[Math.floor(p/100*(s.length-1))];
  };
  // Survival = % of sims that end with >$50k at the final age
  const finalAge=retAge+35;
  const finalArr=byAge[finalAge]||[];
  const surv90=finalArr.length?finalArr.filter(v=>v>=50000).length/nSims:0;

  return{
    fan:ages.map(a=>({age:a,
      p10:pp(byAge[a],10),p25:pp(byAge[a],25),p50:pp(byAge[a],50),
      p75:pp(byAge[a],75),p90:pp(byAge[a],90)})),
    surv90,nSims
  };
}

const TAX_STRATS=[
  {id:'brokFirst', label:'Brokerage First', sub:'+ Roth conversion ladder',    accent:'#4ae6a0'},
  {id:'rule55',    label:'Rule of 55',      sub:'401k first, no conversions',  accent:'#e6b84a'},
  {id:'hybrid',    label:'Hybrid Ladder',   sub:'Brokerage + targeted conversion', accent:'#4a9fe6'},
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
    if(currentAge>=c.weekly.startAge   &&currentAge<=(c.weekly.endAge||99))   a+=c.weekly.amt*52;
    if(currentAge>=c.monthly.startAge  &&currentAge<=(c.monthly.endAge||99))  a+=c.monthly.amt*12;
    if(currentAge>=c.annually.startAge &&currentAge<=(c.annually.endAge||99)) a+=c.annually.amt;
    return s+a;
  },0);

  const chartData = rows.map(r => { const d={age:r.age}; BUCKET_DEFS.forEach(b=>{d[b.label]=r[b.id];}); return d; });
  const [tab, setTab] = useState('chart');

  return (
    <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "310px 1fr", gap:16 }}>
      {/* Left */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ background:"var(--bg3)", border:`1px solid ${"var(--brd)"}`, borderRadius:6, padding:"13px 14px" }}>
          <div style={{ fontSize:12, color:"var(--txm)", letterSpacing:".1em", marginBottom:10 }}>TIMELINE</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{l:"CURRENT AGE",v:currentAge,f:handleCurrentAge,m:18},{l:"RETIRE AGE",v:retireAge,f:handleRetireAge,m:currentAge+1}].map(({l,v,f,m})=>(
              <div key={l}><div style={{ fontSize:9, color:"var(--txm)", marginBottom:3 }}>{l}</div><Inp value={v} onChange={f} step={1} min={m}/></div>
            ))}
          </div>
          <div style={{ marginTop:8, display:"flex", gap:14, fontSize:12, color:"var(--txm)" }}>
            <span>Horizon: <span style={{color:"var(--gold)"}}>{retireAge-currentAge} yrs</span></span>
            <span>Annual: <span style={{color:"var(--grn)"}}>{$M(annualC)}</span></span>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:"var(--txm)", letterSpacing:".08em" }}>BUCKETS</div>
          <button onClick={toggleAll} style={{ cursor:"pointer", background:"transparent", border:`1px solid ${"var(--brd)"}`, borderRadius:3, color:"var(--txm)", fontFamily:"'DM Mono',monospace", fontSize:12, padding:"2px 9px" }}>
            {showAll?"Collapse all":"Expand all"}
          </button>
        </div>

        {BUCKET_DEFS.map(def => (
          <BucketCard key={def.id} def={def} data={buckets[def.id]} onChange={d=>updateBucket(def.id,d)} showAll={showAll} isMobile={isMobile}/>
        ))}

        {/* Lump sums */}
        <div style={{ background:"var(--bg3)", border:`1px solid ${"var(--brd)"}`, borderTop:"2px solid var(--pur)", borderRadius:6, overflow:"hidden" }}>
          <button onClick={()=>set('lumpOpen',!lumpOpen)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 13px", background:"transparent", border:"none", cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{color:"var(--pur)"}}>◈</span>
              <span style={{color:"var(--wht)",fontSize:12,fontWeight:500}}>Lump Sums</span>
              <span style={{color:"var(--txm)",fontSize:12}}>{totalLumps>0?$M(totalLumps)+" total":"one-time inflows"}</span>
            </div>
            <span style={{color:"var(--txm)",fontSize:12}}>{lumpOpen?"▲":"▼"}</span>
          </button>
          {lumpOpen && (
            <div style={{ padding:"0 13px 13px", borderTop:`1px solid ${"var(--brd3)"}` }}>
              <div style={{ fontSize:9, color:"var(--txm)", margin:"9px 0 7px", letterSpacing:".08em" }}>ONE-TIME INFLOWS → Brokerage</div>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:9, padding:"7px 9px", background:"var(--ibg)", borderRadius:3, border:`1px solid ${"var(--brd)"}` }}>
                <div style={{fontSize:12,color:"var(--txm)",whiteSpace:"nowrap"}}>FILL ALL</div>
                <Inp value={fillAmt} onChange={setFillAmt} prefix="$" step={1000}/>
                <button onClick={applyFill} style={{cursor:"pointer",background:"#a78bfa22",border:"1px solid #a78bfa66",borderRadius:3,color:"var(--pur)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0}}>Apply</button>
                <button onClick={clearLumps} style={{cursor:"pointer",background:"transparent",border:`1px solid ${"var(--brd2)"}`,borderRadius:3,color:"var(--txm)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0}}>Clear</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 8px", alignItems:"center" }}>
                <div style={{fontSize:9,color:"var(--txf)"}}>AGE</div>
                <div style={{fontSize:9,color:"var(--txf)"}}>AMOUNT</div>
                {Array.from({length:retireAge-currentAge},(_,i)=>currentAge+i).map(age=>(
                  <React.Fragment key={age}>
                    <div style={{fontSize:12,color:(lumpSums[age]||0)>0?"var(--pur)":"var(--txm)",fontWeight:(lumpSums[age]||0)>0?500:400}}>{age}</div>
                    <Inp value={lumpSums[age]||0} onChange={v=>setLump(age,v)} prefix="$" step={1000}/>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div style={{ display:"flex", flexDirection:"column", gap:12, minWidth:0, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap:8 }}>
          {[
            {l:"TODAY",           v:$M(totalNow),                                              sub:"starting portfolio",       c:"var(--gold)"},
            {l:`AT ${retireAge}`, v:$M(totalRetire),                                           sub:"projected total",          c:"var(--grn)"},
            {l:`EX-529 AT ${retireAge}`,v:$M(retireRow.total529ex||0),                        sub:"excl. 529s",               c:"var(--blu)"},
            {l:"GROWTH",          v:$M(totalRetire-totalNow-(annualC*(retireAge-currentAge))-totalLumps), sub:"investment return", c:"var(--pur)"},
            {l:"TOTAL CONTRIB",   v:$M(annualC*(retireAge-currentAge)+totalLumps),             sub:`periodic + ${$M(totalLumps)} lump`, c:"var(--orn)"},
          ].map((k,i)=>(
            <div key={i} style={{background:"var(--bg3)",border:`1px solid ${"var(--brd)"}`,borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
              <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".08em",marginBottom:5}}>{k.l}</div>
              <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
              <div style={{fontSize:12,color:"var(--txm)",marginTop:2}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Bucket balances at retire */}
        <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd)"}`,borderRadius:6,padding:"12px 14px"}}>
          <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".09em",marginBottom:10}}>BALANCES AT RETIREMENT (AGE {retireAge})</div>
          <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(4,1fr)" : "repeat(7,1fr)",gap:6}}>
            {BUCKET_DEFS.map(b=>(
              <div key={b.id} style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:b.color,marginBottom:3}}>{b.label.toUpperCase()}</div>
                <div style={{fontSize:12,color:"var(--wht)",fontWeight:500}}>{$M(retireRow[b.id]||0)}</div>
                <div style={{fontSize:9,color:"var(--txf)",marginTop:1}}>{totalRetire>0?((retireRow[b.id]||0)/totalRetire*100).toFixed(0):0}%</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",gap:7}}>
          {[["chart","Growth Chart"],["table","Year-by-Year"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{cursor:"pointer",borderRadius:4,fontFamily:"'DM Mono',monospace",padding:"4px 12px",fontSize:12,border:`1px solid ${"var(--brd2)"}`,background:tab===id?`${"var(--gold)"}11`:"transparent",color:tab===id?"var(--gold)":"var(--txm)",borderColor:tab===id?`${"var(--gold)"}55`:"var(--brd2)"}}>
              {lbl}
            </button>
          ))}
        </div>

        {tab==="chart" && (
          <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd)"}`,borderRadius:6,padding:"16px 8px 12px"}}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>{BUCKET_DEFS.map(b=>(
                  <linearGradient key={b.id} id={`ag${b.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={b.color} stopOpacity={0.4}/><stop offset="95%" stopColor={b.color} stopOpacity={0.04}/>
                  </linearGradient>
                ))}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke={"var(--brd3)"}/>
                <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
                <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <ReferenceLine x={retireAge} stroke={`${"var(--gold)"}44`} strokeDasharray="4 2" label={{value:`Retire ${retireAge}`,fill:"var(--gold)",fontSize:12,position:"insideTopRight"}}/>
                {BUCKET_DEFS.map(b=>(
                  <Area key={b.id} type="monotone" dataKey={b.label} stackId="1" stroke={b.color} strokeWidth={1.5} fill={`url(#ag${b.id})`}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab==="table" && (
          <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd)"}`,borderRadius:6,overflowX:"auto",overflowY:"auto",maxHeight:"60vh",WebkitOverflowScrolling:"touch",width:"100%"}}>
            <table style={{borderCollapse:"collapse",fontSize:12,minWidth:"600px"}}>
              <thead style={{position:"sticky",top:0,zIndex:2,background:"var(--bg3)"}}><tr style={{borderBottom:`1px solid ${"var(--brd)"}`}}>
                {["Age",...BUCKET_DEFS.map(b=>b.label),"Total","Ex-529"].map((h,i)=>(
                  <th key={h} style={{padding:"8px 9px",textAlign:"right",fontWeight:400,whiteSpace:"nowrap",fontSize:12,letterSpacing:".05em",color:i===0?"var(--txm)":i<=BUCKET_DEFS.length?BUCKET_DEFS[i-1] && BUCKET_DEFS[i-1].color:i===BUCKET_DEFS.length+1?"var(--wht)":"var(--blu)"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${"var(--bg)"}`,background:r.age===retireAge?`${"var(--gold)"}08`:i%2===0?"transparent":"var(--bg3)"}}>
                    <td style={{padding:"6px 9px",textAlign:"right",color:r.age===retireAge?"var(--gold)":"var(--txm)",fontWeight:r.age===retireAge?500:400}}>{r.age}{r.age===retireAge?" ★":""}</td>
                    {BUCKET_DEFS.map(b=>(
                      <td key={b.id} style={{padding:"6px 9px",textAlign:"right",color:r[b.id]>0?b.color:"var(--txd)"}}>{r[b.id]>0?$M(r[b.id]):"—"}</td>
                    ))}
                    <td style={{padding:"6px 9px",textAlign:"right",color:"var(--wht)",fontWeight:500}}>{$M(r.total)}</td>
                    <td style={{padding:"6px 9px",textAlign:"right",color:"var(--blu)"}}>{$M(r.total529ex||0)}</td>
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
function RetirementPhase({ linkedBalances, retireAge, initWithdrawal=0 }) {
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
  const [convAmt,      setConvAmt]    = useState(100_000);
  const [convEndAge,   setConvEndAge] = useState(72);
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

  const cfg = {k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,mcStdDev,retireAge,convAmt,convEndAge};
  const allData = useMemo(()=>{const r={};for(const s of TAX_STRATS)r[s.id]=simPath(s.id,cfg);return r;},
    [k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,retireAge,convAmt,convEndAge]);

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
  },[strat,k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,withdrawal,inflation,growth,ssAmount,ssStartAge,retireAge,mcStdDev,convAmt,convEndAge]);

  const tBtnStyle = id => ({cursor:"pointer",borderRadius:4,fontFamily:"'DM Mono',monospace",padding:"4px 12px",fontSize:12,border:`1px solid ${"var(--brd2)"}`,background:tabV===id?`${"var(--gold)"}11`:"transparent",color:tabV===id?"var(--gold)":"var(--txm)",borderColor:tabV===id?`${"var(--gold)"}55`:"var(--brd2)"});

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Link banner */}
      <div style={{background: linked?`${"var(--grn)"}10`:"var(--bg3)", border:`1px solid ${linked?"var(--grn)"+"44":"var(--brd2)"}`, borderRadius:6, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10}}>
        <div style={{fontSize:12, color: linked?"var(--grn)":"var(--txm)"}}>
          {linked
            ? `⇠ Balances auto-linked from Phase 1 retirement (age ${retireAge}): 401k ${$M(linkedBalances.k401)} · Roth ${$M(linkedBalances.roth)} · Brokerage ${$M(linkedBalances.brok)} · Crypto ${$M(linkedBalances.crypto)}`
            : "Manual override — balances not linked to Phase 1"}
        </div>
        <button onClick={()=>setLinked(v=>!v)} style={{cursor:"pointer",background:linked?"#4ae6a011":"transparent",border:`1px solid ${linked?"var(--grn)"+"66":"var(--brd2)"}`,borderRadius:4,color:linked?"var(--grn)":"var(--txm)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"4px 12px"}}>
          {linked?"Unlink (manual)":"Re-link from Phase 1"}
        </button>
      </div>

      {/* Settings */}
      {showCfg && (
        <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:6,padding:"16px 18px"}}>
          <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".11em",marginBottom:10}}>STARTING BALANCES AT RETIREMENT {linked&&<span style={{color:`${"var(--grn)"}66`}}>(linked)</span>}</div>
          <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10,marginBottom:16}}>
            <Field label="401(k)"    value={k401Init}   onChange={setK401}    step={10000} disabled={linked} hint={$M(k401Init)}/>
            <Field label="ROTH IRA"  value={rothInit}   onChange={setRoth}    step={5000}  disabled={linked} hint={$M(rothInit)}/>
            <Field label="BROKERAGE" value={brokInit}   onChange={setBrok}    step={10000} disabled={linked} hint={$M(brokInit)}/>
            <Field label="CRYPTO"    value={cryptoInit} onChange={setCrypto}  step={1000}  disabled={linked} hint={$M(cryptoInit)}/>
          </div>
          <div style={{borderTop:`1px solid ${"var(--brd)"}`,paddingTop:14,marginBottom:0}}>
            <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".11em",marginBottom:10}}>WITHDRAWAL & GROWTH</div>
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10}}>
              <Field label="ANNUAL WITHDRAWAL"  value={withdrawal}   onChange={setWithdrawal} step={5000}  hint="Gross yr 1 target"/>
              <Field label="BROKERAGE BASIS %"  value={brokBasisPct} onChange={setBrokBasis}  prefix="%" step={1} disabled={linked} hint={`${brokBasisPct.toFixed(0)}% is cost basis`}/>
              <Field label="PORTFOLIO GROWTH %" value={growth}       onChange={setGrowth}     prefix="%" step={0.5} hint="Nominal annual return"/>
              <Field label="INFLATION %"        value={inflation}    onChange={setInflation}  prefix="%" step={0.25} hint="Withdrawal adj."/>
            </div>
          </div>
          <div style={{borderTop:`1px solid ${"var(--brd)"}`,paddingTop:14,marginTop:14}}>
            <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".11em",marginBottom:10}}>SS · MONTE CARLO · AFTER-TAX DISCOUNTS</div>
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10}}>
              <Field label="COMBINED SS / YR"   value={ssAmount}   onChange={setSsAmount}   step={1000}/>
              <Field label="SS START AGE"       value={ssStartAge} onChange={setSsStartAge} prefix="" step={1} min={62} hint="62–70 · 85% taxable"/>
              <Field label="MC STD DEV %"       value={mcStdDev}   onChange={setMcStdDev}   prefix="%" step={1} hint="Annualized vol"/>
              <div style={{display:"flex",alignItems:"flex-end"}}>
                <button onClick={doMC} disabled={mcRun} style={{cursor:"pointer",width:"100%",padding:"6px",background:"transparent",border:"1px solid var(--pur)",borderRadius:4,color:"var(--pur)",fontFamily:"'DM Mono',monospace",fontSize:12,opacity:mcRun?0.6:1}}>
                  {mcRun?"Running…":"▶ Monte Carlo"}
                </button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:10,marginTop:10}}>
              <Field label="401k FUTURE TAX %"  value={k401Disc}  onChange={setK401Disc} prefix="%" step={1} hint="After-tax 401k discount"/>
              <Field label="LTCG RATE %"        value={ltcgDisc}  onChange={setLtcgDisc} prefix="%" step={1} hint="Brok/crypto gain discount"/>
              <Field label="HYBRID: CONV. / YR" value={convAmt}   onChange={setConvAmt}  step={5000} hint="Annual 401k→Roth conversion"/>
              <Field label="HYBRID: CONV. END AGE" value={convEndAge} onChange={setConvEndAge} prefix="" step={1} min={55} hint="Stop converting at this age"/>
            </div>
          </div>
        </div>
      )}

      {/* Strategy cards */}
      <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:9}}>
        {TAX_STRATS.map(s=>(
          <button key={s.id} onClick={()=>setStrat(s.id)} style={{cursor:"pointer",borderRadius:5,fontFamily:"'DM Mono',monospace",padding:"11px 13px",textAlign:"left",background:strat===s.id?`${s.accent}14`:"var(--bg3)",border:`1px solid ${strat===s.id?s.accent:"var(--brd2)"}`,borderTop:`2px solid ${strat===s.id?s.accent:"var(--brd2)"}`}}>
            <div style={{color:strat===s.id?s.accent:"var(--txm)",fontWeight:500,marginBottom:2,fontSize:12}}>{s.label}</div>
            <div style={{color:"var(--txm)",fontSize:12}}>{s.sub}</div>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:9}}>
        {[
          {l:`GROSS AT ${retireAge+30}`, v:$M(at85.total||0),    sub:`from ${$M(totalStart)}`,   c:accent},
          {l:`AFTER-TAX AT ${retireAge+30}`,v:$M(afterTax(at85)),sub:`401k @${k401Disc}% · LTCG @${ltcgDisc}%`, c:"var(--grn)",hi:true},
          {l:"YR 1 NET INCOME",         v:$F(yr1.netIncome||0),  sub:`gross ${$M(withdrawal)}`,  c:"var(--wht)"},
          {l:"LIFETIME LIVING TAX",     v:$M(lifeTax),           sub:`avg ${pct(avgEff)} eff.`,  c:"var(--red)"},
        ].map((k,i)=>(
          <div key={i} style={{background:"var(--bg3)",border:`1px solid ${k.hi?"var(--grn)"+"60":"var(--brd)"}`,borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
            <div style={{fontSize:12,color:k.hi?"var(--grn)":"var(--txm)",letterSpacing:".09em",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
            <div style={{fontSize:12,color:"var(--txm)",marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Comparison strip */}
      <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd)"}`,borderRadius:6,padding:"13px 16px"}}>
        <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".09em",marginBottom:10}}>STRATEGY COMPARISON AT AGE {retireAge+30}</div>
        <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap: isMobile ? 12 : 0,overflowX: isMobile ? "auto" : "visible"}}>
          {comparisons.map((s,i)=>(
            <div key={s.id} style={{borderLeft: isMobile ? "none" : i>0?`1px solid ${"var(--brd)"}`:"none",paddingLeft:i>0?16:0,paddingRight:16}}>
              <div style={{fontSize:12,color:s.accent,marginBottom:7,fontWeight:500}}>{s.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 10px",fontSize:12}}>
                {[
                  ["GROSS",     $M(s.at85),     "var(--wht)"],
                  ["AFTER-TAX", $M(s.at85AT),   "var(--grn)"],
                  ["401k",      $M(s.k401_85),  "var(--gold)"],
                  ["ROTH",      $M(s.roth85),   "var(--blu)"],
                  ["BROKERAGE", $M(s.brok85),   "var(--grn)"],
                  ["LIFETIME TAX",$M(s.ltax),   "var(--red)"],
                  ["CONV. TAX", s.ctax>0?$M(s.ctax):"—","var(--orn)"],
                  ["AVG EFF.",  pct(s.avgEff),  s.avgEff<.05?"var(--grn)":s.avgEff<.12?"var(--gold)":"var(--red)"],
                ].map(([lbl,val,col],j)=>(
                  <React.Fragment key={j}>
                    <div style={{color:"var(--txm)",fontSize:12}}>{lbl}</div>
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
        {[["chart","Portfolio Growth"],["table","Annual Detail"],["mc","Monte Carlo"],["scenario","Scenario Builder"]].map(([id,lbl])=>(
          <button key={id} style={tBtnStyle(id)} onClick={()=>setTabV(id)}>{lbl}</button>
        ))}
        <button onClick={()=>setShowCfg(v=>!v)} style={{...tBtnStyle('__'),marginLeft:"auto",color:"var(--txm)",borderColor:"var(--brd2)",background:"transparent"}}>
          {showCfg?"▲ Hide Settings":"▼ Show Settings"}
        </button>
      </div>

      {/* Chart */}
      {tabV==="chart" && (
        <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:6,padding:"16px 8px 12px"}}>
          <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".07em",marginBottom:12,paddingLeft:8}}>{TAX_STRATS.find(s=>s.id===strat).label.toUpperCase()} · BALANCES {retireAge}–{retireAge+35}</div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>{Object.entries(ACCT_C).map(([k,c])=>(
                <linearGradient key={k} id={`rt${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.4}/><stop offset="95%" stopColor={c} stopOpacity={0.04}/>
                </linearGradient>
              ))}</defs>
              <CartesianGrid strokeDasharray="3 3" stroke={"var(--brd3)"}/>
              <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
              <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
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
        <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:6,overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:`1px solid ${"var(--brd2)"}`}}>
              {["Age","Target","SS","RMD","← 401k","← Roth","← Brok.","Conv.","Living Tax","Eff %","Net Income","Gross Total","After-Tax"].map(h=>(
                <th key={h} style={{padding:"8px 9px",textAlign:"right",color:h==="After-Tax"?"var(--grn)":"var(--txm)",fontSize:12,fontWeight:400,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${"var(--bg)"}`,background:r.isRmd?"var(--rmd)":i%2===0?"transparent":"var(--bg3)"}}>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.isRmd?"var(--pur)":"var(--gold)"}}>{r.age}{r.isRmd?" ⚑":""}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"var(--txm)"}}>{$M(r.grossSpend)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.ss>0?"var(--grn)":"var(--txd)"}}>{r.ss>0?$M(r.ss):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.isRmd?"var(--pur)":"var(--txd)"}}>{r.isRmd?$M(r.rmd):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.w401>0?"var(--gold)":"var(--txd)"}}>{r.w401>0?$M(r.w401):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.wRoth>0?"var(--blu)":"var(--txd)"}}>{r.wRoth>0?$M(r.wRoth):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.wBrok>0?"var(--grn)":"var(--txd)"}}>{r.wBrok>0?$M(r.wBrok):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.conv>0?"var(--pur)":"var(--txd)"}}>{r.conv>0?$M(r.conv):"—"}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.livingTax===0?"var(--grn)":"var(--red)"}}>{$F(r.livingTax)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:r.effRate<.05?"var(--grn)":r.effRate<.15?"var(--gold)":"var(--red)"}}>{pct(r.effRate)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"var(--wht)"}}>{$F(r.netIncome)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"var(--wht)",fontWeight:500}}>{$M(r.total)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",color:"var(--grn)",fontWeight:500}}>{$M(afterTax(r))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:"6px 12px",fontSize:12,color:"var(--txf)",borderTop:`1px solid ${"var(--brd3)"}`}}>⚑ RMD year (age 73+ · IRS Uniform Lifetime Table)</div>
        </div>
      )}

      {/* Monte Carlo */}
      {tabV==="mc" && (
        <div>
          {!mcRes && !mcRun && (
            <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:6,padding:"40px",textAlign:"center"}}>
              <div style={{fontSize:12,color:"var(--txm)",marginBottom:16}}>600 tax-aware simulations · mean {growth}% · std dev {mcStdDev}% · brackets inflation-adjusted</div>
              <button onClick={doMC} style={{cursor:"pointer",background:"transparent",border:"1px solid var(--pur)",borderRadius:4,color:"var(--pur)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"8px 24px"}}>▶ Run Monte Carlo</button>
            </div>
          )}
          {mcRun && <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:6,padding:"40px",textAlign:"center",color:"var(--pur)"}}>Running 600 simulations…</div>}
          {mcRes && !mcRun && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",gap:9}}>
                {[
                  {l:"SURVIVAL TO END",v:pct(mcRes.surv90),c:mcRes.surv90>.9?"var(--grn)":mcRes.surv90>.7?"var(--gold)":"var(--red)"},
                  {l:`MEDIAN AT ${retireAge+30} (P50)`,v:$M((mcRes.fan.find(r=>r.age===retireAge+30)||{}).p50||0),c:"var(--pur)"},
                  {l:`BEAR AT ${retireAge+30} (P10)`,  v:$M((mcRes.fan.find(r=>r.age===retireAge+30)||{}).p10||0),c:"var(--red)"},
                  {l:`BULL AT ${retireAge+30} (P90)`,  v:$M((mcRes.fan.find(r=>r.age===retireAge+30)||{}).p90||0),c:"var(--grn)"},
                ].map((k,i)=>(
                  <div key={i} style={{background:"var(--bg3)",border:`1px solid ${"var(--brd)"}`,borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
                    <div style={{fontSize:12,color:"var(--txm)",marginBottom:5}}>{k.l}</div>
                    <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:6,padding:"16px 8px 12px"}}>
                <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".07em",marginBottom:12,paddingLeft:8}}>AFTER-TAX PORTFOLIO · FAN CHART · P10 / P25 / P50 / P75 / P90</div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mcRes.fan}>
                    <defs>
                      <linearGradient id="mc90" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.15}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02}/></linearGradient>
                      <linearGradient id="mc75" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0.04}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={"var(--brd3)"}/>
                    <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
                    <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
                    <Tooltip content={({active,payload,label})=>{
                      if(!active||!payload || !payload.length)return null;
                      const d=mcRes.fan.find(r=>r.age===label)||{};
                      return(<div style={{background:"var(--bg3)",border:`1px solid ${"var(--brd2)"}`,borderRadius:5,padding:"10px 14px",fontSize:12,fontFamily:"DM Mono"}}>
                        <div style={{color:"var(--gold)",marginBottom:6}}>Age {label}</div>
                        {[["P90","var(--grn)",d.p90],["P75","var(--pur)",d.p75],["P50","var(--wht)",d.p50],["P25","var(--gold)",d.p25],["P10","var(--red)",d.p10]].map(([n,c,v])=>(
                          <div key={n} style={{color:c,marginBottom:2}}>{n}: {$M(v||0)}</div>
                        ))}
                      </div>);
                    }}/>
                    <Area type="monotone" dataKey="p90" stroke={"var(--grn)"} strokeWidth={1} strokeDasharray="4 2" fill="url(#mc90)"/>
                    <Area type="monotone" dataKey="p75" stroke={"var(--pur)"} strokeWidth={1} fill="url(#mc75)"/>
                    <Area type="monotone" dataKey="p50" stroke={"var(--wht)"} strokeWidth={2} fill="none"/>
                    <Area type="monotone" dataKey="p25" stroke={"var(--gold)"} strokeWidth={1} fill="none"/>
                    <Area type="monotone" dataKey="p10" stroke={"var(--red)"} strokeWidth={1} strokeDasharray="4 2" fill="none"/>
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



// PHASE 2 — SCENARIO BUILDER
// ══════════════════════════════════════════════════════════════
function Slider({ label, value, onChange, min, max, step, fmt, hint, warn }) {
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
        <span style={{fontSize:12,color:"var(--txm)",letterSpacing:".08em"}}>{label}</span>
        <span style={{fontSize:12,color:warn?"var(--red)":"var(--gold)",fontWeight:500,fontFamily:"'DM Mono',monospace"}}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        style={{width:"100%",accentColor:"var(--gold)",cursor:"pointer"}}/>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--txf)",marginTop:2}}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
      {hint&&<div style={{fontSize:12,color:warn?"var(--red)":"var(--txf)",marginTop:3}}>{hint}</div>}
    </div>
  );
}

// ── RMD Target Solver ────────────────────────────────────────
// Given a target 401k balance at 73, binary-search for the
// uniform annual outflow (withdrawals + conversions) needed
// to hit it, then distribute proportionally across 3 phases.
function solveForTarget(cfg) {
  const {k401Init, retireAge=55, growth, inflation, withdrawal,
         ssAmount, ssStartAge, brokInit, brokBasisPct} = cfg;
  const gr = growth/100;
  const yearsTo73 = 73 - retireAge;

  // Quick projection of 401k under a given annual outflow
  const project401k = (annualOut) => {
    let k401 = k401Init;
    for(let y=0; y<yearsTo73; y++){
      const age = retireAge+y;
      const ss = age>=ssStartAge?ssAmount:0;
      const grossSpend = withdrawal*(1+inflation/100)**y;
      const need = Math.max(0, grossSpend-ss);
      // outflow is capped by available balance
      const out = Math.min(annualOut, k401);
      k401 = Math.max(0, k401-out)*(1+gr);
    }
    return k401;
  };

  return (target401kAt73) => {
    if(target401kAt73 >= project401k(0)) return {conv1Amt:0,conv2Amt:0,conv3Amt:0};
    if(target401kAt73 <= 0) return {conv1Amt:400000,conv2Amt:300000,conv3Amt:200000};

    // Binary search for annual outflow that hits target
    let lo=0, hi=600000, bestOut=0;
    for(let i=0; i<40; i++){
      const mid=(lo+hi)/2;
      if(project401k(mid) > target401kAt73) lo=mid;
      else hi=mid;
    }
    bestOut=(lo+hi)/2;

    // The outflow needs to come from somewhere - it's the sum of
    // 401k draws for living + conversions. Split by phase:
    // Phase A (pre-SS): higher conversions since no SS income taking up bracket room
    // Phase B (post-SS): moderate, SS reduces bracket space
    // Phase C (wind-down): lighter, approaching RMD onset
    const ssAge = ssStartAge || 67;
    const retAge = retireAge || 55;
    const preSSYears  = Math.max(0, ssAge - retAge);
    const postSSYears = Math.max(0, 72 - ssAge);
    const winddownYrs = Math.max(0, 72 - Math.max(ssAge, 69));

    // Weight phases: pre-SS gets 1.3x, post-SS 1.0x, wind-down 0.6x
    const totalWeight = preSSYears*1.3 + postSSYears*1.0 + winddownYrs*0.6;
    const baseOut = totalWeight>0 ? bestOut*yearsTo73/totalWeight : bestOut;

    // Subtract living expense draw from 401k (which is ~0 in brokerage-first strategy)
    // Conversion = total outflow - 401k draws for living
    const conv1 = Math.max(0, Math.round(baseOut*1.3/5000)*5000);
    const conv2 = Math.max(0, Math.round(baseOut*1.0/5000)*5000);
    const conv3 = Math.max(0, Math.round(baseOut*0.6/5000)*5000);

    return {
      conv1Amt: Math.min(conv1, 400000),
      conv2Amt: Math.min(conv2, 300000),
      conv3Amt: Math.min(conv3, 200000),
    };
  };
}

function simScenario(cfg) {
  const {k401Init,rothInit,brokInit,cryptoInit,brokBasisPct,
         withdrawal,inflation,growth,ssAmount,ssStartAge,
         conv1Amt,conv1End,conv2Amt,conv2End,conv3Amt,conv3End,
         retireAge=55,k401Disc=25} = cfg;

  let k401=k401Init,roth=rothInit,brok=brokInit,
      bBasis=brok*(brokBasisPct/100),crypto=cryptoInit;
  let r55k401=k401Init,r55roth=rothInit,r55brok=brokInit,
      r55basis=brokInit*(brokBasisPct/100),r55crypto=cryptoInit;
  const rows=[],rule55Rows=[];

  // Conversion amount by age using 3-phase step schedule
  const convForAge = (age) => {
    if(age<=conv1End) return conv1Amt;
    if(age<=conv2End) return conv2Amt;
    if(age<=conv3End) return conv3Amt;
    return 0;
  };

  for(let y=0;y<36;y++){
    const age=retireAge+y, gr=growth/100;
    const ss=age>=ssStartAge?ssAmount:0, ssTx=ss*0.85;
    const grossSpend=withdrawal*(1+inflation/100)**y;
    const need=Math.max(0,grossSpend-ss);
    const gR=brok>0?Math.max(0,(brok-bBasis)/brok):0;
    const rmdRequired=age>=73&&RMD_DIV[age]?k401/RMD_DIV[age]:0;

    // Draw brokerage first for living expenses
    let wBrok=Math.min(need,brok),wRoth=Math.min(need-wBrok,roth);
    let w401=Math.min(need-wBrok-wRoth,k401),conv=0;

    // Apply conversion with brokerage capacity constraint
    const targetConv=convForAge(age);
    if(targetConv>0&&age<=72&&k401>w401){
      const maxConv=Math.min(targetConv,k401-w401);
      const gains=wBrok*gR;
      const tOut=taxCalc(w401+ssTx,gains).total;
      const tIn=taxCalc(w401+maxConv+ssTx,gains).total;
      const convTaxEst=Math.max(0,tIn-tOut);
      const brokAvail=Math.max(0,brok-wBrok);
      if(convTaxEst<=brokAvail){
        conv=maxConv; wBrok+=convTaxEst;
      } else if(brokAvail>0&&convTaxEst>0){
        const scale=brokAvail/convTaxEst;
        conv=maxConv*scale; wBrok+=brokAvail;
      }
    }

    // RMD enforcement
    const rmdShort=Math.max(0,rmdRequired-w401-conv);
    const rmdExTax=rmdShort>0?taxCalc(w401+conv+rmdShort+ssTx,0).total-taxCalc(w401+conv+ssTx,0).total:0;
    const rmdNet=Math.max(0,rmdShort-rmdExTax);
    w401=Math.min(w401+rmdShort,k401-conv);

    const gains=wBrok*gR,basisWdr=wBrok*(1-gR);
    const tFull=taxCalc(w401+conv+ssTx,gains),tLiving=taxCalc(w401+ssTx,gains);
    const convTax=tFull.total-tLiving.total;
    const isRmd=rmdRequired>100;

    k401=(Math.max(0,k401-w401-conv-convTax))*(1+gr);
    roth=(Math.max(0,roth-wRoth)+(cfg.selfFunded?netToRoth:conv))*(1+gr);
    bBasis=Math.max(0,bBasis-basisWdr)+rmdNet*(brokBasisPct/100);
    brok=(Math.max(0,brok-wBrok)+rmdNet)*(1+gr);
    crypto*=(1+gr);
    const total=k401+roth+brok+crypto;
    const bBV=Math.min(brok,bBasis),bUV=Math.max(0,brok-bBasis);
    const afterTax=Math.round(k401*(1-k401Disc/100)+roth+bBV+bUV*0.85+crypto*0.85);

    rows.push({age,ss,grossSpend:Math.round(grossSpend),need:Math.round(need),
      w401:Math.round(w401),wRoth:Math.round(wRoth),wBrok:Math.round(wBrok),
      gains:Math.round(gains),conv:Math.round(conv),convTax:Math.round(convTax),
      rmd:Math.round(rmdRequired),livingTax:Math.round(tLiving.total),
      effRate:grossSpend>0?tLiving.total/grossSpend:0,
      netIncome:Math.round(grossSpend-tLiving.total),
      k401:Math.round(k401),roth:Math.round(roth),
      brokerage:Math.round(brok),crypto:Math.round(crypto),
      total:Math.round(total),afterTax,isRmd});

    // Rule of 55 baseline
    const r55gR=r55brok>0?Math.max(0,(r55brok-r55basis)/r55brok):0;
    const r55rmd=age>=73&&RMD_DIV[age]?r55k401/RMD_DIV[age]:0;
    let r55w401=Math.max(Math.min(need,r55k401),Math.min(r55rmd,r55k401));
    let r55wBrok=Math.min(need-Math.min(r55w401,need),r55brok);
    let r55wRoth=Math.min(need-Math.min(r55w401,need)-r55wBrok,r55roth);
    const r55gns=r55wBrok*r55gR,r55bwdr=r55wBrok*(1-r55gR);
    r55k401=Math.max(0,r55k401-r55w401)*(1+gr);
    r55roth=Math.max(0,r55roth-r55wRoth)*(1+gr);
    r55basis=Math.max(0,r55basis-r55bwdr);
    r55brok=Math.max(0,r55brok-r55wBrok)*(1+gr);
    r55crypto*=(1+gr);
    const r55bBV=Math.min(r55brok,r55basis),r55bUV=Math.max(0,r55brok-r55basis);
    const r55at=Math.round(r55k401*(1-k401Disc/100)+r55roth+r55bBV+r55bUV*0.85+r55crypto*0.85);
    rule55Rows.push({age,afterTax:r55at,total:Math.round(r55k401+r55roth+r55brok+r55crypto)});

    if(total<need/2&&age>70)break;
  }
  return {rows,rule55Rows};
}


// ── Scenario dial simulation (module-level, no closure issues) ─────────────
function runDialSim(cfg, speed, convLvl) {
  const {k401:k401I,roth:rothI,brok:brokI,basisPct,crypto:cryptoI,
         withdrawal,inflation,growth,ssAmount,ssStartAge,k401Disc,retAge=55} = cfg;
  let k401=k401I, roth=rothI, brok=brokI,
      bBasis=brokI*(basisPct/100), crypto=cryptoI;
  const gr=growth/100, rows=[];

  for(let y=0;y<36;y++){
    const age=retAge+y;
    const ss=age>=ssStartAge?ssAmount:0, ssTx=ss*0.85;
    const bi=Math.pow(1.025,y);
    const grossSpend=withdrawal*Math.pow(1+inflation/100,y);
    const need=Math.max(0,grossSpend-ss);
    const gR=brok>0?Math.max(0,(brok-bBasis)/brok):0;
    const rmdRequired=age>=73&&RMD_DIV[age]?k401/RMD_DIV[age]:0;

    // Blend 401k vs brokerage based on speed dial (0=brok first, 100=401k first)
    const frac401=speed/100;
    const want401=Math.min(need*frac401,k401);
    const wantBrok=Math.min(need-want401,brok);
    const wantRoth=Math.min(need-want401-wantBrok,roth);
    let w401=Math.min(want401+(need-want401-wantBrok-wantRoth),k401);
    let wBrok=wantBrok, wRoth=wantRoth;

    // Conversion: selfFunded = tax from 401k, brokerage = tax from brokerage
    let conv=0, netToRoth=0;
    if(convLvl>0&&age<=72&&k401>w401){
      const targetConv=Math.min(convLvl,k401-w401);
      const g0=wBrok*gR;
      const tOut=taxCalc(w401+ssTx,g0).total;
      const tIn=taxCalc(w401+targetConv+ssTx,g0).total;
      const convTaxEst=Math.max(0,tIn-tOut);
      if(cfg.selfFunded){
        conv=targetConv; netToRoth=Math.max(0,conv-convTaxEst);
      } else {
        const brokAvail=Math.max(0,brok-wBrok);
        if(convTaxEst<=brokAvail){conv=targetConv;wBrok+=convTaxEst;netToRoth=conv;}
        else if(brokAvail>0&&convTaxEst>0){conv=targetConv*(brokAvail/convTaxEst);wBrok+=brokAvail;netToRoth=conv*(1-convTaxEst/targetConv);}
      }
    }

    // RMD enforcement
    const rmdShort=Math.max(0,rmdRequired-w401-conv);
    const rmdET=rmdShort>0?taxCalc(w401+conv+rmdShort+ssTx,0).total-taxCalc(w401+conv+ssTx,0).total:0;
    const rmdNet=Math.max(0,rmdShort-rmdET);
    w401=Math.min(w401+rmdShort,k401-conv);

    const gains=wBrok*gR, bWdr=wBrok*(1-gR);
    const tFull=taxCalc(w401+conv+ssTx,gains), tLiv=taxCalc(w401+ssTx,gains);
    const convTax=tFull.total-tLiv.total;
    const isRmd=rmdRequired>100;

    k401=(Math.max(0,k401-w401-conv-convTax))*(1+gr);
    roth=(Math.max(0,roth-wRoth)+netToRoth)*(1+gr);
    bBasis=Math.max(0,bBasis-bWdr)+rmdNet*(basisPct/100);
    brok=(Math.max(0,brok-wBrok)+rmdNet)*(1+gr);
    crypto*=(1+gr);
    const total=k401+roth+brok+crypto;
    const bBV=Math.min(brok,bBasis),bUV=Math.max(0,brok-bBasis);
    // Use static k401Disc for now; will be replaced with dynamic rate below
    const afterTaxStatic=Math.round(k401*(1-k401Disc/100)+roth+bBV+bUV*0.85+crypto*0.85);

    rows.push({age,grossSpend:Math.round(grossSpend),
      w401:Math.round(w401),wBrok:Math.round(wBrok),wRoth:Math.round(wRoth),
      conv:Math.round(conv),convTax:Math.round(convTax),
      livingTax:Math.round(tLiv.total),effRate:tLiv.total/grossSpend,
      netIncome:Math.round(grossSpend-tLiv.total),
      k401:Math.round(k401),roth:Math.round(roth),brokerage:Math.round(brok),
      crypto:Math.round(crypto),total:Math.round(total),afterTax:afterTaxStatic,
      isRmd,ss:Math.round(ss),rmd:Math.round(rmdRequired)});
    if(total<grossSpend/2&&age>70)break;
  }

  // ── Dynamic after-tax recalculation ─────────────────────────
  // Use actual average effective rate from simulation rather than static discount
  // Split into pre-RMD (55-72) and post-RMD (73+) periods
  const preRmdRows  = rows.filter(r=>r.age<73);
  const postRmdRows = rows.filter(r=>r.age>=73);

  // Weighted effective rate for each period
  const wEff = (rs) => {
    if(!rs.length) return k401Disc/100;
    const totalTax  = rs.reduce((a,r)=>a+r.livingTax+r.convTax,0);
    const totalDraw = rs.reduce((a,r)=>a+r.w401+r.conv,0);
    return totalDraw>0 ? Math.min(0.45, totalTax/totalDraw) : k401Disc/100;
  };

  const preRate  = wEff(preRmdRows);
  const postRate = wEff(postRmdRows);

  // Blended rate weighted by number of years in each period
  const blended = preRmdRows.length && postRmdRows.length
    ? (preRate*preRmdRows.length + postRate*postRmdRows.length) / rows.length
    : preRate || postRate;

  // Recompute afterTax for each row using blended dynamic rate
  rows.forEach(r => {
    const bBV2=Math.min(r.brokerage,r.brokerage*(cfg.basisPct/100));
    const bUV2=Math.max(0,r.brokerage-bBV2);
    r.afterTax = Math.round(r.k401*(1-blended)+r.roth+bBV2+bUV2*0.85+r.crypto*0.85);
    r.dynRate  = Math.round(blended*100); // store for display
  });

  return rows;
}

function ScenarioBuilderPhase({linkedBalances,retireAge,sharedSettings={},onSettingsChange={}}) {
  const isMobile = useIsMobile();
  const retAge = retireAge || 55;
  const hasBalances = (linkedBalances.k401||0)+(linkedBalances.roth||0)+(linkedBalances.brok||0) > 0;
  // Always use actual linked balances — zeros when Phase 1 is empty
  const effectiveBalances = linkedBalances;

  // ── The two dials ──────────────────────────────────────────
  // Dial 1: 0 = pure brokerage first (slow 401k draw)
  //        100 = pure 401k first / Rule of 55 (fast 401k draw)
  const [drawSpeed,  setDrawSpeed]  = useState(100); // start at R55 so user sees the winner
  // Dial 2: 0 = no conversions, 100 = max affordable conversions
  const [convLevel,  setConvLevel]  = useState(0); // annual $ conversion target
  // Spending & assumptions

  const [k401Disc,   setK401Disc]   = useState(25);
  const [open1, setOpen1] = useState(true);
  const [open2, setOpen2] = useState(true);
  const [open3, setOpen3] = useState(true);
  const [selfFunded, setSelfFunded] = useState(false);

  // Spending — from shared App state so Clear resets them
  const withdrawal  = sharedSettings.withdrawal  !== undefined ? sharedSettings.withdrawal  : 250000;
  const inflation   = sharedSettings.inflation   !== undefined ? sharedSettings.inflation   : 3;
  const growth      = sharedSettings.growth      !== undefined ? sharedSettings.growth      : 7;
  const ssAmount    = sharedSettings.ssAmount    !== undefined ? sharedSettings.ssAmount    : 0;
  const ssStartAge  = sharedSettings.ssStartAge  !== undefined ? sharedSettings.ssStartAge  : 67;
  const setWithdrawal  = onSettingsChange.setWithdrawal  || (()=>{});
  const setInflation   = onSettingsChange.setInflation   || (()=>{});
  const setGrowth      = onSettingsChange.setGrowth      || (()=>{});
  const setSsAmount    = onSettingsChange.setSsAmount    || (()=>{});
  const setSsStartAge  = onSettingsChange.setSsStartAge  || (()=>{});

  // ── Simulation (calls module-level function with all params) ─

  const simCfg = useMemo(()=>({
    k401:effectiveBalances.k401, roth:effectiveBalances.roth,
    brok:effectiveBalances.brok, basisPct:effectiveBalances.brokBasisPct,
    crypto:effectiveBalances.crypto,
    withdrawal,inflation,growth,ssAmount,ssStartAge,k401Disc,retAge,selfFunded,
  }),[effectiveBalances.k401,effectiveBalances.roth,effectiveBalances.brok,
      effectiveBalances.brokBasisPct,effectiveBalances.crypto,
      withdrawal,inflation,growth,ssAmount,ssStartAge,k401Disc,retAge,selfFunded]);

  const simulate = (speed, convLvl) => runDialSim(simCfg, speed, convLvl);
  // simulate calls module-level runDialSim

  // Run current scenario + Rule of 55 baseline always
  const rows       = useMemo(()=>runDialSim(simCfg,drawSpeed,convLevel),
    [simCfg,drawSpeed,convLevel]);
  const rowsNoConv = useMemo(()=>runDialSim({...simCfg},drawSpeed,0),
    [simCfg,drawSpeed]);
  const r55rows    = useMemo(()=>runDialSim({...simCfg},100,0),
    [simCfg]);

  // Scan across dial positions to find the optimal point
  const scanResults = useMemo(()=>{
    const pts=[];
    for(let sp=0;sp<=100;sp+=10){
      const r=runDialSim(simCfg,sp,0);
      const at85=r.find(x=>x.age===retAge+30)||r[r.length-1]||{};
      pts.push({speed:sp,afterTax:at85.afterTax||0});
    }
    return pts;
  },[linkedBalances,withdrawal,inflation,growth,ssAmount,ssStartAge,k401Disc]);

  const optimalSpeed = scanResults.reduce((best,p)=>p.afterTax>best.afterTax?p:best,scanResults[0]||{}).speed;

  const chartData = rows.map(r=>({
    age:r.age,
    k401:r.k401,
    roth:r.roth,
    brokerage:r.brokerage,
    crypto:r.crypto,
    r55:(r55rows.find(rr=>rr.age===r.age)||{}).total||0,
  }));

  const at85       = rows.find(r=>r.age===retAge+30)||rows[rows.length-1]||{};
  const r55at85    = r55rows.find(r=>r.age===retAge+30)||r55rows[r55rows.length-1]||{};
  const rmdAt73    = rows.find(r=>r.age===73);
  const brokGone   = rows.find(r=>r.brokerage<10000);
  const lifeTax    = rows.reduce((a,r)=>a+r.livingTax,0);
  const beatsR55   = at85.afterTax>(r55at85.afterTax||0);
  const gap        = $M(Math.abs(at85.afterTax-(r55at85.afterTax||0)));
  const $Fn        = n=>`$${Math.round(n).toLocaleString()}`;

  // Speed label
  const speedLabel = drawSpeed===0?"Brokerage First":drawSpeed===100?"Rule of 55 (401k First)":
    drawSpeed<30?"Mostly Brokerage":drawSpeed<70?"Balanced Blend":"Mostly 401k";

  // Chart: scenario buckets + R55 after-tax dashed


  // Optimal scan chart
  const scanChart = scanResults.map(p=>({speed:p.speed,afterTax:p.afterTax,
    label:p.speed===0?"Brok First":p.speed===100?"R55":p.speed+"%"}));

  const tBtn = (active) => ({
    cursor:"pointer",background:active?"var(--gold)22":"transparent",
    border:`1px solid ${active?"var(--gold)":"var(--brd2)"}`,
    borderRadius:4,color:active?"var(--gold)":"var(--txm)",
    fontFamily:"'DM Mono',monospace",fontSize:12,padding:"4px 12px",
  });

  const [tab, setTab] = useState('chart');

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Zero balance warning */}
      {!hasBalances&&(
        <div style={{background:"var(--gold)11",border:"1px solid var(--gold)44",borderRadius:6,padding:"10px 16px",fontSize:12,color:"var(--gold)"}}>
          ⚠ No balances linked from Phase 1 — showing example portfolio ($3.5M 401k · $390K Roth · $2.5M Brokerage). Enter your numbers in Phase 1 first.
        </div>
      )}

      {/* Beat/trail banner */}
      <div style={{background:beatsR55?"var(--grn)22":"var(--red)22",border:`1px solid var(--${beatsR55?"grn":"red"})`,borderRadius:6,padding:"10px 14px"}}>
        <div style={{fontSize:12,color:`var(--${beatsR55?"grn":"red"})`,fontWeight:500,marginBottom:4}}>
          {beatsR55?`✓ Beats R55 by ${gap} after-tax at ${retAge+30}`:`✗ Trails R55 by ${gap} at age ${retAge+30}`}
        </div>
        <div style={{fontSize:12,color:"var(--txm)"}}>R55: {$M(r55at85.afterTax||0)} · Scenario: {$M(at85.afterTax||0)}{optimalSpeed!==100&&!beatsR55?` · Optimal: ${optimalSpeed}% 401k`:""}{convLevel>0&&(()=>{
          const nc=rowsNoConv.find(r=>r.age===retAge+30)||rowsNoConv[rowsNoConv.length-1]||{};
          const delta=(at85.afterTax||0)-(nc.afterTax||0);
          return <div style={{fontSize:11,color:delta>=0?"var(--grn)":"var(--red)",marginTop:4}}>
            {convLevel>0?"Conv impact vs no conversion: ":""}{delta>=0?"+":""}{$M(delta)} at age {retAge+30}
          </div>;
        })()}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:9}}>
        {[
          {l:`AFTER-TAX AT ${retAge+30}`,v:$M(at85.afterTax||0),c:"var(--grn)",sub:at85.dynRate?`${at85.dynRate}% dynamic rate`:""},
          {l:brokGone?`⚠ BROK DEPLETES ${brokGone.age}`:"BROKERAGE INTACT",v:brokGone?`Age ${brokGone.age}`:$M((rows[rows.length-1]||{}).brokerage||0),c:brokGone?"var(--red)":"var(--grn)"},
          {l:"401k AT 73",v:rmdAt73?`${$M(rmdAt73.k401)} RMD:${$M(rmdAt73.rmd)}`:"—",c:"var(--gold)"},
          {l:"LIFETIME TAX",v:$M(lifeTax),c:"var(--red)"},
        ].map((k,i)=>(
          <div key={i} style={{background:"var(--bg2)",border:`1px solid ${k.c}44`,borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
            <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".08em",marginBottom:5}}>{k.l}</div>
            <div style={{fontSize:12,color:k.c,fontWeight:500}}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:14}}>

        {/* Left: controls */}
        <div style={{display:"flex",flexDirection:"column",gap:12,minWidth:0}}>

          {/* Dial 1: Draw speed */}
          <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,overflow:"hidden"}}>
            <button onClick={()=>setOpen1(v=>!v)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
              <div>
                <div style={{fontSize:9,color:"var(--txm)",letterSpacing:".1em",marginBottom:3}}>{isMobile?"DIAL 1 · 401k DRAW SPEED":"DIAL 1 · HOW FAST TO DRAW THE 401k"}</div>
                <div style={{fontSize:12,color:"var(--gold)",fontWeight:500}}>{speedLabel}</div>
              </div>
              <span style={{color:"var(--txm)",fontSize:10}}>{open1?"▲":"▼"}</span>
            </button>
            {open1&&(
              <div style={{padding:"0 18px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--txf)",marginBottom:4}}>
                  <span>Brokerage First</span><span>401k First (R55)</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={drawSpeed}
                  onChange={e=>setDrawSpeed(Number(e.target.value))}
                  style={{width:"100%",accentColor:"var(--gold)",cursor:"pointer"}}/>
                <div style={{marginTop:10,padding:"8px 12px",background:"var(--gold)11",border:"1px solid var(--gold)44",borderRadius:4,fontSize:9}}>
                  <span style={{color:"var(--txm)"}}>⚡ Optimal: </span>
                  <span style={{color:"var(--gold)",fontWeight:500}}>
                    {optimalSpeed===100?"Rule of 55 (100% 401k draw)":optimalSpeed+"% 401k draw"}
                  </span>
                  <span style={{color:"var(--txm)"}}> → {$M((scanResults.find(p=>p.speed===optimalSpeed)||{}).afterTax||0)}</span>
                </div>
                <div style={{marginTop:12}}>
                  <div style={{fontSize:9,color:"var(--txf)",marginBottom:6}}>AFTER-TAX AT {retAge+30} ACROSS DIAL POSITIONS</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:50}}>
                    {scanResults.map(p=>{
                      const max=Math.max(...scanResults.map(x=>x.afterTax));
                      const min=Math.min(...scanResults.map(x=>x.afterTax));
                      const h=max>min?Math.round(((p.afterTax-min)/(max-min))*46)+4:50;
                      const isActive=p.speed===drawSpeed;
                      const isOpt=p.speed===optimalSpeed;
                      return(
                        <div key={p.speed} onClick={()=>setDrawSpeed(p.speed)}
                          style={{flex:1,height:h,borderRadius:"2px 2px 0 0",cursor:"pointer",
                            background:isActive?"var(--gold)":isOpt?"var(--grn)44":"var(--brd2)",
                            border:isOpt?"1px solid var(--grn)":"none",transition:"height 0.2s"}}
                          title={`${p.speed===0?"Brok":p.speed===100?"R55":p.speed+"%"}: ${$M(p.afterTax)}`}/>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"var(--txf)",marginTop:2}}>
                    <span>Brok</span><span>R55</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dial 2: Conversion */}
          <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,overflow:"hidden"}}>
            <button onClick={()=>setOpen2(v=>!v)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
              <div>
                <div style={{fontSize:9,color:"var(--txm)",letterSpacing:".1em",marginBottom:3}}>DIAL 2 · ROTH CONVERSION / YR</div>
                <div style={{fontSize:12,color:"var(--pur)",fontWeight:500}}>{convLevel===0?"No conversions":$M(convLevel)+" / year → Roth"}</div>
              </div>
              <span style={{color:"var(--txm)",fontSize:10}}>{open2?"▲":"▼"}</span>
            </button>
            {open2&&(
              <div style={{padding:"0 18px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--txf)",marginBottom:4}}>
                  <span>None ($0)</span><span>$150k / yr</span>
                </div>
                <input type="range" min={0} max={150000} step={5000} value={convLevel}
                  onChange={e=>setConvLevel(Number(e.target.value))}
                  style={{width:"100%",accentColor:"var(--pur)",cursor:"pointer"}}/>
                <div style={{fontSize:9,color:"var(--txf)",marginTop:6,marginBottom:10,lineHeight:1.6}}>
                  Stops at age 72 · auto-capped by brokerage capacity
                </div>
                <div style={{display:"flex",gap:6,marginBottom:4}}>
                  <button onClick={()=>setSelfFunded(false)} style={{flex:1,cursor:"pointer",padding:"6px",fontFamily:"'DM Mono',monospace",fontSize:9,borderRadius:4,border:`1px solid ${!selfFunded?"var(--pur)":"var(--brd)"}`,background:!selfFunded?"var(--pur)22":"transparent",color:!selfFunded?"var(--pur)":"var(--txm)"}}>
                    Brokerage pays tax
                  </button>
                  <button onClick={()=>setSelfFunded(true)} style={{flex:1,cursor:"pointer",padding:"6px",fontFamily:"'DM Mono',monospace",fontSize:9,borderRadius:4,border:`1px solid ${selfFunded?"var(--grn)":"var(--brd)"}`,background:selfFunded?"var(--grn)22":"transparent",color:selfFunded?"var(--grn)":"var(--txm)"}}>
                    Self-funded (net to Roth)
                  </button>
                </div>
                <div style={{fontSize:9,color:"var(--txf)",lineHeight:1.5}}>
                  {selfFunded?"Tax deducted from conversion — only net amount lands in Roth. No brokerage drain.":"Tax paid from brokerage — full conversion amount lands in Roth."}
                </div>
                {convLevel>0&&rows.find(r=>r.conv<convLevel*0.5&&r.age<=72&&r.age>=retAge+2)&&(
                  <div style={{marginTop:6,fontSize:9,color:"var(--orn)"}}>
                    ⚠ Brokerage limiting conversions below target in some years
                  </div>
                )}
                {convLevel>0&&brokGone&&(
                  <div style={{marginTop:4,fontSize:9,color:"var(--red)"}}>
                    ⚠ Brokerage depletes at age {brokGone.age}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assumptions */}
          <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,overflow:"hidden"}}>
            <button onClick={()=>setOpen3(v=>!v)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
              <div style={{fontSize:9,color:"var(--txm)",letterSpacing:".1em"}}>ASSUMPTIONS</div>
              <span style={{color:"var(--txm)",fontSize:10}}>{open3?"▲":"▼"}</span>
            </button>
            {open3&&(
              <div style={{padding:"0 18px 16px"}}>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {l:"ANNUAL SPEND",v:withdrawal,s:setWithdrawal,min:50000,max:600000,step:5000,fmt:v=>$M(v)},
                    {l:"GROWTH %",v:growth,s:setGrowth,min:3,max:12,step:0.5,fmt:v=>v+"%"},
                    {l:"INFLATION %",v:inflation,s:setInflation,min:0,max:6,step:0.25,fmt:v=>v+"%"},
                    {l:"SS / YR",v:ssAmount,s:setSsAmount,min:0,max:120000,step:1000,fmt:v=>v>0?$M(v):"None"},
                    ...(ssAmount>0?[{l:"SS AGE",v:ssStartAge,s:setSsStartAge,min:62,max:70,step:1,fmt:v=>""+v}]:[]),
                    {l:"401k TAX RATE %",v:k401Disc,s:setK401Disc,min:10,max:40,step:1,fmt:v=>v+"%"},
                  ].map(({l,v,s,min,max,step,fmt})=>(
                    <div key={l}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:9,color:"var(--txm)"}}>{l}</span>
                        <span style={{fontSize:12,color:"var(--gold)",fontFamily:"'DM Mono',monospace"}}>{fmt(v)}</span>
                      </div>
                      <input type="range" min={min} max={max} step={step} value={v}
                        onChange={e=>s(Number(e.target.value))}
                        style={{width:"100%",accentColor:"var(--gold)",cursor:"pointer"}}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: output */}
        <div style={{display:"flex",flexDirection:"column",gap:12,minWidth:0}}>

          {/* Tab switcher */}
          <div style={{display:"flex",gap:7}}>
            {[["chart","Portfolio Chart"],["table","Year-by-Year"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={tBtn(tab===id)}>{lbl}</button>
            ))}
          </div>

          {/* Chart */}
          {tab==="chart"&&(
            <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,padding:"16px 8px 12px"}}>
              <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".07em",marginBottom:4,paddingLeft:8}}>PORTFOLIO BY BUCKET (GROSS)</div>
              <div style={{fontSize:9,color:"var(--txf)",paddingLeft:8,marginBottom:8}}>Stacked = gross portfolio · Purple dashed = Rule of 55 gross total</div>
              {(()=>{
                const r85=rows.find(r=>r.age===retAge+30)||rows[rows.length-1]||{};
                return(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,paddingLeft:8,paddingRight:8,marginBottom:12}}>
                    {[
                      {l:"401k",    v:r85.k401||0,      c:"#e6b84a"},
                      {l:"Roth",    v:r85.roth||0,      c:"#4a9fe6"},
                      {l:"Brok.",   v:r85.brokerage||0, c:"#4ae6a0"},
                      {l:"Crypto",  v:r85.crypto||0,    c:"#e64a6e"},
                      {l:"After-Tax",v:r85.afterTax||0, c:"#4ae6a0"},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{textAlign:"center",background:"var(--bg3)",borderRadius:4,padding:"5px 4px",border:`1px solid ${c}33`}}>
                        <div style={{fontSize:9,color:c,marginBottom:2}}>{l}</div>
                        <div style={{fontSize:12,color:"var(--wht)",fontWeight:500}}>{$M(v)}</div>
                        <div style={{fontSize:8,color:"var(--txf)"}}>age {retAge+30}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="sb2k401" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e6b84a" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#e6b84a" stopOpacity={0.04}/>
                    </linearGradient>
                    <linearGradient id="sb2roth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4a9fe6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4a9fe6" stopOpacity={0.04}/>
                    </linearGradient>
                    <linearGradient id="sb2brok" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4ae6a0" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4ae6a0" stopOpacity={0.04}/>
                    </linearGradient>
                    <linearGradient id="sb2cryp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#e64a6e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#e64a6e" stopOpacity={0.04}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                  <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
                  <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
                  <Tooltip content={({active,payload,label})=>{
                    if(!active||!payload||!payload.length)return null;
                    const tot=payload.filter(p=>p.dataKey!=="r55").reduce((a,b)=>a+b.value,0);
                    return(
                      <div style={{background:"var(--bg2)",border:"1px solid var(--brd2)",borderRadius:5,padding:"10px 14px",fontSize:12,fontFamily:"DM Mono"}}>
                        <div style={{color:"var(--gold)",marginBottom:7}}>Age {label}</div>
                        {payload.map(p=>(
                          <div key={p.dataKey} style={{color:p.stroke||p.color,marginBottom:2}}>
                            {p.name}: {$M(p.value)}
                          </div>
                        ))}
                        <div style={{borderTop:"1px solid var(--brd2)",marginTop:5,paddingTop:5,color:"var(--wht)",fontWeight:500}}>Total: {$M(tot)}</div>
                      </div>
                    );
                  }}/>
                  <Area type="monotone" dataKey="k401"      stackId="1" stroke="#e6b84a" strokeWidth={1.5} fill="url(#sb2k401)"  name="401k"/>
                  <Area type="monotone" dataKey="roth"      stackId="1" stroke="#4a9fe6" strokeWidth={1.5} fill="url(#sb2roth)"  name="Roth"/>
                  <Area type="monotone" dataKey="brokerage" stackId="1" stroke="#4ae6a0" strokeWidth={1.5} fill="url(#sb2brok)"  name="Brokerage"/>
                  <Area type="monotone" dataKey="crypto"    stackId="1" stroke="#e64a6e" strokeWidth={1.5} fill="url(#sb2cryp)"  name="Crypto"/>
                  <Area type="monotone" dataKey="r55"       stroke="#a78bfa" strokeWidth={2} fill="none" strokeDasharray="6 3"   name="Rule of 55"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          {tab==="table"&&(
            <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,overflowX:"auto",maxHeight:"60vh",overflowY:"auto"}}>
              <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".07em",padding:"10px 12px 0",position:"sticky",top:0,background:"var(--bg2)",zIndex:2}}>YEAR-BY-YEAR DETAIL</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
                <thead style={{position:"sticky",top:24,background:"var(--bg2)",zIndex:1}}>
                  <tr style={{borderBottom:"1px solid var(--brd2)"}}>
                    {["Age","Target","SS","RMD","← 401k","← Roth","← Brok.","Conv.","Conv.Tax","Living Tax","Eff %","Net Income","Total","After-Tax"].map(h=>(
                      <th key={h} style={{padding:"8px 9px",textAlign:"right",color:h==="After-Tax"?"var(--grn)":"var(--txm)",fontSize:12,fontWeight:400,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid var(--brd3)",background:r.isRmd?"var(--rmd)":i%2===0?"transparent":"var(--str)"}}>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.isRmd?"var(--pur)":"var(--gold)"}}>{r.age}{r.isRmd?" ⚑":""}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"var(--txm)"}}>{$M(r.grossSpend)}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.ss>0?"var(--grn)":"var(--txd)"}}>{r.ss>0?$M(r.ss):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.isRmd?"var(--pur)":"var(--txd)"}}>{r.isRmd?$M(r.rmd):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.w401>0?"var(--gold)":"var(--txd)"}}>{r.w401>0?$M(r.w401):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.wRoth>0?"var(--blu)":"var(--txd)"}}>{r.wRoth>0?$M(r.wRoth):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.wBrok>0?"var(--grn)":"var(--txd)"}}>{r.wBrok>0?$M(r.wBrok):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.conv>0?"var(--pur)":"var(--txd)"}}>{r.conv>0?$M(r.conv):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.convTax>0?"var(--orn)":"var(--txd)"}}>{r.convTax>0?$M(r.convTax):"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.livingTax===0?"var(--grn)":"var(--red)"}}>{$Fn(r.livingTax)}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:r.effRate<.05?"var(--grn)":r.effRate<.15?"var(--gold)":"var(--red)"}}>{pct(r.effRate)}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"var(--wht)"}}>{$Fn(r.netIncome)}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"var(--wht)",fontWeight:500}}>{$M(r.total)}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"var(--grn)",fontWeight:500}}>{$M(r.afterTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{padding:"6px 12px",fontSize:12,color:"var(--txf)",borderTop:"1px solid var(--brd3)"}}>
                ⚑ RMD year (IRS Uniform Lifetime Table) · After-tax uses dynamic effective rate from simulation · Brok basis at face, unrealized×85%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// PHASE 3 — MONTE CARLO
// ══════════════════════════════════════════════════════════════
function MonteCarloPhase({linkedBalances,retireAge,sharedSettings={},onSettingsChange={}}) {
  const isMobile = useIsMobile();
  const retAge=retireAge||55;
  const withdrawal  = sharedSettings.withdrawal  !== undefined ? sharedSettings.withdrawal  : 200000;
  const growth      = sharedSettings.growth      !== undefined ? sharedSettings.growth      : 7;
  const inflation   = sharedSettings.inflation   !== undefined ? sharedSettings.inflation   : 3;
  const setWithdrawal = onSettingsChange.setWithdrawal || (()=>{});
  const setGrowth     = onSettingsChange.setGrowth     || (()=>{});
  const setInflation  = onSettingsChange.setInflation  || (()=>{});
  const [mcStdDev,     setMcStdDev]     = useState(12);
  const ssAmount   = sharedSettings.ssAmount   !== undefined ? sharedSettings.ssAmount   : 0;
  const ssStartAge = sharedSettings.ssStartAge !== undefined ? sharedSettings.ssStartAge : 67;
  const setSsAmount   = onSettingsChange.setSsAmount   || (()=>{});
  const setSsStartAge = onSettingsChange.setSsStartAge || (()=>{});
  const [conv1Amt,     setConv1Amt]     = useState(100000);
  const [conv1End,     setConv1End]     = useState(66);
  const [conv2Amt,     setConv2Amt]     = useState(60000);
  const [conv2End,     setConv2End]     = useState(69);
  const [conv3Amt,     setConv3Amt]     = useState(30000);
  const [conv3End,     setConv3End]     = useState(72);
  const [k401Disc,     setK401Disc]     = useState(25);
  const [mcRes,        setMcRes]        = useState(null);
  const [mcRun,        setMcRun]        = useState(false);

  const cfg=useMemo(()=>({
    k401Init:linkedBalances.k401,rothInit:linkedBalances.roth,
    brokInit:linkedBalances.brok,cryptoInit:linkedBalances.crypto,
    brokBasisPct:linkedBalances.brokBasisPct,
    withdrawal,inflation,growth,ssAmount,ssStartAge,
    conv1Amt,conv1End,conv2Amt,conv2End,conv3Amt,conv3End,
    retireAge:retAge,k401Disc,mcStdDev,
  }),[linkedBalances,withdrawal,inflation,growth,ssAmount,ssStartAge,
      conv1Amt,conv1End,conv2Amt,conv2End,conv3Amt,conv3End,retAge,k401Disc,mcStdDev]);

  const doMC=useCallback(()=>{
    setMcRun(true);
    setTimeout(()=>{
      const meanR=growth/100,sd=mcStdDev/100;
      const ages=Array.from({length:36},(_,i)=>retAge+i);
      const byAge=Object.fromEntries(ages.map(a=>[a,[]]));
      for(let s=0;s<600;s++){
        const overrideGrowth=Array.from({length:36},()=>randNorm(meanR,sd)).reduce((acc,r,i)=>{acc[i]=r;return acc;},{});
        const simCfg={...cfg};
        // Run sim with random returns per year
        let k401=cfg.k401Init,roth=cfg.rothInit,brok=cfg.brokInit,
            bBasis=cfg.brokInit*(cfg.brokBasisPct/100),crypto=cfg.cryptoInit;
        const convForAge=a=>{if(a<=cfg.conv1End)return cfg.conv1Amt;if(a<=cfg.conv2End)return cfg.conv2Amt;if(a<=cfg.conv3End)return cfg.conv3Amt;return 0;};
        for(let y=0;y<36;y++){
          const age=retAge+y,gr=overrideGrowth[y]||meanR;
          const ss=age>=cfg.ssStartAge?cfg.ssAmount:0,ssTx=ss*0.85;
          const grossSpend=cfg.withdrawal*(1+cfg.inflation/100)**y;
          const need=Math.max(0,grossSpend-ss);
          const gR=brok>0?Math.max(0,(brok-bBasis)/brok):0;
          const rmdRequired=age>=73&&RMD_DIV[age]?k401/RMD_DIV[age]:0;
          let wBrok=Math.min(need,brok),wRoth=Math.min(need-wBrok,roth);
          let w401=Math.min(need-wBrok-wRoth,k401),conv=0;
          const tgt=convForAge(age);
          if(tgt>0&&age<=72&&k401>w401){
            const mc=Math.min(tgt,k401-w401);
            const g0=wBrok*gR;
            const tOut=taxCalc(w401+ssTx,g0).total,tIn=taxCalc(w401+mc+ssTx,g0).total;
            const cte=Math.max(0,tIn-tOut),ba=Math.max(0,brok-wBrok);
            if(cte<=ba){conv=mc;wBrok+=cte;}
            else if(ba>0&&cte>0){conv=mc*(ba/cte);wBrok+=ba;}
          }
          const rmdS=Math.max(0,rmdRequired-w401-conv);
          const rmdET=rmdS>0?taxCalc(w401+conv+rmdS+ssTx,0).total-taxCalc(w401+conv+ssTx,0).total:0;
          w401=Math.min(w401+rmdS,k401-conv);
          const gains=wBrok*gR,bWdr=wBrok*(1-gR);
          const tF=taxCalc(w401+conv+ssTx,gains),tL=taxCalc(w401+ssTx,gains);
          const cTax=tF.total-tL.total;
          k401=Math.max(0,k401-w401-conv-cTax)*(1+gr);
          roth=(Math.max(0,roth-wRoth)+conv)*(1+gr);
          bBasis=Math.max(0,bBasis-bWdr)+(Math.max(0,rmdS-rmdET))*(cfg.brokBasisPct/100);
          brok=(Math.max(0,brok-wBrok)+(Math.max(0,rmdS-rmdET)))*(1+gr);
          crypto*=(1+gr);
          const total=k401+roth+brok+crypto;
          const bBV=Math.min(brok,bBasis),bUV=Math.max(0,brok-bBasis);
          const at=Math.round(k401*(1-cfg.k401Disc/100)+roth+bBV+bUV*0.85+crypto*0.85);
          if(byAge[age])byAge[age].push(at);
          if(total<need/2&&age>70)break;
          for(const a of ages){if(a>age&&byAge[a]&&byAge[a].length<s+1)byAge[a].push(0);}
        }
      }
      const pp=(arr,p)=>{if(!arr.length)return 0;const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(p/100*(s.length-1))];};
      const finalAge=retAge+35;
      const finalArr=byAge[finalAge]||[];
      const surv90=finalArr.length?finalArr.filter(v=>v>=50000).length/600:0;
      const fan=ages.map(a=>({age:a,p10:pp(byAge[a]||[],10),p25:pp(byAge[a]||[],25),p50:pp(byAge[a]||[],50),p75:pp(byAge[a]||[],75),p90:pp(byAge[a]||[],90)}));
      setMcRes({fan,surv90});
      setMcRun(false);
    },50);
  },[cfg]);

  const $Fn=n=>`$${Math.round(n).toLocaleString()}`;
  const at85fan=mcRes?mcRes.fan.find(r=>r.age===retAge+30)||{}:{};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Settings strip */}
      <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,padding:"14px 18px"}}>
        <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".1em",marginBottom:12}}>SIMULATION SETTINGS</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(6,1fr)",gap:10,alignItems:"end"}}>
          {[
            {l:"WITHDRAWAL",v:withdrawal,s:setWithdrawal,mn:50000,mx:600000,st:5000,f:v=>$M(v)},
            {l:"GROWTH %",v:growth,s:setGrowth,mn:3,mx:12,st:0.5,f:v=>v+"%"},
            {l:"INFLATION %",v:inflation,s:setInflation,mn:0,mx:6,st:0.25,f:v=>v+"%"},
            {l:"STD DEV %",v:mcStdDev,s:setMcStdDev,mn:5,mx:25,st:1,f:v=>v+"%"},
            {l:"SS / YR",v:ssAmount,s:setSsAmount,mn:0,mx:120000,st:1000,f:v=>v>0?$M(v):"None"},
            {l:"SS AGE",v:ssStartAge,s:setSsStartAge,mn:62,mx:70,st:1,f:v=>""+v},
          ].map(({l,v,s,mn,mx,st,f})=>(
            <div key={l}>
              <div style={{fontSize:9,color:"var(--txm)",marginBottom:4}}>{l}</div>
              <Slider label="" value={v} onChange={s} min={mn} max={mx} step={st} fmt={f}/>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:12,color:"var(--txf)"}}>
          Conversion schedule: Phase A ${$M(conv1Amt)} to {conv1End} · Phase B ${$M(conv2Amt)} to {conv2End} · Phase C ${$M(conv3Amt)} to {conv3End} · (set in Phase 2)
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12}}>
          <button onClick={doMC} disabled={mcRun} style={{cursor:"pointer",background:"transparent",border:"1px solid var(--pur)",borderRadius:4,color:"var(--pur)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"8px 24px",opacity:mcRun?0.6:1}}>
            {mcRun?"Running 600 simulations…":"▶ Run Monte Carlo"}
          </button>
          {mcRes&&<span style={{fontSize:12,color:"var(--grn)"}}>✓ {(mcRes.surv90*100).toFixed(0)}% survival to age {retAge+35}</span>}
        </div>
      </div>

      {!mcRes&&!mcRun&&(
        <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,padding:"60px",textAlign:"center",color:"var(--txm)",fontSize:12}}>
          Configure settings above and run 600 simulations to see the probability distribution of outcomes
        </div>
      )}
      {mcRun&&<div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,padding:"60px",textAlign:"center",color:"var(--pur)",fontSize:12}}>Running 600 tax-aware simulations…</div>}

      {mcRes&&!mcRun&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:9}}>
            {[
              {l:"SURVIVAL TO END",v:(mcRes.surv90*100).toFixed(0)+"%",c:mcRes.surv90>.9?"var(--grn)":mcRes.surv90>.7?"var(--gold)":"var(--red)"},
              {l:`MEDIAN AT ${retAge+30} (P50)`,v:$M(at85fan.p50||0),c:"var(--pur)"},
              {l:`BEAR AT ${retAge+30} (P10)`,v:$M(at85fan.p10||0),c:"var(--red)"},
              {l:`BULL AT ${retAge+30} (P90)`,v:$M(at85fan.p90||0),c:"var(--grn)"},
            ].map((k,i)=>(
              <div key={i} style={{background:"var(--bg2)",border:`1px solid ${k.c}44`,borderTop:`2px solid ${k.c}`,borderRadius:6,padding:"11px 13px"}}>
                <div style={{fontSize:12,color:"var(--txm)",marginBottom:5}}>{k.l}</div>
                <div style={{fontSize:16,color:k.c,fontWeight:500}}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,padding:"16px 8px 12px"}}>
            <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".07em",marginBottom:12,paddingLeft:8}}>
              AFTER-TAX WEALTH · FAN CHART · P10 / P25 / P50 / P75 / P90
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mcRes.fan}>
                <defs>
                  <linearGradient id="mc90" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.15}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="mc75" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0.04}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                <XAxis dataKey="age" tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={{stroke:"#30363d"}}/>
                <YAxis tickFormatter={$M} tick={{fill:"#6e7681",fontSize:12,fontFamily:"DM Mono"}} tickLine={false} axisLine={false}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload||!payload.length)return null;
                  const d=mcRes.fan.find(r=>r.age===label)||{};
                  return(<div style={{background:"var(--bg2)",border:"1px solid var(--brd2)",borderRadius:5,padding:"10px 14px",fontSize:12,fontFamily:"DM Mono"}}>
                    <div style={{color:"var(--gold)",marginBottom:6}}>Age {label}</div>
                    {[["P90","var(--grn)",d.p90],["P75","var(--pur)",d.p75],["P50","var(--wht)",d.p50],["P25","var(--gold)",d.p25],["P10","var(--red)",d.p10]].map(([n,c,v])=>(
                      <div key={n} style={{color:c,marginBottom:2}}>{n}: {$M(v||0)}</div>
                    ))}
                  </div>);
                }}/>
                <Area type="monotone" dataKey="p90" stroke="#4ae6a0"  strokeWidth={1} strokeDasharray="4 2" fill="url(#mc90)"/>
                <Area type="monotone" dataKey="p75" stroke="#a78bfa"  strokeWidth={1} fill="url(#mc75)"/>
                <Area type="monotone" dataKey="p50" stroke="#f0f6fc"  strokeWidth={2} fill="none"/>
                <Area type="monotone" dataKey="p25" stroke="#e6b84a" strokeWidth={1} fill="none"/>
                <Area type="monotone" dataKey="p10" stroke="#e64a6e"  strokeWidth={1} strokeDasharray="4 2" fill="none"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{background:"var(--bg2)",border:"1px solid var(--brd)",borderRadius:6,overflowX:"auto"}}>
            <div style={{fontSize:12,color:"var(--txm)",letterSpacing:".08em",padding:"10px 14px 0"}}>PERCENTILE OUTCOMES AT KEY AGES</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"1px solid var(--brd2)"}}>
                {["Age","P10 (Bear)","P25","P50 (Median)","P75","P90 (Bull)"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:"right",color:"var(--txm)",fontSize:12,fontWeight:400}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[60,65,70,75,80,85,90].map(age=>{
                  const d=mcRes.fan.find(r=>r.age===age);
                  if(!d)return null;
                  return(<tr key={age} style={{borderBottom:"1px solid var(--brd3)"}}>
                    <td style={{padding:"8px 12px",textAlign:"right",color:"var(--gold)"}}>{age}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:"var(--red)"}}>{$M(d.p10)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:"var(--gold)"}}>{$M(d.p25)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:"var(--wht)",fontWeight:500}}>{$M(d.p50)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:"var(--pur)"}}>{$M(d.p75)}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",color:"var(--grn)"}}>{$M(d.p90)}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


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
  const [isDark,    setIsDark]   = useState(true);
  // Shared settings between Scenario Builder and Monte Carlo
  const [sharedWithdrawal, setSharedWithdrawal] = useState(250000);
  const [sharedGrowth,     setSharedGrowth]     = useState(7);
  const [sharedInflation,  setSharedInflation]  = useState(3);
  const [sharedSS,         setSharedSS]         = useState(0);
  const [sharedSSAge,      setSharedSSAge]       = useState(67);
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('rp_theme', next ? 'dark' : 'light'); } catch(_) {}
  };

  // iOS zoom reset: when user leaves an input, snap viewport back to normal scale
  useEffect(() => {
    if (!isMobile) return;
    // Ensure viewport meta exists
    let viewport = document.querySelector('meta[name=viewport]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1');

    const resetZoom = () => {
      // Temporarily set maximum-scale=1 to snap back, then remove restriction
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
      setTimeout(() => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5');
      }, 300);
    };
    document.addEventListener('focusout', resetZoom);
    return () => document.removeEventListener('focusout', resetZoom);
  }, [isMobile]);
  const [accumState, setAccumState] = useState(INIT_STATE);
  const [loaded,    setLoaded]   = useState(false);
  const [saveStatus,setSaveStatus]= useState("");
  const [clearKey,  setClearKey]  = useState(0);

  // Load
  const SAVE_VERSION = 2; // bump this whenever defaults change

  // Load saved state on mount
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('rp_state');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.version === SAVE_VERSION && s.accumState) {
          setAccumState(s.accumState);
          if (s.phase) setPhase(s.phase);
          setClearKey(k => k + 1);
        } else {
          localStorage.removeItem('rp_state');
        }
      }
      const savedTheme = localStorage.getItem('rp_theme');
      if (savedTheme === 'light') setIsDark(false);
      if (savedTheme === 'dark')  setIsDark(true);
    } catch(_) {}
    setLoaded(true);
  }, []);

  // Save on every change (after initial load)
  useEffect(()=>{
    if (!loaded) return;
    try {
      localStorage.setItem('rp_state', JSON.stringify({version: SAVE_VERSION, accumState, phase}));
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus(""), 1500);
    } catch(_) {}
  },[accumState, phase, loaded]);

  const handleClear = async () => {
    setAccumState(JSON.parse(JSON.stringify(BLANK_STATE)));
    setPhase(1);
    setClearKey(k => k + 1);
    // Reset shared scenario settings
    setSharedWithdrawal(250000);
    setSharedGrowth(7);
    setSharedInflation(3);
    setSharedSS(0);
    setSharedSSAge(67);
    try { localStorage.removeItem('rp_state'); } catch(_) {}
    setSaveStatus("cleared");
    setTimeout(()=>setSaveStatus(""), 2000);
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
    <div style={{...(isDark ? DARK_THEME : LIGHT_THEME), minHeight:"100vh",background:"var(--bg)",color:"var(--tx)",fontFamily:"'DM Mono','Courier New',monospace",padding: isMobile ? "16px 12px" : "24px 18px",overflowX:"hidden"}}>
      <style>{`
        * { box-sizing:border-box; }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield; font-size:16px !important;}
        input:focus{border-color:#e6b84a88!important;box-shadow:0 0 0 2px #e6b84a22;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:var(--bg2);}
        ::-webkit-scrollbar-thumb{background:var(--brd2);border-radius:3px;}
        button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
        input{touch-action:manipulation; font-size:16px !important;}
        @media(max-width:768px){
          table{font-size:16px !important;}
          th,td{padding:5px 6px !important;}
          input, select, textarea { font-size:16px !important; }
        }
      `}</style>

      <div style={{maxWidth:1200,margin:"0 auto",overflow:"hidden"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"var(--wht)",margin:0,letterSpacing:"-.02em"}}>Retirement Planner</h1>
            <p style={{color:"var(--txm)",fontSize:12,margin:"4px 0 0",letterSpacing:".07em"}}>
              MFJ · TEXAS · 2025 BRACKETS · AGE {accumState.currentAge} → {accumState.retireAge} → 90
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
            {saveStatus==="saved"   && <span style={{fontSize:12,color:"var(--grn)"}}>✓ Saved</span>}
            <button onClick={toggleTheme} style={{cursor:"pointer",background:"transparent",border:"1px solid var(--brd2)",borderRadius:4,color:"var(--txm)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"5px 13px"}}>
              {isDark ? "☀ Light" : "☾ Dark"}
            </button>
            {saveStatus==="cleared" && <span style={{fontSize:12,color:"var(--red)"}}>✓ Reset</span>}
            <button onClick={handleClear} style={{cursor:"pointer",background:"transparent",border:`1px solid ${"var(--red)"}55`,borderRadius:4,color:"var(--red)",fontFamily:"'DM Mono',monospace",fontSize:12,padding:"5px 13px"}}>✕ Clear</button>
          </div>
        </div>

        {/* Phase tabs */}
        <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${"var(--brd)"}`}}>
          {[
            [1,"Accumulation","Age "+accumState.currentAge+" → "+accumState.retireAge,"var(--grn)"],
            [2,"Scenario Builder","Age "+accumState.retireAge+" → 90","var(--gold)"],
            [3,"Monte Carlo","Stress test · 600 simulations","var(--pur)"],
          ].map(([p,label,sub,c])=>(
            <button key={p} onClick={()=>setPhase(p)} style={{cursor:"pointer",background:"transparent",border:"none",borderBottom:`2px solid ${phase===p?c:"transparent"}`,padding:"10px 24px 12px",fontFamily:"'DM Mono',monospace",textAlign:"left",marginBottom:-1}}>
              <div style={{fontSize:12,color:phase===p?"var(--wht)":"var(--txm)",fontWeight:phase===p?500:400}}>{label}</div>
              <div style={{fontSize:12,color:"var(--txf)",marginTop:2}}>{sub}</div>
            </button>
          ))}
          {/* Handoff indicator */}
          {retireRow.total > 0 && (
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,paddingRight:4}}>
              {!isMobile && (
                <>
                  <div style={{fontSize:12,color:"var(--txf)"}}>HANDOFF AT {accumState.retireAge}</div>
                  <div style={{display:"flex",gap:6}}>
                    {[["401k",linkedBalances.k401,"var(--gold)"],["Roth",linkedBalances.roth,"var(--blu)"],["Brok",linkedBalances.brok,"var(--grn)"],["Crypto",linkedBalances.crypto,"var(--red)"]].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center",background:"var(--bg3)",border:`1px solid ${c}33`,borderRadius:4,padding:"4px 8px"}}>
                        <div style={{fontSize:9,color:c}}>{l}</div>
                        <div style={{fontSize:12,color:"var(--wht)"}}>{$M(v)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
          )}
        </div>

        {/* Always mount both phases - just show/hide to preserve state */}
        <div style={{display: phase===1 ? "block" : "none"}}>
          {loaded
            ? <AccumulationPhase key={clearKey} initialState={accumState} onStateChange={setAccumState}/>
            : <div style={{padding:"40px",textAlign:"center",color:"var(--txm)",fontSize:12}}>Loading…</div>
          }
        </div>
        <div style={{display: phase===2 ? "block" : "none"}}>
          <ScenarioBuilderPhase key={clearKey} linkedBalances={linkedBalances} retireAge={accumState.retireAge} sharedSettings={{withdrawal:sharedWithdrawal,growth:sharedGrowth,inflation:sharedInflation,ssAmount:sharedSS,ssStartAge:sharedSSAge}} onSettingsChange={{setWithdrawal:setSharedWithdrawal,setGrowth:setSharedGrowth,setInflation:setSharedInflation,setSsAmount:setSharedSS,setSsStartAge:setSharedSSAge}}/>
        </div>
        <div style={{display: phase===3 ? "block" : "none"}}>
          <MonteCarloPhase key={clearKey} linkedBalances={linkedBalances} retireAge={accumState.retireAge} sharedSettings={{withdrawal:sharedWithdrawal,growth:sharedGrowth,inflation:sharedInflation,ssAmount:sharedSS,ssStartAge:sharedSSAge}} onSettingsChange={{setWithdrawal:setSharedWithdrawal,setGrowth:setSharedGrowth,setInflation:setSharedInflation,setSsAmount:setSharedSS,setSsStartAge:setSharedSSAge}}/>
        </div>
      </div>
    </div>
  );
}
