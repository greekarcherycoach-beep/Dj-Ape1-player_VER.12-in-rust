const {JSDOM,VirtualConsole}=require("jsdom");const fs=require("fs");
require("fake-indexeddb/auto");
const HTML=fs.readFileSync(process.env.HTMLPATH||require("path").join(__dirname,"..","assets","index.html"),"utf8");
const HTML2=process.env.NODETAILS?HTML.replace(/<details/g,"<section").replace(/<\/details>/g,"</section>"):HTML;
const errs=[];
function boot(opts={}){
 const vc=new VirtualConsole();
 vc.on("jsdomError",e=>errs.push((e.detail&&(e.detail.stack||e.detail.message))||e.message));
 vc.on("error",(...a)=>errs.push("console.error: "+a.join(" ").slice(0,300)));
 const dom=new JSDOM(HTML2,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost/index.html",virtualConsole:vc,
  beforeParse(w){
   w.indexedDB=global.indexedDB;w.IDBKeyRange=global.IDBKeyRange;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.Blob=require("buffer").Blob;
   w.BroadcastChannel=undefined;
   const P=w.HTMLMediaElement.prototype;
   P.pause=function(){this.__paused=true;this.dispatchEvent(new w.Event("pause"))};P.load=function(){};
   P.play=function(){this.__paused=false;this.dispatchEvent(new w.Event("play"));return Promise.resolve()};
   Object.defineProperty(P,"paused",{get(){return this.__paused!==false},configurable:true});
   Object.defineProperty(P,"currentTime",{get(){return this.__ct||0},set(v){this.__ct=v},configurable:true});
   Object.defineProperty(P,"duration",{get(){return this.__dur||0},set(v){this.__dur=v},configurable:true});
   w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy(function(){},{get:(t,k)=>k==="canvas"?this:(k==="measureText"?()=>({width:10}):(k==="createLinearGradient"||k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{})),set:()=>true})};
   w.URL.createObjectURL=()=>"blob:x";w.URL.revokeObjectURL=()=>{};
   w.ResizeObserver=w.ResizeObserver||class{observe(){}unobserve(){}disconnect(){}};
   w.IntersectionObserver=w.IntersectionObserver||class{observe(){}unobserve(){}disconnect(){}};
   w.Element.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
   w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
   class AC{constructor(){this.state="running";this.currentTime=0;this.sampleRate=44100;this.destination={}}createGain(){return{gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){},disconnect(){}}}createMediaElementSource(){return{connect(){},disconnect(){}}}createAnalyser(){return{fftSize:0,frequencyBinCount:64,getByteFrequencyData(){},getByteTimeDomainData(){},getFloatFrequencyData(){},connect(){},disconnect(){},smoothingTimeConstant:0}}createBiquadFilter(){return{frequency:{value:0,setValueAtTime(){}},Q:{value:0},gain:{value:0},type:"",connect(){},disconnect(){}}}createChannelSplitter(){return{connect(){},disconnect(){}}}createChannelMerger(){return{connect(){},disconnect(){}}}createBufferSource(){return{connect(){},start(){},stop(){},buffer:null,playbackRate:{value:1}}}createDynamicsCompressor(){return{connect(){},disconnect(){},threshold:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},knee:{value:0}}}decodeAudioData(){return Promise.reject(new Error("no audio in test"))}resume(){return Promise.resolve()}suspend(){return Promise.resolve()}close(){return Promise.resolve()}}
   w.AudioContext=AC;w.webkitAudioContext=AC;w.OfflineAudioContext=AC;
   w.localStorage.clear();
   if(opts.pre)opts.pre(w);
  }});
 return dom;
}
// generator evaluated INSIDE the window (same realm as the app)
const GEN=`(function(n,seed){
 let s=seed>>>0;const rnd=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const G=["House","Deep House","Techno","Tech House","Trance","Progressive","Drum & Bass","Dubstep","Disco","Funk","Soul","Jazz","Blues","Rock","Hard Rock","Metal","Pop","Synthpop","Hip-Hop","R&B","Reggae","Dub","Latin","Ελληνικό","Λαϊκό","Έντεχνο","Ρεμπέτικο","Classical","Ambient","Lo-Fi"];
 const F=["MP3","MP3","MP3","FLAC","WAV","M4A","OGG"];const A=Math.max(40,Math.floor(n/12)),AL=Math.max(60,Math.floor(n/9));
 const out=[];const now=Date.now();
 for(let i=0;i<n;i++){const g1=G[(rnd()*G.length)|0],g2=rnd()<.35?G[(rnd()*G.length)|0]:null,hasB=rnd()>.08,hasK=rnd()>.1,fmt=F[(rnd()*F.length)|0];
  const ar=(rnd()*A)|0,al=(rnd()*AL)|0,name=String(i).padStart(7,"0")+" "+(rnd()<.3?"Τραγούδι ":"Song ")+i+"."+fmt.toLowerCase();
  const path="Library/"+g1+"/Artist "+ar+"/Album "+al+"/"+name;
  out.push({id:"t"+i,file:{name,size:3e6+i},fname:name,bytes:3e6+i,path,folder:path.split("/").slice(0,-1).join(" / "),title:"Title "+i+(rnd()<.2?" (Remix)":""),artist:rnd()<.04?"":"Artist "+ar,album:"Album "+al,albumartist:"",year:rnd()<.1?"":String(1965+((rnd()*60)|0)),track:String((i%14)+1),comment:"",genres:g2&&g2!==g1?[g1,g2]:[g1],gsrc:"tag",miss:[],webFilled:[],cover:"",format:fmt,size:((3e6+i)/1048576).toFixed(1),
   dur:rnd()<.02?0:100+((rnd()*380)|0),bpm:hasB?Math.round((70+rnd()*110)*10)/10:undefined,cam:hasK?(1+((rnd()*12)|0))+(rnd()<.5?"A":"B"):undefined,
   plays:rnd()<.5?0:((rnd()*40)|0),last:rnd()<.6?undefined:now-((rnd()*90*864e5)|0),energy:rnd()<.6?1+((rnd()*10)|0):undefined});}
 return out})`;
function genInto(w,n,seed=1){return w.eval(`T=${GEN}(${n},${seed});T.length`)}
module.exports={boot,genInto,GEN,errs,JSDOM};
