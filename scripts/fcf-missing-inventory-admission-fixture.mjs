// Private-byte/synthetic-transport controls. No actual Actions/source request.
import {inventoryFixture,auditFixture,retained,artifactMetadata} from './fcf-missing-inventory-integration-fixture.mjs'
import {claimFixture,consumptionFixture,metadata,zip,sha,headerBytes} from './fcf-missing-inventory-test-fixture.mjs'
import * as evidence from './fcf-missing-inventory-evidence.mjs'
export {retained}
const G1='es-ct-segona-g1',G9='es-ct-tercera-g9',cache=new Map()
const bundle=(m,zipBytes)=>({zipBytes,artifact:m.artifact,run:m.run,jobs:m.jobs,expected:m.expected})
function audited(f){const staged=evidence.readFcfMissingInventoryStagingArtifact(f),audit=evidence.auditFcfMissingInventoryOffline({stagingProof:staged,policyHashes:f.plan.policyHashes,now:f.now}),record=auditFixture(f,audit);return{record,child:evidence.readFcfMissingInventoryCompletedChildArtifact(record),staged}}
export async function admissionFixture(t,{refusal=false,nativePlayers=false}={}){
 const key=`${refusal}/${nativePlayers}`;if(cache.has(key))return cache.get(key)
 const g1=await inventoryFixture(t,{fresh:true,nativePlayers}),a1=audited(g1),continuation=evidence.readFcfMissingInventoryContinuation(a1.record),g9=await inventoryFixture(t,{targetSlug:G9,nativePlayers,previous:{...g1,continuation},...(refusal?{source:()=>new Response(headerBytes({id:'4118349',slug:G9,round:1}),{status:403})}:{})})
 let a9,child9,wire9
 if(refusal){g9.jobs[0].status='completed';g9.jobs[0].conclusion='failure';g9.jobs[0].steps[0].conclusion='failure';g9.jobs[0].steps[1].name='Retain failed target inventory diagnostic';g9.artifact.name=g9.expected.name=`fcf-missing-inventory-diagnostic-${G9}-123-1`;child9=evidence.readFcfMissingInventoryDiagnosticArtifact(g9);wire9={targetSlug:G9,inventory:bundle(g9,g9.zipBytes),audit:null,unstarted:null}}
 else{a9=audited(g9);child9=a9.child;wire9={targetSlug:G9,inventory:bundle(a9.record.inventoryMetadata,a9.record.inventoryZipBytes),audit:bundle(a9.record.auditMetadata,a9.record.auditZipBytes),unstarted:null}}
 const manifest=evidence.buildFcfMissingInventoryFinalReceipt({plan:g1.plan,claimProof:g1.claimProof,consumptionProof:g1.consumptionProof,childRecords:[a1.child,child9],execution:{...g1.manifest.execution,jobId:'557'},now:g9.now}),body=Buffer.from(JSON.stringify(manifest)),receipt=metadata({bytes:zip([{name:'manifest.json',body}]),name:'fcf-missing-inventory-final-123-1',jobName:'missing-inventory-receipt',steps:['Retain final FCF inventory receipt'],jobId:'557',artifactId:'900'})
 receipt.expected.manifestSha256=sha(body)
 const cf=claimFixture(g1.plan),claim=Object.fromEntries(['execution','ref','claimCommit','claimBytes','rulesets','expected'].map(k=>[k,cf[k]])),consumption=consumptionFixture(g1.claimProof),wire={plan:g1.plan,claim,consumption:bundle(consumption,consumption.zipBytes),children:[{targetSlug:G1,inventory:bundle(a1.record.inventoryMetadata,a1.record.inventoryZipBytes),audit:bundle(a1.record.auditMetadata,a1.record.auditZipBytes),unstarted:null},wire9],finalReceipt:bundle(receipt,receipt.zipBytes),targetSlug:G1,now:g9.now}
 for(const b of[wire.consumption,wire.finalReceipt,...wire.children.flatMap(c=>[c.inventory,c.audit]).filter(Boolean)]){b.run.status='completed';b.run.conclusion=refusal?'failure':'success'}
 const finalReceipt=evidence.readFcfMissingInventoryFinalReceipt({...wire.finalReceipt,plan:g1.plan,claimProof:g1.claimProof,consumptionProof:g1.consumptionProof,childRecords:[a1.child,child9],now:g9.now}),pairs={}
 for(const [slug,a]of[[G1,a1],...(refusal?[]:[[G9,a9]])]){const raw=wire.children.find(c=>c.targetSlug===slug),inventoryProof=evidence.readFcfMissingInventoryArtifact({...raw.inventory,plan:g1.plan,targetSlug:slug,consumptionProof:g1.consumptionProof,continuationProof:slug===G9?continuation:undefined,finalReceipt,now:g9.now}),auditProof=evidence.readFcfMissingInventoryAuditArtifact({...raw.audit,inventoryProof,now:g9.now});pairs[slug]={inventoryProof,auditProof}}
 const result={wire,pairs,g1,g9,staging:a1.staged,continuation,now:g9.now,calls:g1.calls+g9.calls};cache.set(key,result);return result
}
