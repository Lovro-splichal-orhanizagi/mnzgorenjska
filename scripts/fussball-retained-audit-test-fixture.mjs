// TEST ONLY synthetic GitHub responses/source frames. Never actual run success,
// retained-source authority or native facts. Production exposes no verifier seam.
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {verifyFussballDirectory,fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
export const hash=b=>createHash('sha256').update(b).digest('hex')
export const sourceRunId='40641606028',sourceHead='de77b661cbc11d95256a500e57c2fdea861a0647',fingerprint='dc58eda97e30c20a313f9343574496d997b401f850ac0960c72bb36dc1975528'
export const sourceStep='Capture fresh rounds and missing originals without database credentials',archiveStep='Reauthenticate and replay current proof, bind adjacent archive, capture and replay',handoffStep='Require unchanged main and complete native source batches before separate native gates'
const repo='Lovro-splichal-orhanizagi/mnzgorenjska',prefix=`repos/${repo}/`,json=v=>Buffer.from(JSON.stringify(v)+'\n')
export function zip(files){
 const root=mkdtempSync(join(tmpdir(),'retained-audit-fixture-'))
 try{
  const path=join(root,'fixture.zip')
  execFileSync('python3',['-c',`import sys,json,base64,zipfile
files=json.load(sys.stdin)
with zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED) as z:
 for name,body in files.items():
  info=zipfile.ZipInfo(name);info.external_attr=0o100600<<16;info.compress_type=zipfile.ZIP_DEFLATED
  z.writestr(info,base64.b64decode(body))
`,path],{input:JSON.stringify(Object.fromEntries([...files].map(([k,v])=>[k,Buffer.from(v).toString('base64')]))),maxBuffer:1024})
  return readFileSync(path)
 }finally{rmSync(root,{recursive:true,force:true})}
}
export function fixture(){
 const base=Date.now()-240000,stamp=n=>new Date(base+n*1000).toISOString()
 const captureNames=['Validate exact reviewed completion scope and total5000 budget','Offline source and evidence checks','Authenticate only the exact reviewed source artifacts for the selected preset','Share host pacing with older nightly and bulk readers',sourceStep,'Independently replay only retained original documents','Authorize archive only from complete replayed current originals','Preserve source originals, checkpoint provenance and request journal']
 const archiveNames=['Validate unchanged reviewed main and reserved allowances','Share host pacing with older nightly and bulk readers',archiveStep,'Preserve separate archive originals and request journal']
 const job=(name,id,start,names,end)=>({id,name,run_id:Number(sourceRunId),run_attempt:1,head_sha:sourceHead,status:'completed',conclusion:'success',started_at:stamp(start),completed_at:stamp(end),steps:names.map((name,i)=>({name,number:i+1,status:'completed',conclusion:'success',started_at:stamp(start+i*10+1),completed_at:stamp(start+i*10+9)}))})
 const run={id:Number(sourceRunId),run_attempt:1,status:'completed',conclusion:'success',head_sha:sourceHead,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/preveri-fussball-dopolni.yml',repository:{full_name:repo},head_repository:{full_name:repo},created_at:stamp(-1),updated_at:stamp(152)}
 const jobs={total_count:3,jobs:[job('capture',1,0,captureNames,85),job('archive',2,90,archiveNames,135),job('handoff',3,140,[handoffStep],150)]}
 const scope={seedUrl:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G',staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27'}
 const archiveScope={seedUrl:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2526-baden/-/staffel/02TGLSVQ1800000IVS5489BTVTLPPK10-G',staffel:'02TGLSVQ1800000IVS5489BTVTLPPK10-G',season:'2025/26'}
 const stages={}
 for(const [stage,s,start,limit]of[['current',scope,42,432],['archive',archiveScope,112,3000]]){
  const body=Buffer.from('TEST ONLY synthetic '+stage+' HTML; no source/native proof'),sha=hash(body),file=`documents/${sha}.html`,created=stamp(start)
  const attempt={number:1,url:s.seedUrl,kind:'round',startedAt:created,status:'success',error:null,httpStatus:200},document={url:s.seedUrl,kind:'round',sha256:sha,bytes:body.length,status:200,contentType:'text/html',capturedAt:created}
  const receipt={version:1,document,attempt,capture:{createdAt:created,codeSha256:fingerprint,staffel:s.staffel,season:s.season}}
  const result={version:1,activationEligible:false,scope:{provider:'fussball',...s,cardPolicy:'community-v1',asOfDate:created.slice(0,10)},schedule:{staffel:s.staffel,season:s.season,rounds:[1],fixtures:[]},reports:[],rejectedReports:[],pendingReports:[],cardEnvelopes:[],coverage:{sampled:false}}
  const manifest={version:5,provider:'fussball',createdAt:created,completedAt:stamp(start+6),options:{...s,maxRequests:limit,reportLimit:null,asOfDate:created.slice(0,10),cardPolicy:'community-v1'},codeSha256:fingerprint,success:true,error:null,snapshot:{requests:1,attempts:[attempt],stopped:false,stopReason:null},documents:[{...document,file,origin:'network',originalReceipt:receipt}],resultSha256:hash(json(result)),activationEligible:false,retryPolicy:'baden-v4-transient-v1',outcomesSha256:hash(json(attempt)),checkpoint:{version:4,proof:{preset:'baden-reviewed-transports-v5',priorRequests:1568,totalRequestCap:5000},parentFiles:[{runId:'40633575248',metadataFile:'checkpoint/parents/40633575248.json',zipFile:'checkpoint/parents/40633575248.zip'}]}}
  const intent={number:1,url:s.seedUrl,kind:'round',startedAt:null,status:'pending',error:null}
  const files=new Map([['result.json',json(result)],['attempts.jsonl',json(intent)],['outcomes.jsonl',json(attempt)],['progress.jsonl',json({testOnlySynthetic:true})],[file,body],['checkpoint/parents/40633575248.json',json({testOnlySynthetic:true})],['checkpoint/parents/40633575248.zip',Buffer.from('TEST ONLY not a real parent ZIP')]])
  const artifact={id:stage==='current'?101:102,name:`fussball-season-${stage==='archive'?'archive-':''}${sourceRunId}`,expired:false,created_at:stamp(stage==='current'?72:122),updated_at:stamp(stage==='current'?74:124),workflow_run:{id:Number(sourceRunId),head_sha:sourceHead,head_branch:'main'}}
  stages[stage]={manifest,result,files,artifact}
 }
 const seed=stages.current.manifest.documents[0],parentFile=`archive-parent/${seed.sha256}.html`
 stages.archive.manifest.archiveParent={version:1,current:scope,observedSeedUrl:'https://www.fussball.de/spieltag/-/staffel/'+archiveScope.staffel,document:seed.originalReceipt.document,originalReceipt:seed.originalReceipt,file:parentFile,proofSha256:'0'.repeat(64)}
 stages.archive.files.set(parentFile,Buffer.from(stages.current.files.get(seed.file)))
 const f={run,jobs,stages,calls:[],stamp,controls:{},refresh(stage){const s=stages[stage];s.files.set('result.json',json(s.result));s.manifest.resultSha256=hash(s.files.get('result.json'));s.files.set('manifest.json',json(s.manifest));s.zipBytes=zip(s.files);s.artifact.digest='sha256:'+hash(s.zipBytes);s.artifact.size_in_bytes=s.zipBytes.length}}
 f.refresh('current');f.refresh('archive')
 f.github=async(path,binary=false)=>{
  f.calls.push({path,binary});if(f.controls.get)return f.controls.get(path,binary,f)
  if(path===prefix+`actions/runs/${sourceRunId}`)return structuredClone(f.run)
  if(path===prefix+`actions/runs/${sourceRunId}/attempts/1/jobs?per_page=100&page=1`)return structuredClone(f.jobs)
  if(path===prefix+`actions/runs/${sourceRunId}/artifacts?per_page=100&page=1`)return{total_count:2,artifacts:Object.values(f.stages).map(s=>structuredClone(s.artifact))}
  for(const s of Object.values(f.stages)){
   if(path===prefix+`actions/artifacts/${s.artifact.id}`)return structuredClone(s.artifact)
   if(path===prefix+`actions/artifacts/${s.artifact.id}/zip`&&binary)return Buffer.from(s.zipBytes)
  }
  throw Error('test GET outside fixed path set')
 };return f
}
export function isolatedReader(verify=async path=>{const m=JSON.parse(readFileSync(join(path,'manifest.json')));return{verified:true,activationEligible:false,checkpointPreset:'baden-reviewed-transports-v5',priorRequests:1568,codeSha256:fingerprint,requests:m.snapshot.requests}},exposeInternals=false){
 const path=new URL('./fussball-retained-audit.mjs',import.meta.url),source=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFussballRetainedAudit,getFussballRetainedAudit'+(exposeInternals?',extract,inspect,artifactIdentity,unchangedCode':'')+'};'
 return new Function('readFileSync','writeFileSync','mkdirSync','mkdtempSync','rmSync','join','dirname','tmpdir','execFileSync','createHash','isDeepStrictEqual','verifyFussballDirectory','fussballCaptureCodeSha256',source)(readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,join,dirname,tmpdir,execFileSync,createHash,isDeepStrictEqual,verify,fussballCaptureCodeSha256)
}
export {verifyFussballDirectory}
