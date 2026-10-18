// Offline adapter only. No CLI, admission reauthentication transport, preloader,
// SQL or writer is enabled. Always use the real reader-owned Task5 getter;
// raw source snapshots/callbacks and copies cannot replace its capability.
import {createHash} from 'node:crypto'
import {getFcfCapturedTargetData} from './fcf-target-evidence.mjs'
import {historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
import {planFcfNativeMapping,planFcfNativeMatchRows,planFcfNativeTargetRows} from './fcf-target-native-plan.mjs'
const fail=message=>{throw Error(`FCF_NATIVE_ADAPTER: ${message}`)}
function native(input){return getFcfCapturedTargetData({targetEvidence:input.inventoryAdmission,targetSlug:input.targetSlug,now:input.now??Date.now()})}
function planInput(input,sourceData){
 return{targetSlug:input.targetSlug,sourceData,databaseInventory:input.databaseInventory,existingExceptionBindings:input.existingExceptionBindings,writerCommit:input.sourceCommit,now:input.now??Date.now()}
}
export function deriveFcfTargetNativeMapping(input={}){
 const sourceData=native(input)
 return planFcfNativeMapping(planInput(input,sourceData))
}
export function planFcfNativeMatchImport(input={}){
 const sourceData=native(input)
 return planFcfNativeMatchRows({...planInput(input,sourceData),sourceMatchId:input.sourceMatchId})
}
export function planFcfNativeTargetImport(input={}){
 const sourceData=native(input)
 return planFcfNativeTargetRows(planInput(input,sourceData))
}
/** Source-closed canonical provider; a source view is not cleanup/DB readiness. */
export function loadFcfTargetOfflineProvider(input={}){
 const data=native(input),text=input.targetPacketText,expected=input.targetPacketSha256
 if(typeof text!=='string'||Buffer.byteLength(text)>8*1024*1024||text.charCodeAt(0)===0xfeff||!/^[a-f0-9]{64}$/.test(expected??'')||createHash('sha256').update(text).digest('hex')!==expected)fail('exact bounded v2 packet TEXT/SHA required')
 let packet
 try{packet=JSON.parse(text)}catch{fail('invalid target packet JSON')}
 const keys='auditedUTC,cleanupBinding,databaseInventory,kind,schemaVersion,sourceCommit,target,targetSlug'
 if(Object.keys(packet??{}).sort().join(',')!==keys||packet.schemaVersion!==2||packet.kind!=='fcf-current-target-release'||packet.targetSlug!==data.targetSlug||!/^[a-f0-9]{40}$/.test(packet.sourceCommit??'')||packet.target?.competitionId!==data.competition.id||packet.target.competitionSlug!==data.targetSlug||packet.target.season!=='2026/27'||fingerprint(packet.target.sourceEvidence)!==fingerprint(data.binding)||fingerprint(packet.target.fixtures)!==fingerprint(data.fixtures))fail('packet differs from independently authenticated native target data')
 const fixtures=new Map(data.fixtures.map(f=>[f.id,f]))
 return Object.freeze({targetSlug:data.targetSlug,competition:data.competition,sourceEvidence:data.binding,documents:data.documents,schedule:()=>data.fixtures,report:sourceMatchId=>{
  if(!fixtures.has(sourceMatchId))fail('foreign/unpacketized report refused')
  return fixtures.get(sourceMatchId)
 }})
}
