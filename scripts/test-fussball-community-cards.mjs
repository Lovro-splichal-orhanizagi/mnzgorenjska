import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
const api=await import('./viri/fussball-card-envelope.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const read=n=>readFileSync(new URL('./vzorci/de-fussball-community/'+n,import.meta.url))
const witness=JSON.parse(read('provenance.json')),id=witness.matchId
const main=read('report.html').toString(),lineup=read('lineup.html').toString()
const fonts=Object.fromEntries(Object.entries(witness.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const parse=(html=main,postava=lineup,extra={})=>razberiFantasyZapisnik(html,postava,{fonts,id,lineupId:id,season:witness.season,cardPolicy:'community-v1',...extra})
test('genuine Baden anonymous red produces bounded immutable voting envelope without individual statistics',()=>{
 assert.throws(()=>parse(main,lineup,{cardPolicy:undefined}),e=>e.reason_code==='FUSSBALL_CARD_RECIPIENT_MISSING')
 const r=parse();assert.equal(r.statisticsPending,true);assert.equal(r.reportStatistikaPripravljena,false)
 assert.equal(Object.hasOwn(r,'nastopi'),false);assert.equal(Object.hasOwn(r.z,'goli'),false)
 const e=r.cardEnvelope;assert.equal(e.version,1);assert.equal(e.matchId,id);assert.ok(e.cards.some(c=>c.type!=='yellow'&&c.officialSourceId===null))
 assert.ok(e.roster.some(p=>!p.starter));assert.equal(e.roster.length,new Set(e.roster.map(p=>p.sourceId)).size)
 assert.equal(typeof api.validateFussballCardEnvelope,'function');assert.deepEqual(api.validateFussballCardEnvelope(e).cardEnvelope,e)
})
test('genuine red can be resolved only by exact event key and historical same-side public recipient',()=>{
 const e=parse().cardEnvelope;assert.equal(typeof api.replayFussballCardEnvelope,'function')
 const red=e.cards.find(c=>c.type!=='yellow'),candidate=e.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!main.includes(p.sourceId.split('-').at(-1)))
 assert.throws(()=>api.replayFussballCardEnvelope(e,{}),/pending|unresolved/i)
 const resolutions={[red.eventKey]:candidate.sourceId};if(red.type==='second_yellow')resolutions[e.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal).eventKey]=candidate.sourceId
 const report=api.replayFussballCardEnvelope(e,resolutions)
 assert.equal(report.id,e.reportId);assert.ok(report.nastopi.length>=22)
 const card=report.z.rdeci[0];assert.equal(card.virId,candidate.sourceId);assert.equal(card.attribution,'community');assert.equal(card.officialSourceId,null)
 assert.equal(report.nastopi.find(p=>p.virId===candidate.sourceId).minute,0)
 assert.equal(report.cardEnvelope.bundle.report.base64,e.bundle.report.base64)
 for(const choices of [{bad:candidate.sourceId},{[red.eventKey]:'de-fussball-userid-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'},{[red.eventKey]:e.roster.find(p=>p.side!==red.side).sourceId}])assert.throws(()=>api.replayFussballCardEnvelope(e,choices))
})
test('envelope metadata, bytes, roster and card tampering fails closed',()=>{
 const e=parse().cardEnvelope
 for(const mutate of [e=>{e.round++},e=>{e.revisionSha256='a'.repeat(64)},e=>{e.cards[0].minute++},e=>{e.cards[0].officialSourceId=e.roster[0].sourceId},e=>{e.roster[0].name='Invented'},e=>{e.bundle.report.base64=Buffer.from('changed').toString('base64')},e=>{e.bundle.fonts[0].sha256='b'.repeat(64)}]){
  const copy=structuredClone(e);mutate(copy);assert.throws(()=>api.validateFussballCardEnvelope(copy))
 }
})
test('anonymous reds do not swallow missing public identity or keeper/markup failures',()=>{
 assert.throws(()=>parse(main,lineup.replace(/href="https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+"/,'href="#"')),/profil|identitet/)
 assert.throws(()=>parse(main,lineup.replace('class="c">T</span>','class="c">C</span>')),/vratar/)
 assert.throws(()=>parse(main.replace('class="icon-card red-card"','class="icon-card purple-card"')))
})
const importer=await import('./fussball-import.mjs')
const staffel='03188V27L800000JVS5489BTVU7GTVLE-G',season='2026/27'
function capture(result=parse()){
 const e=result.cardEnvelope,fixture={id:e.matchId,zapisnikId:e.reportId,url:e.sourceUrl,krog:e.round,datum:e.date,ura:e.time,domaci:e.homeName,gostje:e.awayName,rezultat:e.score}
 const pending=result.statisticsPending===true
 return {version:1,scope:{provider:'fussball',staffel,season,seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+staffel,asOfDate:'2026-10-27',cardPolicy:'community-v1'},schedule:{staffel,season,rounds:[1],fixtures:[fixture],rescheduledIds:[]},reports:pending?[]:[{fixture,result}],pendingReports:pending?[{fixture,result}]:[],cardEnvelopes:[e],rejectedReports:[],coverage:{expectedRounds:1,capturedRounds:1,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:pending?0:1,pendingReports:pending?1:0,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}},activationEligible:false}
}
test('opt-in batch includes every public historical candidate while pending statistics remain absent',()=>{
 const r=capture(),batch=importer.buildFussballImportBatch(r,{staffel,season,cardPolicy:'community-v1'})
 assert.equal(batch.reports.length,0);assert.equal(batch.pendingReports.length,1);assert.equal(batch.cardEnvelopes.length,1)
 assert.equal(Object.hasOwn(batch.pendingReports[0],'nastopi'),false);assert.equal(Object.hasOwn(batch.pendingReports[0].z,'goli'),false)
 assert.deepEqual(batch.identities.map(p=>p.source_id).sort(),r.cardEnvelopes[0].roster.map(p=>p.sourceId).sort())
 assert.throws(()=>importer.buildFussballImportBatch(r,{staffel,season}),/policy|scope|coverage/i)
 for(const mutate of [r=>{r.coverage.pendingReports=0},r=>{r.pendingReports=[]},r=>{r.cardEnvelopes=[]},r=>{r.pendingReports[0].result.cardEnvelope.round++},r=>{r.rejectedReports=[{reason:'private profile'}]}]){const c=structuredClone(r);mutate(c);assert.throws(()=>importer.buildFussballImportBatch(c,{staffel,season,cardPolicy:'community-v1'}))}
})
test('genuine second-yellow choices without first yellow remain pending and keeper dismissal stays invalid',()=>{
 const e=parse().cardEnvelope,red=e.cards.find(c=>c.type==='second_yellow'),p=e.roster.find(p=>p.side===red.side&&!p.goalkeeper)
 assert.throws(()=>api.replayFussballCardEnvelope(e,{[red.eventKey]:p.sourceId}),/predhod|prvega/)
 const first=e.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal),keeper=e.roster.find(p=>p.side===red.side&&p.goalkeeper&&p.starter)
 assert.throws(()=>api.replayFussballCardEnvelope(e,{[red.eventKey]:keeper.sourceId,[first.eventKey]:keeper.sourceId}),/vratar/)
})
const {collectFussballSeason}=await import('./fussball-season.mjs')
const {validateFussballCaptureOptions}=await import('./fussball-capture-evidence.mjs')
test('collector distinguishes genuine pending cards from a profile hold and binds explicit policy into capture options',async()=>{
 const e=parse().cardEnvelope,fixture=capture().schedule.fixtures[0],badId='031DS4G7P9000000VS5489BUVUR5FS5A'
 const bad={...fixture,id:badId,zapisnikId:'de-fussball-'+badId,url:fixture.url.replace(id,badId)}
 const seedUrl='https://www.fussball.de/spieltag/-/staffel/'+staffel,roundUrl='https://www.fussball.de/spieltag/-/spieltag/1/staffel/'+staffel
 const fontIds=Object.keys(fonts).sort(),cssTemplate='https://www.fussball.de/export.fontface/-/id/%ID%/type/css'
 const read=async(url,kind)=>{
  let bytes
  if(kind==='round')bytes=Buffer.from('synthetic round inventory')
  else if(kind==='report')bytes=Buffer.from(url===bad.url?main.replaceAll(id,badId):main)
  else if(kind==='lineup')bytes=Buffer.from(url.includes(badId)?lineup.replace(/href="https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+"/,'href="#"'):lineup)
  else if(kind==='css')bytes=Buffer.from(url.match(/\/id\/([^/]+)/)[1])
  else bytes=fonts[url.match(/\/id\/([^/]+)/)[1]].bytes
  return {bytes,sha256:(await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'),capturedAt:'2026-10-27T00:00:00Z'}
 }
 const parsers={inspectPage:(html,scope)=>({url:scope.kind==='round'?seedUrl:scope.matchId===id?fixture.url:bad.url,fontIds,cssTemplate,...(scope.kind==='report'?{lineupUrl:'https://www.fussball.de/ajax.match.lineup/-/mode/PAGE/spiel/'+scope.matchId}:{})}),fontUrl:text=>'https://www.fussball.de/export.fontface/-/format/woff/id/'+text+'/type/font',parseRound:()=>({sezona:season,krog:1,krogi:[{krog:1,url:roundUrl,izbran:true}],tekme:[fixture,bad],prestavljene:[]})}
 const result=await collectFussballSeason({seedUrl,staffel,season,client:{read},cardPolicy:'community-v1'},parsers)
 assert.equal(result.reports.length,0);assert.equal(result.pendingReports.length,1);assert.equal(result.cardEnvelopes.length,1);assert.equal(result.rejectedReports.length,1)
 assert.deepEqual([result.coverage.completeReports,result.coverage.pendingReports,result.coverage.rejectedReports],[0,1,1]);assert.match(result.rejectedReports[0].reason,/profil/)
 const options={seedUrl,staffel,season,maxRequests:100,reportLimit:null,cardPolicy:'community-v1'}
 assert.equal(validateFussballCaptureOptions(options).cardPolicy,'community-v1')
 assert.throws(()=>validateFussballCaptureOptions({...options,cardPolicy:'guess'}),/policy/)
})
const readBase=n=>readFileSync(new URL('./vzorci/'+n,import.meta.url))
const baseManifest=JSON.parse(readBase('de-fussball-zapisnik.json')),baseId='031EQBPLF4000000VS5489BTVUS470OH'
const baseFonts=Object.fromEntries(Object.entries(baseManifest.fonts).map(([id,f])=>[id,{bytes:readBase(f.file),sha256:f.sha256}]))
const baseMain=readBase('de-fussball-ilvesheim-main.html').toString(),baseLineup=readBase('de-fussball-ilvesheim-lineup.html').toString()
const parseBase=(html=baseMain)=>razberiFantasyZapisnik(html,baseLineup,{fonts:baseFonts,id:baseId,lineupId:baseId,season,cardPolicy:'community-v1'})
test('ordinary yellow remains complete, carries immutable envelope, and native deductions replay without changing minutes',()=>{
 const result=parseBase(),e=result.cardEnvelope,card=e.cards[0],p=e.roster.find(p=>p.side===card.side&&p.starter&&!p.goalkeeper)
 assert.equal(result.reportStatistikaPripravljena,true);assert.equal(result.statisticsPending,undefined)
 const report=api.replayFussballCardEnvelope(e,{[card.eventKey]:p.sourceId}),a=report.nastopi.find(a=>a.virId===p.sourceId)
 assert.equal(a.rumeni,1);assert.equal(a.rdeci,0);assert.equal(a.minute,result.nastopi.find(a=>a.virId===p.sourceId).minute)
 assert.equal(report.z.rumeni[0].attribution,'community');assert.equal(report.z.opozorila.length,2)
 const official=structuredClone(e);official.cards[0].officialSourceId=p.sourceId;assert.throws(()=>api.replayFussballCardEnvelope(official,{[card.eventKey]:p.sourceId}))
 const seasonTamper=structuredClone(e);seasonTamper.season='2025/26';assert.throws(()=>api.validateFussballCardEnvelope(seasonTamper))
})
test('TEST ONLY original anonymous yellow changed to a straight red cannot remove an eventual scorer or entrant',()=>{
 // Synthetic event-type alteration only. All original player links, row clock,
 // lineup glyphs and other rows are retained; this is not new official evidence.
 const changed=baseMain.replace('Gelbe Karte','Rote Karte').replace('icon-card yellow-card','icon-card red-card').replace("'time':'43','type':'yellow-card'","'time':'43','type':'red-card'")
 const e=parseBase(changed).cardEnvelope,red=e.cards.find(c=>c.type==='red')
 for(const sourceId of ['de-fussball-userid-025BQ1KJJO000000VS541L4HVS5D4572',parseBase().nastopi.find(p=>p.ime==='Tobias Baumann').virId])assert.throws(()=>api.replayFussballCardEnvelope(e,{[red.eventKey]:sourceId}),/vstop|izstop|aktivn/)
})
test('complete envelope statistics are bound to the same raw replay as pending statistics',()=>{
 const r=capture(parseBase());r.scope.staffel=staffel;r.schedule.staffel=staffel
 // fixture round8 needs full synthetic round inventory for normalization.
 r.schedule.rounds=[1,2,3,4,5,6,7,8];r.coverage.expectedRounds=8;r.coverage.capturedRounds=8
 const batch=importer.buildFussballImportBatch(r,{staffel,season,cardPolicy:'community-v1'})
 assert.equal(batch.reports.length,1);assert.equal(batch.pendingReports.length,0);assert.ok(batch.reports[0].cardEnvelope)
 // Supplemental evidence cannot be smuggled into a source-only capture result.
 const c=structuredClone(r);c.reports[0].result.opozorila=['forged evidence'];assert.throws(()=>importer.buildFussballImportBatch(c,{staffel,season,cardPolicy:'community-v1'}))
})
test('TEST ONLY linked-source yellow always wins over a community recipient choice',()=>{
 const profile=[...baseLineup.matchAll(/<a href="(https:\/\/www\.fussball\.de\/spielerprofil[^\"]+)"[^>]*>[\s\S]*?<\/a>/g)][1]
 const names=[...profile[0].matchAll(/<span data-obfuscation="([a-z0-9]+)" class="(?:first|last)name">([^<]+)<\/span>/g)]
 assert.equal(names.length,2)
 const link=`<a href="${profile[1]}"><span data-obfuscation="${names[0][1]}">${names[0][2]}&#x0020;${names[1][2]}</span></a>`
 const named=baseMain.replace('<div class="valign-cell">Gelbe Karte</div>',`<div class="valign-cell"><div>Gelbe Karte</div>${link}</div>`)
 const e=parseBase(named).cardEnvelope,c=e.cards[0]
 assert.ok(c.officialSourceId);assert.throws(()=>api.replayFussballCardEnvelope(e,{[c.eventKey]:c.officialSourceId}),/official/)
})
