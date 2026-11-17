import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const modulePath = new URL('./pzpn-collect-recovery.mjs', import.meta.url)
const available = fs.existsSync(modulePath)
test('collector module exists', () => assert.ok(available, 'bounded collector is not implemented'))
const M = available ? await import(modulePath) : null
const run = available ? test : test.skip
const dirs = []
test.after(() => dirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })))
const temp = () => { const p = fs.mkdtempSync(path.join(os.tmpdir(), 'pzpn-collector-test-')); dirs.push(p); return p }
const config = () => ({ manifest: M.LEAGUES.map(x => ({ ...x, source: 'pzpn', active: true, source_league_code: x.code })), from: '2026-11-06', through: '2026-11-17', completed: [] })
const body = data => ({ status: 200, body: Buffer.from(JSON.stringify(data)) })
const schedule = () => M.scheduleUrl(M.LEAGUES[0].code, 'results')
const clock = () => { let n = 100000; return { now: () => n, sleep: async ms => { n += ms } } }

run('manifest and date guards reject expanded scope before any requests', () => {
  const c = config()
  assert.equal(M.validateConfig(c).leagues.length, 8)
  assert.throws(() => M.validateConfig({ ...c, through: '2026-11-21' }), /window/)
  assert.throws(() => M.validateConfig({ ...c, manifest: c.manifest.slice(1) }), /manifest/)
  assert.throws(() => M.validateConfig({ ...c, manifest: c.manifest.map((x,i) => i ? x : { ...x, source_league_code: 'swietokrzyski/00000000-0000-0000-0000-000000000000' }) }), /manifest/)
})
run('selection excludes missing scores, wrong dates, walkovers and completed records', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./vzorci/pl-pzpn-tekma-4liga.json', import.meta.url)))
  const first = { ...fixture, kickoff_at: '2026-11-06T17:00:00+01:00' }
  const data = [first, { ...first,id:'missing',score:{} }, { ...first,id:'old',kickoff_at:'2026-11-05T17:00:00+01:00' }, { ...first,id:'walk',state:'Walkower' }]
  assert.deepEqual(M.selectMatches(data, '2026-11-06', '2026-11-17', new Set()).map(x=>x.id), [fixture.id])
  assert.deepEqual(M.selectMatches(data, '2026-11-06', '2026-11-17', new Set([fixture.id])), [])
})
run('150 persisted attempts stop before a 151st request, including after restart', async () => {
  const dir=temp(), c=config(), time=clock(); let calls=0
  const transport=async()=>{calls++;return body({success:true,events:{host:{squad:[]},guest:{squad:[]}}})}
  let store=new M.RecoveryStore(dir,M.validateConfig(c),{...time,transport})
  for(let i=0;i<150;i++)await store.request(`https://szpnkielce.pl/wp-json/szpn/v1/proxy/pzpn/shared/matches/00000000-0000-4000-8000-${String(i).padStart(12,'0')}/events.json`,'report')
  store.close();store=new M.RecoveryStore(dir,M.validateConfig(c),{...time,transport})
  await assert.rejects(store.request('https://szpnkielce.pl/wp-json/szpn/v1/proxy/pzpn/shared/matches/00000000-0000-4000-8000-999999999999/events.json','report'),/budget/)
  assert.equal(calls,150);assert.equal(store.state.attempts,150);store.close()
})
run('refusal remains blocked across restart and never retries', async () => {
  const dir=temp(), c=M.validateConfig(config());let calls=0
  const options={...clock(),transport:async()=>{calls++;return {status:403,body:Buffer.from('blocked')}}}
  let s=new M.RecoveryStore(dir,c,options)
  await assert.rejects(s.request(schedule(),'schedule'),/blocked/);s.close()
  s=new M.RecoveryStore(dir,c,options)
  await assert.rejects(s.request(schedule(),'schedule'),/blocked/)
  assert.equal(calls,1);assert.equal(s.state.attempts,1);assert.equal(s.state.blocked,'source_refusal_403');s.close()
})
run('verified cache prevents repeat requests and host pacing survives restart', async () => {
  const dir=temp(),c=M.validateConfig(config()),time=clock(),starts=[]
  const options={...time,transport:async()=>{starts.push(time.now());return body({success:true,page:1,limit:500,count:0,data:[]})}}
  let s=new M.RecoveryStore(dir,c,options)
  const first=await s.request(schedule(),'schedule');s.close()
  s=new M.RecoveryStore(dir,c,options)
  assert.equal((await s.request(schedule(),'schedule')).sha256,first.sha256)
  await s.request(M.scheduleUrl(M.LEAGUES[1].code,'results'),'schedule')
  assert.deepEqual(starts,[100000,110000]);assert.equal(s.state.attempts,2)
  fs.writeFileSync(path.join(dir,first.path),'tampered')
  await assert.rejects(s.request(schedule(),'schedule'),/hash/);s.close()
})
run('lock excludes another collector and interrupted request cannot be replayed', async () => {
  const dir=temp(),c=M.validateConfig(config()),o={...clock(),transport:async()=>{throw new Error('transport unavailable')}}
  const s=new M.RecoveryStore(dir,c,o)
  assert.throws(()=>new M.RecoveryStore(dir,c,o),/lock/)
  await assert.rejects(s.request(schedule(),'schedule'),/transport/);s.close()
  const next=new M.RecoveryStore(dir,c,o)
  await assert.rejects(next.request(schedule(),'schedule'),/blocked/);next.close()
})
run('full collection emits immutable source-bound capture and complete report with real parser', async () => {
  const dir=temp(),c=config(),fixture=JSON.parse(fs.readFileSync(new URL('./vzorci/pl-pzpn-tekma-4liga.json',import.meta.url)))
  fixture.kickoff_at='2026-11-10T17:00:00+01:00'
  const report=JSON.parse(fs.readFileSync(new URL('./vzorci/pl-pzpn-zapisnik-4liga.json',import.meta.url)))
  const transport=async url=>body(url.endsWith('events.json')?report:{success:true,page:1,limit:500,count:url===schedule()?1:0,data:url===schedule()?[fixture]:[]})
  const result=await M.collect({dir,...c},{...clock(),transport})
  assert.equal(result.snapshot.status,'complete');assert.equal(result.snapshot.leagues.length,8)
  assert.equal(result.snapshot.leagues[0].reports[0].id,fixture.id)
  assert.equal(result.snapshot.leagues[0].reports[0].status,'complete')
  assert.deepEqual(result.snapshot.leagues[0].completeReportIds,[fixture.id])
  assert.equal(result.snapshot.leagues[0].reports[0].capture.payload.success,true)
  const before=fs.readFileSync(result.path)
  await M.collect({dir,...c},{...clock(),transport:async()=>{throw Error('unexpected live fetch')}})
  assert.deepEqual(fs.readFileSync(result.path),before)
})
run('redirects, challenges, bad JSON and429 each terminate the source with no replay', async () => {
  for(const response of [
    {status:302,body:Buffer.from('redirect')},
    {status:200,body:Buffer.from('<title>Just a moment</title>')},
    {status:200,body:Buffer.from('not JSON')},
    {status:429,body:Buffer.from('rate limited')},
  ]) {
    let calls=0
    const s=new M.RecoveryStore(temp(),M.validateConfig(config()),{...clock(),transport:async()=>{calls++;return response}})
    await assert.rejects(s.request(schedule(),'schedule'),/blocked/)
    await assert.rejects(s.request(M.scheduleUrl(M.LEAGUES[1].code,'results'),'schedule'),/blocked/)
    assert.equal(calls,1);s.close()
  }
})
run('off-source or malformed endpoints never consume an attempt', async () => {
  const s=new M.RecoveryStore(temp(),M.validateConfig(config()),{...clock(),transport:async()=>{throw Error('must not run')}})
  for(const url of ['https://example.com/',schedule()+'&extra=1',schedule().replace('szpnkielce.pl','szpnkielceXpl')])await assert.rejects(s.request(url,'schedule'),/scope/)
  assert.equal(s.state.attempts,0);s.close()
})
run('an incomplete report remains pending and is never silently labelled complete', async () => {
  const fixture=JSON.parse(fs.readFileSync(new URL('./vzorci/pl-pzpn-tekma-4liga.json',import.meta.url)))
  fixture.kickoff_at='2026-11-10T17:00:00+01:00'
  const report={success:true,events:{host:{squad:[]},guest:{squad:[]}}}
  const transport=async url=>body(url.endsWith('events.json')?report:{success:true,page:1,limit:500,count:url===schedule()?1:0,data:url===schedule()?[fixture]:[]})
  const result=await M.collect({dir:temp(),...config()},{...clock(),transport})
  assert.equal(result.snapshot.status,'pending');assert.deepEqual(result.snapshot.leagues[0].completeReportIds,[])
  assert.equal(result.snapshot.leagues[0].reports[0].reason,'parser_quality_hold')
})
