// Exactly two public reads. No database, cache writes, redirects or retries.
import assert from 'node:assert/strict'
import vir, { vrsticeRazporeda, vZapisnik } from './viri/hns.mjs'
import { setTimeout } from 'node:timers/promises'

const matchId = '114147891'
const competitionUrl = vir.naslovRazporeda('114137140')
await setTimeout(5000)
const schedule = vrsticeRazporeda(await (await vir.fetch(competitionUrl, { signal: AbortSignal.timeout(30000) })).text())
const fixture = schedule.find(x => String(x.id) === matchId)
assert.ok(fixture, 'Known match must appear in the schedule')
const url = vir.naslovZapisnika(null, matchId)
await setTimeout(5000)
const report = vZapisnik(await (await vir.fetch(url, { signal: AbortSignal.timeout(30000) })).text(), { id: matchId, url })
assert.ok(report, 'Report must parse')
assert.equal(report.datum, '2026-11-08')
assert.deepEqual(report.rezultat, { domaci: 1, gostje: 3 })
assert.deepEqual(report.rezultat, fixture.izid)
assert.equal(report.domaci.postava.length, 11)
assert.equal(report.gostje.postava.length, 11)
assert.equal(report.goli.length, 4)
console.log(JSON.stringify({ valid: true, fixtures: schedule.length, matchId, score: report.rezultat, starters: [11, 11], goals: report.goli.length }))
