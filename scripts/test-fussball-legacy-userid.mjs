// Composed offline reports: retain supported source bytes and bind the observed
// opaque legacy userid to existing roster/event participants, without name aliases.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiZapisnik} from './viri/fussball.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {buildFussballImportBatch,fussballPlayerKey} from './fussball-import.mjs'
const read=n=>readFileSync(new URL('./vzorci/'+n,import.meta.url))
const main=read('de-fussball-ilvesheim-main.html').toString(),lineup=read('de-fussball-ilvesheim-lineup.html').toString()
const manifest=JSON.parse(read('de-fussball-zapisnik.json')),witness=JSON.parse(read('de-fussball-legacy-userid.json')).source
const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',options={fonts,id,lineupId:id},staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',season='2026/27'
const token='I.715682.-----------------------',profile='userid/'+token,sourceId='de-fussball-userid-'+token
const parse=(html=main,players=lineup)=>razberiFantasyZapisnik(html,players,options)
const sha=s=>createHash('sha256').update(s).digest('hex')
function batch(result){
 const fixture={id,zapisnikId:'de-fussball-'+id,url:result.dogodki[0].virUrl,krog:8,datum:'2026-10-11',ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
 return buildFussballImportBatch({version:1,scope:{provider:'fussball',staffel,season,seedUrl:manifest.provenance.roundUrl,asOfDate:'2026-10-26'},schedule:{staffel,season,rounds:[1,2,3,4,5,6,7,8],fixtures:[fixture],rescheduledIds:[]},reports:[{fixture:structuredClone(fixture),result}],rejectedReports:[],coverage:{expectedRounds:8,capturedRounds:8,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}},activationEligible:false},{staffel,season})
}
test('observed legacy userid survives scorer and substitute refs, appearances and native SHA52 reservation',()=>{
 assert.equal(witness.sourceId,sourceId);assert.equal(witness.profileUrl,'https://www.fussball.de/spielerprofil/-/'+profile)
 assert.equal(sha(witness.report.rawEvent),witness.report.rawEventSha256)
 assert.equal(sha(witness.lineup.rawPlayer),witness.lineup.rawPlayerSha256)
 for(const [previous,goals,minuteFrom] of [['player-id/013CF0PHBK000000VV0AG811VSGB9LM4',2,0],['userid/025BQ1KJJO000000VS541L4HVS5D4572',0,59]]){
  const html=main.replaceAll(previous,profile),players=lineup.replaceAll(previous,profile),result=parse(html,players)
  const player=result.nastopi.find(p=>p.virId===sourceId)
  assert.ok(player);assert.equal(player.goli,goals);assert.equal(player.minutaOd,minuteFrom)
  assert.ok(result.dogodki.some(e=>e.virIds.includes(sourceId)))
  const low=razberiZapisnik(html,players,options)
  assert.ok([...low.domaci.postava,...low.domaci.rezerve].some(p=>p.virId===sourceId))
  const native=batch(result),key=fussballPlayerKey(sourceId)
  assert.equal(key,Number.parseInt(sha(sourceId).slice(0,13),16)+2**52)
  assert.deepEqual(native.identities.find(p=>p.source_id===sourceId),{source_id:sourceId,reg_st:key})
  assert.equal(native.reports[0].nastopi.find(p=>p.virId===sourceId).regSt,key)
  for(const goal of native.reports[0].z.goli.filter(p=>p.virId===sourceId))assert.equal(goal.regSt,key)
 }
 assert.notEqual(fussballPlayerKey(sourceId),fussballPlayerKey(sourceId.replace('715682','715683')))
})
test('independent Sachsenliga legacy userid witness uses the same exact opaque grammar',()=>{
 const source=JSON.parse(read('de-fussball-legacy-userid.json')).independentWitnesses[0]
 assert.equal(source.sourceId,'de-fussball-userid-I.573584.-----------------------')
 assert.equal(sha(source.lineup.rawPlayer),source.lineup.rawPlayerSha256)
 const previous='player-id/013CF0PHBK000000VV0AG811VSGB9LM4',replacement='userid/I.573584.-----------------------'
 const result=parse(main.replaceAll(previous,replacement),lineup.replaceAll(previous,replacement))
 assert.equal(result.nastopi.find(p=>p.virId===source.sourceId).goli,2)
 assert.ok(batch(result).identities.some(p=>p.source_id===source.sourceId))
})
test('composed named card legacy userid binds the exact roster identity through native discipline',()=>{
 const previous='player-id/013CF0PHBK000000VV0AG811VSGB9LM4'
 const anchor=[...lineup.matchAll(/<a href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)].find(m=>m[1].endsWith(previous))
 assert.ok(anchor)
 const names=[...anchor[0].matchAll(/<span data-obfuscation="([a-z0-9]+)" class="(?:first|last)name">([^<]+)<\/span>/g)]
 assert.equal(names.length,2);assert.equal(names[0][1],names[1][1])
 const link=`<a href="https://www.fussball.de/spielerprofil/-/${profile}"><span data-obfuscation="${names[0][1]}">${names[0][2]}&#x0020;${names[1][2]}</span></a>`
 const html=main.replaceAll(previous,profile).replace('<div class="valign-cell">Gelbe Karte</div>',`<div class="valign-cell"><div>Gelbe Karte</div>${link}</div>`)
 const result=parse(html,lineup.replaceAll(previous,profile)),native=batch(result)
 assert.equal(result.z.rumeni[0].virId,sourceId)
 assert.equal(result.nastopi.find(p=>p.virId===sourceId).rumeni,1)
 assert.equal(native.reports[0].z.rumeni[0].regSt,6394905115450194)
 assert.equal(native.reports[0].nastopi.find(p=>p.virId===sourceId).rumeni,1)
})
test('legacy userid hashes the full opaque namespace with the existing native SHA52 algorithm',()=>{
 assert.equal(fussballPlayerKey(sourceId),6394905115450194)
})
test('legacy userid is exact, namespace restricted and cannot hide malformed roster or event identities',()=>{
 const previous='player-id/013CF0PHBK000000VV0AG811VSGB9LM4'
 const invalid=[
  'player-id/'+token,'userid/'+token.replace('I.','i.'),'userid/'+token.replace('715682','71568'),
  'userid/'+token.replace('715682','7156820'),'userid/'+token.slice(0,-1),'userid/'+token+'-',
  'userid/'+token+'?x=1','userid/'+token+'#x','userid/'+token+'/','userid/'+token+'\n',
  'userid/X'+token,'userid/'+token.replace('715682','71568A'),'userid/715682','userid/k.A.',
 ]
 for(const bad of invalid){
  const html=main.replaceAll(previous,bad),players=lineup.replaceAll(previous,bad)
  assert.throws(()=>parse(html,players),undefined,bad)
  assert.throws(()=>razberiZapisnik(html,players,options),undefined,bad)
  assert.throws(()=>fussballPlayerKey('de-fussball-'+bad.replace('/','-')),undefined,bad)
 }
 const players=lineup.replaceAll(previous,profile)
 assert.throws(()=>parse(main,players),'event/roster profile mismatch cannot bind by name')
 for(const bad of invalid)assert.throws(()=>razberiZapisnik(main.replaceAll(previous,bad),players,options),undefined,bad)
})
