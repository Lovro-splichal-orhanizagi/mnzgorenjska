// Read-only one-shot claim and consumption proof. No reserve/reset/dispatch/source API.
import {createHash} from 'node:crypto'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {validateFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
import {FCF_INVENTORY_REPOSITORY as repository,FCF_INVENTORY_WORKFLOW as workflow,inventoryFail as fail,exactKeys,frozenJSON,rawSha256,nativeId,commitId,sha256Id,validUTC,jsonBytes,verifyInventoryExecution,readInventoryZip} from './fcf-missing-inventory-artifact.mjs'
const claims=new WeakSet(),consumptions=new WeakSet()
const equal=(a,b)=>hash(a)===hash(b)
export function readFcfInventoryExecutionClaim({plan,execution,ref,claimCommit,claimBytes,rulesets,expected,now=Date.now()}){
 exactKeys(execution,['repository','workflow','ref','sourceCommit','runId','runAttempt'],'execution')
 if(!expected||!commitId(expected.claimCommit)||!sha256Id(expected.claimJsonSha256)||!nativeId(expected.rulesetId)||expected.runAttempt!=='1'||execution.runAttempt!=='1'||execution.repository!==repository||execution.workflow!==workflow||execution.ref!=='refs/heads/main'||!nativeId(execution.runId)||execution.runId!==expected.runId||execution.sourceCommit!==expected.sourceCommit||plan?.sourceCommit!==execution.sourceCommit)fail('exact reserved execution/attempt1 required')
 validateFcfMissingInventoryPlan({plan,expectedPlanSha256:expected.planSha256,now})
 const claimRef=`refs/tags/fcf-inventory-claim/${plan.planSha256}`
 if(ref?.ref!==claimRef||ref.object?.type!=='commit'||ref.object.sha!==expected.claimCommit)fail('missing/moved one-shot claim ref')
 const commit=claimCommit?.commit,tree=claimCommit?.tree,blob=claimCommit?.blob
 if(commit?.sha!==expected.claimCommit||commit.sha===execution.sourceCommit||!Array.isArray(commit.parents)||commit.parents.length!==1||commit.parents[0].sha!==execution.sourceCommit||!commitId(commit.tree?.sha)||tree?.sha!==commit.tree.sha||tree.truncated!==false||!Array.isArray(tree.tree))fail('actual claim commit/source/tree differs')
 const entries=tree.tree.filter(row=>row.path==='.fcf-inventory-claim.json'),entry=entries[0]
 if(entries.length!==1||entry.type!=='blob'||entry.mode!=='100644'||!commitId(entry.sha)||blob?.sha!==entry.sha||blob.encoding!=='base64'||!Buffer.isBuffer(claimBytes)||blob.size!==claimBytes.length||typeof blob.content!=='string'||!Buffer.from(blob.content.replace(/\n/g,''),'base64').equals(claimBytes)||createHash('sha1').update(`blob ${claimBytes.length}\0`).update(claimBytes).digest('hex')!==entry.sha||rawSha256(claimBytes)!==expected.claimJsonSha256)fail('actual claim blob/JSON hash differs')
 const claim=jsonBytes(claimBytes,'execution claim',64*1024)
 exactKeys(claim,['schemaVersion','kind','repository','workflow','planSha256','sourceCommit','runId','runAttempt','preset','maximumSourceGETs','claimedUTC'],'claim')
 if(claim.schemaVersion!==1||claim.kind!=='fcf-missing-inventory-execution-claim'||claim.repository!==repository||claim.workflow!==workflow||claim.planSha256!==plan.planSha256||claim.sourceCommit!==execution.sourceCommit||claim.runId!==execution.runId||claim.runAttempt!=='1'||claim.preset!==plan.preset||claim.maximumSourceGETs!==477||!validUTC(claim.claimedUTC)||Date.parse(claim.claimedUTC)<Date.parse(plan.createdUTC)||Date.parse(claim.claimedUTC)>now)fail('claim plan/execution/time differs')
 if(!Array.isArray(rulesets))fail('actual protected tag ruleset required')
 const matches=rulesets.filter(r=>String(r.id)===expected.rulesetId),rule=matches[0]
 if(matches.length!==1||rule.target!=='tag'||rule.enforcement!=='active'||!Array.isArray(rule.bypass_actors)||rule.bypass_actors.length||!equal(rule.conditions?.ref_name,{include:['refs/tags/fcf-inventory-claim/*'],exclude:[]})||!Array.isArray(rule.rules)||!['update','deletion'].every(type=>rule.rules.some(r=>r.type===type)))fail('claim ref lacks no-update/no-delete/no-bypass protection')
 const proof=frozenJSON({kind:'fcf-missing-inventory-execution-claim-proof',planSha256:plan.planSha256,sourceCommit:execution.sourceCommit,runId:execution.runId,runAttempt:'1',claimRef,claimCommit:expected.claimCommit,claimJsonSha256:expected.claimJsonSha256,rulesetId:expected.rulesetId,claimedUTC:claim.claimedUTC,maximumSourceGETs:477,seedBinding:structuredClone(plan.seedBinding)})
 claims.add(proof);return proof
}
export function readFcfInventoryConsumptionArtifact({zipBytes,artifact,run,jobs,expected,claimProof,now=Date.now()}){
 if(!claims.has(claimProof)||claimProof.runAttempt!=='1'||expected?.runId!==claimProof.runId||expected.runAttempt!=='1'||expected.sourceCommit!==claimProof.sourceCommit||!Number.isFinite(now))fail('actual reserved claim proof required')
 const binding=verifyInventoryExecution({artifact,run,jobs,expected,jobName:'missing-inventory-consume',stepNames:['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'],artifactName:`fcf-inventory-consumption-${claimProof.runId}-1`,runPhase:'consumption-record'})
 const files=readInventoryZip({zipBytes,artifact,expected,members:{'manifest.json':8*1024*1024}}),manifest=jsonBytes(files.get('manifest.json'),'consumption manifest')
 exactKeys(manifest,['schemaVersion','kind','planSha256','claimRef','claimCommit','claimJsonSha256','seedBinding','sourceCommit','repository','workflow','runId','runAttempt','jobId','consumedUTC'],'consumption manifest')
 if(manifest.schemaVersion!==1||manifest.kind!=='fcf-missing-inventory-consumed'||manifest.planSha256!==claimProof.planSha256||manifest.claimRef!==claimProof.claimRef||manifest.claimCommit!==claimProof.claimCommit||manifest.claimJsonSha256!==claimProof.claimJsonSha256||!equal(manifest.seedBinding,claimProof.seedBinding)||manifest.sourceCommit!==claimProof.sourceCommit||manifest.repository!==repository||manifest.workflow!==workflow||manifest.runId!==claimProof.runId||manifest.runAttempt!=='1'||manifest.jobId!==expected.jobId||!validUTC(manifest.consumedUTC)||Date.parse(manifest.consumedUTC)<Date.parse(claimProof.claimedUTC)||Date.parse(manifest.consumedUTC)>now)fail('consumed plan/execution/claim/time differs')
 const proof=frozenJSON({kind:'fcf-missing-inventory-consumption-proof',...binding,planSha256:claimProof.planSha256,sourceCommit:claimProof.sourceCommit,claimRef:claimProof.claimRef,claimCommit:claimProof.claimCommit,claimJsonSha256:claimProof.claimJsonSha256,rulesetId:claimProof.rulesetId,consumedUTC:manifest.consumedUTC,maximumSourceGETs:477})
 consumptions.add(proof);return proof
}
/** Capability checks for the later collector, never caller-created success flags. */
export function requireFcfInventoryConsumption(proof){if(!consumptions.has(proof))fail('authenticated one-shot consumption required');return proof}
