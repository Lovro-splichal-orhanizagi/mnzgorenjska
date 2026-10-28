// Fixed historical spend only. No source admission, claim eligibility, capture,
// readiness or activation capability is issued by this module.
import {readFcfSixAccounting} from './fcf-six-accounting.mjs'
import {validateFcfSixContinuationPlan} from './fcf-six-continuation-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {readFcfMissingInventoryDiagnosticArtifact,readFcfSixSourceContinuation,buildFcfMissingInventoryFinalReceipt} from './fcf-missing-inventory-evidence.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,inventoryFail as fail,frozenJSON,verifyInventoryExecution,readInventoryZip,jsonBytes} from './fcf-missing-inventory-artifact.mjs'

const proofs=new WeakMap(),same=(a,b)=>hash(a)===hash(b)
const terminal={runId:'39238757730',runAttempt:'1',sourceCommit:'e010bfc63eeb561116ff33293e6aabafb77d7168',planSha256:'0554c8777b9ebaf5d3a4159a3748b7db4e442e6ad064bb01dcb7cc04d0fd82b6',claimCommit:'ba9fbf21405296f9f73552618b76d7b7fbe86c96',claimJsonSha256:'9b386eec86fabfcad0ca83984baeaacf5abd3276c3622b96ead02aca8441245d',rulesetId:'25355545'}
const completedUTC='2026-10-19T10:54:44.964Z',archivalClock=Date.parse(completedUTC)
const records={
 consumption:{artifactId:'12179959409',jobId:'118014326185',artifactDigest:'sha256:73ed80ab7c01119484ff4239d7bd5aa4926180f5bb7e8892acbb6a3a3f6173b4',manifestSha256:'4196620e54a0f275f3d1ccbf3ce686c76a8913a9d21a13d4e1f3c28890cb9e1f',name:'fcf-inventory-consumption-39238757730-1'},
 g9:{artifactId:'12180422913',jobId:'118016079028',artifactDigest:'sha256:b64dc03b81efb30917639c2256db62e1a2f6eab6e00c442996a5575172e48a5b',manifestSha256:'40e347c1b396c7406655535383b107758d0fd2146f7bed17207ba866d2d22ffa',name:'fcf-missing-inventory-diagnostic-es-ct-tercera-g9-39238757730-1',planSha256:terminal.planSha256,childPlanSha256:'837caed4dc35a48bd0551682fcb9eea102dd847ddb146e8e5958690814ac7810'},
 g1:{artifactId:'12181255579',jobId:'118016893375',artifactDigest:'sha256:5a7c28a6af52f299df3eac0d22d7db82032aa574df4d8fd72852f026ad32d58d',manifestSha256:'048040cd58eacf6cd938c4aff14445b95a402cec57352127cd038d4b6e194fb3',name:'fcf-missing-inventory-diagnostic-es-ct-segona-g1-39238757730-1',planSha256:terminal.planSha256,childPlanSha256:'662dec4e9b4277a00e8147fc836d94460cfc7d8af3118d15bdbd7e0f508f8951'},
 finalReceipt:{artifactId:'12180274909',jobId:'118017966735',artifactDigest:'sha256:d1e1d0a16a250b599779f9c44f3a6f5da8a55807060921743597288a0c6e4126',manifestSha256:'38039bacfb2c8d509ac4852150b72534842f837f18c1792a0acbf32925364b68',name:'fcf-missing-inventory-final-39238757730-1'},
}

// Data pins only: exporting these does not register accounting or source proof.
export function fcfPostSixAccountingReferences(){
 const record=kind=>({runId:terminal.runId,runAttempt:terminal.runAttempt,sourceCommit:terminal.sourceCommit,...records[kind]})
 return frozenJSON({claim:{...terminal},consumption:record('consumption'),children:[record('g9'),record('g1')],finalReceipt:record('finalReceipt')})
}

function archivalBundle(input,kind){
 exactKeys(input,['zipBytes','artifact','run','jobs','expected'],`${kind} post-six accounting transport`)
 const expected={runId:terminal.runId,runAttempt:terminal.runAttempt,sourceCommit:terminal.sourceCommit,...records[kind]}
 exactKeys(input.expected,Object.keys(expected),`${kind} exact accounting pins`)
 if(!same(input.expected,expected)||input.run?.status!=='completed'||input.run.conclusion!=='failure'||typeof input.artifact?.expired!=='boolean')fail('exact terminal six accounting identity required')
 // Retention expiry only affects download availability. These exact pinned raw
 // ZIPs still prove spend; this private copy is never returned for source use.
 return {...input,artifact:{...input.artifact,expired:false}}
}

/**
 * Closed input: {prior, latest:{plan,claim,consumption,children,finalReceipt},now?}.
 * `prior` is the raw readFcfSixAccounting input, never an asserted count/proof.
 * `claim` has execution/ref/claimCommit/claimBytes/rulesets/expected fields.
 * Each artifact is {zipBytes:Buffer,artifact,run,jobs,expected}; children are the
 * exact ordered [G9 diagnostic, G1 diagnostic] bundles, with no wrapper flags.
 * `now` is a finite clock at/after terminal completion (default Date.now()).
 * Historical replay is private: source freshness checks remain intact.
 */
export function readFcfPostSixAccounting(input){
 exactKeys(input,['prior','latest',...(Object.hasOwn(input??{},'now')?['now']:[])],'post-six accounting')
 const now=Object.hasOwn(input,'now')?input.now:Date.now(),g=input.latest
 if(!Number.isFinite(now)||now<archivalClock)fail('nonfuture terminal post-six accounting clock required')
 exactKeys(g,['plan','claim','consumption','children','finalReceipt'],'terminal six raw accounting')
 if(!Array.isArray(g.children)||g.children.length!==2)fail('exact ordered terminal six diagnostics required')
 const prior=readFcfSixAccounting({...input.prior,now})
 validateFcfSixContinuationPlan({plan:g.plan,accountingProof:prior,expectedPlanSha256:terminal.planSha256,now:archivalClock})
 exactKeys(g.claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'terminal six archival claim')
 exactKeys(g.claim.expected,Object.keys(terminal),'terminal six exact claim pins')
 if(!same(g.claim.expected,terminal))fail('exact terminal six protected claim pins required')
 const claimProof=readFcfInventoryExecutionClaim({...g.claim,plan:g.plan,now:archivalClock})
 const consumption=archivalBundle(g.consumption,'consumption')
 const consumptionProof=readFcfInventoryConsumptionArtifact({...consumption,claimProof,now:archivalClock})
 const g9={...archivalBundle(g.children[0],'g9'),plan:g.plan,targetSlug:'es-ct-tercera-g9',consumptionProof,now:archivalClock}
 const g9Proof=readFcfMissingInventoryDiagnosticArtifact(g9)
 // The legacy reader requires authenticated sibling pacing/count evidence for
 // G1. Keep that historical capability private; it cannot authorize a new GET.
 const continuationProof=readFcfSixSourceContinuation(g9)
 const g1Proof=readFcfMissingInventoryDiagnosticArtifact({...archivalBundle(g.children[1],'g1'),plan:g.plan,targetSlug:'es-ct-segona-g1',consumptionProof,continuationProof,now:archivalClock})
 const wire=archivalBundle(g.finalReceipt,'finalReceipt')
 const binding=verifyInventoryExecution({...wire,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:records.finalReceipt.name,runPhase:'inventory-record'})
 const files=readInventoryZip({...wire,members:{'manifest.json':8*1024*1024}}),manifest=jsonBytes(files.get('manifest.json'),'terminal six accounting final receipt')
 // The source-admission final reader intentionally refuses failed receipts.
 // Rebuild the immutable failed receipt from authenticated children instead,
 // exactly as earlier accounting readers do, without bypassing that refusal.
 const rebuilt=buildFcfMissingInventoryFinalReceipt({plan:g.plan,claimProof,consumptionProof,childRecords:[g9Proof,g1Proof],execution:{...manifest.execution,jobId:binding.jobId},now:archivalClock})
 if(!same(manifest,rebuilt)||manifest.completedUTC!==completedUTC||manifest.admissible!==false||manifest.priorSourceGETs!==prior.priorSourceGETs||manifest.actualSourceGETs!==37||manifest.newSourceGETs!==15||g9Proof.actualSourceGETs!==10||g1Proof.actualSourceGETs!==5)fail('terminal six cumulative spent accounting differs')
 const proof=frozenJSON({kind:'fcf-post-six-accounting-only',priorSourceGETs:37,latestSourceGETs:15,maximumCumulativeSourceGETs:478,remainingSourceGETs:441,admissible:false,priorAccountingSha256:hash(prior),latest:{...terminal,completedUTC,consumptionBinding:structuredClone(records.consumption),children:[g9Proof,g1Proof].map(p=>({targetSlug:p.targetSlug,actualSourceGETs:p.actualSourceGETs,inventoryBinding:structuredClone(p.inventoryBinding)})),finalReceiptBinding:binding}})
 proofs.set(proof,true)
 return proof
}

export function requireFcfPostSixAccounting(proof){
 if(!proofs.has(proof))fail('reader-issued post-six accounting required')
 return proof
}
