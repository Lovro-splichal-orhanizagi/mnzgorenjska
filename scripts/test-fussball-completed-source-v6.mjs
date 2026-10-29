import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {readFussballCompletedSourceV6,getFussballCompletedSourceV6,fussballCompletedV6RuntimeInventory} from './fussball-completed-source-v6.mjs'
import {syntheticCompletedSourceFixture} from './fussball-native-composition-test-fixture.mjs'
test('source authority rejects public copied receipts and overrides before any GET',async()=>{
 for(const proof of [{},{nativeAdmission:true},{sourceOnly:true}])assert.throws(()=>getFussballCompletedSourceV6(proof),/reader-issued/)
 let calls=0;const input={sourceRunId:'123',frozenDirectory:'unused',github:async()=>{calls++}}
 for(const change of [{requireCodeMatch:false},{requireFresh:false},{now:0},{producerHead:'a'.repeat(40)},{sourceRunId:null}])await assert.rejects(readFussballCompletedSourceV6({...input,...change}))
 assert.equal(calls,0)
})
test('current W producer refuses old V6 authority; TEST ONLY old-V6 body context retains full inventory and fixed profile',async t=>{
 assert.throws(()=>fussballCompletedV6RuntimeInventory(),/reviewed V6 capture closure changed/)
 const f=await syntheticCompletedSourceFixture();try{t.mock.method(Date,'now',()=>f.now);await assert.rejects(readFussballCompletedSourceV6(f.input),/reviewed V6 capture closure changed/)}finally{t.mock.restoreAll()}assert.equal(f.replays,0)
 const v=f.api.fussballCompletedV6RuntimeInventory();assert.ok(Object.keys(v).length>=31)
 for(const f of ['.github/workflows/preveri-fussball-dopolni.yml','scripts/fussball-archive-v6.mjs','scripts/dfb-artifacts.mjs','scripts/viri/fussball-statistika.mjs','scripts/policies/fussball-transport-v6.json'])assert.match(v[f],/^[a-f0-9]{64}$/)
 // Historical TEST ONLY catalog: exact Git957de0524e0208bd30d898a48cd2b091b7a544f8
 // scripts/policies/fussball-baden-native-composition.json; never production authority.
 const c=JSON.parse(readFileSync(new URL('./vzorci/fussball-baden-native-catalog-unfinalized-957de052.json',import.meta.url)));assert.equal(c.status,'UNFINALIZED');assert.equal(c.sourceRunId,null);assert.equal(c.sourceHead,null);assert.equal(c.seasons[1].resultSha256,null);assert.deepEqual(c.seasons[1].reviews,[])
})
test('TEST ONLY synthetic hosted structure preserves private brand, copies and original freshness; no actual source proof',async()=>{
 const f=await syntheticCompletedSourceFixture(),p=await f.api.readFussballCompletedSourceV6(f.input)
 assert.throws(()=>getFussballCompletedSourceV6(p),/reader-issued/);assert.equal(f.replays,1);assert.ok(f.calls.filter(p=>p.includes('/contents/')).every(p=>p.endsWith('?ref='+'e'.repeat(40))));assert.equal(p.source.priorRequests,1838);assert.equal(p.source.cumulativeRequests,1841);assert.equal(p.nativeAdmission,false);assert.equal(p.source.sourceHead,'e'.repeat(40));assert.equal(p.source.currentSourceHead,'de77b661cbc11d95256a500e57c2fdea861a0647');assert.equal(p.source.currentCreatedAt,'2026-10-28T06:06:59.785Z');assert.equal(p.source.currentFreshUntil,'2026-10-29T06:06:59.785Z')
 assert.throws(()=>f.api.getFussballCompletedSourceV6({...p}),/reader-issued/);assert.throws(()=>f.api.getFussballCompletedSourceV6(JSON.parse(JSON.stringify(p))),/reader-issued/)
 const state=f.api.getFussballCompletedSourceV6(p);state.originals.stages.current.files.get('result.json')[0]^=1;state.certificate.run.head_sha='x';assert.notDeepEqual(state,f.api.getFussballCompletedSourceV6(p));await f.api.reauthenticateFussballCompletedSourceV6(p);assert.equal(f.replays,2)
 const original=f.now;f.setNow(Date.parse(p.source.currentFreshUntil)+1);try{assert.throws(()=>f.api.getFussballCompletedSourceV6(p),/stale/)}finally{f.setNow(original)}
})
for(const [name,change]of [
 ['failed source run',f=>f.run.conclusion='failure'],['rerun',f=>f.run.run_attempt=2],['nonmanual source',f=>f.run.event='push'],['foreign source head repository',f=>f.run.head_repository.full_name='other/repo'],['future run metadata',f=>f.run.updated_at='2099-01-01T00:00:00Z'],
 ['missing graph member',f=>f.jobs.jobs.pop()],['changed job head',f=>f.jobs.jobs[3].head_sha='a'.repeat(40)],['executed legacy job',f=>f.jobs.jobs[0].conclusion='success'],['missing frozen step',f=>f.jobs.jobs[3].steps.splice(2,1)],['failed replay step',f=>f.jobs.jobs[3].steps[6].conclusion='failure'],['changed capture step clock',f=>f.jobs.jobs[3].steps[5].completed_at='2000-01-01T00:00:00Z'],
 ['expired artifact',f=>f.artifact.expired=true],['missing artifact',f=>f.inventory.total_count=1],['wrong artifact head',f=>f.artifact.workflow_run.head_sha='a'.repeat(40)],['changed ZIP body',f=>f.archiveZip[0]^=1],['changed producer body',f=>f.controls.change=(p,v)=>p.includes('/contents/scripts/fussball-archive-v6.mjs?')?{...v,content:Buffer.from('changed body').toString('base64')}:v],['changed local capture runtime',f=>f.controls.changedRuntime=true],['changed producer file metadata',f=>f.controls.change=(p,v)=>p.includes('/contents/scripts/fussball-archive-v6.mjs?')?{...v,size:v.size+1}:v],['failed independent replay',f=>f.controls.failedReplay=true],
 ['metadata drift during replay',f=>{let n=0;f.controls.change=(p,v)=>p.endsWith('/runs/'+f.input.sourceRunId)&&++n===2?{...v,updated_at:'2000-01-01T00:00:00Z'}:v}],
])test('TEST ONLY synthetic hosted source rejects '+name,async()=>{const f=await syntheticCompletedSourceFixture();change(f);await assert.rejects(f.api.readFussballCompletedSourceV6(f.input))})
