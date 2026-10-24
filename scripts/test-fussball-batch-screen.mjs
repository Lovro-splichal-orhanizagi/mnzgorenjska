import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,mkdtempSync,rmSync,writeFileSync,mkdirSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createFussballCaptureClient} from './lib/fussball-capture.mjs'
const api=await import('./fussball-batch-screen.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const B='https://www.fussball.de',S='031EKNM2HG00000LVS5489BUVUR5FS5A-G',A='031EQBPLF4000000VS5489BTVUS470OH'
const read=n=>readFileSync(new URL(`./vzorci/${n}`,import.meta.url))
const fm=JSON.parse(read('de-fussball-zapisnik.json')),round=read('de-fussball-krog8.html').toString(),main=read('de-fussball-ilvesheim-main.html').toString(),lineup=read('de-fussball-ilvesheim-lineup.html').toString()
const sha=x=>createHash('sha256').update(x).digest('hex')
const css=id=>`@font-face{font-family:font-${id};src:url('//www.fussball.de/export.fontface/-/format/woff/id/${id}/type/font') format('woff'),url('//www.fussball.de/export.fontface/-/format/ttf/id/${id}/type/font') format('truetype');}.results-c-${id}{font-family:font-${id}!important;}`
// TEST ONLY: second and later scopes are synthetic identities over retained authentic bytes.
// They test orchestration, and do not establish another real supported league or match.
function source({count=2,budget=80,bad=[],deny=null,transport=null,noPlayed=false}={}){
 const docs=new Map(),leagues=[],calls=[],starts=[];let clock=Date.parse('2026-10-24T12:00:00Z')
 const base=round.indexOf('<div class="fixtures-matches-table">'),body=round.slice(base).match(/<tbody>([\s\S]*?)<\/tbody>/)[1],rows=[...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(x=>x[0]),one=rows.find(x=>x.includes(A))
 for(let i=0;i<count;i++){
  const staffel=S.replace('HG00',`HG0${i}`),id=A.replace('F400',`F${4+i}00`),seedUrl=`${B}/spieltag/-/spieldatum/2026-10-11/staffel/${staffel}`
  const replace=x=>x.replaceAll(S,staffel).replaceAll(A,id)
  let html=replace(round.slice(0,base)+round.slice(base).replace(body,rows[0]+one))
  leagues.push({seedUrl,staffel,season:'2026/27'})
  docs.set(seedUrl,{bytes:html,type:'text/html'})
  const url=replace(one.match(/href="(https:\/\/www\.fussball\.de\/spiel\/[^"]+)"/)[1].split('#')[0]),lineupUrl=replace(fm.provenance.lineupUrl)
  docs.set(url,{bytes:replace(main),type:'text/html'})
  docs.set(lineupUrl,{bytes:bad.includes(i)?replace(lineup).replace(/<a href="https:\/\/www\.fussball\.de\/spielerprofil\/[^\"]+" class="player-wrapper home">[\s\S]*?<\/a>/,'<a href="#" class="player-wrapper home"><div class="player-name"><span class="firstname"></span><span class="lastname">k.A.</span></div><span class="player-number">21</span></a>'):replace(lineup),type:'text/html'})
 }
 for(const [id,f]of Object.entries(fm.fonts)){docs.set(`${B}/export.fontface/-/id/${id}/type/css`,{bytes:css(id),type:'text/css'});docs.set(`${B}/export.fontface/-/format/woff/id/${id}/type/font`,{bytes:read(f.file),type:'font/woff'})}
 const fetchFn=async(url,init)=>{calls.push({url,init});starts.push(clock);if(url===transport)throw Error('source socket closed');if(url===deny)return new Response('denied',{status:403,headers:{'content-type':'text/html'}});const d=docs.get(url);assert.ok(d,`unexpected source request ${url}`);return new Response(d.bytes,{headers:{'content-type':d.type}})}
 const now=()=>clock,sleep=async ms=>{clock+=ms},client=createFussballCaptureClient({maxRequests:budget,fetchFn,now,sleep})
 return {leagues,docs,calls,starts,fetchFn,now,sleep,client,options:{leagues,maxRequests:budget,reportLimit:3,asOfDate:noPlayed?'2026-10-01':'2026-10-24'}}
}
async function batch(f){assert.equal(typeof api.collectFussballBatchScreen,'function');return api.collectFussballBatchScreen({...f.options,client:f.client})}
test('batch validates every tuple and one total bounded budget before its first GET',async()=>{
 for(const change of [{maxRequests:81},{maxRequests:0},{reportLimit:4},{leagues:[]},{leagues:Array(11).fill({})},{leagues:null}]){const f=source();f.options={...f.options,...change};await assert.rejects(()=>batch(f),/budget|limit|league|scope/i);assert.equal(f.calls.length,0)}
 for(const change of [{staffel:'bad'},{seedUrl:'https://evil.invalid/'},{season:'2026/28'}]){const f=source();f.options.leagues[1]={...f.options.leagues[1],...change};await assert.rejects(()=>batch(f),/scope|season/i);assert.equal(f.calls.length,0)}
 const f=source();f.options.leagues[1]=f.options.leagues[0];await assert.rejects(()=>batch(f),/duplicate/i);assert.equal(f.calls.length,0)
})
test('two synthetic scopes strictly parse retained source bytes with shared cache and six-second starts',async()=>{
 const f=source(),r=await batch(f);assert.deepEqual(r.leagues.map(x=>x.status),['SAMPLE_PASSED','SAMPLE_PASSED'],JSON.stringify(r.leagues.map(x=>({reason:x.reason,reject:x.screen?.rejectedReports}))))
 for(const child of r.leagues){assert.equal(child.screen.reports[0].result.nastopi.length,30);assert.equal(child.screen.coverage.fullSeason,false);assert.equal(child.activationEligible,false);assert.equal(child.sezonskiUvozPodprt,false)}
 assert.equal(r.activationEligible,false);assert.equal(r.sezonskiUvozPodprt,false);assert.equal(r.snapshot.requests,f.calls.length)
 assert.equal(new Set(f.calls.map(x=>x.url)).size,f.calls.length);assert.ok(f.starts.slice(1).every((t,i)=>t-f.starts[i]>=6000));assert.equal(f.calls.filter(x=>x.url.includes('/spieltag/')).length,2)
})
test('semantic rejection holds only its league and the next scope still passes',async()=>{
 const f=source({bad:[0]}),r=await batch(f);assert.deepEqual(r.leagues.map(x=>x.status),['HOLD','SAMPLE_PASSED']);assert.equal(r.leagues[0].screen.rejectedReports.length,1);assert.match(r.leagues[0].reason,/rejected/i);assert.equal(r.snapshot.stopped,false)
})
test('invalid live schedule remains a semantic HOLD and continues the next league',async()=>{
 const f=source(),d=f.docs.get(f.leagues[0].seedUrl);d.bytes=d.bytes.replace('>Saison 26/27</option>','>Saison 25/26</option>')
 const r=await batch(f);assert.deepEqual(r.leagues.map(x=>x.status),['HOLD','SAMPLE_PASSED']);assert.match(r.leagues[0].reason,/season|sezon/i)
})
test('shared budget exhaustion preserves completed league and holds current and queued scopes',async()=>{
 const f=source({count:3,budget:14}),r=await batch(f);assert.equal(r.snapshot.requests,14);assert.equal(r.snapshot.stopped,true);assert.equal(r.leagues[0].status,'SAMPLE_PASSED');assert.deepEqual(r.leagues.slice(1).map(x=>x.status),['HOLD','HOLD']);assert.equal(r.leagues[2].attempted,false);assert.match(r.leagues[1].reason,/budget/)
})
test('refusal and transport failure stop the shared host with no subsequent scope requests',async()=>{
 for(const type of ['deny','transport']){const f=source();const url=f.leagues[0].seedUrl;const original=f.fetchFn;let n=0;f.client=createFussballCaptureClient({maxRequests:80,now:f.now,sleep:f.sleep,fetchFn:async(u,i)=>{n++;if(u===url){if(type==='transport')throw Error('socket closed');return new Response('denied',{status:403})}return original(u,i)}})
  const r=await batch(f);assert.equal(n,1);assert.equal(r.snapshot.requests,1);assert.equal(r.snapshot.stopped,true);assert.deepEqual(r.leagues.map(x=>x.status),['HOLD','HOLD']);assert.equal(r.leagues[1].attempted,false)
 }
})
test('no sampled played report holds a league after only one advertised earlier round',async()=>{
 const f=source({count:1,noPlayed:true}),html=f.docs.get(f.leagues[0].seedUrl).bytes
 const fallback=`${B}/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/spieltag/1/staffel/${S}`
 const selected=`${B}/spieltag/kreisliga-mannheim-kreis-mannheim-kreisliga-herren-saison2627-baden/-/spieltag/8/staffel/${S}`
 f.docs.set(fallback,{bytes:html.replace('selected="selected" data-href="'+selected,'data-href="'+selected).replace(`data-href="${fallback}"`,`selected="selected" data-href="${fallback}"`),type:'text/html'})
 const r=await batch(f);assert.equal(r.leagues[0].status,'HOLD');assert.match(r.leagues[0].reason,/No sampled played/);assert.equal(r.leagues[0].screen.coverage.capturedRounds,2);assert.equal(r.leagues[0].screen.coverage.attemptedReports,0)
})
async function capture(f,run){
 assert.equal(typeof api.captureFussballBatchScreenDirectory,'function');assert.equal(typeof api.verifyFussballBatchScreenDirectory,'function')
 const parent=mkdtempSync(join(tmpdir(),'slff-batch-screen-')),directory=join(parent,'batch')
 try{const m=await api.captureFussballBatchScreenDirectory({directory,options:f.options,fetchFn:f.fetchFn,now:f.now,sleep:f.sleep});await run(m,directory)}finally{rmSync(parent,{recursive:true,force:true})}
}
test('separate batch evidence replays strict results and original bytes offline',async()=>{
 const f=source({bad:[0]});await capture(f,async(m,d)=>{assert.equal(m.provider,'fussball-batch-screen');assert.equal(m.success,true);const count=f.calls.length;const r=await api.verifyFussballBatchScreenDirectory(d);assert.equal(r.verified,true);assert.deepEqual(r.leagues.map(x=>x.status),['HOLD','SAMPLE_PASSED']);assert.equal(f.calls.length,count);assert.equal(r.activationEligible,false);assert.equal(r.sezonskiUvozPodprt,false)})
})
test('terminal budget failure keeps all league results and replays only as stopped diagnostics',async()=>{
 const f=source({count:3,budget:14});await capture(f,async(m,d)=>{assert.equal(m.success,false);assert.equal(m.snapshot.requests,14);assert.equal(m.documents.length,14);const r=await api.verifyFussballBatchScreenDirectory(d);assert.equal(r.verified,true);assert.equal(r.success,false);assert.deepEqual(r.leagues.map(x=>x.status),['SAMPLE_PASSED','HOLD','HOLD'])})
})
test('terminal refusal and transport attempts are counted and retained for offline diagnostics',async()=>{
 for(const kind of ['deny','transport']){const f=source();const original=f.fetchFn,url=f.leagues[1].seedUrl;f.fetchFn=async(u,i)=>{if(u===url){if(kind==='transport')throw Error('socket closed');return new Response('denied',{status:403})}return original(u,i)}
  await capture(f,async(m,d)=>{assert.equal(m.success,false);assert.equal(m.snapshot.requests,14);assert.equal(m.documents.length,13);assert.equal(m.snapshot.attempts.at(-1).status,'failed');const r=await api.verifyFussballBatchScreenDirectory(d);assert.equal(r.success,false);assert.deepEqual(r.leagues.map(x=>x.status),['SAMPLE_PASSED','HOLD'])})
 }
})
test('batch replay rejects corruption, scope/result edits, failed-run relabeling and unused documents',async()=>{
 for(const mutate of [
  (m,d)=>writeFileSync(join(d,m.documents[0].file),'corrupt'),
  m=>{m.options.leagues[1].season='2025/26'},
  (m,d)=>{const path=join(d,'batch-result.json'),r=JSON.parse(readFileSync(path));r.leagues[0].status='HOLD';const bytes=JSON.stringify(r)+'\n';writeFileSync(path,bytes);m.resultSha256=sha(bytes)},
  m=>{m.documents.push({...m.documents[0],url:`${B}/export.fontface/-/id/abcdefgh/type/css`})},
  m=>{m.snapshot.attempts[0].startedAt='invalid';m.documents[0].capturedAt='invalid'},
  m=>{m.documents[1].capturedAt=m.documents[0].capturedAt;m.snapshot.attempts[1].startedAt=m.documents[0].capturedAt},
 ]){const f=source();await capture(f,async(m,d)=>{mutate(m,d);writeFileSync(join(d,'batch-manifest.json'),JSON.stringify(m));await assert.rejects(()=>api.verifyFussballBatchScreenDirectory(d))})}
 await capture(source({budget:2}),async(m,d)=>{m.success=true;writeFileSync(join(d,'batch-manifest.json'),JSON.stringify(m));await assert.rejects(()=>api.verifyFussballBatchScreenDirectory(d),/success|stop|account/i)})
})
test('batch CLI rejects malformed/duplicate flags and validates the whole JSON scope before capture',async()=>{
 const cli=await import('./zajemi-fussball-paket.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e});assert.equal(typeof cli.runFussballBatchScreenCli,'function')
 const parent=mkdtempSync(join(tmpdir(),'slff-batch-cli-')),scope=join(parent,'scope.json'),output=join(parent,'batch')
 try{
  writeFileSync(scope,JSON.stringify([{...source().leagues[0]},{seedUrl:'https://evil.invalid/',staffel:S,season:'2026/27'}]))
  for(const args of [[],['capture','--leagues',scope],['capture','--leagues',scope,'--leagues',scope],['capture','--leagues',scope,'--max-requests','81','--reports','3','--output',output],['capture','--leagues',scope,'--max-requests','80','--reports','4','--output',output],['capture','--leagues',scope,'--max-requests','80','--reports','3','--output',output]])await assert.rejects(()=>cli.runFussballBatchScreenCli(args),/Use|Explicit|option|scope|budget|limit/)
 }finally{rmSync(parent,{recursive:true,force:true})}
})
test('a first-request refusal cannot hide a symbolic evidence directory',async()=>{
 const f=source();f.fetchFn=async()=>new Response('denied',{status:403})
 await capture(f,async(m,d)=>{const empty=join(d,'external-empty');mkdirSync(empty);rmSync(join(d,'documents'),{recursive:true});symlinkSync(empty,join(d,'documents'));await assert.rejects(()=>api.verifyFussballBatchScreenDirectory(d),/symbolic|regular|directory/)})
})
test('absolute batch verify CLI is cwd independent and terminal diagnostics retain a failing exit status',async()=>{
 const {spawnSync}=await import('node:child_process'),{fileURLToPath}=await import('node:url'),cli=fileURLToPath(new URL('./zajemi-fussball-paket.mjs',import.meta.url))
 for(const budget of [80,2])await capture(source({budget}),async(m,d)=>{const run=spawnSync(process.execPath,[cli,'verify',d],{cwd:tmpdir(),encoding:'utf8'});assert.equal(run.status,budget===80?0:1,run.stderr);const r=JSON.parse(run.stdout);assert.equal(r.verified,true);assert.equal(r.success,budget===80)})
})
