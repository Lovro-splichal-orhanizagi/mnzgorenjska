-- Entire fixture and owner-only synthetic approval roll back. Operational SQL
-- has only the immutable29-row reviewed approval installed by the migration.
create temporary table repair_ids as
 select distinct p.id from players p join appearances ap on ap.player_id=p.id
 join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id
 where r.competition_id=(select id from competitions where slug=current_setting('slff.test_slug'))and r.season='2026/27'
 order by p.id limit 29;
update players set active=false where id in(select id from repair_ids);
create temporary table repair_plan(raw text);
insert into repair_plan select jsonb_build_object('version',1,'id','de-suedwest-current-reactivation-20261018',
 'competition',(select to_jsonb(c)from competitions c where c.slug=current_setting('slff.test_slug')),'season','2026/27',
 'statisticsPolicy',raw::jsonb->'statisticsPolicy',
 'observationSha256',encode(sha256(convert_to(private_dfb_reactivation.canonical_json(private_dfb_reactivation.observations(raw::jsonb)),'UTF8')),'hex'),
 'captures',(select jsonb_agg(jsonb_build_object('season',s->'season','code',s->'code','capturedAt',s->'capturedAt','documentsSha256',s->'documentsSha256','capture',s#>'{lineage,capture}')order by s->>'season')from jsonb_array_elements(raw::jsonb->'seasons')s),
 'players',(select jsonb_agg(to_jsonb(p)order by p.id)from players p join repair_ids i on i.id=p.id),
 'participants',(select jsonb_agg(jsonb_build_object('playerId',p.id,'native',to_jsonb(ap)||jsonb_build_object('season',r.season,'source_report',m.zapisnik_id,'round_number',r.number,'home_team_id',m.home_team_id,'away_team_id',m.away_team_id),'source',x)order by ap.id)
  from appearances ap join players p on p.id=ap.player_id join repair_ids i on i.id=p.id join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id
  join _dfb_expected e on e.id=m.zapisnik_id and e.season=r.season cross join lateral jsonb_array_elements(e.f->'appearances')x
  where r.season='2026/27'and x->>'name'=p.full_name and(x->>'side')::int=case when ap.team_id=m.home_team_id then 0 else 1 end))::text from de_manifest;
-- Owner-only test authority replacement: no service-role path can write this.
update private_dfb_reactivation.approval set plan_sha256=encode(sha256(convert_to(raw,'UTF8')),'hex'),plan=raw::jsonb from repair_plan;
grant select on repair_plan,de_manifest to service_role;
create function pg_temp.repair_call()returns jsonb language sql as $$
 select public.reconcile_dfb_current_players(m.raw,encode(sha256(convert_to(m.raw,'UTF8')),'hex'),p.raw,encode(sha256(convert_to(p.raw,'UTF8')),'hex'))from de_manifest m cross join repair_plan p
$$;
create function pg_temp.repair_reject(label text,mutation text,pattern text default 'DFB_REACTIVATION:%')returns void language plpgsql as $$
declare before_rows jsonb;before_receipts bigint;begin
 select jsonb_agg(to_jsonb(p)order by p.id)into before_rows from players p join repair_ids i on i.id=p.id;
 select count(*)into before_receipts from private_dfb_reactivation.receipts;
 begin
  execute mutation;
  begin perform pg_temp.repair_call();raise exception 'MUTANT ACCEPTED: %',label;
  exception when others then if sqlerrm not like pattern then raise;end if;end;
  raise exception using errcode='P9998',message='ROLLBACK_REPAIR_MUTATION';
 exception when sqlstate'P9998'then null;end;
 if before_rows is distinct from(select jsonb_agg(to_jsonb(p)order by p.id)from players p join repair_ids i on i.id=p.id)
  or before_receipts<>(select count(*)from private_dfb_reactivation.receipts)then raise exception 'repair mutation leaked player/success receipt';end if;
 raise notice 'PASS repair rejects % and retains before-state/no receipt',label;
end$$;
-- These owner-only alternate approvals deliberately contain one source-less
-- native player. They exercise eligibility after approval/before-image checks,
-- rather than merely failing a caller-supplied plan hash.
create function pg_temp.repair_replace_member(replacement bigint)returns void language plpgsql as $$
declare removed bigint;begin
 select min(id)into removed from repair_ids;
 update players set active=true where id=removed;
 update players set active=false,team_id=(select id from de_clubs where n=0)where id=replacement;
 update repair_plan set raw=jsonb_set(jsonb_set(raw::jsonb,'{players}',(
  select jsonb_agg(x order by(x->>'id')::bigint)from(
   select x from jsonb_array_elements(raw::jsonb->'players')x where(x->>'id')::bigint<>removed
   union all select to_jsonb(p)from players p where p.id=replacement)rows)),
  '{participants}',(select jsonb_agg(x order by(x#>>'{native,id}')::bigint)from jsonb_array_elements(raw::jsonb->'participants')x where(x->>'playerId')::bigint<>removed))::text;
 update private_dfb_reactivation.approval set plan_sha256=encode(sha256(convert_to(raw,'UTF8')),'hex'),plan=raw::jsonb from repair_plan;
end$$;
select pg_temp.repair_reject('current club membership without a played source appearance','select pg_temp.repair_replace_member(-924015)','DFB_REACTIVATION: complete reviewed native/source participant proof differs');
select pg_temp.repair_reject('archive-only participant moved into a current club','select pg_temp.repair_replace_member(-924360)','DFB_REACTIVATION: complete reviewed native/source participant proof differs');
create function pg_temp.repair_ambiguous_participant()returns void language plpgsql as $$
declare original appearances%rowtype;other_id bigint;begin
 select ap.* into original from appearances ap join repair_ids i on i.id=ap.player_id
 join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id
 where r.season='2026/27'and exists(select 1 from players p where p.team_id=ap.team_id
  and p.id not in(select id from repair_ids)and not exists(select 1 from appearances x where x.player_id=p.id))limit 1;
 select min(p.id)into other_id from players p where p.team_id=original.team_id
  and p.id not in(select id from repair_ids)and not exists(select 1 from appearances x where x.player_id=p.id);
 if other_id is null then raise exception 'ambiguity fixture missing';end if;
 update players set full_name=(select full_name from players where id=original.player_id)where id=other_id;
 insert into appearances(match_id,player_id,team_id,started,is_goalkeeper,shirt_number)
 values(original.match_id,other_id,original.team_id,original.started,original.is_goalkeeper,original.shirt_number);
end$$;
select pg_temp.repair_reject('two native identities for one exact source participant','select pg_temp.repair_ambiguous_participant()','DFB_REACTIVATION: missing/ambiguous exact source participant identity');
select pg_temp.repair_reject('mixed status','update players set active=true where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('identity drift','update players set full_name=full_name||'' changed''where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('price drift','update players set value=value+0.5 where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('role drift','update players set position=''MID''where id=(select min(id)from repair_ids)and position<>''MID''');
select pg_temp.repair_reject('withdrawal exclusion','update players set izstopil_at=now()where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('departure exclusion','update players set odsel_at=now()where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('privacy exclusion','update players set anonimiziran_razlog=''ugovor''where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('anonymized timestamp exclusion','update players set anonimiziran_at=now()where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('extra eligible participant','update players set active=false where id=(select min(ap.player_id)from appearances ap join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id where r.season=''2026/27''and r.competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and ap.player_id not in(select id from repair_ids))');
select pg_temp.repair_reject('changed immutable current minutes',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,fixtures,0,appearances,0,minutes_played}','89')::text$m$);
select pg_temp.repair_reject('wrong league target',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{slug}','"de-regionalliga-west"')::text$m$,'DE_RELEASE:%');
select pg_temp.repair_reject('changed historical policy',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{statisticsPolicy,sha256}',to_jsonb(repeat('0',64)))::text$m$,'DE_RELEASE:%');
select pg_temp.repair_reject('changed first fantasy anchor',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{statisticsPolicy,firstFantasyPlayedOn}',to_jsonb((current_date+4)::text))::text$m$,'DE_RELEASE:%');
select pg_temp.repair_reject('changed original clock',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,capturedAt}',to_jsonb((clock_timestamp()-interval'1 minute')::text))::text$m$,'DE_RELEASE:%');
select pg_temp.repair_reject('unapproved matching-hash plan',$m$update repair_plan set raw=(raw::jsonb||' {"extra":true}'::jsonb)::text$m$);
select pg_temp.repair_reject('duplicate plan key',$m$update repair_plan set raw=regexp_replace(raw,'}$',',"version":1}')$m$);
select pg_temp.repair_reject('duplicate execution key',$m$update de_manifest set raw=regexp_replace(raw,'}$',',"version":3}')$m$);
select pg_temp.repair_reject('missing native row','delete from players where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('current team drift','update players set team_id=(select min(id)from teams where id<>(select team_id from players where id=(select min(id)from repair_ids)))where id=(select min(id)from repair_ids)');
select pg_temp.repair_reject('unreviewed mutable execution key',$m$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,lineage,replay,extra}','true')::text$m$);
select pg_temp.repair_reject('expired original current capture',$m$update de_manifest set raw=jsonb_set(jsonb_set(raw::jsonb,'{seasons,1,capturedAt}',to_jsonb((clock_timestamp()-interval'13 hours')::text)),'{seasons,1,lineage,capture,capturedAt}',to_jsonb((clock_timestamp()-interval'13 hours')::text))::text$m$,'DE_RELEASE:%');
insert into auth.users(id,email)values('da000000-0000-4000-8000-000000000029','dfb-repair-fixture@example.invalid');
insert into profiles(id,display_name)values('da000000-0000-4000-8000-000000000029','DFB repair fixture')on conflict(id)do nothing;
select pg_temp.repair_reject('fantasy participation',$m$insert into fantasy_teams(owner_id,name,competition_id)select'da000000-0000-4000-8000-000000000029','DFB repair fixture',id from competitions where slug=current_setting('slff.test_slug')$m$);
do $$begin
 begin
  perform public.reconcile_dfb_current_players(m.raw,repeat('0',64),p.raw,encode(sha256(convert_to(p.raw,'UTF8')),'hex'))from de_manifest m cross join repair_plan p;
  raise exception'corrupt SHA accepted';
 exception when raise_exception then if sqlerrm not like'DFB_REACTIVATION:%'then raise;end if;end;
 raise notice'PASS repair refuses mismatching raw manifest SHA before writes';
end$$;
-- These pass repair eligibility and fail the actual full gate AFTER29 updates.
select pg_temp.repair_reject('late canonical result','update matches set home_goals=1 where id=-926010','DE_RELEASE:%');
select pg_temp.repair_reject('late future deadline','update rounds set deadline_at=deadline_at+interval''1 hour''where id=-925103','DE_RELEASE:%');
select pg_temp.repair_reject('late official GK position outside plan','update players set position=''MID''where id=(select min(p.id)from players p join appearances ap on ap.player_id=p.id join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id where r.season=''2026/27''and r.competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and ap.is_goalkeeper and p.id not in(select id from repair_ids))','DE_RELEASE:%');
select pg_temp.repair_reject('late expired candidate deadline','update rounds set deadline_at=now()-interval''1 minute''where id=-925103','DE_RELEASE:%');
select pg_temp.repair_reject('late legal15 pricing readiness','update players set value=15 where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and id not in(select id from repair_ids)','DE_RELEASE:%');
-- Permissions are tested using actual roles, not an ACL-stripped clone.
do $$begin
 if has_function_privilege('anon','public.reconcile_dfb_current_players(text,text,text,text)','EXECUTE')
  or has_function_privilege('authenticated','public.reconcile_dfb_current_players(text,text,text,text)','EXECUTE')
  or not has_function_privilege('service_role','public.reconcile_dfb_current_players(text,text,text,text)','EXECUTE')
  or has_table_privilege('service_role','private_dfb_reactivation.approval','UPDATE')then raise exception 'repair privileges differ';end if;
end$$;
set local role anon;
do $$begin begin perform public.reconcile_dfb_current_players('{}',repeat('0',64),'{}',repeat('0',64));raise exception'anon repair accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
set local role authenticated;
do $$begin begin perform public.reconcile_dfb_current_players('{}',repeat('0',64),'{}',repeat('0',64));raise exception'authenticated repair accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
set local role service_role;
do $$begin
 begin update private_dfb_reactivation.approval set plan=plan;raise exception'service approval mutation accepted';exception when insufficient_privilege then null;end;
 begin perform 1 from private_dfb_reactivation.receipts;raise exception'service private receipt read accepted';exception when insufficient_privilege then null;end;
 raise notice'PASS service cannot change private approval or read private receipts directly';
end$$;
select public.reconcile_dfb_current_players(m.raw,encode(sha256(convert_to(m.raw,'UTF8')),'hex'),p.raw,encode(sha256(convert_to(p.raw,'UTF8')),'hex'))->>'mode'fresh_mode from de_manifest m cross join repair_plan p;
reset role;
do $$declare r jsonb;begin
 select receipt into r from private_dfb_reactivation.receipts order by id desc limit 1;
 if r->>'mode'<>'fresh'or(r->>'updatedCount')::int<>29 or(select count(*)from players p join repair_ids i on i.id=p.id where p.active)<>29
  or r#>>'{nativePreflight,preverjeno}'<>'true'or r#>>'{nativePreflight,vklopljena}'<>'false'
  or exists(select 1 from competitions where slug=current_setting('slff.test_slug')and active)then raise exception'fresh repair failed';end if;
 if exists(select 1 from jsonb_array_elements(r->'before')b full join jsonb_array_elements(r->'after')a on a->>'id'=b->>'id'where(a-'active')is distinct from(b-'active'))then raise exception'non-active native player change';end if;
 raise notice'PASS actual service fresh29 active-only repair and full native preflight';
 r:=pg_temp.repair_call();
 if r->>'mode'<>'already-active'or(r->>'updatedCount')::int<>0 or r#>>'{nativePreflight,preverjeno}'<>'true'or(select count(*)from private_dfb_reactivation.receipts)<>2 then raise exception'idempotent repair failed';end if;
 raise notice'PASS actual all29-active replay reruns full native gate';
end$$;
select pg_temp.repair_reject('all-active replay still enforces late deadline','update rounds set deadline_at=deadline_at+interval''1 hour''where id=-925103','DE_RELEASE:%');
select pg_temp.repair_reject('all-active replay refuses a new inactive participant','update players set active=false where id=(select min(ap.player_id)from appearances ap join matches m on m.id=ap.match_id join rounds r on r.id=m.round_id where r.season=''2026/27''and r.competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and ap.player_id not in(select id from repair_ids))');
select pg_temp.repair_reject('active league','select pg_temp.de_check(true)');
rollback;
