-- Versioned six-report historical cleanup, independent of future launch selection.
-- Old RPCs and immutable policies stay unchanged. The24October value stored in
-- installed_policies is ONLY the reviewed historical cutline at this stage.
create schema private_fcf_future_history;
revoke all on schema private_fcf_future_history from public,anon,authenticated,service_role;
create table private_fcf_future_history.cleanup_receipt (like private_fcf_six_target_release.cleanup_receipt including all);
revoke all on private_fcf_future_history.cleanup_receipt from public,anon,authenticated,service_role;

-- Pin the original authorization bytes separately from any fresh source capture.
create function private_fcf_future_history.policy_pins(hashes jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare expected jsonb:='{"es-ct-segona-g1-six-reviewed-2026-10-19-v1":"fbe3dbba425837b28a5fd7f99fa170a249e169a2f84d6c17921f202f7b25c6d9","es-ct-tercera-g2-six-reviewed-2026-10-19-v1":"69cf7d1406b1306ab1aa31413cdd37bf11b502e5f17f9cb7eab295502578fc52","es-ct-tercera-g9-six-reviewed-2026-10-19-v1":"38eca907c6b0f4df03a989778099f00b356d03626895de3961bad5e266bd3912"}';pins jsonb;
begin
 perform private_fcf_six_history.require(hashes=expected,'future cleanup exact immutable six policy hashes');
 select jsonb_object_agg(e->>'sourceMatchId',e->>'rawSha256')into pins from private_historical_statistics.policies p cross join lateral jsonb_array_elements(p.document->'entries')e where p.id in(select jsonb_object_keys(expected));
 perform private_fcf_six_history.require(pins='{"4109388":"eb3b14de3d6077f4fb896cb4a4d2b96d76eb85db8853889e9871b7f74e73e770","4109404":"1a42a49bd0b55d0bd3a654a6e15b65f430a2c132e28813899205d394f05244dc","4116215":"5dd7e401c7929dd1f2b59d35d1f6e203e6306f2479238adcd8755180b9671a49","4118352":"1e8d50d487be699cac45c3c2dc4658d3a9b16983fd5203b5845dc1339fe7351c","4118354":"f3789fc4103d36d2878a573b9574442d32ad491236f3b4d6fd380ea4aaa07556","4118358":"e69af6b2765dbed7ebe3b57535beb1ce259c7d77ed9cb7f90d9cb4998afd153a"}'::jsonb,'future cleanup original six report hashes');
end$$;

-- Scout deliberately has non-FK player/model references. Lock all its tables
-- before checking target references, including reverse similarity membership.
create function private_fcf_future_history.scout_dependencies()returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t record;a record;found boolean;predicate text;
begin
 for t in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='scout'and c.relkind in('r','p')order by c.oid loop
  execute format('lock table %I.%I in share row exclusive mode',t.nspname,t.relname);
  for a in select attname,atttypid from pg_attribute where attrelid=t.oid and attnum>0 and not attisdropped and attname in('player_id','competition_id','team_id','podobni')loop
   predicate:=case a.attname
    when 'competition_id'then 'x.competition_id in(783,790,797)'
    when 'player_id'then 'x.player_id in(select id from public.players where competition_id in(783,790,797))'
    when 'team_id'then 'x.team_id in(select team_id from public.players where competition_id in(783,790,797))'
    when 'podobni'then 'x.podobni && array(select id from public.players where competition_id in(783,790,797))'end;
   perform private_fcf_six_history.require(a.atttypid=case when a.attname='podobni'then 'bigint[]'::regtype else 'bigint'::regtype end,'unreviewed Scout reference type');
   execute format('select exists(select 1 from %I.%I x where %s)',t.nspname,t.relname,predicate)into found;
   perform private_fcf_six_history.require(not found,'Scout target dependency prevents historical cleanup/restore');
  end loop;
 end loop;
end$$;

-- This installer is private to the locked cleanup transaction. It never derives
-- or configures a launch round/date. All six exceptions predate the immutable
-- authorization cutline and must already be strictly historical at execution.
create function private_fcf_future_history.install_policy(cid bigint,pid text,sha text,entries jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.competitions%rowtype;p private_historical_statistics.policies%rowtype;
begin
 select *into c from public.competitions where id=cid for update;
 select *into p from private_historical_statistics.policies where id=pid;
 perform private_fcf_six_history.require(c.id in(783,790,797)and not c.active and c.prvi_fantasy_krog=1 and c.source='fcf'and not c.sezona_koledarska and c.slug=p.document->>'competitionSlug'and c.source_policy='es-fcf-six-reviewed-history-v1'and c.source_policy=p.document->>'sourcePolicy'and p.document->>'season'='2026/27'and p.document->>'provider'='fcf'and p.policy_sha256=sha and p.document->'entries'=entries and exists(select 1 from countries where id=c.country_id and code='ES'),'exact inactive seed1 historical policy installation');
 perform private_fcf_six_history.require(not exists(select 1 from jsonb_array_elements(entries)e where(e->>'playedOn')::date>='2026-10-24'::date or(e->>'playedOn')::date>=current_date),'strictly historical six entries required');
 insert into private_historical_statistics.installed_policies values(cid,pid,sha,'2026-10-24',now());
end$$;

-- The two versioned gate/core bodies retain every original check and row-count
-- assertion. Only seed1, the separate schema3 preparation and private cutline
-- installer differ; identities/capture/upsert/cache/marker helpers are shared.
create function private_fcf_future_history.check_and_lock(p_main_sha text,p_policy_hashes jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
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
 perform private_fcf_future_history.policy_pins(p_policy_hashes);
 perform private_fcf_future_history.scout_dependencies();
 perform private_fcf_six_history.require(not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(783,790,797)),'cleanup is one-use; installed policy already exists');
 for target in select * from private_fcf_six_history.cleanup_targets()order by match_id loop
  perform private_fcf_six_history.require(exists(select 1 from public.competitions c join public.countries d on d.id=c.country_id where c.id=target.competition_id and c.slug=target.competition_slug and c.source='fcf'and c.source_league_code=target.source_code and not c.sezona_koledarska and not c.active and c.source_policy is null and c.prvi_fantasy_krog=1 and d.code='ES'),'inactive exact FCF competition identity required');
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

create function public.fcf_future_historical_six_prepare(p_main_sha text,p_policy_hashes jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare image jsonb;
begin
 perform private_fcf_six_target_release.lock_target(783);
 perform private_fcf_future_history.check_and_lock(p_main_sha,p_policy_hashes);
 perform private_fcf_six_history.require(not exists(select 1 from players where competition_id in(783,790,797)and anonimiziran_at is not null)and not exists(select 1 from anonimizirani_igralci a join players p on p.id=a.player_id where p.competition_id in(783,790,797)),'privacy suppression dependency');
 perform private_fcf_six_history.missing_binding();
 image:=private_fcf_six_history.capture()||jsonb_build_object('schemaVersion',3,'mainCommit',p_main_sha,'policyHashes',p_policy_hashes);
 return jsonb_build_object('beforeImage',image,'beforeImageText',image::text,'beforeSha256',encode(sha256(convert_to(image::text,'UTF8')),'hex'));
end$$;

create function private_fcf_future_history.apply_core(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare prepared jsonb;target record;policy record;e jsonb;fixture jsonb;pid bigint;rid bigint;n integer;preserved jsonb;p_before_image jsonb;
begin
 begin p_before_image:=p_before_image_text::jsonb;exception when invalid_text_representation then raise exception 'FCF_HISTORY: beforeimage must be SQL-produced JSON text';end;
 perform private_fcf_six_history.require(jsonb_typeof(p_before_image)='object','complete beforeimage object required');
 perform private_fcf_six_history.require(p_before_sha~'^[a-f0-9]{64}$'and p_before_image is not null and encode(sha256(convert_to(p_before_image::text,'UTF8')),'hex')=p_before_sha,'reviewed complete beforeimage SHA required');
 prepared:=public.fcf_future_historical_six_prepare(p_main_sha,p_policy_hashes);
 perform private_fcf_six_history.require(prepared->>'beforeSha256'=p_before_sha and prepared->'beforeImage'=p_before_image,'canonical beforeimage drift');
 -- The schedule reused the first report URL and vir_brez_izida flag. Only the
 -- locked exact empty321663 before-image permits clearing those placeholder fields.
 update public.matches set vir_brez_izida=false,source_url=null where id=321663;
 get diagnostics n=row_count;perform private_fcf_six_history.require(n=1,'exact placeholder normalization count');
 -- All individual removals, cache corrections, policy installs and six markers
 -- commit together. No generic importer can observe an intermediate empty row.
 delete from public.goals where match_id in(321646,297199,306164,306166,306171);
 get diagnostics n=row_count;perform private_fcf_six_history.require(n=18,'goal delete count differs');
 delete from public.appearances where match_id in(321646,297199,306164,306166,306171);
 get diagnostics n=row_count;perform private_fcf_six_history.require(n=157,'appearance delete count differs');
 update public.matches set imported_at=null where id in(321646,297199,306164,306166,306171);
 update public.competitions set source_policy='es-fcf-six-reviewed-history-v1'where id in(783,790,797);
 for policy in select p.*,c.id as cid from private_historical_statistics.policies p join public.competitions c on c.slug=p.document->>'competitionSlug'where c.id in(783,790,797)and p.document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'order by c.id loop
  perform private_fcf_future_history.install_policy(policy.cid,policy.id,policy.policy_sha256,policy.document->'entries');
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
 perform private_fcf_six_history.require(jsonb_array_length(preserved->'matches')=jsonb_array_length(p_before_image->'matches')and exists(select 1 from matches where id=321663 and zapisnik_id='es4109404'and home_goals is null and away_goals is null and not vir_brez_izida),'same native fixture count and exact converted321663 readback');
 perform private_fcf_six_history.require(preserved->'otherAppearances'=p_before_image->'otherAppearances'and preserved->'otherGoals'=p_before_image->'otherGoals'and preserved->'otherScores'=p_before_image->'otherScores'and preserved->'players'=p_before_image->'players'and preserved->'teams'=p_before_image->'teams'and preserved->'rounds'=p_before_image->'rounds'and preserved->'uradne_odsotnosti'=p_before_image->'uradne_odsotnosti'and preserved->'profil_igralca_plus'=p_before_image->'profil_igralca_plus','protected players/teams/rounds/profile references changed');
 perform private_fcf_six_history.require(not exists(select 1 from jsonb_array_elements(p_before_image->'matches')b where(b->>'id')::bigint not in(321646,297199,306164,306166,306171,321663)and not exists(select 1 from jsonb_array_elements(preserved->'matches')a where a=b)),'unrelated match changed');
 return jsonb_build_object('schemaVersion',3,'mainCommit',p_main_sha,'beforeSha256',p_before_sha,'removedAppearances',157,'removedGoals',18,'unavailableMatches',6,'afterSha256',encode(sha256(convert_to(preserved::text,'UTF8')),'hex'));
end$$;

create function public.fcf_future_historical_six_apply(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r private_fcf_future_history.cleanup_receipt%rowtype;result jsonb;begin
 perform private_fcf_six_target_release.lock_target(783);lock table private_fcf_future_history.cleanup_receipt in share row exclusive mode;select *into r from private_fcf_future_history.cleanup_receipt;
 if r.singleton then
  perform private_fcf_six_target_release.require(not r.restored,'cleanup already restored');
  perform private_fcf_six_target_release.require(r.main_commit=p_main_sha and r.policy_hashes=p_policy_hashes and r.before_sha256=p_before_sha and r.before_image_text=p_before_image_text,'different already committed cleanup');perform private_fcf_six_target_release.markers();return r.result;
 end if;
 result:=private_fcf_future_history.apply_core(p_main_sha,p_policy_hashes,p_before_sha,p_before_image_text);perform private_fcf_six_target_release.markers();
 insert into private_fcf_future_history.cleanup_receipt values(true,p_main_sha,p_policy_hashes,p_before_sha,p_before_image_text,result,private_fcf_six_history.capture(),false);return result;
end$$;

create function public.fcf_future_historical_six_restore(p_before_sha text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r private_fcf_future_history.cleanup_receipt%rowtype;image jsonb;tab text;cols text;begin
 perform private_fcf_six_target_release.lock_target(783);lock table private_fcf_future_history.cleanup_receipt in share row exclusive mode;
 select *into r from private_fcf_future_history.cleanup_receipt where before_sha256=p_before_sha;
 perform private_fcf_six_target_release.require(r.singleton,'saved six cleanup receipt required');
 if r.restored then return jsonb_build_object('restored',true,'noOp',true,'beforeSha256',p_before_sha);end if;
 perform private_fcf_six_target_release.require(not exists(select 1 from competitions where id in(783,790,797)and active),'rollback inactive competitions');
 perform private_fcf_six_target_release.no_target_users(783);perform private_fcf_six_target_release.no_target_users(790);perform private_fcf_six_target_release.no_target_users(797);
 perform private_fcf_six_target_release.require(private_fcf_six_history.capture()=r.after_image,'rollback exact post-cleanup beforeimage drift');
 perform private_fcf_future_history.scout_dependencies();
 image:=r.before_image_text::jsonb;
 insert into private_fcf_six_history.restore_authorizations values(txid_current(),p_before_sha);
 -- Preserve321663: the complete original empty placeholder is restored below.
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
 update private_fcf_future_history.cleanup_receipt set restored=true where singleton;
 return jsonb_build_object('restored',true,'beforeSha256',p_before_sha,'missing4109404',true,'restoredPlaceholderId',321663);
end$$;
revoke all on all functions in schema private_fcf_future_history from public,anon,authenticated,service_role;
revoke all on function public.fcf_future_historical_six_prepare(text,jsonb),public.fcf_future_historical_six_apply(text,jsonb,text,text),public.fcf_future_historical_six_restore(text)from public,anon,authenticated;
grant execute on function public.fcf_future_historical_six_prepare(text,jsonb),public.fcf_future_historical_six_apply(text,jsonb,text,text),public.fcf_future_historical_six_restore(text)to service_role;
