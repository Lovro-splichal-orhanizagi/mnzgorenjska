-- Borza in nadzor morata brati iste meje, sicer veljaven premik sproži alarm.
create or replace function meje_borze()
returns table (najnizja numeric, najvisja numeric, odmik numeric)
language sql immutable
set search_path = public
as $$ select 4.0::numeric, 15.0::numeric, 3.0::numeric $$;

-- Zamrznjenih točk ne primerjamo z živo pozicijo; okno je skupno preračunu.
create or replace function okno_preracuna_tock()
returns interval
language sql immutable
set search_path = public
as $$ select interval '14 days' $$;

create or replace function preracunaj_cene(p_round_id bigint)
returns table (igralec bigint, stara_cena numeric, nova_cena numeric, forma numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  MEJA_DRIFTA constant numeric := (select odmik from meje_borze());
  NAJNIZJA constant numeric := (select najnizja from meje_borze());
  NAJVISJA constant numeric := (select najvisja from meje_borze());
  v_stevilka int;
  v_sezona text;
  v_tekmovanje bigint;
  v_prvi int;
  v_zadnja_sezona text;
begin
  select r.number, r.season, r.competition_id, c.prvi_fantasy_krog
    into v_stevilka, v_sezona, v_tekmovanje, v_prvi
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.id = p_round_id;
  if v_stevilka is null then
    raise exception 'krog % ne obstaja', p_round_id;
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

  return query
  with forma as (
    select
      ps.player_id,
      sum(ps.points) as tocke
    from player_scores ps
    join rounds r on r.id = ps.round_id
    where r.season = v_sezona
      and r.competition_id = v_tekmovanje
      and r.number between greatest(1, v_stevilka - 2) and v_stevilka
    group by ps.player_id
  ),
  premik as (
    select
      p.id,
      p.value as stara,
      coalesce(f.tocke, 0) as tocke,
      case
        when coalesce(f.tocke, 0) >= 18 then 0.3
        when coalesce(f.tocke, 0) >= 12 then 0.2
        when coalesce(f.tocke, 0) >= 7 then 0.1
        when coalesce(f.tocke, 0) <= 0 then -0.2
        when coalesce(f.tocke, 0) <= 2 then -0.1
        else 0
      end as delta
    from players p
    left join forma f on f.player_id = p.id
    where not p.value_locked
      and p.competition_id = v_tekmovanje
      and not exists (
        select 1 from price_changes pc
        where pc.player_id = p.id and pc.round_id = p_round_id
      )
  ),
  omejeno as (
    select
      pr.id,
      pr.stara,
      pr.tocke,
      least(
        greatest(pr.stara + pr.delta, NAJNIZJA, p.value_start - MEJA_DRIFTA),
        NAJVISJA,
        p.value_start + MEJA_DRIFTA
      ) as nova
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

create or replace function preracunaj_igralca(
  p_player_id bigint,
  p_okno interval default okno_preracuna_tock()
)
returns int
language sql
security definer
set search_path = public
as $$
  with novo as (
    insert into player_scores (round_id, player_id, points, computed_at)
    select ap.round_id, ap.player_id, sum(ap.points), now()
    from appearance_points ap
    join rounds r on r.id = ap.round_id
    where ap.player_id = p_player_id
      and (r.played_on is null or r.played_on >= current_date - p_okno)
    group by ap.round_id, ap.player_id
    on conflict (round_id, player_id) do update
      set points = excluded.points,
          computed_at = excluded.computed_at
    returning 1
  )
  select count(*)::int from novo;
$$;

create or replace function preveri_podatke()
returns table (kljuc text, opis text, koliko bigint, primer text)
language sql
stable
security definer
set search_path = public
as $$

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

-- Odigrana tekma ima dve enajsterici in klop. Manj kot 22 nastopov pomeni
-- nepopolno prebrano postavo.
select 'nastopi-premalo',
       'Uvožena tekma z manj kot 22 nastopi',
       count(*), min(x.opis)
  from (select m.id, format('tekma %s: %s nastopov', m.id, count(a.id)) opis
          from matches m left join appearances a on a.match_id = m.id
         where m.imported_at is not null
         group by m.id having count(a.id) < 22) x
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
-- Odmik mora slediti borzi, ker je tudi sidro del omejitve cene.
select 'cena-predalec-od-sidra',
       (select format('Cena je več kot %s od izhodiščne', odmik) from meje_borze()),
       count(*), min(format('igralec %s: %s proti %s', p.id, p.value, p.value_start))
  from players p cross join meje_borze() m
 where p.value_start is not null and abs(p.value - p.value_start) > m.odmik
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
$$;

comment on function preveri_podatke() is
  'Trditve o podatkih, ki morajo drzati v vsaki ligi. Prazen izid = vse v redu. Poganja jo `scripts/preveri-podatke.mjs` po nocnem uvozu.';

grant execute on function preveri_podatke() to anon, authenticated;

-- Uvožen arhiv ali prihodnji razpored ne smeta določati tekoče sezone.
-- Julijska meja je enaka kot v scripts/razpored.mjs (sezonaIz).
create or replace function tekoca_sezona(p_datum date default (now() at time zone 'Europe/Ljubljana')::date)
returns text
language sql stable
set search_path = public
as $$
  select leto::text || '/' || lpad(((leto + 1) % 100)::text, 2, '0')
  from (select extract(year from p_datum)::int -
          case when extract(month from p_datum) < 7 then 1 else 0 end as leto) s;
$$;

create or replace function stanje_lige(p_competition_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with igralci as (
    select p.* from players p
     where p.competition_id = p_competition_id and p.active
  ),
  krogi as (
    select r.id from rounds r
     where r.competition_id = p_competition_id
       and r.season = tekoca_sezona()
  )
  select jsonb_build_object(
    'igralci', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'team_id', team_id, 'position', position, 'value', value) order by id)
      from igralci), '[]'::jsonb),
    'aktivnih',           (select count(*) from igralci),
    'privzetih',          (select count(*) from igralci where value = 4.5),
    'najvisja_cena',      coalesce((select max(value) from igralci), 0),
    'mediana_cene',       coalesce((select percentile_cont(0.5) within group (order by value)
                                      from igralci), 0),
    'klubov',             (select count(distinct team_id) from igralci),
    'po_pozicijah',       coalesce((select jsonb_object_agg(position, n) from (
                             select position, count(*) as n from igralci
                              where position is not null group by position) x), '{}'::jsonb),
    'krogov_tekoce',      (select count(*) from krogi),
    -- Menjave: če jih razčlenjevalnik ne prebere, ima vsak 90 minut in nihče
    -- ne vstopi s klopi. Ničla tu pomeni pokvarjen uvoz, ne lige brez menjav.
    'nastopov_s_klopi',   (select count(*) from appearances a
                             join igralci i on i.id = a.player_id
                            where not a.started),
    -- Strelec, ki na tekmi uradno ni igral: gol ne prinese točk.
    'golov_brez_nastopa', (select count(*) from goals g
                             join matches m on m.id = g.match_id
                             join rounds r on r.id = m.round_id
                            where r.competition_id = p_competition_id
                              and g.scorer_id is not null
                              and not exists (select 1 from appearances a
                                               where a.player_id = g.scorer_id
                                                 and a.match_id = g.match_id))
  );
$$;

comment on function stanje_lige(bigint) is
  'Stevilke, po katerih se odloci, ali je liga pripravljena na vklop. Merila so v `src/lib/pripravljenost.ts`.';

grant execute on function stanje_lige(bigint) to anon, authenticated;

-- Enako dinamično programiranje kot najcenejsiKader v pripravljenost.ts:
-- najcenejša izbira za vsako kvoto ohrani tudi rešitve, ki jih pohlepna izbira izgubi.
create or replace function najcenejsi_kader(p_igralci jsonb)
returns numeric
language plpgsql immutable
set search_path = public
as $$
declare
  -- Kvote 2/5/5/3 in največ 3 iz kluba sledijo src/lib/pravila.ts.
  v_cene numeric[] := array_fill(null::numeric, array[432], array[0]);
  v_nove numeric[];
  v_klub record;
  v_moznost record;
  v_stanje int;
  v_cilj int;
begin
  v_cene[0] := 0;
  for v_klub in
    with enkrat as (
      select distinct on (id) id, team_id, position, value
        from jsonb_to_recordset(p_igralci) as p(id bigint, team_id bigint, position text, value numeric)
       where team_id is not null and position in ('GK', 'DEF', 'MID', 'FWD')
         and value >= 0 and value < 'Infinity'::numeric
       order by id
    ), cene as (
      select team_id, position,
             row_number() over (partition by team_id, position order by value, id) as n,
             sum(value) over (partition by team_id, position order by value, id) as vsota
        from enkrat
    )
    select team_id,
           array[0::numeric] || coalesce(array_agg(vsota order by n) filter (where position = 'GK'), '{}') as gk,
           array[0::numeric] || coalesce(array_agg(vsota order by n) filter (where position = 'DEF'), '{}') as def,
           array[0::numeric] || coalesce(array_agg(vsota order by n) filter (where position = 'MID'), '{}') as mid,
           array[0::numeric] || coalesce(array_agg(vsota order by n) filter (where position = 'FWD'), '{}') as fwd
      from cene where n <= 3 group by team_id order by team_id
  loop
    v_nove := v_cene;
    for v_moznost in
      select g, d, m, f, g + 3*d + 18*m + 108*f as zamik,
             v_klub.gk[g+1] + v_klub.def[d+1] + v_klub.mid[m+1] + v_klub.fwd[f+1] as cena
        from generate_series(0, least(2, cardinality(v_klub.gk)-1)) g
        cross join generate_series(0, cardinality(v_klub.def)-1) d
        cross join generate_series(0, cardinality(v_klub.mid)-1) m
        cross join generate_series(0, cardinality(v_klub.fwd)-1) f
       where g+d+m+f between 1 and 3
    loop
      for v_stanje in 0..431 loop
        if v_cene[v_stanje] is null
           or v_stanje % 3 + v_moznost.g > 2
           or (v_stanje / 3) % 6 + v_moznost.d > 5
           or (v_stanje / 18) % 6 + v_moznost.m > 5
           or v_stanje / 108 + v_moznost.f > 3 then
          continue;
        end if;
        v_cilj := v_stanje + v_moznost.zamik;
        v_nove[v_cilj] := least(v_nove[v_cilj], v_cene[v_stanje] + v_moznost.cena);
      end loop;
    end loop;
    v_cene := v_nove;
  end loop;
  return v_cene[431];
end;
$$;

create or replace function preveri_vklop_lige()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s jsonb;
  v_cena numeric;
begin
  if not new.active or (tg_op = 'UPDATE' and old.active) then
    return new;
  end if;

  -- Star transakcijski posnetek ne more potrditi svežega stanja niti po zaklepu.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Vklop lige zahteva novo transakcijo z branjem potrjenih podatkov.';
  end if;
  -- Uvoz med preverbo in vklopom ne sme zamenjati cenika ali razporeda.
  -- Vklop je redek; skupni zaklep teh tabel varuje tudi nove in izbrisane vrstice.
  lock table players, rounds, matches, appearances, goals in share mode;
  s := stanje_lige(new.id);
  v_cena := najcenejsi_kader(s->'igralci');

  if (s->>'krogov_tekoce')::int = 0 then
    raise exception 'Lige ni mogoče vklopiti: tekoča sezona nima krogov.';
  end if;
  if v_cena is null then
    raise exception 'Lige ni mogoče vklopiti: veljavnega kadra ni mogoče sestaviti.';
  end if;
  if v_cena > 100 then
    raise exception 'Lige ni mogoče vklopiti: najcenejši kader stane %, proračun je 100.', v_cena;
  end if;
  -- Prag in zaokrožitev sta enaka oceniPripravljenost, da meja ne niha med odjemalcema.
  if round(1000.0 * (s->>'privzetih')::numeric / nullif((s->>'aktivnih')::numeric, 0)) / 10 > 70
     or (s->>'najvisja_cena')::numeric < 8 then
    raise exception 'Lige ni mogoče vklopiti: cenik nima dovolj razlik.';
  end if;
  if (s->>'nastopov_s_klopi')::int = 0 then
    raise exception 'Lige ni mogoče vklopiti: nihče ni vstopil s klopi.';
  end if;
  if (s->>'golov_brez_nastopa')::int > 0 then
    raise exception 'Lige ni mogoče vklopiti: gol nima nastopa strelca.';
  end if;
  return new;
end;
$$;

-- Tudi neposredni UPDATE in servisni ključ morata skozi isto varovalko.
-- Ponovna lokalna uveljavitev migracije mora ohraniti eno samo varovalko.
create or replace trigger varovalo_vklopa_lige
before insert or update of active on competitions
for each row execute function preveri_vklop_lige();

-- Nova liga še nima razporeda in igralcev, zato se mora najprej uvoziti.
alter table competitions alter column active set default false;
revoke all on function preveri_vklop_lige() from public;
