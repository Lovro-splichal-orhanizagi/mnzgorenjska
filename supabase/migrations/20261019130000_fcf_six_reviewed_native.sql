-- Separate six-reviewed protocol. Legacy four policy documents and APIs retain their meaning.
insert into private_historical_statistics.policies values('es-ct-segona-g1-six-reviewed-2026-10-19-v1','fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9','{"id":"es-ct-segona-g1-six-reviewed-2026-10-19-v1","provider":"fcf","sourcePolicy":"es-fcf-six-reviewed-history-v1","competitionSlug":"es-ct-segona-g1","season":"2026/27","recordedAt":"2026-10-19T07:22:00Z","approvalReference":"Explicit user approval of exactly six Spanish prelaunch exclusions relayed by root 2026-10-19; recording time is not approval send time.","entries":[{"sourceMatchId":"4109388","sourceCompetitionId":"58161863","sourcePhase":null,"sourceRound":1,"playedOn":"2026-09-20","homeSourceClubId":"5042","awaySourceClubId":"5057","homeSourceCategoryId":"33356","awaySourceCategoryId":"35522","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4109388","rawSha256":"eb3b14de3d6077f4fb896cb4a4d2b96d76eb85db8853889e9871b7f74e73e770","observedHomeScore":0,"observedAwayScore":3,"reasonCode":"published_score_conflicts_with_recorded_goal_events"},{"sourceMatchId":"4109404","sourceCompetitionId":null,"sourcePhase":null,"sourceRound":3,"playedOn":"2026-10-04","homeSourceClubId":"5057","awaySourceClubId":"5029","homeSourceCategoryId":"35522","awaySourceCategoryId":"33592","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4109404","rawSha256":"1a42a49bd0b55d0bd3a654a6e15b65f430a2c132e28813899205d394f05244dc","observedHomeScore":null,"observedAwayScore":null,"reasonCode":"closed_official_result_and_individual_statistics_unavailable"}]}'::jsonb);
insert into private_historical_statistics.policies values('es-ct-tercera-g2-six-reviewed-2026-10-19-v1','69cf7d1406b1306ab1aa31413cdd37bf11b502e5f17f9cb7eab295502578fc52','{"id":"es-ct-tercera-g2-six-reviewed-2026-10-19-v1","provider":"fcf","sourcePolicy":"es-fcf-six-reviewed-history-v1","competitionSlug":"es-ct-tercera-g2","season":"2026/27","recordedAt":"2026-10-19T07:22:00Z","approvalReference":"Explicit user approval of exactly six Spanish prelaunch exclusions relayed by root 2026-10-19; recording time is not approval send time.","entries":[{"sourceMatchId":"4116215","sourceCompetitionId":"58161875","sourcePhase":null,"sourceRound":4,"playedOn":"2026-10-10","homeSourceClubId":"1107","awaySourceClubId":"5114","homeSourceCategoryId":"37659","awaySourceCategoryId":"34913","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4116215","rawSha256":"5dd7e401c7929dd1f2b59d35d1f6e203e6306f2479238adcd8755180b9671a49","observedHomeScore":5,"observedAwayScore":0,"reasonCode":"published_score_exceeds_recorded_goal_events"}]}'::jsonb);
insert into private_historical_statistics.policies values('es-ct-tercera-g9-six-reviewed-2026-10-19-v1','38eca907c6b0f4df03a989778099f00b356d03626895de3961bad5e266bd3912','{"id":"es-ct-tercera-g9-six-reviewed-2026-10-19-v1","provider":"fcf","sourcePolicy":"es-fcf-six-reviewed-history-v1","competitionSlug":"es-ct-tercera-g9","season":"2026/27","recordedAt":"2026-10-19T07:22:00Z","approvalReference":"Explicit user approval of exactly six Spanish prelaunch exclusions relayed by root 2026-10-19; recording time is not approval send time.","entries":[{"sourceMatchId":"4118352","sourceCompetitionId":"58161880","sourcePhase":null,"sourceRound":1,"playedOn":"2026-09-19","homeSourceClubId":"1252","awaySourceClubId":"6136","homeSourceCategoryId":"35781","awaySourceCategoryId":"33049","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118352","rawSha256":"1e8d50d487be699cac45c3c2dc4658d3a9b16983fd5203b5845dc1339fe7351c","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"published_score_conflicts_with_recorded_goal_events"},{"sourceMatchId":"4118354","sourceCompetitionId":"58161880","sourcePhase":null,"sourceRound":1,"playedOn":"2026-09-19","homeSourceClubId":"1372","awaySourceClubId":"54319880","homeSourceCategoryId":"19610692","awaySourceCategoryId":"54709553","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118354","rawSha256":"f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556","observedHomeScore":3,"observedAwayScore":1,"reasonCode":"second_half_goalkeeper_unidentified"},{"sourceMatchId":"4118358","sourceCompetitionId":"58161880","sourcePhase":null,"sourceRound":2,"playedOn":"2026-09-26","homeSourceClubId":"44143644","awaySourceClubId":"1400","homeSourceCategoryId":"44510647","awaySourceCategoryId":"47272626","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118358","rawSha256":"e69af6b2765dbed7ebe3b57535beb1ce259c7d77ed9cb7f90d9cb4998afd153a","observedHomeScore":0,"observedAwayScore":3,"reasonCode":"published_score_conflicts_with_recorded_goal_events"}]}'::jsonb);
create or replace function public.get_installed_historical_statistics_markers(p_competition_id bigint)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare i private_historical_statistics.installed_policies%rowtype;p private_historical_statistics.policies%rowtype;markers jsonb;
begin
 select * into i from private_historical_statistics.installed_policies where competition_id=p_competition_id;
 if i.competition_id is null then return jsonb_build_object('installed',false,'markers','[]'::jsonb);end if;
 select * into p from private_historical_statistics.policies where id=i.policy_id;
 if not exists(select 1 from public.competitions c where c.id=i.competition_id and c.slug=p.document->>'competitionSlug'and c.source=p.document->>'provider'and c.source_policy=p.document->>'sourcePolicy')or i.policy_sha256<>p.policy_sha256 then raise exception 'HISTORICAL_POLICY: installed competition/policy binding drift';end if;
 select jsonb_agg(jsonb_build_object('sourceMatchId',k.source_match_id,'reportId',k.source_report_id,'fixture',k.fixture,'rawSha256',k.raw_sha256,'matchId',m.id,'roundId',k.round_id,'homeTeamId',k.home_team_id,'awayTeamId',k.away_team_id,'policyId',i.policy_id,'policySha256',i.policy_sha256,'statisticsStatus',m.statistics_status,'importedAt',m.imported_at,'individualRowCount',(select count(*)from public.appearances where match_id=m.id)+(select count(*)from public.goals where match_id=m.id))order by k.source_match_id)into markers
 from private_historical_statistics.markers k
 join public.rounds r on r.id=k.round_id and r.competition_id=k.competition_id and r.season=k.fixture->>'season'and r.number=(k.fixture->>'sourceRound')::int
 join public.competitions c on c.id=k.competition_id
 join private_historical_statistics.source_club_bindings hb on hb.provider=p.document->>'provider'and hb.source_club_id=k.fixture->>'homeSourceClubId'and hb.source_category_id=coalesce(k.fixture->>'homeSourceCategoryId','')and hb.bound_team_id=k.home_team_id
 join private_historical_statistics.source_club_bindings ab on ab.provider=p.document->>'provider'and ab.source_club_id=k.fixture->>'awaySourceClubId'and ab.source_category_id=coalesce(k.fixture->>'awaySourceCategoryId','')and ab.bound_team_id=k.away_team_id
 join public.teams ht on ht.id=k.home_team_id and ht.country_id=c.country_id
 join public.teams at on at.id=k.away_team_id and at.country_id=c.country_id
 join public.countries country on country.id=c.country_id and country.code=hb.country_code and country.code=ab.country_code
 join public.matches m on m.round_id=k.round_id and m.home_team_id=k.home_team_id and m.away_team_id=k.away_team_id and m.zapisnik_id=k.source_report_id and m.statistics_status='unavailable_historical'and m.imported_at is null and m.source_url=k.fixture->>'sourceUrl'and m.played_on=(k.fixture->>'playedOn')::date and m.home_goals is not distinct from(k.fixture->>'observedHomeScore')::int and m.away_goals is not distinct from(k.fixture->>'observedAwayScore')::int and not m.kontumacija and not m.vir_brez_izida and m.source_phase is not distinct from k.fixture->>'sourcePhase'and m.source_round=(k.fixture->>'sourceRound')::int where k.competition_id=i.competition_id;
 if coalesce(jsonb_array_length(markers),0)<>jsonb_array_length(p.document->'entries')or exists(select 1 from jsonb_array_elements(markers)x where(x->>'individualRowCount')::int<>0)then raise exception 'HISTORICAL_POLICY: incomplete/changed installed markers';end if;
 return jsonb_build_object('installed',true,'policyId',i.policy_id,'policySha256',i.policy_sha256,'firstFantasyPlayedOn',i.first_fantasy_played_on,'markers',markers);
end $$;


create schema private_fcf_six_history;
revoke all on schema private_fcf_six_history from public,anon,authenticated,service_role;
create function private_fcf_six_history.unknown_result_allowed(rid bigint,h bigint,a bigint,report text,url text,day date,status text,reason text,phase text,rn int)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select rid is not null and h=8575 and a=8576 and report='es4109404' and url='https://www.fcf.cat/ca/competicio/acta/4109404' and day='2026-10-04'::date and status='unavailable_historical'and reason='closed_official_result_and_individual_statistics_unavailable'and phase is null and rn=3 and exists(select 1 from private_historical_statistics.markers k join private_historical_statistics.installed_policies i using(competition_id)join public.rounds r on r.id=k.round_id where k.competition_id=783 and k.round_id=rid and k.home_team_id=h and k.away_team_id=a and k.source_match_id='4109404'and k.source_report_id=report and k.raw_sha256='1a42a49bd0b55d0bd3a654a6e15b65f430a2c132e28813899205d394f05244dc'and i.policy_id='es-ct-segona-g1-six-reviewed-2026-10-19-v1'and i.policy_sha256='fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9'and r.competition_id=783 and r.season='2026/27'and r.number=3);
$$;
alter table public.matches alter column home_goals drop not null,alter column away_goals drop not null;
alter table public.matches add constraint paired_result_availability check((home_goals is not null and away_goals is not null)or(home_goals is null and away_goals is null and private_fcf_six_history.unknown_result_allowed(round_id,home_team_id,away_team_id,zapisnik_id,source_url,played_on,statistics_status,statistics_reason,source_phase,source_round)is true));
-- Separate authority for the user-approved six inactive FCF exclusions (five populated rows and one proven absence).
-- The common historical upsert continues to refuse populated rows.

revoke all on schema private_fcf_six_history from public,anon,authenticated,service_role;

create function private_fcf_six_history.cleanup_targets()
returns table(match_id bigint,competition_id bigint,competition_slug text,source_code text,round_id bigint,round_number integer,home_id bigint,away_id bigint,played_on date,home_goals integer,away_goals integer,native_id text,appearances integer,goals integer)
language sql immutable set search_path=public,pg_temp as $$
 values
 (321646::bigint,783::bigint,'es-ct-segona-g1','4109388-4109627',28706::bigint,1,8574::bigint,8575::bigint,'2026-09-20'::date,0,3,'4109388',31,4),
 (297199::bigint,790::bigint,'es-ct-tercera-g2','4116188-4116427',27227::bigint,4,8195::bigint,8188::bigint,'2026-10-10'::date,5,0,'4116215',33,4),
 (306164::bigint,797::bigint,'es-ct-tercera-g9','4118349-4118588',27616::bigint,1,8304::bigint,8305::bigint,'2026-09-19'::date,3,0,'4118352',32,5),
 (306166::bigint,797::bigint,'es-ct-tercera-g9','4118349-4118588',27616::bigint,1,7566::bigint,8308::bigint,'2026-09-19'::date,3,1,'4118354',31,4),
 (306171::bigint,797::bigint,'es-ct-tercera-g9','4118349-4118588',27617::bigint,2,8301::bigint,8298::bigint,'2026-09-26'::date,0,3,'4118358',30,1);
$$;

create function private_fcf_six_history.require(ok boolean,message text)returns void language plpgsql as $$begin
 if ok is distinct from true then raise exception 'FCF_HISTORY: %',message;end if;
end$$;

-- Capture complete original rows, never a projection that could hide changed statistics.
create function private_fcf_six_history.capture()returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb:='{}';q record;rows jsonb;
begin
 for q in select * from(values
 ('competitions','select * from public.competitions where id in(783,790,797)'),
 ('rounds','select * from public.rounds where competition_id in(783,790,797)'),
 ('matches','select m.* from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)'),
 ('teams','select t.* from public.teams t where t.id in(select m.home_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797) union select m.away_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797))'),
 ('players','select * from public.players where competition_id in(783,790,797)'),
 ('appearances','select * from public.appearances where match_id in(321646,297199,306164,306166,306171)'),
 ('goals','select * from public.goals where match_id in(321646,297199,306164,306166,306171)'),
 ('otherAppearances','select a.* from public.appearances a join public.matches m on m.id=a.match_id join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)and m.id not in(321646,297199,306164,306166,306171)'),
 ('otherGoals','select g.* from public.goals g join public.matches m on m.id=g.match_id join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)and m.id not in(321646,297199,306164,306166,306171)'),
 ('otherScores','select ps.* from public.player_scores ps join public.rounds r on r.id=ps.round_id where r.competition_id in(783,790,797)and r.id not in(28706,27227,27616,27617)'),
 ('player_scores','select ps.* from public.player_scores ps where ps.round_id in(28706,27227,27616,27617)'),
 ('statistika_igralcev','select s.* from public.statistika_igralcev s where s.player_id in(select id from public.players where competition_id in(783,790,797))'),
 ('tocke_krogov','select t.* from public.tocke_krogov t where t.round_id in(28706,27227,27616,27617)'),
 ('uradne_odsotnosti','select * from public.uradne_odsotnosti where ni_drzalo_match_id in(321646,297199,306164,306166,306171)'),
 ('profil_igralca_plus','select * from public.profil_igralca_plus where tekma_id in(321646,297199,306164,306166,306171)')
 )v(key,query)loop
  execute 'select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text collate "C"),''[]''::jsonb)from('||q.query||')t'into rows;
  result:=result||jsonb_build_object(q.key,rows);
 end loop;
 return result||jsonb_build_object('missing4109404',not exists(select 1 from matches where zapisnik_id='es4109404' or source_url='https://www.fcf.cat/ca/competicio/acta/4109404' or(home_team_id=8575 and away_team_id=8576 and round_id in(select id from rounds where competition_id=783 and season='2026/27'and number=3))),'installedPolicies',(select coalesce(jsonb_agg(to_jsonb(i)order by competition_id),'[]')from private_historical_statistics.installed_policies i where competition_id in(783,790,797)),'markers',(select coalesce(jsonb_agg(to_jsonb(i)order by competition_id,source_match_id),'[]')from private_historical_statistics.markers i where competition_id in(783,790,797)),'bindings',(select coalesce(jsonb_agg(to_jsonb(i)order by provider,source_club_id,source_category_id),'[]')from private_historical_statistics.source_club_bindings i where provider='fcf'));
end$$;

create function private_fcf_six_history.check_and_lock(p_main_sha text,p_policy_hashes jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare expected_hashes jsonb;n int;target record;policy record;e jsonb;catalog jsonb;b record;side record;
begin
 perform private_fcf_six_history.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 perform private_fcf_six_history.require(p_main_sha~'^[a-f0-9]{40}$','exact reviewed main commit required');
 -- A closed short maintenance transaction: block phantom users, votes, caches and
 -- FK/schema changes before the first identity read, including non-FK audit rows.
 lock table public.countries,public.competitions,public.rounds,public.teams,public.players,public.matches,
 public.appearances,public.goals,public.fantasy_teams,public.fantasy_roster,public.fantasy_lineups,public.fantasy_transfers,public.fantasy_chips,
 public.position_votes,public.position_votes_deleted,public.assist_votes,public.assist_votes_deleted,
 public.player_scores,public.statistika_igralcev,public.tocke_krogov,public.uradne_odsotnosti,public.profil_igralca_plus in share row exclusive mode;
 lock table private_historical_statistics.policies,private_historical_statistics.installed_policies,private_historical_statistics.markers,private_historical_statistics.source_club_bindings in share row exclusive mode;
 perform 1 from public.competitions where id in(783,790,797)order by id for update;
 select jsonb_object_agg(p.id,p.policy_sha256)into expected_hashes from private_historical_statistics.policies p
 where p.document->>'provider'='fcf'and p.document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'
 and p.document->>'competitionSlug'in('es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9');
 perform private_fcf_six_history.require((select count(*)from jsonb_object_keys(expected_hashes))=3 and p_policy_hashes=expected_hashes,'exact three immutable policy hashes required');
 perform private_fcf_six_history.require(not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(783,790,797)),'cleanup is one-use; installed policy already exists');
 for target in select * from private_fcf_six_history.cleanup_targets()order by match_id loop
  perform private_fcf_six_history.require(exists(select 1 from public.competitions c join public.countries d on d.id=c.country_id where c.id=target.competition_id and c.slug=target.competition_slug and c.source='fcf'and c.source_league_code=target.source_code and not c.sezona_koledarska and not c.active and c.source_policy is null and c.prvi_fantasy_krog=6 and d.code='ES'),'inactive exact FCF competition identity required');
  perform private_fcf_six_history.require(exists(select 1 from public.rounds r where r.id=target.round_id and r.competition_id=target.competition_id and r.number=target.round_number and r.season='2026/27'),'exact current round identity required');
  perform private_fcf_six_history.require(exists(select 1 from public.matches m where m.id=target.match_id and m.round_id=target.round_id and m.home_team_id=target.home_id and m.away_team_id=target.away_id and m.played_on=target.played_on and m.home_goals=target.home_goals and m.away_goals=target.away_goals and m.zapisnik_id='es'||target.native_id and m.source_url='https://www.fcf.cat/ca/competicio/acta/'||target.native_id and m.imported_at is not null and m.statistics_status='available'and m.statistics_reason is null and not m.kontumacija and not m.vir_brez_izida and m.source_phase is null and(m.source_round is null or m.source_round=target.round_number)),'exact original match/result/source identity required');
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug and p.document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1';
  select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'=target.native_id;
  perform private_fcf_six_history.require(e is not null and policy.document->>'season'='2026/27'and(e->>'sourceRound')::int=target.round_number and(e->>'playedOn')::date=target.played_on and(e->>'observedHomeScore')::int=target.home_goals and(e->>'observedAwayScore')::int=target.away_goals,'reviewed policy fixture identity differs');
  -- Preparation never binds/mutates clubs. The same immutable shared club
  -- descriptors must have exactly one canonical candidate, or an existing exact binding.
  for side in select e->>'homeSourceClubId'club,e->>'homeSourceCategoryId'category,target.home_id team union all select e->>'awaySourceClubId',e->>'awaySourceCategoryId',target.away_id loop
   select sb.*into b from private_historical_statistics.source_club_bindings sb where sb.provider='fcf'and sb.source_club_id=side.club and sb.source_category_id=side.category;
   perform private_fcf_six_history.require(b.provider is not null and b.country_code='ES'and exists(select 1 from teams t join countries d on d.id=t.country_id where t.id=side.team and d.code='ES')and
    ((b.bound_team_id is not null and b.bound_team_id=side.team)or(b.bound_team_id is null and(select count(*)from teams t join countries d on d.id=t.country_id where t.name=any(b.canonical_names)and d.code='ES')=1 and exists(select 1 from teams t where t.id=side.team and t.name=any(b.canonical_names)))),'exact native club/category identity required');
  end loop;
  perform private_fcf_six_history.require((select count(*)from public.appearances where match_id=target.match_id)=target.appearances and(select count(*)from public.goals where match_id=target.match_id)=target.goals,'exact approved 157 appearances and 18 goals required');
 end loop;
 perform private_fcf_six_history.require(not exists(select 1 from public.fantasy_teams where competition_id in(783,790,797)),'new fantasy team activity');
 perform private_fcf_six_history.require(not exists(select 1 from public.fantasy_roster fr join public.players p on p.id=fr.player_id where p.competition_id in(783,790,797)),'new roster activity');
 perform private_fcf_six_history.require(not exists(select 1 from public.fantasy_lineups l join public.rounds r on r.id=l.round_id join public.players p on p.id=l.player_id where r.competition_id in(783,790,797)or p.competition_id in(783,790,797)),'new lineup activity');
 perform private_fcf_six_history.require(not exists(select 1 from public.fantasy_transfers t join public.rounds r on r.id=t.round_id where r.competition_id in(783,790,797))and not exists(select 1 from public.fantasy_chips t join public.rounds r on r.id=t.round_id where r.competition_id in(783,790,797)),'new round fantasy activity');
 perform private_fcf_six_history.require(not exists(select 1 from public.position_votes v join public.players p on p.id=v.player_id where p.competition_id in(783,790,797))and not exists(select 1 from public.position_votes_deleted v join public.players p on p.id=v.player_id where p.competition_id in(783,790,797)),'new position vote activity');
 perform private_fcf_six_history.require(not exists(select 1 from public.assist_votes v join public.goals g on g.id=v.goal_id where g.match_id in(321646,297199,306164,306166,306171))and not exists(select 1 from public.assist_votes_deleted v join public.goals g on g.id=v.goal_id where g.match_id in(321646,297199,306164,306166,306171)),'new assist vote activity');
 perform private_fcf_six_history.require(not exists(select 1 from public.goals where match_id in(321646,297199,306164,306166,306171)and(assist_player_id is not null or assist_confirmed_at is not null or assist_none_confirmed_at is not null)),'new confirmed assist activity');
 -- Only this reviewed FK is permitted to point at a row being deleted. Unknown
 -- dependencies abort even if empty; never let a new cascade silently erase data.
 select coalesce(jsonb_agg(jsonb_build_object('schema',ns.nspname,'table',t.relname,'target',p.relname,'definition',pg_get_constraintdef(c.oid))order by ns.nspname,t.relname,c.conname),'[]')into catalog
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_class p on p.oid=c.confrelid
 where c.contype='f'and c.confrelid in('public.appearances'::regclass,'public.goals'::regclass,'public.player_scores'::regclass,'public.statistika_igralcev'::regclass,'public.tocke_krogov'::regclass);
 perform private_fcf_six_history.require(catalog='[{"schema":"public","table":"assist_votes","target":"goals","definition":"FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE"}]'::jsonb,'unexpected individual-row foreign key dependency');
 perform private_fcf_six_history.require(not exists(select 1 from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace ns on ns.oid=t.relnamespace where ns.nspname in('public','scout')and t.relkind in('r','p')and a.attnum>0 and not a.attisdropped and a.attname in('appearance_id','goal_id')and not(ns.nspname='public'and t.relname in('assist_votes','assist_votes_deleted')and a.attname='goal_id')),'unexpected individual-row reference column');
end$$;


insert into private_historical_statistics.source_club_bindings values
('fcf','5029','33592','ES',array['BESCANO, C.D.'],'[{"sourceMatchId":"4109389","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4109389","rawSha256":"5f102da312280ff3f4ff5f65bf067e8f71e9f0301c5bae5b578d81ed02f93e97","side":"away","round":1,"playedOn":"2026-09-19"}]',null),
('fcf','1372','19610692','ES',array['CAN VIDALET, C.F.'],'[{"sourceMatchId":"4118354","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118354","rawSha256":"f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556"}]',null),
('fcf','54319880','54709553','ES',array['ONA SANT ADRIA, F.C.'],'[{"sourceMatchId":"4118354","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118354","rawSha256":"f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556"}]',null);
create function private_fcf_six_history.missing_binding()returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 perform private_fcf_six_history.require(not exists(select 1 from matches where zapisnik_id='es4109404' or source_url='https://www.fcf.cat/ca/competicio/acta/4109404' or(home_team_id=8575 and away_team_id=8576 and round_id in(select id from rounds where competition_id=783 and season='2026/27'and number=3))),'exact unknown fixture absence required');
 perform private_fcf_six_history.require((select count(*)from rounds where competition_id=783 and season='2026/27'and number=3)=1,'unique native round3 required');
 perform private_fcf_six_history.require((select count(*)from matches m join rounds r on r.id=m.round_id where m.zapisnik_id='es4109396'and m.source_url='https://www.fcf.cat/ca/competicio/acta/4109396'and m.home_team_id=8575 and m.played_on='2026-09-27'and r.competition_id=783 and r.season='2026/27'and r.number=2)=1,'home club exact retained report/header-side native provenance');
 perform private_fcf_six_history.require((select count(*)from matches m join rounds r on r.id=m.round_id where m.zapisnik_id='es4109389'and m.source_url='https://www.fcf.cat/ca/competicio/acta/4109389'and m.away_team_id=8576 and m.played_on='2026-09-19'and r.competition_id=783 and r.season='2026/27'and r.number=1)=1,'away club exact retained report/header-side native provenance');
 perform private_fcf_six_history.require(not exists(select 1 from private_historical_statistics.source_club_bindings where provider='fcf'and((source_club_id='5057'and source_category_id='35522'and bound_team_id is not null and bound_team_id<>8575)or(source_club_id='5029'and source_category_id='33592'and bound_team_id is not null and bound_team_id<>8576))),'source/native club conflict');
end$$;
create function public.fcf_historical_six_prepare(p_main_sha text,p_policy_hashes jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare image jsonb;
begin
 perform private_fcf_six_target_release.lock_target(783);
 perform private_fcf_six_history.check_and_lock(p_main_sha,p_policy_hashes);
 perform private_fcf_six_history.require(not exists(select 1 from players where competition_id in(783,790,797)and anonimiziran_at is not null)and not exists(select 1 from anonimizirani_igralci a join players p on p.id=a.player_id where p.competition_id in(783,790,797)),'privacy suppression dependency');
 perform private_fcf_six_history.missing_binding();
 image:=private_fcf_six_history.capture()||jsonb_build_object('schemaVersion',2,'mainCommit',p_main_sha,'policyHashes',p_policy_hashes);
 return jsonb_build_object('beforeImage',image,'beforeImageText',image::text,'beforeSha256',encode(sha256(convert_to(image::text,'UTF8')),'hex'));
end$$;

create function private_fcf_six_history.apply_core(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare prepared jsonb;target record;policy record;e jsonb;fixture jsonb;pid bigint;rid bigint;n integer;preserved jsonb;p_before_image jsonb;
begin
 begin p_before_image:=p_before_image_text::jsonb;exception when invalid_text_representation then raise exception 'FCF_HISTORY: beforeimage must be SQL-produced JSON text';end;
 perform private_fcf_six_history.require(jsonb_typeof(p_before_image)='object','complete beforeimage object required');
 perform private_fcf_six_history.require(p_before_sha~'^[a-f0-9]{64}$'and p_before_image is not null and encode(sha256(convert_to(p_before_image::text,'UTF8')),'hex')=p_before_sha,'reviewed complete beforeimage SHA required');
 prepared:=public.fcf_historical_six_prepare(p_main_sha,p_policy_hashes);
 perform private_fcf_six_history.require(prepared->>'beforeSha256'=p_before_sha and prepared->'beforeImage'=p_before_image,'canonical beforeimage drift');
 -- All individual removals, cache corrections, policy installs and six markers
 -- commit together. No generic importer can observe an intermediate empty row.
 delete from public.goals where match_id in(321646,297199,306164,306166,306171);
 get diagnostics n=row_count;perform private_fcf_six_history.require(n=18,'goal delete count differs');
 delete from public.appearances where match_id in(321646,297199,306164,306166,306171);
 get diagnostics n=row_count;perform private_fcf_six_history.require(n=157,'appearance delete count differs');
 update public.matches set imported_at=null where id in(321646,297199,306164,306166,306171);
 update public.competitions set source_policy='es-fcf-six-reviewed-history-v1'where id in(783,790,797);
 for policy in select p.*,c.id as cid from private_historical_statistics.policies p join public.competitions c on c.slug=p.document->>'competitionSlug'where c.id in(783,790,797)and p.document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'order by c.id loop
  perform public.apply_historical_statistics_policy(policy.cid,policy.id,policy.policy_sha256,policy.document->'entries');
 end loop;
 for target in select * from private_fcf_six_history.cleanup_targets()order by match_id loop
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug and p.document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1';
  select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'=target.native_id;
  fixture:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',policy.document->>'season');
  perform private_fcf_six_history.upsert_unavailable_match(target.competition_id,target.native_id,policy.id,policy.policy_sha256,e->>'rawSha256',jsonb_build_object('roundId',target.round_id,'homeTeamId',target.home_id,'awayTeamId',target.away_id,'fixture',fixture));
 end loop;
 select p.*into policy from private_historical_statistics.policies p where p.id='es-ct-segona-g1-six-reviewed-2026-10-19-v1';
 select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'='4109404';
 fixture:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season','2026/27');
 perform private_fcf_six_history.upsert_unavailable_match(783,'4109404',policy.id,policy.policy_sha256,e->>'rawSha256',jsonb_build_object('roundId',(select id from rounds where competition_id=783 and season='2026/27'and number=3),'homeTeamId',8575,'awayTeamId',8576,'fixture',fixture));
 for rid in select distinct round_id from private_fcf_six_history.cleanup_targets()loop perform public.recompute_round_scores(rid);end loop;
 perform public.osvezi_statistiko_igralcev(array(select id from public.players where competition_id in(783,790,797)));
 perform public.osvezi_tocke_krogov(array[28706,27227,27616,27617]::bigint[]);
 perform private_fcf_six_history.require(not exists(select 1 from public.player_scores ps where ps.round_id in(28706,27227,27616,27617)and not exists(select 1 from public.appearance_points ap where ap.round_id=ps.round_id and ap.player_id=ps.player_id)),'stale derived individual scores');
 for pid in select unnest(array[783,790,797]::bigint[])loop perform public.get_installed_historical_statistics_markers(pid);end loop;
 preserved:=private_fcf_six_history.capture();
 perform private_fcf_six_history.require(preserved->'otherAppearances'=p_before_image->'otherAppearances'and preserved->'otherGoals'=p_before_image->'otherGoals'and preserved->'otherScores'=p_before_image->'otherScores'and preserved->'players'=p_before_image->'players'and preserved->'teams'=p_before_image->'teams'and preserved->'rounds'=p_before_image->'rounds'and preserved->'uradne_odsotnosti'=p_before_image->'uradne_odsotnosti'and preserved->'profil_igralca_plus'=p_before_image->'profil_igralca_plus','protected players/teams/rounds/profile references changed');
 perform private_fcf_six_history.require(not exists(select 1 from jsonb_array_elements(p_before_image->'matches')b where(b->>'id')::bigint not in(321646,297199,306164,306166,306171)and not exists(select 1 from jsonb_array_elements(preserved->'matches')a where a=b)),'unrelated match changed');
 return jsonb_build_object('schemaVersion',2,'mainCommit',p_main_sha,'beforeSha256',p_before_sha,'removedAppearances',157,'removedGoals',18,'unavailableMatches',6,'afterSha256',encode(sha256(convert_to(preserved::text,'UTF8')),'hex'));
end$$;

revoke all on all functions in schema private_fcf_six_history from public,anon,authenticated,service_role;
revoke all on function public.fcf_historical_six_prepare(text,jsonb),private_fcf_six_history.apply_core(text,jsonb,text,text)from public,anon,authenticated;
grant execute on function public.fcf_historical_six_prepare(text,jsonb),private_fcf_six_history.apply_core(text,jsonb,text,text)to service_role;
-- Current-only G1/G9 release. Source authentication is the reviewed Actions
-- reader boundary; this service-only transaction independently proves DB facts.
create schema private_fcf_six_target_release;
revoke all on schema private_fcf_six_target_release from public,anon,authenticated,service_role;
create table private_fcf_six_target_release.club_bindings(competition_id bigint not null references public.competitions,club_id text not null,category_id text not null,team_id bigint not null references public.teams,country_id bigint not null,source_fingerprint text not null,primary key(competition_id,club_id,category_id),unique(competition_id,team_id));
create table private_fcf_six_target_release.receipts(id bigint generated always as identity primary key,competition_id bigint not null references public.competitions,inventory_key text not null,packet_sha256 text not null,packet_text text not null,rollout_text text not null,rollout_sha256 text not null,source_fingerprint text not null,cleanup_before_sha256 text not null,imported_state_sha256 text not null,stage text not null check(stage in('imported','activated')),activation_result jsonb,created_at timestamptz not null default clock_timestamp(),unique(competition_id,inventory_key));
revoke all on all tables in schema private_fcf_six_target_release from public,anon,authenticated,service_role;
create function private_fcf_six_target_release.require(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FCF_TARGET: %',message;end if;end$$;
create function private_fcf_six_target_release.target_id(slug text)returns bigint language sql immutable as $$select case slug when 'es-ct-segona-g1'then 783::bigint when 'es-ct-tercera-g9'then 797::bigint end$$;
create function private_fcf_six_target_release.lock_target(cid bigint)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare catalog jsonb;
begin
 perform private_fcf_six_target_release.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 perform private_fcf_six_target_release.require(cid in(783,797),'exact G1/G9 target required');
 lock table countries,competitions,rounds,teams,players,matches,appearances,goals,fantasy_teams,fantasy_roster,fantasy_lineups,fantasy_transfers,fantasy_chips,position_votes,position_votes_deleted,assist_votes,assist_votes_deleted,player_scores,statistika_igralcev,tocke_krogov,uradne_odsotnosti,profil_igralca_plus,anonimizirani_igralci,federations in share row exclusive mode;
 lock table private_historical_statistics.policies,private_historical_statistics.installed_policies,private_historical_statistics.markers,private_historical_statistics.source_club_bindings,private_fcf_six_target_release.club_bindings,private_fcf_six_target_release.receipts in share row exclusive mode;
 perform 1 from competitions where id in(783,790,797)order by id for update;
 select coalesce(jsonb_agg(jsonb_build_object('schema',ns.nspname,'table',t.relname,'target',p.relname,'definition',pg_get_constraintdef(c.oid))order by ns.nspname,t.relname,c.conname),'[]')into catalog from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_class p on p.oid=c.confrelid where c.contype='f'and c.confrelid in('public.appearances'::regclass,'public.goals'::regclass,'public.player_scores'::regclass,'public.statistika_igralcev'::regclass,'public.tocke_krogov'::regclass);
 perform private_fcf_six_target_release.require(catalog='[{"schema":"public","table":"assist_votes","target":"goals","definition":"FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE"}]'::jsonb,'unreviewed individual-row FK dependency');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname in('public','scout')and t.relkind in('r','p')and a.attnum>0 and not a.attisdropped and a.attname in('appearance_id','goal_id')and not(n.nspname='public'and t.relname in('assist_votes','assist_votes_deleted')and a.attname='goal_id')),'unreviewed individual reference column');
end$$;

create function private_fcf_six_target_release.no_target_users(cid bigint)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 perform private_fcf_six_target_release.require(not exists(select 1 from fantasy_teams where competition_id=cid),'target fantasy teams including house teams');
 perform private_fcf_six_target_release.require(not exists(select 1 from fantasy_roster f join players p on p.id=f.player_id where p.competition_id=cid),'target roster activity');
 perform private_fcf_six_target_release.require(not exists(select 1 from fantasy_lineups f join rounds r on r.id=f.round_id join players p on p.id=f.player_id where r.competition_id=cid or p.competition_id=cid),'target lineup activity');
 perform private_fcf_six_target_release.require(not exists(select 1 from fantasy_transfers f join rounds r on r.id=f.round_id where r.competition_id=cid)and not exists(select 1 from fantasy_chips f join rounds r on r.id=f.round_id where r.competition_id=cid),'target transfer/chip activity');
 perform private_fcf_six_target_release.require(not exists(select 1 from position_votes v join players p on p.id=v.player_id where p.competition_id=cid)and not exists(select 1 from position_votes_deleted v join players p on p.id=v.player_id where p.competition_id=cid),'target position votes');
 perform private_fcf_six_target_release.require(not exists(select 1 from assist_votes v join goals g on g.id=v.goal_id join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=cid)and not exists(select 1 from assist_votes_deleted v join goals g on g.id=v.goal_id join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=cid),'target assist votes');
 perform private_fcf_six_target_release.require(not exists(select 1 from tocke_krogov t join rounds r on r.id=t.round_id where r.competition_id=cid),'target fantasy score cache activity');
 perform private_fcf_six_target_release.require(not exists(select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=cid and(g.assist_player_id is not null or g.assist_confirmed_at is not null or g.assist_none_confirmed_at is not null)),'target confirmed assists');
end$$;
create function private_fcf_six_target_release.markers()returns void language plpgsql security definer set search_path=public,pg_temp as $$declare t record;m jsonb;begin
 for t in select *from(values(783,array['4109388','4109404']), (790,array['4116215']), (797,array['4118352','4118354','4118358']))x(cid,ids)loop
  m:=public.get_installed_historical_statistics_markers(t.cid);
  perform private_fcf_six_target_release.require(m->'installed'='true'::jsonb and m->>'firstFantasyPlayedOn'='2026-10-24'and(select array_agg(x->>'sourceMatchId'order by x->>'sourceMatchId')from jsonb_array_elements(m->'markers')x)=t.ids,'complete immutable all-six cleanup required');
 end loop;
end$$;
create function private_fcf_six_target_release.validate(p_text text,p_sha text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;p jsonb;g jsonb;b jsonb;c competitions%rowtype;mp jsonb;policy private_historical_statistics.policies%rowtype;marker jsonb;due timestamptz;
begin
 perform private_fcf_six_target_release.require(p_sha~'^[a-f0-9]{64}$'and octet_length(p_text)<=8388608 and encode(sha256(convert_to(p_text,'UTF8')),'hex')=p_sha,'exact bounded rollout TEXT/SHA');v:=p_text::jsonb;
 perform private_fcf_six_target_release.require(v->>'schemaVersion'='2'and v->>'kind'='fcf-six-current-target-rollout'and v->>'sourceCommit'~'^[a-f0-9]{40}$'and(select array_agg(k order by k)from jsonb_object_keys(v)k)=array['cleanupBinding','execution','identityPlan','inventoryBinding','kind','readiness','schemaVersion','sourceCommit','targetPacketSha256','targetPacketText','targetSlug'],'closed new-inventory rollout schema');
 select *into c from competitions where id=private_fcf_six_target_release.target_id(v->>'targetSlug');
 perform private_fcf_six_target_release.require(c.id is not null and c.source='fcf'and c.source_policy='es-fcf-six-reviewed-history-v1'and c.source_league_code=case c.id when 783 then '4109388-4109627'else '4118349-4118588'end and not c.sezona_koledarska and c.rok_pomak_ur=6 and c.date_only_deadline_policy is null and exists(select 1 from countries where id=c.country_id and code='ES'),'exact current source/policy/calendar tuple');
 perform private_fcf_six_target_release.require(encode(sha256(convert_to(v->>'targetPacketText','UTF8')),'hex')=v->>'targetPacketSha256','nested packet TEXT/SHA');p:=(v->>'targetPacketText')::jsonb;g:=p->'target';b:=g->'sourceEvidence';
 perform private_fcf_six_target_release.require(p->>'schemaVersion'='3'and p->>'kind'='fcf-six-current-target-release'and p->>'targetSlug'=c.slug and p->>'sourceCommit'=v->>'sourceCommit'and(g->>'competitionId')::bigint=c.id and g->>'competitionSlug'=c.slug and g->>'season'='2026/27'and g->>'firstFantasyPlayedOn'='2026-10-24'and b=v->'inventoryBinding'and b->>'kind'='fcf-missing-target-admission'and b->>'targetSlug'=c.slug and b->>'sourceClaimState'='consumed'and b->>'sourceCommit'~'^[a-f0-9]{40}$'and b->>'sourceFingerprintSha256'~'^[a-f0-9]{64}$'and b->>'protocol'='six-reviewed-continuation-v1'and b->>'priorSourceGETs'='22'and(b->>'newSourceGETs')::int+22=(b->>'actualSourceGETs')::int and b->>'maximumSourceGETs'='478'and(b->>'actualSourceGETs')::int between 22 and 478 and b->'claimBinding'is not null and b->'consumptionBinding'is not null and b->'inventoryBinding'is not null and b->'auditBinding'is not null and b->'finalReceiptBinding'is not null,'authenticated new captured target identity required; legacy closed');
 perform private_fcf_six_target_release.require(p->'cleanupBinding'=v->'cleanupBinding'and v#>>'{cleanupBinding,phase}'='applied'and encode(sha256(convert_to(v#>>'{cleanupBinding,beforeImageText}','UTF8')),'hex')=v#>>'{cleanupBinding,beforeSha256}'and v#>>'{cleanupBinding,appliedReceipt,result,removedAppearances}'='157'and v#>>'{cleanupBinding,appliedReceipt,result,removedGoals}'='18'and v#>>'{cleanupBinding,appliedReceipt,result,unavailableMatches}'='6','opaque immutable all-six applied backup/receipt required');
 perform private_fcf_six_target_release.markers();select *into policy from private_historical_statistics.policies where id=g->>'policyId';
 perform private_fcf_six_target_release.require(policy.document->>'competitionSlug'=c.slug and policy.policy_sha256=g->>'policySha256','installed target policy/hash required');
 mp:=(v#>>'{identityPlan,mappingText}')::jsonb;
 perform private_fcf_six_target_release.require(encode(sha256(convert_to(v#>>'{identityPlan,mappingText}','UTF8')),'hex')=v#>>'{identityPlan,mappingSha256}'and mp->>'kind'='fcf-native-target-mapping'and mp->>'targetSlug'=c.slug and mp->>'sourceCommit'=v->>'sourceCommit'and mp->>'sourceFingerprintSha256'=b->>'sourceFingerprintSha256'and jsonb_array_length(mp->'mappings')=16 and jsonb_array_length(mp->'fixtures')=240,'reviewed native mapping text/identity required');
 drop table if exists pg_temp._fcf_clubs;create temporary table pg_temp._fcf_clubs on commit drop as select x->>'nativeClubId'club,x->>'nativeCategoryId'category,(x->>'teamId')::bigint team,x->>'sourceName'name,x->>'canonicalTeamName'canonical_name from jsonb_array_elements(mp->'mappings')x;
 perform private_fcf_six_target_release.require((select count(distinct(club,category))from pg_temp._fcf_clubs)=16 and(select count(distinct team)from pg_temp._fcf_clubs)=16 and not exists(select 1 from pg_temp._fcf_clubs n left join teams t on t.id=n.team where t.id is null or t.country_id<>c.country_id),'native club/team/country bijection required');
 drop table if exists pg_temp._fcf_expected;create temporary table pg_temp._fcf_expected(id text primary key,f jsonb,mid bigint unique,rid bigint,rn int,home bigint,away bigint)on commit drop;
 insert into pg_temp._fcf_expected select f->>'id',f,(x->>'matchId')::bigint,(x->>'roundId')::bigint,(f->>'round')::int,h.team,a.team from jsonb_array_elements(g->'fixtures')f join lateral(select value x from jsonb_array_elements(mp->'fixtures')where value->>'sourceMatchId'=f->>'id')map on true join pg_temp._fcf_clubs h on h.club=f#>>'{clubs,0,sourceClubId}'and h.category=f#>>'{clubs,0,sourceCategoryId}'join pg_temp._fcf_clubs a on a.club=f#>>'{clubs,1,sourceClubId}'and a.category=f#>>'{clubs,1,sourceCategoryId}';
 perform private_fcf_six_target_release.require((select count(*)from pg_temp._fcf_expected)=240 and(select count(*)from rounds where competition_id=c.id)=30 and(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=c.id)=240 and(select count(distinct(home,away))from pg_temp._fcf_expected)=240 and not exists(select 1 from pg_temp._fcf_expected e left join matches m on m.id=e.mid left join rounds r on r.id=e.rid where m.id is null or m.round_id<>e.rid or r.competition_id<>c.id or r.season<>'2026/27'or r.number<>e.rn or e.home=e.away or m.home_team_id<>e.home or m.away_team_id<>e.away or(m.zapisnik_id is not null and m.zapisnik_id<>e.id)or(m.imported_at is not null and e.f->>'statisticsStatus'='pending')or e.id!~'^es[1-9][0-9]*$'or substring(e.id from 3)::bigint not between(case c.id when 783 then 4109388 else 4118349 end)and(case c.id when 783 then 4109627 else 4118588 end)),'complete actual native240/30/calendar/import preservation required');
 perform private_fcf_six_target_release.require(not exists(select n from generate_series(1,30)n left join pg_temp._fcf_expected e on e.rn=n group by n having count(e.id)<>8 or count(distinct e.home)filter(where e.home is not null)>8 or count(distinct e.away)filter(where e.away is not null)>8)and not exists(select rn from(select rn,home team from pg_temp._fcf_expected union all select rn,away from pg_temp._fcf_expected)x group by rn having count(distinct team)<>16),'every club once per actual source round');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_expected e where e.f->>'statisticsStatus'not in('available','pending','unavailable_historical')or e.f->>'statisticsStatus'is null or e.f->>'statisticsStatus'<>'unavailable_historical'and(e.f#>>'{source,capturedUTC}'is null or(e.f#>>'{source,capturedUTC}')::timestamptz>clock_timestamp()or(e.f#>>'{source,capturedUTC}')::timestamptz<clock_timestamp()-interval '24 hours')),'strict current source clocks/status required');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_expected e where e.f->>'statisticsStatus'='pending'and clock_timestamp()-((e.f->>'date')::date::timestamp at time zone'UTC')between interval'-1 day'and interval'14 days'and(e.f#>>'{source,capturedUTC}')::timestamptz<clock_timestamp()-interval'1 hour'),'pending source provider one-hour freshness required');
 perform private_fcf_six_target_release.require((select array_agg(substring(id from 3)order by id)from pg_temp._fcf_expected where f->>'statisticsStatus'='unavailable_historical')=(select array_agg(x->>'sourceMatchId'order by x->>'sourceMatchId')from jsonb_array_elements(policy.document->'entries')x),'exact target historical exceptions only');
 for marker in select value from jsonb_array_elements(policy.document->'entries')loop
  perform private_fcf_six_target_release.require(exists(select 1 from pg_temp._fcf_expected where id='es'||(marker->>'sourceMatchId')and f->'appearances'='null'::jsonb and f->'goals'='null'::jsonb and f#>>'{source,rawSha256}'=marker->>'rawSha256'and f->>'statisticsReason'=marker->>'reasonCode'and f->'sourceFixture'=(marker-array['rawSha256','reasonCode'])||jsonb_build_object('season','2026/27')),'immutable unavailable header/hash/null facts required');
 end loop;
 drop table if exists pg_temp._fcf_apps;create temporary table pg_temp._fcf_apps on commit drop as select e.id,e.mid,e.rid,e.rn,e.f->>'date' as source_day,(x->>'regSt')::bigint reg,case x->>'ekipaIdx'when '0'then e.home when '1'then e.away end team,x from pg_temp._fcf_expected e cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'appearances'else '[]'::jsonb end)x;
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_apps where reg is null or reg<1 or team is null or x->>'ime'is null or jsonb_typeof(x->'zacetnik')is distinct from'boolean'or jsonb_typeof(x->'vratar')is distinct from'boolean'or jsonb_typeof(x->'cleanSheet')is distinct from'boolean'or exists(select 1 from unnest(array['goli','avtogoli','goliIzEnajstmetrovke','zgreseneEnajstmetrovke','rumeni','rdeci','prejetiGoli'])field where jsonb_typeof(x->field)is distinct from'number'or(x->>field)::int<0)or(x->>'minute')::int<0 or(x->>'minutaOd')::int<0 or(x->>'minutaDo')::int>90 or(x->>'minute')::int<>(x->>'minutaDo')::int-(x->>'minutaOd')::int)and not exists(select id,reg from pg_temp._fcf_apps group by id,reg having count(*)<>1),'native appearance identity/intervals');
 perform private_fcf_six_target_release.require(not exists(select id,team from pg_temp._fcf_apps group by id,team having count(*)filter(where(x->>'zacetnik')::boolean)<>11 or count(*)filter(where(x->>'zacetnik')::boolean and(x->>'vratar')::boolean)<>1)and not exists(select 1 from(select id,team,(x->>'minutaOd')::int a,(x->>'minutaDo')::int b,lag((x->>'minutaDo')::int,1,0)over(partition by id,team order by(x->>'minutaOd')::int,(x->>'minutaDo')::int)previous from pg_temp._fcf_apps where(x->>'vratar')::boolean and(x->>'minute')::int>0)k where a<>previous)and not exists(select id,team from pg_temp._fcf_apps where(x->>'vratar')::boolean and(x->>'minute')::int>0 group by id,team having max((x->>'minutaDo')::int)<>90),'explicit XI and continuous exactly-one source GK0-90');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_expected e where f->>'statisticsStatus'='available'and(rn>=6 or coalesce(f#>'{report,opozorila}','null')<>'[]'::jsonb or(select count(*)from pg_temp._fcf_apps a where a.id=e.id)<22)),'normal complete current reports only; no source-role repair');
 drop table if exists pg_temp._fcf_goals;create temporary table pg_temp._fcf_goals on commit drop as select e.id,e.mid,(ge.goal->>'regSt')::bigint reg,case ge.goal->>'ekipaIdx'when '0'then e.home when '1'then e.away end team,ge.goal as g from pg_temp._fcf_expected e cross join lateral jsonb_array_elements(case when f->>'statisticsStatus'='available'then f->'goals'else '[]'::jsonb end)ge(goal);
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_goals g where g.reg is null or not exists(select 1 from pg_temp._fcf_apps a where a.id=g.id and a.reg=g.reg and a.team=g.team and(g.g->>'minuta')::int between(a.x->>'minutaOd')::int and(a.x->>'minutaDo')::int))and not exists(select 1 from pg_temp._fcf_expected e where f->>'statisticsStatus'='available'and((select count(*)from pg_temp._fcf_goals g where g.id=e.id and case when(g.g->>'avtogol')::boolean then g.team=e.away else g.team=e.home end)<>(f->>'homeGoals')::int or(select count(*)from pg_temp._fcf_goals g where g.id=e.id and case when(g.g->>'avtogol')::boolean then g.team=e.home else g.team=e.away end)<>(f->>'awayGoals')::int)),'native goal actors/score accounting');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_apps a where(a.x->>'goli')::int<>(select count(*)from pg_temp._fcf_goals ge where ge.id=a.id and ge.reg=a.reg and not(ge.g->>'avtogol')::boolean)or(a.x->>'avtogoli')::int<>(select count(*)from pg_temp._fcf_goals ge where ge.id=a.id and ge.reg=a.reg and(ge.g->>'avtogol')::boolean)or(a.x->>'goliIzEnajstmetrovke')::int<>(select count(*)from pg_temp._fcf_goals ge where ge.id=a.id and ge.reg=a.reg and(ge.g->>'enajstmetrovka')::boolean and not(ge.g->>'avtogol')::boolean)),'native per-player goal event counters differ');
 perform private_fcf_six_target_release.require((select count(*)from pg_temp._fcf_expected where rn=6)=8 and not exists(select 1 from pg_temp._fcf_expected where rn=6 and(f->>'statisticsStatus'<>'pending'or f->>'time'is null or(f->>'date')::date<'2026-10-24'))and(select min((f->>'date')::date)from pg_temp._fcf_expected where rn=6)='2026-10-24','exact pending genuine future R6');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_expected e where e.rn=6 and(e.f->>'time'!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'or ((((e.f->>'date')::date+(e.f->>'time')::time)at time zone'Europe/Madrid')at time zone'Europe/Madrid')is distinct from((e.f->>'date')::date+(e.f->>'time')::time)or (((((e.f->>'date')::date+(e.f->>'time')::time)at time zone'Europe/Madrid')-interval'1 hour')at time zone'Europe/Madrid')=((e.f->>'date')::date+(e.f->>'time')::time)or (((((e.f->>'date')::date+(e.f->>'time')::time)at time zone'Europe/Madrid')+interval'1 hour')at time zone'Europe/Madrid')=((e.f->>'date')::date+(e.f->>'time')::time))),'unambiguous official R6 local kickoff required');
 select min(((e.f->>'date')::date+(e.f->>'time')::time)at time zone'Europe/Madrid')-interval '6 hours'into due from pg_temp._fcf_expected e where e.rn=6;
 perform private_fcf_six_target_release.require(due>clock_timestamp(),'source R6 deadline genuinely future');return v;
end$$;

create function private_fcf_six_target_release.privacy(cid bigint)returns void language plpgsql security definer set search_path=public,pg_temp as $$declare country bigint;begin
 select country_id into country from competitions where id=cid;
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_apps a join anonimizirani_igralci k on k.kljuc in(public.anonimizacijski_kljuc(country||'|reg|'||a.reg),public.anonimizacijski_kljuc(country||'|'||(a.x->>'ime')))join players p on p.id=k.player_id join competitions c on c.id=p.competition_id where c.country_id=country and(p.competition_id=cid or p.anonimiziran_razlog='ugovor')),'protected privacy/native identity; permitted restoration is a separate normal route');
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_apps a join players p on p.competition_id=cid and(p.reg_st=a.reg or(p.reg_st is null and p.full_name=a.x->>'ime'))where p.reg_st is null or p.anonimiziran_at is not null or p.anonimiziran_razlog is not null),'ambiguous or protected native player identity');
 perform private_fcf_six_target_release.require(not exists(select reg from pg_temp._fcf_apps where(source_day::date,reg)in(select max(source_day::date),reg from pg_temp._fcf_apps group by reg)group by reg having count(distinct team)>1),'same-date conflicting current native clubs');
end$$;
create function private_fcf_six_target_release.compare_canonical(cid bigint)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_expected e join matches m on m.id=e.mid where m.played_on is distinct from(e.f->>'date')::date or m.source_url is distinct from e.f#>>'{source,sourceUrl}'or m.zapisnik_id is distinct from e.id or m.kontumacija or m.vir_brez_izida or m.source_phase is not null or m.source_round is distinct from e.rn or(e.f->>'statisticsStatus'='available'and(m.imported_at is null or m.statistics_status<>'available'or m.statistics_reason is not null or m.home_goals is distinct from(e.f->>'homeGoals')::int or m.away_goals is distinct from(e.f->>'awayGoals')::int or m.import_warnings<>array[]::text[]))or(e.f->>'statisticsStatus'='pending'and(m.imported_at is not null or m.home_goals<>0 or m.away_goals<>0))),'persisted native fixture/clock/status/result mismatch');
 perform private_fcf_six_target_release.require(not exists(with expected as(select mid,reg,team,(x->>'st')::int shirt_number,(x->>'zacetnik')::boolean started,(x->>'minutaOd')::int minute_on,(x->>'minutaDo')::int minute_off,(x->>'minute')::int minutes_played,(x->>'goli')::int goals,(x->>'avtogoli')::int own_goals,(x->>'goliIzEnajstmetrovke')::int penalties_scored,(x->>'zgreseneEnajstmetrovke')::int penalties_missed,(x->>'rumeni')::int yellow_cards,(x->>'rdeci')::int red_cards,(x->>'prejetiGoli')::int goals_conceded,(x->>'cleanSheet')::boolean clean_sheet,(x->>'vratar')::boolean is_goalkeeper from pg_temp._fcf_apps),actual as(select a.match_id,p.reg_st,a.team_id,a.shirt_number,a.started,a.minute_on,a.minute_off,a.minutes_played,a.goals,a.own_goals,a.penalties_scored,a.penalties_missed,a.yellow_cards,a.red_cards,a.goals_conceded,a.clean_sheet,a.is_goalkeeper from appearances a join players p on p.id=a.player_id where a.match_id in(select mid from pg_temp._fcf_expected)) (select *from expected except all select *from actual)union all(select *from actual except all select *from expected)),'complete native appearance multiset mismatch');
 perform private_fcf_six_target_release.require(not exists(with expected as(select mid,reg,team,(g->>'minuta')::int as event_minute,(g->>'avtogol')::boolean own_goal,(g->>'enajstmetrovka')::boolean penalty,(g#>>'{rezultat,0}')::int score_home,(g#>>'{rezultat,1}')::int score_away from pg_temp._fcf_goals),actual as(select g.match_id,p.reg_st,g.team_id,g.minute,g.is_own_goal,g.is_penalty,g.score_home,g.score_away from goals g join players p on p.id=g.scorer_id where g.match_id in(select mid from pg_temp._fcf_expected)) (select *from expected except all select *from actual)union all(select *from actual except all select *from expected)),'complete native goal multiset mismatch');
 perform private_fcf_six_target_release.require(not exists(select 1 from appearances a join players p on p.id=a.player_id where a.match_id in(select mid from pg_temp._fcf_expected)and p.competition_id<>cid)and not exists(select 1 from players p join appearances a on a.player_id=p.id join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where p.competition_id=cid and r.competition_id<>cid),'cross-target native player reference');
 perform private_fcf_six_target_release.require(not exists(with expected as(select ap.player_id,ap.round_id,sum(ap.points)points from appearance_points ap where ap.round_id in(select rid from pg_temp._fcf_expected)group by ap.player_id,ap.round_id),actual as(select player_id,round_id,points from player_scores where round_id in(select rid from pg_temp._fcf_expected))(select *from expected except all select *from actual)union all(select *from actual except all select *from expected)),'derived player_scores differ');
 perform private_fcf_six_target_release.require(not exists(with expected as(select to_jsonb(s)||jsonb_build_object('last_round',coalesce((select ps.points from player_scores ps join rounds r on r.id=ps.round_id where ps.player_id=s.player_id and r.season=s.season order by r.number desc limit 1),0),'form',coalesce((select sum(z.points)from(select ps.points from player_scores ps join rounds r on r.id=ps.round_id where ps.player_id=s.player_id and r.season=s.season order by r.number desc limit 3)z),0))x from player_season_stats_izracun s where competition_id=cid),actual as(select to_jsonb(s)x from statistika_igralcev s where competition_id=cid)(select *from expected except all select *from actual)union all(select *from actual except all select *from expected)),'derived current statistics differ');
end$$;

create function public.fcf_six_current_target_import(p_rollout_text text,p_sha256 text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;cid bigint;c competitions%rowtype;rec private_fcf_six_target_release.receipts%rowtype;k text;f record;x record;current_player players%rowtype;pid bigint;apps jsonb;gs jsonb;due timestamptz;rid bigint;result jsonb;
begin
 cid:=private_fcf_six_target_release.target_id(p_rollout_text::jsonb->>'targetSlug');perform private_fcf_six_target_release.lock_target(cid);v:=private_fcf_six_target_release.validate(p_rollout_text,p_sha256);select *into c from competitions where id=cid;
 k:=encode(sha256(convert_to((v->'inventoryBinding')::text,'UTF8')),'hex');select *into rec from private_fcf_six_target_release.receipts where competition_id=cid and inventory_key=k;
 if rec.id is not null then
  perform private_fcf_six_target_release.require(rec.packet_sha256=v->>'targetPacketSha256','different already accepted target packet');perform private_fcf_six_target_release.compare_canonical(cid);
  return jsonb_build_object('stage',rec.stage,'targetSlug',c.slug,'receiptId',rec.id::text,'noOp',true,'targetPacketSha256',rec.packet_sha256);
 end if;
 perform private_fcf_six_target_release.require(not c.active and v->'readiness'='null'::jsonb and not exists(select 1 from private_fcf_six_target_release.receipts where competition_id=cid),'inactive new target import only');perform private_fcf_six_target_release.no_target_users(cid);perform private_fcf_six_target_release.privacy(cid);
 perform private_fcf_six_target_release.require(not exists(select 1 from pg_temp._fcf_clubs n join private_fcf_six_target_release.club_bindings b on b.competition_id=cid and b.club_id=n.club and b.category_id=n.category where b.team_id<>n.team or b.country_id<>c.country_id),'immutable private native binding conflict');
 insert into private_fcf_six_target_release.club_bindings select cid,n.club,n.category,n.team,c.country_id,v#>>'{inventoryBinding,sourceFingerprintSha256}'from pg_temp._fcf_clubs n on conflict do nothing;
 for x in select distinct on(aa.reg)aa.reg,aa.team,aa.x from pg_temp._fcf_apps aa order by aa.reg,aa.source_day::date desc,aa.id desc loop
  select *into current_player from players where competition_id=cid and reg_st=x.reg;
  if current_player.id is null then
   insert into players(competition_id,team_id,reg_st,full_name,first_name,last_name,position,position_source)values(cid,x.team,x.reg,x.x->>'ime',regexp_replace(x.x->>'ime','^\S+\s*',''),split_part(x.x->>'ime',' ',1),case when exists(select 1 from pg_temp._fcf_apps aa where aa.reg=x.reg and(aa.x->>'vratar')::boolean)then 'GK'end,case when exists(select 1 from pg_temp._fcf_apps aa where aa.reg=x.reg and(aa.x->>'vratar')::boolean)then 'zapisnik'else 'neznano'end);
  else
   update players set team_id=x.team,shirt_number=(x.x->>'st')::int,active=case when odsel_at is null and izstopil_at is null then true else active end,position=case when position_source is distinct from 'admin'and(position is null or position_source in('neznano','ugibanje'))and exists(select 1 from pg_temp._fcf_apps aa where aa.reg=x.reg and(aa.x->>'vratar')::boolean)then 'GK'else position end,position_source=case when position_source is distinct from 'admin'and(position is null or position_source in('neznano','ugibanje'))and exists(select 1 from pg_temp._fcf_apps aa where aa.reg=x.reg and(aa.x->>'vratar')::boolean)then 'zapisnik'else position_source end where id=current_player.id;
  end if;
 end loop;
 update players set active=false where competition_id=cid and team_id not in(select team from pg_temp._fcf_clubs);
 for f in select *from pg_temp._fcf_expected order by id loop
  if f.f->>'statisticsStatus'='unavailable_historical'then continue;end if;
  update matches set played_on=(f.f->>'date')::date,home_goals=case when f.f->>'statisticsStatus'='pending'then 0 else(f.f->>'homeGoals')::int end,away_goals=case when f.f->>'statisticsStatus'='pending'then 0 else(f.f->>'awayGoals')::int end,zapisnik_id=f.id,source_url=f.f#>>'{source,sourceUrl}',source_round=f.rn,source_phase=null,imported_at=case when f.f->>'statisticsStatus'='available'then clock_timestamp()end,import_warnings=array[]::text[],statistics_status='available',statistics_reason=null where id=f.mid;
  select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'team_id',a.team,'shirt_number',a.x->'st','started',a.x->'zacetnik','minute_on',a.x->'minutaOd','minute_off',a.x->'minutaDo','minutes_played',a.x->'minute','goals',a.x->'goli','own_goals',a.x->'avtogoli','penalties_scored',a.x->'goliIzEnajstmetrovke','penalties_missed',a.x->'zgreseneEnajstmetrovke','yellow_cards',a.x->'rumeni','red_cards',a.x->'rdeci','goals_conceded',a.x->'prejetiGoli','clean_sheet',a.x->'cleanSheet','is_goalkeeper',a.x->'vratar')),'[]')into apps from pg_temp._fcf_apps a join players p on p.competition_id=cid and p.reg_st=a.reg where a.id=f.id;
  select coalesce(jsonb_agg(jsonb_build_object('scorer_id',p.id,'team_id',g.team,'minute',g.g->'minuta','is_own_goal',g.g->'avtogol','is_penalty',g.g->'enajstmetrovka','score_home',g.g#>'{rezultat,0}','score_away',g.g#>'{rezultat,1}')),'[]')into gs from pg_temp._fcf_goals g join players p on p.competition_id=cid and p.reg_st=g.reg where g.id=f.id;
  perform public.zamenjaj_nastope_tekme(f.mid,apps,gs);
 end loop;
 select min(((e.f->>'date')::date+(e.f->>'time')::time)at time zone'Europe/Madrid')-interval '6 hours'into due from pg_temp._fcf_expected e where e.rn=6;
 select id into rid from rounds where competition_id=cid and season='2026/27'and number=6 and lineups_locked_at is null and deadline_at>clock_timestamp();perform private_fcf_six_target_release.require(rid is not null,'never reopen a locked/expired R6');update rounds set played_on='2026-10-24',deadline_at=due where id=rid;update competitions set prvi_fantasy_krog=6 where id=cid;
 for rid in select id from rounds where competition_id=cid loop perform public.recompute_round_scores(rid);end loop;perform public.osvezi_statistiko_igralcev(array(select id from players where competition_id=cid));
 perform private_fcf_six_target_release.compare_canonical(cid);
 insert into private_fcf_six_target_release.receipts(competition_id,inventory_key,packet_sha256,packet_text,rollout_text,rollout_sha256,source_fingerprint,cleanup_before_sha256,imported_state_sha256,stage)values(cid,k,v->>'targetPacketSha256',v->>'targetPacketText',p_rollout_text,p_sha256,v#>>'{inventoryBinding,sourceFingerprintSha256}',v#>>'{cleanupBinding,beforeSha256}',private_historical_statistics.state_sha256(cid),'imported')returning *into rec;
 return jsonb_build_object('stage','imported','targetSlug',c.slug,'receiptId',rec.id::text,'targetPacketSha256',rec.packet_sha256,'normalReports',(select count(*)from pg_temp._fcf_expected e where e.f->>'statisticsStatus'='available'),'fixtures',240,'nativeClubs',16);
end$$;

create function private_fcf_six_target_release.pricing_snapshot(cid bigint)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('stateSha256',private_historical_statistics.state_sha256(cid),'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'competition_id',p.competition_id,'team_id',p.team_id,'reg_st',p.reg_st,'active',p.active,'position',p.position,'position_source',p.position_source,'value',p.value,'value_start',p.value_start,'value_locked',p.value_locked,'nzs_top_league',p.nzs_top_league,'nzs_top_league_minutes',p.nzs_top_league_minutes)order by p.id),'[]')from players p where competition_id=cid),'statistics',(select coalesce(jsonb_agg(to_jsonb(s)order by player_id,season),'[]')from player_season_stats s where competition_id=cid),'priorCompetitions',(select coalesce(jsonb_agg(to_jsonb(c)order by c.id),'[]')from competitions c where country_id=(select country_id from competitions where id=cid)),'priorFederations',(select coalesce(jsonb_agg(to_jsonb(f)order by f.id),'[]')from federations f where country_id=(select country_id from competitions where id=cid)),'priorPlayers',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'competition_id',p.competition_id,'reg_st',p.reg_st,'active',p.active,'position',p.position,'value',p.value)order by p.id),'[]')from players p join competitions c on c.id=p.competition_id where c.country_id=(select country_id from competitions where id=cid)and c.source='fcf'and c.id<>cid and p.reg_st in(select reg_st from players where competition_id=cid)and p.anonimiziran_at is null),'priorStatistics',(select coalesce(jsonb_agg(to_jsonb(s)order by s.player_id,s.season),'[]')from player_season_stats s join players p on p.id=s.player_id join competitions c on c.id=p.competition_id where c.country_id=(select country_id from competitions where id=cid)and c.source='fcf'and c.id<>cid and p.reg_st in(select reg_st from players where competition_id=cid)and p.anonimiziran_at is null));
$$;
create function public.fcf_six_current_target_pricing(p_slug text)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare cid bigint;s text;begin
 cid:=private_fcf_six_target_release.target_id(p_slug);perform private_fcf_six_target_release.require(cid is not null and current_setting('transaction_read_only')='on','explicit readonly transaction required');s:=private_fcf_six_target_release.pricing_snapshot(cid)::text;
 return jsonb_build_object('snapshotText',s,'snapshotSha256',encode(sha256(convert_to(s,'UTF8')),'hex'));
end$$;
create function public.fcf_six_current_target_inventory(p_slug text,p_privacy_keys text[])returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare cid bigint;c competitions%rowtype;stamp timestamptz:=clock_timestamp();result jsonb;begin
 cid:=private_fcf_six_target_release.target_id(p_slug);select *into c from competitions where id=cid;
 perform private_fcf_six_target_release.require(cid is not null and current_setting('transaction_read_only')='on'and c.source='fcf'and exists(select 1 from countries where id=c.country_id and code='ES')and p_privacy_keys is not null and cardinality(p_privacy_keys)<=20000 and not exists(select 1 from unnest(p_privacy_keys)k where k!~'^[a-f0-9]{64}$'),'closed explicit readonly native/privacy inventory required');
 select jsonb_build_object('capturedUTC',stamp,'method','explicitBEGIN_READ_ONLY_ROLLBACK','groups',(select jsonb_agg(jsonb_build_object('id',co.id,'slug',co.slug,'country_id',co.country_id,'active',co.active,'source',co.source,'sourceLeagueCode',co.source_league_code,'sezona_koledarska',co.sezona_koledarska,'source_policy',co.source_policy,'nativeImportedIDs',coalesce((select jsonb_agg(substring(m.zapisnik_id from 3)order by m.zapisnik_id)from matches m join rounds r on r.id=m.round_id where r.competition_id=co.id and m.imported_at is not null and m.zapisnik_id is not null),'[]')))from competitions co where co.id in(783,790,797)),'teams',(select jsonb_agg(to_jsonb(t)||jsonb_build_object('competition_id',cid)order by t.id)from teams t where t.id in(select m.home_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=cid union select m.away_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=cid)),'rounds',(select jsonb_agg(to_jsonb(r)order by number)from rounds r where competition_id=cid),'matches',(select jsonb_agg(to_jsonb(m)order by m.id)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid),'players',(select coalesce(jsonb_agg(to_jsonb(p)order by id),'[]')from players p where competition_id=cid),'installedMarkers',(select jsonb_agg(public.get_installed_historical_statistics_markers(co.id)order by co.id)from competitions co where co.id in(783,790,797)),'existingExceptionBindings',(select jsonb_agg(to_jsonb(b)order by source_club_id,source_category_id)from private_historical_statistics.source_club_bindings b where provider='fcf'),'identityPrivacy',jsonb_build_object('schemaVersion',1,'kind','fcf-native-privacy-projection','countryCode','ES','countryId',c.country_id,'targetCompetitionId',cid,'method','explicitBEGIN_READ_ONLY_ROLLBACK','capturedUTC',stamp,'complete',true,'checkedKeys',to_jsonb(p_privacy_keys),'matches',(select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'competition_id',p.competition_id,'country_id',co.country_id,'kljuc',k.kljuc,'anonimiziran_at',p.anonimiziran_at,'anonimiziran_razlog',p.anonimiziran_razlog)order by p.id,k.kljuc),'[]')from anonimizirani_igralci k join players p on p.id=k.player_id join competitions co on co.id=p.competition_id where co.country_id=c.country_id and k.kljuc=any(p_privacy_keys)and p.anonimiziran_at is not null)))into result;
 return result;
end$$;
create function public.fcf_six_current_target_check(p_rollout_text text,p_sha256 text,p_activate boolean default false)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare cid bigint;v jsonb;c competitions%rowtype;rec private_fcf_six_target_release.receipts%rowtype;prices jsonb;cost numeric;deadline timestamptz;official timestamptz;locked timestamptz;result jsonb;snapshot text;k text;
begin
 cid:=private_fcf_six_target_release.target_id(p_rollout_text::jsonb->>'targetSlug');perform private_fcf_six_target_release.lock_target(cid);v:=private_fcf_six_target_release.validate(p_rollout_text,p_sha256);select *into c from competitions where id=cid;
 k:=encode(sha256(convert_to((v->'inventoryBinding')::text,'UTF8')),'hex');select *into rec from private_fcf_six_target_release.receipts where competition_id=cid and inventory_key=k;
 perform private_fcf_six_target_release.require(rec.id is not null and rec.packet_sha256=v->>'targetPacketSha256'and rec.cleanup_before_sha256=v#>>'{cleanupBinding,beforeSha256}','matching committed native import receipt required');
 if rec.stage='activated'then perform private_fcf_six_target_release.require(c.active,'activation receipt/state drift');return rec.activation_result||jsonb_build_object('noOp',true);end if;
 perform private_fcf_six_target_release.require(not c.active and c.prvi_fantasy_krog=6,'selected target remains inactive/current R6');perform private_fcf_six_target_release.no_target_users(cid);perform private_fcf_six_target_release.privacy(cid);perform private_fcf_six_target_release.compare_canonical(cid);
 perform private_fcf_six_target_release.require((select count(*)from private_fcf_six_target_release.club_bindings where competition_id=cid)=16 and not exists(select 1 from pg_temp._fcf_clubs n left join private_fcf_six_target_release.club_bindings b on b.competition_id=cid and b.club_id=n.club and b.category_id=n.category and b.team_id=n.team and b.country_id=c.country_id where b.team_id is null),'full installed native club binding equality');
 snapshot:=private_fcf_six_target_release.pricing_snapshot(cid)::text;
 perform private_fcf_six_target_release.require(jsonb_typeof(v->'readiness')='object'and v#>>'{readiness,modelSha256}'~'^[a-f0-9]{64}$'and v#>>'{readiness,pricingSnapshotText}'=snapshot and v#>>'{readiness,pricingSnapshotSha256}'=encode(sha256(convert_to(snapshot,'UTF8')),'hex'),'full actual pricing dependency snapshot differs');
 perform private_fcf_six_target_release.require(not exists(with expected as(select(x->>'id')::bigint id,(x->>'value')::numeric value,(x->>'value_start')::numeric value_start,x->>'position'position,x->>'position_source'position_source from jsonb_array_elements(v#>'{readiness,priceVector}')x),actual as(select id,value,value_start,position,position_source from players where competition_id=cid)(select *from expected except all select *from actual)union all(select *from actual except all select *from expected)),'recomputed full price/provenance vector mismatch');
 perform private_fcf_six_target_release.require(not exists(select 1 from players p where p.competition_id=cid and p.active and p.team_id not in(select team from pg_temp._fcf_clubs))and not exists(select 1 from pg_temp._fcf_apps a join players p on p.competition_id=cid and p.reg_st=a.reg where(a.x->>'zacetnik')::boolean and(a.x->>'vratar')::boolean and p.active and p.position is distinct from 'GK')and not exists(select 1 from pg_temp._fcf_clubs n where not exists(select 1 from pg_temp._fcf_apps a join players p on p.competition_id=cid and p.reg_st=a.reg where a.team=n.team and p.team_id=n.team and p.active and p.position='GK'and(a.x->>'zacetnik')::boolean and(a.x->>'vratar')::boolean)),'current selectable clubs/official source keepers');
 prices:=public.stanje_lige(cid);cost:=public.najcenejsi_kader(prices->'igralci');perform private_fcf_six_target_release.require((prices->>'klubov')::int=16 and cost is not null and cost<=100 and(prices->>'najvisja_cena')::numeric>=8 and coalesce((prices->>'privzetih')::numeric/nullif((prices->>'aktivnih')::numeric,0),1)<=0.7 and(prices->>'golov_brez_nastopa')::int=0,'actual varied prices and affordable legal15 required');
 perform private_fcf_six_target_release.require(jsonb_array_length(v#>'{readiness,squad}')=15 and(select count(distinct(x->>'id')::bigint)from jsonb_array_elements(v#>'{readiness,squad}')x)=15 and not exists(select 1 from jsonb_array_elements(v#>'{readiness,squad}')x where not exists(select 1 from jsonb_array_elements(prices->'igralci')p where p->'id'=x->'id'))and(select sum((p->>'value')::numeric)from jsonb_array_elements(prices->'igralci')p where(p->>'id')::bigint in(select(x->>'id')::bigint from jsonb_array_elements(v#>'{readiness,squad}')x))<=100,'actual unique affordable witness required');
 perform private_fcf_six_target_release.require(not exists(select p->>'team_id'from jsonb_array_elements(prices->'igralci')p where(p->>'id')::bigint in(select(x->>'id')::bigint from jsonb_array_elements(v#>'{readiness,squad}')x)group by p->>'team_id'having count(*)>3)and not exists(select q.position from(values('GK',2),('DEF',5),('MID',5),('FWD',3))q(position,n)where(select count(*)from jsonb_array_elements(prices->'igralci')p where p->>'position'=q.position and(p->>'id')::bigint in(select(x->>'id')::bigint from jsonb_array_elements(v#>'{readiness,squad}')x))<>q.n),'legal15 actual position quotas/club limit');
 select deadline_at,lineups_locked_at into deadline,locked from rounds where competition_id=cid and season='2026/27'and number=6;select min(((f->>'date')::date+(f->>'time')::time)at time zone'Europe/Madrid')-interval '6 hours'into official from pg_temp._fcf_expected where rn=6;
 perform private_fcf_six_target_release.require(deadline=official and deadline>clock_timestamp()and locked is null,'future unlocked official R6 deadline required');
 result:=jsonb_build_object('stage',case when p_activate then 'activated'else 'checked'end,'targetSlug',c.slug,'receiptId',rec.id::text,'targetPacketSha256',rec.packet_sha256,'sourceFingerprintSha256',rec.source_fingerprint,'fixtures',240,'nativeClubs',16,'cheapestLegal15',cost,'firstFantasyRound',6,'deadlineAt',deadline,'active',p_activate);
 if p_activate then
  perform private_historical_statistics.authorize_release(cid,((v->>'targetPacketText')::jsonb)#>>'{target,policyId}',((v->>'targetPacketText')::jsonb)#>>'{target,policySha256}',v->>'targetPacketSha256');update competitions set active=true where id=cid and not active;
  perform private_fcf_six_target_release.require(found and exists(select 1 from competitions c2 join rounds r on r.competition_id=c2.id and r.number=6 and r.season='2026/27'where c2.id=cid and c2.active and c2.prvi_fantasy_krog=6 and r.deadline_at=deadline and r.deadline_at>clock_timestamp()and r.lineups_locked_at is null),'same-TX active future deadline readback');
  update private_fcf_six_target_release.receipts set stage='activated',activation_result=result where id=rec.id;
 end if;return result;
end$$;
create function public.fcf_six_current_target_receipt(p_slug text)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select coalesce((select (to_jsonb(r)-array['packet_text','rollout_text','rollout_sha256'])||jsonb_build_object('rolloutText',r.rollout_text,'rolloutSha256',r.rollout_sha256,'currentActive',c.active,'currentStateSha256',private_historical_statistics.state_sha256(c.id),'canonicalVerified',false)from private_fcf_six_target_release.receipts r join competitions c on c.id=r.competition_id where r.competition_id=private_fcf_six_target_release.target_id(p_slug)),'null')$$;
-- The separate six-policy cleanup retains its native before-image. This
-- receipt closes ambiguous-commit/failed-retention recovery without reapplying it.
create table private_fcf_six_target_release.cleanup_receipt(singleton boolean primary key default true check(singleton),main_commit text not null,policy_hashes jsonb not null,before_sha256 text not null,before_image_text text not null,result jsonb not null,after_image jsonb not null,restored boolean not null default false);
revoke all on private_fcf_six_target_release.cleanup_receipt from public,anon,authenticated,service_role;
create function public.fcf_historical_six_apply(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r private_fcf_six_target_release.cleanup_receipt%rowtype;result jsonb;begin
 perform private_fcf_six_target_release.lock_target(783);lock table private_fcf_six_target_release.cleanup_receipt in share row exclusive mode;select *into r from private_fcf_six_target_release.cleanup_receipt;
 if r.singleton then
  perform private_fcf_six_target_release.require(not r.restored,'cleanup already restored');
  perform private_fcf_six_target_release.require(r.main_commit=p_main_sha and r.policy_hashes=p_policy_hashes and r.before_sha256=p_before_sha and r.before_image_text=p_before_image_text,'different already committed cleanup');perform private_fcf_six_target_release.markers();return r.result;
 end if;
 result:=private_fcf_six_history.apply_core(p_main_sha,p_policy_hashes,p_before_sha,p_before_image_text);perform private_fcf_six_target_release.markers();
 insert into private_fcf_six_target_release.cleanup_receipt values(true,p_main_sha,p_policy_hashes,p_before_sha,p_before_image_text,result,private_fcf_six_history.capture(),false);return result;
end$$;
revoke all on function public.fcf_historical_six_apply(text,jsonb,text,text)from public,anon,authenticated;
grant execute on function public.fcf_historical_six_apply(text,jsonb,text,text)to service_role;
revoke all on all functions in schema private_fcf_six_target_release from public,anon,authenticated,service_role;
revoke all on function public.fcf_six_current_target_import(text,text),public.fcf_six_current_target_check(text,text,boolean),public.fcf_six_current_target_inventory(text,text[]),public.fcf_six_current_target_pricing(text),public.fcf_six_current_target_receipt(text)from public,anon,authenticated;
grant execute on function public.fcf_six_current_target_import(text,text),public.fcf_six_current_target_check(text,text,boolean),public.fcf_six_current_target_inventory(text,text[]),public.fcf_six_current_target_pricing(text),public.fcf_six_current_target_receipt(text)to service_role;

create function public.get_installed_fcf_six_statistics_markers(p_competition_id bigint)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare m jsonb;begin
 m:=public.get_installed_historical_statistics_markers(p_competition_id);
 if m->>'installed'='true'and m->>'policyId'not in('es-ct-segona-g1-six-reviewed-2026-10-19-v1','es-ct-tercera-g2-six-reviewed-2026-10-19-v1','es-ct-tercera-g9-six-reviewed-2026-10-19-v1')then raise exception 'FCF_SIX: exact six policy required';end if;return m;
end$$;
create function private_fcf_six_history.upsert_unavailable_match(p_competition_id bigint,p_source_match_id text,p_policy_id text,p_policy_sha256 text,p_raw_sha256 text,p_header jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.competitions%rowtype;i private_historical_statistics.installed_policies%rowtype;p private_historical_statistics.policies%rowtype;e jsonb;f jsonb;mk private_historical_statistics.markers%rowtype;m public.matches%rowtype;r public.rounds%rowtype;home_id bigint;away_id bigint;report_id text;
begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'HISTORICAL_POLICY: READ COMMITTED required';end if;
 select * into c from public.competitions where id=p_competition_id for update;
 select * into i from private_historical_statistics.installed_policies where competition_id=c.id;
 select * into p from private_historical_statistics.policies where id=i.policy_id;
 if c.id is null or c.active or i.policy_id is distinct from p_policy_id or i.policy_sha256 is distinct from p_policy_sha256 or p.id is null
 or c.slug is distinct from p.document->>'competitionSlug' or c.source is distinct from p.document->>'provider' or c.source_policy is distinct from p.document->>'sourcePolicy'
 then raise exception 'HISTORICAL_POLICY: missing/wrong inactive installed binding';end if;
 select value into e from jsonb_array_elements(p.document->'entries')where value->>'sourceMatchId'=p_source_match_id;
 if e is null or p_raw_sha256 is distinct from e->>'rawSha256' then raise exception 'HISTORICAL_POLICY: unapproved match or raw hash';end if;
 f:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',p.document->>'season');
 if p_header->'fixture' is distinct from f or p_header-array['fixture','roundId','homeTeamId','awayTeamId']<>'{}'::jsonb then raise exception 'HISTORICAL_POLICY: fixture identity/header differs';end if;
 lock table public.countries,public.teams,public.rounds,public.fantasy_teams,public.appearances,public.goals in share mode;
 lock table public.matches in share row exclusive mode;
 select * into r from public.rounds where id=(p_header->>'roundId')::bigint;
 home_id:=(p_header->>'homeTeamId')::bigint;away_id:=(p_header->>'awayTeamId')::bigint;
 if r.id is null or r.competition_id<>c.id or r.season is distinct from p.document->>'season' or r.number is distinct from (e->>'sourceRound')::int
 or (e->>'playedOn')::date>=i.first_fantasy_played_on or home_id=away_id
 or (select count(*)from public.teams where id in(home_id,away_id)and country_id=c.country_id)<>2
 then raise exception 'HISTORICAL_POLICY: invalid DB fixture binding';end if;
 if exists(select 1 from public.fantasy_teams where competition_id=c.id)then raise exception 'HISTORICAL_POLICY: user-owned activity';end if;
 perform private_historical_statistics.bind_source_club(p.document->>'provider',e->>'homeSourceClubId',e->>'homeSourceCategoryId',c.country_id,home_id);
 perform private_historical_statistics.bind_source_club(p.document->>'provider',e->>'awaySourceClubId',e->>'awaySourceCategoryId',c.country_id,away_id);
 report_id:=case p.document->>'provider' when 'dfb' then 'de-dfb-'||p_source_match_id when 'hns' then p_source_match_id when 'fcf' then 'es'||p_source_match_id else null end;
 if report_id is null then raise exception 'HISTORICAL_POLICY: unknown report identity namespace';end if;
 if(select count(*)from public.matches where zapisnik_id=report_id or(round_id=r.id and home_team_id=home_id and away_team_id=away_id))>1 then raise exception 'HISTORICAL_POLICY: conflicting existing fixture';end if;
 select * into m from public.matches where zapisnik_id=report_id or(round_id=r.id and home_team_id=home_id and away_team_id=away_id)for update;
 if m.id is not null and(m.round_id<>r.id or m.home_team_id<>home_id or m.away_team_id<>away_id or m.imported_at is not null or(m.zapisnik_id is not null and m.zapisnik_id<>report_id)
 or exists(select 1 from public.appearances where match_id=m.id)or exists(select 1 from public.goals where match_id=m.id))then raise exception 'HISTORICAL_POLICY: existing populated/foreign fixture; no cleanup allowed';end if;
 if m.id is not null and(
 m.kontumacija or m.vir_brez_izida
 or(m.played_on is not null and m.played_on is distinct from(e->>'playedOn')::date)
 or(m.source_url is not null and m.source_url is distinct from e->>'sourceUrl')
 or(m.source_phase is not null and m.source_phase is distinct from e->>'sourcePhase')
 or(m.source_round is not null and m.source_round is distinct from(e->>'sourceRound')::int)
 or((m.home_goals is distinct from(e->>'observedHomeScore')::int or m.away_goals is distinct from(e->>'observedAwayScore')::int)
    and not(m.zapisnik_id is null and m.source_url is null and m.home_goals=0 and m.away_goals=0 and m.statistics_status='available'))
 )then raise exception 'HISTORICAL_POLICY: existing known fixture header conflicts; only empty schedule placeholders may be filled';end if;
 select * into mk from private_historical_statistics.markers where competition_id=c.id and source_match_id=p_source_match_id;
 if mk.competition_id is not null then
  if mk.fixture is distinct from f or mk.round_id<>r.id or mk.home_team_id<>home_id or mk.away_team_id<>away_id or mk.raw_sha256<>p_raw_sha256 then raise exception 'HISTORICAL_POLICY: immutable installed fixture differs';end if;
 else
  insert into private_historical_statistics.markers values(c.id,p_source_match_id,report_id,f,p_raw_sha256,r.id,home_id,away_id);
 end if;
 if m.id is null then
  insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,statistics_status,statistics_reason,source_phase,source_round)
  values(r.id,home_id,away_id,(e->>'observedHomeScore')::int,(e->>'observedAwayScore')::int,(e->>'playedOn')::date,report_id,e->>'sourceUrl','unavailable_historical',e->>'reasonCode',e->>'sourcePhase',(e->>'sourceRound')::int)returning * into m;
 else
  update public.matches set home_goals=(e->>'observedHomeScore')::int,away_goals=(e->>'observedAwayScore')::int,played_on=(e->>'playedOn')::date,zapisnik_id=report_id,source_url=e->>'sourceUrl',statistics_status='unavailable_historical',statistics_reason=e->>'reasonCode',source_phase=e->>'sourcePhase',source_round=(e->>'sourceRound')::int where id=m.id returning * into m;
 end if;
 return jsonb_build_object('matchId',m.id,'statisticsStatus',m.statistics_status,'policySha256',p.policy_sha256);
end $$;

create or replace function public.upsert_unavailable_historical_match(p_competition_id bigint,p_source_match_id text,p_policy_id text,p_policy_sha256 text,p_raw_sha256 text,p_header jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.competitions%rowtype;i private_historical_statistics.installed_policies%rowtype;p private_historical_statistics.policies%rowtype;e jsonb;f jsonb;mk private_historical_statistics.markers%rowtype;m public.matches%rowtype;r public.rounds%rowtype;home_id bigint;away_id bigint;report_id text;
begin
 if p_policy_id like '%-six-reviewed-%'then raise exception 'HISTORICAL_POLICY: six protocol requires dedicated cleanup';end if;
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'HISTORICAL_POLICY: READ COMMITTED required';end if;
 select * into c from public.competitions where id=p_competition_id for update;
 select * into i from private_historical_statistics.installed_policies where competition_id=c.id;
 select * into p from private_historical_statistics.policies where id=i.policy_id;
 if c.id is null or c.active or i.policy_id is distinct from p_policy_id or i.policy_sha256 is distinct from p_policy_sha256 or p.id is null
 or c.slug is distinct from p.document->>'competitionSlug' or c.source is distinct from p.document->>'provider' or c.source_policy is distinct from p.document->>'sourcePolicy'
 then raise exception 'HISTORICAL_POLICY: missing/wrong inactive installed binding';end if;
 select value into e from jsonb_array_elements(p.document->'entries')where value->>'sourceMatchId'=p_source_match_id;
 if e is null or p_raw_sha256 is distinct from e->>'rawSha256' then raise exception 'HISTORICAL_POLICY: unapproved match or raw hash';end if;
 f:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',p.document->>'season');
 if p_header->'fixture' is distinct from f or p_header-array['fixture','roundId','homeTeamId','awayTeamId']<>'{}'::jsonb then raise exception 'HISTORICAL_POLICY: fixture identity/header differs';end if;
 lock table public.countries,public.teams,public.rounds,public.fantasy_teams,public.appearances,public.goals in share mode;
 lock table public.matches in share row exclusive mode;
 select * into r from public.rounds where id=(p_header->>'roundId')::bigint;
 home_id:=(p_header->>'homeTeamId')::bigint;away_id:=(p_header->>'awayTeamId')::bigint;
 if r.id is null or r.competition_id<>c.id or r.season is distinct from p.document->>'season' or r.number is distinct from (e->>'sourceRound')::int
 or (e->>'playedOn')::date>=i.first_fantasy_played_on or home_id=away_id
 or (select count(*)from public.teams where id in(home_id,away_id)and country_id=c.country_id)<>2
 then raise exception 'HISTORICAL_POLICY: invalid DB fixture binding';end if;
 if exists(select 1 from public.fantasy_teams where competition_id=c.id)then raise exception 'HISTORICAL_POLICY: user-owned activity';end if;
 perform private_historical_statistics.bind_source_club(p.document->>'provider',e->>'homeSourceClubId',e->>'homeSourceCategoryId',c.country_id,home_id);
 perform private_historical_statistics.bind_source_club(p.document->>'provider',e->>'awaySourceClubId',e->>'awaySourceCategoryId',c.country_id,away_id);
 report_id:=case p.document->>'provider' when 'dfb' then 'de-dfb-'||p_source_match_id when 'hns' then p_source_match_id when 'fcf' then 'es'||p_source_match_id else null end;
 if report_id is null then raise exception 'HISTORICAL_POLICY: unknown report identity namespace';end if;
 if(select count(*)from public.matches where zapisnik_id=report_id or(round_id=r.id and home_team_id=home_id and away_team_id=away_id))>1 then raise exception 'HISTORICAL_POLICY: conflicting existing fixture';end if;
 select * into m from public.matches where zapisnik_id=report_id or(round_id=r.id and home_team_id=home_id and away_team_id=away_id)for update;
 if m.id is not null and(m.round_id<>r.id or m.home_team_id<>home_id or m.away_team_id<>away_id or m.imported_at is not null or(m.zapisnik_id is not null and m.zapisnik_id<>report_id)
 or exists(select 1 from public.appearances where match_id=m.id)or exists(select 1 from public.goals where match_id=m.id))then raise exception 'HISTORICAL_POLICY: existing populated/foreign fixture; no cleanup allowed';end if;
 if m.id is not null and(
 m.kontumacija or m.vir_brez_izida
 or(m.played_on is not null and m.played_on is distinct from(e->>'playedOn')::date)
 or(m.source_url is not null and m.source_url is distinct from e->>'sourceUrl')
 or(m.source_phase is not null and m.source_phase is distinct from e->>'sourcePhase')
 or(m.source_round is not null and m.source_round is distinct from(e->>'sourceRound')::int)
 or((m.home_goals is distinct from(e->>'observedHomeScore')::int or m.away_goals is distinct from(e->>'observedAwayScore')::int)
    and not(m.zapisnik_id is null and m.source_url is null and m.home_goals=0 and m.away_goals=0 and m.statistics_status='available'))
 )then raise exception 'HISTORICAL_POLICY: existing known fixture header conflicts; only empty schedule placeholders may be filled';end if;
 select * into mk from private_historical_statistics.markers where competition_id=c.id and source_match_id=p_source_match_id;
 if mk.competition_id is not null then
  if mk.fixture is distinct from f or mk.round_id<>r.id or mk.home_team_id<>home_id or mk.away_team_id<>away_id or mk.raw_sha256<>p_raw_sha256 then raise exception 'HISTORICAL_POLICY: immutable installed fixture differs';end if;
 else
  insert into private_historical_statistics.markers values(c.id,p_source_match_id,report_id,f,p_raw_sha256,r.id,home_id,away_id);
 end if;
 if m.id is null then
  insert into public.matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,statistics_status,statistics_reason,source_phase,source_round)
  values(r.id,home_id,away_id,(e->>'observedHomeScore')::int,(e->>'observedAwayScore')::int,(e->>'playedOn')::date,report_id,e->>'sourceUrl','unavailable_historical',e->>'reasonCode',e->>'sourcePhase',(e->>'sourceRound')::int)returning * into m;
 else
  update public.matches set home_goals=(e->>'observedHomeScore')::int,away_goals=(e->>'observedAwayScore')::int,played_on=(e->>'playedOn')::date,zapisnik_id=report_id,source_url=e->>'sourceUrl',statistics_status='unavailable_historical',statistics_reason=e->>'reasonCode',source_phase=e->>'sourcePhase',source_round=(e->>'sourceRound')::int where id=m.id returning * into m;
 end if;
 return jsonb_build_object('matchId',m.id,'statisticsStatus',m.statistics_status,'policySha256',p.policy_sha256);
end $$;


create function public.fcf_historical_six_restore(p_before_sha text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r private_fcf_six_target_release.cleanup_receipt%rowtype;image jsonb;tab text;cols text;begin
 perform private_fcf_six_target_release.lock_target(783);lock table private_fcf_six_target_release.cleanup_receipt in share row exclusive mode;
 select *into r from private_fcf_six_target_release.cleanup_receipt where before_sha256=p_before_sha;
 perform private_fcf_six_target_release.require(r.singleton,'saved six cleanup receipt required');
 if r.restored then return jsonb_build_object('restored',true,'noOp',true,'beforeSha256',p_before_sha);end if;
 perform private_fcf_six_target_release.require(not exists(select 1 from competitions where id in(783,790,797)and active),'rollback inactive competitions');
 perform private_fcf_six_target_release.no_target_users(783);perform private_fcf_six_target_release.no_target_users(790);perform private_fcf_six_target_release.no_target_users(797);
 perform private_fcf_six_target_release.require(private_fcf_six_history.capture()=r.after_image,'rollback exact post-cleanup beforeimage drift');
 image:=r.before_image_text::jsonb;
 insert into private_fcf_six_history.restore_authorizations values(txid_current(),p_before_sha);
 delete from matches where zapisnik_id='es4109404';
 delete from private_historical_statistics.markers where competition_id in(783,790,797);
 delete from private_historical_statistics.installed_policies where competition_id in(783,790,797);
 -- Restore complete original rows including IDs; exact after-state comparison above
 -- prevents overwriting a later import, player change, result or user activity.
 foreach tab in array array['competitions','matches']loop
  select string_agg(format('%I=x.%I',a.attname,a.attname),',')into cols from pg_attribute a where a.attrelid=('public.'||tab)::regclass and a.attnum>0 and not a.attisdropped and a.attname<>'id'and a.attgenerated='';
  execute format('update public.%I t set %s from jsonb_populate_recordset(null::public.%I,$1)x where t.id=x.id',tab,cols,tab)using image->tab;
 end loop;
 foreach tab in array array['appearances','goals','player_scores','statistika_igralcev','tocke_krogov']loop
  if tab in('appearances','goals')then execute format('delete from public.%I where match_id in(321646,297199,306164,306166,306171)',tab);
  elsif tab='player_scores'then delete from player_scores where round_id in(28706,27227,27616,27617);
  elsif tab='statistika_igralcev'then delete from statistika_igralcev where player_id in(select id from players where competition_id in(783,790,797));
  else delete from tocke_krogov where round_id in(28706,27227,27616,27617);end if;
  execute format('insert into public.%I overriding system value select *from jsonb_populate_recordset(null::public.%I,$1)',tab,tab)using image->tab;
 end loop;
 update private_historical_statistics.source_club_bindings b set bound_team_id=x.bound_team_id from jsonb_populate_recordset(null::private_historical_statistics.source_club_bindings,image->'bindings')x where b.provider=x.provider and b.source_club_id=x.source_club_id and b.source_category_id=x.source_category_id;
 perform private_fcf_six_target_release.require(private_fcf_six_history.capture()=image-array['schemaVersion','mainCommit','policyHashes'],'rollback exact native readback differs');
 delete from private_fcf_six_history.restore_authorizations where authorized_xid=txid_current();
 update private_fcf_six_target_release.cleanup_receipt set restored=true where singleton;
 return jsonb_build_object('restored',true,'beforeSha256',p_before_sha,'missing4109404',true);
end$$;
create table private_fcf_six_history.restore_authorizations(authorized_xid bigint primary key,before_sha text not null);
revoke all on private_fcf_six_history.restore_authorizations from public,anon,authenticated,service_role;
create or replace function private_historical_statistics.protect_match()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare mk private_historical_statistics.markers%rowtype;e jsonb;
begin
 if tg_op in('UPDATE','DELETE')and old.zapisnik_id in('es4109388','es4109404','es4116215','es4118352','es4118354','es4118358')and exists(select 1 from private_fcf_six_history.restore_authorizations where authorized_xid=txid_current())then if tg_op='DELETE'then return old;else return new;end if;end if;
 if tg_op='DELETE'then
  if old.statistics_status='unavailable_historical'then raise exception 'HISTORICAL_POLICY: installed marker immutable';end if;return old;
 end if;
 if tg_op='UPDATE'and old.statistics_status='unavailable_historical'and to_jsonb(old)is distinct from to_jsonb(new)then raise exception 'HISTORICAL_POLICY: installed marker immutable';end if;
 if new.statistics_status='unavailable_historical'then
  select k.* into mk from private_historical_statistics.markers k where k.round_id=new.round_id and k.home_team_id=new.home_team_id and k.away_team_id=new.away_team_id and k.source_report_id=new.zapisnik_id;
  select value into e from private_historical_statistics.installed_policies i join private_historical_statistics.policies p on p.id=i.policy_id cross join lateral jsonb_array_elements(p.document->'entries')where i.competition_id=mk.competition_id and value->>'sourceMatchId'=mk.source_match_id;
  if mk.source_match_id is null or new.imported_at is not null or new.kontumacija or new.vir_brez_izida or new.played_on is distinct from(mk.fixture->>'playedOn')::date or new.home_goals is distinct from(mk.fixture->>'observedHomeScore')::int
  or new.away_goals is distinct from(mk.fixture->>'observedAwayScore')::int or new.source_url is distinct from mk.fixture->>'sourceUrl' or new.statistics_reason is distinct from e->>'reasonCode'
  or new.source_phase is distinct from mk.fixture->>'sourcePhase' or new.source_round is distinct from(mk.fixture->>'sourceRound')::int
  or exists(select 1 from public.appearances where match_id=new.id)or exists(select 1 from public.goals where match_id=new.id)
  then raise exception 'HISTORICAL_POLICY: unavailable match requires exact empty installed marker';end if;
 end if;return new;
end $$;

revoke all on all functions in schema private_fcf_six_history from public,anon,authenticated,service_role;
revoke all on function public.get_installed_fcf_six_statistics_markers(bigint),public.fcf_historical_six_restore(text)from public,anon,authenticated;
grant execute on function public.get_installed_fcf_six_statistics_markers(bigint),public.fcf_historical_six_restore(text)to service_role;

create or replace view public.sezone as
select r.season,count(distinct r.id)::int as krogov,
 count(distinct m.id)filter(where(m.imported_at is not null or m.statistics_status='unavailable_historical')and m.home_goals is not null and m.away_goals is not null)::int as odigranih,
 max(r.played_on)as zadnji_dan,bool_or(r.played_on>=current_date)as tekoca,r.competition_id,
 count(distinct m.id)filter(where m.imported_at is not null)::int as statistics_complete_matches,
 count(distinct m.id)filter(where m.statistics_status='unavailable_historical')::int as statistics_unavailable_matches
from public.rounds r left join public.matches m on m.round_id=r.id group by r.season,r.competition_id;


create or replace function public.lestvica_lige(p_competition_id bigint, p_sezona text default null)
returns table (
  mesto int,
  team_id bigint,
  ime text,
  kratko text,
  grb text,
  tekme int,
  zmage int,
  remiji int,
  porazi int,
  dani int,
  prejeti int,
  razlika int,
  tocke int,
  forma text,
  sezona text
)
language sql
stable
security invoker
set search_path = public
as $$
  with sz as (
    select coalesce(
      p_sezona,
      (select max(r.season) from rounds r join matches m on m.round_id = r.id
        where r.competition_id = p_competition_id
          and ((m.imported_at is not null or m.kontumacija or(m.statistics_status='unavailable_historical'and r.competition_id in(783,790,797)and exists(select 1 from competitions c where c.id=r.competition_id and c.source_policy='es-fcf-six-reviewed-history-v1')))and m.home_goals is not null and m.away_goals is not null)),
      tekoca_sezona()
    ) as season
  ),
  tekme_sezone as (
    select m.*, ((m.imported_at is not null or m.kontumacija or(m.statistics_status='unavailable_historical'and r.competition_id in(783,790,797)and exists(select 1 from competitions c where c.id=r.competition_id and c.source_policy='es-fcf-six-reviewed-history-v1')))and m.home_goals is not null and m.away_goals is not null) as odigrana
      from matches m
      join rounds r on r.id = m.round_id
     where r.competition_id = p_competition_id
       and r.season = (select season from sz)
  ),
  -- Ena vrstica na klub na tekmo, z vidika tega kluba.
  izidi as (
    select home_team_id as team_id, home_goals as za, away_goals as proti,
           played_on, id, odigrana
      from tekme_sezone
    union all
    select away_team_id, away_goals, home_goals, played_on, id, odigrana
      from tekme_sezone
  ),
  odigrane as (
    select i.*,
           case when za > proti then 'W' when za = proti then 'D' else 'L' end as izid,
           row_number() over (partition by team_id order by played_on desc nulls last, id desc) as od_zadaj
      from izidi i
     where odigrana
  ),
  sestevek as (
    select k.team_id,
           count(o.id)::int as tekme,
           count(*) filter (where o.izid = 'W')::int as zmage,
           count(*) filter (where o.izid = 'D')::int as remiji,
           count(*) filter (where o.izid = 'L')::int as porazi,
           coalesce(sum(o.za), 0)::int as dani,
           coalesce(sum(o.proti), 0)::int as prejeti,
           -- Zadnjih pet, od najstarejše do zadnje.
           coalesce(string_agg(o.izid, '' order by o.od_zadaj desc)
                      filter (where o.od_zadaj <= 5), '') as forma
      from (select distinct team_id from izidi) k
      left join odigrane o on o.team_id = k.team_id
     group by k.team_id
  )
  select (row_number() over (
            order by s.zmage * 3 + s.remiji desc, s.dani - s.prejeti desc, s.dani desc, t.name
          ))::int as mesto,
         s.team_id, t.name, t.short_name, t.logo_url,
         s.tekme, s.zmage, s.remiji, s.porazi, s.dani, s.prejeti,
         s.dani - s.prejeti as razlika,
         s.zmage * 3 + s.remiji as tocke,
         s.forma,
         (select season from sz)
    from sestevek s
    join teams t on t.id = s.team_id
   order by mesto;
$$;

revoke all on function public.lestvica_lige(bigint, text) from public;
grant execute on function public.lestvica_lige(bigint, text) to anon, authenticated;


-- Keep legacy same-slug reads bound to the original four-policy registry.
create or replace function private_fcf_history.check_and_lock(p_main_sha text,p_policy_hashes jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare expected_hashes jsonb;n int;target record;policy record;e jsonb;catalog jsonb;b record;side record;
begin
 perform private_fcf_history.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 perform private_fcf_history.require(p_main_sha~'^[a-f0-9]{40}$','exact reviewed main commit required');
 -- A closed short maintenance transaction: block phantom users, votes, caches and
 -- FK/schema changes before the first identity read, including non-FK audit rows.
 lock table public.countries,public.competitions,public.rounds,public.teams,public.players,public.matches,
 public.appearances,public.goals,public.fantasy_teams,public.fantasy_roster,public.fantasy_lineups,public.fantasy_transfers,public.fantasy_chips,
 public.position_votes,public.position_votes_deleted,public.assist_votes,public.assist_votes_deleted,
 public.player_scores,public.statistika_igralcev,public.tocke_krogov,public.uradne_odsotnosti,public.profil_igralca_plus in share row exclusive mode;
 lock table private_historical_statistics.policies,private_historical_statistics.installed_policies,private_historical_statistics.markers,private_historical_statistics.source_club_bindings in share row exclusive mode;
 perform 1 from public.competitions where id in(783,790,797)order by id for update;
 select jsonb_object_agg(p.id,p.policy_sha256)into expected_hashes from private_historical_statistics.policies p
 where p.document->>'provider'='fcf'and p.document->>'sourcePolicy'='es-fcf-reviewed-history-v1'
 and p.document->>'competitionSlug'in('es-ct-segona-g1','es-ct-tercera-g2','es-ct-tercera-g9');
 perform private_fcf_history.require((select count(*)from jsonb_object_keys(expected_hashes))=3 and p_policy_hashes=expected_hashes,'exact three immutable policy hashes required');
 perform private_fcf_history.require(not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(783,790,797)),'cleanup is one-use; installed policy already exists');
 for target in select * from private_fcf_history.cleanup_targets()order by match_id loop
  perform private_fcf_history.require(exists(select 1 from public.competitions c join public.countries d on d.id=c.country_id where c.id=target.competition_id and c.slug=target.competition_slug and c.source='fcf'and c.source_league_code=target.source_code and not c.sezona_koledarska and not c.active and c.source_policy is null and c.prvi_fantasy_krog=6 and d.code='ES'),'inactive exact FCF competition identity required');
  perform private_fcf_history.require(exists(select 1 from public.rounds r where r.id=target.round_id and r.competition_id=target.competition_id and r.number=target.round_number and r.season='2026/27'),'exact current round identity required');
  perform private_fcf_history.require(exists(select 1 from public.matches m where m.id=target.match_id and m.round_id=target.round_id and m.home_team_id=target.home_id and m.away_team_id=target.away_id and m.played_on=target.played_on and m.home_goals=target.home_goals and m.away_goals=target.away_goals and m.zapisnik_id='es'||target.native_id and m.source_url='https://www.fcf.cat/ca/competicio/acta/'||target.native_id and m.imported_at is not null and m.statistics_status='available'and m.statistics_reason is null and not m.kontumacija and not m.vir_brez_izida and m.source_phase is null and(m.source_round is null or m.source_round=target.round_number)),'exact original match/result/source identity required');
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug and p.document->>'sourcePolicy'='es-fcf-reviewed-history-v1';
  select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'=target.native_id;
  perform private_fcf_history.require(e is not null and policy.document->>'season'='2026/27'and(e->>'sourceRound')::int=target.round_number and(e->>'playedOn')::date=target.played_on and(e->>'observedHomeScore')::int=target.home_goals and(e->>'observedAwayScore')::int=target.away_goals,'reviewed policy fixture identity differs');
  -- Preparation never binds/mutates clubs. The same immutable shared club
  -- descriptors must have exactly one canonical candidate, or an existing exact binding.
  for side in select e->>'homeSourceClubId'club,e->>'homeSourceCategoryId'category,target.home_id team union all select e->>'awaySourceClubId',e->>'awaySourceCategoryId',target.away_id loop
   select sb.*into b from private_historical_statistics.source_club_bindings sb where sb.provider='fcf'and sb.source_club_id=side.club and sb.source_category_id=side.category;
   perform private_fcf_history.require(b.provider is not null and b.country_code='ES'and exists(select 1 from teams t join countries d on d.id=t.country_id where t.id=side.team and d.code='ES')and
    ((b.bound_team_id is not null and b.bound_team_id=side.team)or(b.bound_team_id is null and(select count(*)from teams t join countries d on d.id=t.country_id where t.name=any(b.canonical_names)and d.code='ES')=1 and exists(select 1 from teams t where t.id=side.team and t.name=any(b.canonical_names)))),'exact native club/category identity required');
  end loop;
  perform private_fcf_history.require((select count(*)from public.appearances where match_id=target.match_id)=target.appearances and(select count(*)from public.goals where match_id=target.match_id)=target.goals,'exact approved 126 appearances and 14 goals required');
 end loop;
 perform private_fcf_history.require(not exists(select 1 from public.fantasy_teams where competition_id in(783,790,797)),'new fantasy team activity');
 perform private_fcf_history.require(not exists(select 1 from public.fantasy_roster fr join public.players p on p.id=fr.player_id where p.competition_id in(783,790,797)),'new roster activity');
 perform private_fcf_history.require(not exists(select 1 from public.fantasy_lineups l join public.rounds r on r.id=l.round_id join public.players p on p.id=l.player_id where r.competition_id in(783,790,797)or p.competition_id in(783,790,797)),'new lineup activity');
 perform private_fcf_history.require(not exists(select 1 from public.fantasy_transfers t join public.rounds r on r.id=t.round_id where r.competition_id in(783,790,797))and not exists(select 1 from public.fantasy_chips t join public.rounds r on r.id=t.round_id where r.competition_id in(783,790,797)),'new round fantasy activity');
 perform private_fcf_history.require(not exists(select 1 from public.position_votes v join public.players p on p.id=v.player_id where p.competition_id in(783,790,797))and not exists(select 1 from public.position_votes_deleted v join public.players p on p.id=v.player_id where p.competition_id in(783,790,797)),'new position vote activity');
 perform private_fcf_history.require(not exists(select 1 from public.assist_votes v join public.goals g on g.id=v.goal_id where g.match_id in(321646,297199,306164,306171))and not exists(select 1 from public.assist_votes_deleted v join public.goals g on g.id=v.goal_id where g.match_id in(321646,297199,306164,306171)),'new assist vote activity');
 perform private_fcf_history.require(not exists(select 1 from public.goals where match_id in(321646,297199,306164,306171)and(assist_player_id is not null or assist_confirmed_at is not null or assist_none_confirmed_at is not null)),'new confirmed assist activity');
 -- Only this reviewed FK is permitted to point at a row being deleted. Unknown
 -- dependencies abort even if empty; never let a new cascade silently erase data.
 select coalesce(jsonb_agg(jsonb_build_object('schema',ns.nspname,'table',t.relname,'target',p.relname,'definition',pg_get_constraintdef(c.oid))order by ns.nspname,t.relname,c.conname),'[]')into catalog
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_class p on p.oid=c.confrelid
 where c.contype='f'and c.confrelid in('public.appearances'::regclass,'public.goals'::regclass,'public.player_scores'::regclass,'public.statistika_igralcev'::regclass,'public.tocke_krogov'::regclass);
 perform private_fcf_history.require(catalog='[{"schema":"public","table":"assist_votes","target":"goals","definition":"FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE"}]'::jsonb,'unexpected individual-row foreign key dependency');
 perform private_fcf_history.require(not exists(select 1 from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace ns on ns.oid=t.relnamespace where ns.nspname in('public','scout')and t.relkind in('r','p')and a.attnum>0 and not a.attisdropped and a.attname in('appearance_id','goal_id')and not(ns.nspname='public'and t.relname in('assist_votes','assist_votes_deleted')and a.attname='goal_id')),'unexpected individual-row reference column');
end$$;

create or replace function public.apply_fcf_historical_cleanup(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare prepared jsonb;target record;policy record;e jsonb;fixture jsonb;pid bigint;rid bigint;n integer;preserved jsonb;p_before_image jsonb;
begin
 begin p_before_image:=p_before_image_text::jsonb;exception when invalid_text_representation then raise exception 'FCF_HISTORY: beforeimage must be SQL-produced JSON text';end;
 perform private_fcf_history.require(jsonb_typeof(p_before_image)='object','complete beforeimage object required');
 perform private_fcf_history.require(p_before_sha~'^[a-f0-9]{64}$'and p_before_image is not null and encode(sha256(convert_to(p_before_image::text,'UTF8')),'hex')=p_before_sha,'reviewed complete beforeimage SHA required');
 prepared:=public.prepare_fcf_historical_cleanup(p_main_sha,p_policy_hashes);
 perform private_fcf_history.require(prepared->>'beforeSha256'=p_before_sha and prepared->'beforeImage'=p_before_image,'canonical beforeimage drift');
 -- All individual removals, cache corrections, policy installs and four markers
 -- commit together. No generic importer can observe an intermediate empty row.
 delete from public.goals where match_id in(321646,297199,306164,306171);
 get diagnostics n=row_count;perform private_fcf_history.require(n=14,'goal delete count differs');
 delete from public.appearances where match_id in(321646,297199,306164,306171);
 get diagnostics n=row_count;perform private_fcf_history.require(n=126,'appearance delete count differs');
 update public.matches set imported_at=null where id in(321646,297199,306164,306171);
 update public.competitions set source_policy='es-fcf-reviewed-history-v1'where id in(783,790,797);
 for policy in select p.*,c.id as cid from private_historical_statistics.policies p join public.competitions c on c.slug=p.document->>'competitionSlug'where c.id in(783,790,797)and p.document->>'sourcePolicy'='es-fcf-reviewed-history-v1'order by c.id loop
  perform public.apply_historical_statistics_policy(policy.cid,policy.id,policy.policy_sha256,policy.document->'entries');
 end loop;
 for target in select * from private_fcf_history.cleanup_targets()order by match_id loop
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug and p.document->>'sourcePolicy'='es-fcf-reviewed-history-v1';
  select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'=target.native_id;
  fixture:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',policy.document->>'season');
  perform public.upsert_unavailable_historical_match(target.competition_id,target.native_id,policy.id,policy.policy_sha256,e->>'rawSha256',jsonb_build_object('roundId',target.round_id,'homeTeamId',target.home_id,'awayTeamId',target.away_id,'fixture',fixture));
 end loop;
 for rid in select distinct round_id from private_fcf_history.cleanup_targets()loop perform public.recompute_round_scores(rid);end loop;
 perform public.osvezi_statistiko_igralcev(array(select id from public.players where competition_id in(783,790,797)));
 perform public.osvezi_tocke_krogov(array[28706,27227,27616,27617]::bigint[]);
 perform private_fcf_history.require(not exists(select 1 from public.player_scores ps where ps.round_id in(28706,27227,27616,27617)and not exists(select 1 from public.appearance_points ap where ap.round_id=ps.round_id and ap.player_id=ps.player_id)),'stale derived individual scores');
 for pid in select unnest(array[783,790,797]::bigint[])loop perform public.get_installed_historical_statistics_markers(pid);end loop;
 preserved:=private_fcf_history.capture();
 perform private_fcf_history.require(preserved->'otherAppearances'=p_before_image->'otherAppearances'and preserved->'otherGoals'=p_before_image->'otherGoals'and preserved->'otherScores'=p_before_image->'otherScores'and preserved->'players'=p_before_image->'players'and preserved->'teams'=p_before_image->'teams'and preserved->'rounds'=p_before_image->'rounds'and preserved->'uradne_odsotnosti'=p_before_image->'uradne_odsotnosti'and preserved->'profil_igralca_plus'=p_before_image->'profil_igralca_plus','protected players/teams/rounds/profile references changed');
 perform private_fcf_history.require(not exists(select 1 from jsonb_array_elements(p_before_image->'matches')b where(b->>'id')::bigint not in(321646,297199,306164,306171)and not exists(select 1 from jsonb_array_elements(preserved->'matches')a where a=b)),'unrelated match changed');
 return jsonb_build_object('schemaVersion',1,'mainCommit',p_main_sha,'beforeSha256',p_before_sha,'removedAppearances',126,'removedGoals',14,'unavailableMatches',4,'afterSha256',encode(sha256(convert_to(preserved::text,'UTF8')),'hex'));
end$$;

create or replace function public.get_fcf_current_target_inventory(p_slug text,p_privacy_keys text[])returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare cid bigint;c competitions%rowtype;stamp timestamptz:=clock_timestamp();result jsonb;begin
 cid:=private_fcf_target_release.target_id(p_slug);select *into c from competitions where id=cid;
 perform private_fcf_target_release.require(cid is not null and current_setting('transaction_read_only')='on'and c.source='fcf'and exists(select 1 from countries where id=c.country_id and code='ES')and p_privacy_keys is not null and cardinality(p_privacy_keys)<=20000 and not exists(select 1 from unnest(p_privacy_keys)k where k!~'^[a-f0-9]{64}$'),'closed explicit readonly native/privacy inventory required');
 select jsonb_build_object('capturedUTC',stamp,'method','explicitBEGIN_READ_ONLY_ROLLBACK','groups',(select jsonb_agg(jsonb_build_object('id',co.id,'slug',co.slug,'country_id',co.country_id,'active',co.active,'source',co.source,'sourceLeagueCode',co.source_league_code,'sezona_koledarska',co.sezona_koledarska,'source_policy',co.source_policy,'nativeImportedIDs',coalesce((select jsonb_agg(substring(m.zapisnik_id from 3)order by m.zapisnik_id)from matches m join rounds r on r.id=m.round_id where r.competition_id=co.id and m.imported_at is not null and m.zapisnik_id is not null),'[]')))from competitions co where co.id in(783,790,797)),'teams',(select jsonb_agg(to_jsonb(t)||jsonb_build_object('competition_id',cid)order by t.id)from teams t where t.id in(select m.home_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=cid union select m.away_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=cid)),'rounds',(select jsonb_agg(to_jsonb(r)order by number)from rounds r where competition_id=cid),'matches',(select jsonb_agg(to_jsonb(m)order by m.id)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid),'players',(select coalesce(jsonb_agg(to_jsonb(p)order by id),'[]')from players p where competition_id=cid),'installedMarkers',(select jsonb_agg(public.get_installed_historical_statistics_markers(co.id)order by co.id)from competitions co where co.id in(783,790,797)),'existingExceptionBindings',(select jsonb_agg(to_jsonb(b)order by source_club_id,source_category_id)from private_historical_statistics.source_club_bindings b where provider='fcf'and(source_club_id,source_category_id)in(('5042','33356'),('5057','35522'),('1107','37659'),('5114','34913'),('1252','35781'),('6136','33049'),('44143644','44510647'),('1400','47272626'))),'identityPrivacy',jsonb_build_object('schemaVersion',1,'kind','fcf-native-privacy-projection','countryCode','ES','countryId',c.country_id,'targetCompetitionId',cid,'method','explicitBEGIN_READ_ONLY_ROLLBACK','capturedUTC',stamp,'complete',true,'checkedKeys',to_jsonb(p_privacy_keys),'matches',(select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'competition_id',p.competition_id,'country_id',co.country_id,'kljuc',k.kljuc,'anonimiziran_at',p.anonimiziran_at,'anonimiziran_razlog',p.anonimiziran_razlog)order by p.id,k.kljuc),'[]')from anonimizirani_igralci k join players p on p.id=k.player_id join competitions co on co.id=p.competition_id where co.country_id=c.country_id and k.kljuc=any(p_privacy_keys)and p.anonimiziran_at is not null)))into result;
 return result;
end$$;
