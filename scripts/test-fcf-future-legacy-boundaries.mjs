// TEST ONLY downgraded manifests demonstrate that new37 history must never
// fall through to the old G9 reader's16 baseline or its final receipts.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {metadata,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
import {readFcfMissingInventoryDiagnosticArtifact,readFcfMissingInventoryStagingArtifact,buildFcfMissingInventoryFinalReceipt} from './fcf-missing-inventory-evidence.mjs'
import {validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
const opts={skip:process.env.FCF_POST_SIX_EVIDENCE_DIR&&process.env.FCF_FUTURE_SOURCE_EVIDENCE_DIR?false:'Actual37 accounting and historical bytes required'}
test('future37 cannot be relabeled as a legacy16 diagnostic',opts,async t=>{
 const f=await futureCaptureFixture(t);f.request=async()=>new Response('TEST ONLY refusal',{status:403});const r=await collectFcfMissingInventoryChild(f)
 const m=JSON.parse(readFileSync(join(r.outputDirectory,'manifest.json')))
 Object.assign(m,{schemaVersion:2,kind:'fcf-g9-held-parent-inventory',priorSourceGETs:16});m.attempts[0].sequence=17;m.documents[0].receipt.sequence=17
 const entries=readdirSync(r.outputDirectory).filter(n=>n!=='manifest.json').map(name=>({name,body:readFileSync(join(r.outputDirectory,name))}));entries.push({name:'manifest.json',body:Buffer.from(JSON.stringify(m))})
 const meta=metadata({bytes:zip(entries),name:'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:['Capture missing target inventory','Retain failed target inventory diagnostic'],run:'in_progress'})
 meta.jobs[0].status='completed';meta.jobs[0].conclusion='failure';meta.jobs[0].steps[0].conclusion='failure'
 Object.assign(meta.expected,{manifestSha256:sha(entries.at(-1).body),planSha256:f.plan.planSha256,childPlanSha256:validateFcfFutureSourcePlan({plan:f.plan,expectedPlanSha256:f.plan.planSha256,now:f.clock()}).childPlanSha256})
 assert.throws(()=>readFcfMissingInventoryDiagnosticArtifact({...meta,plan:f.plan,targetSlug:f.targetSlug,consumptionProof:f.consumptionProof,now:f.clock()}),/future source requires its separate evidence admission/)
})
test('future plan cannot mint old source/final evidence capabilities',opts,async t=>{
 const f=await futureCaptureFixture(t)
 assert.throws(()=>readFcfMissingInventoryStagingArtifact({plan:f.plan}),/future source requires its separate evidence admission/)
 assert.throws(()=>buildFcfMissingInventoryFinalReceipt({...f,childRecords:[],now:f.clock()}),/future source requires its separate evidence admission/)
})
