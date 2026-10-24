import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { vZapisnik } from './viri/mlsz.mjs'
import { viraZa } from './viri/index.mjs'
import { getHistoricalStatisticsPolicy, historicalStatisticsPolicySha256, classifyHistoricalStatistics } from './lib/historical-statistics-policy.mjs'
import { policyForSlug, priceCommands } from './reviewed-existing-history.mjs'
const slug='hu-pe-u19-c'
const competition={id:637,slug,source:'mlsz',source_league_code:'67/14/34250',source_policy:'reviewed-existing-history-20261023-v1',firstFantasyPlayedOn:'2026-10-31'}
const getPolicy=()=>{const p=getHistoricalStatisticsPolicy(slug);assert.ok(p,'exact approved Pest C policy is registered');return p}
const binding=()=>{const p=getPolicy();return {installed:true,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),firstFantasyPlayedOn:'2026-10-31',markers:p.entries.map(e=>{const{rawSha256,reasonCode,...identity}=e;return {sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...identity,season:p.season},rawSha256,matchId:616508,roundId:35547,homeTeamId:7676,awayTeamId:6814,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}}
const page=(score='3 - 0',home='Abonyi KID FC')=>`<div id="turnsTitle"><select><option value=2>2. forduló</option></select></div><div id="match_panel"><div class="schedule"><div class="home_team"><span>${home}</span></div><div class="away_team"><span>Albertirsai SE</span></div><a href="/match/65/14/32327/2/2120218.html">Report</a><div class="schedule-points">${score}</div><div class="team_sorsolas_date">2025. 09. 13. 15:00</div></div><div class="team_lapbar"></div>`
test('Pest C exact approval preserves official 3–0 and binds original raw source identity',()=>{
 const p=getPolicy(),e=p.entries[0]
 assert.equal(p.entries.length,1);assert.equal(p.season,'2025/26')
 assert.deepEqual([e.sourceMatchId,e.sourceCompetitionId,e.sourceRound,e.playedOn,e.homeSourceClubId,e.awaySourceClubId,e.observedHomeScore,e.observedAwayScore],['2120218','65/14/32327',2,'2025-09-13','317012','317011',3,0])
 assert.equal(e.rawSha256,'4e54028d642fd71865a44017ddef28ffdcdbea3e22ad2bb669bb18527ba75efe')
 assert.match(p.approvalReference,/call_d832fae0d7a04d249b56f9f5d7cbd596/)
 const fixture={...e,season:p.season}
 assert.equal(classifyHistoricalStatistics({competition,fixture,rawSha256:e.rawSha256}).kind,'unavailable_historical')
 for(const patch of [{id:638},{source_league_code:'67/14/34251'},{source_policy:null}])assert.throws(()=>classifyHistoricalStatistics({competition:{...competition,...patch},fixture,rawSha256:e.rawSha256}))
 for(const patch of [{sourceRound:3},{observedAwayScore:8},{homeSourceClubId:'317011'},{playedOn:'2026-10-31'}])assert.throws(()=>classifyHistoricalStatistics({competition,fixture:{...fixture,...patch},rawSha256:e.rawSha256}))
 assert.throws(()=>classifyHistoricalStatistics({competition,fixture,rawSha256:'f'.repeat(64)}))
 assert.equal(policyForSlug(slug).sha256,historicalStatisticsPolicySha256(p))
 assert.equal(priceCommands(slug).length,3)
})
test('Pest C ordinary/fresh/targeted archive imports skip the installed body and bind schedule without false walkover',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()});let calls=[]
 const read=async url=>{calls.push(url);assert.ok(!url.includes('/match/'),'excluded body is never read');return page()}
 for(const options of [{},{sveziZapisniki:new Set(['2120218'])},{samoZapisnik:'2120218'}]){calls=[];assert.deepEqual(await vir.zapisniki('65/14/32327',read,options),[]);if(options.samoZapisnik)assert.equal(calls.length,0)}
 const rounds=await vir.razporedVseStrani('65/14/32327',read)
 assert.equal(rounds[0].tekme[0].historicalMarker.matchId,616508);assert.equal(rounds[0].tekme[0].kontumacija,false)
 for(const html of [page('0 - 8'),page('3 - 0','Other club'),page().replace('2025. 09. 13.','2025. 09. 14.')])await assert.rejects(vir.razporedVseStrani('65/14/32327',async()=>html),/identity/)
 await assert.rejects(vir.zapisniki('65/14/32328',read),/foreign/)
 const ordinary=page().replaceAll('2120218','2090950')
 const report=readFileSync(new URL('./vzorci/hu-adatbank-tekma-65-20-31672-2090950.html',import.meta.url),'utf8')
 const reports=await vir.zapisniki('65/14/32327',async url=>url.includes('/match/')?report:ordinary)
 assert.equal(reports.length,1);assert.equal(reports[0].id,'2090950')
})

test('retained original Pest report bytes prove the official result and contradictory events',()=>{
 const raw=readFileSync(new URL('./vzorci/hu-adatbank-pest-c-2120218.html',import.meta.url))
 const e=getPolicy().entries[0]
 assert.equal(raw.length,140446)
 assert.equal(createHash('sha256').update(raw).digest('hex'),e.rawSha256)
 const parsed=vZapisnik(raw.toString('utf8'),{id:e.sourceMatchId,url:e.sourceUrl})
 assert.deepEqual(parsed.rezultat,{domaci:3,gostje:0})
 assert.equal(parsed.goli.length,8)
 assert.match(JSON.stringify(parsed.opozorila),/0:8/)
 for(const [id,name] of [[e.homeSourceClubId,'Abonyi KID FC'],[e.awaySourceClubId,'Albertirsai SE']])assert.ok(raw.toString('utf8').includes(`/club/65/14/32327/2/${id}.html">${name}</a>`))
})
