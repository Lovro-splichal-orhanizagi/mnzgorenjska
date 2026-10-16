import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { vZapisnik } from './viri/novanet.mjs'
import { preveriPokritost, preveriSezono } from './preveri-vir-sezono.mjs'

const z = () => vZapisnik(readFileSync(new URL('./vzorci/es-novanet-galicia-1448233.html', import.meta.url),'utf8'),{zveza:'galicia'})
const sample = () => {
 const report=z()
 return {sezona:'2026/27',razpored:[{stevilka:report.krog,tekme:[{domaci:report.domaci.ime,gostje:report.gostje.ime,odigrana:true,virId:'1448233'}]}],zapisniki:[{id:report.zapisnikId,z:report}],nepopolni:[]}
}
test('a real complete report counts goals, lineups and named clubs but does not invent goalkeeper evidence',()=>{
 const r=preveriPokritost(sample())
 assert.equal(r.odigranih,1)
 assert.equal(r.zapisnikov,1)
 assert.equal(r.postavPo11,2)
 assert.equal(r.golov,5)
 assert.equal(r.klubov,2)
 assert.equal(r.pokritost,true)
 assert.equal(r.pripravljeno,false)
 assert.equal(r.klubiBrezVratarja.length,2)
})
test('withheld match is an explicit release failure even when the importer skipped it safely',()=>{
 const x=sample();x.zapisniki=[];x.nepopolni=[{id:'es-novanet-galicia-1448233',razlog:'HTTP 404'}]
 const r=preveriPokritost(x)
 assert.equal(r.pokritost,false)
 assert.equal(r.pripravljeno,false)
 assert.match(r.napake.join(' '),/404/)
 assert.match(r.napake.join(' '),/1.*0/)
})
test('season regression cannot pass the release audit',()=>{
 const x=sample();x.zapisniki[0].z.sezona=2026
 assert.match(preveriPokritost(x).napake.join(' '),/sezon/)
})
test('extra duplicate report cannot disguise a missing report',()=>{
 const x=sample();x.zapisniki.push(x.zapisniki[0]);x.razpored[0].tekme.push({...x.razpored[0].tekme[0],virId:'999',gostje:'Different'})
 const r=preveriPokritost(x)
 assert.equal(r.pokritost,false)
 assert.match(r.napake.join(' '),/podvojen|manjka/)
})
test('verified goalkeeper evidence for every participating club unlocks only the data gate',()=>{
 const x=sample();for(const e of [x.zapisniki[0].z.domaci,x.zapisniki[0].z.gostje])e.postava[0].vratar=true
 const r=preveriPokritost(x)
 assert.equal(r.pripravljeno,true)
 assert.deepEqual(r.klubiBrezVratarja,[])
})
test('unknown future club still requires goalkeeper evidence',()=>{
 const x=sample();for(const e of [x.zapisniki[0].z.domaci,x.zapisniki[0].z.gostje])e.postava[0].vratar=true
 x.razpored.push({stevilka:2,tekme:[{domaci:'New club',gostje:x.zapisniki[0].z.gostje.ime,odigrana:false}]})
 const r=preveriPokritost(x)
 assert.equal(r.pokritost,true)
 assert.deepEqual(r.klubiBrezVratarja,['New club'])
 assert.equal(r.pripravljeno,false)
})
test('declared incomplete reports cannot pass despite populated lineups',()=>{
 const x=sample();for(const e of [x.zapisniki[0].z.domaci,x.zapisniki[0].z.gostje])e.postava[0].vratar=true
 x.zapisniki[0].z.nepopoln=true
 assert.equal(preveriPokritost(x).pripravljeno,false)
})
test('schedule date and time conflicts fail the independent gate',()=>{
 const x=sample();x.razpored[0].tekme[0].datum='1900-01-01';x.razpored[0].tekme[0].ura='00:00'
 assert.equal(preveriPokritost(x).pokritost,false)
})
test('a failed audit replaces the previous manifest and records failure artifacts',async()=>{
 const mapa=mkdtempSync(join(tmpdir(),'slff-audit-'))
 try{
  writeFileSync(join(mapa,'prenosi.json'),'[{"url":"stale"}]')
  const vir={ime:'test',razporedVseStrani:async(_k,p)=>p('https://www.futgal.es/no-response','r.html')}
  const r=await preveriSezono({vir,koda:'x',sezona:'2026/27',mapa,fetchFn:async()=>{throw Error('network offline')}})
  assert.equal(r.pripravljeno,false)
  assert.match(r.napake.join(' '),/network offline/)
  assert.deepEqual(JSON.parse(readFileSync(join(mapa,'prenosi.json'),'utf8')),[])
  assert.equal(JSON.parse(readFileSync(join(mapa,'porocilo.json'),'utf8')).prenesenih,0)
 }finally{rmSync(mapa,{recursive:true,force:true})}
})
test('live audit retries a transient timeout and preserves the successful document',async()=>{
 const mapa=mkdtempSync(join(tmpdir(),'slff-audit-retry-')),x=sample();let calls=0
 try{
  const vir={ime:'test',premorMs:0,razporedVseStrani:async(_k,p)=>{await p('https://datencenter.dfb.de/public-fixture','r.html');return x.razpored},zapisniki:async()=>x.zapisniki}
  const r=await preveriSezono({vir,koda:'x',sezona:x.sezona,mapa,fetchFn:async()=>{calls++;if(calls===1)throw Object.assign(Error('temporary timeout'),{name:'TimeoutError'});return new Response('<html>fixture response</html>')}})
  assert.equal(calls,2)
  assert.equal(r.pokritost,true)
  assert.equal(r.prenesenih,1)
  const docs=JSON.parse(readFileSync(join(mapa,'prenosi.json'),'utf8'))
  assert.equal(readFileSync(join(mapa,docs[0].file),'utf8'),'<html>fixture response</html>')
 }finally{rmSync(mapa,{recursive:true,force:true})}
})
test('live audit never retries an explicit source refusal',async()=>{
 const mapa=mkdtempSync(join(tmpdir(),'slff-audit-refusal-'));let calls=0
 try{
  const vir={ime:'test',premorMs:0,razporedVseStrani:async(_k,p)=>p('https://datencenter.dfb.de/public-refusal','r.html')}
  const r=await preveriSezono({vir,koda:'x',sezona:'2026/27',mapa,fetchFn:async()=>{calls++;return new Response('denied',{status:429})}})
  assert.equal(calls,1)
  assert.equal(r.status,429)
  assert.equal(r.zavrnitev,true)
  assert.equal(r.pripravljeno,false)
 }finally{rmSync(mapa,{recursive:true,force:true})}
})
