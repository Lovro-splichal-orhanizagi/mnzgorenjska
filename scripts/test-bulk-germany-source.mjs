import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {collectFussballSeason} from './fussball-season.mjs'
import {razberiKrog} from './viri/fussball.mjs'
import {fussballBulkCacheDocuments,captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'

const api=await import('./bulk-germany-source.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const read=name=>readFileSync(new URL(`./vzorci/${name}`,import.meta.url))
const proof=JSON.parse(read('de-fussball-zapisnik.json'))
const staffel='031EKNM2HG00000LVS5489BUVUR5FS5A-G',matchId='031EQBPLF4000000VS5489BTVUS470OH'
const seedUrl=proof.provenance.roundUrl,season='2026/27'
const current={slug:'de-kreisliga-mannheim',source:'fussball-public',source_league_code:staffel+':'+season,host:'www.fussball.de',country_code:'DE',season,seedUrl,archives:[]}
// Explicitly SYNTHETIC catalog/season framing: no observed archive pairing or
// complete real season is claimed. Main report, lineup, glyphs and player stats
// below are unchanged original Mannheim bytes, parsed by the installed parser.
const paired={...current,archives:[{code:staffel+':2025/26',season:'2025/26',seedUrl}]}
const fonts=Object.fromEntries(Object.entries(proof.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const roundHtml=read('de-fussball-krog8.html').toString()
const parsed=razberiKrog(roundHtml,{fonts,staffel})
const selected=parsed.tekme.find(f=>f.id===matchId)
const selector=parsed.krogi.slice(0,8)
const reportUrl=selected.url,lineupUrl=proof.provenance.lineupUrl
const clockStart=Date.parse('2026-10-25T00:00:00Z')
function setup(){
 let clock=clockStart
 const calls=[]
 const fetch=async url=>{
  calls.push(url)
  let bytes,type='text/html'
  if(url===seedUrl||selector.some(s=>s.url===url))bytes=Buffer.from(roundHtml)
  else if(url===reportUrl)bytes=read('de-fussball-ilvesheim-main.html')
  else if(url===lineupUrl)bytes=read('de-fussball-ilvesheim-lineup.html')
  else if(/\/type\/css$/.test(url)){
   const id=url.match(/\/id\/([a-z0-9]{8})\//)[1]
   assert.ok(fonts[id],`unexpected font ${id}`)
   bytes=Buffer.from(`@font-face{font-family:font-${id};src:url('//www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font') format('woff'),url('//www.fussball.de/export.fontface/-/format/ttf/id/${id}/type/font') format('truetype');}.results-c-${id}{font-family:font-${id}!important;}`);type='text/css'
  }else{
   const id=url.match(/\/id\/([a-z0-9]{8})\//)?.[1]
   assert.ok(fonts[id],`unexpected closed-map URL ${url}`);bytes=fonts[id].bytes;type='font/woff'
  }
  return new Response(bytes,{headers:{'content-type':type}})
 }
 const collectSeason=options=>collectFussballSeason(options,{
  parseRound:(html,{fonts,staffel,url})=>{
   const actual=razberiKrog(html,{fonts,staffel})
   const krog=Number(url.match(/\/spieltag\/(\d+)\/staffel\//)?.[1]??8)
   return {...actual,sezona:options.season,krog,krogi:selector.map(s=>({...s,izbran:s.krog===krog})),tekme:krog===8?[selected]:[],prestavljene:[]}
  },
 })
 return {calls,fetch,now:()=>clock,sleep:async ms=>{clock+=ms},dependencies:{catalog:[paired],collectSeason},directory:join(mkdtempSync(join(tmpdir(),'de-pack-')),'capture')}
}
async function capture(f=setup(),candidate=paired){
 assert.equal(typeof api.captureGermanyCandidate,'function','full Germany pack API exists')
 const pack=await api.captureGermanyCandidate(candidate,{directory:f.directory,maxRequests:100,now:f.now,fetch:f.fetch},{...f.dependencies,sleep:f.sleep})
 return {f,pack}
}
const cleanup=f=>rmSync(join(f.directory,'..'),{recursive:true,force:true})

test('observed catalog binds source tuples, validates witnessed archive, and HOLDs missing pairings before GET',async()=>{
 assert.equal(typeof api.validateGermanyCandidate,'function')
 assert.equal(api.GERMANY_BULK_CANDIDATES.length,3)
 for(const c of api.GERMANY_BULK_CANDIDATES){
  assert.equal(c.archives.length,c.slug==='de-kreisliga-mannheim'?0:1)
  assert.ok(c.registration.name&&c.registration.short_name&&Number.isInteger(c.registration.sort_order))
  assert.equal(api.validateGermanyCandidate(c).source,'fussball-public')
  if(c.archives.length){assert.equal(c.archives[0].code,c.slug==='de-verbandsliga-baden'?'02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26':'02TC3RCRHK000004VS5489BTVVQ0O654-G:2025/26');assert.equal(c.archives[0].observedFrom.length,2);continue}
  let requests=0
  await assert.rejects(api.captureGermanyCandidate(c,{directory:'/unused',maxRequests:1,fetch:async()=>{requests++}}),e=>e.dataHold===true&&e.reason_code==='GERMANY_ARCHIVE_MISSING')
  assert.equal(requests,0)
 }
 for(const change of [{host:'evil.test'},{source:'dfb'},{season:'2025/26'},{source_league_code:staffel+':2026/28'},{seedUrl:seedUrl+'/evil'},{archives:paired.archives}]){
  assert.throws(()=>api.validateGermanyCandidate({...api.GERMANY_BULK_CANDIDATES[0],...change}),e=>e.dataHold===true&&e.reason_code==='GERMANY_CATALOG_INVALID')
 }
 assert.equal(api.validateGermanyCandidate(paired,{catalog:[paired]}).archives[0].season,'2025/26')
 assert.throws(()=>api.validateGermanyCandidate({...paired,archives:[{...paired.archives[0],season:'2024/25',code:staffel+':2024/25'}]},{catalog:[{...paired,archives:[{...paired.archives[0],season:'2024/25',code:staffel+':2024/25'}]}]}),/archive|previous/i)
})

test('installed archive collector forwards its identity parser to the actual season collector',async()=>{
 const c=api.GERMANY_BULK_CANDIDATES.find(c=>c.archives.length)
 const a=c.archives[0],t={...a,staffel:a.code.split(':')[0]}
 const html=read('de-fussball-schleswig-archive-20261026.html')
 const client={read:async(url,kind)=>{assert.equal(url,a.seedUrl);assert.equal(kind,'round');return {bytes:html,capturedAt:'2026-10-26T09:38:41.616Z'}}}
 // Stop immediately after real identity validation. This deliberately proves
 // adapter composition only; it cannot establish full-season/source readiness.
 const reached=Error('reached real archive round parser')
 const collectSeason=(options,parsers)=>collectFussballSeason(options,{...parsers,parseRound:()=>{throw reached}})
 await assert.rejects(api.collectGermanySeason(t,c,{client,asOfDate:'2026-10-26',collectSeason}),e=>e===reached)
 // The ordinary collector must still reject that parent-canonical archive.
 await assert.rejects(collectFussballSeason({...t,client,asOfDate:'2026-10-26'},{parseRound:()=>{throw reached}}),e=>e!==reached)
})

test('full two-season collection replays real positive statistics, native schedule and identities',async t=>{
 const f=setup()
 try{
  const {pack}=await capture(f)
  assert.equal(pack.version,1);assert.equal(pack.seasons.length,2)
  assert.match(pack.original_bytes_sha256,/^[a-f0-9]{64}$/)
  assert.equal(pack.candidate.source_league_code,paired.source_league_code)
  for(const s of pack.seasons){
   assert.equal(s.schedule.length,8);assert.equal(s.reports.length,1)
   const r=s.reports[0]
   assert.equal(r.id,'de-fussball-'+matchId);assert.equal(r.nastopi.length,30)
   assert.equal(r.z.nepopoln,false);assert.equal(r.z.goli.length,5)
   assert.deepEqual([0,1].map(side=>r.nastopi.filter(a=>a.ekipaIdx===side).reduce((n,a)=>n+a.minute,0)),[990,990])
   assert.deepEqual(r.nastopi.filter(a=>a.vratar&&a.zacetnik).map(a=>a.ime),['Patrick Obsada','Simon Felix Knauf'])
   assert.ok(s.identities.length>=30);assert.equal(s.schedule[7].tekme[0].odigrana,true)
  }
  assert.equal(new Set(f.calls).size,f.calls.length,'shared font/report URLs fetched once across seasons')
  const loaded=await api.loadGermanyPack(f.directory,{candidate:paired,now:f.now},f.dependencies)
  assert.deepEqual(loaded,pack)
  assert.deepEqual(await api.loadGermanyPack(f.directory,{candidate:paired,now:new Date(f.now())},f.dependencies),pack)
  const cache=await fussballBulkCacheDocuments(f.directory,{staffel,season,seedUrl,collectFn:f.dependencies.collectSeason,loadPack:(d,o)=>api.loadGermanyPack(d,{...o,now:f.now},f.dependencies)})
  assert.ok(cache.some(d=>d.kind==='report')&&cache.some(d=>d.kind==='lineup'))
  assert.ok(cache.every(d=>d.kind!=='round'&&d.capturedAt===d.originalReceipt.document.capturedAt))
  t.mock.method(Date,'now',f.now)
  t.mock.method(globalThis,'setTimeout',(callback,ms)=>{f.sleep(ms);queueMicrotask(callback);return 1})
  const freshCalls=[]
  const refreshed=await captureFussballDirectory({directory:join(f.directory,'..','nightly'),reuseBulkDirectory:f.directory,
   options:{staffel,season,seedUrl,maxRequests:100,reportLimit:null,asOfDate:'2026-10-25'},collectFn:f.dependencies.collectSeason,
   loadBulkPack:(d,o)=>api.loadGermanyPack(d,{...o,now:f.now},f.dependencies),
   fetchFn:async url=>{freshCalls.push(url);assert.ok(url===seedUrl||selector.some(s=>s.url===url),'bulk seed must suppress all already-complete report requests');return f.fetch(url)},
  })
  assert.equal(freshCalls.length,8);assert.equal(refreshed.snapshot.requests,8)
  assert.equal((await verifyFussballDirectory(join(f.directory,'..','nightly'),{collectFn:f.dependencies.collectSeason})).verified,true)
 }finally{cleanup(f)}
})

test('semantic incomplete season is a league HOLD; refusal is a source STOP',async()=>{
 const f=setup()
 try{
  const real=f.dependencies.collectSeason
  f.dependencies.collectSeason=async options=>{const result=await real(options);result.coverage.sampled=true;return result}
  await assert.rejects(capture(f),e=>e.dataHold===true&&!e.sourceStop&&e.reason_code==='GERMANY_SEASON_INCOMPLETE')
 }finally{cleanup(f)}
 const refused=setup();refused.fetch=async()=>new Response('refused',{status:403})
 try{await assert.rejects(capture(refused),e=>e.sourceStop===true&&!e.dataHold)}finally{cleanup(refused)}
})

test('loader rejects stale/future, wrong candidate, edited bytes, extra documents and code changes',async()=>{
 const f=setup()
 try{
  await capture(f)
  const load=(options={})=>api.loadGermanyPack(f.directory,{candidate:paired,now:f.now,...options},f.dependencies)
  await assert.rejects(load({now:clockStart+25*3600_000}),/stale/i)
  await assert.rejects(load({now:clockStart-1,requireFresh:false}),/time|future/i)
  await assert.rejects(load({candidate:{...paired,slug:'de-other'}}),/catalog|candidate|scope/i)
  assert.ok(await load({now:clockStart+25*3600_000,requireFresh:false}))
  const path=join(f.directory,'manifest.json'),original=readFileSync(path)
  const m=JSON.parse(original);m.code_sha256='0'.repeat(64);writeFileSync(path,JSON.stringify(m))
  await assert.rejects(load(),/code/i);writeFileSync(path,original)
  const docPath=join(f.directory,m.documents[0].file),raw=readFileSync(docPath)
  writeFileSync(docPath,Buffer.concat([raw,Buffer.from('tampered')]))
  await assert.rejects(load(),/bytes|hash|digest/i);writeFileSync(docPath,raw)
  writeFileSync(join(f.directory,'unexpected.json'),'{}');await assert.rejects(load(),/unexpected|unlisted/i)
  rmSync(join(f.directory,'unexpected.json'))
  rmSync(docPath);symlinkSync(join(f.directory,'manifest.json'),docPath);await assert.rejects(load(),/regular|symbolic/i)
 }finally{cleanup(f)}
})

test('replay rechecks collector output, accounting and consumes all original documents',async()=>{
 const f=setup()
 try{
  await capture(f)
  const load=()=>api.loadGermanyPack(f.directory,{candidate:paired,now:f.now},f.dependencies)
  const path=join(f.directory,'manifest.json'),original=readFileSync(path),m=JSON.parse(original)
  m.snapshot.requests--;writeFileSync(path,JSON.stringify(m));await assert.rejects(load(),/account|request/i);writeFileSync(path,original)
  const rpath=join(f.directory,'seasons/0.json'),raw=readFileSync(rpath)
  writeFileSync(rpath,raw.toString().replace('Patrick Obsada','Wrong Player'))
  await assert.rejects(load(),/hash|replay|result/i);writeFileSync(rpath,raw)
  const real=f.dependencies.collectSeason
  f.dependencies.collectSeason=async options=>{const result=await real(options);result.reports[0].result.nastopi[0].minute--;return result}
  await assert.rejects(load(),/replay/i)
  f.dependencies.collectSeason=async options=>JSON.parse(readFileSync(join(f.directory,options.season==='2026/27'?'seasons/0.json':'seasons/1.json')))
  await assert.rejects(load(),/unused|accounting/i,'returning cached parsed JSON without reading original bytes never proves coverage')
 }finally{cleanup(f)}
})

test('shared requests are journaled before fetch and remain serialized; exhausted budget stops',async()=>{
 const f=setup(),request=f.fetch
 f.fetch=async(url,options)=>{
  const intents=readFileSync(join(f.directory,'attempts.jsonl'),'utf8').trim().split('\n').map(JSON.parse)
  assert.equal(intents.at(-1).url,url);assert.equal(intents.at(-1).status,'pending')
  assert.equal(options.redirect,'manual');assert.equal(options.method,'GET')
  return request(url,options)
 }
 try{
  await capture(f)
  const m=JSON.parse(readFileSync(join(f.directory,'manifest.json')))
  assert.equal(m.snapshot.requests,f.calls.length)
  assert.ok(m.snapshot.attempts.slice(1).every((a,i)=>Date.parse(a.startedAt)-Date.parse(m.snapshot.attempts[i].startedAt)>=6000))
 }finally{cleanup(f)}
 const bounded=setup()
 try{
  await assert.rejects(api.captureGermanyCandidate(paired,{directory:bounded.directory,maxRequests:1,now:bounded.now,fetch:bounded.fetch},{...bounded.dependencies,sleep:bounded.sleep}),e=>e.sourceStop===true)
  assert.equal(bounded.calls.length,1,'no retries or reads beyond caller budget')
  const m=JSON.parse(readFileSync(join(bounded.directory,'manifest.json')))
  assert.equal(m.complete,false);assert.equal(m.error.sourceStop,true)
  await assert.rejects(api.loadGermanyPack(bounded.directory,{candidate:paired,now:bounded.now},bounded.dependencies),/incomplete/)
 }finally{cleanup(bounded)}
})
