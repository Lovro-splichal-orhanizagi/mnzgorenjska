-- Koledarska sezona (Estonija): liga igra od marca do novembra, sezona je
-- leto ("2026"), ne "2026/27".
--
-- Oznaka sezone je besedilo v `rounds.season`; zapiše jo uvoz razporeda
-- (`sezonaIz` v scripts/razpored.mjs) in vir v zapisniku. Vse, kar sezono
-- le primerja ali razvršča (lestvice, pripomočki, borza, pogled `sezone`),
-- z obliko "2026" deluje brez sprememb — znotraj lige so vse sezone iste
-- oblike. Prilagoditi je bilo treba le, kar tekočo sezono IZRAČUNA iz datuma:
--
-- 1. `competitions.sezona_koledarska` (privzeto false: obstoječe lige
--    ostanejo pri "2026/27" z mejo 1. julija).
-- 2. `sezona_lige(liga, datum)`: tekoča sezona lige; za koledarsko ligo leto
--    datuma, sicer `tekoca_sezona(datum)`.
-- 3. `stanje_lige` (krogi tekoče sezone za pripravljenost) in
--    `vklopi_ligo_sredi_sezone` bereta `sezona_lige`. Obe sta prepisani iz
--    zadnje definicije (20260910170000, 20261010020000), spremenjena je le
--    sezona.

alter table public.competitions
  add column if not exists sezona_koledarska boolean not null default false;

comment on column public.competitions.sezona_koledarska is
  'Sezona je koledarsko leto ("2026", Estonija), ne "2026/27" z mejo 1. julija.';

create or replace function public.sezona_lige(
  p_competition_id bigint,
  p_datum date default (now() at time zone 'Europe/Ljubljana')::date
)
returns text
language sql stable
set search_path = public
as $$
  select case when c.sezona_koledarska then extract(year from p_datum)::int::text
              else tekoca_sezona(p_datum) end
    from competitions c
   where c.id = p_competition_id;
$$;

grant execute on function public.sezona_lige(bigint, date) to anon, authenticated, service_role;

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
       and r.season = sezona_lige(p_competition_id)
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

create or replace function public.vklopi_ligo_sredi_sezone(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_aktivna boolean;
  v_sezona text;
  v_zadnji int;
  v_krog int;
  v_razlika bigint;
begin
  select id, active into v_id, v_aktivna from competitions where slug = p_slug for update;
  if v_id is null then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Lige ni.');
  end if;
  v_sezona := sezona_lige(v_id);
  if v_aktivna then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Liga je že vklopljena.');
  end if;

  select coalesce(sum(m.home_goals + m.away_goals), 0)
         - (select count(*) from goals g
              join matches m2 on m2.id = g.match_id
              join rounds r2 on r2.id = m2.round_id
             where r2.competition_id = v_id and m2.imported_at is not null and not m2.kontumacija)
    into v_razlika
    from matches m join rounds r on r.id = m.round_id
   where r.competition_id = v_id and m.imported_at is not null and not m.kontumacija;

  if exists (select 1 from goals g
               join matches m on m.id = g.match_id
               join rounds r on r.id = m.round_id
              where r.competition_id = v_id and g.scorer_id is not null
                and not exists (select 1 from appearances a
                                 where a.player_id = g.scorer_id and a.match_id = g.match_id)) then
    return jsonb_build_object('vklopljena', false, 'razlog', 'Gol nima nastopa strelca.',
                              'razlika', v_razlika);
  end if;

  select coalesce(max(r.number), 0) into v_zadnji
    from rounds r
   where r.competition_id = v_id and r.season = v_sezona
     and exists (select 1 from matches m join appearances a on a.match_id = m.id
                  where m.round_id = r.id);
  select min(r.number) into v_krog
    from rounds r
   where r.competition_id = v_id and r.season = v_sezona
     and r.number > v_zadnji and r.deadline_at > now();
  if v_krog is null then
    return jsonb_build_object('vklopljena', false,
      'razlog', format('Za zadnjim krogom z zapisniki (%s) ni kroga z rokom v prihodnosti.', v_zadnji),
      'razlika', v_razlika);
  end if;

  begin
    update competitions set prvi_fantasy_krog = v_krog, active = true where id = v_id;
  exception when others then
    -- Varovalka vklopa (cenik, kader, klop …): vklop odloči človek.
    return jsonb_build_object('vklopljena', false, 'razlog', sqlerrm,
                              'prvi_krog', v_krog, 'razlika', v_razlika);
  end;
  return jsonb_build_object('vklopljena', true, 'razlog', null,
                            'prvi_krog', v_krog, 'razlika', v_razlika);
end;
$$;
revoke all on function public.vklopi_ligo_sredi_sezone(text) from public, anon, authenticated;
grant execute on function public.vklopi_ligo_sredi_sezone(text) to service_role;
