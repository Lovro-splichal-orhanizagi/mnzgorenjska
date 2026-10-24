create function pg_temp.fcf_target_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FCF TARGET TEST: %',message;end if;end$$;
select pg_temp.fcf_target_assert(to_regprocedure('public.import_fcf_current_target(text,text)')is not null,'native import wrapper exists');
select pg_temp.fcf_target_assert(to_regprocedure('public.check_fcf_current_target(text,text,boolean)')is not null,'native activation wrapper exists');
select pg_temp.fcf_target_assert(not has_function_privilege('authenticated','public.import_fcf_current_target(text,text)','execute')and not has_function_privilege('anon','public.check_fcf_current_target(text,text,boolean)','execute'),'unprivileged execution denied');
select pg_temp.fcf_target_assert(not has_function_privilege('service_role','private_fcf_target_release.validate(text,text)','execute')and not has_schema_privilege('service_role','private_fcf_target_release','usage'),'service cannot bypass private activation gate');
select pg_temp.fcf_target_assert(has_function_privilege('service_role','public.import_fcf_current_target(text,text)','execute'),'service uses only public bounded wrapper');
do $$begin
 begin perform public.import_fcf_current_target('{"targetSlug":"es-ct-tercera-g2"}',repeat('a',64));raise exception 'accepted G2';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
 begin perform public.get_fcf_current_target_inventory('es-ct-segona-g1',array[]::text[]);raise exception 'accepted non-readonly inventory';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
end$$;
-- Complete canonical imports share one consumed parent but have independent
-- target receipts. Every football row is synthetic and this transaction rolls back.
do $$declare v jsonb;t text;r jsonb;begin
 select rollout into v from fcf_target_packets where slug='es-ct-segona-g1';t:=v::text;r:=public.import_fcf_current_target(t,encode(sha256(convert_to(t,'UTF8')),'hex'));
 perform pg_temp.fcf_target_assert(r->>'stage'='imported'and r->>'normalReports'='8','full G1 native import');
 perform pg_temp.fcf_target_assert((select count(*)from private_fcf_target_release.club_bindings where competition_id=783)=16,'bootstrap14 missing G1 bindings');
 r:=public.import_fcf_current_target(t,encode(sha256(convert_to(t,'UTF8')),'hex'));perform pg_temp.fcf_target_assert(r->>'noOp'='true','exact import replay reads receipt');
end$$;

create function pg_temp.fcf_gate(slug text,activate boolean default false)returns jsonb language plpgsql as $$declare t text;begin select rollout::text into t from fcf_target_packets p where p.slug=fcf_gate.slug;return public.check_fcf_current_target(t,encode(sha256(convert_to(t,'UTF8')),'hex'),activate);end$$;
create function pg_temp.fcf_ready(cid bigint)returns void language plpgsql as $$declare pos text;n int;pid bigint;squad jsonb:='[]';v jsonb;s text;begin
 update players set position=case when reg_st>=100000 then case when reg_st%1000=0 then 'GK'when reg_st%1000 between 1 and 4 or reg_st%1000=200 then 'DEF'when reg_st%1000 between 5 and 8 then 'MID'else 'FWD'end else position end,position_source=case when position='GK'then 'zapisnik'else 'ugibanje'end,value=case when reg_st%1000=2 then 9 else 4 end,value_start=case when reg_st%1000=2 then 9 else 4 end where competition_id=cid;
 for pid in select id from rounds where competition_id=cid loop perform public.recompute_round_scores(pid);end loop;perform public.osvezi_statistiko_igralcev(array(select id from players where competition_id=cid));
 create temporary table if not exists _fcf_test_squad(id bigint primary key,team bigint,position text)on commit drop;truncate _fcf_test_squad;
 for pos,n in select *from(values('GK',2),('DEF',5),('MID',5),('FWD',3))q loop
  for i in 1..n loop
   select p.id into pid from players p where p.competition_id=cid and p.active and p.position=pos and not exists(select 1 from _fcf_test_squad w where w.id=p.id)and(select count(*)from _fcf_test_squad w where w.team=p.team_id)<3 order by p.value,p.id limit 1;
   perform pg_temp.fcf_target_assert(pid is not null,'actual SQL legal15 candidate');insert into _fcf_test_squad select p.id,p.team_id,p.position from players p where p.id=pid;
  end loop;
 end loop;
 select jsonb_agg(jsonb_build_object('id',id)order by id)into squad from _fcf_test_squad;s:=private_fcf_target_release.pricing_snapshot(cid)::text;
 update fcf_target_packets set rollout=jsonb_set(rollout,'{readiness}',jsonb_build_object('modelSha256',repeat('e',64),'pricingSnapshotText',s,'pricingSnapshotSha256',encode(sha256(convert_to(s,'UTF8')),'hex'),'priceVector',(select jsonb_agg(jsonb_build_object('id',p.id,'value',p.value,'value_start',p.value_start,'position',p.position,'position_source',p.position_source)order by p.id)from players p where p.competition_id=cid),'squad',squad))where slug=(select c.slug from competitions c where c.id=cid);
end$$;
create function pg_temp.fcf_target_mutant(command text,label text)returns void language plpgsql as $$begin
 begin execute command;perform pg_temp.fcf_gate('es-ct-segona-g1');raise exception 'FCF TARGET TEST: accepted mutant %',label;
 exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;
end$$;
select pg_temp.fcf_ready(783);
select pg_temp.fcf_target_assert(pg_temp.fcf_gate('es-ct-segona-g1')->>'stage'='checked','full canonical/pricing/source gate passes');
-- Exercise the unchanged production source-deadline guard with the same recent
-- synthetic captures. The failed subtransaction also restores the test setting.
do $$declare before_clock timestamptz:=clock_timestamp();begin
 perform pg_temp.fcf_target_assert(before_clock='2026-10-24T07:30:00Z'::timestamptz,'pinned prelaunch clock reaches the production gate');
 perform pg_temp.fcf_target_assert((select deadline_at from rounds where competition_id=783 and number=6)='2026-10-24T08:00:00Z'::timestamptz,'official source deadline remains unchanged');
 begin
  perform set_config('slff.fcf_target_test_clock','2026-10-24T08:00:01Z',true);
  perform pg_temp.fcf_gate('es-ct-segona-g1');
  raise exception 'FCF TARGET TEST: source deadline accepted after test clock advanced';
 exception when others then
  if sqlerrm<>'FCF_TARGET: source R6 deadline genuinely future' then raise;end if;
 end;
 perform pg_temp.fcf_target_assert(clock_timestamp()=before_clock,'deadline rejection restores prelaunch test clock');
end$$;

select pg_temp.fcf_target_mutant('update players set value=value+0.5 where id=(select min(id)from players where competition_id=783)','price race');
select pg_temp.fcf_target_mutant('update players set position_source=''admin''where id=(select min(id)from players where competition_id=783)','provenance race');
select pg_temp.fcf_target_mutant('update appearances set minute_off=minute_off-1 where id=(select min(a.id)from appearances a join players p on p.id=a.player_id where p.competition_id=783)','native interval drift');
select pg_temp.fcf_target_mutant('delete from player_scores where player_id=(select min(id)from players where competition_id=783 and reg_st>=100000)','missing score cache');
select pg_temp.fcf_target_mutant('update statistika_igralcev set points=points+1 where player_id=(select min(id)from players where competition_id=783 and reg_st>=100000)','derived stats drift');
select pg_temp.fcf_target_mutant('update rounds set lineups_locked_at=clock_timestamp()where competition_id=783 and number=6','locked R6');
select pg_temp.fcf_target_mutant('update rounds set deadline_at=clock_timestamp()-interval''1 hour''where competition_id=783 and number=6','expired R6');
select pg_temp.fcf_target_mutant('create table public.fcf_target_unknown_dependency(appearance_id bigint)','unknown empty reference column');
select pg_temp.fcf_target_mutant('create table public.fcf_target_unknown_fk(app bigint references public.appearances)','unknown empty FK');
select pg_temp.fcf_target_assert(pg_temp.fcf_gate('es-ct-segona-g1',true)->>'active'='true','common same-XID authorization activates G1');
select pg_temp.fcf_target_assert((select recorded_at from private_historical_statistics.release_authorizations where competition_id=783 and authorized_xid=txid_current())=clock_timestamp(),'common authorization shares the pinned test clock');
select pg_temp.fcf_target_assert(pg_temp.fcf_gate('es-ct-segona-g1',true)->>'noOp'='true','activation retry reads committed receipt');
select pg_temp.fcf_target_assert((public.read_fcf_current_target_receipt('es-ct-segona-g1')->>'rolloutText')is not null and(public.read_fcf_current_target_receipt('es-ct-segona-g1')->>'currentActive')='true','committed original envelope permits readback when artifact was lost');
-- Non-target activity after the single all-four cleanup cannot block G9.
insert into auth.users(id,email)values('11111111-1111-4111-8111-111111111111','fcf-synthetic@example.invalid');
insert into profiles(id,display_name)values('11111111-1111-4111-8111-111111111111','Synthetic FCF')on conflict(id)do nothing;
insert into fantasy_teams(owner_id,name,competition_id)values('11111111-1111-4111-8111-111111111111','Synthetic active G1',783);
select pg_temp.fcf_target_assert(public.apply_fcf_current_target_cleanup(repeat('b',40),(select jsonb_object_agg(id,policy_sha256)from private_historical_statistics.policies where document->>'provider'='fcf'and document->>'sourcePolicy'='es-fcf-reviewed-history-v1'),proof->>'beforeSha256',proof->>'beforeImageText')=(select result from private_fcf_target_release.cleanup_receipt),'cleanup lost-response retry returns original SQL receipt after G1 users without reapplying')from fcf_target_cleanup;
select pg_temp.fcf_target_assert((select count(*)from private_fcf_target_release.cleanup_receipt)=1,'all-four cleanup has one immutable SQL result');
do $$declare t text;r jsonb;begin
 select rollout::text into t from fcf_target_packets where slug='es-ct-tercera-g9';r:=public.import_fcf_current_target(t,encode(sha256(convert_to(t,'UTF8')),'hex'));perform pg_temp.fcf_target_assert(r->>'stage'='imported','same-parent G9 import after active G1 users');
end$$;
select pg_temp.fcf_ready(797);
select pg_temp.fcf_target_assert(pg_temp.fcf_gate('es-ct-tercera-g9',true)->>'active'='true','G9 independent activation after G1 activity');
select pg_temp.fcf_target_assert((select count(*)from private_fcf_target_release.club_bindings where competition_id=797)=16,'bootstrap12 missing G9 bindings');
select pg_temp.fcf_target_assert((select count(*)from private_historical_statistics.markers where competition_id in(783,790,797))=4,'exact four markers preserved');
