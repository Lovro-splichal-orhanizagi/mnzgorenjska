import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {sixG9ReleaseFixture} from './fcf-six-native-test-fixture.mjs'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
const migration=new URL('../supabase/migrations/20261019130000_fcf_six_reviewed_native.sql',import.meta.url)
const migrate=()=>"begin;\nselect to_regnamespace('private_fcf_six_history')is null as six_missing \\gset\n\\if :six_missing\n"+readFileSync(migration,'utf8')+"\n\\endif\n"
test('six native protocol remains separate and guards unknown results',()=>{
 const s=readFileSync(migration,'utf8')
 for(const fn of ['fcf_historical_six_prepare','fcf_historical_six_apply','fcf_historical_six_restore','fcf_six_current_target_import','fcf_six_current_target_check','get_installed_fcf_six_statistics_markers'])assert.match(s,new RegExp('function public\\.'+fn))
 assert.match(s,/157/);assert.match(s,/18/);assert.match(s,/paired_result_availability/)
 assert.match(s,/six-reviewed-continuation-v1/);assert.match(s,/maximumSourceGETs'='478'/)
 assert.doesNotMatch(s,/disable trigger/i)
})
test('six SQL actual disposable contracts',{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 execFileSync('docker',['exec','-i',assertFcfDisposableTest(),'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:migrate()+readFileSync(new URL('../supabase/tests/fcf-six-native.sql',import.meta.url),'utf8')+'\nrollback;',timeout:180000,maxBuffer:8*1024*1024})
})

test('six full G9 native release independent of G1',{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const cleanup=readFileSync(new URL('../supabase/tests/fcf-six-native.sql',import.meta.url),'utf8').split('select public.fcf_historical_six_restore')[0]
 execFileSync('docker',['exec','-i',assertFcfDisposableTest(),'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:migrate()+cleanup+'\n'+sixG9ReleaseFixture()+'\n'+readFileSync(new URL('../supabase/tests/fcf-six-target-release.sql',import.meta.url),'utf8')+'\nrollback;',timeout:180000,maxBuffer:8*1024*1024})
})

test('legacy four native cleanup still accepts only original policy registry',{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const old=readFileSync(new URL('../supabase/tests/fcf-historical-cleanup.sql',import.meta.url),'utf8'),fixture=old.slice(old.indexOf('-- Exact production fixture identities'),old.indexOf('-- Independent ordinary report'))
 const proof=`create temporary table old_proof as select public.prepare_fcf_historical_cleanup(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-reviewed-history-v1'))proof;
 do $$declare p jsonb;r jsonb;begin select proof into p from old_proof;r:=public.apply_fcf_historical_cleanup(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-reviewed-history-v1'),p->>'beforeSha256',p->>'beforeImageText');if r->>'removedAppearances'<>'126'or r->>'removedGoals'<>'14'or r->>'unavailableMatches'<>'4'then raise exception 'legacy four changed';end if;end$$;`
 execFileSync('docker',['exec','-i',assertFcfDisposableTest(),'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:'begin;\n'+fixture+'\n'+proof+'\nrollback;',timeout:180000,maxBuffer:8*1024*1024})
})
