// Repository GET-only historical transport and strict future root approval.
// Returned approval is reviewed data; no capture, claim or target proof is issued.
import {readFcfSixHistoryWire} from './fcf-six-approval.mjs'
import {readFcfPostSixAccounting,fcfPostSixAccountingReferences} from './fcf-post-six-accounting.mjs'
import {validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
import {snapshotFcfInventoryRuleset,verifyFcfInventoryRulesetSnapshot} from './fcf-missing-inventory-claim.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,inventoryFail as fail,jsonBytes,nativeId,commitId,sha256Id,FCF_INVENTORY_REPOSITORY,FCF_INVENTORY_WORKFLOW} from './fcf-missing-inventory-artifact.mjs'
const repo=`repos/${FCF_INVENTORY_REPOSITORY}/`,same=(a,b)=>hash(a)===hash(b)

// This wrapper also constrains paths emitted by the unchanged prior transport.
// No URL, mutation verb, arbitrary repository or caller-supplied adapter method.
function repositoryGET(github){
 if(typeof github!=='function')fail('explicit repository GET adapter required')
 return (path,binary=false)=>{
  if(typeof path!=='string'||!path.startsWith(repo))fail('fixed repository GET required')
  const p=path.slice(repo.length)
  const allowed=/^actions\/runs\/[1-9]\d{0,19}$/.test(p)||/^actions\/runs\/[1-9]\d{0,19}\/attempts\/[1-9]\d{0,19}\/jobs\?per_page=100&page=[1-9]\d{0,2}$/.test(p)||/^actions\/artifacts\/[1-9]\d{0,19}(?:\/zip)?$/.test(p)||/^git\/(?:commits|trees|blobs)\/[a-f0-9]{40}$/.test(p)||/^git\/ref\/tags\/fcf-inventory-claim\/(?:g9-after-|six-after-)?[a-f0-9]{64}$/.test(p)||/^rulesets\/[1-9]\d{0,19}$/.test(p)
  if(!allowed||binary!==p.endsWith('/zip'))fail('fixed GitHub GET path/representation required')
  return github(path,binary)
 }
}
function preflight(source,now){
 exactKeys(source,['prior','latest'],'post-six history references')
 exactKeys(source.prior,['accounting','g9','seed'],'prior six history references')
 const g=source.latest,pins=fcfPostSixAccountingReferences(),e=pins.claim
 exactKeys(g,['plan','claim','consumption','children','finalReceipt'],'terminal history references')
 exactKeys(g.claim,['execution','expected'],'terminal claim references')
 exactKeys(g.claim.expected,Object.keys(e),'terminal exact claim references')
 const execution={repository:FCF_INVENTORY_REPOSITORY,workflow:FCF_INVENTORY_WORKFLOW,ref:'refs/heads/main',sourceCommit:e.sourceCommit,runId:e.runId,runAttempt:e.runAttempt}
 exactKeys(g.claim.execution,Object.keys(execution),'terminal exact execution references')
 if(!same(g.claim.expected,e)||!same(g.claim.execution,execution)||!Number.isFinite(now)||now<Date.parse('2026-10-19T10:54:44.964Z'))fail('exact terminal claim/execution/current clock required')
 if(!g.plan||g.plan.planSha256!==e.planSha256||g.plan.sourceCommit!==e.sourceCommit||!sha256Id(g.plan.historySha256))fail('exact terminal plan references required')
 const {planSha256,...body}=g.plan
 if(hash(body)!==planSha256)fail('terminal plan hash differs')
 if(!Array.isArray(g.children)||g.children.length!==2)fail('exact ordered terminal diagnostics required')
 for(const [actual,expected]of [[g.consumption,pins.consumption],...g.children.map((c,i)=>[c,pins.children[i]]),[g.finalReceipt,pins.finalReceipt]]){
  exactKeys(actual,Object.keys(expected),'terminal exact artifact references')
  if(!same(actual,expected))fail('exact terminal artifact/hash pins required')
 }
}

/** Closed references {prior,latest:{plan,claim:{execution,expected},consumption,
 * children:[G9expected,G1expected],finalReceipt}}. All raw metadata and bytes are
 * fetched through the injected fixed-repository GET adapter and independently
 * authenticated by the ordinary post-six reader before this function returns.
 * The clock never replaces original source timestamps or refunds failed GETs.
 */
export async function readFcfPostSixHistoryWire({source,github,now=Date.now()}){
 preflight(source,now)
 const transport=repositoryGET(github),get=(p,b=false)=>transport(repo+p,b),g=source.latest
 const jobs=async e=>{
  const out=[];let total
  for(let page=1;page<=100;page++){
   const r=await get(`actions/runs/${e.runId}/attempts/${e.runAttempt}/jobs?per_page=100&page=${page}`)
   if(!Number.isSafeInteger(r?.total_count)||r.total_count<0||!Array.isArray(r.jobs)||r.jobs.length>100||total!==undefined&&r.total_count!==total)fail('actual complete job pagination required')
   total=r.total_count;out.push(...r.jobs)
   if(out.length===total){if(new Set(out.map(j=>j.id)).size!==out.length)fail('duplicate paginated jobs');return out}
   if(out.length>total||r.jobs.length<100)fail('incomplete actual jobs')
  }
  fail('actual jobs pagination bound exceeded')
 }
 const record=async expected=>{
  const [artifact,run,js,zipBytes]=await Promise.all([get(`actions/artifacts/${expected.artifactId}`),get(`actions/runs/${expected.runId}`),jobs(expected),get(`actions/artifacts/${expected.artifactId}/zip`,true)])
  return {artifact,run,jobs:js,zipBytes,expected}
 }
 const ref=await get(`git/ref/tags/fcf-inventory-claim/six-after-${g.plan.historySha256}`)
 if(ref?.object?.type!=='commit'||ref.object.sha!==g.claim.expected.claimCommit)fail('exact terminal protected claim ref required')
 const commit=await get(`git/commits/${ref.object.sha}`)
 if(!commitId(commit?.tree?.sha))fail('actual terminal claim tree required')
 const tree=await get(`git/trees/${commit.tree.sha}`),entries=tree?.tree?.filter(e=>e.path==='.fcf-inventory-claim.json')
 if(entries?.length!==1||!commitId(entries[0].sha))fail('exact terminal consumed claim entry required')
 const blob=await get(`git/blobs/${entries[0].sha}`),rule=await get(`rulesets/${g.claim.expected.rulesetId}`)
 if(blob?.encoding!=='base64'||typeof blob.content!=='string')fail('actual terminal claim blob required')
 const wire={prior:await readFcfSixHistoryWire({source:source.prior,github:transport,now}),latest:{plan:g.plan,claim:{...g.claim,ref,claimCommit:{commit,tree,blob},claimBytes:Buffer.from(blob.content,'base64'),rulesets:[rule]},consumption:await record(g.consumption),children:[await record(g.children[0]),await record(g.children[1])],finalReceipt:await record(g.finalReceipt)},now}
 readFcfPostSixAccounting(wire)
 return wire
}

/** Schema4 root data approval. The serialized plan is registered only after
 * replaying all actual37 history and matching current visible ruleset metadata
 * against the full owner-approved snapshot, using its original check timestamp.
 * Omitted current bypass metadata remains unknown, never a new attestation.
 */
export async function readFcfFutureSourceApproval({bytes,sourceCommit,github,now=Date.now()}){
 const a=jsonBytes(bytes,'future source approval')
 exactKeys(a,['schemaVersion','kind','sourceCommit','plan','history','rulesetId','rulesetSnapshot'],'future source approval')
 if(a.schemaVersion!==4||a.kind!=='fcf-future-source-approval'||!commitId(sourceCommit)||a.sourceCommit!==sourceCommit||a.plan?.sourceCommit!==sourceCommit||!nativeId(a.rulesetId))fail('exact future source approval required')
 const proof=readFcfPostSixAccounting(await readFcfPostSixHistoryWire({source:a.history,github,now}))
 const checkedUTC=a.rulesetSnapshot?.checkedUTC,approved=snapshotFcfInventoryRuleset({ruleset:a.rulesetSnapshot?.ruleset,checkedUTC,now})
 if(!same(approved,a.rulesetSnapshot)||String(approved.ruleset.id)!==a.rulesetId||hash(approved)!==a.plan.rulesetSnapshotSha256)fail('future approved root ruleset differs')
 const actual=await repositoryGET(github)(repo+`rulesets/${a.rulesetId}`)
 verifyFcfInventoryRulesetSnapshot({snapshot:approved,actual,now})
 validateFcfFutureSourcePlan({plan:a.plan,accountingProof:proof,expectedPlanSha256:a.plan.planSha256,now})
 return a
}
