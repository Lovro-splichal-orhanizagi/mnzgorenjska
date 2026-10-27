import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,appendFileSync,readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {isDeepStrictEqual} from 'node:util'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {collectFussballSeason} from './fussball-season.mjs'
import {extractFussballSeasonLinks,inspectFussballArchivePage,fussballArchiveSeedAlias} from './fussball-season-links.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'
import {inspectFussballLineup,razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {readFussballTransportCheckpoint,readFussballTransportResumption,readFussballTransportSuccessor,getFussballCheckpointDocuments,exportFussballTransportCheckpoint} from './fussball-checkpoint.mjs'

const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const json=value=>JSON.stringify(value)+'\n'
const requireProof=(ok,reason)=>{if(!ok)throw Error(`fussball evidence: ${reason}`)}
const extension=kind=>kind==='font'?'woff':kind==='css'?'css':'html'
const root=fileURLToPath(new URL('../',import.meta.url))

export function fussballCaptureCodeSha256(){
 const files=[...new Set([...zaprtje('scripts/fussball-capture-evidence.mjs'),'scripts/zajemi-fussball-sezono.mjs','scripts/viri/fussball-datumski-glifi.json','scripts/vzorci/de-fussball-baden-archive-20261026.json','scripts/policies/fussball-transport-checkpoints.json','scripts/policies/fussball-transport-resumption.json','scripts/policies/fussball-transport-successor.json'])].sort()
 return hash(files.map(file=>`${file}\0${hash(readFileSync(resolve(root,file)))}`).join('\n'))
}
export function validateFussballCaptureOptions(options){
 requireProof(options?.cardPolicy===undefined||options.cardPolicy==='community-v1','invalid card policy')
 requireProof(options&&/^[A-Z0-9]{32}-G$/.test(options.staffel??''),'invalid staffel')
 const season=options.season?.match(/^(20\d{2})\/(\d{2})$/)
 requireProof(season&&(+season[1]+1)%100===+season[2],'invalid season')
 requireProof(typeof options.seedUrl==='string'&&options.seedUrl.endsWith(`/staffel/${options.staffel}`),'seed scope differs')
 requireProof(Number.isInteger(options.maxRequests)&&options.maxRequests>=1&&options.maxRequests<=4000,'invalid request budget')
 requireProof(options.reportLimit===null||Number.isInteger(options.reportLimit)&&options.reportLimit>=0,'invalid report limit')
 const asOfDate=options.asOfDate??new Date().toISOString().slice(0,10)
 requireProof(typeof asOfDate==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(asOfDate)&&Number.isFinite(Date.parse(asOfDate+'T00:00:00Z'))&&new Date(asOfDate+'T00:00:00Z').toISOString().slice(0,10)===asOfDate,'invalid capture calendar date')
 return {seedUrl:options.seedUrl,staffel:options.staffel,season:options.season,maxRequests:options.maxRequests,reportLimit:options.reportLimit,asOfDate,...(options.cardPolicy?{cardPolicy:options.cardPolicy}:{})}
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
export async function fussballBulkCacheDocuments(directory,{staffel,season,seedUrl,cardPolicy,collectFn=collectFussballSeason,loadPack}={}){
 requireProof(cardPolicy===undefined||cardPolicy==='community-v1','invalid card policy')
 const m=JSON.parse(readRegular(directory,'manifest.json'))
 const {loadGermanyPack}=await import('./bulk-germany-source.mjs')
 await (loadPack??loadGermanyPack)(directory,{candidate:m.candidate,requireFresh:false})
 requireProof(Boolean(m.candidate?.communityCards)===Boolean(cardPolicy),'bulk cache card policy differs')
 requireProof(m.candidate?.source_league_code===`${staffel}:${season}`&&m.candidate.seedUrl===seedUrl,'bulk cache current scope differs')
 if(m.provider==='germany-paired-fussball'){
  const current=JSON.parse(readRegular(directory,'current/manifest.json'))
  requireProof([1,4].includes(current.version)&&current.options.staffel===staffel&&current.options.season===season&&current.options.seedUrl===seedUrl&&current.options.cardPolicy===cardPolicy,'paired cache current scope differs')
  return current.documents.filter(d=>d.kind!=='round').map(d=>({...d,bytes:readRegular(directory,'current/'+d.file),originalReceipt:originalReceipt(d,current)}))
 }
 const docs=new Map(m.documents.map(d=>[d.url,d])),used=new Set()
 const result=await collectFn({staffel,season,seedUrl,...(cardPolicy?{cardPolicy}:{}),reportLimit:null,asOfDate:m.captured_at.slice(0,10),client:{read:async(url,kind)=>{
  const d=docs.get(url);requireProof(d?.kind===kind,'missing original current bulk document')
  const bytes=readRegular(directory,d.file);requireProof(bytes.length===d.bytes&&hash(bytes)===d.sha256,'bulk original bytes differ')
  used.add(url);return {...d,bytes}
 }}})
 const {buildFussballImportBatch}=await import('./fussball-import.mjs')
 buildFussballImportBatch(result,{staffel,season,cardPolicy})
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
const checkpointRuns=['40416972177','40509926697','40531709101']
function checkpointVersion(proof){
 if(proof.preset==='baden-reviewed-transports-v1')return 1
 if(proof.preset==='baden-reviewed-transports-v2')return 2
 if(proof.preset==='baden-reviewed-transports-v3')return 3
 requireProof(false,'reviewed checkpoint preset required')
}
const checkpointFiles=version=>version===3
 ?['current','archive'].map(stage=>({runId:'40577717778',metadataFile:`checkpoint/parents/40577717778-${stage}.json`,zipFile:`checkpoint/parents/40577717778-${stage}.zip`}))
 :(version===1?checkpointRuns:['40566792786']).map(runId=>({runId,metadataFile:`checkpoint/parents/${runId}.json`,zipFile:`checkpoint/parents/${runId}.zip`}))
// Cache parseability only: no invented fixture/header and no schedule admission.
// A previous parser may have stopped before retaining a needed font. Never seed
// either half of that report bundle: the ordinary collector must read it anew.
function eligibleCheckpointDocuments(documents,options){
 const byUrl=new Map(documents.map(d=>[d.url,d])),eligible=new Set()
 for(const report of documents.filter(d=>d.kind==='report')){
  try{
   const id=report.url.match(/\/spiel\/([A-Z0-9]{32})$/)?.[1]
   requireProof(id,'checkpoint report URL identity missing')
   const mainHtml=Buffer.from(report.bytes).toString('utf8'),info=inspectFussballPage(mainHtml,{kind:'report',matchId:id})
   requireProof(info.lineupUrl?.match(/\/spiel\/([A-Z0-9]{32})(?:\/ticker-id\/selectedTickerId)?$/)?.[1]===id,'checkpoint observed lineup identity differs')
   const lineup=byUrl.get(info.lineupUrl)
   requireProof(lineup?.kind==='lineup','checkpoint report has no retained lineup')
   const lineupHtml=Buffer.from(lineup.bytes).toString('utf8'),fontIds=[...new Set([...info.fontIds,...inspectFussballLineup(lineupHtml)])],fonts=Object.create(null)
   for(const fontId of fontIds){
    const css=byUrl.get(info.cssTemplate.replace('%ID%',fontId))
    if(!css)continue
    requireProof(css.kind==='css','checkpoint CSS kind differs')
    const url=fussballFontUrl(Buffer.from(css.bytes).toString('utf8'),fontId),expected=`https://www.fussball.de/export.fontface/-/format/woff/id/${fontId}/type/font`
    requireProof(url===expected,'checkpoint CSS resolves to a different font')
    const font=byUrl.get(url)
    if(font){requireProof(font.kind==='font','checkpoint WOFF kind differs');fonts[fontId]={bytes:Buffer.from(font.bytes),sha256:font.sha256}}
   }
   const result=razberiFantasyZapisnik(mainHtml,lineupHtml,{fonts,id,lineupId:id,cardPolicy:options.cardPolicy,season:options.season})
   const complete=result.reportStatistikaPripravljena===true&&Array.isArray(result.nastopi)
   const pending=options.cardPolicy==='community-v1'&&result.statisticsPending===true&&result.reportStatistikaPripravljena===false&&result.cardEnvelope&&!Object.hasOwn(result,'nastopi')&&!Object.hasOwn(result.z??{},'goli')
   requireProof((complete||pending)&&result.sezonskiUvozPodprt===false&&result.activationEligible===false&&result.z?.nepopoln===true&&Array.isArray(result.nepripisaniRumeni),'checkpoint report parse envelope differs')
   eligible.add(report.url);eligible.add(lineup.url)
  }catch{
   // An invalid/incomplete bundle grants no cache reuse. This does not repair
   // or approve its source facts; a new strict traversal still holds on them.
  }
 }
 return documents.filter(d=>!['report','lineup'].includes(d.kind)||eligible.has(d.url))
}
function checkpointScope(proof,options){
 const version=checkpointVersion(proof)
 requireProof(proof.priorRequests===({1:1114,2:1212,3:1423}[version])&&proof.totalRequestCap===5000&&['seedUrl','staffel','season'].every(k=>proof.scope?.[k]===options[k]),'checkpoint current scope/accounting differs')
 requireProof(options.reportLimit===null&&options.cardPolicy==='community-v1'&&options.maxRequests<=({1:886,2:788,3:577}[version]),'checkpoint requires full current community policy and reviewed request bound')
}
function persistCheckpoint(directory,exported){
 const version=checkpointVersion(exported.proof),parentFiles=checkpointFiles(version)
 requireProof(exported.parents.length===parentFiles.length&&exported.parents.every((p,i)=>String(p.run.id)===parentFiles[i].runId),'checkpoint parent order differs')
 mkdirSync(join(directory,'checkpoint'));mkdirSync(join(directory,'checkpoint/parents'))
 exported.parents.forEach(({run,artifact,jobs,zipBytes},i)=>{
  writeFileSync(join(directory,parentFiles[i].metadataFile),json({run,artifact,jobs}),{flag:'wx'})
  writeFileSync(join(directory,parentFiles[i].zipFile),Buffer.from(zipBytes),{flag:'wx'})
 })
 return {version,proof:exported.proof,parentFiles}
}
function readCheckpoint(directory,checkpoint,options){
 requireProof(checkpoint&&Object.keys(checkpoint).sort().join(',')==='parentFiles,proof,version'&&[1,2,3].includes(checkpoint.version)&&isDeepStrictEqual(checkpoint.parentFiles,checkpointFiles(checkpoint.version)),'checkpoint fixed parent paths/version differ')
 const parents=checkpoint.parentFiles.map(({metadataFile,zipFile})=>{
  const m=JSON.parse(readRegular(directory,metadataFile))
  requireProof(m&&Object.keys(m).sort().join(',')==='artifact,jobs,run','checkpoint parent metadata fields differ')
  return {...m,zipBytes:readRegular(directory,zipFile)}
 })
 const proof=checkpoint.version===1?readFussballTransportCheckpoint({parents,now:Date.now()}):checkpoint.version===2?readFussballTransportResumption({parent:parents[0],now:Date.now()}):readFussballTransportSuccessor({current:parents[0],archive:parents[1],now:Date.now()})
 requireProof(isDeepStrictEqual(checkpoint.proof,proof),'checkpoint persisted public proof differs from originals')
 checkpointScope(proof,options)
 return {proof,documents:new Map(eligibleCheckpointDocuments(getFussballCheckpointDocuments(proof),options).map(d=>[d.url,d]))}
}
export async function captureFussballDirectory({directory,options,fetchFn=globalThis.fetch,collectFn=collectFussballSeason,onProgress=()=>{},reuseDirectory,reuseBulkDirectory,loadBulkPack,archiveParent,completionProof}={}){
 const createdAt=new Date().toISOString()
 const config=validateFussballCaptureOptions({...options,asOfDate:options?.asOfDate??createdAt.slice(0,10)}),codeSha256=fussballCaptureCodeSha256()
 let cachedDocuments=[]
 requireProof(!(reuseDirectory&&reuseBulkDirectory),'one verified reuse source required')
 const mixed=!!(reuseDirectory||reuseBulkDirectory)
 requireProof(!(archiveParent&&mixed),'archive parent cannot mix cached captures')
 const completion=completionProof!==undefined
 requireProof(!(completion&&(mixed||archiveParent)),'checkpoint completion cannot mix reuse or archive parent')
 let checkpointExport
 if(completion){
  // Only the reader-issued cache capability reaches this seam. A serialized
  // public proof never supplies cache authority or source completeness.
  cachedDocuments=getFussballCheckpointDocuments(completionProof)
  checkpointExport=exportFussballTransportCheckpoint(completionProof)
  checkpointScope(checkpointExport.proof,config)
  cachedDocuments=eligibleCheckpointDocuments(cachedDocuments,config)
 }
 const withOrigins=mixed||completion
 const parent=archiveParent?archiveParentProof(archiveParent,config,archiveParent.bytes):null
 if(reuseDirectory){
  // A code update may reparse old original bytes for CACHE ADMISSION only. The
  // new capture/import still requires today's exact code fingerprint and full
  // native proof; damaged/obsolete cache never falls back to a source reread.
  await verifyFussballDirectory(reuseDirectory,{collectFn,requireCodeMatch:false})
  const prior=JSON.parse(readRegular(reuseDirectory,'manifest.json')),raw=JSON.parse(readRegular(reuseDirectory,'result.json'))
  requireProof(prior.options.staffel===config.staffel&&prior.options.season===config.season&&prior.options.seedUrl===config.seedUrl&&prior.options.reportLimit===null&&prior.options.cardPolicy===config.cardPolicy,'reuse cache scope/full intent differs')
  const {buildFussballImportBatch}=await import('./fussball-import.mjs')
  buildFussballImportBatch(raw,{staffel:config.staffel,season:config.season,cardPolicy:config.cardPolicy})
  cachedDocuments=prior.documents.filter(d=>d.kind!=='round').map(d=>({...d,bytes:readRegular(reuseDirectory,d.file),originalReceipt:originalReceipt(d,prior)}))
  requireProof(cachedDocuments.length<=20000,'bounded original cache exceeded')
 }
 if(reuseBulkDirectory)cachedDocuments=await fussballBulkCacheDocuments(reuseBulkDirectory,{...config,collectFn,loadPack:loadBulkPack})
 requireProof(cachedDocuments.length<=20000,'bounded original cache exceeded')
 const documents=[],urls=new Set();let client
 // A fresh directory prevents accidentally combining scopes or overwriting evidence.
 mkdirSync(directory);mkdirSync(join(directory,'documents'))
 const checkpoint=completion?persistCheckpoint(directory,checkpointExport):null
 if(parent){mkdirSync(join(directory,'archive-parent'));writeFileSync(join(directory,parent.file),Buffer.from(archiveParent.bytes))}
 writeFileSync(join(directory,'attempts.jsonl'),'');writeFileSync(join(directory,'progress.jsonl'),'')
 const saveDocument=(document,origin)=>{
   const bytes=Buffer.from(document.bytes)
   requireProof(hash(bytes)===document.sha256&&document.status===200&&!urls.has(document.url),'invalid or duplicate source document')
   const file=`documents/${document.sha256}.${extension(document.kind)}`
   writeFileSync(join(directory,file),bytes)
   documents.push({...document,bytes:bytes.length,file,...(withOrigins?{origin}: {})});urls.add(document.url)
 }
 client=createFussballCaptureClient({maxRequests:config.maxRequests,fetchFn,cachedDocuments,
  onAttempt:attempt=>appendFileSync(join(directory,'attempts.jsonl'),json(attempt)),
  onDocument:document=>saveDocument(document,'network'),onCachedDocument:document=>saveDocument(document,'cache')})
 let result=null,error=null
 try{result=await collectWithArchiveParent(collectFn,{...config,client,onProgress:async progress=>{appendFileSync(join(directory,'progress.jsonl'),json(progress));await onProgress(progress)}},parent)}catch(failure){error=failure}
 const raw=result===null?null:json(result)
 if(raw!==null)writeFileSync(join(directory,'result.json'),raw)
 const manifest={version:completion?4:parent?3:mixed?2:1,provider:'fussball',createdAt,completedAt:new Date().toISOString(),options:config,codeSha256,
  success:error===null,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw===null?null:hash(raw),activationEligible:false}
 if(parent)manifest.archiveParent=parent
 if(checkpoint)manifest.checkpoint=checkpoint
 if(withOrigins)for(const d of documents)if(d.origin==='network')d.originalReceipt=originalReceipt(d,manifest)
 writeFileSync(join(directory,'manifest.json'),json(manifest))
 if(error)throw error
 return manifest
}
function readRegular(directory,path){
 requireProof(typeof path==='string'&&path.length>0&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(p=>p!==''&&p!=='.'&&p!=='..'),'unsafe evidence path')
 const base=realpathSync(directory),full=resolve(base,path)
 requireProof(relative(base,full)!==''&&!relative(base,full).startsWith('..')&&!path.startsWith('/'),'unsafe evidence path')
 const parts=path.split('/')
 for(let n=1;n<parts.length;n++){
  const folder=lstatSync(join(base,...parts.slice(0,n)))
  requireProof(folder.isDirectory()&&!folder.isSymbolicLink(),'symbolic or non-directory evidence ancestor')
 }
 const stat=lstatSync(full);requireProof(stat.isFile()&&!stat.isSymbolicLink(),'source must be a regular file, not a symlink')
 return readFileSync(full)
}
export async function verifyFussballDirectory(directory,{collectFn=collectFussballSeason,requireCodeMatch=true}={}){
 const m=JSON.parse(readRegular(directory,'manifest.json'))
 requireProof([1,2,3,4].includes(m.version)&&m.provider==='fussball'&&m.success===true&&m.activationEligible===false,'incomplete or failed capture')
 requireProof(/^[a-f0-9]{64}$/.test(m.codeSha256??'')&&(!requireCodeMatch||m.codeSha256===fussballCaptureCodeSha256()),'capture code fingerprint differs')
 const options=validateFussballCaptureOptions(m.options),snapshot=m.snapshot
 requireProof((m.version===4)===Object.hasOwn(m,'checkpoint'),'checkpoint proof/version differs')
 const checkpoint=m.version===4?readCheckpoint(directory,m.checkpoint,options):null
 if(checkpoint)requireProof(m.error===null,'checkpoint capture must have no terminal error')
 requireProof((m.version===3)===Object.hasOwn(m,'archiveParent'),'archive parent proof/version differs')
 if(m.version===3)requireProof(/^[a-f0-9]{64}$/.test(m.archiveParent?.document?.sha256??'')&&m.archiveParent?.file===`archive-parent/${m.archiveParent.document.sha256}.html`,'archive parent content-addressed path differs')
 const parent=m.version===3?archiveParentProof(m.archiveParent,options,readRegular(directory,m.archiveParent.file),{persisted:true}):null
 requireProof(m.options.asOfDate===options.asOfDate,'capture calendar day is not pinned')
 requireProof(snapshot&&snapshot.stopped===false&&snapshot.stopReason===null&&Number.isInteger(snapshot.requests)&&snapshot.requests>0&&snapshot.requests<=options.maxRequests&&snapshot.attempts?.length===snapshot.requests,'request accounting differs')
 requireProof(Array.isArray(m.documents)&&m.documents.length<=20000,'bounded document inventory differs')
 const withOrigins=m.version===2||m.version===4
 const network=m.documents.filter(d=>!withOrigins||d.origin==='network'),cached=m.documents.filter(d=>withOrigins&&d.origin==='cache')
 requireProof(network.length===snapshot.requests&&network.length+cached.length===m.documents.length,'document request count differs')
 const journal=readRegular(directory,'attempts.jsonl').toString().trim().split('\n').map(line=>JSON.parse(line))
 requireProof(journal.length===snapshot.requests,'request journal count differs')
 const documents=new Map()
 for(const d of m.documents){
  const index=network.indexOf(d),attempt=snapshot.attempts[index],pending=journal[index]
  if(index>=0){
  requireProof(attempt.number===index+1&&attempt.status==='success'&&attempt.httpStatus===200&&attempt.error===null&&attempt.url===d.url&&attempt.kind===d.kind&&attempt.startedAt===d.capturedAt&&Number.isFinite(Date.parse(d.capturedAt)),'document request status or identity differs')
  requireProof(pending.number===attempt.number&&pending.url===attempt.url&&pending.kind===attempt.kind&&pending.status==='pending','request journal identity differs')
  if(checkpoint){
   requireProof(Object.keys(attempt).sort().join(',')==='error,httpStatus,kind,number,startedAt,status,url'&&Object.keys(pending).sort().join(',')==='error,kind,number,startedAt,status,url'&&pending.startedAt===null&&pending.error===null,'checkpoint request journal fields differ')
   requireProof(index===0||Date.parse(attempt.startedAt)-Date.parse(snapshot.attempts[index-1].startedAt)>=6000,'checkpoint recorded request pacing differs')
   const expected={version:1,document:receiptDocument(d),attempt,capture:{createdAt:m.createdAt,codeSha256:m.codeSha256,staffel:options.staffel,season:options.season}}
   requireProof(isDeepStrictEqual(d.originalReceipt,expected),'checkpoint network original receipt differs')
  }
  }else requireProof(d.kind!=='round'&&Date.parse(d.capturedAt)<=Date.parse(m.createdAt),'cached schedules/future cache refused')
  if(withOrigins)checkOriginalReceipt(d,options)
  if(checkpoint&&index<0){
   const original=checkpoint.documents.get(d.url)
   requireProof(original&&isDeepStrictEqual(receiptDocument(d),{...receiptDocument(original),bytes:original.bytes.length})&&isDeepStrictEqual(d.originalReceipt,original.originalReceipt),'checkpoint cached original identity/receipt differs')
  }
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
 const usedCached=new Set(),usedNetwork=new Set()
 const replay=createFussballCaptureClient({maxRequests:snapshot.requests,cachedDocuments:cached.map(d=>documents.get(d.url)),onCachedDocument:d=>usedCached.add(d.url),now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{
  const d=documents.get(url);requireProof(d,'missing captured source document')
  usedNetwork.add(url)
  return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})
 }})
 const result=await collectWithArchiveParent(collectFn,{...options,client:replay,onProgress:()=>{}},parent)
 requireProof(json(result)===raw,'result differs from full offline replay')
 requireProof(replay.snapshot().requests===snapshot.requests&&usedCached.size===cached.length,'unused or missing source documents in replay')
 if(checkpoint)requireProof(usedNetwork.size===network.length&&network.every(d=>usedNetwork.has(d.url)),'unused or missing checkpoint network documents')
 return {verified:true,activationEligible:false,scope:result.scope,coverage:result.coverage,requests:snapshot.requests,resultSha256:m.resultSha256,codeSha256:m.codeSha256,...(checkpoint?{checkpointPreset:checkpoint.proof.preset,priorRequests:checkpoint.proof.priorRequests}:{})}
}
