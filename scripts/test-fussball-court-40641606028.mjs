import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiKrog} from './viri/fussball.mjs'
import {assembleFussballSchedule,collectFussballSeason} from './fussball-season.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'
const root=new URL('./vzorci/de-fussball-court-40641606028/',import.meta.url)
const proof=JSON.parse(readFileSync(new URL('provenance.json',root)))
const read=d=>readFileSync(new URL(d.file.split('/').pop(),root))
const rounds=proof.documents.filter(d=>d.kind==='round')
const html=read(rounds[1]).toString(),vHtml=read(rounds[0]).toString()
const fonts=Object.fromEntries(proof.documents.filter(d=>d.kind==='font').map(d=>[d.url.match(/\/id\/([^/]+)/)[1],{bytes:read(d),sha256:d.sha256}]))
const parse=(source=html,bindings=fonts)=>razberiKrog(source,{fonts:bindings,staffel:proof.staffel})
const id='02TNBSVIMS000000VS5489BUVSSD35NB',vId='02TNBSVDG0000000VS5489BUVSSD35NB'
const administrativeResult={schemaVersion:1,kind:'confirmed-sports-court-decision',marker:'U',displayedScores:[{domaci:4,gostje:1},{domaci:1,gostje:4}]}
const special=html.match(/<span class="score-special">.*?<\/span><\/span>/)[0]
const cell=html.match(/<td class="column-score">\s*<a[^>]+><span class="score-special">.*?<\/td>/s)[0]
const legend='<div class="description">(U) Sportgerichtsurteil (bestätigt)</div>'
const clone=x=>structuredClone(x)
const fixture=(extra={})=>({id,zapisnikId:`de-fussball-${id}`,url:`https://www.fussball.de/spiel/-/spiel/${id}`,krog:1,datum:'2026-03-31',ura:'19:00',domaci:'SpVgg. Neckarelz',gostje:'TSG 1862/09 Weinheim',rezultat:null,administrativeResult:clone(administrativeResult),...extra})
const roundUrl=n=>`https://www.fussball.de/spieltag/-/spieltag/${n}/staffel/${proof.staffel}`
const page=(n,tekme,prestavljene=[])=>({url:roundUrl(n),parsed:{sezona:proof.season,krog:n,krogi:[1,2].map(krog=>({krog,url:roundUrl(krog),izbran:krog===n})),tekme,prestavljene}})
const assemble=pages=>assembleFussballSchedule(pages,{season:proof.season,staffel:proof.staffel})

test('exact retained U capture preserves published court status and ordered candidates with no ordinary score',()=>{
 for(const d of proof.documents){assert.equal(read(d).length,d.bytes);assert.equal(createHash('sha256').update(read(d)).digest('hex'),d.sha256)}
 const r=parse(),f=r.tekme.find(f=>f.id===id)
 assert.equal(r.sezona,'2025/26');assert.equal(r.krog,21)
 assert.deepEqual(f,{id,zapisnikId:`de-fussball-${id}`,url:'https://www.fussball.de/spiel/spvgg-neckarelz-tsg-1862-09-weinheim/-/spiel/'+id,krog:21,datum:'2026-03-31',ura:'19:00',domaci:'SpVgg. Neckarelz',gostje:'TSG 1862/09 Weinheim',rezultat:null,administrativeResult})
 assert.ok(html.includes(legend));assert.equal(Object.hasOwn(f,'officialWinner'),false)
 // A canonical U href is also closed; no arbitrary fragment is admitted.
 assert.deepEqual(parse(html.replace('#!/section/course','')).tekme.find(f=>f.id===id),f)
})

test('exact retained V5 V control retains its existing schema, pair order and null score',()=>{
 const f=parse(vHtml).tekme.find(f=>f.id===vId)
 assert.deepEqual(f.administrativeResult,{schemaVersion:1,kind:'confirmed-administrative-decision',marker:'V',displayedScores:[{domaci:0,gostje:3},{domaci:3,gostje:0}]})
 assert.equal(f.rezultat,null)
 assert.throws(()=>parse(vHtml.replace(new RegExp(vId+'"><span class="score-special"'),vId+'#!/section/course"><span class="score-special"')))
})

test('U rejects unknown markers and missing, duplicate or wrong confirmed court legends despite generic V legend',()=>{
 for(const marker of ['V','W','T','X',''])assert.throws(()=>parse(html.replace(special,special.replace('&nbsp;U&nbsp;',`&nbsp;${marker}&nbsp;`))))
 for(const replacement of ['',legend+legend,legend.replace('bestätigt','unbestätigt'),legend.replace('Sportgerichtsurteil','Verwaltungsentscheid'),legend+legend.replace('bestätigt','unbestätigt')])assert.throws(()=>parse(html.replace(legend,replacement)))
})

test('U rejects extra, mixed, displaced, reordered or malformed score markup and font bindings',()=>{
 const normal='<td class="column-score"><span data-obfuscation="ycoz8iso" class="score-left">&#xE6B2;</span><span data-obfuscation="ycoz8iso" class="score-right">&#xE66F;</span></td>'
 const variants=[
  special+special,special.replace('score-special','score-special extra'),
  special.replace('<span>:</span>',''),special.replace('<span>:</span>','<span>:</span><span>:</span>'),
  special.replace('<span>:</span>','<span>;</span>'),special.replace('<span>&nbsp;U&nbsp;</span>',''),
  special.replace('<span>&nbsp;U&nbsp;</span>','<span>&nbsp;U&nbsp;</span><span>&nbsp;U&nbsp;</span>'),
  special.replace('<span>:</span><span data-obfuscation="ycoz8iso">&#xE66F;</span>','<span data-obfuscation="ycoz8iso">&#xE66F;</span><span>:</span>'),
  special.replace('data-obfuscation="ycoz8iso"',''),special.replace('data-obfuscation="ycoz8iso"','data-obfuscation="unknown1"'),
  special.replaceAll('ycoz8iso','uo318li5'),special.replace('&#xE6B2;','abc'),special.replace('&#xE6B2;','&#xE6B2;&#xE6B2;&#xE6B2;'),
  special+normal,
 ]
 for(const replacement of variants)assert.throws(()=>parse(html.replace(special,replacement)),undefined,replacement)
 for(const replacement of [cell+normal,normal+cell,normal+special,cell+special,cell+normal.replace(/<\/?td[^>]*>/g,'')])assert.throws(()=>parse(html.replace(cell,replacement)))
 assert.throws(()=>parse(html,{}),/pisav/)
 assert.throws(()=>parse(html,{...fonts,ycoz8iso:{...fonts.ycoz8iso,bytes:Buffer.from('changed')}}),/hash/)
 assert.throws(()=>parse(html,{...fonts,ycoz8iso:{...fonts.ycoz8iso,sha256:'0'.repeat(64)}}),/hash/)
 assert.throws(()=>parse(html.replace('</body>','')))
 assert.throws(()=>parse(html.replace('<title>','<title>Just a moment')))
 const ordinary=vHtml.match(/<td class="column-score">\s*<a[^>]+><span data-obfuscation[^>]+class="score-left">.*?<\/td>/s)?.[0]
 assert.ok(ordinary);assert.throws(()=>parse(vHtml.replace(ordinary,ordinary.replace('class="score-right"','class="broken"'))))
})

test('U hrefs reject arbitrary fragments, queries, external hosts and conflicting or hidden report IDs',()=>{
 const href=cell.match(/href="([^"]+)"/)[1],base=href.replace('#!/section/course','')
 for(const replacement of [base+'#other',base+'#!/section/other',base+'?x=1',base+'?x=1#!/section/course',href+'?x=1',href.replace('www.fussball.de','evil.test'),href.replace(id,vId)])assert.throws(()=>parse(html.replace(cell,cell.replace(href,replacement))),undefined,replacement)
 for(const extra of [`<a href="${base}?x=1">hidden</a>`,`<a href="${base.replace(id,vId)}?x=1">hidden</a>`,`<a href="${base}#!/arbitrary">hidden</a>`])assert.throws(()=>parse(html.replace(cell,cell+extra)))
})

test('schedule accepts closed U union and rejects contradictory kind, pair order, status or ordinary downgrade',()=>{
 const f=fixture(),b={...fixture({id:vId,zapisnikId:`de-fussball-${vId}`,url:`https://www.fussball.de/spiel/-/spiel/${vId}`,krog:2})};delete b.administrativeResult
 const pages=[page(1,[f]),page(2,[b],[{...clone(f),krog:null}])]
 assert.deepEqual(assemble(pages).fixtures[0].administrativeResult,administrativeResult)
 for(const mutate of [x=>{delete x.administrativeResult},x=>{x.administrativeResult.displayedScores.reverse()},x=>{x.administrativeResult.marker='V'},x=>{x.administrativeResult.kind='confirmed-administrative-decision'},x=>{x.administrativeResult.extra=true},x=>{x.administrativeResult.displayedScores[0].domaci=100},x=>{x.administrativeResult.displayedScores[0].extra=true},x=>{x.administrativeResult.displayedScores.pop()},x=>{x.rezultat={domaci:4,gostje:1}},x=>{x.administrativeResult={schemaVersion:1,kind:'confirmed-administrative-decision',marker:'V',displayedScores:clone(administrativeResult.displayedScores)}}]){
  const bad=clone(pages);mutate(bad[1].parsed.prestavljene[0]);assert.throws(()=>assemble(bad))
 }
})

test('native import refuses U null score and forged ordinary score in strict and community modes',()=>{
 for(const cardPolicy of [undefined,'community-v1'])for(const date of ['2026-03-31','2026-11-30'])for(const rezultat of [null,{domaci:4,gostje:1}]){
  const result={version:1,activationEligible:false,scope:{provider:'fussball',staffel:proof.staffel,season:proof.season,asOfDate:'2026-10-28',seedUrl:`https://www.fussball.de/spieltag/-/staffel/${proof.staffel}`,...(cardPolicy?{cardPolicy}:{})},schedule:{staffel:proof.staffel,season:proof.season,rounds:[1],fixtures:[fixture({datum:date,rezultat})]},reports:[],rejectedReports:[],coverage:{},pendingReports:[],cardEnvelopes:[]}
  assert.throws(()=>buildFussballImportBatch(result,{staffel:proof.staffel,season:proof.season,cardPolicy}),/administrative result/)
 }
})


test('collector keeps U diagnostic on HOLD and does not treat its null score as ordinary unscored coverage',async()=>{
 const admin={...parse().tekme.find(f=>f.id===id),krog:1}
 const seedUrl=`https://www.fussball.de/spieltag/-/staffel/${proof.staffel}`
 const calls=[],parsed={sezona:proof.season,krog:1,krogi:[{krog:1,url:roundUrl(1),izbran:true}],tekme:[admin],prestavljene:[]}
 const result=await collectFussballSeason({seedUrl,staffel:proof.staffel,season:proof.season,client:{async read(url,kind){calls.push({url,kind});assert.equal(url,seedUrl);assert.equal(kind,'round');return {bytes:Buffer.from('offline seed'),capturedAt:'2026-10-28T00:00:00Z'}}}},{inspectPage:()=>({url:seedUrl,fontIds:[],cssTemplate:'https://www.fussball.de/export.fontface/-/id/%ID%/type/css'}),parseRound:()=>parsed})
 assert.deepEqual(result.administrativeFixtures,[{fixture:admin,code:'FUSSBALL_ADMINISTRATIVE_RESULT_UNSUPPORTED',reason:'Administrative result retained without ordinary played statistics'}])
 assert.equal(result.activationEligible,false);assert.equal(result.coverage.administrativeFixtures,1)
 assert.equal(result.coverage.playedFixtures,0);assert.equal(result.coverage.unscoredFixtures.total,0)
 assert.equal(result.reports.length,0);assert.equal(calls.length,1)
})

test('U rejects an additional nested or malformed court description beside the exact confirmed legend',()=>{
 for(const extra of [
  '<div class="description">(U) Sportgerichtsurteil (<b>unbestätigt</b>)</div>',
  '<div class="description"><span>(U)</span> Sportgerichtsurteil (bestätigt)</div>',
  '<div class="description"><div>(U) Sportgerichtsurteil (bestätigt)</div></div>',
 ])assert.throws(()=>parse(html.replace(legend,legend+extra)))
})

test('U rejects conflicting row report anchors with unsupported href quoting',()=>{
 const base=cell.match(/href="([^"]+)"/)[1].replace('#!/section/course','')
 for(const extra of [
  `<a href='${base.replace(id,vId)}'>conflict</a>`,
  `<a href=${base.replace(id,vId)}>conflict</a>`,
  `<a href='${base}'>unsupported syntax</a>`,
 ])assert.throws(()=>parse(html.replace(cell,cell+extra)))
})

test('U rejects conflicting description containers with alternate class quoting, spacing or case',()=>{
 for(const attributes of ["class='description'",'class = "description"',"class = 'description'",'CLASS="description"','class="Description"','class=description','class = description','CLASS = DESCRIPTION','class=\n description','class="\n description\n"']){
  for(const body of ['(U) Sportgerichtsurteil (unbestätigt)','<span>(U)</span> Sportgerichtsurteil (<b>unbestätigt</b>)']){
   const extra=`<div ${attributes}>${body}</div>`
   assert.throws(()=>parse(html.replace(legend,legend+extra)),undefined,extra)
  }
 }
})

test('U rejects duplicate description class attributes instead of selecting one interpretation',()=>{
 for(const attributes of ['class="other" class="description"','class="description" class="other"',"class='description' class=\"other\"",'class="description" class=other','class=other class=description','class=description class=other','CLASS = other class = description']){
  const extra=`<div ${attributes}>(U) Sportgerichtsurteil (<b>unbestätigt</b>)</div>`
  assert.throws(()=>parse(html.replace(legend,legend+extra)),undefined,extra)
 }
})
