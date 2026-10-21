import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import mfa, { krogiSezone, razcleniRazpored } from './viri/mfa.mjs'

const fixtures = JSON.parse(readFileSync(new URL('./vzorci/mt-mfa-nl1-2026-withdrawal-schedule.json', import.meta.url)))
const mtarfa = t => [t.homeTeam.id, t.awayTeam.id].includes(40412)

test('official Mtarfa withdrawal leaves 50 fixtures in their original ten round slots', () => {
  const raw = structuredClone(fixtures)
  const original = new Map(krogiSezone(raw).map(({ krog, t }) => [t.id, krog]))
  const schedule = razcleniRazpored(raw)
  assert.equal(raw.length, 56, 'raw evidence remains intact')
  assert.equal(schedule.length, 10)
  assert.deepEqual(schedule.map(r => r.tekme.length), Array(10).fill(5))
  const actual = schedule.flatMap(r => r.tekme.map(t => [t.mfaId, r.stevilka]))
  assert.equal(actual.length, 50)
  assert.deepEqual(actual.sort(), fixtures.filter(t => !mtarfa(t)).map(t => [t.id, original.get(t.id)]).sort())
  assert.ok(schedule.every(r => r.tekme.every(t => t.domaci !== 'Mtarfa' && t.gostje !== 'Mtarfa')))
  assert.deepEqual(raw, fixtures)
})

test('withdrawal is limited to the exact source competition and type', () => {
  for (const change of [{ competitionId: '50919376' }, { competitionId: '53109940' }, { competitionTypeId: 6234492 }]) {
    const other = fixtures.map(t => ({ ...t, ...change }))
    assert.equal(razcleniRazpored(other).flatMap(r => r.tekme).length, 56)
  }
})

test('a stale PLAYED Mtarfa record is skipped before either report body is read', async () => {
  const raw = fixtures.map(t => mtarfa(t) ? { ...t, status: 'PLAYED' } : t)
  const cancelled = new Set(raw.filter(mtarfa).map(t => String(t.id)))
  const calls = []
  const read = async (url, file) => {
    calls.push(file)
    if (url.includes('/standings?')) return JSON.stringify({ phases: [{ groups: [{ id: '53109939' }] }] })
    if (url.includes('/pastMatches?')) return JSON.stringify(new URL(url).searchParams.get('page') === '1' ? raw.filter(t => !mtarfa(t)) : [])
    if (url.includes('/upcomingMatches?')) return JSON.stringify(raw.filter(mtarfa))
    const report = /^tekma-(\d+)-(izid|postava)[.]json$/.exec(file)
    assert.ok(report, `unexpected provider read ${file}`)
    assert.ok(!cancelled.has(report[1]), `cancelled report read: ${file}`)
    return report[2] === 'izid'
      ? JSON.stringify({ status: 'PLAYED', homeScore: 0, awayScore: 0 })
      : JSON.stringify({ homeTeam: { players: [] }, awayTeam: { players: [] } })
  }
  const reports = await mfa.zapisniki('2601267/2027', read, { mapa: null, zdaj: Date.parse('2026-10-21T19:00Z') })
  assert.equal(reports.length, 20)
  assert.ok(!calls.some(f => [...cancelled].some(id => f.startsWith(`tekma-${id}-`))))
})
