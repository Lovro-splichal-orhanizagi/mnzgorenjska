// Pure authenticated writer-record readers. No GitHub/source/database transport.
import {readFileSync} from 'node:fs'
import {verifyArtifact,unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {proveFcfCurrentReleaseDocument} from './fcf-historical-release.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
const stages={mapping:['fcf-native-target-mapping','Derive exact FCF native mapping','Retain exact FCF native mapping'],import:['fcf-target-imported','Import exact FCF target offline','Retain exact FCF target import'],price:['fcf-target-priced','Price exact FCF target','Retain exact FCF target pricing'],check:['fcf-target-checked','Check exact FCF target release','Retain exact FCF target check'],activate:['fcf-target-activated','Activate exact FCF target','Retain exact FCF target activation'],recover:['fcf-target-recovered','Read back exact FCF target receipt','Retain exact FCF target recovery']}
const receipts=JSON.parse(readFileSync(new URL('./vzorci/fcf-reviewed-history/receipts.json',import.meta.url)))
const fixed=[['4109388',321646,783,'es-ct-segona-g1',1],['4116215',297199,790,'es-ct-tercera-g2',4],['4118352',306164,797,'es-ct-tercera-g9',1],['4118358',306171,797,'es-ct-tercera-g9',2]]
const started={'4109388':'2026-10-18T12:31:53.340Z','4116215':'2026-10-18T12:31:49.885Z','4118352':'2026-10-18T12:32:03.718Z','4118358':'2026-10-18T12:32:07.176Z'}
const fail=m=>{throw Error(`FCF_STAGE: ${m}`)},same=(a,b)=>hash(a)===hash(b),id=s=>typeof s==='string'&&/^[1-9]\d*$/.test(s)
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
function authenticate({zipBytes,metadata,expected},jobName,steps,name,zipKind){
 const{artifact:a,run:r,jobs}=metadata??{},e=expected
 if(!Buffer.isBuffer(zipBytes)||!e||!['runId','runAttempt','artifactId'].every(k=>id(e[k]))||!/^[a-f0-9]{40}$/.test(e.commit??'')||!/^sha256:[a-f0-9]{64}$/.test(e.artifactDigest??'')||String(r?.id)!==e.runId||String(r.run_attempt)!==e.runAttempt||r.repository?.full_name!==repository||r.path!==workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==e.commit||r.status!=='completed'||r.conclusion!=='success'||!Array.isArray(jobs))fail('exact successful main record/attempt/ZIP required')
 const selected=jobs.filter(j=>j.name===jobName),j=selected[0]
 if(selected.length!==1||!Number.isSafeInteger(j.id)||String(j.run_id)!==e.runId||j.run_attempt!==r.run_attempt||j.head_sha!==e.commit||j.status!=='completed'||j.conclusion!=='success'||!Array.isArray(j.steps))fail('exact stage job/attempt required')
 for(const s of steps){const xs=j.steps.filter(x=>x.name===s);if(xs.length!==1||xs[0].status!=='completed'||xs[0].conclusion!=='success')fail('exact successful operation/retention steps required')}
 let identity,files
 try{identity=verifyArtifact(a,{runId:e.runId,commit:e.commit,name});if(identity.id!==e.artifactId||identity.digest!==e.artifactDigest||identity.size!==zipBytes.length)fail('actual artifact pins differ');files=unpackVerifiedArchive(zipBytes,identity.digest,zipKind)}catch(error){fail(error.message)}
 return{files,identity:{...identity,runId:e.runId,runAttempt:e.runAttempt,commit:e.commit,jobId:String(j.id)},execution:{repository,ref:'refs/heads/main',commit:e.commit,runId:e.runId,runAttempt:e.runAttempt}}
}
function parse(bytes){if(!bytes||!bytes.length||bytes.length>8*1024*1024||bytes[0]===239&&bytes[1]===187&&bytes[2]===191)fail('bounded valid UTF8 manifest required');const text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('invalid UTF8');try{return JSON.parse(text)}catch{fail('invalid JSON')}}
export function describeFcfCleanupOriginals({originals,now=Date.now()}){
 if(!(originals instanceof Map)||originals.size!==4||!Number.isFinite(now))fail('exact genuine four original buffers required')
 return fixed.map(([native,matchId,cid,slug,round])=>{
  const policy=getHistoricalStatisticsPolicy(slug),entry=policy.entries.find(e=>e.sourceMatchId===native),r=receipts.find(r=>r.sourceMatchId===native),bytes=originals.get(native)
  if(!Buffer.isBuffer(bytes)||bytes.length!==r.rawBytes||sha256(bytes)!==r.rawSha256||Date.parse(r.capturedUTC)>now)fail('pinned genuine original bytes/clock required')
  const receipt={id:native,competitionSlug:slug,sourceUrl:r.sourceUrl,bytes:r.rawBytes,rawSha256:r.rawSha256,startedUTC:started[native],capturedUTC:r.capturedUTC,cacheMtimeUTC:null},html=bytes.toString('utf8')
  proveFcfCurrentReleaseDocument({competition:{id:cid,slug,source:'fcf',source_league_code:cid===783?'4109388-4109627':cid===790?'4116188-4116427':'4118349-4118588',source_policy:policy.sourcePolicy,active:false,sezona_koledarska:false,firstFantasyPlayedOn:'2026-10-24'},document:{id:native,expectedSourceRound:round,html,receipt,lineage:{kind:'reviewed-original',sourceCommit:'f7efba26c31f76372b5aab1e976061631fbaebda'}},now})
  const{rawSha256,reasonCode,...fixture}=entry
  return{sourceMatchId:native,competitionSlug:slug,matchId,policyId:policy.id,policySha256:hash(policy),fixture:{...fixture,season:policy.season},receipt}
 })
}
export function readFcfCleanupOriginalStage(input={}){
 const e=input.expected,{files,identity,execution}=authenticate(input,'cleanup-originals',['Stage genuine four FCF originals','Retain genuine four FCF originals'],`fcf-history-cleanup-originals-${e?.runId}-${e?.runAttempt}`,'fcf-cleanup-prepared')
 if(files.size!==5||!files.has('manifest.json')||fixed.some(([n])=>!files.has(`acta-${n}.html`)))fail('exact originals artifact member set required')
 const originals=new Map(fixed.map(([n])=>[n,files.get(`acta-${n}.html`)])),m=parse(files.get('manifest.json')),descriptors=describeFcfCleanupOriginals({originals,now:input.now})
 if(m.schemaVersion!==1||m.kind!=='fcf-exact-four-originals'||m.sourceCommit!==e.commit||!same(m.execution,execution)||!same(m.originals,descriptors)||Object.keys(m).sort().join(',')!=='execution,kind,originals,schemaVersion,sourceCommit')fail('original stage descriptors/execution differ')
 return{originals,descriptors,artifact:identity}
}
export function readFcfTargetStageArtifact(input={}){
 const{stage,targetSlug,expected:e}=input,s=stages[stage]
 if(!s||!['es-ct-segona-g1','es-ct-tercera-g9'].includes(targetSlug))fail('closed target/stage required')
 const{files,identity,execution}=authenticate(input,`target-${stage}`,s.slice(1),`fcf-target-${stage}-${targetSlug}-${e?.runId}-${e?.runAttempt}`,'fcf-cleanup-applied')
 if(files.size!==1||!files.has('manifest.json'))fail('single exact stage manifest required')
 const m=parse(files.get('manifest.json'))
 if(Object.keys(m).sort().join(',')!=='execution,inputs,kind,result,rolloutSha256,rolloutText,schemaVersion,sourceCommit,targetSlug'||m.schemaVersion!==1||m.kind!==s[0]||m.targetSlug!==targetSlug||m.sourceCommit!==e.commit||!same(m.execution,execution)||!e.inputs||!same(m.inputs,e.inputs)||typeof m.rolloutText!=='string'||sha256(Buffer.from(m.rolloutText))!==m.rolloutSha256||m.result?.targetSlug!==targetSlug)fail('exact stage manifest/input/rollout binding differs')
 return freeze({...m,artifact:identity})
}
export const fcfTargetStageContract=stage=>stages[stage]?{job:`target-${stage}`,kind:stages[stage][0],steps:stages[stage].slice(1)}:null
