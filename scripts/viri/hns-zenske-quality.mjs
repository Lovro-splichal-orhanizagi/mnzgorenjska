// Strict, opt-in evidence checks for the reviewed senior women's HNS containers.
// Ordinary HNS parsing and existing scoring rules remain unchanged.
import {createHash} from 'node:crypto'
import {vZapisnik,nastopi,kljucKlubaHr,minuta} from './hns.mjs'
import {normalizeHnsWomenReport} from './hns-zenske.mjs'
import {classifyHistoricalStatistics,getHistoricalStatisticsPolicy} from '../lib/historical-statistics-policy.mjs'
export const HNS_WOMEN_CLUBS=Object.freeze({'649':'ŽNK Agram','4266':'ŽNK Split','1274':'HNK Gorica s.d.d.','107347':'ŽNK Donat','175835':'ŽNK Međimurje Čakovec','108341':'ŽNK Dinamo','520':'ŽNK Hajduk Split','171':'ŽNK Osijek'})
const fail=message=>{throw Error(`hns women quality: ${message}`)}
const sha=value=>createHash('sha256').update(value).digest('hex')
const EVENT_TYPES=new Set(['goal','penalty','own_goal','penalty_failed','yellow','red','second_yellow','substitutionIn','substitutionOut'])
const sideNames=['domaci','gostje']

export function hnsWomenFixtureIdentity(fixture,sourceCompetitionId) {
 if(!['114471579','108043476'].includes(sourceCompetitionId))fail('unreviewed source competition')
 for(const side of ['domaci','gostje'])if(HNS_WOMEN_CLUBS[fixture[`${side}Id`]]!==fixture[side])fail('source club identity differs')
 return {sourceMatchId:String(fixture.id),sourceCompetitionId,sourcePhase:fixture.sourcePhase,sourceRound:fixture.sourceRound,playedOn:fixture.datum,
 homeSourceClubId:fixture.domaciId,awaySourceClubId:fixture.gostjeId,sourceUrl:`https://semafor.hns.family/utakmice/${fixture.id}/x/`,
 observedHomeScore:fixture.izid?.domaci,observedAwayScore:fixture.izid?.gostje,season:sourceCompetitionId==='114471579'?'2026/27':'2025/26'}
}

// Validate source-only evidence the permissive legacy parser does not expose:
// female roles, native person links, every event type and missing clocks.
function rawPlayers(html) {
 const lineup=html.slice(html.indexOf('matchLineup')),home=lineup.indexOf('homeTeam playerslist'),away=lineup.indexOf('awayTeam playerslist')
 if(home<0||away<0)fail('complete lineup blocks required')
 return [lineup.slice(home,away),lineup.slice(away)].map(block=>{
  const players=[];let bench=false
  const pieces=block.split('<li class="row match_lineup" data-personid="')
  for(let i=1;i<pieces.length;i++) {
   if(pieces[i-1].includes('Pričuvni igrači'))bench=true
   const row=pieces[i],link=row.match(/<h3><a href="[^"]*\/igraci\/(\d+)\/[^\"]*">([^<]+)<\/a>([^<]*)<\/h3>([^<]*)/)
   if(!link)continue // Coach rows are not player evidence.
   const person=Number(row.match(/^(\d+)"/)?.[1]),shirt=Number(row.match(/<div class="shirtNumber">\s*(\d+)/)?.[1]),role=link[4].trim()
   if(!Number.isSafeInteger(person)||person<1||person!==Number(link[1])||!Number.isInteger(shirt)||shirt<1)fail('persistent player identity or shirt missing')
   if(!['Vratarka','Igračica'].includes(role))fail('explicit female player/keeper role required')
   const events=[...row.matchAll(/<li class="([^"]+)"><div class="icon"[^>]*><\/div>([^<]*)<\/li>/g)].map(([,kind,clock])=>({kind,minute:minuta(clock)}))
   for(const event of events)if(!EVENT_TYPES.has(event.kind)||event.kind!=='yellow'&&event.minute==null)fail(`unknown event or missing clock: ${event.kind}`)
   players.push({person,shirt,keeper:role==='Vratarka',bench,events})
  }
  return players
 })
}

export function parseHnsWomenReport(html,{competition,fixture,sourceCompetitionId}) {
 if(typeof html!=='string'||!html.includes('matchHeader')||!html.includes('matchLineup'))fail('full report required')
 const identity=hnsWomenFixtureIdentity(fixture,sourceCompetitionId),rawSha256=sha(html)
 const header=html.slice(html.indexOf('matchHeader'),html.indexOf('matchLineup'))
 const title=header.match(/competition-title"><h2>(.*?)<\/h2>/)?.[1]
 const league=sourceCompetitionId==='114471579'?'SuperSport Prva HNLŽ':fixture.sourcePhase==='Magenta liga - Liga'?'Magenta liga':fixture.sourcePhase
 if(!league||title!==`${league}, ${fixture.sourceRound}. kolo`||!/<div class="status">Završeno<\/div>/.test(header))fail('source competition/phase/round/finished identity differs')
 const z=vZapisnik(html,{id:String(fixture.id),url:identity.sourceUrl})
 if(!z||z.datum!==fixture.datum||z.krog!==fixture.sourceRound||z.sezona!==identity.season||z.rezultat.domaci!==identity.observedHomeScore||z.rezultat.gostje!==identity.observedAwayScore
  ||sideNames.some(side=>kljucKlubaHr(z[side].ime)!==kljucKlubaHr(fixture[side])))fail('source report header/date/club/result identity differs')
 const classification=classifyHistoricalStatistics({competition,fixture:identity,rawSha256})
 if(classification.kind==='unavailable_historical') {
  const policy=getHistoricalStatisticsPolicy(competition.slug)
  return {id:String(fixture.id),url:identity.sourceUrl,z:null,fixture:identity,rawSha256,statisticsStatus:'unavailable_historical',historicalStatistics:{policyId:policy.id,policySha256:classification.policySha256,reasonCode:classification.exception.reasonCode}}
 }
 const raw=rawPlayers(html),warnings=[],keeperTransitions=[],allPeople=new Set()
 if(z.opozorila.length)fail(`normal parser diagnostics: ${z.opozorila.join('; ')}`)
 for(const [side,team]of sideNames.map(s=>z[s]).entries()) {
  if(team.postava.length!==11||team.postava.filter(p=>p.vratar).length!==1)fail('11 starters and exactly one explicit starting keeper required')
  const players=[...team.postava,...team.rezerve],evidence=raw[side]
  if(new Set(players.map(p=>p.st)).size!==players.length)fail('duplicate shirt identity within complete team roster')
  if(evidence.length!==players.length)fail('raw/parsed complete roster differs')
  for(const player of players) {
   const p=evidence.find(p=>p.person===player.regSt&&p.shirt===player.st)
   if(!p||p.keeper!==player.vratar||p.bench!==team.rezerve.includes(player)||allPeople.has(p.person))fail('player identity/role/start-bench differs or duplicates across teams')
   allPeople.add(p.person)
   const ins=p.events.filter(e=>e.kind==='substitutionIn'),outs=p.events.filter(e=>e.kind==='substitutionOut')
   if(ins.length>1||outs.length>1||!p.bench&&ins.length||p.bench&&outs.length&&!ins.length)fail('unsupported reentry or inconsistent substitution participation')
   if(p.bench&&!ins.length&&p.events.some(e=>['goal','penalty','own_goal','penalty_failed','yellow','red','second_yellow'].includes(e.kind)))fail('bench event lacks explicit entry/participation')
   if(p.events.some(e=>e.kind==='yellow'&&e.minute==null))warnings.push(`yellow clock missing for source person ${p.person}; attributed card retained`)
  }
 }
 const appearances=nastopi(z)
 for(const [side,team]of sideNames.map(s=>z[s]).entries()) {
  const players=appearances.filter(p=>p.ekipaIdx===side),reds=z.rdeci.filter(e=>e.ekipaIdx===side)
  if(players.some(p=>!Number.isInteger(p.minutaOd)||!Number.isInteger(p.minutaDo)||p.minutaOd<0||p.minutaDo<p.minutaOd||p.minutaDo>90||p.minute!==p.minutaDo-p.minutaOd))fail('invalid player minute interval')
  const expected=990-reds.reduce((n,r)=>n+90-r.minuta,0)
  if(players.reduce((n,p)=>n+p.minute,0)!==expected)fail('team minutes and explicit dismissal/substitution clocks differ')
  const ins=z.menjave.filter(e=>e.ekipaIdx===side&&e.noter.st!=null),outs=z.menjave.filter(e=>e.ekipaIdx===side&&e.ven.st!=null)
  if(ins.length!==outs.length)fail('unbalanced explicit substitutions')
  const keepers=players.filter(p=>p.vratar).sort((a,b)=>a.minutaOd-b.minutaOd),opponentGoals=z.goli.filter(g=>(g.avtogol?1-g.ekipaIdx:g.ekipaIdx)!==side)
  if(!keepers.length||keepers[0].minutaOd!==0||keepers.at(-1).minutaDo!==90)fail('explicit keeper coverage missing after dismissal/substitution')
  for(let i=1;i<keepers.length;i++) {
   const before=keepers[i-1],after=keepers[i],gap=after.minutaOd-before.minutaDo
   const dismissal=reds.some(r=>r.st===before.st&&r.minuta===before.minutaDo)
   if(gap<0||gap>1||gap===1&&!dismissal)fail('keeper role/interval gap is not a fully published transition')
   if(opponentGoals.some(g=>g.minuta>=before.minutaDo&&g.minuta<=after.minutaOd))fail('goal clock inside ambiguous keeper transition')
   if(gap===1)keeperTransitions.push({side,sourceOutPersonId:before.regSt,sourceInPersonId:after.regSt,dismissalMinute:before.minutaDo,entryMinute:after.minutaOd,preservedKeeperMinutes:keepers.reduce((n,p)=>n+p.minute,0)})
  }
 }
 for(const event of [...z.goli,...z.zgresene,...z.rdeci]) {
  const player=appearances.find(p=>p.ekipaIdx===event.ekipaIdx&&p.st===event.st)
  if(!player||event.minuta==null||event.minuta<player.minutaOd||event.minuta>player.minutaDo)fail('goal/card event outside explicit player participation')
 }
 const normalized=normalizeHnsWomenReport(z,fixture)
 return {id:String(fixture.id),url:identity.sourceUrl,z:normalized,fixture:identity,rawSha256,statisticsStatus:'available',appearances,quality:{warnings,keeperTransitions,explicitKeeperSides:2}}
}
