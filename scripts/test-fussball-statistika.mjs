import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'

const base=new URL('./vzorci/',import.meta.url),read=n=>readFileSync(new URL(n,base))
const main=read('de-fussball-ilvesheim-main.html').toString(),lineup=read('de-fussball-ilvesheim-lineup.html').toString()
const manifest=JSON.parse(read('de-fussball-zapisnik.json'))
const authentic46Manifest=JSON.parse(read('de-fussball-46-manifest.json'))
const authentic46Main=read('de-fussball-46-main.html').toString()
const authentic46Lineup=read('de-fussball-46-lineup.html').toString()
const authentic46Fonts=Object.fromEntries(Object.entries(authentic46Manifest.fonts).map(([fontId,f])=>[fontId,{bytes:read(f.file),sha256:f.sha256}]))
const nestedAddedTime=JSON.parse(read('de-fussball-nested-added-time.json'))
const strafstosstor=JSON.parse(read('de-fussball-strafstosstor.json'))
const observedShapes=JSON.parse(read('de-fussball-observed-shapes.json'))
const {razberiZapisnik}=await import('./viri/fussball.mjs')
const fonts=Object.fromEntries(Object.entries(manifest.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const id='031EQBPLF4000000VS5489BTVUS470OH',options={id,lineupId:id,fonts}
const sha=s=>createHash('sha256').update(s).digest('hex')
// Missing implementation is an assertion failure during the first RED run.
const module=await import('./viri/fussball-statistika.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const parse=(html=main,l=lineup,o=options)=>{assert.equal(typeof module.razberiFantasyZapisnik,'function','raw fantasy entrypoint exists');return module.razberiFantasyZapisnik(html,l,o)}
function rows(html){
 const out=[]
 for(const m of html.matchAll(/<div class="row-event event-(?:left|right)">/g)){
  const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=m.index;let depth=0,t
  while((t=tags.exec(html))){depth+=t[0].startsWith('</')?-1:1;if(!depth){out.push({start:m.index,end:tags.lastIndex,raw:html.slice(m.index,tags.lastIndex)});break}}
 }
 return out
}
function edit(i,fn,html=main){const r=rows(html)[i];return html.slice(0,r.start)+fn(r.raw)+html.slice(r.end)}
function elementRange(html,opening){
 const start=html.indexOf(opening);assert.ok(start>=0,opening)
 const tag=opening.match(/^<([a-z]+)/)[1],tokens=new RegExp(`<\\/?${tag}\\b[^>]*>`,'g');tokens.lastIndex=start
 let depth=0,m
 while((m=tokens.exec(html))){depth+=m[0].startsWith('</')?-1:1;if(!depth)return {start,end:tokens.lastIndex,raw:html.slice(start,tokens.lastIndex)}}
 assert.fail(`unclosed test element ${opening}`)
}
function wrapElement(html,opening,before,after){const r=elementRange(html,opening);return html.slice(0,r.start)+before+r.raw+after+html.slice(r.end)}
function quick(html,fn){return html.replace(/data-match-events="([^"]*)"/,(_,s)=>`data-match-events="${JSON.stringify(fn(JSON.parse(s.replace(/'/g,'"')))).replace(/"/g,"'")}"`)}
function eventInfo(i,label='Strafstoßtor',html=main){return edit(i,raw=>{const r=elementRange(raw,'<div class="even">');return raw.slice(0,r.end-6)+`<span class="event-info">${label}</span></div>`+raw.slice(r.end)},html)}
function clock(i,value,html=main){
 html=edit(i,s=>s.replace(/class="valign-inner">[^<]+/,`class="valign-inner">${value}&rsquo;`),html)
 return quick(html,q=>{const events=[...q['first-half'].events,...q['second-half'].events];events[i].time=value;return q})
}
const reject=(html,l=lineup,o=options,reason=/./)=>assert.throws(()=>parse(html,l,o),e=>/^FUSSBALL_REPORT_(INVALID|UNSUPPORTED)$/.test(e.code)&&e.message.length>20&&reason.test(e.message))
// Independent literal ID/interval oracle, including every unchanged starter.
const expected=[
 [0,'player-id','00NKAU0I64000000VV0AG85VVUH1CIQU',0,90],
 [0,'userid','022IT6K700000000VS541L4HVVCT9H46',0,59],
 [0,'userid','0283NIGALK000000VS541L4GVTUREDLG',0,90],
 [0,'player-id','013CF0PHBK000000VV0AG811VSGB9LM4',0,90],
 [0,'userid','02QP3HSCGO000000VUM1D52CVVAFVG26',0,90],
 [0,'userid','02A3UB11DC000000VUM1DNOQVU1U74MJ',0,90],
 [0,'player-id','00NKATCD5C000000VV0AG85VVUH1CIQU',0,90],
 [0,'player-id','00O02GC1OO000000VV0AG83KVTGT8G00',0,82],
 [0,'player-id','00NKB0FN5K000000VV0AG85VVUH1CIQU',0,90],
 [0,'userid','02KLA1QSV0000000VUM1DNPBVTLF6IIO',0,90],
 [0,'player-id','00NP5DQCIK000000VV0AG85VVTQNFIIH',0,68],
 [0,'userid','025A828Q8S000000VS541L4IVUSSFP3N',68,90],
 [0,'userid','025BQ1KJJO000000VS541L4HVS5D4572',59,90],
 [0,'userid','02BTCK5F6S000000VUM1DNO8VSH2IDKP',82,90],
 [1,'player-id','0192B6VBGS000000VV0AG80NVSFDG9QH',0,90],
 [1,'player-id','00NKB0I44O000000VV0AG85VVUH1CIQU',0,90],
 [1,'player-id','00NKAUN7HO000000VV0AG85VVUH1CIQU',0,90],
 [1,'userid','028S5S3V70000000VS541L4KVT82IE4D',0,90],
 [1,'player-id','00TT0LSQOO000000VV0AG811VSAPJHVR',0,87],
 [1,'player-id','01DJP2BOV0000000VV0AG80NVSPF297E',0,90],
 [1,'player-id','01HOB6CTDO000000VV0AG811VULQLSU4',0,90],
 [1,'userid','02FO8JGFCC000000VUM1DNPFVSC8GJGQ',0,67],
 [1,'userid','02F7HO41QG000000VUM1DNP8VSA2M5R9',0,72],
 [1,'userid','02G5D1OEH0000000VUM1DNP7VUO8NB1V',0,67],
 [1,'player-id','00NKAVBA5C000000VV0AG85VVUH1CIQU',0,90],
 [1,'userid','0252GJHBD0000000VS541L4KVTOTF5EF',72,90],
 [1,'userid','02LOHHMTDS000000VUM1DNONVUKGUNLN',67,90],
 [1,'userid','0246LP1SOC000000VS541L4FVVMMH6J6',87,90],
 [1,'player-id','01HND2GGSK000000VV0AG80NVU1RKFJ0',67,90],
 [1,'player-id','02C3D9DRKO000000VS5489B5VVQASLMA',90,90],
].map(([side,namespace,value,from,to])=>[side,`de-fussball-${namespace}-${value}`,from,to])

test('authentic capture and all bound fonts retain exact evidence hashes',()=>{
 assert.equal(sha(main),'40ddfc149977bcd0f245a5a43d5865775ee8c363f67d36c883b9733fe188d1a3')
 assert.equal(sha(lineup),'f7a16d5aefb32d6c13b801bf89646b60acafc02ad7a72563ef33ef4bb39ab8cf')
 for(const f of Object.values(fonts))assert.equal(sha(f.bytes),f.sha256)
})
test('authentic second-half 46 substitution preserves source minute, identities and independent intervals',()=>{
 assert.equal(sha(read('de-fussball-46-manifest.json')),'975ae572336e7898e13d1f9b5b8bf7dad9af99d9e88ddf3b7395aa25db9e9f95')
 assert.equal(sha(authentic46Main),'d5643c6dadfe2503347497d65967b804253bb47e4eb2ffa60d05552f7772cacf')
 assert.equal(sha(authentic46Lineup),'6b537b3b4ef69e35d152958918ecb70aa47a2419ce1b227b4db9c9f33133e196')
 assert.equal(sha(authentic46Main),authentic46Manifest.report.sha256)
 assert.equal(Buffer.byteLength(authentic46Main),authentic46Manifest.report.bytes)
 assert.equal(sha(authentic46Lineup),authentic46Manifest.lineup.sha256)
 assert.equal(Buffer.byteLength(authentic46Lineup),authentic46Manifest.lineup.bytes)
 for(const f of Object.values(authentic46Fonts))assert.equal(sha(f.bytes),f.sha256)
 const sourceRow=rows(authentic46Main).find(({raw})=>raw.includes(authentic46Manifest.event.icon)&&raw.includes(authentic46Manifest.event.rawClockHtml))
 assert.ok(sourceRow)
 assert.equal(Buffer.byteLength(authentic46Main.slice(0,sourceRow.start)),authentic46Manifest.event.rowUtf8ByteOffset)
 const r=parse(authentic46Main,authentic46Lineup,{id:authentic46Manifest.match.id,lineupId:authentic46Manifest.match.id,fonts:authentic46Fonts})
 const sub=r.dogodki.find(e=>e.vrsta==='menjava'&&e.osnovnaMinuta===46)
 assert.ok(sub)
 assert.equal(sub.polcas,2)
 assert.equal(sub.ekipaIdx,0)
 assert.equal(sub.ordinal,authentic46Manifest.event.ordinal)
 assert.equal(sub.cas,'46&rsquo;')
 assert.deepEqual(sub.virIds,[
  'de-fussball-userid-022QO0FITS000000VS541L4GVS3APGTL',
  'de-fussball-player-id-025CBPBL34000000VS54898FVUVB4QL0',
 ])
 const incoming=r.nastopi.find(p=>p.virId===sub.virIds[0]),outgoing=r.nastopi.find(p=>p.virId===sub.virIds[1])
 assert.deepEqual([incoming.minutaOd,incoming.minutaDo,incoming.minute],[46,90,44])
 assert.deepEqual([outgoing.minutaOd,outgoing.minutaDo,outgoing.minute],[0,46,46])
})
test('authentic 46 substitution still rejects an entrant without a profile identity',()=>{
 const index=rows(authentic46Main).findIndex(({raw})=>raw.includes('class="icon-substitute"')&&raw.includes('<div class="valign-inner">46&rsquo;</div>'))
 const missing=edit(index,raw=>raw.replace(/<a href="https:\/\/www\.fussball\.de\/spielerprofil\/-\/userid\/022QO0FITS000000VS541L4GVS3APGTL">[\s\S]*?<\/a>/,'<span><span>k.A. (17)</span></span>'),authentic46Main)
 assert.throws(()=>parse(missing,authentic46Lineup,{id:authentic46Manifest.match.id,lineupId:authentic46Manifest.match.id,fonts:authentic46Fonts}),/menjava brez obeh igralcev/)
})
test('Ilvesheim yields exact historical intervals, goals, keepers and report-only readiness',()=>{
 const r=parse(),a=r.nastopi
 assert.equal(r.reportStatistikaPripravljena,true);assert.equal(r.sezonskiUvozPodprt,false);assert.equal(r.activationEligible,false);assert.equal(r.z.nepopoln,true)
 assert.deepEqual(a.map(p=>[p.ekipaIdx,p.virId,p.minutaOd,p.minutaDo]),expected)
 assert.equal(a.length,30);assert.equal(a.filter(p=>p.zacetnik).length,22);assert.equal(a.filter(p=>!p.zacetnik).length,8)
 assert.deepEqual(a.filter(p=>p.minute===0).map(p=>p.ime),['Jadis Jadon Nkolo Vata'])
 assert.deepEqual([0,1].map(side=>a.filter(p=>p.ekipaIdx===side).reduce((n,p)=>n+p.minute,0)),[990,990])
 assert.equal(a.reduce((n,p)=>n+p.minute,0),1980)
 assert.deepEqual(a.filter(p=>p.vratar).map(p=>[p.ime,p.minute,p.pozicija]),[['Patrick Obsada',90,'GK'],['Simon Felix Knauf',90,'GK']])
 assert.deepEqual(a.filter(p=>p.goli).map(p=>[p.ime,p.goli]),[['Tobias Baumann',2],['Patrick Schleich',2],['Farzad Hamidi',1]])
 for(const p of a){assert.equal(p.minute,p.minutaDo-p.minutaOd);assert.equal(p.regSt,null);assert.equal(p.prejetiGoli,p.ekipaIdx===0?3:2);assert.equal(p.cleanSheet,false);for(const key of ['goliIzEnajstmetrovke','avtogoli','zgreseneEnajstmetrovke','rumeni','rdeci'])assert.equal(p[key],0)}
 assert.deepEqual(r.z.rezultat,{domaci:2,gostje:3})
 assert.deepEqual(r.z.menjave.map(s=>[s.minuta,s.noter.ime,s.ven.ime]),[[59,'Cedric Fleckenstein','Tobias Schneider'],[67,'Farzad Hamidi','Marco Seibert'],[67,'Levin Lysowec','Moritz Braun'],[68,'Janik Lorch','Arbenit Hoti'],[72,'Pablo Ehringer Gonzalez','Mert Tut'],[82,'Luca König','Schad Bendiyan'],[87,'Niklas Guellich','Carl Leon Pohl'],[90,'Jadis Jadon Nkolo Vata','Patrick Schleich']])
})
test('anonymous yellows retain exact raw clocks, ordinals, side and raw event SHA without attributed deductions',()=>{
 const r=parse(),raw=rows(main)
 assert.deepEqual(r.nepripisaniRumeni.map(p=>[p.ekipaIdx,p.cas,p.osnovnaMinuta,p.dodatek,p.ordinal,p.polcas]),[[0,'43&rsquo;',43,0,1,1],[0,'52&rsquo;',52,0,2,2],[1,'77&rsquo;',77,0,12,2]])
 for(const p of r.nepripisaniRumeni){assert.equal(p.zapisnikId,`de-fussball-${id}`);assert.equal(p.virUrl,`https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/${id}`);assert.equal(p.eventSha256,sha(raw[p.ordinal-1].raw));assert.equal(p.virId,null)}
 assert.equal(r.dogodki.length,16)
 assert.ok(Array.isArray(r.opozorila),'report layer explains anonymous-yellow deductions')
 assert.ok(r.opozorila.some(w=>w.includes('3')&&w.includes('nepripisan')&&w.includes('odbitkov')))
 assert.ok(r.opozorila.every(w=>!w.startsWith('SLFF_UNATTRIBUTED_YELLOW_V1:')))
 for(const [i,p] of r.dogodki.entries()){assert.equal(p.ordinal,i+1);assert.equal(p.eventSha256,sha(raw[i].raw))}
})
test('captured nested 90+1 clock parses without changing substitution identity or interval facts',()=>{
 const captures=nestedAddedTime.observedCaptureClocks
 assert.deepEqual(captures.map(c=>[c.base,c.added]),[[90,1],[90,4]])
 for(const capture of captures){
  assert.match(capture.source.rawClockHtml,new RegExp(`90\\s+&rsquo;\\s+<div>\\+${capture.added}<\\/div>`))
 }
 const index=rows(main).findIndex(({raw})=>raw.includes('class="icon-substitute"')&&raw.includes('<div class="valign-inner">90&rsquo;</div>'))
 assert.equal(index,15,'fixture target is the final 90-minute substitution in the authentic parsed report')
 for(const capture of captures){
  const captured=edit(index,raw=>raw.replace('<div class="valign-inner">90&rsquo;</div>',capture.source.rawClockHtml),main)
  const variant=quick(captured,q=>{q['second-half'].events[index-q['first-half'].events.length].time=`90+${capture.added}`;return q})
  const result=parse(variant)
  const event=result.dogodki.find(item=>item.ordinal===index+1)
  assert.deepEqual([event.vrsta,event.osnovnaMinuta,event.dodatek,event.minuta],['menjava',capture.base,capture.added,90])
  assert.deepEqual(result.z.menjave.at(-1).minuta,90)
 }
})
test('nested added-time markup remains restricted to observed half-ending clocks',()=>{
 const index=rows(main).findIndex(({raw})=>raw.includes('class="icon-substitute"')&&raw.includes('<div class="valign-inner">90&rsquo;</div>'))
 const unsupportedClock=nestedAddedTime.observedCaptureClocks[0].source.rawClockHtml.replace(/\b90\b/,'44').replace('+1','+2')
 const captured=edit(index,raw=>raw.replace('<div class="valign-inner">90&rsquo;</div>',unsupportedClock),main)
 const variant=quick(captured,q=>{q['second-half'].events[index-q['first-half'].events.length].time='44+2';return q})
 reject(variant,lineup,options,/nepodprta minuta dogodka/)
})
test('captured Strafstoßtor marker sets penalty-goal evidence and the appearance statistic',()=>{
 const source=strafstosstor.source
 assert.equal(source.documentSha256,'20558646b70253f44bf7155bacd13dc76055d7f721a7fa476373046ed8138bb7')
 assert.equal(source.eventByteOffset,155808)
 assert.equal(source.eventInfoByteOffset,156437)
 assert.match(source.scoreEventMarkup,/<span class="event-info">Strafstoßtor<\/span>/)
 assert.equal(source.quickViewEvent,"{'time':'52','type':'goal','team':'away'}")
 const index=rows(main).findIndex(({raw})=>raw.includes('<div class="even">'))
 assert.ok(index>=0)
 const parsed=parse(eventInfo(index))
 const penalty=parsed.z.goli.find(goal=>goal.enajstmetrovka)
 assert.ok(penalty,'validated low-level goal retains the explicit penalty marker')
 assert.equal(penalty.avtogol,false)
 assert.ok(parsed.dogodki.some(event=>event.vrsta==='gol'&&event.enajstmetrovka))
 const appearance=parsed.nastopi.find(player=>player.virId===penalty.virId)
 assert.equal(appearance.goliIzEnajstmetrovke,1)
 assert.equal(parsed.z.rezultat.domaci+parsed.z.rezultat.gostje,5)
 const lowLevel=razberiZapisnik(eventInfo(index),lineup,{...options,fonts})
 assert.equal(lowLevel.goli.find(goal=>goal.enajstmetrovka)?.enajstmetrovka,true)
})
test('observed images.media profile photos are decorative while linked profile identity remains required',()=>{
 const observed=observedShapes.images
 assert.deepEqual(observed.map(x=>x.documentId),['031EQBPNE8000000VS5489BTVUS470OH','031EQBPNM4000000VS5489BTVUS470OH'])
 const index=rows(main).findIndex(({raw})=>raw.includes('<div class="even">'))
 assert.ok(index>=0)
 const baseline=parse()
 for(const source of observed){
  const html=edit(index,raw=>raw.replace(/data-responsive-image="[^"]+"/,`data-responsive-image="${source.url}"`))
  const parsed=parse(html)
  assert.equal(parsed.z.goli[0].virId,baseline.z.goli[0].virId,'scorer identity still comes from the linked profile ID')
  assert.equal(parsed.z.rezultat.domaci+parsed.z.rezultat.gostje,5)
 }
})
test('player photo URL support stays within the exact observed HTTPS userfiles family',()=>{
 const index=rows(main).findIndex(({raw})=>raw.includes('<div class="even">'))
 const captured=observedShapes.images[0].url
 const variants=[captured.replace('https://','http://'),captured.replace('images.media.fussball.de','images.media.fussball.de.evil'),captured.replace('_p3.jpg','_p2.jpg'),captured.replace('.de/','.de:443/')]
 for(const url of variants) reject(edit(index,raw=>raw.replace(/data-responsive-image="[^"]+"/,`data-responsive-image="${url}"`)))
})
function nestedAddedGoal(html=main,quickTime='90',rowIndex=rows(main).findLastIndex(({raw})=>raw.includes('<div class="even">'))){
 const firstHalfCount=JSON.parse(html.match(/data-match-events="([^"]+)"/)[1].replace(/'/g,'"'))['first-half'].events.length
 const setQuickTime=(q,index,value)=>{const half=index<firstHalfCount?'first-half':'second-half',local=index<firstHalfCount?index:index-firstHalfCount;q[half].events[local].time=value}
 for(let index=rowIndex;index<rows(html).length;index++){
  const added=4+index-rowIndex,rawClock=index===rowIndex?observedShapes.coarseClock.rawClockHtml:`<div class="valign-inner">90&rsquo; <div>+${added}</div></div>`
  html=edit(index,raw=>raw.replace(/<div class="valign-inner">[^<]+<\/div>/,rawClock),html)
  html=quick(html,q=>{setQuickTime(q,index,index===rowIndex?quickTime:`90+${added}`);return q})
 }
 return html
}
test('minute-only quick view corroborates an observed raw 90+N clock without losing added time',()=>{
 const fixture=observedShapes.coarseClock
 assert.equal(fixture.rawClockHtml,'<div class="valign-inner">90 &rsquo; <div>+4</div></div>')
 assert.equal(fixture.quickViewEvent,"{'time':'90','type':'goal','team':'home'}")
 const html=nestedAddedGoal(),index=rows(main).findLastIndex(({raw})=>raw.includes('<div class="even">'))
 const rawRow=rows(html)[index].raw,result=parse(html),event=result.dogodki.find(item=>item.ordinal===index+1)
 assert.equal(event.osnovnaMinuta,90)
 assert.equal(event.dodatek,4)
 assert.equal(event.minuta,90)
 assert.equal(event.eventSha256,sha(rawRow),'the exact source row including the added-time child remains fingerprinted')
})
test('coarse quick-view time cannot override conflicting explicit time or an earlier-period raw clock',()=>{
 reject(nestedAddedGoal(main,'90+3'))
 reject(nestedAddedGoal(main,'89'))
 const firstHalf=nestedAddedGoal(main,'90',0)
 reject(firstHalf)
})
function firstHalfAddedCard(quickTime='45'){
 const source=JSON.parse(read('de-fussball-first-half-added-time.json')).source
 return quick(edit(0,()=>source.rawEvent),q=>{q['first-half'].events[0]={time:quickTime,type:'yellow-card',team:'away'};return q})
}
test('authentic nested first-half added time retains period, addition and exact row fingerprint',()=>{
 const source=JSON.parse(read('de-fussball-first-half-added-time.json')).source
 assert.equal(sha(source.rawEvent),source.eventSha256)
 for(const quickTime of ['45','45+2']){
  const r=parse(firstHalfAddedCard(quickTime)),event=r.dogodki[0]
  assert.deepEqual([event.osnovnaMinuta,event.dodatek,event.minuta,event.polcas,event.ekipaIdx],[45,2,45,1,1])
  assert.equal(event.eventSha256,source.eventSha256)
  assert.equal(r.nepripisaniRumeni[0].dodatek,2)
 }
})
test('first-half nested added time cannot override conflicting quick time, wrong period or chronology',()=>{
 for(const time of ['44','45+1','45+3','46'])reject(firstHalfAddedCard(time))
 for(const raw of ['44','46','89','91'])reject(firstHalfAddedCard().replace(/45(\s+&rsquo;\s+<div>\+2)/,`${raw}$1`))
 for(const added of ['0','31'])reject(firstHalfAddedCard().replace('<div>+2</div>',`<div>+${added}</div>`))
 // A second first-half row at 45+1 after the observed 45+2 must not be sorted.
 const source=JSON.parse(read('de-fussball-first-half-added-time.json')).source
 let html=edit(0,row=>source.rawEvent+source.rawEvent.replace('+2','+1'))
 html=quick(html,q=>{q['first-half'].events=[{time:'45',type:'yellow-card',team:'away'},{time:'45+1',type:'yellow-card',team:'away'}];return q})
 reject(html,lineup,options,/zaporedje|neurejeni/)
 // Move a real substitution to the first half at the same nested45+2 clock.
 const sub=rows(main)[4].raw.replace(/<div class="valign-inner">[^<]+<\/div>/,source.rawClockHtml)
 let moved=edit(4,()=>'',main)
 moved=edit(0,()=>sub,moved)
 moved=quick(moved,q=>{q['second-half'].events.splice(3,1);q['first-half'].events[0]={time:'45',type:'substitute',team:'home'};return q})
 reject(moved,lineup,options,/polčasna menjava/)
})
test('low-level penalty evidence rejects comment and script decoys outside the live fourth score child',()=>{
 const index=rows(main).findIndex(({raw})=>raw.includes('<div class="even">'))
 const decoys=[
  '<!-- <span class="event-info">Strafstoßtor</span> -->',
  '<script>"<span class=\"event-info\">Strafstoßtor</span>"</script>',
 ]
 for(const decoy of decoys){
  const html=edit(index,raw=>{
   const score=elementRange(raw,'<div class="even">')
   return raw.slice(0,score.end-6)+decoy+'</div>'+raw.slice(score.end)
  })
  assert.throws(()=>razberiZapisnik(html,lineup,{...options,fonts}),undefined,decoy)
 }
})
test('unknown, duplicate, and own-goal penalty flags remain rejected',()=>{
 const index=rows(main).findIndex(({raw})=>raw.includes('<div class="even">'))
 reject(eventInfo(index,'Eigentor'))
 reject(eventInfo(index,'Strafstoßtor',eventInfo(index)))
 const side=rows(main)[index].raw.includes('event-left')?0:1
 const opposite=expected.find(([team,,from])=>team!==side&&from===0)[1]
 const [,namespace,profile]=opposite.match(/^de-fussball-(player-id|userid)-([A-Z0-9]{32})$/)
 const otherHref=`https://www.fussball.de/spielerprofil/-/${namespace}/${profile}`
 const ownGoal=edit(index,raw=>raw.replace(/href="https:\/\/www\.fussball\.de\/spielerprofil\/-\/(?:player-id|userid)\/[A-Z0-9]{32}"/,`href="${otherHref}"`),eventInfo(index))
 reject(ownGoal)
})
test('no wrapper network access is required',()=>{
 const saved=globalThis.fetch;globalThis.fetch=()=>{throw Error('network forbidden')}
 try{assert.equal(parse().nastopi.length,30)}finally{globalThis.fetch=saved}
})

for(const [name,fn] of [
 ['red',s=>s.replace('icon-card yellow-card','icon-card red-card').replace('Gelbe Karte','Rote Karte')],
 ['second yellow',s=>s.replace('icon-card yellow-card','icon-card yellow-red-card')],
 ['mixed yellow red',s=>s.replace('icon-card yellow-card','icon-card yellow-card red-card')],
 ['unknown card',s=>s.replace('icon-card yellow-card','icon-card blue-card')],
 ['duplicate card token',s=>s.replace('icon-card yellow-card','icon-card yellow-card yellow-card')],
 ['card label qualifier',s=>s.replace('Gelbe Karte','Gelbe Karte (Spieler)')],
 ['named card',s=>s.replace('Gelbe Karte','<a href="https://www.fussball.de/spielerprofil/-/player-id/00NKAU0I64000000VV0AG85VVUH1CIQU">Gelbe Karte</a>')],
 ['unknown card child',s=>s.replace('</i>','</i><span class="penalty">Foul</span>')],
])test(`unsupported discipline withholds all stats: ${name}`,()=>reject(edit(0,fn)))

for(const [name,i,fn] of [
 ['penalty qualifier',2,s=>s.replace('</a>','<span>(Elfmeter)</span></a>')],
 ['missed penalty icon',2,s=>s.replace('class="even"','class="even penalty-missed"')],
 ['unlabelled scoring icon',2,s=>s.replace('</a>','<i class="icon-penalty"></i></a>')],
 ['own-goal qualifier',2,s=>s.replace('</a>',' Eigentor</a>')],
 ['hidden scoring attribute',2,s=>s.replace('class="even"','class="even" data-penalty="true"')],
 ['unknown substitution label',4,s=>s.replace('Auswechslung','Halbzeitwechsel')],
 ['extra event column',2,s=>s.replace('</a>','</a><div class="column-event"></div>')],
 ['unbalanced event',2,s=>s.replace('</span>','</div>')],
])test(`unknown semantic structure is rejected: ${name}`,()=>reject(edit(i,fn)))

for(const [name,fn] of [
 ['missing first-half ending',s=>s.replace('class="row-time">45&#039;','class="row-time">44&#039;')],
 ['missing second-half ending',s=>s.replace('class="row-time">90&#039;','class="row-time">89&#039;')],
 ['missing Abpfiff',s=>s.replace('<h3>Abpfiff</h3>','<h3>Abbruch</h3>')],
 ['extra period',s=>s.replace('<div class="final">','<div class="extra-time"></div><div class="final">')],
 ['contradictory quick duration',s=>quick(s,q=>({...q,duration:120}))],
 ['extra quick period',s=>quick(s,q=>({...q,'extra-time':{start:90,end:120,events:[]}}))],
 ['quick penalty signal',s=>quick(s,q=>{q['second-half'].events[1].type='penalty';return q})],
 ['quick event omitted',s=>quick(s,q=>{q['second-half'].events.pop();return q})],
 ['duplicate duration field hiding extra time',s=>s.replace("'duration': 90","'duration': 120,'duration': 90")],
 ['duplicate event type hiding penalty',s=>s.replace("'type':'goal'","'type':'penalty','type':'goal'")],
 ['first-half period membership',s=>clock(0,'46',s)],
])test(`positive period proof required: ${name}`,()=>reject(fn(main)))

test('a scorer sharing an entry clock is rejected even when DOM order looks causal',()=>reject(clock(9,'67',clock(8,'67',clock(7,'67'))),lineup,options,/dvoumen čas strelca/))
test('ambiguous halftime 45 substitutions remain unsupported',()=>{
 for(const time of ['45']){
  // Move the actual first substitution ahead of second-half events, keeping summary aligned.
  const r=rows(main),sub=r[4].raw.replace('59&rsquo;',`${time}&rsquo;`)
  let html=main.slice(0,r[4].start)+main.slice(r[4].end)
  const target=rows(html)[1];html=html.slice(0,target.start)+sub+html.slice(target.start)
  html=quick(html,q=>{const [s]=q['second-half'].events.splice(3,1);s.time=time;q['second-half'].events.unshift(s);return q})
  reject(html,lineup,options,/polčas/)
 }
})
test('a substituted-out starter cannot re-enter later',()=>reject(edit(12,s=>s.replace('userid/02BTCK5F6S000000VUM1DNO8VSH2IDKP','userid/022IT6K700000000VS541L4HVVCT9H46')),lineup,options,/ponovni vstop/))
test('unmarked keeper replacement is rejected rather than inheriting the shirt number',()=>reject(edit(4,s=>s.replace('userid/022IT6K700000000VS541L4HVVCT9H46','player-id/00NKAU0I64000000VV0AG85VVUH1CIQU')),lineup,options,/vloge vratarja/))
test('an extra active keeper is rejected',()=>reject(edit(4,s=>s.replace('userid/025BQ1KJJO000000VS541L4HVS5D4572','userid/02A4OQIVJ8000000VUM1DNPQVSOM9I2G')),lineup,options,/vloge vratarja/))
test('an atomic pair with both explicitly marked keepers preserves their actual intervals',()=>{
 const html=edit(4,s=>s.replace('userid/025BQ1KJJO000000VS541L4HVS5D4572','userid/02A4OQIVJ8000000VUM1DNPQVSOM9I2G').replace('userid/022IT6K700000000VS541L4HVVCT9H46','player-id/00NKAU0I64000000VV0AG85VVUH1CIQU'))
 const a=parse(html).nastopi.filter(p=>p.vratar)
 assert.deepEqual(a.map(p=>[p.ime,p.minutaOd,p.minutaDo,p.minute,p.prejetiGoli]),[['Patrick Obsada',0,59,59,3],['Tim Franielczyk',59,90,31,3],['Simon Felix Knauf',0,90,90,2]])
})
test('same unqualified goal grammar preserves own-goal scorer identity and beneficiary',()=>{
 const r=parse(edit(2,s=>s.replace('player-id/00NKAUN7HO000000VV0AG85VVUH1CIQU','player-id/00NKAU0I64000000VV0AG85VVUH1CIQU')))
 const keeper=r.nastopi.find(p=>p.ime==='Patrick Obsada')
 assert.equal(keeper.goli,0);assert.equal(keeper.avtogoli,1);assert.equal(keeper.prejetiGoli,3)
 assert.equal(r.z.goli[0].ekipa,'SpVgg 03 Ilvesheim');assert.equal(r.z.goli[0].avtogol,true);assert.deepEqual(r.z.goli[0].rezultat,{domaci:0,gostje:1})
 assert.equal(r.nastopi.reduce((n,p)=>n+p.goli,0),4);assert.equal(r.nastopi.reduce((n,p)=>n+p.avtogoli,0),1)
})
// Composed reports below retain the supported Ilvesheim source scores/fonts.
// Only the class/marker grammar is observed; the scorer substitutions are synthetic.
function explicitOwnGoal(index,profile,html=main){
 return edit(index,row=>row.replace(/class="row-event event-(left|right)"/,'class="row-event event-$1 own-goal"').replace(/(spielerprofil\/-\/)(?:player-id|userid)\/[A-Z0-9]{32}/,`$1${profile}`),eventInfo(index,'Eigentor',html))
}
test('observed explicit own-goal grammar preserves scorer identity on both beneficiary sides',()=>{
 const source=JSON.parse(read('de-fussball-own-goal.json')).source
 assert.equal(sha(source.rawEvent),source.eventSha256)
 assert.match(source.rawEvent,/^<div class="row-event event-right own-goal">/)
 assert.match(source.rawEvent,/<span class="event-info">Eigentor<\/span>/)
 assert.match(source.rawEvent,/player-id\/00MC74URVG000000VV0AG85VVSMHI0R7/)
 for(const [index,profile,score,side] of [
  [2,'player-id/00NKAU0I64000000VV0AG85VVUH1CIQU',{domaci:0,gostje:1},0],
  [3,'player-id/0192B6VBGS000000VV0AG80NVSFDG9QH',{domaci:1,gostje:1},1],
 ]){
  const html=explicitOwnGoal(index,profile),r=parse(html)
  const goal=r.z.goli.find(g=>g.avtogol),scorer=r.nastopi.find(p=>p.virId===goal.virId)
  assert.equal(goal.virId,`de-fussball-${profile.replace('/','-')}`)
  assert.deepEqual(goal.rezultat,score);assert.equal(goal.enajstmetrovka,false)
  assert.equal(scorer.ekipaIdx,side);assert.equal(scorer.avtogoli,1);assert.equal(scorer.goli,0)
  assert.equal(r.nastopi.reduce((n,p)=>n+p.goli,0),4)
  assert.equal(r.nastopi.reduce((n,p)=>n+p.avtogoli,0),1)
  assert.equal(razberiZapisnik(html,lineup,options).goli.find(g=>g.avtogol)?.virId,goal.virId)
 }
})
test('retained authentic own-goal row composes with supported score bytes and roster identity',()=>{
 const source=JSON.parse(read('de-fussball-own-goal.json')).source
 // Keep the original DOM, time container, image and obfuscated name spans.
 // Rebind only score glyphs/font, active scorer and clock to the replay report.
 const score=elementRange(rows(main)[2].raw,'<div class="even">').raw.replace('</div>','<span class="event-info">Eigentor</span></div>')
 const originalScore=elementRange(source.rawEvent,'<div class="even">').raw
 const row=source.rawEvent.replace(originalScore,score).replace('47&rsquo;','56&rsquo;').replace('player-id/00MC74URVG000000VV0AG85VVSMHI0R7','player-id/00NKAU0I64000000VV0AG85VVUH1CIQU')
 const r=parse(edit(2,()=>row)),goal=r.z.goli[0]
 assert.equal(goal.avtogol,true);assert.equal(goal.enajstmetrovka,false)
 assert.deepEqual(goal.rezultat,{domaci:0,gostje:1})
 assert.equal(r.nastopi.find(p=>p.virId===goal.virId).avtogoli,1)
 assert.equal(r.dogodki.find(e=>e.ordinal===3).eventSha256,sha(row))
})
test('explicit own-goal requires paired marker/class, opposite roster side and active scorer',()=>{
 const html=explicitOwnGoal(2,'player-id/00NKAU0I64000000VV0AG85VVUH1CIQU')
 for(const bad of [
  html.replace(' own-goal',''),html.replace('<span class="event-info">Eigentor</span>',''),
  html.replace('Eigentor</span>','Strafstoßtor</span>'),html.replace('Eigentor</span>','Tor</span>'),
  html.replace(' own-goal',' own-goal unknown'),
  explicitOwnGoal(2,'player-id/00NKAUN7HO000000VV0AG85VVUH1CIQU'),
  explicitOwnGoal(2,'userid/025BQ1KJJO000000VS541L4HVS5D4572'),
  explicitOwnGoal(2,'player-id/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
  // The visual beneficiary still has to match the unchanged score progression.
  html.replace('event-right own-goal','event-left own-goal'),
  html.replace('<span class="event-info">Eigentor</span>','<span class="event-info">Eigentor</span><span class="event-info">Eigentor</span>'),
 ]){reject(bad);assert.throws(()=>razberiZapisnik(bad,lineup,options))}
 reject(edit(0,row=>row.replace('event-left','event-left own-goal')))
})
test('wrong side and unknown player identities cannot create appearances',()=>{
 reject(edit(4,s=>s.replace('event-left','event-right')))
 reject(edit(4,s=>s.replace('025BQ1KJJO000000VS541L4HVS5D4572','025BQ1KJJO000000VS541L4HVS5D457X')))
})
test('font bytes, canonical ID and lineup association remain mandatory',()=>{
 reject(main,lineup,{...options,id:'031EQBPLDS000000VS5489BTVUS470OH'})
 reject(main,lineup,{...options,lineupId:'031EQBPLDS000000VS5489BTVUS470OH'})
 reject(main,lineup,{...options,lineupId:undefined})
 reject(main,lineup,{...options,fonts:{...fonts,q73uvs1t:{...fonts.q73uvs1t,bytes:Buffer.from('wrong')}}})
 reject(main,lineup,{...options,fonts:{}})
 reject(main,lineup.replace('SpVgg 03 Ilvesheim','Different Club'))
 reject(main,lineup.slice(0,-100))
})
test('added time preserves raw ordering and normalized capped duration',()=>{
 const r=parse(clock(15,'90+3'))
 assert.equal(r.nastopi.find(p=>p.ime==='Jadis Jadon Nkolo Vata').minute,0)
 assert.deepEqual([r.dogodki.at(-1).osnovnaMinuta,r.dogodki.at(-1).dodatek,r.dogodki.at(-1).cas],[90,3,'90+3&rsquo;'])
})
test('result qualifiers cannot silently contradict the supported normal-time format',()=>{
 for(const label of ['<span class="extra-time">n.V.</span>',' (Elfmeterschießen)','<i class="icon-abandoned"></i>']){
  reject(main.replace('<span class="half-result">',`${label}<span class="half-result">`))
 }
})
test('published halftime result must agree with first-half goals',()=>reject(main.replace('class="half-result">[0 : 0]','class="half-result">[1 : 0]')))

test('commented and body canonical decoys cannot change exact-match proof URLs',()=>{
 const decoy='<link rel="canonical" href="https://www.fussball.de/spiel/-/spiel/031EQBPLDS000000VS5489BTVUS470OH">'
 const canonical=`https://www.fussball.de/spiel/spvgg-03-ilvesheim-sg-oftersheim/-/spiel/${id}`
 for(const html of [`<!-- ${decoy} -->${main}`,main.replace('</head>','</head>'+decoy)]){
  const r=parse(html);assert.equal(r.nastopi.length,30);assert.ok(r.dogodki.every(e=>e.virUrl===canonical&&e.zapisnikId===`de-fussball-${id}`));assert.deepEqual(r.dogodki,parse().dogodki)
 }
})
for(const [name,mutate] of [
 ['course',s=>wrapElement(s,'<div class="match-course">','<!--','-->')],
 ['verified result',s=>wrapElement(s,'<div class="result"><span class="end-result">','<!--','-->')],
 ['duration summary',s=>s.replace(/(<div data-match-events="[^"]*"[^>]*>)/,'<!--$1-->')],
 ['head canonical',s=>s.replace(/(<link rel="canonical"[^>]*>)/,'<!--$1-->')],
 ['head og identity',s=>s.replace(/(<meta property="og:url"[^>]*>)/,'<!--$1-->')],
])test(`required live evidence hidden in comments refuses statistics: ${name}`,()=>reject(mutate(main)))
for(const [name,before,after] of [
 ['script raw text','<script type="text/plain">','</script>'],
 ['template','<template>','</template>'],
 ['textarea raw text','<textarea>','</textarea>'],
 ['quoted attribute',"<div data-stale='","'></div>"],
 ['bogus HTML comment','<!stale ','>'],
 ['processing-instruction comment','<?stale ','>'],
 ['HTML CDATA bogus comment','<![CDATA[',']]>'],
 ['quoted doctype identifier',"<!DOCTYPE html PUBLIC 'discard > ","'>"],
])test(`inert or quoted course cannot become live event evidence: ${name}`,()=>reject(wrapElement(main,'<div class="match-course">',before,after)))
test('a duration summary embedded inside another attribute is not authoritative',()=>{
 const html=main.replace(/data-match-events="([^"]*)"/,(_,value)=>`data-stale='data-match-events="${value.replace(/'/g,'&#039;')}"'`)
 reject(html)
})
test('harmless semantic comments preserve exact original live event row hashes',()=>{
 const range=elementRange(main,'<div class="match-course">'),html=main.slice(0,range.end)+'<!-- stale <div class="match-course"></div> -->'+main.slice(range.end)
 const r=parse(html),original=parse()
 assert.deepEqual(r.nastopi,original.nastopi);assert.deepEqual(r.dogodki,original.dogodki)
})
for(const [name,mutate] of [
 ['whole lineup',s=>s.replace('<div class="match-lineup">','<!--<div class="match-lineup">').replace(/\s*<\/div>\s*$/,'-->\n</div>')],
 ['keeper marker',s=>s.replace(/(<span class="c">T<\/span>)/,'<!--$1-->')],
])test(`commented lineup evidence cannot supply appearances: ${name}`,()=>reject(main,mutate(lineup)))
for(const tag of ['template','script','textarea','style','title','xmp','iframe','noembed','noframes','noscript','plaintext','svg','math','select','object','custom-lineup']){
 for(const part of ['whole lineup','keeper marker'])test(`closed lineup grammar rejects ${tag} around ${part}`,()=>{
  const hidden=part==='whole lineup'?lineup.replace('<div class="match-lineup">',`<${tag}><div class="match-lineup">`).replace(/\s*<\/div>\s*$/,`</${tag}></div>`):lineup.replace('<span class="c">T</span>',`<${tag}><span class="c">T</span></${tag}>`)
  reject(main,hidden)
 })
}
for(const part of ['whole lineup','keeper marker'])test(`quoted attribute cannot supply ${part}`,()=>{
 const hidden=part==='whole lineup'?wrapElement(lineup,'<div class="match-lineup">',"<div data-stale='","'></div>"):lineup.replace('<span class="c">T</span>',`<img alt='<span class="c">T</span>'>`)
 reject(main,hidden)
})
for(const attr of ['hidden','inert','style="display:none"','data-role="stale"'])test(`closed lineup attributes reject unsupported context ${attr}`,()=>reject(main,lineup.replace('<div class="match-lineup">',`<div ${attr}><div class="match-lineup">`).replace(/\s*<\/div>\s*$/,'</div></div>')))
test('closed lineup grammar rejects nested anchors and malformed element boundaries',()=>{
 reject(main,lineup.replace('<span class="c">T</span>','<a><span class="c">T</span></a>'))
 reject(main,lineup.replace('<span class="c">T</span>','<h3><span class="c">T</span></h3>'))
 reject(main,lineup.replace('<span class="c">T</span>','<span class="c"><div>T</div></span>'))
})

function cli(html=main,l=lineup,m=manifest,args=[]){
 const dir=mkdtempSync(join(tmpdir(),'slff-fussball-stats-'))
 try{
  writeFileSync(join(dir,'main.html'),html);writeFileSync(join(dir,'lineup.html'),l)
  const fm={...m,fonts:Object.fromEntries(Object.entries(m.fonts).map(([key,f])=>[key,{...f,file:new URL(f.file,base).pathname}]))}
  writeFileSync(join(dir,'fonts.json'),JSON.stringify(fm))
  // Offline contract: a future accidental HTTP/socket call fails this real CLI.
  writeFileSync(join(dir,'deny-network.mjs'),`import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import {syncBuiltinESMExports} from 'node:module';const deny=()=>{throw Error('network forbidden in report CLI')};globalThis.fetch=deny;http.get=http.request=https.get=https.request=net.connect=net.createConnection=tls.connect=deny;syncBuiltinESMExports();`)
  return spawnSync(process.execPath,['--import',join(dir,'deny-network.mjs'),new URL('./preveri-fussball-statistiko.mjs',import.meta.url).pathname,...(args.length?args:[id,join(dir,'main.html'),join(dir,'lineup.html'),join(dir,'fonts.json')])],{encoding:'utf8'})
 }finally{rmSync(dir,{recursive:true,force:true})}
}
test('offline CLI exposes report-only success and all canonical appearances',()=>{
 const r=cli();assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout)
 assert.equal(out.reportStatistikaPripravljena,true);assert.equal(out.sezonskiUvozPodprt,false);assert.equal(out.activationEligible,false);assert.equal(out.nastopi.length,30);assert.equal(out.nepripisaniRumeni.length,3);assert.equal(out.z.nepopoln,true)
})
test('offline CLI prints zero appearances and explicit nonzero unsupported outcomes',()=>{
 for(const html of [edit(0,s=>s.replace('yellow-card','yellow-card red-card')),edit(2,s=>s.replace('</a>','<span>Elfmeter</span></a>')),main.replace('class="row-time">90&#039;','class="row-time">120&#039;')]){
  const r=cli(html);assert.notEqual(r.status,0);const out=JSON.parse(r.stdout)
  assert.equal(out.reportStatistikaPripravljena,false);assert.equal(out.sezonskiUvozPodprt,false);assert.equal(out.activationEligible,false);assert.deepEqual(out.nastopi,[]);assert.ok(out.razlog);assert.ok(out.koda)
 }
})
test('offline CLI refuses commented required course and head identity evidence',()=>{
 for(const html of [wrapElement(main,'<div class="match-course">','<!--','-->'),main.replace(/(<link rel="canonical"[^>]*>)/,'<!--$1-->')]){
  const r=cli(html);assert.notEqual(r.status,0);const out=JSON.parse(r.stdout)
  assert.equal(out.reportStatistikaPripravljena,false);assert.equal(out.sezonskiUvozPodprt,false);assert.equal(out.activationEligible,false);assert.deepEqual(out.nastopi,[]);assert.ok(out.razlog)
 }
})
test('offline CLI withholds inert or attribute-carried lineup proof',()=>{
 const hidden=[lineup.replace('<div class="match-lineup">','<template><div class="match-lineup">').replace(/\s*<\/div>\s*$/,'</template></div>'),lineup.replace('<span class="c">T</span>','<script><span class="c">T</span></script>'),lineup.replace('<span class="c">T</span>',`<img alt='<span class="c">T</span>'>`)]
 for(const l of hidden){const r=cli(main,l);assert.notEqual(r.status,0);const out=JSON.parse(r.stdout);assert.equal(out.reportStatistikaPripravljena,false);assert.equal(out.sezonskiUvozPodprt,false);assert.equal(out.activationEligible,false);assert.deepEqual(out.nastopi,[]);assert.ok(out.razlog)}
})
test('offline CLI rejects font corruption and malformed usage with the same false-ready envelope',()=>{
 const bad=structuredClone(manifest);bad.fonts.q73uvs1t.sha256='0'.repeat(64)
 for(const r of [cli(main,lineup,bad),cli(main,lineup,manifest,['invalid'])]){assert.notEqual(r.status,0);assert.equal(JSON.parse(r.stdout).reportStatistikaPripravljena,false);assert.deepEqual(JSON.parse(r.stdout).nastopi,[])}
})
test('offline CLI refuses missing or conflicting captured lineup provenance',()=>{
 const wrong=structuredClone(manifest);wrong.provenance.lineupUrl=wrong.provenance.lineupUrl.replace(id,'031EQBPLDS000000VS5489BTVUS470OH')
 const missing=structuredClone(manifest);delete missing.provenance.lineupUrl
 for(const m of [wrong,missing]){const r=cli(main,lineup,m);assert.notEqual(r.status,0);const out=JSON.parse(r.stdout);assert.deepEqual(out.nastopi,[]);assert.match(out.razlog,/Manifest/)}
})

function spanClubLineup(){return lineup.replace(/<div class="club-name">\s*<a\b[^>]*>([^<]+)<\/a>\s*<\/div>/g,'<div class="club-name"><span>$1</span></div>')}
test('authentic plain-span club headers preserve exactly two named sides and supported statistics',()=>{
 const sources=JSON.parse(read('de-fussball-club-name-span.json')).sources
 for(const source of sources){
  assert.equal(source.headers.length,2)
  for(const header of source.headers)assert.equal(sha(header.raw),header.sha256)
  // Actual header bytes, supported Ilvesheim roster/fonts and report frame.
  let index=0
  const players=spanClubLineup().replace(/<div class="club-name"><span>[^<]+<\/span><\/div>/g,()=>source.headers[index++].raw)
  const html=main.replaceAll('SpVgg 03 Ilvesheim',source.headers[0].name).replaceAll('SG Oftersheim',source.headers[1].name)
  const result=parse(html,players),raw=razberiZapisnik(html,players,options)
  assert.deepEqual([result.z.domaci.ime,result.z.gostje.ime],source.headers.map(h=>h.name))
  assert.deepEqual([raw.domaci.ime,raw.gostje.ime],source.headers.map(h=>h.name))
  assert.equal(result.nastopi.length,30);assert.equal(result.z.goli.length,5)
  assert.deepEqual(result.z.rezultat,{domaci:2,gostje:3})
 }
})
test('plain-span club names reject mixed, hidden, extra or contradictory header evidence',()=>{
 const source=spanClubLineup(),header='<div class="club-name"><span>SpVgg 03 Ilvesheim</span></div>'
 assert.notEqual(source,lineup)
 for(const replacement of [
  '<div class="club-name"><span>SpVgg 03 Ilvesheim</span><span>Extra</span></div>',
  '<div class="club-name"><span>SpVgg 03 Ilvesheim</span><a href="/">Extra</a></div>',
  '<div class="club-name"><a href="/"><span>SpVgg 03 Ilvesheim</span></a></div>',
  '<div class="club-name"><span class="hidden">SpVgg 03 Ilvesheim</span></div>',
  '<div class="club-name"><span hidden="hidden">SpVgg 03 Ilvesheim</span></div>',
  '<div class="club-name"><span style="display:none">SpVgg 03 Ilvesheim</span></div>',
  '<div class="club-name"><!-- <span>SpVgg 03 Ilvesheim</span> --></div>',
  '<div class="club-name"><span>Wrong Team</span></div>',
  '<div class="club-name"><span> </span></div>',
  '<div class="club-name">SpVgg 03 Ilvesheim</div>',
  header+'<div class="club-name"><span>Extra</span></div>',
  header+'<div class="club-name hidden"><span>Extra</span></div>',
 ]){const players=source.replace(header,replacement);reject(main,players);assert.throws(()=>razberiZapisnik(main,players,options))}
 // Complete apparent names inside comments/inert markup remain non-evidence.
 for(const wrap of [h=>`<!-- ${h} -->`,h=>`<template>${h}</template>`])reject(main,source.replace(header,wrap(header)))
 reject(main,source.replace(/<span>(SpVgg 03 Ilvesheim|SG Oftersheim)<\/span>/g,(_,name)=>`<span>${name==='SG Oftersheim'?'SpVgg 03 Ilvesheim':'SG Oftersheim'}</span>`))
})
