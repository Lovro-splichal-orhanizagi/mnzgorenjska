import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {authenticateFcfG1Native800ControllerPreview} from './fcf-g1-native800-controller.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska',commit='a'.repeat(40),runId='123',root={id:25134229,login:'nejcar20',type:'User'},sha=b=>createHash('sha256').update(b).digest('hex')
function fixture(){
 const cleanup={history:{runId:'301',sourceCommit:commit},originals:{artifactId:'10',digest:'sha256:'+'1'.repeat(64)},prepare:{artifactId:'11',digest:'sha256:'+'2'.repeat(64)},applied:{artifactId:'12',digest:'sha256:'+'3'.repeat(64)}}
 const bootstrap={schemaVersion:1,kind:'fcf-native800-bootstrap',mainCiRunId:'456',captureLocator:{disposition:'capture',runId:'789',sourceCommit:commit},cleanup},bootstrapBytes=Buffer.from(JSON.stringify(bootstrap)+'\n'),runtimeFiles=[{path:'scripts/fcf-g1-native800-controller.mjs',sha256:'b'.repeat(64)}],modelSha256='c'.repeat(64),execution={repository,ref:'refs/heads/main',commit,runId,runAttempt:'1'},rolloutText=JSON.stringify({kind:'fcf-g1-native800-import-rollout',targetSlug:'es-ct-segona-g1',sourceCommit:commit}),payload={bootstrap,bootstrapText:bootstrapBytes.toString('utf8'),bootstrapSha256:sha(bootstrapBytes),runtimeFiles,modelSha256,activate:false,sourceDeadline:Date.now()+3600000,nativePreparation:{projection:{capturedUTC:new Date(Date.now()-1000).toISOString()}},rolloutText,rolloutSha256:sha(rolloutText)},payloadText=JSON.stringify(payload),manifest=Buffer.from(JSON.stringify({schemaVersion:1,kind:'fcf-native800-stage',stage:'preview',status:'SUCCESS',execution,payloadText,payloadSha256:sha(payloadText)})+'\n'),zip=execFileSync('python3',['-c',"import sys,io,zipfile,stat;b=io.BytesIO();z=zipfile.ZipFile(b,'w');i=zipfile.ZipInfo('manifest.json');i.create_system=3;i.external_attr=(stat.S_IFREG|0o600)<<16;z.writestr(i,sys.stdin.buffer.read());z.close();sys.stdout.buffer.write(b.getvalue())"],{input:manifest}),artifact={id:900,name:`g1-native800-preview-${runId}-1`,expired:false,size_in_bytes:zip.length,digest:'sha256:'+sha(zip),created_at:new Date().toISOString(),workflow_run:{id:Number(runId),head_sha:commit}},run={id:Number(runId),run_attempt:1,path:'.github/workflows/fcf-g1-native800.yml',event:'workflow_dispatch',head_sha:commit,head_branch:'main',status:'in_progress',repository:{full_name:repository},head_repository:{full_name:repository},actor:root,triggering_actor:root},steps=['Authenticate exact native800 epoch','Read-only native800 preview','Retain native800 preview'].map((name,i)=>({number:i+1,name,status:'completed',conclusion:'success'})),jobs=[{id:321,run_id:Number(runId),run_attempt:1,head_sha:commit,name:'native800-import',status:'in_progress',steps}],calls=[]
 const github=async path=>{calls.push(path);const m=new RegExp(`^repos/${repository.replace('/','\\/')}/actions/runs\\?status=([^&]+)&per_page=100&page=1$`).exec(path);assert.ok(m,'fixed repository writer-census GET only');const status=m[1];return status==='in_progress'?{total_count:1,workflow_runs:[run]}:{total_count:0,workflow_runs:[]}}
 return {github,calls,bootstrapBytes,runtimeFiles,modelSha256,run,jobs,artifact,zip,manifest,expected:{runId,commit,runtimeFiles,modelSha256,activate:false}}
}
async function check(f){return authenticateFcfG1Native800ControllerPreview({github:f.github,bootstrapBytes:f.bootstrapBytes,run:f.run,jobs:f.jobs,artifact:f.artifact,zip:f.zip,expected:f.expected})}
async function rejectsCensus(f,code){await assert.rejects(check(f),error=>error?.activeWriterCode===code)}

test('controller authenticates real-shaped G1 bootstrap locators and preview ZIP before allowing immutable approval DATA',async()=>{
 const f=fixture(),out=await check(f);assert.equal(out.preview.bootstrapSha256,sha(f.bootstrapBytes));assert.equal(out.approval.kind,'fcf-g1-native800-root-approval');assert.equal(out.approval.execution.runId,runId);assert.equal(out.approval.cleanup.applied.artifactId,'12');assert.equal(out.approval.preview.manifestSha256,sha(f.manifest));assert.deepEqual(f.calls.map(x=>new URLSearchParams(x.split('?')[1]).get('status')),['in_progress','queued','requested','waiting','pending'])
})

test('boolean cleanup shortcut, changed server run ID, and missing retained step refuse G1 controller approval',async()=>{
 const badCleanup=fixture();badCleanup.bootstrapBytes=Buffer.from(JSON.stringify({...JSON.parse(badCleanup.bootstrapBytes),cleanup:{...JSON.parse(badCleanup.bootstrapBytes).cleanup,applied:true}}));await assert.rejects(check(badCleanup),/ROOT_APPROVED_G1_APPLIED_CLEANUP_LOCATORS/)
 const badId=fixture();badId.run={...badId.run,id:124};await assert.rejects(check(badId),/ACTUAL_ROOT_G1_PREVIEW_RUN/)
 const badStep=fixture();badStep.jobs=[{...badStep.jobs[0],steps:badStep.jobs[0].steps.filter(x=>x.name!=='Retain native800 preview')}];await assert.rejects(check(badStep),/SUCCESSFUL_ORDERED_G1_PREVIEW_STEPS/)
})

test('foreign native writer, changed ZIP bytes and altered artifact metadata block the controller gate',async()=>{
 const active=fixture(),foreign={...active.run,id:124,path:'.github/workflows/fcf-native800.yml',status:'queued'};active.github=async path=>{active.calls.push(path);const status=new URLSearchParams(path.split('?')[1]).get('status');return status==='in_progress'?{total_count:1,workflow_runs:[active.run]}:status==='queued'?{total_count:1,workflow_runs:[foreign]}:{total_count:0,workflow_runs:[]}}
 await rejectsCensus(active,'ACTIVE_WRITER_OVERLAP')
 const badZip=fixture();badZip.zip[0]^=1;await assert.rejects(check(badZip),/ACTUAL_G1_PREVIEW_ZIP_BYTES/)
 const badArtifact=fixture();badArtifact.artifact.workflow_run.head_sha='f'.repeat(40);await assert.rejects(check(badArtifact),/ACTUAL_G1_PREVIEW_ARTIFACT/)
})
