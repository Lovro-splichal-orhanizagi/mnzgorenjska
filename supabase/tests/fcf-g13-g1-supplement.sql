-- Test-only metadata and preflight guard probes; synthetic marker/receipt data.
-- Caller owns a READ COMMITTED transaction and explicitly ROLLBACKs all DDL/DML.
do $$declare missing jsonb;extra jsonb;begin
 select jsonb_agg(jsonb_build_array(j->>'rel',j->>'col',j->>'target')) into missing
 from jsonb_array_elements(pg_temp.g13_catalog())j
 where not exists(select 1 from g13_refs f where (f.rel,f.col,f.target)=(j->>'rel',j->>'col',j->>'target'));
 select jsonb_agg(to_jsonb(f)) into extra from g13_refs f where not exists(
 select 1 from jsonb_array_elements(pg_temp.g13_catalog())j where(f.rel,f.col,f.target)=(j->>'rel',j->>'col',j->>'target'));
 if missing is not null or extra is not null then raise exception 'TEST actual FK registry mismatch: missing %, extra %',missing,extra;end if;
 perform pg_temp.g13_assert(not exists(select 1 from jsonb_array_elements(pg_temp.g13_catalog())j where j->>'single'<>'true' or j->>'validated'<>'true' or j->>'deferred'<>'false'),'unsupported FK shape');
 if exists(select 1 from g13_refs where rel='private_fcf_g1_supplement.receipts')then raise exception 'TEST receipt FK is private, not a root FK';end if;
 perform pg_temp.fcf_g13_repair(false,null);
end$$;
select jsonb_build_object('actualSupplementalRootFKs',(select jsonb_agg(j order by j->>'col')from jsonb_array_elements(pg_temp.g13_catalog())j where j->>'rel'='private_fcf_g1_supplement.markers'),'actualReceiptFK',(select pg_get_constraintdef(oid)from pg_constraint where conrelid='private_fcf_g1_supplement.receipts'::regclass and contype='f'));
select 'PASS actual catalog equality and empty supplemental references';

create function pg_temp.g13_supplement_snapshot() returns jsonb language sql as $$
 select jsonb_build_object('markers',(select jsonb_agg(to_jsonb(m)order by match_id)from private_fcf_g1_supplement.markers m),'receipts',(select jsonb_agg(to_jsonb(r)order by match_id)from private_fcf_g1_supplement.receipts r),'matches',(select jsonb_agg(to_jsonb(m)order by id)from matches m));
$$;
-- Clone contains only the committed old G13 fixture. Add one unrelated ordinary
-- fixture using explicitly synthetic negative identities, all rolled back.
insert into competitions(id,slug,name,short_name,country_id,source,source_league_code,active)overriding system value values(-613000,'g13-supplement-test-only','TEST ONLY','TEST',(select id from countries where code='ES'),'fcf','TEST ONLY',false);
insert into teams(id,name,short_name,country_id)overriding system value values(-613001,'G13 SUPPLEMENT TEST HOME','TEST',(select id from countries where code='ES')),(-613002,'G13 SUPPLEMENT TEST AWAY','TEST',(select id from countries where code='ES'));
insert into rounds(id,competition_id,season,number,deadline_at,played_on)overriding system value values(-613003,-613000,'2026/27',1,'2030-01-01T12:00Z','2026-10-04');
insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value values(-613004,-613003,-613001,-613002,'2026-10-04');
create temporary table g13_outside as select m.* from matches m join rounds r on r.id=m.round_id where r.competition_id<>801 and m.home_team_id not in(8371,10388)and m.away_team_id not in(8371,10388)order by m.id limit 1;
do $$begin if(select count(*)from g13_outside)<>1 then raise exception 'TEST existing unrelated fixture required';end if;end$$;
create function pg_temp.g13_supplement_insert(which text)returns void language plpgsql as $$
declare m matches%rowtype;begin
 select *into strict m from g13_outside;
 insert into private_fcf_g1_supplement.markers(match_id,round_id,home_team_id,away_team_id,binding,before_image_text,before_sha256,authorized_xid)
 values(case when which='match_id'then 427263 else m.id end,case when which='round_id'then(select min(id)from rounds where competition_id=801)else m.round_id end,case when which='home_team_id'then 8371 else m.home_team_id end,case when which='away_team_id'then 8371 else m.away_team_id end,'{"testOnly":true}','{}',encode(sha256(convert_to('{}','UTF8')),'hex'),txid_current());
 insert into private_fcf_g1_supplement.receipts(match_id,after_image,receipt)select match_id,'{"testOnly":true}','{"testOnly":true}'from private_fcf_g1_supplement.markers;
end$$;
do $$declare old jsonb;installed jsonb;col text;begin
 old:=pg_temp.g13_supplement_snapshot();
 begin
  perform pg_temp.g13_supplement_insert('outside');installed:=pg_temp.g13_supplement_snapshot();
  perform pg_temp.fcf_g13_repair(false,null);
  if installed<>pg_temp.g13_supplement_snapshot()then raise exception 'TEST outside marker/receipt afterimages changed';end if;
  raise exception using errcode='P9998',message='rollback outside probe';
 exception when sqlstate 'P9998'then null;end;
 if old<>pg_temp.g13_supplement_snapshot()then raise exception 'TEST outside probe not rolled back';end if;
 foreach col in array array['match_id','round_id','home_team_id','away_team_id']loop
  begin
   perform pg_temp.g13_supplement_insert(col);installed:=pg_temp.g13_supplement_snapshot();
   begin
    perform pg_temp.fcf_g13_repair(false,null);
    raise exception 'TEST affected supplemental % reference accepted',col;
   exception when others then if SQLERRM<>'G13: historical state present'then raise;end if;end;
   if installed<>pg_temp.g13_supplement_snapshot()then raise exception 'TEST rejected preflight changed marker/receipt or match';end if;
   raise exception using errcode='P9998',message='rollback affected probe';
  exception when sqlstate 'P9998'then null;end;
  if old<>pg_temp.g13_supplement_snapshot()then raise exception 'TEST affected probe not rolled back';end if;
 end loop;
 begin
  create table public.g13_supplement_unknown_fk(match_id bigint references matches(id));
  begin
   perform pg_temp.fcf_g13_repair(false,null);raise exception 'TEST unknown FK accepted';
  exception when others then if SQLERRM<>'G13: unknown or missing FK'then raise;end if;end;
  raise exception using errcode='P9998',message='rollback unknown FK probe';
 exception when sqlstate 'P9998'then null;end;
 if to_regclass('public.g13_supplement_unknown_fk')is not null or old<>pg_temp.g13_supplement_snapshot()then raise exception 'TEST unknown FK probe not rolled back';end if;
end$$;
select 'PASS outside references unchanged; four affected references held and rolled back; unknown FK held and rolled back';
select 'G13_SUPPLEMENT_COMPAT_PASS';
