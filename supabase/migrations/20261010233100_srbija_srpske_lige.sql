-- Srbija: Srpska liga Istok, Zapad in Vojvodina 2026/27 (vir `fssid`).
--
-- Regijske zveze zapisnikov ne objavljajo; FSS na fss.rs izriše vsako tekmo
-- COMET po šifri. Tekmovanje-sezona je strnjen blok N×(N−1) šifer, urejen po
-- krogih — šifra lige je "<od>-<do>". Glej CLAUDE.md (Srbija — vir fssid).
-- Zveze so regijske (FSRIS, FSRZS, FSV), vir v nogi pa FSS, ker zapisnike
-- objavlja FSS.
--
-- Vse NEAKTIVNE. Arhiva ni (šifre 2025/26 niso znane): cene le iz tekoče
-- sezone. Vklop po uvozu razporeda, zapisnikov, pozicij in cen.
--
-- `rounds.datum_ocenjen`: fss.rs datuma neodigrane tekme ne pozna. Kjer ga
-- nima niti regijska zveza, uvoz razporeda krog datira z oceno (prejšnji krog
-- + 7 dni) in ga označi; rok takega kroga je le približen.

do $$
begin
  if not exists (select 1 from countries where code = 'RS') then
    raise exception 'država RS manjka — najprej migracija 20261009233100_srbija';
  end if;
end $$;

alter table rounds add column if not exists datum_ocenjen boolean not null default false;
comment on column rounds.datum_ocenjen is
  'Datum in rok kroga sta ocenjena (vir ne pozna datuma neodigranih tekem, glej scripts/viri/fssid.mjs).';

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, v.code, v.name, v.short_name, v.site_url, v.sort_order
  from countries d
  cross join (values
    ('fsris', 'Fudbalski savez regiona Istočne Srbije', 'Istok', 'https://fsris.org.rs/', 702),
    ('fsrzs', 'Fudbalski savez regiona Zapadne Srbije', 'Zapad', 'https://fsrzs.com/', 703),
    ('fsv', 'Fudbalski savez Vojvodine', 'Vojvodina', 'https://fsv.rs/', 704)
  ) as v(code, name, short_name, site_url, sort_order)
 where d.code = 'RS'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'fssid', v.koda, 1, 1, 6, false,
       'FSS', 'https://fss.rs/'
  from countries d
  cross join (values
    ('rs-srpska-istok', 'Srpska liga Istok', 'Srpska liga Istok', '75912381-75912620', 'fsris'),
    ('rs-srpska-zapad', 'Srpska liga Zapad', 'Srpska liga Zapad', '75859176-75859415', 'fsrzs'),
    ('rs-srpska-vojvodina', 'Srpska liga Vojvodina', 'Srpska liga Vojvodina', '75952376-75952615', 'fsv')
  ) as v(slug, ime, kratko, koda, zveza)
  join federations f on f.code = v.zveza
 where d.code = 'RS'
on conflict (slug) do nothing;
