// Only the dedicated native cleanup installs these markers. Runtime never repairs them.
import {assertMfaReportTiming} from './mfa-report-validation.mjs'
import {validateInstalledHistoricalStatisticsMarkers} from '../lib/historical-statistics-policy.mjs'
export function withMfaHistoricalStatistics(base,competition,{installedHistoricalMarkers}={}) {
 const fail=message=>{throw Error(`MFA historical runtime: ${message}`)}
 if(base.ime!=='mfa'||competition.source!=='mfa'||!((competition.id===971&&competition.slug==='mt-premier'&&competition.source_league_code==='58539/2027')||(competition.id===972&&competition.slug==='mt-challenge'&&competition.source_league_code==='2601248/2027')))fail('exact native competition binding required')
 const binding=validateInstalledHistoricalStatisticsMarkers({competition,binding:installedHistoricalMarkers})
 if(!binding)fail('complete installed markers required')
 const context=code=>{if(!(competition.id===971?['58539/2027','58539/2026']:['2601248/2027','2601248/2026']).includes(code))fail('foreign source season/code');return binding}
 return{...base,
  async zapisniki(code,read,options={}){
   const b=context(code),preskoci=new Set(options.preskoci??[])
   for(const marker of b.markers)preskoci.add(marker.reportId)
   if(options.samoZapisnik&&b.markers.some(m=>m.reportId===String(options.samoZapisnik)))return[]
   const reports=await base.zapisniki(code,read,{...options,preskoci})
   for(const report of reports)assertMfaReportTiming(report.z)
   return reports
  },
  async razporedVseStrani(code,read){
   context(code)
   const rounds=await base.razporedVseStrani(code,read)
   // Preserve the installed official headers in the ordinary schedule writer.
   for(const round of rounds)for(const fixture of round.tekme??[]){const marker=binding.markers.find(m=>m.sourceMatchId===String(fixture.mfaId));if(marker)fixture.historicalMarker=marker}
   return rounds
  },
 }
}
