-- Synthetic native football/user fixtures over actual migration schema only.
-- No fixture authenticates source statistics, freshness, pricing or launch.
create temporary table projection_legacy as select oid,pg_get_functiondef(oid)definition from pg_proc where oid in('public.fcf_six_current_target_inventory(text,text[])'::regprocedure,'public.fcf_six_current_target_pricing(text)'::regprocedure,'public.fcf_six_current_target_check(text,text,boolean)'::regprocedure);
delete from competitions where id=797 or slug='es-ct-tercera-g9';
insert into competitions(id,slug,name,short_name,source,source_league_code,sezona_koledarska,country_id,active,prvi_fantasy_krog,source_policy,rok_pomak_ur)
overriding system value values(797,'es-ct-tercera-g9','TEST native G9','TEST','fcf','4118349-4118588',false,(select id from countries where code='ES'),false,1,'es-fcf-six-reviewed-history-v1',6);
insert into teams(id,name,short_name,country_id)overriding system value select 910000+i,'TEST club '||i,'T'||i,(select id from countries where code='ES')from generate_series(0,15)i;
insert into rounds(id,competition_id,season,number,played_on,deadline_at,lineups_locked_at)overriding system value select 920000+i,797,'2026/27',i,'2026-09-19'::date+7*(i-1),'2026-09-19T04:00Z'::timestamptz+interval'7 days'*(i-1),case when i=6 then '2026-10-24T04:00Z'::timestamptz end from generate_series(1,30)i;
insert into matches(id,round_id,home_team_id,away_team_id,played_on,zapisnik_id,source_url,source_round)overriding system value select 930000+i,920001+i/8,910000+2*(i%8),910001+2*(i%8),'2026-09-19'::date+7*(i/8),'es'||(4118349+i),'https://www.fcf.cat/ca/competicio/acta/'||(4118349+i),1+i/8 from generate_series(0,239)i;
insert into players(id,competition_id,team_id,first_name,last_name,position)overriding system value values(940000,797,910000,'Synthetic','Player','MID');
insert into auth.users(id,email)values('33333333-3333-4333-8333-333333333333','projection@example.invalid');
insert into scout.narocnine(team_id,country_id,paket,velja_do,pogoji_sprejeti_at)values(910000,(select country_id from competitions where id=797),'preizkus',now()+interval'1 day',now());
create function pg_temp.projection_assert(ok boolean,label text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'PROJECTION TEST: %',label;end if;end$$;
create function pg_temp.capture()returns jsonb language sql stable as $$select private_fcf_future_projection.capture('es-ct-tercera-g9',array[repeat('a',64)])$$;
create function pg_temp.reject(command text,label text)returns void language plpgsql as $$begin begin execute command;raise exception 'PROJECTION TEST: accepted %',label;exception when others then if sqlerrm like 'PROJECTION TEST:%'then raise;end if;end;end$$;
-- Initial actual native projection; all following mutants use real SQL rows.
create temporary table projection_baseline as select pg_temp.capture()p;
select pg_temp.projection_assert(jsonb_array_length(p#>'{native,rounds}')=30 and jsonb_array_length(p#>'{native,matches}')=240 and jsonb_array_length(p#>'{databaseInventory,teams}')=16 and p#>>'{native,dependencies,complete}'='true','actual30/240/16 identities and catalog coverage')from projection_baseline;
select pg_temp.projection_assert(p#>>'{native,competition,prvi_fantasy_krog}'='1'and(p#>'{native,rounds,5,lineups_locked_at}')<>'null'::jsonb and(p#>>'{native,rounds,5,deadline_at}')::timestamptz<statement_timestamp(),'actual seed and expired locked R6 read unchanged')from projection_baseline;
select pg_temp.projection_assert(p#>>'{native,dependencies,competitionUserRows}'='0'and not exists(select 1 from jsonb_array_elements(p#>'{native,dependencies,rounds}')r where r->>'rosterRows'<>'0'),'real empty user counts')from projection_baseline;
select pg_temp.projection_assert(p->>'dependencySnapshotSha256'=encode(sha256(convert_to(p->>'dependencySnapshotText','UTF8')),'hex')and p#>>'{pricingSnapshot,snapshotText}'=private_fcf_six_target_release.pricing_snapshot(797)::text and p#>>'{pricingSnapshot,snapshotSha256}'=encode(sha256(convert_to(p#>>'{pricingSnapshot,snapshotText}','UTF8')),'hex'),'exact deterministic SQL TEXT/SHA pricing and dependency bytes')from projection_baseline;
select pg_temp.projection_assert(pg_temp.capture()->>'dependencySnapshotText'=p->>'dependencySnapshotText','stable same state before-image')from projection_baseline;
select pg_temp.reject('select public.fcf_future_current_target_projection(''es-ct-tercera-g9'',array[repeat(''a'',64)])','write transaction wrapper refusal');
select pg_temp.reject('select private_fcf_future_projection.capture(''es-ct-segona-g1'',array[]::text[])','closed G9');
select pg_temp.reject('select private_fcf_future_projection.capture(''es-ct-tercera-g9'',array[repeat(''a'',64),repeat(''a'',64)])','duplicate privacy keys');
select pg_temp.reject('select private_fcf_future_projection.capture(''es-ct-tercera-g9'',array[null]::text[])','null privacy key');
select pg_temp.projection_assert(not has_function_privilege('anon','public.fcf_future_current_target_projection(text,text[])','execute')and not has_function_privilege('authenticated','public.fcf_future_current_target_projection(text,text[])','execute')and has_function_privilege('service_role','public.fcf_future_current_target_projection(text,text[])','execute')and not has_schema_privilege('service_role','private_fcf_future_projection','usage')and not has_function_privilege('service_role','private_fcf_future_projection.capture(text,text[])','execute'),'service-only wrapper/private helper ACL');
create function pg_temp.changed(command text,path text[],minimum bigint,label text)returns void language plpgsql as $$declare v jsonb;begin
 begin execute command;v:=pg_temp.capture();perform pg_temp.projection_assert((v#>>path)::bigint>=minimum,label);raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;
end$$;
select pg_temp.changed('insert into appearances(match_id,player_id,team_id,started,minutes_played,minute_off)values(930000,940000,910000,true,90,90)',array['native','dependencies','matches','0','appearances'],1,'appearance actual count');
select pg_temp.changed('insert into goals(match_id,scorer_id,team_id)values(930000,940000,910000)',array['native','dependencies','matches','0','goals'],1,'goal actual count');
select pg_temp.changed('insert into goals(match_id,scorer_id,team_id,assist_none_confirmed_at)values(930000,940000,910000,now())',array['native','dependencies','matches','0','userRows'],1,'confirmed none-assist counted');
select pg_temp.changed('insert into position_votes_deleted(id,player_id,voter_id,position,deleted_by,reason)values(1,940000,''33333333-3333-4333-8333-333333333333'',''MID'',''test'',''test'')',array['native','dependencies','competitionUserRows'],1,'deleted position vote audit');
select pg_temp.changed('insert into fantasy_teams(owner_id,name,competition_id)values(''33333333-3333-4333-8333-333333333333'',''TEST team'',797);insert into fantasy_roster(fantasy_team_id,player_id)select id,940000 from fantasy_teams where competition_id=797',array['native','dependencies','rounds','29','rosterRows'],1,'roster without round counts globally on every round');
select pg_temp.changed('insert into email_log(user_id,email,vrsta,competition_id,round_id)values(''33333333-3333-4333-8333-333333333333'',''projection@example.invalid'',''test'',797,920001)',array['native','dependencies','rounds','0','userRows'],1,'round email user dependency');
select pg_temp.changed('insert into napovedi(user_id,match_id,home_goals,away_goals)values(''33333333-3333-4333-8333-333333333333'',930000,1,1)',array['native','dependencies','matches','0','userRows'],1,'match prediction');
do $$declare a jsonb;b jsonb;begin begin
 a:=pg_temp.capture();insert into scout.modeli(leto,backtest,parametri)values(2026,'{}','{}');insert into scout.vektorji(model_id,player_id,skupina,vektor,podobni,podobnost)select max(id),999999999,'MID',array[1.0],array[940000::bigint],array[1.0]from scout.modeli;b:=pg_temp.capture();
 perform pg_temp.projection_assert(a->>'dependencySnapshotSha256'<>b->>'dependencySnapshotSha256'and(b->>'dependencySnapshotText')::jsonb#>>'{relations,scout.vektorji,count}'='1','Scout reverse similarity membership binds actual target rows');raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;
select pg_temp.changed('insert into scout.opazovani(team_id,player_id,dodal)values(910000,940000,''33333333-3333-4333-8333-333333333333'')',array['native','dependencies','competitionUserRows'],1,'Scout scalar watch');
select pg_temp.changed('insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,''33333333-3333-4333-8333-333333333333'',''igralec'',''{"igralci":[940000]}'')',array['native','dependencies','competitionUserRows'],1,'Scout JSON player array');
create function pg_temp.schema_hold(command text,label text)returns void language plpgsql as $$begin
 begin execute command;perform pg_temp.reject('select pg_temp.capture()',label);raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;
end$$;
select pg_temp.schema_hold('create table public.projection_unknown(player_id bigint references players(id))','empty unknown incoming FK');
select pg_temp.schema_hold('create table public.projection_unknown(round_id bigint)','empty unknown non-FK');
select pg_temp.schema_hold('alter table fantasy_roster add column unknown_dependency bigint','known relation shape drift');
select pg_temp.projection_assert(not exists(select 1 from projection_legacy where definition<>pg_get_functiondef(oid)),'legacy RPCs unchanged');

-- REVIEW REGRESSION P1: private profile actors stay out of every returned
-- JSON/TEXT field, while full actual player rows still affect protected hashes.
do $$declare a jsonb;b jsonb;begin begin
 insert into auth.users(id,email)values('44444444-4444-4444-8444-444444444444','projection-second-actor@example.invalid');
 update players set odsel_by='33333333-3333-4333-8333-333333333333'where id=940000;
 a:=pg_temp.capture();
 perform pg_temp.projection_assert(position('33333333-3333-4333-8333-333333333333'in a::text)=0,'returned projection never exposes departure profile actor UUID');
 update players set odsel_by='44444444-4444-4444-8444-444444444444'where id=940000;
 b:=pg_temp.capture();
 perform pg_temp.projection_assert(position('44444444-4444-4444-8444-444444444444'in b::text)=0 and a#>'{databaseInventory,players}'=b#>'{databaseInventory,players}'and a->>'dependencySnapshotSha256'<>b->>'dependencySnapshotSha256'and(a->>'dependencySnapshotText')::jsonb#>>'{relations,public.players,rowsSha256}'<>(b->>'dependencySnapshotText')::jsonb#>>'{relations,public.players,rowsSha256}','protected actor change affects full player hash without appearing in mapper facts');
 raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;

-- REVIEW REGRESSION P2: the explicitly supported absent-event schema must
-- never make unresolved target-club audit references disappear. DROP is confined
-- to this rollback subtransaction, including when CI already installed Scout.
do $$begin begin
 drop table if exists scout.prisotnost;
 drop table if exists scout.dogodki cascade;
 perform pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,complete}'='true','reviewed absent-event catalog remains supported');
 insert into teams(id,name,short_name,country_id)overriding system value values(919998,'TEST unrelated base','TUB',(select country_id from competitions where id=797));
 insert into scout.narocnine(team_id,country_id,paket,velja_do,pogoji_sprejeti_at)values(919998,(select country_id from competitions where id=797),'preizkus',now()+interval'1 day',now());
 insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(919998,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":999999}');
 perform pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,competitionUserRows}'='0','absent-event schema does not globally attribute unrelated orphan audits');
 perform pg_temp.schema_hold($command$insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":999999}')$command$,'absent-event schema cannot omit event-only target-club audit');
 perform pg_temp.schema_hold($command$insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":null,"shrani":true}')$command$,'absent-event schema cannot omit null creation audit');
 perform pg_temp.schema_hold($command$insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":999999,"igralci":[],"selekcija":null,"competition_id":""}')$command$,'empty/null association keys cannot bypass absent-event hold');
 raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;

-- The concrete future import receipt is protected state, never user activity.
do $$declare original jsonb;changed jsonb;begin
 begin
  original:=pg_temp.capture();
  insert into private_fcf_future_target_release.receipts(competition_id,inventory_key,packet_sha256,packet_text,rollout_text,rollout_sha256,source_fingerprint,cleanup_before_sha256,imported_state_sha256,stage)values(797,'TEST receipt',repeat('a',64),'TEST packet','TEST rollout',repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64),'imported');
  changed:=pg_temp.capture();
  perform pg_temp.projection_assert(changed->>'dependencySnapshotSha256'<>original->>'dependencySnapshotSha256'and changed#>>'{native,dependencies,competitionUserRows}'='0','future import receipt changes protected before-image without user activity');
  raise exception 'EXPECTED ROLLBACK';
 exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;
end$$;
select pg_temp.projection_assert(not has_schema_privilege('service_role','private_fcf_future_target_release','usage')and not has_table_privilege('service_role','private_fcf_future_target_release.receipts','select,insert,update,delete'),'future import receipt private ACL');
-- Every nested read observes the enclosing SQL statement's MVCC snapshot,
-- including inventory, private pricing and classified relation row hashes.
do $$declare v jsonb;begin
 begin
  with first_read as materialized(select pg_temp.capture()p), changed as(update players set value=value+0.5 where id=940000 returning id), second_read as materialized(select pg_temp.capture()p from changed)
  select jsonb_build_object('first',a.p,'second',b.p)into v from first_read a cross join second_read b;
  perform pg_temp.projection_assert(v#>>'{first,dependencySnapshotText}'=v#>>'{second,dependencySnapshotText}','same-statement native/dependency/pricing snapshot');
  raise exception 'EXPECTED ROLLBACK';
 exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;
end$$;
select pg_temp.projection_assert(pg_temp.capture()->>'capturedUTC'<>p->>'capturedUTC'and pg_temp.capture()->>'dependencySnapshotText'=p->>'dependencySnapshotText','capture stamps change outside immutable digests')from projection_baseline;
select pg_temp.changed($command$insert into private_fcf_future_history.cleanup_receipt(singleton,main_commit,policy_hashes,before_sha256,before_image_text,result,after_image)values(true,repeat('a',40),'{}',repeat('b',64),'{"goals":[{"id":990001,"match_id":930000}]}','{}','{}');insert into assist_votes_deleted(id,goal_id,voter_id,deleted_by,reason)values(990002,990001,'33333333-3333-4333-8333-333333333333','test','test')$command$,array['native','dependencies','matches','0','userRows'],1,'removed cleanup goal retains deleted audit association');
-- Exact cached-main Scout event/attendance table definitions (no source data).
select to_regclass('scout.dogodki')is null as missing_event \gset
\if :missing_event
create table scout.dogodki (
  id             bigint generated always as identity primary key,
  team_id        bigint not null references public.teams on delete cascade,
  competition_id bigint not null references public.competitions on delete cascade,
  vrsta          text not null check (vrsta in ('trening', 'prijateljska', 'sestanek', 'drugo')),
  zacetek        timestamptz not null,
  trajanje_min   int not null check (trajanje_min between 15 and 600),
  kraj           text check (char_length(kraj) <= 120),
  opomba         text check (char_length(opomba) <= 500),
  serija         uuid,
  ustvaril       uuid references public.profiles on delete set null,
  created_at     timestamptz not null default now()
);
\endif
select to_regclass('scout.prisotnost')is null as missing_event \gset
\if :missing_event
create table scout.prisotnost (
  dogodek_id bigint not null references scout.dogodki on delete cascade,
  player_id  bigint not null references public.players on delete cascade,
  stanje     text not null check (stanje in ('prisoten', 'opravicen', 'odsoten')),
  oznacil    uuid references public.profiles on delete set null,
  updated_at timestamptz not null default now(),
  primary key (dogodek_id, player_id)
);
\endif

select pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,complete}'='true','exact Scout event catalog delta accepted');
select pg_temp.changed($command$insert into scout.dogodki(id,team_id,competition_id,vrsta,zacetek,trajanje_min)overriding system value values(990100,910000,797,'trening',now(),60);insert into scout.prisotnost(dogodek_id,player_id,stanje)values(990100,940000,'prisoten')$command$,array['native','dependencies','competitionUserRows'],2,'Scout actual target event and attendance');
select pg_temp.changed($command$insert into scout.dogodki(id,team_id,competition_id,vrsta,zacetek,trajanje_min)overriding system value values(990100,910000,797,'trening',now(),60);insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":990100}')$command$,array['native','dependencies','competitionUserRows'],2,'Scout JSON event resolves actual target');
do $$begin begin
 insert into scout.dogodki(id,team_id,competition_id,vrsta,zacetek,trajanje_min)overriding system value select 990100,910000,min(id),'trening',now(),60 from competitions where id<>797;
 insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":990100}');
 perform pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,competitionUserRows}'='0','shared-club event/audit from another actual competition remains unrelated');
 insert into scout.prisotnost(dogodek_id,player_id,stanje)values(990100,940000,'prisoten');
 perform pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,competitionUserRows}'='1','attendance target-player OR target-event association');
 raise exception 'EXPECTED ROLLBACK';exception when raise_exception then if sqlerrm<>'EXPECTED ROLLBACK'then raise;end if;end;end$$;
-- Unrelated orphan audit is never globally attributed to G9 merely for being
-- an orphan; only an actual target-club ambiguity makes completeness unknown.
insert into teams(id,name,short_name,country_id)overriding system value values(919999,'TEST unrelated','TU',(select country_id from competitions where id=797));
insert into scout.narocnine(team_id,country_id,paket,velja_do,pogoji_sprejeti_at)values(919999,(select country_id from competitions where id=797),'preizkus',now()+interval'1 day',now());
insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(919999,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":999999}');
select pg_temp.projection_assert(pg_temp.capture()#>>'{native,dependencies,competitionUserRows}'='0','unrelated orphan/shared club state not global target user activity');
select pg_temp.schema_hold($command$insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":999999}')$command$,'target-club unresolved event association holds');
select pg_temp.schema_hold($command$insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":null,"shrani":true}')$command$,'unresolved event creation audit remains unknown');
select pg_temp.schema_hold($command$insert into scout.dnevnik(team_id,user_id,vrsta,parametri)values(910000,'33333333-3333-4333-8333-333333333333','igralec','{"dogodek":999999,"igralci":[],"selekcija":null,"competition_id":""}')$command$,'empty/null association keys cannot bypass installed-event hold');
select pg_temp.schema_hold('alter table scout.prisotnost add column new_reference bigint','Scout exact shape drift holds');

-- Public wrapper must run in an actual readonly transaction setting. Switching
-- the setting after fixture setup is safe: all fixture writes still roll back.
set local transaction_read_only=on;
set local role service_role;
do $$declare v jsonb;begin v:=public.fcf_future_current_target_projection('es-ct-tercera-g9',array[repeat('a',64)]);perform pg_temp.projection_assert(v#>>'{native,dependencies,complete}'='true','readonly public service projection');end$$;
