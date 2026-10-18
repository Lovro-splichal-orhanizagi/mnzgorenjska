// Synthetic new execution controls over genuine retained accounting; no source readiness.
import {readFileSync} from 'node:fs'
import {deserialize} from 'node:v8'
import {createHash} from 'node:crypto'
import {claimFixture,rulesetSnapshot,consumptionFixture,sha,zip} from './fcf-missing-inventory-test-fixture.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {readFcfHeldParentAccounting} from './fcf-held-parent-accounting.mjs'
import {buildFcfG9HeldParentPlan,fcfG9HeldParentClaimRef} from './fcf-g9-held-parent-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
let syntheticPlanSequence=0
export function newClaimFixture(){
 const now=Date.parse('2026-10-19T09:00:00Z')+(++syntheticPlanSequence),old=readFcfHeldParentAccounting(deserialize(readFileSync(process.env.FCF_HELD_PARENT_WIRE))),plan=buildFcfG9HeldParentPlan({sourceCommit:'a'.repeat(40),accountingProof:old,rulesetSnapshotSha256:hash(rulesetSnapshot),now}),f=claimFixture(plan)
 f.now=now+300000;Object.assign(f.claim,{schemaVersion:3,kind:'fcf-g9-held-parent-execution-claim',claimedUTC:new Date(now+1000).toISOString(),accountingSha256:hash(plan.accountingBinding),priorSourceGETs:16,maximumNewSourceGETs:240,plannedCumulativeSourceGETs:256})
 f.ref.ref=fcfG9HeldParentClaimRef(plan)
 return seal(f)
}
function seal(f){f.claimBytes=Buffer.from(JSON.stringify(f.claim));const s=createHash('sha1').update(`blob ${f.claimBytes.length}\0`).update(f.claimBytes).digest('hex');f.claimCommit.tree.tree[0].sha=s;Object.assign(f.claimCommit.blob,{sha:s,size:f.claimBytes.length,content:f.claimBytes.toString('base64')});f.expected.claimJsonSha256=sha(f.claimBytes);return f}

export function newConsumptionFixture(f){
 const p=readFcfInventoryExecutionClaim(f),c=consumptionFixture(p);Object.assign(c.manifest,{schemaVersion:2,kind:"fcf-g9-held-parent-consumed",consumedUTC:new Date(f.now).toISOString()});c.manifestBytes=Buffer.from(JSON.stringify(c.manifest));c.zipBytes=zip([{name:"manifest.json",body:c.manifestBytes}]);c.artifact.size_in_bytes=c.zipBytes.length;c.artifact.digest=c.expected.artifactDigest="sha256:"+sha(c.zipBytes);c.expected.manifestSha256=sha(c.manifestBytes);c.now=f.now;return c
}

import {mkdtempSync,realpathSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {packetFixture} from './fcf-release-test-fixture.mjs'
let serial=0
import {waitForFcfInventorySourceSlot} from './fcf-inventory-source-coordination.mjs'
export async function captureFixture(t){
 const c=newClaimFixture(),root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-g9-held-capture-')));t.after(()=>rmSync(root,{recursive:true,force:true}))
 // Each synthetic invocation gets a distinct immutable root plan timestamp.
 const plan=c.plan;let time=c.now+(++serial),calls=[];const pauses=[],group=packetFixture(process.env.FCF_HISTORICAL_RETAINED_DIR,{nativePlayers:true}).groups[2]
 const f={plan,root,claimWire:c,consumptionWire:newConsumptionFixture(c),claimProof:readFcfInventoryExecutionClaim(c),targetSlug:'es-ct-tercera-g9',execution:{...c.execution,jobId:'555'},consumptionProof:readFcfInventoryConsumptionArtifact(newConsumptionFixture(c)),clock:()=>time,pause:async ms=>{time+=ms;pauses.push(ms)},request:async(url,init)=>{calls.push({url,init});time+=5;return new Response(group.documents.find(d=>url.endsWith('/'+d.id)).html)},calls,pauses,advance:ms=>time+=ms}
 f.sourceSlotProof=await waitForFcfInventorySourceSlot({execution:{...c.execution,startedUTC:new Date(time).toISOString()},listRuns:async()=>({total_count:0,workflow_runs:[]}),listJobs:async()=>({total_count:0,jobs:[]}),clock:f.clock,pause:f.pause})
 return f
}
export function sourceReferencesFromWire(wire){
 const claim={execution:wire.claim.execution,expected:wire.claim.expected}
 if(wire.protocol)return{protocol:wire.protocol,accounting:sourceReferencesFromWire(wire.accounting),plan:wire.plan,claim,consumption:wire.consumption.expected,child:{targetSlug:wire.child.targetSlug,inventory:wire.child.inventory.expected,audit:wire.child.audit.expected},finalReceipt:wire.finalReceipt.expected}
 return{plan:wire.plan,claim,consumption:wire.consumption.expected,children:wire.children.map(c=>({targetSlug:c.targetSlug,inventory:c.inventory?.expected??null,audit:c.audit?.expected??null,unstarted:c.unstarted?{runId:String(c.unstarted.run.id),runAttempt:String(c.unstarted.run.run_attempt),expected:c.unstarted.expected}:null})),finalReceipt:wire.finalReceipt.expected}
}
export function githubForSourceWire(wire){
 const records=new Map(),repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/'
 function add(w){if(w.protocol)add(w.accounting);const c=w.claim;records.set('git/ref/'+c.ref.ref.slice('refs/'.length),c.ref);records.set(`git/commits/${c.ref.object.sha}`,c.claimCommit.commit);records.set(`git/trees/${c.claimCommit.commit.tree.sha}`,c.claimCommit.tree);records.set(`git/blobs/${c.claimCommit.blob.sha}`,c.claimCommit.blob);for(const r of c.rulesets)records.set(`rulesets/${r.id}`,r)
 const bundles=[w.consumption,w.finalReceipt,...(w.protocol?[w.child.inventory,w.child.audit]:w.children.flatMap(c=>[c.inventory,c.audit])).filter(Boolean)],allJobs=new Map()
 for(const b of bundles)for(const j of b.jobs){const previous=allJobs.get(j.id);if(!previous||previous.steps.length<j.steps.length)allJobs.set(j.id,j)}
 for(const b of bundles){records.set(`actions/artifacts/${b.artifact.id}`,b.artifact);records.set(`actions/artifacts/${b.artifact.id}/zip`,b.zipBytes);records.set(`actions/runs/${b.run.id}`,b.run);records.set(`actions/runs/${b.run.id}/attempts/1/jobs?per_page=100&page=1`,{total_count:allJobs.size,jobs:[...allJobs.values()]})}
 }
 add(wire);return async(path,binary=false)=>{if(!path.startsWith(repo)||!records.has(path.slice(repo.length)))throw Error('Unplanned synthetic GitHub GET '+path);const r=records.get(path.slice(repo.length));if(binary!==Buffer.isBuffer(r))throw Error('Unexpected synthetic byte request');return r}
}
