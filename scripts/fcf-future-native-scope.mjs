import {fcfG1SupplementalPolicySha256} from './fcf-g1-4109409-policy.mjs'
// Closed target DATA checks plus an explicit reader-capability entrypoint.
// These helpers never mint source, cleanup, database or activation authority.
import {getFcfFutureTarget} from './fcf-future-target-catalog.mjs'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {isVerifiedFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {FCF_G1_SOURCE_PROTOCOL,FCF_G1_POST_FAILURE_SOURCE_PROTOCOL,FCF_FUTURE_SOURCE_PROTOCOL} from './fcf-future-source-plan.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const fail=m=>{throw Error(`FCF_FUTURE_NATIVE_SCOPE: ${m}`)},hex=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
export function validateFcfFutureNativeSourceData({targetSlug,data}){
 const t=getFcfFutureTarget({targetSlug,competitionId:data?.competition?.id,sourceCode:data?.competition?.source_league_code}),c=data?.competition,b=data?.binding,g1=t.competitionId===783
 if(data?.targetSlug!==targetSlug||c.slug!==targetSlug||c.source!=='fcf'||c.source_policy!=='es-fcf-six-reviewed-history-v1'||c.active!==false||c.sezona_koledarska!==false||(g1?![FCF_G1_SOURCE_PROTOCOL,FCF_G1_POST_FAILURE_SOURCE_PROTOCOL].includes(b?.protocol):b?.protocol!==FCF_FUTURE_SOURCE_PROTOCOL)||b.sourceClaimState!=='consumed'||b.maximumSourceGETs!==478||b.newSourceGETs!==240||!hex(b.sourceCommit)||!/^[a-f0-9]{64}$/.test(b.sourceFingerprintSha256??''))fail('exact selected future source tuple required')
 if(isFcfG1SupplementNative(data)){const a=b.accountingBinding,ancestor=a?.priorAccountingBinding?.latest?.sourceCommit;if(b.priorSourceGETs!==60||b.actualSourceGETs!==300||a?.schemaVersion!==1||a.kind!=='fcf-post-g1-source-history'||a.priorSourceGETs!==60||a.latestSourceGETs!==22||a.maximumCumulativeSourceGETs!==478||a.priorAccountingBinding?.priorSourceGETs!==38||!hex(a.latest?.sourceCommit)||!hex(ancestor)||b.cleanupIssuerSourceCommit!==ancestor||b.sourceCommit===ancestor||b.sourceCommit===a.latest.sourceCommit||b.supplementalPolicySha256!==fcfG1SupplementalPolicySha256())fail('exact failed60/fresh240/300 supplemental source/ancestor binding required')}
 else if(g1){const a=b.accountingBinding;if(!Number.isSafeInteger(b.priorSourceGETs)||b.priorSourceGETs<37||b.priorSourceGETs>238||b.actualSourceGETs!==b.priorSourceGETs+240||a?.schemaVersion!==1||a?.kind!=='fcf-post-g9-source-history'||a.priorSourceGETs!==b.priorSourceGETs||a.maximumCumulativeSourceGETs!==478||!hex(a.latest?.sourceCommit))fail('G1 exact actual post-G9 accounting under478 required')}
 else if(b.priorSourceGETs!==37||b.actualSourceGETs!==277)fail('old G9 exact37/240/277 source required')
 return t
}
export function readFcfFutureNativeSource({targetSlug,inventoryAdmission,now=Date.now()}){
 const data=getFcfFutureCapturedTargetData({targetEvidence:inventoryAdmission,now}),target=validateFcfFutureNativeSourceData({targetSlug,data})
 return Object.freeze({target,data})
}
export function requireFcfFutureCleanupIssuer({cleanupEvidence,data}){
 const t=validateFcfFutureNativeSourceData({targetSlug:data?.targetSlug,data})
 if(!isVerifiedFcfFutureSixCleanupEvidence(cleanupEvidence)||cleanupEvidence.phase!=='applied')fail('reader-issued original APPLIED cleanup required')
 if(t.competitionId===783&&cleanupEvidence.sourceCommit!==(isFcfG1SupplementNative(data)?data.binding.cleanupIssuerSourceCommit:data.binding.accountingBinding.latest.sourceCommit))fail('G1 cleanup issuer must equal authenticated predecessor G9 source commit')
}
export function requireFcfG1QuietInventory({targetSlug,databaseInventory}){
 if(getFcfFutureTarget({targetSlug}).competitionId!==783)return
 const g=databaseInventory?.groups?.filter(g=>g.slug==='es-ct-tercera-g9')
 if(g?.length!==1||g[0].id!==797||g[0].active!==false||!Array.isArray(g[0].nativeImportedIDs)||g[0].nativeImportedIDs.length)fail('G1 continuation requires inactive G9 without imported normal reports')
}
export function requireFcfFutureCurrentMarkers({cleanupEvidence,data,databaseInventory}){
 requireFcfFutureCleanupIssuer({cleanupEvidence,data})
 if(data.targetSlug!=='es-ct-segona-g1')return
 requireFcfFutureInstalledMarkers({cleanupEvidence,databaseInventory})
 requireFcfG1QuietInventory({targetSlug:data.targetSlug,databaseInventory})
}
export function requireFcfFutureInstalledMarkers({cleanupEvidence,databaseInventory}){
 if(!isVerifiedFcfFutureSixCleanupEvidence(cleanupEvidence)||cleanupEvidence.phase!=='applied')fail('reader-issued original APPLIED cleanup required')
 const actual=databaseInventory?.installedMarkers?.flatMap(b=>b.markers??[]),expected=cleanupEvidence.appliedReceipt.markers
 if(!Array.isArray(actual)||actual.length!==6||new Set(actual.map(m=>m.sourceMatchId)).size!==6||actual.some(m=>{const e=expected.find(e=>e.sourceMatchId===m.sourceMatchId);return !e||hash(m)!==hash(e)}))fail('complete current immutable all-six installed markers differ from original APPLIED receipt')
}

export const fcfFutureProtocolForTarget=targetSlug=>getFcfFutureTarget({targetSlug}).competitionId===783?FCF_G1_SOURCE_PROTOCOL:FCF_FUTURE_SOURCE_PROTOCOL

export const isFcfG1SupplementNative=data=>data?.binding?.protocol===FCF_G1_POST_FAILURE_SOURCE_PROTOCOL
export function requireFcfFutureNativeWriter({data,sourceCommit}){if(isFcfG1SupplementNative(data)&&data.binding.sourceCommit!==sourceCommit)fail('post-failed G1 final native writer must equal actual fresh source writer')}
export function fcfFutureNativeVersions(data){return isFcfG1SupplementNative(data)?{packet:5,rollout:4,activation:5}:{packet:4,rollout:3,activation:4}}
export const isFcfFutureNativeProtocol=(slug,protocol)=>protocol===fcfFutureProtocolForTarget(slug)||(slug==='es-ct-segona-g1'&&protocol===FCF_G1_POST_FAILURE_SOURCE_PROTOCOL)
