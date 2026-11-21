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

class CollectorHelpers:
 def setUp(self):
  self.assertIsNotNone(m,'recurring collector must exist')
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name);self.run=self.root/'run';self.mp=self.root/'manifest.json';self.lp=self.root/'shared.sqlite';self.clock=Clock();self.calls=[]
  self.mp.write_text(json.dumps(manifest()))
 def collect(self,**kw):
  with contextlib.redirect_stdout(io.StringIO()):
   return m.collect(self.run,self.mp,self.lp,now_fn=self.clock.now,sleep_fn=self.clock.sleep,fetch_fn=kw.pop('fetch_fn',self.fetch),parse_fn=kw.pop('parse_fn',self.parse),random_fn=kw.pop('random_fn',lambda: 1),**kw)
 def fetch(self,url):
  self.calls.append(url);return 200,{'content-type':'text/html'},b'<html><title>verified fixture</title></html>'
 def parse(self,kind,path,fixture=None,code=None,parent_name=None):
  if kind=='schedule': return dict(parentName='Test 26/27',season='2026/27',competitionCode=code,fixtures=[dict(id='20',datum='2026-11-17',izid='2:1'),dict(id='21',datum='2026-11-18',izid=None),dict(id='22',datum='2026-11-04',izid='1:1'),dict(id='23',datum='2026-11-17',izid='0:0')])
  self.assertEqual(parent_name,'Test 26/27')
  return dict(complete=fixture['id']!='23',reason='unpublished' if fixture['id']=='23' else None)
 def load(self,name='latest.json'):return json.loads((self.run/name).read_text())

class Tests(CollectorHelpers,unittest.TestCase):
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
  self.assertEqual(len(self.calls),3);self.assertEqual(self.clock.t,datetime(2026,11,18,12,0,30,tzinfo=timezone.utc).timestamp())
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
   self.assertEqual(kind,'schedule');return dict(parentName='Test 26/27',season='2026/27',competitionCode=code,fixtures=[dict(id='21',datum='2026-11-18',izid=None)])
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
   self.assertEqual(kind,'schedule');return dict(parentName='Test 26/27',season='2026/27',competitionCode=code,fixtures=[dict(id='20',datum='2026-11-17',izid='2:1')])
  self.collect(parse_fn=completed)
  self.assertEqual(len(self.calls),139);self.assertEqual(self.load()['status'],'complete');self.assertEqual(self.load()['holds']['openCount'],0)
 def test_resume_after_utc_midnight_preserves_manifest_creation_day(self):
  self.clock.t+=13*3600
  self.collect(max_leagues=1)
  self.assertEqual(self.load()['createdAt'],'2026-11-18T12:00:00Z')
  self.assertEqual(self.load()['throughDate'],'2026-11-18')
 def test_server_failure_defers_without_refusal_latch_and_can_resume_after_saved_backoff(self):
  def unavailable(url):self.calls.append(url);return 503,{'content-type':'text/plain'},b'temporary outage'
  with self.assertRaisesRegex(RuntimeError,'temporary'):self.collect(fetch_fn=unavailable)
  ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep)
  self.assertEqual(ledger.get('blocked',''),'');self.assertEqual(float(ledger.get('defer')),self.clock.t+3605);ledger.close()
  with self.assertRaises(m.SourceBlocked):self.collect(max_leagues=1)
  self.assertEqual(len(self.calls),1)
  self.clock.t+=3605;self.collect(max_leagues=1)
  self.assertEqual(len(self.calls),4);self.assertEqual(self.load()['status'],'paused')
 def test_same_host_canonical_redirect_is_followed_one_hop_as_a_separate_attempt(self):
  def redirecting(url):
   self.calls.append(url)
   if url.endswith('/x/'):return 302,{'location':url.replace('/x/','/supersport-hnl/')},b''
   return 200,{'content-type':'text/html'},b'<html><title>verified fixture</title></html>'
  self.collect(fetch_fn=redirecting,max_leagues=1)
  self.assertEqual(self.load()['status'],'paused');self.assertIn('https://semafor.hns.family/natjecanja/1000/supersport-hnl/',self.calls)
  self.assertEqual(self.load('status.json')['newAttempts'],len(self.calls));self.assertEqual(len(self.calls),6)
  ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep);self.assertEqual(ledger.get('blocked',''),'');ledger.close()
 def test_foreign_looping_or_refused_redirects_latch_and_never_continue(self):
  for location,final in [('https://example.com/natjecanja/1000/x/',None),('/natjecanja/1000/a/?q=1',None),('/natjecanja/1000/x/',None),('/natjecanja/1000/supersport-hnl/',(403,{},b'no')),
    ('/natjecanja/999/wrong/',None),('/utakmice/1000/wrong/',None),('/login/',None),('/natjecanja/1000/a/#f',None),('http://semafor.hns.family/natjecanja/1000/a/',None),
    ('https://user@semafor.hns.family/natjecanja/1000/a/',None),('https://semafor.hns.family:8443/natjecanja/1000/a/',None),('/natjecanja/1000/a/b/',None),('',None)]:
   with self.subTest(location=location):
    self.calls.clear();self.lp.unlink(missing_ok=True)
    import shutil;shutil.rmtree(self.run,ignore_errors=True)
    def redirecting(url):
     self.calls.append(url)
     return (302,{'location':location},b'') if len(self.calls)==1 else final
    with self.assertRaises((ValueError,m.SourceBlocked)):self.collect(fetch_fn=redirecting,max_leagues=1)
    self.assertLessEqual(len(self.calls),2)
    with self.assertRaises(m.SourceBlocked):self.collect(fetch_fn=redirecting,max_leagues=1)
 def test_second_redirect_challenge_and_expiry_between_hops_never_continue(self):
  for second in [(302,{'location':'/natjecanja/1000/other/'},b''),(200,{'content-type':'text/html','cf-mitigated':'challenge'},b'<html>Just a moment...</html>')]:
   with self.subTest(second=second[0]):
    self.calls.clear();self.lp.unlink(missing_ok=True)
    import shutil;shutil.rmtree(self.run,ignore_errors=True)
    def redirecting(url):
     self.calls.append(url);return (302,{'location':'/natjecanja/1000/supersport-hnl/'},b'') if len(self.calls)==1 else second
    with self.assertRaises((ValueError,m.SourceBlocked)):self.collect(fetch_fn=redirecting,max_leagues=1)
    self.assertEqual(len(self.calls),2)
    with self.assertRaises(m.SourceBlocked):self.collect(fetch_fn=redirecting,max_leagues=1)
    self.assertEqual(len(self.calls),2)
  self.calls.clear();self.lp.unlink(missing_ok=True)
  import shutil;shutil.rmtree(self.run,ignore_errors=True)
  def expiring(url):
   self.calls.append(url);self.clock.t+=86400;return 302,{'location':'/natjecanja/1000/supersport-hnl/'},b''
  with self.assertRaises(ValueError):self.collect(fetch_fn=expiring,max_leagues=1)
  self.assertEqual(len(self.calls),1)
  self.calls.clear();self.lp.unlink(missing_ok=True);self.clock.t-=86400
  shutil.rmtree(self.run,ignore_errors=True)
  def redirecting(url):
   self.calls.append(url);return 302,{'location':'/natjecanja/1000/supersport-hnl/'},b''
  self.collect(fetch_fn=redirecting,max_new=1,max_leagues=1)
  self.assertEqual(len(self.calls),1);self.assertEqual(self.load()['status'],'paused')
 def test_unsuffixed_parent_is_preserved_and_schedule_proof_must_match_manifest(self):
  def valid(kind,path,fixture=None,code=None,parent_name=None):
   if kind=='schedule':return dict(parentName='SuperSport HNL',season='2026/27',competitionCode=code,fixtures=[dict(id='20',datum='2026-11-17',izid='2:1')])
   self.assertEqual(parent_name,'SuperSport HNL');return dict(complete=True)
  self.collect(parse_fn=valid,max_leagues=1)
  self.assertEqual(self.load()['leagues'][0]['parentName'],'SuperSport HNL')
  for i,change in enumerate([dict(season='2025/26'),dict(competitionCode='999')]):
   self.run=self.root/f'wrong-proof-{i}'
   def invalid(kind,path,fixture=None,code=None,parent_name=None):
    result=valid(kind,path,fixture,code,parent_name);result.update(change);return result
   before=len(self.calls)
   with self.assertRaisesRegex(ValueError,'identity'):self.collect(parse_fn=invalid,max_leagues=1)
   self.assertEqual(len(self.calls),before+1)

class PacingTests(CollectorHelpers,unittest.TestCase):
 def test_every_redirect_hop_and_response_has_positive_jitter(self):
  times=[];ends=[]
  def fetch(url):
   times.append(self.clock.t);self.clock.t+=2;ends.append(self.clock.t)
   if url.endswith('/x/'):return 302,{'location':url.replace('/x/','/canonical/')},b''
   return 200,{'content-type':'text/html'},b'<html>ok</html>'
  self.collect(fetch_fn=fetch,max_leagues=1,random_fn=lambda: 0)
  self.assertEqual(len(times),6)
  for start,end in zip(times[1:],ends):self.assertAlmostEqual(start-end,10.001,places=5)
  self.assertEqual(self.load()['attempts24h'],6)

 def test_transient_retries_are_bounded_across_runs_and_redirects(self):
  for redirected in [False,True,"timeout"]:
   with self.subTest(redirected=redirected):
    self.lp=self.root/f'bounded-{redirected}.sqlite';self.calls=[]
    def unavailable(url):
     self.calls.append(url)
     if redirected == 'timeout':raise TimeoutError('mock timeout')
     if redirected is True and url.endswith('/x/'):return 302,{'location':url.replace('/x/','/canonical/')},b''
     return 503,{},b'outage'
    for n in range(3):
     self.run=self.root/f'retry-{redirected}-{n}'
     with self.assertRaises(RuntimeError):self.collect(fetch_fn=unavailable)
     ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep)
     state=ledger.retry_state('https://semafor.hns.family/natjecanja/1000/x/')
     self.assertEqual(state['tries'],n+1)
     self.assertEqual(state['ready']-self.clock.t,min(14400,3600*2**n)+5)
     self.assertEqual(ledger.get('blocked',''),'')
     self.clock.t=state['ready'];ledger.close()
    before=len(self.calls);self.run=self.root/f'exhausted-{redirected}'
    with self.assertRaisesRegex(m.SourceBlocked,'retry limit'):self.collect(fetch_fn=unavailable)
    self.assertEqual(len(self.calls),before);self.assertEqual(before,6 if redirected is True else 3)
    self.assertEqual(self.load('status.json')['status'],'stopped')
    self.clock=Clock()

 def test_timeout_reservations_count_and_do_not_retry_within_call(self):
  def timeout(url):self.calls.append(url);raise TimeoutError('mock timeout')
  with self.assertRaisesRegex(RuntimeError,'transport failed'):self.collect(fetch_fn=timeout)
  with self.assertRaisesRegex(m.SourceBlocked,'backoff'):self.collect(fetch_fn=timeout)
  self.assertEqual(len(self.calls),1);self.assertEqual(self.load()['attempts24h'],1)

 def test_429_diagnostic_never_changes_latch_or_authorizes_retry(self):
  def refused(url):self.calls.append(url);return 429,{'Retry-After':'0'},b'wait'
  with self.assertRaises(m.SourceBlocked):self.collect(fetch_fn=refused)
  ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep)
  diagnostic=json.loads(ledger.get('recurring-retry-after'))
  self.assertEqual(diagnostic['value'],'0');self.assertIn('429',ledger.get('blocked'))
  ledger.close();self.clock.t+=60;self.run=self.root/'429-next'
  with self.assertRaises(m.SourceBlocked):self.collect()
  self.assertEqual(len(self.calls),1)

 def test_5xx_challenge_takes_precedence_over_transient_backoff(self):
  def challenge(url):self.calls.append(url);return 503,{'cf-mitigated':'challenge'},b'challenge'
  with self.assertRaises(m.SourceBlocked):self.collect(fetch_fn=challenge)
  ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep)
  self.assertTrue(ledger.get('blocked',''));self.assertEqual(ledger.get('defer'),'0');ledger.close()
  with self.assertRaises(m.SourceBlocked):self.collect(fetch_fn=challenge)
  self.assertEqual(len(self.calls),1)

 def test_budget_stops_redirect_hop_and_retry_before_network(self):
  ledger=m.Ledger(self.lp,950,self.clock.now,self.clock.sleep)
  ledger.db.executemany('INSERT INTO attempts(started,url,status) VALUES(?,?,?)',[(self.clock.t,'prior',200)]*949)
  ledger.db.commit();ledger.close()
  def redirect(url):self.calls.append(url);return 302,{'location':'/natjecanja/1000/canonical/'},b''
  self.collect(fetch_fn=redirect)
  self.assertEqual(len(self.calls),1);self.assertEqual(self.load()['attempts24h'],950)
  self.clock.t+=4000;self.run=self.root/'budget-retry';self.collect(fetch_fn=redirect)
  self.assertEqual(len(self.calls),1);self.assertEqual(self.load()['status'],'paused')

 def test_expiry_during_pacing_stops_before_redirect_transport(self):
  self.clock.t+=86400-1
  def redirect(url):self.calls.append(url);return 302,{'location':'/natjecanja/1000/canonical/'},b''
  with self.assertRaisesRegex(ValueError,'expired'):self.collect(fetch_fn=redirect)
  self.assertEqual(len(self.calls),1);self.assertEqual(self.load()['attempts24h'],2)
  self.assertEqual(self.load()['newAttempts'],2)

class LedgerPacingTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.path=Path(self.tmp.name)/'ledger.sqlite';self.clock=Clock()
 def ledger(self,random_fn=lambda: 1):
  return m.Ledger(self.path,950,self.clock.now,self.clock.sleep,random_fn)
 def test_saved_deadline_is_not_redrawn_after_restart(self):
  ledger=self.ledger();attempt=ledger.reserve('one');ledger.finish(attempt,200);ledger.succeeded('one')
  deadline=float(ledger.get('next'));self.assertEqual(deadline,self.clock.t+15);ledger.close()
  ledger=self.ledger(lambda: 0);ledger.reserve('two')
  self.assertEqual(self.clock.t,deadline);self.assertEqual(ledger.count(),2);ledger.close()
 def test_crash_before_or_during_http_counts_and_retains_pacing_and_retry_limit(self):
  for n in range(3):
   ledger=self.ledger();ledger.reserve('one')
   self.assertEqual(ledger.count(),n+1)
   self.assertEqual(float(ledger.get('next')),self.clock.t+45)
   ready=ledger.retry_state('one')['ready'];ledger.close()
   ledger=self.ledger(lambda: 0)
   with self.assertRaises(m.SourceBlocked):ledger.reserve('one')
   self.assertEqual(ledger.count(),n+1);ledger.close();self.clock.t=ready
  ledger=self.ledger()
  with self.assertRaisesRegex(m.SourceBlocked,'retry limit'):ledger.reserve('one')
  self.assertEqual(ledger.count(),3);ledger.close()
 def test_crash_deadline_paces_other_resource_and_keeps_shared_lock(self):
  ledger=self.ledger();ledger.reserve('one');deadline=float(ledger.get('next'))
  with self.assertRaises(m.SourceBlocked):self.ledger()
  ledger.close();ledger=self.ledger(lambda: 0);ledger.reserve('two')
  self.assertEqual(self.clock.t,deadline);ledger.close()
 def test_success_resets_retry_state_only_after_validated_final_html(self):
  ledger=self.ledger();attempt=ledger.reserve('one');ledger.finish(attempt,503,defer=True)
  self.clock.t=float(ledger.get('defer'));attempt=ledger.reserve('one');ledger.finish(attempt,302)
  self.assertEqual(ledger.retry_state('one')['tries'],2)
  attempt=ledger.reserve('canonical',resource='one',redirect=True);ledger.finish(attempt,200)
  self.assertEqual(ledger.retry_state('one')['tries'],2)
  ledger.succeeded('one');self.assertEqual(ledger.retry_state('one'),{});self.assertEqual(ledger.count(),3);ledger.close()
 def test_legacy_deadline_budget_and_latch_survive_upgrade(self):
  ledger=m._incident.Ledger(self.path,950,self.clock.now,self.clock.sleep)
  attempt=ledger.reserve('old');ledger.finish(attempt,200);deadline=float(ledger.get('next'));ledger.close()
  ledger=self.ledger();ledger.reserve('new');self.assertEqual(self.clock.t,deadline)
  self.assertEqual(ledger.count(),2);ledger.block('existing refusal');ledger.close()
  ledger=self.ledger()
  with self.assertRaisesRegex(m.SourceBlocked,'existing refusal'):ledger.reserve('other')
  self.assertEqual(ledger.count(),2);ledger.close()
 def test_short_sleep_cannot_skip_minimum_spacing(self):
  ledger=self.ledger();attempt=ledger.reserve('one');ledger.finish(attempt,200);ledger.succeeded('one')
  deadline=float(ledger.get('next'));ledger.close()
  def short_sleep(delay):self.clock.t+=min(delay,3)
  ledger=m.Ledger(self.path,950,self.clock.now,short_sleep,lambda: 0)
  ledger.reserve('two');self.assertEqual(self.clock.t,deadline);ledger.close()
 def test_clock_rollback_during_sleep_latches_before_new_reservation(self):
  ledger=self.ledger();attempt=ledger.reserve('one');ledger.finish(attempt,200);ledger.succeeded('one');ledger.close()
  def rollback(delay):self.clock.t-=1
  ledger=m.Ledger(self.path,950,self.clock.now,rollback,lambda: 0)
  with self.assertRaisesRegex(m.SourceBlocked,'clock moved backwards'):ledger.reserve('two')
  self.assertEqual(ledger.count(),1);self.assertEqual(ledger.get('blocked'),'clock moved backwards');ledger.close()
 def test_rollback_and_attempt_to_raise_limit_stop(self):
  ledger=self.ledger();ledger.reserve('one');self.clock.t-=1
  with self.assertRaisesRegex(m.SourceBlocked,'clock moved backwards'):ledger.reserve('two')
  ledger.close()
  with self.assertRaises(AssertionError):m.Ledger(self.path,951)

if __name__=='__main__':unittest.main()
