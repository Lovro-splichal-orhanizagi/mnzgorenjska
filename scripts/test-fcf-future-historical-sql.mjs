// Local disposable SQL only. Never load .env or connect to a remote database.
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const optionalMigration=(namespace,flag,path)=>`select to_regnamespace('${namespace}') is null as ${flag} \\gset\n\\if :${flag}\n${read(path)}\n\\endif\n`
for(const installed of [false,true])test(`future six cleanup schema3 operates directly on inactive seed1 (${installed?'already installed':'optional migration'})`,{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=assertFcfDisposableTest()
 const fixture=read('../supabase/tests/fcf-six-native.sql').split('create temporary table six_proof')[0]
 const futureMigration=optionalMigration('private_fcf_future_history','missing_future','../supabase/migrations/20261027210000_fcf_future_historical_cleanup.sql')
 // Snapshot legacy definitions before BOTH the simulated reset installation and
 // the runner's optional migration, so either route detects accidental changes.
 const legacySnapshot="create temporary table future_legacy_contracts as select oid,pg_get_functiondef(oid)definition from pg_proc where oid in('public.fcf_historical_six_prepare(text,jsonb)'::regprocedure,'public.fcf_historical_six_apply(text,jsonb,text,text)'::regprocedure,'public.fcf_historical_six_restore(text)'::regprocedure,'private_fcf_six_history.check_and_lock(text,jsonb)'::regprocedure,'private_fcf_six_history.apply_core(text,jsonb,text,text)'::regprocedure,'public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure);\n"
 const input='begin;\n'+optionalMigration('private_fcf_six_history','missing_six','../supabase/migrations/20261019150000_fcf_six_reviewed_native.sql')+legacySnapshot
  +(installed?futureMigration:'')+futureMigration+'\n'+fixture+'\n'+read('../supabase/tests/fcf-future-historical-cleanup.sql')+'\nrollback;'
 execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-q','-v','ON_ERROR_STOP=1'],{input,timeout:180000,maxBuffer:8*1024*1024})
})
