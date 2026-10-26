-- Active/current DFB nightly quarantine. Retained valid statistics stay provisional;
-- unresolved reports block completion/email indefinitely and affected market inputs.
create schema private_dfb_pending;
revoke all on schema private_dfb_pending from public,anon,authenticated;
create table private_dfb_pending.evidence (
 id bigint generated always as identity primary key,
 competition_id bigint not null references public.competitions(id),
 match_id bigint not null references public.matches(id),
 report_id text not null,
 source_code text not null,
 fixture jsonb not null,
 status text not null,
 reason text not null,
 raw_sha256 text not null check(raw_sha256 ~ '^[a-f0-9]{64}$'),
 raw_bytes bytea not null check(octet_length(raw_bytes) between 1 and 2097152),
 observed_at timestamptz not null,
 unique(match_id,raw_sha256,observed_at)
);
create table private_dfb_pending.pending (
 match_id bigint primary key references public.matches(id),
 competition_id bigint not null references public.competitions(id),
 round_id bigint not null references public.rounds(id),
 report_id text not null unique,
 source_code text not null,
 raw_sha256 text not null,
 evidence_id bigint not null references private_dfb_pending.evidence(id),
 observed_at timestamptz not null,
 next_retry_at timestamptz not null,
 attempts integer not null check(attempts>0)
);
revoke all on all tables in schema private_dfb_pending from public,anon,authenticated;
revoke all on all sequences in schema private_dfb_pending from public,anon,authenticated;
create function private_dfb_pending.require_scope(p_competition_id bigint,p_code text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare s text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'DFB_PENDING: service only';end if;
 select split_part(p_code,'/',2) into s from competitions c join countries co on co.id=c.country_id
 where c.id=p_competition_id and c.active and c.source='dfb' and co.code='DE'
 and c.source_league_code=p_code and c.slug='de-'||split_part(p_code,'/',1)
 and p_code ~ '^regionalliga-[a-z]+/[0-9]{4}-[0-9]{4}$';
 if s is null or split_part(s,'-',2)::int<>split_part(s,'-',1)::int+1
 or public.sezona_lige(p_competition_id) is distinct from split_part(s,'-',1)||'/'||right(split_part(s,'-',2),2)
 then raise exception 'DFB_PENDING: exact active current DFB scope required';end if;
 return split_part(s,'-',1)||'/'||right(split_part(s,'-',2),2);
end$$;
revoke all on function private_dfb_pending.require_scope(bigint,text) from public,anon,authenticated;
create function public.get_dfb_pending_reports(p_competition_id bigint,p_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform private_dfb_pending.require_scope(p_competition_id,p_code);
 return coalesce((select jsonb_agg(jsonb_build_object('report_id',p.report_id,'raw_sha256',p.raw_sha256,'next_retry_at',p.next_retry_at) order by p.next_retry_at,p.report_id)
 from private_dfb_pending.pending p where p.competition_id=p_competition_id and p.source_code=p_code),'[]'::jsonb);
end$$;
create function public.mark_dfb_report_pending(p_competition_id bigint,p_code text,p_fixture jsonb,p_status text,p_reason text,p_sha256 text,p_raw_base64 text,p_observed_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare season_label text; mid bigint; rid bigint; eid bigint; raw bytea; report text; expected_path text;
begin
 season_label:=private_dfb_pending.require_scope(p_competition_id,p_code);
 if p_fixture is null or p_fixture->>'id' !~ '^[0-9]+$' or p_fixture->>'sezona' is distinct from season_label
 or p_status not in('DFB_INVALID_REPORT','DFB_UNSUPPORTED_FORMAT','DFB_INCOMPLETE_REPORT','DFB_PENDING_REPORT')
 or p_reason is null or length(p_reason) not between 1 and 4000 or p_sha256 !~ '^[a-f0-9]{64}$'
 or p_observed_at is null or not isfinite(p_observed_at) or p_observed_at>clock_timestamp()+interval '5 minutes' or p_observed_at<clock_timestamp()-interval '1 hour'
 then raise exception 'DFB_PENDING: invalid bound rejection';end if;
 expected_path:='https://datencenter.dfb.de/datencenter/'||p_code||'/'||(p_fixture->>'krog')||'(-spieltag)?/';
 if p_fixture->>'url' !~ ('^'||replace(expected_path,'.','\.')||'[a-z0-9-]+-'||(p_fixture->>'id')||'$')
 or p_fixture->>'domaciId' !~ '^[a-zA-Z0-9]+((-|%20)[a-zA-Z0-9]+)*$' or p_fixture->>'gostjeId' !~ '^[a-zA-Z0-9]+((-|%20)[a-zA-Z0-9]+)*$'
 or p_fixture->>'domaciId'=p_fixture->>'gostjeId' or p_fixture->>'domaci'=p_fixture->>'gostje'
 then raise exception 'DFB_PENDING: invalid canonical fixture identity';end if;
 raw:=decode(p_raw_base64,'base64');
 if octet_length(raw) not between 1 and 2097152 or encode(extensions.digest(raw,'sha256'),'hex') is distinct from p_sha256
 then raise exception 'DFB_PENDING: original bytes/hash differ';end if;
 report:='de-dfb-'||(p_fixture->>'id');
 perform pg_advisory_xact_lock(hashtextextended('dfb-pending:'||p_competition_id,0));
 -- No create/upsert: exactly one existing current fixture, teams and report identity.
 select m.id,m.round_id into strict mid,rid from matches m join rounds r on r.id=m.round_id
 join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id
 where r.competition_id=p_competition_id and r.season=season_label and r.number=(p_fixture->>'krog')::int
 and m.played_on=(p_fixture->>'datum')::date and h.name=p_fixture->>'domaci' and a.name=p_fixture->>'gostje'
 and m.home_team_id<>m.away_team_id and not m.kontumacija and not m.vir_brez_izida and m.statistics_status='available'
 and (m.zapisnik_id is null or m.zapisnik_id=report)
 and (m.zapisnik_id is null or m.source_url=p_fixture->>'url') for update of m;
 if exists(select 1 from matches where zapisnik_id=report and id<>mid) then raise exception 'DFB_PENDING: report belongs to another fixture';end if;
 insert into private_dfb_pending.evidence(competition_id,match_id,report_id,source_code,fixture,status,reason,raw_sha256,raw_bytes,observed_at)
 values(p_competition_id,mid,report,p_code,p_fixture,p_status,p_reason,p_sha256,raw,p_observed_at)
 on conflict(match_id,raw_sha256,observed_at)do update set raw_sha256=excluded.raw_sha256 returning id into eid;
 insert into private_dfb_pending.pending values(mid,p_competition_id,rid,report,p_code,p_sha256,eid,p_observed_at,p_observed_at+interval '6 hours',1)
 on conflict(match_id)do update set raw_sha256=excluded.raw_sha256,evidence_id=excluded.evidence_id,observed_at=excluded.observed_at,next_retry_at=excluded.next_retry_at,attempts=private_dfb_pending.pending.attempts+1;
 -- Preserve score, report ID, previous appearances/goals/assists and existing warnings.
 update matches set imported_at=null,import_warnings=array['zapisnik nepopoln: DFB pending — '||p_status]||array(select w from unnest(coalesce(import_warnings,'{}'))w where w not like 'zapisnik nepopoln: DFB pending%') where id=mid;
 return jsonb_build_object('match_id',mid,'round_id',rid);
exception when no_data_found or too_many_rows then raise exception 'DFB_PENDING: missing or ambiguous exact existing fixture';
end$$;
-- Other strict/manual writers cannot make an unresolved marker look complete.
create function private_dfb_pending.keep_incomplete()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare marker private_dfb_pending.pending%rowtype; f jsonb;
begin
 select * into marker from private_dfb_pending.pending where match_id=new.id;
 if found then
  select fixture into f from private_dfb_pending.evidence where id=marker.evidence_id;
  if new.round_id<>marker.round_id or new.home_team_id<>old.home_team_id or new.away_team_id<>old.away_team_id
   or new.played_on is distinct from (f->>'datum')::date
   or(new.zapisnik_id is not null and new.zapisnik_id<>marker.report_id)
   or new.kontumacija or new.vir_brez_izida or new.statistics_status<>'available'
  then raise exception 'DFB_PENDING: pending fixture identity/availability changed';end if;
  new.imported_at:=null;
  new.import_warnings:=array['zapisnik nepopoln: DFB pending']||array(select w from unnest(coalesce(new.import_warnings,'{}'))w where w not like 'zapisnik nepopoln: DFB pending%');
 end if;
 return new;
end$$;
revoke all on function private_dfb_pending.keep_incomplete()from public,anon,authenticated;
create trigger dfb_pending_keep_incomplete before update on public.matches for each row execute function private_dfb_pending.keep_incomplete();
create function public.complete_dfb_pending_report(p_competition_id bigint,p_code text,p_match_id bigint,p_report_id text,p_sha256 text,p_warnings text[])
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare marker private_dfb_pending.pending%rowtype;
begin
 perform private_dfb_pending.require_scope(p_competition_id,p_code);
 perform pg_advisory_xact_lock(hashtextextended('dfb-pending:'||p_competition_id,0));
 select * into strict marker from private_dfb_pending.pending where match_id=p_match_id and competition_id=p_competition_id and source_code=p_code and report_id=p_report_id and raw_sha256=p_sha256 for update;
 if p_warnings is null or exists(select 1 from unnest(p_warnings)w where w like 'zapisnik nepopoln%')
 or not exists(select 1 from matches m join rounds r on r.id=m.round_id where m.id=marker.match_id and m.round_id=marker.round_id and r.competition_id=p_competition_id and r.season=public.sezona_lige(p_competition_id) and m.zapisnik_id=p_report_id and m.source_url=(select fixture->>'url'from private_dfb_pending.evidence where id=marker.evidence_id) and m.statistics_status='available' and not m.kontumacija and not m.vir_brez_izida
 and exists(select 1 from appearances a where a.match_id=m.id)
 and m.home_goals+m.away_goals=(select count(*)from goals g where g.match_id=m.id))
 then raise exception 'DFB_PENDING: fully successful native report write required';end if;
 delete from private_dfb_pending.pending where match_id=p_match_id;
 update matches set imported_at=clock_timestamp(),import_warnings=p_warnings where id=p_match_id;
 -- Atomic: a recompute error rolls back timestamp and deletion, retaining pending.
 perform public.recompute_round_scores(marker.round_id);
 perform public.osvezi_tocke_krogov(array[marker.round_id]);
 return true;
exception when no_data_found then raise exception 'DFB_PENDING: pending identity/hash changed';
end$$;
create function public.dfb_round_has_pending(p_round_id bigint)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from private_dfb_pending.pending where round_id=p_round_id);
$$;
revoke all on function public.get_dfb_pending_reports(bigint,text),public.mark_dfb_report_pending(bigint,text,jsonb,text,text,text,text,timestamptz),public.complete_dfb_pending_report(bigint,text,bigint,text,text,text[]) from public,anon,authenticated;
grant execute on function public.get_dfb_pending_reports(bigint,text),public.mark_dfb_report_pending(bigint,text,jsonb,text,text,text,text,timestamptz),public.complete_dfb_pending_report(bigint,text,bigint,text,text,text[]) to service_role;
revoke all on function public.dfb_round_has_pending(bigint) from public,anon;
grant execute on function public.dfb_round_has_pending(bigint) to authenticated,service_role;

-- Existing completion rules, with one persistent DFB-only pending predicate.
create or replace function public.koncani_krogi_mini_lige(p_liga bigint)
returns table (fantasy_team_id bigint, round_id bigint, season text, number int)
language sql
stable
set search_path = public
as $$
  select c.fantasy_team_id, r.id, r.season, r.number
    from mini_liga_clani c
    join fantasy_teams ft on ft.id = c.fantasy_team_id
    join rounds r on r.competition_id = ft.competition_id
    join fantasy_round_points frp
      on frp.fantasy_team_id = c.fantasy_team_id and frp.round_id = r.id
   where c.mini_liga_id = p_liga
     and not public.dfb_round_has_pending(r.id)
     and r.deadline_at < now()
     and ft.created_at < r.deadline_at
     and exists (select 1 from matches m where m.round_id = r.id)
     and not exists (
           select 1 from matches m
            where m.round_id = r.id
              and m.zapisnik_id is null
              and not m.kontumacija
              and coalesce(m.played_on, r.played_on, r.deadline_at::date) >= current_date - 7
         );
$$;

-- Teče s pravicami klicatelja, zato tujcu RLS na `mini_liga_clani` vrne nič.
revoke all on function public.koncani_krogi_mini_lige(bigint) from public, anon;
grant execute on function public.koncani_krogi_mini_lige(bigint) to authenticated;


create or replace function public.tedenski_pregled_ekip(p_competition_id bigint)
returns table (
  user_id uuid,
  email text,
  display_name text,
  fantasy_team_id bigint,
  ekipa text,
  round_id bigint,
  krog int,
  tocke numeric,
  mesto bigint,
  mesto_prej bigint,
  ekip bigint,
  povprecje numeric,
  najvec numeric,
  kapetan text,
  kapetan_tocke numeric,
  najboljsi text,
  najboljsi_tocke numeric
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_krog record;
begin
  select r.id, r.season, r.number, r.deadline_at into v_krog
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and r.number >= coalesce(c.prvi_fantasy_krog, 1)
     and not public.dfb_round_has_pending(r.id)
     and r.deadline_at < now()
     and r.deadline_at > now() - interval '10 days'
     and exists (select 1 from matches m where m.round_id = r.id)
     and exists (select 1 from player_scores ps where ps.round_id = r.id)
     and not exists (
           select 1 from matches m
            where m.round_id = r.id
              and m.zapisnik_id is null
              and not m.kontumacija
              and coalesce(m.played_on, r.played_on, r.deadline_at::date) >= current_date - 7)
   order by r.deadline_at desc
   limit 1;
  if v_krog.id is null then
    return;
  end if;

  return query
  with
  -- Lestvica lige pred krogom in po njem (vse ekipe, tudi hisne: tako kot
  -- jo vidijo na strani).
  skupaj as (
    select frp.fantasy_team_id,
           sum(frp.points) filter (where frp.round_number <= v_krog.number) as zdaj,
           coalesce(sum(frp.points) filter (where frp.round_number < v_krog.number), 0) as prej,
           bool_or(frp.round_number < v_krog.number) as je_imela_prej
      from fantasy_round_points frp
     where frp.competition_id = p_competition_id and frp.season = v_krog.season
     group by frp.fantasy_team_id
  ),
  mesta as (
    select s.fantasy_team_id,
           rank() over (order by s.zdaj desc) as mesto,
           rank() over (order by s.prej desc) as mesto_prej,
           s.je_imela_prej
      from skupaj s
  ),
  krog as (
    select frp.fantasy_team_id, frp.points
      from fantasy_round_points frp
     where frp.round_id = v_krog.id
       and exists (select 1 from fantasy_lineups fl
                    where fl.fantasy_team_id = frp.fantasy_team_id and fl.round_id = v_krog.id)
  ),
  statistika as (
    select round(avg(k.points), 1) as povprecje, max(k.points) as najvec, count(*) as ekip
      from krog k
  ),
  prejemniki as (
    select ft.id, ft.name, ft.owner_id, u.email::text as email, pr.display_name, k.points
      from krog k
      join fantasy_teams ft on ft.id = k.fantasy_team_id
      join auth.users u on u.id = ft.owner_id
      left join profiles pr on pr.id = ft.owner_id
     where not ft.hisna
       and u.email is not null
       and not coalesce(pr.brez_opomnikov, false)
       and not exists (select 1 from email_log el
                        where el.user_id = ft.owner_id
                          and el.vrsta = 'tedenski-pregled'
                          and el.round_id = v_krog.id
                          and el.competition_id = p_competition_id
                          and el.napaka is null)
  ),
  igrali as (
    select p.id as ekipa_id, u.player_id, u.mnozitelj, coalesce(ps.points, 0) as tocke
      from prejemniki p
      cross join lateral ucinkovita_postava(p.id, v_krog.id) u
      left join player_scores ps on ps.round_id = v_krog.id and ps.player_id = u.player_id
  )
  select p.owner_id, p.email, p.display_name, p.id, p.name,
         v_krog.id, v_krog.number, p.points,
         m.mesto,
         -- Kdor pred tem krogom ni imel tock, nima prejsnjega mesta.
         case when m.je_imela_prej then m.mesto_prej end,
         (select count(*) from mesta),
         st.povprecje, st.najvec,
         kap.ime, kap.tocke,
         naj.ime, naj.tocke
    from prejemniki p
    join mesta m on m.fantasy_team_id = p.id
    cross join statistika st
    left join lateral (
      select coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name) as ime,
             i.tocke * i.mnozitelj as tocke
        from igrali i join players pl on pl.id = i.player_id
       where i.ekipa_id = p.id and i.mnozitelj > 1
       order by i.mnozitelj desc limit 1
    ) kap on true
    left join lateral (
      select coalesce(pl.full_name, pl.first_name || ' ' || pl.last_name) as ime, i.tocke
        from igrali i join players pl on pl.id = i.player_id
       where i.ekipa_id = p.id and i.tocke > 0
       order by i.tocke desc, pl.id limit 1
    ) naj on true
   order by p.id;
end $$;

revoke all on function public.tedenski_pregled_ekip(bigint) from public, anon, authenticated;
grant execute on function public.tedenski_pregled_ekip(bigint) to service_role;

-- Existing market algorithm; add only the pending historical-appearance guard.
create or replace function public.preracunaj_cene(p_round_id bigint)
 RETURNS TABLE(igralec bigint, stara_cena numeric, nova_cena numeric, forma numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  NAJNIZJA constant numeric := (select najnizja from meje_borze());
  NAJVISJA constant numeric := (select najvisja from meje_borze());
  v_stevilka int;
  v_sezona text;
  v_tekmovanje bigint;
  v_prvi int;
  v_zadnja_sezona text;
  v_prejsnji bigint;
  v_po_starem boolean;
  v_z_odmikom boolean;
  -- Stare meje za kroge, odigrane pred to migracijo (glej glavo).
  STARA_NAJVISJA constant numeric := 15.0;
  STARI_ODMIK constant numeric := 3.0;
begin
  select r.number, r.season, r.competition_id, c.prvi_fantasy_krog, r.borza_po_starem, r.borza_z_odmikom
    into v_stevilka, v_sezona, v_tekmovanje, v_prvi, v_po_starem, v_z_odmikom
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.id = p_round_id;
  if v_stevilka is null then
    raise exception 'krog % ne obstaja', p_round_id;
  end if;

  -- Krog, odigran pred novimi pravili, je zaključen (glej glavo migracije).
  if v_po_starem then
    return;
  end if;

  -- Arhivske sezone trga ne premikajo.
  select max(r.season) into v_zadnja_sezona
    from rounds r where r.competition_id = v_tekmovanje;
  if v_sezona is distinct from v_zadnja_sezona then
    return;
  end if;

  -- Krogi pred začetkom fantasy dela lige so samo rezultati.
  if v_stevilka < coalesce(v_prvi, 1) then
    return;
  end if;

  -- Brez odigrane tekme ni premika cene.
  if not krog_je_odigran(p_round_id) then
    return;
  end if;

  select r.id into v_prejsnji
    from rounds r
   where r.competition_id = v_tekmovanje
     and r.season = v_sezona
     and r.number = v_stevilka - 1
   order by r.id
   limit 1;

  return query
  with forma as (
    select
      ps.player_id,
      sum(ps.points) as tocke,
      sum(ps.points) filter (where ps.round_id = p_round_id) as tocke_kroga
    from player_scores ps
    join rounds r on r.id = ps.round_id
    where r.season = v_sezona
      and r.competition_id = v_tekmovanje
      and r.number between greatest(1, v_stevilka - 2) and v_stevilka
    group by ps.player_id
  ),
  -- Kdo je igral (minute > 0) in kateri klub je imel uvoženo tekmo, v tem
  -- in v prejšnjem krogu.
  igral as (
    select distinct a.player_id, m.round_id
      from appearances a
      join matches m on m.id = a.match_id
     where m.round_id in (p_round_id, v_prejsnji)
       and a.minutes_played > 0
  ),
  klub_igral as (
    select distinct x.team_id, m.round_id
      from matches m
      cross join lateral (values (m.home_team_id), (m.away_team_id)) x(team_id)
     where m.round_id in (p_round_id, v_prejsnji)
       and m.imported_at is not null
  ),
  stanje as (
    select
      p.id,
      p.value as stara,
      coalesce(f.tocke, 0) as tocke,
      coalesce(f.tocke_kroga, 0) as tocke_kroga,
      exists (select 1 from igral i where i.player_id = p.id and i.round_id = p_round_id) as je_igral,
      exists (select 1 from igral i where i.player_id = p.id and i.round_id = v_prejsnji) as prej_igral,
      exists (select 1 from klub_igral k where k.team_id = p.team_id and k.round_id = p_round_id) as klub_igral,
      exists (select 1 from klub_igral k where k.team_id = p.team_id and k.round_id = v_prejsnji) as prej_klub_igral
    from players p
    left join forma f on f.player_id = p.id
    where not p.value_locked
      and p.competition_id = v_tekmovanje
      and not exists (
        select 1 from price_changes pc
        where pc.player_id = p.id and pc.round_id = p_round_id
      )
      -- Zadržan padec je za ta krog obračun (20261013233100): če odsotnost
      -- pozneje "ni držala", ga uveljavi preverba, ne ponoven obračun.
      and not exists (
        select 1 from zadrzani_padci zp
        where zp.player_id = p.id and zp.round_id = p_round_id
      )
      -- A retained appearance can belong to a transferred player. Its previous
      -- club's pending match must not settle that player's market form either.
      and not exists (
        select 1 from private_dfb_pending.pending dp
        join rounds dr on dr.id=dp.round_id
        join appearances da on da.match_id=dp.match_id
        where da.player_id=p.id and dr.competition_id=v_tekmovanje
          and dr.season=v_sezona
          and dr.number between greatest(1,v_stevilka-2) and v_stevilka
      )
      -- Zapisniki enega kroga ne pridejo hkrati. Igralec, katerega klub v
      -- oknu forme se nima uvozene tekme, pocaka — brez vrstice v
      -- `price_changes` ga naslednji nocni tek obracuna znova, ko podatki
      -- pridejo. Cakajo posamezniki, ne cela liga (20260916140000).
      and not exists (
        select 1
          from rounds r
          join matches m on m.round_id = r.id
         where r.competition_id = v_tekmovanje
           and r.season = v_sezona
           and r.number between greatest(1, v_stevilka - 2) and v_stevilka
           and m.imported_at is null
           and not m.kontumacija
           and p.team_id in (m.home_team_id, m.away_team_id)
      )
  ),
  dvig as (
    select
      s.*,
      greatest(
        -- +0.1 za vsaki dve točki nad osnovnima dvema, največ +1.0
        least(1.0, greatest(0, floor((s.tocke_kroga - 2) / 2.0) * 0.1)),
        -- stalna forma ostane spodnja meja
        case
          when s.tocke >= 18 then 0.3
          when s.tocke >= 12 then 0.2
          when s.tocke >= 7 then 0.1
          else 0
        end
      ) as gor
    from stanje s
  ),
  premik as (
    select
      d.id,
      d.stara,
      d.tocke,
      case
        when d.je_igral and d.gor > 0 then d.gor
        -- rdeč karton, avtogol, kup prejetih — ali tri slabe tekme
        when d.je_igral and (d.tocke_kroga < 0 or d.tocke <= 2) then -0.1
        when d.je_igral then 0
        -- Ni igral: pade šele drugi zaporedni krog, ko je klub igral brez njega.
        -- Uradna poškodba ali bolezen (20261013233100): padec se zadrži.
        when d.klub_igral and d.prej_klub_igral and not d.prej_igral
             and zamrznjena_odsotnost(d.id, p_round_id) is not null then 0
        when d.klub_igral and d.prej_klub_igral and not d.prej_igral then -0.1
        else 0
      end as delta
    from dvig d
  ),
  omejeno as (
    select
      pr.id,
      pr.stara,
      pr.tocke,
      case
        when v_z_odmikom then least(
          greatest(pr.stara + pr.delta, NAJNIZJA, p.value_start - STARI_ODMIK),
          STARA_NAJVISJA,
          p.value_start + STARI_ODMIK
        )
        else least(greatest(pr.stara + pr.delta, NAJNIZJA), NAJVISJA)
      end as nova
    from premik pr
    join players p on p.id = pr.id
    where pr.delta <> 0
  ),
  -- Zadržani padci: kar bi borza odštela, če igralec ne bi javil poškodbe.
  -- Uveljavi jih preveri_uradne_odsotnosti, če odsotnost "ni držala".
  zadrzano as (
    insert into zadrzani_padci (player_id, round_id, odsotnost_id, znesek)
    select d.id, p_round_id, zamrznjena_odsotnost(d.id, p_round_id), -0.1
      from dvig d
     where not d.je_igral and d.klub_igral and d.prej_klub_igral and not d.prej_igral
       and zamrznjena_odsotnost(d.id, p_round_id) is not null
    on conflict (player_id, round_id) do nothing
  ),
  zapis as (
    insert into price_changes (player_id, round_id, old_value, new_value, form)
    select o.id, p_round_id, o.stara, o.nova, o.tocke
    from omejeno o
    where o.nova <> o.stara
    on conflict (player_id, round_id) do update
      set new_value = excluded.new_value,
          form = excluded.form,
          changed_at = now()
    returning price_changes.player_id, price_changes.old_value,
              price_changes.new_value, price_changes.form
  )
  select z.player_id, z.old_value, z.new_value, z.form from zapis z;
end;
$function$;
