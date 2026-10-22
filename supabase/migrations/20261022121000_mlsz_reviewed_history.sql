-- Exactly three user-approved Hungarian historical exclusions. No score or guessed statistic changes.
insert into private_historical_statistics.policies values('hu-mlsz-tolna-reviewed-history-20261022-v1','64e91b53f854262b193881e93c0427399bd90e1b11d69881bef87b227738bba3','{"id":"hu-mlsz-tolna-reviewed-history-20261022-v1","provider":"mlsz","sourcePolicy":"hu-mlsz-reviewed-history-v1","competitionSlug":"hu-to-3-nyugat","competitionId":463,"sourceLeagueCode":"67/17/34465","season":"2025/26","recordedAt":"2026-10-22T10:47:18.409587+00:00","approvalReference":"User instruction ''you can enable hungary'' on 22 October 2026, following the exact-three Hungarian historical-exclusion proposal; recording time, user send time unavailable.","entries":[{"sourceMatchId":"2175016","sourceCompetitionId":"65/17/31528","sourcePhase":null,"sourceRound":12,"playedOn":"2026-03-21","homeSourceClubId":"318500","awaySourceClubId":"318499","sourceUrl":"https://adatbank.mlsz.hu/match/65/17/31528/12/2175016.html","rawSha256":"ca3ddd1393b8ec598e9e343d0f4eea4f8bb3c56e6e35fc26d8b4571bfdcfd4f5","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"score_goal_events_disagree"}]}'::jsonb);
insert into private_historical_statistics.policies values('hu-mlsz-baz-u19-reviewed-history-20261022-v1','359448901940051891896fc36d0b6ae5b959150007623ec788095c281495bae8','{"id":"hu-mlsz-baz-u19-reviewed-history-20261022-v1","provider":"mlsz","sourcePolicy":"hu-mlsz-reviewed-history-v1","competitionSlug":"hu-baz-u19-2-kozep","competitionId":619,"sourceLeagueCode":"67/4/34094","season":"2025/26","recordedAt":"2026-10-22T10:47:18.409587+00:00","approvalReference":"User instruction ''you can enable hungary'' on 22 October 2026, following the exact-three Hungarian historical-exclusion proposal; recording time, user send time unavailable.","entries":[{"sourceMatchId":"2078392","sourceCompetitionId":"65/4/31796","sourcePhase":null,"sourceRound":2,"playedOn":"2025-09-13","homeSourceClubId":"310339","awaySourceClubId":"310335","sourceUrl":"https://adatbank.mlsz.hu/match/65/4/31796/2/2078392.html","rawSha256":"59b4a00e841bcadd2f78e92cf799b2346321c3cf11d1967a20133644f81922a0","observedHomeScore":0,"observedAwayScore":3,"reasonCode":"score_goal_events_disagree"},{"sourceMatchId":"2078437","sourceCompetitionId":"65/4/31796","sourcePhase":null,"sourceRound":11,"playedOn":"2026-04-04","homeSourceClubId":"310335","awaySourceClubId":"310339","sourceUrl":"https://adatbank.mlsz.hu/match/65/4/31796/11/2078437.html","rawSha256":"0413bbafb89880a00e14f4adaeb57932ca764b7d60145adb210b0bc8affdc2e8","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"score_goal_events_disagree"}]}'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs)values('mlsz','318500','','HU',array['NAGYDOROG KSE'],'[{"sourceMatchId":"2175016","sourceUrl":"https://adatbank.mlsz.hu/match/65/17/31528/12/2175016.html","rawSha256":"ca3ddd1393b8ec598e9e343d0f4eea4f8bb3c56e6e35fc26d8b4571bfdcfd4f5"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs)values('mlsz','318499','','HU',array['NÉMETKÉRI SE'],'[{"sourceMatchId":"2175016","sourceUrl":"https://adatbank.mlsz.hu/match/65/17/31528/12/2175016.html","rawSha256":"ca3ddd1393b8ec598e9e343d0f4eea4f8bb3c56e6e35fc26d8b4571bfdcfd4f5"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs)values('mlsz','310339','','HU',array['Onga SE'],'[{"sourceMatchId":"2078392","sourceUrl":"https://adatbank.mlsz.hu/match/65/4/31796/2/2078392.html","rawSha256":"59b4a00e841bcadd2f78e92cf799b2346321c3cf11d1967a20133644f81922a0"},{"sourceMatchId":"2078437","sourceUrl":"https://adatbank.mlsz.hu/match/65/4/31796/11/2078437.html","rawSha256":"0413bbafb89880a00e14f4adaeb57932ca764b7d60145adb210b0bc8affdc2e8"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs)values('mlsz','310335','','HU',array['Borsodivánka SE'],'[{"sourceMatchId":"2078392","sourceUrl":"https://adatbank.mlsz.hu/match/65/4/31796/2/2078392.html","rawSha256":"59b4a00e841bcadd2f78e92cf799b2346321c3cf11d1967a20133644f81922a0"},{"sourceMatchId":"2078437","sourceUrl":"https://adatbank.mlsz.hu/match/65/4/31796/11/2078437.html","rawSha256":"0413bbafb89880a00e14f4adaeb57932ca764b7d60145adb210b0bc8affdc2e8"}]'::jsonb);
-- Extend the two original namespace allowlists in place, retaining every later
-- FCF guard and leaving closed dedicated MFA protocols untouched. Fail on drift.
do $$declare definition text;changed text;begin
 select pg_get_functiondef('public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure)into definition;
 changed:=replace(definition,$n$when 'fcf'then 'ES'end$n$,$n$when 'fcf'then 'ES'when 'mlsz'then 'HU'end$n$);
 if changed=definition then raise exception 'MLSZ_HISTORY: country allowlist definition drift';end if;execute changed;
 select pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure)into definition;
 changed:=replace(definition,$n$when 'hns' then p_source_match_id$n$,$n$when 'hns' then p_source_match_id when 'mlsz' then case when p_source_match_id~'^[1-9][0-9]+$'then p_source_match_id end$n$);
 if changed=definition then raise exception 'MLSZ_HISTORY: report namespace definition drift';end if;execute changed;
end$$;
create schema private_mlsz_history;
revoke all on schema private_mlsz_history from public,anon,authenticated,service_role;

create table private_mlsz_history.cleanup_receipt(singleton boolean primary key default true check(singleton),main_sha text not null,before_sha text not null,before_image_text text not null,result jsonb not null,recorded_at timestamptz not null default clock_timestamp());
revoke all on private_mlsz_history.cleanup_receipt from public,anon,authenticated,service_role;

create function private_mlsz_history.cleanup_targets()
returns table(match_id bigint,competition_id bigint,competition_slug text,source_code text,round_id bigint,round_number integer,home_id bigint,away_id bigint,played_on date,home_goals integer,away_goals integer,native_id text,appearances integer,goals integer)
language sql immutable set search_path=public,pg_temp as $$
 values
 (545453::bigint,463::bigint,'hu-to-3-nyugat','67/17/34465',35013::bigint,12,10747::bigint,10746::bigint,'2026-03-21'::date,3,0,'2175016',30,8),
 (545353::bigint,619::bigint,'hu-baz-u19-2-kozep','67/4/34094',34986::bigint,2,2365::bigint,2416::bigint,'2025-09-13'::date,0,3,'2078392',24,4),
 (545385::bigint,619::bigint,'hu-baz-u19-2-kozep','67/4/34094',34995::bigint,11,2416::bigint,2365::bigint,'2026-04-04'::date,3,0,'2078437',23,6);
$$;

create function private_mlsz_history.require(ok boolean,message text)returns void language plpgsql as $$begin
 if ok is distinct from true then raise exception 'MLSZ_HISTORY: %',message;end if;
end$$;

-- Capture complete original rows, never a projection that could hide changed statistics.
create function private_mlsz_history.capture()returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb:='{}';q record;rows jsonb;
begin
 for q in select * from(values
 ('competitions','select * from public.competitions where id in(463,619)'),
 ('rounds','select * from public.rounds where competition_id in(463,619)'),
 ('matches','select m.* from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(463,619)'),
 ('teams','select t.* from public.teams t where t.id in(select m.home_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(463,619) union select m.away_team_id from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id in(463,619))'),
 ('players','select * from public.players where competition_id in(463,619)'),
 ('appearances','select * from public.appearances where match_id in(545453,545353,545385)'),
 ('goals','select * from public.goals where match_id in(545453,545353,545385)'),
 ('otherAppearances','select a.* from public.appearances a join public.matches m on m.id=a.match_id join public.rounds r on r.id=m.round_id where r.competition_id in(463,619)and m.id not in(545453,545353,545385)'),
 ('otherGoals','select g.* from public.goals g join public.matches m on m.id=g.match_id join public.rounds r on r.id=m.round_id where r.competition_id in(463,619)and m.id not in(545453,545353,545385)'),
 ('otherScores','select ps.* from public.player_scores ps join public.rounds r on r.id=ps.round_id where r.competition_id in(463,619)and r.id not in(35013,34986,34995)'),
 ('player_scores','select ps.* from public.player_scores ps where ps.round_id in(35013,34986,34995)'),
 ('statistika_igralcev','select s.* from public.statistika_igralcev s where s.player_id in(select id from public.players where competition_id in(463,619))'),
 ('tocke_krogov','select t.* from public.tocke_krogov t where t.round_id in(35013,34986,34995)'),
 ('uradne_odsotnosti','select * from public.uradne_odsotnosti where ni_drzalo_match_id in(545453,545353,545385)'),
 ('profil_igralca_plus','select * from public.profil_igralca_plus where tekma_id in(545453,545353,545385)'),
 ('policies','select *from private_historical_statistics.policies where document->>''provider''=''mlsz'''),
 ('bindings','select *from private_historical_statistics.source_club_bindings where provider=''mlsz''')
 )v(key,query)loop
  execute 'select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text collate "C"),''[]''::jsonb)from('||q.query||')t'into rows;
  result:=result||jsonb_build_object(q.key,rows);
 end loop;
 return result;
end$$;

create function private_mlsz_history.check_and_lock(p_main_sha text,p_policy_hashes jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare expected_hashes jsonb;n int;target record;policy record;e jsonb;catalog jsonb;b record;side record;
begin
 perform private_mlsz_history.require(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 perform private_mlsz_history.require(p_main_sha~'^[a-f0-9]{40}$','exact reviewed main commit required');
 -- A closed short maintenance transaction: block phantom users, votes, caches and
 -- FK/schema changes before the first identity read, including non-FK audit rows.
 lock table public.countries,public.competitions,public.rounds,public.teams,public.players,public.matches,
 public.appearances,public.goals,public.fantasy_teams,public.fantasy_roster,public.fantasy_lineups,public.fantasy_transfers,public.fantasy_chips,
 public.position_votes,public.position_votes_deleted,public.assist_votes,public.assist_votes_deleted,
 public.player_scores,public.statistika_igralcev,public.tocke_krogov,public.uradne_odsotnosti,public.profil_igralca_plus in share row exclusive mode;
 lock table private_historical_statistics.policies,private_historical_statistics.installed_policies,private_historical_statistics.markers,private_historical_statistics.source_club_bindings,private_mlsz_history.cleanup_receipt in share row exclusive mode;
 perform 1 from public.competitions where id in(463,619)order by id for update;
 select jsonb_object_agg(p.id,p.policy_sha256)into expected_hashes from private_historical_statistics.policies p
 where p.document->>'provider'='mlsz'and p.document->>'sourcePolicy'='hu-mlsz-reviewed-history-v1'
 and p.document->>'competitionSlug'in('hu-to-3-nyugat','hu-baz-u19-2-kozep');
 perform private_mlsz_history.require((select count(*)from jsonb_object_keys(expected_hashes))=2 and p_policy_hashes=expected_hashes,'exact two immutable policy hashes required');
 perform private_mlsz_history.require(not exists(select 1 from private_mlsz_history.cleanup_receipt),'cleanup already committed; inspect receipt, never retry');
 perform private_mlsz_history.opening(463,clock_timestamp());perform private_mlsz_history.opening(619,clock_timestamp());
 perform private_mlsz_history.require(not exists(select 1 from private_historical_statistics.installed_policies where competition_id in(463,619)),'cleanup is one-use; installed policy already exists');
 for target in select * from private_mlsz_history.cleanup_targets()order by match_id loop
  perform private_mlsz_history.require(exists(select 1 from public.competitions c join public.countries d on d.id=c.country_id where c.id=target.competition_id and c.slug=target.competition_slug and c.source='mlsz'and c.source_league_code=target.source_code and not c.sezona_koledarska and not c.active and c.source_policy is null and c.prvi_fantasy_krog=case when c.id=463 then 1 else 2 end and d.code='HU'),'inactive exact MLSZ competition identity required');
  perform private_mlsz_history.require(exists(select 1 from public.rounds r where r.id=target.round_id and r.competition_id=target.competition_id and r.number=target.round_number and r.season='2025/26'),'exact archive round identity required');
  perform private_mlsz_history.require(exists(select 1 from public.matches m where m.id=target.match_id and m.round_id=target.round_id and m.home_team_id=target.home_id and m.away_team_id=target.away_id and m.played_on=target.played_on and m.home_goals=target.home_goals and m.away_goals=target.away_goals and m.zapisnik_id=target.native_id and m.source_url=(select value->>'sourceUrl'from private_historical_statistics.policies pp cross join lateral jsonb_array_elements(pp.document->'entries')where pp.document->>'competitionSlug'=target.competition_slug and value->>'sourceMatchId'=target.native_id) and m.imported_at is not null and m.statistics_status='available'and m.statistics_reason is null and not m.kontumacija and not m.vir_brez_izida and m.source_phase is null and(m.source_round is null or m.source_round=target.round_number)),'exact original match/result/source identity required');
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug;
  select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'=target.native_id;
  perform private_mlsz_history.require(e is not null and policy.document->>'season'='2025/26'and(e->>'sourceRound')::int=target.round_number and(e->>'playedOn')::date=target.played_on and(e->>'observedHomeScore')::int=target.home_goals and(e->>'observedAwayScore')::int=target.away_goals,'reviewed policy fixture identity differs');
  -- Preparation never binds/mutates clubs. The same immutable shared club
  -- descriptors must have exactly one canonical candidate, or an existing exact binding.
  for side in select e->>'homeSourceClubId'club,coalesce(e->>'homeSourceCategoryId','')category,target.home_id team union all select e->>'awaySourceClubId',coalesce(e->>'awaySourceCategoryId',''),target.away_id loop
   select sb.*into b from private_historical_statistics.source_club_bindings sb where sb.provider='mlsz'and sb.source_club_id=side.club and sb.source_category_id=side.category;
   perform private_mlsz_history.require(b.provider is not null and b.country_code='HU'and exists(select 1 from teams t join countries d on d.id=t.country_id where t.id=side.team and d.code='HU')and
    ((b.bound_team_id is not null and b.bound_team_id=side.team)or(b.bound_team_id is null and(select count(*)from teams t join countries d on d.id=t.country_id where t.name=any(b.canonical_names)and d.code='HU')=1 and exists(select 1 from teams t where t.id=side.team and t.name=any(b.canonical_names)))),'exact native club/category identity required');
  end loop;
  perform private_mlsz_history.require((select count(*)from public.appearances where match_id=target.match_id)=target.appearances and(select count(*)from public.goals where match_id=target.match_id)=target.goals,'exact approved77 appearances and18 goals required');
 end loop;
 perform private_mlsz_history.require(not exists(select 1 from public.fantasy_teams where competition_id in(463,619)),'new fantasy team activity');
 perform private_mlsz_history.require(not exists(select 1 from public.fantasy_roster fr join public.players p on p.id=fr.player_id where p.competition_id in(463,619)),'new roster activity');
 perform private_mlsz_history.require(not exists(select 1 from public.fantasy_lineups l join public.rounds r on r.id=l.round_id join public.players p on p.id=l.player_id where r.competition_id in(463,619)or p.competition_id in(463,619)),'new lineup activity');
 perform private_mlsz_history.require(not exists(select 1 from public.fantasy_transfers t join public.rounds r on r.id=t.round_id where r.competition_id in(463,619))and not exists(select 1 from public.fantasy_chips t join public.rounds r on r.id=t.round_id where r.competition_id in(463,619)),'new round fantasy activity');
 perform private_mlsz_history.require(not exists(select 1 from public.position_votes v join public.players p on p.id=v.player_id where p.competition_id in(463,619))and not exists(select 1 from public.position_votes_deleted v join public.players p on p.id=v.player_id where p.competition_id in(463,619)),'new position vote activity');
 perform private_mlsz_history.require(not exists(select 1 from public.assist_votes v join public.goals g on g.id=v.goal_id where g.match_id in(545453,545353,545385))and not exists(select 1 from public.assist_votes_deleted v join public.goals g on g.id=v.goal_id where g.match_id in(545453,545353,545385)),'new assist vote activity');
 perform private_mlsz_history.require(not exists(select 1 from public.goals where match_id in(545453,545353,545385)and(assist_player_id is not null or assist_confirmed_at is not null or assist_none_confirmed_at is not null)),'new confirmed assist activity');
 -- Only this reviewed FK is permitted to point at a row being deleted. Unknown
 -- dependencies abort even if empty; never let a new cascade silently erase data.
 select coalesce(jsonb_agg(jsonb_build_object('schema',ns.nspname,'table',t.relname,'target',p.relname,'definition',pg_get_constraintdef(c.oid))order by ns.nspname,t.relname,c.conname),'[]')into catalog
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_class p on p.oid=c.confrelid
 where c.contype='f'and c.confrelid in('public.appearances'::regclass,'public.goals'::regclass,'public.player_scores'::regclass,'public.statistika_igralcev'::regclass,'public.tocke_krogov'::regclass);
 perform private_mlsz_history.require(catalog='[{"schema":"public","table":"assist_votes","target":"goals","definition":"FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE"}]'::jsonb,'unexpected individual-row foreign key dependency');
 perform private_mlsz_history.require(not exists(select 1 from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace ns on ns.oid=t.relnamespace where ns.nspname in('public','scout')and t.relkind in('r','p')and a.attnum>0 and not a.attisdropped and a.attname in('appearance_id','goal_id')and not(ns.nspname='public'and t.relname in('assist_votes','assist_votes_deleted')and a.attname='goal_id')),'unexpected individual-row reference column');
end$$;

create function public.prepare_mlsz_historical_cleanup(p_main_sha text,p_policy_hashes jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare image jsonb;
begin
 perform private_mlsz_history.check_and_lock(p_main_sha,p_policy_hashes);
 image:=private_mlsz_history.capture()||jsonb_build_object('schemaVersion',1,'mainCommit',p_main_sha,'policyHashes',p_policy_hashes);
 return jsonb_build_object('beforeImage',image,'beforeImageText',image::text,'beforeSha256',encode(sha256(convert_to(image::text,'UTF8')),'hex'));
end$$;

create function public.apply_mlsz_historical_cleanup(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;prepared jsonb;target record;policy record;e jsonb;fixture jsonb;pid bigint;rid bigint;n integer;preserved jsonb;p_before_image jsonb;
begin
 begin p_before_image:=p_before_image_text::jsonb;exception when invalid_text_representation then raise exception 'MLSZ_HISTORY: beforeimage must be SQL-produced JSON text';end;
 perform private_mlsz_history.require(jsonb_typeof(p_before_image)='object','complete beforeimage object required');
 perform private_mlsz_history.require(p_before_sha~'^[a-f0-9]{64}$'and p_before_image is not null and encode(sha256(convert_to(p_before_image::text,'UTF8')),'hex')=p_before_sha,'reviewed complete beforeimage SHA required');
 prepared:=public.prepare_mlsz_historical_cleanup(p_main_sha,p_policy_hashes);
 perform private_mlsz_history.require(prepared->>'beforeSha256'=p_before_sha and prepared->'beforeImage'=p_before_image and prepared->>'beforeImageText'=p_before_image_text,'canonical beforeimage drift');
 -- All individual removals, cache corrections, policy installs and three markers
 -- commit together. No generic importer can observe an intermediate empty row.
 delete from public.goals where match_id in(545453,545353,545385);
 get diagnostics n=row_count;perform private_mlsz_history.require(n=18,'goal delete count differs');
 delete from public.appearances where match_id in(545453,545353,545385);
 get diagnostics n=row_count;perform private_mlsz_history.require(n=77,'appearance delete count differs');
 update public.matches set imported_at=null where id in(545453,545353,545385);
 update public.competitions set source_policy='hu-mlsz-reviewed-history-v1',prvi_fantasy_krog=case when id=463 then 8 else 7 end where id in(463,619);
 for policy in select p.*,c.id as cid from private_historical_statistics.policies p join public.competitions c on c.slug=p.document->>'competitionSlug'where c.id in(463,619)order by c.id loop
  perform public.apply_historical_statistics_policy(policy.cid,policy.id,policy.policy_sha256,policy.document->'entries');
 end loop;
 for target in select * from private_mlsz_history.cleanup_targets()order by match_id loop
  select p.*into policy from private_historical_statistics.policies p where p.document->>'competitionSlug'=target.competition_slug;
  select value into e from jsonb_array_elements(policy.document->'entries')where value->>'sourceMatchId'=target.native_id;
  fixture:=(e-array['rawSha256','reasonCode'])||jsonb_build_object('season',policy.document->>'season');
  perform public.upsert_unavailable_historical_match(target.competition_id,target.native_id,policy.id,policy.policy_sha256,e->>'rawSha256',jsonb_build_object('roundId',target.round_id,'homeTeamId',target.home_id,'awayTeamId',target.away_id,'fixture',fixture));
 end loop;
 for rid in select distinct round_id from private_mlsz_history.cleanup_targets()loop perform public.recompute_round_scores(rid);end loop;
 perform public.osvezi_statistiko_igralcev(array(select id from public.players where competition_id in(463,619)));
 perform public.osvezi_tocke_krogov(array[35013,34986,34995]::bigint[]);
 perform private_mlsz_history.require(not exists(select 1 from public.player_scores ps where ps.round_id in(35013,34986,34995)and not exists(select 1 from public.appearance_points ap where ap.round_id=ps.round_id and ap.player_id=ps.player_id)),'stale derived individual scores');
 for pid in select unnest(array[463,619]::bigint[])loop perform public.get_installed_historical_statistics_markers(pid);end loop;
 preserved:=private_mlsz_history.capture();
 perform private_mlsz_history.require(preserved->'otherAppearances'=p_before_image->'otherAppearances'and preserved->'otherGoals'=p_before_image->'otherGoals'and preserved->'otherScores'=p_before_image->'otherScores'and preserved->'players'=p_before_image->'players'and preserved->'teams'=p_before_image->'teams'and preserved->'rounds'=p_before_image->'rounds'and preserved->'uradne_odsotnosti'=p_before_image->'uradne_odsotnosti'and preserved->'profil_igralca_plus'=p_before_image->'profil_igralca_plus','protected players/teams/rounds/profile references changed');
 perform private_mlsz_history.require(not exists(select 1 from jsonb_array_elements(p_before_image->'matches')b where(b->>'id')::bigint not in(545453,545353,545385)and not exists(select 1 from jsonb_array_elements(preserved->'matches')a where a=b)),'unrelated match changed');
 result:=jsonb_build_object('schemaVersion',1,'mainCommit',p_main_sha,'beforeSha256',p_before_sha,'removedAppearances',77,'removedGoals',18,'unavailableMatches',3,'afterSha256',encode(sha256(convert_to(preserved::text,'UTF8')),'hex'));
 insert into private_mlsz_history.cleanup_receipt(singleton,main_sha,before_sha,before_image_text,result)values(true,p_main_sha,p_before_sha,p_before_image_text,result);
 return result;
end$$;

revoke all on all functions in schema private_mlsz_history from public,anon,authenticated,service_role;
revoke all on function public.prepare_mlsz_historical_cleanup(text,jsonb),public.apply_mlsz_historical_cleanup(text,jsonb,text,text)from public,anon,authenticated;
grant execute on function public.prepare_mlsz_historical_cleanup(text,jsonb),public.apply_mlsz_historical_cleanup(text,jsonb,text,text)to service_role;

-- Opening selection is pinned to the future source-reviewed fixtures; a missed
-- launch requires a new review, never silently select an arbitrary later round.
create function private_mlsz_history.opening(cid bigint,p_clock timestamptz)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare rid bigint;begin
 rid:=case cid when 463 then 22000 when 619 then 25174 end;
 perform private_mlsz_history.require(exists(select 1 from rounds where id=rid and competition_id=cid and season='2026/27'and number=case cid when 463 then 8 else 7 end and played_on='2026-10-24'and deadline_at='2026-10-24T07:00:00Z'and deadline_at>p_clock and lineups_locked_at is null),'exact future unlocked October24 opening required');
 perform private_mlsz_history.require((select count(*)from matches where round_id=rid)=case cid when 463 then 5 else 3 end and not exists(select 1 from(values(463,246410,7129,7119,'2026-10-25'::date),(463,246403,7115,7131,'2026-10-24'::date),(463,246405,7121,7126,'2026-10-25'::date),(463,246407,7127,7124,'2026-10-25'::date),(463,246409,7116,7122,'2026-10-25'::date),(619,279555,2410,1765,'2026-10-25'::date),(619,279554,2416,2419,'2026-10-25'::date),(619,279553,7945,2377,'2026-10-24'::date))v(cid,mid,h,a,day)where v.cid=opening.cid and not exists(select 1 from matches m where m.id=v.mid and m.round_id=rid and m.home_team_id=v.h and m.away_team_id=v.a and m.played_on=v.day))and not exists(select 1 from matches where round_id=rid and(played_on<'2026-10-24'or imported_at is not null or zapisnik_id is not null or home_goals<>0 or away_goals<>0 or statistics_status<>'available'or kontumacija or vir_brez_izida))and not exists(select 1 from appearances a join matches m on m.id=a.match_id where m.round_id=rid)and not exists(select 1 from goals g join matches m on m.id=g.match_id where m.round_id=rid)and not exists(select 1 from fantasy_lineups where round_id=rid),'source-reviewed opening fixtures must remain unplayed');
end$$;

create function private_mlsz_history.release_core(cid bigint,p_main_sha text,p_activate boolean,p_clock timestamptz)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c competitions%rowtype;p private_historical_statistics.policies%rowtype;b jsonb;prices jsonb;cost numeric;image jsonb;actual jsonb;result jsonb;sha text;begin
 perform private_mlsz_history.require(current_setting('transaction_isolation')='read committed'and p_main_sha~'^[a-f0-9]{40}$','READ COMMITTED and exact main commit required');
 lock table countries,competitions,rounds,teams,players,matches,appearances,goals,fantasy_teams in share row exclusive mode;
 lock table private_historical_statistics.policies,private_historical_statistics.installed_policies,private_historical_statistics.markers,private_historical_statistics.source_club_bindings,private_mlsz_history.cleanup_receipt in share row exclusive mode;
 select *into c from competitions where id=cid;
 perform private_mlsz_history.require((c.id=463 and c.slug='hu-to-3-nyugat'and c.source_league_code='67/17/34465')or(c.id=619 and c.slug='hu-baz-u19-2-kozep'and c.source_league_code='67/4/34094'),'only exact two native candidates allowed');
 perform private_mlsz_history.require(not c.active and c.source='mlsz'and c.source_policy='hu-mlsz-reviewed-history-v1'and not c.sezona_koledarska and exists(select 1 from countries where id=c.country_id and code='HU')and not exists(select 1 from fantasy_teams where competition_id=cid),'inactive Hungarian MLSZ candidate without fantasy teams required');
 select *into p from private_historical_statistics.policies where id=case cid when 463 then'hu-mlsz-tolna-reviewed-history-20261022-v1'else'hu-mlsz-baz-u19-reviewed-history-20261022-v1'end;
 perform private_mlsz_history.require(p.policy_sha256=case cid when 463 then'64e91b53f854262b193881e93c0427399bd90e1b11d69881bef87b227738bba3'else'359448901940051891896fc36d0b6ae5b959150007623ec788095c281495bae8'end and p.document->>'competitionSlug'=c.slug and p.document->>'provider'='mlsz'and p.document->>'sourcePolicy'=c.source_policy,'exact immutable policy required');
 b:=public.get_installed_historical_statistics_markers(cid);
 perform private_mlsz_history.require(b->>'policyId'=p.id and b->>'policySha256'=p.policy_sha256 and jsonb_array_length(b->'markers')=case cid when 463 then 1 else 2 end and not exists(select 1 from private_historical_statistics.markers mk where mk.competition_id=cid and not exists(select 1 from private_mlsz_history.cleanup_targets()t where t.competition_id=cid and t.native_id=mk.source_match_id and t.round_id=mk.round_id and t.home_id=mk.home_team_id and t.away_id=mk.away_team_id)),'exact reviewed markers required');
 perform private_mlsz_history.opening(cid,p_clock);
 -- A cleanup receipt pins every untouched football byte; player valuation is an
 -- independent output. A fresh ordinary import can use only these exact markers.
 select before_image_text::jsonb into image from private_mlsz_history.cleanup_receipt;
 if image is not null then
 actual:=private_mlsz_history.capture();
 perform private_mlsz_history.require(actual->'otherAppearances'=image->'otherAppearances'and actual->'otherGoals'=image->'otherGoals'and actual->'rounds'=image->'rounds'and actual->'teams'=image->'teams'and actual->'policies'=image->'policies'and jsonb_array_length(actual->'matches')=jsonb_array_length(image->'matches')and not exists(select 1 from jsonb_array_elements(image->'matches')old where(old->>'id')::bigint not in(545453,545353,545385)and not exists(select 1 from jsonb_array_elements(actual->'matches')now where now=old)),'original untouched football changed since reviewed cleanup');
 end if;
 perform private_mlsz_history.require((select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and r.season='2025/26'and m.imported_at is not null and m.statistics_status='available')=case cid when 463 then 86 else 63 end and(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and r.season='2026/27'and m.imported_at is not null and m.statistics_status='available')=case cid when 463 then 32 else 13 end,'exact reviewed available archive/current report coverage required');
 perform private_mlsz_history.require(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and((m.statistics_status='unavailable_historical'and not exists(select 1 from private_mlsz_history.cleanup_targets()t where t.match_id=m.id and t.competition_id=cid))or(m.played_on<p_clock::date and not m.kontumacija and not m.vir_brez_izida and m.statistics_status='available'and m.imported_at is null)or(m.imported_at is not null and(m.statistics_status<>'available'or m.home_goals is null or m.away_goals is null or m.zapisnik_id!~'^[1-9][0-9]+$'or m.source_url is distinct from 'https://adatbank.mlsz.hu/match/'||case when r.season='2025/26'then case cid when 463 then'65/17/31528'else'65/4/31796'end else c.source_league_code end||'/'||r.number||'/'||m.zapisnik_id||'.html')))),'no additional missing, unavailable or foreign report allowed');
 -- Score credit follows the side benefiting from an own goal. Short authentic
 -- lineups are legal; every imported side still needs players and a goalkeeper.
 perform private_mlsz_history.require(not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.imported_at is not null and(m.home_goals is distinct from(select count(*)::int from goals g where g.match_id=m.id and((g.team_id=m.home_team_id and not g.is_own_goal)or(g.team_id=m.away_team_id and g.is_own_goal)))or m.away_goals is distinct from(select count(*)::int from goals g where g.match_id=m.id and((g.team_id=m.away_team_id and not g.is_own_goal)or(g.team_id=m.home_team_id and g.is_own_goal)))or exists(select 1 from(values(m.home_team_id),(m.away_team_id))side(id)where(select count(*)from appearances a where a.match_id=m.id and a.team_id=side.id and a.started)not between 7 and 11 or not exists(select 1 from appearances a where a.match_id=m.id and a.team_id=side.id and a.is_goalkeeper and a.started)))),'all ordinary score credits, legal lineups and keepers must agree');
 perform private_mlsz_history.require(not exists(select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=cid and(g.minute is null or g.minute<0 or g.minute>90 or g.team_id not in(m.home_team_id,m.away_team_id)or not exists(select 1 from appearances a where a.match_id=g.match_id and a.player_id=g.scorer_id and a.team_id=g.team_id)))and not exists(select 1 from appearances a join players pl on pl.id=a.player_id join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=cid and(pl.competition_id<>cid or a.team_id not in(m.home_team_id,m.away_team_id)or a.minutes_played is null or a.minute_on is null or a.minute_off is null or a.minute_on<0 or a.minute_off>90 or a.minute_on>a.minute_off or a.minutes_played<>a.minute_off-a.minute_on)),'goal/appearance side, player and minute consistency required');
 perform private_mlsz_history.require(not exists(select 1 from public.zliti_igralci(c.slug,'mlsz')where preskok is null),'unresolved player identity collision');
 prices:=public.stanje_lige(cid);cost:=public.najcenejsi_kader(prices->'igralci');
 perform private_mlsz_history.require((prices->>'klubov')::int=case cid when 463 then 11 else 6 end and cost is not null and cost<=100 and(prices->>'najvisja_cena')::numeric>=8 and coalesce((prices->>'privzetih')::numeric/nullif((prices->>'aktivnih')::numeric,0),1)<=0.7 and(prices->>'golov_brez_nastopa')::int=0 and(prices->>'nastopov_s_klopi')::int>0,'varied actual prices, retained bench and affordable legal15 required');
 perform private_mlsz_history.require(not exists(select distinct pl.team_id from players pl where pl.competition_id=cid and pl.active except select distinct pl.team_id from players pl join appearances a on a.player_id=pl.id and a.team_id=pl.team_id join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where pl.competition_id=cid and r.competition_id=cid and r.season='2026/27'and pl.active and pl.position='GK'and pl.position_source in('zapisnik','admin','klub')and a.is_goalkeeper and a.started and m.statistics_status='available'and m.imported_at is not null),'current trusted goalkeeper for every selectable club required');
 result:=jsonb_build_object('ready',true,'active',false,'reason',null,'competitionId',cid,'mainCommit',p_main_sha,'firstRound',case cid when 463 then 8 else 7 end,'firstDeadline','2026-10-24T07:00:00Z','policyId',p.id,'policySha256',p.policy_sha256,'markers',b,'cheapestLegal15',cost);
 if p_activate then
 update competitions set prvi_fantasy_krog=case cid when 463 then 8 else 7 end where id=cid;
 sha:=private_historical_statistics.state_sha256(cid);
 perform private_historical_statistics.authorize_release(cid,p.id,p.policy_sha256,sha);
 update competitions set active=true where id=cid and not active;
 perform private_mlsz_history.require(found,'inactive activation row changed');
 result:=result||jsonb_build_object('active',true);
 end if;
 return result;
end$$;
create function public.release_mlsz_reviewed_history(p_competition_id bigint,p_main_sha text,p_activate boolean default false)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$begin
 return private_mlsz_history.release_core(p_competition_id,p_main_sha,p_activate,clock_timestamp());
 exception when others then if p_activate then raise;end if;return jsonb_build_object('ready',false,'active',false,'firstRound',null,'firstDeadline',null,'reason',sqlerrm);end$$;
create function public.get_mlsz_reviewed_history_receipt()returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('cleanup',(select to_jsonb(r)from private_mlsz_history.cleanup_receipt r),'competitions',(select jsonb_agg(jsonb_build_object('id',c.id,'active',c.active,'markers',public.get_installed_historical_statistics_markers(c.id))order by c.id)from competitions c where c.id in(463,619)));
$$;

-- Catalog approval and installed identities are immutable, including owner-path
-- ordinary writes. Club binding permits only the reviewed one-time NULL binding.
create function private_mlsz_history.protect_catalog()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare original jsonb;changed jsonb;tid bigint;begin
 original:=to_jsonb(old);if tg_op='UPDATE'then changed:=to_jsonb(new);end if;
 if tg_table_name='policies'then
 if original->>'provider'='mlsz'or original->'document'->>'provider'='mlsz'then raise exception 'MLSZ_HISTORY: immutable reviewed policy';end if;
 elsif tg_table_name='source_club_bindings'then
 if original->>'provider'='mlsz'then
 tid:=case original->>'source_club_id'when'318500'then 10747 when'318499'then 10746 when'310339'then 2365 when'310335'then 2416 end;
 if tg_op='UPDATE'and original->'bound_team_id'='null'::jsonb and(changed-'bound_team_id')=(original-'bound_team_id')and(changed->>'bound_team_id')::bigint=tid then return new;end if;
 raise exception 'MLSZ_HISTORY: immutable reviewed club binding';end if;
 elsif tg_table_name='cleanup_receipt'or(original->>'competition_id')::bigint in(463,619)then raise exception 'MLSZ_HISTORY: immutable installed review/receipt';
 end if;
 if tg_op='DELETE'then return old;else return new;end if;
end$$;
create trigger mlsz_immutable_policy before update or delete on private_historical_statistics.policies for each row execute function private_mlsz_history.protect_catalog();
create trigger mlsz_immutable_club before update or delete on private_historical_statistics.source_club_bindings for each row execute function private_mlsz_history.protect_catalog();
create trigger mlsz_immutable_install before update or delete on private_historical_statistics.installed_policies for each row execute function private_mlsz_history.protect_catalog();
create trigger mlsz_immutable_marker before update or delete on private_historical_statistics.markers for each row execute function private_mlsz_history.protect_catalog();
create trigger mlsz_immutable_receipt before update or delete on private_mlsz_history.cleanup_receipt for each row execute function private_mlsz_history.protect_catalog();
revoke all on all functions in schema private_mlsz_history from public,anon,authenticated,service_role;
revoke all on function public.release_mlsz_reviewed_history(bigint,text,boolean),public.get_mlsz_reviewed_history_receipt()from public,anon,authenticated;
grant execute on function public.release_mlsz_reviewed_history(bigint,text,boolean),public.get_mlsz_reviewed_history_receipt()to service_role;
