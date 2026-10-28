import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {preslikavaPisave,dekodirajIme} from './viri/fussball-pisava.mjs'
import {razberiNativeFantasyZapisnik,replayFussballNativeRoleEnvelope} from './viri/fussball-native-role-parser.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {replayFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
import {fussballPlayerKey} from './fussball-import.mjs'
import {verifyBulkNative} from './bulk-native-proof.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
import {FUSSBALL_COMMUNITY_SOURCE_POLICY as policy} from './fussball-community-policy.mjs'
import {rokKroga} from './razporedi.mjs'
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const read=n=>readFileSync(new URL('./vzorci/de-fussball-community/'+n,import.meta.url))
const witness=JSON.parse(read('provenance.json')),fonts=Object.fromEntries(Object.entries(witness.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const main=read('report.html').toString(),lineup=read('lineup.html').toString(),candidate=GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden'),now=new Date('2026-10-27T12:00:00Z'),sha='a'.repeat(40)
function parseArchive(){
 // TEST ONLY synthetic archive-date composition. Original roster, event rows and
 // font bytes remain exact; only report identity/date are moved to 2025/26.
 const font=preslikavaPisave(fonts.q7mmnqjw.bytes),five=[...font.znaki].find(([,char])=>char==='5')[0]
 let html=main.replaceAll(witness.matchId,'A'.repeat(32)).replaceAll('14.08.2026','14.08.2025')
 html=html.replace(/(<div class="date"><span data-obfuscation="q7mmnqjw">)([\s\S]*?)(<span data-obfuscation="q7mmnqjw" class="hidden-small inline">)/,(_,start,body,end)=>{
  let decoded='';return start+body.replace(/&#x([a-f0-9]+);/gi,(entity,cp)=>{const char=dekodirajIme(String.fromCodePoint(parseInt(cp,16)),font);decoded+=char;return decoded.endsWith('2026')?'&#x'+five.toString(16)+';':entity})+end
 })
 return razberiFantasyZapisnik(html,lineup,{fonts,id:'A'.repeat(32),lineupId:'A'.repeat(32),season:'2025/26',cardPolicy:'community-v1'})
}
const parsed=[razberiFantasyZapisnik(main,lineup,{fonts,id:witness.matchId,lineupId:witness.matchId,season:'2026/27',cardPolicy:'community-v1'}),parseArchive()]
function fixture(){
 const pack={version:1,candidate:structuredClone(candidate),captured_at:now.toISOString(),original_bytes_sha256:'b'.repeat(64),seasons:[]}
 const snapshot={competition:{id:99,slug:candidate.slug,source:candidate.source,source_league_code:candidate.source_league_code,country_code:'DE',country_id:4,source_policy:policy,date_only_deadline_policy:null,active:false,rok_pomak_ur:0},season:candidate.season,teams:[{id:1,name:parsed[0].cardEnvelope.homeName},{id:2,name:parsed[0].cardEnvelope.awayName}],players:[],rounds:[],matches:[],fantasy:{teams:[],lineups:[]},fussball_cards:{installed:true,enabled:true,source_policy:policy,current_code:candidate.source_league_code,archive_codes:candidate.archives.map(a=>a.code),pending_inventory_sha256:'c'.repeat(64),pending_reports:[],registered_reports:[]}}
 snapshot.players=parsed[0].cardEnvelope.roster.map((p,i)=>({id:i+1,reg_st:p.regSt,team_id:p.side+1,active:true,position:p.goalkeeper?'GK':'MID',position_source:'zapisnik'}))
 for(const [i,r]of parsed.entries()){
  const e=structuredClone(r.cardEnvelope),scope=i?candidate.archives[0]:{code:candidate.source_league_code,season:candidate.season},teams=[r.z.domaci,r.z.gostje].map(t=>({...structuredClone(t),postava:t.postava.map(p=>({...p,regSt:fussballPlayerKey(p.virId)})),rezerve:t.rezerve.map(p=>({...p,regSt:fussballPlayerKey(p.virId)}))}))
  const report={id:e.reportId,url:e.sourceUrl,statisticsPending:true,cardEnvelope:e,z:{zapisnikId:e.reportId,sezona:e.season,krog:e.round,datum:e.date,ura:e.time,domaci:teams[0],gostje:teams[1],rezultat:e.score,nepopoln:true,opozorila:['SLFF_FUSSBALL_CARDS_PENDING_V1']}}
  pack.seasons.push({code:scope.code,season:scope.season,cardPolicy:'community-v1',schedule:[{stevilka:e.round,tekme:[{domaci:e.homeName,gostje:e.awayName,datum:e.date,ura:e.time,izid:[e.score.domaci,e.score.gostje],odigrana:true,kontumacija:false}]}],reports:[],pendingReports:[report],cardEnvelopes:[e]})
  snapshot.rounds.push({id:i+1,season:e.season,number:e.round,played_on:e.date,deadline_at:rokKroga(e.date,e.time,0)})
  snapshot.matches.push({id:i+1,round_id:i+1,played_on:e.date,zapisnik_id:e.reportId,source_url:e.sourceUrl,home_team_id:1,away_team_id:2,home_goals:e.score.domaci,away_goals:e.score.gostje,kontumacija:false,vir_brez_izida:false,imported_at:null,statistics_status:'pending_cards',statistics_reason:'community_card_recipient_pending',import_warnings:['zapisnik nepopoln: FUSSBALL card recipients pending'],appearance_rows:[],goal_rows:[]})
  snapshot.fussball_cards.pending_reports.push({match_id:i+1,report_id:e.reportId,revision_sha256:e.revisionSha256,season:e.season,round_id:i+1})
  snapshot.fussball_cards.registered_reports.push({match_id:i+1,report_id:e.reportId,revision_sha256:e.revisionSha256,source_code:scope.code,status:'pending',resolutions:{},confirmed_resolutions:{},resolution_sha256:'d'.repeat(64),applied_resolution_sha256:null,applied_at:null})
 }
 return rebind({candidate:structuredClone(candidate),pack,snapshot,receipts:{expected_sha:sha,slug:candidate.slug,steps:['keepers','positions','prices'].map(stage=>({stage,status:'COMPLETED',completed_at:now.toISOString()}))},expectedSha:sha,now})
}
function rebind(f){f.receipts.snapshot_sha256=digest(f.snapshot);return f}
function storeNative(f,index,report){
 const m=f.snapshot.matches[index],playerId=reg=>f.snapshot.players.find(p=>p.reg_st===reg).id
 m.statistics_status='available';m.statistics_reason=null;m.imported_at=now.toISOString();m.import_warnings=report.z.opozorila
 m.appearance_rows=report.nastopi.map(a=>({player_id:playerId(a.regSt),team_id:a.ekipaIdx+1,shirt_number:a.st,started:a.zacetnik,is_goalkeeper:a.vratar,minute_on:a.minutaOd,minute_off:a.minutaDo,minutes_played:a.minute,goals:a.goli,own_goals:a.avtogoli,penalties_scored:a.goliIzEnajstmetrovke,penalties_missed:a.zgreseneEnajstmetrovke,yellow_cards:a.rumeni,red_cards:a.rdeci,red_card_minute:a.redCardMinute??null,goals_conceded:a.prejetiGoli,clean_sheet:a.cleanSheet}))
 m.goal_rows=report.z.goli.map(g=>({scorer_id:playerId(g.regSt),team_id:g.ekipaIdx+1,minute:g.minuta,is_own_goal:g.avtogol,is_penalty:g.enajstmetrovka,score_home:g.rezultat[0],score_away:g.rezultat[1]}))
}
function apply(f,index=0){
 const source=f.pack.seasons[index],e=source.cardEnvelopes[0],red=e.cards.find(c=>c.type==='second_yellow'),yellow=e.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal),p=e.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!main.includes(p.sourceId.split('-').at(-1))),resolutions={[red.eventKey]:p.sourceId,[yellow.eventKey]:p.sourceId},report=replayFussballCardEnvelope(e,resolutions),m=f.snapshot.matches[index],registration=f.snapshot.fussball_cards.registered_reports[index]
 storeNative(f,index,report)
 Object.assign(registration,{status:'applied',resolutions,confirmed_resolutions:resolutions,applied_at:now.toISOString(),applied_resolution_sha256:'e'.repeat(64)})
 f.snapshot.fussball_cards.pending_reports=f.snapshot.fussball_cards.pending_reports.filter(p=>p.match_id!==m.id)
 return rebind(f)
}
test('registered typed pending current/archive reports prove complete official inventory without invented statistics',()=>{const f=fixture(),proof=verifyBulkNative(f);assert.equal(proof.contract_id,'bulk-native-community-cards-v1');assert.equal(proof.reports,2);assert.equal(proof.pending_reports,2);assert.equal(proof.pending_inventory_sha256,f.snapshot.fussball_cards.pending_inventory_sha256)})
test('resolved native report replays committed choices and compares all individual statistics',()=>{
 const f=apply(fixture());assert.equal(verifyBulkNative(f).pending_reports,1)
 // Current consensus may queue another yellow while committed recipient counts remain unchanged.
 const r=f.snapshot.fussball_cards.registered_reports[0],e=f.pack.seasons[0].cardEnvelopes[0],yellow=e.cards.find(c=>c.type==='yellow'&&!r.confirmed_resolutions[c.eventKey]);r.resolutions={...r.confirmed_resolutions,[yellow.eventKey]:e.roster.find(p=>p.side===yellow.side).sourceId};r.resolution_sha256='f'.repeat(64)
 assert.equal(verifyBulkNative(rebind(f)).pending_reports,1)
 f.snapshot.matches[0].appearance_rows[0].minutes_played--;assert.throws(()=>verifyBulkNative(rebind(f)),/minutes_played/)
})
for(const [name,mutate]of [
 ['disabled',f=>{f.snapshot.fussball_cards.enabled=false}],['uninstalled',f=>{f.snapshot.fussball_cards.installed=false}],['foreign archive',f=>{f.snapshot.fussball_cards.archive_codes=['foreign']}],['missing registration',f=>{f.snapshot.fussball_cards.registered_reports.pop()}],['changed revision',f=>{f.snapshot.fussball_cards.registered_reports[0].revision_sha256='f'.repeat(64)}],['foreign code',f=>{f.snapshot.fussball_cards.registered_reports[0].source_code='foreign'}],['published pending minutes',f=>{f.snapshot.matches[0].appearance_rows=[{player_id:1}]}],['pending import timestamp',f=>{f.snapshot.matches[0].imported_at=now.toISOString()}],['missing pending marker',f=>{f.snapshot.matches[0].import_warnings=[]}],['missing pending inventory',f=>{f.snapshot.fussball_cards.pending_reports=[]}],['source rejection',f=>{f.pack.seasons[0].rejectedReports=[{}]}],['source tampering',f=>{f.pack.seasons[0].cardEnvelopes[0].roster[0].name='fabricated'}],['foreign candidate',f=>{f.candidate.slug='de-other';f.pack.candidate.slug='de-other';f.snapshot.competition.slug='de-other';f.receipts.slug='de-other'}],
])test('community proof rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>verifyBulkNative(rebind(f)),e=>e.dataHold===true)})
test('a completed native match cannot claim resolution without a committed receipt',()=>{for(const mutate of [r=>{r.applied_resolution_sha256=null},r=>{r.applied_at=null},r=>{r.confirmed_resolutions={}},r=>{r.confirmed_resolutions={bogus:'foreign'}}]){const f=apply(fixture());mutate(f.snapshot.fussball_cards.registered_reports[0]);assert.throws(()=>verifyBulkNative(rebind(f)))}})
test('pending header and raw typed inventory must remain exact, and completion cannot be forged',()=>{
 for(const mutate of [f=>{f.pack.seasons[0].pendingReports[0].z.datum='2026-08-15'},f=>{f.pack.seasons[0].pendingReports[0].z.rezultat={domaci:9,gostje:9}},f=>{f.pack.seasons[0].pendingReports[0].z.opozorila=[]},f=>{f.pack.seasons[0].pendingReports[0].nastopi=[]},f=>{f.snapshot.matches[0].statistics_status='available';f.snapshot.matches[0].imported_at=now.toISOString()}]){const f=fixture();mutate(f);assert.throws(()=>verifyBulkNative(rebind(f)))}
})

test('complete yellow envelopes compare baseline and committed partial attribution through the actual replay',()=>{
 const f=fixture(),s=f.pack.seasons[0],old=s.cardEnvelopes[0]
 // TEST ONLY type composition: turn the anonymous second-yellow into an
 // ordinary yellow in both exact row grammar and quick-view inventory.
 const html=Buffer.from(old.bundle.report.base64,'base64').toString().replace('Gelb-Rote Karte','Gelbe Karte').replace('<span class="icon-stack"><span class="icon-card-half yellow-card"></span><span class="icon-card red-card"></span></span>','<i class="icon-card yellow-card"></i>').replace("'type':'yellow-red-card'","'type':'yellow-card'")
 const r=razberiFantasyZapisnik(html,lineup,{fonts,id:old.matchId,lineupId:old.matchId,season:old.season,cardPolicy:'community-v1'}),e=r.cardEnvelope,baseline=replayFussballCardEnvelope(e,{})
 s.reports=[baseline];s.pendingReports=[];s.cardEnvelopes=[e]
 const registration=f.snapshot.fussball_cards.registered_reports[0];registration.status='registered';registration.revision_sha256=e.revisionSha256
 f.snapshot.fussball_cards.pending_reports=f.snapshot.fussball_cards.pending_reports.filter(p=>p.match_id!==1);storeNative(f,0,baseline)
 assert.equal(verifyBulkNative(rebind(f)).pending_reports,1)
 const yellow=e.cards[0],p=e.roster.find(p=>p.side===yellow.side&&p.starter&&!p.goalkeeper),resolutions={[yellow.eventKey]:p.sourceId},committed=replayFussballCardEnvelope(e,resolutions)
 storeNative(f,0,committed);Object.assign(registration,{status:'applied',confirmed_resolutions:resolutions,resolutions,applied_resolution_sha256:'e'.repeat(64),applied_at:now.toISOString()})
 assert.equal(verifyBulkNative(rebind(f)).pending_reports,1)
 const carded=f.snapshot.matches[0].appearance_rows.find(a=>a.player_id===f.snapshot.players.find(p=>p.reg_st===e.roster.find(p=>p.sourceId===resolutions[yellow.eventKey]).regSt).id);carded.yellow_cards=0
 assert.throws(()=>verifyBulkNative(rebind(f)),/yellow_cards/)
})

test('native bulk proof accepts extended original envelope pending and committed replay while rejecting changed extension/raw',()=>{
 const f=fixture(),s=f.pack.seasons[0],old=s.cardEnvelopes[0],changed=lineup.replace('<div class="captain"><span class="c">T</span></div>','<div class="captain"><span class="c">C</span></div><div class="goal-keeper"><span class="k">T</span></div>')
 const e=razberiNativeFantasyZapisnik(main,changed,{fonts,id:old.matchId,lineupId:old.matchId,season:old.season,cardPolicy:'community-v1'}).cardEnvelope
 s.cardEnvelopes=[e];s.pendingReports[0].cardEnvelope=e
 const registration=f.snapshot.fussball_cards.registered_reports[0];registration.revision_sha256=e.revisionSha256;f.snapshot.fussball_cards.pending_reports[0].revision_sha256=e.revisionSha256
 assert.equal(verifyBulkNative(rebind(f)).pending_reports,2)
 for(const mutate of [v=>{v.nativeRoleParser.protocol='other'},v=>{v.bundle.lineup.base64=Buffer.from('changed').toString('base64')}]){const bad=structuredClone(f);mutate(bad.pack.seasons[0].pendingReports[0].cardEnvelope);assert.throws(()=>verifyBulkNative(rebind(bad)),e=>e.dataHold===true)}
 const red=e.cards.find(c=>c.type==='second_yellow'),yellow=e.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal),p=e.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!main.includes(p.sourceId.split('-').at(-1))),resolutions={[red.eventKey]:p.sourceId,[yellow.eventKey]:p.sourceId},report=replayFussballNativeRoleEnvelope(e,resolutions)
 storeNative(f,0,report);Object.assign(registration,{status:'applied',resolutions,confirmed_resolutions:resolutions,applied_at:now.toISOString(),applied_resolution_sha256:'e'.repeat(64)});f.snapshot.fussball_cards.pending_reports.shift()
 assert.equal(verifyBulkNative(rebind(f)).pending_reports,1)
})
