// Nizi za področje `aplikacija` (glej src/i18n/index.tsx): ogrodje strani —
// meni, izbirnik lige, pojavna okna, noga, klepet, sponzor, napake in lib/.
export const aplikacija = {
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
  },
  niStrani: {
    naslov: 'Stran ne obstaja',
    opis: 'Povezava je morda zastarela ali pa je v naslovu tipkarska napaka.',
    nazaj: 'Nazaj na začetno stran',
  },
  /** Gumb za podporo: naslovnica, noga, lestvica, rezultati (components/Pivo.tsx). */
  pivo: {
    gumb: 'Časti pivo',
  },
  noga: {
    zasebnost: 'Zasebnost in pogoji',
    vir: 'Podatki: uradni zapisniki <vir>{ime}</vir>',
    /** Ime zveze sredi stavka, kadar je ne poznamo. */
    zvezeSplosno: 'zveze',
  },
  meni: {
    mojaEkipa: 'Moja ekipa',
    igralci: 'Igralci',
    lestvica: 'Lestvica',
    rezultati: 'Rezultati',
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
    povabi: 'Povabi prijatelja',
    pomoc: 'Pomoč',
    odjava: 'Odjava',
    prijava: 'Prijava',
    meni: 'Meni',
    meniZGlasovi: 'Meni ({n} za glasovanje)',
  },
  izbirnikLige: {
    ostalo: 'Ostalo',
    liga: 'Liga',
    oznaka: 'Liga:',
    isciPolje: 'Išči ligo …',
    isci: 'Išči ligo',
    niZadetkov: 'Ni zadetkov.',
    lige: 'Lige',
  },
  izbiraDrzave: {
    /** Oznaka pred izbirnikom (za bralnike zaslona in v nogi). */
    oznaka: 'Država',
    /** Imena držav v lastnem jeziku — v vseh prevodih enaka. */
    imena: {
      SI: 'Slovenija',
      SK: 'Slovensko',
      HR: 'Hrvatska',
    },
    preklopi: 'Preklopi na {drzava}',
  },
  izbiraJezika: {
    /** Oznaka izbirnika "SL · SK · EN" (za bralnike zaslona). */
    oznaka: 'Jezik',
    /** Namig ob jeziku; ime jezika je vedno v njem samem (English). */
    preklopi: 'Preklopi na {jezik}',
  },
  prviObisk: {
    naslov: 'Kje želiš igrati?',
    opis: 'Izberi ligo, v kateri boš sestavil ekipo in tekmoval. Pokažemo ti njene igralce in lestvico; pozneje jo lahko kadarkoli zamenjaš zgoraj.',
    brezEkip: 'še brez ekip',
    nazaj: '← Nazaj',
    preskoci: 'Preskoči',
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
}
