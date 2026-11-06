// Hosted source authentication only. No derived pack, native admission or writer.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {readFussballRetainedAudit,getFussballRetainedAuditWire} from './fussball-retained-audit.mjs'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repo}/`,sourceRunId='40641606028'
const workflow='.github/workflows/replay-fussball-audit.yml',jobName='replay'
const replayStep='Authenticate and replay original paired source bytes',validateStep='Validate exact reviewed main and first attempt',uploadStep='Preserve source-only replay certificate'
const runtimeFiles=[workflow,'scripts/fussball-audit-replay.mjs','scripts/stage-fussball-retained-audit.mjs','scripts/fussball-retained-audit.mjs','package-lock.json']
const names=['certificate.json','source-metadata.json','current.zip','archive.zip'],MiB=1024*1024,capabilities=new WeakMap()
const hash=b=>createHash('sha256').update(b).digest('hex'),json=v=>Buffer.from(JSON.stringify(v)+'\n')
const need=(ok,message)=>{if(!ok)throw Object.assign(Error('fussball audit replay: '+message),{code:'FUSSBALL_AUDIT_REPLAY_HOLD',dataHold:true})}
const same=(a,b)=>isDeepStrictEqual(a,b),plain=o=>o&&Object.getPrototypeOf(o)===Object.prototype
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o)}return o}
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))
const apiEnd=s=>Date.parse(s)+(s.includes('.')?0:999)
function shape(input,fields){need(plain(input)&&Object.keys(input).sort().join(',')===fields.sort().join(',')&&/^\d{1,20}$/.test(input.replayRunId)&&Number.isSafeInteger(Number(input.replayRunId))&&Number(input.replayRunId)>0&&input.replayRunId!==sourceRunId&&/^[a-f0-9]{40}$/.test(input.replayHead)&&typeof input.github==='function','exact replay run/head and authoritative GET adapter required')}
function scoped(input){
 const run=`actions/runs/${input.replayRunId}`,allowed=new Set([run,run+'/attempts/1/jobs?per_page=100&page=1',run+'/artifacts?per_page=100&page=1','branches/main',...runtimeFiles.map(f=>`contents/${f}?ref=${input.replayHead}`)])
 return {allow:p=>allowed.add(p),async get(path,binary=false){need(allowed.has(path),'GET outside replay scope');let v;try{v=await input.github(prefix+path,binary)}catch{need(false,'authoritative GET unavailable')};if(binary){need(Buffer.isBuffer(v)&&v.length<=1024*MiB,'bounded certificate ZIP required');return Buffer.from(v)}return structuredClone(v)}}
}
function runBound(run,input,terminal){
 need(run?.id===Number(input.replayRunId)&&run.run_attempt===1&&run.head_sha===input.replayHead&&run.head_branch==='main'&&run.event==='workflow_dispatch'&&run.path===workflow&&run.repository?.full_name===repo&&run.head_repository?.full_name===repo,'actual first-attempt approved main replay required')
 need(terminal?run.status==='completed'&&run.conclusion==='success':run.status==='in_progress'&&run.conclusion===null,'replay execution state differs')
 need(utc(run.created_at)&&utc(run.updated_at)&&Date.parse(run.created_at)<=Date.parse(run.updated_at)&&Date.parse(run.updated_at)<=Date.now(),'replay execution timestamps differ')
}
async function installedRuntime(input,api){
 const main=await api.get('branches/main');need(main?.name==='main'&&main.commit?.sha===input.replayHead,'reviewed replay head is no longer actual main')
 const pins={}
 for(const file of runtimeFiles){
  const bytes=readFileSync(new URL('../'+file,import.meta.url)),remote=await api.get(`contents/${file}?ref=${input.replayHead}`)
  need(remote?.type==='file'&&remote.path===file&&remote.encoding==='base64'&&Number.isSafeInteger(remote.size)&&remote.size===bytes.length&&remote.size<=4*MiB&&typeof remote.content==='string','immutable reviewed runtime content required')
  need(Buffer.from(remote.content,'base64').equals(bytes),'installed runtime differs from approved replay head');pins[file]=hash(bytes)
 }
 return pins
}
function sourceMetadata(state){return{run:state.run,jobs:state.jobs,inventory:state.inventory,artifacts:Object.fromEntries(Object.entries(state.stages).map(([s,v])=>[s,v.artifact]))}}
function fresh(summary){need(utc(summary?.currentCreatedAt)&&utc(summary.currentFreshUntil)&&Date.parse(summary.currentFreshUntil)===Date.parse(summary.currentCreatedAt)+24*3600_000&&Date.now()<=Date.parse(summary.currentFreshUntil),'original source freshness expired or differs')}
/** Producer writes a new private directory only after genuine default source
 * replay. GitHub upload-artifact supplies the outer immutable artifact ZIP. */
export async function produceFussballAuditReplay(input){
 shape(input,['sourceRunId','replayRunId','replayHead','github','directory']);need(input.sourceRunId===sourceRunId&&typeof input.directory==='string'&&input.directory.length>0,'fixed source and exclusive output directory required')
 const api=scoped(input),runPath=`actions/runs/${input.replayRunId}`,run=await api.get(runPath);runBound(run,input,false)
 const runtime=await installedRuntime(input,api),proof=await readFussballRetainedAudit({sourceRunId,github:input.github}),state=getFussballRetainedAuditWire(proof)
 fresh(proof)
 const metadata=json(sourceMetadata(state)),originals=Object.fromEntries(['current','archive'].map(s=>[s,state.stages[s].zipBytes]))
 const createdAt=new Date().toISOString(),certificate={version:1,kind:'fussball-source-only-hosted-replay',repository:repo,replayRunId:input.replayRunId,replayHead:input.replayHead,workflow,createdAt,runtime,source:proof,metadataSha256:hash(metadata),originals:Object.fromEntries(Object.entries(originals).map(([s,b])=>[s,{file:s+'.zip',bytes:b.length,sha256:hash(b)}])),sourceAuthenticationOnly:true,nativeEligible:false,activationEligible:false}
 need(Date.parse(createdAt)>=Date.parse(run.created_at),'certificate predates replay run')
 const again=await api.get(runPath);runBound(again,input,false);need(again.id===run.id,'replay execution changed');need(same(runtime,await installedRuntime(input,api)),'reviewed runtime changed');fresh(proof)
 const cert=json(certificate);need(metadata.length<=16*MiB&&cert.length<=MiB&&metadata.length+cert.length+Object.values(originals).reduce((n,b)=>n+b.length,0)<=1024*MiB-MiB,'bounded combined certificate exceeded')
 mkdirSync(input.directory,{mode:0o700})
 try{for(const [name,bytes]of [['certificate.json',cert],['source-metadata.json',metadata],...Object.entries(originals).map(([s,b])=>[s+'.zip',b])])writeFileSync(join(input.directory,name),bytes,{flag:'wx',mode:0o600})}catch(error){rmSync(input.directory,{recursive:true,force:true});throw error}
 return freeze(certificate)
}
function replayJob(envelope,input){
 need(envelope?.total_count===1&&envelope.jobs?.length===1,'exact one-job replay inventory required');const j=envelope.jobs[0]
 need(Number.isSafeInteger(j.id)&&j.id>0&&j.name===jobName&&j.run_id===Number(input.replayRunId)&&j.run_attempt===1&&j.head_sha===input.replayHead&&j.status==='completed'&&j.conclusion==='success'&&utc(j.started_at)&&utc(j.completed_at)&&Date.parse(j.started_at)<=Date.parse(j.completed_at)&&Date.parse(j.completed_at)<=Date.now()&&Array.isArray(j.steps)&&j.steps.every(s=>s.status==='completed'&&s.conclusion==='success'),'successful bound source-only replay job required')
 const steps={}
 for(const name of [validateStep,replayStep,uploadStep]){const rows=j.steps.filter(s=>s.name===name),s=rows[0];need(rows.length===1&&utc(s.started_at)&&utc(s.completed_at)&&Date.parse(s.started_at)>=Date.parse(j.started_at)&&Date.parse(s.started_at)<=Date.parse(s.completed_at)&&apiEnd(s.completed_at)<=apiEnd(j.completed_at),'successful critical replay step required');steps[name]=s}
 need(Date.parse(steps[validateStep].completed_at)<=Date.parse(steps[replayStep].started_at)&&Date.parse(steps[replayStep].completed_at)<=Date.parse(steps[uploadStep].started_at),'replay/upload chronology differs');return {job:j,steps}
}
function artifactBound(a,input,steps){
 need(Number.isSafeInteger(a?.id)&&a.id>0&&a.name===`fussball-source-replay-${input.replayRunId}`&&a.expired===false&&Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<=1024*MiB&&/^sha256:[a-f0-9]{64}$/.test(a.digest??'')&&a.workflow_run?.id===Number(input.replayRunId)&&a.workflow_run.head_sha===input.replayHead&&a.workflow_run.head_branch==='main','available bound replay artifact required')
 need(utc(a.created_at)&&utc(a.updated_at)&&Date.parse(a.created_at)>=Date.parse(steps[uploadStep].started_at)&&Date.parse(a.created_at)<=Date.parse(a.updated_at)&&Date.parse(a.updated_at)<=apiEnd(steps[uploadStep].completed_at),'replay artifact upload timestamps differ')
}
function unpack(bytes){
 const root=mkdtempSync(join(tmpdir(),'slff-source-replay-')),path=join(root,'certificate.zip')
 try{
  writeFileSync(path,bytes,{flag:'wx',mode:0o600})
  const entries=execFileSync('unzip',['-Z1',path],{encoding:'utf8',timeout:60000,maxBuffer:4096}).trimEnd().split('\n'),details=execFileSync('unzip',['-Z','-l',path],{encoding:'utf8',timeout:60000,maxBuffer:8192}).split('\n')
  need(entries.length===4&&new Set(entries).size===4&&names.every(n=>entries.includes(n)),'exact four-member source certificate required')
  const files=new Map();let total=0
  for(const name of names){const rows=details.filter(r=>r.endsWith(' '+name));need(rows.length===1&&/^-[rwxstST-]{9}\s/.test(rows[0]),'certificate member must be regular');const bound=name.endsWith('.zip')?512*MiB:name==='certificate.json'?MiB:16*MiB,b=execFileSync('unzip',['-p',path,name],{timeout:60000,maxBuffer:bound+1});total+=b.length;need(b.length<=bound&&total<=1024*MiB,'bounded combined certificate exceeded');files.set(name,b)}
  return files
 }catch(e){if(e.code==='FUSSBALL_AUDIT_REPLAY_HOLD')throw e;need(false,'bounded certificate extraction failed')}finally{rmSync(root,{recursive:true,force:true})}
}
function parse(bytes){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{need(false,'invalid certificate UTF8/JSON')}}
/** No serialized source capability is trusted: source metadata is freshly GET
 * authenticated and the real first-phase reader replays the retained originals. */
export async function readFussballAuditReplay(input){
 shape(input,['replayRunId','replayHead','github']);const api=scoped(input),path=`actions/runs/${input.replayRunId}`,run=await api.get(path);runBound(run,input,true)
 const runtime=await installedRuntime(input,api),jobs=await api.get(path+'/attempts/1/jobs?per_page=100&page=1'),{steps}=replayJob(jobs,input),inventory=await api.get(path+'/artifacts?per_page=100&page=1')
 need(inventory?.total_count===1&&inventory.artifacts?.length===1,'exact replay artifact inventory required');artifactBound(inventory.artifacts[0],input,steps)
 const artifactPath=`actions/artifacts/${inventory.artifacts[0].id}`;api.allow(artifactPath);api.allow(artifactPath+'/zip')
 const artifact=await api.get(artifactPath);artifactBound(artifact,input,steps);need(same(artifact,inventory.artifacts[0]),'replay artifact detail differs')
 const zipBytes=await api.get(artifactPath+'/zip',true);need(zipBytes.length===artifact.size_in_bytes&&'sha256:'+hash(zipBytes)===artifact.digest,'replay artifact bytes/digest differ')
 const files=unpack(zipBytes),certificate=parse(files.get('certificate.json')),metadata=parse(files.get('source-metadata.json'))
 need(certificate.version===1&&certificate.kind==='fussball-source-only-hosted-replay'&&certificate.repository===repo&&certificate.replayRunId===input.replayRunId&&certificate.replayHead===input.replayHead&&certificate.workflow===workflow&&same(certificate.runtime,runtime)&&certificate.sourceAuthenticationOnly===true&&certificate.nativeEligible===false&&certificate.activationEligible===false,'source-only certificate scope/runtime differs')
 need(utc(certificate.createdAt)&&Date.parse(certificate.createdAt)>=Date.parse(steps[replayStep].started_at)&&Date.parse(certificate.createdAt)<=apiEnd(steps[replayStep].completed_at)&&hash(files.get('source-metadata.json'))===certificate.metadataSha256,'certificate creation/metadata bytes differ');fresh(certificate.source)
 const sourceZipPaths=new Map()
 for(const stage of ['current','archive']){const b=files.get(stage+'.zip'),original=certificate.originals?.[stage],a=metadata.artifacts?.[stage];need(original?.file===stage+'.zip'&&original.bytes===b.length&&original.sha256===hash(b)&&a?.digest==='sha256:'+hash(b)&&a.size_in_bytes===b.length,'original source ZIP binding differs');sourceZipPaths.set(prefix+`actions/artifacts/${a.id}/zip`,b)}
 // Only ZIP downloads use the already digest-bound immutable wire. Every source
 // run/job/artifact GET still comes from the authoritative adapter, twice.
 const sourceProof=await readFussballRetainedAudit({sourceRunId,github:async(p,binary)=>binary&&sourceZipPaths.has(p)?Buffer.from(sourceZipPaths.get(p)):input.github(p,binary)})
 const state=getFussballRetainedAuditWire(sourceProof);need(same(sourceProof,certificate.source)&&same(sourceMetadata(state),metadata),'genuine source proof differs from hosted certificate')
 need(same(await api.get(path),run)&&same(await api.get(path+'/attempts/1/jobs?per_page=100&page=1'),jobs)&&same(await api.get(path+'/artifacts?per_page=100&page=1'),inventory)&&same(await installedRuntime(input,api),runtime),'replay metadata/main/runtime changed during authentication');fresh(sourceProof)
 const proof=freeze({version:1,kind:'fussball-authenticated-source-replay',replayRunId:input.replayRunId,replayHead:input.replayHead,replayArtifact:{id:artifact.id,digest:artifact.digest,size:artifact.size_in_bytes},source:sourceProof,runtime,sourceAuthenticationOnly:true,nativeEligible:false,activationEligible:false})
 capabilities.set(proof,{sourceProof,certificate,metadata,zipBytes});return proof
}
export function getFussballAuditReplay(proof){const s=capabilities.get(proof);need(s,'reader-issued source replay capability required');const source=getFussballRetainedAuditWire(s.sourceProof);return{proof,source,certificate:structuredClone(s.certificate),metadata:structuredClone(s.metadata),zipBytes:Buffer.from(s.zipBytes)}}
