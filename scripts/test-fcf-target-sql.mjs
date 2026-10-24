import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {execFileSync,spawn} from 'node:child_process'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
import {fcfTargetSqlFixture,fcfTargetSqlTestClock} from './fcf-target-sql-test-fixture.mjs'
const file=new URL('../supabase/migrations/20261018232000_fcf_current_target_release.sql',import.meta.url)
test('dedicated target SQL exposes only bounded service wrappers and common private authorization',()=>{
 assert.equal(existsSync(file),true,'monotonic232000 dedicated target migration exists')
 const sql=readFileSync(file,'utf8')
 for(const fn of['import_fcf_current_target','check_fcf_current_target','get_fcf_current_target_inventory','get_fcf_target_pricing_snapshot'])assert.match(sql,new RegExp(`function public\\.${fn}`))
 assert.match(sql,/private_historical_statistics\.authorize_release/);assert.match(sql,/READ COMMITTED/);assert.match(sql,/clock_timestamp\(\)/)
 assert.doesNotMatch(sql,/set_config\([^\n]*authoriz|disable trigger|include-all/i)
})
test('actual target lock excludes phantom users, votes, prices and deadline writes',{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},async t=>{
 const container=assertFcfDisposableTest(),args=['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],sql=readFileSync(file,'utf8'),first=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let diagnostics=''
 first.stderr.on('data',b=>diagnostics+=b);t.after(()=>{if(first.exitCode===null){first.stdin.end('rollback;\n');first.kill('SIGTERM')}})
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('target lock setup timeout: '+diagnostics)),30000);let out='';first.stdout.on('data',b=>{out+=b;if(out.includes('FCF_TARGET_LOCK_READY')){clearTimeout(timer);resolve()}});first.once('exit',code=>{clearTimeout(timer);if(code!==null)reject(Error('lock setup exited: '+diagnostics))})})
 first.stdin.write("begin;\nselect to_regnamespace('private_fcf_target_release')is null as fcf_missing \\gset\n\\if :fcf_missing\n"+sql+"\n\\endif\nselect private_fcf_target_release.lock_target(783);\nselect 'FCF_TARGET_LOCK_READY';\n")
 await ready
 try{execFileSync('docker',args,{input:"begin;do $$declare tab text;n int:=0;begin foreach tab in array array['fantasy_teams','position_votes','assist_votes','players','rounds']loop begin execute 'lock table public.'||quote_ident(tab)||' in row exclusive mode nowait';exception when lock_not_available then n:=n+1;end;end loop;if n<>5 then raise exception 'target phantom write lock escaped: %',n;end if;end$$;rollback;",timeout:30000,maxBuffer:1024*1024,stdio:['pipe','pipe','pipe']})}
 finally{first.stdin.end('rollback;\n')}
 await new Promise((resolve,reject)=>first.once('exit',code=>code===0?resolve():reject(Error('lock transaction did not roll back: '+diagnostics))))
})
test('owned disposable SQL verifies ACL, closed scope and transaction guards',{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=assertFcfDisposableTest(),sql=readFileSync(file,'utf8')
 const clockState=()=>execFileSync('docker',['exec',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-qAt','-c',"select jsonb_build_object('function',(select to_jsonb(p) from pg_proc p where oid='pg_catalog.clock_timestamp()'::regprocedure),'setting',current_setting('slff.fcf_target_test_clock',true))::text"],{encoding:'utf8'}).trim()
 const originalClock=clockState()
 const clockBefore="select coalesce(current_setting('slff.fcf_target_test_clock',true),'') fcf_clock_before \\gset\nbegin;\n"
 const clockAfter="\nrollback;\nselect coalesce(current_setting('slff.fcf_target_test_clock',true),'')=:'fcf_clock_before' as fcf_clock_restored \\gset\n\\if :fcf_clock_restored\n\\else\n\\quit 1\n\\endif\n"
 assert.throws(()=>execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:fcfTargetSqlTestClock(),stdio:['pipe','pipe','pipe']}),/SAVEPOINT can only be used in transaction blocks/,'clock helper cannot persist its override in autocommit')
 try{execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:clockBefore+fcfTargetSqlTestClock()+"select to_regnamespace('private_fcf_target_release')is null as fcf_missing \\gset\n\\if :fcf_missing\n"+sql+'\n\\endif\n'+fcfTargetSqlFixture()+'\n'+readFileSync(new URL('../supabase/tests/fcf-target-release.sql',import.meta.url),'utf8')+clockAfter,maxBuffer:8*1024*1024,timeout:180000})}
 finally{assert.equal(clockState(),originalClock,'ROLLBACK restores the exact built-in clock catalog row and session clock configuration')}
})


test('transaction clock helper rejects any non-disposable execution context',()=>{
 for(const env of [{},{FCF_HISTORY_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'production'},{FCF_HISTORY_DISPOSABLE_TEST:'0',SUPABASE_DB_CONTAINER:'supabase_db_slff_fcf_historical_test_clock'}])assert.throws(()=>fcfTargetSqlTestClock(env),/Explicit owned FCF disposable/)
})
