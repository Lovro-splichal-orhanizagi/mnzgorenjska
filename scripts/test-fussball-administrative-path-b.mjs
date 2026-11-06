// FUSSBALL pot B: administrativni izid (U/V/W) se uvozi kot uradna odločitev
// brez izida, postav in točk (odločitev lastnika 4. 11. 2026). Brez omrežja in
// baze; U in V sta resnični vrstici iz zajema 41804947752 (Oberliga
// Schleswig-Holstein, 4. in 10. krog, 1.FC Phönix Lübeck II).
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {razberiKrog} from './viri/fussball.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'
import {buildFussballCurrentOnlyBatch,loadFussballCurrentOnlyCapture,fussballCurrentOnlyManifest,fussballScheduleWarnings,fussballAdministrativeWarning,writeFussballCurrentOnlyCache,loadFussballCurrentOnlyCache,CURRENT_ONLY_ANY,FUSSBALL_ADMINISTRATIVE_WARNING} from './fussball-tekoca-pot.mjs'
import {uskladiOpozorilaRazporeda} from './razpored.mjs'
import {createFussballPublicSource} from './viri/fussball-public.mjs'

const clone=x=>structuredClone(x)
// Real U (round 4) and V (round 10) rows from the retained round pages.
const sample=new URL('./vzorci/de-fussball-administrative-41804947752/',import.meta.url)
const proof=JSON.parse(readFileSync(new URL('provenance.json',sample)))
const doc=d=>readFileSync(new URL(d.file.split('/').pop(),sample))
for(const d of proof.documents)assert.equal(createHash('sha256').update(doc(d)).digest('hex'),d.sha256)
const roundFonts=Object.fromEntries(proof.documents.filter(d=>d.kind==='font').map(d=>[d.url.match(/\/id\/([^/]+)/)[1],{bytes:doc(d),sha256:d.sha256}]))
const [uRow,vRow]=proof.documents.filter(d=>d.kind==='round').map(d=>razberiKrog(doc(d).toString(),{fonts:roundFonts,staffel:proof.staffel}).tekme.find(f=>Object.hasOwn(f,'administrativeResult')))
const uId='031BT5ANOK000000VS5489BTVUS470OH',vId='031BT5ALOO000000VS5489BTVUS470OH'

// Ordinary complete report (same fixture as test-fussball-tekoca-pot.mjs).
const read=name=>readFileSync(new URL(`./vzorci/${name}`,import.meta.url))
const manifest=JSON.parse(read('de-fussball-zapisnik.json'))
const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',scope={staffel,season:'2026/27'}
const url='https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/'+id
const report=razberiFantasyZapisnik(read('de-fussball-ilvesheim-main.html').toString(),read('de-fussball-ilvesheim-lineup.html').toString(),{fonts,id,lineupId:id})
const rejectedId='031EQBPLA0000000VS5489BTVUS470OH'

function season({admin=[uRow,vRow],rejected=false}={}){
 const fixture={id,zapisnikId:'de-fussball-'+id,url,krog:8,datum:'2026-10-11',ura:'15:00',domaci:report.z.domaci.ime,gostje:report.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 const future={...fixture,id:'031EQBPLIO000000VS5489BTVUS470OH',zapisnikId:'de-fussball-031EQBPLIO000000VS5489BTVUS470OH',url:'https://www.fussball.de/spiel/-/spiel/031EQBPLIO000000VS5489BTVUS470OH',krog:9,datum:'2026-10-28',rezultat:null}
 const bad={...fixture,id:rejectedId,zapisnikId:'de-fussball-'+rejectedId,url:'https://www.fussball.de/spiel/-/spiel/'+rejectedId,krog:7,datum:'2026-10-04',domaci:fixture.gostje,gostje:fixture.domaci,rezultat:{domaci:1,gostje:1}}
 const adminRows=admin.map(clone),fixtures=[...adminRows,...(rejected?[bad]:[]),fixture,future]
 return {version:1,scope:{provider:'fussball',...scope,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+staffel,asOfDate:'2026-10-24'},
  schedule:{...scope,rounds:[1,2,3,4,5,6,7,8,9,10],fixtures,rescheduledIds:[]},
  ...(adminRows.length?{administrativeFixtures:adminRows.map(f=>({fixture:clone(f),code:'FUSSBALL_ADMINISTRATIVE_RESULT_UNSUPPORTED',reason:'Administrative result retained without ordinary played statistics'}))}:{}),
  reports:[{fixture:clone(fixture),result:clone(report)}],rejectedReports:rejected?[{fixture:clone(bad),code:'FUSSBALL_REPORT_INVALID',reason:'anonymous starter'}]:[],
  coverage:{expectedRounds:10,capturedRounds:10,fixtures:fixtures.length,playedFixtures:1+(rejected?1:0),...(adminRows.length?{administrativeFixtures:adminRows.length}:{}),attemptedReports:1+(rejected?1:0),completeReports:1,rejectedReports:rejected?1:0,sampled:false,unscoredFixtures:{total:1,past:0,current:0,future:1,unknownDate:0}},
  activationEligible:false}
}
const rows=batch=>batch.schedule.flatMap(r=>r.tekme)

test('the retained Schleswig-Holstein rows are the parser U and V shapes with no ordinary score',()=>{
 assert.equal(uRow.id,uId);assert.equal(vRow.id,vId)
 assert.deepEqual(uRow.administrativeResult,{schemaVersion:1,kind:'confirmed-sports-court-decision',marker:'U',displayedScores:[{domaci:5,gostje:0},{domaci:0,gostje:5}]})
 assert.deepEqual(vRow.administrativeResult,{schemaVersion:1,kind:'confirmed-administrative-decision',marker:'V',displayedScores:[{domaci:5,gostje:0},{domaci:0,gostje:5}]})
 assert.equal(uRow.rezultat,null);assert.equal(vRow.rezultat,null)
 assert.equal(uRow.gostje,'1.FC Phönix Lübeck II');assert.equal(vRow.gostje,'1.FC Phönix Lübeck II')
})

test('before activation U and V become official decisions without score, lineups, goals or points',()=>{
 const batch=buildFussballCurrentOnlyBatch(season({rejected:true}),{...scope,unknownBefore:CURRENT_ONLY_ANY})
 assert.equal(batch.reports.length,1)
 assert.deepEqual(batch.administrativeReports.map(r=>[r.reportId,r.round,r.date,r.marker,r.kind]),[['de-fussball-'+uId,4,'2026-08-15','U','confirmed-sports-court-decision'],['de-fussball-'+vId,10,'2026-09-26','V','confirmed-administrative-decision']])
 for(const [fid,marker] of [[uId,'U'],[vId,'V']]){
  const t=rows(batch).find(t=>t.id===fid)
  assert.equal(t.izid,null);assert.equal(t.odigrana,false);assert.equal(t.kontumacija,false);assert.equal(t.rezultat,null)
  assert.ok(!batch.reports.some(r=>r.id==='de-fussball-'+fid),'no report, so no appearances or goals')
  assert.ok(!batch.identities.some(i=>i.source_id.includes(fid)))
  const [w]=fussballScheduleWarnings(t)
  assert.ok(w.startsWith(`${FUSSBALL_ADMINISTRATIVE_WARNING} ${marker} `));assert.match(w,/prikazano 5:0 \| 0:5 \(vrstni red vira, uradni par ni določen\)/)
 }
 assert.equal(rows(batch).length,5)
 // Displayed pairs keep source order only; neither becomes a score.
 assert.deepEqual(batch.administrativeReports[0].displayedScores,[{domaci:5,gostje:0},{domaci:0,gostje:5}])
 // Activation: listed like an unpublished result (score null), reason names the marker.
 const m=fussballCurrentOnlyManifest({...batch,provenance:{resultSha256:'d'.repeat(64)}},{currentCode:`${staffel}:2026/27`})
 assert.deepEqual(m.unknownReports.map(r=>[r.reportId,r.score,r.reason]),[['de-fussball-'+rejectedId,{domaci:1,gostje:1},'FUSSBALL_REPORT_INVALID'],['de-fussball-'+uId,null,'FUSSBALL_ADMINISTRATIVE_RESULT_U'],['de-fussball-'+vId,null,'FUSSBALL_ADMINISTRATIVE_RESULT_V']])
 assert.ok(m.unknownReports.every(r=>JSON.stringify(Object.keys(r).sort())==='["away","date","home","reason","reportId","round","score"]'))
})

test('after activation a new administrative row does not stop the league (cutoff does not apply)',()=>{
 const batch=buildFussballCurrentOnlyBatch(season(),{...scope,unknownBefore:'2026-08-01'})
 assert.equal(batch.administrativeReports.length,2);assert.equal(batch.unknownReports.length,0)
 // An ordinary rejection after the cutoff still stops it.
 assert.throws(()=>buildFussballCurrentOnlyBatch(season({rejected:true}),{...scope,unknownBefore:'2026-08-01'}),/cutoff/)
 // A future administrative row is kept (not past yet), and is not in the activation manifest.
 const later=clone(vRow);later.datum='2026-10-31'
 const b=buildFussballCurrentOnlyBatch(season({admin:[uRow,later]}),{...scope,unknownBefore:'2026-08-01'})
 assert.equal(rows(b).find(t=>t.id===vId).odigrana,false)
 assert.deepEqual(fussballCurrentOnlyManifest({...b,provenance:{resultSha256:'d'.repeat(64)}},{currentCode:`${staffel}:2026/27`}).unknownReports.map(r=>r.reason),['FUSSBALL_ADMINISTRATIVE_RESULT_U'])
})

test('native/strict path is unchanged: an administrative row is still refused',()=>{
 assert.throws(()=>buildFussballCurrentOnlyBatch(season(),scope),/administrative result requires explicit native policy/)
 assert.throws(()=>buildFussballImportBatch(season(),scope),/administrative result requires explicit native policy/)
 // Without administrative rows the path-B batch equals the strict batch plus empty lists.
 const strict=buildFussballImportBatch(season({admin:[]}),scope),pathB=buildFussballCurrentOnlyBatch(season({admin:[]}),{...scope,unknownBefore:CURRENT_ONLY_ANY})
 assert.deepEqual(pathB,{...strict,unknownReports:[],administrativeReports:[]})
})

test('W is admitted only in its existing parser shape',()=>{
 const w=clone(uRow);w.administrativeResult={schemaVersion:1,kind:'confirmed-match-authority-decision',marker:'W',rawMarker:'w',displayedScores:[{domaci:2,gostje:0},{domaci:0,gostje:2}]}
 const batch=buildFussballCurrentOnlyBatch(season({admin:[w,vRow]}),{...scope,unknownBefore:CURRENT_ONLY_ANY})
 assert.equal(batch.administrativeReports[0].marker,'W');assert.equal(rows(batch).find(t=>t.id===uId).izid,null)
 const shapes=[
  a=>{delete a.rawMarker},a=>{a.rawMarker='X'},a=>{a.kind='confirmed-administrative-decision'},
 ]
 for(const mutate of shapes){const x=clone(w);mutate(x.administrativeResult);assert.throws(()=>buildFussballCurrentOnlyBatch(season({admin:[x,vRow]}),{...scope,unknownBefore:CURRENT_ONLY_ANY}),/administrative/,mutate.toString())}
})

test('refusals: report statistics, inventory drift and non-parser shapes never import',()=>{
 const run=s=>buildFussballCurrentOnlyBatch(s,{...scope,unknownBefore:CURRENT_ONLY_ANY})
 // A report (with full lineups) attached to an administrative fixture is refused,
 // so it cannot produce appearances, goals or cards.
 const withReport=season();withReport.reports.push({fixture:clone(withReport.schedule.fixtures[0]),result:clone(report)});withReport.coverage.completeReports=2
 assert.throws(()=>run(withReport),/administrative fixture cannot carry report statistics/)
 const withPending=season();withPending.pendingReports=[{fixture:clone(withPending.schedule.fixtures[1]),result:{statisticsPending:true}}]
 assert.throws(()=>run(withPending),/administrative fixture cannot carry report statistics/)
 const withRejected=season();withRejected.rejectedReports.push({fixture:clone(withRejected.schedule.fixtures[0]),code:'FUSSBALL_REPORT_INVALID'})
 assert.throws(()=>run(withRejected),/rejected report outside/)
 const mutations=[
  s=>{delete s.administrativeFixtures},
  s=>{s.administrativeFixtures.pop()},
  s=>{s.administrativeFixtures[0].code='OTHER'},
  s=>{s.administrativeFixtures[0].fixture.administrativeResult.displayedScores[0].domaci=3},
  s=>{s.administrativeFixtures.reverse()},
  s=>{delete s.coverage.administrativeFixtures},
  s=>{s.coverage.administrativeFixtures=3},
  s=>{s.coverage.fixtures--},
  s=>{s.schedule.fixtures[0].rezultat={domaci:5,gostje:0};s.administrativeFixtures[0].fixture.rezultat={domaci:5,gostje:0}},
  s=>{s.schedule.fixtures[0].administrativeResult.rawMarker='U';s.administrativeFixtures[0].fixture.administrativeResult.rawMarker='U'},
  s=>{s.schedule.fixtures[0].administrativeResult.kind='confirmed-administrative-decision';s.administrativeFixtures[0].fixture.administrativeResult.kind='confirmed-administrative-decision'},
  s=>{s.schedule.fixtures[0].administrativeResult.marker='X';s.administrativeFixtures[0].fixture.administrativeResult.marker='X'},
  s=>{s.schedule.fixtures[0].administrativeResult.schemaVersion=2;s.administrativeFixtures[0].fixture.administrativeResult.schemaVersion=2},
  s=>{for(const f of [s.schedule.fixtures[0],s.administrativeFixtures[0].fixture])f.administrativeResult.displayedScores.push({domaci:1,gostje:1})},
  s=>{for(const f of [s.schedule.fixtures[0],s.administrativeFixtures[0].fixture])f.administrativeResult.displayedScores[1].gostje=-1},
  s=>{for(const f of [s.schedule.fixtures[0],s.administrativeFixtures[0].fixture])f.administrativeResult.official={domaci:5,gostje:0}},
  s=>{for(const f of [s.schedule.fixtures[0],s.administrativeFixtures[0].fixture])f.administrativeResult=null},
  s=>{for(const f of [s.schedule.fixtures[0],s.administrativeFixtures[0].fixture])f.krog=11},
  s=>{for(const f of [s.schedule.fixtures[0],s.administrativeFixtures[0].fixture])f.datum='2026-02-30'},
 ]
 for(const mutate of mutations){const s=season();mutate(s);assert.throws(()=>run(s),/fussball (pot B|import): /,mutate.toString())}
 // No administrative rows, but a stray inventory entry.
 const stray=season({admin:[]});stray.administrativeFixtures=[];assert.throws(()=>run(stray),/administrative inventory/)
 assert.throws(()=>fussballAdministrativeWarning({...uRow.administrativeResult,marker:'V'}),/administrative/)
})

test('schedule warnings: only the source prefix is replaced, unchanged rows are not rewritten',()=>{
 const [w]=fussballScheduleWarnings(uRow),other='zapisnik nepopoln: FUSSBALL card recipients pending'
 assert.throws(()=>fussballScheduleWarnings({...uRow,administrativeResult:undefined}),/administrative/)
 assert.deepEqual(fussballScheduleWarnings({id:1}),[])
 assert.deepEqual(uskladiOpozorilaRazporeda([],[w],FUSSBALL_ADMINISTRATIVE_WARNING),[w])
 assert.equal(uskladiOpozorilaRazporeda([w],[w],FUSSBALL_ADMINISTRATIVE_WARNING),null)
 assert.equal(uskladiOpozorilaRazporeda([],[],FUSSBALL_ADMINISTRATIVE_WARNING),null)
 assert.equal(uskladiOpozorilaRazporeda([other],[],FUSSBALL_ADMINISTRATIVE_WARNING),null)
 assert.deepEqual(uskladiOpozorilaRazporeda([other,w],[],FUSSBALL_ADMINISTRATIVE_WARNING),[other])
 const [v]=fussballScheduleWarnings(vRow)
 assert.deepEqual(uskladiOpozorilaRazporeda([w],[v],FUSSBALL_ADMINISTRATIVE_WARNING),[v])
 assert.throws(()=>uskladiOpozorilaRazporeda([],['foreign'],FUSSBALL_ADMINISTRATIVE_WARNING))
})

test('public source: schedule keeps the administrative rows, reports and appearances never include them',async()=>{
 const badenStaffel='03188V27L800000JVS5489BTVU7GTVLE-G',code=`${badenStaffel}:2026/27`
 const competition={id:1132,slug:'de-verbandsliga-baden',country_id:44,country_code:'DE',source:'fussball-public',source_league_code:code,source_policy:'fussball-community-cards-v1',active:true,fussball_current_only:true,fussball_unknown_before:'2026-11-14'}
 const built=buildFussballCurrentOnlyBatch(season(),{...scope,unknownBefore:'2026-08-01'})
 const batch={...built,staffel:badenStaffel,cardPolicy:'community-v1',pendingReports:[],cardEnvelopes:[]}
 const policy={installed:true,enabled:true,source_policy:'fussball-community-cards-v1',current_code:code,archive_codes:[]}
 const db={rpc:async(name,args)=>name==='get_fussball_card_policy'?{data:policy,error:null}:name==='fussball_reserve_player_ids'?{data:batch.identities.filter(i=>args.p_source_ids.includes(i.source_id)),error:null}:{data:null,error:{message:name}}}
 const loads=[]
 const source=createFussballPublicSource({competition,db,directory:'/capture',loadCapture:async(dir,o)=>{loads.push(o);return batch}})
 const schedule=await source.razporedVseStrani(code)
 const admin=schedule.flatMap(r=>r.tekme).filter(t=>source.scheduleImportWarnings(t).length)
 assert.deepEqual(admin.map(t=>[t.id,t.izid,t.odigrana,t.kontumacija]),[[uId,null,false,false],[vId,null,false,false]])
 assert.equal(source.scheduleWarningPrefix,FUSSBALL_ADMINISTRATIVE_WARNING)
 const reports=await source.zapisniki(code)
 assert.deepEqual(reports.map(r=>r.id),['de-fussball-'+id])
 assert.ok(reports.every(r=>source.nastopi(r.z).every(a=>![uId,vId].some(x=>a.virId?.includes(x)))))
})

test('real capture code: a nightly capture with U and V rows verifies, loads and re-seeds the cache',async()=>{
 const {captureFussballDirectory,verifyFussballDirectory}=await import('./fussball-capture-evidence.mjs')
 const root=mkdtempSync(join(tmpdir(),'slff-pot-b-admin-')),seedUrl='https://www.fussball.de/spieltag/-/staffel/'+staffel
 const collector=async({client,seedUrl:seed})=>{await client.read(seed,'round');await client.read(url,'report');return season()}
 const verifyDirectory=(dir,o)=>verifyFussballDirectory(dir,{...o,collectFn:collector})
 const candidate={slug:'de-test',source_league_code:`${staffel}:2026/27`,seedUrl,communityCards:false}
 const fetchFn=async u=>new Response('<html>TEST ONLY '+u+'</html>',{headers:{'content-type':'text/html'}})
 try{
  await captureFussballDirectory({directory:join(root,'night'),options:{seedUrl,staffel,season:'2026/27',maxRequests:10,reportLimit:null,asOfDate:'2026-10-24'},fetchFn,collectFn:collector})
  const batch=await loadFussballCurrentOnlyCapture(join(root,'night'),{...scope,current:false,unknownBefore:'2026-08-01'},{verifyDirectory})
  assert.deepEqual(batch.administrativeReports.map(r=>r.marker),['U','V']);assert.equal(batch.reports.length,1)
  writeFussballCurrentOnlyCache(join(root,'night'),join(root,'latest'),candidate)
  assert.deepEqual(await loadFussballCurrentOnlyCache(join(root,'latest'),{candidate},{verifyDirectory}),{candidate,seasons:[{code:candidate.source_league_code}]})
 }finally{rmSync(root,{recursive:true,force:true})}
})
