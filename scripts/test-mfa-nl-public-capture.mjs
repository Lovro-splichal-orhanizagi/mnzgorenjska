import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, utimesSync, symlinkSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import mfa, { MfaZavrnitev } from './viri/mfa.mjs'
import { createCaptureReader, capture, assertCapturePin, assertCaptureURL, validateResumeRun } from './zajemi-mfa-nl2-public.mjs'
const BASE='https://api.mfa.com.mt/api'
const NOW=Date.parse('2026-10-21T12:00:00Z')
function dirs(t) { const root=mkdtempSync(join(tmpdir(),'mfa-nl2-capture-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const cacheRoot=join(root,'source-cache'),outputRoot=join(root,'output');mkdirSync(cacheRoot);return{root,cacheRoot,outputRoot} }
function reader(t, options={}) { const d=dirs(t),calls=[],sleeps=[];return{...d,calls,sleeps,read:createCaptureReader({...d,now:()=>NOW,sleep:async ms=>sleeps.push(ms),fetchFn:async(url,init)=>{calls.push({url,init});return new Response('{}')},...options})} }
test('capture pins first attempt to reviewed branch SHA and validates only exact MFA routes',()=>{
 const env={GITHUB_SHA:'a'.repeat(40),EXPECTED_SHA:'a'.repeat(40),GITHUB_REF:'refs/heads/codex/mfa-nl-public-capture-20261021',GITHUB_RUN_ATTEMPT:'1'}
 assertCapturePin(env)
 for(const patch of[{EXPECTED_SHA:'b'.repeat(40)},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_REF:'refs/heads/main'},{GITHUB_SHA:'bad'}])assert.throws(()=>assertCapturePin({...env,...patch}))
 for(const path of['/competitions/6234492/standings?season=2026','/competitions/6234492/pastMatches?season=2027&pageSize=50&page=1','/matches/50920555/result','/matches/51962893/lineup','/matches/50920554'])assertCaptureURL(BASE+path)
 for(const url of['https://example.com/api/matches/1','http://api.mfa.com.mt/api/matches/1',BASE+'/competitions/2601267/standings?season=2026',BASE+'/competitions/6234492/standings?season=2028',BASE+'/matches/1/result?x=1',BASE+'/matches/1/other','https://user@api.mfa.com.mt/api/matches/1'])assert.throws(()=>assertCaptureURL(url))
})
test('every actual GET is paced at 3000ms with standard headers and redirects disabled',async t=>{
 const f=reader(t);await f.read(BASE+'/matches/1','tekma-1.json');await f.read(BASE+'/matches/2','tekma-2.json')
 assert.deepEqual(f.sleeps,[3000,3000]);assert.equal(f.calls.length,2)
 assert.deepEqual(f.calls[0].init.headers,mfa.glave);assert.equal(f.calls[0].init.method,'GET');assert.equal(f.calls[0].init.redirect,'manual')
 assert.equal(f.read.state.requests.length,2);assert.equal(f.read.state.requests[0].status,200);assert.match(f.read.state.requests[0].bodySha256,/^[a-f0-9]{64}$/)
})
for(const status of[401,403,429,500,302])test(`HTTP${status} is attempted once, saved and latches source stop`,async t=>{
 let calls=0;const f=reader(t,{fetchFn:async()=>{calls++;return new Response('failure',{status})}})
 await assert.rejects(f.read(BASE+'/matches/1','tekma-1.json'),status===401||status===403||status===429?e=>e instanceof MfaZavrnitev:undefined)
 await assert.rejects(f.read(BASE+'/matches/2','tekma-2.json'))
 assert.equal(calls,1);assert.equal(f.read.state.complete,false);assert.equal(f.read.state.requests.length,1);assert.equal(f.read.state.requests[0].status,status)
 assert.equal(readFileSync(join(f.outputRoot,'responses','1.bin'),'utf8'),'failure')
})
for(const body of['<title>Just a moment</title>','{"statusCode":401,"error":"Unauthorized"}','<form><input type="password"></form><html>'])test('auth/challenge response is a typed stop without retry',async t=>{
 const f=reader(t,{fetchFn:async()=>new Response(body)})
 await assert.rejects(f.read(BASE+'/matches/1','tekma-1.json'),e=>e instanceof MfaZavrnitev);assert.equal(f.read.state.denied,true)
})
test('budget is bounded at550 and counts failed metadata probes as actual GETs',async t=>{
 const f=reader(t,{maxRequests:2,fetchFn:async()=>new Response('{"message":"not found"}',{status:404})})
 for(const id of[1,2])await assert.rejects(f.read(BASE+`/matches/${id}`,`tekma-${id}.json`),e=>e.status===404)
 await assert.rejects(f.read(BASE+'/matches/3','tekma-3.json'),/budget/)
 assert.deepEqual(f.sleeps,[3000,3000]);assert.equal(f.read.state.requests.length,2)
 assert.deepEqual(JSON.parse(readFileSync(join(f.cacheRoot,'po-sifri-1.json'))),{ni:404})
 assert.throws(()=>createCaptureReader({...dirs(t),maxRequests:551}),/550/)
})
test('old completed cache bytes are reused preserving original mtimes; fresh metadata refreshes',async t=>{
 const f=reader(t);const file=join(f.cacheRoot,'po-sifri-1.json'),body=JSON.stringify({id:1,status:'PLAYED',startDate:'2026-01-01T12:00:00Z'})
 writeFileSync(file,body);utimesSync(file,new Date('2026-01-02'),new Date('2026-01-02'));const before=statSync(file).mtimeMs
 assert.equal(await f.read(BASE+'/matches/1','tekma-1.json'),body);assert.equal(f.calls.length,0);assert.equal(statSync(file).mtimeMs,before)
 assert.equal(statSync(join(f.outputRoot,'cache','po-sifri-1.json')).mtimeMs,before)
 assert.equal(f.read.state.cacheHits,1)
})
test('malformed JSON and oversized bodies stop and save bounded failure evidence',async t=>{
 const f=reader(t,{fetchFn:async()=>new Response('not json')});await assert.rejects(f.read(BASE+'/matches/1','tekma-1.json'),/JSON/)
 const big=reader(t,{fetchFn:async()=>new Response('x'.repeat(2*1024*1024+1))});await assert.rejects(big.read(BASE+'/matches/1','tekma-1.json'),/bound/)
 assert.ok(statSync(join(big.outputRoot,'responses','1.bin')).size<=2*1024*1024)
})
test('partial capture saves receipt and ledger without claiming full inventory or invoking stats writes',async t=>{
 const d=dirs(t);await assert.rejects(capture({...d,runId:'123',now:()=>NOW,sleep:async()=>{},fetchFn:async()=>new Response('denied',{status:403})}),e=>e instanceof MfaZavrnitev)
 const status=JSON.parse(readFileSync(join(d.outputRoot,'capture-status.json')));assert.equal(status.complete,false);assert.equal(status.denied,true)
 assert.equal(JSON.parse(readFileSync(join(d.outputRoot,'capture-ledger.json'))).requests.length,1)
 assert.equal(JSON.parse(readFileSync(join(d.cacheRoot,'capture-status.json'))).denied,true)
})
test('resume metadata accepts only the same reviewed capture branch and first-attempt splitter run',()=>{
 const run={id:123,path:'.github/workflows/razdeli-zlite-igralce.yml',head_branch:'codex/mfa-nl-public-capture-20261021',head_sha:'a'.repeat(40),status:'completed',run_attempt:1,event:'workflow_dispatch',repository:{full_name:'owner/repo'},head_repository:{full_name:'owner/repo'}}
 validateResumeRun(run,'123','owner/repo','a'.repeat(40))
 for(const patch of[{head_sha:'b'.repeat(40)},{run_attempt:2},{head_branch:'main'},{status:'in_progress'}])assert.throws(()=>validateResumeRun({...run,...patch},'123','owner/repo','a'.repeat(40)))
})
test('workflow capture is branch-pinned, isolated, source-concurrent and uploads evidence on failure',()=>{
 const yaml=readFileSync(new URL('../.github/workflows/razdeli-zlite-igralce.yml',import.meta.url),'utf8')
 const capture=yaml.split('\n  mfa-nl2-public-capture:')[1];assert.ok(capture);assert.doesNotMatch(capture,/secrets\.|SUPABASE|restore-keys/)
 assert.match(capture,/group: mfa-sourcecapture/);assert.match(capture,/if: \$\{\{ always\(\)/);assert.match(capture,/actions\/cache\/save/)
 const jobs=yaml.split('\n  mfa-nl2-public-capture:')[0]
 for(const name of['razdeli','fscg-cache-audit','mfa-nl-cache-audit'])assert.match(jobs,new RegExp(`  ${name}:\\n    if:.*inputs.vir != 'mfa-nl2-public-capture'`))
 assert.ok(capture.indexOf('Verify reviewed capture branch')<capture.indexOf('Capture fixed NL II'))
})
test('fixed two-season capture retains both continuation reports raw and completes offline issue analysis',async t=>{
 const d=dirs(t),seen=[]
 const base={competitionTypeId:6234492,competitionId:100,status:'PLAYED',startDate:'2026-01-01T12:00:00Z',homeTeam:{id:1,name:'Home'},awayTeam:{id:2,name:'Away'}}
 const fetchFn=async url=>{
  seen.push(url);const u=new URL(url)
  if(u.pathname.endsWith('/standings'))return new Response(JSON.stringify({phases:[{groups:[{id:100}]}]}))
  if(u.pathname.endsWith('/pastMatches'))return new Response(JSON.stringify(u.searchParams.get('season')==='2026'?[{...base,id:50920555},{...base,id:51962893}]:[]))
  if(u.pathname.endsWith('/upcomingMatches'))return new Response(JSON.stringify(u.searchParams.get('season')==='2027'?[{...base,id:999,status:'SCHEDULED',startDate:'2026-11-01T12:00:00Z'}]:[]))
  const kind=u.pathname.endsWith('/result')?'izid':'postava'
  let raw=readFileSync(new URL(`./vzorci/mt-mfa-tekma-53186745-${kind}.json`,import.meta.url),'utf8')
  if(kind==='postava'){const lineup=JSON.parse(raw),p=lineup.homeTeam.players.find(p=>p.startingLineup);p.events.push({id:99999999,type:'RED',playerId:p.id,time:null});raw=JSON.stringify(lineup)}
  return new Response(raw)
 }
 const result=await capture({...d,runId:'123',now:()=>NOW,sleep:async()=>{},fetchFn})
 assert.equal(result.complete,true);assert.equal(result.requests.length,10);assert.equal(seen.length,10)
 const analysis=JSON.parse(readFileSync(join(d.outputRoot,'audit','report-analysis.json')))
 assert.equal(analysis.issues,true);assert.deepEqual(analysis.reports.map(r=>r.sourceId),['50920555','51962893'])
 for(const id of['50920555','51962893'])for(const kind of['izid','postava'])assert.ok(readFileSync(join(d.outputRoot,'cache',`tekma-${id}-${kind}.json`)).length)
})
test('interrupted response retains its received prefix and SHA before stopping without retry',async t=>{
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('partial'));},pull(controller){controller.error(Error('connection lost'))}})
 const f=reader(t,{fetchFn:async()=>new Response(stream)})
 await assert.rejects(f.read(BASE+'/matches/1','tekma-1.json'),/connection lost/)
 const row=f.read.state.requests[0];assert.equal(row.completeBody,false);assert.equal(row.bodyBytes,7);assert.match(row.bodySha256,/^[a-f0-9]{64}$/)
 assert.equal(readFileSync(join(f.outputRoot,'responses','1.bin'),'utf8'),'partial')
})
test('a restored refusal receipt prevents all further source requests and fresh completed fixtures refresh',async t=>{
 const d=dirs(t);writeFileSync(join(d.cacheRoot,'capture-status.json'),JSON.stringify({denied:true}))
 assert.throws(()=>createCaptureReader({...d,fetchFn:()=>{throw Error('must not fetch')}}),/Prior capture was refused/)
 const f=reader(t),path=join(f.cacheRoot,'po-sifri-2.json')
 writeFileSync(path,JSON.stringify({id:2,status:'PLAYED',startDate:'2026-10-20T12:00:00Z'}))
 await f.read(BASE+'/matches/2','tekma-2.json');assert.equal(f.calls.length,1);assert.equal(f.read.state.cacheHits,0)
})

test('a broken symlink in a resumed cache cannot redirect a source write', async t => {
 const d=dirs(t);symlinkSync(join(d.root,'outside.json'),join(d.cacheRoot,'po-sifri-1.json'))
 let calls=0;const read=createCaptureReader({...d,sleep:async()=>{},fetchFn:async()=>{calls++;return new Response('{}')}})
 await assert.rejects(read(BASE+'/matches/1','tekma-1.json'),/Unsafe cached source body/)
 assert.equal(calls,0)
 const receipt=dirs(t);symlinkSync(join(receipt.root,'outside-status.json'),join(receipt.cacheRoot,'capture-status.json'))
 assert.throws(()=>createCaptureReader(receipt),/Unsafe capture receipt/)
})
