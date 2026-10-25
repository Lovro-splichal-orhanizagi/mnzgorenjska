-- Plačljivo ponovno vrednotenje cene tudi za igralce z borzno zgodovino.
--
-- 20261025193100 je igralca, čigar ceno po krogih premika borza, zavrnil
-- (ovira 'borza'), ker ga tudi tedenski zagon preskoči. Takih je ~60 % aktivnih.
--
-- Zakaj tedenski zagon borzne igralce preskoči: nočni `uveljavi_zapadle_cene`
-- za vse kroge zadnjih 14 dni znova postavi `players.value = price_changes.new_value`
-- (krogi po vrsti, zadnji zmaga). Neposreden popravek `players.value` bi borza
-- naslednjo noč povozila. Enako težavo ima kazen neuradne odsotnosti in jo
-- reši tako, da premik zapiše v `price_changes` (preveri_uradne_odsotnosti).
--
-- Tu enako: potrjena ponovna cena borznega igralca
--   * premakne `value` na potrjeno ceno (znotraj `meje_borze()`), sidro
--     `value_start` z isto razliko (borzni odmik od sidra ostane) in žig
--     `repriced_week/at` (tedenska meja velja za tedenski in plačljivi premik
--     skupaj; borznih premikov ne ustavi);
--   * v igralčevi ZADNJI vrstici `price_changes` (zadnji krog, ki ga je borza
--     obračunala) postavi `new_value` na potrjeno ceno. Nočni ponovni obračun
--     zato ceno pusti, kjer je, poznejši krogi pa se računajo od nje
--     (`preracunaj_cene` vzame `p.value` za staro ceno). Novih vrstic ne
--     dodamo: vrstica za še neobračunan krog bi igralcu vzela premik tega kroga.
-- Pravila borze in točkovanja se ne spremenijo, stari krogi ostanejo zaprti.

-- Borzna zgodovina ni več ovira.
create or replace function public.ponovna_cena_ovira_igralca(p_player_id bigint)
returns text language plpgsql stable security definer set search_path = public
as $$
declare
  p record;
begin
  select pl.active, pl.anonimiziran_at, pl.izstopil_at, pl.value_locked, pl.repriced_week,
         c.active liga_aktivna, c.slug
    into p
    from players pl join competitions c on c.id = pl.competition_id
   where pl.id = p_player_id;
  if not found then return 'ni_igralca'; end if;
  if not p.liga_aktivna then return 'liga'; end if;
  if je_mladinski_slug(p.slug) then return 'mladinska'; end if;
  if p.anonimiziran_at is not null or not coalesce(p.active, false) or p.izstopil_at is not null then return 'igralec'; end if;
  if p.value_locked then return 'zaklenjena'; end if;
  if p.repriced_week = to_char(now() at time zone 'UTC', 'IYYY-"W"IW') then return 'ta_teden'; end if;
  return null;
end;
$$;
revoke all on function public.ponovna_cena_ovira_igralca(bigint) from public, anon, authenticated;

create or replace function public.admin_ponovna_cena_potrdi(p_id bigint)
returns text language plpgsql security definer set search_path = public
as $$
declare
  z ponovne_cene;
  p players;
  v_ovira text;
  v_nova numeric;
  v_zadnja bigint;
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Le za administratorje.';
  end if;
  select * into z from ponovne_cene where id = p_id for update;
  if not found or z.stanje <> 'v_pregledu' then
    raise exception 'Zahtevek ni v pregledu.';
  end if;
  select * into p from players where id = z.player_id for update;
  if p.value is distinct from z.stara_cena then
    raise exception 'Cena se je od predloga spremenila (zdaj %): izračunaj znova.', p.value;
  end if;
  if ponovna_cena_v_roku(z.competition_id) then
    raise exception 'Rok kroga je manj kot 24 ur stran: potrdi po zaklepu kroga.';
  end if;
  v_ovira := ponovna_cena_ovira_igralca(z.player_id);
  if v_ovira is not null then
    raise exception 'Potrditev zdaj ni mogoča (%).', v_ovira;
  end if;

  -- Zadnja borzna vrstica igralca (zadnji obračunani krog).
  select pc.id into v_zadnja
    from price_changes pc join rounds r on r.id = pc.round_id
   where pc.player_id = z.player_id
   order by r.season desc, r.number desc, pc.id desc
   limit 1;
  v_nova := z.nova_cena;
  if v_zadnja is not null then
    v_nova := least(greatest(v_nova, (select najnizja from meje_borze())), (select najvisja from meje_borze()));
  end if;

  if v_nova is distinct from z.stara_cena then
    update players
       set value = v_nova,
           value_start = case when value_start is null then null
                              else round(value_start + (v_nova - z.stara_cena), 1) end,
           repriced_week = to_char(now() at time zone 'UTC', 'IYYY-"W"IW'),
           repriced_at = now()
     where id = z.player_id;
    -- Nočna borza ceno postavlja iz price_changes: zadnja vrstica nosi potrjeno ceno.
    if v_zadnja is not null then
      update price_changes set new_value = v_nova, changed_at = now() where id = v_zadnja;
    end if;
  end if;
  update ponovne_cene
     set stanje = 'potrjeno', nova_cena = v_nova, odlocil = auth.uid(), odloceno_at = now()
   where id = z.id;
  return 'potrjeno';
end;
$$;
revoke all on function public.admin_ponovna_cena_potrdi(bigint) from public, anon;
grant execute on function public.admin_ponovna_cena_potrdi(bigint) to authenticated;
