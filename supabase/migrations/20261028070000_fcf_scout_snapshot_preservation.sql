-- Preserve the reviewed constant fallback snapshots; no Scout rows are written.
-- Versions are timestamped model output, not a claim of historical input independence.
-- The zero-reference case and all other original dependency holds retain their meaning.
create function private_fcf_future_history.scout_snapshot()returns jsonb
language plpgsql security definer set search_path=public,pg_temp set timezone='UTC' as $$
declare t record;a record;q record;found boolean;predicate text;shape jsonb;rows_image jsonb;parents_image jsonb;n int;
begin
 -- Lock the complete original Scout relation scope before the first reference read.
 for t in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='scout'and c.relkind in('r','p')order by c.oid loop
  execute format('lock table %I.%I in share row exclusive mode',t.nspname,t.relname);
 end loop;
 for t in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='scout'and c.relkind in('r','p')order by c.oid loop
  for a in select attname,atttypid from pg_attribute where attrelid=t.oid and attnum>0 and not attisdropped and attname in('player_id','competition_id','team_id','podobni')loop
   predicate:=case a.attname
    when 'competition_id'then 'x.competition_id in(783,790,797)'
    when 'player_id'then 'x.player_id in(select id from public.players where competition_id in(783,790,797))'
    when 'team_id'then 'x.team_id in(select team_id from public.players where competition_id in(783,790,797))'
    when 'podobni'then 'x.podobni && array(select id from public.players where competition_id in(783,790,797))'end;
   perform private_fcf_six_history.require(a.atttypid=case when a.attname='podobni'then 'bigint[]'::regtype else 'bigint'::regtype end,'unreviewed Scout reference type');
   execute format('select exists(select 1 from %I.%I x where %s)',t.nspname,t.relname,predicate)into found;
   if not(t.relname='lige_moc'and a.attname='competition_id')then
    perform private_fcf_six_history.require(not found,'Scout target dependency prevents historical cleanup/restore');
   end if;
  end loop;
 end loop;
 -- Exact reviewed non-partitioned shapes and identity keys, including when empty.
 for q in select *from(values
  ('scout.lige_moc','[["model_id","bigint",true],["competition_id","bigint",true],["moc","double precision",true],["vir","text",true],["prestopov","integer",true],["izracunano_at","timestamp with time zone",true]]'::jsonb),
  ('scout.modeli','[["id","bigint",true],["ustvarjen_at","timestamp with time zone",true],["leto","integer",true],["backtest","jsonb",true],["parametri","jsonb",true],["objavljen","boolean",true]]'::jsonb)
 )v(rel,expected)loop
  perform private_fcf_six_history.require(exists(select 1 from pg_class where oid=to_regclass(q.rel)and relkind='r'and not relispartition)and not exists(select 1 from pg_inherits where inhrelid=to_regclass(q.rel)or inhparent=to_regclass(q.rel)),'unreviewed Scout snapshot relation');
  select jsonb_agg(jsonb_build_array(attname,atttypid::regtype::text,attnotnull)order by attnum)into shape from pg_attribute where attrelid=to_regclass(q.rel)and attnum>0 and not attisdropped;
  perform private_fcf_six_history.require(shape=q.expected,'unreviewed Scout snapshot shape');
 end loop;
 perform private_fcf_six_history.require(
  (select count(*)=1 from pg_constraint where conrelid='scout.lige_moc'::regclass and contype='p'and conkey=array[1,2]::smallint[]and convalidated and not condeferrable and not condeferred)
  and(select count(*)=1 from pg_constraint where conrelid='scout.modeli'::regclass and contype='p'and conkey=array[1]::smallint[]and convalidated and not condeferrable and not condeferred)
  and(select count(*)=1 from pg_constraint where conrelid='scout.lige_moc'::regclass and contype='f')
  and exists(select 1 from pg_constraint where conrelid='scout.lige_moc'::regclass and contype='f'and conkey=array[1]::smallint[]and confrelid='scout.modeli'::regclass and confkey=array[1]::smallint[]and confdeltype='c'and confupdtype='a'and confmatchtype='s'and convalidated and not condeferrable and not condeferred),'unreviewed Scout snapshot keys');
 select coalesce(jsonb_agg(to_jsonb(x)order by to_jsonb(x)::text collate "C"),'[]')into rows_image from scout.lige_moc x where competition_id in(783,790,797);
 n:=jsonb_array_length(rows_image);
 select coalesce(jsonb_agg(to_jsonb(x)order by to_jsonb(x)::text collate "C"),'[]')into parents_image from scout.modeli x where id in(select model_id from scout.lige_moc where competition_id in(783,790,797));
 perform private_fcf_six_history.require(n=0 or(n=9
  and(select count(distinct model_id)=3 and count(distinct competition_id)=3 and bool_and(vir='brez'and prestopov=0 and moc=0 and moc::text not in('NaN','Infinity','-Infinity'))from scout.lige_moc where competition_id in(783,790,797))
  and not exists(select 1 from unnest(array[783,790,797]::bigint[])cid where(select count(*)from scout.lige_moc where competition_id=cid)<>3)
  and jsonb_array_length(parents_image)=3
  and not exists(select 1 from scout.modeli where id in(select model_id from scout.lige_moc where competition_id in(783,790,797))and not objavljen)),'Scout fallback snapshot is not the reviewed zero/nine constant matrix');
 -- Full parent and output rows are hashed, including timestamps and JSON metadata.
 -- Current versions may turn over BETWEEN maintenance transactions. Within either
 -- phase even a valid constant row/parent change must abort the native mutation.
 return jsonb_build_object('rows',n,'rowsSha256',encode(sha256(convert_to(rows_image::text,'UTF8')),'hex'),'modelParentsSha256',encode(sha256(convert_to(parents_image::text,'UTF8')),'hex'));
end$$;

create or replace function private_fcf_future_history.scout_dependencies()returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 perform private_fcf_future_history.scout_snapshot();
end$$;

create or replace function public.fcf_future_historical_six_apply(p_main_sha text,p_policy_hashes jsonb,p_before_sha text,p_before_image_text text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r private_fcf_future_history.cleanup_receipt%rowtype;result jsonb;scout_before jsonb;begin
 perform private_fcf_six_target_release.lock_target(783);lock table private_fcf_future_history.cleanup_receipt in share row exclusive mode;select *into r from private_fcf_future_history.cleanup_receipt;
 if r.singleton then
  perform private_fcf_six_target_release.require(not r.restored,'cleanup already restored');
  perform private_fcf_six_target_release.require(r.main_commit=p_main_sha and r.policy_hashes=p_policy_hashes and r.before_sha256=p_before_sha and r.before_image_text=p_before_image_text,'different already committed cleanup');perform private_fcf_six_target_release.markers();return r.result;
 end if;
 scout_before:=private_fcf_future_history.scout_snapshot();
 result:=private_fcf_future_history.apply_core(p_main_sha,p_policy_hashes,p_before_sha,p_before_image_text);perform private_fcf_six_target_release.markers();
 insert into private_fcf_future_history.cleanup_receipt values(true,p_main_sha,p_policy_hashes,p_before_sha,p_before_image_text,result,private_fcf_six_history.capture(),false);
 perform private_fcf_six_history.require(private_fcf_future_history.scout_snapshot()=scout_before,'Scout snapshots changed during historical cleanup');return result;
end$$;

create or replace function public.fcf_future_historical_six_restore(p_before_sha text)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r private_fcf_future_history.cleanup_receipt%rowtype;image jsonb;tab text;cols text;scout_before jsonb;begin
 perform private_fcf_six_target_release.lock_target(783);lock table private_fcf_future_history.cleanup_receipt in share row exclusive mode;
 select *into r from private_fcf_future_history.cleanup_receipt where before_sha256=p_before_sha;
 perform private_fcf_six_target_release.require(r.singleton,'saved six cleanup receipt required');
 if r.restored then return jsonb_build_object('restored',true,'noOp',true,'beforeSha256',p_before_sha);end if;
 perform private_fcf_six_target_release.require(not exists(select 1 from competitions where id in(783,790,797)and active),'rollback inactive competitions');
 perform private_fcf_six_target_release.no_target_users(783);perform private_fcf_six_target_release.no_target_users(790);perform private_fcf_six_target_release.no_target_users(797);
 perform private_fcf_six_target_release.require(private_fcf_six_history.capture()=r.after_image,'rollback exact post-cleanup beforeimage drift');
 scout_before:=private_fcf_future_history.scout_snapshot();
 image:=r.before_image_text::jsonb;
 insert into private_fcf_six_history.restore_authorizations values(txid_current(),p_before_sha);
 -- Preserve321663: the complete original empty placeholder is restored below.
 delete from private_historical_statistics.markers where competition_id in(783,790,797);
 delete from private_historical_statistics.installed_policies where competition_id in(783,790,797);
 -- Restore complete original rows including IDs; exact after-state comparison above
 -- prevents overwriting a later import, player change, result or user activity.
 foreach tab in array array['competitions','matches']loop
  select string_agg(format('%I=x.%I',a.attname,a.attname),',')into cols from pg_attribute a where a.attrelid=('public.'||tab)::regclass and a.attnum>0 and not a.attisdropped and a.attname<>'id'and a.attgenerated='';
  execute format('update public.%I t set %s from jsonb_populate_recordset(null::public.%I,$1)x where t.id=x.id',tab,cols,tab)using image->tab;
 end loop;
 foreach tab in array array['appearances','goals','player_scores','statistika_igralcev','tocke_krogov']loop
  if tab in('appearances','goals')then execute format('delete from public.%I where match_id in(321646,297199,306164,306166,306171)',tab);
  elsif tab='player_scores'then delete from player_scores where round_id in(28706,27227,27616,27617);
  elsif tab='statistika_igralcev'then delete from statistika_igralcev where player_id in(select id from players where competition_id in(783,790,797));
  else delete from tocke_krogov where round_id in(28706,27227,27616,27617);end if;
  execute format('insert into public.%I overriding system value select *from jsonb_populate_recordset(null::public.%I,$1)',tab,tab)using image->tab;
 end loop;
 update private_historical_statistics.source_club_bindings b set bound_team_id=x.bound_team_id from jsonb_populate_recordset(null::private_historical_statistics.source_club_bindings,image->'bindings')x where b.provider=x.provider and b.source_club_id=x.source_club_id and b.source_category_id=x.source_category_id;
 perform private_fcf_six_target_release.require(private_fcf_six_history.capture()=image-array['schemaVersion','mainCommit','policyHashes'],'rollback exact native readback differs');
 delete from private_fcf_six_history.restore_authorizations where authorized_xid=txid_current();
 update private_fcf_future_history.cleanup_receipt set restored=true where singleton;
 perform private_fcf_six_history.require(private_fcf_future_history.scout_snapshot()=scout_before,'Scout snapshots changed during historical restore');
 return jsonb_build_object('restored',true,'beforeSha256',p_before_sha,'missing4109404',true,'restoredPlaceholderId',321663);
end$$;

revoke all on function private_fcf_future_history.scout_snapshot(),private_fcf_future_history.scout_dependencies()from public,anon,authenticated,service_role;
