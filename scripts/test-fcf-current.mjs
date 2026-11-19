import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import * as fcf from './viri/fcf.mjs'
const fixture = name => gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107024-${name}.html.gz`, import.meta.url))).toString()
const html = fixture('report'), redirectHtml = fixture('redirect')
const url = 'https://www.fcf.cat/ca/competicio/acta/4107024'
const canonical = 'https://www.fcf.cat/ca/partit/2026-2027/lliga-elit/grup-1/jornada-8/vic-unio-esportiva-club-a-elit-vs-atletic-sant-just-f-c-a-elit'
const opts = { id: 'es4107024', url, redirectHtml }

test('retained redesigned report maps final score, header, stable IDs and substitution minutes', () => {
 const z = fcf.vZapisnik(html, opts)
 assert.ok(z, 'redesigned public report must parse')
 assert.equal(z.zapisnikId, 'es4107024')
 assert.deepEqual(z.rezultat,{domaci:2,gostje:3})
 assert.equal(z.datum,'2026-11-08'); assert.equal(z.ura,'18:30')
 assert.equal(z.sezona,'2026/27'); assert.equal(z.krog,8)
 assert.equal(z.tekmovanje,'LLIGA ELIT'); assert.equal(z.skupina,'GRUP 1')
 assert.equal(z.domaci.ime,'VIC UNIÓ ESPORTIVA CLUB')
 assert.equal(z.gostje.ime,'ATLETIC SANT JUST . F. C.')
 assert.equal(z.zaprt,true); assert.equal(z.nepopoln,false)
 assert.equal(z.domaci.postava.length,11); assert.equal(z.gostje.postava.length,11)
 assert.equal(z.domaci.postava[0].regSt,40629001)
 assert.equal(z.domaci.postava[0].vratar,true)
 assert.deepEqual(z.domaci.postava.find(p=>p.regSt===729797).preklopi,[46])
 assert.equal(z.goli.length,5)
 assert.ok(z.goli.some(g=>g.regSt===28200026&&g.minuta===84&&!g.avtogol))
})

test('retained numeric redirect proves one exact public canonical target', () => {
 assert.equal(typeof fcf.fcfPublicRedirect,'function')
 assert.equal(fcf.fcfPublicRedirect(redirectHtml,{id:'es4107024',url}),canonical)
})

// Mutate retained RSC strings, keeping page structure and source identity intact.
function rewriteRsc(source, fn) {
 return source.replace(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g, (_, raw) => `self.__next_f.push([1,${JSON.stringify(fn(JSON.parse(raw)))}])`)
}
for (const [name, transform] of [
 ['unknown final state', s=>s.replaceAll('FINALITZAT','SUSPÈS')],
 ['missing event minute', s=>s.replaceAll('46’','?')],
 ['unknown goal icon', s=>s.replaceAll('#00FF73','#123456')],
 ['invalid player identity', s=>s.replaceAll('40629001','no-id')],
 ['duplicate registration', s=>s.replaceAll('644513','40629001')],
 ['incomplete starting lineup', s=>s.replaceAll('"titular":"1"','"titular":"0"')],
 ['progressive score mismatch', s=>s.replaceAll('"2 - 3"','"2 - 4"')],
]) test(`${name} cannot be accepted as complete`,()=>{
 const z=fcf.vZapisnik(rewriteRsc(html,transform),opts)
 assert.equal(z.nepopoln,true)
})
for (const [name, options] of [
 ['missing redirect', {id:opts.id,url}],
 ['wrong numeric ID', {...opts,id:'es4107032',url:'https://www.fcf.cat/ca/competicio/acta/4107032'}],
 ['wrong requested URL', {...opts,url:'https://www.fcf.cat/ca/competicio/acta/4107032'}],
]) test(`${name} cannot relabel a canonical page`,()=>assert.throws(()=>fcf.vZapisnik(html,options),/identity/))
for (const target of ['https://evil.example'+new URL(canonical).pathname,'//evil.example/ca/partit/abc','https://www.fcf.cat:443'+new URL(canonical).pathname,'https://user@www.fcf.cat'+new URL(canonical).pathname,'/api/acta/4107024',new URL(canonical).pathname+'?x=1',new URL(canonical).pathname+'#x',new URL(canonical).pathname.replace('/ca/','/ca/../ca/')]) {
 test(`unsafe redirect rejected: ${target}`,()=>assert.throws(()=>fcf.fcfPublicRedirect(redirectHtml.replaceAll(new URL(canonical).pathname,target),opts),/identity/))
}
test('canonical route, league, round and team are checked against retained redirect',()=>{
 for(const [a,b]of [['jornada-8','jornada-9'],['LLIGA ELIT','PRIMERA CATALANA'],['vic-unio-esportiva-club-a-elit','other-club-a-elit']])
   assert.throws(()=>fcf.vZapisnik(html.replaceAll(a,b),opts),/identity/)
})
test('native reader follows only proven public meta redirect and retains numeric binding',async t=>{
 const calls=[], waits=[]
 t.mock.method(globalThis,'setTimeout',(cb,ms)=>{waits.push(ms);queueMicrotask(cb);return 1})
 t.mock.method(globalThis,'fetch',async (u,init)=>{calls.push({u,init});return new Response(calls.length===1?redirectHtml:html)})
 const response=await fcf.fcfFetch(url)
 const body=await response.text()
 assert.equal(body.length,html.length)
 assert.deepEqual(calls.map(x=>x.u),[url,canonical])
 assert.ok(calls.every(x=>x.init.redirect==='manual'))
 assert.ok(waits[0]>=3000)
 assert.equal(fcf.vZapisnik(body,{id:opts.id,url}).nepopoln,false)
})

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
const digest = s=>createHash('sha256').update(s).digest('hex')
function tempCache(t) {
 const before=process.cwd(), dir=mkdtempSync(join(tmpdir(),'fcf-current-'))
 process.chdir(dir);mkdirSync('scripts/.predpomnilnik/fcf',{recursive:true})
 t.after(()=>{process.chdir(before);rmSync(dir,{recursive:true,force:true})})
 return dir
}
const singleOptions = {id:opts.id, sezona:'2026/27', danes:Date.parse('2026-11-18T12:00:00Z'),tekmovanje:{slug:'es-ct-elit',source:'fcf',source_league_code:'4107024-4107024',sezona_koledarska:false}}
for (const reader of ['single', 'block']) test(`fresh cached redirect is resolved before ${reader} report admission`, async t => {
 tempCache(t)
 const file='scripts/.predpomnilnik/fcf/acta-4107024.html'
 writeFileSync(file,redirectHtml)
 const calls=[]
 t.mock.method(globalThis,'setTimeout',cb=>{queueMicrotask(cb);return 1})
 t.mock.method(globalThis,'fetch',async u=>{calls.push(u);return new Response(u===url?redirectHtml:html)})
 const fetchPage=async u=>(await fcf.fcfFetch(u)).text()
 const read=()=>reader==='single'?fcf.posamezniZapisnik('4107024-4107024',singleOptions)(fetchPage):fcf.default.zapisniki('4107024-4107024',fetchPage)
 const result=await read()
 assert.deepEqual(result.map(r=>r.id),['es4107024'])
 assert.deepEqual(calls,[url,canonical])
 assert.equal(readFileSync(file,'utf8'),html)
 assert.deepEqual((await read()).map(r=>r.id),['es4107024'])
 assert.equal(calls.length,2,'validated complete cached report must remain reusable')
})
for (const reader of ['single', 'block']) test(`cached redirect cannot mask a ${reader} source refusal`, async t => {
 tempCache(t)
 const file='scripts/.predpomnilnik/fcf/acta-4107024.html'
 writeFileSync(file,redirectHtml)
 let calls=0
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('forbidden',{status:403})})
 const fetchPage=async u=>(await fcf.fcfFetch(u)).text()
 const run=()=>reader==='single'?fcf.posamezniZapisnik('4107024-4107024',singleOptions)(fetchPage):fcf.default.zapisniki('4107024-4107024',fetchPage)
 await assert.rejects(run(),error=>error instanceof fcf.FcfZavrnitev && error.status===403)
 assert.equal(calls,1)
 assert.equal(readFileSync(file,'utf8'),redirectHtml,'refusal must not overwrite the retained cache')
})
for(const reader of ['single','block']) test(`native ${reader} provider holds incomplete migrated report before writer`,async t=>{
 tempCache(t)
 const broken=rewriteRsc(html,s=>s.replaceAll('46’','?'))
 let n=0
 t.mock.method(globalThis,'setTimeout',cb=>{queueMicrotask(cb);return 1})
 t.mock.method(globalThis,'fetch',async()=>new Response(++n===1?redirectHtml:broken))
 t.mock.method(console,'warn',()=>{})
 const fetchPage=async u=>(await fcf.fcfFetch(u)).text()
 const result=reader==='single'?await fcf.posamezniZapisnik('4107024-4107024',singleOptions)(fetchPage):await fcf.default.zapisniki('4107024-4107024',fetchPage)
 assert.deepEqual(result,[])
})
for(const [name,status,body] of [['refusal',403,'forbidden'],['rate limit',429,'slow down'],['challenge',200,'<title>Just a moment</title>'],['redirect chain',302,''],['wrong canonical',200,html.replaceAll('jornada-8','jornada-9')]]) test(`canonical ${name} stops without followup/retry`,async t=>{
 let n=0
 t.mock.method(globalThis,'setTimeout',cb=>{queueMicrotask(cb);return 1})
 t.mock.method(globalThis,'fetch',async()=>++n===1?new Response(redirectHtml):new Response(body,{status}))
 await assert.rejects(fcf.fcfFetch(url))
 assert.equal(n,2)
})
test('fresh-process cache proof must match final bytes, numeric source URL and original redirect',t=>{
 const dir=tempCache(t), p='scripts/.predpomnilnik/fcf/acta-4107024.redirect.json'
 writeFileSync('page.html',html)
 const proof={sha256:digest(html),id:opts.id,url,redirectHtml}
 const run=()=>spawnSync(process.execPath,['--input-type=module','-e',`import {readFileSync} from 'node:fs'; import {vZapisnik} from ${JSON.stringify(new URL('./viri/fcf.mjs',import.meta.url).href)}; vZapisnik(readFileSync('page.html','utf8'),${JSON.stringify({id:opts.id,url})});`],{cwd:dir,encoding:'utf8'})
 writeFileSync(p,JSON.stringify(proof));assert.equal(run().status,0)
 for(const patch of [{sha256:'0'.repeat(64)},{id:'es4107032'},{url:'https://www.fcf.cat/ca/competicio/acta/4107032'},{redirectHtml:redirectHtml.replaceAll('4107024','4107032')}]){
   writeFileSync(p,JSON.stringify({...proof,...patch}));assert.notEqual(run().status,0)
 }
})

test('missing substitution entry cannot give a substitute invented minutes',()=>{
 const changed=rewriteRsc(html,s=>s.replaceAll('"stroke":"#007AFF"','"stroke":"#007AFF-removed"'))
 assert.equal(fcf.vZapisnik(changed,opts).nepopoln,true)
})

test('second retained current report preserves penalty attribution and real minutes',()=>{
 const load=type=>gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107032-${type}.html.gz`,import.meta.url))).toString()
 const z=fcf.vZapisnik(load('report'),{id:'es4107032',url:'https://www.fcf.cat/ca/competicio/acta/4107032',redirectHtml:load('redirect')})
 assert.equal(z.nepopoln,false);assert.deepEqual(z.opozorila,[])
 assert.deepEqual(z.rezultat,{domaci:3,gostje:1});assert.equal(z.krog,9);assert.equal(z.datum,'2026-11-15')
 assert.ok(z.goli.some(g=>g.regSt===900008724&&g.minuta===83&&g.enajstmetrovka))
 const apps=fcf.nastopi(z)
 assert.equal(apps.find(p=>p.regSt===900008724).goliIzEnajstmetrovke,1)
 assert.ok(apps.every(p=>Number.isInteger(p.minute)&&p.minute>=0&&p.minute<=90))
 assert.deepEqual(z.opozorila,[])
})

// Remove an actual incoming substitution node; the opposite outgoing event
// remains. A parser may not infer or silently assign the missing minutes.
function removeEntry(source) {
 const rewrite=v=>{
  if(Array.isArray(v)&&v[0]==='$'&&v[1]==='div'&&v[3]?.className==='flex items-center gap-1'&&JSON.stringify(v).includes('#007AFF')&&JSON.stringify(v).includes('46’')) return null
  if(Array.isArray(v))return v.map(rewrite)
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,rewrite(x)]))
  return v
 }
 return rewriteRsc(source,stream=>stream.split('\n').map(line=>{
  const m=/^([0-9a-f]+):(\[.*|\{.*)$/.exec(line)
  if(!m)return line
  try{return m[1]+':'+JSON.stringify(rewrite(JSON.parse(m[2])))}catch{return line}
 }).join('\n'))
}
test('missing incoming substitution row holds report instead of fabricating playing time',()=>{
 const changed=removeEntry(html)
 assert.notEqual(changed.length,html.length)
 const z=fcf.vZapisnik(changed,opts)
 assert.equal(z.nepopoln,true)
})

test('pure existing single-report guard can validate retained redirect evidence without cache',()=>{
 const load=type=>gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107032-${type}.html.gz`,import.meta.url))).toString()
 const options={...singleOptions,id:'es4107032',redirectHtml:load('redirect'),tekmovanje:{...singleOptions.tekmovanje,source_league_code:'4107032-4107032'}}
 assert.equal(fcf.validateFcfSingleReportSource(load('report'),'4107032-4107032',options).krog,9)
})
test('known report header round cannot differ from its bound URL',()=>{
 const changed=rewriteRsc(html,s=>s.replaceAll('"Jornada ",8','"Jornada ",9'))
 assert.notEqual(fcf.tokRsc(changed),fcf.tokRsc(html))
 assert.throws(()=>fcf.vZapisnik(changed,opts),/identity/)
})

test('conflicting goal minutes between lineup and goals section hold the report',()=>{
 const changed=rewriteRsc(html,s=>s.replaceAll('84’','83’'))
 assert.notEqual(fcf.tokRsc(changed),fcf.tokRsc(html))
 assert.equal(fcf.vZapisnik(changed,opts).nepopoln,true)
})
test('held closed reports expire their cache for another normal scheduled attempt',()=>{
 const broken=rewriteRsc(html,s=>s.replaceAll('46’','?'))
 const g=fcf.glavaStrani(broken)
 assert.equal(fcf.najvecStarost(g,Date.parse('2026-11-18T12:00:00Z'),true),3600000)
})

function duplicateEventRows(source, color) {
 const isEvent = v => Array.isArray(v) && v[0] === '$' && v[1] === 'div' &&
   v[3]?.className === 'flex items-center gap-1' && JSON.stringify(v).includes(color)
 const rewrite = v => {
   if (Array.isArray(v)) return v.flatMap(x => isEvent(x) ? [rewrite(x), rewrite(x)] : [rewrite(x)])
   if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,rewrite(x)]))
   return v
 }
 return rewriteRsc(source, stream => stream.split('\n').map(line => {
   const m = /^([0-9a-f]+):(\[.*|\{.*)$/.exec(line)
   if (!m) return line
   try { return m[1] + ':' + JSON.stringify(rewrite(JSON.parse(m[2]))) } catch { return line }
 }).join('\n'))
}
for (const [name,color] of [['yellow','#FFEB3B'],['goal','#00FF73'],['incoming substitution','#007AFF']]) {
 test(`duplicated ${name} event rows cannot be imported as complete`, () => {
   const changed = duplicateEventRows(html,color)
   assert.notEqual(fcf.tokRsc(changed),fcf.tokRsc(html))
   const z = fcf.vZapisnik(changed,opts)
   if (name === 'yellow') assert.equal(z.rumeni.length,14, 'fixture must reproduce duplicated observed rows')
   assert.equal(z.nepopoln,true)
   assert.ok(z.opozorila.length > 0)
 })
}

test('penalty marker disagreement between lineup and goal timeline holds current report', () => {
 const load = type => gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107032-${type}.html.gz`,import.meta.url))).toString()
 const original = load('report')
 const options = {id:'es4107032',url:'https://www.fcf.cat/ca/competicio/acta/4107032',redirectHtml:load('redirect')}
 assert.equal(fcf.vZapisnik(original,options).goli.filter(g=>g.enajstmetrovka).length,1)
 const changed = rewriteRsc(original, stream => stream.replace(/^88:.*$/m, row => row.replaceAll('#82E4FF','#00FF73')))
 assert.notEqual(fcf.tokRsc(changed),fcf.tokRsc(original))
 const z = fcf.vZapisnik(changed,options)
 assert.equal(z.goli.filter(g=>g.enajstmetrovka).length,0,'mutation must remove only timeline penalty classification')
 assert.equal(z.nepopoln,true)
 assert.ok(z.opozorila.some(w=>/goal.*differ/.test(w)))
})

test('presentation whitespace in player team labels retains exact club identity',()=>{
 const changed=rewriteRsc(html,s=>s.replaceAll('"teamName":"VIC UNIÓ ESPORTIVA CLUB"','"teamName":"VIC UNIÓ ESPORTIVA CLUB "'))
 assert.notEqual(fcf.tokRsc(changed),fcf.tokRsc(html))
 assert.equal(fcf.vZapisnik(changed,opts).nepopoln,false)
})
function changeYellowClock(source, clock) {
 const rewrite = v => {
  if(Array.isArray(v)&&v[0]==='$'&&v[1]==='div'&&v[3]?.className==='flex items-center gap-1'&&JSON.stringify(v).includes('#FFEB3B')) return JSON.parse(JSON.stringify(v).replaceAll('47’',clock))
  if(Array.isArray(v))return v.map(rewrite)
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,rewrite(x)]))
  return v
 }
 return rewriteRsc(source,stream=>stream.split('\n').map(line=>{
  const m=/^([0-9a-f]+):(\[.*|\{.*)$/.exec(line)
  if(!m)return line
  try{return m[1]+':'+JSON.stringify(rewrite(JSON.parse(m[2])))}catch{return line}
 }).join('\n'))
}
test('observed numeric stoppage-time cards clamp output but keep source-minute identity',()=>{
 for(const minute of ['91’','92’']) {
  const changed=changeYellowClock(html,minute)
  const z=fcf.vZapisnik(changed,opts)
  assert.equal(z.nepopoln,false)
  assert.equal(z.rumeni.find(e=>e.regSt===644513).minuta,90)
 }
})
test('different stoppage minutes on one player do not become duplicate events after clamping',()=>{
 const changed=rewriteRsc(duplicateEventRows(html,'#FFEB3B'),s=>{
  let found=0
  return s.replaceAll('47’',()=>++found===1?'91’':'92’')
 })
 const z=fcf.vZapisnik(changed,opts)
 assert.equal(z.rumeni.filter(e=>e.regSt===644513).length,2)
 assert.equal(z.opozorila.some(w=>w.includes('duplicate player event for 644513')),false)
})

// SLF-621: held reports from the 18 Nov ES run (incident cache, read offline).
const heldFixture=(id,type)=>gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-${id}-${type}.html.gz`,import.meta.url))).toString()
const heldReport=id=>fcf.vZapisnik(heldFixture(id,'report'),{id:'es'+id,url:'https://www.fcf.cat/ca/competicio/acta/'+id,redirectHtml:heldFixture(id,'redirect')})
test('substitute who comes on and scores in the same minute has a playing interval',()=>{
 const z=heldReport('4116973')
 assert.deepEqual(z.opozorila,[]);assert.equal(z.nepopoln,false)
 assert.deepEqual(z.domaci.rezerve.find(p=>p.regSt===645660).preklopi,[46,78])
 assert.ok(z.goli.some(g=>g.regSt===645660&&g.minuta===46))
})
test('first-half stoppage goal sorts before a 46 minute substitution',()=>{
 const changed=rewriteRsc(html,s=>s.replaceAll('47’','45+2’').replaceAll("47'","45+2'").replaceAll('78’','46’'))
 assert.notEqual(fcf.tokRsc(changed),fcf.tokRsc(html))
 assert.deepEqual(fcf.vZapisnik(changed,opts).opozorila,[])
})
test('goal by a listed substitute without a substitution stays held',()=>{
 const z=heldReport('4147658')
 assert.equal(z.nepopoln,true)
 assert.ok(z.opozorila.includes('nepopoln: goal without known playing interval for 15721270'))
 assert.ok(z.opozorila.includes('nepopoln: missing starting lineup'))
})
