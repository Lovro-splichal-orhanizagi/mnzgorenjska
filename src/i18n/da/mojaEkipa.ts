// Danski prevod: `mojaEkipa` (izvor: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Mit hold',
  /** Reserve, når spillerens navn er ukendt. */
  igralec: 'Spiller',
  vprasanjeZapustitve: 'Du har ændringer på holdet, der ikke er gemt. Vil du forlade siden alligevel?',
  /** Bogstav på anførerbindet på trøjen. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'V',
  },

  // Regler for truppen (lib/pravila.ts): årsager på markedet og i fejllisten.
  pravila: {
    pozicije: {
      GK: 'Målmænd',
      DEF: 'Forsvarsspillere',
      MID: 'Midtbanespillere',
      FWD: 'Angribere',
    },
    kaderPoln: 'Din trup er fuld ({n} spillere).',
    pozicijaPolna: '{pozicija}: du har allerede {n} i truppen.',
    premaloProracuna: 'Ikke nok budget: spilleren koster {cena}, og du har {preostalo} tilbage.',
    izKluba: 'Du har allerede {n} spillere fra {klub}.',
    velikostEkipe: 'Din trup skal have {n} spillere (lige nu {trenutno}).',
    velikostPostave: 'Din startellever skal have {n} spillere (lige nu {trenutno}).',
    brezPozicije: {
      one: '{n} valgt spiller har endnu ingen bekræftet position. Giv en hånd med under Positioner.',
      other: '{n} valgte spillere har endnu ingen bekræftet position. Giv en hånd med under Positioner.',
    },
    niVecVLigi: '{ime} er ikke længere i ligaen. Skift ham ud.',
    pozicijaVKadru: '{pozicija} i truppen: {n}, skal være {kader}.',
    pozicijaVPostavi: '{pozicija} i startelleveren: {n}, tilladt er {min} til {max}.',
    dolociKapetana: 'Vælg en kaptajn: han får {n}× point i runden.',
    enKapetan: 'Du kan kun have én kaptajn.',
    dolociNamestnika: 'Vælg en vicekaptajn, der overtager anførerbindet, hvis kaptajnen ikke spiller.',
    istiKlub: 'Du kan højst vælge {n} spillere fra samme klub.',
    presegelProracun: 'Du er {cena} over budget.',
  },

  napake: {
    zeImas: 'Du har allerede et hold i denne liga. Genindlæs siden.',
    dovoljenje: 'Du har ikke tilladelse til dette. Log ind igen, og prøv en gang til.',
    povezava: 'Ingen forbindelse til serveren. Tjek din internetforbindelse, og prøv igen.',
    shranjevanje: 'Det lykkedes ikke at gemme. Prøv igen.',
    nalaganjePovezava: 'Ingen forbindelse til serveren. Tjek din internetforbindelse.',
    nalaganje: 'Dine holddata kunne ikke indlæses.',
    nalaganjeNiCelo:
      'Dit hold kan ikke gemmes, før det er helt indlæst. Ellers ville gemningen fjerne de spillere, der ikke blev indlæst.',
    poskusiZnova: 'Prøv igen',
    vpisiIme: 'Skriv først et holdnavn.',
    osvezitev:
      'Dit hold er gemt, men opdateringen mislykkedes. Genindlæs siden, før du redigerer igen.',
    najprejShrani: 'Gem først dit hold.',
    izberiKrog: 'Vælg den runde, chippen skal gælde for.',
    prihodnjiKrog: 'Vælg en kommende, ulåst runde med en fastsat deadline.',
    zeUporabil: 'Du har allerede brugt denne chip i denne sæson.',
    niPreklica: 'Chippen for denne runde kan ikke længere annulleres.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'Der er endnu ingen spillere på markedet i denne liga.',
    pocakaj: 'Vent, til gemningen er færdig.',
    niPredloga: 'Der kan endnu ikke sættes et gyldigt hold i denne liga.',
    predlogSestavljen: 'Dit hold er sat. Skift ud, som du vil, og tryk Gem.',
    kaderDopolnjen: 'De tomme pladser er udfyldt. Tjek dem, og tryk Gem.',
    niDopolnitve:
      'Din trup kan ikke gøres færdig med de penge, du har tilbage. Skift en af de dyre spillere ud, og prøv igen.',
    kapetanNaKlop: '{ime} er rykket på bænken. Vælg en ny kaptajn.',
    namestnikNaKlop: '{ime} er rykket på bænken. Vælg en ny vicekaptajn.',
    brezPozicije: 'Denne spiller har endnu ingen bekræftet position, så han kan ikke komme på banen.',
    niProstora:
      'Der er ikke plads i startelleveren til endnu en spiller på denne position. Sæt først en anden på bænken.',
    niVecNamestnik: '{ime} er ikke længere vicekaptajn. Vælg en ny.',
    niVecKapetan: '{ime} er ikke længere kaptajn. Vælg en ny.',
    kapetanPrevzel: '{ime} bærer nu anførerbindet.',
    namestnikPrevzel: '{ime} er nu vicekaptajn.',
    rokPotekel: 'Deadline for {krog}. runde er passeret, så ændringerne gælder fra næste runde.',
    shranjenaZaKrog: 'Dit hold er gemt og klar til {krog}. runde.',
    shranjenaVeljavna: 'Dit hold er gemt og overholder reglerne.',
    osnutekShranjen:
      'Kladden er gemt. Dit hold overholder endnu ikke reglerne, så det ville ikke få point i denne runde.',
    prodaja: 'Salget gav dig +{cena}.',
    nakupi: 'Købene kostede {cena}.',
    wildcardVlozen: 'Wildcard er brugt: transfers i denne runde er gratis.',
    klopPlusVlozen: 'Bænk+ er brugt.',
    wildcardPreklican: 'Wildcard er annulleret. Du kan bruge den i en anden runde.',
    klopPlusPreklican: 'Bænk+ er annulleret. Du kan bruge den i en anden runde.',
    zapriOpozorilo: 'Luk advarsel',
    zapriObvestilo: 'Luk besked',
    odstranjen: '{ime} er fjernet.',
    razveljavi: 'Fortryd',
    dodan: '{ime} er på dit hold. Tryk Gem.',
    dodanSamodejno: '{ime} er på dit hold.',
    zeVEkipi: '{ime} er allerede på dit hold.',
    niNaTrgu: 'Denne spiller kan ikke købes lige nu.',
  },

  brezPrijave: {
    opis: 'Du kan sætte dit hold uden en konto. Det bliver i denne browser, indtil du gemmer det.',
    shrani: 'Gem og opret konto',
    pripravljena: 'Dit hold er klar. Gem det.',
  },
  locenaLiga:
    'Dit hold i <liga>{liga}</liga> er adskilt fra dine hold i andre ligaer, med eget budget og egen rangliste. Pointene tæller fra {krog}. runde, fordi der indtil da stadig sker klubskifter og flytninger mellem årgangene.',

  /** Sammenklappet afsnit under banen. */
  vec: 'Mere: chips, historik, regler',

  prestopi: {
    medSezono: {
      one: 'Du kommer med midt i sæsonen: indtil deadline for {krog}. runde kan du sætte dit hold uden straf. Derefter får du {n} gratis transfer pr. runde; hver ekstra koster −{kazen}.',
      other: 'Du kommer med midt i sæsonen: indtil deadline for {krog}. runde kan du sætte dit hold uden straf. Derefter får du {n} gratis transfers pr. runde; hver ekstra koster −{kazen}.',
    },
    stevec: 'Transfers: {n}/{prosti}',
    wildcard: 'wildcard, ingen straf',
    odbitek: '{tock} trukket fra i denne runde',
    prosti: {
      one: '{n} gratis mere, derefter −{kazen} pr. stk.',
      other: '{n} gratis mere, derefter −{kazen} pr. stk.',
    },
  },

  // Transfertips (lib/namigiEkipe.ts): hvem spiller nok ikke i næste runde, og hvem har du råd til i stedet.
  namigi: {
    naslov: 'Transfertips',
    zaKrog: 'Hvem spiller nok ikke i {krog}. runde, og hvem har du råd til i stedet.',
    razlog: {
      neaktiven: 'ikke længere i ligaen',
      poskodba: 'skadet',
      odsotnost: 'ikke til rådighed',
      brezTekme: 'klubben spiller ikke',
    },
    kandidat: '{cena} · form {forma}',
    zamenjajNamig: 'Skift {ime} ud med {novi} i din trup',
    niZamenjave: 'Ingen afløser passer til dit budget og reglerne.',
    opomba: 'Et klik gør kun byttet klar; du gemmer selv holdet. Hvert tip står for sig selv.',
    skrij: 'Skjul til næste runde',
    zamenjano: '{novi} er i din trup i stedet for {ime}. Gem holdet, når du er tilfreds.',
  },

  // Prisændringer for truppens spillere siden sidste besøg.
  odZadnjegaObiska: {
    naslov: 'Siden dit sidste besøg',
    naslovTeden: 'Den seneste uge',
    vrednost: 'Holdets værdi <znesek>{znak}{cena}</znesek>',
    gor: 'prisstigning',
    dol: 'prisfald',
    zapri: 'Luk',
  },

  povzetek: {
    urediIme: 'Rediger holdnavnet {ime}',
    bogastvo:
      'formue <vrednost>{bogastvo}</vrednost><razlika></razlika> · trup {kader} <placano>betalt</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Gemmer …',
    shranjeno: 'Gemt ✓',
    shraniEkipo: 'Gem hold',
    neshranjeno: 'Ændringer ikke gemt',
    imeEkipe: 'Holdnavn',
    privzetoIme: 'FC {ime}',
    primerImena: 'fx Søndagsheltene',
  },

  // Starttip for et tomt hold.
  vodic: {
    napredek: '{trenutni} / {skupaj}',
    naprej: 'Næste',
    razumem: 'Forstået',
    sestaviNaslov: 'Et hold med ét klik',
    sestaviOpis: 'Tryk her, så sætter vi et gyldigt hold inden for budgettet. Skift derefter ud, som du vil.',
    igrisceNaslov: 'Det her er dit hold',
    igrisceOpis: 'Tryk på en spiller for at se detaljer eller skifte ham ud. Din startellever scorer point, og en bænkspiller kommer ind, hvis nogen ikke spiller.',
    shraniNaslov: 'Sidste trin: Gem',
    shraniOpis: 'Når du har gemt, scorer du point fra næste runde. Du kan ændre holdet frem til deadline.',
  },
  zacetek: {
    naslov: 'Hvor skal du starte?',
    sestaviMi: 'Sæt mit hold',
    opisPredloga:
      'Vi vælger et tilfældigt gyldigt hold inden for budgettet, et nyt ved hvert klik. Skift derefter ud, som du vil, og gem.',
    sam: 'Jeg vil hellere sætte det selv',
    drugPredlog: 'Et andet forslag',
    opisDrugegaPredloga:
      'Kan du ikke lide det? Træk et nyt hold; det er gratis, indtil du gemmer.',
    dopolni: 'Gør mit hold færdigt',
    opisDopolnitve:
      'Tomme pladser i truppen: {n}. Dine valg bliver; vi udfylder resten tilfældigt inden for budgettet.',
    korak1: 'Vi har foreslået et holdnavn ovenfor. Du kan altid ændre det.',
    korak2:
      'Klik på <krepko>＋</krepko> på en tom plads på banen. På en telefon er der også en knap <krepko>＋ Tilføj</krepko> i bunden; på en computer vælger du fra <krepko>spillermarkedet</krepko> til højre.',
    korak3:
      'Truppen er på {n} spillere: {gk} MM, {def} FOR, {mid} MID, {fwd} ANG. Højst {klub} fra samme klub.',
    korak4:
      'Når alle pladser er fyldt, så vælg en <krepko>kaptajn</krepko> og en <krepko>vicekaptajn</krepko>, og tryk på <krepko>Gem hold</krepko> (på en telefon <krepko>Gem</krepko> i bunden).',
  },

  trak: {
    naslov: 'Anførerbind',
    kapetan: 'Kaptajn (×{n})',
    namestnik: 'Vicekaptajn',
    nihce: '(ingen)',
  },

  // "Hvad nu hvis": hvad den nuværende opstilling ville have scoret i seneste runde.
  kajCe: {
    prinesla: 'Din nuværende opstilling ville have scoret i <krog>{krog}. runde</krog> ({sezona})',
    opis: 'En "hvad nu hvis"-visning, ikke et historisk resultat; den ændrer sig ved hvert bytte. De faktiske point for tidligere runder står i ranglisten og i opstillingshistorikken.',
  },

  status: {
    manjka: 'Der mangler stadig et par ting, før du kan gemme endeligt:',
    vpisiIme: 'Skriv et holdnavn (i feltet ovenfor).',
    osnutekZdaj: 'Du kan også gemme en kladde nu og ordne reglerne senere.',
    brezTock: 'Som holdet er nu, <krepko>FÅR DU INGEN POINT</krepko> <krepko>i {krog}. runde</krepko>.',
    kajPomeni:
      '<krepko>Hvad gør "Gem"?</krepko> Dine ændringer (trup, opstilling, kaptajn) skrives i databasen. For den aktuelle runde tæller holdet, som det er ved deadline. Indtil deadline kan du ændre og trykke Gem, så tit du vil; den sidste version tæller. <krepko>"Gem kladde"</krepko> gør det samme, men noterer, at holdet endnu ikke overholder alle regler (der skal rettes noget, før du får point; se listen ovenfor).',
    kajPomeniRok:
      '<krepko>Hvad gør "Gem"?</krepko> Dine ændringer (trup, opstilling, kaptajn) skrives i databasen. For den aktuelle runde tæller holdet, som det er ved deadline (<krepko>{krog}. runde: {rok}</krepko>). Indtil deadline kan du ændre og trykke Gem, så tit du vil; den sidste version tæller. <krepko>"Gem kladde"</krepko> gør det samme, men noterer, at holdet endnu ikke overholder alle regler (der skal rettes noget, før du får point; se listen ovenfor).',
  },

  pripomocki: {
    klopPlusNaslov: 'Chippen Bænk+',
    klopPlusVlozenZa: 'Brugt i {krog}. runde ({sezona}): bænkens point tæller også.',
    klopPlusVlozen: 'Bænk+ er allerede brugt: bænkens point tæller også.',
    klopPlusOpis:
      'Én gang pr. sæson: i den valgte runde lægges pointene for alle fire reserver også til.',
    wildcardNaslov: 'Chippen Wildcard',
    wildcardVlozenZa: 'Brugt i {krog}. runde ({sezona}): transfers i den er gratis.',
    wildcardVlozen: 'Wildcard er allerede brugt: transfers i den er gratis.',
    wildcardOpis:
      'Én gang pr. sæson: i denne runde kan du skifte så mange spillere ud, du vil, uden pointfradrag.',
    zaklenjen: 'låst',
    preklici: 'annuller',
    prekliciDo: 'Du kan annullere indtil <odstevanje></odstevanje>',
    izberiKrog: 'Vælg en runde …',
    niKroga: 'Ingen kommende runde med deadline',
    krogSezona: '{krog}. runde ({sezona})',
    vlozi: 'Brug',
    vloziZa: 'Brug i {krog}. runde',
    potrdiWildcard: 'Vil du bruge dit Wildcard i {krog}. runde? Du har kun ét pr. sæson.',
  },

  zgodovina: {
    naslov: 'Opstillingshistorik',
    posnetkov: {
      one: '{n} runde med et øjebliksbillede',
      other: '{n} runder med øjebliksbilleder',
    },
    krog: '{krog}. runde',
    podrobnost: '{krog}. runde · sæson {sezona}',
    podrobnostSkupaj: '{krog}. runde · sæson {sezona} · i alt <krepko>{tocke}</krepko>',
    deli: 'Del {krog}. runde',
  },

  // Bundlinje og markedsskuffe på telefoner.
  telefon: {
    ostane: 'tilbage',
    predalPovzetek: '<krepko>{cena}</krepko> tilbage · {n}/{velikost}',
    popravi: 'ret ↑',
    neshranjeno: 'ikke gemt',
    dodaj: '＋ Tilføj',
    osnutekNamig: 'Dit hold overholder endnu ikke reglerne, så det gemmes som kladde.',
    neIzpolnjuje: 'holdet overholder endnu ikke reglerne',
    zapriTrg: 'Luk markedet',
    zapri: '✕ Luk',
  },

  trg: {
    naslov: 'Spillermarked',
    iskanje: 'Søg efter navn …',
    pocistiIskanje: 'Ryd søgning',
    vsi: 'alle',
    vsiKlubi: 'Alle klubber',
    niZadetkov: 'Ingen resultater.',
    pocistiFiltre: 'Ryd filtre',
    statLetos: '{goli} M · {minute} min.',
    statLani: 'sidste sæson {goli} M',
    brezNastopov: 'ingen kampe',
    niVecVLigi: 'ikke længere i ligaen',
    tockeZadnjiKrog: 'Point i den seneste spillede runde',
    podatki: 'Detaljer for {ime}',
    podatkiNamig: 'Statistik, prishistorik, kommende kampe',
    profilVNovemZavihku: 'Åbn spillerprofilen i en ny fane',
    odstrani: '✕ fjern',
    dodaj: '⊕ tilføj',
    prvih: 'Viser de første {n}. Indsnævr med søgningen.',
    noga: 'Du kan højst vælge {n} spillere fra samme klub. Mål og minutter er fra den aktuelle sæson.',
  },

  rok: {
    krog: '{krog}. runde',
    potekel: 'Deadline er passeret: <krepko>{rok}</krepko>',
    rok: 'Deadline: <krepko>{rok}</krepko>',
    niDolocen: 'Ingen deadline fastsat endnu.',
  },

  // Banen i holdbyggeren (components/Igrisce.tsx).
  igrisce: {
    namigZamenjave: 'Tryk på en spillers trøje og derefter på den spiller, du vil bytte ham med.',
    zapriNamig: 'Luk tip',
    izberiZaMenjavo: '{ime}: vælg til udskiftning',
    prekliciIzbiro: '{ime}: annuller valg',
    zamenjajZ: '{ime}: byt med {drugi}',
    izbran: '{ime} er valgt. Tryk på en fremhævet spiller for at bytte, eller på samme spiller igen for at annullere.',
    brezMenjave: 'Intet gyldigt bytte for {ime}. Tryk på ham igen for at annullere.',
    niVecVLigiNamig: 'Denne spiller er ikke længere i ligaen; en trup med ham får ingen point.',
    niVecVLigi: 'ikke længere i ligaen',
    poskodba: 'skade',
    odsoten: 'ikke til rådighed',
    kapetan: 'Kaptajn: tredobbelte point',
    namestnik: 'Vicekaptajn',
    tockeKroga: 'Point i seneste runde: {tocke}',
    tockeKrogaKapetan: 'Point i seneste runde: {tocke} × 3 (kaptajn)',
    odstraniIzKadra: 'Fjern fra truppen',
    odstrani: 'Fjern {ime}',
    prej: 'Tidligere i udskiftningsrækkefølgen',
    prejIme: '{ime}: tidligere i udskiftningsrækkefølgen',
    pozneje: 'Senere i udskiftningsrækkefølgen',
    poznejeIme: '{ime}: senere i udskiftningsrækkefølgen',
    izberi: 'Vælg: {pozicija}',
    klop: 'Bænk',
    klopOpis:
      'Spiller en starter ikke, erstattes han af den første bænkspiller på samme position, i rækkefølge fra venstre mod højre.',
    brezPozicije: 'Ingen bekræftet position, så de kan ikke komme på banen',
  },

  // Banen med ét holds point i en kamp (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min.',
    goli: '{n} × mål',
    asistence: '{n} × assist',
    brezPrejetega: 'rent bur',
    prejetih: '{n} mål imod',
    rumeni: 'gult kort',
    rdeci: 'rødt kort',
    skupaj: '{tocke} p',
    brezPostave: 'Kamprapporten viser ingen opstilling for dette hold.',
    klop: 'Bænk',
    vstopilo: '· {n} kom ind',
  },

  // Rundens hold og en anden managers opstilling på banen.
  enajsterica: {
    kapetan: 'Kaptajn',
    namestnik: 'Vicekaptajn med anførerbind',
  },

  // Banner med beskeder om mine hold (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Advarsler for dine hold',
    naslovNapakEna: 'Et af dine hold får ingen point',
    naslovNapak: {
      one: '{n} af dine hold får ingen point',
      other: '{n} af dine hold får ingen point',
    },
    nimasEkipe: 'Du har endnu intet hold<liga>({liga})</liga>, og uden et hold får du ingen point i næste runde.',
    sestavi: 'Sæt et hold →',
    popravi: 'Ret →',
    poglej: 'Se →',
    skrij: 'Skjul advarsel: {besedilo}',
    skrijNamig: 'Skjul, indtil der kommer en ny melding',
    pokaziVse: 'Vis alle ({n})',
    razlog: 'Holdet overholder ikke reglerne.',
    brezTockKrog: 'Det får ingen point i {krog}. runde.',
    brezTockRok: 'Det får ingen point ved næste deadline.',
    nepopolna: 'Holdet er ufuldstændigt. Denne runde låses stadig, men fra næste runde får det ingen point.',
    igralec: {
      kapetan: {
        poskodba: 'Kaptajnen {ime} er skadet.',
        odsotnost: 'Kaptajnen {ime} er ikke til rådighed.',
        izstop: 'Kaptajnen {ime} spiller ikke mere: hans klub har trukket sig fra ligaen.',
      },
      namestnik: {
        poskodba: 'Vicekaptajnen {ime} er skadet.',
        odsotnost: 'Vicekaptajnen {ime} er ikke til rådighed.',
        izstop: 'Vicekaptajnen {ime} spiller ikke mere: hans klub har trukket sig fra ligaen.',
      },
      vPostavi: {
        poskodba: '{ime} er skadet og står i din startellever.',
        odsotnost: '{ime} er ikke til rådighed og står i din startellever.',
        izstop: '{ime} i din startellever spiller ikke mere: hans klub har trukket sig fra ligaen.',
      },
      naKlopi: {
        poskodba: '{ime} på din bænk er skadet.',
        odsotnost: '{ime} på din bænk er ikke til rådighed.',
        izstop: '{ime} på din bænk spiller ikke mere: hans klub har trukket sig fra ligaen.',
      },
    },
    posledica: {
      kapetan: 'Spiller han ikke, overtager vicekaptajnen anførerbindet. Vælg måske en anden kaptajn.',
      namestnik: 'Spiller hverken kaptajnen eller vicekaptajnen, er der ingen tredobbelte point.',
      vPostavi: 'Spiller han ikke, erstattes han af den første bænkspiller på samme position.',
      naKlopi: 'Den automatiske udskiftning springer ham over, hvis han ikke spiller.',
      izstop: 'Han får ikke flere point, så skift ham ud. Dit hold forbliver gyldigt, hvis du beholder ham.',
    },
  },
}
