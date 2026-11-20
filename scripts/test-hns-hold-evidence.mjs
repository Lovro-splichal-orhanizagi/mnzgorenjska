import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {holdEvidence} from './hns-hold-evidence.mjs'

const now=Date.parse('2026-11-20T16:00:00Z'),at='2026-11-20T05:14:08Z'
function snapshot(){return {schema:2,source:'hns',mode:'recurring',status:'pending',createdAt:at,updatedAt:at,
  fromDate:'2026-11-06',leagues:Array.from({length:139},()=>({finished:true})),
  holds:{openCount:2,olderCount:1,entries:[
    {id:1,fixture:{id:'123',datum:'2026-11-05',home:'PRIVATE'},kind:'source-unplayed',reason:'PRIVATE',firstObservedAt:'2026-11-18T05:00:00Z',lastObservedAt:at},
    {id:2,fixture:{id:'456',datum:'2026-11-19'},kind:'report-pending',firstObservedAt:at,lastObservedAt:at}]}}}
function evidence(t){
  const root=process.env.PAPERCLIP_RUN_SCRATCH_DIR||os.tmpdir();fs.mkdirSync(root,{recursive:true})
  const dir=fs.mkdtempSync(path.join(root,'hns-holds-'));fs.mkdirSync(path.join(dir,'snapshots'))
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir
}
function save(dir,s){const body=JSON.stringify(s),hash=createHash('sha256').update(body).digest('hex');const file=path.join(dir,'snapshots',hash+'.json');fs.writeFileSync(file,body);return file}
test('collector-shaped holds retain kind, age and old-window evidence without private fields',t=>{
  const dir=evidence(t);save(dir,snapshot());const r=holdEvidence(dir,now)
  assert.equal(r.observationHealthy,true);assert.equal(r.snapshots[0].openCount,2)
  assert.deepEqual(r.snapshots[0].byKind,{'source-unplayed':1,'report-pending':1})
  assert.equal(r.snapshots[0].entries[0].ageDays,2);assert.equal(r.snapshots[0].olderCount,1)
  assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})
test('selects newest observation, preserves tied evidence separately, never reads receipts',t=>{
  const dir=evidence(t),old=snapshot();old.createdAt=old.updatedAt='2026-11-19T05:14:08Z';save(dir,old)
  save(dir,snapshot());const tie=snapshot();tie.status='stopped';save(dir,tie)
  const r=holdEvidence(dir,now);assert.equal(r.snapshots.length,2);assert.equal(r.observationHealthy,false)
})
test('stale and partial observations still expose holds without certifying health',t=>{
  const dir=evidence(t),s=snapshot();s.leagues=[];save(dir,s)
  assert.equal(holdEvidence(dir,now).observationHealthy,false)
  assert.equal(holdEvidence(dir,now+86400000).observationHealthy,false)
  assert.equal(holdEvidence(dir,now+86400000).snapshots[0].openCount,2)
})
for(const [name,mutate] of [
  ['missing holds',s=>delete s.holds],['count mismatch',s=>s.holds.openCount=0],
  ['older mismatch',s=>s.holds.olderCount=0],['duplicate',s=>s.holds.entries[1]=s.holds.entries[0]],
  ['unknown kind',s=>s.holds.entries[0].kind='PRIVATE'],['invalid date',s=>s.holds.entries[0].fixture.datum='2026-02-30'],
  ['future hold',s=>s.holds.entries[0].lastObservedAt='2026-11-21T00:00:00Z'],
  ['invalid id',s=>s.holds.entries[0].fixture.id='PRIVATE'],
])test(name+' fails closed',t=>{const dir=evidence(t),s=snapshot();mutate(s);save(dir,s);assert.throws(()=>holdEvidence(dir,now))})
test('tampered and absent snapshots cannot report zero holds',t=>{
  const dir=evidence(t);assert.throws(()=>holdEvidence(dir,now));const file=save(dir,snapshot());fs.appendFileSync(file,' ')
  assert.throws(()=>holdEvidence(dir,now),/hash mismatch/)
})
test('evidence workflow integrates the summary before database reads',()=>{
  const script=fs.readFileSync(new URL('./hns-dokazi.mjs',import.meta.url),'utf8')
  const summary=script.indexOf('out.sourceHolds=holdEvidence(dir)')
  assert.ok(summary>=0&&summary<script.indexOf('const db=createClient'))
  assert.ok(script.includes("catch { throw new Error('Retained HNS hold evidence missing or invalid; no current hold verdict') }"))
})
