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
    push: 'Push-értesítések (mobilalkalmazás)',
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
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Fiók törlése',
    moraPrijava: 'A fiók törléséhez <prijava>jelentkezz be</prijava>.',
    opis: 'Töröljük ezt a fiókot: {email}. Törlődik a profilod, minden csapatod a pontelőzményekkel, a szavazataid és az általad létrehozott miniligák. A törlés nem vonható vissza.',
    gumb: 'Fiók törlése',
    potrdi: 'Igen, végleg törlöm',
    preklici: 'Mégse',
    brisem: 'Törlés …',
    napaka: 'Nem sikerült törölni a fiókot: {napaka}',
  },
  // Zasebnost in pogoji. <b> je krepko, ostale oznake so povezave.
  pravno: {
    naslov: 'Adatvédelem és feltételek',
    zadnjaSprememba: 'Utolsó módosítás: 2026. október 9.',
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
      'Nem tároljuk a lakcímed, a telefonszámod vagy fizetési adatokat. Nem használunk követő sütiket és hirdetési eszközöket. A böngésződ tárolja a bejelentkezési munkamenetet, a súgó chat beszélgetésének azonosítóját (ha megnyitod), és munkamenet-jelölőket, amelyekkel egy oldal megtekintését csak egyszer számoljuk. Azt, hogy hányan nyitottak meg egy oldalt, csak napi összesítésként tartjuk nyilván, a neved, fiókod, eszközöd vagy IP-címed nélkül. Az általános látogatottsági statisztikát (mely oldalak, honnan jönnek a látogatók, eszköztípus és ország, néhány művelet, például a csapat összeállítása) a saját szerverünkön futó <b>Umami</b> rögzíti: sütik nélkül, az IP-címet nem tárolja, és a látogatást nem köti a fiókodhoz. Ha a böngésződben be van kapcsolva a „Ne kövessenek” beállítás, semmit sem rögzítünk.',
    dostopNaslov: 'Ki fér hozzá az adatokhoz',
    dostop:
      'Az adatok a saját szerverünkön vannak a <b>Hetzner</b> szolgáltatónál (Németország, EU), a forgalom a <b>Cloudflare</b> hálózatán keresztül érkezik (védelem és az oldal kiszolgálása). A megerősítő és jelszó-visszaállító e-maileket a saját levelezőszerverünk küldi (szintén a Hetznernél), a mobilalkalmazás értesítéseit pedig a <b>Google Firebase Cloud Messaging</b> (csak az eszköztoken és az értesítés szövege). A jobb alsó sarokban lévő súgó chat a <b>HelpStack</b> szolgáltatáson fut: oda az kerül, amit beírsz, és ha be vagy jelentkezve, a megjelenített neved, hogy tudjuk, kinek válaszolunk. Amikor a chatben az asszisztens segít, azt is láthatja, melyik oldalon és melyik bajnokságban vagy, és érvényes-e a csapatod. Az e-mail-címedet nem adjuk át neki. Senki másnak nem adjuk tovább és nem adjuk el az adataidat.',
    statistikaNaslov: 'A labdarúgók adatai',
    statistika:
      'Az általunk követett bajnokságok labdarúgóinál a nevet, a klubot, a mezszámot, a pályára lépéseket, a perceket, a gólokat és a lapokat mutatjuk. A forrás az oldal alján megnevezett szövetség nyilvánosan közzétett hivatalos jegyzőkönyvei. A posztokat és a gólpasszokat, amelyek nincsenek a jegyzőkönyvben, a közösség szavazással dönti el, ezért tévesek is lehetnek. Ebből számoljuk a játékos pontjait és árát a játékban. Ha valami nem stimmel, kattints a játékosra, és jelezd nekünk.',
    statistikaPodlaga:
      'A cél egy ingyenes fantasy játék szurkolóknak. A jogalap a jogos érdek (GDPR 6. cikk (1) bekezdés f) pont): hogy a szurkolók a bajnokságuk közzétett eredményeivel játszhassanak. Az adatokat addig mutatjuk, amíg a játékos egy általunk követett bajnokságban szerepel; az utolsó pályára lépése után 18 hónappal elrejtjük a nevét.',
    statistikaUgovor:
      'A játékos tiltakozhat az adatkezelés ellen, vagy kérheti a törlést: írj az <eposta>info@slff.eu</eposta> címre, és csatold a játékos oldalának linkjét. 14 napon belül a nevét mindenhol semleges jelölésre cseréljük, a statisztika név nélkül marad. Ugyanezt tesszük a szövetség kérésére is.',
    grbi:
      'A klubcímerek az egyes klubok tulajdonai, és csak a csapat felismerését szolgálják. Ha egy klub ezt nem szeretné, írjon nekünk, és eltávolítjuk a címert.',
    fotografijeNaslov: 'Fényképek',
    fotografije:
      'A kezdőlap fotója Abigail Keenan munkája, és az <unsplash>Unsplash</unsplash> oldalon jelent meg az ő licencük alapján, amely szabad felhasználást enged. Nem a mi bajnokságaink játékosait ábrázolja.',
    praviceNaslov: 'A jogaid',
    pravice:
      'A fiókodat és minden adatodat bármikor magad is törölheted: a fiók menüjében válaszd a <b>Fiók törlése</b> pontot (slff.eu/account). A megjelenített név javításához, vagy ha a törlés nem sikerül, írj nekünk: <eposta>info@slff.eu</eposta>. A fiók törlésével a csapatod is eltűnik a tabelláról.',
    pravilaNaslov: 'Játékszabályok',
    pravila:
      'Egy ember, egy fiók. A gólpasszokról és posztokról szóló szavazás valódi javításokra szolgál: a szándékosan hibás szavazat mindenkinek elrontja a játékot, és a fiók törléséhez vezethet. A pontozás és az árak a szezon közben változhatnak, ha valami igazságtalannak bizonyul; az ilyen változásokat bejelentjük.',
    jamstvoNaslov: 'Garancia nélkül',
    jamstvo:
      'Az oldal úgy működik, ahogy működik. Igyekszünk, hogy az adatok pontosak legyenek és az oldal elérhető legyen, de ezt garantálni nem tudjuk: a jegyzőkönyvek késhetnek, a statisztikában pedig lehetnek hibák.',
  },
}
