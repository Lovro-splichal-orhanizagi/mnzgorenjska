import https from 'node:https'

const servedURL='https://slff.eu/',bodyLimit=4*1024*1024,deadlineMs=30000
const safeError=code=>Object.assign(Error('Baden served page unavailable'),{name:code==='OWN_FETCH_TIMEOUT'?'TimeoutError':'Error',code})
const object=v=>v!==null&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype

function validate(input,options){
 if(input!==servedURL)throw safeError('OWN_SERVED_URL_REFUSED')
 if(!object(options)||Object.keys(options).sort().join(',')!=='headers,redirect,signal'||options.redirect!=='error'||!object(options.headers)||Object.keys(options.headers).join(',')!=='Cache-Control'||options.headers['Cache-Control']!=='no-cache'||!(options.signal instanceof AbortSignal))throw safeError('OWN_SERVED_OPTIONS_REFUSED')
}

function transportCode(error){
 if(error?.code==='OWN_FETCH_BODY_BOUND')return 'OWN_FETCH_BODY_BOUND'
 if(error?.name==='TimeoutError'||error?.name==='AbortError'||error?.code==='ABORT_ERR')return 'OWN_FETCH_TIMEOUT'
 return 'OWN_FETCH_NETWORK_FAILED'
}

/** Fixed own-site GET with a fresh socket, strict TLS, and a bounded response body. */
export function fetchBadenServedPage(input,options){
 validate(input,options)
 const deadline=AbortSignal.any([options.signal,AbortSignal.timeout(deadlineMs)])
 return new Promise((resolve,reject)=>{
  let request,headersSettled=false,bodySettled=false,bodyResolve,bodyReject,timer,cleaned=false
  const body=new Promise((res,rej)=>{bodyResolve=res;bodyReject=rej})
  // A non-2xx caller may not read text(); keep the background drain rejection handled.
  body.catch(()=>{})
  const cleanup=()=>{if(cleaned)return;cleaned=true;clearTimeout(timer);deadline.removeEventListener('abort',onAbort)}
  const settleBeforeHeaders=error=>{if(headersSettled)return;headersSettled=true;cleanup();reject(error)}
  const settleBody=(error,value)=>{if(bodySettled)return;bodySettled=true;cleanup();if(error)bodyReject(error);else bodyResolve(value)}
  const fail=code=>{
   const error=safeError(code)
   if(!headersSettled)settleBeforeHeaders(error);else settleBody(error)
   try{request?.destroy()}catch{}
  }
  const onAbort=()=>fail('OWN_FETCH_TIMEOUT')
  if(deadline.aborted){settleBeforeHeaders(safeError('OWN_FETCH_TIMEOUT'));return}
  deadline.addEventListener('abort',onAbort,{once:true})
  timer=setTimeout(()=>fail('OWN_FETCH_TIMEOUT'),deadlineMs)
  try{
   request=https.get(servedURL,{agent:false,rejectUnauthorized:true,signal:deadline,headers:{'Cache-Control':'no-cache',Connection:'close'}},response=>{
    const status=response.statusCode
    if(!Number.isInteger(status)||status<100||status>599){fail('OWN_FETCH_NETWORK_FAILED');return}
    let size=0;const chunks=[]
    response.on('data',chunk=>{
     if(bodySettled)return
     size+=chunk.length
     if(size>bodyLimit){settleBody(safeError('OWN_FETCH_BODY_BOUND'));try{response.destroy();request.destroy()}catch{};return}
     chunks.push(Buffer.from(chunk))
    })
    response.once('error',error=>settleBody(safeError(transportCode(error))))
    response.once('end',()=>settleBody(null,Buffer.concat(chunks).toString('utf8')))
    headersSettled=true
    resolve(Object.freeze({ok:status>=200&&status<300,status,text:()=>body}))
   })
   request.once('error',error=>{
    const failure=safeError(transportCode(error))
    if(!headersSettled)settleBeforeHeaders(failure);else settleBody(failure)
   })
   request.setTimeout(deadlineMs,()=>fail('OWN_FETCH_TIMEOUT'))
  }catch(error){settleBeforeHeaders(safeError(transportCode(error)))}
 })
}
