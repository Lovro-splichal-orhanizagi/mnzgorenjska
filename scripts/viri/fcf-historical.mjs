// Runtime consumes complete installed authority. It never installs policies or parses excluded raw pages.
import {readFileSync} from 'node:fs'
import {getHistoricalStatisticsPolicy,validateInstalledHistoricalStatisticsMarkers} from '../lib/historical-statistics-policy.mjs'
import {razberiKodo,preberiBlok,razporedBloka} from './fcf.mjs'
const clubBindings=JSON.parse(readFileSync(new URL('../policies/historical-statistics-club-bindings.json',import.meta.url))).bindings
export function withFcfHistoricalStatistics(base,competition,{installedHistoricalMarkers,verifyInstalledMarker,readBlock=preberiBlok}={}) {
 const fail=message=>{throw Error(`FCF historical runtime: ${message}`)}
 if(base.ime!=='fcf'||competition.source!=='fcf'||typeof verifyInstalledMarker!=='function')fail('invalid provider/identity adapter')
 const policy=getHistoricalStatisticsPolicy(competition.slug),group=/^es-ct-(segona|tercera)-g([1-9]\d*)$/.exec(competition.slug)
 if(!policy||!group)fail('unreviewed registered group')
 const expectedCompetition=`${group[1].toUpperCase()} CATALANA`,expectedGroup=`GRUP ${group[2]}`
 const checkGroup=z=>{if(z?.tekmovanje!==expectedCompetition||z?.skupina!==expectedGroup||z?.sezona!==policy.season)fail('normal source competition/group/season differs')}
 const context=code=>{
  if(code!==competition.source_league_code)fail('foreign source block/code')
  const {od,do:end}=razberiKodo(code)
  const binding=validateInstalledHistoricalStatisticsMarkers({competition,binding:installedHistoricalMarkers})
  if(!binding)fail('complete installed binding required')
  for(const marker of binding.markers) {
   if(Number(marker.sourceMatchId)<od||Number(marker.sourceMatchId)>end)fail('installed fixture outside source block')
   verifyInstalledMarker({competition,marker})
  }
  return binding
 }
 const name=(fixture,side)=>{
  const b=clubBindings.find(b=>b.provider==='fcf'&&b.sourceClubId===fixture[`${side}SourceClubId`]&&b.sourceCategoryId===fixture[`${side}SourceCategoryId`])
  if(!b||b.canonicalNames.length!==1)fail('reviewed source club/category name missing')
  return b.canonicalNames[0]
 }
 const calendarFixtures=binding=>binding.markers.map(marker=>{
  const f=marker.fixture
  return{id:Number(marker.sourceMatchId),historicalMarker:marker,g:{domaci:name(f,'home'),gostje:name(f,'away'),datum:f.playedOn,ura:null,izid:{domaci:f.observedHomeScore,gostje:f.observedAwayScore},krog:f.sourceRound,sezona:f.season,tekmovanje:expectedCompetition,skupina:expectedGroup}}
 })
 const provider={...base,
  // Ordinary schedule entrypoint must not fetch the block's first excluded raw page.
  razporedBrezUvodnegaPrenosa:true,
  async zapisniki(code,read,options={}) {
   const binding=context(code),preskoci=new Set(options.preskoci??[])
   for(const marker of binding.markers)preskoci.add(marker.reportId)
   if(options.samoZapisnik&&preskoci.has(String(options.samoZapisnik)))return []
   const reports=await base.zapisniki(code,read,{...options,preskoci,historicalFixtures:calendarFixtures(binding),installedHistoricalMarkers:binding})
   for(const report of reports)checkGroup(report.z)
   return reports
  },
  posamezniZapisnik(code,options) {
   const binding=context(code)
   if(binding.markers.some(m=>m.reportId===String(options?.id)))return async()=>[]
   return base.posamezniZapisnik(code,options)
  },
  async razporedVseStrani(code,read) {
   const binding=context(code),preskoci=new Set(binding.markers.map(m=>m.reportId))
   const block=await readBlock(code,read,{preskoci,historicalFixtures:calendarFixtures(binding)})
   if(block.skupina!==`${expectedCompetition}|${expectedGroup}|${policy.season}`)fail('schedule source competition/group/season differs')
   const rounds=razporedBloka(block)
   return rounds.sort((a,b)=>a.stevilka-b.stevilka)
  },
 }
 return provider
}
