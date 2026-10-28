import {readFcfPostG1Accounting} from './fcf-post-g1-accounting.mjs'
// Fixed repository GET-only raw closed future-source transport. No source retry/claim/write.
import {readFcfPostSixHistoryWire,readFcfPostG9HistoryWire,readFcfPostG1HistoryWire} from './fcf-future-source-approval.mjs'
import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {readFcfPostG9Accounting} from './fcf-post-g9-accounting.mjs'
import {readFcfPostSixAccounting} from './fcf-post-six-accounting.mjs'
import {validateFcfFutureSourcePlan,fcfFutureSourceClaimRef,FCF_G1_SOURCE_PROTOCOL,FCF_G1_POST_FAILURE_SOURCE_PROTOCOL,isFcfG1FutureSourceProtocol,isFcfFutureSourceProtocol} from './fcf-future-source-plan.mjs'
import {readFcfFutureCapturedTargetEvidence} from './fcf-future-source-admission.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,nativeId,commitId,sha256Id,artifactDigest,FCF_INVENTORY_REPOSITORY as repository,FCF_INVENTORY_WORKFLOW as workflow} from './fcf-missing-inventory-artifact.mjs'
const repo=`repos/${repository}/`,fail=m=>{throw Error(`FCF_FUTURE_SOURCE_WIRE: ${m}`)}
function preflight(source,now){
 exactKeys(source,['protocol','history','plan','claim','consumption','child','finalReceipt'],'future source references')
 if(!isFcfFutureSourceProtocol(source.protocol)||!Number.isSafeInteger(now))fail('fixed future protocol/current clock required')
 const p=source.plan,{planSha256,...body}=p??{},g1=isFcfG1FutureSourceProtocol(source.protocol),target=getFcfFutureTarget({targetSlug:g1?'es-ct-segona-g1':'es-ct-tercera-g9'})
 if(p?.schemaVersion!==1||p.kind!=='fcf-future-source-plan'||p.preset!==source.protocol||!commitId(p.sourceCommit)||!sha256Id(planSha256)||hash(body)!==planSha256||!sha256Id(p.historySha256)||(g1?!Number.isSafeInteger(p.priorSourceGETs)||p.priorSourceGETs<37:p.priorSourceGETs!==37)||p.maximumNewSourceGETs!==240||p.plannedCumulativeSourceGETs!==p.priorSourceGETs+240||p.plannedCumulativeSourceGETs>478||p.maximumCumulativeSourceGETs!==478||p.child?.targetSlug!==target.targetSlug||p.child.competitionId!==target.competitionId||p.child.sourceCode!==target.sourceCode)fail('exact future plan/hash/target/actual+240 scope required')
 exactKeys(source.claim,['execution','expected'],'current claim references');const {execution:e,expected:x}=source.claim
 exactKeys(e,['repository','workflow','ref','sourceCommit','runId','runAttempt'],'current claim execution');exactKeys(x,['claimCommit','claimJsonSha256','rulesetId','planSha256','sourceCommit','runId','runAttempt'],'current claim pins')
 if(e.repository!==repository||e.workflow!==workflow||e.ref!=='refs/heads/main'||e.sourceCommit!==p.sourceCommit||!nativeId(e.runId)||e.runAttempt!=='1'||x.sourceCommit!==p.sourceCommit||x.runId!==e.runId||x.runAttempt!=='1'||x.planSha256!==planSha256||!commitId(x.claimCommit)||!sha256Id(x.claimJsonSha256)||!nativeId(x.rulesetId))fail('exact protected current claim execution/hash pins required')
 exactKeys(source.child,['inventory','audit'],'only selected future child references')
 const childSha=hash({...p.child,parentPlanSha256:planSha256}),pins=['runId','runAttempt','sourceCommit','jobId','artifactId','artifactDigest','manifestSha256','name']
 const records=[[source.consumption,`fcf-inventory-consumption-${e.runId}-1`,false],[source.child.inventory,`fcf-missing-inventory-${target.targetSlug}-${e.runId}-1`,true],[source.child.audit,`fcf-missing-inventory-audit-${target.targetSlug}-${e.runId}-1`,false],[source.finalReceipt,`fcf-missing-inventory-final-${e.runId}-1`,false]]
 for(const [b,name,inventory]of records){exactKeys(b,[...pins,...(inventory?['planSha256','childPlanSha256']:[])],'current artifact pins');if(b.runId!==e.runId||b.runAttempt!=='1'||b.sourceCommit!==p.sourceCommit||!nativeId(b.jobId)||!nativeId(b.artifactId)||!artifactDigest(b.artifactDigest)||!sha256Id(b.manifestSha256)||b.name!==name||inventory&&(b.planSha256!==planSha256||b.childPlanSha256!==childSha))fail('exact current artifact/run/hash/name pins required')}
 if(new Set(records.map(([b])=>b.artifactId)).size!==4)fail('distinct current raw artifacts required')
}
export async function readFcfFutureTargetSourceWire(input){
 exactKeys(input,['source','github',...(Object.hasOwn(input??{},'now')?['now']:[])],'future raw transport input')
 const {source,github}=input,now=Object.hasOwn(input,'now')?input.now:Date.now();preflight(source,now)
 if(typeof github!=='function')fail('explicit repository GET adapter required')
 const jobCache=new Map()
 async function jobs(run,attempt){
  const key=`${run}/${attempt}`
  if(!jobCache.has(key))jobCache.set(key,(async()=>{const out=[];let total;for(let page=1;page<=100;page++){
   const r=await github(repo+`actions/runs/${run}/attempts/${attempt}/jobs?per_page=100&page=${page}`,false)
   if(!Number.isSafeInteger(r?.total_count)||r.total_count<0||!Array.isArray(r.jobs)||r.jobs.length>100||total!==undefined&&r.total_count!==total)fail('actual stable complete jobs pagination required')
   total=r.total_count;out.push(...r.jobs);if(new Set(out.map(j=>j?.id)).size!==out.length||out.some(j=>!Number.isSafeInteger(j?.id)||j.id<1))fail('duplicate/invalid actual job identities')
   if(out.length===total)return out
   if(out.length>total||r.jobs.length<100)fail('incomplete actual jobs pagination')
  }fail('actual jobs pagination bound exceeded')})())
  return jobCache.get(key)
 }
 const get=async(path,binary=false)=>{
  if(typeof path!=='string'||!path.startsWith(repo))fail('fixed repository GET path required');const p=path.slice(repo.length),job=p.match(/^actions\/runs\/([1-9]\d{0,19})\/attempts\/([1-9]\d{0,19})\/jobs\?per_page=100&page=([1-9]\d{0,2})$/)
  const allowed=job||/^actions\/runs\/[1-9]\d{0,19}$/.test(p)||/^actions\/artifacts\/[1-9]\d{0,19}(?:\/zip)?$/.test(p)||/^git\/(?:commits|trees|blobs)\/[a-f0-9]{40}$/.test(p)||/^git\/ref\/tags\/fcf-inventory-claim\/(?:g9-after-|six-after-|future-g9-after-|future-after-|g1-after-failed-)?[a-f0-9]{64}$/.test(p)||/^rulesets\/[1-9]\d{0,19}$/.test(p)
  if(!allowed||binary!==p.endsWith('/zip'))fail('fixed GET path/binary ZIP representation required')
  if(job){const all=await jobs(job[1],job[2]),start=(Number(job[3])-1)*100;return {total_count:all.length,jobs:all.slice(start,start+100)}}
  const r=await github(path,binary);if(binary&&!Buffer.isBuffer(r))fail('actual binary ZIP bytes required');return r
 }
 const g1=isFcfG1FutureSourceProtocol(source.protocol),history=await (source.protocol===FCF_G1_POST_FAILURE_SOURCE_PROTOCOL?readFcfPostG1HistoryWire:g1?readFcfPostG9HistoryWire:readFcfPostSixHistoryWire)({source:source.history,github:get,now}),proof=(source.protocol===FCF_G1_POST_FAILURE_SOURCE_PROTOCOL?readFcfPostG1Accounting:g1?readFcfPostG9Accounting:readFcfPostSixAccounting)(history)
 validateFcfFutureSourcePlan({plan:source.plan,accountingProof:proof,expectedPlanSha256:source.plan.planSha256,now})
 const x=source.claim.expected,ref=await get(repo+'git/ref/'+fcfFutureSourceClaimRef(source.plan).slice(5))
 if(ref?.object?.type!=='commit'||ref.object.sha!==x.claimCommit)fail('missing/moved current protected future claim ref')
 const commit=await get(repo+`git/commits/${x.claimCommit}`);if(!commitId(commit?.tree?.sha))fail('actual current claim tree required')
 const tree=await get(repo+`git/trees/${commit.tree.sha}`),entries=tree?.tree?.filter(e=>e.path==='.fcf-inventory-claim.json')
 if(tree?.truncated!==false||entries?.length!==1||!commitId(entries[0].sha))fail('exact current protected claim entry required')
 const blob=await get(repo+`git/blobs/${entries[0].sha}`),rule=await get(repo+`rulesets/${x.rulesetId}`)
 if(blob?.encoding!=='base64'||typeof blob.content!=='string'||blob.content.length>90000)fail('actual bounded current claim blob required')
 const record=async expected=>{const [artifact,run,js,zipBytes]=await Promise.all([get(repo+`actions/artifacts/${expected.artifactId}`),get(repo+`actions/runs/${expected.runId}`),jobs(expected.runId,expected.runAttempt),get(repo+`actions/artifacts/${expected.artifactId}/zip`,true)]);return {zipBytes,artifact,run,jobs:js,expected}}
 const wire={history,plan:source.plan,claim:{execution:source.claim.execution,expected:x,ref,claimCommit:{commit,tree,blob},claimBytes:Buffer.from(blob.content,'base64'),rulesets:[rule]},consumption:await record(source.consumption),child:{inventory:await record(source.child.inventory),audit:await record(source.child.audit)},finalReceipt:await record(source.finalReceipt),now}
 readFcfFutureCapturedTargetEvidence(wire)
 return wire
}
