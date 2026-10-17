import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import * as dfb from './viri/dfb.mjs'
const metadata=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-regije-provenance.json',import.meta.url)))
const scores={'report-bayern-archive-vilzing.html':[1,0,0,0],'report-bayern-archive.html':[1,2,1,0],'report-bayern-current.html':[0,1,0,0],'report-nord-archive.html':[1,3,0,2],'report-nord-current-sv-todesfelde.html':[1,4,0,2],'report-nord-current.html':[0,3,0,0],'report-suedwest-archive.html':[1,2,1,2],'report-suedwest-current.html':[2,2,0,0],'report-west-archive.html':[0,2,0,2],'report-west-current-12.html':[3,1,1,1],'report-west-current.html':[1,2,1,1]}
const read=m=>readFileSync(new URL(`./vzorci/de-dfb-regije-${m.file}`,import.meta.url),'utf8')
for(const m of metadata)test(m.file,()=>{
 const html=read(m); assert.equal(createHash('sha256').update(html).digest('hex'),m.sha256)
 if(m.file.startsWith('report-')){
  const liga=m.canonical.split('/')[4],z=dfb.vZapisnik(html,{liga})
  assert.deepEqual([z.rezultat.domaci,z.rezultat.gostje,z.polcas.domaci,z.polcas.gostje],scores[m.file]);assert.equal(z.url,m.canonical);assert.equal(z.domaci.postava.length+z.gostje.postava.length,22)
  assert.equal([z.domaci,z.gostje].flatMap(t=>t.postava).filter(p=>p.vratar===true).length,2)
  assert.throws(()=>dfb.vZapisnik(html),/identitet|šifr/)
  assert.throws(()=>dfb.vZapisnik(html.replace('m-MatchDetails-headline">','m-MatchDetails-headline">WRONG '),{liga}))
  if(m.file.includes('vilzing'))assert.equal(z.domaci.virId,'DJK%20Vilzing')
  if(m.file.includes('todesfelde'))assert.equal(z.domaci.virId,'SV-Todesfelde')
  assert(dfb.zaPredpomnilnik(html))
 }else{
  const [,liga,season,slug]=m.canonical.match(/competitions\/([^/]+)\/seasons\/([^/]+)\/teams\/(.+)$/)
  const koda=`${liga}/${season}`,conf=dfb.konfiguracijaDfb(koda),data=dfb.tekmeEkipe(html,koda,slug)
  assert(Object.isFrozen(conf));assert.equal(conf.seed,slug);assert.equal(data.ekipe.length,m.teams.length)
  assert.deepEqual(data.tekme.map(t=>t.url),m.schedule)
  assert(dfb.zaPredpomnilnik(html))
 }
})
test('registered identities and safe case / space team IDs',()=>{
 assert.throws(()=>dfb.razberiKodo('unknown/2026-2027'))
 for(const slug of ['../x','x%2Fy','x%252Fy','x/y','x%2ey','x?y'])assert.throws(()=>dfb.naslovEkipe('regionalliga-nord/2026-2027',slug))
 assert(dfb.naslovEkipe('regionalliga-nord/2026-2027','SV-Todesfelde').endsWith('/SV-Todesfelde'))
 assert(dfb.naslovEkipe('regionalliga-bayern/2025-2026','DJK%20Vilzing').endsWith('/DJK%20Vilzing'))
})

function oddSeasonPages(change=x=>x){
 const clubs=['bayern-muenchen-ii',...Array.from({length:18},(_,i)=>`club-${i+1}`)],circle=[...clubs,null],matches=[]
 for(let r=0;r<19;r++){
  for(let i=0;i<10;i++){
   const [home,away]=[circle[i],circle[19-i]]
   if(home&&away){matches.push({round:r+1,home,away});matches.push({round:r+20,home:away,away:home})}
  }
  circle.splice(1,0,circle.pop())
 }
 change(matches)
 const pages=new Map(),root='https://datencenter.dfb.de',path='regionalliga-bayern/seasons/2026-2027'
 for(const club of clubs){
  const rows=matches.flatMap((m,i)=>{
   if(m.home!==club&&m.away!==club)return []
   const id=String(9000000+i),url=`${root}/datencenter/regionalliga-bayern/2026-2027/${m.round}-spieltag/${m.home}-${m.away}-${id}`
   const cell=(side,slug)=>`<div class="c-MatchTable-team c-MatchTable-team--${side}"><a href="${root}/competitions/${path}/teams/${slug}">${slug}</a></div>`
   return [`<div class="c-MatchTable-row"><div id="match_${id}"><div class="c-MatchTable-description">Samstag, 01.08.2026 14:00 Uhr</div></div>${cell('home',m.home)}<div class="c-MatchTable-score"><a href="${url}">- : -</a></div>${cell('away',m.away)}</div>`]
  })
  const url=`${root}/competitions/${path}/teams/${club}`
  pages.set(url,`<!doctype html><html><head><link rel="canonical" href="${url}"></head><body>${rows.join('')}</body></html>`)
 }
 return pages
}
test('19 clubs have complete directed pairs, unique participants and exactly one bye per half',async()=>{
 const pages=oddSeasonPages(),calls=[]
 const matches=await dfb.tekmeSezone('regionalliga-bayern/2026-2027',async url=>{calls.push(url);return pages.get(url)})
 assert.equal(calls.length,19);assert.equal(matches.length,342)
 assert.equal(new Set(matches.map(m=>`${m.domaciId}|${m.gostjeId}`)).size,342)
 for(let round=1;round<=38;round++)assert.equal(new Set(matches.filter(m=>m.krog===round).flatMap(m=>[m.domaciId,m.gostjeId])).size,18)
 for(const club of new Set(matches.flatMap(m=>[m.domaciId,m.gostjeId])))for(const half of [0,1])assert.equal(matches.filter(m=>m.krog>half*19&&m.krog<=(half+1)*19&&(m.domaciId===club||m.gostjeId===club)).length,18)
 for(const mutation of [ms=>ms.pop(),ms=>{ms[1].home=ms[0].home;ms[1].away=ms[0].away},ms=>{ms[1].round=ms[0].round}]){
  const bad=oddSeasonPages(mutation)
  await assert.rejects(()=>dfb.tekmeSezone('regionalliga-bayern/2026-2027',async url=>bad.get(url)),/razpored|krog|par|nepopolna javna stran/)
 }
})
test('strict canonical, mixed competition team links and encoded path traversal fail',()=>{
 const m=metadata.find(m=>m.file==='report-bayern-current.html'),html=read(m),liga='regionalliga-bayern'
 assert.throws(()=>dfb.vZapisnik(html.replaceAll(m.canonical,m.canonical.replace(liga,'regionalliga-west')),{liga}))
 assert.throws(()=>dfb.vZapisnik(html.replaceAll('/competitions/regionalliga-bayern/','/competitions/regionalliga-west/'),{liga}))
 assert.throws(()=>dfb.vZapisnik(html.replaceAll('/teams/bayern-muenchen-ii','/teams/other/../bayern-muenchen-ii'),{liga}))
})
