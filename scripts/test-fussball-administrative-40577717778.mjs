import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiKrog} from './viri/fussball.mjs'
import {assembleFussballSchedule,collectFussballSeason} from './fussball-season.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'
const root=new URL('./vzorci/de-fussball-administrative-40577717778/',import.meta.url)
const proof=JSON.parse(readFileSync(new URL('provenance.json',root)))
const read=d=>readFileSync(new URL(d.file.split('/').pop(),root))
const html=read(proof.documents.find(d=>d.kind==='round')).toString()
const fonts=Object.fromEntries(proof.documents.filter(d=>d.kind==='font').map(d=>[d.url.match(/\/id\/([^/]+)/)[1],{bytes:read(d),sha256:d.sha256}]))
const id='02TNBSVDG0000000VS5489BUVSSD35NB',ordinaryId='02TNBSVDM0000000VS5489BUVSSD35NB'
const administrativeResult={schemaVersion:1,kind:'confirmed-administrative-decision',marker:'V',displayedScores:[{domaci:0,gostje:3},{domaci:3,gostje:0}]}
const parse=(source=html,bindings=fonts)=>razberiKrog(source,{fonts:bindings,staffel:proof.staffel})
const special=html.match(/<span class="score-special">.*?<\/span><\/span>/)[0]
const clone=x=>structuredClone(x)
const roundUrl=n=>`https://www.fussball.de/spieltag/-/spieltag/${n}/staffel/${proof.staffel}`
const fixture=(extra={})=>({id,zapisnikId:`de-fussball-${id}`,url:`https://www.fussball.de/spiel/-/spiel/${id}`,krog:1,datum:'2026-05-30',ura:'15:00',domaci:'GU-Türk SV Pforzheim',gostje:'1.FC Bruchsal 1899',rezultat:null,administrativeResult:clone(administrativeResult),...extra})
const page=(n,tekme,prestavljene=[])=>({url:roundUrl(n),parsed:{sezona:proof.season,krog:n,krogi:[1,2].map(krog=>({krog,url:roundUrl(krog),izbran:krog===n})),tekme,prestavljene}})
const assemble=pages=>assembleFussballSchedule(pages,{season:proof.season,staffel:proof.staffel})

test('exact archived page preserves administrative pairs and all eight fixtures without guessing a played score',()=>{
 for(const d of proof.documents)assert.equal(createHash('sha256').update(read(d)).digest('hex'),d.sha256)
 const r=parse();assert.equal(r.sezona,'2025/26');assert.equal(r.krog,30);assert.equal(r.tekme.length,8)
 const f=r.tekme.find(f=>f.id===id)
 assert.deepEqual(f.administrativeResult,administrativeResult);assert.equal(f.rezultat,null)
 assert.equal(f.domaci,'GU-Türk. SV Pforzheim zg.');assert.equal(f.gostje,'1.FC Bruchsal 1899')
 assert.deepEqual(r.tekme.find(f=>f.id===ordinaryId).rezultat,{domaci:5,gostje:1})
 assert.equal(r.tekme.filter(f=>Object.hasOwn(f,'administrativeResult')).length,1)
})

test('special score cannot downgrade through altered marker, structure, mixed normal score or unbound fonts',()=>{
 const variants=[
  special.replace('&nbsp;V&nbsp;','&nbsp;X&nbsp;'),special.replace('<span>&nbsp;V&nbsp;</span>',''),
  special.replace('<span>:</span>',''),special.replace('<span>:</span>','<span>:</span><span>:</span>'),
  special.replace('<span>&nbsp;V&nbsp;</span>','<span>&nbsp;V&nbsp;</span><span>&nbsp;V&nbsp;</span>'),
  special.replace('class="score-special"','class="score-special extra"'),
  special.replace('data-obfuscation="4m27drse"','data-obfuscation="unknown1"'),
  special.replace('data-obfuscation="4m27drse"',''),
  special+'<span data-obfuscation="4m27drse" class="score-left">&#xE651;</span><span data-obfuscation="4m27drse" class="score-right">&#xE6A7;</span>',
  special+special,
 ]
 for(const replacement of variants)assert.throws(()=>parse(html.replace(special,replacement)),undefined,replacement)
 assert.throws(()=>parse(html.replace('(V) Verwaltungsentscheid (bestätigt)','(V) unknown decision')))
 assert.throws(()=>parse(html.replace(special,special.replace('&nbsp;V&nbsp;','&nbsp;W&nbsp;')).replace('(W) Wertung Spielinstanz (bestätigt)','(W) unknown decision')))
 const broken={...fonts,'4m27drse':{...fonts['4m27drse'],bytes:Buffer.from('changed')}}
 assert.throws(()=>parse(html,broken),/hash|pisav/)
})

test('a second score cell or displaced special score cannot hide administrative evidence behind an ordinary result',()=>{
 const cell=html.match(/<td class="column-score">\s*<a[^>]+><span class="score-special">.*?<\/td>/s)[0]
 const normal='<td class="column-score"><span data-obfuscation="4m27drse" class="score-left">&#xE651;</span><span data-obfuscation="4m27drse" class="score-right">&#xE6A7;</span></td>'
 for(const replacement of [cell+normal,normal+cell,normal+special])assert.throws(()=>parse(html.replace(cell,replacement)))
 assert.throws(()=>parse(html.replace(special,special.replaceAll('4m27drse','t3c825iw'))))
})

test('schedule validates closed administrative data and rejects downgrade or reordered duplicate references',()=>{
 const f=fixture(),b=fixture({id:ordinaryId,zapisnikId:`de-fussball-${ordinaryId}`,url:`https://www.fussball.de/spiel/-/spiel/${ordinaryId}`,krog:2})
 delete b.administrativeResult
 const pages=[page(1,[f]),page(2,[b],[{...clone(f),krog:null}])]
 assert.deepEqual(assemble(pages).fixtures[0].administrativeResult,administrativeResult)
 const mutations=[
  x=>{delete x.administrativeResult},x=>{x.administrativeResult.displayedScores.reverse()},
  x=>{x.administrativeResult.marker='W'},x=>{x.administrativeResult.extra=true},
  x=>{x.administrativeResult.displayedScores[0].extra=true},x=>{x.administrativeResult.displayedScores[0].domaci=-1},
  x=>{x.administrativeResult.displayedScores.pop()},x=>{x.rezultat={domaci:0,gostje:3}},
 ]
 for(const change of mutations){const altered=clone(pages);change(altered[1].parsed.prestavljene[0]);assert.throws(()=>assemble(altered))}
 const duplicate=clone(pages);duplicate[1].parsed.prestavljene.push({...clone(f),krog:null});duplicate[1].parsed.prestavljene[1].administrativeResult.displayedScores.reverse();assert.throws(()=>assemble(duplicate),/conflict/)
 for(const data of [null,undefined,{}, {...clone(administrativeResult),schemaVersion:2}])assert.throws(()=>assemble([page(1,[fixture({administrativeResult:data})]),page(2,[b])]),/administrative/)
})

test('collector continues ordinary reports and separately retains administrative diagnostics outside unscored coverage',async()=>{
 const admin=fixture(),normal=fixture({id:ordinaryId,zapisnikId:`de-fussball-${ordinaryId}`,url:`https://www.fussball.de/spiel/-/spiel/${ordinaryId}`,rezultat:{domaci:2,gostje:1}});delete normal.administrativeResult
 const future=fixture({id:'02TNBSVDI0000000VS5489BUVSSD35NB',zapisnikId:'de-fussball-02TNBSVDI0000000VS5489BUVSSD35NB',url:'https://www.fussball.de/spiel/-/spiel/02TNBSVDI0000000VS5489BUVSSD35NB',datum:'2026-11-30'});delete future.administrativeResult
 const seedUrl=`https://www.fussball.de/spieltag/-/staffel/${proof.staffel}`,lineup=`https://www.fussball.de/ajax.match.lineup/-/mode/PAGE/spiel/${ordinaryId}`
 const calls=[],parsed={sezona:proof.season,krog:1,krogi:[{krog:1,url:roundUrl(1),izbran:true}],tekme:[admin,normal,future],prestavljene:[]}
 const client={async read(url,kind){calls.push({url,kind});assert.ok([seedUrl,normal.url,lineup].includes(url),'no administrative report fetch');return {bytes:Buffer.from(url),capturedAt:'2026-10-27T00:00:00Z'}}}
 const result=await collectFussballSeason({seedUrl,staffel:proof.staffel,season:proof.season,client},{
  inspectPage:(source,{kind})=>({url:source,fontIds:[],cssTemplate:'https://www.fussball.de/export.fontface/-/id/%ID%/type/css',...(kind==='report'?{lineupUrl:lineup}:{})}),
  parseRound:()=>parsed,inspectLineup:()=>[],parseFantasyReport:()=>({reportStatistikaPripravljena:true,sezonskiUvozPodprt:false,activationEligible:false,z:{zapisnikId:normal.zapisnikId,datum:normal.datum,ura:normal.ura,krog:normal.krog,domaci:{ime:normal.domaci},gostje:{ime:normal.gostje},rezultat:normal.rezultat,nepopoln:true},nastopi:[],nepripisaniRumeni:[]}),
 })
 assert.equal(result.schedule.fixtures.length,3);assert.equal(result.coverage.playedFixtures,1);assert.equal(result.coverage.completeReports,1)
 assert.equal(result.coverage.administrativeFixtures,1)
 assert.deepEqual(result.administrativeFixtures,[{fixture:admin,code:'FUSSBALL_ADMINISTRATIVE_RESULT_UNSUPPORTED',reason:'Administrative result retained without ordinary played statistics'}])
 assert.deepEqual(result.coverage.unscoredFixtures,{total:1,past:0,current:0,future:1,unknownDate:0})
 assert.equal(result.activationEligible,false);assert.equal(result.reports[0].fixture.id,ordinaryId)
 assert.equal(calls.filter(c=>c.kind==='report').length,1)
})

function importCapture(field,date='2026-11-30'){
 return {version:1,activationEligible:false,scope:{provider:'fussball',staffel:proof.staffel,season:proof.season,asOfDate:'2026-10-27',seedUrl:`https://www.fussball.de/spieltag/-/staffel/${proof.staffel}`},schedule:{staffel:proof.staffel,season:proof.season,rounds:[1],fixtures:[fixture({datum:date,administrativeResult:field})]},reports:[],rejectedReports:[],coverage:{}}
}
test('native importer explicitly refuses any administrative field even future null or forged ordinary/pending data',()=>{
 for(const value of [administrativeResult,null,undefined,{}])for(const date of ['2026-05-30','2026-11-30']){
  const r=importCapture(value,date)
  assert.throws(()=>buildFussballImportBatch(r,{staffel:proof.staffel,season:proof.season}),/administrative result/i)
  r.schedule.fixtures[0].rezultat={domaci:0,gostje:3};assert.throws(()=>buildFussballImportBatch(r,{staffel:proof.staffel,season:proof.season}),/administrative result/i)
  r.scope.cardPolicy='community-v1';r.pendingReports=[];r.cardEnvelopes=[]
  assert.throws(()=>buildFussballImportBatch(r,{staffel:proof.staffel,season:proof.season,cardPolicy:'community-v1'}),/administrative result/i)
 }
})
