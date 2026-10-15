// Latviešu `mojaEkipa` (avots: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Mana komanda',
  igralec: 'Spēlētājs',
  vprasanjeZapustitve: 'Tev ir nesaglabātas komandas izmaiņas. Tiešām pamest lapu?',
  oznaka: {
    kapetan: 'K',
    namestnik: 'V',
  },

  pravila: {
    pozicije: {
      GK: 'Vārtsargi',
      DEF: 'Aizsargi',
      MID: 'Pussargi',
      FWD: 'Uzbrucēji',
    },
    kaderPoln: 'Sastāvs ir pilns (spēlētāji: {n}).',
    pozicijaPolna: '{pozicija}: sastāvā tev jau ir {n}.',
    premaloProracuna: 'Nepietiek budžeta: spēlētājs maksā {cena}, tev pieejams {preostalo}.',
    izKluba: 'No kluba {klub} tev jau ir {n} spēlētāji.',
    velikostEkipe: 'Komandā jābūt {n} spēlētājiem (pašlaik {trenutno}).',
    velikostPostave: 'Pamatsastāvā jābūt {n} spēlētājiem (pašlaik {trenutno}).',
    brezPozicije: {
      zero: '{n} izvēlētajiem spēlētājiem vēl nav apstiprinātas pozīcijas: palīdzi sadaļā Pozīcijas.',
      one: '{n} izvēlētajam spēlētājam vēl nav apstiprinātas pozīcijas: palīdzi sadaļā Pozīcijas.',
      other: '{n} izvēlētajiem spēlētājiem vēl nav apstiprinātas pozīcijas: palīdzi sadaļā Pozīcijas.',
    },
    niVecVLigi: '{ime} vairs nav līgā: nomaini viņu.',
    pozicijaVKadru: '{pozicija} sastāvā: {n}, jābūt {kader}.',
    pozicijaVPostavi: '{pozicija} pamatsastāvā: {n}, atļauts no {min} līdz {max}.',
    dolociKapetana: 'Izvēlies kapteini: kārtā viņš nes {n}-kāršus punktus.',
    enKapetan: 'Kapteinis var būt tikai viens.',
    dolociNamestnika: 'Izvēlies vicekapteini, kurš pārņem apsēju, ja kapteinis nespēlē.',
    istiKlub: 'No viena kluba vari izvēlēties ne vairāk kā {n} spēlētājus.',
    presegelProracun: 'Tu esi pārsniedzis budžetu par {cena}.',
  },

  napake: {
    zeImas: 'Tev jau ir komanda šajā līgā: ielādē lapu no jauna.',
    dovoljenje: 'Tev nav atļaujas to darīt. Piesakies no jauna un mēģini vēlreiz.',
    povezava: 'Nav savienojuma ar serveri. Pārbaudi internetu un mēģini vēlreiz.',
    shranjevanje: 'Saglabāšana neizdevās. Mēģini vēlreiz.',
    nalaganjePovezava: 'Nav savienojuma ar serveri: pārbaudi internetu.',
    nalaganje: 'Komandas datus neizdevās ielādēt.',
    nalaganjeNiCelo:
      'Kamēr komanda nav ielādēta pilnībā, to nevar saglabāt; pretējā gadījumā saglabāšana izdzēstu spēlētājus, kas netika ielādēti.',
    poskusiZnova: 'Mēģināt vēlreiz',
    vpisiIme: 'Vispirms ievadi komandas nosaukumu.',
    osvezitev:
      'Komanda ir saglabāta, bet atsvaidzināšana neizdevās: ielādē lapu no jauna, pirms to atkal rediģē.',
    najprejShrani: 'Vispirms saglabā komandu.',
    izberiKrog: 'Izvēlies kārtu, kurā bonusam jābūt spēkā.',
    prihodnjiKrog: 'Izvēlies nākotnes neslēgtu kārtu ar noteiktu termiņu.',
    zeUporabil: 'Šo bonusu tu šajā sezonā jau esi izmantojis.',
    niPreklica: 'Bonusu šai kārtai vairs nevar atcelt.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'Šajā līgā tirgū vēl nav spēlētāju.',
    pocakaj: 'Pagaidi, kamēr saglabāšana beigsies.',
    niPredloga: 'No šīs līgas pagaidām nav iespējams sastādīt derīgu komandu.',
    predlogSestavljen: 'Komanda ir sastādīta: nomaini, ko vēlies, un nospied Saglabāt.',
    kaderDopolnjen: 'Trūkstošās vietas ir aizpildītas: pārbaudi un nospied Saglabāt.',
    niDopolnitve:
      'Sastāvu nevar papildināt ar atlikušo naudu. Nomaini kādu no dārgajiem spēlētājiem un mēģini vēlreiz.',
    kapetanNaKlop: '{ime} devās uz soliņu: izvēlies jaunu kapteini.',
    namestnikNaKlop: '{ime} devās uz soliņu: izvēlies jaunu vicekapteini.',
    brezPozicije: 'Spēlētājam vēl nav apstiprinātas pozīcijas, tāpēc viņu nevar likt laukumā.',
    niProstora:
      'Pamatsastāvā nav vietas vēl vienam šīs pozīcijas spēlētājam: vispirms nosēdini kādu uz soliņa.',
    niVecNamestnik: '{ime} vairs nav vicekapteinis: izvēlies jaunu.',
    niVecKapetan: '{ime} vairs nav kapteinis: izvēlies jaunu.',
    kapetanPrevzel: 'Kapteiņa apsēju tagad nēsā {ime}.',
    namestnikPrevzel: 'Vicekapteinis tagad ir {ime}.',
    rokPotekel: '{krog}. kārtas termiņš jau ir beidzies, tāpēc izmaiņas stājas spēkā no nākamās kārtas.',
    shranjenaZaKrog: 'Komanda ir saglabāta un gatava {krog}. kārtai.',
    shranjenaVeljavna: 'Komanda ir saglabāta un atbilst noteikumiem.',
    osnutekShranjen:
      'Melnraksts saglabāts: komanda vēl neatbilst noteikumiem, tāpēc par šo kārtu punktus nesaņemtu.',
    prodaja: 'Pārdošana tev atnesa +{cena}.',
    nakupi: 'Pirkumi maksāja {cena}.',
    wildcardVlozen: 'Wildcard ir aktivizēts: transfēri šajā kārtā ir bez maksas.',
    klopPlusVlozen: 'Soliņš+ ir aktivizēts.',
    wildcardPreklican: 'Wildcard ir atcelts: to var izmantot citā kārtā.',
    klopPlusPreklican: 'Soliņš+ ir atcelts: to var izmantot citā kārtā.',
    zapriOpozorilo: 'Aizvērt brīdinājumu',
    zapriObvestilo: 'Aizvērt paziņojumu',
    odstranjen: '{ime} ir noņemts.',
    razveljavi: 'Atsaukt',
  },

  brezPrijave: {
    opis: 'Komandu vari sastādīt arī bez konta. Tā paliek šajā pārlūkā, līdz to saglabāsi.',
    shrani: 'Saglabāt un izveidot kontu',
    pripravljena: 'Tava komanda ir gatava. Saglabā to.',
  },
  locenaLiga:
    'Komanda līgā <liga>{liga}</liga> ir atsevišķa no komandām citās līgās, ar savu budžetu un savu kopvērtējumu. Punkti tiek skaitīti no {krog}. kārtas, jo līdz tam vēl notiek pārejas starp klubiem un vecuma grupām.',

  vec: 'Vairāk: bonusi, vēsture, noteikumi',

  prestopi: {
    medSezono: {
      zero: 'Tu pievienojies sezonas laikā: līdz {krog}. kārtas termiņam komandu sastādi bez soda. Pēc tam katrā kārtā tev ir {n} bezmaksas transfēru, katrs nākamais maksā −{kazen}.',
      one: 'Tu pievienojies sezonas laikā: līdz {krog}. kārtas termiņam komandu sastādi bez soda. Pēc tam katrā kārtā tev ir {n} bezmaksas transfērs, katrs nākamais maksā −{kazen}.',
      other: 'Tu pievienojies sezonas laikā: līdz {krog}. kārtas termiņam komandu sastādi bez soda. Pēc tam katrā kārtā tev ir {n} bezmaksas transfēri, katrs nākamais maksā −{kazen}.',
    },
    stevec: 'Transfēri: {n}/{prosti}',
    wildcard: 'wildcard, bez soda',
    odbitek: 'atskaitījums šajā kārtā: {tock}',
    prosti: {
      zero: 'vēl {n} bez maksas, pēc tam −{kazen} par katru',
      one: 'vēl {n} bez maksas, pēc tam −{kazen} par katru',
      other: 'vēl {n} bez maksas, pēc tam −{kazen} par katru',
    },
  },

  namigi: {
    naslov: 'Ieteikumi transfēriem',
    zaKrog: 'Kurš {krog}. kārtā, visticamāk, nespēlēs un ko tu vari atļauties viņa vietā.',
    razlog: {
      neaktiven: 'vairs nav līgā',
      poskodba: 'savainots',
      odsotnost: 'prombūtnē',
      brezTekme: 'klubs nespēlē',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: '{ime} vietā liec sastāvā {novi}',
    niZamenjave: 'Nav maiņas, ko atļautu budžets un noteikumi.',
    opomba: 'Klikšķis tikai sagatavo maiņu: komandu saglabā pats. Katrs ieteikums ir spēkā atsevišķi.',
    skrij: 'Paslēpt līdz nākamajai kārtai',
    zamenjano: '{novi} ir sastāvā {ime} vietā. Kad esi apmierināts, saglabā komandu.',
  },

  odZadnjegaObiska: {
    naslov: 'Kopš pēdējā apmeklējuma',
    naslovTeden: 'Pēdējā nedēļā',
    vrednost: 'Komandas vērtība <znesek>{znak}{cena}</znesek>',
    gor: 'cena kāpa',
    dol: 'cena kritās',
    zapri: 'Aizvērt',
  },

  povzetek: {
    urediIme: 'Rediģēt komandas nosaukumu {ime}',
    bogastvo:
      'kapitāls <vrednost>{bogastvo}</vrednost><razlika></razlika> · sastāvs {kader} <placano>samaksāts</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Saglabāju …',
    shraniEkipo: 'Saglabāt komandu',
    neshranjeno: 'Nesaglabātas izmaiņas',
    imeEkipe: 'Komandas nosaukums',
    privzetoIme: 'FC {ime}',
    primerImena: 'piem., Svētdienas Varoņi',
  },

  vodic: {
    napredek: '{trenutni} / {skupaj}',
    naprej: 'Tālāk',
    razumem: 'Skaidrs',
    sestaviNaslov: 'Komanda ar vienu klikšķi',
    sestaviOpis: 'Noklikšķini šeit, un mēs tev sastādīsim derīgu komandu budžeta robežās. Pēc tam nomaini, ko vēlies.',
    igrisceNaslov: 'Šī ir tava komanda',
    igrisceOpis: 'Noklikšķini uz spēlētāja, lai redzētu datus vai viņu nomainītu. Punktus nes pamatsastāvs, rezervists nāk laukumā, ja kāds nespēlē.',
    shraniNaslov: 'Pēdējais solis: Saglabāt',
    shraniOpis: 'Kad saglabāsi, punktus krāsi jau nākamajā kārtā. Komandu vari mainīt līdz termiņam.',
  },
  zacetek: {
    naslov: 'Ar ko sākt?',
    sestaviMi: 'Sastādi man komandu',
    opisPredloga:
      'Mēs nejauši izvēlēsimies derīgu komandu budžeta robežās, katrs klikšķis citu. Pēc tam nomaini, ko vēlies, un saglabā.',
    sam: 'Labāk sastādīšu pats',
    drugPredlog: 'Cits piedāvājums',
    opisDrugegaPredloga:
      'Nepatīk? Izlozē jaunu komandu; kamēr to nesaglabā, tas ir par brīvu.',
    dopolni: 'Papildināt komandu',
    opisDopolnitve:
      'Brīvās vietas sastāvā: {n}. Tavas izvēles paliek, atlikušās vietas aizpildām nejauši budžeta robežās.',
    korak1: 'Komandas nosaukumu ieteicām augšā; to vari mainīt jebkurā brīdī.',
    korak2:
      'Noklikšķini <krepko>＋</krepko> uz tukšas vietas laukumā. Telefonā apakšējā joslā ir arī poga <krepko>＋ Pievienot</krepko>, datorā izvēlies no <krepko>spēlētāju tirgus</krepko> labajā pusē.',
    korak3:
      'Sastāvā ir {n} spēlētāji: {gk} VS, {def} AIZ, {mid} PUS, {fwd} UZB. No viena kluba ne vairāk kā {klub}.',
    korak4:
      'Kad vietas ir aizpildītas, izvēlies <krepko>kapteini</krepko> un <krepko>vicekapteini</krepko>, tad nospied <krepko>Saglabāt komandu</krepko> (telefonā <krepko>Saglabāt</krepko> apakšējā joslā).',
  },

  trak: {
    naslov: 'Apsējs',
    kapetan: 'Kapteinis (×{n})',
    namestnik: 'Vicekapteinis',
    nihce: 'neviens',
  },

  kajCe: {
    prinesla: 'Pašreizējais sastāvs <krog>{krog}. kārtā</krog> ({sezona}) būtu atnesis',
    opis: '"Kas būtu, ja" pārskats: tas nav vēsturisks rezultāts un mainās ar katru maiņu. Faktiskos punktus par iepriekšējām kārtām atradīsi kopvērtējumā un sastāva vēsturē.',
  },

  status: {
    manjka: 'Galīgai saglabāšanai vēl kaut kas trūkst:',
    vpisiIme: 'Ievadi komandas nosaukumu (laukā augšā).',
    osnutekZdaj: 'Melnrakstu vari saglabāt arī tagad; noteikumus izpildīsi vēlāk.',
    brezTock: '<krepko>{krog}. kārtā</krepko> šādā stāvoklī tu <krepko>NESAŅEMSI punktus</krepko>.',
    kajPomeni:
      '<krepko>Ko nozīmē "Saglabāt"?</krepko> Tavas izmaiņas (sastāvs, pamatsastāvs, kapteinis) tiek ierakstītas datubāzē. Pašreizējai kārtai ir spēkā stāvoklis termiņa brīdī. Līdz termiņam vari mainīt, cik vēlies, un spiest Saglabāt vēlreiz; spēkā ir pēdējā versija. <krepko>"Saglabāt melnrakstu"</krepko> nozīmē to pašu, tikai ar piezīmi, ka komanda vēl neatbilst visiem noteikumiem (punktiem vajag labojumus, skatīt sarakstu augšā).',
    kajPomeniRok:
      '<krepko>Ko nozīmē "Saglabāt"?</krepko> Tavas izmaiņas (sastāvs, pamatsastāvs, kapteinis) tiek ierakstītas datubāzē. Pašreizējai kārtai ir spēkā stāvoklis termiņa brīdī (<krepko>{krog}. kārta: {rok}</krepko>). Līdz termiņam vari mainīt, cik vēlies, un spiest Saglabāt vēlreiz; spēkā ir pēdējā versija. <krepko>"Saglabāt melnrakstu"</krepko> nozīmē to pašu, tikai ar piezīmi, ka komanda vēl neatbilst visiem noteikumiem (punktiem vajag labojumus, skatīt sarakstu augšā).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bonuss Soliņš+',
    klopPlusVlozenZa: 'Aktivizēts {krog}. kārtai ({sezona}): tajā skaitās arī soliņa punkti.',
    klopPlusVlozen: 'Soliņš+ jau ir aktivizēts: tajā skaitās arī soliņa punkti.',
    klopPlusOpis:
      'Reizi sezonā: izvēlētajā kārtā tiek pieskaitīti arī visu četru rezervistu punkti.',
    wildcardNaslov: 'Bonuss Wildcard',
    wildcardVlozenZa: 'Aktivizēts {krog}. kārtai ({sezona}): transfēri tajā ir bez maksas.',
    wildcardVlozen: 'Wildcard jau ir aktivizēts: transfēri tajā ir bez maksas.',
    wildcardOpis:
      'Reizi sezonā: šajā kārtā vari nomainīt tik spēlētāju, cik vēlies, bez punktu atskaitījuma.',
    zaklenjen: 'slēgts',
    preklici: 'atcelt',
    prekliciDo: 'Atcelt var līdz <odstevanje></odstevanje>',
    izberiKrog: 'Izvēlies kārtu …',
    niKroga: 'Nav nākamās kārtas ar termiņu',
    krogSezona: '{krog}. kārta ({sezona})',
    vlozi: 'Aktivizēt',
    vloziZa: 'Aktivizēt {krog}. kārtai',
    potrdiWildcard: 'Aktivizēt Wildcard {krog}. kārtai? Sezonā tas ir tikai vienreiz.',
  },

  zgodovina: {
    naslov: 'Sastāvu vēsture',
    posnetkov: {
      zero: '{n} kārtu ar saglabātu sastāvu',
      one: '{n} kārta ar saglabātu sastāvu',
      other: '{n} kārtas ar saglabātu sastāvu',
    },
    krog: '{krog}. kārta',
    podrobnost: '{krog}. kārta · sezona {sezona}',
    podrobnostSkupaj: '{krog}. kārta · sezona {sezona} · kopā <krepko>{tocke}</krepko>',
    deli: 'Dalīties ar {krog}. kārtu',
  },

  telefon: {
    ostane: 'atlikums',
    predalPovzetek: 'atlikums <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'labot ↑',
    neshranjeno: 'nesaglabāts',
    dodaj: '＋ Pievienot',
    osnutekNamig: 'Komanda vēl neatbilst noteikumiem: tā tiks saglabāta kā melnraksts.',
    neIzpolnjuje: 'komanda vēl neatbilst noteikumiem',
    zapriTrg: 'Aizvērt tirgu',
    zapri: '✕ Aizvērt',
  },

  trg: {
    naslov: 'Spēlētāju tirgus',
    iskanje: 'Meklēt pēc vārda …',
    pocistiIskanje: 'Notīrīt meklēšanu',
    vsi: 'visi',
    vsiKlubi: 'Visi klubi',
    niZadetkov: 'Nekas nav atrasts.',
    pocistiFiltre: 'Notīrīt filtrus',
    statLetos: '{goli} V · {minute} min',
    statLani: 'pērn {goli} V',
    brezNastopov: 'bez spēlēm',
    niVecVLigi: 'vairs nav līgā',
    tockeZadnjiKrog: 'Punkti pēdējā aizvadītajā kārtā',
    podatki: 'Spēlētāja dati: {ime}',
    podatkiNamig: 'Statistika, cenas izmaiņas, nākamās spēles',
    profilVNovemZavihku: 'Atvērt spēlētāja profilu jaunā cilnē',
    odstrani: '✕ noņemt',
    dodaj: '⊕ pievienot',
    prvih: 'Parādīti pirmie {n}: sašaurini izvēli ar meklēšanu.',
    noga: 'No viena kluba vari izvēlēties ne vairāk kā {n} spēlētājus. Vārti un minūtes ir no pašreizējās sezonas.',
  },

  rok: {
    krog: '{krog}. kārta',
    potekel: 'Termiņš ir beidzies: <krepko>{rok}</krepko>',
    rok: 'Termiņš: <krepko>{rok}</krepko>',
    niDolocen: 'Termiņš vēl nav noteikts.',
  },

  igrisce: {
    namigZamenjave: 'Pieskaries spēlētāja kreklam un tad tam, ar kuru viņu mainīsi.',
    zapriNamig: 'Aizvērt padomu',
    izberiZaMenjavo: '{ime}: izvēlēties maiņai',
    prekliciIzbiro: '{ime}: atcelt izvēli',
    zamenjajZ: '{ime}: mainīt ar spēlētāju {drugi}',
    izbran: 'Izvēlēts: {ime}. Pieskaries iezīmētam spēlētājam maiņai vai vēlreiz izvēlētajam, lai atceltu.',
    brezMenjave: 'Spēlētājam {ime} nav derīgas maiņas. Pieskaries vēlreiz, lai atceltu.',
    niVecVLigiNamig: 'Spēlētājs vairs nav līgā: sastāvs ar viņu nesaņem punktus.',
    niVecVLigi: 'vairs nav līgā',
    poskodba: 'trauma',
    odsoten: 'prombūtnē',
    kapetan: 'Kapteinis: trīskārši punkti',
    namestnik: 'Vicekapteinis',
    tockeKroga: 'Punkti pēdējā kārtā: {tocke}',
    tockeKrogaKapetan: 'Punkti pēdējā kārtā: {tocke} × 3 (kapteinis)',
    odstraniIzKadra: 'Noņemt no sastāva',
    odstrani: 'Noņemt {ime}',
    prej: 'Agrāk rindā uz maiņu',
    prejIme: '{ime}: agrāk rindā uz maiņu',
    pozneje: 'Vēlāk rindā uz maiņu',
    poznejeIme: '{ime}: vēlāk rindā uz maiņu',
    izberi: 'Izvēlies: {pozicija}',
    klop: 'Soliņš',
    klopOpis:
      'Ja kāds no pamatsastāva nespēlē, viņu nomaina pirmais tās pašas pozīcijas spēlētājs no soliņa, secībā no kreisās uz labo.',
    brezPozicije: 'Bez apstiprinātas pozīcijas: viņus nevar likt laukumā',
  },

  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min',
    goli: '{n} × vārti',
    asistence: '{n} × rezultatīvā piespēle',
    brezPrejetega: 'bez ielaistiem vārtiem',
    prejetih: 'ielaisti {n}',
    rumeni: 'dzeltenā kartīte',
    rdeci: 'sarkanā kartīte',
    skupaj: '{tocke} punkti',
    brezPostave: 'Protokolā šai komandai sastāvs nav norādīts.',
    klop: 'Soliņš',
    vstopilo: '· spēlē iesaistījās {n}',
  },

  enajsterica: {
    kapetan: 'Kapteinis',
    namestnik: 'Vicekapteinis ar apsēju',
  },

  opozorila: {
    naslov: 'Brīdinājumi tavās komandās',
    naslovNapakEna: 'Viena no tavām komandām nesaņems punktus',
    naslovNapak: {
      zero: '{n} tavu komandu nesaņems punktus',
      one: '{n} tava komanda nesaņems punktus',
      other: '{n} tavas komandas nesaņems punktus',
    },
    nimasEkipe: 'Tev vēl nav komandas<liga>({liga})</liga>: bez tās nākamajā kārtā tu nesaņemsi punktus.',
    sestavi: 'Sastādīt komandu →',
    popravi: 'Labot →',
    poglej: 'Skatīt →',
    skrij: 'Paslēpt brīdinājumu: {besedilo}',
    skrijNamig: 'Paslēpt līdz jaunam ziņojumam',
    pokaziVse: 'Rādīt visus ({n})',
    razlog: 'Komanda neatbilst noteikumiem.',
    brezTockKrog: '{krog}. kārtā tā nesaņems punktus.',
    brezTockRok: 'Nākamajā termiņā tā nesaņems punktus.',
    nepopolna: 'Komanda nav pilnīga: šī kārta vēl tiks slēgta, bet no nākamās tā punktus nesaņems.',
    igralec: {
      kapetan: {
        poskodba: 'Kapteinis {ime} ir savainots.',
        odsotnost: 'Kapteinis {ime} ir prombūtnē.',
        izstop: 'Kapteinis {ime} vairs nespēlēs: viņa klubs izstājās no līgas.',
      },
      namestnik: {
        poskodba: 'Vicekapteinis {ime} ir savainots.',
        odsotnost: 'Vicekapteinis {ime} ir prombūtnē.',
        izstop: 'Vicekapteinis {ime} vairs nespēlēs: viņa klubs izstājās no līgas.',
      },
      vPostavi: {
        poskodba: '{ime} ir savainots un ir pamatsastāvā.',
        odsotnost: '{ime} ir prombūtnē un ir pamatsastāvā.',
        izstop: '{ime} pamatsastāvā vairs nespēlēs: viņa klubs izstājās no līgas.',
      },
      naKlopi: {
        poskodba: '{ime} uz soliņa ir savainots.',
        odsotnost: '{ime} uz soliņa ir prombūtnē.',
        izstop: '{ime} uz soliņa vairs nespēlēs: viņa klubs izstājās no līgas.',
      },
    },
    posledica: {
      kapetan: 'Ja viņš nespēlē, apsēju pārņem vicekapteinis; varbūt labāk izvēlies citu kapteini.',
      namestnik: 'Ja nespēlē ne kapteinis, ne vicekapteinis, trīskāršu punktu nav.',
      vPostavi: 'Ja viņš nespēlē, viņu nomaina pirmais tās pašas pozīcijas spēlētājs no soliņa.',
      naKlopi: 'Automātiskajā maiņā sistēma viņu izlaidīs, ja viņš nespēlē.',
      izstop: 'Par viņu tu vairs nesaņemsi punktus: nomaini viņu. Komanda ar viņu paliek derīga.',
    },
  },
}
