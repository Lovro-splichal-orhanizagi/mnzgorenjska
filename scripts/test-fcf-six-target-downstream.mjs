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
