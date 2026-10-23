-- One-shot completion of the failed NPL price claim from run 39963835822.
-- The retained failed log SHA256 is 3cd01f8882bbc388e771dd328ac46f070c052468b54d232f0205bc371db82f7a.
-- It records 1,018 successful row updates and only three failed updates
-- (401885, 401972, 402068). Those rows already equal the script's unchanged
-- default 4.5/null price output. This migration never updates players; it only
-- records the existing one-use claim after the complete native vector and all
-- pricing prerequisites match the captured facts. Any drift aborts migration.
do $$
declare
 c public.competitions%rowtype;
 cleanup private_reviewed_existing_history.cleanup_receipts%rowtype;
 attempt private_reviewed_existing_history.price_attempts%rowtype;
 recorded private_reviewed_existing_history.price_receipts%rowtype;
 result jsonb;
 marker jsonb;
 max_minutes integer;
 expected_main constant text := 'ac1cc5a2dd363088a3e7f309cba67214ddcc5187';
 expected_policy constant text := '5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924';
 expected_cleanup constant text := 'b068d8e6a00c1926c9eebe31b92edf68828dfb40278cbccf26a3f374ff457e23';
 expected_state constant text := '07752073ec77a5c542871c417b19fc39a00edac2fb9a1c6552ad28a0ae0e9393';
 expected_prices constant text := '9003de1ec831a83e68cdc92c50db7afeeee8f2f514bbf5ef452c0d5a101847ce';
begin
 -- CI and fresh installations have no attempted NPL claim; leave them alone.
 if not exists(select 1 from private_reviewed_existing_history.cleanup_receipts where slug='gb-npl-midlands')
    and not exists(select 1 from private_reviewed_existing_history.price_attempts where slug='gb-npl-midlands')
    and not exists(select 1 from private_reviewed_existing_history.price_receipts where slug='gb-npl-midlands') then
  return;
 end if;

 lock table public.competitions, public.rounds, public.teams, public.players,
  public.matches, public.appearances, public.goals, public.player_season_stats,
  public.fantasy_teams, public.fantasy_roster, public.fantasy_lineups,
  public.fantasy_transfers, public.fantasy_chips, public.position_votes,
  public.position_votes_deleted, public.assist_votes, public.assist_votes_deleted
  in share row exclusive mode;
 lock table private_reviewed_existing_history.cleanup_receipts,
  private_reviewed_existing_history.price_attempts,
  private_reviewed_existing_history.price_receipts
  in share row exclusive mode;

 select * into c from public.competitions where id=979 for update;
 select * into cleanup from private_reviewed_existing_history.cleanup_receipts where slug='gb-npl-midlands' for update;
 select * into attempt from private_reviewed_existing_history.price_attempts where slug='gb-npl-midlands' for update;
 select * into recorded from private_reviewed_existing_history.price_receipts where slug='gb-npl-midlands' for update;
 perform private_reviewed_existing_history.require(c.id=979 and c.slug='gb-npl-midlands' and c.source='isthmian' and c.source_league_code='npl/67d7c7bb74247876e6dae40c/2026-27' and c.source_policy='reviewed-existing-history-20261023-v1' and not c.active,'exact inactive NPL target required');

 perform private_reviewed_existing_history.require(cleanup.slug='gb-npl-midlands' and cleanup.main_sha=expected_main and cleanup.policy_sha=expected_policy and cleanup.before_sha=expected_cleanup and cleanup.after_sha=expected_state and attempt.slug='gb-npl-midlands' and attempt.main_sha=expected_main and attempt.policy_sha=expected_policy and attempt.cleanup_before_sha=expected_cleanup and attempt.football_state_sha=expected_state,'original failed-run cleanup and one-use claim must match exactly');
 -- A previously completed exact receipt is already final; never call record twice.
 if recorded.slug is not null then
  perform private_reviewed_existing_history.require(recorded.main_sha=expected_main and recorded.policy_sha=expected_policy and recorded.cleanup_before_sha=expected_cleanup and recorded.football_state_sha=expected_state and recorded.price_vector_sha=expected_prices,'existing NPL price receipt differs from the pinned recovery');
  return;
 end if;
 perform private_reviewed_existing_history.require(private_reviewed_existing_history.state_sha('gb-npl-midlands')=expected_state and private_reviewed_existing_history.price_sha('gb-npl-midlands')=expected_prices,'current football state or full 1,021-player price vector drifted');
 perform private_reviewed_existing_history.require((select count(*) from public.players where competition_id=979)=1021,'exact full NPL player pool required');
 marker:=public.get_installed_historical_statistics_markers(979);
 perform private_reviewed_existing_history.require(marker->>'installed'='true' and marker->>'policyId'='gb-npl-midlands-historical-unavailable-2026-10-23-v1' and marker->>'policySha256'=expected_policy and jsonb_array_length(marker->'markers')=2 and not exists(select 1 from private_historical_statistics.markers m where m.competition_id=979 and m.source_match_id not in('6a590670ce9ef452b61f386d','6896abc31c6f4c56212c7ac5')),'exact reviewed NPL marker set required before recovery');

 -- Full revaluation uses a 270-minute floor once max aggregate minutes reach 810.
 with player_minutes as (
  select p.id,coalesce(sum(s.minutes),0)::integer minutes
  from public.players p left join public.player_season_stats s on s.player_id=p.id and s.competition_id=p.competition_id
  where p.competition_id=979 group by p.id
 ) select coalesce(max(minutes),0) into max_minutes from player_minutes;
 perform private_reviewed_existing_history.require(max_minutes>=810,'NPL pricing threshold must remain 270 minutes');

 perform private_reviewed_existing_history.require(not exists(
  select 1 from (values
   (401885::bigint,1051545820393105::bigint,13,2,2),
   (401972::bigint,1051558049934993::bigint,45,3,3),
   (402068::bigint,2675064277047137::bigint,191,5,4)
  ) e(id,reg_st,minutes,points,matches)
  left join public.players p on p.id=e.id and p.competition_id=979
  where p.id is null or p.reg_st is distinct from e.reg_st or p.value is distinct from 4.5 or p.value_start is not null or p.value_locked is not false or p.position is distinct from 'MID' or p.position_source is distinct from 'ugibanje' or p.nzs_top_league is not null or p.nzs_top_league_minutes is not null
 ),'the three failed rows must remain exact unlocked default-price players');
 perform private_reviewed_existing_history.require((select count(*) from public.player_season_stats where competition_id=979 and player_id in(401885,401972,402068))=3 and not exists(
  select 1 from (values
   (401885::bigint,13,2,2),
   (401972::bigint,45,3,3),
   (402068::bigint,191,5,4)
  ) e(id,minutes,points,matches)
  where not exists(select 1 from public.player_season_stats s where s.competition_id=979 and s.player_id=e.id and s.season='2025/26' and s.minutes=e.minutes and s.points=e.points and s.matches=e.matches and s.goals=0 and s.assists=0 and s.own_goals=0 and s.yellow_cards=0 and s.red_cards=0 and s.clean_sheets=0)
 ),'the three failed players must have only their retained sub-threshold 2025/26 statistics');
 perform private_reviewed_existing_history.require(not exists(
  select 1 from public.players p join public.competitions other on other.id=p.competition_id
  where p.competition_id<>979 and other.country_id=c.country_id and p.anonimiziran_at is null
   and p.reg_st in(1051545820393105,1051558049934993,2675064277047137)
 ),'no matching same-country player may offer an above-league price');
 perform private_reviewed_existing_history.require(not exists(select 1 from public.fantasy_teams where competition_id=979)
  and not exists(select 1 from public.fantasy_roster fr join public.players p on p.id=fr.player_id where p.competition_id=979)
  and not exists(select 1 from public.fantasy_lineups l join public.rounds r on r.id=l.round_id where r.competition_id=979)
  and not exists(select 1 from public.fantasy_transfers t join public.rounds r on r.id=t.round_id where r.competition_id=979)
  and not exists(select 1 from public.fantasy_chips t join public.rounds r on r.id=t.round_id where r.competition_id=979)
  and not exists(select 1 from public.position_votes v join public.players p on p.id=v.player_id where p.competition_id=979)
  and not exists(select 1 from public.position_votes_deleted v join public.players p on p.id=v.player_id where p.competition_id=979)
  and not exists(select 1 from public.assist_votes v join public.goals g on g.id=v.goal_id join public.matches m on m.id=g.match_id join public.rounds r on r.id=m.round_id where r.competition_id=979)
  and not exists(select 1 from public.assist_votes_deleted v join public.goals g on g.id=v.goal_id join public.matches m on m.id=g.match_id join public.rounds r on r.id=m.round_id where r.competition_id=979),'no post-claim user activity required');

 result:=public.record_reviewed_existing_prices('gb-npl-midlands',expected_main,expected_policy);
 perform private_reviewed_existing_history.require(result->>'slug'='gb-npl-midlands' and result->>'mainCommit'=expected_main and result->>'policySha256'=expected_policy and result->>'cleanupBeforeSha256'=expected_cleanup and result->>'footballStateSha256'=expected_state and result->>'priceSha256'=expected_prices,'existing claim could not be completed from its exact current native vector');
 select * into recorded from private_reviewed_existing_history.price_receipts where slug='gb-npl-midlands';
 perform private_reviewed_existing_history.require(recorded.main_sha=expected_main and recorded.policy_sha=expected_policy and recorded.cleanup_before_sha=expected_cleanup and recorded.football_state_sha=expected_state and recorded.price_vector_sha=expected_prices,'completed NPL price receipt readback differs');
end$$;
