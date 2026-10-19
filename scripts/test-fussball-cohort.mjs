import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'

const module = await import('./lib/fussball-cohort.mjs').catch(e => {
  if (e.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw e
})
const root = new URL('./vzorci/', import.meta.url).pathname
const hash = value => createHash('sha256').update(value).digest('hex')
const asset = name => ({file: resolve(root, name), sha256: hash(readFileSync(resolve(root, name)))})
const id = '031EQBPLF4000000VS5489BTVUS470OH'
const fonts = asset('de-fussball-zapisnik.json')
function league() {
  return {key:'mannheim', staffel:'031EKNM2HG00000LVS5489BUVUR5FS5A-G', season:'2026/27',
    rounds:[{page:asset('de-fussball-krog8.html'), fonts}],
    reports:[{id, main:asset('de-fussball-ilvesheim-main.html'), lineup:asset('de-fussball-ilvesheim-lineup.html'), fonts}]}
}
const audit = leagues => {
  assert.equal(typeof module.auditFussballCohort, 'function', 'shared cohort auditor exists')
  return module.auditFussballCohort({version:1, leagues}, {baseDirectory:root})
}

test('authentic partial capture counts one supported report without claiming season or launch readiness', () => {
  const r = audit([league()]), l = r.leagues[0]
  assert.equal(r.activationEligible, false)
  assert.equal(r.completeInventories, 0)
  assert.equal(r.seasonCoverageVerified, false)
  assert.equal(l.status, 'HOLD')
  assert.equal(l.advertisedRounds, 30)
  assert.equal(l.capturedRounds, 1)
  assert.equal(l.missingRounds.length, 29)
  assert.equal(l.supportedReports, 1)
  assert.equal(l.appearances, 30)
  assert.equal(l.unattributedYellows, 3)
  assert.equal(l.missingReports.length, 8)
  assert.equal(l.activationEligible, false)
})

test('bad league is isolated; next league still receives the shared report audit', () => {
  const bad = league();bad.key='broken';bad.staffel='0'.repeat(32)+'-G';bad.reports=[];bad.rounds[0].page.sha256='0'.repeat(64)
  const r = audit([bad, league()])
  assert.equal(r.leagues.length, 2)
  assert.ok(r.leagues[0].issues.some(i => /hash/i.test(i.reason)))
  assert.equal(r.leagues[1].supportedReports, 1)
  assert.equal(r.completeInventories, 0)
})

test('duplicate league identities cannot inflate demonstrated provider coverage', () => {
  assert.throws(() => audit([league(), {...league(), key:'renamed'}]), /duplicate.*staffel/i)
  assert.throws(() => audit([league(), {...league(), staffel:'0'.repeat(32)+'-G'}]), /duplicate.*key/i)
})

test('wrong season and replayed round never count as complete coverage', () => {
  const wrong=league();wrong.season='2025/26'
  const duplicate=league();duplicate.rounds.push(duplicate.rounds[0])
  assert.ok(audit([wrong]).leagues[0].issues.some(i=>i.code==='ROUND_INVALID'))
  const r=audit([duplicate]).leagues[0]
  assert.equal(r.capturedRounds,1)
  assert.ok(r.issues.some(i=>i.code==='ROUND_INVALID'))
})

test('report cannot be counted twice or claim a different match identity', () => {
  const duplicate=league();duplicate.reports.push(duplicate.reports[0])
  assert.throws(()=>audit([duplicate]), /duplicate.*report/i)
  const wrong=league();wrong.reports[0].id='0'.repeat(32)
  const r=audit([wrong]).leagues[0]
  assert.equal(r.supportedReports,0)
  assert.ok(r.issues.some(i=>i.code==='REPORT_INVALID'))
})

test('bound report hash and schedule/report score disagreements retain a hold', () => {
  const dir=mkdtempSync(join(tmpdir(),'slff-fussball-cohort-'))
  try {
    const changed=league();changed.reports[0].lineup.sha256='0'.repeat(64)
    assert.equal(audit([changed]).leagues[0].supportedReports,0)
    const original=readFileSync(resolve(root,'de-fussball-krog8.html'),'utf8')
    const altered=original.replace(new RegExp(`(<a href="[^"]*/spiel/${id}#!/section/course"><span[^>]*class="score-left">)&#xE6A7;`), '$1&#xE683;')
    assert.notEqual(altered,original,'schedule mutation changes the selected match result')
    const file=join(dir,'round.html');writeFileSync(file,altered)
    const mismatch=league();mismatch.rounds[0].page={file,sha256:hash(altered)}
    const result=audit([mismatch]).leagues[0]
    assert.equal(result.supportedReports,0)
    assert.ok(result.issues.some(i=>i.code==='REPORT_INVALID'&&/schedule/i.test(i.reason)))
  } finally {rmSync(dir,{recursive:true,force:true})}
})

test('malformed per-league metadata is held without aborting healthy siblings', () => {
  const bad=league();bad.key='bad-season';bad.staffel='0'.repeat(32)+'-G';bad.season='wrong';bad.reports=[]
  const r=audit([bad,league()])
  assert.ok(r.leagues[0].issues.some(i=>i.code==='METADATA_INVALID'))
  assert.equal(r.leagues[1].supportedReports,1)
})

test('offline CLI writes a reusable HOLD result and refuses to overwrite previous evidence', () => {
  const dir=mkdtempSync(join(tmpdir(),'slff-fussball-cohort-cli-'))
  try {
    const cli=new URL('./preveri-fussball-kohorto.mjs',import.meta.url).pathname
    const input=resolve(root,'de-fussball-cohort-pilot.json'),output=join(dir,'result.json')
    const run=()=>spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'})
    const r=run();assert.equal(r.status,3,r.stderr)
    const original=readFileSync(output,'utf8'),result=JSON.parse(original)
    assert.equal(result.leagues[0].supportedReports,1)
    assert.equal(result.providerRequests,0);assert.equal(result.databaseWrites,0)
    assert.equal(result.seasonCoverageVerified,false);assert.equal(result.activationEligible,false)
    assert.equal(run().status,1)
    assert.equal(readFileSync(output,'utf8'),original)
  } finally {rmSync(dir,{recursive:true,force:true})}
})
