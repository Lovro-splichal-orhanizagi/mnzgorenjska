-- Klub izstopi iz lige med sezono (Tržič 2012, mladinci, po 3. krogu 2026/27).
--
-- Deaktivacija igralcev (`active = false`) tu ni prava: kader z neaktivnim
-- igralcem je neveljaven in ekipa izgubi točke VSEGA kroga, ne le tega
-- igralca. Lastnik je igralca kupil pošteno, ko je klub še igral. Zato
-- `players.izstopil_at`:
--   * igralec ostane aktiven — kader z njim je veljaven, igralec pa ne igra
--     več in prinaša 0 točk (kot vsak, ki tisti krog ni nastopil),
--   * kupiti ga ne more nihče več: `shrani_ekipo` zavrne igralca izstopljenega
--     kluba, ki ga ekipa že nima, trg ga skrije,
--   * lastnik dobi opozorilo na strani (`stanje_mojih_ekip`, vrsta `izstop`)
--     in enkratni e-mail (posli-opomnik, vrsta `izstop-kluba`).
-- Odigrane tekme kluba in točke iz njih ostanejo: zapisniki so uradni, krogi
-- zaklenjeni in točkovanje ne sme seči nazaj — tudi če zveza na lestvici
-- izide izstopljenega kluba razveljavi.

alter table public.players add column if not exists izstopil_at timestamptz;

comment on column public.players.izstopil_at is
  'Klub je izstopil iz lige. Igralec ostane aktiven (kader z njim je veljaven), '
  'kupiti ga ne more nihče več. Nastavi ga izstop_kluba().';

-- ---------------------------------------------------------------------------
-- 1. Označi izstop kluba in pospravi njegove neodigrane tekme
-- ---------------------------------------------------------------------------
-- Neodigrane tekme kluba bi sicer ostale "tekme brez zapisnika": preverba jih
-- javlja, borza pa zadrži premik cene igralcem obeh klubov, dokler krog ne
-- pade iz okna — tedaj premik izgubijo. Uvožene tekme ostanejo.
create or replace function public.izstop_kluba(
  p_competition_id bigint,
  p_team_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_igralcev int;
  v_tekem int;
begin
  update players
     set izstopil_at = coalesce(izstopil_at, now())
   where competition_id = p_competition_id
     and team_id = p_team_id;
  get diagnostics v_igralcev = row_count;

  delete from matches m
   using rounds r
   where r.id = m.round_id
     and r.competition_id = p_competition_id
     and r.season = (select max(r2.season) from rounds r2
                      where r2.competition_id = p_competition_id)
     and m.imported_at is null
     and m.zapisnik_id is null
     and p_team_id in (m.home_team_id, m.away_team_id);
  get diagnostics v_tekem = row_count;

  return jsonb_build_object('igralcev', v_igralcev, 'izbrisanih_tekem', v_tekem);
end;
$$;

revoke all on function public.izstop_kluba(bigint, bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. shrani_ekipo: igralca izstopljenega kluba se ne da kupiti
-- ---------------------------------------------------------------------------
-- Enako kot 20260913100000, dodano je le preverjanje `v_izstopljeni`.
create or replace function shrani_ekipo(
  p_team_id bigint,
  p_roster  jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash          numeric;
  v_delta         numeric;
  v_dobicek       numeric;
  v_strosek       numeric;
  v_stari_buy     jsonb;
  v_stara_poz     jsonb;
  v_tekmovanje    bigint;
  v_tujih         int;
  v_izstopljeni   text;
  v_shranjeno_ob  timestamptz;
  v_krog          record;
begin
  select cash, competition_id into v_cash, v_tekmovanje
    from fantasy_teams
   where id = p_team_id and owner_id = auth.uid();

  if v_tekmovanje is null then
    raise exception 'Ni dovoljenja za urejanje te ekipe.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('slff-kader:' || v_tekmovanje, 0));
  -- Ponovno branje pod zaklepom preprecuje dvojno porabo pri dveh zavihkih.
  select cash into v_cash from fantasy_teams
   where id = p_team_id and owner_id = auth.uid() for update;
  v_shranjeno_ob := clock_timestamp();

  -- Cron lahko zamuja. Najprej ohranimo staro postavo, sele nato dovolimo
  -- spremembe za naslednji krog; prazen/neveljaven kader se prav tako zapre.
  for v_krog in
    select id from rounds
     where competition_id = v_tekmovanje
       and lineups_locked_at is null
       and deadline_at <= v_shranjeno_ob
       and deadline_at > v_shranjeno_ob - interval '7 days'
     order by deadline_at, id
  loop
    perform zakleni_krog(v_krog.id);
  end loop;

  if p_roster is null or jsonb_typeof(p_roster) <> 'array' then
    raise exception 'Kader mora biti seznam igralcev.' using errcode = '22023';
  end if;

  select count(*) into v_tujih
  from jsonb_array_elements(p_roster) e
  join players p on p.id = (e->>'player_id')::bigint
  where p.competition_id <> v_tekmovanje;

  if v_tujih > 0 then
    raise exception 'V ekipi so igralci iz druge lige.'
      using errcode = 'P0001';
  end if;

  -- Kdor igralca izstopljenega kluba že ima, ga sme obdržati; na novo ga ne
  -- kupi nihče.
  select string_agg(coalesce(p.full_name, '#' || p.id), ', ' order by p.full_name) into v_izstopljeni
  from jsonb_array_elements(p_roster) e
  join players p on p.id = (e->>'player_id')::bigint
  where p.izstopil_at is not null
    and not exists (
      select 1 from fantasy_roster fr
      where fr.fantasy_team_id = p_team_id
        and fr.player_id = p.id
    );

  if v_izstopljeni is not null then
    raise exception 'Klub je izstopil iz lige, igralca ni več mogoče kupiti: %.', v_izstopljeni
      using errcode = 'P0001';
  end if;

  select coalesce(jsonb_object_agg(player_id::text, buy_value), '{}'::jsonb)
    into v_stari_buy
    from fantasy_roster where fantasy_team_id = p_team_id;

  -- Igralec, ki v kadru ostane, obdrži mesto, na katerem je bil kupljen;
  -- novi ga dobijo po trenutni poziciji.
  select coalesce(jsonb_object_agg(player_id::text, buy_position), '{}'::jsonb)
    into v_stara_poz
    from fantasy_roster
   where fantasy_team_id = p_team_id and buy_position is not null;

  select coalesce(sum(p.value), 0)::numeric into v_dobicek
  from fantasy_roster fr
  join players p on p.id = fr.player_id
  where fr.fantasy_team_id = p_team_id
    and not exists (
      select 1
      from jsonb_array_elements(p_roster) e
      where (e->>'player_id')::bigint = fr.player_id
    );

  select coalesce(sum(p.value), 0)::numeric into v_strosek
  from jsonb_array_elements(p_roster) e
  join players p on p.id = (e->>'player_id')::bigint
  where not exists (
    select 1 from fantasy_roster fr
    where fr.fantasy_team_id = p_team_id
      and fr.player_id = (e->>'player_id')::bigint
  );

  v_delta := v_dobicek - v_strosek;

  if v_cash + v_delta < 0 then
    raise exception 'Premalo sredstev — potrebuješ še % M.', abs(v_cash + v_delta)::text
      using errcode = 'P0001';
  end if;

  delete from fantasy_roster where fantasy_team_id = p_team_id;

  insert into fantasy_roster (
    fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order,
    buy_value, buy_position
  )
  select
    p_team_id,
    (e->>'player_id')::bigint,
    coalesce((e->>'is_starter')::boolean, false),
    coalesce((e->>'is_captain')::boolean, false),
    coalesce((e->>'is_vice')::boolean, false),
    nullif(e->>'bench_order', '')::int,
    coalesce(
      (v_stari_buy ->> ((e->>'player_id')::bigint)::text)::numeric,
      (select value from players where id = (e->>'player_id')::bigint)
    ),
    coalesce(
      v_stara_poz ->> ((e->>'player_id')::bigint)::text,
      (select position from players where id = (e->>'player_id')::bigint)
    )
  from jsonb_array_elements(p_roster) e;

  update fantasy_teams
    set cash = v_cash + v_delta, roster_updated_at = v_shranjeno_ob
    where id = p_team_id;

  return jsonb_build_object(
    'cash',      v_cash + v_delta,
    'dobicek',   v_dobicek,
    'strosek',   v_strosek,
    'delta',     v_delta
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. player_overview: trg mora vedeti, koga skriti
-- ---------------------------------------------------------------------------
-- Nov stolpec gre na konec, zato `create or replace` zadošča.
create or replace view player_overview as
select
  p.id,
  p.full_name,
  p.first_name,
  p.last_name,
  p.position,
  p.position_source,
  p.shirt_number,
  p.value,
  p.team_id,
  t.name as team_name,
  t.short_name as team_short,
  coalesce(s.matches, 0) as matches,
  coalesce(s.minutes, 0) as minutes,
  coalesce(s.goals, 0) as goals,
  coalesce(s.clean_sheets, 0) as clean_sheets,
  coalesce(s.points, 0) as points,
  coalesce(pv.votes, 0) as position_votes,
  t.logo_url as team_logo,
  p.competition_id,
  p.active,
  coalesce(s.assists, 0) as assists,
  p.izstopil_at
from players p
join teams t on t.id = p.team_id
left join lateral (
  select sum(ss.matches)::int as matches, sum(ss.minutes)::int as minutes,
         sum(ss.goals)::int as goals, sum(ss.clean_sheets)::int as clean_sheets,
         sum(ss.points) as points, sum(ss.assists)::int as assists
  from player_season_stats ss
  where ss.player_id = p.id
    and ss.competition_id = p.competition_id
) s on true
left join lateral (
  select count(*)::int as votes from position_votes where player_id = p.id
) pv on true;

-- ---------------------------------------------------------------------------
-- 4. stanje_mojih_ekip: opozorilo za igralca izstopljenega kluba
-- ---------------------------------------------------------------------------
-- Enako kot 20260923140000, opozorila dobijo še vrsto `izstop`.
create or replace function public.stanje_mojih_ekip()
returns table (
  competition_id bigint,
  slug text,
  liga text,
  team_id bigint,
  team_name text,
  veljavna boolean,
  brez_tock boolean,
  razlog text,
  krog integer,
  rok timestamptz,
  opozorila jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.slug,
         coalesce(c.short_name, c.name),
         ft.id,
         ft.name,
         v.veljavna,
         not v.veljavna
           and nk.number is not null
           and nk.number >= greatest(nastavitev_int('strogi_zaklep_od_kroga', 2),
                                     coalesce(c.prvi_fantasy_krog, 1) + 1),
         case when not v.veljavna then razlog_neveljavne_ekipe(ft.id) end,
         nk.number,
         nk.deadline_at,
         coalesce((
           select jsonb_agg(o.opozorilo order by o.kapetan desc, o.namestnik desc,
                                                 o.v_postavi desc, o.ime)
             from (
               select jsonb_build_object(
                        'player_id', p.id,
                        'ime', p.full_name,
                        'vrsta', case when p.izstopil_at is not null then 'izstop' else o.kind end,
                        'opis', case when p.izstopil_at is null then o.content end,
                        'datum', coalesce(p.izstopil_at, o.created_at),
                        'v_postavi', r.is_starter,
                        'kapetan', r.is_captain,
                        'namestnik', r.is_vice) as opozorilo,
                      r.is_captain as kapetan, r.is_vice as namestnik,
                      r.is_starter as v_postavi, p.full_name as ime
                 from fantasy_roster r
                 join players p on p.id = r.player_id
                 left join odsotni_igralci o
                   on o.player_id = r.player_id and o.kind in ('poskodba', 'odsotnost')
                where r.fantasy_team_id = ft.id
                  and (p.izstopil_at is not null or o.player_id is not null)
             ) o
         ), '[]'::jsonb)
    from fantasy_teams ft
    join competitions c on c.id = ft.competition_id and c.active
    cross join lateral (select roster_je_veljaven(ft.id) as veljavna) v
    left join naslednji_krog nk on nk.competition_id = c.id
   where ft.owner_id = auth.uid()
   order by c.sort_order nulls last, c.id;
$$;

-- ---------------------------------------------------------------------------
-- 5. Borza: okno po zadnji odigrani tekmi kroga, ne po datumu kroga
-- ---------------------------------------------------------------------------
-- Prestavljena tekma (Ivančna Gorica : Litija, 3. krog lj-mladinci-2, odigrana
-- 17 dni za krogom) zadrži premik cene igralcem obeh klubov, dokler zapisnik
-- ne pride. Ko pride, je bil krog po svojem datumu že zunaj okna in igralca
-- premika nista dobila nikoli. Krog zdaj šteje kot svež do 14 dni po zadnji
-- uvoženi tekmi; ostali igralci kroga ga imajo že obračunanega
-- (`price_changes`) in se jih ponovni tek ne dotakne.
create or replace function uveljavi_zapadle_cene(p_okno interval default interval '14 days')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_krog record;
  v_skupaj int := 0;
  v_preskocenih int := 0;
begin
  for v_krog in
    select r.id, r.season, r.number,
           greatest(r.played_on, (select max(m.played_on) from matches m
                                   where m.round_id = r.id
                                     and m.imported_at is not null)) as played_on
    from rounds r
    join competitions c on c.id = r.competition_id
    where r.number >= c.prvi_fantasy_krog
      and krog_je_odigran(r.id)
      and r.season = (
        select max(r2.season) from rounds r2 where r2.competition_id = r.competition_id
      )
    order by r.season, r.number
  loop
    if v_krog.played_on is not null
       and v_krog.played_on < (current_date - p_okno) then
      v_preskocenih := v_preskocenih + 1;
      continue;
    end if;
    v_skupaj := v_skupaj + uveljavi_cene(v_krog.id);
  end loop;

  if v_preskocenih > 0 then
    raise notice 'borza je preskočila % starih krogov (zunaj okna %)',
      v_preskocenih, p_okno;
  end if;
  return v_skupaj;
end;
$$;
