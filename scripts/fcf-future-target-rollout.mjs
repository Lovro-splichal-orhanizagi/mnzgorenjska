import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {readFcfFutureNativeSource,requireFcfG1QuietInventory} from './fcf-future-native-scope.mjs'
// Bounded inactive IMPORT composition only. No stage advance, chosen opening,
// readiness installation, source retry, native write or activation capability.
import {createHash} from 'node:crypto'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {compileFcfFutureTargetImportPacket,verifyFcfFutureTargetImportPacket} from './fcf-future-target-release.mjs'
import {planFcfNativeTargetRows,verifyFcfNativeMappingProposal} from './fcf-target-native-plan.mjs'
import {validateFcfTargetReleaseInventory} from './fcf-target-release.mjs'
const hash=text=>createHash('sha256').update(text).digest('hex'),limit=8*1024*1024
const fail=m=>{throw Error(`FCF_FUTURE_ROLLOUT: ${m}`)}
const baseFields=['targetSlug','sourceCommit','inventoryAdmission','databaseInventory','existingExceptionBindings','cleanupEvidence','execution']
const wireFields=['schemaVersion','kind','targetSlug','sourceCommit','execution','targetPacketText','targetPacketSha256','inventoryBinding','cleanupBinding','identityPlan','readiness']
function keys(input,fields,label){if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).sort().join(',')!==fields.slice().sort().join(','))fail(`${label} closed fields differ`)}
function execution(e,commit){
 keys(e,['repository','ref','commit','runId','runAttempt'],'reviewed execution')
 if(e.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.ref!=='refs/heads/main'||e.commit!==commit||typeof e.runId!=='string'||!/^[1-9]\d*$/.test(e.runId)||e.runAttempt!=='1')fail('exact reviewed same main writer execution attempt1 required')
 return {repository:e.repository,ref:e.ref,commit:e.commit,runId:e.runId,runAttempt:e.runAttempt}
}
function context(input,extra){
 keys(input,[...baseFields,...extra,...(Object.hasOwn(input??{},'now')?['now']:[])],'future rollout input')
 getFcfFutureTarget({targetSlug:input.targetSlug})
 if(!/^[a-f0-9]{40}$/.test(input.sourceCommit??'')||!Number.isSafeInteger((Object.hasOwn(input,'now')?input.now:Date.now())))fail('exact G9 writer SHA/current clock required')
 const e=execution(input.execution,input.sourceCommit),now=(Object.hasOwn(input,'now')?input.now:Date.now()),{data,target}=readFcfFutureNativeSource({targetSlug:input.targetSlug,inventoryAdmission:input.inventoryAdmission,now})
 requireFcfG1QuietInventory({targetSlug:input.targetSlug,databaseInventory:input.databaseInventory})
 return {data,target,e,now,native:{targetSlug:target.targetSlug,sourceData:data,databaseInventory:input.databaseInventory,existingExceptionBindings:input.existingExceptionBindings,writerCommit:input.sourceCommit,now}}
}
function packetInput(input,now){return {targetSlug:input.targetSlug,sourceCommit:input.sourceCommit,targetEvidence:input.inventoryAdmission,cleanupEvidence:input.cleanupEvidence,databaseInventory:input.databaseInventory,now}}
function envelope(input,ctx,packet,mapping){
 const slug=ctx.target.targetSlug
 const p=JSON.parse(packet.manifestText)
 if(p.cleanupBinding.phase!=='applied')fail('reader-issued APPLIED future cleanup required')
 const rollout={schemaVersion:3,kind:'fcf-future-current-target-import-rollout',targetSlug:slug,sourceCommit:input.sourceCommit,execution:ctx.e,targetPacketText:packet.manifestText,targetPacketSha256:packet.manifestSha256,inventoryBinding:ctx.data.binding,cleanupBinding:p.cleanupBinding,identityPlan:{mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256},readiness:null},rolloutText=JSON.stringify(rollout)
 if(Buffer.byteLength(rolloutText)>limit)fail('bounded8MB future rollout required')
 return Object.freeze({rolloutText,rolloutSha256:hash(rolloutText)})
}
export function buildFcfFutureTargetImportRollout(input={}){
 const ctx=context(input,['mappingText','mappingSha256']),mapping=verifyFcfNativeMappingProposal({...ctx.native,proposalText:input.mappingText,proposalSha256:input.mappingSha256})
 // Actual native identities, every actor/club row and complete privacy evidence
 // are independently checked; packet canonicals never replace source authority.
 planFcfNativeTargetRows(ctx.native)
 const packet=compileFcfFutureTargetImportPacket(packetInput(input,ctx.now))
 return envelope(input,ctx,packet,mapping)
}
function currentImportState(ctx,originalInventory){
 const slug=ctx.target.targetSlug
 // This is CURRENT read-only SQL scope, distinct from the packet's immutable
 // PRE-import observation. Import may grow selected IDs, never erase old ones.
 const {target}=validateFcfTargetReleaseInventory({targetSlug:slug,databaseInventory:ctx.native.databaseInventory,cleanupPhase:'applied',sourcePolicy:'es-fcf-six-reviewed-history-v1',now:ctx.now})
 const original=originalInventory.groups.find(g=>g.slug===slug),known=new Set(target.nativeImportedIDs),sourceById=new Map(ctx.data.fixtures.map(f=>[f.id.slice(2),f])),matches=ctx.native.databaseInventory.matches
 if(!Array.isArray(matches))fail('complete current native match inventory required')
 if(original.nativeImportedIDs.some(id=>!known.has(id)))fail('original known imported selected IDs were lost')
 for(const id of known){
  const source=sourceById.get(id),rows=matches.filter(m=>m.zapisnik_id==='es'+id),m=rows[0]
  if(source?.statisticsStatus!=='available'||rows.length!==1||m.statistics_status!=='available'||typeof m.imported_at!=='string'||!Number.isFinite(Date.parse(m.imported_at))||Date.parse(m.imported_at)>ctx.now)fail('current imported ID/source/native status differs or was downgraded')
 }
 // Complete actual per-match imported observations cannot disappear from the
 // current summary, including during a purported normal import transition.
 if(matches.some(m=>m.imported_at!=null&&(typeof m.zapisnik_id!=='string'||!known.has(m.zapisnik_id.replace(/^es/,'')))))fail('current imported native row missing from complete selected summary')
}
export function replayFcfFutureTargetImportRollout(input={}){
 const ctx=context(input,['rolloutText','rolloutSha256']),text=input.rolloutText,expected=input.rolloutSha256
 if(typeof text!=='string'||!text.length||Buffer.byteLength(text)>limit||text.charCodeAt(0)===0xfeff||!/^[a-f0-9]{64}$/.test(expected??'')||hash(text)!==expected)fail('exact bounded future rollout TEXT/SHA required')
 let r;try{r=JSON.parse(text)}catch{fail('invalid future rollout JSON')}
 keys(r,wireFields,'future import rollout');keys(r.identityPlan,['mappingText','mappingSha256'],'identity plan')
 if(r.schemaVersion!==3||r.kind!=='fcf-future-current-target-import-rollout'||r.targetSlug!==ctx.target.targetSlug||r.sourceCommit!==input.sourceCommit||r.readiness!==null||JSON.stringify(execution(r.execution,r.sourceCommit))!==JSON.stringify(ctx.e))fail('exact future import identity/null readiness/same actual execution required')
 let originalPacket;try{originalPacket=JSON.parse(r.targetPacketText)}catch{fail('invalid original future import packet JSON')}
 // Verify immutable original packet bytes/source/cleanup at its original audit
 // timestamp and actual current clock. Stored inventory is a PRE-import image,
 // not evidence of the current SQL state or a refreshed capture timestamp.
 const packet=verifyFcfFutureTargetImportPacket({...packetInput(input,ctx.now),databaseInventory:originalPacket.databaseInventory,...(ctx.target.competitionId===783?{currentDatabaseInventory:input.databaseInventory}:{}),manifestText:r.targetPacketText,manifestSha256:r.targetPacketSha256})
 currentImportState(ctx,originalPacket.databaseInventory)
 const mapping=verifyFcfNativeMappingProposal({...ctx.native,proposalText:r.identityPlan.mappingText,proposalSha256:r.identityPlan.mappingSha256})
 planFcfNativeTargetRows(ctx.native)
 const rebuilt=envelope(input,ctx,packet,mapping)
 if(rebuilt.rolloutText!==text||rebuilt.rolloutSha256!==expected)fail('future rollout differs from independently authenticated source/cleanup/native inputs')
 return rebuilt
}
