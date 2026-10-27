// Explicit synthetic NEW writer metadata/ZIPs. No live evidence or capabilities.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
export const sha=x=>createHash('sha256').update(x).digest('hex')
export const slug='es-ct-tercera-g9',commit='b'.repeat(40),repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const stages={mapping:['fcf-future-current-target-mapping','Derive exact future FCF native mapping','Retain exact future FCF native mapping'],import:['fcf-future-current-target-imported','Import exact future FCF target offline','Retain exact future FCF target import'],price:['fcf-future-current-target-priced','Price exact future FCF target','Retain exact future FCF target pricing'],check:['fcf-future-current-target-checked','Check exact future FCF target release','Retain exact future FCF target check'],activate:['fcf-future-current-target-activated','Activate exact future FCF target','Retain exact future FCF target activation'],recover:['fcf-future-current-target-recovered','Read back exact future FCF target receipt','Retain exact future FCF target recovery']}
export function syntheticZip(t,entries){
 const dir=mkdtempSync(join(tmpdir(),'fcf-future-stage-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'fixture.zip')
 execFileSync('python3',['-c',`import base64,json,stat,sys,zipfile
with zipfile.ZipFile(sys.argv[1],'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.load(sys.stdin):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16
  z.writestr(i,base64.b64decode(e['base64']))`,path],{input:JSON.stringify(entries.map(({name,body,symlink})=>({name,base64:Buffer.from(body??'{}').toString('base64'),symlink}))),stdio:['pipe','pipe','pipe']})
 return readFileSync(path)
}
function metadata(name,job,steps,zip){return{artifact:{id:501,name,expired:false,size_in_bytes:zip.length,digest:'sha256:'+sha(zip),workflow_run:{id:500,head_sha:commit}},run:{id:500,run_attempt:1,repository:{full_name:repository},path:'.github/workflows/uvoz-fcf-zgodovina.yml',event:'workflow_dispatch',head_branch:'main',head_sha:commit,status:'completed',conclusion:'success'},jobs:[{id:502,run_id:500,run_attempt:1,head_sha:commit,name:job,status:'completed',conclusion:'success',steps:steps.map((name,i)=>({name,number:i+2,status:'completed',conclusion:'success'}))}]}}
export function futureStageFixture(t,stage='import',approval=false){
 const originalExecution={repository,ref:'refs/heads/main',commit:'a'.repeat(40),runId:'400',runAttempt:'1'}
 const original={schemaVersion:3,kind:'fcf-future-current-target-import-rollout',targetSlug:slug,sourceCommit:originalExecution.commit,execution:originalExecution,readiness:null},activationText=JSON.stringify({schemaVersion:4,kind:'fcf-future-current-target-activation',sourceCommit:originalExecution.commit,execution:originalExecution})
 const payload=['price','check','activate'].includes(stage)?{activationText,activationSha256:sha(activationText),pricingReplay:{synthetic:true}}:stage==='recover'?{stage:'imported',competition_id:797,rolloutText:JSON.stringify(original),rolloutSha256:sha(JSON.stringify(original)),currentActive:false,canonicalVerified:false}:stage==='mapping'?{schemaVersion:1,kind:'fcf-native-target-mapping',sourceCommit:originalExecution.commit,synthetic:true}:original
 const payloadText='  '+JSON.stringify(payload)+'\n'
 const execution={repository,ref:'refs/heads/main',commit,runId:'500',runAttempt:'1'},inputs={importRolloutSha256:'c'.repeat(64),sourceFingerprintSha256:'d'.repeat(64),cleanupBeforeSha256:'e'.repeat(64)}
 const row=stages[stage]??stages.import
 const manifest=approval?{schemaVersion:2,kind:'fcf-future-current-target-approval',stage,targetSlug:slug,sourceCommit:commit,source:{protocol:'future-g9-after-six-v1',synthetic:true},originals:{synthetic:true},cleanup:{synthetic:true},mapping:null,previous:null,runtimeHashes:{'scripts/synthetic-only.mjs':'a'.repeat(64)},modelSha256:'f'.repeat(64)}:{schemaVersion:2,kind:row[0],targetSlug:slug,sourceCommit:commit,execution,inputs,result:{stage,targetSlug:slug,receiptId:'1'},payloadText,payloadSha256:sha(payloadText)}
 const name=approval?'fcf-future-target-approval-500-1':`fcf-future-target-${stage}-${slug}-500-1`,job=approval?'future-target-approval':`future-target-${stage}`,steps=approval?['Stage reviewed future FCF target approval','Retain reviewed future FCF target approval']:row.slice(1)
 const input={...(approval?{}:{stage,targetSlug:slug}),zipBytes:null,metadata:null,expected:{runId:'500',runAttempt:'1',commit,artifactId:'501',artifactDigest:'',...(approval?{rawSha256:''}:{inputs:structuredClone(inputs)})}}
 function repack({bytes=Buffer.from(JSON.stringify(manifest)),entries,rawPin=true}={}){
  input.zipBytes=syntheticZip(t,entries??[{name:'manifest.json',body:bytes}]);input.metadata=metadata(name,job,steps,input.zipBytes);input.expected.artifactDigest=input.metadata.artifact.digest;if(approval&&rawPin)input.expected.rawSha256=sha(bytes)
 }
 repack();return{input,manifest,repack,originalExecution}
}
