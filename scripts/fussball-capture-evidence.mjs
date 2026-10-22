import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,appendFileSync,readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {zaprtje} from './odtis-kode.mjs'

const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const json=value=>JSON.stringify(value)+'\n'
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball evidence: ${reason}`)}
const extension=kind=>kind==='font'?'woff':kind==='css'?'css':'html'
const root=fileURLToPath(new URL('../',import.meta.url))

export function fussballCaptureCodeSha256(){
 const files=[...new Set([...zaprtje('scripts/fussball-capture-evidence.mjs'),'scripts/zajemi-fussball-sezono.mjs','scripts/viri/fussball-datumski-glifi.json'])].sort()
 return hash(files.map(file=>`${file}\0${hash(readFileSync(resolve(root,file)))}`).join('\n'))
}
export function validateFussballCaptureOptions(options){
 requireProof(options&&/^[A-Z0-9]{32}-G$/.test(options.staffel??''),'invalid staffel')
 const season=options.season?.match(/^(20\d{2})\/(\d{2})$/)
 requireProof(season&&(+season[1]+1)%100===+season[2],'invalid season')
 requireProof(typeof options.seedUrl==='string'&&options.seedUrl.endsWith(`/staffel/${options.staffel}`),'seed scope differs')
 requireProof(Number.isInteger(options.maxRequests)&&options.maxRequests>=1&&options.maxRequests<=4000,'invalid request budget')
 requireProof(options.reportLimit===null||Number.isInteger(options.reportLimit)&&options.reportLimit>=0,'invalid report limit')
 const asOfDate=options.asOfDate??new Date().toISOString().slice(0,10)
 requireProof(typeof asOfDate==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(asOfDate)&&Number.isFinite(Date.parse(asOfDate+'T00:00:00Z'))&&new Date(asOfDate+'T00:00:00Z').toISOString().slice(0,10)===asOfDate,'invalid capture calendar date')
 return {seedUrl:options.seedUrl,staffel:options.staffel,season:options.season,maxRequests:options.maxRequests,reportLimit:options.reportLimit,asOfDate}
}
export async function captureFussballDirectory({directory,options,fetchFn=globalThis.fetch,collectFn=collectFussballSeason,onProgress=()=>{}}){
 const config=validateFussballCaptureOptions(options),codeSha256=fussballCaptureCodeSha256(),createdAt=new Date().toISOString()
 const documents=[],urls=new Set();let client
 // A fresh directory prevents accidentally combining scopes or overwriting evidence.
 mkdirSync(directory);mkdirSync(join(directory,'documents'))
 writeFileSync(join(directory,'attempts.jsonl'),'');writeFileSync(join(directory,'progress.jsonl'),'')
 client=createFussballCaptureClient({maxRequests:config.maxRequests,fetchFn,
  onAttempt:attempt=>appendFileSync(join(directory,'attempts.jsonl'),json(attempt)),
  onDocument:document=>{
   const bytes=Buffer.from(document.bytes)
   requireProof(hash(bytes)===document.sha256&&document.status===200&&!urls.has(document.url),'invalid or duplicate source document')
   const file=`documents/${document.sha256}.${extension(document.kind)}`
   writeFileSync(join(directory,file),bytes)
   documents.push({...document,bytes:bytes.length,file});urls.add(document.url)
  }})
 let result=null,error=null
 try{result=await collectFn({...config,client,onProgress:async progress=>{appendFileSync(join(directory,'progress.jsonl'),json(progress));await onProgress(progress)}})}catch(failure){error=failure}
 const raw=result===null?null:json(result)
 if(raw!==null)writeFileSync(join(directory,'result.json'),raw)
 const manifest={version:1,provider:'fussball',createdAt,completedAt:new Date().toISOString(),options:config,codeSha256,
  success:error===null,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw===null?null:hash(raw),activationEligible:false}
 writeFileSync(join(directory,'manifest.json'),json(manifest))
 if(error)throw error
 return manifest
}
function readRegular(directory,path){
 const base=realpathSync(directory),full=resolve(base,path)
 requireProof(relative(base,full)!==''&&!relative(base,full).startsWith('..')&&!path.startsWith('/'),'unsafe evidence path')
 if(path.startsWith('documents/'))requireProof(lstatSync(join(base,'documents')).isDirectory()&&!lstatSync(join(base,'documents')).isSymbolicLink(),'symbolic documents directory')
 const stat=lstatSync(full);requireProof(stat.isFile()&&!stat.isSymbolicLink(),'source must be a regular file, not a symlink')
 return readFileSync(full)
}
export async function verifyFussballDirectory(directory,{collectFn=collectFussballSeason}={}){
 const m=JSON.parse(readRegular(directory,'manifest.json'))
 requireProof(m.version===1&&m.provider==='fussball'&&m.success===true&&m.activationEligible===false,'incomplete or failed capture')
 requireProof(m.codeSha256===fussballCaptureCodeSha256(),'capture code fingerprint differs')
 const options=validateFussballCaptureOptions(m.options),snapshot=m.snapshot
 requireProof(m.options.asOfDate===options.asOfDate,'capture calendar day is not pinned')
 requireProof(snapshot&&snapshot.stopped===false&&snapshot.stopReason===null&&Number.isInteger(snapshot.requests)&&snapshot.requests>0&&snapshot.requests<=options.maxRequests&&snapshot.attempts?.length===snapshot.requests,'request accounting differs')
 requireProof(Array.isArray(m.documents)&&m.documents.length===snapshot.requests,'document request count differs')
 const journal=readRegular(directory,'attempts.jsonl').toString().trim().split('\n').map(line=>JSON.parse(line))
 requireProof(journal.length===snapshot.requests,'request journal count differs')
 const documents=new Map()
 for(const [index,d]of m.documents.entries()){
  const attempt=snapshot.attempts[index],pending=journal[index]
  requireProof(attempt.number===index+1&&attempt.status==='success'&&attempt.httpStatus===200&&attempt.error===null&&attempt.url===d.url&&attempt.kind===d.kind&&attempt.startedAt===d.capturedAt&&Number.isFinite(Date.parse(d.capturedAt)),'document request status or identity differs')
  requireProof(pending.number===attempt.number&&pending.url===attempt.url&&pending.kind===attempt.kind&&pending.status==='pending','request journal identity differs')
  requireProof(['round','report','lineup','css','font'].includes(d.kind)&&d.status===200&&typeof d.contentType==='string'&&/^[a-f0-9]{64}$/.test(d.sha256)&&d.file===`documents/${d.sha256}.${extension(d.kind)}`&&!documents.has(d.url),'invalid document path, status or identity')
  const bytes=readRegular(directory,d.file)
  requireProof(bytes.length===d.bytes&&hash(bytes)===d.sha256,'document bytes/hash differs')
  documents.set(d.url,{...d,bytes})
 }
 const raw=readRegular(directory,'result.json').toString()
 requireProof(/^[a-f0-9]{64}$/.test(m.resultSha256)&&hash(raw)===m.resultSha256,'result digest differs')
 let clock=Date.parse(m.createdAt);requireProof(Number.isFinite(clock)&&Number.isFinite(Date.parse(m.completedAt))&&Date.parse(m.completedAt)>=clock,'invalid capture dates')
 // The client still enforces exact routes, MIME, caps, deduplication and stops.
 // Its only fetch dependency is this closed document map; no network fallback.
 const replay=createFussballCaptureClient({maxRequests:snapshot.requests,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{
  const d=documents.get(url);requireProof(d,'missing captured source document')
  return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})
 }})
 const result=await collectFn({...options,client:replay,onProgress:()=>{}})
 requireProof(json(result)===raw,'result differs from full offline replay')
 requireProof(replay.snapshot().requests===snapshot.requests,'unused or missing source documents in replay')
 return {verified:true,activationEligible:false,scope:result.scope,coverage:result.coverage,requests:snapshot.requests,resultSha256:m.resultSha256,codeSha256:m.codeSha256}
}
