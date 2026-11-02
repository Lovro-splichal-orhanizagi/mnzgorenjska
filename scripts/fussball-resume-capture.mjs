// Path B resume: a current-only capture that reuses originals retained by earlier
// captures of the same full scope (a transport error mid-season, or a complete
// capture the import can no longer admit), instead of reading them again. Only exact successful network reads (HTTP 200, the
// journaled attempt, unchanged bytes) from the last 24 hours enter; schedules are
// always read fresh. The output is an ordinary mixed (v2) capture with flat
// original receipts, so `verifyFussballDirectory` and the import replay it
// unchanged. This file stays outside the reviewed capture code closure on purpose.
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,appendFileSync,readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {validateFussballCaptureOptions,fussballCaptureCodeSha256} from './fussball-capture-evidence.mjs'

const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const json=value=>JSON.stringify(value)+'\n'
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball resume: ${reason}`)}
const extension=kind=>kind==='font'?'woff':kind==='css'?'css':'html'
const receiptDocument=d=>Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]]))
const receiptFor=(d,m,attempt)=>({version:1,document:receiptDocument(d),attempt,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}})

function readRegular(directory,path){
 requireProof(typeof path==='string'&&/^[\w.-]+(?:\/[\w.-]+)*$/.test(path)&&!path.split('/').some(p=>p==='.'||p==='..'),'unsafe evidence path')
 const base=realpathSync(directory),full=resolve(base,path)
 requireProof(!relative(base,full).startsWith('..'),'unsafe evidence path')
 const s=lstatSync(full);requireProof(s.isFile()&&!s.isSymbolicLink(),'source must be a regular file')
 return readFileSync(full)
}

function checkReceipt(r,d,config){
 const a=r?.attempt
 requireProof(r?.version===1&&JSON.stringify(r.document)===JSON.stringify(receiptDocument(d))&&r.capture?.staffel===config.staffel&&r.capture.season===config.season&&/^[a-f0-9]{64}$/.test(r.capture.codeSha256??'')&&Number.isFinite(Date.parse(r.capture.createdAt)),'resume original receipt differs')
 requireProof(a&&Object.keys(a).sort().join(',')==='error,httpStatus,kind,number,startedAt,status,url'&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&a.status==='success'&&a.error===null&&a.httpStatus===200&&Number.isInteger(a.number)&&a.number>0,'resume original network request differs')
}

export function fussballPartialCaptureDocuments(directories,config,{now=new Date().getTime()}={}){
 requireProof(Array.isArray(directories)&&directories.length>=1&&directories.length<=8,'one to eight failed captures required')
 const byUrl=new Map()
 for(const directory of directories){
  const m=JSON.parse(readRegular(directory,'manifest.json')),created=Date.parse(m.createdAt)
  // A transport-failed capture, or a complete one whose import was refused only
  // because main has since gained a migration (same originals, fresh schedule).
  const complete=m.success===true&&m.error===null&&/^[a-f0-9]{64}$/.test(m.resultSha256??'')&&m.snapshot?.stopped===false
  requireProof([1,2].includes(m.version)&&m.provider==='fussball'&&m.activationEligible===false&&(complete||m.success===false&&m.resultSha256===null&&m.snapshot?.stopped===true),'resume parent must be an ordinary capture, failed or complete')
  requireProof(['seedUrl','staffel','season'].every(k=>m.options?.[k]===config[k])&&m.options.reportLimit===null&&m.options.cardPolicy===config.cardPolicy,'resume parent scope/full intent differs')
  requireProof(Number.isFinite(created)&&created<=now&&now-created<=24*3600_000,'resume parent is older than 24 hours')
  // Only a transport error (no HTTP response) is resumed; a refusal or challenge stops the source.
  const last=m.snapshot.attempts?.at(-1)
  requireProof(complete||last?.status==='failed'&&!Object.hasOwn(last,'httpStatus')&&!/HTTP|challenge|redirect/i.test(`${m.error} ${last.error}`),'resume only after a transport error, never after a refusal')
  requireProof(Array.isArray(m.documents)&&m.documents.length<=20000&&Array.isArray(m.snapshot.attempts),'bounded resume inventory differs')
  for(const d of m.documents){
   if(d.kind==='round')continue
   const bytes=readRegular(directory,d.file)
   requireProof(d.status===200&&bytes.length===d.bytes&&hash(bytes)===d.sha256,'resume original bytes differ')
   let receipt
   if(m.version===2&&d.origin==='cache')receipt=d.originalReceipt
   else{
    const attempts=m.snapshot.attempts.filter(a=>a.url===d.url&&a.status==='success'&&a.startedAt===d.capturedAt)
    requireProof(attempts.length===1,'resume original needs exactly one journaled successful read')
    receipt=receiptFor(d,m,attempts[0])
   }
   checkReceipt(receipt,d,config)
   if(!byUrl.has(d.url))byUrl.set(d.url,{...receiptDocument(d),bytes,originalReceipt:receipt})
  }
 }
 return [...byUrl.values()]
}

export async function captureFussballResumeDirectory({directory,options,resumeDirectories,fetchFn=globalThis.fetch,collectFn=collectFussballSeason,onProgress=()=>{}}={}){
 const createdAt=new Date().toISOString()
 const config=validateFussballCaptureOptions({...options,asOfDate:options?.asOfDate??createdAt.slice(0,10)}),codeSha256=fussballCaptureCodeSha256()
 requireProof(config.reportLimit===null,'resume requires a full capture')
 const cachedDocuments=fussballPartialCaptureDocuments(resumeDirectories,config)
 const documents=[],urls=new Set()
 mkdirSync(directory);mkdirSync(join(directory,'documents'))
 writeFileSync(join(directory,'attempts.jsonl'),'');writeFileSync(join(directory,'progress.jsonl'),'')
 const saveDocument=(document,origin)=>{
  const bytes=Buffer.from(document.bytes)
  requireProof(hash(bytes)===document.sha256&&document.status===200&&!urls.has(document.url),'invalid or duplicate source document')
  const file=`documents/${document.sha256}.${extension(document.kind)}`
  writeFileSync(join(directory,file),bytes)
  documents.push({...document,bytes:bytes.length,file,origin});urls.add(document.url)
 }
 const client=createFussballCaptureClient({maxRequests:config.maxRequests,fetchFn,cachedDocuments,
  onAttempt:attempt=>appendFileSync(join(directory,'attempts.jsonl'),json(attempt)),
  onDocument:document=>saveDocument(document,'network'),onCachedDocument:document=>saveDocument(document,'cache')})
 let result=null,error=null
 try{result=await collectFn({...config,client,onProgress:async progress=>{appendFileSync(join(directory,'progress.jsonl'),json(progress));await onProgress(progress)}},{})}catch(failure){error=failure}
 const raw=result===null?null:json(result)
 if(raw!==null)writeFileSync(join(directory,'result.json'),raw)
 const manifest={version:2,provider:'fussball',createdAt,completedAt:new Date().toISOString(),options:config,codeSha256,
  success:error===null,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw===null?null:hash(raw),activationEligible:false}
 for(const d of documents)if(d.origin==='network')d.originalReceipt=receiptFor(d,manifest,manifest.snapshot.attempts.find(a=>a.url===d.url&&a.status==='success'&&a.startedAt===d.capturedAt))
 writeFileSync(join(directory,'manifest.json'),json(manifest))
 if(error)throw error
 return manifest
}
