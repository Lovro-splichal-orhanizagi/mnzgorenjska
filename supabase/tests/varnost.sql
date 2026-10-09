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
update rounds set deadline_at=clock_timestamp()-interval '1 millisecond' where id=-913002;
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
-- Navaden glas (utez 1) pod pragom: pozicija ostane.
insert into position_votes(player_id, voter_id, position) values (-913016, auth.uid(), 'FWD');
reset role;
-- Pozicije se uveljavijo tedensko (uveljavi_pozicije), ne ob glasu.
select uveljavi_pozicije();
select pg_temp.preveri('en navaden glas pozicije ne potrdi',
  (select position='MID' from players where id=-913016));

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
select pg_temp.preveri('pregled: kapetan, klop in adut',
  (select (j->'kapetan'->>'igralec_id')::bigint = -914001 and (j->'kapetan'->>'skupaj')::numeric = 30
      and (j->'klop'->>'ekipa_id')::bigint = -914001 and (j->'klop'->>'tocke')::numeric = 7
      and (j->'adut'->>'igralec_id')::bigint = -914005 from pregled));
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
select pg_temp.preveri('izbranost steje samo cloveske ekipe',
  (select owners = (select count(*) from fantasy_lineups where round_id=-913004 and player_id=-913002
                      and fantasy_team_id not in (select id from hisne))
     from player_standings where id=-913002 and competition_id=-913001));
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
reset role;
select set_config('request.jwt.claim.sub','b8a06635-2322-4444-8c42-44e419f912ab',true);
set local role authenticated;
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

do $$
declare v_napak int;
begin
  select count(*) into v_napak from izidi where not uspeh;
  if v_napak>0 then raise exception '% varnostnih regresij', v_napak; end if;
  raise notice 'VSE OK: % preverjanj pravic in rokov', (select count(*) from izidi);
end;
$$;
rollback;
