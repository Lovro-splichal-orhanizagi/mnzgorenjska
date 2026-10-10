// Traducere în română: `tekme` (sursa: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: 'Etapa {n}',
  moraPrijava: 'Ca să votezi, trebuie să te <prijava>autentifici</prijava>.',

  // Postavke razčlenitve točk in pravila (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: '60 de minute jucate sau mai mult',
      nastopDo60: 'Joc sub 60 de minute',
      gol: 'Gol',
      goli: 'Goluri ({n})',
      asistenca: 'Pasă decisivă',
      asistence: 'Pase decisive ({n})',
      brezPrejetega: 'Fără gol primit',
      zmaga: 'Victoria echipei',
      prejetiGoli: 'Goluri primite ({n})',
      obranjena: 'Penalty apărat ({n})',
      zgresena: 'Penalty ratat ({n})',
      avtogol: 'Autogol ({n})',
      rumeni: 'Cartonaș galben ({n})',
      rdeci: 'Cartonaș roșu',
    },
    pravila: {
      igralniCas: 'Timp de joc',
      nastopDo60: 'Joc sub 60 de minute',
      nastopOd60: '60 de minute jucate sau mai mult',
      goliInAsistence: 'Goluri și pase decisive',
      golVratarja: 'Gol de portar',
      golBranilca: 'Gol de fundaș',
      golVezista: 'Gol de mijlocaș',
      golNapadalca: 'Gol de atacant',
      asistenca: 'Pasă decisivă',
      obramba: 'Apărare',
      csVratar: 'Fără gol primit: portar',
      csBranilec: 'Fără gol primit: fundaș',
      csVezist: 'Fără gol primit: mijlocaș',
      zmaga: 'Victoria echipei: portar, fundaș',
      prejeta2: 'La fiecare 2 goluri primite: portar, fundaș',
      // Pod tabelo pravil na naslovnici.
      opomba:
        'Apărarea contează de la cel puțin 60 de minute, iar golurile primite doar cele marcate cât timp jucătorul e pe teren.',
      obranjena:
        'Penalty apărat: portar (raportul de meci îl trece ca penalty ratat de adversar)',
      kazni: 'Penalizări',
      zgresena: 'Penalty ratat',
      avtogol: 'Autogol',
      rumeni: 'Cartonaș galben',
      rdeci: 'Cartonaș roșu',
    },
  },

  rezultati: {
    naslov: 'Rezultate',
    uvod:
      'Meciuri jucate, din rapoartele de meci ({zveza}). Apasă pe un meci și vezi ambele echipe de start pe teren: pe fiecare tricou, punctele câștigate de jucător.',
    niZacetka: 'Sezonul nu a început încă.',
    prazenKrog: 'În această etapă nu s-au jucat meciuri.',
    prejsnji: 'Etapa anterioară',
    naslednji: 'Etapa următoare',
  },

  // Stran Lestvica lige (/table): prava lestvica iz izidov in strelci.
  tabela: {
    naslov: 'Clasament',
    zavihek: '{liga} · clasament',
    uvod: 'Clasamentul sezonului {sezona}, calculat din rezultatele meciurilor din rapoartele de meci ({zveza}).',
    opomba: 'Aproximare: victorie 3 puncte, egal 1; la egalitate de puncte decide golaverajul, apoi golurile marcate. Federațiile pot avea alte reguli (meciuri directe, puncte scăzute), clasamentul oficial e la {zveza}.',
    niTekem: 'Această ligă nu are încă meciuri jucate.',
    stolpci: {
      klub: 'Club',
      tekme: 'M',
      zmage: 'V',
      remiji: 'E',
      porazi: 'Î',
      goli: 'Goluri',
      razlika: 'GV',
      tocke: 'Pct',
      forma: 'Formă',
    },
    stolpciOpis: {
      tekme: 'Meciuri jucate',
      zmage: 'Victorii',
      remiji: 'Egaluri',
      porazi: 'Înfrângeri',
      goli: 'Goluri marcate : primite',
      razlika: 'Golaveraj',
      tocke: 'Puncte',
    },
    forma: { W: 'V', D: 'E', L: 'Î' },
    formaOpis: { W: 'victorie', D: 'egal', L: 'înfrângere' },
    strelci: 'Marcatori',
    niStrelcev: 'În acest sezon nu există încă marcatori.',
    stolpciStrelcev: {
      igralec: 'Jucător',
      klub: 'Club',
      goli: 'Goluri',
      tekme: 'Meciuri',
      minute: 'Min',
    },
  },

  tekma: {
    naslov: 'Meci',
    niTekme: 'Acest meci nu există în rapoartele de meci.',
    nazaj: '← Rezultate',
    brezPostav:
      'Raportul acestui meci nu conține echipele de start, așa că punctele pe jucători nu pot fi afișate.',
    naDresu:
      'Pe tricou scrie câte puncte a câștigat jucătorul în acest meci. Apasă pe un jucător ca să-i deschizi pagina.',
    cakajo: {
      one: '{n} gol din acest meci așteaptă pasa decisivă: până atunci, pasatorul rămâne fără cele +3 puncte. Spune mai jos cine a dat pasa.',
      few: '{n} goluri din acest meci așteaptă pasa decisivă: până atunci, pasatorul rămâne fără cele +3 puncte. Spune mai jos cine a dat pasa.',
      other: '{n} de goluri din acest meci așteaptă pasa decisivă: până atunci, pasatorul rămâne fără cele +3 puncte. Spune mai jos cine a dat pasa.',
    },
    goliInAsistence: 'Goluri și pase decisive',
    prijaviSe: 'Autentifică-te ca să votezi',
  },

  // Stran Asistence (glasovanje o asistencah).
  glasovanje: {
    naslov: 'Pase decisive',
    kdoJePodal: 'Cine a dat pasa?',
    uvod:
      'Rapoartele de meci ({zveza}) consemnează marcatorii, dar nu și pasele decisive. Le stabilește comunitatea: când același jucător adună la un gol <b>{glasov}</b>, pasa decisivă îi este recunoscută și îi aduce <b>+3 puncte</b>.',
    // Tožilnik: "zbere 3 glasove".
    pragGlasov: { one: '{n} vot', few: '{n} voturi', other: '{n} de voturi' },
    niTekem: 'În sezonul curent nu s-au jucat încă meciuri',
    niTekemOpis:
      'Votul pentru pase decisive se deschide imediat ce se joacă prima etapă. Revino când sosesc rapoartele de meci.',
    arhiv: 'arhivă',
    preteklaSezona:
      'Votezi pentru un sezon trecut. Asta nu afectează punctele ligii curente: corectează doar istoricul.',
    izberiKrog: '1. Alege etapa',
    izberiTekmo: '2. Alege meciul',
    vsePotrjeno: 'Totul confirmat',
    zaprto: 'închis',
    poglejTekmo: 'Vezi echipele de start și punctele acestui meci →',
    niGolov: 'În acest meci nu s-au marcat goluri.',
    vsePotrjene: 'Toate pasele decisive din acest meci sunt confirmate. 🎉',
    zaprtoOpis: 'Votul pentru acest meci este închis: rămâne deschis până la termenul etapei următoare.',
    brezPotrjene: 'Fără pasă decisivă confirmată: {goli}.',
  },

  // Kartica gola z glasovanjem (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'marcator necunoscut',
    avtogol: 'Autogol: {ime}',
    enajstmetrovka: '{ime}, penalty',
    brezAsistenceOpomba: 'fără pasă decisivă',
    potrjena: 'pasă decisivă confirmată: blocat',
    brezAsistence: 'Fără pasă decisivă',
    odlocilaSkupnost: 'așa a decis comunitatea',
    morasSePrijaviti: 'Ca să votezi, trebuie să te autentifici',
    spremeniGlas: 'Schimbă votul',
    kdoJePodal: 'Cine a dat pasa?',
    vodiBrez: 'Conduce „fără pasă decisivă”',
    vodi: 'Conduce <b>{ime}</b>',
    igralecBrezZapisa: 'jucător neînregistrat',
    doOdlocitve: 'încă {n} până la decizie',
    ostali: 'Ceilalți:',
    brezGlasovi: 'fără ({n})',
    izberiPodajalca: 'Alege pasatorul: {ekipa}',
    nihce: 'Nimeni: gol fără pasă decisivă',
  },

  // Stran Pozicije (glasovanje o pozicijah).
  pozicije: {
    naslov: 'Poziții',
    kjeKdoIgra: 'Cine unde joacă?',
    uvod:
      'Rapoartele de meci marchează doar portarul, iar echipele de start sunt listate după numerele de pe tricou, deci pozițiile nu se pot deduce. Le stabilește comunitatea. Voturi necesare: <b>{prag}</b>. Numărul scade (până la {minPrag}) dacă estimarea statistică (numărul de pe tricou, goluri, cartonașe) indică puternic în acea direcție. Voturile <b>cunoscătorilor clubului</b> și ale utilizatorilor cu <b>precizie mare</b> contează mai mult.',
    enkratNaTeden:
      'Pozițiile votate se aplică <b>o dată pe săptămână, luni dimineața</b>, toate deodată. Așa liga nu se schimbă pe parcursul săptămânii: ce vezi marți e valabil și sâmbătă, când se blochează etapa. Jucătorul care a strâns deja destule voturi e marcat până atunci cu o clepsidră <ikona>⏳</ikona>.',
    klub: 'Club',
    poznavalecOznaka: '  ★ cunoscător',
    samoIzStatistike: 'Doar din statistici ({n})',
    vsiPotrjeni: 'Toți jucătorii acestui club au poziția confirmată. 🎉',
    niIgralcev: 'Nu există jucători.',
    status: {
      naslov: 'Statutul meu de votant',
      utezOpis:
        'Ponderea unui singur vot: se adună cu bonusul de insider dacă votezi un jucător de la clubul tău.',
      utez: 'pondere {utez}×',
      tocnih: '({pravilni}/{vsi} corecte)',
      klubPoznam: 'Clubul pe care îl cunosc bine (cunoscător): votul meu pentru jucătorii acestui club contează mai mult:',
      nisemPoznavalec: 'nu sunt cunoscătorul niciunui club',
      opomba:
        'Un cunoscător marchează un singur club. Ponderile se stabilizează în timp: dacă voturile tale se dovedesc greșite, încrederea scade. Încrederea se recalculează din voturile anterioare, când poziția e cunoscută.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} fără gol primit',
      izZapisnika: 'Din raportul de meci: portarul e marcat cu (P)',
      izStatistike: 'Din statistici (nr. tricou, goluri, cartonașe): voturile o pot corecta',
      potrdilaSkupnost: 'Confirmată de comunitate',
      zapisnik: ' · raport de meci',
      uveljavitevOpis:
        'Pozițiile se aplică o dată pe săptămână, luni dimineața: așa liga nu se schimbă pe parcursul săptămânii.',
      izglasovano: 'votat: {pozicija} · luni',
      neIgraOpis: 'Nu mai joacă: nu e pe piață. Dacă apare într-un raport de meci, revine singur.',
      neIgra: 'nu mai joacă',
      vrniOpis: 'Readu jucătorul printre cei activi',
      vrni: 'readu',
      odhodOpis:
        'Jucătorul nu mai joacă la acest club: îl scoate de pe piață. O apariție în raportul de meci îl readuce singur.',
      statistikaKaze:
        'Statisticile indică <b>{pozicija} ({odstotek}%)</b>: un vot în această direcție contează cu un prag mai mic ({nizji} în loc de {prag}).',
      dolocenaIzStatistike: 'Poziția e stabilită din statistici: dacă nu e corectă, apasă pe cea corectă.',
      dolocilaSkupnost: 'Poziția a fost stabilită de comunitate: se poate corecta prin voturi.',
      gumbUtez: 'Pondere {utez} / prag {prag}',
      gumbPrior: ' · estimare {odstotek}%',
      gumbPoznavalec: ' · votul tău de cunoscător contează mai mult',
      vodi: 'Conduce {pozicija}: pondere {utez} / {prag}',
    },
  },
}
