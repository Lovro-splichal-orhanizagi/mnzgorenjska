import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {razberiPostavo} from './viri/fussball.mjs'
const read=name=>readFileSync(new URL(`./vzorci/${name}`,import.meta.url))
const m=JSON.parse(read('de-fussball-zapisnik.json'))
const fonts=Object.fromEntries(Object.entries(m.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
test('Germany: eighteen decoded names match the independently viewed lineup screenshot',()=>{
 const teams=razberiPostavo(read('de-fussball-ilvesheim-lineup.html').toString(),{fonts})
 const names=teams.flatMap(t=>[...t.postava,...t.rezerve]).map(p=>p.ime)
 for(const name of ['Patrick Obsada','Tobias Schneider','Robin Hadameck','Tobias Baumann','Christopher Steinhauer','Patrick Heinzelmann','Schad Bendiyan','Mike Blumhardt','Mansoor Abdo','Simon Felix Knauf','Tamino Lechner','Moritz Braun','Mert Tut','Marco Seibert','Vincent Steck','Robby Lange','Patrick Schleich','David Peipp'])assert.ok(names.includes(name),name)
})
test('Germany CLI: validated partial report exits nonzero and cannot be mistaken for complete stats',()=>{
 const base=new URL('./vzorci/',import.meta.url)
 const r=spawnSync(process.execPath,[new URL('./preveri-fussball-zapisnik.mjs',import.meta.url).pathname,'031EQBPLF4000000VS5489BTVUS470OH',new URL('de-fussball-ilvesheim-main.html',base).pathname,new URL('de-fussball-ilvesheim-lineup.html',base).pathname,new URL('de-fussball-zapisnik.json',base).pathname],{encoding:'utf8'})
 assert.equal(r.status,3,r.stderr)
 const out=JSON.parse(r.stdout)
 assert.equal(out.nepopoln,true);assert.equal(out.nastopi,0)
 assert.deepEqual(out.rezultat,{domaci:2,gostje:3});assert.equal(out.nepripisaniKartoni,3)
})
