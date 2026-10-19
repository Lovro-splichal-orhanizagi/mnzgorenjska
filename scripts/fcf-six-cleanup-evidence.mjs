// Offline authenticated artifact consumers. No source, GitHub or DB transport on import/use.
import {readFileSync} from 'node:fs'
import {verifyArtifact,unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
import {historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {getFcfSixPolicy as getHistoricalStatisticsPolicy,fcfSixPolicyIdHashes,classifyFcfSixHistoricalStatistics,verifyFcfSixInstalledHistoricalMarker as verifyFcfInstalledHistoricalMarker} from './fcf-six-historical-policy.mjs'
import {readFcfCleanupOriginalStage} from './fcf-target-stage-evidence.mjs'
import {requireFcfSixAccounting,getFcfSixRetainedDocuments} from './fcf-six-accounting.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
const ID=/^[1-9]\d{0,19}$/,SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/
const fail=message=>{throw Error(`FCF_TARGET_EVIDENCE: ${message}`)}
const targets=[
 ['4109388',321646,783,'es-ct-segona-g1','4109388-4109627',28706,1,8574,8575,31,4],
 ['4116215',297199,790,'es-ct-tercera-g2','4116188-4116427',27227,4,8195,8188,33,4],
 ['4118352',306164,797,'es-ct-tercera-g9','4118349-4118588',27616,1,8304,8305,32,5],
 ['4118354',306166,797,'es-ct-tercera-g9','4118349-4118588',27616,1,7566,8308,31,4],
 ['4118358',306171,797,'es-ct-tercera-g9','4118349-4118588',27617,2,8301,8298,30,1],
].map(([id,matchId,competitionId,slug,code,roundId,round,homeTeamId,awayTeamId,appearances,goals])=>({id,matchId,competitionId,slug,code,roundId,round,homeTeamId,awayTeamId,appearances,goals}))
const receipts=JSON.parse(readFileSync(new URL('./vzorci/fcf-reviewed-history/receipts.json',import.meta.url),'utf8'))
const started={'4109388':'2026-10-18T12:31:53.340Z','4116215':'2026-10-18T12:31:49.885Z','4118352':'2026-10-18T12:32:03.718Z','4118358':'2026-10-18T12:32:07.176Z'}
const policies=[...new Set(targets.map(t=>t.slug))].map(getHistoricalStatisticsPolicy)
const policyHashes=Object.fromEntries(policies.map(p=>[p.id,historicalStatisticsPolicySha256(p)]))
const verifiedCleanup=new WeakSet(),originalAuthorities=new WeakMap()
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
const jsonEqual=(a,b)=>historicalStatisticsPolicySha256(a)===historicalStatisticsPolicySha256(b)
function keys(value,expected,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==expected.split(',').sort().join(','))fail(`${label} fields differ`)
}
function utf8(bytes,label){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)fail(`${label} bytes/BOM differ`)
 const text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail(`${label} invalid UTF8`)
 return text
}
function json(bytes,label){try{return JSON.parse(utf8(bytes,label))}catch(error){fail(`${label} invalid JSON: ${error.message}`)}}
function authenticate(kind,zipBytes,metadata,expected){
 if(!Buffer.isBuffer(zipBytes)||!metadata||!expected||!['runId','runAttempt','artifactId'].every(k=>typeof expected[k]==='string'&&ID.test(expected[k]))||!COMMIT.test(expected.commit??'')||!/^sha256:[a-f0-9]{64}$/.test(expected.artifactDigest??''))fail('explicit artifact ZIP/expected identity required')
 const{artifact,run,jobs}=metadata,jobName=kind==='prepared'?'cleanup-prepare':'cleanup-apply'
 if(!Number.isSafeInteger(run?.id)||String(run.id)!==expected.runId||!Number.isSafeInteger(run.run_attempt)||String(run.run_attempt)!==expected.runAttempt||run.repository?.full_name!==repository||run.path!==workflow||run.event!=='workflow_dispatch'||run.head_branch!=='main'||run.head_sha!==expected.commit||run.status!=='completed'||run.conclusion!=='success'||!Array.isArray(jobs))fail('exact successful main artifact execution required')
 const selected=jobs.filter(j=>j.name===jobName),job=selected[0]
 if(selected.length!==1||!Number.isSafeInteger(job?.id)||job.id<1||String(job.run_id)!==expected.runId||job.run_attempt!==run.run_attempt||job.head_sha!==expected.commit||job.status!=='completed'||job.conclusion!=='success'||!Array.isArray(job.steps))fail('exact same-record job execution/attempt required')
 const steps=kind==='prepared'?['Prepare exact six FCF cleanup before-image','Retain exact FCF cleanup before-image']:['Apply exact six FCF cleanup','Retain exact FCF cleanup receipt']
 for(const name of steps){const matches=job.steps.filter(s=>s.name===name);if(matches.length!==1||matches[0].status!=='completed'||matches[0].conclusion!=='success')fail('exact successful cleanup step required')}
 let identity
 try{identity=verifyArtifact(artifact,{runId:expected.runId,commit:expected.commit,name:`fcf-history-cleanup-${kind}-${expected.runId}-${expected.runAttempt}`})}catch(error){fail(`artifact identity: ${error.message}`)}
 if(identity.id!==expected.artifactId||identity.digest!==expected.artifactDigest||zipBytes.length!==identity.size)fail('artifact ZIP size/expected digest identity differs')
 const files=unpackVerifiedArchive(zipBytes,identity.digest,`fcf-six-cleanup-${kind}`)
 const names=kind==='prepared'?['manifest.json','before-image.json',...allIds.map(id=>`acta-${id}.html`)]:['manifest.json']
 if(files.size!==names.length||names.some(name=>!files.has(name)))fail('complete cleanup artifact member set required')
 const manifest=json(files.get('manifest.json'),'cleanup manifest')
 const expectedExecution={repository,ref:'refs/heads/main',commit:expected.commit,runId:expected.runId,runAttempt:expected.runAttempt}
 if(manifest.schemaVersion!==2||manifest.kind!==`fcf-exact-six-cleanup-${kind}`||manifest.sourceCommit!==expected.commit||!jsonEqual(manifest.execution,expectedExecution))fail('cleanup manifest execution binding differs')
 keys(manifest,kind==='prepared'?'schemaVersion,kind,sourceCommit,capturedUTC,execution,beforeSha256,policyHashes,originals':'schemaVersion,kind,sourceCommit,execution,prepareArtifactId,prepareArtifactDigest,beforeSha256,policyHashes,result,markers','cleanup manifest')
 if(!jsonEqual(manifest.policyHashes,policyHashes))fail('exact three cleanup policy hashes required')
 return{files,manifest,identity:{...identity,runId:expected.runId,runAttempt:expected.runAttempt,commit:expected.commit}}
}
function backupText(files,m){
 const text=utf8(files.get('before-image.json'),'before-image')
 if(!SHA.test(m.beforeSha256??'')||sha256(Buffer.from(text))!==m.beforeSha256)fail('before-image TEXT/SHA differs')
 const image=json(files.get('before-image.json'),'before-image')
 const arrays=['competitions','rounds','matches','teams','players','appearances','goals','otherAppearances','otherGoals','otherScores','player_scores','statistika_igralcev','tocke_krogov','uradne_odsotnosti','profil_igralca_plus']
 keys(image,['schemaVersion','mainCommit','policyHashes','missing4109404','empty4109404Placeholder','installedPolicies','markers','bindings',...arrays].join(','),'before-image capture')
 if(image.schemaVersion!==2||image.mainCommit!==m.sourceCommit||!jsonEqual(image.policyHashes,policyHashes)||arrays.some(k=>!Array.isArray(image[k])||image[k].some(r=>!r||typeof r!=='object'||Array.isArray(r))))fail('before-image capture schema/policy/array differs')
 if(image.missing4109404!==true||image.empty4109404Placeholder!==true||!Array.isArray(image.installedPolicies)||image.installedPolicies.length||!Array.isArray(image.markers)||image.markers.length||!Array.isArray(image.bindings)||image.matches.some(m=>m.zapisnik_id==='es4109404'||m.source_url==='https://www.fcf.cat/ca/competicio/acta/4109404'))fail('exact report absence/no installed markers required');
 const placeholders=image.matches.filter(m=>m.id===321663),placeholder=placeholders[0];if(placeholders.length!==1||placeholder.round_id!==28708||placeholder.home_team_id!==8575||placeholder.away_team_id!==8576||placeholder.played_on!=='2026-10-04'||placeholder.home_goals!==0||placeholder.away_goals!==0||placeholder.imported_at!==null||placeholder.zapisnik_id!==null||placeholder.source_url!=='https://www.fcf.cat/ca/competicio/acta/4109388'||placeholder.kontumacija!==false||placeholder.vir_brez_izida!==true||placeholder.source_phase!==null||placeholder.source_round!==null||!jsonEqual(placeholder.import_warnings,[])||placeholder.statistics_status!=='available'||placeholder.statistics_reason!==null||!image.rounds.some(r=>r.id===28708&&r.competition_id===783&&r.number===3&&r.season==='2026/27')||image.matches.filter(m=>m.round_id===28708&&m.home_team_id===8575&&m.away_team_id===8576).length!==1||['appearances','goals','otherAppearances','otherGoals'].some(k=>image[k].some(r=>r.match_id===321663)))fail('exact empty native321663 placeholder required');
 if(image.competitions.length!==3||new Set(image.competitions.map(c=>c.id)).size!==3)fail('exact three before-image competitions required')
 for(const target of targets){
  const{competitionId,slug,code,matchId,roundId,round,homeTeamId,awayTeamId,id}=target,c=image.competitions.find(c=>c.id===competitionId),r=image.rounds.find(r=>r.id===roundId),matches=image.matches.filter(m=>m.id===matchId),match=matches[0],entry=getHistoricalStatisticsPolicy(slug).entries.find(e=>e.sourceMatchId===id)
  if(!c||c.slug!==slug||c.source!=='fcf'||c.source_league_code!==code||c.sezona_koledarska!==false||c.active!==false||c.source_policy!==null||c.prvi_fantasy_krog!==6)fail('before-image inactive competition scope differs')
  if(!r||r.competition_id!==competitionId||r.number!==round||r.season!=='2026/27'||image.rounds.filter(r=>r.id===roundId).length!==1)fail('before-image exact target round differs')
  if(matches.length!==1||match.round_id!==roundId||match.home_team_id!==homeTeamId||match.away_team_id!==awayTeamId||match.played_on!==entry.playedOn||match.home_goals!==entry.observedHomeScore||match.away_goals!==entry.observedAwayScore||match.zapisnik_id!==`es${id}`||match.source_url!==entry.sourceUrl||typeof match.imported_at!=='string'||!Number.isFinite(Date.parse(match.imported_at))||match.statistics_status!=='available'||match.statistics_reason!==null||match.kontumacija!==false||match.vir_brez_izida!==false||match.source_phase!==null||![null,round].includes(match.source_round))fail('before-image exact original target match differs')
  if(image.appearances.filter(a=>a.match_id===matchId).length!==target.appearances||image.goals.filter(g=>g.match_id===matchId).length!==target.goals)fail('before-image exact target individual counts differ')
 }
 if(image.appearances.length!==157||image.goals.length!==18)fail('before-image exact157/18 individual set required')
 historicalStatisticsPolicySha256(image) // Reject nonfinite JSON without regenerating text.
 return text
}
function originalDocuments(m,files,originalsProof){const original=originalAuthorities.get(originalsProof);if(!original||!jsonEqual(m.originals,original.descriptors))fail('reader-issued six originals and exact descriptors required');return original.descriptors.map(d=>{const bytes=files.get(`acta-${d.sourceMatchId}.html`),expected=original.originals.get(d.sourceMatchId);if(!Buffer.isBuffer(bytes)||!bytes.equals(expected)||sha256(bytes)!==d.receipt.rawSha256)fail('six original bytes differ');return{...structuredClone(d),html:utf8(bytes,'six original')}})}
/** Distinct prepare/apply runs are individually authenticated and linked by immutable artifact identity. */
export function readFcfSixCleanupEvidence(input){
 if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['prepareZipBytes','prepareMetadata','appliedZipBytes','appliedMetadata','expected','originalsProof','now'].includes(k)))fail('complete authenticated cleanup transport inputs required')
 const{prepareZipBytes,prepareMetadata,appliedZipBytes,appliedMetadata,expected,originalsProof,now=Date.now()}=input
 if(!Number.isFinite(now))fail('finite audit clock required')
 const hasApplied=appliedZipBytes!==undefined||appliedMetadata!==undefined||expected?.applied!==undefined
 if(hasApplied&&(!Buffer.isBuffer(appliedZipBytes)||!appliedMetadata||!expected?.applied))fail('complete applied artifact record required')
 const prepared=authenticate('prepared',prepareZipBytes,prepareMetadata,expected?.prepare),m=prepared.manifest,stamp=Date.parse(m.capturedUTC)
 if(!Number.isFinite(stamp)||stamp>now||!hasApplied&&now-stamp>24*3600000)fail('fresh original prepare capture timestamp required')
 const beforeImageText=backupText(prepared.files,m),sourceOriginals=originalDocuments(m,prepared.files,originalsProof)
 let appliedReceipt=null
 if(hasApplied){
  const applied=authenticate('applied',appliedZipBytes,appliedMetadata,expected.applied),a=applied.manifest
  if(a.sourceCommit!==m.sourceCommit||a.prepareArtifactId!==prepared.identity.id||a.prepareArtifactDigest!==prepared.identity.digest||a.beforeSha256!==m.beforeSha256)fail('applied artifact does not bind exact immutable prepare receipt')
  const r=a.result
  keys(r,'schemaVersion,mainCommit,beforeSha256,removedAppearances,removedGoals,unavailableMatches,afterSha256','applied cleanup result')
  if(r.schemaVersion!==2||r.mainCommit!==m.sourceCommit||r.beforeSha256!==m.beforeSha256||r.removedAppearances!==157||r.removedGoals!==18||r.unavailableMatches!==6||!SHA.test(r.afterSha256??''))fail('applied exact157/18/six cleanup result differs')
  if(!Array.isArray(a.markers)||a.markers.length!==6||new Set(a.markers.map(m=>m.sourceMatchId)).size!==6)fail('applied exact six installed markers required')
  for(const t of targets){
   const marker=a.markers.find(m=>m.sourceMatchId===t.id),policy=getHistoricalStatisticsPolicy(t.slug)
   if(!marker||marker.matchId!==t.matchId||marker.roundId!==t.roundId||marker.homeTeamId!==t.homeTeamId||marker.awayTeamId!==t.awayTeamId)fail('applied exact native/database marker differs')
   verifyFcfInstalledHistoricalMarker({competition:{slug:t.slug,source:'fcf',source_policy:policy.sourcePolicy,firstFantasyPlayedOn:'2026-10-24'},marker})
  }
  const unknown=a.markers.find(m=>m.sourceMatchId==='4109404');if(!unknown||unknown.matchId!==321663||unknown.roundId!==28708||unknown.homeTeamId!==8575||unknown.awayTeamId!==8576)fail('exact unknown native teams required');verifyFcfInstalledHistoricalMarker({competition:{slug:'es-ct-segona-g1',source:'fcf',source_policy:'es-fcf-six-reviewed-history-v1',firstFantasyPlayedOn:'2026-10-24'},marker:unknown});
  appliedReceipt={artifact:applied.identity,result:r,markers:a.markers}
 }
 const proof=freeze({phase:appliedReceipt?'applied':'prepared',sourceCommit:m.sourceCommit,preparedUTC:m.capturedUTC,beforeImageText,beforeSha256:m.beforeSha256,policyHashes:{...policyHashes},originals:sourceOriginals,prepareArtifact:prepared.identity,appliedReceipt})
 verifiedCleanup.add(proof);return proof
}
/** Consumers must receive the reader's object, never an asserted verified/phase flag. */
export const isVerifiedFcfSixCleanupEvidence=value=>!!value&&verifiedCleanup.has(value)


const allIds=['4109388','4109404','4116215','4118352','4118354','4118358'];
/** Reauthenticate unchanged original-four authorization plus reader-issued consumed diagnostics. */
export function readFcfSixCleanupOriginals({legacy,historyProof,now=Date.now()}){const history=requireFcfSixAccounting(historyProof),pins={runId:'39170210064',runAttempt:'1',commit:'afffc5c9ca0a8828c54825578dcdfe8bb597ab3f',artifactId:'12152536127',artifactDigest:'sha256:4c2a3e83208fd82fa9359b605d4a9f1876e2450c5f7d0c2a7604a25462fbfb86'};if(!Number.isFinite(now)||!jsonEqual(Object.fromEntries(Object.keys(pins).map(k=>[k,legacy?.expected?.[k]])),pins))fail('unchanged actual four-original authorization required');const old=readFcfCleanupOriginalStage({...legacy,now}),raw=new Map([...old.originals].map(([id,b])=>[id,Buffer.from(b)])),rows=getFcfSixRetainedDocuments(history);for(const id of ['4109404','4118354']){const d=rows.find(d=>d.id===id);if(!d)fail('exact diagnostic original missing');raw.set(id,d.bytesBuffer)}const descriptors=allIds.map(id=>{const p=['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'].map(getHistoricalStatisticsPolicy).find(p=>p.entries.some(e=>e.sourceMatchId===id)),e=p.entries.find(e=>e.sourceMatchId===id),oldDescriptor=old.descriptors.find(d=>d.sourceMatchId===id),row=rows.find(d=>d.id===id),r=oldDescriptor?.receipt??{id,competitionSlug:p.competitionSlug,sourceUrl:e.sourceUrl,bytes:row.bytes,rawSha256:row.rawSha256,startedUTC:row.receipt.startedUTC,capturedUTC:row.receipt.capturedUTC,cacheMtimeUTC:null};if(Date.parse(r.capturedUTC)>now)fail('future genuine original receipt');const classified=classifyFcfSixHistoricalStatistics({competition:{slug:p.competitionSlug,source:'fcf',source_policy:p.sourcePolicy,firstFantasyPlayedOn:'2026-10-24'},id,html:raw.get(id).toString('utf8')});return{sourceMatchId:id,competitionSlug:p.competitionSlug,matchId:targets.find(t=>t.id===id)?.matchId??(id==='4109404'?321663:null),policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),fixture:classified.fixture,receipt:r,authorization:oldDescriptor?{kind:'unchanged-four-originals',artifact:old.artifact}:{kind:'consumed-diagnostic',historySha256:historicalStatisticsPolicySha256(history)}}});const proof=Object.freeze({originals:new Map([...raw].map(([id,b])=>[id,Buffer.from(b)])),descriptors:freeze(descriptors),legacyArtifact:old.artifact});originalAuthorities.set(proof,{originals:raw,descriptors});return proof}
