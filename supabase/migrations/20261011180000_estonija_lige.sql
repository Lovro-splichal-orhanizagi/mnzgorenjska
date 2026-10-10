-- Estonija: vse lige odraslih Eesti Jalgpalli Liita (EJL) z vira `jalgpall`
-- (jalgpall.ee) — Premium liiga, Esiliiga, Esiliiga B, II liiga, obe skupini
-- II liige B, tri skupine III liige in dve IV liige.
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"). Šifra lige je
-- `<id lige>/<leto>`; ob novi sezoni se popravi leto. Arhivi (`52/2025` …)
-- so v CLAUDE.md (Estonija — vir `jalgpall`).
--
-- Država EE in stolpec `sezona_koledarska` prideta z migracijama
-- 20261011140000_estonija in 20261011140100_koledarska_sezona.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

do $$
begin
  if not exists (select 1 from countries where code = 'EE') then
    raise exception 'država EE manjka — najprej migracija 20261011140000_estonija';
  end if;
end $$;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'ejl', 'Eesti Jalgpalli Liit', 'EJL', 'https://jalgpall.ee/', 901
  from countries d
 where d.code = 'EE'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'jalgpall', v.koda, 1, v.vrstni, 6, false,
       'EJL', 'https://jalgpall.ee/voistlused/' || split_part(v.koda, '/', 1) || '/liigad/calendar', true
  from countries d
  cross join (values
    ('ee-premium-liiga', 'A. Le Coq Premium liiga', 'Premium liiga', '52/2026', 1),
    ('ee-esiliiga', 'Esiliiga', 'Esiliiga', '53/2026', 2),
    ('ee-esiliiga-b', 'Esiliiga B', 'Esiliiga B', '186/2026', 3),
    ('ee-ii-liiga', 'II liiga', 'II liiga', '536/2026', 4),
    ('ee-ii-liiga-b-pohi-laas', 'II liiga B Põhi-Lääs', 'II B Põhi-Lääs', '537/2026', 5),
    ('ee-ii-liiga-b-louna-ida', 'II liiga B Lõuna-Ida', 'II B Lõuna-Ida', '538/2026', 6),
    ('ee-iii-liiga-pohi-laas', 'III liiga Põhi-Lääs', 'III Põhi-Lääs', '549/2026', 7),
    ('ee-iii-liiga-pohi-ida', 'III liiga Põhi-Ida', 'III Põhi-Ida', '548/2026', 8),
    ('ee-iii-liiga-louna-ida', 'III liiga Lõuna-Ida', 'III Lõuna-Ida', '550/2026', 9),
    ('ee-iv-liiga-pohja-ida', 'IV liiga Põhja/Ida', 'IV Põhja/Ida', '267/2026', 10),
    ('ee-iv-liiga-pohja-laane', 'IV liiga Põhja/Lääne', 'IV Põhja/Lääne', '268/2026', 11)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'ejl'
 where d.code = 'EE'
on conflict (slug) do nothing;
