import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { viraZa } from './viri/index.mjs'
import { getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256, validateInstalledHistoricalStatisticsMarkers } from './lib/historical-statistics-policy.mjs'
import { assertHistoricalReportImportable } from './lib/historical-statistics-import.mjs'

const policy = () => getHistoricalStatisticsPolicy('mt-nl1')
const competition = () => ({ id: 973, slug: 'mt-nl1', name: 'National League I', source: 'mfa', source_policy: 'mt-mfa-nl1-reviewed-history-v1', source_league_code: '2601267/2027', active: false })
function installed() {
  const p = policy(); assert.ok(p, 'reviewed NL I policy must exist')
  const sha = historicalStatisticsPolicySha256(p)
  return { installed: true, policyId: p.id, policySha256: sha, firstFantasyPlayedOn: '2026-11-13', markers: p.entries.map((e, i) => {
    const { rawSha256, reasonCode, ...fixture } = e
    return { sourceMatchId: e.sourceMatchId, reportId: `mt${e.sourceMatchId}`, fixture, rawSha256, matchId: 900000 + i, roundId: 9000 + i, homeTeamId: 8000, awayTeamId: 8001, policyId: p.id, policySha256: sha, statisticsStatus: 'unavailable_historical', importedAt: null, individualRowCount: 0 }
  }) }
}

test('NL I policy contains only the newly approved archive dismissal-clock exclusion', () => {
  const p = getHistoricalStatisticsPolicy('mt-nl1'); assert.ok(p)
  assert.equal(p.sourcePolicy, 'mt-mfa-nl1-reviewed-history-v1')
  assert.equal(p.entries.length, 1)
  assert.deepEqual(p.entries.map(e => [e.sourceMatchId, e.season, e.sourceRound, e.playedOn, e.observedHomeScore, e.observedAwayScore, e.rawSha256]), [['50921445', '2025/26', 24, '2026-04-18', 1, 0, '24a68ce636ecee7127b389ef320f5fe5475c3f7fbf4330344f618652787f83f4']])
  assert.match(p.approvalReference, /call_ad3388b13b7b446781a593b0bf1a49d8/)
})

test('NL I import requires complete native binding and exact current/archive codes', async () => {
  const b = installed()
  assert.deepEqual(validateInstalledHistoricalStatisticsMarkers({ competition: competition(), binding: b }), b)
  for (const row of [competition(), { ...competition(), id: 974 }, { ...competition(), source_league_code: '2601267/2026' }, { ...competition(), source_policy: null }]) {
    assert.throws(() => viraZa(row), /binding|marker|policy|tuple|native/)
  }
  const source = viraZa(competition(), { installedHistoricalMarkers: b })
  for (const code of ['2601267/2027', '2601267/2026']) for (const id of ['mt50921445']) {
    assert.deepEqual(await source.zapisniki(code, () => { throw Error('provider forbidden') }, { samoZapisnik: id }), [])
  }
  await assert.rejects(source.zapisniki('2601267/2025', () => { throw Error('provider forbidden') }), /foreign.*code/)
})

test('neither continuation segment may leak into ordinary derived statistics in any MFA league', () => {
  for (const row of [competition(), { id: 973, slug: 'mt-nl1', source: 'mfa', source_league_code: '2601267/2027', source_policy: null }]) {
    for (const id of ['mt50920555', 'mt51962893']) assert.throws(() => assertHistoricalReportImportable({ competition: row, report: { id, z: {} } }), /historical|continuation|fixture|policy/)
  }
  assert.doesNotThrow(() => assertHistoricalReportImportable({ competition: competition(), report: { id: 'mt53199999', z: {} } }))
})

async function cli(script, id) {
  const calls = []
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    const url = new URL(req.url, 'http://localhost'); calls.push([req.method, url.pathname])
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'GET' && url.pathname === '/rest/v1/competitions') res.end(JSON.stringify(url.searchParams.get('select') === 'sezona_koledarska' ? { sezona_koledarska: false } : competition()))
    else if (req.method === 'POST' && url.pathname === '/rest/v1/rpc/get_installed_historical_statistics_markers' && body === '{"p_competition_id":973}') res.end(JSON.stringify(installed()))
    else { res.statusCode = 400; res.end('{}') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const guard = `const original=globalThis.fetch;globalThis.fetch=(input,...args)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(u.origin!==${JSON.stringify(base)})throw Error('external source forbidden');return original(input,...args)}`
    const child = spawn(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(guard)}`, `scripts/${script}.mjs`, '--tekmovanje', 'mt-nl1', ...(id ? ['--zapisnik', id] : [])], { cwd: new URL('..', import.meta.url), env: { PATH: process.env.PATH, SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: 'fixture-only' } })
    let out = '', err = ''; child.stdout.on('data', x => out += x); child.stderr.on('data', x => err += x)
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve) })
    assert.equal(code, 0, err)
    assert.ok(calls.every(([method, path]) => method === 'GET' && path === '/rest/v1/competitions' || method === 'POST' && path === '/rest/v1/rpc/get_installed_historical_statistics_markers'))
    assert.equal(calls.filter(([method]) => method === 'POST').length, 1)
    return out
  } finally { await new Promise(resolve => server.close(resolve)) }
}

test('actual ordinary report CLI exits for the approved report before any provider read or mutation', async () => {
  assert.ok(policy())
  for (const id of ['mt50921445']) assert.match(await cli('uvoz-zapisnikov', id), /unavailable statistics/)
})

test('actual ordinary registration CLI accepts installed NL I without provider reads or mutations', async () => {
  assert.ok(policy())
  assert.match(await cli('uvoz-registracij'), /zapisnikov o prestopih ne objavlja/)
})

test('NL II stays unregistered while its additional historical decisions are pending',()=>assert.equal(getHistoricalStatisticsPolicy('mt-nl2'),null))
