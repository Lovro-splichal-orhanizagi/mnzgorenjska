import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,writeFileSync,rmSync,mkdirSync,copyFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {pathToFileURL} from 'node:url'
const api=await import('./viri/dfb-calendar.mjs').catch(()=>({}))
import {reviewed,calendar} from './dfb-calendar-test-fixture.mjs'
const code=region=>`regionalliga-${region}/2026-2027`
const identity=(p,[id,round])=>{const {games,...rest}=p;return {id,round,...rest}}
const witnesses=(region,f)=>[f.homeSourceClubId,f.awaySourceClubId].map((club,i)=>({club,url:`https://datencenter.dfb.de/competitions/regionalliga-${region}/seasons/2026-2027/teams/${club}`,sha256:(i?'b':'a').repeat(64)}))
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
 for(const bad of [[],[w[0]],[w[0],w[0]],[w[0],{...w[1],sha256:w[0].sha256}],[...w,w[0]],w.map(x=>({...x,sha256:'bad'})),[w[0],{...w[1],club:w[0].club}],w.map(x=>({...x,url:x.url.replace('nord','west')})),w.map(x=>({...x,url:x.url+'?extra'})),w.map(x=>({...x,fixture:'other'}))])assert.throws(()=>api.dfbCalendarEvidence(code('nord'),f,bad))
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
 for(const change of [s=>s.teams=17,s=>s.rounds=33,s=>s.fixtures.pop(),s=>s.fixtures.push({...s.fixtures[0]}),s=>s.fixtures[0].id=s.fixtures[1].id,s=>s.fixtures[0].round=0,s=>s.fixtures[0].round=s.fixtures.find(f=>f.round!==s.fixtures[0].round).round,s=>s.fixtures[0].away=s.fixtures[0].home,s=>s.fixtures[0].homeSourceClubId='foreign',s=>{const f=s.fixtures.find(f=>!f.calendarEvidence);reverse(f)},s=>{const [a,b]=s.fixtures.filter(f=>f.round===1);[a.away,b.away]=[b.away,a.away];[a.awaySourceClubId,b.awaySourceClubId]=[b.awaySourceClubId,a.awaySourceClubId]}]){const s=calendar();change(s);assert.throws(()=>verify(s))}
})
test('receipt bytes are pinned and cannot be changed or omitted',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dfb-calendar-pin-'))
 try{
  writeFileSync(join(dir,'dfb-calendar.mjs'),readFileSync(new URL('./viri/dfb-calendar.mjs',import.meta.url)))
  const receipt=readFileSync(new URL('./viri/dfb-calendar-receipts.json',import.meta.url),'utf8')
  await assert.rejects(()=>import(pathToFileURL(join(dir,'dfb-calendar.mjs')).href+'?missing'),/ENOENT|receipt/)
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

function builderInput(region='nord',correct=false){
 const s=calendar(region)
 if(correct)for(const p of reviewed[region]){reverse(s.fixtures.find(f=>f.id===p.games[1][0]));delete s.fixtures.find(f=>f.id===p.games[0][0]).calendarEvidence}
 const razpored=[],zapisniki=[]
 const team=name=>({ime:name,postava:Array.from({length:11},(_,i)=>({ime:`${name} Player ${i+1}`,st:i+1,zacetnik:true,vratar:i===0,vratarVir:i===0?'oznaka-T':null})),rezerve:[]})
 for(let round=1;round<=34;round++){
  const tekme=s.fixtures.filter(f=>f.round===round).map(f=>{
   const url=`https://datencenter.dfb.de/datencenter/regionalliga-${region}/2026-2027/${round}-spieltag/fixture-${f.id}`,datum='2026-10-01',ura='18:00'
   const t={id:f.id,domaci:f.home,gostje:f.away,domaciId:f.homeSourceClubId,gostjeId:f.awaySourceClubId,datum,ura,odigrana:true,izid:{domaci:0,gostje:0},url,...(Object.hasOwn(f,'calendarEvidence')?{calendarEvidence:f.calendarEvidence}:{})}
   zapisniki.push({id:`de-dfb-${f.id}`,url,z:{zapisnikId:`de-dfb-${f.id}`,sezona:'2026/27',krog:round,datum,ura,domaci:team(f.home),gostje:team(f.away),rezultat:{domaci:0,gostje:0},goli:[],rumeni:[],rdeci:[],menjave:[],zgresene:[],opozorila:[]}})
   return t
  })
  razpored.push({stevilka:round,tekme})
 }
 return {slug:`de-regionalliga-${region}`,sezona:'2026/27',razpored,zapisniki,capturedAt:new Date().toISOString(),runId:'12345',jobId:'54321',documentsSha256:'c'.repeat(64)}
}
test('canonical builder accepts exact calendar evidence, preserves statistics and ordinary output shape',async()=>{
 const {sestaviSezono}=await import('./vklopi-dfb-regijo.mjs')
 for(const region of ['nord','west']){
  const s=builderInput(region),out=sestaviSezono(s),f=out.fixtures.find(f=>f.id==='de-dfb-'+reviewed[region][0].games[0][0])
  assert.equal(out.fixtures.length,306);assert.equal(out.fixtures.filter(f=>f.calendarEvidence).length,4)
  assert.equal(f.home,reviewed[region][0].home);assert.equal(f.homeSourceClubId,reviewed[region][0].homeSourceClubId)
  assert.equal(f.homeGoals,0);assert.equal(f.awayGoals,0);assert.deepEqual(f.goals,[]);assert.deepEqual(f.warnings,[])
  assert.equal(f.starters.length,22);assert.equal(f.appearances.length,22)
  for(const side of[0,1]){assert.equal(f.appearances.filter(p=>p.side===side&&p.started&&p.minutes_played===90).length,11);assert.equal(f.appearances.filter(p=>p.side===side&&p.is_goalkeeper).length,1)}
  const normal=sestaviSezono(builderInput(region,true))
  assert.equal(normal.fixtures.some(f=>Object.hasOwn(f,'calendarEvidence')||Object.hasOwn(f,'homeSourceClubId')),false)
  const plain=x=>x.fixtures.filter(f=>!f.calendarEvidence&&!reviewed[region].some(p=>p.games.some(([id])=>'de-dfb-'+id===f.id)))
  assert.deepEqual(plain(out),plain(normal))
 }
})
test('canonical builder rejects missing/forged calendar evidence and still requires current report/keeper completeness',async()=>{
 const {sestaviSezono}=await import('./vklopi-dfb-regijo.mjs')
 for(const change of [s=>delete s.razpored.flatMap(r=>r.tekme).find(t=>t.calendarEvidence).calendarEvidence,s=>s.razpored.flatMap(r=>r.tekme).find(t=>t.calendarEvidence).domaciId='wrong',s=>s.razpored.flatMap(r=>r.tekme).find(t=>t.calendarEvidence).calendarEvidence.fixture.round++,s=>{const ts=s.razpored.flatMap(r=>r.tekme);ts.find(t=>!t.calendarEvidence).calendarEvidence=ts.find(t=>t.calendarEvidence).calendarEvidence},s=>s.zapisniki.pop(),s=>s.zapisniki[0].z.domaci.postava[0].vratarVir='guess']){const s=builderInput();change(s);assert.throws(()=>sestaviSezono(s))}
})
test('existing manifest versions refuse any calendar evidence even on otherwise fresh complete ordinary seasons',async()=>{
 const {sestaviSezono,preveriOdobritev,sha,parserSha256,sourceFiles}=await import('./vklopi-dfb-regijo.mjs')
 const current=sestaviSezono(builderInput('nord',true)),archive=structuredClone(current)
 archive.season='2025/26';archive.code='regionalliga-nord/2025-2026'
 const m={version:1,slug:'de-regionalliga-nord',sourceCommit:'a'.repeat(40),parserSha256:parserSha256(),seasons:[archive,current]},check=m=>{const raw=JSON.stringify(m);return preveriOdobritev(raw,sha(raw))}
 assert.equal(check(m).slug,m.slug)
 for(const version of[1,2,3])for(const evidence of[null,{},calendar().fixtures.find(f=>f.calendarEvidence).calendarEvidence]){
  const bad=structuredClone(m);bad.version=version;bad.seasons[1].fixtures[0].calendarEvidence=evidence
  assert.throws(()=>check(bad),/calendar.*unsupported|calendar.*version|calendar.*release/i)
 }
 for(const f of ['scripts/viri/dfb-calendar.mjs','scripts/viri/dfb-calendar-receipts.json'])assert(sourceFiles.includes(f))
})
test('Südwest historical binding cannot authorize a Nord/West calendar season',async()=>{
 const {verifyDfbPolicySeason,dfbPolicyBinding,dfbStatisticsCoverage}=await import('./dfb-historical-policy.mjs'),{sestaviSezono}=await import('./vklopi-dfb-regijo.mjs')
 const s=sestaviSezono(builderInput('nord',true));for(const f of s.fixtures)f.statisticsStatus='available';s.statisticsCoverage=dfbStatisticsCoverage(s.fixtures)
 const binding=dfbPolicyBinding({slug:'de-regionalliga-suedwest',source:'dfb',source_policy:'de-dfb-suedwest-2025-historical-unavailable-v1',firstFantasyPlayedOn:'2026-10-25'})
 assert.throws(()=>verifyDfbPolicySeason(s,binding),/scope/)
})

test('Nordost fingerprint binds shared calendar module and receipt bytes without changing its gate',async()=>{
 const {sourceFiles}=await import('./vklopi-dfb-regijo.mjs'),dir=mkdtempSync(join(tmpdir(),'dfb-calendar-nordost-hash-')),base=new URL('../',import.meta.url)
 try{
  for(const file of [...sourceFiles,'scripts/vklopi-nemcijo.mjs','scripts/prenos.mjs']){const target=join(dir,file);mkdirSync(dirname(target),{recursive:true});copyFileSync(new URL(file,base),target)}
  const url=new URL('scripts/vklopi-nemcijo.mjs',base),source=readFileSync(url,'utf8').replace(/from '([^']+)'/g,(whole,spec)=>spec.startsWith('.')?`from '${new URL(spec,url).href}'`:whole)
  writeFileSync(join(dir,'scripts/vklopi-nemcijo.mjs'),source)
  const isolated=await import(pathToFileURL(join(dir,'scripts/vklopi-nemcijo.mjs')).href),before=isolated.parserSha256()
  for(const file of ['scripts/viri/dfb-calendar.mjs','scripts/viri/dfb-calendar-receipts.json']){
   const target=join(dir,file),bytes=readFileSync(target);writeFileSync(target,Buffer.concat([bytes,Buffer.from(' ')]))
   assert.notEqual(isolated.parserSha256(),before,file);writeFileSync(target,bytes)
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('builder source IDs cannot be mistaken for prefixed canonical IDs',async()=>{
 const {sestaviSezono}=await import('./vklopi-dfb-regijo.mjs'),s=builderInput('nord',true),t=s.razpored[0].tekme[0],r=s.zapisniki.find(r=>r.id==='de-dfb-'+t.id)
 t.id='de-dfb-'+t.id;r.id='de-dfb-'+t.id;r.z.zapisnikId=r.id
 assert.throws(()=>sestaviSezono(s),/fixture.*ID|fixture\/pair/)
})
test('v4 releases exact reviewed calendars with explicit direct provenance and rejects mutations',async()=>{
 const {sestaviSezono,preveriOdobritev,sha,parserSha256}=await import('./vklopi-dfb-regijo.mjs')
 for(const region of ['nord','west']){
  const current=sestaviSezono(builderInput(region)),archive=sestaviSezono(builderInput(region,true))
  archive.season='2025/26';archive.code=`regionalliga-${region}/2025-2026`
  const m={version:4,provenanceVersion:1,calendarReceiptSha256:current.fixtures.find(f=>f.calendarEvidence).calendarEvidence.receiptSha256,slug:`de-regionalliga-${region}`,sourceCommit:'a'.repeat(40),parserSha256:parserSha256(),seasons:[archive,current]},check=m=>{const raw=JSON.stringify(m);return preveriOdobritev(raw,sha(raw))}
  assert.equal(check(m).version,4)
  for(const change of [x=>x.calendarReceiptSha256='0'.repeat(64),x=>x.provenanceVersion=3,x=>x.statisticsPolicy={},x=>x.statisticsPolicy=null,x=>delete x.seasons[1].fixtures.find(f=>f.calendarEvidence).calendarEvidence,x=>x.seasons[1].fixtures.find(f=>f.calendarEvidence).calendarEvidence.witnesses[0].sha256='bad',x=>x.seasons[0].fixtures[0].calendarEvidence={},x=>x.seasons[1].lineage={},x=>x.slug='de-regionalliga-suedwest']){const bad=structuredClone(m);change(bad);assert.throws(()=>check(bad))}
 }
})
