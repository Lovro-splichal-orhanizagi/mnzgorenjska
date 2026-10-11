-- Srbija: omladinske lige (U19, omladinci) 2026/27 — najstarejša mladinska
-- kategorija. Kadeti (U17), pioniri (U15) in mlajši NISO vpisani, prav tako
-- ne "Liga mlađih omladinaca Beograda" (U18).
--
-- Devet lig, trije viri:
-- - `fss`: Omladinska liga Srbije (stran lige na fss.rs, arhiv 2025/26
--   `omladinska-liga-srbije-25-26`, 16 klubov, 240 tekem).
-- - `fsb`: Prva, Druga in Treća omladinska liga Beograda (strani lig na
--   fsb.org.rs, arhiv 2025/26 brez letnice v slugu).
-- - `fssid`: bloki šifer COMET (pometanje fss.rs 11. 10. 2026). Kategorija
--   potrjena na strani zveze: Omladinska liga Vojvodine (fsv.rs, stran lige
--   in PDF "Sastav Omladinske lige Vojvodine 2026/2027", 14/14 klubov),
--   Druga omladinska liga Vojvodine Sever in Jug (fsv.rs, 12/12), Prva
--   omladinska liga FSRZS (COMET tabela tekmovanja 75907894, 16/16) in Druga
--   omladinska liga "Zapadno-moravska" FSRZS (COMET tabela 75918191, 13/13).
--   Kadetski bloki istih zvez (isti klubi) so izpuščeni: Kadetska liga
--   Vojvodine 76002700, Pionirska 76003873, Druga kadetska Sever 76059057 in
--   Jug 76060043, Prva kadetska FSRZS 75910179 ... (CLAUDE.md).
--
-- Kot slovenske in slovaške mladinske lige: prvi_fantasy_krog = 2,
-- rok_pomak_ur = 2 (tekme dopoldne). Vse NEAKTIVNE; vklop po uvozu
-- (`vklopi_ligo_sredi_sezone`). Zveza v izbirniku: fss, fsb, fsv, fsrzs.

do $$
begin
  if not exists (select 1 from federations where code in ('fss', 'fsb', 'fsv', 'fsrzs') having count(*) = 4) then
    raise exception 'zveze fss, fsb, fsv, fsrzs manjkajo — najprej srbske migracije (20261010000100, 20261010153300, 20261011181100)';
  end if;
end $$;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, v.vir, v.koda, 2, v.vrstni, 2, false,
       case v.vir when 'fsb' then 'FS Beograda' else 'FSS' end,
       case v.vir
         when 'fss' then 'https://fss.rs/takmicenje/' || v.koda || '/'
         when 'fsb' then 'https://www.fsb.org.rs/takmicenje/' || v.koda || '/'
         else 'https://fss.rs/'
       end
  from countries d
  cross join (values
    ('rs-u19-srbija', 'Omladinska liga Srbije', 'OLS U19', 'fss', 'omladinska-liga-srbije-26-27', 'fss', 21),               -- 14 klubov
    ('rs-u19-bg-1', 'Prva omladinska liga Beograda', 'U19 BG 1.', 'fsb', 'prva-omladinska-liga-beograda-2026-27', 'fsb', 21),  -- 14
    ('rs-u19-bg-2', 'Druga omladinska liga Beograda', 'U19 BG 2.', 'fsb', 'druga-omladinska-liga-beograda-2026-27', 'fsb', 22), -- 14
    ('rs-u19-bg-3', 'Treća omladinska liga Beograda', 'U19 BG 3.', 'fsb', 'treca-omladinska-liga-beograda-2026-27', 'fsb', 23), -- 12
    ('rs-u19-vojvodina', 'Omladinska liga Vojvodine', 'OLV U19', 'fssid', '76001621-76001802', 'fsv', 21),            -- FSV, 14
    ('rs-u19-vojvodina-sever', 'Druga omladinska liga Vojvodine Sever', 'U19 OLV 2. Sever', 'fssid', '76057523-76057654', 'fsv', 22),  -- FSV, 12
    ('rs-u19-vojvodina-jug', 'Druga omladinska liga Vojvodine Jug', 'U19 OLV 2. Jug', 'fssid', '76058296-76058427', 'fsv', 22),        -- FSV, 12
    ('rs-u19-zapad', 'Prva omladinska liga FSRZS', 'U19 Zapad 1.', 'fssid', '75908331-75908570', 'fsrzs', 21),        -- FSRZS, 16
    ('rs-u19-zapad-zm', 'Druga omladinska liga Zapadno-moravska', 'U19 Zapad 2. ZM', 'fssid', '75924544-75924699', 'fsrzs', 22)  -- FSRZS, 13 (lih)
  ) as v(slug, ime, kratko, vir, koda, zveza, vrstni)
  join federations f on f.code = v.zveza
 where d.code = 'RS'
on conflict (slug) do nothing;
