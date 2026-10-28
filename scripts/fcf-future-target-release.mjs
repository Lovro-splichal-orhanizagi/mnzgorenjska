import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {readFcfFutureNativeSource,requireFcfFutureCurrentMarkers} from './fcf-future-native-scope.mjs'
// Source-closed future IMPORT packet DATA only. No launch choice, writer,
// native/readiness/activation authority, network or database client is issued.
import {createHash} from 'node:crypto'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {isVerifiedFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {getFcfSixPolicy,FCF_SIX_SOURCE_POLICY,fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
import {validateFcfTargetReleaseInventory} from './fcf-target-release.mjs'
import {validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
import {validUTC} from './fcf-missing-inventory-artifact.mjs'
const season='2026/27',cutline='2026-10-24'
const ids=['4109388','4109404','4116215','4118352','4118354','4118358'],outer=['schemaVersion','kind','targetSlug','sourceCommit','auditedUTC','cleanupBinding','databaseInventory','target']
const fail=message=>{throw Error(`FCF_FUTURE_TARGET_RELEASE: ${message}`)},hash=text=>createHash('sha256').update(text).digest('hex'),same=(a,b)=>fingerprint(a)===fingerprint(b)
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
const keys=(value,expected,label)=>{if(!object(value)||Object.keys(value).sort().join(',')!==expected.slice().sort().join(','))fail(`${label} closed fields differ`)}
const commit=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x),sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
function cleanup(e,now){
 if(!isVerifiedFcfFutureSixCleanupEvidence(e)||e.phase!=='applied')fail('reader-issued APPLIED future six cleanup evidence required')
 if(!commit(e.sourceCommit)||!validUTC(e.preparedUTC)||Date.parse(e.preparedUTC)>now||typeof e.beforeImageText!=='string'||!sha(e.beforeSha256)||hash(e.beforeImageText)!==e.beforeSha256||!e.appliedReceipt||!same(e.policyHashes,fcfSixPolicyIdHashes())||!Array.isArray(e.originals)||!same(e.originals.map(d=>d.sourceMatchId).sort(),ids))fail('exact opaque applied six cleanup/original authority differs')
 // Originals remain the immutable original authorization. Fresh observations
 // below are separately authenticated source facts, never replacement originals.
 for(const d of e.originals){
  const p=getFcfSixPolicy(d.competitionSlug),entry=p?.entries.find(x=>x.sourceMatchId===d.sourceMatchId)
  if(!entry)fail('unknown cleanup original descriptor')
  const {rawSha256,reasonCode,...identity}=entry,fixture={...identity,season:p.season}
  if(d.policyId!==p.id||d.policySha256!==fingerprint(p)||d.receipt?.rawSha256!==rawSha256||typeof d.html!=='string'||hash(d.html)!==rawSha256||!same(d.fixture,fixture)||!d.authorization||entry.playedOn>=cutline)fail('immutable cleanup descriptor/policy/original SHA differs')
 }
 return {phase:e.phase,sourceCommit:e.sourceCommit,preparedUTC:e.preparedUTC,beforeImageText:e.beforeImageText,beforeSha256:e.beforeSha256,policyHashes:structuredClone(e.policyHashes),originals:e.originals.map(({html,...descriptor})=>structuredClone(descriptor)),prepareArtifact:structuredClone(e.prepareArtifact),appliedReceipt:structuredClone(e.appliedReceipt)}
}
function historical(fixtures,originals,policy){
 const slug=policy.competitionSlug
 const rows=fixtures.filter(f=>f.statisticsStatus==='unavailable_historical')
 if(!same(rows.map(f=>f.id.slice(2)).sort(),policy.entries.map(e=>e.sourceMatchId).sort()))fail('exact approved G9 historical canonical set required')
 for(const f of rows){
  const id=f.id.slice(2),d=originals.find(d=>d.sourceMatchId===id),e=policy.entries.find(e=>e.sourceMatchId===id),observation=f.source?.historicalObservation
  const expected={kind:'fcf-six-fresh-historical-observation',targetSlug:slug,sourceMatchId:id,policyId:policy.id,policySha256:fingerprint(policy),approvedOriginalSha256:d?.receipt.rawSha256,freshRawSha256:f.source?.rawSha256,fixture:d?.fixture}
  if(!d||d.competitionSlug!==slug||d.policyId!==policy.id||d.policySha256!==fingerprint(policy)||d.receipt.rawSha256!==e.rawSha256||f.policyId!==d.policyId||f.policySha256!==d.policySha256||f.statisticsReason!==e.reasonCode||f.report!==null||f.appearances!==null||f.goals!==null||f.source?.sourceUrl!==e.sourceUrl||!sha(f.source?.rawSha256)||!same(f.sourceFixture,d.fixture)||!same(observation,expected)||f.round!==e.sourceRound||f.date!==e.playedOn||f.homeGoals!==e.observedHomeScore||f.awayGoals!==e.observedAwayScore||!same(f.clubs.map(c=>[c.sourceClubId,c.sourceCategoryId]),[[e.homeSourceClubId,e.homeSourceCategoryId],[e.awaySourceClubId,e.awaySourceCategoryId]]))fail('fresh historical observation differs from immutable cleanup authorization')
 }
}
function compile(input,auditedUTC,currentDatabaseInventory){
 keys(input,['targetSlug','sourceCommit','targetEvidence','cleanupEvidence','databaseInventory',...(Object.hasOwn(input??{},'now')?['now']:[])],'future import input')
 const {targetSlug,sourceCommit,targetEvidence,cleanupEvidence,databaseInventory,now=Date.now()}=input
 const selected=getFcfFutureTarget({targetSlug}),slug=targetSlug,code=selected.sourceCode
 if(!commit(sourceCommit)||!Number.isSafeInteger(now)||!Number.isFinite(new Date(now).getTime()))fail('exact G9 reviewed writer SHA/current clock required')
 const {data}=readFcfFutureNativeSource({targetSlug,inventoryAdmission:targetEvidence,now}),binding=cleanup(cleanupEvidence,now),b=data.binding
 requireFcfFutureCurrentMarkers({cleanupEvidence,data,databaseInventory:currentDatabaseInventory??databaseInventory})
 const {inventory,target}=validateFcfTargetReleaseInventory({targetSlug,databaseInventory,cleanupPhase:'applied',sourcePolicy:FCF_SIX_SOURCE_POLICY,now})
 auditedUTC??=new Date(now).toISOString()
 if(!validUTC(auditedUTC)||Date.parse(auditedUTC)>now||now-Date.parse(auditedUTC)>86400000)fail('original packet audit clock is stale/future')
 const fixtures=data.fixtures,policy=getFcfSixPolicy(slug)
 if(!Array.isArray(fixtures)||fixtures.length!==240||new Set(fixtures.map(f=>f.id)).size!==240||fixtures.some(f=>!/^es\d{7}$/.test(f.id)||Number(f.id.slice(2))<selected.start||Number(f.id.slice(2))>selected.end))fail('complete exact G9 canonical block required')
 historical(fixtures,binding.originals,policy)
 const calendar=validateFcfCurrentReleaseCalendar(fixtures)
 if(!same(calendar.clubs,data.clubs)||!same(calendar.verifiedKeeperClubs,data.verifiedKeeperClubs))fail('authenticated complete clubs/keeper calendar differs')
 const byId=new Map(fixtures.map(f=>[f.id.slice(2),f]))
 if(target.nativeImportedIDs.some(id=>!byId.has(id)||byId.get(id).statisticsStatus==='pending'))fail('known native imported target report cannot be downgraded to pending')
 const canonical={sourceEvidence:structuredClone(b),competitionId:selected.competitionId,competitionSlug:slug,sourceCode:code,season,historicalCutline:cutline,policyId:policy.id,policySha256:fingerprint(policy),...calendar,fixtures}
 const manifest={schemaVersion:4,kind:'fcf-future-current-target-import',targetSlug,sourceCommit,auditedUTC,cleanupBinding:binding,databaseInventory:inventory,target:canonical},manifestText=JSON.stringify(manifest)
 if(Buffer.byteLength(manifestText)>8*1024*1024)fail('bounded8MB future import packet required')
 return Object.freeze({manifestText,manifestSha256:hash(manifestText)})
}
/** Closed input {targetSlug,sourceCommit,targetEvidence,cleanupEvidence,
 * databaseInventory,now?}. Both proofs must be reader-issued actual objects.
 * Source/cleanup commits may precede the separately reviewed import writer SHA.
 */
export const compileFcfFutureTargetImportPacket=input=>compile(input)
/** Rebuild at the stored audit timestamp, while source freshness/inventory and
 * both capabilities are checked again under the ACTUAL current caller clock.
 */
export function verifyFcfFutureTargetImportPacket(input){
 keys(input,['targetSlug','sourceCommit','targetEvidence','cleanupEvidence','databaseInventory','manifestText','manifestSha256',...(Object.hasOwn(input??{},'currentDatabaseInventory')?['currentDatabaseInventory']:[]),...(Object.hasOwn(input??{},'now')?['now']:[])],'future import verification input')
 const {manifestText,manifestSha256,currentDatabaseInventory,...base}=input
 if(typeof manifestText!=='string'||!manifestText.length||Buffer.byteLength(manifestText)>8*1024*1024||manifestText.charCodeAt(0)===0xfeff||!sha(manifestSha256)||hash(manifestText)!==manifestSha256)fail('exact bounded future import packet TEXT/SHA required')
 let manifest;try{manifest=JSON.parse(manifestText)}catch{fail('invalid future import packet JSON')}
 keys(manifest,outer,'future import packet')
 if(manifest.schemaVersion!==4||manifest.kind!=='fcf-future-current-target-import'||manifest.targetSlug!==input.targetSlug)fail('separate future import packet schema4 required')
 const rebuilt=compile(base,manifest.auditedUTC,currentDatabaseInventory)
 if(rebuilt.manifestText!==manifestText||rebuilt.manifestSha256!==manifestSha256)fail('future import packet differs from independently authenticated current inputs')
 return rebuilt
}
