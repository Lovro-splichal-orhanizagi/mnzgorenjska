-- Napovedi izidov v mini ligah.
--
-- Igralec pred rokom kroga napove izide tekem naslednjega kroga lige, v kateri
-- ima ekipo. Napoved je ena na uporabnika in tekmo in šteje v vseh njegovih
-- mini ligah (napoveš enkrat, velja povsod). Mini liga ima poleg lestvice
-- točk še lestvico napovedi.
--
-- Točke se ne hranijo, izračunajo se iz izida ob branju:
--   točen izid 3, pravi razplet (domači, neodločeno, gostje) 1, sicer 0.
--   Izid je znan, ko je zapisnik uvožen (`imported_at`) ali je tekma
--   `unavailable_historical` (uradni izid brez statistike) — neodigrana tekma
--   ima v `home_goals`/`away_goals` privzeto 0:0. Tekma brez izida čaka;
--   kontumacija in tekma, ki teden po datumu (ali ob `vir_brez_izida`) še
--   nima izida, sta razveljavljeni (0, ne šteje).
--   Prestavljena tekma se oceni po sebi: šteje krog, v katerem je zdaj.
--
-- Rok je isti kot za postavo (`rounds.deadline_at`, brez njega dan tekme ob
-- 10:00 kot v `naslednji_krog`). Piše le `shrani_napoved`, ki rok preveri v
-- bazi; neposrednega pisanja v tabelo ni. Pred rokom vsak vidi le svoje
-- napovedi (RLS), po roku jih člani skupne mini lige vidijo prek
-- `napovedi_mini_lige_krog`.
--
-- Tuji ključ na `matches` briše v kaskadi: uvoz in `izstop_kluba` brišeta le
-- neodigrane tekme (ogrodja razporeda), `zdruzi-klube` podvojeno ogrodje.
-- Napoved na tako tekmo izgine z njo. Ključ je v `scripts/fcf-g13-fks.json`.

create table public.napovedi (
  user_id    uuid not null references public.profiles on delete cascade,
  match_id   bigint not null references public.matches on delete cascade,
  home_goals smallint not null check (home_goals between 0 and 20),
  away_goals smallint not null check (away_goals between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
create index napovedi_tekma on public.napovedi (match_id);

comment on table public.napovedi is
  'Napoved izida tekme. Piše le shrani_napoved (pred rokom kroga); točke se izračunajo iz izida.';

alter table public.napovedi enable row level security;
revoke all on public.napovedi from anon, authenticated;
grant select on public.napovedi to authenticated;
create policy "uporabnik bere svoje napovedi" on public.napovedi
  for select using (user_id = auth.uid());

-- Omejen račun ne napoveduje (20261025111100).
create trigger zavrni_omejenega before insert or update on public.napovedi
  for each row execute function public.zavrni_omejenega();

-- ---------------------------------------------------------------------------
-- Rok, točke, stanje tekme
-- ---------------------------------------------------------------------------
create or replace function public.rok_napovedi(p_round_id bigint)
returns timestamptz
language sql stable
set search_path = public
as $$
  select coalesce(r.deadline_at, (r.played_on::timestamp + time '10:00') at time zone 'Europe/Ljubljana')
    from rounds r
   where r.id = p_round_id
$$;

-- Izid je znan (kot `match_assist_status`); neodigrana tekma ima 0:0.
create or replace function public.izid_znan(p_imported_at timestamptz, p_statistics_status text)
returns boolean
language sql immutable
set search_path = public
as $$
  select p_imported_at is not null or p_statistics_status = 'unavailable_historical'
$$;

-- NULL, kadar izida ni.
create or replace function public.tocke_napovedi(p_doma int, p_gostje int, p_izid_doma int, p_izid_gostje int)
returns int
language sql immutable
set search_path = public
as $$
  select case
           when p_izid_doma is null or p_izid_gostje is null then null
           when p_doma = p_izid_doma and p_gostje = p_izid_gostje then 3
           when sign(p_doma - p_gostje) = sign(p_izid_doma - p_izid_gostje) then 1
           else 0
         end
$$;

-- 'izid' (oceni), 'caka' ali 'razveljavljena' (0, ne šteje).
create or replace function public.stanje_tekme_napovedi(
  p_kontumacija boolean, p_brez_izida boolean, p_znan boolean, p_dan date
)
returns text
language sql stable
set search_path = public
as $$
  select case
           when p_kontumacija then 'razveljavljena'
           when p_znan then 'izid'
           when p_brez_izida or p_dan < current_date - 7 then 'razveljavljena'
           else 'caka'
         end
$$;

revoke all on function public.rok_napovedi(bigint) from public, anon;
grant execute on function public.rok_napovedi(bigint) to authenticated;
revoke all on function public.izid_znan(timestamptz, text) from public, anon;
grant execute on function public.izid_znan(timestamptz, text) to authenticated;
revoke all on function public.tocke_napovedi(int, int, int, int) from public, anon, authenticated;
revoke all on function public.stanje_tekme_napovedi(boolean, boolean, boolean, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pisanje
-- ---------------------------------------------------------------------------
-- Brez obeh vrednosti (NULL) se napoved izbriše (napoved ni obvezna).
create or replace function public.shrani_napoved(p_tekma bigint, p_doma int default null, p_gostje int default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tekma record;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Za napoved se je treba prijaviti.';
  end if;
  if (p_doma is null) <> (p_gostje is null)
     or p_doma not between 0 and 20 or p_gostje not between 0 and 20 then
    raise exception 'Napoved ima od 0 do 20 golov na ekipo.';
  end if;

  select m.id, izid_znan(m.imported_at, m.statistics_status) as znan, m.kontumacija,
         r.competition_id, rok_napovedi(r.id) as rok
    into v_tekma
    from matches m
    join rounds r on r.id = m.round_id
   where m.id = p_tekma;
  if not found then
    raise exception 'Tekme ni.';
  end if;
  if v_tekma.rok is null or v_tekma.rok <= now()
     or v_tekma.znan or v_tekma.kontumacija then
    raise exception 'Rok za napoved te tekme je potekel.';
  end if;
  if not exists (select 1 from fantasy_teams ft
                  where ft.owner_id = auth.uid() and ft.competition_id = v_tekma.competition_id
                    and not ft.hisna) then
    raise exception 'Napoveduješ lahko le tekme lige, v kateri imaš ekipo.';
  end if;

  if p_doma is null then
    delete from napovedi where user_id = auth.uid() and match_id = p_tekma;
  else
    insert into napovedi (user_id, match_id, home_goals, away_goals)
    values (auth.uid(), p_tekma, p_doma, p_gostje)
    on conflict (user_id, match_id) do update
      set home_goals = excluded.home_goals, away_goals = excluded.away_goals, updated_at = now();
  end if;
end;
$$;

revoke all on function public.shrani_napoved(bigint, int, int) from public, anon;
grant execute on function public.shrani_napoved(bigint, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Branje
-- ---------------------------------------------------------------------------
-- Tekme naslednjega kroga vsake lige, v kateri ima klicatelj ekipo, z
-- njegovo napovedjo. Teče s pravicami klicatelja (svoje ekipe, svoje napovedi).
create or replace function public.moje_odprte_napovedi(p_tekmovanje bigint default null)
returns table (
  competition_id bigint, competition_short text, round_id bigint, krog int, rok timestamptz,
  match_id bigint, played_on date,
  home_name text, home_short text, home_logo text,
  away_name text, away_short text, away_logo text,
  napoved_doma int, napoved_gostje int
)
language sql stable
set search_path = public
as $$
  select ft.competition_id, k.short_name, nk.id, nk.number, rok_napovedi(nk.id),
         m.id, m.played_on,
         h.name, h.short_name, h.logo_url,
         a.name, a.short_name, a.logo_url,
         n.home_goals, n.away_goals
    from (select distinct f.competition_id from fantasy_teams f
           where f.owner_id = auth.uid() and not f.hisna
             and (p_tekmovanje is null or f.competition_id = p_tekmovanje)) ft
    join competitions_view k on k.id = ft.competition_id
    join naslednji_krog nk on nk.competition_id = ft.competition_id
    join matches m on m.round_id = nk.id
    join teams h on h.id = m.home_team_id
    join teams a on a.id = m.away_team_id
    left join napovedi n on n.match_id = m.id and n.user_id = auth.uid()
   where not izid_znan(m.imported_at, m.statistics_status) and not m.kontumacija
     and rok_napovedi(nk.id) > now()
   order by ft.competition_id, m.played_on nulls last, m.id
$$;

revoke all on function public.moje_odprte_napovedi(bigint) from public, anon;
grant execute on function public.moje_odprte_napovedi(bigint) to authenticated;

-- Kdo v mini ligi napoveduje in katere lige mu tam štejejo: lastniki
-- nehišnih ekip članic, vsak s svojimi ligami in tekočo sezono. Napoved
-- šteje le na tekmi lige, s katero je v tej mini ligi.
create or replace function public.clani_napovedi_mini_lige(p_liga bigint)
returns table (user_id uuid, competition_id bigint, competition_short text, sezona text)
language sql stable
set search_path = public
as $$
  select distinct ft.owner_id, ft.competition_id, k.short_name, sezona_lige(ft.competition_id)
    from mini_liga_clani c
    join fantasy_teams ft on ft.id = c.fantasy_team_id and not ft.hisna
    left join competitions_view k on k.id = ft.competition_id
   where c.mini_liga_id = p_liga
$$;
revoke all on function public.clani_napovedi_mini_lige(bigint) from public, anon, authenticated;

-- Lestvica napovedi: javna liga vsem prijavljenim, zasebna članom (kot
-- `lestvica_javne_mini_lige`). Le seštevki, nikoli posamezne napovedi.
-- `p_krog` (številka kroga tekoče sezone) da lestvico enega kroga.
create or replace function public.lestvica_napovedi_mini_lige(p_liga bigint, p_krog int default null)
returns table (user_id uuid, display_name text, tocke int, tocnih int, razpletov int, ocenjenih int)
language sql stable
security definer
set search_path = public
as $$
  with clani as (
    select c.* from mini_lige ml, clani_napovedi_mini_lige(ml.id) c
     where ml.id = p_liga and (ml.javna or sem_v_mini_ligi(ml.id))
  ),
  ocene as (
    select c.user_id, tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) as t
      from clani c
      join napovedi n on n.user_id = c.user_id
      join matches m on m.id = n.match_id
      join rounds r on r.id = m.round_id
     where r.competition_id = c.competition_id
       and r.season = c.sezona
       and (p_krog is null or r.number = p_krog)
       and not m.kontumacija
       and izid_znan(m.imported_at, m.statistics_status)
  )
  select u.user_id, p.display_name,
         coalesce(sum(o.t), 0)::int,
         (count(*) filter (where o.t = 3))::int,
         (count(*) filter (where o.t = 1))::int,
         count(o.t)::int
    from (select distinct user_id from clani) u
    join profiles p on p.id = u.user_id
    left join ocene o on o.user_id = u.user_id
   group by u.user_id, p.display_name
   order by 3 desc, 4 desc, 2, 1
$$;

-- Krogi tekoče sezone, katerih rok je potekel in imajo vsaj eno napoved člana.
create or replace function public.krogi_napovedi_mini_lige(p_liga bigint)
returns table (krog int)
language sql stable
security definer
set search_path = public
as $$
  select distinct r.number
    from mini_lige ml
    cross join clani_napovedi_mini_lige(ml.id) c
    join rounds r on r.competition_id = c.competition_id and r.season = c.sezona
    join matches m on m.round_id = r.id
    join napovedi n on n.match_id = m.id and n.user_id = c.user_id
   where ml.id = p_liga and (ml.javna or sem_v_mini_ligi(ml.id))
     and rok_napovedi(r.id) <= now()
   order by 1 desc
$$;

-- Napovedi kroga po tekmah: le članom in le po roku kroga. Tekma brez
-- napovedi ima eno vrstico z user_id NULL.
create or replace function public.napovedi_mini_lige_krog(p_liga bigint, p_krog int)
returns table (
  match_id bigint, competition_id bigint, competition_short text, played_on date,
  home_name text, home_short text, home_logo text,
  away_name text, away_short text, away_logo text,
  izid_doma int, izid_gostje int, stanje text,
  user_id uuid, display_name text, napoved_doma int, napoved_gostje int, tocke int
)
language sql stable
security definer
set search_path = public
as $$
  with clani as (
    select c.* from clani_napovedi_mini_lige(p_liga) c
     where sem_v_mini_ligi(p_liga)
  ),
  tekme as (
    select distinct m.id, r.competition_id, c.competition_short,
           coalesce(m.played_on, r.played_on) as dan,
           m.home_team_id, m.away_team_id, m.home_goals, m.away_goals,
           stanje_tekme_napovedi(m.kontumacija, m.vir_brez_izida,
                                 izid_znan(m.imported_at, m.statistics_status),
                                 coalesce(m.played_on, r.played_on)) as stanje
      from (select distinct competition_id, competition_short, sezona from clani) c
      join rounds r on r.competition_id = c.competition_id and r.season = c.sezona and r.number = p_krog
      join matches m on m.round_id = r.id
     where rok_napovedi(r.id) <= now()
  )
  select t.id, t.competition_id, t.competition_short, t.dan,
         h.name, h.short_name, h.logo_url,
         a.name, a.short_name, a.logo_url,
         case when t.stanje = 'izid' then t.home_goals end,
         case when t.stanje = 'izid' then t.away_goals end, t.stanje,
         n.user_id, p.display_name, n.home_goals, n.away_goals,
         case when t.stanje = 'izid' then tocke_napovedi(n.home_goals, n.away_goals, t.home_goals, t.away_goals) end
    from tekme t
    join teams h on h.id = t.home_team_id
    join teams a on a.id = t.away_team_id
    left join (napovedi n join clani c on c.user_id = n.user_id)
           on n.match_id = t.id and c.competition_id = t.competition_id
    left join profiles p on p.id = n.user_id
   order by t.competition_id, t.dan nulls last, t.id, 18 desc nulls last, p.display_name
$$;

revoke all on function public.lestvica_napovedi_mini_lige(bigint, int) from public, anon;
revoke all on function public.krogi_napovedi_mini_lige(bigint) from public, anon;
revoke all on function public.napovedi_mini_lige_krog(bigint, int) from public, anon;
grant execute on function public.lestvica_napovedi_mini_lige(bigint, int) to authenticated;
grant execute on function public.krogi_napovedi_mini_lige(bigint) to authenticated;
grant execute on function public.napovedi_mini_lige_krog(bigint, int) to authenticated;

-- Za pošto "tvoj krog" (servis): napovedi uporabnika na tekmah kroga.
-- `ocenjenih` šteje tekme z izidom (brez kontumacij), `tocke` in `tocnih` le te.
create or replace function public.povzetek_napovedi_kroga(p_user_id uuid, p_round_id bigint)
returns table (napovedi int, ocenjenih int, tocke int, tocnih int)
language sql stable
security definer
set search_path = public
as $$
  select count(*)::int,
         count(o.t)::int,
         coalesce(sum(o.t), 0)::int,
         (count(*) filter (where o.t = 3))::int
    from (select case when not m.kontumacija and izid_znan(m.imported_at, m.statistics_status)
                      then tocke_napovedi(n.home_goals, n.away_goals, m.home_goals, m.away_goals) end as t
            from napovedi n
            join matches m on m.id = n.match_id
           where n.user_id = p_user_id and m.round_id = p_round_id) o
$$;
revoke all on function public.povzetek_napovedi_kroga(uuid, bigint) from public, anon, authenticated;
