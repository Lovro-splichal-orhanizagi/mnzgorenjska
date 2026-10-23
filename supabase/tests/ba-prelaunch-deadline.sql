begin;
do $$declare c competitions%rowtype;outcome jsonb;vid bigint;pid bigint;receipt jsonb;expected_before jsonb;begin
 select * into c from competitions where id=998;
 if exists(select 1 from private_ba_prelaunch_deadline.adjustments where slug='ba-wwin-liga-bih') then
  select to_jsonb(a) into receipt from private_ba_prelaunch_deadline.adjustments a where slug='ba-wwin-liga-bih';
  if receipt#>>'{source_proof,rawSha256}'<>'46bfd442846cb92162e9c24e105f72c0e2f25b8c37775bcb0d71200fe810ba84'
    or receipt#>>'{after_config,round,deadline_at}' not like '2026-10-23T16:00:00%'
    or receipt#>>'{after_config,competition,rok_pomak_ur}'<>'2'
    then raise exception 'BA_DEADLINE_TEST: existing exact adjustment receipt is corrupt';end if;
  raise notice 'BA_DEADLINE_TEST: migration already applied exact native adjustment; seed-specific branch skipped';
  return;
 end if;
 if c.id is null then raise exception 'BA_DEADLINE_TEST: canonical inactive BiH competition row missing';end if;
 if exists(select 1 from rounds where id=35415) or exists(select 1 from matches where id between 576419 and 576423)
   or exists(select 1 from teams where id between 10870 and 10879)
   or exists(select 1 from players where competition_id=998) or exists(select 1 from fantasy_teams where competition_id=998)
   then raise exception 'BA_DEADLINE_TEST: disposable target fixture IDs are occupied';end if;
 update competitions set slug='BA-DEADLINE-DISPLACED-'||id where slug='ba-wwin-liga-bih' and id<>998;
 update competitions set slug='ba-wwin-liga-bih',country_id=(select id from countries where code='BA'),source='nfsbih',source_league_code='wwin-liga-bih/54152223',source_policy=null,active=false,sezona_koledarska=false,rok_pomak_ur=6 where id=998;
 insert into teams(id,name,short_name,country_id) overriding system value values
  (10870,'FK ŽELJEZNIČAR','FK ŽELJEZNIČAR',(select id from countries where code='BA')),
  (10871,'BSK','BSK',(select id from countries where code='BA')),
  (10872,'FK SARAJEVO','FK SARAJEVO',(select id from countries where code='BA')),
  (10873,'FK RADNIK (Bijeljina)','FK RADNIK (Bijeljina)',(select id from countries where code='BA')),
  (10874,'HŠK ZRINJSKI','HŠK ZRINJSKI',(select id from countries where code='BA')),
  (10875,'NK ČELIK','NK ČELIK',(select id from countries where code='BA')),
  (10876,'NK ŠIROKI BRIJEG','NK ŠIROKI BRIJEG',(select id from countries where code='BA')),
  (10877,'FK SLOGA DOBOJ','FK SLOGA DOBOJ',(select id from countries where code='BA')),
  (10878,'FK BORAC (Banja Luka)','FK BORAC (Banja Luka)',(select id from countries where code='BA')),
  (10879,'FK VELEŽ (Mostar)','FK VELEŽ (Mostar)',(select id from countries where code='BA'));
 insert into rounds(id,competition_id,season,number,played_on,deadline_at,lineups_locked_at,voting_opens_at,voting_closes_at) overriding system value
  values(35415,998,'2026/27',11,'2026-10-23','2026-10-23 12:00:00+00','2026-10-23 12:00:00+00',null,null);
 insert into matches(id,round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,source_url,imported_at,kontumacija,vir_brez_izida,zapisnik_id,source_phase,source_round,statistics_status,statistics_reason,import_warnings) overriding system value values
  (576419,35415,10879,10871,0,0,'2026-10-25','https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223',null,false,false,null,null,null,'available',null,array[]::text[]),
  (576420,35415,10878,10877,0,0,'2026-10-25','https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223',null,false,false,null,null,null,'available',null,array[]::text[]),
  (576421,35415,10876,10875,0,0,'2026-10-24','https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223',null,false,false,null,null,null,'available',null,array[]::text[]),
  (576422,35415,10874,10873,0,0,'2026-10-23','https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223',null,false,false,null,null,null,'available',null,array[]::text[]),
  (576423,35415,10872,10870,0,0,'2026-10-24','https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223',null,false,false,null,null,null,'available',null,array[]::text[]);
 outcome:=private_ba_prelaunch_deadline.apply('2026-10-23 16:00:00+00');
 if outcome->>'applied'<>'false' then raise exception 'BA_DEADLINE_TEST: expired cutoff unexpectedly applied';end if;
 if (select rok_pomak_ur from competitions where id=998)<>6 or (select deadline_at from rounds where id=35415)<>'2026-10-23 12:00:00+00'::timestamptz then raise exception 'BA_DEADLINE_TEST: expired attempt changed rows';end if;
 outcome:=private_ba_prelaunch_deadline.apply(null);
 if outcome->>'applied'<>'false' or (select rok_pomak_ur from competitions where id=998)<>6 or (select deadline_at from rounds where id=35415)<>'2026-10-23 12:00:00+00'::timestamptz then raise exception 'BA_DEADLINE_TEST: null clock did not fail closed';end if;

 update rounds set lineups_locked_at='2026-10-23 11:59:00+00' where id=35415;
 outcome:=private_ba_prelaunch_deadline.apply('2026-10-23 11:58:56+00');
 if outcome->>'applied'<>'false' or (select rok_pomak_ur from competitions where id=998)<>6
   or (select deadline_at from rounds where id=35415)<>'2026-10-23 12:00:00+00'::timestamptz
   or (select lineups_locked_at from rounds where id=35415)<>'2026-10-23 11:59:00+00'::timestamptz
   then raise exception 'BA_DEADLINE_TEST: pre-deadline manual lock was reopened';end if;
 begin perform private_ba_prelaunch_deadline.assert_migration_applied_if_populated(outcome);
 exception when others then if sqlerrm not like 'BA_PRELAUNCH_DEADLINE: populated native target was not adjusted%' then raise;end if;end;
 update rounds set lineups_locked_at='2026-10-23 12:00:00+00' where id=35415;

 update competitions set source_league_code='wrong/slug' where id=998;
 outcome:=private_ba_prelaunch_deadline.apply('2026-10-23 11:58:56+00');
 if outcome->>'applied'<>'false' then raise exception 'BA_DEADLINE_TEST: source tuple drift unexpectedly applied';end if;
 update competitions set source_league_code='wwin-liga-bih/54152223' where id=998;
 update matches set played_on='2026-10-22' where id=576422;
 outcome:=private_ba_prelaunch_deadline.apply('2026-10-23 11:58:56+00');
 if outcome->>'applied'<>'false' then raise exception 'BA_DEADLINE_TEST: fixture drift unexpectedly applied';end if;
 update matches set played_on='2026-10-23' where id=576422;

 insert into players(first_name,last_name,full_name,team_id,competition_id,active) values('Fixture','Vote','Fixture Vote',10870,998,true) returning id into pid;
 select coalesce(max(id),0)+1 into vid from position_votes_deleted;
 insert into position_votes_deleted(id,player_id,voter_id,position) values(vid,pid,null,'DEF');
 outcome:=private_ba_prelaunch_deadline.apply('2026-10-23 11:58:56+00');
 if outcome->>'applied'<>'false' then raise exception 'BA_DEADLINE_TEST: deleted user vote unexpectedly applied';end if;
 delete from position_votes_deleted where id=vid;
 delete from players where id=pid;

 select jsonb_build_object('competition',to_jsonb(comp_row),'round',to_jsonb(round_row),
   'fixtures',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from matches m where m.round_id=round_row.id)) into expected_before
  from competitions comp_row join rounds round_row on round_row.competition_id=comp_row.id where comp_row.id=998 and round_row.id=35415;
 outcome:=private_ba_prelaunch_deadline.apply('2026-10-23 11:58:56+00');
 if outcome->>'applied'<>'true' or outcome->>'newDeadline'<>'2026-10-23T16:00:00Z' then raise exception 'BA_DEADLINE_TEST: exact live prelaunch adjustment failed: %',outcome;end if;
 if (select rok_pomak_ur from competitions where id=998)<>2 or (select deadline_at from rounds where id=35415)<>'2026-10-23 16:00:00+00'::timestamptz or (select lineups_locked_at from rounds where id=35415) is not null then raise exception 'BA_DEADLINE_TEST: exact two-hour cutoff or safe prelaunch unlock missing';end if;
 select to_jsonb(a) into receipt from private_ba_prelaunch_deadline.adjustments a where slug='ba-wwin-liga-bih';
 if receipt#>>'{source_proof,rawSha256}'<>'46bfd442846cb92162e9c24e105f72c0e2f25b8c37775bcb0d71200fe810ba84'
   or receipt->'before_config' is distinct from expected_before
   or receipt#>'{before_config,fixtures}' is distinct from receipt#>'{after_config,fixtures}'
   or receipt#>>'{after_config,round,deadline_at}' not like '2026-10-23T16:00:00%'
   or receipt#>>'{after_config,competition,rok_pomak_ur}'<>'2'
   then raise exception 'BA_DEADLINE_TEST: immutable proof/config before-after audit mismatch';end if;
 if has_schema_privilege('service_role','private_ba_prelaunch_deadline','USAGE') or has_function_privilege('service_role','private_ba_prelaunch_deadline.apply(timestamp with time zone)','EXECUTE')
   or has_function_privilege('anon','private_ba_prelaunch_deadline.apply(timestamp with time zone)','EXECUTE') or has_function_privilege('authenticated','private_ba_prelaunch_deadline.apply(timestamp with time zone)','EXECUTE')
   then raise exception 'BA_DEADLINE_TEST: private writer ACL is too broad';end if;
 begin delete from private_ba_prelaunch_deadline.adjustments where slug='ba-wwin-liga-bih';
 exception when others then if sqlerrm not like 'BA_PRELAUNCH_DEADLINE: immutable audit receipt' then raise;end if;end;
 if (select count(*) from private_ba_prelaunch_deadline.adjustments where slug='ba-wwin-liga-bih')<>1 then raise exception 'BA_DEADLINE_TEST: immutable audit delete unexpectedly succeeded';end if;
end$$;
rollback;
