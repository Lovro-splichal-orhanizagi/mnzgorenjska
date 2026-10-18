// Exact projection of the existing importer columns for persisted release gates.
// Must only consume a manifest already verified by full original-byte replay.
export function hnsWomenPersistedEvidence(manifest) {
 const byID=new Map(manifest.reports.map(r=>[r.id,r])),fail=message=>{throw Error(`HNS women persisted evidence: ${message}`)}
 return manifest.schedules.flatMap(schedule=>schedule.fixtures.map(f=>{
  const report=byID.get(f.id),unavailable=report?.statisticsStatus==='unavailable_historical',played=!!f.izid
  if(played&&!report)fail('played fixture has no strictly verified report')
  const appearances=!played?[]:unavailable?null:report.appearances.map(n=>({
   side:n.ekipaIdx,sourcePersonId:String(n.regSt),fullName:n.ime,
   shirt_number:n.st,started:n.zacetnik,minute_on:n.minutaOd,minute_off:n.minutaDo,minutes_played:n.minute,goals:n.goli,own_goals:n.avtogoli,
   penalties_scored:n.goliIzEnajstmetrovke,penalties_missed:n.zgreseneEnajstmetrovke,yellow_cards:n.rumeni,red_cards:n.rdeci,goals_conceded:n.prejetiGoli,clean_sheet:n.cleanSheet,is_goalkeeper:Boolean(n.vratar),
  }))
  const goals=!played?[]:unavailable?null:report.z.goli.map(g=>{
   const actor=report.appearances.find(p=>p.ekipaIdx===g.ekipaIdx&&p.st===g.st)
   if(!actor?.regSt)fail('attributed goal has no exact participating source person identity')
   return{side:g.ekipaIdx,sourcePersonId:String(actor.regSt),minute:g.minuta,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka,score_home:g.rezultat?.[0]??null,score_away:g.rezultat?.[1]??null}
  })
  return{sourceMatchId:f.id,sourceCompetitionId:schedule.code,season:schedule.season,internalRound:f.krog,sourceRound:f.sourceRound,sourcePhase:f.sourcePhase,
   playedOn:f.datum,kickoff:f.ura,homeSourceClubId:f.domaciId,awaySourceClubId:f.gostjeId,homeName:f.domaci,awayName:f.gostje,played,explicitPostponed:f.postponed,
   homeGoals:f.izid?.domaci??null,awayGoals:f.izid?.gostje??null,sourceUrl:`https://semafor.hns.family/utakmice/${f.id}/x/`,statisticsStatus:report?.statisticsStatus??'available',
   rawSha256:report?.rawSha256??null,capturedAt:report?.capturedAt??null,warnings:report?.z?.opozorila??null,quality:report?.quality??null,historicalStatistics:report?.historicalStatistics??null,sourceFixture:report?.fixture??null,appearances,goals}
 }))
}
