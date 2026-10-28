// Exact owned offline clone only. All schema and fixtures roll back; no source/launch proof.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const container='slff-fcf-g1-native-admin-20261028',docker='/usr/local/bin/docker'
const migration='../supabase/migrations/20261028070000_fcf_scout_snapshot_preservation.sql'
function owned(){
 const actual=JSON.parse(execFileSync(docker,['inspect','--format','{"id":{{json .Id}},"owner":{{json (index .Config.Labels "slff.test.owner")}},"network":{{json .HostConfig.NetworkMode}},"mounts":{{len .Mounts}},"ports":{{json .HostConfig.PortBindings}},"running":{{json .State.Running}}}',container],{encoding:'utf8'}))
 assert.deepEqual(actual,{id:'a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575',owner:'fcf-g1-native-admin-20261028',network:'none',mounts:0,ports:{},running:true})
}
function run(sql){
 owned() // Identity reauthenticated immediately before every mutating transaction.
 const out=execFileSync(docker,['exec','-i','--user','postgres',container,'psql','-X','-U','supabase_admin','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:'BEGIN;set local client_min_messages=warning;\n'+sql+'\nROLLBACK;\\echo FCF_SCOUT_TEST_ROLLBACK_DONE\n',encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024})
 assert.ok(out.trimEnd().endsWith('FCF_SCOUT_TEST_ROLLBACK_DONE'),'explicit outer rollback completed')
}
const fix=()=>existsSync(new URL(migration,import.meta.url))?read(migration):''
const fixture=()=>read('../supabase/tests/fcf-six-native.sql').split('create temporary table six_proof')[0]+'\nupdate competitions set prvi_fantasy_krog=1 where id in(783,790,797);\n'
const parents=`insert into scout.modeli(id,leto,backtest,parametri,objavljen)overriding system value select n,2026,'{}','{"synthetic":"preservation"}',true from generate_series(910000001,910000003)n;
insert into scout.lige_moc(model_id,competition_id,moc,vir,prestopov,izracunano_at)select id,cid,0,'brez',0,now() from scout.modeli cross join unnest(array[783,790,797]::bigint[])cid where id between 910000001 and 910000003;\n`
test('nine constant fallback snapshots allow actual future cleanup preparation',{skip:process.env.FCF_SCOUT_OWNED_SQL_TEST!=='1'},()=>{
 run(fix()+fixture()+parents+`select public.fcf_future_historical_six_prepare(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'));`)
})
test('zero-reference schema3 cleanup/restore and existing negative guards',{skip:process.env.FCF_SCOUT_OWNED_SQL_TEST!=='1'},()=>{
 const legacy=`create temporary table future_legacy_contracts as select oid,pg_get_functiondef(oid)definition from pg_proc where oid in('public.fcf_historical_six_prepare(text,jsonb)'::regprocedure,'public.fcf_historical_six_apply(text,jsonb,text,text)'::regprocedure,'public.fcf_historical_six_restore(text)'::regprocedure,'private_fcf_six_history.check_and_lock(text,jsonb)'::regprocedure,'private_fcf_six_history.apply_core(text,jsonb,text,text)'::regprocedure,'public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure);\n`
 run(legacy+fix()+/* Existing assertion uses global-min mutants. */'delete from goals;delete from appearances;\n'+fixture()+read('../supabase/tests/fcf-future-historical-cleanup.sql'))
})
test('nine-row preservation, strict holds, intra-phase trigger rollback and current snapshot restore',{skip:process.env.FCF_SCOUT_OWNED_SQL_TEST!=='1'},()=>{
 run(fix()+fixture()+parents+eventTables()+read('../supabase/tests/fcf-scout-preservation.sql'))
})

function eventTables(){
 let sql=''
 for(const m of read('../supabase/migrations/20261027180000_scout_ekipa.sql').matchAll(/create table (scout\.(?:dogodki|prisotnost))\s*\([\s\S]*?;/g))sql+=`select to_regclass('${m[1]}')is null as missing \\gset\n\\if :missing\n${m[0]}\n\\endif\n`
 return sql
}
function projectionPrerequisites(){
 let sql='create schema if not exists private_fussball;create schema if not exists private_dfb_pending;create schema if not exists private_hns_women_release;create schema if not exists private_mfa_nl_history;\n'
 for(const file of ['20261018210100_hns_women_reviewed_release.sql','20261021183000_mfa_nl_archive_bootstrap.sql','20261021200000_mfa_nl_source_release.sql','20261026151100_mini_lige_dvoboji.sql','20261024123700_klub_dodaja_igralce.sql','20261025150100_popravki_podatkov.sql','20261025193100_ponovna_cena.sql','20261025223100_prag3_samodejni_poznavalci.sql','20261026153100_napovedi_mini_lig.sql','20261026093000_dfb_current_pending_reports.sql','20261027030000_fussball_community_cards.sql'])for(const m of read('../supabase/migrations/'+file).matchAll(/create table (?:if not exists )?([\w.]+)\s*\([\s\S]*?;/g))sql+=`select to_regclass('${m[1]}')is null as missing \\gset\n\\if :missing\n${m[0]}\n\\endif\n`
 return sql+'alter table public.appearances add column if not exists red_card_minute integer;alter table public.players add column if not exists dodal_klub_at timestamptz;\n'
}
test('unchanged additive G1 closed relation/shape registry accepts forward preservation helper',{skip:process.env.FCF_SCOUT_OWNED_SQL_TEST!=='1'},()=>{
 const baseline=read('../supabase/tests/fcf-future-native-projection.sql').split('-- Initial actual native projection')[0]
 run(projectionPrerequisites()+eventTables()+read('../supabase/migrations/20261028042000_fcf_future_g1_native.sql')+`create temporary table unchanged_g1 as select pg_get_functiondef('private_fcf_future_projection.capture(text,text[])'::regprocedure)definition;\n`+fix()+baseline+`select pg_temp.projection_assert(pg_get_functiondef('private_fcf_future_projection.capture(text,text[])'::regprocedure)=(select definition from unchanged_g1),'G1 function unchanged');select pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,complete}'='true','G1 exact catalog/shape/FK registry remains complete');`)
})
