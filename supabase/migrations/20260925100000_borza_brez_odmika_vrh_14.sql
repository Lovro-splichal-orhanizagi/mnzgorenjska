-- Cena sledi igri vso sezono, navzgor do 14.0.
--
-- Doslej se je cena od izhodiščne (`value_start`) smela oddaljiti največ za
-- 3.0. Igralec, ki je začel pri 5.0 in igral vso sezono odlično, je obstal
-- pri 8.0 — borza ni več merila, kako je napredoval, in prav to naj bi ljudje,
-- ki sami igrajo, na svoji ceni videli. Odmika od izhodišča ni več; ostane le
-- razpon 4.0–14.0 (vrh je bil 15.0, zdaj je 14.0).
--
-- NOVA PRAVILA NE SMEJO SEČI NAZAJ. Vsak krog, ki je ob tej migraciji že
-- odigran, dobi `borza_z_odmikom` in ga borza (tudi nočni ponovni obračun
-- zadnjih 14 dni) obračuna po starih mejah: 4.0–15.0 in največ 3.0 od
-- `value_start`. Nove meje veljajo le za kroge, odigrane odslej. Krogov ne
-- zapiramo z `borza_po_starem`, ker bi to igralcem, ki v odigranem krogu še
-- čakajo na zapisnik, vzelo premik za tisti krog.
--
-- `value_start` ostane izhodišče za prikaz gibanja cene, le meja ni več.

alter table public.rounds
  add column if not exists borza_z_odmikom boolean not null default false;

comment on column public.rounds.borza_z_odmikom is
  'Krog je odigran pred 20260925100000; preracunaj_cene ga obračuna po starih mejah (4.0–15.0, največ 3.0 od value_start).';

update public.rounds r
   set borza_z_odmikom = true
 where krog_je_odigran(r.id);

drop function if exists public.meje_borze();

-- Borza in nadzor morata brati iste meje, sicer veljaven premik sproži alarm.
create function public.meje_borze()
returns table (najnizja numeric, najvisja numeric)
language sql immutable
set search_path = public
as $$ select 4.0::numeric, 14.0::numeric $$;

create or replace function public.preracunaj_cene(p_round_id bigint)
 returns table(igralec bigint, stara_cena numeric, nova_cena numeric, forma numeric)
 language plpgsql
 security definer
 set search_path to 'public'
as $$
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
$$;

CREATE OR REPLACE FUNCTION public.preveri_podatke()
 RETURNS TABLE(kljuc text, opis text, koliko bigint, primer text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

-- Ista meja in isti pomen NULL kot pri preracunaj_igralca; sezona ni meja zamrznitve.
with svezi_krogi as (
  select r.id from rounds r
   where r.played_on is null or r.played_on >= current_date - okno_preracuna_tock()
), pricakovane_tocke as materialized (
  select ap.player_id, ap.round_id, sum(ap.points) vsota
    from appearance_points ap
    join svezi_krogi sk on sk.id = ap.round_id
   group by ap.player_id, ap.round_id
)

-- === Uvoz ================================================================

-- Ekipa, ki je na tekmi nastopila z manj kot SEDMIMI igralci.
--
-- Prej je merilo bilo "manj kot 22 nastopov na tekmo", z razlago, da ima
-- odigrana tekma dve enajsterici. V nizjih ligah to ne drzi: zapisnik MNL
-- Lendava 2025/26 za Nafto veterane res nasteje osem igralcev, in tekma je
-- bila odigrana. Merilo je torej javljalo napako za podatek, ki je pravilen.
--
-- Sedem je meja iz pravil igre: s sestimi se tekma ne more nadaljevati. Manj
-- kot sedem nastopov torej ne more biti resnica in nujno pomeni, da se je
-- postava med uvozom izgubila.
select 'postava-izgubljena',
       'Ekipa z manj kot sedmimi nastopi na tekmi',
       count(*), min(x.opis)
  from (select m.id,
               format('tekma %s, %s: %s nastopov', m.id, t.name, count(a.id)) opis
          from matches m
          join teams t on t.id in (m.home_team_id, m.away_team_id)
          -- Ekipa se vzame z NASTOPA, ne iz `players.team_id`: ta pove, kje
          -- igralec igra DANES, arhivska tekma pa je od prej in igralci so
          -- med tem prestopili. Po klubu igralca bi zato skoraj vsaka
          -- arhivska tekma izpadla kot izgubljena postava.
          left join appearances a
            on a.match_id = m.id and a.team_id = t.id
         where m.imported_at is not null
         group by m.id, t.name having count(a.id) < 7) x
having count(*) > 0

union all
-- Menjav ni prebral nihce: vsi zacetniki 90 minut, klop brez nastopa. Tako
-- je izpadel ljubljanski zapisnik, ker je minuta zapisana pred VSAKIM igralcem.
select 'menjave-neprebrane',
       'Liga z odigranimi tekmami, a brez enega samega nastopa s klopi',
       count(*), min(x.slug)
  from (select c.slug
          from competitions c
          join players p on p.competition_id = c.id
          join appearances a on a.player_id = p.id
         group by c.slug
        having count(*) filter (where not a.started) = 0) x
having count(*) > 0

union all
-- Strelec, ki na tekmi uradno ni igral — gol ne prinese tock.
select 'gol-brez-nastopa',
       'Gol, katerega strelec na tej tekmi nima nastopa',
       count(*), min(format('gol %s, tekma %s', g.id, g.match_id))
  from goals g
 where g.scorer_id is not null
   and not exists (select 1 from appearances a
                    where a.player_id = g.scorer_id and a.match_id = g.match_id)
having count(*) > 0

union all
-- Tekma zunaj svoje sezone. Ljubljanska letnica s stirimi stevkami je cel
-- arhiv 2025/26 postavila v leto 2020, brez ene same napake.
select 'datum-zunaj-sezone',
       'Tekma z datumom zunaj svoje sezone',
       count(*), min(format('tekma %s: %s v sezoni %s', m.id, m.played_on, r.season))
  from matches m join rounds r on r.id = m.round_id
 where m.played_on is not null
   and r.season ~ '^\d{4}/\d{2}$'
   and (m.played_on < make_date(split_part(r.season, '/', 1)::int, 7, 1)
     or m.played_on > make_date(split_part(r.season, '/', 1)::int + 1, 6, 30))
having count(*) > 0

union all
select 'sezona-oblika',
       'Sezona ni v obliki LLLL/LL',
       count(*), min(r.season)
  from rounds r where r.season !~ '^\d{4}/\d{2}$'
having count(*) > 0

-- === Tocke ===============================================================

union all
-- `player_scores` je posnetek, `appearance_points` ziv pogled. Ce se
-- razideta, so tocke zastarele ali dvojno stete — to je tista vrsta napake,
-- zaradi katere je ekipa kazala -27.
select 'tocke-razhajanje',
       'Posnetek točk se ne ujema z izračunom iz nastopov (znotraj okna preračuna)',
       count(*), min(x.opis)
  from (select format('igralec %s, krog %s: posnetek %s, izračun %s',
                      ps.player_id, ps.round_id, ps.points, coalesce(ap.vsota, 0)) opis
          from player_scores ps
          join svezi_krogi tk on tk.id = ps.round_id
          left join pricakovane_tocke ap
            on ap.player_id = ps.player_id and ap.round_id = ps.round_id
         where abs(ps.points - coalesce(ap.vsota, 0)) > 0.01) x
having count(*) > 0

union all
-- Tocke za krog, v katerem igralec sploh ni nastopil.
select 'tocke-brez-nastopa',
       'Igralec ima točke v krogu, v katerem ni nastopil (znotraj okna preračuna)',
       count(*), min(format('igralec %s, krog %s', ps.player_id, ps.round_id))
  from player_scores ps
  join svezi_krogi tk on tk.id = ps.round_id
 where ps.points <> 0
   and not exists (select 1 from pricakovane_tocke ap
                    where ap.player_id = ps.player_id and ap.round_id = ps.round_id)
having count(*) > 0

union all
-- Izhajamo iz nastopov, da zaznamo tudi povsem neizračunan krog in ničelne točke.
select 'tocke-manjkajo',
       'Manjka posnetek točk za igralca z nastopom (znotraj okna preračuna)',
       count(*), min(format('igralec %s, krog %s', ap.player_id, ap.round_id))
  from pricakovane_tocke ap
  left join player_scores ps on ps.player_id = ap.player_id and ps.round_id = ap.round_id
 where ps.player_id is null
having count(*) > 0

-- === Cene ================================================================

union all
select 'cena-zunaj-mej',
       (select format('Cena zunaj dovoljenega razpona %s–%s', najnizja, najvisja) from meje_borze()),
       count(*), min(format('igralec %s: %s', p.id, p.value))
  from players p cross join meje_borze() m
 where p.value < m.najnizja or p.value > m.najvisja
having count(*) > 0

union all
-- Vklopljena liga, v kateri stane skoraj vsak enako, nima igre.
select 'cenik-brez-razlik',
       'Vklopljena liga, kjer ima več kot 70 % igralcev privzeto ceno',
       count(*), min(x.opis)
  from (select format('%s: %s %%', c.slug,
               round(100.0 * count(*) filter (where p.value = 4.5) / count(*))) opis
          from competitions c join players p on p.competition_id = c.id
         where c.active and p.active
         group by c.slug
        having count(*) filter (where p.value = 4.5) > 0.7 * count(*)) x
having count(*) > 0
$function$
;
