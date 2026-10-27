import {fcfSixClaimRef} from './fcf-six-continuation-plan.mjs'
// Read-only one-shot claim and consumption proof. No reserve/reset/dispatch/source API.
import {createHash} from 'node:crypto'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {validateFcfInventorySourcePlan,isFcfG9HeldParentPlan,isFcfIndependentSourcePlan,isFcfSixPlan,isFcfFutureSourcePlan,fcfInventorySeedBinding} from './fcf-inventory-source-protocol.mjs'
import {FCF_INVENTORY_REPOSITORY as repository,FCF_INVENTORY_WORKFLOW as workflow,inventoryFail as fail,exactKeys,frozenJSON,rawSha256,nativeId,commitId,sha256Id,validUTC,jsonBytes,verifyInventoryExecution,readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
import {fcfG9HeldParentClaimRef} from './fcf-g9-held-parent-plan.mjs'
import {FCF_FUTURE_SOURCE_PROTOCOL,fcfFutureSourceClaimRef} from './fcf-future-source-plan.mjs'
const claims=new WeakSet(),consumptions=new WeakSet()
const equal=(a,b)=>hash(a)===hash(b)
const visibleRuleKeys=['id','source','source_type','target','enforcement','conditions','rules','updated_at']
function rulesetUTC(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))fail('actual ruleset updated_at instant required')
 const local=value.slice(0,19),parts=local.match(/\d+/g).map(Number),d=new Date(Date.UTC(parts[0],parts[1]-1,parts[2],parts[3],parts[4],parts[5]));if(d.toISOString().slice(0,19)!==local)fail('invalid ruleset updated_at calendar')
 return new Date(value).toISOString()
}
const visibleRule=r=>Object.fromEntries(visibleRuleKeys.map(k=>[k,k==='updated_at'?rulesetUTC(r[k]):r[k]]))
/** Root-only claim preparation: omitted bypass metadata cannot attest no bypass. */
export function snapshotFcfInventoryRuleset({ruleset:r,checkedUTC,now=Date.now()}){
 if(!r||!Number.isSafeInteger(r.id)||r.id<1||r.source!==repository||r.source_type!=='Repository'||r.target!=='tag'||r.enforcement!=='active'||!Array.isArray(r.bypass_actors)||r.bypass_actors.length||!equal(r.conditions,{ref_name:{include:['refs/tags/fcf-inventory-claim/*'],exclude:[]}})||!Array.isArray(r.rules)||!['update','deletion'].every(type=>r.rules.some(x=>x.type===type))||!validUTC(checkedUTC)||!Number.isFinite(now)||Date.parse(rulesetUTC(r.updated_at))>Date.parse(checkedUTC)||Date.parse(checkedUTC)>now)fail('actual owner-visible no-bypass ruleset and original check clock required')
 return frozenJSON({checkedUTC,ruleset:structuredClone({...visibleRule(r),bypass_actors:[]})})
}
export function readFcfInventoryExecutionClaim({plan,execution,ref,claimCommit,claimBytes,rulesets,expected,now=Date.now()}){
 exactKeys(execution,['repository','workflow','ref','sourceCommit','runId','runAttempt'],'execution')
 if(!expected||!commitId(expected.claimCommit)||!sha256Id(expected.claimJsonSha256)||!nativeId(expected.rulesetId)||expected.runAttempt!=='1'||execution.runAttempt!=='1'||execution.repository!==repository||execution.workflow!==workflow||execution.ref!=='refs/heads/main'||!nativeId(execution.runId)||execution.runId!==expected.runId||execution.sourceCommit!==expected.sourceCommit||plan?.sourceCommit!==execution.sourceCommit)fail('exact reserved execution/attempt1 required')
 validateFcfInventorySourcePlan({plan,expectedPlanSha256:expected.planSha256,now})
 const future=isFcfFutureSourcePlan(plan),six=isFcfSixPlan(plan),maximumSourceGETs=future||six?478:477,claimRef=future?fcfFutureSourceClaimRef(plan):six?fcfSixClaimRef(plan):isFcfG9HeldParentPlan(plan)?fcfG9HeldParentClaimRef(plan):`refs/tags/fcf-inventory-claim/${plan.planSha256}`
 if(ref?.ref!==claimRef||ref.object?.type!=='commit'||ref.object.sha!==expected.claimCommit)fail('missing/moved one-shot claim ref')
 const commit=claimCommit?.commit,tree=claimCommit?.tree,blob=claimCommit?.blob
 if(commit?.sha!==expected.claimCommit||commit.sha===execution.sourceCommit||!Array.isArray(commit.parents)||commit.parents.length!==1||commit.parents[0].sha!==execution.sourceCommit||!commitId(commit.tree?.sha)||tree?.sha!==commit.tree.sha||tree.truncated!==false||!Array.isArray(tree.tree))fail('actual claim commit/source/tree differs')
 const entries=tree.tree.filter(row=>row.path==='.fcf-inventory-claim.json'),entry=entries[0]
 if(entries.length!==1||entry.type!=='blob'||entry.mode!=='100644'||!commitId(entry.sha)||blob?.sha!==entry.sha||blob.encoding!=='base64'||!Buffer.isBuffer(claimBytes)||blob.size!==claimBytes.length||typeof blob.content!=='string'||!Buffer.from(blob.content.replace(/\n/g,''),'base64').equals(claimBytes)||createHash('sha1').update(`blob ${claimBytes.length}\0`).update(claimBytes).digest('hex')!==entry.sha||rawSha256(claimBytes)!==expected.claimJsonSha256)fail('actual claim blob/JSON hash differs')
 const claim=jsonBytes(claimBytes,'execution claim',64*1024),g9=isFcfIndependentSourcePlan(plan)
 exactKeys(claim,['schemaVersion','kind','repository','workflow','planSha256','sourceCommit','runId','runAttempt','preset','maximumSourceGETs','claimedUTC','rulesetSnapshot',...(g9?['accountingSha256','priorSourceGETs','maximumNewSourceGETs','plannedCumulativeSourceGETs']:[])],'claim')
 if(claim.schemaVersion!==(future?5:six?4:g9?3:2)||claim.kind!==(future?'fcf-future-source-execution-claim':six?'fcf-six-execution-claim':g9?'fcf-g9-held-parent-execution-claim':'fcf-missing-inventory-execution-claim')||g9&&(claim.accountingSha256!==hash(plan.accountingBinding)||claim.priorSourceGETs!==plan.priorSourceGETs||claim.maximumNewSourceGETs!==plan.maximumNewSourceGETs||claim.plannedCumulativeSourceGETs!==plan.plannedCumulativeSourceGETs)||claim.repository!==repository||claim.workflow!==workflow||claim.planSha256!==plan.planSha256||claim.sourceCommit!==execution.sourceCommit||claim.runId!==execution.runId||claim.runAttempt!=='1'||claim.preset!==plan.preset||claim.maximumSourceGETs!==maximumSourceGETs||!validUTC(claim.claimedUTC)||Date.parse(claim.claimedUTC)<Date.parse(plan.createdUTC)||Date.parse(claim.claimedUTC)>now)fail('claim plan/execution/time differs')
 if(!Array.isArray(rulesets))fail('actual protected tag ruleset required')
 const matches=rulesets.filter(r=>String(r.id)===expected.rulesetId),rule=matches[0]
 const s=claim.rulesetSnapshot;exactKeys(s,['checkedUTC','ruleset'],'claim ruleset snapshot');exactKeys(s.ruleset,[...visibleRuleKeys,'bypass_actors'],'claim full ruleset')
 const root=snapshotFcfInventoryRuleset({ruleset:s.ruleset,checkedUTC:s.checkedUTC,now})
 if(!equal(s,root)||hash(s)!==plan.rulesetSnapshotSha256||String(root.ruleset.id)!==expected.rulesetId||Date.parse(s.checkedUTC)>Date.parse(claim.claimedUTC)||matches.length!==1||Object.hasOwn(rule,'bypass_actors')&&(!Array.isArray(rule.bypass_actors)||rule.bypass_actors.length)||!equal(visibleRule(rule),visibleRule(root.ruleset)))fail('claim ref differs from root-attested current no-update/no-delete/no-bypass protection')
 const proof=frozenJSON({kind:'fcf-missing-inventory-execution-claim-proof',planSha256:plan.planSha256,sourceCommit:execution.sourceCommit,runId:execution.runId,runAttempt:'1',claimRef,claimCommit:expected.claimCommit,claimJsonSha256:expected.claimJsonSha256,rulesetId:expected.rulesetId,claimedUTC:claim.claimedUTC,maximumSourceGETs,seedBinding:structuredClone(fcfInventorySeedBinding(plan)),...(g9?{protocol:plan.preset,accountingSha256:hash(plan.accountingBinding),priorSourceGETs:plan.priorSourceGETs,maximumNewSourceGETs:plan.maximumNewSourceGETs,plannedCumulativeSourceGETs:plan.plannedCumulativeSourceGETs}:{})})
 claims.add(proof);return proof
}
export function readFcfInventoryConsumptionArtifact({zipBytes,artifact,run,jobs,expected,claimProof,now=Date.now()}){
 if(!claims.has(claimProof)||claimProof.runAttempt!=='1'||expected?.runId!==claimProof.runId||expected.runAttempt!=='1'||expected.sourceCommit!==claimProof.sourceCommit||!Number.isFinite(now))fail('actual reserved claim proof required')
 const binding=verifyInventoryExecution({artifact,run,jobs,expected,jobName:'missing-inventory-consume',stepNames:['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'],artifactName:`fcf-inventory-consumption-${claimProof.runId}-1`,runPhase:'consumption-record'})
 const files=readInventoryZip({zipBytes,artifact,expected,members:{'manifest.json':8*1024*1024}}),manifest=jsonBytes(files.get('manifest.json'),'consumption manifest')
 exactKeys(manifest,['schemaVersion','kind','planSha256','claimRef','claimCommit','claimJsonSha256','seedBinding','sourceCommit','repository','workflow','runId','runAttempt','jobId','consumedUTC'],'consumption manifest')
 const future=claimProof.protocol===FCF_FUTURE_SOURCE_PROTOCOL,six=claimProof.protocol==='six-reviewed-continuation-v1'
 if(manifest.schemaVersion!==(future?4:six?3:claimProof.protocol?2:1)||manifest.kind!==(future?'fcf-future-source-consumed':six?'fcf-six-consumed':claimProof.protocol?'fcf-g9-held-parent-consumed':'fcf-missing-inventory-consumed')||manifest.planSha256!==claimProof.planSha256||manifest.claimRef!==claimProof.claimRef||manifest.claimCommit!==claimProof.claimCommit||manifest.claimJsonSha256!==claimProof.claimJsonSha256||!equal(manifest.seedBinding,claimProof.seedBinding)||manifest.sourceCommit!==claimProof.sourceCommit||manifest.repository!==repository||manifest.workflow!==workflow||manifest.runId!==claimProof.runId||manifest.runAttempt!=='1'||manifest.jobId!==expected.jobId||!validUTC(manifest.consumedUTC)||Date.parse(manifest.consumedUTC)<Date.parse(claimProof.claimedUTC)||Date.parse(manifest.consumedUTC)>now)fail('consumed plan/execution/claim/time differs')
 const proof=frozenJSON({kind:'fcf-missing-inventory-consumption-proof',...binding,planSha256:claimProof.planSha256,sourceCommit:claimProof.sourceCommit,claimRef:claimProof.claimRef,claimCommit:claimProof.claimCommit,claimJsonSha256:claimProof.claimJsonSha256,rulesetId:claimProof.rulesetId,consumedUTC:manifest.consumedUTC,maximumSourceGETs:claimProof.maximumSourceGETs,...(claimProof.protocol?{protocol:claimProof.protocol,accountingSha256:claimProof.accountingSha256,priorSourceGETs:claimProof.priorSourceGETs,maximumNewSourceGETs:claimProof.maximumNewSourceGETs,plannedCumulativeSourceGETs:claimProof.plannedCumulativeSourceGETs}:{})})
 consumptions.add(proof);return proof
}
/** Capability checks for the later collector, never caller-created success flags. */
export function requireFcfInventoryConsumption(proof){if(!consumptions.has(proof))fail('authenticated one-shot consumption required');return proof}

/** Only the reader-issued claim object carries execution authority. */
export function requireFcfInventoryExecutionClaim(proof){if(!claims.has(proof))fail('authenticated execution claim required');return proof}
