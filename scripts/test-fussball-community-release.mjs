import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {runBulkRollout} from './bulk-league-rollout.mjs'
import {createBulkTransport} from './bulk-native-transport.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
import {FUSSBALL_COMMUNITY_SOURCE_POLICY as policy} from './fussball-community-policy.mjs'
const api=await import('./fussball-community-release.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),candidate={...GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden'),id:99},sha='a'.repeat(40),runId='40000000000',now=new Date('2026-10-27T12:00:00Z')
function fixture(){
 const snapshot={competition:{...candidate,country_id:4,source_policy:policy,active:false,date_only_deadline_policy:null,prvi_fantasy_krog:1},season:candidate.season,players:[],teams:[],rounds:[{id:1,season:candidate.season,number:1,deadline_at:'2026-10-27T10:00:00Z',played_on:'2026-10-27'},{id:2,season:candidate.archives[0].season,number:1,deadline_at:'2025-10-27T10:00:00Z',played_on:'2025-10-27'},{id:3,season:candidate.season,number:2,deadline_at:'2026-11-01T10:00:00Z',played_on:'2026-11-01',lineups_locked_at:null}],matches:[{id:1,round_id:1,zapisnik_id:'current',imported_at:now.toISOString(),statistics_status:'available',home_goals:0,away_goals:0,appearance_rows:[],goal_rows:[]},{id:2,round_id:2,zapisnik_id:'archive',imported_at:null,statistics_status:'pending_cards',home_goals:0,away_goals:1,appearance_rows:[],goal_rows:[]},{id:3,round_id:3,zapisnik_id:null,imported_at:null,statistics_status:'available',played_on:'2026-11-01',home_goals:0,away_goals:0,appearance_rows:[],goal_rows:[]}],fantasy:{teams:[],lineups:[]},fussball_cards:{installed:true,enabled:true,source_policy:policy,current_code:candidate.source_league_code,archive_codes:candidate.archives.map(a=>a.code),pending_inventory_sha256:'b'.repeat(64),pending_reports:[{match_id:2,report_id:'archive',revision_sha256:'c'.repeat(64),season:candidate.archives[0].season,round_id:2}],registered_reports:[{match_id:1,report_id:'current',revision_sha256:'d'.repeat(64),source_code:candidate.source_league_code},{match_id:2,report_id:'archive',revision_sha256:'c'.repeat(64),source_code:candidate.archives[0].code}]}}
 const pack={candidate,seasons:[{code:candidate.source_league_code,season:candidate.season,reports:[{id:'current',cardEnvelope:{revisionSha256:'d'.repeat(64)}}],pendingReports:[]},{code:candidate.archives[0].code,season:candidate.archives[0].season,reports:[],pendingReports:[{id:'archive',cardEnvelope:{revisionSha256:'c'.repeat(64)}}]}]}
 const proof={version:1,contract_id:'bulk-native-community-cards-v1',candidate,expected_sha:sha,snapshot_sha256:hash(snapshot),pack_sha256:hash(pack),pending_inventory_sha256:snapshot.fussball_cards.pending_inventory_sha256,schedule_complete:true,reports:2,activationEligible:false}
 const seedCacheReceipt={version:1,expected_sha:sha,run_id:runId,persisted:true,cache:{id:44,key:'zapisniki-DE-bulk-'+runId+'-1',ref:'refs/heads/main',version:'cache-v1',size_in_bytes:400}}
 const igralci=Array.from({length:30},(_,i)=>({id:i+1,team_id:Math.floor(i/3)+1,position:['GK','DEF','DEF','MID','MID','FWD'][i%6],value:i?4:10}))
 const state={aktivnih:30,privzetih:0,klubov:10,najvisja_cena:10,po_pozicijah:{GK:5,DEF:10,MID:10,FWD:5},nastopov_s_klopi:3,golov_brez_nastopa:0,krogov_tekoce:2,igralci}
 return {candidate:structuredClone(candidate),snapshot,pack,proof,seedCacheReceipt,state,expectedSha:sha,runId,now}
}
test('community admission binds full source proof, exact persisted cache and untouched future opening with canonical SQL-compatible SHA',()=>{
 const f=fixture();assert.equal(typeof api.buildFussballCardAdmission,'function')
 const {manifest,sha256}=api.buildFussballCardAdmission(f)
 assert.equal(manifest.openingRoundId,3);assert.equal(manifest.sourceProofSha256,hash(f.proof));assert.equal(manifest.nightlyCacheSha256,hash(f.seedCacheReceipt));assert.deepEqual(manifest.playedReports.map(r=>r.matchId),[1,2]);assert.equal(sha256,api.canonicalFussballAdmissionSha256(manifest))
 assert.equal(api.canonicalFussballAdmissionSha256({b:2,a:1}),hash({a:1,b:2}))
})
test('invalid cache, proof snapshot, pending inventory or touched opening prevents admission before mutation',()=>{
 for(const mutate of [f=>{f.seedCacheReceipt.persisted=false},f=>{f.seedCacheReceipt.run_id='other'},f=>{f.seedCacheReceipt.cache.key='other'},f=>{f.seedCacheReceipt.expected_sha='f'.repeat(40)},f=>{f.proof.snapshot_sha256='f'.repeat(64)},f=>{f.proof.pending_inventory_sha256='f'.repeat(64)},f=>{f.snapshot.matches[2].zapisnik_id='touched'},f=>{f.snapshot.rounds[2].lineups_locked_at=now.toISOString()},f=>{f.snapshot.fantasy.teams=[{id:1}]}]){const f=fixture();mutate(f);assert.throws(()=>api.buildFussballCardAdmission(f))}
})
test('community readiness retains normal price and affordable legal-squad gates',()=>{const f=fixture();assert.equal(api.inspectFussballCommunityReadiness(f).assessment.pripravljena,true);f.state.igralci=f.state.igralci.map(p=>({...p,value:12}));assert.throws(()=>api.inspectFussballCommunityReadiness(f),/kader|squad|prora|budget/);f.state.igralci=[];assert.throws(()=>api.inspectFussballCommunityReadiness(f))})
function rolloutFixture(){
 const f=fixture(),trace=[];f.snapshot.competition.source_policy=null;delete f.snapshot.fussball_cards
 let context=fixture().snapshot.fussball_cards
 const transport={snapshot:async()=>structuredClone(f.snapshot),competition:async()=>structuredClone(f.snapshot.competition),state:async()=>f.state,
  installCommunityPolicy:async()=>{trace.push('install');f.snapshot.competition.source_policy=policy;f.snapshot.fussball_cards=structuredClone(context);return {installed:true,source_policy:policy}},
  recordCommunityAdmission:async(c,{manifest,sha256})=>{trace.push('admission');f.snapshot.competition.prvi_fantasy_krog=2;return {registered:true,manifest_sha256:sha256,pending_inventory_sha256:manifest.pendingInventorySha256,opening_round_id:3}},
  activate:async()=>{trace.push('activate');f.snapshot.competition.active=true;return {vklopljena:true,prvi_krog:2,razlika:0,source_policy:policy}},
 }
 const options={sourceReport:{expected_sha:sha,results:[{candidate:f.candidate,slug:f.candidate.slug,status:'STAGED',directory:'/closed-source'}]},expectedSha:sha,transport,guard:async()=>{},loadPack:async()=>{trace.push('replay');return f.pack},verifyNative:async({snapshot})=>{trace.push('proof');f.proof.snapshot_sha256=hash(snapshot);return f.proof},runCommand:async file=>{trace.push(file);return {code:0}},now:()=>now,seedCacheReceipt:f.seedCacheReceipt,runId}
 return {...f,trace,transport,options}
}
test('actual rollout installs only after source replay, preserves native phases, then records persisted-cache admission before activation',async()=>{
 const f=rolloutFixture(),receipts=[];const r=await runBulkRollout({...f.options,onCheckpoint:r=>receipts.push(r)})
 assert.equal(r.results[0].status,'ACTIVE',JSON.stringify(r));assert.ok(f.trace.indexOf('replay')<f.trace.indexOf('install'));assert.ok(f.trace.indexOf('install')<f.trace.findIndex(s=>s.endsWith('uvoz-zapisnikov.mjs')));assert.ok(f.trace.indexOf('admission')<f.trace.indexOf('activate'))
 assert.ok(receipts.some(r=>r.results[0]?.steps.some(s=>s.stage==='community-policy'&&s.status==='RUNNING')));assert.ok(receipts.some(r=>r.results[0]?.steps.some(s=>s.stage==='community-admission'&&s.status==='RUNNING')))
})
test('unknown policy installation stops without repeating write or importing any source report',async()=>{const f=rolloutFixture();f.transport.installCommunityPolicy=async()=>{f.trace.push('install');throw Error('lost response')};const r=await runBulkRollout(f.options);assert.equal(r.results[0].status,'UNKNOWN');assert.equal(f.trace.filter(s=>s==='install').length,1);assert.equal(f.trace.some(s=>s.endsWith('uvoz-zapisnikov.mjs')),false)})
test('missing durable seed receipt or unaffordable squad holds activation after imports without stripping policy',async()=>{for(const mutate of [f=>{f.options.seedCacheReceipt=null},f=>{f.state.igralci=[]}]){const f=rolloutFixture();mutate(f);const r=await runBulkRollout(f.options);assert.equal(r.results[0].status,'HOLD',JSON.stringify(r));assert.equal(f.trace.includes('admission'),false);assert.equal(f.trace.includes('activate'),false);assert.equal(f.snapshot.competition.source_policy,policy)}})
test('bulk transport preserves installed card readiness context and sends exact service install/admission payloads',async()=>{
 const f=fixture(),calls=[],base={snapshot:async()=>structuredClone(f.snapshot)}
 const t=createBulkTransport({url:'https://db.invalid',key:'test-service',base,fetch:async(url,o)=>{calls.push([String(url),o]);const path=new URL(url).pathname;return Response.json(path.endsWith('/countries')?[{id:4,code:'DE'}]:path.endsWith('/check_fussball_card_readiness')?f.snapshot.fussball_cards:path.endsWith('/install_fussball_card_policy')?{installed:true,source_policy:policy}:{registered:true})}})
 assert.equal((await t.snapshot(f.candidate)).fussball_cards.enabled,true);assert.equal(typeof t.installCommunityPolicy,'function');await t.installCommunityPolicy(f.candidate);const body=JSON.parse(calls.find(([url])=>url.includes('install_fussball_card_policy'))[1].body);assert.deepEqual(body,{p_competition_id:99,p_current_code:candidate.source_league_code,p_archive_codes:candidate.archives.map(a=>a.code)})
 assert.equal(typeof t.recordCommunityAdmission,'function');await t.recordCommunityAdmission(f.candidate,{manifest:{version:1},sha256:'f'.repeat(64)});assert.equal(JSON.parse(calls.at(-1)[1].body).p_sha256,'f'.repeat(64))
})
test('changed native state after source proof or admission holds before activation',async()=>{
 for(const phase of ['proof','admission']){
  const f=rolloutFixture()
  if(phase==='proof'){const command=f.options.runCommand;f.options.runCommand=async(file,...args)=>{const answer=await command(file,...args);if(file.endsWith('prepare-fussball-nightly.mjs'))f.snapshot.matches[0].home_goals++;return answer}}
  else{const record=f.transport.recordCommunityAdmission;f.transport.recordCommunityAdmission=async(...args)=>{const answer=await record(...args);f.snapshot.matches[0].home_goals++;return answer}}
  const r=await runBulkRollout(f.options);assert.equal(r.results[0].status,'HOLD',JSON.stringify(r));assert.equal(f.trace.includes('activate'),false)
 }
})
test('lost admission or activation responses remain UNKNOWN with durable stage receipts and no automatic replay',async()=>{
 for(const stage of ['admission','activation']){const f=rolloutFixture();if(stage==='admission')f.transport.recordCommunityAdmission=async()=>{throw Error('lost admission')};else f.transport.activate=async()=>{throw Error('lost activation')};const r=await runBulkRollout(f.options);assert.equal(r.results[0].status,'UNKNOWN',JSON.stringify(r));assert.equal(r.results[0].steps.at(-1).status,'UNKNOWN')}
})
test('separate community activation consumes persisted cache and prior pricing receipts without reinstalling or importing',async()=>{
 const f=rolloutFixture(),prepared=await runBulkRollout({...f.options,importOnly:true})
 assert.equal(prepared.results[0].status,'VERIFIED');assert.equal(f.trace.includes('admission'),false);const before=f.trace.filter(s=>s==='install').length
 const activated=await runBulkRollout({...f.options,activationOnly:true,sourceReport:{...f.options.sourceReport,results:prepared.results.map(r=>({...r,status:'STAGED'}))},runCommand:async()=>assert.fail('no source import or seed repeat')})
 assert.equal(activated.results[0].status,'ACTIVE',JSON.stringify(activated));assert.equal(f.trace.filter(s=>s==='install').length,before)
})
test('active community pricing refuses unresolved red cohorts before player reads or writes',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm'),{isFussballCommunityCompetition}=await import('./fussball-community-policy.mjs')
 const source=readFileSync(new URL('./ovrednoti-igralce.mjs',import.meta.url),'utf8'),start=source.indexOf('// Missing red recipients'),end=source.indexOf('// Retained statistics from a rejected DFB report')
 assert.ok(start>=0&&end>start)
 const exits=[],calls=[]
 await runInNewContext('(async()=>{'+source.slice(start,end)+'})()', {pisi:true,tekmovanje:{...fixture().snapshot.competition,active:true},isFussballCommunityCompetition,db:{rpc:async(name,args)=>{calls.push([name,args]);return {data:{installed:true,enabled:true,pending_reports:[{match_id:1}]},error:null}}},console:{warn(){}},process:{exit:code=>exits.push(code)}})
 assert.deepEqual(exits,[0]);assert.equal(calls[0][0],'check_fussball_card_readiness')
})
