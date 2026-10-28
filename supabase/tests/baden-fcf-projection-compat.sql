-- Exact function identity/ACL/security/snapshot semantics remain unchanged.
select private_fcf_six_target_release.require((select to_jsonb(m)=jsonb_build_object('proowner',p.proowner,'proacl',p.proacl,'proconfig',p.proconfig,'provolatile',p.provolatile,'prosecdef',p.prosecdef)from capture_meta m cross join pg_proc p where p.oid='private_fcf_future_projection.capture(text,text[])'::regprocedure),'capture owner/ACL/stable/security/searchpath unchanged');
select jsonb_build_object('BadenShapes',(select jsonb_object_agg(rel,cols)from(select n.nspname||'.'||c.relname rel,jsonb_agg(jsonb_build_array(a.attname,a.atttypid::regtype::text)order by a.attnum)cols from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid where n.nspname='private_baden_history'and c.relname in('catalog','prepared','club_bindings')and a.attnum>0 and not a.attisdropped group by n.nspname,c.relname)x),'BadenAllFKs',(select jsonb_agg(jsonb_build_object('rel',conrelid::regclass::text,'parent',confrelid::regclass::text,'definition',pg_get_constraintdef(oid),'validated',convalidated,'deferrable',condeferrable,'deferred',condeferred)order by conrelid::regclass::text,conname)from pg_constraint where contype='f'and conrelid in('private_baden_history.catalog'::regclass,'private_baden_history.prepared'::regclass,'private_baden_history.club_bindings'::regclass)));
-- TEST ONLY: original797 ID retained; only its empty placeholder header changes.
-- Parent harness exhaustively proves no existing797 FK/direct/JSON dependencies.
update competitions set slug='test-only-empty766-baden-projection'where id=766;
update competitions set slug='es-ct-tercera-g9',name='TEST G9 PROJECTION',short_name='TEST',source='fcf',source_league_code='4118349-4118588',country_id=(select id from countries where code='ES'),active=false,sezona_koledarska=false,prvi_fantasy_krog=1,source_policy='es-fcf-six-reviewed-history-v1',rok_pomak_ur=6,date_only_deadline_policy=null where id=797;
insert into teams(id,name,short_name,country_id)overriding system value select -918000-i,'TEST projection club '||i,'TEST',(select id from countries where code='ES')from generate_series(0,15)i;
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select -919000-i,797,'2026/27',i,'2026-09-19'::date+7*(i-1),'2030-01-01T12:00Z'::timestamptz+interval'7days'*(i-1)from generate_series(1,30)i;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,source_round)overriding system value select -920000-i,-919001-i/8,-918000-2*(i%8),-918001-2*(i%8),'2026-09-19'::date+7*(i/8),'es'||(4118349+i),'https://www.fcf.cat/ca/competicio/acta/'||(4118349+i),1+i/8 from generate_series(0,239)i;
create function pg_temp.capture()returns jsonb language sql stable as $$select private_fcf_future_projection.capture('es-ct-tercera-g9',array[]::text[])$$;
create temporary table empty_baseline as select pg_temp.capture()p;
select private_fcf_six_target_release.require(p#>>'{native,dependencies,complete}'='true'and jsonb_array_length(p#>'{native,matches}')=240 and jsonb_array_length(p#>'{native,rounds}')=30,'synthetic actual797 full projection')from empty_baseline;
select 'PASS full FCF projection with exact empty Baden catalog';

-- Real paired-NULL CHECK copied for restore-shaped validation only. Production
-- triggers/constraints/privileges remain enabled and unchanged on every table.
create temporary table pair_shape(like public.matches including constraints);
insert into pair_shape(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,home_goals,away_goals,statistics_status,statistics_reason,source_phase,source_round,imported_at,kontumacija,vir_brez_izida,import_warnings)
values(-921000,-921001,-921002,-921003,'2026-10-04','es4109409','https://www.fcf.cat/ca/competicio/acta/4109409',null,null,'unavailable_historical','closed_official_result_and_individual_statistics_unavailable',null,3,null,false,false,array[]::text[]);
select private_fcf_six_target_release.require((select count(*)=1 from pair_shape),'G1 pure paired-NULL CHECK preserved under Baden180/183');
do $$begin begin update pair_shape set zapisnik_id='es4109410';raise exception 'TEST unapproved NULL accepted';exception when check_violation then null;end;end$$;
select 'PASS existing exact G1 NULL and unapproved-NULL rejection';

-- Explicitly synthetic unrelated German FK graph; no source/launch authority.
insert into competitions(id,slug,name,short_name,country_id,source,source_league_code,active)overriding system value values(-922000,'test-baden-projection','TEST Baden','TEST',(select id from countries where code='DE'),'fussball-public','TEST ONLY',false);
insert into teams(id,name,short_name,country_id)overriding system value values(-922001,'TEST Baden home','TEST',(select id from countries where code='DE')),(-922002,'TEST Baden away','TEST',(select id from countries where code='DE'));
insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value values(-922003,-922000,'2026/27',1,'2030-01-01','2030-01-01T12:00Z');
insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value values(-922004,-922003,-922001,-922002,'2030-01-01');
create function pg_temp.reject(q text,pattern text)returns void language plpgsql as $$begin
 begin execute q;perform pg_temp.capture();raise exception 'TEST unsafe mutation accepted';exception when others then if SQLERRM!~pattern then raise;end if;raise exception using errcode='P9998',message='rollback probe';end;
exception when sqlstate 'P9998'then null;end$$;
select pg_temp.reject('create table public.baden_projection_unknown(match_id bigint references matches(id))','unknown/missing relevant FK');
select pg_temp.reject('create table private_baden_history.unknown(round_id bigint)','unknown relevant non-FK');
select pg_temp.reject('alter table private_baden_history.prepared add column unexpected text','unreviewed dependency shape');
select pg_temp.reject('alter table private_baden_history.prepared add column receipt_id bigint references private_fcf_g1_supplement.markers(match_id)','unknown/missing relevant FK');
select pg_temp.reject($q$insert into private_baden_history.prepared values(797,repeat('a',64),'[]',-922003)$q$,'Baden state references FCF');
select pg_temp.reject($q$insert into private_baden_history.prepared values(-922000,repeat('a',64),'[]',-919001)$q$,'Baden state references FCF');
select pg_temp.reject($q$insert into private_baden_history.club_bindings values(797,'TEST','2026/27','TEST','TEST',-922001)$q$,'Baden state references FCF');
select pg_temp.reject($q$insert into private_baden_history.club_bindings values(-922000,'TEST','2026/27','TEST','TEST',-918000)$q$,'Baden state references FCF');
do $$declare key text;binding jsonb;begin
 foreach key in array array['matchId','roundId','homeTeamId','awayTeamId']loop
  binding:=jsonb_build_object('matchId',-922004,'roundId',-922003,'homeTeamId',-922001,'awayTeamId',-922002);
  binding:=jsonb_set(binding,array[key],case key when 'matchId'then '-920000'::jsonb when 'roundId'then '-919001'::jsonb else '-918000'::jsonb end);
  perform pg_temp.reject(format('insert into private_baden_history.prepared values(-922000,repeat(''a'',64),%L,-922003)',jsonb_build_array(binding)::text),'Baden state references FCF');
 end loop;
end$$;
select pg_temp.reject($q$insert into private_baden_history.prepared values(-922000,repeat('a',64),'[{}]',-922003)$q$,'invalid Baden prepared binding');
select private_fcf_six_target_release.require(pg_temp.capture()->>'dependencySnapshotText'=p->>'dependencySnapshotText','all failed mutation probes rolled back')from empty_baseline;
select 'PASS unknown root/private FK, non-FK, shape, direct and JSON reference corruption hold and roll back';

insert into private_baden_history.catalog values(true,'{"TEST_ONLY":true}',repeat('a',64));
insert into private_baden_history.prepared values(-922000,repeat('a',64),'[{"sourceCompetitionId":"TEST","sourceMatchId":"TEST","fixture":{"TEST_ONLY":true},"matchId":-922004,"roundId":-922003,"homeTeamId":-922001,"awayTeamId":-922002}]',-922003);
insert into private_baden_history.club_bindings values(-922000,'TEST','2026/27','TEST','TEST',-922001);
create temporary table unrelated as select jsonb_build_object('catalog',(select to_jsonb(c)from private_baden_history.catalog c),'prepared',(select to_jsonb(bp)from private_baden_history.prepared bp),'clubs',(select to_jsonb(b)from private_baden_history.club_bindings b))rows,pg_temp.capture()p;
select private_fcf_six_target_release.require((p->>'dependencySnapshotText')::jsonb#>>'{relations,private_baden_history.catalog,count}'='1'and(p->>'dependencySnapshotText')::jsonb#>>'{relations,private_baden_history.prepared,count}'='1'and(p->>'dependencySnapshotText')::jsonb#>>'{relations,private_baden_history.club_bindings,count}'='1'and p#>>'{native,dependencies,competitionUserRows}'='0','all unrelated Baden rows protected, not user activity')from unrelated;
select private_fcf_six_target_release.require(rows=jsonb_build_object('catalog',(select to_jsonb(c)from private_baden_history.catalog c),'prepared',(select to_jsonb(bp)from private_baden_history.prepared bp),'clubs',(select to_jsonb(b)from private_baden_history.club_bindings b))and p->>'dependencySnapshotText'=pg_temp.capture()->>'dependencySnapshotText','stable immutable untargeted Baden afterimages')from unrelated;
select 'PASS all three unrelated Baden tables preserved in full row hashes and zero user counts';
select 'BADEN_FCF_PROJECTION_COMPAT_PASS';
