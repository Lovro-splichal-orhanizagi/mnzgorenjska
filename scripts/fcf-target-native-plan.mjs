import {FCF_SIX_SOURCE_POLICY,getFcfSixPolicy,validateFcfSixInstalledMarkers} from './fcf-six-historical-policy.mjs'
// Pure proposal/row projections only. No admission, reader brand, transport, SQL
// or executable writer. A caller-written sourceData object confers no authority;
// the future reviewed adapter must obtain it directly from the Task5 getter and
// independently revalidate the proposal/DB state before any mutation.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razpakiraj} from './klubi.mjs'
import {imeHash,regHash} from './anonimizacija.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as fingerprint} from './lib/historical-statistics-policy.mjs'
import {validateFcfCurrentReleaseCalendar} from './fcf-historical-release.mjs'
import {validateFcfTargetReleaseInventory} from './fcf-target-release.mjs'
const targets={'es-ct-segona-g1':783,'es-ct-tercera-g9':797}
const historical={'4109388':[321646,8574,8575],'4116215':[297199,8195,8188],'4118352':[306164,8304,8305],'4118358':[306171,8301,8298],'4118354':[306166,7566,8308]}
const reviewed=JSON.parse(readFileSync(new URL('./policies/historical-statistics-club-bindings.json',import.meta.url))).bindings.filter(b=>b.provider==='fcf')
const sixReviewed=[...reviewed,{provider:'fcf',sourceClubId:'5029',sourceCategoryId:'33592',countryCode:'ES',canonicalNames:['BESCANO, C.D.'],proofs:[{sourceMatchId:'4109389',sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4109389',rawSha256:'5f102da312280ff3f4ff5f65bf067e8f71e9f0301c5bae5b578d81ed02f93e97',side:'away',round:1,playedOn:'2026-09-19'}]},...[[ '1372','19610692','CAN VIDALET, C.F.'],['54319880','54709553','ONA SANT ADRIA, F.C.']].map(([sourceClubId,sourceCategoryId,name])=>({provider:'fcf',sourceClubId,sourceCategoryId,countryCode:'ES',canonicalNames:[name],proofs:[{sourceMatchId:'4118354',sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4118354',rawSha256:'f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556'}]}))]
const sha=text=>createHash('sha256').update(text).digest('hex'),key=c=>`${c.sourceClubId}/${c.sourceCategoryId}`
const fail=message=>{throw Error(`FCF_NATIVE_PLAN: ${message}`)},id=n=>Number.isSafeInteger(n)&&n>0
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
function context(input){
 const {targetSlug,sourceData:s,databaseInventory:d,now=Date.now(),writerCommit}=input
 if(!Object.hasOwn(targets,targetSlug)||!s||s.targetSlug!==targetSlug||s.competition?.id!==targets[targetSlug]||s.competition?.slug!==targetSlug||!Number.isFinite(now)||!/^[a-f0-9]{40}$/.test(writerCommit??'')||!/^[a-f0-9]{40}$/.test(s.binding?.sourceCommit??'')||!/^[a-f0-9]{64}$/.test(s.binding?.sourceFingerprintSha256??'')||s.binding.sourceClaimState!=='consumed')fail('exact selected target, original consumed source binding and writer commit required')
 try{validateFcfTargetReleaseInventory({targetSlug,databaseInventory:d,cleanupPhase:d?.groups?.every(g=>g.source_policy===null)?'prepared':'applied',sourcePolicy:s.competition.source_policy,now})}catch(e){fail(e.message)}
 if(!Array.isArray(d.teams)||d.teams.length!==16||d.teams.some(t=>!id(t.id)||t.competition_id!==targets[targetSlug]||typeof t.name!=='string'||!t.name)||new Set(d.teams.map(t=>t.id)).size!==16)fail('sixteen unique canonical selected-target teams required')
 if(!Array.isArray(d.rounds)||d.rounds.length!==30||d.rounds.some(r=>!id(r.id)||r.competition_id!==targets[targetSlug]||r.season!=='2026/27'||!Number.isInteger(r.number)||r.number<1||r.number>30)||new Set(d.rounds.map(r=>r.id)).size!==30||new Set(d.rounds.map(r=>r.number)).size!==30)fail('exact current thirty-round inventory required')
 if(!Array.isArray(d.matches)||d.matches.length!==240||d.matches.some(m=>!id(m.id)||!d.rounds.some(r=>r.id===m.round_id)||!d.teams.some(t=>t.id===m.home_team_id)||!d.teams.some(t=>t.id===m.away_team_id)||m.home_team_id===m.away_team_id||!Object.hasOwn(m,'zapisnik_id'))||new Set(d.matches.map(m=>m.id)).size!==240)fail('exact current240 fixture inventory required')
 if(!Array.isArray(s.fixtures)||s.fixtures.length!==240||!Array.isArray(s.clubs)||s.clubs.length!==16)fail('full native240/16 source projection required')
 let calendar
 try{calendar=validateFcfCurrentReleaseCalendar(s.fixtures)}catch(e){fail(e.message)}
 if(fingerprint([...s.clubs].sort((a,b)=>key(a).localeCompare(key(b))))!==fingerprint(calendar.clubs))fail('native clubs disagree with full source calendar')
 const policy=(s.competition.source_policy===FCF_SIX_SOURCE_POLICY?getFcfSixPolicy:getHistoricalStatisticsPolicy)(targetSlug)
 // Native report blocks come from the already checked immutable DB source tuple.
 const code=d.groups.find(g=>g.slug===targetSlug).sourceLeagueCode,[first,last]=code.split('-').map(Number),seen=new Set()
 for(const f of s.fixtures){
  const native=Number(f.id?.replace(/^es/,''))
  if(!/^es[1-9]\d*$/.test(f.id??'')||native<first||native>last||seen.has(f.id))fail('full native source IDs differ/duplicate')
  seen.add(f.id)
 }
 return{targetSlug,s,d,now,writerCommit,policy,calendar}
}
function exceptionAnchors(bindings,six){
 const descriptors=six?sixReviewed:reviewed
 if(!Array.isArray(bindings)||bindings.length!==descriptors.length||new Set(bindings.map(b=>`${b?.source_club_id}/${b?.source_category_id}`)).size!==descriptors.length)fail('all eight immutable FCF exception bindings required')
 const anchors=new Map()
 for(const b of descriptors){
  const a=bindings.find(a=>a.source_club_id===b.sourceClubId&&a.source_category_id===b.sourceCategoryId)
  if(!a||a.provider!=='fcf'||a.country_code!=='ES'||fingerprint(a.canonical_names)!==fingerprint(b.canonicalNames)||fingerprint(a.proofs)!==fingerprint(b.proofs)||!Object.hasOwn(a,'bound_team_id'))fail('immutable exception descriptor differs')
  if(six&&b.sourceClubId==='5029'){if(a.bound_team_id!==null&&a.bound_team_id!==8576)fail('existing bound exception team conflicts');anchors.set(key(b),8576);continue}
  const report=b.proofs[0].sourceMatchId,policy=['es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9'].map(six?getFcfSixPolicy:getHistoricalStatisticsPolicy).find(p=>p.entries.some(e=>e.sourceMatchId===report)),entry=policy.entries.find(e=>e.sourceMatchId===report),side=entry.homeSourceClubId===b.sourceClubId&&entry.homeSourceCategoryId===b.sourceCategoryId?0:1
  const teamId=historical[report][side+1]
  if(a.bound_team_id!==null&&a.bound_team_id!==teamId)fail('existing bound exception team conflicts')
  anchors.set(key(b),teamId)
 }
 return anchors
}
function mapping(input={},auditedUTC){
 const {targetSlug,s,d,now,writerCommit,policy,calendar}=context(input),exceptions=exceptionAnchors(input.existingExceptionBindings,s.competition.source_policy===FCF_SIX_SOURCE_POLICY),anchors=new Map(exceptions),usedTeams=new Set()
 auditedUTC??=new Date(now).toISOString()
 const stamp=Date.parse(auditedUTC)
 if(!Number.isFinite(stamp)||stamp>now||now-stamp>24*3600000)fail('original proposal audit clock is stale/future')
 // Actual report IDs/rounds/sides anchor ordinary native clubs before any name
 // bootstrap. Display changes cannot erase a proven native team identity.
 const nativeFixtures=new Map(s.fixtures.map(f=>[f.id,f])),seenNative=new Set()
 for(const m of d.matches){
  if(m.zapisnik_id===null)continue
  const f=nativeFixtures.get(m.zapisnik_id),round=d.rounds.find(r=>r.id===m.round_id)
  if(!f||round.number!==f.round||seenNative.has(m.zapisnik_id))fail('persisted native fixture/round anchor differs or duplicates')
  seenNative.add(m.zapisnik_id)
  f.clubs.forEach((c,side)=>{
   const k=key(c),team=side?m.away_team_id:m.home_team_id
   if(anchors.has(k)&&anchors.get(k)!==team)fail('conflicting native fixture/exception side anchors')
   anchors.set(k,team)
  })
 }
 const mappings=calendar.clubs.map(c=>{
  const anchored=anchors.get(key(c)),candidates=anchored?d.teams.filter(t=>t.id===anchored):d.teams.filter(t=>razpakiraj(t.name)===razpakiraj(c.name))
  if(candidates.length!==1||usedTeams.has(candidates[0].id))fail('native team has no unique canonical target resolution')
  const team=candidates[0];usedTeams.add(team.id)
  return{nativeClubId:c.sourceClubId,nativeCategoryId:c.sourceCategoryId,sourceName:c.name,teamId:team.id,canonicalTeamName:team.name,existingExceptionAnchor:exceptions.has(key(c)),evidenceFixtureIds:s.fixtures.filter(f=>f.clubs.some(x=>key(x)===key(c))).map(f=>f.id).sort()}
 })
 const byNative=new Map(mappings.map(m=>[`${m.nativeClubId}/${m.nativeCategoryId}`,m])),usedMatches=new Set(),fixtures=[]
 for(const f of s.fixtures){
  const round=d.rounds.find(r=>r.number===f.round),home=byNative.get(key(f.clubs[0])).teamId,away=byNative.get(key(f.clubs[1])).teamId
  const matches=d.matches.filter(m=>m.round_id===round.id&&m.home_team_id===home&&m.away_team_id===away)
  if(matches.length!==1||usedMatches.has(matches[0].id)||matches[0].zapisnik_id!==null&&matches[0].zapisnik_id!==f.id)fail('native round/fixture sides do not resolve uniquely to actual DB fixture')
  const match=matches[0];usedMatches.add(match.id)
  const marker=policy.entries.find(e=>`es${e.sourceMatchId}`===f.id)
  if(marker?.sourceMatchId==='4109404'){const installed=d.installedMarkers?.find(b=>b.policyId===policy.id);try{validateFcfSixInstalledMarkers({competition:s.competition,binding:installed})}catch(e){fail(e.message)};const exact=installed.markers.find(m=>m.sourceMatchId==='4109404');if(match.id!==exact.matchId||round.id!==exact.roundId||home!==8575||away!==8576)fail('unknown-score installed marker/native sides differ')}
  else if(marker&&(match.id!==historical[marker.sourceMatchId][0]||home!==historical[marker.sourceMatchId][1]||away!==historical[marker.sourceMatchId][2]))fail('exact historical match/side identity differs')
  fixtures.push({sourceMatchId:f.id,sourceRound:f.round,matchId:match.id,roundId:round.id,homeTeamId:home,awayTeamId:away})
 }
 // Only identity fields belong to mapping approval: cleanup legitimately changes
 // policy/import/status/bound_team_id, and readiness can change round deadlines.
 // Those actual fields are validated separately, never treated as mapping identity.
 // A null stored native ID may materialize the exact already-proven source ID;
 // every conflicting non-null ID was refused before this projection.
 const projection={teams:d.teams.map(t=>({id:t.id,competition_id:t.competition_id,name:t.name})).sort((a,b)=>a.id-b.id),rounds:d.rounds.map(r=>({id:r.id,competition_id:r.competition_id,season:r.season,number:r.number})).sort((a,b)=>a.id-b.id),matches:fixtures.map(f=>({id:f.matchId,round_id:f.roundId,home_team_id:f.homeTeamId,away_team_id:f.awayTeamId,zapisnik_id:f.sourceMatchId})).sort((a,b)=>a.id-b.id)}
 const proposal={schemaVersion:1,kind:'fcf-native-target-mapping',targetSlug,sourceCommit:writerCommit,captureSourceCommit:s.binding.sourceCommit,auditedUTC,sourceFingerprintSha256:s.binding.sourceFingerprintSha256,databaseSha256:fingerprint(projection),existingExceptionBindingsSha256:fingerprint(s.competition.source_policy===FCF_SIX_SOURCE_POLICY?sixReviewed:reviewed),mappings,fixtures:fixtures.sort((a,b)=>a.sourceMatchId.localeCompare(b.sourceMatchId))}
 const proposalText=JSON.stringify(proposal)
 return freeze({proposalText,proposalSha256:sha(proposalText)})
}
/** Descriptive proposal only; its hash is not source authentication or mapping approval. */
export const planFcfNativeMapping=input=>mapping(input)
/** Exact replay retains original audit time while validating fresh current inputs. */
export function verifyFcfNativeMappingProposal(input={}){
 const{text,hash}={text:input.proposalText,hash:input.proposalSha256}
 if(typeof text!=='string'||Buffer.byteLength(text)>8*1024*1024||!/^[a-f0-9]{64}$/.test(hash??'')||sha(text)!==hash)fail('exact mapping proposal TEXT/SHA required')
 let p
 try{p=JSON.parse(text)}catch{fail('invalid mapping proposal JSON')}
 const rebuilt=mapping(input,p.auditedUTC)
 if(rebuilt.proposalText!==text||rebuilt.proposalSha256!==hash)fail('proposal differs from current native identity derivation')
 return rebuilt
}
function privacyProjection(d,f,targetSlug){
 const p=d.identityPrivacy,c=d.groups.find(g=>g.slug===targetSlug)
 if(!p||p.schemaVersion!==1||p.kind!=='fcf-native-privacy-projection'||p.countryCode!=='ES'||!id(p.countryId)||p.countryId!==c.country_id||p.targetCompetitionId!==c.id||p.method!=='explicitBEGIN_READ_ONLY_ROLLBACK'||p.capturedUTC!==d.capturedUTC||p.complete!==true||!Array.isArray(p.checkedKeys)||new Set(p.checkedKeys).size!==p.checkedKeys.length||p.checkedKeys.some(k=>!/^[a-f0-9]{64}$/.test(k))||!Array.isArray(p.matches))fail('complete fresh country-scoped identity privacy projection required')
 for(const a of f.appearances)if(!p.checkedKeys.includes(regHash(p.countryId,a.regSt))||!p.checkedKeys.includes(imeHash(p.countryId,a.ime)))fail('privacy projection did not check every native registration/name key')
 const seen=new Set()
 for(const m of p.matches){
  const k=`${m.player_id}/${m.kljuc}`
  if(!id(m.player_id)||!id(m.competition_id)||m.country_id!==p.countryId||!/^[a-f0-9]{64}$/.test(m.kljuc??'')||!['ugovor','neaktiven'].includes(m.anonimiziran_razlog)||!Number.isFinite(Date.parse(m.anonimiziran_at))||seen.has(k))fail('privacy match projection is ambiguous/incomplete')
  seen.add(k)
 }
 return p
}
/** One-match native-ID rows for a future atomic importer, never a DB write. */
export function planFcfNativeMatchRows(input={}){
 return matchRows(input,JSON.parse(planFcfNativeMapping(input).proposalText))
}
function matchRows(input,mapping){
 const{sourceData:s,databaseInventory:d,sourceMatchId}=input,f=s.fixtures.find(f=>f.id===sourceMatchId),m=mapping.fixtures.find(m=>m.sourceMatchId===sourceMatchId)
 if(!f||!m)fail('exact selected native match required')
 if(!Array.isArray(d.players)||d.players.some(p=>!id(p.id)||p.competition_id!==targets[input.targetSlug])||new Set(d.players.map(p=>p.id)).size!==d.players.length)fail('selected current player inventory required')
 if(['pending','unavailable_historical'].includes(f.statisticsStatus))return freeze({sourceMatchId,matchId:m.matchId,statisticsStatus:f.statisticsStatus,players:[],appearances:[],goals:[]})
 if(f.statisticsStatus!=='available'||!Array.isArray(f.appearances)||!Array.isArray(f.goals))fail('strict complete native match facts required')
 const privacy=privacyProjection(d,f,input.targetSlug)
 const byReg=new Map(),players=[],appearances=[],seen=new Set()
 for(const a of f.appearances){
  if(!id(a.regSt)||![0,1].includes(a.ekipaIdx)||seen.has(a.regSt)||typeof a.ime!=='string'||!a.ime.trim()||typeof a.zacetnik!=='boolean'||typeof a.vratar!=='boolean'||![a.minutaOd,a.minutaDo,a.minute].every(Number.isInteger)||a.minutaOd<0||a.minutaDo>90||a.minute!==a.minutaDo-a.minutaOd||a.minute<0)fail('native appearance identity/interval differs; no name or shirt fallback')
  if(!['goli','avtogoli','goliIzEnajstmetrovke','zgreseneEnajstmetrovke','rumeni','rdeci','prejetiGoli'].every(k=>Number.isInteger(a[k])&&a[k]>=0)||typeof a.cleanSheet!=='boolean')fail('complete native appearance statistic fields required')
  seen.add(a.regSt)
  const found=d.players.filter(p=>p.reg_st===a.regSt)
  const keys=[regHash(privacy.countryId,a.regSt),imeHash(privacy.countryId,a.ime)],protectedMatches=privacy.matches.filter(p=>keys.includes(p.kljuc)&&(p.competition_id===targets[input.targetSlug]||p.anonimiziran_razlog==='ugovor'))
  if(protectedMatches.length)fail(protectedMatches.every(p=>p.anonimiziran_razlog==='neaktiven')?'privacy inactivity restoration requires the separately reviewed normal route':'protected privacy identity cannot be emitted as a named player')
  if(found.length>1||found.some(p=>p.anonimiziran_at!=null||p.anonimiziran_razlog!=null)||!found.length&&d.players.some(p=>p.reg_st==null&&p.full_name===a.ime))fail('ambiguous/unregistered/anonymized native player identity')
  const p=found[0],teamId=a.ekipaIdx===0?m.homeTeamId:m.awayTeamId
  const officialGK=a.vratar&&(!p||p.position_source!=='admin'&&(p.position==null||['neznano','ugibanje'].includes(p.position_source)))
  const player={reg_st:a.regSt,player_id:p?.id??null,team_id:teamId,full_name:a.ime,position:officialGK?'GK':p?.position??null,position_source:officialGK?'zapisnik':p?.position_source??'neznano'}
  players.push(player);byReg.set(a.regSt,{a,player})
  appearances.push({match_id:m.matchId,player_id:player.player_id,player_reg_st:a.regSt,team_id:teamId,shirt_number:a.st??null,started:a.zacetnik,minute_on:a.minutaOd,minute_off:a.minutaDo,minutes_played:a.minute,goals:a.goli,own_goals:a.avtogoli,penalties_scored:a.goliIzEnajstmetrovke,penalties_missed:a.zgreseneEnajstmetrovke,yellow_cards:a.rumeni,red_cards:a.rdeci,goals_conceded:a.prejetiGoli,clean_sheet:a.cleanSheet,is_goalkeeper:a.vratar})
 }
 for(const side of[0,1]){
  const starters=f.appearances.filter(a=>a.ekipaIdx===side&&a.zacetnik),keepers=f.appearances.filter(a=>a.ekipaIdx===side&&a.vratar&&a.minute>0).sort((a,b)=>a.minutaOd-b.minutaOd||a.minutaDo-b.minutaDo)
  let until=0
  for(const k of keepers){if(k.minutaOd!==until)fail('continuous explicit GK0–90 required');until=k.minutaDo}
  if(starters.length!==11||starters.filter(a=>a.vratar).length!==1||until!==90)fail('eleven starters and continuous explicit GK0–90 required')
 }
 const goals=f.goals.map(g=>{
  const found=byReg.get(g.regSt)
  if(!id(g.regSt)||!found||found.a.ekipaIdx!==g.ekipaIdx||!Number.isInteger(g.minuta)||g.minuta<found.a.minutaOd||g.minuta>found.a.minutaDo||typeof g.avtogol!=='boolean'||typeof g.enajstmetrovka!=='boolean')fail('goal requires explicit event/native actor within actual appearance; no shirt or name fallback')
  return{match_id:m.matchId,scorer_id:found.player.player_id,scorer_reg_st:g.regSt,team_id:found.player.team_id,minute:g.minuta,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka,score_home:g.rezultat?.[0]??null,score_away:g.rezultat?.[1]??null}
 })
 const score=[0,0]
 for(const g of f.goals)score[g.avtogol?1-g.ekipaIdx:g.ekipaIdx]++
 if(score[0]!==f.homeGoals||score[1]!==f.awayGoals)fail('official score and native goal events differ')
 return freeze({sourceMatchId,matchId:m.matchId,statisticsStatus:f.statisticsStatus,players,appearances,goals})
}
/** Full target projection. One identity derivation, no transport or authority. */
export function planFcfNativeTargetRows(input={}){
 const proposal=planFcfNativeMapping(input),mapping=JSON.parse(proposal.proposalText),players=new Map(),matches=[]
 for(const f of input.sourceData.fixtures){
  const rows=matchRows({...input,sourceMatchId:f.id},mapping);matches.push(rows)
  for(const p of rows.players){
   const old=players.get(p.reg_st)
   if(old&&old.date===f.date&&old.player.team_id!==p.team_id)fail('same-date conflicting current native clubs')
   if(!old||old.date<f.date)players.set(p.reg_st,{date:f.date,player:p})
  }
 }
 return freeze({...proposal,matches,players:[...players.values()].map(v=>v.player).sort((a,b)=>a.reg_st-b.reg_st)})
}
