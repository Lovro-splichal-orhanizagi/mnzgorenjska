import test from 'node:test'
import {nativeRuntimeFixture} from './fussball-native-runtime-test-fixture.mjs'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {runInNewContext} from 'node:vm'
import {partitionFixture,isolatedComposition,json,digest,hash} from './fussball-native-composition-test-fixture.mjs'
import * as policy from './lib/fussball-native-history-policy.mjs'
import * as seasonApi from './fussball-season.mjs'
import * as nativeImport from './fussball-import.mjs'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {validateFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import * as bulkProof from './bulk-native-proof.mjs'
import {reserveFussballIdentities,reviewedFussballCommunityCompetition,assertFussballCommunityScope} from './viri/fussball-public.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
const runtimePath=new URL('./fussball-native-runtime.mjs',import.meta.url)
const competition={id:77001,country_id:66,country_code:'DE',slug:policy.BADEN_SLUG,source:'fussball-public',source_league_code:policy.BADEN_CURRENT,source_policy:policy.BADEN_CARDS,date_only_deadline_policy:null,active:false}
// TEST ONLY isolated module evaluation. Synthetic round pages and native IDs
// never mint a production capability. Reports still use retained original bytes
// and the real strict parser/normalizer. No genuine full archive claim.
const fixture=t=>nativeRuntimeFixture(t,competition)

test('TEST ONLY real capture client writes and immediately reloads successful runtime; both canonical seeds are bound',async t=>{
 const f=fixture(t),context=await f.context(),seed=join(f.directory,'seed');f.controls.clock=Date.now()
 await f.api.seedFussballNativeRuntime({context,competition,directory:seed})
 for(const source of f.pack.seasons){
  const requests=[],directory=join(f.directory,source.inventory.scope.stage),stage=f.f.state.originals.stages[source.inventory.scope.stage]
  const batch=await f.api.captureFussballNativeRuntimeDirectory({context,competition,code:source.code,directory,seedDirectory:seed,fetchFn:async url=>{requests.push(url);return f.sourceResponse(url)}})
  assert.equal(requests[0],stage.result.scope.seedUrl)
  assert.deepEqual(await f.api.loadFussballNativeRuntimeCapture({context,competition,code:source.code,directory}),batch)
  const manifest=JSON.parse(fs.readFileSync(join(directory,'native-runtime.json')))
  assert.equal(manifest.snapshot.attempts[0].status,'success')
  assert.equal(JSON.parse(fs.readFileSync(join(directory,'attempts.jsonl'),'utf8').trim().split('\n')[0]).status,'pending')
  assert.ok(!requests.some(url=>f.observed.history.markers.some(m=>url.includes(m.sourceMatchId))))
 }
})
test('TEST ONLY canonical season seed comes from sealed originals rather than the redirecting alias',async t=>{
 const f=fixture(t),context=await f.context()
 for(const source of f.pack.seasons){const client=f.client(source.code);await f.api.collectFussballNativeRuntime({context,competition,code:source.code,client,asOfDate:'2026-10-28'});assert.equal(client.requests[0].url,f.f.state.originals.stages[source.inventory.scope.stage].result.scope.seedUrl)}
})
test('TEST ONLY relabeled manifest clocks cannot refresh old round receipts',async t=>{
 const f=fixture(t),initial=await f.context(),seed=join(f.directory,'seed'),directory=join(f.directory,'runtime');f.controls.clock=Date.now()
 await f.api.seedFussballNativeRuntime({context:initial,competition,directory:seed});f.observed.active=true
 const {context}=await f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory:seed})
 await f.api.captureFussballNativeRuntimeDirectory({context:initial,competition,directory,seedDirectory:seed,fetchFn:async url=>f.sourceResponse(url)})
 const path=join(directory,'native-runtime.json'),manifest=JSON.parse(fs.readFileSync(path))
 await f.api.loadFussballNativeRuntimeCapture({context,competition,directory})
 f.controls.clock+=2*24*3600_000;manifest.createdAt=new Date(f.controls.clock).toISOString();manifest.completedAt=manifest.createdAt
 fs.writeFileSync(path,JSON.stringify(manifest))
 await assert.rejects(f.api.loadFussballNativeRuntimeCapture({context,competition,directory}),/round|receipt|calendar|as.of|interval/i)
 manifest.asOfDate=manifest.createdAt.slice(0,10);fs.writeFileSync(path,JSON.stringify(manifest))
 await assert.rejects(f.api.loadFussballNativeRuntimeCapture({context,competition,directory}),/receipt|interval/i)
})
test('TEST ONLY real-client replay refuses missing/empty/altered journals and cached rounds; retained non-round dates survive reuse',async t=>{
 // TEST ONLY coherent synthetic source and runtime clocks. Original metadata
 // is constructed at this epoch, not relabeled after capture.
 const f=nativeRuntimeFixture(t,competition,{clock:Date.parse('2026-10-29T12:00:00.000Z')}),initial=await f.context(),seed=join(f.directory,'seed'),directory=join(f.directory,'runtime')
 await f.api.seedFussballNativeRuntime({context:initial,competition,directory:seed});f.observed.active=true
 const {context}=await f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory:seed}),fetchFn=async url=>f.sourceResponse(url)
 await f.api.captureFussballNativeRuntimeDirectory({context,competition,directory,seedDirectory:seed,fetchFn})
 const path=join(directory,'native-runtime.json'),original=JSON.parse(fs.readFileSync(path)),intentsPath=join(directory,'attempts.jsonl'),outcomesPath=join(directory,'outcomes.jsonl'),intents=fs.readFileSync(intentsPath),outcomes=fs.readFileSync(outcomesPath)
 fs.unlinkSync(intentsPath);await assert.rejects(f.api.loadFussballNativeRuntimeCapture({context,competition,directory}),/ENOENT/);fs.writeFileSync(intentsPath,intents)
 for(const mutate of [
  (m)=>{fs.writeFileSync(intentsPath,'');fs.writeFileSync(outcomesPath,'');m.intentsSha256=hash(Buffer.alloc(0));m.outcomesSha256=m.intentsSha256;m.snapshot.attempts=[];m.snapshot.requests=0},
  (m)=>{const list=intents.toString().trim().split('\n').map(JSON.parse);list[0].url+='-tamper';const bytes=jsonLines(list);fs.writeFileSync(intentsPath,bytes);m.intentsSha256=hash(bytes)},
  (m)=>{m.documents.find(d=>d.origin==='cache').kind='round'},
  (m)=>{const d=m.documents.find(d=>d.origin==='cache');d.capturedAt=m.createdAt},
  (m)=>{const list=outcomes.toString().trim().split('\n').map(JSON.parse);list[0].startedAt=new Date(Date.parse(list[0].startedAt)+1).toISOString();const bytes=jsonLines(list);fs.writeFileSync(outcomesPath,bytes);m.outcomesSha256=hash(bytes);m.snapshot.attempts=list},
 ]){
  const m=structuredClone(original);mutate(m);fs.writeFileSync(path,JSON.stringify(m))
  await assert.rejects(f.api.loadFussballNativeRuntimeCapture({context,competition,directory}),/accounting|intent|outcome|cached round|receipt|interval/i)
  fs.writeFileSync(path,JSON.stringify(original));fs.writeFileSync(intentsPath,intents);fs.writeFileSync(outcomesPath,outcomes)
 }
 f.controls.clock+=6000;const reused=join(f.directory,'reused')
 await f.api.captureFussballNativeRuntimeDirectory({context,competition,directory:reused,seedDirectory:join(directory,'seed'),reuseDirectory:directory,fetchFn})
 const later=JSON.parse(fs.readFileSync(join(reused,'native-runtime.json')))
 const freshRounds=later.documents.filter(d=>d.kind==='round')
 assert.ok(freshRounds.length>0);assert.ok(freshRounds.every(d=>d.origin==='network'&&d.capturedAt.slice(0,10)===later.asOfDate&&Date.parse(d.capturedAt)>Date.parse(original.completedAt)))
 for(const d of later.documents.filter(d=>d.origin==='cache')){const previous=original.documents.find(p=>p.url===d.url);assert.equal(d.capturedAt,previous.capturedAt);assert.deepEqual(d.originalReceipt,previous.originalReceipt)}
 function jsonLines(values){return Buffer.from(values.map(v=>JSON.stringify(v)+'\n').join(''))}
})
test('production cannot recreate runtime authority from copied context/preparation or unfinalized catalog',async()=>{
 const api=await import('./fussball-native-runtime.mjs');let reads=0
 for(const p of [{},{nativeImportEligible:true}]){
  assert.throws(()=>api.getFussballNativeRuntimeContext(p,competition),/private prepared/)
  await assert.rejects(api.loadFussballNativeImportContext({competition,preparation:p,db:{rpc(){reads++}}}),/issuer-issued/)
 }
 assert.equal(reads,0)
})
test('TEST ONLY fresh full headers omit known/admin markers before every report GET/card/individual derivation',async t=>{
 const f=fixture(t),context=await f.context()
 for(const source of f.pack.seasons){const client=f.client(source.code),batch=await f.api.collectFussballNativeRuntime({context,competition,code:source.code,client,asOfDate:'2026-10-28'})
  const markers=f.observed.history.markers.filter(m=>m.fixture.sourceCompetitionId===source.code)
  for(const marker of markers){assert.ok(!client.requests.some(r=>r.url.includes(marker.sourceMatchId)));assert.ok(!batch.reports.some(r=>r.id===marker.reportId));assert.ok(!batch.pendingReports.some(r=>r.id===marker.reportId));assert.ok(!batch.cardEnvelopes.some(r=>r.reportId===marker.reportId))}
  assert.equal(batch.schedule.flatMap(r=>r.tekme).filter(r=>r.historicalMarker).length,markers.length)
  const withoutEnvelope=reports=>reports.map(({cardEnvelope,...r})=>r)
  assert.deepEqual(withoutEnvelope(batch.reports),withoutEnvelope(source.reports));assert.deepEqual(withoutEnvelope(batch.pendingReports),withoutEnvelope(source.pendingReports))
  for(const e of batch.cardEnvelopes)validateFussballCardEnvelope(e)
  const unknown=batch.schedule.flatMap(r=>r.tekme).find(r=>r.administrativeResult)
  if(unknown){assert.equal(unknown.rezultat,null);assert.equal(unknown.izid,null);assert.deepEqual(unknown.administrativeResult,source.fixtures[0].administrativeResult)}
 }
})
test('TEST ONLY wrong/copied contexts, native marker drift, missing marker and fresh source header drift hold before reports',async t=>{
 const f=fixture(t),context=await f.context()
 assert.throws(()=>f.api.getFussballNativeRuntimeContext({...context},competition),/private prepared/)
 assert.throws(()=>f.api.getFussballNativeRuntimeContext(context,{...competition,id:1}),/exact prepared/)
 const mutations=[v=>{v.history.markers=[];v.markerInventorySha256=digest([])},v=>{v.cards.enabled=false},v=>{v.bindings[0].homeTeamId++;v.bindingSha256=digest(v.bindings)},v=>{v.history.markers[0].individualRowCount=1;v.markerInventorySha256=digest(v.history.markers)}]
 for(const mutate of mutations){f.controls.mutate=mutate;await assert.rejects(f.api.reauthenticateFussballNativeRuntimeContext(context,competition),/Baden runtime/)}
 delete f.controls.mutate
 const marker=f.observed.history.markers.find(m=>m.fixture.sourceCompetitionId===policy.BADEN_CURRENT)
 for(const change of [fixtures=>{fixtures.find(f=>f.id===marker.sourceMatchId).ura='00:01'},fixtures=>{fixtures.splice(fixtures.findIndex(f=>f.id===marker.sourceMatchId),1)}]){
  f.controls.scheduleMutation=change;const client=f.client(policy.BADEN_CURRENT)
  await assert.rejects(f.api.collectFussballNativeRuntime({context,competition,code:policy.BADEN_CURRENT,client,asOfDate:'2026-10-28'}),/Baden runtime/)
  assert.equal(client.requests.filter(r=>r.kind==='report').length,0)
 }
})
test('TEST ONLY ordinary strict failure is never reclassified as unavailable',async t=>{
 const f=fixture(t),context=await f.context(),client=f.client(policy.BADEN_CURRENT),read=client.read
 client.read=async(url,kind)=>kind==='report'?{bytes:Buffer.from('<html>TEST ONLY corrupt ordinary report</html>')}:read(url,kind)
 await assert.rejects(f.api.collectFussballNativeRuntime({context,competition,code:policy.BADEN_CURRENT,client,asOfDate:'2026-10-28'}),/fussball/)
 assert.equal(f.observed.history.markers.length,2)
 f.controls.expired=true
 await assert.rejects(f.api.collectFussballNativeRuntime({context,competition,code:policy.BADEN_CURRENT,client,asOfDate:'2026-10-28'}),/fresh source/)
})
test('TEST ONLY bulk source consumes private bound cap once and preserves exact pending envelopes; wrapper refuses marker leakage',async t=>{
 const f=fixture(t),context=await f.context(),loaderCalls=[],reservationCalls=[]
 const sourcePath=new URL('./viri/bulk-captured.mjs',import.meta.url),body=fs.readFileSync(sourcePath,'utf8').replace(/^import .*\n/gm,'').replace(/\bexport /g,'')+'\nreturn createBulkCapturedSource;'
 const deps={...bulkProof,reserveFussballIdentities,reviewedFussballCommunityCompetition,assertFussballCommunityScope,...nativeImport,...f.api}
 const create=new Function(...Object.keys(deps),body)(...Object.values(deps))
 const identities=new Map(f.pack.seasons.flatMap(s=>s.identities.map(i=>[i.source_id,i.reg_st])))
 const db={async rpc(name,{p_source_ids}){assert.equal(name,'fussball_reserve_player_ids');reservationCalls.push(p_source_ids);return {data:p_source_ids.map(source_id=>({source_id,reg_st:identities.get(source_id)}))}}}
 const source=create({competition,db,directory:'TEST-ONLY-unused-directory',installedHistoricalMarkers:context,loadPack(){loaderCalls.push('untrusted');throw Error('caller loader must not grant native authority')}})
 const wrapperPath=new URL('./viri/fussball-historical.mjs',import.meta.url),wrapperBody=fs.readFileSync(wrapperPath,'utf8').replace(/^import .*\n/gm,'').replace(/\bexport /g,'')+'\nreturn withFussballHistoricalStatistics;'
 const wrap=new Function(...Object.keys(f.api),wrapperBody)(...Object.values(f.api)),wrapped=wrap(source,competition,{installedHistoricalMarkers:context})
 const schedules=await wrapped.razporedVseStrani(policy.BADEN_CURRENT),reports=await wrapped.zapisniki(policy.BADEN_CURRENT)
 assert.equal(schedules.flatMap(r=>r.tekme).filter(r=>r.historicalMarker).length,1)
 assert.deepEqual(reports.filter(r=>r.statisticsPending),f.pack.seasons[0].pendingReports)
 assert.equal(reservationCalls.length,1);await wrapped.zapisniki(policy.BADEN_CURRENT);assert.equal(reservationCalls.length,1);assert.deepEqual(loaderCalls,[])
 const marker=f.observed.history.markers[0],leaky=wrap({...source,async zapisniki(){return [{id:marker.reportId,z:{}}]}},competition,{installedHistoricalMarkers:context})
 await assert.rejects(leaky.zapisniki(policy.BADEN_CURRENT),/unavailable report/)
})
test('TEST ONLY durable active context authenticates actual installed binding and originals without restarting source freshness',async t=>{
 const f=fixture(t),context=await f.context(),seed=join(f.directory,'seed')
 await f.api.seedFussballNativeRuntime({context,competition,directory:seed})
 const before=JSON.parse(fs.readFileSync(join(seed,'native-history-seed.json')))
 f.observed.active=true;f.controls.expired=true
 const loaded=await f.api.loadFussballNativeRuntimeSeed({competition:{...competition,active:true},db:f.db,directory:seed})
 assert.equal(loaded.seal.captured_at,before.captured_at);assert.equal(loaded.seal.currentFreshUntil,before.currentFreshUntil)
 await f.api.reauthenticateFussballNativeRuntimeContext(loaded.context,competition)
 f.controls.dbFailure=true;await assert.rejects(f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory:seed}),/getter failed/);delete f.controls.dbFailure
 f.controls.mutate=v=>{v.cards.archive_codes=[]};await assert.rejects(f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory:seed}),/community binding/);delete f.controls.mutate
 const doc=before.files.find(d=>d.path.includes('/documents/'));fs.unlinkSync(join(seed,doc.path))
 await assert.rejects(f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory:seed}),/ENOENT/)
})
test('TEST ONLY seed JSON cannot alter authenticated pack or original timestamp',async t=>{
 const f=fixture(t),context=await f.context(),seed=join(f.directory,'seed')
 await f.api.seedFussballNativeRuntime({context,competition,directory:seed});f.observed.active=true
 const path=join(seed,'native-history-seed.json'),seal=JSON.parse(fs.readFileSync(path));seal.pack.captured_at=new Date().toISOString();fs.writeFileSync(path,JSON.stringify(seal))
 await assert.rejects(f.api.loadFussballNativeRuntimeSeed({competition,db:f.db,directory:seed}),/manifest differs/)
})
test('Baden read-only SQL separates bound runtime from cold no-user/freshness gate',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/20261028181000_baden_history_runtime_context.sql',import.meta.url),'utf8')
 assert.doesNotMatch(sql,/\b(insert|update|delete)\s+(into|from|public\.)/i)
 assert.doesNotMatch(sql,/not c\.active|currentFreshUntil|fantasy_teams|deadline_at>clock_timestamp/)
 for(const text of ['private_fussball.service()','private_baden_history.catalog','private_baden_history.prepared','m.imported_at is null','not exists(select 1 from appearances','not exists(select 1 from goals','not exists(select 1 from private_fussball.card_reports','public.get_installed_historical_statistics_markers','public.get_fussball_card_policy','to service_role'])assert.ok(sql.includes(text),text)
})
test('Baden archive-only insertion inactive; archive cannot move current membership or manufacture current keeper',async()=>{
 const code=fs.readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8'),start=code.indexOf('async function igralecId('),end=code.indexOf('\nasync function ',start+10),body=code.slice(start,end)
 const run=async(current,existing,vratar=true)=>{
  const writes=[];let inserted=0
  const chain={select(){return this},eq(){return this},async maybeSingle(){return {data:existing}},insert(row){writes.push({insert:row});inserted++;return this},async single(){return {data:{id:100}}},update(row){writes.push({update:row});return this},then(resolve){resolve({})}}
  const context={vir:{imaRegistracije:true},isBadenNativeCompetition:c=>c.slug===policy.BADEN_SLUG,tekmovanje:competition,tekocaSezona:current,igralci:new Map(),klubPoReg:new Map(),db:{from:()=>chain},posvojiKlubskega:async()=>null,posodobiIgralca:async(id,row)=>{writes.push({update:row})},POLJA_IGRALCA:'id',anonimiziranVLigi:async()=>null,regHash:()=>'',vrnjenoIme:()=>({}),razdeliIme:()=>({priimek:'Test',ime:'Only'}),preveriUgovor:async()=>{},console:{log(){}}}
  runInNewContext(body+'\nthis.runPlayer=igralecId',context)
  await context.runPlayer(2,'TEST ONLY Player',{vratar,st:1,regSt:12345,datum:'2026-10-28'})
  return {writes,inserted}
 }
 const archive=await run(false,null);assert.equal(archive.writes[0].insert.active,false);assert.equal(archive.writes[0].insert.position,null)
 const old={id:100,team_id:9,position:null,position_source:'neznano',active:false}
 const historical=await run(false,old);assert.ok(historical.writes.every(w=>w.update?.team_id===undefined&&w.update?.position===undefined&&w.update?.active===undefined))
 const current=await run(true,old);assert.ok(current.writes.some(w=>w.update?.team_id===2&&w.update.active===true&&w.update.position==='GK'))
})

test('TEST ONLY fixed native runtime parses original captain keeper role bytes and refuses duplicate live roles',async t=>{
 const f=fixture(t),context=await f.context(),code=policy.BADEN_CURRENT
 const single='<div class="captain"><span class="c">T</span></div>',role='<div class="captain"><span class="c">C</span></div><div class="goal-keeper"><span class="k">T</span></div>'
 let duplicate=false
 const base=f.client(code),pending=f.pack.seasons.find(s=>s.code===code).pendingReports[0],lineupId=JSON.parse(fs.readFileSync(new URL('./vzorci/de-fussball-community/provenance.json',import.meta.url))).matchId
 const client={async read(url,kind){const d=await base.read(url,kind);if(kind!=='lineup'||!url.includes(lineupId))return d;assert.ok(d.bytes.toString().includes(single));return {...d,bytes:Buffer.from(d.bytes.toString().replace(single,duplicate?role+role:role))}}}
 const batch=await f.api.collectFussballNativeRuntime({context,competition,code,client,asOfDate:'2026-10-28'}),e=batch.cardEnvelopes.find(e=>e.reportId===pending.id)
 assert.equal(e.nativeRoleParser.protocol,'fussball-native-captain-keeper-v1');assert.ok(Buffer.from(e.bundle.lineup.base64,'base64').toString().includes(role));assert.equal(batch.pendingReports.find(r=>r.id===pending.id).statisticsPending,true)
 assert.throws(()=>validateFussballCardEnvelope(e));duplicate=true
 await assert.rejects(f.api.collectFussballNativeRuntime({context,competition,code,client,asOfDate:'2026-10-28'}),/duplicate|vratar|goalkeeper/)
})

test('TEST ONLY fixed fixture clock survives a far-later host clock and real original24h expiry still holds',async t=>{
 const clock=Date.parse('2026-10-29T12:00:00.000Z');
 t.mock.method(Date,'now',()=>Date.parse('2035-01-01T00:00:00.000Z'));
 const f=nativeRuntimeFixture(t,competition,{clock}),context=await f.context();
 assert.equal(f.f.proof.source.currentCreatedAt,'2026-10-29T11:59:00.000Z');
 const originalUntil=f.f.proof.source.currentFreshUntil;
 assert.equal(originalUntil,'2026-10-30T11:59:00.000Z');
 assert.equal(f.api.getFussballNativeRuntimeContext(context,competition).pack.currentFreshUntil,originalUntil);
 const SyntheticDate=class extends Date{static now(){return f.controls.clock}},composition=isolatedComposition(f.f,{Date:SyntheticDate});
 assert.equal(composition.buildFussballNativeComposition(f.f.proof).currentFreshUntil,originalUntil);
 f.controls.clock=Date.parse(originalUntil)+1;
 assert.throws(()=>composition.buildFussballNativeComposition(f.f.proof),/original current freshness expired or differs/);
 assert.equal(f.f.proof.source.currentFreshUntil,originalUntil,'TEST ONLY advancing observation cannot renew original receipts');
 assert.equal(f.controls.expired,undefined,'real freshness check, not synthetic expired stub');
});
