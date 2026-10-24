import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {vZapisnik,nastopi} from './viri/mlsz.mjs'
import {rokKroga} from './razporedi.mjs'
import {produceMlszProof,replayMlszProof,MLSZ_BATCH_MAPPINGS,createMlszContract,loadMlszPage,strictMlszSchedule} from './mlsz-provider-proof.mjs'
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),sha='a'.repeat(40),now=new Date('2026-10-24T18:00:00Z')
const raw=readFileSync(new URL('./vzorci/hu-adatbank-tekma-65-20-31672-2090962.html',import.meta.url),'utf8')
// Synthetic league metadata/schedule around an authentic report body; never production source evidence.
function report(code,id) {
 const [ev,sz,league]=code.split('/'),year=ev==='67'?'2026':'2025'
 return raw.replace(/value="65" id="hiddenEvad"/,`value="${ev}" id="hiddenEvad"`).replace(/value="20" id="hiddenSzervezet"/,`value="${sz}" id="hiddenSzervezet"`).replace(/value="31672" id="hiddenVerseny"/,`value="${league}" id="hiddenVerseny"`).replace(/value="7" id="hiddenFordulo"/,'value="1" id="hiddenFordulo"').replace(/7\. forduló/g,'1. forduló').replace(/<option selected value=65>2025\/2026/,`<option selected value=${ev}>${year}/${Number(year)+1}`).replaceAll('2090962',id)
}
function schedule(code,round,id,score,home,away) {
 const [ev,sz,league]=code.split('/'),current=ev==='67',date=round===2?'2026. 11. 07. 14:30':'2025. 10. 04. 14:30'
 return `<input value="${ev}" id="hiddenEvad"><input value="${sz}" id="hiddenSzervezet"><input value="${league}" id="hiddenVerseny"><input value="${round}" id="hiddenFordulo"><select><option selected value=${ev}>${current?'2026/2027':'2025/2026'}</option></select><span id="turnsTitle"></span><select><option value=1>1. forduló</option>${current?'<option value=2>2. forduló</option>':''}</select><div id="match_panel"><div class="schedule"><div class="home_team"><span>${home}</span></div><div class="away_team"><span>${away}</span></div><div class="schedule-points">${score??''}</div><a href="/match/${code}/${round}/${id}.html">report</a><div class="team_sorsolas_date">${date}</div></div><div class="team_lapbar"></div>`
}
export function proofFixture() {
 const candidate=structuredClone(MLSZ_BATCH_MAPPINGS[0]),pages=new Map(),snapshot={competition:{...candidate,active:false,source_policy:null,date_only_deadline_policy:null,rok_pomak_ur:2},season:'2026/27',teams:[],players:[],rounds:[],matches:[],fantasy:{teams:[],lineups:[]}},playerMap=new Map()
 for(const [index,code]of [candidate.archives[0].code,candidate.source_league_code].entries()) {
  const id=String(9000001+index),html=report(code,id),z=vZapisnik(html,{id}),ns=nastopi(z),roundId=index+1
  if(!snapshot.teams.length)snapshot.teams=[{id:1,name:z.domaci.ime},{id:2,name:z.gostje.ime}]
  snapshot.rounds.push({id:roundId,number:1,season:z.sezona,played_on:z.datum,deadline_at:'2025-10-04T10:30:00Z'})
  const rows=ns.map(n=>{if(!playerMap.has(n.regSt)){const p={id:playerMap.size+1,reg_st:n.regSt,team_id:n.ekipaIdx+1,active:true,position:n.vratar?'GK':'MID',position_source:'zapisnik',value:5};playerMap.set(n.regSt,p);snapshot.players.push(p)}return {player_id:playerMap.get(n.regSt).id,team_id:n.ekipaIdx+1,shirt_number:n.st,started:n.zacetnik,is_goalkeeper:n.vratar,minute_on:n.minutaOd,minute_off:n.minutaDo,minutes_played:n.minute,goals:n.goli,own_goals:n.avtogoli,penalties_scored:n.goliIzEnajstmetrovke,penalties_missed:0,yellow_cards:n.rumeni,red_cards:n.rdeci,red_card_minute:n.redCardMinute,goals_conceded:n.prejetiGoli,clean_sheet:n.cleanSheet}})
  const goals=z.goli.map((g,i)=>{const actor=ns.find(n=>n.ekipaIdx===g.ekipaIdx&&n.st===g.st&&n.ime===g.ime);return {id:i+1,scorer_id:playerMap.get(actor.regSt).id,team_id:g.ekipaIdx+1,minute:g.minuta,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka}})
  snapshot.matches.push({id:roundId,round_id:roundId,zapisnik_id:id,home_team_id:1,away_team_id:2,played_on:z.datum,imported_at:'2026-10-24T17:00:00Z',home_goals:z.rezultat.domaci,away_goals:z.rezultat.gostje,kontumacija:false,statistics_status:'complete',import_warnings:z.opozorila,appearance_rows:rows,goal_rows:goals})
  pages.set(`https://adatbank.mlsz.hu/league/${code}/1.html`,schedule(code,1,id,`${z.rezultat.domaci} - ${z.rezultat.gostje}`,z.domaci.ime,z.gostje.ime))
  pages.set(`https://adatbank.mlsz.hu/match/${code}/1/${id}.html`,html)
  if(index===1){pages.set(`https://adatbank.mlsz.hu/league/${code}/2.html`,schedule(code,2,'9000003',null,z.domaci.ime,z.gostje.ime));snapshot.rounds.push({id:3,number:2,season:snapshot.season,played_on:'2026-11-07',deadline_at:rokKroga('2026-11-07','14:30',2)});snapshot.matches.push({id:3,round_id:3,zapisnik_id:null,home_team_id:1,away_team_id:2,played_on:'2026-11-07',imported_at:null,home_goals:0,away_goals:0,kontumacija:false,import_warnings:[],appearance_rows:[],goal_rows:[]})}
 }
 const receipts={expected_sha:sha,slug:candidate.slug,snapshot_sha256:hash(snapshot),steps:['keepers','positions','prices'].map(stage=>({stage,status:'COMPLETED',completed_at:'2026-10-24T17:59:00Z'}))}
 const calls=[],loadPage=async(url,{kind})=>{calls.push({url,kind});if(!pages.has(url))throw Error('Unmapped offline source URL');return {bytes:Buffer.from(pages.get(url)),captured_at:kind==='schedule'?now.toISOString():'2026-01-01T00:00:00Z',obtained:kind==='schedule'?'network':'cache'}}
 return {candidate,snapshot,receipts,pages,calls,loadPage}
}
async function generate(f=proofFixture()) {const dir=mkdtempSync(join(tmpdir(),'mlsz-proof-'));try{return {f,dir,proof:await produceMlszProof({...f,expectedSha:sha,evidenceRoot:join(dir,'evidence'),now,loadPage:f.loadPage}),dispose:()=>rmSync(dir,{recursive:true,force:true})}}catch(e){rmSync(dir,{recursive:true,force:true});throw e}}
test('real MLSZ adapter producer and replay establish passing source proof with accurately labelled keeper inference',async()=>{
 const g=await generate();try{assert.equal(g.proof.keeper_basis,'mlsz-published-order-inference');assert.equal(g.proof.schedule_complete,true);assert.equal(g.proof.report_count,2);assert.equal(g.proof.fixture_count,3);assert.equal(replayMlszProof({candidate:g.f.candidate,expectedSha:sha,snapshot:g.f.snapshot,proof:g.proof,now}),true);assert.ok(g.proof.pages.filter(p=>p.kind==='report').every(p=>p.captured_at==='2026-01-01T00:00:00Z'))}finally{g.dispose()}
})
for(const [name,mutate]of [
 ['source profile',s=>s.players[0].reg_st++],['published keeper order',s=>s.matches[0].appearance_rows[0].is_goalkeeper=false],['side goal',s=>s.matches[0].goal_rows[0].team_id=2],['individual minute',s=>s.matches[0].appearance_rows[0].minute_off--],['unknown native warning',s=>s.matches[0].import_warnings=['unexplained']],['historical exclusion',s=>s.matches[0].statistics_status='unavailable_historical'],['future calendar',s=>s.rounds[2].deadline_at='2026-11-07T10:00:00Z'],['archive ownership',s=>s.matches.splice(0,1)],['missing current fixture',s=>s.matches.pop()],
])test(`producer HOLDs changed ${name}`,async()=>{
 const f=proofFixture();mutate(f.snapshot);f.receipts.snapshot_sha256=hash(f.snapshot);await assert.rejects(()=>generate(f),e=>e.dataHold===true)
})
test('tampered retained source bytes and wrong commit/tuple/manifest cannot authorize replay',async()=>{
 const g=await generate();try{for(const patch of [{expected_sha:'b'.repeat(40)},{candidate:{...g.f.candidate,id:999}},{schedule_complete:false}])assert.throws(()=>replayMlszProof({candidate:g.f.candidate,expectedSha:sha,snapshot:g.f.snapshot,proof:{...g.proof,...patch},now}));writeFileSync(join(g.proof.evidence_root,g.proof.pages[0].file),'tampered');assert.throws(()=>replayMlszProof({candidate:g.f.candidate,expectedSha:sha,snapshot:g.f.snapshot,proof:g.proof,now}),/digest|bytes/i)}finally{g.dispose()}
})
test('fresh generation never launders stale or cached schedule captures',async()=>{
 for(const patch of [{captured_at:'2020-01-01T00:00:00Z'},{obtained:'cache'}]){const f=proofFixture(),original=f.loadPage;f.loadPage=async(...args)=>({...await original(...args),...(args[1].kind==='schedule'?patch:{})});await assert.rejects(()=>generate(f),/fresh|schedule/i)}
})
test('absent fresh pricing receipts cannot establish passing proof',async()=>{
 const f=proofFixture();f.receipts.steps.pop();await assert.rejects(()=>generate(f),/pric/i)
})
test('production contract invokes only fixed budgeted proof child and replays returned bytes against final snapshot',async()=>{
 const f=proofFixture(),dir=mkdtempSync(join(tmpdir(),'mlsz-installed-')),calls=[]
 try{const contract=createMlszContract({outputDirectory:dir,budgetPath:join(dir,'budget.json'),maxRequests:10,runCommand:async(file,args,options)=>{calls.push({file,args,options});const input=JSON.parse(readFileSync(args[args.indexOf('--input')+1]));const proof=await produceMlszProof({...input,expectedSha:input.expected_sha,evidenceRoot:args[args.indexOf('--evidence')+1],now,loadPage:f.loadPage});writeFileSync(args[args.indexOf('--output')+1],JSON.stringify(proof));return {code:0}}});const audit={snapshot_sha256:hash(f.snapshot)},proof=await contract.capture({candidate:f.candidate,expectedSha:sha,snapshot:f.snapshot,audit,receipts:f.receipts,now});assert.equal(contract.verify({candidate:f.candidate,expectedSha:sha,snapshot:f.snapshot,audit,proof,now}),true);assert.equal(calls[0].file,'scripts/mlsz-provider-proof.mjs');assert.equal(calls[0].options.maxRequests,10);assert.equal(calls[0].options.budgetPath,join(dir,'budget.json'));assert.throws(()=>contract.verify({candidate:f.candidate,expectedSha:sha,snapshot:{...f.snapshot,season:'changed'},audit,proof,now}))}finally{rmSync(dir,{recursive:true,force:true})}
})
function sixClubFixture() {
 const f=proofFixture(),base=structuredClone(f.snapshot),basePages=[...f.pages]
 for(let pair=1;pair<3;pair++) {
  const offset=pair*10000,regOffset=pair*10000000
  const names=base.teams.map(t=>[t.name,`${t.name} Pair ${pair}`])
  const transform=html=>{for(const [old,name]of names)html=html.replaceAll(old,name);return html.replace(/player\/(\d+)\.html/g,(_,id)=>`player/${Number(id)+regOffset}.html`).replace(/900000([123])/g,(_,n)=>String(9000000+Number(n)+pair*100))}
  for(const team of base.teams)f.snapshot.teams.push({...team,id:team.id+pair*2,name:names.find(([name])=>name===team.name)[1]})
  for(const p of base.players)f.snapshot.players.push({...p,id:p.id+offset,reg_st:p.reg_st+regOffset,team_id:p.team_id+pair*2})
  for(const m of base.matches)f.snapshot.matches.push({...structuredClone(m),id:m.id+pair*10,home_team_id:m.home_team_id+pair*2,away_team_id:m.away_team_id+pair*2,zapisnik_id:m.zapisnik_id?String(Number(m.zapisnik_id)+pair*100):null,appearance_rows:m.appearance_rows.map(a=>({...a,player_id:a.player_id+offset,team_id:a.team_id+pair*2})),goal_rows:m.goal_rows.map(g=>({...g,scorer_id:g.scorer_id+offset,team_id:g.team_id+pair*2}))})
  for(const [url,html]of basePages)if(url.includes('/match/'))f.pages.set(transform(url),transform(html));else {
   const row=html.slice(html.indexOf('<div class="schedule">'),html.indexOf('<div class="team_lapbar">'))
   f.pages.set(url,f.pages.get(url).replace('<div class="team_lapbar">',transform(row)+'<div class="team_lapbar">'))
  }
 }
 let index=0
 for(const p of f.snapshot.players){if(p.position!=='GK')p.position=['DEF','MID','FWD'][index++%3];p.value=p.id===1?12:4}
 f.receipts.snapshot_sha256=hash(f.snapshot);return f
}
test('installed production MLSZ contract reaches the existing native activation gate after real adapter proof replay',async()=>{
 const {runProviderBatch}=await import('./provider-league-batch.mjs'),f=sixClubFixture(),dir=mkdtempSync(join(tmpdir(),'mlsz-real-flow-')),calls=[];let active=false,activated=0
 try {
  const transport={snapshot:async()=>structuredClone(f.snapshot),competition:async()=>({...f.snapshot.competition,active,prvi_fantasy_krog:active?2:1}),season:async()=>f.snapshot.season,rounds:async()=>f.snapshot.rounds,matches:async()=>f.snapshot.matches.map(m=>({...m,goals:[{count:m.goal_rows.length}],appearances:[{count:m.appearance_rows.length}]})),state:async()=>({aktivnih:f.snapshot.players.length,privzetih:0,klubov:6,najvisja_cena:12,po_pozicijah:{},nastopov_s_klopi:5,golov_brez_nastopa:0,krogov_tekoce:2,igralci:f.snapshot.players}),activate:async()=>{active=true;activated++;return {vklopljena:true,prvi_krog:2,razlika:0}}}
  const runCommand=async(file,args)=>{calls.push(file);if(file==='scripts/mlsz-provider-proof.mjs'){const input=JSON.parse(readFileSync(args[args.indexOf('--input')+1]));const proof=await produceMlszProof({...input,expectedSha:input.expected_sha,evidenceRoot:args[args.indexOf('--evidence')+1],now,loadPage:f.loadPage});writeFileSync(args[args.indexOf('--output')+1],JSON.stringify(proof))}return {code:0}}
  const r=await runProviderBatch({candidates:[f.candidate],expectedSha:sha,transport,guard:async()=>{},runCommand,now:()=>now,budgetPath:join(dir,'budget.json'),maxRequests:100,logDirectory:join(dir,'logs')})
  assert.equal(r.status,'ACTIVE',JSON.stringify(r.results));assert.equal(activated,1);assert.equal(calls.filter(f=>f==='scripts/mlsz-provider-proof.mjs').length,1);assert.equal(r.results[0].source_proof.keeper_basis,'mlsz-published-order-inference')
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('complete legacy report cache retains original bytes and timestamp without another request; schedules refresh',async()=>{
 const {utimesSync,statSync}=await import('node:fs'),f=proofFixture(),dir=mkdtempSync(join(tmpdir(),'mlsz-cache-')),oldBudget=process.env.SLFF_PROVIDER_BUDGET_PATH
 try{process.env.SLFF_PROVIDER_BUDGET_PATH=join(dir,'budget.json');const code=f.candidate.source_league_code,url=`https://adatbank.mlsz.hu/match/${code}/1/9000002.html`,path=join(dir,`tekma-${code.replaceAll('/','-')}-9000002.html`),bytes=Buffer.from(f.pages.get(url));writeFileSync(path,bytes);utimesSync(path,new Date('2026-01-01'),new Date('2026-01-01'));let count=0;const request=async u=>{count++;return new Response(f.pages.get(String(u)))};const page=await loadMlszPage(url,{kind:'report',code,round:1,report_id:'9000002'},{cacheDirectory:dir,request});assert.equal(count,0);assert.deepEqual(page.bytes,bytes);assert.equal(page.captured_at,'2026-01-01T00:00:00.000Z');assert.equal(statSync(path).mtime.toISOString(),page.captured_at);await loadMlszPage(`https://adatbank.mlsz.hu/league/${code}/1.html`,{kind:'schedule',code,round:1},{cacheDirectory:dir,request});assert.equal(count,1)}finally{if(oldBudget===undefined)delete process.env.SLFF_PROVIDER_BUDGET_PATH;else process.env.SLFF_PROVIDER_BUDGET_PATH=oldBudget;rmSync(dir,{recursive:true,force:true})}
})
test('invalid fresh network HTML stops the provider instead of becoming a league data HOLD',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mlsz-bad-response-')),oldBudget=process.env.SLFF_PROVIDER_BUDGET_PATH
 try{process.env.SLFF_PROVIDER_BUDGET_PATH=join(dir,'budget.json');await assert.rejects(()=>loadMlszPage('https://adatbank.mlsz.hu/league/67/14/34252/1.html',{kind:'schedule',code:'67/14/34252',round:1},{cacheDirectory:dir,request:async()=>new Response('unexplained server failure')}),e=>e.sourceStop===true)}finally{if(oldBudget===undefined)delete process.env.SLFF_PROVIDER_BUDGET_PATH;else process.env.SLFF_PROVIDER_BUDGET_PATH=oldBudget;rmSync(dir,{recursive:true,force:true})}
})
test('a published source row silently filtered by adapter round binding cannot yield complete proof',async()=>{
 const f=proofFixture(),url=`https://adatbank.mlsz.hu/league/${f.candidate.source_league_code}/1.html`
 f.pages.set(url,f.pages.get(url).replace('<div class="team_lapbar">',`<div class="schedule"><div class="home_team"><span>Unbound SC</span></div><div class="away_team"><span>Unbound SE</span></div><div class="schedule-points">1 - 0</div><a href="/match/${f.candidate.source_league_code}/2/9999999.html">report</a><div class="team_sorsolas_date">2026. 10. 01. 14:30</div></div><div class="team_lapbar">`))
 await assert.rejects(()=>generate(f),/source row|round binding|unparsed/i)
})
test('live producer generation uses the completion clock rather than rejecting its later network capture timestamps',async()=>{
 const f=proofFixture(),dir=mkdtempSync(join(tmpdir(),'mlsz-live-clock-'));f.receipts.steps.forEach(s=>s.completed_at=new Date(Date.now()-1000).toISOString())
 const original=f.loadPage;const loadPage=async(...args)=>{await new Promise(r=>setTimeout(r,2));const page=await original(...args);return {...page,captured_at:args[1].kind==='schedule'?new Date().toISOString():page.captured_at}}
 try{const proof=await produceMlszProof({...f,expectedSha:sha,evidenceRoot:join(dir,'evidence'),loadPage});assert.equal(replayMlszProof({candidate:f.candidate,expectedSha:sha,snapshot:f.snapshot,proof}),true)}finally{rmSync(dir,{recursive:true,force:true})}
})
test('source missed penalties must exactly match every native appearance',async()=>{
 const f=proofFixture();assert.equal(vZapisnik(f.pages.get(`https://adatbank.mlsz.hu/match/${f.candidate.source_league_code}/1/9000002.html`)).zgresene.length,0)
 f.snapshot.matches[0].appearance_rows[0].penalties_missed=1;f.receipts.snapshot_sha256=hash(f.snapshot)
 await assert.rejects(()=>generate(f),/penalties_missed/i)
})
for(const opening of ["<div class='schedule'>",'<div data-live="yes" class="schedule">','<DIV class="schedule">','<div class = schedule>','<div class="other schedule">'])test(`unrecognized legal live source row ${opening} cannot certify complete inventory`,async()=>{
 const f=proofFixture(),url=`https://adatbank.mlsz.hu/league/${f.candidate.source_league_code}/1.html`,extra=`${opening}<div class="home_team"><span>Unbound SC</span></div><div class="away_team"><span>Unbound SE</span></div><div class="schedule-points">1 - 0</div><a href="/match/${f.candidate.source_league_code}/1/9999999.html">report</a><div class="team_sorsolas_date">2026. 10. 01. 14:30</div></div>`
 f.pages.set(url,f.pages.get(url).replace('<div class="team_lapbar">',extra+'<div class="team_lapbar">'))
 await assert.rejects(()=>generate(f),e=>e.dataHold===true)
})

const actualRound=readFileSync(new URL('./vzorci/hu-adatbank-krog-67-20-33915-8.html',import.meta.url),'utf8')
const addedRow=(opening='<div class="schedule">')=>`${opening}<div class="home_team"><span>Unbound SC</span></div><div class="away_team"><span>Unbound SE</span></div><div class="schedule-points">1 - 0</div><a href="/match/67/20/33915/8/9999999.html">report</a><div class="team_sorsolas_date">2026. 10. 01. 14:30</div></div>`
test('authentic live match panel inventories six fixtures and excludes the actual sidebar other-round rows',()=>{
 assert.equal(strictMlszSchedule(actualRound,'67/20/33915',8).length,6)
})
for(const opening of ["<div class='schedule'>",'<div data-text="a > b" class="schedule">','<DIV CLASS="schedule">','<div class = schedule>','<div class="other schedule">'])test(`authentic source HTML unmatched live row ${opening} HOLDs`,()=>{
 const changed=actualRound.replace('<div class="schedule ">',addedRow(opening)+'<div class="schedule ">')
 assert.throws(()=>strictMlszSchedule(changed,'67/20/33915',8),e=>e.dataHold===true)
})
for(const inert of [row=>`<!--${row}-->`,row=>`<script>const row='${row}'</script>`,row=>`<template>${row}</template>`,row=>`<template><template>${row}</template>${row}</template>`,row=>`<textarea>${row}</textarea>`])test('inert fixture markup inside authentic source panel never becomes a published source row',()=>{
 const changed=actualRound.replace('<div class="schedule ">',inert(addedRow())+'<div class="schedule ">')
 assert.equal(strictMlszSchedule(changed,'67/20/33915',8).length,6)
})
