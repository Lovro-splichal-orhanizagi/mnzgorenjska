import {bindFussballHistoricalSchedule,getFussballNativeRuntimeContext,reauthenticateFussballNativeRuntimeContext} from '../fussball-baden-native-dispatch.mjs'
/** Base must use the prepared loader/runtime orchestrator, which excludes
 * markers before parsing. Filtering a strict collector's output is forbidden. */
export function withFussballHistoricalStatistics(base,competition,{installedHistoricalMarkers}={}){
 const context=installedHistoricalMarkers??competition.fussballHistoricalContext
 getFussballNativeRuntimeContext(context,competition)
 if(base.fussballHistoricalContext!==context)throw Error('Baden runtime: marker-aware source factory required')
 return {...base,
  async razporedVseStrani(code,...args){
   await reauthenticateFussballNativeRuntimeContext(context,competition)
   const schedule=await base.razporedVseStrani(code,...args)
   // Remove only our own already-bound presentation markers before rechecking
   // full source headers; a forged/mutated marker never reaches the importer.
   const clean=structuredClone(schedule)
   for(const round of clean)for(const f of round.tekme){const marker=f.historicalMarker;if(marker){const state=getFussballNativeRuntimeContext(context,competition),actual=state.state.readback.history.markers.find(m=>m.sourceMatchId===f.id);if(JSON.stringify(marker)!==JSON.stringify(actual))throw Error('Baden runtime: installed schedule marker drift');delete f.historicalMarker}}
   return bindFussballHistoricalSchedule(context,competition,code,clean)
  },
  async zapisniki(code,...args){
   const state=await reauthenticateFussballNativeRuntimeContext(context,competition),reports=await base.zapisniki(code,...args)
   const ids=new Set(state.state.readback.history.markers.map(m=>m.reportId))
   if(reports.some(r=>ids.has(r.id)||r.historicalStatistics||r.statisticsStatus&&r.statisticsStatus!=='available'))throw Error('Baden runtime: unavailable report cannot derive individual/card rows')
   return reports
  },
 }
}
