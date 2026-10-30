// Post-import pricing/readiness DATA for the separate G9 native800 protocol.
// This module never issues import, check, activation or transport authority.
import {createHash} from 'node:crypto'
import {getFcfG9Native800Source,FCF_G9_NATIVE800_PROTOCOL} from './fcf-g9-native800-source.mjs'
import {describeFcfG9Native800Preparation} from './fcf-g9-native800-prepare.mjs'
import {verifyFcfPriceReplay,cheapestFcfLegal15} from './fcf-target-readiness.mjs'
import {selectFcfFutureLaunch,verifyFcfFutureLaunch} from './fcf-future-launch.mjs'
import {fcfTargetPricingModelSha256} from './fcf-target-pricing-model.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'

const slug='es-ct-tercera-g9',fail=m=>{throw Error(`FCF_G9_NATIVE800_READINESS: ${m}`)},need=(v,m)=>{if(!v)fail(m)}
const flags={admissible:false,nativeAdmission:false,activationEligible:false}
const sha=t=>createHash('sha256').update(t).digest('hex'),hex=(v,n=64)=>typeof v==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(v)
function stable(value){if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value)){if(Object.keys(value).length!==value.length)fail('dense JSON arrays required');return value.map(stable)}if(value&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));fail('finite plain DATA required')}
const stableText=x=>JSON.stringify(stable(x)),same=(a,b)=>stableText(a)===stableText(b)
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
function readJSON(text,digest,label,maximum=8388608){need(typeof text==='string'&&Buffer.byteLength(text)>0&&Buffer.byteLength(text)<=maximum&&hex(digest)&&sha(text)===digest,`exact bounded ${label} TEXT/SHA required`);try{return JSON.parse(text)}catch{fail(`valid ${label} JSON required`)}}

/**
 * Input is the original inactive import receipt/rollout plus a fresh coherent
 * post-price G9 preparation and the exact replay written by the offline price
 * child. The sourceProof must be the genuine private G9 800-reader capability.
 */
export function buildFcfG9Native800Readiness(input={}){
 exactKeys(input,['sourceProof','originalRolloutText','originalRolloutSha256','importReceipt','nativePreparation','pricingReplay'],'G9 readiness input')
 const source=getFcfG9Native800Source(input.sourceProof)
 need(source.targetSlug===slug&&source.competitionId===797&&source.binding.protocol===FCF_G9_NATIVE800_PROTOCOL&&source.binding.maximumSourceGETs===800&&source.currentCapture.newSourceGETs===240,'actual current G9 native800 source proof required')

 const rollout=readJSON(input.originalRolloutText,input.originalRolloutSha256,'original imported rollout')
 exactKeys(rollout,['schemaVersion','kind','protocol','targetSlug','sourceCommit','execution','targetPacketText','targetPacketSha256','inventoryBinding','cleanupBinding','identityPlan','scoreBeforeimages','nativeSnapshotText','nativeSnapshotSha256','readiness'],'original rollout')
 need(rollout.schemaVersion===1&&rollout.kind==='fcf-native800-import-rollout'&&rollout.protocol==='fcf-native800-v1'&&rollout.targetSlug===slug&&rollout.readiness===null,'exact original G9 native800 import rollout required')
 need(rollout.inventoryBinding.protocol===FCF_G9_NATIVE800_PROTOCOL&&rollout.inventoryBinding.sourceCommit===source.binding.sourceCommit&&rollout.inventoryBinding.sourceFingerprintSha256===source.binding.sourceFingerprintSha256&&rollout.sourceCommit===rollout.execution?.commit,'original rollout source/capture binding differs')
 const packet=readJSON(rollout.targetPacketText,rollout.targetPacketSha256,'original import packet')
 need(packet.schemaVersion===1&&packet.kind==='fcf-native800-import-packet'&&packet.protocol==='fcf-native800-v1'&&packet.targetSlug===slug&&packet.sourceCommit===rollout.sourceCommit&&packet.captureSourceCommit===source.binding.sourceCommit&&same(packet.target?.sourceEvidence,source.binding)&&packet.target?.competitionId===797&&same(packet.target.fixtures,source.fixtures)&&same(packet.target.clubs,source.clubs)&&same(packet.target.verifiedKeeperClubs,source.verifiedKeeperClubs),'original packet does not bind current genuine G9 source/calendar')
 const identity=readJSON(rollout.identityPlan?.mappingText,rollout.identityPlan?.mappingSha256,'original identity mapping')
 need(identity.schemaVersion===1&&identity.kind==='fcf-native-target-mapping'&&identity.targetSlug===slug&&identity.sourceCommit===rollout.sourceCommit&&identity.captureSourceCommit===source.binding.sourceCommit&&Array.isArray(identity.mappings)&&identity.mappings.length===16&&Array.isArray(identity.fixtures)&&identity.fixtures.length===240,'complete retained G9 identity mapping required')

 const receipt=input.importReceipt
 exactKeys(receipt,['schemaVersion','kind','receiptId','competitionId','targetSlug','stage','rolloutText','rolloutSha256','targetPacketSha256','sourceFingerprintSha256','importedStateSha256','currentStateSha256','currentActive','canonicalVerified','admissible','nativeAdmission','activationEligible'],'original inactive import receipt')
 need(receipt.schemaVersion===1&&receipt.kind==='fcf-native800-import-receipt'&&/^[1-9]\d{0,19}$/.test(receipt.receiptId??'')&&receipt.competitionId===797&&receipt.targetSlug===slug&&receipt.stage==='imported'&&receipt.currentActive===false&&receipt.canonicalVerified===false&&receipt.admissible===false&&receipt.nativeAdmission===false&&receipt.activationEligible===false,'exact original inactive, non-authoritative import receipt required')
 need(receipt.rolloutText===input.originalRolloutText&&receipt.rolloutSha256===input.originalRolloutSha256&&receipt.targetPacketSha256===rollout.targetPacketSha256&&receipt.sourceFingerprintSha256===source.binding.sourceFingerprintSha256&&hex(receipt.importedStateSha256)&&receipt.currentStateSha256===receipt.importedStateSha256,'import receipt must retain its original pre-price state commitment')

 const preparation=input.nativePreparation
 exactKeys(preparation,['projection','scoreBeforeimages','admissible','nativeAdmission','activationEligible'],'fresh post-price preparation')
 need(preparation.admissible===false&&preparation.nativeAdmission===false&&preparation.activationEligible===false,'preparation cannot confer admission or activation')
 const prepared=describeFcfG9Native800Preparation({projection:preparation.projection,scoreBeforeimages:preparation.scoreBeforeimages}),projection=prepared.projection
 need(same(prepared.scoreBeforeimages.offTargetG1,rollout.scoreBeforeimages?.offTargetG1),'complete off-target G1 score beforeimage changed')
 const nativeSnapshotText=projection.dependencySnapshotText,nativeSnapshotSha256=projection.dependencySnapshotSha256
 need(rollout.nativeSnapshotSha256===sha(rollout.nativeSnapshotText)&&hex(nativeSnapshotSha256),'retained original native snapshot commitment required')

 const pricing=projection.pricingSnapshot,snapshot=readJSON(pricing?.snapshotText,pricing?.snapshotSha256,'current pricing snapshot',32*1024*1024)
 const modelSha256=fcfTargetPricingModelSha256()
 const priceVector=verifyFcfPriceReplay({targetSlug:slug,snapshot,replay:input.pricingReplay,modelSha256})
 need(snapshot.players.every(p=>p.competition_id===797&&typeof p.active==='boolean'&&Object.hasOwn(p,'position')&&Object.hasOwn(p,'position_source')),'complete current G9 persisted player price/position facts required')
 const pool=snapshot.players.filter(p=>p.active),legal=cheapestFcfLegal15(pool)
 need(legal&&legal.cost<=100&&Math.max(...pool.map(p=>Number(p.value)))>=8&&pool.filter(p=>Number(p.value)===4.5).length/pool.length<=.7,'current G9 legal15 and non-default price spread required')

 const mappings=identity.fixtures,teamByClub=new Map(identity.mappings.map(m=>[m.nativeClubId+'/'+m.nativeCategoryId,m.teamId]))
 need(mappings.every(x=>source.fixtures.some(f=>f.id===x.sourceMatchId)),'mapping contains foreign source fixture')
 need(teamByClub.size===16,'all actual G9 clubs map to native teams')
 for(const keeper of source.keeperCoverage){const teamId=teamByClub.get(keeper.sourceClubId+'/'+keeper.sourceCategoryId);need(Number.isSafeInteger(teamId)&&keeper.officialKeeperRegistrations.length>0&&pool.some(p=>p.team_id===teamId&&p.position==='GK'&&p.position_source==='zapisnik'&&keeper.officialKeeperRegistrations.some(reg=>String(reg)===String(p.reg_st))),'each source club needs a persisted official current goalkeeper')}

 const launchInput={targetSlug:slug,competitionId:797,sourceCode:source.sourceCode,season:'2026/27',sourceFingerprintSha256:source.binding.sourceFingerprintSha256,writerCommit:rollout.sourceCommit,fixtures:source.fixtures,mapping:mappings,native:projection.native,now:Date.now()}
 const launchProposal=selectFcfFutureLaunch(launchInput)
 verifyFcfFutureLaunch(launchInput,launchProposal)
 const replayText=stableText(input.pricingReplay),readiness={schemaVersion:1,kind:'fcf-g9-native800-readiness-data',protocol:FCF_G9_NATIVE800_PROTOCOL,targetSlug:slug,sourceBinding:source.binding,capture:source.currentCapture,originalImport:{stage:'imported',receiptId:receipt.receiptId,rolloutText:input.originalRolloutText,rolloutSha256:input.originalRolloutSha256,targetPacketSha256:receipt.targetPacketSha256,sourceFingerprintSha256:receipt.sourceFingerprintSha256,importedStateSha256:receipt.importedStateSha256,currentStateSha256:receipt.currentStateSha256,currentActive:false},nativeSnapshotText,nativeSnapshotSha256,scoreBeforeimages:prepared.scoreBeforeimages,pricingSnapshotText:pricing.snapshotText,pricingSnapshotSha256:pricing.snapshotSha256,pricingReplayText:replayText,pricingReplaySha256:sha(replayText),modelSha256,priceVector,cheapestLegal15:legal.cost,legal15PlayerIds:legal.squad.map(p=>p.id).sort((a,b)=>a-b),launchProposal,...flags}
 const readinessText=JSON.stringify(readiness)
 need(Buffer.byteLength(readinessText)<=32*1024*1024,'bounded readiness DATA required')
 return freeze({readinessText,readinessSha256:sha(readinessText),...flags})
}
