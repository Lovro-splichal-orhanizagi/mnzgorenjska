// Magyar fordítás: `tekme` (forrás: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
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
}
