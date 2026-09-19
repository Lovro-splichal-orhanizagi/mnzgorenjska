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

do $$
declare v_napak int;
begin
  select count(*) into v_napak from izidi where not uspeh;
  if v_napak>0 then raise exception '% varnostnih regresij', v_napak; end if;
  raise notice 'VSE OK: % preverjanj pravic in rokov', (select count(*) from izidi);
end;
$$;
rollback;
