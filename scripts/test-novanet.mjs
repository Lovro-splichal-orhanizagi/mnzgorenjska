import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { preglejZapisnik, vZapisnik, jeIzziv, ustvariVir } from './viri/novanet.mjs'
const fixture = (name) => readFileSync(new URL(`./vzorci/es-novanet-${['aragon-940027','galicia-1446110'].includes(name)?`${name}-full`:name}.html`, import.meta.url), 'utf8')
const ar = fixture('aragon-940027')
const ga = fixture('galicia-1446110')
test('Aragón real report: metadata, decoy-free result, identities and own goal', () => {
 const z = preglejZapisnik(ar, { zveza: 'aragon' })
 assert.equal(z.domaci.ime, 'CUARTE-C.D.')
 assert.equal(z.gostje.ime, 'EL GANCHO C.F.')
 assert.equal(z.datum, '2026-10-04')
 assert.equal(z.ura, '19:30')
 assert.equal(z.krog, 5)
 assert.deepEqual(z.rezultat, { domaci: 4, gostje: 0 })
 assert.equal(z.zapisnikId, 'es-novanet-aragon-940027')
 assert.equal(z.domaci.postava.length, 11)
 assert.equal(z.domaci.postava[0].regSt, -1010000634315)
 assert.equal(z.domaci.postava[0].vratar, null)
 assert.equal(z.domaci.postava[0].ime, 'SOLBES ALLOZA, EMILIO')
 assert.equal(z.goli.length, 4)
 assert.equal(z.goli[2].enajstmetrovka, true)
 assert.equal(z.goli[3].avtogol, true)
 assert.equal(z.goli[3].ekipaIdx, 1)
 assert.equal(z.menjave[0].minuta, 74)
 assert.equal(z.domaci.postava.find(p => p.st === 20).minute, 74)
 assert.equal(z.domaci.rezerve.find(p => p.st === 91).minute, 16)
 assert.equal(z.rumeni.length, 8)
})
test('Galicia real report independently identified result and player', () => {
 const z = preglejZapisnik(ga, { zveza: 'galicia' })
 assert.equal(z.domaci.ime, 'C.D. ALLARIZ')
 assert.equal(z.gostje.ime, 'C.D. SEIXALBO')
 assert.equal(z.datum, '2026-09-19')
 assert.equal(z.krog, 3)
 assert.deepEqual(z.rezultat, { domaci: 2, gostje: 0 })
 assert.equal(z.domaci.postava[0].regSt, -1020000148494)
})
test('unknown keeper stays unknown and second yellow ends valid minutes', () => {
 const z=vZapisnik(ar,{zveza:'aragon'})
 assert.equal(z.domaci.postava[0].vratar,null)
 assert.equal(z.rdeci.length,1)
 assert.equal(z.rdeci[0].drugiRumeni,true)
 assert.equal(z.rdeci[0].minuta,79)
 assert.equal(z.gostje.rezerve.find(p=>p.ime==='MUÑOZ ZEUFACK, YANNICK').minute,34)
 assert.equal(z.osebje[0].ime,'MAQUEDA HERRERO, ALEJANDRO')
})
test('missing identity, truncated report, wrong scope and inconsistent score reject', () => {
 assert.throws(() => preglejZapisnik(ar.replace('jugador=634315', 'jugador='), { zveza:'aragon' }), /igral|postav|identit/)
 assert.throws(() => preglejZapisnik(ar.slice(0, ar.length / 2), { zveza:'aragon' }), /nepopoln/)
 assert.throws(() => preglejZapisnik(ar, { zveza:'galicia' }), /zveza/)
 assert.throws(() => preglejZapisnik(ar.replace('content:"\\0034"', 'content:"\\0035"'), { zveza:'aragon' }), /izid|goli/)
})
test('challenge rejects before metadata and unknown federation rejects', () => {
 assert.equal(jeIzziv('<title>Just a moment...</title>'), true)
 assert.throws(() => preglejZapisnik('<title>Just a moment...</title>'), /izziv/)
 assert.throws(() => preglejZapisnik(ar, { zveza:'other' }), /zveza/)
})
test('second real Aragón report and round agree', async () => {
 const { razcleniKrog } = await import('./viri/novanet.mjs')
 const r=razcleniKrog(fixture('aragon-round4'), {zveza:'aragon'})
 assert.equal(r.koda,'aragon:22:23183364:23183365')
 assert.equal(r.stevilka,4)
 assert.equal(r.krogi.length,30)
 const t=r.tekme.find(t=>t.virId==='953743')
 assert.deepEqual(t.izid,{domaci:5,gostje:1})
 assert.equal(t.domaci,'SAN MATEO-C.D.')
 assert.equal(t.gostje,'RACING HISPANIDAD')
 const z=preglejZapisnik(fixture('aragon-953743'),{zveza:'aragon'})
 assert.equal(z.domaci.ime,t.domaci)
 assert.equal(z.gostje.ime,t.gostje)
 assert.equal(z.datum,t.datum)
 assert.equal(z.ura,t.ura)
 assert.deepEqual(z.rezultat,t.izid)
})
test('report/round pairs agree on match details; contradictory season selection rejects', async () => {
 const {razcleniKrog}=await import('./viri/novanet.mjs')
 for(const [zveza,id,round]of[['aragon','940027',5],['aragon','953743',4],['galicia','1446110',3],['galicia','1448233',1]]){
  const r=razcleniKrog(fixture(`${zveza}-round${round}`),{zveza})
  const z=vZapisnik(fixture(`${zveza}-${id}`),{zveza})
  if(id==='940027')assert.throws(()=>vZapisnik(fixture(`${zveza}-${id}`),{zveza,sezona:r.sezona}),/sezona/)
  else assert.equal(z.sezonaZacetek,r.sezona)
  const t=r.tekme.find(t=>t.virId===id)
  assert.equal(t.domaci,z.domaci.ime)
  assert.equal(t.gostje,z.gostje.ime)
  assert.equal(t.datum,z.datum)
  assert.equal(t.ura,z.ura)
  assert.deepEqual(t.izid,z.rezultat)
 }
})
// Synthetic traversal reduction only: retain an unchanged real match table,
// active scope bindings and report; limit the round selector to that real round.
function singleMatchRound(){
 let html=fixture('galicia-round1')
 const formula=[...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(m=>m[0]).find(s=>s.includes('eval(function(p,a,c,k,e,d)'))
 const spans=[],stack=[]
 for(const m of html.matchAll(/<\/?table\b[^>]*>/gi)){
  if(/^<\//.test(m[0])){const start=stack.pop();if(start!=null)spans.push({start,end:m.index+m[0].length})}
  else stack.push(m.index)
 }
 const removals=spans.filter(({start,end})=>{
  const s=html.slice(start,end)
  return (s.match(/class=(?:["']font_widgetV["']|font_widgetV)[\s>]/g)??[]).length===1&&!s.includes('CodActa=1448233')
 })
 for(const {start,end}of removals.sort((a,b)=>b.start-a.start))html=html.slice(0,start)+html.slice(end)
 html=html.replace(/<head>/i,`<head>${formula}`)
 const select=html.match(/(<select\b[^>]*name=jornada[^>]*>)([\s\S]*?)(<\/select>)/i)
 const option=select[2].match(/<option value=1>[\s\S]*?<\/option>/i)[0]
 return html.replace(select[0],`${select[1]}${option}${select[3]}`)
}
test('source contract traverses round, parses report and computes usable statistics',async()=>{
 const vir=ustvariVir({predpomnilnik:false})
 const round=singleMatchRound(),calls=[]
 const prenesi=async(url,name,fresh)=>{calls.push({url,name,fresh});return url.includes('NFG_CmpJornada')?round:fixture('galicia-1448233')}
 const out=await vir.zapisniki('galicia:22:26990830:27759837',prenesi)
 assert.equal(out.length,1)
 assert.equal(out[0].id,'es-novanet-galicia-1448233')
 const appearances=vir.nastopi(out[0].z)
 assert.ok(appearances.length>=22)
 assert.ok(appearances.every(p=>p.minute>=0&&p.minute<=90))
 assert.equal(appearances.reduce((sum,p)=>sum+p.goli+p.avtogoli,0),5)
 assert.ok(calls.every(c=>c.fresh===true))
 assert.equal(vir.zaPredpomnilnik(round),false)
 const schedule=await vir.razporedVseStrani('galicia:22:26990830:27759837',prenesi)
 assert.equal(schedule[0].tekme[0].domaci,'A.D. RIO OURO (Galicia)')
})
test('source rejects cross-document mismatch, access denial and truncated cached pages',async()=>{
 const vir=ustvariVir({predpomnilnik:false})
 const round=singleMatchRound(),code='galicia:22:26990830:27759837'
 await assert.rejects(vir.zapisniki(code,async(url)=>url.includes('NFG_CmpJornada')?round:fixture('galicia-1446110')),/ne ujemata/)
 for(const status of[401,403,429])await assert.rejects(vir.zapisniki(code,async()=>{throw Object.assign(new Error('denied'),{status})}),e=>e.zavrnitev&&e.status===status)
 await assert.rejects(vir.zapisniki(code,async()=>round.slice(0,-20)),/nepopoln/)
 await assert.rejects(vir.zapisniki(code,async()=>'<title>Just a moment</title>'),e=>e.zavrnitev)
})
test('missing scorer, damaged score script, unknown card icon and impossible changes reject',()=>{
 assert.throws(()=>vZapisnik(ar.replace(' ALGABA LOPEZ, ALEJANDRO </td>',' UNKNOWN, PLAYER </td>'),{zveza:'aragon'}),/igralec/)
 assert.throws(()=>vZapisnik(ar.replace('tarj_amar.gif','tarj_unknown.gif'),{zveza:'aragon'}),/ikona/)
 assert.throws(()=>vZapisnik(ar.replace('ntype("idh415046",5,0','ntype("idh415046",500,0'),{zveza:'aragon'}),/indeks/)
 assert.throws(()=>vZapisnik(ar.replace('<td class=font_responsive>BECERRIL CORZAN, JORGE</td>','<td class=font_responsive>ALGABA LOPEZ, ALEJANDRO</td>'),{zveza:'aragon'}),/menjav|igralca/)
 const duplicated=ar.replace(/(<h4>Sustituciones<\/h4>\s*)(<table\b[\s\S]*?<\/table>)/i,'$1$2$2')
 assert.throws(()=>vZapisnik(duplicated,{zveza:'aragon'}),/časovnica/)
})
test('registration namespace is numeric, safe and disjoint from raw Spain IDs',async()=>{
 const {registracija,naslovZapisnika,razberiKodo}=await import('./viri/novanet.mjs')
 assert.notEqual(registracija('aragon',123),registracija('galicia',123))
 assert.ok(Number.isSafeInteger(registracija('aragon',9999999999)))
 assert.ok(registracija('aragon',123)<0)
 assert.throws(()=>registracija('aragon',10000000000),/identiteta/)
 assert.throws(()=>naslovZapisnika('aragon:22:1:2','es-novanet-galicia-123'),/zveza/)
 assert.throws(()=>razberiKodo('aragon:22:1:2&evil=1'),/šifra/)
})
test('fetch decodes source charset and rejects access denial or unknown encoding',async()=>{
 const {novanetFetch}=await import('./viri/novanet.mjs')
 const original=globalThis.fetch
 try{
  globalThis.fetch=async(_url,options)=>{
   assert.ok(options.signal instanceof AbortSignal)
   return new Response(Uint8Array.from([77,85,209,79,90]),{headers:{'content-type':'text/html; charset=ISO-8859-15'}})
  }
  assert.equal(await(await novanetFetch('https://www.futbolaragon.com/')).text(),'MUÑOZ')
  globalThis.fetch=async()=>new Response('denied',{status:401})
  await assert.rejects(novanetFetch('https://www.futbolaragon.com/'),e=>e.zavrnitev&&e.status===401)
  globalThis.fetch=async()=>new Response('hello',{headers:{'content-type':'text/html; charset=x-unknown'}})
  await assert.rejects(novanetFetch('https://www.futbolaragon.com/'),/nabor znakov/)
 }finally{globalThis.fetch=original}
})
test('unfinalized scores do not silently become completed imports',async()=>{
 const {razcleniKrog}=await import('./viri/novanet.mjs')
 assert.throws(()=>razcleniKrog(fixture('aragon-round4').replace('class="wid2_resultado_cerrada ntype"','class="wid2_resultado_prov ntype"'),{zveza:'aragon'}),/provisionalni/)
})
test('consumer minutes equal validated intervals across every real fixture',async()=>{
 const vir=ustvariVir({predpomnilnik:false})
 for(const [zveza,id]of[['aragon','940027'],['aragon','953743'],['galicia','1446110'],['galicia','1448233']]){
  const z=vZapisnik(fixture(`${zveza}-${id}`),{zveza})
  const app=vir.nastopi(z)
  assert.equal(app.reduce((n,p)=>n+p.rumeni,0),z.rumeni.length,`${id}: yellow cards`)
  assert.equal(app.reduce((n,p)=>n+p.rdeci,0),z.rdeci.length,`${id}: red cards`)
  for(const p of[...z.domaci.postava,...z.domaci.rezerve,...z.gostje.postava,...z.gostje.rezerve]){
   const a=app.find(a=>a.regSt===p.regSt)
   assert.equal(a?.minute??0,p.minute,`${id}/${p.ime}`)
  }
 }
})
test('round class tokens are supported and malformed candidate matches never disappear',async()=>{
 const {razcleniKrog}=await import('./viri/novanet.mjs')
 const html=fixture('aragon-round4')
 const expected=razcleniKrog(html,{zveza:'aragon'})
 const extra=html.replace('class=font_widgetL>','class="font_widgetL extra">')
 assert.deepEqual(razcleniKrog(extra,{zveza:'aragon'}),expected)
 const missing=html.replace('class=font_widgetL>','class=unexpected_name>')
 assert.throws(()=>razcleniKrog(missing,{zveza:'aragon'}),/nepopoln.*ekip/)
 const missingAway=html.replace('class=font_widgetV>','class=unexpected_name>')
 assert.throws(()=>razcleniKrog(missingAway,{zveza:'aragon'}),/nepopoln.*ekip/)
 const nested=html.replace('class=font_widgetL>','class=font_widgetL><table><tr><td>unexpected</td></tr></table>')
 assert.throws(()=>razcleniKrog(nested,{zveza:'aragon'}),/nepopoln.*ekip/)
})
test('unused reserve cards produce explicit zero-minute appearances without invented play',()=>{
 const changed=ar.replace("<span class=font-blue>(24')</span> MORENILLA GERIQUE, LUCAS", "<span class=font-blue>(24')</span> JIMENEZ ORTEGA, RUBEN")
 assert.notEqual(changed,ar)
 const z=vZapisnik(changed,{zveza:'aragon'}),vir=ustvariVir({predpomnilnik:false})
 const bench=vir.nastopi(z).find(p=>p.ime==='JIMENEZ ORTEGA, RUBEN')
 assert.equal(bench.minute,0);assert.equal(bench.minutaOd,0);assert.equal(bench.minutaDo,0)
 assert.equal(bench.rumeni,1);assert.equal(bench.cleanSheet,false);assert.equal(bench.prejetiGoli,0)
 assert.equal(bench.zacetnik,false)
 const red=vZapisnik(changed.replace('tarj_amar.gif','tarj_roja.gif'),{zveza:'aragon'})
 const sent=vir.nastopi(red).find(p=>p.ime==='JIMENEZ ORTEGA, RUBEN')
 assert.equal(sent.minute,0);assert.equal(sent.rdeci,1)
})
function addGuestRed(html,minute,name='PEREZ CAMACHO, MIGUEL'){
 const start=html.lastIndexOf('<h4>Tarjetas</h4>')
 const end=html.indexOf('</table>',start)
 return html.slice(0,end)+`<tr><td><img src="tarj_roja.gif"></td><td><span class=font-blue>(${minute})</span> ${name}</td></tr>`+html.slice(end)
}
test('stoppage ordering rejects goal or substitution after dismissal',()=>{
 const afterRed=addGuestRed(ar.replace("(83')</span> PEREZ CAMACHO, MIGUEL","(90'+5)</span> PEREZ CAMACHO, MIGUEL"),"90'+1")
 assert.throws(()=>vZapisnik(afterRed,{zveza:'aragon'}),/gol po izključitvi/)
 const beforeRed=addGuestRed(ar.replace("(83')</span> PEREZ CAMACHO, MIGUEL","(90'+1)</span> PEREZ CAMACHO, MIGUEL"),"90'+5")
 assert.equal(vZapisnik(beforeRed,{zveza:'aragon'}).goli[3].minuta,90)
 const subAfterRed=addGuestRed(ar.replace("(54')</span> GARCIA JUNQUERA, ANGEL","(90'+5)</span> GARCIA JUNQUERA, ANGEL"),"90'+1",'GARCIA JUNQUERA, ANGEL')
 assert.throws(()=>vZapisnik(subAfterRed,{zveza:'aragon'}),/časovnica/)
})
test('45+5 remains before46 while both retain fantasy base minutes',()=>{
 const changed=ar.replace("(42')</span> MONTERO DEL AMA, DAVID","(45'+5)</span> MONTERO DEL AMA, DAVID").replace("(45')</span> ALGABA LOPEZ, ALEJANDRO","(46')</span> ALGABA LOPEZ, ALEJANDRO")
 const z=vZapisnik(changed,{zveza:'aragon'})
 assert.equal(z.goli[1].cas,4505)
 assert.equal(z.goli[2].cas,4600)
 assert.equal(z.goli[1].minuta,45)
 assert.equal(z.goli[2].minuta,46)
})
test('round enumeration cannot skip a round and selected season label must agree with report',async()=>{
 const {razcleniKrog}=await import('./viri/novanet.mjs')
 const missing=fixture('aragon-round4').replace(/<option value=2>\s*2 - [^<]*<\/option>/,'')
 assert.throws(()=>razcleniKrog(missing,{zveza:'aragon'}),/seznam krogov/)
 const r=razcleniKrog(fixture('aragon-round5'),{zveza:'aragon'})
 assert.equal(r.sezona,2025)
 assert.throws(()=>vZapisnik(ar,{zveza:'aragon',sezona:r.sezona}),/sezona/)
})
test('schedule import rejects source-season contradictions before returning rounds',async()=>{
 const vir=ustvariVir({predpomnilnik:false})
 // Original active season21 label2025-2026 and every original date retained;
 // only select the first requested round so traversal reaches season validation.
 const prenesi=async(url)=>{
  const n=new URL(url).searchParams.get('CodJornada')
  return fixture('aragon-round5')
   .replace(/(Select_Preselecciona\(document\.getElementById\("jornada"\),")5("\))/,(_m,a,b)=>`${a}${n}${b}`)
   .replace(/CodActa=(\d+)/g,(_m,id)=>`CodActa=${id}${n}`)
 }
 await assert.rejects(vir.razporedVseStrani('aragon:21:23183349:23183350',prenesi),/obdobje sezone/)
})
test('schedule import independently checks selector dates and actual match dates',async()=>{
 const vir=ustvariVir({predpomnilnik:false})
 const code='galicia:22:26990830:27759837',page=singleMatchRound()
 const matchOutside=page.replace(/(<span\b[^>]*class=["']?horario["']?[^>]*>\s*)26-09-2026/,(_m,a)=>`${a}26-09-2028`)
 assert.notEqual(matchOutside,page)
 await assert.rejects(vir.razporedVseStrani(code,async()=>matchOutside),/obdobje sezone/)
 const selectorOutside=page.replace(/(<option value=1>[^<]*)2026/,(_m,a)=>`${a}2028`)
 assert.notEqual(selectorOutside,page)
 await assert.rejects(vir.razporedVseStrani(code,async()=>selectorOutside),/obdobje sezone/)
})
test('persisted club names and keys distinguish Novanet federations and raw FCF names',async()=>{
 const {imeKlubaZaUvoz}=await import('./viri/novanet.mjs');const vir=ustvariVir({predpomnilnik:false})
 const raw='C.D. SAN JOSE',a=imeKlubaZaUvoz(raw,'aragon'),g=imeKlubaZaUvoz(raw,'galicia')
 assert.equal(a,'C.D. SAN JOSE (Aragón)')
 assert.equal(g,'C.D. SAN JOSE (Galicia)')
 assert.notEqual(a,g)
 assert.notEqual(vir.kljucKluba(a),vir.kljucKluba(g))
 assert.notEqual(vir.kljucKluba(a),vir.kljucKluba(raw))
 assert.notEqual(vir.kljucKluba(g),vir.kljucKluba(raw))
 assert.equal(vir.kratkoIme(a),raw)
 assert.equal(vir.kratkoIme(g),raw)
 assert.equal(vir.poenostavi,vir.kljucKluba)
})
test('schedule, report and appearances persist the same federation-qualified clubs',async()=>{
 const vir=ustvariVir({predpomnilnik:false})
 const read=async(url)=>url.includes('NFG_CmpJornada')?singleMatchRound():fixture('galicia-1448233')
 const code='galicia:22:26990830:27759837'
 const schedule=await vir.razporedVseStrani(code,read),reports=await vir.zapisniki(code,read)
 assert.equal(schedule[0].tekme[0].domaci,'A.D. RIO OURO (Galicia)')
 assert.equal(reports[0].z.domaci.ime,schedule[0].tekme[0].domaci)
 assert.equal(reports[0].z.gostje.ime,schedule[0].tekme[0].gostje)
 assert.equal(vir.nastopi(reports[0].z)[0].ekipa,reports[0].z.domaci.ime)
 assert.equal(vZapisnik(fixture('galicia-1448233'),{zveza:'galicia'}).domaci.ime,'A.D. RIO OURO')
})
test('consumer report season uses canonical database2026/27 representation',async()=>{
 const z=vZapisnik(fixture('galicia-1448233'),{zveza:'galicia',sezona:2026})
 assert.equal(z.sezona,'2026/27')
 assert.equal(z.sezonaZacetek,2026)
 const vir=ustvariVir({predpomnilnik:false})
 const out=await vir.zapisniki('galicia:22:26990830:27759837',async(url)=>url.includes('NFG_CmpJornada')?singleMatchRound():fixture('galicia-1448233'))
 assert.equal(out[0].z.sezona,'2026/27')
})
test('validated source cache reuses full reports, refreshes schedules and recent reports',async()=>{
 const {ustvariVir}=await import('./viri/novanet.mjs')
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path')
 const dir=mkdtempSync(join(tmpdir(),'novanet-source-'));let now=Date.parse('2026-09-27T12:00Z'),calls=[]
 try{
  const vir=ustvariVir({predpomnilnik:dir,danes:()=>now})
  const read=async(url)=>{calls.push(url);return url.includes('NFG_CmpJornada')?singleMatchRound():fixture('galicia-1448233')}
  const code='galicia:22:26990830:27759837'
  await vir.zapisniki(code,read);assert.equal(calls.length,2)
  await vir.zapisniki(code,read);assert.equal(calls.length,2)
  now+=16*60_000;await vir.zapisniki(code,read);assert.equal(calls.length,3)
  now+=60*60_000;await vir.zapisniki(code,read);assert.equal(calls.length,5)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('known missing reports withhold whole match, warn NEPOPOLN and retry next run',async()=>{
 const warnings=[],vir=ustvariVir({predpomnilnik:false,opozori:m=>warnings.push(m)}),code='galicia:22:26990830:27759837'
 let missing=true
 const read=async(url)=>{
  if(url.includes('NFG_CmpJornada'))return singleMatchRound()
  if(missing)throw Object.assign(new Error('not found'),{status:404})
  return fixture('galicia-1448233')
 }
 await assert.rejects(vir.zapisniki(code,read),e=>e.code==='NOVANET_ALL_WITHHELD')
 assert.equal(vir.nepopolni.length,1)
 assert.match(warnings[0],/zapisnik nepopoln/)
 missing=false
 assert.equal((await vir.zapisniki(code,read)).length,1)
 assert.equal(vir.nepopolni.length,0)
})
test('known missing lineup withholds match; unknown event format still fails league closed',async()=>{
 const warnings=[],vir=ustvariVir({predpomnilnik:false,opozori:m=>warnings.push(m)}),code='galicia:22:26990830:27759837'
 const original=fixture('galicia-1448233')
 const partial=original.replace(/(<h5><strong>Titulares<\/strong><\/h5>\s*<table\b[^>]*>)[\s\S]*?(<\/table>)/i,'$1$2')
 assert.notEqual(partial,original)
 await assert.rejects(vir.zapisniki(code,async(url)=>url.includes('NFG_CmpJornada')?singleMatchRound():partial),e=>e.code==='NOVANET_ALL_WITHHELD')
 assert.equal(vir.nepopolni.length,1)
 await assert.rejects(vir.zapisniki(code,async(url)=>url.includes('NFG_CmpJornada')?singleMatchRound():original.replace('tarj_amar.gif','tarj_unknown.gif')),/ikona/)
})
test('first-three-day report never becomes a long-lived cache without a fresh validation',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path')
 const dir=mkdtempSync(join(tmpdir(),'novanet-day3-'));let now=Date.parse('2026-09-27T12:00Z'),reports=0
 try{
  const vir=ustvariVir({predpomnilnik:dir,danes:()=>now})
  const read=async(url)=>{if(url.includes('NFG_CmpJornada'))return singleMatchRound();reports++;return fixture('galicia-1448233')}
  const code='galicia:22:26990830:27759837'
  await vir.zapisniki(code,read);assert.equal(reports,1)
  now+=4*86_400_000;await vir.zapisniki(code,read);assert.equal(reports,2)
  now+=86_400_000;await vir.zapisniki(code,read);assert.equal(reports,2)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('expired cache never falls back on challenge or caches incomplete reports',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path')
 const dir=mkdtempSync(join(tmpdir(),'novanet-expired-'));let now=Date.parse('2026-09-27T12:00Z'),mode='full',reports=0
 try{
  const vir=ustvariVir({predpomnilnik:dir,danes:()=>now,opozori:()=>{}}),code='galicia:22:26990830:27759837'
  const read=async(url)=>{
   if(mode==='challenge')return '<title>Just a moment</title>'
   if(url.includes('NFG_CmpJornada'))return singleMatchRound()
   reports++
   return mode==='missing'?fixture('galicia-1448233').replace(/(<h5><strong>Titulares<\/strong><\/h5>\s*<table\b[^>]*>)[\s\S]*?(<\/table>)/i,'$1$2'):fixture('galicia-1448233')
  }
  await vir.zapisniki(code,read)
  now+=2*3_600_000;mode='challenge'
  await assert.rejects(vir.zapisniki(code,read),e=>e.zavrnitev)
  mode='missing';await assert.rejects(vir.zapisniki(code,read),e=>e.code==='NOVANET_ALL_WITHHELD');assert.equal(reports,2)
  mode='full';assert.equal((await vir.zapisniki(code,read)).length,1);assert.equal(reports,3)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('recognized full header with no roster identities is withheld, not guessed',async()=>{
 const vir=ustvariVir({predpomnilnik:false,opozori:()=>{}})
 const empty=fixture('galicia-1448233').replace(/<tr\b[^>]*onclick="location.href='NFG_EstadisticasJugador[^>]*>[\s\S]*?<\/tr>/gi,'')
 assert.notEqual(empty,fixture('galicia-1448233'))
 await assert.rejects(vir.zapisniki('galicia:22:26990830:27759837',async(url)=>url.includes('NFG_CmpJornada')?singleMatchRound():empty),e=>e.code==='NOVANET_ALL_WITHHELD')
 assert.equal(vir.nepopolni.length,1)
})
test('non-OK plain responses retain status for missing-report policy and shared retries',async()=>{
 const {novanetFetch}=await import('./viri/novanet.mjs'),original=globalThis.fetch
 try{
  for(const status of[404,503]){
   globalThis.fetch=async()=>new Response('plain failure',{status,headers:{'content-type':'text/plain'}})
   const response=await novanetFetch('https://www.futgal.es/')
   assert.equal(response.status,status);assert.equal(response.ok,false)
  }
 }finally{globalThis.fetch=original}
})
test('goal progressive score survives in consumer rezultat field',()=>{
 const z=vZapisnik(ar,{zveza:'aragon'})
 assert.deepEqual(z.goli.map(g=>g.rezultat),[[1,0],[2,0],[3,0],[4,0]])
})
test('withholding every played match makes the nightly source run fail explicitly',async()=>{
 const vir=ustvariVir({predpomnilnik:false,opozori:()=>{}})
 await assert.rejects(vir.zapisniki('galicia:22:26990830:27759837',async(url)=>{
  if(url.includes('NFG_CmpJornada'))return singleMatchRound()
  throw Object.assign(new Error('missing'),{status:404})
 }),e=>e.nepopoln&&e.code==='NOVANET_ALL_WITHHELD'&&e.nepopolni.length===1&&e.nepopolni[0].status===404)
})
test('re-entry is rejected because consumer stores one continuous on/off interval',()=>{
 const changed=ar.replace("(45')</span> ALGABA LOPEZ, ALEJANDRO","(50')</span> ALGABA LOPEZ, ALEJANDRO")
  .replace('<td align=center class=font_responsive>17</td> <td class=font_responsive>CORTES BRUNA, IGNACIO</td>','<td align=center class=font_responsive>8</td> <td class=font_responsive>MAQUEDA HERRERO, HECTOR</td>')
 assert.notEqual(changed,ar)
 assert.throws(()=>vZapisnik(changed,{zveza:'aragon'}),/ponovni vstop/)
})
test('shared downloader sees raw404 and retries raw503 through novanetFetch',async()=>{
 const {novanetFetch}=await import('./viri/novanet.mjs'),{prenesiSPonovitvami,pozabiPadle}=await import('./prenos.mjs')
 const original=globalThis.fetch;let attempts=0
 try{
  pozabiPadle();globalThis.fetch=async()=>{attempts++;return new Response('missing',{status:404,headers:{'content-type':'text/plain'}})}
  const missing=await prenesiSPonovitvami('https://www.futgal.es/test404',{fetchFn:novanetFetch,zamiki:[0],log:()=>{}})
  assert.equal(missing.status,404);assert.equal(attempts,1)
  attempts=0;globalThis.fetch=async()=>{
   attempts++
   return attempts===1?new Response('temporarily unavailable',{status:503,headers:{'content-type':'text/plain'}}):new Response('valid',{headers:{'content-type':'text/html; charset=utf-8'}})
  }
  const success=await prenesiSPonovitvami('https://www.futgal.es/test503',{fetchFn:novanetFetch,zamiki:[0],log:()=>{}})
  assert.equal(success.status,200);assert.equal(attempts,2)
 }finally{globalThis.fetch=original;pozabiPadle()}
})
test('one valid match can import while other known reports are withheld',async()=>{
 const vir=ustvariVir({predpomnilnik:false,opozori:()=>{}}),original=fixture('galicia-round1')
 const select=original.match(/(<select\b[^>]*name=jornada[^>]*>)([\s\S]*?)(<\/select>)/i),first=select[2].match(/<option value=1>[\s\S]*?<\/option>/i)[0]
 const round=original.replace(select[0],`${select[1]}${first}${select[3]}`)
 const reports=await vir.zapisniki('galicia:22:26990830:27759837',async(url)=>{
  if(url.includes('NFG_CmpJornada'))return round
  if(url.includes('CodActa=1448233&'))return fixture('galicia-1448233')
  throw Object.assign(new Error('missing'),{status:404})
 })
 assert.equal(reports.length,1);assert.equal(vir.nepopolni.length,4)
})
