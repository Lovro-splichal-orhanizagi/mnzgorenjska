import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'

const read=n=>readFileSync(new URL('./vzorci/'+n,import.meta.url))
const main=read('de-fussball-ilvesheim-main.html').toString(),lineup=read('de-fussball-ilvesheim-lineup.html').toString()
const provenance=JSON.parse(read('de-fussball-zapisnik.json')),witness=JSON.parse(read('de-fussball-card-shapes.json'))
const fonts=Object.fromEntries(Object.entries(provenance.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',season='2026/27'
const parse=(html,sourceLineup=lineup)=>razberiFantasyZapisnik(html,sourceLineup,{fonts,id,lineupId:id})
const sha=s=>createHash('sha256').update(s).digest('hex')
function range(html,opening){
 const start=html.indexOf(opening);assert.ok(start>=0,opening)
 const tag=opening.match(/^<([a-z]+)/)[1],re=new RegExp(`<\\/?${tag}\\b[^>]*>`,'g');re.lastIndex=start
 let depth=0,m
 while((m=re.exec(html))){depth+=m[0].startsWith('</')?-1:1;if(!depth)return {start,end:re.lastIndex,raw:html.slice(start,re.lastIndex)}}
 assert.fail('unclosed fixture node')
}
function rows(html){return [...html.matchAll(/<div class="row-event event-(?:left|right)">/g)].map(m=>{const r=range(html.slice(m.index),m[0]);return {...r,start:m.index,end:m.index+r.end}})}
const originalRows=rows(main),template=originalRows[0].raw
const sub=originalRows.find(r=>r.raw.includes('59&rsquo;')).raw
const incoming=lineupProfile('025BQ1KJJO000000VS541L4HVS5D4572')
const cedric='de-fussball-userid-025BQ1KJJO000000VS541L4HVS5D4572'
// TEST ONLY: named-card DOM composition has NOT been witnessed in a live card
// row. It combines an actual card icon/label with the exact linked-player node
// grammar. The profile ID and full-name glyphs are taken from the authentic
// lineup; concatenating first/last glyphs is synthetic fixture composition.
function card({minute=85,kind='red',profile=incoming,side=0}={}){
 const label={red:'Rote Karte',yellow:'Gelbe Karte',second:'Gelb-Rote Karte'}[kind]
 const icon=kind==='second'?'<span class="icon-stack"><span class="icon-card-half yellow-card"></span><span class="icon-card red-card"></span></span>':`<i class="icon-card ${kind==='red'?'red':'yellow'}-card"></i>`
 let raw=template.replace('<div class="valign-cell">Gelbe Karte</div>',`<div class="valign-cell">${profile?`<div>${label}</div>${profile}`:label}</div>`).replace('<i class="icon-card yellow-card"></i>',icon).replace('43&rsquo;',`${minute}&rsquo;`)
 if(side===1){const columns=['column-player','column-event','column-time'].map(c=>range(raw,`<div class="${c}">`).raw);raw=`<div class="row-event event-right">${columns.reverse().join('')}</div>`}
 return {raw,minute:String(minute),type:{red:'red-card',yellow:'yellow-card',second:'yellow-red-card'}[kind],side}
}
function add(cards,source=main){
 let html=source
 for(const c of cards){
  const period=range(html,`<div class="${Number(c.minute.split('+')[0])<=45?'first':'second'}-half ingame">`)
  const before=rows(html).find(r=>r.start>period.start&&r.end<period.end&&Number(r.raw.match(/valign-inner">\s*(\d+)/)?.[1])>Number(c.minute.split('+')[0]))
  const events=range(period.raw,'<div class="events">'),container=range(events.raw,'<div class="container">')
  const insertion=before?before.start:period.start+events.start+container.end-6
  html=html.slice(0,insertion)+c.raw+html.slice(insertion)
 }
 return html.replace(/data-match-events="([^"]*)"/,(_,s)=>{
  const q=JSON.parse(s.replace(/'/g,'"'))
  for(const c of cards){const key=Number(c.minute.split('+')[0])<=45?'first-half':'second-half',events=q[key].events,item={time:c.minute,type:c.type,team:c.side?'away':'home'};let i=events.findIndex(e=>Number(e.time)>Number(c.minute));if(i<0)i=events.length;events.splice(i,0,item)}
  return `data-match-events="${JSON.stringify(q).replace(/"/g,"'")}"`
 })
}
function batch(result){
 const fixture={id,zapisnikId:'de-fussball-'+id,url:result.dogodki[0].virUrl,krog:8,datum:'2026-10-11',ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 return buildFussballImportBatch({version:1,scope:{provider:'fussball',staffel,season,seedUrl:provenance.provenance.roundUrl,asOfDate:'2026-10-26'},schedule:{staffel,season,rounds:[1,2,3,4,5,6,7,8],fixtures:[fixture],rescheduledIds:[]},reports:[{fixture:structuredClone(fixture),result}],rejectedReports:[],coverage:{expectedRounds:8,capturedRounds:8,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}},activationEligible:false},{staffel,season})
}
test('unchanged supported anonymous-yellow report retains exact baseline JSON for durable cache replay',()=>{
 // Baseline installed parser at main0c9d32c7, unchanged original report/lineup
 // and bound glyph files. Card support must not reformat complete old facts.
 assert.equal(sha(JSON.stringify(parse(main))+'\n'),'6efa388bc28ed27c11b4e7e3f4adaad693789ff010de1a85b21898ec2ba4542e')
})
test('retained anonymous red/second-yellow row proof remains exact and cannot supply a recipient',()=>{
 for(const e of witness.observed){assert.equal(sha(e.rawRow),e.rowSha256);assert.equal(Buffer.byteLength(e.rawRow),e.rowUtf8Bytes);assert.ok(!e.rawRow.includes('/spielerprofil/'))}
 for(const kind of ['red','second'])assert.throws(()=>parse(add([card({kind,profile:null})])),e=>e.code==='FUSSBALL_REPORT_UNSUPPORTED'&&e.reason_code==='FUSSBALL_CARD_RECIPIENT_MISSING'&&e.dataHold===true)
 // Exact original anonymous rows, unchanged; only the surrounding match/frame
 // and quick-view inventory are synthetic. No participant is added to them.
 for(const e of witness.observed){const minute=e.rawRow.match(/valign-inner">\s*(\d+)/)[1],side=e.rawRow.startsWith('<div class="row-event event-right">')?1:0;assert.throws(()=>parse(add([{raw:e.rawRow,minute,type:e.kind==='straight-red'?'red-card':'yellow-red-card',side}])),error=>error.reason_code==='FUSSBALL_CARD_RECIPIENT_MISSING')}
})
test('TEST ONLY linked red closes an entrant interval and round-trips exact native card proof',()=>{
 const r=parse(add([card()])),a=r.nastopi.find(a=>a.virId===cedric)
 assert.deepEqual([a.minutaOd,a.minutaDo,a.minute,a.rdeci,a.redCardMinute],[59,85,26,1,85])
 assert.equal(r.nastopi.filter(a=>a.ekipaIdx===0).reduce((n,a)=>n+a.minute,0),985)
 const b=batch(r),native=b.reports[0],red=native.z.rdeci[0]
 assert.equal(red.virId,cedric);assert.equal(red.regSt,native.nastopi.find(a=>a.virId===cedric).regSt)
 assert.equal(red.minuta,85);assert.equal(red.naIgriscu,true);assert.match(red.eventSha256,/^[a-f0-9]{64}$/)
 assert.equal(native.nastopi.find(a=>a.virId===cedric).redCardMinute,85)
})
test('TEST ONLY explicit first yellow + second yellow produces one yellow and one red',()=>{
 const r=parse(add([card({kind:'yellow',minute:80}),card({kind:'second'})])),a=r.nastopi.find(a=>a.virId===cedric)
 assert.equal(a.rumeni,1);assert.equal(a.rdeci,1);assert.equal(r.z.rdeci[0].drugiRumeni,true)
 assert.equal(r.nepripisaniRumeni.length,3)
 const native=batch(r).reports[0];assert.equal(native.z.rumeni.length,1);assert.equal(native.z.rdeci.length,1)
 assert.throws(()=>parse(add([card({kind:'second'})])),/prv.*rumen|predhodn/i)
})
test('TEST ONLY substituted-out bench recipient keeps historical interval and team minutes',()=>{
 const outgoing=lineupProfile('022IT6K700000000VS541L4HVVCT9H46')
 const r=parse(add([card({profile:outgoing})])),red=r.z.rdeci[0],a=r.nastopi.find(a=>a.virId===red.virId)
 assert.equal(red.naIgriscu,false);assert.equal(a.minutaDo,59);assert.equal(a.rdeci,1)
 assert.equal(r.nastopi.filter(a=>a.ekipaIdx===0).reduce((n,a)=>n+a.minute,0),990)
 assert.equal(batch(r).reports[0].z.rdeci[0].naIgriscu,false)
})
test('TEST ONLY missing/foreign profiles, side conflict and simultaneous substitution cannot pass',()=>{
 const html=add([card()])
 for(const changed of [add([card({profile:incoming.replace('025BQ1KJJO000000VS541L4HVS5D4572','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')})]),add([card({profile:incoming.replace('025BQ1KJJO000000VS541L4HVS5D4572','022IT6K700000000VS541L4HVVCT9H46')})]),add([card({side:1})]),add([card({minute:59})])])assert.throws(()=>parse(changed))
 const r=parse(html)
 for(const mutate of [x=>{x.z.rdeci[0].virId='de-fussball-userid-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},x=>{x.z.rdeci[0].minuta=84},x=>{x.nastopi.find(a=>a.virId===cedric).rdeci=0},x=>{x.z.rdeci[0].ekipaIdx=1},x=>{x.z.rdeci[0].naIgriscu=false}]){const copy=structuredClone(r);mutate(copy);assert.throws(()=>batch(copy))}
})
function lineupProfile(value){
 const anchor=[...lineup.matchAll(/<a href="(https:\/\/www\.fussball\.de\/spielerprofil[^\"]+)"[^>]*>[\s\S]*?<\/a>/g)].find(m=>m[1].endsWith(value));assert.ok(anchor)
 const names=[...anchor[0].matchAll(/<span data-obfuscation="([a-z0-9]+)" class="(?:first|last)name">([^<]+)<\/span>/g)]
 assert.equal(names.length,2);assert.equal(names[0][1],names[1][1])
 return `<a href="${anchor[1]}"><span data-obfuscation="${names[0][1]}">${names[0][2]}&#x0020;${names[1][2]}</span></a>`
}
test('TEST ONLY unused bench red has zero playing minutes; a keeper dismissal without role evidence stays held',()=>{
 const r=parse(add([card({profile:lineupProfile('021MNM738O000000VS541L4HVU9COTHN')})])),red=r.z.rdeci[0],a=r.nastopi.find(a=>a.virId===red.virId)
 assert.equal(r.nastopi.length,31);assert.equal(a.zacetnik,false);assert.equal(a.minute,0);assert.equal(red.naIgriscu,false)
 assert.equal(r.nastopi.filter(a=>a.ekipaIdx===0).reduce((n,a)=>n+a.minute,0),990)
 assert.equal(batch(r).reports[0].nastopi.find(a=>a.virId===red.virId).rdeci,1)
 assert.throws(()=>parse(add([card({profile:lineupProfile('00NKAU0I64000000VV0AG85VVUH1CIQU')})])),/vratar/)
})
test('TEST ONLY named ordinary yellow preserves native count without dismissal or lost minutes',()=>{
 const r=parse(add([card({kind:'yellow',minute:80})])),native=batch(r).reports[0],a=native.nastopi.find(a=>a.virId===cedric)
 assert.equal(a.rumeni,1);assert.equal(a.rdeci,0);assert.equal(a.redCardMinute,null)
 assert.equal(native.z.rumeni[0].regSt,a.regSt);assert.equal(native.z.rdeci.length,0)
 assert.equal(native.nastopi.filter(a=>a.ekipaIdx===0).reduce((n,a)=>n+a.minute,0),990)
})
test('TEST ONLY raw added-time ordering survives capped native totals; later cards after dismissal hold',()=>{
 const r=parse(add([card({kind:'yellow',minute:'90+1'}),card({minute:'90+2'})])),red=r.z.rdeci[0],a=r.nastopi.find(a=>a.virId===cedric)
 assert.equal(red.cas,'90+2&rsquo;');assert.equal(red.osnovnaMinuta,90);assert.equal(red.dodatek,2);assert.equal(red.polcas,2)
 assert.deepEqual([a.minute,a.rumeni,a.rdeci,a.redCardMinute],[31,1,1,90])
 assert.equal(batch(r).reports[0].nastopi.filter(a=>a.ekipaIdx===0).reduce((n,a)=>n+a.minute,0),990)
 assert.throws(()=>parse(add([card({minute:'90+1'}),card({kind:'yellow',minute:'90+2'})])),/izključen/)
 assert.throws(()=>parse(add([card({minute:'45+1'})])),/vstop|izstop/,'first-half bench dismissal cannot become a second-half entrant')
 const same=parse(add([card({kind:'yellow',minute:80}),card({kind:'second',minute:80})]));assert.equal(batch(same).reports[0].z.rdeci[0].drugiRumeni,true)
})
test('TEST ONLY scorer/dismissal same-clock ambiguity and a goal after dismissal remain held',()=>{
 const scorer=parse(main).nastopi.find(a=>a.ime==='Tobias Baumann'),profile=lineupProfile(scorer.virId.split('-').at(-1))
 assert.throws(()=>parse(add([card({profile,minute:69})])),/dvoumen čas strelca in izključitve/)
 assert.throws(()=>parse(add([card({profile,minute:60})])),/gol neaktivnega/)
 const wrongSummary=add([card()]).replace("'time':'85','type':'red-card'","'time':'85','type':'yellow-card'")
 assert.throws(()=>parse(wrongSummary),/neskladje/)
})
test('TEST ONLY explicit goalkeeper substitution stays valid alongside unrelated outfield red',()=>{
 const scorer=parse(main).nastopi.find(a=>a.ime==='Tobias Baumann'),profile=lineupProfile(scorer.virId.split('-').at(-1))
 const altered=sub.replace('userid/025BQ1KJJO000000VS541L4HVS5D4572','userid/02A4OQIVJ8000000VUM1DNPQVSOM9I2G').replace('userid/022IT6K700000000VS541L4HVVCT9H46','player-id/00NKAU0I64000000VV0AG85VVUH1CIQU')
 const r=parse(add([card({profile})],main.replace(sub,altered))),native=batch(r).reports[0]
 assert.deepEqual(native.nastopi.filter(a=>a.ekipaIdx===0&&a.vratar).map(a=>a.minute),[59,31])
 assert.equal(native.nastopi.filter(a=>a.ekipaIdx===0).reduce((n,a)=>n+a.minute,0),985)
 assert.equal(native.z.rdeci[0].virId,scorer.virId)
})
