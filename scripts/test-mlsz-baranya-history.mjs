import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import{createHash}from'node:crypto'
import{vZapisnik,nastopi}from'./viri/mlsz.mjs'
import{viraZa}from'./viri/index.mjs'
import{getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256,classifyHistoricalStatistics}from'./lib/historical-statistics-policy.mjs'
import{policyForSlug,priceCommands}from'./reviewed-existing-history.mjs'
const slug='hu-ba-u19-2',competition={id:615,slug,source:'mlsz',source_league_code:'67/2/33847',source_policy:'reviewed-existing-history-20261023-v1',firstFantasyPlayedOn:'2026-10-31'}
const expected=[
 {sourceMatchId:'2111703',mid:624245,rid:35693,round:1,date:'2025-09-13',home:'EGERÁG SE',away:'SÁSD VSK',homeID:'315796',awayID:'315795',ht:5870,at:5879,score:[3,0],events:[0,0],bytes:109828,sha:'8d658e612d7be17b447076737c5a4157f83d0a9a0c0dd174c979e5ce7232ab9e'},
]
const policy=()=>{const p=getHistoricalStatisticsPolicy(slug);assert.ok(p,'exact reviewed Baranya policy is registered');return p}
const binding=()=>{const p=policy();return{installed:true,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),firstFantasyPlayedOn:'2026-10-31',markers:p.entries.map(e=>{const{rawSha256,reasonCode,...f}=e,x=expected.find(x=>x.sourceMatchId===e.sourceMatchId);return{sourceMatchId:e.sourceMatchId,reportId:e.sourceMatchId,fixture:{...f,season:p.season},rawSha256,matchId:x.mid,roundId:x.rid,homeTeamId:x.ht,awayTeamId:x.at,policyId:p.id,policySha256:historicalStatisticsPolicySha256(p),statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}}
const page=(x)=>'<div id="turnsTitle"><select><option value='+x.round+'>'+x.round+'. forduló</option></select></div><div id="match_panel"><div class="schedule"><div class="home_team"><span>'+x.home+'</span></div><div class="away_team"><span>'+x.away+'</span></div><a href="/match/65/2/32200/'+x.round+'/'+x.sourceMatchId+'.html">Report</a><div class="schedule-points">'+x.score.join(' - ')+'</div><div class="team_sorsolas_date">'+x.date.replaceAll('-','. ')+'. 15:00</div></div><div class="team_lapbar"></div>'
test('Baranya registers only its one approved archive report below the reviewed cap',()=>{
 const p=policy();assert.equal(p.entries.length,1);assert.equal(p.season,'2025/26');assert.match(p.approvalReference,/call_3a8674f5af8c4b8c8ba9bac6c54d0481/);assert.ok(1/28<=0.05);assert.deepEqual(p.archiveSourceLeagueCodes,['65/2/32199','65/2/32200']);assert.deepEqual(p.reviewedArchiveReportCounts,{'65/2/32199':28,'65/2/32200':28})
 for(const x of expected){const e=p.entries.find(e=>e.sourceMatchId===x.sourceMatchId);assert.ok(e);assert.deepEqual([e.sourceCompetitionId,e.sourceRound,e.playedOn,e.homeSourceClubId,e.awaySourceClubId,e.observedHomeScore,e.observedAwayScore,e.rawSha256],['65/2/32200',x.round,x.date,x.homeID,x.awayID,...x.score,x.sha]);assert.equal(classifyHistoricalStatistics({competition,fixture:{...e,season:p.season},rawSha256:e.rawSha256}).kind,'unavailable_historical')}
 assert.equal(policyForSlug(slug).sha256,historicalStatisticsPolicySha256(p));assert.equal(priceCommands(slug).length,3)
 for(const patch of[{id:616},{source_policy:null},{source_league_code:'67/6/33880'}])assert.throws(()=>viraZa({...competition,...patch},{installedHistoricalMarkers:binding()}))
 assert.throws(()=>viraZa(competition,{installedHistoricalMarkers:{...binding(),markers:[]}}))
})
for(const x of expected)test('Baranya '+x.sourceMatchId+' retains exact original bytes and official score/event contradiction',()=>{
 policy();const raw=readFileSync(new URL('./vzorci/hu-adatbank-baranya-'+x.sourceMatchId+'.html',import.meta.url));assert.equal(raw.length,x.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),x.sha)
 const z=vZapisnik(raw.toString('utf8'),{id:x.sourceMatchId});assert.deepEqual([z.rezultat.domaci,z.rezultat.gostje],x.score);assert.deepEqual([0,1].map(i=>z.goli.filter(g=>(g.avtogol?1-g.ekipaIdx:g.ekipaIdx)===i).length),x.events)
})
test('Baranya installed markers skip ordinary/fresh/targeted archive and pre-forfeit body reads',async()=>{
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()})
 for(const x of expected){
  let calls=0;const read=async url=>{calls++;assert.ok(!url.includes('/match/'));return page(x)}
  for(const options of[{}, {sveziZapisniki:new Set([x.sourceMatchId])},{samoZapisnik:x.sourceMatchId}]){calls=0;assert.deepEqual(await vir.zapisniki('65/2/32200',read,options),[]);if(options.samoZapisnik)assert.equal(calls,0)}
  const rounds=await vir.razporedVseStrani('65/2/32200',read);assert.equal(rounds[0].tekme[0].historicalMarker.matchId,x.mid);assert.equal(rounds[0].tekme[0].kontumacija,false)
  for(const html of[page(x).replace(x.home,'Other club'),page(x).replace(x.score.join(' - '),'2 - 8'),page(x).replace(x.date.replaceAll('-','. '),'2026. 10. 31')])await assert.rejects(vir.razporedVseStrani('65/2/32200',async()=>html),/identity/)
 }
 await assert.rejects(vir.zapisniki('65/2/32201',async()=>assert.fail('foreign code read')),/foreign/)
 const p=page(expected[0]).replaceAll('2111703','2090950').replace('3 - 0','2 - 1')
 const reports=await vir.zapisniki('65/2/32200',async url=>url.includes('/match/')?readFileSync(new URL('./vzorci/hu-adatbank-tekma-65-20-31672-2090950.html',import.meta.url),'utf8'):p)
 assert.equal(reports.length,1);assert.equal(reports[0].id,'2090950')
})

test('Baranya preserves the valid other archive and authoritative off-field red clock',async()=>{
 const raw=readFileSync(new URL('./vzorci/hu-adatbank-baranya-2111691.html',import.meta.url))
 assert.equal(raw.length,140775);assert.equal(createHash('sha256').update(raw).digest('hex'),'c8ed7d9b891207472a2be34d11d41b4cc6491ec8a73d0f283afb0eeb8d604f88')
 const z=vZapisnik(raw.toString('utf8'),{id:'2111691'})
 assert.deepEqual([z.rezultat.domaci,z.rezultat.gostje],[2,4]);assert.equal(z.goli.length,6);assert.equal(z.opozorila.length,0)
 const apps=nastopi(z),p=apps.find(x=>x.regSt===715260)
 assert.equal(p.minutaDo,85);assert.equal(p.redCardMinute,90);assert.equal(p.rdeci,1);assert.equal(apps.filter(x=>x.ekipaIdx===1).reduce((n,x)=>n+x.minute,0),990)
 assert.ok(apps.filter(x=>!x.rdeci).every(x=>x.redCardMinute===null))
 const vir=viraZa(competition,{installedHistoricalMarkers:binding()})
 const schedule=page({...expected[0],sourceMatchId:'2111691',round:5,date:'2025-10-25',home:'SZEDERKÉNYI SE',away:'BEREMENDI ÉPÍTŐK',score:[2,4]}).replaceAll('65/2/32200','65/2/32199')
 const reports=await vir.zapisniki('65/2/32199',async url=>url.includes('/match/')?raw.toString('utf8'):schedule)
 assert.equal(reports.length,1);assert.equal(reports[0].id,'2111691')
 assert.equal(getHistoricalStatisticsPolicy(slug).entries.some(e=>e.sourceMatchId==='2111691'),false)
})

test('Baranya appends its exact objects without changing prior policy, binding or target values',()=>{
 for(const[file,key,count,added,digest]of[
  ['historical-statistics-exclusions.json','policies',22,1,'69a00a8e02560e10b0707e07bed65d85c64bc89b98fba2999427e84624c30c2f'],
  ['historical-statistics-club-bindings.json','bindings',76,2,'186d2a3e9d427546dbb656df3aea37a5b1ee0307abc717ab1a84d22c46a0fc72'],
  ['reviewed-existing-cleanup-targets-20261023.json','competitions',9,1,'c574efb0bef98b1ba9adb94ee22611eed8d8879017e79233a656c0095741ae51'],
 ]){
  const values=JSON.parse(readFileSync(new URL('./policies/'+file,import.meta.url),'utf8'))[key]
  assert.equal(values.length,count+added)
  assert.equal(createHash('sha256').update(JSON.stringify(values.slice(0,count))).digest('hex'),digest,file+' retains every prior object byte value and policy hash')
 }
})
