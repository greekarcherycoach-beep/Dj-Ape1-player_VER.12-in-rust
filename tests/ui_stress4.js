const {boot,genInto,errs}=require("./harness");
const ms=f=>{const t=process.hrtime.bigint();let r,e=null;try{r=f()}catch(x){e=x}return[r,Number(process.hrtime.bigint()-t)/1e6,e]};
const fmt=x=>x>=1000?(x/1000).toFixed(1)+"s":x.toFixed(0)+"ms";const heap=()=>{global.gc&&global.gc();return Math.round(process.memoryUsage().heapUsed/1048576)};
let bad=0;const chk=(n,c,i="")=>{console.log((c?"  ✓ ":"  ✗ ")+n+(i?" — "+i:""));if(!c)bad++};
(async()=>{
 const d=boot();const w=d.window;await new Promise(r=>setTimeout(r,500));
 w.eval("document.getElementById('welcome').classList.add('hide');document.getElementById('app').classList.remove('hide')");
 genInto(w,100000,61);w.eval("S.persist=1;render()");console.log("heap after 100k library:",heap(),"MB");
 // ---------------- Queue / playback ----------------
 console.log("\n## Q. queue & auto-advance (au.onended -> next -> cue)");
 w.eval("S.autodj=0;rep=0;shuf=false");
 let [r,t,e]=ms(()=>w.eval(`(function(){startQ(T.filter(t=>t.file).slice(0,5000),T.find(t=>t.file),0);let ok=true,seen=new Set();for(let i=0;i<4000;i++){const before=qi;au.onended();if(qi!==before+1||cur!==Q[qi])ok=false;seen.add(cur.id)}return[ok,Q.length,qi,seen.size]})()`));
 chk("4000 consecutive track changes in a 5000-track queue",!e&&r[0]&&r[2]===4000,`${fmt(t)} total, ${(t/4000).toFixed(2)} ms/transition ${e?e.message:""}`);
 [r,t,e]=ms(()=>w.eval(`(function(){for(let i=0;i<500;i++){au.currentTime=0;prev()}return[qi,cur===Q[qi]]})()`));chk("500 x prev()",!e&&r[1]&&r[0]===3500,`qi=${r&&r[0]} ${fmt(t)}`);
 [r,t,e]=ms(()=>w.eval(`(function(){shuf=true;const c=cur;buildQ(c);const ok=Q[0]===c&&qi===0&&new Set(Q).size===Q.length&&Q.length===QL.length;shuf=false;buildQ(c);return[ok,Q.length]})()`));chk("shuffle rebuild keeps current first & no duplicates (5000)",!e&&r[0],fmt(t));
 [r,t,e]=ms(()=>w.eval("renderQ()"));chk("renderQ with 5000 items",!e,fmt(t)+" "+(e?e.message:""));
 w.eval("rep=1");[r,t,e]=ms(()=>w.eval(`(function(){startQ(T.filter(t=>t.file).slice(0,50),T.find(t=>t.file),0);for(let i=0;i<149;i++)au.onended();return[qi,Q.length]})()`));chk("repeat-all wraps around the queue",!e&&r[0]===(149%50),JSON.stringify(r));
 w.eval("rep=2");[r,t,e]=ms(()=>w.eval(`(function(){startQ(T.filter(t=>t.file).slice(0,5),T.find(t=>t.file),0);const q0=qi;for(let i=0;i<50;i++)au.onended();return[q0,qi]})()`));chk("repeat-one stays on the same track",!e&&r[0]===r[1]);w.eval("rep=0");
 // Auto DJ: queue grows by one suggestion per track at the end of the queue
 w.eval("S.autodj=1");
 const h0=heap();
 [r,t,e]=ms(()=>w.eval(`(function(){startQ(T.filter(t=>t.file).slice(0,3),T.find(t=>t.file),0);let dup=0;const seen=new Set(Q);for(let i=0;i<300;i++){au.onended();}return[Q.length,qi,new Set(Q).size]})()`));
 chk("Auto DJ: 300 transitions at the end of the queue (100k library)",!e&&r[1]===r[0]-1&&r[2]===r[0],`${fmt(t)} (${(t/300).toFixed(0)} ms each), queue ${r&&r[0]}, unique ${r&&r[2]}`);
 w.eval("S.autodj=0");
 // ---------------- Playlists ----------------
 console.log("\n## P. playlists at scale");
 [r,t,e]=ms(()=>w.eval(`(function(){PL=[];const ids=T.map(t=>t.id);for(let i=0;i<300;i++){const p=newPL("List "+i);const n=100+((Math.random()*20000)|0),s=new Set();while(s.size<n)s.add(ids[(Math.random()*ids.length)|0]);p.items=[...s]}return[PL.length,PL.reduce((a,p)=>a+p.items.length,0)]})()`));
 chk("300 playlists / ~3M entries created",!e&&r[0]===300,`${fmt(t)} entries=${r&&r[1]}`);
 [r,t,e]=ms(()=>w.eval("drawPL()"));chk("sidebar drawPL with 300 playlists",!e,fmt(t)+" "+(e?e.message:""));
 [r,t,e]=ms(()=>w.eval(`(function(){selPL=PL[5].id;render();const n=T.filter(t=>inPL(t)).length;selPL=null;return n})()`));chk("open a 20k-item playlist (inPL filter + render over 100k)",!e,`${fmt(t)} items=${r}`);
 [r,t,e]=ms(()=>w.eval(`(function(){const p=PL[10];const before=p.items.length;addToPL(T.slice(0,50000),p);return[before,p.items.length,new Set(p.items).size===p.items.length]})()`));chk("addToPL 50k tracks keeps entries unique",!e&&r[2],`${fmt(t)} ${r&&r[0]}→${r&&r[1]}`);
 // delete through the real UI: bulk dialog -> select all but first 150 -> confirm
 [r,t,e]=ms(()=>{w.document.getElementById("pldelm").click();const cs=[...w.document.querySelectorAll(".pb_c")];cs.slice(150).forEach(c=>c.checked=true);w.document.getElementById("modal").dispatchEvent(new w.Event("change",{bubbles:true}));const go=w.document.getElementById("pb_go");const en=!go.disabled;go.click();return[cs.length,en]});
 chk("bulk-delete dialog lists all 300, delete button enabled",!e&&r[0]===300&&r[1],JSON.stringify(r));
 await new Promise(r=>setTimeout(r,30));
 const okBtn=w.document.getElementById("pdl_ok");chk("confirmation dialog appears",!!okBtn);
 if(okBtn){okBtn.click();for(let i=0;i<100&&w.eval("PL.length")!==150;i++)await new Promise(r=>setTimeout(r,50));chk("150 playlists deleted, 150 remain",w.eval("PL.length")===150,"PL="+w.eval("PL.length"));
  chk("sidebar shows the remaining 150",w.document.querySelectorAll("#pllist .gi, [data-pl]").length>=150)}
 // ---------------- Export ----------------
 console.log("\n## X. export of the full 100k library");
 for(const f of ["m3u8","pls","csv","txt"]){[r,t,e]=ms(()=>w.eval(`(function(){const r=exportBuild(T,{fmt:"${f}",mode:"rel",prefix:"",meta:true});return[r.text.length,r.text.split("\\n").length]})()`));
  chk(`export ${f}`,!e&&r[0]>1e6,`${fmt(t)} ${(r&&r[0]/1e6).toFixed(1)} MB, ${r&&r[1]} lines`)}
 // ---------------- Persistence cost ----------------
 console.log("\n## S. cost of one library save (JS side) at 100k");
 [r,t,e]=ms(()=>w.eval(`(function(){const real=T.filter(t=>!t.temp);const cm=new Map();const tracks=real.map(({file,cover,...r})=>{if(cover){let id=cm.get(cover);if(id===undefined){id=cm.size;cm.set(cover,id)}r.cv=id}return r});const s=JSON.stringify({app:"music_library",v:3,count:tracks.length,playlists:PL,dirs:[],tracks,covers:[...cm.keys()]});return s.length})()`));
 chk("serialize 100k tracks + playlists (desktop save path)",!e,`${fmt(t)} for ${(r/1e6).toFixed(0)} MB of JSON — one main-thread stall per save`);
 console.log("\nheap now:",heap(),"MB (was",h0,"MB before Auto-DJ); app errors:",errs.length,errs.slice(0,3));
 console.log("FAILED CHECKS:",bad);process.exit(0)})();
