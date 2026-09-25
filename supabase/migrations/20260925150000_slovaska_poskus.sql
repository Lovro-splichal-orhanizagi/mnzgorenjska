-- Slovaška: poskusna liga (IV. liga Stredoslovenského futbalového zväzu).
--
-- Prva država poleg Slovenije. Podatke da javni API Sportneta, ki ga bere tudi
-- futbalnet.sk (vir `sportnet`, glej scripts/viri/sportnet.mjs).
--
-- Liga se vpiše NEAKTIVNA in tako ostane, dokler SFZ/Sportnet ne potrdi, da
-- smemo podatke uporabljati. Nočni uvoz bere le aktivne lige, vmesnik prav
-- tako — v produkciji ta migracija ne spremeni ničesar, kar bi kdo videl.
--
-- Ime države je v njenem jeziku: izbira države ob prvem obisku je edino
-- mesto, kjer ga obiskovalec vidi, in Slovak išče "Slovensko", ne "Slovaška".

insert into countries (code, name, sort_order)
values ('SK', 'Slovensko', 2)
on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'ssfz', 'Stredoslovenský futbalový zväz', 'SsFZ',
       'https://sportnet.sme.sk/futbalnet/z/ssfz/', 101
  from countries d
 where d.code = 'SK'
on conflict (code) do nothing;

-- Šifra `<appSpace>/<competitionId>`; vsaka sezona ima svoj competitionId.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select 'sk-ssfz-4liga', 'IV. liga — SsFZ', 'SsFZ IV.', d.id, f.id,
       'sportnet', 'SsFZ/6a154cf844ff24612e07e083', 1, 1, 6, false
  from countries d
  join federations f on f.code = 'ssfz'
 where d.code = 'SK'
on conflict (slug) do nothing;
