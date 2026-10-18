-- Hrvaška: MŽNL Vinkovci-Osijek (međužupanijska liga, peta raven, nad 1. ŽNL
-- Vukovarsko-srijemsko in Osječko-baranjsko) z vira HNS Semafor.
--
-- Prošnja s podpore ("čaka nas več kot 20") in želja v `zelje_lig`.
-- `scripts/hrvaske-lige.mjs` jo je doslej izpustil: filter `IZPUSTI` je imel
-- "mžnl" in "^m?žnl? ", kar je zajelo tudi članski MŽNL. Letos ligo objavlja
-- ŽNS vukovarsko-srijemski, lani HNS ("MŽNL Os-Vk 25/26"), zato arhiv po
-- imenu znotraj zveze ni bil najden.
--
-- Pregled 18. 10. 2026 (`hns.mjs`, isti zapisnik kot ostale HR lige):
--   2026/27 `114552510`: 16 klubov, 72 od 120 tekem z zapisnikom, vseh 144
--     postav po 11, 221 golov = vsota izidov, oba vratarja na vsaki tekmi.
--   2025/26 `100569067` (arhiv): 240 tekem, 479 od 480 postav po 11, 788
--     golov, 13 skupnih klubov.
--
-- Vpiše se NEAKTIVNA. Zvezo vodi ŽNS Vukovar (letošnji objavitelj).

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url
)
select v.slug, v.ime, v.kratko, d.id, f.id, 'hns', v.koda, 1, v.vrstni, 6, false,
       'HNS Semafor', 'https://semafor.hns.family/natjecanja/' || v.koda || '/x/'
  from countries d
  cross join (values
    ('hr-vs-mznl-vinkovci-osijek', 'MŽNL Vinkovci-Osijek', 'MŽNL VK-OS', '114552510', 47)
  ) as v(slug, ime, kratko, koda, vrstni)
  join federations f on f.code = 'zns-vukovar'
 where d.code = 'HR'
on conflict (slug) do nothing;

-- Želje iz "Moje lige ni" za to ligo poveži z njo, da obvestilo pride ob vklopu.
update zelje_lig z
   set competition_id = c.id
  from competitions c
 where c.slug = 'hr-vs-mznl-vinkovci-osijek'
   and z.competition_id is null
   and z.obvescen_at is null
   and z.drzava = 'HR'
   and lower(z.ime_lige) ~ 'm[žz]nl'
   and lower(z.ime_lige) ~ 'osijek'
   and lower(z.ime_lige) ~ 'vinkov';

-- Isto ime, drug klub: "NK Otok" je klub iz Međimurja (Semafor 347, II. MNL,
-- zapis 738, njegov je grb iz 7. 10.) in klub iz Otoka pri Vinkovcih (40262,
-- MŽNL in juniori VS). `hrvaske-lige.mjs` mladinske lige ne pregleda, zato je
-- uvoz juniorjev VS (13. 10.) oba vpisal v zapis 738. Klub iz Vukovarsko-
-- srijemske dobi svoj zapis "NK Otok (Vukovar)" (`IME_KLUBA` v hns.mjs, kot
-- "NK Sveti Đurađ (Virovitica)") in z njim igralce, nastope, gole in tekme
-- lige hr-vs-u19. Stik kluba (hr-mz-2mnl) ostane. Postopek kot v
-- 20261011184300; idempotentno.
do $$
declare
  hr bigint;
  lige bigint[];
  novi bigint;
  n_igralci int; n_nastopi int; n_goli int; n_doma int; n_gostje int;
begin
  select id into hr from countries where code = 'HR';
  if hr is null or not exists (select 1 from teams where id = 738 and country_id = hr and name = 'NK Otok') then
    raise notice 'NK Otok: zapisa 738 ni ali ima drugo ime — preskočeno';
    return;
  end if;
  select array_agg(id) into lige from competitions where slug = 'hr-vs-u19' and country_id = hr;
  if lige is null then
    raise notice 'NK Otok: lige hr-vs-u19 ni — preskočeno';
    return;
  end if;
  if not exists (select 1 from players p where p.team_id = 738 and p.competition_id = any (lige))
     and not exists (select 1 from matches m join rounds k on k.id = m.round_id
                      where k.competition_id = any (lige) and 738 in (m.home_team_id, m.away_team_id)) then
    raise notice 'NK Otok: že razdeljeno';
    return;
  end if;

  select id into novi from teams where country_id = hr and name = 'NK Otok (Vukovar)';
  if novi is null then
    insert into teams (name, short_name, country_id, logo_url)
    values ('NK Otok (Vukovar)', 'Otok VS', hr, null)
    returning id into novi;
  end if;

  update players set team_id = novi where team_id = 738 and competition_id = any (lige);
  get diagnostics n_igralci = row_count;
  update appearances a set team_id = novi
    from matches m join rounds k on k.id = m.round_id
   where a.match_id = m.id and a.team_id = 738 and k.competition_id = any (lige);
  get diagnostics n_nastopi = row_count;
  update goals g set team_id = novi
    from matches m join rounds k on k.id = m.round_id
   where g.match_id = m.id and g.team_id = 738 and k.competition_id = any (lige);
  get diagnostics n_goli = row_count;
  update matches m set home_team_id = novi
    from rounds k where k.id = m.round_id and m.home_team_id = 738 and k.competition_id = any (lige);
  get diagnostics n_doma = row_count;
  update matches m set away_team_id = novi
    from rounds k where k.id = m.round_id and m.away_team_id = 738 and k.competition_id = any (lige);
  get diagnostics n_gostje = row_count;
  update profiles set insider_team_id = novi
   where insider_team_id = 738 and insider_competition_id = any (lige);
  update poznavalec_prosnje set team_id = novi where team_id = 738 and competition_id = any (lige);
  update klub_stik set team_id = novi where team_id = 738 and liga_slug = 'hr-vs-u19';

  raise notice 'NK Otok → NK Otok (Vukovar) (id %): % igralcev, % nastopov, % golov, % tekem',
    novi, n_igralci, n_nastopi, n_goli, n_doma + n_gostje;
end $$;
