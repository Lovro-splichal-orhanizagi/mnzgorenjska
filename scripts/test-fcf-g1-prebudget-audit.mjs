// Genuine fixed83 reconstruction ONCE, all GETs from retained SHA-checked files.
// The seven-report artifact is genuine; negatives never mint fake authority.
import test,{before} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {readFcfG1RemainderParent,getFcfG1RemainderParent} from './fcf-g1-remainder-parent.mjs'
const enabled=!!process.env.FCF_G1_REMAINDER_EVIDENCE_DIR,E=process.env.FCF_G1_REMAINDER_EVIDENCE_DIR,D=process.env.FCF_G1_PREBUDGET_EVIDENCE_DIR,repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',sha=b=>createHash('sha256').update(b).digest('hex')
let parentProof,api,map,actualRun,actualJobs
before(async()=>{if(!enabled)return;assert.ok(D,'explicit genuine seven-report retention required');map=new Map()
 for(const dir of [E,join(E,'authentication')])for(const line of readFileSync(join(dir,'transport-journal.ndjson'),'utf8').trim().split('\n')){const r=JSON.parse(line);if(r.status!=='get-returned')continue;const b=readFileSync(join(dir,r.file));assert.equal(sha(b),r.sha256);map.set(r.path,b)}
 actualRun=JSON.parse(readFileSync(join(D,'run.json')));actualJobs=JSON.parse(readFileSync(join(D,'jobs.json'))).jobs
 for(const [path,file]of [[`actions/runs/39082161817`,'run.json'],[`actions/runs/39082161817/attempts/1/jobs?per_page=100&page=1`,'jobs.json'],[`actions/runs/39082161817/artifacts?per_page=100&page=1`,'artifact-inventory-response.json'],[`actions/artifacts/12123222378`,'artifact-metadata.json'],[`actions/artifacts/12123222378/zip`,'artifact.zip']])map.set(repo+path,readFileSync(join(D,file)))
 const refs=JSON.parse(readFileSync(join(E,'g1-terminal-reference-data.json'))),github=async(path,binary=false)=>{assert.ok(map.has(path),'unretained GET '+path);const b=map.get(path);return binary?Buffer.from(b):JSON.parse(b)}
 parentProof=await readFcfG1RemainderParent({source:refs.prior,parentRecords:refs.latest,frozenDirectory:process.env.FCF_G1_REMAINDER_FROZEN_DIRECTORY,github})
})
function transport(change){const calls=[];return{calls,github:async(path,binary=false)=>{calls.push(path);assert.ok(map.has(path),'unretained GET '+path);const b=map.get(path),v=binary?Buffer.from(b):JSON.parse(b);return change?.(path,v,binary)??v}}}
async function module(){assert.ok(readFileSync(new URL('./fcf-g1-prebudget-audit.mjs',import.meta.url)));return api??=await import('./fcf-g1-prebudget-audit.mjs')}
test('genuine pre-budget seven-run scope binds fixed83 parent without zero-execution or counter authority',{skip:!enabled},async()=>{
 const a=await module(),io=transport(),proof=await a.readFcfG1PrebudgetAudit({parentProof,github:io.github})
 assert.equal(io.calls.length,5);assert.equal(new Set(io.calls).size,5)
 const data=a.assertFcfG1PrebudgetHistory({proof,run:actualRun,jobs:actualJobs});assert.equal(data.historicalSourceGETs,7);assert.equal(data.batchSourceGETs,0);assert.equal(data.runId,'39082161817');assert.equal(data.admissible,false);assert.equal(data.nativeAdmission,false);assert.equal(data.activationEligible,false);assert.ok(!Object.hasOwn(data,'actualSourceGETs'));assert.ok(!Object.hasOwn(data,'reuse'));assert.equal(getFcfG1RemainderParent(parentProof).accounting.priorSourceGETs,83)
 data.historicalSourceGETs=0;assert.equal(a.assertFcfG1PrebudgetHistory({proof,run:actualRun,jobs:actualJobs}).historicalSourceGETs,7)
 for(const copy of [{...proof},JSON.parse(JSON.stringify(proof)),{}])assert.throws(()=>a.assertFcfG1PrebudgetHistory({proof:copy,run:actualRun,jobs:actualJobs}),/private|issued/)
 for(const patch of [{id:39082161818},{head_sha:'0'.repeat(40)},{status:'in_progress',conclusion:null}])assert.throws(()=>a.assertFcfG1PrebudgetHistory({proof,run:{...actualRun,...patch},jobs:actualJobs}),/history|identity|scope/)
 const jobs=structuredClone(actualJobs);jobs[0].steps[6].conclusion='failure';assert.throws(()=>a.assertFcfG1PrebudgetHistory({proof,run:actualRun,jobs}),/history|job|scope/)
 const expiry=getFcfG1RemainderParent(parentProof).sourceFreshUntil,now=Date.now;try{Date.now=()=>Date.parse(expiry)+1;assert.throws(()=>a.assertFcfG1PrebudgetHistory({proof,run:actualRun,jobs:actualJobs}),/fresh|expired/)}finally{Date.now=now}
})
test('reader refuses run/head/live/job/artifact/manifest/raw/count substitutions',{skip:!enabled},async t=>{
 const a=await module()
 for(const [label,change]of [
  ['run', (p,v)=>p.endsWith('/runs/39082161817')?{...v,id:39082161818}:v],
  ['head',(p,v)=>p.endsWith('/runs/39082161817')?{...v,head_sha:'0'.repeat(40)}:v],
  ['live',(p,v)=>p.endsWith('/runs/39082161817')?{...v,status:'in_progress',conclusion:null}:v],
  ['actor',(p,v)=>p.endsWith('/runs/39082161817')?{...v,actor:{...v.actor,id:1}}:v],
  ['job',(p,v)=>p.includes('/jobs?')?{...v,jobs:v.jobs.map(j=>({...j,run_attempt:2}))}:v],
  ['job count',(p,v)=>p.includes('/jobs?')?{...v,total_count:2,jobs:[...v.jobs,v.jobs[0]]}:v],
  ['artifact',(p,v)=>p.endsWith('/artifacts/12123222378')?{...v,workflow_run:{...v.workflow_run,head_sha:'0'.repeat(40)}}:v],
  ['manifest/ZIP',(p,v,b)=>b?Buffer.from('TEST ONLY changed count/manifest'):v],
  ['raw',(p,v,b)=>{if(b)v[v.length>>1]^=1;return v}],
 ])await t.test(label,async()=>{const io=transport(change);await assert.rejects(a.readFcfG1PrebudgetAudit({parentProof,github:io.github}))})
})
test('parent aliases, caller clocks/cutoffs/anchors and serialized authority fail before GET',{skip:!enabled},async()=>{
 const a=await module();let calls=0;const github=async()=>{calls++;throw Error('must not GET')}
 await assert.rejects(a.readFcfG1PrebudgetAudit({parentProof:{...parentProof},github}),/issued|parent/)
 for(const extra of [{clock:()=>Date.now()},{cutoff:'2099-01-01'},{anchor:{}},{proof:{}},{run:actualRun}])await assert.rejects(a.readFcfG1PrebudgetAudit({parentProof,github,...extra}),/closed|fields/)
 assert.equal(calls,0)
})

// Negative-only boundary: cannot mint a positive production brand or raw receipt.
test('changed exposed protected anchor refuses before GET even if a future parent getter regresses',{skip:!enabled},async()=>{
 const view=getFcfG1RemainderParent(parentProof),path=new URL('./fcf-g1-prebudget-audit.mjs',import.meta.url),body=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFcfG1PrebudgetAudit};'
 view.sourceReferences.prior.prior.prior.prior.accounting.plan.seedBinding.runId='39169392574'
 const a=new Function('readFileSync','createHash','getFcfG1RemainderParent','readInventoryZip',body)(readFileSync,createHash,()=>view,()=>{throw Error('must not unpack')});let calls=0
 await assert.rejects(a.readFcfG1PrebudgetAudit({parentProof:'TEST ONLY negative anchor',github:async()=>{calls++;throw Error('must not GET')}}),/anchor/);assert.equal(calls,0)
})
