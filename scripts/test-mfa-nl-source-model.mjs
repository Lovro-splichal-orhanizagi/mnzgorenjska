import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const moduleURL = new URL('./mfa-nl-source-model.mjs', import.meta.url)
const fixture = name => JSON.parse(readFileSync(new URL('./vzorci/' + name, import.meta.url)))
function cache() {
  const match = fixture('mt-mfa-pastMatches-6234492-2027.json').find(t => t.id === 53186745)
  assert.ok(match)
  return new Map(Object.entries({
    'standings-6234492-2027.json': fixture('mt-mfa-standings-6234492-2027.json'),
    'pastMatches-6234492-2027-1.json': [match],
    'upcomingMatches-6234492-2027-1.json': [],
    'tekma-53186745-izid.json': fixture('mt-mfa-tekma-53186745-izid.json'),
    'tekma-53186745-postava.json': fixture('mt-mfa-tekma-53186745-postava.json'),
  }).map(([n, value]) => [n, Buffer.from(JSON.stringify(value))]))
}
test('source model derives retained scorer, substitutions and cards without network or cache writes', async () => {
  assert.ok(existsSync(moduleURL))
  const { deriveNlSourceModel } = await import(moduleURL)
  const c = cache(), before = [...c].map(([n, b]) => [n, b.toString()])
  const m = await deriveNlSourceModel({ league: 'mt-nl2', cache: c, currentOnly: true, firstFantasyPlayedOn: '2026-11-01' })
  assert.equal(m.reports.length, 1)
  assert.equal(m.currentFixtures.length, 1)
  assert.deepEqual(m.reports[0].header, { reportId: 'mt53186745', season: '2026/27', round: 1, playedOn: '2026-10-11', homeName: 'Kirkop United', awayName: 'Ghaxaq', homeGoals: 2, awayGoals: 1, statisticsStatus: 'available' })
  assert.equal(m.reports[0].players.filter(p => p.started).length, 22)
  assert.equal(m.reports[0].players.filter(p => !p.started && p.minutes_played > 0).length, 10)
  assert.equal(m.reports[0].goals.length, 3)
  assert.deepEqual([...c].map(([n, b]) => [n, b.toString()]), before)
})
test('missing cached source or a missing on-field red time cannot become a normal report', async () => {
  const { deriveNlSourceModel } = await import(moduleURL)
  const missing = cache(); missing.delete('tekma-53186745-postava.json')
  await assert.rejects(deriveNlSourceModel({ league: 'mt-nl2', cache: missing, currentOnly: true }), /missing.*cached/)
  const red = cache(), body = JSON.parse(red.get('tekma-53186745-postava.json')), player = body.homeTeam.players[0]
  player.events.push({ id: 99999999, type: 'RED', time: "'", playerId: player.id, playerName: player.name })
  red.set('tekma-53186745-postava.json', Buffer.from(JSON.stringify(body)))
  await assert.rejects(deriveNlSourceModel({ league: 'mt-nl2', cache: red, currentOnly: true }), /dismissal.*minute/)
})

test('native semantic comparison catches scorer identity, minute and fantasy counter drift', async () => {
  const { deriveNlSourceModel, verifyNlNativeFootball } = await import(moduleURL)
  const m = await deriveNlSourceModel({ league: 'mt-nl2', cache: cache(), currentOnly: true })
  const report = m.reports[0], h = report.header
  // A small native-shaped graph for this retained report, not launch coverage.
  const image = { rounds: [{ id: 1, competition_id: 974, season: '2026/27', number: 1 }], teams: [{ id: 10, name: h.homeName }, { id: 11, name: h.awayName }], players: report.players.map((p, i) => ({ id: i + 100, competition_id: 974, reg_st: p.regSt })), matches: [{ id: 20, round_id: 1, home_team_id: 10, away_team_id: 11, played_on: h.playedOn, home_goals: 2, away_goals: 1, zapisnik_id: h.reportId, source_url: 'https://matchcentre.mfa.com.mt/match/53186745', statistics_status: 'available', imported_at: '2026-10-12T00:00Z', kontumacija: false, vir_brez_izida: false }] }
  image.appearances = report.players.map(({ regSt, side, ...a }) => ({ ...a, player_id: image.players.find(p => p.reg_st === regSt).id, team_id: 10 + side, match_id: 20 }))
  image.goals = report.goals.map(({ regSt, side, ...g }) => ({ ...g, scorer_id: image.players.find(p => p.reg_st === regSt).id, team_id: 10 + side, match_id: 20 }))
  assert.equal(verifyNlNativeFootball(m, image).exactParity, true)
  for (const mutate of [x => { x.rounds.push({id:2,competition_id:974,season:'2025/26',number:1}); x.matches.push({...x.matches[0],id:21,round_id:2,zapisnik_id:null,imported_at:null}) }, x => x.appearances[0].penalties_missed++, x => x.appearances[0].minute_off--, x => x.appearances[0].player_id = x.appearances[1].player_id, x => x.goals[0].scorer_id = x.appearances[0].player_id, x => x.matches[0].home_goals++]) {
    const wrong = structuredClone(image); mutate(wrong)
    assert.throws(() => verifyNlNativeFootball(m, wrong), /native.*differs/)
  }
})

test('registered NL II full source derivation still requires the entire retained archive inventory',async()=>{
 const {deriveNlSourceModel}=await import(moduleURL)
 await assert.rejects(deriveNlSourceModel({league:'mt-nl2',cache:cache(),currentOnly:false}),/missing required cached body/)
})

test('source contract comparison ignores PostgreSQL JSONB object-key order and array order',async()=>{
 const {verifyNlSourceContract}=await import(moduleURL)
 const jsonb=value=>Array.isArray(value)?value.map(jsonb):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort((a,b)=>Buffer.byteLength(a)-Buffer.byteLength(b)||a.localeCompare(b)).map(k=>[k,jsonb(value[k])])):value
 // Synthetic two-row contract isolates JSONB transport semantics; these are not launch fixtures.
 const reports=[{reportId:'mt900',season:'2025/26',round:1,playedOn:'2025-10-01',homeName:'A',awayName:'B',homeGoals:0,awayGoals:0,statisticsStatus:'available'},{reportId:'mt100',season:'2025/26',round:2,playedOn:'2025-10-02',homeName:'B',awayName:'A',homeGoals:0,awayGoals:0,statisticsStatus:'available'}]
 const fixtures=[{sourceMatchId:'900',round:1,playedOn:'2026-11-01',homeName:'A',awayName:'B',played:false},{sourceMatchId:'100',round:2,playedOn:'2026-11-02',homeName:'B',awayName:'A',played:false}]
 const model={competitionId:973,policySha256:'f'.repeat(64),currentOnly:false,reports:reports.map(header=>({header})),currentFixtures:fixtures,schedules:[{season:'2025/26',rounds:[{},{}]}]}
 const contract=jsonb({schemaVersion:1,competitionId:973,policySha256:model.policySha256,reports:[...reports].reverse(),currentFixtures:[...fixtures].reverse(),expectedArchiveRounds:2,expectedCurrentFixtureCount:2,expectedCurrentClubCount:2})
 assert.equal(verifyNlSourceContract(model,contract),true)
 contract.reports[0].homeGoals=1
 assert.throws(()=>verifyNlSourceContract(model,contract),/differs/)
})

function nl2Contract(){
 const sql=readFileSync(new URL('../supabase/migrations/20261021203100_mfa_nl2_source_contract.sql',import.meta.url),'utf8'),match=sql.match(/values\(974,'([a-f0-9]{64})',\$contract\$(.*?)\$contract\$::jsonb\)/s)
 assert.ok(match,'exact reviewed NLII contract seed');return{sha:match[1],document:JSON.parse(match[2])}
}
test('NL II source contract pins all167 headers, exact3 unavailable fixtures and actual future opening',async()=>{
 const{historicalStatisticsPolicySha256:sha,getHistoricalStatisticsPolicy:policy}=await import('./lib/historical-statistics-policy.mjs'),{NL_REVIEWED_SOURCES}=await import('./mfa-nl-reviewed-evidence.mjs'),contract=nl2Contract(),doc=contract.document
 assert.equal(sha(doc),contract.sha);assert.equal(doc.policySha256,sha(policy('mt-nl2')));assert.deepEqual(doc.sourceArtifact,NL_REVIEWED_SOURCES['mt-nl2'].artifact)
 assert.equal(doc.competitionId,974);assert.equal(doc.reports.length,167);assert.equal(doc.reports.filter(r=>r.season==='2025/26').length,132);assert.equal(doc.reports.filter(r=>r.season==='2026/27').length,35)
 assert.deepEqual(doc.reports.filter(r=>r.statisticsStatus==='unavailable_historical').map(r=>r.reportId).sort(),['mt50920572','mt50920621','mt51962893']);assert.ok(!doc.reports.some(r=>r.reportId==='mt50920555'))
 assert.equal(doc.expectedArchiveRounds,22);assert.equal(doc.expectedCurrentFixtureCount,77);assert.equal(doc.currentFixtures.length,77);assert.equal(doc.expectedCurrentClubCount,14)
 assert.deepEqual(doc.opening,{deadlineAt:'2026-11-14T12:00:00.000Z',playedOn:'2026-11-14',round:6})
})
const retainedRoot=process.env.MFA_NL_RETAINED_ROOT
test('actual retained NLII source derives129 complete archive reports+3 empty markers and exact35 current reports',{skip:!retainedRoot},async()=>{
 const{readdirSync}=await import('node:fs'),{join}=await import('node:path'),{deriveNlSourceModel,verifyNlSourceContract,verifyNlNativeFootball,verifyNlOpening}=await import(moduleURL)
 const dir=join(retainedRoot,'nl2-public-capture-39655969899/files/audit/cache'),cache=new Map(readdirSync(dir).map(n=>[n,readFileSync(join(dir,n))])),before=[...cache].map(([n,b])=>[n,b.toString()]),model=await deriveNlSourceModel({league:'mt-nl2',cache,firstFantasyPlayedOn:'2026-11-14'}),contract=nl2Contract().document
 assert.equal(verifyNlSourceContract(model,contract),true)
 const unavailable=model.reports.filter(r=>r.header.statisticsStatus==='unavailable_historical');assert.equal(unavailable.length,3);assert.ok(unavailable.every(r=>r.players.length===0&&r.goals.length===0))
 assert.equal(model.reports.filter(r=>r.header.season==='2025/26'&&r.header.statisticsStatus==='available').length,129)
 const native=JSON.parse(readFileSync(join(retainedRoot,'mt-nl2-native-football.json'))),parity=verifyNlNativeFootball(model,native,{currentOnly:true})
 assert.deepEqual(parity,{reports:35,appearances:1080,goals:132,currentFixtures:77,exactParity:true})
 const round=native.rounds.find(r=>r.number===6&&r.season==='2026/27');assert.deepEqual(verifyNlOpening(model,{round,fixtures:native.matches.filter(m=>m.round_id===round.id)},native.competition),{round:6,playedOn:'2026-11-14',deadlineAt:'2026-11-14T12:00:00.000Z'})
 assert.deepEqual([...cache].map(([n,b])=>[n,b.toString()]),before)
})
