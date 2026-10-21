// Nizi za področje `aplikacija` (glej src/i18n/index.tsx): ogrodje strani —
// meni, izbirnik lige, pojavna okna, noga, klepet, sponzor, napake in lib/.
export const aplikacija = {
  rumeniKartoni: {
    nepripisani: 'Nepripisani rumeni kartoni: {n}. Zanje odbitki točk niso obračunani.',
    nedosegljivo: 'Podatek o pripisanosti rumenih kartonov trenutno ni na voljo.',
  },
  naslovStrani: {
    osnova: 'SLFF — Sunday League Fantasy Football',
    zStranjo: '{naslov} · SLFF',
    // <meta name="description"> — v index.html je slovenski; drug jezik ga
    // zamenja ob nalaganju (main.tsx).
    opis: 'Fantasy football za slovenske medobčinske nogometne lige. Sestavi ekipo, izberi kapetana in tekmuj s sosedi.',
    // Kartica ob deljenju (og:/twitter:). Iskalniki in Facebook JS ne poženejo,
    // zato jo vite.config.ts zapiše v statični HTML: index.html (slovenski) in
    // sk.html, ki ga Caddy (scripts/hetzner/Caddyfile) vrne za `/sk` in povezave `?t=sk-…`.
    deljenje:
      'Fantasy liga za slovenske medobčinske lige. Sestavi ekipo iz pravih igralcev, točke prihajajo iz uradnih zapisnikov: goli, minute, ohranjene mreže.',
    deljenjeKratko: 'Fantasy liga za slovenske medobčinske lige. Točke iz uradnih zapisnikov.',
    // Opis vstopne strani države (/at …) v strežniku HTML: ime države in lige.
    ligeDrzave: 'Fantasy lige ({drzava}): {lige}.',
  },
  // Vstopna stran države (/at): seznam lig te države.
  vstopDrzave: {
    uvod: 'Izberi ligo in sestavi ekipo.',
  },
  niStrani: {
    naslov: 'Stran ne obstaja',
    opis: 'Povezava je morda zastarela ali pa je v naslovu tipkarska napaka.',
    nazaj: 'Nazaj na začetno stran',
  },
  /** Gumb za podporo: naslovnica in noga vsake strani (components/Pivo.tsx). */
  pivo: {
    gumb: 'Časti pivo',
    /** Povezava na pivski zid (/beers) ob gumbu in v meniju Več. */
    zid: 'Pivski zid',
    /** Okno, ki prijavljenega na spletu vsakih ~14 dni povabi na pivo (PivoOkno.tsx). */
    okno: {
      naslov: 'No, pa še nam lahko plačaš eno pivo 🍺',
      besedilo: 'Lej, kako zabavno igrico smo naredili. Če bi nas srečal po tekmi, bi nam sigurno dal za pivo. SLFF ostaja brezplačen, brez oglasov in stav, tvoje ime pa pristane na pivskem zidu.',
      kasneje: 'Mogoče naslednjič',
      zeSem: 'Sem že častil 🍻',
    },
    lestvicaDomov: 'Pivska lestvica',
    // Stran /beers (pages/Piva.tsx): brez zneskov.
    stran: {
      uvod: 'SLFF je brezplačen za tisoče upraviteljev v stotinah amaterskih lig po Evropi: brez oglasov, brez stav, brez naročnin. Tvoje pivo plača strežnik, pošto in domeno, nato pa pristane prav tu, na zidu, s tvojim imenom in sporočilom. Točk ne prinese, le zelo hvaležen ponedeljek. 🍺',
      skupaj: { one: 'Doslej {n} pivo', two: 'Doslej {n} piva', few: 'Doslej {n} piva', other: 'Doslej {n} piv' },
      piv: { one: '{n} pivo', two: '{n} piva', few: '{n} piva', other: '{n} piv' },
      lestvica: 'Lestvica podpornikov',
      anonimni: 'Anonimni podporniki',
      prazno: 'Na zidu je še prostor za tvoje ime. Bodi med prvimi! 🍻',
    },
  },
  noga: {
    zasebnost: 'Zasebnost in pogoji',
    facebook: 'Sledi nam na Facebooku',
    instagram: 'Sledi nam na Instagramu',
    /** Povezavi na aplikacijo v trgovinah (Trgovine.tsx). */
    android: 'Aplikacija za Android',
    iphone: 'Aplikacija za iPhone',
    vir: 'Podatki: uradni zapisniki <vir>{ime}</vir>',
    /** Ime zveze sredi stavka, kadar je ne poznamo. */
    zvezeSplosno: 'zveze',
  },
  meni: {
    mojaEkipa: 'Moja ekipa',
    igralci: 'Igralci',
    lestvica: 'Lestvica',
    rezultati: 'Rezultati',
    tabela: 'Lestvica lige',
    miniLige: 'Mini lige',
    asistence: 'Asistence',
    pozicije: 'Pozicije',
    odsotnosti: 'Odsotnosti',
    slovenija: 'Slovenija',
    admin: 'Admin',
    vec: 'Več',
    racun: 'Račun',
    opomniki: 'Obvestila',
    izbrisRacuna: 'Izbris računa',
    nastavitve: 'Nastavitve računa',
    mojProfil: 'Moj profil',
    povabi: 'Povabi prijatelja',
    pomoc: 'Pomoč',
    trgovina: 'Trgovina',
    novo: 'Novo',
    odjava: 'Odjava',
    prijava: 'Prijava',
    zacni: 'Začni brezplačno',
    meni: 'Meni',
    meniZGlasovi: 'Meni ({n} za glasovanje)',
  },
  izbirnikLige: {
    ostalo: 'Ostalo',
    liga: 'Liga',
    oznaka: 'Liga:',
    isciPolje: 'Išči ligo ali igralca …',
    isci: 'Išči ligo ali igralca',
    niZadetkov: 'Ni zadetkov.',
    lige: 'Lige',
    /** Razdelek z igralci vseh lig pod ligami (iskanje od treh znakov). */
    igralci: 'Igralci',
    iscemIgralce: 'Iščem igralce …',
    /** Nazadnje izbrane lige na vrhu izbirnika (brez iskanja). */
    nedavno: 'Nedavno',
    /** Izbira ravni, ko ima država člane in mladince (U19). */
    raven: 'Raven',
    ravni: {
      vse: 'Vse',
      clani: 'Člani',
      mladinci: 'U19',
    },
  },
  izbiraDrzave: {
    /** Oznaka pred izbirnikom (za bralnike zaslona in v nogi). */
    oznaka: 'Država',
    /** Gumb izbirnika države (za bralnike zaslona). */
    gumb: 'Država: {drzava}',
    /** Imena držav v lastnem jeziku — v vseh prevodih enaka. */
    imena: {
      SI: 'Slovenija',
      SK: 'Slovensko',
      HR: 'Hrvatska',
      CZ: 'Česko',
      HU: 'Magyarország',
      AT: 'Österreich',
      DE: 'Deutschland',
      RS: 'Srbija',
      RO: 'România',
      EE: 'Eesti',
      PL: 'Polska',
      ES: 'España',
      LV: 'Latvija',
      MK: 'Северна Македонија',
      GR: 'Ελλάδα',
      TR: 'Türkiye',
      UA: 'Україна',
      AM: 'Հայաստան',
      AZ: 'Azərbaycan',
      DK: 'Danmark',
      GB: 'United Kingdom',
      MT: 'Malta',
      ME: 'Crna Gora',
      BA: 'Bosna i Hercegovina',
      MD: 'Moldova',
    },
    preklopi: 'Preklopi na {drzava}',
  },
  izbiraJezika: {
    /** Oznaka izbirnika "SL · SK · EN" (za bralnike zaslona). */
    oznaka: 'Jezik',
    /** Gumb izbirnika jezika (za bralnike zaslona). */
    gumb: 'Jezik: {jezik}',
    /** Namig ob jeziku; ime jezika je vedno v njem samem (English). */
    preklopi: 'Preklopi na {jezik}',
  },
  prviObisk: {
    naslov: 'Kje želiš igrati?',
    opis: 'Izberi ligo, v kateri boš sestavil ekipo in tekmoval. Pokažemo ti njene igralce in lestvico; pozneje jo lahko kadarkoli zamenjaš zgoraj.',
    brezEkip: 'še brez ekip',
    nazaj: '← Nazaj',
    preskoci: 'Preskoči',
    isci: 'Išči ligo …',
    /** Naslov skupine treh lig z največ ekipami na vrhu okna. */
    najvecEkip: 'Največ ekip',
    /** Povezava na drugo državo, ko je ugib pokazal napačno. */
    drugaDrzava: '{drzava}?',
    /** Korak države za tujca (IP iz države brez lig). */
    drzavaOpis: 'Najprej izberi državo, nato ligo v njej.',
  },
  rokKroga: {
    dniUr: '{d} d {h} h',
    urMinut: '{h} h {m} min',
    minutSekund: '{m} min {s} s',
    sekund: '{s} s',
    zaklepNaslov: 'Zaklep {krog}. kroga: {datum}',
    ligaKrog: '{liga} · {krog}. krog',
    zaklenjen: 'zaklenjen — spremembe ekipe zdaj veljajo za naslednji krog',
    zaklepCez: 'zaklep čez',
    datumOklepaj: '({datum})',
  },
  odstevanje: {
    dni: '{n}d',
    ur: '{n}h',
    minut: '{n}m',
    zaklenjenoPred: 'zaklenjeno pred {cas}',
    se: 'še {cas}',
  },
  /** Gumb »Pokaži mi« v klepetu za pomoč, ko dejanja ni mogoče izvesti. */
  pokaziMi: {
    neshranjeno: 'Najprej shrani ekipo (ali zavrzi spremembe), nato tapni še enkrat.',
    niVidno: 'Tega na tej strani ni videti. Morda se moraš najprej prijaviti ali sestaviti ekipo.',
    neznano: 'Tega ti žal ne znam pokazati.',
  },
  klepet: {
    gost: 'Gost',
    zdaj: 'zdaj',
    minut: '{n} min',
    ur: '{n} h',
    dni: '{n} d',
    morasSePrijaviti: 'Za objavo se moraš prijaviti.',
    predolgo: 'Sporočilo je predolgo (največ 500 znakov).',
    izbrisiVprasanje: 'Izbrišem sporočilo?',
    naslov: 'Pomagaj nam izboljšati!',
    anonimno: 'anonimno',
    uvod: 'Kaj te moti? Kaj bi rad videl? Kaj pogrešaš? Tvoj vtis nam ogromno pomeni — <krepko>povej</krepko>. Klepet je anonimen; nihče ne vidi, kdo je kaj napisal.',
    prikazesKot: 'V klepetu se prikažeš kot <ime>{ime}</ime>. Tvoje registrirano ime ostane skrito.',
    zaPisanje: 'Za pisanje se prijavi (branje je javno). Tvoje registrirano ime ostane skrito, pojaviš se pod naključnim psevdonimom.',
    bodiPrvi: 'Bodi prvi, ki napiše sporočilo.',
    izbrisi: 'Izbriši sporočilo',
    napisi: 'Napiši sporočilo …',
    poslji: 'Pošlji',
    zaObjavo: 'Za objavo se <prijava>prijavi</prijava>.',
  },
  sponzor: {
    oznaka: 'Sponzor',
    obisci: 'Obišči stran',
  },
  napaka: {
    naslov: 'Stran se je zataknila',
    opis: 'Nekaj je šlo narobe pri prikazu te strani. Osveži stran ali se vrni na začetek — če se ponavlja, nam piši prek klepeta na začetni strani.',
    nazaj: 'Nazaj na začetno stran',
    osvezi: 'Osveži stran',
  },
  crta: {
    gibanje: 'Gibanje: {seznam}',
  },
  grb: {
    klub: 'klub',
  },
  vabilo: {
    nasaLiga: 'našo ligo',
    ligaZZvezo: '{liga} ({zveza})',
    klubi: ' naših klubov ({seznam})',
    zadeva: 'Fantasy liga: {liga} — pridi zraven',
    besedilo:
      'Živjo!\n\nIgram fantasy nogometno ligo: {liga}. Sestaviš svojo ekipo iz igralcev{klubi} in tekmuješ z drugimi.\n\nPovsem brezplačno. Registriraj se na:\n{naslov}\n\nSestavi ekipo, določi kapetana in po vsakem krogu preveri, kdo je zbral največ točk.\n\nSe vidimo v ligi!',
  },
  // Mobilna aplikacija je prestara (PosodobiAplikacijo).
  posodobi: {
    naslov: 'Posodobi aplikacijo',
    opis: 'Ta različica SLFF ni več podprta. Posodobi aplikacijo, da boš lahko še naprej urejal ekipo.',
    gumb: 'Posodobi',
  },
  /** "Moje lige ni": povezava v izbirniku lige, oknu prvega obiska in na vstopu države (ZelimLigo.tsx). */
  zelimLigo: {
    povezava: 'Moje lige ni? Povej nam',
    naslov: 'Katero ligo bi rad igral?',
    opis: 'Povej nam, katera liga ti manjka. Lige dodajamo po tem, koliko ljudi si jih želi.',
    drzava: 'Država',
    drugaDrzava: 'Druga država',
    imeDrzave: 'Ime države',
    liga: 'Liga',
    ligaPrimer: 'npr. 1. liga MNZ Celje',
    predlogi: 'Že vpisane lige, ki še niso odprte:',
    email: 'Tvoj e-naslov',
    emailOpomba: 'Uporabimo ga le, da ti javimo, ko liga zaživi, nato ga izbrišemo.',
    poslji: 'Pošlji',
    preklici: 'Prekliči',
    hvala: 'Hvala — javimo, ko liga zaživi.',
    zapri: 'Zapri',
    napaka: 'Pošiljanje ni uspelo. Poskusi znova.',
    napakaEmail: 'Vpiši veljaven e-naslov.',
    napakaOmejitev: 'Danes si poslal že dovolj želja. Poskusi jutri.',
    napakaBesedilo: 'Preveri ime države in lige.',
  },
}
