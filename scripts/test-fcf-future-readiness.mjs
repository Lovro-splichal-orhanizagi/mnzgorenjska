// TEST ONLY: invented SQL/native/price/source DATA, never authenticated source
// admission, production prices, an actual native snapshot or activation proof.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {calendarFixture} from './fcf-release-test-fixture.mjs'
import {selectFcfFutureLaunch} from './fcf-future-launch.mjs'
const api=await import('./fcf-future-readiness.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}})
const sha=x=>createHash('sha256').update(x).digest('hex')
function build(input){assert.equal(typeof api.buildFcfFutureTargetReadiness,'function','separate future readiness DATA helper required');return api.buildFcfFutureTargetReadiness(input)}
function prices(f,change=()=>{}){
 const snapshot=JSON.parse(f.pricingSnapshot.snapshotText);change(snapshot.players)
 const text=JSON.stringify(snapshot,null,2)+'\n'
 f.pricingSnapshot={snapshotText:text,snapshotSha256:sha(text)}
 f.replay.players=snapshot.players.map(({id,value,value_start,position,position_source})=>({id,value,value_start,position,position_source}))
 return f
}
function fixture(){
 const now=Date.parse('2026-10-27T12:00:00Z'),targetSlug='es-ct-tercera-g9',sourceCode='4118349-4118588'
 const fixtures=calendarFixture().map((f,i)=>({...f,id:`es${4118349+i}`,date:new Date(Date.UTC(2026,8,16+(f.round-1)*7)).toISOString().slice(0,10),time:'20:30',statisticsStatus:f.round<=6?'available':'pending'}))
 const clubs=[...new Map(fixtures.flatMap(f=>f.clubs).map(c=>[`${c.sourceClubId}/${c.sourceCategoryId}`,c])).values()],team=c=>300+Number(c.sourceClubId)
 const rounds=Array.from({length:30},(_,i)=>{const day=fixtures.find(f=>f.round===i+1).date;return {id:10001+i,competition_id:797,season:'2026/27',number:i+1,played_on:day,deadline_at:`${day}T13:30:00Z`,lineups_locked_at:null}})
 const mapping=fixtures.map((f,i)=>({sourceMatchId:f.id,sourceRound:f.round,matchId:20000+i,roundId:10000+f.round,homeTeamId:team(f.clubs[0]),awayTeamId:team(f.clubs[1])}))
 const matches=fixtures.map((f,i)=>({id:20000+i,round_id:10000+f.round,home_team_id:team(f.clubs[0]),away_team_id:team(f.clubs[1]),played_on:f.date,zapisnik_id:f.round<=6?f.id:null,imported_at:f.round<=6?`${f.date}T22:00:00Z`:null,kontumacija:false,vir_brez_izida:false,statistics_status:'available'}))
 const native={competition:{id:797,slug:targetSlug,source:'fcf',source_league_code:sourceCode,active:false,prvi_fantasy_krog:6},rounds,matches,dependencies:{complete:true,competitionUserRows:0,rounds:rounds.map(r=>({roundId:r.id,lineupRows:0,rosterRows:0,transferRows:0,chipRows:0,userRows:0})),matches:matches.map((m,i)=>({matchId:m.id,appearances:fixtures[i].round<=6?22:0,goals:0,userRows:0}))}}
 const launchInput={targetSlug,competitionId:797,sourceCode,season:'2026/27',sourceFingerprintSha256:'c'.repeat(64),writerCommit:'b'.repeat(40),fixtures:structuredClone(fixtures),mapping,native,now}
 const players=clubs.flatMap((c,n)=>['GK','DEF','DEF','MID','MID','FWD'].map((position,i)=>({id:n*10+i+1,competition_id:797,team_id:team(c),active:true,position,position_source:position==='GK'?'zapisnik':'ugibanje',value:n===0&&i===5?8:4+i/2,value_start:n===0&&i===5?8:4+i/2})))
 const modelSha256='d'.repeat(64),f={targetSlug,pricingSnapshot:{snapshotText:JSON.stringify({stateSha256:'e'.repeat(64),players}),snapshotSha256:''},replay:{schemaVersion:1,kind:'fcf-target-price-replay',targetSlug,competitionId:797,season:'2026/27',modelSha256,computedCount:players.length,players:[]},modelSha256,sourceData:{targetSlug,competition:{id:797,slug:targetSlug,source:'fcf',source_policy:'es-fcf-six-reviewed-history-v1',source_league_code:sourceCode,active:false,sezona_koledarska:false},fixtures,clubs,verifiedKeeperClubs:clubs.map(c=>`${c.sourceClubId}/${c.sourceCategoryId}`),binding:{protocol:'future-g9-after-six-v1',sourceClaimState:'consumed',sourceFingerprintSha256:launchInput.sourceFingerprintSha256,sourceCommit:'a'.repeat(40),priorSourceGETs:37,newSourceGETs:240,actualSourceGETs:277,maximumSourceGETs:478}},launchInput,launchProposal:selectFcfFutureLaunch(launchInput),now}
 return prices(f)
}

test('future readiness preserves exact SQL text/prices/legal15 and verifies untouched R7 after repricing',()=>{
 const f=fixture(),before=JSON.stringify(f),r=build(f)
 assert.equal(r.modelSha256,f.modelSha256);assert.equal(r.pricingSnapshotText,f.pricingSnapshot.snapshotText);assert.equal(r.pricingSnapshotSha256,f.pricingSnapshot.snapshotSha256);assert.equal(r.priceVector.length,96);assert.equal(r.squad.length,15);assert.ok(r.cheapestLegal15<=100)
 assert.equal(r.launchProposal.roundNumber,7);assert.equal(r.launchProposal.deadlineUTC,'2026-10-28T13:30:00.000Z');assert.deepEqual(r.launchProposal,f.launchProposal)
 const players=JSON.parse(r.pricingSnapshotText).players,squad=r.squad.map(({id})=>players.find(p=>p.id===id))
 assert.equal(r.cheapestLegal15,squad.reduce((sum,p)=>sum+p.value,0))
 for(const [role,count]of Object.entries({GK:2,DEF:5,MID:5,FWD:3}))assert.equal(squad.filter(p=>p.position===role).length,count)
 for(const team of new Set(squad.map(p=>p.team_id)))assert.ok(squad.filter(p=>p.team_id===team).length<=3)
 assert.equal(f.launchInput.native.competition.prvi_fantasy_krog,6);assert.equal(JSON.stringify(f),before)
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.priceVector)&&Object.isFrozen(r.squad)&&Object.isFrozen(r.launchProposal))
 for(const key of ['ready','admissible','activate','verified'])assert.equal(Object.hasOwn(r,key),false)
})
test('readiness uses its actual clock and never accepts expired old choice or substitutes R8',()=>{
 const f=fixture();f.now=Date.parse('2026-10-28T13:30:00.001Z')
 assert.throws(()=>build(f),/future|deadline|pending/i)
 const g=fixture();g.launchProposal=selectFcfFutureLaunch({...g.launchInput,now:f.now})
 assert.equal(g.launchProposal.roundNumber,8);assert.throws(()=>build(g),/selected opening|differs/i)
})
test('source fixture order and JSON field order do not create a different canonical calendar',()=>{
 const f=fixture();f.sourceData.fixtures.reverse();f.sourceData.fixtures=f.sourceData.fixtures.map(x=>Object.fromEntries(Object.entries(x).reverse()))
 assert.equal(build(f).launchProposal.roundNumber,7)
})
test('inactive prior players remain in the full pricing vector without becoming selectable clubs',()=>{
 const f=prices(fixture(),ps=>ps.push({id:9999,competition_id:797,team_id:9999,active:false,position:null,position_source:'neznano',value:4.5,value_start:4.5})),r=build(f)
 assert.equal(r.priceVector.length,97);assert.equal(r.squad.some(p=>p.id===9999),false)
})
test('one inconsistent source club name cannot hide behind its later calendar appearance',()=>{
 const f=fixture(),changed=f.sourceData.fixtures[0]
 changed.clubs[0]={...changed.clubs[0],name:'DIFFERENT TEST ONLY SOURCE NAME'}
 f.launchInput.fixtures.find(x=>x.id===changed.id).clubs[0].name=changed.clubs[0].name
 f.launchProposal=selectFcfFutureLaunch(f.launchInput)
 assert.throws(()=>build(f),/source club|canonical club/i)
})
test('70-percent default ceiling holds on the first violating persisted player count',()=>{
 const f=fixture();prices(f,ps=>{ps.forEach((p,i)=>p.value=p.value_start=i<67?4.5:5);ps.at(-1).value=ps.at(-1).value_start=8});assert.ok(build(f).cheapestLegal15<=100)
 prices(f,ps=>ps[67].value=ps[67].value_start=4.5);assert.throws(()=>build(f),/varied|default|legal/i)
})
for(const [name,change]of[
 ['foreign target',f=>f.targetSlug='es-ct-segona-g1'],['invalid clock',f=>f.now=NaN],['null clock',f=>f.now=null],['copied unfrozen proposal',f=>f.launchProposal=structuredClone(f.launchProposal)],
 ['changed native opening beforeimage',f=>f.launchInput.native.competition.prvi_fantasy_krog=7],['changed native deadline',f=>f.launchInput.native.rounds[6].deadline_at='2026-10-28T14:30:00Z'],['new native user activity',f=>f.launchInput.native.dependencies.rounds[6].userRows=1],
 ['wrong SQL text hash',f=>f.pricingSnapshot.snapshotText+=' '],['changed replay price',f=>f.replay.players[0].value+=.5],['missing persisted price row',f=>f.replay.players.pop()],['wrong pricing model',f=>f.modelSha256='f'.repeat(64)],
 ['foreign player competition',f=>prices(f,ps=>ps[0].competition_id=783)],['unknown active flag',f=>prices(f,ps=>ps[0].active='true')],['foreign active club',f=>prices(f,ps=>ps[0].team_id=9999)],
 ['missing mapped active club',f=>prices(f,ps=>ps.filter(p=>p.team_id===301).forEach(p=>p.active=false))],['inactive official keeper',f=>prices(f,ps=>ps[0].active=false)],['guessed official keeper',f=>prices(f,ps=>ps[0].position_source='ugibanje')],['keeper moved to outfield role',f=>prices(f,ps=>ps[0].position='DEF')],
 ['no legal DEF quota',f=>prices(f,ps=>ps.forEach(p=>{if(p.position==='DEF')p.position='MID'}))],['unaffordable legal squad',f=>prices(f,ps=>ps.forEach(p=>p.value=p.value_start=12))],['no genuine varied high price',f=>prices(f,ps=>ps.forEach(p=>p.value=p.value_start=6))],
 ['missing source fixture',f=>f.sourceData.fixtures.pop()],['duplicate source fixture',f=>f.sourceData.fixtures[1]=f.sourceData.fixtures[0]],['changed source canonical field',f=>f.sourceData.fixtures[0].homeGoals=7],['missing source club',f=>f.sourceData.clubs.pop()],['duplicate source club',f=>f.sourceData.clubs[1]=f.sourceData.clubs[0]],['source club name drift',f=>f.sourceData.clubs[0].name='DIFFERENT TEST CLUB'],
 ['missing source keeper club',f=>f.sourceData.verifiedKeeperClubs.pop()],['duplicate source keeper club',f=>f.sourceData.verifiedKeeperClubs[1]=f.sourceData.verifiedKeeperClubs[0]],['foreign source keeper club',f=>f.sourceData.verifiedKeeperClubs[0]='999/999'],
 ['wrong source competition',f=>f.sourceData.competition.id=783],['wrong source code',f=>f.sourceData.competition.source_league_code='4109388-4109627'],['active source target',f=>f.sourceData.competition.active=true],
 ['old source protocol',f=>f.sourceData.binding.protocol='six-reviewed-continuation-v1'],['unconsumed source',f=>f.sourceData.binding.sourceClaimState='unclaimed'],['prior22 refund',f=>f.sourceData.binding.priorSourceGETs=22],['partial new count',f=>f.sourceData.binding.newSourceGETs=239],['wrong total spend',f=>f.sourceData.binding.actualSourceGETs=276],['unapproved cap517',f=>f.sourceData.binding.maximumSourceGETs=517],['missing source SHA',f=>delete f.sourceData.binding.sourceCommit],['wrong source SHA',f=>f.sourceData.binding.sourceCommit='main'],
 ['borrowed source fingerprint',f=>f.sourceData.binding.sourceFingerprintSha256='f'.repeat(64)],['missing fingerprint',f=>delete f.sourceData.binding.sourceFingerprintSha256],['wrong writer SHA',f=>f.launchInput.writerCommit='main'],['wrong launch source scope',f=>f.launchInput.competitionId=783],
])test(`pure future readiness holds ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>build(f),/FCF_FUTURE_READINESS|FCF_READINESS|FCF_FUTURE_LAUNCH/)})
