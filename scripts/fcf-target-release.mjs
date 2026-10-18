// Separate v2 target compiler. No source/DB transport, importer or activation capability.
import {createHash} from 'node:crypto'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {isVerifiedFcfCleanupEvidence,getFcfCapturedTargetData} from './fcf-target-evidence.mjs'
import {FCF_HISTORICAL_GROUPS,proveFcfCurrentReleaseDocument,proveFcfG9FreshReleaseDocument,validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {fcfFinalAuditScope} from './fcf-final-audit.mjs'
const ids=Object.freeze({'es-ct-segona-g1':783,'es-ct-tercera-g2':790,'es-ct-tercera-g9':797})
const COMMIT=/^[a-f0-9]{40}$/,SHA=/^[a-f0-9]{64}$/,ID=/^[1-9]\d{0,19}$/
const hash=text=>createHash('sha256').update(text).digest('hex')
const fail=message=>{throw Error(`FCF_TARGET_RELEASE: ${message}`)}
const jsonEqual=(a,b)=>historicalStatisticsPolicySha256(a)===historicalStatisticsPolicySha256(b)
/** Pure scope validation, not cleanup authorization; compiler additionally requires reader-issued cleanup evidence. */
export function validateFcfTargetReleaseInventory({targetSlug,databaseInventory:d,cleanupPhase,now=Date.now()}){
 const captured=Date.parse(d?.capturedUTC)
 if(!FCF_HISTORICAL_GROUPS.includes(targetSlug)||!['prepared','applied'].includes(cleanupPhase)||!Number.isFinite(now)||d?.method!=='explicitBEGIN_READ_ONLY_ROLLBACK'||!Number.isFinite(captured)||captured>now||now-captured>24*3600000||!Array.isArray(d.groups)||d.groups.length!==3||new Set(d.groups.map(c=>c?.slug)).size!==3)fail('fresh exact all-three read-only inventory and target scope required')
 const groups=FCF_HISTORICAL_GROUPS.map(slug=>{
  const c=d.groups.find(c=>c?.slug===slug),scope=fcfFinalAuditScope(slug),[start,end]=scope.code.split('-').map(Number)
  if(!c||c.id!==ids[slug]||c.source!=='fcf'||c.sourceLeagueCode!==scope.code||c.sezona_koledarska!==false||typeof c.active!=='boolean'||!Object.hasOwn(c,'source_policy')||!Array.isArray(c.nativeImportedIDs)||new Set(c.nativeImportedIDs).size!==c.nativeImportedIDs.length||c.nativeImportedIDs.some(id=>typeof id!=='string'||!ID.test(id)||Number(id)<start||Number(id)>end))fail('all-three immutable source/calendar/native-ID inventory differs')
  if(slug===targetSlug&&c.active!==false)fail('selected target must remain inactive')
  if(cleanupPhase==='prepared'&&(c.active!==false||c.source_policy!==null))fail('prepared cleanup requires all-three inactive/null-policy inventory')
  if(cleanupPhase==='applied'&&c.source_policy!=='es-fcf-reviewed-history-v1')fail('applied cleanup requires installed reviewed policies')
  // Read only source identity/state. Non-target prices, round choices, user activity
  // and any normal-report properties neither block nor become readiness evidence.
  return{id:c.id,slug,active:c.active,source:c.source,sourceLeagueCode:c.sourceLeagueCode,sezona_koledarska:c.sezona_koledarska,source_policy:c.source_policy,nativeImportedIDs:[...c.nativeImportedIDs]}
 })
 const inventory={capturedUTC:d.capturedUTC,method:d.method,groups}
 for(const field of['scopeRefreshedUTC','scopeRefreshMethod'])if(Object.hasOwn(d,field)){
  if(typeof d[field]!=='string'||field==='scopeRefreshedUTC'&&(!Number.isFinite(Date.parse(d[field]))||Date.parse(d[field])>now))fail('original read-only capture metadata differs')
  inventory[field]=d[field]
 }
 return{inventory,target:groups.find(c=>c.slug===targetSlug)}
}
function cleanupBinding(e,now){
 if(!isVerifiedFcfCleanupEvidence(e))fail('reader-issued exact-four cleanup evidence required')
 const captured=Date.parse(e.preparedUTC)
 if(!Number.isFinite(captured)||captured>now||e.phase==='prepared'&&now-captured>24*3600000)fail('prepared cleanup proof is stale/future')
 if(typeof e.beforeImageText!=='string'||hash(e.beforeImageText)!==e.beforeSha256)fail('opaque cleanup TEXT/SHA differs')
 return{phase:e.phase,sourceCommit:e.sourceCommit,preparedUTC:e.preparedUTC,beforeImageText:e.beforeImageText,beforeSha256:e.beforeSha256,policyHashes:e.policyHashes,originals:e.originals.map(({html,...descriptor})=>descriptor),prepareArtifact:e.prepareArtifact,appliedReceipt:e.appliedReceipt}
}
function targetDocuments(targetSlug,e,now){
 // The new branch requires terminal parent, offline audit, final receipt and
 // consumed source claim through the authenticated reader-issued capability.
 // Never relabel its workflow or trust a caller-written verified flag here.
 if(e?.evidenceKind==='fcf-missing-target-inventory'){try{return new Map(getFcfCapturedTargetData({targetEvidence:e,targetSlug,now}).documents.map(d=>[d.id,d]))}catch(error){fail(`inventory target admission failed: ${error.message}`)}}
 if(!e||e.evidenceKind!=='fcf-target-cache-audit'||e.targetSlug!==targetSlug||Object.keys(e).sort().join(',')!=='competition,documents,evidenceKind,targetSlug'||!Array.isArray(e.documents)||e.documents.length!==240)fail('one exact cache/audit target evidence set required')
 const scope=fcfFinalAuditScope(targetSlug),[start,end]=scope.code.split('-').map(Number),documents=new Map()
 for(const d of e.documents){
  if(!d||typeof d.id!=='string'||!ID.test(d.id)||Number(d.id)<start||Number(d.id)>end||documents.has(d.id))fail('foreign/missing/duplicate target source document')
  documents.set(d.id,d)
 }
 return documents
}
function compile(input={},auditedUTC){
 const{targetSlug,sourceCommit,targetEvidence,cleanupEvidence,databaseInventory,now=Date.now()}=input
 if(!FCF_HISTORICAL_GROUPS.includes(targetSlug)||!COMMIT.test(sourceCommit??'')||!Number.isFinite(now))fail('exact allowlisted target/main/audit clock required')
 const binding=cleanupBinding(cleanupEvidence,now),{inventory,target}=validateFcfTargetReleaseInventory({targetSlug,databaseInventory,cleanupPhase:binding.phase,now}),documents=targetDocuments(targetSlug,targetEvidence,now)
 auditedUTC??=new Date(now).toISOString()
 const audit=Date.parse(auditedUTC)
 if(!Number.isFinite(audit)||audit>now||now-audit>24*3600000)fail('target packet audit is stale/future')
 const c=targetEvidence.competition,scope=fcfFinalAuditScope(targetSlug),policy=getHistoricalStatisticsPolicy(targetSlug)
 if(!c||c.id!==target.id||c.slug!==targetSlug||c.source!=='fcf'||c.source_league_code!==scope.code||c.source_policy!==policy.sourcePolicy||c.active!==false||c.sezona_koledarska!==false||c.firstFantasyPlayedOn!=='2026-10-24')fail('exact inactive target source/policy/current competition required')
 const admitted=targetEvidence.evidenceKind==='fcf-missing-target-inventory'?getFcfCapturedTargetData({targetEvidence,targetSlug,now}):null,freshG9=admitted?.binding.protocol==='g9-only-after-held-parent-v1'
 const[start,end]=scope.code.split('-').map(Number),fixtures=[];let bytes=0
 for(let numeric=start;numeric<=end;numeric++){
  const id=String(numeric),document=documents.get(id),historical=cleanupEvidence.originals.find(o=>o.sourceMatchId===id)
  if(historical&&(historical.competitionSlug!==targetSlug||document.html!==historical.html||(!freshG9&&!jsonEqual(document.receipt,historical.receipt))))fail('target marker must bind the same immutable cleanup original')
  const fixture=(freshG9?proveFcfG9FreshReleaseDocument:proveFcfCurrentReleaseDocument)({competition:c,document,now})
  bytes+=fixture.source.bytes;if(bytes>192*1024*1024)fail('bounded expanded target source set exceeded')
  fixtures.push(fixture)
 }
 const unavailable=fixtures.filter(f=>f.statisticsStatus==='unavailable_historical').map(f=>f.id.slice(2)).sort()
 if(!jsonEqual(unavailable,policy.entries.map(e=>e.sourceMatchId).sort()))fail('exact target historical marker set differs')
 const byId=new Map(fixtures.map(f=>[f.id,f]))
 if(target.nativeImportedIDs.some(id=>byId.get(`es${id}`)?.statisticsStatus==='pending'||!byId.has(`es${id}`)))fail('known imported target report cannot be missing or downgraded to pending')
 const r6=fixtures.filter(f=>f.round===6)
 if(r6.length!==8||r6.some(f=>f.statisticsStatus!=='pending')||r6.map(f=>f.date).sort()[0]!==c.firstFantasyPlayedOn)fail('genuine future first target fantasy R6 required')
 const canonical={...(admitted?{sourceEvidence:admitted.binding}:{}),competitionId:c.id,competitionSlug:targetSlug,sourceCode:scope.code,season:'2026/27',firstFantasyPlayedOn:c.firstFantasyPlayedOn,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),...validateFcfCurrentReleaseCalendar(fixtures),fixtures}
 const manifest={schemaVersion:2,kind:'fcf-current-target-release',targetSlug,sourceCommit,auditedUTC,cleanupBinding:binding,databaseInventory:inventory,target:canonical},manifestText=JSON.stringify(manifest)
 if(Buffer.byteLength(manifestText)>8*1024*1024)fail('bounded target canonical manifest size exceeded')
 return{manifestText,manifestSha256:hash(manifestText)}
}
/** Cache/audit documents still require the separately reviewed authenticated reader/composer seam before execution. */
export const compileFcfTargetReleasePacket=input=>compile(input)
export function verifyFcfTargetReleasePacket(input={}){
 const{manifestText,manifestSha256}=input
 if(typeof manifestText!=='string'||Buffer.byteLength(manifestText)>8*1024*1024||!SHA.test(manifestSha256??'')||hash(manifestText)!==manifestSha256)fail('exact target packet TEXT/SHA differs')
 let manifest
 try{manifest=JSON.parse(manifestText)}catch{fail('invalid target packet JSON')}
 if(manifest?.schemaVersion!==2||manifest.kind!=='fcf-current-target-release'||manifest.targetSlug!==input.targetSlug||Object.keys(manifest).sort().join(',')!=='auditedUTC,cleanupBinding,databaseInventory,kind,schemaVersion,sourceCommit,target,targetSlug')fail('separate v2 single-target packet protocol required')
 const rebuilt=compile(input,manifest.auditedUTC)
 if(rebuilt.manifestText!==manifestText||rebuilt.manifestSha256!==manifestSha256)fail('target packet differs from independently reparsed source canonicals')
 return rebuilt
}
