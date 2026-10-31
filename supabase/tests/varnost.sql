-- Tece tudi na prazni bazi po migracijah. Fiksni, negativni ID-ji so samo
-- testne vrstice; ROLLBACK jih odstrani skupaj z vsemi stranskimi ucinki.
begin;
set local statement_timeout = '15s';

create temporary table izidi (opis text, uspeh boolean);
grant select, insert on izidi to anon, authenticated;
create function pg_temp.preveri(p_opis text, p_uspeh boolean) returns void
language plpgsql as $$
begin
  insert into izidi values (p_opis, coalesce(p_uspeh, false));
  raise notice '% %', case when p_uspeh then 'PASS' else 'FAIL' end, p_opis;
end;
$$;

create function pg_temp.zavrnjeno(p_opis text, p_sql text) returns void
language plpgsql as $$
declare v_zavrnjeno boolean := false;
begin
  begin
    execute p_sql;
    -- Tudi uspel napad se razveljavi, da ne vpliva na naslednji test.
    raise exception using errcode = 'P9998', message = 'Napad je uspel';
  exception
    when insufficient_privilege then v_zavrnjeno := true;
    when sqlstate 'P9998' then null;
  end;
  perform pg_temp.preveri(p_opis, v_zavrnjeno);
end;
$$;
grant execute on function pg_temp.preveri(text, boolean), pg_temp.zavrnjeno(text, text)
  to anon, authenticated;

insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
select id, slug, name, short_name, false, (select id from countries where code='SI'), 'mnzg'
from (values (-913001, 'test-varnost', 'Test varnosti', 'TEST'),
             (-913002, 'test-varnost-druga', 'Drugo testno tekmovanje', 'TEST2'))
     v(id,slug,name,short_name);
insert into teams(id, name, short_name, country_id) overriding system value
select -913000-n, 'Test varnosti '||n, 'T'||n, (select id from countries where code='SI')
from generate_series(1,5) n;
insert into players(id, team_id, competition_id, first_name, last_name, position,
                    position_source, value, value_start, active) overriding system value
select -913000-n, -913001-((n-1)%5), -913001, 'Test', n::text,
       case when n<=2 then 'GK' when n<=7 then 'DEF' when n<=12 then 'MID' else 'FWD' end,
       'admin', 6, 6, true
from generate_series(1,15) n;
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f912ab','test-varnost@example.invalid','{"display_name":"Test"}',now()-interval '2 days'),
 ('b8a06635-2322-4444-8c42-44e419f912ac','test-tujec@example.invalid','{"display_name":"Tujec"}',now()-interval '2 days'),
 ('b8a06635-2322-4444-8c42-44e419f912ad','test-admin@example.invalid','{"display_name":"Admin"}',now()-interval '2 days');
update profiles set is_admin=true where id='b8a06635-2322-4444-8c42-44e419f912ad';
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value
values (-913001,'b8a06635-2322-4444-8c42-44e419f912ab','Testna ekipa',-913001,now()-interval '2 days');
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
values (-913001,'2099/00',2,now()+interval '1 day',-913001),
       (-913002,'2099/00',3,now()+interval '2 days',-913001),
       (-913003,'2099/00',4,now()+interval '3 days',-913001),
       (-913004,'2099/00',5,now()+interval '4 days',-913001),
       (-913005,'2099/00',2,now()+interval '1 day',-913002);

-- Ta helper samo sestavi vhod iz znane, rocno preverjene postave 1-4-4-2.
create function pg_temp.kader() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
    'player_id', -913000-n,
    'is_starter', n not in (2,7,12,15),
    'is_captain', n=1, 'is_vice', n=3,
    'bench_order', case n when 2 then 1 when 7 then 2 when 12 then 3 when 15 then 4 end
  )) from generate_series(1,15) n;
$$;
grant execute on function pg_temp.kader() to authenticated;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('lastnik si ne more dodeliti admina',
  $$update profiles set is_admin=true where id=auth.uid()$$);
select pg_temp.zavrnjeno('lastnik ne more spremeniti datuma registracije',
  $$update profiles set created_at=now()-interval '1 year' where id=auth.uid()$$);
update profiles set display_name='Popravljeno ime', insider_team_id=-913001 where id=auth.uid();
select pg_temp.preveri('lastnik lahko spremeni prikazno ime in svoj klub',
  (select display_name='Popravljeno ime' and insider_team_id=-913001 from profiles where id=auth.uid()));
select pg_temp.zavrnjeno('lastnik ne more povecati gotovine',
  $$update fantasy_teams set cash=9999 where id=-913001$$);
select pg_temp.zavrnjeno('lastnik ne more povecati zacetnega proracuna',
  $$update fantasy_teams set budget=9999 where id=-913001$$);
select pg_temp.zavrnjeno('lastnik ne more prestaviti datuma nastanka ekipe',
  $$update fantasy_teams set created_at=now()-interval '1 year' where id=-913001$$);
select pg_temp.zavrnjeno('nova ekipa ne sprejme ponarejene gotovine',
  $$insert into fantasy_teams(owner_id,name,competition_id,cash) values(auth.uid(),'Ponarejena',-913002,9999)$$);
select pg_temp.zavrnjeno('igralca ni mogoce kupiti brez placila mimo RPC',
  $$insert into fantasy_roster(fantasy_team_id,player_id,is_starter) values(-913001,-913001,true)$$);
select pg_temp.zavrnjeno('brisanje ekipe ne sme obiti zaklepa pripomocka',
  $$delete from fantasy_teams where id=-913001$$);
update fantasy_teams set name='Popravljeno ime ekipe' where id=-913001;
select pg_temp.preveri('lastnik se vedno lahko preimenuje ekipo',
  (select name='Popravljeno ime ekipe' from fantasy_teams where id=-913001));
insert into fantasy_teams(owner_id,name,competition_id) values(auth.uid(),'Nova veljavna ekipa',-913002);
select pg_temp.preveri('ustvarjanje ekipe ohrani privzeta sredstva',
  (select cash=100 and budget=100 from fantasy_teams where owner_id=auth.uid() and competition_id=-913002));

reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('anonimni ne more zakleniti kroga', $$select zakleni_krog(-913001)$$);
select pg_temp.zavrnjeno('anonimni ne more sproziti zaklepanja', $$select zakleni_zapadle_kroge()$$);
select pg_temp.zavrnjeno('anonimni ne more premikati cen', $$select uveljavi_cene(-913001)$$);
select pg_temp.zavrnjeno('anonimni ne more uveljaviti pozicij', $$select uveljavi_pozicije()$$);
select pg_temp.preveri('anonimno branje igralcev se vedno deluje',
  (select count(*)=15 from player_overview where competition_id=-913001));
reset role;
select pg_temp.preveri('tudi skrbnik ne zaklene prihodnjega kroga', zakleni_krog(-913001)=0);

-- Prazen kader ob roku ostane brez tock tudi po poznejsem dopolnjevanju.
update rounds set deadline_at=now()-interval '1 hour' where id=-913001;
select zakleni_krog(-913001);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select shrani_ekipo(-913001,pg_temp.kader());
select pg_temp.preveri('RPC zaracuna kupljene igralce', (select cash=10 from fantasy_teams where id=-913001));
select pg_temp.preveri('veljaven kader se normalno shrani', roster_je_veljaven(-913001));
select pg_temp.zavrnjeno('nakupne pozicije ni mogoce ponarediti',
  $$update fantasy_roster set buy_position='FWD' where fantasy_team_id=-913001$$);
select pg_temp.zavrnjeno('prodaja mora teci skozi RPC',
  $$delete from fantasy_roster where fantasy_team_id=-913001$$);
reset role;
select pg_temp.preveri('tudi polne postave skrbnik ne zaklene pred rokom',
  zakleni_krog(-913002)=0);
select pg_temp.preveri('prihodnji krog nima prezgodnjih posnetkov',
  not exists(select 1 from fantasy_lineups where round_id=-913002));
select zakleni_krog(-913001);
select pg_temp.preveri('po roku dopolnjen kader se ne posname za nazaj',
  not exists(select 1 from fantasy_lineups where round_id=-913001 and fantasy_team_id=-913001));

-- Drug zapis istega ID-ja ne sme resetirati nakupne cene ali pozicije.
update players set value=7, position='DEF' where id=-913001;
set local role authenticated;
select shrani_ekipo(-913001, jsonb_set(pg_temp.kader(),'{0,player_id}','"-0913001"'::jsonb));
select pg_temp.preveri('drug zapis ID-ja ohrani prvotno nakupno ceno in pozicijo',
  (select buy_value=6 and buy_position='GK' from fantasy_roster
   where fantasy_team_id=-913001 and player_id=-913001));
reset role;
update players set value=6, position='GK' where id=-913001;

-- Klub izstopi iz lige: kdor igralca ima, ga obdrzi (kader ostane veljaven),
-- na novo ga ne kupi nihce — tudi ne isti lastnik, ko ga je enkrat prodal.
update players set izstopil_at=now() where id=-913015;
set local role authenticated;
select shrani_ekipo(-913001, pg_temp.kader());
select pg_temp.preveri('igralec izstopljenega kluba ostane v kadru, kader je veljaven',
  roster_je_veljaven(-913001)
  and exists(select 1 from fantasy_roster where fantasy_team_id=-913001 and player_id=-913015));
select shrani_ekipo(-913001, (select jsonb_agg(e) from jsonb_array_elements(pg_temp.kader()) e
                               where (e->>'player_id')::bigint <> -913015));
do $$
begin
  perform shrani_ekipo(-913001, pg_temp.kader());
  perform pg_temp.preveri('igralca izstopljenega kluba ni mogoce kupiti na novo', false);
exception when others then
  perform pg_temp.preveri('igralca izstopljenega kluba ni mogoce kupiti na novo',
    sqlerrm like 'Klub je izstopil iz lige%');
end $$;
reset role;
update players set izstopil_at=null where id=-913015;
set local role authenticated;
select shrani_ekipo(-913001, pg_temp.kader());
reset role;

-- Veljaven kader se mora posneti PRED prvim shranjevanjem po roku, tudi
-- kadar cron se ni tekel. Naslednji kader je osnutek za prihodnji krog.
-- Rok tik PO zadnji shrambi: z "- 1 ms" je na hitri bazi padel pred njo in
-- zakleni_krog je ekipo izpustil kot shranjeno po roku (nestanoviten test).
update rounds set deadline_at=clock_timestamp() where id=-913002;
set local role authenticated;
select shrani_ekipo(-913001,'[]'::jsonb);
reset role;
select zakleni_krog(-913002);
select pg_temp.preveri('prva sprememba po roku ohrani prejsnjih 15 igralcev',
  (select count(*)=15 from fantasy_lineups where round_id=-913002 and fantasy_team_id=-913001));
select pg_temp.preveri('prodaja vrne denar brez spremembe pretekle postave',
  (select cash=100 from fantasy_teams where id=-913001)
  and not exists(select 1 from fantasy_roster where fantasy_team_id=-913001));

-- Pripomocke lahko urejamo samo pred rokom in znotraj svoje lige.
set local role authenticated;
insert into fantasy_chips(fantasy_team_id,chip,round_id) values(-913001,'klop_plus',-913003);
delete from fantasy_chips where fantasy_team_id=-913001 and chip='klop_plus';
select pg_temp.preveri('pred rokom lahko pripomocek preklicemo',
  not exists(select 1 from fantasy_chips where fantasy_team_id=-913001));
select pg_temp.zavrnjeno('pripomocka ni mogoce dodati v pretekli krog',
  $$insert into fantasy_chips(fantasy_team_id,chip,round_id) values(-913001,'klop_plus',-913002)$$);
select pg_temp.zavrnjeno('pripomocek ne sme v drugo tekmovanje',
  $$insert into fantasy_chips(fantasy_team_id,chip,round_id) values(-913001,'klop_plus',-913005)$$);
insert into fantasy_chips(fantasy_team_id,chip,round_id) values(-913001,'klop_plus',-913003);
reset role;
update rounds set deadline_at=clock_timestamp()-interval '1 millisecond' where id=-913003;
set local role authenticated;
select pg_temp.zavrnjeno('po roku pripomocka ni mogoce izbrisati',
  $$delete from fantasy_chips where fantasy_team_id=-913001 and chip='klop_plus'$$);
select pg_temp.zavrnjeno('po roku pripomocka ni mogoce prestaviti naprej',
  $$update fantasy_chips set round_id=-913004 where fantasy_team_id=-913001 and chip='klop_plus'$$);
select pg_temp.zavrnjeno('po roku pripomocku ni mogoce spremeniti casa vlozitve',
  $$update fantasy_chips set played_at=now()+interval '1 day' where fantasy_team_id=-913001 and chip='klop_plus'$$);
-- Samo sezona gre skozi rok (zapolnitev v migraciji 20260923090000), a je ni
-- mogoce ponarediti: sprozilec jo znova izpelje iz kroga.
update fantasy_chips set season='ponaredek' where fantasy_team_id=-913001 and chip='klop_plus';
select pg_temp.preveri('sezona pripomocka ostane sezona kroga tudi po roku',
  (select c.season = r.season from fantasy_chips c join rounds r on r.id=c.round_id
    where c.fantasy_team_id=-913001 and c.chip='klop_plus'));
select pg_temp.zavrnjeno('uporabnik ne more sproziti skrbniskega preracuna',
  $$select recompute_round_scores(-913002)$$);
select pg_temp.zavrnjeno('skrbniski vstop preveri navadnega uporabnika',
  $$select admin_preracunaj_krog(-913002)$$);
reset role;

insert into player_scores(round_id,player_id,points) values(-913002,-913001,99);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
update profiles set display_name='Adminov popravek' where id='b8a06635-2322-4444-8c42-44e419f912ab';
select pg_temp.preveri('administrator se vedno lahko popravi tuje ime',
  (select display_name='Adminov popravek' from profiles where id='b8a06635-2322-4444-8c42-44e419f912ab'));
select admin_preracunaj_krog(-913002);
select pg_temp.preveri('administratorjev preracun odstrani tocke brez nastopa',
  not exists(select 1 from player_scores where round_id=-913002 and player_id=-913001));
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('tujec ne more shraniti moje ekipe',
  $$select shrani_ekipo(-913001,'[]'::jsonb)$$);
reset role;


-- --------------------------------------------------------------------------
-- Poznavalec lige: en glas potrdi pozicijo in asistenco; sam si ga ne moreš dati.
-- --------------------------------------------------------------------------
-- Igralec 16 ima pozicijo iz ugibanja (ne admin), da ga glasovanje sme spremeniti.
insert into players(id, team_id, competition_id, first_name, last_name, position,
                    position_source, value, value_start, active) overriding system value
values (-913016, -913001, -913001, 'Test', '16', 'MID', 'ugibanje', 6, 6, true);
insert into matches(id, round_id, home_team_id, away_team_id) overriding system value
values (-913001, -913001, -913001, -913002);
insert into goals(id, match_id, scorer_id, team_id) overriding system value
values (-913001, -913001, -913016, -913001);

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('uporabnik si ne more sam dodeliti poznavalca lige',
  $$update profiles set insider_competition_id=-913001 where id=auth.uid()$$);
reset role;
-- Navaden glas (utez 1) pod pragom: pozicija ostane. Ta uporabnik je navijac
-- kluba -913001 (utez 3), ki od praga 3 (20261025223100) sam premakne pozicijo;
-- za navaden glas mu oznako zacasno vzamemo.
update profiles set insider_team_id=null where id='b8a06635-2322-4444-8c42-44e419f912ab';
select pg_temp.preveri('prag pozicije je 3',
  (select value='3'::jsonb from settings where key='prag_glasov_pozicija'));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
insert into position_votes(player_id, voter_id, position) values (-913016, auth.uid(), 'FWD');
reset role;
-- Pozicije se uveljavijo tedensko (uveljavi_pozicije), ne ob glasu.
select uveljavi_pozicije();
select pg_temp.preveri('en navaden glas pozicije ne potrdi',
  (select position='MID' from players where id=-913016));
update profiles set insider_team_id=-913001 where id='b8a06635-2322-4444-8c42-44e419f912ab';

-- Tujec postane poznavalec lige (nastavi admin/servis) in glasuje enkrat.
update profiles set insider_competition_id=-913001 where id='b8a06635-2322-4444-8c42-44e419f912ac';
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
insert into position_votes(player_id, voter_id, position) values (-913016, auth.uid(), 'FWD');
reset role;
select uveljavi_pozicije();
select pg_temp.preveri('en glas poznavalca lige potrdi pozicijo',
  (select position='FWD' and position_source='glasovanje' from players where id=-913016));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
insert into assist_votes(goal_id, voter_id, player_id) values (-913001, auth.uid(), -913001);
select pg_temp.preveri('en glas poznavalca lige potrdi asistenco',
  (select assist_player_id=-913001 from goals where id=-913001));
select pg_temp.preveri('pogled za UI steje glas poznavalca kot prag',
  (select votes>=3 from assist_vote_counts where goal_id=-913001 and player_id=-913001));
reset role;


-- --------------------------------------------------------------------------
-- Okno glasovanja o asistencah: odprto do roka naslednjega kroga.
-- --------------------------------------------------------------------------
-- Tekma v krogu -913001 (rok cez dan, naslednji krog cez dva) je odprta,
-- tekma v ze odigranem krogu -913004 pa ne.
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
values (-913006,'2099/00',1,now()-interval '30 days',-913001);
insert into matches(id, round_id, home_team_id, away_team_id, imported_at, played_on) overriding system value
values (-913002, -913006, -913001, -913002, now()-interval '29 days',
        (now()-interval '30 days')::date);
insert into goals(id, match_id, scorer_id, team_id) overriding system value
values (-913002, -913002, -913016, -913001);
update matches set imported_at = now() - interval '5 days',
                  played_on = (now() - interval '5 days')::date
 where id = -913001;

select pg_temp.preveri('gol tekocega kroga je odprt za glasovanje',
  asistenca_odprta(-913001));
select pg_temp.preveri('gol starega kroga je zaprt',
  not asistenca_odprta(-913002));
select pg_temp.preveri('pogled pove, da je stara tekma zaprta',
  (select not glasovanje_odprto from match_assist_status where match_id=-913002));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('po zaprtju glas o asistenci ne gre skozi',
  $$insert into assist_votes(goal_id, voter_id, player_id) values (-913002, auth.uid(), -913016)$$);
reset role;

-- Poznavalec DRUGE lige v tej ligi steje kot navaden glasovalec.
insert into players(id, team_id, competition_id, first_name, last_name, position,
                    position_source, value, value_start, active) overriding system value
values (-913017, -913001, -913001, 'Test', '17', 'MID', 'ugibanje', 6, 6, true);
update profiles set insider_competition_id=-913002 where id='b8a06635-2322-4444-8c42-44e419f912ac';
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
insert into position_votes(player_id, voter_id, position) values (-913017, auth.uid(), 'FWD');
reset role;
select uveljavi_pozicije();
select pg_temp.preveri('poznavalec druge lige tu ne potrdi sam',
  (select position='MID' from players where id=-913017));


-- --------------------------------------------------------------------------
-- Odhod igralca: poznavalec lige ga oznaci, tujec ne; nastop ga obudi.
-- --------------------------------------------------------------------------
-- Krog -913003 je zapadel, a se ni zaklenjen; odhoda do zaklepa ni mogoce
-- oznaciti (glej spodaj), zato ga tu zaklenemo kot cron.
select zakleni_krog(-913003);
-- Tujec (ac) je zdaj poznavalec lige -913002, ne -913001.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('poznavalec druge lige ne more oznaciti odhoda',
  $$select oznaci_odhod_igralca(-913017, true)$$);
reset role;
update profiles set insider_competition_id=-913001 where id='b8a06635-2322-4444-8c42-44e419f912ac';
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select oznaci_odhod_igralca(-913017, true);
select pg_temp.preveri('poznavalec lige oznaci odhod: igralec ni aktiven',
  (select not active and odsel_at is not null from players where id=-913017));
select oznaci_odhod_igralca(-913017, false);
select pg_temp.preveri('poznavalec lige odhod tudi preklice',
  (select active and odsel_at is null from players where id=-913017));
select oznaci_odhod_igralca(-913017, true);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('navaden uporabnik ne more oznaciti odhoda',
  $$select oznaci_odhod_igralca(-913016, true)$$);
reset role;
-- Nastop v zapisniku ga obudi.
insert into appearances(match_id, player_id, team_id) values (-913001, -913017, -913001);
select pg_temp.preveri('nastop obudi odslega igralca',
  (select active and odsel_at is null from players where id=-913017));

-- Preklic odhoda ne obudi igralca, ki ga je deaktiviral uvoz.
update players set active=false where id=-913016;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select oznaci_odhod_igralca(-913016, false);
reset role;
select pg_temp.preveri('preklic odhoda ne obudi igralca, ki ga je deaktiviral uvoz',
  (select not active from players where id=-913016));
-- Oznaka odhoda na igralcu, ki ga je deaktiviral uvoz, ne nastavi odsel_at
-- (sicer ga uvoz ob vrnitvi kluba v ligo ne bi obudil).
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select oznaci_odhod_igralca(-913016, true);
reset role;
select pg_temp.preveri('oznaka odhoda ne oznaci igralca, ki ga je deaktiviral uvoz',
  (select not active and odsel_at is null from players where id=-913016));
update players set active=true where id=-913016;

-- 24 ur pred rokom oznake ni vec; administrator je izvzet. Preklic gre vedno.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select oznaci_odhod_igralca(-913017, true);
reset role;
update rounds set deadline_at=now()+interval '12 hours' where id=-913004;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('odhoda ni mogoce oznaciti 24 ur pred rokom',
  $$select oznaci_odhod_igralca(-913017, true)$$);
select oznaci_odhod_igralca(-913017, false);
reset role;
select pg_temp.preveri('poznavalec odhod preklice tudi 24 ur pred rokom',
  (select active and odsel_at is null from players where id=-913017));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select oznaci_odhod_igralca(-913017, true);
select oznaci_odhod_igralca(-913017, false);
select pg_temp.preveri('administrator odhod oznaci tudi tik pred rokom',
  (select active and odsel_at is null from players where id=-913017));
reset role;
update rounds set deadline_at=now()+interval '4 days' where id=-913004;


-- --------------------------------------------------------------------------
-- Pregled varnosti: klepet, mini lige, razlog ekipe, pripomocki po sezoni.
-- --------------------------------------------------------------------------
insert into chat_messages(id, user_id, content, alias) overriding system value
values (-913001, 'b8a06635-2322-4444-8c42-44e419f912ab', 'Testno sporocilo', 'Test');
set local role anon;
select pg_temp.zavrnjeno('anonimni ne more spremeniti sporocila prek pogleda klepeta',
  $$update klepet_sporocila set content='Vdor' where id=-913001$$);
select pg_temp.zavrnjeno('anonimni ne more izbrisati sporocila prek pogleda klepeta',
  $$delete from klepet_sporocila where id=-913001$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('prijavljeni ne more izbrisati tujega sporocila prek pogleda',
  $$delete from klepet_sporocila where id=-913001$$);
reset role;
select pg_temp.preveri('sporocilo je po napadih nespremenjeno',
  (select content='Testno sporocilo' from chat_messages where id=-913001));

insert into mini_lige(id, name, code, owner_id) overriding system value
values (-913001, 'Zasebna testna', 'TESTKODA913', 'b8a06635-2322-4444-8c42-44e419f912ad');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('v zasebno mini ligo ni vpisa mimo kode',
  $$insert into mini_liga_clani(mini_liga_id, fantasy_team_id) values (-913001, -913001)$$);
select pridruzi_mini_ligi('TESTKODA913', -913001);
select pg_temp.preveri('s kodo se pridruzis prek funkcije',
  exists(select 1 from mini_liga_clani where mini_liga_id=-913001 and fantasy_team_id=-913001));
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('anonimni bere lestvico mini lige brez napake (prazno)',
  (select count(*)=0 from mini_liga_lestvica where mini_liga_id=-913001));
reset role;

-- Izstop iz mini lige in odstranitev ekipe (politika "odidi ali odstrani").
-- A (…ab) ima v ligi dve ekipi iz dveh lig, B (…ac) eno, lastnik C (…ad) eno.
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
select id, slug, name, short_name, false, (select id from countries where code='SI'), 'mnzg'
from (values (-916901, 'test-izstop', 'Test izstopa', 'IZST'),
             (-916902, 'test-izstop-druga', 'Test izstopa 2', 'IZST2')) v(id,slug,name,short_name);
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value
values (-916901,'b8a06635-2322-4444-8c42-44e419f912ab','Dvojnik',-916901,now()-interval '2 days'),
       (-916902,'b8a06635-2322-4444-8c42-44e419f912ab','Dvojnik',-916902,now()-interval '2 days'),
       (-916903,'b8a06635-2322-4444-8c42-44e419f912ac','Ekipa B',-916901,now()-interval '2 days'),
       (-916904,'b8a06635-2322-4444-8c42-44e419f912ad','Ekipa lastnika',-916901,now()-interval '2 days');
insert into mini_lige(id, name, code, owner_id) overriding system value
values (-916901, 'Izstop zasebna', 'IZSTOP916', 'b8a06635-2322-4444-8c42-44e419f912ad');
-- Javna liga, ki jo je admin skril in zaklenil (`admin_odloci_mini_ligo`).
insert into mini_lige(id, name, code, owner_id, javna, competition_id, javna_zaklenjena_at) overriding system value
values (-916902, 'Izstop zaklenjena', 'IZSTOP917', 'b8a06635-2322-4444-8c42-44e419f912ad', false, -916901, now());
insert into mini_liga_clani(mini_liga_id, fantasy_team_id)
values (-916901,-916901),(-916901,-916902),(-916901,-916903),(-916901,-916904),
       (-916902,-916901),(-916902,-916903),(-916902,-916904);

set local role anon;
-- Anon od 20261017163700 nima pravice DELETE; prej ga je ustavil RLS.
select pg_temp.zavrnjeno('izstop: anonimni ne brise clanstev',
  $$delete from mini_liga_clani where mini_liga_id=-916901$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
delete from mini_liga_clani where mini_liga_id=-916901 and fantasy_team_id in (-916901,-916902,-916904);
reset role;
select pg_temp.preveri('izstop: anonimni in clan ne izbriseta tujega clanstva',
  (select count(*)=4 from mini_liga_clani where mini_liga_id=-916901));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
with d as (delete from mini_liga_clani where mini_liga_id=-916901 and fantasy_team_id=-916902 returning 1)
select pg_temp.preveri('izstop: lastnik ekipe izstopi z eno od dveh svojih ekip', count(*)=1) from d;
select pg_temp.preveri('izstop: druga ekipa ostane, liga ostane vidna',
  exists(select 1 from mini_liga_clani where mini_liga_id=-916901 and fantasy_team_id=-916901)
  and sem_v_mini_ligi(-916901));
reset role;
select pg_temp.preveri('izstop: ekipa po izstopu ostane',
  exists(select 1 from fantasy_teams where id=-916902));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
with d as (delete from mini_liga_clani where mini_liga_id=-916901 and fantasy_team_id=-916903 returning 1)
select pg_temp.preveri('izstop: lastnik mini lige odstrani tujo ekipo', count(*)=1) from d;
with d as (delete from mini_liga_clani where mini_liga_id=-916901 and fantasy_team_id=-916904 returning 1)
select pg_temp.preveri('izstop: lastnik mini lige izstopi s svojo zadnjo ekipo', count(*)=1) from d;
select pg_temp.preveri('izstop: lastnik brez ekipe ostane lastnik in ligo vidi',
  sem_v_mini_ligi(-916901)
  and exists(select 1 from mini_lige where id=-916901 and owner_id=auth.uid()));
with d as (delete from mini_liga_clani where mini_liga_id=-916902 and fantasy_team_id=-916903 returning 1)
select pg_temp.preveri('izstop: lastnik odstrani ekipo tudi iz zaklenjene javne lige', count(*)=1) from d;
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
with d as (delete from mini_liga_clani where mini_liga_id=-916902 and fantasy_team_id=-916901 returning 1)
select pg_temp.preveri('izstop: clan izstopi iz zaklenjene javne lige', count(*)=1) from d;
select pg_temp.preveri('izstop: po izstopu zadnje ekipe liga ni vec vidna',
  not sem_v_mini_ligi(-916902) and not exists(select 1 from mini_lige where id=-916902));
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('razlog neveljavne ekipe ne razkrije tujega kadra',
  $$select razlog_neveljavne_ekipe(-913001)$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('lastnik vidi razlog svoje ekipe',
  razlog_neveljavne_ekipe(-913001) is not null);
update profiles set brez_opomnikov=true where id=auth.uid();
select pg_temp.preveri('lastnik se sam odjavi od opomnikov',
  (select brez_opomnikov from profiles where id=auth.uid()));
-- RLS tujo vrstico tiho preskoci, zato preverimo stanje, ne napake.
update profiles set brez_opomnikov=true where id='b8a06635-2322-4444-8c42-44e419f912ac';
reset role;
select pg_temp.preveri('odjava drugega ni spremenila nicesar',
  (select not brez_opomnikov from profiles where id='b8a06635-2322-4444-8c42-44e419f912ac'));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
update profiles set brez_push=true where id=auth.uid();
select pg_temp.preveri('lastnik sam izklopi potisna obvestila',
  (select brez_push from profiles where id=auth.uid()));
update profiles set brez_push=true where id='b8a06635-2322-4444-8c42-44e419f912ac';
reset role;
select pg_temp.preveri('izklop pusha drugemu ni spremenil nicesar',
  (select not brez_push from profiles where id='b8a06635-2322-4444-8c42-44e419f912ac'));

-- Pripomocek je enkrat na sezono: klop_plus iz sezone 2099/00 ne zapre 2100/01.
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
values (-913007,'2100/01',2,now()+interval '10 days',-913001),
       (-913008,'2099/00',6,now()+interval '11 days',-913001);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
insert into fantasy_chips(fantasy_team_id,chip,round_id) values(-913001,'klop_plus',-913007);
select pg_temp.preveri('isti pripomocek je v novi sezoni spet na voljo',
  (select season='2100/01' from fantasy_chips where fantasy_team_id=-913001 and round_id=-913007));
do $$
begin
  insert into fantasy_chips(fantasy_team_id,chip,round_id) values(-913001,'klop_plus',-913008);
  perform pg_temp.preveri('drugi klop_plus v isti sezoni je zavrnjen', false);
exception when unique_violation then
  perform pg_temp.preveri('drugi klop_plus v isti sezoni je zavrnjen', true);
end $$;
reset role;


-- --------------------------------------------------------------------------
-- Prosnja za poznavalca: uporabnik zaprosi, odloci samo admin.
-- --------------------------------------------------------------------------
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select zaprosi_za_poznavalca(-913001, -913001, 'igralec', 'Igram za ta klub.');
select pg_temp.preveri('prosnja je vpisana in caka',
  (select status='caka' from poznavalec_prosnje where user_id=auth.uid() and competition_id=-913001));
select pg_temp.zavrnjeno('uporabnik ne more sam odlociti o svoji prosnji',
  $$select admin_odloci_prosnjo((select id from poznavalec_prosnje where user_id=auth.uid() and status='caka'), 'liga')$$);
select pg_temp.zavrnjeno('uporabnik ne vidi seznama prosenj',
  $$select * from admin_prosnje_poznavalcev()$$);
select pg_temp.zavrnjeno('uporabnik ne more vpisati prosnje mimo funkcije',
  $$insert into poznavalec_prosnje(user_id, competition_id, vloga) values (auth.uid(), -913002, 'igralec')$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('admin vidi cakajoco prosnjo',
  exists(select 1 from admin_prosnje_poznavalcev() where competition_id=-913001 and vloga='igralec'));
select admin_odloci_prosnjo((select id from admin_prosnje_poznavalcev() where competition_id=-913001 limit 1), 'liga');
select pg_temp.preveri('odobritev za ligo nastavi poznavalca lige',
  (select insider_competition_id=-913001 from profiles where id='b8a06635-2322-4444-8c42-44e419f912ab'));
select pg_temp.preveri('odlocena prosnja ni vec med cakajocimi',
  not exists(select 1 from admin_prosnje_poznavalcev() where competition_id=-913001));
select pg_temp.preveri('admin vidi potrjenega poznavalca lige, ki velja',
  exists(select 1 from admin_potrjeni_poznavalci()
          where user_id='b8a06635-2322-4444-8c42-44e419f912ab' and obseg='liga'
            and competition_id=-913001 and velja and potrjeno_at is not null));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('uporabnik ne vidi seznama potrjenih poznavalcev',
  $$select * from admin_potrjeni_poznavalci()$$);
reset role;

-- Stanje mojih ekip: vsak vidi le svoje, anonimni nic. Funkcija kaze le
-- aktivne lige, testni pa ni mogoce vklopiti (varovalo vklopa), zato ekipa
-- za ta preizkus stoji v prvi aktivni ligi.
insert into fantasy_teams(id,owner_id,name,competition_id) overriding system value
select -913009,'b8a06635-2322-4444-8c42-44e419f912ab','Stanje',id
  from competitions where active order by id limit 1;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('stanje_mojih_ekip vrne lastnikovo ekipo',
  exists(select 1 from stanje_mojih_ekip() where team_id=-913009));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('stanje_mojih_ekip ne vrne tuje ekipe',
  not exists(select 1 from stanje_mojih_ekip() where team_id=-913009));
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('anonimni ne bere stanja ekip', $$select * from stanje_mojih_ekip()$$);
reset role;

-- Klub, za katerega navijam: lastnik ga nastavi sebi, tujemu ne. Navijanje
-- ni poznavalec — insider_team_id ostane, kakor je bil.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
update profiles set navijam_team_id=-913002 where id='b8a06635-2322-4444-8c42-44e419f912ab';
reset role;
select pg_temp.preveri('tujec ne more nastaviti navijanja drugemu',
  (select navijam_team_id is distinct from -913002 from profiles where id='b8a06635-2322-4444-8c42-44e419f912ab'));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
update profiles set navijam_team_id=-913001 where id=auth.uid();
select pg_temp.preveri('lastnik lahko nastavi klub, za katerega navija',
  (select navijam_team_id=-913001 and insider_team_id=-913001 from profiles where id=auth.uid()));
reset role;

-- Navijači klubov: javno branje brez obhoda RLS. Testni uporabnik navija za
-- klub -913001 in ima ekipo v -913001; en navijač je premalo za mesto.
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('anonimni bere navijace klubov',
  exists(select 1 from navijaci_klubov(-913001)
          where team_id=-913001 and fantasy_team_id=-913001 and navijacev=1));
select pg_temp.preveri('klub s premalo navijaci nima mesta',
  (select bool_and(mesto is null and min_navijacev=3) from navijaci_klubov(-913001)));
select pg_temp.preveri('klub brez navijacev je na seznamu brez ekipe',
  exists(select 1 from navijaci_klubov(-913001)
          where team_id=-913002 and navijacev=0 and fantasy_team_id is null));
select pg_temp.preveri('navijac se steje le v ligi, kjer njegov klub igra',
  not exists(select 1 from navijaci_klubov(-913002) where fantasy_team_id is not null));
reset role;
select pg_temp.preveri('navijaci_klubov tece s pravicami klicatelja',
  (select not prosecdef from pg_proc where oid='public.navijaci_klubov(bigint)'::regprocedure));

-- Tedenski pregled mini lige: rocno izracunan primer v lastnem tekmovanju.
-- Krog 1: A 1*3+5=8, B 5*3+3=18. Krog 2: A 10*3+2=32 (na klopi 7),
-- B 2*3+4=10 (p4 ni igral, zamenja ga p5). Po 2. krogu A prehiti B.
-- Krog 3 nima zapisnika, zato se ni v pregledu. Adut je p5 (samo pri B):
-- p1 je tudi samo pri A, a je ze kapetan kroga.
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-914001, 'test-pregled', 'Test pregleda', 'TP', false, (select id from countries where code='SI'), 'mnzg');
insert into teams(id, name, short_name, country_id) overriding system value
values (-914001, 'Pregled A', 'PA', (select id from countries where code='SI')),
       (-914002, 'Pregled B', 'PB', (select id from countries where code='SI'));
insert into players(id, team_id, competition_id, first_name, last_name, position,
                    position_source, value, value_start, active) overriding system value
select -914000-n, -914001-(n%2), -914001, 'Pregled', n::text, 'MID', 'admin', 5, 5, true
  from generate_series(1,5) n;
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
values (-914001,'2098/99',1,now()-interval '10 days',-914001),
       (-914002,'2098/99',2,now()-interval '3 days',-914001),
       (-914003,'2098/99',3,now()-interval '1 day',-914001);
insert into matches(id, round_id, home_team_id, away_team_id, played_on, zapisnik_id) overriding system value
values (-914001,-914001,-914001,-914002,current_date-10,'test-pregled-1'),
       (-914002,-914002,-914001,-914002,current_date-3,'test-pregled-2'),
       (-914003,-914003,-914001,-914002,current_date-1,null);
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value
values (-914001,'b8a06635-2322-4444-8c42-44e419f912ab','Pregled A',-914001,now()-interval '30 days'),
       (-914002,'b8a06635-2322-4444-8c42-44e419f912ac','Pregled B',-914001,now()-interval '30 days'),
       (-914003,'b8a06635-2322-4444-8c42-44e419f912ad','Pregled C',-914001,now()-interval '30 days');
insert into appearances(match_id, player_id, team_id, started, minutes_played)
select m, -914000-p, -914001-(p%2), true, 90
  from (values (-914001,1),(-914001,2),(-914001,4),
               (-914002,1),(-914002,2),(-914002,3),(-914002,5)) v(m,p);
insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, bench_order, position)
select r, t, -914000-p, s, c, case when s then null else 1 end, 'MID'
  from (values (-914001),(-914002),(-914003)) k(r)
  cross join (values (-914001,1,true,true),(-914001,2,true,false),(-914001,3,false,false),
                     (-914002,2,true,true),(-914002,4,true,false),(-914002,5,false,false)) v(t,p,s,c);
insert into player_scores(round_id, player_id, points)
values (-914001,-914001,1),(-914001,-914002,5),(-914001,-914004,3),
       (-914002,-914001,10),(-914002,-914002,2),(-914002,-914003,7),(-914002,-914005,4);
insert into mini_lige(id, name, code, owner_id) overriding system value
values (-914001, 'Pregled', 'PREGLED914', 'b8a06635-2322-4444-8c42-44e419f912ab');
insert into mini_liga_clani(mini_liga_id, fantasy_team_id) values (-914001,-914001),(-914001,-914002);

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
create temporary table pregled as select tedenski_pregled_mini_lige(-914001) as j;
select pg_temp.preveri('pregled: samo koncani krogi, privzeto zadnji',
  (select j->'krogi' = '[2,1]'::jsonb and (j->>'krog')::int = 2 from pregled));
select pg_temp.preveri('pregled: tocke kroga po samodejnih menjavah',
  (select j->'vrstice'->0->>'ekipa' = 'Pregled A' and (j->'vrstice'->0->>'tocke')::numeric = 32
      and (j->'vrstice'->1->>'tocke')::numeric = 10 from pregled));
select pg_temp.preveri('pregled: A je skocil na prvo mesto, B padel',
  (select (j->'vrstice'->0->>'premik')::int = 1 and (j->'vrstice'->1->>'premik')::int = -1
      and (j->'vrstice'->0->>'mesto')::int = 1 from pregled));
select pg_temp.preveri('pregled: svoj kapetan in klop, aduta ni (zasebne ekipe)',
  (select (j->'kapetan'->>'igralec_id')::bigint = -914001 and (j->'kapetan'->>'skupaj')::numeric = 30
      and (j->'klop'->>'ekipa_id')::bigint = -914001 and (j->'klop'->>'tocke')::numeric = 7
      and j->'adut' = 'null'::jsonb from pregled));
select pg_temp.preveri('pregled: vrstice nosijo lastnika za povezavo na svojo ekipo',
  (select (j->'vrstice'->0->>'lastnik_id') = 'b8a06635-2322-4444-8c42-44e419f912ab' from pregled));
reset role;
-- B je v isti mini ligi: tujega kapetana z imenom igralca ne vidi, svojega da.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('pregled: clan mini lige ne vidi tujega kapetana ne igralcev',
  (select (j->'kapetan'->>'ekipa_id')::bigint = -914002 and (j->'kapetan'->>'igralec_id')::bigint = -914002
      and j->'adut' = 'null'::jsonb
      and position('-914001' in coalesce(j->>'kapetan','')) = 0
     from (select tedenski_pregled_mini_lige(-914001) as j) x));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('pregled: prvi krog nima premikov',
  (select j->'vrstice'->0->'premik' = 'null'::jsonb and (j->'vrstice'->0->>'tocke')::numeric = 18
     from (select tedenski_pregled_mini_lige(-914001, 1) as j) x));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('pregled: tujec mini lige ne dobi nicesar',
  tedenski_pregled_mini_lige(-914001) is null
  and not exists (select 1 from koncani_krogi_mini_lige(-914001)));
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('pregled: anonimni ga ne more klicati',
  $$select tedenski_pregled_mini_lige(-914001)$$);
reset role;

-- Šaljive nagrade (20261017233300): stikalo nastavi le lastnik mini lige,
-- pregled pove, kdo je bil zadnji v prejšnjem krogu (žlica ne dvakrat
-- zapored) in ali je v ligi mladinska ekipa (slike brez piva).
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('saljive: privzeto vklopljene, liga ni mladinska',
  (select (j->>'saljive')::boolean and not (j->>'mladinska')::boolean
     from (select tedenski_pregled_mini_lige(-914001) as j) x));
-- Krog 1: A 8, B 18 — v 2. krogu je A prejšnji zadnji (zdaj je prvi).
select pg_temp.preveri('saljive: zadnji v prejsnjem krogu',
  (select j->'zadnji_prej' = '[-914001]'::jsonb
     from (select tedenski_pregled_mini_lige(-914001) as j) x));
select pg_temp.preveri('saljive: prvi krog nima prejsnjega zadnjega',
  (select j->'zadnji_prej' = '[]'::jsonb
     from (select tedenski_pregled_mini_lige(-914001, 1) as j) x));
-- Lastnik tudi sam ne piše stolpca mimo funkcije (pravica le na `name`).
select pg_temp.zavrnjeno('saljive: lastnik ne pise stolpca neposredno',
  $$update mini_lige set saljive_nagrade = false where id = -914001$$);
select pg_temp.preveri('saljive: lastnik izklopi prek funkcije',
  nastavi_saljive_nagrade(-914001, false) = false);
select pg_temp.preveri('saljive: pregled pove, da so izklopljene',
  (select not (j->>'saljive')::boolean from (select tedenski_pregled_mini_lige(-914001) as j) x));
reset role;
-- B je član iste mini lige, a ne lastnik.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('saljive: clan, ki ni lastnik, ne prizge stikala',
  $$select nastavi_saljive_nagrade(-914001, true)$$);
select pg_temp.zavrnjeno('saljive: clan ne pise stolpca neposredno',
  $$update mini_lige set saljive_nagrade = true where id = -914001$$);
select pg_temp.preveri('saljive: clan vidi izklop lastnika',
  (select not (j->>'saljive')::boolean from (select tedenski_pregled_mini_lige(-914001) as j) x));
reset role;
-- C ni v mini ligi.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.zavrnjeno('saljive: tujec ne prizge stikala',
  $$select nastavi_saljive_nagrade(-914001, true)$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('saljive: anonimni ne more klicati funkcije',
  $$select nastavi_saljive_nagrade(-914001, true)$$);
reset role;
select pg_temp.preveri('saljive: stikalo je se vedno izklopljeno',
  (select not saljive_nagrade from mini_lige where id = -914001));
select pg_temp.preveri('saljive: funkcija ni odprta anonimnim',
  not has_function_privilege('anon', 'public.nastavi_saljive_nagrade(bigint, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.nastavi_saljive_nagrade(bigint, boolean)', 'execute'));
select pg_temp.preveri('saljive: vloga authenticated nima pravice pisanja stolpca',
  not has_column_privilege('authenticated', 'public.mini_lige', 'saljive_nagrade', 'update')
  and not has_table_privilege('authenticated', 'public.mini_lige', 'update'));
-- Mladinska liga: ekipa iz lige s šifro U19 → slike brez piva.
update competitions set slug = 'test-pregled-u19' where id = -914001;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('saljive: mini liga z mladinsko ekipo je mladinska',
  (select (j->>'mladinska')::boolean from (select tedenski_pregled_mini_lige(-914001) as j) x));
select nastavi_saljive_nagrade(-914001, true);
reset role;
update competitions set slug = 'test-pregled' where id = -914001;

-- Hisne ekipe: en sistemski lastnik z vec ekipami v ligi, ki jih izbranost,
-- drzavna lestvica, posta in mini lige ne vidijo; v ligi pa stejejo.
create function pg_temp.pade(p_opis text, p_sql text) returns void
language plpgsql as $$
declare v_padlo boolean := false;
begin
  begin
    execute p_sql;
    raise exception using errcode = 'P9998', message = 'Ni padlo';
  exception
    when sqlstate 'P9998' then null;
    when others then v_padlo := true;
  end;
  perform pg_temp.preveri(p_opis, v_padlo);
end;
$$;
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f912ae','test-hisa@example.invalid','{"display_name":"SLFF"}',now()-interval '2 days');
update profiles set brez_opomnikov=true where id='b8a06635-2322-4444-8c42-44e419f912ae';
create temporary table uporabnikov_pred as select skupaj_uporabnikov() as n;
-- Zaporedni ID-ji ne smejo ustvariti cele lige z istim priimkom ali samo polnimi imeni.
create temporary table vzorec_hisnih_imen as
select ime_hisnega_lastnika(n, -913001) as ime from generate_series(1,64) n;
select pg_temp.preveri('hisna imena mesajo polna imena, vzdevke in stevilke',
  (select count(*) filter (where ime like '% %') between 5 and 40
      and count(*) filter (where ime !~ '[[:space:]]' and ime ~ '[0-9]') >= 5
      and count(*) filter (where ime !~ '[[:space:]0-9]') >= 5
      and count(distinct ime) >= 48 from vzorec_hisnih_imen));
select pg_temp.preveri('zaporedne hisne ekipe imajo razlicne priimke',
  (select count(distinct split_part(ime, ' ', 2)) >= 5
     from vzorec_hisnih_imen where ime like '% %'));
create temporary table hisne as
select ustvari_hisno_ekipo('b8a06635-2322-4444-8c42-44e419f912ae', -913001, 'Hisna '||n, pg_temp.kader()) as id
  from generate_series(1,2) n;
select pg_temp.preveri('nove hisne ekipe dobijo razlicni prikazni imeni',
  (select count(distinct owner_name)=2 and bool_and(length(owner_name)>0 and owner_name<>'SLFF')
     from fantasy_team_standings where fantasy_team_id in (select id from hisne)));
update fantasy_teams set display_name='Testni Lastnik' where id=(select min(id) from hisne);
select pg_temp.preveri('servis nastavi prikazno ime brez spremembe lastnistva',
  (select owner_name='Testni Lastnik' from fantasy_team_standings where fantasy_team_id=(select min(id) from hisne))
  and (select owner_id='b8a06635-2322-4444-8c42-44e419f912ae' from fantasy_teams where id=(select min(id) from hisne)));
update fantasy_teams set display_name=null where id=(select min(id) from hisne);
select pg_temp.preveri('hisna ekipa brez prikaznega imena ne pokaze sistemskega profila',
  (select owner_name is null from fantasy_team_standings where fantasy_team_id=(select min(id) from hisne)));
update fantasy_teams set display_name='Testni Lastnik' where id=(select min(id) from hisne);
select pg_temp.preveri('cloveska ekipa ohrani ime profila',
  (select owner_name='Adminov popravek' from fantasy_team_standings where fantasy_team_id=-913001)
  and (select display_name is null from fantasy_teams where id=-913001));
do $$
begin
  begin
    update fantasy_teams set display_name='Prepovedano' where id=-913001;
    raise exception 'Cloveska ekipa je sprejela display_name';
  exception when check_violation then null;
  end;
  begin
    update fantasy_teams set display_name='   ' where id=(select min(id) from hisne);
    raise exception 'Prazno ime ni bilo zavrnjeno';
  exception when check_violation then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ae',true);
set local role authenticated;
select pg_temp.zavrnjeno('niti lastnik hisne ekipe ne more urejati prikaznega imena',
  $$update fantasy_teams set display_name='Napad' where owner_id=auth.uid()$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('hisni lastnik ima vec ekip v isti ligi',
  (select count(*)=2 from fantasy_teams where hisna and competition_id=-913001
     and owner_id='b8a06635-2322-4444-8c42-44e419f912ae'));
select pg_temp.preveri('hisna ekipa gre skozi shrani_ekipo: veljavna in placana',
  (select bool_and(roster_je_veljaven(ft.id) and ft.cash=10) from fantasy_teams ft where ft.id in (select id from hisne)));
select pg_temp.pade('clovek nima dveh ekip v isti ligi (delni unikatni indeks)',
  $$insert into fantasy_teams(owner_id,name,competition_id) values('b8a06635-2322-4444-8c42-44e419f912ab','Druga',-913001)$$);
select pg_temp.pade('hisne ekipe ne dobi lastnik cloveske ekipe',
  $$insert into fantasy_teams(owner_id,name,competition_id,hisna) values('b8a06635-2322-4444-8c42-44e419f912ab','Hisna tujca',-913002)$$);
select pg_temp.pade('hisni lastnik nima cloveske ekipe',
  $$insert into fantasy_teams(owner_id,name,competition_id) values('b8a06635-2322-4444-8c42-44e419f912ae','Clovek',-913002)$$);
select pg_temp.zavrnjeno('hisnosti ekipe ni mogoce spremeniti',
  $$update fantasy_teams set hisna=false where id=(select min(id) from hisne)$$);
select pg_temp.pade('ime hisne ekipe je v ligi enkratno',
  $$select ustvari_hisno_ekipo('b8a06635-2322-4444-8c42-44e419f912ae', -913001, 'Hisna 1', pg_temp.kader())$$);

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('uporabnik si ne more ustvariti hisne ekipe',
  $$insert into fantasy_teams(owner_id,name,competition_id,hisna) values(auth.uid(),'Moja hisna',-913002,true)$$);
select pg_temp.zavrnjeno('uporabnik ne more vpisati prikaznega imena ob nastanku',
  $$insert into fantasy_teams(owner_id,name,competition_id,display_name) values(auth.uid(),'Napad',-913002,'Napad')$$);
select pg_temp.zavrnjeno('uporabnik ne more urejati prikaznega imena',
  $$update fantasy_teams set display_name='Napad' where id=-913001$$);
select pg_temp.zavrnjeno('uporabnik ne more oznaciti ekipe za hisno',
  $$update fantasy_teams set hisna=true where id=-913001$$);
select pg_temp.zavrnjeno('uporabnik ne more klicati ustvari_hisno_ekipo',
  $$select ustvari_hisno_ekipo(auth.uid(), -913002, 'Vsiljivec', pg_temp.kader())$$);
select pg_temp.zavrnjeno('uporabnik ne more klicati odstrani_hisne_ekipe',
  $$select odstrani_hisne_ekipe(array[-913001]::bigint[])$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('anonimni ne more klicati ustvari_hisno_ekipo',
  $$select ustvari_hisno_ekipo('b8a06635-2322-4444-8c42-44e419f912ae', -913002, 'Anon', '[]'::jsonb)$$);
reset role;

-- Mini liga: niti sistemski lastnik niti servis hisne ekipe ne vpise.
insert into mini_lige(id, name, code, owner_id) overriding system value
values (-915001, 'Hisna preizkus', 'HISNA915', 'b8a06635-2322-4444-8c42-44e419f912ab');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ae',true);
set local role authenticated;
select pg_temp.zavrnjeno('hisna ekipa se ne more pridruziti mini ligi',
  $$select pridruzi_mini_ligi('HISNA915', (select min(id) from fantasy_teams where hisna and competition_id=-913001))$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.zavrnjeno('tudi servis hisne ekipe ne vpise v mini ligo',
  $$insert into mini_liga_clani(mini_liga_id, fantasy_team_id) select -915001, min(id) from hisne$$);

-- Zaklep: hisne ekipe se posnamejo od prvega roka po nastanku, izbranost pa
-- jih ne steje.
update rounds set deadline_at=clock_timestamp() where id=-913004;
select zakleni_krog(-913004);
select pg_temp.preveri('hisne ekipe so v posnetku naslednjega kroga',
  (select count(distinct fantasy_team_id)=2 from fantasy_lineups
    where round_id=-913004 and player_id=-913002 and fantasy_team_id in (select id from hisne)));
insert into player_scores(player_id, round_id, points) values(-913001, -913004, 2)
  on conflict(player_id, round_id) do update set points=excluded.points;
select pg_temp.preveri('lestvica kroga prikaze isto hisno ime',
  (select owner_name='Testni Lastnik' from fantasy_round_standings
    where round_id=-913004 and fantasy_team_id=(select min(id) from hisne)));
update fantasy_teams set display_name=null where id=(select min(id) from hisne);
select pg_temp.preveri('lestvica kroga izpusti odstranjeno ime',
  (select owner_name is null from fantasy_round_standings
    where round_id=-913004 and fantasy_team_id=(select min(id) from hisne)));
select pg_temp.preveri('hisne ekipe nimajo posnetka za nazaj',
  not exists (select 1 from fantasy_lineups fl join rounds r on r.id=fl.round_id
               where r.number < 5 and fl.fantasy_team_id in (select id from hisne)));
-- Ena sama cloveska ekipa: izbranost bi izdala njen kader, zato je skrita
-- (prag 5 cloveskih ekip v krogu, 20261012137100). Stetje nad pragom je spodaj.
select pg_temp.preveri('izbranost je skrita, dokler je v krogu manj kot 5 cloveskih ekip',
  (select owners is null from player_standings where id=-913002 and competition_id=-913001));
create temporary table cloveski_posnetki as
  select count(*) as n from fantasy_lineups where round_id=-913004 and fantasy_team_id not in (select id from hisne);
select pg_temp.preveri('v lestvici lige so hisne ekipe z oznako',
  (select count(*)=2 from fantasy_team_standings where competition_id=-913001 and hisna)
  and (select count(*)=1 from fantasy_team_standings where competition_id=-913001 and not hisna));
set local session_replication_role = replica;
update competitions set active=true where id=-913001;
set local session_replication_role = origin;
select pg_temp.preveri('drzavna lestvica ne kaze hisnih ekip',
  exists (select 1 from lestvica_drzavna where fantasy_team_id=-913001)
  and not exists (select 1 from lestvica_drzavna where fantasy_team_id in (select id from hisne)));

-- Posta: tudi brez odjave sistemski lastnik ni kandidat.
update profiles set brez_opomnikov=false where id='b8a06635-2322-4444-8c42-44e419f912ae';
delete from fantasy_roster where fantasy_team_id in (select id from hisne) and player_id=-913015;
select pg_temp.preveri('hisne ekipe niso kandidati za opozorilo',
  not exists (select 1 from kandidati_za_opozorilo(-913001, 5) k
               where k.user_id='b8a06635-2322-4444-8c42-44e419f912ae'));
insert into push_tokens(token,user_id,platforma)
values ('test-hisa-zeton','b8a06635-2322-4444-8c42-44e419f912ae','android');
select pg_temp.preveri('hisni lastnik ni kandidat za push opomnik',
  not exists (select 1 from competitions c cross join lateral kandidati_za_push_opomnik(c.id) k
               where k.user_id='b8a06635-2322-4444-8c42-44e419f912ae'));
select pg_temp.preveri('hisni lastnik ni kandidat za opomnik',
  not exists (select 1 from competitions c cross join lateral kandidati_za_opomnik(c.id) k
               where (c.active or c.id=-913001) and k.user_id='b8a06635-2322-4444-8c42-44e419f912ae'));
select pg_temp.preveri('hisni lastnik ni med uporabniki',
  skupaj_uporabnikov() = (select n from uporabnikov_pred) - 1);

-- Potisna obvestila: zeton zapise le RPC, prebere le servis; zeton naprave se
-- ob prijavi drugega uporabnika preseli k njemu.
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f912b0','test-izbris@example.invalid','{"display_name":"Izbris"}',now()-interval '2 days');
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value
values (-913090,'b8a06635-2322-4444-8c42-44e419f912b0','Ekipa za izbris',-913002,now()-interval '2 days');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select shrani_push_zeton('test-zeton-naprave', 'ios');
select pg_temp.zavrnjeno('uporabnik ne pise v push_tokens mimo RPC',
  $$insert into push_tokens(token,user_id,platforma) values ('tuj','b8a06635-2322-4444-8c42-44e419f912ac','android')$$);
select pg_temp.preveri('uporabnik ne bere push_tokens', not exists (select 1 from push_tokens));
reset role;
select pg_temp.pade('neveljavna platforma zetona pade', $$select shrani_push_zeton('x', 'windows')$$);
set local role authenticated;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912b0',true);
select shrani_push_zeton('test-zeton-naprave', 'android');
reset role;
select pg_temp.preveri('zeton naprave se preseli k novemu uporabniku',
  (select user_id from push_tokens where token='test-zeton-naprave')='b8a06635-2322-4444-8c42-44e419f912b0');

-- Izbris racuna: anon ne more, uporabnik izbrise samo sebe z vsem, kar ima.
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('anon ne klice izbrisi_moj_racun', $$select izbrisi_moj_racun()$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912b0',true);
set local role authenticated;
select izbrisi_moj_racun();
reset role;
select pg_temp.preveri('izbris racuna odstrani uporabnika, profil, ekipo in zeton',
  not exists (select 1 from auth.users where id='b8a06635-2322-4444-8c42-44e419f912b0')
  and not exists (select 1 from profiles where id='b8a06635-2322-4444-8c42-44e419f912b0')
  and not exists (select 1 from fantasy_teams where id=-913090)
  and not exists (select 1 from push_tokens where token='test-zeton-naprave'));
select pg_temp.preveri('izbris racuna ne zadene drugih',
  exists (select 1 from auth.users where id='b8a06635-2322-4444-8c42-44e419f912ab')
  and exists (select 1 from fantasy_teams where id=-913001));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ae',true);
select pg_temp.pade('sistemskega lastnika hisnih ekip ni mogoce izbrisati', $$select izbrisi_moj_racun()$$);
select set_config('request.jwt.claim.sub','',true);


-- Odstranjevanje: samo hisne, in nic, ce je vmes cloveska.
select pg_temp.pade('odstranjevanje zavrne cloveske ekipe',
  $$select odstrani_hisne_ekipe(array[-913001]::bigint[] || array(select id from hisne))$$);
select pg_temp.preveri('odstranjevanje vrne stevilo hisnih ekip',
  odstrani_hisne_ekipe(array(select id from hisne)) = 2);
select pg_temp.preveri('odstranjevanje odstrani natanko hisne ekipe',
  not exists (select 1 from fantasy_teams where id in (select id from hisne))
  and not exists (select 1 from fantasy_lineups where fantasy_team_id in (select id from hisne))
  and not exists (select 1 from tocke_krogov where fantasy_team_id in (select id from hisne))
  and (select count(*) from fantasy_lineups where round_id=-913004) = (select n from cloveski_posnetki));

-- Anonimizacija igralcev (GDPR, migracija 20261009180000).
reset role;
-- -913040 in -913042 sta ista oseba (ista šifra) v dveh ligah, -913043 le
-- soimenjak brez šifre. -913041 je star igralec v Sloveniji, -913044/-913045
-- v Avstriji (neaktiven / aktiven).
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-913003, 'test-varnost-at', 'Test AT', 'TAT', false, (select id from countries where code='AT'), 'oefb');
insert into players(id, team_id, competition_id, first_name, last_name, full_name, reg_st, position,
                    position_source, value, value_start, active) overriding system value
values (-913040, -913001, -913001, 'Šime', 'Test', 'Test Šime', 913040, 'MID', 'admin', 5, 5, true),
       (-913042, -913002, -913002, 'Šime', 'Test', 'Test Šime', 913040, 'MID', 'admin', 5, 5, true),
       (-913043, -913003, -913002, 'Šime', 'Test', 'Test Šime', null, 'MID', 'admin', 5, 5, true),
       (-913041, -913001, -913001, 'Stari', 'Test', 'Test Stari', null, 'MID', 'admin', 5, 5, false),
       (-913044, -913001, -913003, 'Alt', 'Test', 'Test Alt', null, 'MID', 'admin', 5, 5, false),
       (-913045, -913001, -913003, 'Aktiv', 'Test', 'Test Aktiv', null, 'MID', 'admin', 5, 5, true);
insert into player_reports(player_id, user_id, kind, content)
values (-913040, 'b8a06635-2322-4444-8c42-44e419f912ab', 'poskodba', 'Šime je poškodovan');
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('anonimni ne more anonimizirati igralca',
  $$select anonimiziraj_igralca(-913040)$$);
select pg_temp.zavrnjeno('anonimni ne bere zgoscenih kljucev',
  $$select * from anonimizirani_igralci$$);
select pg_temp.zavrnjeno('anonimni ne more vklopiti lige',
  $$select vklopi_ligo_sredi_sezone('test-varnost')$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('uporabnik ne more vklopiti lige',
  $$select vklopi_ligo_sredi_sezone('test-varnost')$$);
select pg_temp.zavrnjeno('uporabnik ne more klicati servisne anonimizacije',
  $$select anonimiziraj_igralca(-913040)$$);
select pg_temp.zavrnjeno('uporabnik ne more klicati skrbniske anonimizacije',
  $$select admin_anonimiziraj_igralca(array[-913040]::bigint[])$$);
select pg_temp.zavrnjeno('uporabnik ne vidi skrbniskega seznama iste osebe',
  $$select * from admin_ista_oseba(-913040)$$);
select pg_temp.zavrnjeno('uporabnik ne bere zgoscenih kljucev',
  $$select * from anonimizirani_igralci$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('ista oseba: ista sifra samodejno, soimenjak le na seznamu',
  (select array_agg(id::text || ':' || po_sifri::text order by id) from admin_ista_oseba(-913040))
  = array['-913043:false', '-913042:true']);
select pg_temp.preveri('admin anonimizira izbrano vrstico in vse z isto sifro',
  admin_anonimiziraj_igralca(array[-913040]::bigint[]) = 2);
reset role;
select pg_temp.preveri('anonimizacija zamenja ime, odstrani sifro in porocila',
  (select bool_and(full_name='#'||id and first_name='' and last_name='#'||id and reg_st is null
                   and anonimiziran_razlog='ugovor' and anonimiziran_at is not null)
     from players where id in (-913040, -913042))
  and not exists (select 1 from player_reports where player_id=-913040));
select pg_temp.preveri('soimenjak brez sifre ostane, dokler ga admin ne odkljuka',
  (select full_name='Test Šime' and anonimiziran_at is null from players where id=-913043));
-- Isti ključi so v smoke (imeHash, regHash): uvoz in baza morata zgostiti enako.
select pg_temp.preveri('kljuc baze je enak kljucu uvoza',
  anonimizacijski_kljuc('7|Test Šime') = '558e773d490d37ef3d185b90d5f8e2017391b71b5e5c14d74888dc3e874f514c'
  and anonimizacijski_kljuc('7|reg|913040') = '0977c5f2629986f97d714990a002b776017db2c12c201af132af556ae48780d7');
select pg_temp.preveri('anonimizacija hrani kljuca imena in sifre za uvoz',
  (select count(*) = 2 from anonimizirani_igralci a where a.player_id=-913040
     and a.kljuc in (anonimizacijski_kljuc((select id from countries where code='SI') || '|Test Šime'),
                     anonimizacijski_kljuc((select id from countries where code='SI') || '|reg|913040'))));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
update players set full_name='Test Šime', anonimiziran_at=null where id=-913040;
reset role;
select pg_temp.preveri('uporabnik ne more vrniti imena anonimiziranemu',
  (select full_name='#-913040' and anonimiziran_at is not null from players where id=-913040));
select anonimiziraj_igralca(-913040, 'neaktiven');
select pg_temp.preveri('ugovor prevlada nad neaktivnostjo, kljuca ostaneta',
  (select anonimiziran_razlog='ugovor' from players where id=-913040)
  and (select count(*) = 2 from anonimizirani_igralci where player_id=-913040));

-- 18 mesecev brez nastopa: le Avstrija, le neaktivni, ne igralec v kadru.
insert into rounds(id,season,number,deadline_at,played_on,competition_id) overriding system value
values (-913040,'2020/21',1,'2020-09-01','2020-09-01',-913001),
       (-913041,'2020/21',1,'2020-09-01','2020-09-01',-913003);
insert into matches(id, round_id, home_team_id, away_team_id, played_on) overriding system value
values (-913040,-913040,-913001,-913002,'2020-09-01'),
       (-913041,-913041,-913001,-913002,'2020-09-01');
insert into appearances(match_id, player_id, team_id)
values (-913040,-913041,-913001), (-913041,-913044,-913001), (-913041,-913045,-913001);
-- -913046: neaktiven avstrijski igralec, a v kadru hišne ekipe.
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position,
                    position_source, value, value_start, active) overriding system value
values (-913046, -913001, -913003, 'Kader', 'Test', 'Test Kader', 'MID', 'admin', 5, 5, false);
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value
values (-913046,'b8a06635-2322-4444-8c42-44e419f912ac','Kader AT',-913003,now());
insert into fantasy_roster(fantasy_team_id, player_id, is_starter) values (-913046, -913046, true);
insert into appearances(match_id, player_id, team_id) values (-913041, -913046, -913001);
select anonimiziraj_neaktivne();
select pg_temp.preveri('nocna anonimizacija skrije neaktivnega avstrijskega igralca po 18 mesecih',
  (select full_name='#-913044' and anonimiziran_razlog='neaktiven' from players where id=-913044));
select pg_temp.preveri('nocna anonimizacija izpusti Slovenijo, aktivne in igralce v kadru',
  (select bool_and(anonimiziran_at is null) from players
    where id in (-913041, -913045, -913046)));

-- Lestvica prave lige: kontumacija šteje z izidom, razpored brez izida ne,
-- klub iz razporeda je v lestvici z ničlami; anon jo sme brati.
reset role;
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
select -913050-n, '2098/99', 50+n, now()+interval '9 days', -913001 from generate_series(0,2) n;
insert into matches(id, round_id, home_team_id, away_team_id, played_on, home_goals, away_goals,
                    imported_at, kontumacija) overriding system value
values (-913050,-913050,-913001,-913002,'2099-08-01',2,0,now(),false),
       (-913051,-913051,-913003,-913001,'2099-08-08',1,1,now(),false),
       (-913052,-913051,-913002,-913004,'2099-08-08',3,0,null,true),
       (-913053,-913052,-913005,-913001,'2099-08-15',0,0,null,false);
set local role anon;
select pg_temp.preveri('lestvica lige: točke, goli, forma in vrstni red',
  (select string_agg(format('%s:%s:%s:%s-%s:%s', mesto, team_id, tocke, dani, prejeti, forma), ' ' order by mesto)
     from lestvica_lige(-913001, '2098/99'))
  = '1:-913001:4:3-1:WD 2:-913002:3:3-2:LW 3:-913003:1:1-1:D 4:-913005:0:0-0: 5:-913004:0:0-3:L');
select pg_temp.preveri('lestvica lige: privzeta sezona je zadnja z odigrano tekmo, ne starejša',
  (select bool_and(sezona = '2099/00') from lestvica_lige(-913001)));
reset role;

select pg_temp.preveri('stevilo_ekip_lig: anon in authenticated le bereta',
  has_table_privilege('anon', 'stevilo_ekip_lig', 'select')
  and has_table_privilege('authenticated', 'stevilo_ekip_lig', 'select')
  and not has_table_privilege('anon', 'stevilo_ekip_lig', 'insert,update,delete,truncate')
  and not has_table_privilege('authenticated', 'stevilo_ekip_lig', 'insert,update,delete,truncate'));
select pg_temp.preveri('stevilo_ekip_lig steje vse ekipe lige, tudi hisne',
  (select ekip = (select count(*) from fantasy_teams where competition_id = -913003)
     from stevilo_ekip_lig where competition_id = -913003));

select pg_temp.preveri('trgovine_dnevno/stanje: anon in authenticated nimata nobene pravice',
  not has_table_privilege('anon', 'trgovine_dnevno', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'trgovine_dnevno', 'select,insert,update,delete')
  and not has_table_privilege('anon', 'trgovine_stanje', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'trgovine_stanje', 'select,insert,update,delete'));
select pg_temp.preveri('admin_rast: anon ne sme klicati',
  not has_function_privilege('anon', 'admin_rast(date)', 'execute'));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('admin_rast: prijavljen ne-admin dobi napako', $$select admin_rast()$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('admin_rast: admin dobi dneve',
  jsonb_array_length(admin_rast(current_date - 6)->'dnevi') >= 7);
reset role;

-- Zliti soimenjaki (Petrović Lazar, rs-srpska-istok, 10/2026): en igralec z
-- nastopi za dva kluba v istih krogih. razdeli_zlitega_igralca ga razdeli po
-- klubih; id ostane klubu lastnikov (pozicija ob nakupu) ali trenutnemu.
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-916001, 'test-zliti', 'Test zlitih', 'ZLITI', false, (select id from countries where code='SI'), 'fssid');
insert into teams(id, name, short_name, country_id) overriding system value
select -916000-n, 'Test zliti '||n, 'Z'||n, (select id from countries where code='SI')
from generate_series(1,4) n;
-- -916001 "Morava" (vratar), -916002 "Malošište" (polje), -916003/4 nasprotnika
insert into rounds(id, season, number, deadline_at, competition_id, played_on) overriding system value
select -916000-n, '2099/00', n, now()-interval '1 day'*(60-7*n), -916001, (current_date-(60-7*n))
from generate_series(1,5) n;
insert into matches(id, round_id, home_team_id, away_team_id, played_on, home_goals, away_goals, imported_at) overriding system value
values (-916011, -916001, -916001, -916003, current_date-53, 0, 0, now()),
       (-916012, -916001, -916002, -916004, current_date-52, 1, 0, now()),
       (-916021, -916002, -916001, -916003, current_date-46, 0, 0, now()),
       (-916022, -916002, -916002, -916004, current_date-45, 2, 0, now()),
       (-916031, -916003, -916001, -916003, current_date-39, 0, 0, now()),
       (-916032, -916003, -916002, -916004, current_date-39, 0, 0, now()),
       (-916041, -916004, -916001, -916003, current_date-32, 0, 0, now()),
       (-916052, -916005, -916002, -916004, current_date-25, 0, 0, now());
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position,
                    position_source, value, active) overriding system value
values (-916001, -916002, -916001, 'Lazar', 'Zliti', 'Zliti Lazar', 'GK', 'zapisnik', 6, true),
       (-916002, -916002, -916001, 'Ana', 'Zliti', 'Zliti Ana', 'GK', 'zapisnik', 6, true),
       (-916003, -916002, -916001, 'Reg', 'Zliti', 'Zliti Reg', 'MID', 'zapisnik', 6, true);
update players set reg_st = 916003 where id = -916003;
-- Prestop s prestavljeno tekmo: 2. krog za Moravo, tri tedne pozneje
-- prestavljeni 2. krog za Malošište — isti krog, a ne zlitje.
insert into matches(id, round_id, home_team_id, away_team_id, played_on, imported_at) overriding system value
values (-916062, -916002, -916004, -916002, current_date-20, now());
insert into players(id, team_id, competition_id, first_name, last_name, full_name,
                    position_source, active) overriding system value
values (-916006, -916002, -916001, 'Pre', 'Zliti', 'Zliti Pre', 'neznano', true);
insert into appearances(match_id, player_id, team_id, started, minutes_played)
values (-916011, -916006, -916001, true, 90), (-916021, -916006, -916001, true, 90),
       (-916052, -916006, -916002, true, 90), (-916062, -916006, -916002, true, 90);
-- Uvoz po popravku je za tekmo 4. kroga Morave že ustvaril soimenjaka -916005.
insert into players(id, team_id, competition_id, first_name, last_name, full_name,
                    position_source, active) overriding system value
values (-916004, -916002, -916001, 'Bor', 'Zliti', 'Zliti Bor', 'neznano', true),
       (-916005, -916001, -916001, 'Bor', 'Zliti', 'Zliti Bor', 'neznano', true);
insert into appearances(match_id, player_id, team_id, started, minutes_played)
select m, case when m = -916041 then -916005 else -916004 end,
       case when abs(m) % 10 = 1 then -916001 else -916002 end, true, 90
from unnest(array[-916011,-916012,-916021,-916022,-916031,-916032,-916041,-916052]) m;
-- -916001 brez lastnika, -916002 z lastnikom, ki ga je kupil kot vratarja.
insert into appearances(match_id, player_id, team_id, started, minutes_played, is_goalkeeper, shirt_number, goals, clean_sheet)
select m, pl, case when abs(m) % 10 = 1 then -916001 else -916002 end, true, 90, abs(m) % 10 = 1,
       case when abs(m) % 10 = 1 then 1 else 14 end, case when m = -916022 then 1 else 0 end, abs(m) % 10 = 1
from unnest(array[-916011,-916012,-916021,-916022,-916031,-916032,-916041,-916052]) m
cross join (values (-916001), (-916002), (-916003)) v(pl);
insert into goals(id, match_id, scorer_id, team_id, minute) overriding system value
values (-916001, -916022, -916001, -916002, 10), (-916002, -916022, -916002, -916002, 20),
       (-916003, -916022, -916003, -916002, 30);
select recompute_round_scores(id) from rounds where competition_id = -916001;
insert into fantasy_teams(id,owner_id,name,competition_id) overriding system value
values (-916001,'b8a06635-2322-4444-8c42-44e419f912ab','Zliti ekipa',-916001);
insert into fantasy_roster(fantasy_team_id, player_id, is_starter, buy_position, buy_value)
values (-916001, -916002, true, 'GK', 6);

select pg_temp.preveri('zliti: anon ne kliče razdeli_zlitega_igralca',
  not has_function_privilege('anon', 'razdeli_zlitega_igralca(bigint,boolean)', 'execute')
  and not has_function_privilege('authenticated', 'zliti_igralci(text,text)', 'execute'));
select pg_temp.preveri('zliti: kandidati najdeni, igralec s šifro preskočen',
  (select count(*) from zliti_igralci('test-zliti') where preskok is null) = 3
  and (select preskok from zliti_igralci('test-zliti') where player_id = -916003) = 'sifra'
  and (select preskok from zliti_igralci('test-zliti') where player_id = -916006) = 'prestavljena-tekma'
  and razdeli_zlitega_igralca(-916006, true)->>'stanje' = 'brez-spora');

-- Načrt ne piše.
select pg_temp.preveri('zliti: načrt ne spremeni ničesar',
  razdeli_zlitega_igralca(-916001)->>'stanje' = 'nacrt'
  and (select count(*) from appearances where player_id = -916001) = 8);

do $$
declare v jsonb; v_nov bigint;
begin
  v := razdeli_zlitega_igralca(-916001, true);
  v_nov := (v->'novi'->0->>'igralec')::bigint;
  perform pg_temp.preveri('zliti: brez lastnika id ostane trenutnemu klubu',
    v->'ohrani'->>'klub' = '-916002' and v->'ohrani'->>'pravilo' = 'trenutni-klub'
    and (select count(*) from appearances where player_id = -916001 and team_id = -916002) = 4
    and not exists (select 1 from appearances where player_id = -916001 and team_id <> -916002));
  perform pg_temp.preveri('zliti: drugi klub dobi novega igralca (vratar, svoji nastopi)',
    (select team_id = -916001 and position = 'GK' and full_name = 'Zliti Lazar' and competition_id = -916001
       from players where id = v_nov)
    and (select count(*) from appearances where player_id = v_nov) = 4);
  perform pg_temp.preveri('zliti: ostanek ni več vratar',
    (select position is null and position_source = 'neznano' from players where id = -916001));
  perform pg_temp.preveri('zliti: gol ostane strelcu svojega kluba',
    (select scorer_id = -916001 from goals where id = -916001));
  perform pg_temp.preveri('zliti: točke kroga le iz svoje tekme',
    (select count(*) from player_scores where player_id = -916001) = 4
    and (select count(*) from player_scores where player_id = v_nov) = 4
    and (select points from player_scores where player_id = -916001 and round_id = -916001)
        = (select sum(points) from appearance_points where player_id = -916001 and round_id = -916001));
  perform pg_temp.preveri('zliti: statistika sledi razdelitvi',
    (select matches from statistika_igralcev where player_id = -916001) = 4
    and (select matches from statistika_igralcev where player_id = v_nov) = 4);
  perform pg_temp.preveri('zliti: ponoven zagon ne naredi ničesar',
    razdeli_zlitega_igralca(-916001, true)->>'stanje' = 'brez-spora'
    and (select count(*) from players where competition_id = -916001 and full_name = 'Zliti Lazar') = 2);

  v := razdeli_zlitega_igralca(-916002, true);
  v_nov := (v->'novi'->0->>'igralec')::bigint;
  perform pg_temp.preveri('zliti: lastnik je kupil vratarja — id ostane vratarju',
    v->'ohrani'->>'pravilo' = 'pozicija-ob-nakupu'
    and (select team_id = -916001 and position = 'GK' from players where id = -916002)
    and (select team_id = -916002 and position is null from players where id = v_nov)
    and exists (select 1 from fantasy_roster where player_id = -916002));
  perform pg_temp.preveri('zliti: gol gre z nastopom k novemu igralcu',
    (select scorer_id = v_nov from goals where id = -916002));
end;
$$;
do $$
declare v jsonb;
begin
  v := razdeli_zlitega_igralca(-916004, true);
  perform pg_temp.preveri('zliti: obstoječi soimenjak kluba dobi nastope',
    v->'novi'->0->>'zapis' = 'obstojec'
    and (select count(*) from appearances where player_id = -916005) = 4
    and (select count(*) from players where full_name = 'Zliti Bor') = 2);
end;
$$;
select pg_temp.preveri('zliti: igralec s šifro ostane cel',
  razdeli_zlitega_igralca(-916003, true)->>'stanje' = 'sifra'
  and (select count(*) from appearances where player_id = -916003) = 8);

-- --- Profili: nastavitve in javna stran (20261012081100) ---------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
-- Napaka sprožilca nosi kodo v `hint` (vmesnik jo prevede); enoličnost ob
-- dirki pa je 23505 iz indeksa.
create function pg_temp.napaka(p_opis text, p_sql text, p_hint text) returns void
language plpgsql as $$
declare v_hint text; v_ok boolean := false;
begin
  begin
    execute p_sql;
    raise exception using errcode = 'P9998', message = 'Napad je uspel';
  exception
    when sqlstate 'P9998' then null;
    when others then
      get stacked diagnostics v_hint = pg_exception_hint;
      v_ok := p_hint is null or v_hint = p_hint or (p_hint = 'ime-zasedeno' and sqlstate = '23505');
  end;
  perform pg_temp.preveri(p_opis, v_ok);
end;
$$;
grant execute on function pg_temp.napaka(text, text, text) to anon, authenticated;
-- Ekipe so na profilu le v aktivnih ligah.
update competitions set active = true where id = -913001;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
-- Ime je ta uporabnik spremenil že na začetku datoteke (admin ga je nato popravil).
select pg_temp.napaka('profil: ime najvec enkrat na 7 dni',
  $$update profiles set display_name='Drugo ime' where id=auth.uid()$$, 'ime-prepogosto');
select pg_temp.zavrnjeno('profil: datuma spremembe imena ni mogoce ponastaviti',
  $$update profiles set display_name_changed_at=null where id=auth.uid()$$);
select pg_temp.zavrnjeno('profil: liga poznavalca ostane servisna',
  $$update profiles set insider_competition_id=-913001 where id=auth.uid()$$);
update profiles set avatar_barva=3, avatar_ikona='pokal', javni_profil=false where id=auth.uid();
select pg_temp.preveri('profil: lastnik nastavi avatar in zasebnost',
  (select avatar_barva=3 and avatar_ikona='pokal' and not javni_profil from profiles where id=auth.uid()));
select pg_temp.napaka('profil: ikona le iz nabora',
  $$update profiles set avatar_ikona='<script>' where id=auth.uid()$$, null);
select pg_temp.napaka('profil: barva le iz palete',
  $$update profiles set avatar_barva=99 where id=auth.uid()$$, null);
update profiles set javni_profil=false, avatar_barva=1, display_name='Prevzeto' where id='b8a06635-2322-4444-8c42-44e419f912ac';
select pg_temp.preveri('profil: tujega profila ni mogoce urejati',
  (select javni_profil and avatar_barva is null and display_name='Tujec' from profiles where id='b8a06635-2322-4444-8c42-44e419f912ac'));
select pg_temp.preveri('profil: lastnik vidi svoj zasebni profil z ekipami',
  (select (v->>'jaz')::boolean and (v->'ekipe') @> '[{"id": -913001, "mesto": 1}]'::jsonb
     from javni_profil(auth.uid()) v));
select pg_temp.preveri('profil: lestvica pozna lastnika ekipe',
  (select owner_id=auth.uid() from fantasy_team_standings where fantasy_team_id=-913001));

reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.napaka('profil: ime prekratko',
  $$update profiles set display_name='ab' where id=auth.uid()$$, 'ime-dolzina');
select pg_temp.napaka('profil: ime predolgo',
  $$update profiles set display_name=repeat('x',25) where id=auth.uid()$$, 'ime-dolzina');
select pg_temp.napaka('profil: ime se ne izdaja za admina',
  $$update profiles set display_name='Glavni Adm1n' where id=auth.uid()$$, 'ime-rezervirano');
select pg_temp.napaka('profil: ime se ne izdaja za SLFF',
  $$update profiles set display_name='S.L.F.F. ekipa' where id=auth.uid()$$, 'ime-rezervirano');
select pg_temp.napaka('profil: ime se ne izdaja za moderatorja',
  $$update profiles set display_name='Moderator Jan' where id=auth.uid()$$, 'ime-rezervirano');
select pg_temp.napaka('profil: zaljivo ime',
  $$update profiles set display_name='Fuck You' where id=auth.uid()$$, 'ime-neprimerno');
select pg_temp.napaka('profil: oznake HTML niso ime',
  $$update profiles set display_name='<b>Jan</b>' where id=auth.uid()$$, 'ime-znaki');
update profiles set display_name='  Novi   Tujec ' where id=auth.uid();
select pg_temp.preveri('profil: veljavno ime se shrani obrezano',
  (select display_name='Novi Tujec' and display_name_changed_at is not null from profiles where id=auth.uid()));
reset role;
-- Teden je mimo: prvi uporabnik sme znova, a ne imena, ki ga že nosi drug.
update profiles set display_name_changed_at = now() - interval '8 days'
 where id='b8a06635-2322-4444-8c42-44e419f912ab';
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.napaka('profil: zasedeno ime ne glede na velike crke',
  $$update profiles set display_name='novi TUJEC' where id=auth.uid()$$, 'ime-zasedeno');
update profiles set display_name='Testni Manager' where id=auth.uid();
select pg_temp.preveri('profil: po tednu dni se ime spet da spremeniti',
  (select display_name='Testni Manager' from profiles where id=auth.uid()));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('profil: zasebni profil tujcu skrije ekipe in klub',
  (select v->>'ime'='Testni Manager' and not (v->>'javen')::boolean
          and not (v ? 'ekipe') and not (v ? 'navijam') and not (v ? 'dosezki') and not (v ? 'clan_od')
     from javni_profil('b8a06635-2322-4444-8c42-44e419f912ab') v));
reset role;

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('profil: zasebni profil anonimnemu le ime',
  (select v - 'id' - 'ime' - 'javen' - 'jaz' = '{}'::jsonb from javni_profil('b8a06635-2322-4444-8c42-44e419f912ab') v));
-- Ekipe in mini lige vrne le lastniku (20261012101100), anonimnemu ne.
select pg_temp.preveri('profil: javni profil brez servisnih polj in brez tujih ekip',
  (select (v ? 'clan_od') and not (v ? 'ekipe') and not (v ? 'is_admin') and not (v ? 'brez_opomnikov') and not (v ? 'insider_team_id')
          and not (v ? 'email') and not (v->>'jaz')::boolean
     from javni_profil('b8a06635-2322-4444-8c42-44e419f912ac') v));
reset role;
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f912af','test-hisa-profil@example.invalid','{"display_name":"SLFF hisa"}',now());
insert into fantasy_teams(owner_id,name,competition_id,hisna)
values ('b8a06635-2322-4444-8c42-44e419f912af','Hisna za profil',-913002,true);
set local role anon;
select pg_temp.preveri('profil: sistemski lastnik hisnih ekip nima profila',
  javni_profil('b8a06635-2322-4444-8c42-44e419f912af') is null);
select pg_temp.preveri('profil: neznan profil je NULL',
  javni_profil('00000000-0000-0000-0000-000000000000') is null);
select pg_temp.zavrnjeno('profil: anonimni ne ureja profilov',
  $$update profiles set javni_profil=false where id='b8a06635-2322-4444-8c42-44e419f912ac'$$);
select pg_temp.preveri('profil: iskanje kluba aktivne lige',
  (select count(*) >= 1 from isci_klube('test VARNOSTI')));
reset role;

-- Admin popravi ime drugemu brez omejitev (Administracija → Uporabniki).
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
update profiles set display_name='Ab' where id='b8a06635-2322-4444-8c42-44e419f912ac';
select pg_temp.preveri('profil: admin popravi tuje ime brez pravil',
  (select display_name='Ab' from profiles where id='b8a06635-2322-4444-8c42-44e419f912ac'));
reset role;
select set_config('request.jwt.claim.sub','',true);
-- ---------------------------------------------------------------------------
-- Prevzem profila igralca ("To sem jaz"), migracija 20261012091100.
-- ---------------------------------------------------------------------------
reset role;
create function pg_temp.napaka(p_opis text, p_sql text) returns void
language plpgsql as $$
declare v_napaka boolean := false;
begin
  begin
    execute p_sql;
    raise exception using errcode = 'P9998', message = 'Ni napake';
  exception
    when sqlstate 'P9998' then null;
    when others then v_napaka := true;
  end;
  perform pg_temp.preveri(p_opis, v_napaka);
end;
$$;
grant execute on function pg_temp.napaka(text, text) to anon, authenticated;

-- Uporabniki: A = ...ab (prosilec), T = ...ac (tujec), admin = ...ad,
-- S1, S2 potrjena soigralca, P poznavalec (odobren), M drugi prosilec.
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('c1a10000-0000-4000-8000-000000000001','prevzem-s1@example.invalid','{"display_name":"S1"}',now()),
 ('c1a10000-0000-4000-8000-000000000002','prevzem-s2@example.invalid','{"display_name":"S2"}',now()),
 ('c1a10000-0000-4000-8000-000000000003','prevzem-p@example.invalid','{"display_name":"P"}',now()),
 ('c1a10000-0000-4000-8000-000000000004','prevzem-m@example.invalid','{"display_name":"M"}',now()),
 ('c1a10000-0000-4000-8000-000000000005','prevzem-k@example.invalid','{"display_name":"K"}',now());
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-919009, 'test-varnost-u19', 'Test U19', 'TU19', false, (select id from countries where code='SI'), 'mnzg');
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-919016, -913001, -913001, 'Test', '16', 'Prevzem Šestnajst', 'MID', 'admin', 6, 6, true),
       (-919017, -913001, -919009, 'Test', '17', 'Prevzem Mladinec', 'MID', 'admin', 6, 6, true),
       (-919018, -913002, -913002, 'Test', '18', 'prevzem sestnajst', 'MID', 'admin', 6, 6, true);
-- S1 in S2 sta že potrjena igralca istega kluba in lige kot -913001.
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at) values
 (-913006, 'c1a10000-0000-4000-8000-000000000001', 'potrjen', 'admin', now()),
 (-913011, 'c1a10000-0000-4000-8000-000000000002', 'potrjen', 'admin', now());
-- Zgornji testi so A in T naredili za poznavalca lige; tu ne smeta biti.
update profiles set insider_competition_id = null
 where id in ('b8a06635-2322-4444-8c42-44e419f912ab', 'b8a06635-2322-4444-8c42-44e419f912ac');
-- P je odobren poznavalec kluba -913001 v ligi -913001.
update profiles set insider_team_id = -913001 where id = 'c1a10000-0000-4000-8000-000000000003';
insert into poznavalec_prosnje(user_id, competition_id, team_id, vloga, status)
values ('c1a10000-0000-4000-8000-000000000003', -913001, -913001, 'trener', 'klub');

select pg_temp.preveri('prevzem: mladinske lige po šifri',
  je_mladinski_slug('mladinci') and je_mladinski_slug('lj-mladinci-2') and je_mladinski_slug('mb-u19')
  and je_mladinski_slug('sml2-vzhod') and je_mladinski_slug('hu-bk-u19-del') and je_mladinski_slug('rs-u19-srbija')
  and not je_mladinski_slug('clani') and not je_mladinski_slug('lj-1-liga') and not je_mladinski_slug('snl3-vzhod')
  and not je_mladinski_slug('hu-u190'));

-- A odda zahtevek za -913001.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('prevzem: prijavljen odda zahtevek', prevzemi_igralca(-913001, 'https://example.org/klub') is not null);
select pg_temp.napaka('prevzem: le en odprt zahtevek na uporabnika', $$select prevzemi_igralca(-913002)$$);
select pg_temp.preveri('prevzem: prosilec vidi svoj čakajoči zahtevek',
  (select count(*) from zahtevki_igralca where player_id = -913001 and status = 'cakajoc') = 1);
-- A ima (iz testa zgoraj) sam nastavljen insider_team_id = -913001.
select pg_temp.zavrnjeno('prevzem: svojega zahtevka ne potrdiš (niti kot poznavalec)',
  $$select odloci_zahtevek_klub((select id from zahtevki_igralca where player_id=-913001 and status='cakajoc'), true)$$);
select pg_temp.zavrnjeno('prevzem: svojega zahtevka ne potrdiš kot soigralec',
  $$select potrdi_soigralca((select id from zahtevki_igralca where player_id=-913001 and status='cakajoc'))$$);
select pg_temp.zavrnjeno('prevzem: prosilec ne piše zahtevka neposredno',
  $$update zahtevki_igralca set status='potrjen', potrdil='admin' where user_id=auth.uid()$$);
select pg_temp.zavrnjeno('prevzem: prosilec ne doda potrditve soigralca neposredno',
  $$insert into potrditve_soigralcev(zahtevek_id,user_id,player_id) select id, auth.uid(), -913006 from zahtevki_igralca where user_id=auth.uid()$$);

-- Tujec: ni poznavalec ne soigralec; sam nastavljen klub ne šteje.
reset role;
select set_config('test.zahtevek', (select id::text from zahtevki_igralca where player_id=-913001 and status='cakajoc'), true);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
update profiles set insider_team_id = -913001 where id = auth.uid();
select pg_temp.preveri('prevzem: tujec ne vidi tujih čakajočih zahtevkov',
  (select count(*) from zahtevki_igralca) = 0);
select pg_temp.zavrnjeno('prevzem: sam nastavljen poznavalec kluba ne potrdi',
  $$select odloci_zahtevek_klub(current_setting('test.zahtevek')::bigint, true)$$);
select pg_temp.zavrnjeno('prevzem: tujec ne potrdi kot soigralec',
  $$select potrdi_soigralca(current_setting('test.zahtevek')::bigint)$$);
select pg_temp.preveri('prevzem: tujcu ni česa potrjevati',
  (select count(*) from zahtevki_za_odlocitev(-913001, null)) = 0);
reset role;
set local role anon;
select pg_temp.zavrnjeno('prevzem: anon ne bere zahtevkov', $$select count(*) from zahtevki_igralca$$);
select pg_temp.preveri('prevzem: čakajoči zahtevek ni javen',
  not exists (select 1 from potrjeni_igralci where player_id = -913001));
select pg_temp.zavrnjeno('prevzem: anon ne odda zahtevka', $$select prevzemi_igralca(-913002)$$);
select pg_temp.zavrnjeno('prevzem: anon ne bere žetonov', $$select count(*) from zetoni_prevzema$$);
reset role;

-- Soigralca S1 in S2 potrdita: po drugem je potrjen.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('prevzem: soigralec vidi zahtevek za odločitev',
  (select count(*) from zahtevki_za_odlocitev(-913001, null)) = 1);
select pg_temp.preveri('prevzem: prvi soigralec zabeleži',
  potrdi_soigralca((select id from zahtevki_za_odlocitev(null, -913001))) = 'zabelezeno');
select pg_temp.napaka('prevzem: isti soigralec ne potrdi dvakrat',
  $$select potrdi_soigralca((select id from zahtevki_za_odlocitev(null, -913001)))$$);
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000002',true);
select pg_temp.preveri('prevzem: drugi različni soigralec potrdi',
  potrdi_soigralca((select id from zahtevki_za_odlocitev(null, -913001))) = 'potrjen');
reset role;
select pg_temp.preveri('prevzem: potrdili soigralci',
  (select potrdil from zahtevki_igralca where player_id = -913001 and status = 'potrjen') = 'soigralci');

-- En potrjen na igralca in na uporabnika.
select pg_temp.napaka('prevzem: drug potrjen zahtevek za istega igralca ne gre (kazalo)',
  $$insert into zahtevki_igralca(player_id,user_id,status,potrdil) values (-913001,'b8a06635-2322-4444-8c42-44e419f912ac','potrjen','admin')$$);
select pg_temp.napaka('prevzem: drug potrjen profil istega uporabnika ne gre (kazalo)',
  $$insert into zahtevki_igralca(player_id,user_id,status,potrdil) values (-913002,'b8a06635-2322-4444-8c42-44e419f912ab','potrjen','admin')$$);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.napaka('prevzem: potrjen uporabnik ne prevzame še enega igralca',
  $$select prevzemi_igralca(-913002)$$);
-- Predstavitev: lastnik piše, drugi ne.
insert into profil_igralca(player_id, vzdevek, opis, instagram) values (-913001, 'Bomber', 'Napadalec.', 'test.igralec');
select pg_temp.preveri('prevzem: lastnik ureja predstavitev',
  (select vzdevek from profil_igralca where player_id = -913001) = 'Bomber');
-- Shramba (le kjer obstaja): lastnik naloži v mapo svojega igralca, tuj ne.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  execute $s$insert into storage.objects(bucket_id, name) values ('fotografije-igralcev', '-913001/test.webp')$s$;
  perform pg_temp.preveri('prevzem: lastnik naloži fotografijo svojega igralca', true);
  perform pg_temp.zavrnjeno('prevzem: lastnik ne naloži v mapo drugega igralca',
    $s$insert into storage.objects(bucket_id, name) values ('fotografije-igralcev', '-913006/test.webp')$s$);
end $$;
select pg_temp.napaka('prevzem: omrežje le kot uporabniško ime',
  $$update profil_igralca set instagram='https://evil.example/x' where player_id=-913001$$);
select pg_temp.napaka('prevzem: fotografija le v mapi svojega igralca',
  $$update profil_igralca set fotografija='-913002/a.webp' where player_id=-913001$$);
select pg_temp.zavrnjeno('prevzem: lastnik ne nastavi skrij_ime neposredno',
  $$update profil_igralca set skrij_ime=true where player_id=-913001$$);
do $$ begin update players set full_name = 'Drugo ime', value = 14 where id = -913001;
exception when others then null; end $$;
select pg_temp.preveri('prevzem: lastnik ne ureja uradnih podatkov',
  (select full_name is distinct from 'Drugo ime' and value <> 14 from players where id = -913001));
select pg_temp.napaka('prevzem: svojega profila ne prijaviš', $$select prijavi_profil_igralca(-913001)$$);

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  perform pg_temp.zavrnjeno('prevzem: tuj uporabnik ne naloži fotografije',
    $s$insert into storage.objects(bucket_id, name) values ('fotografije-igralcev', '-913001/vsiljivec.webp')$s$);
end $$;
update profil_igralca set vzdevek = 'Vsiljivec' where player_id = -913001;
select pg_temp.preveri('prevzem: tuj uporabnik ne ureja predstavitve',
  (select vzdevek from profil_igralca where player_id = -913001) = 'Bomber');
select pg_temp.zavrnjeno('prevzem: tuj uporabnik ne doda predstavitve',
  $$insert into profil_igralca(player_id, vzdevek) values (-913006, 'Vsiljivec')$$);
select prijavi_profil_igralca(-913001, 'To ni on.');
select pg_temp.napaka('prevzem: isti uporabnik prijavi profil le enkrat', $$select prijavi_profil_igralca(-913001)$$);
-- Spor: drugi uporabnik zahteva že potrjenega igralca.
select prevzemi_igralca(-913001);
select pg_temp.preveri('prevzem: zahtevek za potrjenega igralca je spor',
  (select spor from zahtevki_igralca where user_id = auth.uid() and status = 'cakajoc'));
select pg_temp.zavrnjeno('prevzem: povezuje le admin',
  $$select admin_povezi_igralca(1, -919018)$$);
select pg_temp.zavrnjeno('prevzem: predloge povezav vidi le admin',
  $$select * from admin_predlogi_povezav(1)$$);
select pg_temp.zavrnjeno('prevzem: vrsto zahtevkov vidi le admin',
  $$select * from admin_zahtevki_igralcev()$$);
select pg_temp.zavrnjeno('prevzem: fotografijo drugih odstrani le admin',
  $$select admin_odstrani_fotografijo(-913001)$$);
select pg_temp.zavrnjeno('prevzem: žeton za mail klubu ustvari le admin',
  $$select * from admin_prevzem_zeton_za_klub(1, 'klub@example.invalid')$$);
reset role;
set local role anon;
select pg_temp.preveri('prevzem: potrjena predstavitev je javna',
  (select vzdevek from profil_igralca where player_id = -913001) = 'Bomber'
  and (select potrdil from potrjeni_igralci where player_id = -913001) = 'soigralci');
reset role;

-- Admin: spornega ne more potrditi (igralec je že potrjen); poveže drugo vrstico.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka('prevzem: admin ne potrdi drugega profila za potrjenega igralca',
  $$select admin_odloci_zahtevek((select id from zahtevki_igralca where user_id='b8a06635-2322-4444-8c42-44e419f912ac' and status='cakajoc'), 'potrdi')$$);
select admin_odloci_zahtevek((select id from zahtevki_igralca where user_id='b8a06635-2322-4444-8c42-44e419f912ac' and status='cakajoc'), 'zavrni');
select admin_povezi_igralca((select id from zahtevki_igralca where player_id=-913001 and status='potrjen'), -919018);
select pg_temp.preveri('prevzem: povezana vrstica dobi značko in predstavitev',
  (select glavni_player_id from potrjeni_igralci where player_id = -919018) = -913001);
select pg_temp.napaka('prevzem: vrstica ne pripada dvema profiloma',
  $$select admin_povezi_igralca((select id from zahtevki_igralca where player_id=-913006 and status='potrjen'), -919018)$$);
reset role;
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
select prevzemi_igralca(-919018);
select pg_temp.preveri('prevzem: zahtevek za povezano vrstico je spor',
  (select spor from zahtevki_igralca where user_id = auth.uid() and status = 'cakajoc'));
select preklici_moj_zahtevek((select id from zahtevki_igralca where user_id = auth.uid() and status = 'cakajoc'));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_povezi_igralca((select id from zahtevki_igralca where player_id=-913001 and status='potrjen'), -919018, false);
select pg_temp.preveri('prevzem: admin odveže vrstico',
  not exists (select 1 from potrjeni_igralci where player_id = -919018));
reset role;

-- Poznavalec kluba (odobren): potrdi zahtevek M za -919016.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
select prevzemi_igralca(-919016);
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000003',true);
select pg_temp.preveri('prevzem: poznavalec vidi zahtevek kluba',
  (select vloga from zahtevki_za_odlocitev(-913001, -919016)) = 'klub');
select odloci_zahtevek_klub((select id from zahtevki_za_odlocitev(null, -919016)), true);
reset role;
select pg_temp.preveri('prevzem: potrdil klub',
  (select potrdil from zahtevki_igralca where player_id = -919016 and status = 'potrjen') = 'klub');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('prevzem: predlog povezave po imenu brez šumnikov',
  exists (select 1 from admin_predlogi_povezav((select id from zahtevki_igralca where player_id=-919016 and status='potrjen'))
           where player_id = -919018));
reset role;

-- Mladinska liga: brez potrdila o 16 letih ne gre.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.napaka('prevzem: mladinec mora potrditi 16 let', $$select prevzemi_igralca(-919017)$$);
select prevzemi_igralca(-919017, null, true);
select pg_temp.preveri('prevzem: potrdilo o 16 letih je shranjeno',
  (select star_vsaj_16 from zahtevki_igralca where user_id = auth.uid() and status = 'cakajoc'));
reset role;

-- Žeton kluba: enkraten, poteče.
insert into zetoni_prevzema(zahtevek_id, hash, expires_at)
select id, prevzem_zeton_hash('zeton-veljaven'), now() + interval '1 day'
  from zahtevki_igralca where user_id = 'c1a10000-0000-4000-8000-000000000005' and status = 'cakajoc';
insert into zetoni_prevzema(zahtevek_id, hash, expires_at)
select id, prevzem_zeton_hash('zeton-potekel'), now() - interval '1 minute'
  from zahtevki_igralca where user_id = 'c1a10000-0000-4000-8000-000000000005' and status = 'cakajoc';
select pg_temp.preveri('prevzem: žeton je shranjen le zgoščen',
  not exists (select 1 from zetoni_prevzema where hash in ('zeton-veljaven', 'zeton-potekel')));
set local role anon;
select pg_temp.zavrnjeno('prevzem: potekel žeton ne velja', $$select prevzem_odloci_z_zetonom('zeton-potekel', true)$$);
select pg_temp.zavrnjeno('prevzem: neznan žeton ne velja', $$select prevzem_odloci_z_zetonom('ugibam', true)$$);
select pg_temp.preveri('prevzem: klub potrdi z žetonom', prevzem_odloci_z_zetonom('zeton-veljaven', true) = 'potrjen');
select pg_temp.zavrnjeno('prevzem: žeton je enkraten', $$select prevzem_odloci_z_zetonom('zeton-veljaven', false)$$);
reset role;
select pg_temp.preveri('prevzem: stran /claim pokaže e-naslov prosilca le z veljavnim žetonom',
  (select prosilec_email is null from prevzem_zeton_podatki('zeton-veljaven')));
select pg_temp.preveri('prevzem: žeton potrdi kot klub',
  (select potrdil from zahtevki_igralca where user_id = 'c1a10000-0000-4000-8000-000000000005' and status = 'potrjen') = 'klub');

-- Mail "profil je potrjen": seznam neobveščenih ima e-naslove, zato le servis.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('prevzem: neobveščenih (e-naslovov) ne bere prijavljen', $$select * from prevzem_neobvesceni()$$);
select pg_temp.zavrnjeno('prevzem: obveščenosti ne označi prijavljen', $$select prevzem_obvescen(1)$$);
reset role;
set local role anon;
select pg_temp.zavrnjeno('prevzem: neobveščenih ne bere anonimen', $$select * from prevzem_neobvesceni()$$);
reset role;
select pg_temp.preveri('prevzem: potrjen s klubom čaka na mail',
  exists (select 1 from prevzem_neobvesceni() n join zahtevki_igralca z on z.id = n.zahtevek_id
           where z.user_id = 'c1a10000-0000-4000-8000-000000000005' and n.email = 'prevzem-k@example.invalid'));
select prevzem_obvescen(z.id) from zahtevki_igralca z where z.user_id = 'c1a10000-0000-4000-8000-000000000005' and z.status = 'potrjen';
select pg_temp.preveri('prevzem: mail gre vsakemu enkrat',
  not exists (select 1 from prevzem_neobvesceni() n join zahtevki_igralca z on z.id = n.zahtevek_id
               where z.user_id = 'c1a10000-0000-4000-8000-000000000005'));

-- Skrij ime: igralec ga ne skrije sam (ugovor gre prek admina); servisna
-- funkcija ostane obstoječa anonimizacija, predstavitev gre proč.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
insert into profil_igralca(player_id, vzdevek) values (-919016, 'Šestica');
select pg_temp.zavrnjeno('prevzem: igralec si imena ne skrije sam', $$select skrij_moje_ime()$$);
reset role;
select pg_temp.preveri('prevzem: skrij moje ime (servis) anonimizira', skrij_moje_ime() >= 1);
select pg_temp.preveri('prevzem: po skritju ni imena ne predstavitve',
  (select anonimiziran_razlog = 'ugovor' and full_name = '#' || id from players where id = -919016)
  and (select skrij_ime and vzdevek is null from profil_igralca where player_id = -919016));
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
update profil_igralca set vzdevek = 'Spet' where player_id = -919016;
select pg_temp.preveri('prevzem: po skritju imena predstavitve ni več mogoče urediti',
  (select vzdevek from profil_igralca where player_id = -919016) is null);
reset role;

-- Admin pošlje zahtevek klubu: nov žeton, naslov kluba, e-naslov prosilca na /claim.
with z as (
  insert into zahtevki_igralca (player_id, user_id)
  values (-913002, 'c1a10000-0000-4000-8000-000000000003') returning id
)
select set_config('test.prevzem_zahtevek', (select id::text from z), true);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka('prevzem: neveljaven naslov kluba pade',
  $$select * from admin_prevzem_zeton_za_klub(current_setting('test.prevzem_zahtevek')::bigint, 'ni-naslov')$$);
select set_config('test.prevzem_zeton', zeton, true)
  from admin_prevzem_zeton_za_klub(current_setting('test.prevzem_zahtevek')::bigint, ' Klub@Example.invalid ');
reset role;
select pg_temp.preveri('prevzem: admin pošlje klubu (čas in naslov zapisana)',
  (select klubu_poslano_at is not null and klubu_na = 'klub@example.invalid'
     from zahtevki_igralca where id = current_setting('test.prevzem_zahtevek')::bigint));
set local role anon;
select pg_temp.preveri('prevzem: klub na /claim vidi e-naslov prosilca',
  (select prosilec_email like '%@example.invalid' from prevzem_zeton_podatki(current_setting('test.prevzem_zeton'))));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_prevzem_zeton_za_klub(current_setting('test.prevzem_zahtevek')::bigint, 'klub@example.invalid');
reset role;
set local role anon;
select pg_temp.preveri('prevzem: ponovno pošiljanje razveljavi prejšnjo povezavo',
  (select stanje = 'potekel' from prevzem_zeton_podatki(current_setting('test.prevzem_zeton'))));
reset role;

-- Admin prekliče lažni profil: predstavitev in prijave gredo proč.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('prevzem: prijava je v vrsti admina',
  exists (select 1 from admin_zahtevki_igralcev() where player_id = -913001 and vrsta = 'prijava'));
select admin_odloci_zahtevek((select id from zahtevki_igralca where player_id=-913001 and status='potrjen'), 'preklici', 'Lažni profil');
reset role;
select pg_temp.preveri('prevzem: preklic odstrani predstavitev in prijave',
  not exists (select 1 from profil_igralca where player_id = -913001)
  and not exists (select 1 from potrjeni_igralci where player_id = -913001)
  and not exists (select 1 from prijave_profila_igralca p join zahtevki_igralca z on z.id = p.zahtevek_id
                   where z.player_id = -913001 and p.resena_at is null));

-- ---------------------------------------------------------------------------
-- Uradne odsotnosti potrjenih igralcev, migracija 20261012135100.
-- S1 (...001) je potrjen za -913006, S2 (...002) za -913011. Admin S1
-- poveže še vrstico -919020 v drugi ligi.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-919020, -913002, -913002, 'Test', '20', 'Uradni Povezan', 'MID', 'admin', 6, 6, true);
insert into povezani_igralci(player_id, zahtevek_id)
select -919020, id from zahtevki_igralca where player_id = -913006 and status = 'potrjen';

select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('uradno: drug potrjen igralec ne javi za tujega igralca',
  $$select objavi_uradno_odsotnost(-913006, 'poskodba')$$);
select pg_temp.zavrnjeno('uradno: ne javi niti za tujo povezano vrstico',
  $$select objavi_uradno_odsotnost(-919020, 'poskodba')$$);
select pg_temp.zavrnjeno('uradno: neposreden vpis v tabelo ne gre',
  $$insert into uradne_odsotnosti(player_id, zahtevek_id, user_id, vrsta, od, sezona)
    select -913011, id, auth.uid(), 'poskodba', current_date, '2026/27'
      from zahtevki_igralca where user_id = auth.uid() and status = 'potrjen'$$);
select pg_temp.zavrnjeno('uradno: tabele (z uporabnikom) ne bere vmesnik',
  $$select count(*) from uradne_odsotnosti$$);
select pg_temp.zavrnjeno('uradno: preverbo kliče le servis',
  $$select preveri_uradne_odsotnosti()$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.zavrnjeno('uradno: nepotrjen uporabnik ne javi',
  $$select objavi_uradno_odsotnost(-913001, 'poskodba')$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('uradno: anon ne javi', $$select objavi_uradno_odsotnost(-913006, 'poskodba')$$);
reset role;

-- S1 javi zase (glavna vrstica).
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('uradno: opomba največ 140 znakov',
  $$select objavi_uradno_odsotnost(-913006, 'poskodba', null, null, repeat('x', 141))$$);
select pg_temp.napaka('uradno: vrnitev po začetku',
  $$select objavi_uradno_odsotnost(-913006, 'poskodba', current_date, current_date)$$);
select pg_temp.napaka('uradno: neznana vrsta',
  $$select objavi_uradno_odsotnost(-913006, 'izlet')$$);
select pg_temp.preveri('uradno: potrjeni igralec javi zase',
  objavi_uradno_odsotnost(-913006, 'poskodba', null, null, 'Koleno') is not null);
select pg_temp.napaka('uradno: naenkrat le ena odprta (tudi za povezano vrstico)',
  $$select objavi_uradno_odsotnost(-919020, 'bolezen')$$);
select pg_temp.preveri('uradno: lastnik povezane vrstice vidi svoje stanje',
  (select lastnik and opomini = 0 and najvec = 2 and not blokiran from stanje_uradne_odsotnosti(-919020)));
select pg_temp.preveri('uradno: lastnik vidi, da je odsotnost njegova',
  (select moje from uradne_odsotnosti_view where player_id = -913006 and status = 'odprto'));
reset role;

select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('uradno: tujec ne zapre tuje odsotnosti',
  $$select zapri_uradno_odsotnost((select id from uradne_odsotnosti_view where player_id = -913006 and status = 'odprto'))$$);
select pg_temp.preveri('uradno: tujec ni lastnik in ne vidi opominov',
  (select not lastnik and opomini = 0 from stanje_uradne_odsotnosti(-913006)));
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('uradno: javna, a brez uporabnika',
  (select opomba = 'Koleno' and not moje and glavni_player_id = -913006
     from uradne_odsotnosti_view where player_id = -913006 and status = 'odprto')
  and not exists (select 1 from information_schema.columns
                   where table_name = 'uradne_odsotnosti_view' and column_name = 'user_id'));
reset role;

-- Preverba: odsotnost je bila objavljena pred 10 dnevi.
update uradne_odsotnosti set created_at = now() - interval '10 days', od = current_date - 10
 where user_id = 'c1a10000-0000-4000-8000-000000000001' and status = 'odprto';
insert into matches(id, round_id, home_team_id, away_team_id, played_on) overriding system value
values (-919101, -913005, -913005, -913002, current_date - 5),
       (-919102, -913006, -913005, -913001, current_date - 3),
       (-919103, -913006, -913004, -913001, current_date);
insert into appearances(match_id, player_id, team_id, minutes_played) values (-919101, -919020, -913002, 0);
select pg_temp.preveri('uradno: nastop brez minut ni opomin', preveri_uradne_odsotnosti() = 0);
update appearances set minutes_played = 45 where match_id = -919101 and player_id = -919020;
select pg_temp.preveri('uradno: igral na povezani vrstici = ni držalo', preveri_uradne_odsotnosti() = 1);
select pg_temp.preveri('uradno: ni držalo z datumom tekme',
  (select status = 'ni_drzalo' and ni_drzalo_datum = current_date - 5
     from uradne_odsotnosti_view where player_id = -913006 order by id desc limit 1));
select pg_temp.preveri('uradno: preverba je idempotentna', preveri_uradne_odsotnosti() = 0);

-- Zaprta pred tekmo: brez opomina.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('uradno: z enim opominom še javlja',
  objavi_uradno_odsotnost(-913006, 'kazen', current_date - 10, current_date + 10) is not null);
select pg_temp.napaka('uradno: ni držalo ne zapreš',
  $$select zapri_uradno_odsotnost((select id from uradne_odsotnosti_view where status = 'ni_drzalo' and moje limit 1))$$);
reset role;
update uradne_odsotnosti set created_at = now() - interval '10 days', status = 'zaprto', zaprto_at = now() - interval '8 days'
 where user_id = 'c1a10000-0000-4000-8000-000000000001' and status = 'odprto';
insert into appearances(match_id, player_id, team_id, minutes_played) values (-919102, -913006, -913001, 90);
select pg_temp.preveri('uradno: zaprta pred tekmo ni opomin', preveri_uradne_odsotnosti() = 0);

-- Tekma na dan objave ne šteje (poškodba, javljena po tekmi).
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select objavi_uradno_odsotnost(-913006, 'poskodba');
reset role;
insert into appearances(match_id, player_id, team_id, minutes_played) values (-919103, -913006, -913001, 90);
select pg_temp.preveri('uradno: tekma na dan objave ni opomin', preveri_uradne_odsotnosti() = 0);

-- "Spet sem nared" PO tekmi: opomin vseeno (tekma je bila med odprto odsotnostjo).
update uradne_odsotnosti set created_at = now() - interval '10 days', od = current_date - 10
 where user_id = 'c1a10000-0000-4000-8000-000000000001' and status = 'odprto';
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select zapri_uradno_odsotnost((select id from uradne_odsotnosti_view where moje and status = 'odprto'));
reset role;
select pg_temp.preveri('uradno: zaprta po tekmi je opomin', preveri_uradne_odsotnosti() = 1);
select pg_temp.preveri('uradno: dva opomina',
  uradne_odsotnosti_opomini('c1a10000-0000-4000-8000-000000000001') = 2);

-- Dva opomina: brez uradnih odsotnosti do konca sezone, navadna poročila gredo.
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('uradno: dva opomina blokirata uradne odsotnosti',
  $$select objavi_uradno_odsotnost(-913006, 'drugo')$$);
select pg_temp.preveri('uradno: stanje pove blokado',
  (select blokiran and opomini = 2 from stanje_uradne_odsotnosti(-913006)));
insert into player_reports(player_id, user_id, kind, content)
values (-913006, auth.uid(), 'poskodba', 'Navadno poročilo');
select pg_temp.preveri('uradno: blokiran še piše navadna poročila',
  exists (select 1 from player_reports where player_id = -913006 and content = 'Navadno poročilo'));
reset role;

-- Nova sezona: opomini lanske sezone ne štejejo več.
update uradne_odsotnosti set sezona = '2000/01'
 where user_id = 'c1a10000-0000-4000-8000-000000000001' and status = 'ni_drzalo';
select set_config('request.jwt.claim.sub','c1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('uradno: nova sezona, novi opomini',
  (select opomini = 0 and not blokiran from stanje_uradne_odsotnosti(-913006))
  and objavi_uradno_odsotnost(-913006, 'dopust') is not null);
select zapri_uradno_odsotnost((select id from uradne_odsotnosti_view where moje and status = 'odprto'));
select pg_temp.preveri('uradno: "Spet sem nared" brez posledic',
  not exists (select 1 from uradne_odsotnosti_view where moje and status = 'odprto')
  and (select opomini = 0 from stanje_uradne_odsotnosti(-913006)));
reset role;
select pg_temp.preveri('uradno: zaprta brez tekme ostane brez opomina', preveri_uradne_odsotnosti() = 0);
-- --- Zasebne ekipe (20261012137100) -----------------------------------------
-- Sestavo ekipe (posnetki, pripomocki, tuja_postava, ucinkovita postava) vidi
-- le lastnik in admin. Lestvice, tocke kroga in izbranost (nad pragom) ostanejo
-- javne. -913001 je ekipa uporabnika ...ab s posnetkom zaklenjenega kroga
-- -913002 in pripomockom; ...ac je tujec, ...ad admin.
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('zasebne: priprava ima posnetek in pripomocek',
  (select count(*)=15 from fantasy_lineups where round_id=-913002 and fantasy_team_id=-913001)
  and exists (select 1 from fantasy_chips where fantasy_team_id=-913001)
  and (select lineups_locked_at is not null from rounds where id=-913002));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('zasebne: lastnik bere svoje posnetke',
  (select count(*)=15 from fantasy_lineups where round_id=-913002 and fantasy_team_id=-913001));
select pg_temp.preveri('zasebne: lastnik bere svoje pripomocke',
  exists (select 1 from fantasy_chips where fantasy_team_id=-913001));
select pg_temp.preveri('zasebne: lastnik vidi svojo zaklenjeno postavo (tuja_postava)',
  (select count(*)=15 from tuja_postava(-913001, -913002)));
select pg_temp.preveri('zasebne: lastnik dobi svojo ucinkovito postavo',
  exists (select 1 from ucinkovita_postava(-913001, -913002)));
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('zasebne: tujec ne bere tujih posnetkov',
  not exists (select 1 from fantasy_lineups where fantasy_team_id=-913001));
select pg_temp.preveri('zasebne: tujec ne bere tujih pripomockov',
  not exists (select 1 from fantasy_chips where fantasy_team_id=-913001));
select pg_temp.preveri('zasebne: tujec ne bere tujega kadra',
  not exists (select 1 from fantasy_roster where fantasy_team_id=-913001));
select pg_temp.preveri('zasebne: tuja_postava tujcu ne vrne nicesar po roku',
  not exists (select 1 from tuja_postava(-913001, -913002)));
select pg_temp.preveri('zasebne: ucinkovita_postava in postava_kroga tujcu ne izdata postave',
  not exists (select 1 from ucinkovita_postava(-913001, -913002))
  and not exists (select 1 from postava_kroga(-913001, -913002)));
select pg_temp.zavrnjeno('zasebne: tujec ne klice pomocnika sme_videti_ekipo',
  $$select sme_videti_ekipo(-913001)$$);
select pg_temp.preveri('zasebne: tujec vidi tocke in mesto tuje ekipe',
  exists (select 1 from fantasy_team_standings where fantasy_team_id=-913001)
  and exists (select 1 from fantasy_round_points where fantasy_team_id=-913001 and round_id=-913002));
reset role;

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('zasebne: anonimni ne bere posnetkov, pripomockov ne kadra',
  not exists (select 1 from fantasy_lineups)
  and not exists (select 1 from fantasy_chips)
  and not exists (select 1 from fantasy_roster));
select pg_temp.preveri('zasebne: tuja_postava anonimnemu ne vrne nicesar',
  not exists (select 1 from tuja_postava(-913001, -913002)));
select pg_temp.preveri('zasebne: anonimni vidi lestvico in tocke kroga',
  exists (select 1 from fantasy_team_standings where fantasy_team_id=-913001)
  and exists (select 1 from fantasy_round_points where fantasy_team_id=-913001 and round_id=-913002));
select pg_temp.zavrnjeno('zasebne: anonimni ne more brisati hisnih ekip',
  $$select odstrani_hisne_ekipe(array[]::bigint[])$$);
select pg_temp.zavrnjeno('zasebne: anonimni ne sprozi preracuna vseh tock',
  $$select osvezi_vse_tocke_krogov()$$);
select pg_temp.zavrnjeno('zasebne: anonimni ne klice shrani_ekipo',
  $$select shrani_ekipo(-913001, '[]'::jsonb)$$);
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('zasebne: admin vidi tujo postavo in posnetke',
  (select count(*)=15 from tuja_postava(-913001, -913002))
  and (select count(*)=15 from fantasy_lineups where round_id=-913002 and fantasy_team_id=-913001)
  and exists (select 1 from fantasy_chips where fantasy_team_id=-913001));
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('zasebne: servis (postgres) vidi postavo',
  (select count(*)=15 from tuja_postava(-913001, -913002)));

-- Pravice: servisne funkcije ekip niso odprte vlogama anon in authenticated
-- (na strezniku jih je odprla obnova baze 6. 10. 2026).
select pg_temp.preveri('zasebne: servisne funkcije ekip niso javne',
  not exists (
    select 1 from unnest(array[
      'public.odstrani_hisne_ekipe(bigint[])', 'public.ustvari_hisno_ekipo(uuid, bigint, text, jsonb)',
      'public.osvezi_tocke_krogov(bigint[])', 'public.osvezi_vse_tocke_krogov()',
      'public.zakleni_krog(bigint)', 'public.zakleni_zapadle_kroge(interval)',
      'public.sme_videti_ekipo(bigint)', 'public.ime_hisnega_lastnika(bigint, bigint)'
    ]) f
     where has_function_privilege('anon', f::regprocedure, 'execute')
        or has_function_privilege('authenticated', f::regprocedure, 'execute')));
select pg_temp.preveri('zasebne: funkcije prijavljenih niso odprte anonimnim',
  not exists (
    select 1 from unnest(array[
      'public.shrani_ekipo(bigint, jsonb)', 'public.tedenski_pregled_mini_lige(bigint, integer)',
      'public.koncani_krogi_mini_lige(bigint)', 'public.stanje_mojih_ekip()',
      'public.razlog_neveljavne_ekipe(bigint)'
    ]) f
     where has_function_privilege('anon', f::regprocedure, 'execute'))
  and has_function_privilege('authenticated', 'public.shrani_ekipo(bigint, jsonb)', 'execute'));

-- Hisna ekipa: ista zasebnost (vidi le admin).
update profiles set brez_opomnikov=true where id='b8a06635-2322-4444-8c42-44e419f912ae';
create temporary table hisna_zasebna as
select ustvari_hisno_ekipo('b8a06635-2322-4444-8c42-44e419f912ae', -913001, 'Hisna zasebna', pg_temp.kader()) as id;
grant select on hisna_zasebna to anon, authenticated;
insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
select -913002, fr.fantasy_team_id, fr.player_id, fr.is_starter, fr.is_captain, fr.is_vice, fr.bench_order, fr.buy_position
  from fantasy_roster fr where fr.fantasy_team_id = (select id from hisna_zasebna);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('zasebne: postava hisne ekipe ni javna',
  not exists (select 1 from fantasy_lineups where fantasy_team_id=(select id from hisna_zasebna))
  and not exists (select 1 from tuja_postava((select id from hisna_zasebna), -913002)));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('zasebne: admin vidi postavo hisne ekipe',
  (select count(*)=15 from tuja_postava((select id from hisna_zasebna), -913002)));
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Izbranost: seštevek je javen sele od 5 cloveskih ekip v zadnjem
-- zaklenjenem krogu; hisne se ne stejejo ne v izbranost ne v prag.
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-917001, 'test-zasebne', 'Test zasebnih ekip', 'TZE', false, (select id from countries where code='SI'), 'mnzg');
insert into players(id, team_id, competition_id, first_name, last_name, position,
                    position_source, value, value_start, active) overriding system value
values (-917001, -913001, -917001, 'Zasebni', 'Igralec', 'MID', 'admin', 5, 5, true);
insert into rounds(id,season,number,deadline_at,lineups_locked_at,competition_id) overriding system value
values (-917001,'2099/00',1,now()-interval '2 days',now()-interval '2 days',-917001);
insert into auth.users(id,email,raw_user_meta_data,created_at)
select ('d1a10000-0000-4000-8000-00000000000'||n)::uuid, 'zasebne-'||n||'@example.invalid',
       jsonb_build_object('display_name','Zasebni '||n), now()-interval '5 days'
  from generate_series(1,5) n;
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value
select -917000-n, ('d1a10000-0000-4000-8000-00000000000'||n)::uuid, 'Zasebna '||n, -917001, now()-interval '5 days'
  from generate_series(1,5) n;
insert into fantasy_teams(id,owner_id,name,competition_id,created_at,hisna) overriding system value
values (-917009,'b8a06635-2322-4444-8c42-44e419f912ae','Zasebna hisna',-917001,now()-interval '5 days',true);
insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
select -917001, t, -917001, true, true, false, null, 'MID'
  from (values (-917001),(-917002),(-917003),(-917004),(-917009)) v(t);
set local role anon;
select pg_temp.preveri('zasebne: pri 4 cloveskih ekipah izbranost ni znana',
  (select owners is null from player_standings where id=-917001));
reset role;
insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
values (-917001, -917005, -917001, true, true, false, null, 'MID');
set local role anon;
select pg_temp.preveri('zasebne: od 5 cloveskih ekip anonimni vidi izbranost (brez hisnih)',
  (select owners = 5 from player_standings where id=-917001));
select pg_temp.preveri('zasebne: sezonska izbranost bere isti prag brez napake',
  (select count(*) >= 0 from player_season_standings where competition_id=-917001));
reset role;

-- Javne mini lige (migracija 20261012139100): objava, seznam, pridružitev
-- brez kode, varovalo imena, omejitev na lastnika, prijave in admin.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('c2b20000-0000-4000-8000-000000000001','javne-a@example.invalid','{"display_name":"JavnaA"}',now()),
 ('c2b20000-0000-4000-8000-000000000002','javne-b@example.invalid','{"display_name":"JavnaB"}',now()),
 ('c2b20000-0000-4000-8000-000000000003','javne-c@example.invalid','{"display_name":"JavnaC"}',now());
-- Aktivni ligi brez krogov: varovalo vklopa lige tu ni predmet testa.
set local session_replication_role = replica;
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-921001, 'test-javne-1', 'Test javnih 1', 'TJ1', true, (select id from countries where code='SI'), 'mnzg'),
       (-921002, 'test-javne-2', 'Test javnih 2', 'TJ2', true, (select id from countries where code='SI'), 'mnzg');
set local session_replication_role = origin;
-- A in B imata ekipo v -921001, B še v -921002, C le v -921002.
insert into fantasy_teams(id,owner_id,name,competition_id,created_at) overriding system value values
 (-921001,'c2b20000-0000-4000-8000-000000000001','Javna A',-921001,now()),
 (-921002,'c2b20000-0000-4000-8000-000000000002','Javna B',-921001,now()),
 (-921003,'c2b20000-0000-4000-8000-000000000002','Javna B2',-921002,now()),
 (-921004,'c2b20000-0000-4000-8000-000000000003','Javna C',-921002,now());
insert into mini_lige(id, name, code, owner_id) overriding system value values
 (-921001, 'Javna testna', 'JAVNA921A', 'c2b20000-0000-4000-8000-000000000001'),
 (-921002, 'Zasebna testna', 'JAVNA921B', 'c2b20000-0000-4000-8000-000000000001'),
 (-921003, 'SLFF uradna', 'JAVNA921C', 'c2b20000-0000-4000-8000-000000000001'),
 (-921004, 'Tretja javna', 'JAVNA921D', 'c2b20000-0000-4000-8000-000000000001'),
 (-921005, 'Cetrta javna', 'JAVNA921E', 'c2b20000-0000-4000-8000-000000000001'),
 (-921006, 'Peta javna', 'JAVNA921F', 'c2b20000-0000-4000-8000-000000000001');
insert into mini_liga_clani(mini_liga_id, fantasy_team_id) values (-921001,-921001),(-921002,-921001);

-- Javnost nastavi le ustvarjalec, in le prek RPC.
select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('javne: tuj uporabnik ne more objaviti mini lige',
  $$select nastavi_javnost_mini_lige(-921001, true, null, -921001)$$);
reset role;
select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('javne: lastnik ne objavi mimo RPC (update javna)',
  $$update mini_lige set javna = true, competition_id = -921001 where id = -921001$$);
select pg_temp.zavrnjeno('javne: lastnik ne vpiše javne lige mimo RPC (insert)',
  $$insert into mini_lige(name, code, owner_id, javna, competition_id)
    values ('Mimo', 'JAVNA921X', 'c2b20000-0000-4000-8000-000000000001', true, -921001)$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('javne: zasebna liga ni na seznamu',
  not exists (select 1 from javne_mini_lige(-921001)));
select pg_temp.zavrnjeno('javne: anonimni ne more objaviti',
  $$select nastavi_javnost_mini_lige(-921001, true, null, -921001)$$);
reset role;

select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select nastavi_javnost_mini_lige(-921001, true, '  Liga  za vse  ', -921001);
select pg_temp.napaka('javne: brez ekipe v ligi ni objave',
  $$select nastavi_javnost_mini_lige(-921004, true, null, -921002)$$, 'javna-brez-ekipe');
select pg_temp.napaka('javne: rezervirano ime ne gre v javno',
  $$select nastavi_javnost_mini_lige(-921003, true, null, -921001)$$, 'ime-rezervirano');
select pg_temp.napaka('javne: žaljiv opis ne gre v javno',
  $$select nastavi_javnost_mini_lige(-921004, true, 'f.u.c.k vsi', -921001)$$, 'opis-neprimerno');
select pg_temp.napaka('javne: predolg opis ne gre',
  $$select nastavi_javnost_mini_lige(-921004, true, repeat('a', 121), -921001)$$, null);
select pg_temp.napaka('javne: javne lige ni mogoče preimenovati v žaljivko',
  $$update mini_lige set name = 'Kurac FC' where id = -921001$$, 'ime-neprimerno');
update mini_lige set name = 'Javna testna 2' where id = -921002;
reset role;
select pg_temp.preveri('javne: opis je počiščen, zasebno ime se preimenuje',
  (select opis = 'Liga za vse' and javna and competition_id = -921001 from mini_lige where id = -921001)
  and (select name = 'Javna testna 2' from mini_lige where id = -921002));

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('javne: anonimni vidi javno ligo s številom ekip',
  (select count(*) = 1 and bool_and(id = -921001 and ekip = 1 and owner_name = 'JavnaA' and not sem_clan)
     from javne_mini_lige(-921001)));
select pg_temp.preveri('javne: iskanje po imenu, % je navaden znak',
  exists (select 1 from javne_mini_lige(-921001, 'testna'))
  and not exists (select 1 from javne_mini_lige(-921001, '%')));
select pg_temp.preveri('javne: javna liga ni na seznamu druge lige',
  not exists (select 1 from javne_mini_lige(-921002)));
select pg_temp.preveri('javne: anonimni vidi lestvico javne lige',
  (select count(*) = 1 from lestvica_javne_mini_lige(-921001))
  and exists (select 1 from mini_liga_glava(-921001) where javna));
select pg_temp.preveri('javne: zasebne lige anonimni ne vidi',
  not exists (select 1 from mini_liga_glava(-921002))
  and not exists (select 1 from lestvica_javne_mini_lige(-921002)));
select pg_temp.zavrnjeno('javne: anonimni se ne pridruži',
  $$select pridruzi_javni_mini_ligi(-921001, -921002)$$);
reset role;

-- Pridružitev brez kode: le javna liga, le ekipa iz njene lige.
select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('javne: v zasebno ligo ni vstopa brez kode',
  $$select pridruzi_javni_mini_ligi(-921002, -921002)$$);
select pg_temp.zavrnjeno('javne: ekipa druge lige se ne pridruži',
  $$select pridruzi_javni_mini_ligi(-921001, -921003)$$);
select pg_temp.zavrnjeno('javne: s tujo ekipo ni pridružitve',
  $$select pridruzi_javni_mini_ligi(-921001, -921001)$$);
select pg_temp.preveri('javne: ekipa iz lige se pridruži brez kode',
  (select dodano from pridruzi_javni_mini_ligi(-921001, -921002)));
select pg_temp.preveri('javne: druga pridružitev ne podvoji',
  not (select dodano from pridruzi_javni_mini_ligi(-921001, -921002)));
select pg_temp.preveri('javne: član vidi ligo kot svojo',
  (select sem_clan from javne_mini_lige(-921001) where id = -921001));
select pg_temp.zavrnjeno('javne: prijav ni mogoče brati',
  $$select * from prijave_mini_lig$$);
reset role;

-- Največ tri javne lige istega lastnika v eni ligi.
select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select nastavi_javnost_mini_lige(-921004, true, null, -921001);
select nastavi_javnost_mini_lige(-921005, true, null, -921001);
select pg_temp.napaka('javne: četrta javna liga istega lastnika v ligi pade',
  $$select nastavi_javnost_mini_lige(-921006, true, null, -921001)$$, 'javne-najvec');
select nastavi_javnost_mini_lige(-921005, false);
select nastavi_javnost_mini_lige(-921006, true, null, -921001);
reset role;
select pg_temp.preveri('javne: po skritju ene se objavi druga',
  (select count(*) = 3 from mini_lige where owner_id = 'c2b20000-0000-4000-8000-000000000001' and javna));

-- Prijava in admin.
select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000003',true);
set local role authenticated;
select prijavi_mini_ligo(-921001, 'Neprimerno ime');
select pg_temp.napaka('javne: iste lige ni mogoče prijaviti dvakrat',
  $$select prijavi_mini_ligo(-921001, 'Spet')$$, null);
select pg_temp.zavrnjeno('javne: zasebne lige ni mogoče prijaviti',
  $$select prijavi_mini_ligo(-921002, null)$$);
select pg_temp.zavrnjeno('javne: ne-admin ne vidi vrste prijav',
  $$select * from admin_prijave_mini_lig()$$);
select pg_temp.zavrnjeno('javne: ne-admin ne skrije lige',
  $$select admin_odloci_mini_ligo(-921001, true)$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('javne: prijava je v vrsti admina',
  exists (select 1 from admin_prijave_mini_lig() where mini_liga_id = -921001 and prijav = 1));
select admin_odloci_mini_ligo(-921001, true);
reset role;
select pg_temp.preveri('javne: admin ligo skrije in reši prijave, člani ostanejo',
  (select not javna and javna_zaklenjena_at is not null from mini_lige where id = -921001)
  and not exists (select 1 from prijave_mini_lig where mini_liga_id = -921001 and resena_at is null)
  and (select count(*) = 2 from mini_liga_clani where mini_liga_id = -921001));
select set_config('request.jwt.claim.sub','c2b20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('javne: skrite lige lastnik ne objavi znova',
  $$select nastavi_javnost_mini_lige(-921001, true, null, -921001)$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('javne: skrita liga ni več na seznamu',
  not exists (select 1 from javne_mini_lige(-921001) where id = -921001)
  and not exists (select 1 from mini_liga_glava(-921001)));
reset role;
select pg_temp.preveri('javne: pravilo prikaznega imena ostane enako',
  napaka_prikaznega_imena('Ad') = 'ime-dolzina'
  and napaka_prikaznega_imena('4dm1n') = 'ime-rezervirano'
  and napaka_prikaznega_imena('Luka<') = 'ime-znaki'
  and napaka_prikaznega_imena('Luka Novak') is null);

-- --------------------------------------------------------------------------
-- Preverjeni igralci: stikalo, preizkuševalci, pravica, dodatki, brisanje.
-- Lastnik (ab) ima potrjen profil igralca -913005, tujec (ac) nič, admin (ad),
-- preizkuševalec (c9). Tekma -925001 je igralčeva, -925002 ne.
-- --------------------------------------------------------------------------
reset role;
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f912c9','test-tester@example.invalid','{"display_name":"Tester"}',now()-interval '2 days');
insert into settings(key, value) values ('preverjeni_racuni', '0')
  on conflict (key) do update set value = '0';
insert into zahtevki_igralca(id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (-925001, -913005, 'b8a06635-2322-4444-8c42-44e419f912ab', 'potrjen', 'admin', now());
insert into profil_igralca(player_id, vzdevek) values (-913005, 'Kljukica');
insert into matches(id, round_id, home_team_id, away_team_id) overriding system value
values (-925001, -913001, -913005, -913001), (-925002, -913001, -913002, -913003);
insert into appearances(match_id, player_id, team_id) values (-925001, -913005, -913005);

-- pg_temp.pade (zgoraj, hišne ekipe) tudi za vlogo authenticated.
grant execute on function pg_temp.pade(text, text) to authenticated;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('preverjeni: lastnik si pravice ne dodeli sam',
  $$select admin_dodeli_preverjen(-913005, 'rocno', null)$$);
select pg_temp.zavrnjeno('preverjeni: lastnik ne vpiše pravice neposredno',
  $$insert into preverjeni_racuni(user_id, player_id, vir) values ('b8a06635-2322-4444-8c42-44e419f912ab', -913005, 'rocno')$$);
select pg_temp.zavrnjeno('preverjeni: ne-admin ne doda preizkuševalca',
  $$select admin_nastavi_testerja('b8a06635-2322-4444-8c42-44e419f912ab', true)$$);
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_dodeli_preverjen(-913005, 'rocno', null);
select admin_nastavi_testerja('b8a06635-2322-4444-8c42-44e419f912c9', true);
select pg_temp.preveri('preverjeni: admin dodeli ročno pravico',
  (select count(*) = 1 from admin_preverjeni() where player_id = -913005 and velja));
select pg_temp.pade('preverjeni: plačljivega vira admin ne vpiše',
  $$select admin_dodeli_preverjen(-913005, 'letna', now() + interval '1 year')$$);
reset role;
select pg_temp.pade('preverjeni: plačljiva pravica brez 18 let pade',
  $$insert into preverjeni_racuni(user_id, player_id, vir) values ('b8a06635-2322-4444-8c42-44e419f912ab', -913006, 'dozivljenjska')$$);

-- Stikalo 0: nihče nič, tudi lastnik in admin ne.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: stikalo 0 skrije lastniku',
  not je_preverjen(-913005) and not exists (select 1 from preverjeni_igralci_za(array[-913005::bigint])));
select pg_temp.zavrnjeno('preverjeni: stikalo 0 lastnik dodatkov ne vpiše',
  $$insert into profil_igralca_plus(player_id, opis) values (-913005, 'Pri 0 ne gre.')$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: stikalo 0 skrije adminu', not je_preverjen(-913005));
reset role;

-- Stikalo 1: le admin in preizkuševalec.
update settings set value = '1' where key = 'preverjeni_racuni';
insert into profil_igralca_plus(player_id, opis, barva, tekma_id) values (-913005, 'Dolg   opis igralca.', 'modra', -925001);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: stikalo 1 admin vidi',
  je_preverjen(-913005)
  and (select vzdevek = 'Kljukica' from preverjeni_igralci_za(array[-913005::bigint, -913006]))
  and exists (select 1 from profil_igralca_plus where player_id = -913005));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912c9',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: stikalo 1 preizkuševalec vidi',
  je_preverjen(-913005) and exists (select 1 from profil_igralca_plus where player_id = -913005));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: stikalo 1 tujec ne vidi',
  not je_preverjen(-913005) and not exists (select 1 from profil_igralca_plus where player_id = -913005)
  and not exists (select 1 from preverjeni_igralci_za(array[-913005::bigint])));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: stikalo 1 lastnik (ni preizkuševalec) ne vidi', not je_preverjen(-913005));
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('preverjeni: stikalo 1 anonimni ne vidi',
  not exists (select 1 from profil_igralca_plus) and not exists (select 1 from preverjeni_igralci_za(array[-913005::bigint])));
reset role;

-- Stikalo 2: vsi vidijo; piše le lastnik, preverjeno.
update settings set value = '2' where key = 'preverjeni_racuni';
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('preverjeni: stikalo 2 anonimni vidi značko in dodatke',
  exists (select 1 from preverjeni_igralci_za(array[-913005::bigint, -913006]) where player_id = -913005)
  and not exists (select 1 from preverjeni_igralci_za(array[-913006::bigint]))
  and (select opis = 'Dolg opis igralca.' from profil_igralca_plus where player_id = -913005));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
update profil_igralca_plus set opis = 'Vdor' where player_id = -913005;
select pg_temp.zavrnjeno('preverjeni: tujec ne doda dodatkov tujemu igralcu',
  $$insert into profil_igralca_plus(player_id, opis) values (-913006, 'Vdor')$$);
select pg_temp.preveri('preverjeni: tujec pasice ne naloži', not prevzem_sme_pisati_foto('-913005/banner-abc.webp'));
reset role;
select pg_temp.preveri('preverjeni: tujec ne spremeni dodatkov',
  (select opis = 'Dolg opis igralca.' from profil_igralca_plus where player_id = -913005));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
update profil_igralca_plus set sporocilo = 'Hvala navijači!', statistika = null, splet = 'https://example.com/igralec'
 where player_id = -913005;
select pg_temp.preveri('preverjeni: lastnik ureja dodatke in sme pasico',
  (select sporocilo = 'Hvala navijači!' from profil_igralca_plus where player_id = -913005)
  and prevzem_sme_pisati_foto('-913005/banner-abc.webp') and prevzem_sme_pisati_foto('-913005/foto.webp'));
reset role;

-- Preverba vnosov (kot lastnik).
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.pade('preverjeni: opis nad 500 znakov pade',
  $$update profil_igralca_plus set opis = repeat('a', 501) where player_id = -913005$$);
select pg_temp.pade('preverjeni: sporočilo nad 140 znakov pade',
  $$update profil_igralca_plus set sporocilo = repeat('a', 141) where player_id = -913005$$);
select pg_temp.pade('preverjeni: spletna stran le https',
  $$update profil_igralca_plus set splet = 'http://example.com' where player_id = -913005$$);
select pg_temp.pade('preverjeni: spletna stran do 200 znakov',
  $$update profil_igralca_plus set splet = 'https://example.com/' || repeat('a', 190) where player_id = -913005$$);
select pg_temp.pade('preverjeni: barva le iz palete',
  $$update profil_igralca_plus set barva = '#ff0000' where player_id = -913005$$);
select pg_temp.pade('preverjeni: žaljivka v opisu pade',
  $$update profil_igralca_plus set opis = 'ti si kurac' where player_id = -913005$$);
select pg_temp.pade('preverjeni: rezervirana beseda v sporočilu pade',
  $$update profil_igralca_plus set sporocilo = 'Uradni SLFF admin' where player_id = -913005$$);
select pg_temp.pade('preverjeni: tuja tekma pade',
  $$update profil_igralca_plus set tekma_id = -925002 where player_id = -913005$$);
select pg_temp.pade('preverjeni: tekma in statistika hkrati padeta',
  $$update profil_igralca_plus set statistika = 'goli' where player_id = -913005$$);
select pg_temp.pade('preverjeni: pasica le v svoji mapi',
  $$update profil_igralca_plus set pasica = '-913006/banner-abc.webp' where player_id = -913005$$);
-- Daljša besedila: pravilo po besedah (ločila, številke in deli besed so v redu).
update profil_igralca_plus set tekma_id = null, sporocilo = 'Trening 1 ura dnevno #gol_fan? ne: "100 %" = +'
 where player_id = -913005;
select pg_temp.preveri('preverjeni: sporočilo z ločili in številkami gre',
  (select sporocilo = 'Trening 1 ura dnevno #gol_fan? ne: "100 %" = +' from profil_igralca_plus where player_id = -913005));
update profil_igralca_plus set opis = E'Rad igram tudi badminton.\r\nIgram od sezone 2015/16  @klub\n\n\n\nKonec', splet = 'https://badminton.si/o-meni'
 where player_id = -913005;
select pg_temp.preveri('preverjeni: badminton, 2015/16, @ in https://badminton.si gredo; nove vrstice ostanejo (največ dve)',
  (select opis = E'Rad igram tudi badminton.\nIgram od sezone 2015/16 @klub\n\nKonec' and splet = 'https://badminton.si/o-meni'
     from profil_igralca_plus where player_id = -913005));
select pg_temp.pade('preverjeni: žaljivka kot začetek besede pade',
  $$update profil_igralca_plus set sporocilo = 'To je bilo fucking dobro' where player_id = -913005$$);
select pg_temp.pade('preverjeni: žaljivka v poti spletne strani pade',
  $$update profil_igralca_plus set splet = 'https://example.com/fuck-you' where player_id = -913005$$);
select pg_temp.pade('preverjeni: < > v opisu pade',
  $$update profil_igralca_plus set opis = '<script>' where player_id = -913005$$);
select pg_temp.pade('preverjeni: nevidni znak v opisu pade',
  $$update profil_igralca_plus set opis = E'Skrito​besedilo' where player_id = -913005$$);
select pg_temp.pade('preverjeni: X ročica ostane pod strogim pravilom',
  $$update profil_igralca_plus set x = 'slff_admin' where player_id = -913005$$);
reset role;

-- Potek: pravica z rokom v preteklosti ne velja več; pasico lastnik še sme zbrisati.
update preverjeni_racuni set velja_do = now() - interval '1 minute' where player_id = -913005;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('preverjeni: potekla pravica skrije značko in dodatke',
  not je_preverjen(-913005) and not exists (select 1 from profil_igralca_plus));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: po poteku pasice ne naloži, zbriše pa jo',
  not prevzem_sme_pisati_foto('-913005/banner-abc.webp') and prevzem_sme_brisati_foto('-913005/banner-abc.webp')
  and not prevzem_sme_brisati_foto('-913006/banner-abc.webp'));
reset role;
update preverjeni_racuni set velja_do = null where player_id = -913005;

-- Preklic profila: dodatki gredo, pravica pade na 'preklican'.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select preklici_moj_zahtevek(-925001);
select pg_temp.preveri('preverjeni: po preklicu profila ni značke', not je_preverjen(-913005));
reset role;
select pg_temp.preveri('preverjeni: preklic izbriše dodatke in prekliče pravico',
  not exists (select 1 from profil_igralca_plus where player_id = -913005)
  and not exists (select 1 from preverjeni_racuni where player_id = -913005 and status = 'aktiven')
  and exists (select 1 from preverjeni_racuni where player_id = -913005 and status = 'preklican'));

-- Isti uporabnik znova prevzame: kljukice ni, dokler je admin ne dodeli.
update zahtevki_igralca set status = 'potrjen', decided_at = now() where id = -925001;
select pg_temp.preveri('preverjeni: ponoven prevzem istega uporabnika kljukice ne vrne', not je_preverjen(-913005));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_dodeli_preverjen(-913005, 'rocno', null);
reset role;
select pg_temp.preveri('preverjeni: nova dodelitev istemu uporabniku vrne kljukico', je_preverjen(-913005));

-- Drug uporabnik prevzame: dodelitev gre, stara (tudi zastala aktivna) pravica pade.
update zahtevki_igralca set status = 'preklican' where id = -925001;
insert into zahtevki_igralca(id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (-925002, -913005, 'b8a06635-2322-4444-8c42-44e419f912ac', 'potrjen', 'admin', now());
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('preverjeni: admin vidi aktivno pravico drugega uporabnika',
  (select aktivna and drug_uporabnik and not velja from admin_preverjeni() where player_id = -913005));
select admin_dodeli_preverjen(-913005, 'rocno', null);
reset role;
select pg_temp.preveri('preverjeni: dodelitev novemu lastniku prekliče staro pravico',
  je_preverjen(-913005)
  and (select count(*) = 1 from preverjeni_racuni where player_id = -913005 and status = 'aktiven'
          and user_id = 'b8a06635-2322-4444-8c42-44e419f912ac'));

-- Anonimizacija izbriše dodatke in prekliče pravico.
insert into profil_igralca_plus(player_id, opis) values (-913005, 'Pred anonimizacijo.');
update players set anonimiziran_at = now() where id = -913005;
select pg_temp.preveri('preverjeni: anonimizacija izbriše dodatke, značko in pravico',
  not exists (select 1 from profil_igralca_plus where player_id = -913005) and not je_preverjen(-913005)
  and not exists (select 1 from preverjeni_racuni where player_id = -913005 and status = 'aktiven'));

-- Izbris računa: dodatki gredo, pravica ostane v zgodovini kot 'preklican' brez uporabnika.
update players set anonimiziran_at = null where id = -913005;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_dodeli_preverjen(-913005, 'rocno', null);
reset role;
insert into profil_igralca_plus(player_id, opis) values (-913005, 'Pred izbrisom.');
delete from auth.users where id = 'b8a06635-2322-4444-8c42-44e419f912ac';
select pg_temp.preveri('preverjeni: izbris računa izbriše dodatke, pravica ostane preklicana brez uporabnika',
  not exists (select 1 from profil_igralca_plus where player_id = -913005)
  and not exists (select 1 from profil_igralca where player_id = -913005)
  and not exists (select 1 from preverjeni_racuni where player_id = -913005 and status = 'aktiven')
  and exists (select 1 from preverjeni_racuni where player_id = -913005 and user_id is null and status = 'preklican'));

-- --------------------------------------------------------------------------
-- Preverjeni igralci, faza 2 (Stripe): servisne funkcije pišejo pravico in
-- naročilo značke; kupec (e1) ima potrjen profil igralca -925010, tujec (c9)
-- nič, admin (ad). Stikalo je 2.
-- --------------------------------------------------------------------------
reset role;
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f912e1','test-kupec@example.invalid','{"display_name":"Kupec"}',now()-interval '2 days');
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active)
overriding system value values (-925010, -913001, -913001, 'Kupljen', 'Igralec', 'Igralec Kupljen', 'MID', 'admin', 5, 5, true);
insert into zahtevki_igralca(id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (-925010, -925010, 'b8a06635-2322-4444-8c42-44e419f912e1', 'potrjen', 'admin', now());
update settings set value = '2' where key = 'preverjeni_racuni';

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912e1',true);
set local role authenticated;
select pg_temp.zavrnjeno('plačila: uporabnik ne kliče servisne funkcije plačila',
  $$select preverjen_iz_placila(auth.uid(), -925010, 'dozivljenjska', null, 'cus_x', null, 'cs_vdor', 'pi_vdor', true, true)$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne podaljša naročnine',
  $$select preverjen_podaljsaj('sub_x', now() + interval '5 years')$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne konča naročnine',
  $$select preverjen_narocnina_konec('sub_x', now())$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne sproži vračila',
  $$select preverjen_vracilo('pi_x', null, 1, 1, false)$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne vrne pravice po sporu',
  $$select preverjen_spor_dobljen('pi_x', null)$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne bere vrste preklicev',
  $$select * from preverjen_cakajoci_preklici()$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne potrdi preklica',
  $$select preverjen_preklic_opravljen('sub_x')$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne čisti naslovov',
  $$select preverjen_pocisti_naslove()$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne piše na Discord',
  $$select preverjeni_na_discord('vdor')$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne bere dogodkov Stripe',
  $$select * from stripe_dogodki$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne bere naročil značk',
  $$select * from narocila_znack$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne vidi seznama naročil',
  $$select * from admin_narocila_znack()$$);
select pg_temp.zavrnjeno('plačila: uporabnik ne nastavi naročila',
  $$select admin_nastavi_narocilo_znacke(1, 'poslano')$$);
select pg_temp.preveri('plačila: kupec pripravi nakup svojega profila',
  (select glavni = -925010 and liga = 'test-varnost' and email = 'test-kupec@example.invalid' and ime_na_znacki = 'Kupljen 7'
     from preverjen_pripravi_nakup(-925010, '  Kupljen   7 ')));
select pg_temp.pade('plačila: žaljivka na znački pade', $$select * from preverjen_pripravi_nakup(-925010, 'kurac')$$);
select pg_temp.pade('plačila: ime na znački nad 30 znakov pade', $$select * from preverjen_pripravi_nakup(-925010, repeat('a', 31))$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('plačila: anonimni ne kliče servisne funkcije',
  $$select preverjen_vracilo('pi_x', null, 1, 1, false)$$);
select pg_temp.zavrnjeno('plačila: anonimni ne pripravi nakupa',
  $$select * from preverjen_pripravi_nakup(-925010, null)$$);
select pg_temp.zavrnjeno('plačila: anonimni ne vidi naročnin',
  $$select * from preverjen_moje_narocnine()$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912c9',true);
set local role authenticated;
select pg_temp.pade('plačila: tujec ne kupi tujega profila', $$select * from preverjen_pripravi_nakup(-925010, null)$$);
reset role;

-- Letna naročnina: pravica do konca obdobja, ponovljena seja je 'ze'.
set local role service_role;
create temporary table izid_placila on commit drop as
select preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'letna', now() + interval '1 year',
  'cus_t', 'sub_t', 'cs_1', null, true, true, 999) as a,
  preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'letna', now() + interval '1 year',
  'cus_t', 'sub_t', 'cs_1', null, true, true, 999) as b;
insert into stripe_dogodki(id, tip) values ('evt_test_1', 'checkout.session.completed');
update stripe_dogodki set obdelano_at = now() where id = 'evt_test_1';
reset role;
select pg_temp.preveri('plačila: letna naročnina ustvari pravico, ponovljena seja ne podvoji',
  (select a = 'aktiven' and b = 'ze' from izid_placila)
  and (select count(*) = 1 from preverjeni_racuni where stripe_checkout_id = 'cs_1' and status = 'aktiven' and velja_do > now() + interval '360 days')
  and je_preverjen(-925010));
select pg_temp.preveri('plačila: servis označi dogodek kot obdelan',
  (select obdelano_at is not null from stripe_dogodki where id = 'evt_test_1'));
select pg_temp.pade('plačila: isti dogodek Stripe se ne zapiše dvakrat',
  $$insert into stripe_dogodki(id, tip) values ('evt_test_1', 'checkout.session.completed')$$);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912e1',true);
set local role authenticated;
select pg_temp.pade('plačila: preverjen profil ne kupi znova', $$select * from preverjen_pripravi_nakup(-925010, null)$$);
select pg_temp.preveri('plačila: lastnik vidi svojo naročnino',
  (select vir = 'letna' from preverjen_moja_pravica(-925010))
  and (select stripe_customer_id = 'cus_t' from preverjen_moje_narocnine()));
reset role;
update settings set value = '0' where key = 'preverjeni_racuni';
set local role authenticated;
select pg_temp.preveri('plačila: naročnino lahko upravlja tudi pri izklopljenem stikalu',
  exists (select 1 from preverjen_moje_narocnine()) and not exists (select 1 from preverjen_moja_pravica(-925010)));
reset role;
update settings set value = '2' where key = 'preverjeni_racuni';
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912c9',true);
set local role authenticated;
select pg_temp.preveri('plačila: tujec ne vidi tuje naročnine',
  not exists (select 1 from preverjen_moja_pravica(-925010)) and not exists (select 1 from preverjen_moje_narocnine()));
reset role;

-- Obnova podaljša, starejši rok ne skrajša; neznana naročnina ni naša.
set local role service_role;
create temporary table izid_obnove on commit drop as
select preverjen_podaljsaj('sub_t', now() + interval '2 years') as a,
       preverjen_podaljsaj('sub_t', now() + interval '1 day') as b,
       preverjen_podaljsaj('sub_neznan', now() + interval '1 year') as c;
reset role;
select pg_temp.preveri('plačila: obnova podaljša rok, starejši dogodek ga ne skrajša, tujo naročnino prezre',
  (select a = 'podaljsano' and c = 'neznano' from izid_obnove)
  and (select velja_do > now() + interval '700 days' from preverjeni_racuni where stripe_checkout_id = 'cs_1'));

-- Konec naročnine izteče pravico; poznejše plačilo iste naročnine jo oživi.
set local role service_role;
select preverjen_narocnina_konec('sub_t', now() - interval '1 minute');
reset role;
select pg_temp.preveri('plačila: konec naročnine pravico izteče',
  (select status = 'potekel' from preverjeni_racuni where stripe_checkout_id = 'cs_1') and not je_preverjen(-925010));
-- Zastarela aktivna (potekla ročna) vrstica oživitve ne zablokira.
insert into preverjeni_racuni(user_id, player_id, vir, velja_do)
values ('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'rocno', now() - interval '1 hour');
set local role service_role;
create temporary table izid_ozivitve on commit drop as select preverjen_podaljsaj('sub_t', now() + interval '1 year') as a;
reset role;
select pg_temp.preveri('plačila: plačilo potekle naročnine pravico oživi, zastarela vrstica poteče',
  (select a = 'obnovljeno' from izid_ozivitve) and je_preverjen(-925010)
  and not exists (select 1 from preverjeni_racuni where player_id = -925010 and vir = 'rocno' and status = 'aktiven'));

-- Odvzem letne pravice označi naročnino za preklic v Stripe; plačilo nato ni več pravica.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_odvzemi_preverjen((select id from preverjeni_racuni where stripe_checkout_id = 'cs_1'));
reset role;
set local role service_role;
create temporary table izid_preklica on commit drop as
select (select array_agg(s) from preverjen_cakajoci_preklici() s) as caka,
       preverjen_podaljsaj('sub_t', now() + interval '2 years') as obnova;
select preverjen_preklic_opravljen('sub_t');
reset role;
select pg_temp.preveri('plačila: odvzem letne čaka na preklic naročnine, obnova brez pravice',
  (select 'sub_t' = any(caka) and obnova = 'brez_pravice' from izid_preklica)
  and (select stripe_preklic = 'opravljen' and status = 'preklican' from preverjeni_racuni where stripe_checkout_id = 'cs_1')
  and not exists (select 1 from preverjen_cakajoci_preklici() s where s = 'sub_t'));

-- Doživljenjska z značko (29 € + 5 € + 2 €).
set local role service_role;
select preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'dozivljenjska', null,
  'cus_t', null, 'cs_2', 'pi_2', true, true, 2900, 'Kupljen 7',
  '{"name":"Igralec Kupljen","line1":"Glavna 1","postal_code":"4000","city":"Kranj","country":"SI"}', 'postnina_si');
reset role;
select pg_temp.preveri('plačila: doživljenjska brez roka in naročilo značke za tisk',
  je_preverjen(-925010)
  and (select velja_do is null and odpoved_pravici and star_vsaj_18 and znesek_pravice = 2900 from preverjeni_racuni where stripe_checkout_id = 'cs_2')
  and (select status = 'za_tisk' and ime_na_znacki = 'Kupljen 7' and naslov->>'city' = 'Kranj' from narocila_znack where stripe_checkout_id = 'cs_2'));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('plačila: admin vidi naročilo z naslovom',
  exists (select 1 from admin_narocila_znack() where ime_na_znacki = 'Kupljen 7' and naslov->>'postal_code' = '4000' and kupec = 'Kupec'));
select admin_nastavi_narocilo_znacke((select id from admin_narocila_znack() where ime_na_znacki = 'Kupljen 7'), 'natisnjeno', 'test');
select pg_temp.pade('plačila: neznan status naročila pade',
  $$select admin_nastavi_narocilo_znacke((select id from admin_narocila_znack() where ime_na_znacki = 'Kupljen 7'), 'izgubljeno')$$);
reset role;

-- Delno vračilo: najprej značka, nato le Discord (tudi 1 €), polno vračilo pravico prekliče.
set local role service_role;
create temporary table izid_vracil on commit drop as
select preverjen_vracilo('pi_2', null, 700, 3600, false) as a,
       preverjen_vracilo('pi_2', null, 700, 3600, false) as b;
reset role;
select pg_temp.preveri('plačila: delno vračilo prekliče značko, pravica ostane; drugo le zabeleži',
  (select a = 'znacka' and b = 'delno' from izid_vracil)
  and je_preverjen(-925010) and (select status = 'preklicano' from narocila_znack where stripe_checkout_id = 'cs_2'));
set local role service_role;
create temporary table izid_vracila on commit drop as select preverjen_vracilo('pi_2', null, 800, 3600, false) as a;
reset role;
select pg_temp.preveri('plačila: vračilo 1 € pravico obdrži',
  (select a = 'delno' from izid_vracila) and je_preverjen(-925010));
set local role service_role;
create temporary table izid_vracila2 on commit drop as select preverjen_vracilo('pi_2', null, 3600, 3600, false) as a,
  preverjen_vracilo('pi_neznan', 'sub_neznan', 100, 100, false) as b;
reset role;
select pg_temp.preveri('plačila: polno vračilo pravico prekliče, tuje plačilo prezre',
  (select a = 'preklican' and b = 'neznano' from izid_vracila2) and not je_preverjen(-925010));

-- Spor dobljen: pravica se vrne, ker profil še velja.
set local role service_role;
create temporary table izid_spora on commit drop as select preverjen_spor_dobljen('pi_2', null) as a;
reset role;
select pg_temp.preveri('plačila: dobljen spor vrne pravico', (select a = 'obnovljen' from izid_spora) and je_preverjen(-925010));

-- Dvojno plačilo letne: zapiše se kot preklicano in čaka na preklic naročnine.
set local role service_role;
select preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'letna', now() + interval '1 year',
  'cus_t', 'sub_5', 'cs_5', null, true, true, 999);
reset role;
select pg_temp.preveri('plačila: dvojno plačilo je preklicano, naročnina čaka na preklic',
  (select status = 'preklican' and stripe_preklic = 'caka' from preverjeni_racuni where stripe_checkout_id = 'cs_5')
  and je_preverjen(-925010));

-- Spor prekliče pravico.
set local role service_role;
select preverjen_vracilo('pi_2', null, 0, 0, true);
reset role;
select pg_temp.preveri('plačila: spor prekliče pravico', not je_preverjen(-925010));

-- Plačilo za profil, ki ni kupčev: zapiše se kot preklicano.
set local role service_role;
select preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912c9', -925010, 'dozivljenjska', null,
  'cus_c9', null, 'cs_3', 'pi_3', true, true, 2900);
reset role;
select pg_temp.preveri('plačila: plačilo tujega profila je preklicano, kljukice ni',
  (select status = 'preklican' from preverjeni_racuni where stripe_checkout_id = 'cs_3') and not je_preverjen(-925010));
select pg_temp.pade('plačila: plačilo brez potrditve 18 let pade',
  $$select preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'dozivljenjska', null, 'cus_t', null, 'cs_4', 'pi_4', false, true)$$);

-- Preklic pravice in naročila značk; Discord je nadomeščen s štetjem klicev
-- (transakcija se razveljavi).
create temporary table discord_klici (besedilo text);
grant insert on discord_klici to public;
create or replace function public.preverjeni_na_discord(p_besedilo text)
returns void language sql security definer set search_path = public
as $$ insert into pg_temp.discord_klici values (p_besedilo) $$;

-- Preklic profila: naročilo za tisk preklicano, eno sporočilo.
insert into preverjeni_racuni(id, user_id, player_id, vir) overriding system value
values (-925020, 'b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'rocno');
insert into narocila_znack(preverjeni_racun_id, player_id, ime_na_znacki, naslov, stripe_checkout_id, status) values
 (-925020, -925010, 'Kupljen 7', '{"country":"SI"}', 'cs_z1', 'za_tisk');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912e1',true);
set local role authenticated;
select preklici_moj_zahtevek(-925010);
reset role;
select pg_temp.preveri('plačila: preklic profila prekliče značko za tisk in jo javi enkrat',
  (select status = 'preklican' from preverjeni_racuni where id = -925020)
  and (select status = 'preklicano' and opomba = 'pravica preklicana' from narocila_znack where stripe_checkout_id = 'cs_z1')
  and (select count(*) = 1 and bool_and(besedilo like '%Značka preklicana s pravico (1)%/player/-925010') from discord_klici));

-- Polno vračilo: opomba 'vračilo' ostane, eno sporočilo.
delete from discord_klici;
insert into preverjeni_racuni(id, user_id, player_id, vir, star_vsaj_18, odpoved_pravici, stripe_payment_intent, znesek_pravice)
overriding system value values (-925021, 'b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'dozivljenjska', true, true, 'pi_z', 2900);
insert into narocila_znack(preverjeni_racun_id, player_id, ime_na_znacki, naslov, stripe_checkout_id, status) values
 (-925021, -925010, 'Kupljen 7', '{"country":"SI"}', 'cs_z2', 'za_tisk');
set local role service_role;
select preverjen_vracilo('pi_z', null, 3600, 3600, false);
reset role;
select pg_temp.preveri('plačila: polno vračilo obdrži opombo vračila in javi enkrat',
  (select status = 'preklican' from preverjeni_racuni where id = -925021)
  and (select status = 'preklicano' and opomba = 'vračilo' from narocila_znack where stripe_checkout_id = 'cs_z2')
  and (select count(*) = 1 and bool_and(besedilo like '%Pravica preklicana (vračilo, tudi značka)%') from discord_klici));

-- Preklic (admin) pri natisnjeni znački: ostane natisnjena, le opozorilo.
delete from discord_klici;
insert into preverjeni_racuni(id, user_id, player_id, vir) overriding system value
values (-925022, 'b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'rocno');
insert into narocila_znack(preverjeni_racun_id, player_id, ime_na_znacki, naslov, stripe_checkout_id, status) values
 (-925022, -925010, 'Kupljen 7', '{"country":"SI"}', 'cs_z3', 'natisnjeno');
update preverjeni_racuni set status = 'preklican' where id = -925022;
select pg_temp.preveri('plačila: natisnjena značka ostane, preklic jo le javi',
  (select status = 'natisnjeno' and opomba is null from narocila_znack where stripe_checkout_id = 'cs_z3')
  and (select count(*) = 1 and bool_and(besedilo like '%Natisnjena ali poslana%') from discord_klici));

-- Izbris računa: naročilo z naslovom ostane (le admin); poznejše plačilo
-- izbrisanega kupca je preklicano brez uporabnika in čaka na preklic naročnine.
delete from auth.users where id = 'b8a06635-2322-4444-8c42-44e419f912e1';
select pg_temp.preveri('plačila: izbris računa pusti naročilo brez uporabnika',
  (select user_id is null and naslov->>'city' = 'Kranj' from narocila_znack where stripe_checkout_id = 'cs_2'));
set local role service_role;
select preverjen_iz_placila('b8a06635-2322-4444-8c42-44e419f912e1', -925010, 'letna', now() + interval '1 year',
  'cus_t', 'sub_6', 'cs_6', null, true, true, 999);
reset role;
select pg_temp.preveri('plačila: plačilo izbrisanega računa je preklicano brez uporabnika',
  (select user_id is null and status = 'preklican' and stripe_preklic = 'caka' from preverjeni_racuni where stripe_checkout_id = 'cs_6'));

-- Naslov: 90 dni po pošiljanju ostane le država.
update narocila_znack set status = 'poslano', poslano_at = now() - interval '91 days' where stripe_checkout_id = 'cs_2';
set local role service_role;
select preverjen_pocisti_naslove();
reset role;
select pg_temp.preveri('plačila: po 90 dneh od pošiljanja ostane le država',
  (select naslov = '{"country":"SI"}'::jsonb from narocila_znack where stripe_checkout_id = 'cs_2'));

-- Obviselo naročilo (za_tisk): naslov ostane do 12 mesecev od naročila.
insert into narocila_znack (preverjeni_racun_id, player_id, ime_na_znacki, naslov, stripe_checkout_id, status, created_at)
values
 (-925022, -925010, 'Obviselo', '{"name":"X","line1":"Glavna 1","city":"Kranj","country":"SI"}', 'cs_z4', 'za_tisk', now() - interval '13 months'),
 (-925022, -925010, 'Sveže', '{"name":"X","line1":"Glavna 1","city":"Kranj","country":"SI"}', 'cs_z5', 'za_tisk', now() - interval '11 months');
set local role service_role;
select preverjen_pocisti_naslove();
reset role;
select pg_temp.preveri('plačila: naročilo v za_tisk po 12 mesecih obdrži le državo, mlajše ves naslov',
  (select naslov = '{"country":"SI"}'::jsonb from narocila_znack where stripe_checkout_id = 'cs_z4')
  and (select naslov->>'city' = 'Kranj' from narocila_znack where stripe_checkout_id = 'cs_z5'));

-- --------------------------------------------------------------------------
-- Pivski zid (piva): zaprta tabela, javna pot brez zneskov, admin RPC.
-- --------------------------------------------------------------------------
reset role;
delete from piva;
insert into piva (zunanji_id, ime, piv, sporocilo, vir) values
  ('t-1', 'Janez', 2, 'Gremo Preddvor,Gremo Repiči<br>Prestor se vrača<BR />Čole &amp; co &lt;3', 'bmc'),
  ('t-2', 'Someone', 1, 'anonimno', 'bmc'),
  ('t-3', 'Skriti', 1, 'skrivnost', 'bmc'),
  ('t-4', 'Vrnjen', 5, 'vračilo', 'bmc'),
  ('t-5', 'Tester', 3, 'test', 'bmc'),
  ('t-6', '   ', 1, '<b>krepko</b>', 'bmc');
update piva set skrito = true where zunanji_id = 't-3';
update piva set vracilo = true where zunanji_id = 't-4';
update piva set test = true where zunanji_id = 't-5';

select pg_temp.preveri('piva: sporočilo je očiščeno (<br> v novo vrstico, entitete, oznake)',
  (select sporocilo = E'Gremo Preddvor,Gremo Repiči\nPrestor se vrača\nČole & co <3' from piva where zunanji_id = 't-1')
  and (select sporocilo = 'krepko' and ime is null from piva where zunanji_id = 't-6'));
select pg_temp.preveri('piva: javna pot nima zneska, valute ali e-naslova',
  (select array_agg(a.attname::text order by a.n) = array['ime','piv','sporocilo','created_at']
     from pg_proc p, unnest(p.proargnames, p.proargmodes) with ordinality a(attname, mode, n)
    where p.proname = 'javna_piva' and a.mode = 't')
  and not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'piva'
                     and column_name ~ '(amount|znesek|currency|valuta|email|mail)'));

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('piva: anonimni ne bere tabele', $$select * from piva$$);
select pg_temp.zavrnjeno('piva: anonimni ne piše v tabelo', $$insert into piva (ime, piv, vir) values ('x', 1, 'rocno')$$);
select pg_temp.zavrnjeno('piva: anonimni ne dodaja piv', $$select admin_dodaj_pivo('x', 1, null, null)$$);
select pg_temp.zavrnjeno('piva: anonimni ne skriva sporočil', $$select admin_skrij_pivo(1, true)$$);
select pg_temp.preveri('piva: javna pot izpusti vračila, teste in skrita sporočila',
  (select count(*) = 4 from javna_piva())
  and not exists (select 1 from javna_piva() where piv in (3, 5))
  and exists (select 1 from javna_piva() where ime is null and sporocilo = 'anonimno')
  and exists (select 1 from javna_piva() where ime = 'Skriti' and sporocilo is null)
  and not exists (select 1 from javna_piva() where sporocilo in ('skrivnost', 'vračilo', 'test')));
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('piva: prijavljen ne bere tabele', $$select * from piva$$);
select pg_temp.zavrnjeno('piva: prijavljen ne spreminja tabele', $$update piva set skrito = false$$);
select pg_temp.zavrnjeno('piva: prijavljen ne-admin ne vidi seznama', $$select admin_piva()$$);
select pg_temp.zavrnjeno('piva: prijavljen ne-admin ne dodaja', $$select admin_dodaj_pivo('x', 1, null, null)$$);
select pg_temp.zavrnjeno('piva: prijavljen ne-admin ne skriva', $$select admin_skrij_pivo(1, true)$$);
select pg_temp.zavrnjeno('piva: prijavljen ne-admin ne briše', $$select admin_izbrisi_pivo(1)$$);
select pg_temp.preveri('piva: prijavljen bere javno pot', (select count(*) = 4 from javna_piva()));
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_dodaj_pivo('Ročni', 4, 'Hvala<br/>vsem', '2026-10-01');
select admin_skrij_pivo((select id from admin_piva() where zunanji_id = 't-1'), true);
select pg_temp.preveri('piva: admin doda ročni vnos z datumom in skrije sporočilo',
  (select count(*) = 7 from admin_piva())
  and exists (select 1 from javna_piva() where ime = 'Ročni' and piv = 4 and sporocilo = E'Hvala\nvsem'
                and created_at::date = date '2026-10-01')
  and exists (select 1 from javna_piva() where ime = 'Janez' and sporocilo is null));
reset role;
-- Nakupa BMC admin ne izbriše (le skrije); kot postgres z admin JWT.
do $$ begin
  perform admin_izbrisi_pivo((select id from piva where zunanji_id = 't-2'));
  perform pg_temp.preveri('piva: admin ne izbriše nakupa BMC', false);
exception when others then
  perform pg_temp.preveri('piva: admin ne izbriše nakupa BMC', exists (select 1 from piva where zunanji_id = 't-2'));
end $$;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_izbrisi_pivo((select id from admin_piva() where vir = 'rocno'));
reset role;
select pg_temp.preveri('piva: admin izbriše ročni vnos', not exists (select 1 from piva where vir = 'rocno'));

-- --------------------------------------------------------------------------
-- Klubski računi (faza 1)
-- --------------------------------------------------------------------------
reset role;
-- Klub -913003 ima uradni naslov z velikimi črkami in presledkom; klub
-- -913004 ima naslov brez kluba (team_id null); -913005 ne želi stika.
insert into klub_stik(id, team_id, klub, drzava, email, stanje) overriding system value values
 (-920001, -913003, 'Test varnosti 2', 'SI', ' Klub.Tri@Example.invalid', 'poslano'),
 (-920002, null,    'Brez kluba',      'SI', 'brez.kluba@example.invalid', 'poslano'),
 (-920003, -913005, 'Test varnosti 4', 'SI', 'ne.zeli@example.invalid', 'ne_zeli');
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('e1a10000-0000-4000-8000-000000000001', 'klub.tri@example.invalid', now(), '{"display_name":"K1"}', now()),
 ('e1a10000-0000-4000-8000-000000000002', 'nepotrjen@example.invalid', null, '{"display_name":"K2"}', now()),
 ('e1a10000-0000-4000-8000-000000000003', 'brez.kluba@example.invalid', now(), '{"display_name":"K3"}', now()),
 ('e1a10000-0000-4000-8000-000000000004', 'ne.zeli@example.invalid', now(), '{"display_name":"K4"}', now());
-- Nepotrjen uporabnik ima isti naslov kot klub -913003 (drug zapis v klub_stik).
insert into klub_stik(id, team_id, klub, drzava, email, stanje) overriding system value values
 (-920004, -913003, 'Test varnosti 2', 'SI', 'nepotrjen@example.invalid', 'poslano');

select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('klub: potrjen naslov (velike črke, presledek) dobi račun',
  uveljavi_klubski_racun() = -913003);
select pg_temp.preveri('klub: ponovna prijava vrne isti klub, brez druge vrstice',
  uveljavi_klubski_racun() = -913003);
select pg_temp.preveri('klub: moj_klubski_racun pokaže klub',
  (moj_klubski_racun()->'racun'->>'team_id')::bigint = -913003);
select pg_temp.zavrnjeno('klub: tabele računov ni mogoče brati neposredno',
  $$select * from klubski_racuni$$);
select pg_temp.zavrnjeno('klub: interne funkcije niso dostopne',
  $$select klub_ustvari_racun(auth.uid(), -913001, null)$$);

select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000002',true);
select pg_temp.preveri('klub: nepotrjen mail ne dobi računa', uveljavi_klubski_racun() is null);

select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000003',true);
select pg_temp.preveri('klub: naslov brez kluba ne dobi računa', uveljavi_klubski_racun() is null);
select uveljavi_klubski_racun();
reset role;
select pg_temp.preveri('klub: naslov brez kluba gre enkrat v vrsto (brez_kluba)',
  (select count(*) from klubski_zahtevki where user_id = 'e1a10000-0000-4000-8000-000000000003'
     and vrsta = 'brez_kluba' and status = 'odprt') = 1);

select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.preveri('klub: stik ne_zeli ne dobi računa', uveljavi_klubski_racun() is null);
reset role;

-- Peti račun kluba -913003: dodamo 4 aktivne (skupaj s K1 jih je 5).
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at)
select ('e1a10000-0000-4000-8000-00000000001' || n)::uuid, 'peti' || n || '@example.invalid', now(), '{}', now()
from generate_series(1, 5) n;
insert into klubski_racuni(user_id, team_id)
select ('e1a10000-0000-4000-8000-00000000001' || n)::uuid, -913003 from generate_series(1, 4) n;
insert into klub_stik(id, team_id, klub, drzava, email, stanje) overriding system value values
 (-920005, -913003, 'Test varnosti 2', 'SI', 'peti5@example.invalid', 'poslano');
select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000015',true);
set local role authenticated;
select pg_temp.preveri('klub: šesti račun ne nastane', uveljavi_klubski_racun() is null);
select uveljavi_klubski_racun();
reset role;
select pg_temp.preveri('klub: šesti gre enkrat v vrsto (polno)',
  (select count(*) from klubski_zahtevki where user_id = 'e1a10000-0000-4000-8000-000000000015'
     and vrsta = 'polno' and status = 'odprt') = 1);

-- Preklican račun se ob naslednji prijavi ne obnovi.
update klubski_racuni set preklican_at = now() where user_id = 'e1a10000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('klub: preklican račun se ob prijavi ne obnovi', uveljavi_klubski_racun() is null);
reset role;
select pg_temp.preveri('klub: preklican ostane edina vrstica',
  (select count(*) from klubski_racuni where user_id = 'e1a10000-0000-4000-8000-000000000001') = 1);

set local role anon;
select pg_temp.zavrnjeno('klub: anonimni ne kliče uveljavi', $$select uveljavi_klubski_racun()$$);
reset role;

-- Prošnja za nov naslov. K5 ima potrjen mail, ki ga ni v klub_stik.
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('e1a10000-0000-4000-8000-000000000005', 'tajnik.novi@example.invalid', now(), '{"display_name":"K5"}', now());
select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.preveri('klub: prošnja za nov naslov se odda',
  klub_zaprosi_za_naslov(-913004, 'tajnik', 'https://example.org/kontakt') is not null);
select pg_temp.napaka('klub: le ena odprta prošnja na račun',
  $$select klub_zaprosi_za_naslov(-913004, 'tajnik', 'https://example.org/kontakt')$$);
select pg_temp.zavrnjeno('klub: ne-admin ne odloča', $$select admin_odloci_klubski_zahtevek(
  (select (moj_klubski_racun()->'zahtevek'->>'id')::bigint), true)$$);
select pg_temp.zavrnjeno('klub: ne-admin ne vidi vrste', $$select * from admin_klubski_zahtevki()$$);

-- Uporabnik, ki že zastopa klub (eden od petih), ne zaprosi za drugega.
select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000011',true);
select pg_temp.napaka('klub: zastopnik kluba ne zaprosi za drug klub',
  $$select klub_zaprosi_za_naslov(-913004, 'trener', null)$$);

-- Admin potrdi K5 za -913004: nastane stik in račun.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
select admin_odloci_klubski_zahtevek(
  (select id from admin_klubski_zahtevki() where email = 'tajnik.novi@example.invalid'), true);
reset role;
select pg_temp.preveri('klub: potrjena prošnja vpiše klub_stik (sodeluje)',
  exists (select 1 from klub_stik where lower(email) = 'tajnik.novi@example.invalid'
            and team_id = -913004 and stanje = 'sodeluje' and vir_url = 'https://example.org/kontakt'));
select pg_temp.preveri('klub: potrjena prošnja ustvari račun',
  je_klubski_racun('e1a10000-0000-4000-8000-000000000005', -913004));

-- Polno: šesti (iz Task 1) za -913003 brez preklica pade, s preklicem uspe.
-- Task 1 je preklical K1, zato klub spet napolnimo na 5 aktivnih.
reset role;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('e1a10000-0000-4000-8000-000000000016', 'sesti@example.invalid', now(), '{}', now());
insert into klubski_racuni(user_id, team_id) values ('e1a10000-0000-4000-8000-000000000016', -913003);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka('klub: polnega kluba admin ne potrdi brez preklica',
  $$select admin_odloci_klubski_zahtevek(
      (select id from admin_klubski_zahtevki() where vrsta = 'polno' and status = 'odprt'), true)$$);
select admin_odloci_klubski_zahtevek(
  (select id from admin_klubski_zahtevki() where vrsta = 'polno' and status = 'odprt'), true, null, null,
  (select id from admin_klubski_racuni() where user_id = 'e1a10000-0000-4000-8000-000000000011'));
reset role;
select pg_temp.preveri('klub: s preklicem šesti dobi račun, preklicani ga izgubi',
  je_klubski_racun('e1a10000-0000-4000-8000-000000000015', -913003)
  and not je_klubski_racun('e1a10000-0000-4000-8000-000000000011', -913003));

-- Brez kluba: admin izbere klub; zavrnitev nosi razlog.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka('klub: brez_kluba brez izbranega kluba ne gre',
  $$select admin_odloci_klubski_zahtevek(
      (select id from admin_klubski_zahtevki() where vrsta = 'brez_kluba' and status = 'odprt'), true)$$);
select admin_odloci_klubski_zahtevek(
  (select id from admin_klubski_zahtevki() where vrsta = 'brez_kluba' and status = 'odprt'), false, null, 'Ni naslov kluba.');
reset role;
select pg_temp.preveri('klub: zavrnjen zahtevek ima razlog',
  exists (select 1 from klubski_zahtevki where user_id = 'e1a10000-0000-4000-8000-000000000003'
            and status = 'zavrnjen' and razlog = 'Ni naslov kluba.'));

-- Popravki po pregledu: zavrnitev ostane zavrnjena; slab dokaz da berljivo napako.
select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000003',true);
set local role authenticated;
select uveljavi_klubski_racun();
reset role;
select pg_temp.preveri('klub: zavrnjen brez_kluba se ob novi prijavi ne vrne v vrsto',
  not exists (select 1 from klubski_zahtevki where user_id = 'e1a10000-0000-4000-8000-000000000003' and status = 'odprt'));
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('e1a10000-0000-4000-8000-000000000006', 'dokaz@example.invalid', now(), '{"display_name":"K6"}', now());
select set_config('request.jwt.claim.sub','e1a10000-0000-4000-8000-000000000006',true);
set local role authenticated;
do $$
declare v_msg text := '';
begin
  begin
    perform klub_zaprosi_za_naslov(-913004, 'tajnik', 'www.klub.si');
  exception when others then
    v_msg := sqlerrm;
  end;
  perform pg_temp.preveri('klub: dokaz brez https da berljivo napako', v_msg like 'Dokaz mora biti povezava%');
end;
$$;
reset role;

-- --------------------------------------------------------------------------
-- Klubski računi, faza 2: pozicije
-- --------------------------------------------------------------------------
reset role;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('f1a10000-0000-4000-8000-000000000001', 'klub.ena@example.invalid', now(), '{"display_name":"KE"}', now()),
 ('f1a10000-0000-4000-8000-000000000002', 'klub.dva@example.invalid', now(), '{"display_name":"KD"}', now());
-- KE zastopa klub -913001, KD klub -913002 (vstavimo neposredno, kot admin).
insert into klubski_racuni(user_id, team_id) values
 ('f1a10000-0000-4000-8000-000000000001', -913001),
 ('f1a10000-0000-4000-8000-000000000002', -913002);
-- -913006 je igralec kluba -913001 (MID, admin iz začetka datoteke); za test ga
-- postavimo na glasovanje, -913011 (kluba -913001) ostane admin.
update players set position = 'MID', position_source = 'glasovanje' where id = -913006;

select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select klub_nastavi_pozicijo(-913006, 'FWD');
select pg_temp.preveri('klub-poz: zahteva čaka, pozicija se ne spremeni takoj',
  (select position from players where id = -913006) = 'MID'
  and exists (select 1 from klub_cakajoce_pozicije(-913001) where igralec = -913006 and pozicija = 'FWD'));
select klub_nastavi_pozicijo(-913006, 'DEF');
select pg_temp.preveri('klub-poz: nova zahteva zamenja staro',
  (select count(*) from klub_cakajoce_pozicije(-913001) where igralec = -913006) = 1
  and (select pozicija from klub_cakajoce_pozicije(-913001) where igralec = -913006) = 'DEF');
select pg_temp.napaka('klub-poz: neveljavna pozicija', $$select klub_nastavi_pozicijo(-913006, 'XYZ')$$);
select pg_temp.zavrnjeno('klub-poz: igralec drugega kluba',
  $$select klub_nastavi_pozicijo((select id from players where team_id = -913002 limit 1), 'GK')$$);
select pg_temp.zavrnjeno('klub-poz: čakajoče drugega kluba niso vidne',
  $$select * from klub_cakajoce_pozicije(-913002)$$);
select pg_temp.zavrnjeno('klub-poz: tabele ni mogoče brati', $$select * from pozicije_klub_cakajo$$);
-- Admin igralec: zahteva se sprejme, a se ob uveljavitvi ne uveljavi.
select klub_nastavi_pozicijo(-913011, 'GK');
reset role;

set local role anon;
select pg_temp.zavrnjeno('klub-poz: anonimni ne nastavlja', $$select klub_nastavi_pozicijo(-913006, 'GK')$$);
reset role;

-- Tedenska uveljavitev (kot cron).
select uveljavi_pozicije();
select pg_temp.preveri('klub-poz: ponedeljek uveljavi pozicijo kluba',
  (select position || '/' || position_source from players where id = -913006) = 'DEF/klub');
select pg_temp.preveri('klub-poz: admin pozicije klub ne prepiše',
  (select position_source from players where id = -913011) = 'admin');
select pg_temp.preveri('klub-poz: po uveljavitvi ni več čakajočih',
  not exists (select 1 from pozicije_klub_cakajo where player_id in (-913006, -913011)));
select pg_temp.preveri('klub-poz: dnevnik zabeleži spremembo',
  exists (select 1 from pozicije_klub_dnevnik where player_id = -913006 and staro = 'MID' and novo = 'DEF'));

-- Glasovanje ne povozi pozicije kluba.
-- Poznavalec lige: en glas doseže prag, zato bi brez zaklepa pozicija padla.
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('f1a10000-0000-4000-8000-000000000004', 'poznavalec.lige@example.invalid', now(), '{"display_name":"PL"}', now());
update profiles set insider_competition_id = -913001 where id = 'f1a10000-0000-4000-8000-000000000004';
insert into position_votes(player_id, voter_id, position)
values (-913006, 'f1a10000-0000-4000-8000-000000000004', 'GK');
select potrdi_pozicijo(-913006);
select pg_temp.preveri('klub-poz: glasovanje ne povozi kluba',
  (select position_source from players where id = -913006) = 'klub');
select pg_temp.preveri('klub-poz: pozicije_v_cakanju ne kaže igralcev kluba',
  not exists (select 1 from pozicije_v_cakanju where player_id = -913006));

-- Preklican račun ne piše več.
update klubski_racuni set preklican_at = now() where user_id = 'f1a10000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('klub-poz: preklican račun ne nastavlja',
  $$select klub_nastavi_pozicijo((select id from players where team_id = -913002 limit 1), 'GK')$$);
reset role;
update klubski_racuni set preklican_at = null where user_id = 'f1a10000-0000-4000-8000-000000000002';

-- Klub KE (-913001) potrdi zahtevek za igralca svojega kluba; KD (-913002) ne.
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-921001, -913001, -913001, 'Klub', 'Profil', 'Profil Klub', 'MID', 'admin', 5, 5, true);
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('f1a10000-0000-4000-8000-000000000003', 'igralec.kluba@example.invalid', now(), '{"display_name":"IK"}', now());
insert into zahtevki_igralca(player_id, user_id) values (-921001, 'f1a10000-0000-4000-8000-000000000003');
-- Id preberemo kot postgres: RLS klubu ne pokaže tujih zahtevkov v tabeli.
select set_config('test.zahtevek_kluba', (select id::text from zahtevki_igralca where player_id = -921001), true);
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('klub-profil: drug klub ne potrdi',
  $$select odloci_zahtevek_klub(current_setting('test.zahtevek_kluba')::bigint, true)$$);
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
select odloci_zahtevek_klub(current_setting('test.zahtevek_kluba')::bigint, true);
reset role;
select pg_temp.preveri('klub-profil: klubski račun potrdi profil svojega igralca',
  exists (select 1 from zahtevki_igralca where player_id = -921001 and status = 'potrjen' and potrdil = 'klub'));

-- Stran kluba.
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select klub_uredi_predstavitev(-913001, 'Klub z dolgo tradicijo.', 'https://klub.example.org', 'nk_test', null);
select pg_temp.napaka('klub-stran: spletna stran mora biti https',
  $$select klub_uredi_predstavitev(-913001, null, 'javascript:alert(1)', null, null)$$);
select pg_temp.zavrnjeno('klub-stran: drug klub ne ureja',
  $$select klub_uredi_predstavitev(-913002, 'x', null, null, null)$$);
select klub_nastavi_grb(-913001, '-913001/grb-abc.webp');
select pg_temp.zavrnjeno('klub-stran: grb le v svojo mapo',
  $$select klub_nastavi_grb(-913001, '-913002/grb-abc.webp')$$);
reset role;
set local role anon;
select pg_temp.preveri('klub-stran: predstavitev je javna',
  (select opis from klub_predstavitev where team_id = -913001) = 'Klub z dolgo tradicijo.');
select pg_temp.preveri('klub-stran: oznaka uradnega računa je javna',
  ima_klubski_racun(-913001) and not ima_klubski_racun(-913005));
reset role;
select pg_temp.preveri('klub-stran: grb kluba je zapisan',
  (select logo_vir from teams where id = -913001) = 'klub'
  and (select logo_url from teams where id = -913001) like '%/grbi-klubov/-913001/grb-abc.webp');
-- Skripta za grbe (service_role) ne povozi grba kluba.
update teams set logo_url = '/grbi/drug.png' where id = -913001;
select pg_temp.preveri('klub-stran: skripta ne povozi grba kluba',
  (select logo_url from teams where id = -913001) like '%/grbi-klubov/-913001/grb-abc.webp');
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select admin_ponastavi_grb(-913001);
reset role;
update teams set logo_url = '/grbi/drug.png' where id = -913001;
select pg_temp.preveri('klub-stran: po adminovi ponastavitvi skripta spet piše',
  (select logo_url from teams where id = -913001) = '/grbi/drug.png' and (select logo_vir from teams where id = -913001) is null);
-- Preklican račun ne ureja strani.
update klubski_racuni set preklican_at = now() where user_id = 'f1a10000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('klub-stran: preklican račun ne ureja',
  $$select klub_uredi_predstavitev(-913001, 'y', null, null, null)$$);
reset role;

-- Popravki po pregledu faze 2.
-- (1) Čakajoča pozicija preklicanega računa se ob ponedeljku ne uveljavi.
update klubski_racuni set preklican_at = null where user_id = 'f1a10000-0000-4000-8000-000000000001';
update players set position = 'MID', position_source = 'glasovanje' where id = -921001;
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select klub_nastavi_pozicijo(-921001, 'FWD');
reset role;
update klubski_racuni set preklican_at = now() where user_id = 'f1a10000-0000-4000-8000-000000000001';
select uveljavi_pozicije();
select pg_temp.preveri('klub-poz: preklican račun, čakajoča pozicija se ne uveljavi',
  (select position_source from players where id = -921001) = 'glasovanje'
  and not exists (select 1 from pozicije_klub_cakajo where player_id = -921001));
update klubski_racuni set preklican_at = null where user_id = 'f1a10000-0000-4000-8000-000000000001';
-- (2) Spletna stran z neveljavnim gostiteljem je zavrnjena.
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('klub-stran: neveljaven gostitelj spletne strani',
  $$select klub_uredi_predstavitev(-913001, null, 'https://[x]', null, null)$$);
select pg_temp.napaka('klub-stran: neveljavna vrata spletne strani',
  $$select klub_uredi_predstavitev(-913001, null, 'https://klub.si:80a', null, null)$$);
-- (4) Pot grba: tuja mapa in nesmiselna pot vrneta false (ne napake).
select pg_temp.preveri('klub-stran: grb v tujo mapo ni dovoljen', not klub_sme_pisati_grb('-913002/grb-a.png'));
select pg_temp.preveri('klub-stran: nesmiselna pot grba vrne false', not klub_sme_pisati_grb('abc/x.png'));
select pg_temp.preveri('klub-stran: grb v svojo mapo je dovoljen', klub_sme_pisati_grb('-913001/grb-a.png'));
reset role;
-- (3) Kluba s klubskim računom ni mogoče izbrisati (združevanje klubov).
insert into teams(id, name, short_name, country_id) overriding system value
values (-921100, 'Klub brez igralcev', 'KBI', (select id from countries where code = 'SI'));
insert into klubski_racuni(user_id, team_id) values ('f1a10000-0000-4000-8000-000000000003', -921100);
select pg_temp.napaka('klub-stran: klub z računom se ne izbriše', $$delete from teams where id = -921100$$);

-- Zamrznitev cene: klub potrdi poškodbo svojega igralca (20261013233100).
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-922001, -913001, -913001, 'Pos', 'Kodba', 'Kodba Pos', 'MID', 'admin', 6, 6, true);
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, created_at) values
 ('a3a10000-0000-4000-8000-000000000001', 'poskodovan@example.invalid', now(), '{"display_name":"PO"}', now());
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
values (-922001, 'a3a10000-0000-4000-8000-000000000001', 'potrjen', 'admin', now());
insert into uradne_odsotnosti(player_id, zahtevek_id, user_id, vrsta, od, sezona)
select -922001, id, user_id, 'poskodba', current_date, '2099/00' from zahtevki_igralca where player_id = -922001;
select set_config('test.odsotnost', (select id::text from uradne_odsotnosti where player_id = -922001), true);
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('zamrznitev: tuj klub ne potrdi odsotnosti',
  $$select klub_potrdi_odsotnost(current_setting('test.odsotnost')::bigint)$$);
select pg_temp.zavrnjeno('zamrznitev: tuj klub ne vidi odsotnosti', $$select * from klub_odsotnosti(-913001)$$);
select set_config('request.jwt.claim.sub','a3a10000-0000-4000-8000-000000000001',true);
select pg_temp.zavrnjeno('zamrznitev: igralec sam ne potrdi', $$select klub_potrdi_odsotnost(current_setting('test.odsotnost')::bigint)$$);
select set_config('request.jwt.claim.sub','f1a10000-0000-4000-8000-000000000001',true);
select pg_temp.preveri('zamrznitev: klub vidi odsotnost svojega igralca',
  exists (select 1 from klub_odsotnosti(-913001) where player_id = -922001 and not potrjena));
select klub_potrdi_odsotnost(current_setting('test.odsotnost')::bigint);
reset role;
select pg_temp.preveri('zamrznitev: klub potrdi odsotnost',
  (select klub_potrdil_at is not null from uradne_odsotnosti where player_id = -922001));
set local role anon;
select pg_temp.preveri('zamrznitev: pogled pokaže zamrznjeno ceno in potrditev',
  (select cena_zamrznjena and klub_potrdil from uradne_odsotnosti_view where player_id = -922001));
select pg_temp.zavrnjeno('zamrznitev: zadržanih padcev ni mogoče brati', $$select * from zadrzani_padci$$);
reset role;

-- Želje lig ("Moje lige ni"): tabela zaprta, servisne funkcije niso javne,
-- neprijavljen potrebuje e-naslov, ponovitev ne podvoji, admin vidi seštevek.
reset role;
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '{}', true);
set local role anon;
select pg_temp.zavrnjeno('zelje lig: tabela ni berljiva', $$select * from zelje_lig$$);
select zelim_ligo('HR', 'Test MŽNL Brod', -913002, 'Zelja@Example.invalid', 'hr');
select zelim_ligo('HR', 'Test MŽNL Brod', -913002, 'zelja@example.invalid', 'hr');
reset role;
select pg_temp.preveri('zelje lig: neprijavljen z e-naslovom, brez podvojitve, vezano na neaktivno ligo',
  (select count(*) = 1 and bool_and(competition_id = -913002 and email = 'zelja@example.invalid')
     from zelje_lig where email = 'zelja@example.invalid'));
select pg_temp.preveri('zelje lig: servisne funkcije niso javne',
  not has_function_privilege('anon', 'kandidati_za_zivo_ligo(int)', 'execute')
  and not has_function_privilege('authenticated', 'kandidati_za_zivo_ligo(int)', 'execute')
  and not has_function_privilege('authenticated', 'zelja_lige_poslana(bigint,boolean)', 'execute'));
set local role anon;
do $$
begin
  perform zelim_ligo('IT', 'Serie D', null, null);
  perform pg_temp.preveri('zelje lig: brez e-naslova zavrne', false);
exception when others then
  perform pg_temp.preveri('zelje lig: brez e-naslova zavrne', sqlerrm = 'Manjka e-naslov.');
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','a3a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('zelje lig: admin pregled le za admina', $$select * from admin_zelje_lig()$$);
reset role;

-- Scout, faza 1: shema stroja je zaprta za brskalnik, Slovenija odprta.
select pg_temp.preveri('scout: Slovenija je odprta',
  (select d.stanje = 'odprto' from scout.drzave d join countries c on c.id = d.country_id where c.code = 'SI'));
select pg_temp.preveri('scout: ugovor ni javni stolpec players',
  not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'scout_skrit'));
set local role anon;
select pg_temp.zavrnjeno('scout: anon ne bere kazalnikov', $$select * from scout.kazalniki$$);
select pg_temp.zavrnjeno('scout: anon ne bere kljucev anonimizacije', $$select * from public.anonimizirani_igralci$$);
reset role;
set local role authenticated;
select pg_temp.zavrnjeno('scout: authenticated ne bere moci lig', $$select * from scout.lige_moc$$);
select pg_temp.zavrnjeno('scout: authenticated ne odpre drzave', $$update scout.drzave set stanje = 'odprto'$$);
select pg_temp.zavrnjeno('scout: authenticated ne bere kljucev anonimizacije', $$select * from public.anonimizirani_igralci$$);
reset role;
select pg_temp.preveri('scout: stroj bere zapisnike in ne pise vanje',
  has_table_privilege('scout_stroj', 'public.appearances', 'SELECT')
  and not has_table_privilege('scout_stroj', 'public.players', 'UPDATE'));
select pg_temp.preveri('scout: anon in authenticated nimata sheme scout',
  not has_schema_privilege('anon', 'scout', 'USAGE') and not has_schema_privilege('authenticated', 'scout', 'USAGE'));
-- Stroj (scout_stroj) pise shemo scout skozi RLS in vidi vse vrstice, ki jih
-- bere nalaganje (scout/stroj, SQL_SEZONE/SQL_TEKME/SQL_LIGE/SQL_IZKLJUCENI).
select pg_temp.preveri('scout: vsaka tabela scout ima politiko za stroj',
  (select count(*) = 9 from pg_policies where schemaname = 'scout' and 'scout_stroj' = any(roles)));
create function pg_temp.stroj_model() returns boolean language plpgsql as $$
declare v_id bigint; v_vidi boolean;
begin
  insert into scout.modeli (leto, backtest, parametri) values (2026, '{}', '{}') returning id into v_id;
  select count(*) = 1 into v_vidi from scout.modeli where id = v_id;
  delete from scout.modeli where id = v_id;
  return v_vidi and not exists (select 1 from scout.modeli where id = v_id);
exception when insufficient_privilege then return false;
end;
$$;
create function pg_temp.stevilo(p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into v;
  return v;
end;
$$;
create temporary table scout_stevci (poizvedba text, vse bigint);
insert into scout_stevci
select q, pg_temp.stevilo(q) from unnest(array[
  'select * from public.players', 'select * from public.appearances', 'select * from public.goals',
  'select * from public.matches', 'select * from public.rounds', 'select * from public.competitions',
  'select * from public.federations', 'select * from public.countries', 'select * from public.teams',
  'select * from scout.drzave', 'select * from public.anonimizirani_igralci',
  'select public.anonimizacijski_kljuc(''1|x'')',
  'select 1 from public.matches m join public.rounds r on r.id = m.round_id join public.competitions c on c.id = r.competition_id where m.zapisnik_id is not null and not m.kontumacija and not public.je_mladinski_slug(c.slug)',
  'select 1 from public.players p join public.competitions c on c.id = p.competition_id where public.je_mladinski_slug(c.slug)',
  'select * from scout.ugovori', 'select * from scout.odrasle_vrstice()'
]) q;
grant select on scout_stevci to scout_stroj;
grant select, insert on izidi to scout_stroj;
grant execute on function pg_temp.preveri(text, boolean), pg_temp.stroj_model(), pg_temp.stevilo(text) to scout_stroj;
set local role scout_stroj;
select pg_temp.preveri('scout: stroj vpise, prebere in izbrise model', pg_temp.stroj_model());
select pg_temp.preveri('scout: stroj vidi vse vrstice: ' || left(poizvedba, 60), pg_temp.stevilo(poizvedba) = vse)
from scout_stevci;
reset role;

-- ---------------------------------------------------------------------------
-- Scout, faza 2 (migracija 20261016160100): ugovor in privolitev igralca.
-- L (...e5c...001) je potrjeni lastnik -918001; povezana vrstica -918002 je
-- v drugi ligi z istim imenom. T (...002) je tujec. -918003 skrije admin.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('e5c00000-0000-4000-8000-000000000001','scout-lastnik@example.invalid','{"display_name":"ScoutL"}',now()),
 ('e5c00000-0000-4000-8000-000000000002','scout-tujec@example.invalid','{"display_name":"ScoutT"}',now());
update profiles set is_admin = true where id = 'b8a06635-2322-4444-8c42-44e419f912ad';
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-918001, -913001, -913001, 'Scout', 'Lastnik', 'Scout Lastnik', 'MID', 'admin', 6, 6, true),
       (-918002, -913002, -913002, 'Scout', 'Lastnik', 'Scout Lastnik', 'MID', 'admin', 6, 6, true),
       (-918003, -913003, -913001, 'Scout', 'Admin', 'Scout Admin', 'MID', 'admin', 6, 6, true),
       (-918004, -913004, -913001, 'Scout', 'Soimenjak', 'Scout Lastnik', 'MID', 'admin', 6, 6, true);
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
values (-918001, 'e5c00000-0000-4000-8000-000000000001', 'potrjen', 'admin', now());
insert into povezani_igralci(player_id, zahtevek_id)
select -918002, id from zahtevki_igralca where player_id = -918001 and status = 'potrjen';
-- Soimenjak -918004 (drug klub, isto ime v državi) je ugovarjal sam: njegov
-- ključ imena je enak lastnikovemu.
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-918004]::bigint[]);

select pg_temp.preveri('scout: funkcij Scouta anon ne klice, notranjih nihce iz brskalnika',
  not has_function_privilege('anon', 'public.scout_moj_profil(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_ugovor(bigint, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.admin_scout_skrij(bigint[])', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.odrasle_vrstice()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.kljuci_vrstic(bigint[])', 'EXECUTE')
  and has_function_privilege('scout_stroj', 'scout.odrasle_vrstice()', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout: tujec ne bere tuje privolitve', $$select * from scout_moj_profil(-918001)$$);
select pg_temp.zavrnjeno('scout: tujec ne vpise tuje privolitve',
  $$select scout_shrani_privolitev(-918001, true, 1995, '{}'::bigint[], true)$$);
select pg_temp.zavrnjeno('scout: tujec ne skrije tujega igralca', $$select scout_ugovor(-918001, true)$$);
select pg_temp.zavrnjeno('scout: navaden uporabnik ne skrije kot admin', $$select admin_scout_skrij(array[-918003]::bigint[])$$);
select pg_temp.zavrnjeno('scout: brskalnik ne bere ugovorov', $$select * from scout.ugovori$$);
select pg_temp.zavrnjeno('scout: brskalnik ne bere privolitev', $$select * from scout.privolitve$$);
reset role;

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout: letnica, ki letos ni vse leto polnoletna, zavrnjena',
  $$select scout_shrani_privolitev(-918001, true, extract(year from current_date)::int - 18, '{}'::bigint[], true)$$, null);
select pg_temp.napaka('scout: neznana regija zavrnjena',
  $$select scout_shrani_privolitev(-918001, true, 1995, array[-1]::bigint[], true)$$, null);
select scout_shrani_privolitev(-918001, true, 1995, array(select id::bigint from federations where code = 'mnzg'), true);
select pg_temp.preveri('scout: lastnik vpise in prebere privolitev',
  (select drzava_odprta and not skrit and odprt_za_prestop and letnik = 1995 and kontakt_dovoljen
          and cardinality(regije) = 1
     from scout_moj_profil(-918001)));
reset role;
select pg_temp.preveri('scout: soimenjakov ugovor ne zaklene lastnika, stroj pa ga izloci',
  (select letnik = 1995 from scout.privolitve where player_id = -918001)
  and scout.je_skrit(array[-918001]::bigint[]));
select pg_temp.preveri('scout: polnoletna privolitev odpre glavno in povezano vrstico',
  (select count(*) = 2 from scout.odrasle_vrstice() where player_id in (-918001, -918002)));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_ugovor(-918001, true);
select pg_temp.preveri('scout: ugovor skrije in izbrise privolitev',
  (select skrit and letnik is null from scout_moj_profil(-918001)));
select pg_temp.napaka('scout: skrit igralec ne vpise privolitve',
  $$select scout_shrani_privolitev(-918001, true, 1995, '{}'::bigint[], true)$$, null);
reset role;
select pg_temp.preveri('scout: ugovor zajame povezano vrstico',
  scout.je_skrit(array[-918002]::bigint[]) and exists (select 1 from scout.ugovori where player_id = -918002));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_ugovor(-918001, false);
select pg_temp.preveri('scout: lastnik preklice ugovor', (select not skrit from scout_moj_profil(-918001)));
select scout_shrani_privolitev(-918001, false, 1990, '{}'::bigint[], false);
select scout_preklici_privolitev(-918001);
reset role;
select pg_temp.preveri('scout: preklic privolitve izbrise vrstico',
  not exists (select 1 from scout.privolitve where player_id = -918001));

select set_config('request.jwt.claim.sub','e5c00000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_shrani_privolitev(-918001, true, 1990, '{}'::bigint[], true);
select preklici_moj_zahtevek((select id from zahtevki_igralca where user_id = auth.uid() and status = 'potrjen'));
reset role;
select pg_temp.preveri('scout: preklic profila izbrise privolitev',
  not exists (select 1 from scout.privolitve where player_id = -918001));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('scout: admin skrije igralca', admin_scout_skrij(array[-918003]::bigint[]) > 0);
reset role;
select pg_temp.preveri('scout: adminov ugovor velja', scout.je_skrit(array[-918003]::bigint[]));
select set_config('request.jwt.claim.sub','',true);

-- Vklop sredi sezone (20261016183300): tekma zadnjega kroga, odigrana pred
-- razporedom, ne pomeni konca sezone. -926001: krogi 1-4 odigrani, 5 in 6
-- pred nami, iz 15. kroga ena tekma že odigrana. -926002: prestavljen 3. krog,
-- 4-6 odigrani, zato velja staro pravilo (7). -926003: vsi krogi odigrani.
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
select id, slug, 'Test vklopa', 'TV', false, (select id from countries where code='SI'), 'mnzg'
from (values (-926001, 'test-vklop-zgodaj'), (-926002, 'test-vklop-prestavljen'), (-926003, 'test-vklop-konec')) v(id, slug);
insert into rounds(id, season, number, deadline_at, competition_id) overriding system value
select -926000 - c * 100 - n, sezona_lige(-926000 - c), n,
       now() + case when igrano then interval '-1 day' * (30 - n) else interval '1 day' * n end, -926000 - c
from (values (1,1,true),(1,2,true),(1,3,true),(1,4,true),(1,5,false),(1,6,false),(1,15,true),
             (2,1,true),(2,2,true),(2,3,false),(2,4,true),(2,5,true),(2,6,true),(2,7,false),
             (3,1,true),(3,2,true),(3,3,true)) v(c, n, igrano);
insert into matches(id, round_id, home_team_id, away_team_id) overriding system value
select r.id, r.id, -913001, -913002 from rounds r where r.competition_id in (-926001, -926002, -926003);
insert into appearances(match_id, player_id, team_id)
select m.id, -913001, -913001
  from matches m join rounds r on r.id = m.round_id
 where r.competition_id in (-926001, -926002, -926003) and r.deadline_at < now();
select pg_temp.preveri('vklop sredi sezone: zgodaj odigrana tekma zadnjega kroga ne konca sezone',
  (vklopi_ligo_sredi_sezone('test-vklop-zgodaj')->>'prvi_krog')::int = 5);
select pg_temp.preveri('vklop sredi sezone: po prestavljenem krogu prvi krog za zadnjim odigranim',
  (vklopi_ligo_sredi_sezone('test-vklop-prestavljen')->>'prvi_krog')::int = 7);
select pg_temp.preveri('vklop sredi sezone: koncana sezona je zavrnjena',
  (select not (r->>'vklopljena')::boolean and r->>'prvi_krog' is null and r->>'razlog' like 'Za zadnjim krogom z zapisniki (3)%'
     from (select vklopi_ligo_sredi_sezone('test-vklop-konec') r) x));

-- ---------------------------------------------------------------------------
-- Scout, faza 3 (migracije 20261017140100-140400): računi, branje, seznam,
-- plačila. K1..K4 (e5c3...001-004) so uradni računi kluba -913001 (SI), X
-- (e5c3...005) nima kluba. Igralci -930001.. so v testnih ligah.
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('e5c30000-0000-4000-8000-000000000001','scout-k1@example.invalid','{"display_name":"ScoutK1"}',now()),
 ('e5c30000-0000-4000-8000-000000000002','scout-k2@example.invalid','{"display_name":"ScoutK2"}',now()),
 ('e5c30000-0000-4000-8000-000000000003','scout-k3@example.invalid','{"display_name":"ScoutK3"}',now()),
 ('e5c30000-0000-4000-8000-000000000004','scout-k4@example.invalid','{"display_name":"ScoutK4"}',now()),
 ('e5c30000-0000-4000-8000-000000000005','scout-x@example.invalid','{"display_name":"ScoutX"}',now());
insert into klubski_racuni (user_id, team_id)
select ('e5c30000-0000-4000-8000-00000000000' || n)::uuid, -913001 from generate_series(1, 4) n;

select pg_temp.preveri('scout3: anon ne klice funkcij racunov, notranjih nihce',
  not has_function_privilege('anon', 'public.scout_moj_klub()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_zacni_preizkus(boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_zasedi_sedez()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_sprosti_sedez(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.scout_moj_klub()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.pocisti()', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.preveri('scout3: brez klubskega racuna ni kluba', scout_moj_klub() is null);
select pg_temp.zavrnjeno('scout3: brez klubskega racuna ni preizkusa', $$select scout_zacni_preizkus(true)$$);
select pg_temp.zavrnjeno('scout3: brskalnik ne bere narocnin', $$select * from scout.narocnine$$);
select pg_temp.zavrnjeno('scout3: brskalnik ne bere dnevnika', $$select * from scout.dnevnik$$);
select pg_temp.zavrnjeno('scout3: brskalnik ne pise sedezev',
  $$insert into scout.sedezi (user_id, team_id) values (auth.uid(), -913001)$$);
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: preizkus brez pogojev zavrnjen', $$select scout_zacni_preizkus(false)$$, 'scout-pogoji');
select scout_zacni_preizkus(true);
select pg_temp.preveri('scout3: preizkus 14 dni in sedez zacetnika',
  (select (k->'narocnina'->>'paket') = 'preizkus' and (k->>'sedez')::boolean and (k->'narocnina'->>'velja')::boolean
          and (k->'narocnina'->>'velja_do')::timestamptz between now() + interval '13 days' and now() + interval '15 days'
     from scout_moj_klub() k));
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.napaka('scout3: drug preizkus istega kluba zavrnjen', $$select scout_zacni_preizkus(true)$$, 'scout-preizkus-porabljen');
select scout_zasedi_sedez();
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000003',true);
set local role authenticated;
select scout_zasedi_sedez();
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.napaka('scout3: cetrti sedez zavrnjen', $$select scout_zasedi_sedez()$$, 'scout-sedezi-polni');
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_sprosti_sedez('e5c30000-0000-4000-8000-000000000003');
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000004',true);
set local role authenticated;
select scout_zasedi_sedez();
select pg_temp.preveri('scout3: sproscen sedez zasede drug racun',
  (select jsonb_array_length(k->'sedezi') = 3 and (k->>'sedez')::boolean from scout_moj_klub() k));
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: tujec ne sprosti sedeza',
  $$select scout_sprosti_sedez('e5c30000-0000-4000-8000-000000000001')$$);
reset role;
select set_config('request.jwt.claim.sub','',true);

insert into scout.dnevnik (team_id, user_id, vrsta, created_at) values
  (-913001, null, 'isci', now() - interval '13 months'),
  (-913001, null, 'isci', now() - interval '11 months');
select scout.pocisti();
select pg_temp.preveri('scout3: dnevnik hrani 12 mesecev',
  (select count(*) = 1 from scout.dnevnik where team_id = -913001 and created_at < now() - interval '10 months'));

-- Scout 3, branje. Model -> objavljen (s3.model) in novejši neobjavljen.
-- -930001 viden, -930002 skrit (ugovor), -930003 mladinska liga, -930004
-- anonimiziran, -930005 zaprta država (HR), -930006 le v neobjavljenem,
-- -930007 viden v klubu K (-913001).
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-930100, 'test-scout3-u19', 'Scout3 U19', 'S3U', false, (select id from countries where code='SI'), 'mnzg'),
       (-930200, 'test-scout3-hr', 'Scout3 HR', 'S3H', false, (select id from countries where code='HR'), 'hns');
insert into teams(id, name, short_name, country_id) overriding system value
values (-930201, 'Scout3 HR klub', 'S3H', (select id from countries where code='HR'));
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-930001, -913002, -913001, 'Scout', 'Vidni', 'Scout Vidni', 'FWD', 'admin', 6, 6, true),
       (-930002, -913002, -913001, 'Scout', 'Skriti', 'Scout Skriti', 'FWD', 'admin', 6, 6, true),
       (-930003, -913002, -930100, 'Scout', 'Mladi', 'Scout Mladi', 'FWD', 'admin', 6, 6, true),
       (-930004, -913002, -913001, 'Scout', 'Anonimni', 'Scout Anonimni', 'FWD', 'admin', 6, 6, true),
       (-930005, -930201, -930200, 'Scout', 'Hrvat', 'Scout Hrvat', 'FWD', 'admin', 6, 6, true),
       (-930006, -913002, -913001, 'Scout', 'Neobjavljeni', 'Scout Neobjavljeni', 'FWD', 'admin', 6, 6, true),
       (-930007, -913001, -913001, 'Scout', 'Domaci', 'Scout Domaci', 'MID', 'admin', 6, 6, true),
       (-930008, -913003, -913001, 'Scout', 'Anonimni', 'Scout Anonimni', 'FWD', 'admin', 6, 6, true);
-- -930008 je ista oseba kot -930004 (isto ime v državi): anonimizacija skrije obe vrstici.
insert into anonimizirani_igralci (player_id, kljuc) select * from scout.kljuci_vrstic(array[-930004]::bigint[]);
update players set anonimiziran_at = now() where id = -930004;
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-930002]::bigint[]);
insert into scout.modeli (leto, backtest, parametri, objavljen) values (2026, '{}', '{}', true);
insert into scout.modeli (leto, backtest, parametri, objavljen) values (2026, '{}', '{}', false);
create temporary table s3 as
select (select max(id) from scout.modeli where objavljen) as model,
       (select max(id) from scout.modeli where not objavljen) as neobjavljen;
insert into scout.lige_moc (model_id, competition_id, moc, vir, prestopov, izracunano_at)
select s3.model, c, 0, 'model', 0, now() from s3, unnest(array[-913001, -930100, -930200]::bigint[]) c;
insert into scout.ekipe_elo (model_id, team_id, competition_id, leto, elo)
select s3.model, -913001, -913001, 2026, 1500 from s3;
insert into scout.indeks (model_id, player_id, skupina, indeks, percentil, zaupanje)
select s3.model, p.id, p.position, 1, 90, 1
  from s3, players p where p.id in (-930001, -930002, -930003, -930004, -930005, -930007, -930008);
insert into scout.indeks (model_id, player_id, skupina, indeks, percentil, zaupanje)
select s3.neobjavljen, -930006, 'FWD', 1, 99, 1 from s3;
insert into scout.kazalniki (model_id, player_id, competition_id, sezona, leto, team_id, skupina, minute,
  delez_minut, zacetki_delez, cele_delez, goli_ref_90, delez_golov, enajstm, onoff_ref_90, prejeti_ref_90,
  ciste_delez, kartoni_90, vratar_ref_90, stalnost, trend_minut, prehod_ravni, zaupanje)
select s3.model, p.id, p.competition_id, '2026/27', 2026, p.team_id, p.position, 900,
       0.8, 0.8, 0.7, 0.5, 0.3, 0, 0.2, 1.1, 0.2, 0.1, 0, 0.9, 0, null, 1
  from s3, players p where p.id in (-930001, -930002, -930003, -930004, -930005, -930007, -930008);
insert into scout.vektorji (model_id, player_id, skupina, vektor, podobni, podobnost)
select s3.model, -930001, 'FWD', array[0.1, 0.2],
       array[-930002, -930003, -930004, -930005, -930006, -930007]::bigint[], array[0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
  from s3;
insert into scout.vrzeli (model_id, team_id, competition_id, skupina, vrsta, player_id, vrednost)
select s3.model, -913001, -913001, 'FWD', 'tanka', null, 1 from s3
union all select s3.model, -913001, -913001, 'MID', 'padajoce_minute', -930007, -0.4 from s3
union all select s3.model, -913001, -913001, 'FWD', 'disciplina', -930002, 0.5 from s3;

select pg_temp.preveri('scout3: anon ne bere, notranjih funkcij brskalnik ne klice',
  not has_function_privilege('anon', 'public.scout_isci(text, text, bigint[], integer, boolean, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_igralec(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_podobni(bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_vrzeli()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.dostop(text, bigint, jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.vidni(bigint, bigint)', 'EXECUTE')
  and has_table_privilege('authenticated', 'public.federations', 'SELECT'));

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: brez sedeza ni iskanja', $$select * from scout_isci()$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni profila', $$select scout_igralec(-930001)$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni podobnih', $$select * from scout_podobni(-930001)$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni vrzeli', $$select * from scout_vrzeli()$$);
reset role;

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scout3: iskanje vrne le vidne igralce odprte drzave iz objavljenega modela, brez lastnih',
  (select array_agg(player_id order by player_id) = array[-930001]::bigint[] from scout_isci()));
select pg_temp.preveri('scout3: profil vidnega igralca s sezonami',
  (select (j->>'ime') = 'Scout Vidni' and jsonb_array_length(j->'sezone') = 1 from scout_igralec(-930001) j));
select pg_temp.preveri('scout3: skrit, mladinec, anonimiziran (tudi druga vrstica osebe), zaprta drzava in neobjavljen nimajo profila',
  scout_igralec(-930002) is null and scout_igralec(-930003) is null and scout_igralec(-930004) is null
  and scout_igralec(-930005) is null and scout_igralec(-930006) is null and scout_igralec(-930008) is null);
select pg_temp.preveri('scout3: podobni le vidni',
  (select array_agg(player_id) = array[-930007]::bigint[] from scout_podobni(-930001)));
select pg_temp.preveri('scout3: vrzeli brez skritih igralcev',
  (select count(*) = 2 and bool_and(player_id is distinct from -930002) from scout_vrzeli()));
select pg_temp.napaka('scout3: neveljaven filter', $$select * from scout_isci('XYZ')$$, 'scout-filter');
reset role;
select pg_temp.preveri('scout3: vsak klic v dnevniku',
  (select count(*) = 10 from scout.dnevnik
    where team_id = -913001 and user_id = 'e5c30000-0000-4000-8000-000000000001'));
select pg_temp.preveri('scout3: dnevnik iskanja in podobnih hrani vrnjene igralce',
  (select bool_and(case vrsta when 'isci' then parametri->'igralci' = '[-930001]'::jsonb
                             else parametri->'igralci' = '[-930007]'::jsonb end)
     from scout.dnevnik where team_id = -913001 and vrsta in ('isci', 'podobni')
      and user_id = 'e5c30000-0000-4000-8000-000000000001'));

-- Privolitev brez "odprt za prestop" se klubu ne pokaže; stika klub ne vidi (faza 4).
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
values (-930001, 'e5c30000-0000-4000-8000-000000000005', 'potrjen', 'admin', now());
insert into scout.privolitve (player_id, odprt_za_prestop, letnik, regije, kontakt_dovoljen)
values (-930001, false, 1995, '{}', true);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scout3: privolitev brez odprt za prestop se ne pokaze',
  (select (j->'privolitev') = 'null'::jsonb from scout_igralec(-930001) j)
  and not exists (select 1 from scout_isci(p_samo_odprti => true)));
reset role;
update scout.privolitve set odprt_za_prestop = true where player_id = -930001;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scout3: odprt za prestop se pokaze, stik ne',
  (select (j->'privolitev'->>'letnik') = '1995' and not (j->'privolitev' ? 'kontakt_dovoljen')
     from scout_igralec(-930001) j)
  and (select array_agg(player_id) = array[-930001]::bigint[] from scout_isci(p_samo_odprti => true)));
reset role;

-- Vrstico -930001 pokrivata dva profila: neposredni (odprt) in povezava iz
-- drugega profila (zaprt). Iskanje in podobni vrneta igralca enkrat, z odprto.
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at)
values (-930002, 'e5c30000-0000-4000-8000-000000000002', 'potrjen', 'admin', now());
insert into povezani_igralci (player_id, zahtevek_id)
select -930001, id from zahtevki_igralca where player_id = -930002 and status = 'potrjen';
insert into scout.privolitve (player_id, odprt_za_prestop, letnik, regije, kontakt_dovoljen)
values (-930002, false, 1990, '{}', false);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scout3: dva profila na isti vrstici, en zadetek z odprto privolitvijo',
  (select count(*) = 1 and bool_and(odprt_za_prestop) from scout_isci() where player_id = -930001)
  and (select (j->'privolitev'->>'letnik') = '1995' from scout_igralec(-930001) j));
reset role;
delete from povezani_igralci where player_id = -930001;
delete from scout.privolitve where player_id = -930002;
delete from zahtevki_igralca where player_id = -930002;

insert into scout.dnevnik (team_id, vrsta, player_id)
select -913001, 'igralec', -930001 from generate_series(1, 500);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: dnevna meja profilov', $$select scout_igralec(-930001)$$, 'scout-meja');
select pg_temp.preveri('scout3: iskanje ima svojo mejo', (select count(*) = 1 from scout_isci()));
reset role;
delete from scout.dnevnik where team_id = -913001 and user_id is null and vrsta = 'igralec';

update scout.narocnine set velja_do = now() - interval '1 second' where team_id = -913001;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: potekla narocnina', $$select * from scout_isci()$$);
reset role;
update scout.narocnine set velja_do = now() + interval '14 days' where team_id = -913001;
update scout.drzave set stanje = 'zaprto' where country_id = (select id from countries where code = 'SI');
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: zaprta drzava', $$select * from scout_isci()$$);
reset role;
update scout.drzave set stanje = 'odprto' where country_id = (select id from countries where code = 'SI');
update klubski_racuni set preklican_at = now() where user_id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: preklican klubski racun', $$select * from scout_isci()$$);
reset role;
update klubski_racuni set preklican_at = null where user_id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','',true);

-- Scout, stran Klub (20261018120000). Klub K = -913001; uporabnik ...0001 ima sedež.
select pg_temp.preveri('scoutk: anon ne klice, notranje ne iz brskalnika',
  not has_function_privilege('anon', 'public.scout_klub(bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.scout_klub(bigint)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'scout.klub_jedro(bigint, bigint, bigint, boolean)', 'EXECUTE'));

select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scoutk: brez sedeza ni pregleda kluba', $$select scout_klub()$$);
reset role;

-- Liga kluba: najprej odrasla liga s tekmami tekoče sezone (K igra v testih vklopa, največ v -926002).
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: liga kluba po tekmah tekoce sezone',
  (scout_klub()->'glava'->>'competition_id')::bigint = -926002);
reset role;
-- Brez tekem tekoče sezone pride liga iz Elo (scout.liga_kluba).
update rounds set season = '2099/00' where competition_id in (-926001, -926002, -926003);
-- Skriti, mladinski in anonimizirani igralci naj bodo v kadru kluba K, da izločanje res velja.
update scout.kazalniki set team_id = -913001, competition_id = -913001
 where player_id in (-930001, -930002, -930003, -930004, -930008);
update scout.kazalniki set sezona = public.sezona_lige(-913001) where player_id between -930008 and -930001;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: svoj klub, kader le vidni igralci',
  (select (j->>'team_id')::bigint = -913001
      and not (j->>'admin')::boolean
      and (j->'glava'->>'competition_id')::bigint = -913001
      and (select array_agg((x->>'player_id')::bigint order by (x->>'player_id')::bigint)
             from jsonb_array_elements(j->'kader') x where not (x->>'mladi')::boolean) = array[-930007, -930001]::bigint[]
      and jsonb_array_length(j->'vrzeli') = 2
     from scout_klub() j));
select pg_temp.preveri('scoutk: svoj klub tudi z izrecnim id', (select (scout_klub(-913001)->>'team_id')::bigint = -913001));
select pg_temp.zavrnjeno('scoutk: ne-admin ne vidi tujega kluba', $$select scout_klub(-913002)$$);
reset role;

-- Igralci z mladinsko vrstico (20261018150000): stroj jih izloči, svoj klub jih
-- vidi z javnimi dejstvi tekem. -930011 viden (GK), -930012 ugovor, -930015
-- anonimiziran po ključu, -930017 pri drugem klubu (-913002). Vsak ima
-- soimenjaka v mladinski ligi -930100. -930019 brez mladinske vrstice in brez
-- kazalnikov (ga ni), -930020 povezan le po šifri (viden), -930022 z
-- anonimiziran_at (ga ni), -930001 ima kazalnike in mladinskega soimenjaka -930024
-- (ena vrstica, mladi = false).
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-930011, -913001, -913001, 'Scout', 'Mladinec', 'Scout Mladinec', 'GK', 'admin', 5, 5, true),
       (-930013, -913001, -930100, 'Scout', 'Mladinec', 'Scout Mladinec', 'GK', 'admin', 5, 5, true),
       (-930012, -913001, -913001, 'Scout', 'Mladugovor', 'Scout Mladugovor', 'MID', 'admin', 5, 5, true),
       (-930014, -913001, -930100, 'Scout', 'Mladugovor', 'Scout Mladugovor', 'MID', 'admin', 5, 5, true),
       (-930015, -913001, -913001, 'Scout', 'Mladanon', 'Scout Mladanon', 'MID', 'admin', 5, 5, true),
       (-930016, -913001, -930100, 'Scout', 'Mladanon', 'Scout Mladanon', 'MID', 'admin', 5, 5, true),
       (-930017, -913002, -913001, 'Scout', 'Mladtuj', 'Scout Mladtuj', 'MID', 'admin', 5, 5, true),
       (-930018, -913002, -930100, 'Scout', 'Mladtuj', 'Scout Mladtuj', 'MID', 'admin', 5, 5, true),
       (-930019, -913001, -913001, 'Scout', 'Brezmlad', 'Scout Brezmlad', 'MID', 'admin', 5, 5, true),
       (-930022, -913001, -913001, 'Scout', 'Mladanonat', 'Scout Mladanonat', 'MID', 'admin', 5, 5, true),
       (-930023, -913001, -930100, 'Scout', 'Mladanonat', 'Scout Mladanonat', 'MID', 'admin', 5, 5, true),
       (-930024, -913001, -930100, 'Scout', 'Vidni', 'Scout Vidni', 'FWD', 'admin', 5, 5, true);
insert into players(id, team_id, competition_id, first_name, last_name, full_name, reg_st, position, position_source, value, value_start, active) overriding system value
values (-930020, -913001, -913001, 'Scout', 'Sifra', 'Scout Sifra', 930020, 'DEF', 'admin', 5, 5, true),
       (-930021, -913001, -930100, 'Scout', 'Drugoime', 'Scout Drugoime', 930020, 'DEF', 'admin', 5, 5, true);
update players set anonimiziran_at = now() where id = -930022;
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-930012]::bigint[]);
insert into anonimizirani_igralci (player_id, kljuc) select * from scout.kljuci_vrstic(array[-930015]::bigint[]);
insert into rounds(id, season, number, deadline_at, competition_id) overriding system value
values (-930301, sezona_lige(-913001), 91, now() - interval '20 days', -913001),
       (-930302, sezona_lige(-913001), 92, now() - interval '10 days', -913001);
insert into matches(id, round_id, home_team_id, away_team_id, home_goals, away_goals, imported_at) overriding system value
values (-930301, -930301, -913001, -913002, 1, 0, now()), (-930302, -930302, -913002, -913001, 0, 0, now());
insert into appearances(match_id, player_id, team_id, started, minutes_played)
select m, p, t, true, mi
  from (values (-930301, -930011, -913001, 90), (-930302, -930011, -913001, 45),
               (-930301, -930012, -913001, 90), (-930301, -930015, -913001, 90),
               (-930301, -930017, -913002, 90), (-930301, -930019, -913001, 90),
               (-930301, -930020, -913001, 90), (-930301, -930022, -913001, 90),
               (-930301, -930001, -913001, 90)) v(m, p, t, mi);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: svoj klub vidi igralca z mladinsko vrstico, brez ugovora in anonimiziranih',
  (select array_agg((x->>'player_id')::bigint order by (x->>'player_id')::bigint) = array[-930020, -930011]::bigint[]
          and bool_and((x->>'player_id')::bigint <> -930011
                       or ((x->>'nastopi')::int = 2 and (x->>'minute')::int = 135 and x->>'skupina' = 'GK'
                           and (x->>'zacetki_delez')::float = 1 and x->'kartoni_90' = 'null'::jsonb
                           and x->'onoff_ref_90' = 'null'::jsonb))
     from scout_klub() j, jsonb_array_elements(j->'kader') x where (x->>'mladi')::boolean));
select pg_temp.preveri('scoutk: igralec s kazalniki in mladinsko vrstico le enkrat, mladi = false',
  (select count(*) = 1 and bool_and(not (x->>'mladi')::boolean)
     from scout_klub() j, jsonb_array_elements(j->'kader') x where (x->>'player_id')::bigint = -930001));
reset role;
select pg_temp.preveri('scoutk: drug klub ima igralca z mladinsko vrstico (kontrola)',
  (select bool_or((x->>'player_id')::bigint = -930017)
     from s3, jsonb_array_elements(scout.klub_jedro(s3.model, (select id from countries where code='SI'), -913002, true)->'kader') x));
update profiles set is_admin = true where id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: admin pri tujem klubu ne vidi igralcev z mladinsko vrstico',
  (select (j->>'team_id')::bigint = -913002
          and not exists (select 1 from jsonb_array_elements(j->'kader') x where (x->>'mladi')::boolean)
     from scout_klub(-913002) j));
reset role;
update profiles set is_admin = false where id = 'e5c30000-0000-4000-8000-000000000001';
delete from appearances where match_id in (-930301, -930302);
delete from matches where id in (-930301, -930302);
delete from rounds where id in (-930301, -930302);
delete from scout.ugovori where player_id = -930012;
delete from anonimizirani_igralci where player_id = -930015;
delete from players where id between -930024 and -930011;
update scout.kazalniki k set team_id = p.team_id, competition_id = p.competition_id, sezona = '2026/27'
  from players p where p.id = k.player_id and k.player_id between -930008 and -930001;
update rounds set season = sezona_lige(competition_id) where competition_id in (-926001, -926002, -926003);
select pg_temp.preveri('scoutk: klic v dnevniku',
  exists (select 1 from scout.dnevnik where team_id = -913001 and vrsta = 'klub'
            and user_id = 'e5c30000-0000-4000-8000-000000000001'));
select pg_temp.preveri('scoutk: dnevnik hrani vrnjene igralce kadra, skritih ne',
  exists (select 1 from scout.dnevnik where team_id = -913001 and vrsta = 'klub'
             and parametri->'igralci' @> '[-930007, -930001]'::jsonb)
  and not exists (select 1 from scout.dnevnik where team_id = -913001 and vrsta = 'klub'
                     and parametri->'igralci' @> '[-930002]'::jsonb));

update profiles set is_admin = true where id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scoutk: admin vidi drug klub iste drzave',
  (select (j->>'team_id')::bigint = -913002 and (j->>'admin')::boolean from scout_klub(-913002) j));
select pg_temp.zavrnjeno('scoutk: admin ne vidi kluba druge drzave', $$select scout_klub(-930201)$$);
reset role;
update profiles set is_admin = false where id = 'e5c30000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','',true);

-- Scout 3, opazovalni seznam (klub -913001, do 30).
select pg_temp.preveri('scout3: anon nima seznama',
  not has_function_privilege('anon', 'public.scout_opazuj(bigint, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_opazovani()', 'EXECUTE'));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: brez sedeza ni seznama', $$select * from scout_opazovani()$$);
select pg_temp.zavrnjeno('scout3: brez sedeza ni dodajanja', $$select scout_opazuj(-930001, true)$$);
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_opazuj(-930001, true);
select pg_temp.preveri('scout3: igralec na seznamu',
  (select array_agg(player_id) = array[-930001]::bigint[] from scout_opazovani()));
select pg_temp.preveri('scout3: profil ve, da ga klub opazuje', (scout_igralec(-930001)->>'opazujem')::boolean);
select pg_temp.napaka('scout3: skritega ni mogoce opazovati', $$select scout_opazuj(-930002, true)$$, 'scout-ni-igralca');
reset role;
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-930001]::bigint[]);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('scout3: ugovor skrije igralca s seznama takoj, vrstica ostane do ciscenja',
  not exists (select 1 from scout_opazovani()));
reset role;
select pg_temp.preveri('scout3: dodajanje in branje seznama v dnevniku',
  exists (select 1 from scout.dnevnik where team_id = -913001 and vrsta = 'opazuj' and player_id = -930001)
  and exists (select 1 from scout.dnevnik where team_id = -913001 and vrsta = 'opazovani')
  and exists (select 1 from scout.opazovani where team_id = -913001 and player_id = -930001));
delete from scout.ugovori where player_id = -930001;
-- 29 vidnih polnil (različna imena: ugovor je po imenu) + -930001 = 30 vidnih
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
select -940000 - n, -913002, -913001, 'Polnilo', n::text, 'Polnilo ' || n, 'FWD', 'admin', 6, 6, true from generate_series(1, 29) n;
insert into scout.indeks (model_id, player_id, skupina, indeks, percentil, zaupanje)
select s3.model, -940000 - n, 'FWD', 0, 50, 1 from s3, generate_series(1, 29) n;
insert into scout.opazovani (team_id, player_id) select -913001, -940000 - n from generate_series(1, 29) n;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: seznam ima najvec 30', $$select scout_opazuj(-930007, true)$$, 'scout-seznam-poln');
reset role;
-- igralec, ki ga klub ne vidi več, ne zaseda mesta (pred pocisti)
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-940001]::bigint[]);
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_opazuj(-930007, true);
select pg_temp.preveri('scout3: nevidni ne zasedajo mesta na seznamu',
  exists (select 1 from scout_opazovani() where player_id = -930007));
reset role;
select pg_temp.preveri('scout3: seznam v dnevniku hrani vrnjene igralce',
  (select parametri->'igralci' @> '[-930007, -930001]'::jsonb and not parametri->'igralci' @> '[-940001]'::jsonb
     from scout.dnevnik where team_id = -913001 and vrsta = 'opazovani' order by id desc limit 1));
delete from scout.opazovani where team_id = -913001 and (player_id between -940029 and -940002 or player_id = -930007);
insert into scout.opazovani (team_id, player_id) values (-913001, -930002);
select scout.pocisti();
select pg_temp.preveri('scout3: ciscenje odstrani skrite in neobstojece s seznama',
  not exists (select 1 from scout.opazovani where team_id = -913001 and player_id in (-930002, -940001))
  and exists (select 1 from scout.opazovani where team_id = -913001 and player_id = -930001));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select scout_opazuj(-930001, false);
select pg_temp.preveri('scout3: odstranjen s seznama', not exists (select 1 from scout_opazovani()));
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Scout 3, plačila (stripe-webhook kliče kot service_role).
select pg_temp.preveri('scout3: placila zapise le servis',
  not has_function_privilege('authenticated', 'public.scout_iz_placila(bigint, uuid, text, timestamp with time zone, text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.scout_podaljsaj(text, timestamp with time zone)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.scout_narocnina_konec(text, timestamp with time zone)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.scout_iz_placila(bigint, uuid, text, timestamp with time zone, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_pripravi_nakup(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_portal_kupec()', 'EXECUTE'));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: brez sedeza ni nakupa', $$select * from scout_pripravi_nakup('mesec')$$);
select pg_temp.preveri('scout3: tujec nima kupca za portal', scout_portal_kupec() is null);
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: neveljavno obdobje', $$select * from scout_pripravi_nakup('teden')$$, 'scout-filter');
select pg_temp.preveri('scout3: sedez pripravi nakup s svojim mailom',
  (select team_id = -913001 and email = 'scout-k1@example.invalid' from scout_pripravi_nakup('mesec')));
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('scout3: placilo aktivira paket Klub',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000001', 'mesec', now() + interval '33 days', 'cus_s3', 'sub_s3') = 'aktivna');
-- Ločen stavek: posnetek klica ne vidi spremembe, ki jo naredi funkcija v istem stavku.
select pg_temp.preveri('scout3: placilo zapise paket Klub, obdobje in placnika',
  (select paket = 'klub' and obdobje = 'mesec' and placal = 'e5c30000-0000-4000-8000-000000000001'
         from scout.narocnine where team_id = -913001));
select pg_temp.preveri('scout3: ponovljen dogodek je idempotenten',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000001', 'mesec', now() + interval '33 days', 'cus_s3', 'sub_s3') = 'aktivna');
select pg_temp.preveri('scout3: drugo placilo istega kluba je dvojno',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', now() + interval '1 year', 'cus_s3b', 'sub_s3b') = 'dvojno');
select pg_temp.preveri('scout3: podaljsanje le naprej',
  scout_podaljsaj('sub_s3', now() + interval '1 day') = 'podaljsano'
  and (select velja_do > now() + interval '30 days' from scout.narocnine where team_id = -913001));
select pg_temp.preveri('scout3: tuja narocnina je neznana', scout_podaljsaj('sub_tuja', now()) = 'neznana');
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.napaka('scout3: placan klub ne kupi znova', $$select * from scout_pripravi_nakup('sezona')$$, 'scout-ze-placano');
reset role;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.preveri('scout3: vsak uradni racun kluba odpre portal', scout_portal_kupec() = 'cus_s3');
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('scout3: konec narocnine', scout_narocnina_konec('sub_s3', now() - interval '1 second') = 'koncano');
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('scout3: po koncu narocnine ni iskanja', $$select * from scout_isci()$$);
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('scout3: placilo brez roka, narocnine ali kupca je neveljavno',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', null, 'cus_s3', 'sub_s3n') = 'neveljavno'
  and scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', now() + interval '1 year', 'cus_s3', null) = 'neveljavno'
  and scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', now() + interval '1 year', null, 'sub_s3n') = 'neveljavno');
select pg_temp.preveri('scout3: novo placilo vrne staro narocnino za preklic',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', now() + interval '1 year', 'cus_s3', 'sub_s3c') = 'aktivna:sub_s3');
select pg_temp.preveri('scout3: novo placilo zapise novo narocnino',
  (select stripe_subscription_id = 'sub_s3c' and obdobje = 'sezona' from scout.narocnine where team_id = -913001));
-- Ponovitev po spodletelem preklicu stare: webhook mora staro dobiti znova.
select pg_temp.preveri('scout3: ponovljeno placilo spet vrne staro narocnino za preklic',
  scout_iz_placila(-913001, 'e5c30000-0000-4000-8000-000000000002', 'sezona', now() + interval '1 year', 'cus_s3', 'sub_s3c') = 'aktivna:sub_s3');

-- --------------------------------------------------------------------------
-- Pravice tabel po selitvi (20261017163700): katalog in prave poti aplikacije.
-- Obnova baze na Hetzner je vrnila privzete pravice Supabase (ALL za anon in
-- authenticated); tu je zapisano, kaj sme kdo, da se to ne ponovi neopazno.
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);

select pg_temp.preveri('pravice: nihce nima TRUNCATE, REFERENCES, TRIGGER ali MAINTAIN v public',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join lateral aclexplode(c.relacl) a
    where n.nspname='public' and c.relkind in ('r','p','v','m','f')
      and a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
      and a.privilege_type in ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')));

select pg_temp.preveri('pravice: v poglede ne pise nihce (pisanje prek pogleda obide RLS)',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join lateral aclexplode(c.relacl) a
    where n.nspname='public' and c.relkind in ('v','m')
      and a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)
      and a.privilege_type in ('INSERT','UPDATE','DELETE')));

select pg_temp.preveri('pravice: anon ne pise v nobeno tabelo (niti v stolpce)',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE'))
  and not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute att on att.attrelid=c.oid and att.attnum>0 and not att.attisdropped
    where n.nspname='public' and c.relkind in ('r','p')
      and has_column_privilege('anon', c.oid, att.attnum, 'INSERT,UPDATE')));

-- Natanko seznam iz migracije; nova tabela, v katero pise vmesnik, mora biti
-- dodana tu in imeti politiko RLS za ukaz.
select pg_temp.preveri('pravice: authenticated pise (na ravni tabele) le v nameravane tabele',
  (select string_agg(c.relname||':'||p.priv, ' ' order by c.relname, p.priv)
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     cross join (values ('DELETE'),('INSERT'),('UPDATE')) p(priv)
    where n.nspname='public' and c.relkind in ('r','p')
      and has_table_privilege('authenticated', c.oid, p.priv))
  = 'appearances:DELETE appearances:INSERT appearances:UPDATE '
    'assist_votes:DELETE assist_votes:INSERT assist_votes:UPDATE '
    'chat_messages:DELETE chat_messages:INSERT '
    'competition_settings:DELETE competition_settings:INSERT competition_settings:UPDATE '
    'competitions:DELETE competitions:INSERT competitions:UPDATE '
    'countries:DELETE countries:INSERT countries:UPDATE '
    'fantasy_chips:DELETE fantasy_chips:INSERT fantasy_chips:UPDATE '
    'fantasy_lineups:DELETE fantasy_lineups:INSERT fantasy_lineups:UPDATE '
    'fantasy_transfers:DELETE fantasy_transfers:INSERT fantasy_transfers:UPDATE '
    'federations:DELETE federations:INSERT federations:UPDATE '
    'goals:DELETE goals:INSERT goals:UPDATE '
    'klub_stik:DELETE klub_stik:INSERT klub_stik:UPDATE '
    'klub_stik_posta:DELETE klub_stik_posta:INSERT klub_stik_posta:UPDATE '
    'matches:DELETE matches:INSERT matches:UPDATE '
    'mini_liga_clani:DELETE mini_lige:DELETE '
    'player_reports:DELETE player_reports:INSERT '
    'players:DELETE players:INSERT players:UPDATE '
    'position_priors:DELETE position_priors:INSERT position_priors:UPDATE '
    'position_votes:DELETE position_votes:INSERT position_votes:UPDATE '
    'price_changes:DELETE price_changes:INSERT price_changes:UPDATE '
    'rounds:DELETE rounds:INSERT rounds:UPDATE '
    'settings:DELETE settings:INSERT settings:UPDATE '
    'sponsors:DELETE sponsors:INSERT sponsors:UPDATE '
    'teams:DELETE teams:INSERT teams:UPDATE');

select pg_temp.preveri('pravice: vsaka pisalna pravica authenticated ima politiko RLS za ukaz',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join (values ('DELETE'),('INSERT'),('UPDATE')) p(priv)
    where n.nspname='public' and c.relkind in ('r','p')
      and (has_table_privilege('authenticated', c.oid, p.priv)
           or exists (select 1 from pg_attribute att
                       where att.attrelid=c.oid and att.attnum>0 and not att.attisdropped
                         and p.priv<>'DELETE'
                         and has_column_privilege('authenticated', c.oid, att.attnum, p.priv)))
      and not exists (select 1 from pg_policies pol
                       where pol.schemaname='public' and pol.tablename=c.relname
                         and pol.cmd in (p.priv, 'ALL'))));

select pg_temp.preveri('pravice: profil in ekipa le prek izbranih stolpcev',
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'javni_profil', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.fantasy_teams', 'INSERT,UPDATE,DELETE')
  and not has_column_privilege('authenticated', 'public.fantasy_teams', 'cash', 'UPDATE')
  and has_column_privilege('authenticated', 'public.fantasy_teams', 'name', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.fantasy_roster', 'INSERT,UPDATE,DELETE'));

select pg_temp.preveri('pravice: izracunane tabele in pogledi niso javni',
  not has_table_privilege('anon', 'public.statistika_igralcev', 'SELECT')
  and not has_table_privilege('authenticated', 'public.tocke_krogov', 'SELECT')
  and not has_table_privilege('anon', 'public.fantasy_round_points_izracun', 'SELECT')
  and not has_table_privilege('anon', 'public.player_season_stats_izracun', 'SELECT'));

select pg_temp.preveri('pravice: zaporedja v public niso dostopna API vlogama',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join lateral aclexplode(c.relacl) a
    where n.nspname='public' and c.relkind='S'
      and a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole)));

select pg_temp.preveri('pravice: nove tabele in zaporedja (postgres, public) dobijo le SELECT',
  not exists (
    select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
    where d.defaclrole='postgres'::regrole and d.defaclnamespace='public'::regnamespace
      and d.defaclobjtype in ('r','S')
      and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
      and not (d.defaclobjtype='r' and a.privilege_type='SELECT')));

-- Prave poti aplikacije z lastnimi podatki (-9139xx).
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-913901, 'test-pravice-pot', 'Test poti aplikacije', 'TPA', false, (select id from countries where code='SI'), 'mnzg');
insert into players(id, team_id, competition_id, first_name, last_name, position,
                    position_source, value, value_start, active) overriding system value
select -913900-n, -913001-((n-1)%5), -913901, 'Pot', n::text,
       case when n<=2 then 'GK' when n<=7 then 'DEF' when n<=12 then 'MID' else 'FWD' end,
       'admin', 6, 6, true
from generate_series(1,15) n;
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
values (-913901,'2099/00',2,now()+interval '1 day',-913901);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('b8a06635-2322-4444-8c42-44e419f91901','test-pot-a@example.invalid','{"display_name":"Pot A"}',now()-interval '2 days'),
 ('b8a06635-2322-4444-8c42-44e419f91902','test-pot-b@example.invalid','{"display_name":"Pot B"}',now()-interval '2 days');
create function pg_temp.kader_pot() returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
    'player_id', -913900-n,
    'is_starter', n not in (2,7,12,15),
    'is_captain', n=1, 'is_vice', n=3,
    'bench_order', case n when 2 then 1 when 7 then 2 when 12 then 3 when 15 then 4 end
  )) from generate_series(1,15) n;
$$;
grant execute on function pg_temp.kader_pot() to authenticated;

-- B ustvari ekipo, ki se bo pridruzila ligi.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f91902',true);
set local role authenticated;
insert into fantasy_teams(owner_id,name,competition_id) values(auth.uid(),'Pot B ekipa',-913901);
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f91901',true);
set local role authenticated;
update profiles set avatar_barva=2, javni_profil=true, navijam_team_id=-913001, brez_push=true where id=auth.uid();
select pg_temp.preveri('pot: profil (avatar, javnost, klub, obvestila) se shrani',
  (select avatar_barva=2 and javni_profil and navijam_team_id=-913001 and brez_push from profiles where id=auth.uid()));
select pg_temp.zavrnjeno('pot: prijavljeni si ne nastavi admina (tabelna UPDATE pravica)',
  $$update profiles set is_admin=true where id=auth.uid()$$);
insert into fantasy_teams(owner_id,name,competition_id) values(auth.uid(),'Pot A ekipa',-913901);
select set_config('test.pot_ekipa', (select id::text from fantasy_teams where owner_id=auth.uid() and competition_id=-913901), true);
select pg_temp.preveri('pot: ustvarjanje fantasy ekipe', current_setting('test.pot_ekipa', true) is not null);
update fantasy_teams set name='Pot A preimenovana' where id=current_setting('test.pot_ekipa')::bigint;
select pg_temp.preveri('pot: preimenovanje ekipe',
  (select name='Pot A preimenovana' from fantasy_teams where id=current_setting('test.pot_ekipa')::bigint));
select pg_temp.zavrnjeno('pot: lastnik ne spremeni denarja ekipe',
  $$update fantasy_teams set cash=9999 where id=current_setting('test.pot_ekipa')::bigint$$);
select shrani_ekipo(current_setting('test.pot_ekipa')::bigint, pg_temp.kader_pot());
select pg_temp.preveri('pot: shranjevanje postave (shrani_ekipo)',
  (select count(*)=15 from fantasy_roster where fantasy_team_id=current_setting('test.pot_ekipa')::bigint));
select pg_temp.zavrnjeno('pot: kadra ni mogoce pisati mimo shrani_ekipo',
  $$delete from fantasy_roster where fantasy_team_id=current_setting('test.pot_ekipa')::bigint$$);
insert into fantasy_chips(fantasy_team_id, chip, round_id)
values (current_setting('test.pot_ekipa')::bigint, 'klop_plus', -913901);
delete from fantasy_chips where fantasy_team_id=current_setting('test.pot_ekipa')::bigint and chip='klop_plus';
select pg_temp.preveri('pot: pripomocek se vklopi in izklopi',
  not exists (select 1 from fantasy_chips where fantasy_team_id=current_setting('test.pot_ekipa')::bigint));
select set_config('test.pot_koda',
  (select code from ustvari_mini_ligo('Pot liga', current_setting('test.pot_ekipa')::bigint)), true);
select pg_temp.preveri('pot: ustvarjanje mini lige', current_setting('test.pot_koda', true) is not null);
insert into chat_messages(user_id, content, alias, country_code) values (auth.uid(), 'Pot sporocilo', 'PotA', 'SI');
select pg_temp.preveri('pot: sporocilo v klepetu (in je_moje v pogledu)',
  (select je_moje from klepet_sporocila where content='Pot sporocilo'));
select pg_temp.zavrnjeno('pot: sporocila se ne ureja',
  $$update chat_messages set content='Spremenjeno' where user_id=auth.uid()$$);
delete from chat_messages where user_id=auth.uid() and content='Pot sporocilo';
select pg_temp.preveri('pot: avtor izbrise svoje sporocilo',
  not exists (select 1 from klepet_sporocila where content='Pot sporocilo'));
insert into player_reports(player_id, user_id, kind, content) values (-913901, auth.uid(), 'drugo', 'Pot prijava');
delete from player_reports where user_id=auth.uid() and content='Pot prijava';
select pg_temp.preveri('pot: prijava o igralcu se odda in umakne',
  not exists (select 1 from player_reports where content='Pot prijava'));
select pg_temp.zavrnjeno('pot: TRUNCATE ni dovoljen niti prijavljenemu',
  $$truncate chat_messages$$);
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f91902',true);
set local role authenticated;
select pridruzi_mini_ligi(current_setting('test.pot_koda'),
  (select id from fantasy_teams where owner_id=auth.uid() and competition_id=-913901));
select pg_temp.preveri('pot: pridruzitev mini ligi s kodo',
  exists (select 1 from mini_liga_clani c join fantasy_teams ft on ft.id=c.fantasy_team_id
           where ft.owner_id=auth.uid() and ft.competition_id=-913901));
select pg_temp.zavrnjeno('pot: clanstva ni mogoce vpisati mimo kode',
  $$insert into mini_liga_clani(mini_liga_id, fantasy_team_id)
    select mini_liga_id, fantasy_team_id from mini_liga_clani limit 1$$);
delete from mini_liga_clani
 where fantasy_team_id=(select id from fantasy_teams where owner_id=auth.uid() and competition_id=-913901);
select pg_temp.preveri('pot: izstop iz mini lige',
  not exists (select 1 from mini_liga_clani c join fantasy_teams ft on ft.id=c.fantasy_team_id
               where ft.owner_id=auth.uid() and ft.competition_id=-913901));
reset role;

-- Administracija → Klubi piše stike neposredno.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
insert into klub_stik(klub, drzava, team_id, stanje) values ('Pot klub', 'SI', -913001, 'ni_maila');
update klub_stik set opomba='pot' where klub='Pot klub';
insert into klub_stik_posta(stik_id, vrsta, zadeva) select id, 'prvi', 'Pot' from klub_stik where klub='Pot klub';
select pg_temp.preveri('pot: admin vodi stike s klubi',
  exists (select 1 from klub_stik_posta p join klub_stik s on s.id=p.stik_id where s.klub='Pot klub' and s.opomba='pot'));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f91901',true);
set local role authenticated;
select pg_temp.zavrnjeno('pot: stikov s klubi ne pise navaden uporabnik (RLS)',
  $$insert into klub_stik(klub, drzava, stanje) values ('Vsiljen klub', 'SI', 'nov')$$);
reset role;

-- Novi nemski stiki in vsi doslej podprti drzavni kodi morajo ostati veljavni.
insert into klub_stik(id, klub, drzava, stanje) overriding system value
select -915000-n, 'Test drzave '||drzava, drzava, 'nov'
from unnest(array['SI','SK','HR','CZ','HU','AT','RS','RO','EE','PL','ES','LV','MK',
                  'GR','TR','UA','AM','AZ','DK','GB','MT','ME','BA','MD','DE'])
     with ordinality as kode(drzava,n);
select pg_temp.preveri('stiki: Nemcija in vse obstojece drzave so dovoljene',
  (select count(*)=25 from klub_stik where id between -915025 and -915001));
do $$
declare v_zavrnjeno boolean := false;
begin
  begin
    insert into klub_stik(klub, drzava, stanje) values ('Test neznane drzave', 'ZZ', 'nov');
  exception when check_violation then v_zavrnjeno := true;
  end;
  perform pg_temp.preveri('stiki: neznana drzava ostane zavrnjena', v_zavrnjeno);
end;
$$;

-- --- Trgovina (20261018170000) ---------------------------------------------
-- Shema ni v API; anon bere le katalog brez zaloge v številkah, servis
-- rezervira in plača, admin RPC le admin. Odjemalci: sha256 hex.
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('test.odj', encode(sha256('test-odjemalec'), 'hex'), true);
insert into trgovina.izdelki(id, slug, ime_sl, ime_en, kategorija, aktiven) overriding system value values
  (-916001, 'test-trgovina', 'Test', 'Test', 'dodatki', true),
  (-916002, 'test-trgovina-skrit', 'Skrit', 'Hidden', 'dodatki', false);
insert into trgovina.razlicice(id, izdelek_id, oznaka_sl, oznaka_en, sku, cena, zaloga) overriding system value values
  (-916001, -916001, 'Ena', 'One', 'TEST-TRG-1', 1000, 2),
  (-916002, -916002, 'Ena', 'One', 'TEST-TRG-2', 1000, 5),
  (-916003, -916001, 'Dva', 'Two', 'TEST-TRG-3', 1000, 20);

set local role anon;
select pg_temp.zavrnjeno('trgovina: anon ne bere izdelkov', $$select * from trgovina.izdelki$$);
select pg_temp.zavrnjeno('trgovina: anon ne bere razlicic', $$select * from trgovina.razlicice$$);
select pg_temp.zavrnjeno('trgovina: anon ne bere narocil', $$select * from trgovina.narocila$$);
select pg_temp.zavrnjeno('trgovina: anon ne rezervira (shema)',
  $$select trgovina.rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', null, 'sl', current_setting('test.odj'))$$);
select pg_temp.zavrnjeno('trgovina: anon ne placa (shema)',
  $$select trgovina.iz_placila('x', null, null, null, null, 0, 0, 0, 0, null)$$);
select pg_temp.zavrnjeno('trgovina: anon ne izteka (shema)', $$select trgovina.potekla('x')$$);
select pg_temp.zavrnjeno('trgovina: anon ne veze seje (shema)', $$select trgovina.vezi_sejo(1, 'x')$$);
select pg_temp.zavrnjeno('trgovina: anon ne sprosti (shema)', $$select trgovina.sprosti(1)$$);
select pg_temp.zavrnjeno('trgovina: anon ne rezervira',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', null, 'sl', current_setting('test.odj'))$$);
select pg_temp.zavrnjeno('trgovina: anon ne veze seje', $$select trgovina_vezi_sejo(1, 'x')$$);
select pg_temp.zavrnjeno('trgovina: anon ne sprosti', $$select trgovina_sprosti(1)$$);
select pg_temp.zavrnjeno('trgovina: anon ne placa',
  $$select trgovina_iz_placila('x', null, null, null, null, 0, 0, 0, 0, null)$$);
select pg_temp.zavrnjeno('trgovina: anon ne izteka', $$select trgovina_potekla('x')$$);
select pg_temp.zavrnjeno('trgovina: anon ne bere narocila za posto', $$select trgovina_narocilo_za_posto(1)$$);
select pg_temp.zavrnjeno('trgovina: anon ne isce narocila seje', $$select trgovina_narocilo_seje('x', null, 'x')$$);
select pg_temp.zavrnjeno('trgovina: anon ne pocisti', $$select trgovina.pocisti()$$);
select set_config('test.trgovina_katalog', trgovina_katalog()::text, true);
select pg_temp.preveri('trgovina: katalog pokaze aktiven izdelek z oceno zaloge',
  current_setting('test.trgovina_katalog')::jsonb @> '[{"slug":"test-trgovina","na_voljo":"da","cena_od":1000}]');
select pg_temp.preveri('trgovina: izdelek brez stevil zaloge',
  trgovina_izdelek('test-trgovina')->'razlicice' @> '[{"oznaka_sl":"Ena","na_voljo":"malo"}]'
  and trgovina_izdelek('test-trgovina')::text not like '%zaloga%');
select pg_temp.preveri('trgovina: neaktiven izdelek je skrit', trgovina_izdelek('test-trgovina-skrit') is null);
reset role;
select pg_temp.preveri('trgovina: katalog le aktivni izdelki in brez kljuca zaloga',
  current_setting('test.trgovina_katalog') not like '%zaloga%'
  and not exists (select 1 from jsonb_array_elements(current_setting('test.trgovina_katalog')::jsonb) e
                   left join trgovina.izdelki i on i.slug = e->>'slug'
                   where i.aktiven is not true));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('trgovina: uporabnik ne rezervira mimo servisa',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', auth.uid(), 'sl', current_setting('test.odj'))$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne sprosti mimo servisa', $$select trgovina_sprosti(1)$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne placa mimo servisa',
  $$select trgovina_iz_placila('x', null, null, null, null, 0, 0, 0, 0, null)$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne bere narocila za posto', $$select trgovina_narocilo_za_posto(1)$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne vidi narocil za pakiranje', $$select trgovina_admin_narocila()$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne oznaci poslano', $$select trgovina_admin_poslano(1, 'RR1SI')$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne ureja izdelkov',
  $$select trgovina_admin_shrani_izdelek('{"id":-916001,"aktiven":false}')$$);
select pg_temp.zavrnjeno('trgovina: uporabnik ne ureja razlicic',
  $$select trgovina_admin_shrani_razlicico('{"id":-916001,"zaloga_dodaj":99}')$$);
reset role;

-- Servis: rezervacija ne preseže zaloge, potekla jo sprosti.
grant select, insert on izidi to service_role;
grant execute on function pg_temp.preveri(text, boolean), pg_temp.napaka(text, text, text) to service_role;
set local role service_role;
select set_config('test.trg1r', trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":2}]',
  'b8a06635-2322-4444-8c42-44e419f912ab', 'sl', current_setting('test.odj'))::text, true);
select set_config('test.trg1', current_setting('test.trg1r')::jsonb->>'narocilo_id', true);
select pg_temp.preveri('trgovina: rezervacija drzi 35 minut in to pove',
  (current_setting('test.trg1r')::jsonb->>'rezervirano_do')::timestamptz = now() + interval '35 minutes');
select trgovina_vezi_sejo(current_setting('test.trg1')::bigint, 'cs_test_trgovina_1');
select pg_temp.napaka('trgovina: seja se ne veze dvakrat',
  format('select trgovina_vezi_sejo(%s, %L)', current_setting('test.trg1'), 'cs_test_trgovina_1b'), 'trgovina-stanje');
select pg_temp.napaka('trgovina: rezervacija ne preseze zaloge',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', null, 'sl', current_setting('test.odj'))$$, 'trgovina-zaloga');
select pg_temp.napaka('trgovina: kolicina 0 je neveljavna',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":0}]', null, 'sl', current_setting('test.odj'))$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina: id izven bigint je neveljaven',
  $$select trgovina_rezerviraj('[{"razlicica_id":1e20,"kolicina":1}]', null, 'sl', current_setting('test.odj'))$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina: odjemalec mora biti sha256',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', null, 'sl', '1.2.3.4')$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina: podvojena vrstica je neveljavna',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1},{"razlicica_id":-916001,"kolicina":1}]', null, 'sl', current_setting('test.odj'))$$,
  'trgovina-vnos');
select pg_temp.napaka('trgovina: neaktiven izdelek se ne proda',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916002,"kolicina":1}]', null, 'sl', current_setting('test.odj'))$$, 'trgovina-vnos');
select pg_temp.preveri('trgovina: potekla seja sprosti rezervacijo', trgovina_potekla('cs_test_trgovina_1') = 'poteklo');
select pg_temp.napaka('trgovina: poteklo narocilo ne dobi seje',
  format('select trgovina_vezi_sejo(%s, %L)', current_setting('test.trg1'), 'cs_test_trgovina_1c'), 'trgovina-stanje');
select set_config('test.trg2', (trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]',
  'b8a06635-2322-4444-8c42-44e419f912ab', 'en', current_setting('test.odj'))->>'narocilo_id'), true);
select pg_temp.preveri('trgovina: po sprostitvi je rezervacija spet mogoca', current_setting('test.trg2') <> '');
select trgovina_vezi_sejo(current_setting('test.trg2')::bigint, 'cs_test_trgovina_2');
select pg_temp.preveri('trgovina: placilo oznaci placano',
  trgovina_iz_placila('cs_test_trgovina_2', 'pi_test', 'kupec@example.invalid', 'Kupec', '{"country":"SI"}',
                      1000, 390, 250, 1390, 'paket_si') = 'placano');
select pg_temp.preveri('trgovina: ponovljen dogodek placila je ze',
  trgovina_iz_placila('cs_test_trgovina_2', 'pi_test', 'kupec@example.invalid', 'Kupec', '{"country":"SI"}',
                      1000, 390, 250, 1390, 'paket_si') = 'ze');
select pg_temp.preveri('trgovina: neznana seja', trgovina_iz_placila('cs_ni', null, null, null, null, 0, 0, 0, 0, null) = 'neznano');
reset role;
select pg_temp.preveri('trgovina: zaloga odsteta enkrat', (select zaloga = 1 from trgovina.razlicice where id = -916001));
select pg_temp.preveri('trgovina: placilo pobrise odjemalca',
  (select odjemalec is null and manjka = 0 from trgovina.narocila where id = current_setting('test.trg2')::bigint));

-- Rezervacija poteče po času: zaloga je spet na voljo, pozno plačilo še velja.
set local role service_role;
select set_config('test.trg3', (trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', null, 'sl',
  current_setting('test.odj'))->>'narocilo_id'), true);
select trgovina_vezi_sejo(current_setting('test.trg3')::bigint, 'cs_test_trgovina_3');
reset role;
select pg_temp.preveri('trgovina: rezervacija drzi zadnji kos',
  (select na_voljo = 0 from trgovina.razpolozljivo where razlicica_id = -916001));
update trgovina.narocila set rezervirano_do = now() - interval '1 minute' where id = current_setting('test.trg3')::bigint;
select pg_temp.preveri('trgovina: potekla rezervacija sprosti zalogo',
  (select na_voljo = 1 from trgovina.razpolozljivo where razlicica_id = -916001));
set local role service_role;
select pg_temp.preveri('trgovina: pozno placilo potekle rezervacije velja',
  trgovina_iz_placila('cs_test_trgovina_3', 'pi_test3', 'tretji@example.invalid', 'Tretji', '{}', 1000, 390, 250, 1390, 'paket_si') = 'placano');
reset role;
select pg_temp.preveri('trgovina: pozno placilo odsteje zalogo',
  (select zaloga = 0 from trgovina.razlicice where id = -916001));

-- Zaloga medtem pade: plačilo velja, a 'premalo' in manjka se zapiše.
update trgovina.razlicice set zaloga = 1 where id = -916001;
set local role service_role;
select set_config('test.trg4', (trgovina_rezerviraj('[{"razlicica_id":-916001,"kolicina":1}]', null, 'sl',
  current_setting('test.odj'))->>'narocilo_id'), true);
select trgovina_vezi_sejo(current_setting('test.trg4')::bigint, 'cs_test_trgovina_4');
reset role;
update trgovina.razlicice set zaloga = 0 where id = -916001;
set local role service_role;
select pg_temp.preveri('trgovina: placilo brez zaloge je premalo',
  trgovina_iz_placila('cs_test_trgovina_4', 'pi_test4', 'drugi@example.invalid', 'Drugi', '{}', 1000, 390, 250, 1390, 'paket_si') = 'premalo');
select pg_temp.preveri('trgovina: servis bere narocilo za posto',
  trgovina_narocilo_za_posto(current_setting('test.trg2')::bigint)->>'jezik' = 'en');
reset role;
select pg_temp.preveri('trgovina: zaloga ne gre pod nic', (select zaloga = 0 from trgovina.razlicice where id = -916001));

-- Omejitev: največ 5 odprtih naročil na gosta (odjemalec) ali uporabnika.
set local role service_role;
select set_config('test.odj_m', encode(sha256('test-odjemalec-m'), 'hex'), true);
select set_config('test.trg_m', (trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', null, 'sl',
  current_setting('test.odj_m'))->>'narocilo_id'), true);
select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', null, 'sl', current_setting('test.odj_m'))
  from generate_series(1, 4);
select pg_temp.napaka('trgovina: sesto odprto narocilo gosta je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', null, 'sl', current_setting('test.odj_m'))$$,
  'trgovina-omejitev');
select pg_temp.preveri('trgovina: prijavljen z istim IP ni omejen z gosti',
  trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', 'b8a06635-2322-4444-8c42-44e419f912ad', 'sl',
    current_setting('test.odj_m')) ? 'narocilo_id');
select pg_temp.preveri('trgovina: sprosti odpre narocilo', trgovina_sprosti(current_setting('test.trg_m')::bigint) = 'poteklo');
select pg_temp.preveri('trgovina: sprosti dvakrat je ze', trgovina_sprosti(current_setting('test.trg_m')::bigint) = 'ze');
select pg_temp.preveri('trgovina: po sprostitvi odjemalec spet narocuje',
  trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', null, 'sl', current_setting('test.odj_m')) ? 'narocilo_id');
select set_config('test.trg_u', (trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]',
  'b8a06635-2322-4444-8c42-44e419f912ab', 'sl', encode(sha256('u1'), 'hex'))->>'narocilo_id'), true);
select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]',
  'b8a06635-2322-4444-8c42-44e419f912ab', 'sl', encode(sha256(('u' || g)::bytea), 'hex')) from generate_series(2, 5) g;
select pg_temp.napaka('trgovina: sesto odprto narocilo uporabnika je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', 'b8a06635-2322-4444-8c42-44e419f912ab', 'sl', encode(sha256('u6'), 'hex'))$$,
  'trgovina-omejitev');
select trgovina_vezi_sejo(current_setting('test.trg_u')::bigint, 'cs_test_trgovina_u');
select pg_temp.preveri('trgovina: lastnik najde svojo prejsnjo sejo',
  trgovina_narocilo_seje('cs_test_trgovina_u', 'b8a06635-2322-4444-8c42-44e419f912ab', encode(sha256('drug'), 'hex'))
    = jsonb_build_object('id', current_setting('test.trg_u')::bigint, 'stanje', 'caka_placilo'));
select pg_temp.preveri('trgovina: tujec ne najde tuje seje',
  trgovina_narocilo_seje('cs_test_trgovina_u', 'b8a06635-2322-4444-8c42-44e419f912ac', encode(sha256('u1'), 'hex')) is null
  and trgovina_narocilo_seje('cs_test_trgovina_u', null, encode(sha256('drug'), 'hex')) is null);
reset role;
update trgovina.narocila set rezervirano_do = now() - interval '1 minute' where id = current_setting('test.trg_u')::bigint;
set local role service_role;
select pg_temp.preveri('trgovina: potekla rezervacija ne steje v omejitev',
  trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', 'b8a06635-2322-4444-8c42-44e419f912ab', 'sl',
    encode(sha256('u6'), 'hex')) ? 'narocilo_id');
reset role;
select pg_temp.preveri('trgovina: sveze poteklo narocilo pocisti se ne dotakne',
  (select stanje = 'caka_placilo' from trgovina.narocila where id = current_setting('test.trg_u')::bigint));
update trgovina.narocila set rezervirano_do = now() - interval '61 minutes' where id = current_setting('test.trg_u')::bigint;
set local role service_role;
select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', null, 'sl', encode(sha256('pocisti'), 'hex'));
reset role;
select pg_temp.preveri('trgovina: rezervacija pocisti zastarela narocila',
  (select stanje = 'poteklo' and odjemalec is null from trgovina.narocila where id = current_setting('test.trg_u')::bigint));

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.preveri('trgovina: kupec vidi svoje placano narocilo, ne poteklega',
  (select count(*) = 1 and bool_and((e->>'id')::bigint = current_setting('test.trg2')::bigint and not e ? 'manjka')
     from jsonb_array_elements(trgovina_moja_narocila()) e));
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ac',true);
set local role authenticated;
select pg_temp.preveri('trgovina: tujec ne vidi tujih narocil', trgovina_moja_narocila() = '[]'::jsonb);
reset role;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('trgovina: admin vidi narocila za pakiranje',
  trgovina_admin_narocila() @> jsonb_build_array(jsonb_build_object('id', current_setting('test.trg2')::bigint, 'manjka', 0)));
select pg_temp.preveri('trgovina: admin vidi, koliko manjka',
  trgovina_admin_narocilo(current_setting('test.trg4')::bigint)->>'manjka' = '1');
select pg_temp.preveri('trgovina: admin bere narocilo s postavkami',
  jsonb_array_length(trgovina_admin_narocilo(current_setting('test.trg2')::bigint)->'postavke') = 1);
select pg_temp.preveri('trgovina: admin bere narocilo za posto',
  trgovina_narocilo_za_posto(current_setting('test.trg2')::bigint)->>'email' = 'kupec@example.invalid');
select pg_temp.preveri('trgovina: admin oznaci poslano',
  trgovina_admin_poslano(current_setting('test.trg2')::bigint, ' RR123SI ')->>'sledilna' = 'RR123SI');
select pg_temp.napaka('trgovina: poteklo narocilo ni za posiljanje',
  format('select trgovina_admin_poslano(%s, %L)', current_setting('test.trg1'), 'RR1SI'), 'trgovina-stanje');
select pg_temp.preveri('trgovina: admin vidi zalogo',
  trgovina_admin_izdelki() @> '[{"id":-916001,"razlicice":[{"id":-916001,"zaloga":0}]}]');
select set_config('test.trg_izd', trgovina_admin_shrani_izdelek(
  '{"slug":"test-trgovina-nov","ime_sl":"Nov","ime_en":"New","kategorija":"dom"}')::text, true);
select trgovina_admin_shrani_izdelek(jsonb_build_object('id', current_setting('test.trg_izd')::bigint, 'ime_en', 'New 2'));
select pg_temp.preveri('trgovina: admin doda in delno popravi izdelek',
  trgovina_admin_izdelki() @> jsonb_build_array(jsonb_build_object('slug', 'test-trgovina-nov', 'ime_sl', 'Nov',
    'ime_en', 'New 2', 'aktiven', false, 'opis_sl', '')));
select set_config('test.trg_raz', trgovina_admin_shrani_razlicico(jsonb_build_object('izdelek_id', current_setting('test.trg_izd')::bigint,
  'oznaka_sl', 'Ena', 'oznaka_en', 'One', 'sku', 'TEST-TRG-NOV', 'cena', 500, 'zaloga', 7))::text, true);
select pg_temp.preveri('trgovina: admin doda razlicico',
  trgovina_admin_izdelki() @> '[{"slug":"test-trgovina-nov","razlicice":[{"sku":"TEST-TRG-NOV","zaloga":7,"na_voljo":7,"aktivna":true}]}]');
select trgovina_admin_shrani_razlicico(jsonb_build_object('id', current_setting('test.trg_raz')::bigint, 'zaloga_dodaj', -3, 'cena', 600));
select pg_temp.preveri('trgovina: admin zalogo spremeni za razliko',
  trgovina_admin_izdelki() @> '[{"slug":"test-trgovina-nov","razlicice":[{"sku":"TEST-TRG-NOV","zaloga":4,"cena":600}]}]');
select pg_temp.napaka('trgovina: zaloga_dodaj ne gre pod nic',
  format('select trgovina_admin_shrani_razlicico(%L)', jsonb_build_object('id', current_setting('test.trg_raz')::bigint, 'zaloga_dodaj', -5)),
  'trgovina-zaloga');
select pg_temp.napaka('trgovina: absolutna zaloga obstojece razlicice je zavrnjena',
  format('select trgovina_admin_shrani_razlicico(%L)', jsonb_build_object('id', current_setting('test.trg_raz')::bigint, 'zaloga', 99)),
  'trgovina-vnos');
select pg_temp.napaka('trgovina: zaloga_dodaj mora biti celo stevilo',
  format('select trgovina_admin_shrani_razlicico(%L)', jsonb_build_object('id', current_setting('test.trg_raz')::bigint, 'zaloga_dodaj', 1.5)),
  'trgovina-vnos');
select pg_temp.preveri('trgovina: zavrnjene spremembe zaloge ne pustijo sledi',
  trgovina_admin_izdelki() @> '[{"slug":"test-trgovina-nov","razlicice":[{"sku":"TEST-TRG-NOV","zaloga":4}]}]');
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Pozno plačilo za poteklo naročilo (webhook po izpadu) se zapiše; manjkajoče gre v manjka.
set local role service_role;
select pg_temp.preveri('trgovina: placilo za poteklo narocilo se zapise',
  trgovina_iz_placila('cs_test_trgovina_1', 'pi_test_1', 'pozni@example.invalid', 'Pozni', '{"country":"SI"}',
                      1000, 390, 250, 1390, 'paket_si') in ('placano', 'premalo'));
reset role;
select pg_temp.preveri('trgovina: pozno placano narocilo je placano',
  (select stanje = 'placano' from trgovina.narocila where stripe_checkout_id = 'cs_test_trgovina_1'));

-- --- Trgovina: vsa naročila in ročna stanja (20261019140000) -----------------
-- trg2 poslano, trg3 in trg4 plačano (pi_test3, pi_test4); trg5 čaka plačila.
set local role service_role;
select set_config('test.trg5', (trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1}]', null, 'sl',
  encode(sha256('trg5'), 'hex'))->>'narocilo_id'), true);
reset role;
select set_config('test.trg3_oznaka', (select javna_oznaka from trgovina.narocila where id = current_setting('test.trg3')::bigint), true);
select set_config('test.trg5_voljo', (select na_voljo::text from trgovina.razpolozljivo where razlicica_id = -916003), true);
set local role anon;
select pg_temp.zavrnjeno('trgovina4: anon ne vidi vseh narocil', $$select trgovina_admin_vsa_narocila()$$);
select pg_temp.zavrnjeno('trgovina4: anon ne spreminja stanja', $$select trgovina_admin_nastavi_stanje(1, 'preklicano')$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
select pg_temp.zavrnjeno('trgovina4: uporabnik ne vidi vseh narocil', $$select trgovina_admin_vsa_narocila()$$);
select pg_temp.zavrnjeno('trgovina4: uporabnik ne spreminja stanja',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg3'), 'v_izdelavi'));
reset role;
select pg_temp.preveri('trgovina4: zgodovina ni v API',
  not has_table_privilege('authenticated', 'trgovina.zgodovina_stanj', 'select')
  and not has_table_privilege('anon', 'trgovina.zgodovina_stanj', 'select'));
do $$
declare v_zavrnjeno boolean := false;
begin
  begin
    update trgovina.narocila set stanje = 'izgubljeno' where id = current_setting('test.trg3')::bigint;
  exception when check_violation then v_zavrnjeno := true;
  end;
  perform pg_temp.preveri('trgovina4: neznano stanje zavrne preverjanje', v_zavrnjeno);
end;
$$;

select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('trgovina4: placano -> v_izdelavi z opombo',
  trgovina_admin_nastavi_stanje(current_setting('test.trg3')::bigint, 'v_izdelavi', ' Tisk v torek ') @>
    '{"stanje":"v_izdelavi","vracilo_potrebno":false}');
select pg_temp.preveri('trgovina4: zgodovina zapise admina in opombo',
  trgovina_admin_narocilo(current_setting('test.trg3')::bigint)->'zgodovina' @>
    '[{"v":"placano"},{"iz":"placano","v":"v_izdelavi","admin_id":"b8a06635-2322-4444-8c42-44e419f912ad","opomba":"Tisk v torek"}]');
select pg_temp.preveri('trgovina4: podrobnosti s Stripe placilom',
  trgovina_admin_narocilo(current_setting('test.trg3')::bigint) @>
    '{"stripe_payment_intent":"pi_test3","stripe_checkout_id":"cs_test_trgovina_3"}');
select pg_temp.preveri('trgovina4: v_izdelavi -> placano (razveljavi)',
  trgovina_admin_nastavi_stanje(current_setting('test.trg3')::bigint, 'placano')->>'stanje' = 'placano');
select trgovina_admin_nastavi_stanje(current_setting('test.trg3')::bigint, 'v_izdelavi');
select pg_temp.napaka('trgovina4: poslano le s sledilno stevilko',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg3'), 'poslano'), 'trgovina-sledilna');
select pg_temp.napaka('trgovina4: v_izdelavi -> dostavljeno ni dovoljeno',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg3'), 'dostavljeno'), 'trgovina-prehod');
select pg_temp.napaka('trgovina4: poslano -> preklicano ni dovoljeno',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg2'), 'preklicano'), 'trgovina-prehod');
select pg_temp.napaka('trgovina4: prazno stanje ni dovoljeno',
  format('select trgovina_admin_nastavi_stanje(%s, null)', current_setting('test.trg3')), 'trgovina-prehod');
select pg_temp.preveri('trgovina4: v_izdelavi -> poslano s sledilno',
  trgovina_admin_poslano(current_setting('test.trg3')::bigint, 'RR9SI')->>'sledilna' = 'RR9SI');
select pg_temp.preveri('trgovina4: poslano -> dostavljeno',
  trgovina_admin_nastavi_stanje(current_setting('test.trg3')::bigint, 'dostavljeno')->>'stanje' = 'dostavljeno');
select pg_temp.napaka('trgovina4: dostavljeno -> placano ni dovoljeno',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg3'), 'placano'), 'trgovina-prehod');
-- Rep od prvega 'placano' (ali je trg3 prej potekel, je stvar starejših testov).
select pg_temp.preveri('trgovina4: zgodovina vseh prehodov',
  (with z as (select e->>'v' as v, i from jsonb_array_elements(trgovina_admin_narocilo(current_setting('test.trg3')::bigint)->'zgodovina')
                with ordinality x(e, i))
   select jsonb_agg(v order by i) from z where i >= (select min(i) from z where v = 'placano'))
    = '["placano","v_izdelavi","placano","v_izdelavi","poslano","dostavljeno"]');
select pg_temp.preveri('trgovina4: preklic placanega zahteva vracilo',
  trgovina_admin_nastavi_stanje(current_setting('test.trg4')::bigint, 'preklicano', 'kupec si je premislil') @>
    '{"stanje":"preklicano","vracilo_potrebno":true}');
select pg_temp.napaka('trgovina4: cakajocega ni mogoce preklicati (rezervacija poteče sama)',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg5'), 'preklicano'), 'trgovina-prehod');
select pg_temp.napaka('trgovina4: preklicano -> placano ni dovoljeno',
  format('select trgovina_admin_nastavi_stanje(%s, %L)', current_setting('test.trg4'), 'placano'), 'trgovina-prehod');
select pg_temp.preveri('trgovina4: iskanje po oznaki',
  trgovina_admin_vsa_narocila(null, lower(current_setting('test.trg3_oznaka'))) @>
    jsonb_build_object('narocila', jsonb_build_array(jsonb_build_object('id', current_setting('test.trg3')::bigint)),
                       'stanja', jsonb_build_object('dostavljeno', 1)));
select pg_temp.preveri('trgovina4: iskanje po e-posti in filter stanja',
  (trgovina_admin_vsa_narocila('dostavljeno', 'TRETJI@example') ->> 'skupaj')::int = 1
  and (trgovina_admin_vsa_narocila('placano', 'tretji@example') ->> 'skupaj')::int = 0);
select pg_temp.preveri('trgovina4: % in _ v iskanju sta navadna znaka',
  (trgovina_admin_vsa_narocila(null, '%%_%') ->> 'skupaj')::int = 0);
-- Neodvisno od drugih naročil v bazi: velikost strani, odmik in padajoč vrstni red.
select pg_temp.preveri('trgovina4: stran in najnovejse najprej',
  (with v as (select trgovina_admin_vsa_narocila(null, null, 0, 3)->'narocila' as a)
   select jsonb_array_length(a) = 3
      and (a->0->>'created_at')::timestamptz >= (a->1->>'created_at')::timestamptz
      and (a->1->>'created_at')::timestamptz >= (a->2->>'created_at')::timestamptz
      and trgovina_admin_vsa_narocila(null, null, 0, 1)->'narocila'->0->'id' = a->0->'id'
      and trgovina_admin_vsa_narocila(null, null, 1, 1)->'narocila'->0->'id' = a->1->'id'
     from v));
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('trgovina4: cakajoce narocilo drzi rezervacijo',
  (select stanje = 'caka_placilo' from trgovina.narocila where id = current_setting('test.trg5')::bigint)
  and (select na_voljo = current_setting('test.trg5_voljo')::int from trgovina.razpolozljivo where razlicica_id = -916003));

-- Mešano naročilo (blago + darilni bon), ki ga admin premakne v izdelavo ali je
-- že dostavljeno, preden webhook izda kode: bon se zabeleži, bon_poslan stanja ne spremeni.
insert into trgovina.izdelki(id, slug, ime_sl, ime_en, kategorija, aktiven, digitalni) overriding system value values
  (-916101, 'test-trg4-bon', 'Bon', 'Gift card', 'dodatki', true, true);
insert into trgovina.razlicice(id, izdelek_id, oznaka_sl, oznaka_en, sku, cena, zaloga) overriding system value values
  (-916101, -916101, '20 €', '€20', 'TEST-TRG4-BON', 2000, 0);
insert into trgovina.narocila(id, stanje, placano_at, stripe_checkout_id) overriding system value values
  (-916201, 'v_izdelavi', now(), 'cs_test_trg4_mesano1'), (-916202, 'dostavljeno', now(), 'cs_test_trg4_mesano2');
insert into trgovina.postavke(id, narocilo_id, razlicica_id, ime, cena, kolicina) overriding system value values
  (-916201, -916201, -916101, 'Bon', 2000, 1), (-916202, -916201, -916001, 'Test', 1000, 1),
  (-916203, -916202, -916101, 'Bon', 2000, 1), (-916204, -916202, -916001, 'Test', 1000, 1);
set local role service_role;
select pg_temp.preveri('trgovina4: bon za narocilo v izdelavi in dostavljeno se zabelezi',
  trgovina_zabelezi_bon(-916201, 1, repeat('a', 64), 'AAAA', now() + interval '1 year', 'promo_trg4_1') = 'zabelezeno'
  and trgovina_zabelezi_bon(-916203, 1, repeat('b', 64), 'BBBB', now() + interval '1 year', 'promo_trg4_2') = 'zabelezeno');
select trgovina_bon_poslan(-916201);
select trgovina_bon_poslan(-916202);
reset role;
select pg_temp.preveri('trgovina4: bon_poslan ohrani v_izdelavi in dostavljeno',
  (select bool_and(bon_mail_at is not null) and string_agg(stanje, ',' order by id) = 'dostavljeno,v_izdelavi'
     from trgovina.narocila where id in (-916201, -916202)));
set local role service_role;
select pg_temp.preveri('trgovina4: ponovljeno placilo dostavljenega je ze',
  trgovina_iz_placila('cs_test_trgovina_3', 'pi_test3', 'tretji@example.invalid', 'Tretji', '{}', 1000, 390, 250, 1390, 'paket_si') = 'ze');
select pg_temp.preveri('trgovina4: vracilo preklicanega placanega',
  trgovina_vracilo('pi_test4')->>'oznaka' is not null);
select pg_temp.preveri('trgovina4: vracilo dostavljenega',
  trgovina_vracilo('pi_test3')->>'oznaka' = current_setting('test.trg3_oznaka'));
reset role;
select pg_temp.preveri('trgovina4: vracilo premakne v vrnjeno',
  (select count(*) = 2 from trgovina.narocila where id in (current_setting('test.trg3')::bigint, current_setting('test.trg4')::bigint)
     and stanje = 'vrnjeno'));
select pg_temp.preveri('trgovina4: placilo in vracilo (servis) zapiseta zgodovino brez admina',
  exists (select 1 from trgovina.zgodovina_stanj where narocilo_id = current_setting('test.trg2')::bigint
            and iz = 'caka_placilo' and v = 'placano')
  and exists (select 1 from trgovina.zgodovina_stanj where narocilo_id = current_setting('test.trg4')::bigint
                and iz = 'preklicano' and v = 'vrnjeno' and admin_id is null));
select agent.uskladi_pravice();
select pg_temp.preveri('agent: ne bere opombe v zgodovini stanj, bere stanja',
  not has_column_privilege('agent_bralec', 'trgovina.zgodovina_stanj', 'opomba', 'select')
  and has_column_privilege('agent_bralec', 'trgovina.zgodovina_stanj', 'v', 'select'));

-- --- trgovina2: personalizacija, tisk, boni (20261018190000) ----------------
-- Vse preverjanje je v bazi: lastništvo ekipe, prvak, značka, filter
-- besedila, številka, doplačila. Po naročilu in digitalno ne štejeta zaloge.
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('f7a20000-0000-4000-8000-000000000001','trg2-k1@example.invalid','{"display_name":"TrgK1"}',now()-interval '2 days'),
 ('f7a20000-0000-4000-8000-000000000002','trg2-k2@example.invalid','{"display_name":"TrgK2"}',now()-interval '2 days'),
 ('f7a20000-0000-4000-8000-000000000003','trg2-k3@example.invalid','{"display_name":"TrgK3"}',now()-interval '2 days'),
 ('f7a20000-0000-4000-8000-000000000004','trg2-k4@example.invalid','{"display_name":"TrgK4"}',now()-interval '2 days'),
 ('f7a20000-0000-4000-8000-000000000005','trg2-k5@example.invalid','{"display_name":"TrgK5"}',now()-interval '2 days'),
 ('f7a20000-0000-4000-8000-000000000006','trg2-k6@example.invalid','{"display_name":"TrgK6"}',now()-interval '2 days'),
 ('f7a20000-0000-4000-8000-000000000007','trg2-k7@example.invalid','{"display_name":"TrgK7"}',now()-interval '2 days');
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-927001, 'test-trgovina2', 'Test trgovine 2', 'TTRG2', false, (select id from countries where code='SI'), 'mnzg');
insert into rounds(id,season,number,deadline_at,competition_id) overriding system value
values (-927001,'2025/26',1,now()-interval '200 days',-927001),
       (-927002,'2026/27',1,now()-interval '2 days',-927001);
insert into fantasy_teams(id,owner_id,name,competition_id,hisna,created_at) overriding system value
values (-927001,'f7a20000-0000-4000-8000-000000000001','Kranjski Tigri',-927001,false,now()-interval '300 days'),
       (-927002,'f7a20000-0000-4000-8000-000000000002','Druga ekipa',-927001,false,now()-interval '300 days'),
       (-927003,'f7a20000-0000-4000-8000-000000000003','Tretja ekipa',-927001,false,now()-interval '300 days'),
       (-927004,'f7a20000-0000-4000-8000-000000000004','Cetrta ekipa',-927001,false,now()-interval '300 days'),
       (-927005,'f7a20000-0000-4000-8000-000000000005','Hisna ekipa',-927001,true,now()-interval '300 days'),
       (-927006,'f7a20000-0000-4000-8000-000000000007','Pozni zmagovalec',-927001,false,now()-interval '300 days');
-- 2025/26 (končana pred 200 dnevi): K1 prvi med pravočasnimi, K7 (-927006) ima
-- več točk, a se je pridružil po sezoni. 2026/27 (teče): vodi K2.
insert into tocke_krogov(fantasy_team_id, round_id, points, transfers, penalty)
values (-927001,-927001,50,0,0),(-927002,-927001,40,0,0),(-927003,-927001,30,0,0),(-927004,-927001,20,0,0),
       (-927006,-927001,60,0,0),
       (-927001,-927002,1,0,0),(-927002,-927002,99,0,0),(-927003,-927002,1,0,0),(-927004,-927002,1,0,0);
-- -927003 je nastala po koncu sezone: brez prvaka, čeprav ima 4 ekipe.
insert into mini_lige(id, name, code, owner_id, created_at) overriding system value
values (-927001, 'Prvaki', 'PRVAKI927', 'f7a20000-0000-4000-8000-000000000001', now()-interval '300 days'),
       (-927002, 'Mala', 'MALA927', 'f7a20000-0000-4000-8000-000000000001', now()-interval '300 days'),
       (-927003, 'Pozna', 'POZNA927', 'f7a20000-0000-4000-8000-000000000001', now()-interval '150 days');
insert into mini_liga_clani(mini_liga_id, fantasy_team_id, joined_at)
values (-927001,-927001,now()-interval '300 days'),(-927001,-927002,now()-interval '300 days'),
       (-927001,-927003,now()-interval '300 days'),(-927001,-927004,now()-interval '300 days'),
       (-927001,-927006,now()-interval '210 days'),
       (-927002,-927001,now()-interval '300 days'),(-927002,-927002,now()-interval '300 days'),
       (-927002,-927003,now()-interval '300 days'),
       (-927003,-927001,now()-interval '150 days'),(-927003,-927002,now()-interval '150 days'),
       (-927003,-927003,now()-interval '150 days'),(-927003,-927004,now()-interval '150 days');
update settings set value = '2' where key = 'preverjeni_racuni';
-- K6 ima doživljenjsko preverjenost, K7 letno.
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-927001, -913001, -913001, 'Ana', 'Test', 'Ana Test', 'MID', 'admin', 6, 6, true),
       (-927002, -913001, -913001, 'Bor', 'Test', 'Bor Test', 'MID', 'admin', 6, 6, true);
insert into zahtevki_igralca(player_id, user_id, status, potrdil, decided_at) values
 (-927001, 'f7a20000-0000-4000-8000-000000000006', 'potrjen', 'admin', now()),
 (-927002, 'f7a20000-0000-4000-8000-000000000007', 'potrjen', 'admin', now());
insert into preverjeni_racuni(user_id, player_id, vir, velja_do, star_vsaj_18, odpoved_pravici) values
 ('f7a20000-0000-4000-8000-000000000006', -927001, 'dozivljenjska', null, true, true),
 ('f7a20000-0000-4000-8000-000000000007', -927002, 'letna', now() + interval '1 year', true, true);

insert into trgovina.izdelki(id, slug, ime_sl, ime_en, kategorija, aktiven, po_narocilu, digitalni, pismo) overriding system value values
  (-927101, 'test-trg2-ekipa', 'Majica ekipe', 'Team shirt', 'oblacila', true, true, false, false),
  (-927102, 'test-trg2-ime', 'Skodelica z imenom', 'Name mug', 'dom', true, true, false, false),
  (-927103, 'test-trg2-prvak', 'Skodelica prvaka', 'Champion mug', 'dom', true, true, false, false),
  (-927104, 'test-trg2-znacka', 'Značka', 'Badge', 'dodatki', true, true, false, true),
  (-927105, 'test-trg2-bon', 'Darilni bon', 'Gift card', 'dodatki', true, false, true, false);
insert into trgovina.razlicice(id, izdelek_id, oznaka_sl, oznaka_en, sku, cena, zaloga) overriding system value values
  (-927101, -927101, 'M', 'M', 'TEST-TRG2-1', 2500, 0),
  (-927102, -927102, '330 ml', '330 ml', 'TEST-TRG2-2', 1200, 0),
  (-927103, -927103, '330 ml', '330 ml', 'TEST-TRG2-3', 1200, 0),
  (-927104, -927104, 'Ena', 'One', 'TEST-TRG2-4', 500, 0),
  (-927105, -927105, '20 €', '€20', 'TEST-TRG2-5', 2000, 0);
insert into trgovina.personalizacije(izdelek_id, vrsta, doplacilo, obvezna) values
  (-927101, 'ime_ekipe', 500, true), (-927101, 'stevilka', 300, false),
  (-927102, 'poljubno_ime', 500, true),
  (-927103, 'prvak', 0, true),
  (-927104, 'znacka', 0, true);

set local role anon;
select pg_temp.zavrnjeno('trgovina2: anon ne bere personalizacij', $$select * from trgovina.personalizacije$$);
select pg_temp.zavrnjeno('trgovina2: anon ne bere serij', $$select * from trgovina.serije$$);
select pg_temp.zavrnjeno('trgovina2: anon ne bere bonov', $$select * from trgovina.boni$$);
select pg_temp.zavrnjeno('trgovina2: anon ne vidi prvakov', $$select trgovina_moji_prvaki()$$);
select pg_temp.zavrnjeno('trgovina2: anon ne vidi znacke', $$select trgovina_moja_znacka()$$);
select pg_temp.zavrnjeno('trgovina2: anon ne zabelezi bona',
  $$select trgovina_zabelezi_bon(1, 1, repeat('a', 64), 'ABCD', now(), 'promo_x')$$);
select pg_temp.zavrnjeno('trgovina2: anon ne porabi bona', $$select trgovina_bon_porabljen('promo_x')$$);
select pg_temp.zavrnjeno('trgovina2: anon ne vrne placila', $$select trgovina_vracilo('pi_x')$$);
select pg_temp.zavrnjeno('trgovina2: anon ne oznaci maila bonov', $$select trgovina_bon_poslan(1)$$);
select pg_temp.zavrnjeno('trgovina2: anon ne klice prvakov v shemi',
  $$select * from trgovina.prvaki_uporabnika('f7a20000-0000-4000-8000-000000000001')$$);
select pg_temp.preveri('trgovina2: izdelek pove personalizacije in izdelavo po narocilu',
  trgovina_izdelek('test-trg2-ekipa') @> '{"po_narocilu":true,"digitalni":false,
     "personalizacije":[{"vrsta":"ime_ekipe","doplacilo":500,"obvezna":true},{"vrsta":"stevilka","doplacilo":300,"obvezna":false}],
     "razlicice":[{"na_voljo":"da"}]}');
select pg_temp.preveri('trgovina2: po narocilu in digitalno sta v katalogu na voljo brez zaloge',
  trgovina_katalog() @> '[{"slug":"test-trg2-ekipa","na_voljo":"da","po_narocilu":true},{"slug":"test-trg2-bon","na_voljo":"da","digitalni":true}]');
reset role;

select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: prvak koncane sezone z vsaj 4 ekipami',
  trgovina_moji_prvaki() @> '[{"mini_liga_id":-927001,"sezona":"2025/26","fantasy_team_id":-927001,"ime":"Prvaki"}]'
  and jsonb_array_length(trgovina_moji_prvaki()) = 1);
select pg_temp.preveri('trgovina2: brez preverjenosti ni znacke', trgovina_moja_znacka() is null);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne zabelezi bona',
  $$select trgovina_zabelezi_bon(1, 1, repeat('a', 64), 'ABCD', now(), 'promo_x')$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne porabi bona', $$select trgovina_bon_porabljen('promo_x')$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne vrne placila', $$select trgovina_vracilo('pi_x')$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne oznaci maila bonov', $$select trgovina_bon_poslan(1)$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne vidi za tisk', $$select trgovina_admin_za_tisk()$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne ustvari serije', $$select trgovina_admin_nova_serija('{1}')$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne bere serije', $$select trgovina_admin_serija(1)$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne vidi serij', $$select trgovina_admin_serije()$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne premakne serije', $$select trgovina_admin_serija_stanje(1, 'poslana')$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne vidi bonov', $$select trgovina_admin_boni()$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne bere promocij bonov narocila', $$select trgovina_boni_narocila(1)$$);
select pg_temp.zavrnjeno('trgovina2: uporabnik ne ureja doplacil',
  $$select trgovina_admin_shrani_personalizacijo(-927101, 'stevilka', 0, false)$$);
reset role;
select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: vodilni nekoncane sezone ni prvak', trgovina_moji_prvaki() = '[]'::jsonb);
reset role;
select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000006',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: dozivljenjsko preverjen lahko naroci znacko',
  trgovina_moja_znacka() = '{"player_id":-927001,"ime":"Ana Test"}'::jsonb);
reset role;
update settings set value = '1' where key = 'preverjeni_racuni';
set local role authenticated;
select pg_temp.preveri('trgovina2: stikalo 1 skrije znacko nepreizkusevalcu', trgovina_moja_znacka() is null);
reset role;
insert into testerji(user_id) values ('f7a20000-0000-4000-8000-000000000006');
set local role authenticated;
select pg_temp.preveri('trgovina2: stikalo 1 pokaze znacko preizkusevalcu', trgovina_moja_znacka() is not null);
reset role;
update settings set value = '0' where key = 'preverjeni_racuni';
set local role authenticated;
select pg_temp.preveri('trgovina2: stikalo 0 skrije znacko', trgovina_moja_znacka() is null);
reset role;
select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000007',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: letno preverjen ne naroci znacke', trgovina_moja_znacka() is null);
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Stikalo velja za kupca (p_user), ne za klicatelja (servis).
set local role service_role;
select pg_temp.napaka('trgovina2: stikalo 0 zavrne znacko tudi preizkusevalcu',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
reset role;
update settings set value = '1' where key = 'preverjeni_racuni';
set local role service_role;
select pg_temp.preveri('trgovina2: stikalo 1 dovoli znacko preizkusevalcu',
  (select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2s'), 'hex')) ? 'narocilo_id'));
reset role;
-- Odprta rezervacija bi blokirala spodnje preizkuse značke: počisti jo.
delete from trgovina.narocila where odjemalec = encode(sha256('t2s'), 'hex');
update settings set value = '2' where key = 'preverjeni_racuni';

set local role service_role;
select pg_temp.napaka('trgovina2: tuja ekipa za ime ekipe je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927002}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: hisna ekipa za ime ekipe je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927005}}]',
    'f7a20000-0000-4000-8000-000000000005', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: ime ekipe zahteva prijavo',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-prijava');
select pg_temp.napaka('trgovina2: obvezna personalizacija manjka',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: neznana moznost izdelka je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001,"poljubno_ime":"Ana"}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: izdelek brez moznosti ne sprejme personalizacije',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1,"personalizacija":{"stevilka":1}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: personalizacija mora biti objekt',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":"Ana"}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina2: stevilka 100 je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001,"stevilka":100}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: negativna stevilka je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001,"stevilka":-1}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: decimalna stevilka je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001,"stevilka":7.5}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: stevilka kot besedilo je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001,"stevilka":"7"}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: zaljivka v imenu je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Kurac"}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: rezervirano ime je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"S.L.F.F"}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: ime daljse od 12 znakov je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Abcdefghijklm"}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: prazno ime je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"   "}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: stevke in znaki v imenu so zavrnjeni',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Ana1"}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: oznake v imenu so zavrnjene',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"A<b>"}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: ime brez crke je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"..-"}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: prazna personalizacija je ista kot brez',
  $$select trgovina_rezerviraj('[{"razlicica_id":-916003,"kolicina":1},{"razlicica_id":-916003,"kolicina":1,"personalizacija":{}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
-- Ime ekipe: preimenovana ekipa gre skozi isti filter kot poljubno ime.
reset role;
update fantasy_teams set name = 'Kurac FC' where id = -927002;
set local role service_role;
select pg_temp.napaka('trgovina2: zaljivo ime ekipe je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927002}}]',
    'f7a20000-0000-4000-8000-000000000002', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
reset role;
update fantasy_teams set name = 'admin' where id = -927002;
set local role service_role;
select pg_temp.napaka('trgovina2: rezervirano ime ekipe je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927002}}]',
    'f7a20000-0000-4000-8000-000000000002', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
reset role;
update fantasy_teams set name = repeat('Dolgo ', 5) where id = -927002;
set local role service_role;
select pg_temp.napaka('trgovina2: ime ekipe daljse od 24 znakov je zavrnjeno',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927002}}]',
    'f7a20000-0000-4000-8000-000000000002', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
reset role;
update fantasy_teams set name = 'Druga ekipa' where id = -927002;
set local role service_role;

-- Svoja ekipa: doplačilo iz baze, ne iz vhoda; zaloga 0 ne ustavi izdelka po naročilu.
select set_config('test.trg2_e', trgovina_rezerviraj(
  '[{"razlicica_id":-927101,"kolicina":2,"cena":1,"doplacilo":0,"personalizacija":{"ime_ekipe":-927001,"stevilka":10}}]',
  'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2e'), 'hex'))::text, true);
select pg_temp.preveri('trgovina2: ime svoje ekipe s stevilko, doplacila iz baze',
  current_setting('test.trg2_e')::jsonb @> '{"personalizirano":true,"digitalno":false,
     "postavke":[{"razlicica_id":-927101,"cena":2500,"doplacilo":800,"kolicina":2,"opis":"Kranjski Tigri · 10"}]}');
select set_config('test.trg2_i', trgovina_rezerviraj(
  '[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"  Žan  Novak "}},
    {"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Eva-M."}}]',
  null, 'sl', encode(sha256('t2i'), 'hex'))::text, true);
select pg_temp.preveri('trgovina2: poljubno ime s sumniki, ista razlicica z drugim imenom',
  current_setting('test.trg2_i')::jsonb @> '{"postavke":[{"opis":"Žan Novak","doplacilo":500},{"opis":"Eva-M.","doplacilo":500}]}');
select pg_temp.napaka('trgovina2: ista razlicica z istim imenom je podvojena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Ana"}},
    {"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Ana"}}]', null, 'sl', encode(sha256('t2a'), 'hex'))$$,
  'trgovina-vnos');

-- Prvak: le lastnik prve ekipe končane sezone mini lige z vsaj 4 človeškimi ekipami.
select pg_temp.preveri('trgovina2: prvak dobi besedilo strezniku',
  trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2p'), 'hex'))
  @> '{"postavke":[{"opis":"Prvak mini lige Prvaki 2025/26","doplacilo":0}]}');
select pg_temp.preveri('trgovina2: prvak v anglescini',
  trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'en', encode(sha256('t2p'), 'hex'))
  @> '{"postavke":[{"opis":"Mini league champion Prvaki 2025/26"}]}');
select pg_temp.napaka('trgovina2: drugouvrsceni ni prvak',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000002', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: nekoncana sezona nima prvaka',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927001,"sezona":"2026/27"}}}]',
    'f7a20000-0000-4000-8000-000000000002', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: mini liga, nastala po sezoni, nima prvaka',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927003,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: pozno pridruzena ekipa ni prvak',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000007', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: mini liga s 3 ekipami nima prvaka',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927002,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: prvak zahteva prijavo',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}}}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-prijava');

-- Značka: le doživljenjsko preverjen, en kos, enkrat.
-- Ime mini lige gre skozi skupni filter, natisnjena vrstica ima največ 40 znakov.
reset role;
insert into mini_lige(id, name, code, owner_id, created_at) overriding system value
values (-927004, 'Kurac liga', 'ZALJIVA927', 'f7a20000-0000-4000-8000-000000000001', now()-interval '300 days'),
       (-927005, 'Zelo dolgo ime mini lige prijateljev', 'DOLGA927', 'f7a20000-0000-4000-8000-000000000001', now()-interval '300 days');
insert into mini_liga_clani(mini_liga_id, fantasy_team_id, joined_at)
select l, t, now()-interval '300 days'
  from unnest(array[-927004, -927005]) l, unnest(array[-927001, -927002, -927003, -927004]) t;
create function pg_temp.izid_brez_sledi(p_sql text) returns text
language plpgsql as $$
declare v text;
begin
  begin
    execute p_sql into v;
    raise exception using errcode = 'P9998', message = 'razveljavi';
  exception when sqlstate 'P9998' then null;
  end;
  return v;
end;
$$;
create function pg_temp.detail_napake(p_sql text) returns text
language plpgsql as $$
declare v text;
begin
  begin
    execute p_sql;
    raise exception using errcode = 'P9998', message = 'brez napake';
  exception when others then
    get stacked diagnostics v = pg_exception_detail;
  end;
  return v;
end;
$$;
grant execute on function pg_temp.izid_brez_sledi(text), pg_temp.detail_napake(text) to authenticated, service_role;
select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: prvak lige z zaljivim imenom ni ponujen, dolgo ime je skrajsano',
  not trgovina_moji_prvaki() @> '[{"mini_liga_id":-927004}]'
  and trgovina_moji_prvaki() @> '[{"mini_liga_id":-927005,"besedilo_sl":"Prvak mini lige Zelo dolgo ime… 2025/26",
                                   "besedilo_en":"Mini league champion Zelo dolgo… 2025/26"}]');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select pg_temp.napaka('trgovina2: zaljivo ime mini lige se ne natisne',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927004,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-besedilo');
select pg_temp.preveri('trgovina2: dolgo ime mini lige se skrajsa na 40 znakov',
  pg_temp.izid_brez_sledi($$select trgovina_rezerviraj('[{"razlicica_id":-927103,"kolicina":1,"personalizacija":{"prvak":{"mini_liga_id":-927005,"sezona":"2025/26"}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'en', encode(sha256('t2a'), 'hex'))->'postavke'->0->>'opis'$$)
  = 'Mini league champion Zelo dolgo… 2025/26');
select pg_temp.preveri('trgovina2: napaka personalizacije pove vrstico',
  pg_temp.detail_napake($$select trgovina_rezerviraj('[{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Ana"}},
    {"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Kurac"}}]', null, 'sl', encode(sha256('t2a'), 'hex'))$$)
  = 'postavka:1');

select pg_temp.napaka('trgovina2: znacka brez preverjenosti je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.napaka('trgovina2: znacka z letno preverjenostjo je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000007', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select pg_temp.preveri('trgovina2: znacka se omeji na en kos',
  pg_temp.izid_brez_sledi($$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":2,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2a'), 'hex'))->'postavke'->0->>'kolicina'$$) = '1');
select pg_temp.napaka('trgovina2: ime na znacki gre skozi filter',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{"ime":"admin"}}}]',
    'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select set_config('test.trg2_z', (trgovina_rezerviraj(
  '[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{"ime":"Ana T."}}}]',
  'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2z'), 'hex'))->>'narocilo_id'), true);
select pg_temp.napaka('trgovina2: znacka ne v dveh odprtih narocilih',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');
select trgovina_vezi_sejo(current_setting('test.trg2_z')::bigint, 'cs_test_trg2_z');
select pg_temp.preveri('trgovina2: placilo znacke',
  trgovina_iz_placila('cs_test_trg2_z', 'pi_trg2_z', 'ana@example.invalid', 'Ana Test',
    '{"name":"Ana Test","line1":"Ulica 1","postal_code":"4000","city":"Kranj","country":"SI"}', 500, 150, 90, 650, 'pismo_si') = 'placano');
select pg_temp.napaka('trgovina2: druga znacka je zavrnjena',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927104,"kolicina":1,"personalizacija":{"znacka":{}}}]',
    'f7a20000-0000-4000-8000-000000000006', 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-personalizacija');

-- Izdelek po naročilu: plačilo ne odšteje zaloge in gre v za_tisk.
select trgovina_vezi_sejo((current_setting('test.trg2_e')::jsonb->>'narocilo_id')::bigint, 'cs_test_trg2_e');
select pg_temp.preveri('trgovina2: placilo izdelka po narocilu',
  trgovina_iz_placila('cs_test_trg2_e', 'pi_trg2_e', 'k1@example.invalid', 'K1', '{"country":"SI"}',
                      6600, 390, 1190, 6990, 'paket_si') = 'placano');
-- Digitalno: gost, brez zaloge, brez tiska.
select set_config('test.trg2_b', trgovina_rezerviraj('[{"razlicica_id":-927105,"kolicina":2}]',
  null, 'en', encode(sha256('t2b'), 'hex'))::text, true);
select pg_temp.napaka('trgovina2: najvec 5 darilnih bonov na narocilo',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927105,"kolicina":4},{"razlicica_id":-927105,"kolicina":2,"personalizacija":null}]',
    null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina2: 6 bonov v eni postavki je zavrnjenih',
  $$select trgovina_rezerviraj('[{"razlicica_id":-927105,"kolicina":6}]', null, 'sl', encode(sha256('t2a'), 'hex'))$$, 'trgovina-vnos');
select pg_temp.preveri('trgovina2: darilni bon je digitalen', current_setting('test.trg2_b')::jsonb @> '{"digitalno":true,"personalizirano":false}');
select trgovina_vezi_sejo((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint, 'cs_test_trg2_b');
select pg_temp.preveri('trgovina2: placilo darilnega bona',
  trgovina_iz_placila('cs_test_trg2_b', 'pi_trg2_b', 'bon@example.invalid', 'Bon', null, 4000, 0, 0, 4000, null) = 'placano');
reset role;
select pg_temp.preveri('trgovina2: po narocilu in digitalno ne zmanjsata zaloge in nic ne manjka',
  (select bool_and(zaloga = 0) from trgovina.razlicice where id in (-927101, -927104, -927105))
  and (select bool_and(manjka = 0) from trgovina.narocila
        where stripe_checkout_id in ('cs_test_trg2_e', 'cs_test_trg2_b', 'cs_test_trg2_z')));
select pg_temp.preveri('trgovina2: narocilo samih znack je takoj poslano, ostala placana',
  (select stanje = 'poslano' and poslano_at is not null from trgovina.narocila where stripe_checkout_id = 'cs_test_trg2_z')
  and (select bool_and(stanje = 'placano') from trgovina.narocila where stripe_checkout_id in ('cs_test_trg2_e', 'cs_test_trg2_b')));
select pg_temp.preveri('trgovina2: personalizirana postavka je za tisk, znacka in bon nista',
  (select stanje_tiska = 'za_tisk' from trgovina.postavke where razlicica_id = -927101
     and narocilo_id = (current_setting('test.trg2_e')::jsonb->>'narocilo_id')::bigint)
  and (select stanje_tiska is null from trgovina.postavke where razlicica_id = -927104
         and narocilo_id = current_setting('test.trg2_z')::bigint)
  and (select bool_and(stanje_tiska is null) from trgovina.postavke where razlicica_id = -927105));
select pg_temp.preveri('trgovina2: placana znacka gre v narocila znack',
  (select count(*) = 1 and bool_and(ime_na_znacki = 'Ana T.' and player_id = -927001 and status = 'za_tisk'
             and naslov->>'city' = 'Kranj' and postnina = 'pismo_si'
             and user_id = 'f7a20000-0000-4000-8000-000000000006')
     from narocila_znack where stripe_checkout_id = 'cs_test_trg2_z'));
select set_config('test.trg2_bp', (select id::text from trgovina.postavke where razlicica_id = -927105
  and narocilo_id = (current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint), true);
select set_config('test.trg2_ep', (select id::text from trgovina.postavke where razlicica_id = -927101
  and narocilo_id = (current_setting('test.trg2_e')::jsonb->>'narocilo_id')::bigint), true);

select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000006',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: po narocilu znacke je ni vec', trgovina_moja_znacka() is null);
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Boni: enkrat na kos (ponovljen webhook je 'ze'), znesek iz postavke.
set local role service_role;
select pg_temp.preveri('trgovina2: bon se zabelezi',
  trgovina_zabelezi_bon(current_setting('test.trg2_bp')::bigint, 1, encode(sha256('SLFF-AAAA-AB12'), 'hex'), 'AB12',
                        now() + interval '1 year', 'promo_test_1') = 'zabelezeno');
select pg_temp.preveri('trgovina2: ponovljen webhook bona ne izda drugega',
  trgovina_zabelezi_bon(current_setting('test.trg2_bp')::bigint, 1, encode(sha256('SLFF-BBBB-CD34'), 'hex'), 'CD34',
                        now() + interval '1 year', 'promo_test_1b') = 'ze');
select pg_temp.preveri('trgovina2: drugi kos dobi svoj bon',
  trgovina_zabelezi_bon(current_setting('test.trg2_bp')::bigint, 2, encode(sha256('SLFF-CCCC-EF56'), 'hex'), 'EF56',
                        now() + interval '1 year', 'promo_test_2') = 'zabelezeno');
select pg_temp.napaka('trgovina2: bona ni vec kot kosov',
  format('select trgovina_zabelezi_bon(%s, 3, %L, %L, now(), %L)', current_setting('test.trg2_bp'),
         encode(sha256('x3'), 'hex'), 'GH78', 'promo_test_3'), 'trgovina-vnos');
select pg_temp.napaka('trgovina2: bon le za digitalno postavko',
  format('select trgovina_zabelezi_bon(%s, 1, %L, %L, now(), %L)', current_setting('test.trg2_ep'),
         encode(sha256('x4'), 'hex'), 'IJ90', 'promo_test_4'), 'trgovina-vnos');
select pg_temp.preveri('trgovina2: bon porabljen', trgovina_bon_porabljen('promo_test_1') = 'porabljen');
select pg_temp.preveri('trgovina2: bon porabljen dvakrat je ze', trgovina_bon_porabljen('promo_test_1') = 'ze');
select pg_temp.preveri('trgovina2: neznana promocija', trgovina_bon_porabljen('promo_ni') = 'neznano');
select pg_temp.preveri('trgovina2: narocilo za posto nosi bone in personalizacijo',
  trgovina_narocilo_za_posto((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint)
    @> '{"postavke":[{"digitalni":true,"boni":[{"zaporedje":1,"koda_konec":"AB12","znesek":2000},{"zaporedje":2,"koda_konec":"EF56"}]}]}'
  and trgovina_narocilo_za_posto((current_setting('test.trg2_e')::jsonb->>'narocilo_id')::bigint)
    @> '{"postavke":[{"po_narocilu":true,"doplacilo":800,"stanje_tiska":"za_tisk","personalizacija":{"ime":"Kranjski Tigri","stevilka":10}}]}');
select pg_temp.preveri('trgovina2: mail bonov se se ni poslal',
  trgovina_narocilo_za_posto((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint)->>'bon_mail_at' is null);
select trgovina_bon_poslan((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint);
select pg_temp.preveri('trgovina2: servis prebere promocije izdanih bonov',
  trgovina_boni_narocila((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint)
    @> '[{"zaporedje":1,"znesek":2000,"stripe_promocija":"promo_test_1"},{"zaporedje":2,"stripe_promocija":"promo_test_2"}]'
  and jsonb_array_length(trgovina_boni_narocila((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint)) = 2);
select pg_temp.preveri('trgovina2: mail bonov zabelezen, narocilo samih bonov je poslano',
  trgovina_narocilo_za_posto((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint)
    @> '{"stanje":"poslano"}'
  and trgovina_narocilo_za_posto((current_setting('test.trg2_b')::jsonb->>'narocilo_id')::bigint)->>'bon_mail_at' is not null);
reset role;
select pg_temp.preveri('trgovina2: koda bona ni shranjena v cistopisu',
  not exists (select 1 from trgovina.boni b where to_jsonb(b)::text like '%SLFF-%'));

-- Admin: za tisk → serija → poslana → natisnjena; doplačila ureja admin.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('trgovina2: admin vidi postavko za tisk, znacke ne',
  trgovina_admin_za_tisk() @> jsonb_build_array(jsonb_build_object('postavka_id', current_setting('test.trg2_ep')::bigint,
    'kolicina', 2, 'personalizacija', jsonb_build_object('ime', 'Kranjski Tigri')))
  and not trgovina_admin_za_tisk()::text like '%Ana T.%');
select pg_temp.napaka('trgovina2: prazna serija je zavrnjena', $$select trgovina_admin_nova_serija('{}')$$, 'trgovina-vnos');
select set_config('test.trg2_s', (trgovina_admin_nova_serija(array[current_setting('test.trg2_ep')::bigint])->>'id'), true);
select pg_temp.preveri('trgovina2: serija drzi postavko, za tisk je prazen',
  trgovina_admin_serija(current_setting('test.trg2_s')::bigint)
    @> jsonb_build_object('postavke', jsonb_build_array(jsonb_build_object('postavka_id', current_setting('test.trg2_ep')::bigint,
         'stanje_tiska', 'v_seriji')))
  and not trgovina_admin_za_tisk() @> jsonb_build_array(jsonb_build_object('postavka_id', current_setting('test.trg2_ep')::bigint)));
select pg_temp.napaka('trgovina2: postavka ne gre v dve seriji',
  format('select trgovina_admin_nova_serija(%L)', array[current_setting('test.trg2_ep')::bigint]), 'trgovina-stanje');
select pg_temp.preveri('trgovina2: serija poslana tiskarni',
  trgovina_admin_serija_stanje(current_setting('test.trg2_s')::bigint, 'poslana')->>'poslana_at' is not null);
select pg_temp.preveri('trgovina2: serija natisnjena premakne postavke',
  trgovina_admin_serija_stanje(current_setting('test.trg2_s')::bigint, 'natisnjena')
    @> '{"postavke":[{"stanje_tiska":"natisnjeno"}]}');
select pg_temp.napaka('trgovina2: neznano stanje serije',
  format('select trgovina_admin_serija_stanje(%s, %L)', current_setting('test.trg2_s'), 'x'), 'trgovina-vnos');
select pg_temp.preveri('trgovina2: admin vidi serije',
  trgovina_admin_serije() @> jsonb_build_array(jsonb_build_object('id', current_setting('test.trg2_s')::bigint, 'postavk', 1)));
select pg_temp.preveri('trgovina2: admin vidi bone brez kode',
  trgovina_admin_boni() @> '[{"koda_konec":"AB12","znesek":2000},{"koda_konec":"EF56"}]'
  and (select bool_and(e->>'porabljeno_at' is not null) from jsonb_array_elements(trgovina_admin_boni()) e where e->>'koda_konec' = 'AB12')
  and trgovina_admin_boni()::text not like '%koda_hash%');
select trgovina_admin_shrani_personalizacijo(-927101, 'stevilka', 400, false);
select pg_temp.preveri('trgovina2: admin spremeni doplacilo',
  trgovina_admin_izdelki() @> '[{"id":-927101,"po_narocilu":true,"personalizacije":[{"vrsta":"stevilka","doplacilo":400}]}]');
select trgovina_admin_shrani_izdelek('{"id":-927102,"po_narocilu":false}');
select pg_temp.preveri('trgovina2: admin preklopi izdelavo po narocilu',
  trgovina_admin_izdelki() @> '[{"id":-927102,"po_narocilu":false}]');
select pg_temp.napaka('trgovina2: neznana vrsta personalizacije',
  $$select trgovina_admin_shrani_personalizacijo(-927101, 'barva', 100, false)$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina2: digitalni izdelek nima personalizacije',
  $$select trgovina_admin_shrani_personalizacijo(-927105, 'poljubno_ime', 100, false)$$, 'trgovina-vnos');
select pg_temp.napaka('trgovina2: personaliziran izdelek ne postane digitalen',
  $$select trgovina_admin_shrani_izdelek('{"id":-927101,"digitalni":true}')$$, 'trgovina-vnos');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select pg_temp.preveri('trgovina2: novo doplacilo velja ob naslednji rezervaciji',
  trgovina_rezerviraj('[{"razlicica_id":-927101,"kolicina":1,"personalizacija":{"ime_ekipe":-927001,"stevilka":7}}]',
    'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t2n'), 'hex')) @> '{"postavke":[{"doplacilo":900}]}');

-- Mešana košarica: zaloga se odšteje le izdelku na zalogi.
reset role;
update trgovina.razlicice set zaloga = 100, aktivna = true where id = -916003;
update trgovina.izdelki set aktiven = true where id = -916001;
update trgovina.izdelki set po_narocilu = true where id = -927102;
set local role service_role;
select set_config('test.trg2_m', trgovina_rezerviraj(
  '[{"razlicica_id":-916003,"kolicina":1},{"razlicica_id":-927102,"kolicina":1,"personalizacija":{"poljubno_ime":"Mesano"}}]',
  null, 'sl', encode(sha256('t2m'), 'hex'))::text, true);
select trgovina_vezi_sejo((current_setting('test.trg2_m')::jsonb->>'narocilo_id')::bigint, 'cs_test_trg2_m');
select pg_temp.preveri('trgovina2: placilo mesane kosarice',
  trgovina_iz_placila('cs_test_trg2_m', 'pi_trg2_m', 'm@example.invalid', 'M', '{"country":"SI"}',
                      2700, 390, 560, 2790, 'paket_si', 300) = 'placano');
reset role;
select pg_temp.preveri('trgovina2: mesana kosarica odsteje le zalogo izdelka na zalogi',
  (select zaloga = 99 from trgovina.razlicice where id = -916003)
  and (select zaloga = 0 from trgovina.razlicice where id = -927102)
  and (select manjka = 0 and znesek_popust = 300 from trgovina.narocila where stripe_checkout_id = 'cs_test_trg2_m'));

-- Vračilo: naročilo vrnjeno, nenatisnjena značka preklicana, postavka iz tiska.
select set_config('test.trg2_zo', (select javna_oznaka from trgovina.narocila where stripe_checkout_id = 'cs_test_trg2_z'), true);
set local role service_role;
select pg_temp.preveri('trgovina2: vracilo znacke vrne oznako',
  trgovina_vracilo('pi_trg2_z') = jsonb_build_object('oznaka', current_setting('test.trg2_zo'), 'promocije', '[]'::jsonb));
select pg_temp.preveri('trgovina2: vracilo mesane kosarice', trgovina_vracilo('pi_trg2_m') is not null);
select pg_temp.preveri('trgovina2: ponovljeno vracilo je isto', trgovina_vracilo('pi_trg2_m') ? 'oznaka');
select pg_temp.preveri('trgovina2: vracilo neznanega placila', trgovina_vracilo('pi_ni') is null);
select pg_temp.preveri('trgovina2: vracilo natisnjenega pusti tisk',
  trgovina_vracilo('pi_trg2_e') is not null);
select pg_temp.preveri('trgovina2: vracilo bonov vrne promocijske kode za izklop',
  trgovina_vracilo('pi_trg2_b')->'promocije' = '["promo_test_1","promo_test_2"]'::jsonb);
reset role;
select pg_temp.preveri('trgovina2: vrnjena narocila in preklicana znacka',
  (select bool_and(stanje = 'vrnjeno') from trgovina.narocila where stripe_payment_intent in ('pi_trg2_z', 'pi_trg2_m', 'pi_trg2_e'))
  and (select bool_and(status = 'preklicano') from narocila_znack where stripe_checkout_id = 'cs_test_trg2_z'));
select pg_temp.preveri('trgovina2: vrnjena postavka ni vec za tisk, natisnjena ostane',
  (select stanje_tiska is null and serija_id is null from trgovina.postavke where razlicica_id = -927102
     and narocilo_id = (current_setting('test.trg2_m')::jsonb->>'narocilo_id')::bigint)
  and (select stanje_tiska = 'natisnjeno' from trgovina.postavke where id = current_setting('test.trg2_ep')::bigint));

-- --- trgovina3: motivi (20261019080000) -------------------------------------
-- Polja motiva preveri baza: vrsta, dolžina, filter, številka, leto, izbira,
-- shema, lastništvo ekipe, prvak; doplačilo iz motivi_izdelki.
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into trgovina.izdelki(id, slug, ime_sl, ime_en, kategorija, aktiven, po_narocilu, postopek) overriding system value values
  (-927201, 'test-trg3-majica', 'Majica po meri', 'Custom shirt', 'oblacila', true, true, 'dtf'),
  (-927202, 'test-trg3-drugo', 'Drug nosilec', 'Other carrier', 'oblacila', true, true, 'dtf');
insert into trgovina.razlicice(id, izdelek_id, oznaka_sl, oznaka_en, sku, cena, zaloga) overriding system value values
  (-927201, -927201, 'Črna / M', 'Black / M', 'TEST-TRG3-1', 2700, 0),
  (-927202, -927202, 'Črna / M', 'Black / M', 'TEST-TRG3-2', 2700, 0);
insert into trgovina.cone(izdelek_id, kljuc, barva, slika, koti, sirina_mm, visina_mm) values
  (-927201, 'hrbet', 'Črna', 'test.png', '[[0,0],[10,0],[10,10],[0,10]]', 300, 400);
insert into trgovina.motivi(id, slug, ime_sl, ime_en, cona, polja, sheme, aktiven) overriding system value values
  (-927201, 'test-motiv', 'Test motiv', 'Test design', 'hrbet',
   '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true},
     {"kljuc":"st","vrsta":"stevilka","oznaka_sl":"Št.","oznaka_en":"No.","obvezno":false},
     {"kljuc":"leto","vrsta":"leto","oznaka_sl":"Leto","oznaka_en":"Year","obvezno":false},
     {"kljuc":"slogan","vrsta":"izbira","oznaka_sl":"Slogan","oznaka_en":"Slogan","obvezno":false,"moznosti":["Samo še eno","Tretji polčas"]},
     {"kljuc":"ekipa","vrsta":"ekipa","oznaka_sl":"Ekipa","oznaka_en":"Team","max":24,"obvezno":false}]',
   '[{"kljuc":"klasika","ime_sl":"Klasika","ime_en":"Classic","barve":["#1E8C45","#F4F4F0"]}]', true),
  (-927202, 'test-motiv-prvak', 'Test prvak', 'Test champion', 'hrbet',
   '[{"kljuc":"prvak","vrsta":"prvak","oznaka_sl":"Prvak","oznaka_en":"Champion","obvezno":true}]',
   '[{"kljuc":"klasika","ime_sl":"Klasika","ime_en":"Classic","barve":["#1E8C45","#F4F4F0"]}]', true),
  (-927203, 'test-motiv-skrit', 'Skrit motiv', 'Hidden design', 'hrbet',
   '[{"kljuc":"ime","vrsta":"besedilo","oznaka_sl":"Ime","oznaka_en":"Name","max":12,"obvezno":true}]',
   '[{"kljuc":"klasika","ime_sl":"Klasika","ime_en":"Classic","barve":["#1E8C45","#F4F4F0"]}]', false);
insert into trgovina.motivi_izdelki(motiv_id, izdelek_id, doplacilo) values
  (-927201, -927201, 800), (-927202, -927201, 800), (-927203, -927201, 800);
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-927201, 'test-trg3-mladinci', 'Test mladinci', 'TTRG3M', false, (select id from countries where code='SI'), 'mnzg');
insert into fantasy_teams(id,owner_id,name,competition_id,hisna,created_at) overriding system value
values (-927211,'f7a20000-0000-4000-8000-000000000001','Mladi Tigri',-927201,false,now());
-- Napaka z namigom in besedilom (da test ne uspe zaradi druge napake z istim namigom).
create function pg_temp.napaka_sporocilo(p_opis text, p_sql text, p_hint text, p_vzorec text) returns void
language plpgsql as $$
declare v_hint text; v_msg text; v_ok boolean := false;
begin
  begin
    execute p_sql;
    raise exception using errcode = 'P9998', message = 'Napad je uspel';
  exception
    when sqlstate 'P9998' then null;
    when others then
      get stacked diagnostics v_hint = pg_exception_hint, v_msg = message_text;
      v_ok := v_hint = p_hint and v_msg like p_vzorec;
  end;
  perform pg_temp.preveri(p_opis, v_ok);
end;
$$;
grant execute on function pg_temp.napaka_sporocilo(text, text, text, text) to authenticated;

select pg_temp.napaka_sporocilo('trgovina3: neznano polje motiva',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","barva":"x"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%neznano polje%');
select pg_temp.napaka('trgovina3: neznan kljuc vhoda',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana"},"shema":"klasika","doplacilo":0}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka_sporocilo('trgovina3: obvezno polje manjka',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"st":9},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%polje ime je obvezno%');
select pg_temp.napaka_sporocilo('trgovina3: predolgo besedilo',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Abcdefghijklm"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%polju ime ni dovoljeno%');
select pg_temp.napaka('trgovina3: zaljivka',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Kurac"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka('trgovina3: nedovoljen znak',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"A<b>"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.preveri('trgovina3: besedilo sprejme stevke',
  (select p.personalizacija->'polja'->>'ime' = 'FC 1. maj'
     from trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"FC 1. maj"},"shema":"klasika"}', null, 'sl') p));
select pg_temp.napaka('trgovina3: stevke ne odprejo drugih znakov',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Bar #22"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka('trgovina3: same stevke niso besedilo',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"22"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka_sporocilo('trgovina3: stevilka 100',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","st":100},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%številka v polju st%');
select pg_temp.napaka('trgovina3: stevilka kot niz',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","st":"9"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka('trgovina3: leto 1900',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","leto":1900},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka('trgovina3: leto v prihodnosti',
  format($q$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","leto":%s},"shema":"klasika"}', null, 'sl')$q$,
         extract(year from now())::int + 1),
  'trgovina-personalizacija');
select pg_temp.napaka_sporocilo('trgovina3: izbira ni na seznamu',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","slogan":"Samo eno"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%ni na seznamu%');
select pg_temp.napaka_sporocilo('trgovina3: napacna shema',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana"},"shema":"nocna"}', null, 'sl')$$,
  'trgovina-personalizacija', '%barvna shema%');
select pg_temp.napaka('trgovina3: neaktiven motiv',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv-skrit","polja":{"ime":"Ana"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka_sporocilo('trgovina3: motiv ne velja za izdelek',
  $$select trgovina.personaliziraj(-927202, '{"motiv":"test-motiv","polja":{"ime":"Ana"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%ni na voljo za ta izdelek%');
select pg_temp.napaka_sporocilo('trgovina3: tuja ekipa',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","ekipa":-927002},"shema":"klasika"}',
    'f7a20000-0000-4000-8000-000000000001', 'sl')$$, 'trgovina-personalizacija', '%ni tvoja%');
select pg_temp.napaka_sporocilo('trgovina3: hisna ekipa',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","ekipa":-927005},"shema":"klasika"}',
    'f7a20000-0000-4000-8000-000000000005', 'sl')$$, 'trgovina-personalizacija', '%ni tvoja%');
select pg_temp.napaka_sporocilo('trgovina3: ekipa mladinske lige ni za motiv',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","ekipa":-927211},"shema":"klasika"}',
    'f7a20000-0000-4000-8000-000000000001', 'sl')$$, 'trgovina-personalizacija', '%mladinske lige%');
select pg_temp.preveri('trgovina3: neobvezno polje iz presledkov je prazno',
  (select p.personalizacija->'polja' = '{"ime":"Ana"}'
     from trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","slogan":"   "},"shema":"klasika"}', null, 'sl') p));
select pg_temp.pade('trgovina3: koti cone so 4 pari stevil',
  $$insert into trgovina.cone(izdelek_id, kljuc, slika, koti, sirina_mm, visina_mm) values (-927202, 'prsi', '', '[1,2,3,4]', 90, 90)$$);
select pg_temp.pade('trgovina3: kot cone je par stevil',
  $$insert into trgovina.cone(izdelek_id, kljuc, slika, koti, sirina_mm, visina_mm) values (-927202, 'prsi', '', '[[0,0],[1,0],[1,"x"],[0,1]]', 90, 90)$$);
select pg_temp.napaka('trgovina3: ekipa zahteva prijavo',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv","polja":{"ime":"Ana","ekipa":-927001},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-prijava');
select pg_temp.napaka_sporocilo('trgovina3: prvak le za prvaka',
  $$select trgovina.personaliziraj(-927201, '{"motiv":"test-motiv-prvak","polja":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}},"shema":"klasika"}',
    'f7a20000-0000-4000-8000-000000000002', 'sl')$$, 'trgovina-personalizacija', '%nisi prvak%');
select pg_temp.napaka('trgovina3: nosilec motivov brez motiva se ne proda',
  $$select trgovina.personaliziraj(-927201, null, null, 'sl')$$, 'trgovina-personalizacija');
select pg_temp.preveri('trgovina3: prvak dobi besedilo strezniku',
  (select p.personalizacija @> '{"motiv":"test-motiv-prvak","polja":{"prvak":"Prvak mini lige Prvaki 2025/26"},
                                 "mini_liga_id":-927001,"sezona":"2025/26","fantasy_team_id":-927001}'
     from trgovina.personaliziraj(-927201, '{"motiv":"test-motiv-prvak","polja":{"prvak":{"mini_liga_id":-927001,"sezona":"2025/26"}},"shema":"klasika"}',
       'f7a20000-0000-4000-8000-000000000001', 'sl') p));
select pg_temp.preveri('trgovina3: stara oblika personalizacije ostane',
  (select p.personalizacija = '{"vrsta":"poljubno_ime","ime":"Ana"}' and p.doplacilo = 500
     from trgovina.personaliziraj(-927102, '{"poljubno_ime":"Ana"}', null, 'sl') p));

-- Veljaven motiv skozi rezervacijo: doplačilo iz baze, ne iz vhoda.
set local role service_role;
select set_config('test.trg3_r', trgovina_rezerviraj(
  '[{"razlicica_id":-927201,"kolicina":1,"cena":1,"doplacilo":1,
     "personalizacija":{"motiv":"test-motiv","polja":{"ime":"  Žan  Novak ","st":9,"leto":1998,"slogan":"Tretji polčas","ekipa":-927001},"shema":"klasika"}}]',
  'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t3a'), 'hex'))::text, true);
reset role;
select pg_temp.preveri('trgovina3: veljaven motiv, doplacilo iz baze',
  current_setting('test.trg3_r')::jsonb @> '{"personalizirano":true,"postavke":[{"cena":2700,"doplacilo":800,
     "opis":"Test motiv · Žan Novak · 9 · 1998 · Tretji polčas · Kranjski Tigri",
     "personalizacija":{"motiv":"test-motiv","shema":"klasika","fantasy_team_id":-927001,
       "polja":{"ime":"Žan Novak","st":9,"leto":1998,"slogan":"Tretji polčas","ekipa":"Kranjski Tigri"}}}]}');
select pg_temp.preveri('trgovina3: postavka shrani posnetek barv sheme in mer con',
  (select p.personalizacija @> '{"barve":["#1E8C45","#F4F4F0"],"cone":{"hrbet":{"sirina_mm":300,"visina_mm":400}}}'
     from trgovina.postavke p join trgovina.narocila n on n.id = p.narocilo_id
    where n.odjemalec = encode(sha256('t3a'), 'hex')));
update trgovina.motivi set sheme = '[{"kljuc":"klasika","ime_sl":"Klasika","ime_en":"Classic","barve":["#000000","#FFFFFF"]}]' where id = -927201;
update trgovina.cone set sirina_mm = 280 where izdelek_id = -927201 and kljuc = 'hrbet';
select pg_temp.preveri('trgovina3: sprememba sheme in cone po nakupu ne spremeni posnetka',
  (select p.personalizacija->'barve' = '["#1E8C45","#F4F4F0"]' and p.personalizacija #>> '{cone,hrbet,sirina_mm}' = '300'
     from trgovina.postavke p join trgovina.narocila n on n.id = p.narocilo_id
    where n.odjemalec = encode(sha256('t3a'), 'hex')));
update trgovina.motivi set sheme = '[{"kljuc":"klasika","ime_sl":"Klasika","ime_en":"Classic","barve":["#1E8C45","#F4F4F0"]}]' where id = -927201;
update trgovina.cone set sirina_mm = 300 where izdelek_id = -927201 and kljuc = 'hrbet';
delete from trgovina.narocila where odjemalec = encode(sha256('t3a'), 'hex');

set local role anon;
select pg_temp.zavrnjeno('trgovina3: anon ne bere motivov', $$select * from trgovina.motivi$$);
select pg_temp.zavrnjeno('trgovina3: anon ne bere con', $$select * from trgovina.cone$$);
select pg_temp.zavrnjeno('trgovina3: anon ne klice preverjanja motiva',
  $$select trgovina.personaliziraj_motiv(-927201, '{}', null, 'sl')$$);
select pg_temp.zavrnjeno('trgovina3: anon ne vidi admin motivov', $$select trgovina_admin_motivi()$$);
select pg_temp.zavrnjeno('trgovina3: anon ne ureja motivov', $$select trgovina_admin_shrani_motiv('{"id":-927203,"aktiven":true}')$$);
select pg_temp.preveri('trgovina3: javni motivi le aktivni, z izdelki, doplacili in conami',
  trgovina_motivi() @> '[{"slug":"test-motiv","izdelki":[{"slug":"test-trg3-majica","doplacilo":800,"postopek":"dtf",
     "cena_od":2700,"cone":[{"kljuc":"hrbet","barva":"Črna","sirina_mm":300}]}]}]'
  and not trgovina_motivi() @> '[{"slug":"test-motiv-skrit"}]'
  and not trgovina_motivi() @> '[{"slug":"retro-dres"}]');
select pg_temp.preveri('trgovina3: izdelek pove aktivne motive in cone',
  trgovina_izdelek('test-trg3-majica') @> '{"postopek":"dtf","motivi":[{"slug":"test-motiv","doplacilo":800}],
     "cone":[{"kljuc":"hrbet","barva":"Črna"}]}'
  and not trgovina_izdelek('test-trg3-majica') @> '{"motivi":[{"slug":"test-motiv-skrit"}]}');
reset role;

select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.zavrnjeno('trgovina3: uporabnik ne vidi admin motivov', $$select trgovina_admin_motivi()$$);
select pg_temp.zavrnjeno('trgovina3: uporabnik ne ureja motivov', $$select trgovina_admin_shrani_motiv('{"id":-927203,"aktiven":true}')$$);
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select trgovina_admin_shrani_motiv('{"id":-927201,"doplacila":[{"izdelek_id":-927201,"doplacilo":900},{"izdelek_id":-927202,"doplacilo":300}]}');
select pg_temp.preveri('trgovina3: admin spremeni doplacila motiva',
  trgovina_admin_motivi() @> '[{"id":-927201,"doplacila":[{"izdelek_id":-927201,"doplacilo":900},{"izdelek_id":-927202,"doplacilo":300}]}]'
  and trgovina_admin_motivi() @> '[{"slug":"retro-dres","aktiven":false}]');
select trgovina_admin_shrani_motiv('{"id":-927201,"aktiven":false,"doplacila":[{"izdelek_id":-927202,"doplacilo":null}]}');
select pg_temp.preveri('trgovina3: admin izklopi motiv in ga odstrani z izdelka',
  not trgovina_motivi() @> '[{"slug":"test-motiv"}]'
  and trgovina_admin_motivi() @> '[{"id":-927201,"aktiven":false,"doplacila":[{"izdelek_id":-927201,"doplacilo":900}]}]'
  and not trgovina_admin_motivi() @> '[{"id":-927201,"doplacila":[{"izdelek_id":-927202}]}]');
select pg_temp.napaka('trgovina3: admin ne nastavi negativnega doplacila',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"doplacila":[{"izdelek_id":-927201,"doplacilo":-1}]}')$$, 'trgovina-vnos');
select pg_temp.napaka_sporocilo('trgovina3: motiv le na nosilec s postopkom tiska',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"doplacila":[{"izdelek_id":-927102,"doplacilo":100}]}')$$,
  'trgovina-vnos', '%doplačilo motiva%');
reset role;
update trgovina.izdelki set postopek = null where id = -927202;
insert into trgovina.motivi_izdelki (motiv_id, izdelek_id, doplacilo) values (-927201, -927202, 300);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select trgovina_admin_shrani_motiv('{"id":-927201,"doplacila":[{"izdelek_id":-927202,"doplacilo":null}]}');
select pg_temp.preveri('trgovina3: motiv se odstrani tudi z izdelka, ki ni vec nosilec',
  not trgovina_admin_motivi() @> '[{"id":-927201,"doplacila":[{"izdelek_id":-927202}]}]');
reset role;
update trgovina.izdelki set postopek = 'dtf' where id = -927202;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.napaka_sporocilo('trgovina3: vrstni red je celo stevilo',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"vrstni_red":1.5}')$$, 'trgovina-vnos', '%neveljaven motiv%');
select pg_temp.napaka_sporocilo('trgovina3: primer z neznano shemo',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"primeri":[{"polja":{"ime":"Ana"},"shema":"nocna","izdelek":"test-trg3-majica","barva":"Črna"}]}')$$,
  'trgovina-vnos', 'Primer 1:%');
select pg_temp.napaka_sporocilo('trgovina3: primer z zaljivko',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"primeri":[{"polja":{"ime":"Ana"},"shema":"klasika","izdelek":"test-trg3-majica","barva":"Črna"},
     {"polja":{"ime":"Kurac"},"shema":"klasika","izdelek":"test-trg3-majica","barva":"Črna"}]}')$$,
  'trgovina-vnos', 'Primer 2:%ni dovoljeno%');
select pg_temp.napaka_sporocilo('trgovina3: primer za izdelek brez motiva',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"primeri":[{"polja":{"ime":"Ana"},"shema":"klasika","izdelek":"test-trg3-drugo","barva":"Črna"}]}')$$,
  'trgovina-vnos', 'Primer 1:%');
select trgovina_admin_shrani_motiv('{"id":-927201,"primeri":[{"polja":{"ime":"FC 1. maj","st":9,"slogan":"Tretji polčas","ekipa":"FC Ponedeljek Zjutraj"},
  "shema":"klasika","izdelek":"test-trg3-majica","barva":"Črna"}]}');
select pg_temp.preveri('trgovina3: veljaven primer se shrani',
  trgovina_admin_motivi() @> '[{"id":-927201,"primeri":[{"polja":{"ime":"FC 1. maj"}}]}]');
select pg_temp.preveri('trgovina3: vsi zacetni primeri prestanejo preverjanje',
  (select count(trgovina_admin_shrani_motiv(jsonb_build_object('id', e->'id', 'primeri', e->'primeri'))) = 6
     from jsonb_array_elements(trgovina_admin_motivi()) e
    where e->>'slug' in ('retro-dres', 'legenda', 'hangover-xi', 'kapetan', 'kralj-kafane', 'prvak-mini-lige')));
select pg_temp.napaka('trgovina3: admin ne spremeni polj motiva',
  $$select trgovina_admin_shrani_motiv('{"id":-927201,"polja":[]}')$$, 'trgovina-vnos');
reset role;
select set_config('request.jwt.claim.sub','',true);

-- --- trgovina4: motivi, dela 2 in 3 (20261019160000) -------------------------
-- Pub, stena in dodatki: vse neaktivno, doplačila iz baze, postava iz zadnjega
-- zaklenjenega kroga (le lastnik, ne hišna, ne mladinska), posnetek v postavki.
reset role;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.preveri('trgovina4: novi nosilci in motivi so neaktivni',
  (select count(*) = 10 and not bool_or(aktiven) from trgovina.izdelki
    where slug in ('kozarec-po-meri','vrc-po-meri','podstavki-po-meri','odpirac-po-meri','plakat-po-meri',
                   'kartica-igralca','zastavica-po-meri','sal-po-meri','kapa-po-meri','trak-po-meri'))
  and (select count(*) = 11 and not bool_or(aktiven) from trgovina.motivi
        where slug in ('tretji-polcas','ekipni-kozarec','kafanski-komplet','ime-in-stevilka','moja-postava',
                       'retro-plakat-tekme','kartica-legende','klubska-zastavica','navijaski-sal','vezena-ekipa','kapetanski-trak')));
select pg_temp.preveri('trgovina4: cene in doplacila iz specifikacije',
  (select jsonb_object_agg(i.slug || ' ' || r.oznaka_sl, r.cena) from trgovina.razlicice r join trgovina.izdelki i on i.id = r.izdelek_id
    where i.vrstni_red between 200 and 250)
  = '{"kozarec-po-meri 0,5 l":1200,"vrc-po-meri 0,5 l":1800,"podstavki-po-meri Komplet 6":2200,"odpirac-po-meri Ena velikost":900,
      "plakat-po-meri A3":2900,"plakat-po-meri A2":4500,"kartica-igralca A5":1500,"zastavica-po-meri Ena velikost":2200,
      "sal-po-meri Ena velikost":3500,"kapa-po-meri Črna":2400,"kapa-po-meri Bela-črna":2400,"trak-po-meri Ena velikost":1800}'
  and (select jsonb_object_agg(m.slug || ' ' || i.slug, mi.doplacilo) from trgovina.motivi_izdelki mi
         join trgovina.motivi m on m.id = mi.motiv_id join trgovina.izdelki i on i.id = mi.izdelek_id where m.vrstni_red between 110 and 210)
  = '{"tretji-polcas kozarec-po-meri":900,"tretji-polcas vrc-po-meri":900,"ekipni-kozarec kozarec-po-meri":900,
      "ekipni-kozarec vrc-po-meri":900,"kafanski-komplet podstavki-po-meri":0,"ime-in-stevilka odpirac-po-meri":600,
      "moja-postava plakat-po-meri":0,"retro-plakat-tekme plakat-po-meri":0,"kartica-legende kartica-igralca":0,
      "klubska-zastavica zastavica-po-meri":0,"navijaski-sal sal-po-meri":0,"vezena-ekipa kapa-po-meri":1000,
      "kapetanski-trak trak-po-meri":0}');
select pg_temp.preveri('trgovina4: plakat ima cono po velikosti',
  (select jsonb_object_agg(c.barva, jsonb_build_array(c.sirina_mm, c.visina_mm)) from trgovina.cone c
     join trgovina.izdelki i on i.id = c.izdelek_id where i.slug = 'plakat-po-meri') = '{"A3":[297,420],"A2":[420,594]}');

select pg_temp.preveri('trgovina4: dres po meri je neaktiven, 4900 + 1000, cone spredaj in hrbet',
  (select not i.aktiven and not m.aktiven and mi.doplacilo = 1000 and i.postopek = 'sublimacija'
     from trgovina.izdelki i join trgovina.motivi_izdelki mi on mi.izdelek_id = i.id join trgovina.motivi m on m.id = mi.motiv_id
    where i.slug = 'dres-po-meri' and m.slug = 'dres-po-meri')
  and (select count(*) = 6 and bool_and(cena = 4900) from trgovina.razlicice r join trgovina.izdelki i on i.id = r.izdelek_id where i.slug = 'dres-po-meri')
  and (select jsonb_object_agg(c.kljuc, jsonb_build_array(c.sirina_mm, c.visina_mm)) from trgovina.cone c
         join trgovina.izdelki i on i.id = c.izdelek_id where i.slug = 'dres-po-meri') = '{"spredaj":[600,750],"hrbet":[600,750]}');
update trgovina.motivi set aktiven = true where (vrstni_red between 110 and 210 or slug = 'dres-po-meri') and slug not like 'test-%';
update trgovina.izdelki set aktiven = true where (vrstni_red between 200 and 250 or slug = 'dres-po-meri') and slug like '%-po-meri';

-- Postava ekipe -927001 (Kranjski Tigri, K1): 4-4-2 + 4 na klopi, en anonimiziran,
-- en z vrstico v mladinski ligi (ista šifra). Trg3 (DEF) ne igra, s klopi vstopi Trg13.
insert into teams(id, name, short_name, country_id) overriding system value
values (-927401, 'Trgovina klub', 'TRK', (select id from countries where code='SI')),
       (-927402, 'Trgovina gostje', 'TRG', (select id from countries where code='SI'));
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position,
                    position_source, value, value_start, active) overriding system value
select -927400-n, -927401, -927001, 'Igr', 'Trg' || n, 'Igr Trg' || n,
       case when n in (1,12) then 'GK' when n <= 5 or n = 13 then 'DEF' when n <= 9 or n = 14 then 'MID' else 'FWD' end,
       'admin', 5, 5, true
  from generate_series(1,15) n;
update players set anonimiziran_at = now(), full_name = '#-927407', last_name = '#-927407' where id = -927407;
update players set reg_st = 999927405 where id = -927405;
insert into players(id, team_id, competition_id, first_name, last_name, full_name, reg_st, position,
                    position_source, value, value_start, active) overriding system value
values (-927420, -927401, -927201, 'Mladi', 'Isti', 'Mladi Isti', 999927405, 'DEF', 'admin', 5, 5, true);
update rounds set lineups_locked_at = deadline_at where id in (-927001, -927002);

select pg_temp.napaka_sporocilo('trgovina4: postava brez zaklenjenega kroga',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"moja-postava","polja":{"postava":-927001},"shema":"igrisce"}', 'f7a20000-0000-4000-8000-000000000001', 'sl')$$,
  'trgovina-personalizacija', '%končanega kroga s točkami%');
reset role;
select pg_temp.napaka_sporocilo('trgovina4: predogled postave brez kroga ima svoj namig',
  $$select trgovina.postava_ekipe(-927001, 'f7a20000-0000-4000-8000-000000000001')$$,
  'trgovina-postava-krog', '%končanega kroga s točkami%');
-- Katalog: nosilec motivov pove ceno z najnižjim doplačilom aktivnega motiva (stanje se povrne).
create temp table trg4_aktivni on commit drop as
  select 'i' as k, id, aktiven from trgovina.izdelki where slug = 'kozarec-po-meri'
  union all select 'm', id, aktiven from trgovina.motivi where slug in ('tretji-polcas', 'ekipni-kozarec');
update trgovina.izdelki set aktiven = true where slug = 'kozarec-po-meri';
update trgovina.motivi set aktiven = false where slug in ('tretji-polcas', 'ekipni-kozarec');
select pg_temp.preveri('trgovina4: katalog brez aktivnega motiva nima cene z motivom',
  (select e->'cena_z_motivom' from jsonb_array_elements(trgovina_katalog()) e where e->>'slug' = 'kozarec-po-meri') = 'null'::jsonb);
update trgovina.motivi set aktiven = true where slug = 'tretji-polcas';
select pg_temp.preveri('trgovina4: katalog da ceno nosilca z doplačilom motiva',
  (select (e->>'cena_z_motivom')::int from jsonb_array_elements(trgovina_katalog()) e where e->>'slug' = 'kozarec-po-meri') = 2100
  and (select (e->>'cena_od')::int from jsonb_array_elements(trgovina_katalog()) e where e->>'slug' = 'kozarec-po-meri') = 1200);
update trgovina.izdelki i set aktiven = a.aktiven from trg4_aktivni a where a.k = 'i' and a.id = i.id;
update trgovina.motivi m set aktiven = a.aktiven from trg4_aktivni a where a.k = 'm' and a.id = m.id;

insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
select r, -927001, -927400-n, n <= 11, n = case when r = -927002 then 10 else 2 end, n = 6,
       case when n > 11 then n - 11 end, null
  from (values (-927001), (-927002)) k(r) cross join generate_series(1,15) n;
select pg_temp.napaka_sporocilo('trgovina4: zaklenjen krog brez tock ne steje',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"moja-postava","polja":{"postava":-927001},"shema":"igrisce"}', 'f7a20000-0000-4000-8000-000000000001', 'sl')$$,
  'trgovina-personalizacija', '%končanega kroga s točkami%');
insert into matches(id, round_id, home_team_id, away_team_id, played_on, zapisnik_id) overriding system value
values (-927401, -927002, -927401, -927402, current_date - 2, 'test-trg4-1');
insert into appearances(match_id, player_id, team_id, started, minutes_played)
select -927401, -927400-n, -927401, n <= 11, case when n = 13 then 30 else 90 end
  from generate_series(1,13) n where n not in (3, 12);
insert into player_scores(round_id, player_id, points)
select -927002, -927400-n, n from generate_series(1,13) n where n not in (3, 12);
-- Novejši zaklenjen in točkovan krog z odprtim glasovanjem se preskoči.
insert into rounds(id,season,number,deadline_at,lineups_locked_at,voting_closes_at,competition_id) overriding system value
values (-927403,'2026/27',2,now()-interval '1 hour',now()-interval '1 hour',now()+interval '1 day',-927001);
insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
select -927403, -927001, -927400-n, n <= 11, n = 3, n = 4, case when n > 11 then n - 11 end, null
  from generate_series(1,15) n;
insert into player_scores(round_id, player_id, points)
select -927403, -927400-n, 50 from generate_series(1,11) n;
select pg_temp.preveri('trgovina4: krog z odprtim glasovanjem se preskoci',
  (trgovina.postava_ekipe(-927001, 'f7a20000-0000-4000-8000-000000000001')->>'round_id')::bigint = -927002);
-- Krog pretekle sezone se ne vzame, tudi če je novejši (le tekoča sezona lige).
insert into rounds(id,season,number,deadline_at,lineups_locked_at,voting_closes_at,competition_id) overriding system value
values (-927404,'2025/26',33,now()-interval '1 day',now()-interval '1 day',now()-interval '1 hour',-927001);
insert into fantasy_lineups(round_id, fantasy_team_id, player_id, is_starter, is_captain, is_vice, bench_order, position)
select -927404, -927001, -927400-n, n <= 11, n = 3, n = 4, case when n > 11 then n - 11 end, null
  from generate_series(1,15) n;
insert into player_scores(round_id, player_id, points)
select -927404, -927400-n, 50 from generate_series(1,11) n;
select pg_temp.preveri('trgovina4: krog pretekle sezone se preskoci',
  (trgovina.postava_ekipe(-927001, 'f7a20000-0000-4000-8000-000000000001')->>'round_id')::bigint = -927002);
-- Seštevek posnetka je iz učinkovite postave, ne iz tocke_krogov (ta lahko zaostaja).
update tocke_krogov set points = 1 where fantasy_team_id = -927001 and round_id = -927002;

select pg_temp.napaka_sporocilo('trgovina4: postava tuje ekipe',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"moja-postava","polja":{"postava":-927001},"shema":"igrisce"}', 'f7a20000-0000-4000-8000-000000000002', 'sl')$$,
  'trgovina-personalizacija', '%ni tvoja%');
select pg_temp.napaka_sporocilo('trgovina4: postava hisne ekipe',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"moja-postava","polja":{"postava":-927005},"shema":"igrisce"}', 'f7a20000-0000-4000-8000-000000000005', 'sl')$$,
  'trgovina-personalizacija', '%ni tvoja%');
select pg_temp.napaka_sporocilo('trgovina4: postava mladinske lige',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"moja-postava","polja":{"postava":-927211},"shema":"igrisce"}', 'f7a20000-0000-4000-8000-000000000001', 'sl')$$,
  'trgovina-personalizacija', '%mladinske lige%');
select pg_temp.napaka('trgovina4: postava zahteva prijavo',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"moja-postava","polja":{"postava":-927001},"shema":"igrisce"}', null, 'sl')$$, 'trgovina-prijava');
select pg_temp.preveri('trgovina4: ime ekipe na podstavkih je prosto besedilo brez prijave',
  (select p.personalizacija->'polja'->>'ekipa' = 'NK Zgornja Vas 1. maj' and not p.personalizacija ? 'fantasy_team_id'
     from trgovina.personaliziraj((select id from trgovina.izdelki where slug='podstavki-po-meri'),
       '{"motiv":"kafanski-komplet","polja":{"ekipa":" NK Zgornja Vas  1. maj ","slogan1":"Tretji polčas","slogan2":"Samo še eno",
         "slogan3":"Trener je rekel ena","slogan4":"Rundo plača kapetan","slogan5":"Ofsajd je bil","slogan6":"Na pivu smo prvi"},"shema":"pivska"}',
       null, 'sl') p));
select pg_temp.napaka_sporocilo('trgovina4: ime ekipe na salu gre skozi filter',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='sal-po-meri'),
    '{"motiv":"navijaski-sal","polja":{"ekipa":"Kurac United","slogan":"Do konca!"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija', '%polju ekipa ni dovoljeno%');
select pg_temp.napaka('trgovina4: ime ekipe na zastavici najvec 24 znakov',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='zastavica-po-meri'),
    '{"motiv":"klubska-zastavica","polja":{"ekipa":"Nogometni klub Zgornja Vas"},"shema":"klasika"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka_sporocilo('trgovina4: neveljaven datum',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"retro-plakat-tekme","polja":{"domaci":"Brdo","gostje":"Lipa","goli_domaci":1,"goli_gostje":0,"datum":"2026-02-30"},"shema":"retro"}',
    null, 'sl')$$, 'trgovina-personalizacija', '%datum v polju datum%');
select pg_temp.napaka('trgovina4: datum ni prevec v prihodnosti',
  format($q$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
    '{"motiv":"retro-plakat-tekme","polja":{"domaci":"Brdo","gostje":"Lipa","goli_domaci":1,"goli_gostje":0,"datum":"%s"},"shema":"retro"}',
    null, 'sl')$q$, (current_date + 400)::text), 'trgovina-personalizacija');
select pg_temp.preveri('trgovina4: retro plakat z datumom',
  (select p.personalizacija->'polja' @> '{"datum":"2026-05-17","goli_domaci":3}' and p.doplacilo = 0
     from trgovina.personaliziraj((select id from trgovina.izdelki where slug='plakat-po-meri'),
       '{"motiv":"retro-plakat-tekme","polja":{"domaci":"NK Zgornja Vas","gostje":"Lipa","goli_domaci":3,"goli_gostje":2,"datum":"2026-05-17"},"shema":"retro"}',
       null, 'sl') p));
select pg_temp.napaka_sporocilo('trgovina4: ocena na kartici je vsaj 1',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='kartica-igralca'),
    '{"motiv":"kartica-legende","polja":{"ime":"KRAJNC","pozicija":"MID","hitrost":0,"strel":50,"podaje":50,"obramba":50},"shema":"zlata"}',
    null, 'sl')$$, 'trgovina-personalizacija', '%številka v polju hitrost%');
select pg_temp.napaka_sporocilo('trgovina4: pozicija na kartici iz seznama',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='kartica-igralca'),
    '{"motiv":"kartica-legende","polja":{"ime":"KRAJNC","pozicija":"ST","hitrost":9,"strel":50,"podaje":50,"obramba":50},"shema":"zlata"}',
    null, 'sl')$$, 'trgovina-personalizacija', '%ni na seznamu%');
select pg_temp.napaka_sporocilo('trgovina4: dres z neznanim vzorcem',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='dres-po-meri'),
    '{"motiv":"dres-po-meri","polja":{"vzorec":"karo","barva1":"zelena","barva2":"bela","ovratnik":"v"},"shema":"dres"}', null, 'sl')$$,
  'trgovina-personalizacija', '%izbira v polju vzorec%');
select pg_temp.napaka_sporocilo('trgovina4: dres z neznano barvo',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='dres-po-meri'),
    '{"motiv":"dres-po-meri","polja":{"vzorec":"crte","barva1":"zelena","barva2":"#FF00FF","ovratnik":"v"},"shema":"dres"}', null, 'sl')$$,
  'trgovina-personalizacija', '%barva v polju barva2%');
select pg_temp.napaka('trgovina4: dres z barvo kot objekt',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='dres-po-meri'),
    '{"motiv":"dres-po-meri","polja":{"vzorec":"crte","barva1":{"kljuc":"zelena"},"barva2":"bela","ovratnik":"v"},"shema":"dres"}', null, 'sl')$$,
  'trgovina-personalizacija');
select pg_temp.napaka_sporocilo('trgovina4: dres z isto barvo dvakrat',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='dres-po-meri'),
    '{"motiv":"dres-po-meri","polja":{"vzorec":"crte","barva1":"zelena","barva2":"zelena","ovratnik":"v"},"shema":"dres"}', null, 'sl')$$,
  'trgovina-personalizacija', '%morata biti različni%');
select pg_temp.napaka_sporocilo('trgovina4: dres z neznanim ovratnikom',
  $$select trgovina.personaliziraj((select id from trgovina.izdelki where slug='dres-po-meri'),
    '{"motiv":"dres-po-meri","polja":{"vzorec":"crte","barva1":"zelena","barva2":"bela","ovratnik":"rolka"},"shema":"dres"}', null, 'sl')$$,
  'trgovina-personalizacija', '%izbira v polju ovratnik%');

-- Nakup: kozarec z doplačilom 900 in plakat A3 s posnetkom postave.
select set_config('test.trg4_kzm', (select id::text from trgovina.razlicice where sku = 'KZM-1'), true),
       set_config('test.trg4_plm', (select id::text from trgovina.razlicice where sku = 'PLM-A3'), true),
       set_config('test.trg4_drm', (select id::text from trgovina.razlicice where sku = 'DRM-M'), true);
set local role service_role;
select set_config('test.trg4_r', trgovina_rezerviraj(jsonb_build_array(
  jsonb_build_object('razlicica_id', current_setting('test.trg4_kzm')::bigint, 'kolicina', 1, 'cena', 1, 'doplacilo', 0,
    'personalizacija', '{"motiv":"tretji-polcas","polja":{"ime":"Novak","slogan":"Samo še eno"},"shema":"gravura"}'::jsonb),
  jsonb_build_object('razlicica_id', current_setting('test.trg4_plm')::bigint, 'kolicina', 1, 'cena', 1, 'doplacilo', 5,
    'personalizacija', '{"motiv":"moja-postava","polja":{"postava":-927001},"shema":"nocna"}'::jsonb),
  jsonb_build_object('razlicica_id', current_setting('test.trg4_drm')::bigint, 'kolicina', 1, 'cena', 1, 'doplacilo', 0,
    'personalizacija', '{"motiv":"dres-po-meri","polja":{"vzorec":"obroci","barva1":"rdeca","barva2":"bela","barva3":"crna",
      "ovratnik":"polo","sponzor":"Bife Zadnji Žvižg","ime":"Novak","stevilka":9},"shema":"dres"}'::jsonb)),
  'f7a20000-0000-4000-8000-000000000001', 'sl', encode(sha256('t4a'), 'hex'))::text, true);
reset role;
select pg_temp.preveri('trgovina4: veljaven dres, doplacilo 1000 iz baze, barve dresa in obe coni v posnetku',
  current_setting('test.trg4_r')::jsonb @> '{"postavke":[{"cena":4900,"doplacilo":1000,
     "opis":"Dres po meri · Obroči · Rdeča · Bela · Črna · Polo · Bife Zadnji Žvižg · Novak · 9"}]}'
  and (select p.personalizacija @> '{"motiv":"dres-po-meri","barve":["#C8102E","#FFFFFF","#111111"],
         "polja":{"vzorec":"obroci","barva1":"rdeca","barva2":"bela","barva3":"crna","ovratnik":"polo","sponzor":"Bife Zadnji Žvižg","ime":"Novak","stevilka":9},
         "cone":{"spredaj":{"sirina_mm":600,"visina_mm":750},"hrbet":{"sirina_mm":600,"visina_mm":750}}}'
         from trgovina.postavke p join trgovina.narocila n on n.id = p.narocilo_id
        where n.odjemalec = encode(sha256('t4a'), 'hex') and p.razlicica_id = current_setting('test.trg4_drm')::bigint));
select pg_temp.preveri('trgovina4: doplacila nosilcev iz baze',
  current_setting('test.trg4_r')::jsonb @> '{"postavke":[{"cena":1200,"doplacilo":900},{"cena":2900,"doplacilo":0}]}');
select pg_temp.preveri('trgovina4: opis plakata postave pove krog posnetka',
  current_setting('test.trg4_r')::jsonb @> '{"postavke":[{"cena":2900,"opis":"Moja postava · Kranjski Tigri · 1. krog"}]}');
select set_config('test.trg4_p', (select p.personalizacija::text from trgovina.postavke p join trgovina.narocila n on n.id = p.narocilo_id
   join trgovina.razlicice r on r.id = p.razlicica_id where n.odjemalec = encode(sha256('t4a'), 'hex') and r.sku = 'PLM-A3'), true);
select pg_temp.preveri('trgovina4: postavka shrani posnetek zadnjega zaklenjenega kroga s tockami',
  current_setting('test.trg4_p')::jsonb @> '{"motiv":"moja-postava","fantasy_team_id":-927001,"round_id":-927002,
     "cone":{"plakat":{"sirina_mm":297,"visina_mm":420}},
     "polja":{"postava":{"ekipa":"Kranjski Tigri","liga":"Test trgovine 2","sezona":"2026/27","krog":1,"formacija":"4-4-2",
       "zacetni":[{"ime":"Igr Trg1","pozicija":"GK","klub":"TRK","tocke":1,"steje":true,"mnozitelj":1},
                  {"ime":"Igr Trg13","pozicija":"DEF","tocke":13,"zamenjava":true,"steje":true}],
       "klop":[{"ime":"Igr Trg12","pozicija":"GK","tocke":null,"steje":false,"mnozitelj":0},
               {"ime":"Igr Trg3","pozicija":"DEF","tocke":null,"zamenjan":true,"steje":false}]}}}'
  and jsonb_array_length(current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}') = 11
  and jsonb_array_length(current_setting('test.trg4_p')::jsonb #> '{polja,postava,klop}') = 4
  and not exists (select 1 from jsonb_array_elements(current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}') x
                   where x->>'ime' = 'Igr Trg3'));
select pg_temp.preveri('trgovina4: stete tocke igralcev minus kazen so tocke ekipe',
  (select sum((x->>'tocke')::numeric) filter (where (x->>'steje')::boolean)
          - (current_setting('test.trg4_p')::jsonb #>> '{polja,postava,kazen}')::numeric
          = (current_setting('test.trg4_p')::jsonb #>> '{polja,postava,tocke_skupaj}')::numeric
     from jsonb_array_elements(current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}'
                               || (current_setting('test.trg4_p')::jsonb #> '{polja,postava,klop}')) x)
  and (current_setting('test.trg4_p')::jsonb #>> '{polja,postava,tocke_skupaj}')::numeric = 96);
select pg_temp.preveri('trgovina4: igralec z vrstico v mladinski ligi je Igralec',
  strpos(current_setting('test.trg4_p'), '"Igr Trg5"') = 0
  and (select count(*) = 2 from jsonb_array_elements(current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}') x
        where x->>'ime' = 'Igralec'));
select pg_temp.preveri('trgovina4: kapetan in podkapetan v posnetku',
  current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}' @> '[{"ime":"Igr Trg10","kapetan":true,"mnozitelj":3,"tocke":30},{"priimek":"Trg6","podkapetan":true,"tocke":6}]'
  and (select count(*) = 1 from jsonb_array_elements(current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}') x where (x->>'kapetan')::boolean));
select pg_temp.preveri('trgovina4: anonimiziran igralec je Igralec',
  current_setting('test.trg4_p')::jsonb #> '{polja,postava,zacetni}' @> '[{"ime":"Igralec","priimek":"Igralec","tocke":7}]'
  and strpos(current_setting('test.trg4_p'), '927407') = 0);
update fantasy_lineups set is_captain = (player_id = -927401) where round_id = -927002 and fantasy_team_id = -927001;
update players set full_name = 'Preimenovan' where id = -927401;
select pg_temp.preveri('trgovina4: posnetek ostane, ko se postava kasneje spremeni',
  (select p.personalizacija::text = current_setting('test.trg4_p') from trgovina.postavke p join trgovina.narocila n on n.id = p.narocilo_id
     join trgovina.razlicice r on r.id = p.razlicica_id where n.odjemalec = encode(sha256('t4a'), 'hex') and r.sku = 'PLM-A3'));
update trgovina.narocila set stanje = 'placano', placano_at = now() where odjemalec = encode(sha256('t4a'), 'hex');
update trgovina.postavke set stanje_tiska = 'za_tisk'
 where narocilo_id = (select id from trgovina.narocila where odjemalec = encode(sha256('t4a'), 'hex'));
select pg_temp.preveri('trgovina4: izvoz za tisk da barve dresa, ne barv sheme, in jezik naročila',
  (select t.barve = '["#C8102E","#FFFFFF","#111111"]' from trgovina.tisk t
    where t.narocilo_id = (select id from trgovina.narocila where odjemalec = encode(sha256('t4a'), 'hex')) and t.sku = 'DRM-M')
  and (select t.barve = '["#FFFFFF"]' from trgovina.tisk t
    where t.narocilo_id = (select id from trgovina.narocila where odjemalec = encode(sha256('t4a'), 'hex')) and t.sku = 'KZM-1')
  and (select bool_and(t.jezik = 'sl') from trgovina.tisk t
    where t.narocilo_id = (select id from trgovina.narocila where odjemalec = encode(sha256('t4a'), 'hex'))));
-- Agent bere ves pogled (select *): funkcije pogleda tečejo s pravicami bralca (cone_json bere cone).
select pg_temp.preveri('trgovina4: agent bere select * iz trgovina.tisk s conami',
  has_table_privilege('agent_bralec', 'trgovina.tisk', 'select')
  and has_function_privilege('agent_bralec', 'trgovina.cone_json(bigint)', 'execute')
  and has_function_privilege('agent_bralec', 'trgovina.je_placano_aktivno(text)', 'execute')
  and has_table_privilege('agent_bralec', 'trgovina.cone', 'select'));
delete from trgovina.narocila where odjemalec = encode(sha256('t4a'), 'hex');

-- Živi predogled: le lastnik, anon nima dostopa.
set local role anon;
select pg_temp.zavrnjeno('trgovina4: anon ne vidi postave', $$select trgovina_moja_postava(-927001)$$);
select pg_temp.zavrnjeno('trgovina4: anon ne klice posnetka postave', $$select trgovina.postava_ekipe(-927001, null)$$);
reset role;
select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('trgovina4: lastnik vidi svojo postavo',
  trgovina_moja_postava(-927001) @> '{"ekipa":"Kranjski Tigri","round_id":-927002,"formacija":"4-4-2"}'
  and trgovina_moja_postava(-927001) #> '{zacetni}' @> '[{"priimek":"Trg1","kapetan":true}]');
select pg_temp.napaka_sporocilo('trgovina4: predogled tuje postave',
  $$select trgovina_moja_postava(-927002)$$, 'trgovina-personalizacija', '%ni tvoja%');
select pg_temp.napaka_sporocilo('trgovina4: predogled mladinske postave',
  $$select trgovina_moja_postava(-927211)$$, 'trgovina-personalizacija', '%mladinske lige%');
reset role;
select set_config('request.jwt.claim.sub','f7a20000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.napaka_sporocilo('trgovina4: drug uporabnik ne vidi postave',
  $$select trgovina_moja_postava(-927001)$$, 'trgovina-personalizacija', '%ni tvoja%');
reset role;

-- Primeri: vsi začetni prestanejo preverjanje, napačna postava ne.
select set_config('test.trg4_mp', (select id::text from trgovina.motivi where slug = 'moja-postava'), true),
       set_config('test.trg4_dres', (select id::text from trgovina.motivi where slug = 'dres-po-meri'), true);
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('trgovina4: vsi zacetni primeri prestanejo preverjanje',
  (select count(trgovina_admin_shrani_motiv(jsonb_build_object('id', e->'id', 'primeri', e->'primeri'))) = 11
     from jsonb_array_elements(trgovina_admin_motivi()) e where (e->>'vrstni_red')::int between 110 and 210)
  and trgovina_admin_shrani_motiv(jsonb_build_object('id', current_setting('test.trg4_dres')::bigint,
        'primeri', (select m->'primeri' from jsonb_array_elements(trgovina_admin_motivi()) m where m->>'slug' = 'dres-po-meri'))) is not null);
select pg_temp.napaka_sporocilo('trgovina4: primer dresa z isto barvo dvakrat',
  $$select trgovina_admin_shrani_motiv(jsonb_build_object('id', current_setting('test.trg4_dres')::bigint,
    'primeri', '[{"polja":{"vzorec":"crte","barva1":"bela","barva2":"bela","ovratnik":"v"},"shema":"dres","izdelek":"dres-po-meri","barva":"M"}]'::jsonb))$$,
  'trgovina-vnos', 'Primer 1:%različni%');
select pg_temp.napaka_sporocilo('trgovina4: primer postave z 10 igralci',
  $$select trgovina_admin_shrani_motiv(jsonb_build_object('id', current_setting('test.trg4_mp')::bigint,
    'primeri', jsonb_build_array(jsonb_build_object('polja', jsonb_build_object('postava', jsonb_build_object('ekipa', 'Dinamo Kavč',
      'zacetni', (select jsonb_agg(jsonb_build_object('ime', 'Žogi Žogec', 'pozicija', 'MID')) from generate_series(1,10)))),
      'shema', 'nocna', 'izdelek', 'plakat-po-meri', 'barva', 'A3'))))$$, 'trgovina-vnos', 'Primer 1:%postava%');
select pg_temp.napaka_sporocilo('trgovina4: primer postave z zaljivko',
  $$select trgovina_admin_shrani_motiv(jsonb_build_object('id', current_setting('test.trg4_mp')::bigint,
    'primeri', jsonb_build_array(jsonb_build_object('polja', jsonb_build_object('postava', jsonb_build_object('ekipa', 'Dinamo Kavč',
      'zacetni', (select jsonb_agg(jsonb_build_object('ime', case when n = 5 then 'Kurac' else 'Žogi Žogec' end, 'pozicija', 'MID'))
                    from generate_series(1,11) n))),
      'shema', 'nocna', 'izdelek', 'plakat-po-meri', 'barva', 'A3'))))$$, 'trgovina-vnos', 'Primer 1:%ni dovoljeno%');
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Bralni dostop agentov (agent_bralec): bere podatke, ne skrivnosti in ne piše.
select pg_temp.preveri('agent: bere poslano pošto klubom', has_table_privilege('agent_bralec', 'public.klub_stik_posta', 'select'));
select pg_temp.preveri('agent: bere registracije brez e-pošte', has_table_privilege('agent_bralec', 'agent.registracije', 'select'));
select pg_temp.preveri('agent: ne bere ključa stikov', not has_table_privilege('agent_bralec', 'public.stiki_kljuc', 'select'));
select pg_temp.preveri('agent: ne bere žetonov push', not has_table_privilege('agent_bralec', 'public.push_tokens', 'select'));
select pg_temp.preveri('agent: ne bere sheme auth', not has_schema_privilege('agent_bralec', 'auth', 'usage'));
select pg_temp.preveri('agent: ne bere sheme scout', not has_schema_privilege('agent_bralec', 'scout', 'usage'));
select pg_temp.preveri('agent: ne bere e-pošte kupca', not has_column_privilege('agent_bralec', 'trgovina.narocila', 'email', 'select'));
select pg_temp.preveri('agent: bere stanje naročila', has_column_privilege('agent_bralec', 'trgovina.narocila', 'stanje', 'select'));
select pg_temp.preveri('agent: ne bere e-pošte v email_log', not has_column_privilege('agent_bralec', 'public.email_log', 'email', 'select'));
select pg_temp.preveri('agent: ne piše', not has_table_privilege('agent_bralec', 'public.fantasy_teams', 'insert,update,delete'));
-- Brez superuporabnika (sveža CI baza) migracija sheme net ne more zapreti in to
-- izrecno zapiše; produkcijo preveri docs/agenti-baza.md.
select pg_temp.preveri('agent: ne dostopa do pg_net (URL-ji kljuk Discorda) ali je zapisano opozorilo',
  to_regnamespace('net') is null or not has_schema_privilege('agent_bralec', 'net', 'usage')
  or exists (select 1 from agent.opozorila where kljuc = 'net'));
select pg_temp.preveri('agent: aplikacija ohrani pg_net',
  to_regnamespace('net') is null or (has_schema_privilege('authenticated', 'net', 'usage')
    and has_table_privilege('postgres', 'net.http_request_queue', 'insert')));
select pg_temp.preveri('agent: največ 3 povezave',
  (select rolconnlimit from pg_roles where rolname = 'agent_bralec') = 3);
select pg_temp.preveri('agent: poizvedba le za agenta',
  has_function_privilege('agent_bralec', 'agent.poizvedba(text)', 'execute')
  and not has_function_privilege('anon', 'agent.poizvedba(text)', 'execute'));
select pg_temp.preveri('agent: obcutljiv stolpec po imenu je zaprt',
  agent.obcutljiv_stolpec('kontakt_email') and agent.obcutljiv_stolpec('koda_hash')
  and not agent.obcutljiv_stolpec('poslano_at'));
select pg_temp.preveri('agent: bere naslove klubov (izjema lastnika)',
  has_column_privilege('agent_bralec', 'public.klub_stik', 'email', 'select'));
select pg_temp.preveri('agent: ne bere imena kupca',
  not has_column_privilege('agent_bralec', 'trgovina.narocila', 'ime', 'select'));
select pg_temp.preveri('agent: privzeto le branje',
  exists (select 1 from pg_db_role_setting s join pg_roles r on r.oid = s.setrole
          where r.rolname = 'agent_bralec' and 'default_transaction_read_only=on' = any(s.setconfig)));

-- --------------------------------------------------------------------------
-- Izložba preverjenega igralca (migracija 20261031183100): pravilo prikaza
-- (stikalo, pravica, le polnoletni), moderacija, žetoni, prijave, brisanje,
-- čiščenje in SLFF Club. A (…01) ima odraslo vrstico -947001; B (…02) ima
-- povezano mladinsko vrstico; C (…03) ima soimenjaka v mladinski ligi;
-- D (…04) je v Scoutovem modelu; T (…05) je tujec.
-- --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data,created_at) values
 ('f7a10000-0000-4000-8000-000000000001','izlozba-a@example.invalid','{"display_name":"IzlozbaA"}',now()),
 ('f7a10000-0000-4000-8000-000000000002','izlozba-b@example.invalid','{"display_name":"IzlozbaB"}',now()),
 ('f7a10000-0000-4000-8000-000000000003','izlozba-c@example.invalid','{"display_name":"IzlozbaC"}',now()),
 ('f7a10000-0000-4000-8000-000000000004','izlozba-d@example.invalid','{"display_name":"IzlozbaD"}',now()),
 ('f7a10000-0000-4000-8000-000000000005','izlozba-t@example.invalid','{"display_name":"IzlozbaT"}',now()),
 ('f7a10000-0000-4000-8000-000000000006','izlozba-t2@example.invalid','{"display_name":"IzlozbaT2"}',now()),
 ('f7a10000-0000-4000-8000-000000000007','izlozba-t3@example.invalid','{"display_name":"IzlozbaT3"}',now());
insert into competitions(id, slug, name, short_name, active, country_id, source) overriding system value
values (-947100, 'test-izlozba-u19', 'Izložba U19', 'IU19', false, (select id from countries where code='SI'), 'mnzg');
insert into players(id, team_id, competition_id, first_name, last_name, full_name, position, position_source, value, value_start, active) overriding system value
values (-947001, -913002, -913001, 'Izlozba', 'Odrasli', 'Izlozba Odrasli', 'MID', 'admin', 6, 6, true),
       (-947003, -913002, -913001, 'Izlozba', 'Mladi', 'Izlozba Mladi', 'MID', 'admin', 6, 6, true),
       (-947004, -913002, -947100, 'Izlozba', 'Mladi', 'Izlozba Mladi', 'MID', 'admin', 6, 6, true),
       (-947006, -913002, -913001, 'Izlozba', 'Soimenjak', 'Izlozba Soimenjak', 'MID', 'admin', 6, 6, true),
       (-947007, -913003, -947100, 'Izlozba', 'Soimenjak', 'Izlozba Soimenjak', 'MID', 'admin', 6, 6, true),
       (-947008, -913002, -913001, 'Izlozba', 'Scout', 'Izlozba Scout', 'MID', 'admin', 6, 6, true);
insert into zahtevki_igralca(id, player_id, user_id, status, potrdil, decided_at) overriding system value
values (-947001, -947001, 'f7a10000-0000-4000-8000-000000000001', 'potrjen', 'admin', now()),
       (-947003, -947003, 'f7a10000-0000-4000-8000-000000000002', 'potrjen', 'admin', now()),
       (-947006, -947006, 'f7a10000-0000-4000-8000-000000000003', 'potrjen', 'admin', now()),
       (-947008, -947008, 'f7a10000-0000-4000-8000-000000000004', 'potrjen', 'admin', now());
insert into povezani_igralci (player_id, zahtevek_id) values (-947004, -947003);
insert into preverjeni_racuni (user_id, player_id, vir, star_vsaj_18)
select ('f7a10000-0000-4000-8000-00000000000' || n)::uuid, p, 'rocno', null
  from (values (1, -947001), (2, -947003), (3, -947006), (4, -947008)) v(n, p);
update settings set value = '2' where key = 'preverjeni_racuni';
insert into settings(key, value) values ('posnetki_igralcev', '0')
  on conflict (key) do update set value = '0';

select pg_temp.preveri('izlozba: pravice funkcij (javno branje, ostalo zaprto)',
  has_function_privilege('anon', 'public.izlozba_igralca(bigint)', 'EXECUTE')
  and has_function_privilege('anon', 'public.posnetki_za_ogled(bigint[])', 'EXECUTE')
  and not has_function_privilege('anon', 'public.posnetki_pripravi(bigint, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.prijavi_posnetek(bigint, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.scout_posnetki(bigint)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.posnetki_nastavi_uid(bigint, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.posnetki_stream_stanje(text, text, numeric)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.posnetki_pocisti()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.posnetki_za_brisanje(integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.izlozba_odrasla_oseba(bigint)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.posnetki_pocisti()', 'EXECUTE')
  and exists (select 1 from agent.zaprte_tabele where tabela = 'public.posnetki_igralca')
  and exists (select 1 from agent.zaprte_tabele where tabela = 'public.prijave_posnetkov'));

-- Stikalo 0: nihče nič, tudi lastnik ne nalaga.
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('izlozba: stikalo 0 skrije izložbo, lastnik dobi le ponudbo',
  not izlozba_dovoljena(-947001)
  and (select not (j->>'dovoljena')::boolean and not (j->>'vidi')::boolean and (j->>'odrasla')::boolean
         from izlozba_igralca(-947001) j));
select pg_temp.napaka('izlozba: stikalo 0 lastnik ne nalaga',
  $$select posnetki_pripravi(-947001, 'Gol iz kota')$$, 'posnetki-pravica');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('izlozba: stikalo 0 anonimni ne vidi ničesar', izlozba_igralca(-947001) is null);
select pg_temp.zavrnjeno('izlozba: brskalnik ne bere tabele posnetkov', $$select * from posnetki_igralca$$);
select pg_temp.zavrnjeno('izlozba: brskalnik ne bere vrste brisanja', $$select * from posnetki_brisanje$$);
reset role;

-- Stikalo 2: pravilo (preverjen + polnoleten).
update settings set value = '2' where key = 'posnetki_igralcev';
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('izlozba: preverjen odrasel igralec ima izložbo',
  izlozba_dovoljena(-947001) and (select (j->>'dovoljena')::boolean and not (j->>'lastnik')::boolean
                                       and jsonb_array_length(j->'posnetki') = 0 and j->'ogledi' = 'null'::jsonb
                                    from izlozba_igralca(-947001) j));
select pg_temp.preveri('izlozba: povezana mladinska vrstica izloči osebo (obe vrstici)',
  not izlozba_dovoljena(-947003) and not izlozba_dovoljena(-947004) and izlozba_igralca(-947004) is null);
select pg_temp.preveri('izlozba: soimenjak v mladinski ligi izloči osebo',
  not izlozba_dovoljena(-947006));
select pg_temp.preveri('izlozba: nepotrjen in nepreverjen igralec nimata izložbe',
  not izlozba_dovoljena(-913010) and izlozba_igralca(-913010) is null);
reset role;
insert into scout.privolitve (player_id, odprt_za_prestop, letnik, regije) values (-947006, true, 1995, '{}');
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('izlozba: polnoletna letnica odpre ujemanje po ključu (kot Scout), ne lastne mladinske vrstice',
  izlozba_dovoljena(-947006) and not izlozba_dovoljena(-947003)
  and (select (j->'privolitev'->>'letnik') = '1995' from izlozba_igralca(-947006) j));
reset role;
insert into scout.privolitve (player_id, odprt_za_prestop, letnik, regije) values (-947003, true, 1995, '{}');
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.preveri('izlozba: lastnik z mladinsko vrstico ostane brez (tudi z letnico), ponudba ve zakaj',
  not izlozba_dovoljena(-947003)
  and (select (j->>'lastnik')::boolean and not (j->>'dovoljena')::boolean and not (j->>'odrasla')::boolean
         from izlozba_igralca(-947003) j));
select pg_temp.napaka('izlozba: mladinski igralec ne nalaga',
  $$select posnetki_pripravi(-947003, 'Gol')$$, 'posnetki-pravica');
reset role;

-- Nalaganje: le lastnik, največ 6, naslov brez žaljivk.
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('izlozba: tujec ne nalaga na tuj profil', $$select posnetki_pripravi(-947001, 'Vdor')$$);
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.pade('izlozba: žaljiv naslov pade', $$select posnetki_pripravi(-947001, 'ti si kurac')$$);
select posnetki_pripravi(-947001, '  Gol   iz kota ') from generate_series(1, 6);
select pg_temp.napaka('izlozba: sedmi posnetek pade', $$select posnetki_pripravi(-947001, 'Sedmi')$$, 'posnetki-polno');
select pg_temp.preveri('izlozba: lastnik vidi svoje (vsi v pregledu, prvi izpostavljen, naslov strnjen)',
  (select jsonb_array_length(j->'posnetki') = 6
          and (j->'posnetki'->0->>'izpostavljen')::boolean and (j->'posnetki'->0->>'naslov') = 'Gol iz kota'
          and (select bool_and(e->>'pregled' = 'caka' and e->>'stanje' = 'nalaganje') from jsonb_array_elements(j->'posnetki') e)
          and (j->>'lastnik')::boolean and j->'ogledi' is not null
     from izlozba_igralca(-947001) j));
reset role;
create temporary table iz as
select array_agg(id order by id) as ids from posnetki_igralca where player_id = -947001;
grant select on iz to anon, authenticated;
-- Servis: uid in obdelava (Stream).
select posnetki_nastavi_uid(i, 'test-izlozba-' || -i) from iz, unnest(iz.ids) i;
select pg_temp.pade('izlozba: uid se ne prepiše', $$select posnetki_nastavi_uid((select ids[1] from iz), 'test-drugi-uid')$$);
select posnetki_stream_stanje('test-izlozba-' || -i, 'obdelava', null) from iz, unnest(iz.ids) i;
select posnetki_stream_stanje('test-izlozba-' || -(select ids[1] from iz), 'pripravljen', 42.37);
select posnetki_stream_stanje('test-izlozba-' || -(select ids[1] from iz), 'obdelava', null);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('izlozba: posnetek v pregledu ni javen in nima žetona',
  (select jsonb_array_length(j->'posnetki') = 0 from izlozba_igralca(-947001) j)
  and not exists (select 1 from posnetki_za_ogled((select ids from iz))));
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('izlozba: lastnik dobi žeton tudi v pregledu; pripravljen ne pade nazaj',
  (select count(*) = 6 from posnetki_za_ogled((select ids from iz)))
  and (select (j->'posnetki'->0->>'stanje') = 'pripravljen' and (j->'posnetki'->0->>'trajanje')::numeric = 42.4
         from izlozba_igralca(-947001) j));
select pg_temp.zavrnjeno('izlozba: lastnik ne odobri sam', $$select admin_odloci_posnetek((select ids[1] from iz), true)$$);
select pg_temp.zavrnjeno('izlozba: lastnik ne vidi vrste admina', $$select * from admin_posnetki()$$);
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('izlozba: tujec ne preimenuje', $$select posnetki_uredi((select ids[1] from iz), 'Vdor')$$);
select pg_temp.zavrnjeno('izlozba: tujec ne briše', $$select posnetki_izbrisi((select ids[1] from iz))$$);
select pg_temp.zavrnjeno('izlozba: tujec ne razvršča', $$select posnetki_razvrsti((select ids from iz))$$);
reset role;

-- Admin: zavrnitev z razlogom, odobritev.
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('izlozba: admin vidi posnetke v pregledu',
  (select count(*) = 6 from admin_posnetki() where player_id = -947001 and pregled = 'caka'));
select pg_temp.pade('izlozba: zavrnitev brez razloga pade', $$select admin_odloci_posnetek((select ids[2] from iz), false)$$);
select admin_odloci_posnetek((select ids[1] from iz), true);
select admin_odloci_posnetek((select ids[2] from iz), false, 'Ni nogomet.');
reset role;
select posnetki_stream_stanje('test-izlozba-' || -(select ids[2] from iz), 'pripravljen', 10);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('izlozba: odobren in obdelan posnetek je javen, zavrnjen ne; razlog le lastniku',
  (select jsonb_array_length(j->'posnetki') = 1 and (j->'posnetki'->0->>'id')::bigint = (select ids[1] from iz)
          and j->'posnetki'->0->'razlog' = 'null'::jsonb
     from izlozba_igralca(-947001) j)
  and (select array_agg(id) = array[(select ids[1] from iz)] from posnetki_za_ogled((select ids from iz))));
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('izlozba: lastnik vidi razlog zavrnitve',
  (select e->>'razlog' = 'Ni nogomet.' from izlozba_igralca(-947001) j, jsonb_array_elements(j->'posnetki') e
    where (e->>'id')::bigint = (select ids[2] from iz)));
-- Lastnik: naslov, vrstni red, izpostavljen.
select posnetki_uredi((select ids[1] from iz), 'Prosti strel');
select posnetki_razvrsti((select array(select unnest(ids) order by 1 desc) from iz));
select posnetki_izpostavi((select ids[3] from iz));
select pg_temp.pade('izlozba: žaljiv nov naslov pade', $$select posnetki_uredi((select ids[1] from iz), 'shit')$$);
select pg_temp.zavrnjeno('izlozba: lastnik ne piše tabele neposredno',
  $$update posnetki_igralca set pregled = 'odobren' where player_id = -947001$$);
select pg_temp.pade('izlozba: lastnik svojega posnetka ne prijavi', $$select prijavi_posnetek((select ids[1] from iz), 'x')$$);
reset role;
select pg_temp.preveri('izlozba: lastnik ureja naslov, vrstni red in izpostavljen (le en)',
  (select naslov = 'Prosti strel' from posnetki_igralca where id = (select ids[1] from iz))
  and (select vrstni_red = 5 from posnetki_igralca where id = (select ids[1] from iz))
  and (select array_agg(id) = array[(select ids[3] from iz)] from posnetki_igralca where player_id = -947001 and izpostavljen));

-- Prijave: tri različne prijave vrnejo posnetek v pregled.
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.zavrnjeno('izlozba: anonimni ne prijavlja', $$select prijavi_posnetek((select ids[1] from iz), 'x')$$);
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000005',true);
set local role authenticated;
select prijavi_posnetek((select ids[1] from iz), 'Neprimerno');
select pg_temp.pade('izlozba: isti posnetek dvakrat ne', $$select prijavi_posnetek((select ids[1] from iz), 'Spet')$$);
select pg_temp.pade('izlozba: posnetka v pregledu ni mogoče prijaviti', $$select prijavi_posnetek((select ids[4] from iz), 'x')$$);
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000006',true);
set local role authenticated;
select prijavi_posnetek((select ids[1] from iz), null);
reset role;
select pg_temp.preveri('izlozba: dve prijavi posnetka ne skrijeta',
  (select pregled = 'odobren' from posnetki_igralca where id = (select ids[1] from iz)));
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000007',true);
set local role authenticated;
select prijavi_posnetek((select ids[1] from iz), null);
reset role;
select pg_temp.preveri('izlozba: tretja prijava vrne posnetek v pregled',
  (select pregled = 'caka' from posnetki_igralca where id = (select ids[1] from iz)));
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ad',true);
set local role authenticated;
select pg_temp.preveri('izlozba: admin vidi prijave',
  (select prijav = 3 and razlogi_prijav = array['Neprimerno'] from admin_posnetki() where id = (select ids[1] from iz)));
select admin_odloci_posnetek((select ids[1] from iz), true);
reset role;
select pg_temp.preveri('izlozba: odločitev reši prijave',
  not exists (select 1 from prijave_posnetkov where posnetek_id = (select ids[1] from iz) and resena_at is null));

-- Brisanje: lastnik → uid v vrsto; izpostavljen preide na naslednjega.
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('izlozba: lastnik izbriše, dobi uid',
  posnetki_izbrisi((select ids[3] from iz)) = 'test-izlozba-' || -(select ids[3] from iz));
reset role;
select pg_temp.preveri('izlozba: izbris gre v vrsto Streama, izpostavljen preide na odobrenega',
  exists (select 1 from posnetki_brisanje where stream_uid = 'test-izlozba-' || -(select ids[3] from iz))
  and (select array_agg(id) = array[(select ids[1] from iz)] from posnetki_igralca where player_id = -947001 and izpostavljen)
  and (select 'test-izlozba-' || -(select ids[3] from iz)) in (select posnetki_za_brisanje(50)));
select posnetki_brisanje_izid('test-izlozba-' || -(select ids[3] from iz), true);
select pg_temp.preveri('izlozba: uspešen izbris v Streamu počisti vrsto',
  not exists (select 1 from posnetki_brisanje where stream_uid = 'test-izlozba-' || -(select ids[3] from iz)));

-- Potek pravice: skrito takoj, izbris po 30 dneh.
update preverjeni_racuni set velja_do = now() - interval '1 minute', updated_at = now()
 where player_id = -947001 and status = 'aktiven';
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select pg_temp.preveri('izlozba: potekla pravica takoj skrije izložbo in žetone',
  izlozba_igralca(-947001) is null and not exists (select 1 from posnetki_za_ogled((select ids from iz))));
reset role;
select posnetki_pocisti();
select pg_temp.preveri('izlozba: čiščenje potekle pravice počaka 30 dni',
  (select count(*) = 5 and bool_and(brez_pravice_od is not null) from posnetki_igralca where player_id = -947001));
update posnetki_igralca set brez_pravice_od = now() - interval '31 days' where player_id = -947001;
select posnetki_pocisti();
select pg_temp.preveri('izlozba: po 30 dneh izbris in uid-ji v vrsti',
  not exists (select 1 from posnetki_igralca where player_id = -947001)
  and (select count(*) = 5 from posnetki_brisanje where stream_uid like 'test-izlozba-%'));

-- Preklicana pravica: čiščenje izbriše takoj. Preklic profila: takoj.
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000003',true);
set local role authenticated;
select posnetki_pripravi(-947006, 'Preklic');
reset role;
select posnetki_pocisti();
select pg_temp.preveri('izlozba: veljavna pravica ostane po čiščenju',
  exists (select 1 from posnetki_igralca where player_id = -947006 and brez_pravice_od is null));
update preverjeni_racuni set status = 'preklican', updated_at = now() where player_id = -947006 and status = 'aktiven';
select posnetki_pocisti();
select pg_temp.preveri('izlozba: preklicana pravica izbriše posnetke ob čiščenju',
  not exists (select 1 from posnetki_igralca where player_id = -947006));

-- SLFF Club: posnetki prek scout.dostop in scout.vidni (K1 ima sedež kluba -913001).
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
select posnetki_pripravi(-947008, 'Za klube');
select posnetki_pripravi(-947008, 'V pregledu');
reset role;
select posnetki_nastavi_uid(id, 'test-scout-' || -id) from posnetki_igralca where player_id = -947008;
select posnetki_stream_stanje('test-scout-' || -id, 'pripravljen', 30) from posnetki_igralca where player_id = -947008;
update posnetki_igralca set pregled = 'odobren' where player_id = -947008 and naslov = 'Za klube';
insert into scout.indeks (model_id, player_id, skupina, indeks, percentil, zaupanje)
select s3.model, -947008, 'MID', 1, 93, 0.9 from s3;
update scout.narocnine set velja_do = now() + interval '7 days', zaprt_at = null where team_id = -913001;
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.preveri('izlozba: klub vidi le odobrene posnetke vidnega igralca',
  (select array_agg(naslov) = array['Za klube'] from scout_posnetki(-947008))
  and (select (j->>'posnetkov')::int = 1 from scout_igralec(-947008) j));
select pg_temp.preveri('izlozba: klub ne dobi posnetkov igralca brez izložbe ali zunaj modela',
  not exists (select 1 from scout_posnetki(-947003)) and not exists (select 1 from scout_posnetki(-947001)));
reset role;
select pg_temp.preveri('izlozba: klic posnetkov je v dnevniku',
  (select count(*) = 3 from scout.dnevnik where vrsta = 'posnetki' and team_id = -913001));
select set_config('request.jwt.claim.sub','e5c30000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.zavrnjeno('izlozba: brez sedeža ni posnetkov', $$select * from scout_posnetki(-947008)$$);
reset role;
select set_config('request.jwt.claim.sub','f7a10000-0000-4000-8000-000000000004',true);
set local role authenticated;
select pg_temp.preveri('izlozba: lastnik vidi števila ogledov klubov in pozitiven kazalnik',
  (select (j->'ogledi'->>'ogledov')::int >= 1 and (j->'ogledi'->>'klubov')::int = 1 and (j->>'mreza')::boolean
          and (j->'scout'->>'percentil')::int = 93 and not (j->'ogledi' ? 'klubi')
     from izlozba_igralca(-947008) j));
reset role;
-- Preklic profila (prevzem_odstrani_predstavitev) izbriše posnetke takoj.
select prevzem_odstrani_predstavitev(-947008);
select pg_temp.preveri('izlozba: preklic profila izbriše posnetke, uid-ji v vrsto',
  not exists (select 1 from posnetki_igralca where player_id = -947008)
  and (select count(*) = 2 from posnetki_brisanje where stream_uid like 'test-scout-%'));
select set_config('request.jwt.claim.sub','',true);

do $$
declare v_napak int;
begin
  select count(*) into v_napak from izidi where not uspeh;
  if v_napak>0 then raise exception '% varnostnih regresij', v_napak; end if;
  raise notice 'VSE OK: % preverjanj pravic in rokov', (select count(*) from izidi);
end;
$$;
rollback;
