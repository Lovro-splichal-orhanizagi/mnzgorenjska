// Composition test: authentic retained source statistics, actual replay and admission,
// offline native source, strict proof and activation gate. Only I/O boundaries are fake.
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {makePolandBulkFixture} from './lib/bulk-source-test-fixture.mjs'
import {capturePolandCandidate} from './bulk-poland-source.mjs'
import {saveBulkAdmission,loadBulkPack} from './bulk-source-packs.mjs'
import {createBulkCapturedSource} from './viri/bulk-captured.mjs'
import {loadAndVerifyBulkNative} from './bulk-native-proof.mjs'
import {collectBulkBatch,runBulkRollout} from './bulk-league-rollout.mjs'
import {rokKroga} from './razporedi.mjs'
const sha=process.env.GITHUB_SHA??'a'.repeat(40)
const clone=structuredClone
async function scenario({tamper=false}={}){
 const f=makePolandBulkFixture(),base=mkdtempSync(join(tmpdir(),'bulk-installed-')),commands=[]
 const snapshot={competition:{...clone(f.candidate),country_id:44,active:false,source_policy:null,date_only_deadline_policy:null,rok_pomak_ur:6,prvi_fantasy_krog:1},season:f.candidate.season,teams:[],players:[],rounds:[],matches:[],fantasy:{teams:[],lineups:[]}}
 let activations=0,guards=0,replays=0,proofs=0
 // Real loader, including installed catalog, code admission and raw-byte replay.
 const loadPack=async(directory,options)=>{replays++;return loadBulkPack(directory,{...options,now:f.now})}
 const team=name=>{let t=snapshot.teams.find(t=>t.name===name);if(!t){t={id:snapshot.teams.length+1,name};snapshot.teams.push(t)}return t.id}
 const player=(a,team_id)=>{let p=snapshot.players.find(p=>p.reg_st===a.regSt);if(!p){p={id:snapshot.players.length+1,reg_st:a.regSt,team_id,active:true,position:a.vratar?'GK':null,position_source:a.vratar?'zapisnik':null,value:4.5};snapshot.players.push(p)}return p.id}
 const runCommand=async(file,args,{directory,candidate})=>{
  commands.push(file)
  if(file.endsWith('/uvoz-zapisnikov.mjs')||file.endsWith('/uvoz-razporeda.mjs')){
   const code=args.includes('--liga')?args[args.indexOf('--liga')+1]:candidate.source_league_code
   const source=createBulkCapturedSource({competition:snapshot.competition,directory,loadPack})
   const schedule=await source.razporedVseStrani(code)
   const season=code===candidate.source_league_code?candidate.season:candidate.archives.find(a=>a.code===code).season
   for(const r of schedule){
    let round=snapshot.rounds.find(n=>n.season===season&&n.number===r.stevilka)
    if(!round){const day=r.tekme.map(t=>t.datum).sort()[0],time=r.tekme.filter(t=>t.datum===day).map(t=>t.ura).sort()[0];round={id:snapshot.rounds.length+1,season,number:r.stevilka,played_on:day,deadline_at:rokKroga(day,time,6)};snapshot.rounds.push(round)}
    for(const t of r.tekme){const home=team(t.domaci),away=team(t.gostje);if(!snapshot.matches.some(m=>m.round_id===round.id&&m.home_team_id===home&&m.away_team_id===away))snapshot.matches.push({id:snapshot.matches.length+1,round_id:round.id,home_team_id:home,away_team_id:away,played_on:t.datum,home_goals:0,away_goals:0,imported_at:null,zapisnik_id:null,kontumacija:false,statistics_status:'available',import_warnings:[],appearance_rows:[],goal_rows:[]})}
   }
   if(file.endsWith('/uvoz-zapisnikov.mjs'))for(const report of await source.zapisniki(code)){
    const z=report.z,round=snapshot.rounds.find(r=>r.season===season&&r.number===z.krog),home=team(z.domaci.ime),away=team(z.gostje.ime),sides=[home,away]
    const match=snapshot.matches.find(m=>m.round_id===round.id&&m.home_team_id===home&&m.away_team_id===away)
    Object.assign(match,{home_goals:z.rezultat.domaci,away_goals:z.rezultat.gostje,imported_at:f.now.toISOString(),zapisnik_id:report.id,import_warnings:clone(z.opozorila)})
    match.appearance_rows=source.nastopi(z).map(a=>({player_id:player(a,sides[a.ekipaIdx]),team_id:sides[a.ekipaIdx],shirt_number:a.st,started:a.zacetnik,is_goalkeeper:a.vratar,minute_on:a.minutaOd,minute_off:a.minutaDo,minutes_played:a.minute,goals:a.goli,own_goals:a.avtogoli,penalties_scored:a.goliIzEnajstmetrovke,penalties_missed:a.zgreseneEnajstmetrovke,yellow_cards:a.rumeni,red_cards:a.rdeci,red_card_minute:a.redCardMinute,goals_conceded:a.prejetiGoli,clean_sheet:a.cleanSheet}))
    match.goal_rows=z.goli.map(g=>({scorer_id:snapshot.players.find(p=>p.reg_st===g.regSt).id,team_id:sides[g.ekipaIdx],minute:g.minuta,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka,score_home:g.rezultat?.[0]??null,score_away:g.rezultat?.[1]??null}))
   }
  }
  if(file.endsWith('/ugani-pozicije.mjs'))for(const t of snapshot.teams){let n=0;for(const p of snapshot.players.filter(p=>p.team_id===t.id&&p.position!=='GK')){p.position=['DEF','MID','FWD'][n++%3];p.position_source='ugibanje'}}
  if(file.endsWith('/ovrednoti-igralce.mjs')){
   snapshot.players.forEach((p,i)=>p.value=i===0?12:4)
   if(tamper){const m=snapshot.matches.find(m=>m.goal_rows.length),g=m.goal_rows[0];g.scorer_id=m.appearance_rows.find(a=>a.player_id!==g.scorer_id&&a.team_id===g.team_id).player_id}
  }
  return {code:0}
 }
 const transport={snapshot:async()=>clone(snapshot),competition:async()=>clone(snapshot.competition),season:async()=>snapshot.season,rounds:async()=>clone(snapshot.rounds),matches:async()=>snapshot.matches.map(m=>({...clone(m),goals:[{count:m.goal_rows.length}],appearances:[{count:m.appearance_rows.length}]})),state:async()=>({aktivnih:snapshot.players.length,privzetih:snapshot.players.filter(p=>p.value===4.5).length,klubov:snapshot.teams.length,najvisja_cena:Math.max(...snapshot.players.map(p=>p.value)),po_pozicijah:Object.fromEntries(['GK','DEF','MID','FWD'].map(pos=>[pos,snapshot.players.filter(p=>p.position===pos).length])),nastopov_s_klopi:snapshot.matches.flatMap(m=>m.appearance_rows).filter(a=>!a.started).length,golov_brez_nastopa:snapshot.matches.flatMap(m=>m.goal_rows.filter(g=>!m.appearance_rows.some(a=>a.player_id===g.scorer_id))).length,krogov_tekoce:snapshot.rounds.filter(r=>r.season===snapshot.season).length,igralci:clone(snapshot.players)}),activate:async()=>{activations++;snapshot.competition.active=true;snapshot.competition.prvi_fantasy_krog=2;return {vklopljena:true,prvi_krog:2,razlika:0}}}
 try{
  const sourceReport=await collectBulkBatch({candidates:[f.candidate],expectedSha:sha,directory:base,capture:(candidate,o)=>capturePolandCandidate(candidate,{...f,...o}),saveAdmission:saveBulkAdmission})
  assert.equal(sourceReport.status,'STAGED')
  const report=await runBulkRollout({sourceReport,expectedSha:sha,transport,guard:async()=>{guards++},runCommand,loadPack,verifyNative:async options=>{proofs++;return loadAndVerifyBulkNative(options)},now:()=>f.now})
  return {report,activations,commands,guards,replays,proofs,sourceRequests:f.calls.length,snapshot}
 }finally{rmSync(base,{recursive:true,force:true})}
}
test('installed PL pipeline activates replayed source data, holds a changed native scorer, then passes independently again',async()=>{
 const originalFetch=globalThis.fetch
 globalThis.fetch=()=>{throw Error('Unexpected network access in installed pipeline test')}
 try{
  for(const tamper of [false,true,false]){
   const r=await scenario({tamper}),result=r.report.results[0]
   assert.equal(result.status,tamper?'HOLD':'ACTIVE',JSON.stringify(result))
   assert.equal(r.activations,tamper?0:1)
   assert.equal(r.proofs,1);assert.equal(r.commands.length,6);assert.ok(r.guards>=8);assert.ok(r.replays>=5);assert.equal(r.sourceRequests,20)
   if(tamper){assert.match(result.reason,/goal\/scorer/);assert.equal(r.snapshot.competition.active,false);assert.equal(result.steps.some(s=>s.stage==='activate'),false)}
   else{assert.equal(result.proof.contract_id,'bulk-native-source-replay-v1');assert.equal(result.proof.reports,12);assert.equal(result.proof.fixtures,15);assert.equal(result.activation.status,'ACTIVE');assert.equal(result.activation.assessment.pripravljena,true);assert.equal(result.readback.prvi_fantasy_krog,2)}
  }
 }finally{globalThis.fetch=originalFetch}
})
