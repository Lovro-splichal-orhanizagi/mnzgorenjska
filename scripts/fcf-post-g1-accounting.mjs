// Accounting only for the failed G1 diagnostic22 after authenticated post-G9 history38. No source,
// retry, claim eligibility, target admission or launch capability is returned.
import {readFcfPostG9Accounting,getFcfPostG9SourceHistory} from './fcf-post-g9-accounting.mjs'
import {validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {readFcfFutureSourceCompletedChildArtifact,readFcfFutureSourceFailedAuditChildArtifact,readFcfFutureSourceDiagnosticChildArtifact,readFcfFutureSourceUnstartedChild,readFcfFutureSourceFinalReceipt} from './fcf-future-source-admission.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,inventoryFail as fail,frozenJSON,verifyInventoryExecution,readInventoryZip,jsonBytes,validUTC} from './fcf-missing-inventory-artifact.mjs'

const proofs=new WeakSet(),clone=x=>structuredClone(x)
const fields=['zipBytes','artifact','run','jobs','expected']
const binding=p=>Object.fromEntries(['claimRef','claimCommit','claimJsonSha256'].map(k=>[k,p[k]]))

function archivalBundle(value,kind){
 exactKeys(value,fields,`${kind} post-failed-G1 accounting transport`)
 exactKeys(value.expected,['runId','runAttempt','sourceCommit','jobId','artifactId','artifactDigest','manifestSha256','name',...(['inventory','diagnostic'].includes(kind)?['planSha256','childPlanSha256']:[])],`${kind} post-failed-G1 expected pins`)
 if(typeof value.artifact?.expired!=='boolean'||value.run?.status!=='completed'||!['success','failure'].includes(value.run.conclusion))fail('terminal actual post-failed-G1 artifact metadata required')
 // Expiration affects availability, not authenticated spend. Only this private
 // copy is replayed; no archive flag, raw source or private capability escapes.
 return {...value,artifact:{...value.artifact,expired:false}}
}
function sameExecution(raw,final){
 if(raw.run.status!=='completed'||raw.run.conclusion!==final.run.conclusion||String(raw.run.id)!==final.expected.runId||raw.run.run_attempt!==1||raw.run.head_sha!==final.expected.sourceCommit||raw.expected.runId!==final.expected.runId||raw.expected.runAttempt!=='1'||raw.expected.sourceCommit!==final.expected.sourceCommit)fail('one matching terminal post-failed-G1 execution required')
}

/** Closed input: {prior,latest:{plan,claim,consumption,child,finalReceipt},now?}.
 * prior is raw readFcfPostG9Accounting input, never a count or copied proof.
 * child is exactly {inventory,audit}, {inventory}, {diagnostic} or {unstarted}.
 * unstarted is the existing raw {run,jobs,expected} skipped-capture witness.
 * All new artifact/claim pins must come from the actual reviewed terminal run;
 * no fixed future run or actual G9 receipt is assumed by this reader.
 */
export function readFcfPostG1Accounting(input){
 exactKeys(input,['prior','latest',...(Object.hasOwn(input??{},'now')?['now']:[])],'post-failed-G1 accounting')
 const now=Object.hasOwn(input,'now')?input.now:Date.now(),g=input.latest
 if(!Number.isFinite(now)||!Number.isFinite(new Date(now).getTime()))fail('finite actual post-failed-G1 accounting clock required')
 exactKeys(g,['plan','claim','consumption','child','finalReceipt'],'terminal post-failed-G1 raw accounting')
 const final=archivalBundle(g.finalReceipt,'final')
 const finalBinding=verifyInventoryExecution({...final,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:`fcf-missing-inventory-final-${final.expected.runId}-1`,runPhase:'inventory-record'})
 const files=readInventoryZip({...final,members:{'manifest.json':8*1024*1024}}),manifest=jsonBytes(files.get('manifest.json'),'post-failed-G1 accounting final receipt')
 if(!validUTC(manifest.completedUTC)||Date.parse(manifest.completedUTC)>now)fail('original terminal completion at/before actual accounting clock required')
 // The completion stamp is provisional until the unchanged final reader below
 // rebuilds the exact authenticated manifest. It is never a source-use clock.
 const archivalClock=Date.parse(manifest.completedUTC),prior=readFcfPostG9Accounting({...input.prior,now})
 validateFcfFutureSourcePlan({plan:g.plan,accountingProof:prior,expectedPlanSha256:g.plan?.planSha256,now:archivalClock})
 exactKeys(g.claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'terminal post-failed-G1 archival claim')
 const claimProof=readFcfInventoryExecutionClaim({...g.claim,plan:g.plan,now:archivalClock}),consumption=archivalBundle(g.consumption,'consumption')
 sameExecution(consumption,final)
 const consumptionProof=readFcfInventoryConsumptionArtifact({...consumption,claimProof,now:archivalClock}),scope={plan:g.plan,consumptionProof,now:archivalClock},raw=g.child
 let child,unstartedBinding=null
 if(Object.hasOwn(raw??{},'unstarted')){
  exactKeys(raw,['unstarted'],'post-failed-G1 unstarted child')
  exactKeys(raw.unstarted,['run','jobs','expected'],'post-failed-G1 skipped capture witness')
  sameExecution(raw.unstarted,final)
  child=readFcfFutureSourceUnstartedChild({...raw.unstarted,...scope})
  unstartedBinding={...clone(raw.unstarted.expected),witnessSha256:hash(raw.unstarted)}
 }else if(Object.hasOwn(raw??{},'diagnostic')){
  exactKeys(raw,['diagnostic'],'post-failed-G1 diagnostic child')
  const diagnostic=archivalBundle(raw.diagnostic,'diagnostic');sameExecution(diagnostic,final)
  child=readFcfFutureSourceDiagnosticChildArtifact({...scope,diagnostic})
 }else if(Object.hasOwn(raw??{},'audit')){
  exactKeys(raw,['inventory','audit'],'post-failed-G1 completed child')
  const inventory=archivalBundle(raw.inventory,'inventory'),audit=archivalBundle(raw.audit,'audit')
  sameExecution(inventory,final);sameExecution(audit,final)
  child=readFcfFutureSourceCompletedChildArtifact({...scope,inventory,audit})
 }else{
  exactKeys(raw,['inventory'],'post-failed-G1 failed audit child')
  const inventory=archivalBundle(raw.inventory,'inventory');sameExecution(inventory,final)
  child=readFcfFutureSourceFailedAuditChildArtifact({...scope,inventory})
 }
 const finalProof=readFcfFutureSourceFinalReceipt({...final,...scope,claimProof,childRecords:[child]})
 if(g.plan?.preset!=='future-g1-after-g9-v1'||final.run.conclusion!=='failure'||finalProof.admissible||prior.priorSourceGETs!==38||finalProof.newSourceGETs!==22||finalProof.targetSlug!=='es-ct-segona-g1'||finalProof.priorSourceGETs!==prior.priorSourceGETs||finalProof.actualSourceGETs!==prior.priorSourceGETs+child.newSourceGETs||finalProof.newSourceGETs!==child.newSourceGETs||hash(finalProof.binding)!==hash(finalBinding))fail('terminal post-failed-G1 authenticated spend/binding differs')
 const {kind,...childSummary}=child
 const proof=frozenJSON({kind:'fcf-post-g1-accounting-only',priorSourceGETs:finalProof.actualSourceGETs,latestSourceGETs:finalProof.newSourceGETs,maximumCumulativeSourceGETs:prior.maximumCumulativeSourceGETs,remainingSourceGETs:prior.maximumCumulativeSourceGETs-finalProof.actualSourceGETs,admissible:false,priorAccountingBinding:clone(getFcfPostG9SourceHistory(prior)),latest:{sourceCommit:g.plan.sourceCommit,planSha256:g.plan.planSha256,runId:claimProof.runId,runAttempt:'1',rulesetId:claimProof.rulesetId,completedUTC:manifest.completedUTC,conclusion:final.run.conclusion,claimBinding:binding(claimProof),consumptionBinding:Object.fromEntries(['artifactId','artifactDigest','manifestSha256','runId','runAttempt','jobId','claimRef','claimCommit','claimJsonSha256'].map(k=>[k,consumptionProof[k]])),child:clone(childSummary),unstartedBinding,finalReceiptBinding:clone(finalProof.binding)}})
 proofs.add(proof)
 return proof
}

export function requireFcfPostG1Accounting(proof){
 if(!proofs.has(proof))fail('reader-issued post-failed-G1 accounting required')
 return proof
}

/** Stable source-history DATA derived only from a privately reader-issued ledger.
 * Raw API witnesses remain in the forensic ledger; mutable display/transport
 * metadata must not create a second source claim or invalidate a prepared plan.
 */
export function getFcfPostG1SourceHistory(proof){
 const p=requireFcfPostG1Accounting(proof),l=p.latest,u=l.unstartedBinding
 return frozenJSON({schemaVersion:1,kind:'fcf-post-g1-source-history',priorSourceGETs:p.priorSourceGETs,latestSourceGETs:p.latestSourceGETs,maximumCumulativeSourceGETs:p.maximumCumulativeSourceGETs,remainingSourceGETs:p.remainingSourceGETs,admissible:false,priorAccountingBinding:clone(p.priorAccountingBinding),latest:{sourceCommit:l.sourceCommit,planSha256:l.planSha256,runId:l.runId,runAttempt:l.runAttempt,rulesetId:l.rulesetId,completedUTC:l.completedUTC,conclusion:l.conclusion,claimBinding:clone(l.claimBinding),consumptionBinding:clone(l.consumptionBinding),child:clone(l.child),unstartedBinding:u?Object.fromEntries(['runId','runAttempt','sourceCommit','jobId','planSha256'].map(k=>[k,u[k]])):null,finalReceiptBinding:clone(l.finalReceiptBinding)}})
}

/** This ancestor is read from the privately authenticated full chain, never supplied by a native caller. */
export function getFcfPostG1CleanupIssuer(proof){return requireFcfPostG1Accounting(proof).priorAccountingBinding.latest.sourceCommit}
