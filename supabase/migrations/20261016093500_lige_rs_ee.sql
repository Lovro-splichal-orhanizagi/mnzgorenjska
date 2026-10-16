-- Srbija: nižje članske lige 2026/27 z vira `fssid` (bloki šifer COMET na
-- fss.rs), in Estonija: U19 Eliitliiga z vira `jalgpall`.
--
-- Srbija. Bloke je našlo pometanje šifer fss.rs (15. 10. 2026); vsak je ves
-- prebran in preverjen (vikend popoldne, vaški klubi, sodnik in delegat,
-- zapisniki 11 + 11, goli = izid). Prva opštinska liga FSOL in Opštinska liga
-- Sopot sta beograjski (zveza `fsb`), a ju beremo prek `fssid`: stran FSB loči
-- dva kluba MLADOST v isti ligi le po imenu, COMET jima doda kraj (Sopot:
-- `IME_V_BLOKU` v scripts/viri/fssid.mjs). Malo Crniće je trikrožna liga
-- (8 klubov, 84 šifer), Krupanj štirikrožna (6 klubov, 60 šifer) —
-- `razberiKodo` zna k × N(N−1)/2. Kraji klubov MOL Kikinda-Žitište so s
-- stadionov domačih tekem (`IME_V_BLOKU`). Arhiva ni; datumi neodigranih
-- krogov so ocena (`rounds.datum_ocenjen`). Glej CLAUDE.md (Srbija — vir fssid).
--
-- Estonija. U19 Eliitliiga (EJL, `89/<leto>`, arhiv `89/2025`), koledarska
-- sezona. Ekipe so "U-19 <klub>"; vir predpono odreže, da je klub skupen s
-- člani (kot pri drugih U19). Kot ostale U19: prvi_fantasy_krog = 2,
-- rok_pomak_ur = 2.
--
-- Vse NEAKTIVNE; obstoječe zveze (fsb, fsv, fsrzs, fsris, ejl).

do $$
begin
  if not exists (select 1 from federations where code in ('fsb', 'fsv', 'fsrzs', 'fsris', 'ejl') having count(*) = 5) then
    raise exception 'zveze fsb, fsv, fsrzs, fsris ali ejl manjkajo';
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
    ('rs-kikinda-mol', 'Međuopštinska liga Kikinda-Žitište', 'MOL Kikinda', '76235200-76235409', 'fsv', 4),          -- MFS Kikinda-Žitište, 15 (lih)
    ('rs-vrsac-mol', 'Međuopštinska liga Vršac', 'MOL Vršac', '76475945-76476034', 'fsv', 4),                         -- Vršac, Bela Crkva, Alibunar, 10; ime nepotrjeno
    ('rs-subotica-gradska', 'Gradska liga Subotica', 'GL Subotica', '75788469-75788578', 'fsv', 4),                  -- mesto Subotica in vasi, 11 (lih); ime nepotrjeno
    ('rs-bg-lazarevac-1', 'Prva opštinska liga Lazarevac', 'Lazarevac 1', '76177421-76177510', 'fsb', 8),             -- FS opštine Lazarevac (FSOL), 10
    ('rs-bg-sopot', 'Opštinska liga Sopot', 'OL Sopot', '77527270-77527325', 'fsb', 12),                             -- FS Sopot, 8
    ('rs-malo-crnice', 'Opštinska liga Malo Crniće', 'OL Malo Crniće', '76183530-76183613', 'fsrzs', 5),            -- 8, trikrožna; ime nepotrjeno
    ('rs-krupanj', 'Opštinska liga Krupanj', 'OL Krupanj', '77542317-77542376', 'fsrzs', 5),                         -- 6, štirikrožna; ime nepotrjeno
    ('rs-pirot-opstinska', 'Opštinska liga Pirot', 'OL Pirot', '76461361-76461416', 'fsris', 4)                      -- 8; ime nepotrjeno
  ) as v(slug, ime, kratko, koda, zveza, raven)
  join federations f on f.code = v.zveza
 where d.code = 'RS'
on conflict (slug) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select 'ee-u19-eliitliiga', 'U19 Eliitliiga', 'U19 Eliitliiga', d.id, f.id,
       'jalgpall', '89/2026', 2, 21, 2, false,
       'EJL', 'https://jalgpall.ee/voistlused/89/liigad/calendar', true
  from countries d
  join federations f on f.code = 'ejl'
 where d.code = 'EE'
on conflict (slug) do nothing;
