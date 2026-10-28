import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import vm from 'node:vm'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {FUSSBALL_V4_RETRY_POLICY,fussballV4TransportFailure,restoreFussballV4TransportFailure} from './lib/fussball-v4-retry.mjs'

// No DNS resolver, external socket, HTTP request or listening server. Closed
// loopback port 1 produces actual Node socket errors, not source evidence.
const native=await new Promise((resolve,reject)=>{
 const socket=net.createConnection({host:'loopback-only.invalid',port:1,autoSelectFamily:true,
  lookup:(_host,options,callback)=>{assert.equal(options.all,true);callback(null,[{address:'::1',family:6},{address:'127.0.0.1',family:4}])}})
 socket.once('error',resolve)
 socket.once('connect',()=>{socket.destroy();reject(Error('test requires closed loopback port 1'))})
 socket.setTimeout(2000,()=>{socket.destroy();reject(Error('loopback probe exceeded bound'))})
})
const wrap=cause=>new TypeError('fetch failed',{cause})
const timeout=()=>Object.assign(new Error('PRIVATE'),{code:'ETIMEDOUT'})
const expected={version:1,chain:{name:'TypeError',cause:{name:'AggregateError',code:'ETIMEDOUT',errors:[{name:'Error',code:'ETIMEDOUT'},{name:'Error',code:'ENETUNREACH'}]}}}
const nativeAggregatePrototype=Object.getPrototypeOf(native),nativeChildPrototype=Object.getPrototypeOf(native.errors[0])
const clonePrototype=p=>Object.create(Object.getPrototypeOf(p),Object.getOwnPropertyDescriptors(p))
const withPrototype=p=>wrap(Object.setPrototypeOf(timeout(),p))

test('actual untouched native ECONNREFUSED remains terminal despite native prototype compatibility',()=>{
 assert.ok(native instanceof AggregateError)
 assert.notEqual(nativeAggregatePrototype,AggregateError.prototype)
 assert.equal(Object.getPrototypeOf(nativeAggregatePrototype),AggregateError.prototype)
 assert.deepEqual(native.errors.map(e=>e.code),['ECONNREFUSED','ECONNREFUSED'])
 assert.deepEqual(native.errors.map(e=>e.address),['::1','127.0.0.1'])
 assert.equal(fussballV4TransportFailure(wrap(native)),null)
})

test('TEST CONTROL native wrappers with allowed codes canonicalize and recover through counted paced client',async()=>{
 // Change code values only, retaining the actual native aggregate/children.
 // This does not claim a native timeout or production-error prototype capture.
 native.code='ETIMEDOUT';native.errors[0].code='ETIMEDOUT';native.errors[1].code='ENETUNREACH'
 const failure=wrap(native),evidence=fussballV4TransportFailure(failure)
 assert.deepEqual(evidence,expected)
 assert.deepEqual(fussballV4TransportFailure(restoreFussballV4TransportFailure(evidence)),expected)
 let clock=Date.parse('2026-10-28T02:00:00Z'),calls=0
 const starts=[],events=[],outcomes=[]
 const url='https://www.fussball.de/export.fontface/-/id/abcdefgh/type/css'
 const client=createFussballCaptureClient({maxRequests:3,retryPolicy:FUSSBALL_V4_RETRY_POLICY,
  now:()=>clock,sleep:async ms=>{clock+=ms},onAttempt:a=>events.push(`intent${a.number}`),
  onOutcome:a=>{events.push(`outcome${a.number}`);outcomes.push(a)},fetchFn:async requested=>{
   assert.equal(requested,url);starts.push(clock)
   if(++calls===1)throw failure
   return new Response('body',{headers:{'content-type':'text/css'}})
  }})
 assert.equal(Buffer.from((await client.read(url,'css')).bytes).toString(),'body')
 assert.equal(calls,2);assert.equal(client.snapshot().requests,2);assert.equal(client.snapshot().stopped,false)
 assert.deepEqual(starts.map(t=>t-starts[0]),[0,6000])
 assert.deepEqual(events,['intent1','outcome1','intent2','outcome2'])
 assert.deepEqual(outcomes.map(a=>a.status),['failed','success'])
 assert.deepEqual(outcomes[0].transportFailure,expected)
 assert.equal(JSON.stringify(outcomes).includes('PRIVATE'),false)
 assert.equal(JSON.stringify(evidence).includes('127.0.0.1'),false)
 assert.equal(JSON.stringify(evidence).includes('stack'),false)
})

test('ordinary canonical AggregateError graph retains identical transport evidence',()=>{
 const aggregate=Object.assign(new AggregateError([timeout(),Object.assign(new Error('PRIVATE'),{code:'ENETUNREACH'})],'PRIVATE'),{code:'ETIMEDOUT'})
 assert.deepEqual(fussballV4TransportFailure(wrap(aggregate)),expected)
})

test('identical transparent descriptor clones canonicalize only to existing typed evidence',()=>{
 const child=Object.setPrototypeOf(timeout(),clonePrototype(nativeChildPrototype))
 const aggregate=Object.setPrototypeOf(Object.assign(new AggregateError([child]),{code:'ETIMEDOUT'}),clonePrototype(nativeAggregatePrototype))
 assert.deepEqual(fussballV4TransportFailure(wrap(aggregate)),{version:1,chain:{name:'TypeError',cause:{name:'AggregateError',code:'ETIMEDOUT',errors:[{name:'Error',code:'ETIMEDOUT'}]}}})
})

test('wrong constructor, arbitrary getters and altered descriptor attributes never execute or classify',()=>{
 let getterCalls=0
 const wrongGetter={get constructor(){getterCalls++;return Error}}
 const descriptor=Object.getOwnPropertyDescriptor(nativeChildPrototype,'constructor')
 for(const constructor of [
  {value:Error,writable:true,enumerable:false,configurable:true},
  {value:AggregateError,writable:true,enumerable:false,configurable:true},
  Object.getOwnPropertyDescriptor(nativeAggregatePrototype,'constructor'),
  Object.getOwnPropertyDescriptor(wrongGetter,'constructor'),
  {...descriptor,enumerable:true},{...descriptor,configurable:false},
  {...descriptor,set:()=>{getterCalls++}},
  {...descriptor,get:new Proxy(descriptor.get,{apply(){getterCalls++;return Error}})},
 ]){
  const p=Object.create(Error.prototype,{constructor})
  assert.equal(fussballV4TransportFailure(withPrototype(p)),null)
 }
 assert.equal(getterCalls,0)
})

test('extra shim keys, symbols, extra prototype layer, foreign realm and proxies remain unsupported',()=>{
 const extra=clonePrototype(nativeChildPrototype);extra.extra=true
 const symbol=clonePrototype(nativeChildPrototype);symbol[Symbol('other')]=true
 const knownSymbol=clonePrototype(nativeChildPrototype)
 Object.defineProperty(knownSymbol,Symbol('kIsNodeError'),{get(){throw Error('untrusted marker')},configurable:true})
 const double=Object.create(nativeChildPrototype,Object.getOwnPropertyDescriptors(nativeChildPrototype))
 const foreign=vm.runInNewContext('Object.getPrototypeOf(new Error())')
 const proxyPrototype=new Proxy(nativeChildPrototype,{getPrototypeOf(){throw Error('proxy trap')}})
 for(const p of [extra,symbol,knownSymbol,double,foreign,proxyPrototype])assert.equal(fussballV4TransportFailure(withPrototype(p)),null)
 const proxyError=new Proxy(timeout(),{getPrototypeOf(){throw Error('proxy trap')}})
 assert.equal(fussballV4TransportFailure(wrap(proxyError)),null)
 assert.equal(fussballV4TransportFailure(new Proxy(wrap(timeout()),{getPrototypeOf(){throw Error('proxy trap')}})),null)
 class OtherError extends Error{}
 assert.equal(fussballV4TransportFailure(wrap(Object.assign(new OtherError(),{code:'ETIMEDOUT'}))),null)
})

test('native aggregate shim rejects extra/changed marker descriptors without executing getters',()=>{
 const marker=Reflect.ownKeys(nativeAggregatePrototype).find(k=>typeof k==='symbol')
 assert.ok(marker)
 let getterCalls=0
 for(const mutate of [p=>{p.extra=true},p=>{p[Symbol('other')]=true},p=>{
  Object.defineProperty(p,marker,{get(){getterCalls++;return true},configurable:true})
 },p=>Object.defineProperty(p,'constructor',{value:AggregateError,configurable:true})]){
  const p=clonePrototype(nativeAggregatePrototype);mutate(p)
  const e=Object.setPrototypeOf(Object.assign(new AggregateError([timeout()]),{code:'ETIMEDOUT'}),p)
  assert.equal(fussballV4TransportFailure(wrap(e)),null)
 }
 assert.equal(getterCalls,0)
})

test('native-compatible prototypes do not bypass strict outer TypeError, cycles or graph bounds',()=>{
 const e=Object.setPrototypeOf(timeout(),nativeChildPrototype)
 e.cause=e;assert.equal(fussballV4TransportFailure(wrap(e)),null)
 const large=Object.setPrototypeOf(new AggregateError(Array.from({length:5},timeout)),nativeAggregatePrototype)
 assert.equal(fussballV4TransportFailure(wrap(large)),null)
 let deep=timeout();for(let i=0;i<5;i++)deep=Object.assign(new Error(),{cause:deep})
 assert.equal(fussballV4TransportFailure(wrap(deep)),null)
 class UnknownTransportError extends TypeError{}
 assert.equal(fussballV4TransportFailure(new UnknownTransportError('unknown',{cause:timeout()})),null)
})
