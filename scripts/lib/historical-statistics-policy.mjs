// Exact prelaunch exceptions only. A classifier result never contains player statistics.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const MFA_POLICY_IDS = ['mt-premier-reviewed-history-2026-10-20-v1','mt-challenge-reviewed-history-2026-10-21-v1','mt-nl2-reviewed-history-2026-10-21-v1']
const mfaEntrySeason = (policy,entry) => MFA_POLICY_IDS.includes(policy.id) ? entry.season : policy.season
const exactMfaTuple = competition => (competition?.id===971 && competition?.slug==='mt-premier' && competition?.source_league_code==='58539/2027') || (competition?.id===972 && competition?.slug==='mt-challenge' && competition?.source_league_code==='2601248/2027') || (competition?.id===974 && competition?.slug==='mt-nl2' && competition?.source_league_code==='6234492/2027')
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
    if (!Array.isArray(policy.entries) || !policy.entries.length) fail('empty policy entries')
    for (const entry of policy.entries) {
      if ('season' in entry && !(MFA_POLICY_IDS.includes(policy.id) && policy.provider === 'mfa' && ((policy.competitionSlug === 'mt-premier' && policy.sourcePolicy === 'mt-mfa-reviewed-history-v1') || (policy.competitionSlug === 'mt-challenge' && policy.sourcePolicy === 'mt-mfa-challenge-reviewed-history-v1') || (policy.competitionSlug === 'mt-nl2' && policy.sourcePolicy === 'mt-mfa-nl2-reviewed-history-v1')) && /^\d{4}\/\d{2}$/.test(entry.season))) fail('unsupported entry season override')
      if (policy.provider === 'mfa' && (!MFA_POLICY_IDS.includes(policy.id) || !['2025/26','2026/27'].includes(entry.season))) fail('unsupported MFA entry season')
      for (const field of ['sourceMatchId', 'sourceCompetitionId', 'homeSourceClubId', 'awaySourceClubId', 'sourceUrl', 'reasonCode']) if (!text(entry?.[field])) fail(`invalid entry ${field}`)
      if (policy.provider === 'fcf') for (const field of ['homeSourceCategoryId', 'awaySourceCategoryId']) if (!text(entry[field])) fail(`invalid entry ${field}`)
      if (entry.sourcePhase !== null && !text(entry.sourcePhase)) fail('invalid entry sourcePhase')
      if (!Number.isInteger(entry.sourceRound) || entry.sourceRound < 1) fail('invalid entry sourceRound')
      if (!dateOnly(entry.playedOn)) fail('invalid entry playedOn')
      if (!SHA256.test(entry.rawSha256 ?? '')) fail('invalid entry rawSha256')
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
  if(reviewed.provider==='mfa'&&!exactMfaTuple(competition))throw new Error('historical policy: exact MFA native competition/code binding differs')
  const exception = reviewed.entries.find(entry => entry.sourceMatchId === fixture?.sourceMatchId)
  if (!exception) return { kind: 'normal' }
  const identityFields = reviewed.provider === 'fcf' ? [...IDENTITY_FIELDS, 'homeSourceCategoryId', 'awaySourceCategoryId'] : IDENTITY_FIELDS
  for (const field of identityFields) if (fixture[field] !== exception[field]) throw new Error(`historical fixture identity differs: ${field}`)
  if (fixture.season !== mfaEntrySeason(reviewed,exception)) throw new Error('historical fixture identity differs: season')
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
  if(policy.provider==='mfa'&&!exactMfaTuple(competition))fail('exact MFA native competition/code binding differs')
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
    const expectedReportID=policy.provider==='dfb'?`de-dfb-${entry.sourceMatchId}`:policy.provider==='fcf'?`es${entry.sourceMatchId}`:policy.provider==='mfa'?`mt${entry.sourceMatchId}`:entry.sourceMatchId
    if(marker.reportId!==expectedReportID || marker.policyId!==policy.id || marker.policySha256!==sha || marker.rawSha256!==entry.rawSha256)fail('marker report/policy/raw binding differs')
    const {rawSha256,reasonCode,...identity}=entry
    const fixture={...identity,season:mfaEntrySeason(policy,entry)}
    if(historicalStatisticsPolicySha256(marker.fixture)!==historicalStatisticsPolicySha256(fixture))fail('fixture binding differs')
    if(entry.playedOn>=binding.firstFantasyPlayedOn)fail('marker is not strictly prelaunch')
    if(marker.statisticsStatus!=='unavailable_historical'||marker.importedAt!==null||marker.individualRowCount!==0)fail('unavailable marker contains individual/imported statistics')
    for(const field of ['matchId','roundId','homeTeamId','awayTeamId'])if(!dbID(marker[field]))fail(`invalid DB fixture binding ${field}`)
    if(marker.homeTeamId===marker.awayTeamId || matchIDs.has(marker.matchId))fail('duplicate DB match or same home/away club')
    matchIDs.add(marker.matchId)
  }
  return freeze(structuredClone(binding))
}
