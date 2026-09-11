-- 3. SNL Vzhod in Zahod — prvi državni tekmovanji v aplikaciji.
--
-- Doslej je veljala poenostavitev "ena zveza = eno spletišče", zapisana v
-- komentarju pri `federations.code`. Za 3. SNL ne drži: tekmovanje vodi NZS,
-- zapisnike pa objavi tista MNZ, ki ji je NZS ligo za to sezono zaupala —
-- Vzhod letos Ptuj, Zahod Nova Gorica. Skrbništvo se med sezonami seli, zato
-- arhiv ni na istem spletišču kot tekoča sezona.
--
-- Zato se tu razideta dve stvari, ki sta bili prej ena:
--   `federation_id`  kdo tekmovanje VODI   → nova zveza `nzs`, po njej grupira izbirnik
--   `source`         kdo ga OBJAVLJA       → `mnzpt` / `mnzng`, po njem uvoz izbere vir
--
-- 1. in 2. SNL ne dodajamo: `nzs.si` postav po tekmah ne objavi, za njiju
-- fantasy iz javnih podatkov ni mogoč. Podrobnosti v `.claude/skills/dodaj-ligo`.

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select id, 'nzs', 'Nogometna zveza Slovenije', 'NZS', 'https://www.nzs.si/', 0
  from countries where code = 'SI'
on conflict (code) do nothing;

-- --------------------------------------------------------------------------
-- Navedba vira, kadar liga ne izhaja na spletišču svoje zveze
-- --------------------------------------------------------------------------
-- Noga trdi "Podatki: uradni zapisniki <zveza>" in poveže `federations.site_url`.
-- Pri 3. SNL bi ta stavek pokazal na `nzs.si`, kjer zapisnikov ni. Trditev v
-- vmesniku mora držati, zato liga lahko navedbo povozi. Prazno pri vseh
-- obstoječih ligah pomeni "vzemi od zveze" — zanje se ne spremeni nič.
alter table competitions add column if not exists vir_ime text;
alter table competitions add column if not exists vir_url text;

comment on column competitions.vir_ime is
  'Kdo objavlja zapisnike, kadar to ni zveza tekmovanja. NULL = vzemi od zveze.';
comment on column competitions.vir_url is
  'Spletišče objavitelja; velja skupaj z `vir_ime`.';

-- `c.*` se razširi ob stvaritvi pogleda, zato ga je treba postaviti znova.
drop view if exists competitions_view;

create view competitions_view as
  select c.*,
         d.code       as country_code,
         d.name       as country_name,
         f.code       as federation_code,
         f.name       as federation_name,
         f.short_name as federation_short,
         f.site_url   as federation_url,
         f.sort_order as federation_sort
    from competitions c
    join countries d on d.id = c.country_id
    left join federations f on f.id = c.federation_id;

comment on view competitions_view is
  'Tekmovanja z državo in zvezo — vse, kar izbirnik potrebuje za grupiranje in iskanje.';

-- --------------------------------------------------------------------------
-- Tekmovanji — neaktivni, kakor vsaka nova liga
-- --------------------------------------------------------------------------
-- Šifra je v obliki, ki jo pričakuje vir iz stolpca `source`:
--   mnzpt  `<sezona>:<liga>`   mnzng  `<competitionId>`
insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, vir_ime, vir_url,
  prvi_fantasy_krog, sort_order, rok_pomak_ur, active
)
select v.slug, v.ime, v.kratko, d.id, f.id,
       v.vir, v.koda, v.vir_ime, v.vir_url, 1, v.vrstni, 6, false
  from countries d
  cross join (values
    ('snl3-vzhod', '3. SNL — Vzhod', '3. V', 'mnzpt', '2026:96',
     'MNZ Ptuj',        'https://www.mnzveza-ptuj.si/', 1),
    ('snl3-zahod', '3. SNL — Zahod', '3. Z', 'mnzng', '2785',
     'MNZ Nova Gorica', 'https://mnzgorica.si/',        2)
  ) as v(slug, ime, kratko, vir, koda, vir_ime, vir_url, vrstni)
  join federations f on f.code = 'nzs'
 where d.code = 'SI'
on conflict (slug) do nothing;
