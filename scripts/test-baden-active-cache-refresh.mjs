// TEST ONLY synthetic schedules/native authority; real retained report parser,
// real cache/client, journals, pacing and offline replay. No external requests.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {nativeRuntimeFixture} from './fussball-native-runtime-test-fixture.mjs'
import * as policy from './lib/fussball-native-history-policy.mjs'
const competition={id:77001,country_id:66,country_code:'DE',slug:policy.BADEN_SLUG,source:'fussball-public',source_league_code:policy.BADEN_CURRENT,source_policy:policy.BADEN_CARDS,date_only_deadline_policy:null,active:false}
const json=p=>JSON.parse(readFileSync(p,'utf8'))
async function setup(t){
 const f=nativeRuntimeFixture(t,competition);f.controls.clock=Date.now()
 const initial=await f.context(),seed=join(f.directory,'seed');await f.api.seedFussballNativeRuntime({context:initial,competition,directory:seed})
 const originalSeal=readFileSync(join(seed,'native-history-seed.json')),originalFiles=new Map(json(join(seed,'native-history-seed.json')).files.map(d=>[d.path,readFileSync(join(seed,d.path))]))
 f.observed.active=true;f.controls.expired=true
 const {context,competition:active}=await f.api.loadFussballNativeRuntimeSeed({competition:{...competition,active:true},db:f.db,directory:seed})
 const stage=f.f.state.originals.stages.current,requests=[],controls={revision:0};f.controls.roundSchedules=new Map()
 const fetchFn=async url=>{requests.push(url);if(url.includes('/spieltag/')){const body='TEST ONLY round capture '+controls.revision;if(!f.controls.roundSchedules.has(body)){const fixtures=structuredClone(f.pack.seasons[0].fixtures);f.controls.scheduleMutation?.(fixtures);f.controls.roundSchedules.set(body,fixtures)}return new Response(body,{headers:{'content-type':'text/html'}})}
  if(controls.fail?.(url))return new Response('TEST ONLY source refusal',{status:503,headers:{'content-type':'text/html'}})
  if(controls.documents?.has(url))return new Response(controls.documents.get(url),{headers:{'content-type':'text/html'}})
  const d=stage.manifest.documents.find(d=>d.url===url);assert.ok(d,'TEST ONLY unexpected network route: '+url)
  let bytes=stage.files.get(d.file);if(controls.change)bytes=Buffer.from(controls.change(url,d,bytes.toString()))
  return new Response(bytes,{headers:{'content-type':d.contentType}})
 }
 async function capture(name,reuseDirectory){controls.revision++;f.controls.clock+=6000;const directory=join(f.directory,name);const batch=await f.api.captureFussballNativeRuntimeDirectory({context,competition:active,directory,seedDirectory:seed,...(reuseDirectory?{reuseDirectory}:{}),fetchFn});return {directory,batch,manifest:json(join(directory,'native-runtime.json'))}}
 function intact(){assert.deepEqual(readFileSync(join(seed,'native-history-seed.json')),originalSeal);for(const [p,b]of originalFiles)assert.deepEqual(readFileSync(join(seed,p)),b);assert.equal(f.api.getFussballNativeRuntimeContext(context).pack.currentFreshUntil,json(join(seed,'native-history-seed.json')).currentFreshUntil);assert.ok(!requests.some(url=>f.observed.history.markers.some(m=>url.includes(m.sourceMatchId))))}
 return {...f,context,active,seed,stage,requests,network:controls,capture,intact}
}
function completedPending(html){return html.replace('<div class="valign-cell">Gelb-Rote Karte</div>','<div class="valign-cell">Gelbe Karte</div>').replace('<span class="icon-stack"><span class="icon-card-half yellow-card"></span><span class="icon-card red-card"></span></span>','<i class="icon-card yellow-card"></i>').replace("'time':'68','type':'yellow-red-card'","'time':'68','type':'yellow-card'")}
test('ACTIVE two captures refresh pending report and lineup at same URLs, then reuse complete originals',async t=>{
 const f=await setup(t),id=f.stage.result.pendingReports[0].fixture.id,first=await f.capture('first')
 assert.equal(first.batch.pendingReports.length,1)
 f.network.change=(url,d,s)=>d.kind==='report'&&url.includes(id)?completedPending(s):s
 const start=f.requests.length,second=await f.capture('second',first.directory)
 assert.equal(second.batch.pendingReports.length,0,'new strict completed body must replace the cached pending report')
 assert.equal(second.batch.reports.length,2);assert.ok(f.requests.slice(start).some(u=>u.includes('/spiel/')&&u.includes(id)));assert.ok(f.requests.slice(start).some(u=>u.includes('/ajax.match.lineup/')&&u.includes(id)))
 const thirdStart=f.requests.length;await f.capture('third',second.directory)
 assert.ok(f.requests.slice(thirdStart).every(u=>u.includes('/spieltag/')),'unchanged complete reports must stay warm')
 for(const capture of [first,second]){const a=capture.manifest.snapshot.attempts;assert.equal(a.length,capture.manifest.documents.filter(d=>d.origin==='network').length);assert.ok(a.every((v,i)=>i===0||Date.parse(v.startedAt)-Date.parse(a[i-1].startedAt)>=6000))}
 f.intact()
})
test('ACTIVE changed ordinary date refreshes both cached HTML bodies and accepts a new source-linked player',async t=>{
 const f=await setup(t),old=f.stage.result.reports[0].fixture,first=await f.capture('first')
 const d=old.datum.split('-').reverse().join('.'),next='12.10.2026';let replaced=false
 const lineup=f.stage.manifest.documents.find(d=>d.kind==='lineup'&&d.url.includes(old.id)),oldId=f.stage.files.get(lineup.file).toString().match(/\/userid\/([A-Z0-9]{32})/)[1],newId='A'.repeat(32)
 f.controls.scheduleMutation=fixtures=>{fixtures.find(x=>x.id===old.id).datum='2026-10-12'}
 f.network.change=(url,doc,s)=>{if(url.includes(old.id)){if(doc.kind==='report'){assert.ok(s.includes(d));replaced=true}return s.replaceAll(d,next).replace(/(<div class="date">)[\s\S]*?<\/div>/,'$1'+next+' '+old.ura+'</div>').replaceAll(oldId,newId)}return s}
 const start=f.requests.length,second=await f.capture('second',first.directory)
 assert.ok(replaced);assert.equal(second.batch.reports.find(r=>r.id===old.zapisnikId).z.datum,'2026-10-12');assert.ok(second.batch.identities.some(i=>i.source_id.endsWith(newId)));assert.ok(f.requests.slice(start).some(u=>u===old.url));assert.ok(f.requests.slice(start).some(u=>u.includes('/ajax.match.lineup/')&&u.includes(old.id)));f.intact()
})
test('ACTIVE pending refresh refusal has counted paced journals and cannot fall back to old valid pending HTML',async t=>{
 const f=await setup(t),first=await f.capture('first'),id=f.stage.result.pendingReports[0].fixture.id
 f.network.fail=url=>url.includes(id);const directory=join(f.directory,'failed')
 await assert.rejects(f.api.captureFussballNativeRuntimeDirectory({context:f.context,competition:f.active,directory,seedDirectory:f.seed,reuseDirectory:first.directory,fetchFn:async url=>{f.requests.push(url);if(url.includes(id))return new Response('TEST ONLY refusal',{status:503});return new Response('TEST ONLY synthetic full schedule',{headers:{'content-type':'text/html'}})}}),/503|HTTP|status|stopped/i)
 const intents=readFileSync(join(directory,'attempts.jsonl'),'utf8').trim().split('\n').map(JSON.parse),outcomes=readFileSync(join(directory,'outcomes.jsonl'),'utf8').trim().split('\n').map(JSON.parse)
 assert.equal(intents.length,outcomes.length);assert.equal(outcomes.at(-1).status,'failed');assert.ok(outcomes.at(-1).url.includes(id));assert.ok(outcomes.every((v,i)=>!i||Date.parse(v.startedAt)-Date.parse(outcomes[i-1].startedAt)>=6000));f.intact()
})
test('COLD prepared import uses only authenticated originals and marker headers remain immutable',async t=>{
 const f=nativeRuntimeFixture(t,competition),context=await f.context();let network=0;const fetch=globalThis.fetch;let pack
 try{globalThis.fetch=async()=>{network++;throw Error('TEST ONLY COLD football forbidden')};pack=await f.api.loadPreparedFussballNativePack({competition,context})}finally{globalThis.fetch=fetch}
 assert.equal(network,0);assert.ok(pack.seasons[0].reports.length)
 const rows=structuredClone(pack.seasons[0].schedule),marker=rows.flatMap(r=>r.tekme).find(r=>r.historicalMarker);delete marker.historicalMarker;marker.datum='2026-10-29';assert.throws(()=>f.api.bindFussballHistoricalSchedule(context,competition,policy.BADEN_CURRENT,rows),/marker|historical/i)
 assert.ok(f.calls.every(name=>name==='source'||name==='get_fussball_historical_runtime'),'prepared loader only reads private authority and originals')
})

test('ACTIVE changed score invalidates cached HTML but a fresh mismatching body still HOLDs',async t=>{
 const f=await setup(t),old=f.stage.result.reports[0].fixture,first=await f.capture('first')
 f.controls.scheduleMutation=fixtures=>{const row=fixtures.find(x=>x.id===old.id);row.rezultat={...row.rezultat,domaci:row.rezultat.domaci+1}}
 const start=f.requests.length
 await assert.rejects(f.capture('changed-score',first.directory),/header|glav|rezultat/i)
 assert.ok(f.requests.slice(start).includes(old.url),'changed score must fetch a new report instead of parsing retained HTML');f.intact()
})
test('ACTIVE report plus lineup refresh obeys the single global request cap without cached fallback',async t=>{
 const f=await setup(t),limit=f.stage.result.schedule.rounds.length+1,id=f.stage.result.pendingReports[0].fixture.id,directory=join(f.directory,'budget')
 await assert.rejects(f.api.captureFussballNativeRuntimeDirectory({context:f.context,competition:f.active,directory,seedDirectory:f.seed,maxRequests:limit,fetchFn:async url=>{f.requests.push(url);if(url.includes('/spieltag/'))return new Response('TEST ONLY synthetic full schedule',{headers:{'content-type':'text/html'}});const d=f.stage.manifest.documents.find(d=>d.url===url);assert.ok(d);return new Response(f.stage.files.get(d.file),{headers:{'content-type':d.contentType}})}}),/budget exhausted/)
 const lines=p=>readFileSync(join(directory,p),'utf8').trim().split('\n').map(JSON.parse),intents=lines('attempts.jsonl'),outcomes=lines('outcomes.jsonl')
 assert.equal(intents.length,limit);assert.equal(outcomes.length,limit);assert.ok(outcomes.at(-1).url.includes(id));assert.ok(outcomes.every((v,i)=>v.status==='success'&&(!i||Date.parse(v.startedAt)-Date.parse(outcomes[i-1].startedAt)>=6000)));f.intact()
})

// TEST ONLY changed source bodies at a formerly unplayed known fixture. Its
// goals/roster still pass the real strict parser; no production IDs are minted.
test('ACTIVE future fixture gains its first valid score and report without freezing the initial header',async t=>{
 const f=await setup(t),old=f.stage.result.reports[0].fixture,future=f.pack.seasons[0].fixtures.find(x=>x.rezultat===null),first=await f.capture('first')
 const report=f.stage.manifest.documents.find(d=>d.kind==='report'&&d.url===old.url),lineup=f.stage.manifest.documents.find(d=>d.kind==='lineup'&&d.url.includes(old.id)),date='28.10.2026'
 const main=f.stage.files.get(report.file).toString().replaceAll(old.url,future.url).replaceAll(old.id,future.id).replaceAll('11.10.2026',date).replace(/(<div class="date">)[\s\S]*?<\/div>/,'$1'+date+' '+old.ura+'</div>').replace(' / 8. Spieltag',' / 9. Spieltag')
 f.network.documents=new Map([[future.url,main],[lineup.url.replace(old.id,future.id),f.stage.files.get(lineup.file).toString().replaceAll(old.id,future.id)]])
 f.controls.scheduleMutation=fixtures=>{const row=fixtures.find(x=>x.id===future.id);row.rezultat=structuredClone(old.rezultat);row.datum='2026-10-28'}
 const second=await f.capture('second',first.directory),r=second.batch.reports.find(r=>r.id===future.zapisnikId)
 assert.ok(r);assert.deepEqual(r.z.rezultat,old.rezultat);assert.equal(r.z.datum,'2026-10-28');assert.equal(r.z.krog,9);f.intact()
})
