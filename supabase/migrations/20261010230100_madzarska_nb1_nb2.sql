-- Madžarska: NB I in NB II, NEAKTIVNI.
--
-- Obe ligi sta v MLSZ Adatbank pod zvezo 0, a s SPONZORSKIM imenom, ne "NB I"
-- (2026/27: OTP Bank Liga 33586, Merkantil Bank Liga 33587; 2025/26: Fizz Liga
-- 31362, Merkantil Bank Liga 31363). Zapisnik je enak županijskim, vir `mlsz`
-- ju bere brez sprememb. NB I ima 33 krogov (12 klubov, trikrožno), NB II 30.
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'mlsz', v.koda, 1, v.vrstni, 6, false,
       'MLSZ Adatbank', 'https://adatbank.mlsz.hu/league/' || v.koda || '/1.html'
  from countries d
  cross join (values
    ('hu-nb1', 'NB I (OTP Bank Liga)', 'NB I', 'mlsz', '67/0/33586', -2),
    ('hu-nb2', 'NB II (Merkantil Bank Liga)', 'NB II', 'mlsz', '67/0/33587', -1)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HU'
on conflict (slug) do nothing;
