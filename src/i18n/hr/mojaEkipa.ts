// Hrvatski prijevod područja `mojaEkipa` (izvor: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Moja momčad',
  /** Zamjensko ime kad igraču ne znamo ime. */
  igralec: 'Igrač',
  vprasanjeZapustitve: 'Imaš nespremljene promjene momčadi. Stvarno želiš napustiti stranicu?',
  /** Oznaka trake na dresu. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'Z',
  },

  // Pravila sastava (lib/pravila.ts) — razlozi na tržištu i popis grešaka.
  pravila: {
    pozicije: {
      GK: 'Vratari',
      DEF: 'Braniči',
      MID: 'Vezni',
      FWD: 'Napadači',
    },
    kaderPoln: 'Momčad je puna ({n} igrača).',
    pozicijaPolna: '{pozicija}: u momčadi ih već imaš {n}.',
    premaloProracuna: 'Premalo proračuna — igrač košta {cena}, na raspolaganju imaš {preostalo}.',
    izKluba: 'Iz kluba {klub} već imaš {n} igrača.',
    velikostEkipe: 'Momčad mora imati {n} igrača (trenutno {trenutno}).',
    velikostPostave: 'U prvoj postavi mora biti {n} igrača (trenutno {trenutno}).',
    brezPozicije: {
      one: '{n} odabrani igrač još nema potvrđenu poziciju — pomozi u odjeljku Pozicije.',
      few: '{n} odabrana igrača još nemaju potvrđenu poziciju — pomozi u odjeljku Pozicije.',
      other: '{n} odabranih igrača još nema potvrđenu poziciju — pomozi u odjeljku Pozicije.',
    },
    niVecVLigi: '{ime} više nije u ligi — zamijeni ga.',
    pozicijaVKadru: '{pozicija} u momčadi: {n} — mora ih biti {kader}.',
    pozicijaVPostavi: '{pozicija} u prvoj postavi: {n} — dopušteno {min}–{max}.',
    dolociKapetana: 'Odredi kapetana — u kolu donosi {n} puta više bodova.',
    enKapetan: 'Kapetan može biti samo jedan.',
    dolociNamestnika: 'Odredi zamjenika koji preuzima traku ako kapetan ne igra.',
    istiKlub: 'Iz istog kluba možeš odabrati najviše {n} igrača.',
    presegelProracun: 'Prekoračio si proračun za {cena}.',
  },

  napake: {
    zeImas: 'Već imaš momčad u ovoj ligi — ponovno učitaj stranicu.',
    dovoljenje: 'Za to nemaš dopuštenje. Ponovno se prijavi i pokušaj još jednom.',
    povezava: 'Nema veze s poslužiteljem. Provjeri internet i pokušaj ponovno.',
    shranjevanje: 'Spremanje nije uspjelo. Pokušaj ponovno.',
    nalaganjePovezava: 'Nema veze s poslužiteljem — provjeri internet.',
    nalaganje: 'Podatke momčadi nije bilo moguće učitati.',
    nalaganjeNiCelo:
      'Dok se momčad ne učita u cijelosti, ne može se spremiti — inače bi spremanje obrisalo igrače koji se nisu učitali.',
    poskusiZnova: 'Pokušaj ponovno',
    vpisiIme: 'Najprije upiši ime momčadi.',
    osvezitev:
      'Momčad je spremljena, ali osvježavanje nije uspjelo — ponovno učitaj stranicu prije nego što je opet urediš.',
    najprejShrani: 'Najprije spremi momčad.',
    izberiKrog: 'Odaberi kolo u kojem bonus vrijedi.',
    prihodnjiKrog: 'Odaberi buduće nezaključano kolo s određenim rokom.',
    zeUporabil: 'Ovaj bonus si već iskoristio ove sezone.',
    niPreklica: 'Bonus za ovo kolo više nije moguće otkazati.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'U ovoj ligi još nema igrača na tržištu.',
    pocakaj: 'Pričekaj da spremanje završi.',
    niPredloga: 'Iz ove lige zasad nije moguće složiti valjanu momčad.',
    predlogSestavljen: 'Momčad je složena — zamijeni koga želiš i pritisni Spremi.',
    kaderDopolnjen: 'Prazna mjesta su popunjena — provjeri i pritisni Spremi.',
    niDopolnitve:
      'Momčad nije moguće popuniti novcem koji ti je ostao. Zamijeni nekog od skupih igrača i pokušaj ponovno.',
    kapetanNaKlop: '{ime} je otišao na klupu — odaberi novog kapetana.',
    namestnikNaKlop: '{ime} je otišao na klupu — odaberi novog zamjenika.',
    brezPozicije: 'Igrač još nema potvrđenu poziciju pa ga nije moguće staviti na teren.',
    niProstora:
      'U postavi nema mjesta za još jednog igrača na toj poziciji — najprije pošalji nekoga na klupu.',
    niVecNamestnik: '{ime} više nije zamjenik — odaberi novog.',
    niVecKapetan: '{ime} više nije kapetan — odaberi novog.',
    rokPotekel: 'Rok {krog}. kola je već istekao pa promjene vrijede od sljedećeg kola.',
    shranjenaZaKrog: 'Momčad je spremljena i spremna za {krog}. kolo.',
    shranjenaVeljavna: 'Momčad je spremljena i ispunjava pravila.',
    osnutekShranjen:
      'Skica je spremljena — momčad još ne ispunjava pravila pa za ovo kolo ne bi dobila bodove.',
    prodaja: 'Prodaja ti je donijela +{cena}.',
    nakupi: 'Kupnje su koštale {cena}.',
    wildcardVlozen: 'Wildcard je aktiviran — prijelazi u ovom kolu su besplatni.',
    klopPlusVlozen: 'Klupa+ je aktivirana.',
    wildcardPreklican: 'Wildcard je otkazan — dostupan je za drugo kolo.',
    klopPlusPreklican: 'Klupa+ je otkazana — dostupna je za drugo kolo.',
    zapriOpozorilo: 'Zatvori upozorenje',
    zapriObvestilo: 'Zatvori obavijest',
    odstranjen: '{ime} je uklonjen.',
    razveljavi: 'Poništi',
  },

  prijavaPotrebna: 'Za slaganje momčadi moraš se prijaviti.',
  prijava: 'Prijava',
  locenaLiga:
    'Momčad u ligi <liga>{liga}</liga> odvojena je od momčadi u drugim ligama — sa svojim proračunom i svojom ljestvicom. Bodovi se računaju od {krog}. kola nadalje jer se do tada još događaju transferi i prelasci između selekcija.',

  prestopi: {
    stevec: 'Prijelazi: {n}/{prosti}',
    wildcard: 'wildcard — bez kazne',
    odbitek: 'odbitak {tock} u ovom kolu',
    prosti: {
      one: 'još {n} besplatan, zatim −{kazen} za svaki',
      few: 'još {n} besplatna, zatim −{kazen} za svaki',
      other: 'još {n} besplatnih, zatim −{kazen} za svaki',
    },
  },

  // Savjeti za prijelaze (lib/namigiEkipe.ts) — tko u sljedećem kolu neće
  // igrati i koga si možeš priuštiti umjesto njega.
  namigi: {
    naslov: 'Savjeti za prijelaze',
    zaKrog: 'Tko u {krog}. kolu vjerojatno neće igrati i koga si možeš priuštiti umjesto njega.',
    razlog: {
      neaktiven: 'više nije u ligi',
      poskodba: 'ozlijeđen',
      odsotnost: 'odsutan',
      brezTekme: 'klub ne igra',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'Umjesto {ime} u momčad stavi {novi}',
    niZamenjave: 'Nema zamjene koju bi dopustili proračun i pravila.',
    opomba: 'Klik samo priprema zamjenu — momčad spremaš sam. Svaki savjet vrijedi za sebe.',
    skrij: 'Sakrij do sljedećeg kola',
    zamenjano: '{novi} je u momčadi umjesto {ime}. Kad budeš zadovoljan, spremi momčad.',
  },

  // Kretanje cijena igrača u momčadi od zadnjeg posjeta stranici.
  odZadnjegaObiska: {
    naslov: 'Od zadnjeg posjeta',
    naslovTeden: 'U zadnjih tjedan dana',
    vrednost: 'Vrijednost momčadi <znesek>{znak}{cena}</znesek>',
    gor: 'poskupljenje',
    dol: 'pojeftinjenje',
    zapri: 'Zatvori',
  },

  // Crvena traka kad momčad ne odgovara pravilima.
  neustreza: {
    naslov: 'Tvoja momčad NE odgovara pravilima',
    zaKrog: '<krepko>Za {krog}. kolo</krepko> u ovom stanju <krepko>NEĆEŠ dobiti bodove</krepko>.',
    zaKrogRok:
      '<krepko>Za {krog}. kolo</krepko> (rok: {rok}) u ovom stanju <krepko>NEĆEŠ dobiti bodove</krepko>.',
    konkretne: 'Konkretne greške:',
    pogosto:
      'To se često dogodi jer glasovanje o poziciji premjesti igrača (npr. iz napadača u veznog) i poremeti ti momčad. Popravi sada, dok rok nije istekao.',
  },

  povzetek: {
    naVoljo: 'Preostalo',
    bogastvo:
      'bogatstvo <vrednost>{bogastvo}</vrednost><razlika></razlika> · momčad {kader} <placano>plaćeno</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Spremam …',
    shraniEkipo: 'Spremi momčad',
    neshranjeno: 'Nespremljene promjene',
    stevec: '{n}/{igralcev} · postava {prvi}/{prvih}',
    imeEkipe: 'Ime momčadi',
    fiksnoNamig: 'Ime momčadi nakon prvog spremanja je trajno — jedinstvena oznaka na ljestvici i u povijesti.',
    fiksno: '🔒 trajno',
    privzetoIme: 'FC {ime}',
    primerImena: 'npr. Nedjeljni Junaci',
    imeNamig: 'Ime možeš kasnije bilo kada promijeniti.',
  },

  // Uvodni savjet za praznu momčad.
  zacetek: {
    naslov: 'Gdje početi?',
    sestaviMi: '🎲 Složi mi momčad',
    opisPredloga:
      'Nasumično odaberemo valjanu momčad unutar proračuna — svaki klik drugu. Zatim zamijeni koga želiš i spremi.',
    sam: 'Radije ću je složiti sam',
    drugPredlog: '🎲 Drugi prijedlog',
    opisDrugegaPredloga:
      'Ne sviđa ti se? Izvuci novu momčad — dok je ne spremiš, to je besplatno.',
    dopolni: '🎲 Popuni momčad',
    opisDopolnitve:
      'Slobodnih mjesta u momčadi: {n}. Tvoji odabiri ostaju, preostala mjesta nasumično popunjavamo unutar proračuna.',
    korak1: 'Ime momčadi predložili smo gore — možeš ga bilo kada promijeniti.',
    korak2:
      'Klikni <krepko>＋</krepko> na praznom mjestu na terenu. Na mobitelu je u donjoj traci i gumb <krepko>＋ Dodaj</krepko>, a na računalu biraš na <krepko>tržištu igrača</krepko> desno.',
    korak3:
      'Momčad ima {n} igrača: {gk} VRA, {def} BRA, {mid} VEZ, {fwd} NAP. Iz istog kluba najviše {klub}.',
    korak4:
      'Kad su mjesta popunjena, odredi <krepko>kapetana</krepko> i <krepko>zamjenika</krepko>, zatim pritisni <krepko>Spremi momčad</krepko> (na mobitelu <krepko>Spremi</krepko> u donjoj traci).',
  },

  trak: {
    naslov: 'Traka',
    kapetan: 'Kapetan (×{n})',
    namestnik: 'Zamjenik',
    opis: 'Kapetan donosi trostruke bodove. Ako ne igra, traku preuzima zamjenik.',
    nihce: '— nitko —',
  },

  // "Što ako": koliko bi sadašnja postava donijela u zadnjem kolu.
  kajCe: {
    prinesla: 'Sadašnja postava bi u <krog>{krog}. kolu</krog> ({sezona}) donijela',
    opis: '"Što ako" pregled — nije povijesni rezultat, mijenja se sa svakom zamjenom. Stvarne bodove za prošla kola naći ćeš na ljestvici i u snimci postave.',
  },

  status: {
    pripravljena: 'Momčad je spremna za spremanje.',
    manjka: 'Za konačno spremanje još nešto nedostaje:',
    vpisiIme: 'Upiši ime momčadi (u polje gore).',
    osnutekZdaj: 'Skicu možeš spremiti i sada — pravila ćeš ispuniti kasnije.',
    shraniOsnutek: 'Spremi skicu',
    imeObvezno: 'Ime momčadi je obavezno — klik te vraća na polje gore.',
    kajPomeni:
      '<krepko>Što znači "Spremi"?</krepko> Tvoje promjene (momčad, postava, kapetan) zapisuju se u bazu. Za trenutno kolo vrijedi stanje u trenutku roka. Do roka možeš mijenjati koliko želiš i ponovno pritiskati Spremi — vrijedi zadnja verzija. <krepko>"Spremi skicu"</krepko> znači isto, samo s napomenom da momčad još ne ispunjava sva pravila (za bodove trebaš ispravke — vidi popis gore).',
    kajPomeniRok:
      '<krepko>Što znači "Spremi"?</krepko> Tvoje promjene (momčad, postava, kapetan) zapisuju se u bazu. Za trenutno kolo vrijedi stanje u trenutku roka (<krepko>{krog}. kolo — {rok}</krepko>). Do roka možeš mijenjati koliko želiš i ponovno pritiskati Spremi — vrijedi zadnja verzija. <krepko>"Spremi skicu"</krepko> znači isto, samo s napomenom da momčad još ne ispunjava sva pravila (za bodove trebaš ispravke — vidi popis gore).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bonus Klupa+',
    klopPlusVlozenZa: 'Aktiviran za {krog}. kolo ({sezona}) — u njemu se računaju i bodovi s klupe.',
    klopPlusVlozen: 'Klupa+ je već aktivirana — u njoj se računaju i bodovi s klupe.',
    klopPlusOpis:
      'Jednom u sezoni: u odabranom kolu pribrajaju se i bodovi sve četvorice rezervi.',
    wildcardNaslov: 'Bonus Wildcard',
    wildcardVlozenZa: 'Aktiviran za {krog}. kolo ({sezona}) — prijelazi u njemu su besplatni.',
    wildcardVlozen: 'Wildcard je već aktiviran — prijelazi u njemu su besplatni.',
    wildcardOpis:
      'Jednom u sezoni: u tom kolu možeš zamijeniti koliko god igrača želiš, bez odbitka bodova.',
    zaklenjen: '🔒 zaključano',
    preklici: 'otkaži',
    prekliciDo: 'Otkazati možeš do <odstevanje></odstevanje>',
    izberiKrog: 'Odaberi kolo …',
    niKroga: 'Nema budućeg kola s rokom',
    krogSezona: '{krog}. kolo ({sezona})',
    vlozi: 'Aktiviraj',
    vloziZa: 'Aktiviraj za {krog}. kolo',
    potrdiWildcard: 'Aktivirati Wildcard za {krog}. kolo? Imaš ga samo jednom po sezoni.',
  },

  zgodovina: {
    naslov: 'Povijest postava',
    posnetkov: {
      one: '{n} kolo sa snimkom',
      few: '{n} kola sa snimkom',
      other: '{n} kola sa snimkom',
    },
    krog: '{krog}. kolo',
    podrobnost: '{krog}. kolo · sezona {sezona}',
    podrobnostSkupaj: '{krog}. kolo · sezona {sezona} · ukupno <krepko>{tocke}</krepko>',
    deli: 'Podijeli {krog}. kolo',
  },

  // Donja traka i ladica tržišta na mobitelu.
  telefon: {
    ostane: 'preostaje',
    predalPovzetek: 'preostaje <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'popravi ↑',
    neshranjeno: 'nespremljeno',
    dodaj: '＋ Dodaj',
    osnutekNamig: 'Momčad još ne ispunjava pravila — sprema se kao skica.',
    neIzpolnjuje: 'momčad još ne ispunjava pravila',
    zapriTrg: 'Zatvori tržište',
    zapri: '✕ Zatvori',
  },

  trg: {
    naslov: 'Tržište igrača',
    iskanje: 'Traži po imenu …',
    pocistiIskanje: 'Očisti pretragu',
    vsi: 'svi',
    vsiKlubi: 'Svi klubovi',
    niZadetkov: 'Nema rezultata.',
    pocistiFiltre: 'Očisti filtre',
    statLetos: '{goli} G · {minute} min',
    statLani: 'lani {goli} G',
    brezNastopov: 'bez nastupa',
    niVecVLigi: 'više nije u ligi',
    tockeZadnjiKrog: 'Bodovi u posljednjem odigranom kolu',
    podatki: 'Podaci o igraču {ime}',
    podatkiNamig: 'Statistika, kretanje cijene, sljedeće utakmice',
    profilVNovemZavihku: 'Otvori profil igrača u novoj kartici',
    odstrani: '✕ ukloni',
    dodaj: '⊕ dodaj',
    prvih: 'Prikazano prvih {n} — suzi izbor pretragom.',
    noga: 'Iz istog kluba možeš odabrati najviše {n} igrača. Golovi i minute su iz tekuće sezone.',
  },

  rok: {
    krog: '{krog}. kolo',
    potekel: 'Rok je istekao — <krepko>{rok}</krepko>',
    rok: 'Rok: <krepko>{rok}</krepko>',
    niDolocen: 'Rok još nije određen.',
    naslednji: 'Promjene sada vrijede za sljedeće kolo.',
    obRoku: 'U trenutku roka postava se snima — dok ne istekne, slobodno mijenjaj.',
  },

  // Teren pri slaganju momčadi (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Premjesti na klupu',
    vPostavo: 'Stavi u prvu postavu',
    niVecVLigiNamig: 'Igrač više nije u ligi — momčad s njim ne dobiva bodove.',
    niVecVLigi: 'više nije u ligi',
    poskodba: 'ozljeda',
    odsoten: 'odsutan',
    kapetan: 'Kapetan — trostruki bodovi',
    namestnik: 'Zamjenik kapetana',
    tockeKroga: 'Bodovi u zadnjem kolu: {tocke}',
    tockeKrogaKapetan: 'Bodovi u zadnjem kolu: {tocke} × 3 (kapetan)',
    odstraniIzKadra: 'Ukloni iz momčadi',
    odstrani: 'Ukloni {ime}',
    prej: 'Ranije na redu za zamjenu',
    prejIme: '{ime}: ranije na redu za zamjenu',
    pozneje: 'Kasnije na redu za zamjenu',
    poznejeIme: '{ime}: kasnije na redu za zamjenu',
    izberi: 'Odaberi: {pozicija}',
    klop: 'Klupa',
    klopOpis:
      'Tko iz postave ne igra, mijenja ga prvi s iste pozicije s klupe — redom slijeva nadesno.',
    brezPozicije: 'Bez potvrđene pozicije — ne mogu se staviti na teren',
  },

  // Teren s bodovima jedne momčadi na utakmici (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime} — {deli}',
    minut: '{n} min',
    goli: '{n} × gol',
    asistence: '{n} × asistencija',
    brezPrejetega: 'bez primljenog gola',
    prejetih: 'primljeno {n}',
    rumeni: 'žuti karton',
    rdeci: 'crveni karton',
    skupaj: '{tocke} bod.',
    brezPostave: 'Zapisnik za ovu momčad ne navodi postavu.',
    klop: 'Klupa',
    vstopilo: '— {n} ušlo u igru',
  },

  // Idealna momčad i tuđa postava na terenu.
  enajsterica: {
    kapetan: 'Kapetan',
    namestnik: 'Zamjenik s trakom',
  },

  // Traka s obavijestima o mojim momčadima (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Upozorenja u tvojim momčadima',
    naslovNapakEna: 'Jedna od tvojih momčadi neće dobiti bodove',
    naslovNapak: {
      one: '{n} tvoja momčad neće dobiti bodove',
      few: '{n} tvoje momčadi neće dobiti bodove',
      other: '{n} tvojih momčadi neće dobiti bodove',
    },
    nimasEkipe: 'Još nemaš momčad<liga>({liga})</liga> — bez nje u sljedećem kolu nećeš dobiti bodove.',
    sestavi: 'Složi momčad →',
    popravi: 'Popravi →',
    poglej: 'Pogledaj →',
    skrij: 'Sakrij upozorenje: {besedilo}',
    skrijNamig: 'Sakrij dok ne stigne nova obavijest',
    pokaziVse: 'Prikaži sve ({n})',
    razlog: 'Momčad ne ispunjava pravila.',
    brezTockKrog: 'U {krog}. kolu neće dobiti bodove.',
    brezTockRok: 'Na sljedećem roku neće dobiti bodove.',
    nepopolna: 'Momčad nije potpuna — ovo kolo se još zaključava, ali od sljedećeg neće dobivati bodove.',
    igralec: {
      kapetan: {
        poskodba: 'Kapetan {ime} je ozlijeđen.',
        odsotnost: 'Kapetan {ime} je odsutan.',
        izstop: 'Kapetan {ime} više neće igrati — njegov klub je istupio iz lige.',
      },
      namestnik: {
        poskodba: 'Zamjenik kapetana {ime} je ozlijeđen.',
        odsotnost: 'Zamjenik kapetana {ime} je odsutan.',
        izstop: 'Zamjenik kapetana {ime} više neće igrati — njegov klub je istupio iz lige.',
      },
      vPostavi: {
        poskodba: '{ime} je ozlijeđen, a u prvoj je postavi.',
        odsotnost: '{ime} je odsutan, a u prvoj je postavi.',
        izstop: '{ime} iz prve postave više neće igrati — njegov klub je istupio iz lige.',
      },
      naKlopi: {
        poskodba: '{ime} na klupi je ozlijeđen.',
        odsotnost: '{ime} na klupi je odsutan.',
        izstop: '{ime} na klupi više neće igrati — njegov klub je istupio iz lige.',
      },
    },
    posledica: {
      kapetan: 'Ako ne igra, traku preuzima zamjenik — možda je bolje odabrati drugog kapetana.',
      namestnik: 'Ako ne igraju ni kapetan ni zamjenik, trostrukih bodova nema.',
      vPostavi: 'Ako ne igra, mijenja ga prvi igrač s iste pozicije s klupe.',
      naKlopi: 'Pri automatskoj zamjeni sustav će ga preskočiti ako ne igra.',
      izstop: 'Za njega više nećeš dobivati bodove — zamijeni ga. Momčad s njim ostaje valjana.',
    },
  },
}
