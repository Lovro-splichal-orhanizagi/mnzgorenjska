-- Exact Baranya scorer omission; authoritative MLSZ red clock preserves valid ordinary report2111691.
-- Registration/schema only: no live cleanup, report refresh, repricing or activation.
begin;
insert into private_historical_statistics.policies(id,policy_sha256,document) values('hu-ba-u19-2-historical-unavailable-2026-10-24-v1','5d06726e54a2ac2feff95d0aa39302fc89d9bfc16a6a8b40b28b724997b80c62','{"sourcePolicy":"reviewed-existing-history-20261023-v1","season":"2025/26","recordedAt":"2026-10-24T16:24:49.236927+00:00","approvalReference":"Owner explicitly answered Allow the reviewed archive policy up to 5% to call_3a8674f5af8c4b8c8ba9bac6c54d0481 question0 on 24 October 2026 for remaining unlaunched Hungarian candidates, archive only. This exact source-proven Baranya report is 1 of 28 reports in archive 65/2/32200 (3.57%); separate archive 65/2/32199 retains all 28 ordinary reports. Preserve official 3–0, mark individual statistics unavailable, remove exactly 21 appearances and zero goals, reprice and rerun all current-report, goalkeeper, price/legal-squad and fresh deadline gates. Recording time is evidence time, not the unknown user-send timestamp.","id":"hu-ba-u19-2-historical-unavailable-2026-10-24-v1","provider":"mlsz","competitionSlug":"hu-ba-u19-2","competitionId":615,"sourceLeagueCode":"67/2/33847","archiveSourceLeagueCodes":["65/2/32199","65/2/32200"],"reviewedArchiveReportCounts":{"65/2/32199":28,"65/2/32200":28},"entries":[{"sourceMatchId":"2111703","sourceCompetitionId":"65/2/32200","sourcePhase":null,"sourceRound":1,"playedOn":"2025-09-13","homeSourceClubId":"315796","awaySourceClubId":"315795","sourceUrl":"https://adatbank.mlsz.hu/match/65/2/32200/1/2111703.html","rawSha256":"8d658e612d7be17b447076737c5a4157f83d0a9a0c0dd174c979e5ce7232ab9e","observedHomeScore":3,"observedAwayScore":0,"reasonCode":"official_score_published_but_scorer_events_absent"}]}'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('mlsz','315796','','HU',array['EGERÁG SE'],'[{"sourceMatchId":"2111703","sourceUrl":"https://adatbank.mlsz.hu/match/65/2/32200/1/2111703.html","rawSha256":"8d658e612d7be17b447076737c5a4157f83d0a9a0c0dd174c979e5ce7232ab9e"}]'::jsonb);
insert into private_historical_statistics.source_club_bindings(provider,source_club_id,source_category_id,country_code,canonical_names,proofs) values('mlsz','315795','','HU',array['SÁSD VSK'],'[{"sourceMatchId":"2111703","sourceUrl":"https://adatbank.mlsz.hu/match/65/2/32200/1/2111703.html","rawSha256":"8d658e612d7be17b447076737c5a4157f83d0a9a0c0dd174c979e5ce7232ab9e"}]'::jsonb);

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
 ('hu-cs-u19-toth',625::bigint,'mlsz','67/6/34102','hu-cs-u19-toth-historical-unavailable-2026-10-24-v1','e6a60a710be2da291be450cec66b57998b25a4484f092eb27a41da47389bbf34',23,87),
 ('hu-ba-u19-2',615::bigint,'mlsz','67/2/33847','hu-ba-u19-2-historical-unavailable-2026-10-24-v1','5d06726e54a2ac2feff95d0aa39302fc89d9bfc16a6a8b40b28b724997b80c62',29,56)
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
 ('hu-cs-u19-toth',625::bigint,'2079433','2079433',622772::bigint,35646::bigint,'2025/26',16,10926::bigint,6471::bigint,'2026-04-25'::date,0,3,19,2,null::text,null::int),
 ('hu-ba-u19-2',615::bigint,'2111703','2111703',624245::bigint,35693::bigint,'2025/26',1,5870::bigint,5879::bigint,'2025-09-13'::date,3,0,21,0,null::text,null::int)
 ) as v(slug,cid,source_match_id,report_id,mid,rid,season,rno,home_id,away_id,played_on,home_goals,away_goals,appearances,goals,source_phase,source_round)
 where v.slug=p_slug
$$;

do $$declare d text;changed text;begin
 d:=pg_get_functiondef('private_mlsz_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$when'311186'then 6471 end$q$,$q$when'311186'then 6471 when'315796'then 5870 when'315795'then 5879 end$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_mlsz_history.protect_catalog() exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_mlsz_history.protect_catalog()'::regprocedure);
 changed:=replace(d,$q$::bigint in(463,619,637,625)then$q$,$q$::bigint in(463,619,637,625,615)then$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_mlsz_history.protect_catalog() exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.apply_historical_statistics_policy(bigint,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$,$q$ or (c.id=615 and c.slug='hu-ba-u19-2' and c.source='mlsz' and c.source_league_code='67/2/33847' and p.id='hu-ba-u19-2-historical-unavailable-2026-10-24-v1' and p.policy_sha256='5d06726e54a2ac2feff95d0aa39302fc89d9bfc16a6a8b40b28b724997b80c62')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed tuple required';end if;$q$);
 if changed=d then raise exception 'REVIEWED_HU615: public.apply_historical_statistics_policy(bigint,text,text,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb)'::regprocedure);
 changed:=replace(d,$q$) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$,$q$ or (c.id=615 and c.source='mlsz' and p.policy_sha256='5d06726e54a2ac2feff95d0aa39302fc89d9bfc16a6a8b40b28b724997b80c62' and p_source_match_id='2111703')) then raise exception 'HISTORICAL_POLICY: reviewed-existing fixed report required';end if;$q$);
 if changed=d then raise exception 'REVIEWED_HU615: public.upsert_unavailable_historical_match(bigint,text,text,text,text,jsonb) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.check_targets(text,text)'::regprocedure);
 changed:=replace(d,$q$t.cid not in(979,637,625)$q$,$q$t.cid not in(979,637,625,615)$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.check_targets(text,text) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$t.cid not in(979,637,625)$q$,$q$t.cid not in(979,637,625,615)$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$t.cid not in(637,625) or not exists$q$,$q$t.cid not in(637,625,615) or not exists$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.check_targets(text,text)'::regprocedure);
 changed:=replace(d,$q$before_image:=private_reviewed_existing_history.capture(t.slug);$q$,$q$perform private_reviewed_existing_history.require(t.cid<>615 or ((select count(*)from matches mm join rounds rr on rr.id=mm.round_id where rr.competition_id=615 and rr.season='2025/26' and mm.imported_at is not null and mm.source_url like 'https://adatbank.mlsz.hu/match/65/2/32199/%')=28 and (select count(*)from matches mm join rounds rr on rr.id=mm.round_id where rr.competition_id=615 and rr.season='2025/26' and mm.imported_at is not null and mm.source_url like 'https://adatbank.mlsz.hu/match/65/2/32200/%')=28),'exact Baranya separate archive inventories28/28 required');
 before_image:=private_reviewed_existing_history.capture(t.slug);$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.check_targets(text,text) exact anchor missing';end if;
 execute changed;
 d:=pg_get_functiondef('private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone)'::regprocedure);
 changed:=replace(d,$q$opening:=private_reviewed_existing_history.opening(t.slug,p_clock);$q$,$q$perform private_reviewed_existing_history.require(t.cid<>615 or ((select count(*)from matches mm join rounds rr on rr.id=mm.round_id where rr.competition_id=615 and rr.season='2025/26' and mm.imported_at is not null and mm.source_url like 'https://adatbank.mlsz.hu/match/65/2/32199/%')=28 and (select count(*)from matches mm join rounds rr on rr.id=mm.round_id where rr.competition_id=615 and rr.season='2025/26' and mm.imported_at is not null and mm.source_url like 'https://adatbank.mlsz.hu/match/65/2/32200/%')=27),'exact Baranya separate archive inventories28/27 required');
 opening:=private_reviewed_existing_history.opening(t.slug,p_clock);$q$);
 if changed=d then raise exception 'REVIEWED_HU615: private_reviewed_existing_history.release_core(text,text,text,text,boolean,timestamp with time zone) exact anchor missing';end if;
 execute changed;
end$$;
commit;
