// Magyar fordítás: `tekme` (forrás: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  // Card voting currently uses the English fallback outside SL/DE/EN.
  kartoni: {
    preveriPrejemnika: "Please check the card recipient. You can change your vote.",
    krogCaka: "Round points await confirmation of red card recipients. Points, automatic substitutions and round rank are not yet available.",
    zacasno: "Provisional total · round statistics pending",
    naslov: "Cards · community attribution",
    uvod: "Card type, time and team come from the official report. The community identifies the missing recipient from this match’s lineup. Threshold: {prag}. You can change your vote until confirmation; league insiders’ votes count more.",
    yellow: "Yellow card",
    red: "Red card",
    second_yellow: "Second yellow card",
    pending: "Recipient awaiting votes",
    queued: "Choice awaiting verification",
    confirmed: "Recipient confirmed",
    statistikaCaka: "Player statistics await confirmation of red card recipients. Minutes, goals and points are not yet available. The official result is retained.",
    glasovi: "Weighted votes: {n} / {prag}",
    prejemnikNedosegljiv: "The confirmed recipient’s name is unavailable.",
    brezKandidatov: "Public candidates from this match’s lineup are unavailable.",
    napaka: "Voting could not be loaded or saved. Check your login and permission to vote, then try again.",
    ponovi: "Try again",
  },
  statistika: {
    brezStrelcev: "Nincsenek ellenőrzött gólszerzők.",
    nedosegljivo: "Ehhez a korábbi mérkőzéshez nem érhetők el játékosstatisztikák. A hivatalos eredmény megmarad.",
    kratko: "A statisztika nem érhető el",
    postaveTocke: "Felállások és pontok",
    kartoni: "Lapok",
    delno: "Részleges statisztika a(z) {sezona} idényről: teljes adatok {popolnih} mérkőzésről a(z) {odigranih} lejátszott bajnokiból. {nedosegljivih} korábbi mérkőzés játékosstatisztikái nem érhetők el. Az összegek és átlagok csak az ellenőrzött pályára lépéseket tartalmazzák.",
    brezOpazovanj: "Nincs ellenőrzött pályára lépés",
  },

  krog: '{n}. forduló',
  moraPrijava: 'A szavazáshoz <prijava>be kell jelentkezned</prijava>.',

  // A pontok bontása és a szabályok (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Legalább 60 játszott perc',
      nastopDo60: 'Pályára lépés 60 percig',
      gol: 'Gól',
      goli: 'Gólok ({n})',
      asistenca: 'Gólpassz',
      asistence: 'Gólpasszok ({n})',
      brezPrejetega: 'Kapott gól nélkül',
      zmaga: 'Csapatgyőzelem',
      prejetiGoli: 'Kapott gólok ({n})',
      obranjena: 'Hárított tizenegyes ({n})',
      zgresena: 'Kihagyott tizenegyes ({n})',
      avtogol: 'Öngól ({n})',
      rumeni: 'Sárga lap ({n})',
      rdeci: 'Piros lap',
    },
    pravila: {
      igralniCas: 'Játékidő',
      nastopDo60: 'Pályára lépés 60 percig',
      nastopOd60: 'Legalább 60 játszott perc',
      goliInAsistence: 'Gólok és gólpasszok',
      golVratarja: 'Kapus gólja',
      golBranilca: 'Védő gólja',
      golVezista: 'Középpályás gólja',
      golNapadalca: 'Támadó gólja',
      asistenca: 'Gólpassz',
      obramba: 'Védekezés',
      csVratar: 'Kapott gól nélkül: kapus',
      csBranilec: 'Kapott gól nélkül: védő',
      csVezist: 'Kapott gól nélkül: középpályás',
      zmaga: 'Csapatgyőzelem: kapus, védő',
      prejeta2: 'Minden 2 kapott gól: kapus, védő',
      // A kezdőlapi szabálytáblázat alatt.
      opomba:
        'A kapott gól nélküli meccs legalább 60 perc játékkal számít, a kapott gólok közül pedig csak azok, amelyek akkor esnek, amikor a játékos a pályán van.',
      obranjena:
        'Hárított tizenegyes: kapus (a jegyzőkönyv az ellenfél kihagyott tizenegyeseként rögzíti)',
      kazni: 'Levonások',
      zgresena: 'Kihagyott tizenegyes',
      avtogol: 'Öngól',
      rumeni: 'Sárga lap',
      rdeci: 'Piros lap',
    },
  },

  rezultati: {
    naslov: 'Eredmények',
    uvod:
      'Lejátszott meccsek a jegyzőkönyvekből ({zveza}). Kattints egy meccsre, és a pályán látod mindkét kezdőcsapatot: minden mezen ott vannak a játékos által szerzett pontok.',
    niZacetka: 'A szezon még nem kezdődött el.',
    prazenKrog: 'Ebben a fordulóban nincs lejátszott meccs.',
    prejsnji: 'Előző forduló',
    naslednji: 'Következő forduló',
  },

  // Stran Lestvica lige (/table): prava lestvica iz izidov in strelci.
  tabela: {
    naslov: 'Tabella',
    zavihek: '{liga} · tabella',
    uvod: 'A {sezona} idény tabellája, a jegyzőkönyvek eredményeiből számolva ({zveza}).',
    opomba: 'Közelítés: győzelem 3 pont, döntetlen 1; azonos pontszámnál a gólkülönbség, majd a lőtt gólok döntenek. A szövetségek szabályai eltérhetnek (egymás elleni eredmény, pontlevonás), a hivatalos tabella a szövetségnél található ({zveza}).',
    niTekem: 'Ebben a bajnokságban még nincs lejátszott meccs.',
    stolpci: {
      klub: 'Csapat',
      tekme: 'M',
      zmage: 'GY',
      remiji: 'D',
      porazi: 'V',
      goli: 'Gólok',
      razlika: 'GK',
      tocke: 'P',
      forma: 'Forma',
    },
    stolpciOpis: {
      tekme: 'Lejátszott meccsek',
      zmage: 'Győzelmek',
      remiji: 'Döntetlenek',
      porazi: 'Vereségek',
      goli: 'Lőtt : kapott gólok',
      razlika: 'Gólkülönbség',
      tocke: 'Pontok',
    },
    forma: { W: 'GY', D: 'D', L: 'V' },
    formaOpis: { W: 'győzelem', D: 'döntetlen', L: 'vereség' },
    strelci: 'Góllövőlista',
    niStrelcev: 'Ebben az idényben még nincs góllövő.',
    stolpciStrelcev: {
      igralec: 'Játékos',
      klub: 'Csapat',
      goli: 'Gól',
      tekme: 'Meccs',
      minute: 'Perc',
    },
  },

  tekma: {
    naslov: 'Meccs',
    niTekme: 'Ez a meccs nem szerepel a jegyzőkönyvekben.',
    nazaj: '← Eredmények',
    brezPostav:
      'A meccs jegyzőkönyve nem tartalmazza a csapatösszeállításokat, ezért a játékosonkénti pontok nem jeleníthetők meg.',
    naDresu:
      'A mezen az áll, hány pontot szerzett a játékos ezen a meccsen. A játékosra kattintva megnyílik az oldala.',
    cakajo: {
      one: 'Ezen a meccsen {n} gól vár gólpasszra: amíg nincs meg, az előkészítő +3 pont nélkül marad. Írd meg lent, ki adta a passzt.',
      other: 'Ezen a meccsen {n} gól vár gólpasszra: amíg nincs meg, az előkészítő +3 pont nélkül marad. Írd meg lent, ki adta a passzt.',
    },
    goliInAsistence: 'Gólok és gólpasszok',
    prijaviSe: 'Jelentkezz be a szavazáshoz',
  },

  // Gólpasszok oldal (szavazás a gólpasszokról).
  glasovanje: {
    naslov: 'Gólpasszok',
    kdoJePodal: 'Ki adta a gólpasszt?',
    uvod:
      'A jegyzőkönyvek ({zveza}) rögzítik a góllövőket, a gólpasszokat viszont nem. Ezekről a közösség dönt: ha ugyanaz a játékos egy gólnál <b>{glasov}</b> kap, a gólpasszt jóváírjuk neki, és <b>+3 pontot</b> ér.',
    pragGlasov: { one: '{n} szavazatot', other: '{n} szavazatot' },
    niTekem: 'Az aktuális szezonban még nincs lejátszott meccs',
    niTekemOpis:
      'A gólpasszokról szóló szavazás az első forduló lejátszása után azonnal megnyílik. Nézz vissza, amikor megérkeznek a jegyzőkönyvek.',
    arhiv: 'archívum',
    preteklaSezona:
      'Egy korábbi szezonról szavazol. Ez nem befolyásolja az aktuális bajnokság pontjait, csak a múltat javítja.',
    izberiKrog: '1. Válassz fordulót',
    izberiTekmo: '2. Válassz meccset',
    vsePotrjeno: 'Minden megerősítve',
    zaprto: 'lezárva',
    poglejTekmo: 'A meccs csapatösszeállításai és pontjai →',
    niGolov: 'Ezen a meccsen nem esett gól.',
    vsePotrjene: 'Ezen a meccsen minden gólpassz megerősítve. 🎉',
    zaprtoOpis: 'A szavazás erről a meccsről lezárult: a következő forduló határidejéig volt nyitva.',
    brezPotrjene: 'Megerősített gólpassz nélkül: {goli}.',
  },

  // Gólkártya szavazással (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'ismeretlen góllövő',
    avtogol: 'Öngól: {ime}',
    enajstmetrovka: '{ime} (tizenegyes)',
    brezAsistenceOpomba: 'gólpassz nélkül',
    potrjena: 'gólpassz megerősítve, lezárva',
    brezAsistence: 'Gólpassz nélkül',
    odlocilaSkupnost: 'így döntött a közösség',
    morasSePrijaviti: 'A szavazáshoz be kell jelentkezned',
    spremeniGlas: 'Szavazat módosítása',
    kdoJePodal: 'Ki adta a gólpasszt?',
    vodiBrez: 'Vezet: „gólpassz nélkül”',
    vodi: 'Vezet: <b>{ime}</b>',
    igralecBrezZapisa: 'jegyzőkönyvben nem szereplő játékos',
    doOdlocitve: '(még {n} a döntésig)',
    ostali: 'Többiek:',
    brezGlasovi: 'nincs ({n})',
    izberiPodajalca: 'Válaszd ki az előkészítőt: {ekipa}',
    nihce: 'Senki: gól gólpassz nélkül',
  },

  // Posztok oldal (szavazás a posztokról).
  pozicije: {
    naslov: 'Posztok',
    kjeKdoIgra: 'Ki hol játszik?',
    uvod:
      'A jegyzőkönyvek csak a kapust jelölik, a csapatokat pedig mezszám szerint sorolják fel, így a posztok nem olvashatók ki belőlük. Ezekről a közösség dönt. Szükséges szavazatok: <b>{prag}</b>. A szám csökken (legfeljebb {minPrag}-ig), ha a statisztikai becslés (mezszám, gólok, lapok) erősen abba az irányba mutat. A <b>klubszakértők</b> és a <b>magas pontosságú</b> felhasználók szavazata többet ér.',
    enkratNaTeden:
      'A megszavazott posztok <b>hetente egyszer, hétfő reggel</b> lépnek életbe, egyszerre. Így a bajnokság hét közben nem változik a kezed alatt: amit kedden látsz, az szombaton is érvényes, amikor a forduló lezárul. Az a játékos, aki már elég szavazatot gyűjtött, addig homokórával <ikona>⏳</ikona> van megjelölve.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ szakértő',
    samoIzStatistike: 'Csak statisztikából ({n})',
    vsiPotrjeni: 'A klub minden játékosának megerősített posztja van. 🎉',
    niIgralcev: 'Nincsenek játékosok.',
    status: {
      naslov: 'Szavazói státuszom',
      utezOpis:
        'Egy szavazat súlya: hozzáadódik a szakértői bónusz, ha a saját klubod játékosára szavazol.',
      utez: 'súly: {utez}×',
      tocnih: '({pravilni}/{vsi} helyes)',
      klubPoznam: 'Klub, amelyet jól ismerek (szakértő): a szavazatom ennek a klubnak a játékosainál többet ér:',
      nisemPoznavalec: '- egyik klubnak sem vagyok szakértője -',
      opomba:
        'Szakértőként csak egy klubot jelölhetsz meg. A súlyok idővel beállnak: ha a szavazataid tévesnek bizonyulnak, a bizalom csökken. A bizalmat a korábbi szavazatokból számoljuk újra, amikor a poszt ismertté válik.',
    },
    igralec: {
      statistika: '{tekme} · {minute} perc · {goli} · {cs} kapott gól nélkül',
      izZapisnika: 'A jegyzőkönyvből: a kapus meg van jelölve',
      odKluba: 'A posztot a klub állította be',
      klub: ' · klub',
      izStatistike: 'Statisztikából (mezszám, gólok, lapok): a szavazatok javíthatják',
      potrdilaSkupnost: 'A közösség megerősítette',
      zapisnik: ' · jegyzőkönyv',
      uveljavitevOpis:
        'A posztok hetente egyszer, hétfő reggel lépnek életbe, így a bajnokság hét közben nem változik a kezed alatt.',
      izglasovano: 'megszavazva: {pozicija} · hétfőn',
      neIgraOpis: 'Már nem játszik, nincs a piacon. Ha megjelenik egy jegyzőkönyvben, magától visszakerül.',
      neIgra: 'már nem játszik',
      vrniOpis: 'Játékos visszaállítása az aktívak közé',
      vrni: 'visszaállítás',
      odhodOpis:
        'A játékos már nem ennél a klubnál játszik: lekerül a piacról. Ha szerepel egy jegyzőkönyvben, magától visszakerül.',
      statistikaKaze:
        'A statisztika erre mutat: <b>{pozicija} ({odstotek}%)</b>. Az ilyen irányú szavazatra alacsonyabb küszöb vonatkozik ({nizji} a(z) {prag} helyett).',
      dolocenaIzStatistike: 'A posztot a statisztika alapján határoztuk meg: ha nem jó, kattints a helyesre.',
      dolocilaSkupnost: 'A posztot a közösség határozta meg: szavazatokkal javítható.',
      gumbUtez: 'Súly: {utez} / küszöb: {prag}',
      gumbPrior: ' · becslés: {odstotek}%',
      gumbPoznavalec: ' · szakértőként a szavazatod többet ér',
      vodi: 'Vezet: {pozicija}, súly: {utez} / {prag}',
    },
  },
  // Razlaga točk in cene na mestu (components/Razlaga.tsx).
  razlaga: {
    zakaj: 'Miért {tocke}? A pontok bontása',
    zapri: 'Bezárás',
    ostalo: 'Egyéb',
    brezPozicije: 'A poszt még nincs meghatározva, ezért a gól egyelőre nem ér pontot. Amikor a közösség megerősíti a posztot, a pontok újraszámolódnak.',
    pravila1: 'Ez a forduló a régebbi szabályok szerint pontoz: kapott gól nélküli kapus +4, győzelemért nincs pont.',
    asistence: 'A gólpasszokat a közösség szavazással erősíti meg; a meg nem erősített gólpassz még nem ér pontot.',
    zadnjiKrog: 'Utolsó meccs: {krog}. forduló',
    cena: {
      zakaj: 'Miért ennyi az ár?',
      zdaj: 'Jelenlegi ár',
      izhodisce: 'Kezdőár',
      izhodisceOpis: 'A kezdőár az előző idény perceiből és pontjaiból számolódik, a liga többi játékosához mérve.',
      privzeta: 'Aki az előző idényben {minut} percnél kevesebbet játszott, {cena} áron indul; kivéve, ha magasabb ligában játszott; akkor az ottani ár alapján kap árat.',
      borza: 'Minden forduló után változik az ár: +{korak} minden 2 feletti két pontért (fordulónként legfeljebb +{najvec}), −{korak} gyenge forduló vagy gyenge forma után, és −{korak}, ha a játékos sorozatban a második fordulóban sem játszik, pedig a klubja igen.',
      razpon: 'Az ár mindig {od} és {do} között van.',
    },
  },
}
