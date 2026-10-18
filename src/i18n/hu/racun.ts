// Magyar fordítás: `racun` (forrás: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Bejelentkezés',
    naslovRegistracija: 'Regisztráció',
    naslovPozabljeno: 'Elfelejtett jelszó',
    googleNiNaVoljo: 'A Google-bejelentkezés most nem érhető el. Használd az e-mailt.',
    appleNiNaVoljo: 'Az Apple-bejelentkezés most nem érhető el. Használd az e-mailt.',
    poslanaPonastavitev:
      'Elküldtük a linket a jelszó visszaállításához. Nézd meg az e-mailjeid (a spam mappát is).',
    racunUstvarjen:
      'A fiókod elkészült. Megerősítő linket küldtünk e-mailben: nyisd meg, aztán gyere vissza.',
    prijavljenKot: 'Bejelentkezve: {email}.',
    zGooglom: 'Folytatás Google-lel',
    zApplom: 'Folytatás Apple-lel',
    aliZEposto: 'vagy e-maillel',
    prikaznoIme: 'Megjelenített név',
    eposta: 'E-mail',
    geslo: 'Jelszó',
    posiljam: 'Küldés …',
    ustvariRacun: 'Fiók létrehozása',
    posljiPovezavo: 'Link küldése',
    gumbPrijava: 'Bejelentkezés',
    zeImasRacun: 'Van már fiókod? Jelentkezz be',
    nimasRacuna: 'Nincs még fiókod? Regisztrálj',
    pozabljenoGeslo: 'Elfelejtetted a jelszavad?',
    nazajNaPrijavo: '← Vissza a bejelentkezéshez',
    predlogEposte: 'Erre gondoltál: {eposta}?',
  },
  napake: {
    napacnaPrijava: 'Hibás e-mail-cím vagy jelszó.',
    niPotrjen: 'Az e-mail-címed még nincs megerősítve. Kattints a linkre az üzenetben, amit küldtünk.',
    zeRegistriran: 'Ez az e-mail-cím már regisztrálva van. Jelentkezz be, vagy állítsd vissza a jelszavad.',
    prevecPoskusov: 'Túl sok próbálkozás. Várj néhány percet, és próbáld újra.',
    sibkoGeslo: 'A jelszó túl gyenge. Legalább 6 karakter legyen, lehetőleg betűk és számok keveréke.',
    istoGeslo: 'Az új jelszó nem lehet ugyanaz, mint a régi.',
    neveljavenNaslov: 'Az e-mail-cím érvénytelen.',
  },
  novoGeslo: {
    naslov: 'Új jelszó',
    gesliSeNeUjemata: 'A két jelszó nem egyezik.',
    preverjam: 'Link ellenőrzése …',
    neveljavna:
      'A link érvénytelen vagy lejárt. A <prijava>bejelentkezési</prijava> oldalon kérj új jelszó-visszaállítást.',
    novoGeslo: 'Új jelszó',
    ponovi: 'Jelszó még egyszer',
    shranjujem: 'Mentés …',
    shrani: 'Jelszó mentése',
  },
  opomniki: {
    naslov: 'Értesítések',
    napakaNalaganja: 'Nem sikerült betölteni a beállításokat.',
    napakaShranjevanja: 'A mentés nem sikerült. Próbáld újra.',
    nalagam: 'Betöltés …',
    moraPrijava: 'Az emlékeztetők szerkesztéséhez <prijava>jelentkezz be</prijava>.',
    opis: 'A forduló határideje előtt rövid üzenetet küldünk erre a címre: {email}, hogy ne felejtsd el beállítani a csapatod.',
    posiljaj: 'E-mailes emlékeztetők',
    shranjujem: 'Mentés …',
    vklopljeni: 'Az emlékeztetők be vannak kapcsolva.',
    izklopljeni: 'Nem küldünk több emlékeztetőt.',
    odjavaVprasanje: 'Nem szeretnél több SLFF e-mailt (határidő-emlékeztetőt és értesítést a csapatodról)?',
    odjavaGumb: 'Leiratkozom',
    odjavaNapaka: 'A link érvénytelen. Jelentkezz be, és kapcsold ki az emlékeztetőket a beállításokban.',
    push: 'Push-értesítések',
    pushOpis: 'A határidő előtti napon a telefonod szól, ha a csapatod még nincs kész.',
    pushVklopljena: 'A push-értesítések be vannak kapcsolva.',
    pushIzklopljena: 'Nem küldünk több push-értesítést.',
    pushZavrnjeno: 'Az értesítések ki vannak kapcsolva a telefonodon. Kapcsold be őket: Beállítások → SLFF → Értesítések.',
    pushDovoli: 'Értesítések engedélyezése',
    povezava: 'Értesítési beállítások',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Megerősítés …',
    preverjam: 'Link ellenőrzése …',
    neveljavna: 'A link már nem érvényes, vagy már felhasználták. <prijava>Jelentkezz be</prijava>, vagy kérj újat.',
  },
  nastavitve: {
    naslov: 'Fiókbeállítások',
    moraPrijava: 'A fiók szerkesztéséhez <prijava>jelentkezz be</prijava>.',
    nalagam: 'Betöltés …',
    napakaNalaganja: 'Nem sikerült betölteni a beállításokat.',
    shranjujem: 'Mentés …',
    shranjeno: 'Mentve.',
    napakaShranjevanja: 'A mentés nem sikerült. Próbáld újra.',
    profilNaslov: 'Profil',
    mojProfil: 'Nézd meg a nyilvános profilodat',
    prikaznoIme: 'Megjelenített név',
    imeOpis: 'Mások ezt látják a tabellákon. Legalább 3, legfeljebb 24 karakter, 7 naponta egyszer módosíthatod.',
    imeNaslednjic: 'Legközelebb ekkor módosíthatod a neved: {datum}.',
    shraniIme: 'Név mentése',
    avatar: 'Avatar',
    avatarOpis: 'Válassz színt és monogramot, vagy egy focis ikont.',
    barva: 'Szín',
    barvaN: 'Szín {n}',
    slika: 'Kép',
    zacetnice: 'Monogram',
    ikone: {
      zoga: 'Labda',
      gol: 'Kapu',
      pokal: 'Kupa',
      copat: 'Futballcipő',
      rokavice: 'Kapuskesztyű',
      dres: 'Mez',
      zastavica: 'Szögletzászló',
      navijac: 'Szurkoló',
    },
    klubNaslov: 'Kedvenc klubod',
    klubOpis: 'Megjelenik a profilodon, a pontjaid pedig beszámítanak a klub szurkolóinak rangsorába.',
    klubIsci: 'Klub keresése …',
    klubNiZadetkov: 'Nem található ilyen klub.',
    klubBrez: 'Még nem választottál klubot.',
    klubOdstrani: 'Klub eltávolítása',
    jezikNaslov: 'Nyelv és ország',
    jezikOpis: 'Az oldal nyelve és az ország, amelynek bajnokságait látod. A választás ebben a böngészőben érvényes.',
    obvestilaNaslov: 'Értesítések',
    zasebnostNaslov: 'Adatvédelem',
    javniProfil: 'Nyilvános profil',
    javniProfilOpis: 'Mások a profilodon látják a csapataidat, a klubodat és az eredményeidet. A kikapcsolt profil csak a megjelenített nevet mutatja.',
    prijavaNaslov: 'Bejelentkezés és jelszó',
    prijavljenZ: 'Ezzel az e-mail-címmel vagy bejelentkezve: {email}.',
    geslo: 'Jelszó módosítása',
    gesloOpis: 'E-mailben küldünk egy linket, amellyel új jelszót állíthatsz be.',
    gesloPoslano: 'Elküldtük a linket erre a címre: {email}. Nézd meg az e-mailjeid (a spam mappát is).',
    gesloNapaka: 'Nem sikerült elküldeni a linket. Próbáld újra néhány perc múlva.',
    eposta: 'Az e-mail-cím módosításához írj nekünk: <eposta>info@slff.eu</eposta>.',
    // Napake prikaznega imena (koda iz baze, `hint`).
    napake: {
      dolzina: 'A megjelenített név legalább 3, legfeljebb 24 karakter lehet.',
      znaki: 'A megjelenített név nem engedélyezett karaktereket tartalmaz.',
      rezervirano: 'Ez a név az SLFF csapatának van fenntartva. Válassz másikat.',
      neprimerno: 'Ez a név nem megfelelő. Válassz másikat.',
      prepogosto: 'A megjelenített nevet 7 naponta egyszer módosíthatod.',
      zasedeno: 'Ez a megjelenített név már foglalt.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Ez a profil nem létezik. Lehet, hogy a fiókot törölték.',
    nazaj: 'Vissza a tabellához',
    zaseben: 'Ez a profil privát.',
    tvojZaseben: 'A profilod privát: mások csak a megjelenített nevet látják.',
    uredi: 'Profil szerkesztése',
    clanOd: 'Tag {datum} óta',
    navija: 'Kedvenc klub',
    ekipe: 'Csapatok',
    brezEkip: 'Az aktív bajnokságokban még nincs csapata.',
    mesto: '{mesto}. hely ({ekip} csapatból)',
    miniLige: 'Közös miniligák',
    dosezki: 'Eredmények',
    sezone: 'Szezonok',
    krogi: 'Lejátszott fordulók',
    najboljsiKrog: 'Legjobb forduló',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Fiók törlése',
    moraPrijava: 'A fiók törléséhez <prijava>jelentkezz be</prijava>.',
    opis: 'Töröljük ezt a fiókot: {email}. Törlődik a profilod, minden csapatod a pontelőzményekkel, a szavazataid és az általad létrehozott miniligák. A törlés nem vonható vissza. A törléssel az ellenőrzött játékos jelvény is megszűnik, az előfizetés pedig visszatérítés nélkül leáll.',
    gumb: 'Fiók törlése',
    potrdi: 'Igen, végleg törlöm',
    preklici: 'Mégse',
    brisem: 'Törlés …',
    napaka: 'Nem sikerült törölni a fiókot: {napaka}',
  },
  // Zasebnost in pogoji. <b> je krepko, ostale oznake so povezave.
  pravno: {
    naslov: 'Adatvédelem és feltételek',
    zadnjaSprememba: 'Utolsó módosítás: 2026. október 16.',
    kajJeNaslov: 'Mi az SLFF',
    kajJe:
      'Az SLFF (Sunday League Fantasy Football) szurkolói fantasy bajnokság a helyi amatőr labdarúgó-bajnokságokhoz. Önkéntesen működtetjük, és nem kapcsolódik a megyei vagy az országos labdarúgó-szövetségekhez, sem a klubokhoz. A játék ingyenes, nincs benne pénzes tét vagy nyeremény.',
    podatkiNaslov: 'Milyen adatokat tárolunk',
    podatkiEposta:
      '<b>E-mail-cím és jelszó.</b> A bejelentkezéshez kellenek. A jelszót titkosítva tároljuk, mi sem látjuk.',
    podatkiIme:
      '<b>Megjelenített név és csapatnév.</b> Mindkettő látszik a tabellán. Ha nem a saját neveden szeretnél szerepelni, használj becenevet.',
    podatkiEkipa:
      '<b>A csapatod és a szavazataid.</b> A keret összetétele, a csapatkapitány, az átigazolások és a gólpasszokról vagy posztokról leadott szavazatok.',
    podatkiNaprava:
      '<b>Eszköztoken az értesítésekhez.</b> Ha a mobilalkalmazásban engedélyezed az értesítéseket, eltárolunk egy tokent, amellyel a forduló határideje előtt emlékeztetőt küldünk. Kijelentkezéskor töröljük.',
    neHranimo:
      'Nem tároljuk a telefonszámod és a bankkártyaadataidat, a címedet pedig csak akkor, ha nyomtatott jelvényt rendelsz (lásd lent). Nem használunk követő sütiket és hirdetési eszközöket. A böngésződ tárolja a bejelentkezési munkamenetet, a súgó chat beszélgetésének azonosítóját (ha megnyitod), és munkamenet-jelölőket, amelyekkel egy oldal megtekintését csak egyszer számoljuk. Azt, hogy hányan nyitottak meg egy oldalt, csak napi összesítésként tartjuk nyilván, a neved, fiókod, eszközöd vagy IP-címed nélkül. Az általános látogatottsági statisztikát (mely oldalak, honnan jönnek a látogatók, eszköztípus és ország, néhány művelet, például a csapat összeállítása) a saját szerverünkön futó <b>Umami</b> rögzíti: sütik nélkül, az IP-címet nem tárolja, és a látogatást nem köti a fiókodhoz. Ha a böngésződben be van kapcsolva a „Ne kövessenek” beállítás, semmit sem rögzítünk.',
    dostopNaslov: 'Ki fér hozzá az adatokhoz',
    dostop:
      'Az adatok a saját szerverünkön vannak a <b>Hetzner</b> szolgáltatónál (Németország, EU), a forgalom a <b>Cloudflare</b> hálózatán keresztül érkezik (védelem és az oldal kiszolgálása). A megerősítő és jelszó-visszaállító e-maileket a saját levelezőszerverünk küldi (szintén a Hetznernél), a mobilalkalmazás értesítéseit pedig a <b>Google Firebase Cloud Messaging</b> (csak az eszköztoken és az értesítés szövege). A jobb alsó sarokban lévő súgó chat a <b>HelpStack</b> szolgáltatáson fut: oda az kerül, amit beírsz, és ha be vagy jelentkezve, a megjelenített neved, hogy tudjuk, kinek válaszolunk. Amikor a chatben az asszisztens segít, azt is láthatja, melyik oldalon és melyik bajnokságban vagy, és érvényes-e a csapatod. Az e-mail-címedet nem adjuk át neki. Senki másnak nem adjuk tovább és nem adjuk el az adataidat.',
    statistikaNaslov: 'A labdarúgók adatai',
    statistika:
      'Az általunk követett bajnokságok labdarúgóinál a nevet, a klubot, a mezszámot, a pályára lépéseket, a perceket, a gólokat és a lapokat mutatjuk. A forrás az oldal alján megnevezett szövetség nyilvánosan közzétett hivatalos jegyzőkönyvei. A posztokat és a gólpasszokat, amelyek nincsenek a jegyzőkönyvben, a közösség szavazással dönti el, ezért tévesek is lehetnek. Ebből számoljuk a játékos pontjait és árát a játékban. Ha valami nem stimmel, kattints a játékosra, és jelezd nekünk.',
    statistikaPodlaga:
      'A cél egy ingyenes fantasy játék szurkolóknak. A jogalap a jogos érdek (GDPR 6. cikk (1) bekezdés f) pont): hogy a szurkolók a bajnokságuk közzétett eredményeivel játszhassanak. Az adatokat addig mutatjuk, amíg a játékos egy általunk követett bajnokságban szerepel. Az osztrák bajnokságokban, ahogy az ÖFB is, a játékos nevét az utolsó pályára lépése után 18 hónappal elrejtjük.',
    statistikaUgovor:
      'A játékos tiltakozhat az adatkezelés ellen, vagy kérheti a törlést: írj az <eposta>info@slff.eu</eposta> címre, és csatold a játékos oldalának linkjét. 14 napon belül a nevét semleges jelölésre cseréljük az adott ország összes általunk követett bajnokságában, ahol megtaláljuk, a későbbi importoknál is. A statisztika név nélkül marad. Ugyanezt tesszük a szövetség kérésére is.',
    grbi:
      'A klubcímerek az egyes klubok tulajdonai, és csak a csapat felismerését szolgálják. Ha egy klub ezt nem szeretné, írjon nekünk, és eltávolítjuk a címert.',
    fotografijeNaslov: 'Fényképek',
    fotografije:
      'A kezdőlap fotója Abigail Keenan munkája, és az <unsplash>Unsplash</unsplash> oldalon jelent meg az ő licencük alapján, amely szabad felhasználást enged. Nem a mi bajnokságaink játékosait ábrázolja.',
    praviceNaslov: 'A jogaid',
    pravice:
      'A fiókodat és minden adatodat bármikor magad is törölheted: a fiók menüjében válaszd a <b>Fiók törlése</b> pontot (slff.eu/account). A megjelenített név javításához, vagy ha a törlés nem sikerül, írj nekünk: <eposta>info@slff.eu</eposta>. A fiók törlésével a csapatod is eltűnik a tabelláról. Az ellenőrzött játékos jelvény vásárlásának adatai a számviteli jogszabályok szerint 10 évig megmaradnak, a szállítási cím pedig a fenti szabály szerint.',
    pravilaNaslov: 'Játékszabályok',
    pravila:
      'Egy ember, egy fiók. A gólpasszokról és posztokról szóló szavazás valódi javításokra szolgál: a szándékosan hibás szavazat mindenkinek elrontja a játékot, és a fiók törléséhez vezethet. A pontozás és az árak a szezon közben változhatnak, ha valami igazságtalannak bizonyul; az ilyen változásokat bejelentjük.',
    jamstvoNaslov: 'Garancia nélkül',
    jamstvo:
      'Az oldal úgy működik, ahogy működik. Igyekszünk, hogy az adatok pontosak legyenek és az oldal elérhető legyen, de ezt garantálni nem tudjuk: a jegyzőkönyvek késhetnek, a statisztikában pedig lehetnek hibák. Ez az ingyenes játékra vonatkozik. A fizetős szolgáltatásokra a Fizetős szolgáltatások részben leírt feltételek és a fogyasztói jogaid érvényesek.',
    kajJePlacljivo:
      'Az egyetlen fizetős dolog az ellenőrzött játékos jelvény, ami nem kötelező (lásd lent: Fizetős szolgáltatások).',
    podatkiPlacilo:
      '<b>Ellenőrzött játékos jelvény vásárlása (csak ha veszel).</b> A vásárlás adatait (mit, mikor, mennyiért, és a Stripe vevőazonosítód) 10 évig őrizzük, ahogy a számviteli jogszabályok előírják. A nyomtatott jelvény szállítási címét a feladás vagy a rendelés törlése után 90 napig, de legfeljebb a rendeléstől számított 12 hónapig őrizzük, utána csak az ország marad meg.',
    dostopStripe:
      'Az ellenőrzött játékos jelvény fizetését a <b>Stripe</b> (Stripe Payments Europe, Írország) kezeli: megkapja a neved, e-mail-címed, számlázási címed és nyomtatott jelvénynél a szállítási címet. A kártyaadatokat közvetlenül a Stripe-nál adod meg, mi nem látjuk őket.',
    placljivoNaslov:
      'Fizetős szolgáltatások: ellenőrzött játékosok',
    placljivoUvod:
      'A játék ingyenes, és az is marad. Csak az ellenőrzött játékos jelvény fizetős, ami nem kötelező, és azt az a játékos veheti meg, aki igazolta, hogy a profil az övé. A jelvény soha nem befolyásolja a pontokat, az árakat, a fantasy csapatokat vagy a játékszabályokat. Ezek a feltételek erre a vásárlásra vonatkoznak.',
    prodajalec:
      '<b>Eladó:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Szlovénia, a Ljubljanai Kerületi Bíróság cégjegyzékében nyilvántartva. Cégjegyzékszám 9850538000, közösségi adószám SI42765153. Kapcsolat: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Mit veszel.</b> Kék pipát a játékos neve mellé és profilextrákat (hosszabb leírás, linkek, borítókép, szín, kiemelt meccs vagy statisztika, üzenet a szurkolóknak). Az éves előfizetés 9,99 €, és minden évben automatikusan megújul. Az örökre szóló vásárlás egyszeri 29 €, és addig érvényes, amíg az SLFF ezt a szolgáltatást kínálja. Az örökre szóló vásárláshoz névre szóló nyomtatott jelvényt is kérhetsz 5 €-ért, 2 € (Szlovénia) vagy 4 € (más EU-ország) postaköltséggel. Csak EU-országokba szállítunk, a kézbesítés általában 2-3 hét. Az árak tartalmazzák az áfát.',
    placilo:
      '<b>Fizetés.</b> A fizetést a Stripe kezeli. A kártyaadatokat nem látjuk és nem tároljuk. Csak akkor vásárolhatsz, ha legalább 18 éves vagy. A szerződés akkor jön létre, amikor a Stripe visszaigazolja a fizetést.',
    odpoved:
      '<b>Az előfizetés lemondása.</b> Az előfizetést bármikor lemondhatod az Előfizetés kezelése gombbal a fiókod oldalán (slff.eu/account) vagy a játékos profilján. A lemondás a kifizetett év végén lép életbe, addig a jelvény megmarad. A már megkezdett évért nem adunk vissza pénzt, kivéve az alábbi eseteket.',
    odstop:
      '<b>Elállási jog.</b> A digitális tartalmat (pipa és extrák) a fizetés után azonnal megkapod. Fizetés előtt kifejezetten hozzájárulsz az azonnali teljesítéshez, és tudomásul veszed, hogy ezzel elveszíted a 14 napos elállási jogodat (a 2011/83/EU irányelv 16. cikk m) pontja, szlovén ZVPot-1). A nyomtatott jelvény a te kérésed szerint készül (név a jelvényen), ezért arra nincs elállási jog (16. cikk c) pont). A törvényes szavatossági jogaid megmaradnak: ha a jelvény sérülten, hibásan vagy egyáltalán nem érkezik meg, írj nekünk, és ingyen kicseréljük vagy visszaadjuk a pénzt.',
    konec:
      '<b>Mikor szűnik meg a jelvény.</b> A jelvény megszűnik, ha kiderül, hogy a profil nem a tiéd, és visszavonjuk az igazolást, ha a játékos nevét az ő vagy a szövetség kérésére elrejtjük, vagy ha törlöd a fiókodat. Az előfizetés ilyenkor automatikusan leáll, és többé nem terhelünk. Ha a fizetést a bankodnál vitatod (chargeback), a jelvényt visszavonjuk.',
    vracila:
      '<b>Visszatérítés.</b> Visszaélés vagy hamis profiligazolás esetén nem adunk vissza pénzt. Ha a jelvény a mi hibánkból, a szövetség kérésére vagy a szolgáltatás megszüntetése miatt szűnik meg, éves előfizetésnél a fel nem használt hónapok arányos részét visszaadjuk. Örökre szóló vásárlásnál a vásárlást követő első 12 hónapban a teljes összeget, azután a vásárlástól számított 5 évből hátralévő idő arányos részét adjuk vissza. A nyomtatott jelvényt és a postaköltséget megszüntetéskor nem térítjük vissza (a jelvény a tiéd marad), csak hiba esetén.',
    pritozbe:
      '<b>Kérdések és panaszok.</b> Írj az <eposta>info@slff.eu</eposta> címre, 8 munkanapon belül válaszolunk. Nem ismerünk el egyetlen fogyasztói jogviták bíróságon kívüli rendezésére jogosult szervet sem. A szlovén jog az irányadó; ez nem veszi el azt a védelmet, amelyet a lakóhelyed szerinti ország joga biztosít.',
    scoutNaslov: 'SLFF Scout: játékoskeresés kluboknak',
    scoutKaj:
      'Ugyanazokból a nyilvános jegyzőkönyvekből a felnőtt bajnokságok játékosaira mutatókat számolunk: a játékpercek aránya, gólok, hatás a pályán, kapott gólok, lapok és az idények közötti fejlődés, a bajnokság erősségéhez igazítva. Ezek a meccsadatokból számolt mutatók, nem a személy értékelése. Az SLFF Scout előfizetéssel rendelkező, játékost kereső klubok fogják látni őket; a döntést mindig a klub egy embere hozza meg. Utánpótlás bajnokságokat nem dolgozunk fel. Aki valaha utánpótlás bajnokságban játszott, ki van zárva, amíg nincsenek játékpercei felnőtt bajnokságban, és a saját profilján meg nem adja a születési évét, amely szerint idén betölti legalább a 19. életévét.',
    scoutPodlaga:
      'A jogalap a jogos érdek (a GDPR 6. cikk (1) bekezdés f) pontja): segíteni a kluboknak játékost találni a nyilvánosan közzétett eredményekből. A mutatókat minden nap újraszámoljuk, és csak a legutóbbi számításokat őrizzük meg. A klubok megtekintéseit 12 hónapig naplózni fogjuk, hogy megakadályozzuk a visszaéléseket, és kérésre megmondhassuk a játékosnak, mely klubok nézték meg.',
    scoutPrivolitev:
      'Az átvett profillal rendelkező játékos megadhatja, hogy nyitott az átigazolásra, a születési évét, a kívánt régiókat és a kapcsolatfelvétel engedélyét. Ez hozzájárulás (a GDPR 6. cikk (1) bekezdés a) pontja): csak a Scoutban lévő klubok látják, bármikor visszavonható a profilon, és visszavonáskor töröljük az adatokat. A klub csak a Scouton keresztül ír a játékosnak, és nem látja az e-mail-címét.',
    scoutUgovor:
      'Tiltakozás: az átvett profilon kattints a Rejts el a Scoutból gombra, vagy írj az <eposta>info@slff.eu</eposta> címre a játékos oldalának linkjével. 14 napon belül elrejtjük a játékost a Scoutból az adott ország összes bajnokságunkban, a későbbi importoknál is. A fantasy játékban marad.',
    trgovinaNaslov: 'SLFF Bolt (shop.slff.eu)',
    trgovinaKaj:
      'Vásárláskor kezeljük a nevet, az e-mail-címet, a szállítási címet, a megvásárolt termékeket és az összegeket, bejelentkezéskor az SLFF-fiókodat is. A fizetést a Stripe végzi: a kártyaadatokat nem látjuk és nem tároljuk. A nevet és a címet a kézbesítéshez a Pošta Slovenije kapja meg. A visszaélések korlátozására befejezetlen vásárlásnál ideiglenesen tároljuk az IP-cím hash-ét (visszafordíthatatlan); fizetéskor vagy a vásárlás lejártakor törlődik. A személyre szabás szövege (név, szám) és a fantasy csapat neve a terméken a rendelés része; a szöveget a terméket elkészítő nyomda is megkapja.',
    trgovinaPodlaga:
      'A jogalap a szerződés teljesítése (GDPR 6. cikk (1) b)) és jogi kötelezettség (számvitel, adók), az IP-cím hash-énél a visszaélések megelőzéséhez fűződő jogos érdek (GDPR 6. cikk (1) f)). Az adatkezelő: SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'A rendelési és számlaadatokat addig őrizzük, ameddig az áfatörvény és a számviteli előírások megkövetelik (a számla kiállításának évét követő 10 évig). A rendelési értesítők e-mail-címét csak az adott rendeléshez használjuk. Hozzáférést, helyesbítést vagy tiltakozást itt kérhetsz: <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Hivatalos klubfiók',
    aktiven: 'Ez a fiók a(z) {klub} klubot képviseli.',
    pravice: 'Klubként szerkesztheted a posztokat, játékosokat adhatsz hozzá, és jóváhagyhatod a játékosaid profiljait.',
    vprasanje: 'Egy klubot képviselsz?',
    pojasnilo: 'Ha a klub nálunk szereplő hivatalos címével jelentkezel be, automatikusan klubfiókot kapsz. Ha nincs meg nálunk, kérd alább, és ellenőrizzük.',
    klub: 'Klub',
    isciKlub: 'Klub keresése …',
    vloga: 'A szereped a klubban',
    vloge: {
      predsednik: 'elnök',
      tajnik: 'titkár',
      trener: 'edző',
      vodstvo: 'klubvezetés',
      drugo: 'egyéb',
    },
    dokaz: 'Link, ahol a cím nyilvános (honlap, Facebook, szövetség)',
    opomba: 'Megjegyzés (nem kötelező)',
    naslovRacuna: 'Az ellenőrzött cím: {email}',
    poslji: 'Kérés elküldése',
    caka: 'A(z) {klub} klubra vonatkozó kérésed ellenőrzésre vár.',
    cakaBrezKluba: 'A címed a hivatalosak között van, de még össze kell kapcsolnunk a klubbal. Hamarosan elintézzük.',
    cakaPolno: 'A klubnak már 5 fiókja van. Megnézzük, és értesítünk.',
    zavrnjeno: 'A kérést elutasítottuk: {razlog}',
    nepotrjen: 'Előbb erősítsd meg a fiókod e-mail-címét.',
    napake: {
      zeKlub: 'Már képviselsz egy klubot.',
      caka: 'A kérésed már döntésre vár.',
    },
  },
}
