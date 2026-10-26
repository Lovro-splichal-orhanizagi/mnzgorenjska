import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createEpsBudgetFetch} from './eps-source-budget.mjs'
import {selectProviderCandidates,runProviderBatch} from './provider-league-batch.mjs'
import {validateSelection} from './vklopi-obstojece-lige.mjs'

// Synthetic football rows exercise orchestration only, never source readiness.
const sha='a'.repeat(40)
const first={id:904,slug:'gr-peir-a-1',source:'eps',source_league_code:'epspeir.gr:726',host:'www.epspeir.gr',archives:[{code:'epspeir.gr:605',season:'2025/26'}]}
const other={id:929,slug:'gr-ev-b-1',source:'eps',source_league_code:'epsevias.gr:273',host:'www.epsevias.gr',archives:[{code:'epsevias.gr:218',season:'2025/26'}]}
function snapshot(c){
 const players=Array.from({length:22},(_,i)=>({id:i+1,reg_st:i+100,team_id:i<11?1:2,active:true,position:i%11===0?'GK':'MID',position_source:'zapisnik'}))
 const apps=players.map(p=>({player_id:p.id,team_id:p.team_id,started:true,is_goalkeeper:p.position==='GK',minute_on:0,minute_off:90,minutes_played:90,red_cards:0,penalties_missed:0}))
 return {competition:{...c,country_code:'GR',active:false,source_policy:null,date_only_deadline_policy:null},season:'2026/27',fantasy:{teams:[],lineups:[]},players,rounds:[{id:1,season:'2025/26'},{id:2,season:'2026/27'}],matches:[1,2].map(id=>({id,round_id:id,zapisnik_id:'gr1-'+id,home_team_id:1,away_team_id:2,played_on:'2026-01-01',imported_at:'2026-01-02',statistics_status:'available',kontumacija:false,home_goals:0,away_goals:0,appearance_rows:apps,goal_rows:[]}))}
}
function harness(candidates=[first,other],extra={}){
 const calls=[]
 const transport={snapshot:async c=>snapshot(c),competition:async c=>snapshot(c).competition}
 return {calls,options:{candidates,expectedSha:sha,transport,guard:async()=>{},contracts:{},runCommand:async(file,args,opts)=>{calls.push({file,args,opts});return {code:0,sourceFailure:false}},...extra}}
}
test('EPS selection admits the exact multi-host catalog while retaining MLSZ limits and registry bindings',()=>{
 const registry=JSON.parse(readFileSync(new URL('./policies/existing-league-candidates-20261018.json',import.meta.url)))
 const cs=selectProviderCandidates(registry,[first.slug,other.slug])
 assert.deepEqual(cs.map(c=>c.host),[first.host,other.host])
 assert.throws(()=>selectProviderCandidates(registry,[first.slug,'hu-pe-u19-e']))
 assert.throws(()=>selectProviderCandidates(registry,[first.slug,first.slug]))
 const drift=structuredClone(registry);drift.candidates.find(c=>c.slug===other.slug).id++
 assert.throws(()=>selectProviderCandidates(drift,[other.slug]))
 const all=JSON.parse(readFileSync(new URL('./policies/eps-batch-candidates.json',import.meta.url)))
 assert.equal(all.length,30)
 assert.equal(selectProviderCandidates(registry,all.map(c=>c.slug)).length,30)
})
test('new EPS tuples are admitted only through the source-proof batch, not the legacy generic activation route',()=>{
 const registry=JSON.parse(readFileSync(new URL('./policies/existing-league-candidates-20261018.json',import.meta.url)))
 assert.equal(registry.candidates.find(c=>c.slug===first.slug),undefined)
 assert.throws(()=>validateSelection(registry,[first.slug]))
 assert.doesNotThrow(()=>selectProviderCandidates(registry,[first.slug]))
})
test('EPS current catch-up skips archive rewrites and preserves the strict-proof HOLD',async()=>{
 const h=harness(),r=await runProviderBatch(h.options)
 assert.equal(r.results.length,2)
 assert.ok(h.calls.every(c=>!c.args.includes('--liga')),'existing archives must not be rewritten')
 assert.ok(h.calls.filter(c=>c.file.endsWith('uvoz-zapisnikov.mjs')).every(c=>c.args.includes('--samo-manjkajoce')))
 assert.ok(h.calls.every(c=>c.opts.source==='eps'&&c.opts.hosts.includes(first.host)&&c.opts.hosts.includes(other.host)))
 assert.ok(r.results.every(c=>c.status==='HOLD'&&c.reason_code==='NEEDS_STRICT_PROVIDER_PROOF'))
})
test('an EPS technical source stop holds its host and continues a different selected host',async()=>{
 const sibling={...first,id:900,slug:'gr-peir-g-1',source_league_code:'epspeir.gr:735',archives:[{code:'epspeir.gr:610',season:'2025/26'}]}
 const directory=mkdtempSync(join(tmpdir(),'eps-host-stop-')),budgetPath=join(directory,'budget.json')
 const request=createEpsBudgetFetch({path:budgetPath,maxRequests:30,databaseOrigin:'https://db.fixture.invalid',hosts:[first.host,other.host],fetch:async()=>new Response('refused',{status:403})})
 const calls=[],h=harness([first,sibling,other],{budgetPath,maxRequests:30,runCommand:async(file,args)=>{
  calls.push(args)
  if(args.includes(first.slug)){await assert.rejects(request('https://www.epspeir.gr/results/display_schedule.php?league_id=726'));return {code:4,sourceFailure:true}}
  return {code:0,sourceFailure:false}
 }})
 let r;try{r=await runProviderBatch(h.options)}finally{rmSync(directory,{recursive:true,force:true})}
 assert.equal(r.results[0].status,'SOURCE_STOP')
 assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
 assert.equal(r.results[2].status,'HOLD')
 assert.ok(calls.some(args=>args.includes(other.slug)))
 assert.ok(!calls.some(args=>args.includes(sibling.slug)))
})
test('an unclassified EPS child write failure stops the entire batch as UNKNOWN',async()=>{
 const h=harness(undefined,{runCommand:async()=>({code:1,sourceFailure:false})})
 const r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'UNKNOWN')
 assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
})
for(const code of [0,1,5])test('an unqualified error-log match cannot permit other EPS host writes: '+code,async()=>{
 const h=harness(undefined,{runCommand:async()=>({code,sourceFailure:true})})
 const r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'UNKNOWN')
 assert.equal(r.results[1].status,'SKIPPED_SOURCE_STOP')
})
for(const change of [s=>s.competition.country_code='ES',s=>s.season='2027/28'])test('EPS country/season drift refuses all writes: '+change,async()=>{
 const c=structuredClone(snapshot(first));change(c)
 const h=harness([first],{transport:{snapshot:async()=>c,competition:async()=>c.competition}})
 const r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'HOLD');assert.equal(h.calls.length,0)
})
test('known bad completed EPS report is filtered before source requests or writes',async()=>{
 const state=snapshot(first);state.matches[0].home_goals=1
 const h=harness([first],{transport:{snapshot:async()=>state,competition:async()=>state.competition}})
 const r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'HOLD');assert.equal(r.results[0].reason_code,'EXISTING_REPORT_MISMATCH')
 assert.equal(h.calls.length,0)
})
test('an EPS native future-round HOLD avoids expensive full archive proof requests',async()=>{
 let captures=0,activations=0
 const contract={id:'synthetic-proof',source:'eps',host:first.host,verify:()=>true,capture:async({candidate,expectedSha,audit})=>{
  captures++;return {contract_id:'synthetic-proof',candidate,expected_sha:expectedSha,snapshot_sha256:audit.snapshot_sha256,captured_at:new Date().toISOString(),schedule_complete:true,archives:candidate.archives,archive_collisions:[],original_bytes_sha256:'b'.repeat(64),keeper_basis:'synthetic-convention'}
 }}
 const h=harness([first],{contracts:{['eps|'+first.host]:contract},activationRunner:async()=>{activations++;return [{status:'HOLD',reason:'No unlocked future first round'}]}})
 const r=await runProviderBatch(h.options)
 assert.equal(captures,0);assert.equal(activations,1)
 assert.equal(r.results[0].status,'HOLD');assert.match(r.results[0].reason,/future/)
})

test('EPS provisional READY still requires its fixed-host proof before native activation and readback',async()=>{
 const order=[];let active=false
 const contract={id:'synthetic-proof',source:'eps',host:first.host,verify:()=>{order.push('verify');return true},capture:async({candidate,expectedSha,audit})=>{
  order.push('proof');return {contract_id:'synthetic-proof',candidate,expected_sha:expectedSha,snapshot_sha256:audit.snapshot_sha256,captured_at:new Date().toISOString(),schedule_complete:true,archives:candidate.archives,archive_collisions:[],original_bytes_sha256:'b'.repeat(64),keeper_basis:'synthetic-convention'}
 }}
 const h=harness([first],{contracts:{['eps|'+first.host]:contract},activationRunner:async({apply})=>{
  order.push(apply?'activate':'preview')
  if(!apply)return [{status:'READY'}]
  active=true;return [{status:'ACTIVE'}]
 }})
 h.options.transport.competition=async c=>({...snapshot(c).competition,active})
 const r=await runProviderBatch(h.options)
 assert.equal(r.results[0].status,'ACTIVE')
 assert.deepEqual(order,['preview','proof','verify','verify','activate'])
 assert.equal(r.results[0].readback.active,true)
})
