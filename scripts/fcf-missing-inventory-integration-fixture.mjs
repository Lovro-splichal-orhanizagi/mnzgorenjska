// Synthetic Actions/native-transport controls with optional genuine marker originals.
import {mkdtempSync,realpathSync,readFileSync,readdirSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {packetFixture} from './fcf-release-test-fixture.mjs'
import {rulesetSnapshot,rulesetSnapshotSha256,seedFixture,claimFixture,consumptionFixture,execution,metadata,now,zip,sha} from './fcf-missing-inventory-test-fixture.mjs'
import {readFcfMissingInventorySeed,buildFcfMissingInventoryPlan,fcfMissingInventoryPolicyHashes,validateFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
import {readFcfInventoryExecutionClaim,readFcfInventoryConsumptionArtifact} from './fcf-missing-inventory-claim.mjs'
import {collectFcfMissingInventoryChild} from './fcf-missing-inventory-capture.mjs'
let shared,cached,n=1000
export const retained=process.env.FCF_HISTORICAL_RETAINED_DIR
function copy(f){return{...f,artifact:structuredClone(f.artifact),run:structuredClone(f.run),jobs:structuredClone(f.jobs),expected:structuredClone(f.expected),entries:f.entries.map(e=>({...e,body:Buffer.from(e.body)})),manifest:structuredClone(f.manifest),zipBytes:Buffer.from(f.zipBytes)}}
export async function inventoryFixture(t,{targetSlug='es-ct-segona-g1',previous,source,fresh=false,nativePlayers=false}={}){
 if(cached&&!fresh&&!source&&!nativePlayers&&targetSlug==='es-ct-segona-g1')return copy(cached)
 if(!shared)shared={seed:readFcfMissingInventorySeed(seedFixture(retained)),groups:packetFixture(retained).groups}
 const plan=previous?.plan??buildFcfMissingInventoryPlan({rulesetSnapshotSha256,sourceCommit:execution().sourceCommit,seedEvidence:shared.seed,policyHashes:fcfMissingInventoryPolicyHashes(),now:now-3600000+(++n)}),claimProof=previous?.claimProof??readFcfInventoryExecutionClaim(claimFixture(plan)),consumptionProof=previous?.consumptionProof??readFcfInventoryConsumptionArtifact(consumptionFixture(claimProof)),root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-inventory-integration-')))
 t.after(()=>rmSync(root,{recursive:true,force:true}));let time=previous?.now??now,calls=0
 const group=(nativePlayers?packetFixture(retained,{nativePlayers:true}).groups:shared.groups).find(g=>g.competition.slug===targetSlug),exec={...execution(),jobId:targetSlug.endsWith('-g1')?'555':'556'},input={plan,targetSlug,seedEvidence:shared.seed,execution:exec,consumptionProof,batchState:previous?.continuation,root,clock:()=>time,pause:async ms=>{time+=ms},request:async(url,init)=>{calls++;time+=5;return source?source(url,init):new Response(group.documents.find(d=>url.endsWith('/'+d.id)).html)}}
 const result=await collectFcfMissingInventoryChild(input),entries=readdirSync(result.outputDirectory).map(name=>({name,body:readFileSync(join(result.outputDirectory,name))})),manifest=JSON.parse(entries.find(e=>e.name==='manifest.json').body),bytes=zip(entries),m=metadata({bytes,name:`fcf-missing-inventory-${targetSlug}-123-1`,jobName:`missing-inventory-${targetSlug.endsWith('-g1')?'g1':'g9'}`,steps:['Capture missing target inventory','Retain complete target inventory'],run:'in_progress',jobId:exec.jobId,artifactId:targetSlug.endsWith('-g1')?'888':'898'})
 m.jobs[0].status='in_progress';m.jobs[0].conclusion=null
 Object.assign(m.expected,{manifestSha256:sha(entries.find(e=>e.name==='manifest.json').body),planSha256:plan.planSha256,childPlanSha256:validateFcfMissingInventoryPlan({plan,expectedPlanSha256:plan.planSha256,now:time})[targetSlug.endsWith('-g1')?0:1].childPlanSha256})
 const fixture={...m,targetSlug,root,result,entries,manifest,plan,claimProof,consumptionProof,continuationProof:previous?.continuation,calls,now:time+1000}
 if(!fresh&&!source&&!nativePlayers&&targetSlug==='es-ct-segona-g1')cached=fixture
 return copy(fixture)
}
export function artifactMetadata(f){return{artifact:f.artifact,run:f.run,jobs:f.jobs,expected:f.expected}}
export function rewriteInventory(f,change){change(f);f.entries.find(e=>e.name==='manifest.json').body=Buffer.from(JSON.stringify(f.manifest));f.zipBytes=zip(f.entries);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest=f.expected.artifactDigest='sha256:'+sha(f.zipBytes);f.expected.manifestSha256=sha(f.entries.find(e=>e.name==='manifest.json').body)}
export function auditFixture(inventory,audit){
 const bytes=Buffer.from(JSON.stringify(audit)),m=metadata({bytes:zip([{name:'manifest.json',body:bytes}]),name:`fcf-missing-inventory-audit-${inventory.manifest.targetSlug}-123-1`,jobName:inventory.jobs[0].name,jobId:inventory.expected.jobId,artifactId:inventory.manifest.targetSlug.endsWith('-g1')?'889':'899',run:'in_progress',steps:['Capture missing target inventory','Retain complete target inventory','Audit retained target inventory offline','Retain target inventory offline audit']})
 m.expected.manifestSha256=sha(bytes)
 const invMeta=artifactMetadata(inventory);invMeta.jobs=structuredClone(m.jobs)
 return{inventoryZipBytes:inventory.zipBytes,auditZipBytes:m.zipBytes,inventoryMetadata:invMeta,auditMetadata:artifactMetadata(m),run:m.run,jobs:m.jobs,expected:{planSha256:inventory.plan.planSha256},plan:inventory.plan,claimProof:inventory.claimProof,consumptionProof:inventory.consumptionProof,continuationProof:inventory.continuationProof,now:inventory.now}
}
