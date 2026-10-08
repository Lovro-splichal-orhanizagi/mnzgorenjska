// Magyar fordítás: `mojaEkipa` (forrás: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Csapatom',
  /** Ha a játékos neve nem ismert. */
  igralec: 'Játékos',
  vprasanjeZapustitve: 'Mentetlen változtatásaid vannak a csapatban. Mégis elhagyod az oldalt?',
  /** Karszalag jelölése a mezen. */
  oznaka: {
    kapetan: 'C',
    namestnik: 'A',
  },

  // A keret szabályai (lib/pravila.ts): indokok a piacon és a hibalistában.
  pravila: {
    pozicije: {
      GK: 'Kapusok',
      DEF: 'Védők',
      MID: 'Középpályások',
      FWD: 'Támadók',
    },
    kaderPoln: 'A kereted megtelt ({n} játékos).',
    pozicijaPolna: '{pozicija}: már {n} van a keretedben.',
    premaloProracuna: 'Nincs elég pénzed: a játékos ára {cena}, neked {preostalo} maradt.',
    izKluba: 'Ebből a klubból már {n} játékosod van: {klub}.',
    velikostEkipe: 'A keretben {n} játékosnak kell lennie (most: {trenutno}).',
    velikostPostave: 'A kezdőcsapatban {n} játékosnak kell lennie (most: {trenutno}).',
    brezPozicije: {
      one: '{n} kiválasztott játékosodnak még nincs megerősített posztja. Segíts a Posztok oldalon.',
      other: '{n} kiválasztott játékosodnak még nincs megerősített posztja. Segíts a Posztok oldalon.',
    },
    niVecVLigi: '{ime} már nem játszik a bajnokságban, cseréld le.',
    pozicijaVKadru: '{pozicija} a keretben: {n}, pontosan {kader} kell.',
    pozicijaVPostavi: '{pozicija} a kezdőben: {n}, megengedett: {min} és {max} között.',
    dolociKapetana: 'Válassz csapatkapitányt: ő {n}× pontot szerez a fordulóban.',
    enKapetan: 'Csak egy csapatkapitányod lehet.',
    dolociNamestnika: 'Válassz alkapitányt, aki átveszi a karszalagot, ha a kapitány nem játszik.',
    istiKlub: 'Ugyanabból a klubból legfeljebb {n} játékost választhatsz.',
    presegelProracun: 'Túllépted a költségvetést ennyivel: {cena}.',
  },

  napake: {
    zeImas: 'Ebben a bajnokságban már van csapatod. Töltsd újra az oldalt.',
    dovoljenje: 'Ehhez nincs jogosultságod. Jelentkezz be újra, és próbáld meg még egyszer.',
    povezava: 'Nincs kapcsolat a szerverrel. Ellenőrizd az internetet, és próbáld újra.',
    shranjevanje: 'A mentés nem sikerült. Próbáld újra.',
    nalaganjePovezava: 'Nincs kapcsolat a szerverrel, ellenőrizd az internetet.',
    nalaganje: 'Nem sikerült betölteni a csapatod adatait.',
    nalaganjeNiCelo:
      'A csapatot addig nem lehet menteni, amíg teljesen be nem töltődik, különben a mentés törölné a be nem töltött játékosokat.',
    poskusiZnova: 'Újra',
    vpisiIme: 'Előbb add meg a csapat nevét.',
    osvezitev:
      'A csapatod elmentve, de a frissítés nem sikerült. Töltsd újra az oldalt, mielőtt újra szerkeszted.',
    najprejShrani: 'Előbb mentsd el a csapatot.',
    izberiKrog: 'Válaszd ki a fordulót, amelyre a bónusz vonatkozik.',
    prihodnjiKrog: 'Válassz egy következő, még nem lezárt fordulót, amelynek van határideje.',
    zeUporabil: 'Ezt a bónuszt ebben a szezonban már felhasználtad.',
    niPreklica: 'Az erre a fordulóra kijátszott bónusz már nem vonható vissza.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'Ebben a bajnokságban még nincsenek játékosok a piacon.',
    pocakaj: 'Várd meg, amíg a mentés befejeződik.',
    niPredloga: 'Ebből a bajnokságból még nem lehet szabályos csapatot összeállítani.',
    predlogSestavljen: 'A csapatod kész. Cserélj, akit szeretnél, és nyomd meg a Mentés gombot.',
    kaderDopolnjen: 'Az üres helyeket feltöltöttük. Nézd át őket, és nyomd meg a Mentés gombot.',
    niDopolnitve:
      'A maradék pénzedből nem lehet kiegészíteni a keretet. Cseréld le az egyik drága játékost, és próbáld újra.',
    kapetanNaKlop: '{ime} a kispadra került, válassz új csapatkapitányt.',
    namestnikNaKlop: '{ime} a kispadra került, válassz új alkapitányt.',
    brezPozicije: 'Ennek a játékosnak még nincs megerősített posztja, ezért nem állíthatod be a pályára.',
    niProstora:
      'A kezdőcsapatban nincs több hely ezen a poszton. Előbb ültess le valakit a kispadra.',
    niVecNamestnik: '{ime} már nem alkapitány, válassz újat.',
    niVecKapetan: '{ime} már nem csapatkapitány, válassz újat.',
    rokPotekel: 'A(z) {krog}. forduló határideje lejárt, a változtatások a következő fordulótól érvényesek.',
    shranjenaZaKrog: 'A csapatod elmentve, készen áll a(z) {krog}. fordulóra.',
    shranjenaVeljavna: 'A csapatod elmentve, és megfelel a szabályoknak.',
    osnutekShranjen:
      'Piszkozat elmentve. A csapatod még nem felel meg a szabályoknak, így ebben a fordulóban nem szerezne pontot.',
    prodaja: 'Az eladás hozama: +{cena}.',
    nakupi: 'A vásárlások ára: {cena}.',
    wildcardVlozen: 'Wildcard kijátszva: az átigazolások ebben a fordulóban ingyenesek.',
    klopPlusVlozen: 'Kispad+ kijátszva.',
    wildcardPreklican: 'Wildcard visszavonva, egy másik fordulóban felhasználhatod.',
    klopPlusPreklican: 'Kispad+ visszavonva, egy másik fordulóban felhasználhatod.',
    zapriOpozorilo: 'Figyelmeztetés bezárása',
    zapriObvestilo: 'Értesítés bezárása',
    odstranjen: 'Eltávolítva: {ime}.',
    razveljavi: 'Visszavonás',
  },

  prijavaPotrebna: 'A csapat összeállításához be kell jelentkezned.',
  prijava: 'Bejelentkezés',
  locenaLiga:
    'A csapatod itt: <liga>{liga}</liga>, külön van a többi bajnokságban lévő csapataidtól, saját költségvetéssel és saját tabellával. A pontok a(z) {krog}. fordulótól számítanak, mert addig még zajlanak az átigazolások és a korosztályok közti váltások.',

  /** Összecsukható rész a pálya alatt. */
  vec: 'Még: bónuszok, előzmények, szabályok',

  prestopi: {
    stevec: 'Átigazolások: {n}/{prosti}',
    wildcard: 'wildcard, levonás nélkül',
    odbitek: 'Levonás ebben a fordulóban: {tock}',
    prosti: {
      one: 'Még {n} ingyenes, utána egyenként −{kazen}',
      other: 'Még {n} ingyenes, utána egyenként −{kazen}',
    },
  },

  // Átigazolási tippek (lib/namigiEkipe.ts): ki nem játszik a következő
  // fordulóban, és kit engedhetsz meg helyette.
  namigi: {
    naslov: 'Átigazolási tippek',
    zaKrog: 'Ki nem játszik valószínűleg a(z) {krog}. fordulóban, és kit engedhetsz meg helyette.',
    razlog: {
      neaktiven: 'már nincs a bajnokságban',
      poskodba: 'sérült',
      odsotnost: 'nem elérhető',
      brezTekme: 'a klubja nem játszik',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'Csere a keretben: {ime} helyett {novi}',
    niZamenjave: 'Nincs olyan csere, amely belefér a költségvetésbe és a szabályokba.',
    opomba: 'A kattintás csak előkészíti a cserét, a csapatot neked kell elmentened. Minden tipp önmagában érvényes.',
    skrij: 'Elrejtés a következő fordulóig',
    zamenjano: '{novi} bekerült a keretbe, helyette kikerült: {ime}. Mentsd a csapatot, ha elégedett vagy.',
  },

  // A keret játékosainak árváltozásai a legutóbbi látogatás óta.
  odZadnjegaObiska: {
    naslov: 'Legutóbbi látogatásod óta',
    naslovTeden: 'Az elmúlt héten',
    vrednost: 'Csapatérték <znesek>{znak}{cena}</znesek>',
    gor: 'áremelkedés',
    dol: 'árcsökkenés',
    zapri: 'Bezárás',
  },

  povzetek: {
    urediIme: 'Csapatnév szerkesztése: {ime}',
    bogastvo:
      'vagyon <vrednost>{bogastvo}</vrednost><razlika></razlika> · keret {kader} <placano>kifizetve</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Mentés …',
    shraniEkipo: 'Csapat mentése',
    neshranjeno: 'Mentetlen változtatások',
    imeEkipe: 'Csapatnév',
    privzetoIme: 'FC {ime}',
    primerImena: 'pl. Vasárnapi Hősök',
  },

  // Kezdő tipp üres csapathoz.
  zacetek: {
    naslov: 'Hol kezdjem?',
    sestaviMi: 'Állíts össze nekem egy csapatot',
    opisPredloga:
      'Véletlenszerűen kiválasztunk egy szabályos csapatot a költségvetésen belül, minden kattintásra másikat. Utána cserélj, akit szeretnél, és mentsd el.',
    sam: 'Inkább magam rakom össze',
    drugPredlog: 'Másik javaslat',
    opisDrugegaPredloga:
      'Nem tetszik? Sorsolj új csapatot, mentésig ingyenes.',
    dopolni: 'Egészítsd ki a csapatomat',
    opisDopolnitve:
      'Üres helyek a keretben: {n}. A te választásaid maradnak, a többit véletlenszerűen töltjük fel a költségvetésen belül.',
    korak1: 'Fent javasoltunk egy csapatnevet, bármikor megváltoztathatod.',
    korak2:
      'Kattints a <krepko>＋</krepko> jelre egy üres helyen a pályán. Telefonon az alsó sávban van egy <krepko>＋ Hozzáadás</krepko> gomb is, számítógépen a jobb oldali <krepko>játékospiacról</krepko> választasz.',
    korak3:
      'A keret {n} játékosból áll: {gk} kapus, {def} védő, {mid} középpályás, {fwd} támadó. Ugyanabból a klubból legfeljebb {klub}.',
    korak4:
      'Ha minden hely betelt, válassz <krepko>csapatkapitányt</krepko> és <krepko>alkapitányt</krepko>, majd nyomd meg a <krepko>Csapat mentése</krepko> gombot (telefonon az alsó sávban a <krepko>Mentés</krepko> gombot).',
  },

  trak: {
    naslov: 'Karszalag',
    kapetan: 'Csapatkapitány (×{n})',
    namestnik: 'Alkapitány',
    nihce: '(senki)',
  },

  // "Mi lett volna, ha": mennyit ért volna a mostani kezdő a legutóbbi fordulóban.
  kajCe: {
    prinesla: 'A mostani kezdőcsapatod ennyit szerzett volna: <krog>{krog}. forduló</krog> ({sezona})',
    opis: '"Mi lett volna, ha" nézet, nem valós eredmény: minden cserével változik. A lejátszott fordulók valódi pontjai a tabellán és a kezdőcsapat pillanatképében vannak.',
  },

  status: {
    manjka: 'A végleges mentéshez még néhány dolog hiányzik:',
    vpisiIme: 'Add meg a csapat nevét (a fenti mezőben).',
    osnutekZdaj: 'Piszkozatot már most is menthetsz, a szabályokat később is rendbe teheted.',
    brezTock: 'Ebben az állapotban <krepko>NEM szerzel pontot</krepko> <krepko>a(z) {krog}. fordulóban</krepko>.',
    kajPomeni:
      '<krepko>Mit csinál a "Mentés"?</krepko> A változtatásaid (keret, kezdőcsapat, csapatkapitány) bekerülnek az adatbázisba. Az aktuális fordulóban a határidőkori állapot számít. A határidőig annyiszor változtathatsz és menthetsz, ahányszor akarsz, az utolsó változat számít. A <krepko>"Piszkozat mentése"</krepko> ugyanezt teszi, csak jelzi, hogy a csapat még nem felel meg minden szabálynak (a pontokhoz javítás kell, lásd a fenti listát).',
    kajPomeniRok:
      '<krepko>Mit csinál a "Mentés"?</krepko> A változtatásaid (keret, kezdőcsapat, csapatkapitány) bekerülnek az adatbázisba. Az aktuális fordulóban a határidőkori állapot számít (<krepko>{krog}. forduló, {rok}</krepko>). A határidőig annyiszor változtathatsz és menthetsz, ahányszor akarsz, az utolsó változat számít. A <krepko>"Piszkozat mentése"</krepko> ugyanezt teszi, csak jelzi, hogy a csapat még nem felel meg minden szabálynak (a pontokhoz javítás kell, lásd a fenti listát).',
  },

  pripomocki: {
    klopPlusNaslov: 'Kispad+ bónusz',
    klopPlusVlozenZa: 'Kijátszva: {krog}. forduló ({sezona}). A kispad pontjai is számítanak.',
    klopPlusVlozen: 'A Kispad+ már ki van játszva, a kispad pontjai is számítanak.',
    klopPlusOpis:
      'Szezononként egyszer: a kiválasztott fordulóban mind a négy cserejátékos pontjai is hozzáadódnak.',
    wildcardNaslov: 'Wildcard bónusz',
    wildcardVlozenZa: 'Kijátszva: {krog}. forduló ({sezona}). Az átigazolások ingyenesek.',
    wildcardVlozen: 'A Wildcard már ki van játszva, az átigazolások ingyenesek.',
    wildcardOpis:
      'Szezononként egyszer: ebben a fordulóban annyi játékost cserélhetsz, amennyit csak akarsz, pontlevonás nélkül.',
    zaklenjen: 'lezárva',
    preklici: 'visszavonás',
    prekliciDo: 'Visszavonhatod még: <odstevanje></odstevanje>',
    izberiKrog: 'Válassz fordulót …',
    niKroga: 'Nincs következő forduló határidővel',
    krogSezona: '{krog}. forduló ({sezona})',
    vlozi: 'Kijátszás',
    vloziZa: 'Kijátszás: {krog}. forduló',
    potrdiWildcard: 'Kijátszod a Wildcardot a(z) {krog}. fordulóra? Szezononként csak egy van.',
  },

  zgodovina: {
    naslov: 'Kezdőcsapat előzmények',
    posnetkov: {
      one: '{n} forduló pillanatképpel',
      other: '{n} forduló pillanatképpel',
    },
    krog: '{krog}. forduló',
    podrobnost: '{krog}. forduló · {sezona} szezon',
    podrobnostSkupaj: '{krog}. forduló · {sezona} szezon · összesen <krepko>{tocke}</krepko>',
    deli: 'Megosztás: {krog}. forduló',
  },

  // Alsó sáv és piac fiók telefonon.
  telefon: {
    ostane: 'maradt',
    predalPovzetek: '<krepko>{cena}</krepko> maradt · {n}/{velikost}',
    popravi: 'javítás ↑',
    neshranjeno: 'nincs mentve',
    dodaj: '＋ Hozzáadás',
    osnutekNamig: 'A csapatod még nem felel meg a szabályoknak, piszkozatként mentjük.',
    neIzpolnjuje: 'a csapat még nem felel meg a szabályoknak',
    zapriTrg: 'Piac bezárása',
    zapri: '✕ Bezárás',
  },

  trg: {
    naslov: 'Játékospiac',
    iskanje: 'Keresés név szerint …',
    pocistiIskanje: 'Keresés törlése',
    vsi: 'mind',
    vsiKlubi: 'Minden klub',
    niZadetkov: 'Nincs találat.',
    pocistiFiltre: 'Szűrők törlése',
    statLetos: '{goli} gól · {minute} perc',
    statLani: 'tavaly {goli} gól',
    brezNastopov: 'nincs pályára lépés',
    niVecVLigi: 'már nincs a bajnokságban',
    tockeZadnjiKrog: 'Pontok a legutóbbi lejátszott fordulóban',
    podatki: 'Adatok: {ime}',
    podatkiNamig: 'Statisztika, ártörténet, következő meccsek',
    profilVNovemZavihku: 'Játékosprofil megnyitása új lapon',
    odstrani: '✕ eltávolítás',
    dodaj: '⊕ hozzáadás',
    prvih: 'Az első {n} látható, szűkítsd kereséssel.',
    noga: 'Ugyanabból a klubból legfeljebb {n} játékost választhatsz. A gólok és a percek az aktuális szezonból vannak.',
  },

  rok: {
    krog: '{krog}. forduló',
    potekel: 'A határidő lejárt: <krepko>{rok}</krepko>',
    rok: 'Határidő: <krepko>{rok}</krepko>',
    niDolocen: 'Határidő még nincs megadva.',
  },

  // Pálya a csapatépítőben (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Kispadra',
    vPostavo: 'Be a kezdőbe',
    niVecVLigiNamig: 'Ez a játékos már nincs a bajnokságban, vele a keret nem szerez pontot.',
    niVecVLigi: 'már nincs a bajnokságban',
    poskodba: 'sérülés',
    odsoten: 'nem elérhető',
    kapetan: 'Csapatkapitány: háromszoros pont',
    namestnik: 'Alkapitány',
    tockeKroga: 'Pontok a legutóbbi fordulóban: {tocke}',
    tockeKrogaKapetan: 'Pontok a legutóbbi fordulóban: {tocke} × 3 (csapatkapitány)',
    odstraniIzKadra: 'Eltávolítás a keretből',
    odstrani: 'Eltávolítás: {ime}',
    prej: 'Előrébb a cseresorban',
    prejIme: '{ime}: előrébb a cseresorban',
    pozneje: 'Hátrébb a cseresorban',
    poznejeIme: '{ime}: hátrébb a cseresorban',
    izberi: 'Válassz: {pozicija}',
    klop: 'Kispad',
    klopOpis:
      'Ha egy kezdő játékos nem lép pályára, a kispad első, azonos posztú játékosa lép a helyére, balról jobbra haladva.',
    brezPozicije: 'Nincs megerősített posztja, nem állítható be a pályára',
  },

  // Pálya egy csapat pontjaival egy meccsen (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} perc',
    goli: '{n} × gól',
    asistence: '{n} × gólpassz',
    brezPrejetega: 'kapott gól nélkül',
    prejetih: '{n} kapott gól',
    rumeni: 'sárga lap',
    rdeci: 'piros lap',
    skupaj: '{tocke} pont',
    brezPostave: 'A jegyzőkönyv nem tartalmazza ennek a csapatnak az összeállítását.',
    klop: 'Kispad',
    vstopilo: '(beállt: {n})',
  },

  // A forduló csapata és egy másik menedzser kezdője a pályán.
  enajsterica: {
    kapetan: 'Csapatkapitány',
    namestnik: 'Alkapitány karszalaggal',
  },

  // Sáv a csapataimmal kapcsolatos figyelmeztetésekkel (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Figyelmeztetések a csapataidhoz',
    naslovNapakEna: 'Az egyik csapatod nem fog pontot szerezni',
    naslovNapak: {
      one: '{n} csapatod nem fog pontot szerezni',
      other: '{n} csapatod nem fog pontot szerezni',
    },
    nimasEkipe: 'Még nincs csapatod<liga>({liga})</liga>, nélküle a következő fordulóban nem szerzel pontot.',
    sestavi: 'Csapat összeállítása →',
    popravi: 'Javítás →',
    poglej: 'Megnézem →',
    skrij: 'Figyelmeztetés elrejtése: {besedilo}',
    skrijNamig: 'Elrejtés, amíg nincs új jelzés',
    pokaziVse: 'Összes mutatása ({n})',
    razlog: 'A csapat nem felel meg a szabályoknak.',
    brezTockKrog: 'A(z) {krog}. fordulóban nem fog pontot szerezni.',
    brezTockRok: 'A következő határidőnél nem fog pontot szerezni.',
    nepopolna: 'A csapat hiányos: ez a forduló még lezárul, de a következőtől nem szerez pontot.',
    igralec: {
      kapetan: {
        poskodba: 'Csapatkapitányod, {ime}, sérült.',
        odsotnost: 'Csapatkapitányod, {ime}, nem elérhető.',
        izstop: 'Csapatkapitányod, {ime}, többé nem játszik: a klubja visszalépett a bajnokságból.',
      },
      namestnik: {
        poskodba: 'Alkapitányod, {ime}, sérült.',
        odsotnost: 'Alkapitányod, {ime}, nem elérhető.',
        izstop: 'Alkapitányod, {ime}, többé nem játszik: a klubja visszalépett a bajnokságból.',
      },
      vPostavi: {
        poskodba: '{ime} sérült, és a kezdőcsapatodban van.',
        odsotnost: '{ime} nem elérhető, és a kezdőcsapatodban van.',
        izstop: '{ime} a kezdőcsapatodban többé nem játszik: a klubja visszalépett a bajnokságból.',
      },
      naKlopi: {
        poskodba: '{ime} a kispadodon sérült.',
        odsotnost: '{ime} a kispadodon nem elérhető.',
        izstop: '{ime} a kispadodon többé nem játszik: a klubja visszalépett a bajnokságból.',
      },
    },
    posledica: {
      kapetan: 'Ha nem játszik, az alkapitány kapja a karszalagot. Talán válassz másik csapatkapitányt.',
      namestnik: 'Ha sem a csapatkapitány, sem az alkapitány nem játszik, nincs háromszoros pont.',
      vPostavi: 'Ha nem játszik, a kispad első, azonos posztú játékosa lép a helyére.',
      naKlopi: 'Ha nem játszik, az automatikus csere átugorja.',
      izstop: 'Több pontot nem szerez, cseréld le. Ha megtartod, a csapatod szabályos marad.',
    },
  },
}
