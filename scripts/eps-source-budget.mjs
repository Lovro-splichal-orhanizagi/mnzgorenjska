// EPS batch-only boundary. Original cache hits never enter this fetch hook.
import {readFileSync,writeFileSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync,renameSync,fsyncSync} from 'node:fs'
import {dirname,isAbsolute} from 'node:path'
import {createHash} from 'node:crypto'
import {ZVEZE,jeIzziv,jeStranPlatforme,jeOdrezanaTekma} from './viri/eps.mjs'

const KNOWN_HOSTS=new Set(Object.keys(ZVEZE).map(host=>`www.${host}`))
const PACE_MS=3000,MAX_BYTES=4*1024*1024,PRIOR_REQUESTS=6
const stopError=message=>Object.assign(Error(`EPS source stopped: ${message}`),{code:'SLFF_SOURCE_STOP',zavrnitev:true})
const persistedStop=message=>Object.assign(stopError(message),{persisted:true})
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
function save(path,state){
 const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(state,null,2)+'\n',{mode:0o600})
 const fd=openSync(tmp,'r');try{fsyncSync(fd)}finally{closeSync(fd)}
 renameSync(tmp,path)
 const dir=openSync(dirname(path),'r');try{fsyncSync(dir)}finally{closeSync(dir)}
}
export function readEpsSourceBudget(path){return JSON.parse(readFileSync(path,'utf8'))}
async function boundedBody(response){
 const tooLarge=()=>Object.assign(Error('Source response exceeds bounded HTML size.'),{bodyLimit:true})
 const declared=response.headers.get('content-length')
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES)){void response.body?.cancel().catch(()=>{});throw tooLarge()}
 if(!response.body)return Buffer.alloc(0)
 const reader=response.body.getReader(),chunks=[];let size=0
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){void reader.cancel().catch(()=>{});throw tooLarge()}chunks.push(value)}}finally{reader.releaseLock()}
 return Buffer.concat(chunks,size)
}
function alive(pid){try{process.kill(pid,0);return true}catch(error){return error.code!=='ESRCH'}}
// A recovery guard prevents two children from replacing the same abandoned lock.
async function lockReceipt(path,host){
 const lockPath=path+'.lock',recovery=path+'.recovery',deadline=Date.now()+65000
 for(;;){
  if(existsSync(recovery)){if(Date.now()>deadline)throw stopError('Source lock recovery is UNKNOWN.');await wait(25);continue}
  let fd
  try{fd=openSync(lockPath,'wx',0o600)}catch(error){
   if(error.code!=='EEXIST')throw error
   let owner;try{owner=JSON.parse(readFileSync(lockPath,'utf8'))}catch{if(Date.now()>deadline)throw stopError('Interrupted source lock is UNKNOWN.');await wait(25);continue}
   if(!Number.isSafeInteger(owner.pid)||owner.pid<1)throw stopError('Interrupted source lock is UNKNOWN.')
   if(!alive(owner.pid)){
    let guard;try{guard=openSync(recovery,'wx',0o600)}catch(error){if(error.code==='EEXIST')continue;throw error}
    try{
     const current=JSON.parse(readFileSync(lockPath,'utf8'))
     if(!alive(current.pid)){
      // Recovery retains every intent and marks its host UNKNOWN under exclusive ownership.
      const state=readEpsSourceBudget(path),affected=state.pending?.host??current.host
      if(!state.hosts?.[affected])throw stopError('Interrupted source lock has unknown host.')
      state.hosts[affected].stopped='Prior source process interrupted; response UNKNOWN; no automatic retry.'
      if(state.pending){state.events[state.events.length-1].status='UNKNOWN';state.hosts[affected].pending=false;state.pending=null}
      save(path,state);unlinkSync(lockPath)
     }
    }finally{closeSync(guard);unlinkSync(recovery)}
    continue
   }
   if(Date.now()>deadline)throw stopError('Concurrent source request exceeded lock bound.')
   await wait(25);continue
  }
  // A recovery may have started between the first guard check and open.
  if(existsSync(recovery)){closeSync(fd);unlinkSync(lockPath);await wait(25);continue}
  writeFileSync(fd,JSON.stringify({pid:process.pid,host}));fsyncSync(fd)
  return ()=>{closeSync(fd);unlinkSync(lockPath)}
 }
}
function validState(state,binding){
 if(state.version!==1||JSON.stringify(state.binding)!==JSON.stringify(binding)||state.prior_requests!==PRIOR_REQUESTS||!state.global||!Number.isSafeInteger(state.global.requests)||state.global.requests<PRIOR_REQUESTS||state.global.requests>binding.max_requests||!Array.isArray(state.events)||state.events.length!==state.global.requests-PRIOR_REQUESTS||!state.hosts||JSON.stringify(Object.keys(state.hosts).sort())!==JSON.stringify(binding.hosts))return false
 if(state.global.stopped!==null&&typeof state.global.stopped!=='string')return false
 for(const host of binding.hosts){const h=state.hosts[host];if(!h||typeof h.pending!=='boolean'||h.last_started_ms!==null&&!Number.isFinite(h.last_started_ms)||h.stopped!==null&&typeof h.stopped!=='string')return false}
 for(const [index,event]of state.events.entries()){
  if(event.sequence!==PRIOR_REQUESTS+index+1||!binding.hosts.includes(event.host)||!Number.isFinite(Date.parse(event.started_at))||!['RUNNING','COMPLETED','STOPPED','UNKNOWN'].includes(event.status)||!/^\w{64}$/.test(event.request_sha256??''))return false
  if(event.status==='COMPLETED'&&(!/^[a-f0-9]{64}$/.test(event.original_bytes_sha256??'')||!Number.isSafeInteger(event.original_bytes)||event.original_bytes<0||event.original_bytes>MAX_BYTES||![200,500].includes(event.http_status)||!Number.isFinite(Date.parse(event.completed_at))))return false
  if(event.status==='RUNNING'&&state.pending?.sequence!==event.sequence)return false
 }
 if(state.pending!==null&&(!state.pending||!binding.hosts.includes(state.pending.host)||state.pending.sequence!==state.global.requests||state.events.at(-1)?.status!=='RUNNING'||state.events.at(-1)?.host!==state.pending.host))return false
 return binding.hosts.every(host=>state.hosts[host].pending===(state.pending?.host===host))
}
function sourceIdentity(raw,url,hosts){
 if(!hosts.includes(url.hostname)||url.protocol!=='https:'||url.username||url.password||url.port||url.hash)return null
 const match=/^https:\/\/(www\.[a-z]+\.gr)\/results\/(display_schedule|display_results|display_game)\.php\?(league_id|game_id)=([1-9]\d*)$/.exec(raw)
 if(!match||match[1]!==url.hostname||match[3]!== (match[2]==='display_game'?'game_id':'league_id'))return null
 return {origin:url.origin,path:url.pathname,query:[[match[3],match[4]]]}
}
const refusal=body=>jeIzziv(body)||/<input\b[^>]*\btype\s*=\s*["']?password\b|<form\b[^>]*(?:login|signin)|SQLSTATE|Too many connections/i.test(body)

export function createEpsBudgetFetch({path,maxRequests,databaseOrigin,hosts,priorRequests=PRIOR_REQUESTS,fetch:request=globalThis.fetch,now=Date.now,sleep=wait}){
 let db
 try{db=new URL(databaseOrigin)}catch{throw stopError('Invalid fixed budget configuration.')}
 if(!isAbsolute(path??'')||!Number.isSafeInteger(maxRequests)||maxRequests<=PRIOR_REQUESTS||maxRequests>1000||priorRequests!==PRIOR_REQUESTS||!Array.isArray(hosts)||!hosts.length||new Set(hosts).size!==hosts.length||hosts.some(host=>!KNOWN_HOSTS.has(host))||db.protocol!=='https:'||db.username||db.password||db.pathname!=='/'||db.search||db.hash||KNOWN_HOSTS.has(db.hostname))throw stopError('Invalid fixed budget configuration.')
 const selected=[...hosts].sort(),binding={hosts:selected,database_origin:db.origin,max_requests:maxRequests,prior_requests:PRIOR_REQUESTS}
 mkdirSync(dirname(path),{recursive:true});let queue=Promise.resolve()
 const execute=async(input,init={})=>{
  const raw=input instanceof Request?input.url:String(input)
  let url;try{url=new URL(raw)}catch{url=null}
  let release,state
  try{
   release=await lockReceipt(path,selected.includes(url?.hostname)?url.hostname:null)
   if(existsSync(path+'.stopped'))throw stopError('Persisted budget infrastructure stop requires review.')
   try{state=existsSync(path)?readEpsSourceBudget(path):{version:1,binding,prior_requests:PRIOR_REQUESTS,global:{requests:PRIOR_REQUESTS,stopped:null},hosts:Object.fromEntries(selected.map(host=>[host,{last_started_ms:null,stopped:null,pending:false}])),pending:null,events:[]}}catch{throw stopError('Malformed shared source receipt.')}
   if(!validState(state,binding)){
    if(state.global){state.global.stopped='Changed or incomplete shared budget receipt.';save(path,state)}
    throw persistedStop('Changed or incomplete shared budget receipt.')
   }
   const stop=(reason,host=null,event=null,status='STOPPED')=>{
    if(event)event.status=status
    if(host)state.hosts[host].stopped=reason;else state.global.stopped=reason
    if(state.pending){state.hosts[state.pending.host].pending=false;state.pending=null}
    save(path,state);throw persistedStop(reason)
   }
   if(state.global.stopped)throw persistedStop(state.global.stopped)
   if(state.pending){
    const affected=state.pending.host
    state.hosts[affected].stopped='Prior source response is UNKNOWN; no automatic retry.'
    state.events.at(-1).status='UNKNOWN';state.hosts[affected].pending=false;state.pending=null;save(path,state)
   }
   const identity=url&&sourceIdentity(raw,url,selected),host=selected.includes(url?.hostname)?url.hostname:null
   if(!identity)stop('Unreviewed source URL.',host)
   if(state.hosts[host].stopped)throw persistedStop(state.hosts[host].stopped)
   const method=String(init.method??(input instanceof Request?input.method:'GET')).toUpperCase()
   if(method!=='GET')stop('Only fixed EPS GET requests are permitted.',host)
   if(state.global.requests>=maxRequests)stop('Shared EPS source request budget exhausted.')
   const last=state.hosts[host].last_started_ms
   if(last!==null){const delay=PACE_MS-(now()-last);if(delay>0)await sleep(delay)}
   const started=now()
   if(!Number.isFinite(started)||last!==null&&started-last<PACE_MS)stop('Invalid source clock or pacing.',host)
   state.global.requests++;state.hosts[host].last_started_ms=started;state.hosts[host].pending=true;state.pending={host,sequence:state.global.requests}
   const event={sequence:state.global.requests,host,source:identity,request_sha256:hash(raw),started_at:new Date(started).toISOString(),status:'RUNNING'}
   state.events.push(event);save(path,state)
   let response
   try{response=await request(url,{method:'GET',redirect:'manual',headers:{'user-agent':'SLFF fantasy (https://slff.eu)'},signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000)})}catch{stop('Source transport failure; response UNKNOWN; no automatic retry.',host,event,'UNKNOWN')}
   event.http_status=response.status
   if(response.redirected||response.status!==200&&response.status!==500){void response.body?.cancel().catch(()=>{});stop(`Source HTTP ${response.status} or redirect; no source retry authorized.`,host,event)}
   let bytes
   try{bytes=await boundedBody(response)}catch(error){stop(error.bodyLimit?error.message:'Source response body failed; response UNKNOWN.',host,event,error.bodyLimit?'STOPPED':'UNKNOWN')}
   // The digest always covers original source bytes, before TextDecoder normalization.
   event.original_bytes_sha256=hash(bytes);event.original_bytes=bytes.length
   const body=new TextDecoder().decode(bytes),platform=jeStranPlatforme(body)||url.pathname==='/results/display_game.php'&&jeOdrezanaTekma(body)
   if(refusal(body))stop('Source challenge, login or overload response.',host,event)
   if(!platform)stop('Source body is UNKNOWN; expected EPS platform HTML.',host,event)
   if(response.status===500&&!['www.epsdod.gr','www.epsip.gr'].includes(host))stop('Source HTTP 500 is outside documented EPS host exceptions.',host,event)
   event.status='COMPLETED';event.completed_at=new Date(now()).toISOString();state.hosts[host].pending=false;state.pending=null;save(path,state)
   const retained=new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers})
   Object.defineProperties(retained,{url:{value:response.url},redirected:{value:false}})
   return retained
  }catch(error){
   if(!error.persisted)writeFileSync(path+'.stopped','Source budget infrastructure failure or UNKNOWN state; review required.',{mode:0o600})
   if(error.code==='SLFF_SOURCE_STOP')throw error
   throw stopError('Source budget receipt failure; review required.')
  }finally{release?.()}
 }
 return (input,init)=>{
  let url;try{url=new URL(input instanceof Request?input.url:String(input))}catch{}
  // Database writes and retry/transaction semantics stay with their existing caller.
  if(url?.origin===db.origin&&!url.username&&!url.password)return request(input,init)
  const result=queue.then(()=>execute(input,init));queue=result.catch(()=>{});return result
 }
}
if(process.env.SLFF_EPS_BUDGET_PATH)globalThis.fetch=createEpsBudgetFetch({path:process.env.SLFF_EPS_BUDGET_PATH,maxRequests:Number(process.env.SLFF_EPS_MAX_REQUESTS),databaseOrigin:process.env.SUPABASE_URL,hosts:JSON.parse(process.env.SLFF_EPS_HOSTS??'null'),fetch:globalThis.fetch})
