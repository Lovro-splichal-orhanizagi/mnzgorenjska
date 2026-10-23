-- Exact owner-approved prelaunch exceptions for one HLF incomplete report and two FMF schedule-only results.
begin;
insert into private_historical_statistics.policies(id,policy_sha256,document) values
('ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b','{"sourcePolicy":"reviewed-existing-history-20261023-v1","season":"2026/27","recordedAt":"2026-10-23T19:54:59.735346+00:00","approvalReference":"Owner explicitly approved all three exact exclusions in reply to call_7eb0d2fbb5fc48fc92ce1517a8f32530. Recording time is not the unknown user-send timestamp.","id":"ro-ab-l4-s2-historical-unavailable-2026-10-23-v1","provider":"hlf","competitionSlug":"ro-ab-l4-s2","competitionId":501,"sourceLeagueCode":"judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2","entries":[{"sourceMatchId":"8b7af269-2420-4534-9af2-f3cd51852f15","sourceCompetitionId":"4f6c569a-aa5b-436b-8542-02ae8add78fa","sourcePhase":"7e0e09aa-988c-4b1c-be8d-b50b11f38019","sourceRound":1,"playedOn":"2026-09-13","homeSourceClubId":"48d9c84b-3ea6-47e4-8833-3b81dd468159","awaySourceClubId":"a431c936-ec34-40fe-a0f3-22bfbae157a5","sourceUrl":"https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1","rawSha256":"da7436f90c7440ee420eec8a66b2f57d9e338909af257ae933005169cb8ec31c","sourceProof":{"matchSheetSha256":"81e0517aa6fd0fb04249bdcdab405820d20e81a1eb174ca2ea42e51052ccc07a","roundResponseSha256":"daaa98db38a59f74e86667b2d515b50f778afffb0bd35422d68dddf344057a8a","matchSheetId":"52d4ccd6-6028-4b06-a492-58cbf89ba169","rawSha256Formula":"SHA256(JSON.stringify({matchSheetSha256,roundResponseSha256}) in lexicographic key order)"},"observedHomeScore":3,"observedAwayScore":0,"reasonCode":"opponent_lineup_absent_in_official_report"}]}'::jsonb),
('md-liga-2-historical-unavailable-2026-10-23-v1','95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e','{"sourcePolicy":"reviewed-existing-history-20261023-v1","season":"2026/27","recordedAt":"2026-10-23T19:54:59.735346+00:00","approvalReference":"Owner explicitly approved all three exact exclusions in reply to call_7eb0d2fbb5fc48fc92ce1517a8f32530. Recording time is not the unknown user-send timestamp.","id":"md-liga-2-historical-unavailable-2026-10-23-v1","provider":"fmf","competitionSlug":"md-liga-2","competitionId":1107,"sourceLeagueCode":"liga-2-1782306996/877","entries":[{"sourceMatchId":"50422","sourceCompetitionId":"877","sourcePhase":null,"sourceRound":4,"playedOn":"2026-08-08","homeSourceClubId":"Sheriff-2","awaySourceClubId":"CF Maiak","sourceUrl":"https://www.fmf.md/home/meciuri-info?match=50422","rawSha256":"f9060e1bf8e91a925473c88d67c0a10cf077f461f36ae06ca811e9f9f63f12f5","sourceProof":{"calendarSha256":"b07c15800ddc9b0af3c9c05c5756e0d002b26582e3c9845219f6afce5ccc6eb2","matchDetailSha256":"83342fc8f52c2aa1df70aa47ee553e99998cf035a3bca510227c2516ac40e136","roundPageSha256":"896abe46e02e5c1c94fb732c9dca67ad2d948df2123118245eba7569f474cdde","pdfPublished":false,"clubIdentityKind":"published_name","rawSha256Formula":"SHA256(JSON.stringify({calendarSha256,matchDetailSha256,roundPageSha256}) in lexicographic key order)"},"observedHomeScore":11,"observedAwayScore":0,"reasonCode":"official_result_published_but_match_report_pdf_unpublished"},{"sourceMatchId":"50481","sourceCompetitionId":"877","sourcePhase":null,"sourceRound":11,"playedOn":"2026-10-14","homeSourceClubId":"CMF Cahul","awaySourceClubId":"Sheriff-2","sourceUrl":"https://www.fmf.md/home/meciuri-info?match=50481","rawSha256":"2fc49fc7784c1d65b5e15275b6bf14cab3f611dc99c23b241e4d68d5b9ec82aa","sourceProof":{"calendarSha256":"b07c15800ddc9b0af3c9c05c5756e0d002b26582e3c9845219f6afce5ccc6eb2","matchDetailSha256":"1cc08d91396ca90d4d528101d4b94751ac833e5bbdfc8b821456d69eefd55245","roundPageSha256":"18ad6b21efd7f4bd439ecc2e9c4715b32d4c06d3e3b82cfcacb2f33c4757320d","pdfPublished":false,"clubIdentityKind":"published_name","rawSha256Formula":"SHA256(JSON.stringify({calendarSha256,matchDetailSha256,roundPageSha256}) in lexicographic key order)"},"observedHomeScore":2,"observedAwayScore":3,"reasonCode":"official_result_published_but_match_report_pdf_unpublished"}]}'::jsonb);

insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values
('hlf','48d9c84b-3ea6-47e4-8833-3b81dd468159','','RO',array['Recolta Crăciunel'],'[{"sourceMatchId":"8b7af269-2420-4534-9af2-f3cd51852f15","sourceUrl":"https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1","rawSha256":"da7436f90c7440ee420eec8a66b2f57d9e338909af257ae933005169cb8ec31c"}]'::jsonb),
('hlf','a431c936-ec34-40fe-a0f3-22bfbae157a5','','RO',array['CSO Arieșul Apuseni Baia de Arieș'],'[{"sourceMatchId":"8b7af269-2420-4534-9af2-f3cd51852f15","sourceUrl":"https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1","rawSha256":"da7436f90c7440ee420eec8a66b2f57d9e338909af257ae933005169cb8ec31c"}]'::jsonb),
('fmf','Sheriff-2','','MD',array['Sheriff-2'],'[{"sourceMatchId":"50422","sourceUrl":"https://www.fmf.md/home/meciuri-info?match=50422","rawSha256":"f9060e1bf8e91a925473c88d67c0a10cf077f461f36ae06ca811e9f9f63f12f5"},{"sourceMatchId":"50481","sourceUrl":"https://www.fmf.md/home/meciuri-info?match=50481","rawSha256":"2fc49fc7784c1d65b5e15275b6bf14cab3f611dc99c23b241e4d68d5b9ec82aa"}]'::jsonb),
('fmf','CF Maiak','','MD',array['CF Maiak'],'[{"sourceMatchId":"50422","sourceUrl":"https://www.fmf.md/home/meciuri-info?match=50422","rawSha256":"f9060e1bf8e91a925473c88d67c0a10cf077f461f36ae06ca811e9f9f63f12f5"}]'::jsonb),
('fmf','CMF Cahul','','MD',array['CMF Cahul'],'[{"sourceMatchId":"50481","sourceUrl":"https://www.fmf.md/home/meciuri-info?match=50481","rawSha256":"2fc49fc7784c1d65b5e15275b6bf14cab3f611dc99c23b241e4d68d5b9ec82aa"}]'::jsonb);

-- Extend the closed reviewed-existing route with only the newly approved RO/MD tuples.
create or replace function private_reviewed_existing_history.target(p_slug text)
returns table(slug text,cid bigint,provider text,code text,policy_id text,policy_sha text,current_reports int,archive_reports int)
language sql immutable set search_path=public,pg_temp as $$
 select * from (values
 ('gb-npl-midlands',979::bigint,'isthmian','npl/67d7c7bb74247876e6dae40c/2026-27','gb-npl-midlands-historical-unavailable-2026-10-23-v1','5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924',150,462),
 ('gb-sfl-d1-south',984::bigint,'isthmian','sfl/69d0bdf9b616bafb97331d41/2026-27','gb-sfl-d1-south-historical-unavailable-2026-10-23-v1','682dbaa0e1acfb0a4a03da9da93cdc706eb0d16dc4a8df180e994f6980369a30',132,0),
 ('ro-liga3-s1',497::bigint,'hlf','national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1','ro-liga3-s1-historical-unavailable-2026-10-23-v1','b6686671855dfa9a6f96fa8cf67d530aa4fc4208f859e783929cb36140169329',54,0),
 ('ba-wwin-liga-bih',998::bigint,'nfsbih','wwin-liga-bih/54152223','ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1','fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366',49,0),
 ('ro-ab-l4-s2',501::bigint,'hlf','judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2','ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b',23,0),
 ('md-liga-2',1107::bigint,'fmf','liga-2-1782306996/877','md-liga-2-historical-unavailable-2026-10-23-v1','95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e',95,0)
 ) as v(slug,cid,provider,code,policy_id,policy_sha,current_reports,archive_reports)
 where v.slug=p_slug
$$;

create or replace function private_reviewed_existing_history.report_targets(p_slug text)
returns table(slug text,cid bigint,source_match_id text,report_id text,mid bigint,rid bigint,season text,rno int,home_id bigint,away_id bigint,played_on date,home_goals int,away_goals int,appearances int,goals int,source_phase text,source_round int)
language sql immutable set search_path=public,pg_temp as $$
 select * from (values
 ('gb-npl-midlands',979::bigint,'6896abc31c6f4c56212c7ac5','gb6896abc31c6f4c56212c7ac5',561922::bigint,35329::bigint,'2025/26',7,10862::bigint,10847::bigint,'2025-09-13'::date,2,3,27,5,null::text,null::int),
 ('gb-npl-midlands',979::bigint,'6a590670ce9ef452b61f386d','gb6a590670ce9ef452b61f386d',562344::bigint,35365::bigint,'2026/27',3,10869::bigint,10864::bigint,'2026-08-18'::date,1,1,29,2,null::text,null::int),
 ('gb-sfl-d1-south',984::bigint,'6a5a1b79ce9ef452b61f4398','gb6a5a1b79ce9ef452b61f4398',509795::bigint,34273::bigint,'2026/27',11,10535::bigint,10517::bigint,'2026-10-14'::date,1,2,29,3,null::text,null::int),
 ('ro-liga3-s1',497::bigint,'f43d55c1-6530-49dc-a02e-4d7e578d6205','f43d55c1-6530-49dc-a02e-4d7e578d6205',133334::bigint,10663::bigint,'2026/27',1,3016::bigint,3017::bigint,'2026-08-29'::date,2,1,33,3,null::text,null::int),
 ('ba-wwin-liga-bih',998::bigint,'54152295','ba54152295',576391::bigint,35409::bigint,'2026/27',5,10876::bigint,10872::bigint,'2026-09-02'::date,1,2,32,3,null::text,null::int),
 ('ba-wwin-liga-bih',998::bigint,'54152303','ba54152303',576399::bigint,35410::bigint,'2026/27',6,10874::bigint,10876::bigint,'2026-09-06'::date,2,1,32,3,null::text,null::int),
 ('ro-ab-l4-s2',501::bigint,'8b7af269-2420-4534-9af2-f3cd51852f15','8b7af269-2420-4534-9af2-f3cd51852f15',202353::bigint,18012::bigint,'2026/27',1,5068::bigint,5069::bigint,'2026-09-13'::date,3,0,13,3,null::text,null::int),
 ('md-liga-2',1107::bigint,'50422','md50422',560748::bigint,35237::bigint,'2026/27',4,10842::bigint,10836::bigint,'2026-08-08'::date,11,0,0,0,null::text,null::int),
 ('md-liga-2',1107::bigint,'50481','md50481',560803::bigint,35244::bigint,'2026/27',11,10833::bigint,10842::bigint,'2026-10-14'::date,2,3,0,0,null::text,null::int)
 ) as v(slug,cid,source_match_id,report_id,mid,rid,season,rno,home_id,away_id,played_on,home_goals,away_goals,appearances,goals,source_phase,source_round)
 where v.slug=p_slug
$$;

create or replace function private_reviewed_existing_history.target_admission(p_slug text,p_source_match_id text) returns jsonb
language sql immutable set search_path=public,pg_temp as $$
 select case
  when p_slug='ro-ab-l4-s2' and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15' then jsonb_build_object('kind','incomplete_report','initialReportId','8b7af269-2420-4534-9af2-f3cd51852f15','initialSourceUrl','https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1/recolta-craciunel-cso-ariesul-apuseni-baia-de-aries')
  when p_slug='md-liga-2' and p_source_match_id in('50422','50481') then jsonb_build_object('kind','schedule_only_official_result','initialReportId',null,'initialSourceUrl','https://www.fmf.md/home/printeaza-detalii-competitii?competition=877','initialHomeGoals',0,'initialAwayGoals',0)
  else jsonb_build_object('kind','imported_report')
 end
$$;

create function private_reviewed_existing_history.is_exact_md_schedule_placeholder(p_competition_id bigint,p_policy_id text,p_policy_sha text,p_source_match_id text,p_match public.matches) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(p_competition_id=1107 and p_policy_id='md-liga-2-historical-unavailable-2026-10-23-v1' and p_policy_sha='95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e' and p_match.id=case p_source_match_id when '50422' then 560748 when '50481' then 560803 else null end and exists(
  select 1 from rounds r where r.id=p_match.round_id and r.competition_id=1107 and r.season='2026/27'
   and r.number=case p_source_match_id when '50422' then 4 when '50481' then 11 else null end
 ) and p_match.home_team_id=case p_source_match_id when '50422' then 10842 when '50481' then 10833 else null end
 and p_match.away_team_id=case p_source_match_id when '50422' then 10836 when '50481' then 10842 else null end
 and p_match.played_on=case p_source_match_id when '50422' then date '2026-08-08' when '50481' then date '2026-10-14' else null end
 and p_match.home_goals=0 and p_match.away_goals=0 and p_match.zapisnik_id is null
 and p_match.source_url='https://www.fmf.md/home/printeaza-detalii-competitii?competition=877'
 and p_match.imported_at is null and p_match.statistics_status='available' and p_match.statistics_reason is null
 and p_match.source_phase is null and p_match.source_round is null and not p_match.kontumacija and not p_match.vir_brez_izida
 and not exists(select 1 from appearances a where a.match_id=p_match.id)
 and not exists(select 1 from goals g where g.match_id=p_match.id),false)
$$;

create function private_reviewed_existing_history.is_exact_ro_alba_partial(p_competition_id bigint,p_policy_id text,p_policy_sha text,p_source_match_id text,p_match public.matches) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(p_competition_id=501 and p_policy_id='ro-ab-l4-s2-historical-unavailable-2026-10-23-v1' and p_policy_sha='0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b' and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15' and p_match.id=202353 and p_match.round_id=18012
  and p_match.home_team_id=5068 and p_match.away_team_id=5069 and p_match.played_on=date '2026-09-13'
  and p_match.home_goals=3 and p_match.away_goals=0 and p_match.zapisnik_id='8b7af269-2420-4534-9af2-f3cd51852f15'
  and p_match.source_url='https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1/recolta-craciunel-cso-ariesul-apuseni-baia-de-aries'
  and p_match.imported_at is null and p_match.statistics_status='available' and p_match.statistics_reason is null
  and p_match.source_phase is null and p_match.source_round is null and not p_match.kontumacija and not p_match.vir_brez_izida
  and (select count(*) from appearances a where a.match_id=p_match.id)=13
  and (select count(*) from goals g where g.match_id=p_match.id)=3,false)
$$;

create function private_reviewed_existing_history.is_exact_ro_alba_post_cleanup(p_competition_id bigint,p_policy_id text,p_policy_sha text,p_source_match_id text,p_match public.matches) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(p_competition_id=501 and p_policy_id='ro-ab-l4-s2-historical-unavailable-2026-10-23-v1' and p_policy_sha='0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b' and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15' and p_match.id=202353 and p_match.round_id=18012
  and p_match.home_team_id=5068 and p_match.away_team_id=5069 and p_match.played_on=date '2026-09-13'
  and p_match.home_goals=3 and p_match.away_goals=0 and p_match.zapisnik_id='8b7af269-2420-4534-9af2-f3cd51852f15'
  and p_match.source_url='https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2/etapa-1/recolta-craciunel-cso-ariesul-apuseni-baia-de-aries'
  and p_match.imported_at is null and p_match.statistics_status='available' and p_match.statistics_reason is null
  and p_match.source_phase is null and p_match.source_round is null and not p_match.kontumacija and not p_match.vir_brez_izida
  and not exists(select 1 from appearances a where a.match_id=p_match.id)
  and not exists(select 1 from goals g where g.match_id=p_match.id),false)
$$;

revoke all on function private_reviewed_existing_history.is_exact_md_schedule_placeholder(bigint,text,text,text,matches),private_reviewed_existing_history.is_exact_ro_alba_partial(bigint,text,text,text,matches),private_reviewed_existing_history.is_exact_ro_alba_post_cleanup(bigint,text,text,text,matches) from public,anon,authenticated,service_role;

-- The two new policies and five new identity bindings remain immutable except for exact IDs.
do $$
declare d text;changed text;
begin
 d:=pg_get_functiondef('private_reviewed_existing_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$'ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1')$q$,$q$'ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1','ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','md-liga-2-historical-unavailable-2026-10-23-v1')$q$);
 changed:=replace(changed,$q$oldj->>'provider' in('isthmian','hlf','nfsbih') and oldj->>'source_club_id' in('68072a04bda6e04641c6e014','6a0adf9eda5d0d0847a023fc','6a0adf9eda5d0d0847a02391','6a0adf9eda5d0d0847a02385','a91ef983-185f-4a35-b5cc-6421c820bd97','3e8d6813-1504-43b1-beef-4118d343f2c7','6853aad421dd3fcf18f4fa48','68072882bda6e04641c6e003','831','409','517')$q$,$q$oldj->>'provider' in('isthmian','hlf','nfsbih','fmf') and oldj->>'source_club_id' in('68072a04bda6e04641c6e014','6a0adf9eda5d0d0847a023fc','6a0adf9eda5d0d0847a02391','6a0adf9eda5d0d0847a02385','a91ef983-185f-4a35-b5cc-6421c820bd97','3e8d6813-1504-43b1-beef-4118d343f2c7','6853aad421dd3fcf18f4fa48','68072882bda6e04641c6e003','831','409','517','48d9c84b-3ea6-47e4-8833-3b81dd468159','a431c936-ec34-40fe-a0f3-22bfbae157a5','Sheriff-2','CF Maiak','CMF Cahul')$q$);
 changed:=replace(changed,$q$when '517' then 10874 end$q$,$q$when '517' then 10874 when '48d9c84b-3ea6-47e4-8833-3b81dd468159' then 5068 when 'a431c936-ec34-40fe-a0f3-22bfbae157a5' then 5069 when 'Sheriff-2' then 10842 when 'CF Maiak' then 10836 when 'CMF Cahul' then 10833 end$q$);
 if changed=d then raise exception 'REVIEWED_RO_MD: catalog immutability anchors missing';end if;
 execute changed;
end$$;

-- Add the new providers only to the closed source-country, tuple, and report-id branches.
do $$
declare d text;changed text;prior text;
begin
 d:=pg_get_functiondef('public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$when 'nfsbih'then 'BA'end$q$,$q$when 'nfsbih'then 'BA'when 'fmf'then 'MD'end$q$);
 if changed=d then raise exception 'REVIEWED_RO_MD: policy country mapping anchor missing';end if;
 prior:=changed;
 changed:=replace(changed,$q$(c.id=998 and c.slug='ba-wwin-liga-bih' and c.source='nfsbih' and c.source_league_code='wwin-liga-bih/54152223' and p.id='ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1' and p.policy_sha256='fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$,$q$(c.id=998 and c.slug='ba-wwin-liga-bih' and c.source='nfsbih' and c.source_league_code='wwin-liga-bih/54152223' and p.id='ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1' and p.policy_sha256='fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366') or (c.id=501 and c.slug='ro-ab-l4-s2' and c.source='hlf' and c.source_league_code='judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2' and p.id='ro-ab-l4-s2-historical-unavailable-2026-10-23-v1' and p.policy_sha256='0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b') or (c.id=1107 and c.slug='md-liga-2' and c.source='fmf' and c.source_league_code='liga-2-1782306996/877' and p.id='md-liga-2-historical-unavailable-2026-10-23-v1' and p.policy_sha256='95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$);
 if changed=prior and position('c.id=501 and c.slug=''ro-ab-l4-s2''' in changed)=0 then raise exception 'REVIEWED_RO_MD: policy tuple whitelist anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.check_targets(text,text)'::regprocedure);
 changed:=replace(d,$q$when 'nfsbih' then 'BA' end$q$,$q$when 'nfsbih' then 'BA' when 'fmf' then 'MD' end$q$);
 if changed=d then raise exception 'REVIEWED_RO_MD: preflight country mapping anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$when 'nfsbih' then 'BA' end$q$,$q$when 'nfsbih' then 'BA' when 'fmf' then 'MD' end$q$);
 if changed=d then raise exception 'REVIEWED_RO_MD: release country mapping anchor missing';end if;
 execute changed;
end$$;

-- Extend the exact immutable upsert namespace and allow only the two exact FMF calendar placeholders.
do $$
declare d text;changed text;prior text;
begin
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$when 'hlf' then case when c.id=497 and p_source_match_id='f43d55c1-6530-49dc-a02e-4d7e578d6205' then p_source_match_id end$q$,$q$when 'hlf' then case when (c.id=497 and p_source_match_id='f43d55c1-6530-49dc-a02e-4d7e578d6205') or (c.id=501 and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15') then p_source_match_id end$q$);
 if changed=d and position('c.id=501 and p_source_match_id=''8b7af269-2420-4534-9af2-f3cd51852f15''' in d)=0 then raise exception 'REVIEWED_RO_MD: HLF namespace anchor missing';end if;
 d:=changed;
 changed:=replace(d,$q$when 'nfsbih' then case when c.id=998 and p_source_match_id in('54152295','54152303') then 'ba'||p_source_match_id end else null end$q$,$q$when 'nfsbih' then case when c.id=998 and p_source_match_id in('54152295','54152303') then 'ba'||p_source_match_id end when 'fmf' then case when c.id=1107 and p_source_match_id in('50422','50481') then 'md'||p_source_match_id end else null end$q$);
 prior:=changed;
 changed:=replace(changed,$q$(c.id=998 and c.source='nfsbih' and p.policy_sha256='fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366' and p_source_match_id in('54152295','54152303'))) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$,$q$(c.id=998 and c.source='nfsbih' and p.policy_sha256='fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366' and p_source_match_id in('54152295','54152303')) or (c.id=501 and c.source='hlf' and p.policy_sha256='0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b' and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15') or (c.id=1107 and c.source='fmf' and p.policy_sha256='95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e' and p_source_match_id in('50422','50481'))) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$);
 if changed=prior and position('c.id=501 and c.source=''hlf''' in changed)=0 then raise exception 'REVIEWED_RO_MD: upsert tuple whitelist anchor missing';end if;
 changed:=replace(changed,$q$(m.source_url is not null and m.source_url is distinct from e->>'sourceUrl' and not private_reviewed_existing_history.exact_ro_native_source_url(c.id,c.slug,m.id,p_source_match_id,m.source_url))$q$,$q$(m.source_url is not null and m.source_url is distinct from e->>'sourceUrl' and not(private_reviewed_existing_history.exact_ro_native_source_url(c.id,c.slug,m.id,p_source_match_id,m.source_url) or private_reviewed_existing_history.is_exact_ro_alba_partial(c.id,p.id,p.policy_sha256,p_source_match_id,m) or private_reviewed_existing_history.is_exact_ro_alba_post_cleanup(c.id,p.id,p.policy_sha256,p_source_match_id,m) or private_reviewed_existing_history.is_exact_md_schedule_placeholder(c.id,p.id,p.policy_sha256,p_source_match_id,m)))$q$);
 changed:=replace(changed,$q$and not(m.zapisnik_id is null and m.source_url is null and m.home_goals=0 and m.away_goals=0 and m.statistics_status='available'))$q$,$q$and not((m.zapisnik_id is null and m.source_url is null and m.home_goals=0 and m.away_goals=0 and m.statistics_status='available') or private_reviewed_existing_history.is_exact_md_schedule_placeholder(c.id,p.id,p.policy_sha256,p_source_match_id,m)))$q$);
 if changed=d then raise exception 'REVIEWED_RO_MD: FMF upsert anchors missing';end if;
 execute changed;
end$$;

-- A target's admission exception is exact, per-match, and bound to its immutable policy SHA.
do $$
declare d text;changed text;prior text;old_header text;new_header text;old_score text;new_score text;old_update text;new_update text;
begin
 d:=pg_get_functiondef('private_reviewed_existing_history.check_targets(text,text)'::regprocedure);
 old_header:=$old$and m.zapisnik_id=target_row.report_id and (m.source_url=e->>'sourceUrl' or private_reviewed_existing_history.exact_ro_native_source_url(t.cid,t.slug,target_row.mid,target_row.source_match_id,m.source_url)) and m.imported_at is not null and m.statistics_status='available'$old$;
 new_header:=$new$and ((private_reviewed_existing_history.target_admission(t.slug,target_row.source_match_id)->>'kind'='imported_report' and m.home_goals=target_row.home_goals and m.away_goals=target_row.away_goals and m.zapisnik_id=target_row.report_id and (m.source_url=e->>'sourceUrl' or private_reviewed_existing_history.exact_ro_native_source_url(t.cid,t.slug,target_row.mid,target_row.source_match_id,m.source_url)) and m.imported_at is not null and m.statistics_status='available')
   or (private_reviewed_existing_history.target_admission(t.slug,target_row.source_match_id)->>'kind'='incomplete_report' and private_reviewed_existing_history.is_exact_ro_alba_partial(t.cid,t.policy_id,t.policy_sha,target_row.source_match_id,m))
   or (private_reviewed_existing_history.target_admission(t.slug,target_row.source_match_id)->>'kind'='schedule_only_official_result' and private_reviewed_existing_history.is_exact_md_schedule_placeholder(t.cid,t.policy_id,t.policy_sha,target_row.source_match_id,m)))$new$;
 changed:=replace(d,old_header,new_header);
 if changed=d then raise exception 'REVIEWED_RO_MD: preflight admission header anchor missing';end if;
 prior:=changed;
 old_score:=$old$m.home_goals=target_row.home_goals and m.away_goals=target_row.away_goals and$old$;
 new_score:=$new$((m.home_goals=target_row.home_goals and m.away_goals=target_row.away_goals) or private_reviewed_existing_history.is_exact_md_schedule_placeholder(t.cid,t.policy_id,t.policy_sha,target_row.source_match_id,m)) and$new$;
 changed:=replace(changed,old_score,new_score);
 if changed=prior and position('is_exact_md_schedule_placeholder(t.cid,t.policy_id,t.policy_sha,target_row.source_match_id,m)) and ((private_reviewed_existing_history.target_admission' in changed)=0 then raise exception 'REVIEWED_RO_MD: preflight schedule score anchor missing';end if;
 prior:=changed;
 changed:=replace(changed,$q$target_row.mid=mm.id$q$,$q$rt.mid=mm.id$q$);
 if changed=prior and position('rt.mid=mm.id' in changed)=0 then raise exception 'REVIEWED_RO_MD: preflight past-target exclusion anchor missing';end if;
 -- check_targets' country map was extended in the preceding block; do not
 -- attempt the same replacement again after the header replacement.
 execute changed;

 d:=pg_get_functiondef('public.apply_reviewed_existing_cleanup(text,text,text,text,text)'::regprocedure);
 old_update:=$old$  update matches set imported_at=null where id=target_row.mid and imported_at is not null;perform private_reviewed_existing_history.require(found,'target report no longer imported');$old$;
 new_update:=$new$  update matches set imported_at=null where id=target_row.mid and imported_at is not null;
  if found then perform private_reviewed_existing_history.require(private_reviewed_existing_history.target_admission(t.slug,target_row.source_match_id)->>'kind'='imported_report','only original imported report may be changed through imported-row path');
  else perform private_reviewed_existing_history.require(private_reviewed_existing_history.target_admission(t.slug,target_row.source_match_id)->>'kind' in('incomplete_report','schedule_only_official_result') and exists(select 1 from matches where id=target_row.mid and imported_at is null),'unimported admission must remain the exact preflight-approved target');end if;$new$;
 changed:=replace(d,old_update,new_update);
 if changed=d then raise exception 'REVIEWED_RO_MD: apply imported-row anchor missing';end if;
 execute changed;

 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$=t.current_reports-(select count(*) from private_reviewed_existing_history.report_targets(t.slug)rt where rt.season='2026/27')$q$,$q$=t.current_reports-(select count(*) from private_reviewed_existing_history.report_targets(t.slug)rt where rt.season='2026/27' and private_reviewed_existing_history.target_admission(t.slug,rt.source_match_id)->>'kind'='imported_report')$q$);
 changed:=replace(changed,$q$when 'nfsbih' then 'ba%' end$q$,$q$when 'nfsbih' then 'ba%' when 'fmf' then 'md%' end$q$);
 changed:=replace(changed,$q$target_row.mid=mm.id$q$,$q$rt.mid=mm.id$q$);
 if changed=d then raise exception 'REVIEWED_RO_MD: release inventory/namespace/target-set anchors missing';end if;
 execute changed;
end$$;

commit;
