import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {vZapisnik} from './viri/dfb.mjs'
const cases=[['2405451','regionalliga-nord',[[0,1],[0,2],[1,2],[2,2],[3,2]]],['2405547','regionalliga-nord',[[1,0],[1,1],[1,2],[1,3],[2,3],[3,3],[4,3],[4,4]]],['2402204','regionalliga-west',[[1,0],[1,1],[2,1],[3,1]]]]
for(const[id,liga,scores]of cases)test(`authentic ${id}: only corroborated score labels change`,()=>{
 const z=vZapisnik(readFileSync(new URL(`./vzorci/de-dfb-${id}.html`,import.meta.url),'utf8'),{id,liga})
 assert.deepEqual(z.goli.map(g=>g.rezultat),scores)
 assert.equal(z.popravki.length,id==='2402204'?1:id==='2405547'?3:2)
 assert.equal(z.domaci.postava.length,11);assert.equal(z.gostje.postava.length,11)
})

const registry=JSON.parse(readFileSync(new URL('./viri/dfb-korekcije.json',import.meta.url)))
const entries=registry.matches.filter(e=>cases.some(([id])=>id===e.id))
const actual=id=>readFileSync(new URL(`./vzorci/de-dfb-${id}.html`,import.meta.url),'utf8')
const league=entry=>cases.find(([id])=>id===entry.id)[1]
const parse=(html,entry)=>vZapisnik(html,{id:entry.id,liga:league(entry)})
const fix=(html,entry,changes=entry.corrections)=>html.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>{
 for(const c of changes)if(body.includes(entry.goals[c.index].scorer)&&body.includes(c.from.join(':')))return start+body.replace(c.from.join(':'),c.to.join(':'))+end
 return whole
})
for(const entry of entries)test(`${entry.id}: exact original/corrected states preserve clocks, identities and proof`,async()=>{
 const {nastopi}=await import('./viri/dfb.mjs'),{kanonicniGoli,kanonicniNastopi}=await import('./vklopi-dfb-regijo.mjs')
 const raw=actual(entry.id),z=parse(raw,entry),corrected=parse(fix(raw,entry),entry)
 assert.deepEqual(corrected.popravki,[])
 assert.deepEqual(corrected.goli.map(g=>g.rezultat),z.goli.map(g=>g.rezultat))
 assert.deepEqual(z.goli.map(g=>[g.ime,g.ekipaIdx,g.minuta,g.avtogol,g.enajstmetrovka]),entry.goals.map(g=>[g.scorer,g.side,g.normalizedClock[0],g.ownGoal,g.penalty]))
 assert.deepEqual(nastopi(z),nastopi(corrected))
 assert.deepEqual(kanonicniGoli(z),kanonicniGoli(corrected));assert.deepEqual(kanonicniNastopi(z),kanonicniNastopi(corrected))
 assert(z.opozorila.includes(entry.warning));assert(corrected.opozorila.includes(entry.warning))
 for(const c of entry.corrections){assert.deepEqual(z.goli[c.index].popravekIzida.izvorno,entry.goals[c.index]);assert.deepEqual(z.goli[c.index].popravekIzida.dokazniDokumenti,entry.evidenceFiles);assert.equal(z.goli[c.index].popravekIzida.vzorecSha256,entry.sourceFixtureSha256)}
 for(const changed of [
  raw.replace(entry.goals[0].scorer,'Different Scorer'),raw.replaceAll(entry.goals[0].scorer,'Different Scorer'),
  raw.replaceAll(`${entry.metadata.time} Uhr`,'13:59 Uhr'),raw.replaceAll(entry.metadata.teams[0].id,'different-team'),
  raw.replaceAll(`(${entry.metadata.halfScore.join(':')})`,'(9:9)'),raw.replaceAll(entry.goals.at(-1).clock,"90+9'"),raw.replaceAll('Spieltag','Another Round'),
 ]){assert.notEqual(changed,raw);assert.throws(()=>parse(changed,entry))}
 // One copy changes while its dedicated counterpart remains original.
 const c=entry.corrections[0],old=entry.goals[c.index].scorer
 // Away-side labels precede names; change the first matching segment instead.
 let first=true
 const divergent=raw.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>{
  if(first&&body.includes(old)&&body.includes(c.from.join(':'))){first=false;return start+body.replace(c.from.join(':'),c.to.join(':'))+end}return whole
 })
 assert.notEqual(divergent,raw);assert.throws(()=>parse(divergent,entry),/izvorni dogodki|neujemajoči/)
 if(entry.corrections.length>1)assert.throws(()=>parse(fix(raw,entry,[c]),entry),/nepregledana sprememba/)
 const foreign=raw.replaceAll(league(entry),'regionalliga-bayern').replaceAll(league(entry)==='regionalliga-nord'?'Regionalliga Nord':'Regionalliga West','Regionalliga Bayern')
 assert.throws(()=>vZapisnik(foreign,{id:entry.id,liga:'regionalliga-bayern'}))
})

test('new raw reports and participant documents retain exact safe provenance',async()=>{
 const {createHash}=await import('node:crypto'),p=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-nord-west-provenance.json',import.meta.url)))
 assert(!/headers|cookie|session/i.test(JSON.stringify(p)))
 for(const row of p.documents){assert.equal(createHash('sha256').update(readFileSync(new URL('./vzorci/'+row.file,import.meta.url))).digest('hex'),row.sha256);assert(Number.isFinite(Date.parse(row.at)))}
 for(const e of entries)assert.equal(e.sourceFixtureSha256,p.documents.find(r=>r.file===`de-dfb-${e.id}.html`).sha256)
 assert.equal(p.documents.filter(r=>r.captureRun).length,3)
 assert(p.documents.filter(r=>r.captureRun).every(r=>r.at<'2026-10-18T00:00:00Z'))
})

test('proof mutations and missing files reject cached and corrected uses; release fingerprint binds every byte',async()=>{
 const {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join,dirname}=await import('node:path'),{pathToFileURL}=await import('node:url')
 const {sourceFiles}=await import('./vklopi-dfb-regijo.mjs'),base=new URL('../',import.meta.url),dir=mkdtempSync(join(tmpdir(),'slff-nord-west-proof-')),target=p=>join(dir,p)
 try{
  for(const file of sourceFiles){mkdirSync(dirname(target(file)),{recursive:true});copyFileSync(new URL(file,base),target(file))}
  for(const path of ['scripts/viri/dfb.mjs','scripts/vklopi-dfb-regijo.mjs']){
   const url=new URL(path,base),source=readFileSync(url,'utf8').replace(/from '([^']+)'/g,(whole,spec)=>spec.startsWith('.')?`from '${new URL(spec,url).href}'`:whole)
   writeFileSync(target(path),source)
  }
  const isolated=await import(pathToFileURL(target('scripts/viri/dfb.mjs')).href),release=await import(pathToFileURL(target('scripts/vklopi-dfb-regijo.mjs')).href)
  for(const e of entries){
   const source=actual(e.id);isolated.vZapisnik(source,{id:e.id,liga:league(e)})
   for(const file of e.evidenceFiles){
    const path='scripts/'+file.file.replace('../',''),bytes=readFileSync(target(path)),before=release.parserSha256()
    assert(sourceFiles.includes(path))
    try{
     writeFileSync(target(path),Buffer.concat([bytes,Buffer.from('changed')]))
     assert.notEqual(release.parserSha256(),before)
     for(const html of [source,fix(source,e)])assert.throws(()=>isolated.vZapisnik(html,{id:e.id,liga:league(e)}),/spremenjen primarni dokaz/)
     rmSync(target(path));assert.throws(()=>release.parserSha256())
     for(const html of [source,fix(source,e)])assert.throws(()=>isolated.vZapisnik(html,{id:e.id,liga:league(e)}),/manjkajoč primarni dokaz/)
    }finally{writeFileSync(target(path),bytes)}
   }
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
})
