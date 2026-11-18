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
test('offline schedule bridge extracts current parent identity and rejects an old season',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hns-recurring-schedule-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
  const original=readFileSync(new URL('./vzorci/hns-natjecanje.html',import.meta.url),'utf8')
  const path=join(dir,'schedule.html')
  const run=season=>{
    writeFileSync(path,`<html><head><title>Test ${season} - Hrvatski nogometni savez</title></head><body>${original}</body></html>`)
    return spawnSync(process.execPath,[new URL('./hns-recurring-parse.mjs',import.meta.url).pathname],{input:JSON.stringify({kind:'schedule',path}),encoding:'utf8'})
  }
  const good=run('26/27');assert.equal(good.status,0,good.stderr)
  const parsed=JSON.parse(good.stdout);assert.equal(parsed.parentName,'Test 26/27');assert.ok(parsed.fixtures.length>0)
  assert.notEqual(run('25/26').status,0)
})
