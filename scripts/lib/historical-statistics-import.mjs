import {getHistoricalStatisticsPolicy,validateInstalledHistoricalStatisticsMarkers,classifyHistoricalStatistics} from './historical-statistics-policy.mjs'

/** Normal CLI cannot bootstrap or recover partial policies; dedicated packet writers do that atomically. */
export async function loadHistoricalStatisticsImportContext(db,original,{sourceOverride=null}={}) {
  const competition={...original,...(sourceOverride?{source:sourceOverride}:{})}
  const policy=getHistoricalStatisticsPolicy(competition.slug)
  if(!policy && competition.source_policy==null)return {competition,installedHistoricalMarkers:null}
  if(!policy || competition.source!==policy.provider || competition.source_policy!==policy.sourcePolicy)throw Error('historical import: invalid competition/provider/policy tuple')
  const {data,error}=await db.rpc('get_installed_historical_statistics_markers',{p_competition_id:competition.id})
  if(error)throw Error(`historical import: cannot verify installed markers: ${error.message}`)
  const installedHistoricalMarkers=validateInstalledHistoricalStatisticsMarkers({competition,binding:data})
  return {competition:{...competition,firstFantasyPlayedOn:installedHistoricalMarkers.firstFantasyPlayedOn},installedHistoricalMarkers}
}

/** Before per-match derivation/writes: approved unavailable reports belong only to the atomic packet writer. */
export function assertHistoricalReportImportable({competition,report}) {
  if(report?.statisticsStatus!=null && report.statisticsStatus!=='available')throw Error('historical import: unavailable/unknown statistics status cannot derive individual rows')
  if(report?.historicalStatistics!=null || !report?.z || typeof report.z!=='object')throw Error('historical import: unavailable or missing normal report body')
  const id=String(report.id)
  const sourceMatchId=competition.source==='dfb'?id.replace(/^de-dfb-/,''):competition.source==='fcf'?id.replace(/^es/,''):id
  // An accidentally leaked installed ID or wrong competition must fail before any appearances/prices.
  classifyHistoricalStatistics({competition,fixture:{sourceMatchId}})
}
