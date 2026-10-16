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
select pg_temp.preveri('scout: scout_skrit privzeto false',
  (select column_default = 'false' from information_schema.columns
    where table_schema = 'public' and table_name = 'players' and column_name = 'scout_skrit'));
set local role anon;
select pg_temp.zavrnjeno('scout: anon ne bere kazalnikov', $$select * from scout.kazalniki$$);
reset role;
set local role authenticated;
select pg_temp.zavrnjeno('scout: authenticated ne bere moci lig', $$select * from scout.lige_moc$$);
select pg_temp.zavrnjeno('scout: authenticated ne odpre drzave', $$update scout.drzave set stanje = 'odprto'$$);
reset role;
select pg_temp.preveri('scout: stroj bere zapisnike in ne pise vanje',
  has_table_privilege('scout_stroj', 'public.appearances', 'SELECT')
  and not has_table_privilege('scout_stroj', 'public.players', 'UPDATE'));
select pg_temp.preveri('scout: anon in authenticated nimata sheme scout',
  not has_schema_privilege('anon', 'scout', 'USAGE') and not has_schema_privilege('authenticated', 'scout', 'USAGE'));

do $$
declare v_napak int;
begin
  select count(*) into v_napak from izidi where not uspeh;
  if v_napak>0 then raise exception '% varnostnih regresij', v_napak; end if;
  raise notice 'VSE OK: % preverjanj pravic in rokov', (select count(*) from izidi);
end;
$$;
rollback;
