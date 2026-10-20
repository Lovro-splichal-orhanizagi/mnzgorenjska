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
const calendarCentral={id:983,slug:'gb-sfl-d1-central',source:'isthmian',source_league_code:'sfl/69d0be24b616bafb97331d42/2026-27'}
const calendarSouth={id:984,slug:'gb-sfl-d1-south',source:'isthmian',source_league_code:'sfl/69d0bdf9b616bafb97331d41/2026-27'}
const calendarNplEast={id:981,slug:'gb-npl-east',source:'isthmian',source_league_code:'npl/67d7c7bb74247876e6dae40b/2026-27'}
const calendarSouthCentral={id:976,slug:'gb-isthmian-south-central',source:'isthmian',source_league_code:'isthmian/67d7d11a749090308acc1022/2026-27'}
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
    [488,'ro-sb-superliga','judetean/sibiu/fotbal/2026-2027/superliga/sezon-regular/serie-1'],
    [502,"ro-ab-l4-s1","judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-1"],
    [501,"ro-ab-l4-s2","judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2"],
    [500,"ro-ab-l5-s1","judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-1"],
    [499,"ro-ab-l5-s2","judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2"],
    [506,"ro-cj-l5-dej","judetean/cluj/fotbal/2026-2027/liga-5-dej/sezon-regular/grupa-a"],
    [509,"ro-cj-l5-g1","judetean/cluj/fotbal/2026-2027/liga-5-cluj---grupa-1/sezon-regular/grupa-1"],
    [508,"ro-cj-l5-g2","judetean/cluj/fotbal/2026-2027/liga-5-cluj---grupa-2/sezon-regular/grupa-2"],
    [507,"ro-cj-l5-gherla","judetean/cluj/fotbal/2026-2027/liga-5-gherla/sezon-regular/grupa-a"],
    [511,"ro-hd-l5","judetean/hunedoara/fotbal/2026-2027/liga-5/campionat/serie-1"]]
  assert.deepEqual(hlf.map(c=>[c.id,c.slug,c.source_league_code]),expected)
  assert.equal(validateSelection(registry,hlf.map(c=>c.slug)).length,21)
  assert.throws(()=>validateSelection(registry,['ro-liga3-s1']))
  assert.equal(registry.source_contracts.hlf.document,'docs/viri/romunija.md')
})
test('Danish third division registration binds the reviewed production tuple',()=>{
  const dk=validateSelection(registry,['dk-3-division'])
  assert.deepEqual(dk,[{id:1051,slug:'dk-3-division',source:'dbu',source_league_code:'508657'}])
})
test('English Streamline candidates bind all reviewed tuples and reject unknown leagues',()=>{
  const expected=[
    [977,'gb-isthmian-north','isthmian','isthmian/67d7d0c1749090308acc1021/2026-27'],
    [978,'gb-isthmian-premier','isthmian','isthmian/67d7d01f749090308acc101e/2026-27'],
    [976,'gb-isthmian-south-central','isthmian','isthmian/67d7d11a749090308acc1022/2026-27'],
    [975,'gb-isthmian-south-east','isthmian','isthmian/67d7d187749090308acc1023/2026-27'],
    [981,'gb-npl-east','isthmian','npl/67d7c7bb74247876e6dae40b/2026-27'],
    [979,'gb-npl-midlands','isthmian','npl/67d7c7bb74247876e6dae40c/2026-27'],
    [982,'gb-npl-premier','isthmian','npl/67d7c7bb74247876e6dae40a/2026-27'],
    [980,'gb-npl-west','isthmian','npl/67d7c7bb74247876e6dae40d/2026-27'],
    [983,'gb-sfl-d1-central','isthmian','sfl/69d0be24b616bafb97331d42/2026-27'],
    [984,'gb-sfl-d1-south','isthmian','sfl/69d0bdf9b616bafb97331d41/2026-27'],
    [985,'gb-sfl-premier-central','isthmian','sfl/69d0bdbab616bafb97331d40/2026-27'],
    [986,'gb-sfl-premier-south','isthmian','sfl/69d0bd99b616bafb97331d3f/2026-27'],
  ]
  const selected=validateSelection(registry,expected.map(([,slug])=>slug))
  assert.deepEqual(selected.map(({id,slug,source,source_league_code})=>[id,slug,source,source_league_code]),expected)
  assert.equal(registry.candidates.filter(c=>c.source==='isthmian').length,12)
  assert.equal(registry.source_contracts.isthmian.document,'docs/viri/anglija.md')
  assert.throws(()=>validateSelection(registry,['gb-isthmian-unknown']))
})
test('Lowland registrations bind both reviewed production tuples and reject unknown leagues',()=>{
  const expected=[
    {id:898,slug:'gb-lowland-west',source:'lowland',source_league_code:'slfl/2026-2027/54193424'},
    {id:897,slug:'gb-lowland-east',source:'lowland',source_league_code:'slfl/2026-2027/54193157'},
  ]
  const lowland=validateSelection(registry,['gb-lowland-west','gb-lowland-east'])
  assert.deepEqual(lowland,[expected[1],expected[0]])
  assert.deepEqual(registry.candidates.filter(c=>c.source==='lowland'),expected)
  assert.equal(registry.source_contracts.lowland.document,'docs/viri/skotska.md')
  assert.throws(()=>validateSelection(registry,['gb-lowland-unknown']))
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
test('SFL D1 calendar exception selects first clean official Match N with exact tuple only',async()=>{
  for(const [candidate,advanced,expected] of [[calendarCentral,[31,22,28],14],[calendarSouth,[31,36,40,22],15]]) {
    const playedNumbers=[...advanced,...(expected===15?[14]:[])]
    const rounds=Array.from(new Set([1,2,14,15,...playedNumbers])).sort((a,b)=>a-b).map(n=>({id:n,number:n,season:'2026/27',played_on:`2026-10-${String(n===14&&expected===15?10:n===14?24:n===15?27:10).padStart(2,'0')}`,deadline_at:n===14?(expected===14?'2026-10-24T10:00:00Z':'2026-10-10T10:00:00Z'):n===15?'2026-10-27T10:00:00Z':`2026-09-${String(n%28+1).padStart(2,'0')}T10:00:00Z`,lineups_locked_at:null}))
    const f=fixture({competition:async()=>({...candidate,active:false,source_policy:null,date_only_deadline_policy:null}),fantasyData:async()=>({teams:[],lineups:[]}),rounds:async()=>rounds,matches:async()=>[...playedNumbers.map((n,i)=>({id:100+i,round_id:n,home_goals:1,away_goals:0,imported_at:'2026-09-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]})),{id:999,round_id:expected,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}]})
    const [result]=await runBatch({candidates:[candidate],transport:f.transport,now})
    assert.equal(result.status,'READY',result.reason);assert.equal(result.first_round.number,expected)
  }
  for(const altered of [{...calendarCentral,source_league_code:'sfl/wrong'},{...calendarCentral,source:'dbu'},{...calendarCentral,slug:'gb-other'}]) {
    const rounds=Array.from({length:41},(_,i)=>({id:i+1,number:i+1,season:'2026/27',played_on:'2026-10-24',deadline_at:[14,32].includes(i+1)?'2026-10-24T10:00:00Z':i+1===41?'2026-10-27T10:00:00Z':'2026-09-10T10:00:00Z',lineups_locked_at:null}))
    const f=fixture({competition:async()=>({...altered,active:false,source_policy:null,date_only_deadline_policy:null}),rounds:async()=>rounds,matches:async()=>[...rounds.filter(r=>[1,2,22,28,31].includes(r.number)).map(r=>({id:r.id,round_id:r.id,home_goals:1,away_goals:0,imported_at:'2026-09-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]})),... [14,32].map(n=>({id:999+n,round_id:n,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}))]})
    const [result]=await runBatch({candidates:[altered],transport:f.transport,now});assert.equal(result.status,'READY');assert.equal(result.first_round.number,32)
  }
})
test('NPL East exact tuple selects clean Match 16 while mismatches retain legacy Match 29',async()=>{
  const rounds=[16,17,22,23,29].map(number=>({id:number,number,season:'2026/27',played_on:number===16?'2026-10-24':number===29?'2027-01-23':'2026-10-10',deadline_at:[16,29].includes(number)?(number===16?'2026-10-24T10:00:00Z':'2027-01-23T10:00:00Z'):'2026-10-10T10:00:00Z',lineups_locked_at:null}))
  const matches=[17,22,23].map((number,index)=>({id:100+index,round_id:number,home_goals:1,away_goals:0,imported_at:'2026-10-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]}))
  for(const candidate of [calendarNplEast,{...calendarNplEast,source_league_code:'npl/wrong'},{...calendarNplEast,source:'dbu'},{...calendarNplEast,slug:'gb-other'}]) {
    const f=fixture({competition:async()=>({...candidate,active:false,source_policy:null,date_only_deadline_policy:null}),rounds:async()=>rounds,matches:async()=>[...matches,...[16,29].map((number,index)=>({id:200+index,round_id:number,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}))],fantasyData:async()=>({teams:[],lineups:[]})})
    const [result]=await runBatch({candidates:[candidate],transport:f.transport,now})
    assert.equal(result.status,'READY',result.reason)
    assert.equal(result.first_round.number,candidate.slug==='gb-npl-east'&&candidate.source==='isthmian'&&candidate.source_league_code===calendarNplEast.source_league_code?16:29,candidate.slug)
  }
})
test('NPL East calendar exception requires clean fantasy state and safe first-round evidence',async()=>{
  const rounds=[16,17,22,23,29].map(number=>({id:number,number,season:'2026/27',played_on:number===16?'2026-10-24':number===29?'2027-01-23':'2026-10-10',deadline_at:[16,29].includes(number)?(number===16?'2026-10-24T10:00:00Z':'2027-01-23T10:00:00Z'):'2026-10-10T10:00:00Z',lineups_locked_at:null}))
  const matches=[17,22,23].map((number,index)=>({id:100+index,round_id:number,home_goals:1,away_goals:0,imported_at:'2026-10-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]}))
  const cleanFixtures=[16,29].map((number,index)=>({id:200+index,round_id:number,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}))
  for(const patch of [
    {fantasyData:undefined},
    {fantasyData:async()=>({teams:[{id:1}],lineups:[]})},
    {fantasyData:async()=>({teams:[],lineups:[{round_id:16}]})},
    {rounds:async()=>rounds.map(r=>r.number===22?{...r,deadline_at:'2026-10-25T10:00:00Z'}:r)},
    {rounds:async()=>rounds.map(r=>r.number===22?{...r,deadline_at:null}:r)},
    {rounds:async()=>rounds.map(r=>r.number===16?{...r,lineups_locked_at:'2026-10-17T00:00:00Z'}:r)},
    {matches:async()=>[...matches,...cleanFixtures.filter(m=>m.round_id!==16)]},
    {matches:async()=>[...matches,...cleanFixtures.map(m=>m.id===200?{...m,home_goals:1}:m)]},
    {matches:async()=>[...matches,...cleanFixtures.map(m=>m.id===200?{...m,imported_at:'2026-10-10'}:m)]},
  ]) {
    const f=fixture({competition:async()=>({...calendarNplEast,active:false,source_policy:null,date_only_deadline_policy:null}),rounds:async()=>rounds,matches:async()=>[...matches,...cleanFixtures],fantasyData:async()=>({teams:[],lineups:[]}),...patch})
    const [result]=await runBatch({candidates:[calendarNplEast],transport:f.transport,now})
    assert.equal(result.status,'HOLD',result.reason)
  }
})
test('Isthmian South Central exact tuple selects clean Match 15 while mismatches retain legacy Match 39',async()=>{
  const rounds=[15,16,30,38,39].map(number=>({id:number,number,season:'2026/27',played_on:number===15?'2026-10-24':number===39?'2027-03-29':'2026-10-10',deadline_at:[15,39].includes(number)?(number===15?'2026-10-24T10:00:00Z':'2027-03-29T10:00:00Z'):'2026-10-10T10:00:00Z',lineups_locked_at:null}))
  const matches=[16,30,38].map((number,index)=>({id:300+index,round_id:number,home_goals:1,away_goals:0,imported_at:'2026-10-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]}))
  for(const candidate of [calendarSouthCentral,{...calendarSouthCentral,source_league_code:'isthmian/wrong'},{...calendarSouthCentral,source:'dbu'},{...calendarSouthCentral,slug:'gb-other'}]) {
    const f=fixture({competition:async()=>({...candidate,active:false,source_policy:null,date_only_deadline_policy:null}),rounds:async()=>rounds,matches:async()=>[...matches,...[15,39].map((number,index)=>({id:400+index,round_id:number,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}))],fantasyData:async()=>({teams:[],lineups:[]})})
    const [result]=await runBatch({candidates:[candidate],transport:f.transport,now})
    assert.equal(result.status,'READY',result.reason)
    assert.equal(result.first_round.number,candidate.slug==='gb-isthmian-south-central'&&candidate.source==='isthmian'&&candidate.source_league_code===calendarSouthCentral.source_league_code?15:39,candidate.slug)
  }
})
test('SFL D1 preview holds teams, lineups, missing fantasy read, and invalid/future higher deadlines',async()=>{
  const calendarOnly=deadline=>({rounds:async()=>[{id:1,number:1,season:'2026/27',deadline_at:'2026-09-10T10:00:00Z'},{id:14,number:14,season:'2026/27',deadline_at:'2026-10-24T10:00:00Z'},{id:31,number:31,season:'2026/27',deadline_at:deadline}],matches:async()=>[{id:31,round_id:31,home_goals:1,away_goals:0,imported_at:'2026-09-10',kontumacija:false,goals:[{count:1}],appearances:[{count:22}]},{id:14,round_id:14,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}]})
  for(const patch of [{fantasyData:async()=>({teams:[{id:1}],lineups:[]})},{fantasyData:async()=>({teams:[],lineups:[{round_id:14}]})},{fantasyData:undefined},{...calendarOnly('2026-10-25T10:00:00Z')},{...calendarOnly(null)}]) {
    const f=fixture({competition:async()=>({...calendarCentral,active:false,source_policy:null,date_only_deadline_policy:null}),fantasyData:async()=>({teams:[],lineups:[]}),...patch});const [result]=await runBatch({candidates:[calendarCentral],transport:f.transport,now});assert.equal(result.status,'HOLD')
  }
})
test('SFL D1 preview rejects unknown or nonzero opening scores like the native RPC',async()=>{
  for(const candidate of [calendarCentral,calendarSouth])for(const scores of [[null,0],[0,null],[-1,0],[0,-1]]) {
    const f=fixture({fantasyData:async()=>({teams:[],lineups:[]})});const original=f.transport.matches
    f.transport.matches=async()=> (await original()).map(m=>m.id===12?{...m,home_goals:scores[0],away_goals:scores[1]}:m)
    const [r]=await runBatch({candidates:[candidate],transport:f.transport,now})
    assert.equal(r.status,'HOLD',`${candidate.slug}: ${JSON.stringify(scores)}`)
    assert.match(r.reason,/First future round/)
  }
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

test('SFL fantasy preview transport selects valid read-only lineup columns',async()=>{
  const requests=[];const transport=createTransport({url:'https://db.example',key:'test',fetch:async(url,options)=>{requests.push({url:String(url),options});return new Response('[]',{status:200})}})
  await transport.fantasyData(calendarCentral)
  assert.equal(requests.length,2);assert.ok(requests.every(r=>r.options.method==='GET'))
  assert.match(new URL(requests[1].url).searchParams.get('select'),/round_id,rounds!inner\(competition_id\)/)
  assert.doesNotMatch(requests[1].url,/select=id/)
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
test('Montenegro and Malta candidates bind only reviewed tuples with public-source contracts',()=>{
  const expected=[
    {id:967,slug:'me-1-cfl',source:'fscg',source_league_code:'fscg/meridianbet-1-cfl/9278739'},
    {id:966,slug:'me-2-cfl',source:'fscg',source_league_code:'fscg/druga-liga/9279699'},
    {id:972,slug:'mt-challenge',source:'mfa',source_league_code:'2601248/2027'},
    {id:971,slug:'mt-premier',source:'mfa',source_league_code:'58539/2027'},
  ]
  const selected=validateSelection(registry,expected.map(c=>c.slug))
  assert.deepEqual(selected,expected)
  assert.deepEqual(registry.candidates.filter(c=>['fscg','mfa'].includes(c.source)),[expected[0],expected[1],expected[3],expected[2]])
  assert.equal(registry.source_contracts.fscg.document,'docs/viri/litva-crna-gora.md')
  assert.match(registry.source_contracts.fscg.permission,/no explicit permission/i)
  assert.equal(registry.source_contracts.mfa.document,'docs/viri/malta.md')
  assert.match(registry.source_contracts.mfa.permission,/no explicit (?:MFA )?permission/i)
  assert.match(registry.source_contracts.mfa.permission,/stop/i)
  for(const slug of ['me-3-liga-centar','me-3-liga-sjever','me-3-liga-jug','mt-nl1','mt-nl2','me-unknown','mt-unknown'])
    assert.throws(()=>validateSelection(registry,[slug]))
})
