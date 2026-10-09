-- Hrvaška: razdeli istoimenske klube, ki jih je uvoz vpisal v isti zapis.
--
-- Klub je v bazi enoličen po imenu znotraj države. Semafor (HNS) da dvema
-- kluboma iz različnih županij včasih isto ime ("NK Ponikve" je klub iz
-- Zagreba in klub iz Stona), uvoz pa jih je prepoznal po imenu — zato sta
-- si delila zapis: grb, stran kluba, navijače, poznavalce, stike. Pri NK
-- Tomislav (Drnje) je bil vzrok ključ: slovenski `poenostavi` je "NK Tomislav
-- (Đ)" (Đulovac) skrčil v "nk tomislav". Igralci so po ligah, zato točke in
-- cene niso bile napačne.
--
-- Pregled 9. 10. 2026 (vse hns lige in arhivi, šifra kluba `data-id` na
-- Semaforju) je našel sedem takih zapisov. Zapis obdrži klub, čigar grb ima
-- (grb ostane pravi); drugi klub dobi nov zapis brez grba (delovni tok *Grbi
-- klubov* z `vir = hns` ga dopolni) in z njim vse, kar spada k njegovim ligam:
-- igralce, nastope, gole in tekme teh lig. Poznavalec, navijač, prošnja in
-- stik gredo z njim le, kadar jih liga jasno veže nanj.
--
-- | zapis | ostane (Semafor id, liga)          | nov zapis (Semafor id, lige)                         |
-- |-------|------------------------------------|------------------------------------------------------|
-- |   832 | NK Ponikve, Ston (1017, du-2-znl)   | NK Ponikve (Zagreb) (617, 3nl-centar)                |
-- |   909 | Polet Skrad (2573, ri-2-znl) — ime  | NK Polet (SK), Sveta Klara (605, 4nl-zagreb-a)        |
-- |       | se spremeni v "NK Polet (Skrad)"   |                                                      |
-- |  1343 | NK Sveti Đurađ (762, dm-ii-znl)     | NK Sveti Đurađ (Virovitica) (1329, vp-druga-znl-zapad)|
-- |  1149 | NK Dragovoljac, Bočkovec (943, kc-3znl) | NK Dragovoljac (Poličnik) (209, zd-1-znl)        |
-- |  1236 | NK Borac, Imbriovec (955, kc-elitna) | NK Borac (Novo Selo) (178362, sm-1-znl)             |
-- |  1296 | NK Podravac, Virje (917, kc-elitna) | NK Podravac (Sesvete Ludbreške) (40074, vz-2-znl-varazdin, vz-3znl-ludbreg) |
-- |   950 | NK Tomislav (Đ), Đulovac (1399, bj) | NK Tomislav, Drnje (933, kc-elitna)                  |
--
-- Uvoz po tej migraciji ime določi po šifri kluba (`IME_KLUBA` v
-- scripts/viri/hns.mjs), zato ta imena ostanejo. Migracija je idempotentna:
-- zapis, ki v teh ligah nima več ničesar, preskoči.
--
-- Vrstni red sprememb: igralci, nastopi, goli, tekme na koncu — sprožilci
-- statistike in točk krogov (po stavku) tako tečejo na skladnem stanju.

do $$
declare
  hr bigint;
  r record;
  lige bigint[];
  ostale bigint[];
  novi bigint;
  n_igralci int; n_nastopi int; n_goli int; n_doma int; n_gostje int;
begin
  select id into hr from countries where code = 'HR';
  if hr is null then
    raise notice 'razdeli klube: države HR ni — preskočeno';
    return;
  end if;

  for r in
    select * from (values
      (832::bigint, array['NK Ponikve'], array['hr-3nl-centar'],
        'NK Ponikve (Zagreb)', 'Ponikve Zagreb', null::text, null::text),
      (909::bigint, array['NK Polet (SK)', 'NK Polet (Skrad)'], array['hr-hns-4nl-zagreb-a'],
        'NK Polet (SK)', 'Polet SK', 'NK Polet (Skrad)', 'Polet Skrad'),
      (1343::bigint, array['NK Sveti Đurađ'], array['hr-vp-druga-znl-zapad'],
        'NK Sveti Đurađ (Virovitica)', 'Sveti Đurađ VT', null, null),
      (1149::bigint, array['NK Dragovoljac'], array['hr-zd-1-znl'],
        'NK Dragovoljac (Poličnik)', 'Dragovoljac Poličnik', null, null),
      (1236::bigint, array['NK Borac'], array['hr-sm-1-znl'],
        'NK Borac (Novo Selo)', 'Borac Novo Selo', null, null),
      (1296::bigint, array['NK Podravac'], array['hr-vz-2-znl-varazdin', 'hr-vz-3znl-ludbreg'],
        'NK Podravac (Sesvete Ludbreške)', 'Podravac Sesvete', null, null),
      (950::bigint, array['NK Tomislav (Đ)'], array['hr-kc-elitna'],
        'NK Tomislav', 'Tomislav', null, null)
    ) as v(stari, imena, slugi, novo_ime, novo_kratko, preimenuj, preimenuj_kratko)
  loop
    -- Varovalo: zapis mora biti tisti, ki ga pričakujemo (id in ime v HR).
    if not exists (select 1 from teams t where t.id = r.stari and t.country_id = hr and t.name = any (r.imena)) then
      raise notice 'razdeli klube: zapisa % (%) ni ali ima drugo ime — preskočeno', r.stari, r.imena[1];
      continue;
    end if;

    select array_agg(c.id) into lige from competitions c where c.slug = any (r.slugi) and c.country_id = hr;
    if lige is null then
      raise notice 'razdeli klube: lig % ni — preskočeno', r.slugi;
      continue;
    end if;

    -- Idempotentno: v ligah drugega kluba stari zapis nima ničesar več.
    if not exists (select 1 from players p where p.team_id = r.stari and p.competition_id = any (lige))
       and not exists (
         select 1 from matches m join rounds k on k.id = m.round_id
          where k.competition_id = any (lige) and r.stari in (m.home_team_id, m.away_team_id)) then
      raise notice 'razdeli klube: % v % nima ničesar — že razdeljeno', r.stari, r.slugi;
      continue;
    end if;

    -- Lige, v katerih stari zapis ostane (za navijače, glej spodaj).
    select coalesce(array_agg(distinct x.cid), '{}') into ostale from (
      select p.competition_id cid from players p where p.team_id = r.stari and not (p.competition_id = any (lige))
      union
      select k.competition_id from matches m join rounds k on k.id = m.round_id
       where r.stari in (m.home_team_id, m.away_team_id) and not (k.competition_id = any (lige))
    ) x;

    -- Polet: ime "NK Polet (SK)" pripada Sveti Klari (Semafor 605), Skrad
    -- (zapis 909, njegov je tudi grb) dobi ime po kraju.
    if r.preimenuj is not null then
      update teams set name = r.preimenuj, short_name = r.preimenuj_kratko
       where id = r.stari and name <> r.preimenuj;
    end if;

    select t.id into novi from teams t where t.country_id = hr and t.name = r.novo_ime;
    if novi is null then
      insert into teams (name, short_name, country_id, logo_url)
      values (r.novo_ime, r.novo_kratko, hr, null)
      returning id into novi;
    end if;
    if novi = r.stari then
      raise exception 'razdeli klube: nov zapis za % je isti kot stari', r.novo_ime;
    end if;

    update players set team_id = novi
     where team_id = r.stari and competition_id = any (lige);
    get diagnostics n_igralci = row_count;

    -- Nastopi in goli gredo po ligi TEKME, ne po igralcu: igralca, ki je
    -- prestopil, uvoz prestavi v klub zadnje tekme.
    update appearances a set team_id = novi
      from matches m join rounds k on k.id = m.round_id
     where a.match_id = m.id and a.team_id = r.stari and k.competition_id = any (lige);
    get diagnostics n_nastopi = row_count;

    update goals g set team_id = novi
      from matches m join rounds k on k.id = m.round_id
     where g.match_id = m.id and g.team_id = r.stari and k.competition_id = any (lige);
    get diagnostics n_goli = row_count;

    update matches m set home_team_id = novi
      from rounds k
     where k.id = m.round_id and m.home_team_id = r.stari and k.competition_id = any (lige);
    get diagnostics n_doma = row_count;
    update matches m set away_team_id = novi
      from rounds k
     where k.id = m.round_id and m.away_team_id = r.stari and k.competition_id = any (lige);
    get diagnostics n_gostje = row_count;

    -- Poznavalec je vezan na ligo (insider_competition_id), prošnja tudi.
    update profiles set insider_team_id = novi
     where insider_team_id = r.stari and insider_competition_id = any (lige);
    update poznavalec_prosnje set team_id = novi
     where team_id = r.stari and competition_id = any (lige);
    -- Navijač nima lige: preselimo ga le, če ima ekipe samo v ligah drugega kluba.
    update profiles pr set navijam_team_id = novi
     where pr.navijam_team_id = r.stari
       and exists (select 1 from fantasy_teams f where f.owner_id = pr.id and f.competition_id = any (lige))
       and not exists (select 1 from fantasy_teams f where f.owner_id = pr.id and f.competition_id = any (ostale));
    -- Stik kluba: po ligi, v kateri smo klub našli.
    update klub_stik set team_id = novi
     where team_id = r.stari and liga_slug = any (r.slugi);

    raise notice 'razdeli klube: % → % (id %): % igralcev, % nastopov, % golov, % tekem',
      r.stari, r.novo_ime, novi, n_igralci, n_nastopi, n_goli, n_doma + n_gostje;
  end loop;
end $$;
