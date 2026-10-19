create function pg_temp.fcf_ready(cid bigint)returns void language plpgsql as $$declare pos text;n int;pid bigint;squad jsonb:='[]';v jsonb;s text;begin
 update players set position=case when reg_st>=100000 then case when reg_st%1000=0 then 'GK'when reg_st%1000 between 1 and 4 or reg_st%1000=200 then 'DEF'when reg_st%1000 between 5 and 8 then 'MID'else 'FWD'end else position end,position_source=case when position='GK'then 'zapisnik'else 'ugibanje'end,value=case when reg_st%1000=2 then 9 else 4 end,value_start=case when reg_st%1000=2 then 9 else 4 end where competition_id=cid;
 for pid in select id from rounds where competition_id=cid loop perform public.recompute_round_scores(pid);end loop;perform public.osvezi_statistiko_igralcev(array(select id from players where competition_id=cid));
 create temporary table if not exists _fcf_test_squad(id bigint primary key,team bigint,position text)on commit drop;truncate _fcf_test_squad;
 for pos,n in select *from(values('GK',2),('DEF',5),('MID',5),('FWD',3))q loop
  for i in 1..n loop
   select p.id into pid from players p where p.competition_id=cid and p.active and p.position=pos and not exists(select 1 from _fcf_test_squad w where w.id=p.id)and(select count(*)from _fcf_test_squad w where w.team=p.team_id)<3 order by p.value,p.id limit 1;
   perform pg_temp.six_assert(pid is not null,'actual SQL legal15 candidate');insert into _fcf_test_squad select p.id,p.team_id,p.position from players p where p.id=pid;
  end loop;
 end loop;
 select jsonb_agg(jsonb_build_object('id',id)order by id)into squad from _fcf_test_squad;s:=private_fcf_six_target_release.pricing_snapshot(cid)::text;
 update fcf_target_packets set rollout=jsonb_set(rollout,'{readiness}',jsonb_build_object('modelSha256',repeat('e',64),'pricingSnapshotText',s,'pricingSnapshotSha256',encode(sha256(convert_to(s,'UTF8')),'hex'),'priceVector',(select jsonb_agg(jsonb_build_object('id',p.id,'value',p.value,'value_start',p.value_start,'position',p.position,'position_source',p.position_source)order by p.id)from players p where p.competition_id=cid),'squad',squad))where slug=(select c.slug from competitions c where c.id=cid);
end$$;

create function pg_temp.six_gate(activate boolean default false)returns jsonb language plpgsql as $$declare t text;begin select rollout::text into t from fcf_target_packets;return public.fcf_six_current_target_check(t,encode(sha256(convert_to(t,'UTF8')),'hex'),activate);end$$;
do $$declare t text;r jsonb;begin
 select rollout::text into t from fcf_target_packets;r:=public.fcf_six_current_target_import(t,encode(sha256(convert_to(t,'UTF8')),'hex'));perform pg_temp.six_assert(r->>'stage'='imported','six full G9 native import without fullG1');
 perform pg_temp.six_assert(public.fcf_six_current_target_import(t,encode(sha256(convert_to(t,'UTF8')),'hex'))->>'noOp'='true','import replay');
end$$;
do $$declare t text;begin select rollout::text into t from fcf_target_packets;begin perform public.import_fcf_current_target(t,encode(sha256(convert_to(t,'UTF8')),'hex'));raise exception 'SIX TEST: old API accepted six packet';exception when others then if sqlerrm not like 'FCF_TARGET:%'then raise;end if;end;end$$;
select pg_temp.fcf_ready(797);
select pg_temp.six_assert(pg_temp.six_gate()->>'stage'='checked','six full native vector/legal15/futuredeadline passes');
create function pg_temp.six_release_mutant(command text,label text)returns void language plpgsql as $$begin
 begin execute command;perform pg_temp.six_gate();raise exception 'SIX TEST: accepted %',label;exception when others then if sqlerrm not like 'FCF_TARGET:%'and sqlerrm not like 'HISTORICAL_POLICY:%'then raise;end if;end;
end$$;
select pg_temp.six_release_mutant('update players set value=value+0.5 where id=(select min(id)from players where competition_id=797)','pricing drift');
select pg_temp.six_release_mutant('update rounds set lineups_locked_at=clock_timestamp()where competition_id=797 and number=6','locked officialR6');
select pg_temp.six_release_mutant('update rounds set deadline_at=clock_timestamp()-interval''1 hour''where competition_id=797 and number=6','expired officialR6');
select pg_temp.six_release_mutant('update players set anonimiziran_at=clock_timestamp()where id=(select min(id)from players where competition_id=797)','privacy suppression');
select pg_temp.six_assert(pg_temp.six_gate(true)->>'active'='true','six sameTX activation');
select pg_temp.six_assert(pg_temp.six_gate(true)->>'noOp'='true','activation receipt replay');
select pg_temp.six_assert(public.fcf_six_current_target_receipt('es-ct-tercera-g9')->>'currentActive'='true','six release readback');
select pg_temp.six_assert((select not active from competitions where id=783)and(select count(*)from rounds where competition_id=783)<30,'G1 stays inactive partialcalendar');
