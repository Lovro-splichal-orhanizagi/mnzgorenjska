import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {classifyRetainedFussballHistory,loadRetainedFussballHistory} from './fussball-retained-history.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'
import {assertHistoricalReportImportable} from './lib/historical-statistics-import.mjs'

// CI globs this file without the separately retained artifact. Only those
// genuine-evidence cases may skip; an explicitly configured bad path must fail.
const directory=process.env.FUSSBALL_RETAINED_HISTORY_DIR??process.argv[2]
let manifest,result,documents
const retainedTest=(name,fn)=>test(name,{skip:directory===undefined?'set FUSSBALL_RETAINED_HISTORY_DIR or pass the retained fussball-season-40577717778 directory':false},()=>{
 if(!documents){
  manifest=JSON.parse(readFileSync(join(directory,'manifest.json')))
  result=JSON.parse(readFileSync(join(directory,'result.json')))
  documents=new Map(manifest.documents.map(d=>[d.url,{...d,bytes:readFileSync(join(directory,d.file))}]))
 }
 return fn()
})
const input=()=>({fixture:structuredClone(result.rejectedReports[0].fixture),rejection:structuredClone(result.rejectedReports[0]),documents:new Map(documents),firstFantasyPlayedOnCandidate:'2026-10-30'})
const classify=change=>{const x=input();change?.(x);return classifyRetainedFussballHistory(x)}

retainedTest('nine actual retained failures yield only official headers and no individual rows/native authority',()=>{
 const packet=loadRetainedFussballHistory(directory,{firstFantasyPlayedOnCandidate:'2026-10-30'})
 assert.equal(packet.fixtures.length,9)
 assert.deepEqual(packet.fixtures.map(f=>[f.fixture.datum,f.fixture.krog,f.fixture.rezultat.domaci,f.fixture.rezultat.gostje]),[
 ['2026-08-15',1,1,1],['2026-08-23',2,1,3],['2026-08-30',3,0,2],['2026-09-06',4,2,2],['2026-09-12',5,2,3],['2026-09-20',6,2,4],['2026-10-10',9,1,1],['2026-10-10',9,6,0],['2026-10-18',10,1,4]])
 assert.equal(packet.activationEligible,false)
 assert.equal(packet.nativeBindingRequired,true)
 for(const f of packet.fixtures){
  assert.equal(f.statisticsStatus,'unavailable_historical')
  assert.equal(f.sourceCompetitionId,'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27')
  assert.equal(Object.hasOwn(f,'statisticsPolicyId'),false,'source descriptor is not installed policy authority')
  for(const key of ['starters','appearances','goals','nastopi','goli'])assert.equal(f[key],null)
  assert.equal(f.importedAt,null)
  assert.equal(f.nativeBindingRequired,true)
  assert.equal(f.activationEligible,false)
  assert.throws(()=>assertHistoricalReportImportable({competition:{source:'fussball-public'},report:f}),/cannot derive individual rows/)
 }
 assert.equal(result.rejectedReports.length,9)
 assert.throws(()=>buildFussballImportBatch(result,manifest.options),/rejected reports/)
})

for(const field of ['id','zapisnikId','url','krog','datum','ura','domaci','gostje','rezultat'])retainedTest(`changed fixture ${field} cannot borrow a reviewed failure`,()=>{
 assert.throws(()=>classify(x=>{x.fixture[field]=field==='rezultat'?{domaci:0,gostje:0}:field==='krog'?2:'changed'}),/fixture/)
})
retainedTest('different or missing strict defect remains a hold',()=>{
 for(const key of ['code','reason'])assert.throws(()=>classify(x=>{x.rejection[key]='different'}),/defect/)
 assert.throws(()=>classify(x=>{x.rejection.fixture.domaci='other'}),/fixture/)
})
for(const kind of ['report','lineup','css','font'])retainedTest(`changed or missing ${kind} bytes and receipt fail closed`,()=>{
 const url=[...documents].find(([,d])=>d.kind===kind&&(kind==='report'?d.url===result.rejectedReports[0].fixture.url:kind==='lineup'?d.url.includes(result.rejectedReports[0].fixture.id):true))?.[0]
 // Choose a document actually required by this report, independently read from descriptor.
 const descriptor=JSON.parse(readFileSync(new URL('./policies/fussball-baden-retained-history.json',import.meta.url)))
 const target=descriptor.entries[0].documents.find(d=>d.kind===kind).url
 assert.ok(url)
 assert.throws(()=>classify(x=>{const d=x.documents.get(target);x.documents.set(target,{...d,bytes:Buffer.concat([d.bytes,Buffer.from('changed')])})}),/document/)
 assert.throws(()=>classify(x=>x.documents.delete(target)),/document/)
 assert.throws(()=>classify(x=>{const d=structuredClone(x.documents.get(target));d.originalReceipt.attempt.httpStatus=403;x.documents.set(target,d)}),/document/)
})
retainedTest('replacing failure bytes with a genuinely complete report cannot borrow review authority',()=>{
 const complete=readFileSync(new URL('./vzorci/de-fussball-ilvesheim-main.html',import.meta.url))
 assert.throws(()=>classify(x=>{
  const url=x.fixture.url,d=structuredClone(x.documents.get(url))
  d.bytes=complete;d.sha256=createHash('sha256').update(complete).digest('hex')
  d.originalReceipt.document.sha256=d.sha256;d.originalReceipt.document.bytes=complete.length
  x.documents.set(url,d)
 }),/document/)
})
retainedTest('caller-provided statistics cannot decorate a reviewed rejection',()=>{
 assert.throws(()=>classify(x=>{x.rejection.nastopi=[{minutes:90}]}),/defect/)
})
retainedTest('unknown match and administrative result cannot become reviewed known-score history',()=>{
 assert.throws(()=>classify(x=>{x.fixture.id='02TNBSVDG0000000VS5489BUVSSD35NB'}),/fixture/)
 assert.throws(()=>classify(x=>{x.fixture.administrativeResult={marker:'V'};x.fixture.rezultat=null}),/fixture/)
})
retainedTest('candidate cutoff is required, valid and strictly after the reviewed fixture',()=>{
 for(const date of [undefined,null,'2026-02-30','2026-08-14','2026-08-15'])assert.throws(()=>classify(x=>{x.firstFantasyPlayedOnCandidate=date}),/cutoff/)
 assert.equal(classify(x=>{x.firstFantasyPlayedOnCandidate='2026-08-16'}).nativeBindingRequired,true)
 assert.throws(()=>loadRetainedFussballHistory(directory,{firstFantasyPlayedOnCandidate:'2026-10-18'}),/cutoff/)
})
retainedTest('changed retained manifest, result or request journal cannot be re-certified',()=>{
 const temp=mkdtempSync(join(tmpdir(),'fussball-history-'))
 try{
  for(const file of ['manifest.json','result.json','attempts.jsonl'])cpSync(join(directory,file),join(temp,file))
  for(const file of ['manifest.json','result.json','attempts.jsonl']){
   const original=readFileSync(join(temp,file));writeFileSync(join(temp,file),Buffer.concat([original,Buffer.from(' ')]))
   assert.throws(()=>loadRetainedFussballHistory(temp,{firstFantasyPlayedOnCandidate:'2026-10-30'}),/retained capture/)
   writeFileSync(join(temp,file),original)
  }
 }finally{rmSync(temp,{recursive:true,force:true})}
})

// Always run without external retained files: fabricated input must never issue
// even header-only source authority.
test('empty or unknown source input cannot issue historical header authority',()=>{
 for(const input of [undefined,{}, {fixture:{id:'unreviewed'},documents:new Map(),firstFantasyPlayedOnCandidate:'2026-10-30'}])
  assert.throws(()=>classifyRetainedFussballHistory(input),/unreviewed or changed fixture/)
})
test('a known header and claimed defect cannot replace genuine retained document bytes',()=>{
 const fixture={id:'031DS4G7UK000000VS5489BUVUR5FS5A',zapisnikId:'de-fussball-031DS4G7UK000000VS5489BUVUR5FS5A',url:'https://www.fussball.de/spiel/vfr-mannheim-2-djk-fc-ziegelhausen-peterstal/-/spiel/031DS4G7UK000000VS5489BUVUR5FS5A',krog:1,datum:'2026-08-15',ura:'12:00',domaci:'VfR Mannheim 2',gostje:'DJK/FC Ziegelhausen-Peterstal',rezultat:{domaci:1,gostje:1}}
 const rejection={fixture,code:'FUSSBALL_REPORT_INVALID',reason:'fussball statistika: fussball: igralec brez profilne povezave'}
 for(const documents of [new Map(),new Map([[fixture.url,{bytes:Buffer.alloc(0)}]]),new Map([[fixture.url,{bytes:Buffer.from('<html>claimed report</html>')} ]])])
  assert.throws(()=>classifyRetainedFussballHistory({fixture,rejection,documents,firstFantasyPlayedOnCandidate:'2026-10-30'}),/document/)
})
