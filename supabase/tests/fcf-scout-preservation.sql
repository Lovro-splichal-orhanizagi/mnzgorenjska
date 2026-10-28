-- Synthetic fixture only. The runner encloses migration, DDL and all writes in ROLLBACK.
create function pg_temp.scout_all()returns jsonb language plpgsql set timezone='UTC' as $$declare t record;image jsonb:='{}';rows jsonb;begin
 for t in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='scout'and c.relkind in('r','p')order by c.oid loop
  execute format('select coalesce(jsonb_agg(to_jsonb(x)order by to_jsonb(x)::text collate "C"),''[]'')from %I.%I x',t.nspname,t.relname)into rows;image:=image||jsonb_build_object(t.relname,rows);
 end loop;return image;
end$$;
create temporary table scout_proof as select repeat('a',40)main,(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1')hashes,public.fcf_future_historical_six_prepare(repeat('a',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'sourcePolicy'='es-fcf-six-reviewed-history-v1'))proof;
create function pg_temp.scout_phase(restoring boolean default false)returns jsonb language plpgsql as $$declare p record;begin
 select *into p from scout_proof;if restoring then return public.fcf_future_historical_six_restore(p.proof->>'beforeSha256');end if;
 return public.fcf_future_historical_six_apply(p.main,p.hashes,p.proof->>'beforeSha256',p.proof->>'beforeImageText');
end$$;
create function pg_temp.scout_hold(command text,label text,restoring boolean default false,expected text default 'FCF_HISTORY:')returns void language plpgsql as $$declare football jsonb;scout_rows jsonb;changed boolean:=false;begin
 football:=private_fcf_six_history.capture();scout_rows:=pg_temp.scout_all();
 begin execute command;changed:=true;perform pg_temp.scout_phase(restoring);raise exception 'SCOUT TEST: accepted %',label;
 exception when others then if not changed or position(expected in sqlerrm)=0 then raise;end if;end;
 perform pg_temp.six_assert(private_fcf_six_history.capture()=football and pg_temp.scout_all()=scout_rows,'rejected mutation fully rolls back: '||label);
end$$;
select pg_temp.six_assert(private_fcf_future_history.scout_snapshot()->>'rows'='9','exact nine output snapshot');
-- UTC hashing is independent of session timezone, including parent JSON/timestamps.
create temporary table scout_digest as select private_fcf_future_history.scout_snapshot()image;
set local timezone='Pacific/Honolulu';
select pg_temp.six_assert(private_fcf_future_history.scout_snapshot()=(select image from scout_digest),'UTC deterministic digest');
set local timezone='UTC';
select pg_temp.six_assert(not has_function_privilege('service_role','private_fcf_future_history.scout_snapshot()','execute')and not has_function_privilege('anon','private_fcf_future_history.scout_snapshot()','execute')and not has_function_privilege('authenticated','private_fcf_future_history.scout_snapshot()','execute'),'no new public or service bypass');
select pg_temp.scout_hold('delete from scout.lige_moc where model_id=910000001 and competition_id=783','eight rows');
select pg_temp.scout_hold('update scout.lige_moc set competition_id=999999 where model_id=910000001 and competition_id=783','incomplete matrix');
select pg_temp.scout_hold('update scout.lige_moc set moc=0.1 where model_id=910000001 and competition_id=783','nonzero strength');
select pg_temp.scout_hold('update scout.lige_moc set moc=''NaN'' where model_id=910000001 and competition_id=783','NaN strength');
select pg_temp.scout_hold('update scout.lige_moc set moc=''Infinity'' where model_id=910000001 and competition_id=783','infinite strength');
select pg_temp.scout_hold('update scout.lige_moc set vir=''piramida'' where model_id=910000001 and competition_id=783','other source');
select pg_temp.scout_hold('update scout.lige_moc set prestopov=1 where model_id=910000001 and competition_id=783','positive sample');
select pg_temp.scout_hold('update scout.modeli set objavljen=false where id=910000001','unpublished parent');
select pg_temp.scout_hold('alter table scout.lige_moc drop constraint lige_moc_model_id_fkey','missing model FK');
select pg_temp.scout_hold('alter table scout.modeli disable trigger all;delete from scout.modeli where id=910000001','orphan model parent');
select pg_temp.scout_hold('alter table scout.lige_moc drop constraint lige_moc_pkey','missing matrix primary key');
select pg_temp.scout_hold('alter table scout.lige_moc add column unreviewed text','unreviewed allowed shape');
select pg_temp.scout_hold('alter table scout.modeli add column unreviewed text','unreviewed parent shape');
-- The allowed matrix cannot silently acquire a fourth version.
select pg_temp.scout_hold($cmd$insert into scout.modeli(id,leto,backtest,parametri,objavljen)overriding system value values(910000004,2026,'{}','{}',true);insert into scout.lige_moc select 910000004,competition_id,moc,vir,prestopov,izracunano_at from scout.lige_moc where model_id=910000001$cmd$,'twelve rows/four parents');
-- All other original Scout scalar/array and exact-type guards still apply.
select pg_temp.scout_hold($cmd$insert into scout.indeks(model_id,player_id,skupina,indeks,percentil,zaupanje)select 910000001,min(id),'MID',1,1,1 from players where competition_id=797$cmd$,'derived player reference');
select pg_temp.scout_hold($cmd$insert into scout.vektorji(model_id,player_id,skupina,vektor,podobni,podobnost)select 910000001,999999999,'MID',array[1.0],array[min(id)],array[1.0]from players where competition_id=797$cmd$,'reverse-only similarity');
select pg_temp.scout_hold('create table scout.new_target_reference(competition_id bigint);insert into scout.new_target_reference values(783)','new positive Scout relation');
select pg_temp.scout_hold('create table scout.new_type_reference(player_id text)','unreviewed reference type even empty');
select pg_temp.scout_hold('create table public.new_goal_dependency(goal_id bigint)','original individual reference gate',false,'FCF_TARGET: unreviewed individual reference column');
-- A complete set of unrelated private Scout records must survive native phases.
insert into competitions(id,slug,name,short_name,source,country_id)overriding system value values(919999,'test-scout-unrelated','Synthetic unrelated','TSU','fcf',(select id from countries where code='ES'));
insert into teams(id,name,short_name,country_id)overriding system value values(919999,'Synthetic unrelated club','TSU',(select id from countries where code='ES'));
insert into players(id,competition_id,team_id,first_name,last_name,position)overriding system value values(919999,919999,919999,'Synthetic','Unrelated','MID');
insert into auth.users(id,email)values('55555555-5555-4555-8555-555555555555','scout-preservation@example.invalid');
insert into scout.narocnine(team_id,country_id,paket,obdobje,velja_do,pogoji_sprejeti_at,stripe_customer_id,stripe_subscription_id)values(919999,(select id from countries where code='ES'),'klub','mesec',now()+interval'30 days',now(),'synthetic-customer','synthetic-subscription');
insert into scout.sedezi(user_id,team_id)values('55555555-5555-4555-8555-555555555555',919999);
insert into scout.opazovani(team_id,player_id,dodal)values(919999,919999,'55555555-5555-4555-8555-555555555555');
insert into scout.ugovori(player_id,kljuc)values(919999,repeat('a',64));
insert into scout.privolitve(player_id,letnik,kontakt_dovoljen)values(919999,1990,true);
insert into scout.dnevnik(team_id,user_id,vrsta,player_id,parametri)values(919999,'55555555-5555-4555-8555-555555555555','igralec',919999,'{"igralci":[919999]}');
insert into scout.dogodki(id,team_id,competition_id,vrsta,zacetek,trajanje_min,kraj,opomba)overriding system value values(919999,919999,919999,'trening',now(),60,'Synthetic private place','Synthetic private notes');
insert into scout.prisotnost(dogodek_id,player_id,stanje)values(919999,919999,'prisoten');
select pg_temp.scout_hold($cmd$insert into scout.narocnine(team_id,country_id,paket,velja_do,pogoji_sprejeti_at)values(8574,(select id from countries where code='ES'),'preizkus',now()+interval'1 day',now())$cmd$,'target subscription hold');
select pg_temp.scout_hold($cmd$insert into scout.opazovani(team_id,player_id)select 919999,min(id)from players where competition_id=783$cmd$,'target watchlist hold');
select pg_temp.scout_hold($cmd$insert into scout.ugovori(player_id,kljuc)select min(id),repeat('b',64)from players where competition_id=783$cmd$,'target privacy hold');
select pg_temp.scout_hold($cmd$insert into scout.privolitve(player_id,letnik)select min(id),1990 from players where competition_id=783$cmd$,'target consent hold');
select pg_temp.scout_hold($cmd$insert into scout.dnevnik(team_id,vrsta)values(8574,'igralec')$cmd$,'target team audit hold');
select pg_temp.scout_hold($cmd$insert into scout.dogodki(team_id,competition_id,vrsta,zacetek,trajanje_min)values(919999,783,'trening',now(),60)$cmd$,'target calendar hold');
select pg_temp.scout_hold($cmd$insert into scout.prisotnost(dogodek_id,player_id,stanje)select 919999,min(id),'prisoten'from players where competition_id=783$cmd$,'target attendance hold');
-- Phase mutations preserve the valid matrix, so only full-row/parent equality catches them.
create function pg_temp.change_strength()returns trigger language plpgsql as $$begin update scout.lige_moc set izracunano_at=izracunano_at+interval'1 second'where model_id=910000001;return null;end$$;
create function pg_temp.change_parent()returns trigger language plpgsql as $$begin update scout.modeli set parametri='{"synthetic":"changed within phase"}'where id=910000001;return null;end$$;
select pg_temp.scout_hold('create trigger synthetic_strength_change after delete on public.goals for each statement execute function pg_temp.change_strength()','apply strength trigger rollback',false,'Scout snapshots changed during historical cleanup');
select pg_temp.scout_hold('create trigger synthetic_parent_change after insert on private_fcf_future_history.cleanup_receipt for each statement execute function pg_temp.change_parent()','apply final receipt trigger rollback',false,'Scout snapshots changed during historical cleanup');
-- Preparation does not freeze model snapshots across transactions: current metadata is preserved.
update scout.modeli set parametri='{"synthetic":"periodic turnover after prepare"}'where id=910000001;
create temporary table scout_before_apply as select pg_temp.scout_all()image;
create temporary table scout_applied as select pg_temp.scout_phase()result;
select pg_temp.six_assert(pg_temp.scout_all()=(select image from scout_before_apply),'all Scout rows survive cleanup');
select pg_temp.six_assert(result->>'schemaVersion'='3'and result->>'removedAppearances'='157'and result->>'removedGoals'='18'and result->>'unavailableMatches'='6','closed schema3 result preserved')from scout_applied;
select pg_temp.six_assert(pg_temp.scout_phase()=(select result from scout_applied),'unchanged idempotent apply');
select pg_temp.scout_hold('create trigger synthetic_strength_change after insert on public.goals for each statement execute function pg_temp.change_strength()','restore strength trigger rollback',true,'Scout snapshots changed during historical restore');
select pg_temp.scout_hold('create trigger synthetic_parent_change after update on private_fcf_future_history.cleanup_receipt for each statement execute function pg_temp.change_parent()','restore final receipt trigger rollback',true,'Scout snapshots changed during historical restore');
select pg_temp.six_assert((select not restored from private_fcf_future_history.cleanup_receipt),'failed restore does not mark receipt restored');
-- Simulate normal version turnover: restore protects CURRENT versions, not historical receipt versions.
delete from scout.lige_moc where model_id between 910000001 and 910000003;
delete from scout.modeli where id between 910000001 and 910000003;
insert into scout.modeli(id,leto,backtest,parametri,objavljen)overriding system value select n,2026,'{}','{"synthetic":"current replacement"}',true from generate_series(910000011,910000013)n;
insert into scout.lige_moc(model_id,competition_id,moc,vir,prestopov,izracunano_at)select id,cid,0,'brez',0,now() from scout.modeli cross join unnest(array[783,790,797]::bigint[])cid where id between 910000011 and 910000013;
select pg_temp.six_assert(pg_temp.scout_phase()=(select result from scout_applied),'apply readback does not require obsolete snapshots');
create temporary table scout_before_restore as select pg_temp.scout_all()image;
select pg_temp.scout_phase(true);
select pg_temp.six_assert(pg_temp.scout_all()=(select image from scout_before_restore),'current full Scout rows survive restore unchanged');
select pg_temp.six_assert(private_fcf_six_history.capture()=(proof->'beforeImage')-array['schemaVersion','mainCommit','policyHashes'],'native restore exact original image')from scout_proof;
select pg_temp.six_assert(pg_temp.scout_phase(true)->>'noOp'='true','restore no-op unchanged');
