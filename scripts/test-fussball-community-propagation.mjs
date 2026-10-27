import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createFussballPublicSource} from './viri/fussball-public.mjs'
import {createBulkCapturedSource} from './viri/bulk-captured.mjs'
import {GERMANY_BULK_CANDIDATES,collectGermanySeason} from './bulk-germany-source.mjs'
import {prepareFussballNightly,assertFussballNightlyCompetition} from './prepare-fussball-nightly.mjs'
import {FUSSBALL_COMMUNITY_SOURCE_POLICY as policy} from './fussball-community-policy.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'
const read=n=>readFileSync(new URL('./vzorci/de-fussball-community/'+n,import.meta.url))
const witness=JSON.parse(read('provenance.json')),fonts=Object.fromEntries(Object.entries(witness.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const candidate=GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden'),code=candidate.source_league_code
const competition={id:99,country_id:4,country_code:'DE',slug:candidate.slug,source:'fussball-public',source_league_code:code,source_policy:policy,active:false,date_only_deadline_policy:null}
function pendingBatch(){
 const result=razberiFantasyZapisnik(read('report.html').toString(),read('lineup.html').toString(),{fonts,id:witness.matchId,lineupId:witness.matchId,season:'2026/27',cardPolicy:'community-v1'}),e=result.cardEnvelope
 const fixture={id:e.matchId,zapisnikId:e.reportId,url:e.sourceUrl,krog:e.round,datum:e.date,ura:e.time,domaci:e.homeName,gostje:e.awayName,rezultat:e.score},staffel=code.split(':')[0],season='2026/27'
 return buildFussballImportBatch({version:1,scope:{provider:'fussball',staffel,season,cardPolicy:'community-v1',seedUrl:candidate.seedUrl,asOfDate:'2026-10-27'},schedule:{staffel,season,rounds:[1],fixtures:[fixture]},reports:[],pendingReports:[{fixture,result}],cardEnvelopes:[e],rejectedReports:[],coverage:{expectedRounds:1,capturedRounds:1,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:0,pendingReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}},activationEligible:false},{staffel,season,cardPolicy:'community-v1'})
}
function database(patch={}){const calls=[];return {calls,async rpc(name,args){calls.push([name,args]);if(name==='get_fussball_card_policy')return {data:{installed:true,enabled:true,source_policy:policy,current_code:code,archive_codes:candidate.archives.map(a=>a.code),...patch},error:null};assert.equal(name,'fussball_reserve_player_ids');return {data:pendingBatch().identities.filter(i=>args.p_source_ids.includes(i.source_id)),error:null}}}}
test('reviewed catalog opts only Baden into community cards',()=>{assert.deepEqual(GERMANY_BULK_CANDIDATES.filter(c=>c.communityCards===true).map(c=>c.slug),[candidate.slug])})
test('ordinary native factory requires installed enabled exact policy and returns pending evidence without appearances',async()=>{
 const db=database(),batch=pendingBatch(),loads=[]
 const source=createFussballPublicSource({competition,db,directory:'closed-originals',loadCapture:async(d,o)=>{loads.push(o);return batch}})
 const rows=await source.zapisniki(code);assert.equal(rows.length,1);assert.equal(rows[0].statisticsPending,true);assert.ok(rows[0].cardEnvelope)
 assert.equal(Object.hasOwn(rows[0],'nastopi'),false);assert.equal(Object.hasOwn(rows[0].z,'goli'),false);assert.throws(()=>source.nastopi(rows[0].z),/pending|statistics|appearance/)
 assert.equal(loads[0].cardPolicy,'community-v1');assert.equal(db.calls[0][0],'get_fussball_card_policy');assert.equal(db.calls[1][1].p_source_ids.length,rows[0].cardEnvelope.roster.length)
 for(const patch of [{installed:false},{enabled:false},{source_policy:null},{current_code:candidate.archives[0].code},{archive_codes:[]}]){
  let loaded=false;const s=createFussballPublicSource({competition,db:database(patch),directory:'closed',loadCapture:async()=>{loaded=true;return batch}});await assert.rejects(s.zapisniki(code),/policy|scope|enabled|installed/);assert.equal(loaded,false)
 }
 assert.throws(()=>createFussballPublicSource({competition:{...competition,source_policy:null},db,directory:'closed'}),/policy/)
})
test('bulk native factory returns pending cards and reserves every historical roster identity after native policy gate',async()=>{
 const db=database(),batch=pendingBatch(),pack={candidate,seasons:[{code,season:candidate.season,...batch}]}
 const source=createBulkCapturedSource({competition,db,directory:'closed-pack',loadPack:async()=>pack})
 const rows=await source.zapisniki(code);assert.equal(rows[0].statisticsPending,true);assert.ok(rows[0].cardEnvelope);assert.throws(()=>source.nastopi(rows[0].z))
 assert.equal(db.calls[0][0],'get_fussball_card_policy');assert.equal(db.calls.find(c=>c[0]==='fussball_reserve_player_ids')[1].p_source_ids.length,batch.cardEnvelopes[0].roster.length)
})
test('Germany collector passes explicit policy to both current and observed archive while strict candidate remains unchanged',async()=>{
 for(const c of [candidate,GERMANY_BULK_CANDIDATES[0]])for(const code of [c.source_league_code,...c.archives.map(a=>a.code)]){
  const t={code,season:code.split(':')[1],staffel:code.split(':')[0],seedUrl:code===c.source_league_code?c.seedUrl:c.archives[0].seedUrl}
  await collectGermanySeason(t,c,{client:{},asOfDate:'2026-10-27',collectSeason:async options=>{assert.equal(options.cardPolicy,c===candidate?'community-v1':undefined);return {}}})
 }
})
test('nightly preserves pending-card original bytes and explicit policy across warm cache reuse',async()=>{
 const root=mkdtempSync(join(tmpdir(),'community-nightly-')),cacheDirectory=join(root,'cache'),calls=[],batch=pendingBatch()
 const row={...competition,active:true};assert.equal(assertFussballNightlyCompetition(row).communityCards,true)
 try{for(const name of ['one','two'])await prepareFussballNightly({candidate:row,directory:join(root,name),cacheDirectory,now:Date.parse('2026-10-27T12:00:00Z'),captureDirectory:async o=>{calls.push(o);assert.equal(o.options.cardPolicy,'community-v1');mkdirSync(o.directory);writeFileSync(join(o.directory,'manifest.json'),'original bytes')},loadCapture:async(d,o)=>{assert.equal(o.cardPolicy,'community-v1');return batch}})
 assert.equal(calls[1].reuseDirectory,join(cacheDirectory,'latest'));assert.throws(()=>assertFussballNightlyCompetition({...row,source_policy:null}),/policy/)
 }finally{rmSync(root,{recursive:true,force:true})}
})
const pilot=await import('./fussball-season-pilot.mjs')
function pilotEnvironment(){const sha='a'.repeat(40),repo='Lovro-splichal-orhanizagi/mnzgorenjska',a=candidate.archives[0];return {SEED_URL:candidate.seedUrl,STAFFEL:code.split(':')[0],SEASON:candidate.season,MAX_REQUESTS:'1000',REPORTS:'all',ARCHIVE_JSON:JSON.stringify({seedUrl:a.seedUrl,staffel:a.code.split(':')[0],season:a.season,maxRequests:1000,observedSeedUrl:a.observedSeedUrl}),PRIOR_REQUESTS:'961',TOTAL_REQUEST_CAP:'5000',ROLLOUT_CANDIDATE:candidate.slug,EXPECTED_SHA:sha,GITHUB_SHA:sha,GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repo,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40000000000',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:repo+'/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main'}}
test('hosted source capture and paired handoff derive policy only from reviewed exact rollout selection',async()=>{
 const e=pilotEnvironment(),headSha=e.EXPECTED_SHA,plan=pilot.validateFussballSeasonPilot(e,{headSha})
 assert.equal(plan.current.cardPolicy,'community-v1');assert.equal(plan.archive.cardPolicy,'community-v1')
 const strict=pilot.validateFussballSeasonPilot({...e,ROLLOUT_CANDIDATE:''},{headSha});assert.equal(strict.current.cardPolicy,undefined)
 assert.equal(typeof pilot.captureFussballSeasonCurrent,'function')
 let captureOptions;await pilot.captureFussballSeasonCurrent('/tmp/not-created',e,{headSha,captureDirectory:async o=>{captureOptions=o;return {success:true,snapshot:{requests:0}}}});assert.equal(captureOptions.options.cardPolicy,'community-v1')
 const batch=pendingBatch(),readManifest=path=>({version:path==='current'?1:3,success:true,options:{...(path==='current'?plan.current:plan.archive),reportLimit:null}})
 const dispatch=await pilot.authorizeFussballRollout({currentDirectory:'current',archiveDirectory:'archive',e,headSha,mainSha:headSha},{readManifest,loadCapture:async(path,o)=>{assert.equal(o.cardPolicy,'community-v1');return {...batch,staffel:o.staffel,season:o.season}}})
 assert.ok(dispatch.includes('candidate='+candidate.slug))
 await assert.rejects(pilot.authorizeFussballRollout({currentDirectory:'current',archiveDirectory:'archive',e,headSha,mainSha:headSha},{readManifest,loadCapture:async(path,o)=>({...batch,staffel:o.staffel,season:o.season,pendingReports:[{statisticsPending:true}]})}))
})
