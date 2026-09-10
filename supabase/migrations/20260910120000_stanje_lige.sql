-- Stanje lige na enem mestu.
--
-- Vklop lige (`active = true`) je ena vrstica, posledice pa niso: od tistega
-- hipa ljudje sestavljajo ekipe iz tega cenika. Te številke povedo, ali je
-- cenik sploh igriv in ali se je uvoz res posrečil — vsaka od njih je napaka,
-- ki se je pri MNZ Ljubljana zgodila, ne da bi karkoli javilo.
--
-- Bere jo delovni tok pred vklopom in stran za administracijo.

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
       and r.season = (select max(r2.season) from rounds r2
                        where r2.competition_id = p_competition_id)
  )
  select jsonb_build_object(
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
