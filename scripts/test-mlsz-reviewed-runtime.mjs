import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import {viraZa}from'./viri/index.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,validateInstalledHistoricalStatisticsMarkers}from'./lib/historical-statistics-policy.mjs'
const competition={id:463,slug:'hu-to-3-nyugat',source:'mlsz',source_league_code:'67/17/34465',source_policy:'hu-mlsz-reviewed-history-v1'}
const policy=getHistoricalStatisticsPolicy(competition.slug)
const binding=()=>({installed:true,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),firstFantasyPlayedOn:'2026-10-24',markers:policy.entries.map((e,i)=>{const{rawSha256,reasonCode,...identity}=e;return{sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...identity,season:policy.season},rawSha256,matchId:545453,roundId:35013,homeTeamId:10747,awayTeamId:10746,policyId:policy.id,policySha256:historicalStatisticsPolicySha256(policy),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})})
const page=(score='3 - 0',home='NAGYDOROG KSE')=>`<div id="turnsTitle"><select><option value=12>12. forduló</option></select></div><div id="match_panel"><div class="schedule"><div class="home_team"><span>${home}</span></div><div class="away_team"><span>NÉMETKÉRI SE</span></div><a href="/match/65/17/31528/12/2175016.html">Report</a><div class="schedule-points">${score}</div><div class="team_sorsolas_date">2026. 03. 21. 15:00</div></div><div class="team_lapbar"></div>`
const reader=(html=page())=>{const calls=[];return{calls,read:async url=>{calls.push(url);assert.ok(!url.includes('/match/'),'installed report body must not be requested');return html}}}
test('MLSZ refuses incomplete installed authority before provider calls',()=>{
 for(const b of[null,{...binding(),markers:[]},{...binding(),policySha256:'f'.repeat(64)}])assert.throws(()=>viraZa(competition,{installedHistoricalMarkers:b}))
})
test('MLSZ exact current tuple is verified before marker authority is accepted',()=>{
 for(const c of[{...competition,id:999},{...competition,source_league_code:'67/17/00000'}])assert.throws(()=>validateInstalledHistoricalStatisticsMarkers({competition:c,binding:binding()}))
})
test('MLSZ report traversal skips installed IDs before GET and targeted repairs stay empty',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()});const{calls,read}=reader();assert.deepEqual(await vir.zapisniki('65/17/31528',read),[]);assert.equal(calls.length,2)
 calls.length=0;assert.deepEqual(await vir.zapisniki('65/17/31528',read,{samoZapisnik:'2175016'}),[]);assert.equal(calls.length,0)
 await assert.rejects(vir.zapisniki('65/1/11111',read),/foreign/)
})
test('MLSZ schedule preserves installed header without forfeit-detection GET',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()});const{calls,read}=reader();const rounds=await vir.razporedVseStrani('65/17/31528',read);assert.equal(calls.length,2);assert.equal(rounds.length,1);assert.equal(rounds[0].tekme[0].historicalMarker.matchId,545453);assert.equal(rounds[0].tekme[0].kontumacija,false)
})
test('MLSZ changed historical schedule score or club fails before report GET',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()});for(const html of[page('2 - 6'),page('3 - 0','Other club')]){const{read}=reader(html);await assert.rejects(vir.razporedVseStrani('65/17/31528',read),/historical.*identity/i)}
})
test('MLSZ ordinary report still parses while installed bodies are skipped',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()});const html=page().replaceAll('2175016','2090950');const report=readFileSync(new URL('./vzorci/hu-adatbank-tekma-65-20-31672-2090950.html',import.meta.url),'utf8');let reads=0
 const reports=await vir.zapisniki('65/17/31528',async url=>{if(url.includes('/match/')){reads++;return report}return html})
 assert.equal(reads,1);assert.equal(reports.length,1);assert.equal(reports[0].id,'2090950');assert.ok(reports[0].z.domaci.postava.length>=7)
})
