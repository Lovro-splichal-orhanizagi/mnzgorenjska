import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { classifyCoverage, inspectCoverage, readActiveInventory } from './nightly-source-coverage.mjs'
import { IZKLOPLJENI_VIRI, ZAVRNJENA_SPLETISCA } from './nocni-kosi.mjs'

const league = (id, source = 'wmzpn', extra = {}) => ({ id, slug: `league-${id}`, active: true,
  source, source_league_code: 'PRIVATE', source_policy: null, ...extra })
function database(rows, alter = x => x) {
  const calls = []
  return { calls, from(table) {
    assert.equal(table, 'competitions')
    return {
      select(fields, options) {
        assert.equal(fields, 'id, slug, active, source, source_league_code, source_policy')
        assert.deepEqual(options, { count: 'exact' }); return this
      },
      eq(field, value) { assert.equal(field, 'active'); assert.equal(value, true); return this },
      order(field) { assert.equal(field, 'id'); return this },
      range(from, to) {
        calls.push([from, to])
        return Promise.resolve(alter({ data: rows.slice(from, to + 1), count: rows.length, error: null }, from))
      }
    }
  } }
}

test('refused Kielce stays degraded beside eligible WMZPN and separately monitored HNS', () => {
  const r = classifyCoverage([league(1, 'pzpn'), league(2), league(3, 'hns')])
  assert.equal(r.state, 'degraded')
  assert.deepEqual(r.leagues.map(l => l.route), ['source-refused', 'nightly-eligible', 'retained-hns-monitor'])
  assert.equal(r.counts['source-refused'], 1)
  assert(!JSON.stringify(r).includes('PRIVATE'))
})

test('policy-held FCF stays explicit and does not disclose policy text', () => {
  const r = classifyCoverage([league(1, 'fcf', { source_policy: 'PRIVATE' })])
  assert.equal(r.state, 'accounted')
  assert.equal(r.leagues[0].route, 'policy-excluded')
  assert(!JSON.stringify(r).includes('PRIVATE'))
})

test('eligible inventory is accounted, never claimed healthy', () => {
  const r = classifyCoverage([league(1), league(2, 'fcf'), league(3, 'eps', { source_league_code: 'epsdod.gr:4' })])
  assert.equal(r.state, 'accounted')
  assert.equal(r.counts['nightly-eligible'], 3)
  assert(!JSON.stringify(r).includes('healthy'))
})

test('new disabled source and per-domain refusals use the actual nightly policy', () => {
  IZKLOPLJENI_VIRI.add('wmzpn'); ZAVRNJENA_SPLETISCA.add('eps:epsdod.gr')
  try {
    const r = classifyCoverage([league(1), league(2, 'eps', { source_league_code: 'epsdod.gr:4' })])
    assert.equal(r.state, 'degraded')
    assert.deepEqual(r.leagues.map(l => l.route), ['source-disabled', 'source-refused'])
  } finally { IZKLOPLJENI_VIRI.delete('wmzpn'); ZAVRNJENA_SPLETISCA.delete('eps:epsdod.gr') }
})

test('stable pagination accounts for a refused league beyond 1000 eligible rows', async () => {
  const db = database(Array.from({ length: 1001 }, (_, i) => league(i + 1, i === 1000 ? 'pzpn' : 'wmzpn')))
  const r = await inspectCoverage(db)
  assert.equal(r.state, 'degraded'); assert.equal(r.activeLeagues, 1001)
  assert.equal(r.counts['source-refused'], 1)
  assert.deepEqual(db.calls, [[0, 499], [500, 999], [1000, 1499]])
})

test('an exact full final page is complete, without an extra empty page', async () => {
  const db = database(Array.from({ length: 1000 }, (_, i) => league(i + 1)))
  assert.equal((await readActiveInventory(db)).length, 1000)
  assert.equal(db.calls.length, 2)
})

for (const [label, mutate] of [
  ['failed later page', r => ({ ...r, error: { message: 'PRIVATE credential' } })],
  ['missing later page', r => ({ ...r, data: null })],
  ['malformed later page', r => ({ ...r, data: {} })],
  ['silently truncated page', r => ({ ...r, data: [] })],
  ['changing inventory count', r => ({ ...r, count: r.count + 1 })],
  ['missing exact count', r => ({ ...r, count: null })]
]) test(`${label} stays unknown with no partial green result or error leak`, async () => {
  const rows = Array.from({ length: 501 }, (_, i) => league(i + 1))
  const r = await inspectCoverage(database(rows, (r, from) => from ? mutate(r) : r))
  assert.equal(r.state, 'unknown'); assert.equal(r.leagues, undefined)
  assert(!JSON.stringify(r).includes('PRIVATE'))
})

test('duplicate, inactive, empty or incomplete routing inventory fails closed', async () => {
  const missingSource = league(1); delete missingSource.source
  const missingPolicy = league(1); delete missingPolicy.source_policy
  for (const rows of [[], [league(1), league(1)], [league(1, 'wmzpn', { active: false })], [missingSource], [missingPolicy]]) {
    assert.equal((await inspectCoverage(database(rows))).state, 'unknown')
  }
})

test('missing runtime configuration exits nonzero and leaves an unknown artifact', () => {
  const dir = mkdtempSync(join(process.env.PAPERCLIP_RUN_SCRATCH_DIR || tmpdir(), 'coverage-'))
  try {
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('./nightly-source-coverage.mjs', import.meta.url))], {
      cwd: dir, env: { PATH: process.env.PATH }, encoding: 'utf8'
    })
    assert.equal(r.status, 1)
    assert.equal(JSON.parse(readFileSync(join(dir, 'nightly-source-coverage.json'))).state, 'unknown')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('hourly coverage runs independently of writers and publishes failures', () => {
  const y = readFileSync(new URL('../.github/workflows/zivost.yml', import.meta.url), 'utf8')
  const job = y.split('\n  source-coverage:\n')[1]
  assert(job)
  assert.match(job, /needs: zivost/)
  assert.match(job, /!cancelled\(\) && needs\.zivost\.outputs\.ura == 'true'/)
  assert(!/cakaj-na-uvoze|tece|needs:.*(?:preveri|hns)/.test(job))
  assert.match(job, /run: node scripts\/nightly-source-coverage.mjs/)
  assert.match(job, /actions\/upload-artifact@v4\s+if: \$\{\{ !cancelled\(\) \}\}/)
  assert.match(job, /if-no-files-found: error/)
  assert(readFileSync(new URL('./test-dodatni.txt', import.meta.url), 'utf8').includes('scripts/test-nightly-source-coverage.mjs'))
})
