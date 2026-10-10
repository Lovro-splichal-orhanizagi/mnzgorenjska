-- Srbija: zone, Vojvođanske lige ter okružne, područne, međuopštinske in
-- gradske lige 2026/27 (vir `fssid`, 47 lig).
--
-- Bloki šifer COMET so iz pometanja fss.rs (11. 10. 2026); vsak je preverjen kot
-- članski (vikend popoldne, vaški in mestni klubi, brez akademij; sodniška
-- trojka in delegat, zone in VFL še kontrolor suđenja). Izpuščeni so mladinski,
-- veteranski, ženski in beograjski bloki (te bere `fsb`). Imena so z zvez
-- (stran lige, COMET izpis, bilten, adresar); kjer jih ni, iz medijev ali
-- nevtralno z oznako (ime nepotrjeno). Glej CLAUDE.md (Srbija — vir fssid).
--
-- Zveza v izbirniku je regijska (FSV, FSRZS, FSRIS); okružne in područne
-- zveze so njihove članice, organizator je v komentarju vrstice. Vir v nogi
-- je FSS, ker zapisnike objavlja FSS.
--
-- Vse NEAKTIVNE, arhiva ni (šifre 2025/26 niso znane). Datumi neodigranih
-- krogov: fsv.rs (VFL) in fsris.org.rs (zone FSRIS), drugod ocena
-- (`rounds.datum_ocenjen`).

do $$
begin
  if not exists (select 1 from federations where code in ('fsris', 'fsrzs', 'fsv') having count(*) = 3) then
    raise exception 'zveze fsris, fsrzs, fsv manjkajo — najprej migracija 20261011181100_srbija_srpske_lige';
  end if;
end $$;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fssid', v.koda, 1, v.raven, 6, false,
       'FSS', 'https://fss.rs/'
  from countries d
  cross join (values
    -- FSV (Vojvodina)
    ('rs-vfl-sever', 'Vojvođanska liga Sever', 'VFL Sever', '75938263-75938444', 'fsv', 2),  -- FSV, 14
    ('rs-vfl-istok', 'Vojvođanska liga Istok', 'VFL Istok', '75963094-75963275', 'fsv', 2),  -- FSV, 14
    ('rs-vfl-jug', 'Vojvođanska liga Jug', 'VFL Jug', '75940439-75940620', 'fsv', 2),        -- FSV, 14
    ('rs-pancevo-pfl', 'Prva južnobanatska područna liga', 'PFL Pančevo', '75849222-75849403', 'fsv', 3),  -- FS područja Pančevo, 14
    ('rs-subotica-pfl', 'Područna liga Subotica', 'PFL Subotica', '75879887-75880126', 'fsv', 3),       -- PFS Subotica, 16
    ('rs-sombor-pfl', 'Područna liga Sombor', 'PFL Sombor', '75897207-75897446', 'fsv', 3),             -- PFS Sombor, 16
    ('rs-zrenjanin-pfl', 'Područna liga Zrenjanin', 'PFL Zrenjanin', '76054893-76055132', 'fsv', 3),    -- FS područja Zrenjanin, 16
    ('rs-srem-pfl', 'Sremska liga', 'Sremska liga', '76051146-76051385', 'fsv', 3),                     -- PFS Srem, 16 (COMET: PFL Srem)
    ('rs-ns-prva', 'Prva novosadska liga', 'Prva novosadska', '76038544-76038783', 'fsv', 3),           -- FS Grada Novog Sada, 16
    ('rs-srem-mfl-zapad', 'Međuopštinska liga Srem Zapad', 'MFL Srem Zapad', '76097001-76097182', 'fsv', 4),  -- PFS Srem, 14
    ('rs-sombor-mfl', 'Međuopštinska liga Sombor', 'MFL Sombor', '75954296-75954477', 'fsv', 4),       -- GFS Sombor, 14; ime iz medijev (025.rs)
    ('rs-backa-palanka', 'Liga Bačka Palanka', 'Bačka Palanka', '76033904-76034085', 'fsv', 4),        -- OFS Bačka Palanka?, 14; ime nepotrjeno
    -- FSRZS (Zapadna Srbija)
    ('rs-zona-drina', 'Zona Drina', 'Zona Drina', '75863516-75863647', 'fsrzs', 2),    -- FSRZS, 12
    ('rs-zona-dunav', 'Zona Dunav', 'Zona Dunav', '75862803-75862934', 'fsrzs', 2),    -- FSRZS, 12
    ('rs-zona-morava', 'Zona Morava', 'Zona Morava', '75862092-75862223', 'fsrzs', 2), -- FSRZS, 12
    ('rs-kolubara-okruzna', 'Okružna liga Kolubara', 'OL Kolubara', '75882160-75882341', 'fsrzs', 3),  -- FS Kolubarskog okruga, 14
    ('rs-kolubara-mofl-istok', 'MOFL Istok (Kolubara)', 'MOFL Istok', '75902301-75902482', 'fsrzs', 4),  -- FS Kolubarskog okruga, 14
    ('rs-kolubara-mofl-zapad', 'MOFL Zapad (Kolubara)', 'MOFL Zapad', '75946952-75947133', 'fsrzs', 4),  -- FS Kolubarskog okruga, 14
    ('rs-macva-okruzna', 'Mačvanska okružna liga', 'OL Mačva', '76148843-76149024', 'fsrzs', 3),          -- FS Mačvanskog okruga, 14
    ('rs-macva-mfl-jadar', 'Međuopštinska liga Jadar', 'MFL Jadar', '76187411-76187592', 'fsrzs', 4),    -- FS Mačvanskog okruga, 14
    ('rs-macva-mfl-macva', 'Međuopštinska liga Mačva', 'MFL Mačva', '76219059-76219240', 'fsrzs', 4),    -- FS Mačvanskog okruga, 14
    ('rs-macva-mfl-pocerina', 'Međuopštinska liga Pocerina', 'MFL Pocerina', '76217686-76217867', 'fsrzs', 4),  -- FS Mačvanskog okruga, 14
    ('rs-moravica-okruzna', 'Okružna Moravička liga', 'OL Moravica', '75969523-75969704', 'fsrzs', 3),  -- FS Moravičkog okruga, 14
    ('rs-sumadija-okruzna', 'Šumadijska okružna liga', 'OL Šumadija', '76126804-76126985', 'fsrzs', 3), -- FS Šumadijskog okruga, 14
    ('rs-kg-prva', 'Prva gradska liga Kragujevac', '1. GL Kragujevac', '76022530-76022711', 'fsrzs', 4),  -- FS grada Kragujevca, 14
    ('rs-kg-druga', 'Druga gradska liga Kragujevac', '2. GL Kragujevac', '76024362-76024493', 'fsrzs', 5), -- FS grada Kragujevca, 12
    ('rs-kg-treca', 'Treća gradska liga Kragujevac', '3. GL Kragujevac', '76025757-76025938', 'fsrzs', 6), -- FS grada Kragujevca, 14
    ('rs-topola', 'Liga Topola', 'Topola', '76174925-76175056', 'fsrzs', 5),                          -- (OFS Topola?), 12; ime nepotrjeno
    ('rs-podunavlje-okruzna', 'Podunavska okružna liga', 'OL Podunavlje', '75900760-75900941', 'fsrzs', 3),  -- FS Podunavskog okruga, 14
    ('rs-branicevo-okruzna', 'Braničevska okružna liga', 'OL Braničevo', '76144655-76144836', 'fsrzs', 3),   -- FS Braničevskog okruga, 14
    ('rs-branicevo-mfl-dunav', 'MFL Dunav (Braničevo)', 'MFL Dunav', '76146941-76147122', 'fsrzs', 4),     -- FS Braničevskog okruga, 14
    ('rs-branicevo-mfl-mlava', 'MFL Mlava (Braničevo)', 'MFL Mlava', '76155052-76155233', 'fsrzs', 4),     -- FS Braničevskog okruga, 14
    -- FSRIS (Istočna Srbija)
    ('rs-zona-zapad', 'Zona Zapad', 'Zona Zapad', '75975050-75975181', 'fsris', 2),     -- FSRIS, 12
    ('rs-zona-centar', 'Zona Centar', 'Zona Centar', '75976635-75976766', 'fsris', 2),  -- FSRIS, 12
    ('rs-zona-istok', 'Zona Istok', 'Zona Istok', '76044412-76044543', 'fsris', 2),     -- FSRIS, 12
    ('rs-zona-jug', 'Zona Jug', 'Zona Jug', '75920107-75920238', 'fsris', 2),           -- FSRIS, 12
    ('rs-pomoravlje-okruzna', 'Pomoravska okružna liga', 'OL Pomoravlje', '75992166-75992471', 'fsris', 3),  -- FS Pomoravskog okruga, 18
    ('rs-pomoravlje-mfl-sever', 'Međuopštinska liga Sever (Pomoravlje)', 'MFL Sever', '75995108-75995347', 'fsris', 4),  -- FS Pomoravskog okruga, 16
    ('rs-pomoravlje-mfl-jug', 'Međuopštinska liga Jug (Pomoravlje)', 'MFL Jug', '75993822-75994061', 'fsris', 4),        -- FS Pomoravskog okruga, 16
    ('rs-rasina-prva', 'Rasinska prva liga', 'Rasinska 1.', '76045363-76045602', 'fsris', 3),              -- FS Rasinskog okruga, 16
    ('rs-rasina-druga-zapad', 'Rasinska druga liga Zapad', 'Rasinska 2. Zapad', '76046778-76046909', 'fsris', 4),  -- FS Rasinskog okruga, 12
    ('rs-rasina-druga-istok', 'Rasinska druga liga Istok', 'Rasinska 2. Istok', '76049679-76049860', 'fsris', 4),  -- FS Rasinskog okruga, 14
    ('rs-krusevac-morava', 'Gradska liga Morava (Kruševac)', 'GL Morava', '75957933-75958088', 'fsris', 5),  -- FS grada Kruševca, 13 (lih)
    ('rs-krusevac-rasina', 'Gradska liga Rasina (Kruševac)', 'GL Rasina', '75959913-75960068', 'fsris', 5),  -- FS grada Kruševca, 13 (lih)
    ('rs-zajecar-okruzna', 'Zaječarska okružna liga', 'OL Zaječar', '76162366-76162605', 'fsris', 3),  -- FS Zaječarskog okruga, 16; ime iz medijev
    ('rs-bor-okruzna', 'Okružna liga Bor', 'OL Bor', '76083154-76083335', 'fsris', 3),                 -- FS Borskog okruga, 14; ime iz medijev
    ('rs-pirot-okruzna', 'Liga Pirotski okrug', 'Pirotski okrug', '76156082-76156171', 'fsris', 3)     -- FS Pirotskog okruga, 10; ime nepotrjeno
  ) as v(slug, ime, kratko, koda, zveza, raven)
  join federations f on f.code = v.zveza
 where d.code = 'RS'
on conflict (slug) do nothing;
