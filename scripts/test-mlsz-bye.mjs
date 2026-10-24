import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import mlsz, { vrsticeKroga, krogiStrani, ekipeLige } from './viri/mlsz.mjs'

const raw=readFileSync(new URL('./vzorci/hu-adatbank-szalai-round1.html',import.meta.url))
const original=raw.toString('utf8')
const realIDs=['2192569','2192571','2192567','2192570']
const row=({home='Real home SC',away='Real away SE',score=null,id=null}={})=>`<div class="schedule"><div class="home_team"><span>${home}</span></div><div class="away_team"><span>${away}</span></div><div class="schedule-points">${score??''}</div>${id?`<a href="/match/67/6/33880/1/${id}.html">Report</a>`:''}<div class="team_sorsolas_date">2026. 09. 12. 14:30</div></div>`
const panel=(rows)=>`<div id="match_panel">${rows.join('')}<div class="team_lapbar"></div>`

test('authentic Szalai source retains four scored fixtures and excludes its SZABADNAPOS bye',()=>{
 assert.equal(raw.length,140980)
 assert.equal(createHash('sha256').update(raw).digest('hex'),'8955730b85b47befea3ddb7cc81f9b5ecfc1c2452dc666decb3ac958be8dca3a')
 assert.deepEqual(krogiStrani(original),Array.from({length:18},(_,i)=>i+1))
 const fixtures=vrsticeKroga(original,1)
 assert.deepEqual(fixtures.map(m=>m.id),realIDs)
 assert.deepEqual(fixtures.map(m=>m.izid),[{domaci:1,gostje:1},{domaci:2,gostje:2},{domaci:8,gostje:0},{domaci:5,gostje:0}])
 assert.equal(ekipeLige(original).length,9)
 assert.ok(ekipeLige(original).some(t=>t.ime==='Csanytelek SC'),'club with this round off remains a league member')
})

for(const label of ['SZABADNAP','SZABADNAPOS',' szabadnapos ','\n  SzAbAdNaP\t','&nbsp;SZABADNAPOS&nbsp;'])for(const side of ['home','away']){
 test(`exact bye label ${JSON.stringify(label)} is omitted on ${side} side`,()=>{
  const rows=vrsticeKroga(panel([row({[side]:label}),row({home:'Played SC',score:'0 - 0',id:'1234567'}),row({home:'Postponed SC'})]),1)
  assert.deepEqual(rows.map(m=>m.domaci),['Played SC','Postponed SC'])
  assert.equal(rows[1].id,null)
  assert.equal(rows[1].izid,null)
 })
}

test('club names containing bye words and legitimate unscored fixtures remain intact',()=>{
 const names=['SZABADNAPOS SE','FC Szabadnap','Szabadnaposi SC','Szabadnap Sportegyesület']
 const rows=vrsticeKroga(panel(names.map(home=>row({home}))),1)
 assert.deepEqual(rows.map(m=>m.domaci),names)
 assert.ok(rows.every(m=>m.id===null&&m.izid===null))
 const clubs=names.map((name,i)=>`<a class="league-team" onclick="changeTeamDetailsNewGC('2026/2027',33880,${330500+i},6,33880,67,1)"><span>${name}</span></a>`).join('')
 assert.deepEqual(ekipeLige(clubs).map(t=>t.ime),names)
})

test('actual schedule traversal omits the bye without looking up its body',async()=>{
 // Keep the authentic first-round body; narrow only its round selector for this offline traversal.
 const oneRound=original.replace(/(<select id="turns"[^>]*>)[\s\S]*?(<\/select>)/,'$1<option value=1>1. forduló</option>$2')
 let calls=0
 const rounds=await mlsz.razporedVseStrani('67/6/33880',async url=>{calls++;assert.ok(url.includes('/league/'),'no bye/forfeit report lookup');return oneRound})
 assert.equal(calls,1)
 assert.equal(rounds.length,1)
 assert.equal(rounds[0].tekme.length,4)
 assert.ok(rounds[0].tekme.every(t=>!/^szabadnap(?:os)?$/i.test(t.domaci)&&!/^szabadnap(?:os)?$/i.test(t.gostje)))
})
