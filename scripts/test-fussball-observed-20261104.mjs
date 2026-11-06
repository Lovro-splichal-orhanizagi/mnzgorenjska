// Genuine retained round pages from two failed 2026-11-04 captures. No source GET.
// 41804947752: Oberliga Schleswig-Holstein V row whose report link carries the
// course suffix (U row of the same shape on round 4 as control).
// 41805924672: Kreisliga Mannheim bye row with one article icon link.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiKrog} from './viri/fussball.mjs'
import {validateFussballFixture} from './fussball-season.mjs'
const load=name=>{
 const root=new URL(`./vzorci/${name}/`,import.meta.url),proof=JSON.parse(readFileSync(new URL('provenance.json',root)))
 const read=d=>readFileSync(new URL(d.file.split('/').pop(),root))
 for(const d of proof.documents){assert.equal(read(d).length,d.bytes);assert.equal(createHash('sha256').update(read(d)).digest('hex'),d.sha256)}
 const fonts=Object.fromEntries(proof.documents.filter(d=>d.kind==='font').map(d=>[d.url.match(/\/id\/([^/]+)/)[1],{bytes:read(d),sha256:d.sha256}]))
 const pages=proof.documents.filter(d=>d.kind==='round').map(d=>read(d).toString())
 return {proof,fonts,pages,parse:(html,bindings=fonts)=>razberiKrog(html,{fonts:bindings,staffel:proof.staffel})}
}

const sh=load('de-fussball-administrative-41804947752')
const [uHtml,vHtml]=sh.pages
const vId='031BT5ALOO000000VS5489BTVUS470OH',uId='031BT5ANOK000000VS5489BTVUS470OH'
const vResult={schemaVersion:1,kind:'confirmed-administrative-decision',marker:'V',displayedScores:[{domaci:5,gostje:0},{domaci:0,gostje:5}]}
const vCell=vHtml.match(/<td class="column-score">\s*<a[^>]+><span class="score-special">.*?<\/td>/s)[0]
const vLegend='<div class="description">(V) Verwaltungsentscheid (bestätigt)</div>'

test('genuine course-suffixed V row keeps ordered displayed pairs and no ordinary score',()=>{
 assert.equal(sh.proof.captureError,'fussball: nepodprt ali dvoumen administrativni izid')
 assert.ok(vCell.includes(`${vId}#!/section/course"`))
 const r=sh.parse(vHtml),f=r.tekme.find(f=>f.id===vId)
 assert.equal(r.sezona,'2026/27');assert.equal(r.krog,10);assert.equal(r.tekme.length,8)
 assert.deepEqual(f,{id:vId,zapisnikId:`de-fussball-${vId}`,url:`https://www.fussball.de/spiel/fc-kilia-kiel-1fc-phoenix-luebeck-ii/-/spiel/${vId}`,krog:10,datum:f.datum,ura:f.ura,domaci:'FC Kilia Kiel',gostje:'1.FC Phönix Lübeck II',rezultat:null,administrativeResult:vResult})
 assert.equal(r.tekme.filter(f=>Object.hasOwn(f,'administrativeResult')).length,1)
 assert.doesNotThrow(()=>validateFussballFixture(f,{round:10}))
 // The canonical href without the suffix stays accepted with the same result.
 assert.deepEqual(sh.parse(vHtml.replace(`${vId}#!/section/course"`,`${vId}"`)).tekme.find(f=>f.id===vId),f)
})

test('same-capture U control still reads as a court decision',()=>{
 const f=sh.parse(uHtml).tekme.find(f=>f.id===uId)
 assert.deepEqual(f.administrativeResult,{schemaVersion:1,kind:'confirmed-sports-court-decision',marker:'U',displayedScores:[{domaci:5,gostje:0},{domaci:0,gostje:5}]})
 assert.equal(f.rezultat,null)
})

test('V suffix admits only the exact witnessed fragment on its own report ID',()=>{
 const href=vCell.match(/href="([^"]+)"/)[1],base=href.replace('#!/section/course','')
 for(const replacement of [base+'#other',base+'#!/section/other',base+'#!/section/course#!/section/course',base+'?x=1',base+'?x=1#!/section/course',href+'?x=1',href.replace('www.fussball.de','evil.test'),href.replace(vId,uId),href.replace(vId,'A'.repeat(32))])
  assert.throws(()=>sh.parse(vHtml.replace(vCell,vCell.replace(href,replacement))),undefined,replacement)
 for(const extra of [`<a href="${base}?x=1">hidden</a>`,`<a href="${href.replace(vId,uId)}">hidden</a>`,`<a href="${base}#!/arbitrary">hidden</a>`,`<a href='${href}'>unsupported syntax</a>`])
  assert.throws(()=>sh.parse(vHtml.replace(vCell,vCell+extra)),undefined,extra)
})

test('V suffix keeps the legend, marker and score-structure guards',()=>{
 for(const replacement of ['',vLegend+vLegend,vLegend.replace('bestätigt','unbestätigt')])assert.throws(()=>sh.parse(vHtml.replace(vLegend,replacement)),undefined,replacement)
 const special=vCell.match(/<span class="score-special">.*?<\/span><\/span>/)[0]
 for(const replacement of [special+special,special.replace('&nbsp;V&nbsp;','&nbsp;X&nbsp;'),special.replace('<span>:</span>',''),special.replace('score-special','score-special extra'),special.replace('data-obfuscation="jboeuxuo"','data-obfuscation="unknown1"')])
  assert.throws(()=>sh.parse(vHtml.replace(special,replacement)),undefined,replacement)
 assert.throws(()=>sh.parse(vHtml,{}),/pisav/)
})

test('W stays closed: the course suffix is not admitted for a W marker',()=>{
 const wLegend='<div class="description">(W) Wertung Spielinstanz (bestätigt)</div>'
 assert.ok(vHtml.includes(wLegend))
 for(const marker of ['W','w'])assert.throws(()=>sh.parse(vHtml.replace(vCell,vCell.replace('&nbsp;V&nbsp;',`&nbsp;${marker}&nbsp;`))),/administrativ/)
})

const ma=load('de-fussball-bye-media-41805924672')
const [maHtml]=ma.pages
const byeRow=[...maHtml.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(m=>m[0]).find(row=>row.includes('>spielfrei</span>'))
const byeId='031EQBPKEC000000VS5489BTVUS470OH'
const media=byeRow.match(/<td class="column-detail fixture-media-info">\s*<a href[\s\S]*?<\/td>/)[0]
const replaceRow=(from,to)=>{const row=byeRow.replace(from,()=>to);assert.notEqual(row,byeRow,'fixture mutation must change input');return maHtml.replace(byeRow,()=>row)}

test('genuine bye with one article icon link stays a bye and keeps all real fixtures',()=>{
 assert.equal(ma.proof.captureError,'fussball: neveljavna tekma kroga')
 assert.ok(media.includes(`/spiel/sc-olympia-neulussheim/-/spiel/${byeId}"`)&&media.includes('icon-article fixture-info'))
 // The bye date label is the empty obfuscated span (admitted as before).
 assert.match(byeRow,/<td class="column-date"><span data-obfuscation="xte27ssa"><\/span><\/td>/)
 const r=ma.parse(maHtml)
 assert.equal(r.sezona,'2026/27');assert.equal(r.krog,11);assert.equal(r.tekme.length,7)
 assert.ok(![...r.tekme,...r.prestavljene].some(f=>f.id===byeId||f.domaci==='SC Olympia Neulußheim'||f.gostje==='SC Olympia Neulußheim'))
 // Without the media cell the row is the already supported bye shape.
 assert.deepEqual(ma.parse(replaceRow(media,'')),r)
})

test('bye article link cannot conceal a report, result, second club, other slug or extra link',()=>{
 const href=media.match(/href="([^"]+)"/)[1]
 const variants=[
  [media,media+media],
  [media,media.replace('icon-article fixture-info','icon-video fixture-info')],
  [media,media.replace('icon-article fixture-info','icon-article')],
  [media,media.replace('<span class="icon-article fixture-info"></span>','Zum Spiel')],
  [media,media.replace('fixture-media-info','fixture-media-info extra')],
  [href,href.replace('sc-olympia-neulussheim/','sv-other-club/')],
  [href,href.replace('sc-olympia-neulussheim/','')],
  [href,href.replace('sc-olympia-neulussheim/','sc-olympia-neulussheim-sv-other-club/')],
  [href,href+'#!/section/course'],
  [href,href+'?x=1'],
  [href,href.replace('www.fussball.de','evil.test')],
  ['<td class="column-detail"></td>',`<td class="column-detail"><a href="${href}">Zum Spiel</a></td>`],
  ['<td class="column-score"></td>',`<td class="column-score"><a href="${href}">2:3</a></td>`],
  ['<td class="column-score"></td>','<td class="column-score">2:3</td>'],
  ['<span class="info-text">spielfrei</span>','<div class="club-name">Other club</div><span class="info-text">spielfrei</span>'],
  ['>spielfrei</span>','>unbekannt</span>'],
  ['<span class="info-text">spielfrei</span>','<!-- <span class="info-text">spielfrei</span> -->'],
  ['<td class="column-date"><span data-obfuscation="xte27ssa"></span></td>','<td class="column-date">Mo, 29.03.27 | 15:00</td>'],
 ]
 for(const [from,to] of variants)assert.throws(()=>ma.parse(replaceRow(from,to)),/tekma kroga|spielfrei|krog/,to)
})
