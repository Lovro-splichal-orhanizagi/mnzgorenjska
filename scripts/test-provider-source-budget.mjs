import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createBudgetFetch} from './provider-source-budget.mjs'
function fixture(options={}) {
 const dir=mkdtempSync(join(tmpdir(),'provider-budget-')),path=join(dir,'budget.json'),calls=[],sleeps=[];let time=1_000
 const request=async(url,init)=>{calls.push({url:String(url),init});return new Response('<div id="match_panel"></div>')}
 const opts={path,maxRequests:3,databaseOrigin:'https://db.fixture.invalid',fetch:request,now:()=>time,sleep:async ms=>{sleeps.push(ms);time+=ms},...options}
 return {path,calls,sleeps,opts,fetch:createBudgetFetch(opts),dispose:()=>rmSync(dir,{recursive:true,force:true})}
}
test('shared budget counts actual source requests across child instances and enforces pacing',async()=>{
 const f=fixture();try{
  await f.fetch('https://adatbank.mlsz.hu/league/67/14/34252/1.html')
  await createBudgetFetch(f.opts)('https://adatbank.mlsz.hu/match/67/14/34252/1/1.html')
  assert.equal(f.calls.length,2);assert.deepEqual(f.sleeps,[1500]);assert.equal(JSON.parse(readFileSync(f.path)).requests,2)
  assert.ok(f.calls.every(c=>c.init.redirect==='manual'));assert.ok(f.calls.every(c=>new Headers(c.init.headers).get('user-agent')==='SLFF fantasy (https://slff.eu)'))
 }finally{f.dispose()}
})
test('exact database origin is exempt while alternate origins and non-GET source fail closed',async()=>{
 const f=fixture();try{
  await f.fetch('https://db.fixture.invalid/rest/v1/players',{method:'POST',headers:{Authorization:'Bearer secret'},body:'{}'})
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].init.method,'POST')
  for(const url of ['https://ada1bank.mlsz.hu/league/1','https://evil.invalid/','http://adatbank.mlsz.hu/'])await assert.rejects(()=>f.fetch(url),/source|origin|stopped/i)
  assert.equal(f.calls.length,1)
 }finally{f.dispose()}
})
for(const status of [301,401,403,429,500,503])test(`HTTP ${status} persists stop and suppresses generic retries`,async()=>{
 let count=0;const f=fixture({fetch:async()=>{count++;return new Response('denied',{status,headers:{location:'https://ada1bank.mlsz.hu/'}})}})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'),/source/i);await assert.rejects(()=>createBudgetFetch(f.opts)('https://adatbank.mlsz.hu/league/2'),/stopped/i);assert.equal(count,1);assert.ok(JSON.parse(readFileSync(f.path)).stopped)}finally{f.dispose()}
})
for(const body of ['<title>Just a moment</title>','<form><input type="password"></form>','SQLSTATE[08004] Too many connections'])test('challenge/login/overload HTTP200 persists stop',async()=>{
 let count=0;const f=fixture({fetch:async()=>{count++;return new Response(body)}})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'),/source/i);await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/2'),/stopped/i);assert.equal(count,1)}finally{f.dispose()}
})
test('transport ambiguity persists stop before another process can retry',async()=>{
 let count=0;const f=fixture({fetch:async()=>{count++;throw TypeError('fetch failed')}})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'));await assert.rejects(()=>createBudgetFetch(f.opts)('https://adatbank.mlsz.hu/league/2'),/stopped/i);assert.equal(count,1)}finally{f.dispose()}
})
test('request ceiling is enforced before outgoing request and does not expose credentials',async()=>{
 const f=fixture({maxRequests:1});try{await f.fetch('https://adatbank.mlsz.hu/league/1');await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/2'),/budget/i);assert.equal(f.calls.length,1);assert.doesNotMatch(readFileSync(f.path,'utf8'),/Bearer|secret|Authorization/)}finally{f.dispose()}
})
test('concurrent requests serialize starts and invalid request limits fail closed',async()=>{
 const f=fixture();try{await Promise.all([f.fetch('https://adatbank.mlsz.hu/league/1'),f.fetch('https://adatbank.mlsz.hu/league/2')]);assert.deepEqual(f.sleeps,[1500]);assert.equal(f.calls.length,2)}finally{f.dispose()}
 for(const maxRequests of [0,1001,1.2,NaN])assert.throws(()=>createBudgetFetch({path:'/tmp/not-created.json',maxRequests,databaseOrigin:'https://db.fixture.invalid',fetch:async()=>{}}))
})
test('documented canonical redirect is exactly one paced counted hop and strips source auth',async()=>{
 const calls=[],f=fixture({fetch:async(url,init)=>{calls.push({url:String(url),init});return calls.length===1?new Response(null,{status:302,headers:{location:'https://ada1bank.mlsz.hu/league/67/14/34252/1.html?x=1'}}):new Response('<div id="match_panel"></div>')}})
 try{await f.fetch('https://adatbank.mlsz.hu/league/67/14/34252/1.html?x=1',{headers:{Authorization:'secret',Cookie:'secret'}});assert.equal(calls.length,2);assert.deepEqual(f.sleeps,[1500]);assert.equal(JSON.parse(readFileSync(f.path)).requests,2);assert.ok(calls.every(c=>!new Headers(c.init.headers).has('authorization')&&!new Headers(c.init.headers).has('cookie')))}finally{f.dispose()}
})
for(const location of ['https://evil.invalid/league/1','https://ada1bank.mlsz.hu/login','https://ada1bank.mlsz.hu/league/1?changed=1','https://user:secret@ada1bank.mlsz.hu/league/1','https://ada1bank.mlsz.hu/league/1#changed'])test('foreign/login/path/query/userinfo/hash canonical redirects fail before second outgoing request',async()=>{
 let count=0;const f=fixture({fetch:async()=>{count++;return new Response(null,{status:302,headers:{location}})}})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'),/redirect/i);assert.equal(count,1)}finally{f.dispose()}
})
test('second canonical hop cannot reverse or redirect again',async()=>{
 let count=0;const f=fixture({fetch:async()=>{count++;return new Response(null,{status:302,headers:{location:count===1?'https://ada1bank.mlsz.hu/league/1':'https://adatbank.mlsz.hu/league/1'}})}})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'),/redirect/i);assert.equal(count,2)}finally{f.dispose()}
})
test('missing shared pacing timestamp cannot silently allow another source request',async()=>{
 const {writeFileSync}=await import('node:fs'),f=fixture()
 try{await f.fetch('https://adatbank.mlsz.hu/league/1');const state=JSON.parse(readFileSync(f.path));delete state.last_started_ms;writeFileSync(f.path,JSON.stringify(state));await assert.rejects(()=>createBudgetFetch(f.opts)('https://adatbank.mlsz.hu/league/2'),/receipt|stopped/i);assert.equal(f.calls.length,1)}finally{f.dispose()}
})

test('oversized streaming source bodies are cancelled before the full response is buffered',async()=>{
 let chunks=0,cancelled=false,calls=0
 const stream=new ReadableStream({pull(controller){chunks++;if(chunks<=144)controller.enqueue(new Uint8Array(64*1024).fill(32));else controller.close()},cancel(){cancelled=true}})
 const f=fixture({fetch:async()=>{calls++;return new Response(stream)}})
 try{
  await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'),/source/i)
  assert.equal(cancelled,true);assert.ok(chunks<=66,`read ${chunks} chunks instead of stopping at the 4MiB bound`)
  const state=JSON.parse(readFileSync(f.path));assert.equal(state.requests,1);assert.equal(state.pending,false);assert.ok(state.stopped)
  await assert.rejects(()=>createBudgetFetch(f.opts)('https://adatbank.mlsz.hu/league/2'),/stopped/i);assert.equal(calls,1)
 }finally{f.dispose()}
})
test('declared oversized source body is cancelled without consuming it',async()=>{
 let cancelled=false,chunks=0
 const stream=new ReadableStream({pull(controller){chunks++;if(chunks<=144)controller.enqueue(new Uint8Array(64*1024));else controller.close()},cancel(){cancelled=true}})
 const f=fixture({fetch:async()=>new Response(stream,{headers:{'content-length':String(9*1024*1024)}})})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/league/1'),/source/i);assert.equal(cancelled,true);assert.ok(chunks<=1)}finally{f.dispose()}
})
test('bounded source bytes remain readable by the native importer',async()=>{
 const body='<div id="match_panel">Árvíztűrő</div>',f=fixture({fetch:async()=>new Response(body,{headers:{'content-type':'text/html; charset=utf-8'}})})
 try{const response=await f.fetch('https://adatbank.mlsz.hu/league/1');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');assert.equal(await response.text(),body)}finally{f.dispose()}
})
