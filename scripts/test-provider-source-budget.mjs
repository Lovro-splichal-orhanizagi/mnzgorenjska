import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createBudgetFetch} from './provider-source-budget.mjs'
import {vZapisnik} from './viri/mlsz.mjs'
import {createHash} from 'node:crypto'
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

const observedMatch='https://adatbank.mlsz.hu/match/67/14/34252/2/2225843.html'
const observedCanonical='https://ada1bank.mlsz.hu/match?itemId=2225843&evad=67&szervezet=14&verseny=34252&fordulo=2'
const canonicalBytes=readFileSync(new URL('./vzorci/hu-pest-e-canonical-2225843.html',import.meta.url))
test('observed same-match query canonical redirect remains counted, paced and credential-free',async()=>{
 const calls=[],f=fixture({fetch:async(url,init)=>{calls.push({url:String(url),init});return calls.length===1?new Response(null,{status:302,headers:{location:observedCanonical}}):new Response(canonicalBytes)}})
 try{
  const response=await f.fetch(observedMatch,{headers:{Authorization:'secret',Cookie:'secret'}})
  assert.equal(await response.text(),canonicalBytes.toString('utf8'));assert.deepEqual(calls.map(c=>c.url),[observedMatch,observedCanonical]);assert.deepEqual(f.sleeps,[1500]);assert.equal(JSON.parse(readFileSync(f.path)).requests,2)
  assert.ok(calls.every(c=>!new Headers(c.init.headers).has('authorization')&&!new Headers(c.init.headers).has('cookie')))
 }finally{f.dispose()}
})
for(const field of ['itemId','evad','szervezet','verseny','fordulo'])for(const variant of ['changed','missing','duplicate'])test(`query canonical ${field} ${variant} stops before the second GET`,async()=>{
 const target=new URL(observedCanonical);if(variant==='changed')target.searchParams.set(field,'999999');else if(variant==='missing')target.searchParams.delete(field);else target.searchParams.append(field,target.searchParams.get(field))
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:target.href}})}})
 try{await assert.rejects(()=>f.fetch(observedMatch),/redirect/i);assert.equal(calls,1);assert.ok(JSON.parse(readFileSync(f.path)).stopped)}finally{f.dispose()}
})
for(const location of [observedCanonical+'&token=secret',observedCanonical.replace('/match?','/login?'),observedCanonical.replace('ada1bank.mlsz.hu','evil.invalid'),observedCanonical.replace('https:','http:'),observedCanonical.replace('https://','https://user:secret@'),observedCanonical+'#changed'])test('unobserved query canonical origin/path/extra/auth/fragment remains blocked',async()=>{
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location}})}})
 try{await assert.rejects(()=>f.fetch(observedMatch),/redirect/i);assert.equal(calls,1)}finally{f.dispose()}
})
test('query canonical target cannot redirect again or accept a different source route',async()=>{
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:observedCanonical}})}})
 try{await assert.rejects(()=>f.fetch(observedMatch),/redirect/i);assert.equal(calls,2)}finally{f.dispose()}
 for(const source of ['https://adatbank.mlsz.hu/league/67/14/34252/2.html','https://adatbank.mlsz.hu/match/2225843','https://adatbank.mlsz.hu/match/67/14/34252/2/2225843.html?changed=1']){
  let count=0;const other=fixture({fetch:async()=>{count++;return new Response(null,{status:302,headers:{location:observedCanonical}})}})
  try{await assert.rejects(()=>other.fetch(source),/redirect/i);assert.equal(count,1)}finally{other.dispose()}
 }
})


test('retained canonical report bytes describe the exact redirected match',()=>{
 const receipt=JSON.parse(readFileSync(new URL('./vzorci/hu-pest-e-canonical-provenance.json',import.meta.url),'utf8'))
 assert.equal(receipt.original_request.url,observedMatch);assert.equal(receipt.original_request.status,302);assert.equal(receipt.original_request.location,observedCanonical)
 assert.equal(receipt.canonical_response.url,observedCanonical);assert.equal(receipt.canonical_response.status,200);assert.equal(receipt.canonical_response.bytes,canonicalBytes.length);assert.equal(receipt.canonical_response.sha256,createHash('sha256').update(canonicalBytes).digest('hex'))
 const z=vZapisnik(canonicalBytes.toString('utf8'),{id:'2225843',url:observedMatch})
 assert.equal(z.zapisnikId,'2225843');assert.equal(z.sezona,'2026/27');assert.equal(z.krog,2);assert.equal(z.domaci.ime,'Dunabogdányi SE');assert.equal(z.gostje.ime,'Solymári SC');assert.deepEqual(z.rezultat,{domaci:1,gostje:3})
})


test('identity-equivalent query keys may be reordered and national federation0 is preserved',async()=>{
 const source='https://adatbank.mlsz.hu/match/67/0/33586/2/1234567.html',target='https://ada1bank.mlsz.hu/match?fordulo=2&verseny=33586&szervezet=0&evad=67&itemId=1234567';let calls=0
 const f=fixture({fetch:async()=>++calls===1?new Response(null,{status:302,headers:{location:target}}):new Response('synthetic national-route boundary fixture')})
 try{assert.equal(await(await f.fetch(source)).text(),'synthetic national-route boundary fixture');assert.equal(calls,2);assert.equal(JSON.parse(readFileSync(f.path)).events[0].redirect_kind,'same-match-query')}finally{f.dispose()}
})

const observedLeague='https://adatbank.mlsz.hu/league/67/14/34252/1.html'
const observedLeagueCanonical='https://ada1bank.mlsz.hu/league?evad=67&szervezet=14&verseny=34252&fordulo=1'
const canonicalLeagueBytes=readFileSync(new URL('./vzorci/hu-pest-e-canonical-round1.html',import.meta.url))
test('observed same-league query canonical hop is counted, paced, credential-free and safely journaled',async()=>{
 const calls=[],f=fixture({fetch:async(url,init)=>{calls.push({url:String(url),init});return calls.length===1?new Response(null,{status:302,headers:{location:observedLeagueCanonical}}):new Response(canonicalLeagueBytes)}})
 try{assert.deepEqual(Buffer.from(await(await f.fetch(observedLeague,{headers:{Authorization:'secret',Cookie:'secret'}})).arrayBuffer()),canonicalLeagueBytes);assert.deepEqual(calls.map(c=>c.url),[observedLeague,observedLeagueCanonical]);assert.deepEqual(f.sleeps,[1500]);const state=JSON.parse(readFileSync(f.path));assert.equal(state.requests,2);assert.equal(state.events[0].redirect_kind,'same-league-query');assert.deepEqual(state.events[0].redirect_target,{origin:'https://ada1bank.mlsz.hu',route:'/league',query:[['evad','67'],['szervezet','14'],['verseny','34252'],['fordulo','1']]});assert.equal(state.events[0].source.path,'/league/67/14/34252/1.html');assert.ok(calls.every(c=>!new Headers(c.init.headers).has('authorization')&&!new Headers(c.init.headers).has('cookie')))}finally{f.dispose()}
})
for(const field of ['evad','szervezet','verseny','fordulo'])for(const variant of ['changed','missing','duplicate'])test(`league query canonical ${field} ${variant} stops before the second GET and retains only public identities`,async()=>{
 const target=new URL(observedLeagueCanonical);if(variant==='changed')target.searchParams.set(field,'999999');else if(variant==='missing')target.searchParams.delete(field);else target.searchParams.append(field,target.searchParams.get(field))
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:target.href}})}})
 try{await assert.rejects(()=>f.fetch(observedLeague),/redirect/i);assert.equal(calls,1);const state=JSON.parse(readFileSync(f.path));assert.ok(state.stopped);assert.deepEqual(state.events[0].redirect_target.query,[...target.searchParams]);assert.equal(state.events[0].redirect_target.route,'/league')}finally{f.dispose()}
})
test('league canonical key ordering and national federation0 preserve exact identity',async()=>{
 const source='https://adatbank.mlsz.hu/league/67/0/33586/2.html',target='https://ada1bank.mlsz.hu/league?fordulo=2&verseny=33586&szervezet=0&evad=67';let calls=0
 const f=fixture({fetch:async()=>++calls===1?new Response(null,{status:302,headers:{location:target}}):new Response('synthetic national league route fixture')})
 try{await f.fetch(source);assert.equal(calls,2);assert.equal(JSON.parse(readFileSync(f.path)).events[0].redirect_kind,'same-league-query')}finally{f.dispose()}
})
for(const [source,target]of [[observedLeague+'?evad=67',observedLeagueCanonical],[observedLeague,observedLeagueCanonical.replace('/league?','/match?')],[observedLeague,observedLeagueCanonical+'&itemId=1'],[observedLeague,observedLeagueCanonical+'&token=secret'],[observedLeague,observedLeagueCanonical+'#secret'],[observedLeague,observedLeagueCanonical.replace('ada1bank.mlsz.hu','evil.invalid')]])test('league source query, wrong route, extra identity, secret, fragment or foreign host remain blocked',async()=>{
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:target}})}})
 try{await assert.rejects(()=>f.fetch(source),/redirect/i);assert.equal(calls,1)}finally{f.dispose()}
})
for(const target of ['https://ada1bank.mlsz.hu/redirect?token=secret','https://username:password@ada1bank.mlsz.hu/login-secret?evad=67&token=secret','https://ada1bank.mlsz.hu/league?evad=secret&szervezet=14&verseny=34252&fordulo=1&secretKey=123'])test('rejected redirect journal redacts unknown keys, values, credentials and private paths',async()=>{
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:target}})}})
 try{await assert.rejects(()=>f.fetch(observedLeague),/redirect/i);assert.equal(calls,1);const text=readFileSync(f.path,'utf8');assert.doesNotMatch(text,/secret|username|password|token|secretKey|login-/);const event=JSON.parse(text).events[0];assert.equal(event.redirect_target.origin,'https://ada1bank.mlsz.hu');assert.ok(['/league','[unreviewed-route]'].includes(event.redirect_target.route));assert.ok(event.redirect_target.query.some(([key,value])=>key==='[redacted]'||value==='[redacted]'))}finally{f.dispose()}
})
test('unreviewed original source path/query values are never copied into redirect journal',async()=>{
 const f=fixture({fetch:async()=>new Response(null,{status:302,headers:{location:'https://ada1bank.mlsz.hu/redirect?token=secret'}})})
 try{await assert.rejects(()=>f.fetch('https://adatbank.mlsz.hu/private-secret?token=secret'),/redirect/i);const text=readFileSync(f.path,'utf8');assert.doesNotMatch(text,/secret|token|private-/);assert.equal(JSON.parse(text).events[0].source.path,'[unreviewed-route]')}finally{f.dispose()}
})
test('retained observed canonical league bytes bind round1, four fixtures and the nine-round selector',async()=>{
 const {vrsticeKroga,krogiStrani}=await import('./viri/mlsz.mjs'),receipt=JSON.parse(readFileSync(new URL('./vzorci/hu-pest-e-canonical-round1-provenance.json',import.meta.url),'utf8'))
 assert.equal(receipt.original_request.url,observedLeague);assert.equal(receipt.original_request.status,302);assert.equal(receipt.original_request.location,observedLeagueCanonical);assert.equal(receipt.canonical_response.url,observedLeagueCanonical);assert.equal(receipt.canonical_response.status,200);assert.equal(receipt.canonical_response.bytes,canonicalLeagueBytes.length);assert.equal(receipt.canonical_response.sha256,createHash('sha256').update(canonicalLeagueBytes).digest('hex'))
 assert.deepEqual(krogiStrani(canonicalLeagueBytes.toString()),[1,2,3,4,5,6,7,8,9]);assert.deepEqual(vrsticeKroga(canonicalLeagueBytes.toString(),1).map(f=>({id:f.id,home:f.domaci,away:f.gostje,score:f.izid})),receipt.canonical_response.fixtures)
})
test('observed league query canonical response cannot redirect a second time',async()=>{
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:observedLeagueCanonical}})}})
 try{await assert.rejects(()=>f.fetch(observedLeague),/redirect/i);assert.equal(calls,2);assert.equal(JSON.parse(readFileSync(f.path)).events[1].redirect_target.route,'/league')}finally{f.dispose()}
})
