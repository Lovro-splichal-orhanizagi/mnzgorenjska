// Batch-only fixed MLSZ fetch boundary. Filesystem cache hits cost zero requests.
import {readFileSync,writeFileSync,existsSync,mkdirSync,openSync,closeSync,unlinkSync,renameSync,fsyncSync} from 'node:fs'
import {dirname,isAbsolute} from 'node:path'
import {createHash} from 'node:crypto'
import {jeIzziv,jePrijava} from './viri/mlsz.mjs'
const HOST='adatbank.mlsz.hu',CANONICAL='ada1bank.mlsz.hu',PACE_MS=1500,MAX_BYTES=4*1024*1024
async function boundedSourceBody(response){
 const limit=message=>Object.assign(Error(message),{sourceBodyLimit:true})
 const declared=response.headers.get('content-length')
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES)){void response.body?.cancel().catch(()=>{});throw limit('Source response exceeds bounded HTML size.')}
 if(!response.body)return new Uint8Array()
 const reader=response.body.getReader(),chunks=[];let length=0
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES){void reader.cancel().catch(()=>{});throw limit('Source response exceeds bounded HTML size.')}chunks.push(value)}}finally{reader.releaseLock()}
 return Buffer.concat(chunks,length)
}
const stopError=message=>Object.assign(Error(`Provider source stopped: ${message}`),{code:'SLFF_SOURCE_STOP',zavrnitev:true})
function save(path,value){const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});const fd=openSync(tmp,'r');try{fsyncSync(fd)}finally{closeSync(fd)}renameSync(tmp,path)}
export function readSourceBudget(path){return JSON.parse(readFileSync(path,'utf8'))}
export function createBudgetFetch({path,maxRequests,databaseOrigin,fetch:request=globalThis.fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}) {
 const db=new URL(databaseOrigin)
 if(!isAbsolute(path??'')||!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>1000||db.protocol!=='https:'||db.username||db.password||db.pathname!=='/'||db.search||db.hash||[HOST,CANONICAL].includes(db.hostname))throw stopError('Invalid fixed budget configuration.')
 const binding={host:HOST,database_origin:db.origin,max_requests:maxRequests}
 mkdirSync(dirname(path),{recursive:true})
 let queue=Promise.resolve()
 const execute=async(input,init={})=>{
  let url
  try{url=new URL(input instanceof Request?input.url:String(input))}catch{throw stopError('Invalid request URL.')}
  let lock
  try{lock=openSync(path+'.lock','wx',0o600)}catch{writeFileSync(path+'.stopped','Concurrent or interrupted source process; review required.',{mode:0o600});throw stopError('Concurrent or interrupted source process.')}
  let state
  try {
   if(existsSync(path+'.stopped'))throw stopError('A persisted source stop requires review.')
   try{state=existsSync(path)?readSourceBudget(path):{version:1,...binding,requests:0,last_started_ms:null,pending:false,stopped:null,events:[]}}
   catch{throw stopError('Malformed shared source receipt.')}
   if(state.version!==1||Object.entries(binding).some(([k,v])=>state[k]!==v)||!Number.isSafeInteger(state.requests)||state.requests<0||state.requests>maxRequests||!Array.isArray(state.events)||state.events.length!==state.requests||typeof state.pending!=='boolean'||(state.requests===0?state.last_started_ms!==null:!Number.isFinite(state.last_started_ms)))throw stopError('Changed or incomplete shared budget receipt.')
   const stop=reason=>{state.stopped=reason;state.pending=false;save(path,state);throw stopError(reason)}
   if(state.stopped)throw stopError(state.stopped)
   if(state.pending)stop('Prior source response is UNKNOWN; no automatic retry.')
   if(url.protocol!=='https:'||url.hostname!==HOST||url.port||url.username||url.password||url.hash)stop('Unreviewed source origin.')
   const method=String(init.method??(input instanceof Request?input.method:'GET')).toUpperCase()
   if(method!=='GET')stop('Only fixed provider GET requests are permitted.')
   for(let hop=0;hop<=1;hop++) {
    if(state.requests>=maxRequests)stop('Shared source request budget exhausted.')
    if(state.last_started_ms!==null){const delay=PACE_MS-(now()-state.last_started_ms);if(delay>0)await sleep(delay)}
    if(existsSync(path+'.stopped'))stop('Concurrent source request detected.')
    const started=now()
    if(!Number.isFinite(started)||state.last_started_ms!==null&&started<state.last_started_ms)stop('Invalid source clock.')
    state.requests++;state.last_started_ms=started;state.pending=true
    const event={sequence:state.requests,started_at:new Date(started).toISOString(),host:url.hostname,request_sha256:createHash('sha256').update(url.href).digest('hex'),status:'RUNNING'}
    state.events.push(event);save(path,state)
    let response
    try{response=await request(url,{method:'GET',redirect:'manual',headers:{'user-agent':'SLFF fantasy (https://slff.eu)'},signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)})}catch{event.status='UNKNOWN';stop('Source transport failure; response unknown.')}
    event.http_status=response.status
    if([301,302,307,308].includes(response.status)) {
     let target
     try{target=new URL(response.headers.get('location'),url)}catch{event.status='STOPPED';stop('Invalid canonical source redirect.')}
     if(hop!==0||url.hostname!==HOST||target.protocol!=='https:'||target.hostname!==CANONICAL||target.port||target.username||target.password||target.hash||target.pathname!==url.pathname||target.search!==url.search){event.status='STOPPED';stop('Unreviewed or repeated canonical source redirect.')}
     event.status='CANONICAL_REDIRECT';state.pending=false;save(path,state);await response.body?.cancel();url=target;continue
    }
    if(response.status!==200){event.status='STOPPED';stop(`Source HTTP ${response.status}; no source retry authorized.`)}
    let bytes
    try{bytes=await boundedSourceBody(response)}catch(error){event.status=error.sourceBodyLimit?'STOPPED':'UNKNOWN';stop(error.sourceBodyLimit?error.message:'Source response body failed.')}
    const body=new TextDecoder().decode(bytes)
    if(jeIzziv(body)||jePrijava(body)||/SQLSTATE|Too many connections/i.test(body)){event.status='STOPPED';stop('Source challenge, login or overload response.')}
    event.status='COMPLETED';event.original_bytes_sha256=createHash('sha256').update(bytes).digest('hex');event.completed_at=new Date(now()).toISOString();state.pending=false;save(path,state)
    const retained=new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers})
    Object.defineProperties(retained,{url:{value:response.url},redirected:{value:response.redirected}})
    return retained
   }
   stop('Canonical redirect bound exceeded.')
  }catch(error){
   if(!state?.stopped)writeFileSync(path+'.stopped','Source budget refusal or unknown state; review required.',{mode:0o600})
   if(error.code==='SLFF_SOURCE_STOP')throw error
   throw stopError('Source budget receipt failure.')
  }finally{closeSync(lock);unlinkSync(path+'.lock')}
 }
 return (input,init)=>{
  let url;try{url=new URL(input instanceof Request?input.url:String(input))}catch{return Promise.reject(stopError('Invalid request URL.'))}
  // Database calls keep their existing transaction/retry semantics and never enter source journals.
  if(url.origin===db.origin&&!url.username&&!url.password)return request(input,init)
  const result=queue.then(()=>execute(input,init));queue=result.catch(()=>{});return result
 }
}
if(process.env.SLFF_PROVIDER_BUDGET_PATH)globalThis.fetch=createBudgetFetch({path:process.env.SLFF_PROVIDER_BUDGET_PATH,maxRequests:Number(process.env.SLFF_PROVIDER_MAX_REQUESTS),databaseOrigin:process.env.SUPABASE_URL,fetch:globalThis.fetch})
