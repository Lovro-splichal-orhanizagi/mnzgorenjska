import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {collectFussballSeason} from './fussball-season.mjs'
import {razberiKrog} from './viri/fussball.mjs'
import {inspectFussballPage,fussballFontUrl} from './viri/fussball-discovery.mjs'

const api=await import('./fussball-capture-evidence.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error})
const seedUrl='https://www.fussball.de/spieltag/-/staffel/031EKNM2HG00000LVS5489BUVUR5FS5A-G'
const options={seedUrl,staffel:'031EKNM2HG00000LVS5489BUVUR5FS5A-G',season:'2026/27',maxRequests:2,reportLimit:0}
const fixture=Buffer.from('<html><head></head><body>retained source bytes</body></html>')
const collector=async({client,...input})=>{
 const doc=await client.read(input.seedUrl,'round')
 assert.deepEqual(Buffer.from(doc.bytes),fixture)
 return {version:1,scope:{provider:'fussball',seedUrl:input.seedUrl,staffel:input.staffel,season:input.season},coverage:{sampled:true},activationEligible:false}
}
async function sample(run){
 assert.equal(typeof api.captureFussballDirectory,'function')
 const parent=mkdtempSync(join(tmpdir(),'slff-fussball-evidence-')),directory=join(parent,'capture')
 try{return await run({parent,directory})}finally{rmSync(parent,{recursive:true,force:true})}
}
const network=async()=>new Response(fixture,{headers:{'content-type':'text/html; charset=UTF-8'}})

test('capture retains exact content-addressed bytes and can replay without network',async()=>sample(async({directory})=>{
 const manifest=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 assert.equal(manifest.success,true);assert.equal(manifest.snapshot.requests,1);assert.equal(manifest.documents.length,1)
 assert.deepEqual(readFileSync(join(directory,manifest.documents[0].file)),fixture)
 const replay=await api.verifyFussballDirectory(directory,{collectFn:collector})
 assert.equal(replay.verified,true);assert.equal(replay.activationEligible,false)
 assert.equal(readFileSync(join(directory,'attempts.jsonl'),'utf8').trim().split('\n').length,1)
 assert.match(manifest.options.asOfDate,/^20\d{2}-\d{2}-\d{2}$/)
}))
test('a source failure preserves partial journal and original documents with false success',async()=>sample(async({directory})=>{
 await assert.rejects(()=>api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:async args=>{await collector(args);throw Error('source traversal stopped')}}),/source traversal stopped/)
 const m=JSON.parse(readFileSync(join(directory,'manifest.json')))
 assert.equal(m.success,false);assert.equal(m.documents.length,1);assert.equal(m.resultSha256,null)
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/incomplete|failed/)
}))
test('capture refuses an existing output directory before any source request',async()=>sample(async({directory})=>{
 await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 let requests=0
 await assert.rejects(()=>api.captureFussballDirectory({directory,options,fetchFn:()=>{requests++;throw Error('must not request')},collectFn:collector}),/exist|fresh/)
 assert.equal(requests,0)
}))
test('offline verification rejects changed raw bytes before replay',async()=>sample(async({directory})=>{
 const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 writeFileSync(join(directory,m.documents[0].file),'changed')
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:()=>assert.fail('no replay')}),/hash|bytes|digest/)
}))
test('offline verification rejects unsafe paths and symlinked source documents',async()=>sample(async({directory,parent})=>{
 const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 const path=join(directory,m.documents[0].file);rmSync(path);writeFileSync(join(parent,'foreign'),fixture);symlinkSync(join(parent,'foreign'),path)
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/regular|symbolic|symlink/)
 rmSync(path);writeFileSync(path,fixture);m.documents[0].file='../foreign';writeFileSync(join(directory,'manifest.json'),JSON.stringify(m))
 await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/path|document/)
}))
test('offline verification rejects altered result, code fingerprint, request accounting and source status',async()=>sample(async({directory})=>{
 const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
 const original=readFileSync(join(directory,'manifest.json'),'utf8'),result=readFileSync(join(directory,'result.json'))
 writeFileSync(join(directory,'result.json'),'{}\n');await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/result|digest/);writeFileSync(join(directory,'result.json'),result)
 for(const mutate of [x=>x.codeSha256='0'.repeat(64),x=>x.snapshot.requests++,x=>x.documents[0].status=403]){
  const changed=JSON.parse(original);mutate(changed);writeFileSync(join(directory,'manifest.json'),JSON.stringify(changed))
  await assert.rejects(()=>api.verifyFussballDirectory(directory,{collectFn:collector}),/code|request|document|status/)
 }
 writeFileSync(join(directory,'manifest.json'),original)
 assert.equal((await api.verifyFussballDirectory(directory,{collectFn:collector})).verified,true)
}))
test('capture pins an explicit calendar day and refuses invalid day values before network',async()=>sample(async({directory})=>{
 let calls=0
 await assert.rejects(()=>api.captureFussballDirectory({directory,options:{...options,asOfDate:'2026-02-30'},fetchFn:()=>{calls++;throw Error('no request')},collectFn:collector}),/date|day/)
 assert.equal(calls,0)
 const m=await api.captureFussballDirectory({directory,options:{...options,asOfDate:'2026-10-22'},fetchFn:network,collectFn:collector})
 assert.equal(m.options.asOfDate,'2026-10-22')
}))
test('default capture calendar day remains tied to createdAt across UTC midnight',async()=>sample(async({directory})=>{
 const OriginalDate=globalThis.Date;let reads=0
 globalThis.Date=class extends OriginalDate{
  constructor(...args){super(...(args.length?args:[reads++===0?'2026-10-22T23:59:59.999Z':'2026-10-23T00:00:00.001Z']))}
 }
 try{
  const m=await api.captureFussballDirectory({directory,options,fetchFn:network,collectFn:collector})
  assert.equal(m.options.asOfDate,m.createdAt.slice(0,10))
 }finally{globalThis.Date=OriginalDate}
}))

test('authentic strict season result survives content-addressed capture and offline replay with lazy fonts',async t=>sample(async({directory})=>{
 const roundHtml=readFileSync(new URL('./vzorci/de-fussball-krog8.html',import.meta.url),'utf8')
 const mainHtml=readFileSync(new URL('./vzorci/de-fussball-ilvesheim-main.html',import.meta.url),'utf8')
 const lineupHtml=readFileSync(new URL('./vzorci/de-fussball-ilvesheim-lineup.html',import.meta.url),'utf8')
 const fontManifest=JSON.parse(readFileSync(new URL('./vzorci/de-fussball-zapisnik.json',import.meta.url),'utf8'))
 const fonts=Object.fromEntries(Object.entries(fontManifest.fonts).map(([id,font])=>[
  id,{bytes:readFileSync(new URL(`./vzorci/${font.file}`,import.meta.url)),sha256:font.sha256},
 ]))
 const staffel=options.staffel,matchId='031EQBPLF4000000VS5489BTVUS470OH'
 const seedUrl=fontManifest.provenance.roundUrl
 const baseSelector=razberiKrog(roundHtml,{fonts,staffel}).krogi.slice(0,8)
 const fixture=razberiKrog(roundHtml,{fonts,staffel}).tekme.find(row=>row.id===matchId)
 assert.ok(fixture)
 const reportUrl=fixture.url
 const lineupUrl=fontManifest.provenance.lineupUrl
 const cssFor=id=>`@font-face{font-family:font-${id};src:url('//www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font') format('woff'),url('//www.fussball.de/export.fontface/-/format/ttf/id/${id}/type/font') format('truetype');}.results-c-${id}{font-family:font-${id}!important;}`
 const parsers={
  inspectPage:inspectFussballPage,
  fontUrl:fussballFontUrl,
  parseRound:(html,{fonts:roundFonts,staffel:scope,url})=>{
   const parsed=razberiKrog(html,{fonts:roundFonts,staffel:scope})
   const selected=Number(url.match(/\/spieltag\/(\d+)\/staffel\//)?.[1]??parsed.krog)
   return {...parsed,krog:selected,krogi:baseSelector.map(row=>({...row,izbran:row.krog===selected})),tekme:selected===8?[fixture]:[],prestavljene:[]}
  },
 }
 const collectFn=input=>collectFussballSeason(input,parsers)
 let clock=Date.parse('2026-10-23T00:00:00.000Z')
 t.mock.method(Date,'now',()=>clock)
 t.mock.method(globalThis,'setTimeout',(callback,ms)=>{clock+=ms;queueMicrotask(callback);return 1})
 const calls=[]
 const fetchFn=async url=>{
  calls.push(url)
  if(url===seedUrl||baseSelector.some(row=>row.url===url))return new Response(roundHtml,{headers:{'content-type':'text/html; charset=utf-8'}})
  if(url===reportUrl)return new Response(mainHtml,{headers:{'content-type':'text/html; charset=utf-8'}})
  if(url===lineupUrl)return new Response(lineupHtml,{headers:{'content-type':'text/html; charset=utf-8'}})
  const cssId=url.match(/\/export\.fontface\/-\/id\/([a-z0-9]{8})\/type\/css$/)?.[1]
  if(cssId)return new Response(cssFor(cssId),{headers:{'content-type':'text/css'}})
  const fontId=url.match(/\/export\.fontface\/-\/format\/woff\/id\/([a-z0-9]{8})\/type\/font$/)?.[1]
  if(fontId&&fonts[fontId])return new Response(fonts[fontId].bytes,{headers:{'content-type':'font/woff'}})
  throw Error(`unexpected authentic fixture request: ${url}`)
 }
 const manifest=await api.captureFussballDirectory({directory,options:{...options,seedUrl,reportLimit:null,asOfDate:'2026-10-23',maxRequests:80},fetchFn,collectFn})
 assert.equal(manifest.success,true)
 const rawText=readFileSync(join(directory,'result.json'),'utf8'),raw=JSON.parse(rawText)
 assert.ok(!rawText.includes('__SLFF_OBSERVED_FONT_'))
 assert.equal(raw.coverage.completeReports,1)
 assert.equal(raw.reports[0].result.nastopi.length,30)
 assert.equal(raw.reports[0].result.nepripisaniRumeni.length,3)
 assert.ok(!calls.includes('https://www.fussball.de/export.fontface/-/id/ilpaevbo/type/css'))
 const replay=await api.verifyFussballDirectory(directory,{collectFn})
 assert.equal(replay.verified,true)
 assert.equal(replay.resultSha256,manifest.resultSha256)
 assert.equal(replay.requests,manifest.snapshot.requests)
 const refreshed=directory+'-refresh',freshCalls=[]
 const fresh=await api.captureFussballDirectory({directory:refreshed,reuseDirectory:directory,options:manifest.options,collectFn,fetchFn:async url=>{
  freshCalls.push(url)
  assert.ok(url===seedUrl||baseSelector.some(r=>r.url===url),'complete reports, lineup and immutable fonts must not be fetched again')
  return fetchFn(url)
 }})
 assert.equal(fresh.version,2);assert.equal(freshCalls.length,8)
 assert.equal(fresh.snapshot.requests,8)
 const cached=fresh.documents.filter(d=>d.origin==='cache')
 assert.ok(cached.some(d=>d.kind==='report'));assert.ok(cached.some(d=>d.kind==='lineup'))
 for(const d of cached)assert.equal(d.capturedAt,manifest.documents.find(old=>old.url===d.url).capturedAt)
 assert.equal((await api.verifyFussballDirectory(refreshed,{collectFn})).verified,true)
 const again=await api.captureFussballDirectory({directory:directory+'-again',reuseDirectory:refreshed,options:manifest.options,collectFn,fetchFn})
 assert.deepEqual(again.documents.filter(d=>d.origin==='cache').map(d=>d.originalReceipt),cached.map(d=>d.originalReceipt),'flat original receipts never grow an ancestry chain')
 const receiptPath=join(refreshed,'manifest.json'),saved=readFileSync(receiptPath)
 fresh.documents.find(d=>d.origin==='cache').capturedAt='2026-10-25T12:00:00Z';writeFileSync(receiptPath,JSON.stringify(fresh))
 await assert.rejects(api.verifyFussballDirectory(refreshed,{collectFn}),/cache|original|receipt/)
 let corruptFetches=0
 await assert.rejects(api.captureFussballDirectory({directory:directory+'-corrupt',reuseDirectory:refreshed,options:manifest.options,collectFn,fetchFn:async()=>{corruptFetches++;throw Error('no fallback')}}))
 assert.equal(corruptFetches,0);writeFileSync(receiptPath,saved)
 const newFixture=razberiKrog(roundHtml,{fonts,staffel}).tekme.find(f=>f.id!==matchId&&f.rezultat!==null)
 const newCalls=[]
 const changedCollector=input=>collectFussballSeason(input,{...parsers,parseRound:(html,args)=>{
  const parsed=parsers.parseRound(html,args)
  if(html.includes('SYNTHETIC_NEW_PLAYED_FIXTURE')&&parsed.krog===8)parsed.tekme.push(newFixture)
  return parsed
 }})
 // Synthetic inventory framing adds another ACTUAL match ID from this saved
 // round. The refused closed-map response proves new reports are requested,
 // while the already-complete actual report must remain entirely cached.
 await assert.rejects(api.captureFussballDirectory({directory:directory+'-new-report',reuseDirectory:refreshed,options:manifest.options,collectFn:changedCollector,fetchFn:async url=>{
  newCalls.push(url)
  if(url===seedUrl||baseSelector.some(r=>r.url===url))return new Response(roundHtml.replace('</body>','<!--SYNTHETIC_NEW_PLAYED_FIXTURE--></body>'),{headers:{'content-type':'text/html'}})
  assert.equal(url,newFixture.url)
  return new Response('refused',{status:403})
 }}),/403/)
 assert.ok(newCalls.includes(newFixture.url));assert.ok(!newCalls.includes(reportUrl)&&!newCalls.includes(lineupUrl))
}))
