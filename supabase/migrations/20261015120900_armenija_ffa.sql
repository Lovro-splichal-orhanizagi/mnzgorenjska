-- Armenija: država AM, zveza FFA in Prva liga (Առաջին խումբ, raven 2) z vira
-- `ffa` (ffa.am). Šifra lige je `<pot>/<skupina>`: pot strani tekmovanja pod
-- /en/ in id skupine (tekmovanja sezone) v gradniku Livewire — 902 = Prva liga
-- 2026/27; glej scripts/viri/ffa.mjs in CLAUDE.md (Armenija — vir ffa).
--
-- Arhiva ni: stran pokaže le tekočo skupino (pretekle sezone bi zahtevale
-- zahtevek Livewire, ki ga ne pošiljamo), zato so cene le iz tekoče sezone.
-- Amaterski ligi A (skupini A1 in A2) imata po 4 klube — kadra 15 igralcev z
-- največ tremi iz kluba ni mogoče sestaviti, zato nista vpisani.
--
-- Vmesnika v armenščini še ni in AM ni v matriki nočnega uvoza; liga je
-- NEAKTIVNA (vklop po uvozu razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('AM', 'Հայաստան', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'ffa', 'Հայաստանի ֆուտբոլի ֆեդերացիա', 'FFA', 'https://www.ffa.am/', 1501
  from countries d
 where d.code = 'AM'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'ffa', v.koda, 1, v.vrstni, 6, false,
       'FFA', 'https://www.ffa.am/en/' || split_part(v.koda, '/', 1)
  from countries d
  join federations f on f.code = 'ffa'
  cross join (values
    ('am-1-liga', 'Առաջին խումբ', 'Առաջին խումբ', 'first-league/902', 1)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'AM'
on conflict (slug) do nothing;
