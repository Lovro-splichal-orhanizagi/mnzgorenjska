-- Read-only bound runtime authority, deliberately distinct from COLD preparation.
-- No registration, policy installation, admission, prices or activation authority.
create function public.get_fussball_historical_runtime(p_competition_id bigint) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare c competitions;p private_baden_history.prepared;v jsonb;b jsonb;f jsonb;r rounds;m matches;history jsonb;cards jsonb;
begin
 perform private_fussball.service();
 select * into c from competitions where id=p_competition_id;
 select * into p from private_baden_history.prepared where competition_id=c.id;
 select manifest into v from private_baden_history.catalog where singleton and manifest_sha256=p.manifest_sha256;
 perform private_baden_history.require(v is not null and private_baden_history.sha(v)=p.manifest_sha256 and private_baden_history.exact_policy(v->'policy') and c.slug='de-verbandsliga-baden' and c.slug=v->>'slug' and c.source='fussball-public' and c.source_league_code=v->>'currentCode' and c.source_policy='fussball-community-cards-v1' and exists(select 1 from countries where id=c.country_id and code='DE'),'exact compiled installed Baden runtime required');
 perform private_baden_history.require(jsonb_array_length(p.bindings)=jsonb_array_length(v->'fixtures') and (select count(distinct q->>'matchId') from jsonb_array_elements(p.bindings)q)=jsonb_array_length(p.bindings) and (select count(distinct(q->>'sourceCompetitionId',q->>'sourceMatchId')) from jsonb_array_elements(p.bindings)q)=jsonb_array_length(p.bindings),'complete unique runtime native bindings required');
 for b in select value from jsonb_array_elements(p.bindings) loop
  f:=b->'fixture';select * into r from rounds where id=(b->>'roundId')::bigint;select * into m from matches where id=(b->>'matchId')::bigint;
  perform private_baden_history.require(exists(select 1 from jsonb_array_elements(v->'fixtures')x where x=f) and r.competition_id=c.id and r.season=f->>'season' and r.number=(f->>'round')::int and m.round_id=r.id and m.home_team_id=(b->>'homeTeamId')::bigint and m.away_team_id=(b->>'awayTeamId')::bigint and m.zapisnik_id=f->>'reportId' and m.source_url=f->>'sourceUrl'
   and exists(select 1 from private_baden_history.club_bindings cb join teams t on t.id=cb.team_id where cb.competition_id=c.id and cb.source_competition_id=f->>'sourceCompetitionId' and cb.season=f->>'season' and cb.source_club_id=f->>'homeSourceClubId' and cb.name=f->>'homeName' and cb.team_id=m.home_team_id and t.country_id=c.country_id and t.name=cb.name)
   and exists(select 1 from private_baden_history.club_bindings cb join teams t on t.id=cb.team_id where cb.competition_id=c.id and cb.source_competition_id=f->>'sourceCompetitionId' and cb.season=f->>'season' and cb.source_club_id=f->>'awaySourceClubId' and cb.name=f->>'awayName' and cb.team_id=m.away_team_id and t.country_id=c.country_id and t.name=cb.name),'full runtime source/native binding drift');
  -- Ordinary current reports/date changes are authorized by the ordinary import
  -- path; only immutable markers must retain the complete original header.
  if (f->>'unavailable')::boolean then
   perform private_baden_history.require(m.statistics_status='unavailable_historical' and m.imported_at is null and not m.vir_brez_izida and not m.kontumacija and m.played_on=(f->>'date')::date and m.source_phase is null and m.source_round=(f->>'round')::int
    and m.home_goals is not distinct from(f#>>'{score,domaci}')::int and m.away_goals is not distinct from(f#>>'{score,gostje}')::int
    and not exists(select 1 from appearances where match_id=m.id) and not exists(select 1 from goals where match_id=m.id) and not exists(select 1 from private_fussball.card_reports where match_id=m.id),'immutable runtime marker/header/individual/card drift');
  else perform private_baden_history.require(m.statistics_status='available','ordinary fixture cannot acquire historical exclusion');end if;
 end loop;
 perform private_baden_history.require((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id)=jsonb_array_length(p.bindings),'extra/missing runtime native fixture');
 history:=public.get_installed_historical_statistics_markers(c.id);cards:=public.get_fussball_card_policy(c.id);
 perform private_baden_history.require(history->>'installed'='true' and history->>'policySha256'=private_baden_history.sha(v->'policy') and history->>'firstFantasyPlayedOn'=v->>'firstFantasyPlayedOn' and cards->>'installed'='true' and cards->>'enabled'='true' and cards->>'source_policy'=c.source_policy and cards->>'current_code'=v->>'currentCode' and cards->'archive_codes'=jsonb_build_array(v->>'archiveCode'),'both complete runtime policies required');
 return jsonb_build_object('kind','baden-bound-installed-runtime','competitionId',c.id,'active',c.active,'manifest',v,'manifestSha256',p.manifest_sha256,'bindings',p.bindings,'bindingSha256',private_baden_history.sha(p.bindings),'history',history,'cards',cards,'policySha256',history->>'policySha256','markerInventorySha256',private_baden_history.sha(history->'markers'),'firstFantasyPlayedOn',history->>'firstFantasyPlayedOn','openingRoundId',p.opening_round_id,'registrationEligible',false,'activationEligible',false);
end$$;
revoke all on function public.get_fussball_historical_runtime(bigint) from public,anon,authenticated;
grant execute on function public.get_fussball_historical_runtime(bigint) to service_role;
