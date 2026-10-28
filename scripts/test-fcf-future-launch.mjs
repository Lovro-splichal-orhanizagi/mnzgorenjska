// TEST ONLY: every calendar, native ID, mapping and dependency below is invented.
// These tests establish algorithm behavior, never production/source readiness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {selectFcfFutureLaunch,verifyFcfFutureLaunch} from './fcf-future-launch.mjs'

function calendar(slug='es-ct-segona-g1') {
 const competitionId=slug==='es-ct-segona-g1'?783:797,start=competitionId===783?4109388:4118349
 const clubs=Array.from({length:16},(_,i)=>({sourceClubId:String(100+i),sourceCategoryId:String(200+i),name:`TEST ONLY club ${i}`}))
 const fixtures=[],mapping=[],rounds=[],matches=[],roundDependencies=[],matchDependencies=[]
 let rotation=Array.from({length:16},(_,i)=>i)
 for(let round=1;round<=30;round++) {
  const base=new Date(Date.UTC(2026,8,16+(round-1)*7)).toISOString().slice(0,10),roundId=10000+round
  rounds.push({id:roundId,competition_id:competitionId,season:'2026/27',number:round,played_on:base,deadline_at:`${base}T13:30:00.000Z`,lineups_locked_at:null})
  roundDependencies.push({roundId,lineupRows:0,rosterRows:0,transferRows:0,chipRows:0,userRows:0})
  for(let i=0;i<8;i++) {
   const a=rotation[i],b=rotation[15-i],[home,away]=round<=15?[a,b]:[b,a],n=(round-1)*8+i,id=`es${start+n}`,matchId=20000+n
   fixtures.push({id,round,date:base,time:'20:30',clubs:[clubs[home],clubs[away]],statisticsStatus:round<=6?'available':'pending'})
   mapping.push({sourceMatchId:id,sourceRound:round,matchId,roundId,homeTeamId:300+home,awayTeamId:300+away})
   matches.push({id:matchId,round_id:roundId,home_team_id:300+home,away_team_id:300+away,played_on:base,zapisnik_id:round<=6?id:null,imported_at:round<=6?`${base}T22:00:00Z`:null,kontumacija:false,vir_brez_izida:false,statistics_status:'available'})
   matchDependencies.push({matchId,appearances:round<=6?22:0,goals:0,userRows:0})
  }
  rotation=[rotation[0],rotation[15],...rotation.slice(1,15)]
 }
 return {targetSlug:slug,competitionId,sourceCode:`${start}-${start+239}`,season:'2026/27',sourceFingerprintSha256:'a'.repeat(64),writerCommit:'b'.repeat(40),fixtures,mapping,native:{competition:{id:competitionId,slug,source:'fcf',source_league_code:`${start}-${start+239}`,active:false},rounds,matches,dependencies:{complete:true,competitionUserRows:0,rounds:roundDependencies,matches:matchDependencies}},now:Date.parse('2026-10-27T12:00:00Z')}
}

test('completed expired R6 selects untouched future R7 with the official Madrid deadline',()=>{
 const input=calendar(),p=selectFcfFutureLaunch(input)
 assert.equal(p.roundNumber,7)
 assert.equal(p.roundId,10007)
 assert.equal(p.firstFantasyPlayedOn,'2026-10-28')
 assert.equal(p.deadlineUTC,'2026-10-28T13:30:00.000Z')
 assert.equal(p.earliestKickoffUTC,'2026-10-28T19:30:00.000Z')
 assert.equal(p.fixtureIds.length,8)
 assert.equal(p.fixtureIds[0],'es4109436')
 assert.match(p.projectionSha256,/^[a-f0-9]{64}$/)
 assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.fixtureIds))
 assert.deepEqual(verifyFcfFutureLaunch({...input,now:input.now+1000},p),p)
})

test('G9 binds its own exact source block and native competition',()=>{
 const p=selectFcfFutureLaunch(calendar('es-ct-tercera-g9'))
 assert.equal(p.competitionId,797)
 assert.equal(p.fixtureIds[0],'es4118397')
})

// Each change removes an independent fact required to propose an opening.
const invalid=[
 ['foreign target',x=>{x.targetSlug='es-ct-tercera-g2'}],
 ['wrong competition',x=>{x.competitionId=797}],
 ['wrong block',x=>{x.sourceCode='4109389-4109628'}],
 ['wrong season',x=>{x.season='2025/26'}],
 ['active native league',x=>{x.native.competition.active=true}],
 ['missing source fixture',x=>{x.fixtures.pop()}],
 ['duplicate source fixture',x=>{x.fixtures[0]=x.fixtures[1]}],
 ['foreign source fixture',x=>{x.fixtures[0].id='es4109387'}],
 ['missing source club',x=>{x.fixtures[48].clubs.pop()}],
 ['same club twice',x=>{x.fixtures[48].clubs[1]=x.fixtures[48].clubs[0]}],
 ['duplicate directed pairing',x=>{x.fixtures[8].clubs=x.fixtures[0].clubs}],
 ['unknown source status',x=>{x.fixtures[48].statisticsStatus='unknown'}],
 ['missing mapping',x=>{x.mapping.pop()}],
 ['duplicate mapping',x=>{x.mapping[0]=x.mapping[1]}],
 ['wrong mapped round',x=>{x.mapping[48].sourceRound=8}],
 ['wrong native round',x=>{x.native.rounds[6].number=8}],
 ['wrong mapped side',x=>{x.mapping[48].homeTeamId=999}],
 ['swapped native sides',x=>{const m=x.native.matches[48];[m.home_team_id,m.away_team_id]=[m.away_team_id,m.home_team_id]}],
 ['native report bound to another source ID',x=>{x.native.matches[48].zapisnik_id='es4109400'}],
 ['missing native fixture',x=>{x.native.matches.pop()}],
 ['duplicate native fixture',x=>{x.native.matches[0]=x.native.matches[1]}],
 ['native/source date disagreement',x=>{x.native.matches[48].played_on='2026-10-29'}],
 ['unknown kickoff',x=>{x.fixtures[48].time=null}],
 ['invalid kickoff',x=>{x.fixtures[48].time='24:00'}],
 ['invalid date',x=>{x.fixtures[48].date='2026-02-30'}],
 ['source-pending/native-import conflict in elapsed R6',x=>{x.fixtures[40].statisticsStatus='pending'}],
 ['locked native round',x=>{x.native.rounds[6].lineups_locked_at='2026-10-26T10:00:00Z'}],
 ['imported native report',x=>{x.native.matches[48].imported_at='2026-10-26T10:00:00Z'}],
 ['native administrative result',x=>{x.native.matches[48].kontumacija=true}],
 ['native unavailable result flag',x=>{x.native.matches[48].vir_brez_izida=true}],
 ['native unavailable statistics',x=>{x.native.matches[48].statistics_status='unavailable_historical'}],
 ['appearance dependency',x=>{x.native.dependencies.matches[48].appearances=1}],
 ['goal dependency',x=>{x.native.dependencies.matches[48].goals=1}],
 ['match user dependency',x=>{x.native.dependencies.matches[48].userRows=1}],
 ['lineup dependency',x=>{x.native.dependencies.rounds[6].lineupRows=1}],
 ['roster dependency',x=>{x.native.dependencies.rounds[6].rosterRows=1}],
 ['transfer dependency',x=>{x.native.dependencies.rounds[6].transferRows=1}],
 ['chip dependency',x=>{x.native.dependencies.rounds[6].chipRows=1}],
 ['round user dependency',x=>{x.native.dependencies.rounds[6].userRows=1}],
 ['competition user dependency',x=>{x.native.dependencies.competitionUserRows=1}],
 ['incomplete dependency projection',x=>{x.native.dependencies.complete=false}],
 ['missing match dependency',x=>{x.native.dependencies.matches.pop()}],
 ['missing round dependency',x=>{x.native.dependencies.rounds.pop()}],
 ['duplicate dependency',x=>{x.native.dependencies.matches[0]=x.native.dependencies.matches[1]}],
 ['unknown dependency count',x=>{x.native.dependencies.matches[48].goals=null}],
 ['missing dependency count',x=>{delete x.native.dependencies.rounds[6].chipRows}],
 ['negative dependency count',x=>{x.native.dependencies.matches[48].goals=-1}],
 ['unrecognized dependency column',x=>{x.native.dependencies.matches[48].extraRows=0}],
 ['missing native lock state',x=>{delete x.native.rounds[6].lineups_locked_at}],
 ['invalid clock',x=>{x.now=NaN}],
 ['unknown top-level contract',x=>{x.verified=true}],
]
for(const [name,change] of invalid)test(`holds on ${name}`,()=>{const x=calendar();change(x);assert.throws(()=>selectFcfFutureLaunch(x),/FCF_FUTURE_LAUNCH:/)})

test('fresh selection skips an elapsed R7 deadline for untouched R8',()=>{
 const x=calendar();x.now=Date.parse('2026-10-28T14:00:00Z')
 assert.equal(selectFcfFutureLaunch(x).roundNumber,8)
})
test('fresh selection skips today R7 even before its deadline',()=>{
 const x=calendar();x.now=Date.parse('2026-10-28T01:00:00Z')
 assert.equal(selectFcfFutureLaunch(x).roundNumber,8)
})
test('no remaining pending round holds',()=>{
 const x=calendar();x.now=Date.parse('2027-06-01T00:00:00Z')
 for(const f of x.fixtures)f.statisticsStatus='available'
 assert.throws(()=>selectFcfFutureLaunch(x),/remaining|future/)
})

function moveOpening(x,date,time){
 for(const f of x.fixtures.filter(f=>f.round===7))f.date=date,f.time=time
 for(const m of x.native.matches.filter(m=>m.round_id===10007))m.played_on=date
 x.native.rounds[6].played_on=date
 x.native.rounds[6].deadline_at=`${date}T13:30:00Z`
}
for(const [date,clock,label] of [['2027-03-28','2027-03-27T12:00:00Z','gap'],['2026-10-25','2026-10-24T12:00:00Z','fold']])test(`Madrid DST ${label} kickoff is refused`,()=>{
 const x=calendar();moveOpening(x,date,'02:30');x.now=Date.parse(clock)
 assert.throws(()=>selectFcfFutureLaunch(x),/ambiguous|nonexistent|kickoff/)
})
test('Madrid summer offset is calculated explicitly rather than using machine timezone',()=>{
 const x=calendar();moveOpening(x,'2027-03-28','20:30');x.now=Date.parse('2027-03-27T12:00:00Z')
 assert.equal(selectFcfFutureLaunch(x).deadlineUTC,'2027-03-28T12:30:00.000Z')
})

test('projection digest is stable across input row and object-key order',()=>{
 const x=calendar(),p=selectFcfFutureLaunch(x),y=JSON.parse(JSON.stringify(x))
 y.fixtures.reverse();y.mapping.reverse();y.native.rounds.reverse();y.native.matches.reverse();y.native.dependencies.rounds.reverse();y.native.dependencies.matches.reverse()
 y.native.competition=Object.fromEntries(Object.entries(y.native.competition).reverse())
 assert.deepEqual(selectFcfFutureLaunch(y),p)
})
test('proposal owns its frozen data and never mutates caller inputs',()=>{
 const x=calendar(),before=JSON.stringify(x),p=selectFcfFutureLaunch(x)
 assert.equal(JSON.stringify(x),before)
 x.mapping[48].matchId=999
 assert.equal(p.matchIds[0],20048)
 assert.throws(()=>{p.matchIds.push(9)},TypeError)
})
test('verification rejects expiry rather than silently choosing a replacement',()=>{
 const x=calendar(),p=selectFcfFutureLaunch(x)
 x.now=Date.parse('2026-10-28T13:30:00Z')
 assert.throws(()=>verifyFcfFutureLaunch(x,p),/expired|future|deadline/)
})
for(const [name,change] of [
 ['source fingerprint',x=>{x.sourceFingerprintSha256='c'.repeat(64)}],
 ['writer commit',x=>{x.writerCommit='d'.repeat(40)}],
 ['native dependency outside selected round',x=>{x.native.dependencies.matches[0].goals=1}],
 ['source kickoff',x=>{x.fixtures[48].time='21:00'}],
])test(`verification rejects changed ${name}`,()=>{
 const x=calendar(),p=selectFcfFutureLaunch(x);change(x)
 assert.throws(()=>verifyFcfFutureLaunch(x,p),/changed|differs/)
})
test('verification rejects tampered, partial and mutable proposals',()=>{
 const x=calendar(),p=selectFcfFutureLaunch(x)
 assert.throws(()=>verifyFcfFutureLaunch(x,{...p,roundNumber:8}),/frozen|proposal|differs/)
 assert.throws(()=>verifyFcfFutureLaunch(x,Object.freeze({...p,deadlineUTC:'2026-11-04T13:30:00.000Z'})),/changed|differs/)
 assert.throws(()=>verifyFcfFutureLaunch(x,Object.freeze({roundId:p.roundId})),/proposal|differs/)
})

test('fresh selection skips source deadline expired before tomorrow local match date',()=>{
 const x=calendar();moveOpening(x,'2026-10-28','00:30');x.now=Date.parse('2026-10-27T20:00:00Z')
 assert.equal(selectFcfFutureLaunch(x).roundNumber,8)
})
test('approved historical unavailability can precede the opening without becoming an authorization here',()=>{
 const x=calendar();x.fixtures[40].statisticsStatus='unavailable_historical'
 assert.equal(selectFcfFutureLaunch(x).roundNumber,7)
})
test('known pending source report identity alone is not an imported report',()=>{
 const x=calendar();x.native.matches[48].zapisnik_id=x.fixtures[48].id
 assert.equal(selectFcfFutureLaunch(x).roundNumber,7)
})
test('fresh selection skips expired native R7 deadline without replacing it',()=>{
 const x=calendar();x.native.rounds[6].deadline_at='2026-10-26T13:30:00Z'
 assert.equal(selectFcfFutureLaunch(x).roundNumber,8)
})
test('source club identifiers must be exact strings, never coerced numbers',()=>{
 const x=calendar();for(const f of x.fixtures)for(const c of f.clubs)c.sourceClubId=Number(c.sourceClubId)
 assert.throws(()=>selectFcfFutureLaunch(x),/source club/)
})
test('changed native schedule metadata is bound even outside the selected round',()=>{
 const x=calendar(),p=selectFcfFutureLaunch(x);x.native.rounds[0].deadline_at='2026-09-16T12:30:00Z'
 assert.throws(()=>verifyFcfFutureLaunch(x,p),/projection changed/)
})

for(const date of ['2026-01-15','2026-06-30','2027-07-01','2027-10-31'])for(const [label,change] of [
 ['source fixture',x=>{x.fixtures[0].date=date}],
 ['native fixture',x=>{x.native.matches[0].played_on=date}],
 ['native round',x=>{x.native.rounds[0].played_on=date}],
])test(`holds on outside-season ${label} date ${date}`,()=>{
 const x=calendar();change(x)
 assert.throws(()=>selectFcfFutureLaunch(x),/season date/)
})
test('season includes 1 July 2026 and 30 June 2027',()=>{
 const x=calendar()
 x.fixtures[0].date='2026-07-01';x.native.matches[0].played_on='2026-07-01';x.native.rounds[0].played_on='2026-07-01'
 x.fixtures[239].date='2027-06-30';x.native.matches[239].played_on='2027-06-30'
 assert.equal(selectFcfFutureLaunch(x).roundNumber,7)
})

test('mixed completed and future pending R7 opens untouched R8',()=>{
 const x=calendar();x.fixtures[48].statisticsStatus='available'
 const p=selectFcfFutureLaunch(x)
 assert.equal(p.roundNumber,8)
 assert.equal(verifyFcfFutureLaunch(x,p).roundNumber,8)
})
test('expired all-pending R6 can precede a proposed R7 when native state does not conflict',()=>{
 const x=calendar()
 for(let i=40;i<48;i++){
  x.fixtures[i].statisticsStatus='pending';x.native.matches[i].imported_at=null;x.native.matches[i].zapisnik_id=null;x.native.dependencies.matches[i].appearances=0
 }
 const p=selectFcfFutureLaunch(x)
 assert.equal(p.roundNumber,7)
 assert.equal(verifyFcfFutureLaunch(x,p).roundNumber,7)
})
for(const [later,want] of [[[10],7],[[10,11],7],[[10,11,12],13]])test(`${later.length} distinct later played rounds yields opening R${want}`,()=>{
 const x=calendar()
 for(const rn of later)for(let offset=0;offset<4;offset++)x.fixtures[(rn-1)*8+offset].statisticsStatus='available'
 assert.equal(selectFcfFutureLaunch(x).roundNumber,want)
})
for(const [label,change] of [
 ['import',x=>{x.native.matches[0].imported_at='2026-10-26T10:00:00Z'}],
 ['appearance',x=>{x.native.dependencies.matches[0].appearances=1}],
 ['goal',x=>{x.native.dependencies.matches[0].goals=1}],
])test(`source-pending native ${label} conflict in a skipped past round globally holds`,()=>{
 const x=calendar();x.fixtures[0].statisticsStatus='pending';x.native.matches[0].imported_at=null;x.native.dependencies.matches[0].appearances=0;change(x)
 assert.throws(()=>selectFcfFutureLaunch(x),/conflict/)
})
