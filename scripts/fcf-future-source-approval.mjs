// Repository GET-only historical transport and strict future root approval.
// Returned approval is reviewed data; no capture, claim or target proof is issued.
import {readFcfSixHistoryWire} from './fcf-six-approval.mjs'
import {readFcfPostSixAccounting,fcfPostSixAccountingReferences} from './fcf-post-six-accounting.mjs'
import {readFcfPostG9Accounting} from './fcf-post-g9-accounting.mjs'
import {validateFcfFutureSourcePlan,FCF_FUTURE_SOURCE_PROTOCOL,FCF_G1_SOURCE_PROTOCOL} from './fcf-future-source-plan.mjs'
import {snapshotFcfInventoryRuleset,verifyFcfInventoryRulesetSnapshot} from './fcf-missing-inventory-claim.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,inventoryFail as fail,jsonBytes,nativeId,commitId,sha256Id,artifactDigest,FCF_INVENTORY_REPOSITORY,FCF_INVENTORY_WORKFLOW} from './fcf-missing-inventory-artifact.mjs'
const repo=`repos/${FCF_INVENTORY_REPOSITORY}/`,same=(a,b)=>hash(a)===hash(b)

// This wrapper also constrains paths emitted by the unchanged prior transport.
// No URL, mutation verb, arbitrary repository or caller-supplied adapter method.
function repositoryGET(github){
 if(typeof github!=='function')fail('explicit repository GET adapter required')
 return (path,binary=false)=>{
  if(typeof path!=='string'||!path.startsWith(repo))fail('fixed repository GET required')
  const p=path.slice(repo.length)
  const allowed=/^actions\/runs\/[1-9]\d{0,19}$/.test(p)||/^actions\/runs\/[1-9]\d{0,19}\/attempts\/[1-9]\d{0,19}\/jobs\?per_page=100&page=[1-9]\d{0,2}$/.test(p)||/^actions\/artifacts\/[1-9]\d{0,19}(?:\/zip)?$/.test(p)||/^git\/(?:commits|trees|blobs)\/[a-f0-9]{40}$/.test(p)||/^git\/ref\/tags\/fcf-inventory-claim\/(?:g9-after-|six-after-|future-g9-after-|future-after-)?[a-f0-9]{64}$/.test(p)||/^rulesets\/[1-9]\d{0,19}$/.test(p)
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
 const g1=a.schemaVersion===5&&a.kind==='fcf-g1-source-continuation-approval'
 if((!g1&&(a.schemaVersion!==4||a.kind!=='fcf-future-source-approval'))||!commitId(sourceCommit)||a.sourceCommit!==sourceCommit||a.plan?.sourceCommit!==sourceCommit||!nativeId(a.rulesetId))fail('exact future source approval required')
 if(a.plan?.preset!==(g1?FCF_G1_SOURCE_PROTOCOL:FCF_FUTURE_SOURCE_PROTOCOL)||a.plan.maximumCumulativeSourceGETs!==478||a.plan.maximumNewSourceGETs!==240||!Number.isSafeInteger(a.plan.priorSourceGETs)||a.plan.priorSourceGETs<37||a.plan.plannedCumulativeSourceGETs!==a.plan.priorSourceGETs+240||a.plan.plannedCumulativeSourceGETs>478)fail('closed future plan exceeds478 source budget; HOLD awaiting budget approval')
 const proof=g1?readFcfPostG9Accounting(await readFcfPostG9HistoryWire({source:a.history,github,now})):readFcfPostSixAccounting(await readFcfPostSixHistoryWire({source:a.history,github,now}))
 const checkedUTC=a.rulesetSnapshot?.checkedUTC,approved=snapshotFcfInventoryRuleset({ruleset:a.rulesetSnapshot?.ruleset,checkedUTC,now})
 if(!same(approved,a.rulesetSnapshot)||String(approved.ruleset.id)!==a.rulesetId||hash(approved)!==a.plan.rulesetSnapshotSha256)fail('future approved root ruleset differs')
 const actual=await repositoryGET(github)(repo+`rulesets/${a.rulesetId}`)
 verifyFcfInventoryRulesetSnapshot({snapshot:approved,actual,now})
 validateFcfFutureSourcePlan({plan:a.plan,accountingProof:proof,expectedPlanSha256:a.plan.planSha256,now})
 return a
}

// Closed reference form of the accounting-only reader. Failed/partial terminal
// attempts are authenticated without pretending they yielded admitted source.
function postG9Preflight(source,now){
 exactKeys(source,['prior','latest'],'post-G9 history references')
 preflight(source.prior,now)
 const g=source.latest,p=g?.plan,{planSha256,...body}=p??{}
 exactKeys(g,['plan','claim','consumption','child','finalReceipt'],'post-G9 terminal references')
 if(p?.preset!==FCF_FUTURE_SOURCE_PROTOCOL||p.schemaVersion!==1||p.kind!=='fcf-future-source-plan'||!sha256Id(planSha256)||hash(body)!==planSha256||p.priorSourceGETs!==37||p.maximumCumulativeSourceGETs!==478||p.maximumNewSourceGETs!==240||p.plannedCumulativeSourceGETs!==277||p.child?.targetSlug!=='es-ct-tercera-g9'||p.child.competitionId!==797||p.child.sourceCode!=='4118349-4118588')fail('exact original G9 plan and spent37 history references required')
 exactKeys(g.claim,['execution','expected'],'post-G9 claim references')
 const e=g.claim.execution,x=g.claim.expected
 exactKeys(e,['repository','workflow','ref','sourceCommit','runId','runAttempt'],'post-G9 execution references')
 exactKeys(x,['claimCommit','claimJsonSha256','rulesetId','planSha256','sourceCommit','runId','runAttempt'],'post-G9 claim pins')
 if(e.repository!==FCF_INVENTORY_REPOSITORY||e.workflow!==FCF_INVENTORY_WORKFLOW||e.ref!=='refs/heads/main'||!commitId(p.sourceCommit)||e.sourceCommit!==p.sourceCommit||!nativeId(e.runId)||e.runAttempt!=='1'||x.sourceCommit!==p.sourceCommit||x.runId!==e.runId||x.runAttempt!=='1'||x.planSha256!==planSha256||!commitId(x.claimCommit)||!sha256Id(x.claimJsonSha256)||!nativeId(x.rulesetId))fail('exact post-G9 protected claim execution pins required')
 const pins=['runId','runAttempt','sourceCommit','jobId','artifactId','artifactDigest','manifestSha256','name'],records=[[g.consumption,'consumption',`fcf-inventory-consumption-${e.runId}-1`],[g.finalReceipt,'final',`fcf-missing-inventory-final-${e.runId}-1`]],c=g.child
 if(Object.hasOwn(c??{},'unstarted')){exactKeys(c,['unstarted'],'post-G9 skipped references');exactKeys(c.unstarted,['runId','runAttempt','sourceCommit','jobId','planSha256'],'post-G9 skipped pins');if(c.unstarted.runId!==e.runId||c.unstarted.runAttempt!=='1'||c.unstarted.sourceCommit!==p.sourceCommit||c.unstarted.planSha256!==planSha256||!nativeId(c.unstarted.jobId))fail('exact skipped source execution pins required')}
 else if(Object.hasOwn(c??{},'diagnostic')){exactKeys(c,['diagnostic'],'post-G9 diagnostic references');records.push([c.diagnostic,'diagnostic',`fcf-missing-inventory-diagnostic-es-ct-tercera-g9-${e.runId}-1`])}
 else {exactKeys(c,Object.hasOwn(c??{},'audit')?['inventory','audit']:['inventory'],'post-G9 capture references');records.push([c.inventory,'inventory',`fcf-missing-inventory-es-ct-tercera-g9-${e.runId}-1`]);if(c.audit)records.push([c.audit,'audit',`fcf-missing-inventory-audit-es-ct-tercera-g9-${e.runId}-1`])}
 for(const [b,kind,name]of records){exactKeys(b,[...pins,...(['inventory','diagnostic'].includes(kind)?['planSha256','childPlanSha256']:[])],'post-G9 artifact pins');if(b.runId!==e.runId||b.runAttempt!=='1'||b.sourceCommit!==p.sourceCommit||!nativeId(b.jobId)||!nativeId(b.artifactId)||!artifactDigest(b.artifactDigest)||!sha256Id(b.manifestSha256)||b.name!==name||['inventory','diagnostic'].includes(kind)&&(b.planSha256!==planSha256||b.childPlanSha256!==hash({...p.child,parentPlanSha256:planSha256})))fail('exact post-G9 artifact/run/hash pins required')}
 if(new Set(records.map(([b])=>b.artifactId)).size!==records.length)fail('distinct post-G9 artifacts required')
 return g
}
export async function readFcfPostG9HistoryWire({source,github,now=Date.now()}){
 const g=postG9Preflight(source,now),transport=repositoryGET(github),get=(p,b=false)=>transport(repo+p,b)
 const prior=await readFcfPostSixHistoryWire({source:source.prior,github:transport,now})
 const old=readFcfPostSixAccounting(prior)
 if(g.plan.historySha256!==hash(old)||hash(g.plan.accountingBinding)!==hash(old))fail('post-G9 original spent history differs')
 const jobs=async expected=>{const out=[];let total;for(let page=1;page<=100;page++){const r=await get(`actions/runs/${expected.runId}/attempts/1/jobs?per_page=100&page=${page}`);if(!Number.isSafeInteger(r?.total_count)||r.total_count<0||!Array.isArray(r.jobs)||r.jobs.length>100||total!==undefined&&r.total_count!==total)fail('stable complete post-G9 job pagination required');total=r.total_count;out.push(...r.jobs);if(new Set(out.map(j=>j?.id)).size!==out.length)fail('duplicate post-G9 job identities');if(out.length===total)return out;if(out.length>total||r.jobs.length<100)fail('incomplete post-G9 jobs')}fail('post-G9 jobs bound exceeded')}
 const record=async expected=>{const [artifact,run,js,zipBytes]=await Promise.all([get(`actions/artifacts/${expected.artifactId}`),get(`actions/runs/${expected.runId}`),jobs(expected),get(`actions/artifacts/${expected.artifactId}/zip`,true)]);return {zipBytes,artifact,run,jobs:js,expected}}
 const x=g.claim.expected,ref=await get(`git/ref/tags/fcf-inventory-claim/future-g9-after-${hash(old)}`)
 if(ref?.object?.type!=='commit'||ref.object.sha!==x.claimCommit)fail('actual protected post-G9 claim ref required')
 const commit=await get(`git/commits/${x.claimCommit}`);if(!commitId(commit?.tree?.sha))fail('actual post-G9 claim tree required')
 const tree=await get(`git/trees/${commit.tree.sha}`),entries=tree?.tree?.filter(e=>e.path==='.fcf-inventory-claim.json')
 if(tree?.truncated!==false||entries?.length!==1||!commitId(entries[0].sha))fail('exact post-G9 claim entry required')
 const blob=await get(`git/blobs/${entries[0].sha}`),rule=await get(`rulesets/${x.rulesetId}`)
 if(blob?.encoding!=='base64'||typeof blob.content!=='string'||blob.content.length>90000)fail('bounded post-G9 claim blob required')
 let child
 if(g.child.unstarted)child={unstarted:{expected:g.child.unstarted,run:await get(`actions/runs/${x.runId}`),jobs:await jobs(g.child.unstarted)}}
 else if(g.child.diagnostic)child={diagnostic:await record(g.child.diagnostic)}
 else child={inventory:await record(g.child.inventory),...(g.child.audit?{audit:await record(g.child.audit)}:{})}
 const wire={prior,latest:{plan:g.plan,claim:{...g.claim,ref,claimCommit:{commit,tree,blob},claimBytes:Buffer.from(blob.content,'base64'),rulesets:[rule]},consumption:await record(g.consumption),child,finalReceipt:await record(g.finalReceipt)},now}
 readFcfPostG9Accounting(wire)
 return wire
}
