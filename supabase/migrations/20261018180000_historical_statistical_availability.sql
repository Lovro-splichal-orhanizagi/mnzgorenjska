-- Exact owner-approved prelaunch missingness; ordinary leagues keep their path.
-- Registry seeds generated from scripts/policies/historical-statistics-exclusions.json.
create schema private_historical_statistics;
revoke all on schema private_historical_statistics from public,anon,authenticated,service_role;
create table private_historical_statistics.policies(id text primary key,policy_sha256 text not null unique,document jsonb not null);
revoke all on private_historical_statistics.policies from public,anon,authenticated,service_role;
insert into private_historical_statistics.policies values('hr-hnlz-history-2026-10-18-v1','8f5dad1fe9af2646ab8ab639cfddec20865d30fc4797cfee607a2f7f521384fc','{"id":"hr-hnlz-history-2026-10-18-v1","provider":"hns","sourcePolicy":"hr-hnlz-v1","competitionSlug":"hr-prva-hnlz","season":"2026/27","recordedAt":"2026-10-18T13:09:11.816212+00:00","approvalReference":"user replies to call_c9caa54a31964c46bfee20ad68d6f385 (114471617,114471629) and call_e16cdac88b2b47ad877e5b7335d57f65 (114471627); ROOT relayed final approval at12:52UTC2026-10-18; recordedAt is recording time, user send time unavailable","entries":[{"sourceMatchId":"114471617","sourceCompetitionId":"114471579","sourcePhase":null,"sourceRound":1,"playedOn":"2026-08-23","homeSourceClubId":"1274","awaySourceClubId":"107347","sourceUrl":"https://semafor.hns.family/utakmice/114471617/x/","rawSha256":"2dc781b523945db96f2a1ab2d216aaf19760c1c98e1aca3bade2c98fae09c53b","observedHomeScore":2,"observedAwayScore":2,"reasonCode":"missing_dismissal_clock_and_goalkeeper"},{"sourceMatchId":"114471627","sourceCompetitionId":"114471579","sourcePhase":null,"sourceRound":4,"playedOn":"2026-09-13","homeSourceClubId":"108341","awaySourceClubId":"107347","sourceUrl":"https://semafor.hns.family/utakmice/114471627/x/","rawSha256":"c6a292c409c20a6b71c7b0d2089245325b7361356fb0637ef77feb52772db04c","observedHomeScore":4,"observedAwayScore":1,"reasonCode":"missing_goalkeeper_after_dismissal"},{"sourceMatchId":"114471629","sourceCompetitionId":"114471579","sourcePhase":null,"sourceRound":4,"playedOn":"2026-09-13","homeSourceClubId":"175835","awaySourceClubId":"649","sourceUrl":"https://semafor.hns.family/utakmice/114471629/x/","rawSha256":"382a9be268301534f8e085587e994ac3ecb093288f08e38126a1bbcfe012db14","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"awarded_result_conflicts_with_field_events"}]}'::jsonb);
insert into private_historical_statistics.policies values('de-dfb-suedwest-2025-historical-unavailable-v1','03461066041ae2b48910e6c18bd203172e32ccb3db27a99a24f04b71972624ba','{"id":"de-dfb-suedwest-2025-historical-unavailable-v1","provider":"dfb","competitionSlug":"de-regionalliga-suedwest","season":"2025/26","approvalReference":"user reply to call_e8c944e47b7c42a38afa4f08fda48c23","entries":[{"sourceMatchId":"2402929","sourceCompetitionId":"regionalliga-suedwest/2025-2026","sourcePhase":null,"sourceRound":11,"playedOn":"2025-10-04","homeSourceClubId":"tsg-balingen","awaySourceClubId":"kickers-offenbach","sourceUrl":"https://datencenter.dfb.de/datencenter/regionalliga-suedwest/2025-2026/11-spieltag/tsg-balingen-kickers-offenbach-2402929","rawSha256":"cda4f2b1cdd971e85cc34feab5c570e5388c733d69c474b02ca16a50f3d52296","observedHomeScore":1,"observedAwayScore":1,"reasonCode":"contradictory_starting_xi"},{"sourceMatchId":"2403004","sourceCompetitionId":"regionalliga-suedwest/2025-2026","sourcePhase":null,"sourceRound":19,"playedOn":"2025-11-29","homeSourceClubId":"tsv-steinbach-haiger","awaySourceClubId":"tsg-balingen","sourceUrl":"https://datencenter.dfb.de/datencenter/regionalliga-suedwest/2025-2026/19-spieltag/tsv-steinbach-haiger-tsg-balingen-2403004","rawSha256":"3fd9c5a0cf2d21a0ee76c06cef5e07f5fa836f725651ebc3cdc8e5daa0a3dfff","observedHomeScore":0,"observedAwayScore":0,"reasonCode":"contradictory_discipline"}],"sourcePolicy":"de-dfb-suedwest-2025-historical-unavailable-v1","recordedAt":"2026-10-18T13:03:55.270673+00:00"}'::jsonb);
insert into private_historical_statistics.policies values('es-fcf-segona-g1-history-2026-10-18-v1','278c5fe328c7b0b202e189bbbded67bd10f9ee1f37009eb641469902ca1c05cf','{"id":"es-fcf-segona-g1-history-2026-10-18-v1","provider":"fcf","sourcePolicy":"es-fcf-reviewed-history-v1","competitionSlug":"es-ct-segona-g1","season":"2026/27","recordedAt":"2026-10-18T13:47:13Z","approvalReference":"user replies0 and1 to call_84764278412542b2ab37d9bb6e61eb67; recordedAt is implementation recording time, user send time unavailable","entries":[{"sourceMatchId":"4109388","sourceCompetitionId":"58161863","sourcePhase":null,"sourceRound":1,"playedOn":"2026-09-20","homeSourceClubId":"5042","awaySourceClubId":"5057","homeSourceCategoryId":"33356","awaySourceCategoryId":"35522","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4109388","rawSha256":"eb3b14de3d6077f4fb896cb4a4d2b96d76eb85db8853889e9871b7f74e73e770","observedHomeScore":0,"observedAwayScore":3,"reasonCode":"published_score_conflicts_with_recorded_goal_events"}]}'::jsonb);
insert into private_historical_statistics.policies values('es-fcf-tercera-g2-history-2026-10-18-v1','252cff1a96fd32f683c6909337dbbd00a685399964c3d2561188698f6182ad70','{"id":"es-fcf-tercera-g2-history-2026-10-18-v1","provider":"fcf","sourcePolicy":"es-fcf-reviewed-history-v1","competitionSlug":"es-ct-tercera-g2","season":"2026/27","recordedAt":"2026-10-18T13:47:13Z","approvalReference":"user replies0 and1 to call_84764278412542b2ab37d9bb6e61eb67; recordedAt is implementation recording time, user send time unavailable","entries":[{"sourceMatchId":"4116215","sourceCompetitionId":"58161875","sourcePhase":null,"sourceRound":4,"playedOn":"2026-10-10","homeSourceClubId":"1107","awaySourceClubId":"5114","homeSourceCategoryId":"37659","awaySourceCategoryId":"34913","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4116215","rawSha256":"5dd7e401c7929dd1f2b59d35d1f6e203e6306f2479238adcd8755180b9671a49","observedHomeScore":5,"observedAwayScore":0,"reasonCode":"published_score_exceeds_recorded_goal_events"}]}'::jsonb);
insert into private_historical_statistics.policies values('es-fcf-tercera-g9-history-2026-10-18-v1','beee75c5722e10dbb76e6caee7605d6f1ffdc590f39109cd2f01259720ff677b','{"id":"es-fcf-tercera-g9-history-2026-10-18-v1","provider":"fcf","sourcePolicy":"es-fcf-reviewed-history-v1","competitionSlug":"es-ct-tercera-g9","season":"2026/27","recordedAt":"2026-10-18T13:47:13Z","approvalReference":"user replies0 and1 to call_84764278412542b2ab37d9bb6e61eb67; recordedAt is implementation recording time, user send time unavailable","entries":[{"sourceMatchId":"4118352","sourceCompetitionId":"58161880","sourcePhase":null,"sourceRound":1,"playedOn":"2026-09-19","homeSourceClubId":"1252","awaySourceClubId":"6136","homeSourceCategoryId":"35781","awaySourceCategoryId":"33049","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118352","rawSha256":"1e8d50d487be699cac45c3c2dc4658d3a9b16983fd5203b5845dc1339fe7351c","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"published_score_conflicts_with_recorded_goal_events"},{"sourceMatchId":"4118358","sourceCompetitionId":"58161880","sourcePhase":null,"sourceRound":2,"playedOn":"2026-09-26","homeSourceClubId":"44143644","awaySourceClubId":"1400","homeSourceCategoryId":"44510647","awaySourceCategoryId":"47272626","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118358","rawSha256":"e69af6b2765dbed7ebe3b57535beb1ce259c7d77ed9cb7f90d9cb4998afd153a","observedHomeScore":0,"observedAwayScore":3,"reasonCode":"published_score_conflicts_with_recorded_goal_events"}]}'::jsonb);


-- Exact reviewed native-club identities, separate from immutable match approval hashes.
create table private_historical_statistics.source_club_bindings(
 provider text not null,source_club_id text not null,source_category_id text not null default '',
 country_code text not null,canonical_names text[] not null,proofs jsonb not null,
 bound_team_id bigint references public.teams(id),primary key(provider,source_club_id,source_category_id));
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('hns','1274','','HR',array['HNK Gorica s.d.d.'],'[{"sourceMatchId":"114471617","sourceUrl":"https://semafor.hns.family/utakmice/114471617/x/","rawSha256":"2dc781b523945db96f2a1ab2d216aaf19760c1c98e1aca3bade2c98fae09c53b"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('hns','107347','','HR',array['ŽNK Donat'],'[{"sourceMatchId":"114471617","sourceUrl":"https://semafor.hns.family/utakmice/114471617/x/","rawSha256":"2dc781b523945db96f2a1ab2d216aaf19760c1c98e1aca3bade2c98fae09c53b"},{"sourceMatchId":"114471627","sourceUrl":"https://semafor.hns.family/utakmice/114471627/x/","rawSha256":"c6a292c409c20a6b71c7b0d2089245325b7361356fb0637ef77feb52772db04c"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('hns','108341','','HR',array['ŽNK Dinamo'],'[{"sourceMatchId":"114471627","sourceUrl":"https://semafor.hns.family/utakmice/114471627/x/","rawSha256":"c6a292c409c20a6b71c7b0d2089245325b7361356fb0637ef77feb52772db04c"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('hns','175835','','HR',array['ŽNK Međimurje Čakovec'],'[{"sourceMatchId":"114471629","sourceUrl":"https://semafor.hns.family/utakmice/114471629/x/","rawSha256":"382a9be268301534f8e085587e994ac3ecb093288f08e38126a1bbcfe012db14"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('hns','649','','HR',array['ŽNK Agram'],'[{"sourceMatchId":"114471629","sourceUrl":"https://semafor.hns.family/utakmice/114471629/x/","rawSha256":"382a9be268301534f8e085587e994ac3ecb093288f08e38126a1bbcfe012db14"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('dfb','tsg-balingen','','DE',array['TSG Balingen'],'[{"sourceMatchId":"2402929","sourceUrl":"https://datencenter.dfb.de/datencenter/regionalliga-suedwest/2025-2026/11-spieltag/tsg-balingen-kickers-offenbach-2402929","rawSha256":"cda4f2b1cdd971e85cc34feab5c570e5388c733d69c474b02ca16a50f3d52296"},{"sourceMatchId":"2403004","sourceUrl":"https://datencenter.dfb.de/datencenter/regionalliga-suedwest/2025-2026/19-spieltag/tsv-steinbach-haiger-tsg-balingen-2403004","rawSha256":"3fd9c5a0cf2d21a0ee76c06cef5e07f5fa836f725651ebc3cdc8e5daa0a3dfff"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('dfb','kickers-offenbach','','DE',array['Kickers Offenbach'],'[{"sourceMatchId":"2402929","sourceUrl":"https://datencenter.dfb.de/datencenter/regionalliga-suedwest/2025-2026/11-spieltag/tsg-balingen-kickers-offenbach-2402929","rawSha256":"cda4f2b1cdd971e85cc34feab5c570e5388c733d69c474b02ca16a50f3d52296"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('dfb','tsv-steinbach-haiger','','DE',array['TSV Steinbach Haiger'],'[{"sourceMatchId":"2403004","sourceUrl":"https://datencenter.dfb.de/datencenter/regionalliga-suedwest/2025-2026/19-spieltag/tsv-steinbach-haiger-tsg-balingen-2403004","rawSha256":"3fd9c5a0cf2d21a0ee76c06cef5e07f5fa836f725651ebc3cdc8e5daa0a3dfff"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','5042','33356','ES',array['SANT JAUME OLOT B, C.F'],'[{"sourceMatchId":"4109388","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4109388","rawSha256":"eb3b14de3d6077f4fb896cb4a4d2b96d76eb85db8853889e9871b7f74e73e770"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','5057','35522','ES',array['BEGUR, C.F.'],'[{"sourceMatchId":"4109388","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4109388","rawSha256":"eb3b14de3d6077f4fb896cb4a4d2b96d76eb85db8853889e9871b7f74e73e770"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','1107','37659','ES',array['PALAFOLLS, C.D.'],'[{"sourceMatchId":"4116215","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4116215","rawSha256":"5dd7e401c7929dd1f2b59d35d1f6e203e6306f2479238adcd8755180b9671a49"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','5114','34913','ES',array['MONTESSORI-PALAU, C.C.E.'],'[{"sourceMatchId":"4116215","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4116215","rawSha256":"5dd7e401c7929dd1f2b59d35d1f6e203e6306f2479238adcd8755180b9671a49"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','1252','35781','ES',array['Pª BARC. ANGUERA'],'[{"sourceMatchId":"4118352","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118352","rawSha256":"1e8d50d487be699cac45c3c2dc4658d3a9b16983fd5203b5845dc1339fe7351c"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','6136','33049','ES',array['LA SALUT PERE GOL AE.'],'[{"sourceMatchId":"4118352","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118352","rawSha256":"1e8d50d487be699cac45c3c2dc4658d3a9b16983fd5203b5845dc1339fe7351c"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','44143644','44510647','ES',array['DEPORTIVO PARAGUAY, F.C.'],'[{"sourceMatchId":"4118358","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118358","rawSha256":"e69af6b2765dbed7ebe3b57535beb1ce259c7d77ed9cb7f90d9cb4998afd153a"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('fcf','1400','47272626','ES',array['TRINIDAD, C.D.'],'[{"sourceMatchId":"4118358","sourceUrl":"https://www.fcf.cat/ca/competicio/acta/4118358","rawSha256":"e69af6b2765dbed7ebe3b57535beb1ce259c7d77ed9cb7f90d9cb4998afd153a"}]'::jsonb);

alter table public.competitions add column source_policy text;
alter table public.competitions add column date_only_deadline_policy text;
alter table public.matches add column statistics_status text not null default 'available'
 check(statistics_status in('available','unavailable_historical'));
alter table public.matches add column statistics_reason text;
alter table public.matches add column source_phase text;
alter table public.matches add column source_round int check(source_round>0);
alter table public.matches add constraint historical_statistics_missingness check(
 (statistics_status='available' and statistics_reason is null)
 or (statistics_status='unavailable_historical' and statistics_reason is not null and imported_at is null and not kontumacija and not vir_brez_izida));

create table private_historical_statistics.installed_policies(
 competition_id bigint primary key references public.competitions(id),
 policy_id text not null references private_historical_statistics.policies(id),
 policy_sha256 text not null,first_fantasy_played_on date not null,installed_at timestamptz not null default now());
create table private_historical_statistics.markers(
 competition_id bigint not null references private_historical_statistics.installed_policies(competition_id),
 source_match_id text not null,source_report_id text not null unique,fixture jsonb not null,raw_sha256 text not null,
 round_id bigint not null references public.rounds(id),home_team_id bigint not null references public.teams(id),away_team_id bigint not null references public.teams(id),
 primary key(competition_id,source_match_id),unique(round_id,home_team_id,away_team_id));
create table private_historical_statistics.release_authorizations(
 competition_id bigint not null references public.competitions(id),manifest_sha256 text not null,
 policy_id text not null,state_sha256 text not null,authorized_xid bigint not null,recorded_at timestamptz not null default clock_timestamp(),
 primary key(competition_id,authorized_xid));
revoke all on all tables in schema private_historical_statistics from public,anon,authenticated,service_role;

create function public.apply_historical_statistics_policy(p_competition_id bigint,p_policy_id text,p_policy_sha256 text,p_entries jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.competitions%rowtype;p private_historical_statistics.policies%rowtype;i private_historical_statistics.installed_policies%rowtype; first_day date;
begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'HISTORICAL_POLICY: READ COMMITTED required';end if;
 select * into c from public.competitions where id=p_competition_id for update;
 select * into p from private_historical_statistics.policies where id=p_policy_id;
 if c.id is null or p.id is null or c.active or c.slug is distinct from p.document->>'competitionSlug' or c.source is distinct from p.document->>'provider'
 or c.source_policy is distinct from p.document->>'sourcePolicy' or p_policy_sha256 is distinct from p.policy_sha256 or p_entries is distinct from p.document->'entries'
 then raise exception 'HISTORICAL_POLICY: target/canonical policy/hash differs or active';end if;
 if not exists(select 1 from public.countries where id=c.country_id and code=case p.document->>'provider'when 'hns'then 'HR'when 'dfb'then 'DE'when 'fcf'then 'ES'end)then raise exception 'HISTORICAL_POLICY: source country differs';end if;
 lock table public.fantasy_teams in share mode;
 if exists(select 1 from public.fantasy_teams where competition_id=c.id) then raise exception 'HISTORICAL_POLICY: user-owned activity';end if;
 select min(r.played_on) into first_day from public.rounds r where r.competition_id=c.id and r.season=public.sezona_lige(c.id) and r.number=c.prvi_fantasy_krog and r.deadline_at>now();
 if first_day is null or exists(select 1 from jsonb_array_elements(p_entries)e where (e->>'playedOn')::date>=first_day or (e->>'playedOn')::date>=current_date)
 then raise exception 'HISTORICAL_POLICY: verified future first fantasy date and strictly historical exceptions required';end if;
 select * into i from private_historical_statistics.installed_policies where competition_id=c.id;
 if i.competition_id is not null then
  if i.policy_id is distinct from p.id or i.policy_sha256 is distinct from p.policy_sha256 or i.first_fantasy_played_on is distinct from first_day then raise exception 'HISTORICAL_POLICY: installed binding immutable';end if;
 else
  insert into private_historical_statistics.installed_policies values(c.id,p.id,p.policy_sha256,first_day,now());
 end if;
 return jsonb_build_object('policyId',p.id,'policySha256',p.policy_sha256,'firstFantasyPlayedOn',first_day);
end $$;


create function private_historical_statistics.bind_source_club(p_provider text,p_source_club_id text,p_source_category_id text,p_country_id bigint,p_team_id bigint)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare b private_historical_statistics.source_club_bindings%rowtype;candidates bigint[];
begin
 select * into b from private_historical_statistics.source_club_bindings where provider=p_provider and source_club_id=p_source_club_id and source_category_id=coalesce(p_source_category_id,'')for update;
 if b.provider is null or not exists(select 1 from public.countries c join public.teams t on t.country_id=c.id where c.id=p_country_id and c.code=b.country_code and t.id=p_team_id)then raise exception 'HISTORICAL_POLICY: unreviewed source club/category/country';end if;
 if b.bound_team_id is not null then
  if b.bound_team_id<>p_team_id then raise exception 'HISTORICAL_POLICY: immutable native club to DB team binding differs';end if;
 else
  select array_agg(t.id order by t.id)into candidates from public.teams t where t.country_id=p_country_id and t.name=any(b.canonical_names);
  if coalesce(array_length(candidates,1),0)<>1 or candidates[1]<>p_team_id then raise exception 'HISTORICAL_POLICY: canonical native club identity differs or ambiguous';end if;
  update private_historical_statistics.source_club_bindings set bound_team_id=p_team_id where provider=b.provider and source_club_id=b.source_club_id and source_category_id=b.source_category_id;
 end if;
end $$;

create function public.upsert_unavailable_historical_match(p_competition_id bigint,p_source_match_id text,p_policy_id text,p_policy_sha256 text,p_raw_sha256 text,p_header jsonb)
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

create function private_historical_statistics.protect_match()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare mk private_historical_statistics.markers%rowtype;e jsonb;
begin
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
create trigger protect_historical_statistics_match before insert or update or delete on public.matches for each row execute function private_historical_statistics.protect_match();
create function private_historical_statistics.protect_individual_rows()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.matches where id=new.match_id and statistics_status='unavailable_historical')then raise exception 'HISTORICAL_POLICY: individual statistics unavailable, cannot write guessed observations';end if;return new;
end $$;
create trigger protect_historical_statistics_appearances before insert or update on public.appearances for each row execute function private_historical_statistics.protect_individual_rows();
create trigger protect_historical_statistics_goals before insert or update on public.goals for each row execute function private_historical_statistics.protect_individual_rows();


create function private_historical_statistics.protect_round_identity()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from private_historical_statistics.markers where round_id=old.id)then
  if tg_op='DELETE'then raise exception 'HISTORICAL_POLICY: referenced historical round immutable';end if;
  if row(new.competition_id,new.season,new.number)is distinct from row(old.competition_id,old.season,old.number)then raise exception 'HISTORICAL_POLICY: referenced historical round identity immutable';end if;
 end if;
 if tg_op='DELETE'then return old;end if;return new;
end $$;
create trigger historical_policy_round_identity_guard before update or delete on public.rounds for each row execute function private_historical_statistics.protect_round_identity();

create function public.get_installed_historical_statistics_markers(p_competition_id bigint)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
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
 join public.matches m on m.round_id=k.round_id and m.home_team_id=k.home_team_id and m.away_team_id=k.away_team_id and m.zapisnik_id=k.source_report_id and m.statistics_status='unavailable_historical'and m.imported_at is null and m.source_url=k.fixture->>'sourceUrl'and m.played_on=(k.fixture->>'playedOn')::date and m.home_goals=(k.fixture->>'observedHomeScore')::int and m.away_goals=(k.fixture->>'observedAwayScore')::int and not m.kontumacija and not m.vir_brez_izida and m.source_phase is not distinct from k.fixture->>'sourcePhase'and m.source_round=(k.fixture->>'sourceRound')::int where k.competition_id=i.competition_id;
 if coalesce(jsonb_array_length(markers),0)<>jsonb_array_length(p.document->'entries')or exists(select 1 from jsonb_array_elements(markers)x where(x->>'individualRowCount')::int<>0)then raise exception 'HISTORICAL_POLICY: incomplete/changed installed markers';end if;
 return jsonb_build_object('installed',true,'policyId',i.policy_id,'policySha256',i.policy_sha256,'firstFantasyPlayedOn',i.first_fantasy_played_on,'markers',markers);
end $$;

-- These only affect known opt-ins. Public service callers cannot mint authorization.
create function private_historical_statistics.state_sha256(p_competition_id bigint)returns text language sql stable security definer set search_path=public,pg_temp as $$
 select encode(sha256(convert_to(jsonb_build_object(
 'competition',(select to_jsonb(c)-'active'from public.competitions c where c.id=p_competition_id),
 'players',(select coalesce(jsonb_agg(to_jsonb(p)order by p.id),'[]')from public.players p where p.competition_id=p_competition_id),
 'rounds',(select coalesce(jsonb_agg(to_jsonb(r)order by r.id),'[]')from public.rounds r where r.competition_id=p_competition_id),
 'matches',(select coalesce(jsonb_agg(to_jsonb(m)order by m.id),'[]')from public.matches m join public.rounds r on r.id=m.round_id where r.competition_id=p_competition_id),
 'appearances',(select coalesce(jsonb_agg(to_jsonb(a)order by a.id),'[]')from public.appearances a join public.matches m on m.id=a.match_id join public.rounds r on r.id=m.round_id where r.competition_id=p_competition_id),
 'goals',(select coalesce(jsonb_agg(to_jsonb(g)order by g.id),'[]')from public.goals g join public.matches m on m.id=g.match_id join public.rounds r on r.id=m.round_id where r.competition_id=p_competition_id)
 )::text,'UTF8')),'hex');
$$;
create function private_historical_statistics.authorize_release(p_competition_id bigint,p_policy_id text,p_policy_sha256 text,p_manifest_sha256 text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare info jsonb;
begin
 if p_manifest_sha256 is null or p_manifest_sha256!~'^[a-f0-9]{64}$'or current_setting('transaction_isolation')<>'read committed'then raise exception 'HISTORICAL_POLICY: reviewed release SHA and READ COMMITTED required';end if;
 perform 1 from public.competitions where id=p_competition_id and not active for update;
 if not found then raise exception 'HISTORICAL_POLICY: inactive target required';end if;
 lock table public.teams,public.players,public.rounds,public.matches,public.appearances,public.goals,public.fantasy_teams in share mode;
 info:=public.get_installed_historical_statistics_markers(p_competition_id);
 if info->>'policyId'is distinct from p_policy_id or info->>'policySha256'is distinct from p_policy_sha256 or exists(select 1 from public.fantasy_teams where competition_id=p_competition_id)then raise exception 'HISTORICAL_POLICY: release binding/user activity differs';end if;
 insert into private_historical_statistics.release_authorizations values(p_competition_id,p_manifest_sha256,p_policy_id,private_historical_statistics.state_sha256(p_competition_id),txid_current(),clock_timestamp());
end $$;
create function private_historical_statistics.guard_activation()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare p private_historical_statistics.policies%rowtype;i private_historical_statistics.installed_policies%rowtype;
begin
 select * into i from private_historical_statistics.installed_policies where competition_id=new.id;
 select * into p from private_historical_statistics.policies where id=i.policy_id or document->>'competitionSlug'=new.slug order by id limit 1;
 if p.id is null and new.source_policy is null then return new;end if;
 if not new.active then return new;end if;
 if p.id is null or new.slug is distinct from p.document->>'competitionSlug'or new.source is distinct from p.document->>'provider'or new.source_policy is distinct from p.document->>'sourcePolicy'then raise exception 'HISTORICAL_POLICY: invalid activation tuple';end if;
 if tg_op='UPDATE'and old.active then
  if row(new.slug,new.source,new.source_policy,new.source_league_code,new.country_id,new.prvi_fantasy_krog,new.date_only_deadline_policy)is distinct from row(old.slug,old.source,old.source_policy,old.source_league_code,old.country_id,old.prvi_fantasy_krog,old.date_only_deadline_policy)then raise exception 'HISTORICAL_POLICY: active opt-in source/launch configuration immutable';end if;
  return new;
 end if;
 if tg_op='UPDATE'and(to_jsonb(new)-'active')is distinct from(to_jsonb(old)-'active')then raise exception 'HISTORICAL_POLICY: configure first round/policy before transactional release authorization';end if;
 if not exists(select 1 from private_historical_statistics.release_authorizations a where a.competition_id=new.id and a.authorized_xid=txid_current()and a.policy_id=p.id and a.state_sha256=private_historical_statistics.state_sha256(new.id))then raise exception 'HISTORICAL_POLICY: dedicated verified transactional release authorization required';end if;
 return new;
end $$;
create trigger historical_policy_activation_guard before insert or update on public.competitions for each row execute function private_historical_statistics.guard_activation();

-- Appearance-derived season totals/prices already contain only real observations.
-- Do not replace the existing market's strict incomplete-report waiting window.
create or replace view public.match_assist_status as
select m.id as match_id,m.round_id,r.season,r.number as round_number,m.played_on,
 h.name as home_name,h.short_name as home_short,h.logo_url as home_logo,a.name as away_name,a.short_name as away_short,a.logo_url as away_logo,m.home_goals,m.away_goals,
 case when m.statistics_status='unavailable_historical'then null::bigint else count(g.id)filter(where not g.is_own_goal)end as golov,
 case when m.statistics_status='unavailable_historical'then null::bigint else count(g.id)filter(where not g.is_own_goal and not g.is_penalty and g.assist_player_id is null and g.assist_none_confirmed_at is null)end as brez_asistence,
 m.home_team_id,m.away_team_id,r.competition_id,
 case when m.statistics_status='unavailable_historical'then null::timestamptz else public.asistence_odprte_do(m.id)end as glasovanje_do,
 case when m.statistics_status='unavailable_historical'then false else coalesce(public.asistence_odprte_do(m.id)>now(),true)end as glasovanje_odprto,
 m.statistics_status,m.statistics_reason
from public.matches m join public.rounds r on r.id=m.round_id join public.teams h on h.id=m.home_team_id join public.teams a on a.id=m.away_team_id left join public.goals g on g.match_id=m.id
where m.imported_at is not null or m.statistics_status='unavailable_historical'
group by m.id,r.season,r.number,r.competition_id,h.name,h.short_name,h.logo_url,a.name,a.short_name,a.logo_url;
create or replace view public.sezone as
select r.season,count(distinct r.id)::int as krogov,
 count(distinct m.id)filter(where m.imported_at is not null or m.statistics_status='unavailable_historical')::int as odigranih,
 max(r.played_on)as zadnji_dan,bool_or(r.played_on>=current_date)as tekoca,r.competition_id,
 count(distinct m.id)filter(where m.imported_at is not null)::int as statistics_complete_matches,
 count(distinct m.id)filter(where m.statistics_status='unavailable_historical')::int as statistics_unavailable_matches
from public.rounds r left join public.matches m on m.round_id=r.id group by r.season,r.competition_id;

revoke all on all functions in schema private_historical_statistics from public,anon,authenticated,service_role;
revoke all on function public.apply_historical_statistics_policy(bigint,text,text,jsonb),public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb),public.get_installed_historical_statistics_markers(bigint)from public,anon,authenticated;
grant execute on function public.apply_historical_statistics_policy(bigint,text,text,jsonb),public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb),public.get_installed_historical_statistics_markers(bigint)to service_role;
