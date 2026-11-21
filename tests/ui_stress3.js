const {boot,genInto,errs}=require("./harness");
const ms=f=>{const t=process.hrtime.bigint();let r,e=null;try{r=f()}catch(x){e=x}return[r,Number(process.hrtime.bigint()-t)/1e6,e]};
const fmt=x=>x>=1000?(x/1000).toFixed(1)+"s":x.toFixed(0)+"ms";
(async()=>{
 const d=boot();const w=d.window;await new Promise(r=>setTimeout(r,500));
 w.eval("window.R=(a)=>a[(Math.random()*a.length)|0]");
 genInto(w,100000,22);
 console.log("## smartMix extremes @100k pool (before: 24h 12.9s, maxTracks2000 82s)");
 for(const [lab,o] of [["24h, no limits","{minutes:1440}"],["minutes 99999, maxTracks 2000","{minutes:99999,maxTracks:2000}"],["10h strict, genre same, 1/artist","{minutes:600,strict:true,genreMode:'same',maxPerArtist:1,artistGap:20}"],["normal 2h","{minutes:120}"]]){
  const [r,t,e]=ms(()=>w.eval(`(function(){const r=smartMix(T.slice(),${o});return[r.mix.length,Math.round(r.tot/60),new Set(r.mix).size===r.mix.length]})()`));
  console.log(`  ${lab.padEnd(34)} -> tracks/min/unique ${JSON.stringify(r)} in ${fmt(t)} ${e?"EXC "+e.message:""}`);}
 console.log("## seed is always honoured even when sampling kicks in");
 let ok=0;for(let i=0;i<10;i++){ok+=w.eval(`(function(){const seed=T[(Math.random()*T.length)|0];if(!seed.file)return 1;const r=smartMix(T.slice(),{minutes:30,seed});return r.mix[0]===seed?1:0})()`)}
 console.log("  seed first in mix:",ok+"/10");
 console.log("## planSet: 24h wizard on 100k, and locked tracks survive sampling");
 const [r,t,e]=ms(()=>w.eval(`(function(){const ph=[{name:"All",min:1440,e0:3,e1:9,key:"auto",g:"",b1:0,b2:0,mx:"auto"}];const en=new Map(),est=new Set();T.forEach(t=>{en.set(t,t.energy>=1?t.energy:1+((Math.random()*10)|0))});
   const keep=T.filter(t=>t.cam&&en.has(t)).slice(0,5);const fixed=new Map([[0,keep]]);
   const r=planSet(T.slice(),{phases:ph,energy:en,est,b1:100,b2:140,jump:6,startKey:"",keyStep:1.5,climbEvery:12,mood:false,moodGap:6,maxA:0,gap:3,rz:4,recent:true,ht:false,bridge:true,brMin:14,fixed,must:null});
   return[r.mix.length,Math.round(r.tot/60),new Set(r.mix).size===r.mix.length,keep.every(t=>r.mix.includes(t))]})()`));
 console.log(`  items/min/unique/locked-kept: ${JSON.stringify(r)} in ${fmt(t)} ${e?"EXC "+e.message:""}`);
 console.log("errors:",errs.length);process.exit(0)})();
