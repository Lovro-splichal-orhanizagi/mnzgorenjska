// Eestikeelne `mojaEkipa` (allikas: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Minu meeskond',
  /** Kui mängija nimi pole teada. */
  igralec: 'Mängija',
  vprasanjeZapustitve: 'Sul on meeskonnas salvestamata muudatusi. Kas lahkud lehelt ikkagi?',
  /** Paela tähis särgil. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'A',
  },

  // Koosseisu reeglid (lib/pravila.ts): põhjused turul ja vigade loendis.
  pravila: {
    pozicije: {
      GK: 'Väravavahid',
      DEF: 'Kaitsjad',
      MID: 'Poolkaitsjad',
      FWD: 'Ründajad',
    },
    kaderPoln: 'Sinu koosseis on täis ({n} mängijat).',
    pozicijaPolna: '{pozicija}: sul on koosseisus juba {n}.',
    premaloProracuna: 'Eelarvest ei piisa: mängija maksab {cena}, sul on jäänud {preostalo}.',
    izKluba: 'Sul on juba {n} mängijat klubist {klub}.',
    velikostEkipe: 'Koosseisus peab olema {n} mängijat (praegu {trenutno}).',
    velikostPostave: 'Algkoosseisus peab olema {n} mängijat (praegu {trenutno}).',
    brezPozicije: {
      one: '{n} valitud mängijal pole veel kinnitatud positsiooni: aita jaotises Positsioonid.',
      other: '{n} valitud mängijal pole veel kinnitatud positsiooni: aita jaotises Positsioonid.',
    },
    niVecVLigi: '{ime} pole enam liigas: vaheta ta välja.',
    pozicijaVKadru: '{pozicija} koosseisus: {n}, peab olema {kader}.',
    pozicijaVPostavi: '{pozicija} algkoosseisus: {n}, lubatud {min} kuni {max}.',
    dolociKapetana: 'Vali kapten: tema saab voorus {n}× punktid.',
    enKapetan: 'Kapten saab olla ainult üks.',
    dolociNamestnika: 'Vali asekapten, kes võtab paela, kui kapten ei mängi.',
    istiKlub: 'Ühest klubist saad valida kõige rohkem {n} mängijat.',
    presegelProracun: 'Oled eelarvest üle {cena} võrra.',
  },

  napake: {
    zeImas: 'Sul on selles liigas juba meeskond: laadi leht uuesti.',
    dovoljenje: 'Sul pole selleks õigust. Logi uuesti sisse ja proovi veel kord.',
    povezava: 'Serveriga ühendust pole. Kontrolli internetti ja proovi uuesti.',
    shranjevanje: 'Salvestamine ebaõnnestus. Proovi uuesti.',
    nalaganjePovezava: 'Serveriga ühendust pole: kontrolli internetti.',
    nalaganje: 'Sinu meeskonna andmeid ei õnnestunud laadida.',
    nalaganjeNiCelo:
      'Meeskonda ei saa salvestada enne, kui see on täielikult laaditud, muidu eemaldaks salvestamine mängijad, kes ei laadinud.',
    poskusiZnova: 'Proovi uuesti',
    vpisiIme: 'Sisesta kõigepealt meeskonna nimi.',
    osvezitev:
      'Sinu meeskond on salvestatud, kuid värskendamine ebaõnnestus: laadi leht uuesti, enne kui seda jälle muudad.',
    najprejShrani: 'Salvesta kõigepealt oma meeskond.',
    izberiKrog: 'Vali voor, milles boonus kehtib.',
    prihodnjiKrog: 'Vali tulevane, lukustamata voor, millel on tähtaeg.',
    zeUporabil: 'Oled seda boonust sel hooajal juba kasutanud.',
    niPreklica: 'Selle vooru boonust ei saa enam tühistada.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'Selle liiga turul pole veel mängijaid.',
    pocakaj: 'Oota, kuni salvestamine lõpeb.',
    niPredloga: 'Sellest liigast ei saa veel nõuetele vastavat meeskonda kokku panna.',
    predlogSestavljen: 'Sinu meeskond on koos: vaheta kedagi, kui tahad, ja vajuta Salvesta.',
    kaderDopolnjen: 'Tühjad kohad on täidetud: kontrolli neid ja vajuta Salvesta.',
    niDopolnitve:
      'Koosseisu ei saa järelejäänud rahaga täita. Vaheta mõni kallis mängija välja ja proovi uuesti.',
    kapetanNaKlop: '{ime} läks pingile: vali uus kapten.',
    namestnikNaKlop: '{ime} läks pingile: vali uus asekapten.',
    brezPozicije: 'Sellel mängijal pole veel kinnitatud positsiooni, seega ei saa teda väljakule panna.',
    niProstora:
      'Algkoosseisus pole selle positsiooni jaoks rohkem ruumi: pane kõigepealt keegi pingile.',
    niVecNamestnik: '{ime} pole enam asekapten: vali uus.',
    niVecKapetan: '{ime} pole enam kapten: vali uus.',
    rokPotekel: '{krog}. vooru tähtaeg on möödas, muudatused kehtivad järgmisest voorust.',
    shranjenaZaKrog: 'Sinu meeskond on salvestatud ja {krog}. vooruks valmis.',
    shranjenaVeljavna: 'Sinu meeskond on salvestatud ja vastab reeglitele.',
    osnutekShranjen:
      'Mustand salvestatud: sinu meeskond ei vasta veel reeglitele, nii et selles voorus see punkte ei saaks.',
    prodaja: 'Müük tõi sulle +{cena}.',
    nakupi: 'Ostud maksid {cena}.',
    wildcardVlozen: 'Wildcard kasutatud: üleminekud on selles voorus tasuta.',
    klopPlusVlozen: 'Pink+ kasutatud.',
    wildcardPreklican: 'Wildcard tühistatud: saad seda kasutada mõnes teises voorus.',
    klopPlusPreklican: 'Pink+ tühistatud: saad seda kasutada mõnes teises voorus.',
    zapriOpozorilo: 'Sulge hoiatus',
    zapriObvestilo: 'Sulge teade',
    odstranjen: '{ime} eemaldatud.',
    razveljavi: 'Võta tagasi',
  },

  prijavaPotrebna: 'Meeskonna kokkupanemiseks pead sisse logima.',
  prijava: 'Logi sisse',
  locenaLiga:
    'Sinu meeskond liigas <liga>{liga}</liga> on eraldi sinu teistest meeskondadest, oma eelarve ja oma edetabeliga. Punktid lähevad arvesse alates {krog}. voorust, sest seni käivad veel üleminekud ja vanuseklasside vahetused.',

  /** Zloženi razdelek pod igriščem. */
  vec: 'Veel: boonused, ajalugu, reeglid',

  prestopi: {
    stevec: 'Üleminekud: {n}/{prosti}',
    wildcard: 'wildcard, karistuseta',
    odbitek: 'selles voorus maha {tock}',
    prosti: {
      one: 'veel {n} tasuta, siis igaüks −{kazen}',
      other: 'veel {n} tasuta, siis igaüks −{kazen}',
    },
  },

  // Üleminekunõuanded (lib/namigiEkipe.ts): kes järgmises voorus ei mängi ja
  // keda saad selle asemel endale lubada.
  namigi: {
    naslov: 'Üleminekunõuanded',
    zaKrog: 'Kes {krog}. voorus tõenäoliselt ei mängi ja keda saad endale selle asemel lubada.',
    razlog: {
      neaktiven: 'pole enam liigas',
      poskodba: 'vigastatud',
      odsotnost: 'ei saa mängida',
      brezTekme: 'klubil pole mängu',
    },
    kandidat: '{cena} · vorm {forma}',
    zamenjajNamig: 'Vaheta koosseisus {ime} mängija {novi} vastu',
    niZamenjave: 'Ükski asendus ei mahu sinu eelarvesse ja reeglitesse.',
    opomba: 'Klõps ainult valmistab vahetuse ette, meeskonna salvestad ise. Iga nõuanne kehtib eraldi.',
    skrij: 'Peida järgmise vooruni',
    zamenjano: '{novi} on koosseisus mängija {ime} asemel. Salvesta meeskond, kui oled rahul.',
  },

  // Koosseisu mängijate hinnamuutused pärast viimast külastust.
  odZadnjegaObiska: {
    naslov: 'Pärast sinu viimast külastust',
    naslovTeden: 'Viimase nädala jooksul',
    vrednost: 'Meeskonna väärtus <znesek>{znak}{cena}</znesek>',
    gor: 'hinnatõus',
    dol: 'hinnalangus',
    zapri: 'Sulge',
  },

  povzetek: {
    urediIme: 'Muuda meeskonna nime {ime}',
    bogastvo:
      'varandus <vrednost>{bogastvo}</vrednost><razlika></razlika> · koosseis {kader} <placano>makstud</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Salvestan …',
    shraniEkipo: 'Salvesta meeskond',
    neshranjeno: 'Salvestamata muudatused',
    imeEkipe: 'Meeskonna nimi',
    privzetoIme: 'FC {ime}',
    primerImena: 'nt Pühapäevakangelased',
  },

  // Algusnõuanne tühjale meeskonnale.
  zacetek: {
    naslov: 'Kust alustada?',
    sestaviMi: 'Pane mulle meeskond kokku',
    opisPredloga:
      'Valime juhusliku nõuetele vastava meeskonna eelarve piires, iga klõpsuga erineva. Siis vaheta kedagi, kui tahad, ja salvesta.',
    sam: 'Panen ise kokku',
    drugPredlog: 'Teine ettepanek',
    opisDrugegaPredloga:
      'Ei meeldi? Loosi uus meeskond, see on tasuta kuni salvestamiseni.',
    dopolni: 'Täida minu meeskond',
    opisDopolnitve:
      'Tühje kohti koosseisus: {n}. Sinu valikud jäävad, ülejäänu täidame juhuslikult eelarve piires.',
    korak1: 'Pakkusime üleval meeskonnale nime: muuda seda igal ajal.',
    korak2:
      'Klõpsa väljakul tühjal kohal <krepko>＋</krepko>. Telefonis on alumisel ribal ka nupp <krepko>＋ Lisa</krepko>; arvutis valid paremalt <krepko>mängijate turult</krepko>.',
    korak3:
      'Koosseisus on {n} mängijat: {gk} VV, {def} KAI, {mid} PK, {fwd} RÜN. Ühest klubist kõige rohkem {klub}.',
    korak4:
      'Kui kõik kohad on täidetud, vali <krepko>kapten</krepko> ja <krepko>asekapten</krepko> ning vajuta <krepko>Salvesta meeskond</krepko> (telefonis alumisel ribal <krepko>Salvesta</krepko>).',
  },

  trak: {
    naslov: 'Kaptenipael',
    kapetan: 'Kapten (×{n})',
    namestnik: 'Asekapten',
    nihce: 'mitte keegi',
  },

  // "Mis siis, kui": mida praegune koosseis oleks viimases voorus saanud.
  kajCe: {
    prinesla: 'Sinu praegune koosseis oleks <krog>{krog}. voorus</krog> ({sezona}) saanud',
    opis: '"Mis siis, kui" vaade, mitte ajalooline tulemus; see muutub iga vahetusega. Möödunud voorude tegelikud punktid on edetabelis ja koosseisu hetktõmmises.',
  },

  status: {
    manjka: 'Lõplikuks salvestamiseks on veel vaja paari asja:',
    vpisiIme: 'Sisesta meeskonna nimi (üleval väljal).',
    osnutekZdaj: 'Mustandi võid salvestada ka kohe ja reeglid hiljem korda teha.',
    brezTock: 'Sellises seisus <krepko>EI SAA punkte</krepko> <krepko>{krog}. voorus</krepko>.',
    kajPomeni:
      '<krepko>Mida "Salvesta" teeb?</krepko> Sinu muudatused (koosseis, algkoosseis, kapten) kirjutatakse andmebaasi. Käesolevas voorus loeb seis tähtajal. Kuni tähtajani võid muuta ja vajutada Salvesta nii mitu korda, kui tahad; loeb viimane versioon. <krepko>"Salvesta mustand"</krepko> teeb sama, märkides vaid, et meeskond ei vasta veel kõigile reeglitele (punktide saamiseks on vaja parandusi, vaata ülalolevat loendit).',
    kajPomeniRok:
      '<krepko>Mida "Salvesta" teeb?</krepko> Sinu muudatused (koosseis, algkoosseis, kapten) kirjutatakse andmebaasi. Käesolevas voorus loeb seis tähtajal (<krepko>{krog}. voor, {rok}</krepko>). Kuni tähtajani võid muuta ja vajutada Salvesta nii mitu korda, kui tahad; loeb viimane versioon. <krepko>"Salvesta mustand"</krepko> teeb sama, märkides vaid, et meeskond ei vasta veel kõigile reeglitele (punktide saamiseks on vaja parandusi, vaata ülalolevat loendit).',
  },

  pripomocki: {
    klopPlusNaslov: 'Boonus Pink+',
    klopPlusVlozenZa: 'Kasutatud {krog}. vooruks ({sezona}): arvesse lähevad ka pingi punktid.',
    klopPlusVlozen: 'Pink+ on juba kasutatud: arvesse lähevad ka pingi punktid.',
    klopPlusOpis:
      'Kord hooajas: valitud voorus liidetakse ka kõigi nelja varumängija punktid.',
    wildcardNaslov: 'Boonus Wildcard',
    wildcardVlozenZa: 'Kasutatud {krog}. vooruks ({sezona}): üleminekud on selles tasuta.',
    wildcardVlozen: 'Wildcard on juba kasutatud: üleminekud on selles tasuta.',
    wildcardOpis:
      'Kord hooajas: selles voorus saad vahetada nii palju mängijaid, kui tahad, punkte maha arvamata.',
    zaklenjen: 'lukus',
    preklici: 'tühista',
    prekliciDo: 'Tühistada saad kuni <odstevanje></odstevanje>',
    izberiKrog: 'Vali voor …',
    niKroga: 'Tähtajaga tulevast vooru pole',
    krogSezona: '{krog}. voor ({sezona})',
    vlozi: 'Kasuta',
    vloziZa: 'Kasuta {krog}. vooruks',
    potrdiWildcard: 'Kas kasutad Wildcardi {krog}. vooruks? Hooajas on sul ainult üks.',
  },

  zgodovina: {
    naslov: 'Koosseisude ajalugu',
    posnetkov: {
      one: '{n} voor hetktõmmisega',
      other: '{n} vooru hetktõmmisega',
    },
    krog: '{krog}. voor',
    podrobnost: '{krog}. voor · hooaeg {sezona}',
    podrobnostSkupaj: '{krog}. voor · hooaeg {sezona} · kokku <krepko>{tocke}</krepko>',
    deli: 'Jaga {krog}. vooru',
  },

  // Alumine riba ja turu sahtel telefonis.
  telefon: {
    ostane: 'jäänud',
    predalPovzetek: '<krepko>{cena}</krepko> jäänud · {n}/{velikost}',
    popravi: 'paranda ↑',
    neshranjeno: 'salvestamata',
    dodaj: '＋ Lisa',
    osnutekNamig: 'Sinu meeskond ei vasta veel reeglitele: see salvestatakse mustandina.',
    neIzpolnjuje: 'meeskond ei vasta veel reeglitele',
    zapriTrg: 'Sulge turg',
    zapri: '✕ Sulge',
  },

  trg: {
    naslov: 'Mängijate turg',
    iskanje: 'Otsi nime järgi …',
    pocistiIskanje: 'Tühjenda otsing',
    vsi: 'kõik',
    vsiKlubi: 'Kõik klubid',
    niZadetkov: 'Tulemusi pole.',
    pocistiFiltre: 'Tühjenda filtrid',
    statLetos: '{goli} V · {minute} min',
    statLani: 'eelmine hooaeg {goli} V',
    brezNastopov: 'mänge pole',
    niVecVLigi: 'pole enam liigas',
    tockeZadnjiKrog: 'Punktid viimases mängitud voorus',
    podatki: 'Andmed: {ime}',
    podatkiNamig: 'Statistika, hinnaajalugu, järgmised mängud',
    profilVNovemZavihku: 'Ava mängija profiil uuel vahelehel',
    odstrani: '✕ eemalda',
    dodaj: '⊕ lisa',
    prvih: 'Näidatakse esimest {n}: kitsenda otsinguga.',
    noga: 'Ühest klubist saad valida kõige rohkem {n} mängijat. Väravad ja minutid on käesolevast hooajast.',
  },

  rok: {
    krog: '{krog}. voor',
    potekel: 'Tähtaeg möödas: <krepko>{rok}</krepko>',
    rok: 'Tähtaeg: <krepko>{rok}</krepko>',
    niDolocen: 'Tähtaega pole veel määratud.',
  },

  // Väljak meeskonna koostajas (components/Igrisce.tsx).
  igrisce: {
    naKlop: 'Pane pingile',
    vPostavo: 'Pane algkoosseisu',
    niVecVLigiNamig: 'See mängija pole enam liigas: koosseis temaga punkte ei saa.',
    niVecVLigi: 'pole enam liigas',
    poskodba: 'vigastus',
    odsoten: 'ei saa mängida',
    kapetan: 'Kapten: kolmekordsed punktid',
    namestnik: 'Asekapten',
    tockeKroga: 'Punktid viimases voorus: {tocke}',
    tockeKrogaKapetan: 'Punktid viimases voorus: {tocke} × 3 (kapten)',
    odstraniIzKadra: 'Eemalda koosseisust',
    odstrani: 'Eemalda {ime}',
    prej: 'Vahetuste järjekorras ettepoole',
    prejIme: '{ime}: vahetuste järjekorras ettepoole',
    pozneje: 'Vahetuste järjekorras tahapoole',
    poznejeIme: '{ime}: vahetuste järjekorras tahapoole',
    izberi: 'Vali: {pozicija}',
    klop: 'Pink',
    klopOpis:
      'Kui algkoosseisu mängija ei mängi, asendab teda esimene sama positsiooni pingimängija, järjekorras vasakult paremale.',
    brezPozicije: 'Kinnitatud positsioonita: neid ei saa väljakule panna',
  },

  // Väljak ühe meeskonna punktidega mängus (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min',
    goli: '{n} × värav',
    asistence: '{n} × resultatiivne sööt',
    brezPrejetega: 'nullimäng',
    prejetih: '{n} lastud',
    rumeni: 'kollane kaart',
    rdeci: 'punane kaart',
    skupaj: '{tocke} p',
    brezPostave: 'Mänguprotokollis pole selle meeskonna koosseisu.',
    klop: 'Pink',
    vstopilo: '· sisse tuli {n}',
  },

  // Vooru meeskond ja teise mänedžeri koosseis väljakul.
  enajsterica: {
    kapetan: 'Kapten',
    namestnik: 'Asekapten paelaga',
  },

  // Riba hoiatustega minu meeskondade kohta (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Hoiatused sinu meeskondade kohta',
    naslovNapakEna: 'Üks sinu meeskondadest ei saa punkte',
    naslovNapak: {
      one: '{n} sinu meeskonda ei saa punkte',
      other: '{n} sinu meeskonda ei saa punkte',
    },
    nimasEkipe: 'Sul pole veel meeskonda<liga>({liga})</liga>: ilma selleta ei saa sa järgmises voorus punkte.',
    sestavi: 'Pane meeskond kokku →',
    popravi: 'Paranda →',
    poglej: 'Vaata →',
    skrij: 'Peida hoiatus: {besedilo}',
    skrijNamig: 'Peida, kuni tuleb uus teade',
    pokaziVse: 'Näita kõiki ({n})',
    razlog: 'Meeskond ei vasta reeglitele.',
    brezTockKrog: 'See ei saa {krog}. voorus punkte.',
    brezTockRok: 'See ei saa järgmisel tähtajal punkte.',
    nepopolna: 'Meeskond on puudulik: see voor lukustub siiski, kuid järgmisest alates punkte ei saa.',
    igralec: {
      kapetan: {
        poskodba: 'Kapten {ime} on vigastatud.',
        odsotnost: 'Kapten {ime} ei saa mängida.',
        izstop: 'Kapten {ime} enam ei mängi: tema klubi on liigast lahkunud.',
      },
      namestnik: {
        poskodba: 'Asekapten {ime} on vigastatud.',
        odsotnost: 'Asekapten {ime} ei saa mängida.',
        izstop: 'Asekapten {ime} enam ei mängi: tema klubi on liigast lahkunud.',
      },
      vPostavi: {
        poskodba: '{ime} on vigastatud ja sinu algkoosseisus.',
        odsotnost: '{ime} ei saa mängida ja on sinu algkoosseisus.',
        izstop: '{ime} sinu algkoosseisus enam ei mängi: tema klubi on liigast lahkunud.',
      },
      naKlopi: {
        poskodba: '{ime} sinu pingil on vigastatud.',
        odsotnost: '{ime} sinu pingil ei saa mängida.',
        izstop: '{ime} sinu pingil enam ei mängi: tema klubi on liigast lahkunud.',
      },
    },
    posledica: {
      kapetan: 'Kui ta ei mängi, võtab paela asekapten; võib-olla vali teine kapten.',
      namestnik: 'Kui ei kapten ega asekapten ei mängi, kolmekordseid punkte pole.',
      vPostavi: 'Kui ta ei mängi, asendab teda esimene sama positsiooni pingimängija.',
      naKlopi: 'Automaatne vahetus jätab ta vahele, kui ta ei mängi.',
      izstop: 'Ta ei saa enam punkte: vaheta ta välja. Kui ta jääb, jääb su meeskond siiski nõuetekohaseks.',
    },
  },
}
