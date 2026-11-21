(()=>{
const D=window.desktop,L=(n,d)=>{try{D.diag(n,d)}catch(e){}};
const errs=[];addEventListener("error",e=>errs.push(String(e.message).slice(0,160)));addEventListener("unhandledrejection",e=>errs.push("rej "+String(e.reason).slice(0,160)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),N=50000,MINUTES=9;
const SHARED=new File([new Uint8Array(16)],"x.mp3",{type:"audio/mpeg"});
const GEN=(function(n,seed){
 let s=seed>>>0;const rnd=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const G=["House","Deep House","Techno","Tech House","Trance","Progressive","Drum & Bass","Dubstep","Disco","Funk","Soul","Jazz","Blues","Rock","Hard Rock","Metal","Pop","Synthpop","Hip-Hop","R&B","Reggae","Dub","Latin","Ελληνικό","Λαϊκό","Έντεχνο","Ρεμπέτικο","Classical","Ambient","Lo-Fi"];
 const F=["MP3","MP3","MP3","FLAC","WAV","M4A","OGG"];const A=Math.max(40,Math.floor(n/12)),AL=Math.max(60,Math.floor(n/9));
 const out=[];const now=Date.now();
 for(let i=0;i<n;i++){const g1=G[(rnd()*G.length)|0],g2=rnd()<.35?G[(rnd()*G.length)|0]:null,hasB=rnd()>.08,hasK=rnd()>.1,fmt=F[(rnd()*F.length)|0];
  const ar=(rnd()*A)|0,al=(rnd()*AL)|0,name=String(i).padStart(7,"0")+" "+(rnd()<.3?"Τραγούδι ":"Song ")+i+"."+fmt.toLowerCase();
  const path="Library/"+g1+"/Artist "+ar+"/Album "+al+"/"+name;
  out.push({id:"t"+i,file:SHARED,fname:name,bytes:3e6+i,path,folder:path.split("/").slice(0,-1).join(" / "),title:"Title "+i+(rnd()<.2?" (Remix)":""),artist:rnd()<.04?"":"Artist "+ar,album:"Album "+al,albumartist:"",year:rnd()<.1?"":String(1965+((rnd()*60)|0)),track:String((i%14)+1),comment:"",genres:g2&&g2!==g1?[g1,g2]:[g1],gsrc:"tag",miss:[],webFilled:[],cover:"",format:fmt,size:((3e6+i)/1048576).toFixed(1),
   dur:rnd()<.02?0:100+((rnd()*380)|0),bpm:hasB?Math.round((70+rnd()*110)*10)/10:undefined,cam:hasK?(1+((rnd()*12)|0))+(rnd()<.5?"A":"B"):undefined,
   plays:rnd()<.5?0:((rnd()*40)|0),last:rnd()<.6?undefined:now-((rnd()*90*864e5)|0),energy:rnd()<.6?1+((rnd()*10)|0):undefined});}
 return out});
const R=a=>a[(Math.random()*a.length)|0];
const tm=async(f)=>{const t=performance.now();let ex=null;try{await f()}catch(e){ex=e}return[Math.round(performance.now()-t),ex]};
addEventListener("load",async()=>{
 await sleep(3000);
 try{
  document.getElementById("welcome").classList.add("hide");document.getElementById("app").classList.remove("hide");
  let t=performance.now();T=GEN(N,1);L("e2e-gen",{n:T.length,ms:Math.round(performance.now()-t)});
  t=performance.now();render();L("e2e-first-render",{ms:Math.round(performance.now()-t)});
  S.persist=0;S.autodj=0;
  const end=Date.now()+MINUTES*60000;let cyc=0;const slow=[];const sec={};
  const section=async(name,f)=>{const [ms,ex]=await tm(f);(sec[name]=sec[name]||[]).push(ms);if(ex)errs.push(name+": "+String(ex&&ex.message||ex).slice(0,120));if(ms>5000)slow.push(name+" "+ms+"ms")};
  while(Date.now()<end){
   cyc++;const c0=performance.now();
   await section("render+search+sort",async()=>{const q=document.getElementById("q");q.value="artist "+((Math.random()*500)|0);render();q.value="";sortKey=R(COLS.map(c=>c.id));sortDir=R([1,-1]);render()});
   await section("smartMix 2h",async()=>{smartMix(T.slice(),{minutes:R([60,120,240]),curve:R(["steady","rise","fall","wave","peak"]),strict:Math.random()<.5,artistGap:R([0,3,8]),maxPerArtist:R([0,1,2]),randomness:R([0,4,10]),favor:R(["none","unplayed","played"]),genreMode:R(["prefer","same","diverse"])})});
   await section("planSet wizard",async()=>{const ph=tplPh(R(Object.keys(WZT)));const pool=T.filter(t=>Math.random()<.5),en=new Map(),est=new Set(),bs=pool.map(t=>t.bpm).sort((a,b)=>a-b);pool.forEach(t=>{let e=t.energy;if(!(e>=1)){let lo=0,hi=bs.length;while(lo<hi){const m=(lo+hi)>>1;if(bs[m]<t.bpm)lo=m+1;else hi=m}e=Math.round(1+9*lo/Math.max(1,bs.length-1));est.add(t)}en.set(t,e)});planSet(pool,{phases:ph,energy:en,est,b1:118,b2:128,jump:6,startKey:"",keyStep:1.5,climbEvery:12,mood:Math.random()<.4,moodGap:6,maxA:R([0,2]),gap:3,rz:4,recent:true,ht:Math.random()<.4,bridge:Math.random()<.5,brMin:14,fixed:null,must:null})});
   await section("suggestNext x5",async()=>{for(let i=0;i<5;i++)suggestNext(R(T),8,new Set())});
   await section("open/close 8 dj modals",async()=>{for(const f of [djModal,smartMixModal,wizardModal,automixModal,settingsModal,energyModal,exportModal,smartModal]){f();document.getElementById("modal").classList.add("hide");await sleep(0)}});
   await section("themes x20",async()=>{for(const id of Object.keys(SKINS)){setSkin(id);await sleep(0)}});
   await section("playlist create/fill/delete",async()=>{const p=newPL("E2E "+cyc);addToPL(T.slice(0,5000),p);const r=plNewFlow(null);await sleep(20);const b=document.getElementById("pd_no");if(b)b.click();await r;const d=delPL(p.id);await sleep(20);const ok=document.getElementById("pdl_ok");if(ok)ok.click();await d});
   await section("queue 2000 + 300 transitions",async()=>{startQ(T.filter(t=>t.file).slice(0,2000),T.find(t=>t.file),0);for(let i=0;i<300;i++)au.onended&&au.onended()});
   if(cyc%4===1)await section("export 100k m3u8",async()=>{exportBuild(T,{fmt:"m3u8",mode:"rel",prefix:"",meta:true})});
   if(cyc%3===1)await section("REAL library save to Rust",async()=>{dirty=true;await nativeLibSave(true)});
   L("e2e-cycle",{cyc,ms:Math.round(performance.now()-c0),errs:errs.length,last:errs.slice(-2)});
   await sleep(50);
  }
  const stat=Object.fromEntries(Object.entries(sec).map(([k,v])=>[k,{n:v.length,avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length),max:Math.max(...v)}]));
  L("e2e-summary",{cycles:cyc,errors:errs.slice(0,10),errCount:errs.length,slow,stat});
  L("e2e-done",{});
  await sleep(1500);
  L("e2e-quitting",{});D.quit();
 }catch(e){L("e2e-fatal",String(e&&e.stack||e).slice(0,400))}
});
})();