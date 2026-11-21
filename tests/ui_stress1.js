const {boot,genInto,errs}=require("./harness");
const ms=f=>{const t=process.hrtime.bigint();const r=f();return[r,Number(process.hrtime.bigint()-t)/1e6]};
const fmt=x=>x>=1000?(x/1000).toFixed(1)+" s":x.toFixed(0)+" ms";
(async()=>{
 const d=boot();const w=d.window;await new Promise(r=>setTimeout(r,500));
 w.eval("document.getElementById('welcome').classList.add('hide');document.getElementById('app').classList.remove('hide')");
 console.log("boot errors:",errs.length);
 // ---- 1. the BPM-rank estimation loop used by the set wizard (lines 1973 / 2066), replicated verbatim
 console.log("\n## 1. wizard energy estimate (per-track linear scan)");
 for(const n of [5000,20000,50000,100000]){
  genInto(w,n,7);
  const [r,t1]=ms(()=>w.eval(`(function(){const pool=T.slice(),en=new Map(),est=new Set(),bs=pool.map(t=>t.bpm).sort((a,b)=>a-b);
   pool.forEach(t=>{let e=t.energy;if(!(e>=1)){let lo=0;while(lo<bs.length&&bs[lo]<t.bpm)lo++;e=Math.round(1+9*lo/Math.max(1,bs.length-1));est.add(t)}en.set(t,e)});return en.size})()`));
  const [r2,t2]=ms(()=>w.eval(`(function(){const pool=T.slice(),en=new Map(),est=new Set(),bs=pool.map(t=>t.bpm).sort((a,b)=>a-b);
   const rank=b=>{let lo=0,hi=bs.length;while(lo<hi){const m=(lo+hi)>>1;if(bs[m]<b)lo=m+1;else hi=m}return lo};
   pool.forEach(t=>{let e=t.energy;if(!(e>=1)){e=Math.round(1+9*rank(t.bpm)/Math.max(1,bs.length-1));est.add(t)}en.set(t,e)});return en.size})()`));
  const same=w.eval(`(function(){const bs=T.map(t=>t.bpm).sort((a,b)=>a-b);const rank=b=>{let lo=0,hi=bs.length;while(lo<hi){const m=(lo+hi)>>1;if(bs[m]<b)lo=m+1;else hi=m}return lo};
    const lin=b=>{let lo=0;while(lo<bs.length&&bs[lo]<b)lo++;return lo};for(let i=0;i<2000;i++){const t=T[(i*7919)%T.length];if(rank(t.bpm)!==lin(t.bpm))return false}return true})()`);
  console.log(`N=${String(n).padStart(6)}  current: ${fmt(t1).padStart(8)}   bisect: ${fmt(t2).padStart(7)}   identical results: ${same}`);
 }
 // ---- 2. list rendering / search / sort / genre filter at big sizes
 console.log("\n## 2. render() = filter + sort + genre list");
 for(const n of [10000,100000,250000]){
  genInto(w,n,3);
  let [,t]=ms(()=>w.eval("render()"));
  const cols=w.eval("COLS.map(c=>c.id)");let worst=0,wc="";
  for(const c of cols){w.eval(`sortKey=${JSON.stringify(c)};sortDir=1`);const [,tt]=ms(()=>w.eval("render()"));if(tt>worst){worst=tt;wc=c}}
  w.eval(`sortKey="title"`);
  const q=w.document.getElementById("q");q.value="artist 12";const [,ts]=ms(()=>w.eval("render()"));q.value="";
  w.eval(`selG="House"`);const [,tg]=ms(()=>w.eval("render()"));w.eval("selG=null");
  console.log(`N=${String(n).padStart(6)}  render ${fmt(t).padStart(7)}  worst sort(${wc}) ${fmt(worst).padStart(7)}  search ${fmt(ts).padStart(7)}  genre filter ${fmt(tg).padStart(7)}`);
 }
 // ---- 3. smart playlists / rules
 console.log("\n## 3. smart-playlist rules over 100k");
 genInto(w,100000,5);
 const rules=[{match:"all",rules:[{f:"genre",op:"is",v:"House, Techno",v2:""},{f:"bpm",op:"between",v:"120",v2:"130"},{f:"year",op:"between",v:"1990",v2:"2020"}]},
  {match:"any",rules:[{f:"artist",op:"has",v:"artist 1",v2:""},{f:"key",op:"compat",v:"8A",v2:""},{f:"plays",op:"gte",v:"20",v2:""}]},
  {match:"all",rules:[{f:"last",op:"older",v:"30",v2:""},{f:"dur",op:"between",v:"3",v2:"6"},{f:"file",op:"yes",v:"",v2:""},{f:"title",op:"not",v:"remix",v2:""}]}];
 rules.forEach((r,i)=>{const [n,t]=ms(()=>w.eval(`(function(){const c=${JSON.stringify(r)};return T.filter(t=>ruleMatch(t,c)).length})()`));console.log(`rule set ${i+1}: ${n} matches in ${fmt(t)}`)});
 // ---- 4. duplicate finder
 console.log("\n## 4. duplicate finder");
 for(const n of [5000,20000,60000]){genInto(w,n,9);w.eval(`for(let i=0;i<T.length;i+=10){const s=T[i],c=Object.assign({},s);c.id="d"+i;c.fname="copy "+s.fname;c.path=s.path.replace("Library","Backup");T.push(c)}`);
  const len=w.eval("T.length");const [g,t]=ms(()=>w.eval("dupFind(T).length"));console.log(`N=${len}: ${g} duplicate groups in ${fmt(t)}`)}
 console.log("\nerrors:",errs.length,errs.slice(0,3));process.exit(0)})();
