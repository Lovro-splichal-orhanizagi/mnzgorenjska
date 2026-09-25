-- Preizkus opozorila "ekipa se ne bo zaklenila".
--
-- Ekipa se prenasa sama; opozorilo je za edini primer, ko se ne bo. Zato mora
-- drzati dvoje: da pride do pravih ljudi in da pove PRAVI razlog — sporocilo
-- "nekaj je narobe" je za uporabnika enako uporabno kot molk.
--
--   docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/preizkus-opozoril.sql
\set ON_ERROR_STOP on

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-0000000000c1';
  tekmovanje bigint;
  sezona text;
  krog bigint;
  ekipa bigint;
  klub_a bigint;
  vmesni_krog bigint;
  naslednji_krog bigint;
  tretji_krog bigint;
  n int;
  besedilo text;
  poz text;
  potrebno int;
begin
  -- Vse trditve se nanasajo SAMO na testno ekipo: v uvozenem okolju so v
  -- isti ligi tudi druge ekipe z neveljavnim kadrom in stetje vseh bi merilo
  -- njih, ne tega, kar preizkus trdi.
  insert into auth.users (id, email, instance_id, aud, role)
  values (a, 'c@opozorilo', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;
  insert into profiles (id, display_name) values (a, 'C') on conflict (id) do nothing;

  select c.id, max(r.season) into tekmovanje, sezona
    from competitions c join rounds r on r.competition_id = c.id
    join players p on p.competition_id = c.id
   group by c.id order by count(distinct p.id) desc limit 1;

  -- Krog z rokom cez en dan: v dosegu dvodnevnega opozorila.
  insert into rounds (competition_id, season, number, deadline_at, played_on)
  select tekmovanje, sezona, coalesce(max(number), 0) + 1,
         now() + interval '1 day', current_date + 1
    from rounds where competition_id = tekmovanje and season = sezona
  returning id into krog;

  -- Uvozeni krogi iste lige z rokom v blizini bi bili tudi kandidati in bi
  -- preizkus meril koledar, ne pravila. Umaknemo jih; rollback jih vrne.
  update rounds set deadline_at = deadline_at + interval '60 days'
   where competition_id = tekmovanje and id <> krog
     and lineups_locked_at is null
     and deadline_at between now() - interval '14 days' and now() + interval '14 days';

  insert into fantasy_teams (owner_id, name, competition_id)
  values (a, 'Testna', tekmovanje) returning id into ekipa;

  -- --- 1. prazna ekipa ne dobi opozorila -----------------------------------
  -- Kdor kadra sploh ni zacel, ne razume sporocila "ne bo se zaklenila".
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 0 then
    raise exception '1. prazen osnutek naj ne dobi opozorila, kandidatov je %', n;
  end if;

  -- --- 2. nepoln kader pove, koliko igralcev manjka ------------------------
  insert into fantasy_roster (fantasy_team_id, player_id, is_starter, is_captain, is_vice, buy_position)
  select ekipa, p.id, false, false, false, p.position
    from players p
   where p.competition_id = tekmovanje and p.active
   order by p.id
   limit 2;

  if (select count(*) from fantasy_roster where fantasy_team_id = ekipa) <> 2 then
    raise exception '2. priprava: v kader nista prisla dva igralca';
  end if;

  besedilo := razlog_neveljavne_ekipe(ekipa);
  if besedilo is null or besedilo not like '%2 igralcev namesto 15%' then
    raise exception '2. nepoln kader naj pove stevilo, pove: %', besedilo;
  end if;

  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 1 then
    raise exception '2. lastnik nepolnega kadra naj dobi opozorilo, kandidatov je %', n;
  end if;

  -- --- 3. prevec igralcev iz enega kluba pove, iz katerega -----------------
  delete from fantasy_roster where fantasy_team_id = ekipa;

  -- Klub z najvec aktivnimi igralci: iz njega jih bo v kader prislo stiri,
  -- kar je natanko to, kar naredi prestop med sezono.
  select p.team_id into klub_a
    from players p
   where p.competition_id = tekmovanje and p.active and p.team_id is not null
   group by p.team_id
   order by count(*) desc, p.team_id
   limit 1;
  -- 15 igralcev, a stirje iz istega kluba: natanko to naredi prestop.
  insert into fantasy_roster (fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, buy_position)
  select ekipa, x.id, x.rn <= 11, x.rn = 1, x.rn = 2,
         case when x.rn <= 11 then null else x.rn end, x.poz
    from (
      select p.id, p.position as poz,
             row_number() over (order by (p.team_id = klub_a) desc, p.id) as rn
        from players p
       where p.competition_id = tekmovanje and p.active
    ) x
   where x.rn <= 15;

  besedilo := razlog_neveljavne_ekipe(ekipa);
  if besedilo is null or besedilo not like '%dovoljeni so 3%' then
    raise exception '3. prevec iz kluba naj bo razlozeno, pove: %', besedilo;
  end if;
  if besedilo not like '%prestopi%' then
    raise exception '3. razlog naj omeni prestop — sicer uporabnik isce svojo napako';
  end if;

  -- --- 4. veljaven kader nima razloga in ne dobi poste ---------------------
  delete from fantasy_roster where fantasy_team_id = ekipa;

  -- Veljaven kader sestavimo pozicijo za pozicijo in pri tem pazimo na
  -- omejitev treh iz istega kluba — sicer preizkus meri napacno napako.
  create temp table izbor (
    player_id bigint, position text, team_id bigint, je_zacetnik boolean
  ) on commit drop;

  foreach poz in array array['GK', 'DEF', 'MID', 'FWD'] loop
    potrebno := case poz when 'GK' then 2 when 'DEF' then 5
                         when 'MID' then 5 else 3 end;
    while (select count(*) from izbor where position = poz) < potrebno loop
      insert into izbor (player_id, position, team_id, je_zacetnik)
      select p.id, p.position, p.team_id, false
        from players p
       where p.competition_id = tekmovanje and p.active and p.position = poz
         and not exists (select 1 from izbor i where i.player_id = p.id)
         and (select count(*) from izbor i where i.team_id = p.team_id) < 3
       order by (select count(*) from izbor i where i.team_id = p.team_id), p.id
       limit 1;
      if not found then
        raise exception '4. priprava: premalo igralcev na mestu %', poz;
      end if;
    end loop;
  end loop;

  update izbor set je_zacetnik = true
   where player_id in (
     select player_id from (
       select player_id, position,
              row_number() over (partition by position order by player_id) as rn
         from izbor
     ) r
      where r.rn <= case r.position when 'GK' then 1 when 'DEF' then 4
                                    when 'MID' then 4 else 2 end
   );

  insert into fantasy_roster (fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, buy_position)
  select ekipa, i.player_id, i.je_zacetnik, false, false,
         case when i.je_zacetnik then null
              else row_number() over (order by i.player_id) end,
         i.position
    from izbor i;

  update fantasy_roster set is_captain = true
   where fantasy_team_id = ekipa and player_id = (
     select player_id from fantasy_roster where fantasy_team_id = ekipa and is_starter
      order by player_id limit 1);
  update fantasy_roster set is_vice = true
   where fantasy_team_id = ekipa and player_id = (
     select player_id from fantasy_roster where fantasy_team_id = ekipa and is_starter and not is_captain
      order by player_id limit 1);

  if not roster_je_veljaven(ekipa) then
    raise exception '4. priprava: kader naj bo veljaven, razlog: %', razlog_neveljavne_ekipe(ekipa);
  end if;
  if razlog_neveljavne_ekipe(ekipa) is not null then
    raise exception '4. veljaven kader naj nima razloga, ima: %', razlog_neveljavne_ekipe(ekipa);
  end if;
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 0 then
    raise exception '4. veljavna ekipa naj ne dobi opozorila, kandidatov je %', n;
  end if;

  -- --- 5. rok cez teden dni se ni za opozorilo -----------------------------
  delete from fantasy_roster where fantasy_team_id = ekipa;
  insert into fantasy_roster (fantasy_team_id, player_id, is_starter, is_captain, is_vice, buy_position)
  select ekipa, p.id, false, false, false, p.position
    from players p where p.competition_id = tekmovanje and p.active limit 2;

  update rounds set deadline_at = now() + interval '7 days' where id = krog;
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 0 then
    raise exception '5. teden dni pred rokom naj opozorila se ne bo, kandidatov je %', n;
  end if;
  update rounds set deadline_at = now() + interval '1 day' where id = krog;

  -- --- 6. rok, ki je ze mimo, ni vec opozorilo ----------------------------
  update rounds set deadline_at = now() - interval '1 hour' where id = krog;
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 0 then
    raise exception '6. po roku opozorilo nima smisla, kandidatov je %', n;
  end if;
  update rounds set deadline_at = now() + interval '1 day' where id = krog;

  -- --- 7. en mail na krog, najvec dva kroga zapored ---------------------
  -- Mail za ta krog, poslan pred oknom (po starem tri dni prej), ne steje:
  -- 24 ur pred rokom gre opozorilo vseeno.
  insert into email_log (user_id, email, vrsta, competition_id, round_id, poslano_at)
  values (a, 'c@opozorilo', 'opozorilo-postava', tekmovanje, krog, now() - interval '10 days');
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 1 then
    raise exception '7a. mail pred oknom naj ne ustavi opozorila v oknu (kandidatov %)', n;
  end if;

  -- Mail v oknu tega kroga: drugega za isti krog ni.
  insert into email_log (user_id, email, vrsta, competition_id, round_id, poslano_at)
  values (a, 'c@opozorilo', 'opozorilo-postava', tekmovanje, krog, now() - interval '1 hour');
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 0 then
    raise exception '7b. za isti krog naj gre en sam mail (kandidatov %)', n;
  end if;

  -- Naslednji krog brez popravka: drugi zaporedni krog se dobi opozorilo.
  update rounds set deadline_at = now() + interval '5 days' where id = krog;
  insert into rounds (competition_id, season, number, deadline_at, played_on)
  select tekmovanje, sezona, coalesce(max(number), 0) + 1,
         now() + interval '1 day', current_date + 1
    from rounds where competition_id = tekmovanje and season = sezona
  returning id into naslednji_krog;
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 1 then
    raise exception '7c. drugi zaporedni krog naj se dobi opozorilo (kandidatov %)', n;
  end if;

  -- Tretji zaporedni krog: tisina, dokler se ekipa spet ne zaklene.
  insert into email_log (user_id, email, vrsta, competition_id, round_id, poslano_at)
  values (a, 'c@opozorilo', 'opozorilo-postava', tekmovanje, naslednji_krog, now() - interval '1 hour');
  update rounds set deadline_at = now() + interval '6 days' where id = naslednji_krog;
  insert into rounds (competition_id, season, number, deadline_at, played_on)
  select tekmovanje, sezona, coalesce(max(number), 0) + 1,
         now() + interval '1 day', current_date + 1
    from rounds where competition_id = tekmovanje and season = sezona
  returning id into tretji_krog;
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 0 then
    raise exception '7d. po dveh zaporednih krogih naj opozorila utihnejo (kandidatov %)', n;
  end if;

  -- --- 8. neuspela posta ne steje za poslano -------------------------------
  update email_log set napaka = 'Resend 500' where user_id = a;
  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 1 then
    raise exception '8. po neuspeli posti naj poskusimo znova, kandidatov je %', n;
  end if;
  update email_log set napaka = null where user_id = a;

  -- --- 9. ko ekipo popravi, opozorilo spet zazivi --------------------------
  -- Da je tezava odpravljena, pove ZAKLEP: ce se je ekipa po opozorilu
  -- zaklenila, je bil kader takrat veljaven. Ce se pozneje spet pokvari, je to
  -- nova tezava in novo opozorilo.
  insert into rounds (competition_id, season, number, deadline_at, played_on, lineups_locked_at)
  select tekmovanje, sezona, coalesce(max(number), 0) + 1,
         now() - interval '1 minute', current_date, now() - interval '1 minute'
    from rounds where competition_id = tekmovanje and season = sezona
  returning id into vmesni_krog;

  insert into fantasy_lineups (round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order)
  select vmesni_krog, ekipa, fr.player_id, fr.is_starter, fr.is_captain, fr.is_vice, fr.bench_order
    from fantasy_roster fr where fr.fantasy_team_id = ekipa;

  select count(*) into n from kandidati_za_opozorilo(tekmovanje, 2) where team_id = ekipa;
  if n <> 1 then
    raise exception '9. po vmesnem zaklepu naj se opozorilo spet posilja, kandidatov je %', n;
  end if;

  raise notice 'preizkus opozoril: vseh 12 trditev drzi';
end $$;

rollback;
