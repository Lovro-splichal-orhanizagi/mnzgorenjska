import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {awaitFcfRefresh800ActiveEpoch,getFcfRefresh800Execution,assertFcfRefresh800JobGraph} from './fcf-refresh800-execution.mjs'
import {epochFixture} from './fcf-refresh800-test-fixture.mjs'

test('retained hosted metadata rejects initial incomplete/stale views and strictly accepts all three later phases',()=>{
 const bytes=readFileSync(new URL('./vzorci/fcf-refresh800-metadata-TESTONLY.json.gz',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),'0b1ea8512a5dd499ce430ff22b644b21b6c4d8aac1dd164eae6a16f95c06302b');const data=JSON.parse(gunzipSync(bytes));
 assert.equal(data.sourceAuthority,false);assert.equal(data.providerRequests,0);assert.equal(data.runId,'41116961741');
 const expectedJobNames=data.samples.find(s=>s.phase==='capture').actualJobs.jobs.map(j=>j.name);
 for(const sample of data.samples){
  const jobs=sample.actualJobs.jobs,run={id:Number(data.runId),head_sha:'e90df6afc0cb28533593b225ef58df7bbd1212b1'},call=()=>assertFcfRefresh800JobGraph({run,jobs,terminal:false,phase:sample.phase,expectedJobNames});
  if(sample.accepted)call();else assert.throws(call,error=>error.message===sample.reason);
 }
 assert.equal(data.samples.filter(s=>s.accepted).length,3);
})

function fixture(){
 const f=epochFixture(),original=f.github;let reads=0,now=0;
 const options={github:async(p,b)=>{
  if(p.endsWith('actions/runs/123'))return structuredClone(f.run);
  if(p.includes('actions/runs/123/attempts/1/jobs?')){reads++;const jobs=structuredClone(f.jobs);if(reads===1)jobs.pop();return {total_count:jobs.length,jobs}};
  return original(p,b)
 },locator:f.locator,phase:'capture',maximumWaitMs:20,clock:()=>now,pause:async ms=>{now+=ms}};
 return {f,options,get reads(){return reads}}
}
test('temporarily missing complete job graph waits for strict authenticated later metadata without issuing a capability',async()=>{
 const x=fixture(),created=x.f.plan.createdUTC,epoch=await awaitFcfRefresh800ActiveEpoch(x.options);
 assert.equal(x.reads,2);assert.equal(epoch.plan.createdUTC,created);assert.ok(epoch.claimBinding);assert.throws(()=>getFcfRefresh800Execution(epoch),/reader-issued/);
})
test('persistent incomplete metadata times out without being accepted as zero',async()=>{
 const x=fixture(),original=x.options.github;x.options.github=async(p,b)=>{const value=await original(p,b);if(p.includes('/attempts/1/jobs?')){value.jobs=[];value.total_count=0}return value};
 await assert.rejects(awaitFcfRefresh800ActiveEpoch(x.options),/complete closed workflow job graph required/);assert.equal(x.reads,2);
})
test('wrong epoch, unknown steps, transport failures and bad approval are never retried',async()=>{
 for(const mode of ['epoch','step','transport','approval']){
  const x=fixture(),original=x.options.github;let pauses=0;x.options.pause=async()=>{pauses++;throw Error('unexpected retry')};
  x.options.github=async(p,b)=>{
   if(p.endsWith('actions/runs/123')&&mode==='epoch')return {...x.f.run,run_attempt:2};
   if(p.includes('/attempts/1/jobs?')){
    if(mode==='transport')throw Error('HTTP failure');
    const jobs=structuredClone(x.f.jobs);if(mode==='step')jobs[0].steps[0].name='unreviewed operation';return {total_count:jobs.length,jobs};
   }
   const value=await original(p,b);if(mode==='approval'&&p.endsWith('releases/assets/1'))return Buffer.concat([value,Buffer.from(' ')]);return value;
  };
  await assert.rejects(awaitFcfRefresh800ActiveEpoch(x.options));assert.equal(pauses,0,mode);
 }
})
