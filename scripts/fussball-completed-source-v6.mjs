// V6 hosted-source authentication only. No admission, football GET or DB path.
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {isDeepStrictEqual as same} from 'node:util'
import {zaprtje} from './odtis-kode.mjs'
import {sha256,unpackFussballV6Archive,unpackFussballV6Parent} from './dfb-artifacts.mjs'
import {fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
import {reviewedFussballArchiveV6,fussballArchiveV6CodeSha256,assertFussballV6CurrentFresh,verifyFussballArchiveV6} from './fussball-archive-v6.mjs'
import {V6_FROZEN_AUTH_STEP,V6_ARCHIVE_SOURCE_STEP} from './fussball-archive-v6-actions.mjs'
const policy=reviewedFussballArchiveV6(),repo=policy.repository,prefix=`repos/${repo}/`,MiB=1024*1024,states=new WeakMap()
const archiveCode='8b1c4befedca7fc3e92a946b792a32e0ec166a33e870a9e47262211318554301',underlyingCode='9f779baf8822fe2c6cf64e3213eadc7612a9911ad826d8cc2965f7fbb517b864'
const attestationStep='Preserve source-only attestation separately from immutable historical parents'
const verifyStep='Reauthenticate detached originals and replay archive with no network',uploadStep='Preserve V6 archive originals and all counted attempts'
const need=(ok,why)=>{if(!ok)throw Object.assign(Error('fussball completed source v6: '+why),{dataHold:true,code:'FUSSBALL_COMPLETED_SOURCE_V6_HOLD'})}
const closed=(v,keys)=>need(v&&Object.getPrototypeOf(v)===Object.prototype&&same(Object.keys(v).sort(),keys.slice().sort()),'closed completed-source input required')
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
const stamp=x=>{need(typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)&&Number.isFinite(Date.parse(x)),'valid UTC execution timestamps required');return Date.parse(x)}
const end=x=>stamp(x)+(x.includes('.')?0:999)
function fresh(){assertFussballV6CurrentFresh(Date.now())}
/** The compiled reviewed inventory includes every producer/capture dependency,
 * data profile and workflow body. Source HEAD may differ from the writer HEAD. */
export function fussballCompletedV6RuntimeInventory(){
 need(fussballCaptureCodeSha256()===underlyingCode&&fussballArchiveV6CodeSha256()===archiveCode,'reviewed V6 capture closure changed')
 const extra=['scripts/zajemi-fussball-sezono.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/vzorci/de-fussball-baden-archive-20261026.json',...['checkpoints','resumption','successor','v4','v5','v6'].map(x=>`scripts/policies/fussball-transport-${x}.json`),policy.workflow]
 const files=[...new Set([...zaprtje('scripts/fussball-archive-v6.mjs'),...zaprtje('scripts/fussball-archive-v6-actions.mjs'),...extra])].sort()
 return Object.fromEntries(files.map(file=>[file,sha256(readFileSync(new URL('../'+file,import.meta.url)))]))
}
function runIdentity(r,id){
 need(r?.id===Number(id)&&r.run_attempt===1&&r.status==='completed'&&r.conclusion==='success'&&/^[a-f0-9]{40}$/.test(r.head_sha??'')&&r.head_branch==='main'&&r.event==='workflow_dispatch'&&r.path===policy.workflow&&r.repository?.full_name===repo&&r.head_repository?.full_name===repo,'actual successful first-attempt main/manual V6 run required')
 need(stamp(r.created_at)<=stamp(r.updated_at)&&stamp(r.updated_at)<=Date.now(),'actual source run clock differs')
}
function jobsIdentity(v,r){
 closed(v,['total_count','jobs']);need(v.total_count===4&&v.jobs?.length===4&&new Set(v.jobs.map(j=>j.id)).size===4,'exact four-job V6 graph required')
 for(const j of v.jobs)need(Number.isSafeInteger(j.id)&&j.id>0&&j.run_id===r.id&&j.run_attempt===1&&j.head_sha===r.head_sha&&j.status==='completed'&&Array.isArray(j.steps),'actual source job identity differs')
 for(const name of ['capture','archive','handoff']){const rows=v.jobs.filter(j=>j.name===name);need(rows.length===1&&rows[0].conclusion==='skipped'&&rows[0].steps.length===0,'legacy source jobs must be skipped')}
 const rows=v.jobs.filter(j=>j.name==='archive-continuation'),j=rows[0];need(rows.length===1&&j.conclusion==='success'&&stamp(j.started_at)>=stamp(r.created_at)&&stamp(j.started_at)<=stamp(j.completed_at)&&end(j.completed_at)<=end(r.updated_at)&&j.steps.every(s=>s.status==='completed'&&s.conclusion==='success'),'successful archive-continuation job required')
 const steps={};let previous=stamp(j.started_at)
 for(const name of ['Validate exact archive-only V6 scope and1838 spent budget','Focused offline archive continuation checks',V6_FROZEN_AUTH_STEP,'Exercise genuine retained originals offline before source','Share host pacing with older nightly and bulk readers',V6_ARCHIVE_SOURCE_STEP,verifyStep,uploadStep,attestationStep]){const ss=j.steps.filter(s=>s.name===name),s=ss[0];need(ss.length===1&&stamp(s.started_at)>=previous&&stamp(s.started_at)<=stamp(s.completed_at)&&end(s.completed_at)<=end(j.completed_at),'actual ordered frozen-auth/capture/replay/upload steps required');previous=stamp(s.completed_at);steps[name]=s}
 return steps
}
function artifactIdentity(a,r,name,step){
 need(Number.isSafeInteger(a?.id)&&a.id>0&&a.name===name&&a.expired===false&&Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<=100*MiB&&/^sha256:[a-f0-9]{64}$/.test(a.digest??'')&&a.workflow_run?.id===r.id&&a.workflow_run.head_sha===r.head_sha&&a.workflow_run.head_branch==='main','actual bounded V6 artifact metadata required')
 need(stamp(a.created_at)>=stamp(step.started_at)&&stamp(a.created_at)<=stamp(a.updated_at)&&end(a.updated_at)<=end(step.completed_at),'artifact upload chronology differs')
}
const copyFiles=files=>new Map([...files].map(([p,b])=>[p,Buffer.from(b)]))
const parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b))
function putFiles(root,files){for(const [f,b]of files){mkdirSync(dirname(join(root,f)),{recursive:true});writeFileSync(join(root,f),b,{flag:'wx'})}}
/** Root supplies the actual run ID only once it exists. Public receipts and
 * caller-supplied eligibility/freshness/runtime overrides are never accepted. */
export async function readFussballCompletedSourceV6(input){
 closed(input,['sourceRunId','frozenDirectory','github']);need(/^[1-9]\d{0,15}$/.test(input.sourceRunId??'')&&Number.isSafeInteger(Number(input.sourceRunId))&&typeof input.frozenDirectory==='string'&&input.frozenDirectory.length>0&&typeof input.github==='function','actual run ID, frozen checkout and GET adapter required');fresh()
 const base=`actions/runs/${input.sourceRunId}`,allowed=new Set([base,base+'/attempts/1/jobs?per_page=100',base+'/artifacts?per_page=100'])
 const get=async(path,binary=false)=>{need(allowed.has(path),'GET outside closed V6 source scope');const v=await input.github(prefix+path,binary);if(binary){need(Buffer.isBuffer(v)&&v.length<=100*MiB,'bounded source ZIP required');return Buffer.from(v)}return structuredClone(v)}
 const run=await get(base);runIdentity(run,input.sourceRunId);const jobs=await get(base+'/attempts/1/jobs?per_page=100'),steps=jobsIdentity(jobs,run),inventory=await get(base+'/artifacts?per_page=100')
 need(inventory?.total_count===2&&inventory.artifacts?.length===2&&new Set(inventory.artifacts.map(a=>a.id)).size===2,'exact archive and separate attestation artifact inventory required')
 const name=`fussball-season-archive-v6-${input.sourceRunId}`,matches=inventory.artifacts.filter(a=>a.name===name),att=inventory.artifacts.filter(a=>a.name===`fussball-archive-v6-source-attestation-${input.sourceRunId}`)
 need(matches.length===1&&att.length===1,'actual V6 source artifact names differ');artifactIdentity(matches[0],run,name,steps[uploadStep])
 artifactIdentity(att[0],run,att[0].name,steps[attestationStep])
 const runtime=fussballCompletedV6RuntimeInventory()
 for(const [file,hash]of Object.entries(runtime)){const path=`contents/${file}?ref=${run.head_sha}`;allowed.add(path);const blob=await get(path),body=readFileSync(new URL('../'+file,import.meta.url));need(blob?.type==='file'&&blob.path===file&&blob.encoding==='base64'&&blob.size===body.length&&typeof blob.content==='string'&&sha256(Buffer.from(blob.content,'base64'))===hash,'immutable producer workflow/runtime body differs')}
 const parents={}
 for(const stage of ['current','archive']){
  const pin=policy[stage],paths=[`actions/runs/${policy.sourceRunId}`,`actions/runs/${policy.sourceRunId}/attempts/1/jobs?per_page=100`,`actions/artifacts/${pin.artifactId}`,`actions/artifacts/${pin.artifactId}/zip`];paths.forEach(p=>allowed.add(p))
  parents[stage]={run:await get(paths[0]),jobs:await get(paths[1]),artifact:await get(paths[2]),zipBytes:await get(paths[3],true)}
 }
 const ap=`actions/artifacts/${matches[0].id}`;allowed.add(ap);allowed.add(ap+'/zip');const artifact=await get(ap);need(same(artifact,matches[0]),'actual artifact detail drift');const zip=await get(ap+'/zip',true);need(zip.length===artifact.size_in_bytes&&'sha256:'+sha256(zip)===artifact.digest,'actual archive ZIP digest differs')
 const files=unpackFussballV6Archive(zip,artifact.digest),scratch=mkdtempSync(join(tmpdir(),'slff-completed-v6-'))
 let verified
 try{
  const parentDir=join(scratch,'detached'),archiveDir=join(scratch,'archive');mkdirSync(join(parentDir,'parents'),{recursive:true});mkdirSync(archiveDir)
  for(const [stage,{zipBytes,...metadata}]of Object.entries(parents)){const p=join(parentDir,'parents',`${policy.sourceRunId}-${stage}`);writeFileSync(p+'.json',JSON.stringify(metadata)+'\n',{flag:'wx'});writeFileSync(p+'.zip',zipBytes,{flag:'wx'})}
  putFiles(archiveDir,files);verified=await verifyFussballArchiveV6({directory:archiveDir,parentDirectory:parentDir,frozenDirectory:input.frozenDirectory})
 }finally{rmSync(scratch,{recursive:true,force:true})}
 fresh();need(verified.verified===true&&verified.nativeAdmission===false&&verified.cumulativeRequests<=5000&&verified.codeSha256===archiveCode,'independent completed-source replay required')
 const m=parse(files.get('manifest.json'));need(stamp(m.createdAt)>=stamp(steps[V6_ARCHIVE_SOURCE_STEP].started_at)&&stamp(m.completedAt)<=end(steps[V6_ARCHIVE_SOURCE_STEP].completed_at),'archive bytes must originate in actual capture step')
 need(same(await get(base),run)&&same(await get(base+'/attempts/1/jobs?per_page=100'),jobs)&&same(await get(base+'/artifacts?per_page=100'),inventory)&&same(await get(ap),artifact),'hosted execution/artifact metadata changed during verification')
 const currentFiles=unpackFussballV6Parent(parents.current.zipBytes,policy.current.artifactSha256,'current')
 const source={sourceRunId:input.sourceRunId,sourceHead:run.head_sha,captureCodeSha256:archiveCode,underlyingCaptureCodeSha256:underlyingCode,currentSourceRunId:policy.sourceRunId,currentSourceHead:policy.sourceCommit,currentCodeSha256:policy.sourceCodeSha256,currentCreatedAt:policy.current.createdAt,currentFreshUntil:new Date(Date.parse(policy.current.createdAt)+24*3600_000).toISOString(),priorRequests:1838,requests:verified.requests,cumulativeRequests:verified.cumulativeRequests,totalRequestCap:5000,artifacts:[{stage:'current',id:parents.current.artifact.id,digest:parents.current.artifact.digest},{stage:'failed-archive-parent',id:parents.archive.artifact.id,digest:parents.archive.artifact.digest},{stage:'archive',id:artifact.id,digest:artifact.digest}],nativeEligible:false,activationEligible:false,nativeAdmission:false}
 const proof=freeze({version:1,kind:'authenticated-completed-fussball-v6-source',source,sourceOnly:true,nativeAdmission:false,activationEligible:false})
 states.set(proof,{input:{...input},originals:{stages:{current:{manifest:parse(currentFiles.get('manifest.json')),result:parse(currentFiles.get('result.json')),files:currentFiles},archive:{manifest:m,result:parse(files.get('result.json')),files}}},certificate:{run,jobs,artifact,runtime,verified}});return proof
}
export function getFussballCompletedSourceV6(proof){const s=states.get(proof);need(s,'reader-issued completed V6 capability required');fresh();return {proof,originals:{stages:Object.fromEntries(Object.entries(s.originals.stages).map(([k,v])=>[k,{manifest:structuredClone(v.manifest),result:structuredClone(v.result),files:copyFiles(v.files)}]))},certificate:structuredClone(s.certificate)}}
export async function reauthenticateFussballCompletedSourceV6(proof){const s=states.get(proof);need(s,'reader-issued completed V6 capability required');fresh();return readFussballCompletedSourceV6(s.input)}
