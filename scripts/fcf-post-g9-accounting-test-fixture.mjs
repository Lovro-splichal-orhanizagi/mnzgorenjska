// TEST ONLY. Genuine retained old37 history, synthetic NEW G9 execution/source
// records. No actual new G9 receipt, production spend or authority is asserted.
import {futureAdmissionWire,authenticateFutureWire,sourceSteps,bundle} from './fcf-future-admission-test-fixture.mjs'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {readFcfFutureSourceFailedAuditChildArtifact,readFcfFutureSourceDiagnosticChildArtifact,readFcfFutureSourceUnstartedChild,buildFcfFutureSourceFinalReceipt} from './fcf-future-source-admission.mjs'
import {metadata,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'

function finalBundle(final,conclusion){
 const bytes=Buffer.from(JSON.stringify(final)),raw=bundle(metadata({bytes:zip([{name:'manifest.json',body:bytes}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',jobId:'777',artifactId:'999',steps:['Retain final FCF inventory receipt']}))
 raw.expected.manifestSha256=sha(bytes);raw.run.conclusion=conclusion
 return raw
}
function terminal(b,conclusion){b.run.status='completed';b.run.conclusion=conclusion;return b}
export async function postG9AccountingWire(t,mode='completed'){
 if(mode==='diagnostic'){
  const f=await futureCaptureFixture(t)
  f.request=async()=>new Response('TEST ONLY source refusal',{status:403})
  const r=await collectFcfMissingInventoryChild(f),entries=readdirSync(r.outputDirectory).map(name=>({name,body:readFileSync(join(r.outputDirectory,name))})),raw=entries.find(e=>e.name==='manifest.json'),m=JSON.parse(raw.body)
  const diagnostic=bundle(metadata({bytes:zip(entries),name:'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:['Capture missing target inventory','Retain failed target inventory diagnostic']}))
  Object.assign(diagnostic.expected,{manifestSha256:sha(raw.body),planSha256:f.plan.planSha256,childPlanSha256:m.childPlanSha256})
  diagnostic.jobs[0].conclusion='failure';diagnostic.jobs[0].steps[0].conclusion='failure';terminal(diagnostic,'failure')
  const c={plan:f.plan,claimProof:f.claimProof,consumptionProof:f.consumptionProof,now:f.clock()},child=readFcfFutureSourceDiagnosticChildArtifact({plan:c.plan,consumptionProof:c.consumptionProof,now:c.now,diagnostic}),final=buildFcfFutureSourceFinalReceipt({...c,childRecords:[child],execution:{...f.execution,jobId:'777'}})
  return {prior:postSixAccountingWire(),latest:{plan:f.plan,claim:Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,f.claimWire[k]])),consumption:terminal(bundle(f.consumptionWire),'failure'),child:{diagnostic},finalReceipt:finalBundle(final,'failure')},now:f.clock()+1}
 }
 const w=await futureAdmissionWire(t),latest={plan:w.plan,claim:w.claim,consumption:w.consumption,child:w.child,finalReceipt:w.finalReceipt}
 if(mode==='completed')return {prior:w.history,latest,now:w.now}
 const c=authenticateFutureWire(w);let child
 if(mode==='failed-audit'){
  terminal(w.child.inventory,'failure');w.child.inventory.jobs[0].conclusion='failure';w.child.inventory.jobs[0].steps[2].conclusion='failure';w.child.inventory.jobs[0].steps[3].conclusion='skipped'
  latest.child={inventory:w.child.inventory};child=readFcfFutureSourceFailedAuditChildArtifact({plan:c.plan,consumptionProof:c.consumptionProof,now:c.now,...latest.child})
 }else if(mode==='unstarted'){
  const run={...w.child.inventory.run,conclusion:'failure'},jobs=[{...w.child.inventory.jobs[0],conclusion:'failure',steps:[{name:sourceSteps[0],status:'completed',conclusion:'skipped'}]}],expected={runId:'123',runAttempt:'1',sourceCommit:w.plan.sourceCommit,planSha256:w.plan.planSha256,jobId:'555'}
  latest.child={unstarted:{run,jobs,expected}};child=readFcfFutureSourceUnstartedChild({plan:c.plan,consumptionProof:c.consumptionProof,now:c.now,...latest.child.unstarted})
 }else throw Error('unknown TEST ONLY accounting mode')
 terminal(latest.consumption,'failure')
 const final=buildFcfFutureSourceFinalReceipt({...c,childRecords:[child],execution:{...w.claim.execution,jobId:'777'}})
 latest.finalReceipt=finalBundle(final,'failure')
 return {prior:w.history,latest,now:c.now+1}
}
