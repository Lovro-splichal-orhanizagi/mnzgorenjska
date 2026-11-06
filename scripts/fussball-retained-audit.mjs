// Source authentication only. No transport to football, native normalization,
// writer, CLI, workflow dispatch, policy installation or activation authority.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {verifyFussballDirectory,fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'

const repository='Lovro-splichal-orhanizagi/mnzgorenjska',runId='40641606028',sourceHead='de77b661cbc11d95256a500e57c2fdea861a0647'
const workflow='.github/workflows/preveri-fussball-dopolni.yml',preset='baden-reviewed-transports-v5',captureFingerprint='dc58eda97e30c20a313f9343574496d997b401f850ac0960c72bb36dc1975528'
const currentScope={seedUrl:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G',staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27'}
const archiveScope={seedUrl:'https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2526-baden/-/staffel/02TGLSVQ1800000IVS5489BTVTLPPK10-G',staffel:'02TGLSVQ1800000IVS5489BTVTLPPK10-G',season:'2025/26'}
const sourceStep='Capture fresh rounds and missing originals without database credentials',archiveStep='Reauthenticate and replay current proof, bind adjacent archive, capture and replay',handoffStep='Require unchanged main and complete native source batches before separate native gates'
const codePins={
 'scripts/fussball-import.mjs':'80c955353d75f582b5e4c31ada947d0a804d6ec8180721b72d8a36b4b6ad65a7',
 'scripts/fussball-season-pilot.mjs':'8beac5b597c8888ffe5f0a5c861fbffaf1d70e96c9aa892eaaaf57e17289e3df',
 'scripts/fussball-completion-actions.mjs':'e89e4485401e30c0f5f31f450dbbd0901de8a22937991dbc2b1b69a9dc6c19d2',
 '.github/workflows/preveri-fussball-dopolni.yml':'183b5bff7992d4eda44b03257fb51446e6b37ebc65b833819191b3cb9294aa96',
}
const capabilities=new WeakMap(),MiB=1024*1024,hash=b=>createHash('sha256').update(b).digest('hex')
const hold=message=>Object.assign(Error('fussball retained audit: '+message),{code:'FUSSBALL_RETAINED_AUDIT_HOLD',dataHold:true})
const need=(ok,message)=>{if(!ok)throw hold(message)}
const plain=o=>o&&Object.getPrototypeOf(o)===Object.prototype
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o)}return o}
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))
// GitHub step/job timestamps omit milliseconds. Preserve original source UTCs;
// compare against that API second's upper bound, never rewrite capture times.
const apiEnd=s=>Date.parse(s)+(s.includes('.')?0:999)
const id=n=>Number.isSafeInteger(n)&&n>0
const parse=(b,label)=>{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b))}catch{throw hold(label+' invalid UTF8/JSON')}}

function unchangedCode(){
 need(fussballCaptureCodeSha256()===captureFingerprint,'fixed installed capture fingerprint differs')
 for(const [file,pin]of Object.entries(codePins))need(hash(readFileSync(new URL('../'+file,import.meta.url)))===pin,'fixed source/handoff code differs')
}
function execution(run){
 need(run?.id===Number(runId)&&run.run_attempt===1&&run.status==='completed'&&['success','failure'].includes(run.conclusion)&&run.head_sha===sourceHead&&run.head_branch==='main'&&run.event==='workflow_dispatch'&&run.path===workflow&&run.repository?.full_name===repository&&run.head_repository?.full_name===repository,'exact terminal first-attempt source execution required')
 need(utc(run.created_at)&&utc(run.updated_at)&&Date.parse(run.created_at)<=Date.parse(run.updated_at)&&Date.parse(run.updated_at)<=Date.now(),'source execution dates differ')
}
function critical(job,name,conclusion='success'){
 const rows=job.steps.filter(s=>s.name===name),s=rows[0]
 need(rows.length===1&&s.status==='completed'&&s.conclusion===conclusion&&utc(s.started_at)&&utc(s.completed_at)&&Date.parse(s.started_at)<=Date.parse(s.completed_at)&&Date.parse(s.started_at)>=Date.parse(job.started_at)&&Date.parse(s.completed_at)<=Date.parse(job.completed_at),'critical source/handoff step differs')
 return s
}
function jobsFor(envelope,run){
 need(envelope?.total_count===3&&Array.isArray(envelope.jobs)&&envelope.jobs.length===3&&new Set(envelope.jobs.map(j=>j.id)).size===3,'complete three-job inventory required')
 const jobs={}
 for(const name of ['capture','archive','handoff']){
  const rows=envelope.jobs.filter(j=>j.name===name),j=rows[0]
  need(rows.length===1&&id(j.id)&&j.run_id===run.id&&j.run_attempt===1&&j.head_sha===sourceHead&&j.status==='completed'&&Array.isArray(j.steps)&&utc(j.started_at)&&utc(j.completed_at)&&Date.parse(j.started_at)<=Date.parse(j.completed_at)&&Date.parse(j.completed_at)<=Date.now(),'bound completed source jobs required')
  need(j.steps.every(s=>s.status==='completed'&&['success','failure','skipped'].includes(s.conclusion)),'unknown or interrupted source step')
  jobs[name]=j
 }
 need(Date.parse(jobs.capture.completed_at)<=Date.parse(jobs.archive.started_at)&&Date.parse(jobs.archive.completed_at)<=Date.parse(jobs.handoff.started_at),'source/archive/handoff chronology differs')
 need(jobs.capture.conclusion==='success'&&jobs.archive.conclusion==='success','both complete source jobs must succeed')
 for(const name of ['Validate exact reviewed completion scope and total5000 budget','Offline source and evidence checks','Authenticate only the exact reviewed source artifacts for the selected preset','Share host pacing with older nightly and bulk readers',sourceStep,'Independently replay only retained original documents','Authorize archive only from complete replayed current originals','Preserve source originals, checkpoint provenance and request journal'])critical(jobs.capture,name)
 for(const name of ['Validate unchanged reviewed main and reserved allowances','Share host pacing with older nightly and bulk readers',archiveStep,'Preserve separate archive originals and request journal'])critical(jobs.archive,name)
 need(![jobs.capture,jobs.archive].some(j=>j.steps.some(s=>s.conclusion==='failure')),'failed source/replay/upload step')
 if(run.conclusion==='success'){
  need(jobs.handoff.conclusion==='success'&&!jobs.handoff.steps.some(s=>s.conclusion==='failure'),'overall success/handoff state differs');critical(jobs.handoff,handoffStep)
 }else{
  need(jobs.handoff.conclusion==='failure'&&jobs.handoff.steps.filter(s=>s.conclusion==='failure').length===1,'only the strict handoff guard may fail');critical(jobs.handoff,handoffStep,'failure')
 }
 return jobs
}
function artifactIdentity(a,name,job){
 need(id(a?.id)&&a.name===name&&a.expired===false&&Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>0&&a.size_in_bytes<=512*MiB&&/^sha256:[a-f0-9]{64}$/.test(a.digest??'')&&a.workflow_run?.id===Number(runId)&&a.workflow_run.head_sha===sourceHead&&a.workflow_run.head_branch==='main','bound available source artifact identity/digest required')
 const upload=critical(job,job.name==='capture'?'Preserve source originals, checkpoint provenance and request journal':'Preserve separate archive originals and request journal')
 need(utc(a.created_at)&&utc(a.updated_at)&&Date.parse(a.created_at)<=Date.parse(a.updated_at)&&Date.parse(a.created_at)>=Date.parse(upload.started_at)&&Date.parse(a.updated_at)<=Date.parse(upload.completed_at),'source artifact upload dates differ')
}
function extract(bytes,directory,archive){
 const zip=join(directory,'source.zip'),output=join(directory,'capture');mkdirSync(output,{mode:0o700});writeFileSync(zip,bytes,{flag:'wx',mode:0o600})
 try{
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024}).trimEnd().split('\n')
  const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',timeout:60000,maxBuffer:2*MiB}).split('\n')
  need(names.length>=8&&names.length<=5000&&new Set(names).size===names.length,'bounded unique original ZIP inventory required')
  const files=new Map();let total=0
  for(const name of names){
   const nested=/^checkpoint\/parents\/40633575248\.(?:json|zip)$/.test(name)
   need(nested||/^(?:manifest\.json|result\.json|attempts\.jsonl|outcomes\.jsonl|progress\.jsonl|documents\/[a-f0-9]{64}\.(?:html|css|woff))$/.test(name)||archive&&/^archive-parent\/[a-f0-9]{64}\.html$/.test(name),'unexpected original ZIP path')
   const rows=details.filter(r=>r.endsWith(' '+name));need(rows.length===1&&/^-[rwxstST-]{9}\s/.test(rows[0]),'original ZIP member must be regular')
   // V5 current actually retained a67.8MB result. Archive may contain306
   // reports. These profile-only limits do not change any old ZIP reader.
   const bound=name==='result.json'?(archive?384:72)*MiB:nested&&name.endsWith('.zip')?100*MiB:name.endsWith('.css')?64*1024:name.startsWith('documents/')||name.startsWith('archive-parent/')?8*MiB:16*MiB
   const body=execFileSync('unzip',['-p',zip,name],{timeout:60000,maxBuffer:bound+1});total+=body.length
   need(body.length<=bound&&total<=1024*MiB,'expanded originals exceeded bound')
   const path=join(output,name);mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,body,{flag:'wx',mode:0o600});files.set(name,body)
  }
  return {directory:output,files}
 }catch(error){if(error.code==='FUSSBALL_RETAINED_AUDIT_HOLD')throw error;throw hold('bounded ZIP extraction failed')}
}
function inspect(stage,files,job){
 const manifest=parse(files.get('manifest.json'),'manifest'),result=parse(files.get('result.json'),'result'),scope=stage==='current'?currentScope:archiveScope,limit=stage==='current'?432:3000
 need(manifest.version===5&&manifest.provider==='fussball'&&manifest.success===true&&manifest.error===null&&manifest.activationEligible===false&&manifest.codeSha256===captureFingerprint&&manifest.retryPolicy==='baden-v4-transient-v1'&&manifest.checkpoint?.version===4&&manifest.checkpoint.proof?.preset===preset&&manifest.checkpoint.proof.priorRequests===1568&&manifest.checkpoint.proof.totalRequestCap===5000,'complete fixed V5 source manifest required')
 need(Object.entries(scope).every(([k,v])=>manifest.options?.[k]===v)&&manifest.options.cardPolicy==='community-v1'&&manifest.options.reportLimit===null&&Number.isInteger(manifest.options.maxRequests)&&manifest.options.maxRequests>0&&manifest.options.maxRequests<=limit,'exact source scope/full-report allowance required')
 need(isDeepStrictEqual(manifest.checkpoint.parentFiles,[{runId:'40633575248',metadataFile:'checkpoint/parents/40633575248.json',zipFile:'checkpoint/parents/40633575248.zip'}]),'exact embedded V5 raw parent required')
 const step=critical(job,stage==='current'?sourceStep:archiveStep)
 need(utc(manifest.createdAt)&&utc(manifest.completedAt)&&Date.parse(manifest.createdAt)<=Date.parse(manifest.completedAt)&&Date.parse(manifest.createdAt)>=Date.parse(step.started_at)&&Date.parse(manifest.completedAt)<=apiEnd(step.completed_at),'original source timestamps differ')
 const expected=new Set(['manifest.json','result.json','attempts.jsonl','outcomes.jsonl','progress.jsonl','checkpoint/parents/40633575248.json','checkpoint/parents/40633575248.zip'])
 need(Array.isArray(manifest.documents),'complete source body inventory required')
 manifest.documents.forEach(d=>expected.add(d.file));if(stage==='archive')expected.add(manifest.archiveParent?.file)
 need(files.size===expected.size&&[...expected].every(p=>files.has(p)),'extra or missing original ZIP member')
 need(hash(files.get('result.json'))===manifest.resultSha256,'result bytes differ')
 const n=manifest.snapshot?.requests
 need(Number.isInteger(n)&&n>0&&n<=manifest.options.maxRequests&&manifest.snapshot.stopped===false&&manifest.snapshot.stopReason===null&&Array.isArray(manifest.snapshot.attempts)&&manifest.snapshot.attempts.length===n,'complete counted source attempts required')
 const journals={}
 for(const name of ['attempts.jsonl','outcomes.jsonl','progress.jsonl']){
  const bytes=files.get(name);need(bytes.at(-1)===10,'complete original journal required')
  journals[name]=bytes.toString().trimEnd().split('\n').map(line=>parse(Buffer.from(line),'journal'))
 }
 need(journals['attempts.jsonl'].length===n&&isDeepStrictEqual(journals['outcomes.jsonl'],manifest.snapshot.attempts)&&hash(files.get('outcomes.jsonl'))===manifest.outcomesSha256,'original intent/outcome counts or hash differ')
 return {manifest,result}
}
function adjacent(current,archive){
 const c=current.manifest,a=archive.manifest,parent=a.archiveParent
 need(isDeepStrictEqual(c.checkpoint,a.checkpoint)&&Date.parse(c.completedAt)<=Date.parse(a.createdAt),'paired history or chronology differs')
 const seeds=c.documents.filter(d=>d.kind==='round'&&d.url===currentScope.seedUrl),seed=seeds[0]
 need(seeds.length===1&&parent&&isDeepStrictEqual(parent.current,currentScope)&&isDeepStrictEqual(parent.originalReceipt,seed.originalReceipt)&&Object.entries(parent.document??{}).length===7&&['url','kind','sha256','bytes','status','contentType','capturedAt'].every(k=>parent.document[k]===seed[k]),'archive must belong to original current seed/receipt')
 need(current.files.get(seed.file)?.equals(archive.files.get(parent.file)),'adjacent original seed bytes differ')
}
function dataHold(current,archive,jobs){
 // The pinned CLI invokes the default strict builder before reaching gh. The
 // pinned builder unconditionally rejects these retained-data witnesses. We
 // do not invoke a native builder or infer global native side-effect counts.
 need([current,archive].every(v=>Date.parse(v.artifact.updated_at)<=Date.parse(critical(jobs.handoff,handoffStep,'failure').started_at)),'handoff did not use these already-uploaded originals')
 for(const [stage,{manifest,result}]of [['current',current],['archive',archive]]){
  if(Array.isArray(result.rejectedReports)&&result.rejectedReports.length)return {stage,kind:'strict-rejected-reports',resultSha256:manifest.resultSha256,count:result.rejectedReports.length}
  if(Array.isArray(result.schedule?.fixtures)&&result.schedule.fixtures.some(f=>f&&Object.hasOwn(f,'administrativeResult')))return {stage,kind:'explicit-administrative-result',resultSha256:manifest.resultSha256}
 }
 throw hold('failed handoff has no pinned before-dispatch data-hold witness')
}
function fresh(current){
 const expires=Date.parse(current.manifest.createdAt)+24*3600_000
 need(Date.parse(current.manifest.completedAt)<=Date.now()&&Date.now()<=expires,'original current source freshness expired')
 return expires
}

/** Exactly {sourceRunId,github}; github(path,binary) is a trusted GitHub GET
 * adapter. All repository-relative API paths are constructed/allowlisted here.
 * No caller record, verifier, success flag, freshness switch or clock is accepted. */
export async function readFussballRetainedAudit(input){
 need(plain(input)&&Object.keys(input).sort().join(',')==='github,sourceRunId'&&input.sourceRunId===runId&&typeof input.github==='function','exact fixed source run and GET adapter required')
 unchangedCode()
 const prefix=`repos/${repository}/`,allowed=new Set([`actions/runs/${runId}`,`actions/runs/${runId}/attempts/1/jobs?per_page=100&page=1`,`actions/runs/${runId}/artifacts?per_page=100&page=1`])
 const get=async(path,binary=false)=>{
  need(allowed.has(path),'API path outside fixed source audit GET scope')
  let value;try{value=await input.github(prefix+path,binary)}catch{throw hold('authoritative GitHub GET unavailable')}
  if(binary){need(Buffer.isBuffer(value)&&value.length<=512*MiB,'bounded original ZIP bytes required');return Buffer.from(value)}
  return structuredClone(value)
 }
 const run=await get(`actions/runs/${runId}`);execution(run)
 const jobsEnvelope=await get(`actions/runs/${runId}/attempts/1/jobs?per_page=100&page=1`),jobs=jobsFor(jobsEnvelope,run)
 const inventory=await get(`actions/runs/${runId}/artifacts?per_page=100&page=1`)
 need(inventory?.total_count===2&&Array.isArray(inventory.artifacts)&&inventory.artifacts.length===2&&new Set(inventory.artifacts.map(a=>a.id)).size===2,'complete distinct paired artifact inventory required')
 const temporary=mkdtempSync(join(tmpdir(),'slff-retained-audit-')),stages={}
 try{
  for(const stage of ['current','archive']){
   const name=`fussball-season-${stage==='archive'?'archive-':''}${runId}`,rows=inventory.artifacts.filter(a=>a.name===name),job=stage==='current'?jobs.capture:jobs.archive
   need(rows.length===1,'exact named source artifact required');artifactIdentity(rows[0],name,job)
   const path=`actions/artifacts/${rows[0].id}`;allowed.add(path);allowed.add(path+'/zip')
   const artifact=await get(path);artifactIdentity(artifact,name,job);need(isDeepStrictEqual(artifact,rows[0]),'artifact detail/inventory changed')
   const zipBytes=await get(path+'/zip',true);need(zipBytes.length===artifact.size_in_bytes&&'sha256:'+hash(zipBytes)===artifact.digest,'original artifact size/digest differs')
   const directory=join(temporary,stage);mkdirSync(directory,{mode:0o700})
   const extracted=extract(zipBytes,directory,stage==='archive'),inspected=inspect(stage,extracted.files,job)
   stages[stage]={...extracted,...inspected,artifact,zipBytes}
  }
  adjacent(stages.current,stages.archive);fresh(stages.current)
  for(const stage of ['current','archive']){
   let receipt;try{receipt=await verifyFussballDirectory(stages[stage].directory)}catch{throw hold(stage+' original-byte replay failed')}
   need(receipt.verified===true&&receipt.activationEligible===false&&receipt.checkpointPreset===preset&&receipt.priorRequests===1568&&receipt.codeSha256===captureFingerprint&&receipt.requests===stages[stage].manifest.snapshot.requests,'default source replay/accounting differs')
   stages[stage].receipt=receipt
  }
  const witness=run.conclusion==='failure'?dataHold(stages.current,stages.archive,jobs):null
  const again=await get(`actions/runs/${runId}`),againJobs=await get(`actions/runs/${runId}/attempts/1/jobs?per_page=100&page=1`),againInventory=await get(`actions/runs/${runId}/artifacts?per_page=100&page=1`)
  need(isDeepStrictEqual(again,run)&&isDeepStrictEqual(againJobs,jobsEnvelope)&&isDeepStrictEqual(againInventory,inventory),'terminal source metadata changed during authentication')
  unchangedCode();const expires=fresh(stages.current),counts=Object.fromEntries(Object.entries(stages).map(([s,v])=>[s,v.receipt.requests])),total=1568+counts.current+counts.archive
  need(total<=5000,'all actual source attempts exceed total5000')
  const proof=freeze({version:1,kind:'fussball-retained-source-audit',sourceRunId:runId,sourceHead,profile:preset,captureCodeSha256:captureFingerprint,currentCreatedAt:stages.current.manifest.createdAt,currentFreshUntil:new Date(expires).toISOString(),priorRequests:1568,requests:counts,cumulativeRequests:total,totalRequestCap:5000,artifacts:Object.fromEntries(Object.entries(stages).map(([s,v])=>[s,{id:v.artifact.id,name:v.artifact.name,digest:v.artifact.digest,size:v.zipBytes.length,resultSha256:v.manifest.resultSha256}])),handoff:{conclusion:jobs.handoff.conclusion,witness,nativeSideEffectsVerified:false},sourceEligible:true,nativeEligible:false,activationEligible:false})
  capabilities.set(proof,{run,jobs:jobsEnvelope,inventory,stages,expires});return proof
 }finally{rmSync(temporary,{recursive:true,force:true})}
}

/** Defensive copies of privately authenticated originals, never derived native
 * facts. A copied/serialized public summary cannot select this capability. */
export function getFussballRetainedAudit(proof){
 const state=capabilities.get(proof);need(state,'reader-issued retained source capability required')
 need(Date.now()<=state.expires,'original current source freshness expired')
 return {proof,run:structuredClone(state.run),jobs:structuredClone(state.jobs),inventory:structuredClone(state.inventory),stages:Object.fromEntries(Object.entries(state.stages).map(([s,v])=>[s,{artifact:structuredClone(v.artifact),manifest:structuredClone(v.manifest),result:structuredClone(v.result),receipt:structuredClone(v.receipt),zipBytes:Buffer.from(v.zipBytes),files:new Map([...v.files].map(([name,bytes])=>[name,Buffer.from(bytes)]))}]))}
}

/** Bounded wire view for hosted replay: avoid cloning expanded result/body maps
 * merely to carry the unchanged ZIPs. This grants the same source-only scope. */
export function getFussballRetainedAuditWire(proof){
 const state=capabilities.get(proof);need(state,'reader-issued retained source capability required');need(Date.now()<=state.expires,'original current source freshness expired')
 return {proof,run:structuredClone(state.run),jobs:structuredClone(state.jobs),inventory:structuredClone(state.inventory),stages:Object.fromEntries(Object.entries(state.stages).map(([s,v])=>[s,{artifact:structuredClone(v.artifact),zipBytes:Buffer.from(v.zipBytes)}]))}
}
