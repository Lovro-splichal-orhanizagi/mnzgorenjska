import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { razberiZapisnik, razberiPostavo, razberiKrog, nastopi } from './viri/fussball.mjs'
const read = file => readFileSync(new URL(`./vzorci/${file}`,import.meta.url))
const manifest = JSON.parse(read('de-fussball-zapisnik.json'))
const fonts = Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const main = read('de-fussball-ilvesheim-main.html').toString()
const lineup = read('de-fussball-ilvesheim-lineup.html').toString()
const changed = (s,from,to) => {const out=s.replaceAll(from,to);assert.notEqual(out,s,'fixture mutation must change input');return out}
const parse = (m=main,l=lineup,f=fonts)=>razberiZapisnik(m,l,{fonts:f,id:'031EQBPLF4000000VS5489BTVUS470OH'})
test('real Germany report binds result, date, round, lineup and event IDs',()=>{
 const z=parse(), e=manifest.expected
 assert.equal(z.domaci.ime,e.domaci);assert.equal(z.gostje.ime,e.gostje)
 assert.equal(z.datum,e.datum);assert.equal(z.ura,e.ura);assert.equal(z.krog,e.krog)
 assert.deepEqual(z.rezultat,e.rezultat)
 assert.equal(z.domaci.postava.length,11);assert.equal(z.gostje.postava.length,11)
 assert.equal(z.domaci.postava.filter(p=>p.vratar).length,1)
 assert.equal(z.domaci.postava.find(p=>p.vratar).ime,'Patrick Obsada')
 assert.equal(z.goli.length,5);assert.equal(z.menjave.length,8)
 assert.deepEqual(z.goli.map(g=>g.minuta),[56,57,69,71,83])
 assert.equal(z.nepopoln,true);assert.ok(z.opozorila[0].startsWith('zapisnik nepopoln'))
 assert.equal(z.nepripisaniKartoni.length,3);assert.deepEqual(nastopi(z),[])
})
test('rotating second lineup font agrees with 35 earlier metadata-decoded names',()=>{
 const z=razberiPostavo(read('de-fussball-hockenheim-lineup.html').toString(),{fonts})
 const names=JSON.parse(read('de-fussball-imena.json')).players.map(p=>p.expected).sort()
 assert.deepEqual(z.flatMap(e=>[...e.postava,...e.rezerve]).map(p=>p.ime).sort(),names)
})
test('exact field font and capture digest are required',()=>{
 assert.throws(()=>parse(main,lineup,{...fonts,q73uvs1t:undefined}),/pisav/)
 assert.throws(()=>parse(main,lineup,{...fonts,q73uvs1t:{...fonts.q73uvs1t,bytes:fonts.ug2c6646.bytes}}),/hash|digest/)
 assert.throws(()=>parse(changed(main,'&#xE6A7;','&#xE001;')),/glif/)
})
test('challenge, truncated report, truncated lineup, team mismatch and missing identity fail',()=>{
 assert.throws(()=>parse('<title>Just a moment</title>'),/izziv/)
 assert.throws(()=>parse(main.slice(0,main.indexOf('<h3>Abpfiff'))),/odrezan|Abpfiff/)
 assert.throws(()=>parse(main,lineup.slice(0,-200)),/odrezan|postav/)
 assert.throws(()=>parse(main,changed(lineup,'SG Oftersheim','Wrong Team')),/ekip/)
 assert.throws(()=>parse(changed(main,'00NKAUN7HO000000VV0AG85VVUH1CIQU','00NKAUN7HO000000VV0AG85VVUH1CIZZ')),/igral/)
})
test('score mismatch, missing goal and invalid substitution timeline fail',()=>{
 assert.throws(()=>parse(changed(main,'&#xE6A7;','&#xE66F;')),/izid/)
 assert.throws(()=>parse(changed(main,'row-event event-right','ignored-event event-right')),/dogod|izid|karton/)
 assert.throws(()=>parse(changed(main,'59&rsquo;','55&rsquo;')),/čas|minut|zapored/)
})

test('real round links bound all 30 rounds and keep rescheduled rows unassigned',()=>{
 const html=read('de-fussball-krog8.html').toString(),opts={fonts,staffel:'031EKNM2HG00000LVS5489BUVUR5FS5A-G'}
 const r=razberiKrog(html,opts)
 assert.equal(r.sezona,'2026/27');assert.equal(r.krog,8);assert.equal(r.krogi.length,30);assert.equal(r.tekme.length,8);assert.equal(r.prestavljene.length,2)
 const t=r.tekme.find(t=>t.id==='031EQBPLF4000000VS5489BTVUS470OH')
 assert.equal(t.datum,'2026-10-11');assert.equal(t.ura,'15:00');assert.deepEqual(t.rezultat,{domaci:2,gostje:3})
 assert.ok(r.prestavljene.every(t=>t.krog===null))
 assert.equal(r.prestavljene.filter(t=>t.rezultat===null).length,1)
 const hole=html.replace(/<option[^>]*>29\. Spieltag<\/option>/,'')
 assert.notEqual(hole,html);assert.throws(()=>razberiKrog(hole,opts),/seznam krogov/)
 const seasonMismatch=html.replace('>Saison 26/27</option>','>Saison 26/28</option>')
 assert.notEqual(seasonMismatch,html);assert.throws(()=>razberiKrog(seasonMismatch,opts),/sezon/)
 const missing=html.replace('class="column-club"','class="unknown-club"')
 assert.notEqual(missing,html);assert.throws(()=>razberiKrog(missing,opts),/tekma kroga/)
 assert.throws(()=>razberiKrog(html.replace('>30. Spieltag</option>','>31. Spieltag</option>'),opts),/krog/)
 assert.throws(()=>razberiKrog(html,{...opts,staffel:'031EKNM2HG00000LVS5489BUVUR5FS5Z-G'}),/lig/)
})

test('decoy score outside the match stage cannot replace the actual result',()=>{
 const fake='<span class="end-result"><span data-obfuscation="q73uvs1t" class="score-left">&#xE6A7;</span><span data-obfuscation="q73uvs1t" class="score-right">&#xE66F;</span></span>'
 assert.deepEqual(parse(main.replace('<body ',fake+'<body ')).rezultat,{domaci:2,gostje:3})
 const bad=changed(main,'&#xE6A7;','&#xE66F;')
 assert.notEqual(bad,main)
 assert.throws(()=>parse(bad.replace('<body ',fake+'<body ')),/izid/)
})
test('own goal attribution follows score progression and stable lineup identity',()=>{
 const h=main.replace('player-id/00NKAUN7HO000000VV0AG85VVUH1CIQU','player-id/013CF0PHBK000000VV0AG811VSGB9LM4')
 assert.notEqual(h,main)
 const z=parse(h)
 assert.equal(z.goli[0].avtogol,true);assert.equal(z.goli[0].ekipa,'SpVgg 03 Ilvesheim')
 assert.equal(z.goli[0].rezultat.gostje,1);assert.deepEqual(nastopi(z),[])
})
test('stoppage time preserves period order and repeated invalid substitutions reject',()=>{
 const stopped=main.replace('43&rsquo;','43+2&rsquo;')
 assert.notEqual(stopped,main);assert.equal(parse(stopped).nepripisaniKartoni[0].minuta,43)
 const repeat=main.replace('025BQ1KJJO000000VS541L4HVS5D4572','022IT6K700000000VS541L4HVVCT9H46')
 assert.notEqual(repeat,main);assert.throws(()=>parse(repeat),/menjav/)
})

test('partial names, extended reserve classes and missing event wrappers cannot silently lose data',()=>{
 const name=changed(lineup,'class="lastname"','class="unknown-name"')
 assert.throws(()=>parse(main,name),/ime|igral/)
 const pos=lineup.indexOf('<div class="substitutes club-wrapper">')
 assert.ok(pos>0)
 const reserve=lineup.slice(0,pos)+lineup.slice(pos).replace('class="player-wrapper home"','class="player-wrapper home extra"')
 assert.notEqual(reserve,lineup)
 assert.equal(parse(main,reserve).domaci.rezerve.length,9)
 const card=main.replace('class="row-event event-left"','class="unrecognized-event event-left"')
 assert.notEqual(card,main);assert.throws(()=>parse(card),/dogod/)
})
test('round candidate identification survives renamed presentation classes',()=>{
 const html=read('de-fussball-krog8.html').toString(),start=html.indexOf('<tr class="odd">',html.indexOf('fixtures-matches-table'))
 assert.ok(start>0)
 const end=html.indexOf('</tr>',start)+5
 const bad=html.slice(0,start)+html.slice(start,end).replaceAll('column-club','unknown-club').replaceAll('column-score','unknown-score')+html.slice(end)
 assert.notEqual(bad,html)
 assert.throws(()=>razberiKrog(bad,{fonts,staffel:'031EKNM2HG00000LVS5489BUVUR5FS5A-G'}),/tekma kroga/)
})

test('current match identity comes from canonical metadata, never previous-match navigation',()=>{
 assert.ok(main.includes('/spiel/031EQBPLDS000000VS5489BTVUS470OH'))
 assert.throws(()=>razberiZapisnik(main,lineup,{fonts,id:'031EQBPLDS000000VS5489BTVUS470OH'}),/šifr|identitet/)
 const changedCanonical=main.replace('rel="canonical" href="https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/031EQBPLF4000000VS5489BTVUS470OH"','rel="canonical" href="https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/031EQBPLDS000000VS5489BTVUS470OH"')
 assert.notEqual(changedCanonical,main);assert.throws(()=>parse(changedCanonical),/šifr|identitet/)
})
test('unrecognized four-digit inline round dates cannot silently inherit a different headline date',()=>{
 const html=read('de-fussball-krog8.html').toString()
 const bad=html.replace(/(<td class="column-date">)[\s\S]*?(<\/td>)/,'$101.01.2020 15:00$2')
 assert.notEqual(bad,html)
 assert.throws(()=>razberiKrog(bad,{fonts,staffel:'031EKNM2HG00000LVS5489BUVUR5FS5A-G'}),/datum|format/)
})

test('match round binds the unique labelled Spiel metadata record',()=>{
 const comment=main.replace('<head>','<head><!-- / 9. Spieltag -->')
 assert.notEqual(comment,main);assert.equal(parse(comment).krog,8)
 const record='<li class="row"><span>Spiel:</span><span> 320616063 / 8. Spieltag</span></li>'
 assert.ok(main.includes(record))
 const missing=main.replace(record,'')
 assert.notEqual(missing,main);assert.throws(()=>parse(missing),/krog|Spiel/)
 const duplicate=main.replace(record,record+record.replace('8. Spieltag','9. Spieltag'))
 assert.notEqual(duplicate,main);assert.throws(()=>parse(duplicate),/krog|Spiel/)
 const commented=main.replace(record,`<!-- ${record} -->`)
 assert.notEqual(commented,main);assert.throws(()=>parse(commented),/krog|Spiel/)
})
