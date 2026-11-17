#!/usr/bin/env python3
"""Private immutable handoff. No source requests, no database key on this machine."""
import argparse,hashlib,json,pathlib,subprocess

def run(args):return subprocess.check_output(args,text=True,stderr=subprocess.STDOUT,timeout=180)
def main():
 p=argparse.ArgumentParser();p.add_argument('--dir',required=True);p.add_argument('--source',choices=['hns','pzpn'],required=True);p.add_argument('--ref',default='main');p.add_argument('--preview',action='store_true');p.add_argument('--upload-only',action='store_true');a=p.parse_args()
 d=pathlib.Path(a.dir);src=d/'latest.json' if a.source=='hns' else d/'snapshot.json';body=src.read_bytes();snapshot=json.loads(body)
 assert snapshot['source']==a.source
 n=sum(len(l['reports']) if a.source=='hns' else sum(r['status']=='complete' for r in l['reports']) for l in snapshot['leagues'])
 if not n:print(json.dumps(dict(status='no-complete-reports')));return
 sha=hashlib.sha256(body).hexdigest();out=d/'snapshots';out.mkdir(exist_ok=True);artifact=out/(sha+'.json');artifact.write_bytes(body);artifact.chmod(0o600)
 remote='/srv/slff-recovery/'+a.source+'-20261117';folder='blobs' if a.source=='hns' else 'raw'
 run(['ssh','-o','BatchMode=yes','SLFF',f'install -d -m 2750 -o root -g deploy {remote}/{folder} {remote}/snapshots'])
 run(['rsync','-r','--chmod=D2750,F640',str(d/folder)+'/',f'SLFF:{remote}/{folder}/'])
 run(['rsync','--chmod=F640',str(artifact),f'SLFF:{remote}/snapshots/{sha}.json'])
 if not a.upload_only:
  # Submit only when the previous batch has finished, preventing queue eviction.
  repo='Lovro-splichal-orhanizagi/mnzgorenjska'
  active=json.loads(run(['gh','run','list','-R',repo,'--workflow','recovery-captured.yml','--limit','30','--json','status,displayTitle']))
  if any(r['status']!='completed' and r['displayTitle']=='Captured recovery '+a.source for r in active):print(json.dumps(dict(status='worker-busy',sha256=sha,reports=n)));return
  receipt=d/('submitted-preview.json' if a.preview else 'submitted.json')
  if receipt.exists() and json.loads(receipt.read_text()).get('sha256')==sha:print(json.dumps(dict(status='already-submitted',sha256=sha)));return
  run(['gh','workflow','run','recovery-captured.yml','-R',repo,'--ref',a.ref,'-f','source='+a.source,'-f','snapshot='+sha,'-f','preview='+str(a.preview).lower()])
  receipt.write_text(json.dumps(dict(sha256=sha,reports=n,ref=a.ref,preview=a.preview)))
 print(json.dumps(dict(status='uploaded' if a.upload_only else 'submitted',sha256=sha,reports=n)))
if __name__=='__main__':main()
