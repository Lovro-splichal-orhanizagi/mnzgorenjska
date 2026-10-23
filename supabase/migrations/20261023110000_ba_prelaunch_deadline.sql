-- The 23 Oct NFSBiH capture confirms the first official kickoff is 20:00
-- Ljubljana. For this inactive, empty prelaunch league only, use a two-hour
-- lock and replace the default six-hour deadline with a verified future cutoff.
create schema private_ba_prelaunch_deadline;
revoke all on schema private_ba_prelaunch_deadline from public,anon,authenticated,service_role;

create table private_ba_prelaunch_deadline.adjustments(
 slug text primary key,
 source_proof jsonb not null,
 before_config jsonb not null,
 after_config jsonb not null,
 before_sha256 text not null,
 after_sha256 text not null,
 recorded_at timestamptz not null default clock_timestamp()
);
revoke all on private_ba_prelaunch_deadline.adjustments from public,anon,authenticated,service_role;

create function private_ba_prelaunch_deadline.protect_receipt() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin raise exception 'BA_PRELAUNCH_DEADLINE: immutable audit receipt';end$$;
create trigger ba_prelaunch_deadline_receipt_immutable
 before update or delete on private_ba_prelaunch_deadline.adjustments
 for each row execute function private_ba_prelaunch_deadline.protect_receipt();

create function private_ba_prelaunch_deadline.apply(p_clock timestamptz default clock_timestamp())
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c competitions%rowtype;r rounds%rowtype;proof jsonb;before_image jsonb;after_image jsonb;after_comp jsonb;after_round jsonb;changed int;
begin
 if p_clock is null then return jsonb_build_object('applied',false,'reason','explicit clock required');end if;
 lock table countries,competitions,rounds,teams,matches,appearances,goals,players,player_scores,tocke_krogov,
  fantasy_teams,fantasy_roster,fantasy_lineups,fantasy_transfers,fantasy_chips,
  position_votes,position_votes_deleted,assist_votes,assist_votes_deleted,
  private_historical_statistics.installed_policies,private_historical_statistics.markers,
  private_reviewed_existing_history.cleanup_receipts,private_reviewed_existing_history.price_attempts,private_reviewed_existing_history.price_receipts in share row exclusive mode;
 select * into c from competitions where id=998 for update;
 select * into r from rounds where id=35415 and competition_id=998 for update;
 if c.id is null or r.id is null then return jsonb_build_object('applied',false,'reason','exact native target not present');end if;
 if exists(select 1 from private_ba_prelaunch_deadline.adjustments where slug='ba-wwin-liga-bih') then return jsonb_build_object('applied',false,'reason','one-time adjustment already recorded');end if;

 proof:='{"capturedAt":"2026-10-23T11:58:56.879Z","url":"https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223","status":200,"rawSha256":"46bfd442846cb92162e9c24e105f72c0e2f25b8c37775bcb0d71200fe810ba84","season":"2026/27","fixtures":[{"round":11,"id":"54152324","date":"2026-10-25","kickoff":"20:00","home":"FK VELEŽ (Mostar)","away":"BSK","score":null},{"round":11,"id":"54152325","date":"2026-10-25","kickoff":"17:30","home":"FK BORAC (Banja Luka)","away":"FK SLOGA DOBOJ","score":null},{"round":11,"id":"54152326","date":"2026-10-24","kickoff":"16:00","home":"NK ŠIROKI BRIJEG","away":"NK ČELIK","score":null},{"round":11,"id":"54152327","date":"2026-10-23","kickoff":"20:00","home":"HŠK ZRINJSKI","away":"FK RADNIK (Bijeljina)","score":null},{"round":11,"id":"54152328","date":"2026-10-24","kickoff":"19:46","home":"FK SARAJEVO","away":"FK ŽELJEZNIČAR","score":null}],"earliestKickoff":"2026-10-23T18:00:00Z"}'::jsonb;

 if c.slug is distinct from 'ba-wwin-liga-bih' or c.source is distinct from 'nfsbih'
   or c.source_league_code is distinct from 'wwin-liga-bih/54152223' or c.source_policy is not null
   or c.active is distinct from false or c.sezona_koledarska is distinct from false or c.rok_pomak_ur is distinct from 6
   or not exists(select 1 from countries where id=c.country_id and code='BA')
   or r.season is distinct from '2026/27' or r.number is distinct from 11 or r.played_on is distinct from date '2026-10-23'
   or r.deadline_at is distinct from timestamptz '2026-10-23 12:00:00+00'
   or p_clock >= timestamptz '2026-10-23 16:00:00+00'
   or (r.lineups_locked_at is not null and r.lineups_locked_at<r.deadline_at)
   or r.voting_opens_at is not null or r.voting_closes_at is not null then
  return jsonb_build_object('applied',false,'reason','native competition, round, or future cutoff differs');
 end if;
 if exists(select 1 from private_historical_statistics.installed_policies where competition_id=c.id)
   or exists(select 1 from private_historical_statistics.markers where competition_id=c.id)
   or exists(select 1 from private_reviewed_existing_history.cleanup_receipts where slug=c.slug)
   or exists(select 1 from private_reviewed_existing_history.price_attempts where slug=c.slug)
   or exists(select 1 from private_reviewed_existing_history.price_receipts where slug=c.slug)
   then return jsonb_build_object('applied',false,'reason','history cleanup or pricing already started');end if;

 if (select count(*) from matches where round_id=r.id)<>5
   or exists(select 1 from (values
    (576419::bigint,'2026-10-25'::date,10879::bigint,10871::bigint),
    (576420::bigint,'2026-10-25'::date,10878::bigint,10877::bigint),
    (576421::bigint,'2026-10-24'::date,10876::bigint,10875::bigint),
    (576422::bigint,'2026-10-23'::date,10874::bigint,10873::bigint),
    (576423::bigint,'2026-10-24'::date,10872::bigint,10870::bigint)
   ) expected(id,day,home_id,away_id) left join matches m on m.id=expected.id
    where m.id is null or m.round_id<>r.id or m.played_on is distinct from expected.day
      or m.home_team_id is distinct from expected.home_id or m.away_team_id is distinct from expected.away_id
      or m.home_goals is distinct from 0 or m.away_goals is distinct from 0 or m.imported_at is not null
      or m.zapisnik_id is not null or m.kontumacija or m.vir_brez_izida or m.source_phase is not null or m.source_round is not null
      or m.source_url is distinct from 'https://www.nfsbih.ba/takmicenja/nogomet-muskarci/wwin-liga-bih?view=fixtures&id=54152223'
      or m.statistics_status is distinct from 'available' or m.statistics_reason is not null or m.import_warnings is distinct from array[]::text[])
   or exists(select 1 from matches m join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id
     where m.round_id=r.id and (h.country_id is distinct from c.country_id or a.country_id is distinct from c.country_id))
   or exists(select 1 from (values (10879::bigint,'FK VELEŽ (Mostar)'),(10871::bigint,'BSK'),(10878::bigint,'FK BORAC (Banja Luka)'),(10877::bigint,'FK SLOGA DOBOJ'),(10876::bigint,'NK ŠIROKI BRIJEG'),(10875::bigint,'NK ČELIK'),(10874::bigint,'HŠK ZRINJSKI'),(10873::bigint,'FK RADNIK (Bijeljina)'),(10872::bigint,'FK SARAJEVO'),(10870::bigint,'FK ŽELJEZNIČAR')) expected(id,name)
     left join teams t on t.id=expected.id where t.id is null or t.name is distinct from expected.name or t.country_id is distinct from c.country_id)
   then return jsonb_build_object('applied',false,'reason','exact five native fixtures differ from retained official capture');
 end if;

 if exists(select 1 from appearances where match_id in(select id from matches where round_id=r.id))
   or exists(select 1 from goals where match_id in(select id from matches where round_id=r.id))
   or exists(select 1 from player_scores where round_id=r.id)
   or exists(select 1 from tocke_krogov where round_id=r.id)
   or exists(select 1 from fantasy_teams where competition_id=c.id)
   or exists(select 1 from fantasy_roster fr join players p on p.id=fr.player_id where p.competition_id=c.id)
   or exists(select 1 from fantasy_lineups where round_id in(select id from rounds where competition_id=c.id))
   or exists(select 1 from fantasy_transfers where round_id in(select id from rounds where competition_id=c.id))
   or exists(select 1 from fantasy_chips where round_id in(select id from rounds where competition_id=c.id))
   or exists(select 1 from position_votes v join players p on p.id=v.player_id where p.competition_id=c.id)
   or exists(select 1 from position_votes_deleted v join players p on p.id=v.player_id where p.competition_id=c.id)
   or exists(select 1 from assist_votes v join goals g on g.id=v.goal_id join matches m on m.id=g.match_id where m.round_id in(select id from rounds where competition_id=c.id))
   or exists(select 1 from assist_votes_deleted v join goals g on g.id=v.goal_id join matches m on m.id=g.match_id where m.round_id in(select id from rounds where competition_id=c.id))
   then return jsonb_build_object('applied',false,'reason','user activity, result, or score snapshot exists');
 end if;

 before_image:=jsonb_build_object('competition',to_jsonb(c),'round',to_jsonb(r),
   'fixtures',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from matches m where m.round_id=r.id));
 update competitions set rok_pomak_ur=2 where id=c.id and not active and rok_pomak_ur=6;
 get diagnostics changed=row_count;
 if changed<>1 then return jsonb_build_object('applied',false,'reason','competition config raced');end if;
 update rounds set deadline_at=timestamptz '2026-10-23 16:00:00+00',lineups_locked_at=null where id=r.id and competition_id=c.id and deadline_at=timestamptz '2026-10-23 12:00:00+00';
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'BA_PRELAUNCH_DEADLINE: round changed during guarded update';end if;
 select to_jsonb(x) into after_comp from competitions x where x.id=998;
 select to_jsonb(x) into after_round from rounds x where x.id=35415;
 after_image:=jsonb_build_object('competition',after_comp,'round',after_round,
   'fixtures',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from matches m where m.round_id=r.id));
 if ((before_image->'competition')-'rok_pomak_ur'::text) is distinct from (after_comp-'rok_pomak_ur'::text)
   or ((before_image->'round')-'deadline_at'::text-'lineups_locked_at'::text) is distinct from (after_round-'deadline_at'::text-'lineups_locked_at'::text)
   or before_image->'fixtures' is distinct from after_image->'fixtures'
   then raise exception 'BA_PRELAUNCH_DEADLINE: unexpected rows changed during guarded configuration';end if;
 insert into private_ba_prelaunch_deadline.adjustments(slug,source_proof,before_config,after_config,before_sha256,after_sha256)
 values('ba-wwin-liga-bih',proof,before_image,after_image,
   encode(sha256(convert_to(before_image::text,'UTF8')),'hex'),encode(sha256(convert_to(after_image::text,'UTF8')),'hex'));
 return jsonb_build_object('applied',true,'slug','ba-wwin-liga-bih','oldOffsetHours',6,'newOffsetHours',2,
   'oldDeadline','2026-10-23T12:00:00Z','newDeadline','2026-10-23T16:00:00Z','sourceProofSha256',proof->>'rawSha256');
end$$;
revoke all on function private_ba_prelaunch_deadline.apply(timestamptz) from public,anon,authenticated,service_role;

create function private_ba_prelaunch_deadline.assert_migration_applied_if_populated(p_outcome jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_outcome->>'applied'='true'
   or exists(select 1 from private_ba_prelaunch_deadline.adjustments where slug='ba-wwin-liga-bih') then return;end if;
 if exists(select 1 from competitions c where c.id=998 and c.slug='ba-wwin-liga-bih' and c.source='nfsbih'
   and c.source_league_code='wwin-liga-bih/54152223' and exists(select 1 from rounds r where r.competition_id=c.id))
   then raise exception 'BA_PRELAUNCH_DEADLINE: populated native target was not adjusted: %',coalesce(p_outcome->>'reason','unknown');end if;
end$$;
revoke all on function private_ba_prelaunch_deadline.assert_migration_applied_if_populated(jsonb) from public,anon,authenticated,service_role;

do $$declare outcome jsonb;begin outcome:=private_ba_prelaunch_deadline.apply(clock_timestamp());perform private_ba_prelaunch_deadline.assert_migration_applied_if_populated(outcome);raise notice 'BA prelaunch deadline adjustment: %',outcome;end$$;
