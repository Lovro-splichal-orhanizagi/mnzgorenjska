// Read-only release audit. Never imports database modules or writes statistics.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { prenesiSPonovitvami } from './prenos.mjs'

const key = (k,d,g) => JSON.stringify([k,d,g])
export function preveriPokritost({sezona,razpored,zapisniki,nepopolni=[]}) {
 const napake=[],klubi=new Set(),keepers=new Set(),expected=new Map(),seen=new Set(),ids=new Set()
 let postavPo11=0,golov=0,menjav=0,rumenih=0,rdecih=0
 if(!/^20\d{2}\/\d{2}$/.test(sezona))napake.push('neveljavna pričakovana sezona')
 for(const r of razpored)for(const t of r.tekme){
  klubi.add(t.domaci);klubi.add(t.gostje)
  if(t.odigrana){const k=key(r.stevilka,t.domaci,t.gostje);if(expected.has(k))napake.push(`podvojena tekma razporeda: ${k}`);expected.set(k,t)}
 }
 if(!razpored.length||!expected.size)napake.push('razpored nima odigranih tekem za preverbo')
 for(const {id,z} of zapisniki){
  if(ids.has(id))napake.push(`podvojen zapisnik: ${id}`);ids.add(id)
  if(z.zapisnikId!==id)napake.push(`neujemanje identitete: ${id}`)
  if(z.nepopoln||z.prazen)napake.push(`zapisnik je označen nepopoln: ${id}`)
  if(z.sezona!==sezona)napake.push(`napačna sezona ${id}: ${z.sezona}`)
  const k=key(z.krog,z.domaci.ime,z.gostje.ime),t=expected.get(k)
  if(!t)napake.push(`zapisnik zunaj razporeda: ${id}`)
  else {
   if(seen.has(k))napake.push(`podvojena tekma zapisnikov: ${id}`);seen.add(k)
   const sourceId=t.virId??t.dfbId??t.id
   if(sourceId!=null&&!id.endsWith(`-${sourceId}`))napake.push(`neujemanje šifre razporeda: ${id}`)
   if(t.datum&&t.datum!==z.datum)napake.push(`neujemanje datuma: ${id}`)
   if(t.ura&&t.ura!==z.ura)napake.push(`neujemanje ure: ${id}`)
   if(t.izid&&(t.izid.domaci!==z.rezultat.domaci||t.izid.gostje!==z.rezultat.gostje))napake.push(`neujemanje izida: ${id}`)
  }
  for(const e of [z.domaci,z.gostje]){
   if(e.postava.length===11)postavPo11++;else napake.push(`postava ni po 11: ${id} ${e.ime}`)
   const gk=e.postava.filter(p=>p.vratar===true)
   if(gk.length===1)keepers.add(e.ime)
   else if(gk.length>1)napake.push(`več začetnih vratarjev: ${id} ${e.ime}`)
  }
  if(z.goli.length!==z.rezultat.domaci+z.rezultat.gostje)napake.push(`nepopolni goli: ${id}`)
  golov+=z.goli.length;menjav+=z.menjave.length;rumenih+=z.rumeni.length;rdecih+=z.rdeci.length
 }
 for(const [k] of expected)if(!seen.has(k))napake.push(`manjka zapisnik: ${k}`)
 for(const n of nepopolni)napake.push(`nepopoln ${n.id}: ${n.razlog}`)
 if(expected.size!==zapisniki.length)napake.push(`odigranih ${expected.size}, zapisnikov ${zapisniki.length}`)
 const klubiBrezVratarja=[...klubi].filter(k=>!keepers.has(k)).sort(),pokritost=napake.length===0
 return {sezona,krogov:razpored.length,klubov:klubi.size,odigranih:expected.size,zapisnikov:zapisniki.length,postavPo11,golov,menjav,rumenih,rdecih,pokritost,klubiBrezVratarja,pripravljeno:pokritost&&klubiBrezVratarja.length===0,napake}
}

export async function preveriSezono({vir,koda,sezona,mapa,fetchFn=globalThis.fetch}) {
 mkdirSync(mapa,{recursive:true})
 writeFileSync(resolve(mapa,'prenosi.json'),'[]\n')
 const requests=[],documents=new Map(),opozorila=[]
 const shrani=(url,ime,body,extra={})=>{
  const sha256=createHash('sha256').update(body).digest('hex'),file=`${sha256}.${extra.napaka?'bin':'html'}`
  writeFileSync(resolve(mapa,file),body)
  requests.push({url,ime,file,sha256,at:new Date().toISOString(),...extra})
  writeFileSync(resolve(mapa,'prenosi.json'),JSON.stringify(requests,null,2)+'\n')
 }
 const prenesi=async(url,ime)=>{
  const parsed=new URL(url)
  if(parsed.protocol!=='https:'||!['www.futgal.es','www.futbolaragon.com','datencenter.dfb.de'].includes(parsed.hostname))throw Error('nedovoljen naslov vira')
  // Within one audit the same schedule is requested by both consumers.
  // Preserve the exact first response to compare against one consistent snapshot.
  if(documents.has(url))return documents.get(url)
  if(requests.length>=1500)throw Error('presežena omejitev 1500 dokumentov')
  let response
  try{
   response=await prenesiSPonovitvami(url,{glave:vir.glave,premorMs:vir.premorMs??2000,fetchFn:async(u,options)=>{
    const r=await (vir.fetch??fetchFn)(u,options)
    if([401,403,429].includes(r.status)){
     await r.body?.cancel().catch(()=>{})
     throw Object.assign(Error(`HTTP ${r.status}: ${u}`),{status:r.status,zavrnitev:true})
    }
    return r
   }})
  }catch(e){
   e.url??=url
   const d=e.dokument
   if(d?.bytes instanceof Uint8Array&&d.bytes.byteLength<=5_000_000)shrani(url,ime,d.bytes,{napaka:e.message,contentType:d.contentType??null,status:d.status??null})
   throw e
  }
  if(!response.ok){const e=Error(`HTTP ${response.status}: ${url}`);e.status=response.status;throw e}
  const html=await response.text()
  if(Buffer.byteLength(html)>5_000_000)throw Error('prevelik dokument vira')
  if(!html.trim()){
   const e=Object.assign(Error(`${vir.ime}: empty public document (HTTP ${response.status})`),{status:response.status,url})
   shrani(url,ime,html,{napaka:e.message,contentType:response.headers.get('content-type'),status:response.status})
   throw e
  }
  if(vir.jeIzziv?.(html))throw vir.zavrnitev('izziv (CAPTCHA)')
  shrani(url,ime,html)
  documents.set(url,html);return html
 }
 let razpored=[],zapisniki=[],porocilo
 try {
  razpored=await vir.razporedVseStrani(koda,prenesi)
  zapisniki=await vir.zapisniki(koda,prenesi,{zberiNapake:true})
  porocilo=preveriPokritost({sezona,razpored,zapisniki,nepopolni:vir.nepopolni??[]})
 }catch(e){porocilo={sezona,pripravljeno:false,pokritost:false,napake:[e.message],status:e.status??null,zavrnitev:!!e.zavrnitev,url:e.url??null};opozorila.push(...(e.nepopolni??vir.nepopolni??[]))}
 porocilo={vir:vir.ime,koda,preverjeno:new Date().toISOString(),...porocilo,prenesenih:requests.length,opozorila}
 writeFileSync(resolve(mapa,'porocilo.json'),JSON.stringify(porocilo,null,2)+'\n')
 writeFileSync(resolve(mapa,'razpored.json'),JSON.stringify(razpored,null,2)+'\n')
 writeFileSync(resolve(mapa,'zapisniki.json'),JSON.stringify(zapisniki,null,2)+'\n')
 return porocilo
}

async function main() {
 const [source,koda,sezona,mapa,...extra]=process.argv.slice(2)
 if(extra.length||!['novanet','dfb'].includes(source)||!koda||!/^20\d{2}\/\d{2}$/.test(sezona??'')||!mapa)throw Error('Uporaba: node scripts/preveri-vir-sezono.mjs novanet|dfb <koda> <2026/27> <mapa-porocila>')
 const mod=await import(`./viri/${source}.mjs`)
 // Novanet owns a persistent importer cache; the release audit always fetches.
 const vir=mod.ustvariVir?mod.ustvariVir({predpomnilnik:false}):mod.default
 const r=await preveriSezono({vir,koda,sezona,mapa})
 console.log(JSON.stringify(r,null,2))
 if(!r.pripravljeno)process.exitCode=1
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
