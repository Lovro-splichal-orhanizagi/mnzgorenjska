import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import fcf, { vZapisnik, FcfZavrnitev } from './viri/fcf.mjs'
import * as adapter from './viri/fcf-current-fixtures.mjs'
const now = Date.parse('2026-11-18T12:00:00Z')
const c = { id:500, slug:'es-ct-elit', source:'fcf', country_code:'ES', active:true, source_policy:null, sezona_koledarska:false, source_league_code:'4106968-4107207' }
const load = kind => gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107024-${kind}.html.gz`,import.meta.url))).toString()
const url='https://www.fcf.cat/ca/competicio/acta/4107024'
const z=vZapisnik(load('report'),{id:'es4107024',url,redirectHtml:load('redirect')})
const fixture = () => ({id:700,zapisnik_id:'es4107024',source_url:null,imported_at:null,kontumacija:false,played_on:'2026-11-08',home:{id:800,name:'VIC UNIÓ ESPORTIVA CLUB'},away:{id:801,name:'ATLETIC SANT JUST . F. C.'},rounds:{id:900,competition_id:500,season:'2026/27',number:8}})
const record = () => ({id:'es4107024',url,z:structuredClone(z)})
function setup(t, rows=[fixture()], records=new Map([['es4107024',record()]])) {
 const before=process.cwd(),dir=mkdtempSync(join(tmpdir(),'fcf-fixtures-'))
 process.chdir(dir);t.after(()=>{process.chdir(before);rmSync(dir,{recursive:true,force:true})})
 t.mock.method(Date,'now',()=>now)
 t.mock.method(globalThis,'fetch',()=>assert.fail('unexpected network'))
 t.mock.method(console,'warn',()=>{})
 const state={rows:structuredClone(rows),queries:[],reads:[],sourceError:null}
 const get=(r,k)=>k.split('.').reduce((v,p)=>v?.[p],r)
 const db={from(table){assert.equal(table,'matches');const filters=[],q={
  select(){return this},eq(k,v){filters.push(r=>get(r,k)===v);return this},is(k,v){filters.push(r=>get(r,k)===v);return this},
  not(k,op,v){assert.equal(op,'is');filters.push(r=>get(r,k)!==v);return this},gte(k,v){filters.push(r=>get(r,k)>=v);return this},lte(k,v){filters.push(r=>get(r,k)<=v);return this},
  in(k,vs){filters.push(r=>vs.includes(get(r,k)));return this},order(){return this},limit(){return this},range(){return this},
  async then(resolve,reject){state.queries.push(filters);return Promise.resolve({data:structuredClone(state.rows.filter(r=>filters.every(f=>f(r)))),error:null}).then(resolve,reject)},
  async maybeSingle(){state.queries.push(filters);const found=state.rows.filter(r=>filters.every(f=>f(r)));assert.ok(found.length<=1);return {data:structuredClone(found[0]??null),error:null}},
 };return q}}
 const base={...fcf,zapisniki(){assert.fail('full block traversal')},posamezniZapisnik(code,options){assert.equal(options.tekmovanje.source_league_code,code);assert.equal(options.sezona,'2026/27');return async()=>{state.reads.push(options.id);if(state.sourceError)throw state.sourceError;return records.has(options.id)?[structuredClone(records.get(options.id))]:[]}}}
 return {state,db,base,dir,provider:()=>adapter.withFcfCurrentFixtures(base,c,db)}
}

test('known report reads only exact pending fixture and guards native ownership',async t=>{
 const f=setup(t),p=f.provider()
 assert.equal(p.recoveryCaptured,true)
 const out=await p.zapisniki(c.source_league_code,()=>assert.fail('direct source traversal'))
 assert.deepEqual(out.map(r=>r.id),['es4107024']);assert.deepEqual(f.state.reads,['es4107024'])
 assert.equal(await p.assertNativeFixture({id:'es4107024',roundId:900,homeTeamId:800,awayTeamId:801}),true)
 f.state.rows[0].imported_at='2026-11-18T12:01:00Z'
 assert.equal(await p.assertNativeFixture({id:'es4107024',roundId:900,homeTeamId:800,awayTeamId:801}),false)
 assert.deepEqual(await p.zapisniki(c.source_league_code),[]);assert.equal(f.state.reads.length,1)
})
test('completed, old, future, walkover and foreign fixtures cause no source reads',async t=>{
 const row=fixture(), rows=[{...row,imported_at:'2026-11-17'}, {...row,id:701,played_on:'2026-10-01'}, {...row,id:702,played_on:'2026-11-19'}, {...row,id:703,kontumacija:true}, {...row,id:704,rounds:{...row.rounds,competition_id:501}}, {...row,id:705,rounds:{...row.rounds,season:'2025/26'}}]
 const f=setup(t,rows);assert.deepEqual(await f.provider().zapisniki(c.source_league_code),[]);assert.deepEqual(f.state.reads,[])
})
test('unknown report uses bounded current-round candidates and binds before returning',async t=>{
 const f=setup(t,[{...fixture(),zapisnik_id:null}]),p=f.provider()
 assert.deepEqual((await p.zapisniki(c.source_league_code)).map(r=>r.id),['es4107024'])
 assert.ok(f.state.reads.length<=14);assert.equal(new Set(f.state.reads).size,f.state.reads.length)
 assert.ok(f.state.reads.every(id=>Number(id.slice(2))>=4107021&&Number(id.slice(2))<=4107034))
 assert.equal(await p.assertNativeFixture({id:'es4107024',roundId:900,homeTeamId:800,awayTeamId:801}),true)
})
test('retained redirect round hint works without speculative unsupported block arithmetic',async t=>{
 const f=setup(t,[{...fixture(),zapisnik_id:null}]),competition={...c,source_league_code:'4107000-4107100'}
 mkdirSync('scripts/.predpomnilnik/fcf',{recursive:true});writeFileSync('scripts/.predpomnilnik/fcf/acta-4107024.html',load('redirect'))
 const p=adapter.withFcfCurrentFixtures(f.base,competition,f.db)
 assert.deepEqual((await p.zapisniki(competition.source_league_code)).map(r=>r.id),['es4107024']);assert.deepEqual(f.state.reads,['es4107024'])
})
test('unsupported cold block holds unknown report without scanning whole league',async t=>{
 const f=setup(t,[{...fixture(),zapisnik_id:null}]),competition={...c,source_league_code:'4107000-4107100'}
 assert.deepEqual(await adapter.withFcfCurrentFixtures(f.base,competition,f.db).zapisniki(competition.source_league_code),[]);assert.deepEqual(f.state.reads,[])
})
for(const [name,patch]of [['round',{krog:9}],['date',{datum:'2026-11-09'}],['season',{sezona:'2025/26'}],['league',{tekmovanje:'PRIMERA CATALANA'}],['home',{domaci:{...z.domaci,ime:'OTHER CLUB'}}],['incomplete',{nepopoln:true}],['warnings',{opozorila:['unproven']}]] )test(`report ${name} mismatch is held before native writer`,async t=>{
 const r=record();Object.assign(r.z,patch);const f=setup(t,[fixture()],new Map([[r.id,r]]));assert.deepEqual(await f.provider().zapisniki(c.source_league_code),[])
})
test('source refusal stops candidate traversal immediately',async t=>{
 const f=setup(t,[{...fixture(),zapisnik_id:null}]);f.state.sourceError=new FcfZavrnitev('blocked',403)
 await assert.rejects(f.provider().zapisniki(c.source_league_code),/blocked/);assert.equal(f.state.reads.length,1)
})
test('source candidate budget never exceeds 100 unique reports',async t=>{
 const rows=Array.from({length:110},(_,i)=>({...fixture(),id:700+i,zapisnik_id:`es${4106968+i}`,home:{id:800+i,name:`Home ${i}`},away:{id:1000+i,name:`Away ${i}`}}))
 const f=setup(t,rows,new Map());assert.deepEqual(await f.provider().zapisniki(c.source_league_code),[]);assert.equal(f.state.reads.length,100);assert.equal(new Set(f.state.reads).size,100)
})
for(const patch of [{active:false},{country_code:'GR'},{source_policy:'historical'},{source:'eps'}])test(`inactive/foreign/historical scope is rejected: ${JSON.stringify(patch)}`,t=>{
 const f=setup(t);assert.throws(()=>adapter.withFcfCurrentFixtures(f.base,{...c,...patch},f.db))
})
test('native guard cannot create or relabel missing, moved, completed or independently owned fixtures',async t=>{
 const f=setup(t),p=f.provider();await p.zapisniki(c.source_league_code)
 const scope={id:'es4107024',roundId:900,homeTeamId:800,awayTeamId:801}
 for(const patch of [{id:701},{zapisnik_id:'es4107025'},{home:{id:802,name:fixture().home.name}},{rounds:{...fixture().rounds,id:901}}]){
  f.state.rows=[{...fixture(),...patch}];await assert.rejects(p.assertNativeFixture(scope))
 }
 f.state.rows=[];await assert.rejects(p.assertNativeFixture(scope))
 f.state.rows=[fixture()];await assert.rejects(p.assertNativeFixture({...scope,roundId:901}))
 await assert.rejects(p.assertNativeFixture({...scope,id:'es4107025'}))
})

test('another fixture owning a discovered numeric report blocks admission',async t=>{
 const target={...fixture(),zapisnik_id:null},owner={...fixture(),id:999,imported_at:'2026-11-17',rounds:{...fixture().rounds,competition_id:501}}
 const f=setup(t,[target,owner])
 await assert.rejects(f.provider().zapisniki(c.source_league_code),/owned by another fixture/)
})
test('completion racing the source read skips the fixture before yielding it',async t=>{
 const f=setup(t),base={...f.base,posamezniZapisnik(){return async()=>{f.state.rows[0].imported_at='2026-11-18T12:01:00Z';return [record()]}}}
 assert.deepEqual(await adapter.withFcfCurrentFixtures(base,c,f.db).zapisniki(c.source_league_code),[])
})
test('candidate findings cannot change the registered league code',async t=>{
 const f=setup(t)
 await assert.rejects(f.provider().zapisniki('4107000-4107200'),/league code changed/)
 assert.deepEqual(f.state.reads,[])
})
test('duplicate fixture tuples cannot ambiguously admit one discovered report',async t=>{
 const a={...fixture(),zapisnik_id:null},b={...fixture(),id:701,zapisnik_id:null}
 const f=setup(t,[a,b]);assert.deepEqual(await f.provider().zapisniki(c.source_league_code),[])
})

for(const count of [238,239,241])test(`nearby observed block length ${count} discovers only bounded exact fixture reports`,async t=>{
 const f=setup(t,[{...fixture(),zapisnik_id:null}]),competition={...c,source_league_code:`4106968-${4106968+count-1}`}
 const p=adapter.withFcfCurrentFixtures(f.base,competition,f.db)
 assert.deepEqual((await p.zapisniki(competition.source_league_code)).map(r=>r.id),['es4107024'])
 assert.ok(f.state.reads.length<=14)
 assert.ok(f.state.reads.every(id=>Number(id.slice(2))>=4107021&&Number(id.slice(2))<=4107034))
 assert.equal(await p.assertNativeFixture({id:'es4107024',roundId:900,homeTeamId:800,awayTeamId:801}),true)
})
