-- Ukrajina, Ternopilska oblast: zveza AFT (Асоціація футболу Тернопільщини)
-- in njeni ligi z vira `aft` (aft.com.ua): Вища ліга (raven 5 v Ukrajini,
-- pod AAFU) in Перша ліга (raven 6) oblastnega prvenstva.
--
-- Sezona je koledarsko leto (`sezona_koledarska`, "2026"; maj–oktober).
-- Šifra lige je id turnirja `/tournament/champinship/<id>` (glej
-- scripts/viri/aft.mjs); vsaka sezona ima svojega, ob novi sezoni se šifra
-- popravi. Sezona 2026 je ob vpisu končana (Вища 18. krog, Перша 20. krog,
-- 11. 10.): uvozi se kot tekoča in spomladi 2027 postane arhiv.
--
-- Postave so v novicah (ponatis iz časopisa Газета 1), ne na strani tekme;
-- glej CLAUDE.md (Ukrajina — vir aft).
--
-- Vmesnika v ukrajinščini še ni in UA ni v matriki nočnega uvoza; lige so
-- NEAKTIVNE (in tudi sicer do uvoza razporeda, zapisnikov in cen).

insert into countries (code, name, sort_order) values ('UA', 'Україна', 14) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'aft', 'Асоціація футболу Тернопільщини', 'АФТ', 'https://aft.com.ua/', 1402
  from countries d
 where d.code = 'UA'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'aft', v.koda, 1, v.vrstni, 6, false,
       'АФТ', 'https://aft.com.ua/tournament/champinship/' || v.koda, true
  from countries d
  join federations f on f.code = 'aft'
  cross join (values
    ('ua-te-vyshcha', 'Вища ліга Тернопільщини', 'Тернопіль Вища', '36', 11),
    ('ua-te-persha', 'Перша ліга Тернопільщини', 'Тернопіль Перша', '37', 12)
  ) as v(slug, ime, kratko, koda, vrstni)
 where d.code = 'UA'
on conflict (slug) do nothing;
