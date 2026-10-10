// Traducere în română: `mojaEkipa` (sursa: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Echipa mea',
  /** Nume de rezervă când nu știm numele jucătorului. */
  igralec: 'Jucător',
  vprasanjeZapustitve: 'Ai modificări nesalvate la echipă. Sigur vrei să părăsești pagina?',
  /** Eticheta banderolei pe tricou. */
  oznaka: {
    kapetan: 'C',
    namestnik: 'V',
  },

  // Regulile de alcătuire (lib/pravila.ts): motive pe piață și lista de erori.
  pravila: {
    pozicije: {
      GK: 'Portari',
      DEF: 'Fundași',
      MID: 'Mijlocași',
      FWD: 'Atacanți',
    },
    kaderPoln: 'Lotul e complet ({n} jucători).',
    pozicijaPolna: '{pozicija}: ai deja {n} în lot.',
    premaloProracuna: 'Buget insuficient: jucătorul costă {cena}, tu mai ai {preostalo}.',
    izKluba: 'Ai deja {n} jucători de la {klub}.',
    velikostEkipe: 'Echipa trebuie să aibă {n} jucători (acum {trenutno}).',
    velikostPostave: 'În formația de start trebuie să fie {n} jucători (acum {trenutno}).',
    brezPozicije: {
      one: '{n} jucător ales nu are încă poziția confirmată. Ajută în secțiunea Poziții.',
      few: '{n} jucători aleși nu au încă poziția confirmată. Ajută în secțiunea Poziții.',
      other: '{n} de jucători aleși nu au încă poziția confirmată. Ajută în secțiunea Poziții.',
    },
    niVecVLigi: '{ime} nu mai e în ligă, înlocuiește-l.',
    pozicijaVKadru: '{pozicija} în lot: {n}, trebuie să fie {kader}.',
    pozicijaVPostavi: '{pozicija} în formația de start: {n}, permis între {min} și {max}.',
    dolociKapetana: 'Alege căpitanul: în etapă aduce puncte de {n} ori.',
    enKapetan: 'Poate exista un singur căpitan.',
    dolociNamestnika: 'Alege vicecăpitanul, care preia banderola dacă nu joacă căpitanul.',
    istiKlub: 'De la același club poți alege cel mult {n} jucători.',
    presegelProracun: 'Ai depășit bugetul cu {cena}.',
  },

  napake: {
    zeImas: 'Ai deja o echipă în această ligă. Reîncarcă pagina.',
    dovoljenje: 'Nu ai permisiunea pentru asta. Autentifică-te din nou și mai încearcă o dată.',
    povezava: 'Nu există conexiune cu serverul. Verifică internetul și încearcă din nou.',
    shranjevanje: 'Salvarea nu a reușit. Încearcă din nou.',
    nalaganjePovezava: 'Nu există conexiune cu serverul. Verifică internetul.',
    nalaganje: 'Datele echipei nu au putut fi încărcate.',
    nalaganjeNiCelo:
      'Până nu se încarcă toată echipa, nu poate fi salvată: altfel salvarea ar șterge jucătorii care nu s-au încărcat.',
    poskusiZnova: 'Încearcă din nou',
    vpisiIme: 'Mai întâi scrie numele echipei.',
    osvezitev:
      'Echipa e salvată, dar reîmprospătarea nu a reușit. Reîncarcă pagina înainte să o editezi din nou.',
    najprejShrani: 'Mai întâi salvează echipa.',
    izberiKrog: 'Alege etapa în care să fie activ bonusul.',
    prihodnjiKrog: 'Alege o etapă viitoare, neblocată, cu termen stabilit.',
    zeUporabil: 'Ai folosit deja acest bonus în sezonul acesta.',
    niPreklica: 'Bonusul pentru această etapă nu mai poate fi anulat.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'În această ligă încă nu sunt jucători pe piață.',
    pocakaj: 'Așteaptă să se termine salvarea.',
    niPredloga: 'Deocamdată nu se poate alcătui o echipă validă din această ligă.',
    predlogSestavljen: 'Echipa e gata: schimbă pe cine vrei și apasă Salvează.',
    kaderDopolnjen: 'Locurile libere au fost completate: verifică și apasă Salvează.',
    niDopolnitve:
      'Lotul nu poate fi completat cu banii care ți-au rămas. Înlocuiește unul dintre jucătorii scumpi și încearcă din nou.',
    kapetanNaKlop: '{ime} a trecut pe bancă: alege un nou căpitan.',
    namestnikNaKlop: '{ime} a trecut pe bancă: alege un nou vicecăpitan.',
    brezPozicije: 'Jucătorul nu are încă poziția confirmată, așa că nu poate fi trimis pe teren.',
    niProstora:
      'În formație nu mai e loc pentru încă un jucător pe această poziție. Trimite mai întâi pe cineva pe bancă.',
    niVecNamestnik: '{ime} nu mai e vicecăpitan: alege altul.',
    niVecKapetan: '{ime} nu mai e căpitan: alege altul.',
    rokPotekel: 'Termenul etapei {krog} a expirat deja, așa că modificările se aplică din etapa următoare.',
    shranjenaZaKrog: 'Echipa e salvată și pregătită pentru etapa {krog}.',
    shranjenaVeljavna: 'Echipa e salvată și respectă regulile.',
    osnutekShranjen:
      'Ciornă salvată: echipa încă nu respectă regulile, așa că nu ar primi puncte în această etapă.',
    prodaja: 'Vânzarea ți-a adus +{cena}.',
    nakupi: 'Cumpărările au costat {cena}.',
    wildcardVlozen: 'Wildcard activat: transferurile din această etapă sunt gratuite.',
    klopPlusVlozen: 'Bancă+ activat.',
    wildcardPreklican: 'Wildcard anulat: îl poți folosi în altă etapă.',
    klopPlusPreklican: 'Bancă+ anulat: îl poți folosi în altă etapă.',
    zapriOpozorilo: 'Închide avertismentul',
    zapriObvestilo: 'Închide notificarea',
    odstranjen: '{ime} a fost scos.',
    razveljavi: 'Anulează',
  },

  prijavaPotrebna: 'Ca să-ți faci echipa, trebuie să te autentifici.',
  prijava: 'Autentificare',
  locenaLiga:
    'Echipa din liga <liga>{liga}</liga> e separată de echipele din alte ligi, cu propriul buget și propriul clasament. Punctele contează din etapa {krog}, pentru că până atunci încă au loc transferuri și treceri între selecții.',

  /** Secțiunea pliată de sub teren. */
  vec: 'Mai mult: bonusuri, istoric, reguli',

  prestopi: {
    stevec: 'Transferuri: {n}/{prosti}',
    wildcard: 'wildcard, fără penalizare',
    odbitek: 'penalizare {tock} în această etapă',
    prosti: {
      one: 'încă {n} gratuit, apoi −{kazen} pentru fiecare',
      few: 'încă {n} gratuite, apoi −{kazen} pentru fiecare',
      other: 'încă {n} de gratuite, apoi −{kazen} pentru fiecare',
    },
  },

  // Sfaturi pentru transferuri (lib/namigiEkipe.ts): cine nu va juca în
  // etapa următoare și pe cine îți permiți în locul lui.
  namigi: {
    naslov: 'Sfaturi pentru transferuri',
    zaKrog: 'Cine probabil nu va juca în etapa {krog} și pe cine îți permiți în locul lui.',
    razlog: {
      neaktiven: 'nu mai e în ligă',
      poskodba: 'accidentat',
      odsotnost: 'absent',
      brezTekme: 'clubul nu joacă',
    },
    kandidat: '{cena} · formă {forma}',
    zamenjajNamig: 'În locul lui {ime} pune în lot pe {novi}',
    niZamenjave: 'Nu există o înlocuire permisă de buget și de reguli.',
    opomba: 'Clicul doar pregătește schimbarea: echipa o salvezi tu. Fiecare sfat e independent.',
    skrij: 'Ascunde până la etapa următoare',
    zamenjano: '{novi} e în lot în locul lui {ime}. Când ești mulțumit, salvează echipa.',
  },

  // Evoluția prețurilor jucătorilor din lot de la ultima vizită.
  odZadnjegaObiska: {
    naslov: 'De la ultima vizită',
    naslovTeden: 'În ultima săptămână',
    vrednost: 'Valoarea echipei <znesek>{znak}{cena}</znesek>',
    gor: 'scumpire',
    dol: 'ieftinire',
    zapri: 'Închide',
  },

  povzetek: {
    urediIme: 'Editează numele echipei {ime}',
    bogastvo:
      'avere <vrednost>{bogastvo}</vrednost><razlika></razlika> · lot {kader} <placano>plătit</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Se salvează …',
    shraniEkipo: 'Salvează echipa',
    neshranjeno: 'Modificări nesalvate',
    imeEkipe: 'Numele echipei',
    privzetoIme: 'FC {ime}',
    primerImena: 'de ex. Eroii de Duminică',
  },

  // Sfat de început pentru echipa goală.
  zacetek: {
    naslov: 'De unde începi?',
    sestaviMi: 'Fă-mi o echipă',
    opisPredloga:
      'Alegem la întâmplare o echipă validă în limita bugetului, la fiecare clic alta. Apoi schimbă pe cine vrei și salvează.',
    sam: 'Prefer să o fac singur',
    drugPredlog: 'Altă propunere',
    opisDrugegaPredloga:
      'Nu-ți place? Trage la sorți o echipă nouă: cât timp nu o salvezi, e gratis.',
    dopolni: 'Completează echipa',
    opisDopolnitve:
      'Locuri libere în lot: {n}. Alegerile tale rămân, locurile rămase le completăm la întâmplare în limita bugetului.',
    korak1: 'Ți-am propus mai sus un nume pentru echipă: îl poți schimba oricând.',
    korak2:
      'Apasă <krepko>＋</krepko> pe un loc liber de pe teren. Pe telefon, în bara de jos mai e și butonul <krepko>＋ Adaugă</krepko>, iar pe calculator alegi din <krepko>piața de jucători</krepko> din dreapta.',
    korak3:
      'Lotul are {n} jucători: {gk} POR, {def} FUN, {mid} MIJ, {fwd} ATA. De la același club cel mult {klub}.',
    korak4:
      'Când locurile sunt ocupate, alege <krepko>căpitanul</krepko> și <krepko>vicecăpitanul</krepko>, apoi apasă <krepko>Salvează echipa</krepko> (pe telefon <krepko>Salvează</krepko> în bara de jos).',
  },

  trak: {
    naslov: 'Banderolă',
    kapetan: 'Căpitan (×{n})',
    namestnik: 'Vicecăpitan',
    nihce: 'nimeni',
  },

  // "Ce-ar fi dacă": cât ar fi adus formația actuală în ultima etapă.
  kajCe: {
    prinesla: 'Formația actuală ar fi adus în <krog>etapa {krog}</krog> ({sezona})',
    opis: 'Simulare "ce-ar fi dacă": nu e rezultat istoric, se schimbă la fiecare înlocuire. Punctele reale pentru etapele trecute le găsești în clasament și în instantaneul formației.',
  },

  status: {
    manjka: 'Pentru salvarea finală mai e nevoie de câteva lucruri:',
    vpisiIme: 'Scrie numele echipei (în câmpul de sus).',
    osnutekZdaj: 'Poți salva ciorna și acum: regulile le completezi mai târziu.',
    brezTock: '<krepko>În etapa {krog}</krepko>, în starea asta, <krepko>NU vei primi puncte</krepko>.',
    kajPomeni:
      '<krepko>Ce înseamnă "Salvează"?</krepko> Modificările tale (lot, formație, căpitan) se scriu în baza de date. Pentru etapa curentă contează starea de la termen. Până la termen poți schimba oricât și poți apăsa din nou Salvează: contează ultima versiune. <krepko>"Salvează ciorna"</krepko> înseamnă același lucru, doar cu mențiunea că echipa încă nu respectă toate regulile (pentru puncte ai nevoie de corecturi, vezi lista de mai sus).',
    kajPomeniRok:
      '<krepko>Ce înseamnă "Salvează"?</krepko> Modificările tale (lot, formație, căpitan) se scriu în baza de date. Pentru etapa curentă contează starea de la termen (<krepko>etapa {krog}: {rok}</krepko>). Până la termen poți schimba oricât și poți apăsa din nou Salvează: contează ultima versiune. <krepko>"Salvează ciorna"</krepko> înseamnă același lucru, doar cu mențiunea că echipa încă nu respectă toate regulile (pentru puncte ai nevoie de corecturi, vezi lista de mai sus).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bonusul Bancă+',
    klopPlusVlozenZa: 'Activat pentru etapa {krog} ({sezona}): în ea contează și punctele rezervelor.',
    klopPlusVlozen: 'Bancă+ e deja activat: în etapa respectivă contează și punctele rezervelor.',
    klopPlusOpis:
      'O dată pe sezon: în etapa aleasă se adună și punctele tuturor celor patru rezerve.',
    wildcardNaslov: 'Bonusul Wildcard',
    wildcardVlozenZa: 'Activat pentru etapa {krog} ({sezona}): transferurile din ea sunt gratuite.',
    wildcardVlozen: 'Wildcard e deja activat: transferurile din etapa respectivă sunt gratuite.',
    wildcardOpis:
      'O dată pe sezon: în această etapă poți schimba câți jucători vrei, fără penalizare de puncte.',
    zaklenjen: 'blocat',
    preklici: 'anulează',
    prekliciDo: 'Poți anula până la <odstevanje></odstevanje>',
    izberiKrog: 'Alege etapa …',
    niKroga: 'Nu există o etapă viitoare cu termen',
    krogSezona: 'Etapa {krog} ({sezona})',
    vlozi: 'Activează',
    vloziZa: 'Activează pentru etapa {krog}',
    potrdiWildcard: 'Activezi Wildcard pentru etapa {krog}? Îl ai o singură dată pe sezon.',
  },

  zgodovina: {
    naslov: 'Istoricul formațiilor',
    posnetkov: {
      one: '{n} etapă cu instantaneu',
      few: '{n} etape cu instantanee',
      other: '{n} de etape cu instantanee',
    },
    krog: 'Etapa {krog}',
    podrobnost: 'Etapa {krog} · sezonul {sezona}',
    podrobnostSkupaj: 'Etapa {krog} · sezonul {sezona} · total <krepko>{tocke}</krepko>',
    deli: 'Distribuie etapa {krog}',
  },

  // Bara de jos și sertarul pieței pe telefon.
  telefon: {
    ostane: 'rămân',
    predalPovzetek: 'rămân <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'corectează ↑',
    neshranjeno: 'nesalvat',
    dodaj: '＋ Adaugă',
    osnutekNamig: 'Echipa încă nu respectă regulile: se salvează ca ciornă.',
    neIzpolnjuje: 'echipa încă nu respectă regulile',
    zapriTrg: 'Închide piața',
    zapri: '✕ Închide',
  },

  trg: {
    naslov: 'Piața de jucători',
    iskanje: 'Caută după nume …',
    pocistiIskanje: 'Șterge căutarea',
    vsi: 'toți',
    vsiKlubi: 'Toate cluburile',
    niZadetkov: 'Niciun rezultat.',
    pocistiFiltre: 'Șterge filtrele',
    statLetos: '{goli} G · {minute} min',
    statLani: 'anul trecut {goli} G',
    brezNastopov: 'fără apariții',
    niVecVLigi: 'nu mai e în ligă',
    tockeZadnjiKrog: 'Puncte în ultima etapă jucată',
    podatki: 'Date despre jucătorul {ime}',
    podatkiNamig: 'Statistici, evoluția prețului, meciurile următoare',
    profilVNovemZavihku: 'Deschide profilul jucătorului într-o filă nouă',
    odstrani: '✕ scoate',
    dodaj: '⊕ adaugă',
    prvih: 'Sunt afișați primii {n}: restrânge selecția cu căutarea.',
    noga: 'De la același club poți alege cel mult {n} jucători. Golurile și minutele sunt din sezonul curent.',
  },

  rok: {
    krog: 'Etapa {krog}',
    potekel: 'Termenul a expirat: <krepko>{rok}</krepko>',
    rok: 'Termen: <krepko>{rok}</krepko>',
    niDolocen: 'Termenul nu e încă stabilit.',
  },

  // Terenul la alcătuirea echipei (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Mută pe bancă',
    vPostavo: 'Trece în formația de start',
    niVecVLigiNamig: 'Jucătorul nu mai e în ligă: lotul cu el nu primește puncte.',
    niVecVLigi: 'nu mai e în ligă',
    poskodba: 'accidentare',
    odsoten: 'absent',
    kapetan: 'Căpitan: puncte triple',
    namestnik: 'Vicecăpitan',
    tockeKroga: 'Puncte în ultima etapă: {tocke}',
    tockeKrogaKapetan: 'Puncte în ultima etapă: {tocke} × 3 (căpitan)',
    odstraniIzKadra: 'Scoate din lot',
    odstrani: 'Scoate-l pe {ime}',
    prej: 'Mai devreme la rând pentru schimbare',
    prejIme: '{ime}: mai devreme la rând pentru schimbare',
    pozneje: 'Mai târziu la rând pentru schimbare',
    poznejeIme: '{ime}: mai târziu la rând pentru schimbare',
    izberi: 'Alege: {pozicija}',
    klop: 'Bancă',
    klopOpis:
      'Cine nu joacă din formație e înlocuit de primul jucător de pe aceeași poziție de pe bancă, în ordine de la stânga la dreapta.',
    brezPozicije: 'Fără poziție confirmată: nu pot fi trimiși pe teren',
  },

  // Terenul cu punctele unei echipe la un meci (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min',
    goli: '{n} × gol',
    asistence: '{n} × pasă decisivă',
    brezPrejetega: 'fără gol primit',
    prejetih: 'goluri primite: {n}',
    rumeni: 'cartonaș galben',
    rdeci: 'cartonaș roșu',
    skupaj: '{tocke} puncte',
    brezPostave: 'Raportul de meci nu indică formația pentru această echipă.',
    klop: 'Bancă',
    vstopilo: 'au intrat în joc: {n}',
  },

  // Echipa ideală și formația altcuiva pe teren.
  enajsterica: {
    kapetan: 'Căpitan',
    namestnik: 'Vicecăpitan cu banderolă',
  },

  // Bara cu notificări despre echipele mele (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Avertismente în echipele tale',
    naslovNapakEna: 'Una dintre echipele tale nu va primi puncte',
    naslovNapak: {
      one: '{n} echipă de-a ta nu va primi puncte',
      few: '{n} echipe de-ale tale nu vor primi puncte',
      other: '{n} de echipe de-ale tale nu vor primi puncte',
    },
    nimasEkipe: 'Încă nu ai echipă<liga>({liga})</liga>: fără ea nu primești puncte în etapa următoare.',
    sestavi: 'Fă-ți echipa →',
    popravi: 'Corectează →',
    poglej: 'Vezi →',
    skrij: 'Ascunde avertismentul: {besedilo}',
    skrijNamig: 'Ascunde până la un nou raport',
    pokaziVse: 'Arată tot ({n})',
    razlog: 'Echipa nu respectă regulile.',
    brezTockKrog: 'Nu va primi puncte în etapa {krog}.',
    brezTockRok: 'Nu va primi puncte la următorul termen.',
    nepopolna: 'Echipa nu e completă: etapa aceasta se mai blochează, dar de la următoarea nu va mai primi puncte.',
    igralec: {
      kapetan: {
        poskodba: 'Căpitanul {ime} e accidentat.',
        odsotnost: 'Căpitanul {ime} e absent.',
        izstop: 'Căpitanul {ime} nu va mai juca: clubul lui s-a retras din ligă.',
      },
      namestnik: {
        poskodba: 'Vicecăpitanul {ime} e accidentat.',
        odsotnost: 'Vicecăpitanul {ime} e absent.',
        izstop: 'Vicecăpitanul {ime} nu va mai juca: clubul lui s-a retras din ligă.',
      },
      vPostavi: {
        poskodba: '{ime} e accidentat și e în formația de start.',
        odsotnost: '{ime} e absent și e în formația de start.',
        izstop: '{ime} din formația de start nu va mai juca: clubul lui s-a retras din ligă.',
      },
      naKlopi: {
        poskodba: '{ime}, de pe bancă, e accidentat.',
        odsotnost: '{ime}, de pe bancă, e absent.',
        izstop: '{ime}, de pe bancă, nu va mai juca: clubul lui s-a retras din ligă.',
      },
    },
    posledica: {
      kapetan: 'Dacă nu joacă, banderola o preia vicecăpitanul. Poate e mai bine să alegi alt căpitan.',
      namestnik: 'Dacă nu joacă nici căpitanul, nici vicecăpitanul, nu există puncte triple.',
      vPostavi: 'Dacă nu joacă, îl înlocuiește primul jucător de pe aceeași poziție de pe bancă.',
      naKlopi: 'La schimbarea automată, sistemul îl va sări dacă nu joacă.',
      izstop: 'Pentru el nu vei mai primi puncte: înlocuiește-l. Echipa cu el rămâne validă.',
    },
  },
}
