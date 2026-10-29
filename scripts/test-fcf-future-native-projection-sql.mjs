// Focused synthetic native SQL controls, never source or launch readiness.
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
import {fcfProjectionOptionalBadenCompatibilitySQL} from './lib/fcf-projection-optional-compat.mjs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const optional=(namespace,path)=>`select to_regnamespace('${namespace}') is null as missing \\gset\n\\if :missing\n${read(path)}\n\\endif\n`
// The owned historical container predates these branch migrations. Reuse exact
// reviewed CREATE TABLE statements only, conditionally and inside BEGIN/ROLLBACK.
// A CI reset already has them; no duplicate schema/table setup is performed.
function referenceSchema(){
 let sql='create schema if not exists private_fussball;create schema if not exists private_dfb_pending;create schema if not exists private_hns_women_release;create schema if not exists private_mfa_nl_history;\n'
 for(const file of ['20261018210100_hns_women_reviewed_release.sql','20261021183000_mfa_nl_archive_bootstrap.sql','20261021200000_mfa_nl_source_release.sql','20261026151100_mini_lige_dvoboji.sql','20261024123700_klub_dodaja_igralce.sql','20261025150100_popravki_podatkov.sql','20261025193100_ponovna_cena.sql','20261025223100_prag3_samodejni_poznavalci.sql','20261026153100_napovedi_mini_lig.sql','20261026093000_dfb_current_pending_reports.sql','20261027030000_fussball_community_cards.sql']){
  const source=read('../supabase/migrations/'+file)
  for(const match of source.matchAll(/create table (?:if not exists )?([\w.]+)\s*\([\s\S]*?;/g))sql+=`select to_regclass('${match[1]}') is null as missing \\gset\n\\if :missing\n${match[0]}\n\\endif\n`
 }
 sql+='alter table public.appearances add column if not exists red_card_minute integer;alter table public.players add column if not exists dodal_klub_at timestamptz;\n'
 return sql
}
for(const installed of [false,true])test(`native actual projection (${installed?'already installed':'optional migration'})`,{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=assertFcfDisposableTest()
 const migration=optional('private_fcf_future_projection','../supabase/migrations/20261027211000_fcf_future_native_projection.sql')
 // Optional legacy setup must retain the exact newest forward projection when
 // CI already contains Baden180/181/182 and may include exact9410.
 // Preserve that complete protected epoch without rewriting its body.
 const forward=`select to_regnamespace('private_baden_history') is not null as baden_forward \\gset\n\\if :baden_forward\n${fcfProjectionOptionalBadenCompatibilitySQL()}\n\\endif\n`
 const input='begin;\n'+optional('private_fcf_six_history','../supabase/migrations/20261019150000_fcf_six_reviewed_native.sql')+optional('private_fcf_future_history','../supabase/migrations/20261027210000_fcf_future_historical_cleanup.sql')+referenceSchema()+(installed?migration:'')+migration+forward+read('../supabase/tests/fcf-future-native-projection.sql')+'\nrollback;'
 execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-q','-v','ON_ERROR_STOP=1'],{input,timeout:180000,maxBuffer:8*1024*1024})
})
