import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {rokKroga} from './razporedi.mjs'
import {fussballPlayerKey} from './fussball-import.mjs'
import {encodeUnattributedYellow} from '../src/lib/nepripisaniRumeni.mjs'
const api=await import('./bulk-native-proof.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const wrapper=await import('./viri/bulk-captured.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const sha='a'.repeat(40),now=new Date('2026-10-25T12:00:00Z'),digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
function fixture(){
 const candidate={id:123,slug:'pl-proof',source:'pzpn',source_league_code:'current',country_code:'PL',season:'2026/27',host:'szpnkielce.pl',archives:[{code:'archive',season:'2025/26'}]}
 const teams=[{id:1,name:'ŁKS Test'},{id:2,name:'Guests FC'}],players=Array.from({length:22},(_,i)=>({id:i+1,reg_st:1000+i,team_id:i<11?1:2,active:true,position:i%11===0?'GK':'MID',position_source:'zapisnik',value:5}))
 const pack={version:1,candidate:structuredClone(candidate),captured_at:now.toISOString(),original_bytes_sha256:'b'.repeat(64),seasons:[]}
 const snapshot={competition:{...candidate,active:false,country_id:44,source_policy:null,date_only_deadline_policy:null,rok_pomak_ur:6},season:candidate.season,teams,players,rounds:[],matches:[],fantasy:{teams:[],lineups:[]}}
 for(const [i,scope]of [{code:'archive',season:'2025/26'},{code:'current',season:'2026/27'}].entries()){
  const datum=i?'2026-10-04':'2025-10-04',id='pl-report-'+i
  const ns=players.map(p=>({regSt:p.reg_st,ime:'Player '+p.id,st:p.id,ekipaIdx:p.team_id-1,zacetnik:true,vratar:p.position==='GK',minutaOd:0,minutaDo:90,minute:90,goli:p.id===2?1:0,avtogoli:0,goliIzEnajstmetrovke:0,zgreseneEnajstmetrovke:0,rumeni:0,rdeci:0,redCardMinute:null,prejetiGoli:p.team_id===2?1:0,cleanSheet:p.team_id===1}))
  const goal={regSt:players[1].reg_st,ekipaIdx:0,st:2,ime:'Player 2',minuta:30,avtogol:false,enajstmetrovka:false,rezultat:[1,0]}
  const z={zapisnikId:id,krog:1,sezona:scope.season,datum,ura:'15:00',domaci:{ime:teams[0].name,postava:ns.slice(0,11),rezerve:[]},gostje:{ime:teams[1].name,postava:ns.slice(11),rezerve:[]},rezultat:{domaci:1,gostje:0},goli:[goal],rumeni:[],rdeci:[],menjave:[],opozorila:[],nepopoln:false}
  const schedule=[{stevilka:1,tekme:[{domaci:teams[0].name,gostje:teams[1].name,datum,ura:'15:00',odigrana:true,kontumacija:false}]}]
  pack.seasons.push({...scope,schedule,reports:[{id,url:'https://source.example/'+id,z,nastopi:ns}]})
  snapshot.rounds.push({id:i+1,number:1,season:scope.season,played_on:datum,deadline_at:rokKroga(datum,'15:00',6)})
  snapshot.matches.push({id:i+1,round_id:i+1,zapisnik_id:id,played_on:datum,home_team_id:1,away_team_id:2,home_goals:1,away_goals:0,imported_at:now.toISOString(),statistics_status:'complete',kontumacija:false,vir_brez_izida:false,import_warnings:[],appearance_rows:ns.map((a,j)=>({id:j+1,player_id:j+1,team_id:a.ekipaIdx+1,shirt_number:a.st,started:a.zacetnik,is_goalkeeper:a.vratar,minute_on:a.minutaOd,minute_off:a.minutaDo,minutes_played:a.minute,goals:a.goli,own_goals:a.avtogoli,penalties_scored:0,penalties_missed:0,yellow_cards:0,red_cards:0,red_card_minute:null,goals_conceded:a.prejetiGoli,clean_sheet:a.cleanSheet})),goal_rows:[{id:i+1,scorer_id:2,team_id:1,minute:30,is_own_goal:false,is_penalty:false,score_home:1,score_away:0}]})
 }
 const receipts={expected_sha:sha,slug:candidate.slug,snapshot_sha256:digest(snapshot),steps:['keepers','positions','prices'].map(stage=>({stage,status:'COMPLETED',completed_at:now.toISOString()}))}
 return {candidate,pack,snapshot,receipts,expectedSha:sha,now}
}
const verify=f=>{assert.equal(typeof api.verifyBulkNative,'function');return api.verifyBulkNative(f)}
const rebind=f=>{f.receipts.snapshot_sha256=digest(f.snapshot);return f}
test('strict bulk source proof binds exact archive/current individuals, source hash and fresh native snapshot',()=>{
 const f=fixture(),p=verify(f);assert.equal(p.snapshot_sha256,digest(f.snapshot));assert.equal(p.original_bytes_sha256,f.pack.original_bytes_sha256);assert.equal(p.expected_sha,sha);assert.equal(p.activationEligible,false);assert.equal(p.reports,2)
})
for(const [name,mutate]of [
 ['scorer',f=>f.snapshot.matches[0].goal_rows[0].scorer_id=3],['own-goal side',f=>f.snapshot.matches[0].goal_rows[0].is_own_goal=true],['minute',f=>f.snapshot.matches[0].appearance_rows[0].minutes_played=89],['keeper',f=>f.snapshot.matches[0].appearance_rows[0].is_goalkeeper=false],['missed penalty',f=>f.snapshot.matches[0].appearance_rows[0].penalties_missed=1],['red clock',f=>f.snapshot.matches[0].appearance_rows[0].red_card_minute=25],['goal progression',f=>f.snapshot.matches[0].goal_rows[0].score_home=2],['report omission',f=>f.pack.seasons[0].reports=[]],['native report omission',f=>f.snapshot.matches.pop()],['extra match',f=>f.snapshot.matches.push({...f.snapshot.matches[0],id:99})],['extra round',f=>f.snapshot.rounds.push({...f.snapshot.rounds[0],id:99,number:2})],['deadline',f=>f.snapshot.rounds[1].deadline_at='2026-10-04T01:00:00Z'],['date',f=>f.snapshot.matches[1].played_on='2026-10-05'],['archive',f=>f.pack.seasons[0].code='different'],['source warning',f=>f.pack.seasons[0].reports[0].z.opozorila=['unknown']],['native warning',f=>f.snapshot.matches[0].import_warnings=['unknown']],['active',f=>f.snapshot.competition.active=true],['fantasy',f=>f.snapshot.fantasy.teams=[{id:1}]],['policy',f=>f.snapshot.competition.source_policy='custom'],['exclusion',f=>f.snapshot.matches[0].statistics_status='unavailable_historical'],['roles',f=>f.pack.seasons[0].reports[0].nastopi[0].vratar=false],
])test(`bulk proof refuses ${name} drift`,()=>{const f=fixture();mutate(f);assert.throws(()=>verify(rebind(f)),e=>e.dataHold===true)})
test('source historical side uses appearance team, not the player current club',()=>{const f=fixture();f.snapshot.players[1].team_id=2;assert.equal(verify(rebind(f)).reports,2)})
test('stale pricing, stale capture, commit mismatch and source digest omission fail closed',()=>{
 for(const change of [f=>f.receipts.steps[0].completed_at='2020-01-01T00:00:00Z',f=>f.receipts.expected_sha='c'.repeat(40),f=>f.pack.captured_at='2020-01-01T00:00:00Z',f=>delete f.pack.original_bytes_sha256]){const f=fixture();change(f);assert.throws(()=>verify(f))}
})
test('fresh source load is replayed before native comparison and receives exact candidate',async()=>{
 const f=fixture(),calls=[];assert.equal(typeof api.loadAndVerifyBulkNative,'function')
 const p=await api.loadAndVerifyBulkNative({...f,directory:'/capture',loadPack:async(dir,options)=>{calls.push({dir,options});return f.pack}})
 assert.equal(p.reports,2);assert.equal(calls[0].dir,'/capture');assert.equal(calls[0].options.requireFresh,true);assert.deepEqual(calls[0].options.candidate,f.candidate)
})
test('offline captured factory is synchronous, lazy, one-code bound and protects exact report-owned appearances',async()=>{
 const f=fixture(),calls=[];assert.equal(typeof wrapper.createBulkCapturedSource,'function')
 const source=wrapper.createBulkCapturedSource({competition:f.snapshot.competition,directory:'/capture',loadPack:async(dir,options)=>{calls.push({dir,options});return f.pack}})
 assert.equal(typeof source.then,'undefined');assert.equal(calls.length,0)
 const schedule=await source.razporedVseStrani('current');assert.equal(schedule.length,1)
 const reports=await source.zapisniki('current');assert.equal(reports.length,1);assert.equal(source.nastopi(reports[0].z)[0].minute,90);const ns=source.nastopi(reports[0].z);ns[0].minute=1;assert.equal(source.nastopi(reports[0].z)[0].minute,90)
 assert.throws(()=>source.nastopi(structuredClone(reports[0].z)));await assert.rejects(()=>source.zapisniki('archive'));assert.equal(calls.length,1);assert.equal(calls[0].options.requireFresh,true)
})
test('offline factory rejects changed tuple, active, country, fantasy policy and unbound archive before exposing data',async()=>{
 for(const patch of [{active:true},{country_code:'DE'},{source_policy:'other'},{date_only_deadline_policy:'other'}])assert.throws(()=>wrapper.createBulkCapturedSource({competition:{...fixture().snapshot.competition,...patch},directory:'/capture'}))
 const f=fixture();f.pack.candidate.slug='pl-other';const source=wrapper.createBulkCapturedSource({competition:f.snapshot.competition,directory:'/capture',loadPack:async()=>f.pack});await assert.rejects(()=>source.zapisniki('current'))
})

function germanFixture(){
 const f=fixture();Object.assign(f.candidate,{slug:'de-proof',source:'fussball-public',country_code:'DE',host:'www.fussball.de'});f.pack.candidate=structuredClone(f.candidate);Object.assign(f.snapshot.competition,f.candidate)
 const mapping=new Map(f.snapshot.players.map((p,i)=>{const source_id='de-fussball-player-id-'+String(i+1).padStart(32,'0');return [p.reg_st,{source_id,reg_st:fussballPlayerKey(source_id)}]}))
 for(const p of f.snapshot.players)p.reg_st=mapping.get(p.reg_st).reg_st
 for(const [i,season]of f.pack.seasons.entries())for(const r of season.reports){
  const matchId=String(i+100).padStart(32,'0');r.id='de-fussball-'+matchId;r.url='https://www.fussball.de/spiel/-/spiel/'+matchId;r.z.zapisnikId=r.id;f.snapshot.matches[i].zapisnik_id=r.id
  for(const a of r.nastopi){const identity=mapping.get(a.regSt);a.regSt=identity.reg_st;a.virId=identity.source_id}
  for(const g of r.z.goli)g.regSt=mapping.get(g.regSt).reg_st
 }
 f.receipts.slug=f.candidate.slug;return rebind(f)
}
test('German proof uses the actual provider club key and permits only exact encoded source-bound unattributed yellows',()=>{
 const f=germanFixture(),r=f.pack.seasons[0].reports[0],warning=encodeUnattributedYellow({source:'fussball',matchId:r.id,sourceUrl:r.url,side:0,clock:"45+1'",minute:45,reason:'not-published',eventSha256:'d'.repeat(64),ordinal:0,profileId:null})
 r.z.opozorila=[warning];f.snapshot.matches[0].import_warnings=[warning];assert.equal(verify(rebind(f)).reports,2)
 r.z.opozorila=[warning.replace('not-published','guessed')];assert.throws(()=>verify(f))
})
test('German source wrapper reserves complete published identities once before returning any reports',async()=>{
 const f=germanFixture(),calls=[],db={rpc:async(name,args)=>{calls.push({name,args});return {error:null,data:args.p_source_ids.map(source_id=>({source_id,reg_st:fussballPlayerKey(source_id)}))}}}
 const source=wrapper.createBulkCapturedSource({competition:f.snapshot.competition,db,directory:'/captured',loadPack:async()=>f.pack})
 const reports=await source.zapisniki('current');assert.equal(reports.length,1);assert.equal(calls.length,1);assert.equal(calls[0].name,'fussball_reserve_player_ids');assert.equal(calls[0].args.p_source_ids.length,22)
 await source.zapisniki('current');assert.equal(calls.length,1)
 const failed=wrapper.createBulkCapturedSource({competition:f.snapshot.competition,db:{rpc:async()=>({data:null,error:{message:'collision'}})},directory:'/captured',loadPack:async()=>f.pack})
 await assert.rejects(()=>failed.zapisniki('current'),/identity reservation/)
})
test('new German registration binds runtime positive id while all original candidate fields remain exact',()=>{
 const f=germanFixture();delete f.pack.candidate.id;assert.equal(verify(f).reports,2)
 f.pack.candidate.seedUrl='changed';assert.throws(()=>verify(f))
})
test('source red-card minute is normalized from its exact recipient event and must be stored natively',async()=>{
 const f=fixture(),r=f.pack.seasons[1].reports[0],a=r.nastopi[1],n=f.snapshot.matches[1].appearance_rows[1]
 a.rdeci=1;a.minutaDo=a.minute=75;delete a.redCardMinute;r.z.rdeci=[{regSt:a.regSt,ekipaIdx:0,minuta:75}];Object.assign(n,{red_cards:1,minute_off:75,minutes_played:75,red_card_minute:75})
 assert.equal(verify(rebind(f)).reports,2)
 const source=wrapper.createBulkCapturedSource({competition:f.snapshot.competition,directory:'/captured',loadPack:async()=>f.pack}),[report]=await source.zapisniki('current');assert.equal(source.nastopi(report.z)[1].redCardMinute,75)
 n.red_card_minute=null;assert.throws(()=>verify(rebind(f)),/red_card_minute/)
})
test('unplayed future fixtures require exact native dates, deadlines and empty statistics',()=>{
 const f=fixture(),day='2026-11-01',s=f.pack.seasons[1]
 s.schedule.push({stevilka:2,tekme:[{domaci:'ŁKS Test',gostje:'Guests FC',datum:day,ura:'15:00',odigrana:false,kontumacija:false}]})
 f.snapshot.rounds.push({id:3,season:f.candidate.season,number:2,played_on:day,deadline_at:rokKroga(day,'15:00',6)})
 f.snapshot.matches.push({id:3,round_id:3,home_team_id:1,away_team_id:2,played_on:day,kontumacija:false,home_goals:0,away_goals:0,imported_at:null,zapisnik_id:null,import_warnings:[],appearance_rows:[],goal_rows:[]})
 assert.equal(verify(rebind(f)).fixtures,3);f.snapshot.matches[2].appearance_rows=[f.snapshot.matches[0].appearance_rows[0]];assert.throws(()=>verify(rebind(f)))
})

test('keeper coverage must name a current source-proved keeper rather than an unrelated native GK',()=>{
 const f=fixture();f.snapshot.players[0].position='MID';f.snapshot.players[1].position='GK';assert.throws(()=>verify(rebind(f)),/keeper/)
})
test('source bench red after substitution retains its distinct authoritative card clock',()=>{
 const f=fixture(),r=f.pack.seasons[1].reports[0],a=r.nastopi[1],n=f.snapshot.matches[1].appearance_rows[1]
 a.rdeci=1;a.minutaDo=a.minute=75;delete a.redCardMinute;r.z.rdeci=[{regSt:a.regSt,ekipaIdx:0,minuta:80}];Object.assign(n,{red_cards:1,minute_off:75,minutes_played:75,red_card_minute:80})
 assert.equal(verify(rebind(f)).reports,2)
})

test('missing pack candidate and unregistered Polish identity cannot bypass admission binding',()=>{
 const f=fixture();delete f.pack.candidate;assert.throws(()=>verify(f),/candidate/)
 const g=fixture();delete g.candidate.id;delete g.pack.candidate.id;assert.throws(()=>verify(g),/identity/)
})
