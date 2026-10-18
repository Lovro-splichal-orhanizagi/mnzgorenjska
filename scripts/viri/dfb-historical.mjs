// Runtime wrapper: only authoritative installed markers skip already excluded
// reports. Initial installation is the dedicated verified offline packet RPC.
import {dfbPolicyBinding,dfbHistoricalScope} from '../dfb-historical-policy.mjs'
import {getHistoricalStatisticsPolicy,classifyHistoricalStatistics} from '../lib/historical-statistics-policy.mjs'
export function withDfbHistoricalStatistics(base,competition){
 if(base.ime!=='dfb'||competition?.source!=='dfb'||competition.source_policy!==dfbHistoricalScope(competition?.slug).policyId)throw Error('DFB historical provider: invalid opt-in tuple')
 const provider={...base,async zapisniki(code,fetchFn,options={}){
  if(!['2025-2026','2026-2027'].map(season=>`${competition.slug.slice(3)}/${season}`).includes(code))throw Error('DFB historical provider: foreign season/league')
  const binding=options.installedHistoricalMarkers,context={...competition,firstFantasyPlayedOn:binding?.firstFantasyPlayedOn},expected=dfbPolicyBinding(context),policy=getHistoricalStatisticsPolicy(competition.slug)
  if(binding?.installed!==true||binding.policyId!==expected.id||binding.policySha256!==expected.sha256||competition.firstFantasyPlayedOn!=null&&competition.firstFantasyPlayedOn!==binding.firstFantasyPlayedOn||!Array.isArray(binding.markers)||binding.markers.length!==policy.entries.length)throw Error('DFB historical provider: complete installed binding required')
  const skip=new Set(options.preskoci??[]),seen=new Set()
  for(const marker of binding.markers){
   const classification=classifyHistoricalStatistics({competition:context,fixture:marker.fixture,rawSha256:marker.rawSha256,policy})
   if(classification.kind!=='unavailable_historical'||marker.sourceMatchId!==classification.exception.sourceMatchId||marker.reportId!=='de-dfb-'+marker.sourceMatchId||seen.has(marker.sourceMatchId)||marker.policyId!==expected.id||marker.policySha256!==expected.sha256||marker.statisticsStatus!=='unavailable_historical'||marker.importedAt!==null||marker.individualRowCount!==0||['matchId','roundId','homeTeamId','awayTeamId'].some(k=>!Number.isSafeInteger(marker[k])||marker[k]<=0))throw Error('DFB historical provider: installed marker drift')
   seen.add(marker.sourceMatchId);skip.add(marker.reportId)
  }
  if(policy.entries.some(e=>!seen.has(e.sourceMatchId)))throw Error('DFB historical provider: incomplete installed set')
  // An explicit installed report must not even discover the source schedule.
  if(options.samoZapisnik&&binding.markers.some(m=>m.reportId===String(options.samoZapisnik))){base.nepopolni=[];return []}
  return base.zapisniki(code,fetchFn,{...options,preskoci:skip})
 }}
 Object.defineProperty(provider,'nepopolni',{enumerable:true,get:()=>base.nepopolni})
 return provider
}
