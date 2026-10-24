import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
import {inspectFussballPage} from './viri/fussball-discovery.mjs'
import {razberiKrog} from './viri/fussball.mjs'
const api=await import('./fussball-screen.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const B='https://www.fussball.de',S='031EKNM2HG00000LVS5489BUVUR5FS5A-G',A='031EQBPLF4000000VS5489BTVUS470OH'
const dated=`${B}/spieltag/-/spieldatum/2026-10-11/staffel/${S}`
const read=n=>readFileSync(new URL(`./vzorci/${n}`,import.meta.url))
const fm=JSON.parse(read('de-fussball-zapisnik.json'))
const fonts=Object.fromEntries(Object.entries(fm.fonts).map(([id,x])=>[id,{bytes:read(x.file),sha256:x.sha256}]))
const originalRound=read('de-fussball-krog8.html').toString(),originalMain=read('de-fussball-ilvesheim-main.html').toString(),originalLineup=read('de-fussball-ilvesheim-lineup.html').toString()
const css=id=>`@font-face{font-family:font-${id};src:url('//www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font') format('woff'),url('//www.fussball.de/export.fontface/-/format/ttf/id/${id}/type/font') format('truetype');}.results-c-${id}{font-family:font-${id}!important;}`
// Synthetic multiplicity/scope variants of the authentic report, not evidence of three real matches.
function source({count=1,mutateRound=x=>x,mutateLineup=x=>x,deny=false}={}){
 const base=originalRound.indexOf('<div class="fixtures-matches-table">'),body=originalRound.slice(base).match(/<tbody>([\s\S]*?)<\/tbody>/)[1]
 const rows=[...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]),row=rows.find(x=>x.includes(A))
 const ids=Array.from({length:count},(_,i)=>A.replace('F400','F'+(4+i)+'00'))
 const html=mutateRound(originalRound.slice(0,base)+originalRound.slice(base).replace(body,rows[0]+ids.map(id=>row.replaceAll(A,id)).join('')))
 const fixtures=razberiKrog(html,{fonts,staffel:S}).tekme
 const docs=new Map([[dated,{bytes:html,type:'text/html'}]])
 for(const f of fixtures){docs.set(f.url,{bytes:originalMain.replaceAll(A,f.id),type:'text/html'});docs.set(fm.provenance.lineupUrl.replaceAll(A,f.id),{bytes:mutateLineup(originalLineup.replaceAll(A,f.id)),type:'text/html'})}
 for(const [id,f] of Object.entries(fonts)){docs.set(`${B}/export.fontface/-/id/${id}/type/css`,{bytes:css(id),type:'text/css'});docs.set(`${B}/export.fontface/-/format/woff/id/${id}/type/font`,{bytes:f.bytes,type:'font/woff'})}
 let clock=Date.parse('2026-10-24T12:00:00Z');const calls=[]
 const fetchFn=async(url,init)=>{calls.push({url,init});if(deny)return new Response('denied',{status:403,headers:{'content-type':'text/html'}});const d=docs.get(url);assert.ok(d,`unobserved source request ${url}`);return new Response(d.bytes,{headers:{'content-type':d.type}})}
 const client=createFussballCaptureClient({maxRequests:80,fetchFn,now:()=>clock,sleep:async ms=>{clock+=ms}})
 return {client,fetchFn,calls,html,docs,options:{seedUrl:dated,staffel:S,season:'2026/27',maxRequests:80,reportLimit:Math.min(count,3),asOfDate:'2026-10-24'}}
}
async function screen(f){assert.equal(typeof api.collectFussballScreen,'function');return api.collectFussballScreen({...f.options,client:f.client})}

test('dated seed is admitted with exact real date, manual GET and explicit UA',async()=>{
 let call;const c=createFussballCaptureClient({maxRequests:1,fetchFn:async(u,i)=>{call={u,i};return new Response(originalRound,{headers:{'content-type':'text/html'}})}})
 await c.read(dated,'round');assert.equal(call.u,dated);assert.equal(call.i.redirect,'manual');assert.match(call.i.headers['User-Agent'],/^SLFF fantasy/)
 const info=inspectFussballPage(originalRound.replaceAll(fm.provenance.roundUrl,dated),{kind:'round',staffel:S});assert.equal(info.url,dated)
})
test('impossible dates and extra paths/query are rejected before fetch',async()=>{
 for(const url of [dated.replace('2026-10-11','2026-02-30'),dated.replace('2026-10-11','2026-13-01'),dated+'?x=1',dated+'/extra']){
  let n=0;const c=createFussballCaptureClient({maxRequests:1,fetchFn:()=>{n++;throw Error('must not fetch')}});await assert.rejects(()=>c.read(url,'round'),/route|URL|date/);assert.equal(n,0)
 }
})
test('authentic strict report screen keeps 30 appearances and never enumerates thirty rounds',async()=>{
 const f=source(),r=await screen(f);assert.equal(r.reports.length,1);assert.equal(r.reports[0].result.nastopi.length,30);assert.equal(r.reports[0].result.z.goli.length,5)
 assert.equal(r.coverage.capturedRounds,1);assert.equal(r.coverage.advertisedRounds,30);assert.equal(r.coverage.fullSeason,false);assert.equal(r.activationEligible,false);assert.equal(r.sezonskiUvozPodprt,false)
 assert.equal(f.calls.filter(x=>x.url.includes('/spieltag/')).length,1)
})
test('three synthetic identities exercise three linked strict reports without extra round traversal',async()=>{
 const f=source({count:3}),r=await screen(f);assert.equal(r.reports.length,3);assert.deepEqual(r.reports.map(x=>x.result.nastopi.length),[30,30,30]);assert.equal(r.coverage.attemptedReports,3);assert.equal(r.coverage.capturedRounds,1)
})
test('budget and report limits are mandatory and bounded before any read',async()=>{
 for(const change of [{maxRequests:81},{maxRequests:0},{maxRequests:undefined},{reportLimit:4},{reportLimit:0}]){const f=source();f.options={...f.options,...change};await assert.rejects(()=>screen(f),/budget|limit|request/i);assert.equal(f.calls.length,0)}
})
test('hidden round selectors do not authorize any report or extra-round request',async()=>{
 const f=source();const selected=f.html.match(/<select\b[^>]*name="spieltag"[^>]*>[\s\S]*?<\/select>/)[0]
 f.docs.get(dated).bytes=f.html.replace(selected,`<!--${selected}-->`)
 await assert.rejects(()=>screen(f),/live|selector|select|živa|krog/i);assert.equal(f.calls.length,1)
})
test('wrong season, foreign selector and hidden report anchors cannot authorize source reads',async()=>{
 for(const mutate of [h=>h.replace('>Saison 26/27</option>','>Saison 25/26</option>'),h=>h.replace('/-/spieltag/1/staffel/','/-/spieltag/1/staffel/').replace(/data-href="https:\/\/www\.fussball\.de\/spieltag\/[^\"]*spieltag\/1\/staffel\/[A-Z0-9-]+"/,'data-href="https://evil.invalid/round"'),h=>h.replace(/<a href="(https:\/\/www\.fussball\.de\/spiel\/[^\"]+)"/g,'<a data-hidden="<a href=\"$1\"" href="#"')]){
  const f=source();f.docs.get(dated).bytes=mutate(f.html);await assert.rejects(()=>screen(f),undefined,`mutation ${mutate.toString()}`);assert.equal(f.calls.filter(x=>x.url.includes('/spiel/')).length,0)
 }
})
test('anonymous actual player remains a typed rejection, never ready, and stops sample early',async()=>{
 const f=source({count:3,mutateLineup:h=>h.replace(/<a href="https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+" class="player-wrapper home">[\s\S]*?<\/a>/,'<a href="#" class="player-wrapper home"><div class="player-name"><span class="firstname"></span><span class="lastname">k.A.</span></div><span class="player-number">21</span></a>')}),r=await screen(f)
 assert.equal(r.reports.length,0);assert.equal(r.rejectedReports.length,1);assert.equal(r.rejectedReports[0].code,'FUSSBALL_REPORT_INVALID');assert.match(r.rejectedReports[0].reason,/profilne/);assert.equal(r.activationEligible,false);assert.equal(r.coverage.attemptedReports,1)
})
test('source refusal prevents queued and cached reads and preserves counted failure',async()=>{
 const f=source({deny:true});await assert.rejects(()=>screen(f),/403/);await assert.rejects(()=>f.client.read(dated,'round'),/stopped/);assert.equal(f.calls.length,1);assert.equal(f.client.snapshot().requests,1)
})
test('screen evidence replays original bytes and corruption fails without network',async t=>{
 assert.equal(typeof api.captureFussballScreenDirectory,'function');assert.equal(typeof api.verifyFussballScreenDirectory,'function')
 const f=source(),parent=mkdtempSync(join(tmpdir(),'slff-fast-screen-')),directory=join(parent,'screen');let clock=Date.now()
 t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})
 try{const m=await api.captureFussballScreenDirectory({directory,options:f.options,fetchFn:f.fetchFn});assert.equal(m.provider,'fussball-screen');assert.equal(m.activationEligible,false)
  const r=await api.verifyFussballScreenDirectory(directory);assert.equal(r.verified,true);assert.equal(r.coverage.completeReports,1)
  writeFileSync(join(directory,m.documents[0].file),'corrupt');await assert.rejects(()=>api.verifyFussballScreenDirectory(directory),/hash|bytes|digest/)
 }finally{rmSync(parent,{recursive:true,force:true})}
})

test('fallback follows only one actually advertised earlier round and stops when it has no completed fixture',async()=>{
 const f=source();f.options.asOfDate='2026-10-01'
 const fallback=`${B}/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/spieltag/1/staffel/${S}`
 const extra=f.html.replace('selected="selected" data-href="'+`${B}/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/spieltag/8/staffel/${S}`,'data-href="'+`${B}/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/spieltag/8/staffel/${S}`).replace(`data-href="${fallback}"`,`selected="selected" data-href="${fallback}"`)
 f.docs.set(fallback,{bytes:extra,type:'text/html'})
 const r=await screen(f);assert.equal(r.coverage.capturedRounds,2);assert.equal(r.coverage.attemptedReports,0);assert.equal(r.coverage.selectedRound,1)
 assert.deepEqual(f.calls.filter(x=>x.url.includes('/spieltag/')).map(x=>x.url),[dated,fallback])
})
test('observed previous-season selector is recorded without fetching it or verifying pairing',async()=>{
 const f=source(),previous=`${B}/spieltag/-/staffel/011TQQ66AS000000VTVG0001VUUNAVHM-G`
 f.docs.get(dated).bytes=f.html.replace('>Saison 07/08</option>','>Saison 25/26</option>')
 const r=await screen(f);assert.deepEqual(r.previousSeasonPairing,{verified:false,observedLinks:[{season:'2025/26',url:previous,staffel:'011TQQ66AS000000VTVG0001VUUNAVHM-G',verified:false}]});assert.ok(!f.calls.some(x=>x.url===previous))
})
test('source budget stop persists partial evidence and failed evidence cannot replay as success',async t=>{
 const f=source(),parent=mkdtempSync(join(tmpdir(),'slff-fast-screen-budget-')),directory=join(parent,'screen');let clock=Date.now()
 t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})
 try{await assert.rejects(()=>api.captureFussballScreenDirectory({directory,options:{...f.options,maxRequests:2},fetchFn:f.fetchFn}),/budget/)
  const m=JSON.parse(readFileSync(join(directory,'screen-manifest.json')));assert.equal(m.success,false);assert.equal(m.snapshot.requests,2);assert.equal(m.documents.length,2);assert.equal(m.activationEligible,false)
  await assert.rejects(()=>api.verifyFussballScreenDirectory(directory),/failed|invalid/);assert.equal(f.calls.length,2)
 }finally{rmSync(parent,{recursive:true,force:true})}
})
test('CLI rejects missing budgets, excessive reports and existing season evidence without source reads',async()=>{
 const {runFussballScreenCli}=await import('./zajemi-fussball-vzorec.mjs')
 await assert.rejects(()=>runFussballScreenCli(['capture','--seed-url',dated]),/Explicit/)
 await assert.rejects(()=>runFussballScreenCli(['capture','--seed-url',dated,'--staffel',S,'--season','2026/27','--max-requests','81','--reports','3','--output','/must-not-be-created']),/budget/)
 await assert.rejects(()=>runFussballScreenCli(['capture','--seed-url',dated,'--staffel',S,'--season','2026/27','--max-requests','80','--reports','4','--output','/must-not-be-created']),/limit/)
})

test('foreign SVG context cannot turn a selector into source authorization',async()=>{
 const f=source(),selector=f.html.match(/<select\b[^>]*name="spieltag"[^>]*>[\s\S]*?<\/select>/)[0]
 f.docs.get(dated).bytes=f.html.replace(selector,`<svg>${selector}</svg>`)
 await assert.rejects(()=>screen(f),/foreign|live|selector/);assert.equal(f.calls.length,1)
})

test('offline screen rejects invalid recorded source timestamps even when request/document metadata agree',async t=>{
 const f=source(),parent=mkdtempSync(join(tmpdir(),'slff-fast-screen-time-')),directory=join(parent,'screen');let clock=Date.now()
 t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})
 try{const m=await api.captureFussballScreenDirectory({directory,options:f.options,fetchFn:f.fetchFn});m.snapshot.attempts[0].startedAt='invalid';m.documents[0].capturedAt='invalid';writeFileSync(join(directory,'screen-manifest.json'),JSON.stringify(m))
  await assert.rejects(()=>api.verifyFussballScreenDirectory(directory),/timestamp|attempt|date/)
 }finally{rmSync(parent,{recursive:true,force:true})}
})

test('budget exhausted inside a report remains a terminal source failure rather than semantic rejection',async t=>{
 const f=source(),parent=mkdtempSync(join(tmpdir(),'slff-fast-screen-report-budget-')),directory=join(parent,'screen');let clock=Date.now()
 t.mock.method(Date,'now',()=>clock);t.mock.method(globalThis,'setTimeout',(fn,ms)=>{clock+=ms;queueMicrotask(fn);return 1})
 try{await assert.rejects(()=>api.captureFussballScreenDirectory({directory,options:{...f.options,maxRequests:7},fetchFn:f.fetchFn}),/budget/)
  const m=JSON.parse(readFileSync(join(directory,'screen-manifest.json')));assert.equal(m.success,false);assert.equal(m.snapshot.stopped,true);assert.equal(m.snapshot.requests,7);assert.equal(f.calls.length,7)
 }finally{rmSync(parent,{recursive:true,force:true})}
})
test('a caller cannot supply a larger client budget than the explicit screen budget',async()=>{
 const f=source();f.options.maxRequests=7;await assert.rejects(()=>screen(f),/budget/);assert.equal(f.calls.length,0)
})
