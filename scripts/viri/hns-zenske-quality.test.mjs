import test from 'node:test'
import assert from 'node:assert/strict'
import {parseHnsWomenReport} from './hns-zenske-quality.mjs'
const competition={slug:'hr-prva-hnlz',source:'hns',source_policy:'hr-hnlz-v1',firstFantasyPlayedOn:'2026-10-25'}
const fixture={id:'114471999',sourceRound:1,sourcePhase:null,krog:1,datum:'2026-09-20',domaci:'ŽNK Agram',gostje:'ŽNK Split',domaciId:'649',gostjeId:'4266',izid:{domaci:0,gostje:0}}
const event=(kind,clock)=>`<li class="${kind}"><div class="icon" title="source event"></div>${clock}</li>`
function html({events={},roles={},score=fixture.izid,title='SuperSport Prva HNLŽ, 1. kolo'}={}) {
 const person=(side,shirt,bench=false)=>`<li class="row match_lineup" data-personid="${9000000+side*100+shirt}"><div><div class="shirtNumber">${shirt}</div><div class="playerName"><h3><a href="https://semafor.hns.family/igraci/${9000000+side*100+shirt}/synthetic-test/">Synthetic Player ${side} ${shirt}</a></h3>${roles[`${side}:${shirt}`]??(shirt===1||shirt===13?'Vratarka':'Igračica')}</div><div class="matchEvents"><ul>${events[`${side}:${shirt}`]??''}</ul></div></div></li>`
 const team=side=>`<div class="${side===0?'homeTeam':'awayTeam'} playerslist">${Array.from({length:11},(_,i)=>person(side,i+1)).join('')}<div>Pričuvni igrači</div>${[12,13].map(n=>person(side,n,true)).join('')}</div>`
 return `<div class="matchHeader"><div class="competition-title"><h2>${title}</h2></div><li class="club1"><div class="title">ŽNK Agram</div></li><li class="club2"><div class="title">ŽNK Split</div></li><li class="res1">${score.domaci}</li><li class="res2">${score.gostje}</li><div class="status">Završeno</div><div class="facility">Synthetic test ground, 20.09.2026. 15:00</div></div><div class="matchLineup">${team(0)}${team(1)}</div>`
}
const parse=(body=html(),f=fixture)=>parseHnsWomenReport(body,{competition,fixture:f,sourceCompetitionId:'114471579'})
test('strict normal synthetic women report preserves explicit source identity/keepers and unused bench',()=>{
 const result=parse();assert.equal(result.statisticsStatus,'available');assert.equal(result.appearances.length,22)
 assert.equal(result.appearances.filter(p=>p.vratar).length,2);assert.ok(result.appearances.every(p=>p.minute===90))
 assert.equal(result.z.domaci.rezerve.length,2);assert.equal(result.fixture.homeSourceClubId,'649')
})
test('source substitution and bench scorer retain actual entry/exit clocks',()=>{
 const score={domaci:1,gostje:0},result=parse(html({score,events:{'0:2':event('substitutionOut',"60'"),'0:12':event('substitutionIn',"60'")+event('goal',"70'")}}),{...fixture,izid:score})
 assert.equal(result.appearances.find(p=>p.ekipaIdx===0&&p.st===12).minute,30)
 assert.equal(result.z.goli[0].minuta,70)
})
for(const [name,options]of [
 ['missing role',{roles:{'0:1':''}}],
 ['male role',{roles:{'0:1':'Vratar'}}],
 ['unknown event',{events:{'0:2':event('unknown-event',"20'")}}],
 ['missing red clock',{events:{'0:2':event('red','')}}],
 ['missing substitution clock',{events:{'0:2':event('substitutionOut',''),'0:12':event('substitutionIn',"60'")}}],
 ['reentry unsupported',{events:{'0:2':event('substitutionOut',"30'")+event('substitutionIn',"60'")}}],
 ['keeper missing after dismissal',{events:{'0:1':event('red',"77'")}}],
 ['wrong competition',{title:'SuperSport HNL, 1. kolo'}],
])test(`normal source facts fail closed: ${name}`,()=>assert.throws(()=>parse(html(options)),/hns women|identity|role|clock|event|substitution|keeper|reentry/i))
test('bench scorer without entry does not receive invented minutes',()=>{
 const score={domaci:1,gostje:0}
 assert.throws(()=>parse(html({score,events:{'0:12':event('goal',"70'")}}),{...fixture,izid:score}),/entry|participation|bench/i)
})
test('fully published red51 / replacement52 transition preserves89keeper minutes with no invented role/minute',()=>{
 const r=parse(html({events:{'0:1':event('red',"51'"),'0:2':event('substitutionOut',"52'"),'0:13':event('substitutionIn',"52'")}}))
 assert.equal(r.appearances.filter(p=>p.ekipaIdx===0&&p.vratar).reduce((a,p)=>a+p.minute,0),89)
 assert.equal(r.quality.keeperTransitions.length,1)
})
test('a goal inside an ambiguous keeper transition blocks normal import',()=>{
 const score={domaci:0,gostje:1}
 assert.throws(()=>parse(html({score,events:{'0:1':event('red',"51'"),'0:2':event('substitutionOut',"52'"),'0:13':event('substitutionIn',"52'"),'1:2':event('goal',"51'")}}),{...fixture,izid:score}),/keeper|transition|goal/i)
})
test('missing yellow clock retains attributed card and an explicit warning',()=>{
 const r=parse(html({events:{'0:2':event('yellow','')}}))
 assert.equal(r.appearances.find(p=>p.ekipaIdx===0&&p.st===2).rumeni,1)
 assert.ok(r.quality.warnings.some(w=>/yellow/i.test(w)))
})
test('club source ID cannot be substituted by a same-country mens organization',()=>assert.throws(()=>parse(html(),{...fixture,domaciId:'1274'}),/club|identity/i))
