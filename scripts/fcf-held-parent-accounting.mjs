// Budget provenance only. No source-admission, transport, claim creation or DB API.
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {readFcfMissingInventoryDiagnosticArtifact,readFcfMissingInventoryNotStartedChild,buildFcfMissingInventoryFinalReceipt} from './fcf-missing-inventory-evidence.mjs'
import {inventoryFail as fail,exactKeys,frozenJSON,jsonBytes,readInventoryZip,verifyInventoryExecution} from './fcf-missing-inventory-artifact.mjs'
const capabilities=new WeakSet(),same=(a,b)=>hash(a)===hash(b)
const parent={runId:'39170648473',runAttempt:'1',sourceCommit:'42879db003006f61feb4a36070e6ea2e584712ad',planSha256:'e0e902944cec4a3fc479b52bc11243bfeb7ab4dcbe115ee831299456b4d2a28c',claimCommit:'9a18df4a844b59bada6a1fc11bebb4c2f70ead0f',claimJsonSha256:'9b77ffdde34f623542ee36b8c3b1b2ce076b3f8217dd59903e7675b26a5befd4',rulesetId:'25355545',completedUTC:'2026-10-18T22:53:54.450Z'}
const records={
 consumption:{jobId:'117802835871',artifactId:'12152467795',artifactDigest:'sha256:b1bd7eed32b1b7c8f63470642b8f328618b53d5ef5f05653f8804348c47ff3c6',manifestSha256:'ff83c4506975686aef79f720cd76a4254bd1df53904546f866f428af4da9f8c7',name:'fcf-inventory-consumption-39170648473-1'},
 diagnostic:{jobId:'117803904735',artifactId:'12153840846',artifactDigest:'sha256:303d15eaffc5eafe32aa7df57ce6a2555e7114565b68f2c1d7a0a440b49c31e3',manifestSha256:'cd066eb438cfc14063adf24866101b4cd24fc13052af8c308cc9058d8d9e5521',name:'fcf-missing-inventory-diagnostic-es-ct-segona-g1-39170648473-1',planSha256:parent.planSha256,childPlanSha256:'fcb4bfcd106667ed9bd8bc3d5a26c75e3201c048c5aca1ac882c897784ac44d5'},
 finalReceipt:{jobId:'117813354769',artifactId:'12153532999',artifactDigest:'sha256:dd4d0a138da9921489dad1fc6ab29bb046cf0ff186214b3b59a3e6813fd0fa2a',manifestSha256:'1ae5d1b21fe9d5d3bc66f1073dbf14fe73bd64c23e955f4c925f77ae1fb0b4d9',name:'fcf-missing-inventory-final-39170648473-1'},
}
function bundle(input,kind){
 exactKeys(input,['zipBytes','artifact','run','jobs','expected'],`${kind} accounting transport`)
 const expected={runId:parent.runId,runAttempt:'1',sourceCommit:parent.sourceCommit,...records[kind]}
 if(!same(input.expected,expected)||input.run?.status!=='completed'||input.run.conclusion!=='failure'||typeof input.artifact?.expired!=='boolean')fail('exact failed parent accounting identity required')
 // Expiration is download availability, not a refund of spent GETs. Only this
 // accounting-only path replays already retained, root-digest-pinned ZIPs. The
 // original metadata is never returned as source evidence or passed to admission.
 return {...input,artifact:{...input.artifact,expired:false}}
}
export function fcfCumulativeSourceGETs(input){
 exactKeys(input,['priorSourceGETs','newSourceGETs'],'cumulative source count')
 const {priorSourceGETs,newSourceGETs}=input
 if(!Number.isSafeInteger(priorSourceGETs)||!Number.isSafeInteger(newSourceGETs)||priorSourceGETs<0||newSourceGETs<0||priorSourceGETs+newSourceGETs>477)fail('cumulative source cap477 exceeded or unknown')
 return priorSourceGETs+newSourceGETs
}
export function requireFcfHeldParentAccounting(proof){if(!capabilities.has(proof))fail('reader-issued held-parent accounting required');return proof}
/** Reauthenticate a fixed historical failure, never grant source or target proof. */
export function readFcfHeldParentAccounting(input){
 exactKeys(input,['plan','claim','consumption','children','finalReceipt',...(Object.hasOwn(input??{},'now')?['now']:[])],'held-parent accounting')
 const {plan,claim,children,now=Date.now()}=input,archivalClock=Date.parse(parent.completedUTC)
 if(!Number.isFinite(now)||now<archivalClock||plan?.planSha256!==parent.planSha256||!Array.isArray(children)||children.length!==2)fail('exact terminal held parent and nonfuture accounting required')
 exactKeys(claim,['execution','ref','claimCommit','claimBytes','rulesets','expected'],'archival claim')
 const {claimCommit,claimJsonSha256,rulesetId,planSha256,sourceCommit,runId,runAttempt}=parent
 if(!same(claim.expected,{claimCommit,claimJsonSha256,rulesetId,planSha256,sourceCommit,runId,runAttempt}))fail('exact held claim required')
 // Historical replay uses the immutable original completion clock solely to
 // authenticate what was spent. All public legacy admission age checks remain.
 const claimProof=readFcfInventoryExecutionClaim({...claim,plan,now:archivalClock})
 const consumed=bundle(input.consumption,'consumption'),consumptionProof=readFcfInventoryConsumptionArtifact({...consumed,claimProof,now:archivalClock})
 for(const c of children)exactKeys(c,['targetSlug','inventory','audit','unstarted'],'accounted child')
 const [g1,g9]=children
 if(g1.targetSlug!=='es-ct-segona-g1'||g1.audit!==null||g1.unstarted!==null||g9.targetSlug!=='es-ct-tercera-g9'||g9.inventory!==null||g9.audit!==null)fail('exact held G1 and unstarted G9 required')
 const diagnostic=bundle(g1.inventory,'diagnostic'),g1Proof=readFcfMissingInventoryDiagnosticArtifact({...diagnostic,plan,targetSlug:g1.targetSlug,consumptionProof,now:archivalClock})
 exactKeys(g9.unstarted,['run','jobs','expected'],'unstarted G9 accounting')
 if(!same(g9.unstarted.expected,{planSha256,jobId:'117813355492'}))fail('exact unstarted G9 job required')
 const g9Proof=readFcfMissingInventoryNotStartedChild({...g9.unstarted,plan,targetSlug:g9.targetSlug,consumptionProof,now:archivalClock})
 const wire=bundle(input.finalReceipt,'finalReceipt'),binding=verifyInventoryExecution({...wire,jobName:'missing-inventory-receipt',stepNames:['Retain final FCF inventory receipt'],artifactName:records.finalReceipt.name,runPhase:'inventory-record'})
 const files=readInventoryZip({...wire,members:{'manifest.json':8*1024*1024}}),manifest=jsonBytes(files.get('manifest.json'),'held parent final receipt')
 const rebuilt=buildFcfMissingInventoryFinalReceipt({plan,claimProof,consumptionProof,childRecords:[g1Proof,g9Proof],execution:{...manifest.execution,jobId:binding.jobId},now:archivalClock})
 if(!same(manifest,rebuilt)||manifest.completedUTC!==parent.completedUTC||manifest.admissible!==false||manifest.actualSourceGETs!==16||g1Proof.actualSourceGETs!==16||g1Proof.status!=='failed'||g9Proof.actualSourceGETs!==0||g9Proof.status!=='not-started')fail('held parent spent accounting differs')
 const proof=frozenJSON({kind:'fcf-held-parent-accounting-only',protocol:'g9-only-after-held-parent-v1',...parent,actualSourceGETs:16,g9ActualSourceGETs:0,admissible:false,maximumCumulativeSourceGETs:477,consumptionBinding:{...records.consumption},diagnosticBinding:{...records.diagnostic},finalReceiptBinding:binding})
 capabilities.add(proof);return proof
}
