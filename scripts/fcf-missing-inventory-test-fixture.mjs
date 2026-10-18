// Synthetic offline controls only. Optional originals remain genuine private bytes.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
export const repository='Lovro-splichal-orhanizagi/mnzgorenjska',workflow='.github/workflows/uvoz-fcf-zgodovina.yml'
export const now=Date.parse('2026-10-18T14:00:00Z'),commit='a'.repeat(40),runId='123',sourceCommit='f7efba26c31f76372b5aab1e976061631fbaebda'
export const sha=value=>createHash('sha256').update(value).digest('hex')
export const policies=()=>Object.fromEntries(['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'].map(slug=>[slug,hash(getHistoricalStatisticsPolicy(slug))]))
export const originals=[
 ['4109388','request-3-acta-4109388.html','2026-10-18T12:31:53.340Z','2026-10-18T12:31:53.882Z',458406],
 ['4118352','request-6-acta-4118352.html','2026-10-18T12:32:03.718Z','2026-10-18T12:32:04.175Z',476814],
 ['4118358','request-7-acta-4118358.html','2026-10-18T12:32:07.176Z','2026-10-18T12:32:07.646Z',441280],
]
export function zip(entries){
 return execFileSync('python3',['-c',`import sys,json,io,zipfile,stat,base64
out=io.BytesIO()
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.load(sys.stdin):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16
  z.writestr(i,base64.b64decode(e['base64']) if 'base64' in e else b'x'*e['size'] if 'size' in e else e.get('text','{}').encode())
sys.stdout.buffer.write(out.getvalue())`],{input:JSON.stringify(entries.map(e=>e.body?{...e,body:undefined,base64:e.body.toString('base64')}:e)),timeout:15000,maxBuffer:101*1024*1024,stdio:['pipe','pipe','pipe']})
}
export function execution(){return{repository,workflow,ref:'refs/heads/main',sourceCommit:commit,runId,runAttempt:'1'}}
export function metadata({bytes,name,jobName,steps,run='completed',runAttempt='1',jobId='456',artifactId='789'}={}){
 const digest='sha256:'+sha(bytes)
 return {zipBytes:bytes,now,artifact:{id:Number(artifactId),name,digest,expired:false,size_in_bytes:bytes.length,workflow_run:{id:Number(runId),head_sha:commit}},run:{id:Number(runId),run_attempt:Number(runAttempt),repository:{full_name:repository},path:workflow,event:'workflow_dispatch',head_branch:'main',head_sha:commit,status:run,conclusion:run==='completed'?'success':null},jobs:[{id:Number(jobId),run_id:Number(runId),run_attempt:Number(runAttempt),head_sha:commit,name:jobName,status:'completed',conclusion:'success',steps:steps.map(name=>({name,status:'completed',conclusion:'success'}))}],expected:{runId,runAttempt,sourceCommit:commit,jobId,artifactId,artifactDigest:digest,name}}
}
function receipt(id,file,start,end,bytes){
 const p=getHistoricalStatisticsPolicy(id==='4109388'?'es-ct-segona-g1':'es-ct-tercera-g9').entries.find(e=>e.sourceMatchId===id)
 return {url:p.sourceUrl,startedUTC:start,sequence:Number(file.match(/^request-(\d+)/)[1]),status:200,responseURL:p.sourceUrl,redirected:false,endedUTC:end,bytes,sha256:p.rawSha256,file}
}
export function originalDescriptors(){return originals.map(([id,file,start,end,bytes])=>({id,artifactFile:`acta-${id}.html`,bytes,rawSha256:receipt(id,file,start,end,bytes).sha256,receipt:receipt(id,file,start,end,bytes),sourceCaptureCommit:sourceCommit}))}
export function manualPlan(){
 const descriptors=originalDescriptors(),seedBinding={artifactId:'789',artifactDigest:'sha256:'+'b'.repeat(64),manifestSha256:'c'.repeat(64),runId:'123',runAttempt:'1',jobId:'456',retentionCommit:commit,sourceCaptureCommit:sourceCommit,originalManifestSha256:'d'.repeat(64)}
 const plan={schemaVersion:1,kind:'fcf-missing-inventory-plan',preset:'g1-then-g9-missing-v1',sourceCommit:commit,createdUTC:'2026-10-18T13:00:00.000Z',maximumSourceGETs:477,stopOnDefect:true,seedBinding,policyHashes:policies(),limits:{maximumBodyBytes:2097152,maximumManifestBytes:8388608,maximumExpandedBytes:201326592,maximumZipBytes:104857600,pauseMs:3000,attemptTimeoutMs:90000,sourceWindowMs:2700000,retentionMarginMs:15000,maximumPlanAgeMs:86400000},children:[['es-ct-segona-g1',783,4109388,4109627],['es-ct-tercera-g9',797,4118349,4118588]].map(([targetSlug,competitionId,start,end])=>{const reuse=descriptors.filter(d=>Number(d.id)>=start&&Number(d.id)<=end);return{targetSlug,competitionId,sourceCode:`${start}-${end}`,season:'2026/27',fetchIds:Array.from({length:240},(_,i)=>String(start+i)).filter(id=>!reuse.some(x=>x.id===id)),reuse,maximumSourceGETs:240-reuse.length}})}
 return {...plan,planSha256:hash(plan)}
}
export function seedFixture(retained){
 const descriptors=originalDescriptors(),originalManifest=retained?readFileSync(join(retained,'manifest.json')):Buffer.from(JSON.stringify({sourceCommit,requests:descriptors.map(x=>x.receipt)}))
 const manifest={schemaVersion:1,kind:'fcf-missing-inventory-seed',retentionCommit:commit,sourceCaptureCommit:sourceCommit,originalManifestSha256:sha(originalManifest),policyHashes:policies(),originals:descriptors}
 const entries=[{name:'manifest.json',body:Buffer.from(JSON.stringify(manifest))},{name:'original-receipts.json',body:originalManifest},...descriptors.map((d,i)=>({name:d.artifactFile,body:retained?readFileSync(join(retained,originals[i][1])):Buffer.from('SYNTHETIC WRONG ORIGINAL')}))]
 const bytes=zip(entries),m=metadata({bytes,name:'fcf-inventory-seed-123-1',jobName:'missing-inventory-seed',steps:['Validate retained FCF inventory originals','Retain reviewed FCF inventory seed']})
 Object.assign(m.expected,{manifestSha256:sha(entries[0].body),originalManifestSha256:sha(originalManifest),policyHashes:policies()})
 return {...m,entries,manifest}
}
const e=(type,children,props={})=>['$',type,null,{...props,children}]
export function headerBytes({id='4109389',slug='es-ct-segona-g1',round=7,home=0,away=1,status='Pendent',score='- - -',season='2026 / 27',day='24.10.2026',time='16.00 H',change=x=>x}={}){
 const root={c:['','ca','competicio','acta',id],headers:[e('section',e('div',[e('a',`SYNTHETIC CLUB ${home}`,{href:`/ca/clubs/${home+1}/categories/${home+101}`}),e('div',[e('span',status),e('span',score)]),e('a',`SYNTHETIC CLUB ${away}`,{href:`/ca/clubs/${away+1}/categories/${away+101}`})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/',slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA','/',`GRUP ${slug.split('-g')[1]}`,'/',`Jornada ${round}`].map(x=>e('span',x))),e('span',['Temporada',': ',season]),e('span',['Data',': ',day]),e('span',['Hora',': ',time])]}
 return Buffer.from(`<!doctype html><title>Acta: SYNTHETIC inventory test | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify(change(root))+'\n')}])</script>`)
}
export function claimFixture(plan=manualPlan()){
 const claim={schemaVersion:1,kind:'fcf-missing-inventory-execution-claim',repository,workflow,planSha256:plan.planSha256,sourceCommit:commit,runId,runAttempt:'1',preset:plan.preset,maximumSourceGETs:477,claimedUTC:'2026-10-18T13:05:00.000Z'},claimBytes=Buffer.from(JSON.stringify(claim)),claimSha='e'.repeat(40),treeSha='f'.repeat(40),blobSha=createHash('sha1').update(`blob ${claimBytes.length}\0`).update(claimBytes).digest('hex')
 return {plan,execution:execution(),claimBytes,claim,now,ref:{ref:`refs/tags/fcf-inventory-claim/${plan.planSha256}`,object:{type:'commit',sha:claimSha}},claimCommit:{commit:{sha:claimSha,parents:[{sha:commit}],tree:{sha:treeSha}},tree:{sha:treeSha,truncated:false,tree:[{path:'.fcf-inventory-claim.json',mode:'100644',type:'blob',sha:blobSha}]},blob:{sha:blobSha,encoding:'base64',content:claimBytes.toString('base64'),size:claimBytes.length}},rulesets:[{id:12,target:'tag',enforcement:'active',bypass_actors:[],conditions:{ref_name:{include:['refs/tags/fcf-inventory-claim/*'],exclude:[]}},rules:[{type:'update'},{type:'deletion'}]}],expected:{claimCommit:claimSha,claimJsonSha256:sha(claimBytes),rulesetId:'12',planSha256:plan.planSha256,sourceCommit:commit,runId,runAttempt:'1'}}
}
export function consumptionFixture(claimProof){
 const manifest={schemaVersion:1,kind:'fcf-missing-inventory-consumed',planSha256:claimProof.planSha256,claimRef:claimProof.claimRef,claimCommit:claimProof.claimCommit,claimJsonSha256:claimProof.claimJsonSha256,seedBinding:claimProof.seedBinding,sourceCommit:commit,repository,workflow,runId,runAttempt:'1',jobId:'456',consumedUTC:'2026-10-18T13:06:00.000Z'}
 const body=Buffer.from(JSON.stringify(manifest)),bytes=zip([{name:'manifest.json',body}]),m=metadata({bytes,name:'fcf-inventory-consumption-123-1',jobName:'missing-inventory-consume',steps:['Verify one-shot FCF inventory claim','Retain one-shot FCF inventory consumption'],run:'in_progress'})
 return {...m,claimProof,manifest,manifestBytes:body,expected:{...m.expected,manifestSha256:sha(body)}}
}
