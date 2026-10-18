// Source-closed rollout composition. Only reader-issued Task5 capabilities enter.
// The immutable consumed source claim is evidence, never a DB retry reservation.
import {createHash} from 'node:crypto'
import {getFcfCapturedTargetData} from './fcf-target-evidence.mjs'
import {compileFcfTargetReleasePacket,verifyFcfTargetReleasePacket} from './fcf-target-release.mjs'
import {planFcfNativeTargetRows,verifyFcfNativeMappingProposal} from './fcf-target-native-plan.mjs'
const targets=['es-ct-segona-g1','es-ct-tercera-g9'],sha=s=>createHash('sha256').update(s).digest('hex')
const fail=m=>{throw Error(`FCF_ROLLOUT: ${m}`)}
const keys='cleanupBinding,execution,identityPlan,inventoryBinding,kind,readiness,schemaVersion,sourceCommit,targetPacketSha256,targetPacketText,targetSlug'
function execution(e,commit){
 if(!e||Object.keys(e).sort().join(',')!=='commit,ref,repository,runAttempt,runId'||e.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.ref!=='refs/heads/main'||e.commit!==commit||!['runId','runAttempt'].every(k=>typeof e[k]==='string'&&/^[1-9]\d*$/.test(e[k])))fail('exact per-stage main execution required')
 return{...e}
}
function data(input){
 if(!targets.includes(input.targetSlug)||!/^[a-f0-9]{40}$/.test(input.sourceCommit??''))fail('exact G1/G9 writer target/commit required')
 return getFcfCapturedTargetData({targetEvidence:input.inventoryAdmission,targetSlug:input.targetSlug,now:input.now??Date.now()})
}
function nativeInput(input,sourceData){return{targetSlug:input.targetSlug,sourceData,databaseInventory:input.databaseInventory,existingExceptionBindings:input.existingExceptionBindings,writerCommit:input.sourceCommit,now:input.now??Date.now()}}
function envelope(input,packet,sourceData,identityPlan){
 const p=JSON.parse(packet.manifestText),rollout={schemaVersion:1,kind:'fcf-current-target-rollout',targetSlug:input.targetSlug,sourceCommit:input.sourceCommit,execution:execution(input.execution,input.sourceCommit),targetPacketText:packet.manifestText,targetPacketSha256:packet.manifestSha256,inventoryBinding:sourceData.binding,cleanupBinding:p.cleanupBinding,identityPlan:{mappingText:identityPlan.proposalText,mappingSha256:identityPlan.proposalSha256},readiness:input.readiness??null}
 const rolloutText=JSON.stringify(rollout)
 if(Buffer.byteLength(rolloutText)>8*1024*1024)fail('bounded rollout exceeded')
 return Object.freeze({rolloutText,rolloutSha256:sha(rolloutText)})
}
export function buildFcfTargetRollout(input={}){
 const sourceData=data(input),base=nativeInput(input,sourceData)
 const identityPlan=verifyFcfNativeMappingProposal({...base,proposalText:input.mappingText,proposalSha256:input.mappingSha256})
 // Validate every individual row/privacy/latest-date resolution before SQL.
 planFcfNativeTargetRows(base)
 const packet=compileFcfTargetReleasePacket({targetSlug:input.targetSlug,sourceCommit:input.sourceCommit,targetEvidence:input.inventoryAdmission,cleanupEvidence:input.cleanupEvidence,databaseInventory:input.databaseInventory,now:input.now??Date.now()})
 if(JSON.parse(packet.manifestText).cleanupBinding.phase!=='applied')fail('immutable applied all-four proof required before import')
 return envelope(input,packet,sourceData,identityPlan)
}
export function replayFcfTargetRollout(input={}){
 const text=input.rolloutText,hash=input.rolloutSha256
 if(typeof text!=='string'||Buffer.byteLength(text)>8*1024*1024||text.charCodeAt(0)===0xfeff||!/^[a-f0-9]{64}$/.test(hash??'')||sha(text)!==hash)fail('exact bounded rollout TEXT/SHA required')
 let r,p
 try{r=JSON.parse(text);p=JSON.parse(r.targetPacketText)}catch{fail('invalid rollout/packet JSON')}
 if(Object.keys(r??{}).sort().join(',')!==keys||r.schemaVersion!==1||r.kind!=='fcf-current-target-rollout'||r.targetSlug!==input.targetSlug||r.sourceCommit!==input.sourceCommit)fail('closed new-inventory rollout schema/identity required')
 const sourceData=data(input),base=nativeInput(input,sourceData)
 execution(r.execution,r.sourceCommit)
 const packet=verifyFcfTargetReleasePacket({targetSlug:input.targetSlug,sourceCommit:input.sourceCommit,targetEvidence:input.inventoryAdmission,cleanupEvidence:input.cleanupEvidence,databaseInventory:p.databaseInventory,manifestText:r.targetPacketText,manifestSha256:r.targetPacketSha256,now:input.now??Date.now()})
 const identityPlan=verifyFcfNativeMappingProposal({...base,proposalText:r.identityPlan?.mappingText,proposalSha256:r.identityPlan?.mappingSha256})
 planFcfNativeTargetRows(base)
 if(JSON.stringify(r.inventoryBinding)!==JSON.stringify(sourceData.binding)||JSON.stringify(r.cleanupBinding)!==JSON.stringify(p.cleanupBinding)||r.cleanupBinding.phase!=='applied')fail('original source/cleanup binding differs')
 const rebuilt=envelope({...input,execution:r.execution,readiness:r.readiness},packet,sourceData,identityPlan)
 if(rebuilt.rolloutText!==text||rebuilt.rolloutSha256!==hash)fail('rollout replay differs')
 return rebuilt
}
export function advanceFcfTargetRollout(input={}){
 replayFcfTargetRollout(input)
 const old=JSON.parse(input.rolloutText),sourceData=data(input)
 return envelope(input,{manifestText:old.targetPacketText,manifestSha256:old.targetPacketSha256},sourceData,{proposalText:old.identityPlan.mappingText,proposalSha256:old.identityPlan.mappingSha256})
}
