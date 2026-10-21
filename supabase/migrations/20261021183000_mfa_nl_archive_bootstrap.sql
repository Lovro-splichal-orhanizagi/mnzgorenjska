-- Closed scaffolding only: no NL policy or source-club approvals are seeded here.
-- Current-only native imports must precede later reviewed policy registration.
create schema private_mfa_nl_history;
revoke all on schema private_mfa_nl_history from public,anon,authenticated,service_role;
create table private_mfa_nl_history.bootstrap_receipt(
 competition_id bigint primary key check(competition_id in(973,974)),
 main_sha text not null,policy_sha text not null,before_sha text not null,
 before_image_text text not null,result jsonb not null,installed_at timestamptz not null default clock_timestamp());
revoke all on all tables in schema private_mfa_nl_history from public,anon,authenticated,service_role;

create function private_mfa_nl_history.require(ok boolean,message text)returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'MFA_NL_BOOTSTRAP: %',message;end if;end$$;
create function private_mfa_nl_history.target(p_id bigint)
returns table(id bigint,slug text,code text,policy_id text,source_policy text)language sql immutable as $$
 select *from(values
 (973::bigint,'mt-nl1','2601267/2027','mt-nl1-reviewed-history-2026-10-21-v1','mt-mfa-nl1-reviewed-history-v1'),
 (974::bigint,'mt-nl2','6234492/2027','mt-nl2-reviewed-history-2026-10-21-v1','mt-mfa-nl2-reviewed-history-v1'))v(id,slug,code,policy_id,source_policy)where id=p_id;
$$;
create function private_mfa_nl_history.lock_scope(p_id bigint,p_main_sha text)returns void
language plpgsql security definer set search_path=public,pg_temp as $$begin
 perform private_mfa_nl_history.require(exists(select 1 from private_mfa_nl_history.target(p_id))and p_main_sha~'^[a-f0-9]{40}$'and current_setting('transaction_isolation')='read committed','fixed native target, main SHA and READ COMMITTED required');
 -- Same lock order as the deployed MFA protocols, before the first identity read.
 lock table countries,federations,competitions,rounds,teams,players,matches,appearances,goals,fantasy_teams,fantasy_roster,fantasy_lineups,fantasy_transfers,fantasy_chips,position_votes,position_votes_deleted,assist_votes,assist_votes_deleted,player_scores,statistika_igralcev,tocke_krogov,uradne_odsotnosti,profil_igralca_plus,anonimizirani_igralci in share row exclusive mode;
 lock table private_historical_statistics.policies,private_historical_statistics.installed_policies,private_historical_statistics.markers,private_historical_statistics.source_club_bindings,private_mfa_nl_history.bootstrap_receipt in share row exclusive mode;
 perform 1 from competitions where id=p_id for update;
end$$;

create function private_mfa_nl_history.policy(p_id bigint,p_sha text)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t record;p private_historical_statistics.policies%rowtype;e jsonb;begin
 select *into t from private_mfa_nl_history.target(p_id);
 perform private_mfa_nl_history.require(t.id is not null,'unknown native target');
 select *into p from private_historical_statistics.policies where id=t.policy_id;
 perform private_mfa_nl_history.require(p.id is not null and p.policy_sha256=p_sha and p_sha~'^[a-f0-9]{64}$','stored reviewed immutable policy/hash required; no bootstrap policy seed');
 perform private_mfa_nl_history.require(p.document->>'id'=t.policy_id and p.document->>'provider'='mfa'and p.document->>'competitionSlug'=t.slug and p.document->>'sourcePolicy'=t.source_policy and p.document->>'season'='2026/27'and length(p.document->>'approvalReference')>0 and length(p.document->>'recordedAt')>0,'stored policy native identity differs');
 perform private_mfa_nl_history.require(jsonb_typeof(p.document->'entries')='array','stored policy entries must be an array');
 perform private_mfa_nl_history.require(jsonb_array_length(p.document->'entries')>0,'no approved archive entries');
 for e in select value from jsonb_array_elements(p.document->'entries')loop
  perform private_mfa_nl_history.require(jsonb_typeof(e)='object'and e-array['sourceMatchId','sourceCompetitionId','sourcePhase','sourceRound','season','playedOn','homeSourceClubId','awaySourceClubId','sourceUrl','rawSha256','observedHomeScore','observedAwayScore','reasonCode']='{}'::jsonb,'unsupported archive entry fields');
  perform private_mfa_nl_history.require(e->>'sourceMatchId'~'^[1-9][0-9]*$'and e->>'sourceCompetitionId'~'^[1-9][0-9]*$'and e->>'homeSourceClubId'~'^[1-9][0-9]*$'and e->>'awaySourceClubId'~'^[1-9][0-9]*$'and e->>'homeSourceClubId'<>e->>'awaySourceClubId'and e->'sourcePhase'='null'::jsonb and e->>'season'='2025/26'and e->>'sourceUrl'='https://matchcentre.mfa.com.mt/match/'||(e->>'sourceMatchId')and e->>'rawSha256'~'^[a-f0-9]{64}$'and length(e->>'reasonCode')>0,'archive source identity/hash differs');
  perform private_mfa_nl_history.require(jsonb_typeof(e->'sourceRound')='number'and pg_input_is_valid(e->>'sourceRound','integer')and e->>'sourceRound'~'^[1-9][0-9]*$'and jsonb_typeof(e->'observedHomeScore')='number'and pg_input_is_valid(e->>'observedHomeScore','integer')and e->>'observedHomeScore'~'^[0-9]+$'and jsonb_typeof(e->'observedAwayScore')='number'and pg_input_is_valid(e->>'observedAwayScore','integer')and e->>'observedAwayScore'~'^[0-9]+$'and e->>'playedOn'~'^202[56]-[0-9]{2}-[0-9]{2}$'and pg_input_is_valid(e->>'playedOn','date'),'invalid archive round/date/score');
  perform private_mfa_nl_history.require((e->>'playedOn')::date>='2025-07-01'and(e->>'playedOn')::date<'2026-07-01','entry must belong strictly to archive season');
  perform private_mfa_nl_history.require(not exists(select 1 from private_historical_statistics.policies other cross join lateral jsonb_array_elements(other.document->'entries')oe where other.id<>p.id and other.document->>'provider'='mfa'and oe->>'sourceMatchId'=e->>'sourceMatchId'),'source report belongs to another policy');
  if p_id=973 then perform private_mfa_nl_history.require(e->>'sourceMatchId'not in('50920555','51962893'),'NL I cannot claim the NL II continuation');end if;
 end loop;
 perform private_mfa_nl_history.require((select count(distinct x->>'sourceMatchId')from jsonb_array_elements(p.document->'entries')x)=jsonb_array_length(p.document->'entries')and(select count(distinct(x->>'sourceRound',x->>'homeSourceClubId',x->>'awaySourceClubId'))from jsonb_array_elements(p.document->'entries')x)=jsonb_array_length(p.document->'entries'),'duplicate source or logical fixture');
 if p_id=974 then
  e:=p.document->'entries'->0;
  perform private_mfa_nl_history.require(jsonb_array_length(p.document->'entries')=1 and e->>'sourceMatchId'='51962893'and e->>'sourceCompetitionId'='50920420'and e->>'sourceRound'='4'and e->>'playedOn'='2026-01-13'and e->>'homeSourceClubId'='39633'and e->>'awaySourceClubId'='39613'and e->>'observedHomeScore'='1'and e->>'observedAwayScore'='1','NL II requires exactly the reviewed final continuation fixture');
 end if;
 return p.document;
end$$;

create function private_mfa_nl_history.club_plan(p_id bigint,p_document jsonb)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare sid text;b private_historical_statistics.source_club_bindings%rowtype;ids bigint[];result jsonb:='[]';tid bigint;country bigint;begin
 select country_id into country from competitions where id=p_id;
 for sid in select distinct club from jsonb_array_elements(p_document->'entries')e cross join lateral(values(e->>'homeSourceClubId'),(e->>'awaySourceClubId'))v(club)order by club loop
  select *into b from private_historical_statistics.source_club_bindings where provider='mfa'and source_club_id=sid and source_category_id='';
  perform private_mfa_nl_history.require(b.provider is not null and b.country_code='MT'and cardinality(b.canonical_names)>0 and not exists(select 1 from unnest(b.canonical_names)n where n is null or btrim(n)=''),'reviewed canonical Malta source club binding required');
  tid:=b.bound_team_id;
  if tid is not null then
   perform private_mfa_nl_history.require(exists(select 1 from teams where id=tid and country_id=country),'bound source club belongs to another country or disappeared');
  else
   select array_agg(id order by id)into ids from teams where country_id=country and name=any(b.canonical_names);
   perform private_mfa_nl_history.require(coalesce(cardinality(ids),0)<=1,'ambiguous canonical club names');
   tid:=ids[1];
   perform private_mfa_nl_history.require(tid is not null or cardinality(b.canonical_names)=1,'missing club needs one exact reviewed canonical name');
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('sourceClubId',sid,'teamId',tid,'createName',case when tid is null then b.canonical_names[1]end,'binding',to_jsonb(b),'team',(select to_jsonb(t)from teams t where t.id=tid)));
 end loop;
 return result;
end$$;

create function private_mfa_nl_history.opening(p_id bigint,p_clock timestamptz)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare gap int;last_played int;higher int;r public.rounds%rowtype;fixtures jsonb;begin
 perform private_mfa_nl_history.require(p_clock is not null and public.sezona_lige(p_id,(p_clock at time zone 'Europe/Ljubljana')::date)='2026/27','fixed native current season required');
 -- Reproduce ordinary assessCompetition's non-calendar gap/played-round rule.
 select min(rr.number)into gap from rounds rr where rr.competition_id=p_id and rr.season='2026/27'and rr.deadline_at>p_clock and not exists(select 1 from matches m join appearances a on a.match_id=m.id where m.round_id=rr.id);
 select count(*)into higher from rounds rr where rr.competition_id=p_id and rr.season='2026/27'and rr.number>gap and exists(select 1 from matches m join appearances a on a.match_id=m.id where m.round_id=rr.id);
 select coalesce(max(rr.number),0)into last_played from rounds rr where rr.competition_id=p_id and rr.season='2026/27'and(gap is null or rr.number<gap or higher>2)and exists(select 1 from matches m join appearances a on a.match_id=m.id where m.round_id=rr.id);
 select *into r from rounds where competition_id=p_id and season='2026/27'and number>last_played and deadline_at>p_clock order by number,id limit 1;
 perform private_mfa_nl_history.require(r.id is not null and r.played_on>=(p_clock at time zone 'Europe/Ljubljana')::date and r.played_on<'2027-07-01'and r.deadline_at<((r.played_on+1)::timestamp at time zone 'Europe/Ljubljana')and r.lineups_locked_at is null and exists(select 1 from matches where round_id=r.id),'real unlocked future opening round with fixtures required');
 perform private_mfa_nl_history.require(not exists(select 1 from matches m where m.round_id=r.id and(m.played_on is null or m.played_on<r.played_on or m.imported_at is not null or m.zapisnik_id is not null or m.statistics_status<>'available'or m.home_goals<>0 or m.away_goals<>0 or m.kontumacija or m.vir_brez_izida or exists(select 1 from appearances where match_id=m.id)or exists(select 1 from goals where match_id=m.id))),'opening fixtures already played, uncertain or populated');
 perform private_mfa_nl_history.require(r.played_on=(select min(played_on)from matches where round_id=r.id),'opening date differs from first actual native fixture');
 select jsonb_agg(to_jsonb(m)order by m.id)into fixtures from matches m where round_id=r.id;
 return jsonb_build_object('round',to_jsonb(r),'fixtures',fixtures);
end$$;

create function private_mfa_nl_history.protected_current(p_id bigint)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb:='{}';q record;rows jsonb;begin
 for q in select *from(values
 ('rounds','select *from rounds where competition_id=$1 and season=''2026/27'''),
 ('matches','select m.*from matches m join rounds r on r.id=m.round_id where r.competition_id=$1 and r.season=''2026/27'''),
 ('players','select *from players where competition_id=$1'),
 ('teams','select t.*from teams t where t.id in(select team_id from players where competition_id=$1 union select m.home_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=$1 and r.season=''2026/27'' union select m.away_team_id from matches m join rounds r on r.id=m.round_id where r.competition_id=$1 and r.season=''2026/27'')'),
 ('appearances','select a.*from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where r.competition_id=$1'),
 ('goals','select g.*from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=$1'),
 ('playerScores','select s.*from player_scores s join rounds r on r.id=s.round_id where r.competition_id=$1'),
 ('statistics','select s.*from statistika_igralcev s join players p on p.id=s.player_id where p.competition_id=$1'),
 ('roundScores','select s.*from tocke_krogov s join rounds r on r.id=s.round_id where r.competition_id=$1')
 )v(key,query)loop
  execute 'select coalesce(jsonb_agg(to_jsonb(t)order by to_jsonb(t)::text),''[]''::jsonb)from('||q.query||')t'into rows using p_id;
  result:=result||jsonb_build_object(q.key,rows);
 end loop;return result;
end$$;

create function private_mfa_nl_history.prepare_core(p_id bigint,p_main_sha text,p_policy_sha text,p_clock timestamptz)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t record;document jsonb;clubs jsonb;launch jsonb;image jsonb;begin
 perform private_mfa_nl_history.lock_scope(p_id,p_main_sha);
 select *into t from private_mfa_nl_history.target(p_id);
 document:=private_mfa_nl_history.policy(p_id,p_policy_sha);
 perform private_mfa_nl_history.require(exists(select 1 from competitions c join countries d on d.id=c.country_id join federations f on f.id=c.federation_id and f.country_id=c.country_id where c.id=t.id and c.slug=t.slug and c.source='mfa'and c.source_league_code=t.code and c.source_policy is null and not c.active and not c.sezona_koledarska and c.date_only_deadline_policy is null and c.prvi_fantasy_krog=1 and d.code='MT'and f.code='mfa'),'exact inactive current-only native Malta tuple required');
 perform private_mfa_nl_history.require(not exists(select 1 from private_mfa_nl_history.bootstrap_receipt where competition_id=p_id)and not exists(select 1 from private_historical_statistics.installed_policies where competition_id=p_id)and not exists(select 1 from private_historical_statistics.markers where competition_id=p_id),'one-use uninstalled native scope required');
 perform private_mfa_nl_history.require(not exists(select 1 from rounds where competition_id=p_id and season<>'2026/27')and not exists(select 1 from matches m where m.zapisnik_id='mt50920555'or m.zapisnik_id in(select'mt'||(e->>'sourceMatchId')from jsonb_array_elements(document->'entries')e)),'archive and reviewed source reports must be completely absent; no cleanup allowed');
 perform private_mfa_nl_history.require(not exists(select 1 from fantasy_teams where competition_id=p_id)and not exists(select 1 from fantasy_roster fr join players p on p.id=fr.player_id where p.competition_id=p_id)and not exists(select 1 from fantasy_lineups l left join rounds r on r.id=l.round_id left join players p on p.id=l.player_id where r.competition_id=p_id or p.competition_id=p_id)and not exists(select 1 from fantasy_transfers ft join rounds r on r.id=ft.round_id where r.competition_id=p_id)and not exists(select 1 from fantasy_chips fc join rounds r on r.id=fc.round_id where r.competition_id=p_id),'fantasy activity/dependency exists');
 perform private_mfa_nl_history.require(not exists(select 1 from position_votes v join players p on p.id=v.player_id where p.competition_id=p_id)and not exists(select 1 from position_votes_deleted v join players p on p.id=v.player_id where p.competition_id=p_id)and not exists(select 1 from assist_votes v left join goals g on g.id=v.goal_id left join matches m on m.id=g.match_id left join rounds r on r.id=m.round_id left join players p on p.id=v.player_id where r.competition_id=p_id or p.competition_id=p_id)and not exists(select 1 from assist_votes_deleted v left join goals g on g.id=v.goal_id left join matches m on m.id=g.match_id left join rounds r on r.id=m.round_id left join players p on p.id=v.player_id where r.competition_id=p_id or p.competition_id=p_id),'current or deleted vote activity exists');
 perform private_mfa_nl_history.require(not exists(select 1 from uradne_odsotnosti u join players p on p.id=u.player_id where p.competition_id=p_id)and not exists(select 1 from profil_igralca_plus v left join players p on p.id=v.player_id left join matches m on m.id=v.tekma_id left join rounds r on r.id=m.round_id where p.competition_id=p_id or r.competition_id=p_id)and not exists(select 1 from anonimizirani_igralci a join players p on p.id=a.player_id where p.competition_id=p_id),'player-owned/anonymous dependencies exist');
 perform private_mfa_nl_history.require(exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=p_id and r.season='2026/27'and m.imported_at is not null)and not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=p_id and m.imported_at is not null and(m.statistics_status<>'available'or m.kontumacija or m.vir_brez_izida or m.zapisnik_id is null or m.zapisnik_id!~'^mt[1-9][0-9]*$'or m.source_url is distinct from'https://matchcentre.mfa.com.mt/match/'||substring(m.zapisnik_id from 3)or exists(select 1 from(values(m.home_team_id),(m.away_team_id))v(tid)where(select count(*)from appearances a where a.match_id=m.id and a.team_id=v.tid and a.started)<>11)or m.home_goals<>(select count(*)from goals g where g.match_id=m.id and((g.team_id=m.home_team_id and not g.is_own_goal)or(g.team_id=m.away_team_id and g.is_own_goal)))or m.away_goals<>(select count(*)from goals g where g.match_id=m.id and((g.team_id=m.away_team_id and not g.is_own_goal)or(g.team_id=m.home_team_id and g.is_own_goal))))),'strict current-only imported source data required');
 perform private_mfa_nl_history.require(not exists(select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where r.competition_id=p_id and(g.minute is null or g.minute<0 or g.minute>90 or not exists(select 1 from appearances a where a.match_id=g.match_id and a.player_id=g.scorer_id and a.team_id=g.team_id)))and not exists(select 1 from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id join players p on p.id=a.player_id where r.competition_id=p_id and(p.competition_id<>p_id or a.team_id not in(m.home_team_id,m.away_team_id)or a.minutes_played is null or a.minute_on is null or a.minute_off is null or a.minute_on<0 or a.minute_off>90 or a.minute_on>a.minute_off or a.minutes_played<>a.minute_off-a.minute_on)),'current native individual identity/minutes differ');
 launch:=private_mfa_nl_history.opening(p_id,p_clock);
 clubs:=private_mfa_nl_history.club_plan(p_id,document);
 image:=jsonb_build_object('schemaVersion',1,'competitionId',p_id,'mainCommit',p_main_sha,'policySha256',p_policy_sha,'policyDocument',document,'competition',(select to_jsonb(c)from competitions c where c.id=p_id),'current',private_mfa_nl_history.protected_current(p_id),'clubPlan',clubs,'opening',launch);
 return jsonb_build_object('beforeImageText',image::text,'beforeSha256',encode(sha256(convert_to(image::text,'UTF8')),'hex'),'opening',launch);
end$$;

create function private_mfa_nl_history.apply_core(p_id bigint,p_main_sha text,p_policy_sha text,p_before_sha text,p_before_image_text text,p_clock timestamptz)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare prepared jsonb;image jsonb;document jsonb;club jsonb;entry jsonb;launch jsonb;tid bigint;rid bigint;home bigint;away bigint;mid bigint;markers jsonb;result jsonb;begin
 prepared:=private_mfa_nl_history.prepare_core(p_id,p_main_sha,p_policy_sha,p_clock);
 perform private_mfa_nl_history.require(p_before_sha~'^[a-f0-9]{64}$'and prepared->>'beforeSha256'=p_before_sha and prepared->>'beforeImageText'=p_before_image_text and encode(sha256(convert_to(p_before_image_text,'UTF8')),'hex')=p_before_sha,'complete externally reviewed beforeimage drift/hash mismatch');
 image:=p_before_image_text::jsonb;document:=image->'policyDocument';launch:=image->'opening';
 for club in select value from jsonb_array_elements(image->'clubPlan')loop
  tid:=(club->>'teamId')::bigint;
  if tid is null then insert into teams(name,country_id)values(club->>'createName',(select country_id from competitions where id=p_id))returning id into tid;end if;
  perform private_historical_statistics.bind_source_club('mfa',club->>'sourceClubId',null,(select country_id from competitions where id=p_id),tid);
 end loop;
 update competitions set source_policy=document->>'sourcePolicy',prvi_fantasy_krog=(launch->'round'->>'number')::int where id=p_id;
 insert into private_historical_statistics.installed_policies values(p_id,document->>'id',p_policy_sha,(launch->'round'->>'played_on')::date,now());
 for entry in select value from jsonb_array_elements(document->'entries')order by(value->>'sourceRound')::int,value->>'sourceMatchId'loop
  select id into rid from rounds where competition_id=p_id and season='2025/26'and number=(entry->>'sourceRound')::int;
  if rid is null then
   -- Only approved match dates are known here; no future dates/deadlines are invented.
   insert into rounds(competition_id,season,number,played_on)values(p_id,'2025/26',(entry->>'sourceRound')::int,(entry->>'playedOn')::date)returning id into rid;
  end if;
  select bound_team_id into home from private_historical_statistics.source_club_bindings where provider='mfa'and source_club_id=entry->>'homeSourceClubId'and source_category_id='';
  select bound_team_id into away from private_historical_statistics.source_club_bindings where provider='mfa'and source_club_id=entry->>'awaySourceClubId'and source_category_id='';
  insert into private_historical_statistics.markers values(p_id,entry->>'sourceMatchId','mt'||(entry->>'sourceMatchId'),entry-array['rawSha256','reasonCode'],entry->>'rawSha256',rid,home,away);
  insert into matches(round_id,home_team_id,away_team_id,home_goals,away_goals,played_on,zapisnik_id,source_url,statistics_status,statistics_reason,source_phase,source_round)
  values(rid,home,away,(entry->>'observedHomeScore')::int,(entry->>'observedAwayScore')::int,(entry->>'playedOn')::date,'mt'||(entry->>'sourceMatchId'),entry->>'sourceUrl','unavailable_historical',entry->>'reasonCode',null,(entry->>'sourceRound')::int)returning id into mid;
 end loop;
 markers:=public.get_installed_historical_statistics_markers(p_id);
 perform private_mfa_nl_history.require(private_mfa_nl_history.protected_current(p_id)=image->'current','protected current football/player/round data changed');
 perform private_mfa_nl_history.require(private_mfa_nl_history.opening(p_id,p_clock)=launch,'native future opening changed');
 result:=jsonb_build_object('schemaVersion',1,'competitionId',p_id,'mainCommit',p_main_sha,'policySha256',p_policy_sha,'beforeSha256',p_before_sha,'installed',markers,'opening',launch,'afterStateSha256',private_historical_statistics.state_sha256(p_id),'createdUnavailableHeaders',jsonb_array_length(document->'entries'),'removedAppearances',0,'removedGoals',0);
 insert into private_mfa_nl_history.bootstrap_receipt values(p_id,p_main_sha,p_policy_sha,p_before_sha,p_before_image_text,result,clock_timestamp());
 return result;
end$$;

-- Public wrappers never accept caller clocks. Recheck actual time after all work.
create function public.prepare_mfa_nl_reviewed_bootstrap(p_competition_id bigint,p_main_sha text,p_policy_sha text)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$declare result jsonb;begin
 result:=private_mfa_nl_history.prepare_core(p_competition_id,p_main_sha,p_policy_sha,clock_timestamp());
 perform private_mfa_nl_history.opening(p_competition_id,clock_timestamp());return result;end$$;
create function public.apply_mfa_nl_reviewed_bootstrap(p_competition_id bigint,p_main_sha text,p_policy_sha text,p_before_sha text,p_before_image_text text)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$declare result jsonb;begin
 result:=private_mfa_nl_history.apply_core(p_competition_id,p_main_sha,p_policy_sha,p_before_sha,p_before_image_text,clock_timestamp());
 perform private_mfa_nl_history.opening(p_competition_id,clock_timestamp());return result;end$$;
create function public.get_mfa_nl_reviewed_bootstrap_receipt(p_competition_id bigint)returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$begin
 perform private_mfa_nl_history.require(exists(select 1 from private_mfa_nl_history.target(p_competition_id)),'unknown receipt target');
 return jsonb_build_object('bootstrap',(select to_jsonb(r)from private_mfa_nl_history.bootstrap_receipt r where r.competition_id=p_competition_id),'installed',public.get_installed_historical_statistics_markers(p_competition_id),'active',(select active from competitions where id=p_competition_id));end$$;

-- Neither segment may ever become ordinary individual statistics, even before install.
create function private_mfa_nl_history.guard_continuation()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 if new.zapisnik_id='mt50920555'or(new.zapisnik_id='mt51962893'and(new.statistics_status<>'unavailable_historical'or not exists(select 1 from rounds where id=new.round_id and competition_id=974 and season='2025/26'and number=4)))then raise exception 'MFA_NL_BOOTSTRAP: continuation requires the exact installed final marker; abandoned header forbidden';end if;return new;end$$;
create trigger mfa_nl_continuation_guard before insert or update on matches for each row execute function private_mfa_nl_history.guard_continuation();
revoke all on all functions in schema private_mfa_nl_history from public,anon,authenticated,service_role;
revoke all on function public.prepare_mfa_nl_reviewed_bootstrap(bigint,text,text),public.apply_mfa_nl_reviewed_bootstrap(bigint,text,text,text,text),public.get_mfa_nl_reviewed_bootstrap_receipt(bigint)from public,anon,authenticated;
grant execute on function public.prepare_mfa_nl_reviewed_bootstrap(bigint,text,text),public.apply_mfa_nl_reviewed_bootstrap(bigint,text,text,text,text),public.get_mfa_nl_reviewed_bootstrap_receipt(bigint)to service_role;
