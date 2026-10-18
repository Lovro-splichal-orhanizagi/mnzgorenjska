import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const api=await import('./viri/dfb-calendar.mjs').catch(()=>({}))
// Independently transcribed fixture identities from the reviewed original pages.
const reviewed={
 nord:[
  {home:'SV Werder Bremen II',away:'1. FC Phönix Lübeck',homeSourceClubId:'sv-werder-bremen-ii',awaySourceClubId:'1-fc-phoenix-luebeck',games:[['2423139',7],['2423378',33]]},
  {home:'VfB Lübeck',away:'SV Todesfelde',homeSourceClubId:'vfb-luebeck',awaySourceClubId:'SV-Todesfelde',games:[['2423173',11],['2423342',29]]}],
 west:[
  {home:'Rot-Weiß Oberhausen',away:'Borussia Mönchengladbach II',homeSourceClubId:'rot-weiss-oberhausen',awaySourceClubId:'borussia-moenchengladbach-ii',games:[['2425450',9],['2425603',26]]},
  {home:'Rot-Weiß Oberhausen',away:'SC Paderborn 07 II',homeSourceClubId:'rot-weiss-oberhausen',awaySourceClubId:'sc-paderborn-07-ii',games:[['2425470',11],['2425622',28]]}]
}
const code=region=>`regionalliga-${region}/2026-2027`
const identity=(p,[id,round])=>{const {games,...rest}=p;return {id,round,...rest}}
const witnesses=(region,f)=>[f.homeSourceClubId,f.awaySourceClubId].map((club,i)=>({club,url:`https://datencenter.dfb.de/competitions/regionalliga-${region}/seasons/2026-2027/teams/${club}`,sha256:(i?'b':'a').repeat(64)}))
function calendar(region='nord',evidence=true){
 const known=reviewed[region],native=new Map(known.flatMap(p=>[[p.home,p.homeSourceClubId],[p.away,p.awaySourceClubId]])),names=[...native.keys()]
 if(region==='nord'){names.push('VfB Oldenburg');native.set('VfB Oldenburg','vfb-oldenburg')}
 while(names.length<18){const name=`Club ${names.length}`;names.push(name);native.set(name,`club-${names.length}`)}
 const ring=[...names],fixtures=[]
 for(let r=0;r<17;r++){
  for(let i=0;i<9;i++)for(let leg=0;leg<2;leg++){
   const [home,away]=leg?[ring[17-i],ring[i]]:[ring[i],ring[17-i]]
   fixtures.push({id:String(9000000+fixtures.length),round:r+1+17*leg,home,away,homeSourceClubId:native.get(home),awaySourceClubId:native.get(away)})
  }
  ring.splice(1,0,ring.pop())
 }
 const rounds=new Map()
 for(const p of known){
  const games=fixtures.filter(f=>[p.home,p.away].includes(f.home)&&[p.home,p.away].includes(f.away))
  assert.equal(games.length,2)
  games.sort((a,b)=>a.round-b.round).forEach((f,i)=>{assert(!rounds.has(f.round));rounds.set(f.round,p.games[i][1]);Object.assign(f,identity(p,p.games[i]))})
 }
 const spare=Array.from({length:34},(_,i)=>i+1).filter(r=>![...rounds.values()].includes(r))
 for(let r=1;r<=34;r++)if(!rounds.has(r))rounds.set(r,spare.shift())
 // Reviewed fixtures already have their target round; map all other rounds.
 for(const f of fixtures)if(!known.some(p=>p.games.some(([id])=>id===f.id)))f.round=rounds.get(f.round)
 if(evidence)for(const p of known)for(const game of p.games){const f=fixtures.find(f=>f.id===game[0]);f.calendarEvidence=api.dfbCalendarEvidence(code(region),f,witnesses(region,f))}
 return {code:code(region),teams:18,rounds:34,fixtures}
}
const verify=s=>api.verifyDfbCalendar(s)
const reverse=f=>{[f.home,f.away]=[f.away,f.home];[f.homeSourceClubId,f.awaySourceClubId]=[f.awaySourceClubId,f.homeSourceClubId];delete f.calendarEvidence}
test('calendar support exports shared proof and shape validation',()=>{
 assert.equal(typeof api.dfbCalendarEvidence,'function');assert.equal(typeof api.verifyDfbCalendar,'function')
})
test('exact eight reviewed fixtures accept two current participant witnesses and preserve input',()=>{
 for(const region of ['nord','west']){
  const s=calendar(region),before=structuredClone(s)
  assert.equal(verify(s),true);assert.deepEqual(s,before)
  assert.equal(s.fixtures.filter(f=>f.calendarEvidence).length,4)
  for(const p of reviewed[region])for(const game of p.games){const f=s.fixtures.find(f=>f.id===game[0]);assert.deepEqual(Object.fromEntries(Object.entries(f).filter(([k])=>k!=='calendarEvidence')),identity(p,game))}
 }
})
test('unknown scope, native identity, display name, fixture ID or round cannot obtain proof',()=>{
 const f=identity(reviewed.nord[0],reviewed.nord[0].games[0]),w=witnesses('nord',f)
 for(const change of [x=>x.id='2423140',x=>x.round++,x=>x.home='Wrong',x=>x.homeSourceClubId='wrong',reverse]){const x=structuredClone(f);change(x);assert.throws(()=>api.dfbCalendarEvidence(code('nord'),x,w))}
 for(const c of ['regionalliga-nord/2025-2026',code('west'),'regionalliga-nord/2026-2028'])assert.throws(()=>api.dfbCalendarEvidence(c,f,w))
})
test('missing, repeated, foreign, malformed or disagreeing participant witnesses refuse',()=>{
 const f=identity(reviewed.nord[0],reviewed.nord[0].games[0]),w=witnesses('nord',f)
 for(const bad of [[],[w[0]],[w[0],w[0]],[...w,w[0]],w.map(x=>({...x,sha256:'bad'})),[w[0],{...w[1],club:w[0].club}],w.map(x=>({...x,url:x.url.replace('nord','west')})),w.map(x=>({...x,url:x.url+'?extra'})),w.map(x=>({...x,fixture:'other'}))])assert.throws(()=>api.dfbCalendarEvidence(code('nord'),f,bad))
})
test('missing or altered proof and proof smuggled on an ordinary fixture refuse',()=>{
 for(const change of [s=>delete s.fixtures.find(f=>f.calendarEvidence).calendarEvidence,s=>s.fixtures.find(f=>f.calendarEvidence).calendarEvidence.version=2,s=>s.fixtures.find(f=>f.calendarEvidence).calendarEvidence.receiptSha256='0'.repeat(64),s=>s.fixtures.find(f=>f.calendarEvidence).calendarEvidence.fixture.round++,s=>s.fixtures.find(f=>f.calendarEvidence).calendarEvidence.witnesses.reverse().pop(),s=>{const f=s.fixtures.find(f=>!f.calendarEvidence);f.calendarEvidence=structuredClone(s.fixtures.find(f=>f.calendarEvidence).calendarEvidence)}]){const s=calendar();change(s);assert.throws(()=>verify(s))}
 assert.throws(()=>verify(calendar('nord',false)))
})
test('corrected normal pairs use strict validation without evidence, including partial correction',()=>{
 const s=calendar();reverse(s.fixtures.find(f=>f.id==='2423378'));delete s.fixtures.find(f=>f.id==='2423139').calendarEvidence
 assert.equal(verify(s),true);assert.equal(s.fixtures.filter(f=>f.calendarEvidence).length,2)
 reverse(s.fixtures.find(f=>f.id==='2423342'));delete s.fixtures.find(f=>f.id==='2423173').calendarEvidence
 assert.equal(verify(s),true);assert.equal(s.fixtures.filter(f=>f.calendarEvidence).length,0)
})
test('fixture count, unique IDs, native/name bijection, unordered multiplicity and per-round participation stay strict',()=>{
 for(const change of [s=>s.fixtures.pop(),s=>s.fixtures.push({...s.fixtures[0]}),s=>s.fixtures[0].id=s.fixtures[1].id,s=>s.fixtures[0].round=0,s=>s.fixtures[0].round=s.fixtures.find(f=>f.round!==s.fixtures[0].round).round,s=>s.fixtures[0].away=s.fixtures[0].home,s=>s.fixtures[0].homeSourceClubId='foreign',s=>{const f=s.fixtures.find(f=>!f.calendarEvidence);reverse(f)},s=>{const [a,b]=s.fixtures.filter(f=>f.round===1);[a.away,b.away]=[b.away,a.away];[a.awaySourceClubId,b.awaySourceClubId]=[b.awaySourceClubId,a.awaySourceClubId]}]){const s=calendar();change(s);assert.throws(()=>verify(s))}
})
test('receipt bytes are pinned and cannot be changed or omitted',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dfb-calendar-pin-'))
 try{
  writeFileSync(join(dir,'dfb-calendar.mjs'),readFileSync(new URL('./viri/dfb-calendar.mjs',import.meta.url)))
  const receipt=readFileSync(new URL('./viri/dfb-calendar-receipts.json',import.meta.url),'utf8')
  writeFileSync(join(dir,'dfb-calendar-receipts.json'),receipt+' ')
  await assert.rejects(()=>import(pathToFileURL(join(dir,'dfb-calendar.mjs')).href),/receipt|SHA|hash/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})

function pages(region='nord'){
 const s=calendar(region,false),root='https://datencenter.dfb.de',path=`regionalliga-${region}/seasons/2026-2027`,out=new Map()
 const clubs=new Set(s.fixtures.flatMap(f=>[f.homeSourceClubId,f.awaySourceClubId]))
 for(const club of clubs){
  const url=`${root}/competitions/${path}/teams/${club}`
  const rows=s.fixtures.filter(f=>[f.homeSourceClubId,f.awaySourceClubId].includes(club)).map(f=>{
   const cell=(side,name,id)=>`<div class="c-MatchTable-team--${side}"><a href="${root}/competitions/${path}/teams/${id}">${name}</a></div>`
   return `<div class="c-MatchTable-row"><div id="match_${f.id}"><div class="c-MatchTable-description">Samstag, 01.08.2026 14:00 Uhr</div></div>${cell('home',f.home,f.homeSourceClubId)}<div class="c-MatchTable-score"><a href="${root}/datencenter/regionalliga-${region}/2026-2027/${f.round}-spieltag/fixture-${f.id}">- : -</a></div>${cell('away',f.away,f.awaySourceClubId)}</div>`
  }).join('')
  out.set(url,`<!doctype html><html><head><link rel="canonical" href="${url}"></head><body>${rows}</body></html>`)
 }
 return out
}
test('parser binds hashes of both actual participant pages, allows wrapper evolution and refuses disagreement',async()=>{
 const {tekmeSezone}=await import('./viri/dfb.mjs'),{createHash}=await import('node:crypto'),hash=x=>createHash('sha256').update(x).digest('hex')
 for(const region of ['nord','west']){
  const p=pages(region),read=async url=>{assert(p.has(url));return p.get(url)},out=await tekmeSezone(code(region),read)
  assert.equal(out.length,306)
  const f=out.find(f=>f.id===reviewed[region][0].games[0][0]);assert.equal(f.domaci,reviewed[region][0].home);assert.equal(f.gostje,reviewed[region][0].away)
  for(const w of f.calendarEvidence.witnesses)assert.equal(w.sha256,hash(p.get(w.url)))
  const url=f.calendarEvidence.witnesses[0].url;p.set(url,p.get(url).replace('</body>','<!-- evolved wrapper --></body>'))
  const fresh=await tekmeSezone(code(region),read),changed=fresh.find(t=>t.id===f.id).calendarEvidence.witnesses.find(w=>w.url===url)
  assert.equal(changed.sha256,hash(p.get(url)));assert.notEqual(changed.sha256,f.calendarEvidence.witnesses.find(w=>w.url===url).sha256)
  p.set(url,p.get(url).replace('- : -','1 : 0'))
  await assert.rejects(()=>tekmeSezone(code(region),read),/ne ujemata/)
 }
})
