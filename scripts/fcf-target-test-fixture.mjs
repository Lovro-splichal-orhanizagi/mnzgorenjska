// Synthetic artifact/DB controls. Genuine reviewed raw originals are optional private inputs.
import {readFileSync,mkdtempSync,realpathSync,rmSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
export const now=Date.parse('2026-10-18T14:00:00Z'),commit='a'.repeat(40)
export const sha=x=>createHash('sha256').update(x).digest('hex')
const receipts=JSON.parse(readFileSync(new URL('./vzorci/fcf-reviewed-history/receipts.json',import.meta.url),'utf8'))
const targets=[['4109388',321646,783,'es-ct-segona-g1','4109388-4109627',28706,1,8574,8575,31,4],['4116215',297199,790,'es-ct-tercera-g2','4116188-4116427',27227,4,8195,8188,33,4],['4118352',306164,797,'es-ct-tercera-g9','4118349-4118588',27616,1,8304,8305,32,5],['4118358',306171,797,'es-ct-tercera-g9','4118349-4118588',27617,2,8301,8298,30,1]]
const started={'4109388':'2026-10-18T12:31:53.340Z','4116215':'2026-10-18T12:31:49.885Z','4118352':'2026-10-18T12:32:03.718Z','4118358':'2026-10-18T12:32:07.176Z'}
export function zipFixture(t,entries){
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'fcf-target-proof-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));const zip=join(dir,'control.zip')
 execFileSync('python3',['-c',`import json,sys,zipfile,stat,base64
with zipfile.ZipFile(sys.argv[1],'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.load(sys.stdin):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16
  z.writestr(i,base64.b64decode(e['base64']))`,zip],{input:JSON.stringify(entries.map(e=>({...e,base64:Buffer.from(e.body??'{}').toString('base64'),body:undefined}))),maxBuffer:1000000,stdio:['pipe','pipe','pipe']})
 return readFileSync(zip)
}
function metadata(kind,zipBytes,runId,artifactId){
 const runAttempt=kind==='prepared'?'2':'3',jobName=kind==='prepared'?'cleanup-prepare':'cleanup-apply',stepNames=kind==='prepared'?['Prepare exact four FCF cleanup before-image','Retain exact FCF cleanup before-image']:['Apply exact four FCF cleanup','Retain exact FCF cleanup receipt']
 const name=`fcf-history-cleanup-${kind}-${runId}-${runAttempt}`,artifactDigest='sha256:'+sha(zipBytes)
 return{expected:{runId,runAttempt,commit,artifactId,artifactDigest},metadata:{artifact:{id:Number(artifactId),name,expired:false,size_in_bytes:zipBytes.length,digest:artifactDigest,workflow_run:{id:Number(runId),head_sha:commit}},run:{id:Number(runId),run_attempt:Number(runAttempt),repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:commit,status:'completed',conclusion:'success'},jobs:[{id:Number(runId)+1,run_id:Number(runId),run_attempt:Number(runAttempt),name:jobName,head_sha:commit,status:'completed',conclusion:'success',steps:stepNames.map(name=>({name,status:'completed',conclusion:'success'}))}]}}
}
export function cleanupFixture(t,{retained=process.env.FCF_HISTORICAL_RETAINED_DIR,applied=false}={}){
 const policies=[...new Set(targets.map(t=>t[3]))].map(getHistoricalStatisticsPolicy),policyHashes=Object.fromEntries(policies.map(p=>[p.id,historicalStatisticsPolicySha256(p)])),originals=new Map()
 const descriptors=targets.map(([id,matchId,,slug])=>{
  const r=receipts.find(r=>r.sourceMatchId===id),p=getHistoricalStatisticsPolicy(slug),e=p.entries.find(e=>e.sourceMatchId===id),{rawSha256,reasonCode,...identity}=e
  originals.set(id,Buffer.from(retained?readFileSync(join(retained,r.captureFile)):`SYNTHETIC unapproved original ${id}`))
  return{sourceMatchId:id,competitionSlug:slug,matchId,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),fixture:{...identity,season:p.season},receipt:{id,competitionSlug:slug,sourceUrl:r.sourceUrl,bytes:r.rawBytes,rawSha256:r.rawSha256,startedUTC:started[id],capturedUTC:r.capturedUTC,cacheMtimeUTC:null}}
 })
 const competitions=[...new Map(targets.map(([, ,id,slug,code])=>[id,{id,slug,source:'fcf',source_league_code:code,sezona_koledarska:false,active:false,source_policy:null,prvi_fantasy_krog:6}])).values()]
 const matches=targets.map(([id,matchId,,, ,roundId,round,home,away])=>{const r=receipts.find(r=>r.sourceMatchId===id);return{id:matchId,round_id:roundId,home_team_id:home,away_team_id:away,played_on:r.playedOn,home_goals:r.observedHomeScore,away_goals:r.observedAwayScore,zapisnik_id:`es${id}`,source_url:r.sourceUrl,imported_at:'2026-10-17T10:00:00Z',statistics_status:'available',statistics_reason:null,kontumacija:false,vir_brez_izida:false,source_phase:null,source_round:round}})
 const backup={schemaVersion:1,mainCommit:commit,policyHashes,competitions,rounds:targets.map(([, ,cid,, ,id,number])=>({id,competition_id:cid,number,season:'2026/27'})),matches,teams:[],players:[],appearances:targets.flatMap(([,matchId,,,,,,,,n])=>Array.from({length:n},(_,i)=>({id:matchId*100+i,match_id:matchId,points:8.1}))),goals:targets.flatMap(([,matchId,,,,,,,,,n])=>Array.from({length:n},(_,i)=>({id:matchId*100+i,match_id:matchId}))),otherAppearances:[],otherGoals:[],otherScores:[],player_scores:[],statistika_igralcev:[],tocke_krogov:[],uradne_odsotnosti:[],profil_igralca_plus:[]}
 const beforeImageText=JSON.stringify(backup).replaceAll('"points":8.1','"points":8.10'),beforeSha256=sha(beforeImageText)
 const execution=(runId,runAttempt)=>({repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit,runId,runAttempt})
 const prepare={schemaVersion:1,kind:'fcf-exact-four-cleanup-prepared',sourceCommit:commit,capturedUTC:'2026-10-18T13:00:00Z',execution:execution('100','2'),beforeSha256,policyHashes,originals:descriptors}
 const prepareEntries=[{name:'manifest.json',body:JSON.stringify(prepare)},{name:'before-image.json',body:beforeImageText},...descriptors.map(d=>({name:`acta-${d.sourceMatchId}.html`,body:originals.get(d.sourceMatchId)}))]
 const prepareZipBytes=zipFixture(t,prepareEntries),p=metadata('prepared',prepareZipBytes,'100','200')
 const input={prepareZipBytes,prepareMetadata:p.metadata,expected:{prepare:p.expected},originals,now}
 let applyManifest,appliedEntries
 if(applied){
  const markers=targets.map(([id,matchId,,slug,,roundId,,homeTeamId,awayTeamId])=>{const d=descriptors.find(d=>d.sourceMatchId===id);return{sourceMatchId:id,reportId:`es${id}`,fixture:d.fixture,rawSha256:d.receipt.rawSha256,policyId:d.policyId,policySha256:d.policySha256,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0,matchId,roundId,homeTeamId,awayTeamId}})
  applyManifest={schemaVersion:1,kind:'fcf-exact-four-cleanup-applied',sourceCommit:commit,execution:execution('300','3'),prepareArtifactId:'200',prepareArtifactDigest:p.expected.artifactDigest,beforeSha256,policyHashes,result:{schemaVersion:1,mainCommit:commit,beforeSha256,removedAppearances:126,removedGoals:14,unavailableMatches:4,afterSha256:'c'.repeat(64)},markers}
  appliedEntries=[{name:'manifest.json',body:JSON.stringify(applyManifest)}];const appliedZipBytes=zipFixture(t,appliedEntries),a=metadata('applied',appliedZipBytes,'300','400')
  Object.assign(input,{appliedZipBytes,appliedMetadata:a.metadata});input.expected.applied=a.expected
 }
 function rebuildPrepare(){
  prepareEntries[0].body=JSON.stringify(prepare);const bytes=zipFixture(t,prepareEntries);input.prepareZipBytes=bytes;const meta=metadata('prepared',bytes,'100','200');input.prepareMetadata=meta.metadata;input.expected.prepare=meta.expected
 }
 function rebuildApplied(){appliedEntries[0].body=JSON.stringify(applyManifest);const bytes=zipFixture(t,appliedEntries);input.appliedZipBytes=bytes;const meta=metadata('applied',bytes,'300','400');input.appliedMetadata=meta.metadata;input.expected.applied=meta.expected}
 return{input,prepare,backup,beforeImageText,prepareEntries,applyManifest,appliedEntries,rebuildPrepare,rebuildApplied}
}
