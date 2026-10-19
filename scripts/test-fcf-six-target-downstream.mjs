import test from 'node:test'
import assert from 'node:assert/strict'
import {createFcfTargetDatabase} from './fcf-target-db.mjs'
const policy='es-fcf-six-reviewed-history-v1'
test('six target transport selects every separate SQL namespace and retains bounded read-only transport',async()=>{
 const queries=[],calls=[],db=createFcfTargetDatabase({sourcePolicy:policy,env:{SUPABASE_DB_URL:'postgresql://local:test@127.0.0.1:5432/postgres',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'},execute:(_f,_a,o)=>{queries.push(o.input);return Buffer.from('{}')},network:async(u,o)=>{calls.push([u,o]);return new Response('{}')}})
 db.inventory('es-ct-tercera-g9',[]);db.pricingSnapshot('es-ct-tercera-g9');db.receipt('es-ct-tercera-g9')
 for(const name of ['fcf_six_current_target_inventory','fcf_six_current_target_pricing','fcf_six_current_target_receipt'])assert(queries.some(q=>q.includes('public.'+name+'(')),name)
 assert(queries.every(q=>q.startsWith('BEGIN READ ONLY;')&&q.endsWith('ROLLBACK;\n')))
 for(const stage of ['prepare','apply','import','check'])await db.mutate(stage,{})
 assert.deepEqual(calls.map(([u])=>u.split('/').at(-1)),['fcf_historical_six_prepare','fcf_historical_six_apply','fcf_six_current_target_import','fcf_six_current_target_check'])
 assert(calls.every(([,o])=>o.method==='POST'&&o.redirect==='manual'))
})
test('unknown policy cannot select a writer transport',()=>assert.throws(()=>createFcfTargetDatabase({sourcePolicy:'caller-policy'}),/unknown source policy/))
import {nativePlanFixture} from './fcf-six-native-test-fixture.mjs'
import {planFcfNativeMapping} from './fcf-target-native-plan.mjs'
const newBindings=[['5029','33592','BESCANO, C.D.','4109389','5f102da312280ff3f4ff5f65bf067e8f71e9f0301c5bae5b578d81ed02f93e97'],['1372','19610692','CAN VIDALET, C.F.','4118354','f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556'],['54319880','54709553','ONA SANT ADRIA, F.C.','4118354','f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556']].map(([club,category,name,match,raw])=>({provider:'fcf',source_club_id:club,source_category_id:category,country_code:'ES',canonical_names:[name],proofs:[{sourceMatchId:match,sourceUrl:'https://www.fcf.cat/ca/competicio/acta/'+match,rawSha256:raw,...(match==='4109389'?{side:'away',round:1,playedOn:'2026-09-19'}:{})}],bound_team_id:null}))
function sixG9(){const f=nativePlanFixture('es-ct-tercera-g9');f.sourceData.competition.source_policy=policy;f.existingExceptionBindings=[...f.existingExceptionBindings.slice(0,8),...structuredClone(newBindings)];return f}
test('six G9 mapping independently resolves all240 with all11 exact exception descriptors',()=>{
 const f=sixG9(),p=JSON.parse(planFcfNativeMapping(f).proposalText)
 assert.equal(p.fixtures.length,240);assert.equal(p.mappings.length,16)
 assert.deepEqual(p.fixtures.find(m=>m.sourceMatchId==='es4118354'),{sourceMatchId:'es4118354',sourceRound:1,matchId:306166,roundId:27616,homeTeamId:7566,awayTeamId:8308})
 assert.equal(p.mappings.filter(m=>m.existingExceptionAnchor).length,6)
 for(const c of f.databaseInventory.groups)c.source_policy=policy
 assert.deepEqual(planFcfNativeMapping(f).proposalText,JSON.stringify(p),'cleanup does not change approved mapping identity')
})
test('six mapping refuses caller changes to new exception identity and missing common group anchor',()=>{
 const f=sixG9();f.existingExceptionBindings.at(-1).proofs[0].rawSha256='0'.repeat(64)
 assert.throws(()=>planFcfNativeMapping(f),/immutable exception descriptor/)
 const g=sixG9();g.existingExceptionBindings.splice(2,1)
 assert.throws(()=>planFcfNativeMapping(g),/exception bindings/)
})
import {sixAdmissionFixture} from './fcf-six-test-fixture.mjs'
import {sixCleanupFixture} from './fcf-six-cleanup-test-fixture.mjs'
import {readFcfSixCleanupEvidence} from './fcf-six-cleanup-evidence.mjs'
import {compileFcfTargetReleasePacket,verifyFcfTargetReleasePacket} from './fcf-target-release.mjs'
import {buildFcfTargetRollout,replayFcfTargetRollout} from './fcf-target-rollout.mjs'
import {privacyProjection} from './fcf-native-plan-test-fixture.mjs'
const actualOpts={skip:!process.env.FCF_SIX_ACCOUNTING_WIRE||!process.env.FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE||!process.env.FCF_HISTORICAL_RETAINED_DIR}
test('genuine six originals and complete authenticated G9 compile schema3 and replay schema2 rollout offline',actualOpts,async t=>{
 const admission=await sixAdmissionFixture(t),cleanup=sixCleanupFixture(t),cleanupEvidence=readFcfSixCleanupEvidence({...cleanup.input,now:admission.now}),f=sixG9(),data=admission.data,d=f.databaseInventory
 const fixed={'1252/35781':8304,'6136/33049':8305,'1372/19610692':7566,'54319880/54709553':8308,'44143644/44510647':8301,'1400/47272626':8298},key=c=>c.sourceClubId+'/'+c.sourceCategoryId,team=c=>fixed[key(c)]??900000+data.clubs.findIndex(x=>key(x)===key(c))
 d.teams=data.clubs.map(c=>({id:team(c),competition_id:797,name:c.name}));d.rounds=Array.from({length:30},(_,i)=>({id:i<2?27616+i:700000+i,competition_id:797,season:'2026/27',number:i+1}));d.matches=data.fixtures.map((m,i)=>({id:{es4118352:306164,es4118354:306166,es4118358:306171}[m.id]??800000+i,round_id:d.rounds.find(r=>r.number===m.round).id,home_team_id:team(m.clubs[0]),away_team_id:team(m.clubs[1]),zapisnik_id:m.id}));d.capturedUTC=new Date(admission.now).toISOString();for(const c of d.groups){c.source_policy=policy;c.nativeImportedIDs=[];c.country_id=34}d.identityPrivacy=privacyProjection(797,data.fixtures.flatMap(m=>m.appearances??[]),d.capturedUTC)
 const base={targetSlug:data.targetSlug,inventoryAdmission:admission.inventoryAdmission,sourceCommit:admission.sourceCommit,cleanupEvidence,databaseInventory:d,existingExceptionBindings:f.existingExceptionBindings,now:admission.now,execution:{repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit:admission.sourceCommit,runId:'123',runAttempt:'1'}}
 const mapping=planFcfNativeMapping({targetSlug:data.targetSlug,sourceData:data,databaseInventory:d,existingExceptionBindings:f.existingExceptionBindings,now:admission.now,writerCommit:admission.sourceCommit}),packetInput={...base,targetEvidence:base.inventoryAdmission},packet=compileFcfTargetReleasePacket(packetInput),p=JSON.parse(packet.manifestText)
 assert.equal(p.schemaVersion,3);assert.equal(p.kind,'fcf-six-current-target-release');assert.equal(p.target.fixtures.length,240);assert.equal(p.target.fixtures.filter(m=>m.statisticsStatus==='unavailable_historical').length,3);assert.equal(p.target.sourceEvidence.actualSourceGETs,255)
 assert.deepEqual(verifyFcfTargetReleasePacket({...packetInput,...packet}),packet)
 const rollout=buildFcfTargetRollout({...base,mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256}),r=JSON.parse(rollout.rolloutText)
 assert.equal(r.schemaVersion,2);assert.equal(r.kind,'fcf-six-current-target-rollout');assert.deepEqual(replayFcfTargetRollout({...base,...rollout}),rollout)
 const old={...p,schemaVersion:2,kind:'fcf-current-target-release'},manifestText=JSON.stringify(old)
 await assert.rejects(async()=>verifyFcfTargetReleasePacket({...packetInput,manifestText,manifestSha256:(await import('node:crypto')).createHash('sha256').update(manifestText).digest('hex')}),/protocol/)
})
test('six compiler refuses unbranded cache documents even with authenticated six cleanup',actualOpts,t=>{
 const cleanup=sixCleanupFixture(t),f=sixG9(),now=Date.parse('2026-10-19T08:00:00Z');f.databaseInventory.capturedUTC=new Date(now).toISOString();for(const c of f.databaseInventory.groups)c.source_policy=policy
 const targetEvidence={evidenceKind:'fcf-target-cache-audit',targetSlug:f.targetSlug,competition:{id:797,slug:f.targetSlug,source:'fcf',source_league_code:'4118349-4118588',source_policy:policy,active:false,sezona_koledarska:false,firstFantasyPlayedOn:'2026-10-24'},documents:Array.from({length:240},(_,i)=>({id:String(4118349+i)}))}
 assert.throws(()=>compileFcfTargetReleasePacket({targetSlug:f.targetSlug,sourceCommit:'a'.repeat(40),targetEvidence,cleanupEvidence:cleanup.evidence,databaseInventory:f.databaseInventory,now}),/authenticated six continuation admission/)
})
import {nativePlanFixture as legacyNativePlanFixture} from './fcf-native-plan-test-fixture.mjs'
function sixG1Prepared(){
 const f=legacyNativePlanFixture('es-ct-segona-g1'),s=f.sourceData,d=f.databaseInventory,key=c=>c.sourceClubId+'/'+c.sourceCategoryId
 s.competition.source_policy=policy;f.existingExceptionBindings.push(...structuredClone(newBindings))
 const keeperTemplate=s.fixtures.find(m=>m.statisticsStatus==='available').appearances;for(const m of s.fixtures.filter(m=>m.round===4)){m.statisticsStatus='available';m.appearances=structuredClone(keeperTemplate)}
 const target=s.fixtures.find(m=>m.round===3&&key(m.clubs[0])==='5057/35522'),oldAway=key(target.clubs[1]),newClub={sourceClubId:'5029',sourceCategoryId:'33592',name:'BESCANO, C.D.'},oldTeam=d.matches.find(m=>m.zapisnik_id===target.id).away_team_id,oldID=target.id,displaced=s.fixtures.find(m=>m.id==='es4109404'),oldRound=d.rounds.find(r=>r.number===3).id
 displaced.id=oldID;target.id='es4109404';target.date='2026-10-04';target.statisticsStatus='unavailable_historical';target.homeGoals=null;target.awayGoals=null;target.appearances=null;target.goals=null
 for(const m of s.fixtures)m.clubs=m.clubs.map(c=>key(c)===oldAway?{...newClub}:c)
 s.clubs=[...new Map(s.fixtures.flatMap(m=>m.clubs).map(c=>[key(c),c])).values()]
 for(const team of d.teams)if(team.id===oldTeam){team.id=8576;team.name=newClub.name}
 d.rounds.find(r=>r.number===3).id=28708
 for(const m of d.matches){if(m.zapisnik_id===oldID)m.zapisnik_id='es4109404';else if(m.zapisnik_id==='es4109404')m.zapisnik_id=oldID;if(m.home_team_id===oldTeam)m.home_team_id=8576;if(m.away_team_id===oldTeam)m.away_team_id=8576;if(m.round_id===oldRound)m.round_id=28708}
 const placeholder=d.matches.find(m=>m.zapisnik_id==='es4109404')
 Object.assign(placeholder,{id:321663,round_id:28708,home_team_id:8575,away_team_id:8576,played_on:'2026-10-04',imported_at:null,zapisnik_id:null,source_url:'https://www.fcf.cat/ca/competicio/acta/4109388',home_goals:0,away_goals:0,vir_brez_izida:true,kontumacija:false,statistics_status:'available',statistics_reason:null,source_phase:null,source_round:null,import_warnings:[]})
 return f
}
test('prepared G1 exact empty321663 placeholder yields mapping before shared cleanup and keeps source score NULL',()=>{
 const f=sixG1Prepared(),before=JSON.stringify(f),p=JSON.parse(planFcfNativeMapping(f).proposalText),unknown=f.sourceData.fixtures.find(m=>m.id==='es4109404')
 assert.equal(p.fixtures.length,240);assert.equal(p.mappings.length,16);assert.deepEqual(p.fixtures.find(m=>m.sourceMatchId==='es4109404'),{sourceMatchId:'es4109404',sourceRound:3,matchId:321663,roundId:28708,homeTeamId:8575,awayTeamId:8576});assert.equal(unknown.homeGoals,null);assert.equal(unknown.awayGoals,null);assert.equal(JSON.stringify(f),before)
})
for(const[field,value]of[['id',null],['id',321664],['round_id',700002],['home_team_id',8574],['played_on','2026-10-05'],['imported_at','2026-10-18T12:00:00Z'],['zapisnik_id','es4109404'],['source_url','https://www.fcf.cat/ca/competicio/acta/4109404'],['home_goals',null],['away_goals',1],['vir_brez_izida',false],['kontumacija',true],['statistics_status','unavailable_historical'],['statistics_reason','caller'],['source_phase','1'],['source_round',3],['import_warnings',['caller']]])test(`prepared G1 refuses changed empty placeholder ${field}=${JSON.stringify(value)}`,()=>{
 const f=sixG1Prepared();f.databaseInventory.matches.find(m=>m.id===321663)[field]=value;assert.throws(()=>planFcfNativeMapping(f),/FCF_NATIVE_PLAN/)
})
import {getFcfSixPolicy,fcfSixPolicyHashes} from './fcf-six-historical-policy.mjs'
function installG1Markers(f){
 const p=getFcfSixPolicy(f.targetSlug),d=f.databaseInventory;f.sourceData.competition.source='fcf';for(const g of d.groups)g.source_policy=policy
 d.installedMarkers=[{installed:true,policyId:p.id,policySha256:fcfSixPolicyHashes()[f.targetSlug],firstFantasyPlayedOn:'2026-10-24',markers:p.entries.map(e=>{const{rawSha256,reasonCode,...fixture}=e,m=d.matches.find(m=>m.id===(e.sourceMatchId==='4109404'?321663:321646));return{sourceMatchId:e.sourceMatchId,reportId:'es'+e.sourceMatchId,policyId:p.id,policySha256:fcfSixPolicyHashes()[f.targetSlug],rawSha256,fixture:{...fixture,season:p.season},statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0,matchId:m.id,roundId:m.round_id,homeTeamId:m.home_team_id,awayTeamId:m.away_team_id}})}]
 d.matches.find(m=>m.id===321663).zapisnik_id='es4109404'
}
test('prepared G1 proposal survives exact installed marker and applied G1 still requires that marker',()=>{
 const f=sixG1Prepared(),before=planFcfNativeMapping(f);installG1Markers(f);assert.deepEqual(planFcfNativeMapping(f),before)
 f.databaseInventory.installedMarkers=[];assert.throws(()=>planFcfNativeMapping(f),/installed six binding/)
})
test('prepared G1 refuses inventing an official score from the empty native placeholder',()=>{
 const f=sixG1Prepared();f.sourceData.fixtures.find(m=>m.id==='es4109404').homeGoals=0;assert.throws(()=>planFcfNativeMapping(f),/source score must remain NULL/)
})
