// Future G9 source-only admission. No source/GitHub/DB client, dispatch, native
// import or launch permission. Raw evidence is authenticated before capabilities
// are branded; source parsing and complete calendar/GK checks remain shared.
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {validateFcfFutureSourcePlan,FCF_FUTURE_SOURCE_PROTOCOL,fcfFutureSourceClaimRef} from './fcf-future-source-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact,requireFcfInventoryExecutionClaim,requireFcfInventoryConsumption} from './fcf-missing-inventory-claim.mjs'
import {readFcfFutureSourceStagingArtifact,auditFcfFutureSourceOffline,getFcfFutureSourceStagedData,readFcfFutureSourceDiagnosticArtifact} from './fcf-missing-inventory-evidence.mjs'
import {verifyInventoryExecution,readInventoryZip,jsonBytes,exactKeys,frozenJSON,validUTC,nativeId,inventoryFail as fail} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml',targetSlug='es-ct-tercera-g9'
const steps=['Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit']
const children=new WeakMap(),receipts=new WeakMap(),targets=new WeakMap(),same=(a,b)=>hash(a)===hash(b),clone=x=>structuredClone(x)
const consumptionBinding=p=>({artifactId:p.artifactId,artifactDigest:p.artifactDigest,manifestSha256:p.manifestSha256,runId:p.runId,runAttempt:p.runAttempt,jobId:p.jobId,claimRef:p.claimRef,claimCommit:p.claimCommit,claimJsonSha256:p.claimJsonSha256})
const claimBinding=p=>({claimRef:p.claimRef,claimCommit:p.claimCommit,claimJsonSha256:p.claimJsonSha256})
function scope(plan,consumptionProof,now){
 const p=requireFcfInventoryConsumption(consumptionProof)
 if(!Number.isFinite(now)||!Number.isFinite(new Date(now).getTime())||plan?.preset!==FCF_FUTURE_SOURCE_PROTOCOL)fail('future source scope and finite clock required')
 validateFcfFutureSourcePlan({plan,expectedPlanSha256:plan.planSha256,now})
 if(p.protocol!==plan.preset||p.planSha256!==plan.planSha256||p.sourceCommit!==plan.sourceCommit||p.runAttempt!=='1'||p.claimRef!==fcfFutureSourceClaimRef(plan)||p.accountingSha256!==hash(plan.accountingBinding)||p.maximumSourceGETs!==478||p.priorSourceGETs!==37||p.maximumNewSourceGETs!==240||p.plannedCumulativeSourceGETs!==277||!validUTC(p.consumedUTC)||Date.parse(p.consumedUTC)>now)fail('matching future37/240/478 consumed source capability required')
 return p
}
function matchingClaim(plan,claimProof,p){
 const c=requireFcfInventoryExecutionClaim(claimProof)
 if(c.protocol!==plan.preset||c.maximumSourceGETs!==478||c.priorSourceGETs!==37||c.maximumNewSourceGETs!==240||c.plannedCumulativeSourceGETs!==277||c.accountingSha256!==p.accountingSha256||c.runId!==p.runId||c.runAttempt!=='1'||c.sourceCommit!==plan.sourceCommit||c.planSha256!==plan.planSha256||c.rulesetId!==p.rulesetId||!same(claimBinding(c),claimBinding(p))||Date.parse(c.claimedUTC)>Date.parse(p.consumedUTC))fail('matching branded future execution claim required')
 return c
}
function bundle(value,kind){
 exactKeys(value,['zipBytes','artifact','run','jobs','expected'],`${kind} raw transport`)
 exactKeys(value.expected,['runId','runAttempt','sourceCommit','jobId','artifactId','artifactDigest','manifestSha256','name',...(['inventory','diagnostic'].includes(kind)?['planSha256','childPlanSha256']:[])],`${kind} expected pins`)
 return value
}
function executed(b,p){
 if(b.expected.runId!==p.runId||b.expected.runAttempt!=='1'||b.expected.sourceCommit!==p.sourceCommit)fail('borrowed future artifact execution')
}
function summary(record,fields){
 const proof=frozenJSON({kind:'fcf-future-source-child-proof',targetSlug,planSha256:record.plan.planSha256,sourceCommit:record.plan.sourceCommit,runId:record.consumption.runId,runAttempt:'1',claimCommit:record.consumption.claimCommit,priorSourceGETs:37,...fields})
 children.set(proof,record);return proof
}

/** Raw inventory and audit bundles are separately pinned and independently read. */
export function readFcfFutureSourceCompletedChildArtifact(input){
 exactKeys(input,['plan','consumptionProof','inventory','audit',...(Object.hasOwn(input??{},'now')?['now']:[])],'future completed source child')
 const {plan,consumptionProof,now=Date.now()}=input,p=scope(plan,consumptionProof,now),inventory=bundle(input.inventory,'inventory'),audit=bundle(input.audit,'audit')
 executed(inventory,p);executed(audit,p)
 const stagingProof=readFcfFutureSourceStagingArtifact({...inventory,plan,targetSlug,consumptionProof,now})
 const inv=verifyInventoryExecution({...inventory,jobName:'missing-inventory-g9',stepNames:steps,artifactName:`fcf-missing-inventory-${targetSlug}-${p.runId}-1`,runPhase:'inventory-record'})
 const binding=verifyInventoryExecution({...audit,jobName:'missing-inventory-g9',stepNames:steps,artifactName:`fcf-missing-inventory-audit-${targetSlug}-${p.runId}-1`,runPhase:'inventory-record'})
 if(binding.jobId!==inv.jobId||binding.runId!==inv.runId||binding.retentionCommit!==inv.retentionCommit)fail('future inventory and audit job/run/SHA differ')
 const files=readInventoryZip({...audit,members:{'manifest.json':8*1024*1024}}),persisted=jsonBytes(files.get('manifest.json'),'future offline audit')
 if(!validUTC(persisted.auditedUTC)||Date.parse(persisted.auditedUTC)>now||Date.parse(persisted.auditedUTC)<Date.parse(stagingProof.lastCompletedUTC)||!same(persisted,auditFcfFutureSourceOffline({stagingProof,policyHashes:plan.policyHashes,now:Date.parse(persisted.auditedUTC)})))fail('persisted future offline audit cannot be independently reproduced')
 const data=getFcfFutureSourceStagedData({stagingProof,now})
 if(data.targetSlug!==targetSlug||stagingProof.actualSourceGETs!==240||!same(data.binding,inv))fail('complete future source staging binding differs')
 return summary({plan,consumption:p,stagingProof,audit:persisted,auditBinding:binding,inventoryBinding:inv},{status:'audited',newSourceGETs:240,actualSourceGETs:277,firstSourceUTC:stagingProof.firstSourceUTC,lastCompletedUTC:stagingProof.lastCompletedUTC,stopReason:null,inventoryBinding:clone(inv),auditBinding:clone(binding)})
}

/** Failures retain their actual spent count and can never yield target data. */
export function readFcfFutureSourceFailedAuditChildArtifact(input){
 exactKeys(input,['plan','consumptionProof','inventory',...(Object.hasOwn(input??{},'now')?['now']:[])],'future failed offline audit child')
 const {plan,consumptionProof,now=Date.now()}=input,p=scope(plan,consumptionProof,now),inventory=bundle(input.inventory,'inventory')
 executed(inventory,p)
 // Authenticate the complete raw transport without invoking canonical source/GK
 // parsing: that audit failed, so no audit artifact or readiness is inferred.
 const stagingProof=readFcfFutureSourceStagingArtifact({...inventory,plan,targetSlug,consumptionProof,now})
 const binding=verifyInventoryExecution({...inventory,jobName:'missing-inventory-g9',stepNames:steps.slice(0,2),artifactName:`fcf-missing-inventory-${targetSlug}-${p.runId}-1`,runPhase:'inventory-record',jobPhase:'diagnostic'})
 const job=inventory.jobs.find(j=>j.name==='missing-inventory-g9'),auditSteps=job.steps.filter(s=>s.name===steps[2])
 if(auditSteps.length!==1||auditSteps[0].status!=='completed'||auditSteps[0].conclusion!=='failure'||stagingProof.actualSourceGETs!==240||!same(stagingProof.binding,binding))fail('actual failed offline audit after complete240 capture/upload required')
 return summary({plan,consumption:p,inventoryBinding:binding},{status:'failed',newSourceGETs:240,actualSourceGETs:277,firstSourceUTC:stagingProof.firstSourceUTC,lastCompletedUTC:stagingProof.lastCompletedUTC,stopReason:'offline-audit-failed',inventoryBinding:clone(binding),auditBinding:null})
}

/** Failures retain their actual spent count and can never yield target data. */
export function readFcfFutureSourceDiagnosticChildArtifact(input){
 exactKeys(input,['plan','consumptionProof','diagnostic',...(Object.hasOwn(input??{},'now')?['now']:[])],'future diagnostic source child')
 const {plan,consumptionProof,now=Date.now()}=input,p=scope(plan,consumptionProof,now),diagnostic=bundle(input.diagnostic,'diagnostic')
 executed(diagnostic,p)
 const d=readFcfFutureSourceDiagnosticArtifact({...diagnostic,plan,targetSlug,consumptionProof,now})
 if(d.priorSourceGETs!==37||!Number.isSafeInteger(d.newSourceGETs)||d.newSourceGETs<0||d.newSourceGETs>240||d.actualSourceGETs!==37+d.newSourceGETs||d.status!=='failed'||!d.stopReason)fail('future diagnostic actual spend differs')
 return summary({plan,consumption:p,diagnostic:d},{status:'failed',newSourceGETs:d.newSourceGETs,actualSourceGETs:d.actualSourceGETs,firstSourceUTC:d.firstSourceUTC,lastCompletedUTC:d.lastCompletedUTC,stopReason:d.stopReason,inventoryBinding:clone(d.inventoryBinding),auditBinding:null})
}

/** Zero requires the actual matching capture step to be explicitly skipped.
 * A cancelled/unknown capture is never assumed to have spent zero requests. */
export function readFcfFutureSourceUnstartedChild(input){
 exactKeys(input,['plan','consumptionProof','run','jobs','expected',...(Object.hasOwn(input??{},'now')?['now']:[])],'future unstarted source child')
 const {plan,consumptionProof,run,jobs,expected,now=Date.now()}=input,p=scope(plan,consumptionProof,now)
 exactKeys(expected,['runId','runAttempt','sourceCommit','jobId','planSha256'],'unstarted source pins')
 const matching=jobs?.filter(j=>j.name==='missing-inventory-g9'),job=matching?.[0]
 if(expected.runId!==p.runId||expected.runAttempt!=='1'||expected.sourceCommit!==plan.sourceCommit||expected.planSha256!==plan.planSha256||!nativeId(expected.jobId)||run?.repository?.full_name!==repository||run.path!==workflow||run.event!=='workflow_dispatch'||run.head_branch!=='main'||String(run.id)!==p.runId||run.run_attempt!==1||run.head_sha!==plan.sourceCommit||!(run.status==='in_progress'&&run.conclusion===null||run.status==='completed'&&['success','failure','cancelled'].includes(run.conclusion))||matching?.length!==1||String(job.id)!==expected.jobId||String(job.run_id)!==p.runId||job.run_attempt!==1||job.head_sha!==plan.sourceCommit||job.status!=='completed'||!['skipped','failure'].includes(job.conclusion)||!Array.isArray(job.steps))fail('actual unstarted future source execution required')
 const capture=job.steps.filter(s=>s.name===steps[0])
 if(capture.length!==1||capture[0].status!=='completed'||capture[0].conclusion!=='skipped')fail('unknown source attempts cannot be counted as zero')
 return summary({plan,consumption:p,unstarted:{run:clone(run),job:clone(job)}},{status:'not-started',newSourceGETs:0,actualSourceGETs:37,firstSourceUTC:null,lastCompletedUTC:null,stopReason:'source-not-started',inventoryBinding:null,auditBinding:null})
}

/** This JSON is a source receipt, not its own authentication capability. */
export function buildFcfFutureSourceFinalReceipt(input){
 exactKeys(input,['plan','claimProof','consumptionProof','childRecords','execution',...(Object.hasOwn(input??{},'now')?['now']:[])],'future final receipt input')
 const {plan,claimProof,consumptionProof,childRecords,execution,now=Date.now()}=input,p=scope(plan,consumptionProof,now)
 matchingClaim(plan,claimProof,p)
 exactKeys(execution,['repository','workflow','ref','sourceCommit','runId','runAttempt','jobId'],'future final execution')
 if(execution.repository!==repository||execution.workflow!==workflow||execution.ref!=='refs/heads/main'||execution.sourceCommit!==plan.sourceCommit||execution.runId!==p.runId||execution.runAttempt!=='1'||!nativeId(execution.jobId)||!Array.isArray(childRecords)||childRecords.length!==1)fail('exact one-child future final execution required')
 const child=childRecords[0],record=children.get(child)
 if(!record||child.targetSlug!==targetSlug||child.planSha256!==plan.planSha256||child.sourceCommit!==plan.sourceCommit||child.runId!==p.runId||child.runAttempt!=='1'||child.claimCommit!==p.claimCommit||!same(consumptionBinding(record.consumption),consumptionBinding(p))||!Number.isSafeInteger(child.newSourceGETs)||child.newSourceGETs<0||child.newSourceGETs>240||child.actualSourceGETs!==37+child.newSourceGETs)fail('matching reader-issued future child required')
 if(child.lastCompletedUTC!==null&&Date.parse(child.lastCompletedUTC)>now||record.audit&&Date.parse(record.audit.auditedUTC)>now)fail('future child source/audit completion time differs')
 const admissible=child.status==='audited'&&child.newSourceGETs===240&&!!record.stagingProof
 if(admissible)getFcfFutureSourceStagedData({stagingProof:record.stagingProof,now})
 const {kind,...childSummary}=child
 return frozenJSON({schemaVersion:4,kind:'fcf-future-source-final-receipt',protocol:plan.preset,planSha256:plan.planSha256,sourceCommit:plan.sourceCommit,execution:clone(execution),claimBinding:claimBinding(p),consumptionBinding:consumptionBinding(p),completedUTC:new Date(now).toISOString(),priorSourceGETs:37,newSourceGETs:child.newSourceGETs,actualSourceGETs:37+child.newSourceGETs,maximumSourceGETs:478,accountingBinding:clone(plan.accountingBinding),children:[clone(childSummary)],admissible})
}

export function readFcfFutureSourceFinalReceipt(input){
 exactKeys(input,['zipBytes','artifact','run','jobs','expected','plan','claimProof','consumptionProof','childRecords',...(Object.hasOwn(input??{},'now')?['now']:[])],'future final raw receipt')
 const {plan,claimProof,consumptionProof,childRecords,now=Date.now()}=input,p=scope(plan,consumptionProof,now),raw=bundle(Object.fromEntries(['zipBytes','artifact','run','jobs','expected'].map(k=>[k,input[k]])),'final')
 matchingClaim(plan,claimProof,p);executed(raw,p)
 const binding=verifyInventoryExecution({...raw,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:`fcf-missing-inventory-final-${p.runId}-1`,runPhase:'inventory-record'})
 if(raw.run.status!=='completed')fail('terminal actual future final receipt required')
 const files=readInventoryZip({...raw,members:{'manifest.json':8*1024*1024}}),m=jsonBytes(files.get('manifest.json'),'future final source receipt')
 if(!validUTC(m.completedUTC)||Date.parse(m.completedUTC)>now||!same(m,buildFcfFutureSourceFinalReceipt({plan,claimProof,consumptionProof,childRecords,execution:{...m.execution,jobId:binding.jobId},now:Date.parse(m.completedUTC)}))||m.admissible&&raw.run.conclusion!=='success')fail('immutable future final source receipt differs')
 const proof=frozenJSON({kind:'fcf-future-source-final-proof',targetSlug,planSha256:plan.planSha256,runId:p.runId,runAttempt:'1',priorSourceGETs:37,newSourceGETs:m.newSourceGETs,actualSourceGETs:m.actualSourceGETs,admissible:m.admissible,binding:clone(binding)})
 receipts.set(proof,{manifest:m,child:childRecords[0],binding});return proof
}

function terminal(b,p){
 if(b.run.status!=='completed'||b.run.conclusion!=='success'||String(b.run.id)!==p.runId||b.run.run_attempt!==1||b.run.head_sha!==p.sourceCommit)fail('same successful terminal future run required for target source admission')
}
/** Cross-process source admission consumes RAW records and reauthenticates the
 * failed37 history, registered plan, claim, consumption, full source and final.
 * No prior failed source bytes are reused as fresh target documents. */
export function readFcfFutureCapturedTargetEvidence(input){
 exactKeys(input,['history','plan','claim','consumption','child','finalReceipt',...(Object.hasOwn(input??{},'now')?['now']:[])],'future captured target transport')
 const {plan,now=Date.now()}=input,accountingProof=readFcfPostSixAccounting({...input.history,now})
 validateFcfFutureSourcePlan({plan,accountingProof,expectedPlanSha256:plan?.planSha256,now})
 exactKeys(input.claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'future raw execution claim')
 const claimProof=readFcfInventoryExecutionClaim({...input.claim,plan,now}),consumption=bundle(input.consumption,'consumption'),consumptionProof=readFcfInventoryConsumptionArtifact({...consumption,claimProof,now}),p=scope(plan,consumptionProof,now)
 exactKeys(input.child,['inventory','audit'],'future completed target child')
 const inventory=bundle(input.child.inventory,'inventory'),audit=bundle(input.child.audit,'audit'),final=bundle(input.finalReceipt,'final')
 for(const b of [consumption,inventory,audit,final])terminal(b,p)
 const child=readFcfFutureSourceCompletedChildArtifact({plan,consumptionProof,inventory,audit,now}),finalReceipt=readFcfFutureSourceFinalReceipt({...final,plan,claimProof,consumptionProof,childRecords:[child],now})
 if(!finalReceipt.admissible||finalReceipt.newSourceGETs!==240||finalReceipt.actualSourceGETs!==277)fail('complete admissible future G9 source final required')
 const proof=frozenJSON({evidenceKind:'fcf-future-captured-target',targetSlug,sourceCommit:plan.sourceCommit,planSha256:plan.planSha256})
 targets.set(proof,{plan,claimProof,consumptionProof,child,finalReceipt});return proof
}

/** Re-audit at the ACTUAL caller clock. This capability remains source-only;
 * it grants neither legacy admission, native writes nor a launch selection. */
export function getFcfFutureCapturedTargetData(input){
 exactKeys(input,['targetEvidence',...(Object.hasOwn(input??{},'now')?['now']:[])],'future target getter')
 const {targetEvidence,now=Date.now()}=input,state=targets.get(targetEvidence)
 if(!state||targetEvidence.evidenceKind!=='fcf-future-captured-target')fail('reader-issued future target source evidence required')
 const {plan,claimProof,consumptionProof,child,finalReceipt}=state,p=scope(plan,consumptionProof,now),record=children.get(child),receipt=receipts.get(finalReceipt)
 matchingClaim(plan,claimProof,p)
 if(!record?.stagingProof||!receipt||receipt.child!==child||!receipt.manifest.admissible)fail('matching completed future source/final capability required')
 if(Date.parse(receipt.manifest.completedUTC)>now||Date.parse(record.audit.auditedUTC)>now)fail('future final receipt/audit completion is after the getter clock')
 const data=getFcfFutureSourceStagedData({stagingProof:record.stagingProof,now})
 const binding={schemaVersion:1,kind:'fcf-future-source-admission',protocol:plan.preset,targetSlug,sourceCommit:plan.sourceCommit,planSha256:plan.planSha256,childPlanSha256:record.audit.childPlanSha256,sourceClaimState:'consumed',maximumSourceGETs:478,priorSourceGETs:37,newSourceGETs:240,actualSourceGETs:277,accountingBinding:clone(plan.accountingBinding),claimBinding:claimBinding(p),consumptionBinding:consumptionBinding(p),inventoryBinding:clone(data.binding),auditBinding:clone(record.auditBinding),finalReceiptBinding:clone(receipt.binding),policyHashes:clone(plan.policyHashes)}
 binding.sourceFingerprintSha256=hash({binding,documents:data.documents.map(d=>({id:d.id,expectedSourceRound:d.expectedSourceRound,receipt:d.receipt,lineage:d.lineage})),canonicalSha256:hash(data.fixtures),calendarSha256:hash({clubs:data.clubs,verifiedKeeperClubs:data.verifiedKeeperClubs})})
 return frozenJSON({evidenceKind:'fcf-future-captured-target',targetSlug,competition:clone(data.competition),documents:clone(data.documents),fixtures:clone(data.fixtures),clubs:clone(data.clubs),verifiedKeeperClubs:clone(data.verifiedKeeperClubs),binding})
}
