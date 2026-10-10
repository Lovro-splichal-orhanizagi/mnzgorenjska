-- Srbija: državni ligi FSS (vir `fss`, fss.rs) — Mozzart Bet Superliga in
-- Prva liga Srbije. Šifra je slug strani lige sezone 2026/27; arhiv 2025/26
-- (osnovni del, brez play-off/play-out) je v CLAUDE.md (Srbija — vir fss).
-- Vratarja da prvaliga.rs (ista šifra tekme COMET).
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

do $$
begin
  if not exists (select 1 from countries where code = 'RS') then
    raise exception 'država RS manjka — najprej migracija 20261009233100_srbija';
  end if;
end $$;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'fss', 'Fudbalski savez Srbije', 'Srbija', 'https://fss.rs/', 700
  from countries d
 where d.code = 'RS'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fss', v.koda, 1, v.vrstni, 6, false,
       'FSS', 'https://fss.rs/takmicenje/' || v.koda || '/'
  from countries d
  cross join (values
    ('rs-superliga', 'Superliga Srbije', 'Superliga', 'mozzart-bet-super-liga-srbije-26-27', 1),
    ('rs-prva-liga', 'Prva liga Srbije', 'Prva liga', 'mozzart-bet-prva-liga-srbije-26-27', 2)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'fss'
 where d.code = 'RS'
on conflict (slug) do nothing;
