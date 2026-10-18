// Offline authenticated artifact consumers. No source, GitHub or DB transport on import/use.
import {readFileSync} from 'node:fs'
import {verifyArtifact,unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import {proveFcfCurrentReleaseDocument} from './fcf-historical-release.mjs'
import {verifyFcfInstalledHistoricalMarker} from './fcf-historical-policy.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
const ID=/^[1-9]\d{0,19}$/,SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/
const fail=message=>{throw Error(`FCF_TARGET_EVIDENCE: ${message}`)}
const targets=[
 ['4109388',321646,783,'es-ct-segona-g1','4109388-4109627',28706,1,8574,8575,31,4],
 ['4116215',297199,790,'es-ct-tercera-g2','4116188-4116427',27227,4,8195,8188,33,4],
 ['4118352',306164,797,'es-ct-tercera-g9','4118349-4118588',27616,1,8304,8305,32,5],
 ['4118358',306171,797,'es-ct-tercera-g9','4118349-4118588',27617,2,8301,8298,30,1],
].map(([id,matchId,competitionId,slug,code,roundId,round,homeTeamId,awayTeamId,appearances,goals])=>({id,matchId,competitionId,slug,code,roundId,round,homeTeamId,awayTeamId,appearances,goals}))
const receipts=JSON.parse(readFileSync(new URL('./vzorci/fcf-reviewed-history/receipts.json',import.meta.url),'utf8'))
const started={'4109388':'2026-10-18T12:31:53.340Z','4116215':'2026-10-18T12:31:49.885Z','4118352':'2026-10-18T12:32:03.718Z','4118358':'2026-10-18T12:32:07.176Z'}
const policies=[...new Set(targets.map(t=>t.slug))].map(getHistoricalStatisticsPolicy)
const policyHashes=Object.fromEntries(policies.map(p=>[p.id,historicalStatisticsPolicySha256(p)]))
const verifiedCleanup=new WeakSet()
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
 const steps=kind==='prepared'?['Prepare exact four FCF cleanup before-image','Retain exact FCF cleanup before-image']:['Apply exact four FCF cleanup','Retain exact FCF cleanup receipt']
 for(const name of steps){const matches=job.steps.filter(s=>s.name===name);if(matches.length!==1||matches[0].status!=='completed'||matches[0].conclusion!=='success')fail('exact successful cleanup step required')}
 let identity
 try{identity=verifyArtifact(artifact,{runId:expected.runId,commit:expected.commit,name:`fcf-history-cleanup-${kind}-${expected.runId}-${expected.runAttempt}`})}catch(error){fail(`artifact identity: ${error.message}`)}
 if(identity.id!==expected.artifactId||identity.digest!==expected.artifactDigest||zipBytes.length!==identity.size)fail('artifact ZIP size/expected digest identity differs')
 const files=unpackVerifiedArchive(zipBytes,identity.digest,`fcf-cleanup-${kind}`)
 const names=kind==='prepared'?['manifest.json','before-image.json',...targets.map(t=>`acta-${t.id}.html`)]:['manifest.json']
 if(files.size!==names.length||names.some(name=>!files.has(name)))fail('complete cleanup artifact member set required')
 const manifest=json(files.get('manifest.json'),'cleanup manifest')
 const expectedExecution={repository,ref:'refs/heads/main',commit:expected.commit,runId:expected.runId,runAttempt:expected.runAttempt}
 if(manifest.schemaVersion!==1||manifest.kind!==`fcf-exact-four-cleanup-${kind}`||manifest.sourceCommit!==expected.commit||!jsonEqual(manifest.execution,expectedExecution))fail('cleanup manifest execution binding differs')
 keys(manifest,kind==='prepared'?'schemaVersion,kind,sourceCommit,capturedUTC,execution,beforeSha256,policyHashes,originals':'schemaVersion,kind,sourceCommit,execution,prepareArtifactId,prepareArtifactDigest,beforeSha256,policyHashes,result,markers','cleanup manifest')
 if(!jsonEqual(manifest.policyHashes,policyHashes))fail('exact three cleanup policy hashes required')
 return{files,manifest,identity:{...identity,runId:expected.runId,runAttempt:expected.runAttempt,commit:expected.commit}}
}
function backupText(files,m){
 const text=utf8(files.get('before-image.json'),'before-image')
 if(!SHA.test(m.beforeSha256??'')||sha256(Buffer.from(text))!==m.beforeSha256)fail('before-image TEXT/SHA differs')
 const image=json(files.get('before-image.json'),'before-image')
 const arrays=['competitions','rounds','matches','teams','players','appearances','goals','otherAppearances','otherGoals','otherScores','player_scores','statistika_igralcev','tocke_krogov','uradne_odsotnosti','profil_igralca_plus']
 keys(image,['schemaVersion','mainCommit','policyHashes',...arrays].join(','),'before-image capture')
 if(image.schemaVersion!==1||image.mainCommit!==m.sourceCommit||!jsonEqual(image.policyHashes,policyHashes)||arrays.some(k=>!Array.isArray(image[k])||image[k].some(r=>!r||typeof r!=='object'||Array.isArray(r))))fail('before-image capture schema/policy/array differs')
 if(image.competitions.length!==3||new Set(image.competitions.map(c=>c.id)).size!==3)fail('exact three before-image competitions required')
 for(const target of targets){
  const{competitionId,slug,code,matchId,roundId,round,homeTeamId,awayTeamId,id}=target,c=image.competitions.find(c=>c.id===competitionId),r=image.rounds.find(r=>r.id===roundId),matches=image.matches.filter(m=>m.id===matchId),match=matches[0],entry=receipts.find(r=>r.sourceMatchId===id)
  if(!c||c.slug!==slug||c.source!=='fcf'||c.source_league_code!==code||c.sezona_koledarska!==false||c.active!==false||c.source_policy!==null||c.prvi_fantasy_krog!==6)fail('before-image inactive competition scope differs')
  if(!r||r.competition_id!==competitionId||r.number!==round||r.season!=='2026/27'||image.rounds.filter(r=>r.id===roundId).length!==1)fail('before-image exact target round differs')
  if(matches.length!==1||match.round_id!==roundId||match.home_team_id!==homeTeamId||match.away_team_id!==awayTeamId||match.played_on!==entry.playedOn||match.home_goals!==entry.observedHomeScore||match.away_goals!==entry.observedAwayScore||match.zapisnik_id!==`es${id}`||match.source_url!==entry.sourceUrl||typeof match.imported_at!=='string'||!Number.isFinite(Date.parse(match.imported_at))||match.statistics_status!=='available'||match.statistics_reason!==null||match.kontumacija!==false||match.vir_brez_izida!==false||match.source_phase!==null||![null,round].includes(match.source_round))fail('before-image exact original target match differs')
  if(image.appearances.filter(a=>a.match_id===matchId).length!==target.appearances||image.goals.filter(g=>g.match_id===matchId).length!==target.goals)fail('before-image exact target individual counts differ')
 }
 if(image.appearances.length!==126||image.goals.length!==14)fail('before-image exact126/14 individual set required')
 historicalStatisticsPolicySha256(image) // Reject nonfinite JSON without regenerating text.
 return text
}
function originalDocuments(m,files,originals,now){
 if(!Array.isArray(m.originals)||m.originals.length!==4||new Set(m.originals.map(d=>d.sourceMatchId)).size!==4||!(originals instanceof Map)||originals.size!==4||[...originals.keys()].some(id=>!targets.some(t=>t.id===id)))fail('all four exact reviewed originals required')
 return targets.map(t=>{
  const r=receipts.find(r=>r.sourceMatchId===t.id),p=getHistoricalStatisticsPolicy(t.slug),entry=p.entries.find(e=>e.sourceMatchId===t.id),{rawSha256,reasonCode,...fixture}=entry
  const receipt={id:t.id,competitionSlug:t.slug,sourceUrl:r.sourceUrl,bytes:r.rawBytes,rawSha256:r.rawSha256,startedUTC:started[t.id],capturedUTC:r.capturedUTC,cacheMtimeUTC:null}
  const descriptor={sourceMatchId:t.id,competitionSlug:t.slug,matchId:t.matchId,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),fixture:{...fixture,season:p.season},receipt}
  const supplied=m.originals.find(d=>d.sourceMatchId===t.id)
  if(!supplied||!jsonEqual(supplied,descriptor)||Date.parse(receipt.capturedUTC)>now)fail('genuine original receipt/fixture/policy descriptor differs')
  const bytes=files.get(`acta-${t.id}.html`),reviewed=originals.get(t.id)
  if(!Buffer.isBuffer(reviewed)||!reviewed.equals(bytes)||bytes.length!==r.rawBytes||sha256(bytes)!==r.rawSha256)fail('genuine original raw bytes/SHA differs')
  const html=utf8(bytes,'original raw'),competition={id:t.competitionId,slug:t.slug,source:'fcf',source_policy:p.sourcePolicy,source_league_code:t.code,active:false,sezona_koledarska:false,firstFantasyPlayedOn:'2026-10-24'}
  const canonical=proveFcfCurrentReleaseDocument({competition,document:{id:t.id,expectedSourceRound:t.round,html,receipt,lineage:{kind:'reviewed-original',sourceCommit:'f7efba26c31f76372b5aab1e976061631fbaebda'}},now})
  if(canonical.statisticsStatus!=='unavailable_historical'||!jsonEqual(canonical.sourceFixture,descriptor.fixture))fail('original historical classifier differs')
  return{...descriptor,html}
 })
}
/** Distinct prepare/apply runs are individually authenticated and linked by immutable artifact identity. */
export function readFcfCleanupEvidence(input){
 if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['prepareZipBytes','prepareMetadata','appliedZipBytes','appliedMetadata','expected','originals','now'].includes(k)))fail('complete authenticated cleanup transport inputs required')
 const{prepareZipBytes,prepareMetadata,appliedZipBytes,appliedMetadata,expected,originals,now=Date.now()}=input
 if(!Number.isFinite(now))fail('finite audit clock required')
 const hasApplied=appliedZipBytes!==undefined||appliedMetadata!==undefined||expected?.applied!==undefined
 if(hasApplied&&(!Buffer.isBuffer(appliedZipBytes)||!appliedMetadata||!expected?.applied))fail('complete applied artifact record required')
 const prepared=authenticate('prepared',prepareZipBytes,prepareMetadata,expected?.prepare),m=prepared.manifest,stamp=Date.parse(m.capturedUTC)
 if(!Number.isFinite(stamp)||stamp>now||!hasApplied&&now-stamp>24*3600000)fail('fresh original prepare capture timestamp required')
 const beforeImageText=backupText(prepared.files,m),sourceOriginals=originalDocuments(m,prepared.files,originals,now)
 let appliedReceipt=null
 if(hasApplied){
  const applied=authenticate('applied',appliedZipBytes,appliedMetadata,expected.applied),a=applied.manifest
  if(a.sourceCommit!==m.sourceCommit||a.prepareArtifactId!==prepared.identity.id||a.prepareArtifactDigest!==prepared.identity.digest||a.beforeSha256!==m.beforeSha256)fail('applied artifact does not bind exact immutable prepare receipt')
  const r=a.result
  keys(r,'schemaVersion,mainCommit,beforeSha256,removedAppearances,removedGoals,unavailableMatches,afterSha256','applied cleanup result')
  if(r.schemaVersion!==1||r.mainCommit!==m.sourceCommit||r.beforeSha256!==m.beforeSha256||r.removedAppearances!==126||r.removedGoals!==14||r.unavailableMatches!==4||!SHA.test(r.afterSha256??''))fail('applied exact126/14/four cleanup result differs')
  if(!Array.isArray(a.markers)||a.markers.length!==4||new Set(a.markers.map(m=>m.sourceMatchId)).size!==4)fail('applied exact four installed markers required')
  for(const t of targets){
   const marker=a.markers.find(m=>m.sourceMatchId===t.id),policy=getHistoricalStatisticsPolicy(t.slug)
   if(!marker||marker.matchId!==t.matchId||marker.roundId!==t.roundId||marker.homeTeamId!==t.homeTeamId||marker.awayTeamId!==t.awayTeamId)fail('applied exact native/database marker differs')
   verifyFcfInstalledHistoricalMarker({competition:{slug:t.slug,source:'fcf',source_policy:policy.sourcePolicy,firstFantasyPlayedOn:'2026-10-24'},marker})
  }
  appliedReceipt={artifact:applied.identity,result:r,markers:a.markers}
 }
 const proof=freeze({phase:appliedReceipt?'applied':'prepared',sourceCommit:m.sourceCommit,preparedUTC:m.capturedUTC,beforeImageText,beforeSha256:m.beforeSha256,policyHashes:{...policyHashes},originals:sourceOriginals,prepareArtifact:prepared.identity,appliedReceipt})
 verifiedCleanup.add(proof);return proof
}
/** Consumers must receive the reader's object, never an asserted verified/phase flag. */
export const isVerifiedFcfCleanupEvidence=value=>!!value&&verifiedCleanup.has(value)

// Explicit new protocol only; no legacy cache evidence is branded by this export.
export {readFcfCapturedTargetEvidence,composeFcfCapturedTargetEvidence,getFcfCapturedTargetData} from './fcf-missing-inventory-evidence.mjs'
