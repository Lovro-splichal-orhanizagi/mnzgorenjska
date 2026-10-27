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
