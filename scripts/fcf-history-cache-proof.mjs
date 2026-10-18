// Authenticated artifact consumer only. No source or database transport on import.
import {createHash} from 'node:crypto'
import {buildFcfFinalAuditPlan} from './fcf-final-audit.mjs'
import {glavaStrani,tokRsc,vrsticeRsc,jeIzziv} from './viri/fcf.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
const cacheKey='zapisniki-ES-k1od1-39122610224-1'
const scopes=[['es-ct-segona-g1',783,4109388,4109627],['es-ct-tercera-g2',790,4116188,4116427],['es-ct-tercera-g9',797,4118349,4118588]]
const id=x=>typeof x==='string'&&/^[1-9]\d{0,19}$/.test(x)
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const fail=message=>{throw Error(`FCF_CACHE: ${message}`)}
function execution(run,jobs,runId,commit){
 if(!id(runId)||!/^[a-f0-9]{40}$/.test(commit??'')||String(run?.id)!==runId||run.repository?.full_name!==repository||run.path!==workflow||run.event!=='workflow_dispatch'||run.head_branch!=='main'||run.head_sha!==commit||run.status!=='completed'||run.conclusion!=='success'||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||!Array.isArray(jobs))fail('successful exact main cache-export run required')
 const matches=jobs.filter(j=>j.name==='cache-export'),job=matches[0]
 if(matches.length!==1||!Number.isSafeInteger(job.id)||job.id<1||String(job.run_id)!==runId||job.run_attempt!==run.run_attempt||job.head_sha!==commit||job.status!=='completed'||job.conclusion!=='success'||!Array.isArray(job.steps))fail('exact successful cache-export job required')
 for(const name of ['Restore only the reviewed exact cache','Export only the three fixed blocks with original lineage','Retain authenticated bounded cache evidence']){
  const steps=job.steps.filter(s=>s.name===name)
  if(steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')fail('exact successful restore/export/upload steps required')
 }
 return job
}
/** Caller obtains files/metadata through downloadArtifact(kind:'fcf-history'),
 * which verifies the actual authenticated ZIP bytes before bounded extraction.
 * This boundary then independently binds the actual execution and every member.
 */
export function readFcfHistoryCacheArtifact({files,artifact,run,jobs,runId,commit,now=Date.now()}){
 const job=execution(run,jobs,runId,commit)
 if(!artifact||!id(artifact.id)||!/^sha256:[a-f0-9]{64}$/.test(artifact.digest??'')||artifact.name!==`fcf-history-cache-${runId}-${run.run_attempt}`||!Number.isSafeInteger(artifact.size)||artifact.size<1||artifact.size>100*1024*1024||!(files instanceof Map)||files.size!==721||!Buffer.isBuffer(files.get('manifest.json'))||files.get('manifest.json').length>2*1024*1024)fail('exact verified cache artifact identity/member set required')
 let m
 try{m=JSON.parse(files.get('manifest.json').toString('utf8'))}catch{fail('invalid cache manifest')}
 if(m?.schemaVersion!==1||m.kind!=='fcf-historical-cache'||JSON.stringify(m.scopes)!==JSON.stringify(scopes.map(([competitionSlug,,start,end])=>({competitionSlug,sourceCode:`${start}-${end}`})))||m.cache?.requestedKey!==cacheKey||m.cache?.matchedKey!==cacheKey||m.cache?.cacheHit!=='true'||m.cache?.restoreOutcome!=='success'||m.cache?.state!=='available'||m.extraction?.commit!==commit||m.extraction?.runId!==runId||m.extraction?.runAttempt!==String(run.run_attempt)||m.sourceCaptureCommit!==null||m.sourceFetchTime!==null||m.freshness!=='unverified-historical-cache'||!Array.isArray(m.files)||m.files.length!==720)fail('cache scope/restore/extraction/source-age provenance differs')
 const descriptors=new Map(m.files.map(f=>[f.id,f])),expected=new Set(['manifest.json']),groups=[]
 if(descriptors.size!==720)fail('duplicate cached source identity')
 const lineage={verified:true,repository,runId,jobId:String(job.id),commit,workflow,artifactId:artifact.id,artifactDigest:artifact.digest,cacheKey}
 let total=0
 for(const[competitionSlug,competitionId,start,end]of scopes){
  const cache=[]
  for(let n=start;n<=end;n++){
   const sourceId=String(n),name=`acta-${sourceId}.html`,f=descriptors.get(sourceId),bytes=files.get(name),stamp=Date.parse(f?.cachedMtime)
   expected.add(name)
   if(!f||f.status!=='found'||f.url!==`https://www.fcf.cat/ca/competicio/acta/${sourceId}`||f.cachePath!==`scripts/.predpomnilnik/fcf/${name}`||f.artifactFile!==name||!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>2*1024*1024||f.byteCount!==bytes.length||!sha(f.sha256)||createHash('sha256').update(bytes).digest('hex')!==f.sha256||!Number.isFinite(stamp)||stamp>now)fail(`raw member/hash/original timestamp differs ${sourceId}`)
   total+=bytes.length;if(total>192*1024*1024)fail('expanded snapshot size exceeded')
   const html=bytes.toString('utf8')
   if(!Buffer.from(html).equals(bytes)||jeIzziv(html))fail(`invalid/challenged cached source ${sourceId}`)
   const route=vrsticeRsc(tokRsc(html)).get('0')?.c,header=glavaStrani(html)
   if(JSON.stringify(route)!==JSON.stringify(['','ca','competicio','acta',sourceId])||!header||header.sezona!=='2026/27'||header.tekmovanje!==(competitionSlug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA')||header.skupina!==`GRUP ${competitionSlug.split('-g')[1]}`||!Number.isInteger(header.krog)||header.krog<1||header.krog>30)fail(`raw route/group/season/round differs ${sourceId}`)
   cache.push({id:sourceId,rawSha256:f.sha256,cacheMtimeUTC:f.cachedMtime,header,lineage:{...lineage}})
  }
  groups.push({competitionSlug,competitionId,sourceCode:`${start}-${end}`,cache})
 }
 if([...files.keys()].some(name=>!expected.has(name)))fail('foreign artifact member')
 return{schemaVersion:1,kind:'fcf-historical-cache-proof',sourceFetchTime:null,groups}
}

export function compileFcfFinalAuditInventory({cacheProof,databaseInventory,sourceCommit,now=Date.now()}){
 const captured=Date.parse(databaseInventory?.capturedUTC)
 if(cacheProof?.kind!=='fcf-historical-cache-proof'||!Array.isArray(cacheProof.groups)||cacheProof.groups.length!==3||databaseInventory?.method!=='explicitBEGIN_READ_ONLY_ROLLBACK'||!Number.isFinite(captured)||captured>now||now-captured>24*3600000||!Array.isArray(databaseInventory.groups)||databaseInventory.groups.length!==3||new Set(databaseInventory.groups.map(c=>c.slug)).size!==3)fail('exact fresh read-only DB and verified cache inventories required')
 const groups=scopes.map(([slug,id,start,end])=>{
  const c=databaseInventory.groups.find(c=>c.slug===slug),p=cacheProof.groups.find(g=>g.competitionSlug===slug)
  if(!c||!p||c.id!==id||p.competitionId!==id||c.active!==false||c.source!=='fcf'||c.sourceLeagueCode!==`${start}-${end}`||p.sourceCode!==c.sourceLeagueCode||c.sezona_koledarska!==false||!Object.hasOwn(c,'source_policy')||![null,'es-fcf-reviewed-history-v1'].includes(c.source_policy)||!Array.isArray(c.nativeImportedIDs))fail(`actual source/calendar/policy scope differs ${slug}`)
  return{competition:{id,slug,source:c.source,active:c.active,source_league_code:c.sourceLeagueCode,sezona_koledarska:c.sezona_koledarska,source_policy:c.source_policy},verifiedSourceIds:c.nativeImportedIDs,cache:p.cache}
 })
 return buildFcfFinalAuditPlan({groups,sourceCommit,now})
}
