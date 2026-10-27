// TEST ONLY: genuine37-spent history + retained marker bytes, with constructed
// fresh240 source pages and synthetic NEW Actions/Git/audit/final metadata.
// This is not a live capture, current reservation or native admission witness.
import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {serialize,deserialize} from 'node:v8'
import {futureCaptureFixture} from './fcf-future-capture-test-fixture.mjs'
import {postSixAccountingWire} from './fcf-post-six-accounting-test-fixture.mjs'
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {readFcfFutureSourceStagingArtifact,auditFcfFutureSourceOffline} from './fcf-missing-inventory-evidence.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
import {metadata,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
export const sourceSteps=['Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit']
export const bundle=m=>Object.fromEntries(['zipBytes','artifact','run','jobs','expected'].map(k=>[k,m[k]]))
const copy=x=>deserialize(serialize(x))
let saved
export function authenticateFutureWire(w){
 const accounting=readFcfPostSixAccounting({...w.history,now:w.now})
 validateFcfFutureSourcePlan({plan:w.plan,accountingProof:accounting,expectedPlanSha256:w.plan.planSha256,now:w.now})
 const claimProof=readFcfInventoryExecutionClaim({...w.claim,plan:w.plan,now:w.now}),consumptionProof=readFcfInventoryConsumptionArtifact({...w.consumption,claimProof,now:w.now})
 return {plan:w.plan,claimProof,consumptionProof,now:w.now}
}
export async function futureAdmissionWire(t){
 if(saved)return copy(saved)
 const api=await import('./fcf-future-source-admission.mjs'),f=await futureCaptureFixture(t),result=await collectFcfMissingInventoryChild(f)
 if(result.status!=='inventory-complete')throw Error('TEST ONLY complete future source fixture failed')
 const entries=readdirSync(result.outputDirectory).map(name=>({name,body:readFileSync(join(result.outputDirectory,name))})),raw=entries.find(e=>e.name==='manifest.json'),manifest=JSON.parse(raw.body)
 const inventory=bundle(metadata({bytes:zip(entries),name:'fcf-missing-inventory-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'898',steps:sourceSteps,run:'in_progress'}))
 Object.assign(inventory.expected,{manifestSha256:sha(raw.body),planSha256:f.plan.planSha256,childPlanSha256:manifest.childPlanSha256})
 const staged=readFcfFutureSourceStagingArtifact({...inventory,plan:f.plan,targetSlug:f.targetSlug,consumptionProof:f.consumptionProof,now:f.clock()})
 const auditManifest=auditFcfFutureSourceOffline({stagingProof:staged,policyHashes:f.plan.policyHashes,now:f.clock()}),auditBytes=Buffer.from(JSON.stringify(auditManifest))
 const audit=bundle(metadata({bytes:zip([{name:'manifest.json',body:auditBytes}]),name:'fcf-missing-inventory-audit-es-ct-tercera-g9-123-1',jobName:'missing-inventory-g9',jobId:'555',artifactId:'899',steps:sourceSteps,run:'in_progress'}));audit.expected.manifestSha256=sha(auditBytes)
 const child=api.readFcfFutureSourceCompletedChildArtifact({plan:f.plan,consumptionProof:f.consumptionProof,inventory,audit,now:f.clock()})
 const finalManifest=api.buildFcfFutureSourceFinalReceipt({plan:f.plan,claimProof:f.claimProof,consumptionProof:f.consumptionProof,childRecords:[child],execution:{...f.execution,jobId:'777'},now:f.clock()+1}),finalBytes=Buffer.from(JSON.stringify(finalManifest))
 const finalReceipt=bundle(metadata({bytes:zip([{name:'manifest.json',body:finalBytes}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',jobId:'777',artifactId:'999',steps:['Retain final FCF inventory receipt']}));finalReceipt.expected.manifestSha256=sha(finalBytes)
 const claim=Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,f.claimWire[k]])),consumption=bundle(f.consumptionWire)
 const wire={history:postSixAccountingWire(),plan:f.plan,claim,consumption,child:{inventory,audit},finalReceipt,now:f.clock()+2}
 for(const r of [consumption,inventory,audit,finalReceipt]){r.run.status='completed';r.run.conclusion='success'}
 saved=copy(wire);return copy(saved)
}
export function rewriteManifest(b,change){
 const input=JSON.parse((awaitlessManifest(b)).toString());change(input)
 const body=Buffer.from(JSON.stringify(input));b.zipBytes=zip([{name:'manifest.json',body}]);b.artifact.size_in_bytes=b.zipBytes.length;b.artifact.digest=b.expected.artifactDigest='sha256:'+sha(b.zipBytes);b.expected.manifestSha256=sha(body)
 return input
}
// Test-only local ZIP inspection, never a source/GitHub dependency.
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
function awaitlessManifest(b){const dir=mkdtempSync(join(tmpdir(),'future-audit-test-'));try{const file=join(dir,'raw.zip');writeFileSync(file,b.zipBytes);return execFileSync('unzip',['-p',file,'manifest.json'])}finally{rmSync(dir,{recursive:true,force:true})}}
