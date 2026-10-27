// Injected errors and fake fetch only; no federation request or admission proof.
import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
const api=await import('./lib/fussball-error-diagnostic.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const format=e=>{assert.equal(typeof api.formatFussballErrorDiagnostic,'function');return api.formatFussballErrorDiagnostic(e)}
const metadata=e=>JSON.parse(format(e).slice('fussball error diagnostic metadata: '.length))
test('nested Node/Undici cause codes survive without arbitrary message/address/stack data',()=>{
 const cause=Object.assign(new Error('SECRET address10.0.0.1'),{code:'UND_ERR_SOCKET',errno:'ECONNRESET',address:'SECRET',stack:'SECRET'})
 const e=new TypeError('fetch failed',{cause}),before=Object.getOwnPropertyDescriptors(e),m=metadata(e)
 assert.deepEqual(m,{version:1,errors:[{name:'TypeError'},{name:'Error',code:'UND_ERR_SOCKET',errno:'ECONNRESET'}],truncated:false})
 assert.doesNotMatch(format(e),/SECRET|10\.0\.0\.1|fetch failed|stack|address/);assert.deepEqual(Object.getOwnPropertyDescriptors(e),before)
})
test('aggregate causes and cycles remain bounded and deterministic',()=>{
 const a=Object.assign(new Error('hidden'),{code:'ENOTFOUND'}),b=Object.assign(new Error('hidden'),{code:'ETIMEDOUT'}),e=new AggregateError([a,b],'hidden',{cause:a});a.cause=e
 const output=format(e);assert.equal(output,format(e));assert.match(output,/ENOTFOUND/);assert.match(output,/ETIMEDOUT/);assert.ok(output.length<2048)
})
test('huge graphs are truncated and output has fixed bounds',()=>{
 const e=new AggregateError(Array.from({length:10000},()=>Object.assign(new Error('SECRET'),{code:'UND_ERR_CONNECT_TIMEOUT'})),'SECRET')
 const m=metadata(e);assert.equal(m.truncated,true);assert.ok(m.errors.length<=8);assert.ok(format(e).length<=2048);assert.doesNotMatch(format(e),/SECRET/)
 let chain=new Error();for(let i=0;i<100;i++)chain=new Error('',{cause:chain});assert.equal(metadata(chain).truncated,true)
})
test('unrecognized names/codes, getters and arbitrary object data are never exposed or invoked',()=>{
 let reads=0;const e={name:'SECRET',code:'SECRET',errno:-3008,message:'SECRET',stack:'SECRET',address:'SECRET'}
 Object.defineProperties(e,{cause:{get(){reads++;throw Error('SECRET')}},errors:{get(){reads++;throw Error('SECRET')}}})
 assert.equal(format(e),null);assert.equal(reads,0)
 const g={};for(const k of ['name','code','errno','cause','errors'])Object.defineProperty(g,k,{get(){reads++;throw Error('SECRET')}})
 assert.equal(format(g),null);assert.equal(reads,0)
 for(const value of [null,undefined,'SECRET',42])assert.equal(format(value),null)
})
test('HTTP refusal and challenge messages receive no invented network classification',()=>{
 for(const msg of ['source request failed (HTTP 403)','source challenge detected']){const m=metadata(new Error(msg));assert.deepEqual(m.errors,[{name:'Error'}]);assert.doesNotMatch(format(new Error(msg)),/network|403|challenge/)}
})
test('formatter preserves original stopped client throw, snapshot and counted no-retry failure',async()=>{
 const e=new TypeError('fetch failed',{cause:Object.assign(new Error('SECRET'),{code:'ECONNREFUSED'})});let calls=0
 const c=createFussballCaptureClient({maxRequests:2,fetchFn:async()=>{calls++;throw e}}),url='https://www.fussball.de/export.fontface/-/id/abcdefgh/type/css'
 await assert.rejects(c.read(url,'css'),x=>x===e);const before=c.snapshot();format(e);assert.deepEqual(c.snapshot(),before);assert.equal(before.requests,1);assert.equal(before.stopReason,'fetch failed');assert.deepEqual(Object.keys(before.attempts[0]).sort(),['error','kind','number','startedAt','status','url'])
 await assert.rejects(c.read(url,'css'),/client stopped/);assert.equal(calls,1)
})
for(const cli of ['zajemi-fussball-sezono.mjs','fussball-season-pilot.mjs'])test(`CLI ${cli} retains original message and emits nested diagnostic without changing evidence`,()=>{
 const dir=mkdtempSync(join(tmpdir(),'fussball-diagnostic-test-')),out=join(dir,'capture'),staffel='03188V27L800000JVS5489BTVU7GTVLE-G',url='https://www.fussball.de/spieltag/-/staffel/'+staffel
 try{
  const args=cli.startsWith('zajemi')?['capture','--seed-url',url,'--staffel',staffel,'--season','2026/27','--max-requests','1','--reports','all','--output',out]:['capture-current',out]
  const code=`globalThis.fetch=async()=>{throw new TypeError('fetch failed',{cause:Object.assign(new Error('SECRET'),{code:'ENOTFOUND',address:'SECRET'})})};process.argv=${JSON.stringify([process.execPath,resolve('scripts',cli),...args])};await import(${JSON.stringify(pathToFileURL(resolve('scripts',cli)).href)})`
  const env={...process.env,ARCHIVE_JSON:'',ROLLOUT_CANDIDATE:'',FUSSBALL_COMPLETION_PRESET:'',MAX_REQUESTS:'1',REPORTS:'all',SEED_URL:url,STAFFEL:staffel,SEASON:'2026/27'}
  const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env,timeout:10000});assert.equal(r.status,1,r.stderr);assert.match(r.stderr,/^fetch failed\n/);assert.match(r.stderr,/fussball error diagnostic metadata: .*ENOTFOUND/);assert.doesNotMatch(r.stderr,/SECRET/)
  const m=JSON.parse(readFileSync(join(out,'manifest.json')));assert.equal(m.error,'fetch failed');assert.equal(m.success,false);assert.equal(m.snapshot.requests,1);assert.equal(m.snapshot.stopReason,'fetch failed');assert.equal(Object.hasOwn(m,'diagnostic'),false);assert.equal(Object.hasOwn(m.snapshot.attempts[0],'cause'),false)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('native timeout name is retained without invoking user name getters',()=>{
 assert.deepEqual(metadata(new DOMException('SECRET','TimeoutError')).errors,[{name:'TimeoutError'}])
})
test('hostile revoked aggregate cannot replace original logging',()=>{
 const revoked=Proxy.revocable([],{});revoked.revoke()
 const e=new Error('fetch failed');e.errors=revoked.proxy
 assert.doesNotThrow(()=>format(e));assert.match(format(e),/"name":"Error"/)
})
