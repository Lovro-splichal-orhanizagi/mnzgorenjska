// Independently seed the synthetic marker fixture as owner, then prove the
// release gate locks without inheriting bootstrap locks. Everything rolls back.
import {spawn,execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const container=process.env.SUPABASE_DB_CONTAINER,db=process.env.SUPABASE_TEST_DB
if(!container||!db)throw Error('Explicit disposable lock-test container AND database required')
const args=['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-v','ON_ERROR_STOP=1']
const ordinary=readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql',import.meta.url),'utf8').split('create function pg_temp.de_check(')[0]
const historical=readFileSync(new URL('../supabase/tests/dfb-historical-release.sql',import.meta.url),'utf8').split('-- A conflicting SECOND')[0]
const child=spawn('docker',[...args,'-v','regional_slug=de-regionalliga-suedwest','-v','current_clubs=18','-v','current_rounds=34'],{stdio:['pipe','pipe','pipe']})
let output='',errors='';child.stderr.on('data',d=>errors+=d)
const ready=new Promise((ok,no)=>{child.stdout.on('data',d=>{output+=d;if(output.includes('DFB_HISTORICAL_GATE_HELD'))ok()});child.on('exit',code=>{if(!output.includes('DFB_HISTORICAL_GATE_HELD'))no(Error(`Gate failed ${code}: ${errors}`))})})
const seed=`
update competitions set source_policy=p.id,prvi_fantasy_krog=3 from de_policy p where slug=current_setting('slff.test_slug');
insert into private_historical_statistics.installed_policies select c.id,p.id,p.policy_sha256,current_date+3,now()from competitions c cross join de_policy p where c.slug=current_setting('slff.test_slug');
update private_historical_statistics.source_club_bindings b set bound_team_id=t.id from teams t join countries c on c.id=t.country_id and c.code='DE'where b.provider='dfb'and t.name=any(b.canonical_names);
insert into private_historical_statistics.markers select c.id,e->>'sourceMatchId','de-dfb-'||(e->>'sourceMatchId'),(e-array['rawSha256','reasonCode'])||jsonb_build_object('season','2025/26'),e->>'rawSha256',-925000-em.round,h.id,a.id from de_exception_map em join de_clubs h on h.n=em.home join de_clubs a on a.n=em.away cross join competitions c where c.slug=current_setting('slff.test_slug');
insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,statistics_status,statistics_reason,source_round)select -925000-em.round,h.id,a.id,(e->>'observedHomeScore')::int,(e->>'observedAwayScore')::int,(e->>'playedOn')::date,'de-dfb-'||(e->>'sourceMatchId'),e->>'sourceUrl','unavailable_historical',e->>'reasonCode',em.round from de_exception_map em join de_clubs h on h.n=em.home join de_clubs a on a.n=em.away;
select pg_temp.de_check();
\\echo DFB_HISTORICAL_GATE_HELD
`
child.stdin.write(ordinary+historical+seed)
await ready
try{
 for(const table of['teams','players','rounds','matches','appearances','goals','fantasy_teams'])assert.throws(()=>execFileSync('docker',args,{input:`begin;lock table public.${table} in row exclusive mode nowait;rollback;`,encoding:'utf8',stdio:['pipe','pipe','pipe']}),e=>e.stderr.includes('could not obtain lock on relation'),table)
 assert.throws(()=>execFileSync('docker',args,{input:"set lock_timeout='200ms';update public.competitions set active=true where slug='de-regionalliga-suedwest';",encoding:'utf8',stdio:['pipe','pipe','pipe']}),e=>e.stderr.includes('lock timeout'))
 console.log('PASS v3 preflight independently holds all statistics/fantasy tables and target competition without inherited bootstrap locks')
}finally{child.stdin.end('rollback;\n')}
await new Promise((ok,no)=>child.on('exit',code=>code===0?ok():no(Error(errors))))
