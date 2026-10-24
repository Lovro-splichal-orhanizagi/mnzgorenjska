import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import{createHash}from'node:crypto'
import{vZapisnik}from'./viri/mlsz.mjs'
import{viraZa}from'./viri/index.mjs'
import{getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,classifyHistoricalStatistics}from'./lib/historical-statistics-policy.mjs'
import{policyForSlug,priceCommands}from'./reviewed-existing-history.mjs'
const slug='hu-cs-u19-toth',competition={id:625,slug,source:'mlsz',source_league_code:'67/6/34102',source_policy:'reviewed-existing-history-20261023-v1',firstFantasyPlayedOn:'2026-10-31'}
const expected=[
 {sourceMatchId:'2079402',mid:622735,rid:35640,round:10,date:'2025-11-16',home:'NagyLog-St.Mihály FC',away:'UTC 1913 Labdarúgó Kft',homeID:'311188',awayID:'311185',ht:10928,at:2448,score:[3,0],events:[1,8],bytes:192388,sha:'f233a3f56df2c829c4e1d4909d1e7bcbb033b5fc1fedff38f6f39892b2f2b991'},
 {sourceMatchId:'2079433',mid:622772,rid:35646,round:16,date:'2026-04-25',home:'Szőreg RSE',away:'ESK Kiskundorozsma',homeID:'311187',awayID:'311186',ht:10926,at:6471,score:[0,3],events:[0,2],bytes:166391,sha:'2ea11f7d6b83ba65fcd673215bdef161a1ac636e23bd17f7e647fad6d13409c6'},
]
const policy=()=>{const p=getHistoricalStatisticsPolicy(slug);assert.ok(p,'exact reviewed Tóth policy is registered');return p}
const binding=()=>{const p=policy();return{installed:true,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),firstFantasyPlayedOn:'2026-10-31',markers:p.entries.map(e=>{const{rawSha256,reasonCode,...f}=e,x=expected.find(x=>x.sourceMatchId===e.sourceMatchId);return{sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...f,season:p.season},rawSha256,matchId:x.mid,roundId:x.rid,homeTeamId:x.ht,awayTeamId:x.at,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}}
const page=(x)=>'<div id="turnsTitle"><select><option value='+x.round+'>'+x.round+'. forduló</option></select></div><div id="match_panel"><div class="schedule"><div class="home_team"><span>'+x.home+'</span></div><div class="away_team"><span>'+x.away+'</span></div><a href="/match/65/6/31904/'+x.round+'/'+x.sourceMatchId+'.html">Report</a><div class="schedule-points">'+x.score.join(' - ')+'</div><div class="team_sorsolas_date">'+x.date.replaceAll('-','. ')+'. 15:00</div></div><div class="team_lapbar"></div>'
test('Tóth registers only its two approved archive reports below the reviewed cap',()=>{
 const p=policy();assert.equal(p.entries.length,2);assert.equal(p.season,'2025/26');assert.match(p.approvalReference,/call_3a8674f5af8c4b8c8ba9bac6c54d0481/);assert.ok(2/87<=0.05)
 for(const x of expected){const e=p.entries.find(e=>e.sourceMatchId===x.sourceMatchId);assert.ok(e);assert.deepEqual([e.sourceCompetitionId,e.sourceRound,e.playedOn,e.homeSourceClubId,e.awaySourceClubId,e.observedHomeScore,e.observedAwayScore,e.rawSha256],['65/6/31904',x.round,x.date,x.homeID,x.awayID,...x.score,x.sha]);assert.equal(classifyHistoricalStatistics({competition,fixture:{...e,season:p.season},rawSha256:e.rawSha256}).kind,'unavailable_historical')}
 assert.equal(policyForSlug(slug).sha256,historicalStatisticsPolicySha256(p));assert.equal(priceCommands(slug).length,3)
 for(const patch of[{id:626},{source_policy:null},{source_league_code:'67/6/33880'}])assert.throws(()=>viraZa({...competition,...patch},{installedHistoricalMarkers:binding()}))
 assert.throws(()=>viraZa(competition,{installedHistoricalMarkers:{...binding(),markers:binding().markers.slice(1)}}))
})
for(const x of expected)test('Tóth '+x.sourceMatchId+' retains exact original bytes and official score/event contradiction',()=>{
 policy();const raw=readFileSync(new URL('./vzorci/hu-adatbank-toth-'+x.sourceMatchId+'.html',import.meta.url));assert.equal(raw.length,x.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),x.sha)
 const z=vZapisnik(raw.toString('utf8'),{id:x.sourceMatchId});assert.deepEqual([z.rezultat.domaci,z.rezultat.gostje],x.score);assert.deepEqual([0,1].map(i=>z.goli.filter(g=>(g.avtogol?1-g.ekipaIdx:g.ekipaIdx)===i).length),x.events)
})
test('Tóth installed markers skip ordinary/fresh/targeted archive and pre-forfeit body reads',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()})
 for(const x of expected){
  let calls=0;const read=async url=>{calls++;assert.ok(!url.includes('/match/'));return page(x)}
  for(const options of[{}, {sveziZapisniki:new Set([x.sourceMatchId])},{samoZapisnik:x.sourceMatchId}]){calls=0;assert.deepEqual(await vir.zapisniki('65/6/31904',read,options),[]);if(options.samoZapisnik)assert.equal(calls,0)}
  const rounds=await vir.razporedVseStrani('65/6/31904',read);assert.equal(rounds[0].tekme[0].historicalMarker.matchId,x.mid);assert.equal(rounds[0].tekme[0].kontumacija,false)
  for(const html of[page(x).replace(x.home,'Other club'),page(x).replace(x.score.join(' - '),'2 - 8'),page(x).replace(x.date.replaceAll('-','. '),'2026. 10. 31')])await assert.rejects(vir.razporedVseStrani('65/6/31904',async()=>html),/identity/)
 }
 await assert.rejects(vir.zapisniki('65/6/31905',async()=>assert.fail('foreign code read')),/foreign/)
 const p=page(expected[0]).replaceAll('2079402','2090950').replace('3 - 0','2 - 1')
 const reports=await vir.zapisniki('65/6/31904',async url=>url.includes('/match/')?readFileSync(new URL('./vzorci/hu-adatbank-tekma-65-20-31672-2090950.html',import.meta.url),'utf8'):p)
 assert.equal(reports.length,1);assert.equal(reports[0].id,'2090950')
})
