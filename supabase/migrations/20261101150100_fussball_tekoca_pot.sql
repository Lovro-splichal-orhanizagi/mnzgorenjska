-- FUSSBALL "pot B" (odločitev lastnika 1. 11. 2026): nemška liga gre v igro
-- samo s tekočo sezono, brez arhiva in brez enkratne Badenove native verige.
--
-- 1. Baden (de-verbandsliga-baden) se odveže od enkratne verige: izbrišejo se
--    pripravljena native vezava (private_baden_history.prepared), nameščena
--    zgodovinska politika in njene označbe (56 vrstic) ter morebitna stara
--    sprejemnica kartonov. Vse se pred brisanjem shrani v
--    private_fussball.detached_native_state (za pregled ali ročno obnovo).
--    Tekme/krogi ostanejo; 56 tekem iz označb dobi spet statistics_status
--    'available' brez nastopov (nobena nima uvoženih podatkov). Kartonska
--    politika ostane, le brez arhivskih šifer (archive_codes = '{}').
-- 2. install_fussball_card_policy sprejme tudi prazen arhiv (pot B).
-- 3. vklopi_fussball_tekoco: servisni vklop lige poti B. Neznani zapisniki
--    (zavrnjeni pri viru) ostanejo neuvoženi in morajo biti izrecno našteti;
--    statistik ne ugibamo.

create table private_fussball.detached_native_state(
 competition_id bigint primary key references public.competitions(id),
 detached_at timestamptz not null default clock_timestamp(),
 state jsonb not null
);
revoke all on private_fussball.detached_native_state from public,anon,authenticated,service_role;

-- Odvezava je funkcija, da jo SQL regresija preveri na sintetičnem stanju.
-- Izvede se enkrat spodaj; brez pripravljene native vezave ne naredi ničesar.
create function private_fussball.detach_native_current_only(p_slug text) returns jsonb language plpgsql set search_path=public,pg_temp as $$
#variable_conflict use_column
declare c competitions; n_markers integer; n_matches integer;
begin
 select * into c from competitions where slug=p_slug and source='fussball-public' and source_policy='fussball-community-cards-v1';
 if c.id is null or not exists(select 1 from private_baden_history.prepared where competition_id=c.id) then return jsonb_build_object('detached',false); end if;
 if c.active or exists(select 1 from fantasy_teams where competition_id=c.id)
  or exists(select 1 from private_fussball.card_reports where competition_id=c.id)
  or exists(select 1 from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=c.id)
 then raise exception 'FUSSBALL_PATH_B: detach requires inactive league without fantasy teams, card reports or appearances'; end if;
 insert into private_fussball.detached_native_state(competition_id,state) values(c.id,jsonb_build_object(
  'reason','owner decision 2026-11-01: current-only path B',
  'prepared',(select to_jsonb(p) from private_baden_history.prepared p where p.competition_id=c.id),
  'installed_policy',(select to_jsonb(i) from private_historical_statistics.installed_policies i where i.competition_id=c.id),
  'markers',(select coalesce(jsonb_agg(to_jsonb(k) order by k.source_match_id),'[]') from private_historical_statistics.markers k where k.competition_id=c.id),
  'release_authorizations',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from private_historical_statistics.release_authorizations a where a.competition_id=c.id),
  'card_policy',(select to_jsonb(p) from private_fussball.card_policies p where p.competition_id=c.id),
  'card_admission',(select to_jsonb(a) from private_fussball.card_admissions a where a.competition_id=c.id),
  'prvi_fantasy_krog',c.prvi_fantasy_krog,
  'unavailable_matches',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'zapisnik_id',m.zapisnik_id,'statistics_status',m.statistics_status,'statistics_reason',m.statistics_reason) order by m.id),'[]')
   from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id and m.statistics_status='unavailable_historical')));
 execute 'alter table private_baden_history.prepared disable trigger baden_prepared_immutable';
 execute 'alter table private_historical_statistics.installed_policies disable trigger baden_installed_immutable';
 execute 'alter table private_historical_statistics.markers disable trigger baden_history_marker_guard';
 execute 'alter table public.matches disable trigger protect_historical_statistics_match';
 delete from private_fussball.card_admissions where competition_id=c.id;
 delete from private_historical_statistics.release_authorizations where competition_id=c.id;
 delete from private_historical_statistics.markers where competition_id=c.id;
 get diagnostics n_markers=row_count;
 delete from private_historical_statistics.installed_policies where competition_id=c.id;
 delete from private_baden_history.prepared where competition_id=c.id;
 update matches m set statistics_status='available',statistics_reason=null from rounds r
  where r.id=m.round_id and r.competition_id=c.id and m.statistics_status='unavailable_historical';
 get diagnostics n_matches=row_count;
 execute 'alter table private_baden_history.prepared enable trigger baden_prepared_immutable';
 execute 'alter table private_historical_statistics.installed_policies enable trigger baden_installed_immutable';
 execute 'alter table private_historical_statistics.markers enable trigger baden_history_marker_guard';
 execute 'alter table public.matches enable trigger protect_historical_statistics_match';
 update private_fussball.card_policies set archive_codes='{}' where competition_id=c.id;
 return jsonb_build_object('detached',true,'competition_id',c.id,'markers',n_markers,'matches',n_matches);
end$$;
revoke all on function private_fussball.detach_native_current_only(text) from public,anon,authenticated,service_role;
select private_fussball.detach_native_current_only('de-verbandsliga-baden');

-- Prazen arhiv je dovoljen (pot B); neprazen ostane pod istimi pogoji kot prej.
create or replace function public.install_fussball_card_policy(p_competition_id bigint,p_current_code text,p_archive_codes text[]) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column

declare c competitions; p private_fussball.card_policies; v text; yr integer;
begin
 perform private_fussball.service();
 select * into strict c from competitions where id=p_competition_id for update;
 select * into p from private_fussball.card_policies where competition_id=c.id;
 if p.competition_id is not null then
  perform private_fussball.require(p.current_code=p_current_code and p.archive_codes=p_archive_codes and c.source_policy='fussball-community-cards-v1' and c.source='fussball-public' and c.source_league_code=p_current_code,'installed policy cannot be rebound');
  return jsonb_build_object('installed',true,'source_policy',c.source_policy);
 end if;
 perform private_fussball.require(not c.active and c.source='fussball-public' and c.source_policy is null and c.source_league_code=p_current_code and exists(select 1 from countries where id=c.country_id and code='DE')
 and not exists(select 1 from competitions where id<>c.id and source='fussball-public'and source_league_code=p_current_code)
 and p_current_code~'^[A-Z0-9]{32}-G:20[0-9]{2}/[0-9]{2}$' and p_archive_codes is not null and cardinality(p_archive_codes) between 0 and 3 and (cardinality(p_archive_codes)=0 or array_ndims(p_archive_codes)=1)
 and (select count(distinct x)from unnest(p_archive_codes)x)=cardinality(p_archive_codes) and not p_current_code=any(p_archive_codes)
 and not exists(select 1 from fantasy_teams where competition_id=c.id) and not exists(select 1 from fantasy_lineups l join rounds r on r.id=l.round_id where r.competition_id=c.id),'inactive exact German source/current/archive tuple without fantasy activity required');
 yr:=substring(p_current_code from 36 for 4)::int;
 perform private_fussball.require(right(p_current_code,2)=right((yr+1)::text,2),'invalid current season');
 foreach v in array p_archive_codes loop
  perform private_fussball.require(v~'^[A-Z0-9]{32}-G:20[0-9]{2}/[0-9]{2}$' and substring(v from 36 for 4)::int between yr-3 and yr-1 and right(v,2)=right((substring(v from 36 for 4)::int+1)::text,2)
   and not exists(select 1 from competitions where id<>c.id and source='fussball-public' and source_league_code=v)
   and not exists(select 1 from private_fussball.card_policies where v=current_code or v=any(archive_codes)),'distinct adjacent unowned archive codes required');
 end loop;
 perform private_fussball.require(cardinality(p_archive_codes)=0 or exists(select 1 from unnest(p_archive_codes)x where substring(x from 36 for 4)::int=yr-1),'immediately preceding archive required');
 insert into private_fussball.card_policies values(c.id,p_current_code,p_archive_codes,clock_timestamp());
 update competitions set source_policy='fussball-community-cards-v1' where id=c.id;
 insert into competition_settings values(c.id,'fussball_card_voting_enabled','1')on conflict(competition_id,key)do update set value=excluded.value;
 return jsonb_build_object('installed',true,'source_policy','fussball-community-cards-v1');
end$$;

-- Vklop poti B. p_manifest: {"version":1,"kind":"fussball-current-only",
-- "currentCode":…,"sourceResultSha256":…,"unknownReports":[{"reportId","round","date",
-- "home","away","score":{domaci,gostje}|null,"reason"}]}. Neznana tekma dobi le uradno
-- glavo (šifro zapisnika in izid iz razporeda), nikoli nastopov ali golov.
-- Prvi krog izbere baza: najnižji nedotaknjen prihodnji krog tekoče sezone,
-- za katerim ni nobene uvožene ali čakajoče tekme.
create function public.vklopi_fussball_tekoco(p_slug text,p_manifest jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare c competitions; p private_fussball.card_policies; v_season text; today date; r rounds; x jsonb; mid bigint; unknown bigint[]:='{}'; state text; sha text;
begin
 perform private_fussball.service();
 select * into strict c from competitions where slug=p_slug for update;
 select * into p from private_fussball.card_policies where competition_id=c.id;
 perform private_fussball.require(not c.active and c.source='fussball-public' and c.source_policy='fussball-community-cards-v1' and p.current_code=c.source_league_code and cardinality(p.archive_codes)=0
  and private_fussball.enabled(c.id) and exists(select 1 from countries where id=c.country_id and code='DE')
  and not exists(select 1 from private_baden_history.prepared where competition_id=c.id)
  and not exists(select 1 from private_historical_statistics.installed_policies where competition_id=c.id)
  and not exists(select 1 from private_historical_statistics.markers where competition_id=c.id),'inactive current-only German community league required');
 perform private_fussball.require(p_manifest->>'version'='1' and p_manifest->>'kind'='fussball-current-only' and p_manifest->>'currentCode'=c.source_league_code
  and p_manifest->>'sourceResultSha256'~'^[a-f0-9]{64}$' and jsonb_typeof(p_manifest->'unknownReports')='array','current-only activation manifest required');
 lock table players,rounds,matches,appearances,goals,fantasy_teams,fantasy_lineups in share mode;
 perform private_fussball.require(not exists(select 1 from fantasy_teams where competition_id=c.id) and not exists(select 1 from fantasy_lineups l join rounds x on x.id=l.round_id where x.competition_id=c.id),'no fantasy activity allowed before activation');
 v_season:=split_part(c.source_league_code,':',2);
 today:=(clock_timestamp() at time zone 'Europe/Berlin')::date;
 for x in select value from jsonb_array_elements(p_manifest->'unknownReports') loop
  mid:=null;
  select m.id into mid from matches m join rounds y on y.id=m.round_id join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id
   where y.competition_id=c.id and y.season=v_season and y.number=(x->>'round')::int and h.name=x->>'home' and a.name=x->>'away'
    and (m.zapisnik_id is null or m.zapisnik_id=x->>'reportId') and m.played_on=(x->>'date')::date and m.played_on<today
    and m.imported_at is null and m.statistics_status='available' and not m.kontumacija
    and not exists(select 1 from appearances where match_id=m.id) and not exists(select 1 from goals where match_id=m.id);
  perform private_fussball.require(mid is not null and not mid=any(unknown) and x->>'reportId'~'^de-fussball-[A-Z0-9]{32}$'
   and (jsonb_typeof(x->'score')='null' or (x#>>'{score,domaci}')~'^[0-9]{1,2}$' and (x#>>'{score,gostje}')~'^[0-9]{1,2}$'),
   'unknown reports must be past, unimported current fixtures without individual rows');
  unknown:=unknown||mid;
  update matches set zapisnik_id=x->>'reportId',home_goals=coalesce((x#>>'{score,domaci}')::int,0),away_goals=coalesce((x#>>'{score,gostje}')::int,0),vir_brez_izida=jsonb_typeof(x->'score')='null' where id=mid;
 end loop;
 -- Vsaka odigrana tekma tekoče sezone je uvožena, čaka na kartone ali je izrecno neznana.
 perform private_fussball.require(not exists(select 1 from matches m join rounds x on x.id=m.round_id where x.competition_id=c.id and x.season=v_season and m.played_on<today and not m.kontumacija
  and m.imported_at is null and m.statistics_status<>'pending_cards' and not m.id=any(unknown)),'every past current fixture must be imported, pending cards or listed unknown');
 perform private_fussball.require(not exists(select 1 from matches m join rounds x on x.id=m.round_id where x.competition_id=c.id and x.season=v_season and m.imported_at is not null and not m.kontumacija
  and(exists(select 1 from(values(m.home_team_id),(m.away_team_id))t(tid)where(select count(*)from appearances a where a.match_id=m.id and a.team_id=t.tid and a.started)<>11 or(select count(*)from appearances a where a.match_id=m.id and a.team_id=t.tid and a.started and a.is_goalkeeper)<>1)
   or m.home_goals<>(select count(*)from goals g where g.match_id=m.id and(g.team_id=m.home_team_id)<>g.is_own_goal)or m.away_goals<>(select count(*)from goals g where g.match_id=m.id and(g.team_id=m.away_team_id)<>g.is_own_goal)
   or exists(select 1 from goals g where g.match_id=m.id and not exists(select 1 from appearances a where a.match_id=m.id and a.player_id=g.scorer_id and a.team_id=g.team_id)))),'complete XI, one starting goalkeeper and goal ledger required for every imported report');
 select x.* into r from rounds x where x.competition_id=c.id and x.season=v_season and x.deadline_at>clock_timestamp() and x.played_on>=today and x.lineups_locked_at is null
  and exists(select 1 from matches m where m.round_id=x.id)
  and not exists(select 1 from matches m join rounds y on y.id=m.round_id where y.competition_id=c.id and y.season=v_season and y.number>=x.number
   and(m.imported_at is not null or m.statistics_status<>'available' or m.home_goals<>0 or m.away_goals<>0 or exists(select 1 from appearances a where a.match_id=m.id)))
  order by x.number limit 1;
 perform private_fussball.require(r.id is not null and not exists(select 1 from matches m where m.round_id=r.id and(m.played_on is null or m.played_on<today)),'untouched future opening round required');
 update competitions set prvi_fantasy_krog=r.number where id=c.id;
 sha:=private_fussball.sha(private_fussball.canonical_json(p_manifest));
 state:=private_fussball.admission_state(c.id);
 insert into private_fussball.card_admissions(competition_id,manifest,manifest_sha256,state_sha256)values(c.id,p_manifest,sha,state)
  on conflict(competition_id)do update set manifest=excluded.manifest,manifest_sha256=excluded.manifest_sha256,state_sha256=excluded.state_sha256,registered_at=clock_timestamp();
 insert into private_fussball.card_activation_context values(c.id,txid_current(),state);
 update competitions set active=true where id=c.id;
 delete from private_fussball.card_activation_context where competition_id=c.id;
 return jsonb_build_object('vklopljena',true,'razlog',null,'prvi_krog',r.number,'prvi_krog_datum',r.played_on,'neznanih',cardinality(unknown),'admission_sha256',sha);
end$$;
revoke all on function public.vklopi_fussball_tekoco(text,jsonb) from public,anon,authenticated;
grant execute on function public.vklopi_fussball_tekoco(text,jsonb) to service_role;
