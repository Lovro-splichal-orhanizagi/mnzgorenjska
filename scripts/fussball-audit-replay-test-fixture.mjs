// TEST ONLY: synthetic hosted metadata and first-phase source verifier control.
// No actual paired-source readiness claim; production has no injection seam.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {fixture,zip,hash} from './fussball-retained-audit-test-fixture.mjs'
import {fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
export {zip,hash}
export const repo='Lovro-splichal-orhanizagi/mnzgorenjska',replayHead='a'.repeat(40),replayRunId='40649999999',prefix=`repos/${repo}/`
export const validateStep='Validate exact reviewed main and first attempt',replayStep='Authenticate and replay original paired source bytes',uploadStep='Preserve source-only replay certificate'
export function isolatedSource(){
 const path=new URL('./fussball-retained-audit.mjs',import.meta.url),code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFussballRetainedAudit,getFussballRetainedAuditWire};'
 const verify=async directory=>{const m=JSON.parse(readFileSync(join(directory,'manifest.json')));return{verified:true,activationEligible:false,checkpointPreset:'baden-reviewed-transports-v5',priorRequests:1568,codeSha256:fussballCaptureCodeSha256(),requests:m.snapshot.requests}}
 return new Function('readFileSync','writeFileSync','mkdirSync','mkdtempSync','rmSync','join','dirname','tmpdir','execFileSync','createHash','isDeepStrictEqual','verifyFussballDirectory','fussballCaptureCodeSha256',code)(readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,join,dirname,tmpdir,execFileSync,createHash,isDeepStrictEqual,verify,fussballCaptureCodeSha256)
}
export function isolatedReplay(source=isolatedSource()){
 const path=new URL('./fussball-audit-replay.mjs',import.meta.url),code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {produceFussballAuditReplay,readFussballAuditReplay,getFussballAuditReplay};'
 return new Function('readFileSync','writeFileSync','mkdirSync','mkdtempSync','rmSync','join','tmpdir','execFileSync','createHash','isDeepStrictEqual','readFussballRetainedAudit','getFussballRetainedAuditWire',code)(readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,join,tmpdir,execFileSync,createHash,isDeepStrictEqual,source.readFussballRetainedAudit,source.getFussballRetainedAuditWire??source.getFussballRetainedAudit)
}
export async function hostedFixture(t){
 const source=fixture(),api=isolatedReplay(),root=mkdtempSync(join(tmpdir(),'hosted-replay-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}))
 const created=new Date(Date.now()-60000).toISOString(),run={id:Number(replayRunId),run_attempt:1,head_sha:replayHead,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/replay-fussball-audit.yml',repository:{full_name:repo},head_repository:{full_name:repo},status:'in_progress',conclusion:null,created_at:created,updated_at:created}
 const f={source,api,root,run,calls:[],controls:{},main:{name:'main',commit:{sha:replayHead}}}
 f.github=async(path,binary=false)=>{
  f.calls.push({path,binary});let v
  if(path===prefix+'branches/main')v=f.main
  else if(path.startsWith(prefix+'contents/')){const file=path.slice((prefix+'contents/').length).split('?')[0],bytes=readFileSync(new URL('../'+file,import.meta.url));v={type:'file',path:file,encoding:'base64',size:bytes.length,content:bytes.toString('base64')}}
  else if(path===prefix+`actions/runs/${replayRunId}`)v=f.run
  else if(path===prefix+`actions/runs/${replayRunId}/attempts/1/jobs?per_page=100&page=1`)v=f.jobs
  else if(path===prefix+`actions/runs/${replayRunId}/artifacts?per_page=100&page=1`)v=f.inventory
  else if(path===prefix+'actions/artifacts/201')v=f.artifact
  else if(path===prefix+'actions/artifacts/201/zip'&&binary)v=Buffer.from(f.zipBytes)
  else return source.github(path,binary)
  if(f.controls.change)v=f.controls.change(path,v,binary)??v
  return Buffer.isBuffer(v)?Buffer.from(v):structuredClone(v)
 }
 const output=join(root,'wire');f.certificate=await api.produceFussballAuditReplay({sourceRunId:'40641606028',replayRunId,replayHead,github:f.github,directory:output})
 f.files=new Map(['certificate.json','source-metadata.json','current.zip','archive.zip'].map(n=>[n,readFileSync(join(output,n))]))
 const stamp=n=>new Date(n).toISOString(),certTime=Date.parse(f.certificate.createdAt),end=Date.now()
 f.run.status='completed';f.run.conclusion='success';f.run.updated_at=stamp(end)
 const step=(name,number,start,finish)=>({name,number,status:'completed',conclusion:'success',started_at:stamp(start),completed_at:stamp(finish)})
 f.jobs={total_count:1,jobs:[{id:301,name:'replay',run_id:Number(replayRunId),run_attempt:1,head_sha:replayHead,status:'completed',conclusion:'success',started_at:created,completed_at:stamp(end),steps:[step(validateStep,1,certTime-10000,certTime-2000),step(replayStep,2,certTime-1000,certTime),step(uploadStep,3,certTime,end)]}]}
 f.artifact={id:201,name:`fussball-source-replay-${replayRunId}`,expired:false,created_at:stamp(certTime),updated_at:stamp(end),workflow_run:{id:Number(replayRunId),head_sha:replayHead,head_branch:'main'}}
 f.refresh=()=>{f.zipBytes=zip(f.files);f.artifact.size_in_bytes=f.zipBytes.length;f.artifact.digest='sha256:'+hash(f.zipBytes);f.inventory={total_count:1,artifacts:[f.artifact]}}
 f.recertify=change=>{const c=JSON.parse(f.files.get('certificate.json'));change(c);f.files.set('certificate.json',Buffer.from(JSON.stringify(c)+'\n'));f.refresh()}
 f.refresh();return f
}
