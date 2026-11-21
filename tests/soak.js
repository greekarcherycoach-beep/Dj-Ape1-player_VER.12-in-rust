const FT=require("@sinonjs/fake-timers");
const {boot,genInto,errs}=require("./harness");
const HOURS=+process.argv[2]||8, N=+process.argv[3]||20000;
let clock;
const heap=()=>{global.gc();return Math.round(process.memoryUsage().heapUsed/1048576)};
(async()=>{
 const d=boot({pre:w=>{clock=FT.withGlobal(w).install({now:Date.now(),toFake:["setTimeout","clearTimeout","setInterval","clearInterval","Date","performance","requestAnimationFrame","cancelAnimationFrame"],shouldAdvanceTime:false})}});
 const w=d.window;
 clock.tick(2000);
 w.eval("document.getElementById('welcome').classList.add('hide');document.getElementById('app').classList.remove('hide')");
 genInto(w,N,77);
 w.eval(`S.persist=${process.env.PERSIST||1};S.autodj=${process.env.AUTODJ||1};S.queue="never";render();`);
 const stats=[];const sample=(h)=>{stats.push({h,heap:heap(),dom:w.document.querySelectorAll("*").length,timers:clock.countTimers(),Q:w.eval("Q.length"),errs:errs.length,plays:w.eval("T.reduce((a,t)=>a+(t.plays||0),0)")});};
 // start a 20-track queue; every track "plays" for its duration by advancing the fake clock 1 s at a time
 w.eval(`startQ(T.filter(t=>t.file).slice(0,20),T.find(t=>t.file),0)`);
 sample(0);console.log("hour  heapMB  domNodes  timers  queueLen  playsCounted  errors  wallSec");
 const t0=Date.now();let sec=0,trans=0;
 for(let h=1;h<=HOURS;h++){
  for(let s=0;s<3600;s++){
   // one second of audio
   w.eval(`(function(){const d=cur&&cur.dur||200;au.duration=d;au.currentTime=Math.min(d,(au.currentTime||0)+1);au.dispatchEvent(new Event("timeupdate"));if(au.currentTime>=d){au.__ct=0;au.onended&&au.onended()}})()`);
   clock.tick(1000);sec++;
  }
  // between-hours "user activity": search, sort, open/close dialogs, theme change
  if(!process.env.NOACT)w.eval(`(function(){const q=document.getElementById("q");q.value="artist "+((Math.random()*50)|0);q.dispatchEvent(new Event("input",{bubbles:true}));render();q.value="";render();
    const ids=Object.keys(SKINS);setSkin(ids[(Math.random()*ids.length)|0]);
    for(const f of ["djModal()","smartMixModal()","wizardModal()","automixModal()","settingsModal()","energyModal()"]){try{eval(f)}catch(e){window.__e=(window.__e||0)+1}document.getElementById("modal").classList.add("hide")}})()`);
  clock.tick(60000);
  sample(h);const s=stats[stats.length-1];console.log(String(h).padStart(4),String(s.heap).padStart(7),String(s.dom).padStart(9),String(s.timers).padStart(7),String(s.Q).padStart(9),String(s.plays).padStart(13),String(s.errs).padStart(7),String(Math.round((Date.now()-t0)/1000)).padStart(8));
 }
 console.log("\nopen-modal exceptions:",w.eval("window.__e||0"));
 const a=stats[Math.floor(stats.length/3)],b=stats[stats.length-1];
 console.log(`heap ${a.heap}MB@h${a.h} -> ${b.heap}MB@h${b.h}; dom ${a.dom}->${b.dom}; timers ${a.timers}->${b.timers}`);
 const growth=(b.heap-a.heap)/(b.h-a.h);console.log("heap growth per simulated hour (last 2/3):",growth.toFixed(2),"MB/h");
 console.log("app errors:",errs.length,errs.slice(0,5));
 process.exit(0)})();
