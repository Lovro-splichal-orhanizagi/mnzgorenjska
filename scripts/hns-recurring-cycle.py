#!/usr/bin/env python3
"""Scheduled HNS collection + restricted immutable upload; no DB write key or GH token."""
import argparse,datetime,fcntl,hashlib,json,os,pathlib,shlex,subprocess,sys,time

def atomic(path,value):
 tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2));os.chmod(tmp,0o600);os.replace(tmp,path)
def execute(args,**kwargs):return subprocess.run(args,check=True,timeout=kwargs.pop('timeout',180),**kwargs)
def publish(directory,state,runner=execute):
 body=(directory/'latest.json').read_bytes();s=json.loads(body)
 assert s['schema']==2 and s['source']=='hns' and s['mode']=='recurring'
 progress=dict(manifest=s.get('manifestSha256'),status=s['status'],leagues=[dict(id=l['id'],finished=l.get('finished'),schedule=l['schedule']['sha256'],reports=[r['capture']['sha256'] for r in l['reports']],pending=[r['capture']['sha256'] for r in l['pending']],sourceUnplayed=l.get('sourceUnplayed',[])) for l in s['leagues']])
 fingerprint=hashlib.sha256(json.dumps(progress,sort_keys=True).encode()).hexdigest()
 receipt=directory/'published.json';previous=json.loads(receipt.read_text()) if receipt.exists() else {}
 unchanged=previous.get('progress')==fingerprint
 sha=previous['sha256'] if unchanged else hashlib.sha256(body).hexdigest()
 snapshots=directory/'snapshots';snapshots.mkdir(exist_ok=True)
 if not unchanged:(snapshots/(sha+'.json')).write_bytes(body)
 ssh=shlex.join(['ssh','-i',str(state/'upload_key'),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(state/'upload_known_hosts')])
 # The server key runs only rrsync -wo -no-del within the dedicated HNS directory.
 common=['rsync','-r','--chmod=D2750,F640','-e',ssh]
 if not unchanged and s['leagues']:
  runner(common+[str(directory/'blobs')+'/', 'deploy@2.31.6.53:blobs/'])
  runner(common+[str(snapshots)+'/', 'deploy@2.31.6.53:snapshots/'])
  pointer=directory/'current.json';atomic(pointer,dict(sha256=sha))
  runner(common+[str(pointer),'deploy@2.31.6.53:current.json'])
 status=directory/'collector-status.json';atomic(status,dict(status=s['status'],createdAt=s.get('createdAt'),updatedAt=s.get('updatedAt'),reason=s.get('reason'),sha256=sha))
 runner(common+[str(status),'deploy@2.31.6.53:collector-status.json'])
 atomic(receipt,dict(progress=fingerprint,sha256=sha))
 print(json.dumps(dict(published=sha,status=s['status'],unchanged=unchanged)),flush=True)

def main():
 p=argparse.ArgumentParser();p.add_argument('--state',required=True);a=p.parse_args()
 os.umask(0o077);state=pathlib.Path(a.state).resolve();state.mkdir(parents=True,exist_ok=True)
 with open(state/'cycle.lock','a') as lock:
  try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError:print('cycle already running');return
  code=pathlib.Path(__file__).resolve().parent;current=state/'active-batch.json';batch=None
  if current.exists():
   prior=json.loads(current.read_text());candidate=state/'runs'/prior['name']
   m=json.loads((candidate/'manifest.json').read_text());age=time.time()-datetime.datetime.fromisoformat(m['createdAt'].replace('Z','+00:00')).timestamp()
   snapshot=json.loads((candidate/'latest.json').read_text()) if (candidate/'latest.json').exists() else {}
   if 0<=age<20*3600 and snapshot.get('status') not in ('complete','pending'):batch=candidate
   elif 0<=age<12*3600:
    publish(candidate,state);print('recent complete batch retained; no source requests');return
  if batch is None:
   name=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');batch=state/'runs'/name;batch.mkdir(parents=True)
   args=['node',str(code/'hns-recurring-manifest.mjs'),str(batch/'manifest.json')]
   if current.exists() and (candidate/'latest.json').exists():args+=['--prior-snapshot',str(candidate/'latest.json')]
   execute(args)
   atomic(current,dict(name=name))
  result=subprocess.run([sys.executable,str(code/'hns-recurring.py'),'--dir',str(batch),'--manifest',str(batch/'manifest.json'),'--ledger',str(state/'hns-ledger.sqlite')],timeout=4*3600)
  if (batch/'latest.json').exists():publish(batch,state)
  if result.returncode:raise RuntimeError('collector stopped; see batch status')
  status=json.loads((batch/'latest.json').read_text())['status']
  if status not in ('complete','pending'):raise RuntimeError('collector incomplete: '+status)
if __name__=='__main__':main()
