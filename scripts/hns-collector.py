#!/usr/bin/env python3
"""One-shot, resumable HNS incident collection. No database credentials or writes."""
import argparse, fcntl, hashlib, json, os, re, sqlite3, subprocess, time
from pathlib import Path
from datetime import datetime, timezone

class BudgetExhausted(Exception): pass
class SourceBlocked(Exception): pass
class Ledger:
 def __init__(self,path,limit=1000,now_fn=time.time,sleep_fn=time.sleep):
  assert 1<=limit<=1000
  self.now,self.sleep,self.limit=now_fn,sleep_fn,limit
  self.lock=open(str(path)+'.lock','a')
  try: fcntl.flock(self.lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError: self.lock.close();raise SourceBlocked('collector already running')
  self.db=sqlite3.connect(path)
  self.db.executescript('CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT); CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY,started REAL,url TEXT,status INTEGER);')
 def get(self,k,default='0'):
  row=self.db.execute('SELECT v FROM meta WHERE k=?',(k,)).fetchone();return row[0] if row else default
 def put(self,k,v): self.db.execute('INSERT OR REPLACE INTO meta VALUES(?,?)',(k,str(v)))
 def count(self):return self.db.execute('SELECT count(*) FROM attempts WHERE started>?',(self.now()-86400,)).fetchone()[0]
 def reserve(self,url):
  if self.get('blocked',''):raise SourceBlocked(self.get('blocked'))
  if self.now()<float(self.get('last')):self.block('clock moved backwards');raise SourceBlocked('clock moved backwards')
  if self.now()<float(self.get('defer')):raise SourceBlocked('transient failure: deferred for one hour')
  if self.count()>=self.limit:raise BudgetExhausted('rolling 24-hour attempt limit')
  self.sleep(max(0,float(self.get('next'))-self.now()))
  now=self.now();cur=self.db.execute('INSERT INTO attempts(started,url) VALUES(?,?)',(now,url))
  self.put('last',now);self.put('next',now+40);self.db.commit();return cur.lastrowid
 def finish(self,i,status,blocked=None,defer=False):
  self.db.execute('UPDATE attempts SET status=? WHERE id=?',(status,i));self.put('last',self.now());self.put('next',self.now()+10)
  if blocked:self.put('blocked',blocked)
  if defer:self.put('defer',self.now()+3600)
  self.db.commit()
 def block(self,reason):self.put('blocked',reason);self.db.commit()
 def close(self):self.db.close();self.lock.close()

def refused(status,headers,body):
 return status in (401,403,429) or headers.get('cf-mitigated')=='challenge' or bool(re.search(rb'<title[^>]*>[^<]*(?:just a moment|attention required|blocked|access denied|captcha|prijava|prijavite se|log ?in|sign ?in)|cf_chl_opt|challenge-platform/h/|cf-turnstile|g-recaptcha|h-captcha|<form[^>]*(?:login|prijav)',body,re.I))
def validate_html(status,headers,body):
 if status!=200 or 'text/html' not in headers.get('content-type','').lower() or not re.search(rb'<html[\s>]',body,re.I):raise ValueError('not a complete HTML response')
 if len(body)>8*1024*1024:raise ValueError('response too large')

def atomic(path,value):
 tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2));os.chmod(tmp,0o600);os.replace(tmp,path)
def stamp():return datetime.now(timezone.utc).isoformat()
def parse(kind,path,fixture=None,code=None):
 p=subprocess.run(['node',str(Path(__file__).with_name('hns-collection-parse.mjs'))],input=json.dumps(dict(kind=kind,path=str(path),fixture=fixture,code=code)),text=True,capture_output=True,timeout=30)
 if p.returncode:raise ValueError('offline parser rejected '+path.name+': '+p.stderr[-600:])
 return json.loads(p.stdout)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--dir',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--seed');ap.add_argument('--max-new',type=int,default=1000);ap.add_argument('--max-leagues',type=int,default=139);ap.add_argument('--limit',type=int,default=950);args=ap.parse_args()
 os.umask(0o077);root=Path(args.dir);root.mkdir(parents=True,exist_ok=True);(root/'blobs').mkdir(exist_ok=True)
 m=json.loads(Path(args.manifest).read_text())
 assert m['schema']==1 and m['source']=='hns' and m['incident']=='hns-20261117' and m['season']=='2026/27'
 assert m['from']=='2026-11-06' and m['to']=='2026-11-17' and datetime.fromisoformat(m['expiresAt'].replace('Z','+00:00'))>datetime.now(timezone.utc)
 assert len(m['leagues'])==139 and len({l['code'] for l in m['leagues']})==139
 for l in m['leagues']:assert re.fullmatch(r'\d+',l['code']) and re.fullmatch(r'hr-[a-z0-9-]+',l['slug']) and l['slug']!='hr-prva-hnlz' and isinstance(l['id'],int)
 ledger=Ledger(root.parent/'hns-ledger.sqlite',args.limit);new=0
 cachepath=root/'captures.json';cache=json.loads(cachepath.read_text()) if cachepath.exists() else {}
 binding=hashlib.sha256(Path(args.manifest).read_bytes()).hexdigest()
 latest=root/'latest.json';snapshot=json.loads(latest.read_text()) if latest.exists() else dict(schema=1,incident=m['incident'],source='hns',season=m['season'],fromDate=m['from'],throughDate=m['to'],leagues=[])
 assert snapshot['incident']==m['incident'] and snapshot['source']=='hns'
 assert snapshot.get('manifestSha256',binding)==binding,'manifest changed during incident'
 snapshot['manifestSha256']=binding
 for old in snapshot['leagues']:
  assert any(all(old[k]==l[k] for k in ('id','slug','code')) for l in m['leagues']),'league binding changed'
 def save(status):
  snapshot.update(status=status,updatedAt=stamp(),attempts24h=ledger.count(),newAttempts=new);atomic(latest,snapshot)
  print(json.dumps(dict(time=stamp(),status=status,leagues=len(snapshot['leagues']),reports=sum(len(x['reports']) for x in snapshot['leagues']),pending=sum(len(x['pending']) for x in snapshot['leagues']),attempts24h=ledger.count())),flush=True)
 def capture(url,seed=None):
  nonlocal new
  assert re.fullmatch(r'https://semafor\.hns\.family/(?:natjecanja|utakmice)/\d+/x/',url)
  if url in cache:
   entry=cache[url];p=root/'blobs'/(entry['sha256']+'.html');body=p.read_bytes();assert hashlib.sha256(body).hexdigest()==entry['sha256']
   if refused(200,{},body):ledger.block('cached challenge');raise SourceBlocked('cached challenge')
   return p,entry
  if seed is not None:body=seed
  else:
   if new>=args.max_new:raise BudgetExhausted('per-run pilot limit')
   i=ledger.reserve(url);new+=1
   from curl_cffi import requests
   chunks=[];size=0
   def chunk(b):
    nonlocal size
    size+=len(b)
    if size>8*1024*1024:raise ValueError('response too large')
    chunks.append(b)
   try:
    with requests.Session(trust_env=False) as s:r=s.get(url,impersonate='chrome',allow_redirects=False,timeout=25,content_callback=chunk)
   except Exception:
    ledger.finish(i,0,defer=True);raise RuntimeError('transport failed; no automatic retry')
   body=b''.join(chunks);headers={k.lower():v for k,v in r.headers.items()}
   if refused(r.status_code,headers,body):
    reason=f"source refusal HTTP {r.status_code}; ray={headers.get('cf-ray','unknown')}";ledger.finish(i,r.status_code,blocked=reason);raise SourceBlocked(reason)
   ledger.finish(i,r.status_code,defer=r.status_code>=500)
   try:validate_html(r.status_code,headers,body)
   except ValueError:
    ledger.block('unexpected response requires review');raise
  if refused(200,{},body):ledger.block('challenge body');raise SourceBlocked('challenge body')
  sha=hashlib.sha256(body).hexdigest();p=root/'blobs'/(sha+'.html')
  if not p.exists():p.write_bytes(body)
  entry=dict(url=url,sha256=sha,capturedAt=stamp(),seeded=seed is not None);cache[url]=entry;atomic(cachepath,cache);return p,entry
 try:
  for l in m['leagues'][:args.max_leagues]:
   existing=next((x for x in snapshot['leagues'] if x['id']==l['id']),None)
   if existing and existing.get('finished'):continue
   p,sched=capture(f"https://semafor.hns.family/natjecanja/{l['code']}/x/")
   fixtures=parse('schedule',p)['fixtures']
   league=existing or dict(id=l['id'],slug=l['slug'],code=l['code'],schedule=sched,reports=[],pending=[])
   if not existing:snapshot['leagues'].append(league)
   done={str(x['fixture']['id']) for x in league['reports']}|{str(x['fixture']['id']) for x in league['pending']}|set(l['completed'])
   for f in fixtures:
    fid=str(f['id'])
    if not(m['from']<=str(f.get('datum',''))<=m['to']) or not f.get('izid') or fid in done:continue
    url=f'https://semafor.hns.family/utakmice/{fid}/x/'
    seed=None
    if args.seed:
     sp=Path(args.seed)/f'tekma-{fid}.html'
     if sp.exists():
      try:
       if parse('report',sp,f,l['code']).get('complete'):seed=sp.read_bytes()
      except ValueError:pass
    p,entry=capture(url,seed)
    try:quality=parse('report',p,f,l['code'])
    except ValueError as e:quality=dict(complete=False,reason='parser-quality-hold: '+str(e))
    record=dict(fixture=f,capture=entry,validation=quality)
    league['reports' if quality['complete'] else 'pending'].append(record);save('collecting')
   league['finished']=True;save('collecting')
  save('pending' if any(x['pending'] for x in snapshot['leagues']) else 'complete')
 except BudgetExhausted as e:save('paused: '+str(e))
 except BaseException as e:save('stopped: '+str(e));raise
 finally:ledger.close()
if __name__=='__main__':main()
