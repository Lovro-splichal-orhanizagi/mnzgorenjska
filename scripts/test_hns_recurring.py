import contextlib, hashlib, importlib.util, io, json, tempfile, unittest
from pathlib import Path
from datetime import datetime, timezone

MODULE=Path(__file__).with_name('hns-recurring.py')
spec=importlib.util.spec_from_file_location('recurring',MODULE) if MODULE.exists() else None
m=importlib.util.module_from_spec(spec) if spec else None
if spec: spec.loader.exec_module(m)

class Clock:
 def __init__(self):self.t=datetime(2026,11,18,12,tzinfo=timezone.utc).timestamp()
 def now(self):return self.t
 def sleep(self,n):self.t+=n

def manifest():
 return dict(schema=2,source='hns',mode='recurring',season='2026/27',fromDate='2026-11-05',toDate='2026-11-18',createdAt='2026-11-18T12:00:00Z',expiresAt='2026-11-19T12:00:00Z',leagues=[dict(id=i+1,slug=f'hr-test-{i+1}',code=str(1000+i),completed=[]) for i in range(139)])

class Tests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(m,'recurring collector must exist')
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name);self.run=self.root/'run';self.mp=self.root/'manifest.json';self.lp=self.root/'shared.sqlite';self.clock=Clock();self.calls=[]
  self.mp.write_text(json.dumps(manifest()))
 def collect(self,**kw):
  with contextlib.redirect_stdout(io.StringIO()):
   return m.collect(self.run,self.mp,self.lp,now_fn=self.clock.now,sleep_fn=self.clock.sleep,fetch_fn=kw.pop('fetch_fn',self.fetch),parse_fn=kw.pop('parse_fn',self.parse),**kw)
 def fetch(self,url):
  self.calls.append(url);return 200,{'content-type':'text/html'},b'<html><title>verified fixture</title></html>'
 def parse(self,kind,path,fixture=None,code=None,parent_name=None):
  if kind=='schedule': return dict(parentName='Test 26/27',fixtures=[dict(id='20',datum='2026-11-17',izid='2:1'),dict(id='21',datum='2026-11-18',izid=None),dict(id='22',datum='2026-11-04',izid='1:1'),dict(id='23',datum='2026-11-17',izid='0:0')])
  self.assertEqual(parent_name,'Test 26/27')
  return dict(complete=fixture['id']!='23',reason='unpublished' if fixture['id']=='23' else None)
 def load(self,name='latest.json'):return json.loads((self.run/name).read_text())
 def test_expired_future_overlong_and_invalid_windows_fail_before_requests(self):
  for change in [dict(expiresAt='2026-11-18T12:00:00Z'),dict(createdAt='2026-11-18T12:01:00Z'),dict(expiresAt='2026-11-20T12:00:00Z'),dict(fromDate='2026-11-04'),dict(toDate='2026-11-19'),dict(createdAt='2026-11-18T12:00:00'),dict(season='2025/26')]:
   self.mp.write_text(json.dumps(dict(manifest(),**change)))
   with self.assertRaises(ValueError):self.collect()
   self.assertEqual(self.calls,[]);self.assertEqual(self.load('status.json')['status'],'stopped')
 def test_invalid_duplicate_league_tuples_and_completed_ids_fail_closed(self):
  for change in [dict(id=True),dict(id=2),dict(slug='hr-prva-hnlz'),dict(slug='hr-test-2'),dict(code='1001'),dict(code='../'),dict(completed=['../20']),dict(completed=['20','20'])]:
   value=manifest();value['leagues'][0].update(change);self.mp.write_text(json.dumps(value))
   with self.assertRaises(ValueError):self.collect()
   self.assertEqual(self.calls,[])
 def test_pending_and_source_unplayed_visible_and_resume_never_refetches_same_manifest(self):
  self.collect(max_leagues=1)
  snap=self.load();league=snap['leagues'][0]
  self.assertEqual(snap['status'],'paused');self.assertEqual(len(league['reports']),1);self.assertEqual(len(league['pending']),1)
  self.assertEqual([f['id'] for f in league['sourceUnplayed']],['21']);self.assertEqual(snap['sourceUnplayedCount'],1)
  self.assertEqual([r['fixture']['id'] for r in league['reports']],['20'])
  self.assertEqual(len(self.calls),3);self.assertEqual(snap['schema'],2);self.assertEqual(snap['expiresAt'],'2026-11-19T12:00:00Z')
  self.assertEqual(snap['manifestSha256'],hashlib.sha256(self.mp.read_bytes()).hexdigest())
  self.collect(max_leagues=1);self.assertEqual(len(self.calls),3)
  self.assertEqual(self.load('status.json')['pending'],1);self.assertEqual(self.load('status.json')['sourceUnplayedCount'],1)
 def test_manifest_change_or_old_run_snapshot_cannot_reuse_captures(self):
  self.collect(max_leagues=1);before=len(self.calls)
  value=manifest();value['leagues'][0]['completed']=['20'];self.mp.write_text(json.dumps(value))
  with self.assertRaisesRegex(ValueError,'manifest'):self.collect(max_leagues=1)
  self.assertEqual(len(self.calls),before);self.assertEqual(self.load('status.json')['status'],'stopped')
 def test_refusal_latches_shared_ledger_and_next_run_cannot_retry(self):
  def refused(url):self.calls.append(url);return 403,{},b'no'
  with self.assertRaises(m.SourceBlocked):self.collect(fetch_fn=refused)
  self.assertEqual(self.load('status.json')['status'],'stopped');self.assertEqual(self.load()['status'],'stopped')
  self.run=self.root/'run2'
  with self.assertRaises(m.SourceBlocked):self.collect()
  self.assertEqual(len(self.calls),1)
 def test_budget_resume_and_shared_spacing(self):
  self.collect(max_new=1,max_leagues=1)
  self.assertEqual(self.load()['status'],'paused');self.assertEqual(len(self.calls),1)
  self.collect(max_new=2,max_leagues=1)
  self.assertEqual(len(self.calls),3);self.assertEqual(self.clock.t,datetime(2026,11,18,12,0,20,tzinfo=timezone.utc).timestamp())
  self.assertEqual(self.load()['attempts24h'],3)
 def test_hard_ceiling_cannot_be_raised_and_expiry_is_checked_during_run(self):
  with self.assertRaises(ValueError):self.collect(max_new=951)
  self.assertEqual(self.calls,[])
  def expire(url):
   result=self.fetch(url);self.clock.t+=86400;return result
  with self.assertRaises(ValueError):self.collect(fetch_fn=expire)
  self.assertEqual(len(self.calls),1);self.assertEqual(self.load()['status'],'stopped')
 def test_tampered_html_cannot_be_resumed(self):
  self.collect(max_new=1,max_leagues=1)
  blob=next((self.run/'blobs').glob('*.html'));blob.write_bytes(b'<html>changed</html>')
  with self.assertRaisesRegex(ValueError,'digest'):self.collect(max_leagues=1)
  self.assertEqual(len(self.calls),1)
 def test_fresh_daily_directory_gets_fresh_schedule_but_completed_matches_are_skipped(self):
  value=manifest();value['leagues'][0]['completed']=['20','23'];self.mp.write_text(json.dumps(value))
  self.collect(max_leagues=1);self.assertEqual(len(self.calls),1)
  self.run=self.root/'run-next';self.collect(max_leagues=1);self.assertEqual(len(self.calls),2)
 def test_older_holds_survive_daily_window_and_explicit_completion_clears_only_matching_hold(self):
  self.collect(max_leagues=1)
  holds=json.loads(self.lp.with_suffix('.holds.json').read_text())
  self.assertEqual(sorted(holds['open']),['1:21','1:23'])
  self.clock.t+=14*86400;self.run=self.root/'later'
  value=manifest();value.update(createdAt='2026-12-02T12:00:00Z',expiresAt='2026-12-03T12:00:00Z',fromDate='2026-11-19',toDate='2026-12-02')
  self.mp.write_text(json.dumps(value));self.collect(max_leagues=1)
  status=self.load('status.json');self.assertEqual(status['openHolds'],2);self.assertEqual(status['olderHolds'],2)
  self.assertEqual(self.load()['holds']['olderCount'],2)
  value['leagues'][0]['completed']=['23'];self.mp.write_text(json.dumps(value));self.run=self.root/'completion';self.collect(max_leagues=1)
  holds=json.loads(self.lp.with_suffix('.holds.json').read_text())
  self.assertEqual(list(holds['open']),['1:21']);self.assertEqual(holds['resolved']['1:23']['resolution'],'database-imported')
 def test_all_leagues_are_finished_before_terminal_status_and_empty_results_remain_pending(self):
  def unplayed(kind,path,fixture=None,code=None,parent_name=None):
   self.assertEqual(kind,'schedule');return dict(parentName='Test 26/27',fixtures=[dict(id='21',datum='2026-11-18',izid=None)])
  self.collect(parse_fn=unplayed)
  snap=self.load();self.assertEqual(len(snap['leagues']),139);self.assertEqual(snap['status'],'pending');self.assertEqual(snap['sourceUnplayedCount'],139)
  self.assertEqual(self.load('status.json')['openHolds'],139)
 def test_existing_rolling_950_ceiling_stops_before_source_and_is_not_reset(self):
  ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep)
  ledger.db.executemany('INSERT INTO attempts(started,url,status) VALUES(?,?,?)',[(self.clock.t-20,'prior',200)]*950);ledger.db.commit();ledger.close()
  self.collect();self.assertEqual(self.calls,[]);self.assertEqual(self.load()['status'],'paused');self.assertEqual(self.load()['attempts24h'],950)
 def test_corrupt_durable_holds_still_emit_stopped_heartbeat(self):
  self.lp.with_suffix('.holds.json').write_text(json.dumps(dict(schema=1,source='wrong',open=[],resolved={})))
  with self.assertRaises(ValueError):self.collect(max_leagues=1)
  self.assertEqual(self.calls,[]);self.assertEqual(self.load('status.json')['status'],'stopped')
 def test_empty_selection_of_already_imported_matches_finishes_only_after_all_schedules(self):
  value=manifest()
  for league in value['leagues']:league['completed']=['20']
  self.mp.write_text(json.dumps(value))
  def completed(kind,path,fixture=None,code=None,parent_name=None):
   self.assertEqual(kind,'schedule');return dict(parentName='Test 26/27',fixtures=[dict(id='20',datum='2026-11-17',izid='2:1')])
  self.collect(parse_fn=completed)
  self.assertEqual(len(self.calls),139);self.assertEqual(self.load()['status'],'complete');self.assertEqual(self.load()['holds']['openCount'],0)
 def test_resume_after_utc_midnight_preserves_manifest_creation_day(self):
  self.clock.t+=13*3600
  self.collect(max_leagues=1)
  self.assertEqual(self.load()['createdAt'],'2026-11-18T12:00:00Z')
  self.assertEqual(self.load()['throughDate'],'2026-11-18')

if __name__=='__main__':unittest.main()
