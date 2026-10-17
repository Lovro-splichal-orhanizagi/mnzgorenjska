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
test('halftime 45/46 substitutions are unsupported',()=>{
 for(const time of ['45','46']){
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
