// Hrvatski prijevod područja `tekme` (izvor: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. kolo',
  moraPrijava: 'Za glasovanje se moraš <prijava>prijaviti</prijava>.',

  // Stavke raščlambe bodova i pravila (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Odigrano 60 minuta ili više',
      nastopDo60: 'Nastup do 60 minuta',
      gol: 'Gol',
      goli: 'Golovi ({n})',
      asistenca: 'Asistencija',
      asistence: 'Asistencije ({n})',
      brezPrejetega: 'Bez primljenog gola',
      zmaga: 'Pobjeda momčadi',
      prejetiGoli: 'Primljeni golovi ({n})',
      obranjena: 'Obranjeni jedanaesterac ({n})',
      zgresena: 'Promašeni jedanaesterac ({n})',
      avtogol: 'Autogol ({n})',
      rumeni: 'Žuti karton ({n})',
      rdeci: 'Crveni karton',
    },
    pravila: {
      igralniCas: 'Minutaža',
      nastopDo60: 'Nastup do 60 minuta',
      nastopOd60: 'Odigrano 60 minuta ili više',
      goliInAsistence: 'Golovi i asistencije',
      golVratarja: 'Gol vratara',
      golBranilca: 'Gol braniča',
      golVezista: 'Gol veznog',
      golNapadalca: 'Gol napadača',
      asistenca: 'Asistencija',
      obramba: 'Obrana',
      csVratar: 'Bez primljenog gola — vratar',
      csBranilec: 'Bez primljenog gola — branič',
      csVezist: 'Bez primljenog gola — vezni',
      zmaga: 'Pobjeda momčadi — vratar, branič',
      prejeta2: 'Svaka 2 primljena gola — vratar, branič',
      // Ispod tablice pravila na naslovnici.
      opomba:
        'Obrana se računa uz najmanje 60 minuta, a primljeni golovi samo oni koji padnu dok je igrač na terenu.',
      obranjena:
        'Obranjeni jedanaesterac — vratar (zapisnik ga vodi kao promašeni jedanaesterac protivnika)',
      kazni: 'Kazne',
      zgresena: 'Promašeni jedanaesterac',
      avtogol: 'Autogol',
      rumeni: 'Žuti karton',
      rdeci: 'Crveni karton',
    },
  },

  rezultati: {
    naslov: 'Rezultati',
    uvod:
      'Odigrane utakmice iz službenih zapisnika ({zveza}). Klikni na utakmicu i vidjet ćeš obje postave na terenu — na svakom dresu bodove koje je igrač zaradio.',
    niZacetka: 'Sezona još nije počela.',
    prazenKrog: 'U ovom kolu nema odigranih utakmica.',
    prejsnji: 'Prethodno kolo',
    naslednji: 'Sljedeće kolo',
  },

  tekma: {
    naslov: 'Utakmica',
    niTekme: 'Ove utakmice nema u zapisnicima.',
    nazaj: '← Rezultati',
    brezPostav:
      'Zapisnik ove utakmice ne navodi postave pa bodove po igračima nije moguće prikazati.',
    naDresu:
      'Na dresu piše koliko je bodova igrač zaradio na ovoj utakmici. Klik na igrača otvara njegovu stranicu.',
    cakajo: {
      one: '{n} gol na ovoj utakmici čeka asistenciju — dok je nema, asistent ostaje bez +3 boda. Reci ispod tko je asistirao.',
      few: '{n} gola na ovoj utakmici čekaju asistenciju — dok je nema, asistent ostaje bez +3 boda. Reci ispod tko je asistirao.',
      other: '{n} golova na ovoj utakmici čeka asistenciju — dok je nema, asistent ostaje bez +3 boda. Reci ispod tko je asistirao.',
    },
    goliInAsistence: 'Golovi i asistencije',
    prijaviSe: 'Prijavi se za glasovanje',
  },

  // Stranica Asistencije (glasovanje o asistencijama).
  glasovanje: {
    naslov: 'Asistencije',
    kdoJePodal: 'Tko je asistirao?',
    uvod:
      'Službeni zapisnici ({zveza}) bilježe strijelce, ali ne i asistencije. Određuje ih zajednica: kad isti igrač kod gola skupi <b>{glasov}</b>, asistencija mu se priznaje i donosi <b>+3 boda</b>.',
    // Akuzativ: "skupi 3 glasa".
    pragGlasov: { one: '{n} glas', few: '{n} glasa', other: '{n} glasova' },
    niTekem: 'U trenutnoj sezoni još nema odigranih utakmica',
    niTekemOpis:
      'Glasovanje o asistencijama otvara se čim prvo kolo bude odigrano. Vrati se kad stignu zapisnici.',
    arhiv: 'arhiva',
    preteklaSezona:
      'Glasaš o prošloj sezoni. To ne utječe na bodove tekuće lige — ispravlja samo povijest.',
    izberiKrog: '1. Odaberi kolo',
    izberiTekmo: '2. Odaberi utakmicu',
    vsePotrjeno: 'Sve potvrđeno',
    zaprto: 'zatvoreno',
    poglejTekmo: 'Pogledaj postave i bodove ove utakmice →',
    niGolov: 'Na ovoj utakmici nije bilo golova.',
    vsePotrjene: 'Sve asistencije na ovoj utakmici su potvrđene. 🎉',
    zaprtoOpis: 'Glasovanje o ovoj utakmici je zatvoreno — otvoreno je do roka sljedećeg kola.',
    brezPotrjene: 'Bez potvrđene asistencije: {goli}.',
  },

  // Kartica gola s glasovanjem (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'nepoznat strijelac',
    avtogol: 'Autogol — {ime}',
    enajstmetrovka: '{ime} — jedanaesterac',
    brezAsistenceOpomba: 'bez asistencije',
    potrjena: 'asistencija potvrđena — zaključano',
    brezAsistence: 'Bez asistencije',
    odlocilaSkupnost: 'tako je odlučila zajednica',
    morasSePrijaviti: 'Za glasovanje se moraš prijaviti',
    spremeniGlas: 'Promijeni glas',
    kdoJePodal: 'Tko je asistirao?',
    vodiBrez: 'Vodi „bez asistencije“',
    vodi: 'Vodi <b>{ime}</b>',
    igralecBrezZapisa: 'igrač bez zapisa',
    doOdlocitve: '— još {n} do odluke',
    ostali: 'Ostali:',
    brezGlasovi: 'bez ({n})',
    izberiPodajalca: 'Odaberi asistenta — {ekipa}',
    nihce: 'Nitko — gol bez asistencije',
  },

  // Stranica Pozicije (glasovanje o pozicijama).
  pozicije: {
    naslov: 'Pozicije',
    kjeKdoIgra: 'Tko gdje igra?',
    uvod:
      'Zapisnici označavaju samo vratara, a postave navode po brojevima dresova — pozicije se dakle ne mogu iščitati. Određuje ih zajednica. Potrebno glasova: <b>{prag}</b> — broj se smanjuje (do {minPrag}) ako statistička procjena (broj dresa, golovi, kartoni) snažno upućuje u tom smjeru. Glasovi <b>poznavatelja kluba</b> i korisnika s <b>visokom točnošću</b> vrijede više.',
    enkratNaTeden:
      'Izglasane pozicije primjenjuju se <b>jednom tjedno, u ponedjeljak ujutro</b>, sve odjednom. Tako se liga tijekom tjedna ne mijenja pod prstima: što vidiš u utorak, vrijedi i u subotu, kad se kolo zaključa. Igrač koji je već skupio dovoljno glasova do tada je označen pješčanim satom <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ poznavatelj',
    samoIzStatistike: 'Samo iz statistike ({n})',
    vsiPotrjeni: 'Svi igrači ovog kluba imaju potvrđenu poziciju. 🎉',
    niIgralcev: 'Nema igrača.',
    status: {
      naslov: 'Moj status glasača',
      utezOpis:
        'Težina pojedinog glasa — zbraja se s bonusom poznavatelja ako glasaš za igrača svog kluba.',
      utez: 'težina {utez}×',
      tocnih: '({pravilni}/{vsi} točnih)',
      klubPoznam: 'Klub koji dobro poznajem (poznavatelj) — moj glas za igrače tog kluba vrijedi više:',
      nisemPoznavalec: '— nisam poznavatelj nijednog kluba —',
      opomba:
        'Poznavatelj označava samo jedan klub. Težine se s vremenom smiruju — ako se tvoji glasovi pokažu pogrešnima, povjerenje se smanjuje. Povjerenje se preračunava iz prošlih glasova kad je pozicija poznata.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} bez primljenog',
      izZapisnika: 'Iz zapisnika — vratar je označen',
      izStatistike: 'Iz statistike (br. dresa, golovi, kartoni) — glasovi je mogu ispraviti',
      potrdilaSkupnost: 'Potvrdila zajednica',
      zapisnik: ' · zapisnik',
      uveljavitevOpis:
        'Pozicije se primjenjuju jednom tjedno, u ponedjeljak ujutro — tako se liga tijekom tjedna ne mijenja pod prstima.',
      izglasovano: 'izglasano: {pozicija} · u ponedjeljak',
      neIgraOpis: 'Više ne igra — nije na tržištu. Ako se pojavi u zapisniku, vraća se sam.',
      neIgra: 'više ne igra',
      vrniOpis: 'Vrati igrača među aktivne',
      vrni: 'vrati',
      odhodOpis:
        'Igrač više ne igra za ovaj klub — uklanja ga s tržišta. Nastup u zapisniku ga vraća sam.',
      statistikaKaze:
        'Statistika upućuje na <b>{pozicija} ({odstotek}%)</b> — glas u tom smjeru računa se uz niži prag ({nizji} umjesto {prag}).',
      dolocenaIzStatistike: 'Pozicija je određena iz statistike — ako nije prava, klikni pravu.',
      dolocilaSkupnost: 'Poziciju je odredila zajednica — glasovima se može ispraviti.',
      gumbUtez: 'Težina {utez} / prag {prag}',
      gumbPrior: ' · procjena {odstotek}%',
      gumbPoznavalec: ' · tvoj glas kao poznavatelja vrijedi više',
      vodi: 'Vodi {pozicija} — težina {utez} / {prag}',
    },
  },
}
