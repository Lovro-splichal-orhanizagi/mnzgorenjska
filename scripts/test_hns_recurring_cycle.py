import importlib.util, pathlib, tempfile, unittest, json
spec=importlib.util.spec_from_file_location('cycle',pathlib.Path(__file__).with_name('hns-recurring-cycle.py'))

class PublishTests(unittest.TestCase):
 def test_upload_failure_does_not_advance_pointer(self):
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);d=root/'batch';d.mkdir();(d/'blobs').mkdir()
   (d/'latest.json').write_text(json.dumps(dict(schema=2,source='hns',mode='recurring',status='complete',leagues=[dict(id=1,finished=True,schedule=dict(sha256='b'*64),reports=[],pending=[])])))
   calls=[]
   def runner(args,**kwargs):
    calls.append(args)
    if any('/blobs/' in str(x) for x in args):raise RuntimeError('upload failed')
   with self.assertRaisesRegex(RuntimeError,'upload failed'):module.publish(d,root,runner)
   self.assertFalse(any(any(str(x).endswith('/current.json') for x in c) for c in calls))
 def test_publish_orders_payload_before_pointer(self):
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);d=root/'batch';d.mkdir();(d/'blobs').mkdir()
   (d/'latest.json').write_text(json.dumps(dict(schema=2,source='hns',mode='recurring',status='pending',leagues=[dict(id=1,finished=True,schedule=dict(sha256='b'*64),reports=[],pending=[])])))
   calls=[];module.publish(d,root,lambda args,**kwargs:calls.append(args))
   self.assertTrue(any('/blobs/' in str(x) for x in calls[0]))
   self.assertTrue(any('/snapshots/' in str(x) for x in calls[1]))
   self.assertTrue(any(str(x).endswith('/current.json') for x in calls[2]))
 def test_heartbeat_only_change_does_not_enqueue_duplicate_scoring_work(self):
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);d=root/'batch';d.mkdir();(d/'blobs').mkdir()
   value=dict(schema=2,source='hns',mode='recurring',status='paused',manifestSha256='a'*64,leagues=[dict(id=1,finished=True,schedule=dict(sha256='b'*64),reports=[],pending=[])],updatedAt='2026-11-18T12:00:00Z')
   (d/'latest.json').write_text(json.dumps(value));calls=[]
   module.publish(d,root,lambda args,**kwargs:calls.append(args))
   value['updatedAt']='2026-11-18T13:00:00Z';value['attempts24h']=950
   (d/'latest.json').write_text(json.dumps(value));calls.clear()
   module.publish(d,root,lambda args,**kwargs:calls.append(args))
   self.assertEqual(len(calls),1)
   self.assertTrue(any(str(x).endswith('/collector-status.json') for x in calls[0]))
 def test_zero_progress_only_updates_health_and_never_enqueues(self):
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);d=root/'batch';d.mkdir();(d/'blobs').mkdir()
   (d/'latest.json').write_text(json.dumps(dict(schema=2,source='hns',mode='recurring',status='paused',leagues=[])))
   calls=[];module.publish(d,root,lambda args,**kwargs:calls.append(args))
   self.assertEqual(len(calls),1)
   self.assertTrue(any(str(x).endswith('/collector-status.json') for x in calls[0]))
if __name__=='__main__':unittest.main()
