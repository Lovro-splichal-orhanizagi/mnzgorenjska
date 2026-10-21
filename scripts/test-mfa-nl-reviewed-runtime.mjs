import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { viraZa } from './viri/index.mjs'
import { getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256, validateInstalledHistoricalStatisticsMarkers } from './lib/historical-statistics-policy.mjs'
import { assertHistoricalReportImportable } from './lib/historical-statistics-import.mjs'

const policy = (league='mt-nl1') => getHistoricalStatisticsPolicy(league)
const competition = (league='mt-nl1') => ({ id: league==='mt-nl1'?973:974, slug:league, name:league, source:'mfa',source_policy:league==='mt-nl1'?'mt-mfa-nl1-reviewed-history-v1':'mt-mfa-nl2-reviewed-history-v1',source_league_code:league==='mt-nl1'?'2601267/2027':'6234492/2027',active:false })
function installed(league='mt-nl1') {
  const p = policy(league); assert.ok(p, 'reviewed NL policy must exist')
  const sha = historicalStatisticsPolicySha256(p)
  return { installed: true, policyId: p.id, policySha256: sha, firstFantasyPlayedOn: league==='mt-nl1'?'2026-11-13':'2026-11-14', markers: p.entries.map((e, i) => {
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

async function cli(script, id,league='mt-nl1') {
  const calls = []
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    const url = new URL(req.url, 'http://localhost'); calls.push([req.method, url.pathname])
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'GET' && url.pathname === '/rest/v1/competitions') res.end(JSON.stringify(url.searchParams.get('select') === 'sezona_koledarska' ? { sezona_koledarska: false } : competition(league)))
    else if (req.method === 'POST' && url.pathname === '/rest/v1/rpc/get_installed_historical_statistics_markers' && body === JSON.stringify({p_competition_id:competition(league).id})) res.end(JSON.stringify(installed(league)))
    else { res.statusCode = 400; res.end('{}') }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const guard = `const original=globalThis.fetch;globalThis.fetch=(input,...args)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(u.origin!==${JSON.stringify(base)})throw Error('external source forbidden');return original(input,...args)}`
    const child = spawn(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(guard)}`, `scripts/${script}.mjs`, '--tekmovanje', league, ...(id ? ['--zapisnik', id] : [])], { cwd: new URL('..', import.meta.url), env: { PATH: process.env.PATH, SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: 'fixture-only' } })
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

test('NL II exact three approvals retain continuation provenance and leave other MFA policy hashes unchanged',()=>{
 const p=policy('mt-nl2');assert.ok(p,'all three reviewed NLII fixtures registered')
 assert.deepEqual(p.entries.map(e=>[e.sourceMatchId,e.sourceRound,e.playedOn,e.observedHomeScore,e.observedAwayScore,e.rawSha256]),[
 ['51962893',4,'2026-01-13',1,1,'87bae2121282e371e0784cfde1c96fdfd03148e9c5849fa57bc5ef3770ac3338'],
 ['50920572',7,'2025-12-14',0,0,'a3f0eac8e8c513484e983921671d8f2e1359e8d1cd397d1edb4371b5aa5169fe'],
 ['50920621',15,'2026-02-14',2,1,'0cf0ecc1687c9bd2220576fd9da705b33cfbcdd3fa2bdf7475a5b40bad6572ea'],
 ])
 assert.match(p.approvalReference,/call_8704b229964d4d00af0aea857b11fbf8/);assert.match(p.approvalReference,/call_4fd7f0aef4cc49e4bae88528b45fd483/)
 assert.deepEqual(p.reconciliation.sourceMatchIds,['50920555','51962893']);assert.equal(p.reconciliation.orderingAnchorSourceMatchId,'50920555')
 for(const[slug,sha]of[['mt-premier','393fc635d4160510198d206571730287b3a7b0d4e1c3a6556d5ce61c5964e863'],['mt-challenge','f9c679b4db11e2349e7152d5cf3eca55fbd08e816432714423b69fadfca9dc60'],['mt-nl1','c2e907bbf36778846c70782936bff3a8ff3d118d580bbd5b1942adc90641862b']])assert.equal(historicalStatisticsPolicySha256(policy(slug)),sha)
})
test('NL II complete installed three-marker binding skips every approved report and abandoned alias before provider reads',async()=>{
 const league='mt-nl2',c=competition(league),b=installed(league)
 assert.deepEqual(validateInstalledHistoricalStatisticsMarkers({competition:c,binding:b}),b)
 for(const binding of[undefined,{...b,markers:b.markers.slice(1)},{...b,markers:[...b.markers,b.markers[0]]}])assert.throws(()=>viraZa(c,{installedHistoricalMarkers:binding}),/binding|marker|installed/)
 for(const patch of[{id:973},{source_policy:null},{source_league_code:'6234492/2026'}])assert.throws(()=>viraZa({...c,...patch},{installedHistoricalMarkers:b}),/binding|policy|tuple|native/)
 const adapter=viraZa(c,{installedHistoricalMarkers:b})
 for(const code of['6234492/2026','6234492/2027'])for(const id of['mt51962893','mt50920572','mt50920621','mt50920555'])assert.deepEqual(await adapter.zapisniki(code,()=>{throw Error('provider forbidden')},{samoZapisnik:id}),[])
 await assert.rejects(adapter.zapisniki('6234492/2025',()=>{throw Error('provider forbidden')}),/foreign/)
 for(const e of policy(league).entries)assert.throws(()=>assertHistoricalReportImportable({competition:c,report:{id:'mt'+e.sourceMatchId,z:{}}}),/historical|fixture|policy/)
})
test('actual NL II report and registration CLIs accept installed context without provider reads or mutations',async()=>{
 for(const id of['mt51962893','mt50920572','mt50920621'])assert.match(await cli('uvoz-zapisnikov',id,'mt-nl2'),/unavailable statistics/)
 assert.match(await cli('uvoz-registracij',null,'mt-nl2'),/zapisnikov o prestopih ne objavlja/)
})
