import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {fcfSixPolicyIdHashes} from './fcf-six-historical-policy.mjs'
const api=await import('./fcf-future-target-db.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}}),slug='es-ct-tercera-g9',sha=t=>createHash('sha256').update(t).digest('hex')
test('future DB fixed readonly routing and player identity allowlist sanitation',()=>{
 assert.equal(typeof api.createFcfFutureTargetDatabase,'function')
 const calls=[],env={SUPABASE_DB_URL:'postgresql://local:test@127.0.0.1:5432/postgres'},db=api.createFcfFutureTargetDatabase({env,execute:(file,args,options)=>{calls.push({file,args,options});return Buffer.from(JSON.stringify({players:[{id:1,competition_id:797,team_id:2,reg_st:3,full_name:'TEST',position:'GK',position_source:'zapisnik',anonimiziran_at:null,anonimiziran_razlog:null,anonimiziran_by:'PRIVATE ACTOR',profile_id:'PRIVATE PROFILE',nested:{secret:true}}]}))}})
 const inventory=db.inventory(slug,['a'.repeat(64)]);assert.equal(inventory.players[0].id,1);assert.equal(Object.hasOwn(inventory.players[0],'anonimiziran_by'),false);assert.equal(Object.hasOwn(inventory.players[0],'profile_id'),false);assert.equal(Object.hasOwn(inventory.players[0],'nested'),false)
 db.projection(slug,[]);db.pricingSnapshot(slug);db.receipt(slug)
 for(const c of calls){assert.equal(c.file,'psql');assert.match(c.options.input,/BEGIN READ ONLY;\nSET LOCAL ROLE service_role;/);assert.match(c.options.input,/ROLLBACK;/);assert.ok(!c.args.includes(env.SUPABASE_DB_URL));assert.equal(c.options.env.PGDATABASE,env.SUPABASE_DB_URL)}
 assert.match(calls[0].options.input,/fcf_six_current_target_inventory/);assert.match(calls[1].options.input,/fcf_future_current_target_projection/);assert.match(calls[2].options.input,/fcf_six_current_target_pricing/);assert.match(calls[3].options.input,/fcf_future_current_target_receipt/)
 for(const s of ['es-ct-segona-g1','x\');DROP TABLE players;--'])assert.throws(()=>db.inventory(s,[]),/FCF_/)
 assert.throws(()=>db.inventory(slug,['unsafe']),/FCF_/);assert.throws(()=>api.createFcfFutureTargetDatabase({env:{SUPABASE_DB_URL:env.SUPABASE_DB_URL+'?host=foreign.example'}}),/FCF_/);assert.throws(()=>api.createFcfFutureTargetDatabase({env:{SUPABASE_DB_URL:'postgresql://secret@remote.example:5432/db'}}),/FCF_/)
})
test('future DB exact future mutations preserve TEXT, one POST, parameter drift holds before IO',async()=>{
 assert.equal(typeof api.createFcfFutureTargetDatabase,'function');const calls=[],env={SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'TEST ONLY'},db=api.createFcfFutureTargetDatabase({env,network:async(url,options)=>{calls.push([url,options]);return new Response('{"ok":true}')}}),text='{ "schemaVersion":3,"kind":"fcf-future-current-target-import-rollout","targetSlug":"es-ct-tercera-g9" }'
 await db.mutate('prepare',{p_main_sha:'a'.repeat(40),p_policy_hashes:fcfSixPolicyIdHashes()})
 const before='{ "schemaVersion":3 }';await db.mutate('apply',{p_main_sha:'a'.repeat(40),p_policy_hashes:fcfSixPolicyIdHashes(),p_before_sha:sha(before),p_before_image_text:before})
 await db.mutate('import',{p_rollout_text:text,p_sha256:sha(text)})
 const activation='{"schemaVersion":4,"kind":"fcf-future-current-target-activation","targetSlug":"es-ct-tercera-g9"}';await db.mutate('check',{p_activation_text:activation,p_sha256:sha(activation),p_activate:false})
 assert.equal(calls.length,4);assert.deepEqual(calls.map(c=>c[0].split('/').at(-1)),['fcf_future_historical_six_prepare','fcf_future_historical_six_apply','fcf_future_current_target_import','fcf_future_current_target_check']);assert.equal(JSON.parse(calls[2][1].body).p_rollout_text,text)
 for(const [,o]of calls){assert.equal(o.method,'POST');assert.equal(o.redirect,'manual')}
 for(const [stage,parameters]of [['sql',{sql:'SELECT 1'}],['import',{p_rollout_text:text,p_sha256:'0'.repeat(64)}],['import',{p_rollout_text:text,p_sha256:sha(text),p_activate:true}],['check',{p_activation_text:activation,p_sha256:sha(activation),p_activate:'false'}]])await assert.rejects(db.mutate(stage,parameters),/FCF_/)
 assert.equal(calls.length,4)
})
test('future DB ambiguous completion requires readback, known refusals do not retry or leak secrets',async()=>{
 assert.equal(typeof api.createFcfFutureTargetDatabase,'function');const text='{"schemaVersion":3,"kind":"fcf-future-current-target-import-rollout","targetSlug":"es-ct-tercera-g9"}',params={p_rollout_text:text,p_sha256:sha(text)}
 for(const reply of [()=>{throw Error('SECRET')},()=>new Response('',{status:503}),()=>new Response('invalid'),()=>({ok:true,status:200,arrayBuffer:async()=>{throw Error('SECRET')}})]){let count=0;const db=api.createFcfFutureTargetDatabase({env:{SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'SECRET'},network:async()=>{count++;return reply()}});await assert.rejects(db.mutate('import',params),e=>e.ambiguous===true&&!e.message.includes('SECRET'));assert.equal(count,1)}
 for(const status of [302,400,403]){let count=0;const db=api.createFcfFutureTargetDatabase({env:{SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'TEST'},network:async()=>{count++;return new Response('',{status})}});await assert.rejects(db.mutate('import',params),e=>!e.ambiguous&&/FCF_/.test(e.message));assert.equal(count,1)}
})
