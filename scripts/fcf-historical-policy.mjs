// FCF identity adapter only: normal reports still use the ordinary strict provider parser.
import { createHash } from 'node:crypto'
import {
  classifyHistoricalStatistics, getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256,
} from './lib/historical-statistics-policy.mjs'
import { drevoRsc, elementi, glavaZapisnika, jeElement, besedilo, tokRsc, vrsticeRsc, jeIzziv } from './viri/fcf.mjs'

const fail = message => { throw new Error(`FCF historical policy: ${message}`) }
const nativeId = id => {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) fail('expected exact native report identity')
  return id
}
const fixtureFor = (policy, entry) => {
  const { rawSha256, reasonCode, ...identity } = entry
  return { ...identity, season:policy.season }
}
function selection(competition, id) {
  const policy=getHistoricalStatisticsPolicy(competition?.slug)
  const entry=policy?.entries.find(entry => entry.sourceMatchId === id)
  // The shared classifier owns provider/policy/foreign-ID/strict-prelaunch validation.
  const result=classifyHistoricalStatistics({competition, policy:policy ?? undefined,
    fixture:entry ? fixtureFor(policy,entry) : {sourceMatchId:id}, rawSha256:entry?.rawSha256})
  return { policy, entry, result }
}
const envelope = (policy, entry, fixture) => ({
  id:`es${entry.sourceMatchId}`, url:entry.sourceUrl, z:null, fixture, rawSha256:entry.rawSha256,
  statisticsStatus:'unavailable_historical',
  historicalStatistics:{policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),reasonCode:entry.reasonCode},
})

function rawFixture(html, id, competition) {
  if (typeof html !== 'string' || jeIzziv(html)) fail('raw source unavailable/challenged')
  const route=vrsticeRsc(tokRsc(html)).get('0')?.c
  if (JSON.stringify(route) !== JSON.stringify(['','ca','competicio','acta',id])) fail('raw route identity differs')
  const roots=drevoRsc(html), all=[...elementi(roots)], header=glavaZapisnika(roots)
  const group=/^es-ct-(segona|tercera)-g([1-9]\d*)$/.exec(competition.slug)
  if (!group || header.tekmovanje !== `${group[1].toUpperCase()} CATALANA` || header.skupina !== `GRUP ${group[2]}` || !header.zaprt || !header.izid) fail('raw competition/group/result identity differs')
  const top=all.find(e => e.props?.title === 'Acta del partit')
  const row=[...elementi(top)].find(e => e.tip === 'div' && e.otroci.filter(jeElement).length === 3 && /-/.test(besedilo(e.otroci.filter(jeElement)[1])))
  const sides=row?.otroci.filter(jeElement)
  if (!sides) fail('raw team header identity missing')
  const clubs=[sides[0],sides[2]].map(side => {
    const links=[...new Set([...elementi(side)].map(e=>e.props?.href).filter(href => /^\/ca\/clubs\/[1-9]\d*\/categories\/[1-9]\d*$/.test(href ?? '')))]
    if (links.length !== 1) fail('raw team/category identity ambiguous')
    const parts=links[0].split('/')
    return {club:parts[3],category:parts[5]}
  })
  const groups=[...new Set(all.filter(e=>e.props?.player).map(e=>e.props.codgrupo).filter(Boolean))]
  if (groups.length !== 1 || !/^[1-9]\d*$/.test(groups[0])) fail('raw source group identity ambiguous')
  return {sourceMatchId:id,sourceCompetitionId:String(groups[0]),sourcePhase:null,sourceRound:header.krog,playedOn:header.datum,season:header.sezona,
    homeSourceClubId:clubs[0].club,awaySourceClubId:clubs[1].club,homeSourceCategoryId:clubs[0].category,awaySourceCategoryId:clubs[1].category,
    sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${id}`,observedHomeScore:header.izid.domaci,observedAwayScore:header.izid.gostje}
}

/** Initial installation consumes exact retained bytes/header before any individual derivation. */
export function classifyFcfHistoricalStatistics({competition,id,html}) {
  nativeId(id)
  const {policy,entry,result}=selection(competition,id)
  if (result.kind === 'normal') return result
  const rawSha256=createHash('sha256').update(html ?? '').digest('hex')
  if (rawSha256 !== entry.rawSha256) fail('raw SHA256 differs from approved receipt')
  const fixture=rawFixture(html,id,competition)
  return classifyFcfHistoricalFixture({competition,fixture,rawSha256})
}

/** Pure provider identity boundary, also used after the raw wrapper computes the actual-byte digest. */
export function classifyFcfHistoricalFixture({competition,fixture,rawSha256}) {
  const id=nativeId(fixture?.sourceMatchId), {policy,entry,result}=selection(competition,id)
  if (result.kind === 'normal') return result
  classifyHistoricalStatistics({competition,fixture,rawSha256,policy})
  if (historicalStatisticsPolicySha256(fixture) !== historicalStatisticsPolicySha256(fixtureFor(policy,entry))) fail('fixture/category identity differs')
  return envelope(policy,entry,fixture)
}

/** Installed getter has already validated DB identities; still refuse any policy/marker drift. No source read. */
export function verifyFcfInstalledHistoricalMarker({competition,marker}) {
  const id=nativeId(marker?.sourceMatchId), {policy,entry,result}=selection(competition,id)
  if (result.kind !== 'unavailable_historical' || !entry) fail('unregistered installed marker')
  if (marker.reportId !== `es${id}` || marker.policyId !== policy.id || marker.policySha256 !== historicalStatisticsPolicySha256(policy) ||
      marker.rawSha256 !== entry.rawSha256 || marker.statisticsStatus !== 'unavailable_historical' || marker.importedAt !== null || marker.individualRowCount !== 0) fail('installed marker metadata differs')
  const fixture=fixtureFor(policy,entry)
  if (historicalStatisticsPolicySha256(marker.fixture) !== historicalStatisticsPolicySha256(fixture)) fail('installed marker fixture identity differs')
  for (const key of ['matchId','roundId','homeTeamId','awayTeamId']) if (!Number.isSafeInteger(marker[key]) || marker[key] < 1) fail(`installed marker ${key} invalid`)
  if (marker.homeTeamId === marker.awayTeamId) fail('installed marker team identity differs')
  return envelope(policy,entry,fixture)
}
