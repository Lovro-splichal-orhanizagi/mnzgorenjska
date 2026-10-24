import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawnSync} from 'node:child_process'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArguments,assertExecution,loadRegistry,createReadOnlyTransport,runCountryPreview} from './country-league-preview.mjs'

const sha='a'.repeat(40)
const now=()=>new Date('2026-10-24T12:00:00Z')
const candidate=(id,slug=`pl-candidate-${id}`)=>({id,slug,source:'pzpn',source_league_code:`official-${id}`})
const registry=candidates=>({version:1,source_contracts:{pzpn:{document:'docs/viri/poljska.md',permission:'Existing reviewed public route.'}},candidates})
const row=c=>({...c,active:false,source_policy:null,date_only_deadline_policy:null,countries:{code:'PL'}})
function input(candidates,rows=candidates.map(row),patch={}) {
 return {country:'PL',limit:5,offset:0,expectedSha:sha,registry:registry(candidates),now,
  inventory:async({offset,limit,country})=>{assert.equal(country,'PL');return rows.slice(offset,offset+limit)},
  transport:{},previewRunner:async({candidates,apply,transport})=>{
   assert.equal(apply,false);assert.equal(transport.activate,undefined)
   return candidates.map(c=>({slug:c.slug,status:'READY',checked_at:now().toISOString(),first_round:{number:7}}))
  },...patch}
}

test('whole inventory is paginated before at most five eligible candidates are selected deterministically',async()=>{
 // Reading only the first page would incorrectly miss reviewed candidates after 500 unreviewed rows.
 const candidates=[candidate(510),candidate(509),candidate(508),candidate(507),candidate(506),candidate(505),candidate(504)]
 const rows=Array.from({length:510},(_,i)=>row(candidate(i+1)))
 const report=await runCountryPreview(input(candidates,rows))
 assert.deepEqual(report.selected.map(c=>c.id),[504,505,506,507,508])
 assert.deepEqual(report.pagination.pages.map(p=>[p.offset,p.count]),[[0,500],[500,10]])
 assert.equal(report.pagination.complete,true)
 assert.equal(report.pagination.inventory_count,510)
 assert.equal(report.catalog_scope,'REVIEWED_GENERIC_CANDIDATES_ONLY')
 assert.equal(report.autoActivationAllowed,false)
 assert.equal(report.inventory_capture_started_at,'2026-10-24T12:00:00.000Z')
 assert.equal(report.inventory_capture_completed_at,'2026-10-24T12:00:00.000Z')
 assert.equal(report.source_freshness,'NOT_CHECKED')
 assert.match(report.registry_sha256,/^[a-f0-9]{64}$/)
 assert.match(report.plan_sha256,/^[a-f0-9]{64}$/)
 const second=await runCountryPreview(input(candidates,rows,{offset:5}))
 assert.deepEqual(second.selected.map(c=>c.id),[509,510])
 assert.notEqual(second.plan_sha256,report.plan_sha256)
})

test('exact reviewed tuples and actual country metadata determine selection, never arbitrary inactive inventory',async()=>{
 const candidates=Array.from({length:7},(_,i)=>candidate(i+1))
 const rows=candidates.map(row)
 rows[0].active=true
 rows[1].source_policy='bespoke'
 rows[2].date_only_deadline_policy='custom'
 rows[3].source_league_code='changed'
 rows[4].countries.code='DE'
 rows[5].countries=null
 rows.push(row(candidate(99)))
 const report=await runCountryPreview(input(candidates,rows))
 assert.deepEqual(report.selected.map(c=>c.id),[7])
 assert.deepEqual(report.skipped.map(s=>s.reason_code),['ALREADY_ACTIVE','CUSTOM_SOURCE_POLICY','CUSTOM_DEADLINE_POLICY','TUPLE_DRIFT','COUNTRY_MISMATCH','INVALID_COUNTRY_METADATA'])
 assert.equal(report.results[0].activationEligible,false)
})

test('missing candidates, malformed state and malformed tuple metadata never reach preview',async()=>{
 const candidates=[candidate(1),candidate(2),candidate(3)]
 const rows=[{...row(candidates[0]),active:null},{...row(candidates[1]),source:null}]
 const report=await runCountryPreview(input(candidates,rows))
 assert.deepEqual(report.selected,[])
 assert.deepEqual(report.skipped.map(s=>s.reason_code),['INVALID_ACTIVE_METADATA','TUPLE_DRIFT','MISSING_INVENTORY_CANDIDATE'])
})

test('duplicate registry identities and duplicate database rows fail closed and record infrastructure failure',async()=>{
 for(const setup of [input([candidate(1),candidate(1)]),input([candidate(1)],[row(candidate(1)),row(candidate(1))])]) {
  const report=await runCountryPreview(setup)
  assert.equal(report.status,'INFRASTRUCTURE_ERROR')
  assert.deepEqual(report.results,[])
  assert.equal(report.autoActivationAllowed,false)
 }
})

test('mixed-country registry never expands to another country or unsupported generic route',async()=>{
 const report=await runCountryPreview(input([candidate(1),candidate(2,'de-other')]))
 assert.deepEqual(report.selected.map(c=>c.slug),['pl-candidate-1'])
 const unsupported=await runCountryPreview(input([{...candidate(3),source:'fussball-public'}]))
 assert.equal(unsupported.skipped[0].reason_code,'OUTSIDE_GENERIC_SCOPE')
 assert.deepEqual(unsupported.selected,[])
})

test('one football-data HOLD preserves the following provisional READY and child scope',async()=>{
 const candidates=[candidate(1),candidate(2)]
 const report=await runCountryPreview(input(candidates,undefined,{previewRunner:async({candidates,apply})=>{
  assert.equal(apply,false)
  return [{slug:candidates[0].slug,status:candidates[0].id===1?'HOLD':'READY',reason:'Missing goalkeeper'}]
 }}))
 assert.deepEqual(report.results.map(r=>r.status),['HOLD','PROVISIONAL_READY'])
 assert.equal(report.results[0].reason_code,'CHILD_HOLD')
 assert.equal(report.results[1].reason_code,'NEEDS_STRICT_SOURCE_AUDIT')
 assert.equal(report.results[1].child_result.status,'READY')
 assert.equal(report.results[1].activationEligible,false)
 assert.equal(report.children.length,2)
 assert.equal(report.children[0].scope.sha,sha)
 assert.match(report.children[0].scope.approval_sha256,/^[a-f0-9]{64}$/)
 assert.equal(report.children[0].scope.mode,'preview')
})

test('infrastructure or malformed child response stops remaining children and checkpoints partial results',async()=>{
 const checkpoints=[]
 const report=await runCountryPreview(input([candidate(1),candidate(2),candidate(3)],undefined,{
  onCheckpoint:r=>checkpoints.push(structuredClone(r)),
  previewRunner:async({candidates})=>{if(candidates[0].id===2)throw Error('Authentication unavailable');return [{slug:candidates[0].slug,status:'READY'}]}
 }))
 assert.equal(report.status,'INFRASTRUCTURE_ERROR')
 assert.deepEqual(report.results.map(r=>r.slug),['pl-candidate-1','pl-candidate-2'])
 assert.equal(report.results[1].reason_code,'INFRASTRUCTURE_ERROR')
 assert.deepEqual(report.not_processed,['pl-candidate-3'])
 assert.equal(checkpoints.at(-1).status,'INFRASTRUCTURE_ERROR')
 const malformed=await runCountryPreview(input([candidate(1)],undefined,{previewRunner:async()=>[{slug:'pl-unreviewed',status:'READY'}]}))
 assert.equal(malformed.status,'INFRASTRUCTURE_ERROR')
})

test('inventory auth failure and pagination exhaustion leave durable failure evidence without preview',async()=>{
 let invoked=false
 const failed=await runCountryPreview(input([candidate(1)],undefined,{inventory:async()=>{throw Error('HTTP 401')},previewRunner:async()=>{invoked=true}}))
 assert.equal(failed.status,'INFRASTRUCTURE_ERROR');assert.equal(invoked,false)
 const exhausted=await runCountryPreview(input([candidate(1)],undefined,{inventory:async({offset,limit})=>Array.from({length:limit},(_,i)=>row(candidate(offset+i+1)))}))
 assert.equal(exhausted.status,'INFRASTRUCTURE_ERROR')
 assert.equal(exhausted.pagination.complete,false)
 assert.match(exhausted.infrastructure_error,/bound/i)
})

test('empty DE generic catalog is durable and honest without an inventory request or child call',async()=>{
 const report=await runCountryPreview(input([candidate(1)],undefined,{country:'DE',inventory:async()=>{throw Error('must not read')},previewRunner:async()=>{throw Error('must not run')}}))
 assert.equal(report.status,'NO_GENERIC_CATALOG')
 assert.equal(report.reason_code,'FUSSBALL_CAPTURE_REQUIRED')
 assert.equal(report.guidance,'fussball-capture-required')
 assert.deepEqual(report.selected,[])
 assert.equal(report.source_freshness,'NOT_CHECKED')
 assert.equal(report.autoActivationAllowed,false)
})

test('valid CLI bounds and duplicate/unknown mutation flags fail before side effects',()=>{
 assert.deepEqual(parseArguments(['--country','PL','--expected-sha',sha]),{country:'PL',expectedSha:sha,limit:5,offset:0,output:'release/country-preview'})
 assert.equal(parseArguments(['--country','HU','--expected-sha',sha,'--limit','1','--offset','10000']).offset,10000)
 for(const country of ['pl','USA',''])assert.throws(()=>parseArguments(['--country',country,'--expected-sha',sha]))
 assert.throws(()=>parseArguments([]))
 for(const args of [['--limit','0'],['--limit','6'],['--limit','1.5'],['--offset','-1'],['--offset','10001'],['--apply','true'],['--refresh','true'],['--country','HU']])
  assert.throws(()=>parseArguments(['--country','PL','--expected-sha',sha,...args]))
 assert.throws(()=>parseArguments(['--country','PL','--expected-sha','a'.repeat(39)]))
})

test('exact Actions main execution is required before credentialed transport is used',()=>{
 const env={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_RUN_ID:'123'}
 assert.doesNotThrow(()=>assertExecution({expectedSha:sha,headSha:sha,env}))
 for(const patch of [{GITHUB_ACTIONS:'false'},{GITHUB_REF:'refs/heads/other'},{GITHUB_SHA:'b'.repeat(40)},{GITHUB_REPOSITORY:'other/repository'},{GITHUB_RUN_ID:''}])
  assert.throws(()=>assertExecution({expectedSha:sha,headSha:sha,env:{...env,...patch}}))
 assert.throws(()=>assertExecution({expectedSha:sha,headSha:'b'.repeat(40),env}))
})

test('read-only network boundary permits database reads, rejects source access and mutation RPCs',async()=>{
 const seen=[]
 const transport=createReadOnlyTransport({url:'https://database.example',key:'test-key',fetch:async(url,options)=>{
  seen.push([String(url),options.method]);return {ok:true,json:async()=>[]}
 }})
 await transport.inventory({country:'PL',offset:500,limit:500})
 await transport.competition(candidate(1)).catch(()=>{})
 await transport.state(candidate(1))
 await transport.season(candidate(1))
 assert.equal(transport.activate,undefined)
 assert.deepEqual(seen.map(x=>x[1]),['GET','GET','POST','POST'])
 assert.ok(seen.every(([url])=>url.startsWith('https://database.example/rest/v1/')))
 const query=new URL(seen[0][0]).searchParams
 assert.equal(query.get('countries.code'),'eq.PL')
 assert.equal(query.get('offset'),'500')
 assert.equal(query.get('order'),'id')
 assert.throws(()=>createReadOnlyTransport({url:'https://database.example/path',key:'test-key'}))
})

test('registry resolution is independent of process working directory',()=>{
 const moduleURL=new URL('./country-league-preview.mjs',import.meta.url).href
 const output=execFileSync(process.execPath,['--input-type=module','-e',`import {loadRegistry} from ${JSON.stringify(moduleURL)};let x=loadRegistry();console.log(x.registry.candidates.length,x.registrySha256.length)`],{cwd:'/tmp',encoding:'utf8'})
 assert.match(output,/^[1-9]\d* 64\s*$/)
 assert.ok(loadRegistry().registry.candidates.length>0)
})

test('real preview API sees only read-only database transport and never promotes generic READY',async()=>{
 const c=candidate(1),requests=[]
 const players=Array.from({length:6},(_,club)=>['GK','DEF','DEF','MID','FWD'].map((position,p)=>({id:club*5+p,team_id:club+1,position,value:4}))).flat()
 const transport=createReadOnlyTransport({url:'https://database.example',key:'test-only',fetch:async(url,options)=>{
  requests.push([new URL(url).pathname,options.method])
  const path=new URL(url).pathname
  const body=path.endsWith('/competitions')?[row(c)]:path.endsWith('/stanje_lige')?{aktivnih:30,privzetih:0,klubov:6,najvisja_cena:12,po_pozicijah:{},nastopov_s_klopi:2,golov_brez_nastopa:0,krogov_tekoce:2,igralci:players}:
   path.endsWith('/sezona_lige')?'2026/27':path.endsWith('/rounds')?[
    {id:1,number:1,season:'2026/27',deadline_at:'2026-10-10T10:00:00Z'},
    {id:2,number:2,season:'2026/27',played_on:'2026-10-31',deadline_at:'2026-10-31T10:00:00Z',lineups_locked_at:null}]:path.endsWith('/matches')?[
    {id:11,round_id:1,home_goals:1,away_goals:0,imported_at:'2026-10-10T12:00:00Z',kontumacija:false,statistics_status:'complete',goals:[{count:1}],appearances:[{count:22}]},
    {id:12,round_id:2,home_goals:0,away_goals:0,imported_at:null,kontumacija:false,goals:[{count:0}],appearances:[{count:0}]}]:assert.fail(`Unexpected read ${path}`)
  return {ok:true,json:async()=>body}
 }})
 const report=await runCountryPreview({country:'PL',expectedSha:sha,registry:registry([c]),now,inventory:transport.inventory,transport})
 assert.equal(report.results[0].status,'PROVISIONAL_READY')
 assert.equal(report.results[0].child_result.status,'READY')
 assert.equal(report.results[0].activationEligible,false)
 assert.deepEqual(requests,[['/rest/v1/competitions','GET'],['/rest/v1/competitions','GET'],['/rest/v1/rpc/stanje_lige','POST'],['/rest/v1/rpc/sezona_lige','POST'],['/rest/v1/rounds','GET'],['/rest/v1/matches','GET']])
})

test('real preview transport auth failure stops despite inherited per-league catch and preserves returned child HOLD',async()=>{
 const candidates=[candidate(1),candidate(2)]
 const transport=createReadOnlyTransport({url:'https://database.example',key:'test-only',fetch:async()=>({ok:false,status:401})})
 const report=await runCountryPreview({...input(candidates),previewRunner:undefined,transport})
 assert.equal(report.status,'INFRASTRUCTURE_ERROR')
 assert.deepEqual(report.not_processed,['pl-candidate-2'])
 assert.equal(report.children[0].results[0].status,'HOLD')
 assert.equal(report.results[0].reason_code,'INFRASTRUCTURE_ERROR')
})

test('CLI records exact-main execution guard failure without network or credentials',()=>{
 const directory=mkdtempSync(join(tmpdir(),'country-preview-test-'))
 try {
  const script=fileURLToPath(new URL('./country-league-preview.mjs',import.meta.url))
  const head=execFileSync('git',['-C',fileURLToPath(new URL('..',import.meta.url)),'rev-parse','HEAD'],{encoding:'utf8'}).trim()
  const child=spawnSync(process.execPath,[script,'--country','PL','--expected-sha',head,'--output',directory],{cwd:'/tmp',env:{PATH:process.env.PATH,GITHUB_ACTIONS:'false'},encoding:'utf8'})
  assert.equal(child.status,1)
  const failure=JSON.parse(readFileSync(join(directory,'failure.json'),'utf8'))
  assert.equal(failure.status,'INFRASTRUCTURE_ERROR')
  assert.equal(failure.country,'PL')
  assert.equal(failure.autoActivationAllowed,false)
 } finally {rmSync(directory,{recursive:true,force:true})}
})
