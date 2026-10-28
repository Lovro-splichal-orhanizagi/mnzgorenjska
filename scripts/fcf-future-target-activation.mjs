import {readFcfFutureNativeSource} from './fcf-future-native-scope.mjs'
// Pure, source-closed future activation packet DATA. No transport, native writes,
// Actions approval, SQL authentication or activation capability is issued.
import {createHash} from 'node:crypto'
import {getFcfFutureCapturedTargetData} from './fcf-future-source-admission.mjs'
import {isVerifiedFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {replayFcfFutureTargetImportRollout} from './fcf-future-target-rollout.mjs'
import {selectFcfFutureLaunch,verifyFcfFutureLaunch} from './fcf-future-launch.mjs'
import {buildFcfFutureTargetReadiness} from './fcf-future-readiness.mjs'
import {fcfTargetPricingModelSha256} from './fcf-target-pricing-model.mjs'
import {historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
import {validUTC} from './fcf-missing-inventory-artifact.mjs'
const limit=8*1024*1024,hash=text=>createHash('sha256').update(text).digest('hex')
const fail=m=>{throw Error(`FCF_FUTURE_ACTIVATION: ${m}`)}
const fields=['targetSlug','sourceCommit','inventoryAdmission','cleanupEvidence','importReceipt','nativeProjection','pricingReplay','execution']
const wire=['schemaVersion','kind','targetSlug','sourceCommit','execution','importReceiptId','importRolloutText','importRolloutSha256','nativeSnapshotText','nativeSnapshotSha256','launchProposal','readiness','auditedUTC']
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
const hex=(x,n)=>typeof x==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(x)
const same=(a,b)=>fingerprint(a)===fingerprint(b)
function keys(x,expected,label){if(!object(x)||Object.keys(x).sort().join(',')!==expected.slice().sort().join(','))fail(`${label} closed fields differ`)}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
function exactText(text,sha,label){
 if(typeof text!=='string'||!text.length||Buffer.byteLength(text)>limit||text.charCodeAt(0)===0xfeff||!hex(sha,64)||hash(text)!==sha)fail(`${label} exact bounded TEXT/SHA required`)
 try{return JSON.parse(text)}catch{fail(`${label} invalid JSON`)}
}
function stamp(value,now,label){const n=typeof value==='string'?Date.parse(value):NaN;if(!Number.isFinite(n)||n>now)fail(`${label} actual nonfuture timestamp required`);return n}
function execution(e,commit){
 keys(e,['repository','ref','commit','runId','runAttempt'],'activation execution')
 if(e.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.ref!=='refs/heads/main'||e.commit!==commit||typeof e.runId!=='string'||!/^[1-9]\d*$/.test(e.runId)||e.runAttempt!=='1')fail('approved main packet-origin writer execution attempt1 required')
 return {repository:e.repository,ref:e.ref,commit:e.commit,runId:e.runId,runAttempt:e.runAttempt}
}
const byId=rows=>rows.slice().sort((a,b)=>a.id-b.id)
function projection(np,now,target){
 const slug=target.targetSlug,cid=target.competitionId
 keys(np,['schemaVersion','kind','capturedUTC','method','databaseInventory','native','dependencySnapshotText','dependencySnapshotSha256','pricingSnapshot'],'SQL projection envelope')
 if(np.schemaVersion!==1||np.kind!=='fcf-future-native-projection'||np.method!=='explicitBEGIN_READ_ONLY_ROLLBACK'||now-stamp(np.capturedUTC,now,'SQL projection')>86400000||np.databaseInventory?.capturedUTC!==np.capturedUTC||np.databaseInventory?.method!==np.method)fail('fresh actual read-only SQL projection required')
 keys(np.pricingSnapshot,['snapshotText','snapshotSha256'],'SQL pricing snapshot')
 const dependency=exactText(np.dependencySnapshotText,np.dependencySnapshotSha256,'SQL dependency snapshot'),prices=exactText(np.pricingSnapshot.snapshotText,np.pricingSnapshot.snapshotSha256,'SQL pricing snapshot')
 keys(dependency,['schemaVersion','classification','native','catalog','shapes','relations','goalAssociations','privacy','pricingSnapshotText'],'SQL dependency snapshot')
 if(dependency.schemaVersion!==1||dependency.classification!=='fcf-future-projection-current-v1'||!same(dependency.native,np.native)||dependency.pricingSnapshotText!==np.pricingSnapshot.snapshotText||!Array.isArray(dependency.catalog)||!dependency.catalog.length||!object(dependency.shapes)||!Object.keys(dependency.shapes).length||!object(dependency.relations)||!Object.keys(dependency.relations).length||!Array.isArray(dependency.goalAssociations))fail('complete SQL dependency/native/pricing envelope differs')
 for(const [name,r]of Object.entries(dependency.relations)){
  keys(r,['count','rowsSha256','globalUser'],'SQL relation snapshot')
  if(!Object.hasOwn(dependency.shapes,name)||!Number.isSafeInteger(r.count)||r.count<0||!hex(r.rowsSha256,64)||typeof r.globalUser!=='boolean')fail('SQL relation count/hash/classification differs')
 }
 const d=np.databaseInventory,n=np.native,c=n?.competition
 if(!object(c)||c.id!==cid||c.slug!==slug||c.source!=='fcf'||c.source_league_code!==target.sourceCode||c.source_policy!=='es-fcf-six-reviewed-history-v1'||c.active!==false||c.sezona_koledarska!==false||c.prvi_fantasy_krog!==1||!Array.isArray(n.rounds)||!Array.isArray(n.matches)||!Array.isArray(d.rounds)||!Array.isArray(d.matches)||!same(byId(n.rounds),byId(d.rounds))||!same(byId(n.matches),byId(d.matches)))fail('actual post-import inactive seed1 native/inventory projection differs')
 const {capturedUTC,...privacy}=d.identityPrivacy??{}
 if(capturedUTC!==np.capturedUTC||!same(dependency.privacy,privacy))fail('SQL snapshot and mapper identity privacy differ')
 if(!hex(prices?.stateSha256,64)||!Array.isArray(prices.players)||!Array.isArray(d.players)||prices.players.length!==d.players.length)fail('complete current SQL player pricing state required')
 for(const p of prices.players){const native=d.players.filter(x=>x.id===p.id);if(native.length!==1||['id','competition_id','team_id','reg_st','position','position_source'].some(k=>native[0][k]!==p[k]))fail('SQL pricing and native player identities/positions differ')}
 return prices
}
function context(input,extra=[]){
 keys(input,[...fields,...extra,...(Object.hasOwn(input??{},'now')?['now']:[])],'future activation input')
 const now=Object.hasOwn(input,'now')?input.now:Date.now()
 if(!hex(input.sourceCommit,40)||!Number.isSafeInteger(now)||!Number.isFinite(new Date(now).getTime()))fail('exact G9 reviewed writer/current clock required')
 const origin=execution(input.execution,input.sourceCommit),{data,target}=readFcfFutureNativeSource({targetSlug:input.targetSlug,inventoryAdmission:input.inventoryAdmission,now}),slug=target.targetSlug,cid=target.competitionId
 if(!isVerifiedFcfFutureSixCleanupEvidence(input.cleanupEvidence)||input.cleanupEvidence.phase!=='applied')fail('reader-issued APPLIED future cleanup required')
 const prices=projection(input.nativeProjection,now,target),r=input.importReceipt
 keys(r,['id','competition_id','inventory_key','packet_sha256','source_fingerprint','cleanup_before_sha256','imported_state_sha256','stage','activation_result','created_at','rolloutText','rolloutSha256','currentActive','currentStateSha256','canonicalVerified'],'actual import receipt readback')
 if(!Number.isSafeInteger(r.id)||r.id<1||r.competition_id!==cid||r.stage!=='imported'||r.currentActive!==false||r.canonicalVerified!==false||r.activation_result!==null||!hex(r.inventory_key,64)||!hex(r.imported_state_sha256,64)||r.currentStateSha256!==prices.stateSha256||r.source_fingerprint!==data.binding.sourceFingerprintSha256||r.cleanup_before_sha256!==input.cleanupEvidence.beforeSha256)fail('actual imported/inactive receipt and current source/cleanup/pricing state differ')
 stamp(r.created_at,now,'import receipt')
 const imported=exactText(r.rolloutText,r.rolloutSha256,'original import rollout')
 if(r.packet_sha256!==imported.targetPacketSha256||r.source_fingerprint!==imported.inventoryBinding?.sourceFingerprintSha256||r.cleanup_before_sha256!==imported.cleanupBinding?.beforeSha256)fail('saved import packet/source/cleanup receipt bindings differ')
 const d=input.nativeProjection.databaseInventory
 // Import's writer/execution and PRE-import inventory remain their originals.
 // CURRENT native state is independently checked by replay, never substituted
 // into that immutable packet's before-image or relabeled as original evidence.
 replayFcfFutureTargetImportRollout({targetSlug:slug,sourceCommit:imported.sourceCommit,inventoryAdmission:input.inventoryAdmission,cleanupEvidence:input.cleanupEvidence,databaseInventory:d,existingExceptionBindings:d.existingExceptionBindings,execution:imported.execution,rolloutText:r.rolloutText,rolloutSha256:r.rolloutSha256,now})
 const expected=data.fixtures.filter(f=>f.statisticsStatus==='available').map(f=>f.id.slice(2)).sort(),current=d.groups.find(g=>g.slug===slug).nativeImportedIDs.slice().sort()
 if(!same(current,expected))fail('complete actual normal-report import required before activation data')
 const mapping=JSON.parse(imported.identityPlan.mappingText),launchInput={targetSlug:slug,competitionId:cid,sourceCode:target.sourceCode,season:'2026/27',sourceFingerprintSha256:data.binding.sourceFingerprintSha256,writerCommit:input.sourceCommit,fixtures:data.fixtures,mapping:mapping.fixtures,native:input.nativeProjection.native,now}
 return {now,origin,data,launchInput,target}
}
function packet(input,ctx,auditedUTC,proposal){
 const slug=ctx.target.targetSlug
 if(!validUTC(auditedUTC)||Date.parse(auditedUTC)>ctx.now||ctx.now-Date.parse(auditedUTC)>86400000)fail('original activation audit clock is stale/future')
 const launchProposal=proposal===undefined?selectFcfFutureLaunch(ctx.launchInput):verifyFcfFutureLaunch(ctx.launchInput,freeze(proposal))
 const readiness=buildFcfFutureTargetReadiness({targetSlug:slug,pricingSnapshot:input.nativeProjection.pricingSnapshot,replay:input.pricingReplay,modelSha256:fcfTargetPricingModelSha256(),sourceData:ctx.data,launchInput:ctx.launchInput,launchProposal,now:ctx.now})
 const manifest={schemaVersion:4,kind:'fcf-future-current-target-activation',targetSlug:slug,sourceCommit:input.sourceCommit,execution:ctx.origin,importReceiptId:String(input.importReceipt.id),importRolloutText:input.importReceipt.rolloutText,importRolloutSha256:input.importReceipt.rolloutSha256,nativeSnapshotText:input.nativeProjection.dependencySnapshotText,nativeSnapshotSha256:input.nativeProjection.dependencySnapshotSha256,launchProposal,readiness,auditedUTC},activationText=JSON.stringify(manifest)
 if(Buffer.byteLength(activationText)>limit)fail('bounded8MiB future activation packet required')
 return Object.freeze({activationText,activationSha256:hash(activationText)})
}
export function buildFcfFutureTargetActivation(input={}){
 const ctx=context(input)
 return packet(input,ctx,new Date(ctx.now).toISOString())
}
export function verifyFcfFutureTargetActivation(input={}){
 const ctx=context(input,['activationText','activationSha256']),a=exactText(input.activationText,input.activationSha256,'future activation packet')
 keys(a,wire,'future activation packet')
 if(!object(a.launchProposal)||a.schemaVersion!==4||a.kind!=='fcf-future-current-target-activation'||a.targetSlug!==ctx.target.targetSlug||a.sourceCommit!==input.sourceCommit||!same(a.execution,ctx.origin))fail('exact saved activation identity/origin execution required')
 const rebuilt=packet(input,ctx,a.auditedUTC,a.launchProposal)
 if(rebuilt.activationText!==input.activationText||rebuilt.activationSha256!==input.activationSha256)fail('activation packet differs from independently authenticated current inputs')
 return rebuilt
}
