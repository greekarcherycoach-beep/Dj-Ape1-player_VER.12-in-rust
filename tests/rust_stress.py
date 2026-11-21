import json, os, random, threading, time, http.client, struct, sys, glob, hashlib
TOK=os.environ.get("DJAPE_TOKEN","tok123"); HOST="127.0.0.1"; PORT=47381
DATA=os.environ.get("DJAPE_DATA",os.path.expanduser("~/.local/share/DjApe1")); MEDIA=os.environ.get("DJAPE_TEST_MEDIA","/tmp/djape_media")
PID=int(os.popen("pgrep -x dj-ape1").read().split()[0])
def rss(): return int([l for l in open(f"/proc/{PID}/status") if l.startswith("VmRSS")][0].split()[1])//1024
def fds(): return len(os.listdir(f"/proc/{PID}/fd"))
def thr(): return len(os.listdir(f"/proc/{PID}/task"))
def req(method,path,body=None,headers=None,host=None):
    c=http.client.HTTPConnection(HOST,PORT,timeout=120)
    h=dict(headers or {})
    if host: h["Host"]=host
    c.request(method,path,body=body,headers=h)
    r=c.getresponse(); d=r.read(); c.close(); return r.status,d,dict(r.getheaders())
def rpc(m,a=None):
    s,d,_=req("POST",f"/rpc/{TOK}/{m}",json.dumps(a))
    return s,(json.loads(d) if s==200 and d else d.decode(errors="replace"))
fails=[]
def check(name,cond,info=""):
    print(("PASS " if cond else "FAIL ")+name+(" — "+str(info) if info else ""))
    if not cond: fails.append(name)
GEN=["Rock","House","Techno","Disco","Funk","Jazz","Hip-Hop","Reggae","Pop","Trance"]
def mk_track(i):
    return {"id":f"t{i:07d}","path":f"/music/Genre{i%200}/Artist{i%3000}/Album{i%9000}/{i:07d} - Αρχείο τραγουδιού με ελληνικά ΄ά.mp3","fname":f"{i:07d}.mp3","title":f"Τραγούδι {i}","artist":f"Artist {i%3000}","album":f"Album {i%9000}","genres":[GEN[i%10],GEN[(i*7)%10]],"gsrc":"tag","bpm":70+(i*13)%110,"cam":f"{1+i%12}{'AB'[i%2]}","dur":120+(i*7)%300,"year":1970+i%55,"size":3000000+i,"mtime":1.6e12+i,"plays":i%17,"cover":None}
def lib(n,extra=None):
    return json.dumps({"v":3,"tracks":[mk_track(i) for i in range(n)],"playlists":[{"id":f"p{k}","name":f"List {k}","items":[f"t{j:07d}" for j in range(0,n,max(1,n//500))]} for k in range(50)],"x":extra or 0},ensure_ascii=False).encode()
print("== baseline  rss=%dMB fds=%d threads=%d"%(rss(),fds(),thr()))
r0,f0,t0=rss(),fds(),thr()

# ---- A. very large library: save / load / integrity
for n in (20000,100000):
    b=lib(n); t=time.time(); s,d,_=req("PUT",f"/lib/{TOK}",b); tp=time.time()-t
    t=time.time(); s2,d2,h2=req("GET",f"/lib/{TOK}"); tg=time.time()-t
    check(f"A. library {n} tracks ({len(b)/1e6:.0f} MB) save+load identical",s==200 and s2==200 and d2==b,f"PUT {tp:.2f}s GET {tg:.2f}s")
    s3,i=rpc("libInfo"); check(f"A. libInfo count {n}",i.get("count")==n,i)
print("   rss now %dMB"%rss())

# ---- B. concurrent PUT/GET storm: no torn reads, no 5xx
errs=[];reads=[0];writes=[0];stop=time.time()+45
sizes=[3000,8000,15000,25000]
blobs={n:lib(n,n) for n in sizes}
req("PUT",f"/lib/{TOK}",blobs[3000])   # seed so early reads never see the previous phase's library
def writer(k):
    while time.time()<stop:
        n=random.choice(sizes)
        try:
            s,d,_=req("PUT",f"/lib/{TOK}",blobs[n])
            if s!=200: errs.append(("put",s,d[:80]))
            else: writes[0]+=1
        except Exception as e: errs.append(("putex",repr(e)))
def reader(k):
    while time.time()<stop:
        try:
            s,d,_=req("GET",f"/lib/{TOK}")
            if s!=200: errs.append(("get",s)); continue
            j=json.loads(d); n=len(j["tracks"])
            if n not in sizes or j["x"]!=n: errs.append(("torn",n,j["x"]))
            reads[0]+=1
        except Exception as e: errs.append(("getex",repr(e)))
ths=[threading.Thread(target=writer,args=(i,)) for i in range(5)]+[threading.Thread(target=reader,args=(i,)) for i in range(8)]
[t.start() for t in ths];[t.join() for t in ths]
check("B. 5 writers + 8 readers x 45 s: no errors / no torn reads",not errs,f"{writes[0]} writes, {reads[0]} reads, errors={errs[:3]}")
check("B. no leftover temp file",not os.path.exists(DATA+"/library.json.tmp"))
print("   rss now %dMB fds=%d threads=%d"%(rss(),fds(),thr()))

# ---- C. backup rotation bounded
for i in range(60):
    req("PUT",f"/lib/{TOK}",blobs[25000]); req("PUT",f"/lib/{TOK}",blobs[3000])
s,bk=rpc("libBackups")
nb=len(glob.glob(DATA+"/backups/*.json")); sz=sum(os.path.getsize(f) for f in glob.glob(DATA+"/backups/*.json"))/1e6
check("C. backups bounded after 120 shrinking saves",nb<=30,f"{nb} backups, {sz:.0f} MB, listed {len(bk)}")
if bk:
    s,d,_=req("GET",f"/libbk/{TOK}/{bk[0]['name']}"); check("C. newest backup readable & valid",s==200 and len(json.loads(d)["tracks"])>0)
check("C. path traversal in backup name rejected",req("GET",f"/libbk/{TOK}/..%2F..%2Fprefs.json")[0]==404)

# ---- D. corrupt main file -> served from backup
req("PUT",f"/lib/{TOK}",blobs[15000]); rpc("libBackupNow")
open(DATA+"/library.json","wb").write(b'{"tracks": [ {"id": "x" ')  # truncated
s,d,h=req("GET",f"/lib/{TOK}")
check("D. corrupt library.json falls back to a backup",s==200 and json.loads(d)["tracks"] and h.get("X-From","").startswith("library-"),h.get("X-From"))
check("D. non-library JSON rejected on save",req("PUT",f"/lib/{TOK}",b'{"hello":1}')[0]==500)
check("D. garbage body rejected on save",req("PUT",f"/lib/{TOK}",os.urandom(5000))[0]==500)
req("PUT",f"/lib/{TOK}",blobs[8000])

# ---- E. media tree: many files, stat/readdir/readTags in parallel, Range streaming
def wav(path,secs=2):
    n=8000*secs
    with open(path,"wb") as f:
        f.write(b"RIFF"+struct.pack("<I",36+n*2)+b"WAVEfmt "+struct.pack("<IHHIIHH",16,1,1,8000,16000,2,16)+b"data"+struct.pack("<I",n*2)); f.write(os.urandom(n*2))
NF=0
for a in range(40):
    d=f"{MEDIA}/Artist{a}/Album{a%7}"; os.makedirs(d,exist_ok=True)
    for t in range(50): wav(f"{d}/{t:02d} Τραγούδι {a}-{t}.wav",1); NF+=1
open(MEDIA+"/notes.txt","w").write("x")
s,top=rpc("readdir",MEDIA); check("E. readdir top level",s==200 and len(top)==40,len(top) if s==200 else top)
allf=glob.glob(MEDIA+"/**/*.wav",recursive=True)
s,st=rpc("stat",allf[:500]); check("E. stat 500 paths",s==200 and len(st)==500)
errs=[]
def tagw(chunk):
    for p in chunk:
        s,t=rpc("readTags",p)
        if s!=200: errs.append((p,s,t))
chunks=[allf[i::8] for i in range(8)]; t=time.time()
ths=[threading.Thread(target=tagw,args=(c,)) for c in chunks]; [x.start() for x in ths]; [x.join() for x in ths]
check(f"E. readTags {len(allf)} files x 8 threads",not errs,f"{time.time()-t:.1f}s {errs[:2]}")
p=allf[0]; size=os.path.getsize(p); q=f"/f/{TOK}/"+__import__('urllib.parse').parse.quote(p)
s,d,h=req("GET",q); check("E. full file stream",s==200 and len(d)==size)
s,d,h=req("GET",q,headers={"Range":"bytes=100-199"}); check("E. Range 100-199",s==206 and len(d)==100 and h.get("Content-Range")==f"bytes 100-199/{size}")
s,d,h=req("GET",q,headers={"Range":"bytes=-50"}); check("E. suffix range",s==206 and len(d)==50)
s,d,h=req("GET",q,headers={"Range":f"bytes={size+10}-"}); check("E. range beyond EOF -> 416",s==416)
s,d,h=req("GET",q,headers={"Range":"bytes=abc-def"}); check("E. garbage Range handled (no crash)",s in (200,206,416))
s,d,_=req("GET",f"/f/{TOK}/%2Fnonexistent%2Fx.mp3"); check("E. missing file -> 404",s==404)
big=MEDIA+"/big.flac"; 
with open(big,"wb") as f: f.truncate(2*1024**3)
s,d,h=req("GET",f"/f/{TOK}/"+__import__('urllib.parse').parse.quote(big),headers={"Range":f"bytes={2*1024**3-1000}-"}); check("E. 2 GB sparse file, seek near end",s==206 and len(d)==1000)
errs=[]
def streamer(k):
    for i in range(60):
        p=random.choice(allf); sz=os.path.getsize(p); a=random.randrange(0,sz-1); b=min(sz-1,a+random.randrange(1,4000))
        s,d,_=req("GET",f"/f/{TOK}/"+__import__('urllib.parse').parse.quote(p),headers={"Range":f"bytes={a}-{b}"})
        if s!=206 or len(d)!=b-a+1: errs.append((s,len(d),a,b))
ths=[threading.Thread(target=streamer,args=(i,)) for i in range(32)]; t=time.time(); [x.start() for x in ths]; [x.join() for x in ths]
check("E. 32 parallel streamers x 60 random ranges",not errs,f"{time.time()-t:.1f}s {errs[:2]}")
os.remove(big)

# ---- F. playlist file write/remove: atomic, sanitised, restricted
PL=MEDIA+"/playlists"
s,r=rpc("writeText",{"dir":PL,"name":"Rock Night.m3u8","text":"#EXTM3U\na\n"}); check("F. writeText creates dir+file",s==200 and r["name"]=="Rock Night.m3u8" and os.path.exists(PL+"/Rock Night.m3u8"))
errs=[]; 
def wr(k):
    for i in range(80):
        txt="#EXTM3U\n"+("x"*random.randrange(1,50000))+f"\n#{k}-{i}\n"
        s,r=rpc("writeText",{"dir":PL,"name":"Rock Night.m3u8","text":txt})
        if s!=200: errs.append((s,r))
ths=[threading.Thread(target=wr,args=(i,)) for i in range(10)]; [x.start() for x in ths]; [x.join() for x in ths]
files=sorted(os.listdir(PL))
check("F. 10 threads overwrite same file: no errors, one file, no temp/copies",not errs and files==["Rock Night.m3u8"],(errs[:2],files))
body=open(PL+"/Rock Night.m3u8").read(); check("F. final file is complete (not torn)",body.startswith("#EXTM3U\n") and body.rstrip().splitlines()[-1].startswith("#"))
for bad in ("../evil.m3u8","..\\evil.m3u8","/etc/passwd","C:\\x.m3u8","noext","evil.exe",".hidden.m3u8","a/b.pls",""):
    s,r=rpc("writeText",{"dir":PL,"name":bad,"text":"x"})
    ok = s==500 or (s==200 and os.path.dirname(os.path.join(PL,r["name"]))==PL and r["name"].lower().endswith((".m3u8",".m3u",".pls")) and "/" not in r["name"])
    check(f"F. writeText rejects/sanitises {bad!r}",ok,(s,r))
check("F. nothing escaped the playlist dir",not os.path.exists(MEDIA+"/evil.m3u8") and not os.path.exists("/tmp/evil.m3u8"))
open(MEDIA+"/keep.mp3","w").write("keep")
for bad in ("../keep.mp3","keep.mp3","../../../../etc/hostname"):
    s,r=rpc("removeFile",{"dir":PL,"name":bad}); check(f"F. removeFile refuses {bad!r}",s==500 and os.path.exists(MEDIA+"/keep.mp3"),(s,r))
s,r=rpc("removeFile",{"dir":PL,"name":"Rock Night.m3u8"}); check("F. removeFile deletes playlist file",s==200 and r is True and not os.path.exists(PL+"/Rock Night.m3u8"))
s,r=rpc("removeFile",{"dir":PL,"name":"Rock Night.m3u8"}); check("F. removeFile on missing file is harmless",s==200 and r is False)

# ---- G. recorder writers (fileOpen/fileWrite/fileClose), many at once
errs=[]
def rec(k):
    s,o=rpc("fileOpen",{"dir":MEDIA+"/rec","name":"take.mp3"})
    if s!=200: errs.append(("open",s,o)); return
    for i in range(30):
        st,_,_=req("PUT",f"/w/{TOK}/{o['id']}",os.urandom(20000))
        if st!=200: errs.append(("w",st))
    rpc("fileClose",o["id"])
ths=[threading.Thread(target=rec,args=(i,)) for i in range(40)]; [x.start() for x in ths]; [x.join() for x in ths]
fl=os.listdir(MEDIA+"/rec"); check("G. 40 concurrent recordings -> 40 distinct, correct-size files",not errs and len(fl)==40 and all(os.path.getsize(MEDIA+"/rec/"+f)==600000 for f in fl),(errs[:2],len(fl)))

# ---- H. security
check("H. wrong token -> 404",req("GET",f"/lib/WRONG")[0]==404)
check("H. wrong Host header -> 403",req("GET","/",host="evil.example.com")[0]==403)
check("H. DNS-rebinding style Host with port",req("GET","/",host="evil.com:47381")[0]==403)
check("H. unknown rpc -> 500 no crash",rpc("nope")[0]==500)
check("H. malformed rpc JSON tolerated",req("POST",f"/rpc/{TOK}/stat","{not json")[0] in (200,500))
check("H. huge junk readdir path -> error not crash",rpc("readdir","/"+"a"*5000)[0]==500)

# ---- soak x3: memory / threads / fds must plateau
def soak_round(n):
    global stop
    stop=time.time()+45; errs=[]
    def mixed(k):
        while time.time()<stop:
            try:
                c=random.random()
                if c<.15: s,_,_=req("PUT",f"/lib/{TOK}",blobs[random.choice(sizes)])
                elif c<.35: s,_,_=req("GET",f"/lib/{TOK}")
                elif c<.6:
                    p=random.choice(allf); s,_,_=req("GET",f"/f/{TOK}/"+__import__('urllib.parse').parse.quote(p),headers={"Range":"bytes=0-999"})
                elif c<.8: s,_=rpc("readTags",random.choice(allf))
                else: s,_=rpc("writeText",{"dir":PL,"name":"soak.m3u8","text":"#EXTM3U\n"*random.randrange(1,3000)})
                if s not in (200,206): errs.append(s)
            except Exception as e: errs.append(repr(e))
    ths=[threading.Thread(target=mixed,args=(i,)) for i in range(24)]; [x.start() for x in ths]; [x.join() for x in ths]
    time.sleep(2)
    print("   soak round %d: rss=%dMB fds=%d threads=%d errors=%d"%(n,rss(),fds(),thr(),len(errs)))
    return errs
allerr=[]
for n in (1,2,3): allerr+=soak_round(n)
print("== after 3 soak rounds rss=%dMB (start %dMB) fds=%d (start %d) threads=%d (start %d)"%(rss(),r0,fds(),f0,thr(),t0))
check("SOAK. 24 threads x 3 x 45 s mixed traffic: zero errors",not allerr,allerr[:3])
check("SOAK. no fd leak",fds()<=f0+5,fds())
check("SOAK. thread count plateau (<= start+25)",thr()<=t0+25,thr())
check("SOAK. no stray temp files in playlist dir",not [f for f in os.listdir(PL) if f.endswith('.tmp')],os.listdir(PL))
print("\nFAILED:",fails if fails else "none")
