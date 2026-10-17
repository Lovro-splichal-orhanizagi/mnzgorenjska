import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {vZapisnik,nastopi} from './viri/dfb.mjs'
const actual=id=>readFileSync(new URL(`./vzorci/de-dfb-${id}.html`,import.meta.url),'utf8')
const parse=(html,id)=>vZapisnik(html,{id,liga:'regionalliga-bayern'})
for(const [id,scores] of [['2401658',[[0,1],[1,1],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5]]],['2401812',[[1,0],[2,0]]],['2425106',[[1,0],[1,1],[2,1],[3,1]]],['2425105',[[1,0],[2,0],[3,0],[3,1],[4,1],[5,1],[5,2]]]])test(`authentic Bayern ${id}: all source events become consistent without changing clocks`,()=>{
 const z=parse(actual(id),id)
 assert.deepEqual(z.goli.map(g=>g.rezultat),scores)
 assert.equal(z.domaci.postava.length,11);assert.equal(z.gostje.postava.length,11)
 if(id==='2425105'){
  assert.deepEqual(z.goli.slice(0,2).map(g=>[g.ime,g.minuta,g.enajstmetrovka]),[['Felix Bachschmid',45,true],['Noah Agbaje',45,false]])
  const goal=z.goli[1];assert.equal(goal.imeVir,'Noah Shawn Agbaje');assert.equal(goal.dokazAliasa.target.profileId,'374531')
  assert.equal(nastopi(z).filter(p=>p.ime==='Noah Agbaje').length,1)
  assert.equal(nastopi(z).some(p=>p.ime==='Noah Shawn Agbaje'),false)
 }else assert.equal(z.popravki.length,2)
})

const registry=JSON.parse(readFileSync(new URL('./viri/dfb-korekcije.json',import.meta.url)))
const aliases=JSON.parse(readFileSync(new URL('./viri/dfb-aliasi.json',import.meta.url)))
const goalSegments=(html,change)=>html.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>start+change(body)+end)
const fix=(html,entry,changes=entry.corrections)=>goalSegments(html,body=>{
 for(const c of changes)if(body.includes(entry.goals[c.index].scorer)&&body.includes(c.from.join(':')))return body.replace(c.from.join(':'),c.to.join(':'))
 return body
})
for(const entry of registry.matches.filter(e=>e.metadata.url.includes('/regionalliga-bayern/')))test(`Bayern ${entry.id}: exact two states, both copies and all metadata bound`,()=>{
 const html=actual(entry.id),z=parse(html,entry.id),fixed=fix(html,entry)
 assert.deepEqual(parse(fixed,entry.id).popravki,[])
 assert.deepEqual(parse(fixed,entry.id).goli.map(g=>g.rezultat),z.goli.map(g=>g.rezultat))
 assert.deepEqual(z.goli.map(g=>[g.ime,g.ekipaIdx,g.minuta,g.avtogol,g.enajstmetrovka]),entry.goals.map(g=>[g.scorer,g.side,g.normalizedClock[0],g.ownGoal,g.penalty]))
 for(const c of entry.corrections){assert.deepEqual(z.goli[c.index].popravekIzida.izvorno,entry.goals[c.index]);assert.deepEqual(z.goli[c.index].popravekIzida.dokazniDokumenti,entry.evidenceFiles);assert.equal(z.goli[c.index].popravekIzida.vzorecSha256,entry.sourceFixtureSha256)}
 const year=entry.metadata.date.slice(0,4),day=+entry.metadata.date.slice(8),month={4:'April',9:'September'}[+entry.metadata.date.slice(5,7)]
 for(const changed of [fix(html,entry,[entry.corrections[0]]),html.replace(entry.goals[0].scorer,'Different Scorer'),html.replaceAll(entry.goals[0].scorer,'Different Scorer'),html.replaceAll(`${entry.metadata.time} Uhr`,'13:59 Uhr'),html.replaceAll(`${day}. ${month} ${year}`,`${day+1}. ${month} ${year}`),html.replaceAll(entry.metadata.teams[0].id,'different-team'),html.replaceAll(`(${entry.metadata.halfScore.join(':')})`,'(0:0)'),html.replaceAll(entry.goals.at(-1).clock,"90+9'")]){
  assert.equal(changed===html,false);assert.throws(()=>parse(changed,entry.id))
 }
})

test('2425105 alias rejects side/profile/name/staff/event/metadata drift and partial upstream correction',()=>{
 const html=actual('2425105')
 const changes=[
  html.replaceAll('/profil/374531','/profil/999999'),
  html.replace('Noah Shawn Agbaje','Noah Agbaje'),
  html.replaceAll('Noah Shawn Agbaje','Noah Agbaje'),
  html.replaceAll('Noah Shawn Agbaje','Noah Another Agbaje'),
  html.replaceAll('14:00 Uhr','13:59 Uhr'),
  (()=>{const i=html.indexOf('Noah Shawn Agbaje'),a=html.lastIndexOf('<div class="m-MatchDetails-history-event ',i),b=html.indexOf('<div class="m-MatchDetails-history-minute">',i);return html.slice(0,a)+html.slice(a,b).replaceAll('--home','--away')+html.slice(b)})(),
  html.replaceAll('Noah Agbaje</a>','Different Player</a>'),
  html.replaceAll('(Elfmeter)',''),
 ]
 for(const changed of changes){assert.equal(changed===html,false);assert.throws(()=>parse(changed,'2425105'))}
 assert.throws(()=>parse(html.replaceAll('2425105','2425104'),'2425104'),/neznanega igralca/)
})

test('grouped goals reject extra/missing/unknown icons, duplicate segments and summary disagreement',()=>{
 const html=actual('2425105'),icon='<div class="m-MatchDetails-icon m-MatchDetails-icon-goal m-MatchDetails-icon-goal--goal"></div>'
 assert(html.includes(icon))
 for(const changed of [html.replace(icon,icon.repeat(3)),html.replaceAll(icon,''),html.replace(icon,icon.replace('goal--goal','goal--unknown')),html.replace('Noah Shawn Agbaje','Felix Bachschmid'),html.replace('Noah Shawn Agbaje','Noah Shawn Agbaje 9:9')]){
  assert.equal(changed===html,false);assert.throws(()=>parse(changed,'2425105'))
 }
})

test('profile proof bytes are mandatory, hashed, and reject tampering',async()=>{
 const {preveriDokazAliasa}=await import('./viri/dfb.mjs'),entry=aliases.matches[0]
 const files=Object.fromEntries(Object.entries(entry.files).map(([key,f])=>[key,readFileSync(new URL(f.file,new URL('./viri/dfb.mjs',import.meta.url)))]))
 const proof=preveriDokazAliasa(entry,files);assert.equal(proof.birthDate,'2001-06-23')
 for(const key of Object.keys(files)){
  assert.throws(()=>preveriDokazAliasa(entry,{...files,[key]:Buffer.concat([files[key],Buffer.from('changed')])}))
  const missing={...files};delete missing[key];assert.throws(()=>preveriDokazAliasa(entry,missing))
 }
})

test('canonical release uses roster identity; raw scorer/proof survive JSON replay',async()=>{
 const {kanonicniGoli,kanonicniNastopi,sourceFiles,parserSha256}=await import('./vklopi-dfb-regijo.mjs')
 const z=parse(actual('2425105'),'2425105'),again=JSON.parse(JSON.stringify(z))
 assert.deepEqual(again.goli[1].dokazAliasa,z.goli[1].dokazAliasa)
 assert.deepEqual(kanonicniGoli(z),kanonicniGoli(again));assert.deepEqual(kanonicniNastopi(z),kanonicniNastopi(again))
 assert.equal(kanonicniGoli(z).filter(g=>g.name==='Noah Agbaje').length,1)
 assert.equal(kanonicniNastopi(z).find(p=>p.name==='Noah Agbaje').goals,1)
 for(const f of Object.values(aliases.matches[0].files))assert(sourceFiles.includes('scripts/'+f.file.replace('../','')))
 assert(sourceFiles.includes('scripts/viri/dfb-aliasi.json'));assert.match(parserSha256(),/^[a-f0-9]{64}$/)
})

test('original capture and primary proof bytes retain safe provenance and exact SHA',async()=>{
 const {createHash}=await import('node:crypto'),p=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-bayern-provenance.json',import.meta.url)))
 assert(!/headers|cookie|session/i.test(JSON.stringify(p)))
 for(const row of p.documents){assert.equal(createHash('sha256').update(readFileSync(new URL('./vzorci/'+row.file,import.meta.url))).digest('hex'),row.sha256);assert(Number.isFinite(Date.parse(row.at)))}
})

test('one-to-one icons and shared icons represent the same explicit grouped goals outside alias state',()=>{
 const html=actual('2425105').replaceAll('2425105','2425104').replaceAll('Noah Shawn Agbaje','Noah Agbaje')
 const icon='<div class="m-MatchDetails-icon m-MatchDetails-icon-goal m-MatchDetails-icon-goal--goal"></div>'
 const oneIcon=html.replace(new RegExp(icon+'\\s*'+icon,'g'),icon)
 assert.equal(oneIcon===html,false)
 assert.deepEqual(parse(oneIcon,'2425104').goli,parse(html,'2425104').goli)
 for(const changed of [html.replace(icon,icon.repeat(2)),html.replaceAll(icon,''),html.replace(icon,icon.replace('goal--goal','goal--unknown')),html.replace('Noah Agbaje&nbsp;&nbsp;2:0','Felix Bachschmid&nbsp;(Elfmeter)&nbsp;1:0')])assert.throws(()=>parse(changed,'2425104'))
})

test('Bayern alias registry cannot affect another league even when a report ID collides',()=>{
 const html=actual('2425990').replaceAll('2425990','2425105')
 const z=vZapisnik(html,{id:'2425105',liga:'regionalliga-nordost'})
 assert(z.goli.every(g=>!g.dokazAliasa&&!g.imeVir))
})
