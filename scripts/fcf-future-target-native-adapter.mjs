import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {readFcfFutureNativeSource,requireFcfFutureCurrentMarkers,requireFcfG1QuietInventory,requireFcfFutureNativeWriter,fcfFutureNativeVersions,isFcfG1SupplementNative} from './fcf-future-native-scope.mjs'
// Source-only future G9 adapter. These projections confer no native mutation,
// cleanup, readiness, opening or activation authority. No transport is provided.
import {createHash} from 'node:crypto'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {planFcfNativeMapping,planFcfNativeTargetRows} from './fcf-target-native-plan.mjs'
import {getFcfSixPolicy} from './fcf-six-historical-policy.mjs'
import {validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
import {validUTC} from './fcf-missing-inventory-artifact.mjs'
const hash=text=>createHash('sha256').update(text).digest('hex')
const fail=m=>{throw Error(`FCF_FUTURE_NATIVE_ADAPTER: ${m}`)}
function closed(input,fields){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).sort().join(',')!==[...fields,...(Object.hasOwn(input,'now')?['now']:[])].sort().join(','))fail('closed future adapter input required')
 getFcfFutureTarget({targetSlug:input.targetSlug})
 if(!/^[a-f0-9]{40}$/.test(input.sourceCommit??'')||!Number.isSafeInteger((Object.hasOwn(input,'now')?input.now:Date.now())))fail('exact G9 target/writer SHA/current clock required')
}
function source(input){
 // Invoke the actual reader directly. No plain DATA, copied proof or callback
 // can replace its private capability, and freshness is checked on each entry.
 const {data}=readFcfFutureNativeSource({targetSlug:input.targetSlug,inventoryAdmission:input.inventoryAdmission,now:(Object.hasOwn(input,'now')?input.now:Date.now())})
 requireFcfFutureNativeWriter({data,sourceCommit:input.sourceCommit})
 return data
}
function native(input){
 closed(input,['targetSlug','sourceCommit','inventoryAdmission','databaseInventory','existingExceptionBindings',...(Object.hasOwn(input,'cleanupEvidence')?['cleanupEvidence']:[])])
 const data=source(input);requireFcfG1QuietInventory(input);if(input.targetSlug==='es-ct-segona-g1')requireFcfFutureCurrentMarkers({cleanupEvidence:input.cleanupEvidence,data,databaseInventory:input.databaseInventory})
 return {targetSlug:input.targetSlug,sourceData:data,databaseInventory:input.databaseInventory,existingExceptionBindings:input.existingExceptionBindings,writerCommit:input.sourceCommit,now:(Object.hasOwn(input,'now')?input.now:Date.now())}
}
export const deriveFcfFutureTargetNativeMapping=(input={})=>planFcfNativeMapping(native(input))
export const planFcfFutureNativeTargetImport=(input={})=>planFcfNativeTargetRows(native(input))
/** Exact schema4 packet canonicals are compared with actual source data. The
 * provider returns source facts only, never trusts packet facts as a capability. */
export function loadFcfFutureTargetOfflineProvider(input={}){
 closed(input,['targetSlug','sourceCommit','inventoryAdmission','targetPacketText','targetPacketSha256'])
 const slug=input.targetSlug,selected=getFcfFutureTarget({targetSlug:slug}),data=source(input),text=input.targetPacketText,expected=input.targetPacketSha256,now=(Object.hasOwn(input,'now')?input.now:Date.now())
 if(typeof text!=='string'||!text.length||Buffer.byteLength(text)>8*1024*1024||text.charCodeAt(0)===0xfeff||!/^[a-f0-9]{64}$/.test(expected??'')||hash(text)!==expected)fail('exact bounded schema4 import packet TEXT/SHA required')
 let packet;try{packet=JSON.parse(text)}catch{fail('invalid future import packet JSON')}
 // Capture the original proof and writer identity, never a mutable caller slot.
 const {inventoryAdmission,sourceCommit}=input
 function checked(data,now){
  const policy=getFcfSixPolicy(slug),target={sourceEvidence:data.binding,competitionId:selected.competitionId,competitionSlug:slug,sourceCode:selected.sourceCode,season:'2026/27',historicalCutline:'2026-10-24',policyId:policy.id,policySha256:fingerprint(policy),...validateFcfCurrentReleaseCalendar(data.fixtures),fixtures:data.fixtures}
  if(!packet||Object.keys(packet).sort().join(',')!==['auditedUTC','cleanupBinding','databaseInventory','kind','schemaVersion','sourceCommit','target','targetSlug',...(isFcfG1SupplementNative(data)?['supplementalBinding']:[])].sort().join(',')||packet.schemaVersion!==fcfFutureNativeVersions(data).packet||packet.kind!=='fcf-future-current-target-import'||packet.targetSlug!==slug||packet.sourceCommit!==sourceCommit||!validUTC(packet.auditedUTC)||Date.parse(packet.auditedUTC)>now||now-Date.parse(packet.auditedUTC)>86400000||fingerprint(packet.target)!==fingerprint(target))fail('packet differs from independently authenticated future target data')
  return data
 }
 checked(data,now)
 function current(){
  // Loader input.now is only its initial audit clock. Each later method uses
  // invocation time and reauthenticates the SAME proof against the SAME packet.
  const now=Date.now()
  return checked(source({targetSlug:slug,inventoryAdmission,sourceCommit,now}),now)
 }
 return Object.freeze({targetSlug:slug,competition:data.competition,sourceEvidence:data.binding,documents:data.documents,schedule:()=>current().fixtures,report:sourceMatchId=>{
  const fixture=current().fixtures.find(f=>f.id===sourceMatchId)
  if(!fixture)fail('foreign/unpacketized report refused')
  return fixture
 }})
}
