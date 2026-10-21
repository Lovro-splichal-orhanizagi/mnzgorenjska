// Audit existing derived values only; never attribute or repair a saved penalty.
const require = (ok,message) => { if(!ok)throw Error(`MFA NL derived saves: ${message}`) }
export function verifyDerivedSaves(model,image){
 require([973,974].includes(model.competitionId)&&model.currentOnly!==true&&Array.isArray(model.reports)&&model.reports.length>0,'complete fixed native source model required')
 require(Array.isArray(image.matches)&&Array.isArray(image.players)&&Array.isArray(image.appearances),'native football image required')
 const reports=new Map(image.matches.filter(m=>m.zapisnik_id!=null).map(m=>[m.zapisnik_id,m])),players=new Map(image.players.map(p=>[p.id,p])),assignments=[],seenApps=new Set()
 require(reports.size===model.reports.length&&image.matches.filter(m=>m.zapisnik_id!=null).length===reports.size,'exact native report set required')
 let expectedSaves=0
 for(const report of model.reports){
  const m=reports.get(report.header.reportId);require(m,'source report missing')
  const apps=image.appearances.filter(a=>a.match_id===m.id)
  if(report.header.statisticsStatus==='unavailable_historical'){require(apps.length===0,'unavailable report contains appearances');continue}
  const expected=new Map(report.players.map(p=>[`${p.regSt}/${p.side}`,0]));require(expected.size===report.players.length,'duplicate source appearance')
  for(const side of[0,1]){
   const missed=report.players.filter(p=>p.side===1-side).reduce((n,p)=>n+p.penalties_missed,0)
   require(Number.isSafeInteger(missed)&&missed>=0,'invalid source missed penalties');if(missed===0)continue
   const keepers=report.players.filter(p=>p.side===side&&p.is_goalkeeper&&p.minutes_played>0),max=Math.max(...keepers.map(p=>p.minutes_played)),winners=keepers.filter(p=>p.minutes_played===max)
   require(winners.length===1,'missing or tied greatest-minute official goalkeeper')
   expected.set(`${winners[0].regSt}/${side}`,missed);expectedSaves+=missed
  }
  require(apps.length===expected.size,'native appearance set incomplete')
  const seen=new Set()
  for(const a of apps){
   const p=players.get(a.player_id),side=a.team_id===m.home_team_id?0:a.team_id===m.away_team_id?1:null,key=`${p?.reg_st}/${side}`
   require(p&&side!==null&&expected.has(key)&&!seen.has(key)&&!seenApps.has(a.id),'native appearance identity differs');seen.add(key);seenApps.add(a.id)
   require(Number.isSafeInteger(a.penalties_saved)&&a.penalties_saved===expected.get(key),'missing or unexpected native saved penalties')
   if(a.penalties_saved>0)assignments.push({reportId:report.header.reportId,matchId:m.id,roundId:m.round_id,playerId:p.id,regSt:p.reg_st,teamId:a.team_id,penaltiesSaved:a.penalties_saved})
  }
 }
 require(seenApps.size===image.appearances.length,'unexpected native appearances')
 assignments.sort((a,b)=>a.reportId.localeCompare(b.reportId)||a.regSt-b.regSt)
 return{reports:model.reports.length,appearances:seenApps.size,expectedSaves,assignments,exactParity:true}
}
