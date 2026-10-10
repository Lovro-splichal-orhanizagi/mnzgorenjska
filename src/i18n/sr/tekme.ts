// Srpski prevod: `tekme` (izvor: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. kolo',
  moraPrijava: 'Za glasanje moraš da se <prijava>prijaviš</prijava>.',

  // Stavke raščlambe bodova i pravila (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Odigrao 60 minuta ili više',
      nastopDo60: 'Nastup do 60 minuta',
      gol: 'Gol',
      goli: 'Golovi ({n})',
      asistenca: 'Asistencija',
      asistence: 'Asistencije ({n})',
      brezPrejetega: 'Bez primljenog gola',
      zmaga: 'Pobeda tima',
      prejetiGoli: 'Primljeni golovi ({n})',
      obranjena: 'Odbranjen penal ({n})',
      zgresena: 'Promašen penal ({n})',
      avtogol: 'Autogol ({n})',
      rumeni: 'Žuti karton ({n})',
      rdeci: 'Crveni karton',
    },
    pravila: {
      igralniCas: 'Minutaža',
      nastopDo60: 'Nastup do 60 minuta',
      nastopOd60: 'Odigrao 60 minuta ili više',
      goliInAsistence: 'Golovi i asistencije',
      golVratarja: 'Gol golmana',
      golBranilca: 'Gol odbrambenog igrača',
      golVezista: 'Gol veznog',
      golNapadalca: 'Gol napadača',
      asistenca: 'Asistencija',
      obramba: 'Odbrana',
      csVratar: 'Bez primljenog gola: golman',
      csBranilec: 'Bez primljenog gola: odbrambeni',
      csVezist: 'Bez primljenog gola: vezni',
      zmaga: 'Pobeda tima: golman, odbrambeni',
      prejeta2: 'Svaka 2 primljena gola: golman, odbrambeni',
      // Ispod tabele pravila na naslovnoj strani.
      opomba:
        'Odbrana se računa uz najmanje 60 minuta, a primljeni golovi samo oni koji padnu dok je igrač na terenu.',
      obranjena:
        'Odbranjen penal: golman (zapisnik ga vodi kao promašen penal protivnika)',
      kazni: 'Kazne',
      zgresena: 'Promašen penal',
      avtogol: 'Autogol',
      rumeni: 'Žuti karton',
      rdeci: 'Crveni karton',
    },
  },

  rezultati: {
    naslov: 'Rezultati',
    uvod:
      'Odigrane utakmice iz zvaničnih zapisnika ({zveza}). Klikni na utakmicu i videćeš obe postave na terenu, a na svakom dresu bodove koje je igrač osvojio.',
    niZacetka: 'Sezona još nije počela.',
    prazenKrog: 'U ovom kolu nema odigranih utakmica.',
    prejsnji: 'Prethodno kolo',
    naslednji: 'Sledeće kolo',
  },

  // Stran Lestvica lige (/table): prava lestvica iz izidov in strelci.
  tabela: {
    naslov: 'Tabela',
    zavihek: '{liga} · tabela',
    uvod: 'Tabela sezone {sezona}, izračunata iz rezultata utakmica u zapisnicima ({zveza}).',
    opomba: 'Približno: pobeda 3 boda, nerešeno 1; pri istom broju bodova odlučuje gol razlika, zatim postignuti golovi. Savezi mogu imati drugačija pravila (međusobni dueli, oduzeti bodovi), zvanična tabela je kod saveza ({zveza}).',
    niTekem: 'Ova liga još nema odigranih utakmica.',
    stolpci: {
      klub: 'Klub',
      tekme: 'Ut',
      zmage: 'P',
      remiji: 'N',
      porazi: 'I',
      goli: 'Gol',
      razlika: 'GR',
      tocke: 'Bod',
      forma: 'Forma',
    },
    stolpciOpis: {
      tekme: 'Odigrane utakmice',
      zmage: 'Pobede',
      remiji: 'Nerešeno',
      porazi: 'Porazi',
      goli: 'Postignuti : primljeni golovi',
      razlika: 'Gol razlika',
      tocke: 'Bodovi',
    },
    forma: { W: 'P', D: 'N', L: 'I' },
    formaOpis: { W: 'pobeda', D: 'nerešeno', L: 'poraz' },
    strelci: 'Strelci',
    niStrelcev: 'U ovoj sezoni još nema strelaca.',
    stolpciStrelcev: {
      igralec: 'Igrač',
      klub: 'Klub',
      goli: 'Golovi',
      tekme: 'Utakmice',
      minute: 'Min',
    },
  },

  tekma: {
    naslov: 'Utakmica',
    niTekme: 'Ove utakmice nema u zapisnicima.',
    nazaj: '← Rezultati',
    brezPostav:
      'Zapisnik ove utakmice ne navodi postave, pa bodove po igračima nije moguće prikazati.',
    naDresu:
      'Na dresu piše koliko je bodova igrač osvojio na ovoj utakmici. Klik na igrača otvara njegovu stranicu.',
    cakajo: {
      one: '{n} gol na ovoj utakmici čeka asistenciju. Dok je nema, asistent ostaje bez +3 boda. Reci ispod ko je asistirao.',
      few: '{n} gola na ovoj utakmici čekaju asistenciju. Dok je nema, asistent ostaje bez +3 boda. Reci ispod ko je asistirao.',
      other: '{n} golova na ovoj utakmici čeka asistenciju. Dok je nema, asistent ostaje bez +3 boda. Reci ispod ko je asistirao.',
    },
    goliInAsistence: 'Golovi i asistencije',
    prijaviSe: 'Prijavi se za glasanje',
  },

  // Stranica Asistencije (glasanje o asistencijama).
  glasovanje: {
    naslov: 'Asistencije',
    kdoJePodal: 'Ko je asistirao?',
    uvod:
      'Zvanični zapisnici ({zveza}) beleže strelce, ali ne i asistencije. Određuje ih zajednica: kad isti igrač kod gola skupi <b>{glasov}</b>, asistencija mu se priznaje i donosi <b>+3 boda</b>.',
    // Akuzativ: "skupi 3 glasa".
    pragGlasov: { one: '{n} glas', few: '{n} glasa', other: '{n} glasova' },
    niTekem: 'U tekućoj sezoni još nema odigranih utakmica',
    niTekemOpis:
      'Glasanje o asistencijama otvara se čim se odigra prvo kolo. Vrati se kad stignu zapisnici.',
    arhiv: 'arhiva',
    preteklaSezona:
      'Glasaš o prošloj sezoni. To ne utiče na bodove tekuće lige, ispravlja samo istoriju.',
    izberiKrog: '1. Izaberi kolo',
    izberiTekmo: '2. Izaberi utakmicu',
    vsePotrjeno: 'Sve potvrđeno',
    zaprto: 'zatvoreno',
    poglejTekmo: 'Pogledaj postave i bodove ove utakmice →',
    niGolov: 'Na ovoj utakmici nije bilo golova.',
    vsePotrjene: 'Sve asistencije na ovoj utakmici su potvrđene. 🎉',
    zaprtoOpis: 'Glasanje o ovoj utakmici je zatvoreno. Otvoreno je do roka sledećeg kola.',
    brezPotrjene: 'Bez potvrđene asistencije: {goli}.',
  },

  // Kartica gola sa glasanjem (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'nepoznat strelac',
    avtogol: 'Autogol: {ime}',
    enajstmetrovka: '{ime}, penal',
    brezAsistenceOpomba: 'bez asistencije',
    potrjena: 'asistencija potvrđena, zaključano',
    brezAsistence: 'Bez asistencije',
    odlocilaSkupnost: 'tako je odlučila zajednica',
    morasSePrijaviti: 'Za glasanje moraš da se prijaviš',
    spremeniGlas: 'Promeni glas',
    kdoJePodal: 'Ko je asistirao?',
    vodiBrez: 'Vodi „bez asistencije“',
    vodi: 'Vodi <b>{ime}</b>',
    igralecBrezZapisa: 'igrač bez zapisa',
    doOdlocitve: 'još {n} do odluke',
    ostali: 'Ostali:',
    brezGlasovi: 'bez ({n})',
    izberiPodajalca: 'Izaberi asistenta: {ekipa}',
    nihce: 'Niko, gol bez asistencije',
  },

  // Stranica Pozicije (glasanje o pozicijama).
  pozicije: {
    naslov: 'Pozicije',
    kjeKdoIgra: 'Ko gde igra?',
    uvod:
      'Zapisnici označavaju samo golmana, a postave navode po brojevima dresova, pa se pozicije ne mogu pročitati. Određuje ih zajednica. Potrebno glasova: <b>{prag}</b>. Broj se smanjuje (do {minPrag}) ako statistička procena (broj dresa, golovi, kartoni) snažno upućuje u tom pravcu. Glasovi <b>poznavalaca kluba</b> i korisnika sa <b>visokom tačnošću</b> vrede više.',
    enkratNaTeden:
      'Izglasane pozicije primenjuju se <b>jednom nedeljno, u ponedeljak ujutru</b>, sve odjednom. Tako se liga tokom nedelje ne menja pod prstima: šta vidiš u utorak, važi i u subotu, kad se kolo zaključa. Igrač koji je već skupio dovoljno glasova do tada je označen peščanim satom <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ poznavalac',
    samoIzStatistike: 'Samo iz statistike ({n})',
    vsiPotrjeni: 'Svi igrači ovog kluba imaju potvrđenu poziciju. 🎉',
    niIgralcev: 'Nema igrača.',
    status: {
      naslov: 'Moj status glasača',
      utezOpis:
        'Težina pojedinačnog glasa. Sabira se sa bonusom poznavaoca ako glasaš za igrača svog kluba.',
      utez: 'težina {utez}×',
      tocnih: '({pravilni}/{vsi} tačnih)',
      klubPoznam: 'Klub koji dobro poznajem (poznavalac), moj glas za igrače tog kluba vredi više:',
      nisemPoznavalec: 'nisam poznavalac nijednog kluba',
      opomba:
        'Poznavalac označava samo jedan klub. Težine se s vremenom smiruju: ako se tvoji glasovi pokažu pogrešnim, poverenje se smanjuje. Poverenje se preračunava iz prošlih glasova kad je pozicija poznata.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} bez primljenog',
      izZapisnika: 'Iz zapisnika: golman je označen',
      izStatistike: 'Iz statistike (br. dresa, golovi, kartoni), glasovi je mogu ispraviti',
      potrdilaSkupnost: 'Potvrdila zajednica',
      zapisnik: ' · zapisnik',
      uveljavitevOpis:
        'Pozicije se primenjuju jednom nedeljno, u ponedeljak ujutru, da se liga tokom nedelje ne menja pod prstima.',
      izglasovano: 'izglasano: {pozicija} · u ponedeljak',
      neIgraOpis: 'Više ne igra, nije na tržištu. Ako se pojavi u zapisniku, vraća se sam.',
      neIgra: 'više ne igra',
      vrniOpis: 'Vrati igrača među aktivne',
      vrni: 'vrati',
      odhodOpis:
        'Igrač više ne igra za ovaj klub, pa ga uklanja sa tržišta. Nastup u zapisniku ga vraća sam.',
      statistikaKaze:
        'Statistika upućuje na <b>{pozicija} ({odstotek}%)</b>. Glas u tom pravcu računa se uz niži prag ({nizji} umesto {prag}).',
      dolocenaIzStatistike: 'Pozicija je određena iz statistike. Ako nije prava, klikni pravu.',
      dolocilaSkupnost: 'Poziciju je odredila zajednica, glasovima se može ispraviti.',
      gumbUtez: 'Težina {utez} / prag {prag}',
      gumbPrior: ' · procena {odstotek}%',
      gumbPoznavalec: ' · tvoj glas kao poznavaoca vredi više',
      vodi: 'Vodi {pozicija}: težina {utez} / {prag}',
    },
  },
}
