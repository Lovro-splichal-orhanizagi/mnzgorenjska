// Traducere în română: `lestvice` (sursa: src/i18n/sl/lestvice.ts).
// "Etapa 4", "locul 3". Numele ligii stă după două puncte, ca să nu trebuiască
// articulat sau declinat.
import type { Prevod } from '../jedro.ts'

export const lestvice: NonNullable<Prevod['lestvice']> = {
  /** "Etapa 4": butoanele și etichetele etapelor. */
  krog: 'Etapa {n}',
  mesto: 'Locul {mesto}',
  /** "din 5 echipe". */
  odEkip: { one: 'din {n} echipă', few: 'din {n} echipe', other: 'din {n} de echipe' },
  pokaziVec: 'Arată mai multe ({n})',
  mojeMesto: 'Locul meu ↓',

  lestvica: {
    naslov: 'Clasament',
    prazna: 'Clasamentul e încă gol. Fă prima echipă!',
    napakaKrogov:
      'Rezultatele pe etape nu au putut fi încărcate ({napaka}). Clasamentul general de mai jos e totuși corect.',
    tvojRezultatZadnji: 'Rezultatul tău în ultima etapă',
    mojaEkipa: 'Echipa mea',
    zmagovalecKroga: 'Câștigătorul etapei {krog}',
    zmagovalciPoKrogih: 'Câștigătorii pe etape',
    odigraniKrogi: {
      one: '{n} etapă jucată',
      few: '{n} etape jucate',
      other: '{n} de etape jucate',
    },
    pozneje: 'Te-ai alăturat mai târziu? Alege-ți etapa și concurează de acolo.',
    celotnaSezona: 'Tot sezonul',
    odKroga: 'Din etapa {n}',
    igraOd: '· joacă din {datum}',
    zavihekEkipe: 'Echipe',
    zavihekNavijaci: 'Suporterii cluburilor',
  },

  navijaciKlubov: {
    naslov: 'Suporterii cluburilor',
    opis: 'Ce club are cei mai buni manageri? Contează media punctelor suporterilor care au echipă în această ligă.',
    /** "În clasament intră clubul cu cel puțin 3 suporteri." */
    pogoj: {
      one: 'În clasament intră clubul cu cel puțin {n} suporter.',
      few: 'În clasament intră clubul cu cel puțin {n} suporteri.',
      other: 'În clasament intră clubul cu cel puțin {n} de suporteri.',
    },
    povprecjeSezona: 'Ø sezon',
    povprecjeKroga: 'Ø etapa {n}',
    navijaci: 'Suporteri',
    tvojKlub: 'clubul tău',
    stranKluba: 'Pagina clubului →',
    premalo: 'Prea puțini suporteri',
    brezNavijacev: 'Încă fără suporteri: {klubi}',
    prazno: 'În această ligă nimeni nu și-a ales încă clubul. Fii primul!',
    izbira: {
      naslov: 'Cu ce club ții?',
      opis: 'Alege un club și punctele tale vor conta pentru el în clasamentul suporterilor.',
      izberi: 'alege clubul',
      shrani: 'Țin cu acest club',
      spremeni: 'Poți schimba clubul oricând aici, în clasamentul suporterilor.',
      mojKlub: 'Ții cu <b>{klub}</b>.',
      zamenjaj: 'Schimbă clubul',
    },
    klub: {
      naslov: 'Suporterii acestui club',
      mesto: 'Locul {mesto}',
      odKlubov: {
        one: 'din {n} club în clasamentul suporterilor',
        few: 'din {n} cluburi în clasamentul suporterilor',
        other: 'din {n} de cluburi în clasamentul suporterilor',
      },
      manjka: {
        one: 'Pentru un loc în clasamentul suporterilor mai lipsește {n} suporter.',
        few: 'Pentru un loc în clasamentul suporterilor mai lipsesc {n} suporteri.',
        other: 'Pentru un loc în clasamentul suporterilor mai lipsesc {n} de suporteri.',
      },
      brez: 'Acest club nu are încă suporteri cu echipă în ligă.',
      navijam: 'Țin cu {klub}',
      vsiKlubi: 'Toate cluburile ligii',
    },
  },

  slovenija: {
    naslovStrani: 'Clasament național',
    naslov: 'România',
    pripravlja: 'Clasamentul național se pregătește. Încearcă din nou în câteva minute.',
    povzetek: 'Toate echipele din toate ligile la un loc: {ekip} din {lig} și {zvez}.',
    lig: { one: '{n} ligă', few: '{n} ligi', other: '{n} de ligi' },
    zvez: { one: '{n} asociație', few: '{n} asociații', other: '{n} de asociații' },
    skupno: 'Total',
    naKrog: 'Pe etapă',
    povprecjeRazlaga:
      'Ligile nu încep în același timp, așa că o echipă dintr-o ligă care a început mai devreme strânge mai multe puncte doar din cauza asta. Media echilibrează diferența; contează echipele cu cel puțin {krogov}.',
    /** "cu cel puțin 3 etape jucate". */
    zOdigranimiKrogi: {
      one: '{n} etapă jucată',
      few: '{n} etape jucate',
      other: '{n} de etape jucate',
    },
    premaloKrogov: 'Pentru medie, o echipă trebuie să joace cel puțin {krogov}. Încă nicio echipă nu a jucat atâtea.',
    /** "să joace cel puțin 3 etape". */
    krogovTozilnik: { one: '{n} etapă', few: '{n} etape', other: '{n} de etape' },
    nobenaEkipa: 'Nicio echipă nu are încă o etapă jucată.',
    lestvicaLige: 'Clasamentul ligii tale',
    zavihekEkipe: 'Echipe',
    zavihekIgralci: 'Jucători',
    zavihekKlubi: 'Cluburi',
    klubiUvod: 'Echipe de club reale, nu fantasy: punctele strânse de jucători pentru echipă · sezonul {sezona}',
    klubiIgralcev: { one: '{n} jucător', few: '{n} jucători', other: '{n} de jucători' },
    klubiPovprecje:
      'Ligile nu încep în același timp, așa că media pe etapă echilibrează diferența; contează echipele cu cel puțin {krogov}.',
    klubiVec: 'Arată mai multe',
    klubiOpomba:
      'Seniorii și juniorii aceluiași club sunt separați. Punctele sunt fără pase decisive. Un jucător transferat începe de la zero la noul club; punctele strânse înainte rămân vechiului club.',
    vrhNaslov: 'Cine domină România?',
    vrhPoglejVse: 'Vezi top 10 →',
    vrhUvod: 'Top 10 din toate ligile · sezonul {sezona}',
    vrhTocke: 'Cele mai multe puncte',
    vrhGoli: 'Marcatori',
    vrhCisteMreze: 'Meciuri fără gol primit: portari',
    vrhOpomba:
      'Punctele sunt fără pase decisive: pasele decisive le confirmă votul, care în majoritatea ligilor încă nu funcționează, așa că ligile ar fi în poziții inegale. Ligile au jucat un număr diferit de etape.',
    vrhPrazno: 'În sezonul curent nu s-a jucat încă niciun meci.',
  },

  miniLige: {
    naslov: 'Mini-ligi',
    pridruzenDobrodosel: 'Te-ai alăturat. Bine ai venit în ligă.',
    pridruzen: 'Te-ai alăturat.',
    zeOdPrej: 'Această echipă e deja în mini-liga asta.',
    prekratkoIme: 'Numele mini-ligii trebuie să aibă cel puțin 2 caractere.',
    ustvarjena: 'Mini-liga "{ime}" a fost creată. Cod: {koda}',
    najprejEkipa: 'Mai întâi fă-ți o echipă într-una dintre ligi.',
    prijava: 'Pentru mini-ligă trebuie să te <prijava>conectezi</prijava>.',
    opis: 'O competiție privată între cunoscuți. Echipele pot fi din ligi diferite.',
    ustvari: 'Creează',
    imeLige: 'Numele mini-ligii',
    ustvariLigo: 'Creează o mini-ligă',
    novaAliKoda: 'Mini-ligă nouă sau intră cu un cod',
    pridruziSe: 'Intră',
    koda: 'Cod ({n} caractere)',
    nisiVNobeni: 'Nu ești încă în nicio mini-ligă. Cine e manager mai bun: tu sau gașca ta?',
    ustvariLigoIme: 'Creează liga „{ime}”',
    najprejSestavi: 'Mai întâi fă-ți echipa',
    povabilo: 'Invitație: <povezava>{povezava}</povezava><koda>cod {koda}</koda>',
    deliPovabilo: 'Trimite invitația',
    prazna: 'În această mini-ligă nu e încă nicio echipă.',
    // Rezultatul trimiterii invitației (și PovabiSoigralce).
    poslano: 'Invitația a fost trimisă.',
    kopirano: 'Invitația a fost copiată. Lipește-o în grup.',
    neuspelo: 'Trimiterea nu a reușit.',
    neuspeloPovezava: 'Trimiterea nu a reușit. Linkul îl găsești pe pagina Mini-ligi.',
    // lib/miniLige
    vpisiKodo: 'Introdu codul mini-ligii.',
    dolzinaKode: 'Codul are {dolzina} caractere, tu ai introdus {vpisal}.',
    slabiZnaki: 'Codul nu conține caracterele {znaki}. Verifică dacă n-ai încurcat 0 cu O sau 1 cu I.',
    besediloVabila: 'Vino în mini-liga mea "{ime}" pe SLFF și bate-mă: {povezava}',
    naslovVabila: 'Mini-liga {ime} · SLFF',
    privzetoIme: '{ime} și prietenii',
    privzetoImeBrez: 'Mini-liga mea',
  },

  // Trimiterea invitației (DeliMiniLigo): după creare și pe pagina ligii.
  deli: {
    naslovNova: 'Liga e gata. Acum îi trebuie adversari!',
    opisNova:
      'O mini-ligă cu un singur membru e un jurnal, nu o competiție. Trimite linkul în grup: cine dă click intră în ligă în câteva secunde, fără să scrie vreun cod.',
    naslovSam: 'Singur contra ta? Fără adversar nu există victorie.',
    opisSam: 'Trimite linkul coechipierilor, colegilor sau celui care la fiecare meci știe cine ar fi trebuit să joace.',
    naslov: 'Mai invită pe cineva',
    povezava: 'Link de intrare',
    deli: 'Trimite',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    kopiraj: 'Copiază linkul',
    kopirano: 'Linkul a fost copiat. Lipește-l în grup.',
    koda: 'Cod pentru introducere manuală: {koda}',
  },

  // Rezumatul săptămânal al mini-ligii: poveștile etapei încheiate.
  pregled: {
    naslov: 'Rezumatul săptămânii',
    krog: 'Etapa',
    nalaganje: 'Răsfoiesc rapoartele de meci …',
    prazno:
      'După prima etapă, aici vor fi poveștile săptămânii: cine a câștigat, cine și-a lăsat căpitanul pe bancă și cine a luat lingura de lemn.',
    samoEna: 'Când se mai alătură cineva, aici va fi și cine a câștigat (și cine a pierdut).',
    tockeKroga: 'Punctele etapei',
    deliPregled: 'Trimite în grup',
    kopiran: 'Rezumatul a fost copiat. Lipește-l în grup.',
    sporociloNaslov: '📊 {ime} · etapa {krog}',
    manager: 'Managerul etapei',
    managerOpis: '{ekipa} · {tocke}. Dreptul de a se lăuda e valabil până la etapa următoare.',
    kapetan: 'Căpitanul etapei',
    kapetanOpis: '{igralec} a adus cu banderola {tocke} ({ekipa}).',
    adut: 'Atuul ascuns',
    adutOpis: '{igralec} ({tocke}): nu l-a avut nimeni altcineva în echipă în afară de {ekipa}.',
    skok: 'Liftul',
    skokOpis: {
      one: '{ekipa}: urcă {n} loc, acum pe locul {mesto}.',
      few: '{ekipa}: urcă {n} locuri, acum pe locul {mesto}.',
      other: '{ekipa}: urcă {n} de locuri, acum pe locul {mesto}.',
    },
    padec: 'Cădere liberă',
    padecOpis: {
      one: '{ekipa}: coboară {n} loc, acum pe locul {mesto}. Parașuta nu s-a deschis.',
      few: '{ekipa}: coboară {n} locuri, acum pe locul {mesto}. Parașuta nu s-a deschis.',
      other: '{ekipa}: coboară {n} de locuri, acum pe locul {mesto}. Parașuta nu s-a deschis.',
    },
    klop: 'Aur pe bancă',
    klopOpis: '{ekipa} · {tocke} pe bancă. Selecționerule, unde ai fost?',
    zlica: 'Lingura de lemn',
    zlicaOpis: '{ekipa} · {tocke}. Etapa următoare va fi mai bună. Poate.',
  },

  mojeMiniLige: {
    povabilo: 'Un clasament între prieteni e mai distractiv decât unul între străini.',
    ustvari: 'Creează o mini-ligă',
    naslov: 'Mini-ligile mele',
    vse: 'toate →',
    vodi: ' · conduce {ime}',
    sam: '· ești singur, invită pe cineva →',
  },

  povabiSoigralce: {
    naslovLiga: 'Mai invită pe cineva în {ime}',
    naslovNova: 'Gata. Acum invită-ți coechipierii.',
    opisLiga: 'Oricine dă click pe link intră în ligă dintr-un click.',
    opisNova: 'Cine e manager mai bun? Mini-liga e un clasament doar pentru gașca ta.',
    trenutek: 'O clipă …',
    deliPovabilo: 'Trimite invitația',
    ustvariInPovabi: 'Creează o mini-ligă și invită',
    miniLige: 'Mini-ligi',
  },

  vstop: {
    naslovLiga: 'Invitație: {ime}',
    naslov: 'Invitație într-o mini-ligă',
    niLige: 'Mini-liga asta nu există',
    niLigeOpis:
      'Linkul e incomplet sau liga a fost ștearsă. Cere să ți se trimită unul nou sau <ustvari>creează-ți una</ustvari>.',
    ustvaril: 'Creată de {ime}',
    miniLiga: 'Mini-ligă',
    prijaviSe: 'Conectează-te sau creează-ți un cont. După conectare te aducem înapoi aici și te înscriem în ligă, fără să scrii vreun cod.',
    prijavaAliRegistracija: 'Conectare sau înregistrare',
    nalaganjeEkip: 'Se încarcă echipele tale …',
    potrebujesEkipo:
      'Pentru mini-ligă ai nevoie de o echipă. Fă-ți una (durează un minut) și la salvare intri automat în ligă.',
    sestaviEkipo: 'Fă-ți echipa',
    sKateroEkipo: 'Cu ce echipă?',
    vstopam: 'Intru …',
    pridruziSe: 'Intră cu echipa {ime}',
  },

  ekipa: {
    naslov: 'Echipă',
    niEkipe: 'Echipa asta nu există.',
    okvara: 'Echipa de start nu a putut fi încărcată.',
    nazaj: 'Înapoi la clasament',
    skupaj: 'total {tocke} {beseda}',
    brezKrogov:
      'În această ligă nu s-a încheiat încă nicio etapă. Echipele altora apar după termenul limită; până atunci nu le vede nimeni.',
    nalaganjePostave: 'Se încarcă echipa de start …',
    brezPostave: 'Această echipă nu a avut echipă de start în etapa aleasă.',
    vTemKrogu: '{beseda} în această etapă',
    kazen: '(−{kazen} pentru transferuri)',
    namestnik: 'Căpitanul nu a jucat, așa că multiplicatorul l-a preluat vicecăpitanul.',
    klop: 'Bancă',
  },

  klub: {
    naslov: 'Club',
    niKluba: 'Clubul acesta nu există.',
    brezLige: 'Clubul acesta nu joacă anul acesta în nicio ligă pe care o urmărim.',
    naNaslovnico: 'La prima pagină',
    liga: 'Liga',
    podnaslov: '{liga} · {igralci} în joc',
    uvod:
      'Jucătorii de la {klub} fac parte din <b>SLFF</b>, liga fantasy pentru {liga}. Suporterii își fac echipa din jucători reali, iar punctele vin din <b>rapoartele oficiale de meci</b>: goluri, minute, meciuri fără gol primit, cartonașe.',
    toLigo: 'această ligă',
    navijaci: {
      one: 'Jucătorii voștri îi are acum în echipă <b>{navijacev}</b>.',
      few: 'Jucătorii voștri îi au acum în echipă <b>{navijacev}</b>.',
      other: 'Jucătorii voștri îi au acum în echipă <b>{navijacev}</b>.',
    },
    sestaviEkipo: 'Fă-ți echipa',
    lestvica: 'Clasament',
    zaObjavo: 'Imagini de postat',
    napoved: 'Anunț: de postat la lansare',
    nasiIgralci: 'Jucătorii noștri, cu puncte',
    brezStatistike: 'Pentru acest club nu există încă statistici anul acesta.',
    pozicije: {
      GK: 'Portari',
      DEF: 'Fundași',
      MID: 'Mijlocași',
      FWD: 'Atacanți',
    },
    goli: '{n} G · ',
    minute: '{n} min',
    opomba: 'Punctele sunt calculate din rapoartele oficiale de meci. Dacă ceva nu e în regulă, spuneți-ne și corectăm datele.',
  },

  plakat: {
    navijaci: { one: '{n} suporter', few: '{n} suporteri', other: '{n} de suporteri' },
    stavekNavijacev: {
      one: '{navijacev} are deja jucătorii noștri în echipă.',
      few: '{navijacev} au deja jucătorii noștri în echipă.',
      other: '{navijacev} au deja jucătorii noștri în echipă.',
    },
    // Text pe imagine.
    izNasihIgralcev: 'Fă-ți echipa din jucătorii noștri.',
    najvecTock: 'Cele mai multe puncte sezonul acesta',
    pridi: 'VINO',
    sestavit: 'SĂ-ȚI FACI',
    ekipo: 'ECHIPA.',
    jeOdprta: 'Liga fantasy s-a deschis: {liga}. Gratuit.',
    zapisnikiMnz: 'puncte din rapoartele oficiale de meci',
    fantasyLigaZa: 'Liga fantasy:',
    jeLive: 'E LIVE.',
    pravihIgralcev: 'Fă-ți echipa din jucători reali. Puncte din rapoartele oficiale de meci.',
    brezplacno: 'gratuit',
    mestoOd: {
      one: 'Locul {mesto} din {n} echipă',
      few: 'Locul {mesto} din {n} echipe',
      other: 'Locul {mesto} din {n} de echipe',
    },
    mojiNajboljsi: 'Cei mai buni ai mei în etapă',
    premagajMe: 'Fă-ți echipa și bate-mă.',
    // Text la distribuire.
    deliKlub: '{klub} e în liga fantasy SLFF. Fă-ți echipa din jucătorii noștri.',
    deliNapoved:
      'Vino să-ți faci echipa! Liga fantasy s-a deschis: {liga}. Gratuit, cu jucătorii reali de la {klub}.',
    deliLive: 'Liga fantasy e live: {liga}. Fă-ți echipa din jucători reali, gratuit.',
    deliKrog: '{ekipa}: {tocke} {beseda} în etapa {krog}. Fă-ți echipa și bate-mă.',
  },

  // Rezumatul săptămânal al echipei: imagine verticală pentru story (Echipa mea, echipa altcuiva).
  zgodba: {
    naslov: 'Rezumatul săptămânii: etapa {krog}',
    opis: 'O imagine pentru story pe Instagram sau WhatsApp: puncte, locul în ligă, căpitanul și cel mai bun jucător al etapei.',
    deli: 'Trimite rezumatul săptămânii',
    prenesi: 'Descarcă rezumatul săptămânii',
    // Text pe imagine.
    nadnaslov: 'REZUMATUL SĂPTĂMÂNII · ETAPA {krog}',
    vKrogu: 'în etapa {krog}',
    gor: '▲ {n}',
    dol: '▼ {n}',
    enako: '=',
    kapetan: 'CĂPITAN',
    namestnik: 'VICECĂPITAN',
    kapetanInNajboljsi: '{trak} · CEL MAI BUN DIN ECHIPĂ',
    najboljsi: 'CEL MAI BUN DIN ECHIPĂ',
    // Text la distribuire.
    deliBesedilo: '{ekipa}: {tocke} {beseda} în etapa {krog}. Fă-ți echipa și bate-mă.',
    deliBesediloMesto: '{ekipa}: {tocke} {beseda} în etapa {krog}, locul {mesto} în ligă. Fă-ți echipa și bate-mă.',
  },

  deliSliko: {
    naslov: '{naslov} · SLFF',
    kopirana: 'Linkul a fost copiat.',
    niPripravljena: 'Imaginea nu a putut fi pregătită.',
    seEnkrat: 'Mai apasă o dată ca să deschizi meniul de distribuire.',
    niIzrisa: 'imaginea nu a putut fi desenată',
    shranjena: 'Imaginea a fost salvată. Posteaz-o pe Instagram, Facebook sau WhatsApp.',
    napaka: 'Imaginea nu a putut fi pregătită: {napaka}',
    pripravljam: 'Pregătesc …',
    deliSliko: 'Trimite imaginea',
    prenesi: 'Descarcă imaginea de postat',
    deliPovezavo: 'Trimite linkul',
    shrani: 'Salvează imaginea',
    namig: 'WhatsApp, Instagram, Facebook …: alege din meniul care se deschide.',
  },
}
