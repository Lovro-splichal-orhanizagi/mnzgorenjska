import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { approvalDigest, runBatch, createTransport, validateSelection } from './vklopi-obstojece-lige.mjs'
const registry = JSON.parse(readFileSync(new URL('./policies/existing-league-candidates-20261018.json', import.meta.url)))
const candidate = registry.candidates[0]
const other = registry.candidates[1]
test('workflow writes one actual selected slug per coordinator input line',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/vklop-obstojecih-lig.yml',import.meta.url),'utf8')
  const source=workflow.match(/node --input-type=module <<'JS' > release\/obstojece-lige\/selected-slugs\.txt\n([\s\S]*?)\n          JS/)?.[1]
  assert.ok(source,'actual selected-slugs heredoc is present')
  const expected=[candidate.slug,other.slug].sort()
  const output=execFileSync(process.execPath,['--input-type=module'],{input:source,encoding:'utf8',cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,EXPECTED_SHA:'a'.repeat(40),GITHUB_SHA:'a'.repeat(40),LIGE:expected.join(',')}})
  assert.deepEqual(output.trimEnd().split('\n'),expected)
})
const now = () => new Date('2026-10-18T20:00:00Z')
const players = Array.from({ length: 6 }, (_, club) => ['GK','DEF','DEF','MID','FWD'].map((position,p) => ({ id:club*5+p,team_id:club,position,value:4 }))).flat()
const state = { aktivnih:30,privzetih:0,klubov:6,najvisja_cena:12,po_pozicijah:{},nastopov_s_klopi:2,golov_brez_nastopa:0,krogov_tekoce:2,igralci:players }
function fixture(patch={}) {
  const calls=[]; const active=new Map()
  const transport={
    competition: async c => ({ ...c,active:active.has(c.slug),prvi_fantasy_krog:active.get(c.slug),source_policy:null,date_only_deadline_policy:null }),
    state: async()=>structuredClone(state), season:async()=> '2026/27',
    rounds:async()=> [{id:1,number:1,season:'2026/27',deadline_at:'2026-10-10T10:00:00Z'},{id:2,number:2,season:'2026/27',played_on:'2026-10-24',deadline_at:'2026-10-24T10:00:00Z',lineups_locked_at:null}],
    matches:async()=> [{id:11,round_id:1,home_goals:1,away_goals:0,imported_at:'2026-10-10T12:00:00Z',kontumacija:false,statistics_status:'complete',goals:[{count:1}],appearances:[{count:22}]},{id:12,round_id:2,home_goals:null,away_goals:null,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}],
    activate:async c=>{calls.push(c.slug);active.set(c.slug,2);return {vklopljena:true,prvi_krog:2,razlika:0}}, ...patch,
  }; return {transport,calls}
}
test('selection is explicit and rejects bespoke routes, unknown leagues and duplicates',()=>{
  assert.equal(validateSelection(registry,[candidate.slug]).length,1)
  for(const slugs of [[],['de-regionalliga-nord'],['es-foo'],['hr-foo'],['unknown'],[candidate.slug,candidate.slug]]) assert.throws(()=>validateSelection(registry,slugs))
})
test('HLF registry binds only the reviewed production tuples and its public-browser contract',()=>{
  const hlf=registry.candidates.filter(c=>c.source==='hlf')
  const expected=[...Array.from({length:7},(_,i)=>[496-i,`ro-liga3-s${i+2}`,`national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-${i+2}`]),
    [503,'ro-ab-superliga','judetean/alba/fotbal/2026-2027/superliga-ajf-alba/sezon-regular/1'],
    [510,'ro-cj-l4','judetean/cluj/fotbal/2026-2027/liga-4-cluj/sezon-regular/grupa-a'],
    [512,'ro-hd-l4','judetean/hunedoara/fotbal/2026-2027/liga-4/sezon-regular/serie-1'],
    [498,'ro-liga2','national/fotbal/2026-2027/liga-2-casa-pariurilor/sezon-regular/seria-1'],
    [488,'ro-sb-superliga','judetean/sibiu/fotbal/2026-2027/superliga/sezon-regular/serie-1']]
  assert.deepEqual(hlf.map(c=>[c.id,c.slug,c.source_league_code]),expected)
  assert.equal(validateSelection(registry,hlf.map(c=>c.slug)).length,12)
  assert.throws(()=>validateSelection(registry,['ro-liga3-s1']))
  assert.equal(registry.source_contracts.hlf.document,'docs/viri/romunija.md')
})
test('scope digest binds exact commit and selected candidate tuple',()=>{
  const a=approvalDigest('a'.repeat(40),[candidate]);assert.match(a,/^[a-f0-9]{64}$/)
  assert.notEqual(a,approvalDigest('b'.repeat(40),[candidate]))
  assert.notEqual(a,approvalDigest('a'.repeat(40),[{...candidate,source_league_code:'changed'}]))
})
test('preview fresh-checks cheapest legal squad and actual future start without writes',async()=>{
  const {transport,calls}=fixture();const [r]=await runBatch({candidates:[candidate],transport,now})
  assert.equal(r.status,'READY');assert.equal(r.first_round.number,2);assert.ok(r.cheapest_squad<=100);assert.deepEqual(calls,[])
})
test('apply refreshes state and reads back persisted activation',async()=>{
  const {transport,calls}=fixture();const [r]=await runBatch({candidates:[candidate],transport,now,apply:true})
  assert.equal(r.status,'ACTIVE');assert.equal(r.readback.prvi_fantasy_krog,2);assert.deepEqual(calls,[candidate.slug])
})
test('failed candidate is held and next candidate still activates',async()=>{
  const f=fixture({state:async c=>c.slug===candidate.slug?{...state,golov_brez_nastopa:1}:state})
  const rows=await runBatch({candidates:[candidate,other],transport:f.transport,now,apply:true})
  assert.deepEqual(rows.map(r=>r.status),['HOLD','ACTIVE']);assert.deepEqual(f.calls,[other.slug])
})
test('scored unimported, goal mismatch, custom policy, locked/empty start and native refusal hold',async()=>{
  for(const patch of [
    {matches:async()=>[{id:11,round_id:1,played_on:'2026-10-10',home_goals:1,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}]},
    {matches:async()=>[{id:11,round_id:1,home_goals:2,away_goals:0,imported_at:'2026-10-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]}]},
    {competition:async c=>({...c,active:false,source_policy:'pending'})},
    {state:async()=>({...state,igralci:players.map(p=>({...p,team_id:1}))})},
    {rounds:async()=>[{id:2,number:2,season:'2026/27',played_on:'2026-10-24',deadline_at:'2026-10-24T10:00:00Z',lineups_locked_at:'2026-10-17'}]},
    {matches:async()=>[]},
    {activate:async()=>({vklopljena:false,razlog:'Native guard refused'})},
  ]) {const f=fixture(patch);const [r]=await runBatch({candidates:[candidate],transport:f.transport,now,apply:true});assert.equal(r.status,'HOLD',JSON.stringify(r))}
})
test('future default 0:0 fixtures never count as published unimported results',async()=>{
  const f=fixture();const original=f.transport.matches
  f.transport.matches=async()=> (await original()).map(m=>m.id===12?{...m,played_on:'2026-10-24',home_goals:0,away_goals:0}:m)
  const [r]=await runBatch({candidates:[candidate],transport:f.transport,now});assert.equal(r.status,'READY')
})
test('past 0:0 without report is transparently held as unknown publication',async()=>{
  const f=fixture();const original=f.transport.matches
  f.transport.matches=async()=> (await original()).map(m=>m.id===11?{...m,played_on:'2026-10-10',home_goals:0,away_goals:0,imported_at:null}:m)
  const [r]=await runBatch({candidates:[candidate],transport:f.transport,now,apply:true});assert.equal(r.status,'HOLD');assert.match(r.reason,/publication unknown/);assert.deepEqual(f.calls,[])
})
test('source-confirmed past unplayed fixture is not a missing report; false and unknown remain HOLD',async()=>{
  for(const [flag,expected] of [[true,'READY'],[false,'HOLD'],[null,'HOLD']]){
    const f=fixture();const original=f.transport.matches
    f.transport.matches=async()=> (await original()).map(m=>m.id===11?{...m,played_on:'2026-10-10',home_goals:0,away_goals:0,imported_at:null,vir_brez_izida:flag,goals:[{count:0}],appearances:[{count:0}]}:m)
    const [r]=await runBatch({candidates:[candidate],transport:f.transport,now})
    assert.equal(r.status,expected,`source no-result flag ${flag}: ${r.reason}`)
  }
})
test('transport pages database reads and permits only the native activation write',async()=>{
  const requests=[]
  const transport=createTransport({url:'https://db.example',key:'test',fetch:async(url,options)=>{
    requests.push({url:String(url),options});const rows=new URL(url).searchParams.get('offset')==='0'?Array.from({length:500},(_,id)=>({id})): [{id:500}];return new Response(JSON.stringify(options.method==='POST'?{vklopljena:true}:rows),{status:200})
  }})
  assert.equal((await transport.rounds(candidate)).length,501);await transport.activate(candidate)
  assert.match(requests[0].url,/rest\/v1\/rounds/);assert.equal(requests[0].options.method,'GET');assert.equal(requests[0].options.redirect,'error')
  assert.equal(new URL(requests[1].url).searchParams.get('offset'),'500')
  assert.match(requests[2].url,/rpc\/vklopi_ligo_sredi_sezone$/);assert.equal(requests[2].options.body,JSON.stringify({p_slug:candidate.slug}))
})

test('ambiguous activation failure records persisted readback without retrying write',async()=>{
  let writes=0,reads=0
  const f=fixture({competition:async c=>({...c,active:++reads>1,source_policy:null,prvi_fantasy_krog:2}),activate:async()=>{writes++;throw Error('connection closed after commit')}})
  const [r]=await runBatch({candidates:[candidate],transport:f.transport,now,apply:true})
  assert.equal(r.status,'HOLD');assert.equal(r.readback.active,true);assert.equal(writes,1)
})
test('persisted unexpected first round is HOLD with actual state attached',async()=>{
  let reads=0
  const f=fixture({competition:async c=>({...c,active:++reads>1,source_policy:null,prvi_fantasy_krog:3})})
  const [r]=await runBatch({candidates:[candidate],transport:f.transport,now,apply:true})
  assert.equal(r.status,'HOLD');assert.equal(r.readback.prvi_fantasy_krog,3)
})

test('opposite per-match goal errors cannot cancel to accept a league; later candidate continues',async()=>{
  const f=fixture();const original=f.transport.matches
  f.transport.matches=async c=>c.slug===candidate.slug?[
    {id:101,zapisnik_id:'report-101',round_id:1,home_goals:2,away_goals:0,imported_at:'2026-10-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]},
    {id:102,zapisnik_id:'report-102',round_id:1,home_goals:0,away_goals:0,imported_at:'2026-10-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]},
    ...(await original()).filter(m=>m.round_id===2),
  ]:original(c)
  const rows=await runBatch({candidates:[candidate,other],transport:f.transport,now,apply:true})
  assert.deepEqual(rows.map(r=>r.status),['HOLD','ACTIVE']);assert.match(rows[0].reason,/101.*102/);assert.equal(rows[0].score_goal_difference,0);assert.deepEqual(rows[0].score_goal_mismatches.map(m=>m.report_id),['report-101','report-102']);assert.deepEqual(f.calls,[other.slug])
})
