// Exact prelaunch exceptions only. A classifier result never contains player statistics.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const MFA_POLICY_IDS = ['mt-premier-reviewed-history-2026-10-20-v1','mt-challenge-reviewed-history-2026-10-21-v1','mt-nl2-reviewed-history-2026-10-21-v1','mt-nl1-reviewed-history-2026-10-21-v1']
const WEST_V2_POLICY_ID = 'de-dfb-west-prelaunch-unavailable-v2'
const WEST_V2_CURRENT_IDS = new Set(['2425409','2425474'])
const exactWestV2 = policy => policy?.id === WEST_V2_POLICY_ID && policy.provider === 'dfb' && policy.competitionSlug === 'de-regionalliga-west' && policy.sourcePolicy === WEST_V2_POLICY_ID && policy.season === '2025/26'
const entrySeason = (policy,entry) => MFA_POLICY_IDS.includes(policy.id) || (exactWestV2(policy) && WEST_V2_CURRENT_IDS.has(entry.sourceMatchId)) || (policy?.id==='gb-npl-midlands-historical-unavailable-2026-10-23-v1' && entry?.sourceMatchId==='6896abc31c6f4c56212c7ac5') ? entry.season : policy.season
const exactMfaTuple = competition => (competition?.id===971 && competition?.slug==='mt-premier' && competition?.source_league_code==='58539/2027') || (competition?.id===972 && competition?.slug==='mt-challenge' && competition?.source_league_code==='2601248/2027') || (competition?.id===973 && competition?.slug==='mt-nl1' && competition?.source_league_code==='2601267/2027') || (competition?.id===974 && competition?.slug==='mt-nl2' && competition?.source_league_code==='6234492/2027')
const EXISTING_HISTORY_SOURCE_POLICY = 'reviewed-existing-history-20261023-v1'
const EXISTING_HISTORY_TUPLES = {
  'hu-cs-u19-toth': { id: 625, provider: 'mlsz', code: '67/6/34102', policyId: 'hu-cs-u19-toth-historical-unavailable-2026-10-24-v1', season: '2025/26' },
  'hu-pe-u19-c': { id: 637, provider: 'mlsz', code: '67/14/34250', policyId: 'hu-pe-u19-c-historical-unavailable-2026-10-24-v1', season: '2025/26' },
  'gb-npl-midlands': { id: 979, provider: 'isthmian', code: 'npl/67d7c7bb74247876e6dae40c/2026-27', policyId: 'gb-npl-midlands-historical-unavailable-2026-10-23-v1' },
  'gb-sfl-d1-south': { id: 984, provider: 'isthmian', code: 'sfl/69d0bdf9b616bafb97331d41/2026-27', policyId: 'gb-sfl-d1-south-historical-unavailable-2026-10-23-v1' },
  'ro-liga3-s1': { id: 497, provider: 'hlf', code: 'national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1', policyId: 'ro-liga3-s1-historical-unavailable-2026-10-23-v1' },
  'ro-ab-l5-s2': { id: 499, provider: 'hlf', code: 'judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2', policyId: 'ro-ab-l5-s2-historical-unavailable-2026-10-24-v1' },
  'ro-ab-l4-s2': { id: 501, provider: 'hlf', code: 'judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2', policyId: 'ro-ab-l4-s2-historical-unavailable-2026-10-23-v1' },
  'ba-wwin-liga-bih': { id: 998, provider: 'nfsbih', code: 'wwin-liga-bih/54152223', policyId: 'ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1' },
  'md-liga-2': { id: 1107, provider: 'fmf', code: 'liga-2-1782306996/877', policyId: 'md-liga-2-historical-unavailable-2026-10-23-v1' },
}
const exactNplArchiveEntry = (policy,entry) => policy?.id==='gb-npl-midlands-historical-unavailable-2026-10-23-v1' && policy.provider==='isthmian' && policy.competitionSlug==='gb-npl-midlands' && policy.sourcePolicy===EXISTING_HISTORY_SOURCE_POLICY && policy.competitionId===979 && policy.sourceLeagueCode==='npl/67d7c7bb74247876e6dae40c/2026-27' && entry?.sourceMatchId==='6896abc31c6f4c56212c7ac5' && entry?.season==='2025/26'
const exactExistingHistoryTuple = (policy, competition) => {
  const expected = EXISTING_HISTORY_TUPLES[policy?.competitionSlug]
  return !!expected && policy.id === expected.policyId && policy.provider === expected.provider && policy.sourcePolicy === EXISTING_HISTORY_SOURCE_POLICY && policy.season === (expected.season ?? '2026/27') && policy.competitionId === expected.id && policy.sourceLeagueCode === expected.code && competition?.id === expected.id && competition?.source_league_code === expected.code
}
const exactHlfCompositeProof = policy => ['ro-liga3-s1-historical-unavailable-2026-10-23-v1','ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','ro-ab-l5-s2-historical-unavailable-2026-10-24-v1'].includes(policy?.id) && policy.provider === 'hlf' && policy.sourcePolicy === EXISTING_HISTORY_SOURCE_POLICY
const exactMdfmfProof = policy => policy?.id === 'md-liga-2-historical-unavailable-2026-10-23-v1' && policy.provider === 'fmf' && policy.competitionSlug === 'md-liga-2' && policy.competitionId === 1107 && policy.sourceLeagueCode === 'liga-2-1782306996/877' && policy.sourcePolicy === EXISTING_HISTORY_SOURCE_POLICY && policy.season === '2026/27' && policy.entries?.length === 2 && policy.entries.map(e=>e.sourceMatchId).sort().join(',') === '50422,50481'
const SHA256 = /^[a-f0-9]{64}$/
const text = value => typeof value === 'string' && value.trim().length > 0
const dateOnly = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype) throw new Error('policy: expected JSON object')
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
  throw new Error('policy: expected finite JSON value')
}

/** One sorted-key JSON representation for packet, JS and migration-pinned SQL policy hashes. */
export const historicalStatisticsPolicySha256 = policy => createHash('sha256').update(JSON.stringify(canonical(policy))).digest('hex')

export function validateHistoricalStatisticsRegistry(registry) {
  const fail = message => { throw new Error(`historical registry: ${message}`) }
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry.policies)) fail('unsupported schema')
  const policyIDs = new Set(), competitionSlugs = new Set(), matchIDs = new Set()
  for (const policy of registry.policies) {
    for (const field of ['id', 'provider', 'sourcePolicy', 'competitionSlug', 'season', 'approvalReference']) if (!text(policy?.[field])) fail(`invalid policy ${field}`)
    if (policyIDs.has(policy.id) || competitionSlugs.has(policy.competitionSlug)) fail('duplicate policy or competition')
    policyIDs.add(policy.id); competitionSlugs.add(policy.competitionSlug)
    if (!/^\d{4}\/\d{2}$/.test(policy.season)) fail('invalid policy season')
    if (!text(policy.recordedAt) || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(policy.recordedAt) || !Number.isFinite(Date.parse(policy.recordedAt))) fail('invalid policy recording time')
    if ('approvedAt' in policy) fail('policy must record evidence time, not an unknown approval send time')
    const exactTuple = EXISTING_HISTORY_TUPLES[policy.competitionSlug]
    if (exactTuple && (policy.provider !== exactTuple.provider || policy.id !== exactTuple.policyId || policy.sourcePolicy !== EXISTING_HISTORY_SOURCE_POLICY || policy.season !== (exactTuple.season ?? '2026/27') || policy.competitionId !== exactTuple.id || policy.sourceLeagueCode !== exactTuple.code)) fail('reviewed-existing-history exact competition/provider/code tuple differs')
    if (policy.sourcePolicy === EXISTING_HISTORY_SOURCE_POLICY && !exactTuple) fail('unregistered reviewed-existing-history competition')
    if (policy.provider === 'isthmian' && exactTuple && !['gb-npl-midlands', 'gb-sfl-d1-south'].includes(policy.competitionSlug)) fail('unreviewed Isthmian history tuple')
    if (policy.provider === 'hlf' && exactTuple && !['ro-liga3-s1','ro-ab-l4-s2','ro-ab-l5-s2'].includes(policy.competitionSlug)) fail('unreviewed HLF history tuple')
    if (policy.provider === 'nfsbih' && exactTuple && policy.competitionSlug !== 'ba-wwin-liga-bih') fail('unreviewed NFSBiH history tuple')
    if (policy.provider === 'fmf' && exactTuple && !exactMdfmfProof(policy)) fail('unreviewed FMF history tuple')
    if (!Array.isArray(policy.entries) || !policy.entries.length) fail('empty policy entries')
    for (const entry of policy.entries) {
      const exactMfaOverride = MFA_POLICY_IDS.includes(policy.id) && policy.provider === 'mfa' && ((policy.competitionSlug === 'mt-premier' && policy.sourcePolicy === 'mt-mfa-reviewed-history-v1') || (policy.competitionSlug === 'mt-challenge' && policy.sourcePolicy === 'mt-mfa-challenge-reviewed-history-v1') || (policy.competitionSlug === 'mt-nl1' && policy.sourcePolicy === 'mt-mfa-nl1-reviewed-history-v1') || (policy.competitionSlug === 'mt-nl2' && policy.sourcePolicy === 'mt-mfa-nl2-reviewed-history-v1')) && /^\d{4}\/\d{2}$/.test(entry.season)
      const exactWestOverride = exactWestV2(policy) && WEST_V2_CURRENT_IDS.has(entry.sourceMatchId) && entry.season === '2026/27'
      const exactArchiveOverride = exactNplArchiveEntry(policy,entry)
      if ('season' in entry && !(exactMfaOverride || exactWestOverride || exactArchiveOverride)) fail('unsupported entry season override')
      if (exactArchiveOverride && entry.season !== '2025/26') fail('unsupported NPL archive entry season')
      if (exactWestV2(policy) && WEST_V2_CURRENT_IDS.has(entry.sourceMatchId) && entry.season !== '2026/27') fail('unsupported West current entry season')
      if (policy.provider === 'mfa' && (!MFA_POLICY_IDS.includes(policy.id) || !['2025/26','2026/27'].includes(entry.season))) fail('unsupported MFA entry season')
      for (const field of ['sourceMatchId', 'sourceCompetitionId', 'homeSourceClubId', 'awaySourceClubId', 'sourceUrl', 'reasonCode']) if (!text(entry?.[field])) fail(`invalid entry ${field}`)
      if (policy.provider === 'fcf') for (const field of ['homeSourceCategoryId', 'awaySourceCategoryId']) if (!text(entry[field])) fail(`invalid entry ${field}`)
      if (entry.sourcePhase !== null && !text(entry.sourcePhase)) fail('invalid entry sourcePhase')
      if (!Number.isInteger(entry.sourceRound) || entry.sourceRound < 1) fail('invalid entry sourceRound')
      if (!dateOnly(entry.playedOn)) fail('invalid entry playedOn')
      if (!SHA256.test(entry.rawSha256 ?? '')) fail('invalid entry rawSha256')
      if (exactHlfCompositeProof(policy)) {
        const proof = entry.sourceProof
        if (!SHA256.test(proof?.roundResponseSha256 ?? '') || !SHA256.test(proof?.matchSheetSha256 ?? '') || !text(proof?.matchSheetId) || proof?.rawSha256Formula !== 'SHA256(JSON.stringify({matchSheetSha256,roundResponseSha256}) in lexicographic key order)') fail('invalid HLF raw source proof')
        const combined = createHash('sha256').update(JSON.stringify({ matchSheetSha256: proof.matchSheetSha256, roundResponseSha256: proof.roundResponseSha256 })).digest('hex')
        if (combined !== entry.rawSha256) fail('HLF composite raw source hash differs')
      } else if (exactMdfmfProof(policy)) {
        const proof=entry.sourceProof
        if(!SHA256.test(proof?.calendarSha256??'')||!SHA256.test(proof?.matchDetailSha256??'')||!SHA256.test(proof?.roundPageSha256??'')||proof?.pdfPublished!==false||proof?.clubIdentityKind!=='published_name'||proof?.rawSha256Formula!=='SHA256(JSON.stringify({calendarSha256,matchDetailSha256,roundPageSha256}) in lexicographic key order)')fail('invalid FMF public schedule/detail proof')
        if(entry.sourceUrl!==`https://www.fmf.md/home/meciuri-info?match=${entry.sourceMatchId}`||entry.homeSourceClubId===''||entry.awaySourceClubId===''||entry.sourceCompetitionId!=='877')fail('FMF exact public match identity differs')
        const combined=createHash('sha256').update(JSON.stringify({calendarSha256:proof.calendarSha256,matchDetailSha256:proof.matchDetailSha256,roundPageSha256:proof.roundPageSha256})).digest('hex')
        if(combined!==entry.rawSha256)fail('FMF composite raw source hash differs')
      } else if ('sourceProof' in entry) fail('source proof is only supported for exact HLF or FMF composite captures')
      for (const field of ['observedHomeScore', 'observedAwayScore']) if (!Number.isInteger(entry[field]) || entry[field] < 0) fail(`invalid entry ${field}`)
      let url
      try { url = new URL(entry.sourceUrl) } catch { fail('invalid entry sourceUrl') }
      if (url.protocol !== 'https:' || url.username || url.password || url.hash) fail('invalid entry sourceUrl')
      const key = `${policy.provider}:${entry.sourceMatchId}`
      if (matchIDs.has(key)) fail('duplicate source match descriptor')
      matchIDs.add(key)
    }
    historicalStatisticsPolicySha256(policy) // Reject non-JSON values before accepting the registry.
  }
  return true
}

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
const registry = JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json', import.meta.url), 'utf8'))
validateHistoricalStatisticsRegistry(registry)
freeze(registry)

/** Returns only reviewed, immutable repository policy; no caller-supplied registry replacement. */
export function getHistoricalStatisticsPolicy(competitionSlug) {
  return registry.policies.find(policy => policy.competitionSlug === competitionSlug) ?? null
}

const IDENTITY_FIELDS = [
  'sourceMatchId', 'sourceCompetitionId', 'sourcePhase', 'sourceRound', 'playedOn',
  'homeSourceClubId', 'awaySourceClubId', 'sourceUrl', 'observedHomeScore', 'observedAwayScore',
]

/**
 * Initial offline replay only. Installed markers must be bound and skipped before provider reads.
 * firstFantasyPlayedOn is the verified first fantasy fixture date, never today's date.
 */
export function classifyHistoricalStatistics({ competition, fixture, rawSha256, policy }) {
  const identityPolicy = registry.policies.find(known => known.provider === competition?.source && known.entries.some(entry => entry.sourceMatchId === fixture?.sourceMatchId))
  const candidate = policy ?? getHistoricalStatisticsPolicy(competition?.slug) ?? identityPolicy
  if (identityPolicy && candidate?.id !== identityPolicy.id) throw new Error('historical policy: registered provider/match belongs to another competition policy')
  if (!candidate) {
    if (competition?.source_policy != null) throw new Error('historical policy: unknown competition/policy opt-in')
    return { kind: 'normal' }
  }
  const reviewed = registry.policies.find(known => known.id === candidate.id)
  if (!reviewed || historicalStatisticsPolicySha256(candidate) !== historicalStatisticsPolicySha256(reviewed)) throw new Error('historical policy: unreviewed policy')
  if (competition?.slug !== reviewed.competitionSlug || competition?.source !== reviewed.provider || competition?.source_policy !== reviewed.sourcePolicy) throw new Error('historical policy: competition/provider/policy binding differs')
  if (['isthmian','hlf','nfsbih','fmf'].includes(reviewed.provider) && !exactExistingHistoryTuple(reviewed, competition)) throw new Error('historical policy: exact reviewed-existing-history native competition/code binding differs')
  if(reviewed.provider==='mfa'&&!exactMfaTuple(competition))throw new Error('historical policy: exact MFA native competition/code binding differs')
  if(reviewed.provider==='mlsz'&&reviewed.sourcePolicy===EXISTING_HISTORY_SOURCE_POLICY&&!exactExistingHistoryTuple(reviewed,competition))throw new Error('historical policy: exact reviewed-existing-history MLSZ binding differs')
  if(reviewed.provider==='mlsz'&&(competition.id!==reviewed.competitionId||competition.source_league_code!==reviewed.sourceLeagueCode))throw new Error('historical policy: exact MLSZ competition/code binding differs')
  const exception = reviewed.entries.find(entry => entry.sourceMatchId === fixture?.sourceMatchId)
  if (!exception) return { kind: 'normal' }
  const identityFields = reviewed.provider === 'fcf' ? [...IDENTITY_FIELDS, 'homeSourceCategoryId', 'awaySourceCategoryId'] : ['hlf','fmf'].includes(reviewed.provider) ? [...IDENTITY_FIELDS, 'sourceProof'] : IDENTITY_FIELDS
  for (const field of identityFields) {
    const actual = fixture[field], expected = exception[field]
    const same = actual !== null && typeof actual === 'object' || expected !== null && typeof expected === 'object'
      ? JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected))
      : actual === expected
    if (!same) throw new Error(`historical fixture identity differs: ${field}`)
  }
  if (fixture.season !== entrySeason(reviewed,exception)) throw new Error('historical fixture identity differs: season')
  if (!SHA256.test(rawSha256 ?? '') || rawSha256 !== exception.rawSha256) throw new Error('historical raw SHA256 differs from approved packet')
  if (!dateOnly(competition.firstFantasyPlayedOn) || exception.playedOn >= competition.firstFantasyPlayedOn) throw new Error('historical policy: exception must be strictly prelaunch; valid first fantasy date required')
  return { kind: 'unavailable_historical', exception, policySha256: historicalStatisticsPolicySha256(reviewed) }
}

/** Runtime skip authority comes only from the complete service getter, never partial setup. */
export function validateInstalledHistoricalStatisticsMarkers({competition,binding}) {
  const fail=message=>{throw new Error(`historical installed markers: ${message}`)}
  const policy=getHistoricalStatisticsPolicy(competition?.slug)
  if(!policy) {
    if(competition?.source_policy!=null || binding?.installed)fail('unknown policy tuple')
    return null
  }
  if(competition.source!==policy.provider || competition.source_policy!==policy.sourcePolicy)fail('competition/provider/policy binding differs')
  if(['isthmian','hlf','nfsbih','fmf'].includes(policy.provider)&&!exactExistingHistoryTuple(policy,competition))fail('exact reviewed-existing-history native competition/code binding differs')
  if(policy.provider==='mfa'&&!exactMfaTuple(competition))fail('exact MFA native competition/code binding differs')
  if(policy.provider==='mlsz'&&policy.sourcePolicy===EXISTING_HISTORY_SOURCE_POLICY&&!exactExistingHistoryTuple(policy,competition))fail('exact reviewed-existing-history MLSZ binding differs')
  if(policy.provider==='mlsz'&&(competition.id!==policy.competitionId||competition.source_league_code!==policy.sourceLeagueCode))fail('exact MLSZ competition/code binding differs')
  const sha=historicalStatisticsPolicySha256(policy)
  if(binding?.installed!==true || binding.policyId!==policy.id || binding.policySha256!==sha)fail('complete installed policy binding required before provider traversal')
  if(!dateOnly(binding.firstFantasyPlayedOn) || (competition.firstFantasyPlayedOn!=null && competition.firstFantasyPlayedOn!==binding.firstFantasyPlayedOn))fail('first fantasy date binding differs')
  if(!Array.isArray(binding.markers)||binding.markers.length!==policy.entries.length)fail('incomplete or additional marker set')
  const nativeIDs=new Set(),matchIDs=new Set()
  const dbID=value=>Number.isSafeInteger(value)&&value>0
  for(const marker of binding.markers) {
    const entry=policy.entries.find(e=>e.sourceMatchId===marker?.sourceMatchId)
    if(!entry || nativeIDs.has(marker.sourceMatchId))fail('unknown or duplicate source identity')
    nativeIDs.add(marker.sourceMatchId)
    const expectedReportID=policy.provider==='dfb'?`de-dfb-${entry.sourceMatchId}`:policy.provider==='fcf'?`es${entry.sourceMatchId}`:policy.provider==='mfa'?`mt${entry.sourceMatchId}`:policy.provider==='isthmian'?`gb${entry.sourceMatchId}`:policy.provider==='nfsbih'?`ba${entry.sourceMatchId}`:policy.provider==='fmf'?`md${entry.sourceMatchId}`:entry.sourceMatchId
    if(marker.reportId!==expectedReportID || marker.policyId!==policy.id || marker.policySha256!==sha || marker.rawSha256!==entry.rawSha256)fail('marker report/policy/raw binding differs')
    const {rawSha256,reasonCode,...identity}=entry
    const fixture={...identity,season:entrySeason(policy,entry)}
    if(historicalStatisticsPolicySha256(marker.fixture)!==historicalStatisticsPolicySha256(fixture))fail('fixture binding differs')
    if(entry.playedOn>=binding.firstFantasyPlayedOn)fail('marker is not strictly prelaunch')
    if(marker.statisticsStatus!=='unavailable_historical'||marker.importedAt!==null||marker.individualRowCount!==0)fail('unavailable marker contains individual/imported statistics')
    for(const field of ['matchId','roundId','homeTeamId','awayTeamId'])if(!dbID(marker[field]))fail(`invalid DB fixture binding ${field}`)
    if(marker.homeTeamId===marker.awayTeamId || matchIDs.has(marker.matchId))fail('duplicate DB match or same home/away club')
    matchIDs.add(marker.matchId)
  }
  return freeze(structuredClone(binding))
}
