// Fixed source-only continuation. No native imports, DB clients or activation.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,lstatSync,realpathSync,readdirSync,appendFileSync} from 'node:fs'
import {resolve,join,dirname,relative} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import {isDeepStrictEqual} from 'node:util'
import {sha256,unpackVerifiedArchive,unpackFussballV6Parent} from './dfb-artifacts.mjs'
import {readFussballTransportV5,exportFussballV5AccountedHistory} from './fussball-checkpoint.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {FUSSBALL_V4_RETRY_POLICY,restoreFussballV4TransportFailure} from './lib/fussball-v4-retry.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {extractFussballSeasonLinks,inspectFussballArchivePage,fussballArchiveSeedAlias} from './fussball-season-links.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'
const policyBytes=readFileSync(new URL('./policies/fussball-transport-v6.json',import.meta.url))
const policy=JSON.parse(policyBytes),states=new WeakMap(),root=fileURLToPath(new URL('../',import.meta.url))
const json=v=>JSON.stringify(v)+'\n',stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const check=(ok,why)=>{if(!ok)throw Error(`fussball archive v6: ${why}`)}
const closed=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.slice().sort().join(',')
const descriptor=d=>Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]]))
const ext=k=>k==='font'?'woff':k==='css'?'css':'html'
const bytesOf=(files,path)=>{const b=files.get(path);check(Buffer.isBuffer(b),'missing original '+path);return b}
const parse=b=>JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(b))
const lines=b=>{check(b.at(-1)===10,'incomplete journal');return b.toString().trimEnd().split('\n').map(JSON.parse)}
const receipt=(d,m)=>({version:1,document:descriptor(d),attempt:m.snapshot.attempts.find(a=>a.url===d.url&&a.status==='success'&&a.startedAt===d.capturedAt),capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}})
export function reviewedFussballArchiveV6(){return structuredClone(policy)}
export function validateFussballV6Allowance({currentRequests,archiveRequests}={}){
 check(currentRequests==='0'&&typeof archiveRequests==='string'&&/^[1-9]\d*$/.test(archiveRequests)&&Number.isSafeInteger(Number(archiveRequests))&&Number(archiveRequests)<=3000,'fixed current0/archive1..3000 allowance required')
 return {priorRequests:1838,totalRequestCap:5000,currentRequests:0,archiveRequests:Number(archiveRequests),cumulativeReserved:1838+Number(archiveRequests)}
}
export function assertFussballV6CurrentFresh(now=Date.now()){
 const start=Date.parse(policy.current.createdAt),end=Date.parse(policy.current.completedAt)
 check(Number.isFinite(now)&&start<=end&&end<=now,'current timestamps are invalid or future')
 check(now-start<=24*3600_000,'preserved current is stale');return true
}
export function fussballArchiveV6CodeSha256(){
 const files=[...new Set([...zaprtje('scripts/fussball-archive-v6.mjs'),...zaprtje('scripts/fussball-archive-v6-actions.mjs'),'scripts/policies/fussball-transport-v6.json','.github/workflows/preveri-fussball-dopolni.yml'])].sort()
 return sha256(fussballCaptureCodeSha256()+'\n'+files.map(f=>`${f}\0${sha256(readFileSync(join(root,f)))}`).join('\n'))
}
export function readFussballV6Regular(directory,file,maximum=100*1024*1024){
 check(typeof file==='string'&&file.length>0&&!file.includes('\\')&&!file.startsWith('/')&&file.split('/').every(x=>x&&x!=='.'&&x!=='..'),'unsafe input path')
 const base=resolve(directory),parts=file.split('/');check(lstatSync(base).isDirectory()&&!lstatSync(base).isSymbolicLink(),'regular input directory required')
 for(let i=1;i<parts.length;i++){const s=lstatSync(join(base,...parts.slice(0,i)));check(s.isDirectory()&&!s.isSymbolicLink(),'regular input ancestors required')}
 const p=join(base,file),s=lstatSync(p);check(s.isFile()&&!s.isSymbolicLink()&&s.size<=maximum,'bounded regular original required');const b=readFileSync(p);check(b.length<=maximum,'original grew beyond bound');return b
}
export function loadFussballV6Parents(directory){
 return Object.fromEntries(['current','archive'].map(stage=>{
  const prefix=`parents/40641606028-${stage}`,metadata=parse(readFussballV6Regular(directory,prefix+'.json',8*1024*1024));check(closed(metadata,['run','artifact','jobs']),'closed parent metadata required')
  return [stage,{...metadata,zipBytes:readFussballV6Regular(directory,prefix+'.zip')}]
 }))
}
function authenticateParent(p,stage,now){
 const pin=policy[stage];check(closed(p,['run','artifact','jobs','zipBytes']),'closed raw parent required')
 const {run:r,artifact:a,jobs:j}=p
 check(String(r?.id)===policy.sourceRunId&&r.run_attempt===1&&r.status==='completed'&&r.conclusion==='failure'&&r.head_sha===policy.sourceCommit&&r.head_branch==='main'&&r.event==='workflow_dispatch'&&r.path===policy.workflow&&r.repository?.full_name===policy.repository&&r.head_repository?.full_name===policy.repository&&Date.parse(r.updated_at)<=now,'exact terminal actual V5 execution required')
 check(String(a?.id)===pin.artifactId&&a.expired===false&&a.name===`fussball-season-${stage==='archive'?'archive-':''}${policy.sourceRunId}`&&a.digest===pin.artifactSha256&&a.size_in_bytes===pin.artifactBytes&&String(a.workflow_run?.id)===policy.sourceRunId&&a.workflow_run.head_sha===policy.sourceCommit&&a.workflow_run.head_branch==='main'&&Buffer.isBuffer(p.zipBytes)&&p.zipBytes.length===pin.artifactBytes,'exact parent artifact required')
 check(closed(j,['total_count','jobs'])&&j.total_count===3&&j.jobs.length===3&&new Set(j.jobs.map(x=>x.id)).size===3,'complete actual jobs required');check(sha256(stable(j))===policy.jobsSha256,'exact retained job/critical-step inventory differs')
 for(const [name,conclusion]of [['capture','success'],['archive','failure'],['handoff','skipped']]){
  const rows=j.jobs.filter(x=>x.name===name),x=rows[0];check(rows.length===1&&String(x.id)===policy.jobs[name]&&x.run_id===r.id&&x.run_attempt===1&&x.head_sha===r.head_sha&&x.status==='completed'&&x.conclusion===conclusion&&Array.isArray(x.steps),'exact V5 job identity/state required')
 }
 const files=unpackFussballV6Parent(p.zipBytes,pin.artifactSha256,stage)
 for(const [f,h]of Object.entries(pin.hashes))check(sha256(bytesOf(files,f))===h,'exact parent manifest/journal hash differs')
 const m=parse(files.get('manifest.json'));check(m.version===5&&m.success===(stage==='current')&&m.error===(stage==='current'?null:policy.archiveError)&&m.codeSha256===policy.sourceCodeSha256&&m.resultSha256===pin.resultSha256&&isDeepStrictEqual(m.options,pin.options)&&m.createdAt===pin.createdAt&&m.completedAt===pin.completedAt&&m.activationEligible===false,'exact schema5 stage manifest differs')
 check(m.documents.length===pin.documents&&m.snapshot.requests===pin.requests&&isDeepStrictEqual(lines(files.get('outcomes.jsonl')),m.snapshot.attempts)&&lines(files.get('attempts.jsonl')).length===pin.requests,'all spent stage attempts required')
 for(const d of m.documents){const b=bytesOf(files,d.file);check(d.file===`documents/${d.sha256}.${ext(d.kind)}`&&b.length===d.bytes&&sha256(b)===d.sha256,'parent document hash/path differs')}
 if(stage==='current')check(sha256(bytesOf(files,'result.json'))===pin.resultSha256,'preserved current result differs')
 return {files,m}
}
function frozenCurrent(files,frozenDirectory){
 const frozen=realpathSync(frozenDirectory),env={PATH:process.env.PATH}
 check(execFileSync('git',['rev-parse','HEAD'],{cwd:frozen,encoding:'utf8',env}).trim()===policy.sourceCommit,'frozen verifier HEAD differs')
 execFileSync('git',['diff','--exit-code','HEAD','--'],{cwd:frozen,env,stdio:'pipe'})
 const target=mkdtempSync(join(tmpdir(),'slff-v6-frozen-current-'))
 try{
  for(const [file,b]of files){const path=join(target,file);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,b,{flag:'wx'})}
  const code=`import {fussballCaptureCodeSha256,verifyFussballDirectory} from './scripts/fussball-capture-evidence.mjs';if(fussballCaptureCodeSha256()!==${JSON.stringify(policy.sourceCodeSha256)})throw Error('Frozen code fingerprint differs');const r=await verifyFussballDirectory(${JSON.stringify(target)});process.stdout.write(JSON.stringify(r));`
  const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:frozen,env,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024}))
  check(result.verified===true&&result.requests===166&&result.resultSha256===policy.current.resultSha256&&result.codeSha256===policy.sourceCodeSha256,'frozen default verifier result differs');return result
 }finally{rmSync(target,{recursive:true,force:true})}
}
function parentBinding(current,archive){
 const p=archive.m.archiveParent,seed=current.m.documents.find(d=>d.url===policy.current.options.seedUrl)
 check(seed&&isDeepStrictEqual(p.current,Object.fromEntries(['seedUrl','staffel','season'].map(k=>[k,policy.current.options[k]])))&&isDeepStrictEqual(p.document,descriptor(seed))&&isDeepStrictEqual(p.originalReceipt,seed.originalReceipt)&&bytesOf(archive.files,p.file).equals(bytesOf(current.files,seed.file)),'adjacent parent must equal authenticated current seed')
 const links=extractFussballSeasonLinks(bytesOf(current.files,seed.file).toString(),p.current)
 check(links.previous?.seedUrl===p.observedSeedUrl&&links.previous.staffel===policy.archive.options.staffel&&links.previous.season===policy.archive.options.season,'original observed archive link differs')
 const {proofSha256,...base}=p;check(sha256(json(base))===proofSha256&&isDeepStrictEqual(p.alias,fussballArchiveSeedAlias({...policy.archive.options,observedSeedUrl:p.observedSeedUrl},p.current)),'exact adjacent alias/proof differs')
 return {...structuredClone(p),bytes:Buffer.from(current.files.get(seed.file))}
}
function resource(d,m,files){
 check(['css','font'].includes(d.kind),'only archive font resources allowed');const b=bytesOf(files,d.file),r=d.originalReceipt??receipt(d,m)
 check(r.capture.staffel===policy.archive.options.staffel&&r.capture.season==='2025/26'&&isDeepStrictEqual(r.document,descriptor(d))&&r.attempt?.status==='success'&&r.attempt.url===d.url&&r.attempt.kind===d.kind&&r.attempt.startedAt===d.capturedAt&&r.attempt.httpStatus===200&&b.length===d.bytes&&sha256(b)===d.sha256,'archive resource original receipt/body differs')
 const {origin,originalReceipt,...plain}=d;return {...structuredClone(plain),bytes:Buffer.from(b),originalReceipt:structuredClone(r)}
}
export function readFussballArchiveContinuationV6({current,archive,frozenDirectory,now=Date.now()}={}){
 assertFussballV6CurrentFresh(now)
 const c=authenticateParent(current,'current',now),a=authenticateParent(archive,'archive',now);check(isDeepStrictEqual(current.run,archive.run)&&isDeepStrictEqual(current.jobs,archive.jobs),'both parents must share actual metadata')
 const nested='checkpoint/parents/40633575248',oldMetadata=parse(bytesOf(c.files,nested+'.json'))
 const oldProof=readFussballTransportV5({parent:{...oldMetadata,zipBytes:bytesOf(c.files,nested+'.zip')},now}),history=exportFussballV5AccountedHistory(oldProof)
 check(isDeepStrictEqual(c.m.checkpoint.proof,oldProof)&&isDeepStrictEqual(c.m.checkpoint,a.m.checkpoint)&&oldProof.priorRequests+166+104===1838,'recursive original accounting differs')
 const oldArchive=history.archive;check(String(oldArchive?.run.id)===policy.oldArchiveRunId,'genuine old archive history required')
 const oldFiles=unpackVerifiedArchive(oldArchive.zipBytes,oldArchive.artifact.digest,'fussball-successor-archive'),oldManifest=parse(oldFiles.get('manifest.json'))
 const resources=[...a.m.documents.filter(d=>['css','font'].includes(d.kind)).map(d=>resource(d,a.m,a.files)),...oldManifest.documents.filter(d=>['css','font'].includes(d.kind)).map(d=>resource(d,oldManifest,oldFiles))].sort((x,y)=>x.url<y.url?-1:x.url>y.url?1:0)
 check(resources.length===86&&new Set(resources.map(d=>d.url)).size===86,'exact86 archive resource inventory required')
 const inventory=resources.map(({bytes,...d})=>({...d,bytes:bytes.length})),digest=sha256(stable(inventory));check(digest===policy.resourceDescriptorSha256,'fixed86 original descriptor/receipt digest differs')
 const binding=parentBinding(c,a),verified=frozenCurrent(c.files,frozenDirectory)
 const proof=freeze({preset:policy.preset,priorRequests:1838,totalRequestCap:5000,currentRequests:0,documentsCount:86,documentsSha256:digest,parents:['current','archive'].map(stage=>({stage,runId:policy.sourceRunId,artifactId:policy[stage].artifactId,artifactSha256:policy[stage].artifactSha256})),compatibility:{id:policy.compatibility,policySha256:sha256(policyBytes),fromCodeSha256:policy.sourceCodeSha256,toCodeSha256:fussballArchiveV6CodeSha256()},current:{createdAt:policy.current.createdAt,completedAt:policy.current.completedAt,resultSha256:policy.current.resultSha256,codeSha256:policy.sourceCodeSha256}})
 states.set(proof,{resources,binding,verified,history:{...history,actualCurrent:current,actualArchive:archive}});return proof
}
function state(proof){const s=states.get(proof);check(s,'reader-issued V6 capability required');return s}
export function getFussballV6Resources(proof){return state(proof).resources.map(d=>({...structuredClone(d),bytes:Buffer.from(d.bytes)}))}
export function getFussballV6History(proof){return Object.fromEntries(Object.entries(state(proof).history).map(([key,{zipBytes,...metadata}])=>[key,{...structuredClone(metadata),zipBytes:Buffer.from(zipBytes)}]))}
function collect(options,parent){return collectFussballSeason(options,{inspectPage:(html,scope)=>scope.kind==='round'?inspectFussballArchivePage(html,{archive:options,current:parent.current}):inspectFussballPage(html,scope)})}
export async function captureFussballArchiveV6({directory,proof,maxRequests,fetchFn=globalThis.fetch,now=Date.now,sleep,onProgress=()=>{}}={}){
 const s=state(proof);validateFussballV6Allowance({currentRequests:'0',archiveRequests:String(maxRequests)});assertFussballV6CurrentFresh(now())
 check(proof.compatibility.toCodeSha256===fussballArchiveV6CodeSha256(),'runtime compatibility changed')
 const createdAt=new Date(now()).toISOString(),options={...policy.archive.options,maxRequests,asOfDate:createdAt.slice(0,10)},parent=s.binding
 mkdirSync(directory);mkdirSync(join(directory,'documents'));mkdirSync(join(directory,'archive-parent'));writeFileSync(join(directory,parent.file),parent.bytes)
 for(const name of ['attempts.jsonl','outcomes.jsonl','progress.jsonl'])writeFileSync(join(directory,name),'')
 let retainedBytes=0;const documents=[],save=(d,origin)=>{check(!documents.some(x=>x.url===d.url),'duplicate saved URL');check(d.bytes.length<=(d.kind==='css'?64*1024:8*1024*1024)&&retainedBytes+d.bytes.length<=policy.archiveLimits.expandedBytes,'capture document size exceeded');retainedBytes+=d.bytes.length;const file=`documents/${d.sha256}.${ext(d.kind)}`;writeFileSync(join(directory,file),d.bytes);documents.push({...d,bytes:d.bytes.length,file,origin})}
 const client=createFussballCaptureClient({maxRequests,fetchFn,now,...(sleep?{sleep}:{}),cachedDocuments:getFussballV6Resources(proof),retryPolicy:FUSSBALL_V4_RETRY_POLICY,onAttempt:a=>appendFileSync(join(directory,'attempts.jsonl'),json(a)),onOutcome:a=>appendFileSync(join(directory,'outcomes.jsonl'),json(a)),onDocument:d=>save(d,'network'),onCachedDocument:d=>save(d,'cache')})
 let result=null,error=null
 try{result=await collect({...options,client,onProgress:async p=>{appendFileSync(join(directory,'progress.jsonl'),json(p));await onProgress(p)}},parent)}catch(e){error=e}
 let raw=result===null?null:json(result);if(raw!==null&&(Buffer.byteLength(raw)>policy.archiveLimits.resultBytes||Buffer.byteLength(raw)+retainedBytes>policy.archiveLimits.expandedBytes)){error=Error('fussball archive v6: result/expanded size exceeded');raw=null}if(raw!==null)writeFileSync(join(directory,'result.json'),raw)
 const {bytes,...archiveParent}=parent,manifest={version:6,provider:'fussball',createdAt,completedAt:new Date(now()).toISOString(),options,codeSha256:fussballArchiveV6CodeSha256(),success:!error,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw===null?null:sha256(raw),activationEligible:false,retryPolicy:FUSSBALL_V4_RETRY_POLICY.id,outcomesSha256:sha256(readFileSync(join(directory,'outcomes.jsonl'))),archiveParent,checkpoint:{version:5,proof}}
 for(const d of documents)if(d.origin==='network')d.originalReceipt=receipt(d,manifest)
 writeFileSync(join(directory,'manifest.json'),json(manifest));if(error)throw error;return manifest
}
function listRegular(directory,prefix=''){
 const out=[];for(const entry of readdirSync(join(directory,prefix),{withFileTypes:true})){const file=prefix?prefix+'/'+entry.name:entry.name,s=lstatSync(join(directory,file));check(!s.isSymbolicLink(),'symlink in archive evidence');if(s.isDirectory())out.push(...listRegular(directory,file));else{check(s.isFile(),'nonregular archive evidence');out.push(file)}}return out
}
export async function verifyFussballArchiveV6({directory,parentDirectory,frozenDirectory,now=Date.now()}={}){
 const proof=readFussballArchiveContinuationV6({...loadFussballV6Parents(parentDirectory),frozenDirectory,now}),s=state(proof),m=parse(readFussballV6Regular(directory,'manifest.json',16*1024*1024))
 check(closed(m,['version','provider','createdAt','completedAt','options','codeSha256','success','error','snapshot','documents','resultSha256','activationEligible','retryPolicy','outcomesSha256','archiveParent','checkpoint'])&&m.version===6&&m.provider==='fussball'&&m.success===true&&m.error===null&&m.activationEligible===false&&m.retryPolicy===FUSSBALL_V4_RETRY_POLICY.id,'closed successful source-only schema6 required')
 check(m.codeSha256===fussballArchiveV6CodeSha256()&&isDeepStrictEqual(m.checkpoint,{version:5,proof}),'exact V6 runtime/reauthenticated checkpoint required')
 const {bytes,...binding}=s.binding;check(isDeepStrictEqual(m.archiveParent,binding)&&readFussballV6Regular(directory,binding.file,8*1024*1024).equals(bytes),'original current adjacent seed differs')
 const start=Date.parse(m.createdAt),end=Date.parse(m.completedAt);check(Number.isFinite(start)&&start<=end&&end<=now&&m.options.asOfDate===m.createdAt.slice(0,10),'new archive clock differs')
 const expected={...policy.archive.options,maxRequests:m.options.maxRequests,asOfDate:m.createdAt.slice(0,10)};check(isDeepStrictEqual(m.options,expected),'fixed archive scope/intent differs');validateFussballV6Allowance({currentRequests:'0',archiveRequests:String(m.options.maxRequests)})
 const outcomesRaw=readFussballV6Regular(directory,'outcomes.jsonl',16*1024*1024),outcomes=lines(outcomesRaw),intents=lines(readFussballV6Regular(directory,'attempts.jsonl',16*1024*1024)),snapshot=m.snapshot
 check(sha256(outcomesRaw)===m.outcomesSha256&&closed(snapshot,['requests','attempts','stopped','stopReason'])&&snapshot.requests>0&&snapshot.requests<=m.options.maxRequests&&snapshot.stopped===false&&snapshot.stopReason===null&&isDeepStrictEqual(outcomes,snapshot.attempts)&&outcomes.length===snapshot.requests&&intents.length===outcomes.length,'all new counted intents/outcomes required')
 let last=null,ordinal=0;const groups=new Set(),successes=[]
 for(const [i,a]of outcomes.entries()){
  const success=a.status==='success',j=intents[i],time=Date.parse(a.startedAt)
  check(closed(a,['number','url','kind','startedAt','status','error',...(success?['httpStatus']:['transportFailure'])])&&closed(j,['number','url','kind','startedAt','status','error'])&&a.number===i+1&&isDeepStrictEqual(j,{number:a.number,url:a.url,kind:a.kind,startedAt:null,status:'pending',error:null})&&Number.isFinite(time)&&new Date(time).toISOString()===a.startedAt&&time>=start&&time<=end&&(!last||time-Date.parse(last.startedAt)>=6000),'ordered paced request journal differs')
  if(last?.status==='failed'){check(a.url===last.url&&a.kind===last.kind,'retry group changed URL/kind');ordinal++}else{check(!groups.has(a.url),'repeated request group');groups.add(a.url);ordinal=1}
  check(ordinal<=3&&(!last||last.status!=='failed'||time-Date.parse(last.startedAt)>=6000*(ordinal-1)),'retry count/backoff differs')
  if(success){check(a.error===null&&a.httpStatus===200,'success must be HTTP200');successes.push(a)}else{check(a.status==='failed'&&a.error==='connect failure'&&i<outcomes.length-1,'only recovered typed transport failures allowed');restoreFussballV4TransportFailure(a.transportFailure)}last=a
 }
 const available=new Map(s.resources.map(d=>[d.url,d])),docs=new Map(),network=[],cached=[],members=new Set(['manifest.json','attempts.jsonl','outcomes.jsonl','progress.jsonl','result.json',binding.file]);let total=0
 check(Array.isArray(m.documents)&&m.documents.length<=20000,'bounded source document inventory required')
 for(const d of m.documents){
  check(closed(d,['url','kind','bytes','sha256','status','contentType','capturedAt','file','origin','originalReceipt'])&&!docs.has(d.url)&&d.status===200&&d.file===`documents/${d.sha256}.${ext(d.kind)}`,'closed unique document/path required')
  const b=readFussballV6Regular(directory,d.file,d.kind==='css'?64*1024:8*1024*1024);total+=b.length;check(b.length===d.bytes&&sha256(b)===d.sha256,'source original body/hash differs');members.add(d.file)
  if(d.origin==='cache'){const old=available.get(d.url);check(old&&['css','font'].includes(d.kind),'archive-only resource cache required');const {bytes,...plain}=old;const {origin,...actual}=d;check(bytes.equals(b)&&isDeepStrictEqual(actual,{...plain,bytes:bytes.length}),'cached original descriptor/receipt differs');cached.push(d)}else{check(d.origin==='network','source origin differs');const a=successes[network.length];check(a&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&isDeepStrictEqual(d.originalReceipt,receipt(d,m)),'new network receipt differs');network.push(d)}docs.set(d.url,{...d,bytes:b})
 }
 check(network.length===successes.length,'successful request body missing');const raw=readFussballV6Regular(directory,'result.json',policy.archiveLimits.resultBytes);total+=raw.length;check(total<=policy.archiveLimits.expandedBytes&&sha256(raw)===m.resultSha256,'result digest/size differs')
 lines(readFussballV6Regular(directory,'progress.jsonl',16*1024*1024));const names=listRegular(directory);check(isDeepStrictEqual(names.sort(),[...members].sort()),'unknown or unused evidence members');check(names.reduce((n,f)=>n+lstatSync(join(directory,f)).size,0)<=policy.archiveLimits.expandedBytes,'total expanded evidence size exceeded')
 let clock=start,index=0;const usedNetwork=new Set(),usedCache=new Set(),client=createFussballCaptureClient({maxRequests:snapshot.requests,retryPolicy:FUSSBALL_V4_RETRY_POLICY,cachedDocuments:cached.map(d=>docs.get(d.url)),now:()=>clock,sleep:async ms=>{clock+=ms},onCachedDocument:d=>usedCache.add(d.url),fetchFn:async url=>{const a=outcomes[index++];check(a?.url===url,'offline URL/order differs');clock=Date.parse(a.startedAt);if(a.status==='failed')throw restoreFussballV4TransportFailure(a.transportFailure);const d=docs.get(url);check(d?.origin==='network','offline missing fresh network original');usedNetwork.add(url);return new Response(d.bytes,{status:200,headers:{'content-type':d.contentType}})}})
 const result=await collect({...m.options,client,onProgress:()=>{}},s.binding)
 check(Buffer.from(json(result)).equals(raw)&&index===snapshot.requests&&usedNetwork.size===network.length&&usedCache.size===cached.length,'exact offline source result/body inventory differs');assertFussballV6CurrentFresh(Math.max(now,Date.now()))
 return {verified:true,sourceOnly:true,activationEligible:false,nativeAdmission:false,requests:snapshot.requests,priorRequests:1838,cumulativeRequests:1838+snapshot.requests,totalRequestCap:5000,resultSha256:m.resultSha256,codeSha256:m.codeSha256,current:proof.current,administrativeFixtures:result.administrativeFixtures??[]}
}
