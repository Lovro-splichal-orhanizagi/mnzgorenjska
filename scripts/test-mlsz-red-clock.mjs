import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import{createHash}from'node:crypto'
import{vZapisnik,nastopi}from'./viri/mlsz.mjs'
test('authoritative MLSZ red92 after substitution85 is retained as normalized90 without losing team minutes',()=>{
 const raw=readFileSync(new URL('./vzorci/hu-adatbank-baranya-2111691.html',import.meta.url))
 assert.equal(raw.length,140775);assert.equal(createHash('sha256').update(raw).digest('hex'),'c8ed7d9b891207472a2be34d11d41b4cc6491ec8a73d0f283afb0eeb8d604f88')
 assert.match(raw.toString('utf8'),/event_redcard.png\)\">92&apos;/)
 const z=vZapisnik(raw.toString('utf8'),{id:'2111691'}),apps=nastopi(z),p=apps.find(x=>x.regSt===715260)
 assert.equal(p.minutaDo,85);assert.equal(p.redCardMinute,90);assert.equal(p.rdeci,1)
 assert.equal(apps.length,30);assert.equal(z.goli.length,6);assert.deepEqual(z.rezultat,{domaci:2,gostje:4});assert.equal(z.opozorila.length,0)
 assert.equal(apps.filter(a=>a.ekipaIdx===1).reduce((s,a)=>s+a.minute,0),990)
 assert.ok(apps.filter(a=>!a.rdeci).every(a=>a.redCardMinute===null))
})
test('the actual importer mapping persists card clock only for MLSZ and never derives one from exit minute',()=>{
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const expression=source.match(/red_card_minute: ([^\n]+),/)[1]
 const map=new Function('vir','x','return ('+expression+')')
 assert.equal(map({ime:'mlsz'},{redCardMinute:90,minutaDo:85}),90)
 assert.equal(map({ime:'mlsz'},{minutaDo:85}),null)
 assert.equal(map({ime:'dfb'},{redCardMinute:90,minutaDo:85}),null)
})
