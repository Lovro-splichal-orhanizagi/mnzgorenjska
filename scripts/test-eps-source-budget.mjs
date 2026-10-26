import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn,spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {createEpsBudgetFetch,readEpsSourceBudget} from './eps-source-budget.mjs'

const A='www.epspeir.gr',B='www.epsana.gr',DB='https://db.fixture.invalid'
const url=(host=A,id=1)=>`https://${host}/results/display_game.php?game_id=${id}`
const full='<html><div id="footer"></div></html>'
function fixture(options={}) {
 const dir=mkdtempSync(join(tmpdir(),'eps-budget-')),path=join(dir,'budget.json'),calls=[],sleeps=[];let time=1000
 const opts={path,maxRequests:20,databaseOrigin:DB,hosts:[B,A],now:()=>time,sleep:async ms=>{sleeps.push(ms);time+=ms},fetch:async(input,init)=>{calls.push({url:String(input),init});return new Response(full)},...options}
 return {dir,path,calls,sleeps,opts,fetch:createEpsBudgetFetch(opts),state:()=>readEpsSourceBudget(path),dispose:()=>rmSync(dir,{recursive:true,force:true})}
}
test('counts six prior qualifier requests separately and persists raw bytes, selected hosts and per-host pacing',async()=>{
 const bytes=Buffer.from([0xef,0xbb,0xbf,0xff,...Buffer.from(full)]),f=fixture({fetch:async()=>new Response(bytes)})
 try {
  assert.deepEqual(Buffer.from(await(await f.fetch(url())).arrayBuffer()),bytes)
  await createEpsBudgetFetch(f.opts)(url(B));await f.fetch(url(A,2))
  const s=f.state();assert.equal(s.global.requests,9);assert.equal(s.prior_requests,6);assert.equal(s.events.length,3);assert.deepEqual(s.binding.hosts,[B,A].sort());assert.deepEqual(f.sleeps,[3000]);assert.equal(s.events[0].original_bytes_sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(s.events[0].http_status,200)
 }finally{f.dispose()}
})
test('source intent is durable before the GET, strips credentials and uses manual redirects',async()=>{
 let f
 f=fixture({fetch:async(input,init)=>{const s=f.state();assert.equal(s.global.requests,7);assert.equal(s.pending.host,A);assert.equal(s.events[0].status,'RUNNING');assert.equal(init.redirect,'manual');assert.equal(new Headers(init.headers).get('authorization'),null);assert.equal(new Headers(init.headers).get('cookie'),null);return new Response(full)}})
 try{await f.fetch(url(),{headers:{authorization:'secret',cookie:'secret'}});assert.equal(f.state().pending,null)}finally{f.dispose()}
})
test('only the three canonical EPS routes accept their corresponding single numeric identity',async()=>{
 const f=fixture();try{for(const path of ['/results/display_schedule.php?league_id=12','/results/display_results.php?league_id=12','/results/display_game.php?game_id=12'])await f.fetch(`https://${A}${path}`);assert.equal(f.state().global.requests,9);assert.deepEqual(f.sleeps,[3000,3000])}finally{f.dispose()}
})
test('exact database REST calls retain their method, headers, body and signal without creating source ledger',async()=>{
 const f=fixture(),signal=new AbortController().signal,init={method:'POST',headers:{authorization:'fixture'},body:'{}',signal}
 try{await f.fetch(`${DB}/rest/v1/fixtures?select=*`,init);assert.equal(f.calls[0].init,init);assert.equal(existsSync(f.path),false)}finally{f.dispose()}
})
for(const bad of [url().replace('https:','http:'),url().replace(A,'epspeir.gr'),url().replace(A,'www.epsdod.gr'),url().replace(A,A+':443'),url()+'&game_id=2',url()+'&token=private',url()+'#private',url().replace('game_id=1','game_id=0'),url().replace('game_id=1','game_id=01'),url().replace('game_id=1','league_id=1'),url().replace('display_game','display_player'),url().replace(A,'user:pass@'+A),url().replace('/results/','/secret/../results/')])test('rejects unreviewed original source URL before fetch',async()=>{
 const f=fixture();try{await assert.rejects(()=>f.fetch(bad),{code:'SLFF_SOURCE_STOP'});assert.equal(f.calls.length,0);assert.equal(f.state().global.requests,6);assert.doesNotMatch(readFileSync(f.path,'utf8'),/private|user:pass|secret/)}finally{f.dispose()}
})
test('POST on a selected host persists that host stop while another selected host continues',async()=>{
 const f=fixture();try{await assert.rejects(()=>f.fetch(url(),{method:'POST'}));await assert.rejects(()=>createEpsBudgetFetch(f.opts)(url()));await f.fetch(url(B));assert.equal(f.calls.length,1);assert.equal(f.state().global.requests,7);assert.ok(f.state().hosts[A].stopped)}finally{f.dispose()}
})
for(const [status,body]of [[301,full],[302,full],[307,full],[308,full],[401,full],[403,full],[429,full],[503,full],[500,'error'],[200,'<title>Just a moment</title>'],[200,'<form><input type="password"></form>'],[200,'SQLSTATE Too many connections'],[200,'unknown platform']])test(`HTTP ${status} refusal/unknown stops only affected host across instances`,async()=>{
 let calls=0;const f=fixture({fetch:async()=>{calls++;return new Response(body,{status,headers:{location:'https://foreign.invalid/'}})}})
 try{await assert.rejects(()=>f.fetch(url()));await assert.rejects(()=>createEpsBudgetFetch(f.opts)(url(A,2)));assert.equal(calls,1);assert.equal(f.state().global.requests,7);assert.equal(f.state().events[0].http_status,status);await createEpsBudgetFetch({...f.opts,fetch:async()=>new Response(full)})(url(B));assert.equal(f.state().global.requests,8)}finally{f.dispose()}
})
test('transport failure is charged once and durably UNKNOWN without affecting the other host',async()=>{
 const f=fixture({fetch:async()=>{throw Error('private transport text')}})
 try{await assert.rejects(()=>f.fetch(url()));assert.equal(f.state().events[0].status,'UNKNOWN');await assert.rejects(()=>createEpsBudgetFetch(f.opts)(url()));await createEpsBudgetFetch({...f.opts,fetch:async()=>new Response(full)})(url(B));assert.equal(f.state().global.requests,8);assert.doesNotMatch(readFileSync(f.path,'utf8'),/private/)}finally{f.dispose()}
})
test('global cap includes six prior requests and stops all hosts',async()=>{
 const f=fixture({maxRequests:7});try{await f.fetch(url());await assert.rejects(()=>f.fetch(url(B)),/exhausted/);await assert.rejects(()=>createEpsBudgetFetch(f.opts)(url()),/exhausted/);assert.equal(f.calls.length,1);assert.equal(f.state().global.requests,7);assert.ok(f.state().global.stopped)}finally{f.dispose()}
})
test('changed bindings, lowered prior count and malformed receipts fail closed',async()=>{
 const f=fixture();try{await f.fetch(url());for(const options of [{maxRequests:21},{hosts:[A]},{priorRequests:5},{databaseOrigin:'https://other.invalid'}])await assert.rejects(async()=>createEpsBudgetFetch({...f.opts,...options})(url()));assert.equal(f.calls.length,1)}finally{f.dispose()}
})
test('invalid fixed host, origin or cap configuration cannot start a source request',()=>{
 const f=fixture();try{for(const options of [{maxRequests:6},{maxRequests:1001},{maxRequests:7.5},{hosts:[]},{hosts:[A,A]},{hosts:['epspeir.gr']},{hosts:['www.foreign.invalid']},{databaseOrigin:`https://${A}`},{databaseOrigin:DB+'/rest/v1'}])assert.throws(()=>createEpsBudgetFetch({...f.opts,...options}),{code:'SLFF_SOURCE_STOP'});assert.equal(existsSync(f.path),false)}finally{f.dispose()}
})
test('unreadable shared receipt creates a persistent infrastructure stop',async()=>{
 const f=fixture();try{writeFileSync(f.path,'{');await assert.rejects(()=>f.fetch(url()));assert.equal(existsSync(f.path+'.stopped'),true);writeFileSync(f.path,'{}');await assert.rejects(()=>createEpsBudgetFetch(f.opts)(url(B)));assert.equal(f.calls.length,0)}finally{f.dispose()}
})
test('abandoned intent and dead process lock stop the affected host, preserving other selected hosts',async()=>{
 const f=fixture();try{
  await f.fetch(url());const s=f.state();s.events[0].status='RUNNING';delete s.events[0].completed_at;s.pending={host:A,sequence:7};writeFileSync(f.path,JSON.stringify(s));writeFileSync(f.path+'.lock',JSON.stringify({pid:2147483647,host:A}))
  await createEpsBudgetFetch(f.opts)(url(B));await assert.rejects(()=>f.fetch(url()));assert.equal(f.state().events[0].status,'UNKNOWN');assert.equal(f.state().global.requests,8)
 }finally{f.dispose()}
})
test('pending intent without its lock stops only its own host and permits the next independent host immediately',async()=>{
 const f=fixture();try{await f.fetch(url());const s=f.state();s.events[0].status='RUNNING';s.hosts[A].pending=true;s.pending={host:A,sequence:7};writeFileSync(f.path,JSON.stringify(s));await createEpsBudgetFetch(f.opts)(url(B));assert.equal(f.state().global.requests,8);assert.equal(f.state().events[0].status,'UNKNOWN');await assert.rejects(()=>f.fetch(url()))}finally{f.dispose()}
})
test('a truncated or altered completed receipt cannot authorize further requests',async()=>{
 const f=fixture();try{await f.fetch(url());const s=f.state();delete s.events[0].original_bytes_sha256;writeFileSync(f.path,JSON.stringify(s));await assert.rejects(()=>createEpsBudgetFetch(f.opts)(url(B)));assert.equal(f.calls.length,1)}finally{f.dispose()}
})
test('bounded response bodies stop host on declared size or streaming overflow',async()=>{
 for(const response of [()=>new Response(full,{headers:{'content-length':String(4*1024*1024+1)}}),()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(4*1024*1024));c.enqueue(new Uint8Array(1));c.close()}}))]){
  const f=fixture({fetch:async()=>response()});try{await assert.rejects(()=>f.fetch(url()),/bounded|size/);assert.equal(f.state().global.requests,7);assert.equal(f.state().events[0].status,'STOPPED')}finally{f.dispose()}
 }
})
test('documented complete Dodecanese and truncated Epir HTTP500 retain original status and raw hash',async()=>{
 const trimmed=readFileSync(new URL('./vzorci/gr-eps-tekma-odrezana-epsip-26623.html',import.meta.url)),f=fixture({hosts:['www.epsdod.gr','www.epsip.gr'],fetch:async input=>new Response(String(input).includes('epsip')?trimmed:full,{status:500})})
 try{for(const host of ['www.epsdod.gr','www.epsip.gr'])assert.equal((await f.fetch(url(host))).status,500);assert.ok(f.state().events.every(e=>e.status==='COMPLETED'&&e.http_status===500))}finally{f.dispose()}
})
test('HTTP500 platform-shaped response from another EPS host is not an expanded exception',async()=>{
 const f=fixture({fetch:async()=>new Response(full,{status:500})});try{await assert.rejects(()=>f.fetch(url()));assert.equal(f.state().events[0].http_status,500)}finally{f.dispose()}
})
test('actual children auto-install the shared ledger hook, continue another host and retain stops',()=>{
 const f=fixture({maxRequests:10}),hook=new URL('./eps-source-budget.mjs',import.meta.url).href
 const run=mode=>spawnSync(process.execPath,['--input-type=module','-e',`
  let source=0,db=0;globalThis.fetch=async(input)=>{if(String(input).startsWith(${JSON.stringify(DB)})){db++;return new Response('db')}source++;return new Response(${JSON.stringify(full)},{status:${mode==='refuse'?403:200}})};
  await import(${JSON.stringify(hook)});
  const outcomes=[];for(const u of ${JSON.stringify(mode==='refuse'?[url(),DB+'/rest/v1/a']:[url(),url(B),DB+'/rest/v1/a'])})try{outcomes.push((await fetch(u,{method:u.includes('/rest/')?'POST':'GET'})).status)}catch(e){outcomes.push(e.code)};
  console.log(JSON.stringify({source,db,outcomes}));
 `],{encoding:'utf8',env:{...process.env,SLFF_EPS_BUDGET_PATH:f.path,SLFF_EPS_MAX_REQUESTS:'10',SLFF_EPS_HOSTS:JSON.stringify([A,B]),SUPABASE_URL:DB}})
 try{const one=run('refuse');assert.equal(f.state().global.requests,7);const two=run('continue');assert.equal(one.status,0,one.stderr);assert.equal(two.status,0,two.stderr);assert.deepEqual(JSON.parse(one.stdout),{source:1,db:1,outcomes:['SLFF_SOURCE_STOP',200]});assert.deepEqual(JSON.parse(two.stdout),{source:1,db:1,outcomes:['SLFF_SOURCE_STOP',200,200]});assert.equal(f.state().global.requests,8);assert.equal(f.state().events.length,2)}finally{f.dispose()}
})
test('concurrent actual children serialize the shared cap and enforce three-second same-host spacing',async()=>{
 const f=fixture({maxRequests:8}),hook=new URL('./eps-source-budget.mjs',import.meta.url).href
 const child=()=>new Promise((resolve,reject)=>{let stderr='';const p=spawn(process.execPath,['--input-type=module','-e',`globalThis.fetch=async()=>{await new Promise(r=>setTimeout(r,100));return new Response(${JSON.stringify(full)})};await import(${JSON.stringify(hook)});await fetch(${JSON.stringify(url())});`],{env:{...process.env,SLFF_EPS_BUDGET_PATH:f.path,SLFF_EPS_MAX_REQUESTS:'8',SLFF_EPS_HOSTS:JSON.stringify([A,B]),SUPABASE_URL:DB}});p.stderr.on('data',b=>stderr+=b);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(stderr)))})
 try{await Promise.all([child(),child()]);const s=f.state();assert.equal(s.global.requests,8);assert.equal(s.events.length,2);assert.ok(Date.parse(s.events[1].started_at)-Date.parse(s.events[0].started_at)>=3000);assert.ok(s.events.every(e=>e.status==='COMPLETED'))}finally{f.dispose()}
})
test('an actual child exiting during its durable source intent cannot reset or retry that host',async()=>{
 const f=fixture(),hook=new URL('./eps-source-budget.mjs',import.meta.url).href
 try{
  const child=spawnSync(process.execPath,['--input-type=module','-e',`globalThis.fetch=async()=>process.exit(0);await import(${JSON.stringify(hook)});await fetch(${JSON.stringify(url())});`],{encoding:'utf8',env:{...process.env,SLFF_EPS_BUDGET_PATH:f.path,SLFF_EPS_MAX_REQUESTS:'20',SLFF_EPS_HOSTS:JSON.stringify([A,B]),SUPABASE_URL:DB}})
  assert.equal(child.status,0,child.stderr);assert.equal(f.state().global.requests,7);assert.equal(f.state().events[0].status,'RUNNING');await createEpsBudgetFetch(f.opts)(url(B));await assert.rejects(()=>f.fetch(url()));assert.equal(f.state().global.requests,8);assert.equal(f.state().events[0].status,'UNKNOWN');assert.equal(f.calls.length,1)
 }finally{f.dispose()}
})
