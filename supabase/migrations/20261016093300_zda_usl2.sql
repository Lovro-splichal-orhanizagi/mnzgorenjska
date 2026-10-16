-- ZDA: USL League Two (amaterska 4. raven, maj–avgust) z vira `modular11`
-- (modular11.com, ki ga vgradi uslleaguetwo.com). Prvi vir zunaj Evrope.
--
-- Ena liga na regijsko divizijo; končnica (Central, Eastern, Southern,
-- Western, National Semi Final, National Final) ni vpisana. Sezona je
-- koledarsko leto (`sezona_koledarska`, "2026"). Šifra lige je
-- `<turnir>/<divizija>/<leto>` (glej scripts/viri/modular11.mjs); sezona 2026
-- je končana in je arhiv — za 2027 se v šifri popravi le leto (CLAUDE.md,
-- ZDA — vir `modular11`). Merilo za vpis je vsaj 80 % popolnih zapisnikov
-- 2026; doseglo ga je vseh 20 divizij (85–98 %, preverba v CLAUDE.md).
--
-- Država US: vmesnik bi bil angleški (jezik `en` obstaja), a vstopne strani,
-- kartice, pošte in ugiba države še ni — lastnik odloči pred vklopom.
--
-- Vse NEAKTIVNE.

insert into countries (code, name, sort_order) values ('US', 'United States', 20) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'usl', 'United Soccer League', 'USL', 'https://www.uslleaguetwo.com/', 1001
  from countries d
 where d.code = 'US'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select v.slug, 'USL League Two ' || v.ime, 'USL2 ' || v.ime, d.id, f.id, 'modular11', '24/' || v.divizija || '/2026', 1, v.vrstni, 6, false,
       'USL League Two', 'https://www.uslleaguetwo.com/league-schedule', true
  from countries d
  cross join (values
    ('us-usl2-chesapeake', 'Chesapeake', 158, 1),
    ('us-usl2-great-forest', 'Great Forest', 188, 2),
    ('us-usl2-great-lakes', 'Great Lakes', 160, 3),
    ('us-usl2-great-plains', 'Great Plains', 206, 4),
    ('us-usl2-heartland', 'Heartland', 51, 5),
    ('us-usl2-lone-star', 'Lone Star', 161, 6),
    ('us-usl2-metropolitan', 'Metropolitan', 162, 7),
    ('us-usl2-mid-south', 'Mid South', 169, 8),
    ('us-usl2-mid-atlantic', 'Mid-Atlantic', 68, 9),
    ('us-usl2-mountain', 'Mountain', 163, 10),
    ('us-usl2-nor-cal', 'Nor Cal', 164, 11),
    ('us-usl2-northeast', 'Northeast', 41, 12),
    ('us-usl2-northwest', 'Northwest', 57, 13),
    ('us-usl2-ranger', 'Ranger', 273, 14),
    ('us-usl2-south-atlantic', 'South Atlantic', 165, 15),
    ('us-usl2-south-central', 'South Central', 166, 16),
    ('us-usl2-south-florida', 'South Florida', 167, 17),
    ('us-usl2-southeast', 'Southeast', 45, 18),
    ('us-usl2-southwest', 'Southwest', 52, 19),
    ('us-usl2-valley', 'Valley', 168, 20)
  ) as v(slug, ime, divizija, vrstni)
  join federations f on f.code = 'usl'
 where d.code = 'US'
on conflict (slug) do nothing;
