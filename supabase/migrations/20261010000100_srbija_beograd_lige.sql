-- Srbija: prve lige Fudbalskog saveza Beograda (vir `fsb`, www.fsb.org.rs).
--
-- Šifra lige je slug strani lige (`/takmicenje/<slug>/`) sezone 2026/27;
-- arhivi 2025/26 so v CLAUDE.md (Srbija) in se uvozu podajo z `arhiv=`.
-- Vir nima šifer igralcev (identiteta po imenu in klubu, kot pri MNZ) in ne
-- pove, kdo je šel z igrišča: zamenjani začetnik ima 90 minut (glej
-- scripts/viri/fsb.mjs).
--
-- Država RS (Srbija) pride z migracijo 20261009233100_srbija; brez nje bi
-- spodnji vpisi tiho ne vpisali ničesar, zato raje pademo.
--
-- Vse NEAKTIVNE; vklop po uvozu arhiva, razporeda, zapisnikov in cen.

do $$
begin
  if not exists (select 1 from countries where code = 'RS') then
    raise exception 'država RS manjka — najprej migracija 20261009233100_srbija';
  end if;
end $$;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'fsb', 'Fudbalski savez Beograda', 'Beograd', 'https://www.fsb.org.rs/', 701
  from countries d
 where d.code = 'RS'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fsb', v.koda, 1, v.vrstni, 6, false,
       'FS Beograda', 'https://www.fsb.org.rs/takmicenje/' || v.koda || '/'
  from countries d
  cross join (values
    ('rs-bg-srpska', 'Srpska liga Beograd', 'Srpska liga BG', 'srpska-liga-beograd', 1),
    ('rs-bg-zonska', 'Zonska liga Beograd', 'Zonska liga BG', 'zonska-liga-beograd', 2),
    ('rs-bg-pbl-a', 'Prva beogradska liga – grupa A', 'PBL A', 'prva-beogradska-liga-grupa-a', 3),
    ('rs-bg-pbl-b', 'Prva beogradska liga – grupa B', 'PBL B', 'prva-beogradska-liga-grupa-b', 4),
    ('rs-bg-pbl-c', 'Prva beogradska liga – grupa C', 'PBL C', 'prva-beogradska-liga-grupa-c-2', 5)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'fsb'
 where d.code = 'RS'
on conflict (slug) do nothing;
