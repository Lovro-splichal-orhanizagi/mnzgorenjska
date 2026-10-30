-- San Marino: država za vklop (angleški vmesnik brez lastnega slovarja, kot
-- JP, HK, TH in GI v 20261028131500) in liga Campionato Sammarinese z vira
-- `fsgc` (fsgc.sm, HTML, ki ga izriše strežnik).
--
-- Campionato Sammarinese je edina članska liga (16 klubov, 30 krogov,
-- avgust–april; nato končnica, ki je ne uvažamo). Šifra lige je
-- `<slug>-<id prvenstva>/<season_id>`: 2026/27 `campionato-sammarinese-1/48`;
-- arhiv 2025/26 `campionato-sammarinese-1/19`, 2024/25 `…-1/1`
-- (docs/viri/sanmarino.md).
--
-- 1. Država SM, zveza fsgc in liga sm-campionato — NEAKTIVNA; uvozi niso bili
--    pognani.
-- 2. klub_stik.drzava sprejme SM (zadnja definicija 20261028131500, nič
--    odvzeto).
-- 3. `ime_hisnega_lastnika` je zadnja definicija (20261028131500) z vejo SM:
--    izmišljena imena lastnikov hišnih ekip z italijanskim pridihom, brez imen
--    pravih igralcev.

insert into countries (code, name, sort_order) values ('SM', 'San Marino', 22) on conflict (code) do nothing;

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select d.id, 'fsgc', 'Federazione Sammarinese Giuoco Calcio', 'FSGC', 'https://www.fsgc.sm/', 2201
  from countries d
 where d.code = 'SM'
on conflict (code) do nothing;

insert into competitions (
  slug, name, short_name, country_id, federation_id,
  source, source_league_code, prvi_fantasy_krog, sort_order, rok_pomak_ur, active,
  vir_ime, vir_url, sezona_koledarska
)
select 'sm-campionato', 'Campionato Sammarinese', 'Campionato', d.id, f.id,
       'fsgc', 'campionato-sammarinese-1/48', 1, 1, 6, false,
       'FSGC', 'https://www.fsgc.sm/it/campionato/campionato-sammarinese/1', false
  from countries d
  join federations f on f.code = 'fsgc'
 where d.code = 'SM'
on conflict (slug) do nothing;

alter table public.klub_stik drop constraint if exists klub_stik_drzava_check;
alter table public.klub_stik
  add constraint klub_stik_drzava_check check (drzava in (
    'SI', 'SK', 'HR', 'CZ', 'HU', 'AT', 'RS', 'RO', 'EE', 'PL', 'ES', 'LV', 'MK',
    'GR', 'TR', 'UA', 'AM', 'AZ', 'DK', 'GB', 'MT', 'ME', 'BA', 'MD', 'DE',
    'JP', 'HK', 'TH', 'GI', 'SM'
  ));

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
  elsif v_drzava = 'PL' then
    v_imena := array['Jakub','Kacper','Szymon','Filip','Mateusz','Michał','Bartosz','Wojciech',
      'Piotr','Paweł','Tomasz','Krzysztof','Łukasz','Marcin','Adam','Dawid',
      'Kamil','Damian','Sebastian','Patryk','Mikołaj','Antoni','Jan','Oskar',
      'Igor','Hubert','Maciej','Grzegorz','Rafał','Przemysław','Dominik','Wiktor'];
    v_priimki := array['Nowak','Kowalski','Wiśniewski','Wójcik','Kowalczyk','Kamiński','Lewandowski','Zieliński',
      'Szymański','Woźniak','Dąbrowski','Kozłowski','Jankowski','Mazur','Kwiatkowski','Krawczyk',
      'Piotrowski','Grabowski','Nowakowski','Pawłowski','Michalski','Adamczyk','Dudek','Zając',
      'Wieczorek','Jabłoński','Król','Majewski','Olszewski','Jaworski','Wróbel','Malinowski'];
    v_vzdevki := array['Kuba','Kacperek','Szymek','Filo','Mati','Misiek','Bartek','Wojtek',
      'Piotrek','Pawełek','Tomek','Krzychu','Łuki','Marcinek','Adaś','Dawidek',
      'Kamilek','Damek','Seba','Patryś','Miki','Antek','Janek','Oski',
      'Hubi','Grzesiu','Przemo','Domi','snajper','ławkowicz','Kanonier','Kapitan'];
  elsif v_drzava = 'ES' then
    v_imena := array['Javier','Alejandro','Daniel','Pablo','David','Adrián','Sergio','Álvaro',
      'Carlos','Hugo','Mario','Diego','Manuel','Antonio','José','Juan',
      'Iván','Rubén','Raúl','Jorge','Marcos','Miguel','Alberto','Fernando',
      'Óscar','Íñigo','Unai','Jordi','Marc','Xabier','Iker','Ignacio'];
    v_priimki := array['García','Fernández','González','Rodríguez','López','Martínez','Sánchez','Pérez',
      'Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz',
      'Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez',
      'Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Castro','Ortega'];
    v_vzdevki := array['Javi','Álex','Dani','Pablete','Davo','Adri','Sergi','Alvarito',
      'Charly','Huguito','Mariete','Dieguito','Manolo','Toni','Pepe','Juanma',
      'Rubo','Raulito','Jorgito','Marquitos','Migue','Fer','Oscarín','Nacho',
      'Chema','Paco','Kike','Txema','pichichi','calientabanquillos','Cañonero','Capi'];
  elsif v_drzava = 'LV' then
    v_imena := array['Jānis','Andris','Mārtiņš','Edgars','Kristaps','Artūrs','Roberts','Raivis',
      'Kārlis','Dāvis','Rihards','Gints','Aigars','Uldis','Toms','Mārcis',
      'Ēriks','Reinis','Valdis','Juris','Oskars','Normunds','Guntis','Aivars',
      'Emīls','Ralfs','Niks','Gustavs','Kristiāns','Matīss','Ivars','Pēteris'];
    v_priimki := array['Bērziņš','Kalniņš','Ozoliņš','Jansons','Ozols','Liepiņš','Krūmiņš','Balodis',
      'Eglītis','Zariņš','Pētersons','Vītols','Kļaviņš','Kārkliņš','Vanags','Lācis',
      'Siliņš','Grīnbergs','Kalējs','Zeltiņš','Lapiņš','Strazdiņš','Āboliņš','Dūmiņš',
      'Puriņš','Ābele','Kronbergs','Zvirbulis','Rozītis','Skujiņš','Pūpols','Sproģis'];
    v_vzdevki := array['Jančuks','Andžs','Mārčuks','Edžus','Krišs','Arčijs','Robis','Raivčiks',
      'Kārlēns','Dāvčiks','Riks','Gincis','Aigaris','Uldiņš','Tomiņš','Marcītis',
      'Ēričs','Reinītis','Valdiņš','Jurčiks','Oskītis','Normis','Guncis','Aivčiks',
      'Emīlītis','Ralfiņš','Snaiperis','rezervists','Lielgabals','Kapteinis','Bumbvedējs','Mūris'];
  elsif v_drzava = 'MK' then
    v_imena := array['Александар','Никола','Стефан','Филип','Марко','Давид','Матеј','Бојан',
      'Дарко','Горан','Игор','Иван','Благој','Владимир','Драган','Зоран',
      'Методија','Кирил','Петар','Мартин','Андреј','Христијан','Ристе','Томе',
      'Трајче','Ѓорѓи','Јован','Лука','Димитар','Борис','Влатко','Енис'];
    v_priimki := array['Стојановски','Петровски','Николовски','Трајковски','Јовановски','Димитровски','Илиевски','Ристовски',
      'Костовски','Андоновски','Стефановски','Митрески','Велковски','Атанасовски','Наумовски','Ангеловски',
      'Тодоровски','Спасовски','Пановски','Јанев','Георгиев','Митев','Стојанов','Ѓорѓиев',
      'Алиу','Бајрами','Мемети','Исмаили','Шабани','Ибраими','Стојков','Блажевски'];
    v_vzdevki := array['Аце','Нико','Стефче','Фики','Маки','Дачо','Мате','Бојче',
      'Даре','Гоце','Иги','Иванче','Блаже','Влаче','Гаго','Зоки',
      'Мето','Кире','Перо','Мартинче','Андре','Ицо','Рисе','Томче',
      'Трајче','Ѓоше','Јоца','Луке','golgeter','rezerva','Topcija','Kapiten'];
  elsif v_drzava = 'GR' then
    v_imena := array['Γιώργος','Δημήτρης','Νίκος','Κώστας','Γιάννης','Χρήστος','Παναγιώτης','Βασίλης',
      'Θανάσης','Μιχάλης','Αντώνης','Σπύρος','Στέλιος','Ηλίας','Μανώλης','Λευτέρης',
      'Άγγελος','Αλέξανδρος','Στάθης','Παύλος','Τάσος','Πέτρος','Φώτης','Μάριος',
      'Θοδωρής','Σωτήρης','Αποστόλης','Λάμπρος','Άρης','Στράτος','Ορέστης','Βαγγέλης',
      'Χαράλαμπος','Ανδρέας','Κυριάκος','Πάνος','Ζήσης','Γρηγόρης','Μάνος','Τάκης'];
    v_priimki := array['Παπαδόπουλος','Παπαδάκης','Γεωργίου','Οικονόμου','Νικολάου','Δημητρίου','Ιωάννου','Κωνσταντίνου',
      'Παπανικολάου','Αθανασίου','Βασιλείου','Χριστοδούλου','Αντωνίου','Μαυρίδης','Καραγιάννης','Παπαγεωργίου',
      'Μακρής','Αλεξίου','Πετρόπουλος','Σταματόπουλος','Κωστόπουλος','Νικολόπουλος','Γεωργιάδης','Ιωαννίδης',
      'Παπαδημητρίου','Καραλής','Λαμπρόπουλος','Ζαχαρίου','Μιχαηλίδης','Θεοδωρόπουλος','Αναστασίου','Παναγιώτου',
      'Σωτηρίου','Ευαγγέλου','Χατζηδάκης','Σαββίδης','Τσακίρης','Κυριακίδης','Μανωλάκης','Βλάχος',
      'Τζανετάκης','Δασκαλάκης','Σπυρόπουλος','Φραγκιαδάκης','Μουρατίδης','Πολυχρόνης','Γκίκας','Ρήγας',
      'Καλογεράκης','Μπαλτάς','Χατζόπουλος','Αργυρίου','Κοντός','Ζερβός','Λιάπης','Μπούρας',
      'Ντόκος','Αλεξανδρόπουλος','Κατσαρός','Παππάς'];
    v_vzdevki := array['Τζώρτζης','Μήτσος','Νικολάκης','Κωστάκης','Γιαννάκης','Χρηστάκης','Πάνος','Βασιλάκης',
      'Θανασάκης','Μιχαλάκης','Τόνι','Σπυράκος','Στελάρας','Λιάκος','Μανωλιός','Λευτεράκης',
      'Αλέκος','Στάθης','Τασούλης','Πετράκης','Φωτάκης','Μάρι','Θοδωράκης','Σωτηράκης',
      'Τόλης','Λάμπης','σκόρερ','πάγκος','Κανόνι','Αρχηγάρα','Τείχος','Μάγος'];
  elsif v_drzava = 'TR' then
    v_imena := array['Mehmet','Mustafa','Ahmet','Ali','Hüseyin','Hasan','Erkan','Murat',
      'Emre','Burak','Yusuf','Ömer','Can','Kerem','Arda','Eren',
      'Furkan','Oğuzhan','Serkan','Hakan','Volkan','Onur','Barış','Tolga',
      'Uğur','Selim','Cem','Deniz','Efe','Kaan','Berk','Batuhan',
      'Enes','Mert','Ozan','Halil','Recep','Sinan','Gökhan','Umut'];
    v_priimki := array['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Yıldırım','Öztürk',
      'Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara',
      'Koç','Kurt','Özkan','Şimşek','Polat','Özcan','Korkmaz','Çakır',
      'Ekinci','Yavuz','Can','Acar','Şen','Aktaş','Güler','Yalçın',
      'Güneş','Bozkurt','Bulut','Keskin','Ünal','Turan','Gül','Özer',
      'Işık','Kaplan','Avcı','Sarı','Tekin','Taş','Köse','Yüksel',
      'Ateş','Aksoy','Karaca','Uçar','Akın','Bayram','Sönmez','Duman',
      'Erdem','Tunç','Kocabaş','Karataş'];
    v_vzdevki := array['Memo','Musti','Ahmo','Hüso','Hasso','Muro','Burki','Yuso',
      'Canko','Kero','Ardo','Erenko','Furki','Oğuz','Serko','Hakko',
      'Volki','Onurcan','Barço','Tolgi','Uğurcan','Selo','Cemo','Deno',
      'Efo','Kaanito','golcü','yedekçi','halısahacı','Reis','Hocam','Usta'];
  elsif v_drzava = 'UA' then
    v_imena := array['Олександр','Андрій','Дмитро','Максим','Іван','Сергій','Богдан','Тарас',
      'Микола','Юрій','Василь','Олег','Віталій','Владислав','Артем','Денис',
      'Назар','Остап','Ярослав','Роман','Михайло','Петро','Степан','Тимофій',
      'Матвій','Данило','Кирило','Євген','Ігор','Руслан','Святослав','Віктор',
      'Антон','Павло','Орест','Захар','Марко','Вадим','Ілля','Ростислав'];
    v_priimki := array['Мельник','Шевченко','Коваленко','Бондаренко','Бойко','Ткаченко','Кравченко','Ковальчук',
      'Коваль','Олійник','Шевчук','Поліщук','Лисенко','Бондар','Мороз','Марченко',
      'Ткачук','Павленко','Савченко','Руденко','Кравчук','Іваненко','Петренко','Клименко',
      'Гончаренко','Романенко','Левченко','Карпенко','Кузьменко','Савчук','Василенко','Мельничук',
      'Захарченко','Тарасенко','Литвиненко','Павлюк','Гуменюк','Онищенко','Костенко','Пономаренко',
      'Федоренко','Гриценко','Дмитренко','Яковенко','Кушнір','Гнатюк','Остапчук','Козак',
      'Демченко','Сидоренко','Приходько','Білик','Семенюк','Мартинюк','Гаврилюк','Юрченко',
      'Нестеренко','Панченко','Вовк','Головко'];
    v_vzdevki := array['Саня','Діма','Макс','Ваня','Сергійко','Бодя','Тарасик','Коля',
      'Юрко','Вася','Олежка','Віталік','Влад','Тьома','Деня','Назарчик',
      'Остапчик','Ярик','Ромко','Мішаня','Петрусь','Стьопа','Тимко','Даня',
      'Кирюха','Женя','Ігорко','Русик','golkiper','zapasnyi','Kapitan','Bombardyr'];
  elsif v_drzava = 'AM' then
    v_imena := array['Արամ','Արման','Արթուր','Գոռ','Դավիթ','Էդգար','Հայկ','Տիգրան',
      'Նարեկ','Սամվել','Վահե','Վարդան','Արսեն','Արտակ','Արմեն','Գևորգ',
      'Կարեն','Լևոն','Միքայել','Մհեր','Ռուբեն','Սարգիս','Վազգեն','Աշոտ',
      'Գագիկ','Համլետ','Հովհաննես','Ժիրայր','Խաչատուր','Մանվել','Ռաֆայել','Սուրեն',
      'Արշակ','Էրիկ','Նորայր','Արտյոմ','Գրիգոր','Սևակ','Տարոն','Ալեն'];
    v_priimki := array['Հովհաննիսյան','Հարությունյան','Սարգսյան','Խաչատրյան','Գրիգորյան','Պետրոսյան','Հակոբյան','Վարդանյան',
      'Կարապետյան','Գևորգյան','Մկրտչյան','Ավետիսյան','Մարտիրոսյան','Սահակյան','Ղազարյան','Մանուկյան',
      'Պողոսյան','Ստեփանյան','Մարգարյան','Դավթյան','Աբրահամյան','Բաղդասարյան','Հովսեփյան','Մովսիսյան',
      'Առաքելյան','Ալեքսանյան','Զաքարյան','Թադևոսյան','Ներսիսյան','Մելքոնյան','Աղաջանյան','Եղիազարյան',
      'Հայրապետյան','Մինասյան','Սիմոնյան','Ասատրյան','Գասպարյան','Բարսեղյան','Մաթևոսյան','Համբարձումյան',
      'Օհանյան','Մուրադյան','Աթոյան','Եսայան','Զոհրաբյան','Թորոսյան','Չոբանյան','Ադամյան',
      'Գալստյան','Իսրայելյան','Կիրակոսյան','Շահինյան','Սաֆարյան','Բադալյան','Դանիելյան','Նազարյան',
      'Խաչիկյան','Ղուկասյան','Սեդրակյան','Անտոնյան'];
    v_vzdevki := array['Արո','Արմո','Գոռո','Դավո','Էդո','Հայկո','Տիկո','Նարո',
      'Սամո','Վահո','Վարդո','Արսո','Գևո','Կարո','Լևո','Միքո',
      'Մհո','Ռուբո','Սաքո','Վազո','Աշո','Գագո','Համո','Հովո',
      'Ժիրո','Խաչո','Մանո','Սուրո','Ախպեր','rmbarku','zapas','Kapitan'];
  elsif v_drzava = 'AZ' then
    v_imena := array['Elvin','Rəşad','Tural','Orxan','Kamran','Ramil','Elçin','Nicat',
      'Vüqar','Fərid','Rauf','Emin','Ruslan','Murad','Səbuhi','Anar',
      'Ceyhun','Elnur','Mahir','Namiq','Ülvi','Fuad','Cavid','Vüsal',
      'Toğrul','Rəhim','Samir','Eldəniz','Kənan','Zaur','Tərlan','Nurlan',
      'Ayxan','Yusif','Hüseyn','Əli','Ömər','Rüfət','Şahin','Bəxtiyar'];
    v_priimki := array['Məmmədov','Həsənov','Hüseynov','Quliyev','Abbasov','Rzayev','Cəfərov','Nəsirov',
      'Babayev','Süleymanov','Kərimov','Mustafayev','Qasımov','Vəliyev','Rəhimov','İsmayılov',
      'İbrahimov','Əhmədov','Salmanov','Bayramov','Novruzov','Zeynalov','Orucov','Sadıqov',
      'Nağıyev','Hacıyev','Musayev','Talıbov','Şirinov','Allahverdiyev','Paşayev','Ağayev',
      'Tağıyev','Səfərov','Bağırov','Qurbanov','Mirzəyev','Kazımov','Rüstəmov','Əsgərov',
      'Yusifov','Məhərrəmov','Fətullayev','Cavadov','Xəlilov','Sultanov','Rəsulov','Şükürov',
      'Dadaşov','Eyvazov','Hümbətov','Qafarov','Bəşirov','Mehdiyev','Əfəndiyev','Zülfüqarov',
      'Seyidov','Abdullayev','Əlizadə','Məmmədli'];
    v_vzdevki := array['Elvo','Rəşo','Turik','Orxo','Kamo','Ramo','Nico','Vuqo',
      'Fero','Rufo','Emo','Ruso','Muro','Səbo','Ceyho','Mahi',
      'Cavo','Vusi','Toğo','Samo','Kəno','Zauro','Nuro','Yusi',
      'qolçu','ehtiyatçı','Bombardir','Kapitan','Usta','Qardaş','Lider','Topçu'];
  elsif v_drzava = 'DK' then
    v_imena := array['Mads','Mikkel','Frederik','Rasmus','Kasper','Jonas','Emil','Mathias',
      'Lucas','Oliver','Magnus','Christian','Anders','Jesper','Morten','Søren',
      'Thomas','Martin','Nikolaj','Simon','Jakob','Mikael','Henrik','Lars',
      'Peter','Kristian','Andreas','Tobias','Sebastian','Victor','Malthe','William',
      'Noah','Oscar','Alexander','Rune','Kim','Brian','Bo','Nicklas'];
    v_priimki := array['Jensen','Nielsen','Hansen','Pedersen','Andersen','Christensen','Larsen','Sørensen',
      'Rasmussen','Jørgensen','Petersen','Madsen','Kristensen','Olsen','Thomsen','Christiansen',
      'Poulsen','Johansen','Møller','Mortensen','Knudsen','Jakobsen','Mikkelsen','Olesen',
      'Frederiksen','Laursen','Henriksen','Lund','Schmidt','Holm','Eriksen','Kristiansen',
      'Clausen','Simonsen','Svendsen','Andreasen','Iversen','Østergaard','Jeppesen','Vestergaard',
      'Nissen','Lauridsen','Kjær','Jespersen','Mogensen','Nørgaard','Jessen','Søndergaard',
      'Bach','Dahl','Bertelsen','Kjeldsen','Carlsen','Toft','Brandt','Lassen',
      'Overgaard','Gregersen','Friis','Damgaard'];
    v_vzdevki := array['Madse','Mikke','Frede','Ras','Kasse','Jonse','Emse','Mathi',
      'Luxe','Olle','Magge','Chrille','Anden','Jeppe','Mogge','Søffe',
      'Tommy','Mart','Nikse','Simse','Kobe','Henke','Lasse','Pete',
      'Kris','Dres','Tobse','Basse','målmaskine','bænkevarmer','Kanonen','Anføreren'];
  elsif v_drzava = 'GB' then
    v_imena := array['Jack','Harry','Oliver','George','Charlie','Thomas','James','William',
      'Alfie','Joshua','Daniel','Ryan','Liam','Connor','Callum','Jamie',
      'Ben','Sam','Luke','Adam','Matt','Craig','Scott','Lewis',
      'Kieran','Dean','Gary','Lee','Stuart','Ross','Euan','Fraser',
      'Rhys','Owen','Ethan','Archie','Finlay','Jordan','Reece','Nathan'];
    v_priimki := array['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies',
      'Robinson','Wright','Thompson','Evans','Walker','White','Roberts','Green',
      'Hall','Wood','Jackson','Clarke','Patel','Hughes','Edwards','Turner',
      'Harris','Lewis','Hill','Moore','Cooper','Ward','Morris','King',
      'Watson','Baker','Harrison','Morgan','Murphy','Bell','Kelly','Campbell',
      'Stewart','MacDonald','Robertson','Thomson','Anderson','Scott','Reid','Murray',
      'Ross','Fraser','Henderson','Paterson','Hamilton','Graham','Kerr','Sutherland',
      'Ferguson','Mitchell','Kennedy','Hunter'];
    v_vzdevki := array['Jacko','Haz','Olly','Gaz','Chaz','Tommo','Jimbo','Billy',
      'Alfie','Joshy','Danno','Rhino','Macca','Smudge','Robbo','Wrighty',
      'Evo','Woody','Spud','Tank','Stevo','Scotty','Lewy','Kez',
      'Deano','Rossy','benchwarmer','goalhanger','Gaffer','Skipper','Hotshot','Wellies'];
  elsif v_drzava = 'MT' then
    v_imena := array['Joseph','John','Mark','Matthew','Luke','Daniel','Ryan','Jean',
      'Kurt','Clayton','Jurgen','Andre','Karl','Neil','Gareth','Keith',
      'Steve','Shaun','Jake','Zach','Gabriel','Nicholas','Miguel','Carlos',
      'Mario','Ġorġ','Ġużeppi','Pawlu','Ċensu','Toni','Manwel','Kristjan',
      'Matthias','Jesmond','Glenn','Owen','Jeremy','Etienne','Malcolm','Rodney'];
    v_priimki := array['Borg','Camilleri','Vella','Farrugia','Zammit','Galea','Micallef','Grech',
      'Attard','Spiteri','Azzopardi','Mifsud','Agius','Fenech','Cassar','Pace',
      'Sammut','Caruana','Mallia','Debono','Bonnici','Sultana','Schembri','Gauci',
      'Calleja','Xuereb','Zahra','Mizzi','Cutajar','Cauchi','Bugeja','Ellul',
      'Formosa','Saliba','Tabone','Bartolo','Buttigieg','Portelli','Falzon','Gatt',
      'Aquilina','Briffa','Scicluna','Dalli','Psaila','Magro','Pisani','Busuttil',
      'Chircop','Darmanin','Frendo','Grima','Mangion','Pullicino','Sciberras','Vassallo',
      'Zerafa','Bezzina','Cilia','Mercieca'];
    v_vzdevki := array['Ġużi','Pawlinu','Ċensinu','Toninu','Manwi','Ġiġi','Kikki','Joey',
      'Matty','Danny','Kurtu','Jeanu','Nikki','Clay','Jurgi','Gabri',
      'Mariu','Karlu','Shauny','Jakey','Zachy','Miggy','Steffy','Keithu',
      'Andy','Glennu','Rodu','Malki','golgetter','riżerva','Il-Kaptan','Il-Bomber'];
  elsif v_drzava = 'ME' then
    v_imena := array['Marko','Nikola','Luka','Stefan','Milan','Vuk','Petar','Filip',
      'Danilo','Aleksa','Andrija','Balša','Vasilije','Dušan','Nemanja','Miloš',
      'Ognjen','Srđan','Vladimir','Igor','Dejan','Darko','Željko','Mirko',
      'Radomir','Božidar','Bogdan','Lazar','Pavle','Jovan','Mihailo','Strahinja',
      'Sava','Đorđe','Novak','Žarko','Veljko','Momčilo','Rade','Blažo'];
    v_priimki := array['Popović','Vujović','Radović','Vukčević','Vuković','Đurović','Perović','Bojović',
      'Jovanović','Lalević','Kaluđerović','Šćekić','Vujošević','Raičević','Pejović','Vučinić',
      'Bošković','Božović','Ivanović','Đukić','Marković','Milić','Kovačević','Lakić',
      'Delić','Dragović','Radulović','Nikolić','Petrović','Stanišić','Mugoša','Lekić',
      'Bajčeta','Mitrović','Šaranović','Janković','Vlahović','Kažić','Femić','Jočić',
      'Zečević','Dabović','Đuranović','Bulajić','Rakočević','Sekulić','Banović','Martinović',
      'Vučetić','Kalač','Muratović','Hadžić','Lazarević','Ćetković','Perišić','Golubović',
      'Maraš','Zogović','Šoć','Kljajević'];
    v_vzdevki := array['Mare','Niko','Luki','Ste','Mile','Vule','Pero','Fića',
      'Dačo','Aki','Andro','Bale','Vaso','Dule','Neđo','Miki',
      'Ogi','Srki','Vlado','Igi','Deki','Daki','Žele','Mirke',
      'Rade','Boki','Laki','Paja','golgeter','klupa','Kapiten','Bombarder'];
  elsif v_drzava = 'BA' then
    v_imena := array['Adnan','Amar','Armin','Emir','Haris','Kenan','Tarik','Edin',
      'Dino','Mirza','Damir','Igor','Dario','Marko','Ivan','Luka',
      'Nikola','Stefan','Mario','Denis','Elvis','Eldin','Benjamin','David',
      'Filip','Josip','Ante','Dejan','Nemanja','Senad','Samir','Nermin',
      'Alen','Anel','Jasmin','Davor','Goran','Zoran','Mladen','Vedran'];
    v_priimki := array['Hodžić','Hadžić','Begić','Delić','Kovačević','Babić','Šehić','Mehmedović',
      'Husić','Hasanović','Mujić','Salihović','Halilović','Omerović','Mujanović','Alić',
      'Smajić','Imamović','Karić','Bešić','Kurtović','Softić','Spahić','Selimović',
      'Muratović','Jukić','Marić','Jurić','Perić','Tomić','Kovač','Ivić',
      'Pavlović','Petrović','Savić','Jovanović','Nikolić','Đurić','Mitrović','Stojanović',
      'Lukić','Vasić','Simić','Popović','Stanković','Todorović','Kolar','Novak',
      'Grgić','Topić','Zec','Vuković','Lovrić','Kapetanović','Hrnjica','Čolić',
      'Fazlić','Ramić','Mešić','Bajrić'];
    v_vzdevki := array['Ado','Amko','Arma','Emko','Hare','Keno','Tare','Edo',
      'Dinko','Mirzo','Dačo','Igi','Dare','Mare','Ivek','Luki',
      'Niko','Ste','Deni','Elvo','Bena','Fićo','Jole','Deki',
      'Seki','Nerko','Jasko','Goci','golgeter','klupaš','Kapiten','Ćevap'];
  elsif v_drzava = 'MD' then
    v_imena := array['Ion','Vasile','Mihai','Andrei','Alexandru','Dumitru','Sergiu','Nicolae',
      'Vladimir','Victor','Igor','Ruslan','Dorin','Vadim','Eugen','Maxim',
      'Artur','Cristian','Denis','Iurie','Radu','Valeriu','Octavian','Constantin',
      'Petru','Gheorghe','Ștefan','Daniel','Veaceslav','Corneliu','Marin','Pavel',
      'Tudor','Nichita','Liviu','Mihail','Gabriel','Adrian','Sorin','Anatol'];
    v_priimki := array['Rusu','Cernei','Ciobanu','Țurcanu','Cebotari','Lungu','Munteanu','Rotari',
      'Botnari','Moraru','Cojocaru','Popa','Sârbu','Gușan','Bălan','Croitoru',
      'Bivol','Cazacu','Melnic','Guțu','Chiriac','Russu','Railean','Vrabie',
      'Găină','Ursu','Prodan','Postică','Spînu','Țîcu','Vieru','Plămădeală',
      'Bodiu','Grosu','Lupu','Cucu','Popescu','Grecu','Cozma','Bejan',
      'Cotelea','Leahu','Mocanu','Stratan','Brînză','Negru','Furtună','Codreanu',
      'Arnaut','Lisnic','Pascari','Bodrug','Gherman','Știrbu','Ababii','Talmaci',
      'Bulat','Dogotari','Mazur','Ojog'];
    v_vzdevki := array['Ionică','Vasea','Mișa','Andrieș','Sanea','Dima','Serioja','Colea',
      'Vova','Vitea','Igoraș','Ruslănaș','Dorică','Vadică','Jenea','Maxik',
      'Artiom','Cristi','Denisaș','Iura','Rădiță','Valera','Costea','Petrică',
      'Ghiță','Fănel','Pașa','golgheter','rezervistul','Bombardierul','Căpitanul','Mămăligă'];
  elsif v_drzava = 'JP' then
    v_imena := array['Haruto','Sota','Yuto','Riku','Ren','Takumi','Kaito','Hinata',
      'Daiki','Kenta','Shota','Yuki','Ryo','Kazuki','Sho','Yusuke',
      'Takuya','Naoki','Hiroki','Tatsuya','Kosuke','Yuma','Sora','Daisuke',
      'Kenji','Makoto','Akira','Takeshi','Shinji','Koji','Masato','Ryota',
      'Kei','Tomoya','Hayato','Itsuki','Minato','Asahi','Yamato','Genki'];
    v_priimki := array['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura',
      'Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue',
      'Kimura','Hayashi','Shimizu','Yamazaki','Mori','Abe','Ikeda','Hashimoto',
      'Yamashita','Ishikawa','Nakajima','Maeda','Fujita','Ogawa','Goto','Okada',
      'Hasegawa','Murakami','Kondo','Ishii','Saito','Sakamoto','Endo','Aoki',
      'Fujii','Nishimura','Fukuda','Ota','Miura','Okamoto','Matsuda','Nakagawa',
      'Harada','Ono','Tamura','Takeuchi','Kaneko','Wada','Nakayama','Ishida',
      'Ueda','Morita','Hara','Shibata'];
    v_vzdevki := array['Haru','Sotachan','Yutti','Rikkun','Takkun','Kaichan','Hina','Dai',
      'Kenchan','Shotan','Yukkun','Ryochan','Kazu','Shosho','Yusu','Takuyan',
      'Nao','Hiro','Tatsu','Kosu','Sorasora','Genchan','Akkun','Makochan',
      'fantajista','benchwarmer','Kantoku','Captain','Hotshot','Onigiri','Ramen10','Bento'];
  elsif v_drzava = 'HK' then
    v_imena := array['Jason','Kelvin','Ken','Raymond','Eric','Alan','Vincent','Michael',
      'Calvin','Edmond','Derek','Wilson','Jacky','Tommy','Sunny','Ivan',
      'Matthew','Marco','Hugo','Ryan','Brian','Kenneth','Patrick','Dennis',
      'Terence','Gary','Felix','Anson','Ethan','Lucas','Kai Ming','Chi Hang',
      'Ka Ho','Wing Kit','Chun Yin','Ho Yin','Tsz Hin','Man Hei','Siu Fung','Yiu Wah'];
    v_priimki := array['Chan','Wong','Lee','Cheung','Lau','Leung','Ng','Ho',
      'Lam','Chow','Tsang','Yip','Kwok','Lai','Cheng','Mak',
      'Tang','Fung','Chu','Wu','Choi','Yeung','Kwan','Chung',
      'Lo','Tse','Hui','Yuen','Poon','So','Siu','Tam',
      'Kong','Lui','Au','Ma','Shum','Cheuk','Mok','Tong',
      'Pang','Lok','Yau','Chiu','Fong','Liu','Man','Sze',
      'Ko','Law','Luk','Wan','Kam','Tung','Hung','Ching',
      'Chau','Yu','Sin','Kwong'];
    v_vzdevki := array['Ah Keung','Ah Ming','Ah Chun','Siu Ho','Fai Jai','Ming Jai','Keung Gor','Wai Gor',
      'Jason Jai','Kenny','Ray','Tommy Boy','Sunny Day','Dimsum10','Milk Tea','Pineapple Bun',
      'Egg Tart','Char Siu','Siu Mai','Wonton','Cha Chaan Teng','Star Ferry','Peak Tram','Big Wave Bay',
      'benchwarmer','Kaifong','Goal Machine','Captain','Hotshot','Typhoon','Ding Ding','Lemon Tea'];
  elsif v_drzava = 'TH' then
    v_imena := array['Somchai','Somsak','Anan','Anurak','Chaiwat','Kittisak','Nattapong','Pongsak',
      'Supachai','Thanawat','Wichai','Prasert','Surachai','Teerasak','Apichat','Jakkrit',
      'Sarawut','Nopparat','Phakphum','Thitipong','Kritsada','Prawit','Sakda','Sarayut',
      'Peerapat','Ekkachai','Weerapong','Tanakorn','Pansa','Rattana','Kawin','Sombat',
      'Bordin','Suphanat','Phichit','Chatchai','Wattana','Krit','Boonmee','Arthit'];
    v_priimki := array['Saelim','Srisuk','Chaiyaporn','Wongsawat','Sukjai','Kaewmanee','Rattanakul','Phromma',
      'Thongdee','Sangthong','Jaidee','Inthasorn','Siriwong','Charoensuk','Panyawong','Somboon',
      'Prasertsri','Kongkaew','Saengthong','Chaisri','Suwannarat','Tangsiri','Ruangsri','Mahachai',
      'Kittipong','Noppakun','Yodsaeng','Phetchara','Sritong','Chantawong','Khamsuk','Thepsuwan',
      'Wiriyakul','Pattanasin','Klinsukon','Sirisuk','Kaewkla','Saetang','Sakulrat','Wongkham',
      'Phothong','Srisawat','Duangdee','Lertpanya','Chaimongkol','Pongpanich','Siriphan','Chuenchom',
      'Inthawong','Rakthai','Suksawat','Meesuk','Nakhonsri','Sombatsiri','Pholsri','Kanjanakul',
      'Wannasiri','Thaweesuk','Boonyarit','Chaiyasit'];
    v_vzdevki := array['Bank','Boy','Golf','Tong','Ton','Oat','Beam','Pond',
      'Mix','Ice','Art','Nut','Big','Toey','Bas','Pao',
      'Champ','Kong','New','Pete','Tee','Nong Golf','Pi Bank','Somtam10',
      'Mookata','Tuk Tuk','Muay Thai','Durian','benchwarmer','Kaptan','Hotshot','Mai Pen Rai'];
  elsif v_drzava = 'GI' then
    v_imena := array['James','John','Michael','Liam','Ryan','Daniel','Kyle','Jamie',
      'Mark','Nicky','Adrian','Julian','Joseph','Christian','Aaron','Dylan',
      'Ethan','Jayce','Luis','Manuel','Carlos','Pepe','Antonio','Francis',
      'Louis','Tyrone','Shane','Jason','Jared','Robert','Ernest','Lee',
      'Kelvin','Craig','Stephen','Dean','Jesse','Alain','Mario','Leon'];
    v_priimki := array['Garcia','Gomez','Santos','Sanchez','Ferrary','Baglietto','Bonfante','Borge',
      'Linares','Montegriffo','Pitaluga','Danino','Vinet','Netto','Hernandez','Lopez',
      'Martinez','Perez','Rodriguez','Torres','Olivero','Bruzon','Cruz','Massias',
      'Ballester','Mascarenhas','Payas','Hassan','Benady','Abudarham','Sacramento','Origo',
      'Parody','Sene','Byrne','Smith','Anderson','Robba','Celecia','Calderon',
      'Ramagge','Holliday','Lima','Reyes','Valverde','Mena','Bado','Brooks',
      'Duo','Ellul','Gonzalez','Navas','Moreno','Alvarez','Romero','Vasquez',
      'Ruiz','Ocana','Serra','Ward'];
    v_vzdevki := array['Jimbo','Johnny','Mikey','Ryno','Danny','Kylo','Jamo','Nicky G',
      'Pepito','Manolo','Carlitos','Tony','Frankie','Louie','Ty','Shaney',
      'Jase','Robbie','Ernie','Deano','Llanito','Barbary Ape','Rock Star','Levanter',
      'Calentita','Pan Dulce','Torta','benchwarmer','Capitan','Hotshot','Wellies','Main Street'];
  elsif v_drzava = 'SM' then
    v_imena := array['Marco','Luca','Matteo','Andrea','Alessandro','Davide','Federico','Simone',
      'Nicola','Lorenzo','Filippo','Riccardo','Tommaso','Gabriele','Michele','Giacomo',
      'Stefano','Fabio','Mattia','Daniele','Enrico','Pietro','Samuele','Emanuele',
      'Alberto','Roberto','Massimo','Paolo','Francesco','Giovanni','Elia','Leonardo'];
    v_priimki := array['Gasperoni','Guidi','Zonzini','Mularoni','Casadei','Bollini','Ceccoli','Gualandi',
      'Righi','Giardi','Beccari','Stefanelli','Ugolini','Selva','Muccioli','Valentini',
      'Bacciocchi','Michelotti','Benedettini','Belluzzi','Bianchi','Rossi','Ricci','Fabbri',
      'Galassi','Lonfernini','Terenzi','Venturini','Zafferani','Canti','Tamagnini','Podeschi',
      'Felici','Francini','Giulianelli','Morri','Nanni','Pasolini','Sarti','Toccaceli'];
    v_vzdevki := array['Marchino','Lucone','Teo','Andre','Ale','Dado','Fede','Simo',
      'Nico','Lollo','Pippo','Ricky','Tommy','Gabri','Miki','Jack',
      'Ste','Fabi','Matti','Dani','Pietrino','Sammy','Paolino','Checco',
      'Titano','Tre Torri','Piadina','Gelatino','benchwarmer','Capitano','Fenomeno','Bomber'];
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
