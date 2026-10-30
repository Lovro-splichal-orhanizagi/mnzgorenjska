// Source-free tests only. No Docker, SQL, GitHub or provider calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {probeSources,safeProcessResult,disposablePlan,runDisposableCases} from './baden-install-sql-disposable-probe.mjs'
const sha=b=>createHash('sha256').update(b).digest('hex')
test('exact unchanged2d5 installer function and minimal original DDL are extracted with full pins',()=>{
 const s=probeSources();assert.equal(typeof s.installationSQL,'function');const body='{"TEST_ONLY":true}',sql=s.installationSQL(body,sha(body))
 const original=readFileSync(new URL('./install-baden-native-catalog.mjs',import.meta.url),'utf8'),f=original.slice(original.indexOf('function installationSQL('),original.indexOf('function ownerEnvironment('))
 const exact=new Function('need','maximum','sha',f+';return installationSQL;')((v,m)=>assert.ok(v,m),64*1024*1024,sha)
 assert.equal(sql,exact(body,sha(body)));assert.equal(s.functionSha256,'e169876905189bc07394fc0442cf9d953a3d62557bfa4b2fdd0c04e886004a4e');assert.match(s.fixtureSQL,/create table private_baden_history.catalog/);assert.match(s.fixtureSQL,/create function private_fussball.canonical_json/);assert.match(s.fixtureSQL,/create function private_baden_history.sha/);assert.doesNotMatch(s.fixtureSQL,/public.competitions|create table private_baden_history.prepared|create extension/)
 assert.throws(()=>s.installationSQL(body,'0'.repeat(64)))
})
test('disposable commands fix networkless container identity and expose no host port, bind or production target',()=>{
 for(const mode of ['rw','ro']){const p=disposablePlan(mode);assert.equal(p.name,'slff-baden-install-sql-probe-'+mode);assert.deepEqual(p.run.slice(0,5),['run','--detach','--name',p.name,'--network']);assert.equal(p.run[5],'none');assert.ok(p.run.includes('postgres:17'));assert.ok(!p.run.some(x=>/^(-p|--publish|--volume|--mount|--network=host)$/.test(x)));assert.deepEqual(p.psql.slice(-7),['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'])}
 assert.throws(()=>disposablePlan('production'));assert.throws(()=>disposablePlan('rw;drop'))
})
test('safe SQL diagnostics retain code and bounded error without huge hex or manifest/stdout',()=>{
 const m='{"privateManifest":"DO_NOT_RETAIN"}',hex='fa'.repeat(100000),e=safeProcessResult({status:3,stdout:m,stderr:'ERROR:  42601: syntax error at or near "="\nQUERY: '+hex+'\nCONTEXT: PL/pgSQL function inline_code_block line 2\n'})
 assert.equal(e.exitStatus,3);assert.equal(e.sqlstate,'42601');assert.match(e.stderrExcerpt,/syntax error/);assert.ok(e.stderrExcerpt.length<=2048);assert.ok(!JSON.stringify(e).includes('DO_NOT_RETAIN'));assert.ok(!JSON.stringify(e).includes(hex.slice(0,200)))
})
test('mocked failure runs RW once, retains readback and removes only created ID; never starts RO',async()=>{
 const calls=[],id='a'.repeat(64),command=(args,o={})=>{calls.push([args,o]);if(args[0]==='inspect')return {status:1,stdout:'',stderr:''};if(args[0]==='run')return {status:0,stdout:id+'\n',stderr:''};if(args.includes('pg_isready'))return {status:0,stdout:'ready',stderr:''};if(args.includes('psql')){if(o.input==='EXACT_TEST_SQL')return {status:3,stdout:'',stderr:'ERROR:  42601: fixed synthetic syntax failure\n'};if(o.input?.includes('SELECT jsonb_build_object'))return {status:0,stdout:'{"rows":0,"currentUser":"supabase_admin","superuser":true,"tableOwner":"postgres","rowSecurity":false,"defaultReadOnly":"off"}\n',stderr:''};return {status:0,stdout:'',stderr:''}}return {status:0,stdout:'',stderr:''}}
 const r=await runDisposableCases({command,sql:'EXACT_TEST_SQL',fixtureSQL:'TEST_ONLY_FIXTURE',inspectCreated:()=>true});assert.equal(r.length,1);assert.equal(r[0].execution.sqlstate,'42601');assert.equal(r[0].state.rows,0);assert.ok(calls.some(([a])=>a.join(' ')==='rm --force --volumes '+id));assert.equal(calls.filter(([a])=>a[0]==='run').length,1);assert.ok(calls.filter(([a])=>a.includes('psql')).every(([a])=>a.indexOf('--username')>a.indexOf('psql')))
})
test('successful mocked RW uses a separately fresh RO container and the identical SQL bytes',async()=>{
 const calls=[],ids=['b'.repeat(64),'c'.repeat(64)],created=[],executions=[];let mode='rw',ro=false,rows=0
 const command=(args,o={})=>{calls.push([args,o]);if(args[0]==='inspect')return {status:1,stdout:'',stderr:''};if(args[0]==='run'){mode=args[3].endsWith('-ro')?'ro':'rw';rows=0;ro=false;const id=ids.shift();created.push(id);return {status:0,stdout:id+'\n',stderr:''}}if(args.includes('pg_isready'))return {status:0,stdout:'ready',stderr:''};if(args.includes('psql')){if(o.input?.startsWith('ALTER ROLE')){ro=true;return {status:0,stdout:'',stderr:''}}if(o.input==='EXACT_TEST_SQL'){executions.push(o.input);if(mode==='ro')return {status:3,stdout:'',stderr:'ERROR:  25006: cannot execute LOCK TABLE in a read-only transaction\n'};rows=1;return {status:0,stdout:'{"privateManifest":"not retained"}',stderr:''}}if(o.input?.includes('SELECT jsonb_build_object'))return {status:0,stdout:JSON.stringify({rows,currentUser:'supabase_admin',superuser:true,tableOwner:'postgres',rowSecurity:false,defaultReadOnly:ro?'on':'off'})+'\n',stderr:''};return {status:0,stdout:'',stderr:''}}return {status:0,stdout:'',stderr:''}}
 const results=await runDisposableCases({command,sql:'EXACT_TEST_SQL',fixtureSQL:'TEST_ONLY_FIXTURE',inspectCreated:()=>true});assert.deepEqual(results.map(r=>[r.mode,r.execution.exitStatus,r.state.rows]),[['rw',0,1],['ro',3,0]]);assert.deepEqual(executions,['EXACT_TEST_SQL','EXACT_TEST_SQL']);assert.equal(new Set(created).size,2);assert.deepEqual(calls.filter(([a])=>a[0]==='rm').map(([a])=>a.at(-1)),created);assert.ok(!JSON.stringify(results).includes('privateManifest'))
})
test('existing disposable name holds before starting or removing any container',async()=>{
 const calls=[];await assert.rejects(runDisposableCases({command:args=>{calls.push(args);return {status:0}},sql:'EXACT_TEST_SQL',fixtureSQL:'TEST_ONLY_FIXTURE'}),/EXISTING_CONTAINER_HOLD/);assert.deepEqual(calls,[['inspect','slff-baden-install-sql-probe-rw']])
})
test('NEVER MERGE workflow has only exact root manual attempt1 gate and no production secrets or publication',()=>{
 const y=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');assert.match(y,/NEVER MERGE/);assert.match(y,/workflow_dispatch:/);assert.match(y,/github\.actor == 'nejcar20'/);assert.match(y,/github\.run_attempt == 1/);assert.match(y,/inputs\.expected_probe_sha == github\.sha/);assert.match(y,/persist-credentials: false/);assert.match(y,/contents: write/);assert.doesNotMatch(y,/secrets\.|ssh |SUPABASE|PGHOST|DATABASE_URL|pull_request:|push:/)
})
test('actual container inspection rejects host networking before readiness or SQL, then removes its created ID',async()=>{
 const id='d'.repeat(64),calls=[];let inspections=0
 const command=args=>{calls.push(args);if(args[0]==='inspect'){if(!inspections++)return {status:1};return {status:0,stdout:JSON.stringify([{Id:id,Name:'/slff-baden-install-sql-probe-rw',HostConfig:{NetworkMode:'host',Privileged:false,PortBindings:null,Binds:null},Mounts:[],Config:{Labels:{'slff.baden.disposable':'exact2d5-install-sql'}}}])}}if(args[0]==='run')return {status:0,stdout:id+'\n'};return {status:0}}
 await assert.rejects(runDisposableCases({command,sql:'EXACT_TEST_SQL',fixtureSQL:'TEST_ONLY_FIXTURE'}),/DISPOSABLE_CONTAINER_IDENTITY/);assert.ok(!calls.some(a=>a.includes('psql')||a.includes('pg_isready')));assert.deepEqual(calls.at(-1),['rm','--force','--volumes',id])
})
test('imported low-level runner cannot invoke real Docker without private authenticated hosted latch',async()=>{
 await assert.rejects(runDisposableCases({sql:'TEST_ONLY_NEVER_EXECUTE',fixtureSQL:'TEST_ONLY_NEVER_EXECUTE'}),/AUTHENTICATED_HOSTED_PROBE_REQUIRED/)
})
