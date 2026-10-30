// Cut1 only: private G9 source + APPLIED cleanup -> deterministic proposal DATA.
// No importer, pricing, activation, workflow, source requests or capability issuer.
import {createHash} from 'node:crypto'
import {getFcfG9Native800Source,FCF_G9_NATIVE800_PROTOCOL} from './fcf-g9-native800-source.mjs'
import {isVerifiedFcfFutureSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {planFcfNativeMapping,verifyFcfNativeMappingProposal,planFcfNativeTargetRows} from './fcf-target-native-plan.mjs'
import {getFcfSixPolicy,fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
import {validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {describeFcfG9Native800Preparation} from './fcf-g9-native800-prepare.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const slug='es-ct-tercera-g9',protocol='fcf-native800-v1',sha=t=>createHash('sha256').update(t).digest('hex'),clone=structuredClone,need=(v,m)=>{if(!v)throw Error('FCF_G9_NATIVE800_PACKET: '+m)},flags={admissible:false,nativeAdmission:false,activationEligible:false},inputs=['sourceProof','cleanupEvidence','nativePreparation','execution']
function cleanup(e,data,d){
 need(isVerifiedFcfFutureSixCleanupEvidence(e)&&e.phase==='applied'&&e.sourceCommit===data.cleanupIssuerSourceCommit,'reader-issued APPLIED original DA cleanup required')
 need(typeof e.beforeImageText==='string'&&sha(e.beforeImageText)===e.beforeSha256&&hash(e.policyHashes)===hash(fcfSixPolicyIdHashes())&&e.appliedReceipt?.result?.beforeSha256===e.beforeSha256,'exact immutable six cleanup TEXT/SHA/policies/receipt')
 const expected=e.appliedReceipt.markers,actual=d.installedMarkers?.flatMap(b=>b.markers??[]);need(expected?.length===6&&actual?.length===6&&new Set(actual.map(m=>m.sourceMatchId)).size===6&&actual.every(m=>expected.some(x=>x.sourceMatchId===m.sourceMatchId&&hash(x)===hash(m))),'complete actual six installed markers equal APPLIED receipt')
 need(e.originals?.length===6&&new Set(e.originals.map(o=>o.sourceMatchId)).size===6,'all six original cleanup descriptors')
 const policy=getFcfSixPolicy(slug),historical=data.fixtures.filter(f=>f.statisticsStatus==='unavailable_historical');need(hash(historical.map(f=>f.id.slice(2)).sort())===hash(policy.entries.map(e=>e.sourceMatchId).sort()),'only three approved G9 exclusions')
 for(const f of historical){const o=e.originals.find(o=>o.sourceMatchId===f.id.slice(2)),entry=policy.entries.find(e=>e.sourceMatchId===f.id.slice(2));need(o&&o.competitionSlug===slug&&o.policyId===policy.id&&o.policySha256===hash(policy)&&o.receipt?.rawSha256===entry.rawSha256&&hash(o.fixture)===hash(f.sourceFixture)&&f.source?.historicalObservation?.approvedOriginalSha256===entry.rawSha256,'fresh G9 historical observation must retain original cleanup authority')}
 return clone({phase:e.phase,sourceCommit:e.sourceCommit,preparedUTC:e.preparedUTC,beforeImageText:e.beforeImageText,beforeSha256:e.beforeSha256,policyHashes:e.policyHashes,originals:e.originals.map(({html,...o})=>o),prepareArtifact:e.prepareArtifact,appliedReceipt:e.appliedReceipt})
}
function context(input){
 exactKeys(input,inputs,'native800 G9 packet input');const data=getFcfG9Native800Source(input.sourceProof),e=input.execution
 exactKeys(e,['repository','ref','commit','runId','runAttempt'],'native execution DATA')
 need(e.repository==='Lovro-splichal-orhanizagi/mnzgorenjska'&&e.ref==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(e.commit??'')&&typeof e.runId==='string'&&/^[1-9]\d{0,19}$/.test(e.runId)&&e.runAttempt==='1','exact main/attempt1 native execution DATA')
 need(data.targetSlug===slug&&data.competitionId===797&&data.binding.protocol===FCF_G9_NATIVE800_PROTOCOL&&data.binding.maximumSourceGETs===800,'actual distinct G9 native800 source binding')
 exactKeys(input.nativePreparation,['projection','scoreBeforeimages','admissible','nativeAdmission','activationEligible'],'readonly preparation DATA');need(['admissible','nativeAdmission','activationEligible'].every(k=>input.nativePreparation[k]===false),'preparation confers no admission authority')
 const {projection:p,scoreBeforeimages}=describeFcfG9Native800Preparation({projection:input.nativePreparation.projection,scoreBeforeimages:input.nativePreparation.scoreBeforeimages}),d=p.databaseInventory,binding=cleanup(input.cleanupEvidence,data,d)
 need(Date.parse(p.capturedUTC)>=Date.parse(data.currentCapture.lastSourceEndedUTC),'fresh native observation must follow complete source capture')
 const imported=d.groups?.find(g=>g.slug===slug)?.nativeImportedIDs;need(Array.isArray(imported)&&imported.every(id=>data.fixtures.some(f=>f.id==='es'+id&&f.statisticsStatus!=='pending')),'known imported G9 reports cannot disappear or downgrade to pending')
 const native={targetSlug:slug,sourceData:data,databaseInventory:d,existingExceptionBindings:d.existingExceptionBindings,writerCommit:e.commit,now:Date.parse(p.capturedUTC)},mapping=planFcfNativeMapping(native)
 verifyFcfNativeMappingProposal({...native,...{proposalText:mapping.proposalText,proposalSha256:mapping.proposalSha256}});planFcfNativeTargetRows(native)
 const calendar=validateFcfCurrentReleaseCalendar(data.fixtures);need(hash(calendar.clubs)===hash(data.clubs)&&hash(calendar.verifiedKeeperClubs)===hash(data.verifiedKeeperClubs),'unchanged whole calendar and official keepers')
 return {data,e,p,d,binding,mapping,calendar,scoreBeforeimages}
}
function compile(input){
 const c=context(input),policy=getFcfSixPolicy(slug),packet={schemaVersion:1,kind:'fcf-native800-import-packet',protocol,targetSlug:slug,sourceCommit:c.e.commit,captureSourceCommit:c.data.binding.sourceCommit,auditedUTC:c.p.capturedUTC,cleanupBinding:c.binding,databaseInventory:c.d,target:{sourceEvidence:c.data.binding,competitionId:797,competitionSlug:slug,sourceCode:'4118349-4118588',season:'2026/27',historicalCutline:'2026-10-24',policyId:policy.id,policySha256:hash(policy),...c.calendar,fixtures:c.data.fixtures},scoreBeforeimages:c.scoreBeforeimages,nativeSnapshotText:c.p.dependencySnapshotText,nativeSnapshotSha256:c.p.dependencySnapshotSha256},manifestText=JSON.stringify(packet)
 need(Buffer.byteLength(manifestText)<=8388608,'bounded8MiB full packet; never truncate beforeimage')
 const current=getFcfG9Native800Source(input.sourceProof);need(hash(current.binding)===hash(c.data.binding),'private source/capture changed while planning')
 return {c,packet,manifestText,manifestSha256:sha(manifestText)}
}
export function compileFcfG9Native800ImportPacket(input){const{manifestText,manifestSha256}=compile(input);return frozenJSON({manifestText,manifestSha256,...flags})}
export function buildFcfG9Native800ImportRollout(input){
 const {c,manifestText,manifestSha256}=compile(input),rollout={schemaVersion:1,kind:'fcf-native800-import-rollout',protocol,targetSlug:slug,sourceCommit:c.e.commit,execution:clone(c.e),targetPacketText:manifestText,targetPacketSha256:manifestSha256,inventoryBinding:clone(c.data.binding),cleanupBinding:c.binding,identityPlan:{mappingText:c.mapping.proposalText,mappingSha256:c.mapping.proposalSha256},scoreBeforeimages:c.scoreBeforeimages,nativeSnapshotText:c.p.dependencySnapshotText,nativeSnapshotSha256:c.p.dependencySnapshotSha256,readiness:null},rolloutText=JSON.stringify(rollout)
 need(Buffer.byteLength(rolloutText)<=8388608,'bounded8MiB full rollout; never truncate beforeimage');return frozenJSON({rolloutText,rolloutSha256:sha(rolloutText),...flags})
}
export function verifyFcfG9Native800ImportRollout(input){
 exactKeys(input,[...inputs,'rolloutText','rolloutSha256'],'native800 G9 replay input');need(typeof input.rolloutText==='string'&&Buffer.byteLength(input.rolloutText)<=8388608&&sha(input.rolloutText)===input.rolloutSha256,'exact rollout TEXT/SHA')
 const rebuilt=buildFcfG9Native800ImportRollout(Object.fromEntries(inputs.map(k=>[k,input[k]])));need(rebuilt.rolloutText===input.rolloutText&&rebuilt.rolloutSha256===input.rolloutSha256,'full independently rebuilt source/native/cleanup rollout differs');return rebuilt
}
