// Synthetic football controls only; these never prove source readiness.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {sixG9ReleaseFixture} from './fcf-six-native-test-fixture.mjs'
import {fcfTargetSqlTestClock} from './fcf-target-sql-test-fixture.mjs'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const optional=(namespace,path)=>`select to_regnamespace('${namespace}') is null as missing \\gset\n\\if :missing\n${read(path)}\n\\endif\n`
function prerequisites(){
 let sql='create schema if not exists private_fussball;create schema if not exists private_dfb_pending;create schema if not exists private_hns_women_release;create schema if not exists private_mfa_nl_history;\n'
 for(const file of ['20261018210100_hns_women_reviewed_release.sql','20261021183000_mfa_nl_archive_bootstrap.sql','20261021200000_mfa_nl_source_release.sql','20261026151100_mini_lige_dvoboji.sql','20261024123700_klub_dodaja_igralce.sql','20261025150100_popravki_podatkov.sql','20261025193100_ponovna_cena.sql','20261025223100_prag3_samodejni_poznavalci.sql','20261026153100_napovedi_mini_lig.sql','20261026093000_dfb_current_pending_reports.sql','20261027030000_fussball_community_cards.sql'])for(const m of read('../supabase/migrations/'+file).matchAll(/create table (?:if not exists )?([\w.]+)\s*\([\s\S]*?;/g))sql+=`select to_regclass('${m[1]}') is null as missing \\gset\n\\if :missing\n${m[0]}\n\\endif\n`
 return sql+'alter table public.appearances add column if not exists red_card_minute integer;alter table public.players add column if not exists dodal_klub_at timestamptz;\n'
}
test('future import has a separate bounded inactive SQL entrypoint',()=>{
 const s=read('../supabase/migrations/20261027212000_fcf_future_native_import.sql')
 assert.match(s,/function public\.fcf_future_current_target_import/)
 assert.doesNotMatch(s,/pg_get_functiondef|disable trigger|set active=true|set prvi_fantasy_krog=6/i)
})
for(const installed of [false,true])test(`future native IMPORT (${installed?'already installed':'optional migration'})`,{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=assertFcfDisposableTest(),migration=optional('private_fcf_future_import','../supabase/migrations/20261027212000_fcf_future_native_import.sql')
 const fixture=read('../supabase/tests/fcf-six-native.sql').split('create temporary table six_proof')[0]
 const setup=`update competitions set prvi_fantasy_krog=1 where id in(783,790,797);create temporary table six_proof as select public.fcf_future_historical_six_prepare(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'))proof;create temporary table six_result as select public.fcf_future_historical_six_apply(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'),proof->>'beforeSha256',proof->>'beforeImageText')result from six_proof;`
 const input='begin;set local client_min_messages=warning;\n'+optional('private_fcf_six_history','../supabase/migrations/20261019150000_fcf_six_reviewed_native.sql')+optional('private_fcf_future_history','../supabase/migrations/20261027210000_fcf_future_historical_cleanup.sql')+prerequisites()+optional('private_fcf_future_projection','../supabase/migrations/20261027211000_fcf_future_native_projection.sql')+(installed?migration:'')+migration+fcfTargetSqlTestClock()+fixture+setup+sixG9ReleaseFixture()+read('../supabase/tests/fcf-future-native-import.sql')+'\nrollback;'
 try{execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-q','-v','ON_ERROR_STOP=1'],{input,timeout:180000,maxBuffer:8*1024*1024})}catch(e){throw Error(e.stderr?.toString()??e.message)}
})
