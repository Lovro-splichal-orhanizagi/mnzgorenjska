-- Hišne ekipe: ekipe, ki jih odkrito vodi SLFF, da slovaške lige niso prazne.
--
-- Vse imajo istega lastnika — sistemski profil "SLFF" (hisa@slff.eu, prijave
-- ni), ki ga ustvari `scripts/hisne-ekipe.mjs`. V ligi štejejo kot vsaka
-- druga ekipa (lestvica, število ekip, točke kroga), ne štejejo pa tam, kjer
-- bi kazale lažno sliko o ljudeh:
--
--   * izbranost igralcev (`owners` v player_standings / player_season_standings
--     in imenovalec deleža na strani Igralci — `fantasy_team_standings.hisna`)
--   * državna lestvica (`lestvica_drzavna`) — hišna ekipa ne sme na vrh države
--   * e-pošta (`kandidati_za_opomnik`, `kandidati_za_opozorilo`; popravek
--     pozicij filtrira edge funkcija) in izbira "najbolj žive" lige za opomnik
--   * mini lige (sprožilec na `mini_liga_clani`)
--   * admin statistika (rast lig, živost, tedenska aktivnost, uporabniki) in
--     javno število uporabnikov
--
-- Ekipe nastanejo in izginejo samo prek servisnih RPC-jev spodaj.

-- ---------------------------------------------------------------------------
-- 1. Stolpec, indeksa, varovalka
-- ---------------------------------------------------------------------------

alter table public.fantasy_teams
  add column hisna boolean not null default false;

comment on column public.fantasy_teams.hisna is
  'Hišna ekipa SLFF (sistemski lastnik). V ligi šteje, v izbranosti, državni lestvici, e-pošti in mini ligah ne. Servisno polje.';

create index fantasy_teams_hisne
  on public.fantasy_teams (owner_id, competition_id) where hisna;

-- Ena ekipa na človeka v ligi velja še naprej za ljudi; sistemski lastnik jih
-- ima v ligi več. Ime indeksa ostane, ker ga vmesnik prepozna po kodi 23505.
drop index public.fantasy_teams_lastnik_tekmovanje;
create unique index fantasy_teams_lastnik_tekmovanje
  on public.fantasy_teams (owner_id, competition_id) where not hisna;

-- Lastnik hišnih ekip nima človeških ekip in obratno. Na tem sloni izključitev
-- lastnika iz pošte in štetja uporabnikov: nikoli ne skrije resničnega človeka.
create function public.varuj_hisno_ekipo() returns trigger
  language plpgsql
  set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and new.hisna is distinct from old.hisna then
    raise exception 'Hišnosti ekipe ni mogoče spremeniti.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id then
    if exists (select 1 from fantasy_teams ft
                where ft.owner_id = new.owner_id and ft.hisna <> new.hisna
                  and ft.id is distinct from new.id) then
      raise exception 'Lastnik hišnih ekip ne sme imeti drugih ekip (in obratno).'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger fantasy_teams_varuj_hisno
  before insert or update of hisna, owner_id on public.fantasy_teams
  for each row execute function public.varuj_hisno_ekipo();

-- Mini liga je med znanci; hišna ekipa vanjo ne sodi, po nobeni poti.
create function public.mini_liga_brez_hisnih() returns trigger
  language plpgsql
  set search_path to 'public'
as $$
begin
  if exists (select 1 from fantasy_teams where id = new.fantasy_team_id and hisna) then
    raise exception 'Hišna ekipa ne more v mini ligo.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger mini_liga_clani_brez_hisnih
  before insert or update of fantasy_team_id on public.mini_liga_clani
  for each row execute function public.mini_liga_brez_hisnih();

-- ---------------------------------------------------------------------------
-- 2. Pogledi (create or replace ohrani pravice; nov stolpec gre na konec)
-- ---------------------------------------------------------------------------

create or replace view public.fantasy_team_standings as
 SELECT ft.id AS fantasy_team_id,
    ft.name AS team_name,
    pr.display_name AS owner_name,
    pr.created_at AS owner_registered_at,
    ft.created_at AS team_created_at,
    COALESCE(sum(frp.points), (0)::numeric) AS total_points,
    COALESCE(max(frp.points), (0)::numeric) AS best_round,
    count(*) FILTER (WHERE (frp.points > (0)::numeric)) AS rounds_played,
    ft.competition_id,
    ft.hisna
   FROM ((public.fantasy_teams ft
     JOIN public.profiles pr ON ((pr.id = ft.owner_id)))
     LEFT JOIN public.fantasy_round_points frp ON ((frp.fantasy_team_id = ft.id)))
  GROUP BY ft.id, ft.name, pr.display_name, pr.created_at, ft.created_at, ft.competition_id, ft.hisna;

create or replace view public.lestvica_drzavna as
 SELECT s.fantasy_team_id,
    s.team_name,
    s.owner_name,
    s.total_points,
    s.rounds_played,
        CASE
            WHEN (s.rounds_played > 0) THEN round((s.total_points / (s.rounds_played)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_round,
    s.best_round,
    c.id AS competition_id,
    c.slug AS competition_slug,
    c.short_name AS competition_short,
    c.name AS competition_name,
    c.federation_short,
    c.federation_name
   FROM (public.fantasy_team_standings s
     JOIN public.competitions_view c ON ((c.id = s.competition_id)))
  WHERE c.active AND NOT s.hisna;

create or replace view public.player_season_standings as
 SELECT po.id,
    po.full_name,
    po."position",
    po.position_source,
    po.team_id,
    po.team_name,
    po.team_short,
    po.team_logo,
    po.value,
    ss.season,
    ss.matches,
    ss.minutes,
    ss.goals,
    ss.clean_sheets,
    ss.points,
        CASE
            WHEN (ss.matches > 0) THEN round((ss.points / (ss.matches)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_match,
        CASE
            WHEN (po.value > (0)::numeric) THEN round((ss.points / po.value), 2)
            ELSE (0)::numeric
        END AS points_per_value,
    COALESCE(z.points, (0)::numeric) AS last_round,
    COALESCE(f.points, (0)::numeric) AS form,
        CASE
            WHEN (zk.id IS NULL) THEN NULL::integer
            ELSE COALESCE(l.owners, 0)
        END AS owners,
    rank() OVER (PARTITION BY po.competition_id, ss.season ORDER BY ss.points DESC) AS rank,
    po.competition_id,
    ss.assists
   FROM (((((public.player_overview po
     JOIN public.player_season_stats ss ON (((ss.player_id = po.id) AND (ss.competition_id = po.competition_id))))
     LEFT JOIN LATERAL ( SELECT ps.points
           FROM (public.player_scores ps
             JOIN public.rounds r ON ((r.id = ps.round_id)))
          WHERE ((ps.player_id = po.id) AND (r.season = ss.season))
          ORDER BY r.number DESC
         LIMIT 1) z ON (true))
     LEFT JOIN LATERAL ( SELECT sum(zadnji.points) AS points
           FROM ( SELECT ps.points
                   FROM (public.player_scores ps
                     JOIN public.rounds r ON ((r.id = ps.round_id)))
                  WHERE ((ps.player_id = po.id) AND (r.season = ss.season))
                  ORDER BY r.number DESC
                 LIMIT 3) zadnji) f ON (true))
     LEFT JOIN LATERAL ( SELECT r.id
           FROM public.rounds r
          WHERE ((r.competition_id = po.competition_id) AND (r.lineups_locked_at IS NOT NULL))
          ORDER BY r.season DESC, r.number DESC
         LIMIT 1) zk ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS owners
           FROM public.fantasy_lineups fl
          WHERE ((fl.player_id = po.id) AND (fl.round_id = zk.id)
            AND NOT EXISTS (SELECT 1 FROM public.fantasy_teams h
                             WHERE h.id = fl.fantasy_team_id AND h.hisna))) l ON (true));

create or replace view public.player_standings as
 SELECT po.id,
    po.full_name,
    po."position",
    po.position_source,
    po.team_id,
    po.team_name,
    po.team_short,
    po.value,
    po.matches,
    po.minutes,
    po.goals,
    po.clean_sheets,
    COALESCE(t.points, (0)::numeric) AS points,
    COALESCE(f.points, (0)::numeric) AS form,
    COALESCE(z.points, (0)::numeric) AS last_round,
        CASE
            WHEN (po.matches > 0) THEN round((COALESCE(t.points, (0)::numeric) / (po.matches)::numeric), 2)
            ELSE (0)::numeric
        END AS points_per_match,
        CASE
            WHEN (po.value > (0)::numeric) THEN round((COALESCE(t.points, (0)::numeric) / po.value), 2)
            ELSE (0)::numeric
        END AS points_per_value,
        CASE
            WHEN (zk.id IS NULL) THEN NULL::integer
            ELSE COALESCE(l.owners, 0)
        END AS owners,
    rank() OVER (PARTITION BY po.competition_id ORDER BY COALESCE(t.points, (0)::numeric) DESC) AS rank,
    po.team_logo,
    po.competition_id,
    po.assists
   FROM (((((public.player_overview po
     LEFT JOIN LATERAL ( SELECT sum(ps.points) AS points
           FROM public.player_scores ps
          WHERE (ps.player_id = po.id)) t ON (true))
     LEFT JOIN LATERAL ( SELECT sum(zadnji.points) AS points
           FROM ( SELECT ps.points
                   FROM (public.player_scores ps
                     JOIN public.rounds r ON ((r.id = ps.round_id)))
                  WHERE (ps.player_id = po.id)
                  ORDER BY r.number DESC
                 LIMIT 3) zadnji) f ON (true))
     LEFT JOIN LATERAL ( SELECT ps.points
           FROM (public.player_scores ps
             JOIN public.rounds r ON ((r.id = ps.round_id)))
          WHERE (ps.player_id = po.id)
          ORDER BY r.number DESC
         LIMIT 1) z ON (true))
     LEFT JOIN LATERAL ( SELECT r.id
           FROM public.rounds r
          WHERE ((r.competition_id = po.competition_id) AND (r.lineups_locked_at IS NOT NULL))
          ORDER BY r.season DESC, r.number DESC
         LIMIT 1) zk ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS owners
           FROM public.fantasy_lineups fl
          WHERE ((fl.player_id = po.id) AND (fl.round_id = zk.id)
            AND NOT EXISTS (SELECT 1 FROM public.fantasy_teams h
                             WHERE h.id = fl.fantasy_team_id AND h.hisna))) l ON (true));

-- ---------------------------------------------------------------------------
-- 3. E-pošta
-- ---------------------------------------------------------------------------

create or replace function public.kandidati_za_opomnik(p_competition_id bigint)
 RETURNS TABLE(user_id uuid, email text, display_name text, team_id bigint, jezik text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_privzeta bigint;
begin
  -- Novo: najbolj živa liga po človeških ekipah, ne po hišnih.
  select c.id into v_privzeta
    from competitions c
    left join fantasy_teams ft on ft.competition_id = c.id and not ft.hisna
   where c.active
   group by c.id, c.sort_order
   order by count(ft.id) desc, c.sort_order, c.id
   limit 1;

  return query
  with brez as (
    select u.id, u.email::text as email, p.display_name,
           u.raw_user_meta_data->>'jezik' as jezik
      from auth.users u
      left join profiles p on p.id = u.id
     where u.email is not null
       and not coalesce(p.brez_opomnikov, false)
       -- Novo: sistemski lastnik hišnih ekip ni človek.
       and not exists (select 1 from fantasy_teams h where h.owner_id = u.id and h.hisna)
       and not exists (
         select 1 from fantasy_teams ft
          where ft.owner_id = u.id and coalesce(roster_je_veljaven(ft.id), false))
  ),
  domaca as (
    select b.id, b.email, b.display_name, b.jezik,
           coalesce(
             (select ft.competition_id from fantasy_teams ft
               join competitions c on c.id = ft.competition_id and c.active
              where ft.owner_id = b.id order by ft.created_at limit 1),
             v_privzeta
           ) as liga,
           (select ft.id from fantasy_teams ft
             where ft.owner_id = b.id order by ft.created_at limit 1) as ekipa
      from brez b
  )
  select d.id, d.email, d.display_name, d.ekipa, d.jezik
    from domaca d
   where d.liga = p_competition_id;
end $function$;

create or replace function public.kandidati_za_opozorilo(p_competition_id bigint, p_dni integer DEFAULT 2)
 RETURNS TABLE(user_id uuid, email text, display_name text, team_id bigint, team_name text, round_id bigint, round_number integer, deadline_at timestamp with time zone, razlog text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_krog bigint;
  v_stevilka int;
  v_rok timestamptz;
begin
  select r.id, r.number, r.deadline_at
    into v_krog, v_stevilka, v_rok
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.competition_id = p_competition_id
     and r.lineups_locked_at is null
     and r.deadline_at is not null
     and r.deadline_at > now()
     and r.deadline_at <= now() + make_interval(days => p_dni)
     and r.number >= greatest(nastavitev_int('strogi_zaklep_od_kroga', 2),
                              coalesce(c.prvi_fantasy_krog, 1) + 1)
   order by r.deadline_at
   limit 1;

  if v_krog is null then
    return;
  end if;

  return query
  select u.id,
         u.email::text,
         pr.display_name,
         ft.id,
         ft.name,
         v_krog,
         v_stevilka,
         v_rok,
         razlog_neveljavne_ekipe(ft.id)
    from fantasy_teams ft
    join auth.users u on u.id = ft.owner_id
    left join profiles pr on pr.id = u.id
   where ft.competition_id = p_competition_id
     -- Novo: hišne ekipe nimajo koga opozoriti.
     and not ft.hisna
     and u.email is not null
     and not coalesce(pr.brez_opomnikov, false)
     and exists (select 1 from fantasy_roster fr where fr.fantasy_team_id = ft.id)
     and not roster_je_veljaven(ft.id)
     and not exists (
       select 1
         from email_log el
        where el.user_id = u.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and el.round_id = v_krog
          and el.poslano_at > v_rok - make_interval(days => p_dni)
     )
     and (
       select count(distinct el.round_id)
         from email_log el
        where el.user_id = u.id
          and el.competition_id = p_competition_id
          and el.vrsta = 'opozorilo-postava'
          and el.napaka is null
          and el.round_id is distinct from v_krog
          and not exists (
            select 1
              from fantasy_lineups fl
              join rounds r2 on r2.id = fl.round_id
             where fl.fantasy_team_id = ft.id
               and r2.lineups_locked_at > el.poslano_at
          )
     ) < 2;
end $function$;

-- ---------------------------------------------------------------------------
-- 4. Statistika: hišne ekipe niso rast ne aktivnost
-- ---------------------------------------------------------------------------

create or replace function public.admin_rast_lig(p_tednov integer DEFAULT 12)
 RETURNS TABLE(competition_id bigint, slug text, name text, federation text, teden date, ekip integer, novih integer, aktivnih integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;

  return query
  with tedni as (
    select generate_series(
             (date_trunc('week', now()) - ((p_tednov - 1) || ' weeks')::interval)::date,
             date_trunc('week', now())::date,
             '1 week'::interval
           )::date as teden
  ),
  lige as (
    select c.id, c.slug, c.name, f.short_name as zveza
      from competitions c
      left join federations f on f.id = c.federation_id
     where c.active
  )
  select l.id, l.slug::text, l.name::text, coalesce(l.zveza, '—')::text, t.teden,
         (select count(*) from fantasy_teams ft
           where ft.competition_id = l.id and not ft.hisna
             and ft.created_at < t.teden + interval '7 days')::int,
         (select count(*) from fantasy_teams ft
           where ft.competition_id = l.id and not ft.hisna
             and ft.created_at >= t.teden
             and ft.created_at < t.teden + interval '7 days')::int,
         (select count(*) from fantasy_teams ft
           where ft.competition_id = l.id and not ft.hisna
             and ft.roster_updated_at >= t.teden
             and ft.roster_updated_at < t.teden + interval '7 days')::int
    from lige l
   cross join tedni t
   order by l.name, t.teden;
end;
$function$;

create or replace function public.admin_zivost()
 RETURNS TABLE(registriranih integer, aktivnih_7dni integer, aktivnih_30dni integer, z_veljavno_ekipo integer, prijavljenih_7dni integer, mini_lig integer, v_mini_ligah integer, z_ekipo integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;
  return query
  with dejanja as (
    select voter_id as kdo, created_at as kdaj from assist_votes
    union all select voter_id, created_at from position_votes
    union all select user_id, created_at from chat_messages
    union all select user_id, created_at from player_reports
    union all select owner_id, roster_updated_at from fantasy_teams
     where roster_updated_at is not null and not hisna
  )
  select
    (select count(*) from auth.users u
      where not exists (select 1 from fantasy_teams h where h.owner_id = u.id and h.hisna))::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '7 days' and kdo is not null)::int,
    (select count(distinct kdo) from dejanja
      where kdaj > now() - interval '30 days' and kdo is not null)::int,
    (select count(distinct ft.owner_id) from fantasy_teams ft
      where not ft.hisna and roster_je_veljaven(ft.id))::int,
    (select count(*) from auth.users
      where last_sign_in_at > now() - interval '7 days')::int,
    (select count(*) from mini_lige)::int,
    (select count(distinct ft.owner_id) from mini_liga_clani c
       join fantasy_teams ft on ft.id = c.fantasy_team_id)::int,
    (select count(distinct owner_id) from fantasy_teams where not hisna)::int;
end $function$;

create or replace function public.admin_tedenska_aktivnost(p_tednov integer DEFAULT 12)
 RETURNS TABLE(teden text, zacetek date, aktivnih integer, novih integer, glasovalcev integer, klepetalcev integer, urejalcev_ekipe integer, javiteljev integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere statistiko.';
  end if;

  return query
  with dejanja as (
    select voter_id as kdo, created_at as kdaj, 'glas' as kaj from assist_votes
    union all
    select voter_id, created_at, 'glas' from position_votes
    union all
    select user_id, created_at, 'klepet' from chat_messages
    union all
    select user_id, created_at, 'odsotnost' from player_reports
    union all
    select owner_id, roster_updated_at, 'ekipa'
      from fantasy_teams where roster_updated_at is not null and not hisna
  ),
  po_tednu as (
    select date_trunc('week', kdaj) as t,
           count(distinct kdo) as aktivnih,
           count(distinct kdo) filter (where kaj = 'glas') as glasovalcev,
           count(distinct kdo) filter (where kaj = 'klepet') as klepetalcev,
           count(distinct kdo) filter (where kaj = 'ekipa') as urejalcev,
           count(distinct kdo) filter (where kaj = 'odsotnost') as javiteljev
      from dejanja
     where kdo is not null and kdaj is not null
     group by 1
  ),
  novi as (
    select date_trunc('week', u.created_at) as t, count(*) as n
      from auth.users u
     where not exists (select 1 from fantasy_teams h where h.owner_id = u.id and h.hisna)
     group by 1
  ),
  tedni as (
    select generate_series(
             date_trunc('week', now()) - make_interval(weeks => p_tednov - 1),
             date_trunc('week', now()),
             interval '1 week'
           ) as t
  )
  select to_char(w.t, 'IYYY-"W"IW'),
         w.t::date,
         coalesce(p.aktivnih, 0)::int,
         coalesce(n.n, 0)::int,
         coalesce(p.glasovalcev, 0)::int,
         coalesce(p.klepetalcev, 0)::int,
         coalesce(p.urejalcev, 0)::int,
         coalesce(p.javiteljev, 0)::int
    from tedni w
    left join po_tednu p on p.t = w.t
    left join novi n on n.t = w.t
   order by w.t;
end $function$;

create or replace function public.admin_uporabniki(p_competition_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(user_id uuid, email text, display_name text, registered_at timestamp with time zone, is_admin boolean, team_id bigint, team_name text, roster_stevilo integer, ekipa_veljavna boolean, insider_competition_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_admin() then
    raise exception 'Samo administrator lahko bere uporabnike.';
  end if;

  return query
  select
    u.id                                                       as user_id,
    u.email::text                                              as email,
    p.display_name                                             as display_name,
    u.created_at                                               as registered_at,
    coalesce(p.is_admin, false)                                as is_admin,
    ft.id                                                      as team_id,
    ft.name                                                    as team_name,
    coalesce(
      (select count(*)::int
         from fantasy_roster fr
         where fr.fantasy_team_id = ft.id),
      0
    )                                                          as roster_stevilo,
    coalesce(roster_je_veljaven(ft.id), false)                 as ekipa_veljavna,
    p.insider_competition_id                                   as insider_competition_id
  from auth.users u
  left join profiles p on p.id = u.id
  left join fantasy_teams ft
    on ft.owner_id = u.id
   and not ft.hisna
   and (p_competition_id is null or ft.competition_id = p_competition_id)
  order by u.created_at;
end;
$function$;

create or replace function public.skupaj_uporabnikov()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::int from profiles p
   where not exists (select 1 from fantasy_teams h where h.owner_id = p.id and h.hisna);
$function$;

-- ---------------------------------------------------------------------------
-- 5. Servisna RPC-ja za skripto `hisne-ekipe.mjs`
-- ---------------------------------------------------------------------------

-- Ustvari hišno ekipo in ji shrani kader. Kader gre skozi `shrani_ekipo` kot
-- sistemski lastnik (začasni JWT zahtevek v tej transakciji), da denar,
-- nakupna cena, pozicija, zaklep lige in zajem zapadlih krogov tečejo po isti
-- poti kot pri ljudeh. Neveljaven kader razveljavi vse, tudi ekipo.
create function public.ustvari_hisno_ekipo(
  p_owner uuid, p_competition_id bigint, p_ime text, p_roster jsonb
) returns bigint
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare
  v_id bigint;
  v_sub text := current_setting('request.jwt.claim.sub', true);
  v_claims text := current_setting('request.jwt.claims', true);
begin
  if not exists (select 1 from profiles where id = p_owner and brez_opomnikov) then
    raise exception 'Sistemski lastnik mora imeti profil z brez_opomnikov.';
  end if;
  if not exists (select 1 from competitions where id = p_competition_id) then
    raise exception 'Lige % ni.', p_competition_id;
  end if;
  if length(btrim(coalesce(p_ime, ''))) < 2 then
    raise exception 'Hišna ekipa potrebuje ime.';
  end if;
  if exists (select 1 from fantasy_teams
              where competition_id = p_competition_id and lower(name) = lower(btrim(p_ime))) then
    raise exception 'Ime "%" je v ligi že zasedeno.', p_ime;
  end if;

  insert into fantasy_teams (owner_id, competition_id, name, hisna)
  values (p_owner, p_competition_id, btrim(p_ime), true)
  returning id into v_id;

  perform set_config('request.jwt.claim.sub', p_owner::text, true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_owner, 'role', 'authenticated')::text, true);
  perform shrani_ekipo(v_id, p_roster);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);

  if not roster_je_veljaven(v_id) then
    raise exception 'Kader hišne ekipe "%" ni veljaven: %', p_ime,
      coalesce(razlog_neveljavne_ekipe(v_id), '?');
  end if;
  return v_id;
end $$;

comment on function public.ustvari_hisno_ekipo(uuid, bigint, text, jsonb) is
  'Servisno: nova hišna ekipa z veljavnim kadrom prek shrani_ekipo. Samo scripts/hisne-ekipe.mjs.';

-- Odstrani naštete hišne ekipe z vsem, kar visi nanje. Če kateri id ni hišna
-- ekipa, ne izbriše ničesar. Vsak delete je omejen na hišne ekipe.
create function public.odstrani_hisne_ekipe(p_ids bigint[])
  returns integer
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare
  v_tuje int;
  v_n int;
begin
  select count(*) into v_tuje
    from unnest(coalesce(p_ids, '{}')) x(id)
   where not exists (select 1 from fantasy_teams ft where ft.id = x.id and ft.hisna);
  if v_tuje > 0 then
    raise exception '% od % ekip ni hišnih (ali jih ni) — ne brišem ničesar.',
      v_tuje, cardinality(p_ids);
  end if;

  delete from mini_liga_clani where fantasy_team_id in
    (select id from fantasy_teams where hisna and id = any(p_ids));
  delete from fantasy_chips where fantasy_team_id in
    (select id from fantasy_teams where hisna and id = any(p_ids));
  delete from fantasy_transfers where fantasy_team_id in
    (select id from fantasy_teams where hisna and id = any(p_ids));
  delete from fantasy_lineups where fantasy_team_id in
    (select id from fantasy_teams where hisna and id = any(p_ids));
  delete from fantasy_roster where fantasy_team_id in
    (select id from fantasy_teams where hisna and id = any(p_ids));
  -- Brisanje posnetkov osveži točke krogov za vse ekipe teh krogov — tudi
  -- za hišne, ki še obstajajo. Zato točke šele zdaj, ekipe pa čisto na koncu.
  delete from tocke_krogov where fantasy_team_id in
    (select id from fantasy_teams where hisna and id = any(p_ids));
  delete from fantasy_teams where hisna and id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

comment on function public.odstrani_hisne_ekipe(bigint[]) is
  'Servisno: izbriše naštete hišne ekipe (kader, posnetke, pripomočke, prestope, točke). Zavrne, če kateri id ni hišna ekipa.';

revoke all on function public.ustvari_hisno_ekipo(uuid, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.odstrani_hisne_ekipe(bigint[]) from public, anon, authenticated;
grant execute on function public.ustvari_hisno_ekipo(uuid, bigint, text, jsonb) to service_role;
grant execute on function public.odstrani_hisne_ekipe(bigint[]) to service_role;
