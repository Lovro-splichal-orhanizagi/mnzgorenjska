-- Appended to the actual complete DFB fixture after its native activation.
-- No trigger bypass or historical-policy waiver. All changes roll back.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
-- Old, already identified report: the existing seven-day grace must not close it.
update matches set played_on=current_date-30 where id=(select m.id from matches m join rounds r on r.id=m.round_id join competitions c on c.id=r.competition_id where c.slug=current_setting('slff.test_slug')and r.season='2026/27'and r.number=2 order by m.id limit 1);
create temporary table pending_case as
 select m.id mid,m.round_id rid,c.id cid,c.source_league_code code,m.zapisnik_id report,
 jsonb_build_object('id',substring(m.zapisnik_id from 8),'sezona',r.season,'krog',r.number,'datum',m.played_on,'ura','18:00','domaci',h.name,'gostje',a.name,'domaciId','home','gostjeId','away',
 'url','https://datencenter.dfb.de/datencenter/'||c.source_league_code||'/'||r.number||'-spieltag/home-away-'||substring(m.zapisnik_id from 8),'izid',jsonb_build_object('domaci',m.home_goals,'gostje',m.away_goals)) f,
 'retained rejected original bytes'::text raw
 from matches m join rounds r on r.id=m.round_id join competitions c on c.id=r.competition_id join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id
 where c.slug=current_setting('slff.test_slug')and r.season='2026/27'and r.number=2 order by m.id limit 1;
update matches m set source_url=p.f->>'url'from pending_case p where m.id=p.mid;
create temporary table pending_before as select to_jsonb(a) image from appearances a join pending_case p on a.match_id=p.mid;
create function pg_temp.mark_pending(patch jsonb default '{}')returns jsonb language sql as $$
 select public.mark_dfb_report_pending(cid,code,f||patch,'DFB_INVALID_REPORT','test rejected source fact',encode(extensions.digest(raw,'sha256'),'hex'),encode(convert_to(raw,'UTF8'),'base64'),clock_timestamp())from pending_case;
$$;
create function pg_temp.pending_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is not true then raise exception 'DFB pending regression: %',message;end if;end$$;
select pg_temp.pending_assert(not has_function_privilege('anon','public.mark_dfb_report_pending(bigint,text,jsonb,text,text,text,text,timestamptz)','execute')and not has_function_privilege('authenticated','public.complete_dfb_pending_report(bigint,text,bigint,text,text,text[])','execute'),'service grants');
-- Build a real owner/lineup/mini-league so both public completion consumers execute.
insert into auth.users(id,email)values('df000000-0000-4000-8000-000000000026','dfb-pending@example.invalid');
insert into profiles(id,display_name)values('df000000-0000-4000-8000-000000000026','DFB pending fixture')on conflict(id)do nothing;
insert into fantasy_teams(owner_id,name,competition_id,created_at)select'df000000-0000-4000-8000-000000000026','DFB pending fixture',cid,now()-interval '30 days'from pending_case;
insert into fantasy_lineups(round_id,fantasy_team_id,player_id,is_starter,position)
 select p.rid,t.id,min(a.player_id),true,'GK'from pending_case p join fantasy_teams t on t.competition_id=p.cid and t.owner_id='df000000-0000-4000-8000-000000000026'join appearances a on a.match_id=p.mid group by p.rid,t.id;
insert into mini_lige(name,code,owner_id)values('DFB pending fixture','DFBPEND26','df000000-0000-4000-8000-000000000026');
insert into mini_liga_clani select l.id,t.id,now()from mini_lige l cross join fantasy_teams t where l.code='DFBPEND26'and t.owner_id='df000000-0000-4000-8000-000000000026';
update competitions set prvi_fantasy_krog=1 where id=(select cid from pending_case);
select public.recompute_round_scores(rid)from pending_case;
select public.osvezi_tocke_krogov(array[rid])from pending_case;
select pg_temp.pending_assert(exists(select 1 from public.koncani_krogi_mini_lige((select id from mini_lige where code='DFBPEND26'))k join pending_case p on k.round_id=p.rid),'baseline mini completion');
select pg_temp.pending_assert(exists(select 1 from public.tedenski_pregled_ekip((select cid from pending_case))w join pending_case p on w.round_id=p.rid),'baseline weekly email');
-- Mismatched native fixture/header must never mark any match.
do $$declare patch jsonb; begin
 foreach patch in array array[jsonb_build_object('id','999999999'),jsonb_build_object('datum','2000-01-01'),jsonb_build_object('sezona','2025/26'),jsonb_build_object('domaci','unmatched'),jsonb_build_object('url','https://evil.example/report')]loop
  begin perform pg_temp.mark_pending(patch);raise exception 'accepted wrong fixture';exception when others then if sqlerrm='accepted wrong fixture'then raise;end if;end;
 end loop;
end$$;
select pg_temp.pending_assert(not exists(select 1 from private_dfb_pending.pending),'bad fixture wrote nothing');
select pg_temp.mark_pending();
select pg_temp.pending_assert((select imported_at is null from matches where id=(select mid from pending_case)),'pending clears completeness timestamp');
select pg_temp.pending_assert((select count(*)from appearances where match_id=(select mid from pending_case))=(select count(*)from pending_before),'old appearances retained');
select pg_temp.pending_assert(not exists((select to_jsonb(a)from appearances a where match_id=(select mid from pending_case))except(select image from pending_before)),'old appearance bytes retained');
select pg_temp.pending_assert(not exists(select 1 from public.koncani_krogi_mini_lige((select id from mini_lige where code='DFBPEND26'))k join pending_case p on k.round_id=p.rid),'pending mini completion blocked');
select pg_temp.pending_assert(not exists(select 1 from public.tedenski_pregled_ekip((select cid from pending_case))w join pending_case p on w.round_id=p.rid),'pending weekly email blocked');
-- Provisional score recompute remains functional; good siblings are not frozen.
select public.recompute_round_scores(rid)from pending_case;
select pg_temp.pending_assert(exists(select 1 from player_scores ps join pending_case p on ps.round_id=p.rid),'provisional score data preserved');
-- Existing NULL-import club guard and new historical-appearance guard both apply.
select pg_temp.pending_assert(not exists(select 1 from public.preracunaj_cene((select rid from pending_case))x join players pl on pl.id=x.igralec join matches m on m.id=(select mid from pending_case)where pl.team_id in(m.home_team_id,m.away_team_id)),'pending club market waits');
create temporary table transferred_pending as select a.player_id from appearances a where a.match_id=(select mid from pending_case)limit 1;
update players set team_id=(select id from de_clubs where n=10)where id=(select player_id from transferred_pending);
select pg_temp.pending_assert(not exists(select 1 from public.preracunaj_cene((select rid from pending_case))x join transferred_pending p on p.player_id=x.igralec),'transferred pending participant market waits');
-- Pending never ages out; old fixtures with retained report IDs stay unresolved.
-- Advance only the marker timestamp's age, not the bound fixture identity.
update private_dfb_pending.pending set observed_at=clock_timestamp()-interval '30 days',next_retry_at=clock_timestamp()-interval '29 days'where match_id=(select mid from pending_case);
select pg_temp.pending_assert(not exists(select 1 from public.koncani_krogi_mini_lige((select id from mini_lige where code='DFBPEND26'))k join pending_case p on k.round_id=p.rid),'pending does not age out at seven days');
update matches set imported_at=clock_timestamp(),import_warnings='{}'where id=(select mid from pending_case);
select pg_temp.pending_assert((select imported_at is null from matches where id=(select mid from pending_case)),'manual timestamp cannot clear pending');
-- A failed resolution must retain marker and NULL completeness (atomic rollback).
create function pg_temp.fail_pending_recompute()returns trigger language plpgsql as $$begin raise exception 'injected recompute failure';end$$;
create trigger pending_test_failure before insert or update on public.player_scores for each row execute function pg_temp.fail_pending_recompute();
do $$begin begin
 perform public.complete_dfb_pending_report(cid,code,mid,report,encode(extensions.digest(raw,'sha256'),'hex'),'{}')from pending_case;
 raise exception 'unexpected successful resolution';
 exception when others then if sqlerrm not like '%injected recompute failure%'then raise;end if;end;
end$$;
drop trigger pending_test_failure on public.player_scores;
select pg_temp.pending_assert(exists(select 1 from private_dfb_pending.pending)and(select imported_at is null from matches where id=(select mid from pending_case)),'failed resolution retains pending/timestamp');
select public.complete_dfb_pending_report(cid,code,mid,report,encode(extensions.digest(raw,'sha256'),'hex'),'{}')from pending_case;
select pg_temp.pending_assert(not exists(select 1 from private_dfb_pending.pending)and(select imported_at is not null from matches where id=(select mid from pending_case)),'success atomically resolves pending');
select pg_temp.pending_assert(exists(select 1 from private_dfb_pending.evidence),'original evidence survives resolution');
select pg_temp.pending_assert(exists(select 1 from public.koncani_krogi_mini_lige((select id from mini_lige where code='DFBPEND26'))k join pending_case p on k.round_id=p.rid),'resolved mini completion resumes');
select pg_temp.pending_assert(exists(select 1 from public.tedenski_pregled_ekip((select cid from pending_case))w join pending_case p on w.round_id=p.rid),'resolved weekly email resumes');
rollback;
