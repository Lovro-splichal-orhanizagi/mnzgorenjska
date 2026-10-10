// Eestikeelne `tekme` (allikas: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  krog: '{n}. voor',
  moraPrijava: 'Hääletamiseks pead <prijava>sisse logima</prijava>.',

  // Punktide jaotuse read ja reeglid (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: 'Mängis 60 minutit või rohkem',
      nastopDo60: 'Mängis kuni 60 minutit',
      gol: 'Värav',
      goli: 'Väravad ({n})',
      asistenca: 'Resultatiivne sööt',
      asistence: 'Resultatiivsed söödud ({n})',
      brezPrejetega: 'Nullimäng',
      zmaga: 'Meeskonna võit',
      prejetiGoli: 'Lastud väravad ({n})',
      obranjena: 'Tõrjutud penalti ({n})',
      zgresena: 'Ebaõnnestunud penalti ({n})',
      avtogol: 'Omavärav ({n})',
      rumeni: 'Kollane kaart ({n})',
      rdeci: 'Punane kaart',
    },
    pravila: {
      igralniCas: 'Mänguaeg',
      nastopDo60: 'Mängis kuni 60 minutit',
      nastopOd60: 'Mängis 60 minutit või rohkem',
      goliInAsistence: 'Väravad ja resultatiivsed söödud',
      golVratarja: 'Väravavahi värav',
      golBranilca: 'Kaitsja värav',
      golVezista: 'Poolkaitsja värav',
      golNapadalca: 'Ründaja värav',
      asistenca: 'Resultatiivne sööt',
      obramba: 'Kaitsmine',
      csVratar: 'Nullimäng: väravavaht',
      csBranilec: 'Nullimäng: kaitsja',
      csVezist: 'Nullimäng: poolkaitsja',
      zmaga: 'Meeskonna võit: väravavaht, kaitsja',
      prejeta2: 'Iga 2 lastud väravat: väravavaht, kaitsja',
      // Avalehe reeglitabeli all.
      opomba:
        'Nullimäng loeb vähemalt 60 mängitud minutiga; arvesse lähevad ainult väravad, mis lasti sisse siis, kui mängija oli väljakul.',
      obranjena:
        'Tõrjutud penalti: väravavaht (mänguprotokoll märgib selle vastase ebaõnnestunud penaltina)',
      kazni: 'Mahaarvamised',
      zgresena: 'Ebaõnnestunud penalti',
      avtogol: 'Omavärav',
      rumeni: 'Kollane kaart',
      rdeci: 'Punane kaart',
    },
  },

  rezultati: {
    naslov: 'Tulemused',
    uvod:
      'Mängitud mängud ametlikest mänguprotokollidest ({zveza}). Klõpsa mängul, et näha mõlemat koosseisu väljakul: iga särk näitab, mitu punkti mängija teenis.',
    niZacetka: 'Hooaeg pole veel alanud.',
    prazenKrog: 'Selles voorus pole veel mänge mängitud.',
    prejsnji: 'Eelmine voor',
    naslednji: 'Järgmine voor',
  },

  // Stran Lestvica lige (/table): prava lestvica iz izidov in strelci.
  tabela: {
    naslov: 'Liigatabel',
    zavihek: '{liga} · tabel',
    uvod: 'Hooaja {sezona} tabel, arvutatud mänguprotokollide tulemustest ({zveza}).',
    opomba: 'Ligikaudne: võit 3 punkti, viik 1; võrdsete punktide korral otsustab väravate vahe, siis löödud väravad. Alaliidud võivad kasutada muid reegleid (omavahelised mängud, punktide mahaarvamine); ametlik tabel on siin: {zveza}.',
    niTekem: 'Selles liigas pole veel mänge mängitud.',
    stolpci: {
      klub: 'Klubi',
      tekme: 'M',
      zmage: 'V',
      remiji: 'VI',
      porazi: 'K',
      goli: 'Väravad',
      razlika: 'VV',
      tocke: 'P',
      forma: 'Vorm',
    },
    stolpciOpis: {
      tekme: 'Mänge',
      zmage: 'Võite',
      remiji: 'Viike',
      porazi: 'Kaotusi',
      goli: 'Löödud : lastud',
      razlika: 'Väravate vahe',
      tocke: 'Punktid',
    },
    forma: { W: 'V', D: 'VI', L: 'K' },
    formaOpis: { W: 'võit', D: 'viik', L: 'kaotus' },
    strelci: 'Parimad väravakütid',
    niStrelcev: 'Sel hooajal pole veel väravaid löödud.',
    stolpciStrelcev: {
      igralec: 'Mängija',
      klub: 'Klubi',
      goli: 'Väravad',
      tekme: 'Mänge',
      minute: 'Min',
    },
  },

  tekma: {
    naslov: 'Mäng',
    niTekme: 'Seda mängu mänguprotokollides pole.',
    nazaj: '← Tulemused',
    brezPostav:
      'Mänguprotokollis pole koosseise, seega ei saa mängijate punkte näidata.',
    naDresu:
      'Iga särk näitab, mitu punkti mängija selles mängus teenis. Klõpsa mängijal, et avada tema leht.',
    cakajo: {
      one: '{n} värav selles mängus ootab resultatiivset söötu: seni jääb söödu andja +3 punktist ilma. Ütle allpool, kes selle ette valmistas.',
      other: '{n} väravat selles mängus ootavad resultatiivset söötu: seni jäävad söötude andjad +3 punktist ilma. Ütle allpool, kes need ette valmistas.',
    },
    goliInAsistence: 'Väravad ja resultatiivsed söödud',
    prijaviSe: 'Hääletamiseks logi sisse',
  },

  // Resultatiivsete söötude leht (hääletus).
  glasovanje: {
    naslov: 'Resultatiivsed söödud',
    kdoJePodal: 'Kes andis resultatiivse söödu?',
    uvod:
      'Mänguprotokollid ({zveza}) märgivad väravakütid, aga mitte resultatiivseid sööte. Otsustab kogukond: kui sama mängija saab värava eest <b>{glasov}</b>, antakse resultatiivne sööt talle ja see toob <b>+3 punkti</b>.',
    pragGlasov: { one: '{n} hääle', other: '{n} häält' },
    niTekem: 'Sel hooajal pole veel mänge mängitud',
    niTekemOpis:
      'Resultatiivsete söötude hääletus avaneb kohe pärast esimese vooru mängimist. Tule tagasi, kui mänguprotokollid on olemas.',
    arhiv: 'arhiiv',
    preteklaSezona:
      'Hääletad möödunud hooaja üle. See ei mõjuta käesoleva liiga punkte, vaid parandab ainult ajalugu.',
    izberiKrog: '1. Vali voor',
    izberiTekmo: '2. Vali mäng',
    vsePotrjeno: 'Kõik kinnitatud',
    zaprto: 'suletud',
    poglejTekmo: 'Vaata selle mängu koosseise ja punkte →',
    niGolov: 'Selles mängus väravaid ei löödud.',
    vsePotrjene: 'Kõik selle mängu resultatiivsed söödud on kinnitatud. 🎉',
    zaprtoOpis: 'Selle mängu hääletus on suletud; see on avatud järgmise vooru tähtajani.',
    brezPotrjene: 'Kinnitatud resultatiivne sööt puudub: {goli}.',
  },

  // Värava kaart hääletusega (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'tundmatu väravalööja',
    avtogol: 'Omavärav: {ime}',
    enajstmetrovka: '{ime}: penalti',
    brezAsistenceOpomba: 'resultatiivset söötu pole',
    potrjena: 'resultatiivne sööt kinnitatud, lukus',
    brezAsistence: 'Resultatiivset söötu pole',
    odlocilaSkupnost: 'kogukonna otsusel',
    morasSePrijaviti: 'Hääletamiseks pead sisse logima',
    spremeniGlas: 'Muuda häält',
    kdoJePodal: 'Kes andis resultatiivse söödu?',
    vodiBrez: 'Juhib: „resultatiivset söötu pole”',
    vodi: 'Juhib: <b>{ime}</b>',
    igralecBrezZapisa: 'mängija pole protokollis',
    doOdlocitve: '· otsuseni veel {n}',
    ostali: 'Teised:',
    brezGlasovi: 'mitte keegi ({n})',
    izberiPodajalca: 'Vali resultatiivse söödu andja: {ekipa}',
    nihce: 'Mitte keegi: värav ilma resultatiivse söödu andjata',
  },

  // Positsioonide leht (hääletus positsioonide üle).
  pozicije: {
    naslov: 'Positsioonid',
    kjeKdoIgra: 'Kes kus mängib?',
    uvod:
      'Mänguprotokollid märgivad ainult väravavahi ja loetlevad koosseisud särginumbrite järgi, seega positsioone neist välja lugeda ei saa. Otsustab kogukond. Vajalik häälte arv: <b>{prag}</b>; arv langeb (kuni {minPrag}), kui statistiline eeldus (särginumber, väravad, kaardid) näitab tugevalt samas suunas. <b>Klubi asjatundjate</b> ja <b>suure täpsusega</b> kasutajate hääled loevad rohkem.',
    enkratNaTeden:
      'Hääletatud positsioonid jõustuvad <b>kord nädalas, esmaspäeva hommikul</b>, kõik korraga. Nii ei nihku liiga nädala jooksul sinu käe all: mida näed teisipäeval, kehtib ka laupäeval, kui voor lukustub. Mängija, kellel on juba piisavalt hääli, on seni märgitud liivakellaga <ikona>⏳</ikona>.',
    klub: 'Klubi',
    poznavalecOznaka: '  ★ asjatundja',
    samoIzStatistike: 'Ainult statistikast ({n})',
    vsiPotrjeni: 'Selle klubi igal mängijal on kinnitatud positsioon. 🎉',
    niIgralcev: 'Mängijaid pole.',
    status: {
      naslov: 'Minu hääletaja staatus',
      utezOpis:
        'Iga hääle kaal: asjatundja lisa tuleb juurde, kui hääletad oma klubi mängija üle.',
      utez: 'kaal {utez}×',
      tocnih: '({pravilni}/{vsi} õiged)',
      klubPoznam: 'Klubi, mida tunnen hästi (asjatundja): minu hääl selle klubi mängijate üle loeb rohkem:',
      nisemPoznavalec: 'pole ühegi klubi asjatundja',
      opomba:
        'Asjatundja valib ainult ühe klubi. Kaalud paika loksuvad aja jooksul: kui sinu hääled osutuvad valeks, langeb sinu usaldus. Usaldus arvutatakse varasematest häältest uuesti, kui positsioon on teada.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} nullimängu',
      izZapisnika: 'Mänguprotokollist: väravavaht on märgitud (V)',
      izStatistike: 'Statistikast (särginumber, väravad, kaardid): hääled võivad seda parandada',
      potrdilaSkupnost: 'Kogukonna kinnitatud',
      zapisnik: ' · mänguprotokoll',
      uveljavitevOpis:
        'Positsioonid jõustuvad kord nädalas, esmaspäeva hommikul, et liiga ei nihkuks nädala jooksul sinu käe all.',
      izglasovano: 'hääletatud: {pozicija} · esmaspäeval',
      neIgraOpis: 'Enam ei mängi: turul pole. Kui ta mänguprotokolli ilmub, naaseb ta automaatselt.',
      neIgra: 'enam ei mängi',
      vrniOpis: 'Taasta mängija aktiivseks',
      vrni: 'taasta',
      odhodOpis:
        'Mängija ei mängi enam selles klubis: eemaldab ta turult. Mäng mänguprotokollis toob ta automaatselt tagasi.',
      statistikaKaze:
        'Statistika näitab <b>{pozicija} ({odstotek}%)</b>: selles suunas hääl loeb madalama läve vastu ({nizji} läve {prag} asemel).',
      dolocenaIzStatistike: 'Positsioon määrati statistikast: kui see on vale, klõpsa õigel.',
      dolocilaSkupnost: 'Positsiooni määras kogukond: hääled võivad seda parandada.',
      gumbUtez: 'Kaal {utez} / lävi {prag}',
      gumbPrior: ' · eeldus {odstotek}%',
      gumbPoznavalec: ' · sinu asjatundja hääl loeb rohkem',
      vodi: 'Juhib: {pozicija}, kaal {utez} / {prag}',
    },
  },
}
