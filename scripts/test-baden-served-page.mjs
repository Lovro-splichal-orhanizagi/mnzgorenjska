import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const fixture=String.raw`
import assert from 'node:assert/strict'
import https from 'node:https'
import {EventEmitter} from 'node:events'
import {pathToFileURL} from 'node:url'
const requests=[],timeoutControllers=[],scenarios=[]
const oldGet=https.get,oldTimeout=AbortSignal.timeout,oldFetch=globalThis.fetch
let globalFetchCalls=0
globalThis.fetch=()=>{globalFetchCalls++;throw Error('GLOBAL_FETCH_USED')}
AbortSignal.timeout=ms=>{const c=new AbortController();timeoutControllers.push({ms,c});return c.signal}
https.get=(target,options,callback)=>{
 const scenario=scenarios.shift()??{status:200,body:Buffer.from('<meta name="slff-commit" content="'+"a".repeat(40)+'">')}
 const req=new EventEmitter();req.options=options;req.setTimeout=ms=>{req.timeoutMs=ms};req.destroy=error=>{if(error)queueMicrotask(()=>req.emit('error',error))}
 const call={target,options,req,requestId:requests.length};requests.push(call)
 options.signal?.addEventListener('abort',()=>req.destroy(Object.assign(Error('secret abort'),{code:'ABORT_ERR'})),{once:true})
 queueMicrotask(()=>{
  if(scenario.networkError){req.emit('error',Object.assign(Error('SECRET_EPIPE_DETAILS'),{code:'EPIPE'}));return}
  const res=new EventEmitter();res.statusCode=scenario.status??200;res.destroy=error=>{if(error)queueMicrotask(()=>res.emit('error',error))}
  callback(res)
  if(scenario.abort)queueMicrotask(()=>timeoutControllers.at(-1).c.abort())
  else queueMicrotask(()=>{res.emit('data',scenario.body??Buffer.from('body'));res.emit('end')})
 })
 return req
}
try{
 const {fetchBadenServedPage}=await import(pathToFileURL(process.cwd()+'/scripts/lib/baden-served-page.mjs'))
 const input=()=>({headers:{'Cache-Control':'no-cache'},redirect:'error',signal:new AbortController().signal})
 const goodBody=Buffer.from('<meta name="slff-commit" content="'+"a".repeat(40)+'">');scenarios.push({body:goodBody},{body:goodBody});const a=await fetchBadenServedPage('https://slff.eu/',input()),at=await a.text(),b=await fetchBadenServedPage('https://slff.eu/',input()),bt=await b.text()
 scenarios.push({status:302,body:Buffer.from('redirect body')});const redir=await fetchBadenServedPage('https://slff.eu/',input()),redirectText=await redir.text()
 scenarios.push({networkError:true});let networkError;try{await fetchBadenServedPage('https://slff.eu/',input())}catch(e){networkError={name:e.name,code:e.code,message:e.message}}
 scenarios.push({abort:true});let timeoutError;try{const timed=await fetchBadenServedPage('https://slff.eu/',input());await timed.text()}catch(e){timeoutError={name:e.name,code:e.code,message:e.message}}
 scenarios.push({body:Buffer.alloc(4*1024*1024+1,120)});const large=await fetchBadenServedPage('https://slff.eu/',input());let boundError;try{await large.text()}catch(e){boundError={name:e.name,code:e.code,message:e.message}}
 const before=requests.length;let urlError,optionError;try{await fetchBadenServedPage('https://provider.example/',input())}catch(e){urlError={code:e.code,message:e.message}}try{await fetchBadenServedPage('https://slff.eu/',{...input(),redirect:'follow'})}catch(e){optionError={code:e.code,message:e.message}}
 process.stdout.write(JSON.stringify({baseStatus:a.status,baseOk:a.ok,baseText:at,secondStatus:b.status,secondText:bt,redirectStatus:redir.status,redirectOk:redir.ok,redirectText,requests:requests.map(x=>({target:x.target,agent:x.options.agent,headers:x.options.headers,hasRejectUnauthorized:Object.hasOwn(x.options,'rejectUnauthorized'),rejectUnauthorized:x.options.rejectUnauthorized,hasCustomCa:Object.hasOwn(x.options,'ca'),timeoutMs:x.req.timeoutMs,requestId:x.requestId})),timeouts:timeoutControllers.map(x=>x.ms),networkError,timeoutError,boundError,urlError,optionError,unsafeCalls:requests.length-before,globalFetchCalls}))
}finally{https.get=oldGet;AbortSignal.timeout=oldTimeout;globalThis.fetch=oldFetch}
`

test('fixed served-page transport uses fresh strict HTTPS requests with safe errors and hard bounds',()=>{
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',fixture],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8',timeout:10000}))
 assert.equal(result.baseStatus,200);assert.equal(result.baseOk,true);assert.match(result.baseText,/slff-commit/)
 assert.equal(result.secondStatus,200);assert.equal(result.secondText,result.baseText)
 assert.equal(result.redirectStatus,302);assert.equal(result.redirectOk,false);assert.equal(result.redirectText,'redirect body')
 assert.equal(result.requests.length,6)
 assert.deepEqual(result.requests.slice(0,3).map(x=>x.target),Array(3).fill('https://slff.eu/'))
 assert.ok(result.requests.every(x=>x.agent===false&&x.headers['Cache-Control']==='no-cache'&&x.headers.Connection==='close'&&x.timeoutMs===30000&&!x.hasCustomCa&&x.rejectUnauthorized===true))
 assert.equal(new Set(result.requests.map(x=>x.requestId)).size,result.requests.length)
 assert.ok(result.timeouts.every(ms=>ms===30000));assert.equal(result.globalFetchCalls,0)
 assert.deepEqual(result.networkError,{name:'Error',code:'OWN_FETCH_NETWORK_FAILED',message:'Baden served page unavailable'})
 assert.deepEqual(result.timeoutError,{name:'TimeoutError',code:'OWN_FETCH_TIMEOUT',message:'Baden served page unavailable'})
 assert.deepEqual(result.boundError,{name:'Error',code:'OWN_FETCH_BODY_BOUND',message:'Baden served page unavailable'})
 assert.ok(!JSON.stringify(result).includes('SECRET'))
 assert.deepEqual(result.urlError,{code:'OWN_SERVED_URL_REFUSED',message:'Baden served page unavailable'})
 assert.deepEqual(result.optionError,{code:'OWN_SERVED_OPTIONS_REFUSED',message:'Baden served page unavailable'})
 assert.equal(result.unsafeCalls,0)
})
