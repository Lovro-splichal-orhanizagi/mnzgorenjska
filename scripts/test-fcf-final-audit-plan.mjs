import test from 'node:test'
import assert from 'node:assert/strict'
import {historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'
import { buildFcfFinalAuditPlan,collectFcfFinalAudit,withBoundedFcfTransport } from './fcf-final-audit.mjs'
const now=Date.parse('2026-10-18T14:00:00Z')
const scopes=[['es-ct-segona-g1',4109388,29],['es-ct-tercera-g2',4116188,28],['es-ct-tercera-g9',4118349,26]]
function fixture(){
 return {now,sourceCommit:'a'.repeat(40),groups:scopes.map(([slug,start,covered])=>({competition:{slug,source:'fcf',source_league_code:`${start}-${start+239}`,active:false,sezona_koledarska:false},
  verifiedSourceIds:Array.from({length:covered},(_,i)=>String(start+i)),
  cache:Array.from({length:240},(_,i)=>({id:String(start+i),rawSha256:'c'.repeat(64),cacheMtimeUTC:'2026-10-17T10:00:00Z',
   header:{krog:Math.floor(i/8)+1,datum:new Date(Date.UTC(2026,8,19+Math.floor(i/8)*7)).toISOString().slice(0,10),izid:i<covered?{domaci:0,gostje:0}:null,zaprt:i<covered,sezona:'2026/27',tekmovanje:slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA',skupina:`GRUP ${slug.split('-g')[1]}`},
   lineage:{verified:true,repository:'Lovro-splichal-orhanizagi/mnzgorenjska',artifactId:'100',artifactDigest:'sha256:'+'d'.repeat(64),runId:'200',commit:'e'.repeat(40)}}))}))}
}
test('exact final audit plan budgets19/20/22 without complete reports or four exceptions',()=>{
 const p=buildFcfFinalAuditPlan(fixture())
 assert.equal(p.maximumSourceGETs,61)
 assert.deepEqual(p.groups.map(g=>g.fetchIds.length),[19,20,22])
 for(const [i,g]of p.groups.entries()){
  const [,start,covered]=scopes[i]
  assert.deepEqual(g.fetchIds,Array.from({length:48-covered},(_,k)=>String(start+covered+k)))
  assert.equal(g.reuseIds.length,240-g.fetchIds.length)
 }
 assert.ok(!p.groups.flatMap(g=>g.fetchIds).some(id=>['4109388','4116215','4118352','4118358'].includes(id)))
})
test('newly covered normal reports reduce the budget without increasing scope',()=>{
 const f=fixture();f.groups[0].verifiedSourceIds.push('4109417');Object.assign(f.groups[0].cache.find(e=>e.id==='4109417').header,{izid:{domaci:0,gostje:0},zaprt:true})
 const p=buildFcfFinalAuditPlan(f);assert.equal(p.maximumSourceGETs,60);assert.ok(!p.groups[0].fetchIds.includes('4109417'))
})
for(const [name,mutate]of[
 ['complete raw missing',f=>f.groups[0].cache.splice(1,1)],['future calendar raw missing',f=>f.groups[0].cache.pop()],
 ['stale far-future cache',f=>f.groups[0].cache.at(-1).cacheMtimeUTC='2026-10-01T00:00:00Z'],
 ['foreign cache lineage',f=>f.groups[0].cache.at(-1).lineage.repository='other/repo'],['unverified cache lineage',f=>f.groups[0].cache.at(-1).lineage.verified=false],
 ['foreign source block',f=>f.groups[0].competition.source_league_code='4109387-4109626'],['foreign source header',f=>f.groups[0].cache.at(-1).header.skupina='GRUP 2'],
 ['expanded budget',f=>f.groups[0].verifiedSourceIds.pop()],['duplicate source identity',f=>f.groups[0].verifiedSourceIds.push(f.groups[0].verifiedSourceIds[1])],
])test(`plan holds before requests for ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>buildFcfFinalAuditPlan(f),/FCF_AUDIT/)})
for(const status of[401,403,429])test(`collector stops at HTTP${status} without fallback or another ID`,async()=>{
 const plan=buildFcfFinalAuditPlan(fixture());let calls=0
 await assert.rejects(()=>collectFcfFinalAudit({onCapture:()=>{},plan,request:async()=>{calls++;return new Response('blocked',{status})},pause:async()=>{},parse:()=>({})}),/FCF_AUDIT/)
 assert.equal(calls,1)
})
test('collector stops a challenge before another ID and never invokes strict normal parser',async()=>{
 const plan=buildFcfFinalAuditPlan(fixture());let calls=0,parsed=0
 await assert.rejects(()=>collectFcfFinalAudit({onCapture:()=>{},plan,request:async()=>{calls++;return new Response('<title>Just a moment</title>cf_chl_opt',{status:200})},pause:async()=>{},parse:()=>{parsed++;return{}}}),/FCF_AUDIT/)
 assert.equal(calls,1);assert.equal(parsed,0)
})
test('collector uses existing3second source pause, only planned IDs, and preserves capture receipts',async()=>{
 const plan=buildFcfFinalAuditPlan(fixture()),urls=[],delays=[]
 const result=await collectFcfFinalAudit({onCapture:()=>{},plan,request:async url=>{urls.push(url);return new Response('normal source bytes',{status:200})},pause:async ms=>delays.push(ms),parse:({id})=>({id}),clock:()=>now})
 assert.equal(urls.length,61);assert.equal(new Set(urls).size,61)
 assert.deepEqual(delays,Array(60).fill(3000))
 assert.equal(result.actualSourceGETs,61)
 assert.ok(result.captures.every(r=>r.capturedUTC==='2026-10-18T14:00:00.000Z'&&r.bytes===19&&r.rawSha256.length===64))
})
test('newly published malformed normal report stops without becoming an exception',async()=>{
 let calls=0;await assert.rejects(()=>collectFcfFinalAudit({onCapture:()=>{},plan:buildFcfFinalAuditPlan(fixture()),request:async()=>{calls++;return new Response('normal source bytes')},pause:async()=>{},parse:()=>{throw Error('strict new report defect')}}),/strict new report defect/);assert.equal(calls,1)
})

test('actual calendar round governs nonsequential imported G2 report4116314 and R6 IDs',()=>{
 const f=fixture(),g=f.groups[1]
 // A hand-checked permutation: imported R4 report lives outside the numeric early prefix.
 const early=g.cache.find(e=>e.id==='4116214'),late=g.cache.find(e=>e.id==='4116314'),temp=early.header
 early.header=late.header;late.header=temp
 g.verifiedSourceIds[g.verifiedSourceIds.indexOf('4116214')]='4116314'
 const r6=g.cache.find(e=>e.id==='4116228'),future=g.cache.find(e=>e.id==='4116380'),r6header=r6.header
 r6.header=future.header;future.header=r6header
 const p=buildFcfFinalAuditPlan(f),group=p.groups.find(x=>x.competitionSlug==='es-ct-tercera-g2')
 assert.equal(p.maximumSourceGETs,61);assert.ok(!group.fetchIds.includes('4116314'));assert.ok(group.reuseIds.includes('4116314'))
 assert.ok(group.fetchIds.includes('4116380'));assert.ok(!group.fetchIds.includes('4116228'))
 assert.ok(Array.isArray(group.fetch),'fetch plan retains each selected header round and cache lineage')
 const selected=group.fetch.find(x=>x.id==='4116380');assert.equal(selected.sourceRound,6);assert.equal(selected.rawSha256,'c'.repeat(64));assert.equal(selected.lineage.artifactId,'100')
})
for(const [name,mutate]of[
 ['unknown unverified early header',f=>f.groups[0].cache.splice(30,1)],
 ['unknown R6 header',f=>f.groups[0].cache[40].header.krog=null],
 ['duplicate calendar round',f=>f.groups[0].cache[40].header.krog=7],
 ['foreign unverified header',f=>f.groups[0].cache[30].header.skupina='GRUP 999'],
 ['unauthenticated R6 selection',f=>f.groups[0].cache[40].lineage.verified=false],
])test(`never guesses an ID ordinal for ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>buildFcfFinalAuditPlan(f),/FCF_AUDIT/)})

for(const kind of ['redirect','invalid UTF8'])test(`native FCF transport refuses ${kind} before metadata/body normalization`,async()=>{
 const plan=buildFcfFinalAuditPlan(fixture());let calls=0
 const network=async()=>{calls++;const r=new Response(kind==='invalid UTF8'?Buffer.from([255]):'redirected source');if(kind==='redirect')Object.defineProperty(r,'redirected',{value:true});return r}
 await assert.rejects(()=>withBoundedFcfTransport(plan,request=>collectFcfFinalAudit({onCapture:()=>{},plan,request,pause:async()=>{},parse:()=>({})}),{network}),/FCF_AUDIT/)
 assert.equal(calls,1)
})
test('native request blocks automatic redirects and empty-response retry before another GET',async()=>{
 const plan=buildFcfFinalAuditPlan(fixture());let calls=0;const delays=[],timer=globalThis.setTimeout
 globalThis.setTimeout=(f,ms,...args)=>{delays.push(ms);return timer(f,0,...args)}
 try{
  await assert.rejects(()=>withBoundedFcfTransport(plan,request=>collectFcfFinalAudit({onCapture:()=>{},plan,request,pause:async()=>{},parse:()=>({})}),{network:async(_url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response('')}}),/FCF_AUDIT/)
  assert.equal(calls,1);assert.deepEqual(delays,[])
 }finally{globalThis.setTimeout=timer}
})

test('collector refuses a rehashed foreign source block before any request',async()=>{
 const plan=buildFcfFinalAuditPlan(fixture());plan.groups[0].fetchIds[0]='9999999'
 const{planSha256,...body}=plan;plan.planSha256=historicalStatisticsPolicySha256(body)
 let calls=0
 await assert.rejects(()=>collectFcfFinalAudit({onCapture:()=>{},plan,request:async()=>{calls++;return new Response('normal bytes')},parse:()=>({}),pause:async()=>{}}),/FCF_AUDIT/)
 assert.equal(calls,0)
})
test('native transport refuses UTF8 BOM instead of silently changing the retained actual-byte hash',async()=>{
 const plan=buildFcfFinalAuditPlan(fixture());let calls=0
 await assert.rejects(()=>withBoundedFcfTransport(plan,request=>collectFcfFinalAudit({onCapture:()=>{},plan,request,pause:async()=>{},parse:()=>({})}),{network:async()=>{calls++;return new Response(Buffer.from([239,187,191,65]))}}),/FCF_AUDIT/)
 assert.equal(calls,1)
})

test('collector requires an explicit raw-evidence retention callback before any request',async()=>{
 let calls=0
 await assert.rejects(()=>collectFcfFinalAudit({plan:buildFcfFinalAuditPlan(fixture()),request:async()=>{calls++;return new Response('normal bytes')},parse:()=>({}),pause:async()=>{}}),/FCF_AUDIT/)
 assert.equal(calls,0)
})
test('failed asynchronous raw-evidence retention stops before parsing or another source request',async()=>{
 let calls=0,parsed=0
 await assert.rejects(()=>collectFcfFinalAudit({plan:buildFcfFinalAuditPlan(fixture()),request:async()=>{calls++;return new Response('normal bytes')},parse:()=>{parsed++;return{}},pause:async()=>{},onCapture:async()=>{throw Error('evidence storage unavailable')}}),/evidence storage unavailable/)
 assert.equal(calls,1);assert.equal(parsed,0)
})
