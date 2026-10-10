// Eestikeelne `lestvice` (allikas: src/i18n/sl/lestvice.ts).
// Järgarvud nagu sloveeni keeles: "4. voor", "3. koht". Arvsõna järel on
// nimisõna ainsuses ("12 meeskonnast"), seepärast on one ja other sageli samad.
import type { Prevod } from '../jedro.ts'

export const lestvice: NonNullable<Prevod['lestvice']> = {
  /** "4. voor": vooru nupud ja sildid. */
  krog: '{n}. voor',
  mesto: '{mesto}.',
  /** "5 meeskonnast". */
  odEkip: { one: '{n} meeskonnast', other: '{n} meeskonnast' },
  pokaziVec: 'Näita rohkem ({n})',
  mojeMesto: 'Minu koht ↓',

  lestvica: {
    naslov: 'Fantaasia edetabel',
    prazna: 'Edetabel on veel tühi: pane kokku esimene meeskond!',
    napakaKrogov:
      'Voorude tulemusi ei õnnestunud laadida ({napaka}). Allolev üldedetabel on siiski õige.',
    tvojRezultatZadnji: 'Sinu tulemus viimases voorus',
    mojaEkipa: 'Minu meeskond',
    zmagovalecKroga: '{krog}. vooru võitja',
    zmagovalciPoKrogih: 'Voorude võitjad',
    odigraniKrogi: {
      one: '{n} voor mängitud',
      other: '{n} vooru mängitud',
    },
    pozneje: 'Liitusid hiljem? Vali oma voor ja võistle sealt edasi.',
    celotnaSezona: 'Kogu hooaeg',
    odKroga: 'Alates {n}. voorust',
    igraOd: '· mängib alates {datum}',
    zavihekEkipe: 'Meeskonnad',
    zavihekNavijaci: 'Klubide fännid',
  },

  navijaciKlubov: {
    naslov: 'Klubide fännid',
    opis: 'Millisel klubil on parimad mänedžerid? Arvestatakse nende fännide keskmisi punkte, kellel on selles liigas meeskond.',
    /** "Klubi pääseb tabelisse vähemalt 3 fänniga." */
    pogoj: {
      one: 'Klubi pääseb tabelisse vähemalt {n} fänniga.',
      other: 'Klubi pääseb tabelisse vähemalt {n} fänniga.',
    },
    povprecjeSezona: 'Ø hooaeg',
    povprecjeKroga: 'Ø {n}. voor',
    navijaci: 'Fännid',
    tvojKlub: 'sinu klubi',
    stranKluba: 'Klubi leht →',
    premalo: 'Liiga vähe fänne',
    brezNavijacev: 'Fänne veel pole: {klubi}',
    prazno: 'Keegi selles liigas pole veel oma klubi valinud. Ole esimene!',
    izbira: {
      naslov: 'Millist klubi sa toetad?',
      opis: 'Vali klubi ja sinu punktid lähevad fännide tabelis selle arvele.',
      izberi: 'vali klubi',
      shrani: 'Toetan seda klubi',
      spremeni: 'Klubi saad igal ajal vahetada siin, fännide tabelis.',
      mojKlub: 'Sa toetad klubi <b>{klub}</b>.',
      zamenjaj: 'Vaheta klubi',
    },
    klub: {
      naslov: 'Selle klubi fännid',
      mesto: '{mesto}.',
      odKlubov: {
        one: 'fännide tabeli {n} klubist',
        other: 'fännide tabeli {n} klubist',
      },
      manjka: {
        one: 'Fännide tabelisse pääsemiseks on vaja veel {n} fänni.',
        other: 'Fännide tabelisse pääsemiseks on vaja veel {n} fänni.',
      },
      brez: 'Sellel klubil pole veel ühtegi fänni, kellel oleks liigas meeskond.',
      navijam: 'Toetan klubi {klub}',
      vsiKlubi: 'Kõik liiga klubid',
    },
  },

  slovenija: {
    naslovStrani: 'Riiklik edetabel',
    naslov: 'Riiklik',
    pripravlja: 'Riiklikku edetabelit valmistatakse ette. Proovi mõne minuti pärast uuesti.',
    povzetek: 'Kõikide liigade kõik meeskonnad koos: {ekip}, {lig}, {zvez}.',
    lig: { one: '{n} liiga', other: '{n} liigat' },
    zvez: { one: '{n} alaliit', other: '{n} alaliitu' },
    skupno: 'Kokku',
    naKrog: 'Vooru kohta',
    povprecjeRazlaga:
      'Liigad ei alga samal ajal, nii et varem alanud liiga meeskond kogub juba seetõttu rohkem punkte. Keskmine tasandab selle; arvesse lähevad meeskonnad, kellel on vähemalt {krogov}.',
    /** "vähemalt 3 mängitud vooruga". */
    zOdigranimiKrogi: {
      one: '{n} mängitud voor',
      other: '{n} mängitud vooru',
    },
    premaloKrogov: 'Keskmise jaoks peab meeskond mängima vähemalt {krogov}; nii palju pole veel ükski meeskond mänginud.',
    /** "mängida vähemalt 3 vooru". */
    krogovTozilnik: { one: '{n} voor', other: '{n} vooru' },
    nobenaEkipa: 'Ükski meeskond pole veel vooru mänginud.',
    lestvicaLige: 'Sinu liiga edetabel',
    zavihekEkipe: 'Meeskonnad',
    zavihekIgralci: 'Mängijad',
    zavihekKlubi: 'Klubid',
    klubiUvod: 'Päris klubide võistkonnad, mitte fantaasiameeskonnad: punktid, mis mängijad võistkonnale teenisid · hooaeg {sezona}',
    klubiIgralcev: { one: '{n} mängija', other: '{n} mängijat' },
    klubiPovprecje:
      'Liigad ei alga koos, seepärast tasandavad seda punktid vooru kohta; arvesse lähevad võistkonnad, kellel on vähemalt {krogov}.',
    klubiVec: 'Näita rohkem',
    klubiOpomba:
      'Klubi täiskasvanute ja noorte võistkonnad on eraldi. Punktides pole resultatiivseid sööte. Üleminekuga mängija alustab uues klubis nullist; varem teenitud punktid jäävad vanale.',
    vrhNaslov: 'Kes on riigis tipus?',
    vrhPoglejVse: 'Vaata top 10 →',
    vrhUvod: 'Kõigi liigade top 10 · hooaeg {sezona}',
    vrhTocke: 'Kõige rohkem punkte',
    vrhGoli: 'Väravakütid',
    vrhCisteMreze: 'Nullimängud: väravavahid',
    vrhOpomba:
      'Punktides pole resultatiivseid sööte: need kinnitatakse hääletusega, mis pole enamikus liigades veel alanud, nii et liigad ei oleks võrdses seisus. Liigad on mänginud erineva arvu voore.',
    vrhPrazno: 'Sel hooajal pole veel ühtegi mängu mängitud.',
  },

  miniLige: {
    naslov: 'Miniliigad',
    pridruzenDobrodosel: 'Liitusid. Tere tulemast liigasse.',
    pridruzen: 'Liitusid.',
    zeOdPrej: 'See meeskond on juba selles miniliigas.',
    prekratkoIme: 'Miniliiga nimes peab olema vähemalt 2 tähemärki.',
    ustvarjena: 'Miniliiga "{ime}" on loodud. Kood: {koda}',
    najprejEkipa: 'Pane kõigepealt kokku meeskond mõnes liigas.',
    prijava: 'Miniliigade kasutamiseks pead <prijava>sisse logima</prijava>.',
    opis: 'Privaatne võistlus sõprade vahel. Meeskonnad võivad olla eri liigadest.',
    ustvari: 'Loo',
    imeLige: 'Miniliiga nimi',
    ustvariLigo: 'Loo miniliiga',
    novaAliKoda: 'Uus miniliiga või liitu koodiga',
    pridruziSe: 'Liitu',
    koda: 'Kood ({n} tähemärki)',
    nisiVNobeni: 'Sa pole veel üheski miniliigas. Kes on parem mänedžer, sina või su sõbrad?',
    ustvariLigoIme: 'Loo liiga „{ime}”',
    najprejSestavi: 'Pane kõigepealt meeskond kokku',
    povabilo: 'Kutse: <povezava>{povezava}</povezava><koda>kood {koda}</koda>',
    deliPovabilo: 'Jaga kutset',
    prazna: 'Selles miniliigas pole veel meeskondi.',
    // Kutse jagamise tulemus (ka PovabiSoigralce).
    poslano: 'Kutse saadetud.',
    kopirano: 'Kutse kopeeritud, kleebi see oma grupivestlusesse.',
    neuspelo: 'Jagamine ebaõnnestus.',
    neuspeloPovezava: 'Jagamine ebaõnnestus, lingi leiad lehelt Miniliigad.',
    // lib/miniLige
    vpisiKodo: 'Sisesta miniliiga kood.',
    dolzinaKode: 'Koodis on {dolzina} tähemärki; sina sisestasid {vpisal}.',
    slabiZnaki: 'Koodis pole märke {znaki}: kontrolli, kas ajasid segi 0 ja O või 1 ja I.',
    besediloVabila: 'Liitu minu miniliigaga "{ime}" SLFF-is ja võida mind: {povezava}',
    naslovVabila: 'Miniliiga {ime} · SLFF',
    privzetoIme: '{ime} ja sõbrad',
    privzetoImeBrez: 'Minu miniliiga',
  },

  // Kutse jagamine (DeliMiniLigo): pärast loomist ja liiga lehel.
  deli: {
    naslovNova: 'Sinu liiga on püsti. Nüüd on vaja vastaseid!',
    opisNova:
      'Ühe liikmega miniliiga on päevik, mitte võistlus. Saada link oma grupile: kes sellel klõpsab, on mõne sekundiga liigas, koodi pole vaja trükkida.',
    naslovSam: 'Üksi iseenda vastu? Pole vastast, pole võitu.',
    opisSam: 'Saada link meeskonnakaaslastele, kolleegidele või sellele, kes alati teab, kes oleks pidanud mängima.',
    naslov: 'Kutsu veel kedagi',
    povezava: 'Liitumislink',
    deli: 'Jaga',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    kopiraj: 'Kopeeri link',
    kopirano: 'Link kopeeritud, kleebi see oma grupivestlusesse.',
    koda: 'Kood käsitsi sisestamiseks: {koda}',
  },

  // Miniliiga nädala kokkuvõte: lõppenud vooru lood.
  pregled: {
    naslov: 'Nädala kokkuvõte',
    krog: 'Voor',
    nalaganje: 'Sorin mänguprotokollides …',
    prazno:
      'Kui esimene voor on mängitud, on siin nädala lood: kes võitis, kes jättis kapteni pingile ja kes viis koju puulusika.',
    samoEna: 'Kui keegi veel liitub, on siin ka võitja. Ja kaotaja.',
    tockeKroga: 'Vooru punktid',
    deliPregled: 'Saada grupile',
    kopiran: 'Kokkuvõte kopeeritud, kleebi see oma grupivestlusesse.',
    sporociloNaslov: '📊 {ime} · {krog}. voor',
    manager: 'Vooru mänedžer',
    managerOpis: '{ekipa} · {tocke}. Kiitlemisõigus järgmise voorupeale.',
    kapetan: 'Vooru kapten',
    kapetanOpis: '{igralec} tõi kaptenipaelaga {tocke} ({ekipa}).',
    adut: 'Peidetud pärl',
    adutOpis: '{igralec} ({tocke}): peale meeskonna {ekipa} ei olnud teda kellelgi koosseisus.',
    skok: 'Tõus',
    skokOpis: {
      one: '{ekipa}: üles {n} koha võrra, nüüd {mesto}.',
      other: '{ekipa}: üles {n} koha võrra, nüüd {mesto}.',
    },
    padec: 'Vabalangus',
    padecOpis: {
      one: '{ekipa}: alla {n} koha võrra, nüüd {mesto}. Langevari ei avanenud.',
      other: '{ekipa}: alla {n} koha võrra, nüüd {mesto}. Langevari ei avanenud.',
    },
    klop: 'Kuld pingil',
    klopOpis: '{ekipa} · {tocke} pingil. Treener, kus sa olid?',
    zlica: 'Puulusikas',
    zlicaOpis: '{ekipa} · {tocke}. Järgmine voor tuleb parem. Võib-olla.',
  },

  mojeMiniLige: {
    povabilo: 'Edetabel sõprade vahel on lõbusam kui võõraste vahel.',
    ustvari: 'Loo miniliiga',
    naslov: 'Minu miniliigad',
    vse: 'kõik →',
    vodi: ' · juhib {ime}',
    sam: '· oled üksi, kutsu kedagi →',
  },

  povabiSoigralce: {
    naslovLiga: 'Kutsu veel kedagi: {ime}',
    naslovNova: 'Meeskond on koos. Nüüd kutsu sõbrad.',
    opisLiga: 'Kes lingil klõpsab, liitub liigaga ühe klõpsuga.',
    opisNova: 'Kes on parem mänedžer? Miniliiga on tabel ainult teie seltskonnale.',
    trenutek: 'Üks hetk …',
    deliPovabilo: 'Jaga kutset',
    ustvariInPovabi: 'Loo miniliiga ja kutsu',
    miniLige: 'Miniliigad',
  },

  vstop: {
    naslovLiga: 'Kutse: {ime}',
    naslov: 'Kutse miniliigasse',
    niLige: 'Seda miniliigat pole olemas',
    niLigeOpis:
      'Link on poolik või on liiga kustutatud. Küsi uut või <ustvari>loo oma</ustvari>.',
    ustvaril: 'Lõi {ime}',
    miniLiga: 'Miniliiga',
    prijaviSe: 'Logi sisse või loo konto. Pärast sisselogimist toome su siia tagasi ja lisame liigasse, koodi pole vaja trükkida.',
    prijavaAliRegistracija: 'Logi sisse või registreeru',
    nalaganjeEkip: 'Laadin sinu meeskondi …',
    potrebujesEkipo:
      'Miniliiga jaoks on vaja meeskonda. Pane see kokku (võtab minuti) ja salvestamisel liitud liigaga automaatselt.',
    sestaviEkipo: 'Pane meeskond kokku',
    sKateroEkipo: 'Millise meeskonnaga?',
    vstopam: 'Liitun …',
    pridruziSe: 'Liitu meeskonnaga {ime}',
  },

  ekipa: {
    naslov: 'Meeskond',
    niEkipe: 'Seda meeskonda pole olemas.',
    okvara: 'Koosseisu ei õnnestunud laadida.',
    nazaj: 'Tagasi edetabelisse',
    skupaj: 'Kokku {tocke} {beseda}',
    brezKrogov:
      'Selles liigas pole veel ükski voor lõppenud. Teised meeskonnad on näha pärast tähtaega, enne seda ei näe neid keegi.',
    nalaganjePostave: 'Laadin koosseisu …',
    brezPostave: 'Sellel meeskonnal polnud valitud voorus koosseisu.',
    vTemKrogu: '{beseda} selles voorus',
    kazen: '(−{kazen} üleminekute eest)',
    namestnik: 'Kapten ei mänginud, seega võttis kordaja üle asekapten.',
    klop: 'Pink',
  },

  klub: {
    naslov: 'Klubi',
    niKluba: 'Seda klubi pole olemas.',
    brezLige: 'See klubi ei mängi sel hooajal üheski liigas, mida jälgime.',
    naNaslovnico: 'Avalehele',
    liga: 'Liiga',
    podnaslov: '{liga} · {igralci} mängus',
    uvod:
      'Klubi {klub} mängijad on osa <b>SLFF</b>-ist, fantaasialiigast, mille aluseks on {liga}. Fännid panevad päris mängijatest kokku oma meeskonna ja punktid tulevad <b>ametlikest mänguprotokollidest</b>: väravad, minutid, nullid, kaardid.',
    toLigo: 'see liiga',
    navijaci: {
      one: '<b>{navijacev}</b> hoiab praegu teie mängijaid oma meeskonnas.',
      other: '<b>{navijacev}</b> hoiavad praegu teie mängijaid oma meeskonnas.',
    },
    sestaviEkipo: 'Pane meeskond kokku',
    lestvica: 'Edetabel',
    zaObjavo: 'Pildid jagamiseks',
    napoved: 'Teadaanne avamisel postitamiseks',
    nasiIgralci: 'Meie mängijad koos punktidega',
    brezStatistike: 'Sel hooajal selle klubi kohta veel statistikat pole.',
    pozicije: {
      GK: 'Väravavahid',
      DEF: 'Kaitsjad',
      MID: 'Poolkaitsjad',
      FWD: 'Ründajad',
    },
    goli: '{n} V · ',
    minute: '{n} min',
    opomba: 'Punktid arvutatakse ametlikest mänguprotokollidest. Kui midagi on valesti, anna teada, parandame andmed.',
  },

  plakat: {
    navijaci: { one: '{n} fänn', other: '{n} fänni' },
    stavekNavijacev: {
      one: '{navijacev} hoiab juba meie mängijaid oma meeskonnas.',
      other: '{navijacev} hoiavad juba meie mängijaid oma meeskonnas.',
    },
    // Tekst lõuendil.
    izNasihIgralcev: 'Pane meeskond kokku meie mängijatest.',
    najvecTock: 'Hooaja kõige rohkem punkte',
    pridi: 'TULE',
    sestavit: 'PANE KOKKU',
    ekipo: 'MEESKOND.',
    jeOdprta: 'Fantaasialiiga on avatud: {liga}. Tasuta.',
    zapisnikiMnz: 'punktid ametlikest mänguprotokollidest',
    fantasyLigaZa: 'Fantaasialiiga',
    jeLive: 'ON AVATUD.',
    pravihIgralcev: 'Pane kokku meeskond päris mängijatest. Punktid ametlikest mänguprotokollidest.',
    brezplacno: 'tasuta',
    mestoOd: {
      one: '{mesto}. koht {n} meeskonnast',
      other: '{mesto}. koht {n} meeskonnast',
    },
    mojiNajboljsi: 'Minu parimad selles voorus',
    premagajMe: 'Pane meeskond kokku ja võida mind.',
    // Tekst jagamisel.
    deliKlub: '{klub} on SLFF fantaasialiigas: pane meeskond kokku meie mängijatest.',
    deliNapoved:
      'Tule ja pane meeskond kokku! Fantaasialiiga on avatud: {liga}. Tasuta, klubi {klub} päris mängijatega.',
    deliLive: 'Fantaasialiiga on avatud: {liga}. Pane kokku meeskond päris mängijatest, tasuta.',
    deliKrog: '{ekipa}: {tocke} {beseda} {krog}. voorus. Pane meeskond kokku ja võida mind.',
  },

  // Meeskonna nädala kokkuvõte: püstpilt loo jaoks (Minu meeskond, teine meeskond).
  zgodba: {
    naslov: 'Nädala kokkuvõte · {krog}. voor',
    opis: 'Pilt sinu Instagrami või WhatsAppi loo jaoks: punktid, koht liigas, kapten ja vooru parim mängija.',
    deli: 'Jaga nädala kokkuvõtet',
    prenesi: 'Laadi alla nädala kokkuvõte',
    // Tekst lõuendil.
    nadnaslov: 'NÄDALA KOKKUVÕTE · {krog}. VOOR',
    vKrogu: '{krog}. voorus',
    gor: '▲ {n}',
    dol: '▼ {n}',
    enako: '=',
    kapetan: 'KAPTEN',
    namestnik: 'ASEKAPTEN',
    kapetanInNajboljsi: '{trak} · MEESKONNA PARIM',
    najboljsi: 'MEESKONNA PARIM',
    // Tekst jagamisel.
    deliBesedilo: '{ekipa}: {tocke} {beseda} {krog}. voorus. Pane meeskond kokku ja võida mind.',
    deliBesediloMesto: '{ekipa}: {tocke} {beseda} {krog}. voorus, liigas {mesto}. koht. Pane meeskond kokku ja võida mind.',
  },

  deliSliko: {
    naslov: '{naslov} · SLFF',
    kopirana: 'Link kopeeritud.',
    niPripravljena: 'Pilti ei õnnestunud ette valmistada.',
    seEnkrat: 'Jagamismenüü avamiseks puuduta uuesti.',
    niIzrisa: 'pilti ei õnnestunud joonistada',
    shranjena: 'Pilt salvestatud: postita see Instagrami, Facebooki või WhatsAppi.',
    napaka: 'Pilti ei õnnestunud ette valmistada: {napaka}',
    pripravljam: 'Valmistan ette …',
    deliSliko: 'Jaga pilti',
    prenesi: 'Laadi pilt postitamiseks alla',
    deliPovezavo: 'Jaga linki',
    shrani: 'Salvesta pilt',
    namig: 'WhatsApp, Instagram, Facebook …: vali avanevas menüüs.',
  },
}
