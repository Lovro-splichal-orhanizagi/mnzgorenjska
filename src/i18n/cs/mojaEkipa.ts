// Český překlad oblasti `mojaEkipa` (zdroj: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Můj tým',
  igralec: 'Hráč',
  vprasanjeZapustitve: 'Máš v týmu neuložené změny. Opravdu chceš stránku opustit?',
  oznaka: {
    kapetan: 'K',
    namestnik: 'Z',
  },

  pravila: {
    pozicije: {
      GK: 'Brankáři',
      DEF: 'Obránci',
      MID: 'Záložníci',
      FWD: 'Útočníci',
    },
    kaderPoln: 'Soupiska je plná ({n} hráčů).',
    pozicijaPolna: '{pozicija}: na soupisce jich už máš {n}.',
    premaloProracuna: 'V rozpočtu je málo peněz: hráč stojí {cena}, k dispozici máš {preostalo}.',
    izKluba: 'Z klubu {klub} už máš {n} hráčů.',
    velikostEkipe: 'Tým musí mít {n} hráčů (teď {trenutno}).',
    velikostPostave: 'V základní sestavě musí být {n} hráčů (teď {trenutno}).',
    brezPozicije: {
      one: '{n} vybraný hráč ještě nemá potvrzenou pozici. Pomoz v sekci Pozice.',
      few: '{n} vybraní hráči ještě nemají potvrzenou pozici. Pomoz v sekci Pozice.',
      many: '{n} vybraného hráče ještě nemá potvrzenou pozici. Pomoz v sekci Pozice.',
      other: '{n} vybraných hráčů ještě nemá potvrzenou pozici. Pomoz v sekci Pozice.',
    },
    niVecVLigi: '{ime} už není v lize, vyměň ho.',
    pozicijaVKadru: '{pozicija} na soupisce: {n}, musí jich být {kader}.',
    pozicijaVPostavi: '{pozicija} v základní sestavě: {n}, povoleno {min}-{max}.',
    dolociKapetana: 'Vyber kapitána, v kole získá {n}násobek bodů.',
    enKapetan: 'Kapitán může být jen jeden.',
    dolociNamestnika: 'Vyber zástupce kapitána, který převezme pásku, když kapitán nehraje.',
    istiKlub: 'Z jednoho klubu můžeš mít nejvýš {n} hráčů.',
    presegelProracun: 'Překročil jsi rozpočet o {cena}.',
  },

  napake: {
    zeImas: 'V této lize už tým máš. Načti stránku znovu.',
    dovoljenje: 'Na tohle nemáš oprávnění. Přihlas se znovu a zkus to ještě jednou.',
    povezava: 'Není spojení se serverem. Zkontroluj internet a zkus to znovu.',
    shranjevanje: 'Uložení se nepovedlo. Zkus to znovu.',
    nalaganjePovezava: 'Není spojení se serverem. Zkontroluj internet.',
    nalaganje: 'Údaje o týmu se nepodařilo načíst.',
    nalaganjeNiCelo:
      'Dokud se tým nenačte celý, nejde uložit. Jinak by uložení smazalo hráče, kteří se nenačetli.',
    poskusiZnova: 'Zkusit znovu',
    vpisiIme: 'Nejdřív zadej název týmu.',
    osvezitev:
      'Tým je uložený, ale obnovení se nepovedlo. Než ho začneš znovu upravovat, načti stránku znovu.',
    najprejShrani: 'Nejdřív ulož tým.',
    izberiKrog: 'Vyber kolo, ve kterém má bonus platit.',
    prihodnjiKrog: 'Vyber budoucí, ještě nezamčené kolo se stanovenou uzávěrkou.',
    zeUporabil: 'Tento bonus jsi už v této sezóně použil.',
    niPreklica: 'Bonus pro toto kolo už nejde zrušit.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'V této lize ještě nejsou na trhu žádní hráči.',
    pocakaj: 'Počkej, než se uložení dokončí.',
    niPredloga: 'Z této ligy se zatím nedá sestavit platný tým.',
    predlogSestavljen: 'Tým je sestavený. Vyměň, koho chceš, a klikni na Uložit.',
    kaderDopolnjen: 'Chybějící místa jsou doplněná. Zkontroluj je a klikni na Uložit.',
    niDopolnitve:
      'Z peněz, které ti zbyly, se soupiska doplnit nedá. Vyměň některého z drahých hráčů a zkus to znovu.',
    kapetanNaKlop: '{ime} šel na lavičku, vyber nového kapitána.',
    namestnikNaKlop: '{ime} šel na lavičku, vyber nového zástupce kapitána.',
    brezPozicije: 'Hráč ještě nemá potvrzenou pozici, proto ho nemůžeš postavit na hřiště.',
    niProstora:
      'V sestavě není místo pro dalšího hráče na této pozici. Nejdřív někoho pošli na lavičku.',
    niVecNamestnik: '{ime} už není zástupce kapitána, vyber nového.',
    niVecKapetan: '{ime} už není kapitán, vyber nového.',
    rokPotekel: 'Uzávěrka {krog}. kola už vypršela, změny proto platí od dalšího kola.',
    shranjenaZaKrog: 'Tým je uložený a připravený na {krog}. kolo.',
    shranjenaVeljavna: 'Tým je uložený a splňuje pravidla.',
    osnutekShranjen:
      'Koncept uložen. Tým ještě nesplňuje pravidla, takže by v tomto kole nezískal body.',
    prodaja: 'Prodej ti vynesl +{cena}.',
    nakupi: 'Nákupy stály {cena}.',
    wildcardVlozen: 'Žolík je aktivovaný, přestupy v tomto kole jsou zdarma.',
    klopPlusVlozen: 'Lavička+ je aktivovaná.',
    wildcardPreklican: 'Žolík je zrušený, můžeš ho použít v jiném kole.',
    klopPlusPreklican: 'Lavička+ je zrušená, můžeš ji použít v jiném kole.',
    zapriOpozorilo: 'Zavřít upozornění',
    zapriObvestilo: 'Zavřít oznámení',
    odstranjen: '{ime} je odebrán.',
    razveljavi: 'Vrátit zpět',
  },

  prijavaPotrebna: 'Pokud si chceš sestavit tým, musíš se přihlásit.',
  prijava: 'Přihlášení',
  locenaLiga:
    'Tým v lize <liga>{liga}</liga> je oddělený od týmů v jiných ligách: má vlastní rozpočet a vlastní žebříček. Body se počítají od {krog}. kola, protože do té doby ještě probíhají přestupy a přesuny mezi kategoriemi.',

  /** Zloženi razdelek pod igriščem. */
  vec: 'Víc: bonusy, historie, pravidla',

  prestopi: {
    stevec: 'Přestupy: {n}/{prosti}',
    wildcard: 'žolík, bez trestu',
    odbitek: 'minus {tock} v tomto kole',
    prosti: {
      one: 'ještě {n} zdarma, pak −{kazen} za každý další',
      few: 'ještě {n} zdarma, pak −{kazen} za každý další',
      many: 'ještě {n} zdarma, pak −{kazen} za každý další',
      other: 'ještě {n} zdarma, pak −{kazen} za každý další',
    },
  },

  namigi: {
    naslov: 'Tipy na přestupy',
    zaKrog: 'Kdo v {krog}. kole asi nebude hrát a koho si můžeš dovolit místo něj.',
    razlog: {
      neaktiven: 'už není v lize',
      poskodba: 'zraněný',
      odsotnost: 'bude chybět',
      brezTekme: 'klub nehraje',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'Místo hráče {ime} dej na soupisku hráče {novi}',
    niZamenjave: 'Náhrada, kterou by dovolil rozpočet i pravidla, neexistuje.',
    opomba: 'Kliknutí jen připraví výměnu, tým uložíš sám. Každý tip platí samostatně.',
    skrij: 'Skrýt do dalšího kola',
    zamenjano: '{novi} je na soupisce místo hráče {ime}. Až budeš spokojený, ulož tým.',
  },

  odZadnjegaObiska: {
    naslov: 'Od poslední návštěvy',
    naslovTeden: 'Za poslední týden',
    vrednost: 'Hodnota týmu <znesek>{znak}{cena}</znesek>',
    gor: 'zdražení',
    dol: 'zlevnění',
    zapri: 'Zavřít',
  },

  povzetek: {
    urediIme: 'Upravit název týmu {ime}',
    bogastvo:
      'hodnota <vrednost>{bogastvo}</vrednost><razlika></razlika> · soupiska {kader} <placano>zaplaceno</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Ukládám …',
    shraniEkipo: 'Uložit tým',
    neshranjeno: 'Neuložené změny',
    imeEkipe: 'Název týmu',
    privzetoIme: 'FC {ime}',
    primerImena: 'např. Nedělní hrdinové',
  },

  zacetek: {
    naslov: 'Kde začít?',
    sestaviMi: 'Sestav mi tým',
    opisPredloga:
      'Náhodně vybereme platný tým v rámci rozpočtu, při každém kliknutí jiný. Pak vyměň, koho chceš, a ulož.',
    sam: 'Radši si ho sestavím sám',
    drugPredlog: 'Jiný návrh',
    opisDrugegaPredloga:
      'Nelíbí se ti? Vylosuj nový tým. Dokud ho neuložíš, je to zdarma.',
    dopolni: 'Doplnit tým',
    opisDopolnitve:
      'Volná místa na soupisce: {n}. Tvoje volby zůstanou, zbylá místa náhodně doplníme v rámci rozpočtu.',
    korak1: 'Název týmu jsme navrhli nahoře, můžeš ho kdykoli změnit.',
    korak2:
      'Klikni na <krepko>＋</krepko> na prázdném místě hřiště. Na mobilu je ve spodním panelu ještě tlačítko <krepko>＋ Přidat</krepko>, na počítači vybíráš z <krepko>trhu hráčů</krepko> vpravo.',
    korak3:
      'Soupiska má {n} hráčů: {gk} BRA, {def} OBR, {mid} ZÁL, {fwd} ÚTO. Z jednoho klubu nejvýš {klub}.',
    korak4:
      'Až budou místa obsazená, vyber <krepko>kapitána</krepko> a <krepko>zástupce kapitána</krepko>, pak klikni na <krepko>Uložit tým</krepko> (na mobilu <krepko>Uložit</krepko> ve spodním panelu).',
  },

  trak: {
    naslov: 'Kapitánská páska',
    kapetan: 'Kapitán (×{n})',
    namestnik: 'Zástupce kapitána',
    nihce: '- nikdo -',
  },

  kajCe: {
    prinesla: 'Současná sestava by v <krog>{krog}. kole</krog> ({sezona}) přinesla',
    opis: 'Přehled „co by bylo, kdyby“: nejde o skutečný výsledek a mění se při každé výměně. Skutečné body za odehraná kola najdeš v žebříčku a v záznamu sestavy.',
  },

  status: {
    manjka: 'K finálnímu uložení ještě něco chybí:',
    vpisiIme: 'Zadej název týmu (v poli nahoře).',
    osnutekZdaj: 'Koncept můžeš uložit i teď, pravidla splníš později.',
    brezTock: '<krepko>Za {krog}. kolo</krepko> v tomto stavu <krepko>NEZÍSKÁŠ body</krepko>.',
    kajPomeni:
      '<krepko>Co znamená „Uložit“?</krepko> Tvoje změny (soupiska, sestava, kapitán) se zapíšou do databáze. Pro aktuální kolo platí stav v okamžiku uzávěrky. Do uzávěrky můžeš libovolně měnit a znovu klikat na Uložit, platí poslední verze. <krepko>„Uložit koncept“</krepko> znamená totéž, jen s poznámkou, že tým ještě nesplňuje všechna pravidla (abys získal body, je potřeba to opravit, viz seznam nahoře).',
    kajPomeniRok:
      '<krepko>Co znamená „Uložit“?</krepko> Tvoje změny (soupiska, sestava, kapitán) se zapíšou do databáze. Pro aktuální kolo platí stav v okamžiku uzávěrky (<krepko>{krog}. kolo: {rok}</krepko>). Do uzávěrky můžeš libovolně měnit a znovu klikat na Uložit, platí poslední verze. <krepko>„Uložit koncept“</krepko> znamená totéž, jen s poznámkou, že tým ještě nesplňuje všechna pravidla (abys získal body, je potřeba to opravit, viz seznam nahoře).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bonus Lavička+',
    klopPlusVlozenZa: 'Aktivováno na {krog}. kolo ({sezona}), počítají se v něm i body z lavičky.',
    klopPlusVlozen: 'Lavička+ je už aktivovaná, v tomto kole se počítají i body z lavičky.',
    klopPlusOpis:
      'Jednou za sezónu: ve vybraném kole se připočítají i body všech čtyř náhradníků.',
    wildcardNaslov: 'Bonus Žolík',
    wildcardVlozenZa: 'Aktivováno na {krog}. kolo ({sezona}), přestupy v něm jsou zdarma.',
    wildcardVlozen: 'Žolík je už aktivovaný, přestupy v tomto kole jsou zdarma.',
    wildcardOpis:
      'Jednou za sezónu: v tomto kole můžeš vyměnit libovolný počet hráčů bez odečtu bodů.',
    zaklenjen: 'zamčeno',
    preklici: 'zrušit',
    prekliciDo: 'Zrušit můžeš ještě <odstevanje></odstevanje>',
    izberiKrog: 'Vyber kolo …',
    niKroga: 'Žádné budoucí kolo s uzávěrkou',
    krogSezona: '{krog}. kolo ({sezona})',
    vlozi: 'Aktivovat',
    vloziZa: 'Aktivovat na {krog}. kolo',
    potrdiWildcard: 'Aktivovat Žolíka na {krog}. kolo? Máš ho jen jednou za sezónu.',
  },

  zgodovina: {
    naslov: 'Historie sestav',
    posnetkov: {
      one: '{n} kolo se záznamem',
      few: '{n} kola se záznamy',
      many: '{n} kola se záznamy',
      other: '{n} kol se záznamy',
    },
    krog: '{krog}. kolo',
    podrobnost: '{krog}. kolo · sezóna {sezona}',
    podrobnostSkupaj: '{krog}. kolo · sezóna {sezona} · celkem <krepko>{tocke}</krepko>',
    deli: 'Sdílet {krog}. kolo',
  },

  telefon: {
    ostane: 'zbývá',
    predalPovzetek: 'zbývá <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'opravit ↑',
    neshranjeno: 'neuloženo',
    dodaj: '＋ Přidat',
    osnutekNamig: 'Tým ještě nesplňuje pravidla, uloží se jako koncept.',
    neIzpolnjuje: 'tým ještě nesplňuje pravidla',
    zapriTrg: 'Zavřít trh',
    zapri: '✕ Zavřít',
  },

  trg: {
    naslov: 'Trh hráčů',
    iskanje: 'Hledat podle jména …',
    pocistiIskanje: 'Vymazat hledání',
    vsi: 'všichni',
    vsiKlubi: 'Všechny kluby',
    niZadetkov: 'Nic se nenašlo.',
    pocistiFiltre: 'Zrušit filtry',
    statLetos: '{goli} G · {minute} min',
    statLani: 'loni {goli} G',
    brezNastopov: 'bez startů',
    niVecVLigi: 'už není v lize',
    tockeZadnjiKrog: 'Body v posledním odehraném kole',
    podatki: 'Údaje o hráči {ime}',
    podatkiNamig: 'Statistiky, vývoj ceny, nejbližší zápasy',
    profilVNovemZavihku: 'Otevřít profil hráče na nové kartě',
    odstrani: '✕ odebrat',
    dodaj: '⊕ přidat',
    prvih: 'Zobrazeno prvních {n}, zúž výběr hledáním.',
    noga: 'Z jednoho klubu můžeš mít nejvýš {n} hráčů. Góly a minuty jsou z aktuální sezóny.',
  },

  rok: {
    krog: '{krog}. kolo',
    potekel: 'Uzávěrka vypršela: <krepko>{rok}</krepko>',
    rok: 'Uzávěrka: <krepko>{rok}</krepko>',
    niDolocen: 'Uzávěrka ještě není stanovená.',
  },

  igrisce: {
    naKlop: 'Přesunout na lavičku',
    vPostavo: 'Zařadit do základní sestavy',
    niVecVLigiNamig: 'Hráč už není v lize, soupiska s ním nezíská body.',
    niVecVLigi: 'už není v lize',
    poskodba: 'zranění',
    odsoten: 'chybí',
    kapetan: 'Kapitán: trojnásobek bodů',
    namestnik: 'Zástupce kapitána',
    tockeKroga: 'Body v posledním kole: {tocke}',
    tockeKrogaKapetan: 'Body v posledním kole: {tocke} × 3 (kapitán)',
    odstraniIzKadra: 'Odebrat ze soupisky',
    odstrani: 'Odebrat {ime}',
    prej: 'Dřív na řadě při střídání',
    prejIme: '{ime}: dřív na řadě při střídání',
    pozneje: 'Později na řadě při střídání',
    poznejeIme: '{ime}: později na řadě při střídání',
    izberi: 'Vybrat: {pozicija}',
    klop: 'Lavička',
    klopOpis:
      'Když někdo ze sestavy nehraje, nahradí ho první z lavičky na stejné pozici, v pořadí zleva doprava.',
    brezPozicije: 'Bez potvrzené pozice, nejde je postavit na hřiště',
  },

  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min',
    goli: '{n} × gól',
    asistence: '{n} × asistence',
    brezPrejetega: 'bez obdrženého gólu',
    prejetih: 'obdržené {n}',
    rumeni: 'žlutá karta',
    rdeci: 'červená karta',
    skupaj: 'Body: {tocke}',
    brezPostave: 'Zápis o utkání pro tento tým neuvádí sestavu.',
    klop: 'Lavička',
    vstopilo: '({n} nastoupilo do hry)',
  },

  enajsterica: {
    kapetan: 'Kapitán',
    namestnik: 'Zástupce s páskou',
  },

  opozorila: {
    naslov: 'Upozornění v tvých týmech',
    naslovNapakEna: 'Jeden z tvých týmů nezíská body',
    naslovNapak: {
      one: '{n} tvůj tým nezíská body',
      few: '{n} tvoje týmy nezískají body',
      many: '{n} tvého týmu nezíská body',
      other: '{n} tvých týmů nezíská body',
    },
    nimasEkipe: 'Ještě nemáš tým<liga>({liga})</liga>, bez něj v dalším kole nezískáš body.',
    sestavi: 'Sestavit tým →',
    popravi: 'Opravit →',
    poglej: 'Podívat se →',
    skrij: 'Skrýt upozornění: {besedilo}',
    skrijNamig: 'Skrýt, dokud nepřijde nová zpráva',
    pokaziVse: 'Zobrazit všechna ({n})',
    razlog: 'Tým nesplňuje pravidla.',
    brezTockKrog: 'V {krog}. kole nezíská body.',
    brezTockRok: 'Při nejbližší uzávěrce nezíská body.',
    nepopolna: 'Tým není kompletní. Toto kolo se ještě uzamkne, ale od dalšího nezíská body.',
    igralec: {
      kapetan: {
        poskodba: 'Kapitán {ime} je zraněný.',
        odsotnost: 'Kapitán {ime} bude chybět.',
        izstop: 'Kapitán {ime} už nebude hrát, jeho klub odstoupil ze soutěže.',
      },
      namestnik: {
        poskodba: 'Zástupce kapitána {ime} je zraněný.',
        odsotnost: 'Zástupce kapitána {ime} bude chybět.',
        izstop: 'Zástupce kapitána {ime} už nebude hrát, jeho klub odstoupil ze soutěže.',
      },
      vPostavi: {
        poskodba: '{ime} je zraněný a je v základní sestavě.',
        odsotnost: '{ime} bude chybět a je v základní sestavě.',
        izstop: '{ime} v základní sestavě už nebude hrát, jeho klub odstoupil ze soutěže.',
      },
      naKlopi: {
        poskodba: '{ime} na lavičce je zraněný.',
        odsotnost: '{ime} na lavičce bude chybět.',
        izstop: '{ime} na lavičce už nebude hrát, jeho klub odstoupil ze soutěže.',
      },
    },
    posledica: {
      kapetan: 'Když nehraje, pásku přebírá zástupce kapitána. Možná radši vyber jiného kapitána.',
      namestnik: 'Když nehraje ani kapitán, ani jeho zástupce, trojnásobek bodů nebude.',
      vPostavi: 'Když nehraje, nahradí ho první hráč z lavičky na stejné pozici.',
      naKlopi: 'Při automatickém střídání ho systém přeskočí, pokud nehraje.',
      izstop: 'Body za něj už nezískáš, vyměň ho. Tým s ním zůstává platný.',
    },
  },
}
