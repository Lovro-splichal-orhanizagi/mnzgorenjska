// Germany bulk packs: full original-byte collection of an explicitly reviewed
// current + immediately previous season. No registration/activation or DB calls.
// Production catalog changes require reviewed policy JSON + retained HTML proof.
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,lstatSync,readdirSync,existsSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createFussballCaptureClient,fussballRoundScope} from './lib/fussball-capture.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {buildFussballImportBatch,parseFussballLeagueCode} from './fussball-import.mjs'
import {zaprtje} from './odtis-kode.mjs'

const ROOT=fileURLToPath(new URL('../',import.meta.url))
const POLICY='scripts/policies/de-bulk-candidates.json'
const policy=JSON.parse(readFileSync(resolve(ROOT,POLICY),'utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex')
const json=v=>JSON.stringify(v)+'\n'
const canonical=v=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))]))):v)
const equal=(a,b)=>canonical(a)===canonical(b)
const deepFreeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v)}return v}
export const GERMANY_BULK_CANDIDATES=deepFreeze(policy.candidates)
const failure=(message,reason_code='GERMANY_PACK_INVALID',sourceStop=false)=>Object.assign(new Error(`Germany bulk: ${message}`),{reason_code,...(sourceStop?{sourceStop:true}:{dataHold:true})})
const proof=(ok,message,code)=>{if(!ok)throw failure(message,code)}
const milliseconds=now=>{const value=typeof now==='function'?now():now??Date.now(),n=value instanceof Date?value.getTime():value;proof(Number.isFinite(n),'invalid clock');return n}
const iso=n=>new Date(n).toISOString()
const extension=k=>k==='font'?'woff':k==='css'?'css':'html'
const digest=documents=>hash(canonical(documents.map(d=>({url:d.url,kind:d.kind,sha256:d.sha256,bytes:d.bytes}))))

function tuple(code,season,seedUrl){
 let parsed
 try{parsed=parseFussballLeagueCode(code)}catch(e){throw failure(e.message,'GERMANY_CATALOG_INVALID')}
 const scope=fussballRoundScope(seedUrl)
 proof(parsed.season===season&&scope?.staffel===parsed.staffel&&scope.round===null&&scope.date===null,'catalog tuple/seed scope differs','GERMANY_CATALOG_INVALID')
 return {code,season,seedUrl,staffel:parsed.staffel}
}
function checkPolicyEvidence(candidate){
 for(const t of [tuple(candidate.source_league_code,candidate.season,candidate.seedUrl),...candidate.archives.map(a=>tuple(a.code,a.season,a.seedUrl))]){
  const e=policy.evidence.filter(e=>e.code===t.code)
  proof(e.length===1&&/^scripts\/vzorci\/[a-zA-Z0-9_.-]+\.html$/.test(e[0].file),'catalog source evidence missing','GERMANY_CATALOG_INVALID')
  const raw=readFileSync(resolve(ROOT,e[0].file)),year=Number(t.season.slice(0,4))
  proof(hash(raw)===e[0].sha256&&raw.toString().includes(`rel="canonical" href="${t.seedUrl}"`)&&raw.toString().includes(`${year}/${year+1}`),'catalog original evidence differs','GERMANY_CATALOG_INVALID')
 }
}
/** Catalog argument is an explicit offline-test seam, never a CLI override. */
export function validateGermanyCandidate(candidate,{catalog=GERMANY_BULK_CANDIDATES}={}){
 proof(candidate&&candidate.source==='fussball-public'&&candidate.host==='www.fussball.de'&&candidate.country_code==='DE'&&/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.slug??''),'invalid candidate identity','GERMANY_CATALOG_INVALID')
 proof(Array.isArray(candidate.archives)&&candidate.archives.length<=1,'one previous archive required','GERMANY_CATALOG_INVALID')
 const current=tuple(candidate.source_league_code,candidate.season,candidate.seedUrl)
 if(candidate.archives.length){const a=candidate.archives[0];tuple(a.code,a.season,a.seedUrl);proof(Number(a.season.slice(0,4))===Number(current.season.slice(0,4))-1,'archive must be the immediately previous season','GERMANY_CATALOG_INVALID')}
 proof(Array.isArray(catalog)&&catalog.filter(c=>equal(c,candidate)).length===1,'candidate differs from reviewed catalog','GERMANY_CATALOG_INVALID')
 if(catalog===GERMANY_BULK_CANDIDATES)checkPolicyEvidence(candidate)
 return structuredClone(candidate)
}
function paired(candidate,dependencies){
 const c=validateGermanyCandidate(candidate,dependencies)
 proof(c.archives.length===1,'observed previous archive pairing missing','GERMANY_ARCHIVE_MISSING')
 return c
}
function tuples(c){return [tuple(c.source_league_code,c.season,c.seedUrl),...c.archives.map(a=>tuple(a.code,a.season,a.seedUrl))]}
function codeHash(){
 const files=[...new Set([...zaprtje('scripts/bulk-germany-source.mjs',p=>readFileSync(resolve(ROOT,p),'utf8'),p=>existsSync(resolve(ROOT,p))),POLICY,'scripts/viri/fussball-datumski-glifi.json'])].sort()
 return hash(files.map(f=>`${f}\0${hash(readFileSync(resolve(ROOT,f)))}`).join('\n'))
}
function normalize(raw,t){
 try{const b=buildFussballImportBatch(raw,t);return {code:t.code,season:t.season,schedule:b.schedule,reports:b.reports,identities:b.identities}}
 catch(e){throw failure(`incomplete ${t.code}: ${e.message}`,'GERMANY_SEASON_INCOMPLETE')}
}
function readRegular(directory,file){
 proof(typeof file==='string'&&!file.startsWith('/')&&!file.split('/').includes('..'),'unsafe evidence path')
 const base=resolve(directory),full=resolve(base,file)
 proof(relative(base,full)!==''&&!relative(base,full).startsWith('..'),'unsafe evidence path')
 for(const path of [base,...file.split('/').slice(0,-1).map((_,i,a)=>join(base,...a.slice(0,i+1)))]){
  const s=lstatSync(path);proof(s.isDirectory()&&!s.isSymbolicLink(),'symbolic evidence directory')
 }
 const stat=lstatSync(full);proof(stat.isFile()&&!stat.isSymbolicLink(),'evidence must be regular file')
 return readFileSync(full)
}
function filesUnder(directory,prefix=''){
 return readdirSync(join(directory,prefix),{withFileTypes:true}).flatMap(e=>{
  proof(!e.isSymbolicLink(),'symbolic evidence path')
  const file=prefix?`${prefix}/${e.name}`:e.name
  return e.isDirectory()?filesUnder(directory,file):[file]
 })
}

/**
 * The injected fetch is mandatory and must be the caller's shared host-metered
 * request function. A single source client adds six-second serialization/cache
 * across both seasons. No sampling, redirects, retries or network fallback.
 * Test-only third argument permits explicit catalog/collector/virtual sleep.
 */
export async function captureGermanyCandidate(candidate,{directory,maxRequests,now=Date.now,fetch:request}={},dependencies={}){
 const c=paired(candidate,dependencies)
 proof(typeof request==='function','shared metered fetch function required')
 proof(Number.isInteger(maxRequests)&&maxRequests>=1&&maxRequests<=4000,'request budget must be 1..4000')
 proof(typeof directory==='string'&&directory,'new evidence directory required')
 const wallStart=Date.now(),startClock=milliseconds(now)
 const nowFn=typeof now==='function'?now:()=>startClock+Date.now()-wallStart,started=milliseconds(nowFn)
 const m={version:1,provider:'germany-bulk-fussball',candidate:c,captured_at:iso(started),completed_at:null,max_requests:maxRequests,code_sha256:codeHash(),documents:[],results:[],snapshot:null,complete:false,error:null,original_bytes_sha256:null}
 mkdirSync(directory);mkdirSync(join(directory,'documents'));mkdirSync(join(directory,'seasons'));writeFileSync(join(directory,'attempts.jsonl'),'')
 const client=createFussballCaptureClient({maxRequests,fetchFn:request,now:nowFn,...(dependencies.sleep?{sleep:dependencies.sleep}:{}),
  onAttempt:a=>appendFileSync(join(directory,'attempts.jsonl'),json(a)),
  onDocument:d=>{
   const file=`documents/${d.sha256}.${extension(d.kind)}`
   writeFileSync(join(directory,file),d.bytes)
   m.documents.push({...d,bytes:d.bytes.length,file})
  }})
 let error=null
 try{
  for(const [index,t] of tuples(c).entries()){
   const raw=await (dependencies.collectSeason??collectFussballSeason)({...t,client,reportLimit:null,asOfDate:m.captured_at.slice(0,10)})
   const bytes=json(raw),file=`seasons/${index}.json`
   writeFileSync(join(directory,file),bytes);m.results.push({code:t.code,file,sha256:hash(bytes)})
   normalize(raw,t)
  }
  m.complete=true
 }catch(e){error=client.snapshot().stopped?failure(e.message,'GERMANY_SOURCE_STOP',true):e.dataHold?e:failure(e.message,'GERMANY_SEASON_INCOMPLETE')}
 m.snapshot=client.snapshot();m.completed_at=iso(milliseconds(nowFn));m.original_bytes_sha256=digest(m.documents)
 m.error=error?{reason_code:error.reason_code,message:error.message,sourceStop:!!error.sourceStop,dataHold:!!error.dataHold}:null
 writeFileSync(join(directory,'manifest.json'),json(m))
 if(error)throw error
 return loadGermanyPack(directory,{candidate:c,now:nowFn},dependencies)
}

/** Closed original-byte replay. Parsed JSON is diagnostic, never authority. */
export async function loadGermanyPack(directory,{candidate,now=Date.now,requireFresh=true}={},dependencies={}){
 try{
  const c=paired(candidate,dependencies),m=JSON.parse(readRegular(directory,'manifest.json'))
  proof(m.version===1&&m.provider==='germany-bulk-fussball'&&m.complete===true&&m.error===null,'capture incomplete')
  proof(equal(c,m.candidate),'capture candidate scope differs')
  proof(m.code_sha256===codeHash(),'capture code fingerprint differs')
  const at=Date.parse(m.captured_at),end=Date.parse(m.completed_at),time=milliseconds(now)
  proof(Number.isFinite(at)&&Number.isFinite(end)&&iso(at)===m.captured_at&&iso(end)===m.completed_at&&at<=end&&end<=time&&(!requireFresh||time-at<=24*3600_000),'stale or future capture timestamps')
  proof(Number.isInteger(m.max_requests)&&m.max_requests>=1&&m.max_requests<=4000,'invalid request budget')
  const s=m.snapshot,docs=m.documents,ts=tuples(c)
  proof(s?.stopped===false&&s.stopReason===null&&Number.isInteger(s.requests)&&s.requests>0&&s.requests<=m.max_requests&&Array.isArray(s.attempts)&&s.attempts.length===s.requests&&Array.isArray(docs)&&docs.length===s.requests,'request accounting differs')
  proof(Array.isArray(m.results)&&m.results.length===ts.length,'season results missing')
  const intents=readRegular(directory,'attempts.jsonl').toString().trim().split('\n').map(l=>JSON.parse(l))
  proof(intents.length===s.requests,'request journal differs')
  const byUrl=new Map(),allowed=['manifest.json','attempts.jsonl']
  for(let i=0;i<docs.length;i++){
   const d=docs[i],a=s.attempts[i],intent=intents[i],captured=Date.parse(d.capturedAt)
   proof(typeof d.url==='string'&&!byUrl.has(d.url)&&['round','report','lineup','css','font'].includes(d.kind)&&d.status===200&&typeof d.contentType==='string','invalid or duplicate source document')
   proof(d.file===`documents/${d.sha256}.${extension(d.kind)}`&&/^[a-f0-9]{64}$/.test(d.sha256)&&Number.isInteger(d.bytes)&&d.bytes>0,'invalid document receipt')
   proof(a.number===i+1&&a.url===d.url&&a.kind===d.kind&&a.status==='success'&&a.error===null&&a.httpStatus===200&&a.startedAt===d.capturedAt&&captured>=at&&captured<=end&&(i===0||captured-Date.parse(docs[i-1].capturedAt)>=6000),'request chronology/accounting differs')
   proof(equal(intent,{number:i+1,url:d.url,kind:d.kind,startedAt:null,status:'pending',error:null}),'pre-request journal differs')
   const bytes=readRegular(directory,d.file)
   proof(bytes.length===d.bytes&&hash(bytes)===d.sha256,'original bytes hash differs')
   byUrl.set(d.url,{...d,bytes});allowed.push(d.file)
  }
  proof(m.original_bytes_sha256===digest(docs),'original bytes digest differs')
  let index=0
  const replay=createFussballCaptureClient({maxRequests:m.max_requests,now:()=>Date.parse(docs[Math.min(index,docs.length-1)].capturedAt),sleep:async()=>{},fetchFn:async url=>{
   const d=docs[index++];proof(d?.url===url&&byUrl.has(url),'unexpected original document or replay request order')
   return new Response(byUrl.get(url).bytes,{headers:{'content-type':d.contentType}})
  }})
  const seasons=[]
  for(const [i,t] of ts.entries()){
   const r=m.results[i];proof(r.code===t.code&&r.file===`seasons/${i}.json`,'season result scope differs')
   const original=readRegular(directory,r.file);allowed.push(r.file)
   proof(hash(original)===r.sha256,'season result hash differs')
   const raw=await (dependencies.collectSeason??collectFussballSeason)({...t,client:replay,reportLimit:null,asOfDate:m.captured_at.slice(0,10)})
   proof(json(raw)===original.toString(),'original-byte replay result differs')
   seasons.push(normalize(raw,t))
  }
  proof(index===docs.length&&equal(replay.snapshot(),s),'unused documents or replay accounting differs')
  proof(equal([...new Set(allowed)].sort(),filesUnder(directory).sort()),'unexpected unlisted evidence files')
  return {version:1,candidate:c,seasons,captured_at:m.captured_at,original_bytes_sha256:m.original_bytes_sha256}
 }catch(e){if(e.dataHold)throw e;throw failure(e.message)}
}
