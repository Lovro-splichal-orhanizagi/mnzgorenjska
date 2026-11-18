import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { vZapisnik } from './viri/hns.mjs'

const path = new URL('./hns-recurring-manifest.mjs', import.meta.url)
const competitions = Array.from({length:139},(_,i)=>({id:i+1,slug:`hr-test-${i+1}`,active:true,source:'hns',source_league_code:String(1000+i),source_policy:null,countries:{code:'HR'}}))
const opts={competitions,matches:[],now:'2026-11-18T00:15:00Z'}
async function build(options=opts) {
  assert.ok(existsSync(path),'recurring manifest builder must exist')
  return (await import(path)).buildRecurringManifest(options)
}
test('daily window uses fourteen UTC calendar days, expires in 24 hours, and retains only imported current-season matches',async()=>{
  const match={zapisnik_id:'42',imported_at:'2026-11-17T12:00:00Z',played_on:'2026-11-17',rounds:{competition_id:1,season:'2026/27'}}
  const m=await build({...opts,matches:[match,match,{...match,zapisnik_id:'43',imported_at:null},{...match,zapisnik_id:'44',rounds:{competition_id:1,season:'2025/26'}},{...match,zapisnik_id:'45',played_on:'2026-11-04'}]})
  assert.equal(m.schema,2);assert.equal(m.mode,'recurring');assert.equal(m.source,'hns');assert.equal(m.season,'2026/27')
  assert.equal(m.fromDate,'2026-11-05');assert.equal(m.toDate,'2026-11-18')
  assert.equal(m.expiresAt,'2026-11-19T00:15:00.000Z');assert.deepEqual(m.leagues[0].completed,['42']);assert.equal(m.leagues.length,139)
})
test('reject changed or ambiguous reviewed inventory and never admit women or policy-held leagues',async()=>{
  for(const replacement of [{id:0},{id:true},{slug:'../escape'},{source_league_code:'12/path'},{countries:{code:'SI'}},{id:2},{source_league_code:'1001'},{slug:'hr-test-2'},{active:false},{slug:'hr-prva-hnlz'},{source_policy:'hold'}]) {
    await assert.rejects(()=>build({...opts,competitions:[{...competitions[0],...replacement},...competitions.slice(1)]}))
  }
  const m=await build({...opts,competitions:[...competitions,{...competitions[0],id:999,slug:'hr-prva-hnlz'},{...competitions[0],id:998,source_policy:'hold'}]})
  assert.equal(m.leagues.length,139)
  await assert.rejects(()=>build({...opts,competitions:competitions.slice(1)}))
})
test('reject dates outside the explicit 2026/27 season or without UTC timezone',async()=>{
  for(const now of ['nonsense','2026-11-18T12:00:00','2027-07-01T00:00:00Z','2026-07-01T00:00:00Z']) await assert.rejects(()=>build({...opts,now}))
})
test('offline bridge admits phase reports only with the correct current-season parent',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hns-recurring-bridge-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
  const original=readFileSync(new URL('./vzorci/hns-tekma-11m.html',import.meta.url),'utf8')
  const html=original.replace('<h2>Treća NL Istok 26/27,','<h2><a href="https://semafor.hns.family/natjecanja/999/x/">Treća NL Istok 26/27 1. DIO</a>,')
  const path=join(dir,'report.html');writeFileSync(path,html)
  const z=vZapisnik(html,{id:'456',url:'https://semafor.hns.family/utakmice/456/x/'})
  const fixture={id:'456',krog:z.krog,datum:z.datum,domaci:z.domaci.ime,gostje:z.gostje.ime,izid:z.rezultat}
  const run=parentName=>spawnSync(process.execPath,[new URL('./hns-recurring-parse.mjs',import.meta.url).pathname],{input:JSON.stringify({kind:'report',path,fixture,code:'123',parentName}),encoding:'utf8'})
  const good=run('Treća NL Istok 26/27');assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).complete,true)
  for(const wrong of ['Other competition 26/27','Treća NL Istok 25/26',''])assert.notEqual(run(wrong).status,0)
})
test('authentic schedule binds explicit selected season and requested competition without a title suffix',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hns-recurring-schedule-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
  const original=readFileSync(new URL('./vzorci/hns-schedule-hnl-20261118.html',import.meta.url),'utf8')
  const path=join(dir,'schedule.html')
  const run=(html=original,code='114137140')=>{
    writeFileSync(path,html)
    return spawnSync(process.execPath,[new URL('./hns-recurring-parse.mjs',import.meta.url).pathname],{input:JSON.stringify({kind:'schedule',path,code}),encoding:'utf8'})
  }
  const good=run();assert.equal(good.status,0,good.stderr)
  const parsed=JSON.parse(good.stdout);assert.equal(parsed.parentName,'SuperSport HNL');assert.equal(parsed.season,'2026/27');assert.equal(parsed.competitionCode,'114137140');assert.equal(parsed.fixtures.length,2)
  assert.notEqual(run(original.replace('selected="selected" value="2026/2027">2026/27','selected="selected" value="2025/2026">2025/26')).status,0)
  assert.notEqual(run(original,'114348034').status,0,'another dropdown-listed competition must not bind this page')
  assert.notEqual(run(original.replace('/114137140/supersport-hnl/detaljno/','/999/supersport-hnl/detaljno/')).status,0)
  assert.notEqual(run(original.replace('<title>SuperSport HNL','<title>Other league')).status,0)
})
test('exact-code reports do not require a synthetic season suffix on the parent name',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hns-recurring-report-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
  const original=readFileSync(new URL('./vzorci/hns-tekma-11m.html',import.meta.url),'utf8')
  const html=original.replace('<h2>Treća NL Istok 26/27,','<h2><a href="https://semafor.hns.family/natjecanja/123/x/">SuperSport HNL</a>,')
  const path=join(dir,'report.html');writeFileSync(path,html)
  const z=vZapisnik(html,{id:'456',url:'https://semafor.hns.family/utakmice/456/x/'})
  const fixture={id:'456',krog:z.krog,datum:z.datum,domaci:z.domaci.ime,gostje:z.gostje.ime,izid:z.rezultat}
  const run=code=>spawnSync(process.execPath,[new URL('./hns-recurring-parse.mjs',import.meta.url).pathname],{input:JSON.stringify({kind:'report',path,fixture,code,parentName:'SuperSport HNL'}),encoding:'utf8'})
  const good=run('123');assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).complete,true)
  assert.notEqual(run('999').status,0,'an unsuffixed parent must not authorize a different phase code')
})
test('new cycle prioritizes missing and unfinished prior leagues while retaining fresh DB completion data',async()=>{
  const priorSnapshot={schema:2,source:'hns',mode:'recurring',season:'2026/27',leagues:[
    {id:1,slug:'hr-test-1',code:'1000',finished:true,completed:['old'],schedule:{sha256:'old'}},
    {id:2,slug:'hr-test-2',code:'1001',finished:false},
    {id:3,slug:'hr-test-3',code:'1002',finished:true},
  ]}
  const value=await build({...opts,priorSnapshot})
  assert.deepEqual(value.leagues.slice(0,3).map(x=>x.id),[2,4,5])
  assert.deepEqual(value.leagues.slice(-2).map(x=>x.id),[1,3])
  assert.deepEqual(value.leagues.find(x=>x.id===1),{id:1,slug:'hr-test-1',code:'1000',completed:[]})
  assert.equal(value.leagues.length,139)
})
test('prior cycle cannot reorder by foreign, changed or duplicate identities',async()=>{
  const prior={schema:2,source:'hns',mode:'recurring',season:'2026/27',leagues:[{id:1,slug:'hr-test-1',code:'1000',finished:true}]}
  for(const change of [{id:999},{slug:'hr-other'},{code:'999'},{finished:'true'}])
    await assert.rejects(()=>build({...opts,priorSnapshot:{...prior,leagues:[{...prior.leagues[0],...change}]}}))
  await assert.rejects(()=>build({...opts,priorSnapshot:{...prior,leagues:[...prior.leagues,...prior.leagues]}}))
  await assert.rejects(()=>build({...opts,priorSnapshot:{...prior,season:'2025/26'}}))
})
