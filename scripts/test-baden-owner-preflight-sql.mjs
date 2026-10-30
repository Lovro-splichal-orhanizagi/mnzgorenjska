// Actual SQL ONLY in a dedicated disposable hosted-CI database. No local SQL.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync,spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {badenOwnerReadOnlyPreflightSQL,assertBadenOwnerReadOnlyPreflight,safeBadenOwnerProcessResult} from './lib/baden-owner-forward-recovery.mjs'
export function badenPreflightTestTarget(e=process.env,platform=process.platform){
 if(platform!=='linux'||e.CI!=='true'||e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!=='Lovro-splichal-orhanizagi/mnzgorenjska'||e.GITHUB_JOB!=='varnost'||e.RUNNER_ENVIRONMENT!=='github-hosted'||e.RUNNER_OS!=='Linux'||e.BADEN_OWNER_PREFLIGHT_CI_SQL_TEST!=='1'||e.SUPABASE_DB_CONTAINER!=='supabase_db_mnzgorenjska'||e.BADEN_PREFLIGHT_TEST_DB!=='slff_baden_preflight_test')throw Error('fresh hosted varnost dedicated test database required; local SQL forbidden')
 return {container:'supabase_db_mnzgorenjska',database:'slff_baden_preflight_test'}
}
const good={CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska',GITHUB_JOB:'varnost',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',BADEN_OWNER_PREFLIGHT_CI_SQL_TEST:'1',SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',BADEN_PREFLIGHT_TEST_DB:'slff_baden_preflight_test'}
test('preflight SQL guard rejects local, partial or alternate CI/database/container claims',()=>{assert.throws(()=>badenPreflightTestTarget({}));assert.deepEqual(badenPreflightTestTarget(good,'linux'),{container:'supabase_db_mnzgorenjska',database:'slff_baden_preflight_test'});for(const k of Object.keys(good))assert.throws(()=>badenPreflightTestTarget({...good,[k]:'wrong'},'linux'));assert.throws(()=>badenPreflightTestTarget(good,'darwin'))})
test('existing owner tunnel has keepalive for long authentication, without changing its host/port or graph',()=>{const w=readFileSync(new URL('../.github/workflows/install-baden-native-catalog.yml',import.meta.url),'utf8');assert.match(w,/ssh -fN -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 5432:127\.0\.0\.1:5432 deploy@2\.31\.6\.53/);assert.equal((w.match(/      - name: Tunnel to owner database/g)??[]).length,1)})
const sha=b=>createHash('sha256').update(b).digest('hex')
const dockerEnv=()=>({PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8',DOCKER_HOST:'unix:///var/run/docker.sock'})
function args(database,user){const t=badenPreflightTestTarget();assert.ok(['postgres',t.database].includes(database));assert.ok(['postgres','supabase_admin'].includes(user));return ['exec','-i',t.container,'psql','-U',user,'-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-v','SHOW_CONTEXT=never']}
function sql(database,text,user='postgres'){try{return execFileSync('docker',args(database,user),{env:dockerEnv(),input:text,encoding:'utf8',timeout:45000,maxBuffer:65536,stdio:['pipe','pipe','pipe']})}catch(e){throw Error(JSON.stringify(safeBadenOwnerProcessResult(e,'PREFLIGHT_PROCESS')))}}
function exactFixtureDDL(){
 const read=p=>readFileSync(new URL('../supabase/migrations/'+p,import.meta.url),'utf8')
 const defs=[['20261027030000_fussball_community_cards.sql',/create function private_fussball\.canonical_json\(v jsonb\).*?end\$\$;/gs,'501808b8727982ac15868ed7b895aea6a92a6369889d3b8a4d1967600a375908'],['20261028180000_baden_history_cards_composition.sql',/create table private_baden_history\.catalog\(.*?;/gs,'8ea6a07c3f2faaf2f18efc4785507f58daca233300a5a0efac1ffb40237b9ef2'],['20261028180000_baden_history_cards_composition.sql',/create function private_baden_history\.sha\(v jsonb\).*?\$\$;/gs,'1660faf84486e0b2ff618a8beb29be50b20fbdbc17eae1cd1b220561f68b74e8']].map(([file,pattern,digest])=>{const matches=[...read(file).matchAll(pattern)];assert.equal(matches.length,1);assert.equal(sha(matches[0][0]),digest);return matches[0][0]})
 // Synthetic count-only tables: no football/user data or full migration replay.
 return 'BEGIN;CREATE SCHEMA private_fussball;CREATE SCHEMA private_baden_history;\n'+defs.join('\n')+'\nCREATE TABLE private_baden_history.prepared(competition_id bigint);CREATE TABLE private_baden_history.club_bindings(competition_id bigint);CREATE TABLE public.competitions(id bigint,slug text);COMMIT;'
}
function snapshot(database){const tables=['private_baden_history.catalog','private_baden_history.prepared','private_baden_history.club_bindings','public.competitions'];return JSON.parse(sql(database,"BEGIN READ ONLY;SELECT jsonb_build_object("+tables.map(t=>`'${t}',(SELECT coalesce(jsonb_agg(to_jsonb(x)ORDER BY to_jsonb(x)::text COLLATE "C"),'[]')FROM ${t} x)`).join(',')+');ROLLBACK;'))}
async function heldBackend(database,commands,ready){
 const child=spawn('docker',args(database,'supabase_admin'),{env:dockerEnv(),stdio:['pipe','pipe','pipe']});let output=''
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('disposable held backend failed status '+code)))})
 // Observe rejection immediately; finally awaits the same promise after cleanup.
 done.catch(()=>{});child.stderr.on('data',()=>{});child.stdin.on('error',()=>{})
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('disposable held backend readiness timeout')),15000);done.catch(e=>{clearTimeout(timer);reject(e)});child.stdout.on('data',b=>{output+=b;if(output.includes(ready)){clearTimeout(timer);resolve()}});child.stdin.write(commands+`SELECT '${ready}';\n`)})}catch(e){child.stdin.end('ROLLBACK;\n');await done.catch(()=>{});throw e}
 return {async release(){child.stdin.end('ROLLBACK;\n');await done}}
}
test('fresh hosted dedicated DB executes four actual production preflight cases without table writes',{skip:process.env.BADEN_OWNER_PREFLIGHT_CI_SQL_TEST!=='1'},async t=>{
 const {database}=badenPreflightTestTarget();assert.equal(sql('postgres',`SELECT count(*)FROM pg_database WHERE datname='${database}';`).trim(),'0','never reuse or delete an existing database')
 let created=false
 try{
  sql('postgres',`CREATE DATABASE ${database} OWNER postgres TEMPLATE template0;`);created=true;sql(database,exactFixtureDDL())
  const manifest=JSON.stringify({currentFreshUntil:new Date(Date.now()+3600000).toISOString(),kind:'baden-atomic-history-cards-preparation',slug:'de-verbandsliga-baden'}),digest=sha(manifest),productionSQL=badenOwnerReadOnlyPreflightSQL(manifest,digest),owner={user:'supabase_admin',database}
  // Execute the production generator's literal output; no query rewriting.
  const observe=()=>JSON.parse(sql(database,productionSQL,'supabase_admin'))
  await t.test('empty natural-off succeeds with original catalog ownership and no preflight writes',()=>{const before=snapshot(database),v=observe();assert.equal(v.defaultTransactionReadOnly,'off');assert.equal(v.transactionReadOnly,'on');assert.equal(v.ownerEligible,true);assert.equal(v.inRecovery,false);assertBadenOwnerReadOnlyPreflight(v,owner);assert.deepEqual(snapshot(database),before)})
  await t.test('natural database-default read-only returns a typed refusal without writes',()=>{sql('postgres',`ALTER DATABASE ${database} SET default_transaction_read_only=on;`);try{const before=snapshot(database),v=observe();assert.equal(v.defaultTransactionReadOnly,'on');assert.throws(()=>assertBadenOwnerReadOnlyPreflight(v,owner),/natural owner/);assert.deepEqual(snapshot(database),before)}finally{sql('postgres',`ALTER DATABASE ${database} SET default_transaction_read_only=off;`)}})
  await t.test('nonempty synthetic catalog refuses and preserves every fixture row',()=>{sql(database,`BEGIN;INSERT INTO private_baden_history.catalog(singleton,manifest,manifest_sha256)VALUES(true,convert_from(decode('${Buffer.from(manifest).toString('hex')}','hex'),'UTF8')::jsonb,'${digest}');COMMIT;`);try{const before=snapshot(database),v=observe();assert.equal(v.catalogRows,1);assert.throws(()=>assertBadenOwnerReadOnlyPreflight(v,owner),/empty/);assert.deepEqual(snapshot(database),before)}finally{sql(database,'BEGIN;TRUNCATE private_baden_history.catalog;COMMIT;')}})
  await t.test('other catalog writer and exact owner application independently refuse without writes',async()=>{
   const before=snapshot(database),lock=await heldBackend(database,"BEGIN;SET LOCAL application_name='slff-baden-test-lock-only';LOCK TABLE private_baden_history.catalog IN SHARE ROW EXCLUSIVE MODE;",'CATALOG_LOCK_READY')
   try{const v=observe();assert.equal(v.otherOwnerBackends,0);assert.equal(v.catalogWriterBackends,1);assert.throws(()=>assertBadenOwnerReadOnlyPreflight(v,owner),/competing/);assert.deepEqual(snapshot(database),before)}finally{await lock.release()}
   const backend=await heldBackend(database,"BEGIN;SET LOCAL application_name='slff-baden-catalog-owner-install';",'OWNER_BACKEND_READY')
   try{const v=observe();assert.equal(v.otherOwnerBackends,1);assert.equal(v.catalogWriterBackends,0);assert.throws(()=>assertBadenOwnerReadOnlyPreflight(v,owner),/competing/);assert.deepEqual(snapshot(database),before)}finally{await backend.release()}
  })
 }finally{if(created)sql('postgres',`DROP DATABASE ${database} WITH (FORCE);`)}
 assert.equal(sql('postgres',`SELECT count(*)FROM pg_database WHERE datname='${database}';`).trim(),'0','dedicated DB teardown verified')
})
test('minimal dedicated fixture extracts exact original DDL without a migration replay',()=>{const ddl=exactFixtureDDL();assert.match(ddl,/create function private_fussball.canonical_json/);assert.match(ddl,/create table private_baden_history.catalog/);assert.match(ddl,/create function private_baden_history.sha/);assert.match(ddl,/CREATE TABLE private_baden_history.prepared\(competition_id bigint\)/);assert.doesNotMatch(ddl,/INSERT INTO|CREATE EXTENSION|matches|appearances|players/i)})
