-- Dvanajst novih držav (GR, TR, UA, AM, AZ, DK, GB, MT, ME, BA, MD): stiki s
-- klubi jih sprejmejo, hišne ekipe v njihovih ligah dobijo domača imena
-- lastnikov, opomnik brez ekipe najde ligo države novih jezikov vmesnika.
--
-- 1. `klub_stik.drzava` sprejme nove države (ostale ostanejo).
-- 2. `ime_hisnega_lastnika` je zadnja definicija (20261013183100_makedonija_jezik)
--    z vejami novih držav. Velike začetnice grških, armenskih, ukrajinskih in
--    azerbajdžanskih imen `upper()`/`lower()` obdelata pravilno; imena se ne
--    začnejo z "İ" (turščina, azerbajdžanščina), ker bi ga `lower()` pokvaril.
-- 3. `kandidati_za_opomnik_brez_ekipe` je zadnja definicija
--    (20261015100100_opomniki_brez_ekipe) z jeziki el, tr, uk, hy, az, da.
--    Angleščina ostane brez države (GB in MT si jo delita, `en` ima tudi tujec).
-- Države so že vpisane (migracije virov). Lige ostanejo neaktivne.

alter table public.klub_stik drop constraint if exists klub_stik_drzava_check;
alter table public.klub_stik
  add constraint klub_stik_drzava_check check (drzava in ('SI', 'SK', 'HR', 'CZ', 'HU', 'AT', 'RS', 'RO', 'EE', 'PL', 'ES', 'LV', 'MK',
    'GR', 'TR', 'UA', 'AM', 'AZ', 'DK', 'GB', 'MT', 'ME', 'BA', 'MD'));

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

create or replace function public.kandidati_za_opomnik_brez_ekipe(p_najvec int default 100)
returns table (
  user_id uuid,
  email text,
  display_name text,
  jezik text,
  competition_id bigint,
  liga_slug text,
  liga_oznaka text,
  liga_drzava text,
  rok timestamptz,
  email_vklop boolean,
  push_vklop boolean
)
language sql
stable
security definer
set search_path = public
as $$
  -- Najprej kandidati (z mejo), šele nato liga: izbira lige je na človeka
  -- dražja in naj ne teče za vseh ~1800.
  with k as (
    select u.id, u.email, u.raw_user_meta_data->>'jezik' as jezik, u.created_at,
           p.display_name, p.navijam_team_id, p.brez_opomnikov, p.brez_push
      from auth.users u
      join profiles p on p.id = u.id
     where u.created_at < now() - interval '3 days'
       and u.email_confirmed_at is not null
       and u.deleted_at is null
       and not exists (select 1 from fantasy_teams f where f.owner_id = u.id and f.hisna)
       and not exists (select 1 from fantasy_teams f join fantasy_roster r on r.fantasy_team_id = f.id
                        where f.owner_id = u.id and not f.hisna)
       -- V oknu dobrodošlice gre ta prva; po njej dva dni premora.
       and (u.created_at < now() - interval '7 days'
            or exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'dobrodoslica' and l.napaka is null))
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'dobrodoslica'
                         and l.poslano_at > now() - interval '2 days')
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'opomnik-ekipa'
                         and l.poslano_at > now() - interval '3 days')
       -- Največ trije uspešni, vsaj 7 dni narazen; neuspel poskus se ponovi
       -- naslednji dan, vseh poskusov je največ šest.
       and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe' and l.napaka is null) < 3
       and (select count(*) from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe') < 6
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe'
                         and l.napaka is null and l.poslano_at > now() - interval '7 days')
       and not exists (select 1 from email_log l where l.user_id = u.id and l.vrsta = 'brez-ekipe'
                         and l.poslano_at > now() - interval '1 day')
       and (not p.brez_opomnikov
            or (not p.brez_push and exists (select 1 from push_tokens pt where pt.user_id = u.id)))
     order by u.created_at desc
     limit greatest(p_najvec, 0)
  )
  select k.id,
         k.email,
         k.display_name,
         k.jezik,
         li.id,
         li.slug,
         li.short_name,
         li.drzava,
         nk.deadline_at,
         not k.brez_opomnikov,
         not k.brez_push and exists (select 1 from push_tokens pt where pt.user_id = k.id)
    from k
    left join lateral (
      select c.id, c.slug, c.short_name, d.code as drzava
        from competitions c
        join countries d on d.id = c.country_id
        cross join lateral (select
          exists (select 1 from fantasy_teams f where f.owner_id = k.id and f.competition_id = c.id) as svoja,
          exists (select 1 from competition_teams ct
                   where ct.competition_id = c.id and ct.team_id = k.navijam_team_id) as navija) x
       where c.active
         and (x.svoja or x.navija
              or d.code = case k.jezik
                            when 'sl' then 'SI' when 'sk' then 'SK' when 'hr' then 'HR'
                            when 'cs' then 'CZ' when 'hu' then 'HU' when 'de' then 'AT'
                            when 'sr' then 'RS' when 'ro' then 'RO' when 'et' then 'EE'
                            when 'pl' then 'PL' when 'es' then 'ES' when 'lv' then 'LV'
                            when 'mk' then 'MK' when 'el' then 'GR' when 'tr' then 'TR'
                            when 'uk' then 'UA' when 'hy' then 'AM' when 'az' then 'AZ'
                            when 'da' then 'DK' end)
       order by x.svoja desc, x.navija desc, c.slug = 'clani' desc, je_mladinski_slug(c.slug), c.sort_order, c.id
       limit 1
    ) li on true
    left join naslednji_krog nk on nk.competition_id = li.id
   order by k.created_at desc
$$;

revoke all on function public.kandidati_za_opomnik_brez_ekipe(int) from public, anon, authenticated;
grant execute on function public.kandidati_za_opomnik_brez_ekipe(int) to service_role;
