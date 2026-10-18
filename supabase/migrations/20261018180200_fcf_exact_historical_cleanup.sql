-- Separate authority for the user-approved exact four inactive FCF rows.
-- The common historical upsert continues to refuse populated rows.
create schema private_fcf_history;
revoke all on schema private_fcf_history from public,anon,authenticated,service_role;

create function private_fcf_history.cleanup_targets()
returns table(match_id bigint,competition_id bigint,competition_slug text,source_code text,round_id bigint,round_number integer,home_id bigint,away_id bigint,played_on date,home_goals integer,away_goals integer,native_id text,appearances integer,goals integer)
language sql immutable set search_path=public,pg_temp as $$
 values
 (321646::bigint,783::bigint,'es-ct-segona-g1','4109388-4109627',28706::bigint,1,8574::bigint,8575::bigint,'2026-09-20'::date,0,3,'4109388',31,4),
 (297199::bigint,790::bigint,'es-ct-tercera-g2','4116188-4116427',27227::bigint,4,8195::bigint,8188::bigint,'2026-10-10'::date,5,0,'4116215',33,4),
 (306164::bigint,797::bigint,'es-ct-tercera-g9','4118349-4118588',27616::bigint,1,8304::bigint,8305::bigint,'2026-09-19'::date,3,0,'4118352',32,5),
 (306171::bigint,797::bigint,'es-ct-tercera-g9','4118349-4118588',27617::bigint,2,8301::bigint,8298::bigint,'2026-09-26'::date,0,3,'4118358',30,1);
$$;

create function private_fcf_history.require(ok boolean,message text)returns void language plpgsql as $$begin
 if ok is distinct from true then raise exception 'FCF_HISTORY: %',message;end if;
end$$;

-- Capture complete original rows, never a projection that could hide changed statistics.
create function private_fcf_history.capture()returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb:='{}';q record;rows jsonb;
begin
 for q in select * from(values
 ('competitions','select * from public.competitions where id in(783,790,797)'),
 ('rounds','select * from public.rounds where competition_id in(783,790,797)'),
 ('matches','select m.* from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)'),
 ('teams','select t.* from public.teams t where t.id in(select m.home_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797) union select m.away_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797))'),
 ('players','select * from public.players where competition_id in(783,790,797)'),
 ('appearances','select * from public.appearances where match_id in(321646,297199,306164,306171)'),
 ('goals','select * from public.goals where match_id in(321646,297199,306164,306171)'),
 ('otherAppearances','select a.* from public.appearances a join public.matches m on m.id=a.match_id join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)and m.id not in(321646,297199,306164,306171)'),
 ('otherGoals','select g.* from public.goals g join public.matches m on m.id=g.match_id join public.rounds r on r.id=m.round_id where r.competition_id in(783,790,797)and m.id not in(321646,297199,306164,306171)'),
 ('otherScores','select ps.* from public.player_scores ps join public.rounds r on r.id=ps.round_id where r.competition_id in(783,790,797)and r.id not in(28706,27227,27616,27617)'),
 ('player_scores','select ps.* from public.player_scores ps where ps.round_id in(28706,27227,27616,27617)'),
 ('statistika_igralcev','select s.* from public.statistika_igralcev s where s.player_id in(select id from public.players where competition_id in(783,790,797))'),
 ('tocke_krogov','select t.* from public.tocke_krogov t where t.round_id in(28706,27227,27616,27617)'),
 ('uradne_odsotnosti','select * from public.uradne_odsotnosti where ni_drzalo_match_id in(321646,297199,306164,306171)'),
 ('profil_igralca_plus','select * from public.profil_igralca_plus where tekma_id in(321646,297199,306164,306171)')
 )v(key,query)loop
  execute 'select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text collate "C"),''[]''::jsonb)from('||q.query||')t'into rows;
  result:=result||jsonb_build_object(q.key,rows);
 end loop;
 return result;
end$$;

create function private_fcf_history.check_and_lock(p_main_sha text,p_policy_hashes jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
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
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug;
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

create function public.prepare_fcf_historical_cleanup(p_main_sha text,p_policy_hashes jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare image jsonb;
begin
 perform private_fcf_history.check_and_lock(p_main_sha,p_policy_hashes);
 image:=private_fcf_history.capture()||jsonb_build_object('schemaVersion',1,'mainCommit',p_main_sha,'policyHashes',p_policy_hashes);
 return jsonb_build_object('beforeImage',image,'beforeImageText',image::text,'beforeSha256',encode(sha256(convert_to(image::text,'UTF8')),'hex'));
end$$;

create function public.apply_fcf_historical_cleanup(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
 for policy in select p.*,c.id as cid from private_historical_statistics.policies p join public.competitions c on c.slug=p.document->>'competitionSlug'where c.id in(783,790,797)order by c.id loop
  perform public.apply_historical_statistics_policy(policy.cid,policy.id,policy.policy_sha256,policy.document->'entries');
 end loop;
 for target in select * from private_fcf_history.cleanup_targets()order by match_id loop
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug;
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

revoke all on all functions in schema private_fcf_history from public,anon,authenticated,service_role;
revoke all on function public.prepare_fcf_historical_cleanup(text,jsonb),public.apply_fcf_historical_cleanup(text,jsonb,text,text)from public,anon,authenticated;
grant execute on function public.prepare_fcf_historical_cleanup(text,jsonb),public.apply_fcf_historical_cleanup(text,jsonb,text,text)to service_role;
