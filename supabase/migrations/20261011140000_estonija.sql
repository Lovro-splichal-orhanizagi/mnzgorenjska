-- Estonija kot nova država (vmesnik v estonščini, pošta, kartica ob deljenju).
--
-- Zveze in tekmovanja vpiše svoja migracija; tu je le, kar je po državi:
--
-- 1. Država EE ("Eesti") v `countries`.
-- 2. Stiki s klubi (`klub_stik.drzava`) sprejmejo tudi EE.
-- 3. Hišne ekipe v Estoniji: prikazna imena lastnikov iz estonskih imen,
--    priimkov in vzdevkov ("Martin Tamm"). Funkcija je prepisana iz
--    zadnje definicije (20261010190000_romunija), dodana je le veja EE.
--
-- Estonske lige igrajo koledarsko sezono (marec–november); to ureja
-- `competitions.sezona_koledarska` v 20261011140100_koledarska_sezona.

insert into countries (code, name, sort_order) values ('EE', 'Eesti', 9) on conflict (code) do nothing;

alter table public.klub_stik drop constraint if exists klub_stik_drzava_check;
alter table public.klub_stik
  add constraint klub_stik_drzava_check check (drzava in ('SI', 'SK', 'HR', 'CZ', 'HU', 'AT', 'RS', 'RO', 'EE'));

create or replace function public.ime_hisnega_lastnika(p_id bigint, p_competition_id bigint)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_drzava text;
  v_imena text[];
  v_priimki text[];
  v_vzdevki text[];
  v_hash text;
  a bigint; b bigint; c bigint; d bigint;
  v_ime text;
  v_priimek text;
  v_rezultat text;
  v_poskus integer;
begin
  select coalesce(drz.code, 'SI') into v_drzava
    from competitions tek left join countries drz on drz.id = tek.country_id
    where tek.id = p_competition_id;
  if not found then return null; end if;
  if v_drzava = 'SK' then
    v_imena := array['Martin','Peter','Lukáš','Tomáš','Michal','Ján','Marek','Jozef',
      'Samuel','Jakub','Filip','Adam','Patrik','Dominik','Matej','Pavol',
      'Rastislav','Miroslav','Juraj','Šimon','Oliver','Andrej','Daniel','Viktor',
      'Matúš','Dušan','Roman','Erik','Denis','Kristián','Richard','Boris'];
    v_priimki := array['Kováč','Horváth','Varga','Tóth','Nagy','Baláž','Molnár','Lukáč',
      'Polák','Kučera','Urban','Kollár','Šimko','Bartoš','Hudák','Mikula',
      'Novotný','Kováčik','Švec','Šoltés','Farkaš','Králik','Štefánik','Bielik',
      'Oravec','Kmeť','Moravčík','Šťastný','Hruška','Sedlák','Blaško','Pavlík'];
    v_vzdevki := array['Matooo','peto','Luky','Tomi','Miso','Janci','Marecek','Jozo',
      'Samo','Kubo','Fifo','ado','Pato','Domco','Rasto','Miro',
      'simonko','Oli','Dano','Viki','Matulo','Duso','Romco','Erino',
      'Deny','Kiko','Riso','Borko','tichystrelec','lavickar','Horal','Kopacka'];
  elsif v_drzava = 'HR' then
    v_imena := array['Luka','Ivan','Marko','Josip','Petar','Matej','Filip','Karlo',
      'Ante','Mateo','Domagoj','Tomislav','Dario','Nikola','Stjepan','Mario',
      'Hrvoje','Kristijan','Leon','Fran','Jakov','Toni','Antonio','Dino',
      'Bruno','Marin','Lovro','Borna','Roko','Noa','Vito','Zvonimir'];
    v_priimki := array['Horvat','Kovačević','Babić','Marić','Jurić','Novak','Kovačić','Knežević',
      'Vuković','Marković','Petrović','Matić','Tomić','Pavlović','Kovač','Božić',
      'Blažević','Grgić','Pavić','Radić','Perić','Lovrić','Vidović','Šarić',
      'Jukić','Barišić','Kos','Mandić','Galić','Lončar','Filipović','Brkić'];
    v_vzdevki := array['Lukica','ivek','Maki','Jole','Pero','Matko','Fićo','Kale',
      'Antiša','Teo','Doma','Tomo','Darac','Niki','Štef','Mare',
      'Hrva','Krle','Leo','Franjo','Jaki','Tonči','Brune','Marinko',
      'Borna','Roki','Vito','Zvone','golgeter','klupaš','Purger','Dalmoš'];
  elsif v_drzava = 'CZ' then
    v_imena := array['Jakub','Jan','Tomáš','Lukáš','Matěj','Ondřej','Adam','Vojtěch',
      'David','Filip','Martin','Petr','Michal','Josef','Jiří','Pavel',
      'Marek','Daniel','Dominik','Šimon','Tadeáš','Štěpán','Vít','Radek',
      'Zdeněk','Karel','Miroslav','Roman','Libor','Aleš','Kryštof','Václav'];
    v_priimki := array['Novák','Svoboda','Novotný','Dvořák','Černý','Procházka','Kučera','Veselý',
      'Horák','Němec','Pospíšil','Pokorný','Hájek','Král','Jelínek','Růžička',
      'Beneš','Fiala','Sedláček','Doležal','Zeman','Kolář','Navrátil','Čermák',
      'Vaněk','Blažek','Kříž','Kovář','Bartoš','Vlček','Kopecký','Holub'];
    v_vzdevki := array['Kuba','honza','Tomik','Luky','Mates','Ondra','Vojta','Davča',
      'Fíla','Marťas','Peťan','Pepík','Jirka','Mára','Domča','Šimi',
      'Štěpa','Zdenda','Kája','Mirek','Romča','Vašek','okresák','lavičák',
      'Kanonýr','Kopyto','Stoper','Bombarďák','Sekáč','Halfák','pivko','Tunel'];
  elsif v_drzava = 'HU' then
    v_imena := array['Bence','Máté','Levente','Dávid','Balázs','Ádám','Dániel','Gergő',
      'Péter','Tamás','Zoltán','László','Gábor','Attila','Krisztián','Norbert',
      'Zsolt','Csaba','Roland','Richárd','Márk','Botond','Bálint','Marcell',
      'Kristóf','Patrik','Olivér','Barnabás','Tibor','Ferenc','István','Sándor'];
    v_priimki := array['Nagy','Kovács','Tóth','Szabó','Horváth','Varga','Kiss','Molnár',
      'Németh','Farkas','Balogh','Papp','Takács','Juhász','Lakatos','Mészáros',
      'Oláh','Simon','Rácz','Fekete','Szilágyi','Török','Fehér','Balázs',
      'Gál','Kis','Szűcs','Kocsis','Orsós','Pintér','Fodor','Szalai'];
    v_vzdevki := array['Bencó','Matyi','Levi','Dave','Balu','Ádi','Dani','Geri',
      'Peti','Tomi','Zoli','Laci','Gabi','Atti','Krisz','Norbi',
      'Zsolti','Csabi','Roli','Ricsi','Márkó','Boti','Bali','Marci',
      'Öcsi','Tüske','Öreg','Ágyú','Bombázó','Kapufa','kispados','Gólzsák'];
  elsif v_drzava = 'AT' then
    v_imena := array['Lukas','Tobias','Florian','Maximilian','David','Simon','Fabian','Julian',
      'Elias','Jakob','Felix','Michael','Stefan','Thomas','Andreas','Christoph',
      'Daniel','Patrick','Dominik','Matthias','Sebastian','Alexander','Philipp','Martin',
      'Markus','Manuel','Bernhard','Georg','Johannes','Raphael','Valentin','Moritz'];
    v_priimki := array['Gruber','Huber','Bauer','Wagner','Müller','Pichler','Steiner','Moser',
      'Mayer','Hofer','Leitner','Berger','Fuchs','Eder','Fischer','Schmid',
      'Winkler','Weber','Schwarz','Maier','Schneider','Reiter','Mayr','Schmidt',
      'Wimmer','Egger','Brunner','Lang','Baumgartner','Auer','Binder','Lechner'];
    v_vzdevki := array['Luki','Tobi','Flo','Maxi','Davo','Simi','Fabi','Juli',
      'Eli','Jaki','Fexi','Michi','Steff','Tom','Andi','Christl',
      'Dani','Pazi','Dome','Hiasi','Basti','Alex','Phips','Tinu',
      'Mäx','Manu','Bernie','Schurl','Hansi','Rafi','Vali','Mo'] ||
      array['Goalgetter','Bankdrücker','Kicker','Unterhausler','Grantler','Wadlbeißer','Knipser','Gatschkönig'];
  elsif v_drzava = 'RS' then
    v_imena := array['Luka','Stefan','Nikola','Marko','Lazar','Filip','Aleksa','Nemanja',
      'Miloš','Uroš','Vuk','Dušan','Strahinja','Ognjen','Đorđe','Vladimir',
      'Milan','Petar','Jovan','Andrija','Dimitrije','Mihajlo','Bogdan','Pavle',
      'Vukašin','Veljko','Relja','Zoran','Dragan','Goran','Igor','Sava'];
    v_priimki := array['Jovanović','Petrović','Nikolić','Marković','Đorđević','Stojanović','Ilić','Stanković',
      'Pavlović','Milošević','Popović','Đokić','Kostić','Stefanović','Živković','Todorović',
      'Ristić','Lazić','Simić','Mitrović','Radovanović','Jovičić','Savić','Kovačević',
      'Tomić','Milenković','Vasić','Obradović','Lukić','Nedeljković','Bogdanović','Perić'];
    v_vzdevki := array['Luki','Stefke','Nidža','Mare','Laki','Fića','Aki','Neša',
      'Miki','Uki','Vule','Dule','Strale','Ogi','Đole','Vlada',
      'Mile','Pera','Joca','Andri','Dimi','Mika','Boki','Paja',
      'Veki','Sale','Zoki','Gale','golgeter','klupaš','Bombarder','Kapiten'];
  elsif v_drzava = 'RO' then
    v_imena := array['Andrei','Alexandru','Mihai','Ionuț','Ștefan','Gabriel','Cristian','Florin',
      'Bogdan','Marius','Vlad','Răzvan','Adrian','George','Darius','Matei',
      'David','Radu','Sorin','Cosmin','Claudiu','Ciprian','Paul','Tudor',
      'Sebastian','Robert','Daniel','Costin','Ovidiu','Dragoș','Lucian','Victor'];
    v_priimki := array['Popescu','Ionescu','Popa','Pop','Radu','Dumitru','Stan','Stoica',
      'Gheorghe','Matei','Ciobanu','Rusu','Munteanu','Constantin','Marin','Dinu',
      'Florea','Ilie','Mihăilă','Moldovan','Barbu','Toma','Lungu','Tudose',
      'Neagu','Ungureanu','Dobre','Nistor','Enache','Sârbu','Lazăr','Oprea'];
    v_vzdevki := array['Andreiuț','Alex','Mihăiță','Ionică','Ștefi','Gabi','Cristi','Flo',
      'Bogdi','Mariusica','Vlăduț','Răzvi','Adi','Gică','Dari','Mati',
      'Davi','Rădiță','Sori','Cosmi','Clau','Cipi','Tudi','Sebi',
      'Robi','Costi','golgheter','rezervistul','Bombardierul','Căpitanul','Tunarul','Ultrasul'];
  elsif v_drzava = 'EE' then
    v_imena := array['Martin','Rasmus','Markus','Robin','Kristjan','Mihkel','Andres','Tanel',
      'Siim','Karl','Oliver','Sander','Kevin','Marten','Rando','Taavi',
      'Margus','Indrek','Priit','Jaan','Mart','Tõnis','Kaspar','Hendrik',
      'Joosep','Artur','Henri','Kaarel','Ott','Rein','Urmas','Lauri'];
    v_priimki := array['Tamm','Saar','Sepp','Mägi','Kask','Kukk','Rebane','Ilves',
      'Pärn','Koppel','Lepik','Kuusk','Karu','Kallas','Lill','Põder',
      'Oja','Kõiv','Mets','Raudsepp','Vaher','Teder','Kivi','Laur',
      'Jõgi','Kuusik','Luik','Lepp','Valk','Org','Paju','Unt'];
    v_vzdevki := array['Marts','Rassu','Mats','Robi','Kristo','Mihu','Ants','Tanku',
      'Siimu','Kalle','Olli','Sass','Kev','Mardu','Rants','Taavo',
      'Maku','Indu','Priidu','Jaku','Tõnu','Kasper','Henkka','Joss',
      'Arts','Kaarlik','väravakütt','pingisoojendaja','Kahur','Kapten','Ründemasin','Müür'];
  else
    v_imena := array['Luka','Matej','Marko','Rok','Jan','Miha','Nejc','Žan',
      'Andrej','Blaž','Jure','Tomaž','Gregor','Aljaž','David','Anže',
      'Nik','Tim','Gašper','Žiga','Urban','Lučka','Matic','Domen',
      'Nace','Jaka','Simon','Vid','Klemen','Primož','Tilen','Bor'];
    v_priimki := array['Novak','Horvat','Kovačič','Krajnc','Zupančič','Potočnik','Kovač','Mlakar',
      'Vidmar','Kos','Golob','Turk','Božič','Korošec','Zupan','Rozman',
      'Kavčič','Kralj','Zajc','Bizjak','Kastelic','Hribar','Hočevar','Kokalj',
      'Koren','Zver','Kotnik','Jerman','Medved','Dolenc','Bregar','Pirc'];
    v_vzdevki := array['Lukiii','mateyy','markec','Roki','janko','Mihc','nejko','Zanny',
      'blazko','Jurc','tomii','Grega','Aljo','Davy','Anzi','niko',
      'Timmy','Gaspo','Zigi','Urbii','Mati','Domc','nacek','Jaky',
      'Simi','Vidoo','Klemi','Primc','Tili','Borci','levica','rezervist'];
  end if;
  v_vzdevki := v_vzdevki || array['LilManni','elMago','NoLook','Vamos','Kappa',
    'baller','Ninoo','Rivoo','Zizouu','IlCapitano','Maverik','ChillBoy','Kiki',
    'Panenka','TikiTaka','TopBins','Rabona','lilmomo','Vamoss','ElPibe',
    'Nexxo','JogaBonito','Piksi','Futbolero'];

  for v_poskus in 0..255 loop
    v_hash := md5('slff-display-v2:' || p_competition_id || ':' || p_id || ':' || v_poskus);
    a := ('x' || substr(v_hash,1,8))::bit(32)::bigint;
    b := ('x' || substr(v_hash,9,8))::bit(32)::bigint;
    c := ('x' || substr(v_hash,17,8))::bit(32)::bigint;
    d := ('x' || substr(v_hash,25,8))::bit(32)::bigint;
    v_ime := v_imena[1 + (b % cardinality(v_imena))::int];
    v_priimek := v_priimki[1 + (c % cardinality(v_priimki))::int];
    if a % 100 < 30 then
      v_rezultat := case when v_drzava = 'HU' then v_priimek || ' ' || v_ime else v_ime || ' ' || v_priimek end;
    elsif a % 100 < 50 then
      v_rezultat := case when d % 3 = 0 then lower(v_ime) else v_ime end;
    elsif a % 100 < 65 then
      v_rezultat := upper(case when v_drzava = 'HU' then left(v_priimek,1) || left(v_ime,1) else left(v_ime,1) || left(v_priimek,1) end)
        || (array['7','10','11','9','21','99','23','77','08','18','01','04'])[1+(d%12)::int];
    else
      v_rezultat := v_vzdevki[1 + (b % cardinality(v_vzdevki))::int];
      if c % 4 = 0 then
        v_rezultat := v_rezultat || (array['7','10','11','9','21','99','23','77','08','18','01','04'])[1+(d%12)::int];
      elsif c % 4 = 1 then
        v_rezultat := lower(v_rezultat) || case when d % 2 = 0 then '_' else '' end || (1+d%98)::text;
      end if;
    end if;
    -- Isto ime v ligi ne sme pripadati drugi hišni ali človeški ekipi.
    if not exists (
      select 1 from fantasy_teams ft join profiles pr on pr.id = ft.owner_id
      where ft.competition_id = p_competition_id and ft.id <> p_id
        and lower(case when ft.hisna then ft.display_name else pr.display_name end) = lower(v_rezultat)
    ) then return v_rezultat; end if;
  end loop;
  raise exception 'Ni prostega prikaznega imena za hišno ekipo %.', p_id;
end;
$function$;
