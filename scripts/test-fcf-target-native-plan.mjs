import test from 'node:test'
import assert from 'node:assert/strict'
import {nativePlanFixture,nativeMatchFixture,fullNativeMatchFixture,privacyProjection} from './fcf-native-plan-test-fixture.mjs'
import {imeHash,regHash} from './anonimizacija.mjs'
const api=await import('./fcf-target-native-plan.mjs').catch(()=>({}))
const map=f=>{assert.equal(typeof api.planFcfNativeMapping,'function','pure native mapping planner exists');return api.planFcfNativeMapping(f)}
const rows=f=>{assert.equal(typeof api.planFcfNativeMatchRows,'function','native-ID statistic row planner exists');return api.planFcfNativeMatchRows(f)}
test('full native target projects all240 without recomputing identity for each match',()=>{
 const f=fullNativeMatchFixture()
 assert.equal(typeof api.planFcfNativeTargetRows,'function')
 const r=api.planFcfNativeTargetRows(f)
 assert.equal(r.matches.length,240);assert.equal(r.players.length,184)
 assert.equal(r.matches.find(m=>m.sourceMatchId===f.sourceMatchId).appearances.length,23)
 assert.equal(Object.isFrozen(r.players),true)
})
test('full target holds one native identity appearing for different clubs on the latest date',()=>{
 const f=fullNativeMatchFixture(),source=f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId)
 const other=f.sourceData.fixtures.find(m=>m.round===3&&m.id!==source.id)
 Object.assign(other,{statisticsStatus:'available',appearances:structuredClone(source.appearances),goals:structuredClone(source.goals),homeGoals:1,awayGoals:0})
 f.databaseInventory.identityPrivacy=privacyProjection(783,f.sourceData.fixtures.flatMap(m=>m.appearances??[]),f.databaseInventory.capturedUTC)
 assert.equal(typeof api.planFcfNativeTargetRows,'function');assert.throws(()=>api.planFcfNativeTargetRows(f),/same-date conflicting/)
})
for(const [slug,missing]of[['es-ct-segona-g1',14],['es-ct-tercera-g9',12]])test(`${slug} bootstraps ${missing} missing tuples using existing exception anchors and full240 bijection`,()=>{
 const f=nativePlanFixture(slug),before=JSON.stringify(f),r=map(f),p=JSON.parse(r.proposalText)
 assert.equal(p.kind,'fcf-native-target-mapping');assert.equal(p.mappings.length,16);assert.equal(p.fixtures.length,240)
 assert.equal(p.mappings.filter(m=>m.existingExceptionAnchor).length,16-missing)
 assert.equal(p.sourceCommit,f.writerCommit);assert.equal(p.captureSourceCommit,'a'.repeat(40))
 assert.equal(p.sourceFingerprintSha256,f.sourceData.binding.sourceFingerprintSha256)
 assert.equal(p.mappings.every(m=>m.evidenceFixtureIds.length===30),true)
 assert.equal(JSON.stringify(f),before,'planner does not mutate source, bindings or DB data')
 assert.deepEqual(map(f),r,'proposal is deterministic and conveys no admission/execution capability')
})
test('full mapping accepts honest missing pending native IDs without ordinal guesses',()=>{
 const f=nativePlanFixture();f.databaseInventory.matches.forEach(m=>m.zapisnik_id=null)
 assert.equal(JSON.parse(map(f).proposalText).fixtures.length,240)
})
for(const slug of['es-ct-segona-g1','es-ct-tercera-g9'])test(`native fixture sides anchor ordinary ${slug} club after harmless display rename`,()=>{
 const f=nativePlanFixture(slug),before=JSON.parse(map(f).proposalText),team=f.databaseInventory.teams.find(t=>!before.mappings.find(m=>m.teamId===t.id).existingExceptionAnchor)
 team.name+=' renamed display'
 const after=JSON.parse(map(f).proposalText)
 assert.equal(after.mappings.find(m=>m.teamId===team.id).canonicalTeamName,team.name);assert.deepEqual(after.fixtures,before.fixtures)
})
test('later G9 mapping permits active G1 with users after applied cleanup',()=>{
 const f=nativePlanFixture('es-ct-tercera-g9');for(const c of f.databaseInventory.groups)c.source_policy='es-fcf-reviewed-history-v1'
 const g1=f.databaseInventory.groups.find(c=>c.slug==='es-ct-segona-g1');g1.active=true;g1.hasUserActivity=true
 assert.equal(JSON.parse(map(f).proposalText).targetSlug,f.targetSlug)
})
test('reviewed native identity proposal survives cleanup policy/binding installation and irrelevant readiness changes',()=>{
 const f=nativePlanFixture(),before=map(f),bound={'5042':8574,'5057':8575,'1107':8195,'5114':8188,'1252':8304,'6136':8305,'44143644':8301,'1400':8298}
 for(const g of f.databaseInventory.groups)g.source_policy='es-fcf-reviewed-history-v1'
 for(const b of f.existingExceptionBindings)b.bound_team_id=bound[b.source_club_id]
 for(const m of f.databaseInventory.matches){m.imported_at=null;m.statistics_status='unavailable_historical'}
 const resolved=JSON.parse(before.proposalText).fixtures
 for(const m of f.databaseInventory.matches)if(m.zapisnik_id===null)m.zapisnik_id=resolved.find(x=>x.matchId===m.id).sourceMatchId
 for(const r of f.databaseInventory.rounds)r.deadline_at='2026-10-24T08:00:00Z'
 assert.deepEqual(map(f),before,'approval binds exact mapping identity, not mutable cleanup/readiness metadata')
})
test('reviewed mapping replay preserves original audit time while fresh current identity is rederived',()=>{
 const f=nativePlanFixture(),p=map(f)
 assert.equal(typeof api.verifyFcfNativeMappingProposal,'function')
 assert.deepEqual(api.verifyFcfNativeMappingProposal({...f,...p,now:f.now+3600000}),p)
 const changed=structuredClone(f);changed.databaseInventory.teams[3].name+=' changed'
 assert.throws(()=>api.verifyFcfNativeMappingProposal({...changed,...p,now:f.now+3600000}),/FCF_NATIVE_PLAN/)
 assert.throws(()=>api.verifyFcfNativeMappingProposal({...f,...p,proposalText:p.proposalText+' '}),/FCF_NATIVE_PLAN/)
})
for(const[name,mutate]of[
 ['changed fixture side',f=>{const m=f.databaseInventory.matches[20];[m.home_team_id,m.away_team_id]=[m.away_team_id,m.home_team_id]}],
 ['wrong actual native fixture',f=>f.databaseInventory.matches[0].zapisnik_id='es9999999'],
 ['unanchored duplicate canonical team name',f=>{f.databaseInventory.matches.forEach(m=>m.zapisnik_id=null);f.databaseInventory.teams[3].name=f.databaseInventory.teams[2].name}],
 ['unanchored fuzzy name only',f=>{f.databaseInventory.matches.forEach(m=>m.zapisnik_id=null);f.databaseInventory.teams[4].name=f.databaseInventory.teams[4].name.toLowerCase()}],
 ['missing fixture',f=>f.databaseInventory.matches.pop()],['foreign target team',f=>f.databaseInventory.teams[4].competition_id=790],
 ['duplicate native round',f=>f.sourceData.fixtures[30].round=1],
 ['category collision',f=>{const a=f.sourceData.clubs[0],b=f.sourceData.clubs[1];b.sourceCategoryId=a.sourceCategoryId}],
 ['conflicting installed exception',f=>f.existingExceptionBindings[0].bound_team_id=999],
 ['altered common exception',f=>f.existingExceptionBindings[3].canonical_names=['made up']],
 ['missing G2 exception tuple',f=>f.existingExceptionBindings.splice(2,1)],
 ['stale inventory',f=>f.databaseInventory.capturedUTC='2026-10-16T14:00:00Z'],
 ['active selected target',f=>f.databaseInventory.groups[0].active=true],
 ['G2 writer target',f=>f.targetSlug='es-ct-tercera-g2'],
])test(`native mapping holds ${name}`,()=>{const f=nativePlanFixture();mutate(f);assert.throws(()=>map(f),/FCF_NATIVE_PLAN/)})
test('native statistic projection preserves every supplied field and resolves scorer by native reg only',()=>{
 const f=nativeMatchFixture(),before=JSON.stringify(f),r=rows(f),a=r.appearances.find(a=>a.player_reg_st===10003),sub=r.appearances.find(a=>a.player_reg_st===10200)
 assert.equal(a.minute_off,61);assert.equal(a.minutes_played,61);assert.equal(sub.minute_on,61);assert.equal(sub.player_id,null)
 assert.equal(r.goals[0].scorer_reg_st,10002);assert.equal(r.goals[0].scorer_id,60002)
 assert.equal(r.appearances.length,23);assert.equal(r.appearances.filter(a=>a.started).length,22)
 assert.equal(r.appearances.filter(a=>a.is_goalkeeper).length,2)
 assert.equal(r.players.find(p=>p.reg_st===10002).position,'DEF');assert.equal(r.players.find(p=>p.reg_st===10002).position_source,'ugibanje')
 assert.equal(r.players.find(p=>p.reg_st===10200).position,null,'ordinary field pipeline remains free to estimate later')
 assert.equal(JSON.stringify(f),before)
})
test('official GK position follows normal unassigned/guess protection while match role never changes',()=>{
 const f=nativeMatchFixture();Object.assign(f.databaseInventory.players[0],{position:'MID',position_source:'ugibanje'})
 let r=rows(f);assert.equal(r.players.find(p=>p.reg_st===10000).position,'GK')
 Object.assign(f.databaseInventory.players[0],{position:'MID',position_source:'glasovanje'})
 r=rows(f);assert.equal(r.players.find(p=>p.reg_st===10000).position,'MID');assert.equal(r.players.find(p=>p.reg_st===10000).position_source,'glasovanje')
 assert.equal(r.appearances.find(a=>a.player_reg_st===10000).is_goalkeeper,true)
})
test('own goal stays attributed to the actual native actor/team, with beneficiary score preserved',()=>{
 const f=nativeMatchFixture(),m=f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId)
 m.goals[0].avtogol=true;m.goals[0].rezultat=[0,1];m.homeGoals=0;m.awayGoals=1
 const actor=m.appearances.find(a=>a.regSt===10002);actor.goli=0;actor.avtogoli=1
 const r=rows(f),a=r.appearances.find(a=>a.player_reg_st===10002),g=r.goals[0]
 assert.equal(g.team_id,a.team_id);assert.equal(g.is_own_goal,true);assert.equal(g.score_home,0);assert.equal(g.score_away,1);assert.equal(a.own_goals,1)
})
for(const[name,mutate]of[
 ['name/shirt identity fallback',f=>f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).appearances[2].regSt=null],
 ['unregistered namesake merge',f=>f.databaseInventory.players[2].reg_st=null],
 ['duplicate native player',f=>f.databaseInventory.players.push({...f.databaseInventory.players[2],id:999})],
 ['anonymized identity',f=>f.databaseInventory.players[2].anonimiziran_at='2026-10-17T00:00:00Z'],
 ['scorer missing native identity',f=>f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).goals[0].regSt=null],
 ['scorer outside actual appearance',f=>f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).goals[0].regSt=99999],
 ['source GK gap',f=>{const a=f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).appearances[0];a.minutaDo=61;a.minute=61}],
 ['missing supplied card statistic',f=>delete f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).appearances[2].rumeni],
 ['goal score discrepancy',f=>f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).homeGoals=2],
 ['goal event boolean missing',f=>delete f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId).goals[0].avtogol],
])test(`native row plan refuses ${name}`,()=>{const f=nativeMatchFixture();mutate(f);assert.throws(()=>rows(f),/FCF_NATIVE_PLAN/)})
for(const [name,competition_id,reason,useName]of[
 ['same-league cleared registration tombstone',783,'ugovor',false],['same-country cross-league objection',790,'ugovor',false],['same-country name objection',790,'ugovor',true],['same-league ordinary inactivity needs permitted restoration',783,'neaktiven',false],
])test(`native row plan preserves ${name}`,()=>{
 const f=nativeMatchFixture(),p=f.databaseInventory.players[2],original={...p};Object.assign(p,{reg_st:null,full_name:'#'+p.id,anonimiziran_at:'2026-10-17T00:00:00Z',anonimiziran_razlog:reason})
 if(competition_id!==783)f.databaseInventory.players.splice(2,1)
 f.databaseInventory.identityPrivacy.matches.push({player_id:p.id,competition_id,country_id:34,kljuc:useName?imeHash(34,original.full_name):regHash(34,original.reg_st),anonimiziran_razlog:reason,anonimiziran_at:p.anonimiziran_at})
 assert.throws(()=>rows(f),/FCF_NATIVE_PLAN.*privacy|FCF_NATIVE_PLAN.*protected|FCF_NATIVE_PLAN.*restoration/)
})
for(const [name,mutate]of[
 ['missing projection',f=>delete f.databaseInventory.identityPrivacy],['incomplete query',f=>f.databaseInventory.identityPrivacy.complete=false],['unchecked native key',f=>f.databaseInventory.identityPrivacy.checkedKeys.splice(0,1)],['wrong country scope',f=>f.databaseInventory.identityPrivacy.countryId=999],
])test(`native identity refuses ${name}`,()=>{const f=nativeMatchFixture();mutate(f);assert.throws(()=>rows(f),/FCF_NATIVE_PLAN/)})
test('unrelated anonymized legacy row and other-league inactivity do not hold a genuine new native player',()=>{
 const f=nativeMatchFixture();f.databaseInventory.players.push({id:700001,competition_id:783,reg_st:null,full_name:'#700001',anonimiziran_at:'2026-10-17T00:00:00Z',anonimiziran_razlog:'ugovor'})
 f.databaseInventory.identityPrivacy.matches.push({player_id:700001,competition_id:783,country_id:34,kljuc:regHash(34,99999999),anonimiziran_at:'2026-10-17T00:00:00Z',anonimiziran_razlog:'ugovor'},{player_id:700002,competition_id:790,country_id:34,kljuc:regHash(34,10200),anonimiziran_at:'2026-10-17T00:00:00Z',anonimiziran_razlog:'neaktiven'})
 assert.equal(rows(f).players.find(p=>p.reg_st===10200).player_id,null)
})
test('ambiguous same-country protected matches never become a newly identified player',()=>{
 const f=nativeMatchFixture()
 f.databaseInventory.identityPrivacy.matches=[700001,700002].map(player_id=>({player_id,competition_id:783,country_id:34,kljuc:regHash(34,10200),anonimiziran_at:'2026-10-17T00:00:00Z',anonimiziran_razlog:'ugovor'}))
 assert.throws(()=>rows(f),/FCF_NATIVE_PLAN.*protected|FCF_NATIVE_PLAN.*privacy/)
})
test('pending and historical fixtures project zero individual rows without inventing statistics',()=>{
 const f=nativeMatchFixture()
 for(const status of['pending','unavailable_historical']){
  f.sourceMatchId=f.sourceData.fixtures.find(m=>m.statisticsStatus===status).id
  const r=rows(f);assert.deepEqual(r.appearances,[]);assert.deepEqual(r.goals,[]);assert.deepEqual(r.players,[])
 }
})
