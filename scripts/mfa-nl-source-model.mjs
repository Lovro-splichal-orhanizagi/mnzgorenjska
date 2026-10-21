// Derive ordinary source statistics from authenticated cache bodies, never HTTP.
import mfa, { vseTekme, krogiSezone, razcleniRazpored, vZapisnik } from './viri/mfa.mjs'
import { assertMfaReportTiming } from './viri/mfa-report-validation.mjs'
import { getHistoricalStatisticsPolicy, classifyHistoricalStatistics, historicalStatisticsPolicySha256 } from './lib/historical-statistics-policy.mjs'
import { sha256 } from './dfb-artifacts.mjs'
import { rokKroga } from './razporedi.mjs'

const fail = message => { throw Error(`MFA NL source model: ${message}`) }
const require = (ok, message) => { if (!ok) fail(message) }
const tuples = { 'mt-nl1': [973, '2601267'], 'mt-nl2': [974, '6234492'] }
const order = rows => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
const equalSet = (a, b) => historicalStatisticsPolicySha256(order(a)) === historicalStatisticsPolicySha256(order(b))
const cached = (cache, name) => { const body = cache.get(name); require(body, `missing required cached body ${name}`); return body }

export async function deriveNlSourceModel({ league, cache, currentOnly = false, firstFantasyPlayedOn }) {
  const tuple = tuples[league]; require(tuple && cache instanceof Map, 'fixed native league and authenticated cache required')
  const policy = getHistoricalStatisticsPolicy(league)
  require(currentOnly || policy, 'complete registered archive policy required before full source derivation')
  const competition = { id: tuple[0], slug: league, source: 'mfa', source_league_code: `${tuple[1]}/2027`, source_policy: policy?.sourcePolicy ?? null, firstFantasyPlayedOn }
  const read = async (_url, file) => {
    const match = /^tekma-(\d+)[.]json$/.exec(file)
    const name = match && cache.has(`po-sifri-${match[1]}.json`) ? `po-sifri-${match[1]}.json` : file
    return cached(cache, name).toString('utf8')
  }
  const reports = [], currentFixtures = [], schedules = []
  for (const year of currentOnly ? [2027] : [2026, 2027]) {
    const season = `${year - 1}/${String(year).slice(2)}`, code = `${tuple[1]}/${year}`
    const fixtures = await vseTekme(code, read, { mapa: null })
    const schedule = razcleniRazpored(fixtures), eligible = new Set(schedule.flatMap(r => r.tekme.map(t => String(t.mfaId))))
    schedules.push({ season, code, rounds: schedule })
    for (const { krog, t } of krogiSezone(fixtures)) {
      if (!eligible.has(String(t.id))) continue
      const scheduled = schedule.find(r => r.stevilka === krog).tekme.find(x => String(x.mfaId) === String(t.id))
      if (year === 2027) currentFixtures.push({ sourceMatchId: String(t.id), round: krog, playedOn: scheduled.datum, homeName: t.homeTeam.name, awayName: t.awayTeam.name, played: t.status === 'PLAYED' })
      if (t.status !== 'PLAYED') continue
      const result = JSON.parse(cached(cache, `tekma-${t.id}-izid.json`)), lineupRaw = cached(cache, `tekma-${t.id}-postava.json`)
      const homeGoals = Number(result.homeScore), awayGoals = Number(result.awayScore)
      require(result.status === 'PLAYED' && [result.homeScore, result.awayScore].every(s => /^\d+$/.test(String(s ?? '')) && Number.isSafeInteger(Number(s))), `official played result missing ${t.id}`)
      const descriptor = { sourceMatchId: String(t.id), sourceCompetitionId: String(t.competitionId), sourcePhase: null, sourceRound: krog, season, playedOn: scheduled.datum, homeSourceClubId: String(t.homeTeam.id), awaySourceClubId: String(t.awayTeam.id), sourceUrl: `https://matchcentre.mfa.com.mt/match/${t.id}`, observedHomeScore: homeGoals, observedAwayScore: awayGoals }
      const classification = classifyHistoricalStatistics({ competition, fixture: descriptor, rawSha256: sha256(lineupRaw) })
      const header = { reportId: `mt${t.id}`, season, round: krog, playedOn: scheduled.datum, homeName: t.homeTeam.name, awayName: t.awayTeam.name, homeGoals, awayGoals, statisticsStatus: classification.kind === 'unavailable_historical' ? 'unavailable_historical' : 'available' }
      if (classification.kind === 'unavailable_historical') { reports.push({ header, players: [], goals: [], sourceFixture: descriptor }); continue }
      const z = vZapisnik(result, JSON.parse(lineupRaw), { id: header.reportId, tekma: t, url: descriptor.sourceUrl })
      assertMfaReportTiming(z)
      require(!z.nepopoln && !z.kontumacija && [z.domaci, z.gostje].every(team => team.postava.length === 11 && team.postava.filter(p => p.vratar).length === 1), `complete XI/goalkeeper coverage required ${t.id}`)
      require(z.opozorila.every(w => /^dogodek "YELLOW" pri .+ brez minute$/.test(w)), `unreviewed report warning ${t.id}: ${z.opozorila.join('; ')}`)
      const players = mfa.nastopi(z).map(p => ({ regSt: p.regSt, side: p.ekipaIdx, shirt_number: p.st, started: p.zacetnik, minute_on: p.minutaOd, minute_off: p.minutaDo, minutes_played: p.minute, goals: p.goli, own_goals: p.avtogoli, penalties_scored: p.goliIzEnajstmetrovke, penalties_missed: p.zgreseneEnajstmetrovke, yellow_cards: p.rumeni, red_cards: p.rdeci, goals_conceded: p.prejetiGoli, clean_sheet: p.cleanSheet, is_goalkeeper: Boolean(p.vratar) }))
      require(players.every(p => Number.isSafeInteger(p.regSt) && p.regSt > 0 && [0, 1].includes(p.side)) && new Set(players.map(p => p.regSt)).size === players.length, `ambiguous source player identity ${t.id}`)
      const goals = z.goli.map(g => ({ regSt: g.regSt, side: g.ekipaIdx, minute: g.minuta, is_own_goal: g.avtogol, is_penalty: g.enajstmetrovka }))
      reports.push({ header, players, goals, sourceFixture: descriptor, warnings: z.opozorila })
    }
  }
  return { league, competitionId: tuple[0], policySha256: policy ? historicalStatisticsPolicySha256(policy) : null, currentOnly, reports, currentFixtures, schedules }
}

export function verifyNlSourceContract(model, contract) {
  require(contract.schemaVersion === 1 && contract.competitionId === model.competitionId && contract.policySha256 === model.policySha256 && !model.currentOnly, 'complete source/native contract identity required')
  require(equalSet(contract.reports, model.reports.map(r => r.header)) && equalSet(contract.currentFixtures, model.currentFixtures), 'reviewed contract differs from complete source header/fixture sets')
  require(contract.expectedArchiveRounds === model.schedules.find(s => s.season === '2025/26').rounds.length && contract.expectedCurrentFixtureCount === model.currentFixtures.length && contract.expectedCurrentClubCount === new Set(model.currentFixtures.flatMap(f => [f.homeName, f.awayName])).size, 'reviewed source bounds differ')
  return true
}

/** Both bootstrap current-only images and final full football images use this graph. */
export function verifyNlNativeFootball(model, image, { currentOnly = false } = {}) {
  const rounds = new Map(image.rounds.map(r => [r.id, r])), teams = new Map(image.teams.map(t => [t.id, t.name])), players = new Map(image.players.map(p => [p.id, p]))
  const matches = image.matches.filter(m => !currentOnly || rounds.get(m.round_id)?.season === '2026/27')
  const expected = model.reports.filter(r => !currentOnly || r.header.season === '2026/27')
  const actualReports = matches.filter(m => m.zapisnik_id != null)
  require(new Set(actualReports.map(m => m.zapisnik_id)).size === actualReports.length && equalSet(actualReports.map(m => m.zapisnik_id), expected.map(r => r.header.reportId)), 'native/source report set differs')
  require(currentOnly || matches.length === expected.length + model.currentFixtures.filter(f => !f.played).length, 'native match coverage differs from source reports and pending fixtures')
  const byReport = new Map(actualReports.map(m => [m.zapisnik_id, m]))
  let appearances = 0, goals = 0
  for (const report of expected) {
    const h = report.header, m = byReport.get(h.reportId), r = rounds.get(m.round_id)
    require(r.competition_id === model.competitionId && r.season === h.season && r.number === h.round && m.played_on === h.playedOn && teams.get(m.home_team_id) === h.homeName && teams.get(m.away_team_id) === h.awayName && m.home_goals === h.homeGoals && m.away_goals === h.awayGoals && m.statistics_status === h.statisticsStatus && m.source_url === `https://matchcentre.mfa.com.mt/match/${h.reportId.slice(2)}`, `native source header differs ${h.reportId}`)
    const apps = image.appearances.filter(a => a.match_id === m.id), gs = image.goals.filter(g => g.match_id === m.id)
    if (h.statisticsStatus === 'unavailable_historical') { require(m.imported_at === null && apps.length === 0 && gs.length === 0, 'unavailable fixture contains individual rows'); continue }
    require(m.imported_at != null && !m.kontumacija && !m.vir_brez_izida, `normal report not imported ${h.reportId}`)
    const side = tid => tid === m.home_team_id ? 0 : tid === m.away_team_id ? 1 : null
    const nativeApps = apps.map(a => {
      const p = players.get(a.player_id)
      require(p && p.competition_id === model.competitionId && Number.isSafeInteger(p.reg_st), `native player identity missing ${h.reportId}`)
      return Object.fromEntries(Object.keys(report.players[0] ?? {}).map(key => [key, key === 'regSt' ? p.reg_st : key === 'side' ? side(a.team_id) : a[key]]))
    })
    const nativeGoals = gs.map(g => ({ regSt: players.get(g.scorer_id)?.reg_st ?? null, side: side(g.team_id), minute: g.minute, is_own_goal: g.is_own_goal, is_penalty: g.is_penalty }))
    require(equalSet(nativeApps, report.players) && equalSet(nativeGoals, report.goals), `native/source appearance or goal multiset differs ${h.reportId}`)
    appearances += apps.length; goals += gs.length
  }
  const current = matches.filter(m => rounds.get(m.round_id)?.season === '2026/27')
  const nativeFixtures = current.map(m => ({ round: rounds.get(m.round_id).number, playedOn: m.played_on, homeName: teams.get(m.home_team_id), awayName: teams.get(m.away_team_id), played: m.imported_at != null }))
  require(equalSet(nativeFixtures, model.currentFixtures.map(({ sourceMatchId, ...f }) => f)), 'native current schedule differs from logical source fixtures')
  for (const m of current.filter(m => m.imported_at == null)) require(m.zapisnik_id === null && m.statistics_status === 'available' && m.home_goals === 0 && m.away_goals === 0 && !m.kontumacija && !m.vir_brez_izida && !image.appearances.some(a => a.match_id === m.id) && !image.goals.some(g => g.match_id === m.id), 'pending fixture contains uncertain or individual statistics')
  require(!matches.some(m => m.zapisnik_id === 'mt50920555'), 'abandoned continuation header forbidden')
  return { reports: expected.length, appearances, goals, currentFixtures: current.length, exactParity: true }
}

export function verifyNlOpening(model, opening, competition) {
  const native = opening.round, source = model.schedules.find(s => s.season === '2026/27').rounds.find(r => r.stevilka === native.number)
  require(source?.tekme.length > 0 && source.tekme.every(t => !t.odigrana), 'opening must be an actual unplayed source round')
  const first = [...source.tekme].sort((a, b) => `${a.datum}T${a.ura}`.localeCompare(`${b.datum}T${b.ura}`))[0]
  const deadline = rokKroga(first.datum, first.ura, competition.rok_pomak_ur ?? 6)
  require(native.played_on === first.datum && Date.parse(native.deadline_at) === Date.parse(deadline) && Date.parse(deadline) > Date.now(), 'native opening date/deadline differs from source')
  return { round: native.number, playedOn: first.datum, deadlineAt: deadline }
}
