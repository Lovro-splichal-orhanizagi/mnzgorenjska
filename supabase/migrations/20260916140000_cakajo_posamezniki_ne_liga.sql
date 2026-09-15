-- Cakajo posamezniki, ne cela liga.
--
-- Migracija 20260916100000 je "krog je odigran" zaostrila na "vse tekme
-- uvozene". Napako je odpravila, prinesla pa hujso: ce ena tekma ne pride
-- nikoli — prelozena cez stirinajst dni, zapisnik z dvoumnim imenom, podvojena
-- vrstica v razporedu — borza celega kroga ne obracuna vec, in ker
-- `uveljavi_zapadle_cene` kroge, starejse od stirinajst dni, preskoci, se to
-- ne popravi samo od sebe in se nikjer ne vidi. Namesto ~30 igralcev z napacno
-- ceno bi ~300 igralcev ostalo brez premika, tiho.
--
-- Zato gre varovalka z ravni kroga na raven igralca: krog je spet odigran, ko
-- je uvozena vsaj ena tekma, iz obracuna pa izpade igralec, čigar klub v oknu
-- forme (krogi N-2..N) se nima uvozenega zapisnika. Ker za takega igralca ne
-- nastane vrstica v `price_changes`, ga naslednji nocni tek pobere sam.
--
-- S tem pade tudi ostanek prvotne napake: doslej je bil zavarovan samo krog,
-- ki se je obracunaval, ne pa kroga pred njim, ki v okno forme prav tako steje.
create or replace function public.krog_je_odigran(p_round_id bigint)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from matches m
     where m.round_id = p_round_id and m.imported_at is not null
  );
$$;

comment on function public.krog_je_odigran(bigint) is
  'Ali je uvozena vsaj ena tekma kroga. Kdo od igralcev se caka na svoj zapisnik, odloci preracunaj_cene.';

CREATE OR REPLACE FUNCTION public.preracunaj_cene(p_round_id bigint)
 RETURNS TABLE(igralec bigint, stara_cena numeric, nova_cena numeric, forma numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
      -- Zapisniki enega kroga ne pridejo hkrati. Igralec, katerega klub v
      -- oknu forme se nima uvozene tekme, bi stel nic tock in padel v ceni,
      -- popravka pa ne bi dobil nikoli: spodnji `not exists` nad
      -- `price_changes` ga naslednjic izpusti. Zato tak igralec pocaka —
      -- brez vrstice ga naslednji nocni tek obracuna znova, ko podatki
      -- pridejo. Cakajo posamezniki, ne cela liga.
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
$$


