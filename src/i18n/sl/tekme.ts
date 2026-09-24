// Nizi za področje `tekme` (glej src/i18n/index.tsx).
export const tekme = {
  krog: '{n}. krog',
  moraPrijava: 'Za glasovanje se moraš <prijava>prijaviti</prijava>.',

  // Postavke razčlenitve točk in pravila (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Odigranih 60 minut ali več',
      nastopDo60: 'Nastop do 60 minut',
      gol: 'Gol',
      goli: 'Goli ({n})',
      asistenca: 'Asistenca',
      asistence: 'Asistence ({n})',
      brezPrejetega: 'Brez prejetega gola',
      prejetiGoli: 'Prejeti goli ({n})',
      obranjena: 'Obranjena enajstmetrovka ({n})',
      zgresena: 'Zgrešena enajstmetrovka ({n})',
      avtogol: 'Avtogol ({n})',
      rumeni: 'Rumeni karton ({n})',
      rdeci: 'Rdeči karton',
    },
    pravila: {
      igralniCas: 'Igralni čas',
      nastopDo60: 'Nastop do 60 minut',
      nastopOd60: 'Odigranih 60 minut ali več',
      goliInAsistence: 'Goli in asistence',
      golVratarja: 'Gol vratarja',
      golBranilca: 'Gol branilca',
      golVezista: 'Gol vezista',
      golNapadalca: 'Gol napadalca',
      asistenca: 'Asistenca',
      obramba: 'Obramba',
      csVratarBranilec: 'Brez prejetega gola — vratar, branilec',
      csVezist: 'Brez prejetega gola — vezist',
      prejeta2: 'Vsaka 2 prejeta gola — vratar, branilec',
      obranjena:
        'Obranjena enajstmetrovka — vratar (zapisnik jo vodi kot zgrešeno enajstmetrovko nasprotnika)',
      kazni: 'Kazni',
      zgresena: 'Zgrešena enajstmetrovka',
      avtogol: 'Avtogol',
      rumeni: 'Rumeni karton',
      rdeci: 'Rdeči karton',
    },
  },

  rezultati: {
    naslov: 'Rezultati',
    uvod:
      'Odigrane tekme iz zapisnikov {zveza}. Klikni na tekmo in vidiš obe postavi na igrišču — na vsakem dresu točke, ki jih je igralec zaslužil.',
    niZacetka: 'Sezona se še ni začela.',
    prazenKrog: 'V tem krogu ni odigranih tekem.',
  },

  tekma: {
    naslov: 'Tekma',
    niTekme: 'Te tekme ni v zapisnikih.',
    nazaj: '← Rezultati',
    brezPostav:
      'Zapisnik te tekme ne navaja postav, zato točk po igralcih ni mogoče prikazati.',
    naDresu:
      'Na dresu piše, koliko točk je igralec zaslužil na tej tekmi. Klik na igralca odpre njegovo stran.',
    cakajo: {
      one: '{n} gol na tej tekmi čaka na asistenco — dokler je ni, podajalec ostane brez +3 točk. Povej spodaj, kdo je podal.',
      two: '{n} gola na tej tekmi čakata na asistenco — dokler je ni, podajalec ostane brez +3 točk. Povej spodaj, kdo je podal.',
      few: '{n} goli na tej tekmi čakajo na asistenco — dokler je ni, podajalec ostane brez +3 točk. Povej spodaj, kdo je podal.',
      other: '{n} golov na tej tekmi čaka na asistenco — dokler je ni, podajalec ostane brez +3 točk. Povej spodaj, kdo je podal.',
    },
    goliInAsistence: 'Goli in asistence',
    prijaviSe: 'Prijavi se za glasovanje',
  },

  // Stran Asistence (glasovanje o asistencah).
  glasovanje: {
    naslov: 'Asistence',
    kdoJePodal: 'Kdo je podal?',
    uvod:
      'Zapisniki {zveza} beležijo strelce, asistenc pa ne. Določi jih skupnost: ko isti igralec pri golu zbere <b>{glasov}</b>, se mu asistenca prizna in prinese <b>+3 točke</b>.',
    // Tožilnik: "zbere 3 glasove".
    pragGlasov: { one: '{n} glas', two: '{n} glasova', few: '{n} glasove', other: '{n} glasov' },
    niTekem: 'V trenutni sezoni še ni odigranih tekem',
    niTekemOpis:
      'Glasovanje o asistencah se odpre takoj, ko bo prvi krog odigran. Vrni se, ko bodo zapisniki prispeli.',
    arhiv: 'arhiv',
    preteklaSezona:
      'Glasuješ o pretekli sezoni. Na točke tekoče lige to ne vpliva — popravi le zgodovino.',
    izberiKrog: '1. Izberi krog',
    izberiTekmo: '2. Izberi tekmo',
    vsePotrjeno: 'Vse potrjeno',
    zaprto: 'zaprto',
    poglejTekmo: 'Poglej postavi in točke te tekme →',
    niGolov: 'Na tej tekmi ni bilo golov.',
    vsePotrjene: 'Vse asistence na tej tekmi so potrjene. 🎉',
    zaprtoOpis: 'Glasovanje o tej tekmi je zaprto — odprto je do roka naslednjega kroga.',
    brezPotrjene: 'Brez potrjene asistence: {goli}.',
  },

  // Kartica gola z glasovanjem (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'neznan strelec',
    avtogol: 'Avtogol — {ime}',
    enajstmetrovka: '{ime} — enajstmetrovka',
    brezAsistenceOpomba: 'brez asistence',
    potrjena: 'asistenca potrjena — zaklenjeno',
    brezAsistence: 'Brez asistence',
    odlocilaSkupnost: 'tako je odločila skupnost',
    morasSePrijaviti: 'Za glasovanje se moraš prijaviti',
    spremeniGlas: 'Spremeni glas',
    kdoJePodal: 'Kdo je podal?',
    vodiBrez: 'Vodi »brez asistence«',
    vodi: 'Vodi <b>{ime}</b>',
    igralecBrezZapisa: 'igralec brez zapisa',
    doOdlocitve: '— še {n} do odločitve',
    ostali: 'Ostali:',
    brezGlasovi: 'brez ({n})',
    izberiPodajalca: 'Izberi podajalca — {ekipa}',
    nihce: 'Nihče — gol brez asistence',
  },

  // Stran Pozicije (glasovanje o pozicijah).
  pozicije: {
    naslov: 'Pozicije',
    kjeKdoIgra: 'Kje kdo igra?',
    uvod:
      'Zapisniki označijo le vratarja, postave pa naštejejo po številkah dresov — pozicij torej ni mogoče razbrati. Določi jih skupnost. Potrebnih glasov: <b>{prag}</b> — število se zniža (do {minPrag}), če je statistični prior (številka dresa, goli, kartoni) močan v tisto smer. Glasovi <b>poznavalcev kluba</b> in uporabnikov z <b>visoko točnostjo</b> štejejo več.',
    enkratNaTeden:
      'Izglasovane pozicije se uveljavijo <b>enkrat na teden, v ponedeljek zjutraj</b>, vse naenkrat. Tako se liga med tednom ne spreminja pod prsti: kar vidiš v torek, velja tudi v soboto, ko se zaklene krog. Igralec, ki je že zbral dovolj glasov, je do takrat označen s peščeno uro <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ poznavalec',
    samoIzStatistike: 'Samo iz statistike ({n})',
    vsiPotrjeni: 'Vsi igralci tega kluba imajo potrjeno pozicijo. 🎉',
    niIgralcev: 'Ni igralcev.',
    status: {
      naslov: 'Moj status glasovalca',
      utezOpis:
        'Utež posameznega glasu — sešteje se z insider bonusom, če glasuješ za igralca svojega kluba.',
      utez: 'utež {utez}×',
      tocnih: '({pravilni}/{vsi} točnih)',
      klubPoznam: 'Klub, ki ga dobro poznam (poznavalec) — moj glas za igralce tega kluba šteje več:',
      nisemPoznavalec: '— nisem poznavalec nobenega kluba —',
      opomba:
        'Poznavalec označi le en klub. Uteži se s časom umirijo — če se tvoji glasovi kažejo za napačne, se zaupanje niža. Zaupanje se preračuna iz preteklih glasov, ko je pozicija znana.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} brez prejetega',
      izZapisnika: 'Iz zapisnika — vratar je označen z (V)',
      izStatistike: 'Iz statistike (št. dresa, goli, kartoni) — glasovi jo lahko popravijo',
      potrdilaSkupnost: 'Potrdila skupnost',
      zapisnik: ' · zapisnik',
      uveljavitevOpis:
        'Pozicije se uveljavijo enkrat na teden, v ponedeljek zjutraj — tako se liga med tednom ne spreminja pod prsti.',
      izglasovano: 'izglasovano: {pozicija} · v ponedeljek',
      neIgraOpis: 'Ne igra več — ni na trgu. Če se pojavi v zapisniku, se vrne sam.',
      neIgra: 'ne igra več',
      vrniOpis: 'Vrni igralca med aktivne',
      vrni: 'vrni',
      odhodOpis:
        'Igralec pri tem klubu ne igra več — umakne ga s trga. Nastop v zapisniku ga vrne sam.',
      statistikaKaze:
        'Statistika kaže na <b>{pozicija} ({odstotek}%)</b> — glas v tej smeri se šteje z nižjim pragom ({nizji} namesto {prag}).',
      dolocenaIzStatistike: 'Pozicija je določena iz statistike — če ni prava, klikni pravo.',
      dolocilaSkupnost: 'Pozicijo je določila skupnost — z glasovi jo je mogoče popraviti.',
      gumbUtez: 'Utež {utez} / prag {prag}',
      gumbPrior: ' · prior {odstotek}%',
      gumbPoznavalec: ' · tvoj glas kot poznavalec šteje več',
      vodi: 'Vodi {pozicija} — utež {utez} / {prag}',
    },
  },
}
