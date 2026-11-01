// FUSSBALL pot B (samo tekoča sezona): brez omrežja in baze.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {buildFussballCurrentOnlyBatch,loadFussballCurrentOnlyCapture,fussballCurrentOnlyManifest,writeFussballCurrentOnlyCache,loadFussballCurrentOnlyCache,CURRENT_ONLY_ANY} from './fussball-tekoca-pot.mjs'
import {validateFussballSeasonPilot} from './fussball-season-pilot.mjs'
import {admitFussballAudit,admitFussballPairedAudit,assertFussballImportCompetition,admitFussballImportRun} from './fussball-import-actions.mjs'
import {checkFussballCompetition,activateFussballCurrentOnly,previewFussballImport,gitMainDrift} from './preveri-fussball-uvoz.mjs'
import {fussballTekocaPot} from './tekmovanje.mjs'
import {isBadenNativeCompetition} from './fussball-native-runtime.mjs'
import {prepareFussballNightly,seedFussballNightly} from './prepare-fussball-nightly.mjs'
import {createFussballPublicSource} from './viri/fussball-public.mjs'

const read=name=>readFileSync(new URL(`./vzorci/${name}`,import.meta.url))
const manifest=JSON.parse(read('de-fussball-zapisnik.json'))
const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',scope={staffel,season:'2026/27'}
const url='https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/'+id
const clone=x=>structuredClone(x)
const rejectedId='031EQBPLA0000000VS5489BTVUS470OH',unscoredId='031EQBPLB0000000VS5489BTVUS470OH'
function season(){
 const result=razberiFantasyZapisnik(read('de-fussball-ilvesheim-main.html').toString(),read('de-fussball-ilvesheim-lineup.html').toString(),{fonts,id,lineupId:id})
 const fixture={id,zapisnikId:'de-fussball-'+id,url,krog:8,datum:'2026-10-11',ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 const future={...fixture,id:'031EQBPLIO000000VS5489BTVUS470OH',zapisnikId:'de-fussball-031EQBPLIO000000VS5489BTVUS470OH',url:'https://www.fussball.de/spiel/-/spiel/031EQBPLIO000000VS5489BTVUS470OH',krog:9,datum:'2026-10-28',rezultat:null}
 const rejected={...fixture,id:rejectedId,zapisnikId:'de-fussball-'+rejectedId,url:'https://www.fussball.de/spiel/-/spiel/'+rejectedId,krog:7,datum:'2026-10-04',domaci:fixture.gostje,gostje:fixture.domaci,rezultat:{domaci:1,gostje:1}}
 const unscored={...rejected,id:unscoredId,zapisnikId:'de-fussball-'+unscoredId,url:'https://www.fussball.de/spiel/-/spiel/'+unscoredId,krog:6,datum:'2026-09-27',rezultat:null}
 return {version:1,scope:{provider:'fussball',...scope,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+staffel,asOfDate:'2026-10-24'},schedule:{...scope,rounds:[1,2,3,4,5,6,7,8,9],fixtures:[unscored,rejected,fixture,future],rescheduledIds:[]},reports:[{fixture:clone(fixture),result}],rejectedReports:[{fixture:clone(rejected),code:'FUSSBALL_REPORT_INVALID',reason:'anonymous starter'}],coverage:{expectedRounds:9,capturedRounds:9,fixtures:4,playedFixtures:2,attemptedReports:2,completeReports:1,rejectedReports:1,sampled:false,unscoredFixtures:{total:2,past:1,current:0,future:1,unknownDate:0}},activationEligible:false}
}

test('rejected and unpublished pre-opening fixtures stay unknown, headers stay, no statistics are derived',()=>{
 const batch=buildFussballCurrentOnlyBatch(season(),{...scope,unknownBefore:CURRENT_ONLY_ANY})
 assert.equal(batch.reports.length,1)
 assert.deepEqual(batch.unknownReports.map(r=>[r.reportId,r.round,r.score,r.reason]),[['de-fussball-'+rejectedId,7,{domaci:1,gostje:1},'FUSSBALL_REPORT_INVALID'],['de-fussball-'+unscoredId,6,null,'FUSSBALL_RESULT_UNPUBLISHED']])
 const rows=batch.schedule.flatMap(r=>r.tekme)
 assert.equal(rows.length,4)
 assert.deepEqual(rows.find(t=>t.id===rejectedId).izid,[1,1]);assert.equal(rows.find(t=>t.id===unscoredId).odigrana,false)
 assert.ok(!batch.identities.some(i=>i.source_id.includes(rejectedId)))
})
test('strict mode and post-opening rejections still stop the import',()=>{
 assert.throws(()=>buildFussballCurrentOnlyBatch(season(),scope),/rejected reports/)
 assert.throws(()=>buildFussballCurrentOnlyBatch(season(),{...scope,unknownBefore:'2026-10-04'}),/cutoff/)
 assert.throws(()=>buildFussballCurrentOnlyBatch(season(),{...scope,unknownBefore:'2026-09-01'}),/cutoff/)
 for(const mutate of [s=>{s.coverage.rejectedReports=0},s=>{s.rejectedReports[0].fixture.krog=5},s=>{s.rejectedReports.push(clone(s.rejectedReports[0]))},s=>{s.coverage.unscoredFixtures.past=0},s=>{s.reports=[]},s=>{s.rejectedReports[0].code=null}]){
  const s=season();mutate(s);assert.throws(()=>buildFussballCurrentOnlyBatch(s,{...scope,unknownBefore:CURRENT_ONLY_ANY}),undefined,mutate.toString())
 }
 assert.throws(()=>buildFussballCurrentOnlyBatch(season(),{...scope,unknownBefore:'tomorrow'}),/cutoff/)
})
test('path-B loader keeps replay, digest, full intent and 24h freshness; activation manifest binds the result',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'slff-pot-b-'))
 const now=Date.parse('2026-10-24T12:00:00Z'),raw=JSON.stringify(season())+'\n',digest=createHash('sha256').update(raw).digest('hex')
 const m={options:{reportLimit:null},createdAt:'2026-10-24T10:00:00Z',completedAt:'2026-10-24T11:00:00Z',resultSha256:digest}
 const verifyDirectory=async()=>({scope,resultSha256:digest,codeSha256:'b'.repeat(64),requests:640})
 const save=x=>{writeFileSync(join(directory,'result.json'),raw);writeFileSync(join(directory,'manifest.json'),JSON.stringify(x))}
 try{
  save(m)
  const batch=await loadFussballCurrentOnlyCapture(directory,{...scope,now,unknownBefore:CURRENT_ONLY_ANY},{verifyDirectory})
  assert.equal(batch.provenance.requests,640)
  const activation=fussballCurrentOnlyManifest(batch,{currentCode:`${staffel}:2026/27`})
  assert.equal(activation.kind,'fussball-current-only');assert.equal(activation.sourceResultSha256,digest);assert.equal(activation.unknownReports.length,2)
  assert.throws(()=>fussballCurrentOnlyManifest(batch,{currentCode:'X'}))
  await assert.rejects(loadFussballCurrentOnlyCapture(directory,{...scope,now},{verifyDirectory}),/rejected/)
  for(const patch of [{createdAt:'2026-10-22T10:00:00Z'},{options:{reportLimit:3}},{resultSha256:'c'.repeat(64)}]){save({...m,...patch});await assert.rejects(loadFussballCurrentOnlyCapture(directory,{...scope,now,unknownBefore:CURRENT_ONLY_ANY},{verifyDirectory}))}
  save(m);await assert.rejects(loadFussballCurrentOnlyCapture(directory,{...scope,now,unknownBefore:CURRENT_ONLY_ANY},{verifyDirectory:async()=>({scope:{...scope,season:'2025/26'},resultSha256:digest})}),/another league/)
  // Nightly cache wrapper: verification is delegated to the path-B loader.
  const cache=directory+'-cache',candidate={slug:'de-test',source_league_code:`${staffel}:2026/27`,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+staffel,communityCards:false}
  save(m);writeFussballCurrentOnlyCache(directory,cache,candidate)
  assert.deepEqual(await loadFussballCurrentOnlyCache(cache,{candidate},{verifyDirectory}),{candidate,seasons:[{code:candidate.source_league_code}]})
  await assert.rejects(loadFussballCurrentOnlyCache(cache,{candidate:{...candidate,slug:'de-other'}},{verifyDirectory}),/scope/)
 }finally{rmSync(directory,{recursive:true,force:true});rmSync(directory+'-cache',{recursive:true,force:true})}
})

const sha='a'.repeat(40),repository='Lovro-splichal-orhanizagi/mnzgorenjska',badenStaffel='03188V27L800000JVS5489BTVU7GTVLE-G'
const badenSeed='https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/'+badenStaffel
const env=()=>({ROLLOUT_CANDIDATE:'de-verbandsliga-baden',ARCHIVE_JSON:'',SEED_URL:badenSeed,STAFFEL:badenStaffel,SEASON:'2026/27',MAX_REQUESTS:'700',REPORTS:'all',PRIOR_REQUESTS:'3607',TOTAL_REQUEST_CAP:'5000',EXPECTED_SHA:sha,GITHUB_SHA:sha,GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repository,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'41000000000',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:repository+'/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main'})
test('current-only capture reserves prior + run against the cumulative cap and takes the catalog card policy',()=>{
 const plan=validateFussballSeasonPilot(env(),{headSha:sha})
 assert.equal(plan.archive,null);assert.equal(plan.currentOnlyCandidate,'de-verbandsliga-baden');assert.equal(plan.current.cardPolicy,'community-v1');assert.equal(plan.priorRequests+plan.current.maxRequests,4307)
 assert.equal(validateFussballSeasonPilot({...env(),MAX_REQUESTS:'1393'},{headSha:sha}).current.maxRequests,1393)
 for(const patch of [{MAX_REQUESTS:'1394'},{PRIOR_REQUESTS:'4301'},{TOTAL_REQUEST_CAP:'5001'},{PRIOR_REQUESTS:'x'},{REPORTS:'3'},{EXPECTED_SHA:''},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_REF:'refs/heads/x'},{ROLLOUT_CANDIDATE:'de-unknown'},{SEED_URL:badenSeed.replace('bfv-verbandsliga','x')},{STAFFEL:staffel,SEED_URL:'https://www.fussball.de/spieltag/-/staffel/'+staffel},{SEASON:'2025/26'},{FUSSBALL_COMPLETION_PRESET:'baden-reviewed-transports-v5'}])assert.throws(()=>validateFussballSeasonPilot({...env(),...patch},{headSha:sha}),undefined,JSON.stringify(patch))
 assert.equal(validateFussballSeasonPilot({...env(),ROLLOUT_CANDIDATE:''},{headSha:sha}),null)
})

const runId='41000000001',newer='c'.repeat(40)
const auditRun=()=>({id:Number(runId),status:'completed',conclusion:'success',event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:'.github/workflows/preveri-fussball-sezono.yml',head_repository:{full_name:repository},run_attempt:1})
const auditArtifacts=()=>({artifacts:[{id:7,name:'fussball-season-'+runId,expired:false,size_in_bytes:2048,workflow_run:{id:Number(runId),head_sha:sha}}]})
test('import admits an audit on an older main only as a descendant without migrations (PR #644 rule)',()=>{
 assert.equal(admitFussballAudit(auditRun(),auditArtifacts(),{repository,headSha:sha,runId}).headSha,sha)
 assert.equal(admitFussballAudit(auditRun(),auditArtifacts(),{repository,headSha:newer,runId,mainDrift:{ancestor:true,changed:['src/a.ts']}}).headSha,newer)
 for(const mainDrift of [undefined,{ancestor:true,changed:['src/a.ts','supabase/migrations/20261102000100_x.sql']},{ancestor:false,changed:['src/a.ts']},{ancestor:true,changed:[]}])assert.throws(()=>admitFussballAudit(auditRun(),auditArtifacts(),{repository,headSha:newer,runId,mainDrift}),undefined,JSON.stringify(mainDrift))
 const paired={artifacts:[...auditArtifacts().artifacts,{id:8,name:'fussball-season-archive-'+runId,expired:false,size_in_bytes:2048,workflow_run:{id:Number(runId),head_sha:sha}}]}
 assert.throws(()=>admitFussballPairedAudit({...auditRun(),path:'.github/workflows/preveri-fussball-dopolni.yml'},paired,{repository,headSha:newer,runId,mainDrift:{ancestor:true,changed:['src/a.ts']}}))
 const git=args=>{if(args[0]==='merge-base')return '';if(args[0]==='diff')return 'src/a.ts\nscripts/b.mjs\n';throw Error('unexpected')}
 assert.deepEqual(gitMainDrift(sha,newer,git),{ancestor:true,changed:['src/a.ts','scripts/b.mjs']})
 assert.deepEqual(gitMainDrift(sha,newer,args=>{if(args[0]==='merge-base')throw Error('no');return ''}),{ancestor:false,changed:[]})
 assert.equal(gitMainDrift(sha,sha,git),undefined)
})

const row=(patch={})=>({id:1132,slug:'de-verbandsliga-baden',country_id:44,country_code:'DE',source:'fussball-public',source_league_code:`${badenStaffel}:2026/27`,source_policy:'fussball-community-cards-v1',active:false,fussball_current_only:true,...patch})
test('competition gate accepts no policy or a current-only card policy, never a native/archive policy',()=>{
 const code=`${badenStaffel}:2026/27`
 assert.equal(assertFussballImportCompetition(row(),{slug:'de-verbandsliga-baden',code}).id,1132)
 assert.equal(assertFussballImportCompetition(row({source_policy:null,fussball_current_only:undefined}),{slug:'de-verbandsliga-baden',code}).id,1132)
 for(const patch of [{fussball_current_only:undefined},{source_policy:'other'},{active:true},{country_code:'AT'}])assert.throws(()=>assertFussballImportCompetition(row(patch),{slug:'de-verbandsliga-baden',code}),undefined,JSON.stringify(patch))
 assert.equal(isBadenNativeCompetition(row({fussball_current_only:undefined})),true)
 assert.equal(isBadenNativeCompetition(row()),false)
})
function fakeDb({policy,teams=0,rpc={}}={}){
 const calls=[]
 return {calls,
  rpc:async(name,args)=>{calls.push([name,args]);if(name==='get_fussball_card_policy')return {data:policy,error:null};return rpc[name]?rpc[name](args):{data:null,error:{message:'unexpected '+name}}},
  from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{played_on:'2026-11-14'},error:null}),then:r=>r({count:teams,error:null})};return q}}
}
test('tekmovanje marks a league current-only only from its installed empty-archive card policy',async()=>{
 const code=`${badenStaffel}:2026/27`,policy={installed:true,enabled:true,current_code:code,archive_codes:[]}
 assert.deepEqual(await fussballTekocaPot(fakeDb({policy}),row()),{fussball_current_only:true,fussball_unknown_before:'9999-12-31'})
 assert.deepEqual(await fussballTekocaPot(fakeDb({policy}),row({active:true,prvi_fantasy_krog:14})),{fussball_current_only:true,fussball_unknown_before:'2026-11-14'})
 for(const p of [{...policy,archive_codes:['X']},{...policy,enabled:false},{...policy,current_code:'other'},null])assert.deepEqual(await fussballTekocaPot(fakeDb({policy:p}),row()),{})
 assert.deepEqual(await fussballTekocaPot(fakeDb({policy}),row({source_policy:null})),{})
})
test('check-competition installs a current-only policy for a new catalog community league, once',async()=>{
 const code=`${badenStaffel}:2026/27`,reads=[row({source_policy:null,fussball_current_only:undefined}),row()]
 const db=fakeDb({rpc:{install_fussball_card_policy:async()=>({data:{installed:true},error:null})}})
 const result=await checkFussballCompetition(db,{slug:'de-verbandsliga-baden',code},{read:async()=>reads.shift()})
 assert.equal(result.currentOnly,true)
 assert.deepEqual(db.calls,[['install_fussball_card_policy',{p_competition_id:1132,p_current_code:code,p_archive_codes:[]}]])
 const again=fakeDb();await checkFussballCompetition(again,{slug:'de-verbandsliga-baden',code},{read:async()=>row()});assert.deepEqual(again.calls,[])
 await assert.rejects(checkFussballCompetition(fakeDb({teams:1}),{slug:'de-verbandsliga-baden',code},{read:async()=>row()}),/fantasy/)
})
test('activation sends the bound manifest once and requires matching public readback',async()=>{
 const code=`${badenStaffel}:2026/27`,batch={provider:'fussball-public',staffel:badenStaffel,season:'2026/27',unknownReports:[{reportId:'de-fussball-'+rejectedId,round:7,date:'2026-10-04',home:'A',away:'B',score:{domaci:1,gostje:1},reason:'FUSSBALL_REPORT_INVALID',url:'x'}],provenance:{resultSha256:'d'.repeat(64)}}
 const db=fakeDb({rpc:{vklopi_fussball_tekoco:async()=>({data:{vklopljena:true,prvi_krog:14,prvi_krog_datum:'2026-11-14',admission_sha256:'e'.repeat(64)},error:null})}})
 const fetchFn=async u=>{assert.match(u,/competitions_view\?slug=eq\.de-verbandsliga-baden/);return new Response(JSON.stringify([{slug:'de-verbandsliga-baden',active:true,prvi_fantasy_krog:14}]))}
 const result=await activateFussballCurrentOnly(db,{slug:'de-verbandsliga-baden',batch},{read:async()=>row(),fetchFn,publicUrl:'https://api.example',publicKey:'anon'})
 assert.equal(result.openingRound,14);assert.equal(db.calls.length,1)
 assert.equal(db.calls[0][1].p_manifest.currentCode,code);assert.deepEqual(Object.keys(db.calls[0][1].p_manifest.unknownReports[0]).sort(),['away','date','home','reason','reportId','round','score'])
 await assert.rejects(activateFussballCurrentOnly(db,{slug:'de-verbandsliga-baden',batch},{read:async()=>row(),fetchFn:async()=>new Response('[{"active":false,"prvi_fantasy_krog":14}]'),publicUrl:'https://api.example',publicKey:'anon'}),/readback/)
 await assert.rejects(activateFussballCurrentOnly(db,{slug:'de-verbandsliga-baden',batch},{read:async()=>row({active:true}),fetchFn,publicUrl:'u',publicKey:'k'}),/inactive/)
 const refused=fakeDb({rpc:{vklopi_fussball_tekoco:async()=>({data:null,error:{message:'untouched future opening round required'}})}})
 await assert.rejects(activateFussballCurrentOnly(refused,{slug:'de-verbandsliga-baden',batch},{read:async()=>row(),fetchFn,publicUrl:'u',publicKey:'k'}),/opening/)
})
test('activation admits only a successful owner import of the same league with its artifact',()=>{
 const run={id:Number(runId),status:'completed',conclusion:'success',event:'workflow_dispatch',head_branch:'main',head_sha:sha,head_repository:{full_name:repository},path:'.github/workflows/uvoz-fussball-public.yml',display_title:'Uvoz lige de-verbandsliga-baden FUSSBALL public',actor:{login:'nejcar20'},triggering_actor:{login:'nejcar20'}}
 const inv={artifacts:[{id:9,name:'fussball-import-'+runId,expired:false,workflow_run:{id:Number(runId)}}]}
 assert.equal(admitFussballImportRun(run,inv,{repository,runId,slug:'de-verbandsliga-baden'}).artifactId,9)
 for(const patch of [{conclusion:'failure'},{display_title:'Uvoz lige de-other FUSSBALL public'},{path:'.github/workflows/uvoz-lige.yml'},{head_branch:'x'},{triggering_actor:{login:'someone'}}])assert.throws(()=>admitFussballImportRun({...run,...patch},inv,{repository,runId,slug:'de-verbandsliga-baden'}),undefined,JSON.stringify(patch))
 assert.throws(()=>admitFussballImportRun(run,{artifacts:[]},{repository,runId,slug:'de-verbandsliga-baden'}))
})
test('nightly: current-only seed and capture reuse the wrapper cache with the path-B verifier',async()=>{
 const root=mkdtempSync(join(tmpdir(),'slff-pot-b-nightly-')),cache=join(root,'cache'),capture=join(root,'capture')
 const candidate=row({fussball_unknown_before:'9999-12-31'})
 try{
  mkdirSync(capture);writeFileSync(join(capture,'manifest.json'),'{}');writeFileSync(join(capture,'result.json'),'{}')
  const loaded=[]
  const seeded=await seedFussballNightly({candidate,bulkDirectory:capture,cacheDirectory:cache,loadCurrentOnlyCache:async(dir,o)=>{loaded.push([dir,o.candidate.slug]);return {}}})
  assert.equal(seeded.currentOnly,true);assert.ok(existsSync(join(cache,'bulk-seed','current','result.json')))
  assert.equal(JSON.parse(readFileSync(join(cache,'bulk-seed','manifest.json'))).kind,'fussball-current-only-cache')
  const calls=[]
  const out=join(root,'out')
  const result=await prepareFussballNightly({candidate:{...candidate,active:true,fussball_unknown_before:'2026-11-14'},directory:out,cacheDirectory:cache,maxRequests:700,now:()=>Date.parse('2026-11-20T03:00:00Z'),
   captureDirectory:async o=>{calls.push(o);mkdirSync(o.directory);writeFileSync(join(o.directory,'manifest.json'),'{}');await o.loadBulkPack(o.reuseBulkDirectory,{})},
   loadCurrentOnly:async(dir,o)=>{calls.push(o);return {provider:'fussball-public',staffel:badenStaffel,season:'2026/27',cardPolicy:'community-v1',reports:[{}],pendingReports:[],unknownReports:[{}],schedule:[{}],provenance:{}}},
   loadCurrentOnlyPack:async(dir,o)=>{loaded.push([dir,o.candidate.slug]);return {}}})
  assert.equal(calls[0].reuseBulkDirectory,join(cache,'bulk-seed'));assert.equal(calls[0].options.cardPolicy,'community-v1');assert.equal(calls[0].options.maxRequests,700)
  assert.equal(calls[1].unknownBefore,'2026-11-14');assert.equal(result.unknownReports,1)
  assert.ok(existsSync(join(cache,'latest','current','manifest.json')));assert.ok(!existsSync(join(cache,'bulk-seed')))
  assert.equal(loaded.length,2)
 }finally{rmSync(root,{recursive:true,force:true})}
})
test('import source uses the path-B loader only for a current-only league, with its cutoff and no archive',async()=>{
 const code=`${badenStaffel}:2026/27`,policy={installed:true,enabled:true,source_policy:'fussball-community-cards-v1',current_code:code,archive_codes:[]}
 const db={rpc:async name=>name==='get_fussball_card_policy'?{data:policy,error:null}:{data:[],error:null}}
 assert.throws(()=>createFussballPublicSource({competition:row({fussball_unknown_before:'9999-12-31'}),db,directory:'x',archiveCode:'02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'}),/archive/)
 const source=createFussballPublicSource({competition:row({fussball_unknown_before:'9999-12-31'}),db,directory:'/nonexistent-capture'})
 await assert.rejects(source.razporedVseStrani(code))
 assert.equal(typeof previewFussballImport,'function')
})
test('real capture code: a path-B capture seeds, and a mixed nightly capture re-seeds, without rereading reports',async()=>{
 const {captureFussballDirectory,verifyFussballDirectory}=await import('./fussball-capture-evidence.mjs')
 const root=mkdtempSync(join(tmpdir(),'slff-pot-b-real-')),seedUrl='https://www.fussball.de/spieltag/-/staffel/'+staffel
 const collector=async({client,seedUrl:seed})=>{await client.read(seed,'round');await client.read(url,'report');return season()}
 const verifyDirectory=(dir,o)=>verifyFussballDirectory(dir,{...o,collectFn:collector})
 const candidate={slug:'de-test',source_league_code:`${staffel}:2026/27`,seedUrl,communityCards:false}
 const fetched=[],fetchFn=async u=>{fetched.push(u);return new Response('<html>TEST ONLY '+u+'</html>',{headers:{'content-type':'text/html'}})}
 const options={seedUrl,staffel,season:'2026/27',maxRequests:10,reportLimit:null,asOfDate:'2026-10-24'}
 try{
  await captureFussballDirectory({directory:join(root,'audit'),options,fetchFn,collectFn:collector})
  writeFussballCurrentOnlyCache(join(root,'audit'),join(root,'seed'),candidate)
  const loadBulkPack=dir=>loadFussballCurrentOnlyCache(dir,{candidate},{verifyDirectory})
  fetched.length=0
  await captureFussballDirectory({directory:join(root,'night1'),options,fetchFn,collectFn:collector,reuseBulkDirectory:join(root,'seed'),loadBulkPack})
  assert.deepEqual(fetched,[seedUrl],'report served from the path-B seed')
  assert.equal(JSON.parse(readFileSync(join(root,'night1','manifest.json'))).version,2)
  const batch=await loadFussballCurrentOnlyCapture(join(root,'night1'),{...scope,current:false,unknownBefore:CURRENT_ONLY_ANY},{verifyDirectory})
  assert.equal(batch.unknownReports.length,2)
  writeFussballCurrentOnlyCache(join(root,'night1'),join(root,'latest'),candidate)
  fetched.length=0
  await captureFussballDirectory({directory:join(root,'night2'),options,fetchFn,collectFn:collector,reuseBulkDirectory:join(root,'latest'),loadBulkPack})
  assert.deepEqual(fetched,[seedUrl],'report served from the re-seeded mixed capture')
  writeFileSync(join(root,'latest','current',JSON.parse(readFileSync(join(root,'latest','current','manifest.json'))).documents.find(d=>d.kind==='report').file),'tampered')
  await assert.rejects(loadBulkPack(join(root,'latest')),/differs/)
 }finally{rmSync(root,{recursive:true,force:true})}
})
