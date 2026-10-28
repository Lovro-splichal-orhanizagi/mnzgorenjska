// Accounting only for one terminal future-g9-after-six-v1 attempt. No source,
// retry, claim eligibility, target admission or launch capability is returned.
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {readFcfFutureSourceCompletedChildArtifact,readFcfFutureSourceFailedAuditChildArtifact,readFcfFutureSourceDiagnosticChildArtifact,readFcfFutureSourceUnstartedChild,readFcfFutureSourceFinalReceipt} from './fcf-future-source-admission.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,inventoryFail as fail,frozenJSON,verifyInventoryExecution,readInventoryZip,jsonBytes,validUTC} from './fcf-missing-inventory-artifact.mjs'

const proofs=new WeakSet(),clone=x=>structuredClone(x)
const fields=['zipBytes','artifact','run','jobs','expected']
const binding=p=>Object.fromEntries(['claimRef','claimCommit','claimJsonSha256'].map(k=>[k,p[k]]))

function archivalBundle(value,kind){
 exactKeys(value,fields,`${kind} post-G9 accounting transport`)
 exactKeys(value.expected,['runId','runAttempt','sourceCommit','jobId','artifactId','artifactDigest','manifestSha256','name',...(['inventory','diagnostic'].includes(kind)?['planSha256','childPlanSha256']:[])],`${kind} post-G9 expected pins`)
 if(typeof value.artifact?.expired!=='boolean'||value.run?.status!=='completed'||!['success','failure'].includes(value.run.conclusion))fail('terminal actual post-G9 artifact metadata required')
 // Expiration affects availability, not authenticated spend. Only this private
 // copy is replayed; no archive flag, raw source or private capability escapes.
 return {...value,artifact:{...value.artifact,expired:false}}
}
function sameExecution(raw,final){
 if(raw.run.status!=='completed'||raw.run.conclusion!==final.run.conclusion||String(raw.run.id)!==final.expected.runId||raw.run.run_attempt!==1||raw.run.head_sha!==final.expected.sourceCommit||raw.expected.runId!==final.expected.runId||raw.expected.runAttempt!=='1'||raw.expected.sourceCommit!==final.expected.sourceCommit)fail('one matching terminal post-G9 execution required')
}

/** Closed input: {prior,latest:{plan,claim,consumption,child,finalReceipt},now?}.
 * prior is raw readFcfPostSixAccounting input, never a count or copied proof.
 * child is exactly {inventory,audit}, {inventory}, {diagnostic} or {unstarted}.
 * unstarted is the existing raw {run,jobs,expected} skipped-capture witness.
 * All new artifact/claim pins must come from the actual reviewed terminal run;
 * no fixed future run or actual G9 receipt is assumed by this reader.
 */
export function readFcfPostG9Accounting(input){
 exactKeys(input,['prior','latest',...(Object.hasOwn(input??{},'now')?['now']:[])],'post-G9 accounting')
 const now=Object.hasOwn(input,'now')?input.now:Date.now(),g=input.latest
 if(!Number.isFinite(now)||!Number.isFinite(new Date(now).getTime()))fail('finite actual post-G9 accounting clock required')
 exactKeys(g,['plan','claim','consumption','child','finalReceipt'],'terminal post-G9 raw accounting')
 const final=archivalBundle(g.finalReceipt,'final')
 const finalBinding=verifyInventoryExecution({...final,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:`fcf-missing-inventory-final-${final.expected.runId}-1`,runPhase:'inventory-record'})
 const files=readInventoryZip({...final,members:{'manifest.json':8*1024*1024}}),manifest=jsonBytes(files.get('manifest.json'),'post-G9 accounting final receipt')
 if(!validUTC(manifest.completedUTC)||Date.parse(manifest.completedUTC)>now)fail('original terminal completion at/before actual accounting clock required')
 // The completion stamp is provisional until the unchanged final reader below
 // rebuilds the exact authenticated manifest. It is never a source-use clock.
 const archivalClock=Date.parse(manifest.completedUTC),prior=readFcfPostSixAccounting({...input.prior,now})
 validateFcfFutureSourcePlan({plan:g.plan,accountingProof:prior,expectedPlanSha256:g.plan?.planSha256,now:archivalClock})
 exactKeys(g.claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'terminal post-G9 archival claim')
 const claimProof=readFcfInventoryExecutionClaim({...g.claim,plan:g.plan,now:archivalClock}),consumption=archivalBundle(g.consumption,'consumption')
 sameExecution(consumption,final)
 const consumptionProof=readFcfInventoryConsumptionArtifact({...consumption,claimProof,now:archivalClock}),scope={plan:g.plan,consumptionProof,now:archivalClock},raw=g.child
 let child,unstartedBinding=null
 if(Object.hasOwn(raw??{},'unstarted')){
  exactKeys(raw,['unstarted'],'post-G9 unstarted child')
  exactKeys(raw.unstarted,['run','jobs','expected'],'post-G9 skipped capture witness')
  sameExecution(raw.unstarted,final)
  child=readFcfFutureSourceUnstartedChild({...raw.unstarted,...scope})
  unstartedBinding={...clone(raw.unstarted.expected),witnessSha256:hash(raw.unstarted)}
 }else if(Object.hasOwn(raw??{},'diagnostic')){
  exactKeys(raw,['diagnostic'],'post-G9 diagnostic child')
  const diagnostic=archivalBundle(raw.diagnostic,'diagnostic');sameExecution(diagnostic,final)
  child=readFcfFutureSourceDiagnosticChildArtifact({...scope,diagnostic})
 }else if(Object.hasOwn(raw??{},'audit')){
  exactKeys(raw,['inventory','audit'],'post-G9 completed child')
  const inventory=archivalBundle(raw.inventory,'inventory'),audit=archivalBundle(raw.audit,'audit')
  sameExecution(inventory,final);sameExecution(audit,final)
  child=readFcfFutureSourceCompletedChildArtifact({...scope,inventory,audit})
 }else{
  exactKeys(raw,['inventory'],'post-G9 failed audit child')
  const inventory=archivalBundle(raw.inventory,'inventory');sameExecution(inventory,final)
  child=readFcfFutureSourceFailedAuditChildArtifact({...scope,inventory})
 }
 const finalProof=readFcfFutureSourceFinalReceipt({...final,...scope,claimProof,childRecords:[child]})
 if(finalProof.targetSlug!=='es-ct-tercera-g9'||finalProof.priorSourceGETs!==prior.priorSourceGETs||finalProof.actualSourceGETs!==prior.priorSourceGETs+child.newSourceGETs||finalProof.newSourceGETs!==child.newSourceGETs||hash(finalProof.binding)!==hash(finalBinding))fail('terminal post-G9 authenticated spend/binding differs')
 const {kind,...childSummary}=child
 const proof=frozenJSON({kind:'fcf-post-g9-accounting-only',priorSourceGETs:finalProof.actualSourceGETs,latestSourceGETs:finalProof.newSourceGETs,maximumCumulativeSourceGETs:prior.maximumCumulativeSourceGETs,remainingSourceGETs:prior.maximumCumulativeSourceGETs-finalProof.actualSourceGETs,admissible:false,priorAccountingBinding:clone(prior),latest:{sourceCommit:g.plan.sourceCommit,planSha256:g.plan.planSha256,runId:claimProof.runId,runAttempt:'1',rulesetId:claimProof.rulesetId,completedUTC:manifest.completedUTC,conclusion:final.run.conclusion,claimBinding:binding(claimProof),consumptionBinding:Object.fromEntries(['artifactId','artifactDigest','manifestSha256','runId','runAttempt','jobId','claimRef','claimCommit','claimJsonSha256'].map(k=>[k,consumptionProof[k]])),child:clone(childSummary),unstartedBinding,finalReceiptBinding:clone(finalProof.binding)}})
 proofs.add(proof)
 return proof
}

export function requireFcfPostG9Accounting(proof){
 if(!proofs.has(proof))fail('reader-issued post-G9 accounting required')
 return proof
}
