// A bounded source precheck, never a season capture or an import/release manifest.
import {collectFussballScreen} from './fussball-screen.mjs'
import {createFussballCaptureClient,fussballRoundScope} from './lib/fussball-capture.mjs'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,lstatSync,realpathSync,existsSync,readdirSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {zaprtje} from './odtis-kode.mjs'

const proof=(ok,reason)=>{if(!ok)throw Object.assign(Error(`fussball batch screen: ${reason}`),{code:'FUSSBALL_BATCH_SCREEN_INVALID'})}
const disabled={activationEligible:false,sezonskiUvozPodprt:false}
const validDate=d=>typeof d==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d

export function fussballBatchScreenOptions(input){
 proof(Array.isArray(input?.leagues)&&input.leagues.length>=1&&input.leagues.length<=10,'league scope must contain 1–10 tuples')
 proof(Number.isInteger(input.maxRequests)&&input.maxRequests>=1&&input.maxRequests<=80,'shared total request budget must be 1–80')
 proof(Number.isInteger(input.reportLimit)&&input.reportLimit>=1&&input.reportLimit<=3,'report limit must be 1–3 per league')
 proof(validDate(input.asOfDate),'invalid pinned calendar date')
 const seen=new Set(),leagues=input.leagues.map(l=>{
  const scope=fussballRoundScope(l?.seedUrl),season=l?.season?.match(/^(20\d{2})\/(\d{2})$/)
  proof(scope&&scope.staffel===l.staffel,'invalid seed/staffel scope')
  proof(season&&(+season[1]+1)%100===+season[2],'invalid season scope')
  const key=`${l.staffel}:${l.season}`;proof(!seen.has(key),'duplicate league season scope');seen.add(key)
  return {seedUrl:l.seedUrl,staffel:l.staffel,season:l.season}
 })
 return {leagues,maxRequests:input.maxRequests,reportLimit:input.reportLimit,asOfDate:input.asOfDate}
}

export async function collectFussballBatchScreen(input){
 const options=fussballBatchScreenOptions(input),client=input.client,leagues=[]
 proof(client&&typeof client.read==='function'&&typeof client.snapshot==='function'&&client.requestLimit===options.maxRequests,'bounded client budget differs from shared batch budget')
 for(const scope of options.leagues){
  const before=client.snapshot()
  if(before.stopped){leagues.push({scope,status:'HOLD',attempted:false,reason:`Shared source stopped: ${before.stopReason}`,screen:null,...disabled});continue}
  let screen=null,error=null
  try{screen=await collectFussballScreen({...scope,maxRequests:options.maxRequests,reportLimit:options.reportLimit,asOfDate:options.asOfDate,client})}catch(e){error=e}
  const c=screen?.coverage
  const passed=!!(c&&c.completeReports>0&&c.rejectedReports===0&&c.attemptedReports===Math.min(options.reportLimit,c.linkedPlayedFixtures)&&c.completeReports===c.attemptedReports)
  const reason=error?.message??(passed?null:c?.rejectedReports?'Strict sampled report rejected':c?.attemptedReports===0?'No sampled played reports':'Incomplete strict report sample')
  leagues.push({scope,status:passed?'SAMPLE_PASSED':'HOLD',attempted:true,reason,screen,...disabled})
 }
 return {version:1,scope:{provider:'fussball-batch-screen',...options},leagues,snapshot:client.snapshot(),sampled:true,fullSeason:false,...disabled}
}

const json=x=>JSON.stringify(x)+'\n'
const hash=x=>createHash('sha256').update(x).digest('hex')
const root=fileURLToPath(new URL('../',import.meta.url))
function codeHash(){
 const files=new Set([...zaprtje('scripts/fussball-batch-screen.mjs',f=>readFileSync(resolve(root,f),'utf8'),f=>existsSync(resolve(root,f))),'scripts/zajemi-fussball-paket.mjs','scripts/viri/fussball-datumski-glifi.json'])
 return hash([...files].sort().map(f=>`${f}\0${hash(readFileSync(resolve(root,f)))}`).join('\n'))
}
const ext=kind=>kind==='font'?'woff':kind==='css'?'css':'html'
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
export async function captureFussballBatchScreenDirectory({directory,options,fetchFn=globalThis.fetch,now=Date.now,sleep=pause}){
 const createdAt=new Date(now()).toISOString(),opts=fussballBatchScreenOptions({...options,asOfDate:options?.asOfDate??createdAt.slice(0,10)}),codeSha256=codeHash(),documents=[]
 mkdirSync(directory);mkdirSync(join(directory,'documents'));writeFileSync(join(directory,'attempts.jsonl'),'')
 const client=createFussballCaptureClient({maxRequests:opts.maxRequests,fetchFn,now,sleep,onAttempt:a=>appendFileSync(join(directory,'attempts.jsonl'),json(a)),onDocument:d=>{
  const bytes=Buffer.from(d.bytes),file=`documents/${d.sha256}.${ext(d.kind)}`;writeFileSync(join(directory,file),bytes);documents.push({...d,bytes:bytes.length,file})
 }})
 const result=await collectFussballBatchScreen({...opts,client}),raw=json(result),snapshot=client.snapshot()
 writeFileSync(join(directory,'batch-result.json'),raw)
 const manifest={version:1,provider:'fussball-batch-screen',createdAt,completedAt:new Date(now()).toISOString(),options:opts,codeSha256,success:!snapshot.stopped,snapshot,documents,resultSha256:hash(raw),...disabled}
 writeFileSync(join(directory,'batch-manifest.json'),json(manifest));return manifest
}

function readRegular(directory,path){
 const base=realpathSync(directory),full=resolve(base,path),rel=relative(base,full)
 proof(rel&&!rel.startsWith('..')&&!path.startsWith('/'),'unsafe evidence path')
 if(path.startsWith('documents/'))proof(lstatSync(join(base,'documents')).isDirectory()&&!lstatSync(join(base,'documents')).isSymbolicLink(),'symbolic documents directory')
 proof(lstatSync(full).isFile()&&!lstatSync(full).isSymbolicLink(),'evidence must be regular file');return readFileSync(full)
}

/** Replays successful source bytes. Terminal network diagnostics remain explicitly failed. */
export async function verifyFussballBatchScreenDirectory(directory){
 const m=JSON.parse(readRegular(directory,'batch-manifest.json')),o=fussballBatchScreenOptions(m.options),s=m.snapshot
 proof(m.version===1&&m.provider==='fussball-batch-screen'&&m.activationEligible===false&&m.sezonskiUvozPodprt===false,'invalid batch evidence')
 proof(m.codeSha256===codeHash(),'batch code fingerprint differs')
 proof(s&&typeof s.stopped==='boolean'&&m.success===!s.stopped&&(s.stopped?typeof s.stopReason==='string'&&!!s.stopReason:s.stopReason===null),'success/stop accounting differs')
 proof(Number.isInteger(s.requests)&&s.requests>=1&&s.requests<=o.maxRequests&&s.attempts?.length===s.requests&&Array.isArray(m.documents),'request accounting differs')
 const created=Date.parse(m.createdAt),completed=Date.parse(m.completedAt)
 proof(Number.isFinite(created)&&Number.isFinite(completed)&&completed>=created,'invalid capture dates')
 const journal=readRegular(directory,'attempts.jsonl').toString().trim().split('\n').map(x=>JSON.parse(x))
 proof(journal.length===s.requests,'journal count differs')
 const directoryInfo=lstatSync(join(directory,'documents'))
 proof(directoryInfo.isDirectory()&&!directoryInfo.isSymbolicLink(),'symbolic or invalid documents directory')
 const docs=new Map(),files=new Set();let docIndex=0,last=null
 for(const [i,a]of s.attempts.entries()){
  const j=journal[i],started=Date.parse(a.startedAt)
  proof(a.number===i+1&&Number.isFinite(started)&&started>=created&&started<=completed&&(last===null||started-last>=6000),'attempt timestamp or pacing differs');last=started
  proof(j.number===a.number&&j.url===a.url&&j.kind===a.kind&&j.status==='pending'&&j.startedAt===null&&j.error===null,'journal identity differs')
  proof(['round','report','lineup','css','font'].includes(a.kind),'invalid attempt kind')
  if(a.status==='failed'){
   proof(s.stopped&&i===s.requests-1&&a.error===s.stopReason,'terminal failure accounting differs')
   proof(a.httpStatus===undefined||Number.isInteger(a.httpStatus)&&a.httpStatus>=200&&a.httpStatus<=599,'invalid failure HTTP status')
   continue
  }
  const d=m.documents[docIndex++]
  proof(a.status==='success'&&a.error===null&&a.httpStatus===200&&d&&d.url===a.url&&d.kind===a.kind&&d.capturedAt===a.startedAt,'document/attempt identity differs')
  proof(d.status===200&&typeof d.contentType==='string'&&/^[a-f0-9]{64}$/.test(d.sha256)&&d.file===`documents/${d.sha256}.${ext(d.kind)}`&&!docs.has(d.url),'document identity differs')
  const bytes=readRegular(directory,d.file);proof(bytes.length===d.bytes&&hash(bytes)===d.sha256,'document bytes/hash differs')
  docs.set(d.url,{...d,bytes});files.add(d.file.slice('documents/'.length))
 }
 proof(docIndex===m.documents.length,'unused retained document')
 const documentFiles=readdirSync(join(directory,'documents'))
 proof(documentFiles.length===files.size&&documentFiles.every(f=>files.has(f)),'unused document file')
 const raw=readRegular(directory,'batch-result.json').toString();proof(hash(raw)===m.resultSha256,'batch result digest differs')
 let index=0,clock=Date.parse(s.attempts[0].startedAt)
 const client=createFussballCaptureClient({maxRequests:o.maxRequests,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async(url,init)=>{
  const a=s.attempts[index++]
  proof(a&&a.url===url&&init.method==='GET','offline request order differs')
  clock=index<s.requests?Date.parse(s.attempts[index].startedAt):clock
  // Failed bodies are never admitted as source documents. Replay the retained terminal
  // diagnostic after independently replaying every preceding successful document.
  if(a.status==='failed')throw Error(a.error)
  const d=docs.get(url);proof(d,'missing captured source document')
  return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})
 }})
 const result=await collectFussballBatchScreen({...o,client}),replayed=result.snapshot
 // HTTP status of a refused response is retained metadata, not a successful body.
 if(s.attempts.at(-1).status==='failed'&&s.attempts.at(-1).httpStatus!==undefined)replayed.attempts.at(-1).httpStatus=s.attempts.at(-1).httpStatus
 proof(index===s.requests&&json(replayed)===json(s),'complete request replay accounting differs')
 proof(json(result)===raw,'batch differs from independent offline replay')
 return {verified:true,success:m.success,leagues:result.leagues.map(({scope,status,attempted,reason})=>({scope,status,attempted,reason,...disabled})),requests:s.requests,resultSha256:m.resultSha256,codeSha256:m.codeSha256,...disabled}
}
