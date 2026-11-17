#!/usr/bin/env python3
"""Bounded overnight handoff loop; no AI, source traffic, or DB credentials."""
import argparse,json,pathlib,subprocess,time

def main():
 p=argparse.ArgumentParser();p.add_argument('--dir',required=True);p.add_argument('--ref',default='main');p.add_argument('--hours',type=float,default=10);a=p.parse_args();assert 0<a.hours<=12
 d=pathlib.Path(a.dir);deadline=time.monotonic()+a.hours*3600
 while time.monotonic()<deadline:
  try:
   s=json.loads((d/'latest.json').read_text())
   result=subprocess.run(['python3',str(pathlib.Path(__file__).with_name('recovery-publish.py')),'--dir',str(d),'--source','hns','--ref',a.ref],capture_output=True,text=True,timeout=240)
   print(json.dumps(dict(time=time.time(),status=s['status'],publisherCode=result.returncode,result=result.stdout[-2000:],error=result.stderr[-1000:])),flush=True)
   if result.returncode:raise RuntimeError('publisher failed; retained captures require review')
   published=json.loads(result.stdout)
   if s['status']!='collecting' and published['status'] in ('completed','no-complete-reports'):break
  except Exception as e:
   print(json.dumps(dict(status='handoff-stopped',reason=str(e))),flush=True);return 1
  time.sleep(900)
 return 0
if __name__=='__main__':raise SystemExit(main())
