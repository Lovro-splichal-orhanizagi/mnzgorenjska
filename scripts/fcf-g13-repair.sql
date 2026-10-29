-- One-use, session-local helpers. Caller starts READ COMMITTED, loads the immutable
-- plan and FK registry into g13_input, and COMMITs apply / ROLLBACKs preview.
-- No persistent function, migration, disabled trigger or production preview DML.
create temporary table g13_ids(kind text,id bigint,primary key(kind,id)) on commit drop;
create temporary table g13_refs(rel text,col text,target text,primary key(rel,col,target)) on commit drop;
insert into g13_refs select j->>0,j->>1,j->>2 from g13_input,jsonb_array_elements(fks)j;
create temporary table g13_queries(key text primary key,rel text,predicate text) on commit drop;

create function pg_temp.g13_normalize(rel text,j jsonb) returns jsonb language plpgsql stable as $$
declare col text;
begin
 if rel='public.teams' and j->>'id'='10388' then return null; end if;
 if rel='public.matches' and exists(select 1 from g13_input,jsonb_array_elements(plan->'drop')d where d->>'id'=j->>'id') then return null;end if;
 if rel in ('public.players','public.appearances','public.goals') and j->>'team_id'='10388' then j:=j||'{"team_id":8371}'::jsonb;end if;
 if rel='public.matches' then
  foreach col in array array['home_team_id','away_team_id'] loop
   if j->>col='10388' then j:=jsonb_set(j,array[col],'8371');end if;
  end loop;
 end if;
 -- Recompute triggers may only alter this bookkeeping timestamp. Every score,
 -- statistic, row identity and other timestamp remains protected.
 if rel='public.player_scores' then j:=j-'computed_at';end if;
 return j;
end $$;
create function pg_temp.g13_capture(protected boolean default false) returns jsonb language plpgsql as $$
declare q record; rows jsonb; result jsonb:='{}'; expr text;
begin
 for q in select * from g13_queries order by key collate "C" loop
  expr:=case when protected then format('pg_temp.g13_normalize(%L,to_jsonb(t))',q.rel) else 'to_jsonb(t)' end;
  execute format('select coalesce(jsonb_agg(j order by j::text collate "C"),''[]''::jsonb) from (select %s j from %s t where %s) s where j is not null',expr,q.rel,q.predicate) into rows;
  result:=result||jsonb_build_object(q.key,rows);
 end loop;
 return result;
end $$;
create function pg_temp.g13_assert(ok boolean,reason text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'G13: %',reason;end if;end $$;

create function pg_temp.g13_catalog() returns jsonb language sql as $$
 select coalesce(jsonb_agg(jsonb_build_object('rel',ns.nspname||'.'||t.relname,'col',a.attname,'target',parent.relname,
   'definition',pg_get_constraintdef(c.oid),'single',cardinality(c.conkey)=1 and cardinality(c.confkey)=1 and pa.attname='id',
   'validated',c.convalidated,'deferred',c.condeferrable) order by ns.nspname,t.relname,a.attname),'[]')
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace
 join pg_class parent on parent.oid=c.confrelid join pg_namespace pn on pn.oid=parent.relnamespace
 left join pg_attribute a on a.attrelid=t.oid and a.attnum=c.conkey[1]
 left join pg_attribute pa on pa.attrelid=parent.oid and pa.attnum=c.confkey[1]
 where c.contype='f' and pn.nspname='public' and parent.relname in('competitions','rounds','teams','players','matches','appearances','goals');
$$;

create function pg_temp.fcf_g13_repair(do_apply boolean,approved text) returns jsonb language plpgsql as $$
declare p jsonb; fk record; q record; n bigint; all_before jsonb; protected_before jsonb; all_after jsonb;
 catalog jsonb; digest text; result jsonb; counts jsonb; actual jsonb; expected jsonb;
begin
 perform pg_temp.g13_assert(current_setting('transaction_isolation')='read committed','READ COMMITTED required');
 perform pg_temp.g13_assert(do_apply is not null and (not do_apply or approved ~ '^[a-f0-9]{64}$'),'explicit apply digest required');
 select plan into strict p from g13_input;
 perform pg_temp.g13_assert(p->>'competition'='801' and p->>'drop_team'='10388' and p->>'keep_team'='8371','fixed scope required');
 -- SUE prevents concurrent ALTER/ADD FK while permitting unrelated ordinary DML.
 lock table public.competitions in share update exclusive mode;
 perform 1 from public.competitions where id=801 for update;
 lock table public.rounds,public.teams,public.players,public.matches,public.appearances,public.goals in share update exclusive mode;
 -- Each statement takes a fresh snapshot after any preceding lock wait.
 perform 1 from public.rounds where competition_id=801 order by id for update;
 perform 1 from public.teams where id in(select (j->>'id')::bigint from jsonb_array_elements(p->'teams')j) order by id for update;
 perform 1 from public.players where competition_id=801 or team_id in(8371,10388) order by id for update;
 perform 1 from public.matches where round_id in(select id from rounds where competition_id=801) or home_team_id in(8371,10388) or away_team_id in(8371,10388) order by id for update;
 perform 1 from countries where id=(select country_id from competitions where id=801) for share;
 truncate g13_ids,g13_queries;
 insert into g13_ids values('competitions',801),('teams',8371),('teams',10388);
 insert into g13_ids select 'rounds',id from rounds where competition_id=801;
 insert into g13_ids select 'players',id from players where competition_id=801 or team_id in(8371,10388);
 insert into g13_ids select 'matches',id from matches where round_id in(select id from g13_ids where kind='rounds') or home_team_id in(8371,10388) or away_team_id in(8371,10388);
 perform 1 from appearances where match_id in(select id from g13_ids where kind='matches') or player_id in(select id from g13_ids where kind='players') or team_id in(8371,10388) order by id for update;
 perform 1 from goals where match_id in(select id from g13_ids where kind='matches') or scorer_id in(select id from g13_ids where kind='players') or assist_player_id in(select id from g13_ids where kind='players') or team_id in(8371,10388) order by id for update;
 insert into g13_ids select 'appearances',id from appearances where match_id in(select id from g13_ids where kind='matches') or player_id in(select id from g13_ids where kind='players') or team_id in(8371,10388);
 insert into g13_ids select 'goals',id from goals where match_id in(select id from g13_ids where kind='matches') or scorer_id in(select id from g13_ids where kind='players') or assist_player_id in(select id from g13_ids where kind='players') or team_id in(8371,10388);
 -- Complete actual catalog, not an assumed list of just appearances and goals.
 catalog:=pg_temp.g13_catalog();
 perform pg_temp.g13_assert(not exists(select 1 from jsonb_array_elements(catalog)j where j->>'single'<>'true' or j->>'validated'<>'true' or j->>'deferred'<>'false'),'unsupported FK shape');
 perform pg_temp.g13_assert(not exists(
  (select j->>'rel',j->>'col',j->>'target' from jsonb_array_elements(catalog)j except select rel,col,target from g13_refs)
  union all (select rel,col,target from g13_refs except select j->>'rel',j->>'col',j->>'target' from jsonb_array_elements(catalog)j)), 'unknown or missing FK');
 -- Parent FOR UPDATE conflicts with new FK insert/retarget key-share locks.
 -- Lock existing dependents too, since non-key updates need no new FK check.
 for fk in select * from g13_refs order by rel collate "C",col collate "C" loop
  execute format('lock table %s in row share mode',fk.rel);
  execute format('select 1 from %s t where %I in(select id from g13_ids where kind=%L) order by to_jsonb(t)::text collate "C" for update',fk.rel,fk.col,fk.target);
  insert into g13_queries values('fk:'||fk.rel||'.'||fk.col,fk.rel,format('%I in(select id from g13_ids where kind=%L)',fk.col,fk.target));
  if fk.rel like 'private_dfb_pending.%' or fk.rel like 'private_fussball.%' or fk.rel like 'private_historical_statistics.%' or fk.rel like 'private_fcf_target_release.%' or fk.rel like 'private_fcf_six_target_release.%' or fk.rel like 'private_fcf_g1_supplement.%' or fk.rel like 'private_fcf_g1_9410.%' or fk.rel like 'private_baden_history.%' then
   execute format('select count(*) from %s where %I in(select id from g13_ids where kind=%L)',fk.rel,fk.col,fk.target) into n;
   perform pg_temp.g13_assert(n=0,'historical state present');
  end if;
  if fk.target='teams' and fk.rel not in('public.players','public.matches','public.appearances','public.goals') then
   execute format('select count(*) from %s where %I in(8371,10388)',fk.rel,fk.col) into n;
   perform pg_temp.g13_assert(n=0,'nonfootball club reference: '||fk.rel||'.'||fk.col);
  end if;
  if fk.target='matches' then
   execute format('select count(*) from %s where %I in(select (d->>''id'')::bigint from g13_input,jsonb_array_elements(plan->''drop'')d)',fk.rel,fk.col) into n;
   perform pg_temp.g13_assert(n=0,'dependent drop: '||fk.rel||'.'||fk.col);
  end if;
  if fk.rel in('public.fantasy_teams','public.fantasy_roster','public.fantasy_lineups','public.fantasy_transfers','public.fantasy_chips','public.tocke_krogov') then
   execute format('select count(*) from %s where %I in(select id from g13_ids where kind=%L)',fk.rel,fk.col,fk.target) into n;
   perform pg_temp.g13_assert(n=0,'fantasy state present');
  end if;
 end loop;
 perform pg_temp.g13_assert(catalog=pg_temp.g13_catalog(),'FK catalog changed while acquiring locks');
 -- These known Scout team references intentionally have no FK to teams. SHARE
 -- blocks concurrent inserts/updates; row locks alone cannot protect an absence.
 for q in select unnest(array['scout.dnevnik','scout.ekipe_elo','scout.kazalniki','scout.opazovani','scout.sedezi','scout.vrzeli']) rel loop
  execute format('lock table %s in share mode',q.rel);
  execute format('select count(*) from %s where team_id in(8371,10388)',q.rel) into n;
  perform pg_temp.g13_assert(n=0,'Scout team reference: '||q.rel);
  insert into g13_queries values('nonfk:'||q.rel,q.rel,'team_id in(8371,10388)');
 end loop;
 -- Fail closed if a new conventional team-reference column appears anywhere in
 -- application schemas, including a new non-FK table the registry cannot see.
 perform pg_temp.g13_assert(not exists(
  select 1 from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace ns on ns.oid=t.relnamespace
  where ns.nspname in('public','scout') and t.relkind in('r','p') and not a.attisdropped
   and a.attname in('team_id','home_team_id','away_team_id','insider_team_id','navijam_team_id')
   and not exists(select 1 from g13_refs f where f.rel=ns.nspname||'.'||t.relname and f.col=a.attname and f.target='teams')
   and not(ns.nspname='scout' and t.relname in('dnevnik','ekipe_elo','kazalniki','opazovani','sedezi','vrzeli') and a.attname='team_id')),'unknown team reference column');
 for q in select distinct kind from g13_ids order by kind loop
  insert into g13_queries values('core:'||q.kind,'public.'||q.kind,format('id in(select id from g13_ids where kind=%L)',q.kind));
 end loop;
 insert into g13_queries values('scope:countries','public.countries','id=(select country_id from competitions where id=801)');
 update g13_queries set predicate='id in(select (j->>''id'')::bigint from g13_input,jsonb_array_elements(plan->''teams'')j)' where key='core:teams';
 perform pg_temp.g13_assert(exists(select 1 from competitions c join countries d on d.id=c.country_id where c.id=801 and c.slug='es-ct-tercera-g13' and c.source='fcf' and c.source_league_code='4119076-4119315' and d.code='ES'),'competition identity');
 perform pg_temp.g13_assert(not exists(select 1 from jsonb_array_elements(p->'teams')j left join teams t on t.id=(j->>'id')::bigint left join countries d on d.id=t.country_id where t.name is distinct from j->>'name' or d.code is distinct from 'ES'),'club identity');
 select jsonb_agg(jsonb_build_object('id',id,'number',number) order by id) into actual from rounds where competition_id=801;
 select jsonb_agg(j order by (j->>'id')::bigint) into expected from jsonb_array_elements(p->'rounds')j;
 perform pg_temp.g13_assert(actual=expected and not exists(select 1 from rounds where competition_id=801 and season<>'2026/27'),'round identity/season');
 perform pg_temp.g13_assert((select count(*) from competition_teams where competition_id=801)=17 and not exists(select 1 from players where competition_id=801 and team_id not in(select (j->>'id')::bigint from jsonb_array_elements(p->'teams')j)),'17 original clubs only');
 perform pg_temp.g13_assert(not exists(select 1 from players where team_id in(8371,10388) and competition_id<>801),'foreign player');
 perform pg_temp.g13_assert(not exists(select 1 from matches m join rounds r on r.id=m.round_id where (home_team_id in(8371,10388) or away_team_id in(8371,10388)) and (r.competition_id<>801 or r.season<>'2026/27')),'foreign match');
 perform pg_temp.g13_assert(not exists(select 1 from appearances a join matches m on m.id=a.match_id join rounds r on r.id=m.round_id where a.team_id in(8371,10388) and (r.competition_id<>801 or r.season<>'2026/27')),'foreign appearance');
 perform pg_temp.g13_assert(not exists(select 1 from goals g join matches m on m.id=g.match_id join rounds r on r.id=m.round_id where g.team_id in(8371,10388) and (r.competition_id<>801 or r.season<>'2026/27')),'foreign goal');
 select jsonb_agg(jsonb_build_object('id',id,'reg_st',reg_st,'team_id',team_id) order by id) into actual from players where team_id in(8371,10388);
 perform pg_temp.g13_assert(actual=p->'players','21 exact registrations and original team split');
 -- Both deleted AND retained identities are pinned; 240 is never deletion authority.
 select jsonb_agg(jsonb_build_object('id',m.id,'round_id',m.round_id,'round',r.number,'home_team_id',m.home_team_id,'away_team_id',m.away_team_id,'played_on',m.played_on) order by m.id) into actual from matches m join rounds r on r.id=m.round_id where r.competition_id=801;
 select jsonb_agg(j-array['keep','report'] order by (j->>'id')::bigint) into expected from jsonb_array_elements((p->'drop')||(p->'retained'))j;
 perform pg_temp.g13_assert(actual=expected and jsonb_array_length(actual)=272,'exact 272 pre-repair calendar identities');
 perform pg_temp.g13_assert(not exists(select 1 from matches m join jsonb_array_elements(p->'drop')d on m.id=(d->>'id')::bigint where m.zapisnik_id is not null or m.imported_at is not null or m.home_goals is distinct from 0 or m.away_goals is distinct from 0 or cardinality(m.import_warnings)<>0 or m.kontumacija or m.vir_brez_izida),'drop is not empty');
 perform pg_temp.g13_assert(not exists(select 1 from matches m join jsonb_array_elements(p->'retained')d on m.id=(d->>'id')::bigint where m.zapisnik_id is not null and m.zapisnik_id<>d->>'report'),'retained report identity');
 perform pg_temp.g13_assert((select count(*) from matches where id in(309307,309324,309335,309352,427263) and zapisnik_id is not null and imported_at is not null)=5,'five populated survivors');
 perform pg_temp.g13_assert((select count(*) from appearances where match_id in(309307,309324,309335,309352,427263))=160 and (select count(*) from appearances where team_id in(8371,10388))=80 and (select count(*) from goals where team_id in(8371,10388))=14,'160 appearances / 80 club appearances / 14 club goals');
 perform pg_temp.g13_assert((select count(*) from appearances where team_id=10388)=15 and (select count(*) from goals where team_id=10388)=2,'expected current club split');
 perform pg_temp.g13_assert(not exists(select 1 from appearances where team_id in(8371,10388) and player_id not in(select (j->>'id')::bigint from jsonb_array_elements(p->'players')j)),'club appearance registration ownership');
 perform pg_temp.g13_assert(not exists(select 1 from goals where team_id in(8371,10388) and (scorer_id is null or scorer_id not in(select (j->>'id')::bigint from jsonb_array_elements(p->'players')j))),'club goal registration ownership');
 all_before:=pg_temp.g13_capture(); protected_before:=pg_temp.g13_capture(true);
 digest:=encode(sha256(convert_to(jsonb_build_object('plan',p,'catalog',catalog,'state',all_before)::text,'UTF8')),'hex');
 select jsonb_object_agg(key,jsonb_array_length(value)) into counts from jsonb_each(all_before);
 result:=jsonb_build_object('version',1,'mode',case when do_apply then 'apply' else 'preview' end,'competition',801,'dropTeam',10388,'keepTeam',8371,'sha256',digest,'countsBefore',counts,
  'deletions',p->'drop','survivors',p->'retained','changes','{"matchesDeleted":32,"players":15,"matches":1,"appearances":15,"goals":2,"teamsDeleted":1}'::jsonb,
  'protectedSha256',encode(sha256(convert_to(protected_before::text,'UTF8')),'hex'),
  'postconditions',jsonb_build_object('fixtures',240,'clubs',16,'rounds',30,'fixturesPerRound',8,'uniqueDirectedPairs',240,'players',21,'clubAppearances',80,'clubGoals',14,'populatedAppearances',160));
 if not do_apply then return result;end if;
 perform pg_temp.g13_assert(approved=digest,'approved digest mismatch');
 -- First production DML starts only after all locks, checks and digest comparison.
 delete from matches where id in(select (j->>'id')::bigint from jsonb_array_elements(p->'drop')j);
 get diagnostics n=row_count; perform pg_temp.g13_assert(n=32,'delete count');
 update players set team_id=8371 where team_id=10388;
 get diagnostics n=row_count; perform pg_temp.g13_assert(n=15,'player update count');
 update matches set home_team_id=case when home_team_id=10388 then 8371 else home_team_id end,away_team_id=case when away_team_id=10388 then 8371 else away_team_id end where home_team_id=10388 or away_team_id=10388;
 get diagnostics n=row_count; perform pg_temp.g13_assert(n=1,'match update count');
 update appearances set team_id=8371 where team_id=10388;
 get diagnostics n=row_count; perform pg_temp.g13_assert(n=15,'appearance update count');
 update goals set team_id=8371 where team_id=10388;
 get diagnostics n=row_count; perform pg_temp.g13_assert(n=2,'goal update count');
 delete from teams where id=10388;
 get diagnostics n=row_count; perform pg_temp.g13_assert(n=1,'team delete count');
 perform pg_temp.g13_assert(protected_before=pg_temp.g13_capture(true),'protected rows or semantic statistics changed');
 select jsonb_agg(jsonb_build_object('id',m.id,'round_id',m.round_id,'round',r.number,'home_team_id',m.home_team_id,'away_team_id',m.away_team_id,'played_on',m.played_on) order by m.id) into actual from matches m join rounds r on r.id=m.round_id where r.competition_id=801;
 select jsonb_agg(pg_temp.g13_normalize('public.matches',j)-'report' order by (j->>'id')::bigint) into expected from jsonb_array_elements(p->'retained')j;
 perform pg_temp.g13_assert(actual=expected and jsonb_array_length(actual)=240,'exact final calendar');
 perform pg_temp.g13_assert((select count(distinct (home_team_id,away_team_id)) from matches where round_id in(select id from g13_ids where kind='rounds'))=240,'directed pairs');
 perform pg_temp.g13_assert(not exists(select 1 from matches where round_id in(select id from g13_ids where kind='rounds') group by round_id having count(*)<>8),'eight fixtures per round');
 perform pg_temp.g13_assert(not exists(select 1 from (select round_id,home_team_id team from matches union all select round_id,away_team_id from matches)s where round_id in(select id from g13_ids where kind='rounds') group by round_id having count(distinct team)<>16),'16 distinct clubs per round');
 perform pg_temp.g13_assert((select count(*) from competition_teams where competition_id=801)=16,'16 final selectable clubs');
 perform pg_temp.g13_assert((select count(*) from players where team_id=8371)=21 and (select count(*) from appearances where team_id=8371)=80 and (select count(*) from goals where team_id=8371)=14,'retained club totals');
 for fk in select * from g13_refs where target='teams' loop
  execute format('select count(*) from %s where %I=10388',fk.rel,fk.col) into n;
  perform pg_temp.g13_assert(n=0,'remaining redundant club reference');
 end loop;
 all_after:=pg_temp.g13_capture();
 select jsonb_object_agg(key,jsonb_array_length(value)) into counts from jsonb_each(all_after);
 return result||jsonb_build_object('protectedEqual',true,'countsAfter',counts,'afterSha256',encode(sha256(convert_to(all_after::text,'UTF8')),'hex'));
end $$;
