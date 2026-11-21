const {boot,genInto,errs}=require("./harness");
const ms=f=>{const t=process.hrtime.bigint();let r,e=null;try{r=f()}catch(x){e=x}return[r,Number(process.hrtime.bigint()-t)/1e6,e]};
const fmt=x=>x>=1000?(x/1000).toFixed(1)+"s":x.toFixed(0)+"ms";
let bad=[];const fail=(m)=>{bad.push(m);if(bad.length<=25)console.log("  ✗ "+m)};
(async()=>{
 const d=boot();const w=d.window;await new Promise(r=>setTimeout(r,500));
 w.eval("document.getElementById('welcome').classList.add('hide');document.getElementById('app').classList.remove('hide')");
 // random-parameter generators evaluated in-window so every object belongs to the app realm
 w.eval(`window.__rs=1;window.R=(a)=>a[(Math.random()*a.length)|0];window.RI=(a,b)=>a+((Math.random()*(b-a+1))|0);`);
 const sizes=[1000,10000,100000];
 // ===== A. suggestNext =====
 console.log("## A. suggestNext (next-track suggestions)");
 for(const n of sizes){genInto(w,n,11);
  const [r,t,e]=ms(()=>w.eval(`(function(){let tot=0,bad=0;for(let i=0;i<60;i++){const b=T[(Math.random()*T.length)|0];const ex=new Set();const out=suggestNext(b,8,ex);tot+=out.length;for(const o of out){if(o.t===b)bad++;}if(new Set(out.map(o=>o.t)).size!==out.length)bad++}return[tot,bad]})()`));
  console.log(`  N=${n}: 60 calls in ${fmt(t)} (${fmt(t/60)}/call) results=${r&&r[0]} anomalies=${r&&r[1]} ${e?"EXC "+e.message:""}`);
  if(e||(r&&r[1]))fail("suggestNext N="+n);}
 // ===== B. smartMix sweep =====
 console.log("\n## B. smartMix random parameter sweep");
 const sweep=`(function(count,poolN){
  const opts=[];const curves=["steady","rise","fall","wave","peak"],gm=["prefer","same","diverse"],fv=["none","unplayed","played"];
  const res={n:0,exc:[],viol:[],maxT:0,slow:[]};
  for(let k=0;k<count;k++){
   const o={minutes:R([15,30,60,120,180,360,600,1440]),curve:R(curves),strict:Math.random()<.5,maxTracks:R([0,0,5,20,100]),artistGap:R([0,1,3,8,20]),maxPerArtist:R([0,0,1,2,5]),maxBpmJump:R([0,0,3,6,12]),randomness:R([0,1,4,10,30]),favor:R(fv),genreMode:R(gm),minTrans:R([0,0,30,60,90])};
   const pool=Math.random()<.3?T.filter(t=>t.genres.includes(R(["House","Techno","Rock","Disco"]))):T.slice();
   const t0=performance.now();let r;try{r=smartMix(pool,o)}catch(e){res.exc.push(String(e&&e.stack||e).slice(0,200)+" "+JSON.stringify(o));continue}
   const dt=performance.now()-t0;res.n++;res.maxT=Math.max(res.maxT,dt);if(dt>4000)res.slow.push(Math.round(dt)+"ms "+JSON.stringify(o)+" pool="+pool.length);
   const m=r.mix;
   if(new Set(m).size!==m.length)res.viol.push("duplicate tracks "+JSON.stringify(o));
   if(m.some(t=>!t.file))res.viol.push("track without file");
   if(r.trans.length!==Math.max(0,m.length-1))res.viol.push("trans length");
   if(o.maxTracks&&m.length>o.maxTracks)res.viol.push("maxTracks exceeded");
   if(o.maxPerArtist){const c=new Map();m.forEach(t=>{const a=(t.artist||"").toLowerCase();if(a)c.set(a,(c.get(a)||0)+1)});if([...c.values()].some(v=>v>o.maxPerArtist+0))res.viol.push("maxPerArtist exceeded "+JSON.stringify(o))}
   const target=o.minutes*60;if(!o.maxTracks&&pool.length>400&&r.tot<target*.7&&o.minTrans<60&&o.genreMode!=="same")res.viol.push("mix too short "+Math.round(r.tot)+"<"+target+" "+JSON.stringify(o));
   if(r.trans.some(x=>!(x>=0&&x<=100)))res.viol.push("trans out of range");
   if(!(r.avg>=0&&r.avg<=100))res.viol.push("avg out of range");
  }return res})`;
 for(const [n,c] of [[1000,150],[10000,80],[100000,30]]){genInto(w,n,21);
  const [res,t,e]=ms(()=>w.eval(`${sweep}(${c},${n})`));
  if(e){fail("smartMix sweep crashed N="+n+" "+e.message);continue}
  console.log(`  N=${n}: ${res.n}/${c} combos ok in ${fmt(t)}; slowest ${fmt(res.maxT)}; exceptions ${res.exc.length}; violations ${res.viol.length}; >4s: ${res.slow.length}`);
  res.exc.slice(0,3).forEach(x=>fail("EXC "+x));res.viol.slice(0,4).forEach(x=>fail("VIOL "+x));res.slow.slice(0,2).forEach(x=>console.log("   slow: "+x));
 }
 // extremes
 console.log("  extremes:");
 genInto(w,100000,22);
 for(const [lab,o] of [["24h, no limits, pool 100k","{minutes:1440}"],["maxTracks 2000 @100k","{minutes:99999,maxTracks:2000}"],["strict+jump3+minTrans80","{minutes:240,strict:true,maxBpmJump:3,minTrans:80}"],["empty pool","null"]]){
  const [r,t,e]=ms(()=>w.eval(o==="null"?`(function(){const r=smartMix([],{minutes:60});return[r.mix.length,r.tot]})()`:`(function(){const r=smartMix(T.slice(),${o});return[r.mix.length,Math.round(r.tot/60)]})()`));
  console.log(`   ${lab.padEnd(30)} -> ${e?"EXC "+e.message:JSON.stringify(r)} in ${fmt(t)}`);if(e)fail("extreme "+lab);}
 // ===== C. planSet (Set Wizard) =====
 console.log("\n## C. planSet (Set Wizard) sweep");
 const psweep=`(function(count){
  const keys=Object.keys(WZT),res={n:0,exc:[],viol:[],maxT:0,slow:[],warn:0};
  for(let k=0;k<count;k++){
   const ph=tplPh(R(keys)).map(p=>({...p,g:Math.random()<.2?R(["House","Techno","Disco"]):"",b1:Math.random()<.3?R([100,118,122]):0,b2:Math.random()<.3?R([126,132,140]):0}));
   const pool=T.filter(t=>Math.random()<R([.05,.2,1]));const en=new Map(),est=new Set();const bs=pool.map(t=>t.bpm).sort((a,b)=>a-b);
   pool.forEach(t=>{let e=t.energy;if(!(e>=1)){let lo=0,hi=bs.length;while(lo<hi){const m=(lo+hi)>>1;if(bs[m]<t.bpm)lo=m+1;else hi=m}e=Math.round(1+9*lo/Math.max(1,bs.length-1));est.add(t)}en.set(t,e)});
   const cfg={phases:ph,energy:en,est,b1:R([100,118,120]),b2:R([126,130,140]),jump:R([3,6,10]),startKey:R(["","8A","5B","12A"]),keyStep:R([1,1.5,3]),climbEvery:R([6,12,20]),mood:Math.random()<.4,moodGap:R([3,6,10]),maxA:R([0,1,2,3]),gap:R([0,3,6]),rz:R([0,4,12]),recent:Math.random()<.5,ht:Math.random()<.4,bridge:Math.random()<.5,brMin:R([8,14,24]),fixed:null,must:null};
   const t0=performance.now();let r;try{r=planSet(pool,cfg)}catch(e){res.exc.push(String(e&&e.stack||e).slice(0,240));continue}
   const dt=performance.now()-t0;res.n++;res.maxT=Math.max(res.maxT,dt);if(dt>5000)res.slow.push(Math.round(dt)+"ms pool="+pool.length);
   if(!r){res.viol.push("null result");continue}
   const m=r.mix;if(new Set(m).size!==m.length)res.viol.push("duplicate tracks");
   if(cfg.maxA){const c=new Map();m.forEach(t=>{const a=(t.artist||"").toLowerCase();if(a)c.set(a,(c.get(a)||0)+1)});if([...c.values()].some(v=>v>cfg.maxA))res.viol.push("maxA exceeded")}
   if(r.items.length!==m.length)res.viol.push("items/mix mismatch");
   let t=0;for(const it of r.items){if(Math.abs(it.start-t)>1e-6){res.viol.push("start offsets inconsistent");break}t+=it.t.dur||300}
   if(!(r.avg>=0&&r.avg<=100))res.viol.push("avg out of range");
   if(r.warn&&r.warn.length)res.warn++;
  }return res})`;
 for(const [n,c] of [[2000,60],[20000,30],[100000,8]]){genInto(w,n,31);
  const [res,t,e]=ms(()=>w.eval(`${psweep}(${c})`));
  if(e){fail("planSet sweep crashed N="+n+" "+e.message);continue}
  console.log(`  N=${n}: ${res.n}/${c} ok in ${fmt(t)}; slowest ${fmt(res.maxT)}; exceptions ${res.exc.length}; violations ${res.viol.length}; with warnings ${res.warn}; >5s ${res.slow.length}`);
  res.exc.slice(0,3).forEach(x=>fail("EXC "+x));[...new Set(res.viol)].slice(0,4).forEach(x=>fail("VIOL "+x));res.slow.slice(0,2).forEach(x=>console.log("   slow: "+x));}
 // ===== D. ordering helpers used by Automix =====
 console.log("\n## D. Automix ordering helpers (harmonic / byKey / byBpm / spreadArtists / shuffled)");
 genInto(w,100000,41);
 for(const m of [500,2000,10000,30000]){
  const [r,t,e]=ms(()=>w.eval(`(function(){const a=shuffled(T).slice(0,${m});const t0=performance.now();const h=harmonic(a,false,null);const t1=performance.now();const hb=harmonic(a,true,null);const t2=performance.now();const k=byKey(a,1),b=byBpm(a),s=spreadArtists(a,5);const t3=performance.now();
    return[Math.round(t1-t0),Math.round(t2-t1),Math.round(t3-t2),h.length===a.length&&hb.length===a.length&&k.length===a.length&&b.length===a.length&&s.length===a.length&&new Set(h).size===a.length]})()`));
  console.log(`  ${String(m).padStart(6)} tracks: harmonic ${r&&r[0]}ms, harmonic+bpm ${r&&r[1]}ms, key/bpm/spread ${r&&r[2]}ms, same length & unique: ${r&&r[3]}${e?" EXC "+e.message:""}`);
  if(e||!(r&&r[3]))fail("ordering helper m="+m);}
 // ===== E. energyRank =====
 console.log("\n## E. energyRank");
 for(const n of [10000,100000]){genInto(w,n,51);const [r,t,e]=ms(()=>w.eval(`(function(){const items=T.filter(t=>t.bpm).map(t=>({t,raw:Math.random()}));const o=energyRank(items,"all");let bad=0;o.forEach(v=>{if(!(v.e>=1&&v.e<=10))bad++});return[o.size,bad]})()`));
  console.log(`  N=${n}: ranked ${r&&r[0]} in ${fmt(t)}; out-of-range ${r&&r[1]}${e?" EXC "+e.message:""}`);if(e||(r&&r[1]))fail("energyRank "+n)}
 console.log("\napp errors captured:",errs.length,errs.slice(0,3));
 console.log("TOTAL FAILURES:",bad.length);process.exit(0)})();
