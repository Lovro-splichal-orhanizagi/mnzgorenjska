-- The ordinary complete v1 fixture above is test-only, never source evidence.
do $$begin
 if to_regprocedure('public.prepare_dfb_historical_statistics(text,text)')is null then raise exception 'DFB v3 atomic bootstrap missing';end if;
end $$;
create temporary table de_policy as select * from private_historical_statistics.policies where id='de-dfb-suedwest-2025-historical-unavailable-v1';
-- Bind three synthetic clubs to the two REAL reviewed fixture identities while
-- retaining the complete306-pair topology. No production data is modified.
create temporary table de_selected as select a.id first_id,b.id second_id,a.home balingen,a.away offenbach,b.home steinbach
 from de_fixtures a join de_fixtures b on b.s=0 and b.round=19 and b.away=a.home and b.home<>a.away where a.s=0 and a.round=11 limit 1;
create temporary table de_names as select home n,'TSG Balingen' name from(select balingen home from de_selected)x union all select offenbach,'Kickers Offenbach'from de_selected union all select steinbach,'TSV Steinbach Haiger'from de_selected;
do $$declare x record;oldname text;begin
 for x in select * from de_names loop
  select name into oldname from de_clubs where n=x.n;
  update de_manifest set raw=replace(raw,oldname,x.name);
  update teams set name=x.name where id=(select id from de_clubs where n=x.n);
  update players set full_name=replace(full_name,oldname,x.name)where team_id=(select id from de_clubs where n=x.n);
  update de_clubs set name=x.name where n=x.n;
 end loop;
end $$;
create temporary table de_exception_map as select f.*,e from de_fixtures f cross join de_selected s cross join de_policy p cross join lateral jsonb_array_elements(p.document->'entries')e where f.id=case e->>'sourceMatchId'when '2402929'then s.first_id else s.second_id end;
delete from goals where match_id in(select id from de_exception_map);
delete from appearances where match_id in(select id from de_exception_map);
delete from matches where id in(select id from de_exception_map);
-- Add honest status/coverage plus real policy-aware replay lineage to the packet.
update de_manifest set raw=(select jsonb_set(raw::jsonb,'{seasons}',jsonb_agg(s||jsonb_build_object('fixtures',(
 select jsonb_agg(case when em.e is null then f||jsonb_build_object('statisticsStatus','available')else f||jsonb_build_object(
 'id','de-dfb-'||(em.e->>'sourceMatchId'),'date',em.e->>'playedOn','time','14:00','url',em.e->>'sourceUrl','homeGoals',(em.e->>'observedHomeScore')::int,'awayGoals',(em.e->>'observedAwayScore')::int,
 'starters',null,'appearances',null,'goals',null,'statisticsStatus','unavailable_historical','statisticsReason',em.e->>'reasonCode','statisticsPolicyId',p.id,'statisticsPolicySha256',p.policy_sha256,'sourceRawSha256',em.e->>'rawSha256','sourceFixture',(em.e-array['rawSha256','reasonCode'])||jsonb_build_object('season','2025/26'))end order by ord)
 from jsonb_array_elements(s->'fixtures')with ordinality ff(f,ord)left join de_exception_map em on em.report=f->>'id'cross join de_policy p))order by s->>'season'))::text from jsonb_array_elements(raw::jsonb->'seasons')s);
update de_manifest set raw=(select jsonb_set(raw::jsonb,'{seasons}',jsonb_agg(s||jsonb_build_object('evidenceMode','policy-replay','statisticsCoverage',jsonb_build_object('fixtureCount',306,'playedCount',(select count(*)from jsonb_array_elements(s->'fixtures')f where(f->>'played')::boolean),'availableStatisticsCount',(select count(*)from jsonb_array_elements(s->'fixtures')f where(f->>'played')::boolean and f->>'statisticsStatus'='available'),'unavailableHistoricalCount',case s->>'season'when '2025/26'then 2 else 0 end,'strictStatisticsCoverage',s->>'season'='2026/27','policyCoverage',true))order by s->>'season'))::text from jsonb_array_elements(raw::jsonb->'seasons')s);
update de_manifest set raw=(raw::jsonb||jsonb_build_object('version',3,'provenanceVersion',2,'statisticsPolicy',jsonb_build_object('id',p.id,'sha256',p.policy_sha256,'firstFantasyPlayedOn',(current_date+3)::text)))::text from de_policy p;
update de_manifest set raw=(select jsonb_set(raw::jsonb,'{seasons}',jsonb_agg(s||jsonb_build_object('lineage',jsonb_build_object(
 'capture',jsonb_build_object('runId','101','jobId','201','commit',repeat('d',40),'workflowSha256',repeat('e',64),'parserSha256',repeat('f',64),'artifactId','301','artifactDigest','sha256:'||repeat('1',64),'indexSha256',repeat('2',64),'documentsSha256',s->>'documentsSha256','capturedAt',s->>'capturedAt','workflow','.github/workflows/preveri-dfb-ligo.yml','step',case s->>'season'when '2025/26'then 'Arhiv sezona — brez baze'else 'Tekoča sezona — brez baze'end,'conclusion',case s->>'season'when '2025/26'then 'failure'else 'success'end),
 'replay',jsonb_build_object('runId',s->>'runId','jobId',s->>'jobId','commit',raw::jsonb->>'sourceCommit','workflowSha256',repeat('3',64),'parserSha256',raw::jsonb->>'parserSha256','artifactId','401','artifactDigest','sha256:'||repeat('4',64),'generatedAt',now(),'workflow','.github/workflows/ponovi-dfb-regijo.yml','step','Ponovi sezono s pregledano zgodovinsko politiko — brez omrežja in baze','statisticsPolicyId',raw::jsonb#>>'{statisticsPolicy,id}','statisticsPolicySha256',raw::jsonb#>>'{statisticsPolicy,sha256}','firstFantasyPlayedOn',(current_date+3)::text)))order by s->>'season'))::text from jsonb_array_elements(raw::jsonb->'seasons')s);
create function pg_temp.de_prepare()returns jsonb language sql as $$select public.prepare_dfb_historical_statistics(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'))from de_manifest$$;
create function pg_temp.de_check(activate boolean default false)returns jsonb language sql as $$select public.varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),activate)from de_manifest$$;
-- Exercise the real empty-target bootstrap path, then roll back to the full
-- fixture so canonical activation can be tested independently afterwards.
do $$declare cid bigint;begin
 select id into cid from competitions where slug=current_setting('slff.test_slug');
 begin
  delete from matches where round_id in(select id from rounds where competition_id=cid);
  delete from players where competition_id=cid;
  delete from rounds where competition_id=cid;
  delete from teams where id in(select id from de_clubs);
  perform pg_temp.de_prepare();
  if(select count(*)from rounds where competition_id=cid)<>3 or(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid)<>2 or(select count(*)from players where competition_id=cid)<>0 or(select count(*)from teams where name in('TSG Balingen','Kickers Offenbach','TSV Steinbach Haiger')and country_id=(select country_id from competitions where id=cid))<>3 then raise exception 'empty bootstrap invented or omitted metadata';end if;
  if(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=cid and m.statistics_status='unavailable_historical'and m.imported_at is null)<>2 then raise exception 'empty bootstrap lacks exact unavailable set';end if;
  raise exception 'EXPECTED_EMPTY_BOOTSTRAP';
 exception when raise_exception then if sqlerrm<>'EXPECTED_EMPTY_BOOTSTRAP'then raise;end if;
 end;
 raise notice 'PASS empty target installs only3 real rounds,3 source clubs,2 unavailable headers and zero players';
end$$;
-- A conflicting SECOND header must roll back the first marker, policy and config.
do $$begin
 begin
  insert into matches(round_id,home_team_id,away_team_id,played_on,imported_at)
  select -925000-round,h.id,a.id,(e->>'playedOn')::date,now()from de_exception_map em join de_clubs h on h.n=em.home join de_clubs a on a.n=em.away where e->>'sourceMatchId'='2403004';
  perform pg_temp.de_prepare();raise exception 'second populated header accepted';
 exception when raise_exception then if sqlerrm not like 'HISTORICAL_POLICY: existing populated/%'then raise;end if;
 end;
 if exists(select 1 from private_historical_statistics.installed_policies where competition_id=(select id from competitions where slug=current_setting('slff.test_slug')))or exists(select 1 from matches where statistics_status='unavailable_historical')or exists(select 1 from competitions where slug=current_setting('slff.test_slug')and source_policy is not null)then raise exception 'atomic bootstrap leaked partial state';end if;
 raise notice 'PASS second-header failure rolls back complete bootstrap';
end$$;
select pg_temp.de_prepare();
do $$begin
 if(select count(*)from matches where statistics_status='unavailable_historical'and zapisnik_id in('de-dfb-2402929','de-dfb-2403004'))<>2 then raise exception 'exact2 unavailable headers missing';end if;
 if exists(select 1 from appearances a join matches m on m.id=a.match_id where m.statistics_status='unavailable_historical')then raise exception 'guessed individual data';end if;
end $$;
grant select on de_manifest to service_role;
set local role service_role;
select public.prepare_dfb_historical_statistics(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'))from de_manifest;
select public.varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),false)from de_manifest;
reset role;
-- Later test mutations run in subtransactions so the positive fixture remains intact.
create function pg_temp.de_reject(label text,mutation text)returns void language plpgsql as $$declare rejected boolean:=false;begin
 begin execute mutation;begin perform pg_temp.de_check();exception when others then if sqlerrm not like 'DE_RELEASE:%'and sqlerrm not like 'HISTORICAL_POLICY:%'and sqlstate<>'23505'then raise;end if;rejected:=true;end;if not rejected then raise exception 'MUTANT ACCEPTED: %',label;end if;raise exception 'EXPECTED_MUTANT_REJECTION';exception when raise_exception then if sqlerrm<>'EXPECTED_MUTANT_REJECTION'then raise;end if;end;
 raise notice 'PASS %',label;
end$$;
select pg_temp.de_reject('changed normal appearance','update appearances set minutes_played=89 where id=(select min(id)from appearances)');
select pg_temp.de_reject('wrong policy hash',$x$update de_manifest set raw=jsonb_set(raw::jsonb,'{statisticsPolicy,sha256}',to_jsonb(repeat('0',64)))::text$x$);
select pg_temp.de_reject('failed current parent',$x$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,1,lineage,capture,conclusion}','"failure"')::text$x$);
select pg_temp.de_reject('relabelled strict replay',$x$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,0,lineage,replay,step}','"Ponovi sezono — brez omrežja in baze"')::text$x$);
select pg_temp.de_reject('guessed unavailable arrays',$x$update de_manifest set raw=replace(raw,'"starters": null','"starters": []')$x$);
select pg_temp.de_reject('all default prices','update players set value=4.5 where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))');
select pg_temp.de_reject('locked candidate round','update rounds set lineups_locked_at=now()where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and season=''2026/27''and number=3');
select pg_temp.de_reject('changed six-hour deadline','update rounds set deadline_at=deadline_at+interval ''1 hour''where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and season=''2026/27''and number=3');
select pg_temp.de_reject('missing verified keeper position','update players set position=''MID''where competition_id=(select id from competitions where slug=current_setting(''slff.test_slug''))and position=''GK''');
select pg_temp.de_reject('changed raw exception hash',$x$update de_manifest set raw=replace(raw,'cda4f2b1cdd971e85cc34feab5c570e5388c733d69c474b02ca16a50f3d52296',repeat('0',64))$x$);
select pg_temp.de_reject('empty normal played arrays',$x$update de_manifest set raw=jsonb_set(jsonb_set(raw::jsonb,'{seasons,0,fixtures,0,starters}','[]'),'{seasons,0,fixtures,0,appearances}','[]')::text$x$);
select pg_temp.de_reject('archive fixture disguised unplayed',$x$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,0,fixtures,0,played}','false')::text$x$);
select pg_temp.de_reject('duplicate normal fixture',$x$update de_manifest set raw=jsonb_set(raw::jsonb,'{seasons,0,fixtures,1}',raw::jsonb#>'{seasons,0,fixtures,0}')::text$x$);
select pg_temp.de_reject('foreign competition',$x$update de_manifest set raw=jsonb_set(raw::jsonb,'{slug}','"de-regionalliga-west"')::text$x$);
-- Public service role cannot invoke the private release authorizer or old guards.
do $$begin
 if has_function_privilege('anon','public.prepare_dfb_historical_statistics(text,text)','EXECUTE')or has_function_privilege('authenticated','public.prepare_dfb_historical_statistics(text,text)','EXECUTE')or has_function_privilege('service_role','private_historical_statistics.authorize_release(bigint,text,text,text)','EXECUTE')then raise exception 'historical release grants failed';end if;
 begin update competitions set active=true where slug=current_setting('slff.test_slug');raise exception 'direct activation accepted';exception when others then if sqlerrm='direct activation accepted'then raise;end if;end;
end$$;
set local role anon;
do $$begin begin perform public.varen_vklop_dfb_regije('{}',repeat('0',64),false);raise exception 'anon release accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
set local role service_role;
select public.varen_vklop_dfb_regije(raw,encode(sha256(convert_to(raw,'UTF8')),'hex'),true)from de_manifest;
reset role;
do $$begin if not exists(select 1 from competitions where slug=current_setting('slff.test_slug')and active and prvi_fantasy_krog=3)then raise exception 'atomic activation failed';end if;end$$;
rollback;
