import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as dfb from './viri/dfb.mjs'
import {preveriPokritost} from './preveri-vir-sezono.mjs'

const html=readFileSync(new URL('./vzorci/de-dfb-2426099-pending.html',import.meta.url),'utf8')
function notice(body=html){try{dfb.vZapisnik(body,{id:'2426099'})}catch(e){return e}assert.fail('Empty report must not become statistics')}
test('only the independently reviewed historical empty report is classified as pending',()=>{
 const e=notice()
 assert.equal(e.koda,'DFB_PENDING_REPORT')
 assert.equal(e.podatki.id,'de-dfb-2426099')
 assert.equal(e.podatki.krog,13)
 assert.equal(e.podatki.datum,'2026-10-16')
 assert.equal(dfb.default.zaPredpomnilnik(html),false)
})
test('changed identity, score, date, partial data or extra content cannot use the pending exception',()=>{
 for(const [old,value] of [['2426099','2426098'],['0:1','0:2'],['(0:0)','(0:1)'],['16. Oktober','17. Oktober'],['Hertha BSC II','Other club'],['<div class="m-MatchDetails-referees">','<table class="m-MatchDetails-lineup-table"><thead>Aufstellung</thead></table><div class="m-MatchDetails-referees">'],['<div class="m-MatchDetails-referees">','<div class="m-MatchDetails-history"></div><div class="m-MatchDetails-referees">'],['<div class="m-MatchDetails-referees">','<p>Unexpected player data</p><div class="m-MatchDetails-referees">']]){
  assert(html.includes(old));assert.notEqual(notice(html.replaceAll(old,value)).koda,'DFB_PENDING_REPORT')
 }
 assert.notEqual(notice(html.slice(0,-100)).koda,'DFB_PENDING_REPORT')
 assert.throws(()=>dfb.vZapisnik(html,{tekma:{krog:14}}),e=>e.koda!=='DFB_PENDING_REPORT')
})
test('coverage distinguishes an approved pending historical report from a corrupt or silently missing report',()=>{
 const e=notice(),n={...e.podatki,status:e.koda,razlog:e.message}
 const base={sezona:'2026/27',razpored:[{stevilka:13,tekme:[{dfbId:'2426099',domaci:'Hertha BSC II',gostje:'RSV Eintracht 1949',datum:'2026-10-16',ura:'19:00',odigrana:true,izid:{domaci:0,gostje:1}}]}],zapisniki:[],nepopolni:[n]}
 const result=preveriPokritost({...base,dovoliCakajociDfb:true})
 assert.deepEqual(result.napake,[])
 assert.equal(result.pokritost,false)
 assert.equal(result.cakajoci.length,1)
 assert.equal(result.pripravljeno,false) // no keeper evidence in this deliberately tiny sample
 assert(preveriPokritost(base).napake.length>0)
 for(const change of [b=>b.nepopolni=[],b=>b.nepopolni[0].status='DFB_INVALID_REPORT',b=>b.razpored[0].tekme[0].izid.gostje=2,b=>b.sezona='2025/26',b=>b.nepopolni.push({...n})]){
  const b=structuredClone(base);change(b)
  assert(preveriPokritost({...b,dovoliCakajociDfb:true}).napake.length>0)
 }
})

test('nightly import tolerates a few unreadable reports but fails when most of a league is unreadable',()=>{
 const bad=n=>Array.from({length:n},(_,i)=>({id:`de-dfb-${i}`}))
 dfb.preveriPreskocene(bad(4),120,'west')
 dfb.preveriPreskocene(bad(8),0,'west')
 assert.throws(()=>dfb.preveriPreskocene(bad(9),0,'west'),/spremenil stran/)
 assert.throws(()=>dfb.preveriPreskocene(bad(30),20,'west'),/spremenil stran/)
 dfb.preveriPreskocene(bad(30),120,'west')
})
