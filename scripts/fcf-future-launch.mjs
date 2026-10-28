import {createHash} from 'node:crypto'

/**
 * Pure, versioned DATA contract, never an authentication/admission capability.
 * No IO, ambient clock or machine-local timezone is used. Callers supply:
 * {targetSlug, competitionId, sourceCode, season, sourceFingerprintSha256,
 *  writerCommit, fixtures, mapping, native, now} (now = epoch milliseconds).
 * Fixtures are full canonical source rows {id:'esID',round,date:'YYYY-MM-DD',
 * time:'HH:mm'|null,clubs:[{sourceClubId,sourceCategoryId,...},...],
 * statisticsStatus:'available'|'pending'|'unavailable_historical',...}.
 * All source/native calendar dates belong to [2026-07-01,2027-07-01).
 * Mapping rows have exactly {sourceMatchId,sourceRound,matchId,roundId,
 * homeTeamId,awayTeamId}. Native is {competition,rounds,matches,dependencies}.
 * Competition requires {id,slug,source,source_league_code,active}; rounds require
 * {id,competition_id,season,number,played_on,deadline_at,lineups_locked_at};
 * matches require {id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,
 * imported_at,kontumacija,vir_brez_izida,statistics_status}. These source/native
 * rows may contain additional JSON fields, all bound into the projection hash.
 *
 * Dependencies has EXACTLY {complete:true,competitionUserRows,rounds,matches}:
 * every native round has {roundId,lineupRows,rosterRows,transferRows,chipRows,
 * userRows}; every match has {matchId,appearances,goals,userRows}. All counts
 * are explicit safe nonnegative integers. userRows includes ALL other user
 * references at that scope; completeness must be established by the eventual
 * authenticated reader/SQL, not by this boolean. Missing/unknown state holds.
 *
 * Select the earliest future, completely pending round under the existing
 * midseason distinct-played-round rule (at most two later played rounds).
 * Mixed/elapsed rounds can precede a proposed opening; this does not prove
 * their postponed, closed-score or other source facts are valid. Source-pending
 * versus native imported statistics is a global conflict, never skipped.
 * This module does not approve historical unavailability, source completeness,
 * freshness, prices, keeper coverage, policies, budgets, claims or activation.
 */
const targets={
 'es-ct-segona-g1':{id:783,start:4109388},
 'es-ct-tercera-g9':{id:797,start:4118349},
}
const fail=message=>{throw Error(`FCF_FUTURE_LAUNCH: ${message}`)}
const positive=n=>Number.isSafeInteger(n)&&n>0
const count=n=>Number.isSafeInteger(n)&&n>=0
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype
function exact(x,fields,label) {
 if(!object(x)||Object.keys(x).sort().join(',')!==fields.split(',').sort().join(','))fail(`${label} fields differ`)
}
function canonical(x) {
 if(x===null||typeof x==='string'||typeof x==='boolean')return x
 if(typeof x==='number'&&Number.isFinite(x))return x
 if(Array.isArray(x)) {
  if(Object.keys(x).length!==x.length)fail('dense JSON projection arrays required')
  return x.map(canonical)
 }
 if(object(x))return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]))
 fail('finite plain JSON projection required')
}
const text=x=>JSON.stringify(canonical(x))
const digest=x=>createHash('sha256').update(text(x)).digest('hex')
function freeze(x) {if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
function day(x) {
 if(typeof x!=='string'||!/^202[67]-\d\d-\d\d$/.test(x)||x<'2026-07-01'||x>='2027-07-01')fail('exact season date required')
 const n=Date.parse(`${x}T00:00:00Z`)
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==x)fail('invalid calendar date')
 return n
}
function stamp(x,label) {
 if(typeof x!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(x)||!Number.isFinite(Date.parse(x)))fail(`${label} timestamp required`)
 return Date.parse(x)
}
function uniqueRows(rows,length,key,label) {
 if(!Array.isArray(rows)||rows.length!==length||rows.some(r=>!object(r))||new Set(rows.map(r=>r[key])).size!==length)fail(`complete unique ${label} required`)
 return new Map(rows.map(r=>[r[key],r]))
}
const clubKey=c=>{
 if(!object(c)||typeof c.sourceClubId!=='string'||typeof c.sourceCategoryId!=='string'||!/^[1-9]\d*$/.test(c.sourceClubId)||!/^[1-9]\d*$/.test(c.sourceCategoryId))fail('source club/category identity required')
 return `${c.sourceClubId}/${c.sourceCategoryId}`
}
// Enumerate UTC minutes rather than guessing an offset or letting Date normalize
// an invalid local time. A ±24h UTC window covers Europe/Madrid in this season.
// Exactly one explicit IANA-zone rendering must equal the official wall clock.
const madrid=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
function kickoff(date,time) {
 if(typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('official kickoff time required')
 const wall=day(date)+Number(time.slice(0,2))*3600000+Number(time.slice(3))*60000,matches=[]
 for(let n=wall-86400000;n<=wall+86400000;n+=60000) {
  const p=Object.fromEntries(madrid.formatToParts(n).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]))
  if(`${p.year}-${p.month}-${p.day}`===date&&`${p.hour}:${p.minute}`===time)matches.push(n)
 }
 if(matches.length!==1)fail('ambiguous or nonexistent Madrid kickoff')
 return matches[0]
}

function context(input) {
 exact(input,'targetSlug,competitionId,sourceCode,season,sourceFingerprintSha256,writerCommit,fixtures,mapping,native,now','input')
 const {targetSlug,competitionId,sourceCode,season,fixtures,mapping,native,now}=input,t=targets[targetSlug]
 if(!t||t.id!==competitionId||sourceCode!==`${t.start}-${t.start+239}`||season!=='2026/27'||!Number.isSafeInteger(now)||!Number.isFinite(new Date(now).getTime())||!/^202[67]-/.test(new Date(now).toISOString())||!/^[a-f0-9]{64}$/.test(input.sourceFingerprintSha256??'')||!/^[a-f0-9]{40}$/.test(input.writerCommit??''))fail('exact target/block/season/fingerprint/commit/clock required')
 exact(native,'competition,rounds,matches,dependencies','native projection')
 const c=native.competition
 if(!object(c)||c.id!==competitionId||c.slug!==targetSlug||c.source!=='fcf'||c.source_league_code!==sourceCode||c.active!==false)fail('exact inactive native competition required')
 const fs=uniqueRows(fixtures,240,'id','source calendar'),maps=uniqueRows(mapping,240,'sourceMatchId','mapping'),rs=uniqueRows(native.rounds,30,'id','native rounds'),ms=uniqueRows(native.matches,240,'id','native matches')
 const byRound=new Map(),pairs=new Set(),clubs=new Set(),clubTeams=new Map(),teamClubs=new Map(),usedMatches=new Set(),numbers=new Set()
 for(const r of rs.values()) {
  if(!positive(r.id)||r.competition_id!==competitionId||r.season!==season||!Number.isInteger(r.number)||r.number<1||r.number>30||numbers.has(r.number)||!Object.hasOwn(r,'lineups_locked_at'))fail('native round identity/lock state differs')
  numbers.add(r.number);day(r.played_on);stamp(r.deadline_at,'native deadline')
  if(r.lineups_locked_at!==null)stamp(r.lineups_locked_at,'native lineup lock')
 }
 for(let n=t.start;n<t.start+240;n++) {
  const id=`es${n}`,f=fs.get(id),m=maps.get(id)
  if(!f||!m||!Number.isInteger(f.round)||f.round<1||f.round>30||!['available','pending','unavailable_historical'].includes(f.statisticsStatus)||!Array.isArray(f.clubs)||f.clubs.length!==2)fail('exact source fixture/status/round required')
  day(f.date)
  if(f.time!==null&&(typeof f.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)))fail('invalid official kickoff time')
  const sides=f.clubs.map(clubKey)
  if(sides[0]===sides[1]||pairs.has(sides.join('>')))fail('duplicate directed pair or same source club')
  pairs.add(sides.join('>'));sides.forEach(k=>clubs.add(k))
  exact(m,'sourceMatchId,sourceRound,matchId,roundId,homeTeamId,awayTeamId','mapping row')
  const r=rs.get(m.roundId),a=ms.get(m.matchId)
  if(m.sourceRound!==f.round||!positive(m.matchId)||!positive(m.roundId)||!positive(m.homeTeamId)||!positive(m.awayTeamId)||m.homeTeamId===m.awayTeamId||!r||r.number!==f.round||!a||a.round_id!==r.id||a.home_team_id!==m.homeTeamId||a.away_team_id!==m.awayTeamId||usedMatches.has(m.matchId))fail('source/mapping/native fixture sides or round differ')
  usedMatches.add(m.matchId);day(a.played_on)
  if(!Object.hasOwn(a,'zapisnik_id')||a.zapisnik_id!==null&&a.zapisnik_id!==id||!Object.hasOwn(a,'imported_at')||typeof a.kontumacija!=='boolean'||typeof a.vir_brez_izida!=='boolean'||!['available','unavailable_historical'].includes(a.statistics_status))fail('native report/status state differs or unknown')
  if(a.imported_at!==null)stamp(a.imported_at,'native import')
  for(let side=0;side<2;side++) {
   const team=side?m.awayTeamId:m.homeTeamId,k=sides[side]
   if(clubTeams.has(k)&&clubTeams.get(k)!==team||teamClubs.has(team)&&teamClubs.get(team)!==k)fail('source club/native team bijection differs')
   clubTeams.set(k,team);teamClubs.set(team,k)
  }
  if(!byRound.has(f.round))byRound.set(f.round,[])
  byRound.get(f.round).push({f,m,r,a})
 }
 if(clubs.size!==16||teamClubs.size!==16)fail('exact sixteen source/native clubs required')
 for(let rn=1;rn<=30;rn++) {
  const rows=byRound.get(rn)
  if(rows?.length!==8||new Set(rows.flatMap(x=>x.f.clubs.map(clubKey))).size!==16)fail('eight fixtures and sixteen clubs per source round required')
 }
 const d=native.dependencies
 exact(d,'complete,competitionUserRows,rounds,matches','dependencies')
 if(d.complete!==true||!count(d.competitionUserRows))fail('complete known dependency state required')
 const dr=uniqueRows(d.rounds,30,'roundId','round dependencies'),dm=uniqueRows(d.matches,240,'matchId','match dependencies')
 for(const row of dr.values()) {
  exact(row,'roundId,lineupRows,rosterRows,transferRows,chipRows,userRows','round dependency')
  if(!rs.has(row.roundId)||Object.entries(row).some(([k,v])=>k!=='roundId'&&!count(v)))fail('known native round dependency counts required')
 }
 for(const row of dm.values()) {
  exact(row,'matchId,appearances,goals,userRows','match dependency')
  if(!ms.has(row.matchId)||Object.entries(row).some(([k,v])=>k!=='matchId'&&!count(v)))fail('known native match dependency counts required')
 }
 for(const rows of byRound.values())for(const {f,a}of rows){
  const counts=dm.get(a.id)
  if(f.statisticsStatus==='pending'&&(a.imported_at!==null||counts.appearances!==0||counts.goals!==0))fail('source-pending/native imported statistics conflict')
 }
 const projection={targetSlug,competitionId,sourceCode,season,sourceFingerprintSha256:input.sourceFingerprintSha256,writerCommit:input.writerCommit,
  fixtures:[...fs.values()].sort((a,b)=>a.id.localeCompare(b.id)),mapping:[...maps.values()].sort((a,b)=>a.sourceMatchId.localeCompare(b.sourceMatchId)),native:{competition:c,rounds:[...rs.values()].sort((a,b)=>a.id-b.id),matches:[...ms.values()].sort((a,b)=>a.id-b.id),dependencies:{complete:true,competitionUserRows:d.competitionUserRows,rounds:[...dr.values()].sort((a,b)=>a.roundId-b.roundId),matches:[...dm.values()].sort((a,b)=>a.matchId-b.matchId)}}}
 return {input,byRound,dr,dm,clocks:new Map(),projectionSha256:digest(projection)}
}

function sourceClock(ctx,roundNumber){
 if(!ctx.clocks.has(roundNumber)){
  const earliest=Math.min(...ctx.byRound.get(roundNumber).map(({f})=>kickoff(f.date,f.time)))
  ctx.clocks.set(roundNumber,{earliest,deadline:earliest-6*3600000})
 }
 return ctx.clocks.get(roundNumber)
}
function chooseRound(ctx){
 const {input,byRound}=ctx,today=new Date(input.now).toISOString().slice(0,10)
 function next(after){
  for(let rn=after+1;rn<=30;rn++){
   const rows=byRound.get(rn)
   if(rows.some(({f})=>f.statisticsStatus!=='pending'||f.date<=today)||stamp(rows[0].r.deadline_at,'native deadline')<=input.now)continue
   if(sourceClock(ctx,rn).deadline>input.now)return rn
  }
  fail('no remaining future pending round')
 }
 const gap=next(0),played=[...byRound].filter(([,rows])=>rows.some(({f})=>f.statisticsStatus==='available')).map(([rn])=>rn),laterCount=played.filter(rn=>rn>gap).length
 const last=Math.max(0,...played.filter(rn=>rn<gap||laterCount>2))
 return gap>last?gap:next(last)
}

function propose(ctx,roundNumber) {
 const {input,byRound,dr,dm,projectionSha256}=ctx,rows=byRound.get(roundNumber),r=rows[0].r,today=new Date(input.now).toISOString().slice(0,10)
 if(rows.some(({f})=>f.statisticsStatus!=='pending'))fail('selected opening round must be completely pending')
 if(rows.some(({f})=>f.date<=today))fail('unresolved pending date is not genuinely future')
 const {earliest,deadline}=sourceClock(ctx,roundNumber)
 if(deadline<=input.now)fail('official deadline expired')
 if(rows.some(({f,a})=>a.played_on!==f.date))fail('source/native match date differs')
 if(r.played_on!==rows.map(x=>x.f.date).sort()[0])fail('source/native round date differs')
 // An existing later native deadline is never a reason to postpone a source
 // deadline. Both clocks must independently still be future; exact derived
 // source deadline is frozen in the proposal for SQL to verify later.
 if(stamp(r.deadline_at,'native deadline')<=input.now)fail('native deadline expired')
 const dep=dr.get(r.id)
 if(input.native.dependencies.competitionUserRows!==0||r.lineups_locked_at!==null||Object.entries(dep).some(([k,v])=>k!=='roundId'&&v!==0))fail('native round lock/user dependencies prevent launch')
 for(const {a} of rows) {
  const counts=dm.get(a.id)
  if(a.imported_at!==null||a.kontumacija||a.vir_brez_izida||a.statistics_status!=='available'||Object.entries(counts).some(([k,v])=>k!=='matchId'&&v!==0))fail('native imported report/statistics/user dependencies prevent launch')
 }
 return freeze({schemaVersion:1,kind:'fcf-future-launch-proposal',targetSlug:input.targetSlug,competitionId:input.competitionId,season:input.season,sourceCode:input.sourceCode,sourceFingerprintSha256:input.sourceFingerprintSha256,writerCommit:input.writerCommit,projectionSha256,roundNumber,roundId:r.id,firstFantasyPlayedOn:rows.map(x=>x.f.date).sort()[0],timeZone:'Europe/Madrid',earliestKickoffUTC:new Date(earliest).toISOString(),deadlineUTC:new Date(deadline).toISOString(),fixtureIds:rows.map(x=>x.f.id).sort(),matchIds:rows.map(x=>x.m.matchId).sort((a,b)=>a-b)})
}

export function selectFcfFutureLaunch(input) {
 const ctx=context(input)
 return propose(ctx,chooseRound(ctx))
}

/** Verify the SAME frozen choice. Never calls selection or falls forward. */
export function verifyFcfFutureLaunch(input,proposal) {
 const ctx=context(input)
 if(!object(proposal)||!Object.isFrozen(proposal)||!Array.isArray(proposal.fixtureIds)||!Object.isFrozen(proposal.fixtureIds)||!Array.isArray(proposal.matchIds)||!Object.isFrozen(proposal.matchIds)||!Number.isInteger(proposal.roundNumber)||!ctx.byRound.has(proposal.roundNumber))fail('complete frozen launch proposal required')
 if(ctx.projectionSha256!==proposal.projectionSha256)fail('source/native projection changed; new proposal required')
 const rebuilt=propose(ctx,proposal.roundNumber)
 if(chooseRound(ctx)!==proposal.roundNumber)fail('selected opening differs from distinct-played-round rule')
 if(text(proposal)!==text(rebuilt))fail('selected launch proposal differs')
 return rebuilt
}
