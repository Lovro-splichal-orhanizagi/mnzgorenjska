import test from 'node:test'
import assert from 'node:assert/strict'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import * as retry from './lib/fussball-v4-retry.mjs'
const url='https://www.fussball.de/export.fontface/-/id/abcdefgh/type/css'
const transient=()=>new TypeError('fetch failed',{cause:new AggregateError([Object.assign(new Error('untrusted text'),{code:'ETIMEDOUT'}),Object.assign(new Error('other'),{code:'ENETUNREACH'})],'untrusted aggregate',{cause:undefined})})
const context=()=>{let clock=Date.parse('2026-10-28T02:00:00Z');return{now:()=>clock,sleep:async ms=>{clock+=ms}}}
test('v4 typed connect timeout then recovery counts two same-URL GETs with pacing and outcomes',async()=>{
 assert.ok(retry.FUSSBALL_V4_RETRY_POLICY)
 const ctx=context(),starts=[],outcomes=[];let calls=0
 const c=createFussballCaptureClient({maxRequests:3,...ctx,retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,onOutcome:o=>outcomes.push(o),fetchFn:async(u,o)=>{assert.equal(u,url);assert.equal(o.headers['User-Agent'],'SLFF fantasy (https://slff.eu)');starts.push(ctx.now());if(++calls===1)throw transient();return new Response('body',{headers:{'content-type':'text/css'}})}})
 assert.equal(Buffer.from((await c.read(url,'css')).bytes).toString(),'body')
 assert.equal(c.snapshot().requests,2);assert.equal(c.snapshot().stopped,false);assert.deepEqual(c.snapshot().attempts.map(a=>a.status),['failed','success'])
 assert.equal(starts[1]-starts[0]>=6000,true);assert.equal(outcomes.length,2);assert.deepEqual(outcomes.map(o=>o.number),[1,2]);assert.equal(outcomes[0].status,'failed')
})
test('ordinary client still stops after its first transient failure',async()=>{
 let calls=0;const c=createFussballCaptureClient({maxRequests:3,...context(),fetchFn:async()=>{calls++;throw transient()}})
 await assert.rejects(c.read(url,'css'));assert.equal(calls,1)
})

for(const code of ['ETIMEDOUT','ENETUNREACH','ECONNRESET','EAI_AGAIN'])test(`closed typed ${code} can recover once without retaining error text`,async()=>{
 let calls=0;const outcomes=[],c=createFussballCaptureClient({maxRequests:3,...context(),retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,onOutcome:o=>outcomes.push(o),fetchFn:async()=>{if(++calls===1)throw new TypeError('SECRET',{cause:Object.assign(new Error('SECRET'),{code})});return new Response('ok',{headers:{'content-type':'text/css'}})}})
 await c.read(url,'css');assert.equal(calls,2);assert.equal(JSON.stringify(outcomes).includes('SECRET'),false)
})
for(const [name,error]of [
 ['unknown',()=>new Error('unknown')],['message-only timeout',()=>new TypeError('ETIMEDOUT fetch failed')],['untyped abort',()=>new DOMException('abort','AbortError')],['unsupported code',()=>new TypeError('fetch failed',{cause:Object.assign(new Error('no'),{code:'EPERM'})})],['truncated chain',()=>new TypeError('fetch failed',{cause:new AggregateError(Array.from({length:5},()=>Object.assign(new Error('no'),{code:'ETIMEDOUT'})))})],['parser error',()=>Object.assign(new Error('parser'),{code:'FUSSBALL_REPORT_INVALID'})],
])test(`${name} is terminal without retry`,async()=>{let calls=0;const c=createFussballCaptureClient({maxRequests:10,...context(),retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,fetchFn:async()=>{calls++;throw error()}});await assert.rejects(c.read(url,'css'));assert.equal(calls,1);assert.equal(c.snapshot().stopped,true)})
for(const status of [403,429,500])test(`HTTP${status} never retries`,async()=>{let calls=0;const c=createFussballCaptureClient({maxRequests:10,...context(),retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,fetchFn:async()=>{calls++;return new Response('refused',{status,headers:{'content-type':'text/css'}})}});await assert.rejects(c.read(url,'css'));assert.equal(calls,1)})
test('challenge and response-body failure are terminal even with typed error',async()=>{
 const round='https://www.fussball.de/spieltag/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G'
 for(const body of ['<title>Just a moment</title>',new ReadableStream({start(c){c.error(new TypeError('body timeout',{cause:Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})}))}})]){
  let calls=0;const c=createFussballCaptureClient({maxRequests:10,...context(),retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,fetchFn:async()=>{calls++;return new Response(body,{headers:{'content-type':'text/html'}})}})
  await assert.rejects(c.read(round,'round'));assert.equal(calls,1)
 }
})
for(const [budget,count]of[[2,2],[10,3]])test(`failed retries respect cap${budget} and fixed maximum3`,async()=>{
 const ctx=context(),starts=[],events=[];const c=createFussballCaptureClient({maxRequests:budget,...ctx,retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,onAttempt:a=>events.push(`intent${a.number}`),onOutcome:a=>events.push(`outcome${a.number}`),fetchFn:async()=>{starts.push(ctx.now());throw transient()}})
 await assert.rejects(c.read(url,'css'));assert.equal(c.snapshot().requests,count);assert.equal(c.snapshot().stopped,true);assert.deepEqual(events,Array.from({length:count},(_,i)=>[`intent${i+1}`,`outcome${i+1}`]).flat());assert.deepEqual(starts.map(t=>t-starts[0]),count===2?[0,6000]:[0,6000,18000])
})
test('JSON policy flag and unknown retry policy cannot enable retries',()=>{
 for(const retryPolicy of [{...retry.FUSSBALL_V4_RETRY_POLICY},true,'baden-v4-transient-v1'])assert.throws(()=>createFussballCaptureClient({maxRequests:3,retryPolicy}),/fixed retry policy/)
})
test('failed outcome persistence stops the queue before any retry',async()=>{
 let calls=0;const c=createFussballCaptureClient({maxRequests:3,...context(),retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,onOutcome:()=>{throw Error('outcome journal unavailable')},fetchFn:async()=>{calls++;throw transient()}})
 await assert.rejects(c.read(url,'css'),/journal/);await assert.rejects(c.read(url,'css'),/stopped/);assert.equal(calls,1)
})

test('unknown TypeError subclass cannot impersonate a native connect failure',async()=>{
 class UnknownTransportError extends TypeError{}
 let calls=0;const c=createFussballCaptureClient({maxRequests:3,...context(),retryPolicy:retry.FUSSBALL_V4_RETRY_POLICY,fetchFn:async()=>{if(++calls===1)throw new UnknownTransportError('unknown class',{cause:Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})});return new Response('ok',{headers:{'content-type':'text/css'}})}})
 await assert.rejects(c.read(url,'css'));assert.equal(calls,1)
})
