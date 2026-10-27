import {assertMfaReportTiming} from '../viri/mfa-report-validation.mjs'
import {FCF_SIX_SOURCE_POLICY,getFcfSixPolicy,validateFcfSixInstalledMarkers,classifyFcfSixHistoricalStatistics} from '../fcf-six-historical-policy.mjs'
import {validateHnsWomenClubBindings} from '../viri/hns-zenske-binding.mjs'
import {assertHnsWomenOfflineAuthority} from '../hr-zenske-offline.mjs'
import {getHistoricalStatisticsPolicy,validateInstalledHistoricalStatisticsMarkers,classifyHistoricalStatistics} from './historical-statistics-policy.mjs'
import {isFussballCommunityCompetition,FUSSBALL_COMMUNITY_SOURCE_POLICY} from '../fussball-community-policy.mjs'

// A typed pending-card archive is imported as an official fixture plus private
// evidence, never as partial appearances. Other incomplete archives still skip.
export function skipIncompleteArchiveReport({competition,report,currentSeason}){
  return !!report?.z?.nepopoln&&!currentSeason&&!(isFussballCommunityCompetition(competition)&&report.statisticsPending===true&&report.cardEnvelope)
}

/** Normal CLI cannot bootstrap or recover partial policies; dedicated packet writers do that atomically. */
export async function loadHistoricalStatisticsImportContext(db,original,{sourceOverride=null}={}) {
  const competition={...original,...(sourceOverride?{source:sourceOverride}:{})}
  if(isFussballCommunityCompetition(competition)){
    if(sourceOverride)throw Error('community card import: source override forbidden')
    const {data:binding,error}=await db.rpc('get_fussball_card_policy',{p_competition_id:competition.id})
    if(error||binding?.installed!==true||binding.enabled!==true||binding.source_policy!==FUSSBALL_COMMUNITY_SOURCE_POLICY||binding.current_code!==competition.source_league_code||!Array.isArray(binding.archive_codes))throw Error('community card import: exact installed enabled policy required')
    return {competition:{...competition,communityCardBinding:binding},installedHistoricalMarkers:null}
  }
  if(competition.source_policy===FCF_SIX_SOURCE_POLICY){const {data,error}=await db.rpc('get_installed_fcf_six_statistics_markers',{p_competition_id:competition.id});if(error)throw Error(`six historical import: ${error.message}`);const installedHistoricalMarkers=validateFcfSixInstalledMarkers({competition,binding:data});return{competition:{...competition,firstFantasyPlayedOn:installedHistoricalMarkers.firstFantasyPlayedOn},installedHistoricalMarkers}}
  const policy=getHistoricalStatisticsPolicy(competition.slug)
  if(!policy && competition.source_policy==null)return {competition,installedHistoricalMarkers:null}
  if(!policy || competition.source!==policy.provider || competition.source_policy!==policy.sourcePolicy)throw Error('historical import: invalid competition/provider/policy tuple')
  const {data,error}=await db.rpc('get_installed_historical_statistics_markers',{p_competition_id:competition.id})
  if(error)throw Error(`historical import: cannot verify installed markers: ${error.message}`)
  const installedHistoricalMarkers=validateInstalledHistoricalStatisticsMarkers({competition,binding:data})
  const prepared={...competition,firstFantasyPlayedOn:installedHistoricalMarkers.firstFantasyPlayedOn}
  if(policy.provider==='hns') {
    const {data:context,error:nativeError}=await db.rpc('get_hns_women_import_context',{p_competition_id:competition.id})
    if(nativeError)throw Error(`HNS women native context: ${nativeError.message}`)
    prepared.reviewedClubBindings=validateHnsWomenClubBindings(competition,context,installedHistoricalMarkers.markers)
    if(competition.active!==true)assertHnsWomenOfflineAuthority(prepared)
  }
  return {competition:prepared,installedHistoricalMarkers}
}

/** Before per-match derivation/writes: approved unavailable reports belong only to the atomic packet writer. */
export function assertHistoricalReportImportable({competition,report}) {
  if(competition.source==='mfa'&&['mt50920555','mt51962893'].includes(String(report?.id)))throw Error('historical import: neither continuation segment may derive individual statistics')
  if(report?.statisticsStatus!=null && report.statisticsStatus!=='available')throw Error('historical import: unavailable/unknown statistics status cannot derive individual rows')
  if(report?.historicalStatistics!=null || !report?.z || typeof report.z!=='object')throw Error('historical import: unavailable or missing normal report body')
  if(isFussballCommunityCompetition(competition)){
    const e=report.cardEnvelope,b=competition.communityCardBinding
    if(!b?.installed||!b.enabled||b.current_code!==competition.source_league_code||e?.reportId!==String(report.id)||e.sourceUrl!==report.url||e.season!==report.z.sezona)throw Error('community card import: unbound policy or report envelope')
    if(report.statisticsPending===true&&(Object.hasOwn(report,'nastopi')||Object.hasOwn(report.z,'goli')))throw Error('community card import: pending statistics cannot carry individual rows')
    return
  }
  if(competition.source==='mfa')assertMfaReportTiming(report.z)
  const id=String(report.id)
  const sourceMatchId=competition.source==='dfb'?id.replace(/^de-dfb-/,''):competition.source==='fcf'?id.replace(/^es/,''):competition.source==='mfa'?id.replace(/^mt/,''):competition.source==='isthmian'?id.replace(/^gb/,''):competition.source==='nfsbih'?id.replace(/^ba/,''):competition.source==='fmf'?id.replace(/^md/,''):id
  const policy=getHistoricalStatisticsPolicy(competition.slug)
  if(policy?.provider===competition.source && policy.entries.some(entry=>entry.sourceMatchId===sourceMatchId))throw Error('historical import: registered unavailable report cannot derive individual rows')
  // An accidentally leaked installed ID or wrong competition must fail before any appearances/prices.
  if(competition.source_policy===FCF_SIX_SOURCE_POLICY){if(getFcfSixPolicy(competition.slug)?.entries.some(e=>e.sourceMatchId===sourceMatchId))throw Error('six historical import: installed unavailable report cannot derive rows');classifyFcfSixHistoricalStatistics({competition,id:sourceMatchId,html:null})}else classifyHistoricalStatistics({competition,fixture:{sourceMatchId}})
}
