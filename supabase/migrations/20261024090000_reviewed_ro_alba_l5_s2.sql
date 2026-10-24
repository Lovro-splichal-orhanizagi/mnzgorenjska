-- Exact owner-approved Alba L5 S2 scorer omission; registration only, no activation.
begin;
insert into private_historical_statistics.policies(id,policy_sha256,document) values
('ro-ab-l5-s2-historical-unavailable-2026-10-24-v1','c13732fdacafd49ef60bd13ec20999d9d64f7a5894a21c43f7e74526ee7a0f26','{"sourcePolicy":"reviewed-existing-history-20261023-v1","season":"2026/27","recordedAt":"2026-10-24T07:43:31.680Z","approvalReference":"Owner explicitly approved this exact exclusion in reply to call_3b1fed93bbec4963aabd344f3fa4f5d8: preserve official 2–3, mark individual statistics unavailable, reprice and revalidate. Recording time is evidence time, not the unknown user-send timestamp.","id":"ro-ab-l5-s2-historical-unavailable-2026-10-24-v1","provider":"hlf","competitionSlug":"ro-ab-l5-s2","competitionId":499,"sourceLeagueCode":"judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2","entries":[{"sourceMatchId":"86feb0be-2e6f-4c2e-9fd3-f26aba19fb91","sourceCompetitionId":"64515604-83ad-4af0-8abe-4557b25e90b0","sourcePhase":"45f3b9be-0f00-4937-9f55-066d73a227a6","sourceRound":6,"playedOn":"2026-10-18","homeSourceClubId":"d0a838cf-6c6f-4b82-9cd0-c6d8cead047a","awaySourceClubId":"3e590326-8240-43f8-bc15-89868451e90c","sourceUrl":"https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2/etapa-6/acs-sanmiclaus-acs-gaz-metan-valea-lunga","rawSha256":"438c1da7a7620142e25907227ca2c81caf4e7c67607bf10f5d2cf388e9501f00","sourceProof":{"matchSheetSha256":"031c540b037773a0fb0044e274bd6f26c9c1563f277c176a0c962e2f94d6309b","roundResponseSha256":"8e2a9ded229fc6b9985904eead0765e0c9e0a621e6a7ff56148e542c81f47bfb","matchSheetId":"493d2020-b10f-4a31-a58d-a9b75bc1b73b","rawSha256Formula":"SHA256(JSON.stringify({matchSheetSha256,roundResponseSha256}) in lexicographic key order)"},"observedHomeScore":2,"observedAwayScore":3,"reasonCode":"official_score_published_but_scorer_events_absent"}]}'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values
('hlf','d0a838cf-6c6f-4b82-9cd0-c6d8cead047a','','RO',array['ACS Sânmiclăuș'], '[{"sourceMatchId":"86feb0be-2e6f-4c2e-9fd3-f26aba19fb91","sourceUrl":"https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2/etapa-6/acs-sanmiclaus-acs-gaz-metan-valea-lunga","rawSha256":"438c1da7a7620142e25907227ca2c81caf4e7c67607bf10f5d2cf388e9501f00"}]'::jsonb),
('hlf','3e590326-8240-43f8-bc15-89868451e90c','','RO',array['ACS Gaz Metan Valea Lungă'], '[{"sourceMatchId":"86feb0be-2e6f-4c2e-9fd3-f26aba19fb91","sourceUrl":"https://hailafotbal.ro/rezultate/judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2/etapa-6/acs-sanmiclaus-acs-gaz-metan-valea-lunga","rawSha256":"438c1da7a7620142e25907227ca2c81caf4e7c67607bf10f5d2cf388e9501f00"}]'::jsonb);

create or replace function private_reviewed_existing_history.target(p_slug text)
returns table(slug text,cid bigint,provider text,code text,policy_id text,policy_sha text,current_reports int,archive_reports int)
language sql immutable set search_path=public,pg_temp as $$
 select * from (values
 ('gb-npl-midlands',979::bigint,'isthmian','npl/67d7c7bb74247876e6dae40c/2026-27','gb-npl-midlands-historical-unavailable-2026-10-23-v1','5f88bd981434a2d1bb8097a71d4b62974601b0eb01758509b345c8eb6b0c6924',150,462),
 ('gb-sfl-d1-south',984::bigint,'isthmian','sfl/69d0bdf9b616bafb97331d41/2026-27','gb-sfl-d1-south-historical-unavailable-2026-10-23-v1','682dbaa0e1acfb0a4a03da9da93cdc706eb0d16dc4a8df180e994f6980369a30',132,0),
 ('ro-liga3-s1',497::bigint,'hlf','national/fotbal/2026-2027/superscore-liga-3/sezon-regular/serie-1','ro-liga3-s1-historical-unavailable-2026-10-23-v1','b6686671855dfa9a6f96fa8cf67d530aa4fc4208f859e783929cb36140169329',54,0),
 ('ba-wwin-liga-bih',998::bigint,'nfsbih','wwin-liga-bih/54152223','ba-wwin-liga-bih-historical-unavailable-2026-10-23-v1','fa48230a81834fe5d182012bdf34ab5df513392f5000ad4e0186f24d5b9a1366',49,0),
 ('ro-ab-l4-s2',501::bigint,'hlf','judetean/alba/fotbal/2026-2027/liga-4/sezon-regular/serie-2','ro-ab-l4-s2-historical-unavailable-2026-10-23-v1','0d81629b586336edb075b88be89271c6cb0aea141f8b8bbb2459ff6fc4e97e2b',23,0),
 ('md-liga-2',1107::bigint,'fmf','liga-2-1782306996/877','md-liga-2-historical-unavailable-2026-10-23-v1','95d6bb7928ac81a43fa6055abf2a31f75d48633c6c5158c4c6b70b9f4149450e',95,0),
 ('ro-ab-l5-s2',499::bigint,'hlf','judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2','ro-ab-l5-s2-historical-unavailable-2026-10-24-v1','c13732fdacafd49ef60bd13ec20999d9d64f7a5894a21c43f7e74526ee7a0f26',30,0)
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
 ('md-liga-2',1107::bigint,'50481','md50481',560803::bigint,35244::bigint,'2026/27',11,10833::bigint,10842::bigint,'2026-10-14'::date,2,3,0,0,null::text,null::int),
 ('ro-ab-l5-s2',499::bigint,'86feb0be-2e6f-4c2e-9fd3-f26aba19fb91','86feb0be-2e6f-4c2e-9fd3-f26aba19fb91',202541::bigint,18053::bigint,'2026/27',6,5083::bigint,5079::bigint,'2026-10-18'::date,2,3,27,0,null::text,null::int)
 ) as v(slug,cid,source_match_id,report_id,mid,rid,season,rno,home_id,away_id,played_on,home_goals,away_goals,appearances,goals,source_phase,source_round)
 where v.slug=p_slug
$$;

-- Extend only the fixed policy/report tuple and immutable catalog IDs.
do $$
declare d text;changed text;
begin
 d:=pg_get_functiondef('private_reviewed_existing_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$'md-liga-2-historical-unavailable-2026-10-23-v1')$q$,$q$'md-liga-2-historical-unavailable-2026-10-23-v1','ro-ab-l5-s2-historical-unavailable-2026-10-24-v1')$q$);
 if changed=d then raise exception 'REVIEWED_RO499: exact private_reviewed_existing_history.protect_catalog anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$'Sheriff-2','CF Maiak','CMF Cahul')$q$,$q$'Sheriff-2','CF Maiak','CMF Cahul','d0a838cf-6c6f-4b82-9cd0-c6d8cead047a','3e590326-8240-43f8-bc15-89868451e90c')$q$);
 if changed=d then raise exception 'REVIEWED_RO499: exact private_reviewed_existing_history.protect_catalog anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$when 'CMF Cahul' then 10833 end$q$,$q$when 'CMF Cahul' then 10833 when 'd0a838cf-6c6f-4b82-9cd0-c6d8cead047a' then 5083 when '3e590326-8240-43f8-bc15-89868451e90c' then 5079 end$q$);
 if changed=d then raise exception 'REVIEWED_RO499: exact private_reviewed_existing_history.protect_catalog anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$,$q$ or (c.id=499 and c.slug='ro-ab-l5-s2' and c.source='hlf' and c.source_league_code='judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2' and p.id='ro-ab-l5-s2-historical-unavailable-2026-10-24-v1' and p.policy_sha256='c13732fdacafd49ef60bd13ec20999d9d64f7a5894a21c43f7e74526ee7a0f26')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$);
 if changed=d then raise exception 'REVIEWED_RO499: exact public.apply_historical_statistics_policy anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$,$q$ or (c.id=499 and c.source='hlf' and p.policy_sha256='c13732fdacafd49ef60bd13ec20999d9d64f7a5894a21c43f7e74526ee7a0f26' and p_source_match_id='86feb0be-2e6f-4c2e-9fd3-f26aba19fb91')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$);
 if changed=d then raise exception 'REVIEWED_RO499: exact public.upsert_unavailable_historical_match anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$(c.id=501 and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15') then p_source_match_id end$q$,$q$(c.id=501 and p_source_match_id='8b7af269-2420-4534-9af2-f3cd51852f15') or (c.id=499 and p_source_match_id='86feb0be-2e6f-4c2e-9fd3-f26aba19fb91') then p_source_match_id end$q$);
 if changed=d then raise exception 'REVIEWED_RO499: exact public.upsert_unavailable_historical_match anchor missing';end if;
 execute changed;
end$$;

commit;
