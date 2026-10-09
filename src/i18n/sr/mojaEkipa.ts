// Srpski prevod: `mojaEkipa` (izvor: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Moj tim',
  /** Zamensko ime kad igraču ne znamo ime. */
  igralec: 'Igrač',
  vprasanjeZapustitve: 'Imaš nesačuvane promene tima. Da li zaista želiš da napustiš stranicu?',
  /** Oznaka trake na dresu. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'Z',
  },

  // Pravila sastava (lib/pravila.ts): razlozi na tržištu i spisak grešaka.
  pravila: {
    pozicije: {
      GK: 'Golmani',
      DEF: 'Odbrambeni',
      MID: 'Vezni',
      FWD: 'Napadači',
    },
    kaderPoln: 'Tim je pun ({n} igrača).',
    pozicijaPolna: '{pozicija}: u timu ih već imaš {n}.',
    premaloProracuna: 'Premalo budžeta: igrač košta {cena}, na raspolaganju imaš {preostalo}.',
    izKluba: 'Iz kluba {klub} već imaš {n} igrača.',
    velikostEkipe: 'Tim mora imati {n} igrača (trenutno {trenutno}).',
    velikostPostave: 'U prvoj postavi mora biti {n} igrača (trenutno {trenutno}).',
    brezPozicije: {
      one: '{n} izabrani igrač još nema potvrđenu poziciju. Pomozi u odeljku Pozicije.',
      few: '{n} izabrana igrača još nemaju potvrđenu poziciju. Pomozi u odeljku Pozicije.',
      other: '{n} izabranih igrača još nema potvrđenu poziciju. Pomozi u odeljku Pozicije.',
    },
    niVecVLigi: '{ime} više nije u ligi, zameni ga.',
    pozicijaVKadru: '{pozicija} u timu: {n}, a mora ih biti {kader}.',
    pozicijaVPostavi: '{pozicija} u prvoj postavi: {n}, dozvoljeno {min} do {max}.',
    dolociKapetana: 'Odredi kapitena: u kolu donosi {n} puta više bodova.',
    enKapetan: 'Kapiten može biti samo jedan.',
    dolociNamestnika: 'Odredi zamenika koji preuzima traku ako kapiten ne igra.',
    istiKlub: 'Iz istog kluba možeš da izabereš najviše {n} igrača.',
    presegelProracun: 'Prekoračio si budžet za {cena}.',
  },

  napake: {
    zeImas: 'Već imaš tim u ovoj ligi. Ponovo učitaj stranicu.',
    dovoljenje: 'Za to nemaš dozvolu. Ponovo se prijavi i pokušaj još jednom.',
    povezava: 'Nema veze sa serverom. Proveri internet i pokušaj ponovo.',
    shranjevanje: 'Čuvanje nije uspelo. Pokušaj ponovo.',
    nalaganjePovezava: 'Nema veze sa serverom. Proveri internet.',
    nalaganje: 'Podatke tima nije bilo moguće učitati.',
    nalaganjeNiCelo:
      'Dok se tim ne učita u celosti, ne može se sačuvati, inače bi čuvanje obrisalo igrače koji se nisu učitali.',
    poskusiZnova: 'Pokušaj ponovo',
    vpisiIme: 'Prvo upiši ime tima.',
    osvezitev:
      'Tim je sačuvan, ali osvežavanje nije uspelo. Ponovo učitaj stranicu pre nego što ga opet urediš.',
    najprejShrani: 'Prvo sačuvaj tim.',
    izberiKrog: 'Izaberi kolo u kojem bonus važi.',
    prihodnjiKrog: 'Izaberi buduće nezaključano kolo sa određenim rokom.',
    zeUporabil: 'Ovaj bonus si već iskoristio ove sezone.',
    niPreklica: 'Bonus za ovo kolo više nije moguće otkazati.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'U ovoj ligi još nema igrača na tržištu.',
    pocakaj: 'Sačekaj da se čuvanje završi.',
    niPredloga: 'Iz ove lige zasad nije moguće sastaviti ispravan tim.',
    predlogSestavljen: 'Tim je sastavljen. Zameni koga želiš i pritisni Sačuvaj.',
    kaderDopolnjen: 'Prazna mesta su popunjena. Proveri i pritisni Sačuvaj.',
    niDopolnitve:
      'Tim nije moguće popuniti novcem koji ti je ostao. Zameni nekog od skupih igrača i pokušaj ponovo.',
    kapetanNaKlop: '{ime} je otišao na klupu. Izaberi novog kapitena.',
    namestnikNaKlop: '{ime} je otišao na klupu. Izaberi novog zamenika.',
    brezPozicije: 'Igrač još nema potvrđenu poziciju, pa ga nije moguće staviti na teren.',
    niProstora:
      'U postavi nema mesta za još jednog igrača na toj poziciji. Prvo pošalji nekoga na klupu.',
    niVecNamestnik: '{ime} više nije zamenik. Izaberi novog.',
    niVecKapetan: '{ime} više nije kapiten. Izaberi novog.',
    rokPotekel: 'Rok {krog}. kola je već istekao, pa promene važe od sledećeg kola.',
    shranjenaZaKrog: 'Tim je sačuvan i spreman za {krog}. kolo.',
    shranjenaVeljavna: 'Tim je sačuvan i ispunjava pravila.',
    osnutekShranjen:
      'Skica je sačuvana. Tim još ne ispunjava pravila, pa za ovo kolo ne bi dobio bodove.',
    prodaja: 'Prodaja ti je donela +{cena}.',
    nakupi: 'Kupovine su koštale {cena}.',
    wildcardVlozen: 'Wildcard je aktiviran: transferi u ovom kolu su besplatni.',
    klopPlusVlozen: 'Klupa+ je aktivirana.',
    wildcardPreklican: 'Wildcard je otkazan i dostupan je za drugo kolo.',
    klopPlusPreklican: 'Klupa+ je otkazana i dostupna je za drugo kolo.',
    zapriOpozorilo: 'Zatvori upozorenje',
    zapriObvestilo: 'Zatvori obaveštenje',
    odstranjen: '{ime} je uklonjen.',
    razveljavi: 'Poništi',
  },

  prijavaPotrebna: 'Za sastavljanje tima moraš da se prijaviš.',
  prijava: 'Prijava',
  locenaLiga:
    'Tim u ligi <liga>{liga}</liga> odvojen je od timova u drugim ligama, sa svojim budžetom i svojom tabelom. Liga je uključena usred sezone, pa se bodovi računaju od {krog}. kola nadalje. Ranije odigrana kola se ne računaju nikome.',

  /** Složeni odeljak ispod terena. */
  vec: 'Više: bonusi, istorija, pravila',

  prestopi: {
    stevec: 'Transferi: {n}/{prosti}',
    wildcard: 'wildcard, bez kazne',
    odbitek: 'odbitak {tock} u ovom kolu',
    prosti: {
      one: 'još {n} besplatan, zatim −{kazen} za svaki',
      few: 'još {n} besplatna, zatim −{kazen} za svaki',
      other: 'još {n} besplatnih, zatim −{kazen} za svaki',
    },
  },

  // Saveti za transfere (lib/namigiEkipe.ts): ko u sledećem kolu neće
  // igrati i koga možeš da priuštiš umesto njega.
  namigi: {
    naslov: 'Saveti za transfere',
    zaKrog: 'Ko u {krog}. kolu verovatno neće igrati i koga možeš da priuštiš umesto njega.',
    razlog: {
      neaktiven: 'više nije u ligi',
      poskodba: 'povređen',
      odsotnost: 'odsutan',
      brezTekme: 'klub ne igra',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'Umesto {ime} u tim stavi {novi}',
    niZamenjave: 'Nema zamene koju bi dozvolili budžet i pravila.',
    opomba: 'Klik samo priprema zamenu, tim čuvaš sam. Svaki savet važi za sebe.',
    skrij: 'Sakrij do sledećeg kola',
    zamenjano: '{novi} je u timu umesto {ime}. Kad budeš zadovoljan, sačuvaj tim.',
  },

  // Kretanje cena igrača u timu od poslednje posete stranici.
  odZadnjegaObiska: {
    naslov: 'Od poslednje posete',
    naslovTeden: 'U poslednjih nedelju dana',
    vrednost: 'Vrednost tima <znesek>{znak}{cena}</znesek>',
    gor: 'poskupljenje',
    dol: 'pojeftinjenje',
    zapri: 'Zatvori',
  },

  povzetek: {
    urediIme: 'Uredi ime tima {ime}',
    bogastvo:
      'bogatstvo <vrednost>{bogastvo}</vrednost><razlika></razlika> · tim {kader} <placano>plaćeno</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Čuvam …',
    shraniEkipo: 'Sačuvaj tim',
    neshranjeno: 'Nesačuvane promene',
    imeEkipe: 'Ime tima',
    privzetoIme: 'FC {ime}',
    primerImena: 'npr. Nedeljni junaci',
  },

  // Uvodni savet za prazan tim.
  zacetek: {
    naslov: 'Odakle početi?',
    sestaviMi: 'Sastavi mi tim',
    opisPredloga:
      'Nasumično izaberemo ispravan tim u okviru budžeta, svakim klikom drugi. Zatim zameni koga želiš i sačuvaj.',
    sam: 'Radije ću ga sastaviti sam',
    drugPredlog: 'Drugi predlog',
    opisDrugegaPredloga:
      'Ne sviđa ti se? Izvuci novi tim. Dok ga ne sačuvaš, to je besplatno.',
    dopolni: 'Popuni tim',
    opisDopolnitve:
      'Slobodnih mesta u timu: {n}. Tvoji izbori ostaju, preostala mesta nasumično popunjavamo u okviru budžeta.',
    korak1: 'Ime tima smo predložili gore, možeš ga promeniti bilo kada.',
    korak2:
      'Klikni <krepko>＋</krepko> na praznom mestu na terenu. Na telefonu je u donjoj traci i dugme <krepko>＋ Dodaj</krepko>, a na računaru biraš na <krepko>tržištu igrača</krepko> desno.',
    korak3:
      'Tim ima {n} igrača: {gk} GOL, {def} ODB, {mid} VEZ, {fwd} NAP. Iz istog kluba najviše {klub}.',
    korak4:
      'Kad su mesta popunjena, odredi <krepko>kapitena</krepko> i <krepko>zamenika</krepko>, zatim pritisni <krepko>Sačuvaj tim</krepko> (na telefonu <krepko>Sačuvaj</krepko> u donjoj traci).',
  },

  trak: {
    naslov: 'Traka',
    kapetan: 'Kapiten (×{n})',
    namestnik: 'Zamenik',
    nihce: 'niko',
  },

  // "Šta ako": koliko bi sadašnja postava donela u poslednjem kolu.
  kajCe: {
    prinesla: 'Sadašnja postava bi u <krog>{krog}. kolu</krog> ({sezona}) donela',
    opis: 'Pregled „šta ako“: nije istorijski rezultat, menja se sa svakom zamenom. Stvarne bodove za prošla kola naći ćeš na tabeli i u snimku postave.',
  },

  status: {
    manjka: 'Za konačno čuvanje još nešto nedostaje:',
    vpisiIme: 'Upiši ime tima (u polje gore).',
    osnutekZdaj: 'Skicu možeš da sačuvaš i sada, a pravila ćeš ispuniti kasnije.',
    brezTock: '<krepko>Za {krog}. kolo</krepko> u ovom stanju <krepko>NEĆEŠ dobiti bodove</krepko>.',
    kajPomeni:
      '<krepko>Šta znači "Sačuvaj"?</krepko> Tvoje promene (tim, postava, kapiten) upisuju se u bazu. Za trenutno kolo važi stanje u trenutku roka. Do roka možeš da menjaš koliko želiš i ponovo pritiskaš Sačuvaj, važi poslednja verzija. <krepko>"Sačuvaj skicu"</krepko> znači isto, samo uz napomenu da tim još ne ispunjava sva pravila (za bodove su potrebne ispravke, vidi spisak gore).',
    kajPomeniRok:
      '<krepko>Šta znači "Sačuvaj"?</krepko> Tvoje promene (tim, postava, kapiten) upisuju se u bazu. Za trenutno kolo važi stanje u trenutku roka (<krepko>{krog}. kolo: {rok}</krepko>). Do roka možeš da menjaš koliko želiš i ponovo pritiskaš Sačuvaj, važi poslednja verzija. <krepko>"Sačuvaj skicu"</krepko> znači isto, samo uz napomenu da tim još ne ispunjava sva pravila (za bodove su potrebne ispravke, vidi spisak gore).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bonus Klupa+',
    klopPlusVlozenZa: 'Aktiviran za {krog}. kolo ({sezona}): u njemu se računaju i bodovi sa klupe.',
    klopPlusVlozen: 'Klupa+ je već aktivirana: u njoj se računaju i bodovi sa klupe.',
    klopPlusOpis:
      'Jednom u sezoni: u izabranom kolu dodaju se i bodovi sve četvorice rezervi.',
    wildcardNaslov: 'Bonus Wildcard',
    wildcardVlozenZa: 'Aktiviran za {krog}. kolo ({sezona}): transferi u njemu su besplatni.',
    wildcardVlozen: 'Wildcard je već aktiviran: transferi u njemu su besplatni.',
    wildcardOpis:
      'Jednom u sezoni: u tom kolu možeš da zameniš koliko god igrača želiš, bez odbitka bodova.',
    zaklenjen: 'zaključano',
    preklici: 'otkaži',
    prekliciDo: 'Otkazati možeš do <odstevanje></odstevanje>',
    izberiKrog: 'Izaberi kolo …',
    niKroga: 'Nema budućeg kola sa rokom',
    krogSezona: '{krog}. kolo ({sezona})',
    vlozi: 'Aktiviraj',
    vloziZa: 'Aktiviraj za {krog}. kolo',
    potrdiWildcard: 'Aktivirati Wildcard za {krog}. kolo? Imaš ga samo jednom po sezoni.',
  },

  zgodovina: {
    naslov: 'Istorija postava',
    posnetkov: {
      one: '{n} kolo sa snimkom',
      few: '{n} kola sa snimkom',
      other: '{n} kola sa snimkom',
    },
    krog: '{krog}. kolo',
    podrobnost: '{krog}. kolo · sezona {sezona}',
    podrobnostSkupaj: '{krog}. kolo · sezona {sezona} · ukupno <krepko>{tocke}</krepko>',
    deli: 'Podeli {krog}. kolo',
  },

  // Donja traka i fioka tržišta na telefonu.
  telefon: {
    ostane: 'preostaje',
    predalPovzetek: 'preostaje <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'popravi ↑',
    neshranjeno: 'nesačuvano',
    dodaj: '＋ Dodaj',
    osnutekNamig: 'Tim još ne ispunjava pravila, čuva se kao skica.',
    neIzpolnjuje: 'tim još ne ispunjava pravila',
    zapriTrg: 'Zatvori tržište',
    zapri: '✕ Zatvori',
  },

  trg: {
    naslov: 'Tržište igrača',
    iskanje: 'Traži po imenu …',
    pocistiIskanje: 'Obriši pretragu',
    vsi: 'svi',
    vsiKlubi: 'Svi klubovi',
    niZadetkov: 'Nema rezultata.',
    pocistiFiltre: 'Obriši filtere',
    statLetos: '{goli} G · {minute} min',
    statLani: 'prošle godine {goli} G',
    brezNastopov: 'bez nastupa',
    niVecVLigi: 'više nije u ligi',
    tockeZadnjiKrog: 'Bodovi u poslednjem odigranom kolu',
    podatki: 'Podaci o igraču {ime}',
    podatkiNamig: 'Statistika, kretanje cene, sledeće utakmice',
    profilVNovemZavihku: 'Otvori profil igrača u novoj kartici',
    odstrani: '✕ ukloni',
    dodaj: '⊕ dodaj',
    prvih: 'Prikazano prvih {n}, suzi izbor pretragom.',
    noga: 'Iz istog kluba možeš da izabereš najviše {n} igrača. Golovi i minuti su iz tekuće sezone.',
  },

  rok: {
    krog: '{krog}. kolo',
    potekel: 'Rok je istekao: <krepko>{rok}</krepko>',
    rok: 'Rok: <krepko>{rok}</krepko>',
    niDolocen: 'Rok još nije određen.',
  },

  // Teren pri sastavljanju tima (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Premesti na klupu',
    vPostavo: 'Stavi u prvu postavu',
    niVecVLigiNamig: 'Igrač više nije u ligi, tim sa njim ne dobija bodove.',
    niVecVLigi: 'više nije u ligi',
    poskodba: 'povreda',
    odsoten: 'odsutan',
    kapetan: 'Kapiten: trostruki bodovi',
    namestnik: 'Zamenik kapitena',
    tockeKroga: 'Bodovi u poslednjem kolu: {tocke}',
    tockeKrogaKapetan: 'Bodovi u poslednjem kolu: {tocke} × 3 (kapiten)',
    odstraniIzKadra: 'Ukloni iz tima',
    odstrani: 'Ukloni {ime}',
    prej: 'Ranije na redu za zamenu',
    prejIme: '{ime}: ranije na redu za zamenu',
    pozneje: 'Kasnije na redu za zamenu',
    poznejeIme: '{ime}: kasnije na redu za zamenu',
    izberi: 'Izaberi: {pozicija}',
    klop: 'Klupa',
    klopOpis:
      'Ko iz postave ne igra, menja ga prvi sa iste pozicije sa klupe, redom sleva nadesno.',
    brezPozicije: 'Bez potvrđene pozicije, ne mogu se staviti na teren',
  },

  // Teren sa bodovima jednog tima na utakmici (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min',
    goli: '{n} × gol',
    asistence: '{n} × asistencija',
    brezPrejetega: 'bez primljenog gola',
    prejetih: 'primljeno {n}',
    rumeni: 'žuti karton',
    rdeci: 'crveni karton',
    skupaj: '{tocke} bod.',
    brezPostave: 'Zapisnik za ovaj tim ne navodi postavu.',
    klop: 'Klupa',
    vstopilo: '{n} ušlo u igru',
  },

  // Idealan tim i tuđa postava na terenu.
  enajsterica: {
    kapetan: 'Kapiten',
    namestnik: 'Zamenik sa trakom',
  },

  // Traka sa obaveštenjima o mojim timovima (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Upozorenja u tvojim timovima',
    naslovNapakEna: 'Jedan od tvojih timova neće dobiti bodove',
    naslovNapak: {
      one: '{n} tvoj tim neće dobiti bodove',
      few: '{n} tvoja tima neće dobiti bodove',
      other: '{n} tvojih timova neće dobiti bodove',
    },
    nimasEkipe: 'Još nemaš tim<liga>({liga})</liga>. Bez njega u sledećem kolu nećeš dobiti bodove.',
    sestavi: 'Sastavi tim →',
    popravi: 'Popravi →',
    poglej: 'Pogledaj →',
    skrij: 'Sakrij upozorenje: {besedilo}',
    skrijNamig: 'Sakrij dok ne stigne novo obaveštenje',
    pokaziVse: 'Prikaži sve ({n})',
    razlog: 'Tim ne ispunjava pravila.',
    brezTockKrog: 'U {krog}. kolu neće dobiti bodove.',
    brezTockRok: 'Na sledećem roku neće dobiti bodove.',
    nepopolna: 'Tim nije potpun. Ovo kolo se još zaključava, ali od sledećeg neće dobijati bodove.',
    igralec: {
      kapetan: {
        poskodba: 'Kapiten {ime} je povređen.',
        odsotnost: 'Kapiten {ime} je odsutan.',
        izstop: 'Kapiten {ime} više neće igrati: njegov klub je istupio iz lige.',
      },
      namestnik: {
        poskodba: 'Zamenik kapitena {ime} je povređen.',
        odsotnost: 'Zamenik kapitena {ime} je odsutan.',
        izstop: 'Zamenik kapitena {ime} više neće igrati: njegov klub je istupio iz lige.',
      },
      vPostavi: {
        poskodba: '{ime} je povređen, a u prvoj je postavi.',
        odsotnost: '{ime} je odsutan, a u prvoj je postavi.',
        izstop: '{ime} iz prve postave više neće igrati: njegov klub je istupio iz lige.',
      },
      naKlopi: {
        poskodba: '{ime} na klupi je povređen.',
        odsotnost: '{ime} na klupi je odsutan.',
        izstop: '{ime} na klupi više neće igrati: njegov klub je istupio iz lige.',
      },
    },
    posledica: {
      kapetan: 'Ako ne igra, traku preuzima zamenik. Možda je bolje izabrati drugog kapitena.',
      namestnik: 'Ako ne igraju ni kapiten ni zamenik, trostrukih bodova nema.',
      vPostavi: 'Ako ne igra, menja ga prvi igrač sa iste pozicije sa klupe.',
      naKlopi: 'Pri automatskoj zameni sistem će ga preskočiti ako ne igra.',
      izstop: 'Za njega više nećeš dobijati bodove, zameni ga. Tim sa njim ostaje ispravan.',
    },
  },
}
