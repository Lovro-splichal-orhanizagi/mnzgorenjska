// Owned, offline PostgreSQL clone ONLY. New G1/source/native records are synthetic.
// Genuine retained old37/originals reauthenticate historical bytes only.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {g1NativeBase} from './fcf-g1-native-test-fixture.mjs'
import {deriveFcfFutureTargetNativeMapping} from './fcf-future-target-native-adapter.mjs'
import {buildFcfFutureTargetImportRollout} from './fcf-future-target-rollout.mjs'
import {sixG9ReleaseFixture} from './fcf-six-native-test-fixture.mjs'
import {selectFcfFutureLaunch} from './fcf-future-launch.mjs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),q=s=>"'"+String(s).replaceAll("'","''")+"'",container='slff-fcf-g1-native-admin-20261028',docker='/usr/local/bin/docker'
function owned(){
 const a=JSON.parse(execFileSync(docker,['inspect','--format','{"id":{{json .Id}},"owner":{{json (index .Config.Labels "slff.test.owner")}},"network":{{json .HostConfig.NetworkMode}},"mounts":{{len .Mounts}},"ports":{{json .HostConfig.PortBindings}},"running":{{json .State.Running}}}',container],{encoding:'utf8'}))
 assert.deepEqual(a,{id:'a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575',owner:'fcf-g1-native-admin-20261028',network:'none',mounts:0,ports:{},running:true},'exact explicitly owned disconnected disposable clone')
}
function prerequisites(){
 let sql='create schema if not exists private_fussball;create schema if not exists private_dfb_pending;create schema if not exists private_hns_women_release;create schema if not exists private_mfa_nl_history;\n'
 for(const file of ['20261018210100_hns_women_reviewed_release.sql','20261021183000_mfa_nl_archive_bootstrap.sql','20261021200000_mfa_nl_source_release.sql','20261026151100_mini_lige_dvoboji.sql','20261024123700_klub_dodaja_igralce.sql','20261025150100_popravki_podatkov.sql','20261025193100_ponovna_cena.sql','20261025223100_prag3_samodejni_poznavalci.sql','20261026153100_napovedi_mini_lig.sql','20261026093000_dfb_current_pending_reports.sql','20261027030000_fussball_community_cards.sql'])for(const m of read('../supabase/migrations/'+file).matchAll(/create table (?:if not exists )?([\w.]+)\s*\([\s\S]*?;/g))sql+=`select to_regclass('${m[1]}') is null as missing \\gset\n\\if :missing\n${m[0]}\n\\endif\n`
 return sql+'alter table public.appearances add column if not exists red_card_minute integer;alter table public.players add column if not exists dodal_klub_at timestamptz;\n'
}
async function fixture(t){
 const f=await g1NativeBase(t),d=f.base.databaseInventory,m=deriveFcfFutureTargetNativeMapping(f.base),r=buildFcfFutureTargetImportRollout({...f.base,execution:f.execution,mappingText:m.proposalText,mappingSha256:m.proposalSha256}),now=new Date(f.base.now).toISOString()

 let sql=`set local slff.fcf_target_test_clock=${q(now)};create or replace function pg_catalog.clock_timestamp()returns timestamptz language sql volatile parallel safe as $$select current_setting('slff.fcf_target_test_clock')::timestamptz$$;\n`
 sql+=read('../supabase/tests/fcf-six-native.sql').split('create temporary table six_proof')[0]
 sql+=`update competitions set prvi_fantasy_krog=1 where id in(783,790,797);create temporary table six_proof as select public.fcf_future_historical_six_prepare(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'))proof;create temporary table six_result as select public.fcf_future_historical_six_apply(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'),proof->>'beforeSha256',proof->>'beforeImageText')result from six_proof;\n`
 sql+=`delete from matches where id in(321647,321655);delete from rounds where competition_id=783 and id not in(28706,28708);\n`
 sql+=`insert into teams(id,name,short_name,country_id)overriding system value select(x->>'id')::bigint,x->>'name','TEST',(select id from countries where code='ES')from jsonb_array_elements(${q(JSON.stringify(d.teams))}::jsonb)x on conflict(id)do nothing;\n`
 sql+=`insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select(x->>'id')::bigint,783,'2026/27',(x->>'number')::int,(x->>'played_on')::date,(x->>'deadline_at')::timestamptz from jsonb_array_elements(${q(JSON.stringify(d.rounds))}::jsonb)x on conflict(id)do update set deadline_at=excluded.deadline_at;\n`
 sql+=`insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value select(x->>'id')::bigint,(x->>'round_id')::bigint,(x->>'home_team_id')::bigint,(x->>'away_team_id')::bigint,(x->>'played_on')::date from jsonb_array_elements(${q(JSON.stringify(d.matches))}::jsonb)x on conflict(id)do nothing;\n`
 sql+=`create temporary table fcf_target_packets(slug text primary key,rollout jsonb);do $$declare v jsonb:=${q(r.rolloutText)}::jsonb;p jsonb;b jsonb;t text;begin p:=(v->>'targetPacketText')::jsonb;b:=v->'cleanupBinding';b:=b||jsonb_build_object('beforeImageText',(select proof->>'beforeImageText'from six_proof),'beforeSha256',(select proof->>'beforeSha256'from six_proof),'appliedReceipt',(b->'appliedReceipt')||jsonb_build_object('result',(select result from six_result)));p:=jsonb_set(p,'{cleanupBinding}',b);t:=p::text;v:=v||jsonb_build_object('cleanupBinding',b,'targetPacketText',t,'targetPacketSha256',encode(sha256(convert_to(t,'UTF8')),'hex'));insert into fcf_target_packets values('es-ct-segona-g1',v);end$$;\n`
 return sql
}
test('G1 additive SQL actual owned clone import/CHECK/activation, negative gates and immutable G9',{skip:process.env.FCF_G1_OWNED_SQL_TEST!=='1'},async t=>{
 const sql='BEGIN;set local client_min_messages=warning;\n'+prerequisites()+read('../supabase/migrations/20261028042000_fcf_future_g1_native.sql')+await fixture(t)+read('../supabase/tests/fcf-future-g1-native.sql')+'\nROLLBACK;'
 writeFileSync('/tmp/g1-native-owned-fixture.sql',sql,{mode:0o600});owned()
 const out=execFileSync(docker,['exec','-i','--user','postgres',container,'psql','-X','-U','supabase_admin','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024})
 writeFileSync('/tmp/g1-native-owned-fixture-output.log',out,{mode:0o600})
 const line=out.split('\n').find(x=>x.startsWith('G1_SYNTHETIC_PROJECTION:'));assert.ok(line);const p=JSON.parse(line.slice('G1_SYNTHETIC_PROJECTION:'.length));assert.deepEqual(selectFcfFutureLaunch(p.launchInput),p.proposal)
})

for(const stage of ['import','activation'])test(`unchanged old G9 ${stage} SQL assertions under additive G1 migration`,{skip:process.env.FCF_G1_OWNED_SQL_TEST!=='1'},()=>{
 const setup=`update competitions set prvi_fantasy_krog=1 where id in(783,790,797);create temporary table six_proof as select public.fcf_future_historical_six_prepare(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'))proof;create temporary table six_result as select public.fcf_future_historical_six_apply(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'),proof->>'beforeSha256',proof->>'beforeImageText')result from six_proof;`
 const clock=`set local slff.fcf_target_test_clock='2026-10-24T07:30:00.000Z';create or replace function pg_catalog.clock_timestamp()returns timestamptz language sql volatile parallel safe as $$select current_setting('slff.fcf_target_test_clock')::timestamptz$$;`
 const wire=stage==='activation'?read('../supabase/tests/fcf-future-native-import.sql').split('create function pg_temp.future_import')[0].replace("if(f->>'round')::int=7 and not converted",'if false and not converted'):''
 const sql='BEGIN;set local client_min_messages=warning;\n'+prerequisites()+read('../supabase/migrations/20261028042000_fcf_future_g1_native.sql')+clock+/* Isolate legacy global-min goal mutant inside this rolled-back fixture. */'delete from goals;\n'+read('../supabase/tests/fcf-six-native.sql').split('create temporary table six_proof')[0]+setup+sixG9ReleaseFixture()+wire+read('../supabase/tests/fcf-future-native-'+stage+'.sql')+'\nROLLBACK;'
 owned();const out=execFileSync(docker,['exec','-i','--user','postgres',container,'psql','-X','-U','supabase_admin','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});writeFileSync('/tmp/g1-native-old-g9-'+stage+'.log',out,{mode:0o600})
})
