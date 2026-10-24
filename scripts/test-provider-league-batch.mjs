import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {selectProviderCandidates, auditStoredData, runProviderBatch, assertProviderProof, atomicCheckpoint, assertBatchExecution, parseArguments,createBatchTransport,markInterrupted,runImportCommand} from './provider-league-batch.mjs'
const sha='a'.repeat(40)
const registry=JSON.parse(readFileSync(new URL('./policies/existing-league-candidates-20261018.json',import.meta.url)))
const candidates=()=>selectProviderCandidates(registry,['hu-pe-u19-e','hu-za-3-kozep'])
function snapshot(c) {
 const players=Array.from({length:22},(_,i)=>({id:i+1,reg_st:100+i,team_id:i<11?1:2,active:true,position:i%11===0?'GK':'MID',position_source:'zapisnik'}))
 const appearances=players.map(p=>({player_id:p.id,team_id:p.team_id,started:true,is_goalkeeper:p.position==='GK',minute_on:0,minute_off:90,minutes_played:90,red_cards:0}))
 return {competition:{...c,active:false,source_policy:null,date_only_deadline_policy:null},season:'2026/27',fantasy:{teams:[],lineups:[]},players,rounds:[{id:1,season:c.archives[0].season},{id:2,season:'2026/27'}],matches:[1,2].map(id=>({id,round_id:id,zapisnik_id:String(1000+id),home_team_id:1,away_team_id:2,played_on:'2026-01-01',imported_at:'2026-01-02',statistics_status:'complete',kontumacija:false,home_goals:0,away_goals:0,appearance_rows:structuredClone(appearances),goal_rows:[]}))}
}
function harness(patch={}) {
 const cs=candidates(),calls=[],checkpoints=[]
 const transport={snapshot:async c=>snapshot(c),competition:async c=>snapshot(c).competition,...patch.transport}
 return {cs,calls,checkpoints,options:{candidates:cs,expectedSha:sha,transport,guard:async()=>{},runCommand:async(file,args)=>{calls.push({file,args});return {code:0,sourceFailure:false}},onCheckpoint:async r=>checkpoints.push(r),...patch}}
}
test('only exact reviewed bounded same-host candidate mappings enter the real runner',()=>{
 const cs=candidates();assert.equal(cs[0].archives[0].code,'65/14/32325');assert.equal(cs[1].archives[0].code,'63/20/29515')
 for(const slugs of [[],['hu-pe-u19-e','hu-pe-u19-e'],['hu-pe-u19-a'],['hu-pe-u19-e',...Array(5).fill('hu-za-3-kozep')]])assert.throws(()=>selectProviderCandidates(registry,slugs))
 const drift=structuredClone(registry);drift.candidates.find(c=>c.id===635).source_league_code='67/14/wrong';assert.throws(()=>selectProviderCandidates(drift,['hu-pe-u19-e']),/tuple/i)
})
test('stored audit covers individuals in both archive and current season',()=>{
 const c=candidates()[0],s=snapshot(c);assert.equal(auditStoredData(c,s).reports,2)
 for(const mutate of [s=>s.players[0].reg_st=null,s=>s.matches[0].appearance_rows[0].minute_on=2,s=>s.matches[0].appearance_rows[0].is_goalkeeper=false,s=>s.matches[0].appearance_rows[0].team_id=3,s=>s.players[0].position='MID',s=>s.matches[0].imported_at=null,s=>s.matches[0].statistics_status='unavailable_historical']) {
  const broken=snapshot(c);mutate(broken);assert.throws(()=>auditStoredData(c,broken))
 }
})
test('team-correct own goals require scorer identity and the scorer appearance interval',()=>{
 const c=candidates()[0],s=snapshot(c),m=s.matches[0]
 m.goal_rows=[{id:1,team_id:1,scorer_id:1,minute:45,is_own_goal:true}];m.away_goals=1;assert.equal(auditStoredData(c,s).reports,2)
 m.home_goals=1;m.away_goals=0;assert.throws(()=>auditStoredData(c,s),/score/)
 m.home_goals=0;m.away_goals=1;m.goal_rows[0].scorer_id=999;assert.throws(()=>auditStoredData(c,s),/scorer/)
})
test('real commands execute archive, schedule, current and fresh pricing despite generic aggregate readiness',async()=>{
 const h=harness(),r=await runProviderBatch(h.options)
 assert.equal(h.calls.length,12)
 assert.deepEqual(h.calls.slice(0,6).map(c=>c.file),['scripts/uvoz-zapisnikov.mjs','scripts/uvoz-razporeda.mjs','scripts/uvoz-zapisnikov.mjs','scripts/lazni-vratarji.mjs','scripts/ugani-pozicije.mjs','scripts/ovrednoti-igralce.mjs'])
 assert.ok(h.calls[0].args.includes('65/14/32325'));assert.ok(h.calls[1].args.includes('--pisi'))
 assert.ok(h.calls.every(c=>!c.args.includes('--dovoli-aktivno')))
 assert.deepEqual(r.results.map(r=>r.reason_code),['NEEDS_STRICT_PROVIDER_PROOF','NEEDS_STRICT_PROVIDER_PROOF'])
 assert.equal(r.results[0].pricing,'COMPLETED');assert.ok(h.checkpoints.some(c=>c.results[0]?.steps.some(s=>s.status==='RUNNING')))
})
test('football data HOLD prevents pricing only that league and continues the sibling',async()=>{
 const h=harness();h.options.transport.snapshot=async c=>{const s=snapshot(c);if(c.id===635)s.matches[0].home_goals=1;return s}
 const r=await runProviderBatch(h.options);assert.equal(r.results[0].status,'HOLD');assert.equal(r.results[1].pricing,'COMPLETED');assert.equal(h.calls.length,9)
})
for(const code of [1,4,5])test(`source exit ${code} stops all later same-host candidates`,async()=>{
 const h=harness({runCommand:async()=>({code})}),r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'SOURCE_STOP');assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
})
test('successful child exit with retained refusal/network warning still stops host',async()=>{
 const h=harness({runCommand:async()=>({code:0,sourceFailure:true})}),r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'SOURCE_STOP');assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
})
test('ambiguous command writes remain UNKNOWN without retry and preserve source stop',async()=>{
 let count=0;const h=harness({runCommand:async()=>{count++;throw Error('terminated')}}),r=await runProviderBatch(h.options)
 assert.equal(count,1);assert.equal(r.results[0].status,'UNKNOWN');assert.equal(r.results[0].steps[0].status,'UNKNOWN');assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
})
test('changed tuple, active, fantasy data and custom policy hold before first write',async()=>{
 for(const change of [c=>c.active=true,c=>c.source_league_code='changed',c=>c.source_policy='custom']) {
  const h=harness();h.options.transport.competition=async c=>{const value=snapshot(c).competition;change(value);return value};const r=await runProviderBatch(h.options);assert.equal(h.calls.length,0);assert.ok(r.results.every(r=>r.status==='HOLD'))
 }
 const h=harness();h.options.transport.snapshot=async c=>{const s=snapshot(c);s.fantasy.teams=[{id:1}];return s};await runProviderBatch(h.options);assert.equal(h.calls.length,0)
})
test('main drift stops before any write and is not disguised as a football HOLD',async()=>{
 const h=harness({guard:async()=>{throw Error('main changed')}}),r=await runProviderBatch(h.options);assert.equal(h.calls.length,0);assert.equal(r.status,'STOPPED');assert.equal(r.results.length,0)
})
test('no activation from a self-asserted proof or generic READY',()=>{
 const c=candidates()[0],s=snapshot(c),audit=auditStoredData(c,s)
 for(const proof of [null,{status:'READY'},{verified:true,snapshot_sha256:audit.snapshot_sha256}])assert.throws(()=>assertProviderProof({candidate:c,expectedSha:sha,audit,proof}),/proof|contract/i)
})
test('fresh independently verified proof binds exact candidate, commit, snapshot, archive and original source capture',()=>{
 const c=candidates()[0],s=snapshot(c),audit=auditStoredData(c,s)
 const contract={id:'fixture-reviewed-provider-v1',source:'mlsz',host:c.host,verify:()=>true}
 const proof={contract_id:contract.id,expected_sha:sha,candidate:c,snapshot_sha256:audit.snapshot_sha256,captured_at:new Date().toISOString(),schedule_complete:true,archives:c.archives,archive_collisions:[],keeper_basis:'reviewed-provider-contract',original_bytes_sha256:'b'.repeat(64)}
 assertProviderProof({candidate:c,expectedSha:sha,audit,proof,contract})
 for(const patch of [{expected_sha:'c'.repeat(40)},{snapshot_sha256:'d'.repeat(64)},{schedule_complete:false},{archive_collisions:['collision']},{captured_at:'2020-01-01T00:00:00Z'},{archives:[]}])assert.throws(()=>assertProviderProof({candidate:c,expectedSha:sha,audit,proof:{...proof,...patch},contract}))
})
test('atomic checkpoint retains RUNNING and later UNKNOWN receipts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'provider-checkpoint-'));try{const path=join(dir,'report.json');atomicCheckpoint(path,{status:'RUNNING'});assert.equal(JSON.parse(readFileSync(path)).status,'RUNNING');atomicCheckpoint(path,{status:'UNKNOWN'});assert.equal(JSON.parse(readFileSync(path)).status,'UNKNOWN')}finally{rmSync(dir,{recursive:true,force:true})}
})
test('CLI accepts explicit tuples only on first Actions attempt at exact main',()=>{
 assert.equal(parseArguments(['--lige','hu-pe-u19-e','--expected-sha',sha]).expectedSha,sha)
 assert.throws(()=>parseArguments(['--country','HU','--expected-sha',sha]))
 const env={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_RUN_ID:'23',GITHUB_RUN_ATTEMPT:'1',SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'}
 assertBatchExecution({expectedSha:sha,headSha:sha,mainSha:sha,env,envFileExists:false})
 for(const patch of [{mainSha:'b'.repeat(40)},{envFileExists:true},{env:{...env,GITHUB_RUN_ATTEMPT:'2'}}])assert.throws(()=>assertBatchExecution({expectedSha:sha,headSha:sha,mainSha:sha,env,envFileExists:false,...patch}))
})

test('activation runs native apply only after strict proof and records exact readback',async()=>{
 const h=harness(),states=new Map(),contract={id:'fixture-v1',source:'mlsz',host:h.cs[0].host,verify:()=>true,capture:async({candidate,expectedSha,audit})=>({contract_id:'fixture-v1',expected_sha:expectedSha,candidate,snapshot_sha256:audit.snapshot_sha256,captured_at:new Date().toISOString(),schedule_complete:true,archives:candidate.archives,archive_collisions:[],keeper_basis:'reviewed-fixture',original_bytes_sha256:'b'.repeat(64)})}
 h.options.contracts={mlsz:contract};h.options.transport.competition=async c=>({...snapshot(c).competition,active:states.get(c.id)??false})
 let count=0;h.options.activationRunner=async({candidates:[c],apply})=>{assert.equal(apply,true);count++;states.set(c.id,true);return [{slug:c.slug,status:'ACTIVE'}]}
 const r=await runProviderBatch(h.options);assert.equal(count,2);assert.equal(r.status,'ACTIVE');assert.ok(r.results.every(r=>r.readback.active))
})
test('ambiguous native activation is UNKNOWN even if readback reports active',async()=>{
 const h=harness(),c=h.cs[0];h.options.candidates=[c]
 const contract={id:'fixture-v1',source:'mlsz',host:c.host,verify:()=>true,capture:async({candidate,expectedSha,audit})=>({contract_id:'fixture-v1',expected_sha:expectedSha,candidate,snapshot_sha256:audit.snapshot_sha256,captured_at:new Date().toISOString(),schedule_complete:true,archives:candidate.archives,archive_collisions:[],keeper_basis:'reviewed-fixture',original_bytes_sha256:'b'.repeat(64)})}
 let active=false,attempts=0;h.options.contracts={mlsz:contract};h.options.transport.competition=async c=>({...snapshot(c).competition,active});h.options.transport.activate=async()=>{attempts++;active=true;throw Error('network response lost')}
 h.options.activationRunner=async({candidates:[c],transport})=>{try{await transport.activate(c)}catch{}return [{status:'HOLD'}]}
 const r=await runProviderBatch(h.options);assert.equal(attempts,1);assert.equal(r.results[0].status,'UNKNOWN');assert.equal(r.results[0].readback.active,true)
})
test('timed substitutions must reconcile at every interval, not just total minutes',()=>{
 const c=candidates()[0],s=snapshot(c),rows=s.matches[0].appearance_rows
 rows[1].minute_off=40;rows[1].minutes_played=40;rows[2].minute_on=10;rows[2].started=false;rows[2].minutes_played=80
 // Add enough starters to retain 11 and match total minutes while creating a gap/overlap.
 s.players.push({id:23,reg_st:123,team_id:1,active:true,position:'MID',position_source:'zapisnik'})
 rows.push({...rows[1],player_id:23,minute_off:60,minutes_played:60})
 assert.throws(()=>auditStoredData(c,s),/interval|minutes|Starter/)
})


test('database snapshot enumerates composite lineup identities and detects truncated pages',async()=>{
 const c=candidates()[0],calls=[]
 const fetch=async(url,options)=>{
  const u=new URL(url),table=u.pathname.split('/').at(-1);calls.push({table,options})
  let data=table==='competitions'?[snapshot(c).competition]:table==='sezona_lige'?'2026/27':table==='fantasy_lineups'?[{round_id:1,fantasy_team_id:1,player_id:1}]:[]
  return {ok:true,headers:new Headers({'Content-Range':Array.isArray(data)&&data.length?'0-0/1':'*/0'}),json:async()=>data}
 }
 const t=createBatchTransport({url:'https://fixture.invalid',key:'fixture',fetch}),s=await t.snapshot(c)
 assert.equal(s.fantasy.lineups.length,1);assert.ok(calls.find(c=>c.table==='players').options.headers.Prefer.includes('count=exact'))
 const broken=createBatchTransport({url:'https://fixture.invalid',key:'fixture',fetch:async(url,options)=>{
  const r=await fetch(url,options)
  if(new URL(url).pathname.endsWith('/players'))r.headers=new Headers({'Content-Range':'*/12'})
  return r
 }})
 await assert.rejects(()=>broken.snapshot(c),/pagination|truncated/i)
})

test('observed archive ownership collision HOLDs that league without pricing or exception fallback',async()=>{
 let count=0;const h=harness({runCommand:async()=>({code:0,archiveCollision:++count===1})}),r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'HOLD');assert.match(r.results[0].reason,/archive.*collision/i);assert.equal(r.results[0].pricing,'NOT_RUN');assert.equal(r.results[1].pricing,'COMPLETED')
})
test('cancellation finalizer marks interrupted write UNKNOWN without replaying it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'provider-interrupted-')),path=join(dir,'report.json')
 try{atomicCheckpoint(path,{status:'RUNNING',results:[{slug:'hu-pe-u19-e',status:'RUNNING',steps:[{stage:'archive-1',status:'RUNNING'}]}]});markInterrupted(path);const r=JSON.parse(readFileSync(path));assert.equal(r.status,'STOPPED');assert.equal(r.results[0].status,'UNKNOWN');assert.equal(r.results[0].steps[0].status,'UNKNOWN')}finally{rmSync(dir,{recursive:true,force:true})}
})

test('actual subprocesses install the fixed fetch hook and share a persisted source-stop budget',async()=>{
 const {writeFileSync}=await import('node:fs'),dir=mkdtempSync(join(tmpdir(),'provider-child-')),oldOptions=process.env.NODE_OPTIONS,oldUrl=process.env.SUPABASE_URL
 try {
  const mock=join(dir,'mock.mjs'),child=join(dir,'child.mjs'),budgetPath=join(dir,'budget.json')
  writeFileSync(mock,"globalThis.fetch=async()=>new Response('<div id=\"match_panel\"></div>')")
  writeFileSync(child,"await fetch('https://adatbank.mlsz.hu/league/67/14/34252/1.html'); console.log('fixture source request completed')")
  process.env.NODE_OPTIONS=`--import ${mock}`;process.env.SUPABASE_URL='https://fixture.invalid'
  assert.equal((await runImportCommand(child,[],{budgetPath,maxRequests:1,logPath:join(dir,'first.log')})).code,0)
  const stopped=await runImportCommand(child,[],{budgetPath,maxRequests:1,logPath:join(dir,'second.log')})
  assert.notEqual(stopped.code,0);assert.equal(stopped.sourceFailure,true);assert.equal(JSON.parse(readFileSync(budgetPath)).requests,1)
 }finally{if(oldOptions===undefined)delete process.env.NODE_OPTIONS;else process.env.NODE_OPTIONS=oldOptions;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;rmSync(dir,{recursive:true,force:true})}
})
test('actual workflow runs fixed explicit CLI after writer coordination and always preserves interruption receipts',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/uvoz-paketa-lig.yml',import.meta.url),'utf8')
 assert.match(workflow,/actions: read/);assert.match(workflow,/cancel-in-progress: false/)
 assert.ok(workflow.indexOf('cakaj-na-uvoze.mjs --popravek --vir mlsz')<workflow.indexOf('node scripts/provider-league-batch.mjs --lige'))
 assert.match(workflow,/--max-requests "\$MAX_REQUESTS"/);assert.match(workflow,/markInterrupted\('release\/provider-batch\/report.json'\)/)
 assert.match(workflow,/if: always\(\)[\s\S]*actions\/upload-artifact@v4/)
})
test('failed durable stage checkpoint stops the batch before any corresponding write',async()=>{
 const h=harness();let failed=false
 h.options.onCheckpoint=async report=>{if(!failed&&report.results[0]?.steps.some(s=>s.status==='RUNNING')){failed=true;throw Error('disk full')}}
 const r=await runProviderBatch(h.options);assert.equal(h.calls.length,0);assert.equal(r.status,'STOPPED');assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
})
test('pre-write competition DB failure stops host instead of treating it as football HOLD',async()=>{
 const h=harness();h.options.transport.competition=async()=>{throw Error('Database HTTP 503')}
 const r=await runProviderBatch(h.options);assert.equal(h.calls.length,0);assert.equal(r.results[0].status,'INFRASTRUCTURE_STOP');assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP');assert.ok(r.host_stop)
})
for(const [key,value]of [['active',true],['source_league_code','changed'],['source_policy','custom']])test(`latest snapshot ${key} drift prevents every corresponding write`,async()=>{
 const h=harness();let count=0;h.options.transport.snapshot=async c=>{const s=snapshot(c);if(++count>1)s.competition[key]=value;return s}
 const r=await runProviderBatch(h.options);assert.equal(h.calls.length,0);assert.equal(r.results[0].status,'HOLD')
})
