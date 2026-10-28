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
 for(const c of calls){assert.equal(c.file,'psql');assert.match(c.options.input,/BEGIN READ ONLY;\nSET LOCAL ROLE service_role;/);assert.match(c.options.input,/ROLLBACK;/);assert.ok(!c.args.includes(env.SUPABASE_DB_URL));assert.equal(c.options.env.PGDATABASE,'postgres')}
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
test('readonly psql environment pins localhost hostaddr and drops inherited libpq service configuration',()=>{
 for(const inherited of [{PGHOSTADDR:'203.0.113.77'},{PGSERVICE:'foreign-service',PGSERVICEFILE:'/synthetic/foreign-pg_service.conf',PGSYSCONFDIR:'/synthetic/service-directory'},{PGHOSTADDR:'203.0.113.77',PGSERVICE:'foreign-service',PGSERVICEFILE:'/synthetic/foreign-pg_service.conf',PGSYSCONFDIR:'/synthetic/service-directory'}]){
  const env={SUPABASE_DB_URL:'postgresql://local:test@127.0.0.1:5432/postgres',PATH:'/synthetic/bin',...inherited},before={...env};let passed
  const db=api.createFcfFutureTargetDatabase({env,execute:(_file,_args,options)=>{passed=options.env;return Buffer.from('{"players":[]}')}})
  db.inventory(slug,[])
  assert.equal(passed.PGHOSTADDR,'127.0.0.1','libpq actual network destination must be the existing localhost tunnel')
  for(const key of ['PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR'])assert.equal(Object.hasOwn(passed,key),false,`${key} must not supply an alternate service hostaddr`)
  assert.equal(passed.PGDATABASE,'postgres');assert.equal(passed.PGCONNECT_TIMEOUT,'15');assert.equal(passed.PATH,env.PATH);assert.deepEqual(env,before,'caller environment remains unchanged')
 }
})

test('readonly psql separates decoded URI credentials and database from inherited libpq overrides',()=>{
 const uri='postgresql://read%2Brole%40local:p%40ss%3Aword%2F%25%2B@127.0.0.1:5432/fcf%2Fread%20db%2B%25?sslmode=require'
 const env={SUPABASE_DB_URL:uri,PATH:'/synthetic/bin',PGUSER:'foreign-user',PGPASSWORD:'foreign-password',PGDATABASE:'foreign-database',PGHOST:'foreign.example',PGHOSTADDR:'203.0.113.77',PGPORT:'6543',PGSSLMODE:'disable',PGSERVICE:'foreign-service',PGSERVICEFILE:'/synthetic/foreign-pg_service.conf',PGSYSCONFDIR:'/synthetic/service-directory'},before={...env};let call
 const db=api.createFcfFutureTargetDatabase({env,execute:(file,args,options)=>{call={file,args,options};return Buffer.from('{"receipt":"synthetic"}')}})
 assert.deepEqual(db.receipt(slug),{receipt:'synthetic'})
 assert.equal(call.file,'psql');assert.ok(call.args.includes('-w'),'psql must fail without prompting for a password')
 assert.deepEqual(Object.fromEntries(['PGUSER','PGPASSWORD','PGDATABASE','PGHOST','PGHOSTADDR','PGPORT','PGSSLMODE'].map(k=>[k,call.options.env[k]])),{PGUSER:'read+role@local',PGPASSWORD:'p@ss:word/%+',PGDATABASE:'fcf/read db+%',PGHOST:'127.0.0.1',PGHOSTADDR:'127.0.0.1',PGPORT:'5432',PGSSLMODE:'require'})
 for(const key of ['PGSERVICE','PGSERVICEFILE','PGSYSCONFDIR'])assert.equal(Object.hasOwn(call.options.env,key),false)
 for(const secret of [uri,'read+role@local','p@ss:word/%+','fcf/read db+%'])assert.equal(JSON.stringify(call.args).includes(secret),false,'connection components must stay out of argv')
 assert.equal(call.options.env.PGCONNECT_TIMEOUT,'15');assert.equal(call.options.env.PATH,env.PATH);assert.deepEqual(env,before)
})
test('readonly psql uses the URI SSL mode or libpq default instead of inherited SSL mode',()=>{
 for(const [suffix,expected] of [['','prefer'],['?sslmode=disable','disable'],['?sslmode=prefer','prefer'],['?sslmode=require','require'],['?sslmode=disable&sslmode=require','require']]){
  let passed
  const db=api.createFcfFutureTargetDatabase({env:{SUPABASE_DB_URL:'postgresql://local:test@127.0.0.1:5432/postgres'+suffix,PGSSLMODE:'verify-full'},execute:(_file,_args,options)=>{passed=options.env;return Buffer.from('{}')}})
  db.receipt(slug);assert.equal(passed.PGSSLMODE,expected)
 }
})
test('malformed URI component encoding fails before readonly execution without exposing credentials',()=>{
 let executions=0
 for(const uri of ['postgresql://bad%ZZ:SECRET@127.0.0.1:5432/postgres','postgresql://local:SECRET%2@127.0.0.1:5432/postgres','postgresql://local:SECRET@127.0.0.1:5432/bad%FF','postgresql://local:SECRET%00@127.0.0.1:5432/postgres','postgresql://local:SECRET@127.0.0.1:5432/bad%00']){
  assert.throws(()=>api.createFcfFutureTargetDatabase({env:{SUPABASE_DB_URL:uri},execute:()=>{executions++;return Buffer.from('{}')}}).receipt(slug),e=>/^FCF_FUTURE_DB:/.test(e.message)&&!e.message.includes('SECRET')&&!e.message.includes(uri))
 }
 assert.equal(executions,0)
})

test('readonly URI database paths and omitted components preserve literal libpq values',()=>{
 for(const [uri,expected] of [
  ['postgres://local:test@127.0.0.1:5432/read/../archive',{PGUSER:'local',PGPASSWORD:'test',PGDATABASE:'read/../archive'}],
  ['postgresql://r%C3%A9ad:p%252F@127.0.0.1:5432/d%C3%A9b',{PGUSER:'réad',PGPASSWORD:'p%2F',PGDATABASE:'déb'}],
  ['postgresql://127.0.0.1:5432',{PGUSER:'',PGPASSWORD:'',PGDATABASE:''}]
 ]){
  let passed
  const db=api.createFcfFutureTargetDatabase({env:{SUPABASE_DB_URL:uri,PGUSER:'foreign-user',PGPASSWORD:'foreign-password',PGDATABASE:'foreign-database'},execute:(_file,_args,options)=>{passed=options.env;return Buffer.from('{}')}})
  db.receipt(slug);assert.deepEqual(Object.fromEntries(['PGUSER','PGPASSWORD','PGDATABASE'].map(k=>[k,passed[k]])),expected)
 }
})
test('adding a URL after adapter construction cannot bypass native endpoint validation',()=>{
 const env={};let executions=0
 const db=api.createFcfFutureTargetDatabase({env,execute:()=>{executions++;return Buffer.from('{}')}})
 env.SUPABASE_DB_URL='postgresql://SECRET@foreign.example:6543/db'
 assert.throws(()=>db.receipt(slug),e=>/^FCF_FUTURE_DB:/.test(e.message)&&!e.message.includes('SECRET'))
 assert.equal(executions,0)
})

test('G1 readonly inventory carries installed supplement before-image binding for later replay',()=>{
 const calls=[],binding={prelaunch:{kind:'exact-legacy-placeholder-v1',beforeImageText:'TEST ONLY full row',beforeSha256:'a'.repeat(64)}},marker={binding,afterImage:{id:123},receipt:{sourceFingerprintSha256:'b'.repeat(64)}}
 const db=api.createFcfFutureTargetDatabase({targetSlug:'es-ct-segona-g1',env:{SUPABASE_DB_URL:'postgresql://local:test@127.0.0.1:5432/postgres'},execute:(_file,_args,o)=>{calls.push(o.input);return Buffer.from(JSON.stringify(o.input.includes('get_installed_fcf_g1_supplement')?marker:{players:[]}))}})
 assert.deepEqual(db.inventory('es-ct-segona-g1',[]).supplementalMarker,marker)
 assert.equal(calls.length,2);assert.match(calls[1],/BEGIN READ ONLY;[\s\S]*SET LOCAL ROLE service_role;[\s\S]*SELECT public.get_installed_fcf_g1_supplement\(\);[\s\S]*ROLLBACK;/)
})
