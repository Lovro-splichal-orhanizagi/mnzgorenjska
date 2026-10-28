// V7 hosted-source authentication only. No admission, football GET or DB path.
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {isDeepStrictEqual as same} from 'node:util'
import {zaprtje} from './odtis-kode.mjs'
import {sha256,unpackFussballV6Archive,unpackFussballV6Parent} from './dfb-artifacts.mjs'
import {fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
import {reviewedFussballArchiveV7,fussballArchiveV7CodeSha256,verifyFussballArchiveV7} from './fussball-archive-v7.mjs'
import {assertFussballV6CurrentFresh} from './fussball-archive-v6.mjs'
import {V7_FROZEN_AUTH_STEP,V7_ARCHIVE_SOURCE_STEP} from './fussball-archive-v7-actions.mjs'
const policy=reviewedFussballArchiveV7(),repo=policy.repository,prefix=`repos/${repo}/`,MiB=1024*1024,states=new WeakMap()
const archiveCode='c730046b0a543bf7d9d1dc40f56ae857e5935dd81c0b1a5aff898adcce4b06ea',underlyingCode='3473ac914e562d49a1a1ee633b8c8c2e559d21a010c44737f0beeb6aebbd7856'
const attestationStep='Preserve V7 source-only attestation separately'
const verifyStep='Reauthenticate V7 detached originals and replay without network',uploadStep='Preserve V7 originals and every counted partial attempt'
const need=(ok,why)=>{if(!ok)throw Object.assign(Error('fussball completed source v7: '+why),{dataHold:true,code:'FUSSBALL_COMPLETED_SOURCE_V7_HOLD'})}
const closed=(v,keys)=>need(v&&Object.getPrototypeOf(v)===Object.prototype&&same(Object.keys(v).sort(),keys.slice().sort()),'closed completed-source input required')
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
const stamp=x=>{need(typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)&&Number.isFinite(Date.parse(x)),'valid UTC execution timestamps required');return Date.parse(x)}
const end=x=>stamp(x)+(x.includes('.')?0:999)
function fresh(){assertFussballV6CurrentFresh(Date.now())}
/** The compiled reviewed inventory includes every producer/capture dependency,
 * data profile and workflow body. Source HEAD may differ from the writer HEAD. */
export function fussballCompletedV7RuntimeInventory(){
 need(fussballCaptureCodeSha256()===underlyingCode&&fussballArchiveV7CodeSha256()===archiveCode,'reviewed V7 capture closure changed')
 const extra=['scripts/fussball-v6-failed-replay.mjs','scripts/zajemi-fussball-sezono.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/vzorci/de-fussball-baden-archive-20261026.json',...['checkpoints','resumption','successor','v4','v5','v6','v7'].map(x=>`scripts/policies/fussball-transport-${x}.json`),policy.workflow]
 const files=[...new Set([...zaprtje('scripts/fussball-archive-v7.mjs'),...zaprtje('scripts/fussball-archive-v7-actions.mjs'),...extra])].sort()
 return Object.fromEntries(files.map(file=>[file,sha256(readFileSync(new URL('../'+file,import.meta.url)))]))
}
function runIdentity(r,id){
 need([r?.actor,r?.triggering_actor].every(a=>a?.id===25134229&&a.login==='nejcar20'&&a.type==='User'),'actual reviewed actor and triggering actor required')
 need(r?.id===Number(id)&&r.run_attempt===1&&r.status==='completed'&&r.conclusion==='success'&&/^[a-f0-9]{40}$/.test(r.head_sha??'')&&r.head_branch==='main'&&r.event==='workflow_dispatch'&&r.path===policy.workflow&&r.repository?.full_name===repo&&r.head_repository?.full_name===repo,'actual successful first-attempt main/manual V7 run required')
 need(stamp(r.created_at)<=stamp(r.updated_at)&&stamp(r.updated_at)<=Date.now(),'actual source run clock differs')
}
function jobsIdentity(v,r){
 closed(v,['total_count','jobs']);need(v.total_count===4&&v.jobs?.length===4&&new Set(v.jobs.map(j=>j.id)).size===4,'exact four-job V7 graph required')
 for(const j of v.jobs)need(Number.isSafeInteger(j.id)&&j.id>0&&j.run_id===r.id&&j.run_attempt===1&&j.head_sha===r.head_sha&&j.status==='completed'&&Array.isArray(j.steps),'actual source job identity differs')
 for(const name of ['capture','archive','handoff']){const rows=v.jobs.filter(j=>j.name===name);need(rows.length===1&&rows[0].conclusion==='skipped'&&rows[0].steps.length===0,'legacy source jobs must be skipped')}
 const rows=v.jobs.filter(j=>j.name==='archive-continuation'),j=rows[0];need(rows.length===1&&j.conclusion==='success'&&stamp(j.started_at)>=stamp(r.created_at)&&stamp(j.started_at)<=stamp(j.completed_at)&&end(j.completed_at)<=end(r.updated_at)&&j.steps.every(s=>s.status==='completed'&&['success','skipped'].includes(s.conclusion)),'successful archive-continuation job required')
 const steps={};let previous=stamp(j.started_at)
 for(const name of ['Validate exact archive-only V7 scope and1952 spent budget','Focused offline V7 boundary checks',V7_FROZEN_AUTH_STEP,'Exercise genuine V7 ledger and resource boundaries offline','Share host pacing immediately before V7 source guard',V7_ARCHIVE_SOURCE_STEP,verifyStep,uploadStep,attestationStep]){const ss=j.steps.filter(s=>s.name===name),s=ss[0];need(ss.length===1&&s.status==='completed'&&s.conclusion==='success'&&stamp(s.started_at)>=previous&&stamp(s.started_at)<=stamp(s.completed_at)&&end(s.completed_at)<=end(j.completed_at),'actual ordered frozen-auth/capture/replay/upload steps required');previous=stamp(s.completed_at);steps[name]=s}
 return steps
}
function artifactIdentity(a,r,name,step){
 need(Number.isSafeInteger(a?.id)&&a.id>0&&a.name===name&&a.expired===false&&Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<=100*MiB&&/^sha256:[a-f0-9]{64}$/.test(a.digest??'')&&a.workflow_run?.id===r.id&&a.workflow_run.head_sha===r.head_sha&&a.workflow_run.head_branch==='main','actual bounded V7 artifact metadata required')
 need(stamp(a.created_at)>=stamp(step.started_at)&&stamp(a.created_at)<=stamp(a.updated_at)&&end(a.updated_at)<=end(step.completed_at),'artifact upload chronology differs')
}
function unpackAttestation(bytes,digest){
 need(Buffer.isBuffer(bytes)&&bytes.length<=MiB&&'sha256:'+sha256(bytes)===digest,'bounded actual source attestation ZIP required')
 const scratch=mkdtempSync(join(tmpdir(),'slff-v7-attestation-')),path=join(scratch,'attestation.zip'),name='archive-v7-source-attestation.json'
 try{writeFileSync(path,bytes);const entries=execFileSync('unzip',['-Z1',path],{encoding:'utf8',timeout:60000,maxBuffer:4096}).trimEnd().split('\n'),details=execFileSync('unzip',['-Z','-l',path],{encoding:'utf8',timeout:60000,maxBuffer:8192}).split('\n'),rows=details.filter(r=>r.endsWith(' '+name));need(same(entries,[name])&&rows.length===1&&/^-[rwxstST-]{9}\s/.test(rows[0]),'exact regular source attestation member required');const raw=execFileSync('unzip',['-p',path,name],{timeout:60000,maxBuffer:MiB+1});need(raw.length<=MiB,'source attestation expansion exceeded');return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw))}finally{rmSync(scratch,{recursive:true,force:true})}
}
const copyFiles=files=>new Map([...files].map(([p,b])=>[p,Buffer.from(b)]))
const parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b))
function putFiles(root,files){for(const [f,b]of files){mkdirSync(dirname(join(root,f)),{recursive:true});writeFileSync(join(root,f),b,{flag:'wx'})}}
/** Root supplies the actual run ID only once it exists. Public receipts and
 * caller-supplied eligibility/freshness/runtime overrides are never accepted. */
export async function readFussballCompletedSourceV7(input){
 closed(input,['sourceRunId','frozenDirectory','v6FrozenDirectory','github']);need(/^[1-9]\d{0,15}$/.test(input.sourceRunId??'')&&Number.isSafeInteger(Number(input.sourceRunId))&&typeof input.frozenDirectory==='string'&&input.frozenDirectory.length>0&&typeof input.v6FrozenDirectory==='string'&&input.v6FrozenDirectory.length>0&&input.sourceRunId!==policy.failedV6.runId&&input.sourceRunId!==policy.sourceRunId&&typeof input.github==='function','actual run ID, frozen checkout and GET adapter required');fresh()
 const base=`actions/runs/${input.sourceRunId}`,allowed=new Set([base,base+'/attempts/1/jobs?per_page=100',base+'/artifacts?per_page=100'])
 const get=async(path,binary=false)=>{need(allowed.has(path),'GET outside closed V7 source scope');const v=await input.github(prefix+path,binary);if(binary){need(Buffer.isBuffer(v)&&v.length<=100*MiB,'bounded source ZIP required');return Buffer.from(v)}return structuredClone(v)}
 const run=await get(base);runIdentity(run,input.sourceRunId);const jobs=await get(base+'/attempts/1/jobs?per_page=100'),steps=jobsIdentity(jobs,run),inventory=await get(base+'/artifacts?per_page=100')
 need(inventory?.total_count===2&&inventory.artifacts?.length===2&&new Set(inventory.artifacts.map(a=>a.id)).size===2,'exact archive and separate attestation artifact inventory required')
 const name=`fussball-season-archive-v7-${input.sourceRunId}`,matches=inventory.artifacts.filter(a=>a.name===name),att=inventory.artifacts.filter(a=>a.name===`fussball-archive-v7-source-attestation-${input.sourceRunId}`)
 need(matches.length===1&&att.length===1,'actual V7 source artifact names differ');artifactIdentity(matches[0],run,name,steps[uploadStep])
 artifactIdentity(att[0],run,att[0].name,steps[attestationStep])
 const runtime=fussballCompletedV7RuntimeInventory()
 for(const [file,hash]of Object.entries(runtime)){const path=`contents/${file}?ref=${run.head_sha}`;allowed.add(path);const blob=await get(path),body=readFileSync(new URL('../'+file,import.meta.url));need(blob?.type==='file'&&blob.path===file&&blob.encoding==='base64'&&blob.size===body.length&&typeof blob.content==='string'&&sha256(Buffer.from(blob.content,'base64'))===hash,'immutable producer workflow/runtime body differs')}
 const parents={}
 for(const stage of ['current','archive']){
  const pin=policy[stage],paths=[`actions/runs/${policy.sourceRunId}`,`actions/runs/${policy.sourceRunId}/attempts/1/jobs?per_page=100`,`actions/artifacts/${pin.artifactId}`,`actions/artifacts/${pin.artifactId}/zip`];paths.forEach(p=>allowed.add(p))
  parents[stage]={run:await get(paths[0]),jobs:await get(paths[1]),artifact:await get(paths[2]),zipBytes:await get(paths[3],true)}
 }
 const failed={},pin=policy.failedV6,failedPaths=[`actions/runs/${pin.runId}`,`actions/runs/${pin.runId}/attempts/1/jobs?per_page=100`,`actions/artifacts/${pin.artifactId}`,`actions/artifacts/${pin.artifactId}/zip`];failedPaths.forEach(p=>allowed.add(p));for(const [i,key]of ['run','jobs','artifact','zipBytes'].entries())failed[key]=await get(failedPaths[i],key==='zipBytes')
 const ap=`actions/artifacts/${matches[0].id}`;allowed.add(ap);allowed.add(ap+'/zip');const artifact=await get(ap);need(same(artifact,matches[0]),'actual artifact detail drift');const zip=await get(ap+'/zip',true);need(zip.length===artifact.size_in_bytes&&'sha256:'+sha256(zip)===artifact.digest,'actual archive ZIP digest differs')
 const files=unpackFussballV6Archive(zip,artifact.digest),scratch=realpathSync(mkdtempSync(join(tmpdir(),'slff-completed-v7-')))
 let verified
 try{
  const parentDir=join(scratch,'detached'),archiveDir=join(scratch,'archive');mkdirSync(join(parentDir,'parents'),{recursive:true});mkdirSync(archiveDir)
  for(const [stage,{zipBytes,...metadata}]of Object.entries(parents)){const p=join(parentDir,'parents',`${policy.sourceRunId}-${stage}`);writeFileSync(p+'.json',JSON.stringify(metadata)+'\n',{flag:'wx'});writeFileSync(p+'.zip',zipBytes,{flag:'wx'})}
  const failedDir=join(parentDir,'failed-v6');mkdirSync(failedDir);for(const [name,key]of [['terminal-run.json','run'],['terminal-jobs.json','jobs'],['archive-metadata.json','artifact']])writeFileSync(join(failedDir,name),JSON.stringify(failed[key])+'\n',{flag:'wx'});writeFileSync(join(failedDir,'archive.zip'),failed.zipBytes,{flag:'wx'});
  putFiles(archiveDir,files);verified=await verifyFussballArchiveV7({directory:archiveDir,parentDirectory:parentDir,frozenDirectory:realpathSync(input.frozenDirectory),v6FrozenDirectory:realpathSync(input.v6FrozenDirectory),failedDirectory:failedDir})
 }finally{rmSync(scratch,{recursive:true,force:true})}
 fresh();need(verified.verified===true&&verified.nativeAdmission===false&&verified.activationEligible===false&&verified.sourceOnly===true&&verified.priorRequests===1952&&Number.isSafeInteger(verified.requests)&&verified.requests>0&&verified.requests<=3000&&verified.cumulativeRequests===1952+verified.requests&&verified.cumulativeRequests<=4952&&verified.totalRequestCap===5000&&verified.codeSha256===archiveCode,'independent completed-source replay required')
 const m=parse(files.get('manifest.json'));need(m.version===7&&m.success===true&&m.error===null&&m.codeSha256===archiveCode&&m.checkpoint?.version===6&&m.checkpoint.proof?.priorRequests===1952&&m.checkpoint.proof?.currentRequests===0&&m.checkpoint.proof?.totalRequestCap===5000&&m.checkpoint.proof.failedV6?.runId===policy.failedV6.runId,'exact successful schema7/checkpoint6 after genuine1952 required');need(stamp(m.createdAt)>=stamp(steps[V7_ARCHIVE_SOURCE_STEP].started_at)&&stamp(m.completedAt)<=end(steps[V7_ARCHIVE_SOURCE_STEP].completed_at),'archive bytes must originate in actual capture step')
 need(same(await get(base),run)&&same(await get(base+'/attempts/1/jobs?per_page=100'),jobs)&&same(await get(base+'/artifacts?per_page=100'),inventory)&&same(await get(ap),artifact),'hosted execution/artifact metadata changed during verification')
 const attPath=`actions/artifacts/${att[0].id}`;allowed.add(attPath);allowed.add(attPath+'/zip');const attArtifact=await get(attPath);need(same(attArtifact,att[0]),'source attestation metadata drift');const attBytes=await get(attPath+'/zip',true);need(attBytes.length===attArtifact.size_in_bytes,'source attestation ZIP length differs');const attestation=unpackAttestation(attBytes,attArtifact.digest);need(same(attestation,verified),'hosted source attestation differs from independent schema7 replay');need(same(await get(attPath),attArtifact)&&same(await get(base),run)&&same(await get(base+'/attempts/1/jobs?per_page=100'),jobs)&&same(await get(base+'/artifacts?per_page=100'),inventory)&&same(await get(ap),artifact),'source execution/artifacts changed during final attestation verification')
 fresh();const currentFiles=unpackFussballV6Parent(parents.current.zipBytes,policy.current.artifactSha256,'current')
 const source={sourceRunId:input.sourceRunId,sourceHead:run.head_sha,captureCodeSha256:archiveCode,underlyingCaptureCodeSha256:underlyingCode,currentSourceRunId:policy.sourceRunId,currentSourceHead:policy.sourceCommit,currentCodeSha256:policy.sourceCodeSha256,currentCreatedAt:policy.current.createdAt,currentFreshUntil:new Date(Date.parse(policy.current.createdAt)+24*3600_000).toISOString(),priorRequests:1952,requests:verified.requests,cumulativeRequests:verified.cumulativeRequests,totalRequestCap:5000,artifacts:[{stage:'current',id:parents.current.artifact.id,digest:parents.current.artifact.digest},{stage:'failed-archive-parent',id:parents.archive.artifact.id,digest:parents.archive.artifact.digest},{stage:'failed-v6-archive',id:failed.artifact.id,digest:failed.artifact.digest},{stage:'archive',id:artifact.id,digest:artifact.digest},{stage:'source-attestation',id:att[0].id,digest:att[0].digest}],nativeEligible:false,activationEligible:false,nativeAdmission:false}
 const proof=freeze({version:1,kind:'authenticated-completed-fussball-v7-source',source,sourceOnly:true,nativeAdmission:false,activationEligible:false})
 states.set(proof,{input:{...input},originals:{stages:{current:{manifest:parse(currentFiles.get('manifest.json')),result:parse(currentFiles.get('result.json')),files:currentFiles},archive:{manifest:m,result:parse(files.get('result.json')),files}}},certificate:{run,jobs,artifact,attestationArtifact:attArtifact,attestation,runtime,verified}});return proof
}
export function getFussballCompletedSourceV7(proof){const s=states.get(proof);need(s,'reader-issued completed V7 capability required');fresh();return {proof,originals:{stages:Object.fromEntries(Object.entries(s.originals.stages).map(([k,v])=>[k,{manifest:structuredClone(v.manifest),result:structuredClone(v.result),files:copyFiles(v.files)}]))},certificate:structuredClone(s.certificate)}}
export async function reauthenticateFussballCompletedSourceV7(proof){const s=states.get(proof);need(s,'reader-issued completed V7 capability required');fresh();return readFussballCompletedSourceV7(s.input)}
