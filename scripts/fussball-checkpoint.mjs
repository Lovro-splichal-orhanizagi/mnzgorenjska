// Cache-only admission for three root-reviewed failed captures. No source reads,
// readiness, retry, archive, native, or activation permission is issued here.
import {readFileSync} from 'node:fs'
import {unpackVerifiedArchive,sha256,repository} from './dfb-artifacts.mjs'
import {createFussballCaptureClient,fussballRoundScope} from './lib/fussball-capture.mjs'

const fail=message=>{throw Error(`fussball checkpoint: ${message}`)}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
const registry=freeze(JSON.parse(readFileSync(new URL('./policies/fussball-transport-checkpoints.json',import.meta.url),'utf8')))
const proofs=new WeakMap(),plain=v=>v&&Object.getPrototypeOf(v)===Object.prototype
function closed(v,keys,label){if(!plain(v)||Object.keys(v).sort().join(',')!==keys.slice().sort().join(','))fail(`${label} closed fields differ`)}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(plain(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v}
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v))
const copyParent=p=>({run:structuredClone(p.run),artifact:structuredClone(p.artifact),jobs:structuredClone(p.jobs),zipBytes:Buffer.from(p.zipBytes)})
const receiptDocument=d=>Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]]))
const parse=(bytes,label)=>{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{fail(`${label} invalid UTF8/JSON`)}}
const lines=(bytes,label)=>{const s=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!s.endsWith('\n'))fail(`${label} incomplete journal`);return s.trimEnd().split('\n').map(s=>parse(Buffer.from(s),label))}

/** Metadata only, useful to an explicit GET-only transport; never a capability. */
export function reviewedFussballCheckpointParents(){return freeze(structuredClone(registry.parents))}

function verifyMetadata(parent,pin,now){
 closed(parent,['run','artifact','jobs','zipBytes'],'raw parent')
 const {run:r,artifact:a,jobs:e,zipBytes}=parent
 if(!r||String(r.id)!==pin.runId||r.run_attempt!==1||r.repository?.full_name!==repository||r.head_repository?.full_name!==repository||r.path!==registry.workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==pin.sourceCommit||r.status!=='completed'||r.conclusion!=='failure'||!utc(r.updated_at)||Date.parse(r.updated_at)>now)fail('exact terminal first-attempt main parent required')
 if(!a||String(a.id)!==pin.artifactId||a.name!==`fussball-season-${pin.runId}`||a.digest!==pin.artifactDigest||a.size_in_bytes!==pin.artifactSize||typeof a.expired!=='boolean'||String(a.workflow_run?.id)!==pin.runId||a.workflow_run?.head_sha!==pin.sourceCommit||a.workflow_run?.head_branch!=='main'||!Buffer.isBuffer(zipBytes)||zipBytes.length!==pin.artifactSize||`sha256:${sha256(zipBytes)}`!==pin.artifactDigest)fail('exact retained parent artifact bytes/identity required')
 closed(e,['total_count','jobs'],'complete jobs envelope')
 if(!Number.isInteger(e.total_count)||e.total_count<1||e.total_count>100||!Array.isArray(e.jobs)||e.jobs.length!==e.total_count||new Set(e.jobs.map(j=>j.id)).size!==e.total_count)fail('complete unique bounded jobs required')
 if(e.jobs.some(j=>String(j.run_id)!==pin.runId||j.run_attempt!==1||j.head_sha!==pin.sourceCommit||j.status!=='completed'))fail('parent jobs execution differs')
 const capture=e.jobs.filter(j=>j.name==='capture')
 if(capture.length!==1||String(capture[0].id)!==pin.jobId||capture[0].conclusion!=='failure'||!Array.isArray(capture[0].steps))fail('exact failed capture job required')
 for(const [name,conclusion]of [
  ['Validate hosted scope and reserve both season budgets before requests','success'],['Offline source and evidence checks','success'],['Share host pacing with older nightly and bulk readers','success'],
  ['Capture ordinary public source, without database credentials','failure'],['Replay only retained original documents, without network','skipped'],['Authorize archive only from independently replayed current originals','skipped'],['Source bytes, request journal and coverage','success'],
 ]){const rows=capture[0].steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!==conclusion)fail('parent source failure/upload/continuation steps differ')}
 if(e.jobs.length!==3||['archive','handoff'].some(name=>{const rows=e.jobs.filter(j=>j.name===name);return rows.length!==1||rows[0].conclusion!=='skipped'}))fail('failed parent cannot have archive or handoff continuation')
}

function originals(parent,pin,now){
 verifyMetadata(parent,pin,now)
 const files=unpackVerifiedArchive(parent.zipBytes,pin.artifactDigest,'fussball-checkpoint')
 if(!files.has('manifest.json')||!files.has('attempts.jsonl')||!files.has('progress.jsonl')||sha256(files.get('manifest.json'))!==pin.manifestSha256||sha256(files.get('attempts.jsonl'))!==pin.attemptsSha256||sha256(files.get('progress.jsonl'))!==pin.progressSha256)fail('exact manifest/journal/progress hashes required')
 const m=parse(files.get('manifest.json'),'manifest')
 closed(m,['version','provider','createdAt','completedAt','options','codeSha256','success','error','snapshot','documents','resultSha256','activationEligible'],'failed manifest')
 if(m.version!==1||m.provider!=='fussball'||m.success!==false||m.activationEligible!==false||m.resultSha256!==null||m.error!=='fetch failed'||m.codeSha256!==pin.codeSha256||m.createdAt!==pin.createdAt||m.completedAt!==pin.completedAt||!same(m.options,pin.options)||!utc(m.createdAt)||!utc(m.completedAt)||Date.parse(m.createdAt)>Date.parse(m.completedAt)||Date.parse(m.completedAt)>now)fail('exact reviewed failed original capture/code/scope required')
 const s=m.snapshot;closed(s,['requests','attempts','stopped','stopReason'],'terminal snapshot')
 if(s.requests!==pin.requests||s.stopped!==true||s.stopReason!=='fetch failed'||!Array.isArray(s.attempts)||s.attempts.length!==s.requests||!Array.isArray(m.documents)||m.documents.length!==s.requests-1)fail('all successful requests plus one terminal failure required')
 // Registry binds the audited identical client at each original source commit:
 // httpStatus is assigned immediately after fetch returns, before body/challenge
 // validation. Its absence in this exact raw pinned event proves no response
 // was recorded; the generic error string alone never grants eligibility, and
 // no particular DNS/TLS/network cause is claimed.
 const terminal=s.attempts.at(-1)
 closed(terminal,['number','url','kind','startedAt','status','error'],'no-response terminal attempt')
 if(!same(terminal,pin.terminal)||terminal.status!=='failed'||terminal.error!=='fetch failed'||terminal.number!==s.requests)fail('exact reviewed no-response transport event required')
 const journal=lines(files.get('attempts.jsonl'),'intent'),used=new Set(['manifest.json','attempts.jsonl','progress.jsonl']),urls=new Set(),out=[]
 if(journal.length!==s.requests)fail('every spent request needs its original intent')
 lines(files.get('progress.jsonl'),'progress')
 for(const [i,a]of s.attempts.entries()){
  const j=journal[i];closed(j,['number','url','kind','startedAt','status','error'],'original intent')
  if(a.number!==i+1||!utc(a.startedAt)||Date.parse(a.startedAt)<Date.parse(m.createdAt)||Date.parse(a.startedAt)>Date.parse(m.completedAt)||i&&Date.parse(a.startedAt)-Date.parse(s.attempts[i-1].startedAt)<6000||j.number!==a.number||j.url!==a.url||j.kind!==a.kind||j.startedAt!==null||j.status!=='pending'||j.error!==null)fail('ordered paced original request journal differs')
  if(i===s.requests-1)continue
  closed(a,['number','url','kind','startedAt','status','error','httpStatus'],'successful original request')
  const d=m.documents[i];closed(d,['url','kind','bytes','sha256','status','contentType','capturedAt','file'],'original document')
  if(a.status!=='success'||a.httpStatus!==200||a.error!==null||a.url!==d.url||a.kind!==d.kind||a.startedAt!==d.capturedAt||d.status!==200||!Number.isInteger(d.bytes)||d.bytes<1||typeof d.contentType!=='string'||!['round','report','lineup','css','font'].includes(d.kind)||urls.has(d.url)||!/^[a-f0-9]{64}$/.test(d.sha256))fail('successful unique HTTP200 document/attempt differs')
  const ext=d.kind==='font'?'woff':d.kind==='css'?'css':'html'
  if(d.file!==`documents/${d.sha256}.${ext}`||!files.has(d.file)||files.get(d.file).length!==d.bytes||sha256(files.get(d.file))!==d.sha256)fail('retained original body/path/hash differs')
  used.add(d.file);urls.add(d.url)
  if(d.kind==='round'){
   if(fussballRoundScope(d.url)?.staffel!==registry.scope.staffel||d.contentType.split(';')[0].trim().toLowerCase()!=='text/html'||/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(files.get(d.file).toString('utf8')))fail('round origin scope/MIME/challenge differs')
   continue
  }
  out.push({...structuredClone(d),bytes:Buffer.from(files.get(d.file)),originalReceipt:{version:1,document:receiptDocument(d),attempt:structuredClone(a),capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}})
 }
 if(files.size!==used.size||[...files.keys()].some(name=>!used.has(name)))fail('extra or missing retained artifact member')
 // Constructor validates exact public routes, MIME/body bounds and challenge
 // absence in retained originals. It performs no reads and has no fallback.
 createFussballCaptureClient({maxRequests:1,cachedDocuments:out,fetchFn:()=>fail('checkpoint reader has no network')})
 return out
}

/** Raw ordered {parents:[{run,artifact,jobs:{total_count,jobs},zipBytes}],now?}. */
export function readFussballTransportCheckpoint(input){
 closed(input,['parents',...(Object.hasOwn(input??{},'now')?['now']:[])],'checkpoint input')
 const now=Object.hasOwn(input,'now')?input.now:Date.now()
 if(!Number.isFinite(now)||!Array.isArray(input.parents)||input.parents.length!==registry.parents.length)fail('all exact parents and finite accounting clock required')
 const selected=new Map()
 for(const [i,parent]of input.parents.entries())for(const d of originals(parent,registry.parents[i],now)){
  const previous=selected.get(d.url)
  if(previous&&(previous.kind!==d.kind||previous.sha256!==d.sha256||!previous.bytes.equals(d.bytes)))fail('conflicting retained URL/kind/body requires review')
  if(!previous||Date.parse(d.capturedAt)>Date.parse(previous.capturedAt))selected.set(d.url,d)
 }
 const documents=[...selected.values()].sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0)
 const documentsSha256=sha256(JSON.stringify(documents.map(({bytes,...d})=>({...d,bytes:bytes.length}))))
 const priorRequests=registry.carriedForwardRequests+registry.parents.reduce((n,p)=>n+p.requests,0)
 if(priorRequests!==1114||registry.totalRequestCap!==5000||documents.length!==572)fail('reviewed parent ledger or retained inventory differs')
 const proof=freeze({preset:registry.preset,scope:structuredClone(registry.scope),priorRequests,totalRequestCap:registry.totalRequestCap,parents:structuredClone(registry.parents),documentsSha256,documentsCount:documents.length})
 proofs.set(proof,{documents,parents:input.parents.map(copyParent)})
 return proof
}

function requireProof(proof){const state=proofs.get(proof);if(!state)fail('reader-issued cache-only checkpoint required');return state}
export function getFussballCheckpointDocuments(proof){return requireProof(proof).documents.map(({bytes,...d})=>({...structuredClone(d),bytes:Buffer.from(bytes)}))}
export function exportFussballTransportCheckpoint(proof){return {proof,parents:requireProof(proof).parents.map(copyParent)}}

// Exact successor to one consumed completion. The old v1 registry/reader above
// keep their three-parent and1114 contract; this is still cache-only metadata.
const resumption=freeze(JSON.parse(readFileSync(new URL('./policies/fussball-transport-resumption.json',import.meta.url),'utf8')))
export function reviewedFussballResumptionParent(){return freeze(structuredClone(resumption.parent))}
function resumptionMetadata(parent,pin,now){
 closed(parent,['run','artifact','jobs','zipBytes'],'raw resumption parent')
 const {run:r,artifact:a,jobs:e,zipBytes}=parent
 if(!r||String(r.id)!==pin.runId||r.run_attempt!==1||r.repository?.full_name!==repository||r.head_repository?.full_name!==repository||r.path!==resumption.workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==pin.sourceCommit||r.status!=='completed'||r.conclusion!=='failure'||!utc(r.updated_at)||Date.parse(r.updated_at)>now)fail('exact terminal failed resumption execution required')
 if(!a||String(a.id)!==pin.artifactId||a.name!==`fussball-season-${pin.runId}`||a.digest!==pin.artifactDigest||a.size_in_bytes!==pin.artifactSize||typeof a.expired!=='boolean'||String(a.workflow_run?.id)!==pin.runId||a.workflow_run?.head_sha!==pin.sourceCommit||a.workflow_run?.head_branch!=='main'||!Buffer.isBuffer(zipBytes)||zipBytes.length!==pin.artifactSize||`sha256:${sha256(zipBytes)}`!==pin.artifactDigest)fail('exact retained resumption artifact required')
 closed(e,['total_count','jobs'],'resumption jobs envelope')
 if(e.total_count!==3||!Array.isArray(e.jobs)||e.jobs.length!==3||new Set(e.jobs.map(j=>j.id)).size!==3||e.jobs.some(j=>String(j.run_id)!==pin.runId||j.run_attempt!==1||j.head_sha!==pin.sourceCommit||j.status!=='completed'))fail('complete exact resumption jobs required')
 const captures=e.jobs.filter(j=>j.name==='capture'),job=captures[0]
 if(captures.length!==1||String(job.id)!==pin.jobId||job.conclusion!=='failure'||!Array.isArray(job.steps))fail('exact failed resumption capture job required')
 for(const [name,conclusion]of[
  ['Validate exact reviewed completion scope and total5000 budget','success'],['Offline source and evidence checks','success'],['Authenticate only the three reviewed failed source artifacts','success'],['Share host pacing with older nightly and bulk readers','success'],
  ['Capture fresh rounds and missing originals without database credentials','failure'],['Independently replay only retained original documents','skipped'],['Authorize archive only from complete replayed current originals','skipped'],['Preserve source originals, checkpoint provenance and request journal','success'],
 ]){const rows=job.steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!==conclusion)fail('resumption failure/upload/skipped continuation steps differ')}
 if(['archive','handoff'].some(name=>{const rows=e.jobs.filter(j=>j.name===name);return rows.length!==1||rows[0].conclusion!=='skipped'}))fail('resumption archive/handoff must remain skipped')
}

/** Exactly {parent:{run,artifact,jobs:{total_count,jobs},zipBytes},now?}.
 * No serialized proof, caller pins, freshness/readiness or source authority. */
export function readFussballTransportResumption(input){
 closed(input,['parent',...(Object.hasOwn(input??{},'now')?['now']:[])],'resumption input')
 const now=Object.hasOwn(input,'now')?input.now:Date.now(),pin=resumption.parent
 if(!Number.isFinite(now)||resumption.preset!=='baden-reviewed-transports-v2'||resumption.priorRequests!==1212||resumption.totalRequestCap!==5000||pin.requests!==98||!same(resumption.scope,registry.scope)||resumption.documentsCount!==631)fail('fixed1212/5000 resumption scope/clock required')
 resumptionMetadata(input.parent,pin,now)
 const files=unpackVerifiedArchive(input.parent.zipBytes,pin.artifactDigest,'fussball-resumption')
 for(const [file,key]of[['manifest.json','manifestSha256'],['attempts.jsonl','attemptsSha256'],['progress.jsonl','progressSha256']])if(!files.has(file)||sha256(files.get(file))!==pin[key])fail('exact resumption manifest/journal/progress hashes required')
 const m=parse(files.get('manifest.json'),'resumption manifest')
 closed(m,['version','provider','createdAt','completedAt','options','codeSha256','success','error','snapshot','documents','resultSha256','activationEligible','checkpoint'],'resumption manifest')
 if(m.version!==4||m.provider!=='fussball'||m.success!==false||m.activationEligible!==false||m.resultSha256!==null||m.error!=='fetch failed'||m.codeSha256!==pin.codeSha256||m.createdAt!==pin.createdAt||m.completedAt!==pin.completedAt||!same(m.options,pin.options)||!utc(m.createdAt)||!utc(m.completedAt)||Date.parse(m.createdAt)>Date.parse(m.completedAt)||Date.parse(m.completedAt)>now)fail('exact reviewed failed v4 resumption capture required')
 const expectedFiles=registry.parents.map(p=>({runId:p.runId,metadataFile:`checkpoint/parents/${p.runId}.json`,zipFile:`checkpoint/parents/${p.runId}.zip`}))
 closed(m.checkpoint,['version','proof','parentFiles'],'embedded checkpoint')
 if(m.checkpoint.version!==1||!same(m.checkpoint.parentFiles,expectedFiles))fail('exact embedded old3 parent paths required')
 const used=new Set(['manifest.json','attempts.jsonl','progress.jsonl']),parents=expectedFiles.map(p=>{
  if(!files.has(p.metadataFile)||!files.has(p.zipFile))fail('all embedded old3 raw parents required')
  const meta=parse(files.get(p.metadataFile),'embedded parent metadata');closed(meta,['run','artifact','jobs'],'embedded parent metadata');used.add(p.metadataFile);used.add(p.zipFile)
  return {...meta,zipBytes:files.get(p.zipFile)}
 })
 const oldProof=readFussballTransportCheckpoint({parents,now})
 if(!same(m.checkpoint.proof,oldProof)||oldProof.priorRequests+pin.requests!==1212)fail('independently authenticated old checkpoint/ledger differs')
 const oldDocuments=getFussballCheckpointDocuments(oldProof),old=new Map(oldDocuments.map(d=>[d.url,d]))
 const s=m.snapshot;closed(s,['requests','attempts','stopped','stopReason'],'resumption terminal snapshot')
 if(s.requests!==98||s.stopped!==true||s.stopReason!=='fetch failed'||!Array.isArray(s.attempts)||s.attempts.length!==98||!Array.isArray(m.documents)||m.documents.length!==232)fail('complete98 requests and232 originals required')
 const terminal=s.attempts.at(-1);closed(terminal,['number','url','kind','startedAt','status','error'],'resumption no-response failure')
 if(!same(terminal,pin.terminal)||terminal.status!=='failed'||terminal.error!=='fetch failed'||terminal.number!==98)fail('exact no-response resumption terminal required')
 const journal=lines(files.get('attempts.jsonl'),'resumption intents');lines(files.get('progress.jsonl'),'resumption progress')
 if(journal.length!==98)fail('complete resumption request intent journal required')
 for(const [i,a]of s.attempts.entries()){
  const j=journal[i];closed(j,['number','url','kind','startedAt','status','error'],'resumption original intent')
  if(a.number!==i+1||!utc(a.startedAt)||Date.parse(a.startedAt)<Date.parse(m.createdAt)||Date.parse(a.startedAt)>Date.parse(m.completedAt)||i&&Date.parse(a.startedAt)-Date.parse(s.attempts[i-1].startedAt)<6000||j.number!==a.number||j.url!==a.url||j.kind!==a.kind||j.startedAt!==null||j.status!=='pending'||j.error!==null)fail('ordered paced resumption journal differs')
  if(i<97){closed(a,['number','url','kind','startedAt','status','error','httpStatus'],'resumption network success');if(a.status!=='success'||a.error!==null||a.httpStatus!==200)fail('all97 network originals must be HTTP200')}
 }
 const urls=new Set(),network=[],cached=[];let networkIndex=0,rounds=0
 for(const d of m.documents){
  closed(d,['url','kind','bytes','sha256','status','contentType','capturedAt','file','origin','originalReceipt'],'resumption retained document')
  if(urls.has(d.url)||!['round','report','lineup','css','font'].includes(d.kind)||!['cache','network'].includes(d.origin)||d.status!==200||!Number.isInteger(d.bytes)||d.bytes<1||typeof d.contentType!=='string'||!utc(d.capturedAt)||!/^[a-f0-9]{64}$/.test(d.sha256))fail('unique complete resumption document descriptor required')
  urls.add(d.url)
  const ext=d.kind==='font'?'woff':d.kind==='css'?'css':'html',bytes=files.get(d.file)
  if(d.file!==`documents/${d.sha256}.${ext}`||!bytes||bytes.length!==d.bytes||sha256(bytes)!==d.sha256)fail('resumption original body/path/hash differs')
  used.add(d.file)
  const {origin,originalReceipt,...plainDocument}=d
  if(origin==='cache'){
   const prior=old.get(d.url)
   if(d.kind==='round'||!prior)fail('cached body/flat receipt must match authenticated old original')
   const {bytes:oldBytes,originalReceipt:oldReceipt,...oldDescriptor}=prior
   if(!same(plainDocument,{...oldDescriptor,bytes:oldBytes.length})||!same(originalReceipt,oldReceipt)||!bytes.equals(oldBytes))fail('cached body/flat receipt must match authenticated old original')
   cached.push(d)
  }else{
   const a=s.attempts[networkIndex++]
   if(!a||a.status!=='success'||a.url!==d.url||a.kind!==d.kind||a.startedAt!==d.capturedAt||!same(originalReceipt,{version:1,document:receiptDocument(d),attempt:a,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}))fail('network original and flat receipt differ')
   if(d.kind==='round'){
    if(fussballRoundScope(d.url)?.staffel!==registry.scope.staffel||d.contentType.split(';')[0].trim().toLowerCase()!=='text/html'||/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(bytes.toString('utf8')))fail('resumption round scope/MIME/challenge differs')
    rounds++
   }else network.push({...structuredClone(plainDocument),bytes:Buffer.from(bytes),originalReceipt:structuredClone(originalReceipt)})
  }
 }
 if(networkIndex!==97||rounds!==30||network.length!==67||cached.length!==135||files.size!==used.size||[...files.keys()].some(k=>!used.has(k)))fail('exact network/cache/round/member inventory required')
 createFussballCaptureClient({maxRequests:1,cachedDocuments:network,fetchFn:()=>fail('resumption reader has no network')})
 // Four specifically reviewed differing URLs are authenticated, then BOTH
 // entire report+lineup revisions are excluded. No generic newest-wins rule.
 const conflicts=new Map(resumption.conflicts.map(c=>[c.url,c])),seenConflicts=new Set(),selected=new Map(old)
 if(conflicts.size!==4||resumption.conflicts.some(c=>!['report','lineup'].includes(c.kind)||!/(?:031DS4G7UK000000VS5489BUVUR5FS5A|031DS4G74K000000VS5489BUVUR5FS5A)(?:\/ticker-id\/selectedTickerId)?$/.test(c.url)))fail('exact four reviewed pair conflicts required')
 for(const d of network){
  const previous=old.get(d.url)
  if(previous){
   const c=conflicts.get(d.url)
   if(!c||c.kind!==d.kind||previous.kind!==d.kind||c.oldSha256!==previous.sha256||c.newSha256!==d.sha256||previous.bytes.equals(d.bytes))fail('unexpected retained URL/kind/body conflict requires review')
   seenConflicts.add(d.url)
  }else selected.set(d.url,d)
 }
 if(seenConflicts.size!==4)fail('all four exact old/new revisions required; old-pair fallback forbidden')
 for(const url of conflicts.keys())selected.delete(url)
 const documents=[...selected.values()].sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0)
 if(documents.length!==631)fail('exact631 pre-filter candidates required')
 const documentsSha256=sha256(JSON.stringify(documents.map(({bytes,...d})=>({...d,bytes:bytes.length}))))
 if(documentsSha256!==resumption.documentsSha256)fail('exact retained candidate descriptor digest differs')
 const proof=freeze({preset:resumption.preset,scope:structuredClone(resumption.scope),priorRequests:1212,totalRequestCap:5000,parents:[structuredClone(pin)],documentsSha256,documentsCount:documents.length})
 proofs.set(proof,{documents,parents:[copyParent(input.parent)]});return proof
}

// One fixed successor accounts both stages of the same consumed execution.
let successorRegistry
function reviewedSuccessor(){return successorRegistry??=freeze(JSON.parse(readFileSync(new URL('./policies/fussball-transport-successor.json',import.meta.url),'utf8')))}
export function reviewedFussballSuccessorParents(){return freeze(structuredClone(reviewedSuccessor().parents))}
export function exportFussballSuccessorAccountedHistory(proof){
 const state=requireProof(proof),successor=reviewedSuccessor()
 if(proof.preset!==successor.preset||!state.accounted)fail('reader-issued successor history required')
 return Object.fromEntries(Object.entries(state.accounted).map(([stage,p])=>[stage,copyParent(p)]))
}
function successorMetadata(parent,pin,now){
 const successor=reviewedSuccessor()
 closed(parent,['run','artifact','jobs','zipBytes'],'raw successor parent')
 const {run:r,artifact:a,jobs:e,zipBytes}=parent
 if(!r||String(r.id)!==pin.runId||r.run_attempt!==1||r.repository?.full_name!==repository||r.head_repository?.full_name!==repository||r.path!==successor.workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==pin.sourceCommit||r.status!=='completed'||r.conclusion!=='failure'||!utc(r.updated_at)||Date.parse(r.updated_at)>now)fail('exact terminal successor execution required')
 const name=`fussball-season-${pin.stage==='archive'?'archive-':''}${pin.runId}`
 if(!a||String(a.id)!==pin.artifactId||a.name!==name||a.digest!==pin.artifactDigest||a.size_in_bytes!==pin.artifactSize||typeof a.expired!=='boolean'||String(a.workflow_run?.id)!==pin.runId||a.workflow_run?.head_sha!==pin.sourceCommit||a.workflow_run?.head_branch!=='main'||!Buffer.isBuffer(zipBytes)||zipBytes.length!==pin.artifactSize||`sha256:${sha256(zipBytes)}`!==pin.artifactDigest)fail('exact retained successor artifact required')
 closed(e,['total_count','jobs'],'successor jobs envelope')
 if(e.total_count!==3||!Array.isArray(e.jobs)||e.jobs.length!==3||new Set(e.jobs.map(j=>j.id)).size!==3||e.jobs.some(j=>String(j.run_id)!==pin.runId||j.run_attempt!==1||j.head_sha!==pin.sourceCommit||j.status!=='completed'))fail('complete successor jobs required')
 for(const [stage,id,conclusion]of [['capture','122448503907','success'],['archive','122460201066','failure'],['handoff','122460906179','skipped']]){
  const rows=e.jobs.filter(j=>j.name===stage),j=rows[0]
  if(rows.length!==1||String(j.id)!==id||j.conclusion!==conclusion||!Array.isArray(j.steps))fail('exact successor stage identity/state required')
 }
 const check=(stage,name,conclusion)=>{const rows=e.jobs.find(j=>j.name===stage).steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!==conclusion)fail('successor source/replay/authorization/upload steps differ')}
 for(const name of ['Validate exact reviewed completion scope and total5000 budget','Offline source and evidence checks','Authenticate only the exact reviewed failed source artifacts for the selected preset','Share host pacing with older nightly and bulk readers','Capture fresh rounds and missing originals without database credentials','Independently replay only retained original documents','Authorize archive only from complete replayed current originals','Preserve source originals, checkpoint provenance and request journal'])check('capture',name,'success')
 for(const name of ['Validate unchanged reviewed main and reserved allowances','Share host pacing with older nightly and bulk readers','Preserve separate archive originals and request journal'])check('archive',name,'success')
 check('archive','Reauthenticate and replay current proof, bind adjacent archive, capture and replay','failure')
 if(e.jobs.find(j=>j.name==='handoff').steps.length!==0)fail('successor handoff must remain skipped')
}
function successorManifest(files,pin,now){
 for(const [file,key]of [['manifest.json','manifestSha256'],['attempts.jsonl','attemptsSha256'],['progress.jsonl','progressSha256']])if(!files.has(file)||sha256(files.get(file))!==pin[key])fail('exact successor manifest/journal/progress hashes required')
 const m=parse(files.get('manifest.json'),'successor manifest'),current=pin.stage==='current'
 closed(m,['version','provider','createdAt','completedAt','options','codeSha256','success','error','snapshot','documents','resultSha256','activationEligible',current?'checkpoint':'archiveParent'],'successor manifest')
 if(m.version!==(current?4:3)||m.provider!=='fussball'||m.success!==current||m.error!==(current?null:'fussball: manjka element score-left')||m.activationEligible!==false||m.resultSha256!==(current?pin.resultSha256:null)||m.codeSha256!==pin.codeSha256||m.createdAt!==pin.createdAt||m.completedAt!==pin.completedAt||!same(m.options,pin.options)||!utc(m.createdAt)||!utc(m.completedAt)||Date.parse(m.createdAt)>Date.parse(m.completedAt)||Date.parse(m.completedAt)>now)fail('exact historical successor stage capture required')
 if(current&&(!files.has('result.json')||sha256(files.get('result.json'))!==pin.resultSha256))fail('exact successful current result required')
 const s=m.snapshot;closed(s,['requests','attempts','stopped','stopReason'],'successor snapshot')
 if(s.requests!==pin.requests||s.stopped!==false||s.stopReason!==null||!Array.isArray(s.attempts)||s.attempts.length!==pin.requests||!Array.isArray(m.documents)||m.documents.length!==pin.documentsCount)fail('complete successor request/body inventory required')
 const journal=lines(files.get('attempts.jsonl'),'successor intents')
 if(journal.length!==pin.requests)fail('complete successor intent journal required')
 if(current)lines(files.get('progress.jsonl'),'successor progress')
 else if(files.get('progress.jsonl').length!==0)fail('failed archive must have empty progress')
 for(const [i,a]of s.attempts.entries()){
  closed(a,['number','url','kind','startedAt','status','error','httpStatus'],'successor successful attempt')
  const j=journal[i];closed(j,['number','url','kind','startedAt','status','error'],'successor intent')
  if(a.number!==i+1||a.status!=='success'||a.error!==null||a.httpStatus!==200||!utc(a.startedAt)||Date.parse(a.startedAt)<Date.parse(m.createdAt)||Date.parse(a.startedAt)>Date.parse(m.completedAt)||i&&Date.parse(a.startedAt)-Date.parse(s.attempts[i-1].startedAt)<6000||j.number!==a.number||j.url!==a.url||j.kind!==a.kind||j.startedAt!==null||j.status!=='pending'||j.error!==null)fail('ordered paced successor HTTP200 journal differs')
 }
 return m
}
function successorDocuments(files,m,pin,old){
 const current=pin.stage==='current',used=new Set(['manifest.json','attempts.jsonl','progress.jsonl',...(current?['result.json','checkpoint/parents/40566792786.json','checkpoint/parents/40566792786.zip']:[m.archiveParent.file])]),out=[],all=new Map();let network=0,cached=0,rounds=0
 for(const d of m.documents){
  closed(d,['url','kind','bytes','sha256','status','contentType','capturedAt','file',...(current?['origin','originalReceipt']:[])],'successor document')
  if(all.has(d.url)||!['round','report','lineup','css','font'].includes(d.kind)||d.status!==200||!Number.isInteger(d.bytes)||d.bytes<1||typeof d.contentType!=='string'||!utc(d.capturedAt)||!/^[a-f0-9]{64}$/.test(d.sha256))fail('unique successor HTTP200 original descriptor required')
  const ext=d.kind==='font'?'woff':d.kind==='css'?'css':'html',bytes=files.get(d.file)
  if(d.file!==`documents/${d.sha256}.${ext}`||!bytes||bytes.length!==d.bytes||sha256(bytes)!==d.sha256)fail('successor original body/path/hash differs')
  used.add(d.file);all.set(d.url,{...d,bytes})
  const {origin,originalReceipt,...descriptor}=d
  let receipt=originalReceipt
  if(current&&origin==='cache'){
   const prior=old.get(d.url)
   if(d.kind==='round'||!prior)fail('successor cached original absent from authenticated v2')
   const {bytes:priorBytes,originalReceipt:priorReceipt,...priorDescriptor}=prior
   if(!same(descriptor,{...priorDescriptor,bytes:priorBytes.length})||!same(receipt,priorReceipt)||!bytes.equals(priorBytes)||Date.parse(d.capturedAt)>Date.parse(m.createdAt))fail('successor cached body/flat receipt differs')
   cached++
  }else{
   if(current&&origin!=='network')fail('successor origin differs')
   const a=m.snapshot.attempts[network++]
   if(!a||a.url!==d.url||a.kind!==d.kind||a.startedAt!==d.capturedAt)fail('successor original request identity differs')
   const expected={version:1,document:receiptDocument(d),attempt:a,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}
   if(current&&!same(receipt,expected))fail('successor network flat receipt differs')
   receipt=expected
  }
  if(d.kind==='round'){
   if(fussballRoundScope(d.url)?.staffel!==m.options.staffel||d.contentType.split(';')[0].trim().toLowerCase()!=='text/html'||/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(bytes.toString('utf8')))fail('successor round scope/MIME/challenge differs')
   rounds++
  }else out.push({...structuredClone(descriptor),bytes:Buffer.from(bytes),originalReceipt:structuredClone(receipt)})
 }
 if(network!==pin.requests||cached!==(current?458:0)||rounds!==(current?30:1)||files.size!==used.size||[...files.keys()].some(k=>!used.has(k)))fail('exact successor stage network/cache/round/member inventory required')
 createFussballCaptureClient({maxRequests:1,cachedDocuments:out,fetchFn:()=>fail('successor reader has no network')})
 return {documents:out,all}
}
/** Fixed genuine current+archive raw parents; no caller pins or serialized capability. */
export function readFussballTransportSuccessor(input){
 closed(input,['current','archive',...(Object.hasOwn(input??{},'now')?['now']:[])],'successor input')
 const now=Object.hasOwn(input,'now')?input.now:Date.now(),successor=reviewedSuccessor(),pins=successor.parents
 if(!Number.isFinite(now)||successor.preset!=='baden-reviewed-transports-v3'||successor.priorRequests!==1423||successor.totalRequestCap!==5000||successor.documentsCount!==634||!same(successor.scope,registry.scope)||pins.length!==2||pins[0].stage!=='current'||pins[1].stage!=='archive'||pins[0].requests!==206||pins[1].requests!==5)fail('fixed1423/5000 successor required')
 for(const pin of pins)successorMetadata(input[pin.stage],pin,now)
 if(!same(input.current.run,input.archive.run)||!same(input.current.jobs,input.archive.jobs))fail('both successor stages require identical actual execution metadata')
 const currentFiles=unpackVerifiedArchive(input.current.zipBytes,pins[0].artifactDigest,'fussball-successor-current'),archiveFiles=unpackVerifiedArchive(input.archive.zipBytes,pins[1].artifactDigest,'fussball-successor-archive')
 const m=successorManifest(currentFiles,pins[0],now),a=successorManifest(archiveFiles,pins[1],now)
 const paths={runId:'40566792786',metadataFile:'checkpoint/parents/40566792786.json',zipFile:'checkpoint/parents/40566792786.zip'}
 closed(m.checkpoint,['version','proof','parentFiles'],'successor embedded checkpoint')
 if(m.checkpoint.version!==2||!same(m.checkpoint.parentFiles,[paths])||!currentFiles.has(paths.metadataFile)||!currentFiles.has(paths.zipFile))fail('fixed embedded v2 parent required')
 const metadata=parse(currentFiles.get(paths.metadataFile),'successor embedded v2 metadata');closed(metadata,['run','artifact','jobs'],'successor embedded metadata')
 const prior={...metadata,zipBytes:currentFiles.get(paths.zipFile)},oldProof=readFussballTransportResumption({parent:prior,now})
 if(!same(m.checkpoint.proof,oldProof)||oldProof.priorRequests+pins[0].requests+pins[1].requests!==1423)fail('authenticated successor embedded proof/ledger differs')
 const current=successorDocuments(currentFiles,m,pins[0],new Map(getFussballCheckpointDocuments(oldProof).map(d=>[d.url,d])))
 // Archive parent is evidence of the historical adjacent authorization, not fresh authorization.
 if(!same(a.archiveParent,pins[1].archiveParent))fail('exact historical archive parent binding required')
 const parent=a.archiveParent,seed=current.all.get(parent.current.seedUrl),parentBytes=archiveFiles.get(parent.file)
 if(!seed||!same(receiptDocument(parent.document),receiptDocument({...seed,bytes:seed.bytes.length}))||!same(parent.originalReceipt,seed.originalReceipt)||!parentBytes||!parentBytes.equals(seed.bytes))fail('archive parent must equal genuine current seed original/receipt')
 const {proofSha256,...parentProof}=parent
 if(sha256(JSON.stringify(parentProof)+'\n')!==proofSha256)fail('archive parent proof digest differs')
 successorDocuments(archiveFiles,a,pins[1],null)
 const documents=current.documents.sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0),documentsSha256=sha256(JSON.stringify(documents.map(({bytes,...d})=>({...d,bytes:bytes.length}))))
 if(documents.length!==634||documentsSha256!==successor.documentsSha256)fail('exact634 latest-only candidate digest required')
 const proof=freeze({preset:successor.preset,scope:structuredClone(successor.scope),priorRequests:1423,totalRequestCap:5000,parents:structuredClone(pins),documentsSha256,documentsCount:documents.length})
 proofs.set(proof,{documents,parents:[copyParent(input.current),copyParent(input.archive)],accounted:{prior:copyParent(prior),current:copyParent(input.current),archive:copyParent(input.archive)}})
 return proof
}

// One fixed consumed v3 partial. All old readers/protocols above stay unchanged.
let v4Registry
function reviewedV4(){return v4Registry??=freeze(JSON.parse(readFileSync(new URL('./policies/fussball-transport-v4.json',import.meta.url),'utf8')))}
export function reviewedFussballV4Parent(){return freeze(structuredClone(reviewedV4().parent))}
export function exportFussballV4AccountedHistory(proof){
 const state=requireProof(proof),v4=reviewedV4()
 if(proof.preset!==v4.preset||!state.accounted)fail('reader-issued v4 history required')
 return Object.fromEntries(Object.entries(state.accounted).map(([name,p])=>[name,copyParent(p)]))
}
export function readFussballTransportV4(input){
 closed(input,['parent',...(Object.hasOwn(input??{},'now')?['now']:[])],'v4 input')
 const v4=reviewedV4(),now=input.now??Date.now(),p=input.parent,pin=v4.parent
 if(!Number.isFinite(now)||v4.preset!=='baden-reviewed-transports-v4'||v4.priorRequests!==1517||v4.totalRequestCap!==5000||!same(v4.scope,registry.scope))fail('fixed1517/5000 v4 required')
 closed(p,['run','artifact','jobs','zipBytes'],'v4 raw parent')
 const {run:r,artifact:a,jobs:e,zipBytes}=p
 if(String(r?.id)!==pin.runId||r.run_attempt!==1||r.repository?.full_name!==repository||r.head_repository?.full_name!==repository||r.path!==v4.workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==pin.sourceCommit||r.status!=='completed'||r.conclusion!=='failure'||!utc(r.updated_at)||Date.parse(r.updated_at)>now)fail('exact terminal failed v3 execution required')
 if(String(a?.id)!==pin.artifactId||a.name!==`fussball-season-${pin.runId}`||a.digest!==pin.artifactDigest||a.size_in_bytes!==pin.artifactSize||typeof a.expired!=='boolean'||String(a.workflow_run?.id)!==pin.runId||a.workflow_run?.head_sha!==pin.sourceCommit||a.workflow_run?.head_branch!=='main'||!Buffer.isBuffer(zipBytes)||zipBytes.length!==pin.artifactSize||`sha256:${sha256(zipBytes)}`!==pin.artifactDigest)fail('exact v4 parent artifact bytes/identity required')
 closed(e,['total_count','jobs'],'v4 jobs')
 if(e.total_count!==3||e.jobs?.length!==3||new Set(e.jobs.map(j=>j.id)).size!==3||e.jobs.some(j=>String(j.run_id)!==pin.runId||j.run_attempt!==1||j.head_sha!==pin.sourceCommit||j.status!=='completed'))fail('complete v4 jobs required')
 for(const [name,id,conclusion]of[['capture','122572856276','failure'],['archive','122576519792','skipped'],['handoff','122576520456','skipped']]){
  const rows=e.jobs.filter(j=>j.name===name),j=rows[0]
  if(rows.length!==1||String(j.id)!==id||j.conclusion!==conclusion||!Array.isArray(j.steps)||name!=='capture'&&j.steps.length)fail('v4 exact stage identity/state required')
 }
 const job=e.jobs.find(j=>j.name==='capture')
 for(const [name,conclusion]of[
  ['Validate exact reviewed completion scope and total5000 budget','success'],['Offline source and evidence checks','success'],['Authenticate only the exact reviewed source artifacts for the selected preset','success'],['Share host pacing with older nightly and bulk readers','success'],['Capture fresh rounds and missing originals without database credentials','failure'],['Independently replay only retained original documents','skipped'],['Authorize archive only from complete replayed current originals','skipped'],['Preserve source originals, checkpoint provenance and request journal','success'],
 ]){const rows=job.steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!==conclusion)fail('v4 source/replay/upload state differs')}
 const files=unpackVerifiedArchive(zipBytes,pin.artifactDigest,'fussball-v4'),used=new Set(['manifest.json','attempts.jsonl','progress.jsonl'])
 for(const [file,key]of[['manifest.json','manifestSha256'],['attempts.jsonl','attemptsSha256'],['progress.jsonl','progressSha256']])if(sha256(files.get(file))!==pin[key])fail('v4 exact manifest/journal/progress hashes required')
 const m=parse(files.get('manifest.json'),'v4 manifest')
 closed(m,['version','provider','createdAt','completedAt','options','codeSha256','success','error','snapshot','documents','resultSha256','activationEligible','checkpoint'],'v4 manifest')
 if(m.version!==4||m.provider!=='fussball'||m.success!==false||m.error!=='fetch failed'||m.resultSha256!==null||m.activationEligible!==false||m.createdAt!==pin.createdAt||m.completedAt!==pin.completedAt||m.codeSha256!==pin.codeSha256||!same(m.options,pin.options)||Date.parse(m.completedAt)>now)fail('exact v3 partial manifest required')
 const expectedFiles=checkpointV4EmbeddedPaths()
 closed(m.checkpoint,['version','proof','parentFiles'],'v4 embedded checkpoint')
 if(m.checkpoint.version!==3||!same(m.checkpoint.parentFiles,expectedFiles))fail('exact v3 embedded stage paths required')
 const parents=expectedFiles.map(f=>{used.add(f.metadataFile);used.add(f.zipFile);const meta=parse(files.get(f.metadataFile),'v4 embedded metadata');closed(meta,['run','artifact','jobs'],'v4 embedded metadata');return{...meta,zipBytes:files.get(f.zipFile)}})
 const oldProof=readFussballTransportSuccessor({current:parents[0],archive:parents[1],now}),oldHistory=exportFussballSuccessorAccountedHistory(oldProof)
 if(!same(m.checkpoint.proof,oldProof)||oldProof.priorRequests+94!==1517)fail('v4 embedded proof/spent ledger differs')
 const s=m.snapshot;closed(s,['requests','attempts','stopped','stopReason'],'v4 snapshot')
 if(s.requests!==94||s.attempts?.length!==94||s.stopped!==true||s.stopReason!=='fetch failed'||m.documents?.length!==303||!same(s.attempts.at(-1),pin.terminal))fail('all94 spent attempts and303 bodies required')
 const journal=lines(files.get('attempts.jsonl'),'v4 intents');lines(files.get('progress.jsonl'),'v4 progress')
 if(journal.length!==94)fail('all94 intents required')
 for(const [i,attempt]of s.attempts.entries()){
  closed(attempt,['number','url','kind','startedAt','status','error',...(i<93?['httpStatus']:[])],'v4 attempt')
  const j=journal[i];closed(j,['number','url','kind','startedAt','status','error'],'v4 intent')
  if(attempt.number!==i+1||!utc(attempt.startedAt)||Date.parse(attempt.startedAt)<Date.parse(m.createdAt)||Date.parse(attempt.startedAt)>Date.parse(m.completedAt)||i&&Date.parse(attempt.startedAt)-Date.parse(s.attempts[i-1].startedAt)<6000||j.number!==attempt.number||j.url!==attempt.url||j.kind!==attempt.kind||j.startedAt!==null||j.status!=='pending'||j.error!==null||i<93&&(attempt.status!=='success'||attempt.error!==null||attempt.httpStatus!==200))fail('v4 ordered paced success/failure journals differ')
 }
 const old=new Map(getFussballCheckpointDocuments(oldProof).map(d=>[d.url,d])),selected=new Map(old),urls=new Set(),conflicts=new Map(v4.conflicts.map(c=>[c.url,c])),seen=new Set();let network=0,cached=0,rounds=0
 for(const d of m.documents){
  closed(d,['url','kind','bytes','sha256','status','contentType','capturedAt','file','origin','originalReceipt'],'v4 document')
  const ext=d.kind==='font'?'woff':d.kind==='css'?'css':'html',bytes=files.get(d.file),{origin,originalReceipt,...descriptor}=d
  if(urls.has(d.url)||!['round','report','lineup','css','font'].includes(d.kind)||d.status!==200||!utc(d.capturedAt)||d.file!==`documents/${d.sha256}.${ext}`||!bytes||bytes.length!==d.bytes||sha256(bytes)!==d.sha256)fail('v4 unique original body/path/hash differs')
  urls.add(d.url);used.add(d.file)
  if(origin==='cache'){
   const prior=old.get(d.url);if(!prior||d.kind==='round')fail('v4 cached original absent from v3')
   const {bytes:priorBytes,originalReceipt:priorReceipt,...priorDescriptor}=prior
   if(!same(descriptor,{...priorDescriptor,bytes:priorBytes.length})||!same(originalReceipt,priorReceipt)||!bytes.equals(priorBytes))fail('v4 cached original/receipt differs')
   cached++;continue
  }
  if(origin!=='network')fail('v4 document origin differs')
  const attempt=s.attempts[network++]
  if(attempt.status!=='success'||attempt.url!==d.url||attempt.kind!==d.kind||attempt.startedAt!==d.capturedAt||!same(originalReceipt,{version:1,document:receiptDocument(d),attempt,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}))fail('v4 network body/flat receipt differs')
  if(d.kind==='round'){
   if(fussballRoundScope(d.url)?.staffel!==v4.scope.staffel||d.contentType.split(';')[0].trim().toLowerCase()!=='text/html'||/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(bytes.toString('utf8')))fail('v4 fresh round identity/MIME/challenge differs')
   rounds++;continue
  }
  const prior=old.get(d.url)
  if(prior){const conflict=conflicts.get(d.url);if(!conflict||conflict.kind!==d.kind||conflict.oldSha256!==prior.sha256||conflict.newSha256!==d.sha256||prior.bytes.equals(bytes))fail('v4 unknown revision conflict');seen.add(d.url)}
  selected.set(d.url,{...structuredClone(descriptor),bytes:Buffer.from(bytes),originalReceipt:structuredClone(originalReceipt)})
 }
 if(network!==93||cached!==210||rounds!==30||seen.size!==6||conflicts.size!==6||files.size!==used.size||[...files.keys()].some(f=>!used.has(f)))fail('exact v4 body/request/conflict/member partition required')
 const documents=[...selected.values()].sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0),documentsSha256=sha256(JSON.stringify(documents.map(({bytes,...d})=>({...d,bytes:bytes.length}))))
 if(documents.length!==691||v4.documentsCount!==691||documentsSha256!==v4.documentsSha256)fail('fixed691 latest v4 candidates required')
 createFussballCaptureClient({maxRequests:1,cachedDocuments:documents,fetchFn:()=>fail('v4 reader has no network')})
 const proof=freeze({preset:v4.preset,scope:structuredClone(v4.scope),priorRequests:1517,totalRequestCap:5000,parents:[structuredClone(pin)],documentsSha256,documentsCount:691})
 proofs.set(proof,{documents,parents:[copyParent(p)],accounted:{...oldHistory,partial:copyParent(p)}});return proof
}
function checkpointV4EmbeddedPaths(){return ['current','archive'].map(stage=>({runId:'40577717778',metadataFile:`checkpoint/parents/40577717778-${stage}.json`,zipFile:`checkpoint/parents/40577717778-${stage}.zip`}))}

// Fixed accounting successor to consumed V4. Capture schema5/checkpoint4 and
// its bounded retry policy stay unchanged; only the authenticated history moves.
let v5Registry
function reviewedV5(){return v5Registry??=freeze(JSON.parse(readFileSync(new URL('./policies/fussball-transport-v5.json',import.meta.url),'utf8')))}
export function reviewedFussballV5Parent(){return freeze(structuredClone(reviewedV5().parent))}
export function exportFussballV5AccountedHistory(proof){
 const state=requireProof(proof)
 if(proof.preset!=='baden-reviewed-transports-v5'||!state.accounted)fail('reader-issued v5 history required')
 return Object.fromEntries(Object.entries(state.accounted).map(([name,p])=>[name,copyParent(p)]))
}
export function readFussballTransportV5(input){
 closed(input,['parent',...(Object.hasOwn(input??{},'now')?['now']:[])],'v5 input')
 const v5=reviewedV5(),now=Object.hasOwn(input,'now')?input.now:Date.now(),p=input.parent,pin=v5.parent
 if(!Number.isFinite(now)||v5.preset!=='baden-reviewed-transports-v5'||v5.priorRequests!==1568||v5.totalRequestCap!==5000||v5.documentsCount!==725||pin.requests!==51||pin.documentsCount!==72||!same(v5.scope,registry.scope))fail('fixed1568/5000 v5 required')
 closed(p,['run','artifact','jobs','zipBytes'],'v5 raw parent')
 const {run:r,artifact:a,jobs:e,zipBytes}=p
 if(String(r?.id)!==pin.runId||r.run_attempt!==1||r.repository?.full_name!==repository||r.head_repository?.full_name!==repository||r.path!==v5.workflow||r.event!=='workflow_dispatch'||r.head_branch!=='main'||r.head_sha!==pin.sourceCommit||r.status!=='completed'||r.conclusion!=='failure'||!utc(r.updated_at)||Date.parse(r.updated_at)>now)fail('exact terminal failed v4 execution required')
 if(String(a?.id)!==pin.artifactId||a.name!==`fussball-season-${pin.runId}`||a.digest!==pin.artifactDigest||a.size_in_bytes!==pin.artifactSize||typeof a.expired!=='boolean'||String(a.workflow_run?.id)!==pin.runId||a.workflow_run?.head_sha!==pin.sourceCommit||a.workflow_run?.head_branch!=='main'||!Buffer.isBuffer(zipBytes)||zipBytes.length!==pin.artifactSize||`sha256:${sha256(zipBytes)}`!==pin.artifactDigest)fail('exact v5 parent artifact bytes/identity required')
 closed(e,['total_count','jobs'],'v5 jobs')
 if(e.total_count!==3||!Array.isArray(e.jobs)||e.jobs.length!==3||new Set(e.jobs.map(j=>j.id)).size!==3||e.jobs.some(j=>String(j.run_id)!==pin.runId||j.run_attempt!==1||j.head_sha!==pin.sourceCommit||j.status!=='completed'))fail('complete v5 jobs required')
 for(const [name,id,conclusion]of[['capture',pin.jobId,'failure'],['archive',pin.archiveJobId,'skipped'],['handoff',pin.handoffJobId,'skipped']]){
  const rows=e.jobs.filter(j=>j.name===name),j=rows[0]
  if(rows.length!==1||String(j.id)!==id||j.conclusion!==conclusion||!Array.isArray(j.steps)||name!=='capture'&&j.steps.length)fail('v5 exact stage identity/state required')
 }
 const job=e.jobs.find(j=>j.name==='capture')
 for(const [name,conclusion]of[
  ['Validate exact reviewed completion scope and total5000 budget','success'],['Offline source and evidence checks','success'],['Authenticate only the exact reviewed source artifacts for the selected preset','success'],['Share host pacing with older nightly and bulk readers','success'],['Capture fresh rounds and missing originals without database credentials','failure'],['Independently replay only retained original documents','skipped'],['Authorize archive only from complete replayed current originals','skipped'],['Preserve source originals, checkpoint provenance and request journal','success'],
 ]){const rows=job.steps.filter(s=>s.name===name);if(rows.length!==1||rows[0].status!=='completed'||rows[0].conclusion!==conclusion)fail('v5 source/replay/upload state differs')}
 const files=unpackVerifiedArchive(zipBytes,pin.artifactDigest,'fussball-v5'),used=new Set(['manifest.json','attempts.jsonl','progress.jsonl','outcomes.jsonl'])
 for(const [file,key]of[['manifest.json','manifestSha256'],['attempts.jsonl','attemptsSha256'],['progress.jsonl','progressSha256'],['outcomes.jsonl','outcomesSha256']])if(!files.has(file)||sha256(files.get(file))!==pin[key])fail('v5 exact manifest/intent/progress/outcome hashes required')
 const m=parse(files.get('manifest.json'),'v5 manifest')
 closed(m,['version','provider','createdAt','completedAt','options','codeSha256','success','error','snapshot','documents','resultSha256','activationEligible','checkpoint','retryPolicy','outcomesSha256'],'v5 manifest')
 if(m.version!==5||m.provider!=='fussball'||m.success!==false||m.error!=='fetch failed'||m.resultSha256!==null||m.activationEligible!==false||m.retryPolicy!=='baden-v4-transient-v1'||m.outcomesSha256!==pin.outcomesSha256||m.createdAt!==pin.createdAt||m.completedAt!==pin.completedAt||!utc(m.createdAt)||!utc(m.completedAt)||Date.parse(m.createdAt)>Date.parse(m.completedAt)||Date.parse(m.completedAt)>now||m.codeSha256!==pin.codeSha256||!same(m.options,pin.options))fail('exact failed schema5 v4 manifest required')
 const path={runId:'40614233934',metadataFile:'checkpoint/parents/40614233934.json',zipFile:'checkpoint/parents/40614233934.zip'}
 closed(m.checkpoint,['version','proof','parentFiles'],'v5 embedded checkpoint')
 if(m.checkpoint.version!==4||!same(m.checkpoint.parentFiles,[path])||!files.has(path.metadataFile)||!files.has(path.zipFile))fail('exact embedded v4 parent required')
 used.add(path.metadataFile);used.add(path.zipFile)
 const metadata=parse(files.get(path.metadataFile),'v5 embedded metadata');closed(metadata,['run','artifact','jobs'],'v5 embedded metadata')
 const oldProof=readFussballTransportV4({parent:{...metadata,zipBytes:files.get(path.zipFile)},now}),oldHistory=exportFussballV4AccountedHistory(oldProof)
 if(!same(m.checkpoint.proof,oldProof)||oldProof.priorRequests+pin.requests!==1568)fail('v5 embedded proof/spent ledger differs')
 const s=m.snapshot;closed(s,['requests','attempts','stopped','stopReason'],'v5 snapshot')
 if(s.requests!==51||!Array.isArray(s.attempts)||s.attempts.length!==51||s.stopped!==true||s.stopReason!=='fetch failed'||!Array.isArray(m.documents)||m.documents.length!==72||!same(s.attempts.at(-1),pin.terminal))fail('all51 spent attempts and72 originals required')
 const journal=lines(files.get('attempts.jsonl'),'v5 intents'),outcomes=lines(files.get('outcomes.jsonl'),'v5 outcomes');lines(files.get('progress.jsonl'),'v5 progress')
 if(journal.length!==51||!same(outcomes,s.attempts))fail('all51 original intents and durable outcomes required')
 for(const [i,attempt]of s.attempts.entries()){
  closed(attempt,['number','url','kind','startedAt','status','error',...(i<50?['httpStatus']:[])],'v5 attempt')
  const j=journal[i];closed(j,['number','url','kind','startedAt','status','error'],'v5 intent')
  if(attempt.number!==i+1||!utc(attempt.startedAt)||Date.parse(attempt.startedAt)<Date.parse(m.createdAt)||Date.parse(attempt.startedAt)>Date.parse(m.completedAt)||i&&Date.parse(attempt.startedAt)-Date.parse(s.attempts[i-1].startedAt)<6000||j.number!==attempt.number||j.url!==attempt.url||j.kind!==attempt.kind||j.startedAt!==null||j.status!=='pending'||j.error!==null||i<50&&(attempt.status!=='success'||attempt.error!==null||attempt.httpStatus!==200))fail('v5 ordered paced success/failure journals differ')
 }
 const old=new Map(getFussballCheckpointDocuments(oldProof).map(d=>[d.url,d])),selected=new Map(old),urls=new Set();let network=0,cached=0,rounds=0
 for(const d of m.documents){
  closed(d,['url','kind','bytes','sha256','status','contentType','capturedAt','file','origin','originalReceipt'],'v5 document')
  const ext=d.kind==='font'?'woff':d.kind==='css'?'css':'html',bytes=files.get(d.file),{origin,originalReceipt,...descriptor}=d
  if(urls.has(d.url)||!['round','report','lineup','css','font'].includes(d.kind)||d.status!==200||!utc(d.capturedAt)||d.file!==`documents/${d.sha256}.${ext}`||!bytes||bytes.length!==d.bytes||sha256(bytes)!==d.sha256)fail('v5 unique original body/path/hash differs')
  urls.add(d.url);used.add(d.file)
  if(origin==='cache'){
   const prior=old.get(d.url);if(!prior||d.kind==='round')fail('v5 cached original absent from v4')
   const {bytes:priorBytes,originalReceipt:priorReceipt,...priorDescriptor}=prior
   if(!same(descriptor,{...priorDescriptor,bytes:priorBytes.length})||!same(originalReceipt,priorReceipt)||!bytes.equals(priorBytes))fail('v5 cached original/receipt differs')
   cached++;continue
  }
  if(origin!=='network')fail('v5 document origin differs')
  const attempt=s.attempts[network++]
  if(!attempt||attempt.status!=='success'||attempt.url!==d.url||attempt.kind!==d.kind||attempt.startedAt!==d.capturedAt||!same(originalReceipt,{version:1,document:receiptDocument(d),attempt,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}))fail('v5 network body/flat receipt differs')
  if(d.kind==='round'){
   if(fussballRoundScope(d.url)?.staffel!==v5.scope.staffel||d.contentType.split(';')[0].trim().toLowerCase()!=='text/html'||/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(bytes.toString('utf8')))fail('v5 fresh round identity/MIME/challenge differs')
   rounds++;continue
  }
  // This exact consumed run added34 new URLs and revised none. Any overlap,
  // even identical bytes with a different receipt, needs a separately reviewed pin.
  if(old.has(d.url))fail('v5 unreviewed revision/overlap')
  selected.set(d.url,{...structuredClone(descriptor),bytes:Buffer.from(bytes),originalReceipt:structuredClone(originalReceipt)})
 }
 if(network!==50||cached!==22||rounds!==16||files.size!==used.size||[...files.keys()].some(f=>!used.has(f)))fail('exact v5 body/request/cache/member partition required')
 const documents=[...selected.values()].sort((a,b)=>a.url<b.url?-1:a.url>b.url?1:0),documentsSha256=sha256(JSON.stringify(documents.map(({bytes,...d})=>({...d,bytes:bytes.length}))))
 if(documents.length!==725||documentsSha256!==v5.documentsSha256)fail('fixed725 latest v5 candidates required')
 createFussballCaptureClient({maxRequests:1,cachedDocuments:documents,fetchFn:()=>fail('v5 reader has no network')})
 const proof=freeze({preset:v5.preset,scope:structuredClone(v5.scope),priorRequests:1568,totalRequestCap:5000,parents:[structuredClone(pin)],documentsSha256,documentsCount:725})
 proofs.set(proof,{documents,parents:[copyParent(p)],accounted:{...oldHistory,latest:copyParent(p)}});return proof
}
