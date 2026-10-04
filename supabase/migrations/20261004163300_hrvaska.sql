-- Hrvaška: prve lige z vira HNS Semafor (semafor.hns.family, vir `hns`).
--
-- Semafor kaže COMET, v katerem HNS in županijske zveze vodijo vsa
-- tekmovanja; zapisnik (postavi, menjave, goli, kartoni) je enak od 3. NL do
-- III. ŽNL. Začnemo na severozahodu, ob slovenski meji: tri skupine Treće NL
-- in županijske lige Međimurja, Varaždina, Zagorja, Istre, Rijeke, Zagreba in
-- Koprivnice — 15 lig z lanskim arhivom (za cene). Seznam vseh je izpisal
-- `node scripts/hrvaske-lige.mjs`.
--
-- Vse se vpišejo NEAKTIVNE; vklopi se liga po ligi, ko ima uvožen arhiv,
-- razpored, zapisnike in cene — in ko je vmesnik preveden v hrvaščino.

insert into countries (code, name, sort_order)
values ('HR', 'Hrvatska', 3)
on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.koda, v.ime, v.kratko, v.stran, v.vrstni
  from countries d
  cross join (values
    ('hns', 'Hrvatski nogometni savez', 'HNS', 'https://semafor.hns.family/', 201),
    ('zns-medimurje', 'ŽNS Međimurje', 'Međimurje', 'https://semafor.hns.family/', 202),
    ('zns-varazdin', 'ŽNS Varaždin', 'Varaždin', 'https://semafor.hns.family/', 203),
    ('zns-krapina-zagorje', 'ŽNS Krapinsko-zagorski', 'Zagorje', 'https://semafor.hns.family/', 204),
    ('zns-istra', 'ŽNS Istra', 'Istra', 'https://semafor.hns.family/', 205),
    ('zns-rijeka', 'ŽNS Primorsko-goranski', 'Rijeka', 'https://semafor.hns.family/', 206),
    ('zns-zagreb', 'Zagrebački nogometni savez', 'Zagreb', 'https://semafor.hns.family/', 207),
    ('zns-koprivnica', 'ŽNS Koprivničko-križevački', 'Koprivnica', 'https://semafor.hns.family/', 208)
  ) as v(koda, ime, kratko, stran, vrstni)
 where d.code = 'HR'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, 1, v.vrstni, 6, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    ('hr-3nl-sjever', 'Treća NL Sjever', '3. NL S', 'hns', '115183774', 1),
    ('hr-3nl-zapad', 'Treća NL Zapad', '3. NL Z', 'hns', '114647051', 2),
    ('hr-3nl-centar', 'Treća NL Centar', '3. NL C', 'hns', '114608014', 3),
    ('hr-mz-premier', 'Međimurska Premier liga', 'MZ Premier', 'zns-medimurje', '114562601', 1),
    ('hr-mz-1mnl', 'I. Međimurska nogometna liga', 'MZ I.', 'zns-medimurje', '114562642', 2),
    ('hr-mz-2mnl', 'II. Međimurska nogometna liga', 'MZ II.', 'zns-medimurje', '114563249', 3),
    ('hr-vz-elitna', 'Elitna ŽNL — Varaždin', 'VŽ Elitna', 'zns-varazdin', '114667150', 1),
    ('hr-vz-1znl', 'Prva ŽNL — Varaždin', 'VŽ I.', 'zns-varazdin', '114669201', 2),
    ('hr-kz-1znl', '1. ŽNL — Krapinsko-zagorska', 'KZ I.', 'zns-krapina-zagorje', '114647266', 1),
    ('hr-is-elitna', 'Elitna liga — Istra', 'IS Elitna', 'zns-istra', '114701073', 1),
    ('hr-is-1znl', '1. ŽNL — Istra', 'IS I.', 'zns-istra', '114703568', 2),
    ('hr-ri-4nl', '4. NL — NS Rijeka', 'RI 4. NL', 'zns-rijeka', '114651788', 1),
    ('hr-zg-1liga', 'Prva zagrebačka liga', 'ZG I.', 'zns-zagreb', '114608298', 1),
    ('hr-zg-2liga', 'Druga zagrebačka liga', 'ZG II.', 'zns-zagreb', '114608605', 2),
    ('hr-kc-elitna', 'Elitna ŽNL — Koprivnica', 'KC Elitna', 'zns-koprivnica', '114703534', 1)
  ) as v(slug, ime, kratko, zveza, koda, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'HR'
on conflict (slug) do nothing;
