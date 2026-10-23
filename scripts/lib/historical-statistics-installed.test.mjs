import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateInstalledHistoricalStatisticsMarkers} from './historical-statistics-policy.mjs'
import {historicalStatisticsPolicySha256} from './historical-statistics-policy.mjs'
const policies=JSON.parse(readFileSync(new URL('../policies/historical-statistics-exclusions.json',import.meta.url))).policies
const reportId=(p,e)=>p.provider==='dfb'?`de-dfb-${e.sourceMatchId}`:p.provider==='fcf'?`es${e.sourceMatchId}`:p.provider==='mfa'?`mt${e.sourceMatchId}`:p.provider==='isthmian'?`gb${e.sourceMatchId}`:p.provider==='nfsbih'?`ba${e.sourceMatchId}`:e.sourceMatchId
const competition=p=>({...(p.provider==='mlsz'||p.sourcePolicy==='reviewed-existing-history-20261023-v1'?{id:p.competitionId,source_league_code:p.sourceLeagueCode}:{}),...(p.provider==='mfa'?(p.competitionSlug==='mt-premier'?{id:971,source_league_code:'58539/2027'}:p.competitionSlug==='mt-challenge'?{id:972,source_league_code:'2601248/2027'}:p.competitionSlug==='mt-nl1'?{id:973,source_league_code:'2601267/2027'}:{id:974,source_league_code:'6234492/2027'}):{}),slug:p.competitionSlug,source:p.provider,source_policy:p.sourcePolicy})
const binding=p=>({installed:true,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),firstFantasyPlayedOn:'2026-10-25',markers:p.entries.map((e,i)=>{
 const {rawSha256,reasonCode,...identity}=e
 return {sourceMatchId:e.sourceMatchId,reportId:reportId(p,e),fixture:{...identity,season:e.season??p.season},rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}
})})
for(const p of policies)test(`complete installed marker binding validates without raw source reads ${p.id}`,()=>{
 const source=binding(p),result=validateInstalledHistoricalStatisticsMarkers({competition:competition(p),binding:source})
 assert.deepEqual(result,source);assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.markers[0].fixture))
 source.markers[0].fixture.sourceRound=999
 assert.notEqual(result.markers[0].fixture.sourceRound,999)
})
const p=policies[0]
for(const [name,mutate]of Object.entries({
 'not installed':b=>{b.installed=false},'incomplete set':b=>b.markers.pop(),'additional marker':b=>b.markers.push({...b.markers[0]}),
 'policy ID':b=>{b.policyId='wrong'},'policy hash':b=>{b.policySha256='0'.repeat(64)},'invalid launch day':b=>{b.firstFantasyPlayedOn='unknown'},'not prelaunch':b=>{b.firstFantasyPlayedOn=p.entries[0].playedOn},
 'native identity':b=>{b.markers[0].sourceMatchId='unknown'},'report namespace':b=>{b.markers[0].reportId='es'+b.markers[0].reportId},
 'raw hash':b=>{b.markers[0].rawSha256='0'.repeat(64)},'changed fixture':b=>{b.markers[0].fixture.homeSourceClubId='unknown'},
 'extra fixture fact':b=>{b.markers[0].fixture.guessed=true},'marker policy ID':b=>{b.markers[0].policyId='wrong'},'marker policy hash':b=>{b.markers[0].policySha256='0'.repeat(64)},
 'available status':b=>{b.markers[0].statisticsStatus='available'},'imported timestamp':b=>{b.markers[0].importedAt='2026-01-01'},'individual rows':b=>{b.markers[0].individualRowCount=1},
 'missing counter':b=>{delete b.markers[0].individualRowCount},'missing DB match ID':b=>{delete b.markers[0].matchId},'duplicate DB match ID':b=>{b.markers[1].matchId=b.markers[0].matchId},
 'negative round ID':b=>{b.markers[0].roundId=-1},'same home/away':b=>{b.markers[0].homeTeamId=b.markers[0].awayTeamId},'unsafe bigint number':b=>{b.markers[0].awayTeamId=Number.MAX_SAFE_INTEGER+1},
}))test(`installed marker prefetch binding refuses ${name}`,()=>{
 const data=binding(p);mutate(data)
 assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition:competition(p),binding:data}),/historical|marker|binding|fixture|policy|launch/i)
})
for(const patch of [{slug:'wrong'},{source:'dfb'},{source_policy:null},{source_policy:'unreviewed'},{firstFantasyPlayedOn:'2026-10-24'}])test(`installed tuple refuses ${JSON.stringify(patch)}`,()=>assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition:{...competition(p),...patch},binding:binding(p)}),/historical|policy|binding|launch/i))
test('ordinary competition needs no historical marker lookup',()=>assert.equal(validateInstalledHistoricalStatisticsMarkers({competition:{slug:'ordinary',source:'hns'},binding:null}),null))
test('unknown opt-in cannot become ordinary without a marker set',()=>assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition:{slug:'ordinary',source:'hns',source_policy:'unknown'},binding:null}),/historical|policy/i))
test('missing or partially installed approved binding cannot fall back to provider parsing',()=>{
 for(const value of [null,undefined,{installed:false,markers:[]}])assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition:competition(p),binding:value}),/historical|installed|binding|marker/i)
})
