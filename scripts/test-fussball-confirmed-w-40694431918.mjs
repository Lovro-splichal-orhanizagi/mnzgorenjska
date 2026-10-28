// Genuine retained raw round29/CSS/WOFF from failed V6 source. No source GET.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiKrog} from './viri/fussball.mjs'
import {validateFussballFixture,assembleFussballSchedule,collectFussballSeason} from './fussball-season.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'
const root=new URL('./vzorci/de-fussball-confirmed-w-40694431918/',import.meta.url),proof=JSON.parse(readFileSync(new URL('provenance.json',root))),read=d=>readFileSync(new URL(d.file.split('/').pop(),root)),html=read(proof.documents.find(d=>d.kind==='round')).toString(),fonts=Object.fromEntries(proof.documents.filter(d=>d.kind==='font').map(d=>[d.url.match(/\/id\/([^/]+)/)[1],{bytes:read(d),sha256:d.sha256}]))
const parse=(source=html,bindings=fonts)=>razberiKrog(source,{fonts:bindings,staffel:proof.staffel}),id='02TNBSVEEG000000VS5489BUVSSD35NB',legend='<div class="description">(W) Wertung Spielinstanz (bestätigt)</div>',special=html.match(/<span class="score-special">.*?<\/span><\/span>/)[0],cell=html.match(/<td class="column-score">\s*<a[^>]+><span class="score-special">.*?<\/td>/s)[0]
const administrativeResult={schemaVersion:1,kind:'confirmed-match-authority-decision',marker:'W',rawMarker:'w',displayedScores:[{domaci:3,gostje:0},{domaci:0,gostje:3}]}
test('genuine witnessed lowercase w preserves ordered3:0 w0:3, raw marker and unknown final result',()=>{
 for(const d of proof.documents){assert.equal(read(d).length,d.bytes);assert.equal(createHash('sha256').update(read(d)).digest('hex'),d.sha256)}
 const round=parse(),f=round.tekme.find(f=>f.id===id)
 assert.equal(round.krog,29);assert.deepEqual(f,{id,zapisnikId:'de-fussball-'+id,url:'https://www.fussball.de/spiel/tsg-1862-09-weinheim-gu-tuerk-sv-pforzheim/-/spiel/'+id,krog:29,datum:'2026-05-25',ura:'17:00',domaci:'TSG 1862/09 Weinheim',gostje:'GU-Türk. SV Pforzheim zg.',rezultat:null,administrativeResult})
 assert.equal(Object.hasOwn(f,'officialWinner'),false);assert.equal(Object.hasOwn(f,'nastopi'),false);assert.equal(Object.hasOwn(f,'goli'),false);assert.doesNotThrow(()=>validateFussballFixture(f,{round:29}))
})
test('W normalization records raw case without changing ordered pairs or final NULL',()=>{
 const f=parse(html.replace(special,special.replace('&nbsp;w&nbsp;','&nbsp;W&nbsp;'))).tekme.find(f=>f.id===id)
 assert.deepEqual(f.administrativeResult,{...administrativeResult,rawMarker:'W'});assert.equal(f.rezultat,null)
})
test('W requires one exact confirmed legend and rejects missing, unconfirmed, ambiguous and alternate containers',()=>{
 for(const replacement of ['',legend+legend,legend.replace('bestätigt','unbestätigt'),legend.replace('(W)','(w)'),legend.replace('Wertung Spielinstanz','Verwaltungsentscheid'),legend+legend.replace('bestätigt','unbestätigt'),legend+'<div class="description"><span>(W)</span> Wertung Spielinstanz (<b>unbestätigt</b>)</div>'])assert.throws(()=>parse(html.replace(legend,replacement)),undefined,replacement)
 for(const attrs of ["class='description'",'class = "description"','CLASS="description"','class="Description"','class=description','class="other" class="description"','class="description" class="other"'])assert.throws(()=>parse(html.replace(legend,legend+`<div ${attrs}>(W) Wertung Spielinstanz (unbestätigt)</div>`)))
})
test('W rejects foreign markers, extra/mixed/hidden scores, malformed closed shape and unbound fonts',()=>{
 const normal='<td class="column-score"><span data-obfuscation="yplak47e" class="score-left">&#xE69B;</span><span data-obfuscation="yplak47e" class="score-right">&#xE68E;</span></td>'
 for(const marker of ['T','X','z','ww',''])assert.throws(()=>parse(html.replace(special,special.replace('&nbsp;w&nbsp;',`&nbsp;${marker}&nbsp;`))))
 for(const replacement of [special+special,special.replace('score-special','score-special extra'),special.replace('<span>:</span>',''),special.replace('<span>:</span>','<span>:</span><span>:</span>'),special.replace('<span>:</span>','<span>;</span>'),special.replace('<span>&nbsp;w&nbsp;</span>','<span>&nbsp;w&nbsp;</span><span>&nbsp;w&nbsp;</span>'),special.replace('data-obfuscation="yplak47e"',''),special.replace('data-obfuscation="yplak47e"','data-obfuscation="unknown1"'),special.replace('&#xE69B;','abc'),special.replace('&#xE69B;','&#xE69B;&#xE69B;&#xE69B;'),special+normal])assert.throws(()=>parse(html.replace(special,replacement)),undefined,replacement)
 for(const replacement of [cell+normal,normal+cell,normal+special,cell+special,cell+normal.replace(/<\/?td[^>]*>/g,'')])assert.throws(()=>parse(html.replace(cell,replacement)))
 assert.throws(()=>parse(html,{}),/pisav/);assert.throws(()=>parse(html,{...fonts,yplak47e:{...fonts.yplak47e,bytes:Buffer.from('changed')}}),/hash/);assert.throws(()=>parse(html,{...fonts,yplak47e:{...fonts.yplak47e,sha256:'0'.repeat(64)}}),/hash/)
})
test('W requires unambiguous same-match canonical row links and rejects U course suffix or foreign hidden hrefs',()=>{
 const href=cell.match(/href="([^"]+)"/)[1],foreign=href.replace(id,'A'.repeat(32))
 for(const replacement of [href+'#!/section/course',href+'#other',href+'?x=1',href.replace('www.fussball.de','evil.test'),foreign])assert.throws(()=>parse(html.replace(cell,cell.replace(href,replacement))))
 for(const extra of [`<a href="${foreign}">hidden</a>`,`<a href='${href}'>unsupported syntax</a>`,`<a href=${foreign}>hidden</a>`,`<a href="${href}?x=1">hidden</a>`])assert.throws(()=>parse(html.replace(cell,cell+extra)))
})
test('W closed schedule union refuses schema drift, raw marker loss and ordinary-score downgrade',()=>{
 const f=parse().tekme.find(f=>f.id===id)
 for(const change of [x=>delete x.administrativeResult.rawMarker,x=>x.administrativeResult.rawMarker='x',x=>x.administrativeResult.marker='V',x=>x.administrativeResult.kind='confirmed-administrative-decision',x=>x.administrativeResult.extra=true,x=>x.administrativeResult.displayedScores[0].extra=true,x=>x.administrativeResult.displayedScores[0].domaci=100,x=>x.administrativeResult.displayedScores.pop(),x=>x.rezultat={domaci:3,gostje:0}]){const changed=structuredClone(f);change(changed);assert.throws(()=>validateFussballFixture(changed,{round:29}))}
 for(const cardPolicy of [undefined,'community-v1'])for(const rezultat of [null,{domaci:3,gostje:0}])assert.throws(()=>buildFussballImportBatch({version:1,activationEligible:false,scope:{provider:'fussball',staffel:proof.staffel,season:proof.season,asOfDate:'2026-10-28',seedUrl:`https://www.fussball.de/spieltag/-/staffel/${proof.staffel}`,...(cardPolicy?{cardPolicy}:{})},schedule:{staffel:proof.staffel,season:proof.season,rounds:[1],fixtures:[{...f,krog:1,rezultat}]},reports:[],rejectedReports:[],coverage:{},pendingReports:[],cardEnvelopes:[]},{staffel:proof.staffel,season:proof.season,cardPolicy}),/administrative result/)
})
test('all30 genuine retained V6 round pages replay and assemble offline with exactly V/U/W layouts',{skip:!process.env.SLFF_FUSSBALL_W_RETAINED_ARCHIVE},async()=>{
 const {join}=await import('node:path'),archive=process.env.SLFF_FUSSBALL_W_RETAINED_ARCHIVE,manifestBytes=readFileSync(join(archive,'manifest.json'));assert.equal(createHash('sha256').update(manifestBytes).digest('hex'),proof.archiveManifestSha256)
 const manifest=JSON.parse(manifestBytes),files=new Map(manifest.documents.map(d=>{const bytes=readFileSync(join(archive,d.file));assert.equal(bytes.length,d.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),d.sha256);return [d.file,bytes]})),allFonts=Object.fromEntries(manifest.documents.filter(d=>d.kind==='font').map(d=>[d.url.match(/\/id\/([^/]+)/)[1],{bytes:files.get(d.file),sha256:d.sha256}])),rounds=manifest.documents.filter(d=>d.kind==='round')
 assert.equal(rounds.length,30);assert.equal(manifest.success,false);assert.equal(manifest.snapshot.attempts.filter(a=>a.status==='success').length,114)
 const pages=rounds.map(d=>({url:d.url,parsed:razberiKrog(files.get(d.file).toString(),{fonts:allFonts,staffel:proof.staffel})}));assert.deepEqual(pages.map(p=>p.parsed.krog).sort((a,b)=>a-b),Array.from({length:30},(_,i)=>i+1))
 const full=assembleFussballSchedule(pages,{staffel:proof.staffel,season:proof.season}),admins=full.fixtures.filter(f=>Object.hasOwn(f,'administrativeResult'))
 assert.equal(admins.length,3);assert.deepEqual(admins.map(f=>f.administrativeResult.marker).sort(),['U','V','W']);assert.ok(admins.every(f=>f.rezultat===null&&!Object.hasOwn(f,'officialWinner')))
 assert.deepEqual(admins.find(f=>f.id===id).administrativeResult,administrativeResult)
 console.log(JSON.stringify({kind:'offline-retained-rounds-not-source-admission',rounds:pages.length,fixtures:full.fixtures.length,administrative:admins.map(f=>({id:f.id,round:f.krog,date:f.datum,home:f.domaci,away:f.gostje,result:f.rezultat,administrativeResult:f.administrativeResult}))}))
})

test('collector retains W as an administrative diagnostic with no report GET, individuals or ordinary unscored substitution',async()=>{
 const f={...parse().tekme.find(f=>f.id===id),krog:1},seedUrl=`https://www.fussball.de/spieltag/-/staffel/${proof.staffel}`,calls=[],parsed={sezona:proof.season,krog:1,krogi:[{krog:1,url:`https://www.fussball.de/spieltag/-/spieltag/1/staffel/${proof.staffel}`,izbran:true}],tekme:[f],prestavljene:[]}
 const result=await collectFussballSeason({seedUrl,staffel:proof.staffel,season:proof.season,client:{async read(url,kind){calls.push({url,kind});assert.equal(url,seedUrl);assert.equal(kind,'round');return {bytes:Buffer.from('TEST ONLY offline seed'),capturedAt:'2026-10-28T00:00:00Z'}}}},{inspectPage:()=>({url:seedUrl,fontIds:[],cssTemplate:'https://www.fussball.de/export.fontface/-/id/%ID%/type/css'}),parseRound:()=>parsed})
 assert.equal(calls.length,1);assert.equal(result.reports.length,0);assert.equal(result.coverage.playedFixtures,0);assert.equal(result.coverage.unscoredFixtures.total,0);assert.equal(result.coverage.administrativeFixtures,1);assert.equal(result.activationEligible,false);assert.deepEqual(result.administrativeFixtures,[{fixture:f,code:'FUSSBALL_ADMINISTRATIVE_RESULT_UNSUPPORTED',reason:'Administrative result retained without ordinary played statistics'}])
})
