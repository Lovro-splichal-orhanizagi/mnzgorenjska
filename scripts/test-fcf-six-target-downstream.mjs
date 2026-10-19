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
