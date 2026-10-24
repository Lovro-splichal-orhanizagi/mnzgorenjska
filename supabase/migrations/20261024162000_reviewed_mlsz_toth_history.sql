-- Exact source-proven Toth archive exceptions under the owner-approved <=5% archive policy.
-- Registration only; no cleanup, repricing or activation performed by this migration.
begin;
insert into private_historical_statistics.policies(id,policy_sha256,document) values('hu-cs-u19-toth-historical-unavailable-2026-10-24-v1','e6a60a710be2da291be450cec66b57998b25a4484f092eb27a41da47389bbf34','{"sourcePolicy":"reviewed-existing-history-20261023-v1","season":"2025/26","recordedAt":"2026-10-24T15:38:19.076500+00:00","approvalReference":"Owner explicitly answered Allow the reviewed archive policy up to 5% to call_3a8674f5af8c4b8c8ba9bac6c54d0481 question0 on 24 October 2026 for remaining unlaunched Hungarian candidates, archive only. These two source-proven Toth reports are 2 of 87 archive reports (2.30%): preserve official 3–0 and 0–3, mark individual statistics unavailable, remove exactly 52 appearances and 11 goal events, reprice and rerun all current-report, goalkeeper, price/legal-squad and fresh deadline gates. Recording time is evidence time, not the unknown user-send timestamp.","id":"hu-cs-u19-toth-historical-unavailable-2026-10-24-v1","provider":"mlsz","competitionSlug":"hu-cs-u19-toth","competitionId":625,"sourceLeagueCode":"67/6/34102","entries":[{"sourceMatchId":"2079402","sourceCompetitionId":"65/6/31904","sourcePhase":null,"sourceRound":10,"playedOn":"2025-11-16","homeSourceClubId":"311188","awaySourceClubId":"311185","sourceUrl":"https://adatbank.mlsz.hu/match/65/6/31904/10/2079402.html","rawSha256":"f233a3f56df2c829c4e1d4909d1e7bcbb033b5fc1fedff38f6f39892b2f2b991","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"score_goal_events_disagree"},{"sourceMatchId":"2079433","sourceCompetitionId":"65/6/31904","sourcePhase":null,"sourceRound":16,"playedOn":"2026-04-25","homeSourceClubId":"311187","awaySourceClubId":"311186","sourceUrl":"https://adatbank.mlsz.hu/match/65/6/31904/16/2079433.html","rawSha256":"2ea11f7d6b83ba65fcd673215bdef161a1ac636e23bd17f7e647fad6d13409c6","observedHomeScore":0,"observedAwayScore":3,"reasonCode":"score_goal_events_disagree"}]}'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('mlsz','311188','','HU',array['NagyLog-St.Mihály FC'],'[{"sourceMatchId":"2079402","sourceUrl":"https://adatbank.mlsz.hu/match/65/6/31904/10/2079402.html","rawSha256":"f233a3f56df2c829c4e1d4909d1e7bcbb033b5fc1fedff38f6f39892b2f2b991"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('mlsz','311185','','HU',array['UTC 1913 Labdarúgó Kft'],'[{"sourceMatchId":"2079402","sourceUrl":"https://adatbank.mlsz.hu/match/65/6/31904/10/2079402.html","rawSha256":"f233a3f56df2c829c4e1d4909d1e7bcbb033b5fc1fedff38f6f39892b2f2b991"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('mlsz','311187','','HU',array['Szőreg RSE'],'[{"sourceMatchId":"2079433","sourceUrl":"https://adatbank.mlsz.hu/match/65/6/31904/16/2079433.html","rawSha256":"2ea11f7d6b83ba65fcd673215bdef161a1ac636e23bd17f7e647fad6d13409c6"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('mlsz','311186','','HU',array['ESK Kiskundorozsma'],'[{"sourceMatchId":"2079433","sourceUrl":"https://adatbank.mlsz.hu/match/65/6/31904/16/2079433.html","rawSha256":"2ea11f7d6b83ba65fcd673215bdef161a1ac636e23bd17f7e647fad6d13409c6"}]'::jsonb);

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
 ('ro-ab-l5-s2',499::bigint,'hlf','judetean/alba/fotbal/2026-2027/liga-5/sezon-regular/serie-2','ro-ab-l5-s2-historical-unavailable-2026-10-24-v1','c13732fdacafd49ef60bd13ec20999d9d64f7a5894a21c43f7e74526ee7a0f26',30,0),
 ('hu-pe-u19-c',637::bigint,'mlsz','67/14/34250','hu-pe-u19-c-historical-unavailable-2026-10-24-v1','f3925f7cdc5ad93c7001eea587e75f88cd9b486dcc7788b5f2eb7c0a2d5aaed2',19,28),
 ('hu-cs-u19-toth',625::bigint,'mlsz','67/6/34102','hu-cs-u19-toth-historical-unavailable-2026-10-24-v1','e6a60a710be2da291be450cec66b57998b25a4484f092eb27a41da47389bbf34',23,87)
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
 ('ro-ab-l5-s2',499::bigint,'86feb0be-2e6f-4c2e-9fd3-f26aba19fb91','86feb0be-2e6f-4c2e-9fd3-f26aba19fb91',202541::bigint,18053::bigint,'2026/27',6,5083::bigint,5079::bigint,'2026-10-18'::date,2,3,27,0,null::text,null::int),
 ('hu-pe-u19-c',637::bigint,'2120218','2120218',616508::bigint,35547::bigint,'2025/26',2,7676::bigint,6814::bigint,'2025-09-13'::date,3,0,25,8,null::text,null::int),
 ('hu-cs-u19-toth',625::bigint,'2079402','2079402',622735::bigint,35640::bigint,'2025/26',10,10928::bigint,2448::bigint,'2025-11-16'::date,3,0,33,9,null::text,null::int),
 ('hu-cs-u19-toth',625::bigint,'2079433','2079433',622772::bigint,35646::bigint,'2025/26',16,10926::bigint,6471::bigint,'2026-04-25'::date,0,3,19,2,null::text,null::int)
 ) as v(slug,cid,source_match_id,report_id,mid,rid,season,rno,home_id,away_id,played_on,home_goals,away_goals,appearances,goals,source_phase,source_round)
 where v.slug=p_slug
$$;

do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_mlsz_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$when'317011'then 6814 end$q$,$q$when'317011'then 6814 when'311188'then 10928 when'311185'then 2448 when'311187'then 10926 when'311186'then 6471 end$q$);
 if changed=d then raise exception 'REVIEWED_HU625: private_mlsz_history.protect_catalog() exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_mlsz_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$::bigint in(463,619,637)then$q$,$q$::bigint in(463,619,637,625)then$q$);
 if changed=d then raise exception 'REVIEWED_HU625: private_mlsz_history.protect_catalog() exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$,$q$ or (c.id=625 and c.slug='hu-cs-u19-toth' and c.source='mlsz' and c.source_league_code='67/6/34102' and p.id='hu-cs-u19-toth-historical-unavailable-2026-10-24-v1' and p.policy_sha256='e6a60a710be2da291be450cec66b57998b25a4484f092eb27a41da47389bbf34')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$);
 if changed=d then raise exception 'REVIEWED_HU625: public.apply_historical_statistics_policy(bigint,text,text,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$,$q$ or (c.id=625 and c.source='mlsz' and p.policy_sha256='e6a60a710be2da291be450cec66b57998b25a4484f092eb27a41da47389bbf34' and p_source_match_id in('2079402','2079433'))) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$);
 if changed=d then raise exception 'REVIEWED_HU625: public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.check_targets(text,text)'::regprocedure);
 changed:=replace(d,$q$t.cid not in(979,637)$q$,$q$t.cid not in(979,637,625)$q$);
 if changed=d then raise exception 'REVIEWED_HU625: private_reviewed_existing_history.check_targets(text,text) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$t.cid not in(979,637)$q$,$q$t.cid not in(979,637,625)$q$);
 if changed=d then raise exception 'REVIEWED_HU625: private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$t.cid<>637 or not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=637 and m.imported_at$q$,$q$t.cid not in(637,625) or not exists(select 1 from matches m join rounds r on r.id=m.round_id where r.competition_id=t.cid and m.imported_at$q$);
 if changed=d then raise exception 'REVIEWED_HU625: private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone) exact anchor missing';end if;
 execute changed;
end$$;
commit;
