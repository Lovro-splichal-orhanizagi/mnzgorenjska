-- Task 2 mechanics only. Intentionally NO catalog seed: actual archive, cutoff,
-- exhaustive reviewed catalog and full source headers require a later migration.
create schema private_baden_history;
revoke all on schema private_baden_history from public,anon,authenticated,service_role;
create table private_baden_history.catalog(singleton boolean primary key default true check(singleton),manifest jsonb not null,manifest_sha256 text not null check(manifest_sha256~'^[a-f0-9]{64}$'));
create table private_baden_history.prepared(
 competition_id bigint primary key references public.competitions(id),manifest_sha256 text not null,
 bindings jsonb not null,opening_round_id bigint not null references public.rounds(id));
create table private_baden_history.club_bindings(
 competition_id bigint not null references public.competitions(id),source_competition_id text not null,season text not null,source_club_id text not null,name text not null,
 team_id bigint not null references public.teams(id),primary key(competition_id,source_club_id));
revoke all on all tables in schema private_baden_history from public,anon,authenticated,service_role;
create function private_baden_history.sha(v jsonb)returns text language sql immutable set search_path=pg_catalog as $$select encode(sha256(convert_to(private_fussball.canonical_json(v),'UTF8')),'hex')$$;
create function private_baden_history.require(ok boolean,msg text)returns void language plpgsql set search_path=pg_catalog as $$
#variable_conflict use_column
begin if ok is distinct from true then raise exception 'BADEN_HISTORY: %',msg;end if;end$$;
create function private_baden_history.exact_policy(p jsonb)returns boolean language sql immutable set search_path=pg_catalog as $$
 select p->>'id'='de-fussball-baden-mixed-history-v1'and p->>'provider'='fussball-public'and p->>'competitionSlug'='de-verbandsliga-baden'and p->>'sourcePolicy'='fussball-community-cards-v1'and p->>'sourceLeagueCode'='03188V27L800000JVS5489BTVU7GTVLE-G:2026/27'and p->>'season'='2026/27';
$$;
create function private_baden_history.entry_season(p jsonb,e jsonb)returns text language plpgsql immutable set search_path=pg_catalog as $$
#variable_conflict use_column
begin
 perform private_baden_history.require(private_baden_history.exact_policy(p)and ((e->>'season'='2026/27'and e->>'sourceCompetitionId'='03188V27L800000JVS5489BTVU7GTVLE-G:2026/27')or(e->>'season'='2025/26'and e->>'sourceCompetitionId'='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'))and e->>'sourceMatchId'~'^[A-Z0-9]{32}$','exact Baden mixed-season entry required');return e->>'season';end$$;
-- Nullable raw SHA is reserved for reviewed administrative fixtures which had
-- no report GET. Their round documents/bundle remain separate immutable proof.
alter table private_historical_statistics.markers alter column raw_sha256 drop not null;
create function private_baden_history.marker_guard()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare p jsonb;e jsonb;
begin
 if tg_op<>'INSERT'then
  if exists(select 1 from private_historical_statistics.installed_policies i where i.competition_id=old.competition_id and i.policy_id='de-fussball-baden-mixed-history-v1')then raise exception 'BADEN_HISTORY: immutable marker';end if;
  if tg_op='DELETE'then return old;end if;
 end if;
 select d.document into p from private_historical_statistics.installed_policies i join private_historical_statistics.policies d on d.id=i.policy_id where i.competition_id=new.competition_id;
 if private_baden_history.exact_policy(p)is true then
  select value into e from jsonb_array_elements(p->'entries')where value->>'sourceMatchId'=new.source_match_id;
  perform private_baden_history.require(e is not null and new.fixture=e-array['rawSha256','reasonCode']and new.raw_sha256 is not distinct from e->>'rawSha256'and new.source_report_id='de-fussball-'||new.source_match_id,'exact immutable reviewed marker required');
 elsif new.raw_sha256 is null then raise exception 'BADEN_HISTORY: nullable raw SHA outside exact administrative scope';end if;return new;
end$$;
create trigger baden_history_marker_guard before insert or update or delete on private_historical_statistics.markers for each row execute function private_baden_history.marker_guard();
create function private_baden_history.unknown_result_allowed(rid bigint,h bigint,a bigint,report text,url text,day date,status text,reason text,phase text,rn int)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from private_historical_statistics.markers k join private_historical_statistics.installed_policies i using(competition_id)join private_historical_statistics.policies p on p.id=i.policy_id join competitions c on c.id=k.competition_id join rounds r on r.id=k.round_id join countries d on d.id=c.country_id
 where private_baden_history.exact_policy(p.document)and i.policy_sha256=p.policy_sha256 and c.slug='de-verbandsliga-baden'and c.source='fussball-public'and c.source_policy='fussball-community-cards-v1'and c.source_league_code=p.document->>'sourceLeagueCode'and d.code='DE'
 and k.raw_sha256 is null and k.fixture->>'season'='2025/26'and k.fixture->>'sourceCompetitionId'='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'and k.source_match_id in('02TNBSVDG0000000VS5489BUVSSD35NB','02TNBSVIMS000000VS5489BUVSSD35NB')and k.source_report_id=report and report='de-fussball-'||k.source_match_id and k.round_id=rid and k.home_team_id=h and k.away_team_id=a and r.competition_id=k.competition_id and r.season=k.fixture->>'season'and r.number=rn
 and k.fixture->>'sourceUrl'=url and (k.fixture->>'playedOn')::date=day and status='unavailable_historical'and k.fixture->>'resultKnown'='false'and k.fixture->'observedHomeScore'='null'::jsonb and k.fixture->'observedAwayScore'='null'::jsonb and k.fixture->'administrativeResult'->>'marker'='V'
 and reason=(select e->>'reasonCode'from jsonb_array_elements(p.document->'entries')e where e->>'sourceMatchId'=k.source_match_id)and phase is null and rn=(k.fixture->>'sourceRound')::int);
$$;
alter table public.matches drop constraint paired_result_availability;
alter table public.matches add constraint paired_result_availability check(
 (home_goals is not null and away_goals is not null)or(home_goals is null and away_goals is null and
 (private_fcf_six_history.unknown_result_allowed(round_id,home_team_id,away_team_id,zapisnik_id,source_url,played_on,statistics_status,statistics_reason,source_phase,source_round)is true
 or private_baden_history.unknown_result_allowed(round_id,home_team_id,away_team_id,zapisnik_id,source_url,played_on,statistics_status,statistics_reason,source_phase,source_round)is true)));
-- Preserve every existing provider's implementation; exact Baden dispatch only.
alter function public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)rename to legacy_upsert;
alter function public.legacy_upsert(bigint,text,text,text,text,jsonb)set schema private_baden_history;
revoke all on function private_baden_history.legacy_upsert(bigint,text,text,text,text,jsonb)from public,anon,authenticated,service_role;
create function public.upsert_unavailable_historical_match(p_competition_id bigint,p_source_match_id text,p_policy_id text,p_policy_sha256 text,p_raw_sha256 text,p_header jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare c competitions;i private_historical_statistics.installed_policies;p private_historical_statistics.policies;e jsonb;f jsonb;r rounds;m matches;h bigint;a bigint;report text;
begin
 if p_policy_id is distinct from 'de-fussball-baden-mixed-history-v1' then return private_baden_history.legacy_upsert(p_competition_id,p_source_match_id,p_policy_id,p_policy_sha256,p_raw_sha256,p_header);end if;
 perform private_fussball.service();perform private_baden_history.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 select *into c from competitions where id=p_competition_id for update;
 select *into i from private_historical_statistics.installed_policies where competition_id=c.id;select *into p from private_historical_statistics.policies where id=i.policy_id;
 select value into e from jsonb_array_elements(p.document->'entries')where value->>'sourceMatchId'=p_source_match_id;
 perform private_baden_history.require(not c.active and c.slug='de-verbandsliga-baden'and c.source='fussball-public'and c.source_policy='fussball-community-cards-v1'and c.source_league_code=p.document->>'sourceLeagueCode'and private_baden_history.exact_policy(p.document)and p.id=p_policy_id and i.policy_sha256=p_policy_sha256 and p.policy_sha256=p_policy_sha256 and e is not null and p_raw_sha256 is not distinct from e->>'rawSha256','exact inactive installed Baden policy required');
 perform private_baden_history.entry_season(p.document,e);f:=e-array['rawSha256','reasonCode'];
 perform private_baden_history.require(p_header->'fixture'=f and p_header-array['fixture','roundId','homeTeamId','awayTeamId']='{}'::jsonb,'full immutable fixture required');
 lock table countries,teams,rounds,matches,appearances,goals,fantasy_teams in share row exclusive mode;
 select *into r from rounds where id=(p_header->>'roundId')::bigint;h:=(p_header->>'homeTeamId')::bigint;a:=(p_header->>'awayTeamId')::bigint;report:='de-fussball-'||p_source_match_id;
 perform private_baden_history.require(r.competition_id=c.id and r.season=e->>'season'and r.number=(e->>'sourceRound')::int and (e->>'playedOn')::date<i.first_fantasy_played_on and (e->>'playedOn')::date<current_date and h<>a and not exists(select 1 from fantasy_teams where competition_id=c.id)
 and exists(select 1 from private_baden_history.club_bindings b join teams t on t.id=b.team_id where b.competition_id=c.id and b.source_competition_id=e->>'sourceCompetitionId'and b.season=e->>'season'and b.source_club_id=e->>'homeSourceClubId'and b.team_id=h and t.country_id=c.country_id)
 and exists(select 1 from private_baden_history.club_bindings b join teams t on t.id=b.team_id where b.competition_id=c.id and b.source_competition_id=e->>'sourceCompetitionId'and b.season=e->>'season'and b.source_club_id=e->>'awaySourceClubId'and b.team_id=a and t.country_id=c.country_id),'actual full source/native tuple required');
 perform private_baden_history.require((e->>'resultKnown'='true'and e->>'rawSha256'~'^[a-f0-9]{64}$'and (e->>'observedHomeScore')::int>=0 and (e->>'observedAwayScore')::int>=0)or(e->>'resultKnown'='false'and e->>'season'='2025/26'and e->>'sourceCompetitionId'='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'and p_source_match_id in('02TNBSVDG0000000VS5489BUVSSD35NB','02TNBSVIMS000000VS5489BUVSSD35NB')and e->'rawSha256'='null'::jsonb and e->'observedHomeScore'='null'::jsonb and e->'observedAwayScore'='null'::jsonb and e#>>'{administrativeResult,kind}'='confirmed-administrative-decision'and jsonb_array_length(e#>'{administrativeResult,displayedScores}')=2),'known official score or exact reviewed unknown pair required');
 perform private_baden_history.require((select count(*)from matches where zapisnik_id=report or(round_id=r.id and home_team_id=h and away_team_id=a))<=1,'ambiguous existing match');
 select *into m from matches where zapisnik_id=report or(round_id=r.id and home_team_id=h and away_team_id=a)for update;
 if m.id is not null then
  perform private_baden_history.require(m.round_id=r.id and m.home_team_id=h and m.away_team_id=a and m.imported_at is null and not m.kontumacija and not m.vir_brez_izida and not exists(select 1 from appearances where match_id=m.id)and not exists(select 1 from goals where match_id=m.id)
   and ((m.zapisnik_id=report and m.source_url=e->>'sourceUrl'and m.played_on=(e->>'playedOn')::date and m.home_goals is not distinct from(e->>'observedHomeScore')::int and m.away_goals is not distinct from(e->>'observedAwayScore')::int)
   or(m.zapisnik_id is null and m.source_url is null and m.statistics_status='available'and m.home_goals=0 and m.away_goals=0 and(m.played_on is null or m.played_on=(e->>'playedOn')::date))),'foreign or populated row; no cleanup');
 end if;
 if exists(select 1 from private_historical_statistics.markers where competition_id=c.id and source_match_id=p_source_match_id)then
  perform private_baden_history.require(exists(select 1 from private_historical_statistics.markers where competition_id=c.id and source_match_id=p_source_match_id and fixture=f and round_id=r.id and home_team_id=h and away_team_id=a and raw_sha256 is not distinct from p_raw_sha256),'immutable marker drift');
 else insert into private_historical_statistics.markers values(c.id,p_source_match_id,report,f,p_raw_sha256,r.id,h,a);end if;
 if m.id is null then insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,statistics_status,statistics_reason,source_phase,source_round)values(r.id,h,a,(e->>'observedHomeScore')::int,(e->>'observedAwayScore')::int,(e->>'playedOn')::date,report,e->>'sourceUrl','unavailable_historical',e->>'reasonCode',null,(e->>'sourceRound')::int)returning *into m;
 else update matches set home_goals=(e->>'observedHomeScore')::int,away_goals=(e->>'observedAwayScore')::int,played_on=(e->>'playedOn')::date,zapisnik_id=report,source_url=e->>'sourceUrl',statistics_status='unavailable_historical',statistics_reason=e->>'reasonCode',source_phase=null,source_round=(e->>'sourceRound')::int where id=m.id returning *into m;end if;
 return jsonb_build_object('matchId',m.id,'statisticsStatus',m.statistics_status,'policySha256',p.policy_sha256);
end$$;
-- Complete generic getter is reused, including country/club/round/match joins.
alter function public.get_installed_historical_statistics_markers(bigint)rename to legacy_markers;
alter function public.legacy_markers(bigint)set schema private_baden_history;
revoke all on function private_baden_history.legacy_markers(bigint)from public,anon,authenticated,service_role;
create function public.get_installed_historical_statistics_markers(p_competition_id bigint)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare v jsonb;k jsonb;e jsonb;p jsonb;markers jsonb:='[]';votes bigint;
begin
 v:=private_baden_history.legacy_markers(p_competition_id);
 if v->>'policyId'is distinct from 'de-fussball-baden-mixed-history-v1'then return v;end if;
 select document into p from private_historical_statistics.policies where id=v->>'policyId';
 for k in select value from jsonb_array_elements(v->'markers')loop
  select value into e from jsonb_array_elements(p->'entries')where value->>'sourceMatchId'=k->>'sourceMatchId';
  perform private_baden_history.entry_season(p,e);
  perform private_baden_history.require(k->'fixture'=e-array['rawSha256','reasonCode']and k->'rawSha256'=e->'rawSha256','installed reviewed tuple drift');
  select count(*)into votes from private_fussball.card_reports cr where cr.match_id=(k->>'matchId')::bigint;
  perform private_baden_history.require(votes=0,'unavailable marker has card report/events/votes');markers:=markers||jsonb_build_array(k||jsonb_build_object('voteCount',0));
 end loop;return v||jsonb_build_object('markers',markers);
end$$;
create function public.get_fussball_historical_preparation(p_competition_id bigint)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare c competitions;p private_baden_history.prepared;v jsonb;b jsonb;f jsonb;r rounds;m matches;history jsonb;cards jsonb;opening rounds;
begin
 perform private_fussball.service();select *into c from competitions where id=p_competition_id;
 select *into p from private_baden_history.prepared where competition_id=c.id;select manifest into v from private_baden_history.catalog where manifest_sha256=p.manifest_sha256;
 perform private_baden_history.require(p.competition_id is not null and v is not null and not c.active and c.slug=v->>'slug'and c.source='fussball-public'and c.source_league_code=v->>'currentCode'and c.source_policy='fussball-community-cards-v1'and exists(select 1 from countries where id=c.country_id and code='DE')and not exists(select 1 from fantasy_teams where competition_id=c.id)and not exists(select 1 from fantasy_lineups l join rounds x on x.id=l.round_id where x.competition_id=c.id),'exact inactive no-user preparation required');
 perform private_baden_history.require(private_baden_history.sha(v)=p.manifest_sha256 and (v->>'currentFreshUntil')::timestamptz>clock_timestamp()and jsonb_array_length(p.bindings)=jsonb_array_length(v->'fixtures'),'compiled manifest/freshness/bindings drift');
 for b in select value from jsonb_array_elements(p.bindings)loop
  f:=b->'fixture';select *into r from rounds where id=(b->>'roundId')::bigint;select *into m from matches where id=(b->>'matchId')::bigint;
  perform private_baden_history.require(exists(select 1 from jsonb_array_elements(v->'fixtures')x where x=f)and r.competition_id=c.id and r.season=f->>'season'and r.number=(f->>'round')::int and m.round_id=r.id and m.home_team_id=(b->>'homeTeamId')::bigint and m.away_team_id=(b->>'awayTeamId')::bigint and m.zapisnik_id=f->>'reportId'and m.source_url=f->>'sourceUrl'and m.played_on=(f->>'date')::date and m.source_round=(f->>'round')::int and m.source_phase is null
  and exists(select 1 from private_baden_history.club_bindings cb join teams t on t.id=cb.team_id where cb.competition_id=c.id and cb.source_competition_id=f->>'sourceCompetitionId'and cb.season=f->>'season'and cb.source_club_id=f->>'homeSourceClubId'and cb.name=f->>'homeName'and cb.team_id=m.home_team_id and t.country_id=c.country_id and t.name=cb.name)
  and exists(select 1 from private_baden_history.club_bindings cb join teams t on t.id=cb.team_id where cb.competition_id=c.id and cb.source_competition_id=f->>'sourceCompetitionId'and cb.season=f->>'season'and cb.source_club_id=f->>'awaySourceClubId'and cb.name=f->>'awayName'and cb.team_id=m.away_team_id and t.country_id=c.country_id and t.name=cb.name),'actual full source/native fixture binding drift');
  if(f->>'unavailable')::boolean then
   perform private_baden_history.require(m.statistics_status='unavailable_historical'and m.imported_at is null and not m.vir_brez_izida and not m.kontumacija,'immutable marker state drift');
  end if;
  if f->'score'<>'null'::jsonb then
   perform private_baden_history.require(m.home_goals=(f#>>'{score,domaci}')::int and m.away_goals=(f#>>'{score,gostje}')::int,'official score drift');
  elsif(f->>'unavailable')::boolean then perform private_baden_history.require(m.home_goals is null and m.away_goals is null,'unknown official result must stay both NULL');
  else perform private_baden_history.require(m.home_goals=0 and m.away_goals=0 and m.vir_brez_izida and m.imported_at is null,'unplayed header changed');end if;
 end loop;
 perform private_baden_history.require((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id)=jsonb_array_length(p.bindings),'extra or missing native source fixture');
 select *into opening from rounds where id=p.opening_round_id;
 perform private_baden_history.require(opening.competition_id=c.id and opening.season='2026/27'and opening.number=(v->>'openingRound')::int and c.prvi_fantasy_krog=opening.number and opening.played_on=(v->>'firstFantasyPlayedOn')::date and opening.lineups_locked_at is null and opening.deadline_at>clock_timestamp(),'future unlocked exact opening required');
 history:=public.get_installed_historical_statistics_markers(c.id);cards:=public.check_fussball_card_readiness(c.id,v->>'currentCode');
 perform private_baden_history.require(history->>'policySha256'=private_baden_history.sha(v->'policy')and history->>'firstFantasyPlayedOn'=v->>'firstFantasyPlayedOn'and cards->>'installed'='true'and cards->>'enabled'='true'and cards->>'current_code'=v->>'currentCode'and cards->'archive_codes'=jsonb_build_array(v->>'archiveCode'),'both installed policy readbacks required');
 return jsonb_build_object('prepared',true,'competitionId',c.id,'active',false,'noUsers',true,'sourcePolicy',c.source_policy,'manifestSha256',p.manifest_sha256,'bindings',p.bindings,'bindingSha256',private_baden_history.sha(p.bindings),'history',history,'cards',cards,'policySha256',history->>'policySha256','markerInventorySha256',private_baden_history.sha(history->'markers'),'firstFantasyPlayedOn',history->>'firstFantasyPlayedOn','openingRoundId',opening.id);
end$$;
create function public.prepare_fussball_historical_statistics(p_manifest text,p_sha256 text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare v jsonb;compiled jsonb;c competitions;f jsonb;e jsonb;x record;ids bigint[];tid bigint;rid bigint;hid bigint;aid bigint;mid bigint;opening bigint;day date;due timestamptz;bindings jsonb:='[]';psha text;p jsonb;
begin
 perform private_fussball.service();perform private_baden_history.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 perform private_baden_history.require(octet_length(p_manifest)<=64*1024*1024 and p_sha256~'^[a-f0-9]{64}$','bounded canonical manifest required');v:=p_manifest::jsonb;
 select manifest into compiled from private_baden_history.catalog where singleton and manifest_sha256=p_sha256 for share;
 perform private_baden_history.require(compiled is not null and compiled=v and private_baden_history.sha(v)=p_sha256 and private_fussball.canonical_json(v)=p_manifest,'catalog UNFINALIZED or compiled manifest differs');
 perform private_baden_history.require(v->>'version'='1'and v->>'kind'='baden-atomic-history-cards-preparation'and v->>'slug'='de-verbandsliga-baden'and v->>'currentCode'='03188V27L800000JVS5489BTVU7GTVLE-G:2026/27'and v->>'archiveCode'='02TGLSVQ1800000IVS5489BTVTLPPK10-G:2025/26'and private_baden_history.exact_policy(v->'policy')and v#>>'{policy,approvalReference}'='call_e8c944e47b7c42a38afa4f08fda48c23'and (v->>'currentFreshUntil')::timestamptz>clock_timestamp()and jsonb_array_length(v->'fixtures')between 2 and 8000 and jsonb_array_length(v#>'{policy,entries}')between 1 and 1224,'closed finalized exact Baden catalog required');
 select *into strict c from competitions where slug='de-verbandsliga-baden'for update;
 lock table countries,teams,players,rounds,matches,appearances,goals,fantasy_teams,fantasy_lineups in share row exclusive mode;
 perform private_baden_history.require(not c.active and c.source='fussball-public'and c.source_league_code=v->>'currentCode'and(c.source_policy is null or c.source_policy='fussball-community-cards-v1')and c.date_only_deadline_policy is null and exists(select 1 from countries where id=c.country_id and code='DE')and not exists(select 1 from competitions where id<>c.id and source=c.source and source_league_code in(v->>'currentCode',v->>'archiveCode'))and not exists(select 1 from fantasy_teams where competition_id=c.id)and not exists(select 1 from fantasy_lineups l join rounds r on r.id=l.round_id where r.competition_id=c.id),'exact inactive no-user target required');
 if exists(select 1 from private_baden_history.prepared where competition_id=c.id)then
  perform private_baden_history.require(exists(select 1 from private_baden_history.prepared where competition_id=c.id and manifest_sha256=p_sha256),'prepared manifest immutable');return public.get_fussball_historical_preparation(c.id);
 end if;
 perform private_baden_history.require(not exists(select 1 from players where competition_id=c.id)and not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and(m.imported_at is not null or exists(select 1 from appearances where match_id=m.id)or exists(select 1 from goals where match_id=m.id))),'populated target cannot be prepared');
 -- Source descriptor includes competition+season+published name. Full fixtures
 -- compile its authority; actual IDs below come only from native unique joins.
 for x in select distinct q->>'sourceCompetitionId'code,q->>'season'season,q->>'homeSourceClubId'club,q->>'homeName'name from jsonb_array_elements(v->'fixtures')q union select distinct q->>'sourceCompetitionId',q->>'season',q->>'awaySourceClubId',q->>'awayName'from jsonb_array_elements(v->'fixtures')q loop
  perform private_baden_history.require((x.season='2026/27'and x.code=v->>'currentCode')or(x.season='2025/26'and x.code=v->>'archiveCode'),'exact source club season required');
  perform private_baden_history.require(x.club=private_fussball.canonical_json(jsonb_build_object('sourceCompetitionId',x.code,'season',x.season,'name',x.name)),'full source club descriptor required');
  select array_agg(id order by id)into ids from teams where country_id=c.country_id and name=x.name;
  perform private_baden_history.require(coalesce(cardinality(ids),0)<=1,'ambiguous native club; names alone cannot resolve authority');
  tid:=ids[1];if tid is null then insert into teams(name,short_name,country_id)values(x.name,x.name,c.country_id)returning id into tid;end if;
  insert into private_baden_history.club_bindings values(c.id,x.code,x.season,x.club,x.name,tid);
  if exists(select 1 from private_historical_statistics.source_club_bindings where provider='fussball-public'and source_club_id=x.club)then raise exception 'BADEN_HISTORY: existing source club binding cannot be adopted';end if;
  insert into private_historical_statistics.source_club_bindings(provider,source_club_id,country_code,canonical_names,proofs,bound_team_id)values('fussball-public',x.club,'DE',array[x.name],(select jsonb_agg(q order by q->>'sourceMatchId')from jsonb_array_elements(v->'fixtures')q where q->>'homeSourceClubId'=x.club or q->>'awaySourceClubId'=x.club),tid);
 end loop;
 for x in select q->>'season'season,(q->>'round')::int number,min((q->>'date')::date)as fixture_day,min(((q->>'date')::date+(q->>'time')::time)at time zone 'Europe/Berlin')-make_interval(hours=>(v->>'deadlineOffsetHours')::int)due from jsonb_array_elements(v->'fixtures')q group by 1,2 loop
  select array_agg(id)into ids from rounds where competition_id=c.id and season=x.season and number=x.number;
  perform private_baden_history.require(coalesce(cardinality(ids),0)<=1,'ambiguous native round');rid:=ids[1];
  if rid is null then insert into rounds(competition_id,season,number,played_on,deadline_at)values(c.id,x.season,x.number,x.fixture_day,x.due)returning id into rid;
  else perform private_baden_history.require(exists(select 1 from rounds where id=rid and played_on=x.fixture_day and deadline_at=x.due and lineups_locked_at is null),'existing native round metadata differs');end if;
  if x.season='2026/27'and x.number=(v->>'openingRound')::int then opening:=rid;day:=x.fixture_day;due:=x.due;end if;
 end loop;
 perform private_baden_history.require(opening is not null and day=(v->>'firstFantasyPlayedOn')::date and due>clock_timestamp()and (v->>'deadlineOffsetHours')::int=c.rok_pomak_ur and not exists(select 1 from jsonb_array_elements(v->'fixtures')q where q->>'season'='2026/27'and(q->>'round')::int=(v->>'openingRound')::int and(q->'score'<>'null'::jsonb or q->'administrativeResult'<>'null'::jsonb)),'actual wholly unplayed future opening required');
 p:=v->'policy';psha:=private_baden_history.sha(p);
 if exists(select 1 from private_historical_statistics.policies where id=p->>'id')then
  perform private_baden_history.require(exists(select 1 from private_historical_statistics.policies where id=p->>'id'and document=p and policy_sha256=psha),'compiled policy drift');
 else insert into private_historical_statistics.policies values(p->>'id',psha,p);end if;
 perform public.install_fussball_card_policy(c.id,v->>'currentCode',array[v->>'archiveCode']);
 update competitions set prvi_fantasy_krog=(v->>'openingRound')::int where id=c.id;
 insert into private_historical_statistics.installed_policies(competition_id,policy_id,policy_sha256,first_fantasy_played_on)values(c.id,p->>'id',psha,day);
 for f in select value from jsonb_array_elements(v->'fixtures')order by value->>'sourceMatchId'loop
  select id into strict rid from rounds where competition_id=c.id and season=f->>'season'and number=(f->>'round')::int;
  select team_id into strict hid from private_baden_history.club_bindings where competition_id=c.id and source_club_id=f->>'homeSourceClubId'and source_competition_id=f->>'sourceCompetitionId'and season=f->>'season';
  select team_id into strict aid from private_baden_history.club_bindings where competition_id=c.id and source_club_id=f->>'awaySourceClubId'and source_competition_id=f->>'sourceCompetitionId'and season=f->>'season';
  perform private_baden_history.require(f->>'reportId'='de-fussball-'||(f->>'sourceMatchId')and f->>'sourceMatchId'~'^[A-Z0-9]{32}$'and hid<>aid,'exact source fixture/report required');
  if(f->>'unavailable')::boolean then
   select value into strict e from jsonb_array_elements(p->'entries')where value->>'sourceMatchId'=f->>'sourceMatchId';
   perform private_baden_history.require(e->>'sourceCompetitionId'=f->>'sourceCompetitionId'and e->>'season'=f->>'season'and e->>'sourceUrl'=f->>'sourceUrl'and e->>'playedOn'=f->>'date'and e->>'sourceRound'=f->>'round'and e->>'homeSourceClubId'=f->>'homeSourceClubId'and e->>'awaySourceClubId'=f->>'awaySourceClubId','reviewed full tuple differs');
   perform public.upsert_unavailable_historical_match(c.id,e->>'sourceMatchId',p->>'id',psha,e->>'rawSha256',jsonb_build_object('fixture',e-array['rawSha256','reasonCode'],'roundId',rid,'homeTeamId',hid,'awayTeamId',aid));
  else
   perform private_baden_history.require(f->'administrativeResult'='null'::jsonb,'administrative fixture needs exact review');
   select array_agg(id)into ids from matches where zapisnik_id=f->>'reportId'or(round_id=rid and home_team_id=hid and away_team_id=aid);
   perform private_baden_history.require(coalesce(cardinality(ids),0)=0,'existing nonmarker headers cannot be adopted in cold preparation');
   insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,source_round,vir_brez_izida)values(rid,hid,aid,coalesce((f#>>'{score,domaci}')::int,0),coalesce((f#>>'{score,gostje}')::int,0),(f->>'date')::date,f->>'reportId',f->>'sourceUrl',(f->>'round')::int,f->'score'='null'::jsonb);
  end if;
  select id into strict mid from matches where round_id=rid and home_team_id=hid and away_team_id=aid and zapisnik_id=f->>'reportId'and source_url=f->>'sourceUrl'and played_on=(f->>'date')::date;
  bindings:=bindings||jsonb_build_array(jsonb_build_object('sourceMatchId',f->>'sourceMatchId','sourceCompetitionId',f->>'sourceCompetitionId','fixture',f,'matchId',mid,'roundId',rid,'homeTeamId',hid,'awayTeamId',aid));
 end loop;
 insert into private_baden_history.prepared values(c.id,p_sha256,bindings,opening);
 return public.get_fussball_historical_preparation(c.id);
end$$;
-- Catalog and native preparation objects cannot be changed through service SQL.
create function private_baden_history.immutable()returns trigger language plpgsql set search_path=pg_catalog as $$
#variable_conflict use_column
begin raise exception 'BADEN_HISTORY: immutable compiled/native binding';end$$;
create trigger baden_catalog_immutable before update or delete on private_baden_history.catalog for each row execute function private_baden_history.immutable();
create trigger baden_prepared_immutable before update or delete on private_baden_history.prepared for each row execute function private_baden_history.immutable();
create trigger baden_clubs_immutable before update or delete on private_baden_history.club_bindings for each row execute function private_baden_history.immutable();
create function private_baden_history.policy_immutable()returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if(tg_table_name='policies'and to_jsonb(old)->>'id'='de-fussball-baden-mixed-history-v1')or(tg_table_name='installed_policies'and to_jsonb(old)->>'policy_id'='de-fussball-baden-mixed-history-v1')or(tg_table_name='source_club_bindings'and to_jsonb(old)->>'provider'='fussball-public')then raise exception 'BADEN_HISTORY: immutable installed policy/club binding';end if;
 if tg_op='DELETE'then return old;end if;return new;
end$$;
create trigger baden_policy_immutable before update or delete on private_historical_statistics.policies for each row execute function private_baden_history.policy_immutable();
create trigger baden_installed_immutable before update or delete on private_historical_statistics.installed_policies for each row execute function private_baden_history.policy_immutable();
create trigger baden_generic_clubs_immutable before update or delete on private_historical_statistics.source_club_bindings for each row execute function private_baden_history.policy_immutable();
revoke all on all functions in schema private_baden_history from public,anon,authenticated,service_role;
revoke all on function public.prepare_fussball_historical_statistics(text,text),public.get_fussball_historical_preparation(bigint),public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb),public.get_installed_historical_statistics_markers(bigint)from public,anon,authenticated;
grant execute on function public.prepare_fussball_historical_statistics(text,text),public.get_fussball_historical_preparation(bigint),public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb),public.get_installed_historical_statistics_markers(bigint)to service_role;
