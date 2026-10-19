import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runRefreshBatch,validateRefreshSelection} from './refresh-existing-leagues.mjs'
const registry=JSON.parse(readFileSync(new URL('./policies/existing-league-candidates-20261018.json',import.meta.url)))
const candidates=registry.candidates.filter(c=>c.source==='eps')
const one=candidates[0],same=candidates.find(c=>c.slug!==one.slug&&c.source_league_code.split(':')[0]===one.source_league_code.split(':')[0]),different=candidates.find(c=>c.source_league_code.split(':')[0]!==one.source_league_code.split(':')[0])
const competition=async c=>({...c,active:false,source_policy:null,date_only_deadline_policy:null})
const ro={id:496,slug:'ro-liga3-s2',source:'hlf',source_league_code:'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-2'}
const roOther={...ro,id:495,slug:'ro-liga3-s3',source_league_code:'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-3'}
test('HLF is bounded to five leagues and never mixes providers with EPS in one refresh',()=>{
 assert.equal(validateRefreshSelection([ro,roOther]).length,2)
 assert.throws(()=>validateRefreshSelection([one,ro]))
 assert.throws(()=>validateRefreshSelection(Array.from({length:6},(_,i)=>({...ro,id:i,slug:`ro-test-${i}`}))))
})
test('HLF catch-up runs ordinary schedule then missing reports for each selected league',async()=>{
 const calls=[]
 const results=await runRefreshBatch({candidates:[ro,roOther],transport:{competition},runCommand:async(file,args)=>{calls.push([file,args]);return 0}})
 assert.deepEqual(results.map(r=>r.status),['REFRESHED','REFRESHED'])
 assert.deepEqual(calls,[ro,roOther].flatMap(c=>[['scripts/uvoz-razporeda.mjs',['--tekmovanje',c.slug,'--pisi']],['scripts/uvoz-zapisnikov.mjs',['--tekmovanje',c.slug,'--samo-manjkajoce']]]))
})
test('one HLF refusal stops the common provider across distinct league paths without retry',async()=>{
 let calls=0
 const results=await runRefreshBatch({candidates:[ro,roOther],transport:{competition},runCommand:async()=>{calls++;return 4}})
 assert.equal(calls,1)
 assert.deepEqual(results.map(r=>r.status),['HOLD','SKIPPED_SOURCE_STOP'])
})
test('refresh selection is bounded to one to five exact existing EPS candidates',()=>{
 assert.equal(validateRefreshSelection([one]).length,1)
 for(const selection of [[],candidates.slice(0,6),[one,one],[{...one,source:'pzpn'}]])assert.throws(()=>validateRefreshSelection(selection))
})
test('batch catches up multiple leagues through ordinary schedule then missing-report commands only',async()=>{
 const calls=[]
 const results=await runRefreshBatch({candidates:[one,different],transport:{competition},runCommand:async(file,args)=>{calls.push([file,args]);return 0}})
 assert.deepEqual(results.map(r=>r.status),['REFRESHED','REFRESHED'])
 assert.deepEqual(calls,[one,different].flatMap(c=>[['scripts/uvoz-razporeda.mjs',['--tekmovanje',c.slug,'--pisi']],['scripts/uvoz-zapisnikov.mjs',['--tekmovanje',c.slug,'--samo-manjkajoce']]]))
})
test('entire scope is validated before first write and metadata drift or active leagues refuse',async()=>{
 for(const patch of [{active:true},{source_league_code:'foreign:1'},{source_policy:'pending'},{id:-1}]){
  let calls=0
  await assert.rejects(()=>runRefreshBatch({candidates:[one,different],transport:{competition:async c=>({...await competition(c),...(c.slug===different.slug?patch:{})})},runCommand:async()=>{calls++;return 0}}))
  assert.equal(calls,0)
 }
})
test('provider refusal stops that domain while independent domains continue, with no retry',async()=>{
 const calls=[]
 const results=await runRefreshBatch({candidates:[one,same,different],transport:{competition},runCommand:async(file,args)=>{calls.push([file,args]);return args.includes(one.slug)?4:0}})
 assert.deepEqual(results.map(r=>r.status),['HOLD','SKIPPED_SOURCE_STOP','REFRESHED'])
 assert.equal(calls.filter(([,args])=>args.includes(one.slug)).length,1)
 assert.equal(calls.filter(([,args])=>args.includes(same.slug)).length,0)
})
test('schedule warning needing a decision blocks report import for that league',async()=>{
 const calls=[]
 const results=await runRefreshBatch({candidates:[one,different],transport:{competition},runCommand:async(file,args)=>{calls.push([file,args]);return args.includes(one.slug)?3:0}})
 assert.deepEqual(results.map(r=>r.status),['HOLD','REFRESHED']);assert.equal(calls.filter(([,args])=>args.includes(one.slug)).length,1)
})
test('competition rechecked before each stage and no active overwrite happens',async()=>{
 let reads=0,calls=0
 const results=await runRefreshBatch({candidates:[one],transport:{competition:async c=>({...await competition(c),active:++reads>=3})},runCommand:async()=>{calls++;return 0}})
 assert.equal(calls,1);assert.equal(results[0].status,'HOLD')
})
test('ambiguous child failure is recorded once and not retried',async()=>{
 let calls=0
 const results=await runRefreshBatch({candidates:[one],transport:{competition},runCommand:async()=>{calls++;throw Error('process terminated')}})
 assert.equal(calls,1);assert.equal(results[0].status,'HOLD');assert.match(results[0].reason,/process terminated/)
})
test('unclassified schedule failures and child terminations stop the provider domain before another league',async()=>{
 for(const failure of [1,Error('Import terminated (SIGTERM)')]){
  const calls=[]
  const results=await runRefreshBatch({candidates:[one,same,different],transport:{competition},runCommand:async(file,args)=>{calls.push(args);if(args.includes(one.slug)){if(failure instanceof Error)throw failure;return failure}return 0}})
  assert.deepEqual(results.map(r=>r.status),['HOLD','SKIPPED_SOURCE_STOP','REFRESHED'])
  assert.equal(calls.filter(args=>args.includes(same.slug)).length,0)
 }
})
test('progress checkpoint is emitted before each import starts, including failed in-flight steps',async()=>{
 const events=[]
 const results=await runRefreshBatch({candidates:[one],transport:{competition},onProgress:async e=>events.push(e),runCommand:async()=>{assert.equal(events.at(-1).status,'RUNNING');throw Error('process terminated')}})
 assert.equal(results[0].status,'HOLD');assert.equal(events[0].stage,'schedule');assert.equal(events[0].status,'RUNNING');assert.equal(events.at(-1).status,'FAILED')
})
