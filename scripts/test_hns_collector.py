import importlib.util, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('collector',Path(__file__).with_name('hns-collector.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Clock:
 def __init__(self):self.t=100000
 def now(self):return self.t
 def sleep(self,n):self.t+=n
class Tests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.clock=Clock()
 def ledger(self,limit=2):return m.Ledger(Path(self.tmp.name)/'state.sqlite',limit,self.clock.now,self.clock.sleep)
 def test_budget_and_spacing_survive_restart(self):
  a=self.ledger();i=a.reserve('a');a.finish(i,200);self.assertEqual(a.count(),1);a.close()
  b=self.ledger();j=b.reserve('b');self.assertEqual(self.clock.t,100010);b.finish(j,200)
  with self.assertRaises(m.BudgetExhausted):b.reserve('c')
  b.close()
 def test_refusal_persists_and_does_not_retry(self):
  a=self.ledger();i=a.reserve('a');a.finish(i,403);a.block('403');a.close()
  b=self.ledger()
  with self.assertRaises(m.SourceBlocked):b.reserve('b')
  self.assertEqual(b.count(),1);b.close()
 def test_clock_rollback_fails_closed(self):
  a=self.ledger();i=a.reserve('a');a.finish(i,200);self.clock.t-=60
  with self.assertRaises(m.SourceBlocked):a.reserve('b')
  a.close()
 def test_lock_excludes_second_reader(self):
  a=self.ledger()
  with self.assertRaises(m.SourceBlocked):self.ledger()
  a.close()
 def test_crashed_attempt_counts_and_reserves_timeout_spacing(self):
  a=self.ledger();a.reserve('a');a.close();b=self.ledger();b.reserve('b')
  self.assertEqual(self.clock.t,100040);b.close()
 def test_atomic_refusal_survives_restart(self):
  a=self.ledger();i=a.reserve('a');a.finish(i,403,blocked='403');a.close();b=self.ledger()
  with self.assertRaises(m.SourceBlocked):b.reserve('b')
  b.close()
 def test_transient_defer_survives_restart(self):
  a=self.ledger();i=a.reserve('a');a.finish(i,503,defer=True);a.close();b=self.ledger()
  with self.assertRaises(m.SourceBlocked):b.reserve('b')
  self.clock.t+=3600;b.reserve('b');b.close()
 def test_ceiling_cannot_be_raised(self):
  with self.assertRaises(AssertionError):self.ledger(1001)
 def test_challenges_and_partial_html_are_rejected(self):
  self.assertTrue(m.refused(403,{},b'x'));self.assertTrue(m.refused(200,{'cf-mitigated':'challenge'},b'<html>x'))
  self.assertTrue(m.refused(200,{},b'<title>Just a moment</title>'))
  with self.assertRaises(ValueError):m.validate_html(206,{'content-type':'text/html'},b'<html>partial')
  with self.assertRaises(ValueError):m.validate_html(200,{'content-type':'text/html'},b'{}')
if __name__=='__main__':unittest.main()
