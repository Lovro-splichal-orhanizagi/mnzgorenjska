-- Srbija: kadetske lige (U17), Liga mlađih omladinaca Beograda (U18) in
-- ženski državni ligi 2026/27 (odobritev lastnika 4. 11. 2026). Devet lig,
-- trije viri, vse NEAKTIVNE.
--
-- - `fss`: Kadetska liga Srbije (blok COMET 75828245), Super liga in Prva
--   liga Srbije za žene. Vratar je s prvaliga.rs; če ga tam za ženske ni,
--   ostane opozorilo "vratarjev ni" in pozicijo določi glasovanje.
-- - `fsb`: Prva, Druga in Treća liga kadeta Beograda ter Liga mlađih
--   omladinaca Beograda. Trki imen v Tretji (BORAC, JEDINSTVO, OMLADINAC) so
--   v `IME_V_LIGI` (fsb.mjs), "Mesto:" domačih tekem 4. 11. 2026.
-- - `fssid`: kadetska bloka z mejama, preverjenima 4. 11. 2026 (zadnja šifra
--   obstaja, naslednja "Utakmica ne postoji"): Kadetska liga Vojvodine
--   76002700-76002881 (14 klubov) in Prva kadetska liga FSRZS
--   75910179-75910418 (16). Datumi neodigranih krogov so ocenjeni.
--
-- Izpuščeni: Druga kadetska Vojvodine Sever (76059057) in Jug (76060043) —
-- šifra za blokom 12 klubov še obstaja, meje niso znane; Druga kadetska FSRZS
-- Zapadno-moravska (75932006, pri 13 klubih zadnje šifre ni), Kolubarsko-
-- mačvanska in Podunavsko-šumadijska (število klubov ni znano) — meje naj
-- najde `node scripts/srbija-blok.mjs <šifra>`. Druga liga za žene FSB: stran nima sezone v naslovu, vir je ne
-- prebere. Pioniri (U15) in mlajši niso vpisani.
--
-- Mladinske: prvi_fantasy_krog = 2, rok_pomak_ur = 2; ženske kot člani fss:
-- prvi_fantasy_krog = 1, rok_pomak_ur = 6.

do $$
begin
  if not exists (select 1 from federations where code in ('fss', 'fsb', 'fsv', 'fsrzs') having count(*) = 4) then
    raise exception 'zveze fss, fsb, fsv, fsrzs manjkajo — najprej srbske migracije';
  end if;
end $$;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, v.prvi, v.vrstni, v.pomak, false,
       case v.vir when 'fsb' then 'FS Beograda' else 'FSS' end,
       case v.vir
         when 'fss' then 'https://fss.rs/takmicenje/' || v.koda || '/'
         when 'fsb' then 'https://www.fsb.org.rs/takmicenje/' || v.koda || '/'
         else 'https://fss.rs/'
       end
  from countries d
  cross join (values
    ('rs-zene-superliga', 'Super liga Srbije za žene', 'SL žene', 'fss', 'super-liga-srbije-z-26-27', 'fss', 1, 6, 11),           -- 8 klubov
    ('rs-zene-prva', 'Prva liga Srbije za žene', 'PL žene', 'fss', 'prva-liga-srbije-z-26-27', 'fss', 1, 6, 12),                   -- 9
    ('rs-u17-srbija', 'Kadetska liga Srbije', 'KLS U17', 'fss', 'kadetska-liga-srbije-26-27', 'fss', 2, 2, 31),                    -- 14
    ('rs-u18-bg', 'Liga mlađih omladinaca Beograda', 'U18 BG', 'fsb', 'liga-mladjih-omladinaca-beograda-2026-27', 'fsb', 2, 2, 24), -- 16
    ('rs-u17-bg-1', 'Prva liga kadeta Beograda', 'U17 BG 1.', 'fsb', 'prva-liga-kadeta-beograda-2026-27', 'fsb', 2, 2, 31),        -- 14
    ('rs-u17-bg-2', 'Druga liga kadeta Beograda', 'U17 BG 2.', 'fsb', 'druga-liga-kadeta-beograda-2026-27', 'fsb', 2, 2, 32),      -- 14
    ('rs-u17-bg-3', 'Treća liga kadeta Beograda', 'U17 BG 3.', 'fsb', 'treca-liga-kadeta-beograda-2026-27', 'fsb', 2, 2, 33),      -- 15 (lih)
    ('rs-u17-vojvodina', 'Kadetska liga Vojvodine', 'KLV U17', 'fssid', '76002700-76002881', 'fsv', 2, 2, 31),                     -- FSV, 14
    ('rs-u17-zapad', 'Prva kadetska liga FSRZS', 'U17 Zapad 1.', 'fssid', '75910179-75910418', 'fsrzs', 2, 2, 31)                  -- FSRZS, 16
  ) as v(slug, ime, kratko, vir, koda, zveza, prvi, pomak, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RS'
on conflict (slug) do nothing;
