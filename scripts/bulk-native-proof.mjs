// A source pack is authoritative only after its provider's closed original-byte replay.
// Use loadAndVerifyBulkNative at the admission boundary; verifyBulkNative is the pure comparison.
import {createHash} from 'node:crypto'
import {kljucKlubaPl} from './viri/pzpn.mjs'
import {createFussballPublicSource} from './viri/fussball-public.mjs'
import {parseUnattributedYellow} from '../src/lib/nepripisaniRumeni.mjs'
import {rokKroga} from './razporedi.mjs'
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const hold=message=>{throw Object.assign(Error(`bulk native proof: ${message}`),{dataHold:true})}
const require=(ok,message)=>{if(!ok)hold(message)}
const own=(o,k)=>Object.hasOwn(o??{},k),validId=x=>Number.isSafeInteger(x)&&x>0
const same=(a,b)=>digest(a)===digest(b)
const date=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x
const instant=x=>x==null?null:Date.parse(x)
const expectedCountries={pzpn:'PL',wmzpn:'PL','fussball-public':'DE'}
export function bulkClubKey(source){
 if(source==='pzpn'||source==='wmzpn')return kljucKlubaPl
 if(source==='fussball-public')return createFussballPublicSource({competition:{source,country_id:1,country_code:'DE',slug:'de-key',source_policy:null,source_league_code:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-G:2026/27'}}).kljucKluba
 hold('unsupported source')
}
export function assertBulkCandidate(candidate,packed=candidate){
 require(expectedCountries[candidate?.source]===candidate.country_code&&typeof candidate.slug==='string'&&candidate.slug.startsWith(candidate.country_code.toLowerCase()+'-')&&typeof candidate.source_league_code==='string'&&candidate.source_league_code&&typeof candidate.season==='string'&&candidate.season&&typeof candidate.host==='string'&&candidate.host,'invalid provider/country/season candidate')
 require((candidate.id===undefined||validId(candidate.id))&&(candidate.source==='fussball-public'||validId(candidate.id)),'invalid registered candidate identity')
 require(Array.isArray(candidate.archives)&&candidate.archives.length>0&&candidate.archives.every(a=>typeof a.code==='string'&&a.code&&typeof a.season==='string'&&a.season),'explicit archive scopes required')
 const scopes=[{code:candidate.source_league_code,season:candidate.season},...candidate.archives]
 require(new Set(scopes.map(s=>s.code)).size===scopes.length&&new Set(scopes.map(s=>s.season)).size===scopes.length,'duplicate season/archive ownership')
 const tuple=value=>Object.keys(value??{}).filter(k=>k!=='id').sort().map(k=>[k,value[k]])
 require(packed&&same(tuple(packed),tuple(candidate))&&(packed.id===undefined||packed.id===candidate.id),'source pack candidate differs from admitted tuple')
 return scopes
}
function nativeScope(candidate,snapshot){
 const c=snapshot?.competition
 require(validId(c?.id)&&validId(c.country_id)&&['slug','source','source_league_code','country_code'].every(k=>c[k]===candidate[k])&&(candidate.id===undefined||c.id===candidate.id),'native candidate identity/country differs')
 require(c.active===false&&c.source_policy===null&&c.date_only_deadline_policy===null,'active league or custom policy requires its own route')
 require(snapshot.season===candidate.season,'native current season differs')
 require(['teams','players','rounds','matches'].every(k=>Array.isArray(snapshot[k])),'incomplete native snapshot')
 require(Array.isArray(snapshot.fantasy?.teams)&&!snapshot.fantasy.teams.length&&Array.isArray(snapshot.fantasy?.lineups)&&!snapshot.fantasy.lineups.length,'existing or unknown fantasy data prevents bootstrap')
 for(const name of ['teams','players','rounds','matches'])require(snapshot[name].every(r=>validId(r.id))&&new Set(snapshot[name].map(r=>r.id)).size===snapshot[name].length,`duplicate or invalid native ${name} identity`)
 require(!snapshot.matches.some(m=>m.statistics_status==='unavailable_historical'),'historical exclusions require their reviewed route')
}
function pricing(receipts,candidate,snapshot,expectedSha,now){
 require(/^[a-f0-9]{40}$/.test(expectedSha??'')&&receipts?.expected_sha===expectedSha&&receipts.slug===candidate.slug&&receipts.snapshot_sha256===digest(snapshot),'pricing commit/candidate/snapshot binding differs')
 for(const name of ['keepers','positions','prices']){
  const rows=receipts.steps?.filter(s=>s.stage===name),time=Date.parse(rows?.[0]?.completed_at)
  require(rows?.length===1&&rows[0].status==='COMPLETED'&&Number.isFinite(time)&&time<=+now&&+now-time<=3600_000,`missing fresh completed ${name} receipt`)
 }
}
function warnings(candidate,report){
 const rows=report.z.opozorila
 require(Array.isArray(rows)&&new Set(rows).size===rows.length,'source warnings missing or duplicated')
 for(const warning of rows){
  const e=parseUnattributedYellow(warning)
  require(candidate.source==='fussball-public'&&e?.source==='fussball'&&e.matchId===report.id&&e.sourceUrl===report.url&&e.reason==='not-published'&&e.profileId===null,'unapproved or unbound source warning')
 }
 return rows.slice().sort()
}
const sourceIdentity=a=>`${a.ekipaIdx}|${a.regSt}`
/** Native red clocks are source facts, including a card after the recipient left the field. */
export function bulkAppearances(report){
 require(Array.isArray(report?.nastopi)&&Array.isArray(report.z?.rdeci),'missing source appearance/red-card inventory')
 return report.nastopi.map(a=>{
  const reds=report.z.rdeci.filter(e=>e.ekipaIdx===a.ekipaIdx&&e.regSt===a.regSt)
  require(reds.length<=1,'duplicate source red-card recipient')
  const clock=reds[0]?.minuta??null
  require(!own(a,'redCardMinute')||a.redCardMinute===clock,'source appearance red clock differs from event')
  return {...structuredClone(a),redCardMinute:clock}
 })
}
function sourceReport(report,scope,round,f,clubKey){
 const z=report?.z
 require(typeof report?.id==='string'&&report.id&&typeof report.url==='string'&&z?.zapisnikId===report.id&&z.sezona===scope.season&&z.krog===round.stevilka&&z.datum===f.datum&&(!f.ura||z.ura===f.ura),'source report identity/season/round/date/time differs')
 require(z.nepopoln===false&&z.prazen!==true&&z.domaci&&z.gostje&&clubKey(z.domaci.ime)===clubKey(f.domaci)&&clubKey(z.gostje.ime)===clubKey(f.gostje),'source report incomplete or historical teams differ')
 require(z.rezultat&&['domaci','gostje'].every(k=>Number.isInteger(z.rezultat[k])&&z.rezultat[k]>=0)&&Array.isArray(z.goli),'source result/goal inventory missing')
 const ns=bulkAppearances(report),seen=new Set()
 for(const a of ns){
  require([0,1].includes(a.ekipaIdx)&&validId(a.regSt)&&!seen.has(sourceIdentity(a)),'source appearance identity missing, duplicated or not side-bound');seen.add(sourceIdentity(a))
  require(typeof a.zacetnik==='boolean'&&typeof a.vratar==='boolean'&&typeof a.cleanSheet==='boolean','source role/scoring evidence missing')
  require(['minutaOd','minutaDo','minute','goli','avtogoli','goliIzEnajstmetrovke','zgreseneEnajstmetrovke','rumeni','rdeci','prejetiGoli'].every(k=>Number.isInteger(a[k])&&a[k]>=0)&&a.minutaOd<=a.minutaDo&&a.minutaDo<=90&&a.minute===a.minutaDo-a.minutaOd&&(!a.zacetnik||a.minutaOd===0),'source interval or statistics incomplete')
  require(a.rdeci<=1&&(a.redCardMinute===null?a.rdeci===0:Number.isInteger(a.redCardMinute)&&a.redCardMinute>=0&&a.redCardMinute<=90&&a.rdeci===1),'source red card clock missing')
 }
 for(const side of [0,1]){
  const starters=ns.filter(a=>a.ekipaIdx===side&&a.zacetnik)
  require(starters.length>=7&&starters.length<=11&&starters.filter(a=>a.vratar).length===1,'source starting roles/keeper coverage missing')
  const roster=side===0?z.domaci:z.gostje
  require(Array.isArray(roster.postava)&&roster.postava.length===starters.length&&roster.postava.every(p=>validId(p.regSt)&&starters.some(a=>a.regSt===p.regSt&&a.vratar===p.vratar)),'published starting XI differs from source appearances')
 }
 return ns
}
function compareReport(report,match,ns,snapshot){
 const players=new Map(snapshot.players.map(p=>[p.id,p])),native=match.appearance_rows,ids=[match.home_team_id,match.away_team_id]
 require(Array.isArray(native)&&Array.isArray(match.goal_rows)&&native.length===ns.length&&new Set(native.map(a=>a.player_id)).size===native.length,'native individual report inventory differs')
 for(const a of ns){
  const rows=native.filter(n=>n.team_id===ids[a.ekipaIdx]&&players.get(n.player_id)?.reg_st===a.regSt)
  require(rows.length===1,'source profile/historical side does not identify exactly one native appearance')
  const expected={shirt_number:a.st,started:a.zacetnik,is_goalkeeper:a.vratar,minute_on:a.minutaOd,minute_off:a.minutaDo,minutes_played:a.minute,goals:a.goli,own_goals:a.avtogoli,penalties_scored:a.goliIzEnajstmetrovke,penalties_missed:a.zgreseneEnajstmetrovke,yellow_cards:a.rumeni,red_cards:a.rdeci,red_card_minute:a.redCardMinute,goals_conceded:a.prejetiGoli,clean_sheet:a.cleanSheet}
  for(const [key,value]of Object.entries(expected))require(rows[0][key]===value,`native individual ${key} differs from source profile ${a.regSt}`)
 }
 const goals=report.z.goli.map(g=>{
  require([0,1].includes(g.ekipaIdx)&&validId(g.regSt)&&ns.some(a=>a.ekipaIdx===g.ekipaIdx&&a.regSt===g.regSt)&&Number.isInteger(g.minuta)&&g.minuta>=0&&g.minuta<=90&&typeof g.avtogol==='boolean'&&typeof g.enajstmetrovka==='boolean','unbound source goal identity/event')
  return {reg:g.regSt,team:ids[g.ekipaIdx],minute:g.minuta,own:g.avtogol,penalty:g.enajstmetrovka,home:g.rezultat?.[0]??null,away:g.rezultat?.[1]??null}
 })
 const actual=match.goal_rows.map(g=>({reg:players.get(g.scorer_id)?.reg_st,team:g.team_id,minute:g.minute,own:g.is_own_goal,penalty:g.is_penalty,home:g.score_home??null,away:g.score_away??null}))
 require(same(goals.map(digest).sort(),actual.map(digest).sort()),'native individual goal/scorer/own-goal side/progression differs')
 const score=[0,0]
 for(const g of goals)score[g.own?1-ids.indexOf(g.team):ids.indexOf(g.team)]++
 require(score[0]===match.home_goals&&score[1]===match.away_goals,'source/native goals do not reconcile with result')
}
const sourceScore=f=>{const s=f.izid??f.rezultat;if(s==null)return null;return Array.isArray(s)?s:[s.domaci,s.gostje]}
/** Pure source-to-native comparison; pack must be the output of its installed source verifier. */
export function verifyBulkNative({candidate,pack,snapshot,receipts,expectedSha,now=new Date(),clubKey=bulkClubKey(candidate?.source)}){
 now=new Date(now);require(Number.isFinite(+now),'invalid proof clock')
 require(pack?.candidate&&typeof pack.candidate==='object','missing source pack candidate binding')
 const scopes=assertBulkCandidate(candidate,pack.candidate);nativeScope(candidate,snapshot);pricing(receipts,candidate,snapshot,expectedSha,now)
 const captured=Date.parse(pack?.captured_at)
 require(pack?.version===1&&/^[a-f0-9]{64}$/.test(pack.original_bytes_sha256??'')&&Number.isFinite(captured)&&captured<=+now&&+now-captured<=24*3600_000,'original-byte source pack is missing, future or older than 24 hours')
 require(Array.isArray(pack.seasons)&&pack.seasons.length===scopes.length&&new Set(pack.seasons.map(s=>s.code)).size===scopes.length,'source season inventory differs')
 const usedRounds=new Set(),usedMatches=new Set(),usedReports=new Set(),currentClubs=new Set(),currentKeepers=new Map();let reportCount=0,fixtureCount=0
 const teamsFor=name=>{const rows=snapshot.teams.filter(t=>clubKey(t.name)===clubKey(name));require(clubKey(name)&&rows.length===1,'source club absent or ambiguous in native mapping');return rows[0].id}
 for(const scope of scopes){
  const source=pack.seasons.find(s=>s.code===scope.code)
  require(source?.season===scope.season&&Array.isArray(source.schedule)&&source.schedule.length>0&&Array.isArray(source.reports),'source season/schedule binding missing')
  require(new Set(source.schedule.map(r=>r.stevilka)).size===source.schedule.length&&source.schedule.every(r=>Number.isInteger(r.stevilka)&&r.stevilka>=1&&Array.isArray(r.tekme)&&r.tekme.length>0),'source round inventory invalid')
  require(new Set(source.reports.map(r=>r.id)).size===source.reports.length,'duplicate source report identity')
  const consumedReports=new Set()
  for(const round of source.schedule){
   const rows=snapshot.rounds.filter(r=>r.season===scope.season&&r.number===round.stevilka);require(rows.length===1,'native round inventory differs');const nativeRound=rows[0];usedRounds.add(nativeRound.id)
   const day=round.tekme.map(f=>f.datum).filter(Boolean).sort()[0]??null,time=round.tekme.filter(f=>f.datum===day&&f.ura).map(f=>f.ura).sort()[0]
   require(round.tekme.every(f=>(f.datum==null||date(f.datum))&&(f.ura==null||/^([01]\d|2[0-3]):[0-5]\d$/.test(f.ura))),'invalid source fixture date/kickoff')
   require((nativeRound.played_on??null)===day,'native round date differs')
   const deadline=rokKroga(day,time,Number(snapshot.competition.rok_pomak_ur??6))
   require(instant(nativeRound.deadline_at)===instant(deadline),'native round deadline differs from published kickoff/date')
   for(const f of round.tekme){
    fixtureCount++;const home=teamsFor(f.domaci),away=teamsFor(f.gostje);require(home!==away,'source playing teams collapse')
    if(scope.code===candidate.source_league_code){currentClubs.add(home);currentClubs.add(away)}
    const native=snapshot.matches.filter(m=>m.round_id===nativeRound.id&&m.home_team_id===home&&m.away_team_id===away);require(native.length===1&&!usedMatches.has(native[0].id),'native fixture inventory differs or duplicates source fixture')
    const match=native[0];usedMatches.add(match.id)
    require((match.played_on??null)===(f.datum??null),'native fixture date differs')
    if(f.ura&&own(match,'kickoff_at'))require(instant(match.kickoff_at)===instant(rokKroga(f.datum,f.ura,0)),'native fixture kickoff differs')
    const rs=source.reports.filter(r=>r.z?.krog===round.stevilka&&clubKey(r.z?.domaci?.ime)===clubKey(f.domaci)&&clubKey(r.z?.gostje?.ime)===clubKey(f.gostje))
    const score=sourceScore(f),forfeit=f.kontumacija===true
    require(score===null||score.length===2&&score.every(n=>Number.isInteger(n)&&n>=0),'source fixture score invalid')
    require(rs.length<=1,'ambiguous source fixture/report')
    if(forfeit){
     require(rs.length===0&&match.kontumacija===true&&Array.isArray(match.appearance_rows)&&!match.appearance_rows.length&&Array.isArray(match.goal_rows)&&!match.goal_rows.length,'forfeit cannot contain guessed player statistics')
     require(Array.isArray(match.import_warnings)&&match.import_warnings.length===0,'forfeit carries unreviewed native warnings')
     require(score&&score[0]===match.home_goals&&score[1]===match.away_goals,'forfeit result is not published or differs');continue
    }
    require(match.kontumacija===false,'native forfeit differs from source')
    if(!rs.length){
     require(f.odigrana!==true&&!score&&!match.imported_at&&match.zapisnik_id==null&&match.home_goals===0&&match.away_goals===0&&Array.isArray(match.appearance_rows)&&!match.appearance_rows.length&&Array.isArray(match.goal_rows)&&!match.goal_rows.length,'published report missing or native unplayed fixture has statistics')
     require(Array.isArray(match.import_warnings)&&match.import_warnings.length===0,'unplayed fixture carries unreviewed native warnings')
     require(!f.datum||f.datum>=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Ljubljana',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),'past source fixture missing result/report');continue
    }
    const report=rs[0],ns=sourceReport(report,scope,round,f,clubKey)
    require(f.odigrana!==false,'source report contradicts unplayed fixture')
    require(!usedReports.has(report.id)&&!consumedReports.has(report.id)&&match.zapisnik_id===report.id&&!!match.imported_at,'native report identity/import differs or source archive is shared');usedReports.add(report.id);consumedReports.add(report.id)
    require(match.home_goals===report.z.rezultat.domaci&&match.away_goals===report.z.rezultat.gostje&&(!score||score[0]===match.home_goals&&score[1]===match.away_goals),'native/source fixture result differs')
    require(Array.isArray(match.import_warnings)&&same(match.import_warnings.slice().sort(),warnings(candidate,report)),'native warning inventory differs')
    compareReport(report,match,ns,snapshot)
    if(scope.code===candidate.source_league_code)for(const a of ns.filter(a=>a.vratar)){const club=a.ekipaIdx===0?home:away;if(!currentKeepers.has(club))currentKeepers.set(club,new Set());currentKeepers.get(club).add(a.regSt)}
    reportCount++
   }
  }
  require(consumedReports.size===source.reports.length&&consumedReports.size>0,'source reports missing or outside exact schedule')
 }
 require(usedRounds.size===snapshot.rounds.length&&usedMatches.size===snapshot.matches.length,'extra native round/fixture absent from complete source inventory')
 for(const club of currentClubs)require(snapshot.players.some(p=>p.team_id===club&&p.active===true&&p.position==='GK'&&['zapisnik','admin','glasovanje','klub'].includes(p.position_source)&&validId(p.reg_st)&&currentKeepers.get(club)?.has(p.reg_st)),'current native club has no active source-linked keeper')
 return {version:1,contract_id:'bulk-native-source-replay-v1',candidate:structuredClone(candidate),expected_sha:expectedSha,snapshot_sha256:digest(snapshot),original_bytes_sha256:pack.original_bytes_sha256,pack_sha256:digest(pack),receipts_sha256:digest(receipts),captured_at:pack.captured_at,verified_at:now.toISOString(),reports:reportCount,fixtures:fixtureCount,schedule_complete:true,archives:structuredClone(candidate.archives),archive_collisions:[],keeper_basis:'published-source-role',activationEligible:false}
}
export async function loadAndVerifyBulkNative({directory,loadPack,...options}){
 const loader=loadPack??(await import('./bulk-source-packs.mjs')).loadBulkPack
 const pack=await loader(directory,{candidate:options.candidate,now:options.now??new Date(),requireFresh:true})
 return verifyBulkNative({...options,pack})
}
