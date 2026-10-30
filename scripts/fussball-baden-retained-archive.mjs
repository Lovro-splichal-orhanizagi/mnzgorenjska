// Independent historical ARCHIVE capability only. No CURRENT clock or capture path.
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {unpackFussballV6Archive,unpackFussballV6Parent} from './dfb-artifacts.mjs'
import {fussballFreshPairProfile} from './fussball-fresh-pair.mjs'
import {fussballArchiveV7CodeSha256} from './fussball-archive-v7.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {FUSSBALL_V4_RETRY_POLICY,restoreFussballV4TransportFailure} from './lib/fussball-v4-retry.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {inspectFussballArchivePage} from './fussball-season-links.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
const pins=JSON.parse(readFileSync(new URL('./fussball-baden-completed-stages.json',import.meta.url))),profile=fussballFreshPairProfile(),prefix=`repos/${pins.repository}/`,states=new WeakMap(),MiB=1024*1024
const sha=b=>createHash('sha256').update(b).digest('hex'),parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b)),json=v=>Buffer.from(JSON.stringify(v)+'\n')
const need=(v,code)=>{if(!v)throw Object.assign(Error('BADEN_RETAINED_ARCHIVE_'+code),{code:'BADEN_RETAINED_ARCHIVE_'+code,dataHold:true})},closed=(v,keys)=>need(v&&Object.getPrototypeOf(v)===Object.prototype&&same(Object.keys(v).sort(),keys.slice().sort()),'INPUT'),freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v},copyFiles=f=>new Map([...f].map(([k,v])=>[k,Buffer.from(v)]))
const flags=Object.freeze({archiveOnly:true,sourceOnly:true,currentAuthority:false,freshAdjacencyValidated:false,nativeAdmission:false,activationEligible:false})
export function fussballBadenRetainedArchiveDescriptor(){return {runId:String(pins.archive.run.id),head:pins.archive.run.head_sha,archive:structuredClone(profile.archive),...flags}}
const runProjection=r=>({...Object.fromEntries(['id','run_attempt','head_sha','head_branch','path','event','status','conclusion','created_at'].map(k=>[k,r?.[k]])),repository:{full_name:r?.repository?.full_name},head_repository:{full_name:r?.head_repository?.full_name},...Object.fromEntries(['actor','triggering_actor'].map(k=>[k,Object.fromEntries(['id','login','type'].map(f=>[f,r?.[k]?.[f]]))]))})
function jobsProjection(v){
 need(Number.isSafeInteger(v?.total_count)&&Array.isArray(v.jobs)&&v.jobs.length===v.total_count&&new Set(v.jobs.map(j=>j?.id)).size===v.total_count&&v.jobs.every(j=>Number.isSafeInteger(j?.id)&&Array.isArray(j.steps)),'JOBS_COMPLETE')
 return {total_count:v.total_count,jobs:v.jobs.map(j=>({...Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion'].map(k=>[k,j[k]])),steps:j.steps.map(s=>Object.fromEntries(['number','name','status','conclusion'].map(k=>[k,s?.[k]])))}))}
}
// Same historical receipt/pacing/parser rules as the reviewed completed-stages
// archive component. No V7 current-continuation verifier or CURRENT proof is used.
function unpackAttestation(bytes){const d=mkdtempSync(join(tmpdir(),'baden-archive-attestation-')),p=join(d,'a.zip');try{writeFileSync(p,bytes);need(execFileSync('unzip',['-Z1',p],{encoding:'utf8',maxBuffer:4096}).trim()==='archive-v7-source-attestation.json','ARCHIVE_ATTESTATION_MEMBERS');return parse(execFileSync('unzip',['-p',p,'archive-v7-source-attestation.json'],{maxBuffer:MiB}))}finally{rmSync(d,{recursive:true,force:true})}}
function sourceWindow(parent,m,artifact){
 const job=parent.jobs.jobs.find(j=>j.name===(parent.name==='DE77_ARCHIVE'?'archive':'archive-continuation'));
 const capture=parent.name==='ARCHIVE_R7'?'Capture V7 fresh archive only after authenticated1952 spent history':parent.name==='DE77_ARCHIVE'?'Reauthenticate and replay current proof, bind adjacent archive, capture and replay':'Capture only fresh archive rounds and missing originals without database credentials';
 const step=job?.steps.find(s=>s.name===capture);
 need(step&&Date.parse(m.createdAt)>=Date.parse(step.started_at)&&Date.parse(m.completedAt)<=Date.parse(step.completed_at)+999&&Date.parse(artifact.created_at)>=Date.parse(m.completedAt),'SOURCE_CAPTURE_WINDOW')
}
function cacheAncestry(archive,parents){const cache=archive.manifest.documents.filter(d=>d.origin==='cache');need(cache.length===94&&pins.cacheOrigins.length===94,'CACHE_INVENTORY');for(const d of cache){const pin=pins.cacheOrigins.find(x=>x.url===d.url),p=parents.get(pin?.parent),original=p?.manifest.documents.filter(x=>x.url===d.url&&x.origin==='network');need(pin&&p&&['css','font'].includes(d.kind)&&pin.sha256===d.sha256&&original.length===1,'CACHE_DIRECT_ARCHIVE_ORIGIN');const o=original[0],r=o.originalReceipt,a=p.manifest.snapshot.attempts.find(x=>x.number===r?.attempt?.number),body=p.files.get(o.file);need(body?.equals(archive.files.get(d.file))&&same(o.originalReceipt,d.originalReceipt)&&o.sha256===d.sha256&&o.bytes===d.bytes&&r.capture.createdAt===p.manifest.createdAt&&r.capture.codeSha256===p.manifest.codeSha256&&same(r.attempt,a)&&a.status==='success'&&a.httpStatus===200&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&sha(body)===d.sha256,'CACHE_NETWORK_RECEIPT')};return sha(json(pins.cacheOrigins))}
async function replayArchive(files,parents){const m=parse(files.get('manifest.json'));need(sha(files.get('manifest.json'))===pins.archive.manifestSha256&&m.version===7&&m.success===true&&m.error===null&&m.codeSha256===pins.archiveCodeSha256&&m.resultSha256===pins.archiveResultSha256,'ARCHIVE_MANIFEST');need(['seedUrl','staffel','season','cardPolicy','reportLimit'].every(k=>same(m.options[k],profile.archive[k]))&&m.options.asOfDate===m.createdAt.slice(0,10),'ARCHIVE_SCOPE');const archive={manifest:m,files},cacheSha256=cacheAncestry(archive,parents),outcomeRaw=files.get('outcomes.jsonl'),outcomes=outcomeRaw.toString().trimEnd().split('\n').map(JSON.parse),intents=files.get('attempts.jsonl').toString().trimEnd().split('\n').map(JSON.parse);need(sha(outcomeRaw)===m.outcomesSha256&&same(outcomes,m.snapshot.attempts)&&outcomes.length===m.snapshot.requests&&intents.length===outcomes.length&&m.snapshot.requests===1014,'ARCHIVE_ATTEMPTS');const docs=new Map(),success=outcomes.filter(a=>a.status==='success');let prior=null,ordinal=0;const seen=new Set();for(const[i,a]of outcomes.entries()){need(same(intents[i],{number:i+1,url:a.url,kind:a.kind,startedAt:null,status:'pending',error:null})&&a.number===i+1&&Date.parse(a.startedAt)>=Date.parse(m.createdAt)&&Date.parse(a.startedAt)<=Date.parse(m.completedAt)&&(!prior||Date.parse(a.startedAt)-Date.parse(prior.startedAt)>=6000),'ARCHIVE_PACING');if(!prior||prior.status==='success'){need(!seen.has(a.url),'ARCHIVE_DUPLICATE_URL');seen.add(a.url);ordinal=1}else{need(a.url===prior.url&&a.kind===prior.kind,'ARCHIVE_RETRY_URL');ordinal++}need(ordinal<=3,'ARCHIVE_RETRY_CAP');if(a.status==='failed'){need(a.error==='connect failure'&&i<outcomes.length-1,'ARCHIVE_FAILURE');restoreFussballV4TransportFailure(a.transportFailure)}else need(a.status==='success'&&a.httpStatus===200&&a.error===null,'ARCHIVE_HTTP');prior=a}
 const network=m.documents.filter(d=>d.origin==='network'),cached=m.documents.filter(d=>d.origin==='cache');need(network.length===success.length&&network.length===1012&&m.documents.length===1106,'ARCHIVE_DOCUMENT_COUNTS');for(const d of m.documents){const b=files.get(d.file);need(!docs.has(d.url)&&Buffer.isBuffer(b)&&b.length===d.bytes&&sha(b)===d.sha256&&d.file===`documents/${d.sha256}.${d.kind==='font'?'woff':d.kind==='css'?'css':'html'}`,'ARCHIVE_DOCUMENT');if(d.origin==='network'){const a=success[network.indexOf(d)];need(a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&same(d.originalReceipt,{version:1,document:Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]])),attempt:a,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}),'ARCHIVE_NETWORK_RECEIPT')}else need(d.origin==='cache'&&['css','font'].includes(d.kind),'ARCHIVE_CACHE_KIND');docs.set(d.url,{...d,bytes:b})}
 let clock=Date.parse(m.createdAt),index=0;const usedNetwork=new Set(),usedCache=new Set(),client=createFussballCaptureClient({maxRequests:1014,retryPolicy:FUSSBALL_V4_RETRY_POLICY,cachedDocuments:cached.map(d=>docs.get(d.url)),now:()=>clock,sleep:async ms=>{clock+=ms},onCachedDocument:d=>usedCache.add(d.url),fetchFn:async url=>{const a=outcomes[index++];need(a?.url===url,'ARCHIVE_REPLAY_URL');clock=Date.parse(a.startedAt);if(a.status==='failed')throw restoreFussballV4TransportFailure(a.transportFailure);const d=docs.get(url);need(d?.origin==='network','ARCHIVE_REPLAY_MISSING');usedNetwork.add(url);return new Response(d.bytes,{status:200,headers:{'content-type':d.contentType}})}}),result=await collectFussballSeason({...m.options,client,onProgress:()=>{}},{inspectPage:(html,scope)=>scope.kind==='round'?inspectFussballArchivePage(html,{archive:m.options,current:profile.current}):inspectFussballPage(html,scope)}),raw=json(result);need(raw.equals(files.get('result.json'))&&sha(raw)===pins.archiveResultSha256&&index===1014&&usedNetwork.size===1012&&usedCache.size===94&&result.coverage.expectedRounds===30&&result.coverage.capturedRounds===30&&result.coverage.fixtures===240&&result.coverage.sampled===false&&result.coverage.unscoredFixtures.total===0&&result.schedule.fixtures.every(f=>f.datum<m.createdAt.slice(0,10)),'ARCHIVE_FULL_REPLAY');return{manifest:m,result,files,cacheSha256}}
function artifactIdentity(a,p){need(['id','name','size_in_bytes','digest'].every(k=>a?.[k]===p.artifact[k])&&a.expired===false&&Date.parse(a.expires_at)>Date.now()&&a.workflow_run?.id===p.run.id&&a.workflow_run.head_sha===p.run.head_sha&&a.workflow_run.head_branch===p.run.head_branch&&Date.parse(a.created_at)>=Date.parse(p.run.created_at)&&Date.parse(a.created_at)<=Date.now(),'ARTIFACT_'+p.name)}
function runClock(run){need(Number.isFinite(Date.parse(run.updated_at))&&Date.parse(run.created_at)<=Date.parse(run.updated_at)&&Date.parse(run.updated_at)<=Date.now(),'RUN_CLOCK')}

export async function readFussballBadenRetainedArchive(input){
 closed(input,['github']);need(typeof input.github==='function','INPUT')
 need(fussballArchiveV7CodeSha256()===pins.archiveCodeSha256,'LOCAL_SOURCE_CODE')
 const records=[pins.archive,...pins.cacheParents],allowed=new Set();
 for(const p of records)for(const path of [`actions/runs/${p.run.id}`,`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100&page=1`,`actions/artifacts/${p.artifact.id}`,`actions/artifacts/${p.artifact.id}/zip`])allowed.add(path)
 const inventoryPath=`actions/runs/${pins.archive.run.id}/artifacts?per_page=100&page=1`,attPath=`actions/artifacts/${pins.archiveAttestation.id}`;
 allowed.add(inventoryPath);allowed.add(attPath);allowed.add(attPath+'/zip')
 for(const file of Object.keys(pins.runtime.archive))allowed.add(`contents/${file}?ref=${pins.archive.run.head_sha}`)
 const api=async(path,binary=false)=>{
  need(typeof path==='string'&&allowed.has(path),'GET_SCOPE');let value;
  try{value=await input.github(prefix+path,binary)}catch{need(false,'OWN_GET_HOLD')}
  if(binary){need(Buffer.isBuffer(value)&&value.length<=100*MiB,'ZIP_BOUND');return Buffer.from(value)}return structuredClone(value)
 }
 const authenticated=[];
 for(const p of records){
  const run=await api(`actions/runs/${p.run.id}`),jobs=await api(`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100&page=1`);
  need(same(runProjection(run),p.run)&&same(jobsProjection(jobs),p.jobs),'RUN_JOBS_'+p.name);runClock(run)
  const artifact=await api(`actions/artifacts/${p.artifact.id}`);artifactIdentity(artifact,p)
  const bytes=await api(`actions/artifacts/${p.artifact.id}/zip`,true);need(bytes.length===artifact.size_in_bytes&&'sha256:'+sha(bytes)===artifact.digest,'ZIP_DIGEST_'+p.name)
  authenticated.push({...p,run,jobs,artifact,bytes})
 }
 const inventory=await api(inventoryPath),attMeta=await api(attPath);
 need(inventory?.total_count===2&&Array.isArray(inventory.artifacts)&&inventory.artifacts.length===2&&new Set(inventory.artifacts.map(a=>a.id)).size===2&&same(inventory.artifacts.find(a=>a.id===pins.archive.artifact.id),authenticated[0].artifact)&&same(inventory.artifacts.find(a=>a.id===pins.archiveAttestation.id),attMeta),'COMPLETE_ARTIFACT_INVENTORY')
 artifactIdentity(attMeta,{name:'ATTESTATION',run:pins.archive.run,artifact:pins.archiveAttestation})
 const attBytes=await api(attPath+'/zip',true);need(attBytes.length===attMeta.size_in_bytes&&'sha256:'+sha(attBytes)===attMeta.digest,'ATTESTATION_ZIP_DIGEST')
 const att=unpackAttestation(attBytes);need(att.verified===true&&att.sourceOnly===true&&att.nativeAdmission===false&&att.activationEligible===false&&att.resultSha256===pins.archiveResultSha256&&att.codeSha256===pins.archiveCodeSha256&&att.priorRequests===1952&&att.requests===1014&&att.cumulativeRequests===2966,'HISTORICAL_ATTESTATION')
 for(const [file,hash]of Object.entries(pins.runtime.archive)){
  const local=readFileSync(new URL('../'+file,import.meta.url));need(sha(local)===hash,'LOCAL_RUNTIME')
  const body=await api(`contents/${file}?ref=${pins.archive.run.head_sha}`);need(body?.type==='file'&&body.path===file&&body.size===local.length&&body.encoding==='base64'&&Buffer.from(body.content??'','base64').equals(local),'REMOTE_RUNTIME')
 }
 // Recheck all mutable evidence before expensive semantic replay; no authority
 // can be obtained from a mutable run projection or an incomplete inventory.
 async function recheck(){for(const p of authenticated){need(same(await api(`actions/runs/${p.run.id}`),p.run)&&same(await api(`actions/runs/${p.run.id}/attempts/1/jobs?per_page=100&page=1`),p.jobs)&&same(await api(`actions/artifacts/${p.artifact.id}`),p.artifact),'LATE_HOSTED_DRIFT');artifactIdentity(p.artifact,p)}need(same(await api(inventoryPath),inventory)&&same(await api(attPath),attMeta),'LATE_ARTIFACT_INVENTORY');artifactIdentity(attMeta,{name:'ATTESTATION',run:pins.archive.run,artifact:pins.archiveAttestation})}
 await recheck()
 const parents=new Map();for(const p of authenticated.slice(1)){
  const files=p.name==='DE77_ARCHIVE'?unpackFussballV6Parent(p.bytes,p.artifact.digest,'archive'):unpackFussballV6Archive(p.bytes,p.artifact.digest),manifest=parse(files.get('manifest.json'));
  need(sha(files.get('manifest.json'))===p.manifestSha256,'CACHE_PARENT_MANIFEST');sourceWindow(p,manifest,p.artifact);parents.set(p.name,{manifest,files})
 }
 const host=authenticated[0],files=unpackFussballV6Archive(host.bytes,host.artifact.digest),archive=await replayArchive(files,parents);
 sourceWindow(host,archive.manifest,host.artifact)
 need(Date.parse(archive.manifest.createdAt)<=Date.parse(archive.manifest.completedAt)&&Date.parse(archive.manifest.completedAt)<=Date.parse(host.run.updated_at)&&Date.parse(host.run.updated_at)<=Date.now(),'ARCHIVE_CLOCK')
 await recheck()
 const source={archiveSourceRunId:String(host.run.id),archiveSourceHead:host.run.head_sha,archiveCodeSha256:pins.archiveCodeSha256,archiveCreatedAt:archive.manifest.createdAt,archiveCompletedAt:archive.manifest.completedAt,requests:1014,priorRequests:1952,historicalCumulativeRequests:2966,...flags};
 const proof=freeze({version:1,kind:'authenticated-baden-retained-archive',source,...flags})
 const certificate={parents:authenticated.map(({bytes,...p})=>p),cacheParents:authenticated.slice(1).map(({bytes,...p})=>p),runtime:structuredClone(pins.runtime.archive),attestation:{metadata:attMeta,sha256:sha(attBytes),resultSha256:att.resultSha256,codeSha256:att.codeSha256},cacheOriginsSha256:archive.cacheSha256,cachedDocuments:94,networkDocuments:1012,failedAttempts:2,fixtureCount:240,playedFixtureCount:237}
 states.set(proof,{archive,parents,certificate});return proof
}

export function getFussballBadenRetainedArchive(proof){
 const s=states.get(proof);need(s,'PRIVATE_CAPABILITY')
 return {proof,source:structuredClone(proof.source),...flags,
  originals:{archive:{manifest:structuredClone(s.archive.manifest),result:structuredClone(s.archive.result),files:copyFiles(s.archive.files)},cacheParents:new Map([...s.parents].map(([name,p])=>[name,{manifest:structuredClone(p.manifest),files:copyFiles(p.files)}]))},certificate:structuredClone(s.certificate)}
}
