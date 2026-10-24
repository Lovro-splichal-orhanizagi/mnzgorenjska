import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import PZPN, { vZapisnik } from './viri/pzpn.mjs'
import { oznakaBrezIzida } from './razpored.mjs'

const code = 'swietokrzyski/ed980a22-e851-4b47-bf75-5dfbee9f60cc'
const missing = JSON.parse(await readFile(new URL('./vzorci/pl-pzpn-samson-sport-ck-no-score.json', import.meta.url)))
const played = JSON.parse(await readFile(new URL('./vzorci/pl-pzpn-tekma-4liga.json', import.meta.url)))
const events = JSON.parse(await readFile(new URL('./vzorci/pl-pzpn-zapisnik-4liga.json', import.meta.url)))
// The transport double freezes real provider responses and rejects any unplanned request.
const transport = (fixtures, allowEvents = false) => async (url) => {
  if (url.includes('/matches.json?')) return JSON.stringify({ success: true, data: fixtures })
  assert.ok(allowEvents && url.endsWith(`/${played.id}/events.json`), `Unexpected report fetch: ${url}`)
  return JSON.stringify(events)
}
const schedule = (fixtures) => PZPN.razporedVseStrani(code, transport(fixtures))

test('authentic Samson–SPORT CK played label without score remains unknown', async () => {
  const rounds = await schedule([missing, played])
  const fixture = rounds.find(r => r.stevilka === 3).tekme[0]
  assert.equal(fixture.odigrana, false)
  assert.equal(fixture.kontumacija, false)
  assert.equal(oznakaBrezIzida(rounds, '2026-10-24').brezIzida(fixture), true)
  assert.equal(vZapisnik(missing, events), null)
  assert.deepEqual(await PZPN.zapisniki(code, transport([missing])), [])
})

for (const [label, score, expected] of [
  ['published 0:0', { final: '0:0', full_time: null }, { domaci: 0, gostje: 0 }],
  ['normal published score', played.score, { domaci: 3, gostje: 1 }],
  ['full_time fallback', { final: null, full_time: '3:1' }, { domaci: 3, gostje: 1 }],
]) test(`${label} is accepted by schedule, report conversion and report getter`, async () => {
  const fixture = { ...played, score }
  assert.equal((await schedule([fixture]))[0].tekme[0].odigrana, true)
  assert.deepEqual(vZapisnik(fixture, events).rezultat, expected)
  const reports = await PZPN.zapisniki(code, transport([fixture], true))
  assert.equal(reports.length, 1)
  assert.deepEqual(reports[0].z.rezultat, expected)
})

test('future unplayed fixture never fetches events', async () => {
  const fixture = { ...missing, state: 'Nierozegrany', kickoff_at: '2026-11-15T11:00:00+01:00' }
  assert.equal((await schedule([fixture]))[0].tekme[0].odigrana, false)
  assert.deepEqual(await PZPN.zapisniki(code, transport([fixture])), [])
})

test('walkover keeps existing schedule result and does not fetch events', async () => {
  const fixture = { ...played, state: 'Walkower', score: { final: '3:0' } }
  const actual = (await schedule([fixture]))[0].tekme[0]
  assert.equal(actual.odigrana, true)
  assert.equal(actual.kontumacija, true)
  assert.deepEqual(actual.izid, { domaci: 3, gostje: 0 })
  assert.deepEqual(await PZPN.zapisniki(code, transport([fixture])), [])
})
