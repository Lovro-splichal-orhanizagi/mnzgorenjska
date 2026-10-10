-- isci_igralce(iskanje, omejitev): igralci vseh aktivnih lig po imenu.
--
-- Izbirnik lige ob iskanju pokaže še igralce ("Name · Klub · Liga"), stran
-- Igralci pa ob praznem iskanju v ligi pove, v kateri drugi ligi je igralec.
-- Liga ni filter: obiskovalec pogosto ne ve, v kateri ligi (ali selekciji)
-- je igralec, ki ga išče.
--
-- Vrne le, kar je že na javni strani igralca (ime, klub, liga, pozicija,
-- cena), in le igralce AKTIVNIH lig, ker so neaktivne lige v vmesniku
-- nevidne. Anonimiziranih igralcev (`anonimiziran_at`) ne vrne: njihovo
-- "ime" je `#<id>`.
--
-- Iskanje je brez šumnikov in velikih črk, vrstni red besed ni pomemben
-- (helperji iz 20261004142300 in 20261004151700). Dve stopnji:
--   1. natančno: vsaka beseda stoji v imenu; najdaljšo najde trigramsko
--      kazalo `players_ime_brez_sumnikov_trgm`, ostale se preverijo na
--      peščici zadetkov;
--   2. podobno (le, če prva ne najde ničesar): tipkarske napake. `%`
--      (podobnost celega imena, privzeti prag 0.3, nato zaostren na 0.4)
--      ali `<%` (podobnost z eno besedo imena, privzeti prag 0.6 — "bohr"
--      najde "Bohar Denko Jan", čeprav je podobnost s celim imenom 0.17).
--      Oba operatorja zna kazalo; praga pg_trgm v funkciji ni mogoče
--      nastaviti (`set pg_trgm.…` pade, ker modul v seji še ni naložen),
--      zato veljata privzeta in ostrejši pogoj stoji izrecno.
-- Poizvedba gre skozi EXECUTE, da jo planer vedno načrtuje z dejanskim
-- nizom (generični načrt plpgsql bi lahko izbral pregled cele tabele).
create or replace function public.isci_igralce(iskanje text, omejitev int default 8)
returns table (
  id bigint,
  full_name text,
  klub text,
  liga text,
  liga_ime text,
  drzava text,
  pozicija text,
  cena numeric,
  aktiven boolean,
  liga_aktivna boolean,
  podobno boolean
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  -- Znaki vzorca LIKE ('%', '_', '\') bi se ujeli z vsem; odstranimo jih.
  cisto text := trim(regexp_replace(podpora_brez_sumnikov(iskanje), '[%_\\]+', ' ', 'g'));
  beseda text := podpora_najdaljsa_beseda(cisto);
  koliko int := least(greatest(coalesce(omejitev, 8), 1), 20);
  osnova constant text := $q$
    select p.id, p.full_name, t.name, c.slug, c.short_name, d.code,
           p.position, p.value::numeric, p.active, c.active, %s
      from players p
      join competitions c on c.id = p.competition_id and c.active
      join countries d on d.id = c.country_id
      join teams t on t.id = p.team_id
     where p.anonimiziran_at is null
       and %s
     order by %s
     limit $3
  $q$;
begin
  -- Vsaj tri znaki in vsaj ena beseda s tremi: krajše kazalo ne zna in
  -- "a b" bi prebral vse igralce.
  if length(replace(cisto, ' ', '')) < 3 or length(coalesce(beseda, '')) < 3 then
    return;
  end if;

  return query execute format(osnova,
    'false',
    $w$podpora_brez_sumnikov(p.full_name) like '%' || $2 || '%'
       and podpora_ujema(p.full_name, $1)$w$,
    $o$p.active desc,
       extensions.similarity(podpora_brez_sumnikov(p.full_name), $1) desc,
       p.value desc, p.id$o$)
    using cisto, beseda, koliko;
  if found then
    return;
  end if;

  return query execute format(osnova,
    'true',
    $w$(podpora_brez_sumnikov(p.full_name) operator(extensions.%) $1
        or $1 operator(extensions.<%) podpora_brez_sumnikov(p.full_name))
       and (extensions.similarity(podpora_brez_sumnikov(p.full_name), $1) >= 0.4
            or extensions.word_similarity($1, podpora_brez_sumnikov(p.full_name)) >= 0.6)$w$,
    $o$greatest(extensions.similarity(podpora_brez_sumnikov(p.full_name), $1),
                extensions.word_similarity($1, podpora_brez_sumnikov(p.full_name))) desc,
       p.active desc, p.value desc, p.id$o$)
    using cisto, beseda, koliko;
end;
$$;

revoke all on function public.isci_igralce(text, int) from public;
grant execute on function public.isci_igralce(text, int) to anon, authenticated;
