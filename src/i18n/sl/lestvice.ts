// Nizi za področje `lestvice` (glej src/i18n/index.tsx).
// Lestvica lige, državna lestvica, mini lige, tuja ekipa, stran kluba in
// plakati za objavo (risani na platno).
export const lestvice = {
  /** "4. krog" — gumbi in oznake krogov. */
  krog: '{n}. krog',
  mesto: '{mesto}. mesto',
  /** Rodilnik za "od 5 ekip". */
  odEkip: { one: 'od {n} ekipe', two: 'od {n} ekip', few: 'od {n} ekip', other: 'od {n} ekip' },

  lestvica: {
    naslov: 'Lestvica',
    prazna: 'Lestvica je še prazna — sestavi prvo ekipo!',
    napakaKrogov:
      'Rezultatov po krogih ni bilo mogoče naložiti ({napaka}). Skupna lestvica spodaj je vseeno točna.',
    tvojRezultatZadnji: 'Tvoj rezultat v zadnjem krogu',
    tvojRezultatKrog: 'Tvoj rezultat v krogu',
    mojaEkipa: 'Moja ekipa',
    zmagovalecKroga: 'Zmagovalec {krog}. kroga',
    kazen: 'Prestopi: {prestopi} — kazen {kazen}',
    zmagovalciPoKrogih: 'Zmagovalci po krogih',
    odigraniKrogi: {
      one: '{n} odigran krog',
      two: '{n} odigrana kroga',
      few: '{n} odigrani krogi',
      other: '{n} odigranih krogov',
    },
    brezZmagovalcev:
      'Prvi krog še ni odigran. Ko bo, se tu vsak teden pojavi zmagovalec (npr. "16. krog 🏆 Jenko").',
    skupnoSezona: 'Skupno (celotna sezona)',
    odKrogaNaprej: 'Od {n}. kroga naprej',
    pozneje: 'Priključil si se pozneje? Izberi svoj krog in tekmuj od tam.',
    brezKrogov:
      'Ko bodo odigrani krogi, se tu pojavijo gumbi "Od 2. kroga", "Od 3. kroga" itd — pridi kadarkoli in imej svojo lestvico.',
    celotnaSezona: 'Celotna sezona',
    odKroga: 'Od {n}. kroga',
    igraOd: '· igra od {datum}',
  },

  slovenija: {
    naslovStrani: 'Državna lestvica',
    naslov: 'Slovenija',
    pripravlja: 'Državna lestvica se pripravlja. Poskusi čez nekaj minut.',
    povzetek: 'Vse ekipe vseh lig skupaj — {ekip} iz {lig} in {zvez}.',
    lig: { one: '{n} lige', two: '{n} lig', few: '{n} lig', other: '{n} lig' },
    zvez: { one: '{n} zveze', two: '{n} zvez', few: '{n} zvez', other: '{n} zvez' },
    skupno: 'Skupno',
    naKrog: 'Na krog',
    povprecjeRazlaga:
      'Lige ne začnejo hkrati, zato ekipa iz lige, ki je začela prej, zbere več točk že zaradi tega. Povprečje to izravna; štejejo ekipe z vsaj {krogov}.',
    /** Orodnik: "z vsaj 3 odigranimi krogi". */
    zOdigranimiKrogi: {
      one: '{n} odigranim krogom',
      two: '{n} odigranima krogoma',
      few: '{n} odigranimi krogi',
      other: '{n} odigranimi krogi',
    },
    premaloKrogov: 'Za povprečje mora ekipa odigrati vsaj {krogov} — toliko jih še ni odigrala nobena.',
    /** Tožilnik: "odigrati vsaj 3 kroge". */
    krogovTozilnik: { one: '{n} krog', two: '{n} kroga', few: '{n} kroge', other: '{n} krogov' },
    nobenaEkipa: 'Nobena ekipa še nima odigranega kroga.',
    lestvicaLige: 'Lestvica svoje lige',
  },

  miniLige: {
    naslov: 'Mini lige',
    pridruzenDobrodosel: 'Pridružen. Dobrodošel v ligi.',
    pridruzen: 'Pridružen.',
    zeOdPrej: 'Ta ekipa je v tej mini ligi že od prej.',
    prekratkoIme: 'Ime mini lige naj ima vsaj 2 znaka.',
    ustvarjena: 'Mini liga "{ime}" je ustvarjena. Koda: {koda}',
    najprejEkipa: 'Najprej si sestavi ekipo v kateri od lig.',
    prijava: 'Za mini ligo se je treba <prijava>prijaviti</prijava>.',
    opis: 'Zasebno tekmovanje med znanci. Ekipe so lahko iz različnih lig.',
    ustvari: 'Ustvari',
    imeLige: 'Ime mini lige',
    ustvariLigo: 'Ustvari mini ligo',
    pridruziSe: 'Pridruži se',
    koda: 'Koda ({n} znakov)',
    nisiVNobeni: 'Nisi še v nobeni mini ligi. Kdo je boljši manager — ti ali tvoja družba?',
    ustvariLigoIme: 'Ustvari ligo »{ime}«',
    najprejSestavi: 'Najprej sestavi ekipo',
    povabilo: 'Povabilo: <povezava>{povezava}</povezava><koda>koda {koda}</koda>',
    deliPovabilo: 'Deli povabilo',
    prazna: 'V tej mini ligi še ni nobene ekipe.',
    // Izid deljenja povabila (tudi PovabiSoigralce).
    poslano: 'Povabilo je poslano.',
    kopirano: 'Povabilo je kopirano — prilepi ga v skupino.',
    neuspelo: 'Deljenje ni uspelo.',
    neuspeloPovezava: 'Deljenje ni uspelo — povezavo najdeš na strani Mini lige.',
    // lib/miniLige
    vpisiKodo: 'Vpiši kodo mini lige.',
    dolzinaKode: 'Koda ima {dolzina} znakov, ti si jih vpisal {vpisal}.',
    slabiZnaki: 'Koda ne vsebuje znakov {znaki} — poglej, ali si zamenjal 0 in O ali 1 in I.',
    besediloVabila: 'Pridi v mojo mini ligo "{ime}" v SLFF in me premagaj: {povezava}',
    naslovVabila: 'Mini liga {ime} — SLFF',
    privzetoIme: '{ime} in prijatelji',
    privzetoImeBrez: 'Moja mini liga',
  },

  mojeMiniLige: {
    povabilo: 'Lestvica med prijatelji je bolj zabavna kot med tujci.',
    ustvari: 'Ustvari mini ligo',
    naslov: 'Moje mini lige',
    vse: 'vse →',
    vodi: ' · vodi {ime}',
  },

  povabiSoigralce: {
    naslovLiga: 'Povabi še koga v {ime}',
    naslovNova: 'Sestavljeno. Zdaj povabi soigralce.',
    opisLiga: 'Vsak, ki klikne povezavo, je v ligi z enim klikom.',
    opisNova: 'Kdo je boljši manager? Mini liga je lestvica samo za tvojo družbo.',
    trenutek: 'Trenutek …',
    deliPovabilo: 'Deli povabilo',
    ustvariInPovabi: 'Ustvari mini ligo in povabi',
    miniLige: 'Mini lige',
  },

  vstop: {
    naslovLiga: 'Povabilo: {ime}',
    naslov: 'Povabilo v mini ligo',
    niLige: 'Te mini lige ni',
    niLigeOpis:
      'Povezava je nepopolna ali je liga izbrisana. Prosi, naj ti pošljejo novo, ali si <ustvari>ustvari svojo</ustvari>.',
    ustvaril: 'Ustvaril {ime}',
    miniLiga: 'Mini liga',
    prijaviSe: 'Prijavi se ali si ustvari račun. Po prijavi te vrnemo sem in vstopiš z enim klikom.',
    prijavaAliRegistracija: 'Prijava ali registracija',
    nalaganjeEkip: 'Nalaganje tvojih ekip …',
    potrebujesEkipo:
      'Za mini ligo potrebuješ ekipo. Sestavi jo — traja minuto — in ob shranitvi si samodejno v ligi.',
    sestaviEkipo: 'Sestavi ekipo',
    sKateroEkipo: 'S katero ekipo?',
    vstopam: 'Vstopam …',
    pridruziSe: 'Pridruži se z ekipo {ime}',
  },

  ekipa: {
    naslov: 'Ekipa',
    niEkipe: 'Te ekipe ni.',
    okvara: 'Postave ni bilo mogoce naloziti.',
    nazaj: 'Nazaj na lestvico',
    skupaj: 'skupaj {tocke} {beseda}',
    brezKrogov:
      'V tej ligi se še ni zaključil noben krog. Tuje ekipe se pokažejo, ko mine rok — do takrat jih ne vidi nihče.',
    nalaganjePostave: 'Nalaganje postave …',
    brezPostave: 'Ta ekipa v izbranem krogu ni imela postave.',
    vTemKrogu: '{beseda} v tem krogu',
    kazen: '(−{kazen} za prestope)',
    namestnik: 'Kapetan ni igral, zato je množitelj prevzel namestnik.',
    klop: 'Klop',
  },

  klub: {
    naslov: 'Klub',
    niKluba: 'Tega kluba ni.',
    brezLige: 'Ta klub letos ne igra v nobeni ligi, ki jo spremljamo.',
    naNaslovnico: 'Na naslovnico',
    liga: 'Liga',
    podnaslov: '{liga} · {igralci} v igri',
    uvod:
      'Igralci {klub} so del <b>SLFF</b> — fantasy lige za {liga}. Navijači sestavijo svojo ekipo iz pravih igralcev, točke pa prihajajo iz <b>uradnih zapisnikov</b>: goli, minute, ohranjene mreže, kartoni.',
    toLigo: 'to ligo',
    navijaci: {
      one: 'Vaše igralce ima v svoji ekipi trenutno <b>{navijacev}</b>.',
      two: 'Vaše igralce imata v svoji ekipi trenutno <b>{navijacev}</b>.',
      few: 'Vaše igralce imajo v svoji ekipi trenutno <b>{navijacev}</b>.',
      other: 'Vaše igralce ima v svoji ekipi trenutno <b>{navijacev}</b>.',
    },
    sestaviEkipo: 'Sestavi svojo ekipo',
    lestvica: 'Lestvica',
    napoved: 'Napoved — za objavo ob zagonu',
    nasiIgralci: 'Naši igralci — s točkami',
    brezStatistike: 'Za ta klub letos še ni statistike.',
    pozicije: {
      GK: 'Vratarji',
      DEF: 'Branilci',
      MID: 'Vezisti',
      FWD: 'Napadalci',
    },
    goli: '{n} G · ',
    minute: '{n} min',
    opomba: 'Točke so izračunane iz uradnih zapisnikov. Če kaj ne drži, nam povejte — podatke popravimo.',
  },

  plakat: {
    navijaci: { one: '{n} navijač', two: '{n} navijača', few: '{n} navijači', other: '{n} navijačev' },
    stavekNavijacev: {
      one: '{navijacev} že ima naše igralce v ekipi.',
      two: '{navijacev} že imata naše igralce v ekipi.',
      few: '{navijacev} že imajo naše igralce v ekipi.',
      other: '{navijacev} že ima naše igralce v ekipi.',
    },
    // Besedilo na platnu.
    izNasihIgralcev: 'Sestavi svojo ekipo iz naših igralcev.',
    najvecTock: 'Največ točk to sezono',
    pridi: 'PRIDI',
    sestavit: 'SESTAVIT',
    ekipo: 'EKIPO.',
    jeOdprta: 'Fantasy liga za {liga} je odprta. Brezplačno.',
    zapisnikiMnz: 'točke iz uradnih zapisnikov MNZ',
    fantasyLigaZa: 'Fantasy liga za',
    jeLive: 'JE LIVE.',
    pravihIgralcev: 'Sestavi ekipo iz pravih igralcev. Točke iz uradnih zapisnikov.',
    brezplacno: 'brezplačno',
    mestoOd: {
      one: '{mesto}. mesto od {n} ekipe',
      two: '{mesto}. mesto od {n} ekip',
      few: '{mesto}. mesto od {n} ekip',
      other: '{mesto}. mesto od {n} ekip',
    },
    mojiNajboljsi: 'Moji najboljši v krogu',
    premagajMe: 'Sestavi svojo ekipo in me premagaj.',
    // Besedilo ob deljenju.
    deliKlub: '{klub} je v fantasy ligi SLFF — sestavi svojo ekipo iz naših igralcev.',
    deliNapoved:
      'Pridi sestavit ekipo! Fantasy liga za {liga} je odprta — brezplačno, s pravimi igralci {klub}.',
    deliLive: 'Fantasy liga za {liga} je live. Sestavi ekipo iz pravih igralcev — brezplačno.',
    deliKrog: '{ekipa}: {tocke} {beseda} v {krog}. krogu. Sestavi svojo ekipo in me premagaj.',
  },

  deliSliko: {
    naslov: '{naslov} — SLFF',
    kopirana: 'Povezava je kopirana.',
    niPripravljena: 'Slike ni bilo mogoče pripraviti.',
    seEnkrat: 'Pritisni še enkrat, da odpreš meni za deljenje.',
    niIzrisa: 'slike ni bilo mogoče izrisati',
    shranjena: 'Slika je shranjena — objavi jo na Instagramu, Facebooku ali WhatsAppu.',
    napaka: 'Slike ni bilo mogoče pripraviti: {napaka}',
    pripravljam: 'Pripravljam …',
    deliSliko: 'Deli sliko',
    prenesi: 'Prenesi sliko za objavo',
    deliPovezavo: 'Deli povezavo',
    shrani: 'Shrani sliko',
    namig: 'WhatsApp, Instagram, Facebook … — izberi v meniju, ki se odpre.',
  },
}
