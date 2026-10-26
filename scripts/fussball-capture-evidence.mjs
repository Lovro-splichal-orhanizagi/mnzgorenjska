import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,appendFileSync,readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {extractFussballSeasonLinks,inspectFussballArchivePage,fussballArchiveSeedAlias} from './fussball-season-links.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
import {zaprtje} from './odtis-kode.mjs'

const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const json=value=>JSON.stringify(value)+'\n'
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball evidence: ${reason}`)}
const extension=kind=>kind==='font'?'woff':kind==='css'?'css':'html'
const root=fileURLToPath(new URL('../',import.meta.url))

export function fussballCaptureCodeSha256(){
 const files=[...new Set([...zaprtje('scripts/fussball-capture-evidence.mjs'),'scripts/zajemi-fussball-sezono.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/vzorci/de-fussball-baden-archive-20261026.json'])].sort()
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
const receiptDocument=d=>Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,d[k]]))
function originalReceipt(d,m){
 if(d.originalReceipt)return d.originalReceipt
 return {version:1,document:receiptDocument(d),attempt:m.snapshot.attempts.find(a=>a.url===d.url),capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:m.options.staffel,season:m.options.season}}
}
function checkOriginalReceipt(d,options){
 const r=d.originalReceipt,a=r?.attempt
 requireProof(r&&Object.keys(r).sort().join(',')==='attempt,capture,document,version'&&r.capture&&Object.keys(r.capture).sort().join(',')==='codeSha256,createdAt,season,staffel'&&a&&Object.keys(a).sort().join(',')==='error,httpStatus,kind,number,startedAt,status,url','cache receipt must remain flat and bounded')
 requireProof(r?.version===1&&json(r.document)===json(receiptDocument(d))&&r.capture?.staffel===options.staffel&&r.capture.season===options.season&&/^[a-f0-9]{64}$/.test(r.capture.codeSha256??'')&&Number.isFinite(Date.parse(r.capture.createdAt)),'cache original receipt differs')
 requireProof(a?.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&a.status==='success'&&a.error===null&&a.httpStatus===200&&Number.isInteger(a.number)&&a.number>0,'cache original network request differs')
}
export async function fussballBulkCacheDocuments(directory,{staffel,season,seedUrl,collectFn=collectFussballSeason,loadPack}={}){
 const m=JSON.parse(readRegular(directory,'manifest.json'))
 const {loadGermanyPack}=await import('./bulk-germany-source.mjs')
 await (loadPack??loadGermanyPack)(directory,{candidate:m.candidate,requireFresh:false})
 requireProof(m.candidate?.source_league_code===`${staffel}:${season}`&&m.candidate.seedUrl===seedUrl,'bulk cache current scope differs')
 const docs=new Map(m.documents.map(d=>[d.url,d])),used=new Set()
 const result=await collectFn({staffel,season,seedUrl,reportLimit:null,asOfDate:m.captured_at.slice(0,10),client:{read:async(url,kind)=>{
  const d=docs.get(url);requireProof(d?.kind===kind,'missing original current bulk document')
  const bytes=readRegular(directory,d.file);requireProof(bytes.length===d.bytes&&hash(bytes)===d.sha256,'bulk original bytes differ')
  used.add(url);return {...d,bytes}
 }}})
 const {buildFussballImportBatch}=await import('./fussball-import.mjs')
 buildFussballImportBatch(result,{staffel,season})
 const source={snapshot:m.snapshot,createdAt:m.captured_at,codeSha256:m.code_sha256,options:{staffel,season}}
 return [...used].map(url=>docs.get(url)).filter(d=>d.kind!=='round').map(d=>({...d,bytes:readRegular(directory,d.file),originalReceipt:originalReceipt(d,source)}))
}
// Parent proof is separate from the archive's source request journal. Its raw
// current seed and flat receipt keep their original hashes and timestamps.
function archiveParentProof(parent,options,bytes,{persisted=false}={}){
 requireProof(parent&&parent.current&&parent.document&&parent.originalReceipt,'archive parent proof required')
 const {current,document}=parent
 const source=Buffer.from(bytes)
 requireProof(document.url===current.seedUrl&&document.kind==='round'&&document.status===200&&source.length===document.bytes&&hash(source)===document.sha256,'archive parent original bytes/hash differ')
 checkOriginalReceipt({...document,originalReceipt:parent.originalReceipt},current)
 const links=extractFussballSeasonLinks(source.toString('utf8'),current)
 const observedSeedUrl=parent.observedSeedUrl??options.seedUrl
 requireProof(links.previous&&links.previous.staffel===options.staffel&&links.previous.season===options.season&&links.previous.seedUrl===observedSeedUrl,'archive parent live adjacent menu differs')
 const alias=fussballArchiveSeedAlias({...options,observedSeedUrl},current)
 const file=`archive-parent/${document.sha256}.html`
 const proof={version:1,current,observedSeedUrl,document:receiptDocument(document),originalReceipt:parent.originalReceipt,alias,file}
 const proofSha256=hash(json(proof))
 if(persisted)requireProof(parent.version===1&&parent.file===file&&json(parent.alias)===json(alias)&&parent.proofSha256===proofSha256,'persisted archive parent proof/alias/path differs')
 return {...proof,proofSha256}
}
function collectWithArchiveParent(collectFn,options,parent){
 return collectFn(options,parent?{inspectPage:(html,scope)=>scope.kind==='round'?inspectFussballArchivePage(html,{archive:options,current:parent.current}):inspectFussballPage(html,scope)}:{})
}
export async function captureFussballDirectory({directory,options,fetchFn=globalThis.fetch,collectFn=collectFussballSeason,onProgress=()=>{},reuseDirectory,reuseBulkDirectory,loadBulkPack,archiveParent}={}){
 const createdAt=new Date().toISOString()
 const config=validateFussballCaptureOptions({...options,asOfDate:options?.asOfDate??createdAt.slice(0,10)}),codeSha256=fussballCaptureCodeSha256()
 let cachedDocuments=[]
 requireProof(!(reuseDirectory&&reuseBulkDirectory),'one verified reuse source required')
 const mixed=!!(reuseDirectory||reuseBulkDirectory)
 requireProof(!(archiveParent&&mixed),'archive parent cannot mix cached captures')
 const parent=archiveParent?archiveParentProof(archiveParent,config,archiveParent.bytes):null
 if(reuseDirectory){
  // A code update may reparse old original bytes for CACHE ADMISSION only. The
  // new capture/import still requires today's exact code fingerprint and full
  // native proof; damaged/obsolete cache never falls back to a source reread.
  await verifyFussballDirectory(reuseDirectory,{collectFn,requireCodeMatch:false})
  const prior=JSON.parse(readRegular(reuseDirectory,'manifest.json')),raw=JSON.parse(readRegular(reuseDirectory,'result.json'))
  requireProof(prior.options.staffel===config.staffel&&prior.options.season===config.season&&prior.options.seedUrl===config.seedUrl&&prior.options.reportLimit===null,'reuse cache scope/full intent differs')
  const {buildFussballImportBatch}=await import('./fussball-import.mjs')
  buildFussballImportBatch(raw,{staffel:config.staffel,season:config.season})
  cachedDocuments=prior.documents.filter(d=>d.kind!=='round').map(d=>({...d,bytes:readRegular(reuseDirectory,d.file),originalReceipt:originalReceipt(d,prior)}))
  requireProof(cachedDocuments.length<=20000,'bounded original cache exceeded')
 }
 if(reuseBulkDirectory)cachedDocuments=await fussballBulkCacheDocuments(reuseBulkDirectory,{...config,collectFn,loadPack:loadBulkPack})
 requireProof(cachedDocuments.length<=20000,'bounded original cache exceeded')
 const documents=[],urls=new Set();let client
 // A fresh directory prevents accidentally combining scopes or overwriting evidence.
 mkdirSync(directory);mkdirSync(join(directory,'documents'))
 if(parent){mkdirSync(join(directory,'archive-parent'));writeFileSync(join(directory,parent.file),Buffer.from(archiveParent.bytes))}
 writeFileSync(join(directory,'attempts.jsonl'),'');writeFileSync(join(directory,'progress.jsonl'),'')
 const saveDocument=(document,origin)=>{
   const bytes=Buffer.from(document.bytes)
   requireProof(hash(bytes)===document.sha256&&document.status===200&&!urls.has(document.url),'invalid or duplicate source document')
   const file=`documents/${document.sha256}.${extension(document.kind)}`
   writeFileSync(join(directory,file),bytes)
   documents.push({...document,bytes:bytes.length,file,...(mixed?{origin}: {})});urls.add(document.url)
 }
 client=createFussballCaptureClient({maxRequests:config.maxRequests,fetchFn,cachedDocuments,
  onAttempt:attempt=>appendFileSync(join(directory,'attempts.jsonl'),json(attempt)),
  onDocument:document=>saveDocument(document,'network'),onCachedDocument:document=>saveDocument(document,'cache')})
 let result=null,error=null
 try{result=await collectWithArchiveParent(collectFn,{...config,client,onProgress:async progress=>{appendFileSync(join(directory,'progress.jsonl'),json(progress));await onProgress(progress)}},parent)}catch(failure){error=failure}
 const raw=result===null?null:json(result)
 if(raw!==null)writeFileSync(join(directory,'result.json'),raw)
 const manifest={version:parent?3:mixed?2:1,provider:'fussball',createdAt,completedAt:new Date().toISOString(),options:config,codeSha256,
  success:error===null,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw===null?null:hash(raw),activationEligible:false}
 if(parent)manifest.archiveParent=parent
 if(mixed)for(const d of documents)if(d.origin==='network')d.originalReceipt=originalReceipt(d,manifest)
 writeFileSync(join(directory,'manifest.json'),json(manifest))
 if(error)throw error
 return manifest
}
function readRegular(directory,path){
 const base=realpathSync(directory),full=resolve(base,path)
 requireProof(relative(base,full)!==''&&!relative(base,full).startsWith('..')&&!path.startsWith('/'),'unsafe evidence path')
 for(const folder of ['documents','archive-parent'])if(path.startsWith(folder+'/'))requireProof(lstatSync(join(base,folder)).isDirectory()&&!lstatSync(join(base,folder)).isSymbolicLink(),'symbolic documents directory')
 const stat=lstatSync(full);requireProof(stat.isFile()&&!stat.isSymbolicLink(),'source must be a regular file, not a symlink')
 return readFileSync(full)
}
export async function verifyFussballDirectory(directory,{collectFn=collectFussballSeason,requireCodeMatch=true}={}){
 const m=JSON.parse(readRegular(directory,'manifest.json'))
 requireProof([1,2,3].includes(m.version)&&m.provider==='fussball'&&m.success===true&&m.activationEligible===false,'incomplete or failed capture')
 requireProof(/^[a-f0-9]{64}$/.test(m.codeSha256??'')&&(!requireCodeMatch||m.codeSha256===fussballCaptureCodeSha256()),'capture code fingerprint differs')
 const options=validateFussballCaptureOptions(m.options),snapshot=m.snapshot
 requireProof((m.version===3)===Object.hasOwn(m,'archiveParent'),'archive parent proof/version differs')
 if(m.version===3)requireProof(/^[a-f0-9]{64}$/.test(m.archiveParent?.document?.sha256??'')&&m.archiveParent?.file===`archive-parent/${m.archiveParent.document.sha256}.html`,'archive parent content-addressed path differs')
 const parent=m.version===3?archiveParentProof(m.archiveParent,options,readRegular(directory,m.archiveParent.file),{persisted:true}):null
 requireProof(m.options.asOfDate===options.asOfDate,'capture calendar day is not pinned')
 requireProof(snapshot&&snapshot.stopped===false&&snapshot.stopReason===null&&Number.isInteger(snapshot.requests)&&snapshot.requests>0&&snapshot.requests<=options.maxRequests&&snapshot.attempts?.length===snapshot.requests,'request accounting differs')
 requireProof(Array.isArray(m.documents)&&m.documents.length<=20000,'bounded document inventory differs')
 const network=m.documents.filter(d=>m.version!==2||d.origin==='network'),cached=m.documents.filter(d=>m.version===2&&d.origin==='cache')
 requireProof(network.length===snapshot.requests&&network.length+cached.length===m.documents.length,'document request count differs')
 const journal=readRegular(directory,'attempts.jsonl').toString().trim().split('\n').map(line=>JSON.parse(line))
 requireProof(journal.length===snapshot.requests,'request journal count differs')
 const documents=new Map()
 for(const d of m.documents){
  const index=network.indexOf(d),attempt=snapshot.attempts[index],pending=journal[index]
  if(index>=0){
  requireProof(attempt.number===index+1&&attempt.status==='success'&&attempt.httpStatus===200&&attempt.error===null&&attempt.url===d.url&&attempt.kind===d.kind&&attempt.startedAt===d.capturedAt&&Number.isFinite(Date.parse(d.capturedAt)),'document request status or identity differs')
  requireProof(pending.number===attempt.number&&pending.url===attempt.url&&pending.kind===attempt.kind&&pending.status==='pending','request journal identity differs')
  }else requireProof(d.kind!=='round'&&Date.parse(d.capturedAt)<=Date.parse(m.createdAt),'cached schedules/future cache refused')
  if(m.version===2)checkOriginalReceipt(d,options)
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
 const usedCached=new Set()
 const replay=createFussballCaptureClient({maxRequests:snapshot.requests,cachedDocuments:cached.map(d=>documents.get(d.url)),onCachedDocument:d=>usedCached.add(d.url),now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{
  const d=documents.get(url);requireProof(d,'missing captured source document')
  return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})
 }})
 const result=await collectWithArchiveParent(collectFn,{...options,client:replay,onProgress:()=>{}},parent)
 requireProof(json(result)===raw,'result differs from full offline replay')
 requireProof(replay.snapshot().requests===snapshot.requests&&usedCached.size===cached.length,'unused or missing source documents in replay')
 return {verified:true,activationEligible:false,scope:result.scope,coverage:result.coverage,requests:snapshot.requests,resultSha256:m.resultSha256,codeSha256:m.codeSha256}
}
