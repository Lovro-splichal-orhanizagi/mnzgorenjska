// Synthetic SQL-only inputs. These never confer Task5 reader capabilities.
import {readFileSync} from 'node:fs'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
import {fullNativeMatchFixture} from './fcf-native-plan-test-fixture.mjs'
import {planFcfNativeMapping} from './fcf-target-native-plan.mjs'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const q=s=>"'"+String(s).replaceAll("'","''")+"'"
// The fixture's official R6 deadline is 2026-10-24T08:00Z. Keep source capture
// metadata and every production clock_timestamp() call in the same prelaunch context.
export const FCF_TARGET_SQL_TEST_NOW='2026-10-24T07:30:00.000Z'
export function fcfTargetSqlTestClock(env=process.env){
 assertFcfDisposableTest(env)
 // The caller wraps this in BEGIN/ROLLBACK. PostgreSQL catalog changes are
 // transactional, so other sessions keep the original built-in clock function.
 return `savepoint fcf_target_test_clock_scope;
set local slff.fcf_target_test_clock='${FCF_TARGET_SQL_TEST_NOW}';
create or replace function pg_catalog.clock_timestamp() returns timestamptz
language sql volatile parallel safe as $$select current_setting('slff.fcf_target_test_clock')::timestamptz$$;
release savepoint fcf_target_test_clock_scope;
`
}
export function fcfTargetSqlFixture(){
 const old=readFileSync(new URL('../supabase/tests/fcf-historical-cleanup.sql',import.meta.url),'utf8'),prefix=old.slice(old.indexOf('-- Exact production fixture identities'),old.indexOf('-- Independent ordinary report'))
 const groups=['es-ct-segona-g1','es-ct-tercera-g9'].map(slug=>{
  const f=fullNativeMatchFixture(slug),cid=f.sourceData.competition.id,policy=getHistoricalStatisticsPolicy(slug)
  for(const r of f.databaseInventory.rounds)if(r.id>=700000){const before=r.id;r.id=cid*10000+r.number;for(const m of f.databaseInventory.matches)if(m.round_id===before)m.round_id=r.id}
  f.databaseInventory.matches.forEach((m,i)=>{if(m.id>=800000)m.id=cid*10000+100+i})
  const binding={schemaVersion:1,kind:'fcf-missing-target-admission',targetSlug:slug,sourceCommit:'a'.repeat(40),sourceClaimState:'consumed',sourceFingerprintSha256:'c'.repeat(64),maximumSourceGETs:477,actualSourceGETs:477,claimBinding:{test:'synthetic'},consumptionBinding:{test:'synthetic'},inventoryBinding:{test:'synthetic'},auditBinding:{test:'synthetic'},finalReceiptBinding:{test:'synthetic'}}
  f.sourceData.binding={...f.sourceData.binding,...binding}
  for(const m of f.sourceData.fixtures){
   const entry=policy.entries.find(e=>'es'+e.sourceMatchId===m.id)
   Object.assign(m,{source:{sourceUrl:'https://www.fcf.cat/ca/competicio/acta/'+m.id.slice(2),capturedUTC:FCF_TARGET_SQL_TEST_NOW,rawSha256:'d'.repeat(64)},report:m.statisticsStatus==='available'?{opozorila:[]}:null,sourceFixture:null,statisticsReason:null})
   if(entry){const{rawSha256,reasonCode,...fixture}=entry;Object.assign(m,{date:entry.playedOn,homeGoals:entry.observedHomeScore,awayGoals:entry.observedAwayScore,statisticsReason:reasonCode,sourceFixture:{...fixture,season:'2026/27'},source:{...m.source,rawSha256},appearances:null,goals:null})}
   else if(m.statisticsStatus==='pending'){m.appearances=null;m.goals=null}
  }
  const mapping=planFcfNativeMapping(f),packet={schemaVersion:2,kind:'fcf-current-target-release',targetSlug:slug,sourceCommit:f.writerCommit,auditedUTC:FCF_TARGET_SQL_TEST_NOW,cleanupBinding:null,databaseInventory:{},target:{sourceEvidence:binding,competitionId:cid,competitionSlug:slug,season:'2026/27',firstFantasyPlayedOn:'2026-10-24',policyId:policy.id,policySha256:hash(policy),fixtures:f.sourceData.fixtures}}
  const rollout={schemaVersion:1,kind:'fcf-current-target-rollout',targetSlug:slug,sourceCommit:f.writerCommit,execution:{},targetPacketText:'',targetPacketSha256:'',inventoryBinding:binding,cleanupBinding:null,identityPlan:{mappingText:mapping.proposalText,mappingSha256:mapping.proposalSha256},readiness:null}
  return{f,packet,rollout}
 })
 let sql=prefix+`\ncreate temporary table fcf_target_cleanup as select public.prepare_fcf_historical_cleanup(repeat('b',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='fcf'and document->>'sourcePolicy'='es-fcf-reviewed-history-v1')) proof;\nselect public.apply_fcf_current_target_cleanup(repeat('b',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='fcf'and document->>'sourcePolicy'='es-fcf-reviewed-history-v1'),proof->>'beforeSha256',proof->>'beforeImageText')from fcf_target_cleanup;\ncreate temporary table fcf_target_packets(slug text primary key,rollout jsonb);\n`
 for(const{f,packet,rollout}of groups){
  const cid=f.sourceData.competition.id
  sql+=`insert into teams(id,name,short_name,country_id)overriding system value select (x->>'id')::bigint,x->>'name','TEST',(select id from countries where code='ES')from jsonb_array_elements(${q(JSON.stringify(f.databaseInventory.teams))}::jsonb)x on conflict(id)do nothing;\n`
  sql+=`delete from rounds where competition_id=${cid} and number=6;insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select (x->>'id')::bigint,${cid},'2026/27',(x->>'number')::int,case when x->>'number'='6'then '2026-10-24'::date else '2026-09-20'::date end,clock_timestamp()+interval'7 days'from jsonb_array_elements(${q(JSON.stringify(f.databaseInventory.rounds))}::jsonb)x on conflict(id)do nothing;\n`
  sql+=`insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value select(x->>'id')::bigint,(x->>'round_id')::bigint,(x->>'home_team_id')::bigint,(x->>'away_team_id')::bigint,'2026-09-20'from jsonb_array_elements(${q(JSON.stringify(f.databaseInventory.matches))}::jsonb)x on conflict(id)do nothing;\n`
  sql+=`do $$declare p jsonb:=${q(JSON.stringify(packet))}::jsonb;v jsonb:=${q(JSON.stringify(rollout))}::jsonb;b jsonb;t text;begin select jsonb_build_object('phase','applied','beforeImageText',proof->>'beforeImageText','beforeSha256',proof->>'beforeSha256','appliedReceipt',jsonb_build_object('result',jsonb_build_object('removedAppearances',126,'removedGoals',14,'unavailableMatches',4)))into b from fcf_target_cleanup;p:=jsonb_set(p,'{cleanupBinding}',b);t:=p::text;v:=v||jsonb_build_object('cleanupBinding',b,'targetPacketText',t,'targetPacketSha256',encode(sha256(convert_to(t,'UTF8')),'hex'));insert into fcf_target_packets values(${q(f.targetSlug)},v);end$$;\n`
 }
 return sql
}
