// Nizi za področje `mojaEkipa` (glej src/i18n/index.tsx).
export const mojaEkipa = {
  naslov: 'Moja ekipa',
  /** Nadomestno ime, kadar igralcu imena ne poznamo. */
  igralec: 'Igralec',
  vprasanjeZapustitve: 'Imaš neshranjene spremembe ekipe. Res zapustiš stran?',
  /** Oznaka traku na dresu. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'N',
  },

  // Pravila sestave (lib/pravila.ts) — razlogi na trgu in seznam napak.
  pravila: {
    pozicije: {
      GK: 'Vratarji',
      DEF: 'Branilci',
      MID: 'Vezisti',
      FWD: 'Napadalci',
    },
    kaderPoln: 'Kader je poln ({n} igralcev).',
    pozicijaPolna: '{pozicija}: v kadru jih imaš že {n}.',
    premaloProracuna: 'Premalo proračuna — igralec stane {cena}, na voljo imaš {preostalo}.',
    izKluba: 'Iz kluba {klub} imaš že {n} igralce.',
    velikostEkipe: 'Ekipa mora šteti {n} igralcev (trenutno {trenutno}).',
    velikostPostave: 'V prvi postavi mora biti {n} igralcev (trenutno {trenutno}).',
    brezPozicije: {
      one: '{n} izbrani igralec še nima potrjene pozicije — pomagaj v razdelku Pozicije.',
      two: '{n} izbrana igralca še nimata potrjene pozicije — pomagaj v razdelku Pozicije.',
      few: '{n} izbrani igralci še nimajo potrjene pozicije — pomagaj v razdelku Pozicije.',
      other: '{n} izbranih igralcev še nima potrjene pozicije — pomagaj v razdelku Pozicije.',
    },
    niVecVLigi: '{ime} ni več v ligi — zamenjaj ga.',
    pozicijaVKadru: '{pozicija} v kadru: {n} — biti jih mora {kader}.',
    pozicijaVPostavi: '{pozicija} v prvi postavi: {n} — dovoljeno {min}–{max}.',
    dolociKapetana: 'Določi kapetana — v krogu prinese {n}-kratne točke.',
    enKapetan: 'Kapetan je lahko le eden.',
    dolociNamestnika: 'Določi namestnika, ki prevzame trak, če kapetan ne igra.',
    istiKlub: 'Iz istega kluba lahko izbereš največ {n} igralce.',
    presegelProracun: 'Presegel si proračun za {cena}.',
  },

  napake: {
    zeImas: 'Ekipo v tej ligi že imaš — naloži stran znova.',
    dovoljenje: 'Za to nimaš dovoljenja. Prijavi se znova in poskusi še enkrat.',
    povezava: 'Ni povezave s strežnikom. Preveri internet in poskusi znova.',
    shranjevanje: 'Shranjevanje ni uspelo. Poskusi znova.',
    nalaganjePovezava: 'Ni povezave s strežnikom — preveri internet.',
    nalaganje: 'Podatkov ekipe ni bilo mogoče naložiti.',
    nalaganjeNiCelo:
      'Dokler se ekipa ne naloži v celoti, je ni mogoče shraniti — sicer bi shranjevanje izbrisalo igralce, ki se niso naložili.',
    poskusiZnova: 'Poskusi znova',
    vpisiIme: 'Najprej vpiši ime ekipe.',
    osvezitev:
      'Ekipa je shranjena, osvežitev pa ni uspela — naloži stran znova, preden jo spet urejaš.',
    najprejShrani: 'Najprej shrani ekipo.',
    izberiKrog: 'Izberi krog, v katerem naj pripomoček velja.',
    prihodnjiKrog: 'Izberi prihodnji nezaklenjen krog z določenim rokom.',
    zeUporabil: 'Ta pripomoček si v tej sezoni že uporabil.',
    niPreklica: 'Pripomočka za ta krog ni več mogoče preklicati.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'V tej ligi še ni igralcev na trgu.',
    pocakaj: 'Počakaj, da se shranjevanje konča.',
    niPredloga: 'Iz te lige zaenkrat ni mogoče sestaviti veljavne ekipe.',
    predlogSestavljen: 'Ekipa je sestavljena — zamenjaj, kogar hočeš, in pritisni Shrani.',
    kaderDopolnjen: 'Manjkajoča mesta so zapolnjena — preveri in pritisni Shrani.',
    niDopolnitve:
      'Kadra ni mogoče dopolniti z denarjem, ki ti je ostal. Zamenjaj katerega od dragih igralcev in poskusi znova.',
    kapetanNaKlop: '{ime} je šel na klop — izberi novega kapetana.',
    namestnikNaKlop: '{ime} je šel na klop — izberi novega namestnika.',
    brezPozicije: 'Igralec še nima potrjene pozicije, zato ga ni mogoče postaviti na igrišče.',
    niProstora:
      'V postavi ni prostora za še enega igralca na tej poziciji — najprej daj koga na klop.',
    niVecNamestnik: '{ime} ni več namestnik — izberi novega.',
    niVecKapetan: '{ime} ni več kapetan — izberi novega.',
    rokPotekel: 'Rok {krog}. kroga je že potekel, zato spremembe veljajo od naslednjega kroga.',
    shranjenaZaKrog: 'Ekipa je shranjena in pripravljena za {krog}. krog.',
    shranjenaVeljavna: 'Ekipa je shranjena in izpolnjuje pravila.',
    osnutekShranjen:
      'Osnutek shranjen — ekipa še ne izpolnjuje pravil, zato za ta krog ne bi dobila točk.',
    prodaja: 'Prodaja ti je prinesla +{cena}.',
    nakupi: 'Nakupi so stali {cena}.',
    wildcardVlozen: 'Wildcard je vložen — prestopi v tem krogu so brezplačni.',
    klopPlusVlozen: 'Klop+ je vložen.',
    wildcardPreklican: 'Wildcard je preklican — na voljo je za drug krog.',
    klopPlusPreklican: 'Klop+ je preklican — na voljo je za drug krog.',
    zapriOpozorilo: 'Zapri opozorilo',
    zapriObvestilo: 'Zapri obvestilo',
    odstranjen: '{ime} je odstranjen.',
    razveljavi: 'Razveljavi',
  },

  prijavaPotrebna: 'Za sestavo ekipe se moraš prijaviti.',
  prijava: 'Prijava',
  locenaLiga:
    'Ekipa v ligi <liga>{liga}</liga> je ločena od ekip v drugih ligah — s svojim proračunom in svojo lestvico. Točke štejejo od {krog}. kroga naprej, ker se do takrat še vrstijo prestopi in prehodi med selekcijami.',

  prestopi: {
    stevec: 'Prestopi: {n}/{prosti}',
    wildcard: 'wildcard — brez kazni',
    odbitek: 'odbitek {tock} v tem krogu',
    prosti: {
      one: 'še {n} brezplačen, nato −{kazen} za vsakega',
      two: 'še {n} brezplačna, nato −{kazen} za vsakega',
      few: 'še {n} brezplačni, nato −{kazen} za vsakega',
      other: 'še {n} brezplačnih, nato −{kazen} za vsakega',
    },
  },

  // Rdeč pas, ko ekipa ne ustreza pravilom.
  neustreza: {
    naslov: 'Tvoja ekipa NE ustreza pravilom',
    zaKrog: '<krepko>Za {krog}. krog</krepko> v tem stanju <krepko>NE boš dobil točk</krepko>.',
    zaKrogRok:
      '<krepko>Za {krog}. krog</krepko> (rok: {rok}) v tem stanju <krepko>NE boš dobil točk</krepko>.',
    konkretne: 'Konkretne napake:',
    pogosto:
      'Pogosto se to zgodi, ker glasovanje o poziciji premakne igralca (npr. iz napadalca v vezista) in ti poruši kader. Popravi zdaj, dokler rok ni potekel.',
  },

  povzetek: {
    naVoljo: 'Na voljo še',
    bogastvo:
      'bogastvo <vrednost>{bogastvo}</vrednost><razlika></razlika> · kader {kader} <placano>plačano</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Shranjujem …',
    shraniEkipo: 'Shrani ekipo',
    neshranjeno: 'Neshranjene spremembe',
    stevec: '{n}/{igralcev} · postava {prvi}/{prvih}',
    imeEkipe: 'Ime ekipe',
    fiksnoNamig: 'Ime ekipe je po prvi shranitvi fiksno — enotna oznaka na lestvici in v zgodovini.',
    fiksno: '🔒 fiksno',
    primerImena: 'npr. Nedeljski Junaki',
    imeNamig: 'Imena po prvi shranitvi ni več mogoče spremeniti.',
  },

  // Uvodni nasvet za prazno ekipo.
  zacetek: {
    naslov: 'Kje začeti?',
    sestaviMi: '🎲 Sestavi mi ekipo',
    opisPredloga:
      'Naključno izberemo veljavno ekipo v okviru proračuna — vsak klik drugo. Nato zamenjaj, kogar hočeš, in shrani.',
    drugPredlog: '🎲 Drug predlog',
    opisDrugegaPredloga:
      'Ni všeč? Izžrebaj novo ekipo — dokler je ne shraniš, je to zastonj.',
    dopolni: '🎲 Dopolni ekipo',
    opisDopolnitve:
      'Prostih mest v kadru: {n}. Tvoje izbire ostanejo, preostala mesta naključno zapolnimo v okviru proračuna.',
    korak1: 'Vpiši ime ekipe zgoraj — brez njega shranjevanje ne bo delovalo.',
    korak2:
      'Klikni <krepko>＋</krepko> na praznem mestu igrišča. Na telefonu je v spodnjem pasu še gumb <krepko>＋ Dodaj</krepko>, na računalniku pa izbiraš s <krepko>trga igralcev</krepko> desno.',
    korak3:
      'Kader je {n} igralcev: {gk} GK, {def} BR, {mid} VE, {fwd} NA. Iz istega kluba največ {klub}.',
    korak4:
      'Ko so mesta zapolnjena, določi <krepko>kapetana</krepko> in <krepko>namestnika</krepko>, nato pritisni <krepko>Shrani ekipo</krepko> (na telefonu <krepko>Shrani</krepko> v spodnjem pasu).',
  },

  trak: {
    naslov: 'Trak',
    kapetan: 'Kapetan (×{n})',
    namestnik: 'Namestnik',
    opis: 'Kapetan prinese trojne točke. Če ne igra, trak prevzame namestnik.',
    nihce: '— nihče —',
  },

  // "Kaj-če": koliko bi zdajšnja postava prinesla v zadnjem krogu.
  kajCe: {
    prinesla: 'Zdajšnja postava bi v <krog>{krog}. krogu</krog> ({sezona}) prinesla',
    opis: '"Kaj-če" pregled — ni zgodovinski rezultat, spremeni se ob vsaki zamenjavi. Dejanske točke za pretekle kroge najdeš na lestvici in v posnetku postave.',
  },

  status: {
    pripravljena: 'Ekipa je pripravljena za shranjevanje.',
    manjka: 'Za dokončno shranitev je še nekaj potrebnega:',
    vpisiIme: 'Vpiši ime ekipe (v polju zgoraj).',
    osnutekZdaj: 'Osnutek lahko shraniš tudi zdaj — pravila boš dopolnil pozneje.',
    shraniOsnutek: 'Shrani osnutek',
    imeObvezno: 'Ime ekipe je obvezno — klik te vrne na polje zgoraj.',
    kajPomeni:
      '<krepko>Kaj pomeni "Shrani"?</krepko> Tvoje spremembe (kader, postava, kapetan) se zapišejo v bazo. Za trenutni krog velja stanje ob roku. Do roka lahko poljubno spreminjaš in ponovno pritiskaš Shrani — velja zadnja verzija. <krepko>"Shrani osnutek"</krepko> pomeni isto, samo z opombo, da ekipa še ne izpolnjuje vseh pravil (za točke rabiš popravke — glej seznam zgoraj).',
    kajPomeniRok:
      '<krepko>Kaj pomeni "Shrani"?</krepko> Tvoje spremembe (kader, postava, kapetan) se zapišejo v bazo. Za trenutni krog velja stanje ob roku (<krepko>{krog}. krog — {rok}</krepko>). Do roka lahko poljubno spreminjaš in ponovno pritiskaš Shrani — velja zadnja verzija. <krepko>"Shrani osnutek"</krepko> pomeni isto, samo z opombo, da ekipa še ne izpolnjuje vseh pravil (za točke rabiš popravke — glej seznam zgoraj).',
  },

  pripomocki: {
    klopPlusNaslov: 'Pripomoček Klop+',
    klopPlusVlozenZa: 'Vložen za {krog}. krog ({sezona}) — v njem štejejo tudi točke klopi.',
    klopPlusVlozen: 'Klop+ je že vložen — v njem štejejo tudi točke klopi.',
    klopPlusOpis:
      'Enkrat na sezono: v izbranem krogu se prištejejo še točke vseh štirih rezervnih igralcev.',
    wildcardNaslov: 'Pripomoček Wildcard',
    wildcardVlozenZa: 'Vložen za {krog}. krog ({sezona}) — prestopi v njem so brezplačni.',
    wildcardVlozen: 'Wildcard je že vložen — prestopi v njem so brezplačni.',
    wildcardOpis:
      'Enkrat na sezono: v tem krogu lahko zamenjaš kolikor igralcev hočeš, brez odbitka točk.',
    zaklenjen: '🔒 zaklenjen',
    preklici: 'prekliči',
    prekliciDo: 'Prekliči lahko do <odstevanje></odstevanje>',
    izberiKrog: 'Izberi krog …',
    niKroga: 'Ni prihodnjega kroga z rokom',
    krogSezona: '{krog}. krog ({sezona})',
    vlozi: 'Vloži',
    vloziZa: 'Vloži za {krog}. krog',
  },

  zgodovina: {
    naslov: 'Zgodovina postav',
    posnetkov: {
      one: '{n} krog s posnetkom',
      two: '{n} kroga s posnetkoma',
      few: '{n} krogi s posnetki',
      other: '{n} krogov s posnetki',
    },
    krog: '{krog}. krog',
    podrobnost: '{krog}. krog · sezona {sezona}',
    podrobnostSkupaj: '{krog}. krog · sezona {sezona} · skupaj <krepko>{tocke}</krepko>',
    deli: 'Deli {krog}. krog',
  },

  // Spodnji pas in predal trga na telefonu.
  telefon: {
    ostane: 'ostane',
    predalPovzetek: 'ostane <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'popravi ↑',
    neshranjeno: 'neshranjeno',
    dodaj: '＋ Dodaj',
    osnutekNamig: 'Ekipa še ne izpolnjuje pravil — shrani se kot osnutek.',
    neIzpolnjuje: 'ekipa še ne izpolnjuje pravil',
    zapriTrg: 'Zapri trg',
    zapri: '✕ Zapri',
  },

  trg: {
    naslov: 'Trg igralcev',
    iskanje: 'Išči po imenu …',
    pocistiIskanje: 'Počisti iskanje',
    vsi: 'vsi',
    vsiKlubi: 'Vsi klubi',
    niZadetkov: 'Ni zadetkov.',
    pocistiFiltre: 'Počisti filtre',
    statLetos: '{goli} G · {minute} min',
    statLani: 'lani {goli} G',
    brezNastopov: 'brez nastopov',
    niVecVLigi: 'ni več v ligi',
    tockeZadnjiKrog: 'Točke v zadnjem odigranem krogu',
    podatki: 'Podatki o igralcu {ime}',
    podatkiNamig: 'Statistika, gibanje cene, naslednje tekme',
    odstrani: '✕ odstrani',
    dodaj: '⊕ dodaj',
    prvih: 'Prikazanih prvih {n} — zoži izbor z iskanjem.',
    noga: 'Iz istega kluba lahko izbereš največ {n} igralce. Goli in minute so iz tekoče sezone.',
  },

  rok: {
    krog: '{krog}. krog',
    potekel: 'Rok je potekel — <krepko>{rok}</krepko>',
    rok: 'Rok: <krepko>{rok}</krepko>',
    niDolocen: 'Rok še ni določen.',
    naslednji: 'Spremembe zdaj veljajo za naslednji krog.',
    obRoku: 'Ob roku se postava posname — dokler ni potekel, prosto spreminjaj.',
  },

  // Igrišče pri sestavi ekipe (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Premakni na klop',
    vPostavo: 'Uvrsti v prvo postavo',
    niVecVLigiNamig: 'Igralec ni več v ligi — kader z njim ne dobi točk.',
    niVecVLigi: 'ni več v ligi',
    poskodba: 'poškodba',
    odsoten: 'odsoten',
    kapetan: 'Kapetan — trojne točke',
    namestnik: 'Namestnik kapetana',
    tockeKroga: 'Točke v zadnjem krogu: {tocke}',
    tockeKrogaKapetan: 'Točke v zadnjem krogu: {tocke} × 3 (kapetan)',
    odstraniIzKadra: 'Odstrani iz kadra',
    odstrani: 'Odstrani {ime}',
    prej: 'Prej na vrsti za menjavo',
    prejIme: '{ime}: prej na vrsti za menjavo',
    pozneje: 'Pozneje na vrsti za menjavo',
    poznejeIme: '{ime}: pozneje na vrsti za menjavo',
    izberi: 'Izberi: {pozicija}',
    klop: 'Klop',
    klopOpis:
      'Kdor iz postave ne igra, ga zamenja prvi z iste pozicije s klopi — po vrsti od leve proti desni.',
    brezPozicije: 'Brez potrjene pozicije — na igrišče jih ni mogoče postaviti',
  },

  // Igrišče s točkami ene ekipe na tekmi (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime} — {deli}',
    minut: '{n} min',
    goli: '{n} × gol',
    asistence: '{n} × asistenca',
    brezPrejetega: 'brez prejetega gola',
    prejetih: 'prejetih {n}',
    rumeni: 'rumeni karton',
    rdeci: 'rdeči karton',
    skupaj: '{tocke} točk',
    brezPostave: 'Zapisnik za to ekipo ne navaja postave.',
    klop: 'Klop',
    vstopilo: '— {n} vstopilo v igro',
  },

  // Idealna enajsterica in tuja postava na igrišču.
  enajsterica: {
    kapetan: 'Kapetan',
    namestnik: 'Namestnik s trakom',
  },

  // Pas z obvestili o mojih ekipah (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Opozorila v tvojih ekipah',
    naslovNapakEna: 'Ena od tvojih ekip ne bo dobila točk',
    naslovNapak: {
      one: '{n} tvoja ekipa ne bo dobila točk',
      two: '{n} tvoji ekipi ne bosta dobili točk',
      few: '{n} tvoje ekipe ne bodo dobile točk',
      other: '{n} tvojih ekip ne bo dobilo točk',
    },
    nimasEkipe: 'Nimaš še ekipe<liga>({liga})</liga> — brez nje v naslednjem krogu ne dobiš točk.',
    sestavi: 'Sestavi ekipo →',
    popravi: 'Popravi →',
    poglej: 'Poglej →',
    skrij: 'Skrij opozorilo: {besedilo}',
    skrijNamig: 'Skrij, dokler ni novega poročila',
    pokaziVse: 'Pokaži vse ({n})',
    razlog: 'Ekipa ne izpolnjuje pravil.',
    brezTockKrog: 'V {krog}. krogu ne bo dobila točk.',
    brezTockRok: 'Ob naslednjem roku ne bo dobila točk.',
    nepopolna: 'Ekipa ni popolna — ta krog se še zaklene, od naslednjega pa ne bo dobila točk.',
    igralec: {
      kapetan: {
        poskodba: 'Kapetan {ime} je poškodovan.',
        odsotnost: 'Kapetan {ime} je odsoten.',
      },
      namestnik: {
        poskodba: 'Namestnik kapetana {ime} je poškodovan.',
        odsotnost: 'Namestnik kapetana {ime} je odsoten.',
      },
      vPostavi: {
        poskodba: '{ime} je poškodovan in je v prvi postavi.',
        odsotnost: '{ime} je odsoten in je v prvi postavi.',
      },
      naKlopi: {
        poskodba: '{ime} na klopi je poškodovan.',
        odsotnost: '{ime} na klopi je odsoten.',
      },
    },
    posledica: {
      kapetan: 'Če ne igra, trak prevzame namestnik — morda raje izberi drugega kapetana.',
      namestnik: 'Če ne igrata ne kapetan ne namestnik, trojnih točk ni.',
      vPostavi: 'Če ne igra, ga zamenja prvi igralec z iste pozicije s klopi.',
      naKlopi: 'Pri samodejni menjavi ga bo sistem preskočil, če ne igra.',
    },
  },
}
