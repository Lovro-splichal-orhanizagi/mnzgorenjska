// Magyar fordítás: `lestvice` (forrás: src/i18n/sl/lestvice.ts).
// Sorszámok magyarul ponttal: "4. forduló", "3. hely". A paraméterekhez
// nem teszünk ragot (a hangrend nem ismert), a mondat úgy van fogalmazva,
// hogy a paraméter alanyesetben álljon.
import type { Prevod } from '../jedro.ts'

export const lestvice: NonNullable<Prevod['lestvice']> = {
  /** "4. forduló": forduló gombjai és címkéi. */
  krog: '{n}. forduló',
  mesto: '{mesto}.',
  /** "(5 csapatból)". */
  odEkip: { one: '{n} csapatból', other: '{n} csapatból' },
  pokaziVec: 'Több mutatása ({n})',
  mojeMesto: 'Az én helyezésem ↓',

  lestvica: {
    naslov: 'Tabella',
    prazna: 'A tabella még üres. Rakd össze az első csapatot!',
    napakaKrogov:
      'A fordulók eredményeit nem sikerült betölteni ({napaka}). Az alábbi összesített tabella ettől még pontos.',
    tvojRezultatZadnji: 'Az eredményed az utolsó fordulóban',
    mojaEkipa: 'Az én csapatom',
    zmagovalecKroga: 'A forduló győztese: {krog}. forduló',
    zmagovalciPoKrogih: 'Fordulók győztesei',
    odigraniKrogi: {
      one: '{n} lejátszott forduló',
      other: '{n} lejátszott forduló',
    },
    pozneje: 'Később csatlakoztál? Válaszd ki a fordulót, és onnantól versenyzel.',
    celotnaSezona: 'Teljes szezon',
    odKroga: 'A(z) {n}. fordulótól',
    igraOd: '· játszik ekkortól: {datum}',
    zavihekEkipe: 'Csapatok',
    zavihekNavijaci: 'Klubok szurkolói',
  },

  navijaciKlubov: {
    naslov: 'Klubok szurkolói',
    opis: 'Melyik klubnak vannak a legjobb menedzserei? Azoknak a szurkolóknak az átlagpontszáma számít, akiknek van csapatuk ebben a bajnokságban.',
    /** "Legalább 3 szurkolóval kerül fel a klub a tabellára." */
    pogoj: {
      one: 'Egy klub legalább {n} szurkolóval kerül fel a tabellára.',
      other: 'Egy klub legalább {n} szurkolóval kerül fel a tabellára.',
    },
    povprecjeSezona: 'Ø szezon',
    povprecjeKroga: 'Ø {n}. forduló',
    navijaci: 'Szurkolók',
    tvojKlub: 'a te klubod',
    stranKluba: 'A klub oldala →',
    premalo: 'Kevés a szurkoló',
    brezNavijacev: 'Még nincs szurkolójuk: {klubi}',
    prazno: 'Ebben a bajnokságban még senki sem választotta ki a klubját. Légy te az első!',
    izbira: {
      naslov: 'Melyik klubnak szurkolsz?',
      opis: 'Válassz klubot, és a pontjaid nála számítanak a szurkolói tabellán.',
      izberi: 'Válassz klubot',
      shrani: 'Ennek a klubnak szurkolok',
      spremeni: 'A klubodat itt, a szurkolói tabellán bármikor megváltoztathatod.',
      mojKlub: 'A klubod: <b>{klub}</b>.',
      zamenjaj: 'Klub cseréje',
    },
    klub: {
      naslov: 'A klub szurkolói',
      mesto: '{mesto}.',
      odKlubov: {
        one: '{n} klubból a szurkolói tabellán',
        other: '{n} klubból a szurkolói tabellán',
      },
      manjka: {
        one: 'Még {n} szurkoló kell, hogy a klub felkerüljön a szurkolói tabellára.',
        other: 'Még {n} szurkoló kell, hogy a klub felkerüljön a szurkolói tabellára.',
      },
      brez: 'Ennek a klubnak még nincs olyan szurkolója, akinek csapata van a bajnokságban.',
      navijam: 'Szurkolok: {klub}',
      vsiKlubi: 'A bajnokság összes klubja',
    },
  },

  slovenija: {
    naslovStrani: 'Országos tabella',
    naslov: 'Országos',
    pripravlja: 'Az országos tabella készül. Próbáld újra néhány perc múlva.',
    povzetek: 'Az összes bajnokság összes csapata együtt: {ekip}, {lig}, {zvez}.',
    lig: { one: '{n} bajnokság', other: '{n} bajnokság' },
    zvez: { one: '{n} szövetség', other: '{n} szövetség' },
    skupno: 'Összesítve',
    naKrog: 'Fordulónként',
    povprecjeRazlaga:
      'A bajnokságok nem egyszerre indulnak, ezért egy korábban kezdő bajnokság csapata már csak emiatt is több pontot gyűjt. Az átlag ezt kiegyenlíti; azok a csapatok számítanak, amelyeknek legalább ennyi van: {krogov}.',
    /** "legalább 3 lejátszott fordulóval". */
    zOdigranimiKrogi: {
      one: '{n} lejátszott forduló',
      other: '{n} lejátszott forduló',
    },
    premaloKrogov: 'Az átlaghoz egy csapatnak legalább ennyit kell játszania: {krogov}. Ennyit még egy csapat sem játszott.',
    /** "legalább 3 fordulót". */
    krogovTozilnik: { one: '{n} forduló', other: '{n} forduló' },
    nobenaEkipa: 'Még egy csapat sem játszott le fordulót.',
    lestvicaLige: 'A bajnokságod tabellája',
    zavihekEkipe: 'Csapatok',
    zavihekIgralci: 'Játékosok',
    vrhNaslov: 'Ki a legjobb országosan?',
    vrhPoglejVse: 'Nézd meg a top 10-et →',
    vrhUvod: 'Top 10 az összes bajnokságból · {sezona} szezon',
    vrhTocke: 'Legtöbb pont',
    vrhGoli: 'Góllövők',
    vrhCisteMreze: 'Kapott gól nélküli meccsek (kapusok)',
    vrhOpomba:
      'A pontokban nincsenek benne a gólpasszok: ezeket szavazás erősíti meg, ami a legtöbb bajnokságban még el sem indult, így a bajnokságok nem lennének egyenlő helyzetben. A bajnokságok eddig különböző számú fordulót játszottak.',
    vrhPrazno: 'Ebben a szezonban még nem játszottak mérkőzést.',
  },

  miniLige: {
    naslov: 'Miniligák',
    pridruzenDobrodosel: 'Csatlakoztál. Üdv a ligában!',
    pridruzen: 'Csatlakoztál.',
    zeOdPrej: 'Ez a csapat már tagja ennek a miniligának.',
    prekratkoIme: 'A miniliga nevének legalább 2 karakterből kell állnia.',
    ustvarjena: 'A miniliga elkészült: "{ime}". Kód: {koda}',
    najprejEkipa: 'Előbb rakj össze egy csapatot valamelyik bajnokságban.',
    prijava: 'A miniligákhoz <prijava>be kell jelentkezned</prijava>.',
    opis: 'Privát verseny a barátok között. A csapatok különböző bajnokságokból is lehetnek.',
    ustvari: 'Létrehozás',
    imeLige: 'A miniliga neve',
    ustvariLigo: 'Miniliga létrehozása',
    novaAliKoda: 'Új miniliga vagy csatlakozás kóddal',
    pridruziSe: 'Csatlakozás',
    koda: 'Kód ({n} karakter)',
    nisiVNobeni: 'Még egy miniligában sem vagy benne. Ki a jobb menedzser: te vagy a haverjaid?',
    ustvariLigoIme: 'Liga létrehozása: „{ime}”',
    najprejSestavi: 'Előbb rakd össze a csapatod',
    povabilo: 'Meghívó: <povezava>{povezava}</povezava><koda>kód: {koda}</koda>',
    deliPovabilo: 'Meghívó megosztása',
    prazna: 'Ebben a miniligában még nincs csapat.',
    // Meghívó megosztásának eredménye (PovabiSoigralce is).
    poslano: 'Meghívó elküldve.',
    kopirano: 'Meghívó kimásolva, illeszd be a csoportos csetbe.',
    neuspelo: 'A megosztás nem sikerült.',
    neuspeloPovezava: 'A megosztás nem sikerült. A linket a Miniligák oldalon találod.',
    // lib/miniLige
    vpisiKodo: 'Írd be a miniliga kódját.',
    dolzinaKode: 'A kód {dolzina} karakteres, te ennyit írtál be: {vpisal}.',
    slabiZnaki: 'A kódban nincsenek ilyen karakterek: {znaki}. Nézd meg, nem keverted-e össze a 0-t és az O-t vagy az 1-et és az I-t.',
    besediloVabila: 'Lépj be a miniligámba az SLFF-en („{ime}”), és győzz le: {povezava}',
    naslovVabila: 'Miniliga: {ime} | SLFF',
    privzetoIme: '{ime} és barátai',
    privzetoImeBrez: 'Az én miniligám',
  },

  // Meghívó megosztása (DeliMiniLigo): létrehozás után és a liga oldalán.
  deli: {
    naslovNova: 'Kész a ligád. Most már csak ellenfelek kellenek!',
    opisNova:
      'Egy egytagú miniliga napló, nem verseny. Küldd el a linket a csoportodnak: aki rákattint, pár másodperc alatt bent van a ligában, kódot sem kell beírnia.',
    naslovSam: 'Egyedül önmagad ellen? Ellenfél nélkül nincs győzelem.',
    opisSam: 'Küldd el a linket a csapattársaidnak, a kollégáidnak, vagy annak, aki mindig tudja, kinek kellett volna játszania.',
    naslov: 'Hívj meg még valakit',
    povezava: 'Csatlakozási link',
    deli: 'Megosztás',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    kopiraj: 'Link másolása',
    kopirano: 'Link kimásolva, illeszd be a csoportos csetbe.',
    koda: 'Kód kézi beíráshoz: {koda}',
  },

  // A miniliga heti összefoglalója: a lezárt forduló történetei.
  pregled: {
    naslov: 'Heti összefoglaló',
    krog: 'Forduló',
    nalaganje: 'Böngésszük a jegyzőkönyveket …',
    prazno:
      'Amint lejátsszák az első fordulót, itt lesznek a hét történetei: ki nyert, ki hagyta a kispadon a csapatkapitányát, és ki vitte haza a fakanalat.',
    samoEna: 'Ha csatlakozik még valaki, itt győztes is lesz. Meg vesztes is.',
    tockeKroga: 'A forduló pontjai',
    deliPregled: 'Küldd el a csoportnak',
    kopiran: 'Összefoglaló kimásolva, illeszd be a csoportos csetbe.',
    sporociloNaslov: '📊 {ime}: {krog}. forduló',
    manager: 'A forduló menedzsere',
    managerOpis: '{ekipa} · {tocke}. A következő fordulóig övé a dicsőség.',
    kapetan: 'A forduló csapatkapitánya',
    kapetanOpis: '{igralec} karszalaggal {tocke} pontot hozott ({ekipa}).',
    adut: 'Rejtett ász',
    adutOpis: '{igralec} ({tocke}): rajta kívül senkinek sem volt a kezdőcsapatában ({ekipa}).',
    skok: 'Felfelé',
    skokOpis: {
      one: '{ekipa}: {n} helyet lépett előre, most {mesto}. helyen áll.',
      other: '{ekipa}: {n} helyet lépett előre, most {mesto}. helyen áll.',
    },
    padec: 'Szabadesés',
    padecOpis: {
      one: '{ekipa}: {n} helyet esett vissza, most {mesto}. helyen áll. Az ejtőernyő nem nyílt ki.',
      other: '{ekipa}: {n} helyet esett vissza, most {mesto}. helyen áll. Az ejtőernyő nem nyílt ki.',
    },
    klop: 'Arany a kispadon',
    klopOpis: '{ekipa} · {tocke} a kispadon. Mester, hol jártál?',
    zlica: 'Fakanál',
    zlicaOpis: '{ekipa} · {tocke}. A következő forduló jobb lesz. Talán.',
  },

  mojeMiniLige: {
    povabilo: 'A tabella a barátok között izgalmasabb, mint idegenek között.',
    ustvari: 'Miniliga létrehozása',
    naslov: 'Miniligáim',
    vse: 'mind →',
    vodi: ' · vezet: {ime}',
    sam: '· egyelőre egyedül vagy, hívj meg valakit →',
  },

  povabiSoigralce: {
    naslovLiga: 'Hívj meg még valakit ide: {ime}',
    naslovNova: 'Kész a csapat. Most hívd meg a haverjaidat.',
    opisLiga: 'Aki rákattint a linkre, egy kattintással csatlakozik a ligához.',
    opisNova: 'Ki a jobb menedzser? A miniliga egy tabella csak a ti bandátoknak.',
    trenutek: 'Egy pillanat …',
    deliPovabilo: 'Meghívó megosztása',
    ustvariInPovabi: 'Miniliga létrehozása és meghívás',
    miniLige: 'Miniligák',
  },

  vstop: {
    naslovLiga: 'Meghívó: {ime}',
    naslov: 'Meghívó a miniligába',
    niLige: 'Ez a miniliga nem létezik',
    niLigeOpis:
      'A link hiányos, vagy a ligát törölték. Kérj újat, vagy <ustvari>hozz létre sajátot</ustvari>.',
    ustvaril: 'Létrehozta: {ime}',
    miniLiga: 'Miniliga',
    prijaviSe: 'Jelentkezz be vagy hozz létre fiókot. Bejelentkezés után visszahozunk ide, és felveszünk a ligába, kódot sem kell beírnod.',
    prijavaAliRegistracija: 'Bejelentkezés vagy regisztráció',
    nalaganjeEkip: 'Csapataid betöltése …',
    potrebujesEkipo:
      'A miniligához csapat kell. Rakd össze, egy perc az egész, és mentéskor automatikusan csatlakozol a ligához.',
    sestaviEkipo: 'Csapat összeállítása',
    sKateroEkipo: 'Melyik csapattal?',
    vstopam: 'Csatlakozás …',
    pridruziSe: 'Csatlakozás ezzel a csapattal: {ime}',
  },

  ekipa: {
    naslov: 'Csapat',
    niEkipe: 'Ez a csapat nem létezik.',
    okvara: 'A felállást nem sikerült betölteni.',
    nazaj: 'Vissza a tabellához',
    skupaj: 'Összesen {tocke} {beseda}',
    brezKrogov:
      'Ebben a bajnokságban még egy forduló sem zárult le. A többi csapat a határidő lejárta után válik láthatóvá, addig senki sem látja őket.',
    nalaganjePostave: 'Felállás betöltése …',
    brezPostave: 'Ennek a csapatnak nem volt felállása a kiválasztott fordulóban.',
    vTemKrogu: '{beseda} ebben a fordulóban',
    kazen: '(−{kazen} az átigazolásokért)',
    namestnik: 'A csapatkapitány nem játszott, ezért a szorzót az alkapitány kapta.',
    klop: 'Kispad',
  },

  klub: {
    naslov: 'Klub',
    niKluba: 'Ez a klub nem létezik.',
    brezLige: 'Ez a klub ebben a szezonban egyik általunk követett bajnokságban sem játszik.',
    naNaslovnico: 'A kezdőlapra',
    liga: 'Bajnokság',
    podnaslov: '{liga} · játékban: {igralci}',
    uvod:
      'A(z) {klub} játékosai az <b>SLFF</b> részei, ez a fantasy liga ehhez: {liga}. A szurkolók valódi játékosokból rakják össze a saját csapatukat, a pontok pedig a <b>hivatalos jegyzőkönyvekből</b> jönnek: gólok, percek, kapott gól nélküli meccsek, lapok.',
    toLigo: 'ez a bajnokság',
    navijaci: {
      one: 'Jelenleg <b>{navijacev}</b> csapatában vannak a játékosaitok.',
      other: 'Jelenleg <b>{navijacev}</b> csapatában vannak a játékosaitok.',
    },
    sestaviEkipo: 'Rakd össze a csapatod',
    lestvica: 'Tabella',
    zaObjavo: 'Képek megosztáshoz',
    napoved: 'Beharangozó: indulásra, posztoláshoz',
    nasiIgralci: 'Játékosaink, pontokkal',
    brezStatistike: 'Ebben a szezonban még nincs statisztika ehhez a klubhoz.',
    pozicije: {
      GK: 'Kapusok',
      DEF: 'Védők',
      MID: 'Középpályások',
      FWD: 'Támadók',
    },
    goli: '{n} G · ',
    minute: '{n} perc',
    opomba: 'A pontokat a hivatalos jegyzőkönyvekből számoljuk. Ha valami nem stimmel, szólj, és kijavítjuk az adatokat.',
  },

  plakat: {
    navijaci: { one: '{n} szurkoló', other: '{n} szurkoló' },
    stavekNavijacev: {
      one: 'Már {navijacev} csapatában ott vannak a játékosaink.',
      other: 'Már {navijacev} csapatában ott vannak a játékosaink.',
    },
    // Szöveg a képen.
    izNasihIgralcev: 'Rakd össze a csapatod a játékosainkból.',
    najvecTock: 'Legtöbb pont ebben a szezonban',
    pridi: 'GYERE,',
    sestavit: 'RAKD ÖSSZE',
    ekipo: 'A CSAPATOD.',
    jeOdprta: 'Megnyílt a fantasy liga: {liga}. Ingyenes.',
    zapisnikiMnz: 'pontok a hivatalos jegyzőkönyvekből',
    fantasyLigaZa: 'Fantasy liga:',
    jeLive: 'ELINDULT.',
    pravihIgralcev: 'Rakj össze csapatot valódi játékosokból. Pontok a hivatalos jegyzőkönyvekből.',
    brezplacno: 'ingyenes',
    mestoOd: {
      one: '{mesto}. hely ({n} csapatból)',
      other: '{mesto}. hely ({n} csapatból)',
    },
    mojiNajboljsi: 'A legjobbjaim ebben a fordulóban',
    premagajMe: 'Rakd össze a csapatod, és győzz le.',
    // Szöveg megosztáskor.
    deliKlub: 'A(z) {klub} bent van az SLFF fantasy ligában: rakd össze a csapatod a játékosainkból.',
    deliNapoved:
      'Gyere, rakj össze csapatot! Megnyílt a fantasy liga ({liga}): ingyenes, valódi játékosokkal ({klub}).',
    deliLive: 'Elindult a fantasy liga: {liga}. Rakj össze csapatot valódi játékosokból, ingyen.',
    deliKrog: '{ekipa}: {tocke} {beseda} a(z) {krog}. fordulóban. Rakd össze a csapatod, és győzz le.',
  },

  // A csapat heti összefoglalója: álló kép storyhoz (Csapatom, más csapat).
  zgodba: {
    naslov: 'Heti összefoglaló: {krog}. forduló',
    opis: 'Kép az Instagram- vagy WhatsApp-storydba: pontok, helyezés a bajnokságban, csapatkapitány és a forduló legjobb játékosa.',
    deli: 'Heti összefoglaló megosztása',
    prenesi: 'Heti összefoglaló letöltése',
    // Szöveg a képen.
    nadnaslov: 'HETI ÖSSZEFOGLALÓ · {krog}. FORDULÓ',
    vKrogu: 'a(z) {krog}. fordulóban',
    gor: '▲ {n}',
    dol: '▼ {n}',
    enako: '=',
    kapetan: 'CSAPATKAPITÁNY',
    namestnik: 'ALKAPITÁNY',
    kapetanInNajboljsi: '{trak} · A CSAPAT LEGJOBBJA',
    najboljsi: 'A CSAPAT LEGJOBBJA',
    // Szöveg megosztáskor.
    deliBesedilo: '{ekipa}: {tocke} {beseda} a(z) {krog}. fordulóban. Rakd össze a csapatod, és győzz le.',
    deliBesediloMesto: '{ekipa}: {tocke} {beseda} a(z) {krog}. fordulóban, {mesto}. hely a bajnokságban. Rakd össze a csapatod, és győzz le.',
  },

  deliSliko: {
    naslov: '{naslov} | SLFF',
    kopirana: 'Link kimásolva.',
    niPripravljena: 'A képet nem sikerült elkészíteni.',
    seEnkrat: 'Koppints még egyszer a megosztás menühöz.',
    niIzrisa: 'a képet nem sikerült megrajzolni',
    shranjena: 'Kép elmentve: tedd ki Instagramra, Facebookra vagy WhatsAppra.',
    napaka: 'A képet nem sikerült elkészíteni: {napaka}',
    pripravljam: 'Készül …',
    deliSliko: 'Kép megosztása',
    prenesi: 'Kép letöltése posztoláshoz',
    deliPovezavo: 'Link megosztása',
    shrani: 'Kép mentése',
    namig: 'WhatsApp, Instagram, Facebook …: válassz a megnyíló menüben.',
  },
}
