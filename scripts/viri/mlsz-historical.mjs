// Installed immutable markers are the sole authority to skip historical bodies.
import{readFileSync}from'node:fs'
import{getHistoricalStatisticsPolicy,validateInstalledHistoricalStatisticsMarkers}from'../lib/historical-statistics-policy.mjs'
const clubs=JSON.parse(readFileSync(new URL('../policies/historical-statistics-club-bindings.json',import.meta.url),'utf8')).bindings.filter(b=>b.provider==='mlsz')
export function withMlszHistoricalStatistics(base,competition,{installedHistoricalMarkers}={}){
 const fail=message=>{throw Error(`MLSZ historical runtime: ${message}`)}
 const policy=getHistoricalStatisticsPolicy(competition.slug)
 if(base.ime!=='mlsz'||competition.source!=='mlsz'||policy?.provider!=='mlsz')fail('exact MLSZ policy required')
 const binding=validateInstalledHistoricalStatisticsMarkers({competition,binding:installedHistoricalMarkers})
 if(!binding)fail('complete installed markers required')
 const context=code=>{if(!new Set([policy.sourceLeagueCode,...policy.entries.map(e=>e.sourceCompetitionId)]).has(code))fail('foreign source season/code');return binding}
 const markerFor=(code,t,round)=>{
  const marker=binding.markers.find(m=>m.sourceMatchId===String(t.id));if(!marker)return undefined
  const f=marker.fixture
  const names=(id,name)=>clubs.find(b=>b.sourceClubId===id)?.canonicalNames.some(n=>base.kljucKluba(n)===base.kljucKluba(name))
  if(code!==f.sourceCompetitionId||round!==f.sourceRound||t.datum!==f.playedOn||t.izid?.domaci!==f.observedHomeScore||t.izid?.gostje!==f.observedAwayScore||!names(f.homeSourceClubId,t.domaci)||!names(f.awaySourceClubId,t.gostje))fail('historical schedule identity changed')
  return marker
 }
 return{...base,
  async zapisniki(code,read,options={}){
   context(code);const preskoci=new Set(options.preskoci??[]);for(const marker of binding.markers)preskoci.add(marker.reportId)
   if(options.samoZapisnik&&preskoci.has(String(options.samoZapisnik)))return[]
   return base.zapisniki(code,read,{...options,preskoci})
  },
  async razporedVseStrani(code,read){context(code);return base.razporedVseStrani(code,read,{historicalMarkerFor:(t,round)=>markerFor(code,t,round)})},
 }
}
