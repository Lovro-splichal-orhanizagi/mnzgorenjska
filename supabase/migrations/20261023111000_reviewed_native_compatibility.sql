begin;

create table if not exists private_reviewed_existing_history.native_binding_audits(
 audit_id text primary key check(audit_id='ro-home-club-binding-v1'),
 provider text not null,
 source_club_id text not null,
 bound_team_id bigint not null,
 before_binding jsonb not null,
 after_binding jsonb not null,
 before_sha256 text not null check(before_sha256~'^[a-f0-9]{64}$'),
 after_sha256 text not null check(after_sha256~'^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(),
 check(before_binding->'bound_team_id'='null'::jsonb),
 check(after_binding->>'bound_team_id'='3016')
);
revoke all on table private_reviewed_existing_history.native_binding_audits from public,anon,authenticated,service_role;

create or replace function private_reviewed_existing_history.protect_native_binding_audit() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin raise exception 'REVIEWED_EXISTING: native binding audit is immutable';end$$;
revoke all on function private_reviewed_existing_history.protect_native_binding_audit() from public,anon,authenticated,service_role;
drop trigger if exists reviewed_existing_native_binding_audit_immutable on private_reviewed_existing_history.native_binding_audits;
create trigger reviewed_existing_native_binding_audit_immutable before update or delete on private_reviewed_existing_history.native_binding_audits for each row execute function private_reviewed_existing_history.protect_native_binding_audit();

create or replace function private_reviewed_existing_history.bind_ro_native_home_if_present() returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare b private_historical_statistics.source_club_bindings%rowtype;before_binding jsonb;after_binding jsonb;a private_reviewed_existing_history.native_binding_audits%rowtype;n int;c competitions%rowtype;m matches%rowtype;r rounds%rowtype;
begin
 select * into a from private_reviewed_existing_history.native_binding_audits where audit_id='ro-home-club-binding-v1';
 if found then
  select * into b from private_historical_statistics.source_club_bindings where provider='hlf' and source_club_id='a91ef983-185f-4a35-b5cc-6421c820bd97' and source_category_id='' and country_code='RO';
  perform private_reviewed_existing_history.require(b.provider is not null and b.bound_team_id=3016 and a.provider='hlf' and a.source_club_id=b.source_club_id and a.bound_team_id=3016 and a.after_binding=to_jsonb(b) and a.after_sha256=encode(sha256(convert_to(to_jsonb(b)::text,'UTF8')),'hex'),'existing native club binding audit and current row agree');
  return true;
 end if;
 select * into m from matches where id=133334;
 if not found then return false;end if;
 select * into c from competitions where id=497;
 select * into r from rounds where id=m.round_id;
 perform private_reviewed_existing_history.require(c.id=497 and c.slug='ro-liga3-s1' and c.source='hlf' and c.source_league_code='national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1' and c.source_policy is null and c.active is false and exists(select 1 from countries where id=c.country_id and code='RO'),'exact inactive Romanian source/code/country tuple required');
 perform private_reviewed_existing_history.require(m.round_id=10663 and r.id=10663 and r.competition_id=497 and r.season='2026/27' and r.number=1 and r.played_on='2026-08-29' and m.home_team_id=3016 and m.away_team_id=3017 and m.played_on='2026-08-29' and m.home_goals=2 and m.away_goals=1 and m.zapisnik_id='f43d55c1-6530-49dc-a02e-4d7e578d6205' and m.source_url='https://hailafotbal.ro/rezultate/national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1/etapa-1/club-sportiv-usv-csm-iasi-2020-kse-targu-secuiesc' and m.imported_at is not null and m.statistics_status='available' and m.statistics_reason is null and not m.kontumacija and not m.vir_brez_izida and m.source_phase is null and m.source_round is null,'exact current Romanian native target header required');
 perform private_reviewed_existing_history.require((select count(*) from teams tm join countries country_row on country_row.id=tm.country_id where tm.id=3016 and tm.name='Club Sportiv USV-CSM Iași 2020' and country_row.code='RO')=1 and (select count(*) from teams tm join countries country_row on country_row.id=tm.country_id where tm.id=3017 and tm.name='KSE Târgu Secuiesc' and country_row.code='RO')=1,'exact native Romanian home/away club rows required');
 perform private_reviewed_existing_history.require(exists(select 1 from private_historical_statistics.policies where id='ro-liga3-s1-historical-unavailable-2026-10-23-v1' and policy_sha256='b6686671855dfa9a6f96fa8cf67d530aa4fc4208f859e783929cb36140169329' and document->>'sourcePolicy'='reviewed-existing-history-20261023-v1' and document->>'provider'='hlf' and document->>'competitionSlug'='ro-liga3-s1' and document->>'sourceLeagueCode'='national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1' and exists(select 1 from jsonb_array_elements(document->'entries') entry where entry->>'sourceMatchId'='f43d55c1-6530-49dc-a02e-4d7e578d6205')),'exact immutable Romanian policy SHA/tuple required');
 perform private_reviewed_existing_history.require(not exists(select 1 from private_historical_statistics.installed_policies where competition_id=497) and not exists(select 1 from private_historical_statistics.markers where competition_id=497) and not exists(select 1 from private_reviewed_existing_history.cleanup_receipts where slug='ro-liga3-s1') and not exists(select 1 from private_reviewed_existing_history.price_attempts where slug='ro-liga3-s1') and not exists(select 1 from private_reviewed_existing_history.price_receipts where slug='ro-liga3-s1'),'Romanian target must remain prelaunch with no installed history or cleanup');
 select * into b from private_historical_statistics.source_club_bindings where provider='hlf' and source_club_id='a91ef983-185f-4a35-b5cc-6421c820bd97' and source_category_id='' and country_code='RO' for update;
 before_binding:=to_jsonb(b);
 perform private_reviewed_existing_history.require(b.provider='hlf' and b.source_club_id='a91ef983-185f-4a35-b5cc-6421c820bd97' and b.source_category_id='' and b.country_code='RO' and b.canonical_names=array['Club Sportiv USV-CSM Iaşi 2020'] and b.proofs='[{"sourceMatchId":"f43d55c1-6530-49dc-a02e-4d7e578d6205","sourceUrl":"https://hailafotbal.ro/rezultate/national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1/etapa-1","rawSha256":"2bbc7abd2cc90cd648bc63e142c3615602c5651e8f965b603a0ab0c350cda20e"}]'::jsonb and b.bound_team_id is null,'exact unbound Romanian source-club row required');
 perform private_reviewed_existing_history.require((select count(*) from teams tm join countries country_row on country_row.id=tm.country_id where tm.id=3016 and tm.name='Club Sportiv USV-CSM Iași 2020' and country_row.code='RO')=1,'exact native Romanian home club required');
 update private_historical_statistics.source_club_bindings set bound_team_id=3016 where provider='hlf' and source_club_id='a91ef983-185f-4a35-b5cc-6421c820bd97' and source_category_id='' and country_code='RO' and bound_team_id is null;
 get diagnostics n=row_count;perform private_reviewed_existing_history.require(n=1,'one-time Romanian source-club binding update required');
 select to_jsonb(binding_row) into after_binding from private_historical_statistics.source_club_bindings binding_row where provider='hlf' and source_club_id='a91ef983-185f-4a35-b5cc-6421c820bd97' and source_category_id='' and country_code='RO';
 perform private_reviewed_existing_history.require(after_binding->>'bound_team_id'='3016' and (after_binding-'bound_team_id')=(before_binding-'bound_team_id'),'Romanian native binding changed only bound_team_id');
 insert into private_reviewed_existing_history.native_binding_audits(audit_id,provider,source_club_id,bound_team_id,before_binding,after_binding,before_sha256,after_sha256)
  values('ro-home-club-binding-v1','hlf','a91ef983-185f-4a35-b5cc-6421c820bd97',3016,before_binding,after_binding,encode(sha256(convert_to(before_binding::text,'UTF8')),'hex'),encode(sha256(convert_to(after_binding::text,'UTF8')),'hex'));
 return true;
end$$;
revoke all on function private_reviewed_existing_history.bind_ro_native_home_if_present() from public,anon,authenticated,service_role;
do $$begin perform private_reviewed_existing_history.bind_ro_native_home_if_present();end$$;

create or replace function private_reviewed_existing_history.exact_ro_native_source_url(p_cid bigint,p_slug text,p_match_id bigint,p_source_match_id text,p_source_url text) returns boolean language sql immutable set search_path=public,pg_temp as $$
 select p_cid=497 and p_slug='ro-liga3-s1' and p_match_id=133334 and p_source_match_id='f43d55c1-6530-49dc-a02e-4d7e578d6205' and p_source_url='https://hailafotbal.ro/rezultate/national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1/etapa-1/club-sportiv-usv-csm-iasi-2020-kse-targu-secuiesc'
$$;

create or replace function private_reviewed_existing_history.exact_npl_unattributed_goal(p_cid bigint,p_slug text,p_policy_id text,p_policy_sha text,p_source_match_id text,p_match_id bigint,p_goal_id bigint,p_team_id bigint,p_minute int,p_scorer_id bigint,p_is_penalty boolean,p_is_own_goal boolean) returns boolean language sql immutable set search_path=public,pg_temp as $$
 select coalesce(p_cid=979 and p_slug='gb-npl-midlands' and p_policy_id='gb-npl-midlands-historical-unavailable-2026-10-23-v1' and p_policy_sha='5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924' and p_source_match_id='6896abc31c6f4c56212c7ac5' and p_match_id=561922 and p_scorer_id is null and p_is_penalty is false and p_is_own_goal is false and ((p_goal_id=652686 and p_team_id=10862 and p_minute=75) or (p_goal_id=652688 and p_team_id=10847 and p_minute=33)),false)
$$;

create or replace function private_reviewed_existing_history.active_goal_identity_valid(p_cid bigint) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not exists(
  select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id
  where r.competition_id=p_cid and m.imported_at is not null and
   (g.team_id is null or g.team_id not in(m.home_team_id,m.away_team_id) or g.minute is null or g.minute<0 or g.minute>130 or
    (g.scorer_id is not null and (not exists(select 1 from appearances a where a.match_id=m.id and a.player_id=g.scorer_id and a.team_id=g.team_id) or not exists(select 1 from players pl where pl.id=g.scorer_id and pl.competition_id=p_cid))))
 )
$$;

revoke all on function private_reviewed_existing_history.exact_ro_native_source_url(bigint,text,bigint,text,text),private_reviewed_existing_history.exact_npl_unattributed_goal(bigint,text,text,text,text,bigint,bigint,bigint,int,bigint,boolean,boolean),private_reviewed_existing_history.active_goal_identity_valid(bigint) from public,anon,authenticated,service_role;

do $$
declare d text;changed text;old_goal text;new_goal text;
begin
 select pg_get_functiondef('private_reviewed_existing_history.check_targets(text,text)'::regprocedure) into d;
 changed:=replace(d,$old$m.source_url=e->>'sourceUrl'$old$,$new$(m.source_url=e->>'sourceUrl' or private_reviewed_existing_history.exact_ro_native_source_url(t.cid,t.slug,target_row.mid,target_row.source_match_id,m.source_url))$new$);
 if changed=d and position('exact_ro_native_source_url' in d)=0 then raise exception 'REVIEWED_EXISTING: Romanian native URL guard anchor drift';end if;
 d:=changed;
 old_goal:=$old$not exists(select 1 from goals g where g.match_id=target_row.mid and (g.team_id not in(target_row.home_id,target_row.away_id) or not exists(select 1 from appearances a where a.match_id=g.match_id and a.player_id=g.scorer_id and a.team_id=g.team_id)))$old$;
 new_goal:=$new$not exists(select 1 from goals g where g.match_id=target_row.mid and (g.team_id not in(target_row.home_id,target_row.away_id) or (g.scorer_id is null and not private_reviewed_existing_history.exact_npl_unattributed_goal(t.cid,t.slug,t.policy_id,t.policy_sha,target_row.source_match_id,target_row.mid,g.id,g.team_id,g.minute,g.scorer_id,g.is_penalty,g.is_own_goal)) or (g.scorer_id is not null and not exists(select 1 from appearances a where a.match_id=g.match_id and a.player_id=g.scorer_id and a.team_id=g.team_id))))$new$;
 changed:=replace(d,old_goal,new_goal);
 if changed=d and position('exact_npl_unattributed_goal' in d)=0 then raise exception 'REVIEWED_EXISTING: NPL anonymous goal guard anchor drift';end if;
 if changed<>d then execute changed;end if;

 select pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure) into d;
 changed:=replace(d,$old$(m.source_url is not null and m.source_url is distinct from e->>'sourceUrl')$old$,$new$(m.source_url is not null and m.source_url is distinct from e->>'sourceUrl' and not private_reviewed_existing_history.exact_ro_native_source_url(c.id,c.slug,m.id,p_source_match_id,m.source_url))$new$);
 if changed=d and position('exact_ro_native_source_url' in d)=0 then raise exception 'REVIEWED_EXISTING: Romanian native URL cleanup anchor drift';end if;
 if changed<>d then execute changed;end if;

 select pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure) into d;
 old_goal:=$old$not exists(select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=t.cid and m.imported_at is not null and (g.team_id not in(m.home_team_id,m.away_team_id) or g.minute is null or g.minute<0 or g.minute>130 or not exists(select 1 from appearances a where a.match_id=m.id and a.player_id=g.scorer_id and a.team_id=g.team_id)))$old$;
 changed:=replace(d,old_goal,$new$private_reviewed_existing_history.active_goal_identity_valid(t.cid)$new$);
 if changed=d and position('active_goal_identity_valid' in d)=0 then raise exception 'REVIEWED_EXISTING: active goal identity anchor drift';end if;
 if changed<>d then execute changed;end if;
end$$;

commit;
