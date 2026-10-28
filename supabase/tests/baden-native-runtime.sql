-- TEST ONLY; synthetic catalog/native setup is the existing Task 2 fixture.
-- The dedicated harness wraps setup + both forward migrations in BEGIN/ROLLBACK.
do $$
declare cid bigint;mid bigint;marker bigint;rid bigint;tid bigint;pid bigint;v jsonb;after_import jsonb;mutation text;accepted boolean;owner uuid;phase_ok boolean;
begin
 select id into strict cid from competitions where slug='de-verbandsliga-baden';
 v:=public.get_fussball_historical_runtime(cid);
 if v->>'kind'<>'baden-bound-installed-runtime' or v->>'registrationEligible'<>'false' or v->>'activationEligible'<>'false' or jsonb_array_length(v->'bindings')<>5 or jsonb_array_length(v#>'{history,markers}')<>3 then raise exception 'TEST: complete bound runtime failed';end if;
 select m.id,m.round_id,m.home_team_id into strict mid,rid,tid from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.zapisnik_id='de-fussball-'||repeat('C',32);
 select min(id)into pid from players where competition_id<>cid;
 -- Ordinary imports are expected to populate precisely these rows. This must
 -- not accidentally invoke the COLD getter's empty-target predicate.
 update matches set imported_at=clock_timestamp()where id=mid;
 insert into appearances(id,match_id,player_id,team_id)overriding system value values((select coalesce(max(id),0)+100 from appearances),mid,pid,tid);
 insert into goals(id,match_id,team_id)overriding system value values((select coalesce(max(id),0)+100 from goals),mid,tid);
 insert into player_scores(round_id,player_id,points)values(rid,pid,7);
 insert into players(id,competition_id,team_id,first_name,last_name)overriding system value values((select max(id)+100 from players),cid,tid,'TEST ONLY','Bound runtime');
 after_import:=public.get_fussball_historical_runtime(cid);
 if after_import<>v then raise exception 'TEST: ordinary imports changed immutable runtime binding';end if;
 accepted:=false;begin perform public.get_fussball_historical_preparation(cid);accepted:=true;exception when others then null;end;
 if accepted then raise exception 'TEST: bound runtime accidentally weakened COLD getter';end if;
 select m.id into strict marker from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.zapisnik_id='de-fussball-02TNBSVDG0000000VS5489BUVSSD35NB';
 foreach mutation in array array['body','url','date','phase','round','score','imported','appearance','goal','card']loop
  accepted:=false;
  begin
   case mutation
    when 'body'then update private_historical_statistics.markers set fixture=fixture||'{"sourceRound":999}'::jsonb where competition_id=cid;
    when 'url'then update matches set source_url='https://www.fussball.de/spiel/-/spiel/'||repeat('Z',32)where id=marker;
    when 'date'then update matches set played_on=played_on+1 where id=marker;
    when 'phase'then update matches set source_phase='TEST ONLY FOREIGN PHASE'where id=marker;
    when 'round'then update matches set source_round=999 where id=marker;
    when 'score'then update matches set home_goals=0,away_goals=3 where id=marker;
    when 'imported'then update matches set imported_at=clock_timestamp()where id=marker;
    when 'appearance'then insert into appearances(id,match_id,player_id,team_id)overriding system value values((select max(id)+100 from appearances),marker,pid,tid);
    when 'goal'then insert into goals(id,match_id,team_id)overriding system value values((select max(id)+100 from goals),marker,tid);
    when 'card'then insert into private_fussball.card_reports(id,competition_id,match_id,source_code,revision_sha256,envelope,candidates)overriding system value values((select coalesce(max(id),0)+100 from private_fussball.card_reports),cid,marker,'02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26',repeat('f',64),'{}','[]');
   end case;
   perform public.get_fussball_historical_runtime(cid);accepted:=true;
   raise exception 'TEST_ONLY_ROLLBACK_ACCEPTED'using errcode='P0002';
  exception when sqlstate 'P0002'then null;when others then raise notice 'BADEN_RUNTIME_REFUSED %: %',mutation,sqlerrm;end;
  if accepted then raise exception 'TEST: immutable runtime drift accepted: %',mutation;end if;
  if public.get_fussball_historical_runtime(cid)<>after_import then raise exception 'TEST: runtime drift rollback leaked: %',mutation;end if;
 end loop;
 -- Exercise active/users only if the existing production guards permit this
 -- synthetic fixture. A refused fixture is an explicit coverage gap; guards are
 -- never disabled or replaced to manufacture a successful activation.
 phase_ok:=false;
 begin update competitions set active=true where id=cid;perform public.get_fussball_historical_runtime(cid);phase_ok:=true;raise exception 'TEST_ONLY_ROLLBACK_ACCEPTED'using errcode='P0002';
 exception when sqlstate 'P0002'then null;when others then raise notice 'BADEN_RUNTIME_ACTIVE_FIXTURE_GAP: %',sqlerrm;end;
 if phase_ok then raise notice 'BADEN_RUNTIME_ACTIVE_FIXTURE_PASS';end if;
 select min(id::text)::uuid into owner from profiles;
 phase_ok:=false;
 begin
  if owner is null then raise exception 'TEST ONLY clone has no profile';end if;
  insert into fantasy_teams(id,competition_id,owner_id,name)overriding system value values((select coalesce(max(id),0)+100 from fantasy_teams),cid,owner,'TEST ONLY bound runtime');
  perform public.get_fussball_historical_runtime(cid);phase_ok:=true;raise exception 'TEST_ONLY_ROLLBACK_ACCEPTED'using errcode='P0002';
 exception when sqlstate 'P0002'then null;when others then raise notice 'BADEN_RUNTIME_USERS_FIXTURE_GAP: %',sqlerrm;end;
 if phase_ok then raise notice 'BADEN_RUNTIME_USERS_FIXTURE_PASS';end if;
 if public.get_fussball_historical_runtime(cid)<>after_import then raise exception 'TEST: phase rollback changed bound inventory';end if;
end$$;
select 'BADEN_RUNTIME_BOUND_ORDINARY_AND_DRIFT_PASS';
