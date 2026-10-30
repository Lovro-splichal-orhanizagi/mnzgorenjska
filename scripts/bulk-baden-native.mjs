// Baden launch boundary. Locators are data; authority is minted only by the
// hosted reader and independently re-read installed database context.
import {createHash} from 'node:crypto'
import {isDeepStrictEqual as same} from 'node:util'
import {readFileSync,lstatSync,existsSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {githubGetAdapter} from './stage-fussball-native-composition.mjs'
import {loadBadenR10NativeLocator} from './stage-baden-r10-native.mjs'
import {loadFussballNativeComposition} from './fussball-native-composition.mjs'
import {getFussballNativeRuntimeContext,loadFussballNativeImportContext,loadPreparedFussballNativePack,seedFussballNativeRuntime,loadFussballNativeRuntimeSeed,bindFussballHistoricalSchedule} from './fussball-baden-native-dispatch.mjs'
import {BADEN_SLUG,BADEN_CURRENT,badenCanonical} from './lib/fussball-native-history-policy.mjs'
import {najcenejsiKader} from '../src/lib/pripravljenost.ts'
const sha=v=>createHash('sha256').update(badenCanonical(v)).digest('hex')
const need=(ok,m)=>{if(!ok)throw Object.assign(Error('Baden native launch: '+m),{dataHold:true,reason_code:'BADEN_COMPOSITION_HOLD'})}
export const isBadenCompositionCandidate=c=>c?.slug===BADEN_SLUG&&c.source==='fussball-public'&&c.source_league_code===BADEN_CURRENT&&c.country_code==='DE'
export async function loadBadenHostedComposition(directory,{env=process.env,github}={}){
 if(existsSync(join(resolve(directory),'baden-r10-native-locator.json')))return loadBadenR10NativeLocator(directory,{github})
 const path=join(resolve(directory),'baden-native-locator.json');let stat
 try{stat=lstatSync(path)}catch{need(false,'hosted composition locator missing')}
 need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=4096,'regular bounded hosted locator required')
 const locator=JSON.parse(readFileSync(path,'utf8'))
 need(same(Object.keys(locator).sort(),['consumerHead','derivedHead','derivedRunId','frozenDirectory','v6FrozenDirectory'].sort())&&locator.derivedHead==='e925dcbcd8b087dd3f6ec4c58a7cc07e515ae75d'&&/^[a-f0-9]{40}$/.test(locator.consumerHead)&&/^[1-9]\d{0,19}$/.test(locator.derivedRunId)&&typeof locator.frozenDirectory==='string'&&locator.frozenDirectory.length>0&&typeof locator.v6FrozenDirectory==='string'&&locator.v6FrozenDirectory.length>0,'exact hosted dual-epoch composition locators required')
 need(env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&env.GITHUB_SHA===locator.consumerHead,'installed exact current consumer runtime required')
 return loadFussballNativeComposition({...locator,frozenDirectory:resolve(locator.frozenDirectory),v6FrozenDirectory:resolve(locator.v6FrozenDirectory),github:github??githubGetAdapter(env.GH_TOKEN??env.GITHUB_TOKEN)})
}
export async function loadBadenChildContext(db,competition,directory=process.env.SLFF_BULK_CAPTURE){
 need(isBadenCompositionCandidate(competition)&&competition.active===false&&typeof directory==='string','inactive offline Baden child scope required')
 const composition=await loadBadenHostedComposition(directory)
 const loaded=await loadFussballNativeRuntimeSeed({competition,db,composition,directory:join(resolve(directory),'native-seed')})
 return {competition:loaded.competition,installedHistoricalMarkers:loaded.context}
}
export async function loadBadenLaunchPack({competition,composition,preparation,db,seedDirectory}){
 const loaded=await loadFussballNativeImportContext({competition,composition,preparation,db})
 if(seedDirectory)await seedFussballNativeRuntime({competition:loaded.competition,context:loaded.installedHistoricalMarkers,directory:seedDirectory})
 return loadPreparedFussballNativePack({competition:loaded.competition,context:loaded.installedHistoricalMarkers})
}
export function inspectBadenComposition({candidate,pack,snapshot,context=pack?.fussballHistoricalContext}){
 need(isBadenCompositionCandidate(candidate),'exact reviewed Baden candidate required')
 const state=getFussballNativeRuntimeContext(context,snapshot.competition),bound=state.state.readback
 const supplied=Object.fromEntries(Object.keys(state.pack).map(k=>[k,pack[k]]))
 // Sealed source seasons have no schedule. Rebuild the exact prepared view
 // from those originals and the private installed-marker binder, preserving
 // source equality while checking every added schedule/header/marker field.
 const expected={...state.pack,seasons:state.pack.seasons.map(season=>({...season,schedule:bindFussballHistoricalSchedule(context,snapshot.competition,season.code,[...new Set(season.fixtures.map(f=>f.krog))].sort((a,b)=>a-b).map(stevilka=>({stevilka,tekme:season.fixtures.filter(f=>f.krog===stevilka).map(f=>({...structuredClone(f),izid:f.rezultat?[f.rezultat.domaci,f.rezultat.gostje]:null,odigrana:f.rezultat!==null,kontumacija:false}))})))}))}
 need(same(supplied,expected)&&same(snapshot.fussball_history,bound)&&bound.active===false,'private source pack and actual combined native readback required')
 need(bound.bindings.length===snapshot.matches.length,'exact native partition inventory required')
 const headers=bound.history.markers.map(marker=>{
  const match=snapshot.matches.find(m=>m.id===marker.matchId),binding=bound.bindings.find(b=>b.matchId===marker.matchId)
  need(match&&binding&&binding.fixture.unavailable&&match.round_id===marker.roundId&&match.home_team_id===marker.homeTeamId&&match.away_team_id===marker.awayTeamId&&match.zapisnik_id===marker.reportId&&match.source_url===marker.fixture.sourceUrl&&match.played_on===marker.fixture.playedOn&&match.statistics_status==='unavailable_historical'&&match.imported_at===null&&match.vir_brez_izida===false&&match.kontumacija===false&&Array.isArray(match.appearance_rows)&&!match.appearance_rows.length&&Array.isArray(match.goal_rows)&&!match.goal_rows.length,'immutable native header/zero individuals required')
  need(match.home_goals===marker.fixture.observedHomeScore&&match.away_goals===marker.fixture.observedAwayScore,'known/null official result differs')
  return {matchId:marker.matchId,reportId:marker.reportId,sourceMatchId:marker.sourceMatchId,sourceCompetitionId:marker.fixture.sourceCompetitionId,roundId:marker.roundId,homeTeamId:marker.homeTeamId,awayTeamId:marker.awayTeamId,fixture:structuredClone(marker.fixture),rawSha256:marker.rawSha256}
 }).sort((a,b)=>a.matchId-b.matchId)
 need(snapshot.matches.filter(m=>m.statistics_status==='unavailable_historical').length===headers.length,'extra or missing historical header')
 const partitionCounts=pack.seasons.map(s=>({code:s.code,season:s.season,...structuredClone(s.inventory.counts)}))
 for(const season of pack.seasons){
  const ids=Object.values(season.inventory.partition).flat()
  need(ids.length===season.fixtures.length&&new Set(ids).size===ids.length&&season.fixtures.every(f=>ids.includes(f.id)),'exactly one source partition per fixture required')
  for(const f of season.fixtures){const bindings=bound.bindings.filter(b=>b.sourceCompetitionId===season.code&&b.sourceMatchId===f.id);need(bindings.length===1&&snapshot.matches.filter(m=>m.id===bindings[0].matchId).length===1,'unique full source/native fixture join required')}
 }
 const currentClubIds=new Set(bound.bindings.filter(b=>b.sourceCompetitionId===BADEN_CURRENT).flatMap(b=>[b.homeTeamId,b.awayTeamId]))
 const active=snapshot.players.filter(p=>p.active===true)
 need(active.every(p=>currentClubIds.has(p.team_id))&&new Set(active.map(p=>p.team_id)).size===currentClubIds.size,'exact current eligible clubs; archive-only players inactive required')
 need(active.length>0&&active.every(p=>Number.isFinite(p.value)&&p.value>0&&['GK','DEF','MID','FWD'].includes(p.position))&&new Set(active.map(p=>p.value)).size>1,'finite varied eligible prices required')
 const price=najcenejsiKader(active)
 need(Number.isFinite(price)&&price<=100,'affordable legal 15 with 2/5/5/3 and max three per club required')
 need(active.filter(p=>p.value===4.5).length/active.length<=0.7&&Math.max(...active.map(p=>p.value))>=8,'ordinary default-share and maximum-price readiness required')
 const unknown=headers.filter(h=>h.fixture.resultKnown===false)
 need(headers.every(h=>h.fixture.resultKnown===true||h.fixture.resultKnown===false)&&unknown.every(h=>h.fixture.observedHomeScore===null&&h.fixture.observedAwayScore===null&&h.fixture.administrativeResult),'reviewed paired unknown result inventory required')
 return {context,bound,headers,unknown,partitionCounts,compositionProofSha256:sha({derivedPackSha256:pack.derivedPackSha256,bindingSha256:bound.bindingSha256,historicalPolicySha256:bound.policySha256,historicalInventorySha256:bound.markerInventorySha256,headers,partitionCounts}),cheapestSquad:price}
}
